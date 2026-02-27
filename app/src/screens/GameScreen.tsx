import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMatch } from '../hooks/useMatch';
import { useAccelerometer } from '../hooks/useAccelerometer';
import { useWallet } from '../hooks/useWallet';
import { LobbyMenu } from '../components/LobbyMenu';
import { RoomCreator } from '../components/RoomCreator';
import { RoomJoiner } from '../components/RoomJoiner';
import { CountdownReveal } from '../components/CountdownReveal';
import { MatchHistory } from '../components/MatchHistory';
import { AmbientBackground } from '../components/AmbientBackground';
import { getCreditsBalance, topUpCredits } from '../services/api';
import { deriveUsername } from '../utils/username';
import { fonts, palette } from '../theme/ui';

type UIMode = 'lobby' | 'join_code' | 'history' | 'game';

const WIN_TAUNTS = ['NASTY.', 'TOO FAST.', 'CLEAN WIN.'];
const LOSE_TAUNTS = ['OOF.', 'ALMOST.', 'RUN IT BACK.'];

function pickTaunt(won: boolean): string {
  const list = won ? WIN_TAUNTS : LOSE_TAUNTS;
  return list[Math.floor(Math.random() * list.length)];
}

export default function GameScreen() {
  const wallet = useWallet();
  const match = useMatch();
  const { isStill } = useAccelerometer(match.phase === 'standoff');

  const [uiMode, setUiMode] = useState<UIMode>('lobby');
  const [credits, setCredits] = useState<number | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [taunt, setTaunt] = useState('');

  const pulse = useRef(new Animated.Value(1)).current;
  const drawPop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 850, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: true }),
      ])
    );
    p.start();
    return () => p.stop();
  }, []);

  useEffect(() => {
    if (match.phase === 'draw') {
      const pop = Animated.loop(
        Animated.sequence([
          Animated.timing(drawPop, { toValue: 1.08, duration: 140, useNativeDriver: true }),
          Animated.timing(drawPop, { toValue: 1, duration: 140, useNativeDriver: true }),
        ])
      );
      pop.start();
      return () => pop.stop();
    }
  }, [match.phase]);

  useEffect(() => {
    if (match.phase === 'result' && match.result) {
      setShowCountdown(true);
      setTaunt(pickTaunt(match.result.won));
    }
  }, [match.phase]);

  useEffect(() => {
    if (match.phase === 'draw') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (match.phase === 'forfeit') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    if (match.phase === 'result' && match.result?.won) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }, [match.phase]);

  const refreshCredits = useCallback(async () => {
    try {
      const balance = await getCreditsBalance();
      setCredits(balance);
      return balance;
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
          <Text style={styles.title}>SNAPDUEL</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={async () => {
              try {
                await wallet.connect();
                await refreshCredits();
              } catch (e) {
                console.error('Connect error:', e);
              }
            }}
            disabled={wallet.loading}
            activeOpacity={0.86}
          >
            {wallet.loading ? <ActivityIndicator color={palette.buttonText} /> : <Text style={styles.primaryBtnText}>CONNECT</Text>}
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
            setUiMode('game');
          } catch (err: any) {
            setJoinError(err.message);
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
  if (match.phase === 'waiting_room' && match.roomCode) {
    return (
      <RoomCreator
        roomCode={match.roomCode}
        onCancel={async () => {
          await match.cancelRoom();
          setUiMode('lobby');
        }}
      />
    );
  }

  if (match.phase === 'queued') {
    return (
      <View style={styles.screen}>
        <AmbientBackground tone="cool" />
        <Animated.View style={[styles.card, { transform: [{ scale: pulse }] }]}>
          <Text style={styles.icon}>🎯</Text>
          <ActivityIndicator size="large" color={palette.primary} />
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={async () => {
              await match.leaveQueue();
              setUiMode('lobby');
            }}
            activeOpacity={0.86}
          >
            <Text style={styles.secondaryText}>CANCEL</Text>
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
          <Text style={styles.icon}>{isStill ? '🧊' : '📳'}</Text>
          <View style={styles.meterTrack}>
            <View style={[styles.meterFill, isStill ? styles.meterGood : styles.meterBad]} />
          </View>
          <Text style={styles.meterLabel}>{isStill ? 'STEADY' : 'MOVE = LOSE'}</Text>
        </View>
      </Pressable>
    );
  }

  if (match.phase === 'draw') {
    return (
      <Pressable style={styles.drawScreen} onPress={match.handleTap}>
        <AmbientBackground tone="danger" />
        <Animated.Text style={[styles.drawTitle, { transform: [{ scale: drawPop }] }]}>TAP!</Animated.Text>
      </Pressable>
    );
  }

  if (match.phase === 'forfeit') {
    return (
      <View style={styles.screen}>
        <AmbientBackground tone="danger" />
        <View style={styles.card}>
          <Text style={styles.title}>TOO EARLY</Text>
          <Text style={styles.small}>💀</Text>
        </View>
      </View>
    );
  }

  if (match.phase === 'waiting_result') {
    return (
      <View style={styles.screen}>
        <AmbientBackground tone="cool" />
        <View style={styles.card}>
          <Text style={styles.icon}>⏳</Text>
          <ActivityIndicator size="large" color={palette.success} />
        </View>
      </View>
    );
  }

  if (match.phase === 'result' && match.result) {
    if (showCountdown) return <CountdownReveal onComplete={() => setShowCountdown(false)} />;

    const { won, reaction, opponentReaction, opponent, currentStreak, bestReaction } = match.result;
    return (
      <View style={styles.screen}>
        <AmbientBackground tone={won ? 'cool' : 'danger'} />
        <View style={[styles.card, won ? styles.resultWin : styles.resultLose]}>
          <Text style={styles.title}>{won ? 'WIN' : 'LOSE'}</Text>
          <Text style={styles.taunt}>{taunt}</Text>
          <Text style={styles.vs}>{deriveUsername(opponent || '')}</Text>

          <View style={styles.scoreRow}>
            <View style={styles.scoreCol}>
              <Text style={styles.scoreTag}>YOU</Text>
              <Text style={styles.score}>{reaction !== null && reaction >= 0 ? `${Math.round(reaction)}ms` : '-'}</Text>
            </View>
            <View style={styles.scoreCol}>
              <Text style={styles.scoreTag}>THEM</Text>
              <Text style={styles.score}>{opponentReaction !== null && opponentReaction >= 0 ? `${Math.round(opponentReaction)}ms` : '-'}</Text>
            </View>
          </View>

          {won && currentStreak >= 2 ? <Text style={styles.good}>{currentStreak}x STREAK</Text> : null}
          {bestReaction !== null && reaction !== null && reaction > 0 && reaction <= bestReaction ? <Text style={styles.good}>NEW PB</Text> : null}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={async () => {
              match.reset();
              await refreshCredits();
              setUiMode('game');
              try {
                await match.joinQueue();
              } catch {
                setUiMode('lobby');
              }
            }}
            activeOpacity={0.86}
          >
            <Text style={styles.primaryBtnText}>REMATCH</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={async () => {
              match.reset();
              await refreshCredits();
              setUiMode('lobby');
            }}
            activeOpacity={0.86}
          >
            <Text style={styles.secondaryText}>LOBBY</Text>
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
          <Text style={styles.title}>CANCELLED</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={async () => {
              match.reset();
              await refreshCredits();
              setUiMode('lobby');
            }}
            activeOpacity={0.86}
          >
            <Text style={styles.primaryBtnText}>LOBBY</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <LobbyMenu
      playsRemaining={credits}
      walletAddress={wallet.publicKey || ''}
      onFindRandom={async () => {
        try {
          setUiMode('game');
          await match.joinQueue();
        } catch {
          setUiMode('lobby');
        }
      }}
      onChallengeFreund={async () => {
        try {
          setUiMode('game');
          await match.createRoom();
        } catch {
          setUiMode('lobby');
        }
      }}
      onJoinWithCode={() => setUiMode('join_code')}
      onViewHistory={() => setUiMode('history')}
      onTopUp={async () => {
        try {
          const b = await topUpCredits();
          setCredits(b);
        } catch {}
      }}
      onRefreshCredits={refreshCredits}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg, justifyContent: 'center', padding: 18 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panel,
    padding: 18,
    alignItems: 'center',
  },
  title: { color: palette.text, fontFamily: fonts.display, fontSize: 44, lineHeight: 46 },
  small: { marginTop: 8, fontSize: 40 },
  icon: { fontSize: 40, marginBottom: 10 },
  primaryBtn: {
    marginTop: 12,
    width: '100%',
    borderRadius: 14,
    backgroundColor: palette.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 24, lineHeight: 26 },
  secondaryBtn: {
    marginTop: 8,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.bgAlt,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryText: { color: palette.muted, fontFamily: fonts.body, fontSize: 14 },
  meterTrack: {
    marginTop: 4,
    width: '100%',
    height: 18,
    borderRadius: 10,
    backgroundColor: palette.bgAlt,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', width: '100%' },
  meterGood: { backgroundColor: palette.success },
  meterBad: { backgroundColor: palette.danger },
  meterLabel: { marginTop: 8, color: palette.text, fontFamily: fonts.display, fontSize: 28 },
  drawScreen: { flex: 1, backgroundColor: '#2C0F1A', justifyContent: 'center', alignItems: 'center' },
  drawTitle: { color: palette.text, fontFamily: fonts.display, fontSize: 120, lineHeight: 122 },
  taunt: { marginTop: 2, color: palette.muted, fontFamily: fonts.mono, fontSize: 12 },
  vs: { marginTop: 8, color: palette.muted, fontFamily: fonts.body, fontSize: 15 },
  scoreRow: { marginTop: 8, width: '100%', flexDirection: 'row', gap: 8 },
  scoreCol: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panelSoft,
    paddingVertical: 8,
    alignItems: 'center',
  },
  scoreTag: { color: palette.muted, fontFamily: fonts.mono, fontSize: 10 },
  score: { color: palette.text, fontFamily: fonts.display, fontSize: 23 },
  good: { marginTop: 6, color: palette.success, fontFamily: fonts.mono, fontSize: 12 },
  resultWin: { borderColor: 'rgba(142, 242, 138, 0.5)' },
  resultLose: { borderColor: 'rgba(255, 125, 157, 0.5)' },
});
