import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { AmbientBackground } from './AmbientBackground';
import { TierBadge } from './TierBadge';
import { fonts, palette } from '../theme/ui';
import { getLeaderboard, LeaderboardEntry } from '../services/api';
import { deriveUsername } from '../utils/username';

type Timeframe = 'today' | 'week' | 'all';

interface LeaderboardProps {
  onBack: () => void;
}

export function Leaderboard({ onBack }: LeaderboardProps) {
  const [tab, setTab] = useState<Timeframe>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLeaderboard(tab)
      .then(data => {
        setEntries(data.leaderboard);
        setMyRank(data.myRank);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  const rankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <View style={styles.container}>
      <AmbientBackground tone="cool" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.back}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>LEADERBOARD</Text>
      </View>

      <View style={styles.tabs}>
        {(['today', 'week', 'all'] as Timeframe[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'today' ? 'TODAY' : t === 'week' ? 'THIS WEEK' : 'ALL TIME'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {myRank && (
        <View style={styles.myRank}>
          <Text style={styles.myRankText}>YOUR RANK: #{myRank}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: 40 }} />
      ) : entries.length === 0 ? (
        <Text style={styles.empty}>No players yet. Be the first!</Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.wallet}
          renderItem={({ item }) => (
            <View style={[styles.row, item.rank <= 3 && styles.rowTop]}>
              <Text style={[styles.rank, item.rank <= 3 && styles.rankTop]}>
                {rankEmoji(item.rank)}
              </Text>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{deriveUsername(item.wallet)}</Text>
                  <TierBadge tier={item.tier} />
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.stat}>{item.wins}W</Text>
                  <Text style={styles.stat}>{item.winRate}%</Text>
                  <Text style={styles.stat}>{item.bestReaction ? `${Math.round(item.bestReaction)}ms` : '-'}</Text>
                  <Text style={styles.stat}>{item.maxStreak}x</Text>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  header: {
    paddingTop: 54, paddingHorizontal: 18, paddingBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  back: { color: palette.muted, fontFamily: fonts.mono, fontSize: 13 },
  title: { color: palette.text, fontFamily: fonts.display, fontSize: 24 },
  tabs: { flexDirection: 'row', paddingHorizontal: 18, gap: 6, marginBottom: 10 },
  tab: {
    flex: 1, borderRadius: 8, borderWidth: 1,
    borderColor: palette.panelStroke, backgroundColor: palette.panelSoft,
    paddingVertical: 8, alignItems: 'center',
  },
  tabActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  tabText: { color: palette.muted, fontFamily: fonts.mono, fontSize: 10 },
  tabTextActive: { color: palette.buttonText },
  myRank: {
    marginHorizontal: 18, marginBottom: 10, borderRadius: 8,
    backgroundColor: 'rgba(94, 192, 255, 0.12)', paddingVertical: 6, alignItems: 'center',
  },
  myRankText: { color: palette.primary, fontFamily: fonts.mono, fontSize: 12 },
  empty: { color: palette.muted, fontFamily: fonts.body, fontSize: 14, textAlign: 'center', marginTop: 40 },
  row: {
    marginHorizontal: 18, marginBottom: 6, borderRadius: 12, borderWidth: 1,
    borderColor: palette.panelStroke, backgroundColor: palette.panel,
    flexDirection: 'row', alignItems: 'center', padding: 12,
  },
  rowTop: { borderColor: 'rgba(255, 215, 0, 0.3)' },
  rank: { color: palette.muted, fontFamily: fonts.display, fontSize: 18, width: 40, textAlign: 'center' },
  rankTop: { color: palette.warning, fontSize: 22 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { color: palette.text, fontFamily: fonts.body, fontSize: 15 },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { color: palette.muted, fontFamily: fonts.mono, fontSize: 11 },
});
