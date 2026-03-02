import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AmbientBackground } from './AmbientBackground';
import { fonts, palette, fs } from '../theme/ui';

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
          placeholderTextColor="rgba(100, 116, 139, 0.55)"
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
    borderRadius: 22,
    borderWidth: 0,
    backgroundColor: palette.panel,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  head: { color: palette.primaryStrong, fontFamily: fonts.mono, fontSize: fs(12), letterSpacing: 1.2 },
  input: {
    width: '100%',
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panelSoft,
    paddingVertical: 14,
    textAlign: 'center',
    color: palette.text,
    fontFamily: fonts.mono,
    fontSize: fs(34),
    letterSpacing: 8,
  },
  inputReady: { borderColor: palette.primaryStrong },
  err: { marginTop: 8, color: palette.danger, fontFamily: fonts.body, fontSize: fs(13) },
  join: {
    marginTop: 12,
    width: '100%',
    borderRadius: 24,
    backgroundColor: palette.primaryStrong,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: palette.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  joinOff: { backgroundColor: palette.panelStroke, shadowOpacity: 0 },
  joinText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: fs(26) },
  back: {
    marginTop: 8,
    width: '100%',
    borderRadius: 20,
    borderWidth: 0,
    backgroundColor: palette.panelSoft,
    paddingVertical: 10,
    alignItems: 'center',
  },
  backText: { color: palette.muted, fontFamily: fonts.body, fontSize: fs(14) },
});
