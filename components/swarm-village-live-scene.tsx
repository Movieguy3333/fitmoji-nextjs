'use client';

import type { CSSProperties } from 'react';
import { useMemo, useState, useEffect } from 'react';

import {
  buildSwarmVillageScene,
  SWARM_VILLAGE_DEFAULT_AVATAR_ASSET,
  SWARM_VILLAGE_HOME_ASSET,
} from '@/lib/swarm-village/render';
import type { SwarmVillageMapSnapshot } from '@/types/swarm-village';
import {
  BOARD_TOP_INSET,
  ENEMY_SPRITE_SIZE,
  GRID_ROWS,
  HALF_H,
  HALF_W,
  SNOW_IJOM_SPRITE_SCALE,
  TILE_WIDTH,
} from '@/lib/swarm-village/sim/constants';
import type { SimControls } from '@/lib/swarm-village/sim/useSwarmSimulation';
import { useSwarmSimulation } from '@/lib/swarm-village/sim/useSwarmSimulation';
import type { CrazyCapyState, Enemy, Walker } from '@/lib/swarm-village/sim/types';

type Props = {
  map: SwarmVillageMapSnapshot;
  playerAvatarUrl?: string | null;
  playerName?: string | null;
  controls: SimControls;
  className?: string;
};

const ENEMY_FRAME_COUNT_NORMAL = 5;
const ENEMY_FRAME_COUNT_SNOW = 6;
const ENEMY_ANIM_INTERVAL_MS = 140;
const CAPY_ASSET = '/swarm-village/quest/crazycapy.gif';
const CAPY_SIZE = 60;

/** Convert absolute pixel position to % of boardWidth / boardHeight */
function toPct(
  px: number,
  total: number,
): string {
  return `${((px / total) * 100).toFixed(4)}%`;
}

/** Isometric position of a floating entity at row/col in pixel space */
function isoPos(
  boardCenterX: number,
  row: number,
  col: number,
): { left: number; top: number } {
  return {
    left: boardCenterX + (col - row) * HALF_W - HALF_W,
    top: BOARD_TOP_INSET + (col + row) * HALF_H,
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
    position: 'absolute',
    left: toPct(pos.left - spriteW / 2 + TILE_WIDTH / 2, boardWidth),
    top: toPct(pos.top - spriteH, boardHeight),
    width: toPct(spriteW, boardWidth),
    height: toPct(spriteH, boardHeight),
    zIndex,
    transform: flipX ? 'scaleX(-1)' : undefined,
    transformOrigin: 'center bottom',
    pointerEvents: 'none',
  };
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
  const [frame, setFrame] = useState(0);
  const isSnow = enemy.variant === 'snow';
  const frameCount = isSnow ? ENEMY_FRAME_COUNT_SNOW : ENEMY_FRAME_COUNT_NORMAL;

  useEffect(() => {
    const id = setInterval(
      () => setFrame((f) => (f + 1) % frameCount),
      ENEMY_ANIM_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [frameCount]);

  const prefix = isSnow ? 'snow_ijom_smash' : 'ijom_smash';
  const src = `/swarm-village/sprites/${prefix}_${frame}.webp`;
  const spriteSize = isSnow
    ? Math.round(ENEMY_SPRITE_SIZE * SNOW_IJOM_SPRITE_SCALE)
    : ENEMY_SPRITE_SIZE;

  const pos = isoPos(boardCenterX, enemy.row, enemy.col);
  const zIndex = 360 + Math.floor((enemy.row + enemy.col) * 10);

  return (
    // eslint-disable-next-line @next/next/no-img-element
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
  );
}

function CapySprite({
  capy,
  boardCenterX,
  boardWidth,
  boardHeight,
}: {
  capy: CrazyCapyState;
  boardCenterX: number;
  boardWidth: number;
  boardHeight: number;
}) {
  const pos = isoPos(boardCenterX, capy.row, capy.col);
  const zIndex = 360 + Math.floor((capy.row + capy.col) * 10) + 5;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={CAPY_ASSET}
      alt=""
      draggable={false}
      style={toEntityStyle(
        pos,
        CAPY_SIZE,
        CAPY_SIZE,
        boardWidth,
        boardHeight,
        zIndex,
        capy.facingScaleX === -1,
      )}
    />
  );
}

function WalkerSprite({
  walker,
  avatarSrc,
  boardCenterX,
  boardWidth,
  boardHeight,
}: {
  walker: Walker;
  avatarSrc: string;
  boardCenterX: number;
  boardWidth: number;
  boardHeight: number;
}) {
  const pos = isoPos(boardCenterX, walker.row, walker.col);
  const spriteSize = 32;
  const zIndex = 360 + Math.floor((walker.row + walker.col) * 10) + 1;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarSrc}
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
          walker.facingScaleX === -1,
        ),
        borderRadius: '50%',
      }}
    />
  );
}

export function SwarmVillageLiveScene({
  map,
  playerAvatarUrl,
  playerName,
  controls,
  className = '',
}: Props) {
  const sim = useSwarmSimulation({
    initialBoard: map.board,
    gridCols: map.gridCols,
    controls,
  });

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
  const label = `${playerName ?? map.displayName ?? 'Fitmoji player'} village`;
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
      position: 'absolute',
      left: toPct(sprite.left, scene.boardWidth),
      top: toPct(sprite.top, scene.boardHeight),
      width: toPct(sprite.width, scene.boardWidth),
      height: toPct(sprite.height, scene.boardHeight),
      zIndex: 100 + Math.round(sprite.sortOrder),
      transform: sprite.flipX ? 'scaleX(-1)' : undefined,
      transformOrigin: 'center bottom',
      objectFit: 'contain',
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
      position: 'absolute',
      left: toPct(layer.left, scene.boardWidth),
      top: toPct(layer.top, scene.boardHeight),
      width: toPct(layer.width, scene.boardWidth),
      height: toPct(layer.height, scene.boardHeight),
      zIndex: layer.zIndex,
    };
  }

  return (
    <div
      aria-label={label}
      className={`relative h-full overflow-hidden bg-[#245971] ${className}`}
    >
      <div className="absolute inset-0 bg-linear-to-b from-[#1f6f91] via-[#48bbf0] to-[#a6dfbf]" />
      <div className="absolute inset-x-0 bottom-0 h-[34%] bg-linear-to-t from-[#315446]/55 to-transparent" />
      <div className="absolute bottom-[6%] left-[15%] h-[10%] w-[70%] rounded-[50%] bg-[#081018]/18 blur-xl" />

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

        {/* Walkers */}
        {sim.walkers.map((walker) => (
          <WalkerSprite
            key={walker.id}
            walker={walker}
            avatarSrc={avatarSrc}
            boardCenterX={scene.boardCenterX}
            boardWidth={scene.boardWidth}
            boardHeight={scene.boardHeight}
          />
        ))}

        {/* Enemies */}
        {sim.enemies.map((enemy) => (
          <EnemySprite
            key={enemy.id}
            enemy={enemy}
            boardCenterX={scene.boardCenterX}
            boardWidth={scene.boardWidth}
            boardHeight={scene.boardHeight}
          />
        ))}

        {/* Crazy Capy */}
        {sim.crazyCapy && (
          <CapySprite
            capy={sim.crazyCapy}
            boardCenterX={scene.boardCenterX}
            boardWidth={scene.boardWidth}
            boardHeight={scene.boardHeight}
          />
        )}
      </div>
    </div>
  );
}
