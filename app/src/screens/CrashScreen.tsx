import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { getCrashState, placeCrashBet, crashCashout, CrashState } from '../services/gameApi';
import { hapticExplosion, hapticCashout } from '../utils/sounds';
import { fonts, palette, gameColors, shadows } from '../theme/ui';

const ACCENT = gameColors.crash;
const POLL_INTERVAL = 150;
const GRAPH_WIDTH = Dimensions.get('window').width - 40;
const GRAPH_HEIGHT = 200;
const MAX_POINTS = 60;

export default function CrashScreen({ onBack }: { onBack: () => void }) {
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState('5');
  const [state, setState] = useState<CrashState | null>(null);
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [cashingOut, setCashingOut] = useState(false);
  const [graphPoints, setGraphPoints] = useState<number[]>([]);
  const [prevRoundId, setPrevRoundId] = useState('');

  const multiplierScale = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const betBtnScale = useRef(new Animated.Value(1)).current;
  const cashoutBtnScale = useRef(new Animated.Value(1)).current;

  const loadBalance = useCallback(async () => {
    try { setBalance(await getCreditsBalance()); } catch {}
  }, []);

  useEffect(() => { loadBalance(); }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        const s = await getCrashState();
        setState(s);
        if (s.roundId !== prevRoundId) { setPrevRoundId(s.roundId); setGraphPoints([]); }
        if (s.state === 'flying') {
          setGraphPoints(prev => {
            const next = [...prev, s.currentMultiplier];
            return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
          });
        }
        if (s.state === 'crashed' && s.myBet && !s.myBet.cashedOutAt) hapticExplosion();
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [prevRoundId]);

  useEffect(() => {
    if (state?.state === 'flying') {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]));
      loop.start();
      const pulse = Animated.loop(Animated.sequence([
        Animated.timing(multiplierScale, { toValue: 1.05, duration: 300, useNativeDriver: true }),
        Animated.timing(multiplierScale, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]));
      pulse.start();
      return () => { loop.stop(); pulse.stop(); };
    }
  }, [state?.state]);

  const handleBet = async () => {
    const amount = parseInt(betAmount);
    if (!amount || amount < 1) { setError('Enter a valid bet'); return; }
    if (amount > balance) { setError('Insufficient credits'); return; }
    setError(''); setPlacing(true);
    try { await placeCrashBet(amount); setBalance(b => b - amount); }
    catch (e: any) { setError(e.message); }
    finally { setPlacing(false); }
  };

  const handleCashout = async () => {
    setError(''); setCashingOut(true);
    try { const res = await crashCashout(); setBalance(res.balance); hapticCashout(); }
    catch (e: any) { setError(e.message); }
    finally { setCashingOut(false); }
  };

  const isBetting = state?.state === 'betting';
  const isFlying = state?.state === 'flying';
  const isCrashed = state?.state === 'crashed';
  const hasBet = !!state?.myBet;
  const cashedOut = !!state?.myBet?.cashedOutAt;
  const canBet = isBetting && !hasBet;
  const canCashout = isFlying && hasBet && !cashedOut;
  const multiplierColor = isCrashed ? palette.danger : (isFlying ? palette.success : palette.text);

  const renderGraph = () => {
    if (graphPoints.length < 2) {
      return (
        <LinearGradient
          colors={[palette.panelSoft, palette.panelSoft + '80']}
          style={styles.graphPlaceholder}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        >
          <Text style={styles.graphWaiting}>
            {isBetting ? 'Waiting for launch...' : isCrashed ? '' : ''}
          </Text>
        </LinearGradient>
      );
    }

    const maxMult = Math.max(...graphPoints, 2);
    const minMult = 1;
    const range = maxMult - minMult || 1;

    return (
      <View style={styles.graphContainer}>
        <View style={styles.yAxis}>
          <Text style={styles.axisLabel}>{maxMult.toFixed(1)}x</Text>
          <Text style={styles.axisLabel}>{((maxMult + minMult) / 2).toFixed(1)}x</Text>
          <Text style={styles.axisLabel}>1.0x</Text>
        </View>
        <LinearGradient
          colors={[ACCENT + '08', palette.panelSoft]}
          style={styles.graphBody}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        >
          <View style={[styles.gridLine, { top: 0 }]} />
          <View style={[styles.gridLine, { top: '50%' }]} />
          <View style={[styles.gridLine, { bottom: 0 }]} />
          <View style={styles.barsRow}>
            {graphPoints.map((val, i) => {
              const height = ((val - minMult) / range) * GRAPH_HEIGHT;
              const isLast = i === graphPoints.length - 1;
              const barColor = isCrashed && isLast ? palette.danger : cashedOut ? palette.success : ACCENT;
              return (
                <View
                  key={i}
                  style={[styles.bar, {
                    height: Math.max(2, height), backgroundColor: barColor,
                    opacity: isLast ? 1 : 0.4 + (i / graphPoints.length) * 0.6,
                  }]}
                />
              );
            })}
          </View>
          {cashedOut && state?.myBet?.cashedOutAt && (
            <View style={[styles.cashoutMarker, { bottom: ((state.myBet.cashedOutAt - minMult) / range) * GRAPH_HEIGHT }]}>
              <Text style={styles.cashoutMarkerText}>{state.myBet.cashedOutAt.toFixed(2)}x</Text>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(185,131,255, 0)', 'rgba(185,131,255, 0.08)'],
  });

  return (
    <View style={styles.screen}>
      <AmbientBackground tone={isCrashed ? 'danger' : isFlying ? 'warm' : 'cool'} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← GAMES</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: ACCENT }]}>CRASH</Text>
        <Text style={styles.balText}>{balance} ¢</Text>
      </View>

      <Animated.View style={[styles.graphArea, { backgroundColor: glowColor }]}>
        <LinearGradient
          colors={[
            isBetting ? 'rgba(255,184,0,0.08)' : isFlying ? 'rgba(59,130,246,0.08)' : isCrashed ? 'rgba(255,71,87,0.08)' : 'transparent',
            'transparent',
          ]}
          style={styles.statusBadge}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.statusText, {
            color: isBetting ? palette.warning : isFlying ? palette.success : palette.danger
          }]}>
            {isBetting ? 'PLACE BETS' : isFlying ? 'FLYING' : isCrashed ? 'CRASHED' : 'WAITING'}
          </Text>
        </LinearGradient>

        <Animated.Text style={[
          styles.multiplier,
          {
            color: multiplierColor,
            transform: [{ scale: isFlying ? multiplierScale : 1 }],
            textShadowColor: isFlying ? 'rgba(59,130,246,0.3)' : isCrashed ? 'rgba(255,71,87,0.3)' : 'transparent',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 20,
          }
        ]}>
          {(state?.currentMultiplier || 1.00).toFixed(2)}x
        </Animated.Text>

        {isCrashed && state?.crashPoint && (
          <Text style={styles.crashedAt}>Crashed at {state.crashPoint.toFixed(2)}x</Text>
        )}

        {renderGraph()}

        {hasBet && (
          <LinearGradient
            colors={[palette.panelSoft, palette.panelSoft + '80']}
            style={styles.myBetBox}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.myBetLabel}>YOUR BET: {state!.myBet!.amount} ¢</Text>
            {cashedOut && (
              <Text style={styles.cashedOutText}>
                Won {state!.myBet!.payout} ¢ at {state!.myBet!.cashedOutAt!.toFixed(2)}x
              </Text>
            )}
            {isCrashed && !cashedOut && <Text style={styles.lostText}>Lost!</Text>}
          </LinearGradient>
        )}
      </Animated.View>

      <View style={styles.controls}>
        {(canBet || (!hasBet && !isFlying)) && (
          <BetInput amount={betAmount} onChangeAmount={setBetAmount} balance={balance} disabled={placing || !canBet} accentColor={ACCENT} />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {canBet && (
          <Pressable
            onPress={handleBet}
            disabled={placing}
            onPressIn={() => Animated.spring(betBtnScale, { toValue: 0.96, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
            onPressOut={() => Animated.spring(betBtnScale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
          >
            <Animated.View style={{ transform: [{ scale: betBtnScale }] }}>
              <LinearGradient
                colors={[ACCENT, ACCENT + 'CC']}
                style={[styles.betBtn, placing && styles.btnDisabled, shadows.glow(ACCENT)]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Text style={styles.betText}>{placing ? 'PLACING...' : 'PLACE BET'}</Text>
              </LinearGradient>
            </Animated.View>
          </Pressable>
        )}

        {canCashout && (
          <Pressable
            onPress={handleCashout}
            disabled={cashingOut}
            onPressIn={() => Animated.spring(cashoutBtnScale, { toValue: 0.96, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
            onPressOut={() => Animated.spring(cashoutBtnScale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
          >
            <Animated.View style={{ transform: [{ scale: cashoutBtnScale }] }}>
              <LinearGradient
                colors={[palette.success, palette.success + 'CC']}
                style={[styles.cashoutBtn, cashingOut && styles.btnDisabled, shadows.glow(palette.success)]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Text style={styles.cashoutText}>
                  CASHOUT {Math.floor((state!.myBet!.amount) * (state!.currentMultiplier || 1))} ¢
                </Text>
              </LinearGradient>
            </Animated.View>
          </Pressable>
        )}

        {isBetting && hasBet && (
          <LinearGradient
            colors={['rgba(255,184,0,0.10)', 'rgba(255,184,0,0.03)']}
            style={styles.waitingBox}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.waitingText}>Bet placed! Waiting for launch...</Text>
          </LinearGradient>
        )}
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
  graphArea: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20,
    borderRadius: 12, marginHorizontal: 8,
  },
  statusBadge: {
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 8,
  },
  statusText: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1 },
  multiplier: { fontFamily: fonts.display, fontSize: 64, lineHeight: 68 },
  crashedAt: { color: palette.danger, fontFamily: fonts.mono, fontSize: 14, marginTop: 2 },
  graphContainer: { flexDirection: 'row', width: GRAPH_WIDTH, height: GRAPH_HEIGHT, marginTop: 12 },
  graphPlaceholder: {
    width: GRAPH_WIDTH, height: GRAPH_HEIGHT, marginTop: 12,
    justifyContent: 'center', alignItems: 'center', borderRadius: 16,
  },
  graphWaiting: { color: palette.muted, fontFamily: fonts.body, fontSize: 16 },
  yAxis: { width: 40, justifyContent: 'space-between', paddingRight: 4 },
  axisLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: 9, textAlign: 'right' },
  graphBody: {
    flex: 1, height: GRAPH_HEIGHT, borderRadius: 12, overflow: 'hidden', position: 'relative',
  },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: palette.panelStroke },
  barsRow: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'flex-end', gap: 1, paddingHorizontal: 2,
  },
  bar: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2, minWidth: 2 },
  cashoutMarker: {
    position: 'absolute', right: 8,
    backgroundColor: palette.success + '30', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  cashoutMarkerText: { color: palette.success, fontFamily: fonts.mono, fontSize: 9 },
  myBetBox: {
    marginTop: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center',
  },
  myBetLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: 11 },
  cashedOutText: { color: palette.success, fontFamily: fonts.mono, fontSize: 11, marginTop: 2 },
  lostText: { color: palette.danger, fontFamily: fonts.mono, fontSize: 12, marginTop: 2 },
  controls: { paddingHorizontal: 16, paddingBottom: 32 },
  error: { color: palette.danger, fontFamily: fonts.mono, fontSize: 12, textAlign: 'center', marginBottom: 8 },
  betBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  betText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 22 },
  cashoutBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  cashoutText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 22 },
  waitingBox: { borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  waitingText: { color: palette.warning, fontFamily: fonts.body, fontSize: 14 },
});
