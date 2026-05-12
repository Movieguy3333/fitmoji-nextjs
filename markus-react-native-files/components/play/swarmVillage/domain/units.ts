import {
  WALL_TILE_IMAGE,
  WOOD_FENCE_IMAGE,
} from '@/components/play/swarmVillage/model/assets';
import {
  QUARTERBACK_DAMAGE,
  QUARTERBACK_MAX_HP,
} from '@/components/play/swarmVillage/model/constants';
import {
  BOXER_DAMAGE,
  CHEST_MAX_HP,
  HOUSE_MAX_HP,
  ITEM_COSTS,
  STONE_WALL_MAX_HP,
  TENNIS_DAMAGE,
  TREE_UPGRADE_COSTS,
  TREE_UPGRADE_DAMAGE_MULTIPLIER,
  TREE_UPGRADE_HEALTH_MULTIPLIER,
  TREE_UPGRADE_MAX_LEVEL,
  WOOD_FENCE_MAX_HP,
} from '@/components/play/swarmVillage/model/costs';
import type {
  BoardCell,
  CombatTreeUnit,
  Tool,
  UnitType,
  WallType,
} from '@/components/play/swarmVillage/model/types';

import { clamp } from './utils';

export const getWallMaxHp = (wallType: WallType): number => {
  if (wallType === 'wood') return WOOD_FENCE_MAX_HP;
  if (wallType === 'stone') return STONE_WALL_MAX_HP;
  return 0;
};

export const getWallToolFromType = (wallType: WallType): Extract<Tool, 'wall' | 'fence'> | null => {
  if (wallType === 'wood') return 'fence';
  if (wallType === 'stone') return 'wall';
  return null;
};

export const getWallLabel = (wallType: WallType): string => (wallType === 'wood' ? 'Wood Fence' : 'Stone Wall');

export const getWallImage = (wallType: WallType): number => (wallType === 'wood' ? WOOD_FENCE_IMAGE : WALL_TILE_IMAGE);

export const isDamageableUnit = (unit: UnitType | null): unit is Exclude<UnitType, 'capybara_statue'> =>
  unit === 'boxer' || unit === 'tennis' || unit === 'quarterback' || unit === 'house' || unit === 'windmill' || unit === 'chest';

export const isUpgradeableTreeUnit = (unit: UnitType | null): unit is CombatTreeUnit =>
  unit === 'boxer' || unit === 'tennis' || unit === 'quarterback';

export const getCombatUnitMaxHp = (u: CombatTreeUnit) => {
  if (u === 'boxer') return 135;
  if (u === 'tennis') return 115;
  return QUARTERBACK_MAX_HP;
};

export const normalizeTreeLevel = (level: unknown) =>
  typeof level === 'number' && Number.isFinite(level)
    ? clamp(Math.floor(level), 1, TREE_UPGRADE_MAX_LEVEL)
    : 1;

export const getTreeLevel = (cell: Pick<BoardCell, 'unit' | 'unitLevel'>) =>
  isUpgradeableTreeUnit(cell.unit) ? normalizeTreeLevel(cell.unitLevel) : 0;

export const getTreeLevelMultiplier = (level: number, perUpgradeMultiplier: number) =>
  Math.pow(perUpgradeMultiplier, Math.max(0, normalizeTreeLevel(level) - 1));

export const getCombatUnitMaxHpForLevel = (unit: CombatTreeUnit, level = 1) =>
  Math.round(getCombatUnitMaxHp(unit) * getTreeLevelMultiplier(level, TREE_UPGRADE_HEALTH_MULTIPLIER));

export const getCombatUnitDamage = (unit: CombatTreeUnit, level = 1) => {
  const baseDamage =
    unit === 'boxer'
      ? BOXER_DAMAGE
      : unit === 'tennis'
        ? TENNIS_DAMAGE
        : QUARTERBACK_DAMAGE;
  return baseDamage * getTreeLevelMultiplier(level, TREE_UPGRADE_DAMAGE_MULTIPLIER);
};

export const getTreeSpriteScale = (level: number) =>
  getTreeLevelMultiplier(level, TREE_UPGRADE_HEALTH_MULTIPLIER);

export const getNextTreeUpgradeCost = (level: number) => {
  const nextLevel = normalizeTreeLevel(level) + 1;
  return nextLevel >= 2 && nextLevel <= TREE_UPGRADE_MAX_LEVEL
    ? TREE_UPGRADE_COSTS[nextLevel as 2 | 3 | 4]
    : null;
};

export const formatDamage = (damage: number) =>
  Number.isInteger(damage) ? String(damage) : damage.toFixed(1);

export const getUnitMaxHp = (unit: Exclude<UnitType, 'capybara_statue'>, level = 1) => {
  if (unit === 'house') return HOUSE_MAX_HP;
  if (unit === 'windmill') return WOOD_FENCE_MAX_HP;
  if (unit === 'chest') return CHEST_MAX_HP;
  return getCombatUnitMaxHpForLevel(unit, level);
};

export const getUnitLabel = (unit: UnitType) => {
  if (unit === 'boxer') return 'Boxer';
  if (unit === 'tennis') return 'Tennis';
  if (unit === 'quarterback') return 'Quarterback';
  if (unit === 'windmill') return 'Windmill';
  if (unit === 'capybara_statue') return 'Capybara Statue';
  if (unit === 'chest') return 'Treasure Chest';
  return 'Tiny House';
};

export const getTreeUpgradeEnergySpent = (level: number) => {
  let total = 0;
  const normalizedLevel = normalizeTreeLevel(level);
  for (let targetLevel = 2; targetLevel <= normalizedLevel; targetLevel += 1) {
    total += TREE_UPGRADE_COSTS[targetLevel as 2 | 3 | 4]?.energy ?? 0;
  }
  return total;
};

export const getUnitEraseRefundBaseCost = (unit: UnitType | null, level = 0): number => {
  if (!unit || unit === 'house') return 0;
  const upgradeEnergySpent = isUpgradeableTreeUnit(unit) ? getTreeUpgradeEnergySpent(level) : 0;
  return (ITEM_COSTS[unit] ?? 0) + upgradeEnergySpent;
};

export const isFullHealthHome = (cell: BoardCell) =>
  cell.unit === 'house' &&
  cell.unitMaxHp > 0 &&
  cell.unitHp >= cell.unitMaxHp;

export const getFullHealthHomeCount = (board: BoardCell[]) =>
  board.reduce((total, cell) => total + (isFullHealthHome(cell) ? 1 : 0), 0);
