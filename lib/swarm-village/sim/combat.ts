import type { SwarmVillageBoardCell } from '@/types/swarm-village';

import {
  CASTLE_COL_MAX,
  CASTLE_COL_MIN,
  CASTLE_ROW_MAX,
  CASTLE_TARGET_COL,
  DEFAULT_WAVE_SIZE,
  ENEMY_SPAWN_SCAN_DEPTH_ROWS,
  ENEMY_SPAWN_SPACING_BUFFER,
  GRID_ROWS,
  IJOM_CONCURRENT_ENTITY_CAP,
  IJOM_SUPER_FORCE_ENTITY_COUNT,
  IJOM_SUPER_PACK_SIZE,
  IJOM_SUPER_SPAWN_BASE_CHANCE,
  IJOM_SUPER_SPAWN_MAX_CHANCE,
  IJOM_SUPER_WAVE_SIZE_THRESHOLD,
  NORMAL_IJOM_MAX_HP,
  NORMAL_IJOM_PERSONAL_SPACE_RADIUS,
  SNOW_IJOM_DAMAGE_MULTIPLIER,
  SNOW_IJOM_MAX_HP,
  SNOW_IJOM_PERSONAL_SPACE_RADIUS,
  STREAK_IJOM_RAMP,
  WALL_IJOM_DIVISOR,
} from './constants';
import type { Enemy } from './types';
import { clamp } from './utils';

const getEnemyPackScale = (packSize?: number) =>
  Math.sqrt(
    Math.max(
      1,
      typeof packSize === 'number' && Number.isFinite(packSize) ? packSize : 1,
    ),
  );

export const getIjomPackSize = (enemy: Pick<Enemy, 'packSize'>) => {
  const packSize = enemy.packSize;
  return typeof packSize === 'number' && Number.isFinite(packSize)
    ? Math.max(1, Math.floor(packSize))
    : 1;
};

export const getIjomMaxHpForVariant = (
  variant: Enemy['variant'],
  packSize = 1,
) => (variant === 'snow' ? SNOW_IJOM_MAX_HP : NORMAL_IJOM_MAX_HP) * packSize;

export const getIjomDamageForVariant = (
  variant: Enemy['variant'],
  baseDamage: number,
  packSize = 1,
) =>
  (variant === 'snow' ? baseDamage * SNOW_IJOM_DAMAGE_MULTIPLIER : baseDamage) *
  packSize;

export const getNextSpawnPackSize = (
  waveTotal: number,
  activeEnemyCount: number,
  remainingIjoms: number,
  superSpawnBaseChance: number,
) => {
  if (waveTotal <= IJOM_SUPER_WAVE_SIZE_THRESHOLD) return 1;
  if (remainingIjoms < IJOM_SUPER_PACK_SIZE) return 1;
  if (activeEnemyCount >= IJOM_SUPER_FORCE_ENTITY_COUNT) {
    return IJOM_SUPER_PACK_SIZE;
  }
  const crowdPressure = Math.max(
    0,
    Math.min(1, activeEnemyCount / IJOM_CONCURRENT_ENTITY_CAP),
  );
  const superChance =
    superSpawnBaseChance +
    (IJOM_SUPER_SPAWN_MAX_CHANCE - superSpawnBaseChance) *
      crowdPressure;
  return Math.random() < superChance ? IJOM_SUPER_PACK_SIZE : 1;
};

export const getEnemyPersonalSpaceRadius = (
  variant: Enemy['variant'],
  packSize?: number,
) =>
  (variant === 'snow'
    ? SNOW_IJOM_PERSONAL_SPACE_RADIUS
    : NORMAL_IJOM_PERSONAL_SPACE_RADIUS) * getEnemyPackScale(packSize);

export const getEnemyMinRowForCol = (col: number) =>
  col >= CASTLE_COL_MIN - 0.55 && col <= CASTLE_COL_MAX + 0.55 ? -0.2 : 0;

export const enemyReachedCastle = (e: Enemy) =>
  e.row <= CASTLE_ROW_MAX + 0.35 &&
  e.col >= CASTLE_COL_MIN - 0.55 &&
  e.col <= CASTLE_COL_MAX + 0.55;

export const getEnemySpawnPosition = (
  enemies: Enemy[],
  currentGridCols: number,
  variant: Enemy['variant'],
  packSize?: number,
): { row: number; col: number } | null => {
  if (currentGridCols <= 0) return null;

  const spawnRow = GRID_ROWS - 1;
  const selfRadius = getEnemyPersonalSpaceRadius(variant, packSize);
  const candidateScores: Array<{ col: number; score: number }> = [];

  for (let col = 0; col < currentGridCols; col += 1) {
    let blocked = false;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const enemy of enemies) {
      if (enemy.row < GRID_ROWS - ENEMY_SPAWN_SCAN_DEPTH_ROWS) continue;
      const minDistance =
        selfRadius +
        getEnemyPersonalSpaceRadius(enemy.variant, enemy.packSize) +
        ENEMY_SPAWN_SPACING_BUFFER;
      const distance = Math.hypot(spawnRow - enemy.row, col - enemy.col);
      nearestDistance = Math.min(nearestDistance, distance);
      if (distance < minDistance) {
        blocked = true;
        break;
      }
    }

    if (!blocked) {
      candidateScores.push({
        col,
        score:
          (Number.isFinite(nearestDistance) ? nearestDistance : 10) +
          Math.random() * 0.001,
      });
    }
  }

  if (candidateScores.length === 0) return null;
  candidateScores.sort((a, b) => b.score - a.score);
  return { row: spawnRow, col: candidateScores[0]!.col };
};

export const resolveEnemySpacing = (
  enemy: Enemy,
  nextRow: number,
  nextCol: number,
  others: Enemy[],
  currentGridCols: number,
) => {
  let resolvedRow = nextRow;
  let resolvedCol = nextCol;
  const selfRadius = getEnemyPersonalSpaceRadius(enemy.variant, enemy.packSize);

  for (const other of others) {
    if (other.id === enemy.id) continue;

    const minDistance = selfRadius + getEnemyPersonalSpaceRadius(other.variant, other.packSize);
    let dr = resolvedRow - other.row;
    let dc = resolvedCol - other.col;
    let distance = Math.hypot(dr, dc);

    if (distance >= minDistance) continue;

    if (distance < 1e-4) {
      dr = 0.0001;
      dc = enemy.id < other.id ? -1 : 1;
      distance = Math.hypot(dr, dc);
    }

    const pushDistance = minDistance - distance;
    resolvedRow += (dr / distance) * pushDistance;
    resolvedCol += (dc / distance) * pushDistance;
  }

  return {
    row: clamp(resolvedRow, getEnemyMinRowForCol(resolvedCol), GRID_ROWS - 0.05),
    col: clamp(resolvedCol, 0, Math.max(0, currentGridCols - 1)),
  };
};

export const getIncomingWaveSize = (
  board: SwarmVillageBoardCell[],
  currentStreakCount: number,
) => {
  const streakBonus =
    Math.max(0, Math.floor(currentStreakCount)) * STREAK_IJOM_RAMP;
  const wallBonus = Math.floor(
    board.reduce((total, cell) => total + cell.wallHeight, 0) / WALL_IJOM_DIVISOR,
  );
  return DEFAULT_WAVE_SIZE + streakBonus + wallBonus;
};
