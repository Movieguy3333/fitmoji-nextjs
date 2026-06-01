"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { SwarmVillageBoardCell } from "@/types/swarm-village";

import { boardIndex } from "./board";
import {
  DEFAULT_WAVE_SIZE,
  GRID_ROWS,
  IJOM_BASE_DAMAGE,
  IJOM_CONCURRENT_ENTITY_CAP,
  IJOM_SPEED_MULTIPLIER,
  IJOM_SPEED_PER_TICK_BASE,
  IJOM_SPEED_PER_TICK_VARIANCE,
  IJOM_SUPER_WAVE_SIZE_THRESHOLD,
  IJOM_VILLAGE_SPEED_SCALE,
  SHIP_MAX_HP,
  WAVE_SIMULATION_INTERVAL_MS,
} from "./constants";
import {
  getEnemySpawnPosition,
  getIjomPackSize,
  getIncomingWaveSize,
  getNextSpawnPackSize,
} from "./combat";
import { getPathCells, stepEnemy } from "./pathing";
import type { Projectile } from "./tree-combat";
import { stepTreeCombat } from "./tree-combat";
import type { BattleStatus, BoardPatch, Enemy } from "./types";
import { getUnitMaxHp, isUpgradeableTreeUnit } from "./units";
import { randomIntBetween } from "./utils";

// Internal sim parameters not exposed as user controls
const INTERNAL_WAVE_SIZE = DEFAULT_WAVE_SIZE;
const SNOW_IJOM_SPAWN_CHANCE = 0.2;
const INTERNAL_SPAWN_INTERVAL_MS = 700; // replaced 
const CASTLE_DAMAGE_BASE = 14;

export type SimControls = {
  isSwarmActive: boolean;

  // Tree combat values (direct, at level 1 — higher levels scale proportionally)
  boxerDamage: number;
  boxerHp: number;
  tennisDamage: number;
  tennisHp: number;
  quarterbackDamage: number;
  quarterbackHp: number;

  // Wall HP (direct, per wall type)
  stoneWallHp: number;
  woodWallHp: number;

  // Enemy values (direct, for a pack-size-1 unit)
  normalEnemyDamage: number;
  normalEnemyHp: number;
  snowEnemyDamage: number;
  snowEnemyHp: number;

  /** Scales enemy movement speed. */
  enemySpeedMultiplier: number;
  /** Scales enemy spawn time interval. */
  enemySpawnIntervalMs: number;
  /** Chance of spawning a snow Ijom. */
  snowIjomSpawnChance: number;
  /** Base chance of spawning a super ijom. */
  superSpawnBaseChance: number;
  /** minimum wave size threshold to allow super ijom spawning. */
  superMinWaveSize: number;
  /** Streak count used to calculate wave size. */
  streakCount: number;

  /** When true, trees skip firing if in-flight projectiles will already kill the target. */
  smartFire: boolean;
};

let enemyIdCounter = 0;
const nextEnemyId = () => `e-${++enemyIdCounter}`;

let projectileIdCounter = 0;
const nextProjectileId = () => `p-${++projectileIdCounter}`;

function makeFreshBoard(
  source: SwarmVillageBoardCell[],
): SwarmVillageBoardCell[] {
  return source.map((cell) => ({ ...cell }));
}

/**
 * Rescales every combat tree on the board so its `unitMaxHp` matches the
 * per-unit HP values, preserving each tree's health ratio. Called every tick
 * so HP inputs drive all trees live — map-loaded and user-placed alike.
 */
function rescaleTreeHps(
  board: SwarmVillageBoardCell[],
  gridCols: number,
  hpByUnit: { boxer: number; tennis: number; quarterback: number },
): { board: SwarmVillageBoardCell[]; changed: boolean } {
  let next: SwarmVillageBoardCell[] | null = null;

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < gridCols; c++) {
      const idx = boardIndex(r, c, gridCols);
      const cell = board[idx];
      if (!cell || !isUpgradeableTreeUnit(cell.unit)) continue;

      const unit = cell.unit;
      const level = cell.unitLevel || 1;
      const baseL1 = hpByUnit[unit];
      const l1Hp = getUnitMaxHp(unit, 1);
      const lNHp = getUnitMaxHp(unit, level);
      const targetMax = Math.max(1, Math.round(baseL1 * (lNHp / l1Hp)));
      if (cell.unitMaxHp === targetMax) continue;

      const ratio = cell.unitMaxHp > 0 ? cell.unitHp / cell.unitMaxHp : 1;
      const targetHp = Math.max(1, Math.round(targetMax * ratio));

      if (!next) next = [...board];
      next[idx] = { ...cell, unitMaxHp: targetMax, unitHp: targetHp };
    }
  }

  return next ? { board: next, changed: true } : { board, changed: false };
}

function rescaleWallHps(
  board: SwarmVillageBoardCell[],
  gridCols: number,
  stoneWallHp: number,
  woodWallHp: number,
): { board: SwarmVillageBoardCell[]; changed: boolean } {
  let next: SwarmVillageBoardCell[] | null = null;

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < gridCols; c++) {
      const idx = boardIndex(r, c, gridCols);
      const cell = board[idx];
      if (!cell || cell.wallHeight <= 0 || !cell.wallType) continue;

      const targetMax = Math.max(1, Math.round(cell.wallType === 'stone' ? stoneWallHp : woodWallHp));
      if (cell.wallMaxHp === targetMax) continue;

      const ratio = cell.wallMaxHp > 0 ? cell.wallHp / cell.wallMaxHp : 1;
      const targetHp = Math.max(1, Math.round(targetMax * ratio));

      if (!next) next = [...board];
      next[idx] = { ...cell, wallMaxHp: targetMax, wallHp: targetHp };
    }
  }

  return next ? { board: next, changed: true } : { board, changed: false };
}

function applyPatches(
  board: SwarmVillageBoardCell[],
  patches: BoardPatch[],
  gridCols: number,
): { board: SwarmVillageBoardCell[]; changed: boolean } {
  if (patches.length === 0) return { board, changed: false };
  const next = [...board];
  for (const { row, col, updater } of patches) {
    const idx = boardIndex(row, col, gridCols);
    const cell = next[idx];
    if (!cell) continue;
    next[idx] = updater(cell);
  }
  return { board: next, changed: true };
}

function spawnEnemy(
  enemies: Enemy[],
  gridCols: number,
  now: number,
  normalEnemyDamage: number,
  normalEnemyHp: number,
  snowEnemyDamage: number,
  snowEnemyHp: number,
  speedMultiplier: number,
  snowIjomSpawnChance: number,
  superSpawnBaseChance: number,
  superMinWaveSize: number,
  waveSize: number,
  waveSpawned: number,
): { enemy: Enemy; spawnCredits: number } | null {
  const variant: "normal" | "snow" =
    Math.random() < snowIjomSpawnChance ? "snow" : "normal";

  const remainingIjoms = waveSize - waveSpawned;
  let packSize = getNextSpawnPackSize(waveSize, enemies.length, remainingIjoms, superSpawnBaseChance, superMinWaveSize);

  let pos = getEnemySpawnPosition(enemies, gridCols, variant, packSize);

  if (!pos && packSize > 1) {
    packSize = 1;
    pos = getEnemySpawnPosition(enemies, gridCols, variant, packSize);
  }
  if (!pos) return null;

  const baseSpeed =
    (IJOM_SPEED_PER_TICK_BASE + Math.random() * IJOM_SPEED_PER_TICK_VARIANCE) *
    IJOM_VILLAGE_SPEED_SCALE *
    IJOM_SPEED_MULTIPLIER;

  const baseHp = variant === "snow" ? snowEnemyHp : normalEnemyHp;
  const maxHp = Math.round(baseHp * packSize);
  const baseDmg = variant === "snow" ? snowEnemyDamage : normalEnemyDamage;
  const damage = baseDmg * packSize;

  return {
    enemy: {
      id: nextEnemyId(),
      variant,
      packSize: packSize > 1 ? packSize : undefined,
      row: pos.row,
      col: pos.col,
      hp: maxHp,
      maxHp,
      damage,
      speedPerTick: baseSpeed * speedMultiplier,
      spawnedAt: now,
      lastAttackAt: 0,
    },
    spawnCredits: packSize,
  };
}

export function useSwarmSimulation(args: {
  initialBoard: SwarmVillageBoardCell[];
  gridCols: number;
  controls: SimControls;
}): {
  board: SwarmVillageBoardCell[];
  enemies: Enemy[];
  projectiles: Projectile[];
  shipHp: number;
  status: BattleStatus;
  waveSpawned: number;
} {
  const { initialBoard, gridCols, controls } = args;

  const boardRef = useRef<SwarmVillageBoardCell[]>(
    makeFreshBoard(initialBoard),
  );
  const initialBoardRef = useRef<SwarmVillageBoardCell[]>(initialBoard);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const lastSpawnAtRef = useRef<number>(0);
  const shipHpRef = useRef<number>(SHIP_MAX_HP);
  const statusRef = useRef<BattleStatus>("ready");
  const waveSpawnedRef = useRef<number>(0);

  const [board, setBoard] = useState<SwarmVillageBoardCell[]>(boardRef.current);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [shipHp, setShipHp] = useState(SHIP_MAX_HP);
  const [status, setStatus] = useState<BattleStatus>("ready");
  const [waveSpawned, setWaveSpawned] = useState(0);

  // Rebuild board ref when initialBoard changes (e.g. different village loaded)
  useEffect(() => {
    initialBoardRef.current = initialBoard;
    boardRef.current = makeFreshBoard(initialBoard);
    enemiesRef.current = [];
    projectilesRef.current = [];
    lastSpawnAtRef.current = 0;
    shipHpRef.current = SHIP_MAX_HP;
    statusRef.current = "ready";
    waveSpawnedRef.current = 0;

    setBoard(boardRef.current);
    setEnemies([]);
    setProjectiles([]);
    setShipHp(SHIP_MAX_HP);
    setStatus("ready");
    setWaveSpawned(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBoard, gridCols]);

  // Keep controls in a ref so the tick closure always reads fresh values
  const controlsRef = useRef(controls);
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  // Main tick loop
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const ctrl = controlsRef.current;
      const WAVE_SIZE = getIncomingWaveSize(board, ctrl.streakCount);
      let ens = enemiesRef.current;
      let hp = shipHpRef.current;
      let ws = waveSpawnedRef.current;

      // Rescale tree HPs to match the current per-unit HP values. Runs every
      // tick (including idle / pre-wave) so HP responds in real time to input
      // changes for both map-loaded and user-placed trees.
      const hpRescale = rescaleTreeHps(
        boardRef.current,
        gridCols,
        { boxer: ctrl.boxerHp, tennis: ctrl.tennisHp, quarterback: ctrl.quarterbackHp },
      );
      if (hpRescale.changed) {
        boardRef.current = hpRescale.board;
        setBoard(hpRescale.board);
      }

      const wallHpRescale = rescaleWallHps(
        boardRef.current,
        gridCols,
        ctrl.stoneWallHp,
        ctrl.woodWallHp,
      );
      if (wallHpRescale.changed) {
        boardRef.current = wallHpRescale.board;
        setBoard(wallHpRescale.board);
      }

      const currentStatus = statusRef.current;
      const isTerminal =
        currentStatus === "cleared" || currentStatus === "lost";

      if (isTerminal) {
        // When the user turns off the swarm after a terminal state, reset so a
        // new wave can start on the next isSwarmActive=true cycle.
        if (!ctrl.isSwarmActive) {
          statusRef.current = "ready";
          setStatus("ready");
          shipHpRef.current = SHIP_MAX_HP;
          setShipHp(SHIP_MAX_HP);
          waveSpawnedRef.current = 0;
          setWaveSpawned(0);
          projectilesRef.current = [];
          setProjectiles([]);
          boardRef.current = makeFreshBoard(initialBoardRef.current);
          setBoard(boardRef.current);
        }
        return;
      }

      // ── isSwarmActive off: drain enemies ─────────────────────
      if (!ctrl.isSwarmActive) {
        if (ens.length > 0 || statusRef.current === "wave") {
          ens = [];
          ws = 0;
          hp = SHIP_MAX_HP;
          projectilesRef.current = [];
          shipHpRef.current = hp;
          waveSpawnedRef.current = ws;
          enemiesRef.current = ens;
          setEnemies([]);
          setProjectiles([]);
          setShipHp(hp);
          setWaveSpawned(0);
          boardRef.current = makeFreshBoard(initialBoardRef.current);
          setBoard(boardRef.current);
          if (statusRef.current !== "ready") {
            statusRef.current = "ready";
            setStatus("ready");
          }
        }
        return;
      }

      // ── Status: start wave ────────────────────────────────────
      if (currentStatus === "ready") {
        statusRef.current = "wave";
        setStatus("wave");
        waveSpawnedRef.current = 0;
        ws = 0;
        shipHpRef.current = SHIP_MAX_HP;
        hp = SHIP_MAX_HP;
        setShipHp(hp);
      }

      // ── Spawn ─────────────────────────────────────────────────
      const compressedWaveActive = WAVE_SIZE > ctrl.superMinWaveSize;
      const canSpawnEnemyEntity =
        !compressedWaveActive || ens.length < IJOM_CONCURRENT_ENTITY_CAP;

      if (
        ws < WAVE_SIZE &&
        canSpawnEnemyEntity &&
        now - lastSpawnAtRef.current >= ctrl.enemySpawnIntervalMs
      ) {
        const result = spawnEnemy(
          ens,
          gridCols,
          now,
          ctrl.normalEnemyDamage,
          ctrl.normalEnemyHp,
          ctrl.snowEnemyDamage,
          ctrl.snowEnemyHp,
          ctrl.enemySpeedMultiplier,
          ctrl.snowIjomSpawnChance,
          ctrl.superSpawnBaseChance,
          ctrl.superMinWaveSize,
          WAVE_SIZE,
          ws,
        );
        if (result) {
          ens = [...ens, result.enemy];
          ws += result.spawnCredits;
          lastSpawnAtRef.current = now;
        }
      }

      // ── Step enemies ─────────────────────────────────────────
      const spacingSnapshot = ens.map((e) => ({ ...e }));
      const difficultyRamp = 1.0;
      const timeScale = 1.0;
      let boardChanged = false;
      let nextBoard = boardRef.current;

      const nextEns: Enemy[] = [];
      for (const enemy of ens) {
        const { next, reachedCastle, boardPatches } = stepEnemy(
          enemy,
          spacingSnapshot,
          nextBoard,
          gridCols,
          now,
          timeScale,
          difficultyRamp,
          ctrl.stoneWallHp,
          ctrl.woodWallHp,
        );
        if (boardPatches.length > 0) {
          const result = applyPatches(nextBoard, boardPatches, gridCols);
          if (result.changed) {
            nextBoard = result.board;
            boardChanged = true;
          }
        }
        if (next === null) {
          if (reachedCastle) {
            const packSize = getIjomPackSize(enemy);
            hp = Math.max(
              0,
              hp - Math.round(CASTLE_DAMAGE_BASE * (ctrl.normalEnemyDamage / IJOM_BASE_DAMAGE) * packSize),
            );
          }
        } else {
          nextEns.push(next);
        }
      }

      ens = nextEns;

      // ── Tree combat (boxer melee + tennis/QB projectiles) ─────────────────
      const {
        nextProjectiles,
        boardPatches: treePatches,
        enemyDamage,
      } = stepTreeCombat({
        board: nextBoard,
        gridCols,
        enemies: ens,
        projectiles: projectilesRef.current,
        now,
        treeDamages: { boxer: ctrl.boxerDamage, tennis: ctrl.tennisDamage, quarterback: ctrl.quarterbackDamage },
        nextProjectileId,
        smartFire: ctrl.smartFire,
      });

      if (treePatches.length > 0) {
        const result = applyPatches(nextBoard, treePatches, gridCols);
        if (result.changed) {
          nextBoard = result.board;
          boardChanged = true;
        }
      }

      if (enemyDamage.size > 0) {
        ens = ens
          .map((e) => {
            const dmg = enemyDamage.get(e.id);
            return dmg != null ? { ...e, hp: e.hp - dmg } : e;
          })
          .filter((e) => e.hp > 0);
      }

      projectilesRef.current = nextProjectiles;
      setProjectiles([...nextProjectiles]);

      if (boardChanged) {
        boardRef.current = nextBoard;
        setBoard(nextBoard);
      }

      enemiesRef.current = ens;
      waveSpawnedRef.current = ws;
      shipHpRef.current = hp;
      setEnemies([...ens]);
      setShipHp(hp);
      setWaveSpawned(ws);

      // ── Win/loss checks ───────────────────────────────────────
      if (hp <= 0 && statusRef.current === "wave") {
        statusRef.current = "lost";
        setStatus("lost");
        enemiesRef.current = [];
        projectilesRef.current = [];
        setEnemies([]);
        setProjectiles([]);
        boardRef.current = makeFreshBoard(initialBoardRef.current);
        setBoard(boardRef.current);
        return;
      }
      if (
        ws >= WAVE_SIZE &&
        ens.length === 0 &&
        statusRef.current === "wave"
      ) {
        statusRef.current = "cleared";
        setStatus("cleared");
        projectilesRef.current = [];
        setProjectiles([]);
        boardRef.current = makeFreshBoard(initialBoardRef.current);
        setBoard(boardRef.current);
        return;
      }
    }, WAVE_SIMULATION_INTERVAL_MS);

    return () => clearInterval(id);
    // Only re-create the interval if gridCols changes (board ref is rebuilt via
    // the other useEffect above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridCols]);

  return {
    board,
    enemies,
    projectiles,
    shipHp,
    status,
    waveSpawned,
  };
}
