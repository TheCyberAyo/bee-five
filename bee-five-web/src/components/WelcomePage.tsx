import React from 'react';

interface WelcomePageProps {
  onGameModeSelect: (gameMode: 'local' | 'online' | 'ai') => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onGameModeSelect }) => {
  return (
    <div className="welcome-page">
      <div className="welcome-container">
        <div className="inner-container">
          <div className="content-screen">
            <h1 className="game-title">
              Welcome <br /> to <br /> Bee-<span>Five</span>
            </h1>
            <p className="subtitle">Select the game mode to get started!</p>
            <div className="mode-selection">
              <button 
                className="mode-button"
                onClick={() => onGameModeSelect('local')}
              >
                Take Turns
              </button>
              <button 
                className="mode-button"
                onClick={() => onGameModeSelect('online')}
              >
                Online Play
              </button>
              <button 
                className="mode-button"
                onClick={() => onGameModeSelect('ai')}
              >
                Play AI
              </button>
            </div>
          </div>
        </div>
      </div>
      <footer className="welcome-footer">
        <p>&copy; 2025 Bee-Five. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default WelcomePage;
