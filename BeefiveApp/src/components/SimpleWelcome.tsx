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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SimpleGame from './SimpleGame';
import ClassicAIGame from './ClassicAIGame';
import AdventureGame from './AdventureGame';
import PrivacyPolicy from './PrivacyPolicy';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isMobile = SCREEN_WIDTH <= 768;

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
  | 'contact-us';

export default function SimpleWelcome() {
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiTimer, setAiTimer] = useState<number>(15);
  const [backgroundColor, setBackgroundColor] = useState<'yellow' | 'black'>('yellow');
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Animated bees
  const bee1X = useRef(new Animated.Value(0)).current;
  const bee1Y = useRef(new Animated.Value(0)).current;
  const bee1ScaleX = useRef(new Animated.Value(1)).current; // For left/right facing
  
  const bee2X = useRef(new Animated.Value(0)).current;
  const bee2Y = useRef(new Animated.Value(0)).current;
  const bee2ScaleX = useRef(new Animated.Value(1)).current; // For left/right facing
  
  const bee3X = useRef(new Animated.Value(0)).current;
  const bee3Y = useRef(new Animated.Value(0)).current;
  const bee3ScaleX = useRef(new Animated.Value(1)).current; // For left/right facing

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
    return <AdventureGame onBackToMenu={() => setGameMode('menu')} />;
  }

  // Handle Privacy Policy mode
  if (gameMode === 'privacy-policy') {
    return <PrivacyPolicy onBackToMenu={() => setGameMode('menu')} />;
  }


  // Main menu
  return (
    <SafeAreaView style={styles.safeArea}>
      {gameMode === 'menu' && (
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
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <View style={styles.mainContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.mainTitle}>🐝 Bee-Five 🐝</Text>
            <Text style={styles.mainSubtitle}>
              Your favourite version of{' '}
              <Text style={styles.connectFiveText}>CONNECT-FIVE</Text>!
            </Text>
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
              <Text style={styles.buttonEmoji}>👥</Text>
              <Text style={styles.buttonText}>Play local friend</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuButton, styles.blueButton]}
              onPress={() => setShowDifficultyModal(true)}
            >
              <Text style={styles.buttonEmoji}>🤖</Text>
              <Text style={styles.buttonText}>Classic</Text>
            </TouchableOpacity>
          </View>

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
                  <Text style={styles.modalDifficultyText}>🟢 Easy</Text>
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

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              🐝 © 2025 Bee-Five. Product of MindGrind 🐝
            </Text>
            <TouchableOpacity
              onPress={() => setGameMode('privacy-policy')}
              style={styles.privacyLink}
            >
              <Text style={styles.privacyLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFC30B',
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
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFC30B',
    minHeight: 60,
    width: '100%',
    maxWidth: 300,
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
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
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
    textDecorationLine: 'underline',
    fontWeight: '600',
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
  modalActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});










