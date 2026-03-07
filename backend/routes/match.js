const express = require('express');
const { validateTap, resolveMatch, TAP_TIMEOUT_MS } = require('../services/arbitrator');
const { settleMatch, cancelMatch } = require('../services/settler');
const { generateDrawTime } = require('../services/draw-timer');
const { isBot } = require('../services/matchmaker');

const router = express.Router();

/**
 * If one player in the match is a bot and it's their turn to tap,
 * simulate a bot tap with a random human-like reaction time.
 */
function handleBotTap(db, match) {
  const now = Date.now();
  const botIsPlayerOne = isBot(match.player_one);
  const botIsPlayerTwo = isBot(match.player_two);

  if (!botIsPlayerOne && !botIsPlayerTwo) return; // No bot in this match

  // Only act when draw has fired
  if (match.state !== 'DRAW_FIRED') return;

  // Bot reaction: random 150–400ms after draw fired
  const botDelay = 150 + Math.floor(Math.random() * 250);
  const timeSinceDraw = now - match.draw_fired_at;

  // Wait until enough time has passed to simulate the bot's reaction
  if (timeSinceDraw < botDelay) return;

  if (botIsPlayerOne && match.player_one_tap_at === null) {
    db.prepare(`
      UPDATE matches SET player_one_tap_at = ?, player_one_reaction_ms = ?
      WHERE id = ?
    `).run(now, botDelay, match.id);
    tryResolve(db, match.id);
  }

  if (botIsPlayerTwo && match.player_two_tap_at === null) {
    db.prepare(`
      UPDATE matches SET player_two_tap_at = ?, player_two_reaction_ms = ?
      WHERE id = ?
    `).run(now, botDelay, match.id);
    tryResolve(db, match.id);
  }
}

// GET /match/:id/state — polls for match phase
router.get('/:id/state', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const matchId = req.params.id;

  // Update last_seen for disconnect detection
  db.prepare('UPDATE players SET last_seen = ? WHERE wallet = ?').run(Date.now(), wallet);

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) {
    return res.status(404).json({ error: 'Match not found' });
  }

  // Verify this player is in the match
  if (match.player_one !== wallet && match.player_two !== wallet) {
    return res.status(403).json({ error: 'You are not in this match' });
  }

  const now = Date.now();

  // State machine transitions (backend is source of truth)
  switch (match.state) {
    case 'WAITING': {
      // Transition to STANDOFF — recalculate draw time from NOW so standoff has proper duration
      const { drawTimeMs, secret, commitment } = generateDrawTime(now);
      db.prepare(`
        UPDATE matches SET state = 'STANDOFF', draw_time_ms = ?, draw_secret = ?, draw_commitment = ?
        WHERE id = ? AND state = 'WAITING'
      `).run(drawTimeMs, secret, commitment, matchId);
      const opponent = match.player_one === wallet ? match.player_two : match.player_one;
      return res.json({
        phase: 'standoff',
        opponent,
        isBot: isBot(opponent),
        serverTime: now,
      });
    }

    case 'STANDOFF': {
      const oppStandoff = match.player_one === wallet ? match.player_two : match.player_one;
      // Check if it's time to fire the draw
      if (match.draw_time_ms && now >= match.draw_time_ms) {
        const fireResult = db.prepare(
          "UPDATE matches SET state = 'DRAW_FIRED', draw_fired_at = ? WHERE id = ? AND state = 'STANDOFF'"
        ).run(now, matchId);

        if (fireResult.changes > 0) {
          return res.json({
            phase: 'draw',
            drawFiredAt: now,
            opponent: oppStandoff,
            isBot: isBot(oppStandoff),
            serverTime: now,
          });
        }
      }
      return res.json({
        phase: 'standoff',
        opponent: oppStandoff,
        isBot: isBot(oppStandoff),
        serverTime: now,
      });
    }

    case 'DRAW_FIRED': {
      // Trigger bot tap if applicable
      handleBotTap(db, match);
      // Re-read match in case bot tap resolved it
      const updated = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
      if (updated.state === 'RESOLVED' || updated.state === 'SETTLED') {
        const isW = updated.winner === wallet;
        const isP1 = updated.player_one === wallet;
        const myR = isP1 ? updated.player_one_reaction_ms : updated.player_two_reaction_ms;
        const opR = isP1 ? updated.player_two_reaction_ms : updated.player_one_reaction_ms;
        const opp = isP1 ? updated.player_two : updated.player_one;
        const ps = db.prepare('SELECT current_streak, max_streak, best_reaction_ms, wins, losses, xp, tier FROM players WHERE wallet = ?').get(wallet);
        const ra = db.prepare('SELECT achievement_id FROM achievements WHERE wallet = ? AND unlocked_at > ? ORDER BY unlocked_at DESC').all(wallet, Date.now() - 10000);
        return res.json({
          phase: 'result', winner: updated.winner, won: isW, reaction: myR, opponentReaction: opR, opponent: opp,
          isBot: isBot(opp),
          forfeitReason: updated.forfeit_reason, currentStreak: ps?.current_streak || 0, maxStreak: ps?.max_streak || 0,
          bestReaction: ps?.best_reaction_ms, wins: ps?.wins || 0, losses: ps?.losses || 0, xp: ps?.xp || 0,
          tier: ps?.tier || 'BRONZE', newAchievements: ra.map(a => a.achievement_id), serverTime: now,
        });
      }
      const oppDraw = match.player_one === wallet ? match.player_two : match.player_one;
      return res.json({
        phase: 'draw',
        drawFiredAt: match.draw_fired_at,
        opponent: oppDraw,
        isBot: isBot(oppDraw),
        serverTime: now,
      });
    }

    case 'RESOLVED':
    case 'SETTLED': {
      const isWinner = match.winner === wallet;
      const isPlayerOne = match.player_one === wallet;
      const myReaction = isPlayerOne ? match.player_one_reaction_ms : match.player_two_reaction_ms;
      const opponentReaction = isPlayerOne ? match.player_two_reaction_ms : match.player_one_reaction_ms;
      const opponent = isPlayerOne ? match.player_two : match.player_one;

      // Include player stats for result display
      const playerStats = db.prepare(
        'SELECT current_streak, max_streak, best_reaction_ms, wins, losses, xp, tier FROM players WHERE wallet = ?'
      ).get(wallet);

      // Check for newly unlocked achievements
      const recentAchievements = db.prepare(
        'SELECT achievement_id FROM achievements WHERE wallet = ? AND unlocked_at > ? ORDER BY unlocked_at DESC'
      ).all(wallet, Date.now() - 10000);

      return res.json({
        phase: 'result',
        winner: match.winner,
        won: isWinner,
        reaction: myReaction,
        opponentReaction,
        opponent,
        isBot: isBot(opponent),
        forfeitReason: match.forfeit_reason,
        currentStreak: playerStats?.current_streak || 0,
        maxStreak: playerStats?.max_streak || 0,
        bestReaction: playerStats?.best_reaction_ms,
        wins: playerStats?.wins || 0,
        losses: playerStats?.losses || 0,
        xp: playerStats?.xp || 0,
        tier: playerStats?.tier || 'BRONZE',
        newAchievements: recentAchievements.map(a => a.achievement_id),
        drawSecret: match.draw_secret,
        drawTime: match.draw_time_ms,
        commitment: match.draw_commitment,
        serverTime: now,
      });
    }

    case 'CANCELLED':
      return res.json({
        phase: 'cancelled',
        reason: match.forfeit_reason || 'cancelled',
        serverTime: now,
      });

    default:
      return res.json({ phase: match.state, serverTime: now });
  }
});

// POST /match/:id/tap — submit tap
router.post('/:id/tap', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const matchId = req.params.id;
  const { tapTimestamp, clientDrawReceived, reactionMs, early } = req.body;

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) {
    return res.status(404).json({ error: 'Match not found' });
  }

  if (match.player_one !== wallet && match.player_two !== wallet) {
    return res.status(403).json({ error: 'You are not in this match' });
  }

  const isPlayerOne = match.player_one === wallet;
  const now = Date.now();

  // Prevent duplicate taps
  if (isPlayerOne && match.player_one_tap_at !== null) {
    return res.json({ received: true, duplicate: true });
  }
  if (!isPlayerOne && match.player_two_tap_at !== null) {
    return res.json({ received: true, duplicate: true });
  }

  // Early tap (before draw fired)
  if (early || match.state === 'STANDOFF' || match.state === 'WAITING') {
    if (isPlayerOne) {
      db.prepare(`
        UPDATE matches SET player_one_tap_at = ?, player_one_reaction_ms = -1, player_one_early = 1
        WHERE id = ?
      `).run(now, matchId);
    } else {
      db.prepare(`
        UPDATE matches SET player_two_tap_at = ?, player_two_reaction_ms = -1, player_two_early = 1
        WHERE id = ?
      `).run(now, matchId);
    }

    // Check if we can resolve immediately
    tryResolve(db, matchId);
    return res.json({ received: true, early: true });
  }

  // Normal tap after draw
  if (match.state !== 'DRAW_FIRED') {
    return res.status(400).json({ error: `Cannot tap in state: ${match.state}` });
  }

  // Validate tap
  const player = db.prepare('SELECT avg_rtt_ms FROM players WHERE wallet = ?').get(wallet);
  const tap = {
    tapTimestamp,
    clientDrawReceived,
    reactionMs,
    early: false,
    serverReceivedAt: now,
  };

  const validation = validateTap(tap, match.draw_fired_at, player?.avg_rtt_ms || 100);
  if (!validation.valid) {
    // Still record the tap but flag it
    console.warn(`Suspicious tap from ${wallet} in match ${matchId}: ${validation.reason}`);
  }

  // Record tap
  if (isPlayerOne) {
    db.prepare(`
      UPDATE matches SET player_one_tap_at = ?, player_one_reaction_ms = ?
      WHERE id = ?
    `).run(now, reactionMs, matchId);
  } else {
    db.prepare(`
      UPDATE matches SET player_two_tap_at = ?, player_two_reaction_ms = ?
      WHERE id = ?
    `).run(now, reactionMs, matchId);
  }

  // Try to resolve the match
  tryResolve(db, matchId);

  res.json({ received: true });
});

// POST /match/:id/ready — player signals they are ready (phone still)
router.post('/:id/ready', (req, res) => {
  const db = req.app.locals.db;
  const matchId = req.params.id;

  // Update last_seen
  db.prepare('UPDATE players SET last_seen = ? WHERE wallet = ?').run(Date.now(), req.wallet);

  res.json({ ready: true });
});

/**
 * Tries to resolve a match if both players have tapped (or timed out).
 */
function tryResolve(db, matchId) {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match || match.state === 'RESOLVED' || match.state === 'SETTLED' || match.state === 'CANCELLED') {
    return;
  }

  const tapOne = match.player_one_tap_at !== null ? {
    reactionMs: match.player_one_reaction_ms,
    early: match.player_one_early === 1,
  } : null;

  const tapTwo = match.player_two_tap_at !== null ? {
    reactionMs: match.player_two_reaction_ms,
    early: match.player_two_early === 1,
  } : null;

  // Both tapped, or one tapped early — resolve now
  if (tapOne && tapTwo) {
    doResolve(db, match, tapOne, tapTwo);
  } else if ((tapOne && tapOne.early) || (tapTwo && tapTwo.early)) {
    // One tapped early — resolve immediately
    doResolve(db, match, tapOne, tapTwo);
  }
  // Otherwise wait for the other player (or timeout via cleanup job)
}

function doResolve(db, match, tapOne, tapTwo) {
  const result = resolveMatch(tapOne, tapTwo);
  const now = Date.now();

  if (result.winner === 'cancel' || result.winner === 'rematch') {
    db.prepare(`
      UPDATE matches SET state = 'CANCELLED', forfeit_reason = ?, settled_at = ?
      WHERE id = ? AND state NOT IN ('RESOLVED', 'SETTLED', 'CANCELLED')
    `).run(result.reason, now, match.id);

    cancelMatch(db, match.id).catch(() => {});
    return;
  }

  const winnerWallet = result.winner === 'player_one' ? match.player_one : match.player_two;

  const updateResult = db.prepare(`
    UPDATE matches SET state = 'RESOLVED', winner = ?, forfeit_reason = ?, settled_at = ?
    WHERE id = ? AND state NOT IN ('RESOLVED', 'SETTLED', 'CANCELLED')
  `).run(winnerWallet, result.reason, now, match.id);

  if (updateResult.changes > 0) {
    // Settle on-chain (async)
    settleMatch(db, match.id, winnerWallet).catch((err) => {
      console.error(`On-chain settlement failed for match ${match.id}:`, err.message);
    });
  }
}

module.exports = router;
