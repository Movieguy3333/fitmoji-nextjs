import {
  CASTLE_COL_MAX,
  CASTLE_COL_MIN,
  CASTLE_ROW_MAX,
  CASTLE_ROW_MIN,
  CASTLE_TARGET_COL,
  DEFAULT_WAVE_SIZE,
  ENEMY_SPAWN_SCAN_DEPTH_ROWS,
  ENEMY_SPAWN_SPACING_BUFFER,
  GRID_ROWS,
  NORMAL_IJOM_PERSONAL_SPACE_RADIUS,
  QUARTERBACK_RANGE,
  SNOW_IJOM_PERSONAL_SPACE_RADIUS,
  STREAK_IJOM_RAMP,
  TENNIS_RANGE,
  WALL_IJOM_DIVISOR,
} from '@/components/play/swarmVillage/model/constants';
import type {
  BattleStatus,
  BoardCell,
  Enemy,
  SwarmDefenseForecast,
} from '@/components/play/swarmVillage/model/types';

import { getDayDifferenceFromKeys, getEasternDayKey } from './schedule';
import {
  getCombatUnitDamage,
  getTreeLevel,
  getUnitMaxHp,
  getWallMaxHp,
  isUpgradeableTreeUnit,
} from './units';
import { clamp } from './utils';

export const getEnemyPersonalSpaceRadius = (variant: Enemy['variant']) =>
  variant === 'snow'
    ? SNOW_IJOM_PERSONAL_SPACE_RADIUS
    : NORMAL_IJOM_PERSONAL_SPACE_RADIUS;

export const getEnemyMinRowForCol = (col: number) =>
  col >= CASTLE_COL_MIN - 0.55 && col <= CASTLE_COL_MAX + 0.55
    ? -0.2
    : 0;

export const getEnemySpawnPosition = (
  enemies: Enemy[],
  currentGridCols: number,
  variant: Enemy['variant'],
): { row: number; col: number } | null => {
  if (currentGridCols <= 0) return null;

  const spawnRow = GRID_ROWS - 1;
  const selfRadius = getEnemyPersonalSpaceRadius(variant);
  const candidateScores: Array<{ col: number; score: number }> = [];

  for (let col = 0; col < currentGridCols; col += 1) {
    let blocked = false;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const enemy of enemies) {
      if (enemy.row < GRID_ROWS - ENEMY_SPAWN_SCAN_DEPTH_ROWS) continue;
      const minDistance =
        selfRadius +
        getEnemyPersonalSpaceRadius(enemy.variant) +
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
        score: (Number.isFinite(nearestDistance) ? nearestDistance : 10) + Math.random() * 0.001,
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
  const selfRadius = getEnemyPersonalSpaceRadius(enemy.variant);

  for (const other of others) {
    if (other.id === enemy.id) continue;

    const minDistance = selfRadius + getEnemyPersonalSpaceRadius(other.variant);
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

export const getCurrentSwarmStreak = (streakCount: number, lastCompletedDayKey: string | null, currentDayKey = getEasternDayKey()) => {
  if (!lastCompletedDayKey) return 0;
  const dayGap = getDayDifferenceFromKeys(currentDayKey, lastCompletedDayKey);
  if (dayGap < 0 || dayGap > 1) return 0;
  return Math.max(0, Math.floor(streakCount));
};

export const getIncomingWaveSize = (board: BoardCell[], currentStreakCount: number) => {
  const streakBonus = Math.max(0, Math.floor(currentStreakCount)) * STREAK_IJOM_RAMP;
  const wallBonus = Math.floor(board.reduce((total, cell) => total + cell.wallHeight, 0) / WALL_IJOM_DIVISOR);
  return DEFAULT_WAVE_SIZE + streakBonus + wallBonus;
};

export const getWaveLabel = (st: BattleStatus, d: number, t: number) => {
  if (st === 'wave') return `Swarm active ${d}/${t}`;
  if (st === 'cleared') return `Swarm repelled ${d}/${t}`;
  if (st === 'lost') return 'Home base breached';
  return 'Build your defenses';
};

export const getDefenseForecast = (board: BoardCell[], gridCols: number, nextWaveSize: number): SwarmDefenseForecast => {
  let wallLayers = 0;
  let wallEffectiveHp = 0;
  let homeGuardWallLayers = 0;
  let homeGuardWallHp = 0;
  let defenderCount = 0;
  let boxerCount = 0;
  let tennisCount = 0;
  let quarterbackCount = 0;
  let nearbyDefenderCount = 0;
  let defenderPower = 0;
  let damagedDefenses = 0;

  board.forEach((cell, index) => {
    const row = Math.floor(index / gridCols);
    const col = index % gridCols;
    const inHomeGuardLane =
      row >= CASTLE_ROW_MAX + 1 &&
      row <= CASTLE_ROW_MAX + 6 &&
      col >= CASTLE_COL_MIN - 2 &&
      col <= CASTLE_COL_MAX + 2;

    if (cell.wallHeight > 0) {
      const wallMaxHp = getWallMaxHp(cell.wallType);
      const currentLayerHp = wallMaxHp > 0 ? Math.min(Math.max(0, cell.wallHp), wallMaxHp) : 0;
      const effectiveHp = currentLayerHp + Math.max(0, cell.wallHeight - 1) * wallMaxHp;
      wallLayers += cell.wallHeight;
      wallEffectiveHp += effectiveHp;
      if (inHomeGuardLane) {
        homeGuardWallLayers += cell.wallHeight;
        homeGuardWallHp += effectiveHp;
      }
      if (wallMaxHp > 0 && currentLayerHp < wallMaxHp) damagedDefenses += 1;
    }

    if (!isUpgradeableTreeUnit(cell.unit)) return;

    const level = getTreeLevel(cell);
    const maxHp = cell.unitMaxHp > 0 ? cell.unitMaxHp : getUnitMaxHp(cell.unit, level);
    const hpRatio = maxHp > 0 ? clamp(cell.unitHp / maxHp, 0.25, 1) : 1;
    const laneDistance = Math.abs(col - CASTLE_TARGET_COL);
    const laneMultiplier = clamp(1 - laneDistance * 0.08, 0.58, 1);
    const rangeMultiplier = cell.unit === 'tennis' ? 5.5 : cell.unit === 'quarterback' ? 3.8 : 1.6;

    defenderCount += 1;
    if (cell.unit === 'boxer') boxerCount += 1;
    if (cell.unit === 'tennis') tennisCount += 1;
    if (cell.unit === 'quarterback') quarterbackCount += 1;
    if (
      inHomeGuardLane ||
      (cell.unit === 'tennis' && row <= CASTLE_ROW_MAX + TENNIS_RANGE + 3) ||
      (cell.unit === 'quarterback' && row <= CASTLE_ROW_MAX + QUARTERBACK_RANGE)
    ) {
      nearbyDefenderCount += 1;
    }
    if (cell.unitHp < maxHp) damagedDefenses += 1;

    defenderPower += getCombatUnitDamage(cell.unit, level) * rangeMultiplier * hpRatio * laneMultiplier;
  });

  const recommendedWallLayers = Math.max(5, Math.ceil(nextWaveSize / 5));
  const recommendedDefenders = Math.max(2, Math.ceil(nextWaveSize / 18));
  const wallScore = clamp(wallEffectiveHp / Math.max(1, nextWaveSize * 2.15), 0, 1) * 30;
  const guardWallScore = clamp(homeGuardWallHp / Math.max(1, nextWaveSize * 0.9), 0, 1) * 20;
  const defenderScore = clamp(defenderPower / Math.max(24, nextWaveSize * 0.88), 0, 1) * 36;
  const compositionBonus = wallLayers > 0 && defenderCount > 0 ? 8 : 0;
  const coverageBonus = nearbyDefenderCount >= Math.min(2, defenderCount) && defenderCount > 0 ? 6 : 0;
  const injuryPenalty = Math.min(12, damagedDefenses * 3);
  let survivalChance = Math.round(
    6 + wallScore + guardWallScore + defenderScore + compositionBonus + coverageBonus - injuryPenalty,
  );

  if (defenderCount === 0) {
    survivalChance = Math.min(survivalChance, wallLayers > 0 ? 22 : 8);
  } else if (wallLayers === 0) {
    survivalChance = Math.min(survivalChance, defenderCount >= recommendedDefenders ? 48 : 36);
  }
  survivalChance = clamp(survivalChance, 3, 96);

  const level: SwarmDefenseForecast['level'] =
    survivalChance < 35 ? 'danger' : survivalChance < 65 ? 'warning' : survivalChance < 85 ? 'stable' : 'strong';
  const readinessLabel =
    level === 'danger'
      ? 'High risk'
      : level === 'warning'
        ? 'Needs reinforcement'
        : level === 'stable'
          ? 'Likely to hold'
          : 'Well fortified';
  const suggestions: string[] = [];

  if (defenderCount === 0) {
    suggestions.push('Add Boxer, Tennis, or Quarterback trees so Ijoms can be defeated');
  } else if (defenderCount < recommendedDefenders) {
    suggestions.push(`Add ${recommendedDefenders - defenderCount} more combat tree${recommendedDefenders - defenderCount === 1 ? '' : 's'}`);
  }
  if (wallLayers === 0) {
    suggestions.push('Add walls or fences to slow the front line');
  } else if (wallLayers < recommendedWallLayers) {
    suggestions.push(`Add ${recommendedWallLayers - wallLayers} wall or fence layer${recommendedWallLayers - wallLayers === 1 ? '' : 's'} near home`);
  }
  if (wallLayers > 0 && homeGuardWallLayers < Math.min(6, recommendedWallLayers)) {
    suggestions.push('Put some walls in the lanes below the home');
  }
  if (defenderCount > 0 && tennisCount === 0 && quarterbackCount === 0 && nextWaveSize >= 30) {
    suggestions.push('Add a Tennis or Quarterback tree for long-range coverage');
  }
  if (defenderCount > 0 && boxerCount === 0 && wallLayers > 0) {
    suggestions.push('Add a Boxer tree behind your walls');
  }
  if (damagedDefenses > 0) {
    suggestions.push('Heal damaged walls or trees before activating');
  }
  if (suggestions.length === 0) {
    suggestions.push(level === 'strong' ? 'Village looks ready for this wave' : 'Upgrade a tree or add another wall layer to improve odds');
  }

  const summary =
    defenderCount === 0
      ? 'No trees can attack yet.'
      : wallLayers === 0
        ? 'Trees need walls to buy time.'
        : level === 'danger'
          ? 'This layout is likely to break.'
          : level === 'warning'
            ? 'A few upgrades would help.'
            : level === 'stable'
              ? 'Your defenses look serviceable.'
              : 'This village looks ready.';

  return {
    defenderCount,
    level,
    nextWaveSize,
    readinessLabel,
    suggestions,
    summary,
    survivalChance,
    wallLayers,
  };
};

