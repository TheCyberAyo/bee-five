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
import BattleGame from './BattleGame';
import ClassicAIGame from './ClassicAIGame';
import AdventureGame from './AdventureGame';
import MultiplayerLobby from './MultiplayerLobby';
import MultiplayerGame from './MultiplayerGame';
import { type RoomInfo } from '../services/multiplayerService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isMobile = SCREEN_WIDTH <= 768;

type GameMode = 
  | 'menu' 
  | 'local-multiplayer' 
  | 'online-lobby' 
  | 'online-game' 
  | 'ai-game' 
  | 'adventure-game' 
  | 'show-take-turns-submenu' 
  | 'show-ai-submenu' 
  | 'competition' 
  | 'about-us' 
  | 'how-to-play' 
  | 'news-updates' 
  | 'privacy-policy' 
  | 'settings' 
  | 'profile' 
  | 'contact-us';

export default function SimpleWelcome() {
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [showCompetitionModal, setShowCompetitionModal] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiTimer, setAiTimer] = useState<number>(15);
  const [backgroundColor, setBackgroundColor] = useState<'yellow' | 'black'>('yellow');
  const [competitionLength, setCompetitionLength] = useState<5 | 7>(5);
  const [competitor1Name, setCompetitor1Name] = useState('A');
  const [competitor2Name, setCompetitor2Name] = useState('B');
  const [timerOption, setTimerOption] = useState<3 | 15 | 30 | 0>(15);
  const [multiplayerRoomInfo, setMultiplayerRoomInfo] = useState<RoomInfo | null>(null);
  const [multiplayerPlayerNumber, setMultiplayerPlayerNumber] = useState<1 | 2>(1);
  
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

  // Handle AI game mode
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

  // Old AI game placeholder (removed)
  if (false && gameMode === 'ai-game-old') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>AI Game</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setGameMode('menu')}
        >
          <Text style={styles.buttonText}>Back to Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Handle Adventure game mode
  if (gameMode === 'adventure-game') {
    return <AdventureGame onBackToMenu={() => setGameMode('menu')} />;
  }

  // Handle Competition mode
  if (gameMode === 'competition') {
    return (
      <BattleGame
        battleLength={competitionLength}
        player1Name={competitor1Name}
        player2Name={competitor2Name}
        onBackToMenu={() => setGameMode('menu')}
        timeLimit={timerOption === 0 ? undefined : timerOption}
      />
    );
  }

  // Handle online multiplayer lobby
  if (gameMode === 'online-lobby') {
    return (
      <MultiplayerLobby
        onGameStart={(roomInfo: RoomInfo, playerNumber: 1 | 2) => {
          setMultiplayerRoomInfo(roomInfo);
          setMultiplayerPlayerNumber(playerNumber);
          setGameMode('online-game');
        }}
        onBackToMenu={() => setGameMode('menu')}
      />
    );
  }

  // Handle online multiplayer game
  if (gameMode === 'online-game' && multiplayerRoomInfo) {
    return (
      <MultiplayerGame
        roomInfo={multiplayerRoomInfo}
        playerNumber={multiplayerPlayerNumber}
        onBackToLobby={() => setGameMode('online-lobby')}
      />
    );
  }

  // Handle Take Turns submenu
  if (gameMode === 'show-take-turns-submenu') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          <View style={styles.submenuContainer}>
            <Text style={styles.submenuTitle}>👥 Take Turns 👥</Text>
            <Text style={styles.subtitle}>Let's settle This!</Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.menuButton, styles.greenButton]}
                onPress={() => setGameMode('local-multiplayer')}
              >
                <Text style={styles.buttonEmoji}>🤝</Text>
                <Text style={styles.buttonText}>Single Game</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuButton, styles.orangeButton]}
                onPress={() => setShowCompetitionModal(true)}
              >
                <Text style={styles.buttonEmoji}>⚔️</Text>
                <Text style={styles.buttonText}>Battle</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setGameMode('menu')}
            >
              <Text style={styles.buttonText}>Back to Menu</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Competition Modal */}
        <Modal
          visible={showCompetitionModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCompetitionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>⚔️ Battle Setup ⚔️</Text>

              <Text style={styles.modalLabel}>Battle Length:</Text>
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[
                    styles.modalOptionButton,
                    competitionLength === 5 && styles.modalOptionButtonActive
                  ]}
                  onPress={() => setCompetitionLength(5)}
                >
                  <Text style={styles.modalOptionText}>5 Games</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalOptionButton,
                    competitionLength === 7 && styles.modalOptionButtonActive
                  ]}
                  onPress={() => setCompetitionLength(7)}
                >
                  <Text style={styles.modalOptionText}>7 Games</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Player 1:</Text>
              <TextInput
                style={styles.modalInput}
                value={competitor1Name}
                onChangeText={(text) => {
                  const value = text.replace(/[^a-zA-Z]/g, '').slice(0, 5);
                  if (value.toLowerCase() !== competitor2Name.toLowerCase()) {
                    setCompetitor1Name(value);
                  }
                }}
                maxLength={5}
                placeholder="Enter name"
              />

              <Text style={styles.modalLabel}>Player 2:</Text>
              <TextInput
                style={styles.modalInput}
                value={competitor2Name}
                onChangeText={(text) => {
                  const value = text.replace(/[^a-zA-Z]/g, '').slice(0, 5);
                  if (value.toLowerCase() !== competitor1Name.toLowerCase()) {
                    setCompetitor2Name(value);
                  }
                }}
                maxLength={5}
                placeholder="Enter name"
              />

              <Text style={styles.modalLabel}>Time for each move (seconds):</Text>
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[
                    styles.modalTimerButton,
                    timerOption === 3 && styles.modalOptionButtonActive
                  ]}
                  onPress={() => setTimerOption(3)}
                >
                  <Text style={styles.modalOptionText}>3</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalTimerButton,
                    timerOption === 15 && styles.modalOptionButtonActive
                  ]}
                  onPress={() => setTimerOption(15)}
                >
                  <Text style={styles.modalOptionText}>15</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalTimerButton,
                    timerOption === 30 && styles.modalOptionButtonActive
                  ]}
                  onPress={() => setTimerOption(30)}
                >
                  <Text style={styles.modalOptionText}>30</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalTimerButton,
                    timerOption === 0 && styles.modalOptionButtonActive
                  ]}
                  onPress={() => setTimerOption(0)}
                >
                  <Text style={styles.modalOptionText}>No timer</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.greenButton]}
                  onPress={() => {
                    setShowCompetitionModal(false);
                    setGameMode('competition');
                  }}
                >
                  <Text style={styles.modalActionText}>Start</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.grayButton]}
                  onPress={() => setShowCompetitionModal(false)}
                >
                  <Text style={styles.modalActionText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Handle AI submenu
  if (gameMode === 'show-ai-submenu') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          <View style={styles.submenuContainer}>
            <Text style={styles.submenuTitle}>🤖 AI Game Mode 🤖</Text>
            <Text style={styles.subtitle}>Do it for the human Race</Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.menuButton, styles.blueButton]}
                onPress={() => setShowDifficultyModal(true)}
              >
                <Text style={styles.buttonEmoji}>🤖</Text>
                <Text style={styles.buttonText}>Classic</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuButton, styles.purpleButton]}
                onPress={() => setGameMode('adventure-game')}
              >
                <Text style={styles.buttonEmoji}>🎯</Text>
                <Text style={styles.buttonText}>Adventure</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setGameMode('menu')}
            >
              <Text style={styles.buttonText}>Back to Menu</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

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
      </SafeAreaView>
    );
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
              style={[styles.menuButton, styles.greenButton]}
              onPress={() => setGameMode('show-take-turns-submenu')}
            >
              <Text style={styles.buttonEmoji}>👥</Text>
              <Text style={styles.buttonText}>Take Turns</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuButton, styles.blueButton]}
              onPress={() => setGameMode('show-ai-submenu')}
            >
              <Text style={styles.buttonEmoji}>🤖</Text>
              <Text style={styles.buttonText}>AI Game</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuButton, styles.orangeButton]}
              onPress={() => setGameMode('online-lobby')}
            >
              <Text style={styles.buttonEmoji}>🌐</Text>
              <Text style={styles.buttonText}>Online Multiplayer</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              🐝 © 2025 Bee-Five. Product of MindGrind 🐝
            </Text>
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










