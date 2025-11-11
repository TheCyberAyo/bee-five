import React from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { DIMENSIONS } from '../../constants/dimensions';
import { COLORS } from '../../constants/colors';

export default function FlyingBees({ beePositions }) {
  const {
    bee3Pos,
    bee4Pos,
    bee5Pos,
    bee3Scale,
    bee4Scale,
    bee5Scale,
  } = beePositions;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Small Bees Only */}
      <Animated.View
        style={[
          styles.beeSmall,
          {
            left: bee3Pos.x,
            top: bee3Pos.y,
            transform: [{ scale: bee3Scale }],
          },
        ]}
      >
        <Text style={styles.beeEmojiSmall}>🐝</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.beeSmall,
          {
            left: bee4Pos.x,
            top: bee4Pos.y,
            transform: [{ scale: bee4Scale }],
          },
        ]}
      >
        <Text style={styles.beeEmojiSmall}>🐝</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.beeSmall,
          {
            left: bee5Pos.x,
            top: bee5Pos.y,
            transform: [{ scale: bee5Scale }],
          },
        ]}
      >
        <Text style={styles.beeEmojiSmall}>🐝</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  beeSmall: {
    position: 'absolute',
    width: DIMENSIONS.BEE_SMALL_SIZE,
    height: DIMENSIONS.BEE_SMALL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  beeEmojiSmall: {
    fontSize: DIMENSIONS.BEE_SMALL_EMOJI,
    textShadowColor: COLORS.BEE_SHADOW,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});

