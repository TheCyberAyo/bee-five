import React from 'react';
import { useGameLogic } from '../hooks/useGameLogic';
import GameCanvas from './GameCanvas';

interface GamePageProps {
  onBackToWelcome: () => void;
}

const GamePage: React.FC<GamePageProps> = ({ onBackToWelcome }) => {
  const [timeLimit] = React.useState(15);
  
  const { gameState, handleCellClick, resetGame } = useGameLogic({
    timeLimit
  });


  return (
    <div className="game-page">
      <div className="game-header">
        <h1 className="game-title">
          Bee-<span>Five</span>
        </h1>
      </div>

      <div className="game-content">
        <div className="game-grid-container">
          <div className="timer">
            Time Left: {gameState.timeLeft}s
          </div>
          <GameCanvas
            gameState={gameState}
            onCellClick={handleCellClick}
          />
        </div>
      </div>


      <div className="game-controls">
        <button className="control-button restart-button" onClick={() => resetGame()}>
          Restart
        </button>
        <button className="control-button back-button" onClick={onBackToWelcome}>
          Back to Menu
        </button>
      </div>

      <footer className="game-footer">
        &copy; 2025 PentAyo. All rights reserved.
      </footer>
    </div>
  );
};

export default GamePage;