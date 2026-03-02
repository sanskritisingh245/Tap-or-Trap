import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { AmbientBackground } from '../components/AmbientBackground';
import { TierBadge, getTierColor } from '../components/TierBadge';
import { fonts, palette, fs } from '../theme/ui';
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
    try {
      const bal = await topUpCredits();
      setCredits(bal);
    } catch {}
  };

  const address = wallet.publicKey || '';
  const username = deriveUsername(address);

  return (
    <View style={styles.screen}>
      <AmbientBackground tone="cool" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>SETTINGS</Text>

        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.username}>{username}</Text>
              {stats && <TierBadge tier={stats.tier} size="small" />}
            </View>
          </View>

          {/* XP Bar */}
          {stats && (
            <View style={styles.xpSection}>
              <View style={styles.xpHeader}>
                <Text style={styles.xpLabel}>{stats.xp} XP</Text>
                <Text style={styles.xpNext}>
                  {stats.nextTier ? `${stats.xpToNext} to ${stats.nextTier}` : 'MAX TIER'}
                </Text>
              </View>
              <View style={styles.xpTrack}>
                <View
                  style={[
                    styles.xpFill,
                    {
                      width: stats.nextTier
                        ? `${Math.min(((stats.xpThreshold - stats.xpToNext) / stats.xpThreshold) * 100, 100)}%`
                        : '100%',
                      backgroundColor: getTierColor(stats.tier),
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Wallet Card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>WALLET</Text>
          <Text style={styles.walletAddress}>
            {address.slice(0, 8)}...{address.slice(-8)}
          </Text>
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

        {/* Disconnect */}
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
  title: {
    color: palette.text,
    fontFamily: fonts.display,
    fontSize: fs(28),
    marginBottom: 16,
  },
  card: {
    borderRadius: 18,
    backgroundColor: palette.panel,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontFamily: fonts.display,
    fontSize: fs(22),
  },
  profileInfo: {
    flexDirection: 'column',
    gap: 4,
  },
  username: {
    color: palette.text,
    fontFamily: fonts.display,
    fontSize: fs(20),
  },
  xpSection: { marginTop: 14 },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpLabel: { color: palette.text, fontFamily: fonts.mono, fontSize: fs(12) },
  xpNext: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(10) },
  xpTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.bgAlt,
    overflow: 'hidden',
  },
  xpFill: { height: '100%', borderRadius: 4 },
  sectionLabel: {
    color: palette.muted,
    fontFamily: fonts.mono,
    fontSize: fs(11),
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  walletAddress: {
    color: palette.text,
    fontFamily: fonts.mono,
    fontSize: fs(14),
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  statItem: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  statValue: {
    color: palette.text,
    fontFamily: fonts.display,
    fontSize: fs(18),
  },
  statLabel: {
    color: palette.muted,
    fontFamily: fonts.mono,
    fontSize: fs(10),
    marginTop: 2,
  },
  actionsCard: {
    borderRadius: 18,
    backgroundColor: palette.panel,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  actionIcon: { fontSize: fs(20) },
  actionText: {
    flex: 1,
    color: palette.text,
    fontFamily: fonts.body,
    fontSize: fs(15),
  },
  actionArrow: { color: palette.muted, fontSize: fs(16) },
  divider: {
    height: 1,
    backgroundColor: palette.bgAlt,
    marginHorizontal: 16,
  },
  disconnectBtn: {
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  disconnectText: {
    color: palette.danger,
    fontFamily: fonts.display,
    fontSize: fs(15),
  },
});
