import type { SwarmVillageBoardCell, SwarmVillageUnit, SwarmVillageWallType } from '@/types/swarm-village';

import { clamp } from './utils';

const STONE_WALL_MAX_HP = 20;
const WOOD_FENCE_MAX_HP = 6;
const HOUSE_MAX_HP = 80;
const CHEST_MAX_HP = STONE_WALL_MAX_HP;
const QUARTERBACK_MAX_HP = 150;
const PRIZES_MAX_HP = STONE_WALL_MAX_HP;
const TREE_UPGRADE_MAX_LEVEL = 4;
const TREE_UPGRADE_HEALTH_MULTIPLIER = 1.2;
const TREE_UPGRADE_DAMAGE_MULTIPLIER = 1.15;

const BOXER_BASE_DAMAGE = 12;
const TENNIS_BASE_DAMAGE = 8;
const QUARTERBACK_BASE_DAMAGE = 5;

export const getWallMaxHp = (wallType: SwarmVillageWallType): number => {
  if (wallType === 'wood') return WOOD_FENCE_MAX_HP;
  if (wallType === 'stone') return STONE_WALL_MAX_HP;
  return 0;
};

export const isDamageableUnit = (
  unit: SwarmVillageUnit,
): unit is Exclude<SwarmVillageUnit, 'capybara_statue' | null> =>
  unit === 'boxer' ||
  unit === 'tennis' ||
  unit === 'quarterback' ||
  unit === 'house' ||
  unit === 'windmill' ||
  unit === 'chest' ||
  unit === 'prizes';

export const isUpgradeableTreeUnit = (
  unit: SwarmVillageUnit,
): unit is 'boxer' | 'tennis' | 'quarterback' =>
  unit === 'boxer' || unit === 'tennis' || unit === 'quarterback';

export const normalizeTreeLevel = (level: unknown) =>
  typeof level === 'number' && Number.isFinite(level)
    ? clamp(Math.floor(level), 1, TREE_UPGRADE_MAX_LEVEL)
    : 1;

export const getTreeLevel = (
  cell: Pick<SwarmVillageBoardCell, 'unit' | 'unitLevel'>,
) => (isUpgradeableTreeUnit(cell.unit) ? normalizeTreeLevel(cell.unitLevel) : 0);

function getTreeLevelMultiplier(level: number, multiplier: number) {
  return Math.pow(multiplier, Math.max(0, normalizeTreeLevel(level) - 1));
}

function getCombatUnitBaseHp(unit: 'boxer' | 'tennis' | 'quarterback') {
  if (unit === 'boxer') return 135;
  if (unit === 'tennis') return 115;
  return QUARTERBACK_MAX_HP;
}

export const getUnitMaxHp = (
  unit: Exclude<SwarmVillageUnit, 'capybara_statue' | null>,
  level = 1,
): number => {
  if (unit === 'house') return HOUSE_MAX_HP;
  if (unit === 'windmill') return WOOD_FENCE_MAX_HP;
  if (unit === 'chest') return CHEST_MAX_HP;
  if (unit === 'prizes') return PRIZES_MAX_HP;
  return Math.round(
    getCombatUnitBaseHp(unit) *
      getTreeLevelMultiplier(level, TREE_UPGRADE_HEALTH_MULTIPLIER),
  );
};

export const getCombatUnitDamage = (
  unit: 'boxer' | 'tennis' | 'quarterback',
  level = 1,
) => {
  const base =
    unit === 'boxer'
      ? BOXER_BASE_DAMAGE
      : unit === 'tennis'
        ? TENNIS_BASE_DAMAGE
        : QUARTERBACK_BASE_DAMAGE;
  return base * getTreeLevelMultiplier(level, TREE_UPGRADE_DAMAGE_MULTIPLIER);
};
