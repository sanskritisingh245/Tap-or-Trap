import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '../theme/ui';
import type { Tier } from '../services/api';

const TIER_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  BRONZE:  { emoji: '🥉', color: '#CD7F32', label: 'BRONZE' },
  SILVER:  { emoji: '🥈', color: '#C0C0C0', label: 'SILVER' },
  GOLD:    { emoji: '🥇', color: '#FFD700', label: 'GOLD' },
  DIAMOND: { emoji: '💎', color: '#B9F2FF', label: 'DIAMOND' },
  PHANTOM: { emoji: '👻', color: '#9945FF', label: 'PHANTOM' },
};

interface TierBadgeProps {
  tier: Tier | string;
  size?: 'small' | 'large';
}

export function TierBadge({ tier, size = 'small' }: TierBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.BRONZE;
  const isLarge = size === 'large';

  return (
    <View style={[styles.badge, { borderColor: config.color }, isLarge && styles.badgeLarge]}>
      <Text style={isLarge ? styles.emojiLarge : styles.emoji}>{config.emoji}</Text>
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
  emoji: { fontSize: 12 },
  emojiLarge: { fontSize: 20 },
  label: { fontFamily: fonts.mono, fontSize: 10 },
  labelLarge: { fontSize: 14 },
});
