import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, TextInput, Dimensions, Animated } from 'react-native';
import { COLORS } from '../constants/colors';
import { DIMENSIONS } from '../constants/dimensions';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function TakeTurnsSubmenu({ onBackToMenu, onGameModeSelect }) {
  const [showBattleModal, setShowBattleModal] = useState(false);
  const [battleLength, setBattleLength] = useState(5);
  const [player1Name, setPlayer1Name] = useState('A');
  const [player2Name, setPlayer2Name] = useState('B');
  const [timerOption, setTimerOption] = useState(15);
  
  // Bee animation state
  const [beePos, setBeePos] = useState({ x: 0, y: 0 });
  const beeProgress = useRef(0);
  const beeScale = useRef(new Animated.Value(1)).current;
  const animationFrameRef = useRef(null);

  const handleSingleGame = () => {
    if (onGameModeSelect) {
      onGameModeSelect('local-multiplayer');
    }
  };

  const handleBattleStart = () => {
    setShowBattleModal(false);
    if (onGameModeSelect) {
      onGameModeSelect('battle', {
        battleLength,
        player1Name,
        player2Name,
        timerOption
      });
    }
  };

  // Animate bee
  useEffect(() => {
    // Calculate contentCard boundaries (90% width, 75% height, centered)
    const cardWidth = Math.min(SCREEN_WIDTH * 0.9, 400);
    const cardHeight = SCREEN_HEIGHT * 0.75;
    const cardLeft = (SCREEN_WIDTH - cardWidth) / 2;
    const cardTop = (SCREEN_HEIGHT - cardHeight) / 2;
    
    // Card boundaries with padding to keep bee within borders
    const padding = 30; // Padding from borders
    // Card center relative to card itself (not screen)
    const cardCenterX = cardWidth / 2;
    const cardCenterY = cardHeight / 2;
    const maxRadiusX = (cardWidth / 2) - padding;
    const maxRadiusY = (cardHeight / 2) - padding;
    const beeOffset = DIMENSIONS.BEE_SMALL_OFFSET;

    // Initialize bee position (relative to card, not screen)
    beeProgress.current = 0;
    setBeePos({ 
      x: cardCenterX - beeOffset, 
      y: cardCenterY - beeOffset 
    });

    // Animation loop
    let lastTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;

      // Bee: Circular path within card boundaries (relative to card)
      beeProgress.current += deltaTime / 8;
      if (beeProgress.current >= 1) beeProgress.current -= 1;
      const angle = beeProgress.current * Math.PI * 2;
      const radius = Math.min(maxRadiusX, maxRadiusY);
      setBeePos({
        x: cardCenterX + radius * Math.cos(angle) - beeOffset,
        y: cardCenterY + radius * Math.sin(angle) - beeOffset,
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Buzzing animation
    const createBuzz = () => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(beeScale, {
            toValue: 1.15,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(beeScale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const beeBuzz = createBuzz();
    beeBuzz.start();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      beeBuzz.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Main content card */}
      <View style={styles.contentCard}>
        {/* Moving Bee - inside card */}
        <Animated.View
          style={[
            styles.beeContainer,
            {
              left: beePos.x,
              top: beePos.y,
              transform: [{ scale: beeScale }],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.beeEmoji}>🐝</Text>
        </Animated.View>
        {/* Take Turns submenu title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>👥 Take Turns</Text>
          <Text style={styles.subtitle}>Let's settle This!</Text>
        </View>

        {/* Submenu buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.singleGameButton]}
            onPress={handleSingleGame}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonEmoji}>🤝</Text>
            <Text style={styles.buttonText}>Single Game</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.battleButton]}
            onPress={() => setShowBattleModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonEmoji}>⚔️</Text>
            <Text style={styles.buttonText}>Battle</Text>
          </TouchableOpacity>
        </View>

        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackToMenu}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>Back to Menu</Text>
        </TouchableOpacity>
      </View>

      {/* Battle Setup Modal */}
      <Modal
        visible={showBattleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBattleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚔️ Battle Setup ⚔️</Text>
            
            {/* Battle Length */}
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Battle Length:</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    battleLength === 5 && styles.optionButtonActive
                  ]}
                  onPress={() => setBattleLength(5)}
                >
                  <Text style={[
                    styles.optionButtonText,
                    battleLength === 5 && styles.optionButtonTextActive
                  ]}>
                    5 Games
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    battleLength === 7 && styles.optionButtonActive
                  ]}
                  onPress={() => setBattleLength(7)}
                >
                  <Text style={[
                    styles.optionButtonText,
                    battleLength === 7 && styles.optionButtonTextActive
                  ]}>
                    7 Games
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Player Names */}
            <View style={styles.modalSection}>
              <View style={styles.nameInputRow}>
                <View style={styles.nameInputContainer}>
                  <Text style={styles.modalLabel}>Player 1:</Text>
                  <TextInput
                    style={styles.nameInput}
                    value={player1Name}
                    onChangeText={(text) => {
                      const value = text.replace(/[^a-zA-Z]/g, '').slice(0, 5);
                      if (value.toLowerCase() !== player2Name.toLowerCase()) {
                        setPlayer1Name(value);
                      }
                    }}
                    maxLength={5}
                    placeholder="Enter name"
                  />
                </View>
                <View style={styles.nameInputContainer}>
                  <Text style={styles.modalLabel}>Player 2:</Text>
                  <TextInput
                    style={styles.nameInput}
                    value={player2Name}
                    onChangeText={(text) => {
                      const value = text.replace(/[^a-zA-Z]/g, '').slice(0, 5);
                      if (value.toLowerCase() !== player1Name.toLowerCase()) {
                        setPlayer2Name(value);
                      }
                    }}
                    maxLength={5}
                    placeholder="Enter name"
                  />
                </View>
              </View>
            </View>

            {/* Timer Options */}
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Time for each move in seconds:</Text>
              <View style={styles.timerRow}>
                {[3, 15, 30, 0].map((timer) => (
                  <TouchableOpacity
                    key={timer}
                    style={[
                      styles.timerButton,
                      timerOption === timer && styles.timerButtonActive
                    ]}
                    onPress={() => setTimerOption(timer)}
                  >
                    <Text style={[
                      styles.timerButtonText,
                      timerOption === timer && styles.timerButtonTextActive
                    ]}>
                      {timer === 0 ? 'no timer' : timer}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Modal Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.startButton]}
                onPress={handleBattleStart}
              >
                <Text style={styles.modalButtonText}>Start</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowBattleModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 25,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    height: '75%', // 6/8 of screen = 75%
    minHeight: 400,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.PRIMARY,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
    overflow: 'visible', // Allow bee to be visible
  },
  beeContainer: {
    position: 'absolute',
    width: DIMENSIONS.BEE_SMALL_SIZE,
    height: DIMENSIONS.BEE_SMALL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    elevation: 100, // Higher than contentCard
  },
  beeEmoji: {
    fontSize: DIMENSIONS.BEE_SMALL_EMOJI,
    textShadowColor: COLORS.BEE_SHADOW || 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  titleContainer: {
    marginTop: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    textShadowColor: '#000',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
    marginTop: 40,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: COLORS.PRIMARY,
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  singleGameButton: {
    backgroundColor: '#4CAF50',
  },
  battleButton: {
    backgroundColor: '#FF6B35',
  },
  buttonEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#666',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    borderWidth: 4,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#4CAF50',
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  optionButtonTextActive: {
    color: '#ffffff',
  },
  nameInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameInputContainer: {
    flex: 1,
  },
  nameInput: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    color: '#333',
  },
  timerRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  timerButton: {
    flex: 1,
    minWidth: 60,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
  },
  timerButtonActive: {
    backgroundColor: '#4CAF50',
  },
  timerButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  timerButtonTextActive: {
    color: '#ffffff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    minHeight: 52,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

