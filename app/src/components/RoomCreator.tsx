import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { AmbientBackground } from './AmbientBackground';
import { fonts, palette, fs } from '../theme/ui';

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
    borderRadius: 22,
    borderWidth: 0,
    backgroundColor: palette.panel,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  head: { color: palette.warning, fontFamily: fonts.mono, fontSize: fs(12), letterSpacing: 1.2 },
  codeCard: {
    marginTop: 12,
    width: '100%',
    borderRadius: 18,
    backgroundColor: palette.panelSoft,
    borderWidth: 0,
    alignItems: 'center',
    paddingVertical: 18,
  },
  code: { color: palette.primaryStrong, fontFamily: fonts.mono, fontSize: fs(46), letterSpacing: 8 },
  wait: { marginTop: 12, color: palette.text, fontFamily: fonts.body, fontSize: fs(16) },
  cancel: {
    marginTop: 14,
    width: '100%',
    borderRadius: 20,
    borderWidth: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: { color: palette.danger, fontFamily: fonts.display, fontSize: fs(18) },
});
