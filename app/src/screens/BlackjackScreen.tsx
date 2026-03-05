import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { fonts, palette, gameColors, shadows } from '../theme/ui';

const ACCENT = gameColors.blackjack;
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

type Card = { rank: string; suit: string };

function newDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s });
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(cards: Card[]): number {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') { total += 11; aces++; }
    else if (['K', 'Q', 'J'].includes(c.rank)) total += 10;
    else total += parseInt(c.rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function isRed(suit: string) { return suit === '♥' || suit === '♦'; }

function CardView({ card, hidden }: { card: Card; hidden?: boolean }) {
  if (hidden) return (
    <View style={[cs.card, { backgroundColor: palette.primary }]}>
      <Text style={cs.hiddenText}>?</Text>
    </View>
  );
  return (
    <View style={[cs.card, { backgroundColor: '#F8FAFC' }]}>
      <Text style={[cs.rank, { color: isRed(card.suit) ? '#EF4444' : '#1E293B' }]}>{card.rank}</Text>
      <Text style={[cs.suit, { color: isRed(card.suit) ? '#EF4444' : '#1E293B' }]}>{card.suit}</Text>
    </View>
  );
}

const cs = StyleSheet.create({
  card: { width: 56, height: 80, borderRadius: 10, alignItems: 'center', justifyContent: 'center', ...shadows.subtle, marginRight: -12 },
  rank: { fontFamily: fonts.display, fontSize: 20 },
  suit: { fontSize: 16, marginTop: -2 },
  hiddenText: { color: '#FFF', fontFamily: fonts.display, fontSize: 28 },
});

type GamePhase = 'betting' | 'playing' | 'dealer' | 'done';

export default function BlackjackScreen({ onBack }: { onBack: () => void }) {
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState('10');
  const [phase, setPhase] = useState<GamePhase>('betting');
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [message, setMessage] = useState('');
  const [payout, setPayout] = useState(0);

  const resultScale = useRef(new Animated.Value(0)).current;

  const loadBalance = useCallback(async () => {
    try { setBalance(await getCreditsBalance()); } catch {}
  }, []);
  useEffect(() => { loadBalance(); }, []);

  const deal = () => {
    const bet = parseInt(betAmount);
    if (!bet || bet < 1 || bet > balance) return;
    setBalance(b => b - bet);
    setMessage('');
    setPayout(0);
    resultScale.setValue(0);

    const d = newDeck();
    const ph = [d.pop()!, d.pop()!];
    const dh = [d.pop()!, d.pop()!];
    setDeck(d);
    setPlayerHand(ph);
    setDealerHand(dh);

    if (cardValue(ph) === 21) {
      // Blackjack!
      const p = Math.floor(bet * 2.5);
      finishGame('Blackjack!', p, d, ph, dh);
    } else {
      setPhase('playing');
    }
  };

  const hit = () => {
    const card = deck.pop()!;
    const nh = [...playerHand, card];
    setPlayerHand(nh);
    setDeck([...deck]);

    if (cardValue(nh) > 21) {
      finishGame('Bust!', 0, deck, nh, dealerHand);
    } else if (cardValue(nh) === 21) {
      stand(nh);
    }
  };

  const stand = (ph?: Card[]) => {
    const hand = ph || playerHand;
    setPhase('dealer');
    let dh = [...dealerHand];
    const d = [...deck];

    // Dealer draws to 17
    while (cardValue(dh) < 17) {
      dh.push(d.pop()!);
    }
    setDealerHand(dh);
    setDeck(d);

    const pv = cardValue(hand);
    const dv = cardValue(dh);
    const bet = parseInt(betAmount);

    if (dv > 21) finishGame('Dealer Busts!', bet * 2, d, hand, dh);
    else if (pv > dv) finishGame('You Win!', bet * 2, d, hand, dh);
    else if (pv === dv) finishGame('Push', bet, d, hand, dh);
    else finishGame('Dealer Wins', 0, d, hand, dh);
  };

  const finishGame = (msg: string, p: number, d: Card[], ph: Card[], dh: Card[]) => {
    setMessage(msg);
    setPayout(p);
    if (p > 0) setBalance(b => b + p);
    setPhase('done');
    Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 8 }).start();
  };

  const doubleDown = () => {
    const bet = parseInt(betAmount);
    if (bet > balance) return;
    setBalance(b => b - bet);
    setBetAmount((bet * 2).toString());
    const card = deck.pop()!;
    const nh = [...playerHand, card];
    setPlayerHand(nh);
    setDeck([...deck]);
    if (cardValue(nh) > 21) finishGame('Bust!', 0, deck, nh, dealerHand);
    else stand(nh);
  };

  const playerTotal = cardValue(playerHand);
  const dealerTotal = cardValue(dealerHand);

  return (
    <View style={s.screen}>
      <AmbientBackground tone="cool" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Blackjack</Text>
        <View style={s.balPill}>
          <Text style={s.balText}>{balance.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Dealer hand */}
        <View style={s.handSection}>
          <Text style={s.handLabel}>Dealer {phase !== 'betting' ? `(${phase === 'playing' ? '?' : dealerTotal})` : ''}</Text>
          <View style={s.handCards}>
            {dealerHand.map((c, i) => (
              <CardView key={i} card={c} hidden={phase === 'playing' && i === 1} />
            ))}
          </View>
        </View>

        {/* Divider */}
        <View style={s.vs}><Text style={s.vsText}>VS</Text></View>

        {/* Player hand */}
        <View style={s.handSection}>
          <Text style={s.handLabel}>You {playerHand.length > 0 ? `(${playerTotal})` : ''}</Text>
          <View style={s.handCards}>
            {playerHand.map((c, i) => <CardView key={i} card={c} />)}
          </View>
        </View>

        {/* Result */}
        {phase === 'done' && (
          <Animated.View style={[s.resultCard, { transform: [{ scale: resultScale }] }]}>
            <Text style={[s.resultMsg, { color: payout > 0 ? palette.success : palette.danger }]}>{message}</Text>
            {payout > 0 && <Text style={s.resultPayout}>+{payout}</Text>}
          </Animated.View>
        )}

        {/* Controls */}
        <View style={s.controls}>
          {phase === 'betting' && (
            <>
              <BetInput value={betAmount} onChange={setBetAmount} balance={balance} accent={ACCENT} />
              <Pressable onPress={deal}>
                <LinearGradient colors={['#10B981', '#059669']} style={s.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={s.actionText}>Deal</Text>
                </LinearGradient>
              </Pressable>
            </>
          )}
          {phase === 'playing' && (
            <View style={s.playBtns}>
              <Pressable onPress={hit} style={s.playBtnWrap}>
                <LinearGradient colors={['#3B82F6', '#2563EB']} style={s.playBtnInner}>
                  <Text style={s.playBtnLabel}>Hit</Text>
                </LinearGradient>
              </Pressable>
              <Pressable onPress={() => stand()} style={s.playBtnWrap}>
                <LinearGradient colors={['#F97316', '#EA580C']} style={s.playBtnInner}>
                  <Text style={s.playBtnLabel}>Stand</Text>
                </LinearGradient>
              </Pressable>
              {playerHand.length === 2 && (
                <Pressable onPress={doubleDown} style={s.playBtnWrap}>
                  <LinearGradient colors={['#A855F7', '#9333EA']} style={s.playBtnInner}>
                    <Text style={s.playBtnLabel}>2x</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          )}
          {phase === 'done' && (
            <Pressable onPress={() => { setPhase('betting'); setPlayerHand([]); setDealerHand([]); }}>
              <LinearGradient colors={['#10B981', '#059669']} style={s.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={s.actionText}>New Hand</Text>
              </LinearGradient>
            </Pressable>
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
  handSection: { paddingHorizontal: 20, marginTop: 20 },
  handLabel: { color: palette.muted, fontFamily: fonts.display, fontSize: 14, marginBottom: 12 },
  handCards: { flexDirection: 'row', paddingLeft: 12 },
  vs: { alignSelf: 'center', marginVertical: 16, backgroundColor: palette.panel, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  vsText: { color: palette.muted, fontFamily: fonts.display, fontSize: 14 },
  resultCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: palette.panel, borderRadius: 16, padding: 16, alignItems: 'center', ...shadows.medium },
  resultMsg: { fontFamily: fonts.display, fontSize: 24 },
  resultPayout: { color: palette.success, fontFamily: fonts.mono, fontSize: 16, marginTop: 4 },
  controls: { paddingHorizontal: 20, marginTop: 20, gap: 12 },
  actionBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', ...shadows.glow(ACCENT) },
  actionText: { color: '#FFF', fontFamily: fonts.display, fontSize: 16 },
  playBtns: { flexDirection: 'row', gap: 10 },
  playBtnWrap: { flex: 1 },
  playBtnInner: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  playBtnLabel: { color: '#FFF', fontFamily: fonts.display, fontSize: 15 },
});
