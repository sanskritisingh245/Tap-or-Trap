import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { AmbientBackground } from '../components/AmbientBackground';
import { BetInput } from '../components/BetInput';
import { getCreditsBalance } from '../services/api';
import { startMines, revealMine, cashoutMines } from '../services/gameApi';
import { hapticReveal, hapticExplosion, hapticCashout } from '../utils/sounds';
import { fonts, palette, gameColors, fs } from '../theme/ui';

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

  const resultScale = useRef(new Animated.Value(0)).current;

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
        gameId: res.gameId,
        mineCount: res.mineCount,
        betAmount: amount,
        tiles: Array(GRID_SIZE).fill('hidden'),
        revealed: [],
        multiplier: 1,
        potentialPayout: amount,
        gameOver: false,
        won: null,
        mines: null,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async (tile: number) => {
    if (!game || game.gameOver || game.tiles[tile] !== 'hidden') return;

    try {
      const res = await revealMine(game.gameId, tile);
      const newTiles = [...game.tiles];
      newTiles[tile] = res.safe ? 'safe' : 'mine';

      if (res.gameOver && res.mines) {
        // Reveal all mines
        res.mines.forEach((m: number) => {
          if (newTiles[m] === 'hidden') newTiles[m] = 'mine';
        });
      }

      setGame({
        ...game,
        tiles: newTiles,
        revealed: [...game.revealed, tile],
        multiplier: res.multiplier || game.multiplier,
        potentialPayout: res.potentialPayout || res.payout || game.potentialPayout,
        gameOver: res.gameOver,
        won: res.gameOver ? res.safe : null,
        mines: res.mines || null,
      });

      if (res.balance !== undefined) setBalance(res.balance);

      if (res.safe) {
        hapticReveal();
      } else {
        hapticExplosion();
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleCashout = async () => {
    if (!game || game.gameOver || game.revealed.length === 0) return;

    try {
      const res = await cashoutMines(game.gameId);
      const newTiles = [...game.tiles];
      res.mines.forEach((m: number) => {
        if (newTiles[m] === 'hidden') newTiles[m] = 'mine';
      });

      setGame({
        ...game,
        tiles: newTiles,
        multiplier: res.multiplier,
        potentialPayout: res.payout,
        gameOver: true,
        won: true,
        mines: res.mines,
      });
      setBalance(res.balance);
      hapticCashout();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const resetGame = () => {
    setGame(null);
    setError('');
    loadBalance();
  };

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
        /* Setup */
        <View style={styles.setup}>
          <BetInput
            amount={betAmount}
            onChangeAmount={setBetAmount}
            balance={balance}
            disabled={loading}
            accentColor={ACCENT}
          />

          <Text style={styles.label}>MINES</Text>
          <View style={styles.mineRow}>
            {MINE_COUNTS.map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.mineBtn, mineCount === n && { borderColor: ACCENT, backgroundColor: ACCENT + '20' }]}
                onPress={() => setMineCount(n)}
              >
                <Text style={[styles.mineText, mineCount === n && { color: ACCENT }]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.startBtn, loading && styles.btnDisabled]}
            onPress={handleStart}
            disabled={loading}
            activeOpacity={0.86}
          >
            <Text style={styles.startText}>{loading ? 'STARTING...' : 'START GAME'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Game Board */
        <View style={styles.gameArea}>
          {/* Multiplier Display */}
          <View style={styles.multiRow}>
            <Text style={styles.multiLabel}>
              {game.gameOver
                ? (game.won ? `WON ${game.potentialPayout} credits!` : 'BOOM! 💥')
                : `${game.multiplier}x — ${game.potentialPayout} credits`
              }
            </Text>
          </View>

          {/* Grid */}
          <View style={styles.grid}>
            {game.tiles.map((state, i) => {
              const isSafe = state === 'safe';
              const isMine = state === 'mine';
              const isHidden = state === 'hidden';
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.tile,
                    isSafe && styles.tileSafe,
                    isMine && styles.tileMine,
                  ]}
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

          {/* Cashout / Reset */}
          {!game.gameOver && game.revealed.length > 0 && (
            <TouchableOpacity style={styles.cashoutBtn} onPress={handleCashout} activeOpacity={0.86}>
              <Text style={styles.cashoutText}>CASHOUT {game.potentialPayout} ¢</Text>
            </TouchableOpacity>
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
  back: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(13) },
  title: { fontFamily: fonts.display, fontSize: fs(20) },
  balText: { color: palette.primaryStrong, fontFamily: fonts.mono, fontSize: fs(13) },
  setup: { flex: 1, padding: 16, justifyContent: 'center' },
  label: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(11), marginBottom: 8 },
  mineRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  mineBtn: {
    flex: 1, borderRadius: 14, borderWidth: 0,
    backgroundColor: palette.panelSoft, paddingVertical: 12, alignItems: 'center',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1,
  },
  mineText: { color: palette.muted, fontFamily: fonts.display, fontSize: fs(18) },
  error: { color: palette.danger, fontFamily: fonts.mono, fontSize: fs(12), textAlign: 'center', marginBottom: 8 },
  startBtn: { borderRadius: 24, backgroundColor: ACCENT, paddingVertical: 16, alignItems: 'center', shadowColor: ACCENT, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  btnDisabled: { opacity: 0.5 },
  startText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: fs(22) },
  gameArea: { flex: 1, padding: 16 },
  multiRow: {
    borderRadius: 14, backgroundColor: palette.panelSoft, padding: 12, alignItems: 'center', marginBottom: 12,
  },
  multiLabel: { color: palette.text, fontFamily: fonts.display, fontSize: fs(16) },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4,
    justifyContent: 'center', alignSelf: 'center',
  },
  tile: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 0,
    backgroundColor: palette.panelSoft,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 1,
  },
  tileSafe: { backgroundColor: 'rgba(34, 197, 94, 0.2)' },
  tileMine: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  tileText: { fontSize: fs(22) },
  cashoutBtn: {
    marginTop: 16, borderRadius: 24, backgroundColor: palette.success, paddingVertical: 16, alignItems: 'center',
    shadowColor: palette.success, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  cashoutText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: fs(20) },
  newGameBtn: {
    marginTop: 16, borderRadius: 24, backgroundColor: ACCENT, paddingVertical: 16, alignItems: 'center',
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  newGameText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: fs(20) },
});
