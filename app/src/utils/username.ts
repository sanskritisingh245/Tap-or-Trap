const BOT_NAMES = ['RushBot', 'SpeedDemon', 'QuickDraw', 'FlashTap', 'NeonBot', 'TurboTap', 'BlitzBot', 'SnapBot'];

/**
 * Derives a display name from a wallet pubkey.
 * Bot wallets (starting with BOT_) get fun names.
 * Regular wallets show truncated address: "Ab3x...f9k2"
 */
export function deriveUsername(walletPubkey: string): string {
  if (!walletPubkey || walletPubkey.length < 8) return walletPubkey;
  if (walletPubkey.startsWith('BOT_')) {
    // Deterministic bot name based on wallet hash
    const hash = walletPubkey.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return BOT_NAMES[hash % BOT_NAMES.length];
  }
  return walletPubkey.slice(0, 4) + '...' + walletPubkey.slice(-4);
}
