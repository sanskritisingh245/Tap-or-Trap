import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Share, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../theme/ui';

interface RoomCreatorProps {
  roomCode: string;
  onCancel: () => void;
}

export function RoomCreator({ roomCode, onCancel }: RoomCreatorProps) {
  const pulse = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.04, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(dotAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my TapRush duel! Enter code: ${roomCode}`,
      });
    } catch {}
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8DDCF', '#D8CCC0', '#8A8795', '#23283F']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Animated.View style={[styles.waitDot, { opacity: dotAnim }]} />
          <Text style={styles.head}>WAITING FOR OPPONENT</Text>
        </View>

        <Text style={styles.label}>Share this code with your friend</Text>

        <Animated.View style={{ transform: [{ scale: pulse }], width: '100%' }}>
          <View style={styles.codeCard}>
            <Text style={styles.code}>{roomCode}</Text>
          </View>
        </Animated.View>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
          <LinearGradient
            colors={['#2E3762', '#1E2847']}
            style={styles.shareBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="share-outline" size={18} color="#62EBFF" />
            <Text style={styles.shareBtnText}>SHARE CODE</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.hint}>Room expires in 2 minutes</Text>

        <TouchableOpacity style={styles.cancel} onPress={onCancel} activeOpacity={0.86}>
          <Text style={styles.cancelText}>CANCEL</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  waitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#62EBFF',
  },
  head: {
    color: '#EED8B6',
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  label: {
    color: 'rgba(237,232,227,0.6)',
    fontFamily: fonts.body,
    fontSize: 14,
    marginBottom: 16,
  },
  codeCard: {
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(98,235,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(98,235,255,0.25)',
  },
  code: {
    color: '#62EBFF',
    fontFamily: fonts.mono,
    fontSize: 46,
    letterSpacing: 8,
  },
  shareBtn: {
    marginTop: 14,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(107,110,207,0.5)',
  },
  shareBtnText: {
    color: '#EED8B6',
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  hint: {
    marginTop: 12,
    color: 'rgba(237,232,227,0.35)',
    fontFamily: fonts.body,
    fontSize: 12,
  },
  cancel: {
    marginTop: 14,
    width: '100%',
    borderRadius: 12,
    backgroundColor: 'rgba(255,71,87,0.12)',
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,71,87,0.25)',
  },
  cancelText: { color: '#FF4757', fontFamily: fonts.display, fontSize: 18 },
});
