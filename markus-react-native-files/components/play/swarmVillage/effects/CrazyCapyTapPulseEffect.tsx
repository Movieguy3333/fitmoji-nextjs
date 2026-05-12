import { sceneStyles } from '@/components/play/swarmVillage/styles/scene';
import { TILE_HEIGHT, TILE_WIDTH } from '@/components/play/swarmVillage/model/constants';
import type { CrazyCapyTapPulse } from '@/components/play/swarmVillage/model/types';
import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

type IsoPositionFn = (row: number, col: number, elevation?: number) => {
  left: number;
  top: number;
};

type CrazyCapyTapPulseEffectProps = {
  pulse: CrazyCapyTapPulse;
  isoPositionFn: IsoPositionFn;
  onComplete: (id: number) => void;
};

const CrazyCapyTapPulseEffect = React.memo(
  ({ pulse, isoPositionFn, onComplete }: CrazyCapyTapPulseEffectProps) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: true }).start(() =>
        onComplete(pulse.id),
      );
    }, [anim, onComplete, pulse.id]);

    const pos = isoPositionFn(pulse.row, pulse.col, 0.2);
    const opacity = anim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.95, 0.75, 0] });
    const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.25] });

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          sceneStyles.crazyCapyTapPulse,
          {
            left: pos.left + TILE_WIDTH / 2 - 22,
            top: pos.top + TILE_HEIGHT / 2 - 22,
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={sceneStyles.crazyCapyTapPulseRing} />
        <View style={sceneStyles.crazyCapyTapPulseCore} />
      </Animated.View>
    );
  },
);

export default CrazyCapyTapPulseEffect;
