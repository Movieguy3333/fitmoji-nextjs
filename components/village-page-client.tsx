'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';

import { SwarmSimControls } from '@/components/swarm-sim-controls';
import { SwarmVillageLiveScene } from '@/components/swarm-village-live-scene';
import { SwarmPlacementToolbar } from '@/components/swarm-placement-toolbar';
import type { PlacementTool } from '@/components/swarm-placement-toolbar';
import type { SimControls } from '@/lib/swarm-village/sim/useSwarmSimulation';
import type { BattleStatus } from '@/lib/swarm-village/sim/types';
import { isCastleCell, isHomeReservedCell, DEFAULT_WAVE_SIZE } from '@/lib/swarm-village/sim/constants';
import { getUnitMaxHp, getWallMaxHp } from '@/lib/swarm-village/sim/units';
import type { SwarmVillageBoardCell, SwarmVillageMapSnapshot } from '@/types/swarm-village';

type Props = {
  map: SwarmVillageMapSnapshot;
  playerAvatarUrl?: string | null;
  playerName?: string | null;
  villageName: string;
  tagline?: string | null;
};

const DEFAULT_CONTROLS: SimControls = {
  isSwarmActive: false,
  ijomDamageMultiplier: 1.0,
  ijomHpMultiplier: 1.0,
  enemySpeedMultiplier: 1.0,
  enemySpawnIntervalMs: 700,
  snowIjomSpawnChance: .2,
  streakCount: 0,
  treeDamageMultiplier: 1.0,
  treeHpMultiplier: 1.0,
};

export function VillagePageClient({
  map,
  playerAvatarUrl,
  playerName,
  villageName,
  tagline,
}: Props) {
  const [controls, setControls] = useState<SimControls>(DEFAULT_CONTROLS);
  const [swarmStatus, setSwarmStatus] = useState<BattleStatus>('ready');
  const [tool, setTool] = useState<PlacementTool>(null);
  const [placedKeys, setPlacedKeys] = useState<Set<string>>(() => new Set());
  const [editedBoard, setEditedBoard] = useState<SwarmVillageBoardCell[]>(
    () => map.board.map((c) => ({ ...c })),
  );

  const swarmLocked = swarmStatus === 'wave';

  function handleSwarmToggle() {
    setControls((prev) => ({ ...prev, isSwarmActive: !prev.isSwarmActive }));
  }

  function handleSwarmStatusChange(status: BattleStatus) {
    setSwarmStatus(status);
    if (status === 'cleared' || status === 'lost') {
      setControls((prev) =>
        prev.isSwarmActive ? { ...prev, isSwarmActive: false } : prev,
      );
    }
  }

  const handleTilePlace = useCallback(
    (row: number, col: number) => {
      if (swarmStatus !== 'ready' || !tool) return;

      if (isCastleCell(row, col) || isHomeReservedCell(row, col)) return;

      const idx = row * map.gridCols + col;
      const origCell = map.board[idx];
      if (!origCell || origCell.foundation === false) return;

      const key = `${row}-${col}`;

      if (tool === 'delete') {
        if (!placedKeys.has(key)) return;
        setEditedBoard((prev) => {
          const next = [...prev];
          next[idx] = { ...map.board[idx]! };
          return next;
        });
        setPlacedKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        return;
      }

      // Unit/wall placement: original cell must be empty
      if (origCell.unit !== null || origCell.wallHeight > 0) return;

      const isUnitTool = tool !== 'wall_stone' && tool !== 'wall_wood';
      const currentCell = editedBoard[idx];

      // Block unit placement on top of a player-placed wall
      if (isUnitTool && currentCell && currentCell.wallHeight > 0) return;
      // Block wall placement on top of a player-placed unit
      if (!isUnitTool && currentCell && currentCell.unit !== null) return;

      setEditedBoard((prev) => {
        const next = [...prev];
        const cell = prev[idx]!;
        if (tool === 'wall_stone' || tool === 'wall_wood') {
          const wallType = tool === 'wall_stone' ? 'stone' : 'wood';
          const wallMax = getWallMaxHp(wallType);
          next[idx] = {
            ...cell,
            wallType,
            wallHeight: 1,
            wallHp: wallMax,
            wallRotation: 0,
          };
        } else {
          const unit = tool as 'boxer' | 'tennis' | 'quarterback';
          const maxHp = getUnitMaxHp(unit, 1);
          next[idx] = {
            ...cell,
            unit,
            unitLevel: 1,
            unitHp: maxHp,
            unitMaxHp: maxHp,
            unitLastAttackAt: 0,
            unitFacingScaleX: 1,
            unitRotation: 0,
            unitRewardBaselineCompletionCount: null,
          };
        }
        return next;
      });

      setPlacedKeys((prev) => new Set(prev).add(key));
    },
    [swarmStatus, tool, placedKeys, map.board, map.gridCols, editedBoard],
  );

  function handleResetPlacements() {
    setEditedBoard(map.board.map((c) => ({ ...c })));
    setPlacedKeys(new Set());
  }

  const hoverTintForTile = useCallback(
    (row: number, col: number): 'legal' | 'illegal' | null => {
      if (!tool) return null;
      if (swarmStatus !== 'ready') return null;

      if (isCastleCell(row, col) || isHomeReservedCell(row, col)) return 'illegal';

      const origCell = map.board[row * map.gridCols + col];
      if (!origCell || origCell.foundation === false) return 'illegal';

      if (tool === 'delete') {
        return placedKeys.has(`${row}-${col}`) ? 'legal' : 'illegal';
      }

      if (origCell.unit !== null || origCell.wallHeight > 0) return 'illegal';

      const isUnitTool = tool !== 'wall_stone' && tool !== 'wall_wood';
      const currentCell = editedBoard[row * map.gridCols + col];

      if (isUnitTool && currentCell && currentCell.wallHeight > 0) return 'illegal';
      if (!isUnitTool && currentCell && currentCell.unit !== null) return 'illegal';

      return 'legal';
    },
    [tool, swarmStatus, placedKeys, map.board, map.gridCols, editedBoard],
  );

  return (
    <>
      <SwarmVillageLiveScene
        map={{ ...map, board: editedBoard }}
        playerAvatarUrl={playerAvatarUrl}
        playerName={playerName}
        controls={controls}
        className="absolute inset-0"
        onStatusChange={handleSwarmStatusChange}
        onTileClick={handleTilePlace}
        hoverTintForTile={hoverTintForTile}
      />

      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#081018]/42 via-transparent to-[#081018]/16" />

      <div className="absolute left-5 top-5 z-[900] sm:left-8 sm:top-8">
        <Link
          href="/"
          className="rounded-lg border border-white/45 bg-white/86 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#264653] shadow-[0_14px_32px_rgba(8,16,24,0.18)] backdrop-blur-md transition hover:bg-white"
        >
          Back to gallery
        </Link>
      </div>

      <SwarmSimControls
        value={controls}
        onChange={setControls}
        swarmLocked={swarmLocked}
      />

      <SwarmPlacementToolbar
        tool={tool}
        onToolChange={setTool}
        onReset={handleResetPlacements}
        disabled={swarmStatus !== 'ready'}
      />

      <section className="absolute inset-x-4 bottom-4 z-[900] sm:inset-x-8 sm:bottom-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-lg border border-white/45 bg-[#fffefa]/88 p-4 shadow-[0_24px_70px_rgba(8,16,24,0.22)] backdrop-blur-md sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#e76f51]">
              Reconstructed Village
            </p>
            <h1 className="mt-2 truncate text-3xl font-black leading-none text-[#231f20] sm:text-4xl">
              {villageName}
            </h1>
            <p className="mt-2 truncate text-base font-black text-[#2a9d8f]">
              {playerName ?? map.displayName ?? 'Fitmoji player'}
            </p>
            <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-[#5f574b]">
              {tagline ??
                'Use the gear icon to tune the simulation, then launch a swarm.'}
            </p>
          </div>

          {/* Swarm launch / stop button */}
          <button
            type="button"
            onClick={handleSwarmToggle}
            className={`flex-shrink-0 rounded-lg px-5 py-3 text-[0.75rem] font-black uppercase tracking-[0.18em] shadow-[0_8px_20px_rgba(8,16,24,0.2)] transition ${
              controls.isSwarmActive
                ? 'bg-[#e76f51] text-white hover:bg-[#d4613f]'
                : 'bg-[#2a9d8f] text-white hover:bg-[#248a7d]'
            }`}
          >
            {controls.isSwarmActive ? 'Stop Swarm' : 'Launch Swarm'}
          </button>

          <dl className="grid grid-cols-2 gap-2 text-xs sm:w-64">
            <div className="rounded-md border border-[#2f2a1f]/10 bg-white/60 p-3">
              <dt className="font-black uppercase tracking-[0.16em] text-[#7b6f60]">
                Board ID
              </dt>
              <dd className="mt-1 break-all font-black text-[#264653]">
                {map.id}
              </dd>
            </div>
            <div className="rounded-md border border-[#2f2a1f]/10 bg-white/60 p-3">
              <dt className="font-black uppercase tracking-[0.16em] text-[#7b6f60]">
                Board
              </dt>
              <dd className="mt-1 font-black text-[#264653]">
                {map.gridCols} × 20
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </>
  );
}
