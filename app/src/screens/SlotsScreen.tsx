import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Pressable, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { fonts, palette, gameColors, shadows } from '../theme/ui';

const ACCENT = gameColors.slots;
const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '⭐', '🔔'];
const REEL_SIZE = 3;
const NUM_REELS = 5;

const PAYOUTS: Record<string, number> = {
  '7️⃣': 50, '💎': 25, '⭐': 15, '🔔': 10, '🍇': 8, '🍊': 5, '🍋': 3, '🍒': 2,
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
  // Check middle row for matching from left
  const middle = reels.map(r => r[1]);
  let matchCount = 1;
  const first = middle[0];
  for (let i = 1; i < middle.length; i++) {
    if (middle[i] === first) matchCount++;
    else break;
  }
  if (matchCount >= 3) {
    const basePay = PAYOUTS[first] || 2;
    const mult = matchCount === 5 ? basePay * 5 : matchCount === 4 ? basePay * 2 : basePay;
    return { symbol: first, count: matchCount, mult };
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
  const [result, setResult] = useState<{ symbol: string; count: number; mult: number; payout: number } | null>(null);
  const [history, setHistory] = useState<{ mult: number; won: boolean }[]>([]);

  const reelAnims = useRef(Array.from({ length: NUM_REELS }, () => new Animated.Value(0))).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const winGlow = useRef(new Animated.Value(0)).current;

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
    winGlow.setValue(0);

    // Generate results
    const newReels = Array.from({ length: NUM_REELS }, () =>
      Array.from({ length: REEL_SIZE }, randomSymbol)
    );

    // Animate reels with staggered timing
    const anims = reelAnims.map((anim, i) => {
      anim.setValue(0);
      return Animated.timing(anim, {
        toValue: 1,
        duration: 600 + i * 200,
        easing: Easing.out(Easing.bounce),
        useNativeDriver: true,
      });
    });

    Animated.parallel(anims).start(() => {
      setReels(newReels);
      setSpinning(false);

      const win = checkWin(newReels);
      if (win) {
        const payout = Math.floor(bet * win.mult);
        setBalance(b => b + payout);
        setResult({ ...win, payout });
        setHistory(h => [{ mult: win.mult, won: true }, ...h.slice(0, 9)]);
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
        setHistory(h => [{ mult: 0, won: false }, ...h.slice(0, 9)]);
      }
    });
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

      {/* Slot machine */}
      <View style={s.machine}>
        <Animated.View style={[s.winLine, { opacity: winGlow }]} />
        <View style={s.reelsContainer}>
          {reels.map((reel, rIdx) => (
            <Animated.View key={rIdx} style={[s.reel, {
              transform: [{
                translateY: spinning ? reelAnims[rIdx].interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, -30, 0],
                }) : 0,
              }],
            }]}>
              {reel.map((sym, sIdx) => (
                <View key={sIdx} style={[s.symbolCell, sIdx === 1 && s.symbolMiddle]}>
                  <Text style={s.symbolText}>{spinning ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] : sym}</Text>
                </View>
              ))}
            </Animated.View>
          ))}
        </View>
      </View>

      {/* Result */}
      {result && (
        <Animated.View style={[s.resultCard, { transform: [{ scale: resultScale }] }]}>
          <Text style={s.resultEmoji}>{result.symbol}</Text>
          <View>
            <Text style={s.resultMult}>{result.count}x {result.symbol} — {result.mult}x</Text>
            <Text style={s.resultPayout}>+{result.payout}</Text>
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
        <BetInput value={betAmount} onChange={setBetAmount} balance={balance} accent={ACCENT} />
        <Pressable onPress={spin} disabled={spinning}>
          <LinearGradient colors={['#E879F9', '#C026D3']} style={s.spinBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={s.spinText}>{spinning ? 'Spinning...' : 'Spin'}</Text>
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
  historyRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 6, marginTop: 12, flexWrap: 'wrap' },
  histChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  histText: { fontFamily: fonts.mono, fontSize: 11 },
  controls: { paddingHorizontal: 20, marginTop: 16, gap: 12 },
  spinBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', ...shadows.glow(ACCENT) },
  spinText: { color: '#FFF', fontFamily: fonts.display, fontSize: 16 },
});
