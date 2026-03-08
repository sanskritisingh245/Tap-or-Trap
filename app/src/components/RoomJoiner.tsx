import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, palette, shadows } from '../theme/ui';

interface RoomJoinerProps {
  onJoin: (code: string) => void;
  onCancel: () => void;
  error?: string | null;
  loading?: boolean;
}

export function RoomJoiner({ onJoin, onCancel, error, loading }: RoomJoinerProps) {
  const [code, setCode] = useState('');
  const ready = code.length === 6;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[palette.bgAlt, palette.bg]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={styles.card}>
        <Text style={styles.head}>JOIN ROOM</Text>
        <TextInput
          style={[styles.input, ready && styles.inputReady]}
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase().slice(0, 6))}
          placeholder="A1B2C3"
          placeholderTextColor={palette.tertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          autoFocus
          selectionColor={palette.primary}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.joinWrap} onPress={() => ready && onJoin(code)} disabled={!ready || loading} activeOpacity={0.88}>
          <LinearGradient
            colors={ready ? ['#2A355C', '#132144'] : ['rgba(27, 42, 66, 0.95)', 'rgba(27, 42, 66, 0.95)']}
            style={styles.join}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.joinText, !ready && { color: palette.tertiary }]}>{loading ? '...' : 'JOIN'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.back} onPress={onCancel} activeOpacity={0.85}>
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: palette.bg },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(151, 171, 205, 0.26)',
    backgroundColor: 'rgba(22, 34, 54, 0.94)',
    padding: 20,
    ...shadows.medium,
  },
  head: { color: '#F2DFC5', fontFamily: fonts.display, fontSize: 24, textAlign: 'center', marginBottom: 12 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(220, 194, 151, 0.4)',
    backgroundColor: 'rgba(231, 210, 175, 0.14)',
    color: '#F3E2C8',
    fontFamily: fonts.display,
    fontSize: 34,
    letterSpacing: 6,
    textAlign: 'center',
    paddingVertical: 12,
  },
  inputReady: {
    borderColor: 'rgba(224,198,159,0.65)',
  },
  error: { marginTop: 8, color: '#F38FA4', fontFamily: fonts.body, fontSize: 13, textAlign: 'center' },
  joinWrap: { marginTop: 14, borderRadius: 14, overflow: 'hidden' },
  join: { paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(224,198,159,0.4)' },
  joinText: { color: '#F3E2C8', fontFamily: fonts.display, fontSize: 22 },
  back: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(84, 57, 26, 0.28)',
    backgroundColor: 'rgba(232, 197, 143, 0.9)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  backText: { color: '#4D3520', fontFamily: fonts.display, fontSize: 14 },
});
