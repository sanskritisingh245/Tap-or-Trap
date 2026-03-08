const express = require('express');
const { eq, and, or, gte, sql, desc, asc, inArray } = require('drizzle-orm');
const { matches, players, achievements } = require('../db/schema');
const { getXpToNextTier } = require('../services/settler');

const router = express.Router();

// GET /stats/me — player's own stats
router.get('/me', async (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;

  const [player] = await db.select({
    wins: players.wins,
    losses: players.losses,
    currentStreak: players.currentStreak,
    maxStreak: players.maxStreak,
    bestReactionMs: players.bestReactionMs,
    totalMatches: players.totalMatches,
    xp: players.xp,
    tier: players.tier,
  }).from(players).where(eq(players.wallet, wallet));

  if (!player) {
    return res.json({
      wins: 0, losses: 0, currentStreak: 0, maxStreak: 0,
      bestReaction: null, totalMatches: 0, winRate: 0,
      xp: 0, tier: 'BRONZE', xpToNext: 100, nextTier: 'SILVER', xpThreshold: 100,
    });
  }

  const winRate = player.totalMatches > 0
    ? Math.round((player.wins / player.totalMatches) * 100)
    : 0;

  const xpInfo = getXpToNextTier(player.xp);

  res.json({
    wins: player.wins,
    losses: player.losses,
    currentStreak: player.currentStreak,
    maxStreak: player.maxStreak,
    bestReaction: player.bestReactionMs,
    totalMatches: player.totalMatches,
    winRate,
    xp: player.xp,
    tier: player.tier,
    xpToNext: xpInfo.needed,
    nextTier: xpInfo.next,
    xpThreshold: xpInfo.threshold,
  });
});

// GET /stats/history — recent match history (last 20)
router.get('/history', async (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;

  const rows = await db.select({
    id: matches.id,
    playerOne: matches.playerOne,
    playerTwo: matches.playerTwo,
    winner: matches.winner,
    playerOneReactionMs: matches.playerOneReactionMs,
    playerTwoReactionMs: matches.playerTwoReactionMs,
    forfeitReason: matches.forfeitReason,
    settledAt: matches.settledAt,
    state: matches.state,
  }).from(matches).where(
    and(
      or(eq(matches.playerOne, wallet), eq(matches.playerTwo, wallet)),
      inArray(matches.state, ['RESOLVED', 'SETTLED', 'CANCELLED'])
    )
  ).orderBy(desc(matches.settledAt)).limit(20);

  const history = rows.map(m => {
    const isPlayerOne = m.playerOne === wallet;
    return {
      id: m.id,
      opponent: isPlayerOne ? m.playerTwo : m.playerOne,
      won: m.winner === wallet,
      cancelled: m.state === 'CANCELLED',
      myReaction: isPlayerOne ? m.playerOneReactionMs : m.playerTwoReactionMs,
      opponentReaction: isPlayerOne ? m.playerTwoReactionMs : m.playerOneReactionMs,
      forfeitReason: m.forfeitReason,
      timestamp: m.settledAt,
    };
  });

  res.json({ history });
});

// GET /stats/leaderboard — top 20 players
router.get('/leaderboard', async (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const timeframe = req.query.timeframe || 'all';

  let leaders;
  if (timeframe === 'all') {
    leaders = await db.select({
      wallet: players.wallet,
      wins: players.wins,
      losses: players.losses,
      maxStreak: players.maxStreak,
      bestReactionMs: players.bestReactionMs,
      totalMatches: players.totalMatches,
      xp: players.xp,
      tier: players.tier,
    }).from(players).where(gte(players.totalMatches, 1))
      .orderBy(desc(players.wins), asc(players.bestReactionMs)).limit(20);

    const leaderboard = leaders.map((p, i) => ({
      rank: i + 1,
      wallet: p.wallet,
      wins: p.wins,
      losses: p.losses,
      maxStreak: p.maxStreak,
      bestReaction: p.bestReactionMs,
      totalMatches: p.totalMatches,
      winRate: p.totalMatches > 0 ? Math.round((p.wins / p.totalMatches) * 100) : 0,
      xp: p.xp,
      tier: p.tier,
    }));

    const myRank = leaderboard.findIndex(l => l.wallet === wallet);
    return res.json({ leaderboard, myRank: myRank >= 0 ? myRank + 1 : null });
  } else {
    let minTime;
    if (timeframe === 'today') {
      const d = new Date(); d.setHours(0, 0, 0, 0);
      minTime = d.getTime();
    } else {
      minTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
    }

    const result = await db.execute(sql`
      SELECT
        p.wallet,
        COUNT(CASE WHEN m.winner = p.wallet THEN 1 END) as wins,
        COUNT(CASE WHEN m.winner != p.wallet AND m.state IN ('RESOLVED','SETTLED') THEN 1 END) as losses,
        p.max_streak, p.best_reaction_ms,
        COUNT(*) as total_matches, p.xp, p.tier
      FROM players p
      JOIN matches m ON (m.player_one = p.wallet OR m.player_two = p.wallet)
      WHERE m.state IN ('RESOLVED', 'SETTLED') AND m.settled_at >= ${minTime}
      GROUP BY p.wallet HAVING COUNT(*) >= 1
      ORDER BY wins DESC, p.best_reaction_ms ASC
      LIMIT 20
    `);
    leaders = result.rows;

    const leaderboard = leaders.map((p, i) => ({
      rank: i + 1,
      wallet: p.wallet,
      wins: p.wins,
      losses: p.losses,
      maxStreak: p.max_streak,
      bestReaction: p.best_reaction_ms,
      totalMatches: p.total_matches,
      winRate: p.total_matches > 0 ? Math.round((p.wins / p.total_matches) * 100) : 0,
      xp: p.xp,
      tier: p.tier,
    }));

    const myRank = leaderboard.findIndex(l => l.wallet === wallet);
    return res.json({ leaderboard, myRank: myRank >= 0 ? myRank + 1 : null });
  }
});

// Simulated players for dev/demo mode (shown when no real players are online)
const DEV_PLAYERS = [
  { wallet: 'Sim1_' + 'A'.repeat(39), wins: 12, losses: 5, xp: 340, tier: 'SILVER', totalMatches: 17, bestReaction: 142 },
  { wallet: 'Sim2_' + 'B'.repeat(39), wins: 8, losses: 3, xp: 220, tier: 'SILVER', totalMatches: 11, bestReaction: 168 },
  { wallet: 'Sim3_' + 'C'.repeat(39), wins: 3, losses: 7, xp: 80, tier: 'BRONZE', totalMatches: 10, bestReaction: 205 },
  { wallet: 'Sim4_' + 'D'.repeat(39), wins: 25, losses: 8, xp: 680, tier: 'GOLD', totalMatches: 33, bestReaction: 118 },
];

// GET /stats/online — recently active players (seen in last 5 min)
router.get('/online', async (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const cutoff = Date.now() - 5 * 60 * 1000;

  const rows = await db.select({
    wallet: players.wallet,
    wins: players.wins,
    losses: players.losses,
    xp: players.xp,
    tier: players.tier,
    totalMatches: players.totalMatches,
    bestReactionMs: players.bestReactionMs,
  }).from(players).where(
    and(gte(players.lastSeen, cutoff), sql`${players.wallet} != ${wallet}`)
  ).orderBy(desc(players.xp)).limit(20);

  let result = rows.map(p => ({
    wallet: p.wallet,
    wins: p.wins,
    losses: p.losses,
    xp: p.xp,
    tier: p.tier,
    totalMatches: p.totalMatches,
    bestReaction: p.bestReactionMs,
  }));

  // Add simulated players when no real players are online
  if (result.length === 0) {
    result = DEV_PLAYERS;
  }

  res.json({ players: result });
});

// GET /stats/achievements — player's achievements
router.get('/achievements', async (req, res) => {
  const db = req.app.locals.db;
  const rows = await db.select({
    achievementId: achievements.achievementId,
    unlockedAt: achievements.unlockedAt,
  }).from(achievements).where(eq(achievements.wallet, req.wallet));
  res.json({ achievements: rows.map(a => ({ achievement_id: a.achievementId, unlocked_at: a.unlockedAt })) });
});

module.exports = router;
