import {
  DEFAULT_GRID_COLS,
  GRID_ROWS,
  isHomeReservedCell,
  NORMAL_IJOM_WALL_DAMAGE,
} from '@/components/play/swarmVillage/model/constants';
import type {
  BoardCell,
  Foundation,
  VillageDraftSnapshot,
  WallType,
} from '@/components/play/swarmVillage/model/types';

import {
  getUnitMaxHp,
  getWallMaxHp,
  isDamageableUnit,
  isUpgradeableTreeUnit,
  normalizeTreeLevel,
} from './units';

export const createGrassCell = (): BoardCell => ({
  foundation: 'grass',
  wallHeight: 0,
  wallHp: 0,
  wallType: null,
  wallRotation: 0,
  soilPlacedAt: null,
  soilStartSwarmCompletionCount: null,
  unit: null,
  unitHp: 0,
  unitMaxHp: 0,
  unitLevel: 0,
  unitLastAttackAt: 0,
  unitFacingScaleX: 1,
  unitRotation: 0,
  unitRewardBaselineCompletionCount: null,
});

export const normalizeBoardCell = (raw: Record<string, unknown>): BoardCell => {
  const rawFoundation = raw.foundation;
  const foundation: Foundation =
    rawFoundation === 'grass' ||
      rawFoundation === 'grass_path_a' ||
      rawFoundation === 'grass_path_b' ||
      rawFoundation === 'grass_path_c' ||
      rawFoundation === 'grass_path_d' ||
      rawFoundation === 'grass_path_e' ||
      rawFoundation === 'grass_path_f' ||
      rawFoundation === 'grass_path_g' ||
      rawFoundation === 'grass_path_h' ||
      rawFoundation === 'grass_path_i' ||
      rawFoundation === 'grass_path_j' ||
      rawFoundation === 'soil' ||
      rawFoundation === false
      ? rawFoundation
      : 'grass';
  const wallHeight = typeof raw.wallHeight === 'number' ? raw.wallHeight : 0;
  const wallTypeRaw = raw.wallType;
  const wallType: WallType =
    wallHeight <= 0
      ? null
      : wallTypeRaw === 'wood' || wallTypeRaw === 'stone'
        ? wallTypeRaw
        : 'stone';
  const wallMaxHp = getWallMaxHp(wallType);
  const wallHp = typeof raw.wallHp === 'number' ? raw.wallHp : (wallHeight > 0 ? wallMaxHp : 0);
  const wallRotation = (typeof raw.wallRotation === 'number' ? raw.wallRotation : 0) as BoardCell['wallRotation'];
  const soilPlacedAt =
    foundation === 'soil' && typeof raw.soilPlacedAt === 'number' && Number.isFinite(raw.soilPlacedAt)
      ? raw.soilPlacedAt
      : null;
  const soilStartSwarmCompletionCount =
    foundation === 'soil' && typeof raw.soilStartSwarmCompletionCount === 'number' && Number.isFinite(raw.soilStartSwarmCompletionCount)
      ? Math.max(0, Math.floor(raw.soilStartSwarmCompletionCount))
      : null;
  const unit = (raw.unit as BoardCell['unit']) ?? null;
  const unitLastAttackAt = typeof raw.unitLastAttackAt === 'number' ? raw.unitLastAttackAt : 0;
  const unitLevel = isUpgradeableTreeUnit(unit) ? normalizeTreeLevel(raw.unitLevel) : 0;
  const unitFacingScaleX = (raw.unitFacingScaleX === -1 ? -1 : 1) as BoardCell['unitFacingScaleX'];
  const unitRotation = (typeof raw.unitRotation === 'number' ? raw.unitRotation : 0) as BoardCell['unitRotation'];
  const unitRewardBaselineCompletionCount =
    (unit === 'windmill' || unit === 'chest') && typeof raw.unitRewardBaselineCompletionCount === 'number' && Number.isFinite(raw.unitRewardBaselineCompletionCount)
      ? Math.max(0, Math.floor(raw.unitRewardBaselineCompletionCount))
      : null;
  let unitHp = typeof raw.unitHp === 'number' ? raw.unitHp : 0;
  let unitMaxHp = typeof raw.unitMaxHp === 'number' ? raw.unitMaxHp : 0;
  if (isDamageableUnit(unit)) {
    const max = getUnitMaxHp(unit, unitLevel || 1);
    unitMaxHp = unitMaxHp > 0 ? unitMaxHp : max;
    unitHp = unitHp > 0 ? Math.min(unitHp, unitMaxHp) : unitMaxHp;
  } else { unitHp = 0; unitMaxHp = 0; }
  return {
    foundation,
    wallHeight,
    wallHp: wallHeight > 0 ? Math.min(Math.max(NORMAL_IJOM_WALL_DAMAGE, wallHp), wallMaxHp || wallHp) : 0,
    wallType,
    wallRotation,
    soilPlacedAt,
    soilStartSwarmCompletionCount,
    unit,
    unitHp,
    unitMaxHp,
    unitLevel,
    unitLastAttackAt,
    unitFacingScaleX,
    unitRotation,
    unitRewardBaselineCompletionCount,
  };
};

export const createBoard = (gridCols = DEFAULT_GRID_COLS): BoardCell[] =>
  Array.from({ length: GRID_ROWS * gridCols }, createGrassCell);

export const cloneBoardCells = (cells: BoardCell[]): BoardCell[] => cells.map((cell) => ({ ...cell }));

export const generateBoardID = () => Math.random().toString(36).substring(2, 10).toUpperCase();

export const createDraftSnapshot = (
  cells: BoardCell[],
  gridCols: number,
  spentEnergy: number,
  boardID?: string,
): VillageDraftSnapshot => ({
  board: cloneBoardCells(cells),
  gridCols,
  spentEnergy,
  boardID,
});

export const boardIndex = (r: number, c: number, gridCols: number) => r * gridCols + c;

export const getCell = (b: BoardCell[], r: number, c: number, gridCols: number) => b[boardIndex(r, c, gridCols)];

export const isWithinBoard = (row: number, col: number, gridCols: number) =>
  row >= 0 && row < GRID_ROWS && col >= 0 && col < gridCols;

export const inferGridColsFromBoard = (cells: unknown): number => {
  if (!Array.isArray(cells)) return DEFAULT_GRID_COLS;
  const inferred = cells.length / GRID_ROWS;
  if (!Number.isInteger(inferred) || inferred < DEFAULT_GRID_COLS) return DEFAULT_GRID_COLS;
  return inferred;
};

export const appendColumns = (cells: BoardCell[], currentGridCols: number, columnsToAdd: number) => {
  if (columnsToAdd <= 0) return cells;
  const nextBoard: BoardCell[] = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    const start = row * currentGridCols;
    nextBoard.push(...cloneBoardCells(cells.slice(start, start + currentGridCols)));
    for (let added = 0; added < columnsToAdd; added += 1) nextBoard.push(createGrassCell());
  }
  return nextBoard;
};

export const sanitizeCastleFootprint = (cells: BoardCell[], gridCols: number): BoardCell[] => {
  const n = [...cells];
  for (let r = 0; r < GRID_ROWS; r += 1) {
    for (let c = 0; c < gridCols; c += 1) {
      if (!isHomeReservedCell(r, c)) continue;
      const i = boardIndex(r, c, gridCols);
      n[i] = {
        ...n[i],
        ...createGrassCell(),
      };
    }
  }
  return n;
};

