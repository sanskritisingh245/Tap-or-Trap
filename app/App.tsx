import React, { useState, useEffect } from 'react';
import { Platform, View, Text, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { useFonts, Quicksand_700Bold, Quicksand_500Medium, Quicksand_600SemiBold } from '@expo-google-fonts/quicksand';
import { JetBrainsMono_300Light } from '@expo-google-fonts/jetbrains-mono';
import GameScreen from './src/screens/GameScreen';
import HomeScreen from './src/screens/HomeScreen';
import CoinFlipScreen from './src/screens/CoinFlipScreen';
import DiceScreen from './src/screens/DiceScreen';
import MinesScreen from './src/screens/MinesScreen';
import CrashScreen from './src/screens/CrashScreen';
import FairnessScreen from './src/screens/FairnessScreen';
import MissionsScreen from './src/screens/MissionsScreen';
import LiveBetsScreen from './src/screens/LiveBetsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { Onboarding, shouldShowOnboarding } from './src/components/Onboarding';
import { BottomTabBar } from './src/components/BottomTabBar';
import { useWallet } from './src/hooks/useWallet';
import { palette, fonts, fs } from './src/theme/ui';

export type Screen = 'home' | 'taprush' | 'coinflip' | 'dice' | 'mines' | 'crash' | 'fairness' | 'missions' | 'livebets' | 'settings';

const TAB_SCREENS: Screen[] = ['home', 'missions', 'fairness', 'livebets', 'settings'];

export default function App() {
  const [fontsLoaded] = useFonts({
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    JetBrainsMono_300Light,
  });
  const wallet = useWallet();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    shouldShowOnboarding().then(show => {
      setShowOnboarding(show);
      setOnboardingChecked(true);
    });
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.blocked}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedKicker}>TAPRUSH</Text>
        <Text style={styles.blockedTitle}>Mobile Device Required</Text>
        <Text style={styles.blockedText}>Open the app on iOS or Android to play.</Text>
      </View>
    );
  }

  const goHome = () => setCurrentScreen('home');

  if (!onboardingChecked) return null;

  if (showOnboarding) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor={palette.bg} />
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      </>
    );
  }

  const showTabBar = wallet.connected && TAB_SCREENS.includes(currentScreen);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={palette.bg} />
      <View style={styles.content}>
        {currentScreen === 'home' && <HomeScreen onNavigate={setCurrentScreen} wallet={wallet} />}
        {currentScreen === 'taprush' && <GameScreen onBack={goHome} />}
        {currentScreen === 'coinflip' && <CoinFlipScreen onBack={goHome} />}
        {currentScreen === 'dice' && <DiceScreen onBack={goHome} />}
        {currentScreen === 'mines' && <MinesScreen onBack={goHome} />}
        {currentScreen === 'crash' && <CrashScreen onBack={goHome} />}
        {currentScreen === 'fairness' && <FairnessScreen onBack={goHome} />}
        {currentScreen === 'missions' && <MissionsScreen />}
        {currentScreen === 'livebets' && <LiveBetsScreen />}
        {currentScreen === 'settings' && (
          <SettingsScreen wallet={wallet} onNavigate={(s) => setCurrentScreen(s as Screen)} />
        )}
      </View>
      {showTabBar && (
        <BottomTabBar
          activeTab={currentScreen}
          onTabPress={(tab) => setCurrentScreen(tab as Screen)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
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
    fontSize: fs(12),
  },
  blockedTitle: {
    color: palette.text,
    fontFamily: fonts.display,
    fontSize: fs(34),
    marginTop: 8,
    textAlign: 'center',
  },
  blockedText: {
    color: palette.muted,
    fontFamily: fonts.body,
    fontSize: fs(16),
    marginTop: 12,
    textAlign: 'center',
  },
});
