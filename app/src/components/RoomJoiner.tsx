import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../theme/ui';

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
      <LinearGradient
        colors={['#E8DDCF', '#D8CCC0', '#8A8795', '#23283F']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View style={styles.card}>
        <Ionicons name="enter-outline" size={28} color="#DDBA7C" style={{ marginBottom: 4 }} />
        <Text style={styles.head}>JOIN ROOM</Text>
        <Text style={styles.label}>Enter the 6-character code from your friend</Text>
        <TextInput
          style={[styles.input, ready && styles.inputReady]}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase().slice(0, 6))}
          placeholder="A1B2C3"
          placeholderTextColor="rgba(237,225,207,0.25)"
          autoCorrect={false}
          autoCapitalize="characters"
          maxLength={6}
          autoFocus
          selectionColor="#62EBFF"
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
                colors={['#2E3762', '#171E40']}
                style={styles.join}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Text style={styles.joinText}>{loading ? '...' : 'JOIN'}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.join, styles.joinOff]}>
                <Text style={[styles.joinText, { opacity: 0.4 }]}>JOIN</Text>
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
  container: { flex: 1, justifyContent: 'center', padding: 18 },
  card: {
    borderRadius: 16,
    backgroundColor: 'rgba(39,42,59,0.9)',
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  head: {
    color: '#EED8B6',
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 1,
    marginBottom: 4,
  },
  label: {
    color: 'rgba(237,232,227,0.55)',
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 16,
    textAlign: 'center',
    color: '#EDE1CF',
    fontFamily: fonts.mono,
    fontSize: 34,
    letterSpacing: 8,
  },
  inputReady: {
    borderColor: 'rgba(98,235,255,0.5)',
    backgroundColor: 'rgba(98,235,255,0.06)',
  },
  err: { marginTop: 8, color: '#FF4757', fontFamily: fonts.body, fontSize: 13 },
  join: {
    marginTop: 14,
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(107,110,207,0.7)',
  },
  joinOff: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  joinText: { color: '#EED8B6', fontFamily: fonts.display, fontSize: 26 },
  back: {
    marginTop: 10,
    width: '100%',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 11,
    alignItems: 'center',
  },
  backText: { color: 'rgba(237,225,207,0.5)', fontFamily: fonts.body, fontSize: 14 },
});
