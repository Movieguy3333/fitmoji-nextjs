import type { CSSProperties } from "react";

import {
  buildSwarmVillageScene,
  SWARM_VILLAGE_DEFAULT_AVATAR_ASSET,
  SWARM_VILLAGE_HOME_ASSET,
} from "@/lib/swarm-village/render";
import type { SwarmVillageMapSnapshot } from "@/types/swarm-village";

type SwarmVillageMapProps = {
  map: SwarmVillageMapSnapshot;
  playerAvatarUrl?: string | null;
  playerName?: string | null;
  className?: string;
  presentation?: "card" | "viewer";
};

export function SwarmVillageMap({
  map,
  playerAvatarUrl,
  playerName,
  className = "",
  presentation = "card",
}: SwarmVillageMapProps) {
  const scene = buildSwarmVillageScene({
    board: map.board,
    gridCols: map.gridCols,
    swarmCompletionCount: map.swarmCompletionCount,
  });
  const avatarSrc = playerAvatarUrl ?? SWARM_VILLAGE_DEFAULT_AVATAR_ASSET;
  const label = `${playerName ?? map.displayName ?? "Fitmoji player"} village map`;
  const sceneAspect = scene.boardWidth / scene.boardHeight;
  const viewerWidthByHeight = `${(sceneAspect * 100).toFixed(2)}svh`;

  return (
    <div
      aria-label={label}
      className={`relative overflow-hidden bg-[#245971] ${
        presentation === "viewer"
          ? "h-full"
          : "rounded-lg border border-white/50 shadow-[0_26px_70px_rgba(38,70,83,0.2)]"
      } ${className}`}
      style={
        presentation === "viewer"
          ? undefined
          : { aspectRatio: `${scene.boardWidth} / ${scene.boardHeight}` }
      }
    >
      <div className="absolute inset-0 bg-linear-to-b from-[#1f6f91] via-[#48bbf0] to-[#a6dfbf]" />
      <div className="absolute inset-x-0 bottom-0 h-[34%] bg-linear-to-t from-[#315446]/55 to-transparent" />
      <div className="absolute bottom-[6%] left-[15%] h-[10%] w-[70%] rounded-[50%] bg-[#081018]/18 blur-xl" />

      <div
        className={
          presentation === "viewer"
            ? "absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2"
            : "absolute inset-0"
        }
        style={
          presentation === "viewer"
            ? {
                aspectRatio: `${scene.boardWidth} / ${scene.boardHeight}`,
                width: `min(132vw, ${viewerWidthByHeight})`,
              }
            : undefined
        }
      >
        {scene.sprites.map((sprite) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={sprite.id}
            src={sprite.src}
            alt=""
            draggable={false}
            className="absolute select-none object-contain"
            style={toSpriteStyle(sprite, scene.boardWidth, scene.boardHeight)}
          />
        ))}

        <div
          className="absolute rounded-full bg-[#081018]/0"
          style={toLayerStyle(
            scene.homeAvatarPlatform,
            scene.boardWidth,
            scene.boardHeight,
          )}
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SWARM_VILLAGE_HOME_ASSET}
          alt=""
          draggable={false}
          className="absolute select-none object-contain drop-shadow-[0_14px_18px_rgba(8,16,24,0.28)]"
          style={toLayerStyle(scene.homeBase, scene.boardWidth, scene.boardHeight)}
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarSrc}
          alt=""
          draggable={false}
          className="absolute select-none object-contain drop-shadow-[0_6px_8px_rgba(8,16,24,0.35)]"
          style={toLayerStyle(
            scene.homeAvatar,
            scene.boardWidth,
            scene.boardHeight,
          )}
        />
      </div>
    </div>
  );
}

function toSpriteStyle(
  sprite: {
    left: number;
    top: number;
    width: number;
    height: number;
    sortOrder: number;
    flipX: boolean;
  },
  boardWidth: number,
  boardHeight: number,
): CSSProperties {
  return {
    ...toBoxStyle(sprite, boardWidth, boardHeight),
    zIndex: 100 + Math.round(sprite.sortOrder),
    transform: sprite.flipX ? "scaleX(-1)" : undefined,
    transformOrigin: "center bottom",
  };
}

function toLayerStyle(
  layer: {
    left: number;
    top: number;
    width: number;
    height: number;
    zIndex: number;
  },
  boardWidth: number,
  boardHeight: number,
): CSSProperties {
  return {
    ...toBoxStyle(layer, boardWidth, boardHeight),
    zIndex: layer.zIndex,
  };
}

function toBoxStyle(
  box: { left: number; top: number; width: number; height: number },
  boardWidth: number,
  boardHeight: number,
): CSSProperties {
  return {
    height: `${(box.height / boardHeight) * 100}%`,
    left: `${(box.left / boardWidth) * 100}%`,
    top: `${(box.top / boardHeight) * 100}%`,
    width: `${(box.width / boardWidth) * 100}%`,
  };
}
