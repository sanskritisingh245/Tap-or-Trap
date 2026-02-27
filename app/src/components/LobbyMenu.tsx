import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { AmbientBackground } from './AmbientBackground';
import { StatsBar } from './StatsBar';
import { fonts, palette } from '../theme/ui';
import { getPlayerStats, PlayerStats } from '../services/api';

interface LobbyMenuProps {
  playsRemaining: number | null;
  onFindRandom: () => void;
  onChallengeFreund: () => void;
  onJoinWithCode: () => void;
  onTopUp: () => void;
  onRefreshCredits: () => Promise<number>;
  onViewHistory: () => void;
  walletAddress: string;
}

export function LobbyMenu({
  playsRemaining,
  onFindRandom,
  onChallengeFreund,
  onJoinWithCode,
  onTopUp,
  onRefreshCredits,
  onViewHistory,
  walletAddress,
}: LobbyMenuProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    onRefreshCredits();
    getPlayerStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const loading = playsRemaining === null;
  const noPlays = !loading && playsRemaining <= 0;

  return (
    <View style={styles.container}>
      <AmbientBackground tone="cool" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.logo}>SNAPDUEL</Text>
          <Text style={styles.wallet}>{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</Text>
        </View>

        <View style={styles.creditCard}>
          <Text style={styles.creditLabel}>PLAYS</Text>
          {loading ? <ActivityIndicator color={palette.primary} /> : <Text style={[styles.credit, noPlays && styles.creditLow]}>{playsRemaining}</Text>}
        </View>

        {stats && stats.totalMatches > 0 && (
          <StatsBar
            wins={stats.wins}
            losses={stats.losses}
            currentStreak={stats.currentStreak}
            bestReaction={stats.bestReaction}
            winRate={stats.winRate}
          />
        )}

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
            <TouchableOpacity style={styles.bigBtn} onPress={onFindRandom} activeOpacity={0.86}>
              <Text style={styles.bigBtnText}>PLAY</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.smallGrid}>
          <TouchableOpacity style={styles.smallBtn} onPress={onChallengeFreund} activeOpacity={0.86}>
            <Text style={styles.smallIcon}>🤝</Text>
            <Text style={styles.smallText}>FRIEND</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallBtn} onPress={onJoinWithCode} activeOpacity={0.86}>
            <Text style={styles.smallIcon}>🔑</Text>
            <Text style={styles.smallText}>CODE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallBtn} onPress={onViewHistory} activeOpacity={0.86}>
            <Text style={styles.smallIcon}>📜</Text>
            <Text style={styles.smallText}>HISTORY</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  scroll: { paddingTop: 58, paddingHorizontal: 18, paddingBottom: 28 },
  head: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panel,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: { color: palette.text, fontFamily: fonts.display, fontSize: 28, lineHeight: 30 },
  wallet: { color: palette.muted, fontFamily: fonts.mono, fontSize: 11 },
  creditCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panelSoft,
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 10,
  },
  creditLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: 11 },
  credit: { color: palette.success, fontFamily: fonts.display, fontSize: 44, lineHeight: 46 },
  creditLow: { color: palette.danger },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panelSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  quick: { color: palette.text, fontFamily: fonts.body, fontSize: 13 },
  bigBtn: {
    borderRadius: 16,
    backgroundColor: palette.primary,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  refillBtn: { backgroundColor: palette.warning },
  bigBtnText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 34, lineHeight: 36 },
  smallGrid: { flexDirection: 'row', gap: 8 },
  smallBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panel,
    paddingVertical: 12,
    alignItems: 'center',
  },
  smallIcon: { fontSize: 20, marginBottom: 3 },
  smallText: { color: palette.text, fontFamily: fonts.mono, fontSize: 11 },
});
