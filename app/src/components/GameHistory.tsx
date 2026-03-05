import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { AmbientBackground } from './AmbientBackground';
import { getGameHistory, GameBet } from '../services/gameApi';
import { fonts, palette, gameColors } from '../theme/ui';

interface Props {
  onBack: () => void;
}

const GAME_LABELS: Record<string, { name: string; emoji: string; color: string }> = {
  coinflip: { name: 'Coin Flip', emoji: '🪙', color: gameColors.coinflip },
  dice: { name: 'Dice', emoji: '🎲', color: gameColors.dice },
  mines: { name: 'Mines', emoji: '💣', color: gameColors.mines },
  crash: { name: 'Crash', emoji: '🚀', color: gameColors.crash },
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function GameHistory({ onBack }: Props) {
  const [bets, setBets] = useState<GameBet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGameHistory()
      .then(setBets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const renderBet = ({ item }: { item: GameBet }) => {
    const game = GAME_LABELS[item.game_type] || { name: item.game_type, emoji: '🎮', color: palette.primary };
    const won = item.won === 1;
    const net = won ? item.payout - item.amount : -item.amount;

    return (
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.emoji}>{game.emoji}</Text>
          <View>
            <Text style={[styles.gameName, { color: game.color }]}>{game.name}</Text>
            <Text style={styles.time}>{formatTime(item.created_at)}</Text>
          </View>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.net, won ? styles.netWin : styles.netLose]}>
            {won ? '+' : ''}{net}
          </Text>
          <Text style={styles.betSize}>bet {item.amount}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <AmbientBackground tone="cool" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>GAME HISTORY</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : bets.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No game history yet</Text>
          <Text style={styles.emptySub}>Play some games to see your bets here!</Text>
        </View>
      ) : (
        <FlatList
          data={bets}
          keyExtractor={b => b.id}
          renderItem={renderBet}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
  },
  back: { color: palette.primaryStrong, fontFamily: fonts.mono, fontSize: 13 },
  title: { color: palette.text, fontFamily: fonts.display, fontSize: 18 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: palette.muted, fontFamily: fonts.body, fontSize: 16 },
  emptySub: { color: palette.muted, fontFamily: fonts.mono, fontSize: 12, marginTop: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 16, borderWidth: 0,
    backgroundColor: palette.panel, padding: 12, marginBottom: 8,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 1,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji: { fontSize: 24 },
  gameName: { fontFamily: fonts.body, fontSize: 14 },
  time: { color: palette.muted, fontFamily: fonts.mono, fontSize: 10, marginTop: 1 },
  rowRight: { alignItems: 'flex-end' },
  net: { fontFamily: fonts.display, fontSize: 18 },
  netWin: { color: palette.success },
  netLose: { color: palette.danger },
  betSize: { color: palette.muted, fontFamily: fonts.mono, fontSize: 10, marginTop: 1 },
});
