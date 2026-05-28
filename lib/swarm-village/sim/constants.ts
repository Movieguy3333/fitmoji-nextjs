export const GRID_ROWS = 20;
export const DEFAULT_GRID_COLS = 9;
export const SHIP_COL = 4;
export const CASTLE_ROW_MIN = 0;
export const CASTLE_ROW_MAX = 2;
export const CASTLE_COL_MIN = SHIP_COL - 1;
export const CASTLE_COL_MAX = SHIP_COL + 1;
export const CASTLE_TARGET_COL = Math.floor(
  (CASTLE_COL_MIN + CASTLE_COL_MAX) / 2,
);
export const STARTER_HOME_ROW = CASTLE_ROW_MAX;
export const STARTER_HOME_COL = CASTLE_TARGET_COL;

export const isStarterHomeCell = (r: number, c: number) =>
  r === STARTER_HOME_ROW && c === STARTER_HOME_COL;

export const isCastleCell = (r: number, c: number) =>
  r >= CASTLE_ROW_MIN &&
  r <= CASTLE_ROW_MAX &&
  c >= CASTLE_COL_MIN &&
  c <= CASTLE_COL_MAX;

export const isHomeReservedCell = (r: number, c: number) =>
  isStarterHomeCell(r, c);

export const TILE_WIDTH = 74;
export const TILE_HEIGHT = 38;
export const HALF_W = TILE_WIDTH / 2;
export const HALF_H = TILE_HEIGHT / 2;
export const VOXEL_HEIGHT = 28;
export const MAX_WALL_HEIGHT = 4;
export const BOARD_TOP_INSET = 134;
export const SHIP_MAX_HP = 180;
export const DEFAULT_WAVE_SIZE = 16;
export const STREAK_IJOM_RAMP = 3;
export const WALL_IJOM_DIVISOR = 2;
export const WAVE_SIMULATION_INTERVAL_MS = 32;
export const ENEMY_WALL_ATTACK_COOLDOWN_MS = 820;
export const ENEMY_TREE_ATTACK_COOLDOWN_MS = 900;

export const IJOM_MIN_DAMAGE = 6;
export const IJOM_BASE_DAMAGE = 8;
export const NORMAL_IJOM_WALL_DAMAGE = 1;
export const SNOW_IJOM_WALL_DAMAGE = 2;
export const ENEMY_UNIT_ATTACK_RADIUS = 0.96;
export const ENEMY_WALL_ATTACK_RADIUS = 0.96;
export const NORMAL_IJOM_PERSONAL_SPACE_RADIUS = 0.52;
export const SNOW_IJOM_PERSONAL_SPACE_RADIUS = 0.66;
export const ENEMY_SPAWN_SCAN_DEPTH_ROWS = 4;
export const ENEMY_SPAWN_SPACING_BUFFER = 0.16;
export const IJOM_SPEED_PER_TICK_BASE = 0.002;
export const IJOM_SPEED_PER_TICK_VARIANCE = 0.001;
export const IJOM_VILLAGE_SPEED_SCALE = 12.5;
export const IJOM_SPEED_MULTIPLIER = 0.25;
export const IJOM_VILLAGE_DIFFICULTY_RAMP_DIVISOR = 1600;

export const ENEMY_SPRITE_SIZE = 48;
export const SNOW_IJOM_SPRITE_SCALE = 1.3;
export const ENEMY_SPRITE_LEFT_OFFSET = 8;
export const ENEMY_SPRITE_TOP_OFFSET = 8;

export const SNOW_WALL_SEEK_RANGE = 3;

export const NORMAL_IJOM_MAX_HP = 18;
export const SNOW_IJOM_MAX_HP = 36;
export const SNOW_IJOM_DAMAGE_MULTIPLIER = 2;

export const IJOM_CONCURRENT_ENTITY_CAP = 40;
export const IJOM_SUPER_WAVE_SIZE_THRESHOLD = 50;
export const IJOM_SUPER_PACK_SIZE = 4;
export const IJOM_SUPER_SPAWN_BASE_CHANCE = 0.35;
export const IJOM_SUPER_SPAWN_MAX_CHANCE = 0.85;
export const IJOM_SUPER_FORCE_ENTITY_COUNT = Math.floor(
  IJOM_CONCURRENT_ENTITY_CAP * 0.85,
);
