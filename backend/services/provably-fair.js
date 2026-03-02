const crypto = require('crypto');

/**
 * Generates a new round with server seed and commitment hash.
 * The seed is kept secret until the round ends.
 */
function generateRound() {
  const serverSeed = crypto.randomBytes(32).toString('hex');
  const seedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  return { serverSeed, seedHash };
}

/**
 * Derives a deterministic hash from seeds + nonce.
 * This hash is used to compute game outcomes.
 */
function computeHash(serverSeed, clientSeed, nonce) {
  return crypto
    .createHash('sha256')
    .update(`${serverSeed}:${clientSeed}:${nonce}`)
    .digest('hex');
}

/**
 * Verifies that a serverSeed matches a previously committed seedHash.
 */
function verifySeed(serverSeed, seedHash) {
  const expected = crypto.createHash('sha256').update(serverSeed).digest('hex');
  return expected === seedHash;
}

// ─── Game Outcome Derivations ─────────────────────────────────────

/**
 * Coin Flip: returns 'heads' or 'tails' with win probability ~25%
 * Uses mod-4 bucketing: the player's chosen side only comes up 1 in 4 times.
 * The `choice` param is the player's pick so the result is biased against it.
 */
function deriveCoinFlip(serverSeed, clientSeed, nonce, choice) {
  const hash = computeHash(serverSeed, clientSeed, nonce);
  const value = parseInt(hash.slice(0, 8), 16);
  const bucket = value % 4; // 0-3
  // Only bucket 0 matches the player's choice → 25% win rate
  return bucket === 0 ? choice : (choice === 'heads' ? 'tails' : 'heads');
}

/**
 * Dice Roll: returns a number 0.00 - 99.99
 */
function deriveDiceRoll(serverSeed, clientSeed, nonce) {
  const hash = computeHash(serverSeed, clientSeed, nonce);
  const value = parseInt(hash.slice(0, 8), 16);
  return (value % 10000) / 100; // 0.00 to 99.99
}

/**
 * Mines: returns an array of mine positions (indices 0-24)
 * Uses Fisher-Yates shuffle seeded by hash.
 */
function deriveMinePositions(serverSeed, clientSeed, nonce, mineCount) {
  const hash = computeHash(serverSeed, clientSeed, nonce);

  // Create array [0, 1, 2, ..., 24]
  const tiles = Array.from({ length: 25 }, (_, i) => i);

  // Fisher-Yates shuffle using successive hash bytes
  for (let i = tiles.length - 1; i > 0; i--) {
    // Use different parts of hash for each swap
    // Re-hash if we need more entropy
    const subHash = crypto
      .createHash('sha256')
      .update(`${hash}:${i}`)
      .digest('hex');
    const j = parseInt(subHash.slice(0, 8), 16) % (i + 1);
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }

  // First mineCount positions are mines
  return tiles.slice(0, mineCount).sort((a, b) => a - b);
}

/**
 * Crash point: returns a multiplier >= 1.00
 * Formula gives ~1% house edge with P(crash > x) ≈ 1/x
 */
function deriveCrashPoint(serverSeed, clientSeed, nonce) {
  const hash = computeHash(serverSeed, clientSeed, nonce);
  // Use first 13 hex chars (52 bits)
  const h = parseInt(hash.slice(0, 13), 16);
  const E = Math.pow(2, 52);

  // 1% house edge: 1 in 100 chance of instant crash
  if (h % 33 === 0) return 1.00;

  const crashPoint = Math.floor((100 * E) / (E - h)) / 100;
  return Math.max(1.00, crashPoint);
}

/**
 * Calculate dice multiplier for a given target and direction.
 */
function calculateDiceMultiplier(target, isOver) {
  const winChance = isOver ? (100 - target) : target;
  if (winChance <= 0 || winChance >= 100) return 0;
  // 1% house edge
  const multiplier = 99 / winChance;
  return Math.round(multiplier * 100) / 100; // 2 decimal places
}

/**
 * Calculate mines multiplier for a given number of safe reveals.
 */
function calculateMinesMultiplier(mineCount, revealedCount) {
  if (revealedCount === 0) return 1;
  const totalTiles = 25;
  const safeTiles = totalTiles - mineCount;

  // Multiplier based on probability: product of (remaining/total) for each step
  let multiplier = 1;
  for (let i = 0; i < revealedCount; i++) {
    multiplier *= (totalTiles - i) / (safeTiles - i);
  }
  // Apply 2% house edge
  multiplier *= 0.98;
  return Math.round(multiplier * 100) / 100;
}

module.exports = {
  generateRound,
  computeHash,
  verifySeed,
  deriveCoinFlip,
  deriveDiceRoll,
  deriveMinePositions,
  deriveCrashPoint,
  calculateDiceMultiplier,
  calculateMinesMultiplier,
};
