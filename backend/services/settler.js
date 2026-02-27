const { settleMatchOnChain, cancelMatchOnChain } = require('../solana/program');

/**
 * Settles a match on-chain and updates the database.
 */
async function settleMatch(db, matchId, winnerWallet) {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) throw new Error(`Match ${matchId} not found`);
  if (match.state === 'SETTLED') throw new Error(`Match ${matchId} already settled`);

  if (process.env.SKIP_ONCHAIN === 'true') {
    // Dev mode: just update DB, skip on-chain
    db.prepare(`
      UPDATE matches SET state = 'SETTLED', winner = ?, settle_tx = 'dev-skip', settled_at = ?
      WHERE id = ?
    `).run(winnerWallet, Date.now(), matchId);
    console.log(`[DEV] Settled match ${matchId} — winner: ${winnerWallet.slice(0, 8)}...`);
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
    // Refund 1 credit to each player
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
