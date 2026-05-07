import type { SwarmVillageBoardCell } from '@/types/swarm-village';

import { getCell, isWithinBoard } from './board';
import {
  CASTLE_TARGET_COL,
  ENEMY_TREE_ATTACK_COOLDOWN_MS,
  ENEMY_UNIT_ATTACK_RADIUS,
  ENEMY_WALL_ATTACK_COOLDOWN_MS,
  ENEMY_WALL_ATTACK_RADIUS,
  GRID_ROWS,
  NORMAL_IJOM_WALL_DAMAGE,
  SNOW_IJOM_WALL_DAMAGE,
  SNOW_WALL_SEEK_RANGE,
} from './constants';
import { enemyReachedCastle, resolveEnemySpacing } from './combat';
import type { BoardPatch, Enemy } from './types';
import { isDamageableUnit, getUnitMaxHp, getWallMaxHp } from './units';
import { clamp, keyForCell } from './utils';

function blocked(
  board: SwarmVillageBoardCell[],
  r: number,
  c: number,
  gridCols: number,
) {
  if (r < 0 || r >= GRID_ROWS || c < 0 || c >= gridCols) return true;
  return getCell(board, r, c, gridCols).wallHeight > 0;
}

function adjacentCells(row: number, col: number) {
  return [
    { row: Math.floor(row), col: Math.round(col) },
    { row: Math.ceil(row), col: Math.round(col) },
    { row: Math.round(row), col: Math.floor(col) },
    { row: Math.round(row), col: Math.ceil(col) },
    { row: Math.round(row - 1), col: Math.round(col) },
  ] as const;
}

function nearVulnerableUnit(
  e: Enemy,
  board: SwarmVillageBoardCell[],
  gridCols: number,
): { row: number; col: number } | null {
  for (const { row: r, col: c } of adjacentCells(e.row, e.col)) {
    if (r < 0 || r >= GRID_ROWS || c < 0 || c >= gridCols) continue;
    const cc = getCell(board, r, c, gridCols);
    if (
      isDamageableUnit(cc.unit) &&
      Math.hypot(r - e.row, c - e.col) <= ENEMY_UNIT_ATTACK_RADIUS
    )
      return { row: r, col: c };
  }
  return null;
}

function nearWall(
  e: Enemy,
  board: SwarmVillageBoardCell[],
  gridCols: number,
): { row: number; col: number } | null {
  for (const { row: r, col: c } of adjacentCells(e.row, e.col)) {
    if (r < 0 || r >= GRID_ROWS || c < 0 || c >= gridCols) continue;
    const cc = getCell(board, r, c, gridCols);
    if (
      cc.foundation &&
      cc.wallHeight > 0 &&
      Math.hypot(r - e.row, c - e.col) <= ENEMY_WALL_ATTACK_RADIUS
    )
      return { row: r, col: c };
  }
  return null;
}

function findWallTarget(
  e: Enemy,
  board: SwarmVillageBoardCell[],
  gridCols: number,
): { row: number; col: number } | null {
  const br = Math.round(e.row);
  const bc = Math.round(e.col);
  let best: { row: number; col: number; dist: number } | null = null;
  for (let dr = -SNOW_WALL_SEEK_RANGE; dr <= 0; dr++) {
    for (let dc = -SNOW_WALL_SEEK_RANGE; dc <= SNOW_WALL_SEEK_RANGE; dc++) {
      const wr = br + dr;
      const wc = bc + dc;
      if (wr < 0 || wr >= GRID_ROWS || wc < 0 || wc >= gridCols) continue;
      if (getCell(board, wr, wc, gridCols).wallHeight <= 0) continue;
      const d = Math.hypot(wr - e.row, wc - e.col);
      if (d <= SNOW_WALL_SEEK_RANGE && (!best || d < best.dist))
        best = { row: wr, col: wc, dist: d };
    }
  }
  return best;
}

/**
 * Advance one enemy by one simulation tick.
 *
 * Returns `{ next: null }` when the enemy reached the castle or died;
 * boardPatches contains mutations to apply to the board (wall/unit damage).
 * The caller is responsible for applying shipHp damage when next is null and
 * `reachedCastle` is true.
 */
export function stepEnemy(
  enemy: Enemy,
  others: Enemy[],
  board: SwarmVillageBoardCell[],
  gridCols: number,
  now: number,
  timeScale: number,
  difficultyRamp: number,
): {
  next: Enemy | null;
  reachedCastle: boolean;
  boardPatches: BoardPatch[];
} {
  const patches: BoardPatch[] = [];
  const e = { ...enemy };

  if (e.hp <= 0) return { next: null, reachedCastle: false, boardPatches: [] };
  if (enemyReachedCastle(e))
    return { next: null, reachedCastle: true, boardPatches: [] };

  const nu = nearVulnerableUnit(e, board, gridCols);
  if (nu) {
    if (now - e.lastAttackAt >= ENEMY_TREE_ATTACK_COOLDOWN_MS) {
      const { row: nr, col: nc } = nu;
      patches.push({
        row: nr,
        col: nc,
        updater: (cc) => {
          if (!isDamageableUnit(cc.unit)) return cc;
          const max =
            cc.unitMaxHp > 0
              ? cc.unitMaxHp
              : getUnitMaxHp(cc.unit, cc.unitLevel || 1);
          const cur = cc.unitHp > 0 ? cc.unitHp : max;
          const next = cur - e.damage;
          if (next <= 0) {
            return {
              ...cc,
              unit: null,
              unitHp: 0,
              unitMaxHp: 0,
              unitLevel: 0,
              unitFacingScaleX: 1,
              unitLastAttackAt: 0,
              unitRewardBaselineCompletionCount: null,
            };
          }
          return { ...cc, unitHp: next, unitMaxHp: max };
        },
      });
      e.lastAttackAt = now;
    }
    return { next: e, reachedCastle: false, boardPatches: patches };
  }

  const nw = nearWall(e, board, gridCols);
  if (nw) {
    if (now - e.lastAttackAt >= ENEMY_WALL_ATTACK_COOLDOWN_MS) {
      const wallDamage =
        e.variant === 'snow' ? SNOW_IJOM_WALL_DAMAGE : NORMAL_IJOM_WALL_DAMAGE;
      const { row: wr, col: wc } = nw;
      patches.push({
        row: wr,
        col: wc,
        updater: (cc) => {
          const wallMaxHp = getWallMaxHp(cc.wallType);
          const nextHp = cc.wallHp - wallDamage;
          if (nextHp <= 0) {
            const nextHeight = Math.max(0, cc.wallHeight - 1);
            return {
              ...cc,
              wallHeight: nextHeight,
              wallHp: nextHeight > 0 ? wallMaxHp : 0,
              wallType: nextHeight > 0 ? cc.wallType : null,
            };
          }
          return { ...cc, wallHp: nextHp };
        },
      });
      e.lastAttackAt = now;
    }
    return { next: e, reachedCastle: false, boardPatches: patches };
  }

  if (e.variant === 'snow') {
    const wallTarget = findWallTarget(e, board, gridCols);
    if (wallTarget) {
      const vr = wallTarget.row - e.row;
      const vc = wallTarget.col - e.col;
      const m = Math.max(1e-4, Math.hypot(vr, vc));
      const step = e.speedPerTick * difficultyRamp * timeScale;
      const nextRow = e.row + (vr / m) * step;
      const nextCol = e.col + (vc / m) * step;
      const resolved = resolveEnemySpacing(e, nextRow, nextCol, others, gridCols);
      e.row = resolved.row;
      e.col = resolved.col;
      return { next: e, reachedCastle: false, boardPatches: [] };
    }
  }

  const br = Math.round(e.row);
  const bc = Math.round(e.col);
  const sd = e.col < CASTLE_TARGET_COL ? 1 : -1;

  let tr = -1;
  let tc = CASTLE_TARGET_COL;
  for (const { dr, dc } of [
    { dr: -1, dc: 0 },
    { dr: -1, dc: sd },
    { dr: 0, dc: sd },
    { dr: 0, dc: -sd },
    { dr: 1, dc: 0 },
  ]) {
    const pr = br + dr;
    const pc = clamp(bc + dc, 0, gridCols - 1);
    if (pr < 0) {
      tr = -1;
      tc = CASTLE_TARGET_COL;
      break;
    }
    if (!blocked(board, pr, pc, gridCols)) {
      tr = pr;
      tc = pc;
      break;
    }
  }

  const vr = tr - e.row;
  const vc = tc - e.col;
  const m = Math.max(1e-4, Math.hypot(vr, vc));
  const step = e.speedPerTick * difficultyRamp * timeScale;
  const nextRow = e.row + (vr / m) * step;
  const nextCol = e.col + (vc / m) * step;
  const resolved = resolveEnemySpacing(e, nextRow, nextCol, others, gridCols);
  e.row = resolved.row;
  e.col = resolved.col;

  return { next: e, reachedCastle: false, boardPatches: [] };
}

/** Returns all path-tile cell positions (grass_path_*) on the board. */
export function getPathCells(
  board: SwarmVillageBoardCell[],
  gridCols: number,
): Array<{ row: number; col: number }> {
  const results: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < gridCols; col++) {
      const cell = getCell(board, row, col, gridCols);
      if (
        typeof cell.foundation === 'string' &&
        cell.foundation.startsWith('grass_path') &&
        cell.wallHeight <= 0 &&
        !cell.unit
      ) {
        results.push({ row, col });
      }
    }
  }
  return results;
}

/** Deduplicated key set for path cells. */
export function buildPathKeySet(
  pathCells: Array<{ row: number; col: number }>,
): Set<string> {
  const set = new Set<string>();
  for (const { row, col } of pathCells) set.add(keyForCell(row, col));
  return set;
}
