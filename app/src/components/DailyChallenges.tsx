import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts, palette, fs } from '../theme/ui';
import { getDailyChallenges, DailyChallenge } from '../services/api';

export function DailyChallenges() {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);

  useEffect(() => {
    getDailyChallenges().then(d => setChallenges(d.challenges)).catch(() => {});
  }, []);

  if (challenges.length === 0) return null;

  const completed = challenges.filter(c => c.completed).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DAILY MISSIONS</Text>
        <Text style={styles.count}>{completed}/{challenges.length}</Text>
      </View>
      {challenges.map(ch => {
        const pct = Math.min(ch.progress / ch.target, 1);
        return (
          <View key={ch.id} style={[styles.row, ch.completed && styles.rowDone]}>
            <View style={styles.info}>
              <Text style={[styles.label, ch.completed && styles.labelDone]}>
                {ch.completed ? '✓ ' : ''}{ch.label}
              </Text>
              <Text style={styles.reward}>+{ch.rewardXp}xp +{ch.rewardCredits} play</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct * 100}%` }, ch.completed && styles.barDone]} />
            </View>
            <Text style={styles.progress}>{ch.progress}/{ch.target}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 0,
    backgroundColor: palette.panelSoft,
    padding: 14,
    marginBottom: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  title: { color: palette.warning, fontFamily: fonts.mono, fontSize: fs(11) },
  count: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(11) },
  row: {
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: palette.panelSoft,
    padding: 8,
  },
  rowDone: { opacity: 0.6 },
  info: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: palette.text, fontFamily: fonts.body, fontSize: fs(13), flex: 1 },
  labelDone: { color: palette.success },
  reward: { color: palette.primaryStrong, fontFamily: fonts.mono, fontSize: fs(10) },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.bgAlt,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: palette.primary,
    borderRadius: 3,
  },
  barDone: { backgroundColor: palette.success },
  progress: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(10), marginTop: 2, textAlign: 'right' },
});
