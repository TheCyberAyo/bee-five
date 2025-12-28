import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  SafeAreaView,
  Image,
} from 'react-native';
import {
  BLOCKED_CELL,
  CellValue,
  createBoardWithBlocks,
  generateMudZones,
  isInMudZone,
  checkWinCondition,
  getProgressiveBlockRules,
  addProgressiveBlocks,
  removeTwoBlockedCells,
  shiftAllBlocks,
  gameEndsWith3,
  gameEndsWith4,
  gameEndsWith7After250,
  gameEndsWith8After600,
  initializePieceAges,
  ageAllPieces,
  removeOldestPiecesOfPlayer,
  enforcePieceCapacity,
  rearrangeBoard,
  swapOpponentPiecePairs,
  swapAllPieces,
  gameEndsWith1InSpecifiedRanges,
  addStrategicBlock,
  moveRandomBlockToStrategicPosition,
  isMultipleOf7Between500And1000,
  isMultipleOf4From1000,
  isMultipleOf17,
  isMultipleOf50Match3,
  isMultipleOf50Match4,
  isMultipleOf10Match1From60,
  isMultipleOf10Match2From30,
  isMultipleOf10Match2From330,
  isMultipleOf10Match2From730,
} from '../utils/adventureGameLogic';
import { getGameRules } from '../utils/adventureGameRules';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOARD_SIZE = 10;
const BORDER_WIDTH = 2;
const BOARD_PADDING = 20;

// Calculate cell size to fill full width of screen
const calculateCellSize = () => {
  const isMobile = SCREEN_WIDTH <= 768;
  // Use full screen width, accounting for minimal padding
  const availableSize = SCREEN_WIDTH - (BOARD_PADDING * 2);
  // Account for borders: BOARD_SIZE cells + (BOARD_SIZE + 1) borders
  const totalBorders = (BOARD_SIZE + 1) * BORDER_WIDTH;
  const availableForCells = availableSize - totalBorders;
  const calculatedSize = Math.floor(availableForCells / BOARD_SIZE);
  
  return calculatedSize;
};

const CELL_SIZE = calculateCellSize();

interface ClassicAIGameProps {
  onBackToMenu: () => void;
  initialDifficulty?: 'easy' | 'medium' | 'hard';
  initialTimer?: number;
  backgroundColor?: 'yellow' | 'black';
  onNextGame?: () => void; // Callback for proceeding to next game (when player wins and match is complete)
  showCountdown?: boolean; // Whether to show countdown when starting
  gameNumber?: number; // Game number for adventure mode (enables obstacles)
  onBackToMap?: () => void; // Callback for going back to adventure map (adventure mode only)
  onGameWin?: (won: boolean) => void; // Callback when game ends (for match tracking)
  currentMatch?: number; // Current match number (for match games)
  playerWins?: number; // Player wins in current match series
  aiWins?: number; // AI wins in current match series
  requiredWins?: number; // Required wins to win the match
  totalGames?: number; // Total games in the match series
  isMatchComplete?: boolean; // Whether the match is complete
  isWaitingForNextGame?: boolean; // Whether waiting for next match countdown
  countdownTimer?: number; // Countdown timer for next match
  showMatchWinnerAnnouncement?: boolean; // Whether to show match winner announcement
  matchWinnerMessage?: string; // Message for match winner announcement
  gameInitialized?: boolean; // Whether game has been initialized (prevents processing before countdown)
  onGameInitialized?: () => void; // Callback when game is initialized
  showResultsPopup?: boolean; // Whether to show match results popup
  onResultsPopupNext?: () => void; // Callback for match results popup next button
  onCloseResultsPopup?: () => void; // Callback to close the results popup
  onContinueToNextGame?: () => void; // Callback for Continue button (goes to next game)
}

export default function ClassicAIGame({ 
  onBackToMenu, 
  initialDifficulty = 'medium', 
  initialTimer = 15,
  backgroundColor = 'yellow',
  onNextGame,
  showCountdown = false,
  gameNumber,
  onBackToMap,
  onGameWin,
  currentMatch,
  playerWins,
  aiWins,
  requiredWins,
  totalGames,
  isMatchComplete,
  isWaitingForNextGame,
  countdownTimer,
  showMatchWinnerAnnouncement,
  matchWinnerMessage,
  gameInitialized = false,
  onGameInitialized,
  showResultsPopup = false,
  onResultsPopupNext,
  onCloseResultsPopup,
  onContinueToNextGame
}: ClassicAIGameProps) {
  // Get game rules if in adventure mode
  // Pass currentMatch to getGameRules so it can determine blind play for multiples of 50 match 2
  const gameRules = gameNumber ? getGameRules(gameNumber, currentMatch) : null;
  const isAdventureMode = !!gameNumber;
  const persistentBlindPlay = gameRules?.hasBlindPlay || false; // Persistent blind play (e.g., multiples of 50 match 2)
  const hasMudZones = gameRules?.hasMudZones || false;
  
  // Calculate effective blind play (persistent OR temporary)
  const isBlindPlay = persistentBlindPlay || temporaryBlindPlay;
  
  // Initialize board with obstacles if in adventure mode
  // Use currentMatch if provided (for match games), otherwise default to 1
  const matchNumber = currentMatch || 1;
  const initialBoard = isAdventureMode 
    ? createBoardWithBlocks(gameNumber || 1, isBlindPlay, matchNumber)
    : Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
  
  const [board, setBoard] = useState<CellValue[][]>(initialBoard);
  const [mudZones, setMudZones] = useState<{ row: number; col: number }[]>(
    isAdventureMode && hasMudZones ? generateMudZones(gameNumber || 1) : []
  );
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(
    isAdventureMode && gameRules ? gameRules.startingPlayer : 2
  );
  const [winner, setWinner] = useState<0 | 1 | 2>(0);
  const [timeLimit] = useState(initialTimer);
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>(initialDifficulty);
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [showStartCountdown, setShowStartCountdown] = useState(showCountdown);
  const [startCountdown, setStartCountdown] = useState(3);
  const [gameStarted, setGameStarted] = useState(!showCountdown);
  
  // Sync countdown state with prop changes (especially when component remounts for new match)
  // Only update if showCountdown actually changed to prevent duplicate countdowns
  useEffect(() => {
    // Don't reset countdown if it has already completed naturally
    if (showCountdown && !showStartCountdown && !gameStarted && !countdownCompletedRef.current) {
      // Only set countdown if it's not already showing AND game hasn't started AND countdown hasn't completed
      setShowStartCountdown(true);
      setStartCountdown(3);
      setGameStarted(false);
      countdownCompletedRef.current = false; // Reset flag when starting new countdown
    } else if (!showCountdown && showStartCountdown) {
      // Only disable countdown if it's currently showing
      setShowStartCountdown(false);
      setStartCountdown(0);
      setGameStarted(true);
      gameActiveRef.current = true;
      // Initialize game immediately if no countdown (for match series games after first match)
      if (!gameInitialized && onGameInitialized) {
        onGameInitialized();
      }
    } else if (!showCountdown && !showStartCountdown) {
      // If countdown is disabled, ensure game is started and initialized
      // This handles match 2+ where showCountdown is false but game needs to start immediately
      if (!gameStarted) {
        setGameStarted(true);
        gameActiveRef.current = true;
      }
      // Always initialize if not already initialized (important for match 2+)
      // This ensures AI can play in match 2+ games
      if (!gameInitialized && onGameInitialized) {
        onGameInitialized();
      }
    }
    // Only sync when showCountdown prop changes, not when gameInitialized changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCountdown, onGameInitialized, showStartCountdown, gameStarted]);
  const [humanMoveCount, setHumanMoveCount] = useState(0);
  const [blockShiftMoveCount, setBlockShiftMoveCount] = useState(0);
  const [pieceAges, setPieceAges] = useState<number[][]>(initializePieceAges());
  const [player1MoveCount, setPlayer1MoveCount] = useState(0);
  const [player2MoveCount, setPlayer2MoveCount] = useState(0);
  const [totalMoveCount, setTotalMoveCount] = useState(0); // Track total moves for board rearrangement
  const [temporaryBlindPlay, setTemporaryBlindPlay] = useState(false); // Track temporary blind play state
  const [blindPlayTriggerMove, setBlindPlayTriggerMove] = useState(0); // Track when temporary blind play was triggered
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameActiveRef = useRef(true);
  const winPopupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pieceAgesRef = useRef<number[][]>(pieceAges);
  const player1MoveCountRef = useRef(player1MoveCount);
  const player2MoveCountRef = useRef(player2MoveCount);
  const totalMoveCountRef = useRef(totalMoveCount);
  const boardRef = useRef<CellValue[][]>(board);
  const persistentBlindPlayRef = useRef(persistentBlindPlay);
  const temporaryBlindPlayRef = useRef(temporaryBlindPlay);
  const blindPlayTriggerMoveRef = useRef(blindPlayTriggerMove);
  
  // Sync refs with state
  useEffect(() => {
    pieceAgesRef.current = pieceAges;
  }, [pieceAges]);
  
  useEffect(() => {
    player1MoveCountRef.current = player1MoveCount;
  }, [player1MoveCount]);
  
  useEffect(() => {
    player2MoveCountRef.current = player2MoveCount;
  }, [player2MoveCount]);
  
  useEffect(() => {
    totalMoveCountRef.current = totalMoveCount;
  }, [totalMoveCount]);
  
  useEffect(() => {
    boardRef.current = board;
  }, [board]);
  
  useEffect(() => {
    persistentBlindPlayRef.current = persistentBlindPlay;
  }, [persistentBlindPlay]);
  
  useEffect(() => {
    temporaryBlindPlayRef.current = temporaryBlindPlay;
  }, [temporaryBlindPlay]);
  
  useEffect(() => {
    blindPlayTriggerMoveRef.current = blindPlayTriggerMove;
  }, [blindPlayTriggerMove]);
  const [gameProcessed, setGameProcessed] = useState(false);
  const popupScheduledRef = useRef<boolean>(false);
  const countdownCompletedRef = useRef(false); // Track if countdown has completed naturally
  const timeoutPopupAutoCloseRef = useRef<NodeJS.Timeout | null>(null); // For auto-closing timeout popups in match games

  const backgroundStyle = '#808080'; // Gray background like BattleGame

  // Helper function to check if board is full (accounting for blocked cells and mud zones)
  const isBoardFull = useCallback((boardToCheck: CellValue[][]): boolean => {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = boardToCheck[row][col];
        
        // If cell is empty (0) and not blocked
        if (cell === 0) {
          // In blind play mode, mud zones are not playable, so they count as "full"
          if (isBlindPlay && isInMudZone(row, col, mudZones)) {
            continue; // Mud zone in blind play - not playable, so it's effectively "full"
          }
          // Empty cell that's playable means board is not full
          return false;
        }
        
        // If cell is blocked (BLOCKED_CELL = 3), it's not playable, so it counts as "full"
        // If cell is occupied (1 or 2), it's not playable, so it counts as "full"
        // Continue checking other cells
      }
    }
    // All cells are either occupied, blocked, or (in blind play) in mud zones
    return true;
  }, [isBlindPlay, mudZones]);

  // Handle start countdown (3 seconds before game starts)
  useEffect(() => {
    if (showStartCountdown && startCountdown > 0) {
      const timer = setTimeout(() => {
        setStartCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showStartCountdown && startCountdown === 0) {
      setShowStartCountdown(false);
      setGameStarted(true);
      gameActiveRef.current = true;
      countdownCompletedRef.current = true; // Mark countdown as completed
      // Mark game as initialized when countdown completes
      if (onGameInitialized) {
        onGameInitialized();
      }
    }
  }, [showStartCountdown, startCountdown, onGameInitialized]);

  // Timer logic
  useEffect(() => {
    if (!gameStarted || timeLimit === 0 || winner !== 0 || !gameActiveRef.current) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (gameStarted && timeLeft > 0 && winner === 0 && gameActiveRef.current) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Before declaring timeout, check if board is full (draw)
            const currentBoard = boardRef.current;
            const isDraw = isBoardFull(currentBoard);
            
            if (isDraw && !gameProcessed && gameInitialized) {
              // Board is full - it's a draw, not a timeout
              setGameProcessed(true);
              popupScheduledRef.current = true;
              setWinner(0);
              setWinMessage('Draw! 🐝');
              gameActiveRef.current = false;
              
              // Clear timer
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              
              // Show draw popup after 1 second delay
              winPopupTimerRef.current = setTimeout(() => {
                if (currentMatch === undefined || isMatchComplete) {
                  setShowWinPopup(true);
                }
                winPopupTimerRef.current = null;
              }, 1000);
              
              // Notify parent of draw
              if (onGameWin) {
                setTimeout(() => {
                  onGameWin(false);
                }, 100);
              }
              return 0;
            }
            
            // Time's up - current player loses (only if board is not full)
            if (!gameProcessed && gameInitialized && !isDraw) {
              const timeWinner = currentPlayer === 1 ? 2 : 1;
              setGameProcessed(true);
              popupScheduledRef.current = true;
              setWinner(timeWinner);
              const winText = timeWinner === 1 ? 'Time\'s Up - You Won! 🐝' : 'Time\'s Up - You Lost 🐝';
              setWinMessage(winText);
              gameActiveRef.current = false;
              
              // Show win popup after 1 second delay
              // For match games: always show popup for timeout, even if match not complete
              // This allows player to see they lost due to time, then match proceeds normally
              // The useEffect will auto-close it after 2 seconds for incomplete matches
              winPopupTimerRef.current = setTimeout(() => {
                setShowWinPopup(true);
                winPopupTimerRef.current = null;
              }, 1000);
              
              // Notify parent of game result (for match tracking)
              // This will trigger match progression logic in AdventureGame
              if (onGameWin) {
                setTimeout(() => {
                  onGameWin(timeWinner === 1);
                }, 100);
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameStarted, timeLeft, currentPlayer, winner, timeLimit, gameProcessed, gameInitialized, onGameWin, currentMatch, isMatchComplete, isBoardFull, isAdventureMode]);

  // Reset timer when player changes
  useEffect(() => {
    if (winner === 0 && gameActiveRef.current) {
      setTimeLeft(timeLimit);
    }
  }, [currentPlayer, timeLimit, winner]);

  // Handle temporary blind play reset after one move
  useEffect(() => {
    if (!isAdventureMode || !gameNumber || (currentMatch !== 1 && currentMatch !== undefined)) {
      return;
    }
    
    // Reset temporary blind play after one move (only for temporary, not persistent)
    // Check if we've moved past the trigger move (meaning one move has been made)
    if (temporaryBlindPlayRef.current && !persistentBlindPlayRef.current && totalMoveCount > blindPlayTriggerMoveRef.current && blindPlayTriggerMoveRef.current > 0) {
      setTemporaryBlindPlay(false);
      setBlindPlayTriggerMove(0);
      temporaryBlindPlayRef.current = false;
      blindPlayTriggerMoveRef.current = 0;
    }
  }, [totalMoveCount, isAdventureMode, gameNumber, currentMatch]);

  // Check for draw when board is full (independent of moves)
  useEffect(() => {
    // Only check if game is active, no winner yet, and game is initialized
    if (!gameStarted || winner !== 0 || !gameActiveRef.current || !gameInitialized || gameProcessed) {
      return;
    }

    // Check if board is full (accounting for blocked cells and mud zones)
    const isDraw = isBoardFull(board);

    if (isDraw) {
      // Board is full - declare draw immediately
      setGameProcessed(true);
      popupScheduledRef.current = true;
      
      setWinner(0);
      setWinMessage('Draw! 🐝');
      gameActiveRef.current = false; // Stop timer immediately
      
      // Clear any running timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Show draw popup after 1 second delay
      winPopupTimerRef.current = setTimeout(() => {
        // Only show win popup if it's not a match game, or if the match is complete
        if (currentMatch === undefined || isMatchComplete) {
          setShowWinPopup(true);
        }
        winPopupTimerRef.current = null;
      }, 1000);
      
      // Notify parent of game result (draw) for match tracking
      if (onGameWin) {
        setTimeout(() => {
          // For draws, we pass false (player didn't win)
          // The match system will handle draws appropriately
          onGameWin(false);
        }, 100);
      }
    }
  }, [board, winner, gameStarted, gameInitialized, gameProcessed, isAdventureMode, currentMatch, isMatchComplete, onGameWin, isBoardFull]);

  // Check for winner (using adventure game logic if in adventure mode)
  const checkWinner = (row: number, col: number, player: 1 | 2): boolean => {
    if (isAdventureMode) {
      return checkWinCondition(board, row, col, player);
    }
    
    // Classic mode check
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal /
      [1, -1]   // diagonal \
    ];

    for (const [dx, dy] of directions) {
      let count = 1;

      // Check in positive direction
      for (let i = 1; i < 5; i++) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;
        if (
          newRow >= 0 &&
          newRow < BOARD_SIZE &&
          newCol >= 0 &&
          newCol < BOARD_SIZE &&
          board[newRow][newCol] === player
        ) {
          count++;
        } else {
          break;
        }
      }

      // Check in negative direction
      for (let i = 1; i < 5; i++) {
        const newRow = row - dx * i;
        const newCol = col - dy * i;
        if (
          newRow >= 0 &&
          newRow < BOARD_SIZE &&
          newCol >= 0 &&
          newCol < BOARD_SIZE &&
          board[newRow][newCol] === player
        ) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 5) {
        return true;
      }
    }

    return false;
  };

  // AI helper functions (match bee-five-web behavior exactly)
  const checkThreeInARow = useCallback((testBoard: CellValue[][], row: number, col: number, player: 1 | 2): boolean => {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dRow, dCol] of directions) {
      let count = 1;
      for (let i = 1; i < 4; i++) {
        const newRow = row + i * dRow;
        const newCol = col + i * dCol;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE && testBoard[newRow][newCol] === player) {
          count++;
        } else {
          break;
        }
      }
      for (let i = 1; i < 4; i++) {
        const newRow = row - i * dRow;
        const newCol = col - i * dCol;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE && testBoard[newRow][newCol] === player) {
          count++;
        } else {
          break;
        }
      }
      if (count >= 3) return true;
    }
    return false;
  }, []);

  const checkTwoInARow = useCallback((testBoard: CellValue[][], row: number, col: number, player: 1 | 2): boolean => {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dRow, dCol] of directions) {
      let count = 1;
      for (let i = 1; i < 3; i++) {
        const newRow = row + i * dRow;
        const newCol = col + i * dCol;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE && testBoard[newRow][newCol] === player) {
          count++;
        } else {
          break;
        }
      }
      for (let i = 1; i < 3; i++) {
        const newRow = row - i * dRow;
        const newCol = col - i * dCol;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE && testBoard[newRow][newCol] === player) {
          count++;
        } else {
          break;
        }
      }
      if (count >= 2) return true;
    }
    return false;
  }, []);

  const checkFourInARow = useCallback((testBoard: CellValue[][], row: number, col: number, player: 1 | 2): boolean => {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dRow, dCol] of directions) {
      let count = 1;
      for (let i = 1; i < 5; i++) {
        const newRow = row + i * dRow;
        const newCol = col + i * dCol;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE && testBoard[newRow][newCol] === player) {
          count++;
        } else {
          break;
        }
      }
      for (let i = 1; i < 5; i++) {
        const newRow = row - i * dRow;
        const newCol = col - i * dCol;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE && testBoard[newRow][newCol] === player) {
          count++;
        } else {
          break;
        }
      }
      if (count >= 4) return true;
    }
    return false;
  }, []);

  const isNearHumanPiece = useCallback((testBoard: CellValue[][], row: number, col: number): boolean => {
    for (let dRow = -2; dRow <= 2; dRow++) {
      for (let dCol = -2; dCol <= 2; dCol++) {
        if (dRow === 0 && dCol === 0) continue;
        const newRow = row + dRow;
        const newCol = col + dCol;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE && testBoard[newRow][newCol] === 1) {
          return true;
        }
      }
    }
    return false;
  }, []);

  const canReachFive = useCallback((testBoard: CellValue[][], row: number, col: number, player: 1 | 2): boolean => {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of directions) {
      let count = 1;
      let emptySpaces = 0;
      for (let direction = -1; direction <= 1; direction += 2) {
        for (let i = 1; i <= 4; i++) {
          const newRow = row + (dr * i * direction);
          const newCol = col + (dc * i * direction);
          if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) break;
          if (testBoard[newRow][newCol] === player) {
            count++;
          } else if (testBoard[newRow][newCol] === 0) {
            emptySpaces++;
          } else {
            break; // Blocked cells or opponent pieces stop the line
          }
        }
      }
      if (count + emptySpaces >= 5) return true;
    }
    return false;
  }, []);

  // Use imported checkWinCondition from adventureGameLogic

  // AI Move Functions
  const getEasyAIMove = useCallback((availableCells: {row: number, col: number}[], currentBoard: CellValue[][]): {row: number, col: number} => {
    // Priority 1: Take winning move if available
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 2;
      if (checkWinCondition(testBoard, cell.row, cell.col, 2)) {
        return cell;
      }
    }

    // Priority 2: Block if human can win immediately (but only 50% of the time)
    if (Math.random() > 0.5) {
      for (let cell of availableCells) {
        const testBoard = currentBoard.map(r => [...r]);
        testBoard[cell.row][cell.col] = 1;
        if (checkWinCondition(testBoard, cell.row, cell.col, 1)) {
          return cell;
        }
      }
    }

    // Priority 3: Random move
    return availableCells[Math.floor(Math.random() * availableCells.length)];
  }, [checkWinCondition]);

  const getMediumAIMove = useCallback((availableCells: {row: number, col: number}[], currentBoard: CellValue[][]): {row: number, col: number} => {
    // Priority 1: Take winning move if available
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 2;
      if (checkWinCondition(testBoard, cell.row, cell.col, 2)) {
        return cell;
      }
    }

    // Priority 2: Block if human can win immediately
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 1;
      if (checkWinCondition(testBoard, cell.row, cell.col, 1)) {
        return cell;
      }
    }

    // Priority 3: Block 3-in-a-row threats
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 1;
      if (checkThreeInARow(testBoard, cell.row, cell.col, 1)) {
        return cell;
      }
    }

    // Priority 4: Create 3-in-a-row if it can lead to 5
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 2;
      if (checkThreeInARow(testBoard, cell.row, cell.col, 2) && canReachFive(testBoard, cell.row, cell.col, 2)) {
        return cell;
      }
    }

    // Priority 5: Block 2-in-a-row threats
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 1;
      if (checkTwoInARow(testBoard, cell.row, cell.col, 1)) {
        return cell;
      }
    }

    // Priority 6: Create 2-in-a-row if it can lead to 5
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 2;
      if (checkTwoInARow(testBoard, cell.row, cell.col, 2) && canReachFive(testBoard, cell.row, cell.col, 2)) {
        return cell;
      }
    }

    // Priority 7: Random move
    return availableCells[Math.floor(Math.random() * availableCells.length)];
  }, [checkWinCondition, checkThreeInARow, checkTwoInARow, canReachFive]);

  const getHardAIMove = useCallback((availableCells: {row: number, col: number}[], currentBoard: CellValue[][]): {row: number, col: number} => {
    // Priority 1: Take winning move if available
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 2;
      if (checkWinCondition(testBoard, cell.row, cell.col, 2)) {
        return cell;
      }
    }

    // Priority 2: Block if human can win immediately
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 1;
      if (checkWinCondition(testBoard, cell.row, cell.col, 1)) {
        return cell;
      }
    }

    // Priority 3: Block 4-in-a-row threats
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 1;
      if (checkFourInARow(testBoard, cell.row, cell.col, 1)) {
        return cell;
      }
    }

    // Priority 4: Create 4-in-a-row if possible
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 2;
      if (checkFourInARow(testBoard, cell.row, cell.col, 2)) {
        return cell;
      }
    }

    // Priority 5: Block 3-in-a-row threats
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 1;
      if (checkThreeInARow(testBoard, cell.row, cell.col, 1)) {
        return cell;
      }
    }

    // Priority 6: Create 3-in-a-row if it can lead to 5
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 2;
      if (checkThreeInARow(testBoard, cell.row, cell.col, 2) && canReachFive(testBoard, cell.row, cell.col, 2)) {
        return cell;
      }
    }

    // Priority 7: Block 2-in-a-row threats
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 1;
      if (checkTwoInARow(testBoard, cell.row, cell.col, 1)) {
        return cell;
      }
    }

    // Priority 8: Create 2-in-a-row if it can lead to 5
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 2;
      if (checkTwoInARow(testBoard, cell.row, cell.col, 2) && canReachFive(testBoard, cell.row, cell.col, 2)) {
        return cell;
      }
    }

    // Priority 9: Strategic positioning near existing pieces
    for (let cell of availableCells) {
      if (isNearHumanPiece(currentBoard, cell.row, cell.col)) {
        return cell;
      }
    }

    // Priority 10: Try to control center area
    const centerCells = availableCells.filter(cell => {
      const centerRow = 4.5;
      const centerCol = 4.5;
      const distance = Math.sqrt(Math.pow(cell.row - centerRow, 2) + Math.pow(cell.col - centerCol, 2));
      return distance <= 2;
    });
    
    if (centerCells.length > 0) {
      return centerCells[Math.floor(Math.random() * centerCells.length)];
    }

    // Priority 11: Random move
    return availableCells[Math.floor(Math.random() * availableCells.length)];
  }, [checkWinCondition, checkFourInARow, checkThreeInARow, checkTwoInARow, canReachFive, isNearHumanPiece]);

  const getBestAIMove = useCallback((availableCells: {row: number, col: number}[], currentBoard: CellValue[][]): {row: number, col: number} => {
    // For blind play games, AI makes completely random moves
    if (isBlindPlay) {
      return availableCells[Math.floor(Math.random() * availableCells.length)];
    }
    
    // For normal games, use difficulty-based AI
    if (aiDifficulty === 'easy') {
      return getEasyAIMove(availableCells, currentBoard);
    } else if (aiDifficulty === 'medium') {
      return getMediumAIMove(availableCells, currentBoard);
    } else {
      return getHardAIMove(availableCells, currentBoard);
    }
  }, [aiDifficulty, isBlindPlay, getEasyAIMove, getMediumAIMove, getHardAIMove]);

  const makeAIMove = useCallback(() => {
    if (winner !== 0 || !gameActiveRef.current) return;

    setBoard(currentBoard => {
      // Get available cells from current board state (excluding blocked cells and mud zones in blind play)
      const availableCells: {row: number, col: number}[] = [];
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (currentBoard[row][col] === 0) {
            // In blind play mode, AI should avoid mud zones too
            if (isBlindPlay && isInMudZone(row, col, mudZones)) {
              continue;
            }
            availableCells.push({ row, col });
          }
        }
      }

      if (availableCells.length === 0) return currentBoard;

      // Get AI move
      const selectedCell = getBestAIMove(availableCells, currentBoard);

      // Make the AI move
      let newBoard = currentBoard.map(r => [...r]);
      newBoard[selectedCell.row][selectedCell.col] = 2;

      // Get current pieceAges and player2MoveCount from refs
      let updatedPieceAges = ageAllPieces(newBoard, pieceAgesRef.current);
      updatedPieceAges[selectedCell.row][selectedCell.col] = 0; // New piece starts at age 0
      
      const newPlayer2MoveCount = player2MoveCountRef.current + 1;
      setPlayer2MoveCount(newPlayer2MoveCount);
      
      // Increment total move count
      const newTotalMoveCount = totalMoveCountRef.current + 1;
      setTotalMoveCount(newTotalMoveCount);

      // Handle adventure mode obstacles
      if (isAdventureMode && gameNumber) {
        // Progressive blocks (games ending with 3) - handled on human moves only
        // Disappearing blocks (games ending with 4) - handled on human moves only
        // Block shifting (games ending with 7 or 8) - handled on human moves only
        
        // Piece capacity (multiples of 17) - enforce 35 piece limit
        if (isMultipleOf17(gameNumber)) {
          const capacityResult = enforcePieceCapacity(newBoard, updatedPieceAges, 35);
          newBoard = capacityResult.board;
          updatedPieceAges = capacityResult.pieceAges;
        }
        
        // Disappearing pieces - remove 2 oldest opponent pieces every 4 moves
        if (isMultipleOf7Between500And1000(gameNumber) || isMultipleOf4From1000(gameNumber)) {
          if (newPlayer2MoveCount % 4 === 0) {
            const disappearResult = removeOldestPiecesOfPlayer(newBoard, updatedPieceAges, 1, 2);
            newBoard = disappearResult.board;
            updatedPieceAges = disappearResult.pieceAges;
          }
        }
        
        // Board rearrangement (multiples of 50, match 3) - every 5 total moves
        if (isMultipleOf50Match3(gameNumber, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 5 === 0) {
          const rearrangeResult = rearrangeBoard(newBoard, updatedPieceAges);
          newBoard = rearrangeResult.board;
          updatedPieceAges = rearrangeResult.pieceAges;
        }
        
        // Piece swapping (multiples of 50, match 4) - every 5 total moves
        if (isMultipleOf50Match4(gameNumber, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 5 === 0) {
          const swapResult = swapOpponentPiecePairs(newBoard, updatedPieceAges);
          newBoard = swapResult.board;
          updatedPieceAges = swapResult.pieceAges;
        }
        
        // Piece swapping for multiples of 10 Match 2/3 from game 30 every 9 moves
        if (isMultipleOf10Match2From30(gameNumber, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 9 === 0) {
          const swapResult = swapOpponentPiecePairs(newBoard, updatedPieceAges);
          newBoard = swapResult.board;
          updatedPieceAges = swapResult.pieceAges;
        }
        
        // Piece swapping for multiples of 10 Match 2/3 from game 330 every 7 moves
        if (isMultipleOf10Match2From330(gameNumber, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 7 === 0) {
          const swapResult = swapOpponentPiecePairs(newBoard, updatedPieceAges);
          newBoard = swapResult.board;
          updatedPieceAges = swapResult.pieceAges;
        }
        
        // Piece swapping for multiples of 10 Match 2/3 from game 730 every 5 moves
        if (isMultipleOf10Match2From730(gameNumber, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 5 === 0) {
          const swapResult = swapOpponentPiecePairs(newBoard, updatedPieceAges);
          newBoard = swapResult.board;
          updatedPieceAges = swapResult.pieceAges;
        }
        
        // Swap all pieces for multiples of 10 match 1 from game 60 every 11 moves
        if (isMultipleOf10Match1From60(gameNumber, currentMatch || 1) && newTotalMoveCount > 0 && newTotalMoveCount % 11 === 0) {
          const swapAllResult = swapAllPieces(newBoard, updatedPieceAges);
          newBoard = swapAllResult.board;
          updatedPieceAges = swapAllResult.pieceAges;
        }
        
        // Swap all pieces for games ending with 1 (31, 41, 61, 81, 101, 121, etc.) every 13 moves
        // Exclude games in strategic blocking ranges (500-700 and 1001-1591)
        // Starts from game 31 (not game 1, 11, or 21)
        if (gameNumber % 10 === 1 && gameNumber >= 31 && !gameEndsWith1InSpecifiedRanges(gameNumber) && newTotalMoveCount > 0 && newTotalMoveCount % 13 === 0) {
          const swapAllResult = swapAllPieces(newBoard, updatedPieceAges);
          newBoard = swapAllResult.board;
          updatedPieceAges = swapAllResult.pieceAges;
        }
      }
      
      // Update piece ages state
      setPieceAges(updatedPieceAges);

      // Check for winner using the new board
      if (checkWinCondition(newBoard, selectedCell.row, selectedCell.col, 2)) {
        // Don't process if already processed
        if (gameProcessed && popupScheduledRef.current) {
          return newBoard;
        }
        // For classic mode (non-adventure), allow win detection even if gameInitialized is false
        // For adventure mode, respect gameInitialized to prevent premature win detection during countdown
        if (isAdventureMode && !gameInitialized) {
          return newBoard;
        }
        
        // AI wins - process the win
        
        setGameProcessed(true);
        popupScheduledRef.current = true;
        
        setWinner(2);
        setWinMessage('You Lost 🐝');
        gameActiveRef.current = false;
        
        // Show win popup after 1 second delay (matching bee-five-web)
        // But hide it during match series games (only show when series is complete)
        winPopupTimerRef.current = setTimeout(() => {
          // Only show win popup if it's not a match game, or if the match is complete
          if (currentMatch === undefined || isMatchComplete) {
            setShowWinPopup(true);
          }
          winPopupTimerRef.current = null;
        }, 1000);
        
        // Notify parent of game loss (for match tracking)
        if (onGameWin) {
          setTimeout(() => {
            onGameWin(false);
          }, 100);
        }
        } else {
        // Check for draw (accounting for blocked cells and mud zones)
        const isDraw = isBoardFull(newBoard);
        if (isDraw) {
          // Don't process if already processed
          if (gameProcessed && popupScheduledRef.current) {
            return newBoard;
          }
          // For classic mode (non-adventure), allow draw detection even if gameInitialized is false
          // For adventure mode, respect gameInitialized to prevent premature draw detection during countdown
          if (isAdventureMode && !gameInitialized) {
            return newBoard;
          }
          
          setGameProcessed(true);
          popupScheduledRef.current = true;
          
          // In adventure mode, draw means the game ends - stop timer and show draw popup
          if (isAdventureMode) {
            setWinner(0);
            setWinMessage('Draw! 🐝');
            gameActiveRef.current = false;
            
            // Show draw popup after 1 second delay
            winPopupTimerRef.current = setTimeout(() => {
              // Only show win popup if it's not a match game, or if the match is complete
              if (currentMatch === undefined || isMatchComplete) {
                setShowWinPopup(true);
              }
              winPopupTimerRef.current = null;
            }, 1000);
            
            // Notify parent of game result (draw) for match tracking
            if (onGameWin) {
              setTimeout(() => {
                // For draws, we pass false (player didn't win)
                // The match system will handle draws appropriately
                onGameWin(false);
              }, 100);
            }
            return newBoard;
          }
          
          // Classic mode: show draw popup
          setWinner(0);
          setWinMessage('Draw! 🐝');
          gameActiveRef.current = false;
          
          // Show win popup after 1 second delay (matching bee-five-web)
          winPopupTimerRef.current = setTimeout(() => {
            setShowWinPopup(true);
            winPopupTimerRef.current = null;
          }, 1000);
        } else {
          // Game continues - switch to player
          // Use setTimeout to ensure this happens after the setBoard state update completes
          setTimeout(() => {
            if (gameActiveRef.current && winner === 0) {
              setCurrentPlayer(1);
            }
          }, 150);
        }
      }

      return newBoard;
    });
  }, [winner, getBestAIMove, checkWinCondition, isBlindPlay, mudZones, isAdventureMode, onGameWin, gameProcessed, gameInitialized, currentMatch, isMatchComplete]);

  // AI move logic
  useEffect(() => {
    // For adventure mode, ensure game is initialized before AI can play
    // For classic mode, gameInitialized might be false, so allow AI to play anyway
    const canAIPlay = isAdventureMode ? (gameStarted && gameInitialized) : gameStarted;
    
    if (canAIPlay && currentPlayer === 2 && winner === 0 && gameActiveRef.current) {
      // AI's turn - make a move after a short delay
      const timer = setTimeout(() => {
        // Double-check conditions right before making the move
        if (gameActiveRef.current) {
          makeAIMove();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameStarted, gameInitialized, isAdventureMode, currentPlayer, winner, makeAIMove]);

  // Handle cell click (player's turn only)
  const handleCellClick = (row: number, col: number) => {
    if (!gameStarted || winner !== 0 || currentPlayer !== 1 || !gameActiveRef.current) {
      return;
    }

    // Check if cell is valid (not blocked, not occupied, not in mud zone during blind play)
    if (board[row][col] !== 0) {
      return;
    }
    
    if (isBlindPlay && isInMudZone(row, col, mudZones)) {
      return;
    }

    let newBoard = board.map(r => [...r]);
    newBoard[row][col] = 1;
    
    // Update piece ages - age all existing pieces, then set new piece age to 0
    let updatedPieceAges = ageAllPieces(newBoard, pieceAgesRef.current);
    updatedPieceAges[row][col] = 0; // New piece starts at age 0
    
    // Update player move counts
    const newPlayer1MoveCount = player1MoveCountRef.current + 1;
    setPlayer1MoveCount(newPlayer1MoveCount);
    
    // Increment total move count
    const newTotalMoveCount = totalMoveCountRef.current + 1;
    setTotalMoveCount(newTotalMoveCount);
    
    // Handle adventure mode obstacles
    if (isAdventureMode && gameNumber) {
      const newHumanMoveCount = humanMoveCount + 1;
      setHumanMoveCount(newHumanMoveCount);
      
      // Progressive blocks (games ending with 3)
      if (gameEndsWith3(gameNumber)) {
        const rules = getProgressiveBlockRules(gameNumber);
        if (rules.blocksToAdd > 0 && newHumanMoveCount % rules.movesInterval === 0) {
          newBoard = addProgressiveBlocks(newBoard, rules.blocksToAdd);
        }
      }
      
      // Disappearing blocks (games ending with 4)
      if (gameEndsWith4(gameNumber)) {
        if (newHumanMoveCount % 3 === 0) {
          newBoard = removeTwoBlockedCells(newBoard);
        }
      }
      
      // Strategic blocking (multiples of 50, match 1 - games 200, 250, 300, etc.)
      if (gameNumber && gameNumber % 50 === 0 && currentMatch === 1) {
        // First match of best-of-5 levels only (200, 250, 300, etc.): Every 8 human moves, add 1 strategic block
        if (newHumanMoveCount % 8 === 0) {
          newBoard = addStrategicBlock(newBoard);
        }
      }
      
      // Strategic blocking (games ending with 1 in ranges 500-700 and 1001-1591)
      if (gameEndsWith1InSpecifiedRanges(gameNumber)) {
        if (newHumanMoveCount % 8 === 0) {
          newBoard = addStrategicBlock(newBoard);
        }
      }
      
      // Block shifting (games ending with 7 or 8)
      const newBlockShiftMoveCount = blockShiftMoveCount + 1;
      setBlockShiftMoveCount(newBlockShiftMoveCount);
      
      // Games ending with 7 after game 250: Shift blocks every 2 moves
      if (gameEndsWith7After250(gameNumber)) {
        if (newBlockShiftMoveCount % 2 === 0) {
          newBoard = shiftAllBlocks(newBoard);
        }
      }
      
      // Games ending with 8 after game 600: Shift blocks every 5 moves
      if (gameEndsWith8After600(gameNumber)) {
        if (newBlockShiftMoveCount % 5 === 0) {
          newBoard = shiftAllBlocks(newBoard);
        }
      }
      
      // Strategic block movement for games ending with 9 from game 400
      if (gameNumber && gameNumber >= 400 && gameNumber % 10 === 9 && newTotalMoveCount === 27) {
        // Move one random block to a strategic position after exactly 27 moves
        newBoard = moveRandomBlockToStrategicPosition(newBoard);
      }
      
      // Piece capacity (multiples of 17) - enforce 35 piece limit
      if (isMultipleOf17(gameNumber)) {
        const capacityResult = enforcePieceCapacity(newBoard, updatedPieceAges, 35);
        newBoard = capacityResult.board;
        updatedPieceAges = capacityResult.pieceAges;
      }
      
      // Disappearing pieces - remove 2 oldest opponent pieces every 4 moves
      if (isMultipleOf7Between500And1000(gameNumber) || isMultipleOf4From1000(gameNumber)) {
        if (newPlayer1MoveCount % 4 === 0) {
          const disappearResult = removeOldestPiecesOfPlayer(newBoard, updatedPieceAges, 2, 2);
          newBoard = disappearResult.board;
          updatedPieceAges = disappearResult.pieceAges;
        }
      }
      
      // Board rearrangement (multiples of 50, match 3) - every 5 total moves
      if (isMultipleOf50Match3(gameNumber, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 5 === 0) {
        const rearrangeResult = rearrangeBoard(newBoard, updatedPieceAges);
        newBoard = rearrangeResult.board;
        updatedPieceAges = rearrangeResult.pieceAges;
      }
      
      // Piece swapping (multiples of 50, match 4) - every 5 total moves
      if (isMultipleOf50Match4(gameNumber, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 5 === 0) {
        const swapResult = swapOpponentPiecePairs(newBoard, updatedPieceAges);
        newBoard = swapResult.board;
        updatedPieceAges = swapResult.pieceAges;
      }
      
      // Piece swapping for multiples of 10 Match 2/3 from game 30 every 9 moves
      if (isMultipleOf10Match2From30(gameNumber, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 9 === 0) {
        const swapResult = swapOpponentPiecePairs(newBoard, updatedPieceAges);
        newBoard = swapResult.board;
        updatedPieceAges = swapResult.pieceAges;
      }
      
      // Piece swapping for multiples of 10 Match 2/3 from game 330 every 7 moves
      if (isMultipleOf10Match2From330(gameNumber, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 7 === 0) {
        const swapResult = swapOpponentPiecePairs(newBoard, updatedPieceAges);
        newBoard = swapResult.board;
        updatedPieceAges = swapResult.pieceAges;
      }
      
      // Piece swapping for multiples of 10 Match 2/3 from game 730 every 5 moves
      if (isMultipleOf10Match2From730(gameNumber, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 5 === 0) {
        const swapResult = swapOpponentPiecePairs(newBoard, updatedPieceAges);
        newBoard = swapResult.board;
        updatedPieceAges = swapResult.pieceAges;
      }
      
      // Swap all pieces for multiples of 10 match 1 from game 60 every 11 moves
      if (isMultipleOf10Match1From60(gameNumber, currentMatch || 1) && newTotalMoveCount > 0 && newTotalMoveCount % 11 === 0) {
        const swapAllResult = swapAllPieces(newBoard, updatedPieceAges);
        newBoard = swapAllResult.board;
        updatedPieceAges = swapAllResult.pieceAges;
      }
      
      // Swap all pieces for games ending with 1 (31, 41, 61, 81, 101, 121, etc.) every 13 moves
      // Exclude games in strategic blocking ranges (500-700 and 1001-1591)
      // Starts from game 31 (not game 1, 11, or 21)
      if (gameNumber % 10 === 1 && gameNumber >= 31 && !gameEndsWith1InSpecifiedRanges(gameNumber) && newTotalMoveCount > 0 && newTotalMoveCount % 13 === 0) {
        const swapAllResult = swapAllPieces(newBoard, updatedPieceAges);
        newBoard = swapAllResult.board;
        updatedPieceAges = swapAllResult.pieceAges;
      }
    }
    
    setBoard(newBoard);
    setPieceAges(updatedPieceAges);

    // Don't process if already processed
    if (gameProcessed && popupScheduledRef.current) {
      return;
    }
    // For classic mode (non-adventure), allow win detection even if gameInitialized is false
    // For adventure mode, respect gameInitialized to prevent premature win detection during countdown
    if (isAdventureMode && !gameInitialized) {
      return;
    }
    
    // Check for winner
    if (checkWinner(row, col, 1)) {
      setGameProcessed(true);
      popupScheduledRef.current = true;
      
      setWinner(1);
      setWinMessage('You Won! 🐝');
      gameActiveRef.current = false;
      
      // Show win popup after 1 second delay (matching bee-five-web)
      // For classic mode (non-match games), always show the popup
      winPopupTimerRef.current = setTimeout(() => {
        // Show win popup if it's not a match game, or if the match is complete
        // For classic mode, currentMatch will be undefined, so popup will always show
        if (currentMatch === undefined || isMatchComplete) {
          setShowWinPopup(true);
        }
        winPopupTimerRef.current = null;
      }, 1000);
      
      // Notify parent of game win (for match tracking)
      if (onGameWin) {
        setTimeout(() => {
          onGameWin(true);
        }, 100);
      }
    } else {
      // Check for draw (accounting for blocked cells and mud zones)
      const isDraw = isBoardFull(newBoard);
      if (isDraw) {
        setGameProcessed(true);
        popupScheduledRef.current = true;
        
        // In adventure mode, draw means the game ends - stop timer and show draw popup
        if (isAdventureMode) {
          setWinner(0);
          setWinMessage('Draw! 🐝');
          gameActiveRef.current = false;
          
          // Show draw popup after 1 second delay
          winPopupTimerRef.current = setTimeout(() => {
            // Only show win popup if it's not a match game, or if the match is complete
            if (currentMatch === undefined || isMatchComplete) {
              setShowWinPopup(true);
            }
            winPopupTimerRef.current = null;
          }, 1000);
          
          // Notify parent of game result (draw) for match tracking
          if (onGameWin) {
            setTimeout(() => {
              // For draws, we pass false (player didn't win)
              // The match system will handle draws appropriately
              onGameWin(false);
            }, 100);
          }
          return;
        }
        
        // Classic mode: show draw popup
        setWinner(0);
        setWinMessage('Draw! 🐝');
        gameActiveRef.current = false;
        
        // Show win popup after 1 second delay (matching bee-five-web)
        winPopupTimerRef.current = setTimeout(() => {
          setShowWinPopup(true);
          winPopupTimerRef.current = null;
        }, 1000);
      } else {
        // Switch to AI
        setCurrentPlayer(2);
      }
    }
  };

  // Reset game
  const resetGame = () => {
    const matchNumber = currentMatch || 1;
    const resetBoard = isAdventureMode 
      ? createBoardWithBlocks(gameNumber || 1, persistentBlindPlay, matchNumber)
      : Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    
    setBoard(resetBoard);
    setMudZones(isAdventureMode && hasMudZones ? generateMudZones(gameNumber || 1) : []);
    setCurrentPlayer(isAdventureMode && gameRules ? gameRules.startingPlayer : 2);
    setWinner(0);
    setTimeLeft(timeLimit);
    setShowWinPopup(false);
    // For classic mode (no countdown), start immediately. For adventure mode, respect showCountdown
    setGameStarted(!showCountdown);
    setStartCountdown(showCountdown ? 3 : 0);
    setShowStartCountdown(showCountdown);
    setHumanMoveCount(0);
    setBlockShiftMoveCount(0);
    const resetPieceAges = initializePieceAges();
    setPieceAges(resetPieceAges);
    pieceAgesRef.current = resetPieceAges;
    setPlayer1MoveCount(0);
    player1MoveCountRef.current = 0;
    setPlayer2MoveCount(0);
    player2MoveCountRef.current = 0;
    setTotalMoveCount(0);
    totalMoveCountRef.current = 0;
    setTemporaryBlindPlay(false);
    setBlindPlayTriggerMove(0);
    temporaryBlindPlayRef.current = false;
    blindPlayTriggerMoveRef.current = 0;
    gameActiveRef.current = true;
    setGameProcessed(false);
    popupScheduledRef.current = false;
    countdownCompletedRef.current = false; // Reset countdown completion flag
    
    // Clear any pending timers
    if (winPopupTimerRef.current) {
      clearTimeout(winPopupTimerRef.current);
      winPopupTimerRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Get turn announcement
  const turnAnnouncement = winner !== 0 
    ? 'Game Over' 
    : currentPlayer === 1 
    ? 'Your Turn' 
    : "AI's Turn";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: backgroundStyle }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/BEE-FIVE.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Scoreboard/Game Info Container - only show for match system games */}
      {currentMatch !== undefined && playerWins !== undefined && aiWins !== undefined && (
        <View style={styles.gameInfoContainer}>
          <View style={styles.scoreboard}>
            <Text style={styles.scoreboardText}>
              You {playerWins} : {aiWins} AI
            </Text>
            {isMatchComplete && (
              <Text style={[
                styles.matchStatus,
                playerWins > aiWins ? styles.matchWon : styles.matchLost
              ]}>
                {playerWins > aiWins ? 'Match Won! 🎉' : 'Match Lost'}
              </Text>
            )}
            {isWaitingForNextGame && countdownTimer !== undefined && (
              <Text style={styles.matchStatus}>
                Next game in {countdownTimer}...
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Game Number, Current Player Indicator, and Timer - All on one line */}
      <View style={styles.playerIndicator}>
        {currentMatch !== undefined && totalGames !== undefined ? (
          <Text style={styles.gameNumberText}>
            Game {currentMatch} of {totalGames}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Text style={styles.playerText}>
          <Text style={styles.playSign}>▶</Text> {turnAnnouncement}
        </Text>
        {timeLimit > 0 && (
          <Text style={[styles.timerText, timeLeft < 5 && styles.timerTextWarning]}>
            ⏱️ {timeLeft}s
          </Text>
        )}
      </View>

      {/* Match Winner Announcement - shows for 2 seconds between matches */}
      {showMatchWinnerAnnouncement && matchWinnerMessage && (
        <Modal
          visible={showMatchWinnerAnnouncement}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.countdownOverlay}>
            <View style={styles.matchWinnerContainer}>
              <Text style={styles.matchWinnerText}>{matchWinnerMessage}</Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Countdown Overlay - Start countdown */}
      {showStartCountdown && !isWaitingForNextGame && (
        <Modal
          visible={showStartCountdown}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.countdownOverlay}>
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>{startCountdown > 0 ? startCountdown : 'GO!'}</Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Countdown Overlay - Between matches countdown */}
      {isWaitingForNextGame && countdownTimer !== undefined && countdownTimer > 0 && !showStartCountdown && (
        <Modal
          visible={isWaitingForNextGame && countdownTimer > 0 && !showStartCountdown}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.countdownOverlay}>
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>{countdownTimer}</Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Game Board */}
      <View style={styles.boardContainer}>
        {/* Blind Play Mode Overlay - positioned absolutely over board */}
        {isBlindPlay && gameStarted && (
          <View style={styles.blindPlayOverlayAbsolute}>
            <View style={styles.blindPlayContainer}>
              <Text style={styles.blindPlayTitle}>BLIND PLAY MODE</Text>
              <Text style={styles.blindPlayText}>Click anywhere to place your piece</Text>
            </View>
          </View>
        )}
        
        <View style={[styles.board, isBlindPlay && gameStarted && styles.boardHidden]}>
          {board.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((cell, colIndex) => {
                const isBlocked = cell === BLOCKED_CELL;
                const isMudZone = isAdventureMode && isInMudZone(rowIndex, colIndex, mudZones);
                const isEmpty = cell === 0;
                const isDisabled = !gameStarted || !isEmpty || isBlocked || winner !== 0 || currentPlayer !== 1;
                
                return (
                  <TouchableOpacity
                    key={`${rowIndex}-${colIndex}`}
                    style={[
                      styles.cell,
                      isBlocked && styles.blockedCell,
                      isMudZone && !isBlindPlay && styles.mudZoneCell,
                    ]}
                    onPress={() => handleCellClick(rowIndex, colIndex)}
                    disabled={isDisabled}
                  >
                    {!isBlindPlay && isBlocked && <Text style={styles.blockedIcon}>🐝</Text>}
                    {!isBlindPlay && isMudZone && !isBlocked && isEmpty && <Text style={styles.mudIcon}>🟤</Text>}
                    {!isBlindPlay && cell === 1 && <View style={[styles.piece, styles.blackPiece]} />}
                    {!isBlindPlay && cell === 2 && <View style={[styles.piece, styles.yellowPiece]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Win Popup - Show for non-match games, complete matches, or timeout cases in match games */}
      <Modal
        visible={showWinPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWinPopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>🐝</Text>
            <Text style={styles.modalTitle}>{winMessage}</Text>
            
            {/* Match progress display in win popup */}
            {currentMatch !== undefined && playerWins !== undefined && aiWins !== undefined && (
              <View style={styles.matchProgressInModal}>
                <Text style={styles.matchProgressLabel}>
                  Match: {playerWins} - {aiWins}
                </Text>
                {isWaitingForNextGame && countdownTimer !== undefined && (
                  <Text style={styles.matchCountdownText}>
                    Next game in {countdownTimer}...
                  </Text>
                )}
                {!isMatchComplete && !isWaitingForNextGame && (
                  <Text style={styles.matchInProgressText}>
                    Complete the match to proceed!
                  </Text>
                )}
                {isMatchComplete && (
                  <Text style={[styles.matchStatus, playerWins > aiWins ? styles.matchWon : styles.matchLost]}>
                    {playerWins > aiWins ? 'Match Won! 🎉' : 'Match Lost'}
                  </Text>
                )}
              </View>
            )}
            
            <View style={styles.modalButtons}>
              {/* For match games that are not complete, show message that match will continue automatically */}
              {(currentMatch !== undefined) && !isMatchComplete && (
                <Text style={styles.modalSubtitle}>
                  Match continues... Next game starting soon
                </Text>
              )}
              
              {((currentMatch === undefined) || isMatchComplete) && !isWaitingForNextGame && (
                <>
                  {/* For classic mode: Always show Play Again button */}
                  {!isAdventureMode && (
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.greenButton]}
                      onPress={() => {
                        resetGame();
                        setShowWinPopup(false);
                      }}
                    >
                      <Text style={styles.modalButtonText}>🔄 Play Again</Text>
                    </TouchableOpacity>
                  )}
                  
                  {/* For adventure mode: Show Continue when player wins, Play Again when AI wins or draw */}
                  {isAdventureMode && (
                    <>
                      {/* Continue button - only when player wins */}
                      {(winner === 1 || (timeLeft === 0 && currentPlayer === 2)) && (
                        <TouchableOpacity 
                          style={[styles.modalButton, styles.greenButton]}
                          onPress={() => {
                            setShowWinPopup(false);
                            if (winPopupTimerRef.current) {
                              clearTimeout(winPopupTimerRef.current);
                              winPopupTimerRef.current = null;
                            }
                            if (onContinueToNextGame) {
                              onContinueToNextGame();
                            } else if (onNextGame) {
                              onNextGame();
                            }
                          }}
                        >
                          <Text style={styles.modalButtonText}>➡️ Continue</Text>
                        </TouchableOpacity>
                      )}
                      
                      {/* Play Again for adventure mode when AI wins or draw */}
                      {(winner === 2 || (timeLeft === 0 && currentPlayer === 1) || (winner === 0)) && (
                        <TouchableOpacity 
                          style={[styles.modalButton, styles.greenButton]}
                          onPress={() => {
                            resetGame();
                            setShowWinPopup(false);
                          }}
                        >
                          <Text style={styles.modalButtonText}>🔄 Play Again</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.blueButton]}
                    onPress={() => {
                      setShowWinPopup(false);
                      if (winPopupTimerRef.current) {
                        clearTimeout(winPopupTimerRef.current);
                        winPopupTimerRef.current = null;
                      }
                      onBackToMenu();
                    }}
                  >
                    <Text style={styles.modalButtonText}>Back to Menu</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Match Results Popup - styled like BattleGame */}
      {showResultsPopup && currentMatch !== undefined && isMatchComplete && (
        <Modal
          visible={showResultsPopup}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Emoji */}
              <Text style={styles.modalEmoji}>
                {playerWins !== undefined && aiWins !== undefined && playerWins > aiWins ? '🏆' : '😔'}
              </Text>
              
              {/* Title */}
              <Text style={styles.modalTitle}>
                {playerWins !== undefined && aiWins !== undefined && playerWins > aiWins 
                  ? 'MATCH COMPLETE! 🎉' 
                  : 'MATCH COMPLETE'}
              </Text>
              
              {/* Subtitle */}
              {playerWins !== undefined && aiWins !== undefined && playerWins > aiWins && (
                <Text style={styles.modalSubtitle}>
                  YOU WIN! 🎊
                </Text>
              )}
              
              {/* Final Score Display - styled like BattleGame */}
              {playerWins !== undefined && aiWins !== undefined && (
                <View style={styles.finalScoreContainer}>
                  <View style={styles.finalScoreItem}>
                    <Text style={styles.finalScoreName}>You</Text>
                    <Text style={styles.finalScoreValue}>{playerWins}</Text>
                  </View>
                  <Text style={styles.finalScoreVS}>vs</Text>
                  <View style={styles.finalScoreItem}>
                    <Text style={styles.finalScoreName}>AI</Text>
                    <Text style={styles.finalScoreValue}>{aiWins}</Text>
                  </View>
                </View>
              )}
              
              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.greenButton]}
                  onPress={() => {
                    if (onCloseResultsPopup) {
                      onCloseResultsPopup();
                    }
                    if (playerWins !== undefined && aiWins !== undefined && playerWins > aiWins) {
                      // Player won: continue to next game
                      if (onResultsPopupNext) {
                        onResultsPopupNext();
                      }
                    } else {
                      // Player lost: restart the match series
                      if (onResultsPopupNext) {
                        onResultsPopupNext();
                      }
                    }
                  }}
                >
                  <Text style={styles.modalButtonText}>
                    {playerWins !== undefined && aiWins !== undefined && playerWins > aiWins 
                      ? '🏆 Continue Adventure' 
                      : '🔄 Play Again'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.blueButton]}
                  onPress={() => {
                    if (onCloseResultsPopup) {
                      onCloseResultsPopup();
                    }
                    onBackToMenu();
                  }}
                >
                  <Text style={styles.modalButtonText}>🏠 Back to Menu</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        {isAdventureMode ? (
          <>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={onBackToMenu}
            >
              <Text style={styles.footerButtonText}>🏠 Home</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={onBackToMap || onBackToMenu}
            >
              <Text style={styles.footerButtonText}>🗺️ Map</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={onBackToMenu}
            >
              <Text style={styles.footerButtonText}>🏠 Home</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={resetGame}
            >
              <Text style={styles.footerButtonText}>🔄 Restart</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 25,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#000000',
    borderBottomWidth: 2,
    borderBottomColor: '#FFC30B',
  },
  logoContainer: {
    width: 150,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  gameInfoContainer: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 2,
    borderBottomColor: '#FFC30B',
  },
  scoreboard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreboardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  playerIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  gameNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  playerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  playSign: {
    color: '#4CAF50',
    fontSize: 28,
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  timerTextWarning: {
    color: '#F44336',
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: BOARD_PADDING,
    paddingTop: BOARD_PADDING * 0.5,
    width: '100%',
  },
  board: {
    backgroundColor: '#87CEEB',
    borderRadius: 10,
    padding: BORDER_WIDTH,
    borderWidth: 3,
    borderColor: '#000',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#87CEEB',
    borderWidth: BORDER_WIDTH,
    borderColor: '#FFFFFF',
    margin: BORDER_WIDTH / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  piece: {
    width: CELL_SIZE / 1.5,
    height: CELL_SIZE / 1.5,
    borderRadius: (CELL_SIZE / 1.5) / 2,
  },
  blackPiece: {
    backgroundColor: '#000000',
  },
  yellowPiece: {
    backgroundColor: '#FFC30B',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    paddingBottom: 45,
    paddingHorizontal: 15,
    backgroundColor: '#000000',
  },
  footerButton: {
    backgroundColor: '#FFC30B',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    minWidth: 120,
    alignItems: 'center',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
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
    padding: 30,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#000',
    minWidth: 300,
    maxWidth: '90%',
  },
  modalEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
    minWidth: 120,
    alignItems: 'center',
  },
  greenButton: {
    backgroundColor: '#4CAF50',
  },
  blueButton: {
    backgroundColor: '#2196F3',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalSubtitle: {
    fontSize: 18,
    color: '#333',
    marginBottom: 25,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  finalScoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 25,
  },
  finalScoreItem: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 80,
  },
  finalScoreName: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  finalScoreValue: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  finalScoreVS: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  countdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: 'bold',
    color: '#FFC30B',
    textShadowColor: '#000',
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 8,
  },
  blockedCell: {
    backgroundColor: '#8B4513',
  },
  blockedIcon: {
    fontSize: CELL_SIZE * 0.6,
  },
  mudZoneCell: {
    backgroundColor: '#8B4513',
  },
  mudIcon: {
    fontSize: CELL_SIZE * 0.6,
    opacity: 0.7,
  },
  blindPlayOverlayAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(44, 44, 44, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'none', // Allow clicks to pass through
  },
  blindPlayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  blindPlayTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  blindPlayText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 30,
    textAlign: 'center',
  },
  boardHidden: {
    opacity: 0, // Hide board visually but keep it clickable
  },
  matchScoreContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
  },
  matchScoreBox: {
    backgroundColor: '#FFC30B',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
    minWidth: 200,
    alignItems: 'center',
  },
  matchScoreLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  matchScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  matchScoreItem: {
    alignItems: 'center',
  },
  matchScorePlayer: {
    fontSize: 12,
    color: '#000',
    marginBottom: 4,
  },
  matchScoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  matchScoreVS: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  matchStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#000',
  },
  matchWon: {
    color: '#4CAF50',
  },
  matchLost: {
    color: '#F44336',
  },
  matchInProgressText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 8,
  },
  matchProgressInModal: {
    marginBottom: 20,
    alignItems: 'center',
  },
  matchProgressLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  matchCountdownText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 8,
  },
  matchWinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 195, 11, 0.95)',
    padding: 40,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#000',
    minWidth: 300,
  },
  matchWinnerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    textShadowColor: '#FFF',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  resultsModalContent: {
    backgroundColor: '#FFC30B',
    borderRadius: 25,
    padding: 50,
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#6c757d',
    minWidth: 450,
    maxWidth: '90%',
  },
  resultsModalWon: {
    backgroundColor: '#FFD700',
    borderColor: '#FFC30B',
  },
  resultsModalEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  resultsModalTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#B8860B',
    marginBottom: 15,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  resultsModalSubtitle: {
    fontSize: 24,
    color: '#8B4513',
    marginBottom: 15,
    fontWeight: 'bold',
  },
  resultsModalResult: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#228B22',
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  resultsModalMessage: {
    fontSize: 20,
    color: '#8B4513',
    marginBottom: 30,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 28,
  },
  resultsModalScoreContainer: {
    marginBottom: 20,
    marginTop: 10,
    alignItems: 'center',
  },
  resultsModalScoreLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 12,
  },
  resultsModalScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  resultsModalScoreItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  resultsModalScorePlayer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 8,
  },
  resultsModalScoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#6c757d',
  },
  resultsModalScoreWinner: {
    color: '#228B22',
    fontSize: 42,
  },
  resultsModalScoreVS: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B4513',
  },
});

