/**
 * High-precision timing utilities.
 * Uses performance.now() for monotonic, sub-millisecond precision.
 */

/**
 * Returns a high-precision monotonic timestamp in milliseconds.
 * Used for measuring reaction time (not affected by clock adjustments).
 */
export function precisionNow(): number {
  return performance.now();
}

/**
 * Returns the current wall-clock time in milliseconds.
 * Used for server communication and timestamps.
 */
export function wallClockNow(): number {
  return Date.now();
}

/**
 * Tracks round-trip times for latency estimation.
 */
export class RttTracker {
  private history: number[] = [];
  private maxHistory = 5;

  add(rtt: number): void {
    this.history.push(rtt);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  getAverage(): number {
    if (this.history.length === 0) return 100;
    return this.history.reduce((a, b) => a + b, 0) / this.history.length;
  }

  getEstimatedOneWayLatency(): number {
    return this.getAverage() / 2;
  }
}
