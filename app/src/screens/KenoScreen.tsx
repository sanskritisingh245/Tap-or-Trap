import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Pressable, ScrollView, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { placeBet, settleBet } from '../services/gameApi';
import { fonts, palette, gameColors, shadows } from '../theme/ui';

const ACCENT = gameColors.keno;
const { width: SW } = Dimensions.get('window');
const BANNER_HEIGHT = 200;
const GRID = 40;
const MAX_PICKS = 10;

function getKenoMultiplier(picks: number, hits: number): number {
  const table: Record<number, number[]> = {
    1: [0, 2.5],
    2: [0, 1.2, 4],
    3: [0, 0, 2, 10],
    4: [0, 0, 1.2, 4, 20],
    5: [0, 0, 0, 2, 8, 40],
    6: [0, 0, 0, 1.2, 3, 15, 60],
    7: [0, 0, 0, 0.8, 2, 8, 30, 80],
    8: [0, 0, 0, 0, 1.5, 5, 15, 50, 100],
    9: [0, 0, 0, 0, 1, 3, 10, 40, 80, 150],
    10: [0, 0, 0, 0, 0, 2, 6, 20, 60, 120, 250],
  };
  return table[picks]?.[hits] ?? 0;
}

export default function KenoScreen({ onBack }: { onBack: () => void }) {
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState('5');
  const [selected, setSelected] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<{ hits: number; mult: number; payout: number } | null>(null);
  const [revealIdx, setRevealIdx] = useState(-1);

  const resultScale = useRef(new Animated.Value(0)).current;

  const loadBalance = useCallback(async () => {
    try { setBalance(await getCreditsBalance()); } catch {}
  }, []);
  useEffect(() => { loadBalance(); }, []);

  const toggleNum = (n: number) => {
    if (playing) return;
    if (selected.includes(n)) setSelected(s => s.filter(x => x !== n));
    else if (selected.length < MAX_PICKS) setSelected(s => [...s, n]);
  };

  const autoSelect = () => {
    if (playing) return;
    const nums: number[] = [];
    while (nums.length < MAX_PICKS) {
      const n = Math.floor(Math.random() * GRID) + 1;
      if (!nums.includes(n)) nums.push(n);
    }
    setSelected(nums);
  };

  const play = async () => {
    const bet = parseInt(betAmount);
    if (!bet || bet < 1 || bet > balance || playing || selected.length === 0) return;

    setPlaying(true);
    setResult(null);
    setDrawn([]);
    setRevealIdx(-1);
    resultScale.setValue(0);

    try {
      const betRes = await placeBet(bet, 'keno');
      setBalance(betRes.balance);
    } catch { setPlaying(false); return; }

    // Draw 10 unique numbers
    const drawnNums: number[] = [];
    while (drawnNums.length < 10) {
      const n = Math.floor(Math.random() * GRID) + 1;
      if (!drawnNums.includes(n)) drawnNums.push(n);
    }

    // Reveal one by one
    let i = 0;
    const interval = setInterval(async () => {
      if (i < drawnNums.length) {
        setDrawn(d => [...d, drawnNums[i]]);
        setRevealIdx(i);
        i++;
      } else {
        clearInterval(interval);
        const hits = selected.filter(n => drawnNums.includes(n)).length;
        const mult = getKenoMultiplier(selected.length, hits);
        const payout = Math.floor(bet * mult);
        try {
          const res = await settleBet(payout, 'keno', payout > 0);
          setBalance(res.balance);
        } catch {}
        setResult({ hits, mult, payout });
        setPlaying(false);
        Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 8 }).start();
      }
    }, 200);
  };

  return (
    <View style={s.screen}>
      <AmbientBackground tone="cool" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Keno</Text>
        <View style={s.balPill}>
          <Text style={s.balText}>{balance.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={s.bannerWrap}>
          <Image source={require('../../assets/keno.jpeg')} style={s.bannerImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(15,33,46,0.6)', palette.bg]}
            style={s.bannerOverlay}
            start={{ x: 0.5, y: 0.2 }}
            end={{ x: 0.5, y: 1 }}
          />
        </View>

        {/* Grid */}
        <View style={s.grid}>
          {Array.from({ length: GRID }).map((_, i) => {
            const num = i + 1;
            const isSelected = selected.includes(num);
            const isDrawn = drawn.includes(num);
            const isHit = isSelected && isDrawn;
            const isMiss = isDrawn && !isSelected;

            return (
              <Pressable key={num} onPress={() => toggleNum(num)} style={[
                s.tile,
                isSelected && !isDrawn && s.tileSelected,
                isHit && s.tileHit,
                isMiss && s.tileMiss,
                isDrawn && !isSelected && !isMiss && s.tileDrawn,
              ]}>
                <Text style={[
                  s.tileText,
                  isSelected && { color: '#FFF' },
                  isHit && { color: '#FFF' },
                ]}>{num}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={s.pickInfo}>
          <Text style={s.pickText}>{selected.length}/{MAX_PICKS} picked</Text>
          <Pressable onPress={autoSelect} style={s.autoBtn}>
            <Text style={s.autoText}>Auto Pick</Text>
          </Pressable>
          <Pressable onPress={() => !playing && setSelected([])} style={s.autoBtn}>
            <Text style={s.autoText}>Clear</Text>
          </Pressable>
        </View>

        {/* Result */}
        {result && (
          <Animated.View style={[s.resultCard, { transform: [{ scale: resultScale }] }]}>
            <Text style={s.resultHits}>{result.hits} hits</Text>
            <Text style={[s.resultMult, { color: result.payout > 0 ? palette.success : palette.danger }]}>
              {result.mult > 0 ? `${result.mult}x — +${result.payout}` : 'No win'}
            </Text>
          </Animated.View>
        )}

        <View style={s.controls}>
          <BetInput amount={betAmount} onChangeAmount={setBetAmount} balance={balance} accentColor={ACCENT} />
          <Pressable onPress={play} disabled={playing || selected.length === 0}>
            <LinearGradient colors={['#14B8A6', '#0D9488']} style={[s.playBtn, (playing || selected.length === 0) && { opacity: 0.5 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={s.playText}>{playing ? 'Drawing...' : 'Play'}</Text>
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
  bannerWrap: { width: SW, height: BANNER_HEIGHT, overflow: 'hidden', marginBottom: -20 },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, marginTop: 8 },
  tile: { width: '11.5%', aspectRatio: 1, borderRadius: 8, backgroundColor: palette.panel, alignItems: 'center', justifyContent: 'center' },
  tileText: { color: palette.muted, fontFamily: fonts.mono, fontSize: 13 },
  tileSelected: { backgroundColor: ACCENT, ...shadows.glow(ACCENT) },
  tileHit: { backgroundColor: palette.success, ...shadows.glow('#22C55E') },
  tileMiss: { backgroundColor: palette.danger + '30' },
  tileDrawn: { backgroundColor: palette.panelSoft },
  pickInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginTop: 12 },
  pickText: { color: palette.muted, fontFamily: fonts.mono, fontSize: 13, flex: 1 },
  autoBtn: { backgroundColor: palette.panel, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  autoText: { color: ACCENT, fontFamily: fonts.display, fontSize: 12 },
  resultCard: { marginHorizontal: 20, marginTop: 12, backgroundColor: palette.panel, borderRadius: 16, padding: 16, alignItems: 'center', ...shadows.medium },
  resultHits: { color: palette.text, fontFamily: fonts.display, fontSize: 20 },
  resultMult: { fontFamily: fonts.mono, fontSize: 16, marginTop: 4 },
  controls: { paddingHorizontal: 20, marginTop: 12, gap: 12 },
  playBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', ...shadows.glow(ACCENT) },
  playText: { color: '#FFF', fontFamily: fonts.display, fontSize: 16 },
});
