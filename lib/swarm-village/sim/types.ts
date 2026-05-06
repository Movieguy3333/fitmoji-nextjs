import type { SwarmVillageBoardCell } from '@/types/swarm-village';

export type { SwarmVillageBoardCell };

export type BattleStatus = 'ready' | 'wave' | 'cleared' | 'lost';

export type Enemy = {
  id: string;
  variant: 'normal' | 'snow';
  row: number;
  col: number;
  hp: number;
  maxHp: number;
  damage: number;
  speedPerTick: number;
  spawnedAt: number;
  lastAttackAt: number;
};

export type CrazyCapyState = {
  row: number;
  col: number;
  targetRow: number;
  targetCol: number;
  activeUntil: number;
  durationMs: number;
  spawnedAt: number;
  facingScaleX: 1 | -1;
};

export type CrazyCapyKnockoutEffect = {
  id: string;
  variant: Enemy['variant'];
  row: number;
  col: number;
  startedAt: number;
  directionX: 1 | -1;
  rotationDirection: 1 | -1;
};

export type Walker = {
  id: string;
  row: number;
  col: number;
  targetRow: number;
  targetCol: number;
  facingScaleX: 1 | -1;
  speedPerTick: number;
  pauseUntil: number;
};

export type BoardPatch = {
  row: number;
  col: number;
  updater: (cell: SwarmVillageBoardCell) => SwarmVillageBoardCell;
};
