const express = require('express');
const { createRoom, joinRoom, cancelRoom, getRoomStatus } = require('../services/room-manager');
const { pairFromRoom, generateBotWallet, ensureBotPlayer, createMatch, deductForMatch, isBot } = require('../services/matchmaker');

const router = express.Router();

// ─── Random Matchmaking ────────────────────────────────────────────

// POST /matchmaking/join — adds player to random queue
router.post('/join', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;

  // Check if already in queue
  const existing = db.prepare('SELECT wallet FROM queue WHERE wallet = ?').get(wallet);
  if (existing) {
    return res.json({ status: 'queued' });
  }

  // Check if already in an active match
  const activeMatch = db.prepare(
    "SELECT id FROM matches WHERE (player_one = ? OR player_two = ?) AND state NOT IN ('RESOLVED', 'SETTLED', 'CANCELLED')"
  ).get(wallet, wallet);
  if (activeMatch) {
    return res.json({ status: 'matched', matchId: activeMatch.id });
  }

  db.prepare('INSERT OR IGNORE INTO queue (wallet, joined_at) VALUES (?, ?)').run(wallet, Date.now());
  res.json({ status: 'queued' });
});

// GET /matchmaking/status — polls for match assignment
router.get('/status', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;

  // Update last_seen for disconnect detection
  db.prepare('UPDATE players SET last_seen = ? WHERE wallet = ?').run(Date.now(), wallet);

  // Check if matched (in an active match)
  const match = db.prepare(
    "SELECT id, player_one, player_two, draw_commitment FROM matches WHERE (player_one = ? OR player_two = ?) AND state NOT IN ('RESOLVED', 'SETTLED', 'CANCELLED') ORDER BY created_at DESC LIMIT 1"
  ).get(wallet, wallet);

  if (match) {
    const opponent = match.player_one === wallet ? match.player_two : match.player_one;
    return res.json({
      status: 'matched',
      matchId: match.id,
      opponent,
      isBot: isBot(opponent),
      commitment: match.draw_commitment,
    });
  }

  // Check room status (if player created a room)
  const roomStatus = getRoomStatus(db, wallet);
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
  const inQueue = db.prepare('SELECT wallet, joined_at FROM queue WHERE wallet = ?').get(wallet);
  if (inQueue) {
    const waitTimeMs = Date.now() - inQueue.joined_at;
    return res.json({ status: 'queued', waitTimeMs });
  }

  res.json({ status: 'idle' });
});

// POST /matchmaking/leave — removes player from queue
router.post('/leave', (req, res) => {
  const db = req.app.locals.db;
  db.prepare('DELETE FROM queue WHERE wallet = ?').run(req.wallet);
  res.json({ status: 'left' });
});

// ─── Play vs Bot ──────────────────────────────────────────────────

// POST /matchmaking/join-bot — instantly pairs player with a bot
router.post('/join-bot', (req, res) => {
  const db = req.app.locals.db;
  const wallet = req.wallet;

  // Check if already in an active match
  const activeMatch = db.prepare(
    "SELECT id FROM matches WHERE (player_one = ? OR player_two = ?) AND state NOT IN ('RESOLVED', 'SETTLED', 'CANCELLED')"
  ).get(wallet, wallet);
  if (activeMatch) {
    return res.json({ status: 'matched', matchId: activeMatch.id });
  }

  // Remove from random queue if present
  db.prepare('DELETE FROM queue WHERE wallet = ?').run(wallet);

  const botWallet = generateBotWallet();
  ensureBotPlayer(db, botWallet);

  const match = createMatch(db, wallet, botWallet);
  deductForMatch(db, wallet, botWallet, match);

  console.log(`[BOT] Player ${wallet.slice(0, 8)}... chose to play vs bot ${botWallet.slice(0, 12)}...`);
  res.json({ status: 'matched', matchId: match.id, opponent: botWallet, isBot: true });
});

// ─── Friend Challenge (Invite Code) ────────────────────────────────

// POST /matchmaking/create-room — creates a private room
router.post('/create-room', (req, res) => {
  const db = req.app.locals.db;
  try {
    const { roomCode } = createRoom(db, req.wallet);
    res.json({ roomCode, status: 'waiting' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /matchmaking/join-room — joins via invite code
router.post('/join-room', (req, res) => {
  const db = req.app.locals.db;
  const { roomCode } = req.body;

  if (!roomCode || typeof roomCode !== 'string') {
    return res.status(400).json({ error: 'Missing roomCode' });
  }

  const result = joinRoom(db, roomCode, req.wallet);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  // Pair the two players
  const match = pairFromRoom(db, result.creatorWallet, req.wallet, roomCode.toUpperCase());

  res.json({
    status: 'matched',
    matchId: match.id,
    opponent: result.creatorWallet,
  });
});

// POST /matchmaking/cancel-room — cancel a waiting room
router.post('/cancel-room', (req, res) => {
  const db = req.app.locals.db;
  const { cancelled } = cancelRoom(db, req.wallet);

  if (cancelled) {
    res.json({ status: 'cancelled' });
  } else {
    res.status(400).json({ error: 'No active room to cancel' });
  }
});

module.exports = router;
