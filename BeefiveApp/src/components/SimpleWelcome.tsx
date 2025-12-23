import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Dimensions,
  useColorScheme,
  Animated,
  Linking,
  Alert,
  AppState,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SimpleGame from './SimpleGame';
import ClassicAIGame from './ClassicAIGame';
import AdventureGame from './AdventureGame';
import PrivacyPolicy from './PrivacyPolicy';
import SignInPage from './auth/SignInPage';
import SignUpPage from './auth/SignUpPage';
import ForgotPasswordPage from './auth/ForgotPasswordPage';
import ResetPasswordPage from './auth/ResetPasswordPage';
import SplashScreen from './SplashScreen';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { loadAdventureProgress } from '../services/progressService';
import { playLoginMelody } from '../utils/audioPlayer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isMobile = SCREEN_WIDTH <= 768;

// Adventure stages for map background
const ADVENTURE_STAGES = [
  { name: "The Whispering Egg", games: 1, emoji: '🥚', color: '#FFE4B5', description: "The prophecy of a hero is laid within a golden cell." },
  { name: "Larva of Legends", games: 201, emoji: '🐛', color: '#98FB98', description: "A tiny creature begins its fabled journey of growth." },
  { name: "Chamber of Royal Nectar", games: 401, emoji: '🍯', color: '#FFD700', description: "A mystical hall where power and destiny are forged." },
  { name: "Silken Cocoon of Secrets", games: 601, emoji: '🕸️', color: '#DDA0DD', description: "Spinning a magical shell to transform." },
  { name: "Dreams of the Pupa Realm", games: 801, emoji: '🦋', color: '#87CEEB', description: "Visions of wings and future battles stir inside." },
  { name: "Wings of Dawn", games: 1001, emoji: '🌅', color: '#FFA500', description: "Breaking free and taking the first heroic flight." },
  { name: "Hive of Trials", games: 1201, emoji: '🏠', color: '#90EE90', description: "Training in ancient duties and learning hidden arts." },
  { name: "Trails of Golden Pollen", games: 1401, emoji: '🌻', color: '#FFC30B', description: "Quests across wildflower kingdoms to gather treasure." },
  { name: "Sentinel of the Hiveheart", games: 1601, emoji: '🛡️', color: '#B0C4DE', description: "Standing guard against dark invaders." },
  { name: "Crown of the Queen-Bee", games: 1801, emoji: '👑', color: '#FF69B4', description: "Ascend the throne, lead the swarm, or begin a new dynasty." },
];

const TOTAL_GAMES = 2000;

type GameMode = 
  | 'menu' 
  | 'ai-game' 
  | 'adventure-game' 
  | 'local-multiplayer' 
  | 'about-us' 
  | 'how-to-play' 
  | 'news-updates' 
  | 'privacy-policy' 
  | 'settings' 
  | 'profile' 
  | 'contact-us'
  | 'sign-in'
  | 'sign-up'
  | 'forgot-password'
  | 'reset-password'
  | 'splash';

export default function SimpleWelcome() {
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiTimer, setAiTimer] = useState<number>(15);
  const [backgroundColor, setBackgroundColor] = useState<'yellow' | 'black'>('yellow');
  const [hasShownSplash, setHasShownSplash] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const lastBackgroundTimeRef = useRef<number | null>(null);
  
  // Adventure game state for map
  const [currentGame, setCurrentGame] = useState(1);
  const [gamesCompleted, setGamesCompleted] = useState<number[]>([]);
  const [highestUnlockedGame, setHighestUnlockedGame] = useState(1); // Always at least 1 (game 1 is always unlocked)
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [mapScrollY, setMapScrollY] = useState(0);
  const mapScrollViewRef = useRef<ScrollView>(null);
  
  const { user, signOut, loading } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Animated bees - MUST be declared before any early returns to follow Rules of Hooks
  const bee1X = useRef(new Animated.Value(0)).current;
  const bee1Y = useRef(new Animated.Value(0)).current;
  const bee1ScaleX = useRef(new Animated.Value(1)).current; // For left/right facing
  
  const bee2X = useRef(new Animated.Value(0)).current;
  const bee2Y = useRef(new Animated.Value(0)).current;
  const bee2ScaleX = useRef(new Animated.Value(1)).current; // For left/right facing
  
  const bee3X = useRef(new Animated.Value(0)).current;
  const bee3Y = useRef(new Animated.Value(0)).current;
  const bee3ScaleX = useRef(new Animated.Value(1)).current; // For left/right facing

  // Track previous user state to detect sign-in
  const prevUserRef = useRef<string | null>(null);
  
  // Track app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        if (user && (gameMode === 'menu' || gameMode === 'splash')) {
          // User is logged in, show splash screen sequence when returning to app
          // Reset splash flag to allow it to show again
          setHasShownSplash(false);
          setGameMode('splash');
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        lastBackgroundTimeRef.current = Date.now();
      }
      
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user, gameMode]);
  
  // Load adventure progress when user is logged in
  useEffect(() => {
    const loadProgress = async () => {
      if (user && !progressLoaded && gameMode === 'menu') {
        try {
          const progress = await loadAdventureProgress(user.id);
          if (progress) {
            const loadedCurrentGame = progress.current_game || 1;
            const loadedHighestUnlocked = progress.highest_unlocked_game || 1;
            setCurrentGame(loadedCurrentGame);
            setGamesCompleted(progress.games_completed || []);
            // Ensure highestUnlockedGame is at least currentGame and at least 1 (game 1 is always unlocked)
            setHighestUnlockedGame(Math.max(1, loadedHighestUnlocked, loadedCurrentGame));
          }
          setProgressLoaded(true);
        } catch (error) {
          console.error('Failed to load adventure progress:', error);
          setProgressLoaded(true);
        }
      }
    };
    loadProgress();
  }, [user, progressLoaded, gameMode]);

  // Auto-scroll to current game when map loads or currentGame changes
  useEffect(() => {
    if (isMobile && gameMode === 'menu' && mapScrollViewRef.current && progressLoaded) {
      const spacing = isMobile ? 60 : 80;
      const totalHeight = TOTAL_GAMES * spacing * 0.2;
      
      // Calculate the Y position of the current game (from bottom to top)
      const gameIndex = currentGame - 1;
      const gameY = totalHeight - (gameIndex * spacing);
      
      // Calculate minimum scroll position based on highest unlocked game
      const highestGameIndex = highestUnlockedGame - 1;
      const highestGameY = totalHeight - (highestGameIndex * spacing);
      const minScrollY = Math.max(0, highestGameY);
      
      // Scroll to position the current game in the center of the viewport
      // But ensure we don't scroll above the highest unlocked game
      const desiredScrollY = Math.max(0, gameY - SCREEN_HEIGHT / 2);
      const scrollToY = Math.max(desiredScrollY, minScrollY);
      
      // Use timeout to ensure the ScrollView is fully rendered
      const timeoutId = setTimeout(() => {
        if (mapScrollViewRef.current) {
          mapScrollViewRef.current.scrollTo({
            y: scrollToY,
            animated: true,
          });
        }
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentGame, progressLoaded, gameMode, isMobile, highestUnlockedGame]);

  // Check authentication state and redirect to sign in if not logged in
  useEffect(() => {
    if (!loading && !user && gameMode === 'menu') {
      // User is not logged in, show sign in page
      setGameMode('sign-in');
      setHasShownSplash(false); // Reset splash flag when user logs out
      prevUserRef.current = null;
      setProgressLoaded(false);
    } else if (!loading && user) {
      const userId = user.id;
      const wasLoggedOut = prevUserRef.current === null && userId;
      const justLoggedIn = gameMode === 'sign-in' && wasLoggedOut;
      
      if (justLoggedIn && !hasShownSplash) {
        // User just logged in from sign-in page, play login melody and show splash screen
        playLoginMelody();
        setHasShownSplash(true);
        setGameMode('splash');
      } else if (gameMode === 'menu' && !hasShownSplash && !justLoggedIn) {
        // User is already logged in on app start (not from sign-in), skip splash
        // But if they come back from background, splash will show via AppState listener
        setHasShownSplash(true);
      }
      
      prevUserRef.current = userId;
    }
  }, [user, loading, gameMode, hasShownSplash]);

  // Handle deep links for email confirmation and password reset
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      try {
        if (!event.url || typeof event.url !== 'string') {
          return;
        }

        // Parse deep link URL manually (React Native doesn't have full URL API)
        // Format: beefive://confirm-email#access_token=...&refresh_token=...&type=signup
        // or: beefive://reset-password#access_token=...&refresh_token=...&type=recovery
        
        // Check if this is a beefive:// deep link
        if (!event.url.startsWith('beefive://')) {
          return;
        }

        // Extract the path and hash
        const urlWithoutScheme = event.url.replace('beefive://', '');
        const hashIndex = urlWithoutScheme.indexOf('#');
        const path = hashIndex >= 0 ? urlWithoutScheme.substring(0, hashIndex) : urlWithoutScheme;
        const hash = hashIndex >= 0 ? urlWithoutScheme.substring(hashIndex + 1) : '';

        // Parse hash parameters manually
        const hashParams: Record<string, string> = {};
        if (hash) {
          hash.split('&').forEach((param) => {
            const [key, value] = param.split('=');
            if (key && value) {
              hashParams[key] = decodeURIComponent(value);
            }
          });
        }

        const accessToken = hashParams['access_token'];
        const refreshToken = hashParams['refresh_token'];
        const type = hashParams['type'];

        // Handle email confirmation
        if (path === 'confirm-email' || path.startsWith('confirm-email/')) {
          if (type === 'signup' && accessToken && refreshToken && supabase) {
            // Set the session with the confirmation tokens
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('Failed to confirm email:', sessionError);
              Alert.alert(
                'Confirmation Failed',
                'Failed to confirm your email. Please try again or request a new confirmation email.',
                [{ text: 'OK' }]
              );
              return;
            }

            // Success - email confirmed
            Alert.alert(
              'Email Confirmed!',
              'Your email has been successfully confirmed. You can now sign in.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Navigate to sign in if not already there
                    if (gameMode !== 'sign-in') {
                      setGameMode('sign-in');
                    }
                  },
                },
              ]
            );
          }
        }
        // Handle password reset (already handled in ResetPasswordPage, but we can handle initial navigation here)
        else if (path === 'reset-password' || path.startsWith('reset-password/')) {
          // Navigate to reset password page if not already there
          if (gameMode !== 'reset-password') {
            setGameMode('reset-password');
          }
        }
      } catch (err) {
        console.error('Deep link handling error:', err);
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Also check if app was opened with a deep link (when app was closed)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [gameMode]);

  // Bee animation functions
  useEffect(() => {
    // Bee 1 animation - Path 1 (faster: 3000ms per segment)
    // Path: Start at left, move right, then left, then right, then left
    // Note: Bee emoji naturally faces left, so scaleX: 1 = left, scaleX: -1 = right
    const animateBee1 = () => {
      bee1X.setValue(0);
      bee1ScaleX.setValue(-1); // Start facing right (flipped from natural left)
      
      const createPath1 = () => {
        return Animated.parallel([
          Animated.sequence([
            // Move right (0 -> 0.8)
            Animated.parallel([
              Animated.timing(bee1X, {
                toValue: SCREEN_WIDTH * 0.8,
                duration: 3000,
                useNativeDriver: true,
              }),
              Animated.timing(bee1ScaleX, {
                toValue: -1, // Face right (flipped)
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
            // Move left (0.8 -> 0.2)
            Animated.parallel([
              Animated.timing(bee1X, {
                toValue: SCREEN_WIDTH * 0.2,
                duration: 3000,
                useNativeDriver: true,
              }),
              Animated.timing(bee1ScaleX, {
                toValue: 1, // Face left (natural)
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
            // Move right (0.2 -> 0.6)
            Animated.parallel([
              Animated.timing(bee1X, {
                toValue: SCREEN_WIDTH * 0.6,
                duration: 3000,
                useNativeDriver: true,
              }),
              Animated.timing(bee1ScaleX, {
                toValue: -1, // Face right (flipped)
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
            // Move left (0.6 -> 0)
            Animated.parallel([
              Animated.timing(bee1X, {
                toValue: 0,
                duration: 3000,
                useNativeDriver: true,
              }),
              Animated.timing(bee1ScaleX, {
                toValue: 1, // Face left (natural)
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.sequence([
            Animated.timing(bee1Y, {
              toValue: SCREEN_HEIGHT * 0.2,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(bee1Y, {
              toValue: SCREEN_HEIGHT * 0.7,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(bee1Y, {
              toValue: SCREEN_HEIGHT * 0.5,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(bee1Y, {
              toValue: 0,
              duration: 3000,
              useNativeDriver: true,
            }),
          ]),
        ]);
      };
      
      Animated.loop(createPath1()).start();
    };

    // Bee 2 animation - Path 2 (faster: 3750ms per segment)
    // Path: Start at right, move left, then right, then left, then right
    // Note: Bee emoji naturally faces left, so scaleX: 1 = left, scaleX: -1 = right
    const animateBee2 = () => {
      bee2X.setValue(SCREEN_WIDTH * 0.95);
      bee2ScaleX.setValue(1); // Start facing left (natural)
      
      const createPath2 = () => {
        return Animated.parallel([
          Animated.sequence([
            // Move left (0.95 -> 0.1)
            Animated.parallel([
              Animated.timing(bee2X, {
                toValue: SCREEN_WIDTH * 0.1,
                duration: 3750,
                useNativeDriver: true,
              }),
              Animated.timing(bee2ScaleX, {
                toValue: 1, // Face left (natural)
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
            // Move right (0.1 -> 0.7)
            Animated.parallel([
              Animated.timing(bee2X, {
                toValue: SCREEN_WIDTH * 0.7,
                duration: 3750,
                useNativeDriver: true,
              }),
              Animated.timing(bee2ScaleX, {
                toValue: -1, // Face right (flipped)
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
            // Move left (0.7 -> 0.3)
            Animated.parallel([
              Animated.timing(bee2X, {
                toValue: SCREEN_WIDTH * 0.3,
                duration: 3750,
                useNativeDriver: true,
              }),
              Animated.timing(bee2ScaleX, {
                toValue: 1, // Face left (natural)
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
            // Move right (0.3 -> 0.5)
            Animated.parallel([
              Animated.timing(bee2X, {
                toValue: SCREEN_WIDTH * 0.5,
                duration: 3750,
                useNativeDriver: true,
              }),
              Animated.timing(bee2ScaleX, {
                toValue: -1, // Face right (flipped)
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
            // Move right (0.5 -> 0.95)
            Animated.parallel([
              Animated.timing(bee2X, {
                toValue: SCREEN_WIDTH * 0.95,
                duration: 3750,
                useNativeDriver: true,
              }),
              Animated.timing(bee2ScaleX, {
                toValue: -1, // Face right (flipped)
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.sequence([
            Animated.timing(bee2Y, {
              toValue: SCREEN_HEIGHT * 0.1,
              duration: 3750,
              useNativeDriver: true,
            }),
            Animated.timing(bee2Y, {
              toValue: SCREEN_HEIGHT * 0.3,
              duration: 3750,
              useNativeDriver: true,
            }),
            Animated.timing(bee2Y, {
              toValue: SCREEN_HEIGHT * 0.8,
              duration: 3750,
              useNativeDriver: true,
            }),
            Animated.timing(bee2Y, {
              toValue: SCREEN_HEIGHT * 0.9,
              duration: 3750,
              useNativeDriver: true,
            }),
            Animated.timing(bee2Y, {
              toValue: SCREEN_HEIGHT * 0.5,
              duration: 3750,
              useNativeDriver: true,
            }),
          ]),
        ]);
      };
      
      Animated.loop(createPath2()).start();
    };

    // Bee 3 animation - Path 3 (faster: 4500ms per segment)
    // Path: Start at center, move right, then left, then right, then left, then right, then left
    // Note: Bee emoji naturally faces left, so scaleX: 1 = left, scaleX: -1 = right
    const animateBee3 = () => {
      bee3X.setValue(SCREEN_WIDTH * 0.5);
      bee3ScaleX.setValue(-1); // Start facing right (flipped)
      
      const createPath3 = () => {
        return Animated.parallel([
          Animated.sequence([
            // Move right (0.5 -> 0.9)
            Animated.parallel([
              Animated.timing(bee3X, {
                toValue: SCREEN_WIDTH * 0.9,
                duration: 4500,
                useNativeDriver: true,
              }),
              Animated.timing(bee3ScaleX, {
                toValue: -1, // Face right (flipped)
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
            // Move left (0.9 -> 0.05)
            Animated.parallel([
              Animated.timing(bee3X, {
                toValue: SCREEN_WIDTH * 0.05,
                duration: 4500,
                useNativeDriver: true,
              }),
              Animated.timing(bee3ScaleX, {
                toValue: 1, // Face left (natural)
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
            // Move right (0.05 -> 0.4)
            Animated.parallel([
              Animated.timing(bee3X, {
                toValue: SCREEN_WIDTH * 0.4,
                duration: 4500,
                useNativeDriver: true,
              }),
              Animated.timing(bee3ScaleX, {
                toValue: -1, // Face right (flipped)
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
            // Move right (0.4 -> 0.85)
            Animated.parallel([
              Animated.timing(bee3X, {
                toValue: SCREEN_WIDTH * 0.85,
                duration: 4500,
                useNativeDriver: true,
              }),
              Animated.timing(bee3ScaleX, {
                toValue: -1, // Face right (flipped)
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
            // Move left (0.85 -> 0.6)
            Animated.parallel([
              Animated.timing(bee3X, {
                toValue: SCREEN_WIDTH * 0.6,
                duration: 4500,
                useNativeDriver: true,
              }),
              Animated.timing(bee3ScaleX, {
                toValue: 1, // Face left (natural)
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
            // Move left (0.6 -> 0.25)
            Animated.parallel([
              Animated.timing(bee3X, {
                toValue: SCREEN_WIDTH * 0.25,
                duration: 4500,
                useNativeDriver: true,
              }),
              Animated.timing(bee3ScaleX, {
                toValue: 1, // Face left (natural)
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
            // Move right (0.25 -> 0.5)
            Animated.parallel([
              Animated.timing(bee3X, {
                toValue: SCREEN_WIDTH * 0.5,
                duration: 4500,
                useNativeDriver: true,
              }),
              Animated.timing(bee3ScaleX, {
                toValue: -1, // Face right (flipped)
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.sequence([
            Animated.timing(bee3Y, {
              toValue: SCREEN_HEIGHT * 0.6,
              duration: 4500,
              useNativeDriver: true,
            }),
            Animated.timing(bee3Y, {
              toValue: SCREEN_HEIGHT * 0.2,
              duration: 4500,
              useNativeDriver: true,
            }),
            Animated.timing(bee3Y, {
              toValue: SCREEN_HEIGHT * 0.4,
              duration: 4500,
              useNativeDriver: true,
            }),
            Animated.timing(bee3Y, {
              toValue: SCREEN_HEIGHT * 0.9,
              duration: 4500,
              useNativeDriver: true,
            }),
            Animated.timing(bee3Y, {
              toValue: SCREEN_HEIGHT * 0.8,
              duration: 4500,
              useNativeDriver: true,
            }),
            Animated.timing(bee3Y, {
              toValue: SCREEN_HEIGHT * 0.1,
              duration: 4500,
              useNativeDriver: true,
            }),
            Animated.timing(bee3Y, {
              toValue: SCREEN_HEIGHT * 0.95,
              duration: 4500,
              useNativeDriver: true,
            }),
          ]),
        ]);
      };
      
      Animated.loop(createPath3()).start();
    };

    // Start all bee animations
    animateBee1();
    animateBee2();
    // Delay bee 3 to create variety
    setTimeout(() => animateBee3(), 10000);
  }, []);

  // Show loading screen while checking authentication
  // This must come AFTER all hooks are declared to follow Rules of Hooks
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1a1a1a' : '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 32, marginBottom: 16 }}>🐝</Text>
        <Text style={{ fontSize: 16, color: isDark ? '#999' : '#666' }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // Handle local multiplayer mode
  if (gameMode === 'local-multiplayer') {
    return (
      <SimpleGame 
        onBackToMenu={() => setGameMode('menu')} 
        backgroundColor={backgroundColor} 
      />
    );
  }

  // Handle AI game mode (Classic)
  if (gameMode === 'ai-game') {
    return (
      <ClassicAIGame 
        onBackToMenu={() => setGameMode('menu')} 
        initialDifficulty={aiDifficulty as 'easy' | 'medium' | 'hard'}
        initialTimer={aiTimer}
        backgroundColor={backgroundColor}
      />
    );
  }

  // Handle Adventure game mode
  if (gameMode === 'adventure-game') {
    return (
      <AdventureGame 
        onBackToMenu={() => {
          setGameMode('menu');
          setProgressLoaded(false); // Reload progress when returning
        }}
        initialGame={currentGame}
        autoStart={true}
        onGameChange={(gameNumber) => {
          setCurrentGame(gameNumber);
          // Ensure highestUnlockedGame is at least the new game number and at least 1
          setHighestUnlockedGame(prev => Math.max(1, prev, gameNumber));
        }}
      />
    );
  }

  // Handle Privacy Policy mode
  if (gameMode === 'privacy-policy') {
    return <PrivacyPolicy onBackToMenu={() => setGameMode('menu')} />;
  }

  // Handle Sign In mode
  if (gameMode === 'sign-in') {
    return (
      <SignInPage
        onBack={() => {
          // Only allow going back if user is logged in
          if (user) {
            setGameMode('menu');
          }
          // Otherwise, stay on sign in (user must authenticate)
        }}
        onNavigateToSignUp={() => setGameMode('sign-up')}
        onNavigateToForgotPassword={() => setGameMode('forgot-password')}
      />
    );
  }

  // Handle Sign Up mode
  if (gameMode === 'sign-up') {
    return (
      <SignUpPage
        onBack={() => setGameMode('menu')}
        onNavigateToSignIn={() => setGameMode('sign-in')}
      />
    );
  }

  // Handle Forgot Password mode
  if (gameMode === 'forgot-password') {
    return (
      <ForgotPasswordPage
        onBack={() => setGameMode('menu')}
        onNavigateToSignIn={() => setGameMode('sign-in')}
      />
    );
  }

  // Handle Reset Password mode
  if (gameMode === 'reset-password') {
    return (
      <ResetPasswordPage
        onBack={() => setGameMode('menu')}
        onSuccess={() => setGameMode('sign-in')}
      />
    );
  }

  // Handle Splash Screen mode (shown after sign in)
  if (gameMode === 'splash') {
    return (
      <SplashScreen
        onComplete={() => setGameMode('menu')}
      />
    );
  }

  // Calculate game position for map (simplified version)
  const getGamePosition = (gameNumber: number) => {
    const gameIndex = gameNumber - 1;
    const spacing = isMobile ? 60 : 80;
    const totalHeight = TOTAL_GAMES * spacing * 0.2;
    const y = totalHeight - (gameIndex * spacing);
    
    const gamesPerSide = 4;
    const sideIndex = Math.floor(gameIndex / gamesPerSide);
    const positionInSide = gameIndex % gamesPerSide;
    
    let x;
    if (isMobile) {
      if (sideIndex % 2 === 0) {
        if (positionInSide === 0) x = 15;
        else if (positionInSide === 1) x = 25;
        else if (positionInSide === 2) x = 35;
        else x = 45;
      } else {
        if (positionInSide === 0) x = 55;
        else if (positionInSide === 1) x = 65;
        else if (positionInSide === 2) x = 55;
        else x = 45;
      }
    } else {
      if (sideIndex % 2 === 0) {
        if (positionInSide < 2) {
          x = 8 + (positionInSide * 12);
        } else {
          x = 28 + ((positionInSide - 2) * 12);
        }
      } else {
        if (positionInSide < 2) {
          x = 72 + (positionInSide * 12);
        } else {
          x = 52 + ((positionInSide - 2) * 12);
        }
      }
    }
    
    return {
      left: Math.max(5, Math.min(95, x)),
      top: y,
    };
  };

  // Calculate visible game range for map rendering
  const getVisibleGameRange = () => {
    if (!isMobile) return { startGame: 1, endGame: 100 };
    
    const viewportHeight = SCREEN_HEIGHT;
    const spacing = isMobile ? 60 : 80;
    const totalHeight = TOTAL_GAMES * spacing * 0.2;
    
    // Calculate which games are visible in viewport with buffer
    const buffer = viewportHeight * 2; // Render 2x viewport above and below
    const startY = Math.max(0, mapScrollY - buffer);
    const endY = mapScrollY + viewportHeight + buffer;
    
    // Convert Y position to game number (games flow from bottom to top)
    const startGame = Math.max(1, Math.floor((totalHeight - endY) / spacing) + 1);
    const endGame = Math.min(TOTAL_GAMES, Math.floor((totalHeight - startY) / spacing) + 1);
    
    return { startGame: Math.max(1, startGame - 20), endGame: Math.min(TOTAL_GAMES, endGame + 20) };
  };

  // Render simplified map background for mobile
  const renderMapBackground = () => {
    if (!isMobile || gameMode !== 'menu') return null;
    
    const totalHeight = TOTAL_GAMES * (isMobile ? 60 : 80) * 0.2;
    const visibleRange = getVisibleGameRange();
    
    return (
      <View style={styles.mapBackgroundContainer}>
        {/* Header with logo - matching AdventureGame */}
        <View style={styles.mapHeader}>
          <View style={{ flex: 1 }} />
          <View style={styles.mapHeaderLogoContainer}>
            <Image 
              source={require('../assets/BEE-FIVE.png')}
              style={styles.mapHeaderLogo}
              resizeMode="contain"
            />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            {user && (
              <TouchableOpacity
                onPress={() => setShowProfileModal(true)}
                style={styles.profileIconButtonMobile}
              >
                <Text style={styles.profileIcon}>👤</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Map Container - matching AdventureGame exactly, centered */}
        <View style={styles.mapContainer}>
          <ScrollView
            ref={mapScrollViewRef}
            style={styles.mapScrollView}
            contentContainerStyle={[styles.mapScrollContent, { height: totalHeight }]}
            showsVerticalScrollIndicator={true}
            scrollEnabled={true}
            onScroll={(event) => {
              const scrollY = event.nativeEvent.contentOffset.y;
              const spacing = isMobile ? 60 : 80;
              const mapViewportHeight = SCREEN_HEIGHT * 0.6; // Map container height
              
              // Calculate the Y position of the highest unlocked game (from top of content)
              // Games are positioned from bottom to top, so higher game numbers have lower Y values
              const highestGameIndex = highestUnlockedGame - 1;
              const highestGameY = totalHeight - (highestGameIndex * spacing);
              
              // Calculate minimum allowed scroll position
              // Prevent scrolling UP (to lower scrollY) to see games above highestUnlockedGame
              // The highest unlocked game should be at the top of viewport at minimum scroll
              const minScrollY = Math.max(0, highestGameY);
              
              // Clamp scroll position to prevent scrolling above unlocked games
              const clampedScrollY = Math.max(scrollY, minScrollY);
              
              // If user tried to scroll above (to lower scrollY), reset to min position
              if (scrollY < minScrollY && mapScrollViewRef.current) {
                mapScrollViewRef.current.scrollTo({
                  y: minScrollY,
                  animated: false,
                });
              }
              
              setMapScrollY(clampedScrollY);
            }}
            scrollEventThrottle={16}
            onScrollEndDrag={(event) => {
              const scrollY = event.nativeEvent.contentOffset.y;
              const spacing = isMobile ? 60 : 80;
              
              // Calculate the Y position of the highest unlocked game
              const highestGameIndex = highestUnlockedGame - 1;
              const highestGameY = totalHeight - (highestGameIndex * spacing);
              const minScrollY = Math.max(0, highestGameY);
              
              // Clamp if user scrolled above unlocked games
              if (scrollY < minScrollY && mapScrollViewRef.current) {
                mapScrollViewRef.current.scrollTo({
                  y: minScrollY,
                  animated: true,
                });
              }
            }}
            onMomentumScrollEnd={(event) => {
              const scrollY = event.nativeEvent.contentOffset.y;
              const spacing = isMobile ? 60 : 80;
              
              // Calculate the Y position of the highest unlocked game
              const highestGameIndex = highestUnlockedGame - 1;
              const highestGameY = totalHeight - (highestGameIndex * spacing);
              const minScrollY = Math.max(0, highestGameY);
              
              // Clamp if momentum scroll went above unlocked games
              if (scrollY < minScrollY && mapScrollViewRef.current) {
                mapScrollViewRef.current.scrollTo({
                  y: minScrollY,
                  animated: true,
                });
              }
            }}
          >
          {/* Background gradient */}
          <View style={styles.mapBackground} />
          
          {/* Decorative elements */}
          {Array.from({ length: 30 }, (_, i) => {
            const gameIndex = 1 + (i * 10);
            if (gameIndex > TOTAL_GAMES) return null;
            const position = getGamePosition(gameIndex);
            const decorations = ['🌿', '🌱', '🍃', '🌾', '🌺', '🌸', '🌻', '⭐', '✨', '🌼'];
            const decoration = decorations[i % decorations.length];
            
            return (
              <View
                key={`decoration-${i}`}
                style={[
                  styles.mapDecoration,
                  {
                    left: `${(i % 4) * 25 + 5}%`,
                    top: position.top + ((i % 3) * 50 - 50),
                  },
                ]}
              >
                <Text style={styles.mapDecorationText}>{decoration}</Text>
              </View>
            );
          }).filter(Boolean)}

          {/* Flying bees */}
          {Array.from({ length: 15 }, (_, i) => {
            const gameIndex = 1 + (i * 5);
            if (gameIndex > TOTAL_GAMES) return null;
            const position = getGamePosition(gameIndex);
            
            return (
              <View
                key={`bee-${i}`}
                style={[
                  styles.mapFlyingBee,
                  {
                    left: `${(i % 5) * 18 + 8}%`,
                    top: position.top + ((i % 4) * 40 - 60),
                  },
                ]}
              >
                <Text style={styles.mapBeeEmoji}>🐝</Text>
              </View>
            );
          }).filter(Boolean)}

          {/* Stage markers */}
          {ADVENTURE_STAGES.map((stage, index) => {
            const position = getGamePosition(stage.games);
            return (
              <View
                key={`stage-${index}`}
                style={[
                  styles.mapStageMarker,
                  {
                    left: '50%',
                    top: position.top - 40,
                    backgroundColor: stage.color,
                    transform: [{ translateX: -60 }],
                  },
                ]}
              >
                <View style={styles.mapStageMarkerContent}>
                  <Text style={styles.mapStageEmoji}>{stage.emoji}</Text>
                  <Text style={styles.mapStageText}>S{index + 1}</Text>
                </View>
              </View>
            );
          })}

          {/* Pathway segments */}
          {Array.from({ length: 20 }, (_, i) => {
            const gameNum = 1 + (i * 5);
            if (gameNum >= TOTAL_GAMES) return null;
            
            const pos1 = getGamePosition(gameNum);
            const pos2 = getGamePosition(Math.min(gameNum + 5, TOTAL_GAMES));
            
            return (
              <View
                key={`path-${i}`}
                style={[
                  styles.mapPathwaySegment,
                  {
                    left: `${(pos1.left + pos2.left) / 2}%`,
                    top: Math.min(pos1.top, pos2.top),
                    height: Math.abs(pos2.top - pos1.top),
                    backgroundColor: i % 2 === 0 ? '#FFC30B' : '#4CAF50',
                  },
                ]}
              />
            );
          }).filter(Boolean)}

          {/* Clickable game locations - render visible games */}
          {Array.from({ length: visibleRange.endGame - visibleRange.startGame + 1 }, (_, i) => {
            const gameNumber = visibleRange.startGame + i;
            if (gameNumber < 1 || gameNumber > TOTAL_GAMES) return null;
            const position = getGamePosition(gameNumber);
            const isCompleted = gamesCompleted.includes(gameNumber);
            const isCurrent = gameNumber === currentGame;
            const isLocked = gameNumber > highestUnlockedGame;
            
            return (
              <View
                key={`game-${gameNumber}`}
                style={[
                  styles.mapGamePinContainer,
                  {
                    left: `${position.left}%`,
                    top: position.top,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    if (!isLocked) {
                      setCurrentGame(gameNumber);
                      setGameMode('adventure-game');
                    }
                  }}
                  disabled={isLocked}
                  style={[
                    styles.mapGamePin,
                    isCurrent && styles.mapGamePinCurrent,
                    isCompleted && styles.mapGamePinCompleted,
                    isLocked && styles.mapGamePinLocked,
                  ]}
                >
                  <View style={[
                    styles.mapPinHead,
                    isCurrent && styles.mapPinHeadCurrent,
                    isCompleted && styles.mapPinHeadCompleted,
                    isLocked && styles.mapPinHeadLocked,
                  ]}>
                    <Text style={styles.mapGameNumberText}>{gameNumber}</Text>
                    {isLocked && (
                      <Text style={styles.mapLockIcon}>🔒</Text>
                    )}
                    {isCompleted && !isLocked && (
                      <Text style={styles.mapStarIcon}>⭐</Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            );
          }).filter(Boolean)}
          </ScrollView>
        </View>
      </View>
    );
  };

  // Main menu
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Map background for mobile */}
      {renderMapBackground()}
      
      {gameMode === 'menu' && !isMobile && (
        <View style={styles.beeContainer}>
          {/* Animated Bee 1 */}
          <Animated.View
            style={[
              styles.bee,
              {
                transform: [
                  { translateX: bee1X },
                  { translateY: bee1Y },
                  { scaleX: bee1ScaleX },
                ],
              },
            ]}
          >
            <Text style={styles.beeEmoji}>🐝</Text>
          </Animated.View>

          {/* Animated Bee 2 */}
          <Animated.View
            style={[
              styles.bee,
              {
                transform: [
                  { translateX: bee2X },
                  { translateY: bee2Y },
                  { scaleX: bee2ScaleX },
                ],
              },
            ]}
          >
            <Text style={styles.beeEmoji}>🐝</Text>
          </Animated.View>

          {/* Animated Bee 3 */}
          <Animated.View
            style={[
              styles.bee,
              {
                transform: [
                  { translateX: bee3X },
                  { translateY: bee3Y },
                  { scaleX: bee3ScaleX },
                ],
              },
            ]}
          >
            <Text style={styles.beeEmoji}>🐝</Text>
          </Animated.View>
        </View>
      )}
      {!isMobile && (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          <View style={styles.mainContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.mainTitle}>🐝 Bee-Five 🐝</Text>
            <Text style={styles.mainSubtitle}>
              Your favourite version of{' '}
              <Text style={styles.connectFiveText}>CONNECT-5</Text>!
            </Text>
            {user && (
              <TouchableOpacity
                onPress={() => setShowProfileModal(true)}
                style={styles.profileIconButtonDesktop}
              >
                <Text style={styles.profileIcon}>👤</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.menuButton, styles.purpleButton]}
              onPress={() => setGameMode('adventure-game')}
            >
              <Text style={styles.buttonEmoji}>🎯</Text>
              <Text style={styles.buttonText}>Adventure</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuButton, styles.greenButton]}
              onPress={() => setGameMode('local-multiplayer')}
            >
              <Text style={styles.buttonIcon}>👥</Text>
              <Text style={styles.buttonText}>Play with a friend</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuButton, styles.blueButton]}
              onPress={() => setShowDifficultyModal(true)}
            >
              <Text style={styles.buttonIcon}>🤖</Text>
              <Text style={styles.buttonText}>Classic</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
              <TouchableOpacity
                onPress={() => setGameMode('privacy-policy')}
                style={styles.privacyLink}
              >
                <Text style={styles.privacyLinkText}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </ScrollView>
      )}
      
      {/* Mobile menu overlay - buttons directly on map */}
      {isMobile && gameMode === 'menu' && (
        <View style={styles.mobileMenuOverlay} pointerEvents="box-none">
          {/* Title */}
          <View style={styles.mapTitleContainer}>
            <Text style={styles.mapTitle}>BEE-FIVE</Text>
            <Text style={styles.mapSubtitle}>
              Connect 5 • Outthink • Win
            </Text>
          </View>

          {/* Thought Bubble */}
          <View style={styles.thoughtBubbleContainer}>
            <View style={styles.thoughtBubble}>
              <Text style={styles.thoughtBubbleText}>
                Connect 5 dots{' '}
                <Text style={styles.thoughtBubbleHighlight}>vertically</Text>,{' '}
                <Text style={styles.thoughtBubbleHighlight}>horizontally</Text>, or{' '}
                <Text style={styles.thoughtBubbleHighlight}>diagonally</Text>
              </Text>
            </View>
            <View style={styles.thoughtBubbleTail} />
          </View>

          {/* Game buttons positioned on left side middle */}
          <View style={styles.mapLeftButtonContainer}>
            <View style={styles.mapLeftButtonInner}>
              <TouchableOpacity
                style={[styles.mapLeftMenuButton, styles.greenButton]}
                onPress={() => setGameMode('local-multiplayer')}
              >
                <Text style={styles.buttonIcon}>👥</Text>
                <Text style={styles.buttonText}>Play with a{'\n'}friend</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mapLeftMenuButton, styles.blueButton]}
                onPress={() => setShowDifficultyModal(true)}
              >
                <Text style={styles.buttonIcon}>🤖</Text>
                <Text style={styles.buttonText}>Classic</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Play button at bottom center - shows current level */}
          <View style={styles.mapPlayButtonContainer}>
            <TouchableOpacity
              style={[styles.mapPlayButton, (currentGame > highestUnlockedGame && currentGame > 1) && styles.mapPlayButtonDisabled]}
              onPress={() => {
                // Allow playing if currentGame is 1 (always unlocked) or if it's <= highestUnlockedGame
                if (currentGame === 1 || currentGame <= highestUnlockedGame) {
                  // Navigate to adventure game with auto-start
                  setGameMode('adventure-game');
                }
              }}
              disabled={currentGame > highestUnlockedGame && currentGame > 1}
            >
              <Text style={styles.mapPlayButtonEmoji}>▶️</Text>
              <Text style={styles.mapPlayButtonText}>
                Adventure Level {currentGame}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer links */}
          <View style={styles.mapFooter}>
            <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <TouchableOpacity
                onPress={() => setGameMode('privacy-policy')}
                style={styles.mapPrivacyLink}
              >
                <Text style={styles.mapPrivacyLinkText}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Modals - shared between mobile and desktop */}
      {gameMode === 'menu' && (
        <>
          {/* Difficulty Modal */}
          <Modal
            visible={showDifficultyModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDifficultyModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>🤖 Select Difficulty 🤖</Text>
                <Text style={styles.modalSubtitle}>Choose the AI difficulty level:</Text>

                <TouchableOpacity
                  style={[styles.modalDifficultyButton, styles.easyButton]}
                  onPress={() => {
                    setSelectedDifficulty('easy');
                    setShowDifficultyModal(false);
                    setShowTimerModal(true);
                  }}
                >
                  <View style={styles.modalDifficultyButtonContent}>
                    <Text style={styles.modalDifficultyText}>🟢</Text>
                    <Text style={styles.modalDifficultyText}> Easy</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalDifficultyButton, styles.mediumButton]}
                  onPress={() => {
                    setSelectedDifficulty('medium');
                    setShowDifficultyModal(false);
                    setShowTimerModal(true);
                  }}
                >
                  <Text style={styles.modalDifficultyText}>🟠 Medium</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalDifficultyButton, styles.hardButton]}
                  onPress={() => {
                    setSelectedDifficulty('hard');
                    setShowDifficultyModal(false);
                    setShowTimerModal(true);
                  }}
                >
                  <Text style={styles.modalDifficultyText}>🔴 Hard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalActionButton, styles.grayButton]}
                  onPress={() => setShowDifficultyModal(false)}
                >
                  <Text style={styles.modalActionText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Timer Modal */}
          <Modal
            visible={showTimerModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowTimerModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>⏱️ Select Timer ⏱️</Text>
                <Text style={styles.modalSubtitle}>Choose timer option:</Text>

                <TouchableOpacity
                  style={[styles.modalDifficultyButton, styles.blueButton]}
                  onPress={() => {
                    setAiDifficulty(selectedDifficulty);
                    setAiTimer(15);
                    setShowTimerModal(false);
                    setGameMode('ai-game');
                  }}
                >
                  <Text style={styles.modalDifficultyText}>⏱️ With Timer (15s)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalDifficultyButton, styles.purpleButton]}
                  onPress={() => {
                    setAiDifficulty(selectedDifficulty);
                    setAiTimer(0);
                    setShowTimerModal(false);
                    setGameMode('ai-game');
                  }}
                >
                  <Text style={styles.modalDifficultyText}>∞ No Timer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalActionButton, styles.grayButton]}
                  onPress={() => {
                    setShowTimerModal(false);
                    setShowDifficultyModal(true);
                  }}
                >
                  <Text style={styles.modalActionText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Profile Modal */}
          <Modal
            visible={showProfileModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowProfileModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>👤 Profile</Text>
                
                {user && (
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileEmail}>{user.email}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.modalActionButton, styles.redButton]}
                  onPress={async () => {
                    await signOut();
                    setShowProfileModal(false);
                    setGameMode('sign-in');
                  }}
                >
                  <Text style={styles.modalActionText}>Sign Out</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalActionButton, styles.grayButton]}
                  onPress={() => setShowProfileModal(false)}
                >
                  <Text style={styles.modalActionText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFC30B',
    borderWidth: 3,
    borderColor: '#FFC30B',
  },
  beeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    pointerEvents: 'none',
  },
  bee: {
    position: 'absolute',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beeEmoji: {
    fontSize: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContentMobile: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 10,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFC30B',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mainContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 25,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  mainContainerMobile: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 25,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    borderWidth: 3,
    borderColor: '#FFC30B',
  },
  // Map background styles
  mapBackgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    backgroundColor: '#FFC30B',
    flexDirection: 'column',
    justifyContent: 'center', // Center the map vertically
    alignItems: 'center',
  },
  mapHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 25,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#000000',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    flexShrink: 0, // Don't shrink header
    zIndex: 1,
  },
  mapHeaderLogoContainer: {
    width: 150,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapHeaderLogo: {
    width: '100%',
    height: '100%',
  },
  mapContainer: {
    height: SCREEN_HEIGHT * 0.6,
    width: SCREEN_WIDTH - 20,
    margin: 10,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#F0FFF0',
    minHeight: 0, // Allow flex shrinking
  },
  mapScrollView: {
    flex: 1,
  },
  mapScrollContent: {
    position: 'relative',
  },
  mapBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F0FFF0',
  },
  mapDecoration: {
    position: 'absolute',
    opacity: 0.4,
    zIndex: 1,
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapDecorationText: {
    fontSize: 18,
  },
  mapFlyingBee: {
    position: 'absolute',
    opacity: 0.6,
    zIndex: 3,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapBeeEmoji: {
    fontSize: 18,
  },
  mapStageMarker: {
    position: 'absolute',
    alignItems: 'center',
    width: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
    zIndex: 5,
    opacity: 0.8,
  },
  mapStageMarkerContent: {
    alignItems: 'center',
    padding: 6,
  },
  mapStageEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  mapStageText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  mapPathwaySegment: {
    position: 'absolute',
    width: 3,
    borderRadius: 2,
    opacity: 0.4,
    zIndex: 0,
  },
  mobileMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    padding: 20,
  },
  mapTitleContainer: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 11,
  },
  mapTitle: {
    fontSize: 28,
    fontWeight: 'normal',
    color: '#000',
    textAlign: 'center',
    marginBottom: 5,
    textShadowColor: '#fff',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 1,
  },
  mapSubtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'normal',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
  thoughtBubbleContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.18,
    left: SCREEN_WIDTH * 0.1,
    width: SCREEN_WIDTH * 0.8,
    zIndex: 11,
    alignItems: 'center',
  },
  thoughtBubble: {
    backgroundColor: '#D3D3D3',
    borderRadius: 20,
    padding: 15,
    paddingHorizontal: 20,
    borderWidth: 3,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  thoughtBubbleText: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
  },
  thoughtBubbleHighlight: {
    color: '#fff',
    fontWeight: '700',
  },
  thoughtBubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderTopWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFC30B',
    marginTop: -3,
  },
  mapLeftButtonContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 180,
    justifyContent: 'center',
    zIndex: 11,
    paddingLeft: 10,
  },
  mapLeftButtonInner: {
    alignItems: 'flex-start',
    gap: 12,
  },
  mapLeftMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#000',
    minHeight: 45,
    width: 160,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  mapPlayButtonContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 11,
  },
  mapPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: '#000',
    backgroundColor: '#4CAF50',
    minHeight: 64,
    minWidth: 200,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  mapPlayButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
    borderColor: '#999',
  },
  mapPlayButtonEmoji: {
    fontSize: 28,
  },
  mapPlayButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  mapFooter: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 11,
    paddingBottom: 20,
    backgroundColor: 'black',
  },
  mapPrivacyLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mapPrivacyLinkText: {
    color: '#FFC30B',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
  // Clickable game location styles
  mapGamePinContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 4,
  },
  mapGamePin: {
    alignItems: 'center',
  },
  mapGamePinCurrent: {
    transform: [{ scale: 1.2 }],
  },
  mapGamePinCompleted: {},
  mapGamePinLocked: {
    opacity: 0.5,
  },
  mapPinHead: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFC30B',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  mapPinHeadCurrent: {
    backgroundColor: '#FFC30B',
    borderWidth: 3,
    transform: [{ scale: 1.3 }],
  },
  mapPinHeadCompleted: {
    backgroundColor: '#4CAF50',
  },
  mapPinHeadLocked: {
    backgroundColor: '#666666',
    opacity: 0.6,
  },
  mapGameNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  mapLockIcon: {
    position: 'absolute',
    top: -2,
    right: -2,
    fontSize: 10,
    backgroundColor: '#666',
    borderRadius: 8,
    width: 16,
    height: 16,
    textAlign: 'center',
    lineHeight: 16,
  },
  mapStarIcon: {
    position: 'absolute',
    top: -4,
    right: -4,
    fontSize: 12,
  },
  submenuContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 25,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
    width: '100%',
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFC30B',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  mainSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  connectFiveText: {
    color: '#ff4d4f',
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  submenuTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFC30B',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#000',
    minHeight: 50,
    width: '100%',
    maxWidth: 200,
    gap: 8,
  },
  greenButton: {
    backgroundColor: '#4CAF50',
  },
  blueButton: {
    backgroundColor: '#2196F3',
  },
  orangeButton: {
    backgroundColor: '#FF9800',
  },
  purpleButton: {
    backgroundColor: '#9C27B0',
  },
  buttonEmoji: {
    fontSize: 24,
  },
  buttonIcon: {
    fontSize: 36,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#666',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    marginTop: 20,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  privacyLink: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  privacyLinkText: {
    color: '#FFC30B',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFC30B',
    marginBottom: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFC30B',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    borderWidth: 4,
    borderColor: '#000',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    alignSelf: 'flex-start',
    width: '100%',
  },
  modalInput: {
    width: '100%',
    padding: 12,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
    backgroundColor: '#fff',
    color: '#333',
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },
  modalOptionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#f0f0f0',
    minWidth: 80,
  },
  modalOptionButtonActive: {
    backgroundColor: '#4CAF50',
  },
  modalOptionText: {
    color: '#333',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalTimerButton: {
    flex: 1,
    minWidth: 60,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#f0f0f0',
  },
  modalDifficultyButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDifficultyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
  },
  easyButton: {
    backgroundColor: '#4CAF50',
  },
  mediumButton: {
    backgroundColor: '#FF9800',
  },
  hardButton: {
    backgroundColor: '#F44336',
  },
  modalDifficultyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    includeFontPadding: false,
  },
  modalActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    marginTop: 8,
    minWidth: 100,
  },
  grayButton: {
    backgroundColor: '#666',
  },
  redButton: {
    backgroundColor: '#F44336',
  },
  modalActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  profileIconButtonDesktop: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 195, 11, 0.2)',
    borderWidth: 2,
    borderColor: '#FFC30B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconButtonMobile: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255, 195, 11, 0.2)',
    borderWidth: 2,
    borderColor: '#FFC30B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 28,
  },
  profileInfo: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    alignItems: 'center',
  },
  profileEmail: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
});










