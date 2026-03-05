import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from '../components/AmbientBackground';
import { fonts, palette, shadows } from '../theme/ui';
import { getDailyChallenges, DailyChallenge, claimDailyLogin } from '../services/api';

export default function MissionsScreen() {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    Promise.all([
      getDailyChallenges().then(d => setChallenges(d.challenges)).catch(() => {}),
      claimDailyLogin().then(d => setStreak(d.streak)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const completed = challenges.filter(c => c.completed).length;

  return (
    <View style={styles.screen}>
      <AmbientBackground tone="cool" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>DAILY MISSIONS</Text>
        {streak > 0 && (
          <LinearGradient
            colors={['rgba(255,184,0,0.15)', 'rgba(255,184,0,0.05)']}
            style={styles.streakBox}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.streakText}>{streak} day streak</Text>
          </LinearGradient>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: 40 }} />
        ) : challenges.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No missions today</Text>
            <Text style={styles.emptySub}>Check back tomorrow!</Text>
          </View>
        ) : (
          <>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>PROGRESS</Text>
              <Text style={styles.progressCount}>{completed}/{challenges.length}</Text>
            </View>

            {challenges.map(ch => {
              const pct = Math.min(ch.progress / ch.target, 1);
              return (
                <View key={ch.id} style={[styles.card, ch.completed && styles.cardDone]}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardLabel, ch.completed && styles.cardLabelDone]}>
                      {ch.completed ? '✓ ' : ''}{ch.label}
                    </Text>
                    <Text style={styles.reward}>+{ch.rewardXp}xp  +{ch.rewardCredits} credits</Text>
                  </View>
                  <View style={styles.barTrack}>
                    {ch.completed ? (
                      <LinearGradient
                        colors={[palette.success, palette.success + 'CC']}
                        style={[styles.barFill, { width: '100%' }]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      />
                    ) : (
                      <LinearGradient
                        colors={[palette.primary, palette.primary + 'CC']}
                        style={[styles.barFill, { width: `${pct * 100}%` }]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      />
                    )}
                  </View>
                  <Text style={styles.cardProgress}>{ch.progress}/{ch.target}</Text>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  scroll: { paddingTop: 60, paddingHorizontal: 18, paddingBottom: 100 },
  title: { color: palette.text, fontFamily: fonts.display, fontSize: 28, marginBottom: 12 },
  streakBox: { borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 16, alignItems: 'center' },
  streakText: { color: palette.warning, fontFamily: fonts.body, fontSize: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5 },
  progressCount: { color: palette.primaryStrong, fontFamily: fonts.mono, fontSize: 12 },
  card: {
    borderRadius: 18, backgroundColor: palette.panel, padding: 16, marginBottom: 10,
    ...shadows.subtle,
  },
  cardDone: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardLabel: { color: palette.text, fontFamily: fonts.body, fontSize: 15, flex: 1 },
  cardLabelDone: { color: palette.success },
  reward: { color: palette.primaryStrong, fontFamily: fonts.mono, fontSize: 11 },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: palette.bgAlt, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  cardProgress: { color: palette.muted, fontFamily: fonts.mono, fontSize: 11, marginTop: 6, textAlign: 'right' },
  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { color: palette.text, fontFamily: fonts.display, fontSize: 22 },
  emptySub: { color: palette.muted, fontFamily: fonts.body, fontSize: 14, marginTop: 4 },
});
