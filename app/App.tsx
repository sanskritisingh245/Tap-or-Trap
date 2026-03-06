import React, { useState, useEffect } from 'react';
import { Platform, View, Text, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import GameScreen from './src/screens/GameScreen';
import HomeScreen from './src/screens/HomeScreen';
import MissionsScreen from './src/screens/MissionsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { Onboarding, shouldShowOnboarding } from './src/components/Onboarding';
import { BottomTabBar } from './src/components/BottomTabBar';
import { useWallet } from './src/hooks/useWallet';
import { palette, fonts } from './src/theme/ui';

export type Screen = 'home' | 'taprush' | 'missions' | 'settings';

const TAB_SCREENS: Screen[] = ['home', 'missions', 'settings'];

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_500Medium,
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
        {currentScreen === 'taprush' && <GameScreen onBack={goHome} wallet={wallet} />}
        {currentScreen === 'missions' && <MissionsScreen />}
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
  root: { flex: 1, backgroundColor: palette.bg },
  content: { flex: 1 },
  blocked: {
    flex: 1,
    backgroundColor: palette.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  blockedKicker: {
    color: palette.muted,
    fontFamily: fonts.mono,
    letterSpacing: 1.5,
    fontSize: 13,
  },
  blockedTitle: {
    color: palette.text,
    fontFamily: fonts.display,
    fontSize: 28,
    marginTop: 8,
    textAlign: 'center',
  },
  blockedText: {
    color: palette.muted,
    fontFamily: fonts.light,
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
});
