import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { COLORS } from '../../constants/colors';

const FOOTER_ICONS = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'instructions', icon: '📖', label: 'Instructions' },
  { id: 'boards', icon: '🎯', label: 'Boards' },
  { id: 'more', icon: '☰', label: 'More' },
];

export default function Footer({ onIconPress, activePage = 'home' }) {
  return (
    <View style={styles.container}>
      {FOOTER_ICONS.map((item) => {
        const isActive = item.id === activePage;
        const isMoreIcon = item.id === 'more';
        return (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.iconButton,
              isActive && styles.iconButtonActive,
            ]}
            onPress={() => onIconPress && onIconPress(item.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.icon, isMoreIcon && styles.moreIcon]}>
              {item.icon}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderTopWidth: 2,
    borderTopColor: COLORS.PRIMARY,
  },
  iconButton: {
    padding: 10,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  iconButtonActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  icon: {
    fontSize: 28,
  },
  moreIcon: {
    color: COLORS.TEXT_PRIMARY, // White color for more icon
  },
});
