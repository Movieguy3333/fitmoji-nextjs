import { useAuth } from '@/contexts/AuthContext';
import { totalEarnedStarsFromGameState } from '@/lib/play/starRewardCelebration';
import type { StarRating } from '@/lib/game/types';
import {
  FOREST_SPIRIT_PROGRESS_CACHE_KEY,
  getGameStateCacheKey,
  PLAY_TEST_OVERRIDES_STORAGE_KEY,
  SWARM_PROGRESS_CACHE_KEY,
} from '@/components/play/swarmVillage/model/cacheKeys';
import { EASTERN_TIME_FORMATTER, SWARM_WINDOW_HOURS } from '@/components/play/swarmVillage/model/constants';
import { FOREST_SPIRIT_REQUIRED_STREAK_DAYS } from '@/components/play/swarmVillage/model/costs';
import type {
  CachedGameStateSnapshot,
  CachedVillageTestOverrides,
  ForestSpiritProgressSnapshot,
  SwarmProgressSnapshot,
} from '@/components/play/swarmVillage/model/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import moment from 'moment-timezone';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const COUNTDOWN_TICK_MS = 1_000;

/* ── helpers ─ */
const getEasternClockParts = (date = new Date()) => {
  const parts = EASTERN_TIME_FORMATTER.formatToParts(date);
  return Object.fromEntries(
    parts.filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]),
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;
};

const getEasternDayKey = (date = new Date()) => {
  const { year, month, day } = getEasternClockParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const getSwarmOpenAtMsForEasternDayKey = (dayKey: string, hour: number) =>
  moment.tz(`${dayKey} ${String(hour).padStart(2, '0')}:00:00`, 'YYYY-MM-DD HH:mm:ss', 'America/New_York').valueOf();

const getSwarmWindowsForEasternDayKey = (dayKey: string) =>
  SWARM_WINDOW_HOURS.map((hour) => ({
    hour,
    atMs: getSwarmOpenAtMsForEasternDayKey(dayKey, hour),
  }));

const getEasternDayKeyOffset = (date: Date, dayOffset: number) =>
  moment.tz(getEasternDayKey(date), 'YYYY-MM-DD', 'America/New_York').add(dayOffset, 'day').format('YYYY-MM-DD');

const getCurrentOrNextSwarmOpenAtMs = (date = new Date()) => {
  const nowMs = date.getTime();
  const todayWindows = getSwarmWindowsForEasternDayKey(getEasternDayKey(date));
  const activeWindow = [...todayWindows].reverse().find((window) => nowMs >= window.atMs);
  return activeWindow?.atMs ?? todayWindows[0]!.atMs;
};

const getNextSwarmUnlockLabel = (atMs: number) => {
  const easternHour = moment.tz(atMs, 'America/New_York').hour();
  const label = easternHour < 15 ? 'Noon' : 'Evening';
  const formatted = moment.tz(atMs, 'America/New_York').format('h:mm A');
  return `${label} unlock at ${formatted} ET`;
};

const getDayDifferenceFromKeys = (laterDayKey: string, earlierDayKey: string) =>
  moment
    .tz(laterDayKey, 'YYYY-MM-DD', 'America/New_York')
    .diff(moment.tz(earlierDayKey, 'YYYY-MM-DD', 'America/New_York'), 'days');

const normalizeLoadedSwarmNextAvailableAtMs = (value: number, now = new Date()) => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const easternValue = moment.tz(value, 'America/New_York');
  const easternDayKey = easternValue.format('YYYY-MM-DD');
  if (easternValue.hour() === 18 && easternDayKey > getEasternDayKey(now)) {
    return getSwarmOpenAtMsForEasternDayKey(easternDayKey, SWARM_WINDOW_HOURS[0]);
  }
  return value;
};

const formatCountdown = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const parseStoredPositiveInt = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

const parseStarBalanceFromState = (
  gameState: CachedGameStateSnapshot | null | undefined,
  testOverrides: CachedVillageTestOverrides | null | undefined,
) => {
  const nodeStarsRaw = gameState?.nodeStars ?? {};
  const nodeStars: Record<number, StarRating> = {};
  for (const [key, value] of Object.entries(nodeStarsRaw)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    nodeStars[Number(key)] = Math.max(0, Math.min(3, Math.floor(value))) as StarRating;
  }
  const partyBonusStarsBank = parseStoredPositiveInt(gameState?.partyBonusStarsBank);
  const starsSpent = parseStoredPositiveInt(gameState?.starsSpent);
  const testOverrideStars = parseStoredPositiveInt(testOverrides?.stars);
  return Math.max(
    0,
    totalEarnedStarsFromGameState({ nodeStars, testOverrideStars, partyBonusStarsBank }) - starsSpent,
  );
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* ── return type ─────────────────────────────────────────── */
export type SwarmVillageStatus = {
  loaded: boolean;
  /** true if the player has ever placed a build */
  hasVillage: boolean;
  /** Current swarm streak (0 if broken) */
  streak: number;
  /** Total completions ever */
  completionCount: number;
  /** true if the swarm can be started right now */
  swarmReady: boolean;
  /** Human-readable countdown e.g. "05:29:33" — empty when ready */
  countdownLabel: string;
  /** e.g. "Evening unlock at 6:00 PM ET" — empty when ready */
  nextUnlockLabel: string;
  /** Forest spirit daily-open streak (0..7) */
  forestSpiritProgress: number;
  /** Forest spirit required days */
  forestSpiritRequiredDays: number;
  /** true if forest spirit powerup is charged */
  forestSpiritReady: boolean;
  /** Star balance */
  starBalance: number;
};

/* ── hook ────────────────────────────────────────────────── */
export function useSwarmVillageStatus(): SwarmVillageStatus {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [swarmProgress, setSwarmProgress] = useState<SwarmProgressSnapshot | null>(null);
  const [forestSpirit, setForestSpirit] = useState<ForestSpiritProgressSnapshot | null>(null);
  const [starBalance, setStarBalance] = useState(0);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── load from AsyncStorage on focus ───────────────────── */
  const loadAll = useCallback(async () => {
    try {
      const [rawSwarm, rawSpirit] = await Promise.all([
        AsyncStorage.getItem(SWARM_PROGRESS_CACHE_KEY),
        AsyncStorage.getItem(FOREST_SPIRIT_PROGRESS_CACHE_KEY),
      ]);

      if (rawSwarm) {
        const parsed = JSON.parse(rawSwarm) as Partial<SwarmProgressSnapshot>;
        setSwarmProgress({
          nextAvailableAtMs:
            typeof parsed.nextAvailableAtMs === 'number' && Number.isFinite(parsed.nextAvailableAtMs)
              ? Math.max(0, normalizeLoadedSwarmNextAvailableAtMs(parsed.nextAvailableAtMs))
              : 0,
          streakCount:
            typeof parsed.streakCount === 'number' && Number.isFinite(parsed.streakCount)
              ? Math.max(0, Math.floor(parsed.streakCount))
              : 0,
          completionCount:
            typeof parsed.completionCount === 'number' && Number.isFinite(parsed.completionCount)
              ? Math.max(0, Math.floor(parsed.completionCount))
              : 0,
          firstVillageBuildPlacedAtMs:
            typeof parsed.firstVillageBuildPlacedAtMs === 'number' && Number.isFinite(parsed.firstVillageBuildPlacedAtMs)
              ? Math.max(0, Math.floor(parsed.firstVillageBuildPlacedAtMs))
              : null,
          lastCompletedDayKey:
            typeof parsed.lastCompletedDayKey === 'string' && parsed.lastCompletedDayKey.trim().length > 0
              ? parsed.lastCompletedDayKey
              : null,
        });
      }

      if (rawSpirit) {
        const parsed = JSON.parse(rawSpirit) as Partial<ForestSpiritProgressSnapshot>;
        setForestSpirit({
          lastOpenedDayKey:
            typeof parsed.lastOpenedDayKey === 'string' && parsed.lastOpenedDayKey.trim().length > 0
              ? parsed.lastOpenedDayKey
              : null,
          streakCount:
            typeof parsed.streakCount === 'number' && Number.isFinite(parsed.streakCount)
              ? Math.max(0, Math.floor(parsed.streakCount))
              : 0,
          charges:
            typeof parsed.charges === 'number' && Number.isFinite(parsed.charges)
              ? Math.max(0, Math.floor(parsed.charges))
              : 0,
        });
      }

      /* star balance */
      const uid = user?.uid;
      if (uid) {
        let cachedGameState: CachedGameStateSnapshot | null = null;
        let cachedTestOverrides: CachedVillageTestOverrides | null = null;

        try {
          const rawState = await AsyncStorage.getItem(getGameStateCacheKey(uid));
          if (rawState) cachedGameState = JSON.parse(rawState) as CachedGameStateSnapshot;
        } catch {}

        try {
          const rawOverrides = await AsyncStorage.getItem(PLAY_TEST_OVERRIDES_STORAGE_KEY);
          if (rawOverrides) cachedTestOverrides = JSON.parse(rawOverrides) as CachedVillageTestOverrides;
        } catch {}

        setStarBalance(parseStarBalanceFromState(cachedGameState, cachedTestOverrides));
      }
    } catch (err) {
      if (__DEV__) console.warn('[useSwarmVillageStatus] Load error:', err);
    } finally {
      setLoaded(true);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      void loadAll();
    }, [loadAll]),
  );

  /* ── countdown tick ────────────────────────────────────── */
  useEffect(() => {
    intervalRef.current = setInterval(() => setTick((t) => t + 1), COUNTDOWN_TICK_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /* ── derived values ────────────────────────────────────── */
  return useMemo(() => {
    if (!loaded || !swarmProgress) {
      return {
        loaded,
        hasVillage: false,
        streak: 0,
        completionCount: 0,
        swarmReady: false,
        countdownLabel: '',
        nextUnlockLabel: '',
        forestSpiritProgress: 0,
        forestSpiritRequiredDays: FOREST_SPIRIT_REQUIRED_STREAK_DAYS,
        forestSpiritReady: false,
        starBalance: 0,
      };
    }

    const now = new Date();
    const nowMs = now.getTime();
    const currentOrNextOpenAtMs = getCurrentOrNextSwarmOpenAtMs(now);
    const effectiveUnlockAtMs = Math.max(swarmProgress.nextAvailableAtMs, currentOrNextOpenAtMs);
    const swarmReady = nowMs >= effectiveUnlockAtMs;
    const countdownMs = Math.max(0, effectiveUnlockAtMs - nowMs);

    const currentEasternDayKey = getEasternDayKey(now);
    let streak = 0;
    if (swarmProgress.lastCompletedDayKey) {
      const dayGap = getDayDifferenceFromKeys(currentEasternDayKey, swarmProgress.lastCompletedDayKey);
      streak = dayGap <= 1 ? swarmProgress.streakCount : 0;
    }

    const forestSpiritCharges = forestSpirit?.charges ?? 0;
    const forestSpiritOpenStreak = forestSpirit?.streakCount ?? 0;
    const forestSpiritDisplayProgress =
      forestSpiritCharges > 0
        ? FOREST_SPIRIT_REQUIRED_STREAK_DAYS
        : clamp(forestSpiritOpenStreak, 0, FOREST_SPIRIT_REQUIRED_STREAK_DAYS);

    return {
      loaded: true,
      hasVillage: swarmProgress.firstVillageBuildPlacedAtMs !== null,
      streak,
      completionCount: swarmProgress.completionCount,
      swarmReady,
      countdownLabel: swarmReady ? '' : formatCountdown(countdownMs),
      nextUnlockLabel: swarmReady ? '' : getNextSwarmUnlockLabel(effectiveUnlockAtMs),
      forestSpiritProgress: forestSpiritDisplayProgress,
      forestSpiritRequiredDays: FOREST_SPIRIT_REQUIRED_STREAK_DAYS,
      forestSpiritReady: forestSpiritCharges > 0,
      starBalance,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, swarmProgress, forestSpirit, starBalance, tick]);
}
