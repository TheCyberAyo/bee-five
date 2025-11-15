import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { DIMENSIONS } from '../constants/dimensions';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DIFFICULTY_OPTIONS = [
  { label: '🟢 Easy', value: 'easy', color: '#4CAF50' },
  { label: '🟠 Medium', value: 'medium', color: '#FF9800' },
  { label: '🔴 Hard', value: 'hard', color: '#F44336' },
];

const TIMER_OPTIONS = [
  { label: '⏱️ With Timer (15s)', value: 15, color: '#2196F3' },
  { label: '∞ No Timer', value: 0, color: '#9C27B0' },
];

export default function PlayAISubmenu({
  onBackToMenu,
  onStartClassicGame,
  onAdventureSelect,
}) {
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);

  const handleClassicPress = () => {
    setSelectedDifficulty(null);
    setShowDifficultyModal(true);
  };

  const handleDifficultySelect = (value) => {
    setSelectedDifficulty(value);
    setShowDifficultyModal(false);
    setShowTimerModal(true);
  };

  const handleTimerSelect = (value) => {
    if (!selectedDifficulty) {
      setShowTimerModal(false);
      return;
    }
    setShowTimerModal(false);
    onStartClassicGame?.({
      difficulty: selectedDifficulty,
      timer: value,
    });
  };

  const handleAdventurePress = () => {
    if (onAdventureSelect) {
      onAdventureSelect();
    } else {
      Alert.alert('Coming Soon', 'Adventure mode is coming to Expo soon! 🐝');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentCard}>
        <Text style={styles.title}>🤖 Play AI</Text>
        <Text style={styles.subtitle}>Choose how you want to challenge the hive.</Text>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.actionButton, styles.classicButton]}
            onPress={handleClassicPress}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonEmoji}>🎯</Text>
            <Text style={styles.buttonText}>Classic</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.adventureButton]}
            onPress={handleAdventurePress}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonEmoji}>🌍</Text>
            <Text style={styles.buttonText}>Adventure</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackToMenu}
          activeOpacity={0.85}
        >
          <Text style={styles.backButtonText}>Back to Menu</Text>
        </TouchableOpacity>
      </View>

      {/* Difficulty Modal */}
      <Modal
        visible={showDifficultyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDifficultyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🤖 Select Difficulty</Text>
            <Text style={styles.modalDescription}>
              Choose the AI difficulty level:
            </Text>
            <View style={styles.modalOptions}>
              {DIFFICULTY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionButton, { backgroundColor: option.color }]}
                  onPress={() => handleDifficultySelect(option.value)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.optionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowDifficultyModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Timer Modal */}
      <Modal
        visible={showTimerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⏱️ Select Timer</Text>
            <Text style={styles.modalDescription}>
              Decide if you want a timer for each turn:
            </Text>
            <View style={styles.modalOptions}>
              {TIMER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionButton, { backgroundColor: option.color }]}
                  onPress={() => handleTimerSelect(option.value)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.optionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowTimerModal(false);
                setShowDifficultyModal(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalButtonText}>Back</Text>
            </TouchableOpacity>
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
    height: '70%',
    minHeight: 400,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.PRIMARY,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    textShadowColor: '#000',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonGroup: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  actionButton: {
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
  classicButton: {
    backgroundColor: '#2196F3',
  },
  adventureButton: {
    backgroundColor: '#9C27B0',
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
    marginTop: 20,
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
    minHeight: SCREEN_HEIGHT * 0.4,
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  modalDescription: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalOptions: {
    gap: 12,
    marginBottom: 16,
  },
  optionButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});



