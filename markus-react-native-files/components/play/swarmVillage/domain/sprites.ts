import {
  CAPYBARA_STATUE_SPRITE_H,
  CAPYBARA_STATUE_SPRITE_OFFSET_X,
  CAPYBARA_STATUE_SPRITE_OFFSET_Y,
  CAPYBARA_STATUE_SPRITE_W,
  CHEST_SPRITE_H,
  CHEST_SPRITE_OFFSET_X,
  CHEST_SPRITE_OFFSET_Y,
  CHEST_SPRITE_W,
  ENEMY_SPRITE_SIZE,
  HOUSE_SPRITE_H,
  HOUSE_SPRITE_OFFSET_X,
  HOUSE_SPRITE_OFFSET_Y,
  HOUSE_SPRITE_W,
  QUARTERBACK_RANGE,
  SNOW_IJOM_SPRITE_SCALE,
  STONE_WALL_SPRITE_H,
  STONE_WALL_SPRITE_OFFSET_X,
  STONE_WALL_SPRITE_OFFSET_Y,
  STONE_WALL_SPRITE_W,
  TILE_HEIGHT,
  TILE_WIDTH,
  WINDMILL_SPRITE_H,
  WINDMILL_SPRITE_OFFSET_X,
  WINDMILL_SPRITE_OFFSET_Y,
  WINDMILL_SPRITE_W,
  WOOD_FENCE_SPRITE_H,
  WOOD_FENCE_SPRITE_OFFSET_X,
  WOOD_FENCE_SPRITE_OFFSET_Y,
  WOOD_FENCE_SPRITE_W,
} from '@/components/play/swarmVillage/model/constants';
import type { Enemy, Projectile, WallType } from '@/components/play/swarmVillage/model/types';

import { clamp } from './utils';

export const getEnemySpriteSize = (variant: Enemy['variant']) =>
  variant === 'snow'
    ? ENEMY_SPRITE_SIZE * SNOW_IJOM_SPRITE_SCALE
    : ENEMY_SPRITE_SIZE;

export const getProjectileElevation = (projectile: Pick<Projectile, 'arcHeight' | 'kind' | 'totalRange' | 'traveledRange'>) => {
  if (projectile.kind !== 'football') return 1.2;
  const totalRange = Math.max(1, projectile.totalRange ?? QUARTERBACK_RANGE);
  const progress = clamp((projectile.traveledRange ?? 0) / totalRange, 0, 1);
  return 0.55 + Math.sin(progress * Math.PI) * (projectile.arcHeight ?? 2.8);
};

export const getHouseSpritePosition = (left: number, top: number) => ({
  left: left + (TILE_WIDTH - HOUSE_SPRITE_W) / 2 + HOUSE_SPRITE_OFFSET_X,
  top: top + TILE_HEIGHT - HOUSE_SPRITE_H + HOUSE_SPRITE_OFFSET_Y,
});

export const getWindmillSpritePosition = (left: number, top: number) => ({
  left: left + (TILE_WIDTH - WINDMILL_SPRITE_W) / 2 + WINDMILL_SPRITE_OFFSET_X,
  top: top + TILE_HEIGHT - WINDMILL_SPRITE_H + WINDMILL_SPRITE_OFFSET_Y,
});

export const getCapybaraSpritePosition = (left: number, top: number) => ({
  left: left + (TILE_WIDTH - CAPYBARA_STATUE_SPRITE_W) / 2 + CAPYBARA_STATUE_SPRITE_OFFSET_X,
  top: top + TILE_HEIGHT - CAPYBARA_STATUE_SPRITE_H + CAPYBARA_STATUE_SPRITE_OFFSET_Y,
});

export const getChestSpritePosition = (left: number, top: number) => ({
  left: left + (TILE_WIDTH - CHEST_SPRITE_W) / 2 + CHEST_SPRITE_OFFSET_X,
  top: top + TILE_HEIGHT - CHEST_SPRITE_H + CHEST_SPRITE_OFFSET_Y,
});

export const getWallSpritePosition = (wallType: WallType, left: number, top: number) => {
  const isFence = wallType === 'wood';
  const width = isFence ? WOOD_FENCE_SPRITE_W : STONE_WALL_SPRITE_W;
  const height = isFence ? WOOD_FENCE_SPRITE_H : STONE_WALL_SPRITE_H;
  const offsetX = isFence ? WOOD_FENCE_SPRITE_OFFSET_X : STONE_WALL_SPRITE_OFFSET_X;
  const offsetY = isFence ? WOOD_FENCE_SPRITE_OFFSET_Y : STONE_WALL_SPRITE_OFFSET_Y;
  return {
    left: left + (TILE_WIDTH - width) / 2 + offsetX,
    top: top - 2 + offsetY,
    width,
    height,
  };
};

