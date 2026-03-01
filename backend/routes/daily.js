const express = require('express');
const router = express.Router();

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
router.get('/challenges', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const today = new Date().toISOString().split('T')[0];

  let challenges = db.prepare('SELECT * FROM daily_challenges WHERE wallet = ? AND date = ?').all(wallet, today);

  if (challenges.length === 0) {
    const picks = pickDailyChallenges(today);
    const insert = db.prepare('INSERT OR IGNORE INTO daily_challenges (wallet, challenge_type, target, reward_xp, reward_credits, date) VALUES (?, ?, ?, ?, ?, ?)');
    for (const ch of picks) {
      insert.run(wallet, ch.type, ch.target, ch.xp, ch.credits, today);
    }
    challenges = db.prepare('SELECT * FROM daily_challenges WHERE wallet = ? AND date = ?').all(wallet, today);
  }

  // Map to friendly labels
  const result = challenges.map(ch => {
    const def = CHALLENGE_POOL.find(c => c.type === ch.challenge_type && c.target === ch.target);
    return {
      id: ch.id,
      type: ch.challenge_type,
      label: def?.label || `${ch.challenge_type} x${ch.target}`,
      target: ch.target,
      progress: ch.progress,
      completed: ch.completed === 1,
      rewardXp: ch.reward_xp,
      rewardCredits: ch.reward_credits,
    };
  });

  res.json({ challenges: result, date: today });
});

// POST /daily/claim-login — claim daily login reward
router.post('/claim-login', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const today = new Date().toISOString().split('T')[0];

  const player = db.prepare('SELECT last_login_date, login_streak FROM players WHERE wallet = ?').get(wallet);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  if (player.last_login_date === today) {
    return res.json({ alreadyClaimed: true, streak: player.login_streak, reward: 0 });
  }

  // Check if streak continues (yesterday) or resets
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak;
  if (player.last_login_date === yesterdayStr) {
    newStreak = player.login_streak + 1;
  } else {
    newStreak = 1;
  }

  // Reward: 1 credit per login, bonus 5 at 7-day streak
  let reward = 1;
  if (newStreak % 7 === 0) reward += 5;

  db.prepare('UPDATE players SET last_login_date = ?, login_streak = ?, credits = credits + ? WHERE wallet = ?')
    .run(today, newStreak, reward, wallet);

  res.json({ alreadyClaimed: false, streak: newStreak, reward });
});

module.exports = router;
