"use client";

import type { CSSProperties } from "react";
import { useMemo, useState, useEffect, useRef } from "react";

import {
  buildSwarmVillageScene,
  SWARM_VILLAGE_DEFAULT_AVATAR_ASSET,
  SWARM_VILLAGE_HOME_ASSET,
} from "@/lib/swarm-village/render";
import type { SwarmVillageMapSnapshot } from "@/types/swarm-village";
import {
  BOARD_TOP_INSET,
  ENEMY_SPRITE_SIZE,
  SHIP_MAX_HP,
  SNOW_IJOM_SPRITE_SCALE,
  TILE_WIDTH,
} from "@/lib/swarm-village/sim/constants";
import type { SimControls } from "@/lib/swarm-village/sim/useSwarmSimulation";
import { useSwarmSimulation } from "@/lib/swarm-village/sim/useSwarmSimulation";
import type {
  BattleStatus,
  Enemy,
} from "@/lib/swarm-village/sim/types";

type Props = {
  map: SwarmVillageMapSnapshot;
  playerAvatarUrl?: string | null;
  playerName?: string | null;
  controls: SimControls;
  className?: string;
  onStatusChange?: (status: BattleStatus) => void;
};

const ENEMY_FRAME_COUNT_NORMAL = 5;
const ENEMY_FRAME_COUNT_SNOW = 6;
const ENEMY_ANIM_INTERVAL_MS = 140;

/** Convert absolute pixel position to % of boardWidth / boardHeight */
function toPct(px: number, total: number): string {
  return `${((px / total) * 100).toFixed(4)}%`;
}

/** Isometric pixel position of a floating entity at row/col */
function isoPos(
  boardCenterX: number,
  row: number,
  col: number,
): { left: number; top: number } {
  return {
    left: boardCenterX + (col - row) * (TILE_WIDTH / 2) - TILE_WIDTH / 2,
    top: BOARD_TOP_INSET + (col + row) * (38 / 2), // HALF_H = 19
  };
}

function toEntityStyle(
  pos: { left: number; top: number },
  spriteW: number,
  spriteH: number,
  boardWidth: number,
  boardHeight: number,
  zIndex: number,
  flipX: boolean,
): CSSProperties {
  return {
    position: "absolute",
    left: toPct(pos.left - spriteW / 2 + TILE_WIDTH / 2, boardWidth),
    top: toPct(pos.top - spriteH, boardHeight),
    width: toPct(spriteW, boardWidth),
    height: toPct(spriteH, boardHeight),
    zIndex,
    transform: flipX ? "scaleX(-1)" : undefined,
    transformOrigin: "center bottom",
    pointerEvents: "none",
  };
}

// ── HP bar ────────────────────────────────────────────────────────────────────

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  const color = pct > 0.5 ? "#2a9d8f" : pct > 0.25 ? "#e9c46a" : "#e76f51";
  return (
    <div
      style={{
        width: "100%",
        height: 5,
        background: "rgba(8,16,24,0.50)",
        borderRadius: 3,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: `${(pct * 100).toFixed(1)}%`,
          height: "100%",
          background: color,
          borderRadius: 3,
          transition: "width 0.08s ease-out",
        }}
      />
    </div>
  );
}

// ── Sprites ───────────────────────────────────────────────────────────────────

function EnemySprite({
  enemy,
  boardCenterX,
  boardWidth,
  boardHeight,
}: {
  enemy: Enemy;
  boardCenterX: number;
  boardWidth: number;
  boardHeight: number;
}) {
  const [frame, setFrame] = useState(0);
  const isSnow = enemy.variant === "snow";
  const frameCount = isSnow ? ENEMY_FRAME_COUNT_SNOW : ENEMY_FRAME_COUNT_NORMAL;

  useEffect(() => {
    const id = setInterval(
      () => setFrame((f) => (f + 1) % frameCount),
      ENEMY_ANIM_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [frameCount]);

  const prefix = isSnow ? "snow_ijom_smash" : "ijom_smash";
  const src = `/swarm-village/sprites/${prefix}_${frame}.webp`;
  const spriteSize = isSnow
    ? Math.round(ENEMY_SPRITE_SIZE * SNOW_IJOM_SPRITE_SCALE)
    : ENEMY_SPRITE_SIZE;

  const pos = isoPos(boardCenterX, enemy.row, enemy.col);
  const zIndex = 360 + Math.floor((enemy.row + enemy.col) * 10);

  const HP_BAR_W = 32;
  const HP_BAR_H = 5;
  const HP_GAP = 3;

  // Bar sits above the sprite; same horizontal centre as the entity
  const barLeft = pos.left - HP_BAR_W / 2 + TILE_WIDTH / 2;
  const barTop = pos.top - spriteSize - HP_BAR_H - HP_GAP;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        style={toEntityStyle(
          pos,
          spriteSize,
          spriteSize,
          boardWidth,
          boardHeight,
          zIndex,
          false,
        )}
      />
      {/* HP bar rendered as a sibling in the same board container */}
      <div
        style={{
          position: "absolute",
          left: toPct(barLeft, boardWidth),
          top: toPct(barTop, boardHeight),
          width: toPct(HP_BAR_W, boardWidth),
          zIndex: zIndex + 1,
          pointerEvents: "none",
        }}
      >
        <HpBar hp={enemy.hp} maxHp={enemy.maxHp} />
      </div>
    </>
  );
}


// ── Main component ────────────────────────────────────────────────────────────

export function SwarmVillageLiveScene({
  map,
  playerAvatarUrl,
  playerName,
  controls,
  className = "",
  onStatusChange,
}: Props) {
  const sim = useSwarmSimulation({
    initialBoard: map.board,
    gridCols: map.gridCols,
    controls,
  });

  // Notify parent when battle status changes
  const prevStatusRef = useRef<BattleStatus>("ready");
  useEffect(() => {
    if (sim.status !== prevStatusRef.current) {
      prevStatusRef.current = sim.status;
      onStatusChange?.(sim.status);
    }
  }, [sim.status, onStatusChange]);

  const scene = useMemo(
    () =>
      buildSwarmVillageScene({
        board: sim.board,
        gridCols: map.gridCols,
        swarmCompletionCount: map.swarmCompletionCount,
      }),
    [sim.board, map.gridCols, map.swarmCompletionCount],
  );

  const avatarSrc = playerAvatarUrl ?? SWARM_VILLAGE_DEFAULT_AVATAR_ASSET;
  const label = `${playerName ?? map.displayName ?? "Fitmoji player"} village`;
  const sceneAspect = scene.boardWidth / scene.boardHeight;
  const viewerWidthByHeight = `${(sceneAspect * 100).toFixed(2)}svh`;

  function toSpriteStyle(sprite: {
    left: number;
    top: number;
    width: number;
    height: number;
    sortOrder: number;
    flipX: boolean;
  }): CSSProperties {
    return {
      position: "absolute",
      left: toPct(sprite.left, scene.boardWidth),
      top: toPct(sprite.top, scene.boardHeight),
      width: toPct(sprite.width, scene.boardWidth),
      height: toPct(sprite.height, scene.boardHeight),
      zIndex: 100 + Math.round(sprite.sortOrder),
      transform: sprite.flipX ? "scaleX(-1)" : undefined,
      transformOrigin: "center bottom",
      objectFit: "contain",
    };
  }

  function toLayerStyle(layer: {
    left: number;
    top: number;
    width: number;
    height: number;
    zIndex: number;
  }): CSSProperties {
    return {
      position: "absolute",
      left: toPct(layer.left, scene.boardWidth),
      top: toPct(layer.top, scene.boardHeight),
      width: toPct(layer.width, scene.boardWidth),
      height: toPct(layer.height, scene.boardHeight),
      zIndex: layer.zIndex,
    };
  }

  // HP bar dimensions (board-px) for unit overlays
  const UNIT_HP_BAR_W = 30;
  const UNIT_HP_BAR_H = 5;
  const UNIT_HP_BAR_GAP = 3;

  return (
    <div
      aria-label={label}
      className={`relative h-full overflow-hidden bg-[#245971] ${className}`}
    >
      <div className="absolute inset-0 bg-linear-to-b from-[#1f6f91] via-[#48bbf0] to-[#a6dfbf]" />
      <div className="absolute inset-x-0 bottom-0 h-[34%] bg-linear-to-t from-[#315446]/55 to-transparent" />
      <div className="absolute bottom-[6%] left-[15%] h-[10%] w-[70%] rounded-[50%] bg-[#081018]/18 blur-xl" />

      {/* Castle HP bar — shown whenever a wave is in progress or just finished */}
      {sim.status !== "ready" && (
        <div className="absolute left-8 top-25 z-[950] flex flex-col gap-1.5 rounded-md border border-white/30 bg-[#081018]/55 px-3 py-2 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/80">
              Castle
            </span>
            <span className="text-[0.68rem] font-black tabular-nums text-white">
              {sim.shipHp} / {SHIP_MAX_HP}
            </span>
          </div>
          <div style={{ width: 80 }}>
            <HpBar hp={sim.shipHp} maxHp={SHIP_MAX_HP} />
          </div>
        </div>
      )}

      <div
        className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2"
        style={{
          aspectRatio: `${scene.boardWidth} / ${scene.boardHeight}`,
          width: `min(132vw, ${viewerWidthByHeight})`,
        }}
      >
        {/* Static terrain / walls / units */}
        {scene.sprites.map((sprite) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={sprite.id}
            src={sprite.src}
            alt=""
            draggable={false}
            className="absolute select-none"
            style={toSpriteStyle(sprite)}
          />
        ))}

        {/* Unit HP bars — rendered above the unit sprite, absolute in board-space */}
        {scene.sprites
          .filter((s) => s.id.startsWith("u-"))
          .map((sprite) => {
            const parts = sprite.id.split("-");
            const row = parseInt(parts[1]!, 10);
            const col = parseInt(parts[2]!, 10);
            const cell = sim.board[row * map.gridCols + col];

            if (!cell || cell.unitMaxHp <= 0) return null;

            // Show bar when: damaged at any time, OR during active wave (shows full green bar)
            const hasDamage = cell.unitHp < cell.unitMaxHp;
            if (!hasDamage && sim.status !== "wave") return null;

            const barLeft = sprite.left + (sprite.width - UNIT_HP_BAR_W) / 2;
            const barTop = sprite.top - UNIT_HP_BAR_H - UNIT_HP_BAR_GAP;

            return (
              <div
                key={`hp-u-${row}-${col}`}
                style={{
                  position: "absolute",
                  left: toPct(barLeft, scene.boardWidth),
                  top: toPct(barTop, scene.boardHeight),
                  width: toPct(UNIT_HP_BAR_W, scene.boardWidth),
                  zIndex: 100 + Math.round(sprite.sortOrder) + 1,
                  pointerEvents: "none",
                }}
              >
                <HpBar hp={cell.unitHp} maxHp={cell.unitMaxHp} />
              </div>
            );
          })}

        <div
          className="absolute rounded-full bg-[#081018]/0"
          style={toLayerStyle(scene.homeAvatarPlatform)}
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SWARM_VILLAGE_HOME_ASSET}
          alt=""
          draggable={false}
          className="absolute select-none object-contain drop-shadow-[0_14px_18px_rgba(8,16,24,0.28)]"
          style={toLayerStyle(scene.homeBase)}
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarSrc}
          alt=""
          draggable={false}
          className="absolute select-none object-contain drop-shadow-[0_6px_8px_rgba(8,16,24,0.35)]"
          style={toLayerStyle(scene.homeAvatar)}
        />

        {/* Enemies — each renders its own HP bar above itself */}
        {sim.enemies.map((enemy) => (
          <EnemySprite
            key={enemy.id}
            enemy={enemy}
            boardCenterX={scene.boardCenterX}
            boardWidth={scene.boardWidth}
            boardHeight={scene.boardHeight}
          />
        ))}


      </div>
    </div>
  );
}
