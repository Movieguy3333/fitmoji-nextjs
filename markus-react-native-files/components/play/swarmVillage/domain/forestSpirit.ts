import { FOREST_SPIRIT_HEAL_FRACTION, FOREST_SPIRIT_REQUIRED_STREAK_DAYS } from '@/components/play/swarmVillage/model/costs';
import type {
  BoardCell,
  ForestSpiritProgressSnapshot,
} from '@/components/play/swarmVillage/model/types';

import { cloneBoardCells } from './board';
import { getDayDifferenceFromKeys, getEasternDayKey } from './schedule';
import {
  getWallMaxHp,
  isDamageableUnit,
} from './units';
import { clamp } from './utils';

export const createEmptyForestSpiritProgressSnapshot = (): ForestSpiritProgressSnapshot => ({
  lastOpenedDayKey: null,
  streakCount: 0,
  charges: 0,
});

export const createFirestoreEventId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const normalizeForestSpiritProgressSnapshot = (
  raw: Partial<ForestSpiritProgressSnapshot> | null | undefined,
): ForestSpiritProgressSnapshot => {
  const lastOpenedDayKey =
    typeof raw?.lastOpenedDayKey === 'string' && raw.lastOpenedDayKey.trim().length > 0
      ? raw.lastOpenedDayKey
      : null;
  const streakCount =
    typeof raw?.streakCount === 'number' && Number.isFinite(raw.streakCount)
      ? clamp(Math.floor(raw.streakCount), 0, FOREST_SPIRIT_REQUIRED_STREAK_DAYS)
      : 0;
  const charges =
    typeof raw?.charges === 'number' && Number.isFinite(raw.charges)
      ? Math.max(0, Math.floor(raw.charges))
      : 0;
  return { lastOpenedDayKey, streakCount, charges };
};

export const resolveForestSpiritDailyOpen = (
  snapshot: Partial<ForestSpiritProgressSnapshot> | null | undefined,
  date = new Date(),
) => {
  const normalized = normalizeForestSpiritProgressSnapshot(snapshot);
  const todayKey = getEasternDayKey(date);

  if (normalized.lastOpenedDayKey === todayKey) {
    if (normalized.streakCount < FOREST_SPIRIT_REQUIRED_STREAK_DAYS) {
      return { changed: false, earnedCharges: 0, snapshot: normalized };
    }
    const earnedCharges = Math.floor(normalized.streakCount / FOREST_SPIRIT_REQUIRED_STREAK_DAYS);
    return {
      changed: earnedCharges > 0,
      earnedCharges,
      snapshot: {
        ...normalized,
        streakCount: normalized.streakCount % FOREST_SPIRIT_REQUIRED_STREAK_DAYS,
        charges: normalized.charges + earnedCharges,
      },
    };
  }

  let nextStreakCount = 1;
  if (normalized.lastOpenedDayKey) {
    const dayGap = getDayDifferenceFromKeys(todayKey, normalized.lastOpenedDayKey);
    if (dayGap < 0) return { changed: false, earnedCharges: 0, snapshot: normalized };
    nextStreakCount = dayGap === 1 ? normalized.streakCount + 1 : 1;
  }

  const earnedCharges = Math.floor(nextStreakCount / FOREST_SPIRIT_REQUIRED_STREAK_DAYS);
  return {
    changed: true,
    earnedCharges,
    snapshot: {
      lastOpenedDayKey: todayKey,
      streakCount: nextStreakCount % FOREST_SPIRIT_REQUIRED_STREAK_DAYS,
      charges: normalized.charges + earnedCharges,
    },
  };
};

export const applyForestSpiritHealToBoard = (cells: BoardCell[], gridCols: number) => {
  const nextBoard = cloneBoardCells(cells);
  const healedCells: Array<{ row: number; col: number }> = [];
  let totalHpRestored = 0;

  nextBoard.forEach((cell, index) => {
    let nextCell = cell;
    let cellChanged = false;

    if (isDamageableUnit(cell.unit) && cell.unitMaxHp > 0 && cell.unitHp < cell.unitMaxHp) {
      const currentHp = Math.max(0, cell.unitHp);
      const nextHp = Math.min(cell.unitMaxHp, currentHp + Math.ceil(cell.unitMaxHp * FOREST_SPIRIT_HEAL_FRACTION));
      if (nextHp > currentHp) {
        nextCell = { ...nextCell, unitHp: nextHp };
        totalHpRestored += nextHp - currentHp;
        cellChanged = true;
      }
    }

    const wallMaxHp = getWallMaxHp(cell.wallType);
    if (cell.wallHeight > 0 && wallMaxHp > 0 && cell.wallHp < wallMaxHp) {
      const currentHp = Math.max(0, cell.wallHp);
      const nextHp = Math.min(wallMaxHp, currentHp + Math.ceil(wallMaxHp * FOREST_SPIRIT_HEAL_FRACTION));
      if (nextHp > currentHp) {
        nextCell = { ...nextCell, wallHp: nextHp };
        totalHpRestored += nextHp - currentHp;
        cellChanged = true;
      }
    }

    if (!cellChanged) return;
    const row = Math.floor(index / gridCols);
    const col = index % gridCols;
    nextBoard[index] = nextCell;
    healedCells.push({ row, col });
  });

  return { board: nextBoard, healedCells, totalHpRestored };
};

