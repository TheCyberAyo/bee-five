import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { DIMENSIONS } from '../../constants/dimensions';
import { COLORS } from '../../constants/colors';

export default function Title() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bee-Five</Text>
      <Text style={styles.subtitle}>
        Your favourite version of{' '}
        <Text style={styles.connectFive}>CONNECT-5</Text>!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 20,
    zIndex: 15,
  },
  title: {
    fontSize: DIMENSIONS.TITLE_SIZE,
    fontWeight: '900',
    color: COLORS.PRIMARY,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 10,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: DIMENSIONS.SUBTITLE_SIZE,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  connectFive: {
    fontWeight: '900',
    color: COLORS.SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: DIMENSIONS.CONNECT_FIVE_SIZE,
  },
});

