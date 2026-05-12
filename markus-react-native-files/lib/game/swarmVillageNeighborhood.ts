import * as FileSystem from 'expo-file-system/legacy';

export type NeighborhoodMapProvider = 'apple' | 'google';

export type NeighborhoodSeedFoundation =
  | 'grass'
  | 'grass_path_a'
  | 'grass_path_b'
  | 'grass_path_c'
  | 'grass_path_d'
  | 'grass_path_e'
  | 'grass_path_f'
  | 'grass_path_g'
  | 'grass_path_h'
  | 'grass_path_i'
  | 'grass_path_j';

export type NeighborhoodPoiKind =
  | 'home'
  | 'neighbor_house'
  | 'park'
  | 'school'
  | 'library'
  | 'corner_store';

export type NeighborhoodSeedAddress = {
  city?: string | null;
  country?: string | null;
  district?: string | null;
  name?: string | null;
  postalCode?: string | null;
  region?: string | null;
  street?: string | null;
  streetNumber?: string | null;
  subregion?: string | null;
};

export type NeighborhoodSeedCell = {
  col: number;
  foundation: NeighborhoodSeedFoundation;
  row: number;
};

type NeighborhoodGridPoint = {
  col: number;
  row: number;
};

type NeighborhoodHousePlacement = NeighborhoodGridPoint & {
  flipHorizontal?: boolean;
};

export type NeighborhoodPointOfInterest = {
  col: number;
  flipHorizontal?: boolean;
  id: string;
  inInitialBounds: boolean;
  kind: NeighborhoodPoiKind;
  label: string;
  row: number;
  source: 'gps_seeded' | 'reverse_geocode' | 'osm_building' | 'preset';
};

export type NeighborhoodPresetDefinition = {
  description: string;
  id: string;
  initialGridCols?: number;
  labels?: Partial<Record<Exclude<NeighborhoodPoiKind, 'home' | 'neighbor_house'>, string>>;
  layout: string[];
  plannedGridCols?: number;
  subtitle: string;
  title: string;
};

export type NeighborhoodSeedTemplate = {
  foundations: NeighborhoodSeedCell[];
  generatedAt: string;
  homeFootprint: {
    anchorLabel: string;
    colMax: number;
    colMin: number;
    rowMax: number;
    rowMin: number;
  };
  initialGridCols: number;
  notablePlaces: NeighborhoodPointOfInterest[];
  plannedGridCols: number;
  plannedRoadCols: number[];
  plannedRoadRows: number[];
  rows: number;
  source: {
    accuracyMeters: number | null;
    city: string | null;
    country: string | null;
    district: string | null;
    latitude: number;
    longitude: number;
    neighborhoodLabel: string;
    previewUrls: {
      apple: string;
      google: string;
    };
    preferredMapProvider: NeighborhoodMapProvider;
    region: string | null;
    seedKey: string;
    streetLabel: string | null;
  };
  version: 1;
};

type BuildNeighborhoodSeedParams = {
  accuracyMeters?: number | null;
  address?: NeighborhoodSeedAddress | null;
  initialGridCols?: number;
  latitude: number;
  longitude: number;
  plannedGridCols?: number;
  preferredMapProvider?: NeighborhoodMapProvider;
  projectedHouseCells?: NeighborhoodGridPoint[];
  projectedRoadCells?: NeighborhoodGridPoint[];
  rows?: number;
};

const DEFAULT_ROWS = 20;
const DEFAULT_INITIAL_GRID_COLS = 9;
const DEFAULT_PLANNED_GRID_COLS = 15;
const CASTLE_ROW_MIN = 0;
const CASTLE_ROW_MAX = 2;
const CASTLE_TARGET_COL = 4;
const CASTLE_COL_MIN = 3;
const CASTLE_COL_MAX = 5;
const STORAGE_DIR = `${FileSystem.documentDirectory ?? ''}swarm-village/`;
const SETUP_DECISION_KEY_PREFIX = 'fitmoji:village-neighborhood-setup:v1';
export const NEIGHBORHOOD_SELECTION_COMPLETE_VALUE = 'selected';
const LOCAL_ROAD_FETCH_TIMEOUT_MS = 6500;
const LOCAL_ROAD_QUERY_RADIUS_METERS = 240;
const LOCAL_BUILDING_QUERY_RADIUS_METERS = 180;
const LOCAL_ROAD_SAMPLE_STEP_METERS = 8;
const DEFAULT_GRID_METERS_PER_CELL = 18;
const MIN_GRID_METERS_PER_CELL = 12;
const MAX_GRID_METERS_PER_CELL = 24;
const HOME_FRONT_DOOR_ROW = CASTLE_ROW_MAX + 1;
const HOME_FRONT_PATH_ROW = CASTLE_ROW_MAX + 2;
const HOME_ROAD_ANCHOR_ROW = CASTLE_ROW_MAX + 2;
const HOME_ROAD_ANCHOR_COL = CASTLE_TARGET_COL;
const MIN_PROJECTED_ROAD_CELLS = 3;
const LOCAL_ROAD_HIGHWAY_REGEX =
  '^(primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|residential|living_street|service|unclassified|road)$';
const LOCAL_RESIDENTIAL_BUILDING_REGEX =
  '^(house|detached|semidetached_house|residential|terrace)$';
const OVERPASS_API_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
] as const;

type NeighborhoodLocalPoint = {
  x: number;
  y: number;
};

type OverpassElement = {
  center?: {
    lat: number;
    lon: number;
  };
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  tags?: Record<string, string>;
  type: 'node' | 'way';
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const sanitizeFileSegment = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'guest';

const firstNonEmpty = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
};

const titleCase = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const cleanLabelRoot = (value: string | null, fallback: string) => {
  const raw = (value ?? fallback).trim();
  if (!raw) return fallback;
  const withoutCommonSuffix = raw.replace(
    /\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd)\b\.?/gi,
    '',
  );
  const compact = withoutCommonSuffix.replace(/\s+/g, ' ').trim();
  return titleCase(compact || raw);
};

const createSeedKey = (latitude: number, longitude: number, address?: NeighborhoodSeedAddress | null) =>
  [
    latitude.toFixed(5),
    longitude.toFixed(5),
    address?.street?.trim() ?? '',
    address?.district?.trim() ?? '',
    address?.city?.trim() ?? '',
    address?.postalCode?.trim() ?? '',
  ].join('|');

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createRng = (seed: number) => {
  let value = seed || 1;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const uniqueSorted = (values: number[]) =>
  [...new Set(values.map((value) => Math.floor(value)))].sort((left, right) => left - right);

const createAppleMapsUrl = (latitude: number, longitude: number, label: string) =>
  `https://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(label)}`;

const createGoogleMapsUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

const isCastleCell = (row: number, col: number) =>
  row >= CASTLE_ROW_MIN &&
  row <= CASTLE_ROW_MAX &&
  col >= CASTLE_COL_MIN &&
  col <= CASTLE_COL_MAX;

const findNearestGrassCell = (
  preferredRow: number,
  preferredCol: number,
  plannedGridCols: number,
  rows: number,
  roadSet: Set<string>,
) => {
  for (let radius = 0; radius <= 6; radius += 1) {
    for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
      for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {
        const row = clamp(preferredRow + rowOffset, 0, rows - 1);
        const col = clamp(preferredCol + colOffset, 0, plannedGridCols - 1);
        if (roadSet.has(`${row}:${col}`)) continue;
        if (isCastleCell(row, col)) continue;
        return { row, col };
      }
    }
  }

  return {
    row: clamp(preferredRow, 0, rows - 1),
    col: clamp(preferredCol, 0, plannedGridCols - 1),
  };
};

const keyForGridPoint = (row: number, col: number) => `${row}:${col}`;

const parseGridPointKey = (key: string): NeighborhoodGridPoint => {
  const [row, col] = key.split(':').map((value) => Number.parseInt(value, 10));
  return { row, col };
};

const getHomeFrontPathPoints = (rows: number) =>
  [
    { row: HOME_FRONT_DOOR_ROW, col: CASTLE_TARGET_COL },
    { row: Math.min(rows - 1, HOME_FRONT_PATH_ROW), col: CASTLE_TARGET_COL },
  ].filter((point, index, points) => {
    if (point.row < 0 || point.row >= rows || isCastleCell(point.row, point.col)) return false;
    return points.findIndex((candidate) => candidate.row === point.row && candidate.col === point.col) === index;
  });

const ensureHomeFrontDoorPath = (roadSet: Set<string>, rows: number) => {
  for (const point of getHomeFrontPathPoints(rows)) {
    roadSet.add(keyForGridPoint(point.row, point.col));
  }
};

const buildFallbackRoadGrid = (
  rng: () => number,
  initialGridCols: number,
  plannedGridCols: number,
  rows: number,
) => {
  const primaryRow = clamp(
    HOME_ROAD_ANCHOR_ROW + Math.round((rng() - 0.5) * 6),
    CASTLE_ROW_MAX + 2,
    rows - 3,
  );
  const primaryCol = clamp(
    CASTLE_TARGET_COL + Math.round((rng() - 0.5) * 3),
    1,
    Math.max(1, initialGridCols - 1),
  );
  const roadRows = uniqueSorted([
    clamp(primaryRow - 4, CASTLE_ROW_MAX + 2, rows - 4),
    primaryRow,
    clamp(primaryRow + 4, CASTLE_ROW_MAX + 3, rows - 2),
  ]);
  const roadCols = uniqueSorted([
    clamp(primaryCol - 2, 1, Math.max(1, initialGridCols - 1)),
    primaryCol,
    clamp(primaryCol + 2, 1, Math.max(1, initialGridCols - 1)),
    clamp(initialGridCols + 1, initialGridCols, plannedGridCols - 2),
    clamp(plannedGridCols - 2, initialGridCols, plannedGridCols - 1),
  ]);
  const useVerticalSpine = rng() >= 0.35;

  const roadSet = new Set<string>();

  if (useVerticalSpine) {
    for (let row = CASTLE_ROW_MAX + 1; row < rows; row += 1) {
      roadSet.add(keyForGridPoint(row, primaryCol));
    }
  } else {
    for (let col = 0; col < plannedGridCols; col += 1) {
      roadSet.add(keyForGridPoint(primaryRow, col));
    }
  }

  connectHomeBaseToRoadNetwork(roadSet, rows, plannedGridCols, initialGridCols);
  ensureHomeFrontDoorPath(roadSet, rows);

  return { roadRows, roadCols, roadSet };
};

const getOrthogonalNeighborKeys = (row: number, col: number) => [
  keyForGridPoint(row - 1, col),
  keyForGridPoint(row + 1, col),
  keyForGridPoint(row, col - 1),
  keyForGridPoint(row, col + 1),
];

const getRoadNeighborCount = (roadSet: Set<string>, row: number, col: number) =>
  getOrthogonalNeighborKeys(row, col).filter((neighborKey) => roadSet.has(neighborKey)).length;

const hasRoadWithinDistance = (
  roadSet: Set<string>,
  row: number,
  col: number,
  maxDistance: number,
) => {
  for (let rowOffset = -maxDistance; rowOffset <= maxDistance; rowOffset += 1) {
    for (let colOffset = -maxDistance; colOffset <= maxDistance; colOffset += 1) {
      if (Math.abs(rowOffset) + Math.abs(colOffset) > maxDistance) continue;
      if (roadSet.has(keyForGridPoint(row + rowOffset, col + colOffset))) {
        return true;
      }
    }
  }
  return false;
};

const isFarEnoughFromSelectedHouses = (
  selected: NeighborhoodGridPoint[],
  row: number,
  col: number,
) =>
  selected.every(
    (cell) => Math.abs(cell.row - row) + Math.abs(cell.col - col) >= 3,
  );

const findNearestStarterHouseCell = (
  preferredRow: number,
  preferredCol: number,
  initialGridCols: number,
  plannedGridCols: number,
  rows: number,
  roadSet: Set<string>,
  occupiedKeys: Set<string>,
  selected: NeighborhoodGridPoint[],
) => {
  const maxPlayableCol = Math.min(initialGridCols, plannedGridCols) - 1;

  for (let radius = 0; radius <= 3; radius += 1) {
    for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
      for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {
        const row = clamp(preferredRow + rowOffset, 0, rows - 1);
        const col = clamp(preferredCol + colOffset, 0, maxPlayableCol);
        const key = keyForGridPoint(row, col);

        if (roadSet.has(key) || occupiedKeys.has(key) || isCastleCell(row, col)) continue;
        if (!hasRoadWithinDistance(roadSet, row, col, 2)) continue;
        if (Math.abs(row - HOME_FRONT_DOOR_ROW) + Math.abs(col - CASTLE_TARGET_COL) < 4) continue;
        if (!isFarEnoughFromSelectedHouses(selected, row, col)) continue;

        return { row, col };
      }
    }
  }

  return null;
};

const selectStarterHouseAnchors = (
  projectedHouseCells: NeighborhoodGridPoint[] | undefined,
  roadSet: Set<string>,
  initialGridCols: number,
  plannedGridCols: number,
  rows: number,
  occupiedKeys: Set<string>,
) => {
  if (!projectedHouseCells || projectedHouseCells.length === 0) return [];

  const selected: NeighborhoodGridPoint[] = [];

  for (const cell of projectedHouseCells) {
    const anchor = findNearestStarterHouseCell(
      cell.row,
      cell.col,
      initialGridCols,
      plannedGridCols,
      rows,
      roadSet,
      occupiedKeys,
      selected,
    );
    if (!anchor) continue;
    const key = keyForGridPoint(anchor.row, anchor.col);
    selected.push(anchor);
    occupiedKeys.add(key);
  }

  return selected;
};

const pruneRoadSet = (roadSet: Set<string>) => {
  const nextRoadSet = new Set<string>();
  for (const key of roadSet) {
    const { row, col } = parseGridPointKey(key);
    const neighborCount = getRoadNeighborCount(roadSet, row, col);
    if (neighborCount > 0) {
      nextRoadSet.add(key);
    }
  }
  return nextRoadSet;
};

const keepConnectedRoadComponent = (roadSet: Set<string>, startKey: string) => {
  if (!roadSet.has(startKey)) return roadSet;

  const connected = new Set<string>();
  const queue = [startKey];

  while (queue.length > 0) {
    const key = queue.shift()!;
    if (connected.has(key) || !roadSet.has(key)) continue;
    connected.add(key);
    const { row, col } = parseGridPointKey(key);
    for (const neighborKey of getOrthogonalNeighborKeys(row, col)) {
      if (!connected.has(neighborKey) && roadSet.has(neighborKey)) {
        queue.push(neighborKey);
      }
    }
  }

  return connected;
};

const trimDeadEndBranches = (
  roadSet: Set<string>,
  preservedKeys: Set<string>,
  iterations = 2,
) => {
  const nextRoadSet = new Set(roadSet);

  for (let pass = 0; pass < iterations; pass += 1) {
    const keysToRemove: string[] = [];

    for (const key of nextRoadSet) {
      if (preservedKeys.has(key)) continue;
      const { row, col } = parseGridPointKey(key);
      if (getRoadNeighborCount(nextRoadSet, row, col) <= 1) {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length === 0) break;
    for (const key of keysToRemove) {
      nextRoadSet.delete(key);
    }
  }

  return nextRoadSet;
};

const connectHomeBaseToRoadNetwork = (
  roadSet: Set<string>,
  rows: number,
  plannedGridCols: number,
  initialGridCols: number,
) => {
  const start = { row: HOME_FRONT_DOOR_ROW, col: CASTLE_TARGET_COL };
  const roadCells = [...roadSet].map(parseGridPointKey);

  const preferredTarget =
    roadCells
      .filter((cell) => cell.col < initialGridCols)
      .sort(
        (left, right) =>
          Math.abs(left.row - start.row) +
            Math.abs(left.col - start.col) -
            (Math.abs(right.row - start.row) + Math.abs(right.col - start.col)),
      )[0] ??
    roadCells.sort(
      (left, right) =>
        Math.abs(left.row - start.row) +
          Math.abs(left.col - start.col) -
          (Math.abs(right.row - start.row) + Math.abs(right.col - start.col)),
    )[0];

  const target = preferredTarget ?? {
    row: clamp(start.row + 3, start.row, rows - 1),
    col: clamp(start.col, 0, plannedGridCols - 1),
  };

  const rowStep = start.row <= target.row ? 1 : -1;
  for (let row = start.row; row !== target.row + rowStep; row += rowStep) {
    if (!isCastleCell(row, start.col)) {
      roadSet.add(keyForGridPoint(row, start.col));
    }
  }

  const colStep = start.col <= target.col ? 1 : -1;
  for (let col = start.col; col !== target.col + colStep; col += colStep) {
    if (!isCastleCell(target.row, col)) {
      roadSet.add(keyForGridPoint(target.row, col));
    }
  }
};

const pickRepresentativeAxisValues = (
  counts: Map<number, number>,
  desiredCount: number,
  minGap: number,
  fallbackValues: number[],
) => {
  const picked: number[] = [];
  const sorted = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0] - right[0]);

  for (const [value] of sorted) {
    if (picked.some((existing) => Math.abs(existing - value) < minGap)) continue;
    picked.push(value);
    if (picked.length >= desiredCount) break;
  }

  for (const value of fallbackValues) {
    if (picked.some((existing) => Math.abs(existing - value) < minGap)) continue;
    picked.push(value);
    if (picked.length >= desiredCount) break;
  }

  return uniqueSorted(picked);
};

const deriveRepresentativeRoadAxes = (
  roadSet: Set<string>,
  fallbackRows: number[],
  fallbackCols: number[],
) => {
  const rowCounts = new Map<number, number>();
  const colCounts = new Map<number, number>();

  for (const key of roadSet) {
    const { row, col } = parseGridPointKey(key);
    rowCounts.set(row, (rowCounts.get(row) ?? 0) + 1);
    colCounts.set(col, (colCounts.get(col) ?? 0) + 1);
  }

  return {
    roadRows: pickRepresentativeAxisValues(rowCounts, 3, 2, fallbackRows),
    roadCols: pickRepresentativeAxisValues(colCounts, 5, 1, fallbackCols),
  };
};

const getPathFoundationForRoadCell = (
  roadSet: Set<string>,
  row: number,
  col: number,
): NeighborhoodSeedFoundation => {
  const hasNorth = roadSet.has(keyForGridPoint(row - 1, col));
  const hasSouth = roadSet.has(keyForGridPoint(row + 1, col));
  const hasEast = roadSet.has(keyForGridPoint(row, col + 1));
  const hasWest = roadSet.has(keyForGridPoint(row, col - 1));

  if (hasNorth && hasSouth && hasEast && hasWest) return 'grass_path_d';
  if (!hasNorth && hasSouth && hasEast && hasWest) return 'grass_path_e';
  if (hasNorth && hasSouth && hasEast && !hasWest) return 'grass_path_f';
  if (!hasNorth && hasSouth && !hasEast && hasWest) return 'grass_path_g';
  if (!hasNorth && hasSouth && hasEast && !hasWest) return 'grass_path_c';
  if (hasNorth && !hasSouth && !hasEast && hasWest) return 'grass_path_h';
  if (hasNorth && !hasSouth && hasEast && !hasWest) return 'grass_path_i';
  if (hasNorth && !hasSouth && hasEast && hasWest) return 'grass_path_j';
  if ((hasNorth || hasSouth) && (hasEast || hasWest)) return 'grass_path_d';
  if (hasNorth || hasSouth) return 'grass_path_b';
  return 'grass_path_a';
};

const toLocalMeters = (
  latitude: number,
  longitude: number,
  centerLatitude: number,
  centerLongitude: number,
): NeighborhoodLocalPoint => {
  const cosLatitude = Math.max(0.2, Math.cos((centerLatitude * Math.PI) / 180));
  const metersPerLon = 111_320 * cosLatitude;
  const metersPerLat = 111_320;
  return {
    x: (longitude - centerLongitude) * metersPerLon,
    y: (latitude - centerLatitude) * metersPerLat,
  };
};

const rotatePoint = (point: NeighborhoodLocalPoint, radians: number): NeighborhoodLocalPoint => {
  if (Math.abs(radians) < 0.0001) return point;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
};

const getDominantRoadAlignmentRadians = (segments: NeighborhoodLocalPoint[][]) => {
  let vectorX = 0;
  let vectorY = 0;

  for (const segment of segments) {
    for (let index = 0; index < segment.length - 1; index += 1) {
      const start = segment[index]!;
      const end = segment[index + 1]!;
      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;
      const length = Math.hypot(deltaX, deltaY);
      if (length < 8) continue;
      const angle = Math.atan2(deltaY, deltaX);
      vectorX += Math.cos(angle * 4) * length;
      vectorY += Math.sin(angle * 4) * length;
    }
  }

  if (Math.abs(vectorX) < 0.001 && Math.abs(vectorY) < 0.001) return 0;
  return Math.atan2(vectorY, vectorX) / 4;
};

const getPercentile = (values: number[], percentile: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = clamp(Math.round((sorted.length - 1) * percentile), 0, sorted.length - 1);
  return sorted[index] ?? 0;
};

const getAdaptiveMetersPerCell = (
  points: NeighborhoodLocalPoint[],
  plannedGridCols: number,
  rows: number,
) => {
  if (points.length === 0) return DEFAULT_GRID_METERS_PER_CELL;

  const horizontalDistances = points.map((point) => Math.abs(point.x));
  const northDistances = points.map((point) => Math.max(0, point.y));
  const southDistances = points.map((point) => Math.max(0, -point.y));

  const horizontalRequirement =
    getPercentile(horizontalDistances, 0.72) / Math.max(2, Math.floor((plannedGridCols - 1) / 2));
  const northRequirement = getPercentile(northDistances, 0.62) / Math.max(2, HOME_ROAD_ANCHOR_ROW);
  const southRequirement =
    getPercentile(southDistances, 0.72) / Math.max(4, rows - HOME_ROAD_ANCHOR_ROW - 2);

  return clamp(
    Math.max(
      DEFAULT_GRID_METERS_PER_CELL * 0.88,
      horizontalRequirement,
      northRequirement,
      southRequirement,
    ),
    MIN_GRID_METERS_PER_CELL,
    MAX_GRID_METERS_PER_CELL,
  );
};

const createOverpassRoadQuery = (latitude: number, longitude: number) => `
[out:json][timeout:12];
(
  way(around:${LOCAL_ROAD_QUERY_RADIUS_METERS},${latitude},${longitude})["highway"~"${LOCAL_ROAD_HIGHWAY_REGEX}"];
);
out body;
>;
out skel qt;
`.trim();

const createOverpassBuildingQuery = (latitude: number, longitude: number) => `
[out:json][timeout:12];
(
  way(around:${LOCAL_BUILDING_QUERY_RADIUS_METERS},${latitude},${longitude})["building"~"${LOCAL_RESIDENTIAL_BUILDING_REGEX}"];
);
out center tags;
`.trim();

const fetchWithTimeout = async (url: string, body: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOCAL_ROAD_FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      body: `data=${encodeURIComponent(body)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      method: 'POST',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const extractRoadSegmentsFromOverpass = (payload: OverpassResponse) => {
  const elements = Array.isArray(payload.elements) ? payload.elements : [];
  const nodeById = new Map<number, { lat: number; lon: number }>();

  for (const element of elements) {
    if (element.type !== 'node') continue;
    if (typeof element.lat !== 'number' || typeof element.lon !== 'number') continue;
    nodeById.set(element.id, { lat: element.lat, lon: element.lon });
  }

  const segments: Array<Array<{ lat: number; lon: number }>> = [];
  for (const element of elements) {
    if (element.type !== 'way') continue;
    if (!element.tags?.highway || !Array.isArray(element.nodes) || element.nodes.length < 2) continue;
    if (element.tags.area === 'yes') continue;
    if (element.tags.service === 'parking_aisle') continue;

    const points = element.nodes
      .map((nodeId) => nodeById.get(nodeId))
      .filter((point): point is { lat: number; lon: number } => point != null);

    if (points.length >= 2) {
      segments.push(points);
    }
  }

  return segments;
};

const extractResidentialBuildingCentersFromOverpass = (payload: OverpassResponse) => {
  const elements = Array.isArray(payload.elements) ? payload.elements : [];
  const centers: Array<{ lat: number; lon: number }> = [];

  for (const element of elements) {
    if (element.type !== 'way') continue;
    if (!element.tags?.building) continue;
    if (typeof element.center?.lat !== 'number' || typeof element.center?.lon !== 'number') continue;

    centers.push({
      lat: element.center.lat,
      lon: element.center.lon,
    });
  }

  return centers;
};

const fetchLocalRoadSegments = async (latitude: number, longitude: number) => {
  const query = createOverpassRoadQuery(latitude, longitude);

  for (const endpoint of OVERPASS_API_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(endpoint, query);
      if (!response.ok) continue;
      const payload = (await response.json()) as OverpassResponse;
      const segments = extractRoadSegmentsFromOverpass(payload);
      if (segments.length > 0) return segments;
    } catch {
      // Try the next endpoint and fall back to the seeded heuristic if all fail.
    }
  }

  return [];
};

const fetchLocalResidentialBuildingCenters = async (latitude: number, longitude: number) => {
  const query = createOverpassBuildingQuery(latitude, longitude);

  for (const endpoint of OVERPASS_API_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(endpoint, query);
      if (!response.ok) continue;
      const payload = (await response.json()) as OverpassResponse;
      const centers = extractResidentialBuildingCentersFromOverpass(payload);
      if (centers.length > 0) return centers;
    } catch {
      // Try the next endpoint and continue without neighbor houses if all fail.
    }
  }

  return [];
};

const projectRoadSegmentsToGrid = async (
  latitude: number,
  longitude: number,
  initialGridCols: number,
  plannedGridCols: number,
  rows: number,
) => {
  const roadSegments = await fetchLocalRoadSegments(latitude, longitude);
  if (roadSegments.length === 0) return [];

  const localSegments = roadSegments.map((segment) =>
    segment.map((point) => toLocalMeters(point.lat, point.lon, latitude, longitude)),
  );
  const rotation = getDominantRoadAlignmentRadians(localSegments);
  const rotatedSegments = localSegments.map((segment) =>
    segment.map((point) => rotatePoint(point, -rotation)),
  );
  const rotatedPoints = rotatedSegments.flat();
  const metersPerCell = getAdaptiveMetersPerCell(rotatedPoints, plannedGridCols, rows);

  const roadSet = new Set<string>();

  for (const segment of rotatedSegments) {
    for (let index = 0; index < segment.length - 1; index += 1) {
      const start = segment[index]!;
      const end = segment[index + 1]!;
      const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
      const steps = Math.max(1, Math.ceil(segmentLength / LOCAL_ROAD_SAMPLE_STEP_METERS));

      for (let step = 0; step <= steps; step += 1) {
        const progress = step / steps;
        const sampleX = start.x + (end.x - start.x) * progress;
        const sampleY = start.y + (end.y - start.y) * progress;
        const col = Math.round(HOME_ROAD_ANCHOR_COL + sampleX / metersPerCell);
        const row = Math.round(HOME_ROAD_ANCHOR_ROW - sampleY / metersPerCell);
        if (row < 0 || row >= rows || col < 0 || col >= plannedGridCols) continue;
        if (isCastleCell(row, col)) continue;
        roadSet.add(keyForGridPoint(row, col));
      }
    }
  }

  const prunedRoadSet = pruneRoadSet(roadSet);
  if (prunedRoadSet.size < MIN_PROJECTED_ROAD_CELLS) return [];

  connectHomeBaseToRoadNetwork(prunedRoadSet, rows, plannedGridCols, initialGridCols);
  ensureHomeFrontDoorPath(prunedRoadSet, rows);

  const homeConnectorKey = keyForGridPoint(HOME_FRONT_DOOR_ROW, CASTLE_TARGET_COL);
  const connectedRoadSet = keepConnectedRoadComponent(prunedRoadSet, homeConnectorKey);
  const preservedHomeKeys = new Set(
    getHomeFrontPathPoints(rows).map((point) => keyForGridPoint(point.row, point.col)),
  );
  const simplifiedRoadSet = trimDeadEndBranches(
    connectedRoadSet,
    preservedHomeKeys,
    1,
  );

  if (simplifiedRoadSet.size < MIN_PROJECTED_ROAD_CELLS) return [];

  return [...simplifiedRoadSet]
    .map(parseGridPointKey)
    .sort((left, right) => left.row - right.row || left.col - right.col);
};

const projectResidentialBuildingsToGrid = async (
  latitude: number,
  longitude: number,
  initialGridCols: number,
  plannedGridCols: number,
  rows: number,
) => {
  const buildingCenters = await fetchLocalResidentialBuildingCenters(latitude, longitude);
  if (buildingCenters.length === 0) return [];

  const roadSegments = await fetchLocalRoadSegments(latitude, longitude);
  const localRoadSegments = roadSegments.map((segment) =>
    segment.map((point) => toLocalMeters(point.lat, point.lon, latitude, longitude)),
  );
  const rotation = localRoadSegments.length > 0 ? getDominantRoadAlignmentRadians(localRoadSegments) : 0;
  const rotatedRoadPoints = localRoadSegments
    .map((segment) => segment.map((point) => rotatePoint(point, -rotation)))
    .flat();

  const projectedBuildings = buildingCenters
    .map((center) => {
      const rotatedPoint = rotatePoint(
        toLocalMeters(center.lat, center.lon, latitude, longitude),
        -rotation,
      );
      return {
        distance: Math.hypot(rotatedPoint.x, rotatedPoint.y),
        point: rotatedPoint,
      };
    })
    .sort((left, right) => left.distance - right.distance);

  const referencePoints = rotatedRoadPoints.length > 0
    ? rotatedRoadPoints
    : projectedBuildings.map((building) => building.point);
  const metersPerCell = getAdaptiveMetersPerCell(referencePoints, plannedGridCols, rows);
  const seen = new Set<string>();
  const projected: NeighborhoodGridPoint[] = [];

  for (const building of projectedBuildings) {
    const col = Math.round(HOME_ROAD_ANCHOR_COL + building.point.x / metersPerCell);
    const row = Math.round(HOME_ROAD_ANCHOR_ROW - building.point.y / metersPerCell);
    if (row < 0 || row >= rows || col < 0 || col >= initialGridCols) continue;
    if (isCastleCell(row, col)) continue;
    const key = keyForGridPoint(row, col);
    if (seen.has(key)) continue;
    seen.add(key);
    projected.push({ row, col });
    if (projected.length >= 8) break;
  }

  return projected;
};

const PRESET_LAYOUT_CHAR_TO_POI_KIND: Partial<Record<string, Exclude<NeighborhoodPoiKind, 'home' | 'neighbor_house'>>> = {
  C: 'corner_store',
  L: 'library',
  P: 'park',
  S: 'school',
  l: 'library',
  p: 'park',
  s: 'school',
};

const DEFAULT_PRESET_POI_LABELS: Record<Exclude<NeighborhoodPoiKind, 'home' | 'neighbor_house'>, string> = {
  park: 'Neighborhood Park',
  corner_store: 'Corner Store',
  school: 'Local School',
  library: 'Town Library',
};

const PRESET_LAYOUT_CHAR_TO_FOUNDATION: Partial<Record<string, NeighborhoodSeedFoundation>> = {
  a: 'grass_path_a',
  b: 'grass_path_b',
  c: 'grass_path_c',
  d: 'grass_path_d',
  e: 'grass_path_e',
  f: 'grass_path_f',
  g: 'grass_path_g',
  h: 'grass_path_h',
  i: 'grass_path_i',
  j: 'grass_path_j',
};

export function buildNeighborhoodSeedFromPresetDefinition(
  definition: NeighborhoodPresetDefinition,
): NeighborhoodSeedTemplate {
  const normalizedRows = definition.layout.map((row) => row.trimEnd());
  const rows = normalizedRows.length > 0 ? normalizedRows.length : DEFAULT_ROWS;
  const plannedGridCols = Math.max(
    definition.plannedGridCols ?? 0,
    ...normalizedRows.map((row) => row.length),
    DEFAULT_PLANNED_GRID_COLS,
  );
  const initialGridCols = clamp(
    definition.initialGridCols ?? DEFAULT_INITIAL_GRID_COLS,
    6,
    plannedGridCols,
  );
  const roadSet = new Set<string>();
  const presetPathOverrides = new Map<string, NeighborhoodSeedFoundation>();
  const neighborHouseCells: NeighborhoodHousePlacement[] = [];
  const poiCells: Array<NeighborhoodPointOfInterest> = [];

  normalizedRows.forEach((rawRow, rowIndex) => {
    const row = rawRow.padEnd(plannedGridCols, '.');
    for (let col = 0; col < plannedGridCols; col += 1) {
      const marker = row[col] ?? '.';
      const key = keyForGridPoint(rowIndex, col);
      const explicitFoundation = PRESET_LAYOUT_CHAR_TO_FOUNDATION[marker];
      if (explicitFoundation) {
        roadSet.add(key);
        presetPathOverrides.set(key, explicitFoundation);
        continue;
      }
      if (marker === 'r') {
        roadSet.add(key);
        continue;
      }
      if (marker === 'H' || marker === 'J') {
        neighborHouseCells.push({ row: rowIndex, col, flipHorizontal: marker === 'J' });
        continue;
      }

      const poiKind = PRESET_LAYOUT_CHAR_TO_POI_KIND[marker];
      if (!poiKind) continue;
      const fallbackLabel = DEFAULT_PRESET_POI_LABELS[poiKind];
      poiCells.push({
        id: `${poiKind}-${rowIndex}-${col}`,
        kind: poiKind,
        label: definition.labels?.[poiKind] ?? fallbackLabel,
        row: rowIndex,
        col,
        inInitialBounds: col < initialGridCols,
        source: 'preset',
      });
    }
  });

  ensureHomeFrontDoorPath(roadSet, rows);

  const fallbackRoadGrid = buildFallbackRoadGrid(() => 0.5, initialGridCols, plannedGridCols, rows);
  const { roadRows, roadCols } = deriveRepresentativeRoadAxes(
    roadSet.size > 0 ? roadSet : fallbackRoadGrid.roadSet,
    fallbackRoadGrid.roadRows,
    fallbackRoadGrid.roadCols,
  );

  const foundations: NeighborhoodSeedCell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < plannedGridCols; col += 1) {
      const key = keyForGridPoint(row, col);
      foundations.push({
        row,
        col,
        foundation:
          presetPathOverrides.get(key) ??
          (roadSet.has(key) ? getPathFoundationForRoadCell(roadSet, row, col) : 'grass'),
      });
    }
  }

  const notablePlaces: NeighborhoodPointOfInterest[] = [
    {
      id: 'home',
      kind: 'home',
      label: `${definition.title} Home Base`,
      row: 1,
      col: CASTLE_TARGET_COL,
      inInitialBounds: true,
      source: 'preset',
    },
    ...neighborHouseCells.map((cell, index) => ({
      id: `neighbor-house-${index + 1}`,
      kind: 'neighbor_house' as const,
      label: `${definition.title} Neighbor House ${index + 1}`,
      row: cell.row,
      col: cell.col,
      flipHorizontal: cell.flipHorizontal === true,
      inInitialBounds: cell.col < initialGridCols,
      source: 'preset' as const,
    })),
    ...poiCells,
  ];

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    rows,
    initialGridCols,
    plannedGridCols,
    plannedRoadCols: roadCols,
    plannedRoadRows: roadRows,
    homeFootprint: {
      anchorLabel: `${definition.title} Home Base`,
      rowMin: CASTLE_ROW_MIN,
      rowMax: CASTLE_ROW_MAX,
      colMin: CASTLE_COL_MIN,
      colMax: CASTLE_COL_MAX,
    },
    source: {
      accuracyMeters: null,
      city: null,
      country: null,
      district: definition.subtitle,
      latitude: 0,
      longitude: 0,
      neighborhoodLabel: definition.title,
      previewUrls: {
        apple: '',
        google: '',
      },
      preferredMapProvider: 'apple',
      region: null,
      seedKey: `preset:${definition.id}`,
      streetLabel: definition.subtitle,
    },
    foundations,
    notablePlaces,
  };
}

export const getNeighborhoodSetupDecisionKey = (uid?: string | null) =>
  `${SETUP_DECISION_KEY_PREFIX}:${sanitizeFileSegment(uid ?? 'guest')}`;

export const isNeighborhoodSelectionComplete = (value?: string | null) =>
  value === NEIGHBORHOOD_SELECTION_COMPLETE_VALUE || value === 'applied';

export async function saveNeighborhoodSeedFile(
  seed: NeighborhoodSeedTemplate,
  uid?: string | null,
) {
  if (!FileSystem.documentDirectory) {
    throw new Error('Document storage is unavailable on this device.');
  }

  await FileSystem.makeDirectoryAsync(STORAGE_DIR, { intermediates: true });
  const fileUri = `${STORAGE_DIR}${sanitizeFileSegment(uid ?? 'guest')}-neighborhood-seed.json`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(seed, null, 2));
  return fileUri;
}

export async function generateNeighborhoodSeed(
  params: Omit<BuildNeighborhoodSeedParams, 'projectedRoadCells' | 'projectedHouseCells'>,
) {
  const projectedRoadCells = await projectRoadSegmentsToGrid(
    params.latitude,
    params.longitude,
    params.initialGridCols ?? DEFAULT_INITIAL_GRID_COLS,
    params.plannedGridCols ?? DEFAULT_PLANNED_GRID_COLS,
    params.rows ?? DEFAULT_ROWS,
  );
  const projectedHouseCells = await projectResidentialBuildingsToGrid(
    params.latitude,
    params.longitude,
    params.initialGridCols ?? DEFAULT_INITIAL_GRID_COLS,
    params.plannedGridCols ?? DEFAULT_PLANNED_GRID_COLS,
    params.rows ?? DEFAULT_ROWS,
  );

  return buildNeighborhoodSeed({
    ...params,
    projectedHouseCells,
    projectedRoadCells,
  });
}

export function buildNeighborhoodSeed({
  accuracyMeters = null,
  address,
  initialGridCols = DEFAULT_INITIAL_GRID_COLS,
  latitude,
  longitude,
  plannedGridCols = DEFAULT_PLANNED_GRID_COLS,
  preferredMapProvider = 'google',
  projectedHouseCells,
  projectedRoadCells,
  rows = DEFAULT_ROWS,
}: BuildNeighborhoodSeedParams): NeighborhoodSeedTemplate {
  const neighborhoodLabel =
    firstNonEmpty(address?.district, address?.subregion, address?.city, address?.street, address?.name) ??
    'Your Neighborhood';
  const streetLabel =
    firstNonEmpty(
      [address?.streetNumber, address?.street].filter(Boolean).join(' ').trim(),
      address?.street,
      address?.name,
    ) ?? null;
  const cityLabel = firstNonEmpty(address?.city, address?.subregion, address?.region) ?? neighborhoodLabel;
  const districtLabel = firstNonEmpty(address?.district, address?.subregion, address?.city) ?? neighborhoodLabel;
  const labelRoot = cleanLabelRoot(streetLabel, neighborhoodLabel);
  const cityRoot = cleanLabelRoot(cityLabel, neighborhoodLabel);
  const districtRoot = cleanLabelRoot(districtLabel, neighborhoodLabel);
  const homeLabel = `${labelRoot} Home Base`;
  const seedKey = createSeedKey(latitude, longitude, address);
  const rng = createRng(hashString(seedKey));
  const fallbackRoadGrid = buildFallbackRoadGrid(rng, initialGridCols, plannedGridCols, rows);
  const projectedRoadSet = new Set(
    (projectedRoadCells ?? [])
      .filter((cell) => cell.row >= 0 && cell.row < rows && cell.col >= 0 && cell.col < plannedGridCols)
      .map((cell) => keyForGridPoint(cell.row, cell.col)),
  );
  const roadSet = projectedRoadSet.size >= MIN_PROJECTED_ROAD_CELLS ? projectedRoadSet : fallbackRoadGrid.roadSet;
  const { roadRows, roadCols } = deriveRepresentativeRoadAxes(
    roadSet,
    fallbackRoadGrid.roadRows,
    fallbackRoadGrid.roadCols,
  );

  const foundations: NeighborhoodSeedCell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < plannedGridCols; col += 1) {
      const key = keyForGridPoint(row, col);
      const hasRoad = roadSet.has(key);
      if (!hasRoad) {
        foundations.push({ row, col, foundation: 'grass' });
        continue;
      }

      foundations.push({
        row,
        col,
        foundation: getPathFoundationForRoadCell(roadSet, row, col),
      });
    }
  }

  const parkAnchor = findNearestGrassCell(
    roadRows[roadRows.length - 1]! - 1,
    roadCols[0]! + 1,
    plannedGridCols,
    rows,
    roadSet,
  );
  const cornerStoreAnchor = findNearestGrassCell(
    roadRows[1]!,
    clamp(initialGridCols - 1, 0, plannedGridCols - 1),
    plannedGridCols,
    rows,
    roadSet,
  );
  const schoolAnchor = findNearestGrassCell(
    roadRows[1]! + 1,
    clamp(initialGridCols + 1, 0, plannedGridCols - 1),
    plannedGridCols,
    rows,
    roadSet,
  );
  const libraryAnchor = findNearestGrassCell(
    roadRows[0]! - 1,
    clamp(plannedGridCols - 3, 0, plannedGridCols - 1),
    plannedGridCols,
    rows,
    roadSet,
  );
  const occupiedPoiKeys = new Set<string>([
    keyForGridPoint(parkAnchor.row, parkAnchor.col),
    keyForGridPoint(cornerStoreAnchor.row, cornerStoreAnchor.col),
    keyForGridPoint(schoolAnchor.row, schoolAnchor.col),
    keyForGridPoint(libraryAnchor.row, libraryAnchor.col),
  ]);
  const neighborHouseAnchors = selectStarterHouseAnchors(
    projectedHouseCells,
    roadSet,
    initialGridCols,
    plannedGridCols,
    rows,
    occupiedPoiKeys,
  );

  const notablePlaces: NeighborhoodPointOfInterest[] = [
    {
      id: 'home',
      kind: 'home',
      label: homeLabel,
      row: 1,
      col: CASTLE_TARGET_COL,
      inInitialBounds: true,
      source: streetLabel ? 'reverse_geocode' : 'gps_seeded',
    },
    ...neighborHouseAnchors.map((anchor, index) => ({
      id: `neighbor-house-${index + 1}`,
      kind: 'neighbor_house' as const,
      label: `${labelRoot} Neighbor House ${index + 1}`,
      row: anchor.row,
      col: anchor.col,
      flipHorizontal: false,
      inInitialBounds: true,
      source: 'osm_building' as const,
    })),
    {
      id: 'park',
      kind: 'park',
      label: `${districtRoot} Green`,
      row: parkAnchor.row,
      col: parkAnchor.col,
      inInitialBounds: parkAnchor.col < initialGridCols,
      source: address?.district ? 'reverse_geocode' : 'gps_seeded',
    },
    {
      id: 'corner-store',
      kind: 'corner_store',
      label: `${labelRoot} Corner`,
      row: cornerStoreAnchor.row,
      col: cornerStoreAnchor.col,
      inInitialBounds: cornerStoreAnchor.col < initialGridCols,
      source: streetLabel ? 'reverse_geocode' : 'gps_seeded',
    },
    {
      id: 'school',
      kind: 'school',
      label: `${labelRoot} School`,
      row: schoolAnchor.row,
      col: schoolAnchor.col,
      inInitialBounds: schoolAnchor.col < initialGridCols,
      source: streetLabel ? 'reverse_geocode' : 'gps_seeded',
    },
    {
      id: 'library',
      kind: 'library',
      label: `${cityRoot} Library`,
      row: libraryAnchor.row,
      col: libraryAnchor.col,
      inInitialBounds: libraryAnchor.col < initialGridCols,
      source: cityLabel ? 'reverse_geocode' : 'gps_seeded',
    },
  ];

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    rows,
    initialGridCols,
    plannedGridCols,
    plannedRoadCols: roadCols,
    plannedRoadRows: roadRows,
    homeFootprint: {
      anchorLabel: homeLabel,
      rowMin: CASTLE_ROW_MIN,
      rowMax: CASTLE_ROW_MAX,
      colMin: CASTLE_COL_MIN,
      colMax: CASTLE_COL_MAX,
    },
    source: {
      accuracyMeters:
        typeof accuracyMeters === 'number' && Number.isFinite(accuracyMeters)
          ? Math.max(0, Math.round(accuracyMeters))
          : null,
      city: address?.city?.trim() || null,
      country: address?.country?.trim() || null,
      district: address?.district?.trim() || null,
      latitude,
      longitude,
      neighborhoodLabel,
      previewUrls: {
        apple: createAppleMapsUrl(latitude, longitude, homeLabel),
        google: createGoogleMapsUrl(latitude, longitude),
      },
      preferredMapProvider,
      region: address?.region?.trim() || null,
      seedKey,
      streetLabel,
    },
    foundations,
    notablePlaces,
  };
}
