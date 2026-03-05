import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { fonts, palette, gameColors, shadows } from '../theme/ui';

const ACCENT = gameColors.dragontower;
const COLS = 4;
const MAX_FLOORS = 9;

type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert';
const EGGS_PER_FLOOR: Record<Difficulty, number> = { Easy: 1, Medium: 2, Hard: 2, Expert: 3 };
const SAFE_PER_FLOOR: Record<Difficulty, number> = { Easy: 3, Medium: 2, Hard: 2, Expert: 1 };
const MULT_STEP: Record<Difficulty, number> = { Easy: 1.31, Medium: 1.96, Hard: 2.94, Expert: 3.88 };

type TileState = 'hidden' | 'safe' | 'egg';

export default function DragonTowerScreen({ onBack }: { onBack: () => void }) {
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState('5');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [playing, setPlaying] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(0);
  const [grid, setGrid] = useState<TileState[][]>([]);
  const [eggPositions, setEggPositions] = useState<number[][]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [bet, setBet] = useState(0);
  const [result, setResult] = useState<{ won: boolean; payout: number } | null>(null);

  const resultScale = useRef(new Animated.Value(0)).current;
  const dragonScale = useRef(new Animated.Value(1)).current;

  const loadBalance = useCallback(async () => {
    try { setBalance(await getCreditsBalance()); } catch {}
  }, []);
  useEffect(() => { loadBalance(); }, []);

  // Dragon breathing animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dragonScale, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(dragonScale, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const startGame = () => {
    const b = parseInt(betAmount);
    if (!b || b < 1 || b > balance) return;
    setBalance(bal => bal - b);
    setBet(b);
    setResult(null);
    resultScale.setValue(0);

    const eggs: number[][] = [];
    const g: TileState[][] = [];
    for (let f = 0; f < MAX_FLOORS; f++) {
      const floorEggs: number[] = [];
      while (floorEggs.length < EGGS_PER_FLOOR[difficulty]) {
        const pos = Math.floor(Math.random() * COLS);
        if (!floorEggs.includes(pos)) floorEggs.push(pos);
      }
      eggs.push(floorEggs);
      g.push(Array(COLS).fill('hidden'));
    }
    setEggPositions(eggs);
    setGrid(g);
    setCurrentFloor(0);
    setMultiplier(1);
    setPlaying(true);
  };

  const selectTile = (col: number) => {
    if (!playing || currentFloor >= MAX_FLOORS) return;

    const newGrid = grid.map(r => [...r]);
    const isEgg = eggPositions[currentFloor].includes(col);

    if (isEgg) {
      // Reveal all eggs
      eggPositions[currentFloor].forEach(e => { newGrid[currentFloor][e] = 'egg'; });
      setGrid(newGrid);
      setResult({ won: false, payout: 0 });
      setPlaying(false);
      Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 8 }).start();
    } else {
      newGrid[currentFloor][col] = 'safe';
      setGrid(newGrid);
      const newMult = Math.round(multiplier * MULT_STEP[difficulty] * 100) / 100;
      setMultiplier(newMult);
      setCurrentFloor(f => f + 1);

      if (currentFloor === MAX_FLOORS - 1) {
        const payout = Math.floor(bet * newMult);
        setBalance(b => b + payout);
        setResult({ won: true, payout });
        setPlaying(false);
        Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 8 }).start();
      }
    }
  };

  const cashout = () => {
    const payout = Math.floor(bet * multiplier);
    setBalance(b => b + payout);
    setResult({ won: true, payout });
    setPlaying(false);
    Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 8 }).start();
  };

  return (
    <View style={s.screen}>
      <AmbientBackground tone="cool" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Dragon Tower</Text>
        <View style={s.balPill}>
          <Text style={s.balText}>{balance.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Dragon */}
        <Animated.View style={[s.dragonArea, { transform: [{ scale: dragonScale }] }]}>
          <Text style={s.dragonEmoji}>🐉</Text>
          {playing && (
            <Text style={s.floorText}>Floor {currentFloor + 1}/{MAX_FLOORS}</Text>
          )}
        </Animated.View>

        {/* Multiplier */}
        {playing && (
          <View style={s.multRow}>
            <Text style={[s.multVal, { color: palette.success }]}>{multiplier.toFixed(2)}x</Text>
            <Text style={s.multPayout}>{Math.floor(bet * multiplier)} credits</Text>
          </View>
        )}

        {/* Tower - render top to bottom */}
        <View style={s.tower}>
          {[...grid].reverse().map((row, revIdx) => {
            const floorIdx = MAX_FLOORS - 1 - revIdx;
            const isActive = floorIdx === currentFloor;
            const isPast = floorIdx < currentFloor;
            const floorMult = Math.round(Math.pow(MULT_STEP[difficulty], floorIdx + 1) * 100) / 100;

            return (
              <View key={floorIdx} style={[s.floorRow, isActive && s.floorActive]}>
                <Text style={[s.floorMult, { color: isActive ? ACCENT : palette.muted }]}>{floorMult}x</Text>
                <View style={s.floorTiles}>
                  {row.map((tile, cIdx) => (
                    <Pressable
                      key={cIdx}
                      onPress={() => isActive && selectTile(cIdx)}
                      style={[
                        s.floorTile,
                        tile === 'safe' && s.tileSafe,
                        tile === 'egg' && s.tileEgg,
                        isActive && tile === 'hidden' && s.tileClickable,
                        !isActive && !isPast && tile === 'hidden' && { opacity: 0.4 },
                        isPast && tile === 'hidden' && { opacity: 0.2 },
                      ]}
                    >
                      <Text style={s.tileEmoji}>
                        {tile === 'safe' ? '🛡️' : tile === 'egg' ? '🥚' : isActive ? '?' : '·'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {/* Result */}
        {result && (
          <Animated.View style={[s.resultCard, { transform: [{ scale: resultScale }] }]}>
            <Text style={[s.resultMsg, { color: result.won ? palette.success : palette.danger }]}>
              {result.won ? 'Escaped the Dragon!' : 'Dragon found you! 🐲'}
            </Text>
            {result.won && <Text style={s.resultPayout}>+{result.payout}</Text>}
          </Animated.View>
        )}

        {/* Controls */}
        <View style={s.controls}>
          {!playing ? (
            <>
              <View style={s.diffRow}>
                {(['Easy', 'Medium', 'Hard', 'Expert'] as Difficulty[]).map(d => (
                  <Pressable key={d} onPress={() => setDifficulty(d)} style={[s.diffBtn, difficulty === d && s.diffActive]}>
                    <Text style={[s.diffLabel, difficulty === d && { color: ACCENT }]}>{d}</Text>
                  </Pressable>
                ))}
              </View>
              <BetInput value={betAmount} onChange={setBetAmount} balance={balance} accent={ACCENT} />
              <Pressable onPress={startGame}>
                <LinearGradient colors={['#22D3EE', '#06B6D4']} style={s.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={s.actionText}>Enter Tower</Text>
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            multiplier > 1 && (
              <Pressable onPress={cashout}>
                <LinearGradient colors={['#22C55E', '#16A34A']} style={s.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={s.actionText}>Escape! Cash Out {Math.floor(bet * multiplier)}</Text>
                </LinearGradient>
              </Pressable>
            )
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
  dragonArea: { alignItems: 'center', marginTop: 8 },
  dragonEmoji: { fontSize: 48 },
  floorText: { color: ACCENT, fontFamily: fonts.mono, fontSize: 13, marginTop: 4 },
  multRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginTop: 8 },
  multVal: { fontFamily: fonts.display, fontSize: 24 },
  multPayout: { color: palette.muted, fontFamily: fonts.mono, fontSize: 13 },
  tower: { paddingHorizontal: 16, marginTop: 12, gap: 3 },
  floorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  floorActive: { backgroundColor: ACCENT + '08', borderRadius: 10, paddingHorizontal: 4 },
  floorMult: { fontFamily: fonts.mono, fontSize: 10, width: 40, textAlign: 'right' },
  floorTiles: { flex: 1, flexDirection: 'row', gap: 5 },
  floorTile: { flex: 1, height: 38, borderRadius: 8, backgroundColor: palette.panel, alignItems: 'center', justifyContent: 'center' },
  tileClickable: { backgroundColor: palette.panelSoft, borderWidth: 1, borderColor: ACCENT + '30' },
  tileSafe: { backgroundColor: '#22D3EE20' },
  tileEgg: { backgroundColor: '#EF444420' },
  tileEmoji: { fontSize: 16 },
  resultCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: palette.panel, borderRadius: 16, padding: 16, alignItems: 'center', ...shadows.medium },
  resultMsg: { fontFamily: fonts.display, fontSize: 18 },
  resultPayout: { color: palette.success, fontFamily: fonts.mono, fontSize: 16, marginTop: 4 },
  controls: { paddingHorizontal: 20, marginTop: 16, gap: 12 },
  diffRow: { flexDirection: 'row', gap: 6 },
  diffBtn: { flex: 1, backgroundColor: palette.panel, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  diffActive: { borderWidth: 1, borderColor: ACCENT + '40' },
  diffLabel: { color: palette.muted, fontFamily: fonts.display, fontSize: 11 },
  actionBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', ...shadows.glow(ACCENT) },
  actionText: { color: '#FFF', fontFamily: fonts.display, fontSize: 16 },
});
