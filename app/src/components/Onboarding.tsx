import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts, palette, fs } from '../theme/ui';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = 'taprush_onboarded';

const SLIDES = [
  {
    emoji: '⚡',
    title: 'Bet & Play',
    desc: 'Start with 100 free credits. Choose from 5 games — PvP TapRush, Coin Flip, Dice, Mines, or Crash.',
    color: '#FF2D6F',
  },
  {
    emoji: '🎲',
    title: 'Seeker Native',
    desc: 'Shake your phone to roll dice. Built for the Solana Seeker with hardware-integrated gameplay.',
    color: '#06D6A0',
  },
  {
    emoji: '⛓',
    title: 'Provably Fair',
    desc: 'Every game outcome is committed to Solana before your bet. Verify any result on-chain — no trust needed.',
    color: '#A855F7',
  },
];

interface Props {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setCurrentSlide(currentSlide + 1);
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    } else {
      AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});
      onComplete();
    }
  };

  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={[styles.title, { color: slide.color }]}>{slide.title}</Text>
        <Text style={styles.desc}>{slide.desc}</Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentSlide && { backgroundColor: slide.color, width: 20 }]} />
          ))}
        </View>

        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: slide.color }]} onPress={handleNext} activeOpacity={0.86}>
          <Text style={styles.nextText}>{isLast ? 'START PLAYING' : 'NEXT'}</Text>
        </TouchableOpacity>

        {!isLast && (
          <TouchableOpacity onPress={() => {
            AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});
            onComplete();
          }}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export async function shouldShowOnboarding(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_KEY);
    return val !== 'true';
  } catch {
    return true;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: palette.bg, justifyContent: 'center', alignItems: 'center', padding: 28,
  },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  emoji: { fontSize: fs(80), marginBottom: 20 },
  title: { fontFamily: fonts.display, fontSize: fs(36), textAlign: 'center' },
  desc: {
    color: palette.text, fontFamily: fonts.body, fontSize: fs(16), textAlign: 'center',
    marginTop: 12, lineHeight: 24, paddingHorizontal: 10,
  },
  footer: { width: '100%', alignItems: 'center', paddingBottom: 20 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: palette.muted,
  },
  nextBtn: {
    width: '100%', borderRadius: 24, paddingVertical: 16, alignItems: 'center',
    shadowColor: palette.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  nextText: { color: palette.buttonText, fontFamily: fonts.display, fontSize: fs(20) },
  skipText: { color: palette.muted, fontFamily: fonts.mono, fontSize: fs(13), marginTop: 16 },
});
