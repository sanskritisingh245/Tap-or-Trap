const crypto = require('crypto');
const { generateRound, deriveCrashPoint } = require('./provably-fair');
const { commitSeedOnChain, revealSeedOnChain } = require('../solana/program');

const SKIP_ONCHAIN = process.env.SKIP_ONCHAIN === 'true';

let db = null;
let roundTimer = null;

const BETTING_DURATION = 5000;   // 5s to place bets
const CRASHED_PAUSE    = 3000;   // 3s pause between rounds
const TICK_INTERVAL    = 100;    // 100ms multiplier updates

function startCrashEngine(database) {
  db = database;
  console.log('[CrashEngine] Starting...');
  startNewRound();
}

function startNewRound() {
  const { serverSeed, seedHash } = generateRound();
  const nonce = Date.now(); // round-level nonce
  const crashPoint = deriveCrashPoint(serverSeed, 'crash-global', nonce);
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO crash_rounds (id, crash_point, server_seed, seed_hash, state, created_at)
    VALUES (?, ?, ?, ?, 'betting', ?)
  `).run(id, crashPoint, serverSeed, seedHash, Date.now());

  // Commit seed hash on-chain before bets
  if (!SKIP_ONCHAIN) commitSeedOnChain(id, seedHash, 3).catch(() => {});

  console.log(`[CrashEngine] Round ${id.slice(0,8)} — betting open (crash @ ${crashPoint}x)`);

  // After betting window, start flying
  setTimeout(() => {
    db.prepare("UPDATE crash_rounds SET state = 'flying', started_at = ? WHERE id = ?").run(Date.now(), id);
    console.log(`[CrashEngine] Round ${id.slice(0,8)} — flying!`);
    monitorRound(id, crashPoint);
  }, BETTING_DURATION);
}

function monitorRound(roundId, crashPoint) {
  const round = db.prepare('SELECT started_at FROM crash_rounds WHERE id = ?').get(roundId);
  if (!round) return;

  roundTimer = setInterval(() => {
    const now = Date.now();
    const elapsed = (now - round.started_at) / 1000;
    const currentMultiplier = Math.round(Math.exp(0.06 * elapsed) * 100) / 100;

    if (currentMultiplier >= crashPoint) {
      clearInterval(roundTimer);
      roundTimer = null;

      // Crash the round
      db.prepare("UPDATE crash_rounds SET state = 'crashed', crashed_at = ? WHERE id = ? AND state = 'flying'").run(now, roundId);

      // All uncashed players lose
      const losers = db.prepare('SELECT wallet, bet_amount FROM crash_players WHERE round_id = ? AND cashed_out_at IS NULL').all(roundId);
      db.prepare('UPDATE crash_players SET payout = 0 WHERE round_id = ? AND cashed_out_at IS NULL').run(roundId);

      // Award XP to losers
      for (const loser of losers) {
        db.prepare('UPDATE players SET xp = xp + 1 WHERE wallet = ?').run(loser.wallet);
      }

      // Reveal seed on-chain after crash
      const serverSeed = db.prepare('SELECT server_seed FROM crash_rounds WHERE id = ?').get(roundId)?.server_seed;
      if (!SKIP_ONCHAIN && serverSeed) revealSeedOnChain(roundId, serverSeed).catch(() => {});

      console.log(`[CrashEngine] Round ${roundId.slice(0,8)} CRASHED @ ${crashPoint}x — ${losers.length} lost`);

      // Start next round after pause
      setTimeout(startNewRound, CRASHED_PAUSE);
    }
  }, TICK_INTERVAL);
}

function stopCrashEngine() {
  if (roundTimer) {
    clearInterval(roundTimer);
    roundTimer = null;
  }
}

module.exports = { startCrashEngine, stopCrashEngine };
