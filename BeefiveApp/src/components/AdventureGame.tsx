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
  AppState,
} from 'react-native';
import { showExitConfirmation, setupBackButtonHandler } from '../utils/exitConfirmation';
import { getGameRules, GameRules, getTimeLimitForLevel, getAIDifficulty, getAdventureStartingPlayer } from '../utils/adventureGameRules';
import ClassicAIGame from './ClassicAIGame';
import { getStoryForGame, shouldShowStory, type StageStory } from '../data/stageStories';
import { getBeeFactForGame } from '../data/beeFacts';
import { useAuth } from '../contexts/AuthContext';
import { loadAdventureProgress, saveAdventureProgress, autoSaveProgress, syncLocalProgressToServer } from '../services/progressService';

// Match system helper functions
const isMultipleOf10 = (gameNumber: number): boolean => gameNumber % 10 === 0;
const isMultipleOf50 = (gameNumber: number): boolean => gameNumber % 50 === 0;

const requiresMatchSystem = (gameNumber: number): boolean => isMultipleOf10(gameNumber);

const getMatchType = (gameNumber: number): 'best-of-3' | 'best-of-5' | 'single' => {
  if (isMultipleOf50(gameNumber)) {
    return 'best-of-5';
  }
  if (requiresMatchSystem(gameNumber)) {
    return 'best-of-3';
  }
  return 'single';
};

const getRequiredWins = (gameNumber: number): number => {
  const matchType = getMatchType(gameNumber);
  switch (matchType) {
    case 'best-of-5':
      return 3;
    case 'best-of-3':
      return 2;
    default:
      return 1;
  }
};

const getTotalGames = (gameNumber: number): number => {
  const matchType = getMatchType(gameNumber);
  switch (matchType) {
    case 'best-of-5':
      return 5;
    case 'best-of-3':
      return 3;
    default:
      return 1;
  }
};

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
  initialGame?: number;
  autoStart?: boolean;
  onGameChange?: (gameNumber: number) => void;
}

export default function AdventureGame({ onBackToMenu, initialGame, autoStart, onGameChange }: AdventureGameProps) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  
  const [currentGame, setCurrentGame] = useState(initialGame || 1);
  const [gamesCompleted, setGamesCompleted] = useState<number[]>([]);
  const [highestUnlockedGame, setHighestUnlockedGame] = useState(1); // Start locked, unlock based on progress
  const [scrollY, setScrollY] = useState(0);
  const [progressLoadedUserId, setProgressLoadedUserId] = useState<string | null>(null);
  const [gamesWon, setGamesWon] = useState(0);
  const [selectedGameRules, setSelectedGameRules] = useState<GameRules | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isPlayingGame, setIsPlayingGame] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Match system state
  const [currentMatch, setCurrentMatch] = useState(1);
  const [playerWins, setPlayerWins] = useState(0);
  const [aiWins, setAiWins] = useState(0);
  const [isMatchComplete, setIsMatchComplete] = useState(false);
  const [isWaitingForNextGame, setIsWaitingForNextGame] = useState(false);
  const [countdownTimer, setCountdownTimer] = useState(0);
  const [showMatchWinnerAnnouncement, setShowMatchWinnerAnnouncement] = useState(false);
  const [matchWinnerMessage, setMatchWinnerMessage] = useState('');
  const lastAnnouncedMatchRef = useRef<string>('');
  const [gameProcessed, setGameProcessed] = useState(false);
  const popupScheduledRef = useRef<boolean>(false);
  const winPopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchResultsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingResultsPopup, setPendingResultsPopup] = useState(false);
  const [showResultsPopup, setShowResultsPopup] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false);
  
  // Story and fact state
  const [showStoryCarousel, setShowStoryCarousel] = useState(false);
  const [currentStory, setCurrentStory] = useState<StageStory | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showBeeFact, setShowBeeFact] = useState(false);
  const [currentBeeFact, setCurrentBeeFact] = useState<string | null>(null);
  
  // Handle exit confirmation
  const handleExit = () => {
    showExitConfirmation(onBackToMenu);
  };

  // Setup Android back button handler
  useEffect(() => {
    const cleanup = setupBackButtonHandler(onBackToMenu);
    return cleanup;
  }, [onBackToMenu]);
  
  // Load progress on mount and when user changes
  useEffect(() => {
    const loadProgress = async () => {
      // If user is logged in and we haven't loaded their progress yet
      if (user && progressLoadedUserId !== user.id) {
        try {
          const progress = await loadAdventureProgress(user.id);
          if (progress) {
            // Use initialGame if provided, otherwise use loaded progress
            const gameToSet = initialGame || progress.current_game || 1;
            setCurrentGame(gameToSet);
            // Ensure highestUnlockedGame is at least 1 (game 1 is always unlocked)
            const loadedHighest = Math.max(1, progress.highest_unlocked_game || 1);
            // If autoStart is true and initialGame is provided, trust that it's unlocked
            // (SimpleWelcome only allows clicking play on unlocked games)
            if (autoStart && initialGame && initialGame > loadedHighest) {
              setHighestUnlockedGame(initialGame);
            } else {
              setHighestUnlockedGame(loadedHighest);
            }
            setGamesCompleted(progress.games_completed || []);
            setGamesWon(progress.games_won || 0);
          } else if (initialGame) {
            // If no progress but initialGame provided, use it
            setCurrentGame(initialGame);
            // If autoStart is true, trust that initialGame is unlocked
            setHighestUnlockedGame(autoStart ? Math.max(1, initialGame) : 1);
          }
          setProgressLoadedUserId(user.id);
        } catch (error) {
          console.error('Error loading progress:', error);
          if (initialGame) {
            setCurrentGame(initialGame);
          }
          setProgressLoadedUserId(user.id); // Mark as attempted even on error
        }
      } else if (!user) {
        // Reset progress when user logs out
        setProgressLoadedUserId(null);
        setCurrentGame(initialGame || 1);
        setHighestUnlockedGame(1);
        setGamesCompleted([]);
        setGamesWon(0);
      }
    };
    loadProgress();
  }, [user, progressLoadedUserId, initialGame]);

  // Auto-start game if autoStart prop is true
  useEffect(() => {
    if (!autoStart) return;
    
    // Wait for progress to be loaded if user is logged in
    if (user && user.id && progressLoadedUserId !== user.id) {
      // Progress is still loading, wait for it
      return;
    }
    
    // If we're already playing or showing modals, don't start again
    if (isPlayingGame || showStoryCarousel || showBeeFact) {
      return;
    }
    
    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      // Double-check conditions after delay
      if (isPlayingGame || showStoryCarousel || showBeeFact) {
        return;
      }
      
      // Ensure highestUnlockedGame is at least 1 (game 1 is always unlocked)
      const effectiveHighestUnlocked = Math.max(1, highestUnlockedGame);
      // Ensure currentGame is at least 1
      const effectiveCurrentGame = Math.max(1, currentGame);
      
      // Game 1 is always unlocked, or check if currentGame is unlocked
      const canStart = effectiveCurrentGame === 1 || effectiveCurrentGame <= effectiveHighestUnlocked;
      
      if (!canStart) {
        return;
      }
      
      // Reset match state if starting a new game series
      if (requiresMatchSystem(effectiveCurrentGame)) {
        setCurrentMatch(1);
        setPlayerWins(0);
        setAiWins(0);
        setIsMatchComplete(false);
        setIsWaitingForNextGame(false);
        setCountdownTimer(0);
        setShowMatchWinnerAnnouncement(false);
        lastAnnouncedMatchRef.current = '';
      }
      
      // Check if we should show story first (at start of each stage)
      if (shouldShowStory(effectiveCurrentGame)) {
        const story = getStoryForGame(effectiveCurrentGame);
        if (story) {
          setCurrentStory(story);
          setCurrentSlideIndex(0);
          setShowStoryCarousel(true);
          return;
        }
      }
      
      // Check if we should show bee fact (every 10 games)
      const beeFact = getBeeFactForGame(effectiveCurrentGame);
      if (beeFact) {
        setCurrentBeeFact(beeFact);
        setShowBeeFact(true);
        return;
      }
      
      // No story or fact, start game directly
      setIsPlayingGame(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [autoStart, isPlayingGame, currentGame, highestUnlockedGame, showStoryCarousel, showBeeFact, user, progressLoadedUserId]);

  // Auto-save progress when it changes (debounced)
  useEffect(() => {
    if (user && progressLoadedUserId === user.id) {
      autoSaveProgress(user.id, {
        current_game: currentGame,
        highest_unlocked_game: highestUnlockedGame,
        games_completed: gamesCompleted,
        games_won: gamesWon,
      });
    }
  }, [currentGame, highestUnlockedGame, gamesCompleted, gamesWon, user, progressLoadedUserId]);

  // Save progress when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      if (user) {
        saveAdventureProgress(user.id, {
          current_game: currentGame,
          highest_unlocked_game: highestUnlockedGame,
          games_completed: gamesCompleted,
          games_won: gamesWon,
        });
      }
    };
  }, []); // Only run on unmount

  // Sync progress when app comes back to foreground (in case user was offline)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && user) {
        // App came to foreground, sync local progress to server
        syncLocalProgressToServer(user.id).catch((error) => {
          console.error('Error syncing progress:', error);
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user]);
  
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
    // For rules modal, we don't need match-specific rules, so currentMatch is optional
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
              // Reset match state if starting a new game series
              if (requiresMatchSystem(gameNumber)) {
                setCurrentMatch(1);
                setPlayerWins(0);
                setAiWins(0);
                setIsMatchComplete(false);
                setIsWaitingForNextGame(false);
                setCountdownTimer(0);
              }
              
              // Check if we should show story first (at start of each stage)
              if (shouldShowStory(gameNumber)) {
                const story = getStoryForGame(gameNumber);
                if (story) {
                  setCurrentStory(story);
                  setCurrentSlideIndex(0);
                  setShowStoryCarousel(true);
                  setGameInitialized(false);
                  setGameProcessed(false);
                  popupScheduledRef.current = false;
                  return;
                }
              }
              
              // Check if we should show bee fact (every 10 games)
              const beeFact = getBeeFactForGame(gameNumber);
              if (beeFact) {
                setCurrentBeeFact(beeFact);
                setShowBeeFact(true);
                setGameInitialized(false);
                setGameProcessed(false);
                popupScheduledRef.current = false;
                return;
              }
              
              // No story or fact, start game directly
              setIsPlayingGame(true);
              setGameInitialized(false); // Will be set to true when countdown starts
              setGameProcessed(false);
              popupScheduledRef.current = false;
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
        
        {/* Game number label - clickable */}
        <TouchableOpacity
          onPress={() => {
            if (!isLocked) {
              setCurrentGame(gameNumber);
              // Reset match state if starting a new game series
              if (requiresMatchSystem(gameNumber)) {
                setCurrentMatch(1);
                setPlayerWins(0);
                setAiWins(0);
                setIsMatchComplete(false);
                setIsWaitingForNextGame(false);
                setCountdownTimer(0);
              }
              
              // Check if we should show story first (at start of each stage)
              if (shouldShowStory(gameNumber)) {
                const story = getStoryForGame(gameNumber);
                if (story) {
                  setCurrentStory(story);
                  setCurrentSlideIndex(0);
                  setShowStoryCarousel(true);
                  setGameInitialized(false);
                  setGameProcessed(false);
                  popupScheduledRef.current = false;
                  return;
                }
              }
              
              // Check if we should show bee fact (every 10 games)
              const beeFact = getBeeFactForGame(gameNumber);
              if (beeFact) {
                setCurrentBeeFact(beeFact);
                setShowBeeFact(true);
                setGameInitialized(false);
                setGameProcessed(false);
                popupScheduledRef.current = false;
                return;
              }
              
              // No story or fact, start game directly
              setIsPlayingGame(true);
              setGameInitialized(false); // Will be set to true when countdown starts
              setGameProcessed(false);
              popupScheduledRef.current = false;
            }
          }}
          disabled={isLocked}
          style={styles.gameLabel}
        >
          <Text style={[styles.gameNumberText, isLocked && styles.gameNumberTextLocked]}>
            {gameNumber}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Auto-scroll to current game when map opens or currentGame changes
  useEffect(() => {
    if (scrollViewRef.current && !isPlayingGame) {
      const spacing = isMobile ? 60 : 80;
      const totalHeight = TOTAL_GAMES * spacing;
      
      // Calculate the Y position of the current game (from bottom to top)
      const gameIndex = currentGame - 1;
      const gameY = totalHeight - (gameIndex * spacing);
      
      // Scroll to position the current game in the center of the viewport
      const scrollToY = Math.max(0, gameY - SCREEN_HEIGHT / 2);
      
      // Use multiple timeouts to ensure the ScrollView is fully rendered and laid out
      const timeoutId1 = setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            y: scrollToY,
            animated: false, // First scroll without animation for immediate positioning
          });
        }
      }, 100);
      
      const timeoutId2 = setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            y: scrollToY,
            animated: true, // Then smooth scroll to final position
          });
        }
      }, 400);
      
      return () => {
        clearTimeout(timeoutId1);
        clearTimeout(timeoutId2);
      };
    }
  }, [currentGame, isPlayingGame]);

  const totalHeight = TOTAL_GAMES * (isMobile ? 60 : 80);

  // Handle starting a game
  const handleStartGame = () => {
    if (currentGame <= highestUnlockedGame) {
      // Reset match state if starting a new game series
      if (requiresMatchSystem(currentGame)) {
        setCurrentMatch(1);
        setPlayerWins(0);
        setAiWins(0);
        setIsMatchComplete(false);
        setIsWaitingForNextGame(false);
        setCountdownTimer(0);
        setShowMatchWinnerAnnouncement(false);
        lastAnnouncedMatchRef.current = '';
      }
      
      // Check if we should show story first (at start of each stage)
      if (shouldShowStory(currentGame)) {
        const story = getStoryForGame(currentGame);
        if (story) {
          setCurrentStory(story);
          setCurrentSlideIndex(0);
          setShowStoryCarousel(true);
          return; // Don't start game yet, wait for story to finish
        }
      }
      
      // Check if we should show bee fact (every 10 games)
      const beeFact = getBeeFactForGame(currentGame);
      if (beeFact) {
        setCurrentBeeFact(beeFact);
        setShowBeeFact(true);
        return; // Don't start game yet, wait for fact to be dismissed
      }
      
      // No story or fact, start game directly
      setIsPlayingGame(true);
    }
  };

  // Handle game completion - return to map or menu
  const handleGameComplete = (won: boolean = false) => {
    setIsPlayingGame(false);
    
    // If autoStart was used, go back to menu instead of showing map
    if (autoStart) {
      // Save progress before going back
      if (user) {
        saveAdventureProgress(user.id, {
          current_game: currentGame,
          highest_unlocked_game: highestUnlockedGame,
          games_completed: gamesCompleted,
          games_won: gamesWon,
        });
      }
      onBackToMenu();
      return;
    }
    
    // For match games, update match scores
    if (requiresMatchSystem(currentGame)) {
      if (won) {
        setPlayerWins(prev => prev + 1);
      } else {
        setAiWins(prev => prev + 1);
      }
    }
    
    // Mark game as completed if not already
    if (!gamesCompleted.includes(currentGame)) {
      setGamesCompleted([...gamesCompleted, currentGame]);
    }
    
    // For non-match games, unlock next game if needed
    if (!requiresMatchSystem(currentGame)) {
      if (currentGame === highestUnlockedGame && highestUnlockedGame < TOTAL_GAMES) {
        setHighestUnlockedGame(highestUnlockedGame + 1);
      }
    }
  };

  // Handle game win (for match system) - matches bee-five-web exactly
  const handleGameWin = (won: boolean) => {
    // Don't process if already processed
    if (gameProcessed && popupScheduledRef.current) {
      return;
    }
    
    setGameProcessed(true);
    popupScheduledRef.current = true;
    
    if (!requiresMatchSystem(currentGame)) {
      // Non-match game: proceed normally
      if (won) {
        // Unlock next game when current game is won
        setHighestUnlockedGame(prev => Math.max(prev, currentGame + 1));
        // Track games won
        setGamesWon(prev => prev + 1);
      }
      setGamesCompleted(prev => {
        if (!prev.includes(currentGame)) {
          return [...prev, currentGame];
        }
        return prev;
      });
      return;
    }
    
    // Match game: update scores (matches bee-five-web logic exactly)
    if (won) {
      setPlayerWins(prev => {
        const newPlayerWins = prev + 1;
        const requiredWins = getRequiredWins(currentGame);
        const totalGames = getTotalGames(currentGame);
        
        // Check if match is complete after this win
        if (newPlayerWins >= requiredWins || currentMatch >= totalGames) {
          setIsMatchComplete(true);
          // Unlock next game when match is won
          setHighestUnlockedGame(prev => Math.max(prev, currentGame + 1));
          // Track games won
          setGamesWon(prev => prev + 1);
          setGamesCompleted(prev => {
            if (!prev.includes(currentGame)) {
              return [...prev, currentGame];
            }
            return prev;
          });
          // Queue results popup to appear after the win popup closes (only when series is complete)
          matchResultsTimerRef.current = setTimeout(() => {
            setPendingResultsPopup(true);
            matchResultsTimerRef.current = null;
          }, 1000);
        } else {
          // Match not complete: show winner announcement for 2 seconds, then countdown for 3 seconds
          const matchKey = `${currentGame}-${currentMatch}`;
          if (lastAnnouncedMatchRef.current !== matchKey) {
            setMatchWinnerMessage(`You won Match ${currentMatch}/${totalGames}! 🎉`);
            setShowMatchWinnerAnnouncement(true);
            lastAnnouncedMatchRef.current = matchKey;
            // After 2 seconds, hide announcement and start countdown
            setTimeout(() => {
              setShowMatchWinnerAnnouncement(false);
              setIsWaitingForNextGame(true);
              setCountdownTimer(3);
            }, 2000); // Show announcement for 2 seconds
          }
        }
        return newPlayerWins;
      });
    } else {
      setAiWins(prev => {
        const newAiWins = prev + 1;
        const requiredWins = getRequiredWins(currentGame);
        const totalGames = getTotalGames(currentGame);
        
        // Check if match is complete after this win (AI won the match)
        if (newAiWins >= requiredWins || currentMatch >= totalGames) {
          setIsMatchComplete(true);
          setGamesCompleted(prev => {
            if (!prev.includes(currentGame)) {
              return [...prev, currentGame];
            }
            return prev;
          });
          // Queue results popup to appear after the win popup closes (only when series is complete)
          // This will show the loss popup with "Play Again" and "Menu" options
          matchResultsTimerRef.current = setTimeout(() => {
            setPendingResultsPopup(true);
            matchResultsTimerRef.current = null;
          }, 1000);
        } else {
          // Match not complete: show winner announcement for 2 seconds, then countdown for 3 seconds
          const matchKey = `${currentGame}-${currentMatch}`;
          if (lastAnnouncedMatchRef.current !== matchKey) {
            setMatchWinnerMessage(`AI won Match ${currentMatch}/${totalGames}! 😔`);
            setShowMatchWinnerAnnouncement(true);
            lastAnnouncedMatchRef.current = matchKey;
            // After 2 seconds, hide announcement and start countdown
            setTimeout(() => {
              setShowMatchWinnerAnnouncement(false);
              setIsWaitingForNextGame(true);
              setCountdownTimer(3);
            }, 2000); // Show announcement for 2 seconds
          }
        }
        return newAiWins;
      });
    }
  };

  // Handle proceeding to next match or next game (matches bee-five-web)
  const handleNextGame = () => {
    setIsPlayingGame(false);
    if (winPopupTimerRef.current) {
      clearTimeout(winPopupTimerRef.current);
      winPopupTimerRef.current = null;
    }
    if (matchResultsTimerRef.current) {
      clearTimeout(matchResultsTimerRef.current);
      matchResultsTimerRef.current = null;
    }
    setPendingResultsPopup(false);
    setShowResultsPopup(false);
    popupScheduledRef.current = false;
    
    if (requiresMatchSystem(currentGame) && !isMatchComplete && !isWaitingForNextGame) {
      const requiredWins = getRequiredWins(currentGame);
      const totalGames = getTotalGames(currentGame);
      
      if (playerWins >= requiredWins || aiWins >= requiredWins || currentMatch >= totalGames) {
        setIsMatchComplete(true);
        setIsPlayingGame(false);
        setGameInitialized(false);
      } else {
        setIsWaitingForNextGame(true);
        setCountdownTimer(3);
      }
    } else if (requiresMatchSystem(currentGame) && isMatchComplete) {
      const nextGame = currentGame + 1;
      if (nextGame <= TOTAL_GAMES) {
        if (requiresMatchSystem(nextGame)) {
          setCurrentGame(nextGame);
          // Notify parent component of game change
          if (onGameChange) {
            onGameChange(nextGame);
          }
          setCurrentMatch(1);
          setPlayerWins(0);
          setAiWins(0);
          setIsMatchComplete(false);
          setCountdownTimer(0);
          setIsWaitingForNextGame(false);
          setGameProcessed(false);
          popupScheduledRef.current = false;
          setGameInitialized(false);
        } else {
          // If we've reached the end and autoStart is true, go back to menu
          if (autoStart) {
            // Save progress before going back
            if (user) {
              saveAdventureProgress(user.id, {
                current_game: currentGame,
                highest_unlocked_game: highestUnlockedGame,
                games_completed: gamesCompleted,
                games_won: gamesWon,
              });
            }
            onBackToMenu();
          } else {
            setIsPlayingGame(false);
            setGameInitialized(false);
          }
        }
      } else {
        // If we've reached the end and autoStart is true, go back to menu
        if (autoStart) {
          // Save progress before going back
          if (user) {
            saveAdventureProgress(user.id, {
              current_game: currentGame,
              highest_unlocked_game: highestUnlockedGame,
              games_completed: gamesCompleted,
              games_won: gamesWon,
            });
          }
          onBackToMenu();
        } else {
          setIsPlayingGame(false);
          setGameInitialized(false);
        }
      }
    } else {
      setIsPlayingGame(false);
      setGameInitialized(false);
    }
  };

  // Handle results popup next (matches bee-five-web)
  const handleResultsPopupNext = () => {
    if (matchResultsTimerRef.current) {
      clearTimeout(matchResultsTimerRef.current);
      matchResultsTimerRef.current = null;
    }
    setPendingResultsPopup(false);
    setShowResultsPopup(false);
    
    // Check if player won or lost
    const requiredWins = getRequiredWins(currentGame);
    const playerWon = playerWins >= requiredWins;
    
    if (playerWon) {
      // Player won: continue to next game
      const nextGame = currentGame + 1;
      if (nextGame <= TOTAL_GAMES) {
        setHighestUnlockedGame(prev => Math.max(prev, nextGame));
        setCurrentGame(nextGame);
        // Notify parent component of game change
        if (onGameChange) {
          onGameChange(nextGame);
        }
        setCurrentMatch(1);
        setPlayerWins(0);
        setAiWins(0);
        setIsMatchComplete(false);
        setCountdownTimer(0);
        setIsWaitingForNextGame(false);
        setGameProcessed(false);
        popupScheduledRef.current = false;
        setGameInitialized(false);
        
        // Check if we should show story first (at start of each stage)
        if (shouldShowStory(nextGame)) {
          const story = getStoryForGame(nextGame);
          if (story) {
            setCurrentStory(story);
            setCurrentSlideIndex(0);
            setShowStoryCarousel(true);
            setIsPlayingGame(false); // Exit game view to show story
            return;
          }
        }
        
        // Check if we should show bee fact (every 10 games)
        const beeFact = getBeeFactForGame(nextGame);
        if (beeFact) {
          setCurrentBeeFact(beeFact);
          setShowBeeFact(true);
          setIsPlayingGame(false); // Exit game view to show fact
          return;
        }
        
        // No story or fact, game will restart automatically via key prop change
      } else {
        // Reached end of adventure
        if (autoStart) {
          // Save progress before going back
          if (user) {
            saveAdventureProgress(user.id, {
              current_game: currentGame,
              highest_unlocked_game: highestUnlockedGame,
              games_completed: gamesCompleted,
              games_won: gamesWon,
            });
          }
          onBackToMenu();
        } else {
          setIsPlayingGame(false);
        }
      }
    } else {
      // Player lost: restart the same match series
      setCurrentMatch(1);
      setPlayerWins(0);
      setAiWins(0);
      setIsMatchComplete(false);
      setCountdownTimer(0);
      setIsWaitingForNextGame(false);
      setGameProcessed(false);
      popupScheduledRef.current = false;
      setGameInitialized(false);
      // Game will restart automatically via key prop change
    }
  };

  // Handle pending results popup (matches bee-five-web)
  useEffect(() => {
    if (pendingResultsPopup) {
      // Don't set isPlayingGame to false here - we need to show the popup while still in game mode
      // The popup will be shown in ClassicAIGame which is still rendered
      setShowResultsPopup(true);
      setPendingResultsPopup(false);
    }
  }, [pendingResultsPopup]);

  // Handle countdown for next match (matches bee-five-web)
  useEffect(() => {
    if (isWaitingForNextGame && countdownTimer > 0) {
      const timer = setTimeout(() => {
        setCountdownTimer(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isWaitingForNextGame && countdownTimer === 0) {
      // Reset waiting state and countdown before incrementing match to prevent duplicate countdown
      setIsWaitingForNextGame(false);
      setCountdownTimer(0);
      // Reset gameInitialized to ensure proper initialization of next match
      setGameInitialized(false);
      // Immediately increment match - no delay needed as countdown already finished
      setCurrentMatch(prev => prev + 1);
      setGameProcessed(false);
      popupScheduledRef.current = false;
      // Game will restart automatically via key prop change
    }
  }, [isWaitingForNextGame, countdownTimer]);

  // Show story carousel modal
  if (showStoryCarousel && currentStory) {
    const isLastSlide = currentSlideIndex === currentStory.slides.length - 1;
    
    return (
      <Modal
        visible={showStoryCarousel}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          // Don't allow closing via back button - must go through slides
        }}
      >
        <View style={styles.storyModalOverlay}>
          <View style={styles.storyModalContent}>
            <Text style={styles.storyTitle}>{currentStory.title}</Text>
            
            <View style={styles.storySlideContainer}>
              <Text style={styles.storySlideText}>
                {currentStory.slides[currentSlideIndex]}
              </Text>
            </View>
            
            {/* Slide indicators */}
            <View style={styles.slideIndicators}>
              {currentStory.slides.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.slideIndicator,
                    index === currentSlideIndex && styles.slideIndicatorActive,
                  ]}
                />
              ))}
            </View>
            
            {/* Navigation buttons */}
            <View style={styles.storyNavButtons}>
              <TouchableOpacity
                onPress={() => {
                  if (currentSlideIndex > 0) {
                    setCurrentSlideIndex(prev => prev - 1);
                  }
                }}
                disabled={currentSlideIndex === 0}
                style={[
                  styles.storyNavButton,
                  currentSlideIndex === 0 && styles.storyNavButtonDisabled,
                ]}
              >
                <Text style={styles.storyNavButtonText}>← Previous</Text>
              </TouchableOpacity>
              
              {!isLastSlide ? (
                <TouchableOpacity
                  onPress={() => {
                    setCurrentSlideIndex(prev => prev + 1);
                  }}
                  style={[styles.storyNavButton, styles.storyNavButtonPrimary]}
                >
                  <Text style={styles.storyNavButtonText}>Next →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setShowStoryCarousel(false);
                    setCurrentStory(null);
                    setCurrentSlideIndex(0);
                    
                    // After story, check for bee fact or start game
                    const beeFact = getBeeFactForGame(currentGame);
                    if (beeFact) {
                      setCurrentBeeFact(beeFact);
                      setShowBeeFact(true);
                    } else {
                      setIsPlayingGame(true);
                    }
                  }}
                  style={[styles.storyNavButton, styles.storyNavButtonBegin]}
                >
                  <Text style={styles.storyNavButtonText}>✨ Begin Journey ✨</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Show bee fact modal
  if (showBeeFact && currentBeeFact) {
    return (
      <Modal
        visible={showBeeFact}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          // Don't allow closing via back button - must click button
        }}
      >
        <View style={styles.factModalOverlay}>
          <View style={styles.factModalContent}>
            <Text style={styles.factTitle}>🐝 Bee Fact Time! 🐝</Text>
            <Text style={styles.factText}>{currentBeeFact}</Text>
            <TouchableOpacity
              onPress={() => {
                setShowBeeFact(false);
                setCurrentBeeFact(null);
                setIsPlayingGame(true);
              }}
              style={styles.factButton}
            >
              <Text style={styles.factButtonText}>✨ Start Game ✨</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // If playing a game, render the game component
  if (isPlayingGame) {
    // Pass currentMatch to getGameRules so it can determine blind play for multiples of 50 match 2
    const isMatchGame = requiresMatchSystem(currentGame);
    const gameRules = getGameRules(currentGame, isMatchGame ? currentMatch : undefined);
    
    return (
      <ClassicAIGame
        key={`${currentGame}-${currentMatch}`} // Force remount when game number or match changes
        onBackToMenu={handleExit} // Go to main menu with confirmation
        onBackToMap={() => {
          // If autoStart was used, go back to menu instead of map
          if (autoStart) {
            handleGameComplete(false);
            handleExit();
          } else {
            handleGameComplete(false);
          }
        }} // Go back to adventure map or menu
        initialDifficulty={gameRules.aiDifficulty}
        initialTimer={gameRules.timeLimit}
        backgroundColor={gameRules.startingPlayer === 1 ? 'yellow' : 'black'}
        onNextGame={handleNextGame} // Handle next game/map navigation
        onGameWin={handleGameWin} // Handle match win tracking
        showCountdown={isMatchGame ? (currentMatch === 1 && !isWaitingForNextGame) : true} // Only show start countdown for first match or non-match games, and not during between-match countdown
        gameNumber={currentGame} // Pass game number to enable obstacles
        currentMatch={isMatchGame ? currentMatch : undefined} // Pass current match for match games
        playerWins={isMatchGame ? playerWins : undefined}
        aiWins={isMatchGame ? aiWins : undefined}
        requiredWins={isMatchGame ? getRequiredWins(currentGame) : undefined}
        totalGames={isMatchGame ? getTotalGames(currentGame) : undefined}
        isMatchComplete={isMatchGame ? isMatchComplete : undefined}
        isWaitingForNextGame={isMatchGame ? isWaitingForNextGame : undefined}
        countdownTimer={isMatchGame ? countdownTimer : undefined}
        showMatchWinnerAnnouncement={isMatchGame ? showMatchWinnerAnnouncement : undefined}
        matchWinnerMessage={isMatchGame ? matchWinnerMessage : undefined}
        onGameInitialized={() => setGameInitialized(true)} // Callback when game is initialized
        gameInitialized={gameInitialized} // Pass initialization state
        showResultsPopup={isMatchGame && showResultsPopup && isMatchComplete}
        onResultsPopupNext={handleResultsPopupNext}
        onCloseResultsPopup={() => setShowResultsPopup(false)}
        onContinueToNextGame={() => {
          // Continue button: go directly to next game (matches bee-five-web)
          // Note: win popup is managed in ClassicAIGame, so we don't need to close it here
          setPendingResultsPopup(false);
          setShowResultsPopup(false);
          popupScheduledRef.current = false;
          
          // Mark current game as completed and unlock next game
          if (!gamesCompleted.includes(currentGame)) {
            setGamesCompleted(prev => [...prev, currentGame]);
          }
          const nextGame = currentGame + 1;
          if (nextGame <= TOTAL_GAMES) {
            // Unlock next game
            setHighestUnlockedGame(prev => Math.max(prev, nextGame));
            setCurrentGame(nextGame);
            // Notify parent component of game change
            if (onGameChange) {
              onGameChange(nextGame);
            }
            setCurrentMatch(1);
            setPlayerWins(0);
            setAiWins(0);
            setIsMatchComplete(false);
            setCountdownTimer(0);
            setIsWaitingForNextGame(false);
            setGameProcessed(false);
            setGameInitialized(false);
            
            // Check if we should show story first (at start of each stage)
            if (shouldShowStory(nextGame)) {
              const story = getStoryForGame(nextGame);
              if (story) {
                setCurrentStory(story);
                setCurrentSlideIndex(0);
                setShowStoryCarousel(true);
                setIsPlayingGame(false); // Exit game view to show story
                return;
              }
            }
            
            // Check if we should show bee fact (every 10 games)
            const beeFact = getBeeFactForGame(nextGame);
            if (beeFact) {
              setCurrentBeeFact(beeFact);
              setShowBeeFact(true);
              setIsPlayingGame(false); // Exit game view to show fact
              return;
            }
            
            // No story or fact, game will restart automatically via key prop change
          } else {
            // If we've reached the end and autoStart is true, go back to menu
            if (autoStart) {
              // Save progress before going back
              if (user) {
                saveAdventureProgress(user.id, {
                  current_game: currentGame,
                  highest_unlocked_game: highestUnlockedGame,
                  games_completed: gamesCompleted,
                  games_won: gamesWon,
                });
              }
              onBackToMenu();
            } else {
              // If we've reached the end, go back to map
              setIsPlayingGame(false);
            }
          }
        }}
      />
    );
  }

  // If autoStart is true, don't show the map - go directly to game
  // The map is now on the main page, so AdventureGame should only show the game
  if (autoStart) {
    // If we're not playing yet but autoStart is true, the game should start via useEffect
    // Just return null or a loading state while waiting for game to start
    // Story and bee fact modals will overlay on top, so we don't need to check for them here
    if (!isPlayingGame && !showStoryCarousel && !showBeeFact) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#90EE90' }}>
            <Text style={{ fontSize: 24, color: '#000' }}>🐝</Text>
            <Text style={{ fontSize: 16, color: '#000', marginTop: 10 }}>Loading game...</Text>
          </View>
        </SafeAreaView>
      );
    }
    // If autoStart is true, never render the map - only render game/story/fact components
    // Return an empty view (or minimal container) so modals can overlay
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, backgroundColor: '#90EE90' }} />
      </SafeAreaView>
    );
  }

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
          onPress={handleStartGame}
          disabled={currentGame > highestUnlockedGame}
        >
          <Text style={styles.playButtonText}>
            ▶️ Play Game {currentGame}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={handleExit}
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
                  handleStartGame();
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
  gameNumberTextLocked: {
    color: '#999999',
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
  // Story carousel modal styles
  storyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  storyModalContent: {
    backgroundColor: '#FFC30B',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 600,
    borderWidth: 4,
    borderColor: '#000',
    alignItems: 'center',
  },
  storyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 2,
  },
  storySlideContainer: {
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
  },
  storySlideText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#000',
    textAlign: 'center',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  slideIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  slideIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#999',
  },
  slideIndicatorActive: {
    width: 30,
    backgroundColor: '#4CAF50',
  },
  storyNavButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  storyNavButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#4CAF50',
    minWidth: 120,
    alignItems: 'center',
  },
  storyNavButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  storyNavButtonPrimary: {
    backgroundColor: '#4CAF50',
  },
  storyNavButtonBegin: {
    backgroundColor: '#4CAF50',
  },
  storyNavButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  // Bee fact modal styles
  factModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  factModalContent: {
    backgroundColor: '#FFC30B',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 500,
    borderWidth: 4,
    borderColor: '#000',
    alignItems: 'center',
  },
  factTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 2,
  },
  factText: {
    fontSize: 20,
    lineHeight: 30,
    color: '#000',
    marginBottom: 25,
    textAlign: 'center',
    fontWeight: '500',
  },
  factButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#4CAF50',
    minWidth: 180,
    alignItems: 'center',
  },
  factButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
});

