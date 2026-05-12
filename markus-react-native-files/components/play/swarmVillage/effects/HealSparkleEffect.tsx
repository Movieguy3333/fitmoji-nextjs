import { TILE_HEIGHT, TILE_WIDTH } from '@/components/play/swarmVillage/model/constants';
import type { HealSparkle } from '@/components/play/swarmVillage/model/types';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated } from 'react-native';

type IsoPositionFn = (row: number, col: number, elevation?: number) => {
  left: number;
  top: number;
};

type HealSparkleEffectProps = {
  sparkle: HealSparkle;
  isoPositionFn: IsoPositionFn;
  onComplete: (id: number) => void;
};

const HealSparkleEffect = React.memo(
  ({ sparkle, isoPositionFn, onComplete }: HealSparkleEffectProps) => {
    const anim = useRef(new Animated.Value(0)).current;

    const particles = useMemo(
      () =>
        Array.from({ length: 10 }, (_, i) => ({
          angle: (i / 10) * Math.PI * 2,
          radius: 18 + Math.random() * 16,
          size: 5 + Math.random() * 6,
          bright: i % 2 === 0,
        })),
      [],
    );

    useEffect(() => {
      Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }).start(() =>
        onComplete(sparkle.id),
      );
    }, []);

    const pos = isoPositionFn(sparkle.row, sparkle.col, 1);
    const cx = pos.left + TILE_WIDTH / 2;
    const cy = pos.top + TILE_HEIGHT / 2 - 8;
    const isUpgradeSparkle = sparkle.variant === 'upgrade';
    const glowColor = isUpgradeSparkle ? 'rgba(59,130,246,0.34)' : 'rgba(74,222,128,0.3)';
    const brightParticleColor = isUpgradeSparkle ? '#60a5fa' : '#4ade80';
    const softParticleColor = isUpgradeSparkle ? '#93c5fd' : '#86efac';
    const particleShadowColor = isUpgradeSparkle ? '#2563eb' : '#22c55e';

    const glowOpacity = anim.interpolate({ inputRange: [0, 0.2, 0.6, 1], outputRange: [0, 0.7, 0.35, 0] });
    const glowScale = anim.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.4, 1.8, 2.6] });

    return (
      <>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: cx - 24,
            top: cy - 24,
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: glowColor,
            zIndex: 590,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          }}
        />
        {particles.map((p, i) => {
          const dx = Math.cos(p.angle) * p.radius;
          const dy = Math.sin(p.angle) * p.radius;
          const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
          const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [0, dy - 8] });
          const op = anim.interpolate({ inputRange: [0, 0.15, 0.55, 1], outputRange: [0, 1, 0.75, 0] });
          const sc = anim.interpolate({ inputRange: [0, 0.25, 0.7, 1], outputRange: [0.2, 1.3, 1, 0] });

          return (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: cx - p.size / 2,
                top: cy - p.size / 2,
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
                backgroundColor: p.bright ? brightParticleColor : softParticleColor,
                shadowColor: particleShadowColor,
                shadowOpacity: 0.9,
                shadowRadius: 6,
                zIndex: 600,
                opacity: op,
                transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
              }}
            />
          );
        })}
      </>
    );
  },
);

export default HealSparkleEffect;
