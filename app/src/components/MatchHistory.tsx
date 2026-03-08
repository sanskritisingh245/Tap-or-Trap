import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { AmbientBackground } from './AmbientBackground';
import { fonts, palette, shadows } from '../theme/ui';
import { getMatchHistory, MatchHistoryEntry } from '../services/api';
import { deriveUsername } from '../utils/username';

interface MatchHistoryProps {
  onBack: () => void;
}

export function MatchHistory({ onBack }: MatchHistoryProps) {
  const [history, setHistory] = useState<MatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMatchHistory().then(setHistory).catch(() => setHistory([])).finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <AmbientBackground tone="cool" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.85}><Text style={styles.back}>Back</Text></TouchableOpacity>
        <Text style={styles.title}>History</Text>
        <View style={{ width: 42 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={palette.primary} size="large" style={{ marginTop: 42 }} />
      ) : history.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>No Matches</Text></View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const status = item.cancelled ? 'CANCELLED' : item.won ? 'WIN' : 'LOSS';
            const color = item.cancelled ? 'rgba(220,197,162,0.78)' : item.won ? '#CFE9D2' : '#F3C1CA';
            return (
              <View style={styles.card}>
                <View style={styles.rowTop}>
                  <Text style={[styles.status, { color }]}>{status}</Text>
                  <Text style={styles.time}>{formatTimeAgo(item.timestamp)}</Text>
                </View>
                <Text style={styles.opponent}>{deriveUsername(item.opponent)}</Text>
                <Text style={styles.metrics}>You {formatMs(item.myReaction)} • Them {formatMs(item.opponentReaction)}</Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function formatMs(v: number | null) {
  if (v === null || v <= 0) return '-';
  return `${Math.round(v)}ms`;
}

function formatTimeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg, paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  back: { color: '#DCC5A2', fontFamily: fonts.body, fontSize: 15 },
  title: { color: '#F2DFC5', fontFamily: fonts.display, fontSize: 24 },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(151, 171, 205, 0.24)',
    backgroundColor: 'rgba(22, 34, 54, 0.94)',
    padding: 14,
    marginBottom: 10,
    ...shadows.subtle,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontFamily: fonts.mono, fontSize: 11 },
  time: { color: 'rgba(220,197,162,0.55)', fontFamily: fonts.mono, fontSize: 11 },
  opponent: { marginTop: 6, color: '#F3E2C8', fontFamily: fonts.body, fontSize: 15 },
  metrics: { marginTop: 6, color: 'rgba(220,197,162,0.72)', fontFamily: fonts.mono, fontSize: 11 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { color: 'rgba(220,197,162,0.72)', fontFamily: fonts.body, fontSize: 16 },
});
