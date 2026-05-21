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
  /** Damage this enemy deals per attack against trees/units. Baked in at
   * spawn time as IJOM_BASE_DAMAGE * ijomDamageMultiplier. */
  damage: number;
  /** Damage this enemy deals per attack against walls/fences. Baked in at
   * spawn time as the variant's base wall damage * ijomDamageMultiplier. */
  wallDamage: number;
  speedPerTick: number;
  spawnedAt: number;
  lastAttackAt: number;
};


export type BoardPatch = {
  row: number;
  col: number;
  updater: (cell: SwarmVillageBoardCell) => SwarmVillageBoardCell;
};
