import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Animated, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from './AmbientBackground';
import { StatsBar } from './StatsBar';
import { TierBadge, getTierColor } from './TierBadge';
import { DailyChallenges } from './DailyChallenges';
import { fonts, palette, shadows } from '../theme/ui';
import { getPlayerStats, claimDailyLogin, PlayerStats } from '../services/api';

interface LobbyMenuProps {
  playsRemaining: number | null;
  onFindRandom: () => void;
  onChallengeFreund: () => void;
  onJoinWithCode: () => void;
  onTopUp: () => void;
  onRefreshCredits: () => Promise<number>;
  onViewHistory: () => void;
  onViewLeaderboard: () => void;
  onBack?: () => void;
  walletAddress: string;
}

export function LobbyMenu({
  playsRemaining, onFindRandom, onChallengeFreund, onJoinWithCode, onTopUp,
  onRefreshCredits, onViewHistory, onViewLeaderboard, onBack, walletAddress,
}: LobbyMenuProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loginReward, setLoginReward] = useState<{ streak: number; reward: number } | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const playBtnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    onRefreshCredits();
    getPlayerStats().then(setStats).catch(() => {});
    claimDailyLogin().then(data => {
      if (!data.alreadyClaimed) {
        setLoginReward({ streak: data.streak, reward: data.reward });
        onRefreshCredits();
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.03, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const loading = playsRemaining === null;
  const noPlays = !loading && playsRemaining! <= 0;

  return (
    <View style={styles.container}>
      <AmbientBackground tone="cool" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.logo}>TAPRUSH</Text>
          <View style={styles.headRight}>
            {stats && <TierBadge tier={stats.tier} />}
            <Text style={styles.wallet}>{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</Text>
          </View>
        </View>

        {stats && (
          <View style={styles.xpCard}>
            <View style={styles.xpHeader}>
              <Text style={styles.xpLabel}>{stats.xp} XP</Text>
              <Text style={styles.xpNext}>
                {stats.nextTier ? `${stats.xpToNext} to ${stats.nextTier}` : 'MAX TIER'}
              </Text>
            </View>
            <View style={styles.xpTrack}>
              <LinearGradient
                colors={[getTierColor(stats.tier), getTierColor(stats.tier) + '80']}
                style={[styles.xpFill, {
                  width: stats.nextTier
                    ? `${Math.min(((stats.xpThreshold - stats.xpToNext) / stats.xpThreshold) * 100, 100)}%`
                    : '100%',
                }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
            </View>
          </View>
        )}

        {loginReward && (
          <LinearGradient
            colors={['rgba(255,184,0,0.15)', 'rgba(255,184,0,0.05)']}
            style={styles.loginBanner}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.loginText}>
              Day {loginReward.streak} streak! +{loginReward.reward} play{loginReward.reward > 1 ? 's' : ''}
            </Text>
          </LinearGradient>
        )}

        <LinearGradient
          colors={['rgba(59,130,246,0.15)', 'rgba(59,130,246,0.05)']}
          style={styles.creditCard}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        >
          <Text style={styles.creditLabel}>PLAYS</Text>
          {loading ? <ActivityIndicator color={palette.primary} /> : <Text style={[styles.credit, noPlays && styles.creditLow]}>{playsRemaining}</Text>}
        </LinearGradient>

        {stats && stats.totalMatches > 0 && (
          <StatsBar
            wins={stats.wins} losses={stats.losses}
            currentStreak={stats.currentStreak}
            bestReaction={stats.bestReaction} winRate={stats.winRate}
          />
        )}

        <DailyChallenges />

        <View style={styles.quickRow}>
          <Text style={styles.quick}>🧊 HOLD</Text>
          <Text style={styles.quick}>👀 WAIT</Text>
          <Text style={styles.quick}>⚡ TAP</Text>
        </View>

        {noPlays ? (
          <TouchableOpacity style={[styles.bigBtn, styles.refillBtn]} onPress={onTopUp} activeOpacity={0.86}>
            <Text style={styles.bigBtnText}>+5 PLAYS</Text>
          </TouchableOpacity>
        ) : (
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              onPress={onFindRandom}
              onPressIn={() => Animated.spring(playBtnScale, { toValue: 0.96, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
              onPressOut={() => Animated.spring(playBtnScale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
            >
              <Animated.View style={{ transform: [{ scale: playBtnScale }] }}>
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={[styles.bigBtn, shadows.glow(palette.primary)]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.bigBtnText}>PLAY</Text>
                </LinearGradient>
              </Animated.View>
            </Pressable>
          </Animated.View>
        )}

        <View style={styles.smallGrid}>
          {[
            { icon: '🤝', label: 'FRIEND', action: onChallengeFreund },
            { icon: '🔑', label: 'CODE', action: onJoinWithCode },
            { icon: '🏆', label: 'RANKS', action: onViewLeaderboard },
            { icon: '📜', label: 'HISTORY', action: onViewHistory },
          ].map(item => (
            <TouchableOpacity key={item.label} style={styles.smallBtn} onPress={item.action} activeOpacity={0.86}>
              <Text style={styles.smallIcon}>{item.icon}</Text>
              <Text style={styles.smallText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  scroll: { paddingTop: 58, paddingHorizontal: 18, paddingBottom: 28 },
  head: {
    borderRadius: 12, backgroundColor: palette.panel, padding: 16, marginBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    ...shadows.medium,
  },
  backBtn: { marginRight: 8, paddingHorizontal: 4 },
  backText: { color: palette.muted, fontSize: 22 },
  logo: { color: palette.text, fontFamily: fonts.display, fontSize: 28, lineHeight: 30 },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wallet: { color: palette.muted, fontFamily: fonts.mono, fontSize: 11 },
  xpCard: { borderRadius: 16, backgroundColor: palette.panelSoft, padding: 12, marginBottom: 10 },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpLabel: { color: palette.text, fontFamily: fonts.mono, fontSize: 12 },
  xpNext: { color: palette.muted, fontFamily: fonts.mono, fontSize: 10 },
  xpTrack: { height: 8, borderRadius: 4, backgroundColor: palette.bgAlt, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 4 },
  loginBanner: { borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 10, alignItems: 'center' },
  loginText: { color: palette.warning, fontFamily: fonts.body, fontSize: 13 },
  creditCard: { borderRadius: 12, alignItems: 'center', paddingVertical: 14, marginBottom: 10 },
  creditLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: 11 },
  credit: { color: palette.primaryStrong, fontFamily: fonts.display, fontSize: 44, lineHeight: 46 },
  creditLow: { color: palette.danger },
  quickRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderRadius: 16, backgroundColor: palette.panelSoft, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
  },
  quick: { color: palette.text, fontFamily: fonts.body, fontSize: 13 },
  bigBtn: { borderRadius: 14, paddingVertical: 20, alignItems: 'center', marginBottom: 10 },
  refillBtn: { backgroundColor: palette.warning },
  bigBtnText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 34, lineHeight: 36 },
  smallGrid: { flexDirection: 'row', gap: 8 },
  smallBtn: {
    flex: 1, borderRadius: 16, backgroundColor: palette.panel,
    paddingVertical: 12, alignItems: 'center', ...shadows.subtle,
  },
  smallIcon: { fontSize: 20, marginBottom: 3 },
  smallText: { color: palette.text, fontFamily: fonts.mono, fontSize: 11 },
});
