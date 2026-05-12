import { ENERGY_COSTS } from '@/lib/game/energy';

import type { Tool } from './types';

export const COST_GRASS = ENERGY_COSTS.villageGrass;
export const COST_SOIL = ENERGY_COSTS.villageSoil;
export const COST_WALL = ENERGY_COSTS.villageWall;
export const COST_FENCE = ENERGY_COSTS.villageFence;
export const COST_HOUSE = ENERGY_COSTS.villageHouse;
export const COST_BOXER = ENERGY_COSTS.villageBoxer;
export const COST_TENNIS = ENERGY_COSTS.villageTennis;
export const COST_QUARTERBACK = ENERGY_COSTS.villageQuarterback;
export const COST_WINDMILL = ENERGY_COSTS.villageWindmill;

export const ERASE_REFUND_RATE = 0.5;
export const HEAL_RESTORE_FRACTION = 0.25;
export const FOREST_SPIRIT_REQUIRED_STREAK_DAYS = 7;
export const FOREST_SPIRIT_HEAL_FRACTION = 0.1;
export const STONE_WALL_MAX_HP = 20;
export const WOOD_FENCE_MAX_HP = 6;
export const HOUSE_MAX_HP = 80;
export const BOXER_DAMAGE = 10;
export const TENNIS_DAMAGE = 2;
export const TREE_UPGRADE_MAX_LEVEL = 4;
export const TREE_UPGRADE_HEALTH_MULTIPLIER = 1.2;
export const TREE_UPGRADE_DAMAGE_MULTIPLIER = 1.255;
export const TREE_UPGRADE_RESTORE_FRACTION = 0.2;
export const TREE_UPGRADE_COSTS: Record<2 | 3 | 4, { stars: number; energy: number }> = {
  2: { stars: 2, energy: 100 },
  3: { stars: 3, energy: 125 },
  4: { stars: 4, energy: 150 },
};
export const SOIL_SWARM_TARGET = 3;
export const MAP_EXPANSION_ENERGY_COST = ENERGY_COSTS.mapExpansion;
export const WINDMILL_SWARM_TARGET = 5;
export const WINDMILL_STAR_REWARD = 10;
export const CAPYBARA_STATUE_PRIZE_ID = 'capybara_statue';
export const CAPYBARA_STATUE_COST = 2000;
export const CHEST_COST = 500;
export const CHEST_STREAK_REQUIREMENT = 2;
export const CHEST_REQUIRED_FULL_HEALTH_HOMES = 4;
export const CHEST_MAX_HP = STONE_WALL_MAX_HP;
export const BOXER_RANGE = 1.15;
export const CHEST_STAR_REWARD_TABLE = [
  { stars: 1, weight: 36 },
  { stars: 2, weight: 26 },
  { stars: 3, weight: 18 },
  { stars: 4, weight: 10 },
  { stars: 5, weight: 10 },
] as const;

export const ITEM_COSTS: Record<Exclude<Tool, 'erase' | 'heal'>, number> = {
  grass: COST_GRASS,
  grass_path_a: COST_GRASS,
  grass_path_b: COST_GRASS,
  grass_path_c: COST_GRASS,
  grass_path_d: COST_GRASS,
  grass_path_e: COST_GRASS,
  grass_path_f: COST_GRASS,
  grass_path_g: COST_GRASS,
  grass_path_h: COST_GRASS,
  grass_path_i: COST_GRASS,
  grass_path_j: COST_GRASS,
  soil: COST_SOIL,
  wall: COST_WALL,
  fence: COST_FENCE,
  house: COST_HOUSE,
  boxer: COST_BOXER,
  tennis: COST_TENNIS,
  quarterback: COST_QUARTERBACK,
  windmill: COST_WINDMILL,
  capybara_statue: CAPYBARA_STATUE_COST,
  chest: CHEST_COST,
};

