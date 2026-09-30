'use client';

import { useEffect, useRef } from 'react';
import { useGameLogic } from '../../hooks/useGameLogic';
import { getBestAIMove } from '../../utils/aiOpponent';
import { trackOnboarding, TUTORIAL_ID } from '../../utils/onboarding';
import styles from './onboarding.module.css';

export default function GuidedPractice({ onComplete, onLeave }: { onComplete: () => void; onLeave: () => void }) {
  const { gameState, handleCellClick } = useGameLogic({ timeLimit: 0, pauseTimer: true, startingPlayer: 1 });
  const completed = useRef(false);
  const firstMove = useRef(false);
  const title = useRef<HTMLHeadingElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  const ended = !gameState.isGameActive;

  useEffect(() => { title.current?.focus(); }, []);

  useEffect(() => {
    if (!ended || completed.current) return;
    completed.current = true;
    onComplete();
    continueButton.current?.focus();
  }, [ended, onComplete]);

  useEffect(() => {
    if (gameState.currentPlayer !== 2 || ended) return;
    const timeout = window.setTimeout(() => {
      const available = gameState.board.flatMap((row, r) => row.flatMap((cell, c) => cell === 0 ? [{ row: r, col: c }] : []));
      if (available.length) {
        const move = getBestAIMove(available, gameState.board, 'easy');
        handleCellClick(move.row, move.col);
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [gameState.board, gameState.currentPlayer, ended, handleCellClick]);

  const status = ended
    ? gameState.winner === 1 ? 'You win!' : gameState.winner === 2 ? 'The AI wins. You’ve finished your first match!' : 'A draw. You’ve finished your first match!'
    : gameState.player1MoveCount === 0 ? 'Tap any empty square to place your first piece.'
    : gameState.currentPlayer === 1 ? 'Your turn — connect five black pieces.' : 'The AI is thinking…';

  return <main className={styles.screen} aria-labelledby="practice-title">
    <header className={styles.header}><span>Bee Five · Practice</span><button className={styles.secondary} onClick={onLeave}>Skip</button></header>
    <section className={styles.practice}>
      <h1 id="practice-title" ref={title} tabIndex={-1} className={styles.title}>Your first match</h1>
      <p>You play black. The AI plays yellow. No timer.</p>
      <p className={styles.status} role="status" aria-live="polite">{status}</p>
      <div className={styles.board} role="group" aria-label="Practice board, ten rows and ten columns">
        {gameState.board.flatMap((row, r) => row.map((cell, c) => <button
          key={`${r}-${c}`} type="button"
          className={`${styles.cell} ${gameState.winningPieces.some(piece => piece.row === r && piece.col === c) ? styles.winning : ''}`}
          aria-label={`Row ${r + 1}, column ${c + 1}: ${cell === 1 ? 'black piece' : cell === 2 ? 'yellow piece' : 'empty'}`}
          disabled={cell !== 0 || gameState.currentPlayer !== 1 || ended}
          onClick={() => {
            if (!firstMove.current) {
              firstMove.current = true;
              trackOnboarding('tutorial_step', { tutorial_id: TUTORIAL_ID, step: 'first_move' });
            }
            handleCellClick(r, c);
          }}>
          {cell !== 0 && <span aria-hidden="true" className={styles.piece} style={{ background: cell === 1 ? '#171717' : '#ffc30b' }} />}
        </button>))}
      </div>
      {ended && <button ref={continueButton} className={styles.primary} onClick={onLeave}>Continue to Bee Five</button>}
    </section>
  </main>;
}
