import type { SwarmVillageBoardCell } from '@/types/swarm-village';

import { GRID_ROWS } from './constants';

export const boardIndex = (r: number, c: number, gridCols: number) => r * gridCols + c;

export const getCell = (
  board: SwarmVillageBoardCell[],
  r: number,
  c: number,
  gridCols: number,
): SwarmVillageBoardCell =>
  board[boardIndex(r, c, gridCols)] ?? {
    foundation: 'grass',
    wallHeight: 0,
    wallHp: 0,
    wallMaxHp: 0,
    wallType: null,
    wallRotation: 0,
    soilPlacedAt: null,
    soilStartSwarmCompletionCount: null,
    unit: null,
    unitHp: 0,
    unitMaxHp: 0,
    unitLevel: 0,
    unitLastAttackAt: 0,
    unitFacingScaleX: 1,
    unitRotation: 0,
    unitRewardBaselineCompletionCount: null,
  };

export const isWithinBoard = (row: number, col: number, gridCols: number) =>
  row >= 0 && row < GRID_ROWS && col >= 0 && col < gridCols;
