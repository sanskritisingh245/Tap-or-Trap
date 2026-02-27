import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { AmbientBackground } from './AmbientBackground';
import { fonts, palette } from '../theme/ui';

interface CountdownRevealProps {
  onComplete: () => void;
}

export function CountdownReveal({ onComplete }: CountdownRevealProps) {
  const [count, setCount] = useState(3);
  const pop = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    pop.setValue(0.8);
    Animated.spring(pop, { toValue: 1, friction: 6, tension: 170, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      if (count === 1) onComplete();
      else setCount((v) => v - 1);
    }, 750);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <View style={styles.container}>
      <AmbientBackground tone="cool" />
      <Animated.Text style={[styles.num, { transform: [{ scale: pop }] }]}>{count}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.bg },
  num: { color: palette.text, fontFamily: fonts.display, fontSize: 140, lineHeight: 142 },
});
