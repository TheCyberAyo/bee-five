import React from 'react';
import { TouchableOpacity, View, StyleSheet, Text } from 'react-native';
import { DIMENSIONS } from '../../constants/dimensions';
import { COLORS } from '../../constants/colors';

export default function LevelIndicator({ level = 2, onPress }) {
  // Create 3 bars with increasing heights
  const barHeights = [8, 14, 20];
  const activeBarIndex = Math.min(level - 1, 2); // Clamp to 0-2 for 3 bars
  
  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.staircaseContainer}>
        {/* Three bars */}
        <View style={styles.staircase}>
          {barHeights.map((height, index) => {
            const isActive = index === activeBarIndex;
            return (
              <View
                key={index}
                style={[
                  styles.step,
                  { height },
                  index > 0 && { marginLeft: 2 },
                  isActive && styles.stepActive,
                ]}
              />
            );
          })}
        </View>
        {/* Arrow pointing up */}
        <Text style={styles.arrowUp}>↑</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  staircaseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staircase: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 30,
  },
  step: {
    width: DIMENSIONS.STEP_WIDTH,
    backgroundColor: COLORS.STEP_INACTIVE,
    borderWidth: 1,
    borderColor: COLORS.STEP_INACTIVE_BORDER,
  },
  stepActive: {
    backgroundColor: COLORS.STEP_ACTIVE,
    borderColor: COLORS.STEP_ACTIVE,
  },
  arrowUp: {
    fontSize: DIMENSIONS.ARROW_SIZE,
    color: COLORS.PRIMARY,
    fontWeight: '900',
    marginLeft: 6,
  },
});

