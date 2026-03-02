import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Easing,
} from 'react-native';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { playCoinFlip, CoinFlipResult } from '../services/gameApi';
import { hapticWin, hapticLoss, hapticFlip } from '../utils/sounds';
import { fonts, palette, gameColors, fs } from '../theme/ui';

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

  const loadBalance = useCallback(async () => {
    try {
      const bal = await getCreditsBalance();
      console.log('[CoinFlip] loaded balance:', bal);
      setBalance(bal);
    } catch (e: any) {
      console.log('[CoinFlip] loadBalance ERROR:', e.message);
    }
  }, []);

  useEffect(() => { loadBalance(); }, []);

  const handleFlip = async () => {
    console.log('[CoinFlip] handleFlip called, betAmount:', betAmount, 'balance:', balance);
    const amount = parseInt(betAmount);
    if (!amount || amount < 1) { console.log('[CoinFlip] invalid bet'); setError('Enter a valid bet'); return; }
    if (amount > balance) { console.log('[CoinFlip] insufficient credits', amount, '>', balance); setError('Insufficient credits'); return; }

    setError('');
    setResult(null);
    setFlipping(true);
    resultScale.setValue(0);

    // Coin flip animation + haptic
    hapticFlip();
    flipAnim.setValue(0);
    Animated.timing(flipAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    try {
      console.log('[CoinFlip] calling playCoinFlip', amount, choice);
      const res = await playCoinFlip(amount, choice);
      console.log('[CoinFlip] result:', JSON.stringify(res));
      setResult(res);
      setBalance(res.balance);

      // Pop in result
      Animated.spring(resultScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();

      if (res.won) {
        hapticWin();
      } else {
        hapticLoss();
      }
    } catch (e: any) {
      console.log('[CoinFlip] ERROR:', e.message);
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
        <View style={{ width: 60 }} />
      </View>

      {/* Coin Display */}
      <View style={styles.coinArea}>
        <Animated.View style={[styles.coin, { transform: [{ rotateY: coinRotation }] }]}>
          <Text style={styles.coinEmoji}>
            {result ? (result.result === 'heads' ? '🪙' : '🌑') : (choice === 'heads' ? '🪙' : '🌑')}
          </Text>
        </Animated.View>

        {result && (
          <Animated.View style={[styles.resultBox, result.won ? styles.resultWin : styles.resultLose, { transform: [{ scale: resultScale }] }]}>
            <Text style={styles.resultTitle}>{result.won ? 'WIN!' : 'LOSS'}</Text>
            <Text style={styles.resultSide}>{result.result.toUpperCase()}</Text>
            <Text style={[styles.resultPayout, result.won ? styles.payoutWin : styles.payoutLose]}>
              {result.won ? `+${result.payout}` : `-${result.amount}`}
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <BetInput
          amount={betAmount}
          onChangeAmount={setBetAmount}
          balance={balance}
          disabled={flipping}
          accentColor={ACCENT}
        />

        {/* Choice */}
        <View style={styles.choiceRow}>
          <TouchableOpacity
            style={[styles.choiceBtn, choice === 'heads' && { borderColor: ACCENT, backgroundColor: ACCENT + '20' }]}
            onPress={() => setChoice('heads')}
            disabled={flipping}
          >
            <Text style={styles.choiceEmoji}>🪙</Text>
            <Text style={[styles.choiceText, choice === 'heads' && { color: ACCENT }]}>HEADS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.choiceBtn, choice === 'tails' && { borderColor: ACCENT, backgroundColor: ACCENT + '20' }]}
            onPress={() => setChoice('tails')}
            disabled={flipping}
          >
            <Text style={styles.choiceEmoji}>🌑</Text>
            <Text style={[styles.choiceText, choice === 'tails' && { color: ACCENT }]}>TAILS</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.multiplier}>1.96x payout</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.flipBtn, flipping && styles.btnDisabled]}
          onPress={handleFlip}
          disabled={flipping}
          activeOpacity={0.86}
        >
          <Text style={styles.flipText}>{flipping ? 'FLIPPING...' : 'FLIP'}</Text>
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
  coinArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  coin: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center' },
  coinEmoji: { fontSize: fs(80) },
  resultBox: {
    marginTop: 20, borderRadius: 18, borderWidth: 0, padding: 18, alignItems: 'center', minWidth: 160,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  resultWin: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  resultLose: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  resultTitle: { color: palette.text, fontFamily: fonts.display, fontSize: fs(28) },
  resultSide: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(13), marginTop: 2 },
  resultPayout: { fontFamily: fonts.display, fontSize: fs(22), marginTop: 4 },
  payoutWin: { color: palette.success },
  payoutLose: { color: palette.danger },
  controls: { paddingHorizontal: 16, paddingBottom: 32 },
  choiceRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  choiceBtn: {
    flex: 1, borderRadius: 18, borderWidth: 0,
    backgroundColor: palette.panelSoft, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1,
  },
  choiceEmoji: { fontSize: fs(28), marginBottom: 4 },
  choiceText: { color: palette.muted, fontFamily: fonts.display, fontSize: fs(14) },
  multiplier: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(11), textAlign: 'center', marginBottom: 8 },
  error: { color: palette.danger, fontFamily: fonts.mono, fontSize: fs(12), textAlign: 'center', marginBottom: 8 },
  flipBtn: {
    borderRadius: 24, backgroundColor: ACCENT, paddingVertical: 16, alignItems: 'center',
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  btnDisabled: { opacity: 0.5 },
  flipText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: fs(22) },
});
