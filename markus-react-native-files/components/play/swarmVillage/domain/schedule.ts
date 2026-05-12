import moment from 'moment-timezone';

import { NEW_PLAYER_ENERGY_OFFSET_CACHE_KEY_PREFIX } from '@/components/play/swarmVillage/model/cacheKeys';
import {
  EASTERN_TIME_FORMATTER,
  SWARM_NOTIFICATION_LOOKAHEAD_DAYS,
  SWARM_WINDOW_HOURS,
} from '@/components/play/swarmVillage/model/constants';

export const getEasternClockParts = (date = new Date()) => {
  const parts = EASTERN_TIME_FORMATTER.formatToParts(date);
  return Object.fromEntries(
    parts.filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]),
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;
};

export const getEasternDayKey = (date = new Date()) => {
  const { year, month, day } = getEasternClockParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const getEasternDayKeyOffset = (date: Date, dayOffset: number) =>
  moment.tz(getEasternDayKey(date), 'YYYY-MM-DD', 'America/New_York').add(dayOffset, 'day').format('YYYY-MM-DD');

export const getAprilEnergySeasonStart = (date = new Date()) => {
  const aprilStart = new Date(date.getFullYear(), 3, 1, 0, 0, 0, 0);
  if (date.getTime() < aprilStart.getTime()) aprilStart.setFullYear(aprilStart.getFullYear() - 1);
  return aprilStart;
};

export const getNewPlayerEnergyOffsetCacheKey = (uid: string, seasonStart: Date) =>
  `${NEW_PLAYER_ENERGY_OFFSET_CACHE_KEY_PREFIX}:${uid}:${seasonStart.getFullYear()}`;

export const getSwarmOpenAtMsForEasternDayKey = (dayKey: string, hour: (typeof SWARM_WINDOW_HOURS)[number]) =>
  moment.tz(`${dayKey} ${String(hour).padStart(2, '0')}:00:00`, 'YYYY-MM-DD HH:mm:ss', 'America/New_York').valueOf();

export const getSwarmWindowsForEasternDayKey = (dayKey: string) =>
  SWARM_WINDOW_HOURS.map((hour) => ({
    hour,
    atMs: getSwarmOpenAtMsForEasternDayKey(dayKey, hour),
  }));

export const getCurrentOrNextSwarmOpenAtMs = (date = new Date()) => {
  const nowMs = date.getTime();
  const todayWindows = getSwarmWindowsForEasternDayKey(getEasternDayKey(date));
  const activeWindow = [...todayWindows].reverse().find((window) => nowMs >= window.atMs);
  return activeWindow?.atMs ?? todayWindows[0]!.atMs;
};

export const getNextDailySwarmUnlockMs = (date = new Date()) => {
  const nowMs = date.getTime();
  for (let offset = 0; offset <= SWARM_NOTIFICATION_LOOKAHEAD_DAYS; offset += 1) {
    const dayKey = getEasternDayKeyOffset(date, offset);
    const nextWindow = getSwarmWindowsForEasternDayKey(dayKey).find((window) => window.atMs > nowMs);
    if (nextWindow) return nextWindow.atMs;
  }
  return getSwarmOpenAtMsForEasternDayKey(getEasternDayKeyOffset(date, 1), SWARM_WINDOW_HOURS[0]);
};

export const getCountdownToNextInvasionMs = (date = new Date()) => {
  return Math.max(0, getCurrentOrNextSwarmOpenAtMs(date) - date.getTime());
};

export const getActiveSwarmWindowKey = (date = new Date()) => {
  const dayKey = getEasternDayKey(date);
  const nowMs = date.getTime();
  const activeWindow =
    [...getSwarmWindowsForEasternDayKey(dayKey)].reverse().find((window) => nowMs >= window.atMs)
    ?? getSwarmWindowsForEasternDayKey(dayKey)[0]!;
  return `${dayKey}:${activeWindow.hour}`;
};

export const getSwarmWindowLabel = (atMs: number) => {
  const easternHour = moment.tz(atMs, 'America/New_York').hour();
  return easternHour < 15 ? 'Noon' : 'Evening';
};

export const getSwarmWindowNotificationTitle = (atMs: number) =>
  `${getSwarmWindowLabel(atMs)} swarm available \u2014 defend your home base \u2694\uFE0F`;

export const getNextSwarmUnlockLabel = (atMs: number) => {
  const label = getSwarmWindowLabel(atMs);
  const easternHour = moment.tz(atMs, 'America/New_York').format('h:mm A');
  return `${label} unlock at ${easternHour} ET`;
};

export const normalizeLoadedSwarmNextAvailableAtMs = (value: number, now = new Date()) => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const easternValue = moment.tz(value, 'America/New_York');
  const easternDayKey = easternValue.format('YYYY-MM-DD');
  if (easternValue.hour() === 18 && easternDayKey > getEasternDayKey(now)) {
    return getSwarmOpenAtMsForEasternDayKey(easternDayKey, SWARM_WINDOW_HOURS[0]);
  }
  return value;
};

export const getDayDifferenceFromKeys = (laterDayKey: string, earlierDayKey: string) =>
  moment.tz(laterDayKey, 'YYYY-MM-DD', 'America/New_York').diff(
    moment.tz(earlierDayKey, 'YYYY-MM-DD', 'America/New_York'),
    'days',
  );
