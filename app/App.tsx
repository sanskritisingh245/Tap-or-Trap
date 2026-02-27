import React from 'react';
import { Platform, View, Text, StyleSheet, StatusBar } from 'react-native';
import GameScreen from './src/screens/GameScreen';

export default function App() {
  // Mobile-only enforcement: block web/desktop
  if (Platform.OS === 'web') {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedTitle}>Mobile Only</Text>
        <Text style={styles.blockedText}>
          SnapDuel is a mobile-only game. Please open this app on your phone.
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <GameScreen />
    </>
  );
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  blockedTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
  },
  blockedText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
});
