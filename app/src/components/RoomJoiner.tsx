import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from './AmbientBackground';
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
  const goBtnScale = useRef(new Animated.Value(1)).current;

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
          placeholderTextColor="rgba(107,122,153,0.55)"
          autoCorrect={false}
          autoCapitalize="characters"
          maxLength={6}
          autoFocus
          selectionColor={palette.primary}
        />
        {error ? <Text style={styles.err}>{error}</Text> : null}

        <Pressable
          style={{ width: '100%' }}
          onPress={() => ready && onJoin(code)}
          disabled={!ready || loading}
          onPressIn={() => Animated.spring(goBtnScale, { toValue: 0.96, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
          onPressOut={() => Animated.spring(goBtnScale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
        >
          <Animated.View style={{ transform: [{ scale: goBtnScale }] }}>
            {ready ? (
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={[styles.join, shadows.glow(palette.primary)]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Text style={styles.joinText}>{loading ? '...' : 'GO'}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.join, styles.joinOff]}>
                <Text style={styles.joinText}>GO</Text>
              </View>
            )}
          </Animated.View>
        </Pressable>

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
    borderRadius: 14, backgroundColor: palette.panel, padding: 22, alignItems: 'center',
    ...shadows.medium,
  },
  head: { color: palette.primaryStrong, fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1.2 },
  input: {
    width: '100%', marginTop: 12, borderRadius: 16,
    borderWidth: 1, borderColor: palette.panelStroke,
    backgroundColor: palette.panelSoft, paddingVertical: 14,
    textAlign: 'center', color: palette.text,
    fontFamily: fonts.mono, fontSize: 34, letterSpacing: 8,
  },
  inputReady: { borderColor: palette.primaryStrong },
  err: { marginTop: 8, color: palette.danger, fontFamily: fonts.body, fontSize: 13 },
  join: {
    marginTop: 12, width: '100%', borderRadius: 14,
    paddingVertical: 12, alignItems: 'center',
  },
  joinOff: { backgroundColor: palette.panelStroke },
  joinText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 26 },
  back: {
    marginTop: 8, width: '100%', borderRadius: 12,
    backgroundColor: palette.panelSoft, paddingVertical: 10, alignItems: 'center',
  },
  backText: { color: palette.muted, fontFamily: fonts.body, fontSize: 14 },
});
