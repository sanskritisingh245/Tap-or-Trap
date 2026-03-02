const express = require('express');
const crypto = require('crypto');
const {
  generateRound, computeHash, verifySeed,
  deriveCoinFlip, deriveDiceRoll, deriveMinePositions,
  calculateDiceMultiplier, calculateMinesMultiplier,
} = require('../services/provably-fair');

const { commitSeedOnChain, revealSeedOnChain } = require('../solana/program');

const SKIP_ONCHAIN = process.env.SKIP_ONCHAIN === 'true';
const GAME_TYPES = { coinflip: 0, dice: 1, mines: 2, crash: 3 };

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────

function getPlayerNonce(db, wallet) {
  const count = db.prepare('SELECT COUNT(*) as n FROM game_bets WHERE wallet = ?').get(wallet);
  return (count?.n || 0) + 1;
}

function deductCredits(db, wallet, amount) {
  const player = db.prepare('SELECT credits FROM players WHERE wallet = ?').get(wallet);
  if (!player || player.credits < amount) return false;
  db.prepare('UPDATE players SET credits = credits - ? WHERE wallet = ?').run(amount, wallet);
  return true;
}

function addCredits(db, wallet, amount) {
  db.prepare('UPDATE players SET credits = credits + ? WHERE wallet = ?').run(amount, wallet);
}

function awardXp(db, wallet, won, amount) {
  const xp = won ? Math.max(2, Math.floor(amount * 0.5)) : 1;
  db.prepare('UPDATE players SET xp = xp + ? WHERE wallet = ?').run(xp, wallet);
}

// ─── COIN FLIP ────────────────────────────────────────────────────

router.post('/coinflip/bet', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const { amount, choice } = req.body;

  if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid bet amount' });
  if (!['heads', 'tails'].includes(choice)) return res.status(400).json({ error: 'Choice must be heads or tails' });

  if (!deductCredits(db, wallet, amount)) {
    return res.status(400).json({ error: 'Insufficient credits' });
  }

  const { serverSeed, seedHash } = generateRound();
  const nonce = getPlayerNonce(db, wallet);
  const result = deriveCoinFlip(serverSeed, wallet, nonce, choice);
  const won = result === choice;
  const payout = won ? Math.floor(amount * 1.96) : 0;

  if (payout > 0) addCredits(db, wallet, payout);
  awardXp(db, wallet, won, amount);

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO game_bets (id, wallet, game_type, amount, payout, won, result, server_seed, client_seed, nonce, seed_hash, created_at)
    VALUES (?, ?, 'coinflip', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, wallet, amount, payout, won ? 1 : 0, JSON.stringify({ choice, result }), serverSeed, wallet, nonce, seedHash, Date.now());

  const player = db.prepare('SELECT credits FROM players WHERE wallet = ?').get(wallet);

  // Fire-and-forget on-chain commit + reveal (non-blocking)
  if (!SKIP_ONCHAIN) {
    commitSeedOnChain(id, seedHash, GAME_TYPES.coinflip)
      .then(() => revealSeedOnChain(id, serverSeed))
      .catch(() => {});
  }

  res.json({
    id, won, result, payout, amount,
    serverSeed, seedHash, clientSeed: wallet, nonce,
    balance: player?.credits || 0,
  });
});

// ─── DICE ROLL ────────────────────────────────────────────────────

router.post('/dice/bet', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const { amount, target, isOver } = req.body;

  if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid bet amount' });
  if (typeof target !== 'number' || target < 2 || target > 98) return res.status(400).json({ error: 'Target must be 2-98' });
  if (typeof isOver !== 'boolean') return res.status(400).json({ error: 'isOver must be boolean' });

  const multiplier = calculateDiceMultiplier(target, isOver);
  if (multiplier <= 0) return res.status(400).json({ error: 'Invalid target' });

  if (!deductCredits(db, wallet, amount)) {
    return res.status(400).json({ error: 'Insufficient credits' });
  }

  const { serverSeed, seedHash } = generateRound();
  const nonce = getPlayerNonce(db, wallet);
  const roll = deriveDiceRoll(serverSeed, wallet, nonce);
  const won = isOver ? roll > target : roll < target;
  const payout = won ? Math.floor(amount * multiplier) : 0;

  if (payout > 0) addCredits(db, wallet, payout);
  awardXp(db, wallet, won, amount);

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO game_bets (id, wallet, game_type, amount, payout, won, result, server_seed, client_seed, nonce, seed_hash, created_at)
    VALUES (?, ?, 'dice', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, wallet, amount, payout, won ? 1 : 0, JSON.stringify({ roll, target, isOver, multiplier }), serverSeed, wallet, nonce, seedHash, Date.now());

  const player = db.prepare('SELECT credits FROM players WHERE wallet = ?').get(wallet);

  if (!SKIP_ONCHAIN) {
    commitSeedOnChain(id, seedHash, GAME_TYPES.dice)
      .then(() => revealSeedOnChain(id, serverSeed))
      .catch(() => {});
  }

  res.json({
    id, won, roll, target, isOver, multiplier, payout, amount,
    serverSeed, seedHash, clientSeed: wallet, nonce,
    balance: player?.credits || 0,
  });
});

// ─── MINES ────────────────────────────────────────────────────────

router.post('/mines/start', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const { amount, mineCount } = req.body;

  if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid bet amount' });
  if (!mineCount || mineCount < 1 || mineCount > 24) return res.status(400).json({ error: 'Mine count must be 1-24' });

  // Check no active mines game
  const active = db.prepare("SELECT id FROM game_bets WHERE wallet = ? AND game_type = 'mines' AND state = 'active'").get(wallet);
  if (active) return res.status(400).json({ error: 'You already have an active mines game', gameId: active.id });

  if (!deductCredits(db, wallet, amount)) {
    return res.status(400).json({ error: 'Insufficient credits' });
  }

  const { serverSeed, seedHash } = generateRound();
  const nonce = getPlayerNonce(db, wallet);
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO game_bets (id, wallet, game_type, amount, payout, won, result, server_seed, client_seed, nonce, seed_hash, state, mines_revealed, mine_count, created_at)
    VALUES (?, ?, 'mines', ?, 0, NULL, NULL, ?, ?, ?, ?, 'active', '[]', ?, ?)
  `).run(id, wallet, amount, serverSeed, wallet, nonce, seedHash, mineCount, Date.now());

  // Commit seed hash on-chain at game start (reveal happens on game end)
  if (!SKIP_ONCHAIN) {
    commitSeedOnChain(id, seedHash, GAME_TYPES.mines).catch(() => {});
  }

  res.json({ gameId: id, seedHash, mineCount, amount });
});

router.post('/mines/reveal', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const { gameId, tile } = req.body;

  if (typeof tile !== 'number' || tile < 0 || tile > 24) return res.status(400).json({ error: 'Tile must be 0-24' });

  const game = db.prepare("SELECT * FROM game_bets WHERE id = ? AND wallet = ? AND game_type = 'mines' AND state = 'active'").get(gameId, wallet);
  if (!game) return res.status(404).json({ error: 'No active mines game found' });

  const revealed = JSON.parse(game.mines_revealed || '[]');
  if (revealed.includes(tile)) return res.status(400).json({ error: 'Tile already revealed' });

  // Get mine positions
  const mines = deriveMinePositions(game.server_seed, game.client_seed, game.nonce, game.mine_count);
  const isMine = mines.includes(tile);

  revealed.push(tile);

  if (isMine) {
    // BOOM — game over
    db.prepare(`
      UPDATE game_bets SET state = 'resolved', won = 0, payout = 0, mines_revealed = ?, result = ?
      WHERE id = ?
    `).run(JSON.stringify(revealed), JSON.stringify({ mines, hitTile: tile }), gameId);

    awardXp(db, wallet, false, game.amount);
    if (!SKIP_ONCHAIN) revealSeedOnChain(gameId, game.server_seed).catch(() => {});
    const player = db.prepare('SELECT credits FROM players WHERE wallet = ?').get(wallet);

    return res.json({
      safe: false, tile, mines, gameOver: true, payout: 0,
      serverSeed: game.server_seed, balance: player?.credits || 0,
    });
  }

  // Safe — update revealed
  const safeRevealed = revealed.length;
  const multiplier = calculateMinesMultiplier(game.mine_count, safeRevealed);
  const potentialPayout = Math.floor(game.amount * multiplier);

  db.prepare('UPDATE game_bets SET mines_revealed = ? WHERE id = ?').run(JSON.stringify(revealed), gameId);

  // Check if all safe tiles revealed (auto-cashout)
  const safeTiles = 25 - game.mine_count;
  if (safeRevealed >= safeTiles) {
    addCredits(db, wallet, potentialPayout);
    awardXp(db, wallet, true, game.amount);
    db.prepare(`
      UPDATE game_bets SET state = 'resolved', won = 1, payout = ?, result = ?
      WHERE id = ?
    `).run(potentialPayout, JSON.stringify({ mines, revealedAll: true }), gameId);

    const player = db.prepare('SELECT credits FROM players WHERE wallet = ?').get(wallet);
    return res.json({
      safe: true, tile, multiplier, payout: potentialPayout, gameOver: true,
      mines, serverSeed: game.server_seed, balance: player?.credits || 0,
    });
  }

  res.json({
    safe: true, tile, multiplier, potentialPayout, gameOver: false,
    revealedCount: safeRevealed, safeTilesRemaining: safeTiles - safeRevealed,
  });
});

router.post('/mines/cashout', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const { gameId } = req.body;

  const game = db.prepare("SELECT * FROM game_bets WHERE id = ? AND wallet = ? AND game_type = 'mines' AND state = 'active'").get(gameId, wallet);
  if (!game) return res.status(404).json({ error: 'No active mines game found' });

  const revealed = JSON.parse(game.mines_revealed || '[]');
  if (revealed.length === 0) return res.status(400).json({ error: 'Must reveal at least one tile' });

  const multiplier = calculateMinesMultiplier(game.mine_count, revealed.length);
  const payout = Math.floor(game.amount * multiplier);
  const mines = deriveMinePositions(game.server_seed, game.client_seed, game.nonce, game.mine_count);

  addCredits(db, wallet, payout);
  awardXp(db, wallet, true, game.amount);
  if (!SKIP_ONCHAIN) revealSeedOnChain(gameId, game.server_seed).catch(() => {});

  db.prepare(`
    UPDATE game_bets SET state = 'resolved', won = 1, payout = ?, result = ?
    WHERE id = ?
  `).run(payout, JSON.stringify({ mines, cashedOut: true, multiplier }), gameId);

  const player = db.prepare('SELECT credits FROM players WHERE wallet = ?').get(wallet);

  res.json({
    payout, multiplier, mines,
    serverSeed: game.server_seed, balance: player?.credits || 0,
  });
});

// ─── CRASH ────────────────────────────────────────────────────────

router.get('/crash/state', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;

  const round = db.prepare("SELECT * FROM crash_rounds ORDER BY created_at DESC LIMIT 1").get();
  if (!round) return res.json({ state: 'waiting', message: 'No active round' });

  const now = Date.now();
  let currentMultiplier = 1.00;
  let elapsed = 0;

  if (round.state === 'flying' && round.started_at) {
    elapsed = (now - round.started_at) / 1000; // seconds
    // Multiplier grows exponentially: 1.00 * e^(0.06 * t) but capped at crash point
    currentMultiplier = Math.min(
      Math.round(Math.exp(0.06 * elapsed) * 100) / 100,
      round.crash_point
    );

    // Check if crashed
    if (currentMultiplier >= round.crash_point) {
      // Settle crash server-side
      db.prepare("UPDATE crash_rounds SET state = 'crashed', crashed_at = ? WHERE id = ? AND state = 'flying'").run(now, round.id);
      // Settle uncashed players (they lose)
      db.prepare("UPDATE crash_players SET payout = 0 WHERE round_id = ? AND cashed_out_at IS NULL").run(round.id);
      currentMultiplier = round.crash_point;
    }
  }

  // Get player's bet for this round
  const myBet = db.prepare('SELECT * FROM crash_players WHERE round_id = ? AND wallet = ?').get(round.id, wallet);
  // Get recent cashouts
  const cashouts = db.prepare('SELECT wallet, cashed_out_at, payout FROM crash_players WHERE round_id = ? AND cashed_out_at IS NOT NULL ORDER BY cashed_out_at ASC').all(round.id);

  res.json({
    roundId: round.id,
    state: round.state === 'flying' && currentMultiplier >= round.crash_point ? 'crashed' : round.state,
    seedHash: round.seed_hash,
    crashPoint: round.state === 'crashed' || currentMultiplier >= round.crash_point ? round.crash_point : undefined,
    serverSeed: round.state === 'crashed' ? round.server_seed : undefined,
    currentMultiplier,
    elapsed,
    myBet: myBet ? { amount: myBet.bet_amount, cashedOutAt: myBet.cashed_out_at, payout: myBet.payout } : null,
    cashouts: cashouts.map(c => ({ wallet: c.wallet.slice(0, 6), at: c.cashed_out_at, payout: c.payout })),
  });
});

router.post('/crash/bet', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const { amount } = req.body;

  if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid bet amount' });

  const round = db.prepare("SELECT * FROM crash_rounds WHERE state = 'betting' ORDER BY created_at DESC LIMIT 1").get();
  if (!round) return res.status(400).json({ error: 'No betting round active. Wait for next round.' });

  // Check not already bet
  const existing = db.prepare('SELECT wallet FROM crash_players WHERE round_id = ? AND wallet = ?').get(round.id, wallet);
  if (existing) return res.status(400).json({ error: 'Already bet this round' });

  if (!deductCredits(db, wallet, amount)) {
    return res.status(400).json({ error: 'Insufficient credits' });
  }

  db.prepare('INSERT INTO crash_players (round_id, wallet, bet_amount) VALUES (?, ?, ?)').run(round.id, wallet, amount);

  res.json({ roundId: round.id, amount, seedHash: round.seed_hash });
});

router.post('/crash/cashout', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;

  const round = db.prepare("SELECT * FROM crash_rounds WHERE state = 'flying' ORDER BY created_at DESC LIMIT 1").get();
  if (!round) return res.status(400).json({ error: 'No flying round' });

  const bet = db.prepare('SELECT * FROM crash_players WHERE round_id = ? AND wallet = ? AND cashed_out_at IS NULL').get(round.id, wallet);
  if (!bet) return res.status(400).json({ error: 'No active bet or already cashed out' });

  const now = Date.now();
  const elapsed = (now - round.started_at) / 1000;
  const currentMultiplier = Math.min(
    Math.round(Math.exp(0.06 * elapsed) * 100) / 100,
    round.crash_point
  );

  if (currentMultiplier >= round.crash_point) {
    return res.status(400).json({ error: 'Round already crashed' });
  }

  const payout = Math.floor(bet.bet_amount * currentMultiplier);
  addCredits(db, wallet, payout);
  awardXp(db, wallet, true, bet.bet_amount);

  db.prepare('UPDATE crash_players SET cashed_out_at = ?, payout = ? WHERE round_id = ? AND wallet = ?')
    .run(currentMultiplier, payout, round.id, wallet);

  const player = db.prepare('SELECT credits FROM players WHERE wallet = ?').get(wallet);

  res.json({ cashedOutAt: currentMultiplier, payout, balance: player?.credits || 0 });
});

// ─── HISTORY ──────────────────────────────────────────────────────

router.get('/history', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;

  const bets = db.prepare(`
    SELECT id, game_type, amount, payout, won, result, created_at
    FROM game_bets WHERE wallet = ? AND state = 'resolved'
    ORDER BY created_at DESC LIMIT 20
  `).all(wallet);

  res.json({ bets: bets.map(b => ({ ...b, result: b.result ? JSON.parse(b.result) : null })) });
});

// ─── LIVE FEED ───────────────────────────────────────────────────

router.get('/live-feed', (req, res) => {
  const db = req.app.locals.db;

  const bets = db.prepare(`
    SELECT wallet, game_type, amount, payout, won, created_at
    FROM game_bets WHERE state = 'resolved'
    ORDER BY created_at DESC LIMIT 15
  `).all();

  const feed = bets.map(b => ({
    wallet: b.wallet.slice(0, 6),
    game: b.game_type,
    amount: b.amount,
    payout: b.payout,
    won: b.won === 1,
    time: b.created_at,
  }));

  res.json({ feed });
});

// ─── VERIFY ───────────────────────────────────────────────────────

router.post('/verify', (req, res) => {
  const { serverSeed, clientSeed, nonce, seedHash, gameType } = req.body;

  if (!serverSeed || !clientSeed || nonce === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const verified = verifySeed(serverSeed, seedHash);
  const hash = computeHash(serverSeed, clientSeed, nonce);

  let outcome;
  switch (gameType) {
    case 'coinflip':
      outcome = deriveCoinFlip(serverSeed, clientSeed, nonce, req.body.choice || 'heads');
      break;
    case 'dice':
      outcome = deriveDiceRoll(serverSeed, clientSeed, nonce);
      break;
    case 'mines':
      outcome = deriveMinePositions(serverSeed, clientSeed, nonce, req.body.mineCount || 3);
      break;
    case 'crash':
      const { deriveCrashPoint } = require('../services/provably-fair');
      outcome = deriveCrashPoint(serverSeed, clientSeed, nonce);
      break;
    default:
      outcome = null;
  }

  res.json({ verified, hash, outcome });
});

module.exports = router;
