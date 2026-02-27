import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

interface RoomCreatorProps {
  roomCode: string;
  onCancel: () => void;
}

export function RoomCreator({ roomCode, onCancel }: RoomCreatorProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    const dots = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    dots.start();
    return () => { pulse.stop(); dots.stop(); };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>👥</Text>
      <Text style={styles.label}>Share this code with your friend</Text>

      <Animated.View style={[styles.codeCard, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.codeLabel}>ROOM CODE</Text>
        <Text style={styles.code}>{roomCode}</Text>
      </Animated.View>

      <View style={styles.waitingRow}>
        <Animated.View style={[styles.waitingDot, { opacity: dotAnim }]} />
        <Text style={styles.waitingText}>Waiting for opponent...</Text>
      </View>

      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  label: {
    color: '#7B7BA0',
    fontSize: 16,
    marginBottom: 28,
    textAlign: 'center',
  },
  codeCard: {
    backgroundColor: 'rgba(20, 241, 149, 0.08)',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 48,
    borderWidth: 2,
    borderColor: 'rgba(20, 241, 149, 0.3)',
    alignItems: 'center',
  },
  codeLabel: {
    color: '#7B7BA0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  code: {
    color: '#14F195',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 10,
    fontFamily: 'monospace',
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
  },
  waitingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9945FF',
    marginRight: 10,
  },
  waitingText: {
    color: '#7B7BA0',
    fontSize: 16,
  },
  cancelBtn: {
    marginTop: 48,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.4)',
  },
  cancelText: {
    color: '#FF6666',
    fontSize: 16,
    fontWeight: '600',
  },
});
