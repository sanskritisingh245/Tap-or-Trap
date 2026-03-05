import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from '../components/AmbientBackground';
import { TierBadge, getTierColor } from '../components/TierBadge';
import { fonts, palette, shadows } from '../theme/ui';
import { getPlayerStats, PlayerStats, topUpCredits, getCreditsBalance } from '../services/api';
import { deriveUsername } from '../utils/username';

interface SettingsScreenProps {
  wallet: {
    publicKey: string | null;
    connected: boolean;
    disconnect: () => Promise<void>;
  };
  onNavigate: (screen: string) => void;
}

export default function SettingsScreen({ wallet, onNavigate }: SettingsScreenProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    if (wallet.connected) {
      getPlayerStats().then(setStats).catch(() => {});
      getCreditsBalance().then(setCredits).catch(() => {});
    }
  }, [wallet.connected]);

  const handleDisconnect = () => {
    Alert.alert('Disconnect Wallet', 'Are you sure you want to disconnect?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => wallet.disconnect() },
    ]);
  };

  const handleTopUp = async () => {
    try { const bal = await topUpCredits(); setCredits(bal); } catch {}
  };

  const address = wallet.publicKey || '';
  const username = deriveUsername(address);
  const tierColor = stats ? getTierColor(stats.tier) : palette.primary;

  return (
    <View style={styles.screen}>
      <AmbientBackground tone="cool" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>SETTINGS</Text>

        {/* Profile Card */}
        <LinearGradient
          colors={[tierColor + '10', 'transparent']}
          style={styles.card}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        >
          <View style={styles.profileRow}>
            <LinearGradient
              colors={[tierColor, tierColor + 'CC']}
              style={styles.avatar}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
            <View style={styles.profileInfo}>
              <Text style={styles.username}>{username}</Text>
              {stats && <TierBadge tier={stats.tier} size="small" />}
            </View>
          </View>

          {stats && (
            <View style={styles.xpSection}>
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
        </LinearGradient>

        {/* Wallet Card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>WALLET</Text>
          <Text style={styles.walletAddress}>{address.slice(0, 8)}...{address.slice(-8)}</Text>
        </View>

        {/* Stats Card */}
        {stats && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>STATS</Text>
            <View style={styles.statsGrid}>
              <StatItem label="Wins" value={String(stats.wins)} />
              <StatItem label="Losses" value={String(stats.losses)} />
              <StatItem label="Win Rate" value={`${stats.winRate}%`} />
              <StatItem label="Best" value={stats.bestReaction ? `${Math.round(stats.bestReaction)}ms` : '-'} />
              <StatItem label="Streak" value={stats.currentStreak > 0 ? `${stats.currentStreak}x` : '-'} />
              <StatItem label="Credits" value={String(credits)} />
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionRow} onPress={handleTopUp} activeOpacity={0.7}>
            <Text style={styles.actionIcon}>💰</Text>
            <Text style={styles.actionText}>Top Up Credits</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} onPress={() => onNavigate('fairness')} activeOpacity={0.7}>
            <Text style={styles.actionIcon}>⛓</Text>
            <Text style={styles.actionText}>Provably Fair</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect} activeOpacity={0.8}>
          <Text style={styles.disconnectText}>DISCONNECT WALLET</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  scroll: { paddingTop: 60, paddingHorizontal: 18, paddingBottom: 100 },
  title: { color: palette.text, fontFamily: fonts.display, fontSize: 28, marginBottom: 16 },
  card: {
    borderRadius: 18, backgroundColor: palette.panel, padding: 18, marginBottom: 12,
    ...shadows.subtle,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 22 },
  profileInfo: { flexDirection: 'column', gap: 4 },
  username: { color: palette.text, fontFamily: fonts.display, fontSize: 20 },
  xpSection: { marginTop: 14 },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpLabel: { color: palette.text, fontFamily: fonts.mono, fontSize: 12 },
  xpNext: { color: palette.muted, fontFamily: fonts.mono, fontSize: 10 },
  xpTrack: { height: 8, borderRadius: 4, backgroundColor: palette.bgAlt, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 4 },
  sectionLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5, marginBottom: 8 },
  walletAddress: { color: palette.text, fontFamily: fonts.mono, fontSize: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  statItem: { width: '33.33%', alignItems: 'center', paddingVertical: 10 },
  statValue: { color: palette.text, fontFamily: fonts.display, fontSize: 18 },
  statLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: 10, marginTop: 2 },
  actionsCard: {
    borderRadius: 18, backgroundColor: palette.panel, overflow: 'hidden', marginBottom: 12,
    ...shadows.subtle,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  actionIcon: { fontSize: 20 },
  actionText: { flex: 1, color: palette.text, fontFamily: fonts.body, fontSize: 15 },
  actionArrow: { color: palette.muted, fontSize: 16 },
  divider: { height: 1, backgroundColor: palette.bgAlt, marginHorizontal: 16 },
  disconnectBtn: {
    borderRadius: 12, backgroundColor: 'rgba(255,71,87,0.16)',
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  disconnectText: { color: palette.danger, fontFamily: fonts.display, fontSize: 15 },
});
