import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, palette } from '../theme/ui';
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
              <LinearGradient
                colors={ch.completed
                  ? [palette.success, palette.success + 'CC']
                  : [palette.primary, palette.primary + 'CC']
                }
                style={[styles.barFill, { width: `${pct * 100}%` }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={styles.progress}>{ch.progress}/{ch.target}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 18, backgroundColor: palette.panelSoft, padding: 14, marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  title: { color: palette.warning, fontFamily: fonts.mono, fontSize: 11 },
  count: { color: palette.muted, fontFamily: fonts.mono, fontSize: 11 },
  row: { marginBottom: 8, borderRadius: 8, backgroundColor: palette.panelSoft, padding: 8 },
  rowDone: { opacity: 0.6 },
  info: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: palette.text, fontFamily: fonts.body, fontSize: 13, flex: 1 },
  labelDone: { color: palette.success },
  reward: { color: palette.primaryStrong, fontFamily: fonts.mono, fontSize: 10 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: palette.bgAlt, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  progress: { color: palette.muted, fontFamily: fonts.mono, fontSize: 10, marginTop: 2, textAlign: 'right' },
});
