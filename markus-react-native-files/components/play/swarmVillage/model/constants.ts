import type { Enemy, HomeBaseVariant } from './types';

export const GRID_ROWS = 20;
export const DEFAULT_GRID_COLS = 9;
export const SHIP_COL = 4;
export const CASTLE_ROW_MIN = 0;
export const CASTLE_ROW_MAX = 2;
export const CASTLE_COL_MIN = SHIP_COL - 1;
export const CASTLE_COL_MAX = SHIP_COL + 1;
export const CASTLE_TARGET_COL = Math.floor((CASTLE_COL_MIN + CASTLE_COL_MAX) / 2);
export const STARTER_HOME_ROW = CASTLE_ROW_MAX;
export const STARTER_HOME_COL = CASTLE_TARGET_COL;
export const HOME_BASE_VARIANT = 'starter_house' as HomeBaseVariant;
export const HOME_BASE_LABEL = HOME_BASE_VARIANT === 'starter_house' ? 'Starter House' : 'Castle';

export const isCastleCell = (r: number, c: number) =>
  r >= CASTLE_ROW_MIN && r <= CASTLE_ROW_MAX && c >= CASTLE_COL_MIN && c <= CASTLE_COL_MAX;

export const isStarterHomeCell = (r: number, c: number) => r === STARTER_HOME_ROW && c === STARTER_HOME_COL;

export const isHomeReservedCell = (r: number, c: number) =>
  HOME_BASE_VARIANT === 'castle' ? isCastleCell(r, c) : isStarterHomeCell(r, c);

export const enemyReachedCastle = (e: Enemy) =>
  e.row <= CASTLE_ROW_MIN + 0.35 && e.col >= CASTLE_COL_MIN - 0.55 && e.col <= CASTLE_COL_MAX + 0.55;

export const TILE_WIDTH = 74;
export const TILE_HEIGHT = 38;
export const HOUSE_SPRITE_W = 90;
export const HOUSE_SPRITE_H = 90;
export const HOUSE_SPRITE_OFFSET_X = 0;
export const HOUSE_SPRITE_OFFSET_Y = 30;
export const WINDMILL_SPRITE_W = 82;
export const WINDMILL_SPRITE_H = 98;
export const WINDMILL_SPRITE_OFFSET_X = -2;
export const WINDMILL_SPRITE_OFFSET_Y = 12;
export const CAPYBARA_STATUE_SPRITE_W = 78;
export const CAPYBARA_STATUE_SPRITE_H = 78;
export const CAPYBARA_STATUE_SPRITE_OFFSET_X = 1;
export const CAPYBARA_STATUE_SPRITE_OFFSET_Y = 22;
export const CHEST_SPRITE_W = 34;
export const CHEST_SPRITE_H = 35;
export const CHEST_SPRITE_OFFSET_X = 0;
export const CHEST_SPRITE_OFFSET_Y = 17;
export const STONE_WALL_SPRITE_W = 64;
export const STONE_WALL_SPRITE_H = 55;
export const STONE_WALL_SPRITE_OFFSET_X = -1;
export const STONE_WALL_SPRITE_OFFSET_Y = 8;
export const WOOD_FENCE_SPRITE_W = 62;
export const WOOD_FENCE_SPRITE_H = 49;
export const WOOD_FENCE_SPRITE_OFFSET_X = -1;
export const WOOD_FENCE_SPRITE_OFFSET_Y = 8;
export const CASTLE_SPRITE_SCALE = 1;
export const CASTLE_SPRITE_MIN_WIDTH = 112;
export const CASTLE_SPRITE_OFFSET_X = 0;
export const CASTLE_SPRITE_OFFSET_Y = -40;
export const CASTLE_FOOTPRINT_GROUND_SORT_OFFSET = 0;
export const CASTLE_CELL_22_SORT_BUMP = 0;
export const CASTLE_Z_INDEX_OFFSET = 0;
export const VOXEL_HEIGHT = 28;
export const MAX_WALL_HEIGHT = 4;
export const SHIP_MAX_HP = 180;
export const DEFAULT_WAVE_SIZE = 22;
export const STREAK_IJOM_RAMP = 6;
export const WALL_IJOM_DIVISOR = 2;
export const GAME_TICK_MS = 120;
export const WAVE_SIMULATION_INTERVAL_MS = 32;
export const ENEMY_WALL_ATTACK_COOLDOWN_MS = 820;
export const ENEMY_TREE_ATTACK_COOLDOWN_MS = 900;
export const VICTORY_REWARD_MODAL_EXIT_DELAY_MS = 280;
export const CRAZY_CAPY_DURATION_PER_STATUE_MS = 20_000;
export const CRAZY_CAPY_CHARGE_ACTIVE_CALORIES = 1000;
export const CRAZY_CAPY_TEST_MODE = false;
export const CRAZY_CAPY_DAMAGE = 10;
export const CRAZY_CAPY_HIT_RADIUS = 0.72;
export const CRAZY_CAPY_HIT_COOLDOWN_MS = 420;
export const CRAZY_CAPY_SWING_SFX_INTERVAL_MS = 500;
export const CRAZY_CAPY_SWING_SFX_VOLUME = 0.2;
export const CRAZY_CAPY_AMBIENT_SFX_VOLUME = 0.1;
export const CRAZY_CAPY_SPEED_PER_TICK = 0.22;
export const CRAZY_CAPY_WALL_AVOID_RADIUS = 1.5;
export const CRAZY_CAPY_KNOCKOUT_FLIGHT_MS = 900;
export const VILLAGE_AVATAR_WALK_SPEED_PER_TICK = 0.05;
export const VILLAGE_AVATAR_HARVEST_WALK_DURATION_MS = 1000;
export const VILLAGE_AVATAR_WALK_MIN_STEPS = 3;
export const VILLAGE_AVATAR_WALK_MAX_STEPS = 30;
export const VILLAGE_AVATAR_IDLE_MIN_DELAY_MS = 4000;
export const VILLAGE_AVATAR_IDLE_MAX_DELAY_MS = 9000;
export const VILLAGE_AVATAR_PAUSE_MIN_MS = 650;
export const VILLAGE_AVATAR_PAUSE_MAX_MS = 1600;
export const VILLAGE_AVATAR_OFFSET_X = 0;
export const VILLAGE_AVATAR_OFFSET_Y = 24;
export const VILLAGE_AVATAR_CASTLE_DOOR_ROW = CASTLE_ROW_MAX + 0.98;
export const VILLAGE_AVATAR_CASTLE_DOOR_COL = CASTLE_TARGET_COL + 0.02;
export const IJOM_MIN_DAMAGE = 6;
export const IJOM_BASE_DAMAGE = 8;
export const IJOM_DAMAGE_ACTIVE_MINUTES_DIVISOR = 170;
export const SNOW_IJOM_DAMAGE_MULTIPLIER = 3;
export const NORMAL_IJOM_WALL_DAMAGE = 1;
export const SNOW_IJOM_WALL_DAMAGE = 1;
export const ENEMY_UNIT_ATTACK_RADIUS = 0.96;
export const ENEMY_WALL_ATTACK_RADIUS = 0.96;
export const NORMAL_IJOM_PERSONAL_SPACE_RADIUS = 0.52;
export const SNOW_IJOM_PERSONAL_SPACE_RADIUS = 0.66;
export const ENEMY_SPAWN_SCAN_DEPTH_ROWS = 4;
export const ENEMY_SPAWN_SPACING_BUFFER = 0.16;
export const IJOM_SPAWN_INTERVAL_BASE_MS = 1100;
export const IJOM_SPAWN_INTERVAL_MIN_MS = 350;
export const IJOM_SPAWN_INTERVAL_ACTIVE_MINUTES_DIVISOR = 160;
export const IJOM_SPEED_PER_TICK_BASE = 0.008;
export const IJOM_SPEED_PER_TICK_VARIANCE = 0.008;
export const IJOM_VILLAGE_SPEED_SCALE = 12.5;
export const IJOM_SPEED_MULTIPLIER = 0.25;
export const IJOM_VILLAGE_DIFFICULTY_RAMP_DIVISOR = 1600;
export const TENNIS_RANGE = 6;
export const TENNIS_PROJECTILE_HIT_RADIUS = 0.66;
export const QUARTERBACK_DAMAGE = 5;
export const QUARTERBACK_MAX_HP = 150;
export const QUARTERBACK_RANGE = 30;
export const QUARTERBACK_THROW_COOLDOWN_MS = 1200;
export const QUARTERBACK_THROW_VIEW_SCALE = 0.62;
export const QUARTERBACK_MIN_PULL_DISTANCE_PX = 28;
export const QUARTERBACK_MAX_PULL_DISTANCE_PX = 320;
export const QUARTERBACK_PULL_POWER_EXPONENT = 1.35;
export const QUARTERBACK_AIM_VISUAL_UPDATE_MS = 33;
export const QUARTERBACK_PROJECTILE_SPEED_PER_TICK = 0.55;
export const QUARTERBACK_PROJECTILE_HIT_RADIUS = 0.76;
export const QUARTERBACK_SPLASH_CELL_RADIUS = 1.5;
export const QUARTERBACK_EXPLOSION_MS = 520;
export const QUARTERBACK_VIEWPORT_ANIMATION_MS = 260;
export const QUARTERBACK_PREVIEW_SEGMENTS = 18;
export const QUARTERBACK_THROW_PAD_SIZE = 118;
export const QUARTERBACK_THROW_PAD_NUB_MAX_OFFSET = 27;
export const MAX_SCALE = 1.85;
export const ENEMY_SPRITE_SIZE = 48;
export const SNOW_IJOM_SPRITE_SCALE = 1.3;
export const ENEMY_SPRITE_LEFT_OFFSET = 20;
export const ENEMY_SPRITE_TOP_OFFSET = -15;
export const HALF_W = TILE_WIDTH / 2;
export const HALF_H = TILE_HEIGHT / 2;
export const ISO_SEGMENT = Math.hypot(HALF_W, HALF_H);
export const ISO_ANGLE_RIGHT = Math.atan2(HALF_H, HALF_W);
export const ISO_ANGLE_LEFT = Math.PI - ISO_ANGLE_RIGHT;
export const COL_LINE_LEN = GRID_ROWS * ISO_SEGMENT;
export const NEW_PLAYER_SEASONAL_ENERGY_CAP = 5000;
export const FOREST_SPIRIT_DAILY_OPEN_FIRESTORE_SUBCOLLECTION = 'SwarmVillageDailyOpens';
export const FOREST_SPIRIT_POWERUP_USE_FIRESTORE_SUBCOLLECTION = 'SwarmVillagePowerupUses';
export const SWARM_WINDOW_HOURS = [12, 18] as const;
export const SWARM_NOTIFICATION_LOOKAHEAD_DAYS = 7;
export const VILLAGE_NOTIFICATION_CHANNEL_ID = 'village-alerts';
export const SNOW_WALL_SEEK_RANGE = 3;
export const TOOL_DRAG_HOLD_DELAY_MS = 500;
export const TOOL_DRAG_MOVE_CANCEL_THRESHOLD = 12;
export const VILLAGE_GALLERY_PREVIEW_LAYOUT_SIZE = 512;
export const VILLAGE_GALLERY_PREVIEW_IMAGE_SIZE = 768;
export const VILLAGE_GALLERY_PREVIEW_CONTENT_TYPE = 'image/jpeg';
export const VILLAGE_GALLERY_PREVIEW_QUALITY = 0.9;

export const EASTERN_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
