import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { DIMENSIONS } from '../../constants/dimensions';
import { COLORS } from '../../constants/colors';

const GAME_MODES = [
  { id: 'local', emoji: '👥', label: 'Take Turns', color: COLORS.BUTTON_TAKE_TURNS },
  { id: 'ai', emoji: '🤖', label: 'AI Game', color: COLORS.BUTTON_AI },
  { id: 'online', emoji: '🌐', label: 'Online Multiplayer', color: COLORS.BUTTON_ONLINE },
];

export default function GameModeButtons({ onGameModeSelect }) {
  return (
    <View style={styles.container}>
      {GAME_MODES.map((mode) => (
        <TouchableOpacity
          key={mode.id}
          style={[styles.button, { backgroundColor: mode.color }]}
          onPress={() => {
            if (mode.id === 'local') {
              onGameModeSelect && onGameModeSelect('take-turns-submenu');
            } else {
              onGameModeSelect && onGameModeSelect(mode.id);
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.emoji}>{mode.emoji}</Text>
          <Text style={styles.text}>{mode.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 15,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: DIMENSIONS.BUTTON_PADDING_VERTICAL,
    paddingHorizontal: DIMENSIONS.BUTTON_PADDING_HORIZONTAL,
    borderRadius: 20,
    minWidth: DIMENSIONS.BUTTON_MIN_WIDTH,
    borderWidth: DIMENSIONS.BUTTON_BORDER_WIDTH,
    borderColor: COLORS.PRIMARY,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  emoji: {
    fontSize: DIMENSIONS.BUTTON_EMOJI_SIZE,
    marginRight: 10,
  },
  text: {
    fontSize: DIMENSIONS.BUTTON_TEXT_SIZE,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
});

