import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Pressable, ScrollView, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { placeBet, settleBet } from '../services/gameApi';
import { fonts, palette, gameColors, shadows } from '../theme/ui';

const ACCENT = gameColors.tower;
const { width: SW } = Dimensions.get('window');
const BANNER_HEIGHT = 200;
const COLS = 3;
const MAX_ROWS = 10;

type Difficulty = 'Easy' | 'Medium' | 'Hard';
const MINES_PER_ROW: Record<Difficulty, number> = { Easy: 1, Medium: 1, Hard: 2 };
const MULT_STEP: Record<Difficulty, number> = { Easy: 1.25, Medium: 1.5, Hard: 1.9 };

type TileState = 'hidden' | 'safe' | 'bomb';

export default function TowerScreen({ onBack }: { onBack: () => void }) {
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState('5');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [playing, setPlaying] = useState(false);
  const [currentRow, setCurrentRow] = useState(MAX_ROWS - 1);
  const [grid, setGrid] = useState<TileState[][]>([]);
  const [minePositions, setMinePositions] = useState<number[][]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [bet, setBet] = useState(0);
  const [result, setResult] = useState<{ won: boolean; payout: number } | null>(null);

  const resultScale = useRef(new Animated.Value(0)).current;

  const loadBalance = useCallback(async () => {
    try { setBalance(await getCreditsBalance()); } catch {}
  }, []);
  useEffect(() => { loadBalance(); }, []);

  const startGame = async () => {
    const b = parseInt(betAmount);
    if (!b || b < 1 || b > balance) return;
    try {
      const res = await placeBet(b, 'tower');
      setBalance(res.balance);
    } catch { return; }
    setBet(b);
    setResult(null);
    resultScale.setValue(0);

    const mines: number[][] = [];
    const g: TileState[][] = [];
    for (let r = 0; r < MAX_ROWS; r++) {
      const rowMines: number[] = [];
      while (rowMines.length < MINES_PER_ROW[difficulty]) {
        const pos = Math.floor(Math.random() * COLS);
        if (!rowMines.includes(pos)) rowMines.push(pos);
      }
      mines.push(rowMines);
      g.push(Array(COLS).fill('hidden'));
    }
    setMinePositions(mines);
    setGrid(g);
    setCurrentRow(MAX_ROWS - 1);
    setMultiplier(1);
    setPlaying(true);
  };

  const selectTile = async (col: number) => {
    if (!playing || currentRow < 0) return;

    const newGrid = grid.map(r => [...r]);
    const isMine = minePositions[currentRow].includes(col);

    if (isMine) {
      minePositions[currentRow].forEach(m => { newGrid[currentRow][m] = 'bomb'; });
      newGrid[currentRow][col] = 'bomb';
      setGrid(newGrid);
      try {
        const res = await settleBet(0, 'tower', false);
        setBalance(res.balance);
      } catch {}
      setResult({ won: false, payout: 0 });
      setPlaying(false);
      Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 8 }).start();
    } else {
      newGrid[currentRow][col] = 'safe';
      setGrid(newGrid);
      const newMult = Math.round(multiplier * MULT_STEP[difficulty] * 100) / 100;
      setMultiplier(newMult);
      setCurrentRow(r => r - 1);

      if (currentRow === 0) {
        const payout = Math.floor(bet * newMult);
        try {
          const res = await settleBet(payout, 'tower', true);
          setBalance(res.balance);
        } catch {}
        setResult({ won: true, payout });
        setPlaying(false);
        Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 8 }).start();
      }
    }
  };

  const cashout = async () => {
    const payout = Math.floor(bet * multiplier);
    try {
      const res = await settleBet(payout, 'tower', true);
      setBalance(res.balance);
    } catch {}
    setResult({ won: true, payout });
    setPlaying(false);
    Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 8 }).start();
  };

  return (
    <View style={s.screen}>
      <AmbientBackground tone="warm" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Tower</Text>
        <View style={s.balPill}>
          <Text style={s.balText}>{balance.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={s.bannerWrap}>
          <Image source={require('../../assets/Tower.jpeg')} style={s.bannerImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(15,33,46,0.6)', palette.bg]}
            style={s.bannerOverlay}
            start={{ x: 0.5, y: 0.2 }}
            end={{ x: 0.5, y: 1 }}
          />
        </View>

        {/* Multiplier display */}
        {playing && (
          <View style={s.multRow}>
            <Text style={s.multLabel}>Current: </Text>
            <Text style={[s.multVal, { color: palette.success }]}>{multiplier.toFixed(2)}x</Text>
            <Text style={s.multPayout}> = {Math.floor(bet * multiplier)}</Text>
          </View>
        )}

        {/* Tower grid */}
        <View style={s.tower}>
          {grid.map((row, rIdx) => {
            const rowMult = Math.round(Math.pow(MULT_STEP[difficulty], MAX_ROWS - rIdx) * 100) / 100;
            const isActive = rIdx === currentRow;
            const isPast = rIdx > currentRow;

            return (
              <View key={rIdx} style={[s.towerRow, isActive && s.towerRowActive]}>
                <Text style={[s.rowMult, { color: isActive ? ACCENT : palette.muted }]}>{rowMult}x</Text>
                <View style={s.towerTiles}>
                  {row.map((tile, cIdx) => (
                    <Pressable
                      key={cIdx}
                      onPress={() => isActive && selectTile(cIdx)}
                      style={[
                        s.towerTile,
                        tile === 'safe' && s.tileSafe,
                        tile === 'bomb' && s.tileBomb,
                        isActive && tile === 'hidden' && s.tileClickable,
                        !isActive && tile === 'hidden' && { opacity: isPast ? 0.3 : 0.6 },
                      ]}
                    >
                      <Text style={s.tileEmoji}>
                        {tile === 'safe' ? '⭐' : tile === 'bomb' ? '💣' : isActive ? '?' : '·'}
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
              {result.won ? 'Cashed Out!' : 'Boom! 💥'}
            </Text>
            {result.won && <Text style={s.resultPayout}>+{result.payout}</Text>}
          </Animated.View>
        )}

        {/* Controls */}
        <View style={s.controls}>
          {!playing ? (
            <>
              <View style={s.diffRow}>
                {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map(d => (
                  <Pressable key={d} onPress={() => setDifficulty(d)} style={[s.diffBtn, difficulty === d && s.diffActive]}>
                    <Text style={[s.diffLabel, difficulty === d && { color: ACCENT }]}>{d}</Text>
                  </Pressable>
                ))}
              </View>
              <BetInput amount={betAmount} onChangeAmount={setBetAmount} balance={balance} accentColor={ACCENT} />
              <Pressable onPress={startGame}>
                <LinearGradient colors={['#F59E0B', '#D97706']} style={s.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={s.actionText}>Start Climbing</Text>
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            multiplier > 1 && (
              <Pressable onPress={cashout}>
                <LinearGradient colors={['#22C55E', '#16A34A']} style={s.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={s.actionText}>Cash Out {Math.floor(bet * multiplier)}</Text>
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
  bannerWrap: { width: SW, height: BANNER_HEIGHT, overflow: 'hidden', marginBottom: -20 },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject },
  multRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginTop: 12 },
  multLabel: { color: palette.muted, fontFamily: fonts.body, fontSize: 14 },
  multVal: { fontFamily: fonts.display, fontSize: 22 },
  multPayout: { color: palette.muted, fontFamily: fonts.mono, fontSize: 14 },
  tower: { paddingHorizontal: 16, marginTop: 12, gap: 4 },
  towerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  towerRowActive: { backgroundColor: ACCENT + '08', borderRadius: 12, paddingHorizontal: 4 },
  rowMult: { fontFamily: fonts.mono, fontSize: 11, width: 44, textAlign: 'right' },
  towerTiles: { flex: 1, flexDirection: 'row', gap: 6 },
  towerTile: { flex: 1, height: 44, borderRadius: 10, backgroundColor: palette.panel, alignItems: 'center', justifyContent: 'center' },
  tileClickable: { backgroundColor: palette.panelSoft, borderWidth: 1, borderColor: ACCENT + '30' },
  tileSafe: { backgroundColor: '#22C55E25' },
  tileBomb: { backgroundColor: '#EF444425' },
  tileEmoji: { fontSize: 18 },
  resultCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: palette.panel, borderRadius: 16, padding: 16, alignItems: 'center', ...shadows.medium },
  resultMsg: { fontFamily: fonts.display, fontSize: 22 },
  resultPayout: { color: palette.success, fontFamily: fonts.mono, fontSize: 16, marginTop: 4 },
  controls: { paddingHorizontal: 20, marginTop: 16, gap: 12 },
  diffRow: { flexDirection: 'row', gap: 8 },
  diffBtn: { flex: 1, backgroundColor: palette.panel, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  diffActive: { borderWidth: 1, borderColor: ACCENT + '40' },
  diffLabel: { color: palette.muted, fontFamily: fonts.display, fontSize: 13 },
  actionBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', ...shadows.glow(ACCENT) },
  actionText: { color: '#FFF', fontFamily: fonts.display, fontSize: 16 },
});
