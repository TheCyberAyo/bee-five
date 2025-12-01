/**
 * Bee-Five React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SimpleWelcome from './src/components/SimpleWelcome';
import { initializeAdMediator } from './src/services/adMediator';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Initialize Ad Mediator on app start
  useEffect(() => {
    initializeAdMediator({
      testMode: __DEV__,
      performanceTrackingEnabled: true,
      autoOptimizeEnabled: true,
    }).catch((error) => {
      console.error('Failed to initialize ad mediator:', error);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SimpleWelcome />
    </SafeAreaProvider>
  );
}

export default App;
