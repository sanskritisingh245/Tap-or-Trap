import { Platform } from 'react-native';

// Android emulator uses 10.0.2.2 to reach host localhost
// iOS simulator uses localhost directly
export const API_URL = __DEV__
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000'
  : 'https://api.taprush.app';

// Solana config
export const PROGRAM_ID = 'HKUeBck47FAtguvzH1oceCshmMSxgXqKHTnN2RmcTNsH';
export const SOLANA_RPC_URL = 'https://api.devnet.solana.com';

// Mobile Wallet Adapter identity
export const APP_IDENTITY = {
  name: 'TapRush',
  uri: 'https://taprush.app',
  icon: 'favicon.ico',
};

// Game constants (must match on-chain program)
export const WAGER_LAMPORTS = 10_000_000;     // 0.01 SOL per side
export const CREDITS_PER_TOPUP = 5;
export const TOPUP_AMOUNT = CREDITS_PER_TOPUP * WAGER_LAMPORTS;

// Polling intervals (ms)
export const MATCHMAKING_POLL_INTERVAL = 300;
export const STANDOFF_POLL_INTERVAL = 150;

// Timing thresholds
export const MIN_HUMAN_REACTION_MS = 80;
