import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, fs } from '../theme/ui';
import type { Tier } from '../services/api';

const TIER_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  BRONZE:  { icon: 'shield', color: '#CD7F32', label: 'BRONZE' },
  SILVER:  { icon: 'medal', color: '#C0C0C0', label: 'SILVER' },
  GOLD:    { icon: 'trophy', color: '#FFD700', label: 'GOLD' },
  DIAMOND: { icon: 'diamond', color: '#B9F2FF', label: 'DIAMOND' },
  PHANTOM: { icon: 'flame', color: '#9945FF', label: 'PHANTOM' },
};

interface TierBadgeProps {
  tier: Tier | string;
  size?: 'small' | 'large';
}

export function TierBadge({ tier, size = 'small' }: TierBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.BRONZE;
  const isLarge = size === 'large';
  const iconSize = isLarge ? 18 : 12;

  return (
    <View style={[styles.badge, { borderColor: config.color }, isLarge && styles.badgeLarge]}>
      <Ionicons name={config.icon} size={iconSize} color={config.color} />
      <Text style={[styles.label, { color: config.color }, isLarge && styles.labelLarge]}>{config.label}</Text>
    </View>
  );
}

export function getTierColor(tier: string): string {
  return TIER_CONFIG[tier]?.color || '#CD7F32';
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  badgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  label: { fontFamily: fonts.mono, fontSize: fs(10) },
  labelLarge: { fontSize: fs(14) },
});
