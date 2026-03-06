import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Pressable, Easing, ScrollView, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { placeBet, settleBet } from '../services/gameApi';
import { fonts, palette, gameColors, shadows } from '../theme/ui';

const ACCENT = gameColors.wheel;
const { width: SW } = Dimensions.get('window');
const BANNER_HEIGHT = 200;
const SEGMENTS = [
  { label: '1.2x', mult: 1.2, color: '#22C55E', weight: 30 },
  { label: '1.5x', mult: 1.5, color: '#14B8A6', weight: 22 },
  { label: '2x', mult: 2, color: '#3B82F6', weight: 15 },
  { label: '3x', mult: 3, color: '#6366F1', weight: 10 },
  { label: '5x', mult: 5, color: '#A855F7', weight: 6 },
  { label: '8x', mult: 8, color: '#EC4899', weight: 3 },
  { label: '15x', mult: 15, color: '#F97316', weight: 1 },
  { label: '0x', mult: 0, color: '#374151', weight: 8 },
  { label: '0x', mult: 0, color: '#4B5563', weight: 5 },
];

function pickSegment(): number {
  const totalW = SEGMENTS.reduce((a, s) => a + s.weight, 0);
  let r = Math.random() * totalW;
  for (let i = 0; i < SEGMENTS.length; i++) {
    r -= SEGMENTS[i].weight;
    if (r <= 0) return i;
  }
  return 0;
}

export default function WheelScreen({ onBack }: { onBack: () => void }) {
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState('5');
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ segment: typeof SEGMENTS[number]; payout: number } | null>(null);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;

  const loadBalance = useCallback(async () => {
    try { setBalance(await getCreditsBalance()); } catch {}
  }, []);
  useEffect(() => { loadBalance(); }, []);

  const spin = async () => {
    const bet = parseInt(betAmount);
    if (!bet || bet < 1 || bet > balance || spinning) return;

    setSpinning(true);
    setResult(null);
    resultScale.setValue(0);

    try {
      const betRes = await placeBet(bet, 'wheel');
      setBalance(betRes.balance);
    } catch { setSpinning(false); return; }

    const winIdx = pickSegment();
    const seg = SEGMENTS[winIdx];
    const payout = Math.floor(bet * seg.mult);

    // Spin: 3 full rotations + landing angle
    const segAngle = 360 / SEGMENTS.length;
    const targetAngle = 360 * 4 + (360 - winIdx * segAngle - segAngle / 2);

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: targetAngle,
      duration: 3500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(async () => {
      try {
        const res = await settleBet(payout, 'wheel', payout > 0);
        setBalance(res.balance);
      } catch {}
      setResult({ segment: seg, payout });
      setSpinning(false);
      Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 8 }).start();
    });
  };

  const rotation = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={s.screen}>
      <AmbientBackground tone="warm" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Wheel</Text>
        <View style={s.balPill}>
          <Text style={s.balText}>{balance.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={s.bannerWrap}>
          <Image source={require('../../assets/wheel.jpeg')} style={s.bannerImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(15,33,46,0.6)', palette.bg]}
            style={s.bannerOverlay}
            start={{ x: 0.5, y: 0.2 }}
            end={{ x: 0.5, y: 1 }}
          />
        </View>

        {/* Wheel */}
        <View style={s.wheelArea}>
        <View style={s.pointer} />
        <Animated.View style={[s.wheel, { transform: [{ rotate: rotation }] }]}>
          {SEGMENTS.map((seg, i) => {
            const angle = (i * 360) / SEGMENTS.length;
            return (
              <View key={i} style={[s.segment, { transform: [{ rotate: `${angle}deg` }] }]}>
                <View style={[s.segInner, { backgroundColor: seg.color }]}>
                  <Text style={s.segLabel}>{seg.label}</Text>
                </View>
              </View>
            );
          })}
        </Animated.View>
      </View>

      {/* Result */}
      {result && (
        <Animated.View style={[s.resultCard, { transform: [{ scale: resultScale }], borderColor: result.segment.color + '50' }]}>
          <Text style={[s.resultMult, { color: result.segment.color }]}>{result.segment.label}</Text>
          <Text style={[s.resultPayout, { color: result.payout > 0 ? palette.success : palette.danger }]}>
            {result.payout > 0 ? `+${result.payout}` : 'No win'}
          </Text>
        </Animated.View>
      )}

      {/* Controls */}
      <View style={s.controls}>
        <BetInput amount={betAmount} onChangeAmount={setBetAmount} balance={balance} accentColor={ACCENT} />
        <Pressable onPress={spin} disabled={spinning}>
          <LinearGradient colors={['#FACC15', '#EAB308']} style={s.spinBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
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
  scroll: { paddingBottom: 120 },
  bannerWrap: { width: SW, height: BANNER_HEIGHT, overflow: 'hidden', marginBottom: -20 },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.panel, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: palette.text, fontSize: 24, marginTop: -2 },
  title: { color: palette.text, fontFamily: fonts.display, fontSize: 20 },
  balPill: { backgroundColor: palette.panel, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 },
  balText: { color: ACCENT, fontFamily: fonts.mono, fontSize: 14 },
  wheelArea: { alignItems: 'center', justifyContent: 'center', marginTop: 16, height: 280 },
  pointer: { position: 'absolute', top: 10, zIndex: 10, width: 0, height: 0, borderLeftWidth: 12, borderRightWidth: 12, borderTopWidth: 24, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: ACCENT },
  wheel: { width: 250, height: 250, borderRadius: 125, backgroundColor: palette.panel, overflow: 'hidden', borderWidth: 4, borderColor: palette.panelSoft },
  segment: { position: 'absolute', width: '50%', height: '50%', top: 0, left: '25%', transformOrigin: 'bottom center' },
  segInner: { flex: 1, alignItems: 'center', paddingTop: 6, borderRadius: 4 },
  segLabel: { color: '#FFF', fontFamily: fonts.mono, fontSize: 10 },
  resultCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: palette.panel, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, ...shadows.medium },
  resultMult: { fontFamily: fonts.display, fontSize: 32 },
  resultPayout: { fontFamily: fonts.mono, fontSize: 16, marginTop: 4 },
  controls: { paddingHorizontal: 20, marginTop: 16, gap: 12 },
  spinBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', ...shadows.glow(ACCENT) },
  spinText: { color: '#000', fontFamily: fonts.display, fontSize: 16 },
});
