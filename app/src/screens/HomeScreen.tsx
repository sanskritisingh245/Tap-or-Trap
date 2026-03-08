import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { getCreditsBalance, getPlayerStats, claimDailyLogin } from '../services/api';
import { fonts, palette, shadows } from '../theme/ui';
import type { Screen } from '../../App';

interface Props {
  onNavigate: (screen: Screen) => void;
  wallet: {
    publicKey: string | null;
    connected: boolean;
    loading: boolean;
    depositing?: boolean;
    connect: () => Promise<void>;
    deposit?: () => Promise<string>;
  };
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function HomeScreen({ onNavigate, wallet }: Props) {
  const [credits, setCredits] = useState(0);
  const [tier, setTier] = useState('BRONZE');
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [bal, stats] = await Promise.all([getCreditsBalance(), getPlayerStats()]);
      setCredits(bal);
      setTier(stats.tier);
      setXp(stats.xp);
    } catch {}
  }, []);

  useEffect(() => {
    if (!wallet.connected) return;
    loadData();
    claimDailyLogin().then((d) => setStreak(d.streak)).catch(() => {});
  }, [wallet.connected, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (!wallet.connected) {
    return (
      <View style={styles.connectScreen}>
        <LinearGradient colors={[palette.bgAlt, palette.bg]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
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
              } catch {}
            }}
            disabled={wallet.loading}
            activeOpacity={0.88}
          >
            <LinearGradient colors={['#2A355C', '#132144']} style={[styles.primaryBtn, styles.connectPrimaryBtn]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              {wallet.loading ? (
                <ActivityIndicator color={palette.buttonText} />
              ) : (
                <View style={styles.primaryInner}>
                  <Text style={styles.primaryMeta}>GET STARTED</Text>
                  <Text style={[styles.primaryBtnText, styles.connectPrimaryBtnText]}>Connect Wallet</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[palette.bgAlt, palette.bg]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.panel}>
          <View style={styles.headerRow}>
            <View style={{ width: 42 }} />
            <TouchableOpacity
              style={styles.topChip}
              onPress={async () => {
                console.log('[HOME] Top Up chip pressed');
                try {
                  if (!wallet.deposit) { console.log('[HOME] No deposit function'); return; }
                  console.log('[HOME] Calling wallet.deposit()...');
                  await wallet.deposit();
                  console.log('[HOME] deposit() returned, refreshing balance...');
                  const b = await getCreditsBalance();
                  console.log('[HOME] New balance:', b);
                  setCredits(b);
                } catch (e: any) {
                  console.error('[HOME] Top Up FAILED:', e?.message, e?.stack);
                  Alert.alert('Top Up Failed', e?.message || 'Could not top up credits');
                }
              }}
              disabled={wallet.depositing}
              activeOpacity={0.86}
            >
              <Text style={styles.topChipText}>{wallet.depositing ? 'Processing...' : 'Top Up +'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.middleContent}>
            <View style={styles.heroBlock}>
              <Text style={styles.heroTitle}>TapRush</Text>
              <Text style={styles.heroSub}>1v1 reaction duel</Text>
              <View style={styles.heroDivider} />
            </View>
            <View style={styles.heroGap} />

            <View style={styles.balanceCard}>
              <View>
                <Text style={styles.balanceLabel}>CREDITS</Text>
                <Text style={styles.balanceValue}>{credits}</Text>
              </View>
              <Text style={styles.balanceMeta}>{xp} XP</Text>
            </View>

            <View style={styles.statsRow}>
              <StatTile label="Tier" value={tier} />
              <StatTile label="Streak" value={`${streak}d`} />
              <StatTile label="Mode" value="TapRush" />
            </View>
          </View>

          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.primaryWrap} onPress={() => onNavigate('taprush')} activeOpacity={0.9}>
              <LinearGradient colors={['#2A355C', '#132144']} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.primaryInner}>
                  <Text style={styles.primaryMeta}>TAPRUSH MODE</Text>
                  <Text style={styles.primaryBtnText}>Play Now</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryWrap} onPress={() => onNavigate('missions')} activeOpacity={0.9}>
              <LinearGradient colors={['#E8C58F', '#CAA069']} style={styles.secondaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.secondaryInner}>
                  <Text style={styles.secondaryMeta}>DAILY</Text>
                  <Text style={styles.secondaryBtnText}>Claim Rewards</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.utilityRow}>
              <TouchableOpacity style={styles.utilityCard} onPress={() => onNavigate('taprush')} activeOpacity={0.86}>
                <Text style={styles.utilityMeta}>RANK</Text>
                <Text style={styles.utilityLabel}>Leaderboard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.utilityCard} onPress={() => onNavigate('taprush')} activeOpacity={0.86}>
                <Text style={styles.utilityMeta}>LOG</Text>
                <Text style={styles.utilityLabel}>Match History</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.utilityCard}
                onPress={async () => {
                  console.log('[HOME] BOOST Top Up pressed');
                  try {
                    if (!wallet.deposit) { console.log('[HOME] No deposit function'); return; }
                    console.log('[HOME] Calling wallet.deposit()...');
                    await wallet.deposit();
                    console.log('[HOME] deposit() returned, refreshing balance...');
                    const b = await getCreditsBalance();
                    console.log('[HOME] New balance:', b);
                    setCredits(b);
                  } catch (e: any) {
                    console.error('[HOME] BOOST Top Up FAILED:', e?.message, e?.stack);
                    Alert.alert('Top Up Failed', e?.message || 'Could not top up credits');
                  }
                }}
                disabled={wallet.depositing}
                activeOpacity={0.86}
              >
                <Text style={styles.utilityMeta}>BOOST</Text>
                <Text style={styles.utilityLabel}>{wallet.depositing ? 'Wait...' : 'Top Up'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 56, paddingBottom: 20 },

  connectScreen: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
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
  connectTitle: {
    marginTop: 5,
    color: '#F2DFC5',
    fontFamily: fonts.display,
    fontSize: 44,
    lineHeight: 46,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  connectSub: { marginTop: 6, color: 'rgba(220,197,162,0.76)', fontFamily: fonts.body, fontSize: 14 },
  connectDivider: {
    marginTop: 12,
    width: 112,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(232, 197, 143, 0.35)',
  },

  panel: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 10,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', minHeight: 42 },
  topChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(205, 167, 109, 0.5)',
    backgroundColor: 'rgba(232, 197, 143, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topChipText: { color: '#E6CEA8', fontFamily: fonts.body, fontSize: 14 },

  middleContent: { flex: 1, justifyContent: 'center', paddingTop: 14 },
  heroBlock: {
    alignItems: 'center',
    marginTop: -10,
    marginBottom: 10,
  },
  heroTitle: { color: '#F2DFC5', fontFamily: fonts.display, fontSize: 48, lineHeight: 50 },
  heroSub: { marginTop: 6, color: palette.muted, fontFamily: fonts.body, fontSize: 14 },
  heroDivider: {
    marginTop: 14,
    width: 104,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(230, 206, 168, 0.35)',
  },

  heroGap: { height: 42 },

  balanceCard: {
    marginTop: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(220, 194, 151, 0.4)',
    backgroundColor: 'rgba(231, 210, 175, 0.18)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  balanceLabel: { color: '#E6CEA8', fontFamily: fonts.mono, fontSize: 10 },
  balanceValue: { marginTop: 3, color: '#F7EAD7', fontFamily: fonts.display, fontSize: 28, lineHeight: 30 },
  balanceMeta: { color: '#E6CEA8', fontFamily: fonts.body, fontSize: 14 },

  statsRow: { marginTop: 14, flexDirection: 'row', gap: 10 },
  statTile: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(151, 171, 205, 0.28)',
    backgroundColor: 'rgba(28, 44, 68, 0.92)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  statLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: 10 },
  statValue: { marginTop: 4, color: palette.text, fontFamily: fonts.display, fontSize: 16 },

  bottomActions: { marginTop: 'auto', paddingTop: 22 },
  primaryWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#111936',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 6,
  },
  connectPrimaryWrap: {
    marginTop: 24,
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(248, 234, 206, 0.18)',
    shadowColor: '#0F1735',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    elevation: 8,
  },
  primaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(224,198,159,0.4)',
  },
  connectPrimaryBtn: {
    paddingVertical: 15,
    minWidth: '100%',
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: 'rgba(240, 219, 186, 0.48)',
  },
  primaryInner: { alignItems: 'center' },
  primaryMeta: {
    color: 'rgba(243, 226, 200, 0.72)',
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  primaryBtnText: { color: '#F3E2C8', fontFamily: fonts.display, fontSize: 24, lineHeight: 26 },
  connectPrimaryBtnText: { fontSize: 32, lineHeight: 34 },

  secondaryWrap: { marginTop: 12, borderRadius: 14, overflow: 'hidden' },
  secondaryBtn: {
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(84, 57, 26, 0.28)',
  },
  secondaryInner: { alignItems: 'center' },
  secondaryMeta: {
    color: 'rgba(77,53,32,0.66)',
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  secondaryBtnText: { color: '#4D3520', fontFamily: fonts.display, fontSize: 19, lineHeight: 21 },

  utilityRow: { marginTop: 14, flexDirection: 'row', gap: 10 },
  utilityCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(151, 171, 205, 0.18)',
    backgroundColor: 'rgba(25, 38, 58, 0.92)',
    paddingVertical: 13,
    alignItems: 'center',
  },
  utilityMeta: {
    color: 'rgba(220,197,162,0.62)',
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  utilityLabel: { color: '#DCC5A2', fontFamily: fonts.body, fontSize: 12 },
});
