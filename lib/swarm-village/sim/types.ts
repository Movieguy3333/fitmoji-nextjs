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


export type BoardPatch = {
  row: number;
  col: number;
  updater: (cell: SwarmVillageBoardCell) => SwarmVillageBoardCell;
};
