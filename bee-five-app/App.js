import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Alert } from 'react-native';
// Use Expo Go compatible version (works in Expo Go)
import WelcomePage from './components/WelcomePageExpoGo';
// For Three.js version (requires development build), use:
// import WelcomePage from './components/WelcomePage';
import TakeTurnsSubmenu from './components/TakeTurnsSubmenu';
import SimpleGame from './components/SimpleGame';
import BattleGame from './components/BattleGame';
import PlayAISubmenu from './components/PlayAISubmenu';
import ClassicAIGame from './components/ClassicAIGame';

export default function App() {
  const [gameMode, setGameMode] = useState(null);
  const [showTakeTurnsSubmenu, setShowTakeTurnsSubmenu] = useState(false);
  const [showPlayAISubmenu, setShowPlayAISubmenu] = useState(false);
  const [classicAIConfig, setClassicAIConfig] = useState(null);
  
  // Battle state
  const [battleOptions, setBattleOptions] = useState(null);
  const [battleScores, setBattleScores] = useState({ player1: 0, player2: 0 });
  const [battleGamesPlayed, setBattleGamesPlayed] = useState(0);
  const [battleWinner, setBattleWinner] = useState('');
  const [showBattleWinnerModal, setShowBattleWinnerModal] = useState(false);

  const handleGameModeSelect = (mode, options = {}) => {
    if (mode === 'take-turns-submenu') {
      setShowTakeTurnsSubmenu(true);
      return;
    } else if (mode === 'ai') {
      setShowPlayAISubmenu(true);
      return;
    }

    setGameMode(mode);
    
    // Handle different game modes
    if (mode === 'local-multiplayer') {
      // SimpleGame component will be rendered below
      return;
    } else if (mode === 'battle') {
      // Store battle options and reset battle state
      setBattleOptions(options);
      setBattleScores({ player1: 0, player2: 0 });
      setBattleGamesPlayed(0);
      setBattleWinner('');
      setShowBattleWinnerModal(false);
      return;
    } else {
      // For other modes, show alert for now
      Alert.alert(
        'Game Mode Selected',
        `You selected: ${mode === 'local' ? 'Take Turns' : mode === 'ai' ? 'AI Game' : 'Online Multiplayer'}`,
        [{ text: 'OK', onPress: () => setGameMode(null) }]
      );
    }
  };

  const handleBackToMenu = () => {
    setShowTakeTurnsSubmenu(false);
    setGameMode(null);
    setBattleOptions(null);
    setBattleScores({ player1: 0, player2: 0 });
    setBattleGamesPlayed(0);
    setBattleWinner('');
    setShowBattleWinnerModal(false);
    setShowPlayAISubmenu(false);
    setClassicAIConfig(null);
  };

  const handleStartClassicAI = ({ difficulty, timer }) => {
    setClassicAIConfig({ difficulty, timer });
    setShowPlayAISubmenu(false);
    setGameMode('ai-classic');
  };

  // Handle local multiplayer game mode
  if (gameMode === 'local-multiplayer') {
    return (
      <View style={styles.container}>
        <SimpleGame onBackToMenu={handleBackToMenu} />
        <StatusBar style="dark" />
      </View>
    );
  }

  // Handle battle game mode
  if (gameMode === 'battle' && battleOptions) {
    return (
      <View style={styles.container}>
        <BattleGame
          battleLength={battleOptions.battleLength}
          player1Name={battleOptions.player1Name}
          player2Name={battleOptions.player2Name}
          battleScores={battleScores}
          setBattleScores={setBattleScores}
          battleGamesPlayed={battleGamesPlayed}
          setBattleGamesPlayed={setBattleGamesPlayed}
          setBattleWinner={setBattleWinner}
          showBattleWinnerModal={showBattleWinnerModal}
          setShowBattleWinnerModal={setShowBattleWinnerModal}
          onBackToMenu={handleBackToMenu}
          timeLimit={battleOptions.timerOption}
        />
        <StatusBar style="dark" />
      </View>
    );
  }

  // Handle AI classic mode
  if (gameMode === 'ai-classic' && classicAIConfig) {
    return (
      <View style={styles.container}>
        <ClassicAIGame
          onBackToMenu={handleBackToMenu}
          difficulty={classicAIConfig.difficulty}
          timeLimit={classicAIConfig.timer}
        />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showTakeTurnsSubmenu ? (
        <TakeTurnsSubmenu 
          onBackToMenu={handleBackToMenu}
          onGameModeSelect={handleGameModeSelect}
        />
      ) : showPlayAISubmenu ? (
        <PlayAISubmenu
          onBackToMenu={handleBackToMenu}
          onStartClassicGame={handleStartClassicAI}
          onAdventureSelect={() =>
            Alert.alert(
              'Adventure Mode',
              'Adventure mode is coming to Expo soon! 🐝'
            )
          }
        />
      ) : (
        <WelcomePage onGameModeSelect={handleGameModeSelect} />
      )}
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
