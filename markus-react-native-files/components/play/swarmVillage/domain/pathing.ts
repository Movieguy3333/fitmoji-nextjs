import {
  CASTLE_ROW_MAX,
  CASTLE_TARGET_COL,
  GRID_ROWS,
  isHomeReservedCell,
} from '@/components/play/swarmVillage/model/constants';
import type { BoardCell, PathTravelDirection } from '@/components/play/swarmVillage/model/types';

import { boardIndex, cloneBoardCells, createGrassCell, getCell, isWithinBoard } from './board';
import {
  getPathTileConnections,
  isDecorativePathFoundation,
  PATH_TRAVEL_DELTAS,
  PATH_TRAVEL_OPPOSITE,
} from './foundations';
import { keyForCell } from './utils';

export const isWalkableVillagePathCell = (board: BoardCell[], row: number, col: number, gridCols: number) => {
  if (!isWithinBoard(row, col, gridCols)) return false;
  if (isHomeReservedCell(row, col)) return false;
  const cell = getCell(board, row, col, gridCols);
  return isDecorativePathFoundation(cell.foundation) && cell.wallHeight <= 0 && !cell.unit;
};

export const getConnectedVillagePathNeighbors = (
  board: BoardCell[],
  row: number,
  col: number,
  gridCols: number,
) => {
  const cell = getCell(board, row, col, gridCols);
  return getPathTileConnections(cell.foundation).flatMap((direction) => {
    const delta = PATH_TRAVEL_DELTAS[direction];
    const nextRow = row + delta.row;
    const nextCol = col + delta.col;
    if (!isWalkableVillagePathCell(board, nextRow, nextCol, gridCols)) return [];
    const nextCell = getCell(board, nextRow, nextCol, gridCols);
    if (!getPathTileConnections(nextCell.foundation).includes(PATH_TRAVEL_OPPOSITE[direction])) return [];
    return [{ row: nextRow, col: nextCol }];
  });
};

export const getHomeAccessPathCells = (board: BoardCell[], gridCols: number) => {
  const accessCells: Array<{ row: number; col: number }> = [];
  const seen = new Set<string>();

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < gridCols; col += 1) {
      if (!isWalkableVillagePathCell(board, row, col, gridCols)) continue;
      const connectsToHome = getPathTileConnections(getCell(board, row, col, gridCols).foundation).some((direction) => {
        const delta = PATH_TRAVEL_DELTAS[direction];
        return isHomeReservedCell(row + delta.row, col + delta.col);
      });
      if (!connectsToHome) continue;
      const key = keyForCell(row, col);
      if (seen.has(key)) continue;
      seen.add(key);
      accessCells.push({ row, col });
    }
  }

  return accessCells;
};

export const getHomeConnectedPathKeys = (board: BoardCell[], gridCols: number) => {
  const starts = getHomeAccessPathCells(board, gridCols);
  const connected = new Set<string>();
  const queue = [...starts];

  for (const start of starts) connected.add(keyForCell(start.row, start.col));

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of getConnectedVillagePathNeighbors(board, current.row, current.col, gridCols)) {
      const neighborKey = keyForCell(neighbor.row, neighbor.col);
      if (connected.has(neighborKey)) continue;
      connected.add(neighborKey);
      queue.push(neighbor);
    }
  }

  return connected;
};

export const getVillageAvatarPathCandidates = (board: BoardCell[], gridCols: number) => {
  const homeConnectedKeys = getHomeConnectedPathKeys(board, gridCols);
  const candidates: Array<{ row: number; col: number; neighbors: Array<{ row: number; col: number }> }> = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < gridCols; col += 1) {
      if (!isWalkableVillagePathCell(board, row, col, gridCols)) continue;
      const key = keyForCell(row, col);
      if (!homeConnectedKeys.has(key)) continue;
      const neighbors = getConnectedVillagePathNeighbors(board, row, col, gridCols).filter((neighbor) =>
        homeConnectedKeys.has(keyForCell(neighbor.row, neighbor.col)),
      );
      if (neighbors.length === 0) continue;
      candidates.push({ row, col, neighbors });
    }
  }
  return candidates;
};

export const findVillagePathRoute = (
  board: BoardCell[],
  gridCols: number,
  start: { row: number; col: number },
  end: { row: number; col: number },
) => {
  const startKey = keyForCell(start.row, start.col);
  const endKey = keyForCell(end.row, end.col);
  if (startKey === endKey) return [start];

  const queue = [startKey];
  const visited = new Set([startKey]);
  const parentByKey = new Map<string, string | null>([[startKey, null]]);

  while (queue.length > 0) {
    const currentKey = queue.shift()!;
    if (currentKey === endKey) break;
    const [currentRow, currentCol] = currentKey.split(':').map(Number);
    for (const neighbor of getConnectedVillagePathNeighbors(board, currentRow, currentCol, gridCols)) {
      const neighborKey = keyForCell(neighbor.row, neighbor.col);
      if (visited.has(neighborKey)) continue;
      visited.add(neighborKey);
      parentByKey.set(neighborKey, currentKey);
      queue.push(neighborKey);
    }
  }

  if (!parentByKey.has(endKey)) return null;
  const route: Array<{ row: number; col: number }> = [];
  let cursor: string | null = endKey;
  while (cursor) {
    const [row, col] = cursor.split(':').map(Number);
    route.unshift({ row, col });
    cursor = parentByKey.get(cursor) ?? null;
  }
  return route;
};

export const getSoilHarvestPathTargets = (board: BoardCell[], row: number, col: number, gridCols: number) =>
  (Object.entries(PATH_TRAVEL_DELTAS) as Array<[PathTravelDirection, { row: number; col: number }]>).flatMap(
    ([directionToSoil, delta]) => {
      const pathRow = row - delta.row;
      const pathCol = col - delta.col;
      if (!isWalkableVillagePathCell(board, pathRow, pathCol, gridCols)) return [];
      const pathCell = getCell(board, pathRow, pathCol, gridCols);
      if (!getPathTileConnections(pathCell.foundation).includes(directionToSoil)) return [];
      return [{ row: pathRow, col: pathCol }];
    },
  );

export const getSoilHarvestRoute = (board: BoardCell[], row: number, col: number, gridCols: number) => {
  if (!isWithinBoard(row, col, gridCols)) return null;
  const soilCell = getCell(board, row, col, gridCols);
  if (soilCell.foundation !== 'soil' || soilCell.wallHeight > 0 || soilCell.unit) return null;

  const targets = getSoilHarvestPathTargets(board, row, col, gridCols);
  if (targets.length === 0) return null;

  const starts = getHomeAccessPathCells(board, gridCols).sort(
    (a, b) =>
      Math.hypot(a.row - (CASTLE_ROW_MAX + 1), a.col - CASTLE_TARGET_COL) -
      Math.hypot(b.row - (CASTLE_ROW_MAX + 1), b.col - CASTLE_TARGET_COL),
  );

  let bestRoute: Array<{ row: number; col: number }> | null = null;
  for (const start of starts) {
    for (const target of targets) {
      const route = findVillagePathRoute(board, gridCols, start, target);
      if (!route) continue;
      if (!bestRoute || route.length < bestRoute.length) bestRoute = route;
    }
  }
  return bestRoute;
};

export const getSoilHarvestRouteFromPathCell = (
  board: BoardCell[],
  row: number,
  col: number,
  gridCols: number,
  start: { row: number; col: number },
) => {
  if (!isWithinBoard(start.row, start.col, gridCols)) return null;
  if (!isWalkableVillagePathCell(board, start.row, start.col, gridCols)) return null;
  if (!getHomeConnectedPathKeys(board, gridCols).has(keyForCell(start.row, start.col))) return null;
  const targets = getSoilHarvestPathTargets(board, row, col, gridCols);
  let bestRoute: Array<{ row: number; col: number }> | null = null;

  for (const target of targets) {
    const route = findVillagePathRoute(board, gridCols, start, target);
    if (!route) continue;
    if (!bestRoute || route.length < bestRoute.length) bestRoute = route;
  }
  return bestRoute;
};

export const isSoilConnectedToHarvestPath = (board: BoardCell[], row: number, col: number, gridCols: number) =>
  getSoilHarvestRoute(board, row, col, gridCols) !== null;

export const sanitizePathCell = (cells: BoardCell[], row: number, col: number, gridCols: number) => {
  const next = cloneBoardCells(cells);
  next[boardIndex(row, col, gridCols)] = createGrassCell();
  return next;
};

