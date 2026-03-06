const express = require('express');
const { getXpToNextTier } = require('../services/settler');

const router = express.Router();

// GET /stats/me — player's own stats
router.get('/me', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;

  const player = db.prepare(`
    SELECT wins, losses, current_streak, max_streak, best_reaction_ms, total_matches, xp, tier
    FROM players WHERE wallet = ?
  `).get(wallet);

  if (!player) {
    return res.json({
      wins: 0, losses: 0, currentStreak: 0, maxStreak: 0,
      bestReaction: null, totalMatches: 0, winRate: 0,
      xp: 0, tier: 'BRONZE', xpToNext: 100, nextTier: 'SILVER', xpThreshold: 100,
    });
  }

  const winRate = player.total_matches > 0
    ? Math.round((player.wins / player.total_matches) * 100)
    : 0;

  const xpInfo = getXpToNextTier(player.xp);

  res.json({
    wins: player.wins,
    losses: player.losses,
    currentStreak: player.current_streak,
    maxStreak: player.max_streak,
    bestReaction: player.best_reaction_ms,
    totalMatches: player.total_matches,
    winRate,
    xp: player.xp,
    tier: player.tier,
    xpToNext: xpInfo.needed,
    nextTier: xpInfo.next,
    xpThreshold: xpInfo.threshold,
  });
});

// GET /stats/history — recent match history (last 20)
router.get('/history', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;

  const matches = db.prepare(`
    SELECT id, player_one, player_two, winner,
      player_one_reaction_ms, player_two_reaction_ms,
      forfeit_reason, settled_at, state
    FROM matches
    WHERE (player_one = ? OR player_two = ?)
      AND state IN ('RESOLVED', 'SETTLED', 'CANCELLED')
    ORDER BY settled_at DESC
    LIMIT 20
  `).all(wallet, wallet);

  const history = matches.map(m => {
    const isPlayerOne = m.player_one === wallet;
    return {
      id: m.id,
      opponent: isPlayerOne ? m.player_two : m.player_one,
      won: m.winner === wallet,
      cancelled: m.state === 'CANCELLED',
      myReaction: isPlayerOne ? m.player_one_reaction_ms : m.player_two_reaction_ms,
      opponentReaction: isPlayerOne ? m.player_two_reaction_ms : m.player_one_reaction_ms,
      forfeitReason: m.forfeit_reason,
      timestamp: m.settled_at,
    };
  });

  res.json({ history });
});

// GET /stats/leaderboard — top 20 players
router.get('/leaderboard', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const timeframe = req.query.timeframe || 'all';

  let leaders;
  if (timeframe === 'all') {
    leaders = db.prepare(`
      SELECT wallet, wins, losses, max_streak, best_reaction_ms, total_matches, xp, tier
      FROM players WHERE total_matches >= 1
      ORDER BY wins DESC, best_reaction_ms ASC
      LIMIT 20
    `).all();
  } else {
    let minTime;
    if (timeframe === 'today') {
      const d = new Date(); d.setHours(0, 0, 0, 0);
      minTime = d.getTime();
    } else {
      minTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
    }
    leaders = db.prepare(`
      SELECT
        p.wallet,
        COUNT(CASE WHEN m.winner = p.wallet THEN 1 END) as wins,
        COUNT(CASE WHEN m.winner != p.wallet AND m.state IN ('RESOLVED','SETTLED') THEN 1 END) as losses,
        p.max_streak, p.best_reaction_ms,
        COUNT(*) as total_matches, p.xp, p.tier
      FROM players p
      JOIN matches m ON (m.player_one = p.wallet OR m.player_two = p.wallet)
      WHERE m.state IN ('RESOLVED', 'SETTLED') AND m.settled_at >= ?
      GROUP BY p.wallet HAVING total_matches >= 1
      ORDER BY wins DESC, p.best_reaction_ms ASC
      LIMIT 20
    `).all(minTime);
  }

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
  res.json({ leaderboard, myRank: myRank >= 0 ? myRank + 1 : null });
});

// GET /stats/online — recently active players (seen in last 5 min)
router.get('/online', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const cutoff = Date.now() - 5 * 60 * 1000;

  const players = db.prepare(`
    SELECT wallet, wins, losses, xp, tier, total_matches, best_reaction_ms
    FROM players
    WHERE last_seen >= ? AND wallet != ?
    ORDER BY xp DESC
    LIMIT 20
  `).all(cutoff, wallet);

  res.json({
    players: players.map(p => ({
      wallet: p.wallet,
      wins: p.wins,
      losses: p.losses,
      xp: p.xp,
      tier: p.tier,
      totalMatches: p.total_matches,
      bestReaction: p.best_reaction_ms,
    })),
  });
});

// GET /stats/achievements — player's achievements
router.get('/achievements', (req, res) => {
  const db = req.app.locals.db;
  const achievements = db.prepare('SELECT achievement_id, unlocked_at FROM achievements WHERE wallet = ?').all(req.wallet);
  res.json({ achievements });
});

module.exports = router;
