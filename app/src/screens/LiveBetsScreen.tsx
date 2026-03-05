import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
} from 'react-native';
import { AmbientBackground } from '../components/AmbientBackground';
import { fonts, palette, gameColors } from '../theme/ui';
import { getLiveFeed, LiveFeedItem } from '../services/gameApi';

const GAME_META: Record<string, { emoji: string; color: string }> = {
  coinflip: { emoji: '🪙', color: gameColors.coinflip },
  dice: { emoji: '🎲', color: gameColors.dice },
  mines: { emoji: '💣', color: gameColors.mines },
  crash: { emoji: '🚀', color: gameColors.crash },
  taprush: { emoji: '⚡', color: gameColors.taprush },
};

export default function LiveBetsScreen() {
  const [feed, setFeed] = useState<LiveFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    try {
      const items = await getLiveFeed();
      setFeed(items);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFeed();
    const interval = setInterval(loadFeed, 3000);
    return () => clearInterval(interval);
  }, [loadFeed]);

  const renderItem = ({ item }: { item: LiveFeedItem }) => {
    const meta = GAME_META[item.game] || { emoji: '🎮', color: palette.primary };
    const net = item.won ? item.payout : -item.amount;
    return (
      <View style={styles.card}>
        <View style={[styles.gameBadge, { backgroundColor: meta.color + '20' }]}>
          <Text style={styles.gameEmoji}>{meta.emoji}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.wallet}>{item.wallet.slice(0, 6)}...{item.wallet.slice(-4)}</Text>
          <Text style={[styles.gameName, { color: meta.color }]}>
            {item.game.charAt(0).toUpperCase() + item.game.slice(1)}
          </Text>
        </View>
        <View style={styles.resultCol}>
          <Text style={[styles.net, item.won ? styles.netWin : styles.netLose]}>
            {item.won ? '+' : ''}{net}
          </Text>
          <Text style={styles.bet}>bet {item.amount}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <AmbientBackground tone="cool" />
      <View style={styles.header}>
        <Text style={styles.title}>LIVE BETS</Text>
        <View style={styles.liveDot} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: 40 }} />
      ) : feed.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No bets yet</Text>
          <Text style={styles.emptySub}>Be the first to play!</Text>
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item, i) => `${item.wallet}-${item.time}-${i}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 60,
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  title: { color: palette.text, fontFamily: fonts.display, fontSize: 28 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.success,
  },
  list: { paddingHorizontal: 18, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: palette.panel,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  gameBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameEmoji: { fontSize: 20 },
  info: { flex: 1, marginLeft: 12 },
  wallet: { color: palette.text, fontFamily: fonts.body, fontSize: 14 },
  gameName: { fontFamily: fonts.mono, fontSize: 11, marginTop: 2 },
  resultCol: { alignItems: 'flex-end' },
  net: { fontFamily: fonts.display, fontSize: 18 },
  netWin: { color: palette.success },
  netLose: { color: palette.danger },
  bet: { color: palette.muted, fontFamily: fonts.mono, fontSize: 10, marginTop: 2 },
  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { color: palette.text, fontFamily: fonts.display, fontSize: 22 },
  emptySub: { color: palette.muted, fontFamily: fonts.body, fontSize: 14, marginTop: 4 },
});
