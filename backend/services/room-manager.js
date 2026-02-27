const crypto = require('crypto');

const ROOM_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes
const CODE_LENGTH = 6;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 to avoid confusion

/**
 * Generates a 6-character alphanumeric room code.
 */
function generateRoomCode() {
  let code = '';
  const bytes = crypto.randomBytes(CODE_LENGTH);
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return code;
}

/**
 * Creates a private room for friend challenge.
 *
 * @param {object} db - SQLite database instance
 * @param {string} creatorWallet - Wallet pubkey of the room creator
 * @returns {{ roomCode: string }}
 */
function createRoom(db, creatorWallet) {
  // Check if creator already has an active room
  const existing = db.prepare(
    "SELECT code FROM rooms WHERE creator_wallet = ? AND status = 'WAITING'"
  ).get(creatorWallet);

  if (existing) {
    // Cancel old room first
    db.prepare("UPDATE rooms SET status = 'CANCELLED' WHERE code = ?").run(existing.code);
  }

  let roomCode;
  let attempts = 0;
  do {
    roomCode = generateRoomCode();
    attempts++;
    if (attempts > 10) throw new Error('Failed to generate unique room code');
  } while (db.prepare('SELECT code FROM rooms WHERE code = ? AND status = ?').get(roomCode, 'WAITING'));

  const now = Date.now();
  db.prepare(`
    INSERT INTO rooms (code, creator_wallet, status, created_at, expires_at)
    VALUES (?, ?, 'WAITING', ?, ?)
  `).run(roomCode, creatorWallet, now, now + ROOM_EXPIRY_MS);

  return { roomCode };
}

/**
 * Joins an existing room via invite code.
 *
 * @param {object} db - SQLite database instance
 * @param {string} roomCode - 6-char invite code
 * @param {string} joinerWallet - Wallet pubkey of the joiner
 * @returns {{ success: boolean, creatorWallet?: string, error?: string }}
 */
function joinRoom(db, roomCode, joinerWallet) {
  const room = db.prepare(
    "SELECT * FROM rooms WHERE code = ? AND status = 'WAITING'"
  ).get(roomCode.toUpperCase());

  if (!room) {
    return { success: false, error: 'Room not found or expired' };
  }

  if (Date.now() > room.expires_at) {
    db.prepare("UPDATE rooms SET status = 'EXPIRED' WHERE code = ?").run(roomCode);
    return { success: false, error: 'Room has expired' };
  }

  if (room.creator_wallet === joinerWallet) {
    return { success: false, error: 'Cannot join your own room' };
  }

  // Mark room as matched
  db.prepare(`
    UPDATE rooms SET joiner_wallet = ?, status = 'MATCHED'
    WHERE code = ?
  `).run(joinerWallet, roomCode);

  return { success: true, creatorWallet: room.creator_wallet };
}

/**
 * Cancels a room (creator cancels before someone joins).
 */
function cancelRoom(db, creatorWallet) {
  const result = db.prepare(`
    UPDATE rooms SET status = 'CANCELLED'
    WHERE creator_wallet = ? AND status = 'WAITING'
  `).run(creatorWallet);

  return { cancelled: result.changes > 0 };
}

/**
 * Checks room status for polling.
 */
function getRoomStatus(db, wallet) {
  // Check if player is a room creator waiting
  const createdRoom = db.prepare(
    "SELECT * FROM rooms WHERE creator_wallet = ? AND status IN ('WAITING', 'MATCHED') ORDER BY created_at DESC LIMIT 1"
  ).get(wallet);

  if (createdRoom) {
    if (createdRoom.status === 'MATCHED') {
      return { status: 'matched', matchId: createdRoom.match_id, roomCode: createdRoom.code };
    }
    if (Date.now() > createdRoom.expires_at) {
      db.prepare("UPDATE rooms SET status = 'EXPIRED' WHERE code = ?").run(createdRoom.code);
      return { status: 'expired' };
    }
    return { status: 'waiting', roomCode: createdRoom.code };
  }

  return null;
}

/**
 * Expires stale rooms.
 */
function expireRooms(db) {
  const now = Date.now();
  db.prepare(`
    UPDATE rooms SET status = 'EXPIRED'
    WHERE status = 'WAITING' AND expires_at < ?
  `).run(now);
}

module.exports = { createRoom, joinRoom, cancelRoom, getRoomStatus, expireRooms, ROOM_EXPIRY_MS };
