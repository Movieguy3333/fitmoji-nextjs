import { getCell } from '@/components/play/swarmVillage/domain/board';
import { getFoundationImage } from '@/components/play/swarmVillage/domain/foundations';
import {
  isChestRewardReady,
  isSoilCropReady,
  isWindmillRewardReady,
} from '@/components/play/swarmVillage/domain/rewards';
import {
  getCapybaraSpritePosition,
  getChestSpritePosition,
  getHouseSpritePosition,
  getWallSpritePosition,
  getWindmillSpritePosition,
} from '@/components/play/swarmVillage/domain/sprites';
import {
  getFullHealthHomeCount,
  getTreeLevel,
  getTreeSpriteScale,
  getWallImage,
  getWallMaxHp,
} from '@/components/play/swarmVillage/domain/units';
import {
  BOXER_FRAMES,
  CAPYBARA_STATUE_IMAGE,
  CHEST_IMAGE,
  QUARTERBACK_IMAGE,
  TENNIS_FRAMES,
  TINY_HOUSE_IMAGE,
  WHEAT_IMAGE,
  WINDMILL_IMAGE,
} from '@/components/play/swarmVillage/model/assets';
import {
  CAPYBARA_STATUE_SPRITE_H,
  CAPYBARA_STATUE_SPRITE_W,
  CASTLE_CELL_22_SORT_BUMP,
  CASTLE_COL_MIN,
  CASTLE_FOOTPRINT_GROUND_SORT_OFFSET,
  CASTLE_ROW_MAX,
  CHEST_SPRITE_H,
  CHEST_SPRITE_W,
  GRID_ROWS,
  HOUSE_SPRITE_H,
  HOUSE_SPRITE_W,
  isCastleCell,
  TILE_WIDTH,
  WINDMILL_SPRITE_H,
  WINDMILL_SPRITE_W,
} from '@/components/play/swarmVillage/model/constants';
import type { BoardCell, UnitType, WallType } from '@/components/play/swarmVillage/model/types';

type IsoPositionFn = (row: number, col: number, elevation?: number) => {
  left: number;
  top: number;
};

export type PlacedSprite = {
  id: string;
  left: number;
  top: number;
  source: number;
  width: number;
  height: number;
  sortOrder: number;
  row: number;
  col: number;
  cropReady?: boolean;
  rewardReady?: boolean;
  unit?: UnitType;
  unitHp?: number;
  unitMaxHp?: number;
  unitLevel?: number;
  unitLastAttackAt?: number;
  unitFacingScaleX?: 1 | -1;
  unitRotation?: 0 | 1 | 2 | 3;
  wallHp?: number;
  wallType?: Exclude<WallType, null>;
};

type BuildPlacedSpritesOptions = {
  board: BoardCell[];
  gridCols: number;
  isoPosition: IsoPositionFn;
  isSoilConnectedToHarvestPath: (
    board: BoardCell[],
    row: number,
    col: number,
    gridCols: number,
  ) => boolean;
  swarmCompletionCount: number;
};

export function buildPlacedSprites({
  board,
  gridCols,
  isoPosition,
  isSoilConnectedToHarvestPath,
  swarmCompletionCount,
}: BuildPlacedSpritesOptions): PlacedSprite[] {
  const fullHealthHomeCount = getFullHealthHomeCount(board);
  const out: PlacedSprite[] = [];

  for (let r = 0; r < GRID_ROWS; r += 1) {
    for (let c = 0; c < gridCols; c += 1) {
      const cell = getCell(board, r, c, gridCols);
      if (!cell.foundation) continue;

      const base = isoPosition(r, c);
      const depth = (r + c) * 10;
      const castleCell22SortBump = r === CASTLE_ROW_MAX && c === CASTLE_COL_MIN
        ? CASTLE_CELL_22_SORT_BUMP
        : 0;
      const foundationSortOrder = isCastleCell(r, c)
        ? depth + CASTLE_FOOTPRINT_GROUND_SORT_OFFSET + castleCell22SortBump
        : depth;

      out.push({
        id: `g-${r}-${c}`,
        left: base.left + 2,
        top: base.top - 2,
        source: getFoundationImage(cell.foundation),
        width: TILE_WIDTH - 4,
        height: 48,
        sortOrder: foundationSortOrder,
        row: r,
        col: c,
      });

      if (cell.foundation === 'soil' && isSoilCropReady(cell, swarmCompletionCount)) {
        const soilConnected = isSoilConnectedToHarvestPath(board, r, c, gridCols);
        out.push({
          id: `crop-${r}-${c}`,
          left: base.left + 12,
          top: base.top - 12,
          source: WHEAT_IMAGE,
          width: 48,
          height: 42,
          sortOrder: depth + 0.6,
          row: r,
          col: c,
          cropReady: soilConnected,
        });
      }

      for (let lv = 1; lv <= cell.wallHeight; lv += 1) {
        const el = isoPosition(r, c, lv);
        const wallType = cell.wallType ?? 'stone';
        const wallSprite = getWallSpritePosition(wallType, el.left, el.top);
        out.push({
          id: `w-${r}-${c}-${lv}`,
          left: wallSprite.left,
          top: wallSprite.top,
          source: getWallImage(wallType),
          width: wallSprite.width,
          height: wallSprite.height,
          sortOrder: depth + lv,
          row: r,
          col: c,
          wallHp: lv === cell.wallHeight ? cell.wallHp : getWallMaxHp(wallType),
          wallType,
        });
      }

      if (!cell.unit) continue;

      const el = isoPosition(r, c, cell.wallHeight + 1);
      if (cell.unit === 'house') {
        const housePos = getHouseSpritePosition(el.left, el.top);
        out.push({
          id: `u-${r}-${c}`,
          left: housePos.left,
          top: housePos.top,
          source: TINY_HOUSE_IMAGE,
          width: HOUSE_SPRITE_W,
          height: HOUSE_SPRITE_H,
          sortOrder: depth + cell.wallHeight + 2,
          unit: cell.unit,
          unitHp: cell.unitHp,
          unitMaxHp: cell.unitMaxHp,
          unitRotation: cell.unitRotation,
          row: r,
          col: c,
        });
      } else if (cell.unit === 'chest') {
        const chestPos = getChestSpritePosition(el.left, el.top);
        out.push({
          id: `u-${r}-${c}`,
          left: chestPos.left,
          top: chestPos.top,
          source: CHEST_IMAGE,
          width: CHEST_SPRITE_W,
          height: CHEST_SPRITE_H,
          sortOrder: depth + cell.wallHeight + 2,
          unit: cell.unit,
          unitHp: cell.unitHp,
          unitMaxHp: cell.unitMaxHp,
          row: r,
          col: c,
          rewardReady: isChestRewardReady(cell, swarmCompletionCount, fullHealthHomeCount),
        });
      } else if (cell.unit === 'capybara_statue') {
        const capybaraPos = getCapybaraSpritePosition(el.left, el.top);
        out.push({
          id: `u-${r}-${c}`,
          left: capybaraPos.left,
          top: capybaraPos.top,
          source: CAPYBARA_STATUE_IMAGE,
          width: CAPYBARA_STATUE_SPRITE_W,
          height: CAPYBARA_STATUE_SPRITE_H,
          sortOrder: depth + cell.wallHeight + 2,
          unit: cell.unit,
          unitRotation: cell.unitRotation,
          row: r,
          col: c,
        });
      } else if (cell.unit === 'windmill') {
        const windmillPos = getWindmillSpritePosition(el.left, el.top);
        out.push({
          id: `u-${r}-${c}`,
          left: windmillPos.left + 2,
          top: windmillPos.top + 5,
          source: WINDMILL_IMAGE,
          width: WINDMILL_SPRITE_W,
          height: WINDMILL_SPRITE_H,
          sortOrder: depth + cell.wallHeight + 2,
          unit: cell.unit,
          unitHp: cell.unitHp,
          unitMaxHp: cell.unitMaxHp,
          row: r,
          col: c,
          rewardReady: isWindmillRewardReady(cell, swarmCompletionCount),
        });
      } else {
        const baseSpriteSize = cell.unit === 'quarterback' ? 60 : 56;
        const spriteScale = getTreeSpriteScale(getTreeLevel(cell));
        const spriteSize = Math.round(baseSpriteSize * spriteScale);
        out.push({
          id: `u-${r}-${c}`,
          left: el.left + 9 - (spriteSize - baseSpriteSize) / 2,
          top: el.top - 2 - (spriteSize - baseSpriteSize),
          source: cell.unit === 'boxer'
            ? BOXER_FRAMES[0]
            : cell.unit === 'tennis'
              ? TENNIS_FRAMES[0]
              : QUARTERBACK_IMAGE,
          width: spriteSize,
          height: spriteSize,
          sortOrder: depth + cell.wallHeight + 2,
          unit: cell.unit,
          unitHp: cell.unitHp,
          unitMaxHp: cell.unitMaxHp,
          unitLevel: getTreeLevel(cell),
          unitLastAttackAt: cell.unitLastAttackAt,
          unitFacingScaleX: cell.unitFacingScaleX,
          row: r,
          col: c,
        });
      }
    }
  }

  return out.sort((a, b) => a.sortOrder - b.sortOrder);
}
