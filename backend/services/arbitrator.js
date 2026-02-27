/**
 * Tap arbitration engine.
 *
 * Validates tap timestamps, cross-checks against server-side timing,
 * and determines the match winner.
 */

const MIN_HUMAN_REACTION_MS = 80;  // Below this = suspicious
const TAP_TIMEOUT_MS = 5000;       // No tap within 5s = timeout
const TIE_THRESHOLD_MS = 10;       // Within 10ms = rematch

/**
 * Validates a single tap submission.
 *
 * @param {object} tap - { tapTimestamp, clientDrawReceived, reactionMs, early }
 * @param {number} drawFiredAt - Server timestamp when draw was fired
 * @param {number} estimatedRtt - Player's estimated round-trip time
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateTap(tap, drawFiredAt, estimatedRtt) {
  if (tap.early) {
    return { valid: true }; // Early taps are valid (player forfeits)
  }

  if (tap.reactionMs < 0) {
    return { valid: false, reason: 'Negative reaction time' };
  }

  if (tap.reactionMs === 0) {
    return { valid: false, reason: 'Zero reaction time (impossible)' };
  }

  if (tap.reactionMs < MIN_HUMAN_REACTION_MS) {
    return { valid: false, reason: `Reaction ${tap.reactionMs}ms below human limit (${MIN_HUMAN_REACTION_MS}ms)` };
  }

  // Cross-check: server-observed reaction ≈ reported reaction + one-way latency
  const serverObservedReaction = tap.serverReceivedAt - drawFiredAt;
  const estimatedOneWayLatency = estimatedRtt / 2;
  const expectedServerReaction = tap.reactionMs + estimatedOneWayLatency;
  const tolerance = Math.max(50, estimatedRtt * 0.5);

  if (Math.abs(serverObservedReaction - expectedServerReaction) > tolerance) {
    return {
      valid: false,
      reason: `Timing cross-check failed: server saw ${serverObservedReaction}ms, expected ~${expectedServerReaction}ms`
    };
  }

  return { valid: true };
}

/**
 * Resolves a match given both players' taps.
 *
 * @param {object|null} tapOne - Player one's tap (null = timeout)
 * @param {object|null} tapTwo - Player two's tap (null = timeout)
 * @returns {{ winner: 'player_one'|'player_two'|'rematch'|'cancel', reason: string }}
 */
function resolveMatch(tapOne, tapTwo) {
  // Case 1: Both tapped early
  if (tapOne?.early && tapTwo?.early) {
    return { winner: 'cancel', reason: 'both_early' };
  }

  // Case 2: One tapped early → other wins
  if (tapOne?.early) {
    return { winner: 'player_two', reason: 'early_tap' };
  }
  if (tapTwo?.early) {
    return { winner: 'player_one', reason: 'early_tap' };
  }

  // Case 3: One timed out → other wins
  if (!tapOne && tapTwo) {
    return { winner: 'player_two', reason: 'timeout' };
  }
  if (tapOne && !tapTwo) {
    return { winner: 'player_one', reason: 'timeout' };
  }

  // Case 3b: Both timed out
  if (!tapOne && !tapTwo) {
    return { winner: 'cancel', reason: 'both_timeout' };
  }

  // Case 4: Both tapped after draw — compare reaction times
  const diff = Math.abs(tapOne.reactionMs - tapTwo.reactionMs);

  // Case 5: Tie (within threshold)
  if (diff < TIE_THRESHOLD_MS) {
    return { winner: 'rematch', reason: 'tie' };
  }

  if (tapOne.reactionMs < tapTwo.reactionMs) {
    return { winner: 'player_one', reason: 'faster' };
  } else {
    return { winner: 'player_two', reason: 'faster' };
  }
}

module.exports = { validateTap, resolveMatch, MIN_HUMAN_REACTION_MS, TAP_TIMEOUT_MS, TIE_THRESHOLD_MS };
