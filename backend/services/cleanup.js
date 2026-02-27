const { expireRooms } = require('./room-manager');
const { cancelMatch } = require('./settler');

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

        const p1Disconnected = (now - p1LastSeen) > STANDOFF_TIMEOUT_MS;
        const p2Disconnected = (now - p2LastSeen) > STANDOFF_TIMEOUT_MS;

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

      // 3. Handle DRAW_FIRED tap timeouts (> 5s since draw)
      const drawFiredMatches = db.prepare(
        "SELECT * FROM matches WHERE state = 'DRAW_FIRED' AND draw_fired_at IS NOT NULL"
      ).all();

      for (const match of drawFiredMatches) {
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
