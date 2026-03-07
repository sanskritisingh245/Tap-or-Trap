import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, palette } from '../theme/ui';

interface AmbientBackgroundProps {
  tone?: 'cool' | 'warm' | 'danger';
}

export function AmbientBackground({ tone = 'cool' }: AmbientBackgroundProps) {
  const toneGradient = gradients[tone] as [string, string, string];

  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={styles.base} />
      <LinearGradient
        colors={[palette.bgAlt, palette.bg, palette.bg]}
        style={styles.fill}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <LinearGradient
        colors={toneGradient}
        style={styles.highlight}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.8 }}
      />
      <View style={styles.vignette} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
  base: { ...StyleSheet.absoluteFillObject, backgroundColor: palette.bg },
  fill: { ...StyleSheet.absoluteFillObject },
  highlight: { ...StyleSheet.absoluteFillObject, opacity: 0.85 },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,8,16,0.14)',
  },
});
