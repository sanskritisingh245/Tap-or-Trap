import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Pressable, Dimensions, Image, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from '../components/AmbientBackground';

const BANNER_HEIGHT = 200;
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { placeBet, settleBet } from '../services/gameApi';
import { fonts, palette, gameColors, gradients, shadows } from '../theme/ui';

const ACCENT = gameColors.plinko;
const { width: SW } = Dimensions.get('window');
const ROWS = 12;
const PEGS_PER_ROW = (row: number) => row + 3;
const BALL_SIZE = 14;
const PEG_SIZE = 8;
const BOARD_W = SW - 48;

const MULTIPLIERS_LOW = [5, 2, 1.2, 1, 0.8, 0.4, 0.8, 1, 1.2, 2, 5];
const MULTIPLIERS_MED = [8, 3, 1.5, 1.1, 0.8, 0.4, 0.2, 0.4, 0.8, 1.1, 1.5, 3, 8];
const MULTIPLIERS_HIGH = [25, 12, 5, 3, 1.5, 1, 0.5, 0.3, 0.2, 0.3, 0.5, 1, 1.5, 3, 5, 12, 25];

type Risk = 'Low' | 'Medium' | 'High';

function getMultipliers(risk: Risk) {
  if (risk === 'Low') return MULTIPLIERS_LOW;
  if (risk === 'Medium') return MULTIPLIERS_MED;
  return MULTIPLIERS_HIGH;
}

function getBucketColor(mult: number) {
  if (mult >= 10) return '#FF4757';
  if (mult >= 3) return '#F97316';
  if (mult >= 1.5) return '#FACC15';
  return '#22C55E';
}

export default function PlinkoScreen({ onBack }: { onBack: () => void }) {
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState('5');
  const [risk, setRisk] = useState<Risk>('Medium');
  const [dropping, setDropping] = useState(false);
  const [lastResult, setLastResult] = useState<{ mult: number; payout: number } | null>(null);
  const [ballPath, setBallPath] = useState<number[]>([]);
  const [animStep, setAnimStep] = useState(-1);

  const ballX = useRef(new Animated.Value(BOARD_W / 2)).current;
  const ballY = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;

  const loadBalance = useCallback(async () => {
    try { setBalance(await getCreditsBalance()); } catch {}
  }, []);
  useEffect(() => { loadBalance(); }, []);

  const dropBall = async () => {
    const bet = parseInt(betAmount);
    if (!bet || bet < 1 || dropping) return;
    if (bet > balance) {
      Alert.alert('Insufficient credits', `You need ${bet} credits but only have ${balance}.`);
      return;
    }

    setDropping(true);
    setLastResult(null);
    setAnimStep(-1);

    try {
      const betRes = await placeBet(bet, 'plinko');
      setBalance(betRes.balance);
    } catch { setDropping(false); return; }

    const path: number[] = [];
    let pos = 0;
    for (let i = 0; i < ROWS; i++) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      pos += dir;
      path.push(pos);
    }
    setBallPath(path);

    const mults = getMultipliers(risk);
    const normalizedPos = pos + ROWS;
    const bucketIdx = Math.min(Math.max(Math.round((normalizedPos / (ROWS * 2)) * (mults.length - 1)), 0), mults.length - 1);
    const mult = mults[bucketIdx];
    const payout = Math.floor(bet * mult);

    ballX.setValue(BOARD_W / 2);
    ballY.setValue(0);

    const rowH = (BOARD_W * 0.7) / ROWS;
    const anims = path.map((p, i) => {
      const targetX = BOARD_W / 2 + p * (BOARD_W / (ROWS * 2.5));
      return Animated.parallel([
        Animated.timing(ballX, { toValue: targetX, duration: 80, useNativeDriver: true }),
        Animated.timing(ballY, { toValue: (i + 1) * rowH, duration: 80, useNativeDriver: true }),
      ]);
    });

    Animated.sequence(anims).start();

    // Wait for animation to finish (ROWS * 80ms per step + buffer)
    const totalAnimTime = ROWS * 80 + 200;
    await new Promise<void>(resolve => setTimeout(resolve, totalAnimTime));

    const won = mult >= 1;
    try {
      const res = await settleBet(payout, 'plinko', won);
      setBalance(res.balance);
    } catch {}

    setLastResult({ mult, payout });
    setDropping(false);
    resultScale.setValue(0);
    Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 10 }).start();
  };

  const mults = getMultipliers(risk);

  return (
    <View style={s.screen}>
      <AmbientBackground tone="warm" />
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Plinko</Text>
        <View style={s.balPill}>
          <Text style={s.balText}>{balance.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={s.bannerWrap}>
          <Image source={require('../../assets/plinko.jpeg')} style={s.bannerImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(15,33,46,0.6)', palette.bg]}
            style={s.bannerOverlay}
            start={{ x: 0.5, y: 0.2 }}
            end={{ x: 0.5, y: 1 }}
          />
        </View>

        {/* Board */}
        <View style={s.boardWrap}>
          <View style={[s.board, { width: BOARD_W, height: BOARD_W * 0.75 }]}>
            {/* Pegs */}
            {Array.from({ length: ROWS }).map((_, row) => (
              <View key={row} style={[s.pegRow, { top: ((row + 1) / (ROWS + 1)) * 100 + '%' }]}>
                {Array.from({ length: PEGS_PER_ROW(row) }).map((_, col) => (
                  <View key={col} style={[s.peg, { backgroundColor: ACCENT + '40' }]} />
                ))}
              </View>
            ))}
            {/* Ball */}
            {dropping && (
              <Animated.View style={[s.ball, { transform: [{ translateX: Animated.subtract(ballX, BALL_SIZE / 2) }, { translateY: ballY }] }]} />
            )}
          </View>
          {/* Buckets */}
          <View style={s.buckets}>
            {mults.map((m, i) => (
              <View key={i} style={[s.bucket, { backgroundColor: getBucketColor(m) + '25' }]}>
                <Text style={[s.bucketText, { color: getBucketColor(m) }]}>{m}x</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Result */}
        {lastResult && (
          <Animated.View style={[s.resultBadge, { transform: [{ scale: resultScale }] }]}>
            <Text style={s.resultMult}>{lastResult.mult}x</Text>
            <Text style={[s.resultPayout, lastResult.payout === 0 && { color: palette.danger }]}>
              {lastResult.payout > 0 ? `+${lastResult.payout}` : 'No win'}
            </Text>
          </Animated.View>
        )}

        {/* Controls */}
        <View style={s.controls}>
          <View style={s.riskRow}>
            {(['Low', 'Medium', 'High'] as Risk[]).map(r => (
              <Pressable key={r} onPress={() => !dropping && setRisk(r)} style={[s.riskBtn, risk === r && s.riskActive]}>
                <Text style={[s.riskLabel, risk === r && { color: ACCENT }]}>{r}</Text>
              </Pressable>
            ))}
          </View>
          <BetInput amount={betAmount} onChangeAmount={setBetAmount} balance={balance} accentColor={ACCENT} />
          <Pressable onPress={dropBall} disabled={dropping}>
            <LinearGradient colors={['#F97316', '#EA580C']} style={s.dropBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={s.dropText}>{dropping ? 'Dropping...' : 'Drop Ball'}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.panel, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: palette.text, fontSize: 24, marginTop: -2 },
  title: { color: palette.text, fontFamily: fonts.display, fontSize: 20 },
  balPill: { backgroundColor: palette.panel, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 },
  balText: { color: ACCENT, fontFamily: fonts.mono, fontSize: 14 },
  bannerWrap: { width: SW, height: BANNER_HEIGHT, overflow: 'hidden', marginBottom: -20 },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject },
  boardWrap: { alignItems: 'center', marginTop: 8 },
  board: { position: 'relative', overflow: 'hidden' },
  pegRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' },
  peg: { width: PEG_SIZE, height: PEG_SIZE, borderRadius: PEG_SIZE / 2 },
  ball: { position: 'absolute', width: BALL_SIZE, height: BALL_SIZE, borderRadius: BALL_SIZE / 2, backgroundColor: ACCENT, ...shadows.glow(ACCENT) },
  buckets: { flexDirection: 'row', justifyContent: 'center', gap: 2, marginTop: 4, paddingHorizontal: 8 },
  bucket: { paddingHorizontal: 4, paddingVertical: 6, borderRadius: 4, minWidth: 22, alignItems: 'center' },
  bucketText: { fontFamily: fonts.mono, fontSize: 7 },
  resultBadge: { alignSelf: 'center', backgroundColor: palette.panel, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8, alignItems: 'center', ...shadows.medium },
  resultMult: { color: ACCENT, fontFamily: fonts.display, fontSize: 28 },
  resultPayout: { color: palette.success, fontFamily: fonts.mono, fontSize: 14, marginTop: 2 },
  controls: { paddingHorizontal: 20, marginTop: 12, gap: 12 },
  riskRow: { flexDirection: 'row', gap: 8 },
  riskBtn: { flex: 1, backgroundColor: palette.panel, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  riskActive: { borderWidth: 1, borderColor: ACCENT + '40' },
  riskLabel: { color: palette.muted, fontFamily: fonts.display, fontSize: 13 },
  dropBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', ...shadows.glow('#F97316') },
  dropText: { color: '#FFF', fontFamily: fonts.display, fontSize: 16 },
});
