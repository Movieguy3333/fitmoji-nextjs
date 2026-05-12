// ─── Health Metrics ─────────────────────────────────────────

export type HealthMetricKey =
  | 'steps'
  | 'activeCalories'
  | 'exerciseMinutes'
  | 'flightsClimbed';

export type HealthMetrics = Record<HealthMetricKey, number>;

export const HEALTH_METRIC_WEIGHTS: Record<HealthMetricKey, number> = {
  steps: 1,
  activeCalories: 20,
  exerciseMinutes: 120,
  flightsClimbed: 80,
};

// ─── Node ───────────────────────────────────────────────────

export type NodeType = 'locked' | 'unlocked' | 'completed';

export type NodeCategory =
  | 'fitness'
  | 'sleep'
  | 'nutrition'
  | 'mindfulness'
  | 'combat';

export interface NodeCompletionCriterion {
  metric: HealthMetricKey;
  oneStarAmount: number;
  twoStarAmount: number;
  threeStarAmount: number;
}

export interface NodeMissionRewardRange {
  currencyId: string;
  oneStarAmount?: number;
  twoStarAmount?: number;
  threeStarAmount?: number;
}

export interface NodeModalReward {
  type: string;
  amount: number;
}

export interface NodeModalEntry {
  title: string;
  description: string;
  image?: string;
  rewards?: NodeModalReward[];
}

export interface MapNode {
  id: number;
  x: number;
  y: number;
  type: NodeType;
  category: NodeCategory;
  label: string;
  minSteps: number;
  completionCriteria?: NodeCompletionCriterion[];
  missionImageUrl?: string;
  modal?: NodeModalEntry[];
  missionRewardRanges?: NodeMissionRewardRange[];
  /** Hero art for overlay math is fixed in the app (1536×1024 design space). */
  /** When true, show sticker / emoji in the mission hero using layout fields below. */
  stickerEnabled?: boolean;
  /** Sticker anchor in mission-hero space (same as `stickerLeft` / `stickerTop` in map JSON). */
  stickerX?: number;
  stickerY?: number;
  stickerWidth?: number;
  stickerHeight?: number;
  /** Collab party: bonus payout when conditions are met (see play `resolvePartyCompletionBonus`). */
  multiplayerBonusEnabled?: boolean;
  multiplayerBonusStars?: number;
  multiplayerBonusXp?: number;
}

// ─── Path ───────────────────────────────────────────────────

export type BendDirection = 'left' | 'right';

export interface PathJoint {
  x: number;
  y: number;
}

export interface MapPath {
  from: number;
  to: number;
  bend: BendDirection;
  bendIntensity: number;
  joints?: PathJoint[];
}

// ─── Decoration ─────────────────────────────────────────────

export type DecorationLayer = 'foreground' | 'background';
export type FlipDirection = 'horizontal' | 'vertical';

export interface DynamicCondition {
  metric: '__stars' | '__xp' | string;
  quantity: number;
  decoratorType: string;
}

export interface MapDecoration {
  type: string;
  x: number;
  y: number;
  scale: number;
  animated: boolean;
  layer?: DecorationLayer;
  flipped?: FlipDirection;
  dynamic?: boolean;
  dynamicConditions?: DynamicCondition[];
}

// ─── Weather ────────────────────────────────────────────────

export type WeatherType = 'sunny' | 'snowy' | 'rainy' | 'foggy' | 'snow';

// ─── World & Mission ────────────────────────────────────────

export interface WorldMission {
  title: string;
  description: string;
  item: string;
  target: number;
  imageUrl?: string;
}

export interface MissionCurrencyRequirement {
  id: string;
  label: string;
  requiredAmount: number;
}

// ─── Map Definition ─────────────────────────────────────────

export interface AnimationConfig {
  [key: string]: unknown;
}

export interface MapDefinition {
  imageWidth: number;
  imageHeight: number;
  mapImageUrl: string;
  weather: WeatherType;
  mission: WorldMission;
  missionCurrencies?: MissionCurrencyRequirement[];
  nodes: MapNode[];
  paths: MapPath[];
  decorations: MapDecoration[];
  animationConfig: AnimationConfig;
  mapTopMargin?: number;
  mapBottomMargin?: number;
  waterTopEnabled?: boolean;
  waterBottomEnabled?: boolean;
  waterTopColor?: string;
  waterBottomColor?: string;
}

// ─── World ──────────────────────────────────────────────────

export interface World {
  id: string;
  order: number;
  name: string;
  theme: string;
  missionTitle: string;
  missionDescription: string;
  missionItem: string;
  missionTarget: number;
  mapImageUrl: string;
  isAlwaysUnlocked: boolean;
  unlockRequirement?: string;
}

export interface MapDef {
  mapOrder: string[];
  activeVersionId: string;
}

export interface MapEntry {
  id: string;
  name: string;
  mapPreviewImageUrl?: string;
  activeVersionId: string;
}

// ─── Session & Game State ───────────────────────────────────

export interface SessionState {
  nodeId: number;
  startedAt: number;
  deadlineAt: number;
  baseline: HealthMetrics;
  partySessionId?: string;
  partySessionType?: 'collab' | 'compete';
}

export interface CompletionRecord {
  nodeId: number;
  stars: 0 | 1 | 2 | 3;
  metrics: HealthMetrics;
  rewards: Record<string, number>;
  duration: number;
  completedAt: number;
}

export type StarRating = 0 | 1 | 2 | 3;

export interface UserGameState {
  lastWorldId: string;
  lastMapId: string;
  lastNodeId: number;
  nodeStars: Record<string, Record<number, StarRating>>;
  currencyCollected: Record<string, Record<string, number>>;
  completionHistory: Record<string, Record<number, CompletionRecord>>;
  activeSession: SessionState | null;
  vendingInventory: string[];
  starsSpent: number;
}

// ─── Vending Machine ────────────────────────────────────────

export type ItemRarity = 'basic' | 'cool' | 'rare' | 'legendary';

export type PrizeDisplayType = 'emoji' | 'image';

export interface VendingMachineItem {
  id: string;
  emoji: string;
  name: string;
  rarity: ItemRarity;
  weight: number;
  /** When 'image', prefer imageUrl for display; otherwise use emoji. */
  displayType?: PrizeDisplayType;
  /** URL for image display (e.g. Nintendo Switch box). Used when displayType === 'image'. */
  imageUrl?: string;
}

// ─── Point (utility) ────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}
