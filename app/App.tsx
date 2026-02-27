import React from 'react';
import { Platform, View, Text, StyleSheet, StatusBar } from 'react-native';
import GameScreen from './src/screens/GameScreen';
import { palette, fonts } from './src/theme/ui';

export default function App() {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedKicker}>SNAPDUEL</Text>
        <Text style={styles.blockedTitle}>Mobile Device Required</Text>
        <Text style={styles.blockedText}>Open the app on iOS or Android to play motion-powered duels.</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={palette.bg} />
      <GameScreen />
    </>
  );
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    backgroundColor: palette.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  blockedKicker: {
    color: palette.primary,
    fontFamily: fonts.mono,
    letterSpacing: 1.5,
    fontSize: 12,
  },
  blockedTitle: {
    color: palette.text,
    fontFamily: fonts.display,
    fontSize: 34,
    marginTop: 8,
    textAlign: 'center',
  },
  blockedText: {
    color: palette.muted,
    fontFamily: fonts.body,
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
});
