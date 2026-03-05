import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../theme/ui';
import type { Tier } from '../services/api';

const TIER_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  BRONZE:  { color: '#CD7F32', label: 'Bronze', icon: '🛡' },
  SILVER:  { color: '#A8B0B5', label: 'Silver', icon: '⚔️' },
  GOLD:    { color: '#FFB800', label: 'Gold', icon: '⭐' },
  DIAMOND: { color: '#60A5FA', label: 'Diamond', icon: '💎' },
  PHANTOM: { color: '#B983FF', label: 'Phantom', icon: '👻' },
};

interface TierBadgeProps {
  tier: Tier | string;
  size?: 'small' | 'large';
}

export function TierBadge({ tier, size = 'small' }: TierBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.BRONZE;
  const isLarge = size === 'large';

  return (
    <LinearGradient
      colors={[config.color + '20', config.color + '08'] as [string, string]}
      style={[styles.badge, isLarge && styles.badgeLarge]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
    >
      <Text style={[styles.icon, isLarge && styles.iconLarge]}>{config.icon}</Text>
      <Text style={[styles.label, { color: config.color }, isLarge && styles.labelLarge]}>{config.label}</Text>
    </LinearGradient>
  );
}

export function getTierColor(tier: string): string {
  return TIER_CONFIG[tier]?.color || '#CD7F32';
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  badgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  icon: { fontSize: 12 },
  iconLarge: { fontSize: 16 },
  label: { fontFamily: fonts.body, fontSize: 12 },
  labelLarge: { fontSize: 15 },
});
