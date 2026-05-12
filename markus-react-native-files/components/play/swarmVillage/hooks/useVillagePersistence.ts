import { createDraftSnapshot, generateBoardID, inferGridColsFromBoard, normalizeBoardCell, sanitizeCastleFootprint } from '@/components/play/swarmVillage/domain/board';
import { createEmptyForestSpiritProgressSnapshot, createFirestoreEventId, normalizeForestSpiritProgressSnapshot, resolveForestSpiritDailyOpen } from '@/components/play/swarmVillage/domain/forestSpirit';
import { getEasternDayKey, getNewPlayerEnergyOffsetCacheKey, normalizeLoadedSwarmNextAvailableAtMs } from '@/components/play/swarmVillage/domain/schedule';
import { pickString } from '@/components/play/swarmVillage/domain/utils';
import {
  ENERGY_GRANT_EXPLAINER_CACHE_KEY, FOREST_SPIRIT_PROGRESS_CACHE_KEY, SPENT_ENERGY_CACHE_KEY, SWARM_PROGRESS_CACHE_KEY, VILLAGE_BOARD_CACHE_KEY, VILLAGE_BOARD_ID_CACHE_KEY,
} from '@/components/play/swarmVillage/model/cacheKeys';
import {
  FOREST_SPIRIT_DAILY_OPEN_FIRESTORE_SUBCOLLECTION, FOREST_SPIRIT_POWERUP_USE_FIRESTORE_SUBCOLLECTION, GRID_ROWS, NEW_PLAYER_SEASONAL_ENERGY_CAP,
} from '@/components/play/swarmVillage/model/constants';
import { FOREST_SPIRIT_HEAL_FRACTION, FOREST_SPIRIT_REQUIRED_STREAK_DAYS } from '@/components/play/swarmVillage/model/costs';
import type {
  BattleStatus, BoardCell, CompletedSwarmOutcome, ForestSpiritFirebaseSyncOptions, ForestSpiritProgressSnapshot, SwarmProgressSnapshot, VillageDraftSnapshot, VillagePreviewUpload,
} from '@/components/play/swarmVillage/model/types';
import { formatCompactNumber } from '@/lib/game/formatters';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { doc, getFirestore, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

type VillageUser = {
  displayName?: string | null;
  email?: string | null;
  uid?: string | null;
};

type CompletedSwarmAutosaveState = 'idle' | 'saving';

type UseVillagePersistenceOptions = {
  board: BoardCell[];
  boardLoaded: boolean;
  boardIDRef: MutableRefObject<string | null>;
  boardRef: MutableRefObject<BoardCell[]>;
  captureAndUploadVillagePreview: (boardID: string) => Promise<VillagePreviewUpload>;
  completedSwarmAutosaveState: CompletedSwarmAutosaveState;
  currentEasternDayKey: string;
  currentEnergySeasonStart: Date;
  crazyCapyChargeStartCalories: number | null;
  crazyCapyChargeStartCaloriesRef: MutableRefObject<number | null>;
  displayedSwarmStreak: number;
  draftBaselineReady: boolean;
  firstVillageBuildPlacedAtMs: number | null;
  forestSpiritProgressLoaded: boolean;
  forestSpiritProgressRef: MutableRefObject<ForestSpiritProgressSnapshot>;
  gridCols: number;
  gridColsRef: MutableRefObject<number>;
  hasUnsavedChanges: boolean;
  hydrationReady: boolean;
  isMountedRef: MutableRefObject<boolean>;
  isNewPlayerForEnergySeason: boolean;
  lastCompletedSwarmAutosaveOutcomeRef: MutableRefObject<CompletedSwarmOutcome | null>;
  lastSwarmCompletedDayKey: string | null;
  metricsReady: boolean;
  newPlayerEnergyOffsetInitialized: boolean;
  newPlayerEnergyOffsetLoaded: boolean;
  rawSeasonalEnergy: number;
  savedDraftRef: MutableRefObject<VillageDraftSnapshot>;
  seasonalEnergy: number;
  setBoard: Dispatch<SetStateAction<BoardCell[]>>;
  setBoardLoaded: Dispatch<SetStateAction<boolean>>;
  setCompletedSwarmAutosaveState: Dispatch<SetStateAction<CompletedSwarmAutosaveState>>;
  setCrazyCapyChargeStartCalories: Dispatch<SetStateAction<number | null>>;
  setDraftBaselineReady: Dispatch<SetStateAction<boolean>>;
  setFirstVillageBuildPlacedAtMs: Dispatch<SetStateAction<number | null>>;
  setForestSpiritCharges: Dispatch<SetStateAction<number>>;
  setForestSpiritOpenStreakCount: Dispatch<SetStateAction<number>>;
  setForestSpiritProgressLoaded: Dispatch<SetStateAction<boolean>>;
  setGridCols: Dispatch<SetStateAction<number>>;
  setIsSavingDraft: Dispatch<SetStateAction<boolean>>;
  setLastSwarmCompletedDayKey: Dispatch<SetStateAction<string | null>>;
  setNewPlayerEnergyOffset: Dispatch<SetStateAction<number>>;
  setNewPlayerEnergyOffsetInitialized: Dispatch<SetStateAction<boolean>>;
  setNewPlayerEnergyOffsetLoaded: Dispatch<SetStateAction<boolean>>;
  setSavedBoardSerialized: Dispatch<SetStateAction<string | null>>;
  setSavedSpentEnergy: Dispatch<SetStateAction<number>>;
  setSpentEnergy: Dispatch<SetStateAction<number>>;
  setSpentEnergyLoaded: Dispatch<SetStateAction<boolean>>;
  setSwarmCompletionCount: Dispatch<SetStateAction<number>>;
  setSwarmNextAvailableAtMs: Dispatch<SetStateAction<number>>;
  setSwarmProgressLoaded: Dispatch<SetStateAction<boolean>>;
  setSwarmStreakCount: Dispatch<SetStateAction<number>>;
  shipHpRef: MutableRefObject<number>;
  showToast: (message: string, durationMs?: number) => void;
  spentEnergy: number;
  spentEnergyLoaded: boolean;
  spentEnergyRef: MutableRefObject<number>;
  status: BattleStatus;
  statusRef: MutableRefObject<BattleStatus>;
  swarmCompletionCount: number;
  swarmNextAvailableAtMs: number;
  swarmProgressLoaded: boolean;
  swarmStreakCount: number;
  user: VillageUser | null | undefined;
  userProfile: unknown;
  waveDefeatedRef: MutableRefObject<number>;
  waveSize: number;
  waveSpawnedRef: MutableRefObject<number>;
};

const db = getFirestore(getApp());

export function useVillagePersistence({
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
  lastCompletedSwarmAutosaveOutcomeRef,
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
}: UseVillagePersistenceOptions) {
  const applyForestSpiritProgressSnapshot = useCallback((snapshot: ForestSpiritProgressSnapshot) => {
    const normalized = normalizeForestSpiritProgressSnapshot(snapshot);
    forestSpiritProgressRef.current = normalized;
    setForestSpiritOpenStreakCount(normalized.streakCount);
    setForestSpiritCharges(normalized.charges);
  }, [forestSpiritProgressRef, setForestSpiritCharges, setForestSpiritOpenStreakCount]);

  const syncForestSpiritProgressToFirebase = useCallback(async (
    snapshot: ForestSpiritProgressSnapshot,
    options?: ForestSpiritFirebaseSyncOptions,
  ) => {
    const uid = user?.uid;
    if (!uid) return;

    const normalized = normalizeForestSpiritProgressSnapshot(snapshot);
    const profileRecord = userProfile as Record<string, unknown> | null | undefined;
    const displayName = pickString(profileRecord?.displayName) ?? pickString(user.displayName);
    const email = user.email ?? null;
    const forestSpiritSummary = {
      lastOpenedDayKey: normalized.lastOpenedDayKey,
      currentOpenStreak: normalized.streakCount,
      charges: normalized.charges,
      requiredStreakDays: FOREST_SPIRIT_REQUIRED_STREAK_DAYS,
      healFraction: FOREST_SPIRIT_HEAL_FRACTION,
      syncedAt: serverTimestamp(),
    };

    try {
      const writes: Array<Promise<unknown>> = [
        setDoc(
          doc(db, 'PlayerStats', uid),
          {
            forestSpirit: forestSpiritSummary,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),
      ];

      if (options?.type === 'daily_open' && normalized.lastOpenedDayKey) {
        writes.push(
          setDoc(
            doc(
              db,
              'PlayerStats',
              uid,
              FOREST_SPIRIT_DAILY_OPEN_FIRESTORE_SUBCOLLECTION,
              normalized.lastOpenedDayKey,
            ),
            {
              uid,
              displayName,
              email,
              dayKey: normalized.lastOpenedDayKey,
              eventType: 'swarm_village_daily_open',
              previousLastOpenedDayKey: options.previousSnapshot.lastOpenedDayKey,
              previousOpenStreak: options.previousSnapshot.streakCount,
              previousCharges: options.previousSnapshot.charges,
              currentOpenStreak: normalized.streakCount,
              currentCharges: normalized.charges,
              earnedForestSpiritCharges: options.earnedCharges,
              requiredStreakDays: FOREST_SPIRIT_REQUIRED_STREAK_DAYS,
              recordedAt: serverTimestamp(),
            },
            { merge: true },
          ),
        );
      }

      if (options?.type === 'powerup_use') {
        writes.push(
          setDoc(
            doc(
              db,
              'PlayerStats',
              uid,
              FOREST_SPIRIT_POWERUP_USE_FIRESTORE_SUBCOLLECTION,
              createFirestoreEventId('forest_spirit_use'),
            ),
            {
              uid,
              displayName,
              email,
              eventType: 'swarm_village_powerup_use',
              powerupId: 'forest_spirit',
              healFraction: FOREST_SPIRIT_HEAL_FRACTION,
              healedItemCount: options.healedItemCount,
              totalHpRestored: options.totalHpRestored,
              remainingCharges: options.remainingCharges,
              currentOpenStreak: normalized.streakCount,
              dayKey: getEasternDayKey(),
              recordedAt: serverTimestamp(),
            },
            { merge: true },
          ),
        );
      }

      await Promise.all(writes);
    } catch (error) {
      if (__DEV__) console.warn('[SwarmVillage] Failed to sync Forest Spirit telemetry:', error);
    }
  }, [user?.displayName, user?.email, user?.uid, userProfile]);

  useEffect(() => {
    let cancelled = false;
    const loadForestSpiritProgress = async () => {
      let storedSnapshot = createEmptyForestSpiritProgressSnapshot();
      try {
        const raw = await AsyncStorage.getItem(FOREST_SPIRIT_PROGRESS_CACHE_KEY);
        if (raw) {
          storedSnapshot = normalizeForestSpiritProgressSnapshot(JSON.parse(raw) as Partial<ForestSpiritProgressSnapshot>);
        }
      } catch (error) {
        if (__DEV__) console.warn('[SwarmVillage] Failed to load Forest Spirit progress:', error);
      }

      const resolved = resolveForestSpiritDailyOpen(storedSnapshot);
      if (cancelled) return;

      applyForestSpiritProgressSnapshot(resolved.snapshot);
      setForestSpiritProgressLoaded(true);
      void syncForestSpiritProgressToFirebase(resolved.snapshot, resolved.changed
        ? {
          type: 'daily_open',
          previousSnapshot: storedSnapshot,
          earnedCharges: resolved.earnedCharges,
        }
        : undefined);

      if (resolved.changed) {
        AsyncStorage.setItem(FOREST_SPIRIT_PROGRESS_CACHE_KEY, JSON.stringify(resolved.snapshot)).catch((error) => {
          if (__DEV__) console.warn('[SwarmVillage] Failed to persist Forest Spirit progress:', error);
        });
      }
      if (resolved.earnedCharges > 0) {
        showToast('Forest Spirit ready', 2400);
      }
    };

    void loadForestSpiritProgress();
    return () => {
      cancelled = true;
    };
  }, [applyForestSpiritProgressSnapshot, setForestSpiritProgressLoaded, showToast, syncForestSpiritProgressToFirebase]);

  const markForestSpiritOpenedToday = useCallback(() => {
    if (!forestSpiritProgressLoaded) return;
    const previousSnapshot = forestSpiritProgressRef.current;
    const resolved = resolveForestSpiritDailyOpen(forestSpiritProgressRef.current);
    if (!resolved.changed) return;

    applyForestSpiritProgressSnapshot(resolved.snapshot);
    void syncForestSpiritProgressToFirebase(resolved.snapshot, {
      type: 'daily_open',
      previousSnapshot,
      earnedCharges: resolved.earnedCharges,
    });
    AsyncStorage.setItem(FOREST_SPIRIT_PROGRESS_CACHE_KEY, JSON.stringify(resolved.snapshot)).catch((error) => {
      if (__DEV__) console.warn('[SwarmVillage] Failed to persist Forest Spirit progress:', error);
    });
    if (resolved.earnedCharges > 0) {
      showToast('Forest Spirit ready', 2400);
    }
  }, [applyForestSpiritProgressSnapshot, forestSpiritProgressLoaded, forestSpiritProgressRef, showToast, syncForestSpiritProgressToFirebase]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SPENT_ENERGY_CACHE_KEY)
      .then((value) => {
        if (cancelled) return;
        if (value != null) {
          const parsed = Number(value);
          if (Number.isFinite(parsed) && parsed >= 0) setSpentEnergy(parsed);
        }
      })
      .catch(() => { })
      .finally(() => { if (!cancelled) setSpentEnergyLoaded(true); });
    return () => { cancelled = true; };
  }, [setSpentEnergy, setSpentEnergyLoaded]);

  useEffect(() => {
    if (!user?.uid) {
      setNewPlayerEnergyOffset(0);
      setNewPlayerEnergyOffsetLoaded(false);
      setNewPlayerEnergyOffsetInitialized(false);
      return;
    }

    let cancelled = false;
    const cacheKey = getNewPlayerEnergyOffsetCacheKey(user.uid, currentEnergySeasonStart);

    setNewPlayerEnergyOffsetLoaded(false);
    setNewPlayerEnergyOffsetInitialized(false);
    AsyncStorage.getItem(cacheKey)
      .then((value) => {
        if (cancelled) return;
        if (value == null) {
          setNewPlayerEnergyOffset(0);
          setNewPlayerEnergyOffsetInitialized(false);
          return;
        }

        const parsed = Number(value);
        setNewPlayerEnergyOffset(Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0);
        setNewPlayerEnergyOffsetInitialized(true);
      })
      .catch(() => {
        if (!cancelled) {
          setNewPlayerEnergyOffset(0);
          setNewPlayerEnergyOffsetInitialized(false);
        }
      })
      .finally(() => {
        if (!cancelled) setNewPlayerEnergyOffsetLoaded(true);
      });

    return () => { cancelled = true; };
  }, [
    currentEnergySeasonStart,
    setNewPlayerEnergyOffset,
    setNewPlayerEnergyOffsetInitialized,
    setNewPlayerEnergyOffsetLoaded,
    user?.uid,
  ]);

  useEffect(() => {
    if (
      !user?.uid ||
      !metricsReady ||
      !newPlayerEnergyOffsetLoaded ||
      newPlayerEnergyOffsetInitialized
    ) {
      return;
    }

    if (!isNewPlayerForEnergySeason) {
      setNewPlayerEnergyOffset(0);
      setNewPlayerEnergyOffsetInitialized(true);
      return;
    }

    let cancelled = false;
    const cacheKey = getNewPlayerEnergyOffsetCacheKey(user.uid, currentEnergySeasonStart);
    const offset = Math.max(0, rawSeasonalEnergy - NEW_PLAYER_SEASONAL_ENERGY_CAP);

    setNewPlayerEnergyOffset(offset);
    setNewPlayerEnergyOffsetInitialized(true);
    AsyncStorage.setItem(cacheKey, String(offset)).catch(() => {
      if (__DEV__ && !cancelled) {
        console.warn('[SwarmVillage] Failed to persist new player energy offset');
      }
    });

    return () => { cancelled = true; };
  }, [
    currentEnergySeasonStart,
    isNewPlayerForEnergySeason,
    metricsReady,
    newPlayerEnergyOffsetInitialized,
    newPlayerEnergyOffsetLoaded,
    rawSeasonalEnergy,
    setNewPlayerEnergyOffset,
    setNewPlayerEnergyOffsetInitialized,
    user?.uid,
  ]);

  useEffect(() => {
    if (!spentEnergyLoaded || !metricsReady || seasonalEnergy <= 0) return;
    let cancelled = false;
    const showEnergyGrantExplainer = async () => {
      try {
        const seen = await AsyncStorage.getItem(ENERGY_GRANT_EXPLAINER_CACHE_KEY);
        if (cancelled || seen) return;
        showToast(`Your seasonal activity was converted into ${formatCompactNumber(seasonalEnergy)} energy`);
        await AsyncStorage.setItem(ENERGY_GRANT_EXPLAINER_CACHE_KEY, '1');
      } catch {
        if (!cancelled) {
          showToast(`Your seasonal activity was converted into ${formatCompactNumber(seasonalEnergy)} energy`);
        }
      }
    };
    void showEnergyGrantExplainer();
    return () => { cancelled = true; };
  }, [metricsReady, seasonalEnergy, showToast, spentEnergyLoaded]);

  useEffect(() => {
    let cancelled = false;
    const loadBoard = async () => {
      try {
        const [stored, storedID] = await AsyncStorage.multiGet([
          VILLAGE_BOARD_CACHE_KEY,
          VILLAGE_BOARD_ID_CACHE_KEY,
        ]);
        if (cancelled) return;

        if (storedID?.[1]) {
          boardIDRef.current = storedID[1];
        }

        if (stored?.[1]) {
          const parsed = JSON.parse(stored[1]);
          if (Array.isArray(parsed)) {
            const inferredGridCols = inferGridColsFromBoard(parsed);
            if (parsed.length === GRID_ROWS * inferredGridCols) {
              gridColsRef.current = inferredGridCols;
              setGridCols(inferredGridCols);
              setBoard(sanitizeCastleFootprint((parsed as Record<string, unknown>[]).map(normalizeBoardCell), inferredGridCols));
            }
          }
        }
      } catch (error) {
        if (__DEV__) console.warn('[SwarmVillage] Failed to load board:', error);
      } finally {
        if (!cancelled) {
          setBoardLoaded(true);
        }
      }
    };
    void loadBoard();
    return () => { cancelled = true; };
  }, [boardIDRef, gridColsRef, setBoard, setBoardLoaded, setGridCols]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SWARM_PROGRESS_CACHE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as Partial<SwarmProgressSnapshot>;
        if (typeof parsed.nextAvailableAtMs === 'number' && Number.isFinite(parsed.nextAvailableAtMs)) {
          setSwarmNextAvailableAtMs(Math.max(0, normalizeLoadedSwarmNextAvailableAtMs(parsed.nextAvailableAtMs)));
        }
        if (typeof parsed.streakCount === 'number' && Number.isFinite(parsed.streakCount)) {
          setSwarmStreakCount(Math.max(0, Math.floor(parsed.streakCount)));
        }
        if (typeof parsed.completionCount === 'number' && Number.isFinite(parsed.completionCount)) {
          setSwarmCompletionCount(Math.max(0, Math.floor(parsed.completionCount)));
        }
        if (typeof parsed.firstVillageBuildPlacedAtMs === 'number' && Number.isFinite(parsed.firstVillageBuildPlacedAtMs)) {
          setFirstVillageBuildPlacedAtMs(Math.max(0, Math.floor(parsed.firstVillageBuildPlacedAtMs)));
        }
        if (typeof parsed.lastCompletedDayKey === 'string' && parsed.lastCompletedDayKey.trim().length > 0) {
          setLastSwarmCompletedDayKey(parsed.lastCompletedDayKey);
        }
        if (typeof parsed.crazyCapyChargeStartCalories === 'number' && Number.isFinite(parsed.crazyCapyChargeStartCalories)) {
          const normalizedCalories = Math.max(0, Math.floor(parsed.crazyCapyChargeStartCalories));
          crazyCapyChargeStartCaloriesRef.current = normalizedCalories;
          setCrazyCapyChargeStartCalories(normalizedCalories);
        }
      })
      .catch((error) => {
        if (__DEV__) console.warn('[SwarmVillage] Failed to load swarm progress:', error);
      })
      .finally(() => {
        if (!cancelled) setSwarmProgressLoaded(true);
      });
    return () => { cancelled = true; };
  }, [
    crazyCapyChargeStartCaloriesRef,
    setCrazyCapyChargeStartCalories,
    setFirstVillageBuildPlacedAtMs,
    setLastSwarmCompletedDayKey,
    setSwarmCompletionCount,
    setSwarmNextAvailableAtMs,
    setSwarmProgressLoaded,
    setSwarmStreakCount,
  ]);

  useEffect(() => {
    if (!swarmProgressLoaded) return;
    const snapshot: SwarmProgressSnapshot = {
      nextAvailableAtMs: swarmNextAvailableAtMs,
      streakCount: swarmStreakCount,
      completionCount: swarmCompletionCount,
      firstVillageBuildPlacedAtMs,
      lastCompletedDayKey: lastSwarmCompletedDayKey,
      crazyCapyChargeStartCalories,
    };
    AsyncStorage.setItem(SWARM_PROGRESS_CACHE_KEY, JSON.stringify(snapshot)).catch((error) => {
      if (__DEV__) console.warn('[SwarmVillage] Failed to persist swarm progress:', error);
    });
  }, [crazyCapyChargeStartCalories, firstVillageBuildPlacedAtMs, lastSwarmCompletedDayKey, swarmCompletionCount, swarmNextAvailableAtMs, swarmProgressLoaded, swarmStreakCount]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !swarmProgressLoaded) return;

    setDoc(
      doc(db, 'PlayerStats', uid),
      {
        swarmVillage: {
          completionCount: swarmCompletionCount,
          currentStreak: displayedSwarmStreak,
          easternDayKey: currentEasternDayKey,
          firstVillageBuildPlacedAtMs,
          lastCompletedDayKey: lastSwarmCompletedDayKey,
          nextAvailableAtMs: Math.max(0, swarmNextAvailableAtMs),
          storedStreakCount: swarmStreakCount,
          syncedAt: serverTimestamp(),
        },
        swarmVillageCompletionCount: swarmCompletionCount,
        swarmVillageLastCompletedDayKey: lastSwarmCompletedDayKey,
        swarmVillageStreakCount: displayedSwarmStreak,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ).catch((error) => {
      if (__DEV__) console.warn('[SwarmVillage] Failed to sync swarm progress:', error);
    });
  }, [
    currentEasternDayKey,
    displayedSwarmStreak,
    firstVillageBuildPlacedAtMs,
    lastSwarmCompletedDayKey,
    swarmCompletionCount,
    swarmNextAvailableAtMs,
    swarmProgressLoaded,
    swarmStreakCount,
    user?.uid,
  ]);

  useEffect(() => {
    if (!hydrationReady || draftBaselineReady) return;
    const snapshot = createDraftSnapshot(board, gridCols, spentEnergy);
    savedDraftRef.current = snapshot;
    setSavedBoardSerialized(JSON.stringify(snapshot.board));
    setSavedSpentEnergy(snapshot.spentEnergy);
    setDraftBaselineReady(true);
  }, [
    board,
    draftBaselineReady,
    gridCols,
    hydrationReady,
    savedDraftRef,
    setDraftBaselineReady,
    setSavedBoardSerialized,
    setSavedSpentEnergy,
    spentEnergy,
  ]);

  useEffect(() => {
    if (!boardLoaded || !swarmProgressLoaded || firstVillageBuildPlacedAtMs !== null) return;
    const hasVillageBuild = board.some((cell) => cell.foundation || cell.wallHeight > 0 || cell.unit);
    if (!hasVillageBuild) return;
    setFirstVillageBuildPlacedAtMs(Date.now());
  }, [board, boardLoaded, firstVillageBuildPlacedAtMs, setFirstVillageBuildPlacedAtMs, swarmProgressLoaded]);

  const persistVillageSnapshot = useCallback(async (
    snapshot: VillageDraftSnapshot,
    options?: { silent?: boolean },
  ) => {
    const serializedBoard = JSON.stringify(snapshot.board);
    if (!options?.silent) setIsSavingDraft(true);
    try {
      const saveTasks: [string, string][] = [
        [VILLAGE_BOARD_CACHE_KEY, serializedBoard],
        [SPENT_ENERGY_CACHE_KEY, String(snapshot.spentEnergy)],
      ];
      const boardID = snapshot.boardID || boardIDRef.current;
      if (boardID) {
        saveTasks.push([VILLAGE_BOARD_ID_CACHE_KEY, boardID]);
        boardIDRef.current = boardID;
      }
      await AsyncStorage.multiSet(saveTasks);
      savedDraftRef.current = snapshot;
      setSavedBoardSerialized(serializedBoard);
      setSavedSpentEnergy(snapshot.spentEnergy);
      if (!options?.silent) showToast('Village saved');
      return true;
    } catch (error) {
      if (__DEV__) console.warn('[SwarmVillage] Failed to save village draft:', error);
      if (!options?.silent) showToast('Save failed');
      return false;
    } finally {
      if (!options?.silent) setIsSavingDraft(false);
    }
  }, [boardIDRef, savedDraftRef, setIsSavingDraft, setSavedBoardSerialized, setSavedSpentEnergy, showToast]);

  const publishSwarmVillageSnapshot = useCallback(async (
    snapshot: VillageDraftSnapshot,
    reason: 'manual_save' | 'pre_swarm_autosave' | 'completed_swarm_save',
    statusOverride?: BattleStatus,
    previewImage?: VillagePreviewUpload | null,
  ) => {
    const uid = user?.uid;
    if (!uid) return false;
    const outcome = statusOverride ?? statusRef.current;

    const profileRecord = userProfile as Record<string, unknown> | null | undefined;
    await setDoc(
      doc(db, 'SwarmVillageMaps', uid),
      {
        uid,
        displayName: pickString(profileRecord?.displayName) ?? pickString(user.displayName) ?? null,
        email: user.email ?? null,
        board: snapshot.board,
        boardID: snapshot.boardID ?? null,
        gridCols: snapshot.gridCols,
        spentEnergy: snapshot.spentEnergy,
        status: outcome,
        saveReason: reason,
        shipHp: shipHpRef.current,
        waveDefeated: waveDefeatedRef.current,
        waveSpawned: waveSpawnedRef.current,
        waveSize,
        swarmCompletionCount,
        savedByManualSave: reason === 'manual_save',
        savedAfterCompletedSwarm: reason === 'completed_swarm_save',
        savedBeforeSwarm: reason === 'pre_swarm_autosave',
        ...(previewImage
          ? {
            previewImageContentType: previewImage.contentType,
            previewImageHeight: previewImage.height,
            previewImageStoragePath: previewImage.storagePath,
            previewImageUpdatedAt: serverTimestamp(),
            previewImageUrl: previewImage.downloadUrl,
            previewImageWidth: previewImage.width,
          }
          : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return true;
  }, [shipHpRef, statusRef, swarmCompletionCount, user, userProfile, waveDefeatedRef, waveSize, waveSpawnedRef]);

  const saveDraftToCache = useCallback(async (options?: { silent?: boolean }) => {
    if (!hydrationReady) return false;
    if (!boardIDRef.current) boardIDRef.current = generateBoardID();
    const snapshot = createDraftSnapshot(
      boardRef.current,
      gridColsRef.current,
      spentEnergyRef.current,
      boardIDRef.current,
    );
    return persistVillageSnapshot(snapshot, options);
  }, [boardIDRef, boardRef, gridColsRef, hydrationReady, persistVillageSnapshot, spentEnergyRef]);

  useEffect(() => {
    const outcome = lastCompletedSwarmAutosaveOutcomeRef.current;
    if (!draftBaselineReady || !hydrationReady) return;
    if (completedSwarmAutosaveState !== 'saving') return;
    if ((status !== 'cleared' && status !== 'lost') || outcome !== status) return;

    if (!boardIDRef.current) boardIDRef.current = generateBoardID();
    const snapshot = createDraftSnapshot(
      boardRef.current,
      gridColsRef.current,
      spentEnergyRef.current,
      boardIDRef.current,
    );

    void (async () => {
      try {
        const didSave = await persistVillageSnapshot(snapshot, { silent: true });
        if (!didSave) {
          if (isMountedRef.current) showToast('Swarm result save failed');
          return;
        }

        try {
          await publishSwarmVillageSnapshot(snapshot, 'completed_swarm_save', outcome);
        } catch (error) {
          if (__DEV__) console.warn('[SwarmVillage] Failed to publish completed swarm village map:', error);
          if (isMountedRef.current) showToast('Swarm result saved locally; cloud sync failed', 2600);
        }
      } finally {
        lastCompletedSwarmAutosaveOutcomeRef.current = null;
        if (isMountedRef.current) {
          setCompletedSwarmAutosaveState('idle');
        }
      }
    })();
  }, [
    boardIDRef,
    boardRef,
    completedSwarmAutosaveState,
    draftBaselineReady,
    gridColsRef,
    hydrationReady,
    isMountedRef,
    lastCompletedSwarmAutosaveOutcomeRef,
    persistVillageSnapshot,
    publishSwarmVillageSnapshot,
    setCompletedSwarmAutosaveState,
    showToast,
    spentEnergyRef,
    status,
    statusRef,
  ]);

  const handleSaveVillage = useCallback(async () => {
    if (!draftBaselineReady || !hydrationReady) {
      showToast('Save state still loading');
      return;
    }
    setIsSavingDraft(true);
    try {
      const outcome = statusRef.current;
      const saveReason = outcome === 'cleared' || outcome === 'lost' ? 'completed_swarm_save' : 'manual_save';

      if (!boardIDRef.current) {
        boardIDRef.current = generateBoardID();
      }

      const snapshot = createDraftSnapshot(
        boardRef.current,
        gridColsRef.current,
        spentEnergyRef.current,
        boardIDRef.current,
      );
      if (hasUnsavedChanges) {
        const didSave = await persistVillageSnapshot(snapshot, { silent: true });
        if (!didSave) {
          showToast('Save failed');
          return;
        }
      }

      let previewImage: VillagePreviewUpload | null = null;
      let previewUploadFailed = false;
      if (user?.uid && boardIDRef.current) {
        try {
          previewImage = await captureAndUploadVillagePreview(boardIDRef.current);
        } catch (error) {
          previewUploadFailed = true;
          if (__DEV__) console.warn('[SwarmVillage] Failed to upload village preview image:', error);
        }
      }

      try {
        const didPublish = await publishSwarmVillageSnapshot(snapshot, saveReason, outcome, previewImage);
        showToast(
          didPublish
            ? previewUploadFailed
              ? 'Village saved to cloud; preview upload failed'
              : 'Village saved to cloud'
            : 'Village saved locally; sign in to sync',
          previewUploadFailed ? 3000 : undefined,
        );
      } catch (error) {
        if (__DEV__) console.warn('[SwarmVillage] Failed to publish village map:', error);
        showToast('Village saved locally; cloud sync failed', 2600);
      }
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    boardIDRef,
    boardRef,
    captureAndUploadVillagePreview,
    draftBaselineReady,
    gridColsRef,
    hasUnsavedChanges,
    hydrationReady,
    persistVillageSnapshot,
    publishSwarmVillageSnapshot,
    setIsSavingDraft,
    showToast,
    spentEnergyRef,
    statusRef,
    user?.uid,
  ]);

  useEffect(() => {
    if (!boardLoaded || !swarmProgressLoaded) return;
    let migrated = false;
    const migratedBoard = boardRef.current.map((cell) => {
      if (cell.foundation !== 'soil' || cell.soilStartSwarmCompletionCount !== null) return cell;
      migrated = true;
      return { ...cell, soilStartSwarmCompletionCount: swarmCompletionCount };
    });
    if (!migrated) return;
    boardRef.current = migratedBoard;
    setBoard(migratedBoard);
    if (!draftBaselineReady) return;
    void persistVillageSnapshot(
      createDraftSnapshot(
        migratedBoard,
        gridColsRef.current,
        spentEnergyRef.current,
      ),
      { silent: true },
    );
  }, [boardLoaded, boardRef, draftBaselineReady, gridColsRef, persistVillageSnapshot, setBoard, spentEnergyRef, swarmCompletionCount, swarmProgressLoaded]);

  return {
    applyForestSpiritProgressSnapshot,
    handleSaveVillage,
    markForestSpiritOpenedToday,
    persistVillageSnapshot,
    publishSwarmVillageSnapshot,
    saveDraftToCache,
    syncForestSpiritProgressToFirebase,
  };
}
