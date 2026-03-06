import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Image,
  Animated, Pressable, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { getCreditsBalance, topUpCredits, getPlayerStats, claimDailyLogin } from '../services/api';
import { deriveUsername } from '../utils/username';
import { fonts, palette, gradients, shadows } from '../theme/ui';
import type { Screen } from '../../App';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onNavigate: (screen: Screen) => void;
  wallet: {
    publicKey: string | null;
    connected: boolean;
    loading: boolean;
    connect: () => Promise<void>;
  };
}

function QuickStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.quickStat}>
      <Text style={[styles.quickStatValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.quickStatLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen({ onNavigate, wallet }: Props) {
  const [credits, setCredits] = useState<number>(0);
  const [tier, setTier] = useState('BRONZE');
  const [xp, setXp] = useState(0);
  const [xpToNext, setXpToNext] = useState(100);
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const logoScale = useRef(new Animated.Value(1)).current;
  const connectScale = useRef(new Animated.Value(1)).current;
  const playScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!wallet.connected) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(logoScale, { toValue: 1.02, duration: 2000, useNativeDriver: true }),
          Animated.timing(logoScale, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [wallet.connected]);

  const loadData = useCallback(async () => {
    try {
      const [bal, stats] = await Promise.all([getCreditsBalance(), getPlayerStats()]);
      setCredits(bal);
      setTier(stats.tier);
      setXp(stats.xp);
      setXpToNext(stats.xpToNext);
    } catch {}
  }, []);

  useEffect(() => {
    if (wallet.connected) {
      loadData();
      claimDailyLogin().then(d => setStreak(d.streak)).catch(() => {});
    }
  }, [wallet.connected, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Connect screen
  if (!wallet.connected) {
    return (
      <View style={styles.screen}>
        <Image
          source={require('../../assets/TapRush.png')}
          style={styles.connectBgImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.75)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0.3 }}
          end={{ x: 0.5, y: 1 }}
        />
        <View style={styles.center}>
          <View style={{ flex: 1 }} />
          <View style={styles.logoContainer}>
            <Animated.Text style={[styles.connectLogoText, { transform: [{ scale: logoScale }] }]}>
              TAPRUSH
            </Animated.Text>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>BETA</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Fast games. Clean execution.{'\n'}Provably fair outcomes.
          </Text>

          <Pressable
            onPress={async () => { try { await wallet.connect(); } catch {} }}
            disabled={wallet.loading}
            onPressIn={() => Animated.spring(connectScale, { toValue: 0.96, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
            onPressOut={() => Animated.spring(connectScale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
          >
            <Animated.View style={{ transform: [{ scale: connectScale }] }}>
              <LinearGradient
                colors={['#2E3762', '#171E40']}
                style={styles.connectBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {wallet.loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="wallet-outline" size={20} color="#DDBA7C" style={{ marginRight: 8 }} />
                    <Text style={styles.connectText}>Connect Wallet</Text>
                  </>
                )}
              </LinearGradient>
            </Animated.View>
          </Pressable>

          <Text style={styles.connectHint}>Solana wallet required</Text>

          <View style={styles.connectFeatures}>
            <View style={styles.connectFeature}>
              <Ionicons name="flash" size={16} color="#DDBA7C" />
              <Text style={styles.connectFeatureText}>1v1 Reaction Duels</Text>
            </View>
            <View style={styles.connectFeature}>
              <Ionicons name="shield-checkmark" size={16} color="#DDBA7C" />
              <Text style={styles.connectFeatureText}>Provably Fair</Text>
            </View>
            <View style={styles.connectFeature}>
              <Ionicons name="diamond" size={16} color="#DDBA7C" />
              <Text style={styles.connectFeatureText}>On-Chain Settlement</Text>
            </View>
          </View>
          <View style={{ height: 60 }} />
        </View>
      </View>
    );
  }

  const xpPct = xpToNext > 0 ? Math.min(xp / (xp + xpToNext), 1) : 1;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.userName}>{deriveUsername(wallet.publicKey || '')}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifBtn} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={20} color={palette.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatar} onPress={() => onNavigate('settings')} activeOpacity={0.7}>
              <LinearGradient
                colors={['#213743', '#2A4A5A']}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>
                  {deriveUsername(wallet.publicKey || '').charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Strip */}
        <View style={styles.balanceStrip}>
          <View style={styles.balanceLeft}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceAmount}>{credits.toLocaleString()}</Text>
              <Text style={styles.balanceCurrency}> credits</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={async () => { try { const b = await topUpCredits(); setCredits(b); } catch {} }}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={gradients.primaryBtn as [string, string]}
              style={styles.topUpBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="add" size={16} color={palette.buttonText} />
              <Text style={styles.topUpText}>Top Up</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <QuickStat label="Tier" value={tier} color={palette.primary} />
          <QuickStat label="XP" value={`${xp}`} />
          {streak > 0 && <QuickStat label="Streak" value={`${streak}d`} color={palette.warning} />}
          <View style={styles.quickStatXp}>
            <View style={styles.xpBarBg}>
              <LinearGradient
                colors={gradients.primaryBtn as [string, string]}
                style={[styles.xpBarFill, { width: `${xpPct * 100}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          </View>
        </View>

        {/* Play TapRush Hero Card */}
        <Pressable
          onPress={() => onNavigate('taprush')}
          onPressIn={() => Animated.spring(playScale, { toValue: 0.97, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
          onPressOut={() => Animated.spring(playScale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
        >
          <Animated.View style={[styles.heroCard, { transform: [{ scale: playScale }] }]}>
            <Image source={require('../../assets/TapRush.png')} style={styles.heroImage} resizeMode="cover" />
            <View style={styles.heroContent}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE PVP</Text>
              </View>
              <Text style={styles.heroTitle}>TapRush</Text>
              <Text style={styles.heroDesc}>1v1 reaction speed duel. Fastest tap wins.</Text>
              <View style={styles.heroBtn}>
                <LinearGradient
                  colors={gradients.accentBtn as [string, string]}
                  style={styles.playBtnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="flash" size={18} color={palette.buttonText} />
                  <Text style={styles.playBtnText}>Play Now</Text>
                </LinearGradient>
              </View>
            </View>
          </Animated.View>
        </Pressable>

        {/* How It Works */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>How It Works</Text>
        </View>
        <View style={styles.stepsRow}>
          <View style={styles.stepCard}>
            <View style={[styles.stepIcon, { backgroundColor: 'rgba(46,229,246,0.10)' }]}>
              <Ionicons name="people" size={22} color="#2EE5F6" />
            </View>
            <Text style={styles.stepTitle}>Match</Text>
            <Text style={styles.stepDesc}>Find a random opponent or challenge a friend</Text>
          </View>
          <View style={styles.stepCard}>
            <View style={[styles.stepIcon, { backgroundColor: 'rgba(255,184,0,0.10)' }]}>
              <Ionicons name="timer" size={22} color="#FFB800" />
            </View>
            <Text style={styles.stepTitle}>Standoff</Text>
            <Text style={styles.stepDesc}>Hold steady and wait for the draw signal</Text>
          </View>
          <View style={styles.stepCard}>
            <View style={[styles.stepIcon, { backgroundColor: 'rgba(34,197,94,0.10)' }]}>
              <Ionicons name="flash" size={22} color="#22C55E" />
            </View>
            <Text style={styles.stepTitle}>Tap!</Text>
            <Text style={styles.stepDesc}>Fastest reaction wins the credits</Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Features</Text>
        </View>
        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <Ionicons name="shield-checkmark" size={20} color={palette.primary} />
            <Text style={styles.featureTitle}>Provably Fair</Text>
            <Text style={styles.featureDesc}>Commit-reveal draw timing verified on-chain</Text>
          </View>
          <View style={styles.featureCard}>
            <Ionicons name="trophy" size={20} color={palette.warning} />
            <Text style={styles.featureTitle}>Leaderboard</Text>
            <Text style={styles.featureDesc}>Compete for top rank with ELO ratings</Text>
          </View>
          <View style={styles.featureCard}>
            <Ionicons name="link" size={20} color={palette.success} />
            <Text style={styles.featureTitle}>On-Chain</Text>
            <Text style={styles.featureDesc}>Solana settlement with 95% payout</Text>
          </View>
          <View style={styles.featureCard}>
            <Ionicons name="people" size={20} color={palette.purple} />
            <Text style={styles.featureTitle}>Challenge Friends</Text>
            <Text style={styles.featureDesc}>Share a 6-digit code to duel anyone</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  // Connect screen
  connectBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%', height: '100%',
  },
  logoContainer: { alignItems: 'center' },
  connectLogoText: {
    color: '#FFFFFF', fontFamily: fonts.display, fontSize: 48,
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 20,
  },
  logoBadge: {
    backgroundColor: 'rgba(46,55,98,0.7)',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 6, marginTop: 8,
    borderWidth: 1, borderColor: 'rgba(221,186,124,0.25)',
  },
  logoBadgeText: {
    color: '#DDBA7C', fontFamily: fonts.mono, fontSize: 10,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)', fontFamily: fonts.light, fontSize: 16,
    marginTop: 16, textAlign: 'center', lineHeight: 24,
  },
  connectBtn: {
    marginTop: 32, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 48,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(107,110,207,0.9)',
    shadowColor: '#62EBFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 15, elevation: 8,
  },
  connectText: { color: '#EED8B6', fontFamily: fonts.display, fontSize: 17 },
  connectHint: { color: 'rgba(60,50,40,0.45)', fontFamily: fonts.light, fontSize: 13, marginTop: 12 },
  connectFeatures: {
    flexDirection: 'row', gap: 16, marginTop: 40,
  },
  connectFeature: {
    alignItems: 'center', gap: 6,
  },
  connectFeatureText: {
    color: 'rgba(60,50,40,0.55)', fontFamily: fonts.mono, fontSize: 9,
  },

  // Scroll content
  scroll: { paddingTop: 60, paddingBottom: 120 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 20,
  },
  greeting: { color: palette.muted, fontFamily: fonts.light, fontSize: 14 },
  userName: { color: palette.text, fontFamily: fonts.display, fontSize: 22, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: palette.panel, alignItems: 'center', justifyContent: 'center',
  },
  avatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  avatarGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  avatarText: { color: palette.text, fontFamily: fonts.display, fontSize: 16 },

  // Balance Strip
  balanceStrip: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 20, backgroundColor: palette.panel, borderRadius: 16,
    padding: 16, marginBottom: 12, ...shadows.subtle,
  },
  balanceLeft: {},
  balanceLabel: { color: palette.muted, fontFamily: fonts.light, fontSize: 12 },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  balanceAmount: { color: palette.text, fontFamily: fonts.display, fontSize: 28 },
  balanceCurrency: { color: palette.muted, fontFamily: fonts.light, fontSize: 14 },
  topUpBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  topUpText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 13 },

  // Quick Stats
  quickStats: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 20, marginBottom: 24,
  },
  quickStat: {
    backgroundColor: palette.panel, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  quickStatValue: { color: palette.text, fontFamily: fonts.display, fontSize: 14 },
  quickStatLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: 9, marginTop: 2 },
  quickStatXp: { flex: 1 },
  xpBarBg: {
    height: 6, borderRadius: 3, backgroundColor: palette.panelSoft,
    overflow: 'hidden',
  },
  xpBarFill: { height: '100%', borderRadius: 3 },

  // Hero Card
  heroCard: {
    marginHorizontal: 20, borderRadius: 20, overflow: 'hidden',
    height: 240, backgroundColor: palette.panel, marginBottom: 28,
    ...shadows.medium,
  },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20,
    backgroundColor: 'rgba(15,33,46,0.6)',
  },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, marginBottom: 8,
    backgroundColor: 'rgba(46,229,246,0.15)',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2EE5F6' },
  liveText: { fontFamily: fonts.mono, fontSize: 11, color: '#2EE5F6' },
  heroTitle: { color: palette.text, fontFamily: fonts.display, fontSize: 30 },
  heroDesc: { color: 'rgba(255,255,255,0.6)', fontFamily: fonts.light, fontSize: 14, marginTop: 4 },
  heroBtn: { marginTop: 12 },
  playBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
    alignSelf: 'flex-start',
  },
  playBtnText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 15 },

  // Section headers
  sectionHeader: {
    paddingHorizontal: 20, marginBottom: 12,
  },
  sectionTitle: { color: palette.text, fontFamily: fonts.display, fontSize: 18 },

  // How It Works steps
  stepsRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, marginBottom: 28,
  },
  stepCard: {
    flex: 1, backgroundColor: palette.panel, borderRadius: 14,
    padding: 14, alignItems: 'center', ...shadows.subtle,
  },
  stepIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  stepTitle: { color: palette.text, fontFamily: fonts.display, fontSize: 13, marginBottom: 4 },
  stepDesc: { color: palette.muted, fontFamily: fonts.light, fontSize: 11, textAlign: 'center', lineHeight: 15 },

  // Features grid
  featuresGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 20, marginBottom: 20,
  },
  featureCard: {
    width: (SCREEN_WIDTH - 50) / 2, backgroundColor: palette.panel, borderRadius: 14,
    padding: 16, ...shadows.subtle,
  },
  featureTitle: { color: palette.text, fontFamily: fonts.display, fontSize: 13, marginTop: 10, marginBottom: 4 },
  featureDesc: { color: palette.muted, fontFamily: fonts.light, fontSize: 11, lineHeight: 15 },
});
