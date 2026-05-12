import {
  GRASS_TILE_IMAGE,
  GRASS_TILE_PATH_A_IMAGE,
  GRASS_TILE_PATH_B_IMAGE,
  GRASS_TILE_PATH_C_IMAGE,
  GRASS_TILE_PATH_D_IMAGE,
  GRASS_TILE_PATH_E_IMAGE,
  GRASS_TILE_PATH_F_IMAGE,
  GRASS_TILE_PATH_G_IMAGE,
  GRASS_TILE_PATH_H_IMAGE,
  GRASS_TILE_PATH_I_IMAGE,
  GRASS_TILE_PATH_J_IMAGE,
  SOIL_TILE_IMAGE,
} from '@/components/play/swarmVillage/model/assets';
import type {
  Foundation,
  GrassFoundation,
  PathTravelDirection,
  Tool,
} from '@/components/play/swarmVillage/model/types';

export const PATH_TRAVEL_DELTAS: Record<PathTravelDirection, { row: number; col: number }> = {
  'row-1': { row: -1, col: 0 },
  'row+1': { row: 1, col: 0 },
  'col-1': { row: 0, col: -1 },
  'col+1': { row: 0, col: 1 },
};

export const PATH_TRAVEL_OPPOSITE: Record<PathTravelDirection, PathTravelDirection> = {
  'row-1': 'row+1',
  'row+1': 'row-1',
  'col-1': 'col+1',
  'col+1': 'col-1',
};

export const PATH_TILE_CONNECTIONS: Record<Exclude<GrassFoundation, 'grass'>, PathTravelDirection[]> = {
  grass_path_a: ['col-1', 'col+1'],
  grass_path_b: ['row-1', 'row+1'],
  grass_path_c: ['row+1', 'col+1'],
  grass_path_d: ['row-1', 'row+1', 'col-1', 'col+1'],
  grass_path_e: ['row-1', 'row+1', 'col+1'],
  grass_path_f: ['row-1', 'row+1', 'col-1'],
  grass_path_g: ['row+1', 'col-1'],
  grass_path_h: ['row-1', 'col+1'],
  grass_path_i: ['row-1', 'col-1'],
  grass_path_j: ['row-1', 'col-1', 'col+1'],
};

export const isGrassFoundation = (foundation: Foundation): foundation is GrassFoundation =>
  foundation === 'grass' ||
  foundation === 'grass_path_a' ||
  foundation === 'grass_path_b' ||
  foundation === 'grass_path_c' ||
  foundation === 'grass_path_d' ||
  foundation === 'grass_path_e' ||
  foundation === 'grass_path_f' ||
  foundation === 'grass_path_g' ||
  foundation === 'grass_path_h' ||
  foundation === 'grass_path_i' ||
  foundation === 'grass_path_j';

export const isDecorativePathFoundation = (foundation: Foundation): foundation is Exclude<GrassFoundation, 'grass'> =>
  foundation === 'grass_path_a' ||
  foundation === 'grass_path_b' ||
  foundation === 'grass_path_c' ||
  foundation === 'grass_path_d' ||
  foundation === 'grass_path_e' ||
  foundation === 'grass_path_f' ||
  foundation === 'grass_path_g' ||
  foundation === 'grass_path_h' ||
  foundation === 'grass_path_i' ||
  foundation === 'grass_path_j';

export const getPathTileConnections = (foundation: Foundation): PathTravelDirection[] =>
  isDecorativePathFoundation(foundation) ? PATH_TILE_CONNECTIONS[foundation] : [];

export const getIsoHorizontalFacingScaleX = (
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  fallback: 1 | -1 = 1,
): 1 | -1 => {
  const fromIsoX = fromCol - fromRow;
  const toIsoX = toCol - toRow;
  if (toIsoX < fromIsoX) return 1;
  if (toIsoX > fromIsoX) return -1;
  return fallback;
};

export const isFoundationTool = (tool: Tool): tool is GrassFoundation | 'soil' =>
  tool === 'grass' ||
  tool === 'grass_path_a' ||
  tool === 'grass_path_b' ||
  tool === 'grass_path_c' ||
  tool === 'grass_path_d' ||
  tool === 'grass_path_e' ||
  tool === 'grass_path_f' ||
  tool === 'grass_path_g' ||
  tool === 'grass_path_h' ||
  tool === 'grass_path_i' ||
  tool === 'grass_path_j' ||
  tool === 'soil';

export const getFoundationImage = (foundation: Exclude<Foundation, false>): number => {
  if (foundation === 'soil') return SOIL_TILE_IMAGE;
  if (foundation === 'grass_path_a') return GRASS_TILE_PATH_A_IMAGE;
  if (foundation === 'grass_path_b') return GRASS_TILE_PATH_B_IMAGE;
  if (foundation === 'grass_path_c') return GRASS_TILE_PATH_C_IMAGE;
  if (foundation === 'grass_path_d') return GRASS_TILE_PATH_D_IMAGE;
  if (foundation === 'grass_path_e') return GRASS_TILE_PATH_E_IMAGE;
  if (foundation === 'grass_path_f') return GRASS_TILE_PATH_F_IMAGE;
  if (foundation === 'grass_path_g') return GRASS_TILE_PATH_G_IMAGE;
  if (foundation === 'grass_path_h') return GRASS_TILE_PATH_H_IMAGE;
  if (foundation === 'grass_path_i') return GRASS_TILE_PATH_I_IMAGE;
  if (foundation === 'grass_path_j') return GRASS_TILE_PATH_J_IMAGE;
  return GRASS_TILE_IMAGE;
};

export const getFoundationLabel = (foundation: Exclude<Foundation, false>) => {
  if (foundation === 'soil') return 'Soil';
  if (foundation === 'grass_path_a') return 'Path A';
  if (foundation === 'grass_path_b') return 'Path B';
  if (foundation === 'grass_path_c') return 'Path C';
  if (foundation === 'grass_path_d') return 'Path D';
  if (foundation === 'grass_path_e') return 'Path E';
  if (foundation === 'grass_path_f') return 'Path F';
  if (foundation === 'grass_path_g') return 'Path G';
  if (foundation === 'grass_path_h') return 'Path H';
  if (foundation === 'grass_path_i') return 'Path I';
  if (foundation === 'grass_path_j') return 'Path J';
  return 'Grass';
};

