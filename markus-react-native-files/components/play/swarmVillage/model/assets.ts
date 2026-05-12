import type { ImageSourcePropType } from 'react-native';

import type { Tool } from './types';

export const HOME_BASE_IMAGE = require('@/assets/images/quest/starter_house.png');
export const GRASS_TILE_IMAGE = require('@/assets/images/quest/grass_tile.webp');
export const GRASS_TILE_PATH_A_IMAGE = require('@/assets/images/quest/grass_tile_path_a.webp');
export const GRASS_TILE_PATH_B_IMAGE = require('@/assets/images/quest/grass_tile_path_b.webp');
export const GRASS_TILE_PATH_C_IMAGE = require('@/assets/images/quest/grass_tile_path_c.webp');
export const GRASS_TILE_PATH_D_IMAGE = require('@/assets/images/quest/grass_tile_path_d.webp');
export const GRASS_TILE_PATH_E_IMAGE = require('@/assets/images/quest/grass_tile_path_e.webp');
export const GRASS_TILE_PATH_F_IMAGE = require('@/assets/images/quest/grass_tile_path_f.webp');
export const GRASS_TILE_PATH_G_IMAGE = require('@/assets/images/quest/grass_tile_path_g.webp');
export const GRASS_TILE_PATH_H_IMAGE = require('@/assets/images/quest/grass_tile_path_h.webp');
export const GRASS_TILE_PATH_I_IMAGE = require('@/assets/images/quest/grass_tile_path_i.webp');
export const GRASS_TILE_PATH_J_IMAGE = require('@/assets/images/quest/grass_tile_path_j.webp');
export const WALL_TILE_IMAGE = require('@/assets/images/quest/stone_wall.png');
export const WOOD_FENCE_IMAGE = require('@/assets/images/quest/wood_fence.webp');
export const IJOM_IMAGE = require('@/assets/images/quest/ijom-walk.gif');
export const BOXER_FRAMES = [
  require('@/assets/images/sprites/sudo_boxer_0.webp'),
  require('@/assets/images/sprites/sudo_boxer_1.webp'),
  require('@/assets/images/sprites/sudo_boxer_2.webp'),
  require('@/assets/images/sprites/sudo_boxer_3.webp'),
];
export const TENNIS_FRAMES = [
  require('@/assets/images/sprites/sudo_tennis_0.webp'),
  require('@/assets/images/sprites/sudo_tennis_1.webp'),
  require('@/assets/images/sprites/sudo_tennis_2.webp'),
  require('@/assets/images/sprites/sudo_tennis_3.webp'),
];
export const QUARTERBACK_IMAGE = require('@/assets/images/sudo-football.png');
export const FOOTBALL_IMAGE = require('@/assets/images/quest/football.webp');
export const JOYSTICK_BASE_IMAGE = require('@/assets/images/quest/joystick_base.webp');
export const JOYSTICK_NUB_IMAGE = require('@/assets/images/quest/joystick_nub.webp');
export const TINY_HOUSE_IMAGE = require('@/assets/images/quest/tiny_house.png');
export const SOIL_TILE_IMAGE = require('@/assets/images/quest/soil_tile.webp');
export const WHEAT_IMAGE = require('@/assets/images/quest/wheat.webp');
export const WINDMILL_IMAGE = require('@/assets/images/quest/windmill.gif');
export const CAPYBARA_STATUE_IMAGE = require('@/assets/images/quest/capybara.webp');
export const CRAZY_CAPY_IMAGE = require('@/assets/images/quest/crazycapy.gif');
export const CAPYBARA_POWERUP_IMAGE = require('@/assets/images/quest/capybara_powerup.webp');
export const FOREST_SPIRIT_IMAGE = require('@/assets/images/quest/forest-spirit.webp');
export const CHEST_IMAGE = require('@/assets/images/quest/chest.png');
export const IJOM_SNOW_IMAGE = require('@/assets/images/quest/snow-ijom.gif');
export const DEFAULT_GAMEPLAY_AVATAR_SOURCE = require('@/assets/images/quest/avatar.png');
export const STAR_IMAGE = require('@/assets/images/star.png');

export const DRAG_GHOST_SOURCES: Record<Exclude<Tool, 'erase' | 'heal'>, ImageSourcePropType> = {
  grass: GRASS_TILE_IMAGE,
  grass_path_a: GRASS_TILE_PATH_A_IMAGE,
  grass_path_b: GRASS_TILE_PATH_B_IMAGE,
  grass_path_c: GRASS_TILE_PATH_C_IMAGE,
  grass_path_d: GRASS_TILE_PATH_D_IMAGE,
  grass_path_e: GRASS_TILE_PATH_E_IMAGE,
  grass_path_f: GRASS_TILE_PATH_F_IMAGE,
  grass_path_g: GRASS_TILE_PATH_G_IMAGE,
  grass_path_h: GRASS_TILE_PATH_H_IMAGE,
  grass_path_i: GRASS_TILE_PATH_I_IMAGE,
  grass_path_j: GRASS_TILE_PATH_J_IMAGE,
  soil: SOIL_TILE_IMAGE,
  wall: WALL_TILE_IMAGE,
  fence: WOOD_FENCE_IMAGE,
  house: TINY_HOUSE_IMAGE,
  boxer: BOXER_FRAMES[0],
  tennis: TENNIS_FRAMES[0],
  quarterback: QUARTERBACK_IMAGE,
  windmill: WINDMILL_IMAGE,
  capybara_statue: CAPYBARA_STATUE_IMAGE,
  chest: CHEST_IMAGE,
};
