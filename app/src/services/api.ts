import { API_URL } from '../constants';

// Use global to survive Metro Fast Refresh (module vars reset on hot reload)
const g = global as any;
if (!g.__snapduel) g.__snapduel = { authToken: null, savedWallet: null };

let authToken: string | null = g.__snapduel.authToken;
let savedWallet: string | null = g.__snapduel.savedWallet;

export function setAuthToken(token: string) {
  authToken = token;
  g.__snapduel.authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function reauth(): Promise<boolean> {
  // Restore from global in case module vars were reset by hot reload
  if (!savedWallet) savedWallet = g.__snapduel.savedWallet;
  if (!authToken) authToken = g.__snapduel.authToken;
  if (authToken) return true; // already have a token after restoring from global

  if (!savedWallet) return false;
  try {
    const res = await fetch(`${API_URL}/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: savedWallet }),
    });
    const data = await res.json();
    if (data.token) {
      authToken = data.token;
      g.__snapduel.authToken = data.token;
      return true;
    }
  } catch {}
  return false;
}

async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const isPublic = endpoint.startsWith('/auth/');

  // Auto-reauth if token is missing but we have a saved wallet
  if (!authToken && !isPublic) {
    const ok = await reauth();
    if (!ok) throw new Error('Not authenticated — please restart the app');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkErr: any) {
    throw new Error(`Cannot reach server at ${API_URL}. Make sure the backend is running.`);
  }

  // If 401, try reauth once and retry
  if (res.status === 401 && !isPublic) {
    // Force clear stale token so reauth does a fresh login
    authToken = null;
    g.__snapduel.authToken = null;
    const ok = await reauth();
    if (ok) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${authToken}` };
      try {
        const retryRes = await fetch(`${API_URL}${endpoint}`, { ...options, headers: retryHeaders });
        const retryData = await retryRes.json();
        if (!retryRes.ok) throw new Error(retryData.error || `Request failed: ${retryRes.status}`);
        return retryData;
      } catch (retryErr: any) {
        throw new Error(`Cannot reach server at ${API_URL}. Make sure the backend is running.`);
      }
    }
    throw new Error('Session expired — please restart the app');
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────

export async function requestNonce(wallet: string): Promise<string> {
  const data = await apiFetch(`/auth/nonce?wallet=${wallet}`);
  return data.nonce;
}

export async function verifySignature(wallet: string, signature: string, nonce: string): Promise<string> {
  const data = await apiFetch('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ wallet, signature, nonce }),
  });
  setAuthToken(data.token);
  return data.token;
}

// Dev-mode login (no signature required)
export async function devLogin(wallet: string): Promise<string> {
  savedWallet = wallet;
  g.__snapduel.savedWallet = wallet;
  const data = await apiFetch('/auth/dev-login', {
    method: 'POST',
    body: JSON.stringify({ wallet }),
  });
  setAuthToken(data.token);
  return data.token;
}

// ─── Credits ──────────────────────────────────────────────────────

export async function getCreditsBalance(): Promise<number> {
  const data = await apiFetch('/credits/balance');
  return data.playsRemaining;
}

export async function topUpCredits(): Promise<number> {
  const data = await apiFetch('/credits/topup', { method: 'POST' });
  return data.playsRemaining;
}

// ─── Matchmaking (Random) ─────────────────────────────────────────

export async function joinQueue(): Promise<any> {
  return apiFetch('/matchmaking/join', { method: 'POST' });
}

export async function getMatchmakingStatus(): Promise<any> {
  return apiFetch('/matchmaking/status');
}

export async function leaveQueue(): Promise<any> {
  return apiFetch('/matchmaking/leave', { method: 'POST' });
}

// ─── Bot Match ───────────────────────────────────────────────────

export async function joinBot(): Promise<{ status: string; matchId: string; opponent: string }> {
  return apiFetch('/matchmaking/join-bot', { method: 'POST' });
}

// ─── Friend Challenge (Invite Code) ──────────────────────────────

export async function createRoom(): Promise<{ roomCode: string; status: string }> {
  return apiFetch('/matchmaking/create-room', { method: 'POST' });
}

export async function joinRoom(roomCode: string): Promise<any> {
  return apiFetch('/matchmaking/join-room', {
    method: 'POST',
    body: JSON.stringify({ roomCode }),
  });
}

export async function cancelRoom(): Promise<any> {
  return apiFetch('/matchmaking/cancel-room', { method: 'POST' });
}

// ─── Match ────────────────────────────────────────────────────────

export async function getMatchState(matchId: string): Promise<any> {
  const requestSent = Date.now();
  const data = await apiFetch(`/match/${matchId}/state`);
  const rtt = Date.now() - requestSent;
  return { ...data, rtt };
}

export async function submitTap(
  matchId: string,
  tapData: {
    tapTimestamp: number;
    clientDrawReceived?: number;
    reactionMs?: number;
    early?: boolean;
  }
): Promise<any> {
  return apiFetch(`/match/${matchId}/tap`, {
    method: 'POST',
    body: JSON.stringify(tapData),
  });
}

export async function sendReady(matchId: string): Promise<any> {
  return apiFetch(`/match/${matchId}/ready`, { method: 'POST' });
}

// ─── Stats ───────────────────────────────────────────────────────

export type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'PHANTOM';

export interface PlayerStats {
  wins: number;
  losses: number;
  currentStreak: number;
  maxStreak: number;
  bestReaction: number | null;
  totalMatches: number;
  winRate: number;
  xp: number;
  tier: Tier;
  xpToNext: number;
  nextTier: Tier | null;
  xpThreshold: number;
}

export interface MatchHistoryEntry {
  id: string;
  opponent: string;
  won: boolean;
  cancelled: boolean;
  myReaction: number | null;
  opponentReaction: number | null;
  forfeitReason: string | null;
  timestamp: number;
}

export async function getPlayerStats(): Promise<PlayerStats> {
  return apiFetch('/stats/me');
}

export async function getMatchHistory(): Promise<MatchHistoryEntry[]> {
  const data = await apiFetch('/stats/history');
  return data.history;
}

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  wins: number;
  losses: number;
  maxStreak: number;
  bestReaction: number | null;
  totalMatches: number;
  winRate: number;
  xp: number;
  tier: Tier;
}

export async function getLeaderboard(timeframe: 'today' | 'week' | 'all' = 'all'): Promise<{ leaderboard: LeaderboardEntry[]; myRank: number | null }> {
  return apiFetch(`/stats/leaderboard?timeframe=${timeframe}`);
}

export interface Achievement {
  achievement_id: string;
  unlocked_at: number;
}

export async function getAchievements(): Promise<Achievement[]> {
  const data = await apiFetch('/stats/achievements');
  return data.achievements;
}

export interface OnlinePlayer {
  wallet: string;
  wins: number;
  losses: number;
  xp: number;
  tier: Tier;
  totalMatches: number;
  bestReaction: number | null;
}

export async function getOnlinePlayers(): Promise<OnlinePlayer[]> {
  const data = await apiFetch('/stats/online');
  return data.players;
}

// ─── Daily ──────────────────────────────────────────────────────

export interface DailyChallenge {
  id: number;
  type: string;
  label: string;
  target: number;
  progress: number;
  completed: boolean;
  rewardXp: number;
  rewardCredits: number;
}

export async function getDailyChallenges(): Promise<{ challenges: DailyChallenge[]; date: string }> {
  return apiFetch('/daily/challenges');
}

export async function claimDailyLogin(): Promise<{ alreadyClaimed: boolean; streak: number; reward: number }> {
  return apiFetch('/daily/claim-login', { method: 'POST' });
}
