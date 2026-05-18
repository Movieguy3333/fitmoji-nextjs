import type { SwarmVillageBoardCell } from '@/types/swarm-village';

import { getCell } from './board';
import { GRID_ROWS } from './constants';
import type { BoardPatch, Enemy } from './types';
import { getCombatUnitDamage, getTreeLevel, isUpgradeableTreeUnit } from './units';
import { clamp } from './utils';

// ── Projectile type ───────────────────────────────────────────────────────────

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

// ── Combat constants ──────────────────────────────────────────────────────────

export const BOXER_RANGE = 1.15;
export const BOXER_COOLDOWN_MS = 1000;

export const TENNIS_RANGE = 6;
export const TENNIS_COOLDOWN_MS = 3000;
export const TENNIS_SPEED_PER_TICK = 0.3;
export const TENNIS_PROJECTILE_HIT_RADIUS = 0.66;

export const QUARTERBACK_RANGE = 12;
export const QUARTERBACK_COOLDOWN_MS = 3500;
export const QUARTERBACK_SPEED_PER_TICK = 0.55;
export const QUARTERBACK_PROJECTILE_HIT_RADIUS = 0.76;
export const QUARTERBACK_SPLASH_CELL_RADIUS = 1.5;
export const QUARTERBACK_ARC_HEIGHT = 2.8;

// ── Main step function ────────────────────────────────────────────────────────

/**
 * Advances tree-side combat for one simulation tick.
 *
 * - Boxer:       melee, directly damages nearest enemy in range (no projectile)
 * - Tennis/QB:   range attack, spawns a Projectile aimed at nearest enemy
 * - Projectiles: each existing projectile moves one step; hits trigger damage
 *                (tennis = single target, football = AoE splash)
 *
 * Returns patches that must be applied to the board (unitLastAttackAt, facing),
 * new + surviving projectiles, and a map of enemy-id → total damage to apply.
 */
export function stepTreeCombat(args: {
  board: SwarmVillageBoardCell[];
  gridCols: number;
  enemies: Enemy[];
  projectiles: Projectile[];
  now: number;
  damageMultiplier: number;
  nextProjectileId: () => string;
}): {
  nextProjectiles: Projectile[];
  boardPatches: BoardPatch[];
  enemyDamage: Map<string, number>;
} {
  const { board, gridCols, enemies, projectiles, now, damageMultiplier, nextProjectileId } = args;
  const boardPatches: BoardPatch[] = [];
  const spawnedProjectiles: Projectile[] = [];
  const enemyDamage = new Map<string, number>();

  // ── A. Tree scan ─────────────────────────────────────────────────────────

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < gridCols; c++) {
      const cell = getCell(board, r, c, gridCols);
      if (!isUpgradeableTreeUnit(cell.unit)) continue;

      const unit = cell.unit;
      const isBoxer = unit === 'boxer';
      const isQB = unit === 'quarterback';
      const cooldownMs = isBoxer
        ? BOXER_COOLDOWN_MS
        : isQB
          ? QUARTERBACK_COOLDOWN_MS
          : TENNIS_COOLDOWN_MS;
      const range = isBoxer ? BOXER_RANGE : isQB ? QUARTERBACK_RANGE : TENNIS_RANGE;

      if (now - cell.unitLastAttackAt < cooldownMs) continue;

      // Find nearest enemy in range
      let targetIndex = -1;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i]!;
        const d = Math.hypot(enemy.row - r, enemy.col - c);
        if (d > range) continue;
        if (d < nearestDistance) {
          nearestDistance = d;
          targetIndex = i;
        }
      }

      if (targetIndex < 0) continue;

      const target = enemies[targetIndex]!;
      const damage = getCombatUnitDamage(unit, getTreeLevel(cell)) * damageMultiplier;
      const nextFacingScaleX: 1 | -1 = target.col < c ? -1 : 1;

      boardPatches.push({
        row: r,
        col: c,
        updater: (cc) => ({ ...cc, unitLastAttackAt: now, unitFacingScaleX: nextFacingScaleX }),
      });

      if (isBoxer) {
        enemyDamage.set(target.id, (enemyDamage.get(target.id) ?? 0) + damage);
      } else {
        const launchRow = r + 0.15;
        const dr = target.row - launchRow;
        const dc = target.col - c;
        const dist = Math.max(1e-4, Math.hypot(dr, dc));

        const projectile: Projectile = {
          id: nextProjectileId(),
          row: launchRow,
          col: c,
          velRow: dr / dist,
          velCol: dc / dist,
          damage,
          speedPerTick: isQB ? QUARTERBACK_SPEED_PER_TICK : TENNIS_SPEED_PER_TICK,
          remainingRange: isQB ? QUARTERBACK_RANGE : TENNIS_RANGE,
          kind: isQB ? 'football' : 'tennis',
          ...(isQB && {
            totalRange: QUARTERBACK_RANGE,
            traveledRange: 0,
            arcHeight: QUARTERBACK_ARC_HEIGHT,
            launchedAtMs: now,
          }),
        };
        spawnedProjectiles.push(projectile);
      }
    }
  }

  // ── B. Advance existing projectiles ──────────────────────────────────────

  const nextProjectiles: Projectile[] = [];

  for (const raw of projectiles) {
    const p = { ...raw };
    const step = p.speedPerTick;
    p.row += p.velRow * step;
    p.col += p.velCol * step;
    p.remainingRange -= step;
    if (p.traveledRange != null) p.traveledRange += step;

    const expired =
      p.remainingRange <= 0 ||
      p.row < -1 ||
      p.row > GRID_ROWS + 1 ||
      p.col < -1 ||
      p.col > gridCols + 1;

    const hitRadius =
      p.kind === 'football'
        ? QUARTERBACK_PROJECTILE_HIT_RADIUS
        : TENNIS_PROJECTILE_HIT_RADIUS;

    let hitEnemyId: string | null = null;
    let nearestHitDist = Number.POSITIVE_INFINITY;
    for (const enemy of enemies) {
      const d = Math.hypot(enemy.row - p.row, enemy.col - p.col);
      if (d <= hitRadius && d < nearestHitDist) {
        hitEnemyId = enemy.id;
        nearestHitDist = d;
      }
    }

    if (p.kind === 'football') {
      if (expired || hitEnemyId != null) {
        // AoE splash around impact point
        const centerRow = Math.round(p.row);
        const centerCol = Math.round(p.col);
        for (const enemy of enemies) {
          if (
            Math.abs(enemy.row - centerRow) <= QUARTERBACK_SPLASH_CELL_RADIUS &&
            Math.abs(enemy.col - centerCol) <= QUARTERBACK_SPLASH_CELL_RADIUS
          ) {
            enemyDamage.set(enemy.id, (enemyDamage.get(enemy.id) ?? 0) + p.damage);
          }
        }
        continue;
      }
      nextProjectiles.push(p);
    } else {
      // Tennis ball: single-target hit
      if (expired) continue;
      if (hitEnemyId != null) {
        enemyDamage.set(hitEnemyId, (enemyDamage.get(hitEnemyId) ?? 0) + p.damage);
        continue;
      }
      nextProjectiles.push(p);
    }
  }

  // Append newly spawned projectiles so they start moving next tick
  nextProjectiles.push(...spawnedProjectiles);

  return { nextProjectiles, boardPatches, enemyDamage };
}

// ── Rendering helpers (consumed by swarm-village-live-scene) ─────────────────

/**
 * Returns the isometric elevation offset (in half-tile units) for a projectile.
 * Footballs follow a sine arc; tennis balls float at a constant height.
 */
export const getProjectileElevation = (
  projectile: Pick<Projectile, 'arcHeight' | 'kind' | 'totalRange' | 'traveledRange'>,
): number => {
  if (projectile.kind !== 'football') return 1.2;
  const total = Math.max(1, projectile.totalRange ?? QUARTERBACK_RANGE);
  const progress = clamp((projectile.traveledRange ?? 0) / total, 0, 1);
  return 0.55 + Math.sin(progress * Math.PI) * (projectile.arcHeight ?? QUARTERBACK_ARC_HEIGHT);
};

/**
 * Returns the screen-space rotation angle (radians) for the football sprite,
 * accounting for isometric projection.
 */
export const getFootballScreenAngle = (
  projectile: Pick<Projectile, 'velCol' | 'velRow'>,
): number =>
  Math.atan2(
    projectile.velRow + projectile.velCol,
    projectile.velCol - projectile.velRow,
  );
