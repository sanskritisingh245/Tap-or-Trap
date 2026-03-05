import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Image, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { playDice, DiceResult } from '../services/gameApi';
import { useShake } from '../hooks/useShake';
import { hapticWin, hapticLoss } from '../utils/sounds';
import { fonts, palette, gameColors, shadows } from '../theme/ui';

const ACCENT = gameColors.dice;

export default function DiceScreen({ onBack }: { onBack: () => void }) {
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState('5');
  const [target, setTarget] = useState(50);
  const [isOver, setIsOver] = useState(true);
  const [result, setResult] = useState<DiceResult | null>(null);
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState('');

  const { shaking, shakeTriggered } = useShake(!rolling);
  const shakeRotate = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const rollBtnScale = useRef(new Animated.Value(1)).current;

  const loadBalance = useCallback(async () => {
    try { setBalance(await getCreditsBalance()); } catch {}
  }, []);

  useEffect(() => { loadBalance(); }, []);

  useEffect(() => {
    if (shakeTriggered && !rolling) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      handleRoll();
    }
  }, [shakeTriggered]);

  useEffect(() => {
    if (shaking && !rolling) {
      const rattle = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeRotate, { toValue: 1, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeRotate, { toValue: -1, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeRotate, { toValue: 0, duration: 50, useNativeDriver: true }),
        ])
      );
      rattle.start();
      return () => rattle.stop();
    } else {
      shakeRotate.setValue(0);
    }
  }, [shaking, rolling]);

  const shakeRotateInterpolate = shakeRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  const winChance = isOver ? (100 - target) : target;
  const multiplier = winChance > 0 ? Math.round((99 / winChance) * 100) / 100 : 0;

  const handleRoll = async () => {
    const amount = parseInt(betAmount);
    if (!amount || amount < 1) { setError('Enter a valid bet'); return; }
    if (amount > balance) { setError('Insufficient credits'); return; }

    setError('');
    setResult(null);
    setRolling(true);
    resultScale.setValue(0);

    try {
      const res = await playDice(amount, target, isOver);
      setResult(res);
      setBalance(res.balance);
      Animated.spring(resultScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
      if (res.won) hapticWin(); else hapticLoss();
    } catch (e: any) { setError(e.message); }
    finally { setRolling(false); }
  };

  const adjustTarget = (delta: number) => {
    setTarget(Math.max(2, Math.min(98, target + delta)));
  };

  return (
    <View style={styles.screen}>
      <AmbientBackground tone="cool" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← GAMES</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: ACCENT }]}>DICE</Text>
        <Text style={styles.balText}>{balance} ¢</Text>
      </View>

      {/* Result Area */}
      <View style={styles.diceArea}>
        <LinearGradient
          colors={[ACCENT + '08', 'transparent']}
          style={styles.areaGlow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {result ? (
          <Animated.View style={{ transform: [{ scale: resultScale }] }}>
            <LinearGradient
              colors={result.won
                ? ['rgba(59,130,246,0.18)', 'rgba(59,130,246,0.06)']
                : ['rgba(255,71,87,0.18)', 'rgba(255,71,87,0.06)']
              }
              style={styles.resultBox}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.resultTitle}>{result.won ? 'WIN!' : 'LOSS'}</Text>
              <Text style={styles.rollValue}>{result.roll.toFixed(2)}</Text>
              <Text style={styles.resultCondition}>Target: {isOver ? 'Over' : 'Under'} {target}</Text>
              <Text style={[styles.resultPayout, result.won ? styles.payoutWin : styles.payoutLose]}>
                {result.won ? `+${result.payout}` : `-${result.amount}`}
              </Text>
            </LinearGradient>
          </Animated.View>
        ) : (
          <View style={styles.diceDisplay}>
            <Animated.View style={{ transform: [{ rotate: shakeRotateInterpolate }] }}>
              <Image source={require('../../assets/DIce.png')} style={styles.diceBanner} />
            </Animated.View>
            <Text style={styles.diceQuestion}>Roll {isOver ? 'Over' : 'Under'} {target}?</Text>
            <Text style={styles.shakeHint}>Shake your phone to roll!</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <BetInput amount={betAmount} onChangeAmount={setBetAmount} balance={balance} disabled={rolling} accentColor={ACCENT} />

        {/* Over/Under Toggle */}
        <View style={styles.toggleRow}>
          {[true, false].map(over => (
            <Pressable
              key={over ? 'over' : 'under'}
              style={[styles.toggleBtn, isOver === over && styles.toggleActive]}
              onPress={() => setIsOver(over)}
            >
              {isOver === over ? (
                <LinearGradient
                  colors={[ACCENT + '25', ACCENT + '08']}
                  style={styles.toggleGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                >
                  <Text style={[styles.toggleText, { color: ACCENT }]}>{over ? 'OVER' : 'UNDER'}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.toggleGrad}>
                  <Text style={styles.toggleText}>{over ? 'OVER' : 'UNDER'}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Target Selector */}
        <View style={styles.targetRow}>
          {[-5, -1].map(d => (
            <TouchableOpacity key={d} style={styles.adjBtn} onPress={() => adjustTarget(d)}>
              <Text style={styles.adjText}>{d}</Text>
            </TouchableOpacity>
          ))}
          <View style={[styles.targetBox, { borderColor: ACCENT }]}>
            <Text style={styles.targetValue}>{target}</Text>
          </View>
          {[1, 5].map(d => (
            <TouchableOpacity key={d} style={styles.adjBtn} onPress={() => adjustTarget(d)}>
              <Text style={styles.adjText}>+{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>WIN CHANCE</Text>
            <Text style={styles.statValue}>{winChance}%</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>MULTIPLIER</Text>
            <Text style={[styles.statValue, { color: ACCENT }]}>{multiplier}x</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={handleRoll}
          disabled={rolling}
          onPressIn={() => Animated.spring(rollBtnScale, { toValue: 0.96, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
          onPressOut={() => Animated.spring(rollBtnScale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
        >
          <Animated.View style={{ transform: [{ scale: rollBtnScale }] }}>
            <LinearGradient
              colors={[ACCENT, ACCENT + 'CC']}
              style={[styles.rollBtn, rolling && styles.btnDisabled, shadows.glow(ACCENT)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.rollText}>{rolling ? 'ROLLING...' : shaking ? 'SHAKING...' : 'ROLL'}</Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8,
  },
  back: { color: palette.muted, fontFamily: fonts.mono, fontSize: 13 },
  title: { fontFamily: fonts.display, fontSize: 20 },
  balText: { color: palette.primaryStrong, fontFamily: fonts.mono, fontSize: 13 },
  diceArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  areaGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%' },
  diceDisplay: { alignItems: 'center' },
  diceBanner: { width: 180, height: 180, borderRadius: 16, marginBottom: 8 },
  diceQuestion: { color: palette.text, fontFamily: fonts.display, fontSize: 22 },
  shakeHint: { color: palette.muted, fontFamily: fonts.mono, fontSize: 11, marginTop: 8, opacity: 0.7 },
  resultBox: {
    borderRadius: 18, padding: 20, alignItems: 'center', minWidth: 180,
    ...shadows.medium,
  },
  resultTitle: { color: palette.text, fontFamily: fonts.display, fontSize: 28 },
  rollValue: { color: ACCENT, fontFamily: fonts.display, fontSize: 42, marginVertical: 4 },
  resultCondition: { color: palette.muted, fontFamily: fonts.mono, fontSize: 12 },
  resultPayout: { fontFamily: fonts.display, fontSize: 22, marginTop: 4 },
  payoutWin: { color: palette.success },
  payoutLose: { color: palette.danger },
  controls: { paddingHorizontal: 16, paddingBottom: 32 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  toggleBtn: {
    flex: 1, borderRadius: 16, overflow: 'hidden',
    backgroundColor: palette.panelSoft, ...shadows.subtle,
  },
  toggleActive: { backgroundColor: 'transparent' },
  toggleGrad: { paddingVertical: 12, alignItems: 'center' },
  toggleText: { color: palette.muted, fontFamily: fonts.display, fontSize: 16 },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, justifyContent: 'center' },
  adjBtn: {
    borderRadius: 12, backgroundColor: palette.panelSoft, paddingVertical: 8, paddingHorizontal: 14,
    ...shadows.subtle,
  },
  adjText: { color: palette.muted, fontFamily: fonts.mono, fontSize: 14 },
  targetBox: {
    borderRadius: 12, borderWidth: 2, backgroundColor: palette.bgAlt, paddingVertical: 10, paddingHorizontal: 24,
  },
  targetValue: { color: palette.text, fontFamily: fonts.display, fontSize: 28 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statBox: {
    flex: 1, borderRadius: 14, backgroundColor: palette.panelSoft, paddingVertical: 10, alignItems: 'center',
  },
  statLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: 9 },
  statValue: { color: palette.text, fontFamily: fonts.display, fontSize: 18, marginTop: 2 },
  error: { color: palette.danger, fontFamily: fonts.mono, fontSize: 12, textAlign: 'center', marginBottom: 8 },
  rollBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  rollText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 22 },
});
