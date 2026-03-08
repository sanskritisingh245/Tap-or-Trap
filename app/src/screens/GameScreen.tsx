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

function QueueBotPrompt({ queueStartTime, onPlayBot }: { queueStartTime: number | null; onPlayBot: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    if (!queueStartTime) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - queueStartTime) / 1000);
      const left = Math.max(0, 5 - elapsed);
      setSecondsLeft(left);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [queueStartTime]);

  if (secondsLeft > 0) {
    return <Text style={{ color: 'rgba(220,197,162,0.5)', fontFamily: fonts.mono, fontSize: 12, marginTop: 12 }}>Searching... {secondsLeft}s</Text>;
  }

  return (
    <TouchableOpacity style={styles.botSuggestBtn} onPress={onPlayBot} activeOpacity={0.85}>
      <Text style={styles.botSuggestText}>No match found — Play vs Bot?</Text>
    </TouchableOpacity>
  );
}

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
        <View style={styles.connectCard}>
          <Text style={styles.connectKicker}>PREMIUM DUEL</Text>
          <Text style={styles.connectTitle}>TapRush</Text>
          <Text style={styles.connectSub}>Competitive reaction duels</Text>
          <View style={styles.connectDivider} />
          <TouchableOpacity
            style={[styles.primaryWrap, styles.connectPrimaryWrap]}
            onPress={async () => {
              try {
                await wallet.connect();
                await refreshCredits();
              } catch {}
            }}
            disabled={wallet.loading}
            activeOpacity={0.88}
          >
            <LinearGradient colors={['#2A355C', '#132144']} style={[styles.primaryBtn, styles.connectPrimaryBtn]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              {wallet.loading ? <ActivityIndicator color={palette.buttonText} /> : <Text style={[styles.primaryText, styles.connectPrimaryText]}>Connect Wallet</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (uiMode === 'join_code' && match.phase !== 'standoff' && match.phase !== 'draw' && match.phase !== 'waiting_result' && match.phase !== 'result') {
    return (
      <RoomJoiner
        onJoin={async (code) => {
          setJoinError(null);
          setJoinLoading(true);
          try {
            await match.joinRoom(code);
            setUiMode('game');
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
          <QueueBotPrompt
            queueStartTime={match.queueStartTime}
            onPlayBot={async () => {
              await match.leaveQueue();
              await match.joinBot();
            }}
          />
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
          {match.isBot && <Text style={styles.botLabel}>vs Bot</Text>}
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
          {match.isBot && <Text style={styles.botLabel}>vs Bot</Text>}
          <Text style={styles.small}>{line}</Text>
          <Text style={styles.small}>{deriveUsername(opponent || '')}</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metric}><Text style={styles.metricLabel}>You</Text><Text style={styles.metricValue}>{reaction !== null && reaction >= 0 ? `${Math.round(reaction)}ms` : '-'}</Text></View>
            <View style={styles.metric}><Text style={styles.metricLabel}>Them</Text><Text style={styles.metricValue}>{opponentReaction !== null && opponentReaction >= 0 ? `${Math.round(opponentReaction)}ms` : '-'}</Text></View>
          </View>

          {won && currentStreak >= 2 ? <Text style={styles.good}>{currentStreak} win streak</Text> : null}
          {bestReaction !== null && reaction !== null && reaction > 0 && reaction <= bestReaction ? <Text style={styles.good}>New personal best</Text> : null}

          <TouchableOpacity style={styles.primaryWrap} onPress={async () => {
            const wasBot = match.isBot;
            match.reset(); await refreshCredits();
            try { wasBot ? await match.joinBot() : await match.joinQueue(); } catch { setUiMode('lobby'); }
          }} activeOpacity={0.88}>
            <LinearGradient colors={['#2A355C', '#132144']} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
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
        onPlayBot={async () => {
          if (lobbyLoading) return;
          setLobbyLoading(true);
          setError(null);
          try {
            await match.joinBot();
          } catch (e: any) {
            const msg = e?.message || 'Unable to start bot match';
            setError(msg);
            Alert.alert('Bot Match Failed', msg);
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
    borderColor: 'rgba(151, 171, 205, 0.26)',
    backgroundColor: 'rgba(22, 34, 54, 0.94)',
    padding: 20,
    alignItems: 'center',
    ...shadows.medium,
  },
  connectCard: {
    borderRadius: 26,
    borderWidth: 1.2,
    borderColor: 'rgba(228, 203, 164, 0.32)',
    backgroundColor: 'rgba(18, 30, 49, 0.92)',
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#050b1c',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.42,
    shadowRadius: 24,
    elevation: 10,
  },
  connectKicker: { color: 'rgba(220,197,162,0.7)', fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.3 },
  connectTitle: { color: '#F2DFC5', fontFamily: fonts.display, fontSize: 44, marginBottom: 4 },
  connectSub: { marginTop: 2, color: 'rgba(220,197,162,0.76)', fontFamily: fonts.body, fontSize: 14 },
  connectDivider: {
    marginTop: 12,
    width: 112,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(232, 197, 143, 0.35)',
  },
  title: { color: '#F2DFC5', fontFamily: fonts.display, fontSize: 34, marginBottom: 4 },
  subtitle: { color: 'rgba(220,197,162,0.72)', fontFamily: fonts.body, fontSize: 14, marginTop: 10 },
  small: { color: 'rgba(220,197,162,0.72)', fontFamily: fonts.body, fontSize: 13, marginTop: 3 },

  primaryWrap: { width: '100%', borderRadius: 14, overflow: 'hidden', marginTop: 14 },
  connectPrimaryWrap: {
    marginTop: 26,
    width: '100%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(248, 234, 206, 0.18)',
    shadowColor: '#0F1735',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    elevation: 8,
  },
  primaryBtn: { paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(224,198,159,0.4)' },
  connectPrimaryBtn: {
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: 'rgba(240, 219, 186, 0.48)',
  },
  primaryText: { color: '#F3E2C8', fontFamily: fonts.display, fontSize: 20 },
  connectPrimaryText: { fontSize: 30, lineHeight: 32 },

  secondaryBtn: {
    width: '100%',
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(84, 57, 26, 0.28)',
    backgroundColor: 'rgba(232, 197, 143, 0.9)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { color: '#4D3520', fontFamily: fonts.display, fontSize: 14 },

  botSuggestBtn: {
    width: '100%',
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(83, 226, 210, 0.35)',
    backgroundColor: 'rgba(83, 226, 210, 0.1)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  botSuggestText: { color: '#53E2D2', fontFamily: fonts.body, fontSize: 14 },

  botLabel: {
    color: '#53E2D2',
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(83, 226, 210, 0.3)',
    backgroundColor: 'rgba(83, 226, 210, 0.08)',
    overflow: 'hidden',
  },

  icon: { color: '#F2DFC5', fontFamily: fonts.display, fontSize: 28, marginBottom: 10 },
  track: {
    width: '100%',
    height: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(12, 24, 40, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(151, 171, 205, 0.24)',
    overflow: 'hidden',
  },
  fill: { width: '100%', height: '100%' },

  drawScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.bg },
  drawText: { color: '#F3E2C8', fontFamily: fonts.display, fontSize: 110, letterSpacing: 1 },

  metricsRow: { marginTop: 12, width: '100%', flexDirection: 'row', gap: 8 },
  metric: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(151, 171, 205, 0.25)',
    backgroundColor: 'rgba(25, 38, 58, 0.92)',
    alignItems: 'center',
    paddingVertical: 10,
  },
  metricLabel: { color: 'rgba(220,197,162,0.62)', fontFamily: fonts.mono, fontSize: 10 },
  metricValue: { color: '#F3E2C8', fontFamily: fonts.display, fontSize: 21, marginTop: 3 },
  good: { color: '#CFE9D2', fontFamily: fonts.body, fontSize: 13, marginTop: 8 },

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
    backgroundColor: 'rgba(22, 34, 54, 0.96)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(151, 171, 205, 0.26)',
    padding: 28,
    alignItems: 'center',
    gap: 12,
    ...shadows.medium,
  },
  loadingLabel: {
    color: 'rgba(220,197,162,0.72)',
    fontFamily: fonts.body,
    fontSize: 14,
  },
});
