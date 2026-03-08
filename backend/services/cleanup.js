const { eq, and, isNotNull } = require('drizzle-orm');
const { matches, players } = require('../db/schema');
const { expireRooms } = require('./room-manager');
const { cancelMatch } = require('./settler');
const { isBot } = require('./matchmaker');

const STANDOFF_TIMEOUT_MS = 30000;  // 30s no polling = disconnect
const TAP_TIMEOUT_MS = 15000;       // 15s after draw = timeout

/**
 * Periodic cleanup job (every 10s).
 * - Expires stale rooms
 * - Forfeits disconnected players during STANDOFF
 * - Times out players who don't tap after DRAW_FIRED
 * - Cancels matches where both players disconnect
 */
let cleanupInterval = null;

function startCleanupJob(db) {
  cleanupInterval = setInterval(async () => {
    try {
      const now = Date.now();

      // 1. Expire stale rooms
      await expireRooms(db);

      // 2. Handle STANDOFF disconnects (no polling for > 3s)
      const standoffMatches = await db.select().from(matches).where(eq(matches.state, 'STANDOFF'));

      for (const match of standoffMatches) {
        const p1LastSeen = await getPlayerLastSeen(db, match.playerOne);
        const p2LastSeen = await getPlayerLastSeen(db, match.playerTwo);

        // Bots are never "disconnected"
        const p1Disconnected = !isBot(match.playerOne) && (now - p1LastSeen) > STANDOFF_TIMEOUT_MS;
        const p2Disconnected = !isBot(match.playerTwo) && (now - p2LastSeen) > STANDOFF_TIMEOUT_MS;

        if (p1Disconnected && p2Disconnected) {
          // Both disconnected — cancel match, refund credits
          await db.update(matches).set({ state: 'CANCELLED', forfeitReason: 'disconnect', settledAt: now }).where(eq(matches.id, match.id));
          cancelMatch(db, match.id).catch(() => {});
        } else if (p1Disconnected) {
          // Player one disconnected — player two wins
          await db.update(matches).set({ state: 'RESOLVED', winner: match.playerTwo, forfeitReason: 'disconnect', settledAt: now }).where(eq(matches.id, match.id));
        } else if (p2Disconnected) {
          await db.update(matches).set({ state: 'RESOLVED', winner: match.playerOne, forfeitReason: 'disconnect', settledAt: now }).where(eq(matches.id, match.id));
        }
      }

      // 3. Handle DRAW_FIRED: bot auto-tap + tap timeouts
      const drawFiredMatches = await db.select().from(matches).where(and(eq(matches.state, 'DRAW_FIRED'), isNotNull(matches.drawFiredAt)));

      for (const match of drawFiredMatches) {
        // Auto-tap for bots that haven't tapped yet
        const botDelay = 150 + Math.floor(Math.random() * 250);
        if (isBot(match.playerOne) && match.playerOneTapAt === null && (now - match.drawFiredAt) >= botDelay) {
          await db.update(matches).set({ playerOneTapAt: now, playerOneReactionMs: botDelay }).where(eq(matches.id, match.id));
        }
        if (isBot(match.playerTwo) && match.playerTwoTapAt === null && (now - match.drawFiredAt) >= botDelay) {
          await db.update(matches).set({ playerTwoTapAt: now, playerTwoReactionMs: botDelay }).where(eq(matches.id, match.id));
        }

        if ((now - match.drawFiredAt) > TAP_TIMEOUT_MS) {
          const p1Tapped = match.playerOneTapAt !== null;
          const p2Tapped = match.playerTwoTapAt !== null;

          if (!p1Tapped && !p2Tapped) {
            // Both timed out — cancel
            await db.update(matches).set({ state: 'CANCELLED', forfeitReason: 'both_timeout', settledAt: now }).where(eq(matches.id, match.id));
            cancelMatch(db, match.id).catch(() => {});
          } else if (!p1Tapped) {
            await db.update(matches).set({ state: 'RESOLVED', winner: match.playerTwo, forfeitReason: 'timeout', settledAt: now }).where(eq(matches.id, match.id));
          } else if (!p2Tapped) {
            await db.update(matches).set({ state: 'RESOLVED', winner: match.playerOne, forfeitReason: 'timeout', settledAt: now }).where(eq(matches.id, match.id));
          }
        }
      }
    } catch (err) {
      console.error('Cleanup job error:', err.message);
    }
  }, 10000);

  console.log('Cleanup job started (10s interval)');
}

function stopCleanupJob() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

async function getPlayerLastSeen(db, wallet) {
  const [player] = await db.select({ lastSeen: players.lastSeen }).from(players).where(eq(players.wallet, wallet));
  return player?.lastSeen || 0;
}

module.exports = { startCleanupJob, stopCleanupJob };
