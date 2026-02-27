const express = require('express');
const router = express.Router();

// GET /stats/me — player's own stats
router.get('/me', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;

  const player = db.prepare(`
    SELECT wins, losses, current_streak, max_streak, best_reaction_ms, total_matches
    FROM players WHERE wallet = ?
  `).get(wallet);

  if (!player) {
    return res.json({
      wins: 0, losses: 0, currentStreak: 0, maxStreak: 0,
      bestReaction: null, totalMatches: 0, winRate: 0,
    });
  }

  const winRate = player.total_matches > 0
    ? Math.round((player.wins / player.total_matches) * 100)
    : 0;

  res.json({
    wins: player.wins,
    losses: player.losses,
    currentStreak: player.current_streak,
    maxStreak: player.max_streak,
    bestReaction: player.best_reaction_ms,
    totalMatches: player.total_matches,
    winRate,
  });
});

// GET /stats/history — recent match history (last 20)
router.get('/history', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;

  const matches = db.prepare(`
    SELECT
      id,
      player_one,
      player_two,
      winner,
      player_one_reaction_ms,
      player_two_reaction_ms,
      forfeit_reason,
      settled_at,
      state
    FROM matches
    WHERE (player_one = ? OR player_two = ?)
      AND state IN ('RESOLVED', 'SETTLED', 'CANCELLED')
    ORDER BY settled_at DESC
    LIMIT 20
  `).all(wallet, wallet);

  const history = matches.map(m => {
    const isPlayerOne = m.player_one === wallet;
    const opponent = isPlayerOne ? m.player_two : m.player_one;
    const myReaction = isPlayerOne ? m.player_one_reaction_ms : m.player_two_reaction_ms;
    const opponentReaction = isPlayerOne ? m.player_two_reaction_ms : m.player_one_reaction_ms;
    const won = m.winner === wallet;
    const cancelled = m.state === 'CANCELLED';

    return {
      id: m.id,
      opponent,
      won,
      cancelled,
      myReaction,
      opponentReaction,
      forfeitReason: m.forfeit_reason,
      timestamp: m.settled_at,
    };
  });

  res.json({ history });
});

// GET /stats/leaderboard — top 10 players by wins
router.get('/leaderboard', (req, res) => {
  const db = req.app.locals.db;

  const leaders = db.prepare(`
    SELECT wallet, wins, losses, max_streak, best_reaction_ms, total_matches
    FROM players
    WHERE total_matches >= 3
    ORDER BY wins DESC, best_reaction_ms ASC
    LIMIT 10
  `).all();

  const leaderboard = leaders.map((p, i) => ({
    rank: i + 1,
    wallet: p.wallet,
    wins: p.wins,
    losses: p.losses,
    maxStreak: p.max_streak,
    bestReaction: p.best_reaction_ms,
    totalMatches: p.total_matches,
    winRate: p.total_matches > 0 ? Math.round((p.wins / p.total_matches) * 100) : 0,
  }));

  res.json({ leaderboard });
});

module.exports = router;
