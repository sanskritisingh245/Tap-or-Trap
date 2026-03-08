const { settleMatchOnChain, cancelMatchOnChain } = require('../solana/program');

const STREAK_BONUS_THRESHOLD = 3; // Award bonus credit every 3 wins in a row

// ─── Tier System ──────────────────────────────────────────────────
const TIERS = [
  { name: 'BRONZE',  xpRequired: 0 },
  { name: 'SILVER',  xpRequired: 100 },
  { name: 'GOLD',    xpRequired: 300 },
  { name: 'DIAMOND', xpRequired: 700 },
  { name: 'PHANTOM', xpRequired: 1500 },
];

function getTierForXp(xp) {
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (xp >= t.xpRequired) tier = t;
  }
  return tier.name;
}

function getXpToNextTier(xp) {
  for (const t of TIERS) {
    if (xp < t.xpRequired) return { next: t.name, needed: t.xpRequired - xp, threshold: t.xpRequired };
  }
  return { next: null, needed: 0, threshold: 0 }; // Max tier
}

function calculateXpGain(won, reactionMs, streak, isBo3Win) {
  if (!won) return 2; // Losers still get participation XP
  let xp = 10; // Base win XP
  // Speed bonus
  if (reactionMs && reactionMs > 0 && reactionMs < 150) xp += 5;
  else if (reactionMs && reactionMs > 0 && reactionMs < 200) xp += 3;
  // Streak bonus
  if (streak >= 3) xp += 3;
  if (streak >= 5) xp += 2;
  if (streak >= 10) xp += 5;
  // Bo3 series win bonus
  if (isBo3Win) xp = Math.round(xp * 1.5);
  return xp;
}

// ─── Achievement System ───────────────────────────────────────────
const ACHIEVEMENT_DEFS = [
  { id: 'lightning',   check: (ctx) => ctx.reactionMs && ctx.reactionMs > 0 && ctx.reactionMs < 150 },
  { id: 'flash',       check: (ctx) => ctx.reactionMs && ctx.reactionMs > 0 && ctx.reactionMs < 100 },
  { id: 'untouchable', check: (ctx) => ctx.newStreak >= 5 },
  { id: 'demon',       check: (ctx) => ctx.newStreak >= 10 },
  { id: 'veteran',     check: (ctx) => ctx.totalMatches >= 50 },
  { id: 'centurion',   check: (ctx) => ctx.totalMatches >= 100 },
];

function checkAchievements(db, wallet, ctx) {
  const newlyUnlocked = [];
  const existing = db.prepare('SELECT achievement_id FROM achievements WHERE wallet = ?').all(wallet);
  const existingSet = new Set(existing.map(a => a.achievement_id));

  for (const ach of ACHIEVEMENT_DEFS) {
    if (!existingSet.has(ach.id) && ach.check(ctx)) {
      db.prepare('INSERT OR IGNORE INTO achievements (wallet, achievement_id, unlocked_at) VALUES (?, ?, ?)').run(wallet, ach.id, Date.now());
      newlyUnlocked.push(ach.id);
    }
  }
  return newlyUnlocked;
}

// ─── Daily Challenge Progress ─────────────────────────────────────
function updateChallengeProgress(db, wallet, won, reactionMs, streak) {
  const today = new Date().toISOString().split('T')[0];
  const challenges = db.prepare('SELECT * FROM daily_challenges WHERE wallet = ? AND date = ? AND completed = 0').all(wallet, today);

  for (const ch of challenges) {
    let shouldIncrement = false;
    switch (ch.challenge_type) {
      case 'win_matches':
        shouldIncrement = won;
        break;
      case 'play_matches':
        shouldIncrement = true;
        break;
      case 'fast_reaction':
        shouldIncrement = reactionMs && reactionMs > 0 && reactionMs < ch.target;
        break;
      case 'win_streak':
        if (won && streak >= ch.target) {
          db.prepare('UPDATE daily_challenges SET progress = target, completed = 1 WHERE id = ?').run(ch.id);
          // Award challenge rewards
          db.prepare('UPDATE players SET credits = credits + ?, xp = xp + ? WHERE wallet = ?').run(ch.reward_credits, ch.reward_xp, wallet);
          continue;
        }
        break;
    }
    if (shouldIncrement) {
      const newProgress = ch.progress + 1;
      if (newProgress >= ch.target) {
        db.prepare('UPDATE daily_challenges SET progress = ?, completed = 1 WHERE id = ?').run(newProgress, ch.id);
        db.prepare('UPDATE players SET credits = credits + ?, xp = xp + ? WHERE wallet = ?').run(ch.reward_credits, ch.reward_xp, wallet);
      } else {
        db.prepare('UPDATE daily_challenges SET progress = ? WHERE id = ?').run(newProgress, ch.id);
      }
    }
  }
}

/**
 * Updates player stats after a match resolves.
 */
function updatePlayerStats(db, winnerWallet, loserWallet, match) {
  const isPlayerOneWinner = match.player_one === winnerWallet;
  const winnerReaction = isPlayerOneWinner
    ? match.player_one_reaction_ms
    : match.player_two_reaction_ms;
  const loserReaction = isPlayerOneWinner
    ? match.player_two_reaction_ms
    : match.player_one_reaction_ms;

  // Update winner stats
  const winner = db.prepare('SELECT current_streak, max_streak, best_reaction_ms, total_matches, xp FROM players WHERE wallet = ?').get(winnerWallet);
  const newStreak = (winner?.current_streak || 0) + 1;
  const newMaxStreak = Math.max(newStreak, winner?.max_streak || 0);
  const newTotalMatches = (winner?.total_matches || 0) + 1;

  // Track best reaction (only valid positive reactions, not early taps)
  let bestReaction = winner?.best_reaction_ms;
  if (winnerReaction && winnerReaction > 0) {
    if (!bestReaction || winnerReaction < bestReaction) {
      bestReaction = winnerReaction;
    }
  }

  // Winner gets the pot (2 credits: their 1 back + opponent's 1) plus streak bonus
  const streakBonus = (newStreak % STREAK_BONUS_THRESHOLD === 0) ? 1 : 0;
  const winnerCredits = 2 + streakBonus; // pot + streak bonus

  // XP calculation
  const xpGain = calculateXpGain(true, winnerReaction, newStreak, false);
  const newXp = (winner?.xp || 0) + xpGain;
  const newTier = getTierForXp(newXp);

  db.prepare(`
    UPDATE players SET
      wins = wins + 1,
      winnings = winnings + 1,
      total_matches = total_matches + 1,
      current_streak = ?,
      max_streak = ?,
      best_reaction_ms = ?,
      credits = credits + ?,
      xp = ?,
      tier = ?
    WHERE wallet = ?
  `).run(newStreak, newMaxStreak, bestReaction, winnerCredits, newXp, newTier, winnerWallet);

  // Update loser stats
  const loser = db.prepare('SELECT total_matches, xp FROM players WHERE wallet = ?').get(loserWallet);
  const loserXpGain = calculateXpGain(false, loserReaction, 0, false);
  const loserNewXp = (loser?.xp || 0) + loserXpGain;
  const loserNewTier = getTierForXp(loserNewXp);
  const loserTotalMatches = (loser?.total_matches || 0) + 1;

  db.prepare(`
    UPDATE players SET
      losses = losses + 1,
      total_matches = total_matches + 1,
      current_streak = 0,
      xp = ?,
      tier = ?
    WHERE wallet = ?
  `).run(loserNewXp, loserNewTier, loserWallet);

  if (streakBonus > 0) {
    console.log(`[STREAK] ${winnerWallet.slice(0, 8)}... hit ${newStreak}-win streak — bonus credit awarded!`);
  }

  // Check achievements for both players
  const winnerAchievements = checkAchievements(db, winnerWallet, {
    reactionMs: winnerReaction,
    newStreak,
    totalMatches: newTotalMatches,
  });
  const loserAchievements = checkAchievements(db, loserWallet, {
    reactionMs: loserReaction,
    newStreak: 0,
    totalMatches: loserTotalMatches,
  });

  // Update daily challenge progress for both
  updateChallengeProgress(db, winnerWallet, true, winnerReaction, newStreak);
  updateChallengeProgress(db, loserWallet, false, loserReaction, 0);

  return { newStreak, streakBonus, xpGain, newTier, winnerAchievements, loserAchievements };
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
  const { newStreak, xpGain, newTier } = updatePlayerStats(db, winnerWallet, loserWallet, match);

  if (process.env.SKIP_ONCHAIN === 'true') {
    db.prepare(`
      UPDATE matches SET state = 'SETTLED', winner = ?, settle_tx = 'dev-skip', settled_at = ?
      WHERE id = ?
    `).run(winnerWallet, Date.now(), matchId);
    console.log(`[DEV] Settled match ${matchId} — winner: ${winnerWallet.slice(0, 8)}... (streak: ${newStreak}, +${xpGain}xp, tier: ${newTier})`);
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

module.exports = { settleMatch, cancelMatch, TIERS, getTierForXp, getXpToNextTier };
