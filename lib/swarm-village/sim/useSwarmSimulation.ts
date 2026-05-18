"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { SwarmVillageBoardCell } from "@/types/swarm-village";

import { boardIndex } from "./board";
import {
  DEFAULT_WAVE_SIZE,
  IJOM_BASE_DAMAGE,
  IJOM_SPEED_MULTIPLIER,
  IJOM_SPEED_PER_TICK_BASE,
  IJOM_SPEED_PER_TICK_VARIANCE,
  IJOM_VILLAGE_SPEED_SCALE,
  SHIP_MAX_HP,
  WAVE_SIMULATION_INTERVAL_MS,
} from "./constants";
import { getEnemySpawnPosition } from "./combat";
import { getPathCells, stepEnemy } from "./pathing";
import type { Projectile } from "./tree-combat";
import { stepTreeCombat } from "./tree-combat";
import type { BattleStatus, BoardPatch, Enemy } from "./types";
import { randomIntBetween } from "./utils";

// Internal sim parameters not exposed as user controls
const INTERNAL_WAVE_SIZE = DEFAULT_WAVE_SIZE;
const SNOW_IJOM_SPAWN_CHANCE = 0.2;
const INTERNAL_SPAWN_INTERVAL_MS = 700; // replaced 
const CASTLE_DAMAGE_BASE = 14;

export type SimControls = {
  isSwarmActive: boolean;
  /** Scales attack damage for enemies */
  ijomDamageMultiplier: number;
  /** Scales max HP for enemies*/
  ijomHpMultiplier: number;
  /** Scales enemy movement speed. */
  enemySpeedMultiplier: number;
  /** Scales enemy spawn time interval. */
  enemySpawnIntervalMs: number;
  
  /** */
  waveSize: number;

  /*not used*/
  /** Scales attack damage for combat trees */
  treeDamageMultiplier: number;
  /** Scales max HP for combative trees. */
  treeHpMultiplier: number;
  
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
  ijomDamageMultiplier: number,
  ijomHpMultiplier: number,
  speedMultiplier: number,
): Enemy | null {
  const variant: "normal" | "snow" =
    Math.random() < SNOW_IJOM_SPAWN_CHANCE ? "snow" : "normal";
  const pos = getEnemySpawnPosition(enemies, gridCols, variant);
  if (!pos) return null;

  const baseSpeed =
    (IJOM_SPEED_PER_TICK_BASE + Math.random() * IJOM_SPEED_PER_TICK_VARIANCE) *
    IJOM_VILLAGE_SPEED_SCALE *
    IJOM_SPEED_MULTIPLIER;

  const baseMaxHp = variant === "snow" ? 28 : 18;
  const maxHp = Math.round(baseMaxHp * ijomHpMultiplier);

  console.log("damage", IJOM_BASE_DAMAGE * ijomDamageMultiplier);
  console.log("hp", maxHp);

  return {
    id: nextEnemyId(),
    variant: variant,
    row: pos.row,
    col: pos.col,
    hp: maxHp,
    maxHp,
    damage: IJOM_BASE_DAMAGE * ijomDamageMultiplier,
    speedPerTick: baseSpeed * speedMultiplier,
    spawnedAt: now,
    lastAttackAt: 0,
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
      let ens = enemiesRef.current;
      let hp = shipHpRef.current;
      let ws = waveSpawnedRef.current;

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
      if (
        ws < ctrl.waveSize &&
        ens.length < ctrl.waveSize &&
        now - lastSpawnAtRef.current >= ctrl.enemySpawnIntervalMs
      ) {
        const enemy = spawnEnemy(
          ens,
          gridCols,
          now,
          ctrl.ijomDamageMultiplier,
          ctrl.ijomHpMultiplier,
          ctrl.enemySpeedMultiplier,
        );
        if (enemy) {
          ens = [...ens, enemy];
          ws += 1;
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
            hp = Math.max(
              0,
              hp - Math.round(CASTLE_DAMAGE_BASE * ctrl.ijomDamageMultiplier),
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
        damageMultiplier: ctrl.ijomDamageMultiplier,
        nextProjectileId,
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
        ws >= ctrl.waveSize &&
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
  };
}
