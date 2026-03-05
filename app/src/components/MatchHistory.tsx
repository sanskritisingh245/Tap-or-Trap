import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { AmbientBackground } from './AmbientBackground';
import { fonts, palette } from '../theme/ui';
import { getMatchHistory, MatchHistoryEntry } from '../services/api';
import { deriveUsername } from '../utils/username';

interface MatchHistoryProps {
  onBack: () => void;
}

export function MatchHistory({ onBack }: MatchHistoryProps) {
  const [history, setHistory] = useState<MatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMatchHistory()
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <AmbientBackground tone="cool" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.85}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>HISTORY</Text>
        <View style={{ width: 42 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={palette.primary} size="large" style={{ marginTop: 42 }} />
      ) : history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>NO MATCHES</Text>
          <Text style={styles.emptySub}>Play one.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const statusColor = item.cancelled ? palette.muted : item.won ? palette.success : palette.danger;
            const label = item.cancelled ? 'Cancelled' : item.won ? 'Win' : 'Loss';
            return (
              <View style={styles.card}>
                <View style={styles.rowTop}>
                  <Text style={[styles.result, { color: statusColor }]}>{label}</Text>
                  <Text style={styles.time}>{getTimeAgo(item.timestamp)}</Text>
                </View>
                <Text style={styles.opp}>{deriveUsername(item.opponent)}</Text>
                <View style={styles.rowData}>
                  <Text style={styles.data}>Y {item.myReaction ? `${Math.round(item.myReaction)}ms` : '-'}</Text>
                  <Text style={styles.data}>T {item.opponentReaction ? `${Math.round(item.opponentReaction)}ms` : '-'}</Text>
                </View>
                {item.forfeitReason && <Text style={styles.forfeit}>Reason: {formatForfeit(item.forfeitReason)}</Text>}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatForfeit(reason: string): string {
  switch (reason) {
    case 'early_tap': return 'Early tap';
    case 'timeout': return 'Timeout';
    case 'disconnect': return 'Disconnect';
    case 'both_early': return 'Both early';
    case 'both_timeout': return 'Both timeout';
    default: return reason;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  back: {
    color: palette.primaryStrong,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  title: {
    color: palette.text,
    fontFamily: fonts.display,
    fontSize: 24,
  },
  list: {
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 18,
    borderWidth: 0,
    backgroundColor: palette.panel,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 1,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  result: {
    fontFamily: fonts.mono,
    fontSize: 12,
  },
  time: {
    color: palette.muted,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  opp: {
    marginTop: 5,
    color: palette.text,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  rowData: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  data: {
    color: palette.muted,
    fontFamily: fonts.mono,
    fontSize: 12,
  },
  forfeit: {
    marginTop: 7,
    color: palette.danger,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  empty: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: palette.text,
    fontFamily: fonts.display,
    fontSize: 26,
  },
  emptySub: {
    marginTop: 6,
    color: palette.muted,
    fontFamily: fonts.body,
    fontSize: 14,
  },
});
