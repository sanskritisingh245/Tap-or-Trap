import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { palette } from '../theme/ui';

interface AmbientBackgroundProps {
  tone?: 'cool' | 'warm' | 'danger';
}

export function AmbientBackground({ tone = 'cool' }: AmbientBackgroundProps) {
  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(driftA, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(driftA, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(driftB, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(driftB, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, []);

  const topGlow = tone === 'warm' ? '#F59E0B' : tone === 'danger' ? '#EF4444' : '#FF2D6F';
  const bottomGlow = tone === 'danger' ? '#EF4444' : '#06D6A0';

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.View
        style={[
          styles.glowTop,
          {
            backgroundColor: topGlow,
            transform: [
              { translateX: driftA.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }) },
              { translateY: driftA.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.glowBottom,
          {
            backgroundColor: bottomGlow,
            transform: [
              { translateX: driftB.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) },
              { translateY: driftB.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) },
            ],
          },
        ]}
      />
      <View style={styles.texture} />
      <View style={styles.vignette} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  glowTop: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 180,
    top: -150,
    left: -90,
    opacity: 0.15,
  },
  glowBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    right: -110,
    bottom: -120,
    opacity: 0.12,
  },
  texture: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderColor: 'transparent',
    opacity: 0,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});
