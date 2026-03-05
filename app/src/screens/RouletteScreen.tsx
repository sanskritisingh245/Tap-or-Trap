import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Pressable, Easing, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { fonts, palette, gameColors, shadows } from '../theme/ui';

const ACCENT = gameColors.roulette;

type BetType = 'red' | 'black' | 'green' | 'odd' | 'even' | '1-18' | '19-36';
const RED_NUMS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

function getColor(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green';
  return RED_NUMS.includes(n) ? 'red' : 'black';
}

function getMultiplier(bet: BetType): number {
  if (bet === 'green') return 36;
  return 2;
}

function doesWin(bet: BetType, result: number): boolean {
  if (bet === 'red') return getColor(result) === 'red';
  if (bet === 'black') return getColor(result) === 'black';
  if (bet === 'green') return result === 0;
  if (bet === 'odd') return result > 0 && result % 2 === 1;
  if (bet === 'even') return result > 0 && result % 2 === 0;
  if (bet === '1-18') return result >= 1 && result <= 18;
  if (bet === '19-36') return result >= 19 && result <= 36;
  return false;
}

export default function RouletteScreen({ onBack }: { onBack: () => void }) {
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState('10');
  const [betType, setBetType] = useState<BetType>('red');
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ number: number; won: boolean; payout: number } | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const ballAnim = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;

  const loadBalance = useCallback(async () => {
    try { setBalance(await getCreditsBalance()); } catch {}
  }, []);
  useEffect(() => { loadBalance(); }, []);

  const spin = () => {
    const bet = parseInt(betAmount);
    if (!bet || bet < 1 || bet > balance || spinning) return;

    setSpinning(true);
    setResult(null);
    setBalance(b => b - bet);
    resultScale.setValue(0);

    const num = Math.floor(Math.random() * 37); // 0-36
    const won = doesWin(betType, num);
    const mult = getMultiplier(betType);
    const payout = won ? Math.floor(bet * mult) : 0;

    // Animate
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 360 * 5,
      duration: 3000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (payout > 0) setBalance(b => b + payout);
      setResult({ number: num, won, payout });
      setHistory(h => [num, ...h.slice(0, 14)]);
      setSpinning(false);
      Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 8 }).start();
    });
  };

  const rotation = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const betOptions: { type: BetType; label: string; color: string }[] = [
    { type: 'red', label: 'Red', color: '#EF4444' },
    { type: 'black', label: 'Black', color: '#374151' },
    { type: 'green', label: '0', color: '#22C55E' },
    { type: 'odd', label: 'Odd', color: '#6366F1' },
    { type: 'even', label: 'Even', color: '#3B82F6' },
    { type: '1-18', label: '1-18', color: '#F97316' },
    { type: '19-36', label: '19-36', color: '#EC4899' },
  ];

  return (
    <View style={s.screen}>
      <AmbientBackground tone="warm" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Roulette</Text>
        <View style={s.balPill}>
          <Text style={s.balText}>{balance.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Wheel visual */}
        <View style={s.wheelArea}>
          <Animated.View style={[s.wheel, { transform: [{ rotate: rotation }] }]}>
            <LinearGradient colors={['#1A2C38', '#0F212E', '#1A2C38']} style={s.wheelInner}>
              <View style={s.wheelCenter}>
                {result && !spinning ? (
                  <Text style={[s.wheelNum, { color: getColor(result.number) === 'red' ? '#EF4444' : getColor(result.number) === 'green' ? '#22C55E' : '#FFF' }]}>
                    {result.number}
                  </Text>
                ) : (
                  <Text style={[s.wheelNum, { color: palette.muted }]}>{spinning ? '...' : '?'}</Text>
                )}
              </View>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* History */}
        <View style={s.historyRow}>
          {history.map((n, i) => (
            <View key={i} style={[s.histChip, {
              backgroundColor: getColor(n) === 'red' ? '#EF444430' : getColor(n) === 'green' ? '#22C55E30' : '#37415130'
            }]}>
              <Text style={[s.histText, {
                color: getColor(n) === 'red' ? '#EF4444' : getColor(n) === 'green' ? '#22C55E' : '#9CA3AF'
              }]}>{n}</Text>
            </View>
          ))}
        </View>

        {/* Result */}
        {result && (
          <Animated.View style={[s.resultCard, { transform: [{ scale: resultScale }] }]}>
            <Text style={[s.resultNum, { color: getColor(result.number) === 'red' ? '#EF4444' : getColor(result.number) === 'green' ? '#22C55E' : '#FFF' }]}>
              {result.number}
            </Text>
            <Text style={[s.resultLabel, { color: result.won ? palette.success : palette.danger }]}>
              {result.won ? `Won +${result.payout}` : 'No win'}
            </Text>
          </Animated.View>
        )}

        {/* Bet type selector */}
        <View style={s.betTypes}>
          {betOptions.map(opt => (
            <Pressable key={opt.type} onPress={() => !spinning && setBetType(opt.type)} style={[
              s.betTypeBtn,
              { backgroundColor: opt.color + (betType === opt.type ? '40' : '15') },
              betType === opt.type && { borderColor: opt.color + '80' },
            ]}>
              <Text style={[s.betTypeText, { color: betType === opt.type ? '#FFF' : palette.muted }]}>{opt.label}</Text>
              {betType === opt.type && <Text style={s.betTypeMult}>{getMultiplier(opt.type)}x</Text>}
            </Pressable>
          ))}
        </View>

        <View style={s.controls}>
          <BetInput value={betAmount} onChange={setBetAmount} balance={balance} accent={ACCENT} />
          <Pressable onPress={spin} disabled={spinning}>
            <LinearGradient colors={['#EF4444', '#DC2626']} style={s.spinBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={s.spinText}>{spinning ? 'Spinning...' : 'Spin'}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
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
  scroll: { paddingBottom: 120 },
  wheelArea: { alignItems: 'center', marginTop: 16, height: 200 },
  wheel: { width: 180, height: 180, borderRadius: 90, borderWidth: 6, borderColor: palette.panelSoft },
  wheelInner: { flex: 1, borderRadius: 84, alignItems: 'center', justifyContent: 'center' },
  wheelCenter: { width: 80, height: 80, borderRadius: 40, backgroundColor: palette.panel, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: palette.panelStroke },
  wheelNum: { fontFamily: fonts.display, fontSize: 32 },
  historyRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 6, marginTop: 8, flexWrap: 'wrap' },
  histChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  histText: { fontFamily: fonts.mono, fontSize: 12 },
  resultCard: { marginHorizontal: 20, marginTop: 12, backgroundColor: palette.panel, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, ...shadows.medium },
  resultNum: { fontFamily: fonts.display, fontSize: 28 },
  resultLabel: { fontFamily: fonts.display, fontSize: 16 },
  betTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginTop: 16 },
  betTypeBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'transparent', alignItems: 'center' },
  betTypeText: { fontFamily: fonts.display, fontSize: 13 },
  betTypeMult: { color: palette.muted, fontFamily: fonts.mono, fontSize: 9, marginTop: 2 },
  controls: { paddingHorizontal: 20, marginTop: 16, gap: 12 },
  spinBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', ...shadows.glow(ACCENT) },
  spinText: { color: '#FFF', fontFamily: fonts.display, fontSize: 16 },
});
