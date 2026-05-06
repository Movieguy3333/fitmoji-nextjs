'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { SwarmVillageBoardCell } from '@/types/swarm-village';

import { boardIndex } from './board';
import {
  CRAZY_CAPY_DAMAGE,
  CRAZY_CAPY_DURATION_PER_STATUE_MS,
  CRAZY_CAPY_HIT_COOLDOWN_MS,
  CRAZY_CAPY_HIT_RADIUS,
  GRID_ROWS,
  IJOM_BASE_DAMAGE,
  IJOM_SPEED_MULTIPLIER,
  IJOM_SPEED_PER_TICK_BASE,
  IJOM_SPEED_PER_TICK_VARIANCE,
  IJOM_VILLAGE_DIFFICULTY_RAMP_DIVISOR,
  IJOM_VILLAGE_SPEED_SCALE,
  SHIP_MAX_HP,
  VILLAGE_AVATAR_IDLE_MAX_DELAY_MS,
  VILLAGE_AVATAR_IDLE_MIN_DELAY_MS,
  VILLAGE_AVATAR_WALK_SPEED_PER_TICK,
  WAVE_SIMULATION_INTERVAL_MS,
} from './constants';
import {
  createCrazyCapyKnockoutEffect,
  getRandomCrazyCapyTarget,
  stepCrazyCapy,
} from './crazyCapy';
import { getEnemySpawnPosition } from './combat';
import { buildPathKeySet, getPathCells, stepEnemy, stepWalker } from './pathing';
import type {
  BattleStatus,
  BoardPatch,
  CrazyCapyKnockoutEffect,
  CrazyCapyState,
  Enemy,
  Walker,
} from './types';
import { randomIntBetween } from './utils';

export type SimControls = {
  isSwarmActive: boolean;
  waveSize: number;
  enemyKind: 'normal' | 'snow';
  spawnIntervalMs: number;
  crazyCapyEnabled: boolean;
  walkerCount: number;
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
  variant: 'normal' | 'snow',
  now: number,
): Enemy | null {
  const pos = getEnemySpawnPosition(enemies, gridCols, variant);
  if (!pos) return null;

  const speed =
    (IJOM_SPEED_PER_TICK_BASE +
      Math.random() * IJOM_SPEED_PER_TICK_VARIANCE) *
    IJOM_VILLAGE_SPEED_SCALE *
    IJOM_SPEED_MULTIPLIER;

  const maxHp = variant === 'snow' ? 28 : 18;

  return {
    id: nextEnemyId(),
    variant,
    row: pos.row,
    col: pos.col,
    hp: maxHp,
    maxHp,
    damage: IJOM_BASE_DAMAGE,
    speedPerTick: speed,
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
  const crazyCapyRef = useRef<CrazyCapyState | null>(null);
  const crazyCapyHitAtRef = useRef<Record<string, number>>({});
  const lastSpawnAtRef = useRef<number>(0);
  const shipHpRef = useRef<number>(SHIP_MAX_HP);
  const statusRef = useRef<BattleStatus>('ready');
  const waveSpawnedRef = useRef<number>(0);

  const [board, setBoard] = useState<SwarmVillageBoardCell[]>(boardRef.current);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [crazyCapy, setCrazyCapy] = useState<CrazyCapyState | null>(null);
  const [crazyCapyKnockoutEffects, setCrazyCapyKnockoutEffects] = useState<
    CrazyCapyKnockoutEffect[]
  >([]);
  const [walkers, setWalkers] = useState<Walker[]>([]);
  const [shipHp, setShipHp] = useState(SHIP_MAX_HP);
  const [status, setStatus] = useState<BattleStatus>('ready');

  // Rebuild board ref when initialBoard changes (e.g. different village loaded)
  useEffect(() => {
    boardRef.current = makeFreshBoard(initialBoard);
    enemiesRef.current = [];
    walkersRef.current = [];
    crazyCapyRef.current = null;
    crazyCapyHitAtRef.current = {};
    lastSpawnAtRef.current = 0;
    shipHpRef.current = SHIP_MAX_HP;
    statusRef.current = 'ready';
    waveSpawnedRef.current = 0;

    setBoard(boardRef.current);
    setEnemies([]);
    setCrazyCapy(null);
    setCrazyCapyKnockoutEffects([]);
    setWalkers([]);
    setShipHp(SHIP_MAX_HP);
    setStatus('ready');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBoard, gridCols]);

  // Sync walkers with walkerCount control
  const walkerCountRef = useRef(controls.walkerCount);
  useEffect(() => {
    walkerCountRef.current = controls.walkerCount;
  }, [controls.walkerCount]);

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
      if (isTerminal) return;

      // ── isSwarmActive off: drain enemies ─────────────────────
      if (!ctrl.isSwarmActive) {
        if (ens.length > 0 || crazyCapyRef.current !== null) {
          ens = [];
          crazyCapyRef.current = null;
          ws = 0;
          hp = SHIP_MAX_HP;
          shipHpRef.current = hp;
          waveSpawnedRef.current = ws;
          enemiesRef.current = ens;
          setEnemies([]);
          setCrazyCapy(null);
          setShipHp(hp);
          if (statusRef.current !== 'ready') {
            statusRef.current = 'ready';
            setStatus('ready');
          }
        }
        // Walkers still tick when swarm is off
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
        ws < ctrl.waveSize &&
        ens.length < ctrl.waveSize &&
        now - lastSpawnAtRef.current >= ctrl.spawnIntervalMs
      ) {
        const enemy = spawnEnemy(ens, gridCols, ctrl.enemyKind, now);
        if (enemy) {
          ens = [...ens, enemy];
          ws += 1;
          lastSpawnAtRef.current = now;
        }
      }

      // ── Crazy Capy ───────────────────────────────────────────
      let currentCapy = crazyCapyRef.current;
      if (!ctrl.crazyCapyEnabled && currentCapy) {
        currentCapy = null;
        crazyCapyRef.current = null;
        setCrazyCapy(null);
      }
      if (ctrl.crazyCapyEnabled && !currentCapy) {
        const target = getRandomCrazyCapyTarget(gridCols, boardRef.current);
        const durationMs =
          CRAZY_CAPY_DURATION_PER_STATUE_MS *
          Math.max(
            1,
            boardRef.current.filter((c) => c.unit === 'capybara_statue').length,
          );
        currentCapy = {
          row: GRID_ROWS - 2,
          col: Math.floor(gridCols / 2),
          targetRow: target.row,
          targetCol: target.col,
          activeUntil: now + durationMs,
          durationMs,
          spawnedAt: now,
          facingScaleX: 1,
        };
        crazyCapyRef.current = currentCapy;
      }

      const crazyCapyKoIds = new Set<string>();
      const newKoEffects: CrazyCapyKnockoutEffect[] = [];

      if (currentCapy) {
        const nextCapy = stepCrazyCapy(
          currentCapy,
          gridCols,
          now,
          boardRef.current,
        );
        if (!nextCapy) {
          crazyCapyRef.current = null;
          currentCapy = null;
          setCrazyCapy(null);
          if (ctrl.crazyCapyEnabled) {
            // Re-spawn after expiry when still enabled
            const target = getRandomCrazyCapyTarget(
              gridCols,
              boardRef.current,
            );
            const durationMs =
              CRAZY_CAPY_DURATION_PER_STATUE_MS *
              Math.max(
                1,
                boardRef.current.filter(
                  (c) => c.unit === 'capybara_statue',
                ).length,
              );
            const respawned: CrazyCapyState = {
              row: GRID_ROWS - 2,
              col: Math.floor(gridCols / 2),
              targetRow: target.row,
              targetCol: target.col,
              activeUntil: now + durationMs,
              durationMs,
              spawnedAt: now,
              facingScaleX: 1,
            };
            crazyCapyRef.current = respawned;
            currentCapy = respawned;
            setCrazyCapy(respawned);
          }
        } else {
          crazyCapyRef.current = nextCapy;
          currentCapy = nextCapy;
          setCrazyCapy(nextCapy);

          const hitAt = crazyCapyHitAtRef.current;
          for (const enemy of ens) {
            if (
              Math.hypot(
                enemy.row - nextCapy.row,
                enemy.col - nextCapy.col,
              ) > CRAZY_CAPY_HIT_RADIUS
            )
              continue;
            const lastHit = hitAt[enemy.id] ?? 0;
            if (now - lastHit < CRAZY_CAPY_HIT_COOLDOWN_MS) continue;
            enemy.hp -= CRAZY_CAPY_DAMAGE;
            if (enemy.hp <= 0) crazyCapyKoIds.add(enemy.id);
            hitAt[enemy.id] = now;
          }
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
        if (crazyCapyKoIds.has(enemy.id)) {
          newKoEffects.push(
            createCrazyCapyKnockoutEffect(enemy, currentCapy, now),
          );
          continue;
        }
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
            hp = Math.max(0, hp - 14);
          }
        } else {
          nextEns.push(next);
        }
      }

      ens = nextEns;

      if (newKoEffects.length > 0) {
        setCrazyCapyKnockoutEffects((prev) => [
          ...prev.filter(
            (e) => now - e.startedAt < 1200,
          ),
          ...newKoEffects,
        ]);
      }

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
        return;
      }
      if (
        ws >= ctrl.waveSize &&
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
      ctrl: SimControls,
    ) => {
      const pathCells = getPathCells(currentBoard, gridCols);
      let walkerList = walkersRef.current;

      while (walkerList.length < ctrl.walkerCount && pathCells.length >= 2) {
        const w = spawnWalker(pathCells);
        if (w) walkerList = [...walkerList, w];
        else break;
      }
      if (walkerList.length > ctrl.walkerCount) {
        walkerList = walkerList.slice(0, ctrl.walkerCount);
      }

      if (pathCells.length > 0) {
        walkerList = walkerList.map((w) =>
          stepWalker(w, now, pathCells),
        );
      }

      walkersRef.current = walkerList;
      setWalkers([...walkerList]);
    },
    [gridCols],
  );

  return {
    board,
    enemies,
    crazyCapy,
    crazyCapyKnockoutEffects,
    walkers,
    shipHp,
    status,
  };
}
