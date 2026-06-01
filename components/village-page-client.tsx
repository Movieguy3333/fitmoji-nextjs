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
  boxerDamage: getCombatUnitDamage("boxer", 1),
  boxerHp: getUnitMaxHp("boxer", 1),
  tennisDamage: getCombatUnitDamage("tennis", 1),
  tennisHp: getUnitMaxHp("tennis", 1),
  quarterbackDamage: getCombatUnitDamage("quarterback", 1),
  quarterbackHp: getUnitMaxHp("quarterback", 1),
  stoneWallHp: getWallMaxHp("stone"),
  woodWallHp: getWallMaxHp("wood"),
  boxerCooldownMs: 1000,
  tennisCooldownMs: 3000,
  quarterbackCooldownMs: 3500,
  normalEnemyDamage: IJOM_BASE_DAMAGE,
  normalEnemyHp: NORMAL_IJOM_MAX_HP,
  snowEnemyDamage: IJOM_BASE_DAMAGE * SNOW_IJOM_DAMAGE_MULTIPLIER,
  snowEnemyHp: SNOW_IJOM_MAX_HP,
  enemySpeedMultiplier: 1.0,
  enemySpawnIntervalMs: 700,
  snowIjomSpawnChance: 0.2,
  superSpawnBaseChance: 0.35,
  superMinWaveSize: 50,
  streakCount: 0,
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
  const [inputValues, setInputValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (
        [
          "boxerDamage",
          "boxerHp",
          "boxerCooldownMs",
          "tennisDamage",
          "tennisHp",
          "tennisCooldownMs",
          "quarterbackDamage",
          "quarterbackHp",
          "quarterbackCooldownMs",
          "stoneWallHp",
          "woodWallHp",
          "normalEnemyDamage",
          "normalEnemyHp",
          "snowEnemyDamage",
          "snowEnemyHp",
        ] as const
      ).map((k) => [k, String(DEFAULT_CONTROLS[k])]),
    ),
  );
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

  type DirectValueKey =
    | "boxerDamage"
    | "boxerHp"
    | "tennisDamage"
    | "tennisHp"
    | "quarterbackDamage"
    | "quarterbackHp"
    | "stoneWallHp"
    | "woodWallHp"
    | "normalEnemyDamage"
    | "normalEnemyHp"
    | "snowEnemyDamage"
    | "snowEnemyHp"
    | "boxerCooldownMs"
    | "tennisCooldownMs"
    | "quarterbackCooldownMs";

  function handleValueChange(key: DirectValueKey, str: string) {
    setInputValues((prev) => ({ ...prev, [key]: str }));
    const num = parseFloat(str);
    if (!isNaN(num) && num > 0) {
      setControls((prev) => ({ ...prev, [key]: num }));
    }
  }

  function handleValueBlur(key: DirectValueKey) {
    setControls((prev) => {
      setInputValues((iv) => ({ ...iv, [key]: String(prev[key]) }));
      return prev;
    });
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
            Math.round(
              wallType === "stone" ? controls.stoneWallHp : controls.woodWallHp,
            ),
          );
          next[idx] = {
            ...cell,
            wallType,
            wallHeight: 1,
            wallHp: wallMax,
            wallMaxHp: wallMax,
            wallRotation: 0,
          };
        } else {
          const unit = tool as "boxer" | "tennis" | "quarterback";
          const hpByUnit = {
            boxer: controls.boxerHp,
            tennis: controls.tennisHp,
            quarterback: controls.quarterbackHp,
          };
          const maxHp = Math.max(1, Math.round(hpByUnit[unit]));
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
      controls.boxerHp,
      controls.tennisHp,
      controls.quarterbackHp,
      controls.stoneWallHp,
      controls.woodWallHp,
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

  function valueColor(key: DirectValueKey) {
    const cur = controls[key] as number;
    const def = DEFAULT_CONTROLS[key] as number;
    if (cur > def) return "text-[#2a9d8f]";
    if (cur < def) return "text-[#e76f51]";
    return "text-[#264653]";
  }

  function statInput(key: DirectValueKey, accentRing: string) {
    return (
      <input
        type="number"
        min="0"
        step="1"
        value={inputValues[key] ?? ""}
        disabled={swarmLocked}
        onChange={(e) => handleValueChange(key, e.target.value)}
        onBlur={() => handleValueBlur(key)}
        className={`w-14 rounded border border-[#264653]/20 bg-white/60 px-1 py-0.5 text-right text-[0.6rem] font-black tabular-nums focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${accentRing} ${valueColor(key)}`}
      />
    );
  }

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

      <section className="absolute inset-x-2 bottom-2 z-[900] max-h-[55vh] sm:inset-x-8 sm:bottom-8 sm:max-h-none">
        <div className="mx-auto max-w-5xl overflow-y-auto rounded-lg border border-white/45 bg-[#fffefa]/88 p-4 shadow-[0_24px_70px_rgba(8,16,24,0.22)] backdrop-blur-md sm:overflow-visible sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            {/* Left: village name + player */}

            {/* Center: stat tables */}
            <div className="min-w-0 flex-1 overflow-x-auto">
              <div className="grid min-w-[380px] grid-cols-[1.5fr_0.7fr_1fr] items-start gap-x-5">
                {/* Labels row */}
                <p className="mb-2 text-[0.52rem] font-black uppercase tracking-[0.18em] text-[#2a9d8f]">
                  Trees
                </p>
                <p className="mb-2 text-[0.52rem] font-black uppercase tracking-[0.18em] text-[#6a88e9]">
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
                      <th className="pb-1 pl-3 text-right font-black uppercase tracking-[0.1em] text-[#7b6f60]">
                        CD (ms)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        {
                          label: "Boxer",
                          img: "/swarm-village/sprites/sudo_boxer_0.webp",
                          dmgKey: "boxerDamage",
                          hpKey: "boxerHp",
                          cooldownKey: "boxerCooldownMs",
                        },
                        {
                          label: "Tennis",
                          img: "/swarm-village/sprites/sudo_tennis_0.webp",
                          dmgKey: "tennisDamage",
                          hpKey: "tennisHp",
                          cooldownKey: "tennisCooldownMs",
                        },
                        {
                          label: "Quarterback",
                          img: "/swarm-village/sprites/sudo-football.png",
                          dmgKey: "quarterbackDamage",
                          hpKey: "quarterbackHp",
                          cooldownKey: "quarterbackCooldownMs",
                        },
                      ] as Array<{
                        label: string;
                        img: string;
                        dmgKey: DirectValueKey;
                        hpKey: DirectValueKey;
                        cooldownKey: DirectValueKey;
                      }>
                    ).map(({ label, img, dmgKey, hpKey, cooldownKey }) => (
                      <tr
                        key={label}
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
                        <td className="py-1 pl-2 text-right">
                          {statInput(dmgKey, "focus:ring-[#2a9d8f]")}
                        </td>
                        <td className="py-1 pl-2 text-right">
                          {statInput(hpKey, "focus:ring-[#2a9d8f]")}
                        </td>
                        <td className="py-1 pl-2 text-right">
                          {statInput(cooldownKey, "focus:ring-[#2a9d8f]")}
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
                    {[
                      {
                        label: "Stone",
                        img: "/swarm-village/quest/stone_wall.png",
                        hpKey: "stoneWallHp" as DirectValueKey,
                      },
                      {
                        label: "Wood",
                        img: "/swarm-village/quest/wood_fence.webp",
                        hpKey: "woodWallHp" as DirectValueKey,
                      },
                    ].map(({ label, img, hpKey }) => (
                      <tr
                        key={label}
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
                        <td className="py-1 pl-2 text-right">
                          {statInput(hpKey, "focus:ring-[#6a88e9]")}
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
                      <td className="py-1 pl-2 text-right">
                        {statInput("normalEnemyDamage", "focus:ring-[#e76f51]")}
                      </td>
                      <td className="py-1 pl-2 text-right">
                        {statInput("normalEnemyHp", "focus:ring-[#e76f51]")}
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
                            Driller
                          </span>
                        </div>
                      </td>
                      <td className="py-1 pl-2 text-right">
                        {statInput("snowEnemyDamage", "focus:ring-[#e76f51]")}
                      </td>
                      <td className="py-1 pl-2 text-right">
                        {statInput("snowEnemyHp", "focus:ring-[#e76f51]")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: live stats + launch button */}
            <div className="flex flex-row flex-wrap items-center justify-between gap-2 sm:flex-col sm:shrink-0 sm:items-end">
              <dl className="grid grid-cols-2 gap-2 text-xs sm:w-auto">
                <div className="rounded-md border-2 border-green-700/60 bg-white/60 p-3">
                  <dt className="font-black uppercase tracking-[0.16em] text-[#7b6f60]">
                    Castle HP
                  </dt>
                  <dd className="mt-1 font-black text-green-600">
                    {swarmStatus === "ready"
                      ? `${SHIP_MAX_HP} / ${SHIP_MAX_HP}`
                      : `${simStats.shipHp} / ${SHIP_MAX_HP}`}
                  </dd>
                </div>
                <div className="rounded-md border-2 border-red-500/60 bg-white/60 p-3">
                  <dt className="font-black uppercase tracking-[0.16em] text-[#7b6f60]">
                    Remaining
                  </dt>
                  <dd className="mt-1 font-black tabular-nums text-red-500">
                    {swarmStatus === "ready"
                      ? "0 / 0"
                      : `${simStats.waveRemaining} / ${simStats.waveSize}`}
                  </dd>
                </div>
              </dl>
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
