import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Image, ImageSourcePropType,
  Animated, Pressable,
} from 'react-native';

import { AmbientBackground } from '../components/AmbientBackground';
import { TierBadge } from '../components/TierBadge';
import { getCreditsBalance, topUpCredits, getPlayerStats, claimDailyLogin } from '../services/api';
import { deriveUsername } from '../utils/username';
import { fonts, palette, gameColors, fs } from '../theme/ui';
import type { Screen } from '../../App';

interface Props {
  onNavigate: (screen: Screen) => void;
  wallet: {
    publicKey: string | null;
    connected: boolean;
    loading: boolean;
    connect: () => Promise<void>;
  };
}

const GAMES: { id: Screen; name: string; emoji: string; image?: ImageSourcePropType; desc: string; color: string }[] = [
  { id: 'taprush', name: 'TapRush', emoji: '⚡', image: require('../../assets/taprush-banner.jpeg'), desc: 'PvP Quick Draw', color: gameColors.taprush },
  { id: 'coinflip', name: 'Coin Flip', emoji: '🪙', desc: 'Heads or Tails', color: gameColors.coinflip },
  { id: 'dice', name: 'Dice', emoji: '🎲', image: require('../../assets/dice-banner.jpeg'), desc: 'Roll Over/Under', color: gameColors.dice },
  { id: 'mines', name: 'Mines', emoji: '💣', image: require('../../assets/mines-banner.jpeg'), desc: 'Avoid the Boom', color: gameColors.mines },
  { id: 'crash', name: 'Crash', emoji: '🚀', desc: 'Cash Out in Time', color: gameColors.crash },
];

function ImageGameCard({ game, onPress }: { game: typeof GAMES[number]; onPress: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(40)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(textSlide, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(textSlide, { toValue: 40, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable
      style={[styles.gameCard, styles.imageCard]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {/* Background image — fills entire card */}
      <Image source={game.image!} style={styles.cardBgImage} resizeMode="cover" />
      {/* Dark translucent overlay — only on hover/press */}
      <Animated.View style={[styles.cardOverlay, { opacity: anim }]} />
      {/* Text container — slides up from below on hover/press */}
      <Animated.View style={[styles.cardTextWrap, { opacity: anim, transform: [{ translateY: textSlide }] }]}>
        <Text style={[styles.cardName, { color: game.color }]}>{game.name}</Text>
        <Text style={styles.cardDesc}>{game.desc}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function HomeScreen({ onNavigate, wallet }: Props) {
  const [credits, setCredits] = useState<number>(0);
  const [tier, setTier] = useState('BRONZE');
  const [xp, setXp] = useState(0);
  const [xpToNext, setXpToNext] = useState(100);
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

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
  }, [wallet.connected]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (!wallet.connected) {
    return (
      <View style={styles.screen}>
        <AmbientBackground tone="cool" />
        <View style={styles.center}>
          <Text style={styles.logo}>TAPRUSH</Text>
          <Text style={styles.tagline}>Bet. Play. Win.</Text>
          <Text style={styles.subtitle}>Provably fair gaming on Solana</Text>
          <TouchableOpacity
            style={styles.connectBtn}
            onPress={async () => {
              try { await wallet.connect(); } catch {}
            }}
            disabled={wallet.loading}
            activeOpacity={0.86}
          >
            {wallet.loading ? (
              <ActivityIndicator color={palette.buttonText} />
            ) : (
              <Text style={styles.connectText}>CONNECT WALLET</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const xpPct = xpToNext > 0 ? Math.min((xp % (xp + xpToNext)) / (xpToNext + (xp % (xp + xpToNext))), 1) : 1;

  return (
    <View style={styles.screen}>
      <AmbientBackground tone="cool" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <TouchableOpacity style={styles.avatar} onPress={() => onNavigate('settings')} activeOpacity={0.7}>
              <Text style={styles.avatarText}>
                {deriveUsername(wallet.publicKey || '').charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
            <TierBadge tier={tier} size="small" />
            {streak > 1 && <Text style={styles.streak}>🔥 {streak}d</Text>}
          </View>
          <TouchableOpacity
            style={styles.creditBox}
            onPress={async () => {
              try { const b = await topUpCredits(); setCredits(b); } catch {}
            }}
          >
            <Text style={styles.creditAmount}>{credits}</Text>
            <Text style={styles.creditLabel}>CREDITS</Text>
          </TouchableOpacity>
        </View>

        {/* XP Bar */}
        <View style={styles.xpBar}>
          <View style={[styles.xpFill, { width: `${xpPct * 100}%` }]} />
        </View>
        <Text style={styles.xpText}>{xp} XP — {xpToNext} to next tier</Text>

        {/* Game Grid */}
        <Text style={styles.sectionTitle}>GAMES</Text>
        <View style={styles.grid}>
          {GAMES.map(game =>
            game.image ? (
              <ImageGameCard key={game.id} game={game} onPress={() => onNavigate(game.id)} />
            ) : (
              <TouchableOpacity
                key={game.id}
                style={[styles.gameCard, { borderColor: game.color + '60' }]}
                onPress={() => onNavigate(game.id)}
                activeOpacity={0.85}
              >
                <View style={[styles.gameGlow, { backgroundColor: game.color + '15' }]} />
                <Text style={styles.gameEmoji}>{game.emoji}</Text>
                <Text style={[styles.gameName, { color: game.color }]}>{game.name}</Text>
                <Text style={styles.gameDesc}>{game.desc}</Text>
              </TouchableOpacity>
            )
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  logo: { color: palette.primaryStrong, fontFamily: fonts.display, fontSize: fs(52), letterSpacing: 2 },
  tagline: { color: palette.text, fontFamily: fonts.body, fontSize: fs(18), marginTop: 4 },
  subtitle: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(12), marginTop: 4 },
  connectBtn: {
    marginTop: 28, width: '100%', borderRadius: 24,
    backgroundColor: palette.primaryStrong, paddingVertical: 16, alignItems: 'center',
    shadowColor: palette.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  connectText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: fs(20) },
  scroll: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: fs(20) },
  username: { color: palette.text, fontFamily: fonts.display, fontSize: fs(22) },
  streak: { color: palette.warning, fontFamily: fonts.mono, fontSize: fs(11) },
  creditBox: {
    borderRadius: 14, borderWidth: 0,
    backgroundColor: palette.primaryStrong, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center',
    shadowColor: palette.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 2,
  },
  creditAmount: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: fs(20) },
  creditLabel: { color: '#FFFFFF', fontFamily: fonts.mono, fontSize: fs(10) },
  xpBar: {
    height: 6, borderRadius: 3, backgroundColor: palette.bgAlt,
    overflow: 'hidden', marginBottom: 4,
  },
  xpFill: { height: '100%', backgroundColor: palette.primary, borderRadius: 3 },
  xpText: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(10), marginBottom: 14 },
  sectionTitle: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(11), marginBottom: 10, letterSpacing: 1.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gameCard: {
    width: '47.5%',
    borderRadius: 20,
    borderWidth: 0,
    backgroundColor: palette.panel,
    padding: 18,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  gameGlow: {
    position: 'absolute', top: -20, left: -20, right: -20, height: 80,
    borderRadius: 40,
  },
  gameEmoji: { fontSize: fs(36), marginBottom: 8 },
  gameName: { fontFamily: fonts.display, fontSize: fs(16) },
  gameDesc: { color: palette.muted, fontFamily: fonts.body, fontSize: fs(11), marginTop: 2 },
  // Image card styles
  imageCard: {
    padding: 0,
    height: 160,
  },
  cardBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: 'rgba(10, 14, 26, 0.75)',
  },
  cardTextWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    alignItems: 'center',
  },
  cardName: {
    fontFamily: fonts.display,
    fontSize: fs(20),
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  cardDesc: {
    color: '#FFFFFF',
    fontFamily: fonts.body,
    fontSize: fs(12),
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
