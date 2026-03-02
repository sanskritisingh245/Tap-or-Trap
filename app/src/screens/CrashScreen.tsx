import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions,
} from 'react-native';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { getCrashState, placeCrashBet, crashCashout, CrashState } from '../services/gameApi';
import { hapticExplosion, hapticCashout } from '../utils/sounds';
import { fonts, palette, gameColors, fs } from '../theme/ui';

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

  const loadBalance = useCallback(async () => {
    try { setBalance(await getCreditsBalance()); } catch {}
  }, []);

  useEffect(() => { loadBalance(); }, []);

  // Poll crash state
  useEffect(() => {
    const poll = async () => {
      try {
        const s = await getCrashState();
        setState(s);

        // Reset graph on new round
        if (s.roundId !== prevRoundId) {
          setPrevRoundId(s.roundId);
          setGraphPoints([]);
        }

        // Add point to graph when flying
        if (s.state === 'flying') {
          setGraphPoints(prev => {
            const next = [...prev, s.currentMultiplier];
            return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
          });
        }

        if (s.state === 'crashed' && s.myBet && !s.myBet.cashedOutAt) {
          hapticExplosion();
        }
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [prevRoundId]);

  // Glow animation when flying
  useEffect(() => {
    if (state?.state === 'flying') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
        ])
      );
      loop.start();
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(multiplierScale, { toValue: 1.05, duration: 300, useNativeDriver: true }),
          Animated.timing(multiplierScale, { toValue: 1, duration: 300, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => { loop.stop(); pulse.stop(); };
    }
  }, [state?.state]);

  const handleBet = async () => {
    const amount = parseInt(betAmount);
    if (!amount || amount < 1) { setError('Enter a valid bet'); return; }
    if (amount > balance) { setError('Insufficient credits'); return; }
    setError('');
    setPlacing(true);
    try {
      await placeCrashBet(amount);
      setBalance(b => b - amount);
    } catch (e: any) { setError(e.message); }
    finally { setPlacing(false); }
  };

  const handleCashout = async () => {
    setError('');
    setCashingOut(true);
    try {
      const res = await crashCashout();
      setBalance(res.balance);
      hapticCashout();
    } catch (e: any) { setError(e.message); }
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

  // Render graph
  const renderGraph = () => {
    if (graphPoints.length < 2) {
      return (
        <View style={styles.graphPlaceholder}>
          <Text style={styles.graphWaiting}>
            {isBetting ? '⏳ Waiting for launch...' : isCrashed ? '💥' : '🚀'}
          </Text>
        </View>
      );
    }

    const maxMult = Math.max(...graphPoints, 2);
    const minMult = 1;
    const range = maxMult - minMult || 1;

    return (
      <View style={styles.graphContainer}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          <Text style={styles.axisLabel}>{maxMult.toFixed(1)}x</Text>
          <Text style={styles.axisLabel}>{((maxMult + minMult) / 2).toFixed(1)}x</Text>
          <Text style={styles.axisLabel}>1.0x</Text>
        </View>

        {/* Graph area */}
        <View style={styles.graphBody}>
          {/* Grid lines */}
          <View style={[styles.gridLine, { top: 0 }]} />
          <View style={[styles.gridLine, { top: '50%' }]} />
          <View style={[styles.gridLine, { bottom: 0 }]} />

          {/* Curve rendered as bars/segments */}
          <View style={styles.barsRow}>
            {graphPoints.map((val, i) => {
              const height = ((val - minMult) / range) * GRAPH_HEIGHT;
              const isLast = i === graphPoints.length - 1;
              const barColor = isCrashed && isLast
                ? palette.danger
                : cashedOut ? palette.success
                : ACCENT;

              return (
                <View
                  key={i}
                  style={[
                    styles.bar,
                    {
                      height: Math.max(2, height),
                      backgroundColor: barColor,
                      opacity: isLast ? 1 : 0.4 + (i / graphPoints.length) * 0.6,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Cashout marker */}
          {cashedOut && state?.myBet?.cashedOutAt && (
            <View style={[styles.cashoutMarker, {
              bottom: ((state.myBet.cashedOutAt - minMult) / range) * GRAPH_HEIGHT,
            }]}>
              <Text style={styles.cashoutMarkerText}>💰 {state.myBet.cashedOutAt.toFixed(2)}x</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(168, 85, 247, 0)', 'rgba(168, 85, 247, 0.1)'],
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

      {/* Graph + Multiplier */}
      <Animated.View style={[styles.graphArea, { backgroundColor: glowColor }]}>
        <View style={styles.statusBadge}>
          <Text style={[styles.statusText, {
            color: isBetting ? palette.warning : isFlying ? palette.success : palette.danger
          }]}>
            {isBetting ? '🎯 PLACE BETS' : isFlying ? '🚀 FLYING' : isCrashed ? '💥 CRASHED' : '⏳ WAITING'}
          </Text>
        </View>

        <Animated.Text style={[
          styles.multiplier,
          { color: multiplierColor, transform: [{ scale: isFlying ? multiplierScale : 1 }] }
        ]}>
          {(state?.currentMultiplier || 1.00).toFixed(2)}x
        </Animated.Text>

        {isCrashed && state?.crashPoint && (
          <Text style={styles.crashedAt}>Crashed at {state.crashPoint.toFixed(2)}x</Text>
        )}

        {/* Graph */}
        {renderGraph()}

        {/* My bet status */}
        {hasBet && (
          <View style={styles.myBetBox}>
            <Text style={styles.myBetLabel}>YOUR BET: {state!.myBet!.amount} ¢</Text>
            {cashedOut && (
              <Text style={styles.cashedOutText}>
                Won {state!.myBet!.payout} ¢ at {state!.myBet!.cashedOutAt!.toFixed(2)}x
              </Text>
            )}
            {isCrashed && !cashedOut && <Text style={styles.lostText}>Lost!</Text>}
          </View>
        )}
      </Animated.View>

      {/* Controls */}
      <View style={styles.controls}>
        {(canBet || (!hasBet && !isFlying)) && (
          <BetInput amount={betAmount} onChangeAmount={setBetAmount} balance={balance} disabled={placing || !canBet} accentColor={ACCENT} />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {canBet && (
          <TouchableOpacity style={[styles.betBtn, placing && styles.btnDisabled]} onPress={handleBet} disabled={placing} activeOpacity={0.86}>
            <Text style={styles.betText}>{placing ? 'PLACING...' : 'PLACE BET'}</Text>
          </TouchableOpacity>
        )}

        {canCashout && (
          <TouchableOpacity style={[styles.cashoutBtn, cashingOut && styles.btnDisabled]} onPress={handleCashout} disabled={cashingOut} activeOpacity={0.86}>
            <Text style={styles.cashoutText}>
              CASHOUT {Math.floor((state!.myBet!.amount) * (state!.currentMultiplier || 1))} ¢
            </Text>
          </TouchableOpacity>
        )}

        {isBetting && hasBet && (
          <View style={styles.waitingBox}>
            <Text style={styles.waitingText}>Bet placed! Waiting for launch... 🚀</Text>
          </View>
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
  back: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(13) },
  title: { fontFamily: fonts.display, fontSize: fs(20) },
  balText: { color: palette.primaryStrong, fontFamily: fonts.mono, fontSize: fs(13) },
  graphArea: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20,
    borderRadius: 20, marginHorizontal: 8,
  },
  statusBadge: {
    borderRadius: 20, borderWidth: 0,
    backgroundColor: palette.panelSoft, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 8,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 1,
  },
  statusText: { fontFamily: fonts.mono, fontSize: fs(12), letterSpacing: 1 },
  multiplier: { fontFamily: fonts.display, fontSize: fs(64), lineHeight: 68 },
  crashedAt: { color: palette.danger, fontFamily: fonts.mono, fontSize: fs(14), marginTop: 2 },

  // Graph
  graphContainer: {
    flexDirection: 'row', width: GRAPH_WIDTH, height: GRAPH_HEIGHT, marginTop: 12,
  },
  graphPlaceholder: {
    width: GRAPH_WIDTH, height: GRAPH_HEIGHT, marginTop: 12,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 16, borderWidth: 0, backgroundColor: palette.panelSoft,
  },
  graphWaiting: { color: palette.muted, fontFamily: fonts.body, fontSize: fs(16) },
  yAxis: { width: 40, justifyContent: 'space-between', paddingRight: 4 },
  axisLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(9), textAlign: 'right' },
  graphBody: {
    flex: 1, height: GRAPH_HEIGHT, borderRadius: 12,
    borderWidth: 0, backgroundColor: palette.panelSoft,
    overflow: 'hidden', position: 'relative',
  },
  gridLine: {
    position: 'absolute', left: 0, right: 0, height: 1,
    backgroundColor: palette.panelStroke,
  },
  barsRow: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'flex-end', gap: 1,
    paddingHorizontal: 2,
  },
  bar: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2, minWidth: 2 },
  cashoutMarker: {
    position: 'absolute', right: 8,
    backgroundColor: palette.success + '30', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  cashoutMarkerText: { color: palette.success, fontFamily: fonts.mono, fontSize: fs(9) },

  myBetBox: {
    marginTop: 10, borderRadius: 14, borderWidth: 0,
    backgroundColor: palette.panelSoft, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center',
  },
  myBetLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(11) },
  cashedOutText: { color: palette.success, fontFamily: fonts.mono, fontSize: fs(11), marginTop: 2 },
  lostText: { color: palette.danger, fontFamily: fonts.mono, fontSize: fs(12), marginTop: 2 },
  controls: { paddingHorizontal: 16, paddingBottom: 32 },
  error: { color: palette.danger, fontFamily: fonts.mono, fontSize: fs(12), textAlign: 'center', marginBottom: 8 },
  betBtn: { borderRadius: 24, backgroundColor: ACCENT, paddingVertical: 16, alignItems: 'center', shadowColor: ACCENT, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  btnDisabled: { opacity: 0.5 },
  betText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: fs(22) },
  cashoutBtn: { borderRadius: 24, backgroundColor: palette.success, paddingVertical: 16, alignItems: 'center', shadowColor: palette.success, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3 },
  cashoutText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: fs(22) },
  waitingBox: { borderRadius: 16, backgroundColor: palette.panelSoft, paddingVertical: 14, alignItems: 'center' },
  waitingText: { color: palette.warning, fontFamily: fonts.body, fontSize: fs(14) },
});
