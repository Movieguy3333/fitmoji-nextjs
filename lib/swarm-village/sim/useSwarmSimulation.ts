'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { SwarmVillageBoardCell } from '@/types/swarm-village';

import { boardIndex } from './board';
import {
  DEFAULT_WAVE_SIZE,
  IJOM_BASE_DAMAGE,
  IJOM_SPEED_MULTIPLIER,
  IJOM_SPEED_PER_TICK_BASE,
  IJOM_SPEED_PER_TICK_VARIANCE,
  IJOM_VILLAGE_SPEED_SCALE,
  SHIP_MAX_HP,
  VILLAGE_AVATAR_IDLE_MAX_DELAY_MS,
  VILLAGE_AVATAR_IDLE_MIN_DELAY_MS,
  VILLAGE_AVATAR_WALK_SPEED_PER_TICK,
  WAVE_SIMULATION_INTERVAL_MS,
} from './constants';
import { getEnemySpawnPosition } from './combat';
import { getPathCells, stepEnemy, stepWalker } from './pathing';
import type {
  BattleStatus,
  BoardPatch,
  CrazyCapyKnockoutEffect,
  CrazyCapyState,
  Enemy,
  Walker,
} from './types';
import { randomIntBetween } from './utils';

// Internal sim parameters not exposed as user controls
const INTERNAL_WAVE_SIZE = DEFAULT_WAVE_SIZE;
const SNOW_IJOM_SPAWN_CHANCE = 0.2;
const INTERNAL_SPAWN_INTERVAL_MS = 700;
const INTERNAL_WALKER_COUNT = 4;
const CASTLE_DAMAGE_BASE = 14;

export type SimControls = {
  isSwarmActive: boolean;
  /** Scales attack damage for both enemies (vs units/castle) and combative trees. */
  damageMultiplier: number;
  /** Scales max HP for both enemies and combative tree units. */
  hpMultiplier: number;
  /** Scales enemy movement speed. */
  enemySpeedMultiplier: number;
};

let enemyIdCounter = 0;
const nextEnemyId = () => `e-${++enemyIdCounter}`;
let walkerIdCounter = 0;
const nextWalkerId = () => `w-${++walkerIdCounter}`;

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

function spawnWalker(
  pathCells: Array<{ row: number; col: number }>,
): Walker | null {
  if (pathCells.length < 2) return null;
  const start = pathCells[Math.floor(Math.random() * pathCells.length)]!;
  const target = pathCells[Math.floor(Math.random() * pathCells.length)]!;
  return {
    id: nextWalkerId(),
    row: start.row,
    col: start.col,
    targetRow: target.row,
    targetCol: target.col,
    facingScaleX: 1,
    speedPerTick: VILLAGE_AVATAR_WALK_SPEED_PER_TICK,
    pauseUntil:
      Date.now() +
      randomIntBetween(
        VILLAGE_AVATAR_IDLE_MIN_DELAY_MS,
        VILLAGE_AVATAR_IDLE_MAX_DELAY_MS,
      ),
  };
}

function spawnEnemy(
  enemies: Enemy[],
  gridCols: number,
  now: number,
  damageMultiplier: number,
  hpMultiplier: number,
  speedMultiplier: number,
): Enemy | null {
  const variant: 'normal' | 'snow' =
    Math.random() < SNOW_IJOM_SPAWN_CHANCE ? 'snow' : 'normal';
  const pos = getEnemySpawnPosition(enemies, gridCols, variant);
  if (!pos) return null;

  const baseSpeed =
    (IJOM_SPEED_PER_TICK_BASE + Math.random() * IJOM_SPEED_PER_TICK_VARIANCE) *
    IJOM_VILLAGE_SPEED_SCALE *
    IJOM_SPEED_MULTIPLIER;

  const baseMaxHp = variant === 'snow' ? 28 : 18;
  const maxHp = Math.round(baseMaxHp * hpMultiplier);

  return {
    id: nextEnemyId(),
    variant: variant,
    row: pos.row,
    col: pos.col,
    hp: maxHp,
    maxHp,
    // Dividing by hpMultiplier makes trees effectively tankier relative to
    // enemy damage, which is what "HP multiplier for trees" means in practice.
    damage: (IJOM_BASE_DAMAGE * damageMultiplier) / hpMultiplier,
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
  crazyCapy: CrazyCapyState | null;
  crazyCapyKnockoutEffects: CrazyCapyKnockoutEffect[];
  walkers: Walker[];
  shipHp: number;
  status: BattleStatus;
} {
  const { initialBoard, gridCols, controls } = args;

  const boardRef = useRef<SwarmVillageBoardCell[]>(
    makeFreshBoard(initialBoard),
  );
  const enemiesRef = useRef<Enemy[]>([]);
  const walkersRef = useRef<Walker[]>([]);
  const lastSpawnAtRef = useRef<number>(0);
  const shipHpRef = useRef<number>(SHIP_MAX_HP);
  const statusRef = useRef<BattleStatus>('ready');
  const waveSpawnedRef = useRef<number>(0);

  const [board, setBoard] = useState<SwarmVillageBoardCell[]>(boardRef.current);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [walkers, setWalkers] = useState<Walker[]>([]);
  const [shipHp, setShipHp] = useState(SHIP_MAX_HP);
  const [status, setStatus] = useState<BattleStatus>('ready');

  // Rebuild board ref when initialBoard changes (e.g. different village loaded)
  useEffect(() => {
    boardRef.current = makeFreshBoard(initialBoard);
    enemiesRef.current = [];
    walkersRef.current = [];
    lastSpawnAtRef.current = 0;
    shipHpRef.current = SHIP_MAX_HP;
    statusRef.current = 'ready';
    waveSpawnedRef.current = 0;

    setBoard(boardRef.current);
    setEnemies([]);
    setWalkers([]);
    setShipHp(SHIP_MAX_HP);
    setStatus('ready');
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
        currentStatus === 'cleared' || currentStatus === 'lost';

      if (isTerminal) {
        // When the user turns off the swarm after a terminal state, reset so a
        // new wave can start on the next isSwarmActive=true cycle.
        if (!ctrl.isSwarmActive) {
          statusRef.current = 'ready';
          setStatus('ready');
          shipHpRef.current = SHIP_MAX_HP;
          setShipHp(SHIP_MAX_HP);
          waveSpawnedRef.current = 0;
        }
        stepWalkers(now, boardRef.current, ctrl);
        return;
      }

      // ── isSwarmActive off: drain enemies ─────────────────────
      if (!ctrl.isSwarmActive) {
        if (ens.length > 0) {
          ens = [];
          ws = 0;
          hp = SHIP_MAX_HP;
          shipHpRef.current = hp;
          waveSpawnedRef.current = ws;
          enemiesRef.current = ens;
          setEnemies([]);
          setShipHp(hp);
          if (statusRef.current !== 'ready') {
            statusRef.current = 'ready';
            setStatus('ready');
          }
        }
        stepWalkers(now, boardRef.current, ctrl);
        return;
      }

      // ── Status: start wave ────────────────────────────────────
      if (currentStatus === 'ready') {
        statusRef.current = 'wave';
        setStatus('wave');
        waveSpawnedRef.current = 0;
        ws = 0;
        shipHpRef.current = SHIP_MAX_HP;
        hp = SHIP_MAX_HP;
        setShipHp(hp);
      }

      // ── Spawn ─────────────────────────────────────────────────
      if (
        ws < INTERNAL_WAVE_SIZE &&
        ens.length < INTERNAL_WAVE_SIZE &&
        now - lastSpawnAtRef.current >= INTERNAL_SPAWN_INTERVAL_MS
      ) {
        const enemy = spawnEnemy(
          ens,
          gridCols,
          now,
          ctrl.damageMultiplier,
          ctrl.hpMultiplier,
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
              hp - Math.round(CASTLE_DAMAGE_BASE * ctrl.damageMultiplier),
            );
          }
        } else {
          nextEns.push(next);
        }
      }

      ens = nextEns;

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
      if (hp <= 0 && statusRef.current === 'wave') {
        statusRef.current = 'lost';
        setStatus('lost');
        // Clear all enemies from the board immediately
        enemiesRef.current = [];
        setEnemies([]);
        return;
      }
      if (
        ws >= INTERNAL_WAVE_SIZE &&
        ens.length === 0 &&
        statusRef.current === 'wave'
      ) {
        statusRef.current = 'cleared';
        setStatus('cleared');
        return;
      }

      // ── Walkers ───────────────────────────────────────────────
      stepWalkers(now, nextBoard, ctrl);
    }, WAVE_SIMULATION_INTERVAL_MS);

    return () => clearInterval(id);
    // Only re-create the interval if gridCols changes (board ref is rebuilt via
    // the other useEffect above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridCols]);

  const stepWalkers = useCallback(
    (
      now: number,
      currentBoard: SwarmVillageBoardCell[],
      _ctrl: SimControls,
    ) => {
      const pathCells = getPathCells(currentBoard, gridCols);
      let walkerList = walkersRef.current;

      while (walkerList.length < INTERNAL_WALKER_COUNT && pathCells.length >= 2) {
        const w = spawnWalker(pathCells);
        if (w) walkerList = [...walkerList, w];
        else break;
      }
      if (walkerList.length > INTERNAL_WALKER_COUNT) {
        walkerList = walkerList.slice(0, INTERNAL_WALKER_COUNT);
      }

      if (pathCells.length > 0) {
        walkerList = walkerList.map((w) => stepWalker(w, now, pathCells));
      }

      walkersRef.current = walkerList;
      setWalkers([...walkerList]);
    },
    [gridCols],
  );

  return {
    board,
    enemies,
    crazyCapy: null,
    crazyCapyKnockoutEffects: [],
    walkers,
    shipHp,
    status,
  };
}
