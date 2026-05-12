import StarRewardFlyover, { type StarRewardFlyoverPayload } from '@/components/play/StarRewardFlyover';
import { appendColumns, boardIndex, cloneBoardCells, createBoard, createDraftSnapshot, generateBoardID, getCell, isWithinBoard, sanitizeCastleFootprint } from '@/components/play/swarmVillage/domain/board';
import {
  getCurrentSwarmStreak, getDefenseForecast, getEnemySpawnPosition, getIncomingWaveSize, getWaveLabel, resolveEnemySpacing,
} from '@/components/play/swarmVillage/domain/combat';
import {
  createCrazyCapyKnockoutEffect, getCrazyCapyChargeRatio, getCrazyCapyChargeRemainingCalories, getCrazyCapyTargetNearCell, getCurrentActiveCalories, getRandomCrazyCapyTarget, stepCrazyCapy,
} from '@/components/play/swarmVillage/domain/crazyCapy';
import {
  getRefundAmountForHpRatio, parseStarBalanceFromState,
} from '@/components/play/swarmVillage/domain/economy';
import { applyForestSpiritHealToBoard, createEmptyForestSpiritProgressSnapshot } from '@/components/play/swarmVillage/domain/forestSpirit';
import {
  getFoundationImage, getFoundationLabel, getIsoHorizontalFacingScaleX, isDecorativePathFoundation, isFoundationTool, isGrassFoundation,
} from '@/components/play/swarmVillage/domain/foundations';
import {
  getSoilHarvestRoute, getSoilHarvestRouteFromPathCell, getVillageAvatarPathCandidates, isSoilConnectedToHarvestPath, isWalkableVillagePathCell,
} from '@/components/play/swarmVillage/domain/pathing';
import { buildPlacedSprites } from '@/components/play/swarmVillage/domain/placedSprites';
import {
  isChestRewardReady, isSoilCropReady, isWindmillRewardReady,
} from '@/components/play/swarmVillage/domain/rewards';
import {
  getActiveSwarmWindowKey, getAprilEnergySeasonStart, getCountdownToNextInvasionMs, getCurrentOrNextSwarmOpenAtMs, getDayDifferenceFromKeys, getEasternDayKey, getNextDailySwarmUnlockMs, getNextSwarmUnlockLabel,
} from '@/components/play/swarmVillage/domain/schedule';
import {
  getCapybaraSpritePosition, getChestSpritePosition, getEnemySpriteSize, getProjectileElevation, getWallSpritePosition, getWindmillSpritePosition,
} from '@/components/play/swarmVillage/domain/sprites';
import { buildToolInspectCard } from '@/components/play/swarmVillage/domain/toolInspect';
import {
  getCombatUnitDamage, getFullHealthHomeCount, getNextTreeUpgradeCost, getTreeLevel, getUnitEraseRefundBaseCost, getUnitLabel, getUnitMaxHp, getWallLabel, getWallMaxHp, getWallToolFromType, isDamageableUnit, isUpgradeableTreeUnit,
} from '@/components/play/swarmVillage/domain/units';
import { clamp, formatCountdown, keyForCell, parseStoredPositiveInt, parseTimestampMs, pickString, pickTimestampVersion, pickWeightedValue, randomIntBetween } from '@/components/play/swarmVillage/domain/utils';
import CrazyCapyTapPulseEffect from '@/components/play/swarmVillage/effects/CrazyCapyTapPulseEffect';
import FootballExplosionEffectView from '@/components/play/swarmVillage/effects/FootballExplosionEffectView';
import HealSparkleEffect from '@/components/play/swarmVillage/effects/HealSparkleEffect';
import { useCrazyCapyAudio } from '@/components/play/swarmVillage/hooks/useCrazyCapyAudio';
import { useSwarmNotifications } from '@/components/play/swarmVillage/hooks/useSwarmNotifications';
import { useVillageAudio } from '@/components/play/swarmVillage/hooks/useVillageAudio';
import { useVillagePersistence } from '@/components/play/swarmVillage/hooks/useVillagePersistence';
import { useVillagePreviewCapture } from '@/components/play/swarmVillage/hooks/useVillagePreviewCapture';
import { BOXER_FRAMES, CAPYBARA_POWERUP_IMAGE, CAPYBARA_STATUE_IMAGE, CHEST_IMAGE, DEFAULT_GAMEPLAY_AVATAR_SOURCE, DRAG_GHOST_SOURCES, FOREST_SPIRIT_IMAGE, HOME_BASE_IMAGE, IJOM_IMAGE, IJOM_SNOW_IMAGE, JOYSTICK_BASE_IMAGE, JOYSTICK_NUB_IMAGE, QUARTERBACK_IMAGE, STAR_IMAGE, TENNIS_FRAMES, TINY_HOUSE_IMAGE, WALL_TILE_IMAGE, WINDMILL_IMAGE, WOOD_FENCE_IMAGE } from '@/components/play/swarmVillage/model/assets';
import { FOREST_SPIRIT_PROGRESS_CACHE_KEY, getGameStateCacheKey, PLAY_TEST_OVERRIDES_STORAGE_KEY } from '@/components/play/swarmVillage/model/cacheKeys';
import { CAPYBARA_STATUE_SPRITE_H, CAPYBARA_STATUE_SPRITE_W, CASTLE_COL_MAX, CASTLE_COL_MIN, CASTLE_ROW_MAX, CASTLE_ROW_MIN, CASTLE_SPRITE_MIN_WIDTH, CASTLE_SPRITE_OFFSET_X, CASTLE_SPRITE_OFFSET_Y, CASTLE_SPRITE_SCALE, CASTLE_TARGET_COL, CASTLE_Z_INDEX_OFFSET, CHEST_SPRITE_H, CHEST_SPRITE_W, COL_LINE_LEN, CRAZY_CAPY_CHARGE_ACTIVE_CALORIES, CRAZY_CAPY_DAMAGE, CRAZY_CAPY_DURATION_PER_STATUE_MS, CRAZY_CAPY_HIT_COOLDOWN_MS, CRAZY_CAPY_HIT_RADIUS, CRAZY_CAPY_KNOCKOUT_FLIGHT_MS, CRAZY_CAPY_TEST_MODE, DEFAULT_GRID_COLS, DEFAULT_WAVE_SIZE, ENEMY_SPRITE_LEFT_OFFSET, ENEMY_SPRITE_SIZE, ENEMY_SPRITE_TOP_OFFSET, ENEMY_TREE_ATTACK_COOLDOWN_MS, ENEMY_UNIT_ATTACK_RADIUS, ENEMY_WALL_ATTACK_COOLDOWN_MS, ENEMY_WALL_ATTACK_RADIUS, enemyReachedCastle, GAME_TICK_MS, GRID_ROWS, HALF_H, HALF_W, HOME_BASE_LABEL, HOME_BASE_VARIANT, HOUSE_SPRITE_H, HOUSE_SPRITE_W, IJOM_BASE_DAMAGE, IJOM_DAMAGE_ACTIVE_MINUTES_DIVISOR, IJOM_MIN_DAMAGE, IJOM_SPAWN_INTERVAL_ACTIVE_MINUTES_DIVISOR, IJOM_SPAWN_INTERVAL_BASE_MS, IJOM_SPAWN_INTERVAL_MIN_MS, IJOM_SPEED_MULTIPLIER, IJOM_SPEED_PER_TICK_BASE, IJOM_SPEED_PER_TICK_VARIANCE, IJOM_VILLAGE_DIFFICULTY_RAMP_DIVISOR, IJOM_VILLAGE_SPEED_SCALE, isHomeReservedCell, ISO_ANGLE_LEFT, ISO_ANGLE_RIGHT, ISO_SEGMENT, MAX_WALL_HEIGHT, NEW_PLAYER_SEASONAL_ENERGY_CAP, NORMAL_IJOM_WALL_DAMAGE, QUARTERBACK_AIM_VISUAL_UPDATE_MS, QUARTERBACK_MAX_PULL_DISTANCE_PX, QUARTERBACK_MIN_PULL_DISTANCE_PX, QUARTERBACK_PREVIEW_SEGMENTS, QUARTERBACK_PROJECTILE_HIT_RADIUS, QUARTERBACK_PROJECTILE_SPEED_PER_TICK, QUARTERBACK_PULL_POWER_EXPONENT, QUARTERBACK_RANGE, QUARTERBACK_SPLASH_CELL_RADIUS, QUARTERBACK_THROW_COOLDOWN_MS, QUARTERBACK_THROW_PAD_NUB_MAX_OFFSET, QUARTERBACK_THROW_PAD_SIZE, QUARTERBACK_THROW_VIEW_SCALE, QUARTERBACK_VIEWPORT_ANIMATION_MS, SHIP_MAX_HP, SNOW_IJOM_DAMAGE_MULTIPLIER, SNOW_IJOM_WALL_DAMAGE, SNOW_WALL_SEEK_RANGE, TENNIS_PROJECTILE_HIT_RADIUS, TENNIS_RANGE, TILE_HEIGHT, TILE_WIDTH, TOOL_DRAG_HOLD_DELAY_MS, TOOL_DRAG_MOVE_CANCEL_THRESHOLD, VICTORY_REWARD_MODAL_EXIT_DELAY_MS, VILLAGE_AVATAR_CASTLE_DOOR_COL, VILLAGE_AVATAR_CASTLE_DOOR_ROW, VILLAGE_AVATAR_HARVEST_WALK_DURATION_MS, VILLAGE_AVATAR_IDLE_MAX_DELAY_MS, VILLAGE_AVATAR_IDLE_MIN_DELAY_MS, VILLAGE_AVATAR_OFFSET_X, VILLAGE_AVATAR_OFFSET_Y, VILLAGE_AVATAR_PAUSE_MAX_MS, VILLAGE_AVATAR_PAUSE_MIN_MS, VILLAGE_AVATAR_WALK_MAX_STEPS, VILLAGE_AVATAR_WALK_MIN_STEPS, VILLAGE_AVATAR_WALK_SPEED_PER_TICK, VOXEL_HEIGHT, WAVE_SIMULATION_INTERVAL_MS, WINDMILL_SPRITE_H, WINDMILL_SPRITE_W } from '@/components/play/swarmVillage/model/constants';
import {
  BOXER_RANGE, CAPYBARA_STATUE_PRIZE_ID, CHEST_REQUIRED_FULL_HEALTH_HOMES, CHEST_STAR_REWARD_TABLE, CHEST_STREAK_REQUIREMENT, COST_WALL, ERASE_REFUND_RATE, FOREST_SPIRIT_REQUIRED_STREAK_DAYS, HEAL_RESTORE_FRACTION, HOUSE_MAX_HP, ITEM_COSTS, MAP_EXPANSION_ENERGY_COST, TREE_UPGRADE_RESTORE_FRACTION, WINDMILL_STAR_REWARD
} from '@/components/play/swarmVillage/model/costs';
import { BUILD_TOOLS, TOOLS_PER_PAGE } from '@/components/play/swarmVillage/model/tools';
import type {
  BattleStatus, BoardCell, CachedGameStateSnapshot, CachedVillageTestOverrides, CompletedSwarmOutcome, CrazyCapyKnockoutEffect, CrazyCapyState, CrazyCapyTapPulse, Enemy, FootballExplosionEffect, ForestSpiritProgressSnapshot, HealSparkle, Projectile, QuarterbackAimPreview, QuarterbackAimStartOptions, QuarterbackAimState, QuarterbackLaunch, Tool, ToolInspectCard, VillageAvatarWalkState, VillageDraftSnapshot, WallType
} from '@/components/play/swarmVillage/model/types';
import { overlayStyles } from '@/components/play/swarmVillage/styles/overlays';
import { sceneStyles } from '@/components/play/swarmVillage/styles/scene';
import SwarmVillageBottomTray from '@/components/play/swarmVillage/SwarmVillageBottomTray';
import SwarmVillageCellTooltip from '@/components/play/swarmVillage/SwarmVillageCellTooltip';
import { SwarmVillageCrazyCapyKnockoutEffects, SwarmVillageCrazyCapySprite } from '@/components/play/swarmVillage/SwarmVillageCrazyCapySprites';
import SwarmVillageDragGhost from '@/components/play/swarmVillage/SwarmVillageDragGhost';
import SwarmVillageFootballProjectile from '@/components/play/swarmVillage/SwarmVillageFootballProjectile';
import SwarmVillageGalleryPreview from '@/components/play/swarmVillage/SwarmVillageGalleryPreview';
import SwarmVillageHud from '@/components/play/swarmVillage/SwarmVillageHud';
import SwarmVillageModals from '@/components/play/swarmVillage/SwarmVillageModals';
import SwarmVillagePresetNeighborhoodSetup from '@/components/play/swarmVillage/SwarmVillagePresetNeighborhoodSetup';
import SwarmVillageSkiaScene from '@/components/play/swarmVillage/SwarmVillageSkiaScene';
import SwarmVillageToolInspectCard from '@/components/play/swarmVillage/SwarmVillageToolInspectCard';
import { buildSwarmVillageTour, getSwarmVillageTourStorageKey } from '@/components/play/swarmVillage/swarmVillageTourGuide';
import type { VendingPullCommittedResult } from '@/components/play/vending/useVendingMachine';
import { fetchVendingConfig, requestVendingPull, type VendingConfigMachine, type VendingMachineId } from '@/components/play/vending/vendingApi';
import { VendingMachineModal } from '@/components/play/vending/VendingMachineModal';
import { useAuth } from '@/contexts/AuthContext';
import { deriveSeasonalEnergy, ENERGY_COSTS, getAvailableEnergy, logEnergyBreakdown, type EnergyModifierContext } from '@/lib/game/energy';
import { formatCompactNumber } from '@/lib/game/formatters';
import { mergeGameStateCache } from '@/lib/game/mergeGameStateCache';
import { getNeighborhoodSetupDecisionKey, isNeighborhoodSelectionComplete, type NeighborhoodSeedTemplate } from '@/lib/game/swarmVillageNeighborhood';
import { useHealthMetrics } from '@/lib/game/useHealthMetrics';
import { clearSwarmWidget, upsertSwarmWidget } from '@/lib/widget/swarmWidget';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getIdToken } from '@react-native-firebase/auth';
import { doc, getDoc, getFirestore, increment, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useTourGuide } from '@wrack/react-native-tour-guide';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';

import {
  Alert, Animated, AppState, Image, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View,
  type ImageSourcePropType
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export { SPENT_ENERGY_CACHE_KEY } from '@/components/play/swarmVillage/model/cacheKeys';

/* ================================================================ */
/*  LOCAL SCREEN WIRING                                             */
/* ================================================================ */

const db = getFirestore(getApp());

type SwarmVillageGameProps = {
  devForceNeighborhoodSetupToken?: number;
  devNeighborhoodLocationOverride?: {
    latitude: number;
    longitude: number;
  } | null;
  renderMode?: 'native' | 'skia';
  onExit?: () => void;
};

/* Pure domain helpers now live under components/play/swarmVillage/domain. */

/* ================================================================ */
/*  MAIN COMPONENT                                                  */
/* ================================================================ */

export default function SwarmVillageGame({
  devForceNeighborhoodSetupToken = 0,
  devNeighborhoodLocationOverride = null,
  renderMode = 'native',
  onExit,
}: SwarmVillageGameProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const navigation = useNavigation();
  const isVillageFocused = useIsFocused();
  const { startTour, isActive: isTourActive } = useTourGuide();
  const [gridCols, setGridCols] = useState(DEFAULT_GRID_COLS);
  const boardWidth = useMemo(() => (GRID_ROWS + gridCols) * HALF_W + TILE_WIDTH, [gridCols]);
  const boardHeight = useMemo(() => 250 + (GRID_ROWS + gridCols) * HALF_H + MAX_WALL_HEIGHT * VOXEL_HEIGHT, [gridCols]);
  const boardTopInset = 134;
  const boardCenterX = renderMode === 'skia' ? (GRID_ROWS + 1) * HALF_W : boardWidth / 2;

  /* ── core state ────────────────────────────────────────── */
  const [board, setBoard] = useState<BoardCell[]>(() => createBoard(DEFAULT_GRID_COLS));
  const [boardLoaded, setBoardLoaded] = useState(false);
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [isHudCollapsed, setIsHudCollapsed] = useState(true);
  const [isTrayCollapsed, setIsTrayCollapsed] = useState(false);
  const [countdownMs, setCountdownMs] = useState(getCountdownToNextInvasionMs);
  const [status, setStatus] = useState<BattleStatus>('ready');
  const [shipHp, setShipHp] = useState(SHIP_MAX_HP);
  const [waveSize, setWaveSize] = useState(DEFAULT_WAVE_SIZE);
  const [waveSpawned, setWaveSpawned] = useState(0);
  const [waveDefeated, setWaveDefeated] = useState(0);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [swarmProgressLoaded, setSwarmProgressLoaded] = useState(false);
  const [swarmNextAvailableAtMs, setSwarmNextAvailableAtMs] = useState(0);
  const [swarmStreakCount, setSwarmStreakCount] = useState(0);
  const [swarmCompletionCount, setSwarmCompletionCount] = useState(0);
  const [firstVillageBuildPlacedAtMs, setFirstVillageBuildPlacedAtMs] = useState<number | null>(null);
  const [lastSwarmCompletedDayKey, setLastSwarmCompletedDayKey] = useState<string | null>(null);
  const [forestSpiritProgressLoaded, setForestSpiritProgressLoaded] = useState(false);
  const [forestSpiritOpenStreakCount, setForestSpiritOpenStreakCount] = useState(0);
  const [forestSpiritCharges, setForestSpiritCharges] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toolInspectCard, setToolInspectCard] = useState<ToolInspectCard | null>(null);
  const [toolInspectFrameIndex, setToolInspectFrameIndex] = useState(0);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragItem, setDragItem] = useState<Tool | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedTooltipCell, setSelectedTooltipCell] = useState<{ row: number; col: number } | null>(null);
  const [harvestingCellKey, setHarvestingCellKey] = useState<string | null>(null);
  const [starBalance, setStarBalance] = useState(0);
  const [displayedStarBalance, setDisplayedStarBalance] = useState(0);
  const [starsSpentTotal, setStarsSpentTotal] = useState(0);
  const [playerXp, setPlayerXp] = useState(0);
  const [vendingInventory, setVendingInventory] = useState<string[]>([]);
  const [showVendingMachine, setShowVendingMachine] = useState(false);
  const [vendingMachinesConfig, setVendingMachinesConfig] = useState<VendingConfigMachine[] | null>(null);
  const [starRewardFlyover, setStarRewardFlyover] = useState<StarRewardFlyoverPayload | null>(null);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [showDefeatModal, setShowDefeatModal] = useState(false);
  const [showExpansionModal, setShowExpansionModal] = useState(false);
  const [showEnergyInfoModal, setShowEnergyInfoModal] = useState(false);
  const [showCrazyCapyInfoModal, setShowCrazyCapyInfoModal] = useState(false);
  const [completedSwarmAutosaveState, setCompletedSwarmAutosaveState] = useState<'idle' | 'saving'>('idle');
  const [pendingExpansionColumns, setPendingExpansionColumns] = useState(1);
  const [swarmVillageTourBootAttempted, setSwarmVillageTourBootAttempted] = useState(false);
  const [isNeighborhoodSetupVisible, setIsNeighborhoodSetupVisible] = useState(false);
  const [neighborhoodSelectionVersion, setNeighborhoodSelectionVersion] = useState(0);
  const [debugEnemySimulationActive, setDebugEnemySimulationActive] = useState(false);
  const [quarterbackAim, setQuarterbackAim] = useState<QuarterbackAimState | null>(null);
  const [quarterbackThrowAnchorCell, setQuarterbackThrowAnchorCell] = useState<{ row: number; col: number } | null>(null);
  const quarterbackThrowPadNubOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  /* ── energy currency ───────────────────────────────────── */
  const [spentEnergy, setSpentEnergy] = useState(0);
  const [spentEnergyLoaded, setSpentEnergyLoaded] = useState(false);
  const [newPlayerEnergyOffset, setNewPlayerEnergyOffset] = useState(0);
  const [newPlayerEnergyOffsetLoaded, setNewPlayerEnergyOffsetLoaded] = useState(false);
  const [newPlayerEnergyOffsetInitialized, setNewPlayerEnergyOffsetInitialized] = useState(false);
  const [draftBaselineReady, setDraftBaselineReady] = useState(false);
  const [savedBoardSerialized, setSavedBoardSerialized] = useState<string | null>(null);
  const [savedSpentEnergy, setSavedSpentEnergy] = useState(0);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  /* ── tool pagination ───────────────────────────────────── */
  const [toolPage, setToolPage] = useState(0);
  /* ── heal sparkle effects ──────────────────────────────── */
  const [activeSparkles, setActiveSparkles] = useState<HealSparkle[]>([]);
  const sparkleIdCounter = useRef(0);

  /* ── Crazy Capy powerup ────────────────────────────────── */
  const [crazyCapy, setCrazyCapy] = useState<CrazyCapyState | null>(null);
  const [crazyCapyChargeStartCalories, setCrazyCapyChargeStartCalories] = useState<number | null>(null);
  const [crazyCapyChargeRatio, setCrazyCapyChargeRatio] = useState(1);
  const [crazyCapyTapPulses, setCrazyCapyTapPulses] = useState<CrazyCapyTapPulse[]>([]);
  const [crazyCapyKnockoutEffects, setCrazyCapyKnockoutEffects] = useState<CrazyCapyKnockoutEffect[]>([]);
  const [footballExplosions, setFootballExplosions] = useState<FootballExplosionEffect[]>([]);
  const [villageAvatarWalk, setVillageAvatarWalk] = useState<VillageAvatarWalkState | null>(null);
  const crazyCapyTapPulseIdCounter = useRef(0);
  const footballExplosionIdCounter = useRef(0);
  const crazyCapySoundscapeActive = crazyCapy !== null;
  const hasActivePowerupAudioOverride = crazyCapySoundscapeActive;

  /* ── player avatar ─────────────────────────────────────── */
  const { user, userProfile } = useAuth();

  /* ── health metrics ────────────────────────────────────── */
  const { sinceAprilMetrics, metricsReady } = useHealthMetrics();
  const gameplayAvatarUrl = useMemo(() => pickString(userProfile?.gameplayAvatarUrl), [userProfile?.gameplayAvatarUrl]);
  const profilePhotoUrl = useMemo(
    () => pickString(userProfile?.profilePicture) ?? pickString(user?.photoURL),
    [user?.photoURL, userProfile?.profilePicture],
  );
  const gameplayAvatarVersion = useMemo(
    () => pickTimestampVersion(userProfile?.avatarUpdatedAt) ?? pickTimestampVersion(userProfile?.updatedAt),
    [userProfile?.avatarUpdatedAt, userProfile?.updatedAt],
  );
  const gameplayAvatarUrlWithVersion = useMemo(() => {
    if (!gameplayAvatarUrl) return null;
    if (!gameplayAvatarVersion) return gameplayAvatarUrl;
    const separator = gameplayAvatarUrl.includes('?') ? '&' : '?';
    return `${gameplayAvatarUrl}${separator}v=${encodeURIComponent(gameplayAvatarVersion)}`;
  }, [gameplayAvatarUrl, gameplayAvatarVersion]);
  const castleAvatarSource = useMemo<ImageSourcePropType>(() => {
    if (gameplayAvatarUrlWithVersion) return { uri: gameplayAvatarUrlWithVersion };
    if (profilePhotoUrl) return { uri: profilePhotoUrl };
    return DEFAULT_GAMEPLAY_AVATAR_SOURCE;
  }, [gameplayAvatarUrlWithVersion, profilePhotoUrl]);
  const playerLevel = useMemo(() => Math.floor(playerXp / 100) + 1, [playerXp]);

  const sinceAprilRef = useRef(sinceAprilMetrics);
  useEffect(() => { sinceAprilRef.current = sinceAprilMetrics; }, [sinceAprilMetrics]);

  const vendingApiBaseUrl = (process.env.EXPO_PUBLIC_BACKEND_API_URL ?? '').trim();
  const requestVendingPullFromServer = useCallback(
    async (machineId: VendingMachineId) => {
      const baseUrl = (process.env.EXPO_PUBLIC_BACKEND_API_URL ?? '').trim();
      if (!baseUrl) throw new Error('Vending API not configured');
      const getToken = async () => (user ? await getIdToken(user) : null);
      const pullId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return requestVendingPull(baseUrl, getToken, {
        machineId,
        pullId,
        level: playerLevel,
        streak: swarmStreakCount,
      });
    },
    [playerLevel, swarmStreakCount, user],
  );

  const nowMs = Date.now();
  const currentOrNextSwarmOpenAtMs = useMemo(() => getCurrentOrNextSwarmOpenAtMs(), [countdownMs]);
  const effectiveSwarmUnlockAtMs = useMemo(
    () => Math.max(swarmNextAvailableAtMs, currentOrNextSwarmOpenAtMs),
    [currentOrNextSwarmOpenAtMs, swarmNextAvailableAtMs],
  );
  const isSwarmUnlocked = swarmProgressLoaded && nowMs >= effectiveSwarmUnlockAtMs;
  const currentEasternDayKey = useMemo(() => getEasternDayKey(), [countdownMs]);
  const displayedSwarmStreak = useMemo(() => {
    return getCurrentSwarmStreak(swarmStreakCount, lastSwarmCompletedDayKey, currentEasternDayKey);
  }, [currentEasternDayKey, lastSwarmCompletedDayKey, swarmStreakCount]);
  const forestSpiritDisplayProgress = useMemo(
    () =>
      forestSpiritCharges > 0
        ? FOREST_SPIRIT_REQUIRED_STREAK_DAYS
        : clamp(forestSpiritOpenStreakCount, 0, FOREST_SPIRIT_REQUIRED_STREAK_DAYS),
    [forestSpiritCharges, forestSpiritOpenStreakCount],
  );

  const currentEnergySeasonStartMs = useMemo(() => getAprilEnergySeasonStart().getTime(), [currentEasternDayKey]);
  const currentEnergySeasonStart = useMemo(() => new Date(currentEnergySeasonStartMs), [currentEnergySeasonStartMs]);
  const currentActiveCalories = useMemo(
    () => getCurrentActiveCalories(sinceAprilMetrics.activeCalories),
    [sinceAprilMetrics.activeCalories],
  );
  const userMetadataCreationTime = (user as { metadata?: { creationTime?: unknown } } | null)?.metadata?.creationTime;
  const userCreatedAtMs = useMemo(() => {
    const authCreatedAtMs = parseTimestampMs(userMetadataCreationTime);
    if (authCreatedAtMs != null) return authCreatedAtMs;
    return parseTimestampMs((userProfile as Record<string, unknown> | null | undefined)?.createdAt);
  }, [userMetadataCreationTime, userProfile]);
  const isNewPlayerForEnergySeason =
    userCreatedAtMs != null && userCreatedAtMs >= currentEnergySeasonStartMs;
  const rawSeasonalEnergy = useMemo(() => deriveSeasonalEnergy(sinceAprilMetrics), [sinceAprilMetrics]);
  const energyModifierContext = useMemo<EnergyModifierContext | undefined>(() => {
    if (!isNewPlayerForEnergySeason) return undefined;
    if (newPlayerEnergyOffsetInitialized) {
      return newPlayerEnergyOffset > 0 ? { seasonalEnergyOffset: newPlayerEnergyOffset } : undefined;
    }
    return { seasonalEnergyCap: NEW_PLAYER_SEASONAL_ENERGY_CAP };
  }, [isNewPlayerForEnergySeason, newPlayerEnergyOffset, newPlayerEnergyOffsetInitialized]);
  const seasonalEnergy = useMemo(
    () => deriveSeasonalEnergy(sinceAprilMetrics, energyModifierContext),
    [energyModifierContext, sinceAprilMetrics],
  );
  const availableEnergy = useMemo(
    () => getAvailableEnergy({ seasonalMetrics: sinceAprilMetrics, spentEnergy, context: energyModifierContext }),
    [energyModifierContext, sinceAprilMetrics, spentEnergy],
  );
  const hydrationReady = boardLoaded && spentEnergyLoaded;
  const currentBoardSerialized = useMemo(() => JSON.stringify(board), [board]);
  const maxExpandableColumns = Math.max(0, Math.floor(availableEnergy / MAP_EXPANSION_ENERGY_COST));
  const expansionEnergyCost = pendingExpansionColumns * MAP_EXPANSION_ENERGY_COST;
  const totalToolPages = Math.max(1, Math.ceil(BUILD_TOOLS.length / TOOLS_PER_PAGE));
  const hasCapybaraStatueUnlocked = useMemo(
    () => vendingInventory.includes(CAPYBARA_STATUE_PRIZE_ID),
    [vendingInventory],
  );
  const hasUnsavedChanges =
    draftBaselineReady &&
    savedBoardSerialized !== null &&
    (
      currentBoardSerialized !== savedBoardSerialized ||
      spentEnergy !== savedSpentEnergy
    );
  const readyRewardSnapshot = useMemo(() => {
    const fullHealthHomeCount = getFullHealthHomeCount(board);
    const soilKeys: string[] = [];
    const windmillKeys: string[] = [];
    const chestKeys: string[] = [];

    board.forEach((cell, index) => {
      const row = Math.floor(index / gridCols);
      const col = index % gridCols;
      if (
        isSoilCropReady(cell, swarmCompletionCount) &&
        isSoilConnectedToHarvestPath(board, row, col, gridCols)
      ) {
        soilKeys.push(`${row}:${col}:${cell.soilStartSwarmCompletionCount ?? 'na'}`);
      }
      if (cell.unit === 'windmill' && isWindmillRewardReady(cell, swarmCompletionCount)) {
        windmillKeys.push(`${row}:${col}:${cell.unitRewardBaselineCompletionCount ?? 'na'}`);
      }
      if (cell.unit === 'chest' && isChestRewardReady(cell, swarmCompletionCount, fullHealthHomeCount)) {
        chestKeys.push(`${row}:${col}:${cell.unitRewardBaselineCompletionCount ?? 'na'}`);
      }
    });

    return { soilKeys, windmillKeys, chestKeys };
  }, [board, gridCols, swarmCompletionCount]);
  const villageAvatarStartCandidates = useMemo(
    () => getVillageAvatarPathCandidates(board, gridCols),
    [board, gridCols],
  );

  /* ── refs ───────────────────────────────────────────────── */
  const boardRef = useRef(board);
  const boardIDRef = useRef<string | null>(null);
  const statusRef = useRef(status);
  const shipHpRef = useRef(shipHp);
  const gridColsRef = useRef(gridCols);
  const spentEnergyRef = useRef(spentEnergy);
  const savedDraftRef = useRef<VillageDraftSnapshot>(createDraftSnapshot(createBoard(DEFAULT_GRID_COLS), DEFAULT_GRID_COLS, 0));
  const allowNavigationRef = useRef(false);
  const pendingDiscardNoticeRef = useRef(false);
  const pendingCompletedSwarmAutosaveOutcomeRef = useRef<CompletedSwarmOutcome | null>(null);
  const isMountedRef = useRef(true);
  const appStateRef = useRef(AppState.currentState);
  const forestSpiritProgressRef = useRef<ForestSpiritProgressSnapshot>(createEmptyForestSpiritProgressSnapshot());
  const forestSpiritUseInFlightRef = useRef(false);
  const { captureAndUploadVillagePreview, villagePreviewShotRef } = useVillagePreviewCapture();

  /* ── audio ────────────────────────────────────────────────── */
  const { musicEnabled, stopCurrentAudioImmediately } = useVillageAudio({
    hasActivePowerupAudioOverride,
    isVillageFocused,
    status,
  });

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);
  const enemiesRef = useRef(enemies);
  const projectilesRef = useRef(projectiles);
  const crazyCapyRef = useRef<CrazyCapyState | null>(null);
  const crazyCapyChargeStartCaloriesRef = useRef<number | null>(null);
  const crazyCapyChargeRatioRef = useRef(1);
  const crazyCapyHitAtByEnemyIdRef = useRef<Record<string, number>>({});
  const waveSpawnedRef = useRef(waveSpawned);
  const waveDefeatedRef = useRef(waveDefeated);
  const swarmCompletionRecordedWindowKeyRef = useRef<string | null>(null);
  const translateRef = useRef(translate);
  const scaleRef = useRef(scale);
  const hoverCellDragRef = useRef<{ row: number; col: number } | null>(null);
  const toolDragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toolDragStartedRef = useRef(false);
  const toolDragCanceledRef = useRef(false);
  const toolTouchPointRef = useRef<{ x: number; y: number } | null>(null);
  const toolTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toolInspectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const treeUpgradeInFlightRef = useRef<string | null>(null);
  const lastEnemySpawnAtRef = useRef(0);
  const enemyIdRef = useRef(0);
  const projectileIdRef = useRef(0);
  const panStartRef = useRef({ x: 0, y: 0 });
  const gestureModeRef = useRef<'idle' | 'pan'>('idle');
  const hasDraggedRef = useRef(false);
  const quarterbackViewportSnapshotRef = useRef<{ translate: { x: number; y: number }; scale: number } | null>(null);
  const viewportAnimationFrameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const harvestInFlightRef = useRef<string | null>(null);
  const swarmVictoryRewardInFlightRef = useRef(false);
  const starBalanceTargetRef = useRef<View | null>(null);
  const starBalanceRef = useRef(starBalance);
  const starsSpentTotalRef = useRef(starsSpentTotal);
  const displayedStarBalanceRef = useRef(displayedStarBalance);
  const activeStarFlyoverRef = useRef<StarRewardFlyoverPayload | null>(null);
  const starFlyoverBusyRef = useRef(false);
  const starCountAnimatingRef = useRef(false);
  const debugEnemySimulationActiveRef = useRef(false);
  const quarterbackAimRef = useRef<QuarterbackAimState | null>(null);
  const quarterbackAimVisualUpdateAtRef = useRef(0);
  const quarterbackThrowControlCellRef = useRef<{ row: number; col: number } | null>(null);
  const lastWaveSimulationAtRef = useRef<number | null>(null);
  const swarmScheduleTourRef = useRef<View | null>(null);
  const energyBalanceTourRef = useRef<View | null>(null);
  const toolTrayTourRef = useRef<View | null>(null);
  const prizeMachineTourRef = useRef<View | null>(null);
  const villageAvatarWalkRef = useRef<VillageAvatarWalkState | null>(null);
  const villageAvatarHarvestWalkRef = useRef<{ resolve: (completed: boolean) => void } | null>(null);
  const nextVillageAvatarWalkAtRef = useRef(
    Date.now() + randomIntBetween(VILLAGE_AVATAR_IDLE_MIN_DELAY_MS, VILLAGE_AVATAR_IDLE_MAX_DELAY_MS),
  );
  useEffect(() => { gridColsRef.current = gridCols; }, [gridCols]);
  useEffect(() => { spentEnergyRef.current = spentEnergy; }, [spentEnergy]);
  useEffect(() => { starBalanceRef.current = starBalance; }, [starBalance]);
  useEffect(() => { starsSpentTotalRef.current = starsSpentTotal; }, [starsSpentTotal]);
  useEffect(() => { displayedStarBalanceRef.current = displayedStarBalance; }, [displayedStarBalance]);
  useEffect(() => { crazyCapyRef.current = crazyCapy; }, [crazyCapy]);
  useEffect(() => { crazyCapyChargeStartCaloriesRef.current = crazyCapyChargeStartCalories; }, [crazyCapyChargeStartCalories]);
  useEffect(() => { crazyCapyChargeRatioRef.current = crazyCapyChargeRatio; }, [crazyCapyChargeRatio]);
  useEffect(() => { villageAvatarWalkRef.current = villageAvatarWalk; }, [villageAvatarWalk]);
  useEffect(() => { debugEnemySimulationActiveRef.current = debugEnemySimulationActive; }, [debugEnemySimulationActive]);
  useEffect(() => {
    if (!quarterbackAim) {
      quarterbackAimRef.current = null;
      quarterbackAimVisualUpdateAtRef.current = 0;
      return;
    }

    const currentAim = quarterbackAimRef.current;
    if (
      !currentAim ||
      currentAim.row !== quarterbackAim.row ||
      currentAim.col !== quarterbackAim.col ||
      currentAim.startedAt !== quarterbackAim.startedAt
    ) {
      quarterbackAimRef.current = quarterbackAim;
    }
  }, [quarterbackAim]);

  const showToast = useCallback((msg: string, durationMs = 1800) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), durationMs);
  }, []);

  const {
    applyForestSpiritProgressSnapshot,
    handleSaveVillage,
    markForestSpiritOpenedToday,
    persistVillageSnapshot,
    publishSwarmVillageSnapshot,
    saveDraftToCache,
    syncForestSpiritProgressToFirebase,
  } = useVillagePersistence({
    board,
    boardLoaded,
    boardIDRef,
    boardRef,
    captureAndUploadVillagePreview,
    completedSwarmAutosaveState,
    currentEasternDayKey,
    currentEnergySeasonStart,
    crazyCapyChargeStartCalories,
    crazyCapyChargeStartCaloriesRef,
    displayedSwarmStreak,
    draftBaselineReady,
    firstVillageBuildPlacedAtMs,
    forestSpiritProgressLoaded,
    forestSpiritProgressRef,
    gridCols,
    gridColsRef,
    hasUnsavedChanges,
    hydrationReady,
    isMountedRef,
    isNewPlayerForEnergySeason,
    lastCompletedSwarmAutosaveOutcomeRef: pendingCompletedSwarmAutosaveOutcomeRef,
    lastSwarmCompletedDayKey,
    metricsReady,
    newPlayerEnergyOffsetInitialized,
    newPlayerEnergyOffsetLoaded,
    rawSeasonalEnergy,
    savedDraftRef,
    seasonalEnergy,
    setBoard,
    setBoardLoaded,
    setCompletedSwarmAutosaveState,
    setCrazyCapyChargeStartCalories,
    setDraftBaselineReady,
    setFirstVillageBuildPlacedAtMs,
    setForestSpiritCharges,
    setForestSpiritOpenStreakCount,
    setForestSpiritProgressLoaded,
    setGridCols,
    setIsSavingDraft,
    setLastSwarmCompletedDayKey,
    setNewPlayerEnergyOffset,
    setNewPlayerEnergyOffsetInitialized,
    setNewPlayerEnergyOffsetLoaded,
    setSavedBoardSerialized,
    setSavedSpentEnergy,
    setSpentEnergy,
    setSpentEnergyLoaded,
    setSwarmCompletionCount,
    setSwarmNextAvailableAtMs,
    setSwarmProgressLoaded,
    setSwarmStreakCount,
    shipHpRef,
    showToast,
    spentEnergy,
    spentEnergyLoaded,
    spentEnergyRef,
    status,
    statusRef,
    swarmCompletionCount,
    swarmNextAvailableAtMs,
    swarmProgressLoaded,
    swarmStreakCount,
    user,
    userProfile,
    waveDefeatedRef,
    waveSize,
    waveSpawnedRef,
  });

  useCrazyCapyAudio({
    crazyCapyRef,
    crazyCapySoundscapeActive,
    isVillageFocused,
    musicEnabled,
  });

  const finishCrazyCapyRun = useCallback(() => {
    crazyCapyRef.current = null;
    crazyCapyHitAtByEnemyIdRef.current = {};
    setCrazyCapy(null);
  }, []);
  const redirectCrazyCapy = useCallback((row: number, col: number) => {
    const currentCapy = crazyCapyRef.current;
    if (!currentCapy) return false;
    const nextTarget = getCrazyCapyTargetNearCell(row, col, gridColsRef.current, boardRef.current);
    const nextCapy: CrazyCapyState = {
      ...currentCapy,
      targetRow: nextTarget.row,
      targetCol: nextTarget.col,
      facingScaleX: nextTarget.col < currentCapy.col ? -1 : 1,
    };
    crazyCapyRef.current = nextCapy;
    setCrazyCapy(nextCapy);
    return true;
  }, []);
  const scheduleNextVillageAvatarWalk = useCallback((fromMs = Date.now()) => {
    nextVillageAvatarWalkAtRef.current =
      fromMs + randomIntBetween(VILLAGE_AVATAR_IDLE_MIN_DELAY_MS, VILLAGE_AVATAR_IDLE_MAX_DELAY_MS);
  }, []);
  const finishVillageAvatarHarvestWalk = useCallback((completed: boolean) => {
    const pending = villageAvatarHarvestWalkRef.current;
    if (!pending) return;
    villageAvatarHarvestWalkRef.current = null;
    pending.resolve(completed);
  }, []);
  const playVillageAvatarHarvestWalk = useCallback((
    row: number,
    col: number,
    route: Array<{ row: number; col: number }>,
  ) => new Promise<boolean>((resolve) => {
    const board = boardRef.current;
    const currentGridCols = gridColsRef.current;
    const currentWalk = villageAvatarWalkRef.current;
    let visualStartRow = VILLAGE_AVATAR_CASTLE_DOOR_ROW;
    let visualStartCol = VILLAGE_AVATAR_CASTLE_DOOR_COL;
    let selectedRoute = route;

    if (currentWalk && currentWalk.stage !== 'harvesting') {
      visualStartRow = currentWalk.row;
      visualStartCol = currentWalk.col;

      const candidateStarts = [
        { row: currentWalk.currentRow, col: currentWalk.currentCol },
        currentWalk.targetRow != null && currentWalk.targetCol != null
          ? { row: currentWalk.targetRow, col: currentWalk.targetCol }
          : null,
      ].filter((candidate): candidate is { row: number; col: number } => (
        !!candidate && isWalkableVillagePathCell(board, candidate.row, candidate.col, currentGridCols)
      ));

      let best: { route: Array<{ row: number; col: number }>; score: number } | null = null;
      for (const start of candidateStarts) {
        const routeFromStart = getSoilHarvestRouteFromPathCell(board, row, col, currentGridCols, start);
        if (!routeFromStart) continue;
        const score =
          Math.hypot(currentWalk.row - start.row, currentWalk.col - start.col) +
          routeFromStart.reduce((total, step, index) => {
            const previous = index === 0 ? start : routeFromStart[index - 1];
            return total + Math.hypot(step.row - previous.row, step.col - previous.col);
          }, 0);
        if (!best || score < best.score) best = { route: routeFromStart, score };
      }

      if (best) {
        selectedRoute = best.route;
      }
    }

    const firstStep = selectedRoute[0];
    if (!firstStep) {
      resolve(false);
      return;
    }

    finishVillageAvatarHarvestWalk(false);
    villageAvatarHarvestWalkRef.current = { resolve };
    const now = Date.now();
    const harvestWaypoints = [...selectedRoute, { row, col }];
    let previousPoint = { row: visualStartRow, col: visualStartCol };
    const totalDistance = harvestWaypoints.reduce((total, point) => {
      const distance = Math.hypot(point.row - previousPoint.row, point.col - previousPoint.col);
      previousPoint = point;
      return total + distance;
    }, 0);
    const harvestTicks = Math.max(1, Math.ceil(VILLAGE_AVATAR_HARVEST_WALK_DURATION_MS / GAME_TICK_MS));
    const speedPerTick = Math.max(VILLAGE_AVATAR_WALK_SPEED_PER_TICK, totalDistance / harvestTicks);
    const nextWalk: VillageAvatarWalkState = {
      stage: 'harvesting',
      homeRow: firstStep.row,
      homeCol: firstStep.col,
      row: visualStartRow,
      col: visualStartCol,
      currentRow: firstStep.row,
      currentCol: firstStep.col,
      previousRow: null,
      previousCol: null,
      targetRow: firstStep.row,
      targetCol: firstStep.col,
      pauseUntil: now,
      stepsRemaining: selectedRoute.length,
      facingScaleX: getIsoHorizontalFacingScaleX(
        visualStartRow,
        visualStartCol,
        firstStep.row,
        firstStep.col,
      ),
      speedPerTick,
      harvestRoute: selectedRoute,
      harvestRouteIndex: 0,
      harvestTargetRow: row,
      harvestTargetCol: col,
    };
    villageAvatarWalkRef.current = nextWalk;
    setVillageAvatarWalk(nextWalk);
  }), [finishVillageAvatarHarvestWalk]);

  const activateCrazyCapy = useCallback(() => {
    if (crazyCapyRef.current) {
      showToast('Crazy Capy is already loose');
      return;
    }
    const capybaraStatueCount = boardRef.current.reduce((total, cell) => total + (cell.unit === 'capybara_statue' ? 1 : 0), 0);
    if (capybaraStatueCount <= 0) {
      showToast('Place a Capybara Statue first');
      return;
    }
    if (!CRAZY_CAPY_TEST_MODE && statusRef.current !== 'wave') {
      setShowCrazyCapyInfoModal(true);
      return;
    }
    if (!CRAZY_CAPY_TEST_MODE && crazyCapyChargeRatioRef.current < 1) {
      setShowCrazyCapyInfoModal(true);
      return;
    }

    const now = Date.now();
    const currentGridCols = gridColsRef.current;
    const target = getRandomCrazyCapyTarget(currentGridCols, boardRef.current);
    const durationMs = capybaraStatueCount * CRAZY_CAPY_DURATION_PER_STATUE_MS;
    const nextCapy: CrazyCapyState = {
      row: GRID_ROWS - 1.3,
      col: clamp(CASTLE_TARGET_COL, -0.35, currentGridCols - 0.65),
      targetRow: target.row,
      targetCol: target.col,
      activeUntil: now + durationMs,
      durationMs,
      spawnedAt: now,
      facingScaleX: target.col < CASTLE_TARGET_COL ? -1 : 1,
    };

    crazyCapyRef.current = nextCapy;
    crazyCapyHitAtByEnemyIdRef.current = {};
    crazyCapyChargeStartCaloriesRef.current = currentActiveCalories;
    setCrazyCapyChargeStartCalories(currentActiveCalories);
    setCrazyCapy(nextCapy);
    setCrazyCapyChargeRatio(0);
    showToast('Crazy Capy unleashed');
  }, [currentActiveCalories, showToast]);

  useEffect(() => {
    if (crazyCapyRef.current) {
      if (crazyCapyChargeRatioRef.current !== 0) setCrazyCapyChargeRatio(0);
      return;
    }
    if (!metricsReady) {
      if (crazyCapyChargeStartCaloriesRef.current == null && crazyCapyChargeRatioRef.current < 1) {
        setCrazyCapyChargeRatio(1);
      }
      return;
    }
    const nextRatio = getCrazyCapyChargeRatio(currentActiveCalories, crazyCapyChargeStartCaloriesRef.current);
    if (Math.abs(nextRatio - crazyCapyChargeRatioRef.current) > 0.0001) {
      setCrazyCapyChargeRatio(nextRatio);
    }
  }, [crazyCapy, currentActiveCalories, metricsReady, crazyCapyChargeStartCalories]);
  useEffect(() => {
    if (status !== 'wave' && villageAvatarStartCandidates.length > 0) return;
    finishVillageAvatarHarvestWalk(false);
    setVillageAvatarWalk(null);
    villageAvatarWalkRef.current = null;
    scheduleNextVillageAvatarWalk();
  }, [finishVillageAvatarHarvestWalk, scheduleNextVillageAvatarWalk, status, villageAvatarStartCandidates.length]);

  const crazyCapyActive = crazyCapySoundscapeActive;
  useEffect(() => {
    if (!crazyCapyActive || status === 'wave') return;
    const id = setInterval(() => {
      const currentCapy = crazyCapyRef.current;
      if (!currentCapy) return;
      const now = Date.now();
      const nextCapy = stepCrazyCapy(currentCapy, gridColsRef.current, now, boardRef.current);
      if (!nextCapy) {
        finishCrazyCapyRun();
        return;
      }
      crazyCapyRef.current = nextCapy;
      setCrazyCapy(nextCapy);
    }, GAME_TICK_MS);
    return () => clearInterval(id);
  }, [crazyCapyActive, finishCrazyCapyRun, status]);
  useEffect(() => {
    if (crazyCapyKnockoutEffects.length === 0) return;
    const id = setInterval(() => {
      const now = Date.now();
      setCrazyCapyKnockoutEffects((prev) => {
        const next = prev.filter((effect) => now - effect.startedAt < CRAZY_CAPY_KNOCKOUT_FLIGHT_MS);
        return next.length === prev.length ? [...next] : next;
      });
    }, GAME_TICK_MS);
    return () => clearInterval(id);
  }, [crazyCapyKnockoutEffects.length]);
  useEffect(() => {
    if (status === 'wave') return;

    const candidateByKey = new Map(
      villageAvatarStartCandidates.map((candidate) => [keyForCell(candidate.row, candidate.col), candidate] as const),
    );

    const chooseStartWalk = (now: number): VillageAvatarWalkState | null => {
      if (villageAvatarStartCandidates.length === 0) return null;
      const sortedCandidates = [...villageAvatarStartCandidates].sort(
        (a, b) =>
          Math.hypot(a.row - (CASTLE_ROW_MAX + 1), a.col - CASTLE_TARGET_COL) -
          Math.hypot(b.row - (CASTLE_ROW_MAX + 1), b.col - CASTLE_TARGET_COL),
      );
      const home = sortedCandidates[0];
      if (!home) return null;
      return {
        stage: 'exiting',
        homeRow: home.row,
        homeCol: home.col,
        row: VILLAGE_AVATAR_CASTLE_DOOR_ROW,
        col: VILLAGE_AVATAR_CASTLE_DOOR_COL,
        currentRow: home.row,
        currentCol: home.col,
        previousRow: null,
        previousCol: null,
        targetRow: home.row,
        targetCol: home.col,
        pauseUntil: now,
        stepsRemaining: randomIntBetween(VILLAGE_AVATAR_WALK_MIN_STEPS, VILLAGE_AVATAR_WALK_MAX_STEPS),
        facingScaleX: getIsoHorizontalFacingScaleX(
          VILLAGE_AVATAR_CASTLE_DOOR_ROW,
          VILLAGE_AVATAR_CASTLE_DOOR_COL,
          home.row,
          home.col,
        ),
      };
    };

    const getNeighborsFor = (
      row: number,
      col: number,
      previousRow: number | null,
      previousCol: number | null,
    ) => {
      const candidate = candidateByKey.get(keyForCell(row, col));
      if (!candidate) return [];
      if (candidate.neighbors.length <= 1) return candidate.neighbors;
      const filtered = candidate.neighbors.filter(
        (neighbor) => neighbor.row !== previousRow || neighbor.col !== previousCol,
      );
      return filtered.length > 0 ? filtered : candidate.neighbors;
    };
    const findPathRoute = (startRow: number, startCol: number, endRow: number, endCol: number) => {
      const startKey = keyForCell(startRow, startCol);
      const endKey = keyForCell(endRow, endCol);
      if (startKey === endKey) return [];

      const queue = [startKey];
      const visited = new Set([startKey]);
      const parentByKey = new Map<string, string | null>([[startKey, null]]);

      while (queue.length > 0) {
        const currentKey = queue.shift()!;
        if (currentKey === endKey) break;
        const currentCandidate = candidateByKey.get(currentKey);
        if (!currentCandidate) continue;
        for (const neighbor of currentCandidate.neighbors) {
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
      while (cursor && cursor !== startKey) {
        const [row, col] = cursor.split(':').map(Number);
        route.unshift({ row, col });
        cursor = parentByKey.get(cursor) ?? null;
      }
      return route;
    };
    const startReturnWalk = (currentWalk: VillageAvatarWalkState, now: number, routeToHome: Array<{ row: number; col: number }>) => {
      const nextTarget = routeToHome[0];
      if (!nextTarget) {
        const nextWalk: VillageAvatarWalkState = {
          ...currentWalk,
          stage: 'returning',
          targetRow: VILLAGE_AVATAR_CASTLE_DOOR_ROW,
          targetCol: VILLAGE_AVATAR_CASTLE_DOOR_COL,
          pauseUntil: now,
          facingScaleX: getIsoHorizontalFacingScaleX(
            currentWalk.currentRow,
            currentWalk.currentCol,
            VILLAGE_AVATAR_CASTLE_DOOR_ROW,
            VILLAGE_AVATAR_CASTLE_DOOR_COL,
            currentWalk.facingScaleX,
          ),
        };
        villageAvatarWalkRef.current = nextWalk;
        setVillageAvatarWalk(nextWalk);
        return;
      }

      const nextWalk: VillageAvatarWalkState = {
        ...currentWalk,
        stage: 'returning',
        targetRow: nextTarget.row,
        targetCol: nextTarget.col,
        pauseUntil: now,
        facingScaleX: getIsoHorizontalFacingScaleX(
          currentWalk.currentRow,
          currentWalk.currentCol,
          nextTarget.row,
          nextTarget.col,
          currentWalk.facingScaleX,
        ),
      };
      villageAvatarWalkRef.current = nextWalk;
      setVillageAvatarWalk(nextWalk);
    };

    const id = setInterval(() => {
      if (statusRef.current === 'wave') return;
      const now = Date.now();
      const currentWalk = villageAvatarWalkRef.current;

      if (!currentWalk) {
        if (now < nextVillageAvatarWalkAtRef.current) return;
        const nextWalk = chooseStartWalk(now);
        if (!nextWalk) {
          scheduleNextVillageAvatarWalk(now);
          return;
        }
        villageAvatarWalkRef.current = nextWalk;
        setVillageAvatarWalk(nextWalk);
        return;
      }

      const currentCell = getCell(boardRef.current, currentWalk.currentRow, currentWalk.currentCol, gridColsRef.current);
      const isHarvestTargetCell =
        currentWalk.stage === 'harvesting' &&
        currentWalk.currentRow === currentWalk.harvestTargetRow &&
        currentWalk.currentCol === currentWalk.harvestTargetCol;
      if (
        !isHarvestTargetCell &&
        (
          isHomeReservedCell(currentWalk.currentRow, currentWalk.currentCol) ||
          !isDecorativePathFoundation(currentCell.foundation) ||
          currentCell.wallHeight > 0 ||
          currentCell.unit
        )
      ) {
        if (currentWalk.stage === 'harvesting') finishVillageAvatarHarvestWalk(false);
        villageAvatarWalkRef.current = null;
        setVillageAvatarWalk(null);
        scheduleNextVillageAvatarWalk(now);
        return;
      }

      if (currentWalk.targetRow == null || currentWalk.targetCol == null) {
        if (now < currentWalk.pauseUntil) return;
        if (currentWalk.stage === 'harvesting') {
          const route = currentWalk.harvestRoute ?? [];
          const nextIndex = (currentWalk.harvestRouteIndex ?? 0) + 1;
          const nextTarget = route[nextIndex] ??
            (
              currentWalk.currentRow === currentWalk.harvestTargetRow &&
                currentWalk.currentCol === currentWalk.harvestTargetCol
                ? null
                : currentWalk.harvestTargetRow != null && currentWalk.harvestTargetCol != null
                  ? { row: currentWalk.harvestTargetRow, col: currentWalk.harvestTargetCol }
                  : null
            );
          if (!nextTarget) {
            villageAvatarWalkRef.current = null;
            setVillageAvatarWalk(null);
            scheduleNextVillageAvatarWalk(now);
            finishVillageAvatarHarvestWalk(true);
            return;
          }

          const nextWalk: VillageAvatarWalkState = {
            ...currentWalk,
            targetRow: nextTarget.row,
            targetCol: nextTarget.col,
            harvestRouteIndex: nextIndex,
            pauseUntil: now,
            facingScaleX: getIsoHorizontalFacingScaleX(
              currentWalk.currentRow,
              currentWalk.currentCol,
              nextTarget.row,
              nextTarget.col,
              currentWalk.facingScaleX,
            ),
          };
          villageAvatarWalkRef.current = nextWalk;
          setVillageAvatarWalk(nextWalk);
          return;
        }
        if (currentWalk.stage === 'wandering') {
          const routeToHome = findPathRoute(
            currentWalk.currentRow,
            currentWalk.currentCol,
            currentWalk.homeRow,
            currentWalk.homeCol,
          );
          if (routeToHome == null) {
            villageAvatarWalkRef.current = null;
            setVillageAvatarWalk(null);
            scheduleNextVillageAvatarWalk(now);
            return;
          }
          if (currentWalk.stepsRemaining <= routeToHome.length) {
            startReturnWalk(currentWalk, now, routeToHome);
            return;
          }

          const nextNeighbors = getNeighborsFor(
            currentWalk.currentRow,
            currentWalk.currentCol,
            currentWalk.previousRow,
            currentWalk.previousCol,
          );
          const viableNeighbors = nextNeighbors.filter((neighbor) => {
            const routeFromNeighbor = findPathRoute(
              neighbor.row,
              neighbor.col,
              currentWalk.homeRow,
              currentWalk.homeCol,
            );
            return routeFromNeighbor != null && routeFromNeighbor.length <= currentWalk.stepsRemaining - 1;
          });
          const nextTarget = viableNeighbors[Math.floor(Math.random() * viableNeighbors.length)] ?? null;
          if (!nextTarget) {
            startReturnWalk(currentWalk, now, routeToHome);
            return;
          }
          const nextWalk: VillageAvatarWalkState = {
            ...currentWalk,
            targetRow: nextTarget.row,
            targetCol: nextTarget.col,
            facingScaleX: getIsoHorizontalFacingScaleX(
              currentWalk.currentRow,
              currentWalk.currentCol,
              nextTarget.row,
              nextTarget.col,
              currentWalk.facingScaleX,
            ),
          };
          villageAvatarWalkRef.current = nextWalk;
          setVillageAvatarWalk(nextWalk);
          return;
        }

        if (currentWalk.stage === 'returning') {
          if (currentWalk.currentRow === currentWalk.homeRow && currentWalk.currentCol === currentWalk.homeCol) {
            const nextWalk: VillageAvatarWalkState = {
              ...currentWalk,
              targetRow: VILLAGE_AVATAR_CASTLE_DOOR_ROW,
              targetCol: VILLAGE_AVATAR_CASTLE_DOOR_COL,
              pauseUntil: now,
              facingScaleX: getIsoHorizontalFacingScaleX(
                currentWalk.currentRow,
                currentWalk.currentCol,
                VILLAGE_AVATAR_CASTLE_DOOR_ROW,
                VILLAGE_AVATAR_CASTLE_DOOR_COL,
                currentWalk.facingScaleX,
              ),
            };
            villageAvatarWalkRef.current = nextWalk;
            setVillageAvatarWalk(nextWalk);
            return;
          }

          const routeToHome = findPathRoute(
            currentWalk.currentRow,
            currentWalk.currentCol,
            currentWalk.homeRow,
            currentWalk.homeCol,
          );
          const nextTarget = routeToHome?.[0] ?? null;
          if (!nextTarget) {
            villageAvatarWalkRef.current = null;
            setVillageAvatarWalk(null);
            scheduleNextVillageAvatarWalk(now);
            return;
          }
          const nextWalk: VillageAvatarWalkState = {
            ...currentWalk,
            targetRow: nextTarget.row,
            targetCol: nextTarget.col,
            pauseUntil: now,
            facingScaleX: getIsoHorizontalFacingScaleX(
              currentWalk.currentRow,
              currentWalk.currentCol,
              nextTarget.row,
              nextTarget.col,
              currentWalk.facingScaleX,
            ),
          };
          villageAvatarWalkRef.current = nextWalk;
          setVillageAvatarWalk(nextWalk);
        }
        return;
      }

      if (now < currentWalk.pauseUntil) return;

      if (currentWalk.stage === 'harvesting') {
        const speedPerTick = currentWalk.speedPerTick ?? VILLAGE_AVATAR_WALK_SPEED_PER_TICK;
        let remainingStep = speedPerTick;
        let nextWalk: VillageAvatarWalkState = { ...currentWalk };

        while (nextWalk.targetRow != null && nextWalk.targetCol != null && remainingStep > 0) {
          const deltaRow = nextWalk.targetRow - nextWalk.row;
          const deltaCol = nextWalk.targetCol - nextWalk.col;
          const distance = Math.hypot(deltaRow, deltaCol);

          if (distance > remainingStep) {
            nextWalk = {
              ...nextWalk,
              row: nextWalk.row + (deltaRow / distance) * remainingStep,
              col: nextWalk.col + (deltaCol / distance) * remainingStep,
              facingScaleX: getIsoHorizontalFacingScaleX(
                nextWalk.row,
                nextWalk.col,
                nextWalk.targetRow,
                nextWalk.targetCol,
                nextWalk.facingScaleX,
              ),
            };
            villageAvatarWalkRef.current = nextWalk;
            setVillageAvatarWalk(nextWalk);
            return;
          }

          const arrivedRow = nextWalk.targetRow;
          const arrivedCol = nextWalk.targetCol;
          remainingStep -= distance;
          const arrivedAtHarvestTarget =
            arrivedRow === nextWalk.harvestTargetRow &&
            arrivedCol === nextWalk.harvestTargetCol;

          if (arrivedAtHarvestTarget) {
            villageAvatarWalkRef.current = null;
            setVillageAvatarWalk(null);
            scheduleNextVillageAvatarWalk(now);
            finishVillageAvatarHarvestWalk(true);
            return;
          }

          const route = nextWalk.harvestRoute ?? [];
          const nextIndex = (nextWalk.harvestRouteIndex ?? 0) + 1;
          const nextTarget = route[nextIndex] ??
            (
              nextWalk.harvestTargetRow != null && nextWalk.harvestTargetCol != null
                ? { row: nextWalk.harvestTargetRow, col: nextWalk.harvestTargetCol }
                : null
            );

          if (!nextTarget) {
            villageAvatarWalkRef.current = null;
            setVillageAvatarWalk(null);
            scheduleNextVillageAvatarWalk(now);
            finishVillageAvatarHarvestWalk(true);
            return;
          }

          nextWalk = {
            ...nextWalk,
            row: arrivedRow,
            col: arrivedCol,
            currentRow: arrivedRow,
            currentCol: arrivedCol,
            previousRow: nextWalk.currentRow,
            previousCol: nextWalk.currentCol,
            targetRow: nextTarget.row,
            targetCol: nextTarget.col,
            harvestRouteIndex: nextIndex,
            pauseUntil: now,
            facingScaleX: getIsoHorizontalFacingScaleX(
              arrivedRow,
              arrivedCol,
              nextTarget.row,
              nextTarget.col,
              nextWalk.facingScaleX,
            ),
          };
        }

        villageAvatarWalkRef.current = nextWalk;
        setVillageAvatarWalk(nextWalk);
        return;
      }

      const deltaRow = currentWalk.targetRow - currentWalk.row;
      const deltaCol = currentWalk.targetCol - currentWalk.col;
      const distance = Math.hypot(deltaRow, deltaCol);
      const speedPerTick = currentWalk.speedPerTick ?? VILLAGE_AVATAR_WALK_SPEED_PER_TICK;
      const step = Math.min(speedPerTick, distance);

      if (distance <= speedPerTick) {
        const arrivedAtCastleDoor =
          currentWalk.stage === 'returning' &&
          currentWalk.targetRow === VILLAGE_AVATAR_CASTLE_DOOR_ROW &&
          currentWalk.targetCol === VILLAGE_AVATAR_CASTLE_DOOR_COL;
        if (arrivedAtCastleDoor) {
          villageAvatarWalkRef.current = null;
          setVillageAvatarWalk(null);
          scheduleNextVillageAvatarWalk(now);
          return;
        }

        const nextWalk: VillageAvatarWalkState = {
          ...currentWalk,
          stage: currentWalk.stage === 'exiting' ? 'wandering' : currentWalk.stage,
          row: currentWalk.targetRow,
          col: currentWalk.targetCol,
          currentRow: currentWalk.targetRow,
          currentCol: currentWalk.targetCol,
          previousRow: currentWalk.currentRow,
          previousCol: currentWalk.currentCol,
          targetRow: null,
          targetCol: null,
          pauseUntil:
            currentWalk.stage === 'returning'
              ? now
              : now + randomIntBetween(VILLAGE_AVATAR_PAUSE_MIN_MS, VILLAGE_AVATAR_PAUSE_MAX_MS),
          stepsRemaining:
            currentWalk.stage === 'wandering'
              ? currentWalk.stepsRemaining - 1
              : currentWalk.stepsRemaining,
          facingScaleX: getIsoHorizontalFacingScaleX(
            currentWalk.currentRow,
            currentWalk.currentCol,
            currentWalk.targetRow,
            currentWalk.targetCol,
            currentWalk.facingScaleX,
          ),
        };
        villageAvatarWalkRef.current = nextWalk;
        setVillageAvatarWalk(nextWalk);
        return;
      }

      const nextWalk: VillageAvatarWalkState = {
        ...currentWalk,
        row: currentWalk.row + (deltaRow / distance) * step,
        col: currentWalk.col + (deltaCol / distance) * step,
        facingScaleX: getIsoHorizontalFacingScaleX(
          currentWalk.row,
          currentWalk.col,
          currentWalk.targetRow,
          currentWalk.targetCol,
          currentWalk.facingScaleX,
        ),
      };
      villageAvatarWalkRef.current = nextWalk;
      setVillageAvatarWalk(nextWalk);
    }, GAME_TICK_MS);

    return () => clearInterval(id);
  }, [finishVillageAvatarHarvestWalk, scheduleNextVillageAvatarWalk, status, villageAvatarStartCandidates]);
  const startSwarmVillageTour = useCallback(
    async (options?: { markSeen?: boolean }) => {
      if (!user?.uid || isTourActive || dragItem) return false;

      setIsHudCollapsed(false);
      setIsTrayCollapsed(false);
      setToolInspectCard(null);
      setSelectedTooltipCell(null);
      setToastMessage(null);

      await new Promise((resolve) => setTimeout(resolve, 400));

      if (
        !swarmScheduleTourRef.current ||
        !energyBalanceTourRef.current ||
        !toolTrayTourRef.current ||
        !prizeMachineTourRef.current
      ) {
        return false;
      }

      const { steps, config } = buildSwarmVillageTour({
        'swarm-schedule': swarmScheduleTourRef,
        'energy-balance': energyBalanceTourRef,
        'tool-tray': toolTrayTourRef,
        'prize-machine': prizeMachineTourRef,
      });

      if (steps.length === 0) return false;

      startTour(steps, config);

      if (options?.markSeen !== false) {
        AsyncStorage.setItem(getSwarmVillageTourStorageKey(user.uid), '1').catch(() => { });
      }

      return true;
    },
    [dragItem, isTourActive, startTour, user?.uid],
  );

  const { scheduleVillageSwarmNotifications } = useSwarmNotifications({
    boardLoaded,
    effectiveSwarmUnlockAtMs,
    readyRewardSnapshot,
    swarmProgressLoaded,
    userId: user?.uid,
  });

  const clearPendingToolDrag = useCallback(() => {
    if (toolDragTimeoutRef.current) {
      clearTimeout(toolDragTimeoutRef.current);
      toolDragTimeoutRef.current = null;
    }
  }, []);

  const showToolInspectCard = useCallback((tool: Tool, durationMs = 9000) => {
    setToolInspectFrameIndex(0);
    setToolInspectCard(buildToolInspectCard(tool, { hasCapybaraStatueUnlocked }));
    if (toolInspectTimerRef.current) clearTimeout(toolInspectTimerRef.current);
    toolInspectTimerRef.current = setTimeout(() => setToolInspectCard(null), durationMs);
  }, [hasCapybaraStatueUnlocked]);

  const hideToolInspectCard = useCallback(() => {
    if (toolInspectTimerRef.current) {
      clearTimeout(toolInspectTimerRef.current);
      toolInspectTimerRef.current = null;
    }
    setToolInspectCard(null);
  }, []);

  useEffect(() => {
    if (!toolInspectCard?.animationFrames || toolInspectCard.animationFrames.length <= 1) {
      setToolInspectFrameIndex(0);
      return;
    }
    const frameCount = toolInspectCard.animationFrames.length;
    const intervalId = setInterval(() => {
      setToolInspectFrameIndex((prev) => (prev + 1) % frameCount);
    }, toolInspectCard.animationIntervalMs ?? 160);
    return () => clearInterval(intervalId);
  }, [toolInspectCard]);

  const loadStarBalance = useCallback(async () => {
    const uid = user?.uid;
    if (!uid) {
      setStarBalance(0);
      setDisplayedStarBalance(0);
      setStarsSpentTotal(0);
      setPlayerXp(0);
      return;
    }

    let cachedGameState: CachedGameStateSnapshot | null = null;
    let cachedTestOverrides: CachedVillageTestOverrides | null = null;
    setStarsSpentTotal(0);
    setPlayerXp(0);

    try {
      const cached = await AsyncStorage.getItem(getGameStateCacheKey(uid));
      if (cached) {
        cachedGameState = JSON.parse(cached) as CachedGameStateSnapshot;
        setStarsSpentTotal(parseStoredPositiveInt(cachedGameState.starsSpent));
        setPlayerXp(parseStoredPositiveInt(cachedGameState.xp));
        const nextBalance = parseStarBalanceFromState(cachedGameState, cachedTestOverrides);
        setStarBalance(nextBalance);
        if (!starFlyoverBusyRef.current && !starCountAnimatingRef.current) setDisplayedStarBalance(nextBalance);
      }
    } catch {
      cachedGameState = null;
    }

    try {
      const rawOverrides = await AsyncStorage.getItem(PLAY_TEST_OVERRIDES_STORAGE_KEY);
      cachedTestOverrides = rawOverrides ? JSON.parse(rawOverrides) as CachedVillageTestOverrides : null;
      const nextBalance = parseStarBalanceFromState(cachedGameState, cachedTestOverrides);
      setStarBalance(nextBalance);
      if (!starFlyoverBusyRef.current && !starCountAnimatingRef.current) setDisplayedStarBalance(nextBalance);
    } catch {
      cachedTestOverrides = null;
      const nextBalance = parseStarBalanceFromState(cachedGameState, cachedTestOverrides);
      setStarBalance(nextBalance);
      if (!starFlyoverBusyRef.current && !starCountAnimatingRef.current) setDisplayedStarBalance(nextBalance);
    }

    try {
      const statsSnap = await getDoc(doc(db, 'PlayerStats', uid));
      if (!statsSnap.exists()) return;
      const serverState = statsSnap.data() as CachedGameStateSnapshot;
      setStarsSpentTotal(parseStoredPositiveInt(serverState.starsSpent));
      setPlayerXp(parseStoredPositiveInt(serverState.xp));
      const nextBalance = parseStarBalanceFromState(serverState, cachedTestOverrides);
      setStarBalance(nextBalance);
      if (!starFlyoverBusyRef.current && !starCountAnimatingRef.current) setDisplayedStarBalance(nextBalance);
    } catch (error) {
      if (__DEV__) console.warn('[SwarmVillage] Failed to load star balance:', error);
    }
  }, [user?.uid]);

  const loadVendingInventory = useCallback(async () => {
    const uid = user?.uid;
    if (!uid) {
      setVendingInventory([]);
      return;
    }

    try {
      const statsSnap = await getDoc(doc(db, 'PlayerStats', uid));
      if (!statsSnap.exists()) {
        setVendingInventory([]);
        return;
      }
      const data = statsSnap.data() as { vendingInventory?: unknown };
      const nextInventory = Array.isArray(data.vendingInventory)
        ? data.vendingInventory.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];
      setVendingInventory(nextInventory);
    } catch (error) {
      if (__DEV__) console.warn('[SwarmVillage] Failed to load vending inventory:', error);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!showVendingMachine || !vendingApiBaseUrl) return;
    let cancelled = false;
    const getToken = async () => (user ? await getIdToken(user) : null);
    setVendingMachinesConfig(null);
    fetchVendingConfig(vendingApiBaseUrl, getToken)
      .then((machines) => {
        if (!cancelled) setVendingMachinesConfig(machines ?? null);
      })
      .catch(() => {
        if (!cancelled) setVendingMachinesConfig([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showVendingMachine, user, vendingApiBaseUrl]);

  const runStarCountUp = useCallback((from: number, to: number, onComplete?: () => void) => {
    if (to === from) {
      setDisplayedStarBalance(to);
      onComplete?.();
      return;
    }
    starCountAnimatingRef.current = true;
    const start = Date.now();
    const durationMs = 720;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 2);
      const value = Math.round(from + (to - from) * eased);
      setDisplayedStarBalance(value);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        starCountAnimatingRef.current = false;
        onComplete?.();
      }
    };
    requestAnimationFrame(tick);
  }, []);

  const handleStarRewardFlyoverFinished = useCallback(() => {
    const payload = activeStarFlyoverRef.current;
    activeStarFlyoverRef.current = null;
    starFlyoverBusyRef.current = false;
    setStarRewardFlyover(null);
    if (!payload) {
      setDisplayedStarBalance(starBalanceRef.current);
      return;
    }
    runStarCountUp(payload.fromDisplayStars, payload.toTotalStarsEarned);
  }, [runStarCountUp]);

  const playVillageStarReward = useCallback(
    ({ delta, toTotalStarsEarned }: { delta: number; toTotalStarsEarned: number }) => {
      if (delta <= 0 || starFlyoverBusyRef.current) return false;
      starFlyoverBusyRef.current = true;
      const fromDisplayStars = displayedStarBalanceRef.current;
      const payload: StarRewardFlyoverPayload = {
        id: Date.now(),
        delta,
        fromDisplayStars,
        toTotalStarsEarned,
      };
      activeStarFlyoverRef.current = payload;
      setDisplayedStarBalance(fromDisplayStars);
      setStarRewardFlyover(payload);
      return true;
    },
    [],
  );

  useEffect(() => {
    if (starRewardFlyover || starFlyoverBusyRef.current || starCountAnimatingRef.current) return;
    setDisplayedStarBalance(starBalance);
  }, [starBalance, starRewardFlyover]);

  const triggerSparkle = useCallback((row: number, col: number, variant: HealSparkle['variant'] = 'heal') => {
    const id = ++sparkleIdCounter.current;
    setActiveSparkles((prev) => [...prev, { id, row, col, variant }]);
  }, []);

  const removeSparkle = useCallback((id: number) => {
    setActiveSparkles((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const triggerCrazyCapyTapPulse = useCallback((row: number, col: number) => {
    const id = ++crazyCapyTapPulseIdCounter.current;
    setCrazyCapyTapPulses((prev) => [...prev, { id, row, col }]);
  }, []);

  const removeCrazyCapyTapPulse = useCallback((id: number) => {
    setCrazyCapyTapPulses((prev) => prev.filter((pulse) => pulse.id !== id));
  }, []);

  const removeFootballExplosion = useCallback((id: number) => {
    setFootballExplosions((prev) => prev.filter((effect) => effect.id !== id));
  }, []);

  const spendEnergy = useCallback(
    (amount: number, options?: { silent?: boolean }) => {
      if (availableEnergy < amount) {
        if (!options?.silent) showToast(`Need ${formatCompactNumber(amount)} energy`);
        return false;
      }
      setSpentEnergy((prev) => prev + amount);
      return true;
    },
    [availableEnergy, showToast],
  );

  const spendStars = useCallback(
    async (amount: number, options?: { silent?: boolean }) => {
      const uid = user?.uid;
      const normalizedAmount = Math.max(1, Math.floor(amount));
      if (!uid) {
        if (!options?.silent) showToast('Sign in to spend stars');
        return false;
      }
      if (starBalanceRef.current < normalizedAmount) {
        if (!options?.silent) showToast(`Need ${normalizedAmount} stars`);
        return false;
      }

      const nextStarsSpent = starsSpentTotalRef.current + normalizedAmount;
      const nextStarBalance = Math.max(0, starBalanceRef.current - normalizedAmount);

      try {
        await setDoc(
          doc(db, 'PlayerStats', uid),
          {
            starsSpent: nextStarsSpent,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        await mergeGameStateCache(uid, { starsSpent: nextStarsSpent });
      } catch (error) {
        if (__DEV__) console.warn('[SwarmVillage] Failed to spend stars:', error);
        if (!options?.silent) showToast('Star spend failed');
        return false;
      }

      starsSpentTotalRef.current = nextStarsSpent;
      starBalanceRef.current = nextStarBalance;
      setStarsSpentTotal(nextStarsSpent);
      setStarBalance(nextStarBalance);
      if (!starFlyoverBusyRef.current && !starCountAnimatingRef.current) {
        setDisplayedStarBalance(nextStarBalance);
      }
      return true;
    },
    [showToast, user?.uid],
  );

  useEffect(() => {
    if (!metricsReady) return;
    logEnergyBreakdown('swarm-village', sinceAprilMetrics, energyModifierContext);
  }, [energyModifierContext, metricsReady, sinceAprilMetrics]);

  /* ── ref syncs ─────────────────────────────────────────── */
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { shipHpRef.current = shipHp; }, [shipHp]);
  useEffect(() => { enemiesRef.current = enemies; }, [enemies]);
  useEffect(() => { projectilesRef.current = projectiles; }, [projectiles]);
  useEffect(() => { waveSpawnedRef.current = waveSpawned; }, [waveSpawned]);
  useEffect(() => { waveDefeatedRef.current = waveDefeated; }, [waveDefeated]);
  useEffect(() => { translateRef.current = translate; }, [translate]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => {
    if (!quarterbackAim) return;

    if (status !== 'wave' && enemies.length === 0) {
      setQuarterbackAim(null);
      return;
    }

    if (!isWithinBoard(quarterbackAim.row, quarterbackAim.col, gridCols)) {
      setQuarterbackAim(null);
      return;
    }

    const cell = getCell(board, quarterbackAim.row, quarterbackAim.col, gridCols);
    if (cell.unit !== 'quarterback') setQuarterbackAim(null);
  }, [board, enemies.length, gridCols, quarterbackAim, status]);
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (toolDragTimeoutRef.current) clearTimeout(toolDragTimeoutRef.current);
    if (toolInspectTimerRef.current) clearTimeout(toolInspectTimerRef.current);
  }, []);
  useEffect(() => {
    const computeCountdown = () => Math.max(0, effectiveSwarmUnlockAtMs - Date.now());
    setCountdownMs(computeCountdown());
    const id = setInterval(() => setCountdownMs(computeCountdown()), 1000);
    return () => clearInterval(id);
  }, [effectiveSwarmUnlockAtMs]);

  const restoreSavedDraft = useCallback((options?: { silent?: boolean }) => {
    if (!draftBaselineReady) return;
    const snapshot = savedDraftRef.current;
    const restoredBoard = cloneBoardCells(snapshot.board);
    gridColsRef.current = snapshot.gridCols;
    setGridCols(snapshot.gridCols);
    setBoard(restoredBoard);
    boardRef.current = restoredBoard;
    setSpentEnergy(snapshot.spentEnergy);
    setSelectedCellKey(null);
    setSelectedTooltipCell(null);
    setHoverCell(null);
    setDragItem(null);
    setDragPos(null);
    quarterbackAimRef.current = null;
    setQuarterbackAim(null);
    setActiveSparkles([]);
    setFootballExplosions([]);
    setCrazyCapyTapPulses([]);
    setShowExpansionModal(false);
    if (!options?.silent) showToast('Unsaved village changes discarded');
  }, [draftBaselineReady, showToast]);

  const applyNeighborhoodSeed = useCallback(async (seed: NeighborhoodSeedTemplate) => {
    const nextGridCols = Math.max(DEFAULT_GRID_COLS, seed.initialGridCols);
    const nextBoard = sanitizeCastleFootprint(createBoard(nextGridCols), nextGridCols);

    for (const cell of seed.foundations) {
      if (cell.row < 0 || cell.row >= GRID_ROWS) continue;
      if (cell.col < 0 || cell.col >= nextGridCols) continue;
      const index = boardIndex(cell.row, cell.col, nextGridCols);
      nextBoard[index] = {
        ...nextBoard[index],
        foundation: cell.foundation,
      };
    }

    for (const poi of seed.notablePlaces) {
      if (poi.kind !== 'neighbor_house' || !poi.inInitialBounds) continue;
      if (poi.row < 0 || poi.row >= GRID_ROWS) continue;
      if (poi.col < 0 || poi.col >= nextGridCols) continue;
      if (isHomeReservedCell(poi.row, poi.col)) continue;

      const index = boardIndex(poi.row, poi.col, nextGridCols);
      const cell = nextBoard[index];
      if (!cell || cell.foundation !== 'grass' || cell.wallHeight > 0 || cell.unit) continue;

      nextBoard[index] = {
        ...cell,
        unit: 'house',
        unitHp: HOUSE_MAX_HP,
        unitMaxHp: HOUSE_MAX_HP,
        unitLevel: 0,
        unitRotation: poi.flipHorizontal ? 1 : 0,
      };
    }

    gridColsRef.current = nextGridCols;
    boardRef.current = nextBoard;
    setGridCols(nextGridCols);
    setBoard(nextBoard);
    setSelectedCellKey(null);
    setSelectedTooltipCell(null);
    setHoverCell(null);
    setDragItem(null);
    setDragPos(null);
    setToolInspectCard(null);
    quarterbackAimRef.current = null;
    setQuarterbackAim(null);
    setShowExpansionModal(false);

    const didSave = await persistVillageSnapshot(
      createDraftSnapshot(nextBoard, nextGridCols, spentEnergyRef.current),
      { silent: true },
    );

    showToast(didSave ? 'Neighborhood map ready' : 'Neighborhood map applied, but save failed', 2600);
  }, [persistVillageSnapshot, showToast]);

  useEffect(() => {
    if (!user?.uid) {
      setSwarmVillageTourBootAttempted(false);
      return;
    }
    if (
      !boardLoaded ||
      !spentEnergyLoaded ||
      !swarmProgressLoaded ||
      isNeighborhoodSetupVisible ||
      swarmVillageTourBootAttempted ||
      isTourActive ||
      dragItem
    ) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    AsyncStorage.multiGet([
      getSwarmVillageTourStorageKey(user.uid),
      getNeighborhoodSetupDecisionKey(user.uid),
    ])
      .then((entries) => {
        if (cancelled) return;
        const seenValue = entries[0]?.[1] ?? null;
        const neighborhoodSelectionValue = entries[1]?.[1] ?? null;
        if (!isNeighborhoodSelectionComplete(neighborhoodSelectionValue)) {
          return;
        }
        if (seenValue) {
          setSwarmVillageTourBootAttempted(true);
          return;
        }

        timer = setTimeout(() => {
          if (cancelled) return;
          startSwarmVillageTour()
            .then((started) => {
              if (!cancelled && started) {
                setSwarmVillageTourBootAttempted(true);
              }
            })
            .catch(() => { });
        }, 700);
      })
      .catch(() => {
        if (cancelled) return;
        AsyncStorage.getItem(getNeighborhoodSetupDecisionKey(user.uid))
          .then((neighborhoodSelectionValue) => {
            if (cancelled || !isNeighborhoodSelectionComplete(neighborhoodSelectionValue)) return;
            timer = setTimeout(() => {
              if (cancelled) return;
              startSwarmVillageTour()
                .then((started) => {
                  if (!cancelled && started) {
                    setSwarmVillageTourBootAttempted(true);
                  }
                })
                .catch(() => { });
            }, 700);
          })
          .catch(() => { });
      });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    boardLoaded,
    dragItem,
    isNeighborhoodSetupVisible,
    isTourActive,
    neighborhoodSelectionVersion,
    spentEnergyLoaded,
    startSwarmVillageTour,
    swarmProgressLoaded,
    swarmVillageTourBootAttempted,
    user?.uid,
  ]);

  const awardSpendableStars = useCallback(async (amount: number) => {
    const uid = user?.uid;
    if (!uid) throw new Error('Sign in to earn stars');
    const normalizedAmount = Math.max(1, Math.floor(amount));

    let nextPartyBonusStarsBank = normalizedAmount;
    try {
      const cached = await AsyncStorage.getItem(getGameStateCacheKey(uid));
      const parsed = cached ? JSON.parse(cached) as { partyBonusStarsBank?: unknown } : {};
      const currentBank =
        typeof parsed.partyBonusStarsBank === 'number' && Number.isFinite(parsed.partyBonusStarsBank)
          ? Math.max(0, Math.floor(parsed.partyBonusStarsBank))
          : 0;
      nextPartyBonusStarsBank = currentBank + normalizedAmount;
    } catch {
      nextPartyBonusStarsBank = normalizedAmount;
    }

    await setDoc(
      doc(db, 'PlayerStats', uid),
      { partyBonusStarsBank: increment(normalizedAmount), updatedAt: serverTimestamp() },
      { merge: true },
    );
    await mergeGameStateCache(uid, { partyBonusStarsBank: nextPartyBonusStarsBank });
  }, [user?.uid]);

  const handleVendingPull = useCallback(
    async (result: VendingPullCommittedResult) => {
      const uid = user?.uid;
      if (!uid) return;

      const newSpent = result.newStarsSpent ?? (starsSpentTotal + result.cost);
      const newInventory =
        result.newInventory ??
        (vendingInventory.includes(result.itemId)
          ? vendingInventory
          : [...vendingInventory, result.itemId]);
      const spentDelta = Math.max(0, newSpent - starsSpentTotal);
      const nextStarBalance = Math.max(0, starBalanceRef.current - spentDelta);

      starsSpentTotalRef.current = newSpent;
      starBalanceRef.current = nextStarBalance;
      setStarsSpentTotal(newSpent);
      setVendingInventory(newInventory);
      setStarBalance(nextStarBalance);
      if (!starFlyoverBusyRef.current && !starCountAnimatingRef.current) {
        setDisplayedStarBalance(nextStarBalance);
      }

      try {
        await setDoc(
          doc(db, 'PlayerStats', uid),
          {
            starsSpent: newSpent,
            vendingInventory: newInventory,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        await mergeGameStateCache(uid, {
          starsSpent: newSpent,
          vendingInventory: newInventory,
        });
      } catch (error) {
        if (__DEV__) console.warn('[SwarmVillage] Failed to persist vending pull:', error);
      }
    },
    [starsSpentTotal, user?.uid, vendingInventory],
  );

  const handleHarvestSoil = useCallback(async (row: number, col: number) => {
    const harvestKey = keyForCell(row, col);
    if (harvestInFlightRef.current === harvestKey) return;
    const currentCell = getCell(boardRef.current, row, col, gridColsRef.current);
    if (!isSoilCropReady(currentCell, swarmCompletionCount)) {
      showToast('Finish 3 swarms after planting to harvest');
      return;
    }
    const initialHarvestRoute = getSoilHarvestRoute(boardRef.current, row, col, gridColsRef.current);
    if (!initialHarvestRoute) {
      showToast('Connect this soil to the Starter House path first');
      return;
    }

    harvestInFlightRef.current = harvestKey;
    setHarvestingCellKey(harvestKey);
    try {
      if (hasUnsavedChanges) {
        const didSaveDraft = await saveDraftToCache({ silent: true });
        if (!didSaveDraft) {
          showToast('Save your village before harvesting');
          return;
        }
      }

      const sourceBoard = cloneBoardCells(boardRef.current);
      const harvestRoute = getSoilHarvestRoute(sourceBoard, row, col, gridColsRef.current);
      if (!harvestRoute) {
        showToast('Connect this soil to the Starter House path first');
        return;
      }
      const didReachSoil = await playVillageAvatarHarvestWalk(row, col, harvestRoute);
      if (!didReachSoil) {
        showToast('Harvest interrupted');
        return;
      }

      const nextBoard = cloneBoardCells(sourceBoard);
      const targetIndex = boardIndex(row, col, gridColsRef.current);
      const sourceCell = nextBoard[targetIndex];
      if (!isSoilCropReady(sourceCell, swarmCompletionCount)) {
        showToast('That wheat is not ready yet');
        return;
      }

      nextBoard[targetIndex] = {
        ...sourceCell,
        soilPlacedAt: Date.now(),
        soilStartSwarmCompletionCount: swarmCompletionCount,
      };

      boardRef.current = nextBoard;
      setBoard(nextBoard);

      const nextSnapshot = createDraftSnapshot(
        nextBoard,
        gridColsRef.current,
        spentEnergyRef.current,
      );
      const didPersistBoard = await persistVillageSnapshot(nextSnapshot, { silent: true });
      if (!didPersistBoard) {
        boardRef.current = sourceBoard;
        setBoard(sourceBoard);
        showToast('Harvest failed');
        return;
      }

      try {
        await awardSpendableStars(1);
      } catch (error) {
        boardRef.current = sourceBoard;
        setBoard(sourceBoard);
        await persistVillageSnapshot(
          createDraftSnapshot(
            sourceBoard,
            gridColsRef.current,
            spentEnergyRef.current,
          ),
          { silent: true },
        );
        if (__DEV__) console.warn('[SwarmVillage] Failed to award harvest star:', error);
        showToast('Harvest reward failed');
        return;
      }

      const nextStarBalance = starBalanceRef.current + 1;
      setStarBalance(nextStarBalance);
      if (!playVillageStarReward({ delta: 1, toTotalStarsEarned: nextStarBalance })) {
        setDisplayedStarBalance(nextStarBalance);
      }
      triggerSparkle(row, col);
      showToast('Harvested wheat +1★');
    } finally {
      harvestInFlightRef.current = null;
      setHarvestingCellKey(null);
    }
  }, [
    awardSpendableStars,
    hasUnsavedChanges,
    persistVillageSnapshot,
    playVillageAvatarHarvestWalk,
    playVillageStarReward,
    saveDraftToCache,
    showToast,
    swarmCompletionCount,
    triggerSparkle,
  ]);

  const handleCollectWindmillReward = useCallback(async (row: number, col: number) => {
    const collectKey = keyForCell(row, col);
    if (harvestInFlightRef.current === collectKey) return;
    const currentCell = getCell(boardRef.current, row, col, gridColsRef.current);
    if (!isWindmillRewardReady(currentCell, swarmCompletionCount)) {
      showToast('This windmill still needs 5 successful swarms');
      return;
    }

    harvestInFlightRef.current = collectKey;
    setHarvestingCellKey(collectKey);
    try {
      if (hasUnsavedChanges) {
        const didSaveDraft = await saveDraftToCache({ silent: true });
        if (!didSaveDraft) {
          showToast('Save your village before collecting');
          return;
        }
      }

      const sourceBoard = cloneBoardCells(boardRef.current);
      const nextBoard = cloneBoardCells(sourceBoard);
      const targetIndex = boardIndex(row, col, gridColsRef.current);
      const sourceCell = nextBoard[targetIndex];
      if (!isWindmillRewardReady(sourceCell, swarmCompletionCount) || sourceCell.unit !== 'windmill') {
        showToast('That windmill is not ready yet');
        return;
      }

      nextBoard[targetIndex] = {
        ...sourceCell,
        unitRewardBaselineCompletionCount: swarmCompletionCount,
      };

      boardRef.current = nextBoard;
      setBoard(nextBoard);

      const nextSnapshot = createDraftSnapshot(
        nextBoard,
        gridColsRef.current,
        spentEnergyRef.current,
      );
      const didPersistBoard = await persistVillageSnapshot(nextSnapshot, { silent: true });
      if (!didPersistBoard) {
        boardRef.current = sourceBoard;
        setBoard(sourceBoard);
        showToast('Collection failed');
        return;
      }

      try {
        await awardSpendableStars(WINDMILL_STAR_REWARD);
      } catch (error) {
        boardRef.current = sourceBoard;
        setBoard(sourceBoard);
        await persistVillageSnapshot(
          createDraftSnapshot(
            sourceBoard,
            gridColsRef.current,
            spentEnergyRef.current,
          ),
          { silent: true },
        );
        if (__DEV__) console.warn('[SwarmVillage] Failed to award windmill stars:', error);
        showToast('Windmill reward failed');
        return;
      }

      const nextStarBalance = starBalanceRef.current + WINDMILL_STAR_REWARD;
      setStarBalance(nextStarBalance);
      if (!playVillageStarReward({ delta: WINDMILL_STAR_REWARD, toTotalStarsEarned: nextStarBalance })) {
        setDisplayedStarBalance(nextStarBalance);
      }
      triggerSparkle(row, col);
      showToast(`Windmill reward +${WINDMILL_STAR_REWARD}★`);
    } finally {
      harvestInFlightRef.current = null;
      setHarvestingCellKey(null);
    }
  }, [
    awardSpendableStars,
    hasUnsavedChanges,
    persistVillageSnapshot,
    playVillageStarReward,
    saveDraftToCache,
    showToast,
    swarmCompletionCount,
    triggerSparkle,
  ]);

  const handleOpenChest = useCallback(async (row: number, col: number) => {
    const chestKey = keyForCell(row, col);
    if (harvestInFlightRef.current === chestKey) return;
    const uid = user?.uid;
    const currentCell = getCell(boardRef.current, row, col, gridColsRef.current);
    if (currentCell.unit !== 'chest') {
      showToast('That chest is no longer here');
      return;
    }
    if (!uid) {
      showToast('Sign in to open chests');
      return;
    }
    const fullHealthHomeCount = getFullHealthHomeCount(boardRef.current);
    if (fullHealthHomeCount < CHEST_REQUIRED_FULL_HEALTH_HOMES) {
      showToast(`Need ${CHEST_REQUIRED_FULL_HEALTH_HOMES} homes at full health to open this chest`);
      return;
    }
    if (!isChestRewardReady(currentCell, swarmCompletionCount, fullHealthHomeCount)) {
      showToast(`This chest needs ${CHEST_STREAK_REQUIREMENT} defended swarms after placement`);
      return;
    }

    harvestInFlightRef.current = chestKey;
    setHarvestingCellKey(chestKey);
    try {
      if (hasUnsavedChanges) {
        const didSaveDraft = await saveDraftToCache({ silent: true });
        if (!didSaveDraft) {
          showToast('Save your village before opening a chest');
          return;
        }
      }

      const sourceBoard = cloneBoardCells(boardRef.current);
      const nextBoard = cloneBoardCells(sourceBoard);
      const targetIndex = boardIndex(row, col, gridColsRef.current);
      const sourceCell = nextBoard[targetIndex];
      if (sourceCell.unit !== 'chest') {
        showToast('That chest is no longer here');
        return;
      }

      nextBoard[targetIndex] = {
        ...sourceCell,
        unit: null,
        unitHp: 0,
        unitMaxHp: 0,
        unitLevel: 0,
        unitFacingScaleX: 1,
        unitLastAttackAt: 0,
        unitRewardBaselineCompletionCount: null,
      };

      boardRef.current = nextBoard;
      setBoard(nextBoard);

      const nextSnapshot = createDraftSnapshot(
        nextBoard,
        gridColsRef.current,
        spentEnergyRef.current,
      );
      const didPersistBoard = await persistVillageSnapshot(nextSnapshot, { silent: true });
      if (!didPersistBoard) {
        boardRef.current = sourceBoard;
        setBoard(sourceBoard);
        showToast('Chest failed to open');
        return;
      }

      const reward = pickWeightedValue(CHEST_STAR_REWARD_TABLE);

      try {
        await awardSpendableStars(reward.stars);
        const nextStarBalance = starBalanceRef.current + reward.stars;
        setStarBalance(nextStarBalance);
        if (!playVillageStarReward({ delta: reward.stars, toTotalStarsEarned: nextStarBalance })) {
          setDisplayedStarBalance(nextStarBalance);
        }
        triggerSparkle(row, col);
        showToast(`Chest opened — +${reward.stars}★`);
      } catch (error) {
        boardRef.current = sourceBoard;
        setBoard(sourceBoard);
        await persistVillageSnapshot(
          createDraftSnapshot(
            sourceBoard,
            gridColsRef.current,
            spentEnergyRef.current,
          ),
          { silent: true },
        );
        if (__DEV__) console.warn('[SwarmVillage] Failed to resolve chest reward:', error);
        showToast('Chest reward failed');
        return;
      }
    } finally {
      harvestInFlightRef.current = null;
      setHarvestingCellKey(null);
    }
  }, [
    awardSpendableStars,
    hasUnsavedChanges,
    persistVillageSnapshot,
    playVillageStarReward,
    saveDraftToCache,
    showToast,
    swarmCompletionCount,
    triggerSparkle,
    user?.uid,
  ]);

  const activateForestSpirit = useCallback(async () => {
    if (forestSpiritUseInFlightRef.current) return;
    if (!forestSpiritProgressLoaded) {
      showToast('Loading Forest Spirit');
      return;
    }

    const sourceProgress = forestSpiritProgressRef.current;
    if (sourceProgress.charges <= 0) {
      showToast(`Open Fitmoji ${FOREST_SPIRIT_REQUIRED_STREAK_DAYS} days in a row to earn Forest Spirit`, 2600);
      return;
    }

    forestSpiritUseInFlightRef.current = true;
    try {
      if (hasUnsavedChanges) {
        const didSaveDraft = await saveDraftToCache({ silent: true });
        if (!didSaveDraft) {
          showToast('Save your village before using Forest Spirit');
          return;
        }
      }

      const sourceBoard = cloneBoardCells(boardRef.current);
      const healed = applyForestSpiritHealToBoard(sourceBoard, gridColsRef.current);
      if (healed.totalHpRestored <= 0 || healed.healedCells.length === 0) {
        showToast('All village items are healthy');
        return;
      }

      const nextProgress = {
        ...sourceProgress,
        charges: Math.max(0, sourceProgress.charges - 1),
      };

      try {
        await AsyncStorage.setItem(FOREST_SPIRIT_PROGRESS_CACHE_KEY, JSON.stringify(nextProgress));
        applyForestSpiritProgressSnapshot(nextProgress);
      } catch (error) {
        if (__DEV__) console.warn('[SwarmVillage] Failed to consume Forest Spirit:', error);
        showToast('Forest Spirit failed');
        return;
      }

      boardRef.current = healed.board;
      setBoard(healed.board);

      const didPersistBoard = await persistVillageSnapshot(
        createDraftSnapshot(healed.board, gridColsRef.current, spentEnergyRef.current),
        { silent: true },
      );
      if (!didPersistBoard) {
        boardRef.current = sourceBoard;
        setBoard(sourceBoard);
        applyForestSpiritProgressSnapshot(sourceProgress);
        AsyncStorage.setItem(FOREST_SPIRIT_PROGRESS_CACHE_KEY, JSON.stringify(sourceProgress)).catch((error) => {
          if (__DEV__) console.warn('[SwarmVillage] Failed to restore Forest Spirit charge:', error);
        });
        showToast('Forest Spirit failed');
        return;
      }

      healed.healedCells.forEach((cell) => triggerSparkle(cell.row, cell.col));
      const itemLabel = healed.healedCells.length === 1 ? 'item' : 'items';
      void syncForestSpiritProgressToFirebase(nextProgress, {
        type: 'powerup_use',
        healedItemCount: healed.healedCells.length,
        totalHpRestored: healed.totalHpRestored,
        remainingCharges: nextProgress.charges,
      });
      showToast(`Forest Spirit healed ${healed.healedCells.length} ${itemLabel}`, 2400);
    } finally {
      forestSpiritUseInFlightRef.current = false;
    }
  }, [
    applyForestSpiritProgressSnapshot,
    forestSpiritProgressLoaded,
    hasUnsavedChanges,
    persistVillageSnapshot,
    saveDraftToCache,
    showToast,
    syncForestSpiritProgressToFirebase,
    triggerSparkle,
  ]);

  const handleConfirmMapExpansion = useCallback(() => {
    if (!metricsReady) {
      showToast('Step balance still loading');
      return;
    }
    if (pendingExpansionColumns <= 0) {
      showToast('Choose at least one column');
      return;
    }
    if (availableEnergy < expansionEnergyCost) {
      showToast(`Need ${formatCompactNumber(expansionEnergyCost)} energy`);
      return;
    }

    const nextGridCols = gridColsRef.current + pendingExpansionColumns;
    const nextBoard = appendColumns(boardRef.current, gridColsRef.current, pendingExpansionColumns);
    boardRef.current = nextBoard;
    gridColsRef.current = nextGridCols;
    setBoard(nextBoard);
    setGridCols(nextGridCols);
    setSpentEnergy((prev) => prev + expansionEnergyCost);
    setSelectedCellKey(null);
    setSelectedTooltipCell(null);
    setHoverCell(null);
    setShowExpansionModal(false);
    setPendingExpansionColumns(1);
    showToast(`Expanded map by ${pendingExpansionColumns} column${pendingExpansionColumns === 1 ? '' : 's'}`);
  }, [availableEnergy, expansionEnergyCost, metricsReady, pendingExpansionColumns, showToast]);

  const promptForUnsavedExit = useCallback((onLeave: () => void) => {
    Alert.alert(
      'Wait! Changes May Be Lost',
      'Don\t let all your hard work go to waste.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            restoreSavedDraft({ silent: true });
            onLeave();
          },
        },
        {
          text: 'Save & Exit',
          onPress: () => {
            void (async () => {
              const didSave = await saveDraftToCache({ silent: true });
              if (!didSave) return;
              onLeave();
            })();
          },
        },
      ],
    );
  }, [restoreSavedDraft, saveDraftToCache]);

  const handleExitPress = useCallback(() => {
    if (completedSwarmAutosaveState !== 'idle') {
      showToast('Saving swarm result...');
      return;
    }
    if (!hasUnsavedChanges) {
      if (onExit) {
        onExit();
      } else {
        router.back();
      }
      return;
    }
    promptForUnsavedExit(() => {
      allowNavigationRef.current = true;
      if (onExit) {
        onExit();
      } else {
        router.back();
      }
    });
  }, [completedSwarmAutosaveState, hasUnsavedChanges, promptForUnsavedExit, router, showToast, onExit]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowNavigationRef.current) {
        allowNavigationRef.current = false;
        return;
      }
      if (completedSwarmAutosaveState !== 'idle') {
        event.preventDefault();
        showToast('Saving swarm result...');
        return;
      }
      if (!hasUnsavedChanges) return;

      event.preventDefault();
      promptForUnsavedExit(() => {
        allowNavigationRef.current = true;
        navigation.dispatch(event.data.action);
      });
    });
    return unsubscribe;
  }, [completedSwarmAutosaveState, hasUnsavedChanges, navigation, promptForUnsavedExit, showToast]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        previousState === 'active' &&
        nextState === 'background' &&
        hasUnsavedChanges &&
        completedSwarmAutosaveState === 'idle'
      ) {
        restoreSavedDraft({ silent: true });
        pendingDiscardNoticeRef.current = true;
        return;
      }

      if (nextState === 'active' && pendingDiscardNoticeRef.current) {
        pendingDiscardNoticeRef.current = false;
        showToast('Unsaved village draft was discarded');
      }
    });
    return () => subscription.remove();
  }, [completedSwarmAutosaveState, hasUnsavedChanges, restoreSavedDraft, showToast]);

  useEffect(() => {
    void loadStarBalance();
  }, [loadStarBalance]);

  useEffect(() => {
    void loadVendingInventory();
  }, [loadVendingInventory]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      markForestSpiritOpenedToday();
      void loadStarBalance();
      void loadVendingInventory();
      void scheduleVillageSwarmNotifications();
    });
    return unsubscribe;
  }, [loadStarBalance, loadVendingInventory, markForestSpiritOpenedToday, navigation, scheduleVillageSwarmNotifications]);

  useEffect(() => {
    setToolPage((prev) => Math.min(prev, totalToolPages - 1));
  }, [totalToolPages]);

  useEffect(() => {
    if (!user?.uid) {
      void clearSwarmWidget();
      return;
    }
    if (!swarmProgressLoaded) return;

    void upsertSwarmWidget({
      nextSwarmAtMs: Math.max(0, effectiveSwarmUnlockAtMs),
      isUnlocked: isSwarmUnlocked,
      starsBalance: starBalance,
      energyBalance: availableEnergy,
      streakCount: swarmStreakCount,
    });
  }, [
    availableEnergy,
    effectiveSwarmUnlockAtMs,
    isSwarmUnlocked,
    starBalance,
    swarmStreakCount,
    swarmProgressLoaded,
    user?.uid,
  ]);

  /* ── viewport helpers ──────────────────────────────────── */
  const baseViewport = useMemo(
    () => ({ x: width / 2 - boardWidth / 2, y: Math.max(insets.top + 94, height * 0.15) }),
    [boardWidth, height, insets.top, width],
  );
  const skiaTranslateX = useSharedValue(baseViewport.x);
  const skiaTranslateY = useSharedValue(baseViewport.y);
  const skiaScale = useSharedValue(1);
  const clampViewport = useCallback(
    (nx: number, ny: number, ns: number) => {
      const sw = boardWidth * ns, sh = boardHeight * ns, keep = 60;
      const minX = -(sw - keep), maxX = width - keep;
      const minY = -(sh - keep), maxY = height - keep;
      return { x: clamp(nx, Math.min(minX, maxX), Math.max(minX, maxX)), y: clamp(ny, Math.min(minY, maxY), Math.max(minY, maxY)) };
    },
    [boardWidth, boardHeight, width, height],
  );
  useEffect(() => {
    const n = clampViewport(baseViewport.x, baseViewport.y, 1);
    setTranslate(n); translateRef.current = n; setScale(1); scaleRef.current = 1;
    skiaTranslateX.value = n.x;
    skiaTranslateY.value = n.y;
    skiaScale.value = 1;
  }, [baseViewport.x, baseViewport.y, clampViewport]);

  const setViewportTransform = useCallback(
    (nextTranslate: { x: number; y: number }, nextScale: number) => {
      const clamped = clampViewport(nextTranslate.x, nextTranslate.y, nextScale);
      setTranslate(clamped);
      translateRef.current = clamped;
      setScale(nextScale);
      scaleRef.current = nextScale;
      skiaTranslateX.value = clamped.x;
      skiaTranslateY.value = clamped.y;
      skiaScale.value = nextScale;
    },
    [clampViewport, skiaScale, skiaTranslateX, skiaTranslateY],
  );

  const cancelViewportAnimation = useCallback(() => {
    if (viewportAnimationFrameRef.current == null) return;
    cancelAnimationFrame(viewportAnimationFrameRef.current);
    viewportAnimationFrameRef.current = null;
  }, []);

  const animateViewportTransform = useCallback(
    (targetTranslate: { x: number; y: number }, targetScale: number) => {
      cancelViewportAnimation();
      const startTranslate = renderMode === 'skia'
        ? { x: skiaTranslateX.value, y: skiaTranslateY.value }
        : translateRef.current;
      const startScale = renderMode === 'skia' ? skiaScale.value : scaleRef.current;
      const clampedTarget = clampViewport(targetTranslate.x, targetTranslate.y, targetScale);
      const startedAt = Date.now();

      const step = () => {
        const progress = clamp((Date.now() - startedAt) / QUARTERBACK_VIEWPORT_ANIMATION_MS, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setViewportTransform(
          {
            x: startTranslate.x + (clampedTarget.x - startTranslate.x) * eased,
            y: startTranslate.y + (clampedTarget.y - startTranslate.y) * eased,
          },
          startScale + (targetScale - startScale) * eased,
        );

        if (progress < 1) {
          viewportAnimationFrameRef.current = requestAnimationFrame(step);
        } else {
          viewportAnimationFrameRef.current = null;
        }
      };

      viewportAnimationFrameRef.current = requestAnimationFrame(step);
    },
    [
      cancelViewportAnimation,
      clampViewport,
      renderMode,
      setViewportTransform,
      skiaScale,
      skiaTranslateX,
      skiaTranslateY,
    ],
  );

  useEffect(() => () => {
    cancelViewportAnimation();
  }, [cancelViewportAnimation]);

  const zoomViewportForQuarterbackThrow = useCallback(() => {
    const currentTranslate = renderMode === 'skia'
      ? { x: skiaTranslateX.value, y: skiaTranslateY.value }
      : translateRef.current;
    const currentScale = renderMode === 'skia' ? skiaScale.value : scaleRef.current;
    if (!quarterbackViewportSnapshotRef.current) {
      quarterbackViewportSnapshotRef.current = {
        translate: currentTranslate,
        scale: currentScale,
      };
    }

    const nextScale = Math.min(currentScale, QUARTERBACK_THROW_VIEW_SCALE);
    const centerX = width / 2;
    const centerY = height / 2;
    const boardXAtCenter = (centerX - currentTranslate.x) / Math.max(0.001, currentScale);
    const boardYAtCenter = (centerY - currentTranslate.y) / Math.max(0.001, currentScale);
    animateViewportTransform(
      {
        x: centerX - boardXAtCenter * nextScale,
        y: centerY - boardYAtCenter * nextScale,
      },
      nextScale,
    );
  }, [animateViewportTransform, height, renderMode, skiaScale, skiaTranslateX, skiaTranslateY, width]);

  const restoreQuarterbackViewport = useCallback(() => {
    const snapshot = quarterbackViewportSnapshotRef.current;
    if (!snapshot) return;
    quarterbackViewportSnapshotRef.current = null;
    animateViewportTransform(snapshot.translate, snapshot.scale);
  }, [animateViewportTransform]);

  useEffect(() => {
    const hasActiveFootball = projectiles.some((projectile) => projectile.kind === 'football');
    const hasThrowModeAnchor =
      !!quarterbackThrowAnchorCell &&
      (status === 'wave' || enemies.length > 0);
    if (quarterbackAim || hasThrowModeAnchor || hasActiveFootball || footballExplosions.length > 0) return;
    restoreQuarterbackViewport();
  }, [
    enemies.length,
    footballExplosions.length,
    projectiles,
    quarterbackAim,
    quarterbackThrowAnchorCell,
    restoreQuarterbackViewport,
    status,
  ]);

  /* ── iso helpers ────────────────────────────────────────── */
  const isoPosition = useCallback(
    (row: number, col: number, elevation = 0) => ({
      left: boardCenterX + (col - row) * HALF_W - HALF_W,
      top: boardTopInset + (col + row) * HALF_H - elevation * VOXEL_HEIGHT,
    }),
    [boardCenterX],
  );
  const vtx = useCallback(
    (i: number, j: number) => ({ x: boardCenterX + (j - i) * HALF_W, y: boardTopInset + (j + i) * HALF_H }),
    [boardCenterX],
  );

  const screenToCell = useCallback(
    (screenX: number, screenY: number): { row: number; col: number } | null => {
      const activeTranslateX = renderMode === 'skia' ? skiaTranslateX.value : translateRef.current.x;
      const activeTranslateY = renderMode === 'skia' ? skiaTranslateY.value : translateRef.current.y;
      const activeScale = renderMode === 'skia' ? skiaScale.value : scaleRef.current;
      const bx = (screenX - activeTranslateX) / activeScale;
      const by = (screenY - activeTranslateY) / activeScale;
      const u = (bx - boardCenterX) / HALF_W;
      const v = (by - boardTopInset) / HALF_H;
      const col = Math.round((u + v) / 2);
      const row = Math.round((v - u) / 2);
      if (row < 0 || row >= GRID_ROWS || col < 0 || col >= gridColsRef.current) return null;
      return { row, col };
    },
    [boardCenterX, renderMode, skiaScale, skiaTranslateX, skiaTranslateY],
  );
  const screenToCellRef = useRef(screenToCell);
  useEffect(() => { screenToCellRef.current = screenToCell; }, [screenToCell]);
  const screenToBoardPoint = useCallback(
    (screenX: number, screenY: number) => {
      const activeTranslateX = renderMode === 'skia' ? skiaTranslateX.value : translateRef.current.x;
      const activeTranslateY = renderMode === 'skia' ? skiaTranslateY.value : translateRef.current.y;
      const activeScale = renderMode === 'skia' ? skiaScale.value : scaleRef.current;
      const bx = (screenX - activeTranslateX) / activeScale;
      const by = (screenY - activeTranslateY) / activeScale;
      const u = (bx - boardCenterX) / HALF_W;
      const v = (by - boardTopInset) / HALF_H;
      return {
        boardX: bx,
        boardY: by,
        col: (u + v) / 2,
        row: (v - u) / 2,
      };
    },
    [boardCenterX, renderMode, skiaScale, skiaTranslateX, skiaTranslateY],
  );
  const boardPointToScreen = useCallback(
    (boardX: number, boardY: number) => {
      const activeTranslateX = renderMode === 'skia' ? skiaTranslateX.value : translateRef.current.x;
      const activeTranslateY = renderMode === 'skia' ? skiaTranslateY.value : translateRef.current.y;
      const activeScale = renderMode === 'skia' ? skiaScale.value : scaleRef.current;
      return {
        x: activeTranslateX + boardX * activeScale,
        y: activeTranslateY + boardY * activeScale,
      };
    },
    [renderMode, skiaScale, skiaTranslateX, skiaTranslateY],
  );
  const expansionTilePosition = useMemo(() => isoPosition(0, gridCols), [gridCols, isoPosition]);
  const expansionTileBounds = useMemo(
    () => ({
      left: expansionTilePosition.left + 2,
      top: expansionTilePosition.top - 2,
      width: TILE_WIDTH - 4,
      height: 48,
    }),
    [expansionTilePosition],
  );
  const isExpansionTileHit = useCallback((screenX: number, screenY: number) => {
    const activeTranslateX = renderMode === 'skia' ? skiaTranslateX.value : translateRef.current.x;
    const activeTranslateY = renderMode === 'skia' ? skiaTranslateY.value : translateRef.current.y;
    const activeScale = renderMode === 'skia' ? skiaScale.value : scaleRef.current;
    const boardX = (screenX - activeTranslateX) / activeScale;
    const boardY = (screenY - activeTranslateY) / activeScale;
    return (
      statusRef.current !== 'wave' &&
      boardX >= expansionTileBounds.left &&
      boardX <= expansionTileBounds.left + expansionTileBounds.width &&
      boardY >= expansionTileBounds.top &&
      boardY <= expansionTileBounds.top + expansionTileBounds.height
    );
  }, [expansionTileBounds, renderMode, skiaScale, skiaTranslateX, skiaTranslateY]);

  /* ── tile placement ────────────────────────────────────── */
  const placeTile = useCallback(
    (tool: Tool, row: number, col: number, silent = false) => {
      const onCastleCell = isHomeReservedCell(row, col);
      setSelectedCellKey(null);

      /* ── heal ────────────────────────────────────────── */
      if (tool === 'heal') {
        if (onCastleCell) {
          const currentShipHp = shipHpRef.current;
          if (currentShipHp >= SHIP_MAX_HP) {
            if (!silent) showToast('Already at full HP');
            return;
          }
          if (!spendEnergy(ENERGY_COSTS.heal, { silent })) {
            return;
          }
          const healAmt = Math.ceil(SHIP_MAX_HP * HEAL_RESTORE_FRACTION);
          const nextShipHp = Math.min(SHIP_MAX_HP, currentShipHp + healAmt);
          setShipHp(nextShipHp);
          shipHpRef.current = nextShipHp;
          triggerSparkle(row, col);
          if (!silent) showToast(`${HOME_BASE_LABEL} healed +${nextShipHp - currentShipHp} HP`);
          return;
        }

        const cur = boardRef.current;
        const cc = getCell(cur, row, col, gridColsRef.current);

        // heal a vulnerable unit
        if (isDamageableUnit(cc.unit)) {
          if (cc.unitHp >= cc.unitMaxHp) {
            if (!silent) showToast('Already at full HP');
            return;
          }
          if (!spendEnergy(ENERGY_COSTS.heal, { silent })) {
            return;
          }
          const healAmt = Math.ceil(cc.unitMaxHp * HEAL_RESTORE_FRACTION);
          setBoard((b) => {
            const cell = getCell(b, row, col, gridColsRef.current);
            if (!isDamageableUnit(cell.unit)) return b;
            const n = [...b];
            n[boardIndex(row, col, gridColsRef.current)] = { ...cell, unitHp: Math.min(cell.unitMaxHp, cell.unitHp + healAmt) };
            return n;
          });
          triggerSparkle(row, col);
          if (!silent) showToast(`${getUnitLabel(cc.unit)} healed +${healAmt} HP`);
          return;
        }

        // heal a wall
        const wallMaxHp = getWallMaxHp(cc.wallType);
        if (cc.wallHeight > 0 && wallMaxHp > 0 && cc.wallHp < wallMaxHp) {
          if (!spendEnergy(ENERGY_COSTS.heal, { silent })) {
            return;
          }
          const healAmt = Math.ceil(wallMaxHp * HEAL_RESTORE_FRACTION);
          setBoard((b) => {
            const cell = getCell(b, row, col, gridColsRef.current);
            if (cell.wallHeight <= 0) return b;
            const n = [...b];
            const nextWallMaxHp = getWallMaxHp(cell.wallType);
            n[boardIndex(row, col, gridColsRef.current)] = { ...cell, wallHp: Math.min(nextWallMaxHp, cell.wallHp + healAmt) };
            return n;
          });
          triggerSparkle(row, col);
          if (!silent) showToast(`${getWallLabel(cc.wallType)} healed +${healAmt} HP`);
          return;
        }

        if (!silent) showToast('Nothing to heal here');
        return;
      }

      if (onCastleCell) {
        if (!silent) showToast('Home base cannot be changed');
        return;
      }

      /* ── erase with energy refund ────────────────────── */
      if (tool === 'erase') {
        const cur = boardRef.current;
        const cc = getCell(cur, row, col, gridColsRef.current);
        const isEmptyGrassTile = isGrassFoundation(cc.foundation) && cc.wallHeight <= 0 && !cc.unit;

        if (cc.unit === 'house') {
          if (!silent) showToast('Homes cannot be removed');
          return;
        }

        if (cc.unit) {
          const refund = getRefundAmountForHpRatio(
            getUnitEraseRefundBaseCost(cc.unit, getTreeLevel(cc)),
            cc.unitHp,
            cc.unitMaxHp,
          );
          setBoard((b) => {
            const cell = getCell(b, row, col, gridColsRef.current);
            if (!cell.unit) return b;
            const n = [...b];
            n[boardIndex(row, col, gridColsRef.current)] = {
              ...cell,
              unit: null,
              unitHp: 0,
              unitMaxHp: 0,
              unitLevel: 0,
              unitFacingScaleX: 1,
              unitLastAttackAt: 0,
              unitRewardBaselineCompletionCount: null,
            };
            return n;
          });
          if (refund > 0) setSpentEnergy((prev) => Math.max(0, prev - refund));
          if (!silent) showToast(refund > 0 ? `Erased — refunded ${refund} energy` : 'Erased — no refund');
          return;
        }

        if (cc.wallHeight > 0) {
          const wallTool = getWallToolFromType(cc.wallType);
          const wallMaxHp = getWallMaxHp(cc.wallType);
          const refund = getRefundAmountForHpRatio(
            (wallTool ? ITEM_COSTS[wallTool] : COST_WALL) ?? COST_WALL,
            cc.wallHp,
            wallMaxHp,
          );
          setBoard((b) => {
            const cell = getCell(b, row, col, gridColsRef.current);
            if (cell.wallHeight <= 0) return b;
            const n = [...b];
            const nextHeight = cell.wallHeight - 1;
            const nextWallMaxHp = getWallMaxHp(cell.wallType);
            n[boardIndex(row, col, gridColsRef.current)] = {
              ...cell,
              wallHeight: nextHeight,
              wallHp: nextHeight > 0 ? nextWallMaxHp : 0,
              wallType: nextHeight > 0 ? cell.wallType : null,
            };
            return n;
          });
          if (refund > 0) setSpentEnergy((prev) => Math.max(0, prev - refund));
          if (!silent) showToast(`Erased ${getWallLabel(cc.wallType).toLowerCase()} layer — refunded ${refund} energy`);
          return;
        }

        if (isEmptyGrassTile) {
          if (!silent) showToast('Empty grass tiles cannot be erased');
          return;
        }

        if (cc.foundation) {
          const refund = Math.floor((ITEM_COSTS[cc.foundation as keyof typeof ITEM_COSTS] ?? 0) * ERASE_REFUND_RATE);
          setBoard((b) => {
            const cell = getCell(b, row, col, gridColsRef.current);
            if (!cell.foundation) return b;
            const n = [...b];
            n[boardIndex(row, col, gridColsRef.current)] = { ...cell, foundation: false, soilPlacedAt: null, soilStartSwarmCompletionCount: null };
            return n;
          });
          if (refund > 0) setSpentEnergy((prev) => Math.max(0, prev - refund));
          if (!silent) showToast(`Erased — refunded ${refund} energy`);
          return;
        }

        if (!silent) showToast('Nothing to erase');
        return;
      }

      /* ── place build tools ───────────────────────────── */
      setBoard((cur) => {
        const cc = getCell(cur, row, col, gridColsRef.current);

        if (isFoundationTool(tool)) {
          if (cc.foundation === tool) { if (!silent) showToast(`${getFoundationLabel(tool)} already placed`); return cur; }
          if (cc.foundation && (cc.wallHeight > 0 || cc.unit)) { if (!silent) showToast('Clear the tile first'); return cur; }
          if (!spendEnergy(ITEM_COSTS[tool], { silent })) return cur;
          const placedAtMs = Date.now();
          if (firstVillageBuildPlacedAtMs === null) setFirstVillageBuildPlacedAtMs(placedAtMs);
          const n = [...cur];
          n[boardIndex(row, col, gridColsRef.current)] = {
            ...cc,
            foundation: tool,
            soilPlacedAt: tool === 'soil' ? placedAtMs : null,
            soilStartSwarmCompletionCount: tool === 'soil' ? swarmCompletionCount : null,
          };
          return n;
        }

        if (tool === 'boxer' || tool === 'tennis' || tool === 'quarterback' || tool === 'house' || tool === 'windmill' || tool === 'capybara_statue' || tool === 'chest') {
          if (!cc.foundation) { if (!silent) showToast('No foundation'); return cur; }
          if (cc.wallHeight > 0) { if (!silent) showToast('Cannot place unit on wall'); return cur; }
          if (cc.unit) { if (!silent) showToast('Unit already here'); return cur; }
          if (tool === 'chest') {
            const fullHealthHomeCount = getFullHealthHomeCount(cur);
            if (fullHealthHomeCount < CHEST_REQUIRED_FULL_HEALTH_HOMES) {
              if (!silent) showToast(`Need ${CHEST_REQUIRED_FULL_HEALTH_HOMES} homes at full health to place a chest`);
              return cur;
            }
          }
          if (tool === 'capybara_statue' && !hasCapybaraStatueUnlocked) {
            if (!silent) showToast('Unlock this statue from the Prize Machine first');
            return cur;
          }
          if (!spendEnergy(ITEM_COSTS[tool], { silent })) return cur;
          if (firstVillageBuildPlacedAtMs === null) setFirstVillageBuildPlacedAtMs(Date.now());
          const n = [...cur];
          if (tool === 'house' || tool === 'capybara_statue' || tool === 'chest') {
            const maxHp = tool === 'capybara_statue' ? 0 : getUnitMaxHp(tool);
            n[boardIndex(row, col, gridColsRef.current)] = {
              ...cc,
              unit: tool,
              unitHp: maxHp,
              unitMaxHp: maxHp,
              unitLevel: 0,
              unitFacingScaleX: 1,
              unitRewardBaselineCompletionCount: tool === 'chest' ? swarmCompletionCount : null,
            };
          } else {
            const unitLevel = isUpgradeableTreeUnit(tool) ? 1 : 0;
            const maxHp = getUnitMaxHp(tool, unitLevel || 1);
            n[boardIndex(row, col, gridColsRef.current)] = {
              ...cc,
              unit: tool,
              unitHp: maxHp,
              unitMaxHp: maxHp,
              unitLevel,
              unitFacingScaleX: 1,
              unitRewardBaselineCompletionCount: tool === 'windmill' ? swarmCompletionCount : null,
            };
          }
          return n;
        }

        if (tool === 'wall' || tool === 'fence') {
          if (!cc.foundation) { if (!silent) showToast('No foundation'); return cur; }
          if (cc.unit) { if (!silent) showToast('Remove unit first'); return cur; }
          if (cc.wallHeight > 0) { if (!silent) showToast('Wall already placed here'); return cur; }
          const targetWallType: Exclude<WallType, null> = tool === 'fence' ? 'wood' : 'stone';
          if (!spendEnergy(ITEM_COSTS[tool], { silent })) return cur;
          if (firstVillageBuildPlacedAtMs === null) setFirstVillageBuildPlacedAtMs(Date.now());
          const n = [...cur];
          n[boardIndex(row, col, gridColsRef.current)] = {
            ...cc,
            wallType: targetWallType,
            wallHeight: 1,
            wallHp: getWallMaxHp(targetWallType),
          };
          return n;
        }

        return cur;
      });
    },
    [firstVillageBuildPlacedAtMs, hasCapybaraStatueUnlocked, showToast, spendEnergy, swarmCompletionCount, triggerSparkle],
  );
  const placeTileRef = useRef(placeTile);
  useEffect(() => { placeTileRef.current = placeTile; }, [placeTile]);

  const handleUpgradeTree = useCallback(async (row: number, col: number) => {
    const upgradeKey = keyForCell(row, col);
    if (treeUpgradeInFlightRef.current) return;

    const currentCell = getCell(boardRef.current, row, col, gridColsRef.current);
    if (!isUpgradeableTreeUnit(currentCell.unit)) {
      showToast('Select a tree to upgrade');
      return;
    }

    const currentLevel = getTreeLevel(currentCell);
    const cost = getNextTreeUpgradeCost(currentLevel);
    if (!cost) {
      showToast('Tree is fully upgraded');
      return;
    }
    if (availableEnergy < cost.energy) {
      showToast(`Need ${cost.energy} energy`);
      return;
    }
    if (starBalanceRef.current < cost.stars) {
      showToast(`Need ${cost.stars} stars`);
      return;
    }

    treeUpgradeInFlightRef.current = upgradeKey;
    setSelectedTooltipCell(null);
    try {
      if (hasUnsavedChanges) {
        const didSaveDraft = await saveDraftToCache({ silent: true });
        if (!didSaveDraft) {
          showToast('Save your village before upgrading');
          return;
        }
      }

      const sourceBoard = cloneBoardCells(boardRef.current);
      const targetIndex = boardIndex(row, col, gridColsRef.current);
      const sourceCell = sourceBoard[targetIndex];
      if (!isUpgradeableTreeUnit(sourceCell.unit)) {
        showToast('That tree is no longer here');
        return;
      }

      const latestLevel = getTreeLevel(sourceCell);
      const latestCost = getNextTreeUpgradeCost(latestLevel);
      if (!latestCost) {
        showToast('Tree is fully upgraded');
        return;
      }
      if (availableEnergy < latestCost.energy) {
        showToast(`Need ${latestCost.energy} energy`);
        return;
      }
      if (starBalanceRef.current < latestCost.stars) {
        showToast(`Need ${latestCost.stars} stars`);
        return;
      }

      const didSpendStars = await spendStars(latestCost.stars);
      if (!didSpendStars) return;

      const upgradedLevel = latestLevel + 1;
      const previousMaxHp = sourceCell.unitMaxHp > 0
        ? sourceCell.unitMaxHp
        : getUnitMaxHp(sourceCell.unit, latestLevel);
      const currentHp = sourceCell.unitHp > 0 ? sourceCell.unitHp : previousMaxHp;
      const nextMaxHp = getUnitMaxHp(sourceCell.unit, upgradedLevel);
      const wasDamaged = previousMaxHp > 0 && currentHp < previousMaxHp;
      const restoreHp = Math.ceil(nextMaxHp * TREE_UPGRADE_RESTORE_FRACTION);
      const nextHp = wasDamaged
        ? Math.max(1, Math.min(nextMaxHp, currentHp + restoreHp))
        : nextMaxHp;
      const nextSpentEnergy = spentEnergyRef.current + latestCost.energy;

      sourceBoard[targetIndex] = {
        ...sourceCell,
        unitHp: nextHp,
        unitMaxHp: nextMaxHp,
        unitLevel: upgradedLevel,
      };

      boardRef.current = sourceBoard;
      spentEnergyRef.current = nextSpentEnergy;
      setBoard(sourceBoard);
      setSpentEnergy(nextSpentEnergy);
      triggerSparkle(row, col, 'upgrade');

      const didSave = await persistVillageSnapshot(
        createDraftSnapshot(sourceBoard, gridColsRef.current, nextSpentEnergy),
        { silent: true },
      );
      showToast(
        didSave
          ? `${getUnitLabel(sourceCell.unit)} upgraded to level ${upgradedLevel}`
          : `${getUnitLabel(sourceCell.unit)} upgraded; save failed`,
      );
    } finally {
      treeUpgradeInFlightRef.current = null;
    }
  }, [
    availableEnergy,
    hasUnsavedChanges,
    persistVillageSnapshot,
    saveDraftToCache,
    showToast,
    spendStars,
    triggerSparkle,
  ]);

  const rotateCell = useCallback((row: number, col: number) => {
    if (isHomeReservedCell(row, col)) return;
    setBoard((cur) => {
      const n = [...cur];
      const idx = boardIndex(row, col, gridColsRef.current);
      const cc = n[idx];
      if (cc.unit === 'house' || cc.unit === 'capybara_statue') {
        n[idx] = { ...cc, unitRotation: (((cc.unitRotation ?? 0) + 1) % 4) as 0 | 1 | 2 | 3 };
      } else if (cc.wallHeight > 0) {
        n[idx] = { ...cc, wallRotation: (((cc.wallRotation ?? 0) + 1) % 4) as 0 | 1 | 2 | 3 };
      }
      return n;
    });
  }, []);

  /* ── grid lines ────────────────────────────────────────── */
  const gridLines = useMemo(() => {
    const out: Array<{ key: string; cx: number; cy: number; length: number; angle: number }> = [];
    const rowLineLength = gridCols * ISO_SEGMENT;
    for (let i = 0; i <= GRID_ROWS; i++) { const a = vtx(i, 0), b = vtx(i, gridCols); out.push({ key: `r${i}`, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, length: rowLineLength, angle: ISO_ANGLE_RIGHT }); }
    for (let j = 0; j <= gridCols; j++) { const a = vtx(0, j), b = vtx(GRID_ROWS, j); out.push({ key: `c${j}`, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, length: COL_LINE_LEN, angle: ISO_ANGLE_LEFT }); }
    return out;
  }, [gridCols, vtx]);

  const cellLayout = useMemo(
    () => Array.from({ length: GRID_ROWS * gridCols }, (_, idx) => {
      const row = Math.floor(idx / gridCols), col = idx % gridCols;
      return { row, col, key: keyForCell(row, col), ...isoPosition(row, col) };
    }),
    [gridCols, isoPosition],
  );

  /* ── placed sprites ────────────────────────────────────── */
  const placedSprites = useMemo(
    () =>
      buildPlacedSprites({
        board,
        gridCols,
        isoPosition,
        isSoilConnectedToHarvestPath,
        swarmCompletionCount,
      }),
    [board, countdownMs, gridCols, isoPosition, swarmCompletionCount],
  );

  /* ── drag responders ───────────────────────────────────── */
  const makeDragResponder = useCallback(
    (item: Tool, options?: { canDrag?: boolean }) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          clearPendingToolDrag();
          hoverCellDragRef.current = null;
          toolDragStartedRef.current = false;
          toolDragCanceledRef.current = false;
          const point = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
          toolTouchPointRef.current = point;
          toolTouchStartRef.current = point;
          if (options?.canDrag === false) return;
          toolDragTimeoutRef.current = setTimeout(() => {
            const latest = toolTouchPointRef.current;
            if (!latest || toolDragCanceledRef.current) return;
            toolDragStartedRef.current = true;
            hideToolInspectCard();
            const ty = latest.y - 70;
            setDragItem(item);
            setDragPos({ x: latest.x, y: ty });
            const cell = screenToCellRef.current(latest.x, ty);
            hoverCellDragRef.current = cell;
            setHoverCell(cell);
          }, TOOL_DRAG_HOLD_DELAY_MS);
        },
        onPanResponderMove: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          toolTouchPointRef.current = { x: pageX, y: pageY };
          const start = toolTouchStartRef.current;
          if (!toolDragStartedRef.current && start) {
            const moved = Math.hypot(pageX - start.x, pageY - start.y);
            if (moved > TOOL_DRAG_MOVE_CANCEL_THRESHOLD) {
              toolDragCanceledRef.current = true;
              clearPendingToolDrag();
            }
          }
          if (!toolDragStartedRef.current) return;
          const ty = pageY - 70;
          setDragPos({ x: pageX, y: ty });
          const cell = screenToCellRef.current(pageX, ty);
          hoverCellDragRef.current = cell;
          setHoverCell(cell);
        },
        onPanResponderRelease: (evt) => {
          clearPendingToolDrag();
          const ty = evt.nativeEvent.pageY - 70;
          if (toolDragStartedRef.current) {
            const fallback = screenToCellRef.current(evt.nativeEvent.pageX, ty);
            const cell = hoverCellDragRef.current ?? fallback;
            hoverCellDragRef.current = null;
            if (cell) placeTileRef.current(item, cell.row, cell.col, false);
          } else if (!toolDragCanceledRef.current) {
            showToolInspectCard(item);
          }
          toolDragStartedRef.current = false;
          toolDragCanceledRef.current = false;
          toolTouchPointRef.current = null;
          toolTouchStartRef.current = null;
          setDragItem(null); setDragPos(null); setHoverCell(null);
        },
        onPanResponderTerminate: () => {
          clearPendingToolDrag();
          hoverCellDragRef.current = null;
          toolDragStartedRef.current = false;
          toolDragCanceledRef.current = false;
          toolTouchPointRef.current = null;
          toolTouchStartRef.current = null;
          setDragItem(null); setDragPos(null); setHoverCell(null);
        },
      }),
    [clearPendingToolDrag, hideToolInspectCard, showToolInspectCard],
  );

  const grassResponder = useMemo(() => makeDragResponder('grass'), [makeDragResponder]);
  const grassPathAResponder = useMemo(() => makeDragResponder('grass_path_a'), [makeDragResponder]);
  const grassPathBResponder = useMemo(() => makeDragResponder('grass_path_b'), [makeDragResponder]);
  const grassPathCResponder = useMemo(() => makeDragResponder('grass_path_c'), [makeDragResponder]);
  const grassPathDResponder = useMemo(() => makeDragResponder('grass_path_d'), [makeDragResponder]);
  const grassPathEResponder = useMemo(() => makeDragResponder('grass_path_e'), [makeDragResponder]);
  const grassPathFResponder = useMemo(() => makeDragResponder('grass_path_f'), [makeDragResponder]);
  const grassPathGResponder = useMemo(() => makeDragResponder('grass_path_g'), [makeDragResponder]);
  const grassPathHResponder = useMemo(() => makeDragResponder('grass_path_h'), [makeDragResponder]);
  const grassPathIResponder = useMemo(() => makeDragResponder('grass_path_i'), [makeDragResponder]);
  const grassPathJResponder = useMemo(() => makeDragResponder('grass_path_j'), [makeDragResponder]);
  const soilResponder = useMemo(() => makeDragResponder('soil'), [makeDragResponder]);
  const wallResponder = useMemo(() => makeDragResponder('wall'), [makeDragResponder]);
  const fenceResponder = useMemo(() => makeDragResponder('fence'), [makeDragResponder]);
  const houseResponder = useMemo(() => makeDragResponder('house'), [makeDragResponder]);
  const boxerResponder = useMemo(() => makeDragResponder('boxer'), [makeDragResponder]);
  const tennisResponder = useMemo(() => makeDragResponder('tennis'), [makeDragResponder]);
  const quarterbackResponder = useMemo(() => makeDragResponder('quarterback'), [makeDragResponder]);
  const windmillResponder = useMemo(() => makeDragResponder('windmill'), [makeDragResponder]);
  const chestResponder = useMemo(() => makeDragResponder('chest'), [makeDragResponder]);
  const capybaraResponder = useMemo(
    () => makeDragResponder('capybara_statue', { canDrag: hasCapybaraStatueUnlocked }),
    [hasCapybaraStatueUnlocked, makeDragResponder],
  );
  const eraseResponder = useMemo(() => makeDragResponder('erase'), [makeDragResponder]);
  const healResponder = useMemo(() => makeDragResponder('heal'), [makeDragResponder]);

  const responderMap: Record<Tool, ReturnType<typeof PanResponder.create>> = useMemo(
    () => ({
      grass: grassResponder,
      grass_path_a: grassPathAResponder,
      grass_path_b: grassPathBResponder,
      grass_path_c: grassPathCResponder,
      grass_path_d: grassPathDResponder,
      grass_path_e: grassPathEResponder,
      grass_path_f: grassPathFResponder,
      grass_path_g: grassPathGResponder,
      grass_path_h: grassPathHResponder,
      grass_path_i: grassPathIResponder,
      grass_path_j: grassPathJResponder,
      soil: soilResponder,
      wall: wallResponder,
      fence: fenceResponder,
      house: houseResponder,
      boxer: boxerResponder,
      tennis: tennisResponder,
      quarterback: quarterbackResponder,
      windmill: windmillResponder,
      chest: chestResponder,
      capybara_statue: capybaraResponder,
      erase: eraseResponder,
      heal: healResponder,
    }),
    [grassResponder, grassPathAResponder, grassPathBResponder, grassPathCResponder, grassPathDResponder, grassPathEResponder, grassPathFResponder, grassPathGResponder, grassPathHResponder, grassPathIResponder, grassPathJResponder, soilResponder, wallResponder, fenceResponder, houseResponder, boxerResponder, tennisResponder, quarterbackResponder, windmillResponder, chestResponder, capybaraResponder, eraseResponder, healResponder],
  );
  const toolPanHandlersById = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(responderMap).map(([tool, responder]) => [tool, responder.panHandlers]),
      ) as Record<Tool, ReturnType<typeof PanResponder.create>['panHandlers']>,
    [responderMap],
  );

  const getQuarterbackLaunchFromAim = useCallback(
    (aim: QuarterbackAimState): QuarterbackLaunch | null => {
      if (aim.pullScreenX == null || aim.pullScreenY == null) return null;

      const launchRow = aim.row + 0.15;
      const launchCol = aim.col;
      const anchorIso = isoPosition(launchRow, launchCol, 1.1);
      const anchorScreen = boardPointToScreen(anchorIso.left + HALF_W, anchorIso.top + HALF_H * 0.35);
      const originScreenX = aim.originScreenX ?? anchorScreen.x;
      const originScreenY = aim.originScreenY ?? anchorScreen.y;
      const pullDistancePx = Math.hypot(aim.pullScreenX - originScreenX, aim.pullScreenY - originScreenY);
      if (pullDistancePx < QUARTERBACK_MIN_PULL_DISTANCE_PX) return null;

      const originPoint = screenToBoardPoint(originScreenX, originScreenY);
      const pullPoint = screenToBoardPoint(aim.pullScreenX, aim.pullScreenY);
      const rawVelRow = originPoint.row - pullPoint.row;
      const rawVelCol = originPoint.col - pullPoint.col;
      const magnitude = Math.hypot(rawVelRow, rawVelCol);
      if (magnitude < 1e-4) return null;

      const pullRatio = clamp(
        (pullDistancePx - QUARTERBACK_MIN_PULL_DISTANCE_PX) /
        (QUARTERBACK_MAX_PULL_DISTANCE_PX - QUARTERBACK_MIN_PULL_DISTANCE_PX),
        0,
        1,
      );
      const powerRatio = Math.pow(pullRatio, QUARTERBACK_PULL_POWER_EXPONENT);
      const range = clamp(QUARTERBACK_RANGE * powerRatio, 1.2, QUARTERBACK_RANGE);

      return {
        arcHeight: 1.3 + powerRatio * 3.2,
        launchCol,
        launchRow,
        powerRatio,
        range,
        velCol: rawVelCol / magnitude,
        velRow: rawVelRow / magnitude,
      };
    },
    [boardPointToScreen, isoPosition, screenToBoardPoint],
  );

  const beginQuarterbackAim = useCallback(
    (row: number, col: number, options?: QuarterbackAimStartOptions) => {
      if (!isWithinBoard(row, col, gridColsRef.current)) return;
      const cell = getCell(boardRef.current, row, col, gridColsRef.current);
      if (cell.unit !== 'quarterback') {
        showToast('Select a Quarterback tree');
        return;
      }
      const hasThrowableTarget = statusRef.current === 'wave' || enemiesRef.current.length > 0;
      if (!hasThrowableTarget) {
        showToast('Spawn an Ijom or start a swarm to throw');
        return;
      }

      const now = Date.now();
      const readyAt = (cell.unitLastAttackAt ?? 0) + QUARTERBACK_THROW_COOLDOWN_MS;
      if (now < readyAt) {
        showToast(`Throw ready in ${Math.ceil((readyAt - now) / 1000)}s`);
        return;
      }

      hideToolInspectCard();
      if (!options?.preserveTooltip) setSelectedTooltipCell(null);
      setIsHudCollapsed(true);
      setIsTrayCollapsed(true);
      zoomViewportForQuarterbackThrow();
      const nextAim = {
        row,
        col,
        originScreenX: options?.originScreenX ?? null,
        originScreenY: options?.originScreenY ?? null,
        pullScreenX: options?.pullScreenX ?? null,
        pullScreenY: options?.pullScreenY ?? null,
        startedAt: now,
      };
      quarterbackAimRef.current = nextAim;
      quarterbackAimVisualUpdateAtRef.current = 0;
      setQuarterbackAim(nextAim);
    },
    [hideToolInspectCard, showToast, zoomViewportForQuarterbackThrow],
  );

  const updateQuarterbackAimPull = useCallback((screenX: number, screenY: number) => {
    const current = quarterbackAimRef.current;
    if (!current) return;

    const next = { ...current, pullScreenX: screenX, pullScreenY: screenY };
    quarterbackAimRef.current = next;

    const now = Date.now();
    if (now - quarterbackAimVisualUpdateAtRef.current < QUARTERBACK_AIM_VISUAL_UPDATE_MS) return;

    quarterbackAimVisualUpdateAtRef.current = now;
    setQuarterbackAim(next);
  }, []);

  const cancelQuarterbackAim = useCallback(() => {
    quarterbackAimRef.current = null;
    quarterbackAimVisualUpdateAtRef.current = 0;
    setQuarterbackThrowAnchorCell(null);
    setQuarterbackAim(null);
  }, []);

  const commitQuarterbackThrow = useCallback(
    (aim: QuarterbackAimState | null) => {
      if (!aim) return;
      const launch = getQuarterbackLaunchFromAim(aim);
      quarterbackAimRef.current = null;
      quarterbackAimVisualUpdateAtRef.current = 0;
      setQuarterbackAim(null);

      if (!launch) {
        showToast('Pull farther back to throw');
        return;
      }

      const currentGridCols = gridColsRef.current;
      if (!isWithinBoard(aim.row, aim.col, currentGridCols)) {
        showToast('That Quarterback is gone');
        return;
      }
      const targetIndex = boardIndex(aim.row, aim.col, currentGridCols);
      const cell = boardRef.current[targetIndex];
      if (cell?.unit !== 'quarterback') {
        showToast('That Quarterback is gone');
        return;
      }

      const now = Date.now();
      if (now - (cell.unitLastAttackAt ?? 0) < QUARTERBACK_THROW_COOLDOWN_MS) {
        showToast('Throw is reloading');
        return;
      }

      const damage = getCombatUnitDamage('quarterback', getTreeLevel(cell));
      const football: Projectile = {
        id: `qb${(projectileIdRef.current += 1)}`,
        row: launch.launchRow,
        col: launch.launchCol,
        velRow: launch.velRow,
        velCol: launch.velCol,
        damage,
        speedPerTick: QUARTERBACK_PROJECTILE_SPEED_PER_TICK,
        remainingRange: launch.range,
        kind: 'football',
        totalRange: launch.range,
        traveledRange: 0,
        arcHeight: launch.arcHeight,
        launchedAtMs: now,
      };

      const nextProjectiles = [...projectilesRef.current, football];
      projectilesRef.current = nextProjectiles;
      setProjectiles(nextProjectiles);

      const nextFacingScaleX: 1 | -1 = launch.velCol < 0 ? 1 : -1;
      const nextBoard = [...boardRef.current];
      nextBoard[targetIndex] = {
        ...cell,
        unitLastAttackAt: now,
        unitFacingScaleX: nextFacingScaleX,
      };
      boardRef.current = nextBoard;
      setBoard(nextBoard);
    },
    [getQuarterbackLaunchFromAim, showToast],
  );

  const getQuarterbackThrowPadCenter = useCallback(() => {
    const padBottom = Math.max(132, insets.bottom + 128);
    return {
      x: width / 2,
      y: height - padBottom - QUARTERBACK_THROW_PAD_SIZE / 2,
    };
  }, [height, insets.bottom, width]);

  const setQuarterbackThrowPadNubVisualOffset = useCallback(
    (translationX: number, translationY: number) => {
      const dragDistance = Math.hypot(translationX, translationY);
      const ratio = dragDistance > QUARTERBACK_THROW_PAD_NUB_MAX_OFFSET
        ? QUARTERBACK_THROW_PAD_NUB_MAX_OFFSET / dragDistance
        : 1;
      quarterbackThrowPadNubOffset.stopAnimation();
      quarterbackThrowPadNubOffset.setValue({
        x: translationX * ratio,
        y: translationY * ratio,
      });
    },
    [quarterbackThrowPadNubOffset],
  );

  const resetQuarterbackThrowPadNub = useCallback(
    (animated = true) => {
      quarterbackThrowPadNubOffset.stopAnimation();
      if (!animated) {
        quarterbackThrowPadNubOffset.setValue({ x: 0, y: 0 });
        return;
      }
      Animated.spring(quarterbackThrowPadNubOffset, {
        toValue: { x: 0, y: 0 },
        friction: 7,
        tension: 140,
        useNativeDriver: true,
      }).start();
    },
    [quarterbackThrowPadNubOffset],
  );

  const startQuarterbackPadDrag = useCallback(
    () => {
      const controlCell = quarterbackThrowControlCellRef.current;
      if (!controlCell) return;
      const padCenter = getQuarterbackThrowPadCenter();
      resetQuarterbackThrowPadNub(false);
      quarterbackThrowControlCellRef.current = controlCell;
      setQuarterbackThrowAnchorCell(controlCell);
      beginQuarterbackAim(controlCell.row, controlCell.col, {
        originScreenX: padCenter.x,
        originScreenY: padCenter.y,
      });
    },
    [beginQuarterbackAim, getQuarterbackThrowPadCenter, resetQuarterbackThrowPadNub],
  );

  const updateQuarterbackPadDrag = useCallback(
    (translationX: number, translationY: number) => {
      if (!quarterbackAimRef.current) return;
      setQuarterbackThrowPadNubVisualOffset(translationX, translationY);
      const padCenter = getQuarterbackThrowPadCenter();
      updateQuarterbackAimPull(padCenter.x + translationX, padCenter.y + translationY);
    },
    [getQuarterbackThrowPadCenter, setQuarterbackThrowPadNubVisualOffset, updateQuarterbackAimPull],
  );

  const finishQuarterbackPadDrag = useCallback(
    () => {
      resetQuarterbackThrowPadNub();
      commitQuarterbackThrow(quarterbackAimRef.current);
    },
    [commitQuarterbackThrow, resetQuarterbackThrowPadNub],
  );

  const quarterbackThrowPadResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!quarterbackThrowControlCellRef.current,
        onMoveShouldSetPanResponder: () => !!quarterbackThrowControlCellRef.current,
        onPanResponderGrant: () => {
          startQuarterbackPadDrag();
        },
        onPanResponderMove: (_event, gestureState) => {
          updateQuarterbackPadDrag(gestureState.dx, gestureState.dy);
        },
        onPanResponderRelease: () => {
          finishQuarterbackPadDrag();
        },
        onPanResponderTerminate: () => {
          finishQuarterbackPadDrag();
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [
      finishQuarterbackPadDrag,
      startQuarterbackPadDrag,
      updateQuarterbackPadDrag,
    ],
  );

  useEffect(() => {
    if (quarterbackAim) return;
    resetQuarterbackThrowPadNub();
  }, [quarterbackAim, resetQuarterbackThrowPadNub]);

  const handleSceneTap = useCallback((screenX: number, screenY: number) => {
    if (quarterbackAimRef.current) return;
    const cell = screenToCellRef.current(screenX, screenY);
    if (crazyCapyRef.current && cell) {
      redirectCrazyCapy(cell.row, cell.col);
      triggerCrazyCapyTapPulse(cell.row, cell.col);
      setSelectedTooltipCell(null);
      return;
    }
    if (isExpansionTileHit(screenX, screenY)) {
      setPendingExpansionColumns(Math.max(1, Math.min(maxExpandableColumns || 1, pendingExpansionColumns)));
      setSelectedTooltipCell(null);
      setShowExpansionModal(true);
      return;
    }
    if (cell) {
      const bc = getCell(boardRef.current, cell.row, cell.col, gridColsRef.current);
      if (
        (isHomeReservedCell(cell.row, cell.col) && bc.foundation) ||
        (bc.foundation && (bc.wallHeight > 0 || bc.unit || bc.foundation === 'soil'))
      ) {
        setSelectedTooltipCell(cell);
        setQuarterbackThrowAnchorCell(bc.unit === 'quarterback' ? { row: cell.row, col: cell.col } : null);
      } else {
        setSelectedTooltipCell(null);
        setQuarterbackThrowAnchorCell(null);
      }
    } else {
      setSelectedTooltipCell(null);
      setQuarterbackThrowAnchorCell(null);
    }
  }, [
    isExpansionTileHit,
    maxExpandableColumns,
    pendingExpansionColumns,
    redirectCrazyCapy,
    triggerCrazyCapyTapPulse,
  ]);

  /* ── scene pan ─────────────────────────────────────────── */
  const gestureResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !quarterbackAimRef.current,
        onMoveShouldSetPanResponder: () => !quarterbackAimRef.current,
        onPanResponderGrant: () => {
          gestureModeRef.current = 'pan';
          panStartRef.current = translateRef.current;
          hasDraggedRef.current = false;
        },
        onPanResponderMove: (_e, g) => {
          if (Math.hypot(g.dx, g.dy) > 5) hasDraggedRef.current = true;
          const c = clampViewport(panStartRef.current.x + g.dx, panStartRef.current.y + g.dy, scaleRef.current);
          setTranslate(c); translateRef.current = c;
        },
        onPanResponderRelease: (e) => {
          gestureModeRef.current = 'idle';
          panStartRef.current = translateRef.current;
          if (!hasDraggedRef.current) {
            const touch = e.nativeEvent.changedTouches[0];
            handleSceneTap(touch.pageX, touch.pageY);
          }
        },
        onPanResponderTerminate: () => { gestureModeRef.current = 'idle'; panStartRef.current = translateRef.current; },
      }),
    [clampViewport, handleSceneTap],
  );

  /* ── battle actions ────────────────────────────────────── */
  const clearBuild = useCallback(() => {
    const n = sanitizeCastleFootprint(createBoard(gridColsRef.current), gridColsRef.current);
    setBoard(n); boardRef.current = n; setSelectedCellKey(null);
    quarterbackAimRef.current = null;
    setQuarterbackAim(null);
    setQuarterbackThrowAnchorCell(null);
    setFootballExplosions([]);
    setSpentEnergy(0);
    showToast('Village cleared — all energy refunded');
  }, [showToast]);

  const resetWaveState = useCallback((ns: BattleStatus = 'ready') => {
    setEnemies([]); setProjectiles([]); setQuarterbackAim(null); setQuarterbackThrowAnchorCell(null); setFootballExplosions([]); setCrazyCapy(null); setCrazyCapyTapPulses([]); setCrazyCapyKnockoutEffects([]); quarterbackAimRef.current = null; crazyCapyRef.current = null; crazyCapyHitAtByEnemyIdRef.current = {}; setWaveSpawned(0); waveSpawnedRef.current = 0; setWaveDefeated(0); waveDefeatedRef.current = 0; setShipHp(SHIP_MAX_HP); shipHpRef.current = SHIP_MAX_HP; setStatus(ns); statusRef.current = ns; enemiesRef.current = []; projectilesRef.current = []; lastEnemySpawnAtRef.current = 0; setShowVictoryModal(false); setShowDefeatModal(false);
  }, []);

  useEffect(() => {
    if (status === 'wave' || enemiesRef.current.length > 0 || projectilesRef.current.length === 0) return;
    projectilesRef.current = [];
    setProjectiles([]);
  }, [enemies.length, status]);

  const recordSwarmCompletion = useCallback((outcome: CompletedSwarmOutcome, date = new Date()) => {
    const todayKey = getEasternDayKey(date);
    const windowKey = getActiveSwarmWindowKey(date);
    if (swarmCompletionRecordedWindowKeyRef.current === windowKey) return;

    if (outcome === 'lost') {
      setLastSwarmCompletedDayKey(todayKey);
      setSwarmStreakCount(0);
      swarmCompletionRecordedWindowKeyRef.current = windowKey;
      return;
    }

    setSwarmCompletionCount((prev) => prev + 1);
    if (!lastSwarmCompletedDayKey) {
      setLastSwarmCompletedDayKey(todayKey);
      setSwarmStreakCount(1);
    } else {
      const dayGap = getDayDifferenceFromKeys(todayKey, lastSwarmCompletedDayKey);
      if (dayGap === 1) {
        setLastSwarmCompletedDayKey(todayKey);
        setSwarmStreakCount((prev) => prev + 1);
      } else if (dayGap === 0) {
        setLastSwarmCompletedDayKey(todayKey);
        setSwarmStreakCount((prev) => Math.max(1, prev));
      } else if (dayGap > 1) {
        setLastSwarmCompletedDayKey(todayKey);
        setSwarmStreakCount(1);
      }
    }
    swarmCompletionRecordedWindowKeyRef.current = windowKey;
  }, [lastSwarmCompletedDayKey]);

  const startWave = useCallback(async () => {
    if (statusRef.current === 'wave') return;
    if (!swarmProgressLoaded) {
      showToast('Loading swarm timer');
      return;
    }
    const now = new Date();
    const nowAtMs = now.getTime();
    const unlockAtMs = Math.max(swarmNextAvailableAtMs, getCurrentOrNextSwarmOpenAtMs(now));
    if (nowAtMs < unlockAtMs) {
      showToast(`Next swarm in ${formatCountdown(unlockAtMs - nowAtMs)}`);
      return;
    }
    if (hasUnsavedChanges) {
      if (!boardIDRef.current) boardIDRef.current = generateBoardID();
      const snapshot = createDraftSnapshot(
        boardRef.current,
        gridColsRef.current,
        spentEnergyRef.current,
        boardIDRef.current,
      );
      const didSaveDraft = await persistVillageSnapshot(snapshot, { silent: true });
      if (!didSaveDraft) {
        showToast('Save your village before activating the swarm');
        return;
      }
      try {
        const didPublish = await publishSwarmVillageSnapshot(snapshot, 'pre_swarm_autosave', 'ready');
        if (!didPublish) {
          showToast('Sign in to sync your village before the swarm');
          return;
        }
      } catch (error) {
        if (__DEV__) console.warn('[SwarmVillage] Failed to publish pre-swarm village map:', error);
        showToast('Sync your village before activating the swarm', 2600);
        return;
      }
    }
    swarmCompletionRecordedWindowKeyRef.current = null;
    swarmVictoryRewardInFlightRef.current = false;
    setSwarmNextAvailableAtMs(getNextDailySwarmUnlockMs(now));
    setWaveSize(getIncomingWaveSize(
      boardRef.current,
      getCurrentSwarmStreak(swarmStreakCount, lastSwarmCompletedDayKey, getEasternDayKey(now)),
    ));
    resetWaveState('wave'); showToast('Swarm activated');
  }, [hasUnsavedChanges, lastSwarmCompletedDayKey, persistVillageSnapshot, publishSwarmVillageSnapshot, resetWaveState, showToast, swarmNextAvailableAtMs, swarmProgressLoaded, swarmStreakCount]);

  useEffect(() => {
    if (status !== 'cleared' && status !== 'lost') return;
    recordSwarmCompletion(status);
  }, [recordSwarmCompletion, status]);

  const handleCloseVictory = useCallback(() => {
    setShowVictoryModal(false);
    if (statusRef.current !== 'cleared') return;
    if (swarmVictoryRewardInFlightRef.current) return;

    swarmVictoryRewardInFlightRef.current = true;

    setTimeout(() => {
      if (statusRef.current !== 'cleared') {
        swarmVictoryRewardInFlightRef.current = false;
        return;
      }
      void (async () => {
        try {
          await awardSpendableStars(1);
          const nextStarBalance = starBalanceRef.current + 1;
          setStarBalance(nextStarBalance);
          if (!playVillageStarReward({ delta: 1, toTotalStarsEarned: nextStarBalance })) {
            setDisplayedStarBalance(nextStarBalance);
          }
          showToast('Swarm survived +1★');
        } catch (error) {
          swarmVictoryRewardInFlightRef.current = false;
          if (__DEV__) console.warn('[SwarmVillage] Failed to award swarm victory star:', error);
          showToast('Swarm reward failed');
        }
      })();
    }, VICTORY_REWARD_MODAL_EXIT_DELAY_MS);
  }, [awardSpendableStars, playVillageStarReward, showToast]);

  const handleTestStarReward = useCallback(() => {
    const currentBalance = starBalanceRef.current;
    if (!playVillageStarReward({ delta: 1, toTotalStarsEarned: currentBalance })) {
      setDisplayedStarBalance(currentBalance);
    }
    showToast('Test star effect');
  }, [playVillageStarReward, showToast]);

  const spawnDebugIjom = useCallback((variant: Enemy['variant']) => {
    if (renderMode !== 'skia') return;
    if (statusRef.current === 'wave') {
      showToast('Use Activate Defenses for a full swarm');
      return;
    }

    const now = Date.now();
    const currentGridCols = gridColsRef.current;
    const exerciseMinutes = sinceAprilRef.current.exerciseMinutes;
    const baseDmg = Math.max(
      IJOM_MIN_DAMAGE,
      IJOM_BASE_DAMAGE + Math.floor(exerciseMinutes / IJOM_DAMAGE_ACTIVE_MINUTES_DIVISOR),
    );
    const damage = variant === 'snow' ? baseDmg * SNOW_IJOM_DAMAGE_MULTIPLIER : baseDmg;
    const rawSpeed =
      (IJOM_SPEED_PER_TICK_BASE + Math.random() * IJOM_SPEED_PER_TICK_VARIANCE) *
      IJOM_VILLAGE_SPEED_SCALE *
      IJOM_SPEED_MULTIPLIER;
    const spawnPosition = getEnemySpawnPosition(enemiesRef.current, currentGridCols, variant);
    if (!spawnPosition) {
      showToast('Spawn edge is crowded');
      return;
    }

    const nextEnemy: Enemy = {
      id: `debug-e${(enemyIdRef.current += 1)}`,
      variant,
      row: spawnPosition.row,
      col: spawnPosition.col,
      hp: variant === 'snow' ? 36 : 18,
      maxHp: variant === 'snow' ? 36 : 18,
      damage,
      speedPerTick: rawSpeed,
      spawnedAt: now,
      lastAttackAt: 0,
    };

    if (statusRef.current === 'cleared') {
      setShowVictoryModal(false);
      setStatus('ready');
      statusRef.current = 'ready';
    } else if (statusRef.current === 'lost') {
      setShowDefeatModal(false);
      setStatus('ready');
      statusRef.current = 'ready';
    }

    const nextEnemies = [...enemiesRef.current, nextEnemy];
    enemiesRef.current = nextEnemies;
    setEnemies(nextEnemies);
    debugEnemySimulationActiveRef.current = true;
    setDebugEnemySimulationActive(true);
    showToast(variant === 'snow' ? 'Snow IJOM test spawned' : 'IJOM test spawned');
  }, [renderMode, showToast]);

  const spawnDebugSnowIjom = useCallback(() => {
    spawnDebugIjom('snow');
  }, [spawnDebugIjom]);

  const spawnDebugNormalIjom = useCallback(() => {
    spawnDebugIjom('normal');
  }, [spawnDebugIjom]);

  /* ── wave simulation ───────────────────────────────────── */
  useEffect(() => {
    if (status !== 'wave' && !debugEnemySimulationActive) return;
    lastWaveSimulationAtRef.current = null;
    const id = setInterval(() => {
      const isLiveWave = statusRef.current === 'wave';
      const isDebugWave = debugEnemySimulationActiveRef.current;
      if (!isLiveWave && !isDebugWave) return;
      const now = Date.now();
      const previousSimulationAt = lastWaveSimulationAtRef.current;
      lastWaveSimulationAtRef.current = now;
      const deltaMs = previousSimulationAt == null ? WAVE_SIMULATION_INTERVAL_MS : Math.max(1, now - previousSimulationAt);
      const timeScale = Math.min(1.5, deltaMs / GAME_TICK_MS);
      let nextBoard = boardRef.current; let boardChanged = false;
      const currentGridCols = gridColsRef.current;
      const patch = (r: number, c: number, fn: (cell: BoardCell) => BoardCell) => {
        if (!boardChanged) { nextBoard = [...nextBoard]; boardChanged = true; }
        const idx = boardIndex(r, c, currentGridCols);
        nextBoard[idx] = fn(nextBoard[idx]);
      };
      let hp = shipHpRef.current, ws = waveSpawnedRef.current, wd = waveDefeatedRef.current;
      let ens = enemiesRef.current.map((e) => ({ ...e }));
      let prj = projectilesRef.current.map((p) => ({ ...p }));
      const dmg = new Map<string, number>();
      const exerciseMinutes = sinceAprilRef.current.exerciseMinutes;
      const spawnIntervalMs = Math.max(IJOM_SPAWN_INTERVAL_MIN_MS, IJOM_SPAWN_INTERVAL_BASE_MS - Math.floor(exerciseMinutes / IJOM_SPAWN_INTERVAL_ACTIVE_MINUTES_DIVISOR));
      const difficultyRamp = Math.min(1.35, 1 + exerciseMinutes / IJOM_VILLAGE_DIFFICULTY_RAMP_DIVISOR);

      if (isLiveWave && ws < waveSize && now - lastEnemySpawnAtRef.current >= spawnIntervalMs) {
        const isSnow = Math.random() < 0.2;
        const baseDmg = Math.max(IJOM_MIN_DAMAGE, IJOM_BASE_DAMAGE + Math.floor(exerciseMinutes / IJOM_DAMAGE_ACTIVE_MINUTES_DIVISOR));
        const damage = isSnow ? baseDmg * SNOW_IJOM_DAMAGE_MULTIPLIER : baseDmg;
        const rawSpeed = (IJOM_SPEED_PER_TICK_BASE + Math.random() * IJOM_SPEED_PER_TICK_VARIANCE) * IJOM_VILLAGE_SPEED_SCALE * IJOM_SPEED_MULTIPLIER;
        const spawnPosition = getEnemySpawnPosition(ens, currentGridCols, isSnow ? 'snow' : 'normal');
        if (spawnPosition) {
          ens.push({ id: `e${(enemyIdRef.current += 1)}`, variant: isSnow ? 'snow' : 'normal', row: spawnPosition.row, col: spawnPosition.col, hp: isSnow ? 36 : 18, maxHp: isSnow ? 36 : 18, damage, speedPerTick: rawSpeed, spawnedAt: now, lastAttackAt: 0 });
          ws += 1;
          lastEnemySpawnAtRef.current = now;
        }
      }

      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < currentGridCols; c++) {
          const cell = getCell(nextBoard, r, c, currentGridCols);
          if (cell.unit !== 'boxer' && cell.unit !== 'tennis') continue;
          const isBoxer = cell.unit === 'boxer';
          const cooldownMs = isBoxer ? 1000 : 3000;
          const damage = getCombatUnitDamage(cell.unit, getTreeLevel(cell));
          if (now - cell.unitLastAttackAt < cooldownMs) continue;
          let targetIndex = -1, nearestDistance = Number.POSITIVE_INFINITY;
          for (let i = 0; i < ens.length; i++) {
            const enemy = ens[i];
            const rowDiff = enemy.row - r, colDiff = enemy.col - c, distance = Math.hypot(rowDiff, colDiff);
            if (!isBoxer) {
              if (distance > TENNIS_RANGE) continue;
            } else if (distance > BOXER_RANGE) {
              continue;
            }
            if (distance < nearestDistance) { nearestDistance = distance; targetIndex = i; }
          }
          if (targetIndex >= 0) {
            const targetEnemy = ens[targetIndex];
            const nextFacingScaleX: 1 | -1 = targetEnemy.col < c ? -1 : 1;
            if (isBoxer) {
              ens[targetIndex].hp -= damage;
            } else {
              const launchRow = r + 0.15;
              const dr = targetEnemy.row - launchRow;
              const dc = targetEnemy.col - c;
              const distance = Math.max(1e-4, Math.hypot(dr, dc));
              prj.push({
                id: `p${(projectileIdRef.current += 1)}`,
                row: launchRow,
                col: c,
                velRow: dr / distance,
                velCol: dc / distance,
                damage,
                speedPerTick: 0.3,
                remainingRange: TENNIS_RANGE,
              });
            }
            patch(r, c, (cc) => ({ ...cc, unitLastAttackAt: now, unitFacingScaleX: nextFacingScaleX }));
          }
        }
      }

      const footballExplosionEffects: FootballExplosionEffect[] = [];
      const explodeFootball = (impactRow: number, impactCol: number, damage: number) => {
        const centerRow = clamp(Math.round(impactRow), 0, GRID_ROWS - 1);
        const centerCol = clamp(Math.round(impactCol), 0, currentGridCols - 1);
        footballExplosionEffects.push({
          id: ++footballExplosionIdCounter.current,
          row: centerRow,
          col: centerCol,
          startedAt: now,
        });
        for (const enemy of ens) {
          if (
            Math.abs(enemy.row - centerRow) <= QUARTERBACK_SPLASH_CELL_RADIUS &&
            Math.abs(enemy.col - centerCol) <= QUARTERBACK_SPLASH_CELL_RADIUS
          ) {
            dmg.set(enemy.id, (dmg.get(enemy.id) ?? 0) + damage);
          }
        }
      };

      prj = prj.filter((p) => {
        const stepDistance = p.speedPerTick * timeScale;
        p.row += p.velRow * stepDistance;
        p.col += p.velCol * stepDistance;
        p.remainingRange -= stepDistance;
        p.traveledRange = (p.traveledRange ?? 0) + stepDistance;
        const expired = p.remainingRange <= 0 || p.row < -1 || p.row > GRID_ROWS || p.col < -1 || p.col > currentGridCols;
        let hitEnemyId: string | null = null;
        let nearestHitDistance = Number.POSITIVE_INFINITY;
        const hitRadius = p.kind === 'football' ? QUARTERBACK_PROJECTILE_HIT_RADIUS : TENNIS_PROJECTILE_HIT_RADIUS;
        for (const enemy of ens) {
          const d = Math.hypot(enemy.row - p.row, enemy.col - p.col);
          if (d <= hitRadius && d < nearestHitDistance) {
            hitEnemyId = enemy.id;
            nearestHitDistance = d;
          }
        }
        if (p.kind === 'football') {
          if (expired || hitEnemyId) {
            explodeFootball(p.row, p.col, p.damage);
            return false;
          }
          return true;
        }
        if (expired) return false;
        if (hitEnemyId) {
          dmg.set(hitEnemyId, (dmg.get(hitEnemyId) ?? 0) + p.damage);
          return false;
        }
        return true;
      });
      if (footballExplosionEffects.length > 0) {
        setFootballExplosions((prev) => [...prev, ...footballExplosionEffects]);
      }
      const blocked = (r: number, c: number) => r < 0 || r >= GRID_ROWS || c < 0 || c >= currentGridCols || getCell(nextBoard, r, c, currentGridCols).wallHeight > 0;
      const adjacentCells = (row: number, col: number) => [{ row: Math.floor(row), col: Math.round(col) }, { row: Math.ceil(row), col: Math.round(col) }, { row: Math.round(row), col: Math.floor(col) }, { row: Math.round(row), col: Math.ceil(col) }, { row: Math.round(row - 1), col: Math.round(col) }] as const;
      const resetSoilGrowthAt = (row: number, col: number) => {
        if (row < 0 || row >= GRID_ROWS || col < 0 || col >= currentGridCols) return;
        const cell = getCell(nextBoard, row, col, currentGridCols);
        if (cell.foundation !== 'soil') return;
        patch(row, col, (cc) => (
          cc.foundation === 'soil'
            ? {
              ...cc,
              soilPlacedAt: now,
              soilStartSwarmCompletionCount: swarmCompletionCount,
            }
            : cc
        ));
      };
      const trampleSoilAtEnemyPosition = (enemy: Enemy) => {
        resetSoilGrowthAt(Math.round(enemy.row), Math.round(enemy.col));
      };
      const nearVulnerableUnit = (e: Enemy): { row: number; col: number } | null => { for (const { row: r, col: c } of adjacentCells(e.row, e.col)) { if (r < 0 || r >= GRID_ROWS || c < 0 || c >= currentGridCols) continue; const cc = getCell(nextBoard, r, c, currentGridCols); if (isDamageableUnit(cc.unit) && Math.hypot(r - e.row, c - e.col) <= ENEMY_UNIT_ATTACK_RADIUS) return { row: r, col: c }; } return null; };
      const nearWall = (e: Enemy) => { for (const { row: r, col: c } of adjacentCells(e.row, e.col)) { if (r < 0 || r >= GRID_ROWS || c < 0 || c >= currentGridCols) continue; const cc = getCell(nextBoard, r, c, currentGridCols); if (cc.foundation && cc.wallHeight > 0 && Math.hypot(r - e.row, c - e.col) <= ENEMY_WALL_ATTACK_RADIUS) return { row: r, col: c }; } return null; };
      const findWallTarget = (e: Enemy): { row: number; col: number } | null => { const br = Math.round(e.row), bc = Math.round(e.col); let best: { row: number; col: number; dist: number } | null = null; for (let dr = -SNOW_WALL_SEEK_RANGE; dr <= 0; dr++) { for (let dc = -SNOW_WALL_SEEK_RANGE; dc <= SNOW_WALL_SEEK_RANGE; dc++) { const wr = br + dr, wc = bc + dc; if (wr < 0 || wr >= GRID_ROWS || wc < 0 || wc >= currentGridCols) continue; if (getCell(nextBoard, wr, wc, currentGridCols).wallHeight <= 0) continue; const d = Math.hypot(wr - e.row, wc - e.col); if (d <= SNOW_WALL_SEEK_RANGE && (!best || d < best.dist)) best = { row: wr, col: wc, dist: d }; } } return best; };

      const currentCapy = crazyCapyRef.current;
      const crazyCapyKnockoutIds = new Set<string>();
      const crazyCapyNewKnockoutEffects: CrazyCapyKnockoutEffect[] = [];
      let crazyCapyForKnockouts: CrazyCapyState | null = currentCapy;
      if (currentCapy) {
        const nextCapy = stepCrazyCapy(currentCapy, currentGridCols, now, nextBoard, timeScale);
        if (!nextCapy) {
          finishCrazyCapyRun();
          crazyCapyForKnockouts = null;
        } else {
          crazyCapyRef.current = nextCapy;
          setCrazyCapy(nextCapy);
          crazyCapyForKnockouts = nextCapy;
          const hitAtByEnemyId = crazyCapyHitAtByEnemyIdRef.current;
          for (const enemy of ens) {
            if (Math.hypot(enemy.row - nextCapy.row, enemy.col - nextCapy.col) > CRAZY_CAPY_HIT_RADIUS) continue;
            const lastHitAt = hitAtByEnemyId[enemy.id] ?? 0;
            if (now - lastHitAt < CRAZY_CAPY_HIT_COOLDOWN_MS) continue;
            enemy.hp -= CRAZY_CAPY_DAMAGE;
            if (enemy.hp <= 0) crazyCapyKnockoutIds.add(enemy.id);
            hitAtByEnemyId[enemy.id] = now;
          }
        }
      }

      const enemySpacingSnapshot = ens.map((enemy) => ({ ...enemy }));
      ens = ens.map((e) => {
        const pd = dmg.get(e.id) ?? 0; if (pd) e.hp -= pd;
        if (e.hp <= 0) {
          wd += 1;
          if (crazyCapyKnockoutIds.has(e.id)) {
            crazyCapyNewKnockoutEffects.push(createCrazyCapyKnockoutEffect(e, crazyCapyForKnockouts, now));
          }
          return null;
        }
        if (enemyReachedCastle(e)) {
          if (isLiveWave) hp = Math.max(0, hp - 14);
          return null;
        }
        const nu = nearVulnerableUnit(e);
        if (nu) { if (now - e.lastAttackAt >= ENEMY_TREE_ATTACK_COOLDOWN_MS) { patch(nu.row, nu.col, (cc) => { if (!isDamageableUnit(cc.unit)) return cc; const max = cc.unitMaxHp > 0 ? cc.unitMaxHp : getUnitMaxHp(cc.unit, cc.unitLevel || 1); const cur = cc.unitHp > 0 ? cc.unitHp : max; const next = cur - e.damage; if (next <= 0) return { ...cc, unit: null, unitHp: 0, unitMaxHp: 0, unitLevel: 0, unitFacingScaleX: 1, unitLastAttackAt: 0, unitRewardBaselineCompletionCount: null }; return { ...cc, unitHp: next, unitMaxHp: max }; }); e.lastAttackAt = now; } trampleSoilAtEnemyPosition(e); return e; }
        const nw = nearWall(e);
        if (nw) {
          if (now - e.lastAttackAt >= ENEMY_WALL_ATTACK_COOLDOWN_MS) {
            const wallDamage = e.variant === 'snow' ? SNOW_IJOM_WALL_DAMAGE : NORMAL_IJOM_WALL_DAMAGE;
            patch(nw.row, nw.col, (cc) => {
              const wallMaxHp = getWallMaxHp(cc.wallType);
              const nextHp = cc.wallHp - wallDamage;
              if (nextHp <= 0) {
                const nextHeight = Math.max(0, cc.wallHeight - 1);
                return { ...cc, wallHeight: nextHeight, wallHp: nextHeight > 0 ? wallMaxHp : 0, wallType: nextHeight > 0 ? cc.wallType : null };
              }
              return { ...cc, wallHp: nextHp };
            });
            e.lastAttackAt = now;
          }
          trampleSoilAtEnemyPosition(e);
          return e;
        }
        if (e.variant === 'snow') { const wallTarget = findWallTarget(e); if (wallTarget) { const vr = wallTarget.row - e.row, vc = wallTarget.col - e.col, m = Math.max(1e-4, Math.hypot(vr, vc)); const step = e.speedPerTick * difficultyRamp * timeScale; const nextRow = e.row + (vr / m) * step; const nextCol = e.col + (vc / m) * step; const nextPosition = resolveEnemySpacing(e, nextRow, nextCol, enemySpacingSnapshot, currentGridCols); e.row = nextPosition.row; e.col = nextPosition.col; trampleSoilAtEnemyPosition(e); return e; } }
        const br = Math.round(e.row), bc = Math.round(e.col), sd = e.col < CASTLE_TARGET_COL ? 1 : -1;
        let tr = -1, tc = CASTLE_TARGET_COL;
        for (const { dr, dc } of [{ dr: -1, dc: 0 }, { dr: -1, dc: sd }, { dr: 0, dc: sd }, { dr: 0, dc: -sd }, { dr: 1, dc: 0 }]) { const pr = br + dr, pc = clamp(bc + dc, 0, currentGridCols - 1); if (pr < 0) { tr = -1; tc = CASTLE_TARGET_COL; break; } if (!blocked(pr, pc)) { tr = pr; tc = pc; break; } }
        const vr = tr - e.row, vc = tc - e.col, m = Math.max(1e-4, Math.hypot(vr, vc)); const step = e.speedPerTick * difficultyRamp * timeScale;
        const nextRow = e.row + (vr / m) * step;
        const nextCol = e.col + (vc / m) * step;
        const nextPosition = resolveEnemySpacing(e, nextRow, nextCol, enemySpacingSnapshot, currentGridCols);
        e.row = nextPosition.row; e.col = nextPosition.col; trampleSoilAtEnemyPosition(e); return e;
      }).filter(Boolean) as Enemy[];
      if (crazyCapyNewKnockoutEffects.length > 0) {
        setCrazyCapyKnockoutEffects((prev) => [...prev, ...crazyCapyNewKnockoutEffects]);
      }

      if (boardChanged) { boardRef.current = nextBoard; setBoard(nextBoard); }
      enemiesRef.current = ens; projectilesRef.current = prj; waveSpawnedRef.current = ws; waveDefeatedRef.current = wd; shipHpRef.current = hp;
      setEnemies(ens); setProjectiles(prj); setWaveSpawned(ws); setWaveDefeated(wd); setShipHp(hp);
      if (!isLiveWave && ens.length === 0 && prj.length === 0) {
        debugEnemySimulationActiveRef.current = false;
        lastWaveSimulationAtRef.current = null;
        setDebugEnemySimulationActive(false);
        return;
      }
      if (isLiveWave && hp <= 0) {
        stopCurrentAudioImmediately();
        lastWaveSimulationAtRef.current = null;
        pendingCompletedSwarmAutosaveOutcomeRef.current = 'lost';
        setCompletedSwarmAutosaveState('saving');
        setStatus('lost'); statusRef.current = 'lost'; setShowDefeatModal(true); return;
      }
      if (isLiveWave && ws >= waveSize && ens.length === 0) {
        stopCurrentAudioImmediately();
        lastWaveSimulationAtRef.current = null;
        pendingCompletedSwarmAutosaveOutcomeRef.current = 'cleared';
        setCompletedSwarmAutosaveState('saving');
        setStatus('cleared'); statusRef.current = 'cleared'; setShowVictoryModal(true);
      }
    }, WAVE_SIMULATION_INTERVAL_MS);
    return () => {
      clearInterval(id);
      lastWaveSimulationAtRef.current = null;
    };
  }, [debugEnemySimulationActive, finishCrazyCapyRun, status, stopCurrentAudioImmediately, swarmCompletionCount, waveSize]);

  /* ── derived ───────────────────────────────────────────── */
  const shipHpRatio = clamp(shipHp / SHIP_MAX_HP, 0, 1);
  const hasCrazyCapyStatue = useMemo(
    () => board.some((cell) => cell.unit === 'capybara_statue'),
    [board],
  );
  const crazyCapyProgressRatio = crazyCapy
    ? clamp((crazyCapy.activeUntil - Date.now()) / crazyCapy.durationMs, 0, 1)
    : crazyCapyChargeRatio;
  const crazyCapyDisplayProgressRatio = hasCrazyCapyStatue ? crazyCapyProgressRatio : 0;
  const crazyCapyReady = crazyCapyChargeRatio >= 1;
  const crazyCapyCanInspect = !dragItem && hasCrazyCapyStatue;
  const crazyCapyRemainingCalories = getCrazyCapyChargeRemainingCalories(
    currentActiveCalories,
    crazyCapyChargeStartCalories,
  );
  const crazyCapyChargeProgressCalories = CRAZY_CAPY_CHARGE_ACTIVE_CALORIES - crazyCapyRemainingCalories;
  const crazyCapyStatusLabel = crazyCapy
    ? `${Math.max(1, Math.ceil((crazyCapy.activeUntil - Date.now()) / 1000))}s`
    : crazyCapyReady
      ? 'Ready'
      : `${Math.round(crazyCapyChargeRatio * 100)}%`;
  const incomingWaveSize = useMemo(
    () => getIncomingWaveSize(board, displayedSwarmStreak),
    [board, displayedSwarmStreak],
  );
  const defenseForecast = useMemo(
    () => getDefenseForecast(board, gridCols, incomingWaveSize),
    [board, gridCols, incomingWaveSize],
  );
  const hudHeaderTitle = status === 'wave' ? 'DEFENSES ACTIVATED' : 'Next Wave: ' + `${formatCountdown(countdownMs)}`;
  const castleGroundBounds = useMemo(() => {
    const grassInset = 2, grassTopPad = 2, grassH = 48;
    let minL = Infinity, maxR = -Infinity, minT = Infinity, maxB = -Infinity;
    for (let r = CASTLE_ROW_MIN; r <= CASTLE_ROW_MAX; r++) for (let c = CASTLE_COL_MIN; c <= CASTLE_COL_MAX; c++) {
      const p = isoPosition(r, c); const gl = p.left + grassInset; const gr = p.left + TILE_WIDTH - grassInset; const gt = p.top - grassTopPad; const gb = gt + grassH;
      minL = Math.min(minL, gl); maxR = Math.max(maxR, gr); minT = Math.min(minT, gt); maxB = Math.max(maxB, gb);
    }
    return { minL, maxR, minT, maxB, cx: (minL + maxR) / 2, cy: (minT + maxB) / 2 };
  }, [isoPosition]);

  const castleSprite = useMemo(() => {
    const { cx, maxB, minL, maxR } = castleGroundBounds;
    const footW = maxR - minL;
    const w = Math.max(CASTLE_SPRITE_MIN_WIDTH, footW * CASTLE_SPRITE_SCALE);
    const aspect = 198 / 230;
    const h = w * aspect;
    const baseNudgeX = -footW * 0.045;
    return {
      left: cx - w / 2 + baseNudgeX + CASTLE_SPRITE_OFFSET_X,
      top: maxB - h * 0.86 + CASTLE_SPRITE_OFFSET_Y,
      width: w,
      height: h,
    };
  }, [castleGroundBounds]);
  const castleAvatar = useMemo(() => {
    const width = clamp(castleSprite.width * 0.18, 28, 42);
    const height = width * 1.12;
    return {
      left: castleSprite.width * 0.46,
      top: castleSprite.height * 0.38,
      width,
      height,
    };
  }, [castleSprite.height, castleSprite.width]);
  const villageAvatarSprite = useMemo(() => {
    const width = clamp(castleSprite.width * 0.16, 24, 36);
    const height = width * 1.14;
    return { width, height };
  }, [castleSprite.width]);
  // Starter houses should sit just behind front-edge walls instead of tying them.
  const castleZIndex = 100 + (CASTLE_ROW_MAX + CASTLE_COL_MAX) * 10 + (HOME_BASE_VARIANT === 'starter_house' ? 0 : 1) + CASTLE_Z_INDEX_OFFSET;
  const homeBaseOverlayZIndex = castleZIndex + 2;
  const homeBaseBannerPosition = useMemo(() => {
    if (HOME_BASE_VARIANT === 'starter_house') {
      return {
        left: castleSprite.left + castleSprite.width * 0.58,
        top: castleSprite.top - 18,
      };
    }
    return {
      left: castleSprite.left + castleSprite.width - 18,
      top: castleSprite.top - 134,
    };
  }, [castleSprite]);
  const homeBaseHpTrackPosition = useMemo(() => {
    if (HOME_BASE_VARIANT === 'starter_house') {
      return {
        left: castleSprite.left + castleSprite.width * 0.67,
        top: castleSprite.top + 10,
      };
    }
    return {
      left: castleSprite.left + castleSprite.width - 85,
      top: castleSprite.top - 15,
    };
  }, [castleSprite]);
  const waveLabel = getWaveLabel(status, waveDefeated, waveSize);
  const hasQuarterbackThrowTarget = status === 'wave' || enemies.length > 0;
  const quarterbackThrowPadBottom = Math.max(132, insets.bottom + 128);
  const selectedQuarterbackControlCell = useMemo(() => {
    if (!selectedTooltipCell) return null;
    if (!isWithinBoard(selectedTooltipCell.row, selectedTooltipCell.col, gridCols)) return null;
    const cell = getCell(board, selectedTooltipCell.row, selectedTooltipCell.col, gridCols);
    return cell.unit === 'quarterback'
      ? { row: selectedTooltipCell.row, col: selectedTooltipCell.col }
      : null;
  }, [board, gridCols, selectedTooltipCell]);
  const quarterbackThrowControlCell = useMemo(
    () =>
      quarterbackAim
        ? { row: quarterbackAim.row, col: quarterbackAim.col }
        : quarterbackThrowAnchorCell ?? selectedQuarterbackControlCell,
    [quarterbackAim, quarterbackThrowAnchorCell, selectedQuarterbackControlCell],
  );
  useEffect(() => {
    quarterbackThrowControlCellRef.current = quarterbackThrowControlCell;
  }, [quarterbackThrowControlCell]);
  const activateSwarmLabel = useMemo(() => {
    if (!swarmProgressLoaded) return 'Loading...';
    if (status === 'wave') return 'Swarm Active';
    if (isSwarmUnlocked) return 'Activate Swarm';
    return formatCountdown(countdownMs);
  }, [countdownMs, isSwarmUnlocked, status, swarmProgressLoaded]);
  const activateSwarmSubtext = useMemo(() => {
    if (!swarmProgressLoaded) return 'Checking daily swarm timer';
    if (status === 'wave') return 'Finish today to keep your streak alive';
    if (isSwarmUnlocked) return 'Available now until you play';
    return getNextSwarmUnlockLabel(effectiveSwarmUnlockAtMs);
  }, [effectiveSwarmUnlockAtMs, isSwarmUnlocked, status, swarmProgressLoaded]);

  const ghostPreview = useMemo(() => {
    if (!hoverCell || !dragItem || dragItem === 'erase' || dragItem === 'heal') return null;
    if (isHomeReservedCell(hoverCell.row, hoverCell.col)) return null;
    const bc = getCell(board, hoverCell.row, hoverCell.col, gridCols);
    if (isFoundationTool(dragItem)) {
      if (bc.foundation === dragItem || bc.wallHeight > 0 || bc.unit) return null;
      const p = isoPosition(hoverCell.row, hoverCell.col);
      return { source: getFoundationImage(dragItem), left: p.left + 2, top: p.top - 2, w: TILE_WIDTH - 4, h: 48 };
    }
    if (dragItem === 'boxer' || dragItem === 'tennis' || dragItem === 'quarterback' || dragItem === 'house' || dragItem === 'windmill' || dragItem === 'capybara_statue' || dragItem === 'chest') { if (!bc.foundation || bc.unit || bc.wallHeight > 0) return null; const p = isoPosition(hoverCell.row, hoverCell.col, 1); if (dragItem === 'house') return { source: TINY_HOUSE_IMAGE, left: p.left + (TILE_WIDTH - HOUSE_SPRITE_W) / 2, top: p.top + TILE_HEIGHT - HOUSE_SPRITE_H, w: HOUSE_SPRITE_W, h: HOUSE_SPRITE_H }; if (dragItem === 'windmill') { const windmillPos = getWindmillSpritePosition(p.left, p.top); return { source: WINDMILL_IMAGE, left: windmillPos.left, top: windmillPos.top, w: WINDMILL_SPRITE_W, h: WINDMILL_SPRITE_H }; } if (dragItem === 'capybara_statue') { const capybaraPos = getCapybaraSpritePosition(p.left, p.top); return { source: CAPYBARA_STATUE_IMAGE, left: capybaraPos.left, top: capybaraPos.top, w: CAPYBARA_STATUE_SPRITE_W, h: CAPYBARA_STATUE_SPRITE_H }; } if (dragItem === 'chest') { const chestPos = getChestSpritePosition(p.left, p.top); return { source: CHEST_IMAGE, left: chestPos.left, top: chestPos.top, w: CHEST_SPRITE_W, h: CHEST_SPRITE_H }; } return { source: dragItem === 'boxer' ? BOXER_FRAMES[0] : dragItem === 'tennis' ? TENNIS_FRAMES[0] : QUARTERBACK_IMAGE, left: p.left + 9, top: p.top - 2, w: 56, h: 56 }; }
    if (dragItem !== 'wall' && dragItem !== 'fence') return null;
    if (!bc.foundation || bc.unit || bc.wallHeight > 0) return null;
    const p = isoPosition(hoverCell.row, hoverCell.col, bc.wallHeight + 1);
    const wallType = dragItem === 'fence' ? 'wood' : 'stone';
    const wallSprite = getWallSpritePosition(wallType, p.left, p.top);
    return {
      source: dragItem === 'fence' ? WOOD_FENCE_IMAGE : WALL_TILE_IMAGE,
      left: wallSprite.left,
      top: wallSprite.top,
      w: wallSprite.width,
      h: wallSprite.height,
    };
  }, [hoverCell, dragItem, board, gridCols, isoPosition]);

  const quarterbackAimPreview = useMemo<QuarterbackAimPreview | null>(() => {
    if (!quarterbackAim) return null;
    const launch = getQuarterbackLaunchFromAim(quarterbackAim);
    if (!launch) return null;

    const points: QuarterbackAimPreview['points'] = [];
    for (let index = 1; index <= QUARTERBACK_PREVIEW_SEGMENTS; index += 1) {
      const progress = index / QUARTERBACK_PREVIEW_SEGMENTS;
      const row = launch.launchRow + launch.velRow * launch.range * progress;
      const col = launch.launchCol + launch.velCol * launch.range * progress;
      if (row < -0.6 || row > GRID_ROWS + 0.6 || col < -0.6 || col > gridCols + 0.6) break;
      const elevation = 0.55 + Math.sin(progress * Math.PI) * launch.arcHeight;
      const pos = isoPosition(row, col, elevation);
      const size = index === QUARTERBACK_PREVIEW_SEGMENTS ? 10 : 5 + progress * 2;
      points.push({
        key: `qb-preview-${index}`,
        left: pos.left + HALF_W - size / 2,
        top: pos.top + HALF_H * 0.4 - size / 2,
        size,
        opacity: 0.32 + progress * 0.58,
      });
    }

    const landingRow = Math.round(launch.launchRow + launch.velRow * launch.range);
    const landingCol = Math.round(launch.launchCol + launch.velCol * launch.range);
    const landingCell = isWithinBoard(landingRow, landingCol, gridCols)
      ? { row: landingRow, col: landingCol }
      : null;

    return { landingCell, points, powerRatio: launch.powerRatio };
  }, [getQuarterbackLaunchFromAim, gridCols, isoPosition, quarterbackAim]);

  const quarterbackAimPreviewNode = quarterbackAimPreview ? (
    <>
      {quarterbackAimPreview?.landingCell && (() => {
        const landing = isoPosition(quarterbackAimPreview.landingCell.row, quarterbackAimPreview.landingCell.col);
        return (
          <View
            pointerEvents="none"
            style={[
              sceneStyles.quarterbackAimLanding,
              {
                left: landing.left - 2,
                top: landing.top - 2,
                zIndex: 610,
              },
            ]}
          >
            <View style={sceneStyles.quarterbackAimLandingDiamond} />
          </View>
        );
      })()}
      {quarterbackAimPreview?.points.map((point) => (
        <View
          key={point.key}
          pointerEvents="none"
          style={[
            sceneStyles.quarterbackAimDot,
            {
              height: point.size,
              left: point.left,
              opacity: point.opacity,
              top: point.top,
              width: point.size,
              zIndex: 620,
            },
          ]}
        />
      ))}
    </>
  ) : null;

  useEffect(() => {
    if (!showExpansionModal) return;
    if (maxExpandableColumns <= 0) {
      setPendingExpansionColumns(1);
      return;
    }
    setPendingExpansionColumns((prev) => clamp(prev, 1, maxExpandableColumns));
  }, [maxExpandableColumns, showExpansionModal]);

  /* ── paginated tool data ───────────────────────────────── */
  const visibleTools = useMemo(
    () => BUILD_TOOLS.slice(toolPage * TOOLS_PER_PAGE, (toolPage + 1) * TOOLS_PER_PAGE),
    [toolPage],
  );
  const dragGhostSources = DRAG_GHOST_SOURCES;
  const projectileRenderNowMs = Date.now();

  const cellTooltip = (
    <SwarmVillageCellTooltip
      availableEnergy={availableEnergy}
      board={board}
      castleGroundBounds={castleGroundBounds}
      gridCols={gridCols}
      harvestingCellKey={harvestingCellKey}
      isoPosition={isoPosition}
      onCollectWindmillReward={handleCollectWindmillReward}
      onHarvestSoil={handleHarvestSoil}
      onOpenChest={handleOpenChest}
      onRotateCell={rotateCell}
      onUpgradeTree={handleUpgradeTree}
      selectedTooltipCell={selectedTooltipCell}
      shipHp={shipHp}
      starBalance={starBalance}
      swarmCompletionCount={swarmCompletionCount}
      treeUpgradeInFlightCellKey={treeUpgradeInFlightRef.current}
    />
  );

  const skiaSceneOverlays = (
    <>
      {cellLayout.map((cell) => {
        const bc = getCell(board, cell.row, cell.col, gridCols);
        const isHover = hoverCell?.row === cell.row && hoverCell?.col === cell.col;
        const isSel = !hoverCell && selectedCellKey === cell.key;
        const isHealHover = isHover && dragItem === 'heal';
        if (!isHover && !isSel && !isHealHover) return null;
        return (
          <View
            key={`skia-hl-${cell.key}`}
            pointerEvents="none"
            style={[
              sceneStyles.cellHighlight,
              {
                left: cell.left - 2,
                top: cell.top - 2,
                width: TILE_WIDTH + 4,
                height: TILE_HEIGHT + 4,
                zIndex: 20 + cell.row + cell.col,
              },
            ]}
          >
            <View
              style={[
                sceneStyles.diamond,
                (bc.foundation || isHover || isSel) && sceneStyles.diamondActive,
                (isHover || isSel) && sceneStyles.diamondHover,
                isHealHover && sceneStyles.diamondHeal,
              ]}
            />
          </View>
        );
      })}

      {status !== 'wave' && !dragItem && (
        <View
          pointerEvents="none"
          style={[
            sceneStyles.expansionGhostTile,
            {
              left: expansionTileBounds.left - 11,
              top: expansionTileBounds.top - 23,
              width: expansionTileBounds.width - 3,
              height: expansionTileBounds.height + 60,
              zIndex: 520,
            },
          ]}
        >
          <View style={sceneStyles.expansionGhostPlusWrap}>
            <Ionicons name="add" size={22} color="#67e8f9" />
          </View>
        </View>
      )}

      {activeSparkles.map((s) => (
        <HealSparkleEffect key={s.id} sparkle={s} isoPositionFn={isoPosition} onComplete={removeSparkle} />
      ))}

      {footballExplosions.map((effect) => (
        <FootballExplosionEffectView
          key={effect.id}
          effect={effect}
          isoPositionFn={isoPosition}
          onComplete={removeFootballExplosion}
        />
      ))}

      {quarterbackAimPreviewNode}

      {crazyCapyTapPulses.map((pulse) => (
        <CrazyCapyTapPulseEffect
          key={pulse.id}
          pulse={pulse}
          isoPositionFn={isoPosition}
          onComplete={removeCrazyCapyTapPulse}
        />
      ))}

      <View pointerEvents="none" style={[sceneStyles.castleWrap, { left: castleSprite.left, top: castleSprite.top, width: castleSprite.width, zIndex: castleZIndex, opacity: dragItem ? 0.5 : 1 }]}>
        <Image source={HOME_BASE_IMAGE} resizeMode="contain" style={{ width: castleSprite.width, height: castleSprite.height }} />
        <View
          style={[
            sceneStyles.castleAvatarPlatform,
            {
              left: castleAvatar.left - 2,
              top: castleAvatar.top + castleAvatar.height - 7,
              width: castleAvatar.width + 4,
              opacity: villageAvatarWalk ? 0 : 1,
            },
          ]}
        />
        <Image
          source={castleAvatarSource}
          resizeMode="contain"
          style={[
            sceneStyles.castleAvatarImage,
            {
              left: castleAvatar.left - 30,
              top: castleAvatar.top,
              width: castleAvatar.width,
              height: castleAvatar.height,
              opacity: villageAvatarWalk ? 0 : 1,
            },
          ]}
        />
      </View>
      <View
        pointerEvents="none"
        style={[
          sceneStyles.castleBanner,
          {
            left: homeBaseBannerPosition.left,
            top: homeBaseBannerPosition.top,
            zIndex: homeBaseOverlayZIndex,
            opacity: dragItem ? 0.5 : 1,
          },
        ]}
      >
        <Text style={sceneStyles.castleBannerText}>{HOME_BASE_LABEL}</Text>
      </View>
      <View
        pointerEvents="none"
        style={[
          sceneStyles.castleHpTrackMap,
          {
            left: homeBaseHpTrackPosition.left,
            top: homeBaseHpTrackPosition.top,
            zIndex: homeBaseOverlayZIndex,
            opacity: dragItem ? 0.5 : 1,
          },
        ]}
      >
        <View style={[sceneStyles.castleHpFillMap, { width: `${shipHpRatio * 100}%` }]} />
      </View>

      {villageAvatarWalk && (() => {
        const pos = isoPosition(villageAvatarWalk.row, villageAvatarWalk.col, 0.42);
        const bob = Math.sin(Date.now() / 180) * 1.5;
        return (
          <View
            pointerEvents="none"
            style={[
              sceneStyles.villageAvatarWrap,
              {
                left: pos.left + TILE_WIDTH / 2 - villageAvatarSprite.width / 2 + VILLAGE_AVATAR_OFFSET_X,
                top: pos.top - villageAvatarSprite.height + VILLAGE_AVATAR_OFFSET_Y + bob,
                zIndex: 430 + Math.floor((villageAvatarWalk.row + villageAvatarWalk.col) * 10),
                opacity: dragItem ? 0.5 : 1,
                transform: [{ scaleX: villageAvatarWalk.facingScaleX }],
              },
            ]}
          >
            <View style={sceneStyles.villageAvatarShadow} />
            <Image
              source={castleAvatarSource}
              resizeMode="contain"
              style={[
                sceneStyles.villageAvatarImage,
                {
                  width: villageAvatarSprite.width,
                  height: villageAvatarSprite.height,
                },
              ]}
            />
          </View>
        );
      })()}

      <SwarmVillageCrazyCapySprite
        crazyCapy={crazyCapy}
        dimmed={!!dragItem}
        isoPosition={isoPosition}
        nowMs={projectileRenderNowMs}
      />

      <SwarmVillageCrazyCapyKnockoutEffects
        dimmed={!!dragItem}
        effects={crazyCapyKnockoutEffects}
        isoPosition={isoPosition}
        nowMs={projectileRenderNowMs}
        spriteLeftOffset={10}
        spriteTopOffset={-46}
      />

      {cellTooltip}
    </>
  );

  const villageGalleryPreview = (
    <SwarmVillageGalleryPreview
      ref={villagePreviewShotRef}
      board={board}
      boardHeight={boardHeight}
      boardWidth={boardWidth}
      castleAvatar={castleAvatar}
      castleAvatarSource={castleAvatarSource}
      castleSprite={castleSprite}
      castleZIndex={castleZIndex}
      gridCols={gridCols}
      placedSprites={placedSprites}
    />
  );

  /* ═══════════════════════════ RENDER ════════════════════════ */
  return (
    <View style={sceneStyles.container}>
      {villageGalleryPreview}
      <LinearGradient colors={['#245971ff', '#48bbf0ff']} style={StyleSheet.absoluteFill} />
      <View style={[sceneStyles.waterBand, { top: insets.top + 68 }]} pointerEvents="none" />
      <View style={sceneStyles.horizonGlow} pointerEvents="none" />

      <SwarmVillageHud
        activateDisabled={!swarmProgressLoaded || status === 'wave' || !isSwarmUnlocked}
        activateSwarmLabel={activateSwarmLabel}
        activateSwarmSubtext={activateSwarmSubtext}
        defenseForecast={defenseForecast}
        displayedStarBalance={displayedStarBalance}
        displayedSwarmStreak={displayedSwarmStreak}
        dragActive={!!dragItem}
        forestSpiritCharges={forestSpiritCharges}
        forestSpiritImageSource={FOREST_SPIRIT_IMAGE}
        forestSpiritProgress={forestSpiritDisplayProgress}
        forestSpiritProgressLoaded={forestSpiritProgressLoaded}
        forestSpiritRequiredDays={FOREST_SPIRIT_REQUIRED_STREAK_DAYS}
        headerTitle={hudHeaderTitle}
        insetsTop={insets.top}
        isHudCollapsed={isHudCollapsed || !!quarterbackAim}
        onExitPress={handleExitPress}
        onStartWave={() => { void startWave(); }}
        onToggleCollapsed={() => setIsHudCollapsed((v) => !v)}
        onUseForestSpirit={() => { void activateForestSpirit(); }}
        remainingIjoms={Math.max(0, waveSize - waveDefeated)}
        swarmActive={status === 'wave'}
        swarmScheduleTourRef={swarmScheduleTourRef}
        starBalanceTargetRef={starBalanceTargetRef}
        totalIjoms={waveSize}
        starIconSource={STAR_IMAGE}
        waveLabel={waveLabel}
      />

      {hasCrazyCapyStatue && (
        <Pressable
          accessibilityLabel="Open Crazy Capy details"
          accessibilityRole="button"
          disabled={!crazyCapyCanInspect}
          onPress={activateCrazyCapy}
          style={[
            sceneStyles.crazyCapyPowerup,
            crazyCapyReady && sceneStyles.crazyCapyPowerupReady,
            !crazyCapyCanInspect && sceneStyles.crazyCapyPowerupDisabled,
            { top: insets.top + (isHudCollapsed ? 84 : 276) },
          ]}
        >
          <View style={sceneStyles.crazyCapyPowerupIcon}>
            <View
              pointerEvents="none"
              style={[
                sceneStyles.crazyCapyPowerupIconFill,
                { height: `${crazyCapyDisplayProgressRatio * 100}%` },
              ]}
            />
            <Image source={CAPYBARA_POWERUP_IMAGE} resizeMode="cover" style={sceneStyles.crazyCapyPowerupImage} />
            <Text style={sceneStyles.crazyCapyPowerupLabel}>Crazy Capy</Text>
          </View>
          <Text style={sceneStyles.crazyCapyPowerupMeta}>{crazyCapyStatusLabel}</Text>
        </Pressable>
      )}

      {renderMode !== 'skia' && (
        <>
          <Pressable
            accessibilityLabel="Spawn a test Ijom"
            accessibilityRole="button"
            onPress={spawnDebugNormalIjom}
            style={[
              sceneStyles.debugSpawnButton,
              { top: insets.top + (isHudCollapsed ? 170 : 364) },
            ]}
          >
            <Text style={sceneStyles.debugSpawnButtonKicker}>Preview</Text>
            <Text style={sceneStyles.debugSpawnButtonLabel}>IJOM</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Spawn a test snow Ijom"
            accessibilityRole="button"
            onPress={spawnDebugSnowIjom}
            style={[
              sceneStyles.debugSpawnButton,
              { top: insets.top + (isHudCollapsed ? 242 : 436) },
            ]}
          >
            <Text style={sceneStyles.debugSpawnButtonKicker}>Preview</Text>
            <Text style={sceneStyles.debugSpawnButtonLabel}>Snow IJOM</Text>
          </Pressable>
        </>
      )}

      {/* SCENE */}
      {renderMode === 'skia' ? (
        <SwarmVillageSkiaScene
          boardCenterX={boardCenterX}
          boardHeight={boardHeight}
          boardWidth={boardWidth}
          dragItem={dragItem}
          enemies={enemies}
          ghostPreview={ghostPreview}
          nowMs={Date.now()}
          onSceneTap={handleSceneTap}
          placedSprites={placedSprites}
          projectiles={projectiles}
          scale={skiaScale}
          translateX={skiaTranslateX}
          translateY={skiaTranslateY}
          viewportHeight={height}
          viewportWidth={width}
        >
          {skiaSceneOverlays}
        </SwarmVillageSkiaScene>
      ) : (
        <View style={sceneStyles.sceneShell} {...gestureResponder.panHandlers}>
          <Animated.View style={[sceneStyles.sceneTranslate, { transform: [{ translateX: translate.x }, { translateY: translate.y }] }]}>
            <Animated.View style={[sceneStyles.sceneScale, { width: boardWidth, height: boardHeight, transform: [{ scale }] }]}>
              <View style={[sceneStyles.boardShadow, { top: boardTopInset + (GRID_ROWS + gridCols) * HALF_H + 132 }]} />

              {gridLines.map((l) => (
                <View key={l.key} pointerEvents="none" style={[sceneStyles.gridLine, { width: l.length, left: l.cx - l.length / 2, top: l.cy, transform: [{ rotate: `${l.angle}rad` }], zIndex: 10 }]} />
              ))}

              {cellLayout.map((cell) => {
                const bc = getCell(board, cell.row, cell.col, gridCols);
                const isHover = hoverCell?.row === cell.row && hoverCell?.col === cell.col;
                const isSel = !hoverCell && selectedCellKey === cell.key;
                if (!bc.foundation && !isHover && !isSel) return null;
                const isHealHover = isHover && dragItem === 'heal';
                return (
                  <View key={`hl-${cell.key}`} pointerEvents="none" style={[sceneStyles.cellHighlight, { left: cell.left - 2, top: cell.top - 2, width: TILE_WIDTH + 4, height: TILE_HEIGHT + 4, zIndex: 20 + cell.row + cell.col }]}>
                    <View style={[sceneStyles.diamond, bc.foundation && sceneStyles.diamondActive, (isHover || isSel) && sceneStyles.diamondHover, isHealHover && sceneStyles.diamondHeal]} />
                  </View>
                );
              })}

              {cellLayout.map((cell) => {
                const bc = getCell(board, cell.row, cell.col, gridCols);
                if (!bc.foundation) return null;
                const cellNumber = cell.row * gridCols + cell.col + 1;
                return (
                  <View
                    key={`num-${cell.key}`}
                    pointerEvents="none"
                    style={[
                      sceneStyles.cellNumberWrap,
                      {
                        left: cell.left + TILE_WIDTH / 2 - 12,
                        top: cell.top + TILE_HEIGHT / 2 - 11,
                      },
                    ]}
                  >
                    <Text style={sceneStyles.cellNumberText}>{cellNumber}</Text>
                  </View>
                );
              })}

              {placedSprites.map((s) => {
                let source = s.source;
                let transform = undefined;
                const isWall = !!s.wallType;
                if (s.unit === 'boxer' || s.unit === 'tennis') {
                  const isBoxer = s.unit === 'boxer';
                  const frames = isBoxer ? BOXER_FRAMES : TENNIS_FRAMES;
                  const t = Date.now() - (s.unitLastAttackAt ?? 0);
                  if (isBoxer) { if (t < 60) source = frames[1]; else if (t < 120) source = frames[2]; else if (t < 180) source = frames[3]; else if (t < 240) source = frames[2]; else if (t < 300) source = frames[1]; else source = frames[0]; }
                  else { if (t < 120) source = frames[1]; else if (t < 240) source = frames[2]; else if (t < 360) source = frames[3]; else if (t < 480) source = frames[2]; else if (t < 600) source = frames[1]; else source = frames[0]; }
                  if (s.unitFacingScaleX === -1) transform = [{ scaleX: -1 }];
                } else if (s.unit === 'quarterback') {
                  source = QUARTERBACK_IMAGE;
                  if (s.unitFacingScaleX === -1) transform = [{ scaleX: -1 }];
                } else if (s.unit === 'house' || s.unit === 'capybara_statue') { if (s.unitRotation === 1 || s.unitRotation === 3) transform = [{ scaleX: -1 }]; }
                else if (isWall) { const cell = getCell(board, s.row, s.col, gridCols); if (cell.wallRotation === 1 || cell.wallRotation === 3) transform = [{ scaleX: -1 }]; }
                const dynamicStyle: any = { left: s.left, top: s.top, width: s.width, height: s.height, zIndex: 100 + Math.round(s.sortOrder) };
                if (transform) dynamicStyle.transform = transform;
                let opacity = 1;
                const wallMaxHp = isWall ? getWallMaxHp(s.wallType ?? null) : 0;
                const wallHp = s.wallHp ?? wallMaxHp;
                if (dragItem) opacity = 0.45;
                else if (isWall && s.wallHp !== undefined && wallMaxHp > 0 && wallHp < wallMaxHp) opacity = 0.3 + (wallHp / wallMaxHp) * 0.7;
                dynamicStyle.opacity = opacity;
                const showUnitHp = isDamageableUnit(s.unit ?? null) && (s.unitMaxHp ?? 0) > 0;
                const hpRatio = showUnitHp ? clamp((s.unitHp ?? 0) / (s.unitMaxHp ?? 1), 0, 1) : 1;
                const showWallHp = isWall && s.wallHp !== undefined && wallMaxHp > 0 && s.wallHp < wallMaxHp;
                const wallHpRatio = showWallHp ? wallHp / wallMaxHp : 1;
                const sparkleReady = !!(s.cropReady || s.rewardReady);
                const cropPulse = sparkleReady ? 0.76 + Math.sin(Date.now() / 280) * 0.18 : 0;
                const sparkleGlowWidth = s.rewardReady ? Math.max(52, s.width + 24) : 52;
                const sparkleGlowHeight = s.rewardReady ? Math.max(34, Math.round(s.height * 0.55) + 12) : 34;
                const sparkleGlowLeft = s.rewardReady ? s.left + (s.width - sparkleGlowWidth) / 2 : s.left - 2;
                const sparkleGlowTop = s.rewardReady ? s.top + s.height - sparkleGlowHeight - 8 : s.top - 3;
                const sparkleGlyphLeft = s.rewardReady ? sparkleGlowLeft + sparkleGlowWidth - 16 : s.left + 34;
                const sparkleGlyphTop = s.rewardReady ? sparkleGlowTop - 10 : s.top - 12;
                return (
                  <React.Fragment key={s.id}>
                    {showUnitHp && <View pointerEvents="none" style={[sceneStyles.unitHpTrack, { left: s.left + s.width / 2 - 17, top: s.top - 9, zIndex: Math.round(100 + s.sortOrder) + 1, opacity: dragItem ? 0.5 : 1 }]}><View style={[sceneStyles.unitHpFill, { width: `${hpRatio * 100}%` }]} /></View>}
                    {showWallHp && <View pointerEvents="none" style={[sceneStyles.unitHpTrack, { left: s.left + 10, top: s.top - 2, zIndex: Math.round(100 + s.sortOrder) + 1, opacity: dragItem ? 0.5 : 1 }]}><View style={[sceneStyles.unitHpFill, { width: `${wallHpRatio * 100}%`, backgroundColor: '#94a3b8' }]} /></View>}
                    {sparkleReady && (
                      <>
                        <View
                          pointerEvents="none"
                          style={[
                            sceneStyles.wheatGlow,
                            {
                              left: sparkleGlowLeft,
                              top: sparkleGlowTop,
                              width: sparkleGlowWidth,
                              height: sparkleGlowHeight,
                              borderRadius: sparkleGlowHeight / 2,
                              zIndex: Math.round(100 + s.sortOrder),
                              opacity: dragItem ? 0.24 : cropPulse,
                            },
                          ]}
                        />
                        <Text
                          pointerEvents="none"
                          style={[
                            sceneStyles.wheatSparkle,
                            {
                              left: sparkleGlyphLeft,
                              top: sparkleGlyphTop,
                              zIndex: Math.round(100 + s.sortOrder) + 1,
                              opacity: dragItem ? 0.22 : 0.72 + Math.sin(Date.now() / 210) * 0.22,
                            },
                          ]}
                        >
                          ✦
                        </Text>
                      </>
                    )}
                    <Image source={source} resizeMode="contain" style={[sceneStyles.placedSprite, dynamicStyle]} />
                  </React.Fragment>
                );
              })}

              {status !== 'wave' && !dragItem && (
                <View
                  pointerEvents="none"
                  style={[
                    sceneStyles.expansionGhostTile,
                    {
                      left: expansionTileBounds.left - 11,
                      top: expansionTileBounds.top - 23,
                      width: expansionTileBounds.width - 3,
                      height: expansionTileBounds.height + 60,
                      zIndex: 520,
                    },
                  ]}
                >
                  <View style={sceneStyles.expansionGhostPlusWrap}>
                    <Ionicons name="add" size={22} color="#67e8f9" />
                  </View>
                </View>
              )}

              {ghostPreview && <Image source={ghostPreview.source} resizeMode="contain" style={{ position: 'absolute', left: ghostPreview.left, top: ghostPreview.top, width: ghostPreview.w, height: ghostPreview.h, opacity: 0.55, zIndex: 500 }} />}

              {quarterbackAimPreviewNode}

              {/* heal sparkles */}
              {activeSparkles.map((s) => (
                <HealSparkleEffect key={s.id} sparkle={s} isoPositionFn={isoPosition} onComplete={removeSparkle} />
              ))}

              {footballExplosions.map((effect) => (
                <FootballExplosionEffectView
                  key={effect.id}
                  effect={effect}
                  isoPositionFn={isoPosition}
                  onComplete={removeFootballExplosion}
                />
              ))}

              {crazyCapyTapPulses.map((pulse) => (
                <CrazyCapyTapPulseEffect
                  key={pulse.id}
                  pulse={pulse}
                  isoPositionFn={isoPosition}
                  onComplete={removeCrazyCapyTapPulse}
                />
              ))}

              <View pointerEvents="none" style={[sceneStyles.castleWrap, { left: castleSprite.left, top: castleSprite.top, width: castleSprite.width, zIndex: castleZIndex, opacity: dragItem ? 0.5 : 1 }]}>
                <Image source={HOME_BASE_IMAGE} resizeMode="contain" style={{ width: castleSprite.width, height: castleSprite.height }} />
                <View
                  style={[
                    sceneStyles.castleAvatarPlatform,
                    {
                      left: castleAvatar.left - 2,
                      top: castleAvatar.top + castleAvatar.height - 7,
                      width: castleAvatar.width + 4,
                      opacity: villageAvatarWalk ? 0 : 1,
                    },
                  ]}
                />
                <Image
                  source={castleAvatarSource}
                  resizeMode="contain"
                  style={[
                    sceneStyles.castleAvatarImage,
                    {
                      left: castleAvatar.left - 30,
                      top: castleAvatar.top,
                      width: castleAvatar.width,
                      height: castleAvatar.height,
                      opacity: villageAvatarWalk ? 0 : 1,
                    },
                  ]}
                />
              </View>
              <View
                pointerEvents="none"
                style={[
                  sceneStyles.castleBanner,
                  {
                    left: homeBaseBannerPosition.left,
                    top: homeBaseBannerPosition.top,
                    zIndex: homeBaseOverlayZIndex,
                    opacity: dragItem ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={sceneStyles.castleBannerText}>{HOME_BASE_LABEL}</Text>
              </View>
              <View
                pointerEvents="none"
                style={[
                  sceneStyles.castleHpTrackMap,
                  {
                    left: homeBaseHpTrackPosition.left,
                    top: homeBaseHpTrackPosition.top,
                    zIndex: homeBaseOverlayZIndex,
                    opacity: dragItem ? 0.5 : 1,
                  },
                ]}
              >
                <View style={[sceneStyles.castleHpFillMap, { width: `${shipHpRatio * 100}%` }]} />
              </View>

              {projectiles.map((p) => {
                const pos = isoPosition(p.row, p.col, getProjectileElevation(p));
                if (p.kind === 'football') {
                  return (
                    <SwarmVillageFootballProjectile
                      key={p.id}
                      dimmed={!!dragItem}
                      left={pos.left + 15}
                      nowMs={projectileRenderNowMs}
                      projectile={p}
                      top={pos.top - 4}
                    />
                  );
                }
                return <View key={p.id} pointerEvents="none" style={[sceneStyles.projectile, { left: pos.left + 30, top: pos.top + 4, zIndex: 420, opacity: dragItem ? 0.5 : 1 }]} />;
              })}

              {villageAvatarWalk && (() => {
                const pos = isoPosition(villageAvatarWalk.row, villageAvatarWalk.col, 0.42);
                const bob = Math.sin(Date.now() / 180) * 1.5;
                return (
                  <View
                    pointerEvents="none"
                    style={[
                      sceneStyles.villageAvatarWrap,
                      {
                        left: pos.left + TILE_WIDTH / 2 - villageAvatarSprite.width / 2 + VILLAGE_AVATAR_OFFSET_X,
                        top: pos.top - villageAvatarSprite.height + VILLAGE_AVATAR_OFFSET_Y + bob,
                        zIndex: 430 + Math.floor((villageAvatarWalk.row + villageAvatarWalk.col) * 10),
                        opacity: dragItem ? 0.5 : 1,
                        transform: [{ scaleX: villageAvatarWalk.facingScaleX }],
                      },
                    ]}
                  >
                    <View style={sceneStyles.villageAvatarShadow} />
                    <Image
                      source={castleAvatarSource}
                      resizeMode="contain"
                      style={[
                        sceneStyles.villageAvatarImage,
                        {
                          width: villageAvatarSprite.width,
                          height: villageAvatarSprite.height,
                        },
                      ]}
                    />
                  </View>
                );
              })()}

              <SwarmVillageCrazyCapySprite
                crazyCapy={crazyCapy}
                dimmed={!!dragItem}
                isoPosition={isoPosition}
                nowMs={projectileRenderNowMs}
              />

              <SwarmVillageCrazyCapyKnockoutEffects
                dimmed={!!dragItem}
                effects={crazyCapyKnockoutEffects}
                isoPosition={isoPosition}
                nowMs={projectileRenderNowMs}
                spriteLeftOffset={ENEMY_SPRITE_LEFT_OFFSET}
                spriteTopOffset={ENEMY_SPRITE_TOP_OFFSET}
              />

              {enemies.map((e) => {
                const pos = isoPosition(e.row, e.col, 0.4);
                const hpR = clamp(e.hp / e.maxHp, 0, 1);
                const spriteSize = getEnemySpriteSize(e.variant);
                const spriteScale = spriteSize / ENEMY_SPRITE_SIZE;
                const spriteLeft = pos.left + ENEMY_SPRITE_LEFT_OFFSET - (spriteSize - ENEMY_SPRITE_SIZE) / 2;
                const spriteTop = pos.top + ENEMY_SPRITE_TOP_OFFSET - (spriteSize - ENEMY_SPRITE_SIZE);
                return (
                  <View
                    key={e.id}
                    pointerEvents="none"
                    style={[
                      sceneStyles.enemyWrap,
                      {
                        left: spriteLeft,
                        top: spriteTop,
                        width: spriteSize,
                        zIndex: 360 + Math.floor((e.row + e.col) * 10),
                        opacity: dragItem ? 0.5 : 1,
                      },
                    ]}
                  >
                    <View style={[sceneStyles.enemyHpTrack, { width: 34 * spriteScale }]}>
                      <View style={[sceneStyles.enemyHpFill, { width: `${hpR * 100}%` }]} />
                    </View>
                    <Image
                      source={e.variant === 'snow' ? IJOM_SNOW_IMAGE : IJOM_IMAGE}
                      resizeMode="contain"
                      style={[sceneStyles.enemyImage, { width: spriteSize, height: spriteSize }]}
                    />
                  </View>
                );
              })}

              {/* Tooltip */}
              {cellTooltip}
            </Animated.View>
          </Animated.View>
        </View>
      )}

      {quarterbackAim && (
        <View pointerEvents="box-none" style={sceneStyles.quarterbackAimOverlay}>
          <View style={[sceneStyles.quarterbackAimPanel, { top: insets.top + 86 }]}>
            <Text style={sceneStyles.quarterbackAimTitle}>Quarterback</Text>
            <Text style={sceneStyles.quarterbackAimText}>
              {quarterbackAimPreview ? 'Release to throw' : 'Pull back on Throw Pad'}
            </Text>
            <View style={sceneStyles.quarterbackAimPowerTrack}>
              <View
                style={[
                  sceneStyles.quarterbackAimPowerFill,
                  { width: `${Math.round((quarterbackAimPreview?.powerRatio ?? 0) * 100)}%` },
                ]}
              />
            </View>
            <Pressable
              accessibilityLabel="Cancel football throw"
              accessibilityRole="button"
              onPress={cancelQuarterbackAim}
              style={sceneStyles.quarterbackAimCancel}
            >
              <Text style={sceneStyles.quarterbackAimCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {quarterbackThrowControlCell && hasQuarterbackThrowTarget && (
        <View
          pointerEvents="box-none"
          style={[
            sceneStyles.quarterbackThrowPadWrap,
            { bottom: quarterbackThrowPadBottom },
          ]}
        >
          <View
            collapsable={false}
            pointerEvents="auto"
            style={sceneStyles.quarterbackThrowPad}
            {...quarterbackThrowPadResponder.panHandlers}
          >
            <Image
              source={JOYSTICK_BASE_IMAGE}
              resizeMode="contain"
              style={sceneStyles.quarterbackThrowPadBaseImage}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                sceneStyles.quarterbackThrowPadNub,
                { transform: quarterbackThrowPadNubOffset.getTranslateTransform() },
              ]}
            >
              <Image
                source={JOYSTICK_NUB_IMAGE}
                resizeMode="contain"
                style={sceneStyles.quarterbackThrowPadNubImage}
              />
              <View style={sceneStyles.quarterbackThrowPadNubContent}>
                <Ionicons name="american-football" size={22} color="#fef3c7" />
                <Text style={sceneStyles.quarterbackThrowPadText}>
                  {quarterbackAim ? (quarterbackAimPreview ? 'Release' : 'Pull') : 'Throw'}
                </Text>
              </View>
            </Animated.View>
          </View>
        </View>
      )}

      <SwarmVillageBottomTray
        availableEnergy={availableEnergy}
        draftBaselineReady={draftBaselineReady}
        dragActive={!!dragItem}
        erasePanHandlers={eraseResponder.panHandlers}
        energyBalanceTourRef={energyBalanceTourRef}
        hasUnsavedChanges={hasUnsavedChanges}
        healEnergyCost={ENERGY_COSTS.heal}
        healPanHandlers={healResponder.panHandlers}
        insetsBottom={insets.bottom}
        isSavingDraft={isSavingDraft}
        isTrayCollapsed={isTrayCollapsed || !!quarterbackAim}
        onNextPage={() => setToolPage((p) => Math.min(totalToolPages - 1, p + 1))}
        onOpenEnergyInfo={() => setShowEnergyInfoModal(true)}
        onOpenVending={() => {
          void loadStarBalance();
          void loadVendingInventory();
          setShowVendingMachine(true);
        }}
        onPrevPage={() => setToolPage((p) => Math.max(0, p - 1))}
        onSave={() => { void handleSaveVillage(); }}
        onToggleCollapsed={() => setIsTrayCollapsed((v) => !v)}
        prizeMachineTourRef={prizeMachineTourRef}
        toolPage={toolPage}
        toolPanHandlersById={toolPanHandlersById}
        toolTrayTourRef={toolTrayTourRef}
        totalToolPages={totalToolPages}
        vendingInventory={vendingInventory}
        visibleTools={visibleTools}
      />

      <SwarmVillageToolInspectCard
        insetsBottom={insets.bottom}
        onDismiss={hideToolInspectCard}
        toolInspectCard={toolInspectCard}
        toolInspectFrameIndex={toolInspectFrameIndex}
      />

      {/* Toast */}
      {toastMessage && <View style={[overlayStyles.toast, { top: 200 }]}><Text style={overlayStyles.toastText}>{toastMessage}</Text></View>}

      {/* Drag ghost */}
      <SwarmVillageDragGhost
        dragItem={dragItem}
        dragPos={dragPos}
        sources={dragGhostSources}
      />

      <SwarmVillagePresetNeighborhoodSetup
        enabled={
          draftBaselineReady &&
          hydrationReady
        }
        forceVisibleToken={devForceNeighborhoodSetupToken}
        onApply={applyNeighborhoodSeed}
        onSelectionApplied={() => {
          setNeighborhoodSelectionVersion((value) => value + 1);
          setIsNeighborhoodSetupVisible(false);
        }}
        onVisibilityChange={setIsNeighborhoodSetupVisible}
        userId={user?.uid}
      />

      <VendingMachineModal
        visible={showVendingMachine}
        starBalance={starBalance}
        inventory={vendingInventory}
        level={playerLevel}
        streak={swarmStreakCount}
        onClose={() => setShowVendingMachine(false)}
        onPullCommitted={handleVendingPull}
        requestPull={vendingApiBaseUrl ? requestVendingPullFromServer : undefined}
        machines={vendingApiBaseUrl ? vendingMachinesConfig : []}
      />

      <StarRewardFlyover
        payload={starRewardFlyover}
        targetRef={starBalanceTargetRef}
        onFinished={handleStarRewardFlyoverFinished}
      />

      <SwarmVillageModals
        availableEnergy={availableEnergy}
        expansionEnergyCost={expansionEnergyCost}
        mapExpansionEnergyCost={MAP_EXPANSION_ENERGY_COST}
        maxExpandableColumns={maxExpandableColumns}
        metricsReady={metricsReady}
        seasonalEnergy={seasonalEnergy}
        spentEnergy={spentEnergy}
        crazyCapyChargeCaloriesRequired={CRAZY_CAPY_CHARGE_ACTIVE_CALORIES}
        crazyCapyChargeProgressCalories={crazyCapyChargeProgressCalories}
        crazyCapyDurationPerStatueSeconds={CRAZY_CAPY_DURATION_PER_STATUE_MS / 1000}
        crazyCapyChargeRatio={crazyCapyChargeRatio}
        crazyCapyRemainingCalories={crazyCapyRemainingCalories}
        crazyCapyReady={crazyCapyReady}
        onCloseCrazyCapyInfo={() => setShowCrazyCapyInfoModal(false)}
        onCloseDefeat={() => setShowDefeatModal(false)}
        onCloseEnergyInfo={() => setShowEnergyInfoModal(false)}
        onCloseExpansion={() => setShowExpansionModal(false)}
        onCloseVictory={handleCloseVictory}
        onConfirmExpansion={handleConfirmMapExpansion}
        onDecreaseExpansion={() => setPendingExpansionColumns((prev) => Math.max(1, prev - 1))}
        onIncreaseExpansion={() => setPendingExpansionColumns((prev) => Math.min(maxExpandableColumns, prev + 1))}
        onRetryDefeat={() => { setShowDefeatModal(false); resetWaveState(); }}
        pendingExpansionColumns={pendingExpansionColumns}
        shipHp={shipHp}
        showDefeatModal={showDefeatModal}
        showEnergyInfoModal={showEnergyInfoModal}
        showExpansionModal={showExpansionModal}
        showCrazyCapyInfoModal={showCrazyCapyInfoModal}
        showVictoryModal={showVictoryModal}
        waveDefeated={waveDefeated}
      />
    </View>
  );
}
