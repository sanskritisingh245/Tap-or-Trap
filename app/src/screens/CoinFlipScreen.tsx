import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { playCoinFlip, CoinFlipResult } from '../services/gameApi';
import { hapticWin, hapticLoss, hapticFlip } from '../utils/sounds';
import { fonts, palette, gameColors, shadows } from '../theme/ui';

const ACCENT = gameColors.coinflip;

export default function CoinFlipScreen({ onBack }: { onBack: () => void }) {
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState('5');
  const [choice, setChoice] = useState<'heads' | 'tails'>('heads');
  const [result, setResult] = useState<CoinFlipResult | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [error, setError] = useState('');

  const flipAnim = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const flipBtnScale = useRef(new Animated.Value(1)).current;

  const loadBalance = useCallback(async () => {
    try { setBalance(await getCreditsBalance()); } catch {}
  }, []);

  useEffect(() => { loadBalance(); }, []);

  const handleFlip = async () => {
    const amount = parseInt(betAmount);
    if (!amount || amount < 1) { setError('Enter a valid bet'); return; }
    if (amount > balance) { setError('Insufficient credits'); return; }

    setError('');
    setResult(null);
    setFlipping(true);
    resultScale.setValue(0);

    hapticFlip();
    flipAnim.setValue(0);
    Animated.timing(flipAnim, {
      toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();

    try {
      const res = await playCoinFlip(amount, choice);
      setResult(res);
      setBalance(res.balance);
      Animated.spring(resultScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
      if (res.won) hapticWin(); else hapticLoss();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setFlipping(false);
    }
  };

  const coinRotation = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1080deg'],
  });

  return (
    <View style={styles.screen}>
      <AmbientBackground tone="warm" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← GAMES</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: ACCENT }]}>COIN FLIP</Text>
        <Text style={styles.balText}>{balance} ¢</Text>
      </View>

      {/* Coin Display */}
      <View style={styles.coinArea}>
        <LinearGradient
          colors={[ACCENT + '10', 'transparent']}
          style={styles.coinGlow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <Animated.View style={[styles.coin, { transform: [{ rotateY: coinRotation }] }]}>
          <Text style={styles.coinEmoji}>
            {result ? (result.result === 'heads' ? '🪙' : '🌑') : (choice === 'heads' ? '🪙' : '🌑')}
          </Text>
        </Animated.View>

        {result && (
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
              <Text style={styles.resultSide}>{result.result.toUpperCase()}</Text>
              <Text style={[styles.resultPayout, result.won ? styles.payoutWin : styles.payoutLose]}>
                {result.won ? `+${result.payout}` : `-${result.amount}`}
              </Text>
            </LinearGradient>
          </Animated.View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <BetInput amount={betAmount} onChangeAmount={setBetAmount} balance={balance} disabled={flipping} accentColor={ACCENT} />

        {/* Choice */}
        <View style={styles.choiceRow}>
          {(['heads', 'tails'] as const).map(side => (
            <Pressable
              key={side}
              style={[styles.choiceBtn, choice === side && styles.choiceActive]}
              onPress={() => setChoice(side)}
              disabled={flipping}
            >
              {choice === side ? (
                <LinearGradient
                  colors={[ACCENT + '25', ACCENT + '08']}
                  style={styles.choiceGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                >
                  <Text style={styles.choiceEmoji}>{side === 'heads' ? '🪙' : '🌑'}</Text>
                  <Text style={[styles.choiceText, { color: ACCENT }]}>{side.toUpperCase()}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.choiceGrad}>
                  <Text style={styles.choiceEmoji}>{side === 'heads' ? '🪙' : '🌑'}</Text>
                  <Text style={styles.choiceText}>{side.toUpperCase()}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <Text style={styles.multiplier}>1.8x payout</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={handleFlip}
          disabled={flipping}
          onPressIn={() => Animated.spring(flipBtnScale, { toValue: 0.96, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
          onPressOut={() => Animated.spring(flipBtnScale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
        >
          <Animated.View style={{ transform: [{ scale: flipBtnScale }] }}>
            <LinearGradient
              colors={[ACCENT, ACCENT + 'CC']}
              style={[styles.flipBtn, flipping && styles.btnDisabled, shadows.glow(ACCENT)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.flipText}>{flipping ? 'FLIPPING...' : 'FLIP'}</Text>
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
  coinArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  coinGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%', borderRadius: 20 },
  coin: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center' },
  coinEmoji: { fontSize: 80 },
  resultBox: {
    marginTop: 20, borderRadius: 18, padding: 18, alignItems: 'center', minWidth: 160,
    ...shadows.medium,
  },
  resultTitle: { color: palette.text, fontFamily: fonts.display, fontSize: 28 },
  resultSide: { color: palette.muted, fontFamily: fonts.mono, fontSize: 13, marginTop: 2 },
  resultPayout: { fontFamily: fonts.display, fontSize: 22, marginTop: 4 },
  payoutWin: { color: palette.success },
  payoutLose: { color: palette.danger },
  controls: { paddingHorizontal: 16, paddingBottom: 32 },
  choiceRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  choiceBtn: {
    flex: 1, borderRadius: 18, overflow: 'hidden',
    backgroundColor: palette.panelSoft, ...shadows.subtle,
  },
  choiceActive: { backgroundColor: 'transparent' },
  choiceGrad: { paddingVertical: 14, alignItems: 'center' },
  choiceEmoji: { fontSize: 28, marginBottom: 4 },
  choiceText: { color: palette.muted, fontFamily: fonts.display, fontSize: 14 },
  multiplier: { color: palette.muted, fontFamily: fonts.mono, fontSize: 11, textAlign: 'center', marginBottom: 8 },
  error: { color: palette.danger, fontFamily: fonts.mono, fontSize: 12, textAlign: 'center', marginBottom: 8 },
  flipBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  flipText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 22 },
});
