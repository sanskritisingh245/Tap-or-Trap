import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, palette, fs } from '../theme/ui';

const TABS = [
  { key: 'home', label: 'Games', icon: 'game-controller' as const },
  { key: 'missions', label: 'Missions', icon: 'flag' as const },
  { key: 'fairness', label: 'Fair', icon: 'shield-checkmark' as const },
  { key: 'livebets', label: 'Live', icon: 'pulse' as const },
  { key: 'settings', label: 'Settings', icon: 'settings' as const },
] as const;

interface BottomTabBarProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
}

export function BottomTabBar({ activeTab, onTabPress }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {TABS.map(tab => {
        const active = activeTab === tab.key;
        const iconName = active ? tab.icon : `${tab.icon}-outline` as any;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={iconName}
              size={22}
              color={active ? palette.primaryStrong : palette.muted}
            />
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            {active && <View style={styles.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: palette.panel,
    paddingTop: 8,
    paddingBottom: 28,
    borderTopWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: palette.muted,
    fontFamily: fonts.mono,
    fontSize: fs(10),
    marginTop: 2,
  },
  labelActive: {
    color: palette.primaryStrong,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.primaryStrong,
    marginTop: 3,
  },
});
