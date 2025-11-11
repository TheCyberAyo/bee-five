import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { DIMENSIONS } from '../../constants/dimensions';
import { COLORS } from '../../constants/colors';

export default function ProfileButton({ onPress }) {
  return (
    <TouchableOpacity 
      style={styles.button} 
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text style={styles.icon}>👤</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: DIMENSIONS.PROFILE_BUTTON_SIZE,
    height: DIMENSIONS.PROFILE_BUTTON_SIZE,
    borderRadius: DIMENSIONS.PROFILE_BUTTON_SIZE / 2,
    backgroundColor: 'rgba(255, 195, 11, 0.2)',
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: DIMENSIONS.PROFILE_ICON_SIZE,
  },
});

