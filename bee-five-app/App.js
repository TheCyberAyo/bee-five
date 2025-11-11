import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Alert } from 'react-native';
// Use Expo Go compatible version (works in Expo Go)
import WelcomePage from './components/WelcomePageExpoGo';
// For Three.js version (requires development build), use:
// import WelcomePage from './components/WelcomePage';

export default function App() {
  const [gameMode, setGameMode] = useState(null);

  const handleGameModeSelect = (mode) => {
    setGameMode(mode);
    // For now, just show an alert. You can implement actual game modes later
    Alert.alert(
      'Game Mode Selected',
      `You selected: ${mode === 'local' ? 'Take Turns' : mode === 'ai' ? 'AI Game' : 'Online Multiplayer'}`,
      [{ text: 'OK', onPress: () => setGameMode(null) }]
    );
  };

  return (
    <View style={styles.container}>
      <WelcomePage onGameModeSelect={handleGameModeSelect} />
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
