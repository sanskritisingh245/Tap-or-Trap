import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Animated, Pressable, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getTierColor } from './TierBadge';
import { fonts } from '../theme/ui';
import { getPlayerStats, getOnlinePlayers, claimDailyLogin, PlayerStats, OnlinePlayer } from '../services/api';
import { deriveUsername } from '../utils/username';

const TIER_ICONS: Record<string, string> = {
  BRONZE: 'shield-half',
  SILVER: 'shield',
  GOLD: 'star',
  DIAMOND: 'diamond',
  PHANTOM: 'skull',
};

function xpToLevel(xp: number): number {
  return Math.floor(xp / 10) + 1;
}

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
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);

  const findMatchGlow = useRef(new Animated.Value(0)).current;
  const findMatchScale = useRef(new Animated.Value(1)).current;
  const topUpScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    onRefreshCredits();
    getPlayerStats().then(setStats).catch(() => {});
    getOnlinePlayers().then(setOnlinePlayers).catch(() => {});
    claimDailyLogin().then(data => {
      if (!data.alreadyClaimed) onRefreshCredits();
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      getOnlinePlayers().then(setOnlinePlayers).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(findMatchGlow, { toValue: 1, duration: 1500, useNativeDriver: false }),
      Animated.timing(findMatchGlow, { toValue: 0, duration: 1500, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const glowOpacity = findMatchGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  const playerName = deriveUsername(walletAddress);
  const level = stats ? xpToLevel(stats.xp) : 1;
  const noPlays = playsRemaining !== null && playsRemaining <= 0;
  const displayPlayers = onlinePlayers.slice(0, 4);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8DDCF', '#D8CCC0', '#8A8795', '#23283F']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.75)', 'rgba(255,255,255,0.08)', 'transparent']}
        style={styles.topGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <LinearGradient
        colors={['transparent', 'rgba(15,17,27,0.85)']}
        style={styles.bottomShade}
        start={{ x: 0.5, y: 0.2 }}
        end={{ x: 0.5, y: 1 }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color="#C4A882" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={onTopUp}
            onPressIn={() => Animated.spring(topUpScale, { toValue: 0.93, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
            onPressOut={() => Animated.spring(topUpScale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
          >
            <Animated.View style={[styles.topUpBtn, { transform: [{ scale: topUpScale }] }]}>
              <Text style={styles.topUpText}>Top Up +</Text>
              <Ionicons name="diamond" size={16} color="#B983FF" />
            </Animated.View>
          </Pressable>
        </View>

        {/* Logo */}
        <View style={styles.logoSection}>
          <Image source={require('../../assets/TapRush.png')} style={styles.logoImage} resizeMode="contain" />
        </View>

        {/* Player Card */}
        <View style={styles.playerCard}>
          <View style={styles.avatarCircle}>
            <LinearGradient
              colors={['#DDBA7C', '#BE8941']}
              style={styles.avatarGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={(TIER_ICONS[stats?.tier || 'BRONZE'] || 'shield-half') as any}
                size={28}
                color="#1A1410"
              />
            </LinearGradient>
          </View>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{playerName}</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Lv. {level}</Text>
          </View>
        </View>

        {/* Find Match / Refill */}
        {noPlays ? (
          <TouchableOpacity style={styles.refillBtn} onPress={onTopUp} activeOpacity={0.8}>
            <Text style={styles.refillText}>+5 PLAYS</Text>
          </TouchableOpacity>
        ) : (
          <Pressable
            onPress={onFindRandom}
            onPressIn={() => Animated.spring(findMatchScale, { toValue: 0.96, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
            onPressOut={() => Animated.spring(findMatchScale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
          >
            <Animated.View style={[styles.findMatchWrap, { transform: [{ scale: findMatchScale }] }]}>
              <Animated.View style={[styles.findMatchGlow, { opacity: glowOpacity }]} />
              <LinearGradient
                colors={['#2E3762', '#171E40', '#132847']}
                style={styles.findMatchBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.findMatchText}>FIND MATCH</Text>
                <Text style={styles.findMatchSub}>Random opponent matchmaking</Text>
              </LinearGradient>
            </Animated.View>
          </Pressable>
        )}

        {/* Friend Challenge Buttons */}
        <View style={styles.friendRow}>
          <TouchableOpacity style={styles.friendBtn} activeOpacity={0.8} onPress={onChallengeFreund}>
            <LinearGradient
              colors={['#2E3762', '#1E2847']}
              style={styles.friendBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#62EBFF" />
              <Text style={styles.friendBtnText}>CREATE ROOM</Text>
              <Text style={styles.friendBtnSub}>Get a code to share</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.friendBtn} activeOpacity={0.8} onPress={onJoinWithCode}>
            <LinearGradient
              colors={['#2E3762', '#1E2847']}
              style={styles.friendBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="enter-outline" size={20} color="#DDBA7C" />
              <Text style={styles.friendBtnText}>JOIN CODE</Text>
              <Text style={styles.friendBtnSub}>Enter friend's code</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Online Players */}
        <View style={styles.onlineSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.onlineDot} />
            <Text style={styles.sectionTitle}>PLAYERS ONLINE</Text>
            <Text style={styles.sectionCount}>{onlinePlayers.length}</Text>
          </View>
          {displayPlayers.length > 0 ? (
            displayPlayers.map((player) => {
              const name = deriveUsername(player.wallet);
              const lvl = xpToLevel(player.xp);
              return (
                <View key={player.wallet} style={styles.playerRow}>
                  <View style={styles.playerRowLeft}>
                    <View style={styles.playerRowAvatar}>
                      <LinearGradient
                        colors={[getTierColor(player.tier) + '40', getTierColor(player.tier) + '15']}
                        style={styles.playerRowAvatarGrad}
                      >
                        <Ionicons
                          name={(TIER_ICONS[player.tier] || 'shield-half') as any}
                          size={18}
                          color={getTierColor(player.tier)}
                        />
                      </LinearGradient>
                    </View>
                    <View style={styles.playerNameGroup}>
                      <Text style={styles.playerRowName}>{name}</Text>
                      <Text style={styles.playerRowLevel}>Lv. {lvl}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.challengeBtn} onPress={onFindRandom} activeOpacity={0.7}>
                    <LinearGradient
                      colors={['#D4A574', '#B8874A']}
                      style={styles.challengeBtnGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.challengeBtnText}>CHALLENGE</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyRow}>
              <Ionicons name="people-outline" size={28} color="rgba(237,225,207,0.4)" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyText}>No opponents online right now</Text>
              <Text style={styles.emptyHint}>Use CREATE ROOM to invite a friend!</Text>
            </View>
          )}
        </View>

        <View style={styles.utilityRow}>
          <TouchableOpacity style={styles.utilityBtn} onPress={onViewLeaderboard} activeOpacity={0.8}>
            <Ionicons name="trophy-outline" size={14} color="#E2D5C1" />
            <Text style={styles.utilityText}>Ranks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.utilityBtn} onPress={onViewHistory} activeOpacity={0.8}>
            <Ionicons name="time-outline" size={14} color="#E2D5C1" />
            <Text style={styles.utilityText}>History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGlow: {
    position: 'absolute',
    top: -160,
    left: -40,
    right: -40,
    height: 440,
    borderRadius: 220,
  },
  bottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 380,
  },
  scroll: { paddingTop: 34, paddingHorizontal: 24, paddingBottom: 34, alignItems: 'center' },

  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 36, width: '100%' },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  topUpBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(243,232,215,0.95)',
    borderWidth: 1, borderColor: 'rgba(111,84,49,0.25)',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8,
  },
  topUpText: { color: '#6B5945', fontFamily: fonts.body, fontSize: 13 },

  logoSection: { alignItems: 'center', marginBottom: 20 },
  logoImage: { width: 258, height: 90 },

  playerCard: {
    width: '94%',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(39,42,59,0.84)',
    borderRadius: 10, padding: 8, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  avatarCircle: {
    width: 54, height: 54, borderRadius: 27,
    borderWidth: 2.5, borderColor: '#DDBA7C', overflow: 'hidden',
  },
  avatarGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  playerInfo: { flex: 1, marginLeft: 10 },
  playerName: { color: '#EFE5D7', fontFamily: fonts.display, fontSize: 22 },
  levelBadge: {
    backgroundColor: 'transparent',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  levelText: { color: 'rgba(228,220,205,0.78)', fontFamily: fonts.display, fontSize: 19 },

  findMatchWrap: { marginBottom: 16, borderRadius: 22, width: '100%' },
  findMatchGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22, borderWidth: 2, borderColor: 'rgba(94,239,255,0.68)',
    shadowColor: '#62EBFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85, shadowRadius: 18, elevation: 10,
  },
  findMatchBtn: {
    borderRadius: 22, paddingVertical: 22, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(107,110,207,0.9)',
  },
  findMatchText: {
    color: '#EED8B6', fontFamily: fonts.display, fontSize: 38,
    letterSpacing: 1.8,
    textShadowColor: 'rgba(26,9,62,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  findMatchSub: {
    color: 'rgba(237,232,227,0.93)', fontFamily: fonts.body, fontSize: 14,
    marginTop: 6,
  },

  refillBtn: {
    width: '100%',
    borderRadius: 20, paddingVertical: 22, alignItems: 'center',
    backgroundColor: '#D4A574', marginBottom: 16,
  },
  refillText: { color: '#1A1410', fontFamily: fonts.display, fontSize: 26 },

  friendRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 18,
  },
  friendBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  friendBtnGrad: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(107,110,207,0.5)',
    gap: 4,
  },
  friendBtnText: {
    color: '#EED8B6',
    fontFamily: fonts.display,
    fontSize: 15,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  friendBtnSub: {
    color: 'rgba(237,232,227,0.55)',
    fontFamily: fonts.body,
    fontSize: 11,
  },

  onlineSection: { width: '100%', marginBottom: 14 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  sectionTitle: {
    color: 'rgba(237,225,207,0.7)',
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  sectionCount: {
    color: 'rgba(237,225,207,0.45)',
    fontFamily: fonts.mono,
    fontSize: 11,
  },

  playerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(47,50,70,0.84)',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10,
    marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
  },
  playerRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  playerRowAvatar: {
    width: 40, height: 40, borderRadius: 8, overflow: 'hidden',
    borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.23)',
  },
  playerRowAvatarGrad: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  playerNameGroup: { flex: 1, marginRight: 8 },
  playerRowName: { color: '#EDE1CF', fontFamily: fonts.display, fontSize: 19 },
  playerRowLevel: { color: 'rgba(234,219,199,0.78)', fontFamily: fonts.body, fontSize: 13, marginTop: -1 },
  challengeBtn: { borderRadius: 8, overflow: 'hidden' },
  challengeBtnGrad: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.38)',
  },
  challengeBtnText: {
    color: '#F7F0E5', fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.4,
  },
  emptyRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(47,50,70,0.3)',
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: { color: 'rgba(237,225,207,0.7)', fontFamily: fonts.body, fontSize: 14 },
  emptyHint: { color: 'rgba(237,225,207,0.4)', fontFamily: fonts.body, fontSize: 12, marginTop: 4 },

  utilityRow: { flexDirection: 'row', gap: 10, width: '100%' },
  utilityBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(41,45,62,0.72)',
    paddingVertical: 9,
  },
  utilityText: { color: '#E2D5C1', fontFamily: fonts.body, fontSize: 14 },
});
