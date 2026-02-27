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
import { useMatch } from '../hooks/useMatch';
import { useAccelerometer } from '../hooks/useAccelerometer';
import { useWallet } from '../hooks/useWallet';
import { LobbyMenu } from '../components/LobbyMenu';
import { RoomCreator } from '../components/RoomCreator';
import { RoomJoiner } from '../components/RoomJoiner';
import { getCreditsBalance, topUpCredits } from '../services/api';
import { deriveUsername } from '../utils/username';

type UIMode = 'lobby' | 'join_code' | 'game';

export default function GameScreen() {
  const wallet = useWallet();
  const match = useMatch();
  const { isStill } = useAccelerometer(match.phase === 'standoff');

  const [uiMode, setUiMode] = useState<UIMode>('lobby');
  const [credits, setCredits] = useState<number | null>(null); // null = loading
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  // Pulse animation for standoff
  useEffect(() => {
    if (match.phase === 'standoff') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [match.phase]);

  // Shake animation for moving warning
  useEffect(() => {
    if (match.phase === 'standoff' && !isStill) {
      const shake = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ])
      );
      shake.start();
      return () => shake.stop();
    }
  }, [match.phase, isStill]);

  // Refresh credits
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

  // ─── Phase 0: Connect Wallet ─────────────────────────────────────

  if (!wallet.connected) {
    return (
      <View style={styles.connectScreen}>
        <Animated.View style={[styles.connectContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>⚡</Text>
            <Text style={styles.logoTitle}>SNAP</Text>
            <Text style={styles.logoTitleAccent}>DUEL</Text>
          </View>
          <Text style={styles.tagline}>Quick-Draw Showdowns on Solana</Text>

          <View style={styles.featureRow}>
            <View style={styles.featurePill}>
              <Text style={styles.featurePillText}>🎯 React Fast</Text>
            </View>
            <View style={styles.featurePill}>
              <Text style={styles.featurePillText}>⚔️ 1v1 Duels</Text>
            </View>
            <View style={styles.featurePill}>
              <Text style={styles.featurePillText}>🏆 Win SOL</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.connectButton}
            onPress={async () => {
              try {
                await wallet.connect();
                await refreshCredits();
              } catch (e) {
                console.error('Connect error:', e);
              }
            }}
            disabled={wallet.loading}
            activeOpacity={0.8}
          >
            {wallet.loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.connectText}>⚡ Connect Wallet</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ─── Join with Code UI ────────────────────────────────────────────

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

  // ─── Game phases ──────────────────────────────────────────────────

  // Phase: Waiting in room (friend challenge)
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

  // Phase: Queued (finding random opponent)
  if (match.phase === 'queued') {
    return (
      <View style={styles.queueScreen}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Text style={styles.queueIcon}>🔍</Text>
        </Animated.View>
        <Text style={styles.queueTitle}>SEARCHING...</Text>
        <Text style={styles.queueSub}>Finding a worthy opponent</Text>
        <View style={styles.queueDots}>
          <ActivityIndicator size="large" color="#9945FF" />
        </View>
        <TouchableOpacity
          style={styles.queueCancelBtn}
          onPress={async () => {
            await match.leaveQueue();
            setUiMode('lobby');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.queueCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Phase: STANDOFF — dark screen, hold still, tension builds
  if (match.phase === 'standoff') {
    return (
      <Pressable style={styles.standoffScreen} onPress={match.handleTap}>
        <Animated.View style={[styles.standoffContent, { transform: [{ scale: pulseAnim }, { translateX: shakeAnim }] }]}>
          <Text style={styles.standoffIcon}>🤠</Text>
          <Text style={styles.standoffTitle}>
            {isStill ? 'HOLD STEADY...' : '⚠️ HOLD STILL!'}
          </Text>
          {!isStill && (
            <Animated.Text style={[styles.standoffWarning, { transform: [{ translateX: shakeAnim }] }]}>
              Phone is moving!
            </Animated.Text>
          )}
          <Text style={styles.standoffHint}>Wait for the signal...</Text>
        </Animated.View>
        <View style={styles.standoffEdge} />
      </Pressable>
    );
  }

  // Phase: DRAW — TAP NOW! Bright explosive screen
  if (match.phase === 'draw') {
    return (
      <Pressable style={styles.drawScreen} onPress={match.handleTap}>
        <Text style={styles.drawIcon}>💥</Text>
        <Text style={styles.drawTitle}>DRAW!</Text>
        <Text style={styles.drawSub}>TAP NOW!</Text>
      </Pressable>
    );
  }

  // Phase: FORFEIT (early tap)
  if (match.phase === 'forfeit') {
    return (
      <View style={styles.forfeitScreen}>
        <Text style={styles.forfeitIcon}>💀</Text>
        <Text style={styles.forfeitTitle}>TOO EARLY!</Text>
        <Text style={styles.forfeitSub}>You drew before the signal</Text>
        <ActivityIndicator color="#FF4444" size="large" style={{ marginTop: 32 }} />
      </View>
    );
  }

  // Phase: Waiting for result
  if (match.phase === 'waiting_result') {
    return (
      <View style={styles.waitingScreen}>
        <Text style={styles.waitingIcon}>⏳</Text>
        <Text style={styles.waitingTitle}>CALCULATING...</Text>
        <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 24 }} />
      </View>
    );
  }

  // Phase: Result
  if (match.phase === 'result' && match.result) {
    const { won, reaction, opponent, forfeitReason } = match.result;
    return (
      <View style={[styles.resultScreen, won ? styles.resultWinBg : styles.resultLoseBg]}>
        <Text style={styles.resultIcon}>{won ? '🏆' : '😵'}</Text>
        <Text style={[styles.resultTitle, won ? styles.resultWinText : styles.resultLoseText]}>
          {won ? 'VICTORY!' : 'DEFEATED'}
        </Text>
        <View style={styles.resultCard}>
          <Text style={styles.resultVs}>
            vs. {deriveUsername(opponent || '')}
          </Text>
          {reaction !== null && reaction >= 0 && (
            <View style={styles.reactionBox}>
              <Text style={styles.reactionLabel}>Your Reaction</Text>
              <Text style={styles.reactionValue}>{Math.round(reaction)}ms</Text>
            </View>
          )}
          {forfeitReason && (
            <Text style={styles.forfeitReasonText}>{forfeitReason}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.playAgainBtn, won ? styles.playAgainWin : styles.playAgainLose]}
          onPress={async () => {
            match.reset();
            await refreshCredits();
            setUiMode('lobby');
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.playAgainText}>⚡ Play Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Phase: Cancelled
  if (match.phase === 'cancelled') {
    return (
      <View style={styles.cancelledScreen}>
        <Text style={styles.cancelledIcon}>🚫</Text>
        <Text style={styles.cancelledTitle}>Match Cancelled</Text>
        <Text style={styles.cancelledSub}>Credits have been refunded</Text>
        <TouchableOpacity
          style={styles.cancelledBtn}
          onPress={async () => {
            match.reset();
            await refreshCredits();
            setUiMode('lobby');
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelledBtnText}>Back to Lobby</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Lobby (default) ──────────────────────────────────────────────

  return (
    <LobbyMenu
      playsRemaining={credits}
      walletAddress={wallet.publicKey || ''}
      onFindRandom={async () => {
        try {
          setUiMode('game');
          await match.joinQueue();
        } catch (e) {
          console.warn('joinQueue failed:', e);
          setUiMode('lobby');
        }
      }}
      onChallengeFreund={async () => {
        try {
          setUiMode('game');
          await match.createRoom();
        } catch (e) {
          console.warn('createRoom failed:', e);
          setUiMode('lobby');
        }
      }}
      onJoinWithCode={() => setUiMode('join_code')}
      onTopUp={async () => {
        try {
          const newBalance = await topUpCredits();
          setCredits(newBalance);
        } catch (e) {
          console.warn('topUp failed:', e);
        }
      }}
      onRefreshCredits={refreshCredits}
    />
  );
}

const styles = StyleSheet.create({
  // ─── Connect Screen ───────────────────────────────────────────
  connectScreen: {
    flex: 1,
    backgroundColor: '#0B0B1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  connectContent: {
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoIcon: {
    fontSize: 40,
    marginRight: 8,
  },
  logoTitle: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  logoTitleAccent: {
    fontSize: 52,
    fontWeight: '900',
    color: '#14F195',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: '#7B7BA0',
    marginBottom: 32,
    letterSpacing: 1,
  },
  featureRow: {
    flexDirection: 'row',
    marginBottom: 48,
    gap: 8,
  },
  featurePill: {
    backgroundColor: 'rgba(153, 69, 255, 0.15)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(153, 69, 255, 0.3)',
  },
  featurePillText: {
    color: '#C4A0FF',
    fontSize: 12,
    fontWeight: '600',
  },
  connectButton: {
    backgroundColor: '#9945FF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#9945FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  connectText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // ─── Queue Screen ─────────────────────────────────────────────
  queueScreen: {
    flex: 1,
    backgroundColor: '#0B0B1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  queueIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  queueTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3,
  },
  queueSub: {
    color: '#7B7BA0',
    fontSize: 16,
    marginTop: 8,
  },
  queueDots: {
    marginTop: 32,
  },
  queueCancelBtn: {
    marginTop: 48,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.4)',
  },
  queueCancelText: {
    color: '#FF6666',
    fontSize: 16,
    fontWeight: '600',
  },

  // ─── Standoff Screen ──────────────────────────────────────────
  standoffScreen: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  standoffContent: {
    alignItems: 'center',
  },
  standoffIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  standoffTitle: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  standoffWarning: {
    color: '#FF4444',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  standoffHint: {
    color: '#333',
    fontSize: 14,
    marginTop: 24,
    letterSpacing: 1,
  },
  standoffEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#FFD700',
    opacity: 0.3,
  },

  // ─── Draw Screen ──────────────────────────────────────────────
  drawScreen: {
    flex: 1,
    backgroundColor: '#14F195',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawIcon: {
    fontSize: 80,
    marginBottom: 8,
  },
  drawTitle: {
    color: '#000',
    fontSize: 80,
    fontWeight: '900',
    letterSpacing: 6,
  },
  drawSub: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },

  // ─── Forfeit Screen ───────────────────────────────────────────
  forfeitScreen: {
    flex: 1,
    backgroundColor: '#1A0000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  forfeitIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  forfeitTitle: {
    color: '#FF4444',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 2,
  },
  forfeitSub: {
    color: '#FF8888',
    fontSize: 18,
    marginTop: 12,
  },

  // ─── Waiting Screen ───────────────────────────────────────────
  waitingScreen: {
    flex: 1,
    backgroundColor: '#0B0B1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  waitingIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  waitingTitle: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // ─── Result Screen ────────────────────────────────────────────
  resultScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  resultWinBg: {
    backgroundColor: '#071A12',
  },
  resultLoseBg: {
    backgroundColor: '#1A0710',
  },
  resultIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 3,
  },
  resultWinText: {
    color: '#14F195',
  },
  resultLoseText: {
    color: '#FF4444',
  },
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  resultVs: {
    color: '#8888AA',
    fontSize: 18,
    fontWeight: '600',
  },
  reactionBox: {
    marginTop: 16,
    alignItems: 'center',
  },
  reactionLabel: {
    color: '#7B7BA0',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reactionValue: {
    color: '#14F195',
    fontSize: 36,
    fontWeight: '900',
    marginTop: 4,
  },
  forfeitReasonText: {
    color: '#FF8888',
    fontSize: 14,
    marginTop: 12,
  },
  playAgainBtn: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    marginTop: 32,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  playAgainWin: {
    backgroundColor: '#14F195',
    shadowColor: '#14F195',
  },
  playAgainLose: {
    backgroundColor: '#9945FF',
    shadowColor: '#9945FF',
  },
  playAgainText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // ─── Cancelled Screen ─────────────────────────────────────────
  cancelledScreen: {
    flex: 1,
    backgroundColor: '#0B0B1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  cancelledIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  cancelledTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  cancelledSub: {
    color: '#7B7BA0',
    fontSize: 16,
    marginTop: 8,
  },
  cancelledBtn: {
    backgroundColor: '#1E1E3A',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    width: '100%',
    marginTop: 48,
    borderWidth: 1,
    borderColor: 'rgba(153, 69, 255, 0.3)',
  },
  cancelledBtnText: {
    color: '#9945FF',
    fontSize: 18,
    fontWeight: '700',
  },
});
