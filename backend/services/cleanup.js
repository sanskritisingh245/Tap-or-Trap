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
  cleanupInterval = setInterval(() => {
    try {
      const now = Date.now();

      // 1. Expire stale rooms
      expireRooms(db);

      // 2. Handle STANDOFF disconnects (no polling for > 3s)
      const standoffMatches = db.prepare(
        "SELECT * FROM matches WHERE state = 'STANDOFF'"
      ).all();

      for (const match of standoffMatches) {
        const p1LastSeen = getPlayerLastSeen(db, match.player_one);
        const p2LastSeen = getPlayerLastSeen(db, match.player_two);

        // Bots are never "disconnected"
        const p1Disconnected = !isBot(match.player_one) && (now - p1LastSeen) > STANDOFF_TIMEOUT_MS;
        const p2Disconnected = !isBot(match.player_two) && (now - p2LastSeen) > STANDOFF_TIMEOUT_MS;

        if (p1Disconnected && p2Disconnected) {
          // Both disconnected — cancel match, refund credits
          db.prepare("UPDATE matches SET state = 'CANCELLED', forfeit_reason = 'disconnect', settled_at = ? WHERE id = ?")
            .run(now, match.id);
          cancelMatch(db, match.id).catch(() => {});
        } else if (p1Disconnected) {
          // Player one disconnected — player two wins
          db.prepare("UPDATE matches SET state = 'RESOLVED', winner = ?, forfeit_reason = 'disconnect', settled_at = ? WHERE id = ?")
            .run(match.player_two, now, match.id);
        } else if (p2Disconnected) {
          db.prepare("UPDATE matches SET state = 'RESOLVED', winner = ?, forfeit_reason = 'disconnect', settled_at = ? WHERE id = ?")
            .run(match.player_one, now, match.id);
        }
      }

      // 3. Handle DRAW_FIRED: bot auto-tap + tap timeouts
      const drawFiredMatches = db.prepare(
        "SELECT * FROM matches WHERE state = 'DRAW_FIRED' AND draw_fired_at IS NOT NULL"
      ).all();

      for (const match of drawFiredMatches) {
        // Auto-tap for bots that haven't tapped yet
        const botDelay = 150 + Math.floor(Math.random() * 250);
        if (isBot(match.player_one) && match.player_one_tap_at === null && (now - match.draw_fired_at) >= botDelay) {
          db.prepare('UPDATE matches SET player_one_tap_at = ?, player_one_reaction_ms = ? WHERE id = ?').run(now, botDelay, match.id);
        }
        if (isBot(match.player_two) && match.player_two_tap_at === null && (now - match.draw_fired_at) >= botDelay) {
          db.prepare('UPDATE matches SET player_two_tap_at = ?, player_two_reaction_ms = ? WHERE id = ?').run(now, botDelay, match.id);
        }

        if ((now - match.draw_fired_at) > TAP_TIMEOUT_MS) {
          const p1Tapped = match.player_one_tap_at !== null;
          const p2Tapped = match.player_two_tap_at !== null;

          if (!p1Tapped && !p2Tapped) {
            // Both timed out — cancel
            db.prepare("UPDATE matches SET state = 'CANCELLED', forfeit_reason = 'both_timeout', settled_at = ? WHERE id = ?")
              .run(now, match.id);
            cancelMatch(db, match.id).catch(() => {});
          } else if (!p1Tapped) {
            db.prepare("UPDATE matches SET state = 'RESOLVED', winner = ?, forfeit_reason = 'timeout', settled_at = ? WHERE id = ?")
              .run(match.player_two, now, match.id);
          } else if (!p2Tapped) {
            db.prepare("UPDATE matches SET state = 'RESOLVED', winner = ?, forfeit_reason = 'timeout', settled_at = ? WHERE id = ?")
              .run(match.player_one, now, match.id);
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

function getPlayerLastSeen(db, wallet) {
  const player = db.prepare('SELECT last_seen FROM players WHERE wallet = ?').get(wallet);
  return player?.last_seen || 0;
}

module.exports = { startCleanupJob, stopCleanupJob };
