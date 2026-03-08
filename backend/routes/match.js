const express = require('express');
const { eq, and, notInArray, gt, desc } = require('drizzle-orm');
const { matches, players, achievements } = require('../db/schema');
const { validateTap, resolveMatch, TAP_TIMEOUT_MS } = require('../services/arbitrator');
const { settleMatch, cancelMatch } = require('../services/settler');
const { generateDrawTime } = require('../services/draw-timer');
const { isBot } = require('../services/matchmaker');

const router = express.Router();

/**
 * If one player in the match is a bot and it's their turn to tap,
 * simulate a bot tap with a random human-like reaction time.
 */
async function handleBotTap(db, match) {
  const now = Date.now();
  const botIsPlayerOne = isBot(match.playerOne);
  const botIsPlayerTwo = isBot(match.playerTwo);

  if (!botIsPlayerOne && !botIsPlayerTwo) return; // No bot in this match

  // Only act when draw has fired
  if (match.state !== 'DRAW_FIRED') return;

  // Bot reaction: random 150–400ms after draw fired
  const botDelay = 150 + Math.floor(Math.random() * 250);
  const timeSinceDraw = now - match.drawFiredAt;

  // Wait until enough time has passed to simulate the bot's reaction
  if (timeSinceDraw < botDelay) return;

  if (botIsPlayerOne && match.playerOneTapAt === null) {
    await db.update(matches).set({
      playerOneTapAt: now,
      playerOneReactionMs: botDelay,
    }).where(eq(matches.id, match.id));
    await tryResolve(db, match.id);
  }

  if (botIsPlayerTwo && match.playerTwoTapAt === null) {
    await db.update(matches).set({
      playerTwoTapAt: now,
      playerTwoReactionMs: botDelay,
    }).where(eq(matches.id, match.id));
    await tryResolve(db, match.id);
  }
}

// GET /match/:id/state — polls for match phase
router.get('/:id/state', async (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const matchId = req.params.id;

  // Update last_seen for disconnect detection
  await db.update(players).set({ lastSeen: Date.now() }).where(eq(players.wallet, wallet));

  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match) {
    return res.status(404).json({ error: 'Match not found' });
  }

  // Verify this player is in the match
  if (match.playerOne !== wallet && match.playerTwo !== wallet) {
    return res.status(403).json({ error: 'You are not in this match' });
  }

  const now = Date.now();

  // State machine transitions (backend is source of truth)
  switch (match.state) {
    case 'WAITING': {
      // Transition to STANDOFF — recalculate draw time from NOW so standoff has proper duration
      const { drawTimeMs, secret, commitment } = generateDrawTime(now);
      await db.update(matches).set({
        state: 'STANDOFF',
        drawTimeMs,
        drawSecret: secret,
        drawCommitment: commitment,
      }).where(and(eq(matches.id, matchId), eq(matches.state, 'WAITING')));
      const opponent = match.playerOne === wallet ? match.playerTwo : match.playerOne;
      return res.json({
        phase: 'standoff',
        opponent,
        isBot: isBot(opponent),
        serverTime: now,
      });
    }

    case 'STANDOFF': {
      const oppStandoff = match.playerOne === wallet ? match.playerTwo : match.playerOne;
      // Check if it's time to fire the draw
      if (match.drawTimeMs && now >= match.drawTimeMs) {
        const fireResult = await db.update(matches).set({
          state: 'DRAW_FIRED',
          drawFiredAt: now,
        }).where(and(eq(matches.id, matchId), eq(matches.state, 'STANDOFF')))
          .returning({ id: matches.id });

        if (fireResult.length > 0) {
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
      await handleBotTap(db, match);
      // Re-read match in case bot tap resolved it
      const [updated] = await db.select().from(matches).where(eq(matches.id, matchId));
      if (updated.state === 'RESOLVED' || updated.state === 'SETTLED') {
        const isW = updated.winner === wallet;
        const isP1 = updated.playerOne === wallet;
        const myR = isP1 ? updated.playerOneReactionMs : updated.playerTwoReactionMs;
        const opR = isP1 ? updated.playerTwoReactionMs : updated.playerOneReactionMs;
        const opp = isP1 ? updated.playerTwo : updated.playerOne;
        const [ps] = await db.select({
          currentStreak: players.currentStreak,
          maxStreak: players.maxStreak,
          bestReactionMs: players.bestReactionMs,
          wins: players.wins,
          losses: players.losses,
          xp: players.xp,
          tier: players.tier,
        }).from(players).where(eq(players.wallet, wallet));
        const ra = await db.select({ achievementId: achievements.achievementId })
          .from(achievements)
          .where(and(eq(achievements.wallet, wallet), gt(achievements.unlockedAt, Date.now() - 10000)))
          .orderBy(desc(achievements.unlockedAt));
        return res.json({
          phase: 'result', winner: updated.winner, won: isW, reaction: myR, opponentReaction: opR, opponent: opp,
          isBot: isBot(opp),
          forfeitReason: updated.forfeitReason, currentStreak: ps?.currentStreak || 0, maxStreak: ps?.maxStreak || 0,
          bestReaction: ps?.bestReactionMs, wins: ps?.wins || 0, losses: ps?.losses || 0, xp: ps?.xp || 0,
          tier: ps?.tier || 'BRONZE', newAchievements: ra.map(a => a.achievementId), serverTime: now,
        });
      }
      const oppDraw = match.playerOne === wallet ? match.playerTwo : match.playerOne;
      return res.json({
        phase: 'draw',
        drawFiredAt: match.drawFiredAt,
        opponent: oppDraw,
        isBot: isBot(oppDraw),
        serverTime: now,
      });
    }

    case 'RESOLVED':
    case 'SETTLED': {
      const isWinner = match.winner === wallet;
      const isPlayerOne = match.playerOne === wallet;
      const myReaction = isPlayerOne ? match.playerOneReactionMs : match.playerTwoReactionMs;
      const opponentReaction = isPlayerOne ? match.playerTwoReactionMs : match.playerOneReactionMs;
      const opponent = isPlayerOne ? match.playerTwo : match.playerOne;

      // Include player stats for result display
      const [playerStats] = await db.select({
        currentStreak: players.currentStreak,
        maxStreak: players.maxStreak,
        bestReactionMs: players.bestReactionMs,
        wins: players.wins,
        losses: players.losses,
        xp: players.xp,
        tier: players.tier,
      }).from(players).where(eq(players.wallet, wallet));

      // Check for newly unlocked achievements
      const recentAchievements = await db.select({ achievementId: achievements.achievementId })
        .from(achievements)
        .where(and(eq(achievements.wallet, wallet), gt(achievements.unlockedAt, Date.now() - 10000)))
        .orderBy(desc(achievements.unlockedAt));

      return res.json({
        phase: 'result',
        winner: match.winner,
        won: isWinner,
        reaction: myReaction,
        opponentReaction,
        opponent,
        isBot: isBot(opponent),
        forfeitReason: match.forfeitReason,
        currentStreak: playerStats?.currentStreak || 0,
        maxStreak: playerStats?.maxStreak || 0,
        bestReaction: playerStats?.bestReactionMs,
        wins: playerStats?.wins || 0,
        losses: playerStats?.losses || 0,
        xp: playerStats?.xp || 0,
        tier: playerStats?.tier || 'BRONZE',
        newAchievements: recentAchievements.map(a => a.achievementId),
        drawSecret: match.drawSecret,
        drawTime: match.drawTimeMs,
        commitment: match.drawCommitment,
        serverTime: now,
      });
    }

    case 'CANCELLED':
      return res.json({
        phase: 'cancelled',
        reason: match.forfeitReason || 'cancelled',
        serverTime: now,
      });

    default:
      return res.json({ phase: match.state, serverTime: now });
  }
});

// POST /match/:id/tap — submit tap
router.post('/:id/tap', async (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;
  const matchId = req.params.id;
  const { tapTimestamp, clientDrawReceived, reactionMs, early } = req.body;

  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match) {
    return res.status(404).json({ error: 'Match not found' });
  }

  if (match.playerOne !== wallet && match.playerTwo !== wallet) {
    return res.status(403).json({ error: 'You are not in this match' });
  }

  const isPlayerOne = match.playerOne === wallet;
  const now = Date.now();

  // Prevent duplicate taps
  if (isPlayerOne && match.playerOneTapAt !== null) {
    return res.json({ received: true, duplicate: true });
  }
  if (!isPlayerOne && match.playerTwoTapAt !== null) {
    return res.json({ received: true, duplicate: true });
  }

  // Early tap (before draw fired)
  if (early || match.state === 'STANDOFF' || match.state === 'WAITING') {
    if (isPlayerOne) {
      await db.update(matches).set({
        playerOneTapAt: now,
        playerOneReactionMs: -1,
        playerOneEarly: 1,
      }).where(eq(matches.id, matchId));
    } else {
      await db.update(matches).set({
        playerTwoTapAt: now,
        playerTwoReactionMs: -1,
        playerTwoEarly: 1,
      }).where(eq(matches.id, matchId));
    }

    // Check if we can resolve immediately
    await tryResolve(db, matchId);
    return res.json({ received: true, early: true });
  }

  // Normal tap after draw
  if (match.state !== 'DRAW_FIRED') {
    return res.status(400).json({ error: `Cannot tap in state: ${match.state}` });
  }

  // Validate tap
  const [player] = await db.select({ avgRttMs: players.avgRttMs }).from(players).where(eq(players.wallet, wallet));
  const tap = {
    tapTimestamp,
    clientDrawReceived,
    reactionMs,
    early: false,
    serverReceivedAt: now,
  };

  const validation = validateTap(tap, match.drawFiredAt, player?.avgRttMs || 100);
  if (!validation.valid) {
    // Still record the tap but flag it
    console.warn(`Suspicious tap from ${wallet} in match ${matchId}: ${validation.reason}`);
  }

  // Record tap
  if (isPlayerOne) {
    await db.update(matches).set({
      playerOneTapAt: now,
      playerOneReactionMs: reactionMs,
    }).where(eq(matches.id, matchId));
  } else {
    await db.update(matches).set({
      playerTwoTapAt: now,
      playerTwoReactionMs: reactionMs,
    }).where(eq(matches.id, matchId));
  }

  // Try to resolve the match
  await tryResolve(db, matchId);

  res.json({ received: true });
});

// POST /match/:id/ready — player signals they are ready (phone still)
router.post('/:id/ready', async (req, res) => {
  const db = req.app.locals.db;

  // Update last_seen
  await db.update(players).set({ lastSeen: Date.now() }).where(eq(players.wallet, req.wallet));

  res.json({ ready: true });
});

/**
 * Tries to resolve a match if both players have tapped (or timed out).
 */
async function tryResolve(db, matchId) {
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match || match.state === 'RESOLVED' || match.state === 'SETTLED' || match.state === 'CANCELLED') {
    return;
  }

  const tapOne = match.playerOneTapAt !== null ? {
    reactionMs: match.playerOneReactionMs,
    early: match.playerOneEarly === 1,
  } : null;

  const tapTwo = match.playerTwoTapAt !== null ? {
    reactionMs: match.playerTwoReactionMs,
    early: match.playerTwoEarly === 1,
  } : null;

  // Both tapped, or one tapped early — resolve now
  if (tapOne && tapTwo) {
    await doResolve(db, match, tapOne, tapTwo);
  } else if ((tapOne && tapOne.early) || (tapTwo && tapTwo.early)) {
    // One tapped early — resolve immediately
    await doResolve(db, match, tapOne, tapTwo);
  }
  // Otherwise wait for the other player (or timeout via cleanup job)
}

async function doResolve(db, match, tapOne, tapTwo) {
  const result = resolveMatch(tapOne, tapTwo);
  const now = Date.now();

  if (result.winner === 'cancel' || result.winner === 'rematch') {
    await db.update(matches).set({
      state: 'CANCELLED',
      forfeitReason: result.reason,
      settledAt: now,
    }).where(and(eq(matches.id, match.id), notInArray(matches.state, ['RESOLVED', 'SETTLED', 'CANCELLED'])));

    cancelMatch(db, match.id).catch(() => {});
    return;
  }

  const winnerWallet = result.winner === 'player_one' ? match.playerOne : match.playerTwo;

  const updateResult = await db.update(matches).set({
    state: 'RESOLVED',
    winner: winnerWallet,
    forfeitReason: result.reason,
    settledAt: now,
  }).where(and(eq(matches.id, match.id), notInArray(matches.state, ['RESOLVED', 'SETTLED', 'CANCELLED'])))
    .returning({ id: matches.id });

  if (updateResult.length > 0) {
    // Settle on-chain (async)
    settleMatch(db, match.id, winnerWallet).catch((err) => {
      console.error(`On-chain settlement failed for match ${match.id}:`, err.message);
    });
  }
}

module.exports = router;
