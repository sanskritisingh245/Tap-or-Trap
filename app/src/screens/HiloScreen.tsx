import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { fonts, palette, gameColors, shadows } from '../theme/ui';

const ACCENT = gameColors.hilo;
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♥', '♦', '♣'];

type Card = { rank: string; suit: string; value: number };

function randomCard(): Card {
  const r = Math.floor(Math.random() * 13);
  const s = SUITS[Math.floor(Math.random() * 4)];
  return { rank: RANKS[r], suit: s, value: r + 1 };
}

function isRed(suit: string) { return suit === '♥' || suit === '♦'; }

export default function HiloScreen({ onBack }: { onBack: () => void }) {
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState('5');
  const [playing, setPlaying] = useState(false);
  const [currentCard, setCurrentCard] = useState<Card>(randomCard());
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [bet, setBet] = useState(0);
  const [result, setResult] = useState<{ won: boolean; payout: number } | null>(null);
  const [cardHistory, setCardHistory] = useState<Card[]>([]);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;

  const loadBalance = useCallback(async () => {
    try { setBalance(await getCreditsBalance()); } catch {}
  }, []);
  useEffect(() => { loadBalance(); }, []);

  const startGame = () => {
    const b = parseInt(betAmount);
    if (!b || b < 1 || b > balance) return;
    setBalance(bal => bal - b);
    setBet(b);
    setPlaying(true);
    setStreak(0);
    setMultiplier(1);
    setResult(null);
    setCardHistory([]);
    setCurrentCard(randomCard());
    resultScale.setValue(0);
  };

  const guess = (higher: boolean) => {
    const nextCard = randomCard();
    const correct = higher ? nextCard.value >= currentCard.value : nextCard.value <= currentCard.value;

    // Calculate odds-based multiplier
    const cardsHigher = 13 - currentCard.value + 1;
    const cardsLower = currentCard.value;
    const chance = higher ? cardsHigher / 13 : cardsLower / 13;
    const stepMult = Math.max(1.1, 0.99 / chance);

    flipAnim.setValue(0);
    Animated.timing(flipAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    setCardHistory(h => [...h, currentCard]);

    if (correct) {
      const newMult = Math.round(multiplier * stepMult * 100) / 100;
      setMultiplier(newMult);
      setStreak(s => s + 1);
      setCurrentCard(nextCard);
    } else {
      setCurrentCard(nextCard);
      setResult({ won: false, payout: 0 });
      setPlaying(false);
      Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 8 }).start();
    }
  };

  const cashout = () => {
    const payout = Math.floor(bet * multiplier);
    setBalance(b => b + payout);
    setResult({ won: true, payout });
    setPlaying(false);
    Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 8 }).start();
  };

  const flipRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '0deg'],
  });

  return (
    <View style={s.screen}>
      <AmbientBackground tone="cool" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>HiLo</Text>
        <View style={s.balPill}>
          <Text style={s.balText}>{balance.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Card history */}
        {cardHistory.length > 0 && (
          <View style={s.historyRow}>
            {cardHistory.slice(-6).map((c, i) => (
              <View key={i} style={s.miniCard}>
                <Text style={[s.miniRank, { color: isRed(c.suit) ? '#EF4444' : '#9CA3AF' }]}>{c.rank}{c.suit}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Current card */}
        <View style={s.cardArea}>
          <Animated.View style={[s.bigCard, { transform: [{ rotateY: flipRotate }] }]}>
            <Text style={[s.bigRank, { color: isRed(currentCard.suit) ? '#EF4444' : '#FFF' }]}>{currentCard.rank}</Text>
            <Text style={[s.bigSuit, { color: isRed(currentCard.suit) ? '#EF4444' : '#FFF' }]}>{currentCard.suit}</Text>
          </Animated.View>
        </View>

        {/* Streak & multiplier */}
        {playing && (
          <View style={s.statsRow}>
            <View style={s.statPill}>
              <Text style={s.statLabel}>Streak</Text>
              <Text style={[s.statVal, { color: ACCENT }]}>{streak}</Text>
            </View>
            <View style={s.statPill}>
              <Text style={s.statLabel}>Multiplier</Text>
              <Text style={[s.statVal, { color: palette.success }]}>{multiplier.toFixed(2)}x</Text>
            </View>
            <View style={s.statPill}>
              <Text style={s.statLabel}>Payout</Text>
              <Text style={[s.statVal, { color: palette.warning }]}>{Math.floor(bet * multiplier)}</Text>
            </View>
          </View>
        )}

        {/* Result */}
        {result && (
          <Animated.View style={[s.resultCard, { transform: [{ scale: resultScale }] }]}>
            <Text style={[s.resultMsg, { color: result.won ? palette.success : palette.danger }]}>
              {result.won ? `Cashed Out!` : `Wrong! Streak: ${streak}`}
            </Text>
            {result.won && <Text style={s.resultPayout}>+{result.payout}</Text>}
          </Animated.View>
        )}

        {/* Controls */}
        <View style={s.controls}>
          {!playing ? (
            <>
              <BetInput value={betAmount} onChange={setBetAmount} balance={balance} accent={ACCENT} />
              <Pressable onPress={startGame}>
                <LinearGradient colors={['#6366F1', '#4F46E5']} style={s.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={s.actionText}>Start Game</Text>
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            <>
              <View style={s.guessBtns}>
                <Pressable onPress={() => guess(true)} style={s.guessBtnWrap}>
                  <LinearGradient colors={['#22C55E', '#16A34A']} style={s.guessBtn}>
                    <Text style={s.guessIcon}>▲</Text>
                    <Text style={s.guessLabel}>Higher</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable onPress={() => guess(false)} style={s.guessBtnWrap}>
                  <LinearGradient colors={['#EF4444', '#DC2626']} style={s.guessBtn}>
                    <Text style={s.guessIcon}>▼</Text>
                    <Text style={s.guessLabel}>Lower</Text>
                  </LinearGradient>
                </Pressable>
              </View>
              {streak > 0 && (
                <Pressable onPress={cashout}>
                  <LinearGradient colors={['#FACC15', '#EAB308']} style={s.cashoutBtn}>
                    <Text style={s.cashoutText}>Cash Out {Math.floor(bet * multiplier)}</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </>
          )}
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
  historyRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
  miniCard: { backgroundColor: palette.panel, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  miniRank: { fontFamily: fonts.mono, fontSize: 13 },
  cardArea: { alignItems: 'center', marginTop: 24 },
  bigCard: { width: 140, height: 200, borderRadius: 18, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', ...shadows.strong },
  bigRank: { fontFamily: fonts.display, fontSize: 56 },
  bigSuit: { fontSize: 40, marginTop: -8 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 20 },
  statPill: { flex: 1, backgroundColor: palette.panel, borderRadius: 12, padding: 12, alignItems: 'center' },
  statLabel: { color: palette.muted, fontFamily: fonts.light, fontSize: 11 },
  statVal: { fontFamily: fonts.display, fontSize: 18, marginTop: 4 },
  resultCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: palette.panel, borderRadius: 16, padding: 16, alignItems: 'center', ...shadows.medium },
  resultMsg: { fontFamily: fonts.display, fontSize: 20 },
  resultPayout: { color: palette.success, fontFamily: fonts.mono, fontSize: 16, marginTop: 4 },
  controls: { paddingHorizontal: 20, marginTop: 20, gap: 12 },
  actionBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', ...shadows.glow(ACCENT) },
  actionText: { color: '#FFF', fontFamily: fonts.display, fontSize: 16 },
  guessBtns: { flexDirection: 'row', gap: 12 },
  guessBtnWrap: { flex: 1 },
  guessBtn: { borderRadius: 14, paddingVertical: 20, alignItems: 'center' },
  guessIcon: { color: '#FFF', fontSize: 22 },
  guessLabel: { color: '#FFF', fontFamily: fonts.display, fontSize: 14, marginTop: 4 },
  cashoutBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', ...shadows.glow('#FACC15') },
  cashoutText: { color: '#000', fontFamily: fonts.display, fontSize: 15 },
});
