import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { AmbientBackground } from '../components/AmbientBackground';
import { verifyFairness } from '../services/gameApi';
import { fonts, palette, fs } from '../theme/ui';

export default function FairnessScreen({ onBack }: { onBack: () => void }) {
  const [serverSeed, setServerSeed] = useState('');
  const [clientSeed, setClientSeed] = useState('');
  const [nonce, setNonce] = useState('');
  const [seedHash, setSeedHash] = useState('');
  const [gameType, setGameType] = useState('coinflip');
  const [result, setResult] = useState<{ verified: boolean; hash: string; outcome: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const GAME_TYPES = ['coinflip', 'dice', 'mines', 'crash'];

  const handleVerify = async () => {
    if (!serverSeed || !clientSeed || !nonce) {
      setError('Fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await verifyFairness({
        serverSeed,
        clientSeed,
        nonce: parseInt(nonce),
        seedHash,
        gameType,
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AmbientBackground tone="cool" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.back}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.title}>PROVABLY FAIR</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Explanation */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How It Works</Text>
          <Text style={styles.infoText}>
            Every bet's outcome is determined by:{'\n'}
            <Text style={styles.code}>SHA-256(serverSeed : clientSeed : nonce)</Text>
            {'\n\n'}Before you bet, we commit the seed hash on <Text style={styles.highlight}>Solana blockchain</Text>. After the round, the server seed is revealed. You can verify:{'\n\n'}
            1. SHA-256(serverSeed) === seedHash (commitment matches){'\n'}
            2. The outcome derives deterministically from the hash{'\n\n'}
            This means we can't change the outcome after your bet.
          </Text>
        </View>

        {/* Game Type Selector */}
        <Text style={styles.label}>GAME TYPE</Text>
        <View style={styles.typeRow}>
          {GAME_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, gameType === t && styles.typeBtnActive]}
              onPress={() => setGameType(t)}
            >
              <Text style={[styles.typeText, gameType === t && styles.typeTextActive]}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input Fields */}
        <Text style={styles.label}>SERVER SEED</Text>
        <TextInput
          style={styles.input}
          value={serverSeed}
          onChangeText={setServerSeed}
          placeholder="Revealed after round"
          placeholderTextColor={palette.muted}
          autoCapitalize="none"
        />

        <Text style={styles.label}>CLIENT SEED (YOUR WALLET)</Text>
        <TextInput
          style={styles.input}
          value={clientSeed}
          onChangeText={setClientSeed}
          placeholder="Your wallet address"
          placeholderTextColor={palette.muted}
          autoCapitalize="none"
        />

        <Text style={styles.label}>NONCE</Text>
        <TextInput
          style={styles.input}
          value={nonce}
          onChangeText={setNonce}
          placeholder="Bet number"
          placeholderTextColor={palette.muted}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>SEED HASH (ON-CHAIN COMMITMENT)</Text>
        <TextInput
          style={styles.input}
          value={seedHash}
          onChangeText={setSeedHash}
          placeholder="SHA-256 hash shown before bet"
          placeholderTextColor={palette.muted}
          autoCapitalize="none"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.verifyBtn, loading && styles.btnDisabled]}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={0.86}
        >
          <Text style={styles.verifyText}>{loading ? 'VERIFYING...' : 'VERIFY'}</Text>
        </TouchableOpacity>

        {/* Result */}
        {result && (
          <View style={[styles.resultBox, result.verified ? styles.resultPass : styles.resultFail]}>
            <Text style={styles.resultTitle}>
              {result.verified ? '✓ VERIFIED' : '✗ FAILED'}
            </Text>
            <Text style={styles.resultLabel}>Hash:</Text>
            <Text style={styles.resultCode}>{result.hash.slice(0, 32)}...</Text>
            <Text style={styles.resultLabel}>Outcome:</Text>
            <Text style={styles.resultCode}>
              {typeof result.outcome === 'object'
                ? JSON.stringify(result.outcome)
                : String(result.outcome)}
            </Text>
            {result.verified && (
              <Text style={styles.resultNote}>
                Seed hash matches. The outcome was predetermined before your bet was placed.
              </Text>
            )}
          </View>
        )}

        {/* On-chain badge */}
        <View style={styles.chainBadge}>
          <Text style={styles.chainEmoji}>⛓</Text>
          <Text style={styles.chainText}>
            Seed commitments are stored on Solana Devnet.{'\n'}
            Every bet is verifiable on-chain.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  back: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(13) },
  title: { color: palette.primaryStrong, fontFamily: fonts.display, fontSize: fs(20) },
  infoBox: {
    borderRadius: 18, borderWidth: 0,
    backgroundColor: palette.panelSoft, padding: 16, marginBottom: 16,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 1,
  },
  infoTitle: { color: palette.primaryStrong, fontFamily: fonts.display, fontSize: fs(16), marginBottom: 8 },
  infoText: { color: palette.text, fontFamily: fonts.body, fontSize: fs(13), lineHeight: 20 },
  code: { fontFamily: fonts.mono, color: palette.primaryStrong, fontSize: fs(11) },
  highlight: { color: palette.primaryStrong, fontFamily: fonts.body },
  label: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(10), marginBottom: 4, marginTop: 10 },
  typeRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  typeBtn: {
    flex: 1, borderRadius: 12, borderWidth: 0,
    backgroundColor: palette.panelSoft, paddingVertical: 8, alignItems: 'center',
  },
  typeBtnActive: { backgroundColor: palette.primary + '30' },
  typeText: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(10) },
  typeTextActive: { color: palette.primaryStrong },
  input: {
    borderRadius: 14, borderWidth: 1, borderColor: palette.panelStroke,
    backgroundColor: palette.panelSoft, paddingHorizontal: 14, paddingVertical: 12,
    color: palette.text, fontFamily: fonts.mono, fontSize: fs(12), marginBottom: 4,
  },
  error: { color: palette.danger, fontFamily: fonts.mono, fontSize: fs(12), textAlign: 'center', marginTop: 8 },
  verifyBtn: {
    marginTop: 14, borderRadius: 24, backgroundColor: palette.primaryStrong,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: palette.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  btnDisabled: { opacity: 0.5 },
  verifyText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: fs(18) },
  resultBox: {
    marginTop: 16, borderRadius: 18, borderWidth: 0, padding: 16,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
  },
  resultPass: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  resultFail: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  resultTitle: { color: palette.text, fontFamily: fonts.display, fontSize: fs(22), marginBottom: 8 },
  resultLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(10), marginTop: 6 },
  resultCode: { color: palette.primaryStrong, fontFamily: fonts.mono, fontSize: fs(11), marginTop: 2 },
  resultNote: { color: palette.success, fontFamily: fonts.body, fontSize: fs(12), marginTop: 8, lineHeight: 18 },
  chainBadge: {
    marginTop: 20, borderRadius: 18, borderWidth: 0,
    backgroundColor: palette.panelSoft, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1,
  },
  chainEmoji: { fontSize: fs(28) },
  chainText: { color: palette.muted, fontFamily: fonts.body, fontSize: fs(12), flex: 1, lineHeight: 18 },
});
