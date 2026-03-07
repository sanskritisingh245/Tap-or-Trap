import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, ActivityIndicator, Animated, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useMatch } from '../hooks/useMatch';
import { useAccelerometer } from '../hooks/useAccelerometer';
import { LobbyMenu } from '../components/LobbyMenu';
import { RoomCreator } from '../components/RoomCreator';
import { RoomJoiner } from '../components/RoomJoiner';
import { CountdownReveal } from '../components/CountdownReveal';
import { MatchHistory } from '../components/MatchHistory';
import { Leaderboard } from '../components/Leaderboard';
import { AmbientBackground } from '../components/AmbientBackground';
import { getCreditsBalance, topUpCredits } from '../services/api';
import { deriveUsername } from '../utils/username';
import { fonts, palette, shadows } from '../theme/ui';

type UIMode = 'lobby' | 'join_code' | 'history' | 'leaderboard' | 'game';

const WIN_LINES = ['Excellent timing', 'Sharp finish', 'Clean execution'];
const LOSE_LINES = ['Close one', 'Try again', 'You are improving'];

export default function GameScreen({
  onBack,
  wallet,
}: {
  onBack?: () => void;
  wallet: { publicKey: string | null; connected: boolean; loading: boolean; connect: () => Promise<void> };
}) {
  const match = useMatch();
  const { isStill } = useAccelerometer(match.phase === 'standoff');

  const [uiMode, setUiMode] = useState<UIMode>('lobby');
  const [credits, setCredits] = useState<number | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [line, setLine] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lobbyLoading, setLobbyLoading] = useState(false);

  const pulse = useRef(new Animated.Value(1)).current;
  const drawScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  useEffect(() => {
    if (match.phase === 'draw') {
      const a = Animated.loop(
        Animated.sequence([
          Animated.timing(drawScale, { toValue: 1.07, duration: 120, useNativeDriver: true }),
          Animated.timing(drawScale, { toValue: 1, duration: 120, useNativeDriver: true }),
        ])
      );
      a.start();
      return () => a.stop();
    }
  }, [match.phase]);

  useEffect(() => {
    if (match.phase === 'result' && match.result) {
      setShowCountdown(true);
      const pool = match.result.won ? WIN_LINES : LOSE_LINES;
      setLine(pool[Math.floor(Math.random() * pool.length)]);
    }
  }, [match.phase]);

  useEffect(() => {
    if (match.phase === 'draw') Haptics.selectionAsync().catch(() => {});
    if (match.phase === 'result' && match.result?.won) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [match.phase]);

  const refreshCredits = useCallback(async () => {
    try {
      const b = await getCreditsBalance();
      setCredits(b);
      return b;
    } catch {
      setCredits(0);
      return 0;
    }
  }, []);

  if (!wallet.connected) {
    return (
      <View style={styles.screen}>
        <AmbientBackground tone="cool" />
        <View style={styles.card}>
          <Text style={styles.title}>TapRush</Text>
          <TouchableOpacity
            style={styles.primaryWrap}
            onPress={async () => {
              try {
                await wallet.connect();
                await refreshCredits();
              } catch {}
            }}
            disabled={wallet.loading}
            activeOpacity={0.88}
          >
            <LinearGradient colors={[palette.primary, palette.primaryStrong]} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              {wallet.loading ? <ActivityIndicator color={palette.buttonText} /> : <Text style={styles.primaryText}>Connect Wallet</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (uiMode === 'join_code') {
    return (
      <RoomJoiner
        onJoin={async (code) => {
          setJoinError(null);
          setJoinLoading(true);
          try {
            await match.joinRoom(code);
          } catch (e: any) {
            setJoinError(e?.message || 'Join failed');
          } finally {
            setJoinLoading(false);
          }
        }}
        onCancel={() => setUiMode('lobby')}
        error={joinError}
        loading={joinLoading}
      />
    );
  }

  if (uiMode === 'history') return <MatchHistory onBack={() => setUiMode('lobby')} />;
  if (uiMode === 'leaderboard') return <Leaderboard onBack={() => setUiMode('lobby')} />;

  if (match.phase === 'waiting_room' && match.roomCode) {
    return <RoomCreator roomCode={match.roomCode} onCancel={async () => { await match.cancelRoom(); setUiMode('lobby'); }} />;
  }

  if (match.phase === 'queued') {
    return (
      <View style={styles.screen}>
        <AmbientBackground tone="cool" />
        <Animated.View style={[styles.card, { transform: [{ scale: pulse }] }]}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.subtitle}>Finding Opponent</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={async () => { await match.leaveQueue(); setUiMode('lobby'); }} activeOpacity={0.85}>
            <Text style={styles.secondaryText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  if (match.phase === 'standoff') {
    return (
      <Pressable style={styles.screen} onPress={match.handleTap}>
        <AmbientBackground tone="warm" />
        <View style={styles.card}>
          <Text style={styles.icon}>{isStill ? 'Ready' : 'Keep Still'}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { backgroundColor: isStill ? palette.success : palette.danger }]} />
          </View>
        </View>
      </Pressable>
    );
  }

  if (match.phase === 'draw') {
    return (
      <Pressable style={styles.drawScreen} onPress={match.handleTap}>
        <AmbientBackground tone="danger" />
        <Animated.Text style={[styles.drawText, { transform: [{ scale: drawScale }] }]}>TAP</Animated.Text>
      </Pressable>
    );
  }

  if (match.phase === 'forfeit') {
    return (
      <View style={styles.screen}><AmbientBackground tone="danger" /><View style={styles.card}><Text style={styles.title}>Too Early</Text></View></View>
    );
  }

  if (match.phase === 'waiting_result') {
    return (
      <View style={styles.screen}><AmbientBackground tone="cool" /><View style={styles.card}><ActivityIndicator size="large" color={palette.success} /></View></View>
    );
  }

  if (match.phase === 'result' && match.result) {
    if (showCountdown) return <CountdownReveal onComplete={() => setShowCountdown(false)} />;
    const { won, reaction, opponentReaction, opponent, currentStreak, bestReaction } = match.result;

    return (
      <View style={styles.screen}>
        <AmbientBackground tone={won ? 'cool' : 'danger'} />
        <View style={[styles.card, won ? { borderColor: 'rgba(65,210,140,0.45)' } : { borderColor: 'rgba(255,90,122,0.45)' }]}>
          <Text style={styles.title}>{won ? 'Victory' : 'Defeat'}</Text>
          <Text style={styles.small}>{line}</Text>
          <Text style={styles.small}>{deriveUsername(opponent || '')}</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metric}><Text style={styles.metricLabel}>You</Text><Text style={styles.metricValue}>{reaction !== null && reaction >= 0 ? `${Math.round(reaction)}ms` : '-'}</Text></View>
            <View style={styles.metric}><Text style={styles.metricLabel}>Them</Text><Text style={styles.metricValue}>{opponentReaction !== null && opponentReaction >= 0 ? `${Math.round(opponentReaction)}ms` : '-'}</Text></View>
          </View>

          {won && currentStreak >= 2 ? <Text style={styles.good}>{currentStreak} win streak</Text> : null}
          {bestReaction !== null && reaction !== null && reaction > 0 && reaction <= bestReaction ? <Text style={styles.good}>New personal best</Text> : null}

          <TouchableOpacity style={styles.primaryWrap} onPress={async () => { match.reset(); await refreshCredits(); try { await match.joinQueue(); } catch { setUiMode('lobby'); } }} activeOpacity={0.88}>
            <LinearGradient colors={[palette.primary, palette.primaryStrong]} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.primaryText}>Rematch</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={async () => { match.reset(); await refreshCredits(); setUiMode('lobby'); }} activeOpacity={0.85}>
            <Text style={styles.secondaryText}>Lobby</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (match.phase === 'cancelled') {
    return (
      <View style={styles.screen}>
        <AmbientBackground tone="danger" />
        <View style={styles.card}>
          <Text style={styles.title}>Match Cancelled</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={async () => { match.reset(); await refreshCredits(); setUiMode('lobby'); }} activeOpacity={0.85}>
            <Text style={styles.secondaryText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LobbyMenu
        playsRemaining={credits}
        walletAddress={wallet.publicKey || ''}
        onBack={onBack}
        onFindRandom={async () => {
          if (lobbyLoading) return;
          setLobbyLoading(true);
          setError(null);
          try {
            await match.joinQueue();
          } catch (e: any) {
            const msg = e?.message || 'Unable to join queue';
            setError(msg);
            Alert.alert('Find Match Failed', msg);
          } finally {
            setLobbyLoading(false);
          }
        }}
        onChallengeFreund={async () => {
          if (lobbyLoading) return;
          setLobbyLoading(true);
          setError(null);
          try {
            await match.createRoom();
          } catch (e: any) {
            const msg = e?.message || 'Unable to create room';
            setError(msg);
            Alert.alert('Create Room Failed', msg);
          } finally {
            setLobbyLoading(false);
          }
        }}
        onJoinWithCode={() => setUiMode('join_code')}
        onViewHistory={() => setUiMode('history')}
        onViewLeaderboard={() => setUiMode('leaderboard')}
        onTopUp={async () => {
          try {
            const balance = await topUpCredits();
            setCredits(balance);
          } catch (e: any) {
            Alert.alert('Top Up Failed', e?.message || 'Could not top up');
          }
        }}
        onRefreshCredits={refreshCredits}
      />
      {lobbyLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text style={styles.loadingLabel}>Connecting...</Text>
          </View>
        </View>
      )}
      {error && !lobbyLoading ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panel,
    padding: 20,
    alignItems: 'center',
    ...shadows.medium,
  },
  title: { color: palette.text, fontFamily: fonts.display, fontSize: 34, marginBottom: 4 },
  subtitle: { color: palette.muted, fontFamily: fonts.body, fontSize: 14, marginTop: 10 },
  small: { color: palette.muted, fontFamily: fonts.body, fontSize: 13, marginTop: 3 },

  primaryWrap: { width: '100%', borderRadius: 14, overflow: 'hidden', marginTop: 14 },
  primaryBtn: { paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 20 },

  secondaryBtn: {
    width: '100%',
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panelSoft,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { color: palette.muted, fontFamily: fonts.body, fontSize: 14 },

  icon: { color: palette.text, fontFamily: fonts.display, fontSize: 28, marginBottom: 10 },
  track: {
    width: '100%',
    height: 16,
    borderRadius: 10,
    backgroundColor: palette.bgAlt,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    overflow: 'hidden',
  },
  fill: { width: '100%', height: '100%' },

  drawScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.bg },
  drawText: { color: palette.text, fontFamily: fonts.display, fontSize: 110, letterSpacing: 1 },

  metricsRow: { marginTop: 12, width: '100%', flexDirection: 'row', gap: 8 },
  metric: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panelSoft,
    alignItems: 'center',
    paddingVertical: 10,
  },
  metricLabel: { color: palette.tertiary, fontFamily: fonts.mono, fontSize: 10 },
  metricValue: { color: palette.text, fontFamily: fonts.display, fontSize: 21, marginTop: 3 },
  good: { color: palette.success, fontFamily: fonts.body, fontSize: 13, marginTop: 8 },

  errorBanner: {
    position: 'absolute',
    zIndex: 30,
    top: 58,
    left: 20,
    right: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,90,122,0.95)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: { color: '#fff', fontFamily: fonts.body, fontSize: 13, textAlign: 'center' },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  loadingBox: {
    backgroundColor: palette.panel,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    ...shadows.medium,
  },
  loadingLabel: {
    color: palette.muted,
    fontFamily: fonts.body,
    fontSize: 14,
  },
});
