import type { CSSProperties } from 'react';

export const multiplayerTheme = {
  scaffoldBackground: '#FFC30B',
  lobbyHeaderBackground: '#43A047',
  lobbySelfRowBackground: '#FF9800',
  lobbyTabSelected: '#E53935',
  primaryYellow: '#FFC30B',
} as const;

export const yellowDialogStyle: CSSProperties = {
  background: multiplayerTheme.scaffoldBackground,
  border: '4px solid #000',
  borderRadius: '20px',
  padding: '1.25rem',
  maxWidth: '400px',
  width: '90vw',
};

export const primaryBlackButtonStyle: CSSProperties = {
  background: '#000',
  color: multiplayerTheme.primaryYellow,
  border: '2px solid #000',
  borderRadius: '10px',
  padding: '0.6rem 1rem',
  fontWeight: 'bold',
  cursor: 'pointer',
};

export const primaryYellowButtonStyle: CSSProperties = {
  background: multiplayerTheme.primaryYellow,
  color: '#000',
  border: '2px solid #000',
  borderRadius: '10px',
  padding: '0.6rem 1rem',
  fontWeight: 'bold',
  cursor: 'pointer',
};
