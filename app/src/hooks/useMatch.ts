import { useState, useRef, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import * as api from '../services/api';
import { precisionNow, wallClockNow, RttTracker } from '../utils/timing';
import { STANDOFF_POLL_INTERVAL } from '../constants';

const RESULT_POLL_INTERVAL = 100; // Poll fast when waiting for result

export type GamePhase =
  | 'idle'
  | 'queued'
  | 'waiting_room'
  | 'standoff'
  | 'draw'
  | 'waiting_result'
  | 'result'
  | 'forfeit'
  | 'cancelled';

export interface MatchResult {
  won: boolean;
  winner: string;
  reaction: number | null;
  opponentReaction: number | null;
  opponent: string;
  forfeitReason?: string;
  currentStreak: number;
  maxStreak: number;
  bestReaction: number | null;
  wins: number;
  losses: number;
  xp: number;
  tier: string;
  newAchievements: string[];
}

/**
 * Core match hook — manages polling, tap submission, and game phase transitions.
 */
export function useMatch() {
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<string | null>(null);
  const [commitment, setCommitment] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);

  const drawReceivedLocalTime = useRef<number>(0);
  const drawReceivedAt = useRef<number>(0);
  const rttTracker = useRef(new RttTracker());
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tappedRef = useRef(false);
  const completedMatchIds = useRef<Set<string>>(new Set());

  // ─── Polling ──────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollMatchState = useCallback(async (id: string, interval?: number) => {
    const pollInterval = interval || STANDOFF_POLL_INTERVAL;
    try {
      const data = await api.getMatchState(id);
      rttTracker.current.add(data.rtt);

      switch (data.phase) {
        case 'standoff':
          setPhase('standoff');
          pollingRef.current = setTimeout(() => pollMatchState(id, pollInterval), pollInterval);
          break;

        case 'draw':
          // DRAW SIGNAL RECEIVED — only set timing on first detection
          if (drawReceivedLocalTime.current === 0) {
            drawReceivedLocalTime.current = precisionNow();
            drawReceivedAt.current = wallClockNow();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
          setPhase('draw');
          // Keep polling so we detect result/cancel even if player hasn't tapped
          pollingRef.current = setTimeout(() => pollMatchState(id, RESULT_POLL_INTERVAL), RESULT_POLL_INTERVAL);
          break;

        case 'result':
          completedMatchIds.current.add(id);
          setResult({
            won: data.won,
            winner: data.winner,
            reaction: data.reaction,
            opponentReaction: data.opponentReaction ?? null,
            opponent: data.opponent,
            forfeitReason: data.forfeitReason,
            currentStreak: data.currentStreak ?? 0,
            maxStreak: data.maxStreak ?? 0,
            bestReaction: data.bestReaction ?? null,
            wins: data.wins ?? 0,
            losses: data.losses ?? 0,
            xp: data.xp ?? 0,
            tier: data.tier ?? 'BRONZE',
            newAchievements: data.newAchievements ?? [],
          });
          setPhase('result');
          break;

        case 'cancelled':
          completedMatchIds.current.add(id);
          setPhase('cancelled');
          break;

        default:
          pollingRef.current = setTimeout(() => pollMatchState(id, pollInterval), pollInterval);
          break;
      }
    } catch (err: any) {
      console.error('Poll error:', err);
      if (err?.message === 'Not authenticated') return;
      pollingRef.current = setTimeout(() => pollMatchState(id, pollInterval), pollInterval);
    }
  }, []);

  // ─── Matchmaking polling ──────────────────────────────────────────

  const pollMatchmaking = useCallback(async () => {
    try {
      const data = await api.getMatchmakingStatus();

      if (data.status === 'matched' && data.matchId) {
        // Skip matches we've already seen results for (stale backend state)
        if (completedMatchIds.current.has(data.matchId)) {
          pollingRef.current = setTimeout(pollMatchmaking, 500);
          return;
        }
        setMatchId(data.matchId);
        setOpponent(data.opponent || null);
        setCommitment(data.commitment || null);
        setPhase('standoff');
        tappedRef.current = false;
        // Start match state polling
        pollMatchState(data.matchId);
        return;
      }

      if (data.status === 'waiting_room') {
        setRoomCode(data.roomCode);
        setPhase('waiting_room');
      }

      // Keep polling
      pollingRef.current = setTimeout(pollMatchmaking, 500);
    } catch (err: any) {
      console.error('Matchmaking poll error:', err);
      if (err?.message === 'Not authenticated') return;
      pollingRef.current = setTimeout(pollMatchmaking, 500);
    }
  }, [pollMatchState]);

  // ─── Actions ──────────────────────────────────────────────────────

  const joinQueue = useCallback(async () => {
    await api.joinQueue();
    setPhase('queued');
    tappedRef.current = false;
    pollMatchmaking();
  }, [pollMatchmaking]);

  const leaveQueue = useCallback(async () => {
    stopPolling();
    await api.leaveQueue();
    setPhase('idle');
  }, [stopPolling]);

  const createRoom = useCallback(async () => {
    const result = await api.createRoom();
    setRoomCode(result.roomCode);
    setPhase('waiting_room');
    tappedRef.current = false;
    pollMatchmaking();
    return result.roomCode;
  }, [pollMatchmaking]);

  const joinRoom = useCallback(async (code: string) => {
    const result = await api.joinRoom(code);
    if (result.status === 'matched') {
      setMatchId(result.matchId);
      setOpponent(result.opponent || null);
      setPhase('standoff');
      tappedRef.current = false;
      pollMatchState(result.matchId);
    }
  }, [pollMatchState]);

  const cancelRoom = useCallback(async () => {
    stopPolling();
    await api.cancelRoom();
    setRoomCode(null);
    setPhase('idle');
  }, [stopPolling]);

  // ─── Tap handling ─────────────────────────────────────────────────

  const handleTap = useCallback(async () => {
    if (tappedRef.current || !matchId) return;
    if (phase !== 'standoff' && phase !== 'draw') return;
    tappedRef.current = true;

    const tapTime = precisionNow();

    try {
      if (phase === 'standoff') {
        // Tapped BEFORE draw — early tap forfeit
        setPhase('forfeit');
        await api.submitTap(matchId, {
          tapTimestamp: wallClockNow(),
          early: true,
        });
        // Poll fast for result
        pollMatchState(matchId, RESULT_POLL_INTERVAL);
        return;
      }

      if (phase === 'draw') {
        const reactionMs = tapTime - drawReceivedLocalTime.current;
        setPhase('waiting_result');
        await api.submitTap(matchId, {
          tapTimestamp: wallClockNow(),
          clientDrawReceived: drawReceivedAt.current,
          reactionMs,
        });
        // Poll fast for result
        pollMatchState(matchId, RESULT_POLL_INTERVAL);
      }
    } catch (err: any) {
      console.warn('Tap submit failed:', err.message);
      // Match was likely cancelled/resolved — poll to get current state
      pollMatchState(matchId, RESULT_POLL_INTERVAL);
    }
  }, [matchId, phase, pollMatchState]);

  // ─── Reset ────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    stopPolling();
    setPhase('idle');
    setMatchId(null);
    setOpponent(null);
    setCommitment(null);
    setResult(null);
    setRoomCode(null);
    tappedRef.current = false;
    drawReceivedLocalTime.current = 0;
    drawReceivedAt.current = 0;
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    phase,
    matchId,
    opponent,
    commitment,
    result,
    roomCode,
    joinQueue,
    leaveQueue,
    createRoom,
    joinRoom,
    cancelRoom,
    handleTap,
    reset,
  };
}
