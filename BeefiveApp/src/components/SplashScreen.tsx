import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SplashScreenProps {
  onComplete: () => void;
}

type SplashPhase = 'mindg' | 'logo' | 'loading';

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<SplashPhase>('mindg');
  const [fadeAnim] = useState(new Animated.Value(1));
  
  // Scale animation for MindG image (starts small, expands to full width)
  const mindgScaleAnim = useRef(new Animated.Value(0.1)).current;
  
  // Spin and scale animation for Bee-Five logo
  const logoSpinAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.1)).current;
  
  // Reset animations when component mounts (for when shown again)
  useEffect(() => {
    setPhase('mindg');
    fadeAnim.setValue(1);
    mindgScaleAnim.setValue(0.1);
    logoSpinAnim.setValue(0);
    logoScaleAnim.setValue(0.1);
    
    // Start animations after reset
    // Phase 1: MindG logo for 5 seconds
    // Start with scale animation (small to full width)
    Animated.timing(mindgScaleAnim, {
      toValue: 1,
      duration: 2000, // Expand over 2 seconds
      useNativeDriver: true,
    }).start();
    
    // Transition to logo phase after 5 seconds
    const mindgTimer = setTimeout(() => {
      setPhase('logo');
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
      // Start logo spin and scale animations when logo phase begins
      logoSpinAnim.setValue(0);
      logoScaleAnim.setValue(0.1);
      
      // Spin animation (multiple rotations)
      Animated.parallel([
        Animated.timing(logoSpinAnim, {
          toValue: 4, // 4 full rotations (1440 degrees)
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(logoScaleAnim, {
          toValue: 1, // Scale from small to full width
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start();
    }, 5000);
    
    // Phase 3: Transition to loading after logo phase (at 10 seconds)
    const loadingTransitionTimer = setTimeout(() => {
      setPhase('loading');
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 10000);

    // Phase 3: Loading for 2 seconds, then complete (at 12 seconds)
    const loadingTimer = setTimeout(() => {
      onComplete();
    }, 12000);

    return () => {
      clearTimeout(mindgTimer);
      clearTimeout(loadingTransitionTimer);
      clearTimeout(loadingTimer);
    };
  }, [onComplete, fadeAnim, mindgScaleAnim, logoSpinAnim, logoScaleAnim]);

  // Interpolations
  const mindgScale = mindgScaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 1],
  });
  
  const logoSpin = logoSpinAnim.interpolate({
    inputRange: [0, 4],
    outputRange: ['0deg', '1440deg'], // 4 full rotations
  });
  
  const logoScale = logoScaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 1],
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {phase === 'mindg' && (
          <View style={styles.mindgContainer}>
            <Text style={styles.productOfText}>A product of</Text>
            <Animated.View
              style={[
                styles.mindgImageContainer,
                {
                  transform: [{ scale: mindgScale }],
                },
              ]}
            >
              <Image
                source={require('../assets/MindG.jpg')}
                style={styles.mindgImage}
                resizeMode="contain"
              />
            </Animated.View>
          </View>
        )}

        {phase === 'logo' && (
          <View style={styles.logoContainer}>
            <Animated.View
              style={[
                styles.logoImageContainer,
                {
                  transform: [
                    { rotate: logoSpin },
                    { scale: logoScale },
                  ],
                },
              ]}
            >
              <Image
                source={require('../assets/BEE-FIVE.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>
            <Text style={styles.beeFiveText}>Bee-Five</Text>
          </View>
        )}

        {phase === 'loading' && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFC30B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  mindgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 20,
  },
  productOfText: {
    fontSize: 18,
    color: '#000',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  mindgImageContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  mindgImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1, // Maintain square aspect ratio, adjust if needed
    maxHeight: '70%',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 20,
  },
  logoImageContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1, // Maintain square aspect ratio, adjust if needed
    maxHeight: '70%',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  loadingText: {
    fontSize: 24,
    color: '#000',
    fontWeight: 'bold',
  },
  beeFiveText: {
    fontSize: 32,
    color: '#000',
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
});

