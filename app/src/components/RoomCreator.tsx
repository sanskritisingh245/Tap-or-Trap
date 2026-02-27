import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { AmbientBackground } from './AmbientBackground';
import { fonts, palette } from '../theme/ui';

interface RoomCreatorProps {
  roomCode: string;
  onCancel: () => void;
}

export function RoomCreator({ roomCode, onCancel }: RoomCreatorProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.container}>
      <AmbientBackground tone="warm" />
      <View style={styles.card}>
        <Text style={styles.head}>ROOM</Text>
        <Animated.View style={[styles.codeCard, { transform: [{ scale: pulse }] }]}>
          <Text style={styles.code}>{roomCode}</Text>
        </Animated.View>
        <Text style={styles.wait}>⏳ waiting...</Text>
        <TouchableOpacity style={styles.cancel} onPress={onCancel} activeOpacity={0.86}>
          <Text style={styles.cancelText}>CANCEL</Text>
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
  head: { color: palette.warning, fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1.2 },
  codeCard: {
    marginTop: 10,
    width: '100%',
    borderRadius: 14,
    backgroundColor: 'rgba(73, 51, 18, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 198, 107, 0.5)',
    alignItems: 'center',
    paddingVertical: 16,
  },
  code: { color: palette.warning, fontFamily: fonts.mono, fontSize: 46, letterSpacing: 8 },
  wait: { marginTop: 12, color: palette.text, fontFamily: fonts.body, fontSize: 16 },
  cancel: {
    marginTop: 14,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 125, 157, 0.55)',
    backgroundColor: 'rgba(74, 23, 41, 0.55)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: { color: palette.danger, fontFamily: fonts.display, fontSize: 18 },
});
