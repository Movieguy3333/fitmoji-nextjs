import {
  CASTLE_TARGET_COL,
  CRAZY_CAPY_CHARGE_ACTIVE_CALORIES,
  CRAZY_CAPY_SPEED_PER_TICK,
  CRAZY_CAPY_WALL_AVOID_RADIUS,
  GRID_ROWS,
} from '@/components/play/swarmVillage/model/constants';
import type {
  BoardCell,
  CrazyCapyKnockoutEffect,
  CrazyCapyState,
  Enemy,
} from '@/components/play/swarmVillage/model/types';

import { getCell } from './board';
import { clamp } from './utils';

export const isCrazyCapyWallBlocked = (board: BoardCell[], row: number, col: number, gridCols: number) => {
  const minRow = Math.max(0, Math.floor(row - CRAZY_CAPY_WALL_AVOID_RADIUS));
  const maxRow = Math.min(GRID_ROWS - 1, Math.ceil(row + CRAZY_CAPY_WALL_AVOID_RADIUS));
  const minCol = Math.max(0, Math.floor(col - CRAZY_CAPY_WALL_AVOID_RADIUS));
  const maxCol = Math.min(gridCols - 1, Math.ceil(col + CRAZY_CAPY_WALL_AVOID_RADIUS));

  for (let cellRow = minRow; cellRow <= maxRow; cellRow++) {
    for (let cellCol = minCol; cellCol <= maxCol; cellCol++) {
      if (Math.hypot(cellRow - row, cellCol - col) > CRAZY_CAPY_WALL_AVOID_RADIUS) continue;
      if (getCell(board, cellRow, cellCol, gridCols).wallHeight > 0) return true;
    }
  }

  return false;
};

export const getRandomCrazyCapyTarget = (gridCols: number, board: BoardCell[]) => {
  for (let attempt = 0; attempt < 18; attempt++) {
    const target = {
      row: clamp(3 + Math.random() * (GRID_ROWS - 4), 0, GRID_ROWS - 0.1),
      col: clamp(Math.random() * gridCols, -0.35, gridCols - 0.65),
    };
    if (!isCrazyCapyWallBlocked(board, target.row, target.col, gridCols)) return target;
  }
  return { row: GRID_ROWS - 1.3, col: clamp(CASTLE_TARGET_COL, -0.35, gridCols - 0.65) };
};

export const getCrazyCapyTargetNearCell = (row: number, col: number, gridCols: number, board: BoardCell[]) => {
  const desiredTarget = {
    row: clamp(row + 0.2, 0, GRID_ROWS - 0.1),
    col: clamp(col + 0.2, -0.35, gridCols - 0.65),
  };
  if (!isCrazyCapyWallBlocked(board, desiredTarget.row, desiredTarget.col, gridCols)) return desiredTarget;

  let bestTarget: { row: number; col: number; dist: number } | null = null;
  for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
    for (let colOffset = -2; colOffset <= 2; colOffset += 1) {
      const nextRow = clamp(row + rowOffset + 0.2, 0, GRID_ROWS - 0.1);
      const nextCol = clamp(col + colOffset + 0.2, -0.35, gridCols - 0.65);
      if (isCrazyCapyWallBlocked(board, nextRow, nextCol, gridCols)) continue;
      const dist = Math.hypot(rowOffset, colOffset);
      if (!bestTarget || dist < bestTarget.dist) {
        bestTarget = { row: nextRow, col: nextCol, dist };
      }
    }
  }

  return bestTarget ? { row: bestTarget.row, col: bestTarget.col } : desiredTarget;
};

export const stepCrazyCapy = (
  capy: CrazyCapyState,
  currentGridCols: number,
  now: number,
  board: BoardCell[],
  speedScale = 1,
): CrazyCapyState | null => {
  if (now >= capy.activeUntil) return null;

  let targetRow = capy.targetRow;
  let targetCol = capy.targetCol;
  let dr = targetRow - capy.row;
  let dc = targetCol - capy.col;
  let distance = Math.hypot(dr, dc);

  if (distance < 0.28) {
    const nextTarget = getRandomCrazyCapyTarget(currentGridCols, board);
    targetRow = nextTarget.row;
    targetCol = nextTarget.col;
    dr = targetRow - capy.row;
    dc = targetCol - capy.col;
    distance = Math.hypot(dr, dc);
  }

  const step = Math.min(CRAZY_CAPY_SPEED_PER_TICK * speedScale, Math.max(0, distance));
  const nextRow = distance > 1e-4 ? capy.row + (dr / distance) * step : capy.row;
  const nextCol = distance > 1e-4 ? capy.col + (dc / distance) * step : capy.col;

  if (isCrazyCapyWallBlocked(board, nextRow, nextCol, currentGridCols)) {
    const nextTarget = getRandomCrazyCapyTarget(currentGridCols, board);
    return {
      ...capy,
      targetRow: nextTarget.row,
      targetCol: nextTarget.col,
      facingScaleX: nextTarget.col < capy.col ? -1 : 1,
    };
  }

  return {
    ...capy,
    row: clamp(nextRow, 0, GRID_ROWS - 0.1),
    col: clamp(nextCol, -0.35, currentGridCols - 0.65),
    targetRow,
    targetCol,
    facingScaleX: dc < 0 ? -1 : 1,
  };
};

export const getCurrentActiveCalories = (activeCalories: number | null | undefined) =>
  Math.max(0, Math.floor(activeCalories ?? 0));

export const getCrazyCapyChargeRatio = (activeCalories: number, chargeStartCalories: number | null) => {
  if (chargeStartCalories == null) return 1;
  return clamp((activeCalories - chargeStartCalories) / CRAZY_CAPY_CHARGE_ACTIVE_CALORIES, 0, 1);
};

export const getCrazyCapyChargeRemainingCalories = (activeCalories: number, chargeStartCalories: number | null) => {
  if (chargeStartCalories == null) return 0;
  return Math.max(0, CRAZY_CAPY_CHARGE_ACTIVE_CALORIES - Math.max(0, activeCalories - chargeStartCalories));
};

export const createCrazyCapyKnockoutEffect = (
  enemy: Enemy,
  capy: CrazyCapyState | null,
  now: number,
): CrazyCapyKnockoutEffect => {
  const directionX: 1 | -1 =
    capy == null
      ? (Math.random() < 0.5 ? -1 : 1)
      : enemy.col >= capy.col
        ? 1
        : -1;
  return {
    id: `capy-ko-${enemy.id}-${now}`,
    variant: enemy.variant,
    row: enemy.row,
    col: enemy.col,
    startedAt: now,
    directionX,
    rotationDirection: Math.random() < 0.5 ? -1 : 1,
  };
};

