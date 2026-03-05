import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from './AmbientBackground';
import { fonts, palette } from '../theme/ui';

const COUNT_COLORS: Record<number, { color: string; glow: string }> = {
  3: { color: '#3B82F6', glow: 'rgba(59,130,246,0.15)' },
  2: { color: '#FFB800', glow: 'rgba(255,184,0,0.15)' },
  1: { color: '#FF4757', glow: 'rgba(255,71,87,0.15)' },
};

interface CountdownRevealProps {
  onComplete: () => void;
}

export function CountdownReveal({ onComplete }: CountdownRevealProps) {
  const [count, setCount] = useState(3);
  const pop = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pop.setValue(0.6);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(pop, { toValue: 1, friction: 6, tension: 170, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => {
      if (count === 1) onComplete();
      else setCount((v) => v - 1);
    }, 750);
    return () => clearTimeout(t);
  }, [count]);

  const cfg = COUNT_COLORS[count] || COUNT_COLORS[3];

  return (
    <View style={styles.container}>
      <AmbientBackground tone="cool" />
      <LinearGradient
        colors={[cfg.glow, 'transparent']}
        style={styles.glow}
        start={{ x: 0.5, y: 0.3 }}
        end={{ x: 0.5, y: 0.8 }}
      />
      <Animated.Text
        style={[
          styles.num,
          {
            color: cfg.color,
            transform: [{ scale: pop }],
            opacity,
            textShadowColor: cfg.glow,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 30,
          },
        ]}
      >
        {count}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.bg },
  glow: { ...StyleSheet.absoluteFillObject },
  num: { fontFamily: fonts.display, fontSize: 140, lineHeight: 142 },
});
