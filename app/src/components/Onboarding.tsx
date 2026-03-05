import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts, palette, shadows } from '../theme/ui';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = 'taprush_onboarded';

const SLIDES = [
  {
    emoji: '⚡',
    title: 'Bet & Play',
    desc: 'Start with free credits. Jump into TapRush, Coin Flip, Dice, Mines, and Crash.',
    color: '#3B82F6',
    gradient: ['rgba(59,130,246,0.12)', 'rgba(59,130,246,0.03)', 'transparent'] as [string, string, string],
  },
  {
    emoji: '🎲',
    title: 'Built for Mobile',
    desc: 'Shake to roll, tap to react, and play fast with controls tuned for real-time betting.',
    color: '#60A5FA',
    gradient: ['rgba(96,165,250,0.12)', 'rgba(96,165,250,0.03)', 'transparent'] as [string, string, string],
  },
  {
    emoji: '⛓',
    title: 'Provably Fair',
    desc: 'Every outcome is committed before you bet and can be verified after the round.',
    color: '#B983FF',
    gradient: ['rgba(167,139,250,0.12)', 'rgba(167,139,250,0.03)', 'transparent'] as [string, string, string],
  },
];

interface Props {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const emojiScale = useRef(new Animated.Value(0.6)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    emojiScale.setValue(0.6);
    Animated.spring(emojiScale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
  }, [currentSlide]);

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
      <LinearGradient
        colors={slide.gradient}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0.3 }}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Animated.Text style={[styles.emoji, { transform: [{ scale: emojiScale }] }]}>
          {slide.emoji}
        </Animated.Text>
        <Text style={[styles.title, { color: slide.color }]}>{slide.title}</Text>
        <Text style={styles.desc}>{slide.desc}</Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentSlide && {
                  backgroundColor: slide.color,
                  width: 20,
                  ...shadows.glow(slide.color),
                },
              ]}
            />
          ))}
        </View>

        <Pressable
          onPress={handleNext}
          onPressIn={() => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
          onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
        >
          <Animated.View style={{ transform: [{ scale: btnScale }], width: width - 48 }}>
            <LinearGradient
              colors={[slide.color, slide.color + 'CC'] as [string, string]}
              style={[styles.nextBtn, shadows.glow(slide.color)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>

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
    flex: 1, backgroundColor: '#0F212E', justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  content: { alignItems: 'center', paddingHorizontal: 20 },
  emoji: { fontSize: 72, marginBottom: 24 },
  title: { fontFamily: fonts.display, fontSize: 34, textAlign: 'center' },
  desc: {
    color: 'rgba(255,255,255,0.60)', fontFamily: fonts.light, fontSize: 17, textAlign: 'center',
    marginTop: 12, lineHeight: 24,
  },
  footer: { position: 'absolute', bottom: 60, left: 24, right: 24, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)',
  },
  nextBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  nextText: { color: '#0F212E', fontFamily: fonts.display, fontSize: 17 },
  skipText: { color: 'rgba(255,255,255,0.36)', fontFamily: fonts.body, fontSize: 15, marginTop: 16 },
});
