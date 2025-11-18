import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Handle local multiplayer mode
  if (gameMode === 'local-multiplayer') {
    // TODO: Implement SimpleGame component
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Local Multiplayer</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setGameMode('menu')}
        >
          <Text style={styles.buttonText}>Back to Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Handle AI game mode
  if (gameMode === 'ai-game') {
    // TODO: Implement AIGame component
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
    // TODO: Implement AdventureGame component
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Adventure Game</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setGameMode('menu')}
        >
          <Text style={styles.buttonText}>Back to Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Handle Competition mode
  if (gameMode === 'competition') {
    // TODO: Implement BattleGame component
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Competition</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setGameMode('menu')}
        >
          <Text style={styles.buttonText}>Back to Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Handle online multiplayer lobby
  if (gameMode === 'online-lobby') {
    // TODO: Implement MultiplayerLobby component
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Online Multiplayer</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setGameMode('menu')}
        >
          <Text style={styles.buttonText}>Back to Menu</Text>
        </TouchableOpacity>
      </View>
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


