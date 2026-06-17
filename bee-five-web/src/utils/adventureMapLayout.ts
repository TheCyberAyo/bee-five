import { TOTAL_GAMES } from './adventureConstants';

export function getGamePosition(gameNumber: number, isMobile: boolean) {
  const gameIndex = gameNumber - 1;
  const spacing = isMobile ? 60 : 80;
  const totalHeight = TOTAL_GAMES * spacing;
  const y = totalHeight - gameIndex * spacing;

  const gamesPerSide = 4;
  const sideIndex = Math.floor(gameIndex / gamesPerSide);
  const positionInSide = gameIndex % gamesPerSide;

  let x: number;
  if (isMobile) {
    if (sideIndex % 2 === 0) {
      if (positionInSide === 0) x = 15;
      else if (positionInSide === 1) x = 25;
      else if (positionInSide === 2) x = 35;
      else x = 45;
    } else {
      if (positionInSide === 0) x = 55;
      else if (positionInSide === 1) x = 65;
      else if (positionInSide === 2) x = 55;
      else x = 45;
    }
  } else if (sideIndex % 2 === 0) {
    if (positionInSide < 2) x = 8 + positionInSide * 12;
    else x = 28 + (positionInSide - 2) * 12;
  } else if (positionInSide < 2) {
    x = 72 + positionInSide * 12;
  } else {
    x = 52 + (positionInSide - 2) * 12;
  }

  return {
    left: Math.max(5, Math.min(95, x)),
    top: y,
    spacing,
    totalHeight,
  };
}

export function getVisibleGameRange(
  scrollY: number,
  viewportHeight: number,
  isMobile: boolean
) {
  const spacing = isMobile ? 60 : 80;
  const totalHeight = TOTAL_GAMES * spacing;
  const buffer = viewportHeight * 1.5;
  const startY = Math.max(0, scrollY - buffer);
  const endY = scrollY + viewportHeight + buffer;
  const startGame = Math.max(1, Math.floor((totalHeight - endY) / spacing) + 1);
  const endGame = Math.min(TOTAL_GAMES, Math.floor((totalHeight - startY) / spacing) + 1);
  return {
    startGame: Math.max(1, startGame - 10),
    endGame: Math.min(TOTAL_GAMES, endGame + 10),
    spacing,
    totalHeight,
  };
}
