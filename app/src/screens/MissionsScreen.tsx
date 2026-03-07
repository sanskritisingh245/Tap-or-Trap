import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, palette } from '../theme/ui';
import { getDailyChallenges, DailyChallenge, claimDailyLogin, topUpCredits } from '../services/api';

export default function MissionsScreen() {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    Promise.all([
      getDailyChallenges().then((d) => setChallenges(d.challenges)).catch(() => {}),
      claimDailyLogin().then((d) => setStreak(d.streak)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const completed = challenges.filter((c) => c.completed).length;

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[palette.bgAlt, palette.bg]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.panel}>
          <View style={styles.headerRow}>
            <View style={{ width: 42 }} />
            <TouchableOpacity style={styles.topChip} onPress={async () => { try { await topUpCredits(); } catch {} }} activeOpacity={0.86}>
              <Text style={styles.topChipText}>Top Up +</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.missionContent}>
            <Text style={styles.title}>DAILY MISSIONS</Text>
            <View style={styles.titleDivider} />

            <LinearGradient colors={['rgba(231,210,175,0.2)', 'rgba(231,210,175,0.06)']} style={styles.streakStrip} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.streakText}>{streak} day streak</Text>
            </LinearGradient>
            <View style={styles.sectionGap} />

            {loading ? (
              <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: 40 }} />
            ) : challenges.length === 0 ? (
              <View style={styles.empty}><Text style={styles.emptyText}>No missions today</Text></View>
            ) : (
              <>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>PROGRESS</Text>
                  <Text style={styles.progressCount}>{completed}/{challenges.length}</Text>
                </View>

                {challenges.map((c) => {
                  const pct = Math.min(c.progress / c.target, 1);
                  return (
                    <View key={c.id} style={[styles.card, c.completed && styles.cardDone]}>
                      <View style={styles.cardTop}>
                        <Text style={[styles.cardTitle, c.completed && { color: palette.success }]}>{c.label}</Text>
                        <Text style={styles.reward}>+{c.rewardXp} XP   +{c.rewardCredits} CR</Text>
                      </View>
                      <View style={styles.track}>
                        <LinearGradient
                          colors={c.completed ? ['#41D28C', '#2ABF79'] : ['#4F8CFF', '#2E6EF2']}
                          style={[styles.fill, { width: `${pct * 100}%` }]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        />
                      </View>
                      <Text style={styles.progressValue}>{c.progress}/{c.target}</Text>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 56, paddingBottom: 20 },
  panel: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 10,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 42 },
  topChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(205, 167, 109, 0.5)',
    backgroundColor: 'rgba(232, 197, 143, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topChipText: { color: '#E6CEA8', fontFamily: fonts.body, fontSize: 14 },
  missionContent: { marginTop: 34 },

  title: { marginTop: 16, color: '#F2DFC5', fontFamily: fonts.display, fontSize: 40, lineHeight: 42, textAlign: 'center' },
  titleDivider: {
    marginTop: 12,
    marginBottom: 4,
    alignSelf: 'center',
    width: 108,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(230, 206, 168, 0.35)',
  },
  streakStrip: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(220, 194, 151, 0.4)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  streakText: { color: '#E6CEA8', fontFamily: fonts.display, fontSize: 22, lineHeight: 24 },
  sectionGap: { height: 26 },

  progressRow: { marginTop: 0, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.4 },
  progressCount: { color: '#E6CEA8', fontFamily: fonts.display, fontSize: 16 },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(151, 171, 205, 0.25)',
    backgroundColor: 'rgba(28, 44, 68, 0.92)',
    padding: 12,
    marginBottom: 10,
  },
  cardDone: { opacity: 0.7 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { color: palette.text, fontFamily: fonts.body, fontSize: 17, flex: 1 },
  reward: { color: '#E6CEA8', fontFamily: fonts.mono, fontSize: 11 },
  track: {
    height: 9,
    borderRadius: 5,
    backgroundColor: palette.bgAlt,
    borderWidth: 1,
    borderColor: 'rgba(151, 171, 205, 0.18)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 5 },
  progressValue: { marginTop: 6, color: palette.muted, fontFamily: fonts.mono, fontSize: 11, textAlign: 'right' },

  empty: { marginTop: 80, alignItems: 'center' },
  emptyText: { color: palette.muted, fontFamily: fonts.body, fontSize: 15 },
});
