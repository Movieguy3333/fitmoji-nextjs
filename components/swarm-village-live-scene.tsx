"use client";

import type { CSSProperties } from "react";
import { useMemo, useEffect, useRef, useState, useCallback } from "react";

import {
  buildSwarmVillageScene,
  SWARM_VILLAGE_DEFAULT_AVATAR_ASSET,
  SWARM_VILLAGE_HOME_ASSET,
} from "@/lib/swarm-village/render";
import type { SwarmVillageMapSnapshot } from "@/types/swarm-village";
import {
  BOARD_TOP_INSET,
  ENEMY_SPRITE_SIZE,
  ENEMY_SPRITE_LEFT_OFFSET,
  ENEMY_SPRITE_TOP_OFFSET,
  GRID_ROWS,
  HALF_H,
  HALF_W,
  SHIP_MAX_HP,
  SNOW_IJOM_SPRITE_SCALE,
  TILE_HEIGHT,
  TILE_WIDTH,
} from "@/lib/swarm-village/sim/constants";
import type { SimControls } from "@/lib/swarm-village/sim/useSwarmSimulation";
import { useSwarmSimulation } from "@/lib/swarm-village/sim/useSwarmSimulation";
import { getIncomingWaveSize, getIjomPackSize } from "@/lib/swarm-village/sim/combat";
import type { BattleStatus, Enemy } from "@/lib/swarm-village/sim/types";
import type { Projectile } from "@/lib/swarm-village/sim/tree-combat";
import {
  getFootballScreenAngle,
  getProjectileElevation,
} from "@/lib/swarm-village/sim/tree-combat";

export type SimStats = {
  shipHp: number;
  waveRemaining: number;
  waveSize: number;
};

type Props = {
  map: SwarmVillageMapSnapshot;
  playerAvatarUrl?: string | null;
  playerName?: string | null;
  controls: SimControls;
  className?: string;
  onStatusChange?: (status: BattleStatus) => void;
  onSimStats?: (stats: SimStats) => void;
  onTileClick?: (row: number, col: number) => void;
  hoverTintForTile?: (row: number, col: number) => "legal" | "illegal" | null;
};

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
    left:
      boardCenterX +
      (col - row) * (TILE_WIDTH / 2) -
      TILE_WIDTH / 2 +
      ENEMY_SPRITE_LEFT_OFFSET,
    top: BOARD_TOP_INSET + (col + row) * HALF_H + ENEMY_SPRITE_TOP_OFFSET,
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
    top: toPct(pos.top + HALF_H - spriteH, boardHeight),
    width: toPct(spriteW, boardWidth),
    height: toPct(spriteH, boardHeight),
    zIndex,
    transform: flipX ? "scaleX(-1)" : undefined,
    transformOrigin: "center bottom",
    pointerEvents: "none",
  };
}

// ── HP bar ────────────────────────────────────────────────────────────────────

function HpBar({ hp, maxHp, fillColor }: { hp: number; maxHp: number; fillColor?: string }) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  const color = fillColor ?? (pct > 0.5 ? "#2a9d8f" : pct > 0.25 ? "#e9c46a" : "#e76f51");
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

const IJOM_SMASH_FRAMES = [0, 1, 2, 3, 4].map((i) => `/ijom_smash_${i}.webp`);
const SNOW_IJOM_SMASH_FRAMES = [0, 1, 2, 3, 4].map((i) => `/snow_ijom_smash_${i}.webp`);
const SMASH_SEQUENCE = [0, 1, 2, 3, 4, 3, 2, 1, 0] as const;
const SMASH_FRAME_MS = 50;

function getIjomSmashSrc(enemy: Enemy): string | null {
  const elapsed = Date.now() - enemy.lastAttackAt;
  const step = Math.floor(elapsed / SMASH_FRAME_MS);
  if (step >= SMASH_SEQUENCE.length) return null;
  const frames = enemy.variant === "snow" ? SNOW_IJOM_SMASH_FRAMES : IJOM_SMASH_FRAMES;
  return frames[SMASH_SEQUENCE[step]];
}

const BOXER_ATTACK_FRAMES = [0,1,2,3].map(i => `/swarm-village/sudo_boxer_${i}.webp`);
const TENNIS_ATTACK_FRAMES = [0,1,2,3].map(i => `/swarm-village/sudo_tennis_${i}.webp`);
const FIGHTER_SEQUENCE = [0,1,2,3,2,1,0] as const;

function getFighterSrc(spriteSrc: string, lastAttackAt: number): string {
  const isBoxer = spriteSrc.includes("boxer");
  const isTennis = spriteSrc.includes("tennis");
  if (!isBoxer && !isTennis) return spriteSrc;
  if (!lastAttackAt) return spriteSrc;
  const frameDurationMs = isBoxer ? 300 / FIGHTER_SEQUENCE.length : 600 / FIGHTER_SEQUENCE.length;
  const step = Math.floor((Date.now() - lastAttackAt) / frameDurationMs);
  if (step >= FIGHTER_SEQUENCE.length) return spriteSrc;
  const frames = isBoxer ? BOXER_ATTACK_FRAMES : TENNIS_ATTACK_FRAMES;
  return frames[FIGHTER_SEQUENCE[step]] ?? spriteSrc;
}

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
  const isSnow = enemy.variant === "snow";

  const smashSrc = getIjomSmashSrc(enemy);
  const src = smashSrc ?? (isSnow ? "/snow-ijom-walk.gif" : "/regular-ijom-walk.gif");
  const packScale = Math.sqrt(Math.max(1, enemy.packSize ?? 1));
  const baseSize = isSnow
    ? Math.round(ENEMY_SPRITE_SIZE * SNOW_IJOM_SPRITE_SCALE)
    : ENEMY_SPRITE_SIZE;
  const spriteSize = Math.round(baseSize * packScale);

  const pos = isoPos(boardCenterX, enemy.row, enemy.col);
  const zIndex = 360 + Math.floor((enemy.row + enemy.col) * 10);

  const HP_BAR_W = 32 * packScale;
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
  style={{
    ...toEntityStyle(
      pos,
      spriteSize,
      spriteSize,
      boardWidth,
      boardHeight,
      zIndex,
      false,
    ),
    objectFit: "contain",
    transform: smashSrc && !isSnow ? "scale(1.2)" : undefined,
    transformOrigin: "center bottom",
  }}
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

// ── Projectile sprite ─────────────────────────────────────────────────────────

function ProjectileSprite({
  projectile,
  boardCenterX,
  boardWidth,
  boardHeight,
}: {
  projectile: Projectile;
  boardCenterX: number;
  boardWidth: number;
  boardHeight: number;
}) {
  const pos = isoPos(boardCenterX, projectile.row, projectile.col);
  const elevation = getProjectileElevation(projectile);
  const elevatedTop = pos.top - elevation * HALF_H;
  const zIndex = 420 + Math.floor((projectile.row + projectile.col) * 10);

  if (projectile.kind === "football") {
    const angle = getFootballScreenAngle(projectile);
    return (
      <div
        style={{
          position: "absolute",
          left: toPct(pos.left + TILE_WIDTH / 2 - 12, boardWidth),
          top: toPct(elevatedTop - 8, boardHeight),
          width: toPct(24, boardWidth),
          height: toPct(14, boardHeight),
          zIndex,
          borderRadius: "50%",
          background: "#8B4513",
          border: "2px solid #5C2D0A",
          transform: `rotate(${angle}rad)`,
          transformOrigin: "center center",
          pointerEvents: "none",
        }}
      />
    );
  }

  // Tennis ball — small white circle
  return (
    <div
      style={{
        position: "absolute",
        left: toPct(pos.left + TILE_WIDTH / 2 - 5, boardWidth),
        top: toPct(elevatedTop - 5, boardHeight),
        width: toPct(10, boardWidth),
        height: toPct(10, boardHeight),
        zIndex,
        borderRadius: "50%",
        background: "#ffffff",
        boxShadow: "0 0 5px rgba(255,255,255,0.65)",
        pointerEvents: "none",
      }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function pointerToCell(
  ev: { clientX: number; clientY: number },
  boardEl: HTMLDivElement,
  boardWidth: number,
  boardHeight: number,
  boardCenterX: number,
  gridCols: number,
): { row: number; col: number } | null {
  const rect = boardEl.getBoundingClientRect();
  const px = ((ev.clientX - rect.left) / rect.width) * boardWidth;
  const py = ((ev.clientY - rect.top) / rect.height) * boardHeight;

  const u = (px - boardCenterX) / HALF_W;
  const v = (py - BOARD_TOP_INSET - HALF_H * 0.2) / HALF_H;

  const col = Math.floor((u + v) / 2);
  const row = Math.floor((v - u) / 2);

  if (row < 0 || row >= GRID_ROWS) return null;
  if (col < 0 || col >= gridCols) return null;
  return { row, col };
}

export function SwarmVillageLiveScene({
  map,
  playerAvatarUrl,
  playerName,
  controls,
  className = "",
  onStatusChange,
  onSimStats,
  onTileClick,
  hoverTintForTile,
}: Props) {
  const sim = useSwarmSimulation({
    initialBoard: map.board,
    gridCols: map.gridCols,
    controls,
  });

  const boardDivRef = useRef<HTMLDivElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  // Notify parent when battle status changes
  const prevStatusRef = useRef<BattleStatus>("ready");
  useEffect(() => {
    if (sim.status !== prevStatusRef.current) {
      prevStatusRef.current = sim.status;
      onStatusChange?.(sim.status);
    }
  }, [sim.status, onStatusChange]);

  // Bubble live sim stats up to the parent every tick
  useEffect(() => {
    if (!onSimStats) return;
    const waveSize = getIncomingWaveSize(sim.board, controls.streakCount);
    const alivePackTotal = sim.enemies.reduce(
      (sum, e) => sum + getIjomPackSize(e),
      0,
    );
    const waveRemaining =
      Math.max(0, waveSize - sim.waveSpawned) + alivePackTotal;
    onSimStats({ shipHp: sim.shipHp, waveRemaining, waveSize });
  }, [sim.shipHp, sim.waveSpawned, sim.enemies, sim.board, controls.streakCount, onSimStats]);

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
      pointerEvents: "none",
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
      pointerEvents: "none",
    };
  }

  // HP bar dimensions (board-px) for unit overlays
  const UNIT_HP_BAR_W = 30;
  const UNIT_HP_BAR_H = 5;
  const UNIT_HP_BAR_GAP = 3;

  // HP bar dimensions (board-px) for wall overlays
  const WALL_HP_BAR_W = 30;
  const WALL_HP_BAR_H = 5;
  const WALL_HP_BAR_GAP = 3;

  return (
    <div
      aria-label={label}
      className={`relative h-full overflow-hidden bg-[#245971] ${className}`}
    >
      <div className="absolute inset-0 bg-linear-to-b from-[#1f6f91] via-[#48bbf0] to-[#a6dfbf]" />
      <div className="absolute inset-x-0 bottom-0 h-[34%] bg-linear-to-t from-[#315446]/55 to-transparent" />
      <div className="absolute bottom-[6%] left-[15%] h-[10%] w-[70%] rounded-[50%] bg-[#081018]/18 blur-xl" />


      <div
        ref={boardDivRef}
        className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2"
        style={{
          aspectRatio: `${scene.boardWidth} / ${scene.boardHeight}`,
          width: `min(132vw, ${viewerWidthByHeight})`,
          cursor: hoverTintForTile && onTileClick ? "crosshair" : undefined,
        }}
        onPointerMove={(ev) => {
          if (!boardDivRef.current || !hoverTintForTile) return;
          const cell = pointerToCell(
            ev,
            boardDivRef.current,
            scene.boardWidth,
            scene.boardHeight,
            scene.boardCenterX,
            map.gridCols,
          );
          setHoveredCell(cell);
        }}
        onPointerLeave={() => setHoveredCell(null)}
        onClick={(ev) => {
          if (!boardDivRef.current || !onTileClick) return;
          const cell = pointerToCell(
            ev,
            boardDivRef.current,
            scene.boardWidth,
            scene.boardHeight,
            scene.boardCenterX,
            map.gridCols,
          );
          if (cell) onTileClick(cell.row, cell.col);
        }}
      >
        {/* Static terrain / walls / units */}
        
        {scene.sprites.map((sprite) => {
          let src = sprite.src;
          if (sprite.id.startsWith("u-")) {
            const parts = sprite.id.split("-");
            const row = parseInt(parts[1]!, 10);
            const col = parseInt(parts[2]!, 10);
            const cell = sim.board[row * map.gridCols + col];
            if (cell?.unitLastAttackAt) {
              src = getFighterSrc(sprite.src, cell.unitLastAttackAt);
            }
          }
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={sprite.id}
              src={src}
              alt=""
              draggable={false}
              className="absolute select-none"
              style={toSpriteStyle(sprite)}
            />
          );
        })}

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

        {/* Wall HP bars — rendered above the topmost wall sprite for each cell */}
        {scene.sprites
          .filter((s) => s.id.startsWith("w-"))
          .map((sprite) => {
            const parts = sprite.id.split("-");
            const row = parseInt(parts[1]!, 10);
            const col = parseInt(parts[2]!, 10);
            const level = parseInt(parts[3]!, 10);
            const cell = sim.board[row * map.gridCols + col];

            if (!cell || cell.wallHeight <= 0) return null;
            // Only render the bar once per cell — above the topmost wall level
            if (level !== cell.wallHeight) return null;

            const wallMaxHp = cell.wallMaxHp;
            if (wallMaxHp <= 0) return null;

            // Show bar when: damaged at any time, OR during active wave (shows full green bar)
            const hasDamage = cell.wallHp < wallMaxHp;
            if (!hasDamage && sim.status !== "wave") return null;

            const barLeft = sprite.left + (sprite.width - WALL_HP_BAR_W) / 2;
            const barTop = sprite.top - WALL_HP_BAR_H - WALL_HP_BAR_GAP;

            return (
              <div
                key={`hp-w-${row}-${col}`}
                style={{
                  position: "absolute",
                  left: toPct(barLeft, scene.boardWidth),
                  top: toPct(barTop, scene.boardHeight),
                  width: toPct(WALL_HP_BAR_W, scene.boardWidth),
                  zIndex: 100 + Math.round(sprite.sortOrder) + 1,
                  pointerEvents: "none",
                }}
              >
                <HpBar hp={cell.wallHp} maxHp={wallMaxHp} fillColor="#8a9ba8" />
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

        {/* Projectiles — tennis balls and footballs */}
        {sim.projectiles.map((projectile) => (
          <ProjectileSprite
            key={projectile.id}
            projectile={projectile}
            boardCenterX={scene.boardCenterX}
            boardWidth={scene.boardWidth}
            boardHeight={scene.boardHeight}
          />
        ))}

        {/* Hover highlight overlay — filter and clip-path on the same element so
            drop-shadow traces the diamond edge instead of the bounding box */}
        {hoveredCell &&
          hoverTintForTile &&
          (() => {
            const tint = hoverTintForTile(hoveredCell.row, hoveredCell.col);
            if (!tint) return null;
            const left =
              scene.boardCenterX +
              (hoveredCell.col - hoveredCell.row) * HALF_W -
              HALF_W;
            const top =
              BOARD_TOP_INSET + (hoveredCell.col + hoveredCell.row) * HALF_H;
            const isLegal = tint === "legal";
            return (
              <div
                style={{
                  position: "absolute",
                  left: toPct(left, scene.boardWidth),
                  top: toPct(top, scene.boardHeight),
                  width: toPct(TILE_WIDTH, scene.boardWidth),
                  height: toPct(TILE_HEIGHT, scene.boardHeight),
                  zIndex: 500,
                  clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                  background: isLegal
                    ? "rgba(42,157,143,0.28)"
                    : "rgba(231,111,81,0.28)",
                  filter: isLegal
                    ? "drop-shadow(0 0 5px rgba(42,157,143,0.45)) drop-shadow(0 0 9px rgba(42,157,143,0.25))"
                    : "drop-shadow(0 0 5px rgba(231,111,81,0.45)) drop-shadow(0 0 9px rgba(231,111,81,0.25))",
                  pointerEvents: "none",
                }}
              />
            );
          })()}
      </div>
    </div>
  );
}
