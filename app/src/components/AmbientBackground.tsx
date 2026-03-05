import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, palette } from '../theme/ui';

interface AmbientBackgroundProps {
  tone?: 'cool' | 'warm' | 'danger';
}

export function AmbientBackground({ tone = 'cool' }: AmbientBackgroundProps) {
  const colors = gradients[tone] as [string, string, string];

  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={styles.base} />
      <LinearGradient
        colors={[palette.bg, palette.bgAlt, palette.bg]}
        style={styles.fill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <LinearGradient
        colors={colors}
        style={styles.fill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.7 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
  base:      { ...StyleSheet.absoluteFillObject, backgroundColor: palette.bg },
  fill:      { ...StyleSheet.absoluteFillObject },
});
