"use client";

import Link from "next/link";
import { useCallback, useState, useRef } from "react";

import { SwarmSimControls } from "@/components/swarm-sim-controls";
import { SwarmVillageLiveScene } from "@/components/swarm-village-live-scene";
import type { SimStats } from "@/components/swarm-village-live-scene";
import { SwarmPlacementToolbar } from "@/components/swarm-placement-toolbar";
import type { PlacementTool } from "@/components/swarm-placement-toolbar";
import type { SimControls } from "@/lib/swarm-village/sim/useSwarmSimulation";
import type { BattleStatus } from "@/lib/swarm-village/sim/types";
import {
  isCastleCell,
  isHomeReservedCell,
  DEFAULT_WAVE_SIZE,
  SHIP_MAX_HP,
  NORMAL_IJOM_MAX_HP,
  SNOW_IJOM_MAX_HP,
  IJOM_BASE_DAMAGE,
  SNOW_IJOM_DAMAGE_MULTIPLIER,
} from "@/lib/swarm-village/sim/constants";
import {
  getUnitMaxHp,
  getWallMaxHp,
  getCombatUnitDamage,
} from "@/lib/swarm-village/sim/units";
import type {
  SwarmVillageBoardCell,
  SwarmVillageMapSnapshot,
} from "@/types/swarm-village";

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
  snowIjomSpawnChance: 0.2,
  streakCount: 0,
  treeDamageMultiplier: 1.0,
  treeHpMultiplier: 1.0,
  wallHpMultiplier: 1.0,
  smartFire: false,
};

export function VillagePageClient({
  map,
  playerAvatarUrl,
  playerName,
  villageName,
  tagline,
}: Props) {
  const [controls, setControls] = useState<SimControls>(DEFAULT_CONTROLS);
  const [swarmStatus, setSwarmStatus] = useState<BattleStatus>("ready");
  const [simStats, setSimStats] = useState<SimStats>({
    shipHp: SHIP_MAX_HP,
    waveRemaining: 0,
    waveSize: 0,
  });
  const handleSimStats = useCallback(
    (stats: SimStats) => setSimStats(stats),
    [],
  );
  const [tool, setTool] = useState<PlacementTool>(null);
  const [placedKeys, setPlacedKeys] = useState<Set<string>>(() => new Set());
  const [editedBoard, setEditedBoard] = useState<SwarmVillageBoardCell[]>(() =>
    map.board.map((c) => ({ ...c })),
  );

  const swarmLocked = swarmStatus === "wave";

  function handleSwarmToggle() {
    setControls((prev) => ({ ...prev, isSwarmActive: !prev.isSwarmActive }));
  }

  function handleSwarmStatusChange(status: BattleStatus) {
    setSwarmStatus(status);
    if (status === "cleared" || status === "lost") {
      setControls((prev) =>
        prev.isSwarmActive ? { ...prev, isSwarmActive: false } : prev,
      );
    }
  }

  const handleTilePlace = useCallback(
    (row: number, col: number) => {
      if (swarmStatus !== "ready" || !tool) return;

      if (isCastleCell(row, col) || isHomeReservedCell(row, col)) return;

      const idx = row * map.gridCols + col;
      const origCell = map.board[idx];
      if (!origCell || origCell.foundation === false) return;

      const key = `${row}-${col}`;

      if (tool === "delete") {
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

      const isUnitTool = tool !== "wall_stone" && tool !== "wall_wood";
      const currentCell = editedBoard[idx];

      // Block unit placement on top of a player-placed wall
      if (isUnitTool && currentCell && currentCell.wallHeight > 0) return;
      // Block wall placement on top of a player-placed unit
      if (!isUnitTool && currentCell && currentCell.unit !== null) return;

      setEditedBoard((prev) => {
        const next = [...prev];
        const cell = prev[idx]!;
        if (tool === "wall_stone" || tool === "wall_wood") {
          const wallType = tool === "wall_stone" ? "stone" : "wood";
          const wallMax = Math.max(
            1,
            Math.round(getWallMaxHp(wallType) * controls.wallHpMultiplier),
          );
          next[idx] = {
            ...cell,
            wallType,
            wallHeight: 1,
            wallHp: wallMax,
            wallRotation: 0,
          };
        } else {
          const unit = tool as "boxer" | "tennis" | "quarterback";
          // Apply the HP multiplier so the tree starts the next tick with the
          // right HP (otherwise there would be a one-tick flash at base HP
          // before the simulation's rescaler catches up). The simulation tick
          // is the source of truth and will keep this in sync as the slider
          // moves. Damage is fully live — applied at attack time.
          const maxHp = Math.max(
            1,
            Math.round(getUnitMaxHp(unit, 1) * controls.treeHpMultiplier),
          );
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
    [
      swarmStatus,
      tool,
      placedKeys,
      map.board,
      map.gridCols,
      editedBoard,
      controls.treeHpMultiplier,
      controls.treeDamageMultiplier,
      controls.wallHpMultiplier,
    ],
  );

  function handleResetPlacements() {
    setEditedBoard(map.board.map((c) => ({ ...c })));
    setPlacedKeys(new Set());
  }

  const hoverTintForTile = useCallback(
    (row: number, col: number): "legal" | "illegal" | null => {
      if (!tool) return null;
      if (swarmStatus !== "ready") return null;

      if (isCastleCell(row, col) || isHomeReservedCell(row, col))
        return "illegal";

      const origCell = map.board[row * map.gridCols + col];
      if (!origCell || origCell.foundation === false) return "illegal";

      if (tool === "delete") {
        return placedKeys.has(`${row}-${col}`) ? "legal" : "illegal";
      }

      if (origCell.unit !== null || origCell.wallHeight > 0) return "illegal";

      const isUnitTool = tool !== "wall_stone" && tool !== "wall_wood";
      const currentCell = editedBoard[row * map.gridCols + col];

      if (isUnitTool && currentCell && currentCell.wallHeight > 0)
        return "illegal";
      if (!isUnitTool && currentCell && currentCell.unit !== null)
        return "illegal";

      return "legal";
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
        onSimStats={handleSimStats}
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
        disabled={swarmStatus !== "ready"}
      />

      <section className="absolute inset-x-4 bottom-4 z-[900] sm:inset-x-8 sm:bottom-8">
        <div className="mx-auto max-w-5xl rounded-lg border border-white/45 bg-[#fffefa]/88 p-4 shadow-[0_24px_70px_rgba(8,16,24,0.22)] backdrop-blur-md sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            {/* Left: village name + player */}

            {/* Center: stat tables */}
            <div className="flex-1 grid grid-cols-3 items-start gap-x-5">
              {/* Labels row */}
              <p className="mb-2 text-[0.52rem] font-black uppercase tracking-[0.18em] text-[#2a9d8f]">
                Trees
              </p>
              <p className="mb-2 text-[0.52rem] font-black uppercase tracking-[0.18em] text-[#e9c46a]">
                Walls
              </p>
              <p className="mb-2 text-[0.52rem] font-black uppercase tracking-[0.18em] text-[#e76f51]">
                Enemies
              </p>

              {/* Trees table */}
              <table className="border-collapse text-[0.67rem]">
                  <thead>
                    <tr className="border-b border-[#264653]/10">
                      <th className="pb-1 text-left font-black uppercase tracking-[0.1em] text-[#7b6f60]">
                        Unit
                      </th>
                      <th className="pb-1 pl-3 text-right font-black uppercase tracking-[0.1em] text-[#7b6f60]">
                        Dmg
                      </th>
                      <th className="pb-1 pl-3 text-right font-black uppercase tracking-[0.1em] text-[#7b6f60]">
                        HP
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        {
                          unit: "boxer",
                          label: "Boxer",
                          img: "/swarm-village/sprites/sudo_boxer_0.webp",
                        },
                        {
                          unit: "tennis",
                          label: "Tennis",
                          img: "/swarm-village/sprites/sudo_tennis_0.webp",
                        },
                        {
                          unit: "quarterback",
                          label: "QB",
                          img: "/swarm-village/sprites/sudo-football.png",
                        },
                      ] as Array<{
                        unit: "boxer" | "tennis" | "quarterback";
                        label: string;
                        img: string;
                      }>
                    ).map(({ unit, label, img }) => (
                      <tr
                        key={unit}
                        className="border-b border-[#264653]/5 last:border-0"
                      >
                        <td className="py-1 pr-2">
                          <div className="flex items-center gap-1.5">
                            <img
                              src={img}
                              alt=""
                              className="h-5 w-5 object-contain"
                            />
                            <span className="font-black text-[#264653]">
                              {label}
                            </span>
                          </div>
                        </td>
                        <td className="py-1 pl-3 text-right tabular-nums font-black">
                          <span className="text-[#7b6f60]">
                            {getCombatUnitDamage(unit, 1)}
                          </span>
                          <span className="mx-1 font-bold text-[#7b6f60]">→</span>
                          <span className={controls.treeDamageMultiplier > 1 ? "text-[#2a9d8f]" : controls.treeDamageMultiplier < 1 ? "text-[#e76f51]" : "text-[#7b6f60]"}>
                            {Math.round(getCombatUnitDamage(unit, 1) * controls.treeDamageMultiplier)}
                          </span>
                        </td>
                        <td className="py-1 pl-3 text-right tabular-nums font-black">
                          <span className="text-[#7b6f60]">
                            {getUnitMaxHp(unit, 1)}
                          </span>
                          <span className="mx-1 font-bold text-[#7b6f60]">→</span>
                          <span className={controls.treeHpMultiplier > 1 ? "text-[#2a9d8f]" : controls.treeHpMultiplier < 1 ? "text-[#e76f51]" : "text-[#7b6f60]"}>
                            {Math.round(getUnitMaxHp(unit, 1) * controls.treeHpMultiplier)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

              {/* Walls table */}
              <table className="border-collapse text-[0.67rem]">
                  <thead>
                    <tr className="border-b border-[#264653]/10">
                      <th className="pb-1 text-left font-black uppercase tracking-[0.1em] text-[#7b6f60]">
                        Unit
                      </th>
                      <th className="pb-1 pl-3 text-right font-black uppercase tracking-[0.1em] text-[#7b6f60]">
                        HP
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        { wallType: "stone" as const, label: "Stone", img: "/swarm-village/quest/stone_wall.png" },
                        { wallType: "wood"  as const, label: "Wood",  img: "/swarm-village/quest/wood_fence.webp" },
                      ]
                    ).map(({ wallType, label, img }) => (
                      <tr key={wallType} className="border-b border-[#264653]/5 last:border-0">
                        <td className="py-1 pr-2">
                          <div className="flex items-center gap-1.5">
                            <img src={img} alt="" className="h-5 w-5 object-contain" />
                            <span className="font-black text-[#264653]">{label}</span>
                          </div>
                        </td>
                        <td className="py-1 pl-3 text-right tabular-nums font-black">
                          <span className="text-[#7b6f60]">{getWallMaxHp(wallType)}</span>
                          <span className="mx-1 font-bold text-[#7b6f60]">→</span>
                          <span className={controls.wallHpMultiplier > 1 ? "text-[#2a9d8f]" : controls.wallHpMultiplier < 1 ? "text-[#e76f51]" : "text-[#7b6f60]"}>
                            {Math.round(getWallMaxHp(wallType) * controls.wallHpMultiplier)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

              {/* Enemies table */}
              <table className="border-collapse text-[0.67rem]">
                  <thead>
                    <tr className="border-b border-[#264653]/10">
                      <th className="pb-1 text-left font-black uppercase tracking-[0.1em] text-[#7b6f60]">
                        Unit
                      </th>
                      <th className="pb-1 pl-3 text-right font-black uppercase tracking-[0.1em] text-[#7b6f60]">
                        Dmg
                      </th>
                      <th className="pb-1 pl-3 text-right font-black uppercase tracking-[0.1em] text-[#7b6f60]">
                        HP
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#264653]/5">
                      <td className="py-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <img
                            src="/regular-ijom-walk.gif"
                            alt=""
                            className="h-5 w-5 object-contain"
                          />
                          <span className="font-black text-[#264653]">
                            Normal
                          </span>
                        </div>
                      </td>
                      <td className="py-1 pl-3 text-right tabular-nums font-black">
                        <span className="text-[#7b6f60]">{IJOM_BASE_DAMAGE}</span>
                        <span className="mx-1 font-bold text-[#7b6f60]">→</span>
                        <span className={controls.ijomDamageMultiplier > 1 ? "text-[#2a9d8f]" : controls.ijomDamageMultiplier < 1 ? "text-[#e76f51]" : "text-[#7b6f60]"}>
                          {Math.round(IJOM_BASE_DAMAGE * controls.ijomDamageMultiplier)}
                        </span>
                      </td>
                      <td className="py-1 pl-3 text-right tabular-nums font-black">
                        <span className="text-[#7b6f60]">{NORMAL_IJOM_MAX_HP}</span>
                        <span className="mx-1 font-bold text-[#7b6f60]">→</span>
                        <span className={controls.ijomHpMultiplier > 1 ? "text-[#2a9d8f]" : controls.ijomHpMultiplier < 1 ? "text-[#e76f51]" : "text-[#7b6f60]"}>
                          {Math.round(NORMAL_IJOM_MAX_HP * controls.ijomHpMultiplier)}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <img
                            src="/snow-ijom-walk.gif"
                            alt=""
                            className="h-5 w-5 object-contain"
                          />
                          <span className="font-black text-[#264653]">
                            Snow
                          </span>
                        </div>
                      </td>
                      <td className="py-1 pl-3 text-right tabular-nums font-black">
                        <span className="text-[#7b6f60]">{IJOM_BASE_DAMAGE * SNOW_IJOM_DAMAGE_MULTIPLIER}</span>
                        <span className="mx-1 font-bold text-[#7b6f60]">→</span>
                        <span className={controls.ijomDamageMultiplier > 1 ? "text-[#2a9d8f]" : controls.ijomDamageMultiplier < 1 ? "text-[#e76f51]" : "text-[#7b6f60]"}>
                          {Math.round(IJOM_BASE_DAMAGE * SNOW_IJOM_DAMAGE_MULTIPLIER * controls.ijomDamageMultiplier)}
                        </span>
                      </td>
                      <td className="py-1 pl-3 text-right tabular-nums font-black">
                        <span className="text-[#7b6f60]">{SNOW_IJOM_MAX_HP}</span>
                        <span className="mx-1 font-bold text-[#7b6f60]">→</span>
                        <span className={controls.ijomHpMultiplier > 1 ? "text-[#2a9d8f]" : controls.ijomHpMultiplier < 1 ? "text-[#e76f51]" : "text-[#7b6f60]"}>
                          {Math.round(SNOW_IJOM_MAX_HP * controls.ijomHpMultiplier)}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
            </div>

            {/* Right: live stats + launch button */}
            <div className="flex flex-col items-start gap-2 sm:shrink-0 sm:items-end">
              {swarmStatus !== "ready" && (
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border-2 border-green-500/60 bg-white/60 p-3">
                    <dt className="font-black uppercase tracking-[0.16em] text-[#7b6f60]">
                      Castle HP
                    </dt>
                    <dd className="mt-1 font-black text-green-600">
                      {simStats.shipHp} / {SHIP_MAX_HP}
                    </dd>
                  </div>
                  <div className="rounded-md border-2 border-red-500/60 bg-white/60 p-3">
                    <dt className="font-black uppercase tracking-[0.16em] text-[#7b6f60]">
                      Remaining
                    </dt>
                    <dd className="mt-1 font-black tabular-nums text-red-500">
                      {simStats.waveRemaining} / {simStats.waveSize}
                    </dd>
                  </div>
                </dl>
              )}
              <button
                type="button"
                onClick={handleSwarmToggle}
                className={`flex-shrink-0 rounded-lg px-5 py-3 text-[0.75rem] font-black uppercase tracking-[0.18em] shadow-[0_8px_20px_rgba(8,16,24,0.2)] transition ${
                  controls.isSwarmActive
                    ? "bg-[#e76f51] text-white hover:bg-[#d4613f]"
                    : "bg-[#2a9d8f] text-white hover:bg-[#248a7d]"
                }`}
              >
                {controls.isSwarmActive ? "Stop Swarm" : "Launch Swarm"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
