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
export const CLUSTER = 'mainnet-beta';
export const SOLANA_RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=8cfc9ae5-fd56-4ad2-914a-97f4a1c2cf3c';

// Treasury wallet (backend-controlled keypair) — deposits go here
export const TREASURY_WALLET = '5q757H3kuBXAePqYFRKD1UDBey3cQGuSEGV3PXUcHRYT';

// Mobile Wallet Adapter identity
export const APP_IDENTITY = {
  name: 'TapRush',
  uri: 'https://taprush.app',
  icon: 'favicon.ico',
};

// Top-up pricing
export const TOPUP_LAMPORTS = 10_000_000;     // 0.01 SOL per top-up
export const CREDITS_PER_TOPUP = 5;

// Game constants
export const WAGER_LAMPORTS = 10_000_000;     // 0.01 SOL per side

// Polling intervals (ms)
export const MATCHMAKING_POLL_INTERVAL = 300;
export const STANDOFF_POLL_INTERVAL = 150;

// Timing thresholds
export const MIN_HUMAN_REACTION_MS = 80;
