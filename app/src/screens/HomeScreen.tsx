import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Image, ImageSourcePropType,
  Animated, Pressable, TextInput, FlatList, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { AmbientBackground } from '../components/AmbientBackground';
import { getCreditsBalance, topUpCredits, getPlayerStats, claimDailyLogin } from '../services/api';
import { deriveUsername } from '../utils/username';
import { fonts, palette, gameColors, gradients, shadows } from '../theme/ui';
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

const GAMES: { id: Screen; name: string; image?: ImageSourcePropType; desc: string; color: string; stat: string; gradient: string[]; icon: string; players: number }[] = [
  { id: 'taprush', name: 'TapRush', image: require('../../assets/TapRush.png'), desc: 'PvP reaction duel', color: gameColors.taprush, stat: 'LIVE PVP', gradient: gradients.cardTaprush, icon: 'flash', players: 847 },
  { id: 'coinflip', name: 'Coin Flip', image: require('../../assets/CoinFlip.png'), desc: 'Classic 50/50', color: gameColors.coinflip, stat: '1.96x', gradient: gradients.cardCoinflip, icon: 'cash', players: 1243 },
  { id: 'dice', name: 'Dice', image: require('../../assets/DIce.png'), desc: 'Risk-managed rolls', color: gameColors.dice, stat: 'CUSTOM EDGE', gradient: gradients.cardDice, icon: 'dice', players: 632 },
  { id: 'mines', name: 'Mines', image: require('../../assets/Mines.png'), desc: 'Progressive cashout', color: gameColors.mines, stat: 'UP TO 24x', gradient: gradients.cardMines, icon: 'warning', players: 891 },
  { id: 'crash', name: 'Crash', image: require('../../assets/Crash.png'), desc: 'Exit before the bust', color: gameColors.crash, stat: 'REAL-TIME', gradient: gradients.cardCrash, icon: 'trending-up', players: 1567 },
  { id: 'plinko', name: 'Plinko', image: require('../../assets/plinko.jpeg'), desc: 'Drop & multiply', color: gameColors.plinko, stat: 'UP TO 110x', gradient: gradients.cardPlinko, icon: 'apps', players: 2134 },
  { id: 'limbo', name: 'Limbo', image: require('../../assets/Limbo.jpeg'), desc: 'Set your target', color: gameColors.limbo, stat: 'INSTANT', gradient: gradients.cardLimbo, icon: 'rocket', players: 1876 },
  { id: 'keno', name: 'Keno', image: require('../../assets/keno.jpeg'), desc: 'Pick & win big', color: gameColors.keno, stat: 'UP TO 10000x', gradient: gradients.cardKeno, icon: 'grid', players: 943 },
  { id: 'wheel', name: 'Wheel', image: require('../../assets/wheel.jpeg'), desc: 'Spin to win', color: gameColors.wheel, stat: 'UP TO 50x', gradient: gradients.cardWheel, icon: 'sync', players: 1654 },
  { id: 'blackjack', name: 'Blackjack', image: require('../../assets/blackjack.jpeg'), desc: 'Beat the dealer', color: gameColors.blackjack, stat: '2.5x BJ', gradient: gradients.cardBlackjack, icon: 'card', players: 2891 },
  { id: 'roulette', name: 'Roulette', image: require('../../assets/Roulette.jpeg'), desc: 'Red, black, or green', color: gameColors.roulette, stat: 'UP TO 36x', gradient: gradients.cardRoulette, icon: 'ellipse', players: 2456 },
  { id: 'hilo', name: 'HiLo', image: require('../../assets/HiLo.jpeg'), desc: 'Higher or lower', color: gameColors.hilo, stat: 'STREAK', gradient: gradients.cardHilo, icon: 'swap-vertical', players: 1298 },
  { id: 'tower', name: 'Tower', image: require('../../assets/Tower.jpeg'), desc: 'Climb for riches', color: gameColors.tower, stat: 'RISK IT ALL', gradient: gradients.cardTower, icon: 'layers', players: 1123 },
  { id: 'slots', name: 'Slots', image: require('../../assets/Slots.jpeg'), desc: 'Classic slot machine', color: gameColors.slots, stat: 'JACKPOT', gradient: gradients.cardSlots, icon: 'diamond', players: 3201 },
  { id: 'dragontower', name: 'Dragon Tower', image: require('../../assets/DragonTower.jpeg'), desc: 'Escape the dragon', color: gameColors.dragontower, stat: 'ADVENTURE', gradient: gradients.cardDragontower, icon: 'flame', players: 1045 },
];

// Auto-scrolling featured carousel (swipes every 5s)
const CAROUSEL_GAP = 12;
const CAROUSEL_WIDTH = SCREEN_WIDTH - 40 - CAROUSEL_GAP;
const CAROUSEL_SNAP = CAROUSEL_WIDTH + CAROUSEL_GAP;
const AUTO_SCROLL_INTERVAL = 2500;

function FeaturedCarousel({ games, onNavigate }: { games: typeof GAMES; onNavigate: (s: Screen) => void }) {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoScroll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % games.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SCROLL_INTERVAL);
  }, [games.length]);

  useEffect(() => {
    startAutoScroll();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startAutoScroll]);

  const onScrollEnd = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_SNAP);
    setActiveIndex(idx);
    // Reset timer on manual swipe
    startAutoScroll();
  };

  const renderCard = ({ item: game }: { item: typeof GAMES[number] }) => (
    <Pressable onPress={() => onNavigate(game.id)} style={{ width: CAROUSEL_WIDTH }}>
      <View style={styles.featuredCard}>
        {game.image ? (
          <Image source={game.image} style={styles.featuredImage} resizeMode="cover" />
        ) : (
          <View style={[styles.featuredGradBg, { backgroundColor: palette.panel }]} />
        )}
        <View style={styles.featuredContent}>
          <View style={[styles.liveBadge, { backgroundColor: game.color + '20' }]}>
            <View style={[styles.liveDot, { backgroundColor: game.color }]} />
            <Text style={[styles.liveText, { color: game.color }]}>{game.players.toLocaleString()} playing</Text>
          </View>
          <Text style={styles.featuredName}>{game.name}</Text>
          <Text style={styles.featuredDesc}>{game.desc}</Text>
          <View style={styles.featuredBtn}>
            <LinearGradient
              colors={gradients.primaryBtn as [string, string]}
              style={styles.playBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.playBtnText}>Play Now</Text>
            </LinearGradient>
          </View>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.carouselWrap}>
      <FlatList
        ref={flatListRef}
        data={games}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        renderItem={renderCard}
        snapToInterval={CAROUSEL_SNAP}
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, index) => ({ length: CAROUSEL_SNAP, offset: CAROUSEL_SNAP * index, index })}
        contentContainerStyle={{ paddingHorizontal: 20, gap: CAROUSEL_GAP }}
      />
      <View style={styles.carouselDots}>
        {games.map((_, i) => (
          <View
            key={i}
            style={[
              styles.carouselDot,
              i === activeIndex && styles.carouselDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ──── Categorized game lists ────
const TRENDING_GAMES = [...GAMES].sort((a, b) => b.players - a.players).slice(0, 8);
const TRENDING_IDS = new Set(TRENDING_GAMES.map(g => g.id));
const CARD_TABLE_IDS = new Set<string>(['blackjack', 'roulette', 'hilo', 'coinflip']);
const CARD_TABLE_GAMES = GAMES.filter(g => CARD_TABLE_IDS.has(g.id));
const INSTANT_WIN_IDS = new Set<string>(['limbo', 'dice', 'coinflip', 'wheel', 'slots', 'keno']);
const INSTANT_WIN_GAMES = GAMES.filter(g => INSTANT_WIN_IDS.has(g.id));
const ORIGINALS_GAMES = GAMES.filter(g => !TRENDING_IDS.has(g.id) && !CARD_TABLE_IDS.has(g.id) && !INSTANT_WIN_IDS.has(g.id)).concat(
  GAMES.filter(g => (CARD_TABLE_IDS.has(g.id) || INSTANT_WIN_IDS.has(g.id)) && !TRENDING_IDS.has(g.id))
).slice(0, 8);

// ──── Reusable horizontal game strip with arrow nav ────
const STRIP_CARD_W = SCREEN_WIDTH * 0.42;
const STRIP_GAP = 12;

function GameStrip({
  title, badge, badgeColor, games, onNavigate,
}: {
  title: string;
  badge?: string;
  badgeColor?: string;
  games: typeof GAMES;
  onNavigate: (s: Screen) => void;
}) {
  const flatRef = useRef<FlatList>(null);
  const [idx, setIdx] = useState(0);
  const maxIdx = Math.max(0, games.length - 2);

  const scrollTo = (dir: -1 | 1) => {
    const next = Math.min(Math.max(idx + dir * 2, 0), maxIdx);
    setIdx(next);
    flatRef.current?.scrollToOffset({ offset: next * (STRIP_CARD_W + STRIP_GAP), animated: true });
  };

  return (
    <View style={styles.stripSection}>
      {/* Header with arrows */}
      <View style={styles.stripHeader}>
        <View style={styles.stripTitleRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {badge && (
            <View style={[styles.stripBadge, { backgroundColor: (badgeColor || palette.danger) + '15' }]}>
              <Text style={[styles.stripBadgeText, { color: badgeColor || palette.danger }]}>{badge}</Text>
            </View>
          )}
        </View>
        <View style={styles.arrowPill}>
          <Pressable onPress={() => scrollTo(-1)} style={[styles.arrowBtn, idx === 0 && styles.arrowDisabled]}>
            <Ionicons name="chevron-back" size={18} color={idx === 0 ? palette.tertiary : palette.text} />
          </Pressable>
          <View style={styles.arrowDivider} />
          <Pressable onPress={() => scrollTo(1)} style={[styles.arrowBtn, idx >= maxIdx && styles.arrowDisabled]}>
            <Ionicons name="chevron-forward" size={18} color={idx >= maxIdx ? palette.tertiary : palette.text} />
          </Pressable>
        </View>
      </View>

      {/* Cards */}
      <FlatList
        ref={flatRef}
        data={games}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.stripList}
        renderItem={({ item }) => (
          <StripCard game={item} onPress={() => onNavigate(item.id)} />
        )}
      />
    </View>
  );
}

// Card used inside GameStrip
function StripCard({ game, onPress }: { game: typeof GAMES[number]; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, damping: 20, stiffness: 300 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 300 }).start()}
    >
      <Animated.View style={[styles.stripCard, { transform: [{ scale }] }]}>
        {game.image ? (
          <Image source={game.image} style={styles.stripCardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.stripCardGrad, { backgroundColor: palette.panel }]}>
            <Ionicons name={game.icon as any} size={36} color={game.color + '50'} />
          </View>
        )}
        <View style={styles.stripCardInfo}>
          <Text style={styles.stripCardName} numberOfLines={1}>{game.name}</Text>
          <View style={styles.stripCardMeta}>
            <View style={[styles.miniDot, { backgroundColor: palette.success }]} />
            <Text style={styles.stripCardPlayers}>{game.players.toLocaleString()}</Text>
            <View style={[styles.stripStatPill, { backgroundColor: game.color + '20' }]}>
              <Text style={[styles.stripStatText, { color: game.color }]}>{game.stat}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// Quick stat pill
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
  const [searchQuery, setSearchQuery] = useState('');

  const logoScale = useRef(new Animated.Value(1)).current;
  const connectScale = useRef(new Animated.Value(1)).current;

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
        <AmbientBackground tone="cool" />
        <View style={styles.center}>
          <View style={styles.logoContainer}>
            <Animated.Text style={[styles.logo, { transform: [{ scale: logoScale }] }]}>
              TapRush
            </Animated.Text>
            <Text style={styles.logoBadge}>BETA</Text>
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
                colors={gradients.primaryBtn as [string, string]}
                style={styles.connectBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {wallet.loading ? (
                  <ActivityIndicator color={palette.buttonText} />
                ) : (
                  <Text style={styles.connectText}>Connect Wallet</Text>
                )}
              </LinearGradient>
            </Animated.View>
          </Pressable>

          <Text style={styles.connectHint}>Solana wallet required</Text>
        </View>
      </View>
    );
  }

  const xpPct = xpToNext > 0 ? Math.min(xp / (xp + xpToNext), 1) : 1;
  const filteredGames = searchQuery
    ? GAMES.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : GAMES;

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

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={palette.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your game"
            placeholderTextColor={palette.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Featured Carousel */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured</Text>
          <Text style={styles.sectionBadge}>HOT</Text>
        </View>
        <FeaturedCarousel games={GAMES} onNavigate={onNavigate} />

        {/* Trending — top 8 by players */}
        <GameStrip
          title="Trending"
          badge="🔥 LIVE"
          badgeColor={palette.danger}
          games={searchQuery ? filteredGames.sort((a, b) => b.players - a.players).slice(0, 8) : TRENDING_GAMES}
          onNavigate={onNavigate}
        />

        {/* Card & Table — blackjack, roulette, hilo, coinflip */}
        <GameStrip
          title="Card & Table"
          badge="♠ CLASSIC"
          badgeColor={palette.success}
          games={searchQuery ? filteredGames.filter(g => CARD_TABLE_IDS.has(g.id)) : CARD_TABLE_GAMES}
          onNavigate={onNavigate}
        />

        {/* Originals — the rest */}
        <GameStrip
          title="Originals"
          badge="⚡ EXCLUSIVE"
          badgeColor={palette.primary}
          games={searchQuery ? filteredGames.filter(g => !TRENDING_IDS.has(g.id)).slice(0, 8) : ORIGINALS_GAMES}
          onNavigate={onNavigate}
        />

        {/* Instant Win — quick-play games */}
        <GameStrip
          title="Instant Win"
          badge="⚡ FAST"
          badgeColor={palette.warning}
          games={searchQuery ? filteredGames.filter(g => INSTANT_WIN_IDS.has(g.id)) : INSTANT_WIN_GAMES}
          onNavigate={onNavigate}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  // Logo / Connect
  logoContainer: { alignItems: 'center' },
  logo: {
    color: palette.text, fontFamily: fonts.display, fontSize: 48,
    textShadowColor: 'rgba(59,130,246,0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 30,
  },
  logoBadge: {
    color: palette.primary, fontFamily: fonts.mono, fontSize: 10,
    backgroundColor: palette.fillPrimary, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 4, marginTop: 8, overflow: 'hidden',
  },
  subtitle: {
    color: palette.muted, fontFamily: fonts.light, fontSize: 16,
    marginTop: 16, textAlign: 'center', lineHeight: 24,
  },
  connectBtn: {
    marginTop: 32, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 48,
    alignItems: 'center', ...shadows.glow('#3B82F6'),
  },
  connectText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 17 },
  connectHint: { color: palette.tertiary, fontFamily: fonts.light, fontSize: 13, marginTop: 12 },

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
    marginHorizontal: 20, marginBottom: 16,
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

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: palette.panel, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: palette.panelStroke,
  },
  searchInput: {
    flex: 1, color: palette.text, fontFamily: fonts.body, fontSize: 14,
    padding: 0,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 12,
  },
  sectionTitle: { color: palette.text, fontFamily: fonts.display, fontSize: 18 },
  sectionBadge: {
    color: palette.danger, fontFamily: fonts.mono, fontSize: 10,
    backgroundColor: 'rgba(255,71,87,0.12)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, overflow: 'hidden',
  },
  sectionCount: { color: palette.muted, fontFamily: fonts.mono, fontSize: 12 },

  // Featured Carousel
  carouselWrap: { marginBottom: 24 },
  carouselDots: {
    flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12,
  },
  carouselDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  carouselDotActive: {
    width: 20, backgroundColor: palette.primary,
  },

  // Featured Card
  featuredCard: {
    borderRadius: 20, overflow: 'hidden',
    height: 200, backgroundColor: palette.panel, ...shadows.medium,
  },
  featuredImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  featuredOverlay: { ...StyleSheet.absoluteFillObject },
  featuredGradBg: { ...StyleSheet.absoluteFillObject },
  featuredContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20,
  },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, marginBottom: 8,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontFamily: fonts.mono, fontSize: 11 },
  featuredName: { color: palette.text, fontFamily: fonts.display, fontSize: 26 },
  featuredDesc: { color: 'rgba(255,255,255,0.6)', fontFamily: fonts.light, fontSize: 14, marginTop: 4 },
  featuredBtn: { marginTop: 12 },
  playBtnGrad: {
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10,
    alignSelf: 'flex-start',
  },
  playBtnText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 14 },

  // ─── Game Strip (reusable section with arrow nav) ───
  stripSection: { marginBottom: 24 },
  stripHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 12,
  },
  stripTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stripBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  stripBadgeText: { fontFamily: fonts.mono, fontSize: 10 },

  // Arrow pill (the < > toggle from screenshot)
  arrowPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: palette.panel, borderRadius: 20,
    borderWidth: 1, borderColor: palette.panelStroke,
    overflow: 'hidden',
  },
  arrowBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
  },
  arrowDisabled: { opacity: 0.35 },
  arrowDivider: { width: 1, height: 20, backgroundColor: palette.panelStroke },

  // Strip cards
  stripList: { paddingHorizontal: 20, gap: STRIP_GAP },
  stripCard: {
    width: STRIP_CARD_W, borderRadius: 14, overflow: 'hidden',
    backgroundColor: palette.panel, ...shadows.subtle,
  },
  stripCardImage: { width: '100%', height: STRIP_CARD_W * 0.7 },
  stripCardOverlay: { ...StyleSheet.absoluteFillObject, height: STRIP_CARD_W * 0.7 },
  stripCardGrad: {
    width: '100%', height: STRIP_CARD_W * 0.7,
    alignItems: 'center', justifyContent: 'center',
  },
  stripCardInfo: { padding: 10 },
  stripCardName: { color: palette.text, fontFamily: fonts.display, fontSize: 14 },
  stripCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  stripCardPlayers: { color: palette.muted, fontFamily: fonts.mono, fontSize: 10 },
  stripStatPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 'auto' },
  stripStatText: { fontFamily: fonts.mono, fontSize: 8 },

  miniDot: { width: 5, height: 5, borderRadius: 2.5 },
});
