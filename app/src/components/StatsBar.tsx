import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts, palette, fs } from '../theme/ui';

interface StatsBarProps {
  wins: number;
  losses: number;
  currentStreak: number;
  bestReaction: number | null;
  winRate: number;
}

export function StatsBar({ wins, losses, currentStreak, bestReaction, winRate }: StatsBarProps) {
  return (
    <View style={styles.container}>
      <Stat label="Wins" value={String(wins)} />
      <Stat label="Losses" value={String(losses)} />
      <Stat label="Streak" value={currentStreak > 0 ? `${currentStreak}x` : '-'} highlight={currentStreak >= 3} />
      <Stat label="Best" value={bestReaction ? `${Math.round(bestReaction)}ms` : '-'} />
      <Stat label="Win Rate" value={`${winRate}%`} />
    </View>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.value, highlight && styles.hot]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 18,
    backgroundColor: palette.panelSoft,
    borderWidth: 0,
    paddingVertical: 12,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    color: palette.text,
    fontFamily: fonts.display,
    fontSize: fs(16),
  },
  hot: {
    color: palette.warning,
  },
  label: {
    marginTop: 1,
    color: palette.muted,
    fontFamily: fonts.mono,
    fontSize: fs(10),
  },
});
