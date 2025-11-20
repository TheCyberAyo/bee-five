import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  SafeAreaView,
  Image,
  Animated,
  Modal,
} from 'react-native';
import { getGameRules, GameRules } from '../utils/adventureGameRules';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isMobile = SCREEN_WIDTH <= 768;
const TOTAL_GAMES = 2000;

// Adventure stages
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

interface AdventureGameProps {
  onBackToMenu: () => void;
}

export default function AdventureGame({ onBackToMenu }: AdventureGameProps) {
  const [currentGame, setCurrentGame] = useState(1);
  const [gamesCompleted, setGamesCompleted] = useState<number[]>([]);
  const [highestUnlockedGame, setHighestUnlockedGame] = useState(TOTAL_GAMES); // Unlock all for now
  const [scrollY, setScrollY] = useState(0);
  const [selectedGameRules, setSelectedGameRules] = useState<GameRules | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Calculate visible range based on scroll position
  const getVisibleRange = () => {
    const viewportHeight = SCREEN_HEIGHT;
    const spacing = isMobile ? 60 : 80;
    const totalHeight = TOTAL_GAMES * spacing;
    
    // Calculate which games are visible in viewport with buffer
    const buffer = viewportHeight * 1.5; // Render 1.5x viewport above and below
    const startY = Math.max(0, scrollY - buffer);
    const endY = scrollY + viewportHeight + buffer;
    
    // Convert Y position to game number (games flow from bottom to top)
    const startGame = Math.max(1, Math.floor((totalHeight - endY) / spacing) + 1);
    const endGame = Math.min(TOTAL_GAMES, Math.floor((totalHeight - startY) / spacing) + 1);
    
    return { startGame: Math.max(1, startGame - 10), endGame: Math.min(TOTAL_GAMES, endGame + 10) };
  };
  
  const visibleRange = getVisibleRange();

  // Calculate game position for creative flowing S-curve layout
  const getGamePosition = (gameNumber: number) => {
    const gameIndex = gameNumber - 1;
    const spacing = isMobile ? 60 : 80;
    const totalHeight = TOTAL_GAMES * spacing;
    
    // Calculate Y position (from bottom to top, flowing upward)
    const y = totalHeight - (gameIndex * spacing);
    
    // Creative S-curve pattern with smooth transitions
    const gamesPerSide = 4;
    const sideIndex = Math.floor(gameIndex / gamesPerSide);
    const positionInSide = gameIndex % gamesPerSide;
    
    // Smooth S-curve with inner/outer positioning
    let x;
    if (isMobile) {
      // Mobile: conservative positioning for visibility
      if (sideIndex % 2 === 0) {
        // Even sides: left side
        if (positionInSide === 0) x = 15;
        else if (positionInSide === 1) x = 25;
        else if (positionInSide === 2) x = 35;
        else x = 45;
      } else {
        // Odd sides: right side
        if (positionInSide === 0) x = 55;
        else if (positionInSide === 1) x = 65;
        else if (positionInSide === 2) x = 55;
        else x = 45;
      }
    } else {
      // Desktop: more dramatic S-curve
      if (sideIndex % 2 === 0) {
        // Even sides: left side
        if (positionInSide < 2) {
          x = 8 + (positionInSide * 12);
        } else {
          x = 28 + ((positionInSide - 2) * 12);
        }
      } else {
        // Odd sides: right side
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

  // Get stage for a game number
  const getStageForGame = (gameNumber: number) => {
    for (let i = ADVENTURE_STAGES.length - 1; i >= 0; i--) {
      if (gameNumber >= ADVENTURE_STAGES[i].games) {
        return ADVENTURE_STAGES[i];
      }
    }
    return ADVENTURE_STAGES[0];
  };

  // Render game location pin
  const renderGameLocation = (gameNumber: number) => {
    const position = getGamePosition(gameNumber);
    const isCompleted = gamesCompleted.includes(gameNumber);
    const isCurrent = gameNumber === currentGame;
    const isLocked = gameNumber > highestUnlockedGame;
    const stage = getStageForGame(gameNumber);
    const rules = getGameRules(gameNumber);

    return (
      <View
        key={gameNumber}
        style={[
          styles.gamePinContainer,
          {
            left: `${position.left}%`,
            top: position.top,
          },
        ]}
      >
        {/* Pin head with rules icon */}
        <TouchableOpacity
          onPress={() => {
            if (!isLocked) {
              setCurrentGame(gameNumber);
              setSelectedGameRules(rules);
              setShowRulesModal(true);
            }
          }}
          disabled={isLocked}
          style={[
            styles.pinHead,
            isCurrent && styles.pinHeadCurrent,
            isCompleted && styles.pinHeadCompleted,
            isLocked && styles.pinHeadLocked,
          ]}
        >
          {isLocked && <Text style={styles.lockIcon}>🔒</Text>}
          {isCurrent && !isLocked && <Text style={styles.starIcon}>★</Text>}
          {!isLocked && !isCurrent && rules.icon !== '🎮' && (
            <Text style={styles.ruleIcon}>{rules.icon}</Text>
          )}
        </TouchableOpacity>
        
        {/* Pin point */}
        <View
          style={[
            styles.pinPoint,
            isCompleted && styles.pinPointCompleted,
            isCurrent && styles.pinPointCurrent,
          ]}
        />
        
        {/* Game number label */}
        <View style={styles.gameLabel}>
          <Text style={styles.gameNumberText}>{gameNumber}</Text>
        </View>
      </View>
    );
  };

  // Auto-scroll to current game
  useEffect(() => {
    if (scrollViewRef.current) {
      const position = getGamePosition(currentGame);
      const scrollToY = Math.max(0, position.top - SCREEN_HEIGHT / 2);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: scrollToY,
          animated: true,
        });
      }, 100);
    }
  }, [currentGame]);

  const totalHeight = TOTAL_GAMES * (isMobile ? 60 : 80);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/BEE-FIVE.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.headerTitle}>Bee Adventure</Text>
        <Text style={styles.headerSubtitle}>Guide a life to greatness</Text>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { height: totalHeight }]}
          showsVerticalScrollIndicator={true}
          onScroll={(event) => {
            setScrollY(event.nativeEvent.contentOffset.y);
          }}
          scrollEventThrottle={16}
        >
          {/* Background gradient */}
          <View style={styles.mapBackground} />
          
          {/* Decorative background elements - Render around visible area */}
          {Array.from({ length: 50 }, (_, i) => {
            const baseGame = visibleRange.startGame;
            const gameIndex = baseGame + (i * 5);
            if (gameIndex < 1 || gameIndex > TOTAL_GAMES) return null;
            
            const position = getGamePosition(gameIndex);
            const decorations = ['🌿', '🌱', '🍃', '🌾', '🌺', '🌸', '🌻', '⭐', '✨', '🌼', '🌷', '🌹', '🍀', '🌵'];
            const decoration = decorations[i % decorations.length];
            
            return (
              <View
                key={`decoration-${i}-${gameIndex}`}
                style={[
                  styles.decoration,
                  {
                    left: `${(i % 4) * 25 + 5}%`,
                    top: position.top + ((i % 3) * 50 - 50),
                  },
                ]}
              >
                <Text style={styles.decorationText}>{decoration}</Text>
              </View>
            );
          }).filter(Boolean)}

          {/* Flying bees - Render around visible area */}
          {Array.from({ length: 20 }, (_, i) => {
            const baseGame = visibleRange.startGame;
            const gameIndex = baseGame + (i * 3);
            if (gameIndex < 1 || gameIndex > TOTAL_GAMES) return null;
            
            const position = getGamePosition(gameIndex);
            
            return (
              <View
                key={`bee-${i}-${gameIndex}`}
                style={[
                  styles.flyingBee,
                  {
                    left: `${(i % 5) * 18 + 8}%`,
                    top: position.top + ((i % 4) * 40 - 60),
                  },
                ]}
              >
                <Text style={styles.beeEmoji}>🐝</Text>
              </View>
            );
          }).filter(Boolean)}

          {/* Game locations - Only render visible games for performance */}
          <View style={styles.gamesContainer}>
            {Array.from({ length: visibleRange.endGame - visibleRange.startGame + 1 }, (_, i) => {
              const gameNumber = visibleRange.startGame + i;
              if (gameNumber < 1 || gameNumber > TOTAL_GAMES) return null;
              return renderGameLocation(gameNumber);
            }).filter(Boolean)}
          </View>

          {/* Stage markers with creative design */}
          {ADVENTURE_STAGES.map((stage, index) => {
            const position = getGamePosition(stage.games);
            return (
              <View
                key={`stage-${index}`}
                style={[
                  styles.stageMarker,
                  {
                    left: '50%',
                    top: position.top - 40,
                    backgroundColor: stage.color,
                    transform: [{ translateX: -60 }],
                  },
                ]}
              >
                <View style={styles.stageMarkerContent}>
                  <Text style={styles.stageEmoji}>{stage.emoji}</Text>
                  <Text style={styles.stageText}>S{index + 1}</Text>
                  <Text style={styles.stageName} numberOfLines={1}>
                    {stage.name}
                  </Text>
                  <Text style={styles.stageGameNumber}>Game {stage.games}</Text>
                </View>
                {/* Stage description banner */}
                <View style={[styles.stageBanner, { backgroundColor: stage.color }]}>
                  <Text style={styles.stageDescription} numberOfLines={2}>
                    {stage.description}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Pathway line connecting games - Render visible segments */}
          <View style={styles.pathwayContainer}>
            {Array.from({ length: Math.min(30, Math.floor((visibleRange.endGame - visibleRange.startGame) / 5) + 5) }, (_, i) => {
              const gameNum = Math.max(1, visibleRange.startGame - 5 + (i * 5));
              if (gameNum >= TOTAL_GAMES) return null;
              
              const pos1 = getGamePosition(gameNum);
              const pos2 = getGamePosition(Math.min(gameNum + 5, TOTAL_GAMES));
              
              return (
                <View
                  key={`path-${i}-${gameNum}`}
                  style={[
                    styles.pathwaySegment,
                    {
                      left: `${(pos1.left + pos2.left) / 2}%`,
                      top: Math.min(pos1.top, pos2.top),
                      height: Math.abs(pos2.top - pos1.top),
                      backgroundColor: i % 2 === 0 ? '#FFC30B' : '#4CAF50',
                      opacity: 0.5,
                    },
                  ]}
                />
              );
            }).filter(Boolean)}
          </View>
        </ScrollView>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.playButton,
            currentGame > highestUnlockedGame && styles.playButtonDisabled,
          ]}
          onPress={() => {
            if (currentGame <= highestUnlockedGame) {
              // TODO: Start game
              console.log(`Starting game ${currentGame}`);
            }
          }}
          disabled={currentGame > highestUnlockedGame}
        >
          <Text style={styles.playButtonText}>
            ▶️ Play Game {currentGame}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackToMenu}
        >
          <Text style={styles.backButtonText}>🏠 Back to Menu</Text>
        </TouchableOpacity>
      </View>

      {/* Game Rules Modal */}
      <Modal
        visible={showRulesModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRulesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedGameRules?.icon} Game {currentGame} Rules
            </Text>
            
            {selectedGameRules && (
              <>
                <View style={styles.rulesSection}>
                  <Text style={styles.rulesLabel}>⏱️ Time Limit:</Text>
                  <Text style={styles.rulesValue}>{selectedGameRules.timeLimit}s</Text>
                </View>
                
                <View style={styles.rulesSection}>
                  <Text style={styles.rulesLabel}>👤 Starting Player:</Text>
                  <Text style={styles.rulesValue}>
                    {selectedGameRules.startingPlayer === 1 ? 'You' : 'AI'}
                  </Text>
                </View>
                
                <View style={styles.rulesSection}>
                  <Text style={styles.rulesLabel}>🤖 AI Difficulty:</Text>
                  <Text style={styles.rulesValue}>
                    {selectedGameRules.aiDifficulty === 'hard' ? '🔴 Hard' : 
                     selectedGameRules.aiDifficulty === 'medium' ? '🟡 Medium' : '🟢 Easy'}
                  </Text>
                </View>
                
                <View style={styles.difficultySection}>
                  <Text style={styles.difficultyLabel}>Difficulty Level:</Text>
                  <View style={[
                    styles.difficultyBadge,
                    selectedGameRules.difficultyLevel === 'Extreme' && styles.difficultyExtreme,
                    selectedGameRules.difficultyLevel === 'Very Hard' && styles.difficultyVeryHard,
                    selectedGameRules.difficultyLevel === 'Hard' && styles.difficultyHard,
                    selectedGameRules.difficultyLevel === 'Medium' && styles.difficultyMedium,
                    selectedGameRules.difficultyLevel === 'Easy' && styles.difficultyEasy,
                  ]}>
                    <Text style={styles.difficultyText}>
                      {selectedGameRules.difficultyLevel}
                    </Text>
                    <Text style={styles.difficultyScore}>
                      ({selectedGameRules.difficultyScore}/100)
                    </Text>
                  </View>
                </View>
                
                {selectedGameRules.isMatchGame && (
                  <View style={styles.rulesSection}>
                    <Text style={styles.rulesLabel}>🏆 Match Type:</Text>
                    <Text style={styles.rulesValue}>
                      {selectedGameRules.matchType === 'best-of-5' ? 'Best of 5' : 'Best of 3'}
                    </Text>
                  </View>
                )}
                
                <View style={styles.rulesList}>
                  <Text style={styles.rulesListTitle}>Special Rules:</Text>
                  {selectedGameRules.hasMudZones && (
                    <Text style={styles.ruleItem}>🌊 {selectedGameRules.mudZoneCount} Mud Zones</Text>
                  )}
                  {selectedGameRules.hasBlindPlay && (
                    <Text style={styles.ruleItem}>👁️ Blind Play Mode</Text>
                  )}
                  {selectedGameRules.hasProgressiveBlocks && (
                    <Text style={styles.ruleItem}>📈 Progressive Blocks</Text>
                  )}
                  {selectedGameRules.hasDisappearingBlocks && (
                    <Text style={styles.ruleItem}>💨 Disappearing Blocks</Text>
                  )}
                  {selectedGameRules.hasShiftingBlocks && (
                    <Text style={styles.ruleItem}>🔄 Shifting Blocks</Text>
                  )}
                  {selectedGameRules.hasBlockedCells && !selectedGameRules.hasProgressiveBlocks && 
                   !selectedGameRules.hasDisappearingBlocks && !selectedGameRules.hasShiftingBlocks && (
                    <Text style={styles.ruleItem}>
                      🚫 {selectedGameRules.blockedCellCount} Blocked Cells
                    </Text>
                  )}
                  {selectedGameRules.hasDisappearingPieces && (
                    <Text style={styles.ruleItem}>✨ Disappearing Pieces</Text>
                  )}
                  {selectedGameRules.hasPieceCapacity && (
                    <Text style={styles.ruleItem}>📊 Piece Capacity Limit</Text>
                  )}
                  {selectedGameRules.hasBoardRearrangement && (
                    <Text style={styles.ruleItem}>🔀 Board Rearrangement</Text>
                  )}
                  {selectedGameRules.hasPieceSwapping && (
                    <Text style={styles.ruleItem}>🔄 Piece Swapping</Text>
                  )}
                  {!selectedGameRules.hasMudZones && !selectedGameRules.hasBlindPlay && 
                   !selectedGameRules.hasBlockedCells && !selectedGameRules.hasDisappearingPieces &&
                   !selectedGameRules.hasPieceCapacity && !selectedGameRules.isMatchGame && (
                    <Text style={styles.ruleItem}>✅ Standard Game</Text>
                  )}
                </View>
              </>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.playModalButton]}
                onPress={() => {
                  setShowRulesModal(false);
                  // TODO: Start game with these rules
                  console.log(`Starting game ${currentGame} with rules:`, selectedGameRules);
                }}
              >
                <Text style={styles.modalButtonText}>▶️ Play Game</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.closeModalButton]}
                onPress={() => setShowRulesModal(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#90EE90',
  },
  header: {
    paddingTop: 25,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  logoContainer: {
    width: 150,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#4CAF50',
    marginTop: 5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFC30B',
    marginTop: 5,
  },
  mapContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#FFC30B',
    overflow: 'hidden',
    backgroundColor: '#F0FFF0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    position: 'relative',
  },
  mapBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F0FFF0',
    // Gradient-like effect using multiple layers
  },
  decoration: {
    position: 'absolute',
    opacity: 0.5,
    zIndex: 1,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  decorationText: {
    fontSize: 20,
  },
  flyingBee: {
    position: 'absolute',
    opacity: 0.7,
    zIndex: 3,
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beeEmoji: {
    fontSize: 22,
  },
  pathwayContainer: {
    position: 'absolute',
    width: '100%',
    zIndex: 0,
  },
  pathwaySegment: {
    position: 'absolute',
    width: 4,
    borderRadius: 2,
  },
  gamesContainer: {
    position: 'absolute',
    width: '100%',
  },
  gamePinContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 2,
  },
  pinHead: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFC30B',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  pinHeadCurrent: {
    backgroundColor: '#FFC30B',
    borderWidth: 3,
    transform: [{ scale: 1.3 }],
  },
  pinHeadCompleted: {
    backgroundColor: '#4CAF50',
  },
  pinHeadLocked: {
    backgroundColor: '#666666',
    opacity: 0.4,
  },
  lockIcon: {
    fontSize: 10,
    color: '#fff',
  },
  starIcon: {
    fontSize: 10,
    color: '#fff',
  },
  pinPoint: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFC30B',
    marginTop: -1,
    zIndex: 1,
  },
  pinPointCompleted: {
    borderTopColor: '#4CAF50',
  },
  pinPointCurrent: {
    borderTopColor: '#FFC30B',
  },
  gameLabel: {
    marginTop: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    minWidth: 20,
    alignItems: 'center',
  },
  gameNumberText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  stageMarker: {
    position: 'absolute',
    alignItems: 'center',
    width: 120,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#000',
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  stageMarkerContent: {
    alignItems: 'center',
    padding: 8,
  },
  stageEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  stageText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  stageName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 2,
  },
  stageGameNumber: {
    fontSize: 9,
    color: '#333',
    fontWeight: '600',
  },
  stageBanner: {
    width: '100%',
    padding: 6,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopWidth: 2,
    borderTopColor: '#000',
  },
  stageDescription: {
    fontSize: 8,
    color: '#000',
    textAlign: 'center',
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 2,
    borderTopColor: '#FFC30B',
  },
  playButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    minWidth: 150,
    alignItems: 'center',
  },
  playButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    backgroundColor: '#FFC30B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    minWidth: 150,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  ruleIcon: {
    fontSize: 12,
  },
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
    padding: 25,
    width: '90%',
    maxWidth: 400,
    borderWidth: 4,
    borderColor: '#000',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  rulesSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.2)',
  },
  rulesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  rulesValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  rulesList: {
    marginTop: 15,
    marginBottom: 20,
  },
  rulesListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  ruleItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    paddingLeft: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    minWidth: 120,
    alignItems: 'center',
  },
  playModalButton: {
    backgroundColor: '#4CAF50',
  },
  closeModalButton: {
    backgroundColor: '#2196F3',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  difficultySection: {
    marginTop: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  difficultyLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  difficultyBadge: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#000',
    alignItems: 'center',
    minWidth: 200,
  },
  difficultyEasy: {
    backgroundColor: '#4CAF50',
  },
  difficultyMedium: {
    backgroundColor: '#FFC30B',
  },
  difficultyHard: {
    backgroundColor: '#FF9800',
  },
  difficultyVeryHard: {
    backgroundColor: '#F44336',
  },
  difficultyExtreme: {
    backgroundColor: '#9C27B0',
  },
  difficultyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  difficultyScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 4,
    opacity: 0.9,
  },
});

