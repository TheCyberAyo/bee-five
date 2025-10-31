"use client";

import { useState, useEffect } from 'react';

// Theme definitions for each adventure stage
export interface Theme {
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  gridColor: string;
  player1Color: string;
  player2Color: string;
  textColor: string;
  accentColor: string;
  backgroundGradient: string;
  borderColor: string;
  shadowColor: string;
  buttonColor: string;
  buttonHoverColor: string;
  cardBackground: string;
  stageIcon: string;
  stageEmoji: string;
  backgroundPattern: string;
  visualEffect: string;
  beeLifeStage: string;
  ambientSound?: string;
}

// Adventure stage themes based on the 200-level ranges
export const ADVENTURE_THEMES: Theme[] = [
  // Stage 1: The Whispering Egg (Games 1-200) - Egg Stage
  {
    name: "The Whispering Egg",
    description: "The prophecy of a hero is laid within a golden cell.",
    primaryColor: "#FFD700",
    secondaryColor: "#FFA500", 
    backgroundColor: "#FFF8DC",
    gridColor: "#FFE4B5",
    player1Color: "#000000",
    player2Color: "#FFC30B",
    textColor: "#8B4513",
    accentColor: "#FF6347",
    backgroundGradient: "linear-gradient(135deg, #FFF8DC, #FFE4B5, #FFFACD)",
    borderColor: "#DAA520",
    shadowColor: "rgba(218, 165, 32, 0.3)",
    buttonColor: "#FFD700",
    buttonHoverColor: "#FFA500",
    cardBackground: "rgba(255, 248, 220, 0.9)",
    stageIcon: "🥚",
    stageEmoji: "🥚✨",
    backgroundPattern: "radial-gradient(circle at 20% 50%, rgba(255, 215, 0, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 165, 0, 0.1) 0%, transparent 50%)",
    visualEffect: "soft-glow",
    beeLifeStage: "Egg - The beginning of life, nestled safely in hexagonal cells"
  },
  // Stage 2: Larva of Legends (Games 201-400) - Larva Stage
  {
    name: "Larva of Legends",
    description: "A tiny creature begins its fabled journey of growth.",
    primaryColor: "#FFA500",
    secondaryColor: "#FF8C00",
    backgroundColor: "#FFFACD",
    gridColor: "#FFEBCD",
    player1Color: "#000000", 
    player2Color: "#FFC30B",
    textColor: "#CD853F",
    accentColor: "#FF6347",
    backgroundGradient: "linear-gradient(135deg, #FFFACD, #FFEBCD, #F0E68C)",
    borderColor: "#FF8C00",
    shadowColor: "rgba(255, 140, 0, 0.3)",
    buttonColor: "#FFA500",
    buttonHoverColor: "#FF8C00",
    cardBackground: "rgba(255, 250, 205, 0.9)",
    stageIcon: "🐛",
    stageEmoji: "🐛💫",
    backgroundPattern: "linear-gradient(45deg, rgba(255, 165, 0, 0.05) 25%, transparent 25%), linear-gradient(-45deg, rgba(255, 140, 0, 0.05) 25%, transparent 25%)",
    visualEffect: "crawling-pattern",
    beeLifeStage: "Larva - Growing and feeding, the future bee takes shape"
  },
  // Stage 3: Chamber of Royal Nectar (Games 401-600) - Feeding Stage
  {
    name: "Chamber of Royal Nectar",
    description: "A mystical hall where power and destiny are forged.",
    primaryColor: "#FF6347",
    secondaryColor: "#DC143C",
    backgroundColor: "#FFE4E1",
    gridColor: "#FFB6C1",
    player1Color: "#000000",
    player2Color: "#FFC30B",
    textColor: "#8B0000",
    accentColor: "#FF1493",
    backgroundGradient: "linear-gradient(135deg, #FFE4E1, #FFB6C1, #FFC0CB)",
    borderColor: "#DC143C",
    shadowColor: "rgba(220, 20, 60, 0.3)",
    buttonColor: "#FF6347",
    buttonHoverColor: "#DC143C",
    cardBackground: "rgba(255, 228, 225, 0.9)",
    stageIcon: "🍯",
    stageEmoji: "🍯👑",
    backgroundPattern: "repeating-linear-gradient(30deg, rgba(255, 99, 71, 0.03) 0px, rgba(255, 99, 71, 0.03) 20px, transparent 20px, transparent 40px)",
    visualEffect: "honey-drip",
    beeLifeStage: "Feeding - Nourished by royal jelly in hexagonal chambers"
  },
  // Stage 4: Silken Cocoon of Secrets (Games 601-800) - Cocoon Stage
  {
    name: "Silken Cocoon of Secrets",
    description: "Spinning a magical shell to transform.",
    primaryColor: "#9370DB",
    secondaryColor: "#8A2BE2",
    backgroundColor: "#E6E6FA",
    gridColor: "#DDA0DD",
    player1Color: "#000000",
    player2Color: "#FFC30B",
    textColor: "#4B0082",
    accentColor: "#DA70D6",
    backgroundGradient: "linear-gradient(135deg, #E6E6FA, #DDA0DD, #EE82EE)",
    borderColor: "#8A2BE2",
    shadowColor: "rgba(138, 43, 226, 0.3)",
    buttonColor: "#9370DB",
    buttonHoverColor: "#8A2BE2",
    cardBackground: "rgba(230, 230, 250, 0.9)",
    stageIcon: "🕸️",
    stageEmoji: "🕸️✨",
    backgroundPattern: "radial-gradient(circle at 30% 30%, rgba(147, 112, 219, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(138, 43, 226, 0.1) 0%, transparent 50%)",
    visualEffect: "spinning-web",
    beeLifeStage: "Cocoon - Wrapped in silk, undergoing miraculous transformation"
  },
  // Stage 5: Dreams of the Pupa Realm (Games 801-1000) - Pupa Stage
  {
    name: "Dreams of the Pupa Realm",
    description: "Visions of wings and future battles stir inside.",
    primaryColor: "#4169E1",
    secondaryColor: "#0000CD",
    backgroundColor: "#E0E0FF",
    gridColor: "#B0C4DE",
    player1Color: "#000000",
    player2Color: "#FFC30B",
    textColor: "#191970",
    accentColor: "#00BFFF",
    backgroundGradient: "linear-gradient(135deg, #E0E0FF, #B0C4DE, #ADD8E6)",
    borderColor: "#0000CD",
    shadowColor: "rgba(0, 0, 205, 0.3)",
    buttonColor: "#4169E1",
    buttonHoverColor: "#0000CD",
    cardBackground: "rgba(224, 224, 255, 0.9)",
    stageIcon: "🦋",
    stageEmoji: "🦋💭",
    backgroundPattern: "radial-gradient(ellipse at 50% 50%, rgba(65, 105, 225, 0.08) 0%, transparent 70%), radial-gradient(ellipse at 25% 25%, rgba(0, 191, 255, 0.06) 0%, transparent 70%)",
    visualEffect: "dreamy-swirl",
    beeLifeStage: "Pupa - Metamorphosing in dreams, preparing for flight"
  },
  // Stage 6: Wings of Dawn (Games 1001-1200) - Emergence Stage
  {
    name: "Wings of Dawn",
    description: "Breaking free and taking the first heroic flight.",
    primaryColor: "#00CED1",
    secondaryColor: "#20B2AA",
    backgroundColor: "#E0FFFF",
    gridColor: "#AFEEEE",
    player1Color: "#000000",
    player2Color: "#FFC30B",
    textColor: "#008B8B",
    accentColor: "#00FFFF",
    backgroundGradient: "linear-gradient(135deg, #E0FFFF, #AFEEEE, #F0FFFF)",
    borderColor: "#20B2AA",
    shadowColor: "rgba(32, 178, 170, 0.3)",
    buttonColor: "#00CED1",
    buttonHoverColor: "#20B2AA",
    cardBackground: "rgba(224, 255, 255, 0.9)",
    stageIcon: "🌅",
    stageEmoji: "🐝🌅",
    backgroundPattern: "linear-gradient(45deg, rgba(0, 206, 209, 0.05) 25%, transparent 25%), linear-gradient(-45deg, rgba(32, 178, 170, 0.05) 25%, transparent 25%)",
    visualEffect: "dawn-break",
    beeLifeStage: "Emergence - Breaking free from the cell, first glimpse of the world"
  },
  // Stage 7: Hive of Trials (Games 1201-1400) - Nurse Bee Stage
  {
    name: "Hive of Trials",
    description: "Training in ancient duties and learning hidden arts.",
    primaryColor: "#32CD32",
    secondaryColor: "#228B22",
    backgroundColor: "#F0FFF0",
    gridColor: "#90EE90",
    player1Color: "#000000",
    player2Color: "#FFC30B",
    textColor: "#006400",
    accentColor: "#00FF00",
    backgroundGradient: "linear-gradient(135deg, #F0FFF0, #90EE90, #98FB98)",
    borderColor: "#228B22",
    shadowColor: "rgba(34, 139, 34, 0.3)",
    buttonColor: "#32CD32",
    buttonHoverColor: "#228B22",
    cardBackground: "rgba(240, 255, 240, 0.9)",
    stageIcon: "🏠",
    stageEmoji: "🐝🏠",
    backgroundPattern: "repeating-radial-gradient(circle at 50% 50%, rgba(50, 205, 50, 0.03) 0px, rgba(50, 205, 50, 0.03) 30px, transparent 30px, transparent 60px)",
    visualEffect: "hexagonal-grid",
    beeLifeStage: "Nurse Bee - Caring for larvae and maintaining the hive"
  },
  // Stage 8: Trails of Golden Pollen (Games 1401-1600) - Forager Stage
  {
    name: "Trails of Golden Pollen",
    description: "Quests across wildflower kingdoms to gather treasure.",
    primaryColor: "#FFC30B",
    secondaryColor: "#FFD700",
    backgroundColor: "#FFFACD",
    gridColor: "#FFE4B5",
    player1Color: "#000000",
    player2Color: "#FFC30B",
    textColor: "#B8860B",
    accentColor: "#FFA500",
    backgroundGradient: "linear-gradient(135deg, #FFFACD, #FFE4B5, #F0E68C)",
    borderColor: "#DAA520",
    shadowColor: "rgba(218, 165, 32, 0.3)",
    buttonColor: "#FFC30B",
    buttonHoverColor: "#FFD700",
    cardBackground: "rgba(255, 250, 205, 0.9)",
    stageIcon: "🌻",
    stageEmoji: "🐝🌻",
    backgroundPattern: "radial-gradient(circle at 20% 80%, rgba(255, 195, 11, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 215, 0, 0.1) 0%, transparent 50%)",
    visualEffect: "pollen-trail",
    beeLifeStage: "Forager - Exploring fields, collecting nectar and pollen"
  },
  // Stage 9: Sentinel of the Hiveheart (Games 1601-1800) - Guard Bee Stage
  {
    name: "Sentinel of the Hiveheart",
    description: "Standing guard against dark invaders.",
    primaryColor: "#DC143C",
    secondaryColor: "#B22222",
    backgroundColor: "#FFE4E1",
    gridColor: "#FFB6C1",
    player1Color: "#000000",
    player2Color: "#FFC30B",
    textColor: "#8B0000",
    accentColor: "#FF6347",
    backgroundGradient: "linear-gradient(135deg, #FFE4E1, #FFB6C1, #FFA0A0)",
    borderColor: "#B22222",
    shadowColor: "rgba(178, 34, 34, 0.3)",
    buttonColor: "#DC143C",
    buttonHoverColor: "#B22222",
    cardBackground: "rgba(255, 228, 225, 0.9)",
    stageIcon: "🛡️",
    stageEmoji: "🐝🛡️",
    backgroundPattern: "repeating-conic-gradient(from 0deg at 50% 50%, rgba(220, 20, 60, 0.05) 0deg, transparent 60deg, rgba(178, 34, 34, 0.05) 120deg, transparent 180deg)",
    visualEffect: "protective-aura",
    beeLifeStage: "Guard Bee - Defending the hive entrance from threats"
  },
  // Stage 10: Crown of the Queen-Bee (Games 1801-2000) - Queen Bee Stage
  {
    name: "Crown of the Queen-Bee",
    description: "Ascend the throne, lead the swarm, or begin a new dynasty.",
    primaryColor: "#8B008B",
    secondaryColor: "#9932CC",
    backgroundColor: "#F0E6FF",
    gridColor: "#DDA0DD",
    player1Color: "#000000",
    player2Color: "#FFC30B",
    textColor: "#4B0082",
    accentColor: "#DA70D6",
    backgroundGradient: "linear-gradient(135deg, #F0E6FF, #DDA0DD, #E6E6FA)",
    borderColor: "#9932CC",
    shadowColor: "rgba(153, 50, 204, 0.3)",
    buttonColor: "#8B008B",
    buttonHoverColor: "#9932CC",
    cardBackground: "rgba(240, 230, 255, 0.9)",
    stageIcon: "👑",
    stageEmoji: "👑🐝",
    backgroundPattern: "radial-gradient(circle at 30% 30%, rgba(139, 0, 139, 0.08) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(153, 50, 204, 0.08) 0%, transparent 50%)",
    visualEffect: "royal-radiance",
    beeLifeStage: "Queen Bee - The ultimate ruler, laying eggs and leading the colony"
  }
];

export interface UseThemeOptions {
  gameNumber?: number;
  defaultTheme?: Theme;
}

export const useTheme = (options: UseThemeOptions = {}) => {
  const { gameNumber, defaultTheme } = options;
  
  // Get theme based on game number
  const getThemeForGame = (gameNum: number): Theme => {
    const stageIndex = Math.floor((gameNum - 1) / 200);
    return ADVENTURE_THEMES[stageIndex] || ADVENTURE_THEMES[0];
  };

  // Current theme state
  const [currentTheme, setCurrentTheme] = useState<Theme>(
    gameNumber ? getThemeForGame(gameNumber) : (defaultTheme || ADVENTURE_THEMES[0])
  );

  // Update theme when game number changes
  useEffect(() => {
    if (gameNumber !== undefined) {
      const newTheme = getThemeForGame(gameNumber);
      setCurrentTheme(newTheme);
    }
  }, [gameNumber]);

  // Helper functions
  const getStageIndex = (gameNum: number): number => {
    return Math.floor((gameNum - 1) / 200);
  };

  const getStageName = (gameNum: number): string => {
    const stageIndex = getStageIndex(gameNum);
    return ADVENTURE_THEMES[stageIndex]?.name || "Unknown Stage";
  };

  const applyThemeStyles = (element: HTMLElement, theme: Theme = currentTheme) => {
    element.style.setProperty('--theme-primary', theme.primaryColor);
    element.style.setProperty('--theme-secondary', theme.secondaryColor);
    element.style.setProperty('--theme-background', theme.backgroundColor);
    element.style.setProperty('--theme-grid', theme.gridColor);
    element.style.setProperty('--theme-player1', theme.player1Color);
    element.style.setProperty('--theme-player2', theme.player2Color);
    element.style.setProperty('--theme-text', theme.textColor);
    element.style.setProperty('--theme-accent', theme.accentColor);
    element.style.setProperty('--theme-border', theme.borderColor);
    element.style.setProperty('--theme-shadow', theme.shadowColor);
    element.style.setProperty('--theme-button', theme.buttonColor);
    element.style.setProperty('--theme-button-hover', theme.buttonHoverColor);
    element.style.setProperty('--theme-card', theme.cardBackground);
  };

  return {
    currentTheme,
    setCurrentTheme,
    getThemeForGame,
    getStageIndex,
    getStageName,
    applyThemeStyles,
    ADVENTURE_THEMES
  };
};
