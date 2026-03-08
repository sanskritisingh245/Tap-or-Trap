const { eq, sql, and } = require('drizzle-orm');
const { matches, players, achievements, dailyChallenges } = require('../db/schema');

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

async function checkAchievements(db, wallet, ctx) {
  const newlyUnlocked = [];
  const existing = await db.select({ achievementId: achievements.achievementId }).from(achievements).where(eq(achievements.wallet, wallet));
  const existingSet = new Set(existing.map(a => a.achievementId));

  for (const ach of ACHIEVEMENT_DEFS) {
    if (!existingSet.has(ach.id) && ach.check(ctx)) {
      await db.insert(achievements).values({ wallet, achievementId: ach.id, unlockedAt: Date.now() }).onConflictDoNothing();
      newlyUnlocked.push(ach.id);
    }
  }
  return newlyUnlocked;
}

// ─── Daily Challenge Progress ─────────────────────────────────────
async function updateChallengeProgress(db, wallet, won, reactionMs, streak) {
  const today = new Date().toISOString().split('T')[0];
  const challenges = await db.select().from(dailyChallenges).where(
    and(
      eq(dailyChallenges.wallet, wallet),
      eq(dailyChallenges.date, today),
      eq(dailyChallenges.completed, 0)
    )
  );

  for (const ch of challenges) {
    let shouldIncrement = false;
    switch (ch.challengeType) {
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
          await db.update(dailyChallenges).set({ progress: sql`${dailyChallenges.target}`, completed: 1 }).where(eq(dailyChallenges.id, ch.id));
          // Award challenge rewards
          await db.update(players).set({
            credits: sql`${players.credits} + ${ch.rewardCredits}`,
            xp: sql`${players.xp} + ${ch.rewardXp}`,
          }).where(eq(players.wallet, wallet));
          continue;
        }
        break;
    }
    if (shouldIncrement) {
      const newProgress = ch.progress + 1;
      if (newProgress >= ch.target) {
        await db.update(dailyChallenges).set({ progress: newProgress, completed: 1 }).where(eq(dailyChallenges.id, ch.id));
        await db.update(players).set({
          credits: sql`${players.credits} + ${ch.rewardCredits}`,
          xp: sql`${players.xp} + ${ch.rewardXp}`,
        }).where(eq(players.wallet, wallet));
      } else {
        await db.update(dailyChallenges).set({ progress: newProgress }).where(eq(dailyChallenges.id, ch.id));
      }
    }
  }
}

/**
 * Updates player stats after a match resolves.
 */
async function updatePlayerStats(db, winnerWallet, loserWallet, match) {
  const isPlayerOneWinner = match.playerOne === winnerWallet;
  const winnerReaction = isPlayerOneWinner
    ? match.playerOneReactionMs
    : match.playerTwoReactionMs;
  const loserReaction = isPlayerOneWinner
    ? match.playerTwoReactionMs
    : match.playerOneReactionMs;

  // Update winner stats
  const [winner] = await db.select({
    currentStreak: players.currentStreak,
    maxStreak: players.maxStreak,
    bestReactionMs: players.bestReactionMs,
    totalMatches: players.totalMatches,
    xp: players.xp,
  }).from(players).where(eq(players.wallet, winnerWallet));

  const newStreak = (winner?.currentStreak || 0) + 1;
  const newMaxStreak = Math.max(newStreak, winner?.maxStreak || 0);
  const newTotalMatches = (winner?.totalMatches || 0) + 1;

  // Track best reaction (only valid positive reactions, not early taps)
  let bestReaction = winner?.bestReactionMs;
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

  await db.update(players).set({
    wins: sql`${players.wins} + 1`,
    winnings: sql`${players.winnings} + 1`,
    totalMatches: sql`${players.totalMatches} + 1`,
    currentStreak: newStreak,
    maxStreak: newMaxStreak,
    bestReactionMs: bestReaction,
    credits: sql`${players.credits} + ${winnerCredits}`,
    xp: newXp,
    tier: newTier,
  }).where(eq(players.wallet, winnerWallet));

  // Update loser stats
  const [loser] = await db.select({
    totalMatches: players.totalMatches,
    xp: players.xp,
  }).from(players).where(eq(players.wallet, loserWallet));

  const loserXpGain = calculateXpGain(false, loserReaction, 0, false);
  const loserNewXp = (loser?.xp || 0) + loserXpGain;
  const loserNewTier = getTierForXp(loserNewXp);
  const loserTotalMatches = (loser?.totalMatches || 0) + 1;

  await db.update(players).set({
    losses: sql`${players.losses} + 1`,
    totalMatches: sql`${players.totalMatches} + 1`,
    currentStreak: 0,
    xp: loserNewXp,
    tier: loserNewTier,
  }).where(eq(players.wallet, loserWallet));

  if (streakBonus > 0) {
    console.log(`[STREAK] ${winnerWallet.slice(0, 8)}... hit ${newStreak}-win streak — bonus credit awarded!`);
  }

  // Check achievements for both players
  const winnerAchievements = await checkAchievements(db, winnerWallet, {
    reactionMs: winnerReaction,
    newStreak,
    totalMatches: newTotalMatches,
  });
  const loserAchievements = await checkAchievements(db, loserWallet, {
    reactionMs: loserReaction,
    newStreak: 0,
    totalMatches: loserTotalMatches,
  });

  // Update daily challenge progress for both
  await updateChallengeProgress(db, winnerWallet, true, winnerReaction, newStreak);
  await updateChallengeProgress(db, loserWallet, false, loserReaction, 0);

  return { newStreak, streakBonus, xpGain, newTier, winnerAchievements, loserAchievements };
}

/**
 * Settles a match on-chain and updates the database.
 */
async function settleMatch(db, matchId, winnerWallet) {
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match) throw new Error(`Match ${matchId} not found`);
  if (match.state === 'SETTLED') throw new Error(`Match ${matchId} already settled`);

  const loserWallet = match.playerOne === winnerWallet ? match.playerTwo : match.playerOne;

  // Update player stats
  const { newStreak, xpGain, newTier } = await updatePlayerStats(db, winnerWallet, loserWallet, match);

  await db.update(matches).set({
    state: 'SETTLED',
    winner: winnerWallet,
    settleTx: 'db-only',
    settledAt: Date.now(),
  }).where(eq(matches.id, matchId));

  console.log(`Settled match ${matchId} — winner: ${winnerWallet.slice(0, 8)}... (streak: ${newStreak}, +${xpGain}xp, tier: ${newTier})`);
  return 'db-only';
}

/**
 * Cancels a match on-chain and refunds credits.
 */
async function cancelMatch(db, matchId) {
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match) throw new Error(`Match ${matchId} not found`);

  await db.update(matches).set({
    state: 'CANCELLED',
    settleTx: 'db-only',
    settledAt: Date.now(),
  }).where(eq(matches.id, matchId));

  await db.update(players).set({
    credits: sql`${players.credits} + 1`,
  }).where(eq(players.wallet, match.playerOne));

  await db.update(players).set({
    credits: sql`${players.credits} + 1`,
  }).where(eq(players.wallet, match.playerTwo));

  console.log(`Cancelled match ${matchId} — credits refunded`);
  return 'db-only';
}

module.exports = { settleMatch, cancelMatch, TIERS, getTierForXp, getXpToNextTier };
