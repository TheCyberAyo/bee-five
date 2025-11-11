import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { DIMENSIONS } from '../../constants/dimensions';
import { COLORS } from '../../constants/colors';
import ProfileButton from './ProfileButton';
import LevelIndicator from './LevelIndicator';

export default function Header() {
  return (
    <View style={styles.header}>
      {/* Left Section: Profile & Growth */}
      <View style={styles.headerLeft}>
        <ProfileButton />
        <LevelIndicator level={5} />
      </View>

      {/* Center: Bee-Five Logo */}
      <View style={styles.headerCenter}>
        <Image 
          source={require('../../assets/BEE-FIVE.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Right Section: Spacer */}
      <View style={styles.headerRight} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: DIMENSIONS.HEADER_TOP_MARGIN,
    left: 0,
    right: 0,
    height: DIMENSIONS.HEADER_HEIGHT,
    backgroundColor: COLORS.HEADER_BG,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.HEADER_BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DIMENSIONS.HEADER_PADDING_HORIZONTAL,
    paddingTop: DIMENSIONS.HEADER_PADDING_TOP,
    zIndex: 20,
    elevation: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    zIndex: 1,
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
    pointerEvents: 'none',
  },
  logo: {
    height: DIMENSIONS.LOGO_HEIGHT,
    width: DIMENSIONS.LOGO_WIDTH,
    maxWidth: DIMENSIONS.LOGO_MAX_WIDTH,
  },
  headerRight: {
    flex: 1,
    minWidth: 0,
    zIndex: 1,
  },
});

