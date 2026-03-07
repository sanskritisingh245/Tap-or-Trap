import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getPlayerStats, getOnlinePlayers, claimDailyLogin, PlayerStats, OnlinePlayer } from '../services/api';
import { deriveUsername } from '../utils/username';
import { fonts, palette, shadows } from '../theme/ui';

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

function xpToLevel(xp: number): number {
  return Math.max(1, Math.floor(xp / 10) + 1);
}

export function LobbyMenu({
  playsRemaining,
  onFindRandom,
  onChallengeFreund,
  onJoinWithCode,
  onTopUp,
  onRefreshCredits,
  onViewHistory,
  onViewLeaderboard,
  onBack,
  walletAddress,
}: LobbyMenuProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);

  useEffect(() => {
    onRefreshCredits();
    getPlayerStats().then(setStats).catch(() => {});
    getOnlinePlayers().then(setOnlinePlayers).catch(() => {});
    claimDailyLogin().then((res) => {
      if (!res.alreadyClaimed) onRefreshCredits();
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      getOnlinePlayers().then(setOnlinePlayers).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const user = useMemo(() => deriveUsername(walletAddress), [walletAddress]);
  const level = xpToLevel(stats?.xp ?? 0);
  const loadingCredits = playsRemaining === null;
  const lowCredits = !loadingCredits && playsRemaining <= 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[palette.bgAlt, palette.bg, palette.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          {onBack ? (
            <TouchableOpacity style={styles.iconBtn} onPress={onBack} activeOpacity={0.85}>
              <Text style={styles.iconGlyph}>‹</Text>
            </TouchableOpacity>
          ) : <View style={styles.iconPlaceholder} />}
          <Text style={styles.brand}>TAPRUSH</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={onTopUp} activeOpacity={0.85}>
            <Text style={styles.iconGlyph}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View>
            <Text style={styles.user}>{user}</Text>
            <Text style={styles.wallet}>{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</Text>
          </View>
          <View style={styles.levelChip}>
            <Text style={styles.levelText}>Lv {level}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>PLAYS</Text>
            {loadingCredits ? (
              <ActivityIndicator color={palette.primary} size="small" />
            ) : (
              <Text style={[styles.statValue, lowCredits && { color: palette.warning }]}>{playsRemaining}</Text>
            )}
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>ONLINE</Text>
            <Text style={styles.statValue}>{onlinePlayers.length}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>WINRATE</Text>
            <Text style={styles.statValue}>{stats ? `${stats.winRate}%` : '-'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, lowCredits && styles.primaryButtonMuted]}
          onPress={lowCredits ? onTopUp : onFindRandom}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={lowCredits ? [palette.warning, '#D89A33'] : [palette.primary, palette.primaryStrong]}
            style={styles.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.primaryText}>{lowCredits ? 'TOP UP PLAYS' : 'FIND MATCH'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.secondaryGrid}>
          <TouchableOpacity style={styles.secondaryCard} onPress={onChallengeFreund} activeOpacity={0.85}>
            <Text style={[styles.secondaryIcon, { color: palette.accent }]}>◉</Text>
            <Text style={styles.secondaryTitle}>Create Room</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryCard} onPress={onJoinWithCode} activeOpacity={0.85}>
            <Text style={[styles.secondaryIcon, { color: palette.primary }]}>⌁</Text>
            <Text style={styles.secondaryTitle}>Join Code</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryCard} onPress={onViewLeaderboard} activeOpacity={0.85}>
            <Text style={[styles.secondaryIcon, { color: palette.warning }]}>★</Text>
            <Text style={styles.secondaryTitle}>Leaderboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryCard} onPress={onViewHistory} activeOpacity={0.85}>
            <Text style={[styles.secondaryIcon, { color: palette.text }]}>◷</Text>
            <Text style={styles.secondaryTitle}>History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 30 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: { width: 34, height: 34 },
  iconGlyph: {
    color: palette.text,
    fontFamily: fonts.display,
    fontSize: 18,
    lineHeight: 18,
  },
  brand: {
    color: palette.text,
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 0.8,
  },

  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panel,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    ...shadows.subtle,
  },
  user: { color: palette.text, fontFamily: fonts.display, fontSize: 20 },
  wallet: { marginTop: 4, color: palette.muted, fontFamily: fonts.mono, fontSize: 11 },
  levelChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: palette.fillPrimary,
    borderWidth: 1,
    borderColor: palette.panelStroke,
  },
  levelText: { color: palette.primary, fontFamily: fonts.mono, fontSize: 11 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statPill: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panelSoft,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statLabel: { color: palette.tertiary, fontFamily: fonts.mono, fontSize: 10, marginBottom: 3 },
  statValue: { color: palette.text, fontFamily: fonts.display, fontSize: 19 },

  primaryButton: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    ...shadows.medium,
  },
  primaryButtonMuted: {
    ...shadows.subtle,
  },
  primaryGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryText: {
    color: palette.buttonText,
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: 0.8,
  },

  secondaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondaryCard: {
    width: '48.8%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panel,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  secondaryIcon: {
    fontFamily: fonts.display,
    fontSize: 14,
    lineHeight: 14,
  },
  secondaryTitle: { color: palette.text, fontFamily: fonts.body, fontSize: 13 },
});
