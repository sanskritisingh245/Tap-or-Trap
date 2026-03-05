import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Pressable, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from '../components/AmbientBackground';
import { verifyFairness } from '../services/gameApi';
import { fonts, palette, shadows } from '../theme/ui';

export default function FairnessScreen({ onBack }: { onBack: () => void }) {
  const [serverSeed, setServerSeed] = useState('');
  const [clientSeed, setClientSeed] = useState('');
  const [nonce, setNonce] = useState('');
  const [seedHash, setSeedHash] = useState('');
  const [gameType, setGameType] = useState('coinflip');
  const [result, setResult] = useState<{ verified: boolean; hash: string; outcome: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const verifyBtnScale = useRef(new Animated.Value(1)).current;

  const GAME_TYPES = ['coinflip', 'dice', 'mines', 'crash'];

  const handleVerify = async () => {
    if (!serverSeed || !clientSeed || !nonce) { setError('Fill in all fields'); return; }
    setError(''); setLoading(true);
    try {
      const res = await verifyFairness({ serverSeed, clientSeed, nonce: parseInt(nonce), seedHash, gameType });
      setResult(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
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

        <Text style={styles.label}>GAME TYPE</Text>
        <View style={styles.typeRow}>
          {GAME_TYPES.map(t => (
            <Pressable key={t} style={[styles.typeBtn, gameType === t && styles.typeBtnActiveWrap]} onPress={() => setGameType(t)}>
              {gameType === t ? (
                <LinearGradient colors={[palette.primary + '30', palette.primary + '10']} style={styles.typeGrad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
                  <Text style={styles.typeTextActive}>{t.toUpperCase()}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.typeGrad}>
                  <Text style={styles.typeText}>{t.toUpperCase()}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>SERVER SEED</Text>
        <TextInput style={styles.input} value={serverSeed} onChangeText={setServerSeed} placeholder="Revealed after round" placeholderTextColor={palette.muted} autoCapitalize="none" selectionColor={palette.primary} />

        <Text style={styles.label}>CLIENT SEED (YOUR WALLET)</Text>
        <TextInput style={styles.input} value={clientSeed} onChangeText={setClientSeed} placeholder="Your wallet address" placeholderTextColor={palette.muted} autoCapitalize="none" selectionColor={palette.primary} />

        <Text style={styles.label}>NONCE</Text>
        <TextInput style={styles.input} value={nonce} onChangeText={setNonce} placeholder="Bet number" placeholderTextColor={palette.muted} keyboardType="number-pad" selectionColor={palette.primary} />

        <Text style={styles.label}>SEED HASH (ON-CHAIN COMMITMENT)</Text>
        <TextInput style={styles.input} value={seedHash} onChangeText={setSeedHash} placeholder="SHA-256 hash shown before bet" placeholderTextColor={palette.muted} autoCapitalize="none" selectionColor={palette.primary} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={handleVerify}
          disabled={loading}
          onPressIn={() => Animated.spring(verifyBtnScale, { toValue: 0.96, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
          onPressOut={() => Animated.spring(verifyBtnScale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
        >
          <Animated.View style={{ transform: [{ scale: verifyBtnScale }] }}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={[styles.verifyBtn, loading && styles.btnDisabled, shadows.glow(palette.primary)]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Text style={styles.verifyText}>{loading ? 'VERIFYING...' : 'VERIFY'}</Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>

        {result && (
          <LinearGradient
            colors={result.verified
              ? ['rgba(59,130,246,0.16)', 'rgba(59,130,246,0.04)']
              : ['rgba(255,71,87,0.16)', 'rgba(255,71,87,0.04)']
            }
            style={styles.resultBox}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          >
            <Text style={styles.resultTitle}>{result.verified ? '✓ VERIFIED' : '✗ FAILED'}</Text>
            <Text style={styles.resultLabel}>Hash:</Text>
            <Text style={styles.resultCode}>{result.hash.slice(0, 32)}...</Text>
            <Text style={styles.resultLabel}>Outcome:</Text>
            <Text style={styles.resultCode}>
              {typeof result.outcome === 'object' ? JSON.stringify(result.outcome) : String(result.outcome)}
            </Text>
            {result.verified && (
              <Text style={styles.resultNote}>
                Seed hash matches. The outcome was predetermined before your bet was placed.
              </Text>
            )}
          </LinearGradient>
        )}

        <View style={styles.chainBadge}>
          <Text style={styles.chainEmoji}>⛓</Text>
          <Text style={styles.chainText}>
            Seed commitments are stored on Solana Devnet.{'\n'}Every bet is verifiable on-chain.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  back: { color: palette.muted, fontFamily: fonts.mono, fontSize: 13 },
  title: { color: palette.primaryStrong, fontFamily: fonts.display, fontSize: 20 },
  infoBox: {
    borderRadius: 18, backgroundColor: palette.panelSoft, padding: 16, marginBottom: 16,
    ...shadows.subtle,
  },
  infoTitle: { color: palette.primaryStrong, fontFamily: fonts.display, fontSize: 16, marginBottom: 8 },
  infoText: { color: palette.text, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
  code: { fontFamily: fonts.mono, color: palette.primaryStrong, fontSize: 11 },
  highlight: { color: palette.primaryStrong, fontFamily: fonts.body },
  label: { color: palette.muted, fontFamily: fonts.mono, fontSize: 10, marginBottom: 4, marginTop: 10 },
  typeRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  typeBtn: { flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: palette.panelSoft },
  typeBtnActiveWrap: { backgroundColor: 'transparent' },
  typeGrad: { paddingVertical: 8, alignItems: 'center' },
  typeText: { color: palette.muted, fontFamily: fonts.mono, fontSize: 10 },
  typeTextActive: { color: palette.primaryStrong, fontFamily: fonts.mono, fontSize: 10 },
  input: {
    borderRadius: 14, borderWidth: 1, borderColor: palette.panelStroke,
    backgroundColor: palette.panelSoft, paddingHorizontal: 14, paddingVertical: 12,
    color: palette.text, fontFamily: fonts.mono, fontSize: 12, marginBottom: 4,
  },
  error: { color: palette.danger, fontFamily: fonts.mono, fontSize: 12, textAlign: 'center', marginTop: 8 },
  verifyBtn: { marginTop: 14, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  verifyText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 18 },
  resultBox: { marginTop: 16, borderRadius: 18, padding: 16, ...shadows.subtle },
  resultTitle: { color: palette.text, fontFamily: fonts.display, fontSize: 22, marginBottom: 8 },
  resultLabel: { color: palette.muted, fontFamily: fonts.mono, fontSize: 10, marginTop: 6 },
  resultCode: { color: palette.primaryStrong, fontFamily: fonts.mono, fontSize: 11, marginTop: 2 },
  resultNote: { color: palette.success, fontFamily: fonts.body, fontSize: 12, marginTop: 8, lineHeight: 18 },
  chainBadge: {
    marginTop: 20, borderRadius: 18, backgroundColor: palette.panelSoft,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    ...shadows.subtle,
  },
  chainEmoji: { fontSize: 28 },
  chainText: { color: palette.muted, fontFamily: fonts.body, fontSize: 12, flex: 1, lineHeight: 18 },
});
