const crypto = require('crypto');
const { eq, and, lt, or, desc } = require('drizzle-orm');
const { rooms } = require('../db/schema');

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
 * @param {object} db - Drizzle database instance
 * @param {string} creatorWallet - Wallet pubkey of the room creator
 * @returns {{ roomCode: string }}
 */
async function createRoom(db, creatorWallet) {
  // Check if creator already has an active room
  const [existing] = await db.select({ code: rooms.code }).from(rooms).where(
    and(eq(rooms.creatorWallet, creatorWallet), eq(rooms.status, 'WAITING'))
  );

  if (existing) {
    // Cancel old room first
    await db.update(rooms).set({ status: 'CANCELLED' }).where(eq(rooms.code, existing.code));
  }

  let roomCode;
  let attempts = 0;
  do {
    roomCode = generateRoomCode();
    attempts++;
    if (attempts > 10) throw new Error('Failed to generate unique room code');
    const [dup] = await db.select({ code: rooms.code }).from(rooms).where(
      and(eq(rooms.code, roomCode), eq(rooms.status, 'WAITING'))
    );
    if (!dup) break;
  } while (true);

  const now = Date.now();
  await db.insert(rooms).values({
    code: roomCode,
    creatorWallet: creatorWallet,
    status: 'WAITING',
    createdAt: now,
    expiresAt: now + ROOM_EXPIRY_MS,
  });

  return { roomCode };
}

/**
 * Joins an existing room via invite code.
 *
 * @param {object} db - Drizzle database instance
 * @param {string} roomCode - 6-char invite code
 * @param {string} joinerWallet - Wallet pubkey of the joiner
 * @returns {{ success: boolean, creatorWallet?: string, error?: string }}
 */
async function joinRoom(db, roomCode, joinerWallet) {
  const [room] = await db.select().from(rooms).where(
    and(eq(rooms.code, roomCode.toUpperCase()), eq(rooms.status, 'WAITING'))
  );

  if (!room) {
    return { success: false, error: 'Room not found or expired' };
  }

  if (Date.now() > room.expiresAt) {
    await db.update(rooms).set({ status: 'EXPIRED' }).where(eq(rooms.code, roomCode));
    return { success: false, error: 'Room has expired' };
  }

  if (room.creatorWallet === joinerWallet) {
    return { success: false, error: 'Cannot join your own room' };
  }

  // Mark room as matched
  await db.update(rooms).set({ joinerWallet: joinerWallet, status: 'MATCHED' }).where(eq(rooms.code, roomCode));

  return { success: true, creatorWallet: room.creatorWallet };
}

/**
 * Cancels a room (creator cancels before someone joins).
 */
async function cancelRoom(db, creatorWallet) {
  const result = await db.update(rooms).set({ status: 'CANCELLED' }).where(
    and(eq(rooms.creatorWallet, creatorWallet), eq(rooms.status, 'WAITING'))
  ).returning({ code: rooms.code });

  return { cancelled: result.length > 0 };
}

/**
 * Checks room status for polling.
 */
async function getRoomStatus(db, wallet) {
  // Check if player is a room creator waiting
  const [createdRoom] = await db.select().from(rooms).where(
    and(
      eq(rooms.creatorWallet, wallet),
      or(eq(rooms.status, 'WAITING'), eq(rooms.status, 'MATCHED'))
    )
  ).orderBy(desc(rooms.createdAt)).limit(1);

  if (createdRoom) {
    if (createdRoom.status === 'MATCHED') {
      return { status: 'matched', matchId: createdRoom.matchId, roomCode: createdRoom.code };
    }
    if (Date.now() > createdRoom.expiresAt) {
      await db.update(rooms).set({ status: 'EXPIRED' }).where(eq(rooms.code, createdRoom.code));
      return { status: 'expired' };
    }
    return { status: 'waiting', roomCode: createdRoom.code };
  }

  return null;
}

/**
 * Expires stale rooms.
 */
async function expireRooms(db) {
  const now = Date.now();
  await db.update(rooms).set({ status: 'EXPIRED' }).where(
    and(eq(rooms.status, 'WAITING'), lt(rooms.expiresAt, now))
  );
}

module.exports = { createRoom, joinRoom, cancelRoom, getRoomStatus, expireRooms, ROOM_EXPIRY_MS };
