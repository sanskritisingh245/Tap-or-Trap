import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { startMines, revealMine, cashoutMines } from '../services/gameApi';
import { hapticReveal, hapticExplosion, hapticCashout } from '../utils/sounds';
import { fonts, palette, gameColors, shadows } from '../theme/ui';

const ACCENT = gameColors.mines;
const GRID_SIZE = 25;

type TileState = 'hidden' | 'safe' | 'mine';

interface GameState {
  gameId: string;
  mineCount: number;
  betAmount: number;
  tiles: TileState[];
  revealed: number[];
  multiplier: number;
  potentialPayout: number;
  gameOver: boolean;
  won: boolean | null;
  mines: number[] | null;
}

export default function MinesScreen({ onBack }: { onBack: () => void }) {
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState('5');
  const [mineCount, setMineCount] = useState(3);
  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startBtnScale = useRef(new Animated.Value(1)).current;
  const cashoutBtnScale = useRef(new Animated.Value(1)).current;

  const loadBalance = useCallback(async () => {
    try { setBalance(await getCreditsBalance()); } catch {}
  }, []);

  useEffect(() => { loadBalance(); }, []);

  const handleStart = async () => {
    const amount = parseInt(betAmount);
    if (!amount || amount < 1) { setError('Enter a valid bet'); return; }
    if (amount > balance) { setError('Insufficient credits'); return; }

    setError('');
    setLoading(true);
    try {
      const res = await startMines(amount, mineCount);
      setBalance(b => b - amount);
      setGame({
        gameId: res.gameId, mineCount: res.mineCount, betAmount: amount,
        tiles: Array(GRID_SIZE).fill('hidden'), revealed: [],
        multiplier: 1, potentialPayout: amount, gameOver: false, won: null, mines: null,
      });
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleReveal = async (tile: number) => {
    if (!game || game.gameOver || game.tiles[tile] !== 'hidden') return;
    try {
      const res = await revealMine(game.gameId, tile);
      const newTiles = [...game.tiles];
      newTiles[tile] = res.safe ? 'safe' : 'mine';
      if (res.gameOver && res.mines) {
        res.mines.forEach((m: number) => { if (newTiles[m] === 'hidden') newTiles[m] = 'mine'; });
      }
      setGame({
        ...game, tiles: newTiles, revealed: [...game.revealed, tile],
        multiplier: res.multiplier || game.multiplier,
        potentialPayout: res.potentialPayout || res.payout || game.potentialPayout,
        gameOver: res.gameOver, won: res.gameOver ? res.safe : null, mines: res.mines || null,
      });
      if (res.balance !== undefined) setBalance(res.balance);
      if (res.safe) hapticReveal(); else hapticExplosion();
    } catch (e: any) { setError(e.message); }
  };

  const handleCashout = async () => {
    if (!game || game.gameOver || game.revealed.length === 0) return;
    try {
      const res = await cashoutMines(game.gameId);
      const newTiles = [...game.tiles];
      res.mines.forEach((m: number) => { if (newTiles[m] === 'hidden') newTiles[m] = 'mine'; });
      setGame({
        ...game, tiles: newTiles, multiplier: res.multiplier,
        potentialPayout: res.payout, gameOver: true, won: true, mines: res.mines,
      });
      setBalance(res.balance);
      hapticCashout();
    } catch (e: any) { setError(e.message); }
  };

  const resetGame = () => { setGame(null); setError(''); loadBalance(); };
  const MINE_COUNTS = [1, 3, 5, 10, 24];

  return (
    <View style={styles.screen}>
      <AmbientBackground tone="warm" />

      <View style={styles.header}>
        <TouchableOpacity onPress={game ? resetGame : onBack}>
          <Text style={styles.back}>{game ? '← NEW GAME' : '← GAMES'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: ACCENT }]}>MINES</Text>
        <Text style={styles.balText}>{balance} ¢</Text>
      </View>

      {!game ? (
        <View style={styles.setup}>
          <BetInput amount={betAmount} onChangeAmount={setBetAmount} balance={balance} disabled={loading} accentColor={ACCENT} />

          <Text style={styles.label}>MINES</Text>
          <View style={styles.mineRow}>
            {MINE_COUNTS.map(n => (
              <Pressable key={n} style={[styles.mineBtn, mineCount === n && styles.mineBtnActive]} onPress={() => setMineCount(n)}>
                {mineCount === n ? (
                  <LinearGradient colors={[ACCENT + '25', ACCENT + '08']} style={styles.mineBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
                    <Text style={[styles.mineText, { color: ACCENT }]}>{n}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.mineBtnGrad}>
                    <Text style={styles.mineText}>{n}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleStart}
            disabled={loading}
            onPressIn={() => Animated.spring(startBtnScale, { toValue: 0.96, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
            onPressOut={() => Animated.spring(startBtnScale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
          >
            <Animated.View style={{ transform: [{ scale: startBtnScale }] }}>
              <LinearGradient
                colors={[ACCENT, ACCENT + 'CC']}
                style={[styles.startBtn, loading && styles.btnDisabled, shadows.glow(ACCENT)]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Text style={styles.startText}>{loading ? 'STARTING...' : 'START GAME'}</Text>
              </LinearGradient>
            </Animated.View>
          </Pressable>
        </View>
      ) : (
        <View style={styles.gameArea}>
          <LinearGradient
            colors={game.gameOver
              ? (game.won ? ['rgba(59,130,246,0.12)', 'transparent'] : ['rgba(255,71,87,0.12)', 'transparent'])
              : [ACCENT + '08', 'transparent']
            }
            style={styles.multiRow}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          >
            <Text style={styles.multiLabel}>
              {game.gameOver
                ? (game.won ? `WON ${game.potentialPayout} credits!` : 'BOOM!')
                : `${game.multiplier}x — ${game.potentialPayout} credits`
              }
            </Text>
          </LinearGradient>

          <View style={styles.grid}>
            {game.tiles.map((state, i) => {
              const isSafe = state === 'safe';
              const isMine = state === 'mine';
              const isHidden = state === 'hidden';
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.tile, isSafe && styles.tileSafe, isMine && styles.tileMine]}
                  onPress={() => handleReveal(i)}
                  disabled={!isHidden || game.gameOver}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tileText}>
                    {isSafe ? '💎' : isMine ? '💣' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!game.gameOver && game.revealed.length > 0 && (
            <Pressable
              onPress={handleCashout}
              onPressIn={() => Animated.spring(cashoutBtnScale, { toValue: 0.96, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
              onPressOut={() => Animated.spring(cashoutBtnScale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
            >
              <Animated.View style={{ transform: [{ scale: cashoutBtnScale }] }}>
                <LinearGradient
                  colors={[palette.success, palette.success + 'CC']}
                  style={[styles.cashoutBtn, shadows.glow(palette.success)]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.cashoutText}>CASHOUT {game.potentialPayout} ¢</Text>
                </LinearGradient>
              </Animated.View>
            </Pressable>
          )}

          {game.gameOver && (
            <TouchableOpacity style={styles.newGameBtn} onPress={resetGame} activeOpacity={0.86}>
              <Text style={styles.newGameText}>NEW GAME</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
  setup: { flex: 1, padding: 16, justifyContent: 'center' },
  label: { color: palette.muted, fontFamily: fonts.mono, fontSize: 11, marginBottom: 8 },
  mineRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  mineBtn: {
    flex: 1, borderRadius: 14, overflow: 'hidden',
    backgroundColor: palette.panelSoft, ...shadows.subtle,
  },
  mineBtnActive: { backgroundColor: 'transparent' },
  mineBtnGrad: { paddingVertical: 12, alignItems: 'center' },
  mineText: { color: palette.muted, fontFamily: fonts.display, fontSize: 18 },
  error: { color: palette.danger, fontFamily: fonts.mono, fontSize: 12, textAlign: 'center', marginBottom: 8 },
  startBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  startText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 22 },
  gameArea: { flex: 1, padding: 16 },
  multiRow: { borderRadius: 14, padding: 12, alignItems: 'center', marginBottom: 12 },
  multiLabel: { color: palette.text, fontFamily: fonts.display, fontSize: 16 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4,
    justifyContent: 'center', alignSelf: 'center',
  },
  tile: {
    width: '18%', aspectRatio: 1, borderRadius: 12,
    backgroundColor: palette.panelSoft, justifyContent: 'center', alignItems: 'center',
    ...shadows.subtle,
  },
  tileSafe: { backgroundColor: 'rgba(59,130,246,0.22)' },
  tileMine: { backgroundColor: 'rgba(255,71,87,0.22)' },
  tileText: { fontSize: 22 },
  cashoutBtn: {
    marginTop: 16, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  cashoutText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 20 },
  newGameBtn: {
    marginTop: 16, borderRadius: 14, backgroundColor: ACCENT, paddingVertical: 16, alignItems: 'center',
    ...shadows.glow(ACCENT),
  },
  newGameText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 20 },
});
