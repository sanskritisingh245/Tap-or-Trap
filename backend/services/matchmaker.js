const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { generateDrawTime } = require('./draw-timer');
const { deductCredits } = require('../solana/program');

// Bot wallet prefix — any wallet starting with this is a bot
const BOT_WALLET_PREFIX = 'BOT_';
const BOT_MATCH_DELAY_MS = 5000; // Wait 5s before spawning a bot

/**
 * Checks if a wallet belongs to a bot.
 */
function isBot(wallet) {
  return wallet && wallet.startsWith(BOT_WALLET_PREFIX);
}

/**
 * Generates a unique bot wallet address.
 */
function generateBotWallet() {
  return BOT_WALLET_PREFIX + crypto.randomBytes(20).toString('hex');
}

/**
 * Ensures a bot player record exists in the database.
 */
function ensureBotPlayer(db, botWallet) {
  const existing = db.prepare('SELECT wallet FROM players WHERE wallet = ?').get(botWallet);
  if (!existing) {
    db.prepare(`
      INSERT INTO players (wallet, credits, last_seen, wins, losses, xp, tier, total_matches)
      VALUES (?, 9999, ?, 0, 0, 0, 'BRONZE', 0)
    `).run(botWallet, Date.now());
  }
}

/**
 * Creates a match record in the database for two paired players.
 *
 * @param {object} db - SQLite database instance
 * @param {string} playerOne - Wallet pubkey
 * @param {string} playerTwo - Wallet pubkey
 * @returns {object} Match record
 */
function createMatch(db, playerOne, playerTwo) {
  const matchId = uuidv4();
  const now = Date.now();
  const { drawTimeMs, secret, commitment } = generateDrawTime(now);

  db.prepare(`
    INSERT INTO matches (id, player_one, player_two, state, draw_time_ms, draw_secret, draw_commitment, created_at)
    VALUES (?, ?, ?, 'WAITING', ?, ?, ?, ?)
  `).run(matchId, playerOne, playerTwo, drawTimeMs, secret, commitment, now);

  return {
    id: matchId,
    playerOne,
    playerTwo,
    state: 'WAITING',
    drawTimeMs,
    commitment,
    createdAt: now,
  };
}

/**
 * Pairs two players from the queue and creates a match.
 * Called periodically by the matchmaking loop.
 */
function pairFromQueue(db) {
  const players = db.prepare(
    'SELECT wallet, joined_at FROM queue ORDER BY joined_at ASC LIMIT 2'
  ).all();

  if (players.length >= 2) {
    // Two real players — pair them
    const playerOne = players[0].wallet;
    const playerTwo = players[1].wallet;
    db.prepare('DELETE FROM queue WHERE wallet IN (?, ?)').run(playerOne, playerTwo);
    const match = createMatch(db, playerOne, playerTwo);
    deductForMatch(db, playerOne, playerTwo, match);
    return match;
  }

  // Only one player in queue — check if they've waited long enough for a bot
  if (players.length === 1) {
    const player = players[0];
    const waitTime = Date.now() - player.joined_at;

    if (waitTime >= BOT_MATCH_DELAY_MS) {
      const botWallet = generateBotWallet();
      ensureBotPlayer(db, botWallet);

      db.prepare('DELETE FROM queue WHERE wallet = ?').run(player.wallet);
      const match = createMatch(db, player.wallet, botWallet);
      deductForMatch(db, player.wallet, botWallet, match);
      console.log(`[BOT] Paired ${player.wallet.slice(0, 8)}... with bot ${botWallet.slice(0, 12)}... (waited ${waitTime}ms)`);
      return match;
    }
  }

  return null;
}

/**
 * Deducts credits for a match (on-chain or dev mode).
 */
function deductForMatch(db, playerOne, playerTwo, match) {
  if (process.env.SKIP_ONCHAIN !== 'true') {
    deductCredits(playerOne, playerTwo, match.id).catch((err) => {
      console.error(`Failed to deduct credits for match ${match.id}:`, err.message);
      db.prepare("UPDATE matches SET state = 'CANCELLED' WHERE id = ?").run(match.id);
      const now = Date.now();
      if (!isBot(playerOne)) db.prepare('INSERT OR IGNORE INTO queue (wallet, joined_at) VALUES (?, ?)').run(playerOne, now);
      if (!isBot(playerTwo)) db.prepare('INSERT OR IGNORE INTO queue (wallet, joined_at) VALUES (?, ?)').run(playerTwo, now);
    });
  } else {
    if (!isBot(playerOne)) db.prepare('UPDATE players SET credits = credits - 1 WHERE wallet = ? AND credits > 0').run(playerOne);
    if (!isBot(playerTwo)) db.prepare('UPDATE players SET credits = credits - 1 WHERE wallet = ? AND credits > 0').run(playerTwo);
    console.log(`[DEV] Deducted credits for match ${match.id}`);
  }
}

/**
 * Pairs two players from a friend challenge room.
 */
function pairFromRoom(db, creatorWallet, joinerWallet, roomCode) {
  const match = createMatch(db, creatorWallet, joinerWallet);

  // Link room to match
  db.prepare('UPDATE rooms SET match_id = ? WHERE code = ?').run(match.id, roomCode);

  // Trigger on-chain credit deduction (skip in dev mode)
  if (process.env.SKIP_ONCHAIN !== 'true') {
    deductCredits(creatorWallet, joinerWallet, match.id).catch((err) => {
      console.error(`Failed to deduct credits for room match ${match.id}:`, err.message);
      db.prepare("UPDATE matches SET state = 'CANCELLED' WHERE id = ?").run(match.id);
      db.prepare("UPDATE rooms SET status = 'CANCELLED' WHERE code = ?").run(roomCode);
    });
  } else {
    // Dev mode: deduct 1 credit from each player in DB
    db.prepare('UPDATE players SET credits = credits - 1 WHERE wallet = ? AND credits > 0').run(creatorWallet);
    db.prepare('UPDATE players SET credits = credits - 1 WHERE wallet = ? AND credits > 0').run(joinerWallet);
    console.log(`[DEV] Deducted 1 credit each for room match ${match.id}`);
  }

  return match;
}

/**
 * Background matchmaking loop (runs every 500ms).
 */
let matchmakerInterval = null;
function startMatchmaker(db) {
  matchmakerInterval = setInterval(() => {
    try {
      pairFromQueue(db);
    } catch (err) {
      console.error('Matchmaker error:', err.message);
    }
  }, 500);
  console.log('Matchmaker started (500ms interval)');
}

function stopMatchmaker() {
  if (matchmakerInterval) {
    clearInterval(matchmakerInterval);
    matchmakerInterval = null;
  }
}

module.exports = { createMatch, pairFromQueue, pairFromRoom, startMatchmaker, stopMatchmaker, isBot, BOT_WALLET_PREFIX };
