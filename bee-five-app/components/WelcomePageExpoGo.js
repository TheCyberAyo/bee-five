import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { DIMENSIONS } from '../constants/dimensions';
import { useBeeAnimations } from '../hooks/useBeeAnimations';
import Header from './Header/Header';
import FlyingBees from './Bees/FlyingBees';
import Title from './Title/Title';
import GameModeButtons from './Buttons/GameModeButtons';
import Footer from './Footer/Footer';

export default function WelcomePageExpoGo({ onGameModeSelect }) {
  const beeAnimations = useBeeAnimations();
  const [activePage, setActivePage] = useState('home');

  const handleFooterIconPress = (iconId) => {
    setActivePage(iconId);
    // If home is clicked, ensure we're on the home page
    if (iconId === 'home') {
      // Home page is the default welcome page, so we're already here
      // You can add navigation logic here if needed
    }
  };

  return (
    <View style={styles.container}>
      {/* Flying Bees */}
      <FlyingBees beePositions={beeAnimations} />

      {/* Header */}
      <Header />

      {/* Content Overlay */}
      <View style={styles.overlay}>
        <Title />
        <GameModeButtons onGameModeSelect={onGameModeSelect} />
        <Footer onIconPress={handleFooterIconPress} activePage={activePage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingTop: DIMENSIONS.HEADER_HEIGHT + DIMENSIONS.HEADER_TOP_MARGIN + 20,
    paddingBottom: 60,
    paddingHorizontal: 20,
    zIndex: 10,
  },
});
