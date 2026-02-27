/**
 * Derives a display name from a wallet pubkey.
 * No user-chosen names — username = truncated wallet address.
 * e.g., "Ab3x...f9k2"
 */
export function deriveUsername(walletPubkey: string): string {
  if (!walletPubkey || walletPubkey.length < 8) return walletPubkey;
  return walletPubkey.slice(0, 4) + '...' + walletPubkey.slice(-4);
}
