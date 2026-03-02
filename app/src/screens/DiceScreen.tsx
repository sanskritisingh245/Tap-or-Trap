import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { playDice, DiceResult } from '../services/gameApi';
import { useShake } from '../hooks/useShake';
import { hapticWin, hapticLoss } from '../utils/sounds';
import { fonts, palette, gameColors, fs } from '../theme/ui';

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

  const loadBalance = useCallback(async () => {
    try { setBalance(await getCreditsBalance()); } catch {}
  }, []);

  useEffect(() => { loadBalance(); }, []);

  // Shake-to-roll: trigger roll when shake detected
  useEffect(() => {
    if (shakeTriggered && !rolling) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      handleRoll();
    }
  }, [shakeTriggered]);

  // Rattle animation while shaking
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

      Animated.spring(resultScale, {
        toValue: 1, friction: 5, tension: 80, useNativeDriver: true,
      }).start();

      if (res.won) {
        hapticWin();
      } else {
        hapticLoss();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRolling(false);
    }
  };

  const adjustTarget = (delta: number) => {
    const next = Math.max(2, Math.min(98, target + delta));
    setTarget(next);
  };

  return (
    <View style={styles.screen}>
      <AmbientBackground tone="cool" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← GAMES</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: ACCENT }]}>DICE</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Result Area */}
      <View style={styles.diceArea}>
        {result ? (
          <Animated.View style={[styles.resultBox, result.won ? styles.resultWin : styles.resultLose, { transform: [{ scale: resultScale }] }]}>
            <Text style={styles.resultTitle}>{result.won ? 'WIN!' : 'LOSS'}</Text>
            <Text style={styles.rollValue}>{result.roll.toFixed(2)}</Text>
            <Text style={styles.resultCondition}>
              Target: {isOver ? 'Over' : 'Under'} {target}
            </Text>
            <Text style={[styles.resultPayout, result.won ? styles.payoutWin : styles.payoutLose]}>
              {result.won ? `+${result.payout}` : `-${result.amount}`}
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.diceDisplay}>
            <Animated.View style={{ transform: [{ rotate: shakeRotateInterpolate }] }}>
              <Image source={require('../../assets/dice-banner.jpeg')} style={styles.diceBanner} />
            </Animated.View>
            <Text style={styles.diceQuestion}>Roll {isOver ? 'Over' : 'Under'} {target}?</Text>
            <Text style={styles.shakeHint}>📱 Shake your phone to roll!</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <BetInput
          amount={betAmount}
          onChangeAmount={setBetAmount}
          balance={balance}
          disabled={rolling}
          accentColor={ACCENT}
        />

        {/* Over/Under Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, isOver && { borderColor: ACCENT, backgroundColor: ACCENT + '20' }]}
            onPress={() => setIsOver(true)}
          >
            <Text style={[styles.toggleText, isOver && { color: ACCENT }]}>OVER</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, !isOver && { borderColor: ACCENT, backgroundColor: ACCENT + '20' }]}
            onPress={() => setIsOver(false)}
          >
            <Text style={[styles.toggleText, !isOver && { color: ACCENT }]}>UNDER</Text>
          </TouchableOpacity>
        </View>

        {/* Target Selector */}
        <View style={styles.targetRow}>
          <TouchableOpacity style={styles.adjBtn} onPress={() => adjustTarget(-5)}>
            <Text style={styles.adjText}>-5</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.adjBtn} onPress={() => adjustTarget(-1)}>
            <Text style={styles.adjText}>-1</Text>
          </TouchableOpacity>
          <View style={styles.targetBox}>
            <Text style={styles.targetValue}>{target}</Text>
          </View>
          <TouchableOpacity style={styles.adjBtn} onPress={() => adjustTarget(1)}>
            <Text style={styles.adjText}>+1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.adjBtn} onPress={() => adjustTarget(5)}>
            <Text style={styles.adjText}>+5</Text>
          </TouchableOpacity>
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

        <TouchableOpacity
          style={[styles.rollBtn, rolling && styles.btnDisabled]}
          onPress={handleRoll}
          disabled={rolling}
          activeOpacity={0.86}
        >
          <Text style={styles.rollText}>{rolling ? 'ROLLING...' : shaking ? '🎲 SHAKING...' : 'ROLL'}</Text>
        </TouchableOpacity>
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
  back: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(13) },
  title: { fontFamily: fonts.display, fontSize: fs(20) },
  diceArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  diceDisplay: { alignItems: 'center' },
  diceBanner: { width: 180, height: 180, borderRadius: 20, marginBottom: 8 },
  diceQuestion: { color: palette.text, fontFamily: fonts.display, fontSize: fs(22) },
  shakeHint: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(11), marginTop: 8, opacity: 0.7 },
  resultBox: {
    borderRadius: 18, borderWidth: 0, padding: 20, alignItems: 'center', minWidth: 180,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  resultWin: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  resultLose: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  resultTitle: { color: palette.text, fontFamily: fonts.display, fontSize: fs(28) },
  rollValue: { color: ACCENT, fontFamily: fonts.display, fontSize: fs(42), marginVertical: 4 },
  resultCondition: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(12) },
  resultPayout: { fontFamily: fonts.display, fontSize: fs(22), marginTop: 4 },
  payoutWin: { color: palette.success },
  payoutLose: { color: palette.danger },
  controls: { paddingHorizontal: 16, paddingBottom: 32 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  toggleBtn: {
    flex: 1, borderRadius: 16, borderWidth: 0,
    backgroundColor: palette.panelSoft, paddingVertical: 12, alignItems: 'center',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1,
  },
  toggleText: { color: palette.muted, fontFamily: fonts.display, fontSize: fs(16) },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, justifyContent: 'center' },
  adjBtn: {
    borderRadius: 12, borderWidth: 0,
    backgroundColor: palette.panelSoft, paddingVertical: 8, paddingHorizontal: 14,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 1,
  },
  adjText: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(14) },
  targetBox: {
    borderRadius: 12, borderWidth: 2, borderColor: ACCENT,
    backgroundColor: palette.bgAlt, paddingVertical: 10, paddingHorizontal: 24,
  },
  targetValue: { color: palette.text, fontFamily: fonts.display, fontSize: fs(28) },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statBox: {
    flex: 1, borderRadius: 14, borderWidth: 0,
    backgroundColor: palette.panelSoft, paddingVertical: 10, alignItems: 'center',
  },
  statLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(9) },
  statValue: { color: palette.text, fontFamily: fonts.display, fontSize: fs(18), marginTop: 2 },
  error: { color: palette.danger, fontFamily: fonts.mono, fontSize: fs(12), textAlign: 'center', marginBottom: 8 },
  rollBtn: { borderRadius: 24, backgroundColor: ACCENT, paddingVertical: 16, alignItems: 'center', shadowColor: ACCENT, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  btnDisabled: { opacity: 0.5 },
  rollText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: fs(22) },
});
