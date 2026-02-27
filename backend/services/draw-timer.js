const crypto = require('crypto');

/**
 * Generates a random draw time with commit-reveal for provable fairness.
 *
 * The draw time is randomly chosen between 2–15 seconds after match start.
 * A cryptographic commitment (SHA-256 hash) is created so clients can later
 * verify the backend didn't manipulate the timing.
 *
 * @param {number} matchStartTime - Server timestamp when standoff begins
 * @returns {{ drawTimeMs: number, secret: string, commitment: string }}
 */
function generateDrawTime(matchStartTime) {
  // Random delay: uniform in [1000, 4000] ms — short enough for fast-paced duels
  const randomBytes = crypto.randomBytes(4);
  const randomValue = randomBytes.readUInt32BE(0);
  const drawDelayMs = 1000 + Math.floor((randomValue / 0xFFFFFFFF) * 3000);

  const drawTimeMs = matchStartTime + drawDelayMs;

  // Create commitment: sha256(secret + drawTime)
  const secret = crypto.randomBytes(32).toString('hex');
  const commitment = crypto
    .createHash('sha256')
    .update(secret)
    .update(drawTimeMs.toString())
    .digest('hex');

  return { drawTimeMs, secret, commitment };
}

/**
 * Verifies a draw time commitment (client-side verification helper).
 */
function verifyCommitment(secret, drawTimeMs, commitment) {
  const expected = crypto
    .createHash('sha256')
    .update(secret)
    .update(drawTimeMs.toString())
    .digest('hex');
  return expected === commitment;
}

module.exports = { generateDrawTime, verifyCommitment };
