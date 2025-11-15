import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { COLORS } from '../../constants/colors';
import { DIMENSIONS } from '../../constants/dimensions';

export default function InstructionsPanel() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Bee-Five Instructions</Text>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Section
          title="Goal"
          text="Be the first player to place five of your bees in a row. Lines can run left to right, up and down, or along any diagonal."
        />
        <Section
          title="Basic Play"
          text="Players take turns dropping one token at a time. Choose a column, and your bee slides to the lowest empty spot. Think ahead so you can build your five-in-a-row while blocking your opponent."
        />
        <Section
          title="Tips"
          text="- Watch for sneaky diagonals.\n- Set up two threats at once so your rival can't block everything.\n- If you get stuck, reset the board and try a new opening."
        />
        <Section
          title="Modes"
          text="Take Turns lets two friends share one device. Battle mode keeps score through several quick rounds. AI mode pairs you against Bee-Five's smart bot, and Multiplayer lets you invite friends online."
        />
        <Section
          title="Winning"
          text="Line up five bees before your opponent. If the board fills up with no winner, the game is a draw and you can start again."
        />
        <Section
          title="Need More?"
          text="Tap the home icon to return to the main menu and explore every game type. Have fun, and keep buzzing!"
        />
      </ScrollView>
    </View>
  );
}

function Section({ title, text }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  heading: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.PRIMARY,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.SECONDARY,
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.TEXT_PRIMARY,
  },
});

