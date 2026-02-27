const { v4: uuidv4 } = require('uuid');
const { generateDrawTime } = require('./draw-timer');
const { deductCredits } = require('../solana/program');

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
    'SELECT wallet FROM queue ORDER BY joined_at ASC LIMIT 2'
  ).all();

  if (players.length < 2) return null;

  const playerOne = players[0].wallet;
  const playerTwo = players[1].wallet;

  // Remove both from queue
  db.prepare('DELETE FROM queue WHERE wallet IN (?, ?)').run(playerOne, playerTwo);

  // Create the match
  const match = createMatch(db, playerOne, playerTwo);

  // Trigger on-chain credit deduction (skip in dev mode if no program deployed)
  if (process.env.SKIP_ONCHAIN !== 'true') {
    deductCredits(playerOne, playerTwo, match.id).catch((err) => {
      console.error(`Failed to deduct credits for match ${match.id}:`, err.message);
      db.prepare("UPDATE matches SET state = 'CANCELLED' WHERE id = ?").run(match.id);
      const now = Date.now();
      db.prepare('INSERT OR IGNORE INTO queue (wallet, joined_at) VALUES (?, ?)').run(playerOne, now);
      db.prepare('INSERT OR IGNORE INTO queue (wallet, joined_at) VALUES (?, ?)').run(playerTwo, now);
    });
  } else {
    // Dev mode: deduct 1 credit from each player in DB
    db.prepare('UPDATE players SET credits = credits - 1 WHERE wallet = ? AND credits > 0').run(playerOne);
    db.prepare('UPDATE players SET credits = credits - 1 WHERE wallet = ? AND credits > 0').run(playerTwo);
    console.log(`[DEV] Deducted 1 credit each for match ${match.id}`);
  }

  return match;
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

module.exports = { createMatch, pairFromQueue, pairFromRoom, startMatchmaker, stopMatchmaker };
