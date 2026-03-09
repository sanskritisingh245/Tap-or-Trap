import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppDialog } from '../components/AppDialog';
import { TierBadge, getTierColor } from '../components/TierBadge';
import { fonts, palette } from '../theme/ui';
import { getPlayerStats, PlayerStats, topUpCredits, getCreditsBalance, withdrawCredits } from '../services/api';
import { deriveUsername } from '../utils/username';

interface SettingsScreenProps {
  wallet: {
    publicKey: string | null;
    connected: boolean;
    disconnect: () => Promise<void>;
  };
  onNavigate: (screen: string) => void;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen({ wallet, onNavigate }: SettingsScreenProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [credits, setCredits] = useState(0);
  const [winnings, setWinnings] = useState(0);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [showCashoutDialog, setShowCashoutDialog] = useState(false);
  const [cashoutLoading, setCashoutLoading] = useState(false);
  const [cashoutResult, setCashoutResult] = useState<{ withdrawn: number; signature: string } | null>(null);
  const [cashoutError, setCashoutError] = useState<string | null>(null);

  const refreshBalance = () => {
    getCreditsBalance().then((b) => {
      setCredits(b.playsRemaining);
      setWinnings(b.winnings);
    }).catch(() => {});
  };

  useEffect(() => {
    if (!wallet.connected) return;
    getPlayerStats().then(setStats).catch(() => {});
    refreshBalance();
  }, [wallet.connected]);

  const address = wallet.publicKey || '';
  const username = deriveUsername(address);
  const tierColor = stats ? getTierColor(stats.tier) : palette.primary;

  const handleDisconnect = () => {
    setShowDisconnectDialog(true);
  };

  const handleTopUp = async () => {
    try {
      const b = await topUpCredits();
      setCredits(b);
    } catch {}
  };

  const handleCashout = async () => {
    setShowCashoutDialog(false);
    setCashoutLoading(true);
    try {
      const result = await withdrawCredits();
      setCashoutResult({ withdrawn: result.withdrawn, signature: result.signature });
      refreshBalance();
    } catch (e: any) {
      setCashoutError(e?.message || 'Withdrawal failed');
    } finally {
      setCashoutLoading(false);
    }
  };

  const xpProgress = stats && stats.nextTier
    ? Math.min(((stats.xpThreshold - stats.xpToNext) / stats.xpThreshold) * 100, 100)
    : 100;

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[palette.bgAlt, palette.bg]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.panel}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('home')} activeOpacity={0.7}>
              <View style={styles.chevron} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topChip} onPress={handleTopUp} activeOpacity={0.86}>
              <Text style={styles.topChipText}>Top Up +</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>PROFILE</Text>
          <View style={styles.titleDivider} />
          <View style={styles.sectionGap} />

          <View style={styles.profileCard}>
            <LinearGradient colors={[tierColor, `${tierColor}CC`]} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.username}>{username}</Text>
              <Text style={styles.wallet}>{address.slice(0, 8)}...{address.slice(-8)}</Text>
            </View>
            {stats ? <TierBadge tier={stats.tier} size="small" /> : null}
          </View>

          <View style={styles.balanceCard}>
            <View>
              <Text style={styles.balanceLabel}>CREDITS</Text>
              <Text style={styles.balanceValue}>{credits}</Text>
            </View>
            <Text style={styles.balanceMeta}>{stats ? `${stats.xp} XP` : '0 XP'}</Text>
          </View>

          <View style={styles.winningsCard}>
            <View>
              <Text style={styles.winningsLabel}>WINNINGS</Text>
              <Text style={styles.winningsValue}>{winnings} credits</Text>
            </View>
            <Text style={styles.winningsSol}>{(winnings * 0.01).toFixed(2)} SOL</Text>
          </View>

          {stats ? (
            <>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>TIER PROGRESS</Text>
                <Text style={styles.progressMeta}>{stats.nextTier ? `${stats.xpToNext} to ${stats.nextTier}` : 'MAX'}</Text>
              </View>
              <View style={styles.track}>
                <LinearGradient colors={['#4F8CFF', '#2E6EF2']} style={[styles.fill, { width: `${xpProgress}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              </View>

              <View style={styles.statsRow}>
                <StatTile label="Wins" value={String(stats.wins)} />
                <StatTile label="Losses" value={String(stats.losses)} />
                <StatTile label="Win%" value={`${stats.winRate}%`} />
                <StatTile label="Best" value={stats.bestReaction ? `${Math.round(stats.bestReaction)}ms` : '-'} />
                <StatTile label="Streak" value={stats.currentStreak > 0 ? `${stats.currentStreak}x` : '-'} />
                <StatTile label="Tier" value={stats.tier} />
              </View>
            </>
          ) : null}

          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.secondaryWrap} onPress={handleTopUp} activeOpacity={0.9}>
              <LinearGradient colors={['#E8C58F', '#CAA069']} style={styles.secondaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.secondaryBtnText}>Top Up Credits</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryWrap, { marginTop: 10 }]}
              onPress={() => setShowCashoutDialog(true)}
              activeOpacity={0.9}
              disabled={winnings === 0 || cashoutLoading}
            >
              <LinearGradient
                colors={['#E8C58F', '#CAA069']}
                style={[styles.secondaryBtn, { opacity: winnings > 0 ? 1 : 0.5 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.secondaryBtnText}>
                  {cashoutLoading ? 'Processing...' : 'Cashout Winnings'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect} activeOpacity={0.85}>
              <Text style={styles.disconnectText}>Disconnect Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <AppDialog
        visible={showDisconnectDialog}
        title="Disconnect Wallet"
        message="Are you sure you want to disconnect?"
        onClose={() => setShowDisconnectDialog(false)}
        actions={[
          { label: 'Cancel', onPress: () => setShowDisconnectDialog(false) },
          {
            label: 'Disconnect',
            tone: 'danger',
            onPress: () => {
              setShowDisconnectDialog(false);
              wallet.disconnect();
            },
          },
        ]}
      />
      <AppDialog
        visible={showCashoutDialog}
        title="Confirm Cashout"
        message={`Withdraw ${winnings} credits → ${(winnings * 0.01).toFixed(2)} SOL to your wallet?`}
        onClose={() => setShowCashoutDialog(false)}
        actions={[
          { label: 'Cancel', onPress: () => setShowCashoutDialog(false) },
          { label: 'Withdraw', onPress: handleCashout },
        ]}
      />
      <AppDialog
        visible={!!cashoutResult}
        title="Cashout Successful"
        message={cashoutResult ? `Withdrew ${cashoutResult.withdrawn} credits.\nTx: ${cashoutResult.signature.slice(0, 16)}...` : ''}
        onClose={() => setCashoutResult(null)}
        actions={[{ label: 'OK', onPress: () => setCashoutResult(null) }]}
      />
      <AppDialog
        visible={!!cashoutError}
        title="Cashout Failed"
        message={cashoutError || ''}
        onClose={() => setCashoutError(null)}
        actions={[{ label: 'OK', onPress: () => setCashoutError(null) }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 30, paddingBottom: 20 },
  panel: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 16,
  },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(205, 167, 109, 0.45)',
    backgroundColor: 'rgba(232, 197, 143, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    width: 10,
    height: 10,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: '#DCC5A2',
    transform: [{ rotate: '45deg' }],
    marginLeft: 3,
  },
  topChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(205, 167, 109, 0.5)',
    backgroundColor: 'rgba(232, 197, 143, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topChipText: { color: '#E6CEA8', fontFamily: fonts.body, fontSize: 14 },

  title: { marginTop: 16, color: '#F2DFC5', fontFamily: fonts.display, fontSize: 40, lineHeight: 42, textAlign: 'center' },
  titleDivider: {
    marginTop: 12,
    alignSelf: 'center',
    width: 96,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(230, 206, 168, 0.35)',
  },
  sectionGap: { height: 24 },

  profileCard: {
    marginTop: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(151, 171, 205, 0.25)',
    backgroundColor: 'rgba(28, 44, 68, 0.92)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: fonts.display, fontSize: 20 },
  username: { color: palette.text, fontFamily: fonts.display, fontSize: 18 },
  wallet: { marginTop: 2, color: palette.muted, fontFamily: fonts.mono, fontSize: 11 },

  balanceCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(220, 194, 151, 0.4)',
    backgroundColor: 'rgba(231, 210, 175, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  balanceLabel: { color: '#E6CEA8', fontFamily: fonts.mono, fontSize: 10 },
  balanceValue: { marginTop: 3, color: '#F7EAD7', fontFamily: fonts.display, fontSize: 28, lineHeight: 30 },
  balanceMeta: { color: '#E6CEA8', fontFamily: fonts.body, fontSize: 14 },

  winningsCard: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.4)',
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  winningsLabel: { color: '#81C784', fontFamily: fonts.mono, fontSize: 10 },
  winningsValue: { marginTop: 3, color: '#A5D6A7', fontFamily: fonts.display, fontSize: 22, lineHeight: 24 },
  winningsSol: { color: '#81C784', fontFamily: fonts.body, fontSize: 14 },

  progressRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.1 },
  progressMeta: { color: '#E6CEA8', fontFamily: fonts.mono, fontSize: 11 },
  track: {
    marginTop: 6,
    height: 9,
    borderRadius: 5,
    backgroundColor: palette.bgAlt,
    borderWidth: 1,
    borderColor: 'rgba(151, 171, 205, 0.18)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 5 },

  statsRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statTile: {
    width: '31.6%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(151, 171, 205, 0.28)',
    backgroundColor: 'rgba(28, 44, 68, 0.92)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  statLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: 10 },
  statValue: { marginTop: 3, color: palette.text, fontFamily: fonts.display, fontSize: 15 },

  bottomActions: { marginTop: 'auto', paddingTop: 14 },

  secondaryWrap: { borderRadius: 14, overflow: 'hidden' },
  secondaryBtn: { paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(120, 84, 39, 0.4)' },
  secondaryBtnText: { color: '#4D3520', fontFamily: fonts.display, fontSize: 20, lineHeight: 22 },

  disconnectBtn: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,90,122,0.45)',
    backgroundColor: 'rgba(255,90,122,0.12)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  disconnectText: { color: '#F4A9B8', fontFamily: fonts.body, fontSize: 13 },
});
