import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from './AmbientBackground';
import { fonts, palette, shadows } from '../theme/ui';

interface RoomCreatorProps {
  roomCode: string;
  onCancel: () => void;
}

export function RoomCreator({ roomCode, onCancel }: RoomCreatorProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.04, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.container}>
      <AmbientBackground tone="warm" />
      <View style={styles.card}>
        <Text style={styles.head}>ROOM</Text>
        <Animated.View style={{ transform: [{ scale: pulse }], width: '100%' }}>
          <LinearGradient
            colors={[palette.primaryStrong + '18', palette.primaryStrong + '08']}
            style={styles.codeCard}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={styles.code}>{roomCode}</Text>
          </LinearGradient>
        </Animated.View>
        <Text style={styles.wait}>waiting...</Text>
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
    borderRadius: 14, backgroundColor: palette.panel, padding: 22, alignItems: 'center',
    ...shadows.medium,
  },
  head: { color: palette.warning, fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1.2 },
  codeCard: {
    marginTop: 12, borderRadius: 18, alignItems: 'center', paddingVertical: 18,
  },
  code: { color: palette.primaryStrong, fontFamily: fonts.mono, fontSize: 46, letterSpacing: 8 },
  wait: { marginTop: 12, color: palette.text, fontFamily: fonts.body, fontSize: 16 },
  cancel: {
    marginTop: 14, width: '100%', borderRadius: 12,
    backgroundColor: 'rgba(255,71,87,0.16)', paddingVertical: 12, alignItems: 'center',
  },
  cancelText: { color: palette.danger, fontFamily: fonts.display, fontSize: 18 },
});
