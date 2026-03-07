import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, palette, shadows } from '../theme/ui';

interface RoomCreatorProps {
  roomCode: string;
  onCancel: () => void;
}

export function RoomCreator({ roomCode, onCancel }: RoomCreatorProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const onShare = async () => {
    try {
      await Share.share({ message: `Join my TapRush room: ${roomCode}` });
    } catch {}
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[palette.bgAlt, palette.bg]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={styles.card}>
        <Text style={styles.head}>PRIVATE ROOM</Text>
        <Animated.View style={[styles.codeWrap, { transform: [{ scale: pulse }] }]}>
          <Text style={styles.code}>{roomCode}</Text>
        </Animated.View>
        <TouchableOpacity style={styles.mainBtnWrap} onPress={onShare} activeOpacity={0.88}>
          <LinearGradient colors={['#2A355C', '#132144']} style={styles.mainBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.mainText}>SHARE CODE</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancel} onPress={onCancel} activeOpacity={0.85}>
          <Text style={styles.cancelText}>CANCEL</Text>
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
    borderColor: 'rgba(151, 171, 205, 0.26)',
    backgroundColor: 'rgba(22, 34, 54, 0.94)',
    padding: 20,
    alignItems: 'center',
    ...shadows.medium,
  },
  head: { color: '#F2DFC5', fontFamily: fonts.display, fontSize: 24, marginBottom: 12 },
  codeWrap: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(220, 194, 151, 0.5)',
    backgroundColor: 'rgba(231, 210, 175, 0.14)',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 12,
  },
  code: { color: '#F3E2C8', fontFamily: fonts.display, fontSize: 44, letterSpacing: 6 },
  mainBtnWrap: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  mainBtn: { paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(224,198,159,0.4)' },
  mainText: { color: '#F3E2C8', fontFamily: fonts.display, fontSize: 18 },
  cancel: {
    marginTop: 10,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(84, 57, 26, 0.28)',
    backgroundColor: 'rgba(232, 197, 143, 0.9)',
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: { color: '#4D3520', fontFamily: fonts.display, fontSize: 14 },
});
