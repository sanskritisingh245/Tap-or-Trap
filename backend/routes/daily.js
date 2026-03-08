const express = require('express');
const router = express.Router();
const { eq, and, sql } = require('drizzle-orm');
const { players, dailyChallenges } = require('../db/schema');

// Challenge pool — 3 are picked per day, seeded by date
const CHALLENGE_POOL = [
  { type: 'win_matches',  target: 3, label: 'Win 3 matches',            xp: 20, credits: 1 },
  { type: 'win_matches',  target: 5, label: 'Win 5 matches',            xp: 35, credits: 2 },
  { type: 'play_matches', target: 5, label: 'Play 5 matches',           xp: 15, credits: 1 },
  { type: 'play_matches', target: 10, label: 'Play 10 matches',         xp: 30, credits: 2 },
  { type: 'fast_reaction', target: 200, label: 'React under 200ms',     xp: 15, credits: 1 },
  { type: 'fast_reaction', target: 150, label: 'React under 150ms',     xp: 25, credits: 1 },
  { type: 'win_streak',   target: 2, label: 'Win 2 in a row',           xp: 20, credits: 1 },
  { type: 'win_streak',   target: 3, label: 'Win 3 in a row',           xp: 30, credits: 2 },
];

function getDailySeed(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickDailyChallenges(dateStr) {
  const seed = getDailySeed(dateStr);
  const shuffled = [...CHALLENGE_POOL].sort((a, b) => {
    const ha = getDailySeed(dateStr + a.type + a.target);
    const hb = getDailySeed(dateStr + b.type + b.target);
    return ha - hb;
  });
  return shuffled.slice(0, 3);
}

// GET /daily/challenges — get today's challenges (creates if missing)
router.get('/challenges', async (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const today = new Date().toISOString().split('T')[0];

  let challenges = await db.select().from(dailyChallenges).where(and(eq(dailyChallenges.wallet, wallet), eq(dailyChallenges.date, today)));

  if (challenges.length === 0) {
    const picks = pickDailyChallenges(today);
    for (const ch of picks) {
      await db.insert(dailyChallenges).values({ wallet, challengeType: ch.type, target: ch.target, rewardXp: ch.xp, rewardCredits: ch.credits, date: today }).onConflictDoNothing();
    }
    challenges = await db.select().from(dailyChallenges).where(and(eq(dailyChallenges.wallet, wallet), eq(dailyChallenges.date, today)));
  }

  // Map to friendly labels
  const result = challenges.map(ch => {
    const def = CHALLENGE_POOL.find(c => c.type === ch.challengeType && c.target === ch.target);
    return {
      id: ch.id,
      type: ch.challengeType,
      label: def?.label || `${ch.challengeType} x${ch.target}`,
      target: ch.target,
      progress: ch.progress,
      completed: ch.completed === 1,
      rewardXp: ch.rewardXp,
      rewardCredits: ch.rewardCredits,
    };
  });

  res.json({ challenges: result, date: today });
});

// POST /daily/claim-login — claim daily login reward
router.post('/claim-login', async (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const today = new Date().toISOString().split('T')[0];

  const [player] = await db.select({ lastLoginDate: players.lastLoginDate, loginStreak: players.loginStreak }).from(players).where(eq(players.wallet, wallet));
  if (!player) return res.status(404).json({ error: 'Player not found' });

  if (player.lastLoginDate === today) {
    return res.json({ alreadyClaimed: true, streak: player.loginStreak, reward: 0 });
  }

  // Check if streak continues (yesterday) or resets
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak;
  if (player.lastLoginDate === yesterdayStr) {
    newStreak = player.loginStreak + 1;
  } else {
    newStreak = 1;
  }

  // Reward: 1 credit per login, bonus 5 at 7-day streak
  let reward = 1;
  if (newStreak % 7 === 0) reward += 5;

  await db.update(players).set({ lastLoginDate: today, loginStreak: newStreak, credits: sql`${players.credits} + ${reward}` }).where(eq(players.wallet, wallet));

  res.json({ alreadyClaimed: false, streak: newStreak, reward });
});

module.exports = router;
