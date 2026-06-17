"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getGameRules, type GameRules } from '../utils/adventureGameRules';
import AdventureClassicAIGame from './AdventureClassicAIGame';
import { getStoryForGame, shouldShowStory, type StageStory } from '../data/stageStories';
import { getBeeFactForGame } from '../data/beeFacts';
import { useAuth } from '../contexts/AuthContext';
import {
  loadSessionAdventureProgress,
  saveSessionAdventureProgress,
  autoSaveSessionProgress,
  syncLocalProgressToServer,
} from '../services/progressService';
import {
  TOTAL_GAMES,
  ADVENTURE_STAGES,
  requiresMatchSystem,
  getRequiredWins,
  getTotalGames,
} from '../utils/adventureConstants';
import { onAdventureLevelWon } from '../services/xpService';

interface AdventureGameProps {
  onBackToMenu: () => void;
  initialGame?: number;
  autoStart?: boolean;
  onGameChange?: (gameNumber: number) => void;
}

export default function AdventureGame({
  onBackToMenu,
  initialGame,
  autoStart,
  onGameChange,
}: AdventureGameProps) {
  const { user } = useAuth();

  const [currentGame, setCurrentGame] = useState(initialGame || 1);
  const [gamesCompleted, setGamesCompleted] = useState<number[]>([]);
  const [highestUnlockedGame, setHighestUnlockedGame] = useState(1);
  const [scrollY, setScrollY] = useState(0);
  const [progressLoadedUserId, setProgressLoadedUserId] = useState<string | null>(null);
  const [gamesWon, setGamesWon] = useState(0);
  const [selectedGameRules] = useState<GameRules | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isPlayingGame, setIsPlayingGame] = useState(false);
  const scrollViewRef = useRef<HTMLDivElement>(null);

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

  const [showStoryCarousel, setShowStoryCarousel] = useState(false);
  const [currentStory, setCurrentStory] = useState<StageStory | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showBeeFact, setShowBeeFact] = useState(false);
  const [currentBeeFact, setCurrentBeeFact] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [screenHeight, setScreenHeight] = useState(800);

  useEffect(() => {
    const updateDimensions = () => {
      setIsMobile(window.innerWidth <= 768);
      setScreenHeight(window.innerHeight);
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleExit = () => {
    if (window.confirm('Are you sure you want to exit the game?')) {
      onBackToMenu();
    }
  };

  const sessionUserId = user?.id ?? null;
  const progressKey = sessionUserId ?? 'guest';

  const awardAdventureLevelXp = useCallback(
    (levelJustCompleted: number) => {
      const highestForFrontier =
        highestUnlockedGame === levelJustCompleted + 1
          ? levelJustCompleted
          : highestUnlockedGame;
      onAdventureLevelWon(levelJustCompleted, {
        adventureContext: {
          currentLevel: currentGame,
          highestUnlocked: Math.max(currentGame, highestForFrontier),
        },
        userId: sessionUserId,
      });
    },
    [currentGame, highestUnlockedGame, sessionUserId]
  );

  useEffect(() => {
    const loadProgress = async () => {
      if (progressLoadedUserId !== progressKey) {
        try {
          const progress = await loadSessionAdventureProgress(sessionUserId);
          if (progress) {
            const gameToSet = initialGame || progress.current_game || 1;
            setCurrentGame(gameToSet);
            const loadedHighest = Math.max(1, progress.highest_unlocked_game || 1);
            if (autoStart && initialGame && initialGame > loadedHighest) {
              setHighestUnlockedGame(initialGame);
            } else {
              setHighestUnlockedGame(loadedHighest);
            }
            setGamesCompleted(progress.games_completed || []);
            setGamesWon(progress.games_won || 0);
          } else if (initialGame) {
            setCurrentGame(initialGame);
            setHighestUnlockedGame(autoStart ? Math.max(1, initialGame) : 1);
          }
          setProgressLoadedUserId(progressKey);
        } catch (error) {
          console.error('Error loading progress:', error);
          if (initialGame) {
            setCurrentGame(initialGame);
          }
          setProgressLoadedUserId(progressKey);
        }
      }
    };
    loadProgress();
  }, [sessionUserId, progressLoadedUserId, progressKey, initialGame, autoStart]);

  useEffect(() => {
    if (!autoStart) return;

    if (progressLoadedUserId !== progressKey) {
      return;
    }

    if (isPlayingGame || showStoryCarousel || showBeeFact) {
      return;
    }

    const timer = setTimeout(() => {
      if (isPlayingGame || showStoryCarousel || showBeeFact) {
        return;
      }

      const effectiveHighestUnlocked = Math.max(1, highestUnlockedGame);
      const effectiveCurrentGame = Math.max(1, currentGame);
      const canStart = effectiveCurrentGame === 1 || effectiveCurrentGame <= effectiveHighestUnlocked;

      if (!canStart) {
        return;
      }

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

      if (shouldShowStory(effectiveCurrentGame)) {
        const story = getStoryForGame(effectiveCurrentGame);
        if (story) {
          setCurrentStory(story);
          setCurrentSlideIndex(0);
          setShowStoryCarousel(true);
          return;
        }
      }

      const beeFact = getBeeFactForGame(effectiveCurrentGame);
      if (beeFact) {
        setCurrentBeeFact(beeFact);
        setShowBeeFact(true);
        return;
      }

      setIsPlayingGame(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [
    autoStart,
    isPlayingGame,
    currentGame,
    highestUnlockedGame,
    showStoryCarousel,
    showBeeFact,
    user,
    progressLoadedUserId,
    progressKey,
  ]);

  useEffect(() => {
    if (progressLoadedUserId === progressKey) {
      autoSaveSessionProgress(sessionUserId, {
        current_game: currentGame,
        highest_unlocked_game: highestUnlockedGame,
        games_completed: gamesCompleted,
        games_won: gamesWon,
      });
    }
  }, [currentGame, highestUnlockedGame, gamesCompleted, gamesWon, sessionUserId, progressLoadedUserId, progressKey]);

  useEffect(() => {
    return () => {
      void saveSessionAdventureProgress(sessionUserId, {
        current_game: currentGame,
        highest_unlocked_game: highestUnlockedGame,
        games_completed: gamesCompleted,
        games_won: gamesWon,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && user) {
        syncLocalProgressToServer(user.id).catch((error) => {
          console.error('Error syncing progress:', error);
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user]);

  const spacing = isMobile ? 60 : 80;

  const getVisibleRange = useCallback(() => {
    const viewportHeight = screenHeight;
    const totalHeight = TOTAL_GAMES * spacing;
    const buffer = viewportHeight * 1.5;
    const startY = Math.max(0, scrollY - buffer);
    const endY = scrollY + viewportHeight + buffer;
    const startGame = Math.max(1, Math.floor((totalHeight - endY) / spacing) + 1);
    const endGame = Math.min(TOTAL_GAMES, Math.floor((totalHeight - startY) / spacing) + 1);
    return { startGame: Math.max(1, startGame - 10), endGame: Math.min(TOTAL_GAMES, endGame + 10) };
  }, [scrollY, screenHeight, spacing]);

  const visibleRange = getVisibleRange();

  const getGamePosition = useCallback(
    (gameNumber: number) => {
      const gameIndex = gameNumber - 1;
      const totalHeight = TOTAL_GAMES * spacing;
      const y = totalHeight - gameIndex * spacing;
      const gamesPerSide = 4;
      const sideIndex = Math.floor(gameIndex / gamesPerSide);
      const positionInSide = gameIndex % gamesPerSide;

      let x: number;
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
      } else if (sideIndex % 2 === 0) {
        if (positionInSide < 2) {
          x = 8 + positionInSide * 12;
        } else {
          x = 28 + (positionInSide - 2) * 12;
        }
      } else if (positionInSide < 2) {
        x = 72 + positionInSide * 12;
      } else {
        x = 52 + (positionInSide - 2) * 12;
      }

      return {
        left: Math.max(5, Math.min(95, x)),
        top: y,
      };
    },
    [isMobile, spacing],
  );

  const resetMatchState = () => {
    setCurrentMatch(1);
    setPlayerWins(0);
    setAiWins(0);
    setIsMatchComplete(false);
    setIsWaitingForNextGame(false);
    setCountdownTimer(0);
    setShowMatchWinnerAnnouncement(false);
    lastAnnouncedMatchRef.current = '';
  };

  const tryStartGameAt = (gameNumber: number) => {
    setCurrentGame(gameNumber);
    if (requiresMatchSystem(gameNumber)) {
      resetMatchState();
    }

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

    const beeFact = getBeeFactForGame(gameNumber);
    if (beeFact) {
      setCurrentBeeFact(beeFact);
      setShowBeeFact(true);
      setGameInitialized(false);
      setGameProcessed(false);
      popupScheduledRef.current = false;
      return;
    }

    setIsPlayingGame(true);
    setGameInitialized(false);
    setGameProcessed(false);
    popupScheduledRef.current = false;
  };

  const renderGameLocation = (gameNumber: number) => {
    const position = getGamePosition(gameNumber);
    const isCompleted = gamesCompleted.includes(gameNumber);
    const isCurrent = gameNumber === currentGame;
    const isLocked = gameNumber > highestUnlockedGame;
    const rules = getGameRules(gameNumber);

    const pinHeadStyle: React.CSSProperties = {
      ...styles.pinHead,
      ...(isCurrent ? styles.pinHeadCurrent : {}),
      ...(isCompleted ? styles.pinHeadCompleted : {}),
      ...(isLocked ? styles.pinHeadLocked : {}),
    };

    const pinPointStyle: React.CSSProperties = {
      ...styles.pinPoint,
      ...(isCompleted ? styles.pinPointCompleted : {}),
      ...(isCurrent ? styles.pinPointCurrent : {}),
    };

    return (
      <div
        key={gameNumber}
        style={{
          ...styles.gamePinContainer,
          left: `${position.left}%`,
          top: position.top,
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (!isLocked) tryStartGameAt(gameNumber);
          }}
          disabled={isLocked}
          style={{
            ...pinHeadStyle,
            cursor: isLocked ? 'not-allowed' : 'pointer',
            padding: 0,
          }}
        >
          {isLocked && <span style={styles.lockIcon}>🔒</span>}
          {isCurrent && !isLocked && <span style={styles.starIcon}>★</span>}
          {!isLocked && !isCurrent && rules.icon !== '🎮' && (
            <span style={styles.ruleIcon}>{rules.icon}</span>
          )}
        </button>

        <div style={pinPointStyle} />

        <button
          type="button"
          onClick={() => {
            if (!isLocked) tryStartGameAt(gameNumber);
          }}
          disabled={isLocked}
          style={{
            ...styles.gameLabel,
            cursor: isLocked ? 'not-allowed' : 'pointer',
          }}
        >
          <span style={{ ...styles.gameNumberText, ...(isLocked ? styles.gameNumberTextLocked : {}) }}>
            {gameNumber}
          </span>
        </button>
      </div>
    );
  };

  useEffect(() => {
    if (scrollViewRef.current && !isPlayingGame) {
      const totalHeight = TOTAL_GAMES * spacing;
      const gameIndex = currentGame - 1;
      const gameY = totalHeight - gameIndex * spacing;
      const scrollToY = Math.max(0, gameY - screenHeight / 2);

      const timeoutId1 = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ top: scrollToY, behavior: 'auto' });
      }, 100);

      const timeoutId2 = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ top: scrollToY, behavior: 'smooth' });
      }, 400);

      return () => {
        clearTimeout(timeoutId1);
        clearTimeout(timeoutId2);
      };
    }
  }, [currentGame, isPlayingGame, spacing, screenHeight]);

  const totalHeight = TOTAL_GAMES * spacing;

  const handleStartGame = () => {
    if (currentGame <= highestUnlockedGame) {
      if (requiresMatchSystem(currentGame)) {
        resetMatchState();
      }

      if (shouldShowStory(currentGame)) {
        const story = getStoryForGame(currentGame);
        if (story) {
          setCurrentStory(story);
          setCurrentSlideIndex(0);
          setShowStoryCarousel(true);
          return;
        }
      }

      const beeFact = getBeeFactForGame(currentGame);
      if (beeFact) {
        setCurrentBeeFact(beeFact);
        setShowBeeFact(true);
        return;
      }

      setIsPlayingGame(true);
    }
  };

  const handleGameComplete = (won: boolean = false) => {
    setIsPlayingGame(false);

    if (autoStart) {
      if (user) {
        saveSessionAdventureProgress(sessionUserId, {
          current_game: currentGame,
          highest_unlocked_game: highestUnlockedGame,
          games_completed: gamesCompleted,
          games_won: gamesWon,
        });
      }
      onBackToMenu();
      return;
    }

    if (requiresMatchSystem(currentGame)) {
      if (won) {
        setPlayerWins((prev) => prev + 1);
      } else {
        setAiWins((prev) => prev + 1);
      }
    }

    if (!gamesCompleted.includes(currentGame)) {
      setGamesCompleted([...gamesCompleted, currentGame]);
    }

    if (!requiresMatchSystem(currentGame)) {
      if (currentGame === highestUnlockedGame && highestUnlockedGame < TOTAL_GAMES) {
        setHighestUnlockedGame(highestUnlockedGame + 1);
      }
    }
  };

  const handleGameWin = (won: boolean) => {
    if (gameProcessed && popupScheduledRef.current) {
      return;
    }

    setGameProcessed(true);
    popupScheduledRef.current = true;

    if (!requiresMatchSystem(currentGame)) {
      if (won) {
        setHighestUnlockedGame((prev) => Math.max(prev, currentGame + 1));
        setGamesWon((prev) => prev + 1);
      }
      setGamesCompleted((prev) => {
        if (!prev.includes(currentGame)) {
          return [...prev, currentGame];
        }
        return prev;
      });
      return;
    }

    if (won) {
      setPlayerWins((prev) => {
        const newPlayerWins = prev + 1;
        const requiredWins = getRequiredWins(currentGame);
        const totalGames = getTotalGames(currentGame);

        if (newPlayerWins >= requiredWins || currentMatch >= totalGames) {
          setIsMatchComplete(true);
          setHighestUnlockedGame((p) => Math.max(p, currentGame + 1));
          setGamesWon((p) => p + 1);
          setGamesCompleted((p) => {
            if (!p.includes(currentGame)) {
              return [...p, currentGame];
            }
            return p;
          });
          matchResultsTimerRef.current = setTimeout(() => {
            setPendingResultsPopup(true);
            matchResultsTimerRef.current = null;
          }, 1000);
        } else {
          const matchKey = `${currentGame}-${currentMatch}`;
          if (lastAnnouncedMatchRef.current !== matchKey) {
            setMatchWinnerMessage(`You Won Match ${currentMatch}/${totalGames}! 🎉`);
            setShowMatchWinnerAnnouncement(true);
            lastAnnouncedMatchRef.current = matchKey;
            setTimeout(() => {
              setShowMatchWinnerAnnouncement(false);
              setIsWaitingForNextGame(true);
              setCountdownTimer(3);
            }, 2000);
          }
        }
        return newPlayerWins;
      });
    } else {
      setAiWins((prev) => {
        const newAiWins = prev + 1;
        const requiredWins = getRequiredWins(currentGame);
        const totalGames = getTotalGames(currentGame);

        if (newAiWins >= requiredWins || currentMatch >= totalGames) {
          setIsMatchComplete(true);
          setGamesCompleted((p) => {
            if (!p.includes(currentGame)) {
              return [...p, currentGame];
            }
            return p;
          });
          matchResultsTimerRef.current = setTimeout(() => {
            setPendingResultsPopup(true);
            matchResultsTimerRef.current = null;
          }, 1000);
        } else {
          const matchKey = `${currentGame}-${currentMatch}`;
          if (lastAnnouncedMatchRef.current !== matchKey) {
            setMatchWinnerMessage(`AI won Match ${currentMatch}/${totalGames}! 😔`);
            setShowMatchWinnerAnnouncement(true);
            lastAnnouncedMatchRef.current = matchKey;
            setTimeout(() => {
              setShowMatchWinnerAnnouncement(false);
              setIsWaitingForNextGame(true);
              setCountdownTimer(3);
            }, 2000);
          }
        }
        return newAiWins;
      });
    }
  };

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
          onGameChange?.(nextGame);
          setCurrentMatch(1);
          setPlayerWins(0);
          setAiWins(0);
          setIsMatchComplete(false);
          setCountdownTimer(0);
          setIsWaitingForNextGame(false);
          setGameProcessed(false);
          popupScheduledRef.current = false;
          setGameInitialized(false);
        } else if (autoStart) {
          if (user) {
            saveSessionAdventureProgress(sessionUserId, {
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
      } else if (autoStart) {
        if (user) {
          saveSessionAdventureProgress(sessionUserId, {
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
    } else {
      setIsPlayingGame(false);
      setGameInitialized(false);
    }
  };

  const handleResultsPopupNext = () => {
    if (matchResultsTimerRef.current) {
      clearTimeout(matchResultsTimerRef.current);
      matchResultsTimerRef.current = null;
    }
    setPendingResultsPopup(false);
    setShowResultsPopup(false);

    const requiredWins = getRequiredWins(currentGame);
    const playerWon = playerWins >= requiredWins;

    if (playerWon) {
      awardAdventureLevelXp(currentGame);
      const nextGame = currentGame + 1;
      if (nextGame <= TOTAL_GAMES) {
        setHighestUnlockedGame((prev) => Math.max(prev, nextGame));
        setCurrentGame(nextGame);
        onGameChange?.(nextGame);
        setCurrentMatch(1);
        setPlayerWins(0);
        setAiWins(0);
        setIsMatchComplete(false);
        setCountdownTimer(0);
        setIsWaitingForNextGame(false);
        setGameProcessed(false);
        popupScheduledRef.current = false;
        setGameInitialized(false);

        if (shouldShowStory(nextGame)) {
          const story = getStoryForGame(nextGame);
          if (story) {
            setCurrentStory(story);
            setCurrentSlideIndex(0);
            setShowStoryCarousel(true);
            setIsPlayingGame(false);
            return;
          }
        }

        const beeFact = getBeeFactForGame(nextGame);
        if (beeFact) {
          setCurrentBeeFact(beeFact);
          setShowBeeFact(true);
          setIsPlayingGame(false);
          return;
        }
      } else if (autoStart) {
        if (user) {
          saveSessionAdventureProgress(sessionUserId, {
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
    } else {
      setCurrentMatch(1);
      setPlayerWins(0);
      setAiWins(0);
      setIsMatchComplete(false);
      setCountdownTimer(0);
      setIsWaitingForNextGame(false);
      setGameProcessed(false);
      popupScheduledRef.current = false;
      setGameInitialized(false);
    }
  };

  useEffect(() => {
    if (pendingResultsPopup) {
      setShowResultsPopup(true);
      setPendingResultsPopup(false);
    }
  }, [pendingResultsPopup]);

  useEffect(() => {
    if (isWaitingForNextGame && countdownTimer > 0) {
      const timer = setTimeout(() => {
        setCountdownTimer((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (isWaitingForNextGame && countdownTimer === 0) {
      setIsWaitingForNextGame(false);
      setCountdownTimer(0);
      setGameInitialized(false);
      setCurrentMatch((prev) => prev + 1);
      setGameProcessed(false);
      popupScheduledRef.current = false;
    }
  }, [isWaitingForNextGame, countdownTimer]);

  const handleContinueToNextGame = () => {
    setPendingResultsPopup(false);
    setShowResultsPopup(false);
    popupScheduledRef.current = false;

    if (!gamesCompleted.includes(currentGame)) {
      setGamesCompleted((prev) => [...prev, currentGame]);
    }
    awardAdventureLevelXp(currentGame);
    const nextGame = currentGame + 1;
    if (nextGame <= TOTAL_GAMES) {
      setHighestUnlockedGame((prev) => Math.max(prev, nextGame));
      setCurrentGame(nextGame);
      onGameChange?.(nextGame);
      setCurrentMatch(1);
      setPlayerWins(0);
      setAiWins(0);
      setIsMatchComplete(false);
      setCountdownTimer(0);
      setIsWaitingForNextGame(false);
      setGameProcessed(false);
      setGameInitialized(false);

      if (shouldShowStory(nextGame)) {
        const story = getStoryForGame(nextGame);
        if (story) {
          setCurrentStory(story);
          setCurrentSlideIndex(0);
          setShowStoryCarousel(true);
          setIsPlayingGame(false);
          return;
        }
      }

      const beeFact = getBeeFactForGame(nextGame);
      if (beeFact) {
        setCurrentBeeFact(beeFact);
        setShowBeeFact(true);
        setIsPlayingGame(false);
        return;
      }
    } else if (autoStart) {
      if (user) {
        saveSessionAdventureProgress(sessionUserId, {
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
  };

  if (showStoryCarousel && currentStory) {
    const isLastSlide = currentSlideIndex === currentStory.slides.length - 1;

    return (
      <div style={styles.storyModalOverlay}>
        <div style={styles.storyModalContent}>
          <h2 style={styles.storyTitle}>{currentStory.title}</h2>

          <div style={styles.storySlideContainer}>
            <p style={styles.storySlideText}>{currentStory.slides[currentSlideIndex]}</p>
          </div>

          <div style={styles.slideIndicators}>
            {currentStory.slides.map((_, index) => (
              <div
                key={index}
                style={{
                  ...styles.slideIndicator,
                  ...(index === currentSlideIndex ? styles.slideIndicatorActive : {}),
                }}
              />
            ))}
          </div>

          <div style={styles.storyNavButtons}>
            <button
              type="button"
              onClick={() => {
                if (currentSlideIndex > 0) {
                  setCurrentSlideIndex((prev) => prev - 1);
                }
              }}
              disabled={currentSlideIndex === 0}
              style={{
                ...styles.storyNavButton,
                ...(currentSlideIndex === 0 ? styles.storyNavButtonDisabled : {}),
              }}
            >
              ← Previous
            </button>

            {!isLastSlide ? (
              <button
                type="button"
                onClick={() => setCurrentSlideIndex((prev) => prev + 1)}
                style={{ ...styles.storyNavButton, ...styles.storyNavButtonPrimary }}
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowStoryCarousel(false);
                  setCurrentStory(null);
                  setCurrentSlideIndex(0);

                  const beeFact = getBeeFactForGame(currentGame);
                  if (beeFact) {
                    setCurrentBeeFact(beeFact);
                    setShowBeeFact(true);
                  } else {
                    setIsPlayingGame(true);
                  }
                }}
                style={{ ...styles.storyNavButton, ...styles.storyNavButtonBegin }}
              >
                ✨ Begin Journey ✨
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showBeeFact && currentBeeFact) {
    return (
      <div style={styles.factModalOverlay}>
        <div style={styles.factModalContent}>
          <h2 style={styles.factTitle}>🐝 Bee Fact Time! 🐝</h2>
          <p style={styles.factText}>{currentBeeFact}</p>
          <button
            type="button"
            onClick={() => {
              setShowBeeFact(false);
              setCurrentBeeFact(null);
              setIsPlayingGame(true);
            }}
            style={styles.factButton}
          >
            ✨ Start Game ✨
          </button>
        </div>
      </div>
    );
  }

  if (isPlayingGame) {
    const isMatchGame = requiresMatchSystem(currentGame);
    const gameRules = getGameRules(currentGame, isMatchGame ? currentMatch : undefined);

    return (
      <AdventureClassicAIGame
        key={`${currentGame}-${currentMatch}`}
        onBackToMenu={handleExit}
        onBackToMap={() => {
          if (autoStart) {
            handleGameComplete(false);
            handleExit();
          } else {
            handleGameComplete(false);
          }
        }}
        initialDifficulty={gameRules.aiDifficulty}
        initialTimer={gameRules.timeLimit}
        backgroundColor={gameRules.startingPlayer === 1 ? 'yellow' : 'black'}
        onNextGame={handleNextGame}
        onGameWin={handleGameWin}
        showCountdown={isMatchGame ? currentMatch === 1 && !isWaitingForNextGame : true}
        gameNumber={currentGame}
        currentMatch={isMatchGame ? currentMatch : undefined}
        playerWins={isMatchGame ? playerWins : undefined}
        aiWins={isMatchGame ? aiWins : undefined}
        requiredWins={isMatchGame ? getRequiredWins(currentGame) : undefined}
        totalGames={isMatchGame ? getTotalGames(currentGame) : undefined}
        isMatchComplete={isMatchGame ? isMatchComplete : undefined}
        isWaitingForNextGame={isMatchGame ? isWaitingForNextGame : undefined}
        countdownTimer={isMatchGame ? countdownTimer : undefined}
        showMatchWinnerAnnouncement={isMatchGame ? showMatchWinnerAnnouncement : undefined}
        matchWinnerMessage={isMatchGame ? matchWinnerMessage : undefined}
        onGameInitialized={() => setGameInitialized(true)}
        gameInitialized={gameInitialized}
        showResultsPopup={isMatchGame && showResultsPopup && isMatchComplete}
        onResultsPopupNext={handleResultsPopupNext}
        onCloseResultsPopup={() => setShowResultsPopup(false)}
        onContinueToNextGame={handleContinueToNextGame}
        adventureXpContext={{
          currentLevel: currentGame,
          highestUnlocked: highestUnlockedGame,
        }}
        sessionUserId={sessionUserId}
      />
    );
  }

  if (autoStart) {
    if (!isPlayingGame && !showStoryCarousel && !showBeeFact) {
      return (
        <div style={styles.container}>
          <div style={styles.loadingContainer}>
            <span style={{ fontSize: 24, color: '#000' }}>🐝</span>
            <span style={{ fontSize: 16, color: '#000', marginTop: 10 }}>Loading game...</span>
          </div>
        </div>
      );
    }
    return (
      <div style={styles.container}>
        <div style={{ flex: 1, backgroundColor: '#90EE90' }} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logoContainer}>
          <img src="/BEE-FIVE.png" alt="Bee Five" style={styles.logo} />
        </div>
        <h1 style={styles.headerTitle}>Bee Adventure</h1>
        <p style={styles.headerSubtitle}>Guide a life to greatness</p>
      </header>

      <div style={styles.mapContainer}>
        <div
          ref={scrollViewRef}
          style={styles.scrollView}
          onScroll={(e) => setScrollY(e.currentTarget.scrollTop)}
        >
          <div style={{ ...styles.scrollContent, height: totalHeight, position: 'relative' }}>
            <div style={styles.mapBackground} />

            {Array.from({ length: 50 }, (_, i) => {
              const baseGame = visibleRange.startGame;
              const gameIndex = baseGame + i * 5;
              if (gameIndex < 1 || gameIndex > TOTAL_GAMES) return null;

              const position = getGamePosition(gameIndex);
              const decorations = ['🌿', '🌱', '🍃', '🌾', '🌺', '🌸', '🌻', '⭐', '✨', '🌼', '🌷', '🌹', '🍀', '🌵'];
              const decoration = decorations[i % decorations.length];

              return (
                <div
                  key={`decoration-${i}-${gameIndex}`}
                  style={{
                    ...styles.decoration,
                    left: `${(i % 4) * 25 + 5}%`,
                    top: position.top + ((i % 3) * 50 - 50),
                  }}
                >
                  <span style={styles.decorationText}>{decoration}</span>
                </div>
              );
            })}

            {Array.from({ length: 20 }, (_, i) => {
              const baseGame = visibleRange.startGame;
              const gameIndex = baseGame + i * 3;
              if (gameIndex < 1 || gameIndex > TOTAL_GAMES) return null;

              const position = getGamePosition(gameIndex);

              return (
                <div
                  key={`bee-${i}-${gameIndex}`}
                  style={{
                    ...styles.flyingBee,
                    left: `${(i % 5) * 18 + 8}%`,
                    top: position.top + ((i % 4) * 40 - 60),
                  }}
                >
                  <span style={styles.beeEmoji}>🐝</span>
                </div>
              );
            })}

            <div style={styles.gamesContainer}>
              {Array.from({ length: visibleRange.endGame - visibleRange.startGame + 1 }, (_, i) => {
                const gameNumber = visibleRange.startGame + i;
                if (gameNumber < 1 || gameNumber > TOTAL_GAMES) return null;
                return renderGameLocation(gameNumber);
              })}
            </div>

            {ADVENTURE_STAGES.map((stage, index) => {
              const position = getGamePosition(stage.games);
              return (
                <div
                  key={`stage-${index}`}
                  style={{
                    ...styles.stageMarker,
                    left: '50%',
                    top: position.top - 40,
                    backgroundColor: stage.color,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div style={styles.stageMarkerContent}>
                    <span style={styles.stageEmoji}>{stage.emoji}</span>
                    <span style={styles.stageText}>S{index + 1}</span>
                    <span style={styles.stageName}>{stage.name}</span>
                    <span style={styles.stageGameNumber}>Game {stage.games}</span>
                  </div>
                  <div style={{ ...styles.stageBanner, backgroundColor: stage.color }}>
                    <span style={styles.stageDescription}>{stage.description}</span>
                  </div>
                </div>
              );
            })}

            <div style={styles.pathwayContainer}>
              {Array.from(
                { length: Math.min(30, Math.floor((visibleRange.endGame - visibleRange.startGame) / 5) + 5) },
                (_, i) => {
                  const gameNum = Math.max(1, visibleRange.startGame - 5 + i * 5);
                  if (gameNum >= TOTAL_GAMES) return null;

                  const pos1 = getGamePosition(gameNum);
                  const pos2 = getGamePosition(Math.min(gameNum + 5, TOTAL_GAMES));

                  return (
                    <div
                      key={`path-${i}-${gameNum}`}
                      style={{
                        ...styles.pathwaySegment,
                        left: `${(pos1.left + pos2.left) / 2}%`,
                        top: Math.min(pos1.top, pos2.top),
                        height: Math.abs(pos2.top - pos1.top),
                        backgroundColor: i % 2 === 0 ? '#FFC30B' : '#4CAF50',
                        opacity: 0.5,
                      }}
                    />
                  );
                },
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.controls}>
        <button
          type="button"
          style={{
            ...styles.playButton,
            ...(currentGame > highestUnlockedGame ? styles.playButtonDisabled : {}),
          }}
          onClick={handleStartGame}
          disabled={currentGame > highestUnlockedGame}
        >
          ▶️ Play Game {currentGame}
        </button>

        <button type="button" style={styles.backButton} onClick={handleExit}>
          🏠 Back to Menu
        </button>
      </div>

      {showRulesModal && (
        <div style={styles.modalOverlay} onClick={() => setShowRulesModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {selectedGameRules?.icon} Game {currentGame} Rules
            </h2>

            {selectedGameRules && (
              <>
                <div style={styles.rulesSection}>
                  <span style={styles.rulesLabel}>⏱️ Time Limit:</span>
                  <span style={styles.rulesValue}>{selectedGameRules.timeLimit}s</span>
                </div>

                <div style={styles.rulesSection}>
                  <span style={styles.rulesLabel}>👤 Starting Player:</span>
                  <span style={styles.rulesValue}>
                    {selectedGameRules.startingPlayer === 1 ? 'You' : 'AI'}
                  </span>
                </div>

                <div style={styles.rulesSection}>
                  <span style={styles.rulesLabel}>🤖 AI Difficulty:</span>
                  <span style={styles.rulesValue}>
                    {selectedGameRules.aiDifficulty === 'hard'
                      ? '🔴 Hard'
                      : selectedGameRules.aiDifficulty === 'medium'
                        ? '🟡 Medium'
                        : '🟢 Easy'}
                  </span>
                </div>

                <div style={styles.difficultySection}>
                  <span style={styles.difficultyLabel}>Difficulty Level:</span>
                  <div
                    style={{
                      ...styles.difficultyBadge,
                      ...(selectedGameRules.difficultyLevel === 'Extreme' ? styles.difficultyExtreme : {}),
                      ...(selectedGameRules.difficultyLevel === 'Very Hard' ? styles.difficultyVeryHard : {}),
                      ...(selectedGameRules.difficultyLevel === 'Hard' ? styles.difficultyHard : {}),
                      ...(selectedGameRules.difficultyLevel === 'Medium' ? styles.difficultyMedium : {}),
                      ...(selectedGameRules.difficultyLevel === 'Easy' ? styles.difficultyEasy : {}),
                    }}
                  >
                    <span style={styles.difficultyText}>{selectedGameRules.difficultyLevel}</span>
                    <span style={styles.difficultyScore}>({selectedGameRules.difficultyScore}/100)</span>
                  </div>
                </div>

                {selectedGameRules.isMatchGame && (
                  <div style={styles.rulesSection}>
                    <span style={styles.rulesLabel}>🏆 Match Type:</span>
                    <span style={styles.rulesValue}>
                      {selectedGameRules.matchType === 'best-of-5' ? 'Best of 5' : 'Best of 3'}
                    </span>
                  </div>
                )}

                <div style={styles.rulesList}>
                  <span style={styles.rulesListTitle}>Special Rules:</span>
                  {selectedGameRules.hasMudZones && (
                    <p style={styles.ruleItem}>🌊 {selectedGameRules.mudZoneCount} Mud Zones</p>
                  )}
                  {selectedGameRules.hasBlindPlay && <p style={styles.ruleItem}>👁️ Blind Play Mode</p>}
                  {selectedGameRules.hasProgressiveBlocks && (
                    <p style={styles.ruleItem}>📈 Progressive Blocks</p>
                  )}
                  {selectedGameRules.hasDisappearingBlocks && (
                    <p style={styles.ruleItem}>💨 Disappearing Blocks</p>
                  )}
                  {selectedGameRules.hasShiftingBlocks && (
                    <p style={styles.ruleItem}>🔄 Shifting Blocks</p>
                  )}
                  {selectedGameRules.hasBlockedCells &&
                    !selectedGameRules.hasProgressiveBlocks &&
                    !selectedGameRules.hasDisappearingBlocks &&
                    !selectedGameRules.hasShiftingBlocks && (
                      <p style={styles.ruleItem}>🚫 {selectedGameRules.blockedCellCount} Blocked Cells</p>
                    )}
                  {selectedGameRules.hasDisappearingPieces && (
                    <p style={styles.ruleItem}>✨ Disappearing Pieces</p>
                  )}
                  {selectedGameRules.hasPieceCapacity && (
                    <p style={styles.ruleItem}>📊 Piece Capacity Limit</p>
                  )}
                  {selectedGameRules.hasBoardRearrangement && (
                    <p style={styles.ruleItem}>🔀 Board Rearrangement</p>
                  )}
                  {selectedGameRules.hasPieceSwapping && (
                    <p style={styles.ruleItem}>🔄 Piece Swapping</p>
                  )}
                  {!selectedGameRules.hasMudZones &&
                    !selectedGameRules.hasBlindPlay &&
                    !selectedGameRules.hasBlockedCells &&
                    !selectedGameRules.hasDisappearingPieces &&
                    !selectedGameRules.hasPieceCapacity &&
                    !selectedGameRules.isMatchGame && (
                      <p style={styles.ruleItem}>✅ Standard Game</p>
                    )}
                </div>
              </>
            )}

            <div style={styles.modalButtons}>
              <button
                type="button"
                style={{ ...styles.modalButton, ...styles.playModalButton }}
                onClick={() => {
                  setShowRulesModal(false);
                  handleStartGame();
                }}
              >
                ▶️ Play Game
              </button>

              <button
                type="button"
                style={{ ...styles.modalButton, ...styles.closeModalButton }}
                onClick={() => setShowRulesModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: '100vh',
    backgroundColor: '#90EE90',
  },
  loadingContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#90EE90',
  },
  header: {
    paddingTop: 25,
    paddingBottom: 15,
    paddingLeft: 15,
    paddingRight: 15,
    backgroundColor: '#000000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoContainer: {
    width: 150,
    height: 40,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 900,
    color: '#4CAF50',
    marginTop: 5,
    margin: '5px 0 0',
    textShadow: '2px 2px 2px rgba(0,0,0,0.5)',
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFC30B',
    marginTop: 5,
    margin: '5px 0 0',
  },
  mapContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 15,
    border: '3px solid #FFC30B',
    overflow: 'hidden',
    backgroundColor: '#F0FFF0',
    minHeight: 0,
  },
  scrollView: {
    flex: 1,
    overflowY: 'auto',
    height: '100%',
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
  },
  decoration: {
    position: 'absolute',
    opacity: 0.5,
    zIndex: 1,
    width: 30,
    height: 30,
    display: 'flex',
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
    display: 'flex',
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
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 2,
  },
  pinHead: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFC30B',
    border: '2px solid #fff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  pinHeadCurrent: {
    backgroundColor: '#FFC30B',
    border: '3px solid #fff',
    transform: 'scale(1.3)',
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
  ruleIcon: {
    fontSize: 12,
  },
  pinPoint: {
    width: 0,
    height: 0,
    borderLeft: '10px solid transparent',
    borderRight: '10px solid transparent',
    borderTop: '15px solid #FFC30B',
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
    padding: '2px 4px',
    borderRadius: 3,
    border: '1px solid rgba(0,0,0,0.2)',
    minWidth: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 120,
    borderRadius: 15,
    border: '3px solid #000',
    zIndex: 5,
    boxShadow: '0 4px 5px rgba(0,0,0,0.3)',
  },
  stageMarkerContent: {
    display: 'flex',
    flexDirection: 'column',
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
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 110,
  },
  stageGameNumber: {
    fontSize: 9,
    color: '#333',
    fontWeight: 600,
  },
  stageBanner: {
    width: '100%',
    padding: 6,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTop: '2px solid #000',
  },
  stageDescription: {
    fontSize: 8,
    color: '#000',
    textAlign: 'center',
    fontWeight: 500,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  controls: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTop: '2px solid #FFC30B',
  },
  playButton: {
    backgroundColor: '#4CAF50',
    padding: '12px 20px',
    borderRadius: 8,
    border: '2px solid #000',
    minWidth: 150,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    cursor: 'pointer',
  },
  playButtonDisabled: {
    backgroundColor: '#cccccc',
    cursor: 'not-allowed',
  },
  backButton: {
    backgroundColor: '#FFC30B',
    padding: '12px 20px',
    borderRadius: 8,
    border: '2px solid #000',
    minWidth: 150,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFC30B',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    border: '4px solid #000',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
    margin: '0 0 20px',
  },
  rulesSection: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '1px solid rgba(0,0,0,0.2)',
  },
  rulesLabel: {
    fontSize: 16,
    fontWeight: 600,
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
    display: 'block',
  },
  ruleItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    paddingLeft: 10,
    margin: '0 0 6px 0',
  },
  modalButtons: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    gap: 10,
  },
  modalButton: {
    padding: '12px 20px',
    borderRadius: 8,
    border: '2px solid #000',
    minWidth: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    cursor: 'pointer',
  },
  playModalButton: {
    backgroundColor: '#4CAF50',
  },
  closeModalButton: {
    backgroundColor: '#2196F3',
  },
  difficultySection: {
    marginTop: 15,
    marginBottom: 15,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  difficultyLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  difficultyBadge: {
    padding: '12px 20px',
    borderRadius: 25,
    border: '3px solid #000',
    display: 'flex',
    flexDirection: 'column',
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
    textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
  },
  difficultyScore: {
    fontSize: 14,
    fontWeight: 600,
    color: '#FFF',
    marginTop: 4,
    opacity: 0.9,
  },
  storyModalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  storyModalContent: {
    backgroundColor: '#FFC30B',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 600,
    border: '4px solid #000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  storyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
    textShadow: '2px 2px 2px rgba(0,0,0,0.3)',
    margin: '0 0 20px',
  },
  storySlideContainer: {
    minHeight: 150,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
  },
  storySlideText: {
    fontSize: 18,
    lineHeight: '28px',
    color: '#000',
    textAlign: 'center',
    fontWeight: 500,
    fontStyle: 'italic',
    margin: 0,
  },
  slideIndicators: {
    display: 'flex',
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
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  storyNavButton: {
    padding: '12px 20px',
    borderRadius: 8,
    border: '2px solid #000',
    backgroundColor: '#4CAF50',
    minWidth: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    cursor: 'pointer',
  },
  storyNavButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  storyNavButtonPrimary: {
    backgroundColor: '#4CAF50',
  },
  storyNavButtonBegin: {
    backgroundColor: '#4CAF50',
  },
  factModalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  factModalContent: {
    backgroundColor: '#FFC30B',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 500,
    border: '4px solid #000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  factTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
    textShadow: '2px 2px 2px rgba(0,0,0,0.3)',
    margin: '0 0 20px',
  },
  factText: {
    fontSize: 20,
    lineHeight: '30px',
    color: '#000',
    marginBottom: 25,
    textAlign: 'center',
    fontWeight: 500,
    margin: '0 0 25px',
  },
  factButton: {
    padding: '15px 30px',
    borderRadius: 12,
    border: '3px solid #000',
    backgroundColor: '#4CAF50',
    minWidth: 180,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    cursor: 'pointer',
  },
};
