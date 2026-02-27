import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

interface LobbyMenuProps {
  playsRemaining: number | null;
  onFindRandom: () => void;
  onChallengeFreund: () => void;
  onJoinWithCode: () => void;
  onTopUp: () => void;
  onRefreshCredits: () => Promise<number>;
  walletAddress: string;
}

export function LobbyMenu({
  playsRemaining,
  onFindRandom,
  onChallengeFreund,
  onJoinWithCode,
  onTopUp,
  onRefreshCredits,
  walletAddress,
}: LobbyMenuProps) {
  // Refresh credits when lobby mounts (handles returning from a match)
  useEffect(() => {
    onRefreshCredits();
  }, []);

  const isLoading = playsRemaining === null;
  const needsTopUp = !isLoading && playsRemaining <= 0;
  const displayCredits = isLoading ? '...' : String(playsRemaining);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Text style={styles.logoIcon}>⚡</Text>
          <Text style={styles.logoText}>SNAP</Text>
          <Text style={styles.logoAccent}>DUEL</Text>
        </View>
        <View style={styles.walletPill}>
          <View style={styles.walletDot} />
          <Text style={styles.walletText}>
            {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
          </Text>
        </View>
      </View>

      {/* Credits Card */}
      <View style={styles.creditsCard}>
        <View style={styles.creditsInner}>
          <Text style={styles.creditsLabel}>PLAYS REMAINING</Text>
          {isLoading ? (
            <ActivityIndicator color="#14F195" size="small" style={{ marginTop: 8 }} />
          ) : (
            <Text style={[styles.creditsValue, needsTopUp && styles.creditsEmpty]}>
              {displayCredits}
            </Text>
          )}
        </View>
        {needsTopUp && (
          <View style={styles.creditsWarning}>
            <Text style={styles.creditsWarningText}>Top up to keep playing!</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {needsTopUp ? (
        <TouchableOpacity style={styles.topUpBtn} onPress={onTopUp} activeOpacity={0.8}>
          <Text style={styles.topUpIcon}>🎁</Text>
          <Text style={styles.topUpTitle}>GET 5 FREE PLAYS</Text>
          <Text style={styles.topUpSub}>Dev mode — no SOL required</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.actionGroup}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onFindRandom} activeOpacity={0.8}>
            <Text style={styles.primaryBtnIcon}>⚔️</Text>
            <View>
              <Text style={styles.primaryBtnText}>Find Random Opponent</Text>
              <Text style={styles.primaryBtnSub}>Quick match • ~10 seconds</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.secondaryRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onChallengeFreund} activeOpacity={0.8}>
              <Text style={styles.secondaryIcon}>👥</Text>
              <Text style={styles.secondaryText}>Challenge Friend</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={onJoinWithCode} activeOpacity={0.8}>
              <Text style={styles.secondaryIcon}>🔑</Text>
              <Text style={styles.secondaryText}>Join with Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by Solana</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B1A',
    padding: 24,
    paddingTop: 60,
  },

  // ─── Header ─────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 24,
    marginRight: 6,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  logoAccent: {
    fontSize: 24,
    fontWeight: '900',
    color: '#14F195',
    letterSpacing: 1,
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  walletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#14F195',
    marginRight: 8,
  },
  walletText: {
    color: '#7B7BA0',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },

  // ─── Credits Card ───────────────────────────────────────────
  creditsCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 28,
  },
  creditsInner: {
    padding: 24,
    alignItems: 'center',
  },
  creditsLabel: {
    color: '#7B7BA0',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  creditsValue: {
    color: '#14F195',
    fontSize: 56,
    fontWeight: '900',
    marginTop: 4,
  },
  creditsEmpty: {
    color: '#FF4444',
  },
  creditsWarning: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 68, 68, 0.15)',
  },
  creditsWarningText: {
    color: '#FF8888',
    fontSize: 13,
    fontWeight: '600',
  },

  // ─── Top Up ─────────────────────────────────────────────────
  topUpBtn: {
    backgroundColor: '#9945FF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#9945FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  topUpIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  topUpTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  topUpSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 4,
  },

  // ─── Action Buttons ─────────────────────────────────────────
  actionGroup: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#14F195',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#14F195',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
  },
  primaryBtnSub: {
    color: 'rgba(0,0,0,0.5)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  secondaryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  secondaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ─── Footer ─────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: '#2A2A4A',
    fontSize: 12,
    letterSpacing: 1,
  },
});
