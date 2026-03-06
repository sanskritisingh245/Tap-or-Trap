import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Pressable, ScrollView, Image, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { placeBet, settleBet } from '../services/gameApi';
import { fonts, palette, gameColors, shadows } from '../theme/ui';

const ACCENT = gameColors.slots;
const { width: SW } = Dimensions.get('window');
const BANNER_HEIGHT = 200;
const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '⭐', '🔔'];
const REEL_SIZE = 3;
const NUM_REELS = 5;

const PAYOUTS: Record<string, number> = {
  '7️⃣': 10, '💎': 6, '⭐': 4, '🔔': 3, '🍇': 2.5, '🍊': 2, '🍋': 1.5, '🍒': 1,
};

function randomSymbol(): string {
  // Weighted: common fruits more likely
  const weights = [20, 18, 15, 12, 8, 4, 6, 10];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SYMBOLS.length; i++) {
    r -= weights[i];
    if (r <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[0];
}

function checkWin(reels: string[][]): { symbol: string; count: number; mult: number } | null {
  // Only pay out on a full row (all 5 reels match on any row)
  for (let row = 0; row < REEL_SIZE; row++) {
    const line = reels.map(r => r[row]);
    const first = line[0];
    if (line.every(s => s === first)) {
      const basePay = PAYOUTS[first] || 2;
      return { symbol: first, count: 5, mult: basePay * 3 };
    }
  }
  return null;
}

export default function SlotsScreen({ onBack }: { onBack: () => void }) {
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState('5');
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState<string[][]>(
    Array.from({ length: NUM_REELS }, () => Array.from({ length: REEL_SIZE }, randomSymbol))
  );
  const [result, setResult] = useState<{ symbol: string; count: number; mult: number; payout: number; won: boolean } | null>(null);
  const [history, setHistory] = useState<{ mult: number; won: boolean }[]>([]);

  const [displayReels, setDisplayReels] = useState<string[][]>(reels);
  const spinIntervals = useRef<(ReturnType<typeof setInterval> | null)[]>(Array(NUM_REELS).fill(null));
  const reelScrollY = useRef(Array.from({ length: NUM_REELS }, () => new Animated.Value(0))).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const winGlow = useRef(new Animated.Value(0)).current;

  const loadBalance = useCallback(async () => {
    try { setBalance(await getCreditsBalance()); } catch {}
  }, []);
  useEffect(() => { loadBalance(); }, []);
  useEffect(() => {
    return () => { spinIntervals.current.forEach(iv => iv && clearInterval(iv)); };
  }, []);

  const spin = async () => {
    const bet = parseInt(betAmount);
    if (!bet || bet < 1 || spinning) return;
    if (bet > balance) {
      Alert.alert('Insufficient credits', `You need ${bet} credits but only have ${balance}.`);
      return;
    }

    setSpinning(true);
    setResult(null);
    resultScale.setValue(0);
    winGlow.setValue(0);

    try {
      const betRes = await placeBet(bet, 'slots');
      setBalance(betRes.balance);
    } catch { setSpinning(false); return; }

    const newReels = Array.from({ length: NUM_REELS }, () =>
      Array.from({ length: REEL_SIZE }, randomSymbol)
    );

    // Start rapid symbol cycling for each reel
    spinIntervals.current.forEach((iv) => iv && clearInterval(iv));
    for (let i = 0; i < NUM_REELS; i++) {
      reelScrollY[i].setValue(0);
      spinIntervals.current[i] = setInterval(() => {
        setDisplayReels(prev => {
          const copy = [...prev];
          copy[i] = Array.from({ length: REEL_SIZE }, randomSymbol);
          return copy;
        });
      }, 80);
    }

    // Stop reels one by one with staggered delay + bounce animation
    for (let i = 0; i < NUM_REELS; i++) {
      const idx = i;
      setTimeout(() => {
        if (spinIntervals.current[idx]) {
          clearInterval(spinIntervals.current[idx]!);
          spinIntervals.current[idx] = null;
        }
        setDisplayReels(prev => {
          const copy = [...prev];
          copy[idx] = newReels[idx];
          return copy;
        });
        reelScrollY[idx].setValue(-20);
        Animated.spring(reelScrollY[idx], {
          toValue: 0,
          useNativeDriver: true,
          damping: 8,
          stiffness: 300,
        }).start();
      }, 400 + idx * 300);
    }

    // Wait for all reels to finish (last reel stops at 400 + 4*300 = 1600ms, plus ~400ms for bounce)
    const totalWait = 400 + (NUM_REELS - 1) * 300 + 400;
    await new Promise<void>(resolve => setTimeout(resolve, totalWait));

    setReels(newReels);
    setSpinning(false);

    const win = checkWin(newReels);
    if (win && win.mult > 0) {
      const payout = Math.floor(bet * win.mult);
      try {
        const res = await settleBet(payout, 'slots', true);
        setBalance(res.balance);
      } catch {}
      setResult({ ...win, payout, won: true });
      setHistory(h => [{ mult: win.mult, won: true }, ...h.slice(0, 9)]);
      resultScale.setValue(0);
      Animated.parallel([
        Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 8 }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(winGlow, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(winGlow, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
          { iterations: 3 }
        ),
      ]).start();
    } else {
      try {
        const res = await settleBet(0, 'slots', false);
        setBalance(res.balance);
      } catch {}
      setResult({ symbol: '✕', count: 0, mult: 0, payout: 0, won: false });
      setHistory(h => [{ mult: 0, won: false }, ...h.slice(0, 9)]);
      resultScale.setValue(0);
      Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 8 }).start();
    }
  };

  const autoSpin = () => {
    // Quick 5x auto spin
    spin();
  };

  return (
    <View style={s.screen}>
      <AmbientBackground tone="warm" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Slots</Text>
        <View style={s.balPill}>
          <Text style={s.balText}>{balance.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={s.bannerWrap}>
          <Image source={require('../../assets/Slots.jpeg')} style={s.bannerImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(15,33,46,0.6)', palette.bg]}
            style={s.bannerOverlay}
            start={{ x: 0.5, y: 0.2 }}
            end={{ x: 0.5, y: 1 }}
          />
        </View>

        {/* Slot machine */}
        <View style={s.machine}>
        <Animated.View style={[s.winLine, { opacity: winGlow }]} />
        <View style={s.reelsContainer}>
          {displayReels.map((reel, rIdx) => (
            <Animated.View key={rIdx} style={[s.reel, {
              transform: [{ translateY: reelScrollY[rIdx] }],
            }]}>
              {reel.map((sym, sIdx) => (
                <View key={sIdx} style={[s.symbolCell, sIdx === 1 && s.symbolMiddle]}>
                  <Text style={s.symbolText}>{sym}</Text>
                </View>
              ))}
            </Animated.View>
          ))}
        </View>
      </View>

      {/* Result */}
      {result && (
        <Animated.View style={[s.resultCard, { transform: [{ scale: resultScale }], borderColor: result.won ? palette.success + '40' : palette.danger + '40', borderWidth: 1 }]}>
          {result.won && <Text style={s.resultEmoji}>{result.symbol}</Text>}
          <View>
            {result.won ? (
              <>
                <Text style={s.resultMult}>{result.count}x {result.symbol} — {result.mult}x</Text>
                <Text style={s.resultPayout}>+{result.payout} credits</Text>
              </>
            ) : (
              <Text style={s.resultLoss}>No match — you lost!</Text>
            )}
          </View>
        </Animated.View>
      )}

      {/* History */}
      <View style={s.historyRow}>
        {history.slice(0, 8).map((h, i) => (
          <View key={i} style={[s.histChip, { backgroundColor: (h.won ? palette.success : palette.danger) + '15' }]}>
            <Text style={[s.histText, { color: h.won ? palette.success : palette.danger }]}>{h.won ? `${h.mult}x` : '—'}</Text>
          </View>
        ))}
      </View>

      {/* Controls */}
      <View style={s.controls}>
        <BetInput amount={betAmount} onChangeAmount={setBetAmount} balance={balance} accentColor={ACCENT} />
        <Pressable onPress={spin} disabled={spinning}>
          <LinearGradient colors={['#E879F9', '#C026D3']} style={s.spinBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
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
  machine: { marginHorizontal: 20, marginTop: 20, backgroundColor: palette.panel, borderRadius: 20, padding: 16, ...shadows.strong, position: 'relative' },
  winLine: { position: 'absolute', left: 8, right: 8, top: '50%', height: 3, backgroundColor: ACCENT, borderRadius: 2, zIndex: 10 },
  reelsContainer: { flexDirection: 'row', gap: 6 },
  reel: { flex: 1, gap: 4 },
  symbolCell: { backgroundColor: palette.panelSoft, borderRadius: 10, height: 64, alignItems: 'center', justifyContent: 'center' },
  symbolMiddle: { backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.panelStroke },
  symbolText: { fontSize: 28 },
  resultCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: palette.panel, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadows.medium },
  resultEmoji: { fontSize: 36 },
  resultMult: { color: palette.text, fontFamily: fonts.display, fontSize: 16 },
  resultPayout: { color: palette.success, fontFamily: fonts.mono, fontSize: 14, marginTop: 2 },
  resultLoss: { color: palette.danger, fontFamily: fonts.display, fontSize: 16 },
  historyRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 6, marginTop: 12, flexWrap: 'wrap' },
  histChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  histText: { fontFamily: fonts.mono, fontSize: 11 },
  controls: { paddingHorizontal: 20, marginTop: 16, gap: 12 },
  spinBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', ...shadows.glow(ACCENT) },
  spinText: { color: '#FFF', fontFamily: fonts.display, fontSize: 16 },
});
