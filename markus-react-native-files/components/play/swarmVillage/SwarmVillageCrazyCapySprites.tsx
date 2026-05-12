import { getEnemySpriteSize } from '@/components/play/swarmVillage/domain/sprites';
import { clamp } from '@/components/play/swarmVillage/domain/utils';
import {
  CRAZY_CAPY_IMAGE,
  IJOM_IMAGE,
  IJOM_SNOW_IMAGE,
} from '@/components/play/swarmVillage/model/assets';
import {
  CRAZY_CAPY_KNOCKOUT_FLIGHT_MS,
  ENEMY_SPRITE_SIZE,
} from '@/components/play/swarmVillage/model/constants';
import type {
  CrazyCapyKnockoutEffect,
  CrazyCapyState,
} from '@/components/play/swarmVillage/model/types';
import { sceneStyles } from '@/components/play/swarmVillage/styles/scene';
import { Image, View } from 'react-native';

type IsoPositionFn = (row: number, col: number, elevation?: number) => {
  left: number;
  top: number;
};

type SwarmVillageCrazyCapySpriteProps = {
  crazyCapy: CrazyCapyState | null;
  dimmed: boolean;
  isoPosition: IsoPositionFn;
  nowMs: number;
};

export function SwarmVillageCrazyCapySprite({
  crazyCapy,
  dimmed,
  isoPosition,
  nowMs,
}: SwarmVillageCrazyCapySpriteProps) {
  if (!crazyCapy) return null;

  const pos = isoPosition(crazyCapy.row, crazyCapy.col, 0.7);
  const bob = Math.sin((nowMs - crazyCapy.spawnedAt) / 90) * 5;

  return (
    <View
      pointerEvents="none"
      style={[
        sceneStyles.crazyCapyWrap,
        {
          left: pos.left + 1,
          top: pos.top - 62 + bob,
          zIndex: 460 + Math.floor((crazyCapy.row + crazyCapy.col) * 10),
          opacity: dimmed ? 0.5 : 1,
          transform: [{ scaleX: crazyCapy.facingScaleX }],
        },
      ]}
    >
      <Image source={CRAZY_CAPY_IMAGE} resizeMode="contain" style={sceneStyles.crazyCapyImage} />
    </View>
  );
}

type SwarmVillageCrazyCapyKnockoutEffectsProps = {
  dimmed: boolean;
  effects: CrazyCapyKnockoutEffect[];
  isoPosition: IsoPositionFn;
  nowMs: number;
  spriteLeftOffset: number;
  spriteTopOffset: number;
};

export function SwarmVillageCrazyCapyKnockoutEffects({
  dimmed,
  effects,
  isoPosition,
  nowMs,
  spriteLeftOffset,
  spriteTopOffset,
}: SwarmVillageCrazyCapyKnockoutEffectsProps) {
  return (
    <>
      {effects.map((effect) => {
        const pos = isoPosition(effect.row, effect.col, 0.4);
        const progress = clamp((nowMs - effect.startedAt) / CRAZY_CAPY_KNOCKOUT_FLIGHT_MS, 0, 1);
        const travelX = effect.directionX * (42 + progress * 180);
        const travelY = -28 - Math.sin(progress * Math.PI) * 34 - progress * 152;
        const opacity = 1 - progress * 0.92;
        const rotation = `${effect.rotationDirection * progress * 430}deg`;
        const scale = 1 + (1 - progress) * 0.18;
        const spriteSize = getEnemySpriteSize(effect.variant);
        const spriteLeft = pos.left + spriteLeftOffset - (spriteSize - ENEMY_SPRITE_SIZE) / 2;
        const spriteTop = pos.top + spriteTopOffset - (spriteSize - ENEMY_SPRITE_SIZE);

        return (
          <View
            key={effect.id}
            pointerEvents="none"
            style={[
              sceneStyles.enemyWrap,
              {
                left: spriteLeft,
                top: spriteTop,
                width: spriteSize,
                zIndex: 520 + Math.floor((effect.row + effect.col) * 10),
                opacity: dimmed ? opacity * 0.5 : opacity,
                transform: [{ translateX: travelX }, { translateY: travelY }, { rotate: rotation }, { scale }],
              },
            ]}
          >
            <Image
              source={effect.variant === 'snow' ? IJOM_SNOW_IMAGE : IJOM_IMAGE}
              resizeMode="contain"
              style={[sceneStyles.enemyImage, { width: spriteSize, height: spriteSize }]}
            />
          </View>
        );
      })}
    </>
  );
}
