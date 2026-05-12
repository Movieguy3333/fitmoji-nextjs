import {
  AuthorizationRequestStatus,
  queryStatisticsForQuantity,
  useHealthkitAuthorization,
} from '@kingstinct/react-native-healthkit';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { aggregateRecord } from 'react-native-health-connect';

import {
  hasAndroidHealthPermissions,
  IOS_HEALTHKIT_READ_TYPES,
  IOS_HEALTHKIT_WRITE_TYPES,
} from '@/lib/health/healthPlatform';
import type { HealthMetrics } from './types';

const ALL_TIME_START = new Date(2000, 0, 1);

function startOfQuarter() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
  return d;
}

function getAprilStartDate() {
  const now = new Date();
  const aprilStart = new Date(now.getFullYear(), 3, 1, 0, 0, 0, 0);
  if (now.getTime() < aprilStart.getTime()) aprilStart.setFullYear(aprilStart.getFullYear() - 1);
  return aprilStart;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const ZERO: HealthMetrics = {
  steps: 0,
  activeCalories: 0,
  exerciseMinutes: 0,
  flightsClimbed: 0,
};

const ZERO_APRIL = { steps: 0, activeCalories: 0, exerciseMinutes: 0 };
const ZERO_TODAY = { steps: 0, activeCalories: 0, exerciseMinutes: 0 };

export function useHealthMetrics() {
  const [refreshTick, setRefreshTick] = useState(0);
  const [authStatus, requestAuth] = useHealthkitAuthorization({
    toRead: [...IOS_HEALTHKIT_READ_TYPES],
    toWrite: [...IOS_HEALTHKIT_WRITE_TYPES],
  });
  const [seasonSteps, setSeasonSteps] = useState(0);
  const [cumulativeMetrics, setCumulativeMetrics] = useState<HealthMetrics>(ZERO);
  const [sinceAprilMetrics, setSinceAprilMetrics] = useState(ZERO_APRIL);
  const [todayMetrics, setTodayMetrics] = useState(ZERO_TODAY);
  const [metricsReady, setMetricsReady] = useState(false);
  const [androidAuthorized, setAndroidAuthorized] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (
      authStatus === AuthorizationRequestStatus.unknown ||
      authStatus === AuthorizationRequestStatus.shouldRequest
    ) {
      requestAuth().catch((err) => console.warn('[useHealthMetrics] auth failed:', err));
    }
  }, [authStatus, requestAuth]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const id = setInterval(() => setRefreshTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  const iosAuthorized = authStatus === AuthorizationRequestStatus.unnecessary;
  const authorized = Platform.OS === 'android' ? androidAuthorized : iosAuthorized;
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  useEffect(() => {
    if (!isAndroid) return;
    let cancelled = false;

    const checkPermissions = async () => {
      try {
        const granted = await hasAndroidHealthPermissions();
        if (!cancelled) setAndroidAuthorized(granted);
      } catch {
        if (!cancelled) setAndroidAuthorized(false);
      }
    };

    checkPermissions();
    return () => {
      cancelled = true;
    };
  }, [isAndroid, refreshTick]);

  /* ── iOS metrics ─────────────────────────────────────── */
  useEffect(() => {
    if (isIOS && !authorized) {
      setSeasonSteps(0);
      setCumulativeMetrics(ZERO);
      setSinceAprilMetrics(ZERO_APRIL);
      setMetricsReady(false);
      return;
    }
    if (!isIOS) return;

    let cancelled = false;
    const to = new Date();
    const seasonStart = startOfQuarter();
    const aprilStart = getAprilStartDate();
    const todayStart = startOfToday();

    const readCumulative = async (
      identifier:
        | 'HKQuantityTypeIdentifierStepCount'
        | 'HKQuantityTypeIdentifierActiveEnergyBurned'
        | 'HKQuantityTypeIdentifierAppleExerciseTime'
        | 'HKQuantityTypeIdentifierFlightsClimbed',
      unit: 'count' | 'kcal' | 'min',
      from: Date,
    ) => {
      try {
        const response = await queryStatisticsForQuantity(identifier, ['cumulativeSum'], {
          filter: { date: { startDate: from, endDate: to } },
          unit,
        });
        return Math.max(0, Math.round(response?.sumQuantity?.quantity ?? 0));
      } catch {
        return 0;
      }
    };

    const load = async () => {
      const [
        seasonStepsValue,
        allSteps,
        allCalories,
        allExerciseMinutes,
        allFlights,
        aprilSteps,
        aprilCalories,
        aprilExerciseMinutes,
        todaySteps,
        todayCalories,
        todayExerciseMinutes,
      ] = await Promise.all([
        readCumulative('HKQuantityTypeIdentifierStepCount', 'count', seasonStart),
        readCumulative('HKQuantityTypeIdentifierStepCount', 'count', ALL_TIME_START),
        readCumulative('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal', ALL_TIME_START),
        readCumulative('HKQuantityTypeIdentifierAppleExerciseTime', 'min', ALL_TIME_START),
        readCumulative('HKQuantityTypeIdentifierFlightsClimbed', 'count', ALL_TIME_START),
        readCumulative('HKQuantityTypeIdentifierStepCount', 'count', aprilStart),
        readCumulative('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal', aprilStart),
        readCumulative('HKQuantityTypeIdentifierAppleExerciseTime', 'min', aprilStart),
        readCumulative('HKQuantityTypeIdentifierStepCount', 'count', todayStart),
        readCumulative('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal', todayStart),
        readCumulative('HKQuantityTypeIdentifierAppleExerciseTime', 'min', todayStart),
      ]);

      if (cancelled) return;
      setSeasonSteps(seasonStepsValue);
      setCumulativeMetrics({
        steps: allSteps,
        activeCalories: allCalories,
        exerciseMinutes: allExerciseMinutes,
        flightsClimbed: allFlights,
      });
      setSinceAprilMetrics({
        steps: aprilSteps,
        activeCalories: aprilCalories,
        exerciseMinutes: aprilExerciseMinutes,
      });
      setTodayMetrics({
        steps: todaySteps,
        activeCalories: todayCalories,
        exerciseMinutes: todayExerciseMinutes,
      });
      setMetricsReady(true);
    };

    load().catch((err) => {
      if (__DEV__) {
        console.warn('[useHealthMetrics] failed reading cumulative metrics:', err);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authorized, isIOS, refreshTick]);

  /* ── Android metrics ─────────────────────────────────── */
  useEffect(() => {
    if (!isAndroid || !authorized) {
      if (isAndroid) {
        setSeasonSteps(0);
        setCumulativeMetrics(ZERO);
        setSinceAprilMetrics(ZERO_APRIL);
        setMetricsReady(false);
      }
      return;
    }

    let cancelled = false;
    const nowIso = new Date().toISOString();
    const seasonStartIso = startOfQuarter().toISOString();
    const allTimeIso = ALL_TIME_START.toISOString();
    const aprilIso = getAprilStartDate().toISOString();
    const todayIso = startOfToday().toISOString();

    const between = (startTime: string) => ({
      operator: 'between' as const,
      startTime,
      endTime: nowIso,
    });

    const load = async () => {
      const [
        seasonStepsAgg,
        allStepsAgg,
        activeCaloriesAgg,
        exerciseDurationAgg,
        floorsAgg,
        aprilStepsAgg,
        aprilCaloriesAgg,
        aprilExerciseAgg,
        todayStepsAgg,
        todayCaloriesAgg,
        todayExerciseAgg,
      ] = await Promise.all([
        aggregateRecord({ recordType: 'Steps', timeRangeFilter: between(seasonStartIso) }),
        aggregateRecord({ recordType: 'Steps', timeRangeFilter: between(allTimeIso) }),
        aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: between(allTimeIso) }),
        aggregateRecord({ recordType: 'ExerciseSession', timeRangeFilter: between(allTimeIso) }),
        aggregateRecord({ recordType: 'FloorsClimbed', timeRangeFilter: between(allTimeIso) }),
        aggregateRecord({ recordType: 'Steps', timeRangeFilter: between(aprilIso) }),
        aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: between(aprilIso) }),
        aggregateRecord({ recordType: 'ExerciseSession', timeRangeFilter: between(aprilIso) }),
        aggregateRecord({ recordType: 'Steps', timeRangeFilter: between(todayIso) }),
        aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: between(todayIso) }),
        aggregateRecord({ recordType: 'ExerciseSession', timeRangeFilter: between(todayIso) }),
      ]);

      if (cancelled) return;

      const seasonStepsValue = Math.max(
        0,
        Math.round((seasonStepsAgg as { COUNT_TOTAL?: number })?.COUNT_TOTAL ?? 0),
      );
      const allSteps = Math.max(
        0,
        Math.round((allStepsAgg as { COUNT_TOTAL?: number })?.COUNT_TOTAL ?? 0),
      );
      const allCalories = Math.max(
        0,
        Math.round(
          (activeCaloriesAgg as { ACTIVE_CALORIES_TOTAL?: { inKilocalories?: number } })
            ?.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0,
        ),
      );
      const allExerciseMinutes = Math.max(
        0,
        Math.round(
          ((exerciseDurationAgg as { EXERCISE_DURATION_TOTAL?: { inSeconds?: number } })
            ?.EXERCISE_DURATION_TOTAL?.inSeconds ?? 0) / 60,
        ),
      );
      const allFlights = Math.max(
        0,
        Math.round((floorsAgg as { FLOORS_CLIMBED_TOTAL?: number })?.FLOORS_CLIMBED_TOTAL ?? 0),
      );
      const aprilCalories = Math.max(
        0,
        Math.round(
          (aprilCaloriesAgg as { ACTIVE_CALORIES_TOTAL?: { inKilocalories?: number } })
            ?.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0,
        ),
      );
      const aprilSteps = Math.max(
        0,
        Math.round((aprilStepsAgg as { COUNT_TOTAL?: number })?.COUNT_TOTAL ?? 0),
      );
      const aprilExerciseMinutes = Math.max(
        0,
        Math.round(
          ((aprilExerciseAgg as { EXERCISE_DURATION_TOTAL?: { inSeconds?: number } })
            ?.EXERCISE_DURATION_TOTAL?.inSeconds ?? 0) / 60,
        ),
      );
      const todayCalories = Math.max(
        0,
        Math.round(
          (todayCaloriesAgg as { ACTIVE_CALORIES_TOTAL?: { inKilocalories?: number } })
            ?.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0,
        ),
      );
      const todaySteps = Math.max(
        0,
        Math.round((todayStepsAgg as { COUNT_TOTAL?: number })?.COUNT_TOTAL ?? 0),
      );
      const todayExerciseMinutes = Math.max(
        0,
        Math.round(
          ((todayExerciseAgg as { EXERCISE_DURATION_TOTAL?: { inSeconds?: number } })
            ?.EXERCISE_DURATION_TOTAL?.inSeconds ?? 0) / 60,
        ),
      );

      setSeasonSteps(seasonStepsValue);
      setCumulativeMetrics({
        steps: allSteps,
        activeCalories: allCalories,
        exerciseMinutes: allExerciseMinutes,
        flightsClimbed: allFlights,
      });
      setSinceAprilMetrics({
        steps: aprilSteps,
        activeCalories: aprilCalories,
        exerciseMinutes: aprilExerciseMinutes,
      });
      setTodayMetrics({
        steps: todaySteps,
        activeCalories: todayCalories,
        exerciseMinutes: todayExerciseMinutes,
      });
      setMetricsReady(true);
    };

    load().catch((err) => {
      if (__DEV__) {
        console.warn('[useHealthMetrics] failed reading Android cumulative metrics:', err);
      }
      if (!cancelled) {
        setSeasonSteps(0);
        setCumulativeMetrics(ZERO);
        setSinceAprilMetrics(ZERO_APRIL);
        setMetricsReady(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authorized, isAndroid, refreshTick]);

  return { seasonSteps, cumulativeMetrics, sinceAprilMetrics, todayMetrics, refresh, authorized, metricsReady };
}
