import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Pressable, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { fonts, palette, gameColors, shadows } from '../theme/ui';

const ACCENT = gameColors.limbo;

export default function LimboScreen({ onBack }: { onBack: () => void }) {
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState('5');
  const [targetMult, setTargetMult] = useState('2.00');
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<{ mult: number; won: boolean; payout: number } | null>(null);
  const [history, setHistory] = useState<{ mult: number; won: boolean }[]>([]);

  const counterAnim = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const loadBalance = useCallback(async () => {
    try { setBalance(await getCreditsBalance()); } catch {}
  }, []);
  useEffect(() => { loadBalance(); }, []);

  const play = () => {
    const bet = parseInt(betAmount);
    const target = parseFloat(targetMult);
    if (!bet || bet < 1 || bet > balance || playing || target < 1.01) return;

    setPlaying(true);
    setResult(null);
    setBalance(b => b - bet);
    resultScale.setValue(0);

    // Generate crash point (provably fair simulation)
    const crashPoint = Math.max(1, 0.99 / (1 - Math.random()));
    const won = crashPoint >= target;
    const payout = won ? Math.floor(bet * target) : 0;

    // Animate counter
    counterAnim.setValue(1);
    const finalVal = Math.min(crashPoint, target + 0.5);
    Animated.timing(counterAnim, {
      toValue: finalVal,
      duration: 1200,
      useNativeDriver: false,
    }).start(() => {
      setResult({ mult: Math.round(crashPoint * 100) / 100, won, payout });
      if (won) setBalance(b => b + payout);
      setHistory(h => [{ mult: Math.round(crashPoint * 100) / 100, won }, ...h.slice(0, 19)]);
      setPlaying(false);

      Animated.sequence([
        Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 8 }),
        Animated.timing(glowOpacity, { toValue: won ? 1 : 0, duration: 300, useNativeDriver: true }),
      ]).start();
      setTimeout(() => glowOpacity.setValue(0), 1500);
    });
  };

  const winChance = Math.max(0, Math.min(99, (99 / parseFloat(targetMult || '2')))).toFixed(2);

  return (
    <View style={s.screen}>
      <AmbientBackground tone="warm" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Limbo</Text>
        <View style={s.balPill}>
          <Text style={s.balText}>{balance.toLocaleString()}</Text>
        </View>
      </View>

      {/* Main display */}
      <View style={s.displayArea}>
        <Animated.View style={[s.glowRing, { opacity: glowOpacity, borderColor: result?.won ? palette.success : palette.danger }]} />
        <View style={s.multDisplay}>
          {playing ? (
            <Animated.Text style={[s.bigMult, { color: ACCENT }]}>
              {counterAnim.interpolate({ inputRange: [0, 100], outputRange: ['1.00x', '100.00x'] })}
            </Animated.Text>
          ) : result ? (
            <Animated.Text style={[s.bigMult, { color: result.won ? palette.success : palette.danger, transform: [{ scale: resultScale }] }]}>
              {result.mult.toFixed(2)}x
            </Animated.Text>
          ) : (
            <Text style={[s.bigMult, { color: palette.muted }]}>0.00x</Text>
          )}
        </View>
        {result && !playing && (
          <Text style={[s.resultLabel, { color: result.won ? palette.success : palette.danger }]}>
            {result.won ? `Won +${result.payout}` : 'Busted'}
          </Text>
        )}
      </View>

      {/* History */}
      <View style={s.historyRow}>
        {history.slice(0, 8).map((h, i) => (
          <View key={i} style={[s.histChip, { backgroundColor: (h.won ? palette.success : palette.danger) + '15' }]}>
            <Text style={[s.histText, { color: h.won ? palette.success : palette.danger }]}>{h.mult.toFixed(2)}x</Text>
          </View>
        ))}
      </View>

      {/* Target multiplier */}
      <View style={s.controls}>
        <View style={s.targetRow}>
          <Text style={s.targetLabel}>Target Multiplier</Text>
          <View style={s.targetInput}>
            <TextInput
              style={s.targetValue}
              value={targetMult}
              onChangeText={setTargetMult}
              keyboardType="decimal-pad"
              placeholderTextColor={palette.tertiary}
            />
            <Text style={s.targetX}>x</Text>
          </View>
        </View>
        <View style={s.presets}>
          {['1.50', '2.00', '5.00', '10.00', '100.00'].map(v => (
            <Pressable key={v} onPress={() => setTargetMult(v)} style={[s.presetBtn, targetMult === v && { borderColor: ACCENT + '50' }]}>
              <Text style={[s.presetText, targetMult === v && { color: ACCENT }]}>{v}x</Text>
            </Pressable>
          ))}
        </View>
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statLabel}>Win Chance</Text>
            <Text style={[s.statValue, { color: ACCENT }]}>{winChance}%</Text>
          </View>
          <View style={s.statItem}>
            <Text style={s.statLabel}>Payout</Text>
            <Text style={[s.statValue, { color: palette.success }]}>{(parseInt(betAmount || '0') * parseFloat(targetMult || '0')).toFixed(0)}</Text>
          </View>
        </View>
        <BetInput value={betAmount} onChange={setBetAmount} balance={balance} accent={ACCENT} />
        <Pressable onPress={play} disabled={playing}>
          <LinearGradient colors={['#EC4899', '#DB2777']} style={s.playBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={s.playText}>{playing ? 'Flying...' : 'Bet'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.panel, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: palette.text, fontSize: 24, marginTop: -2 },
  title: { color: palette.text, fontFamily: fonts.display, fontSize: 20 },
  balPill: { backgroundColor: palette.panel, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 },
  balText: { color: ACCENT, fontFamily: fonts.mono, fontSize: 14 },
  displayArea: { alignItems: 'center', justifyContent: 'center', height: 180, marginTop: 8 },
  glowRing: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 3 },
  multDisplay: { alignItems: 'center', justifyContent: 'center' },
  bigMult: { fontFamily: fonts.display, fontSize: 52 },
  resultLabel: { fontFamily: fonts.display, fontSize: 16, marginTop: 8 },
  historyRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  histChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  histText: { fontFamily: fonts.mono, fontSize: 11 },
  controls: { paddingHorizontal: 20, gap: 12 },
  targetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  targetLabel: { color: palette.muted, fontFamily: fonts.body, fontSize: 14 },
  targetInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.panel, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  targetValue: { color: palette.text, fontFamily: fonts.mono, fontSize: 18, minWidth: 70, textAlign: 'right' },
  targetX: { color: palette.muted, fontFamily: fonts.mono, fontSize: 18, marginLeft: 2 },
  presets: { flexDirection: 'row', gap: 6 },
  presetBtn: { flex: 1, backgroundColor: palette.panel, borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  presetText: { color: palette.muted, fontFamily: fonts.mono, fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statItem: { flex: 1, backgroundColor: palette.panel, borderRadius: 12, padding: 12 },
  statLabel: { color: palette.muted, fontFamily: fonts.light, fontSize: 11 },
  statValue: { fontFamily: fonts.display, fontSize: 18, marginTop: 4 },
  playBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', ...shadows.glow('#EC4899') },
  playText: { color: '#FFF', fontFamily: fonts.display, fontSize: 16 },
});
