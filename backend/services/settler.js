const { settleMatchOnChain, cancelMatchOnChain } = require('../solana/program');

const STREAK_BONUS_THRESHOLD = 3; // Award bonus credit every 3 wins in a row

/**
 * Updates player stats after a match resolves.
 */
function updatePlayerStats(db, winnerWallet, loserWallet, match) {
  const isPlayerOneWinner = match.player_one === winnerWallet;
  const winnerReaction = isPlayerOneWinner
    ? match.player_one_reaction_ms
    : match.player_two_reaction_ms;

  // Update winner stats
  const winner = db.prepare('SELECT current_streak, max_streak, best_reaction_ms FROM players WHERE wallet = ?').get(winnerWallet);
  const newStreak = (winner?.current_streak || 0) + 1;
  const newMaxStreak = Math.max(newStreak, winner?.max_streak || 0);

  // Track best reaction (only valid positive reactions, not early taps)
  let bestReaction = winner?.best_reaction_ms;
  if (winnerReaction && winnerReaction > 0) {
    if (!bestReaction || winnerReaction < bestReaction) {
      bestReaction = winnerReaction;
    }
  }

  // Streak bonus: award 1 extra credit every STREAK_BONUS_THRESHOLD wins
  const streakBonus = (newStreak % STREAK_BONUS_THRESHOLD === 0) ? 1 : 0;

  db.prepare(`
    UPDATE players SET
      wins = wins + 1,
      total_matches = total_matches + 1,
      current_streak = ?,
      max_streak = ?,
      best_reaction_ms = ?,
      credits = credits + ?
    WHERE wallet = ?
  `).run(newStreak, newMaxStreak, bestReaction, streakBonus, winnerWallet);

  // Update loser stats
  db.prepare(`
    UPDATE players SET
      losses = losses + 1,
      total_matches = total_matches + 1,
      current_streak = 0
    WHERE wallet = ?
  `).run(loserWallet);

  if (streakBonus > 0) {
    console.log(`[STREAK] ${winnerWallet.slice(0, 8)}... hit ${newStreak}-win streak — bonus credit awarded!`);
  }

  return { newStreak, streakBonus };
}

/**
 * Settles a match on-chain and updates the database.
 */
async function settleMatch(db, matchId, winnerWallet) {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) throw new Error(`Match ${matchId} not found`);
  if (match.state === 'SETTLED') throw new Error(`Match ${matchId} already settled`);

  const loserWallet = match.player_one === winnerWallet ? match.player_two : match.player_one;

  // Update player stats
  const { newStreak } = updatePlayerStats(db, winnerWallet, loserWallet, match);

  if (process.env.SKIP_ONCHAIN === 'true') {
    db.prepare(`
      UPDATE matches SET state = 'SETTLED', winner = ?, settle_tx = 'dev-skip', settled_at = ?
      WHERE id = ?
    `).run(winnerWallet, Date.now(), matchId);
    console.log(`[DEV] Settled match ${matchId} — winner: ${winnerWallet.slice(0, 8)}... (streak: ${newStreak})`);
    return 'dev-skip';
  }

  try {
    const txSig = await settleMatchOnChain(
      match.player_one,
      match.player_two,
      matchId,
      winnerWallet
    );

    db.prepare(`
      UPDATE matches SET
        state = 'SETTLED',
        winner = ?,
        settle_tx = ?,
        settled_at = ?
      WHERE id = ?
    `).run(winnerWallet, txSig, Date.now(), matchId);

    return txSig;
  } catch (err) {
    console.error(`Failed to settle match ${matchId} on-chain:`, err.message);
    db.prepare(`
      UPDATE matches SET
        state = 'RESOLVED',
        winner = ?
      WHERE id = ?
    `).run(winnerWallet, matchId);
    throw err;
  }
}

/**
 * Cancels a match on-chain and refunds credits.
 */
async function cancelMatch(db, matchId) {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) throw new Error(`Match ${matchId} not found`);

  if (process.env.SKIP_ONCHAIN === 'true') {
    db.prepare(`
      UPDATE matches SET state = 'CANCELLED', settle_tx = 'dev-skip', settled_at = ?
      WHERE id = ?
    `).run(Date.now(), matchId);
    db.prepare('UPDATE players SET credits = credits + 1 WHERE wallet = ?').run(match.player_one);
    db.prepare('UPDATE players SET credits = credits + 1 WHERE wallet = ?').run(match.player_two);
    console.log(`[DEV] Cancelled match ${matchId} — credits refunded`);
    return 'dev-skip';
  }

  try {
    const txSig = await cancelMatchOnChain(
      match.player_one,
      match.player_two,
      matchId
    );

    db.prepare(`
      UPDATE matches SET
        state = 'CANCELLED',
        settle_tx = ?,
        settled_at = ?
      WHERE id = ?
    `).run(txSig, Date.now(), matchId);

    return txSig;
  } catch (err) {
    console.error(`Failed to cancel match ${matchId} on-chain:`, err.message);
    db.prepare("UPDATE matches SET state = 'CANCELLED', settled_at = ? WHERE id = ?")
      .run(Date.now(), matchId);
    throw err;
  }
}

module.exports = { settleMatch, cancelMatch };
