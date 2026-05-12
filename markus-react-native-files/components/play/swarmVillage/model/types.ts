import type { ImageSourcePropType } from 'react-native';

export type GrassFoundation =
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

export type Foundation = GrassFoundation | 'soil' | false;

export type Tool =
  | GrassFoundation
  | 'soil'
  | 'wall'
  | 'fence'
  | 'house'
  | 'boxer'
  | 'tennis'
  | 'quarterback'
  | 'windmill'
  | 'capybara_statue'
  | 'chest'
  | 'erase'
  | 'heal';

export type BattleStatus = 'ready' | 'wave' | 'cleared' | 'lost';
export type CompletedSwarmOutcome = Extract<BattleStatus, 'cleared' | 'lost'>;
export type WallType = 'stone' | 'wood' | null;
export type UnitType = 'boxer' | 'tennis' | 'quarterback' | 'house' | 'windmill' | 'capybara_statue' | 'chest';
export type CombatTreeUnit = Extract<UnitType, 'boxer' | 'tennis' | 'quarterback'>;

export type BoardCell = {
  foundation: Foundation;
  wallHeight: number;
  wallHp: number;
  wallType: WallType;
  wallRotation: 0 | 1 | 2 | 3;
  soilPlacedAt: number | null;
  soilStartSwarmCompletionCount: number | null;
  unit: UnitType | null;
  unitHp: number;
  unitMaxHp: number;
  unitLevel: number;
  unitLastAttackAt: number;
  unitFacingScaleX: 1 | -1;
  unitRotation: 0 | 1 | 2 | 3;
  unitRewardBaselineCompletionCount: number | null;
};

export type Enemy = {
  id: string;
  variant: 'normal' | 'snow';
  row: number;
  col: number;
  hp: number;
  maxHp: number;
  damage: number;
  speedPerTick: number;
  spawnedAt: number;
  lastAttackAt: number;
};

export type Projectile = {
  id: string;
  row: number;
  col: number;
  velRow: number;
  velCol: number;
  damage: number;
  speedPerTick: number;
  remainingRange: number;
  kind?: 'tennis' | 'football';
  totalRange?: number;
  traveledRange?: number;
  arcHeight?: number;
  launchedAtMs?: number;
};

export type QuarterbackAimState = {
  row: number;
  col: number;
  originScreenX: number | null;
  originScreenY: number | null;
  pullScreenX: number | null;
  pullScreenY: number | null;
  startedAt: number;
};

export type QuarterbackAimStartOptions = {
  originScreenX?: number;
  originScreenY?: number;
  preserveTooltip?: boolean;
  pullScreenX?: number;
  pullScreenY?: number;
};

export type QuarterbackLaunch = {
  arcHeight: number;
  launchCol: number;
  launchRow: number;
  powerRatio: number;
  range: number;
  velCol: number;
  velRow: number;
};

export type QuarterbackAimPreview = {
  landingCell: { row: number; col: number } | null;
  points: Array<{ key: string; left: number; top: number; size: number; opacity: number }>;
  powerRatio: number;
};

export type CrazyCapyState = {
  row: number;
  col: number;
  targetRow: number;
  targetCol: number;
  activeUntil: number;
  durationMs: number;
  spawnedAt: number;
  facingScaleX: 1 | -1;
};

export type CrazyCapyKnockoutEffect = {
  id: string;
  variant: Enemy['variant'];
  row: number;
  col: number;
  startedAt: number;
  directionX: 1 | -1;
  rotationDirection: 1 | -1;
};

export type HealSparkle = { id: number; row: number; col: number; variant?: 'heal' | 'upgrade' };
export type CrazyCapyTapPulse = { id: number; row: number; col: number };
export type FootballExplosionEffect = { id: number; row: number; col: number; startedAt: number };
export type PathTravelDirection = 'row-1' | 'row+1' | 'col-1' | 'col+1';
export type HomeBaseVariant = 'starter_house' | 'castle';

export type VillageAvatarWalkState = {
  stage: 'exiting' | 'wandering' | 'returning' | 'harvesting';
  homeRow: number;
  homeCol: number;
  row: number;
  col: number;
  currentRow: number;
  currentCol: number;
  previousRow: number | null;
  previousCol: number | null;
  targetRow: number | null;
  targetCol: number | null;
  pauseUntil: number;
  stepsRemaining: number;
  facingScaleX: 1 | -1;
  speedPerTick?: number;
  harvestRoute?: Array<{ row: number; col: number }>;
  harvestRouteIndex?: number;
  harvestTargetRow?: number;
  harvestTargetCol?: number;
};

export type VillageDraftSnapshot = {
  board: BoardCell[];
  gridCols: number;
  spentEnergy: number;
  boardID?: string;
};

export type SwarmProgressSnapshot = {
  nextAvailableAtMs: number;
  streakCount: number;
  completionCount: number;
  firstVillageBuildPlacedAtMs: number | null;
  lastCompletedDayKey: string | null;
  crazyCapyChargeStartCalories?: number | null;
};

export type ForestSpiritProgressSnapshot = {
  lastOpenedDayKey: string | null;
  streakCount: number;
  charges: number;
};

export type ForestSpiritFirebaseSyncOptions =
  | {
    type: 'daily_open';
    previousSnapshot: ForestSpiritProgressSnapshot;
    earnedCharges: number;
  }
  | {
    type: 'powerup_use';
    healedItemCount: number;
    totalHpRestored: number;
    remainingCharges: number;
  };

export type CachedGameStateSnapshot = {
  nodeStars?: Record<string, number>;
  partyBonusStarsBank?: number;
  starsSpent?: number;
  xp?: number;
  vendingInventory?: string[];
};

export type CachedVillageTestOverrides = {
  stars?: number;
};

export type ToolInspectCard = {
  title: string;
  subtitle: string;
  costLabel: string;
  hint: string;
  compactCopy?: boolean;
  locked?: boolean;
  details?: Array<{ label: string; value: string }>;
  imageSource?: ImageSourcePropType;
  animationFrames?: ImageSourcePropType[];
  animationIntervalMs?: number;
  symbol?: string;
};

export type SwarmDefenseForecast = {
  defenderCount: number;
  level: 'danger' | 'warning' | 'stable' | 'strong';
  nextWaveSize: number;
  readinessLabel: string;
  suggestions: string[];
  summary: string;
  survivalChance: number;
  wallLayers: number;
};

export type BuildToolDef = {
  tool: Exclude<Tool, 'erase' | 'heal'>;
  label: string;
  cost: number;
  icon: ImageSourcePropType;
  unlockPrizeId?: string;
};

export type VillagePreviewUpload = {
  contentType: string;
  downloadUrl: string;
  height: number;
  storagePath: string;
  width: number;
};
