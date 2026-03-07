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
            colors={ready ? [palette.primary, palette.primaryStrong] : [palette.panelSoft, palette.panelSoft]}
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
    borderColor: palette.panelStroke,
    backgroundColor: palette.panel,
    padding: 20,
    ...shadows.medium,
  },
  head: { color: palette.text, fontFamily: fonts.display, fontSize: 24, textAlign: 'center', marginBottom: 12 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.bgAlt,
    color: palette.text,
    fontFamily: fonts.mono,
    fontSize: 34,
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: 12,
  },
  inputReady: {
    borderColor: palette.primary,
  },
  error: { marginTop: 8, color: palette.danger, fontFamily: fonts.body, fontSize: 13, textAlign: 'center' },
  joinWrap: { marginTop: 14, borderRadius: 14, overflow: 'hidden' },
  join: { paddingVertical: 14, alignItems: 'center' },
  joinText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 22 },
  back: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panelSoft,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backText: { color: palette.muted, fontFamily: fonts.body, fontSize: 14 },
});
