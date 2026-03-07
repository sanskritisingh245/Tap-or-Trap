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
          <LinearGradient colors={[palette.primary, palette.primaryStrong]} style={styles.mainBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
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
    borderColor: palette.panelStroke,
    backgroundColor: palette.panel,
    padding: 20,
    alignItems: 'center',
    ...shadows.medium,
  },
  head: { color: palette.text, fontFamily: fonts.display, fontSize: 24, marginBottom: 12 },
  codeWrap: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.primary,
    backgroundColor: palette.fillPrimary,
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 12,
  },
  code: { color: palette.primary, fontFamily: fonts.mono, fontSize: 44, letterSpacing: 8 },
  mainBtnWrap: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  mainBtn: { paddingVertical: 14, alignItems: 'center' },
  mainText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: 18 },
  cancel: {
    marginTop: 10,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.panelStroke,
    backgroundColor: palette.panelSoft,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: { color: palette.muted, fontFamily: fonts.body, fontSize: 14 },
});
