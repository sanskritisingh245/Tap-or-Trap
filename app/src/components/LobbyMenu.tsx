import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getPlayerStats, getOnlinePlayers, claimDailyLogin, PlayerStats, OnlinePlayer } from '../services/api';
import { deriveUsername } from '../utils/username';
import { fonts, palette } from '../theme/ui';

interface LobbyMenuProps {
  playsRemaining: number | null;
  onFindRandom: () => void;
  onPlayBot: () => void;
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

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function LobbyMenu({
  playsRemaining,
  onFindRandom,
  onPlayBot,
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
    claimDailyLogin()
      .then((res) => {
        if (!res.alreadyClaimed) onRefreshCredits();
      })
      .catch(() => {});
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
        colors={[palette.bgAlt, palette.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View>
          <View style={styles.headerRow}>
            {onBack ? (
              <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.86}>
                <Text style={styles.backText}>‹</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 38 }} />
            )}
            <View style={{ width: 38 }} />
          </View>

          <View style={styles.brandWrap}>
            <Text style={styles.title}>TapRush</Text>
            <Text style={styles.subtitle}>DUEL LOBBY</Text>
            <View style={styles.titleDivider} />
          </View>

          <View style={styles.balanceCard}>
            <View>
              <Text style={styles.balanceLabel}>PLAYS</Text>
              {loadingCredits ? (
                <ActivityIndicator color={palette.primary} />
              ) : (
                <Text style={[styles.balanceValue, lowCredits && { color: '#F7C883' }]}>{playsRemaining}</Text>
              )}
            </View>
            <View style={styles.balanceRight}>
              <Text style={styles.balanceMeta}>{onlinePlayers.length} online</Text>
              <Text style={styles.balanceMeta}>{stats?.xp ?? 0} XP</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatTile label="Tier" value={stats?.tier || 'BRONZE'} />
            <StatTile label="Streak" value={`${stats?.currentStreak ?? 0}d`} />
            <StatTile label="Level" value={`Lv ${level}`} />
          </View>
        </View>

        <View style={styles.actionsWrap}>
          <TouchableOpacity style={styles.primaryWrap} onPress={lowCredits ? onTopUp : onFindRandom} activeOpacity={0.9}>
            <LinearGradient
              colors={lowCredits ? ['#E8C58F', '#CAA069'] : ['#2A355C', '#132144']}
              style={styles.primaryBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.primaryMeta}>{lowCredits ? 'REFILL' : 'MATCHMAKING'}</Text>
              <Text style={styles.primaryText}>{lowCredits ? 'Top Up Plays' : 'Play Now'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryCard} onPress={lowCredits ? onTopUp : onPlayBot} activeOpacity={0.9}>
            <Text style={styles.secondaryMeta}>PRACTICE</Text>
            <Text style={styles.secondaryText}>Play vs Bot</Text>
          </TouchableOpacity>

          <View style={styles.secondaryRow}>
            <TouchableOpacity style={styles.secondaryCard} onPress={onChallengeFreund} activeOpacity={0.86}>
              <Text style={styles.secondaryMeta}>PRIVATE</Text>
              <Text style={styles.secondaryText}>Create Room</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryCard} onPress={onJoinWithCode} activeOpacity={0.86}>
              <Text style={styles.secondaryMeta}>INVITE</Text>
              <Text style={styles.secondaryText}>Join Code</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.utilityRow}>
            <TouchableOpacity style={styles.utilityCard} onPress={onViewLeaderboard} activeOpacity={0.86}>
              <Text style={styles.utilityMeta}>RANK</Text>
              <Text style={styles.utilityText}>Leaderboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.utilityCard} onPress={onViewHistory} activeOpacity={0.86}>
              <Text style={styles.utilityMeta}>LOG</Text>
              <Text style={styles.utilityText}>History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 34, paddingBottom: 24 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(151, 171, 205, 0.28)',
    backgroundColor: 'rgba(25, 38, 58, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: '#DCC5A2', fontFamily: fonts.display, fontSize: 20 },
  brandWrap: { marginTop: 28, alignItems: 'center' },
  title: {
    color: '#F2DFC5',
    fontFamily: fonts.display,
    fontSize: 48,
    lineHeight: 50,
    textAlign: 'center',
  },
  subtitle: { marginTop: 6, color: palette.muted, fontFamily: fonts.body, fontSize: 14, textAlign: 'center' },
  titleDivider: {
    marginTop: 14,
    width: 120,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(230, 206, 168, 0.35)',
  },

  balanceCard: {
    marginTop: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(220, 194, 151, 0.4)',
    backgroundColor: 'rgba(231, 210, 175, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  balanceRight: { alignItems: 'flex-end', gap: 4 },
  balanceLabel: { color: '#E6CEA8', fontFamily: fonts.mono, fontSize: 10 },
  balanceValue: { marginTop: 3, color: '#F7EAD7', fontFamily: fonts.display, fontSize: 28, lineHeight: 30 },
  balanceMeta: { color: '#E6CEA8', fontFamily: fonts.body, fontSize: 14 },

  statsRow: { marginTop: 14, flexDirection: 'row', gap: 8 },
  statTile: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(151, 171, 205, 0.28)',
    backgroundColor: 'rgba(28, 44, 68, 0.92)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  statLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: 10 },
  statValue: { marginTop: 4, color: palette.text, fontFamily: fonts.display, fontSize: 16 },

  actionsWrap: { marginTop: 'auto', paddingTop: 28, marginBottom: 34, gap: 10 },
  primaryWrap: { borderRadius: 16, overflow: 'hidden' },
  primaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(224,198,159,0.45)',
  },
  primaryMeta: {
    color: 'rgba(243, 226, 200, 0.7)',
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  primaryText: { color: '#F3E2C8', fontFamily: fonts.display, fontSize: 24, lineHeight: 26 },

  secondaryRow: { flexDirection: 'row', gap: 8 },
  secondaryCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(151, 171, 205, 0.28)',
    backgroundColor: 'rgba(25, 38, 58, 0.92)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryMeta: {
    color: 'rgba(220,197,162,0.62)',
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  secondaryText: { color: '#DCC5A2', fontFamily: fonts.body, fontSize: 12 },

  utilityRow: { flexDirection: 'row', gap: 8 },
  utilityCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(151, 171, 205, 0.28)',
    backgroundColor: 'rgba(25, 38, 58, 0.92)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  utilityMeta: {
    color: 'rgba(220,197,162,0.62)',
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  utilityText: { color: '#DCC5A2', fontFamily: fonts.body, fontSize: 12 },
});
