import type {
  SwarmVillageBoardCell,
  SwarmVillageFoundation,
  SwarmVillageRotation,
  SwarmVillageUnit,
  SwarmVillageWallType,
} from "@/types/swarm-village";

export const SWARM_GRID_ROWS = 20;
export const SWARM_DEFAULT_GRID_COLS = 9;

const TILE_WIDTH = 74;
const TILE_HEIGHT = 38;
const HALF_W = TILE_WIDTH / 2;
const HALF_H = TILE_HEIGHT / 2;
const VOXEL_HEIGHT = 28;
const MAX_WALL_HEIGHT = 4;
const BOARD_TOP_INSET = 134;

const SHIP_COL = 4;
const CASTLE_ROW_MIN = 0;
const CASTLE_ROW_MAX = 2;
const CASTLE_COL_MIN = SHIP_COL - 1;
const CASTLE_COL_MAX = SHIP_COL + 1;
const CASTLE_SPRITE_SCALE = 1;
const CASTLE_SPRITE_MIN_WIDTH = 112;
const CASTLE_SPRITE_OFFSET_X = 0;
const CASTLE_SPRITE_OFFSET_Y = -40;
const CASTLE_Z_INDEX_OFFSET = 0;

const HOUSE_SPRITE_W = 90;
const HOUSE_SPRITE_H = 90;
const HOUSE_SPRITE_OFFSET_X = 0;
const HOUSE_SPRITE_OFFSET_Y = 30;
const WINDMILL_SPRITE_W = 82;
const WINDMILL_SPRITE_H = 98;
const WINDMILL_SPRITE_OFFSET_X = -2;
const WINDMILL_SPRITE_OFFSET_Y = 12;
const CAPYBARA_STATUE_SPRITE_W = 78;
const CAPYBARA_STATUE_SPRITE_H = 78;
const CAPYBARA_STATUE_SPRITE_OFFSET_X = 1;
const CAPYBARA_STATUE_SPRITE_OFFSET_Y = 22;
const CHEST_SPRITE_W = 34;
const CHEST_SPRITE_H = 35;
const CHEST_SPRITE_OFFSET_X = 0;
const CHEST_SPRITE_OFFSET_Y = 17;
const PRIZES_SPRITE_W = 78;
const PRIZES_SPRITE_H = 78;
const PRIZES_SPRITE_OFFSET_X = 0;
const PRIZES_SPRITE_OFFSET_Y = 20;
const STONE_WALL_SPRITE_W = 64;
const STONE_WALL_SPRITE_H = 55;
const STONE_WALL_SPRITE_OFFSET_X = -1;
const STONE_WALL_SPRITE_OFFSET_Y = 8;
const WOOD_FENCE_SPRITE_W = 62;
const WOOD_FENCE_SPRITE_H = 49;
const WOOD_FENCE_SPRITE_OFFSET_X = -1;
const WOOD_FENCE_SPRITE_OFFSET_Y = 8;

const STONE_WALL_MAX_HP = 20;
const WOOD_FENCE_MAX_HP = 6;
const HOUSE_MAX_HP = 80;
const CHEST_MAX_HP = STONE_WALL_MAX_HP;
const QUARTERBACK_MAX_HP = 150;
const PRIZES_UPGRADE_LEVEL = 3;
const TREE_UPGRADE_MAX_LEVEL = 4;
const TREE_UPGRADE_HEALTH_MULTIPLIER = 1.2;
const SOIL_SWARM_TARGET = 3;

const FOUNDATION_ASSETS: Record<Exclude<SwarmVillageFoundation, false>, string> = {
  grass: "/swarm-village/quest/grass_tile.webp",
  grass_path_a: "/swarm-village/quest/grass_tile_path_a.webp",
  grass_path_b: "/swarm-village/quest/grass_tile_path_b.webp",
  grass_path_c: "/swarm-village/quest/grass_tile_path_c.webp",
  grass_path_d: "/swarm-village/quest/grass_tile_path_d.webp",
  grass_path_e: "/swarm-village/quest/grass_tile_path_e.webp",
  grass_path_f: "/swarm-village/quest/grass_tile_path_f.webp",
  grass_path_g: "/swarm-village/quest/grass_tile_path_g.webp",
  grass_path_h: "/swarm-village/quest/grass_tile_path_h.webp",
  grass_path_i: "/swarm-village/quest/grass_tile_path_i.webp",
  grass_path_j: "/swarm-village/quest/grass_tile_path_j.webp",
  soil: "/swarm-village/quest/soil_tile.webp",
};

const UNIT_ASSETS = {
  boxer: "/swarm-village/sprites/sudo_boxer_0.webp",
  tennis: "/swarm-village/sprites/sudo_tennis_0.webp",
  quarterback: "/swarm-village/sprites/sudo-football.png",
  house: "/swarm-village/quest/tiny_house.png",
  windmill: "/swarm-village/quest/windmill.gif",
  capybara_statue: "/swarm-village/quest/capybara.webp",
  prizes: "/swarm-village/quest/vending.webp",
  chest: "/swarm-village/quest/chest.png",
} satisfies Record<Exclude<SwarmVillageUnit, null>, string>;

export const SWARM_VILLAGE_HOME_ASSET =
  "/swarm-village/quest/starter_house.png";
export const SWARM_VILLAGE_DEFAULT_AVATAR_ASSET =
  "/swarm-village/quest/avatar.png";

const WHEAT_ASSET = "/swarm-village/quest/wheat.webp";
const STONE_WALL_ASSET = "/swarm-village/quest/stone_wall.png";
const WOOD_FENCE_ASSET = "/swarm-village/quest/wood_fence.webp";
const VENDING_BLUE_ASSET = "/swarm-village/quest/vending_blue.webp";
const VENDING_GOLD_ASSET = "/swarm-village/quest/vending_gold.webp";

export type PlacedSwarmVillageSprite = {
  id: string;
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
  sortOrder: number;
  row: number;
  col: number;
  flipX: boolean;
};

export type SwarmVillageScene = {
  boardWidth: number;
  boardHeight: number;
  boardCenterX: number;
  boardTopInset: number;
  sprites: PlacedSwarmVillageSprite[];
  homeBase: {
    left: number;
    top: number;
    width: number;
    height: number;
    zIndex: number;
  };
  homeAvatar: {
    left: number;
    top: number;
    width: number;
    height: number;
    zIndex: number;
  };
  homeAvatarPlatform: {
    left: number;
    top: number;
    width: number;
    height: number;
    zIndex: number;
  };
};

export function inferSwarmVillageGridCols(cells: unknown): number {
  if (!Array.isArray(cells) || cells.length === 0) {
    return SWARM_DEFAULT_GRID_COLS;
  }

  const inferred = cells.length / SWARM_GRID_ROWS;

  if (Number.isInteger(inferred) && inferred >= SWARM_DEFAULT_GRID_COLS) {
    return inferred;
  }

  return SWARM_DEFAULT_GRID_COLS;
}

export function normalizeSwarmVillageGridCols(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(SWARM_DEFAULT_GRID_COLS, Math.floor(value));
  }

  return SWARM_DEFAULT_GRID_COLS;
}

export function normalizeSwarmVillageBoard(
  rawCells: unknown,
  gridCols = inferSwarmVillageGridCols(rawCells),
): SwarmVillageBoardCell[] {
  const cells = Array.isArray(rawCells) ? rawCells : [];
  const cellCount = SWARM_GRID_ROWS * gridCols;

  return Array.from({ length: cellCount }, (_, index) =>
    normalizeSwarmVillageBoardCell(cells[index]),
  );
}

export function normalizeSwarmVillageBoardCell(
  rawCell: unknown,
): SwarmVillageBoardCell {
  const raw = isRecord(rawCell) ? rawCell : {};
  const foundation = normalizeFoundation(raw.foundation);
  const wallHeight = clampInt(raw.wallHeight, 0, MAX_WALL_HEIGHT);
  const wallType =
    wallHeight <= 0 ? null : normalizeWallType(raw.wallType) ?? "stone";
  const wallMaxHp = getWallMaxHp(wallType);
  const rawWallHp = readFiniteNumber(raw.wallHp);
  const unit = normalizeUnit(raw.unit);
  const unitLevel = isUpgradeableTreeUnit(unit)
    ? normalizeTreeLevel(raw.unitLevel)
    : unit === "prizes"
      ? normalizePrizesLevel(raw.unitLevel)
    : 0;
  const unitMaxHp = getNormalizedUnitMaxHp(unit, unitLevel, raw.unitMaxHp);
  const unitHp = getNormalizedUnitHp(unit, unitMaxHp, raw.unitHp);

  return {
    foundation,
    wallHeight,
    wallHp:
      wallHeight > 0
        ? clamp(rawWallHp ?? wallMaxHp, 0, wallMaxHp || rawWallHp || 0)
        : 0,
    wallMaxHp: wallHeight > 0 ? wallMaxHp : 0,
    wallType,
    wallRotation: normalizeRotation(raw.wallRotation),
    soilPlacedAt:
      foundation === "soil" ? readFiniteNumber(raw.soilPlacedAt) : null,
    soilStartSwarmCompletionCount:
      foundation === "soil"
        ? readNonNegativeInt(raw.soilStartSwarmCompletionCount)
        : null,
    unit,
    unitHp,
    unitMaxHp,
    unitLevel,
    unitLastAttackAt: readFiniteNumber(raw.unitLastAttackAt) ?? 0,
    unitFacingScaleX: raw.unitFacingScaleX === -1 ? -1 : 1,
    unitRotation: normalizeRotation(raw.unitRotation),
    unitRewardBaselineCompletionCount:
      unit === "windmill" || unit === "chest"
        ? readNonNegativeInt(raw.unitRewardBaselineCompletionCount)
        : null,
  };
}

export function buildSwarmVillageScene(options: {
  board: SwarmVillageBoardCell[];
  gridCols: number;
  swarmCompletionCount: number;
}): SwarmVillageScene {
  const gridCols = normalizeSwarmVillageGridCols(options.gridCols);
  const board = normalizeSwarmVillageBoard(options.board, gridCols);
  const geometry = getBoardGeometry(gridCols);
  const sprites: PlacedSwarmVillageSprite[] = [];

  for (let row = 0; row < SWARM_GRID_ROWS; row += 1) {
    for (let col = 0; col < gridCols; col += 1) {
      const cell = getCell(board, row, col, gridCols);

      if (!cell.foundation) {
        continue;
      }

      const base = isoPosition(geometry, row, col);
      const depth = (row + col) * 10;

      sprites.push({
        id: `g-${row}-${col}`,
        src: FOUNDATION_ASSETS[cell.foundation],
        left: base.left + 2,
        top: base.top - 2,
        width: TILE_WIDTH - 4,
        height: 48,
        sortOrder: depth,
        row,
        col,
        flipX: false,
      });

      if (isSoilCropReady(cell, options.swarmCompletionCount)) {
        sprites.push({
          id: `crop-${row}-${col}`,
          src: WHEAT_ASSET,
          left: base.left + 12,
          top: base.top - 12,
          width: 48,
          height: 42,
          sortOrder: depth + 0.6,
          row,
          col,
          flipX: false,
        });
      }

      for (let level = 1; level <= cell.wallHeight; level += 1) {
        const elevated = isoPosition(geometry, row, col, level);
        const wallType = cell.wallType ?? "stone";
        const wall = getWallSpritePosition(wallType, elevated.left, elevated.top);

        sprites.push({
          id: `w-${row}-${col}-${level}`,
          src: wallType === "wood" ? WOOD_FENCE_ASSET : STONE_WALL_ASSET,
          left: wall.left,
          top: wall.top,
          width: wall.width,
          height: wall.height,
          sortOrder: depth + level,
          row,
          col,
          flipX: cell.wallRotation === 1 || cell.wallRotation === 3,
        });
      }

      if (!cell.unit) {
        continue;
      }

      const elevated = isoPosition(geometry, row, col, cell.wallHeight + 1);
      const unitSprite = getUnitSprite(cell, elevated.left, elevated.top);

      sprites.push({
        ...unitSprite,
        id: `u-${row}-${col}`,
        sortOrder: depth + cell.wallHeight + 2,
        row,
        col,
      });
    }
  }

  return {
    ...geometry,
    sprites: sprites.sort((first, second) => first.sortOrder - second.sortOrder),
    ...getHomeBaseSprites(geometry),
  };
}

function getBoardGeometry(gridCols: number) {
  return {
    boardWidth: (SWARM_GRID_ROWS + gridCols) * HALF_W + TILE_WIDTH,
    boardHeight:
      250 + (SWARM_GRID_ROWS + gridCols) * HALF_H + MAX_WALL_HEIGHT * VOXEL_HEIGHT,
    boardCenterX: (SWARM_GRID_ROWS + 1) * HALF_W,
    boardTopInset: BOARD_TOP_INSET,
  };
}

function isoPosition(
  geometry: ReturnType<typeof getBoardGeometry>,
  row: number,
  col: number,
  elevation = 0,
) {
  return {
    left: geometry.boardCenterX + (col - row) * HALF_W - HALF_W,
    top: BOARD_TOP_INSET + (col + row) * HALF_H - elevation * VOXEL_HEIGHT,
  };
}

function getHomeBaseSprites(geometry: ReturnType<typeof getBoardGeometry>) {
  const grassInset = 2;
  const grassTopPad = 2;
  const grassHeight = 48;
  let minLeft = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;

  for (let row = CASTLE_ROW_MIN; row <= CASTLE_ROW_MAX; row += 1) {
    for (let col = CASTLE_COL_MIN; col <= CASTLE_COL_MAX; col += 1) {
      const point = isoPosition(geometry, row, col);
      const left = point.left + grassInset;
      const right = point.left + TILE_WIDTH - grassInset;
      const top = point.top - grassTopPad;
      const bottom = top + grassHeight;

      minLeft = Math.min(minLeft, left);
      maxRight = Math.max(maxRight, right);
      maxBottom = Math.max(maxBottom, bottom);
    }
  }

  const centerX = (minLeft + maxRight) / 2;
  const footWidth = maxRight - minLeft;
  const width = Math.max(CASTLE_SPRITE_MIN_WIDTH, footWidth * CASTLE_SPRITE_SCALE);
  const height = width * (198 / 230);
  const baseNudgeX = -footWidth * 0.045;
  const homeBase = {
    left: centerX - width / 2 + baseNudgeX + CASTLE_SPRITE_OFFSET_X,
    top: maxBottom - height * 0.86 + CASTLE_SPRITE_OFFSET_Y,
    width,
    height,
    zIndex:
      100 +
      (CASTLE_ROW_MAX + CASTLE_COL_MAX) * 10 +
      CASTLE_Z_INDEX_OFFSET,
  };
  const avatarWidth = clamp(homeBase.width * 0.18, 28, 42);
  const avatarHeight = avatarWidth * 1.12;
  const homeAvatar = {
    left: homeBase.left + homeBase.width * 0.46 - 30,
    top: homeBase.top + homeBase.height * 0.38,
    width: avatarWidth,
    height: avatarHeight,
    zIndex: homeBase.zIndex + 2,
  };

  return {
    homeBase,
    homeAvatar,
    homeAvatarPlatform: {
      left: homeAvatar.left - 2,
      top: homeAvatar.top + homeAvatar.height - 7,
      width: homeAvatar.width + 4,
      height: 10,
      zIndex: homeAvatar.zIndex - 1,
    },
  };
}

function getUnitSprite(
  cell: SwarmVillageBoardCell,
  left: number,
  top: number,
): Omit<PlacedSwarmVillageSprite, "id" | "sortOrder" | "row" | "col"> {
  if (cell.unit === "house") {
    const position = getHouseSpritePosition(left, top);

    return {
      src: UNIT_ASSETS.house,
      left: position.left,
      top: position.top,
      width: HOUSE_SPRITE_W,
      height: HOUSE_SPRITE_H,
      flipX: cell.unitRotation === 1 || cell.unitRotation === 3,
    };
  }

  if (cell.unit === "chest") {
    const position = getChestSpritePosition(left, top);

    return {
      src: UNIT_ASSETS.chest,
      left: position.left,
      top: position.top,
      width: CHEST_SPRITE_W,
      height: CHEST_SPRITE_H,
      flipX: false,
    };
  }

  if (cell.unit === "capybara_statue") {
    const position = getCapybaraSpritePosition(left, top);

    return {
      src: UNIT_ASSETS.capybara_statue,
      left: position.left,
      top: position.top,
      width: CAPYBARA_STATUE_SPRITE_W,
      height: CAPYBARA_STATUE_SPRITE_H,
      flipX: cell.unitRotation === 1 || cell.unitRotation === 3,
    };
  }

  if (cell.unit === "prizes") {
    const position = getPrizesSpritePosition(left, top);

    return {
      src: getPrizesAsset(cell.unitLevel),
      left: position.left,
      top: position.top,
      width: PRIZES_SPRITE_W,
      height: PRIZES_SPRITE_H,
      flipX: false,
    };
  }

  if (cell.unit === "windmill") {
    const position = getWindmillSpritePosition(left, top);

    return {
      src: UNIT_ASSETS.windmill,
      left: position.left + 2,
      top: position.top + 5,
      width: WINDMILL_SPRITE_W,
      height: WINDMILL_SPRITE_H,
      flipX: false,
    };
  }

  const baseSpriteSize = cell.unit === "quarterback" ? 60 : 56;
  const spriteScale = getTreeSpriteScale(getTreeLevel(cell));
  const spriteSize = Math.round(baseSpriteSize * spriteScale);
  const unit =
    cell.unit === "tennis"
      ? "tennis"
      : cell.unit === "quarterback"
        ? "quarterback"
        : "boxer";

  return {
    src: UNIT_ASSETS[unit],
    left: left + 9 - (spriteSize - baseSpriteSize) / 2,
    top: top - 2 - (spriteSize - baseSpriteSize),
    width: spriteSize,
    height: spriteSize,
    flipX: cell.unitFacingScaleX === -1,
  };
}

function getHouseSpritePosition(left: number, top: number) {
  return {
    left: left + (TILE_WIDTH - HOUSE_SPRITE_W) / 2 + HOUSE_SPRITE_OFFSET_X,
    top: top + TILE_HEIGHT - HOUSE_SPRITE_H + HOUSE_SPRITE_OFFSET_Y,
  };
}

function getWindmillSpritePosition(left: number, top: number) {
  return {
    left:
      left + (TILE_WIDTH - WINDMILL_SPRITE_W) / 2 + WINDMILL_SPRITE_OFFSET_X,
    top: top + TILE_HEIGHT - WINDMILL_SPRITE_H + WINDMILL_SPRITE_OFFSET_Y,
  };
}

function getCapybaraSpritePosition(left: number, top: number) {
  return {
    left:
      left +
      (TILE_WIDTH - CAPYBARA_STATUE_SPRITE_W) / 2 +
      CAPYBARA_STATUE_SPRITE_OFFSET_X,
    top:
      top +
      TILE_HEIGHT -
      CAPYBARA_STATUE_SPRITE_H +
      CAPYBARA_STATUE_SPRITE_OFFSET_Y,
  };
}

function getChestSpritePosition(left: number, top: number) {
  return {
    left: left + (TILE_WIDTH - CHEST_SPRITE_W) / 2 + CHEST_SPRITE_OFFSET_X,
    top: top + TILE_HEIGHT - CHEST_SPRITE_H + CHEST_SPRITE_OFFSET_Y,
  };
}

function getPrizesSpritePosition(left: number, top: number) {
  return {
    left: left + (TILE_WIDTH - PRIZES_SPRITE_W) / 2 + PRIZES_SPRITE_OFFSET_X,
    top: top + TILE_HEIGHT - PRIZES_SPRITE_H + PRIZES_SPRITE_OFFSET_Y,
  };
}

function getWallSpritePosition(
  wallType: Exclude<SwarmVillageWallType, null>,
  left: number,
  top: number,
) {
  const isFence = wallType === "wood";
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
}

function getCell(
  board: SwarmVillageBoardCell[],
  row: number,
  col: number,
  gridCols: number,
) {
  return board[row * gridCols + col] ?? normalizeSwarmVillageBoardCell(null);
}

function isSoilCropReady(
  cell: SwarmVillageBoardCell,
  swarmCompletionCount: number,
) {
  return (
    cell.foundation === "soil" &&
    cell.soilStartSwarmCompletionCount !== null &&
    swarmCompletionCount - cell.soilStartSwarmCompletionCount >= SOIL_SWARM_TARGET
  );
}

function getWallMaxHp(wallType: SwarmVillageWallType) {
  if (wallType === "wood") return WOOD_FENCE_MAX_HP;
  if (wallType === "stone") return STONE_WALL_MAX_HP;
  return 0;
}

function getNormalizedUnitMaxHp(
  unit: SwarmVillageUnit,
  unitLevel: number,
  rawUnitMaxHp: unknown,
) {
  if (!isDamageableUnit(unit)) {
    return 0;
  }

  const max = getUnitMaxHp(unit, unitLevel || 1);
  const raw = readFiniteNumber(rawUnitMaxHp);

  return raw && raw > 0 ? raw : max;
}

function getNormalizedUnitHp(
  unit: SwarmVillageUnit,
  unitMaxHp: number,
  rawUnitHp: unknown,
) {
  if (!isDamageableUnit(unit)) {
    return 0;
  }

  const raw = readFiniteNumber(rawUnitHp);

  return raw && raw > 0 ? Math.min(raw, unitMaxHp) : unitMaxHp;
}

function getUnitMaxHp(
  unit: Exclude<SwarmVillageUnit, "capybara_statue" | null>,
  level = 1,
) {
  if (unit === "house") return HOUSE_MAX_HP;
  if (unit === "windmill") return WOOD_FENCE_MAX_HP;
  if (unit === "chest") return CHEST_MAX_HP;
  if (unit === "prizes") return STONE_WALL_MAX_HP;

  return getCombatUnitMaxHpForLevel(unit, level);
}

function getCombatUnitMaxHpForLevel(
  unit: "boxer" | "tennis" | "quarterback",
  level = 1,
) {
  const baseHp =
    unit === "boxer" ? 135 : unit === "tennis" ? 115 : QUARTERBACK_MAX_HP;

  return Math.round(
    baseHp * getTreeLevelMultiplier(level, TREE_UPGRADE_HEALTH_MULTIPLIER),
  );
}

function getPrizesAsset(level: number) {
  const normalizedLevel = normalizePrizesLevel(level);

  if (normalizedLevel >= PRIZES_UPGRADE_LEVEL) {
    return VENDING_GOLD_ASSET;
  }

  return normalizedLevel >= 2 ? VENDING_BLUE_ASSET : UNIT_ASSETS.prizes;
}

function getTreeLevel(cell: Pick<SwarmVillageBoardCell, "unit" | "unitLevel">) {
  return isUpgradeableTreeUnit(cell.unit) ? normalizeTreeLevel(cell.unitLevel) : 0;
}

function getTreeSpriteScale(level: number) {
  return getTreeLevelMultiplier(level, TREE_UPGRADE_HEALTH_MULTIPLIER);
}

function getTreeLevelMultiplier(level: number, perUpgradeMultiplier: number) {
  return Math.pow(perUpgradeMultiplier, Math.max(0, normalizeTreeLevel(level) - 1));
}

function normalizeFoundation(value: unknown): SwarmVillageFoundation {
  if (
    value === "grass" ||
    value === "grass_path_a" ||
    value === "grass_path_b" ||
    value === "grass_path_c" ||
    value === "grass_path_d" ||
    value === "grass_path_e" ||
    value === "grass_path_f" ||
    value === "grass_path_g" ||
    value === "grass_path_h" ||
    value === "grass_path_i" ||
    value === "grass_path_j" ||
    value === "soil" ||
    value === false
  ) {
    return value;
  }

  return "grass";
}

function normalizeWallType(value: unknown): SwarmVillageWallType {
  if (value === "wood" || value === "stone") {
    return value;
  }

  return null;
}

function normalizeUnit(value: unknown): SwarmVillageUnit {
  if (
    value === "boxer" ||
    value === "tennis" ||
    value === "quarterback" ||
    value === "house" ||
    value === "windmill" ||
    value === "capybara_statue" ||
    value === "prizes" ||
    value === "chest"
  ) {
    return value;
  }

  if (value === "vending" || value === "prize_machine") {
    return "prizes";
  }

  return null;
}

function normalizeRotation(value: unknown): SwarmVillageRotation {
  return clampInt(value, 0, 3) as SwarmVillageRotation;
}

function normalizeTreeLevel(value: unknown) {
  return clampInt(value, 1, TREE_UPGRADE_MAX_LEVEL);
}

function normalizePrizesLevel(value: unknown) {
  return clampInt(value, 1, PRIZES_UPGRADE_LEVEL);
}

function isDamageableUnit(
  unit: SwarmVillageUnit,
): unit is Exclude<SwarmVillageUnit, "capybara_statue" | null> {
  return (
    unit === "boxer" ||
    unit === "tennis" ||
    unit === "quarterback" ||
    unit === "house" ||
    unit === "windmill" ||
    unit === "prizes" ||
    unit === "chest"
  );
}

function isUpgradeableTreeUnit(unit: SwarmVillageUnit) {
  return unit === "boxer" || unit === "tennis" || unit === "quarterback";
}

function readFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNonNegativeInt(value: unknown) {
  const number = readFiniteNumber(value);

  return number === null ? null : Math.max(0, Math.floor(number));
}

function clampInt(value: unknown, min: number, max: number) {
  const number = readFiniteNumber(value);

  if (number === null) {
    return min;
  }

  return clamp(Math.floor(number), min, max);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
