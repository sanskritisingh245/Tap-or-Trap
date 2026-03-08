const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { eq, and, sql, asc, inArray } = require('drizzle-orm');
const { matches, players, queue, rooms } = require('../db/schema');
const { generateDrawTime } = require('./draw-timer');

// Bot wallet prefix — any wallet starting with this is a bot
const BOT_WALLET_PREFIX = 'BOT_';

/**
 * Checks if a wallet belongs to a bot.
 */
function isBot(wallet) {
  return wallet && wallet.startsWith(BOT_WALLET_PREFIX);
}

/**
 * Generates a unique bot wallet address.
 */
function generateBotWallet() {
  return BOT_WALLET_PREFIX + crypto.randomBytes(20).toString('hex');
}

/**
 * Ensures a bot player record exists in the database.
 */
async function ensureBotPlayer(db, botWallet) {
  const [existing] = await db.select({ wallet: players.wallet }).from(players).where(eq(players.wallet, botWallet));
  if (!existing) {
    await db.insert(players).values({
      wallet: botWallet,
      credits: 9999,
      lastSeen: Date.now(),
      wins: 0,
      losses: 0,
      xp: 0,
      tier: 'BRONZE',
      totalMatches: 0,
    });
  }
}

/**
 * Creates a match record in the database for two paired players.
 *
 * @param {object} db - Drizzle database instance
 * @param {string} playerOne - Wallet pubkey
 * @param {string} playerTwo - Wallet pubkey
 * @returns {object} Match record
 */
async function createMatch(db, playerOne, playerTwo) {
  const matchId = uuidv4();
  const now = Date.now();
  const { drawTimeMs, secret, commitment } = generateDrawTime(now);

  await db.insert(matches).values({
    id: matchId,
    playerOne,
    playerTwo,
    state: 'WAITING',
    drawTimeMs,
    drawSecret: secret,
    drawCommitment: commitment,
    createdAt: now,
  });

  return {
    id: matchId,
    playerOne,
    playerTwo,
    state: 'WAITING',
    drawTimeMs,
    commitment,
    createdAt: now,
  };
}

/**
 * Pairs two players from the queue and creates a match.
 * Called periodically by the matchmaking loop.
 */
async function pairFromQueue(db) {
  const rows = await db.select().from(queue).orderBy(asc(queue.joinedAt)).limit(2);

  if (rows.length >= 2) {
    // Two real players — pair them
    const playerOne = rows[0].wallet;
    const playerTwo = rows[1].wallet;
    await db.delete(queue).where(inArray(queue.wallet, [playerOne, playerTwo]));
    const match = await createMatch(db, playerOne, playerTwo);
    await deductForMatch(db, playerOne, playerTwo, match);
    return match;
  }

  // Only one player — keep waiting for a real opponent (no auto-bot)
  return null;
}

/**
 * Deducts credits for a match from the database.
 */
async function deductForMatch(db, playerOne, playerTwo, match) {
  if (!isBot(playerOne)) await db.update(players).set({ credits: sql`${players.credits} - 1` }).where(and(eq(players.wallet, playerOne), sql`${players.credits} > 0`));
  if (!isBot(playerTwo)) await db.update(players).set({ credits: sql`${players.credits} - 1` }).where(and(eq(players.wallet, playerTwo), sql`${players.credits} > 0`));
  console.log(`Deducted credits for match ${match.id}`);
}

/**
 * Pairs two players from a friend challenge room.
 */
async function pairFromRoom(db, creatorWallet, joinerWallet, roomCode) {
  const match = await createMatch(db, creatorWallet, joinerWallet);

  // Link room to match
  await db.update(rooms).set({ matchId: match.id }).where(eq(rooms.code, roomCode));

  // Deduct 1 credit from each player in DB
  await db.update(players).set({ credits: sql`${players.credits} - 1` }).where(and(eq(players.wallet, creatorWallet), sql`${players.credits} > 0`));
  await db.update(players).set({ credits: sql`${players.credits} - 1` }).where(and(eq(players.wallet, joinerWallet), sql`${players.credits} > 0`));
  console.log(`Deducted 1 credit each for room match ${match.id}`);

  return match;
}

/**
 * Background matchmaking loop (runs every 500ms).
 */
let matchmakerInterval = null;
function startMatchmaker(db) {
  matchmakerInterval = setInterval(async () => {
    try {
      await pairFromQueue(db);
    } catch (err) {
      console.error('Matchmaker error:', err.message);
    }
  }, 500);
  console.log('Matchmaker started (500ms interval)');
}

function stopMatchmaker() {
  if (matchmakerInterval) {
    clearInterval(matchmakerInterval);
    matchmakerInterval = null;
  }
}

module.exports = { createMatch, pairFromQueue, pairFromRoom, startMatchmaker, stopMatchmaker, isBot, BOT_WALLET_PREFIX, generateBotWallet, ensureBotPlayer, deductForMatch };
