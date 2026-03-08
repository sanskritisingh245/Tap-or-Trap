const express = require('express');
const { eq, and, or, notInArray, desc } = require('drizzle-orm');
const { matches, players, queue } = require('../db/schema');
const { createRoom, joinRoom, cancelRoom, getRoomStatus } = require('../services/room-manager');
const { pairFromRoom, generateBotWallet, ensureBotPlayer, createMatch, deductForMatch, isBot } = require('../services/matchmaker');

const router = express.Router();

// ─── Random Matchmaking ────────────────────────────────────────────

// POST /matchmaking/join — adds player to random queue
router.post('/join', async (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;

  // Check if already in queue
  const [existing] = await db.select({ wallet: queue.wallet }).from(queue).where(eq(queue.wallet, wallet));
  if (existing) {
    return res.json({ status: 'queued' });
  }

  // Check if already in an active match
  const [activeMatch] = await db.select({ id: matches.id }).from(matches).where(
    and(
      or(eq(matches.playerOne, wallet), eq(matches.playerTwo, wallet)),
      notInArray(matches.state, ['RESOLVED', 'SETTLED', 'CANCELLED'])
    )
  );
  if (activeMatch) {
    return res.json({ status: 'matched', matchId: activeMatch.id });
  }

  await db.insert(queue).values({ wallet, joinedAt: Date.now() }).onConflictDoNothing();
  res.json({ status: 'queued' });
});

// GET /matchmaking/status — polls for match assignment
router.get('/status', async (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;

  // Update last_seen for disconnect detection
  await db.update(players).set({ lastSeen: Date.now() }).where(eq(players.wallet, wallet));

  // Check if matched (in an active match)
  const [match] = await db.select({
    id: matches.id,
    playerOne: matches.playerOne,
    playerTwo: matches.playerTwo,
    drawCommitment: matches.drawCommitment,
  }).from(matches).where(
    and(
      or(eq(matches.playerOne, wallet), eq(matches.playerTwo, wallet)),
      notInArray(matches.state, ['RESOLVED', 'SETTLED', 'CANCELLED'])
    )
  ).orderBy(desc(matches.createdAt)).limit(1);

  if (match) {
    const opponent = match.playerOne === wallet ? match.playerTwo : match.playerOne;
    return res.json({
      status: 'matched',
      matchId: match.id,
      opponent,
      isBot: isBot(opponent),
      commitment: match.drawCommitment,
    });
  }

  // Check room status (if player created a room)
  const roomStatus = await getRoomStatus(db, wallet);
  if (roomStatus) {
    if (roomStatus.status === 'matched') {
      return res.json({
        status: 'matched',
        matchId: roomStatus.matchId,
      });
    }
    return res.json({
      status: 'waiting_room',
      roomCode: roomStatus.roomCode,
    });
  }

  // Check if still in queue
  const [inQueue] = await db.select().from(queue).where(eq(queue.wallet, wallet));
  if (inQueue) {
    const waitTimeMs = Date.now() - inQueue.joinedAt;
    return res.json({ status: 'queued', waitTimeMs });
  }

  res.json({ status: 'idle' });
});

// POST /matchmaking/join-bot — instantly match against a bot
router.post('/join-bot', async (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;

  // Remove from queue if present
  await db.delete(queue).where(eq(queue.wallet, wallet));

  // Check if already in an active match
  const [activeMatch] = await db.select({ id: matches.id }).from(matches).where(
    and(
      or(eq(matches.playerOne, wallet), eq(matches.playerTwo, wallet)),
      notInArray(matches.state, ['RESOLVED', 'SETTLED', 'CANCELLED'])
    )
  );
  if (activeMatch) {
    return res.json({ status: 'matched', matchId: activeMatch.id });
  }

  const botWallet = generateBotWallet();
  await ensureBotPlayer(db, botWallet);

  const match = await createMatch(db, wallet, botWallet);
  await deductForMatch(db, wallet, botWallet, match);

  console.log(`[BOT] ${wallet.slice(0, 8)}... requested bot match → ${botWallet.slice(0, 12)}...`);
  res.json({ status: 'matched', matchId: match.id, opponent: botWallet });
});

// POST /matchmaking/leave — removes player from queue
router.post('/leave', async (req, res) => {
  const db = req.app.locals.db;
  await db.delete(queue).where(eq(queue.wallet, req.wallet));
  res.json({ status: 'left' });
});


// ─── Friend Challenge (Invite Code) ────────────────────────────────

// POST /matchmaking/create-room — creates a private room
router.post('/create-room', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { roomCode } = await createRoom(db, req.wallet);
    res.json({ roomCode, status: 'waiting' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /matchmaking/join-room — joins via invite code
router.post('/join-room', async (req, res) => {
  const db = req.app.locals.db;
  const { roomCode } = req.body;

  if (!roomCode || typeof roomCode !== 'string') {
    return res.status(400).json({ error: 'Missing roomCode' });
  }

  const result = await joinRoom(db, roomCode, req.wallet);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  // Pair the two players
  const match = await pairFromRoom(db, result.creatorWallet, req.wallet, roomCode.toUpperCase());

  res.json({
    status: 'matched',
    matchId: match.id,
    opponent: result.creatorWallet,
  });
});

// POST /matchmaking/cancel-room — cancel a waiting room
router.post('/cancel-room', async (req, res) => {
  const db = req.app.locals.db;
  const { cancelled } = await cancelRoom(db, req.wallet);

  if (cancelled) {
    res.json({ status: 'cancelled' });
  } else {
    res.status(400).json({ error: 'No active room to cancel' });
  }
});

module.exports = router;
