import { getGameRules } from './adventureGameRules';
import { generateBlockedCells, gameEndsWith1InSpecifiedRanges, isMultipleOf10Match1From60, isMultipleOf10Match1From210, isMultipleOf10Match2From30, isMultipleOf50Match3, isMultipleOf50Match4 } from './gameLogic';

export interface AdventureRuleTip { id: string; title: string; body: string }

/** Match the move engine's round predicates, not just the level description. */
export function adventureRuleTips(level: number, round: number): AdventureRuleTip[] {
  const rules = getGameRules(level, round);
  const tips: AdventureRuleTip[] = [];
  const add = (id: string, title: string, body: string) => tips.push({ id, title, body });
  add(`timer_${rules.timeLimit}`, 'Watch the turn timer', `You have ${rules.timeLimit} seconds for each move. The clock resets after a move. Run out of time and you lose the round.`);
  if (rules.startingPlayer === 2) add('ai_starts', 'The AI goes first', 'Wait for its opening move, then place your piece on an empty square.');
  if (rules.isMatchGame) add(`series_${rules.matchType}`, rules.matchType === 'best-of-5' ? 'Best of five' : 'Best of three', `Aim for ${rules.matchType === 'best-of-5' ? 'three' : 'two'} round wins. Rules can change between rounds.`);
  if (!rules.hasBlindPlay && generateBlockedCells(level, round).length) add('blocked_cells', 'Blocked squares', 'Squares marked with a cross cannot hold a piece. Build your line around them.');
  if (rules.hasBlindPlay) add('blind_play', 'Blind play', 'The board becomes hidden when play starts. Remember your moves and tap the board to place a piece. Occupied squares cannot be played again.');
  if (rules.hasMudZones) add('mud_zones', 'Mud zones', 'Brown markers show mud squares. They cannot be played on while blind play is active.');
  if (rules.hasProgressiveBlocks) add('progressive_blocks', 'New obstacles appear', 'Extra blocked squares appear as you make moves. Keep an alternative route to five.');
  if (rules.hasDisappearingBlocks) add('disappearing_blocks', 'Blocks disappear', 'Every three moves you make, up to two blocked squares open up.');
  if (rules.hasShiftingBlocks) add('shifting_blocks', 'Moving obstacles', 'Blocked squares shift during play. Check the board before choosing your next move.');
  if (rules.hasDisappearingPieces) add('disappearing_pieces', 'Older pieces disappear', 'Every fourth move by a player removes up to two of their opponent’s oldest pieces. Long-term lines may change.');
  if (rules.hasPieceCapacity) add('piece_capacity', 'Room for 35 pieces', 'Once the board holds more than 35 pieces, the oldest pieces are removed to make room.');
  if (isMultipleOf50Match3(level, round)) add('rearrangement', 'The board rearranges', 'Every five moves in total, pieces are rearranged. Look again for a winning line after each change.');
  if (isMultipleOf50Match4(level, round) || isMultipleOf10Match2From30(level, round)) add('piece_swapping', 'Pieces swap places', 'Pairs of opposing pieces swap positions at intervals during this round. Recheck both players’ lines after a swap.');
  if (isMultipleOf10Match1From60(level, round) || (level % 10 === 1 && level >= 31 && !gameEndsWith1InSpecifiedRanges(level))) add('swap_all', 'Colours switch', 'At intervals, all player pieces switch sides. Watch for the colour change before your next move.');
  if (isMultipleOf10Match1From210(level, round)) add('temporary_blind', 'A brief blind turn', 'Later in this round, the board briefly hides after certain moves. Keep track of the positions until it reappears.');
  if ((level % 50 === 0 && round === 1) || gameEndsWith1InSpecifiedRanges(level)) add('strategic_blocks', 'Your route can be blocked', 'Every eight moves you make, a new obstacle can appear in a useful position. Leave yourself another route.');
  if (level >= 400 && level % 10 === 9) add('strategic_shift', 'An obstacle moves', 'After 27 moves in total, a blocked square can move into a strategic position.');
  return tips;
}
