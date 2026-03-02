import { API_URL } from '../constants';
import { getAuthToken } from './api';

async function gameApiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_URL}/games${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> || {}),
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

// ─── Coin Flip ─────────────────────────────────────────────────

export interface CoinFlipResult {
  id: string;
  won: boolean;
  result: 'heads' | 'tails';
  payout: number;
  amount: number;
  serverSeed: string;
  seedHash: string;
  clientSeed: string;
  nonce: number;
  balance: number;
}

export async function playCoinFlip(amount: number, choice: 'heads' | 'tails'): Promise<CoinFlipResult> {
  return gameApiFetch('/coinflip/bet', {
    method: 'POST',
    body: JSON.stringify({ amount, choice }),
  });
}

// ─── Dice ──────────────────────────────────────────────────────

export interface DiceResult {
  id: string;
  won: boolean;
  roll: number;
  target: number;
  isOver: boolean;
  multiplier: number;
  payout: number;
  amount: number;
  serverSeed: string;
  seedHash: string;
  clientSeed: string;
  nonce: number;
  balance: number;
}

export async function playDice(amount: number, target: number, isOver: boolean): Promise<DiceResult> {
  return gameApiFetch('/dice/bet', {
    method: 'POST',
    body: JSON.stringify({ amount, target, isOver }),
  });
}

// ─── Mines ─────────────────────────────────────────────────────

export interface MinesStartResult {
  gameId: string;
  seedHash: string;
  mineCount: number;
  amount: number;
}

export interface MinesRevealResult {
  safe: boolean;
  tile: number;
  multiplier?: number;
  potentialPayout?: number;
  payout?: number;
  gameOver: boolean;
  mines?: number[];
  serverSeed?: string;
  balance?: number;
  revealedCount?: number;
  safeTilesRemaining?: number;
}

export interface MinesCashoutResult {
  payout: number;
  multiplier: number;
  mines: number[];
  serverSeed: string;
  balance: number;
}

export async function startMines(amount: number, mineCount: number): Promise<MinesStartResult> {
  return gameApiFetch('/mines/start', {
    method: 'POST',
    body: JSON.stringify({ amount, mineCount }),
  });
}

export async function revealMine(gameId: string, tile: number): Promise<MinesRevealResult> {
  return gameApiFetch('/mines/reveal', {
    method: 'POST',
    body: JSON.stringify({ gameId, tile }),
  });
}

export async function cashoutMines(gameId: string): Promise<MinesCashoutResult> {
  return gameApiFetch('/mines/cashout', {
    method: 'POST',
    body: JSON.stringify({ gameId }),
  });
}

// ─── Crash ─────────────────────────────────────────────────────

export interface CrashState {
  roundId: string;
  state: 'betting' | 'flying' | 'crashed' | 'waiting';
  seedHash: string;
  crashPoint?: number;
  serverSeed?: string;
  currentMultiplier: number;
  elapsed: number;
  myBet: { amount: number; cashedOutAt: number | null; payout: number } | null;
  cashouts: { wallet: string; at: number; payout: number }[];
}

export async function getCrashState(): Promise<CrashState> {
  return gameApiFetch('/crash/state');
}

export async function placeCrashBet(amount: number): Promise<{ roundId: string; amount: number; seedHash: string }> {
  return gameApiFetch('/crash/bet', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export async function crashCashout(): Promise<{ cashedOutAt: number; payout: number; balance: number }> {
  return gameApiFetch('/crash/cashout', { method: 'POST' });
}

// ─── History ───────────────────────────────────────────────────

export interface GameBet {
  id: string;
  game_type: 'coinflip' | 'dice' | 'mines' | 'crash';
  amount: number;
  payout: number;
  won: number;
  result: any;
  created_at: number;
}

export async function getGameHistory(): Promise<GameBet[]> {
  const data = await gameApiFetch('/history');
  return data.bets;
}

// ─── Live Feed ─────────────────────────────────────────────────

export interface LiveFeedItem {
  wallet: string;
  game: string;
  amount: number;
  payout: number;
  won: boolean;
  time: number;
}

export async function getLiveFeed(): Promise<LiveFeedItem[]> {
  const data = await gameApiFetch('/live-feed');
  return data.feed;
}

// ─── Verify ────────────────────────────────────────────────────

export async function verifyFairness(params: {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  seedHash: string;
  gameType: string;
  mineCount?: number;
}): Promise<{ verified: boolean; hash: string; outcome: any }> {
  return gameApiFetch('/verify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
