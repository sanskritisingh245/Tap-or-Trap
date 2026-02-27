import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AmbientBackground } from './AmbientBackground';
import { fonts, palette } from '../theme/ui';

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
      <AmbientBackground tone="cool" />
      <View style={styles.card}>
        <Text style={styles.head}>JOIN</Text>
        <TextInput
          style={[styles.input, ready && styles.inputReady]}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase().slice(0, 6))}
          placeholder="A1B2C3"
          placeholderTextColor="rgba(166, 179, 205, 0.55)"
          autoCorrect={false}
          autoCapitalize="characters"
          maxLength={6}
          autoFocus
        />
        {error ? <Text style={styles.err}>{error}</Text> : null}
        <TouchableOpacity style={[styles.join, !ready && styles.joinOff]} onPress={() => ready && onJoin(code)} disabled={!ready || loading} activeOpacity={0.86}>
          <Text style={styles.joinText}>{loading ? '...' : 'GO'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.back} onPress={onCancel} activeOpacity={0.86}>
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg, justifyContent: 'center', padding: 18 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panel,
    padding: 18,
    alignItems: 'center',
  },
  head: { color: palette.primary, fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1.2 },
  input: {
    width: '100%',
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.bgAlt,
    paddingVertical: 12,
    textAlign: 'center',
    color: palette.text,
    fontFamily: fonts.mono,
    fontSize: 34,
    letterSpacing: 8,
  },
  inputReady: { borderColor: 'rgba(106, 245, 211, 0.6)' },
  err: { marginTop: 8, color: palette.danger, fontFamily: fonts.body, fontSize: 13 },
  join: {
    marginTop: 10,
    width: '100%',
    borderRadius: 12,
    backgroundColor: palette.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  joinOff: { backgroundColor: 'rgba(121, 139, 177, 0.45)' },
  joinText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 26 },
  back: {
    marginTop: 8,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.bgAlt,
    paddingVertical: 10,
    alignItems: 'center',
  },
  backText: { color: palette.muted, fontFamily: fonts.body, fontSize: 14 },
});
