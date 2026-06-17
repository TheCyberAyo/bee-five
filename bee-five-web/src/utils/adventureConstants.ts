export const TOTAL_GAMES = 2000;

export const ADVENTURE_STAGES = [
  { name: 'The Whispering Egg', games: 1, emoji: '🥚', color: '#FFE4B5', description: 'The prophecy of a hero is laid within a golden cell.' },
  { name: 'Larva of Legends', games: 201, emoji: '🐛', color: '#98FB98', description: 'A tiny creature begins its fabled journey of growth.' },
  { name: 'Chamber of Royal Nectar', games: 401, emoji: '🍯', color: '#FFD700', description: 'A mystical hall where power and destiny are forged.' },
  { name: 'Silken Cocoon of Secrets', games: 601, emoji: '🕸️', color: '#DDA0DD', description: 'Spinning a magical shell to transform.' },
  { name: 'Dreams of the Pupa Realm', games: 801, emoji: '🦋', color: '#87CEEB', description: 'Visions of wings and future battles stir inside.' },
  { name: 'Wings of Dawn', games: 1001, emoji: '🌅', color: '#FFA500', description: 'Breaking free and taking the first heroic flight.' },
  { name: 'Hive of Trials', games: 1201, emoji: '🏠', color: '#90EE90', description: 'Training in ancient duties and learning hidden arts.' },
  { name: 'Trails of Golden Pollen', games: 1401, emoji: '🌻', color: '#FFC30B', description: 'Quests across wildflower kingdoms to gather treasure.' },
  { name: 'Sentinel of the Hiveheart', games: 1601, emoji: '🛡️', color: '#B0C4DE', description: 'Standing guard against dark invaders.' },
  { name: 'Crown of the Queen-Bee', games: 1801, emoji: '👑', color: '#FF69B4', description: 'Ascend the throne, lead the swarm, or begin a new dynasty.' },
] as const;

const isMultipleOf10 = (gameNumber: number): boolean => gameNumber % 10 === 0;
const isMultipleOf50 = (gameNumber: number): boolean => gameNumber % 50 === 0;

export const requiresMatchSystem = (gameNumber: number): boolean => isMultipleOf10(gameNumber);

export const getMatchType = (gameNumber: number): 'best-of-3' | 'best-of-5' | 'single' => {
  if (isMultipleOf50(gameNumber)) {
    return 'best-of-5';
  }
  if (requiresMatchSystem(gameNumber)) {
    return 'best-of-3';
  }
  return 'single';
};

export const getRequiredWins = (gameNumber: number): number => {
  const matchType = getMatchType(gameNumber);
  switch (matchType) {
    case 'best-of-5':
      return 3;
    case 'best-of-3':
      return 2;
    default:
      return 1;
  }
};

export const getTotalGames = (gameNumber: number): number => {
  const matchType = getMatchType(gameNumber);
  switch (matchType) {
    case 'best-of-5':
      return 5;
    case 'best-of-3':
      return 3;
    default:
      return 1;
  }
};

export const getStageForGame = (gameNumber: number) => {
  for (let i = ADVENTURE_STAGES.length - 1; i >= 0; i--) {
    if (gameNumber >= ADVENTURE_STAGES[i].games) {
      return ADVENTURE_STAGES[i];
    }
  }
  return ADVENTURE_STAGES[0];
};
