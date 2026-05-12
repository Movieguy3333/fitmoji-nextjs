import {
  QUARTERBACK_EXPLOSION_MS,
  TILE_HEIGHT,
  TILE_WIDTH,
} from '@/components/play/swarmVillage/model/constants';
import type { FootballExplosionEffect } from '@/components/play/swarmVillage/model/types';
import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

type IsoPositionFn = (row: number, col: number, elevation?: number) => {
  left: number;
  top: number;
};

type FootballExplosionEffectViewProps = {
  effect: FootballExplosionEffect;
  isoPositionFn: IsoPositionFn;
  onComplete: (id: number) => void;
};

const FootballExplosionEffectView = React.memo(
  ({ effect, isoPositionFn, onComplete }: FootballExplosionEffectViewProps) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(anim, { toValue: 1, duration: QUARTERBACK_EXPLOSION_MS, useNativeDriver: true }).start(() =>
        onComplete(effect.id),
      );
    }, [anim, effect.id, onComplete]);

    const pos = isoPositionFn(effect.row, effect.col, 0.62);
    const cx = pos.left + TILE_WIDTH / 2;
    const cy = pos.top + TILE_HEIGHT / 2 - 12;
    const coreOpacity = anim.interpolate({ inputRange: [0, 0.18, 0.65, 1], outputRange: [0, 0.95, 0.45, 0] });
    const ringOpacity = anim.interpolate({ inputRange: [0, 0.24, 1], outputRange: [0.9, 0.72, 0] });
    const coreScale = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.35, 1.2, 1.7] });
    const ringScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 2.4] });

    return (
      <>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: cx - 28,
            top: cy - 28,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: 'rgba(251,146,60,0.48)',
            shadowColor: '#f97316',
            shadowOpacity: 0.9,
            shadowRadius: 14,
            zIndex: 650,
            opacity: coreOpacity,
            transform: [{ scale: coreScale }],
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: cx - 34,
            top: cy - 34,
            width: 68,
            height: 68,
            borderRadius: 34,
            borderColor: 'rgba(254,243,199,0.92)',
            borderWidth: 3,
            zIndex: 651,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          }}
        />
      </>
    );
  },
);

export default FootballExplosionEffectView;
