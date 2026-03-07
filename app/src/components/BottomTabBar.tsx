import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { fonts, palette } from '../theme/ui';

const TABS = [
  { key: 'home', label: 'Home', glyph: '●' },
  { key: 'missions', label: 'Rewards', glyph: '◆' },
] as const;

interface BottomTabBarProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
}

function TabItem({ tab, active, onPress }: { tab: typeof TABS[number]; active: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.85, useNativeDriver: true, damping: 15, stiffness: 400 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 400 }).start()}
    >
      <Animated.View style={[styles.tabInner, active && styles.tabActive, { transform: [{ scale }] }]}>
        <Text style={[styles.glyph, active && styles.glyphActive]}>{tab.glyph}</Text>
        <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function BottomTabBar({ activeTab, onTabPress }: BottomTabBarProps) {
  return (
    <BlurView intensity={60} tint="dark" style={styles.blur}>
      <View style={styles.border} />
      <View style={styles.container}>
        {TABS.map(tab => (
          <TabItem
            key={tab.key}
            tab={tab}
            active={activeTab === tab.key}
            onPress={() => onTabPress(tab.key)}
          />
        ))}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    paddingBottom: 34,
    backgroundColor: 'rgba(15,33,46,0.85)',
  },
  border: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  container: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabInner: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: 'rgba(59,130,246,0.06)',
  },
  glyph: {
    color: 'rgba(255,255,255,0.30)',
    fontFamily: fonts.display,
    fontSize: 16,
    lineHeight: 18,
  },
  glyphActive: {
    color: palette.primary,
  },
  label: {
    color: 'rgba(255,255,255,0.30)',
    fontFamily: fonts.body,
    fontSize: 10,
    marginTop: 2,
  },
  labelActive: {
    color: palette.primary,
  },
});
