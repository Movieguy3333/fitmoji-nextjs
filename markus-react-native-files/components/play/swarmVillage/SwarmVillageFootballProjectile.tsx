import {
  getFootballLaceFlipScaleY,
  getFootballScreenAngle,
} from '@/components/play/swarmVillage/domain/football';
import { FOOTBALL_IMAGE } from '@/components/play/swarmVillage/model/assets';
import type { Projectile } from '@/components/play/swarmVillage/model/types';
import { sceneStyles } from '@/components/play/swarmVillage/styles/scene';
import { Image } from 'react-native';

type SwarmVillageFootballProjectileProps = {
  dimmed: boolean;
  left: number;
  nowMs: number;
  projectile: Pick<Projectile, 'launchedAtMs' | 'velCol' | 'velRow'>;
  top: number;
};

export default function SwarmVillageFootballProjectile({
  dimmed,
  left,
  nowMs,
  projectile,
  top,
}: SwarmVillageFootballProjectileProps) {
  const screenAngle = getFootballScreenAngle(projectile);
  const laceFlipScaleY = getFootballLaceFlipScaleY(nowMs, projectile.launchedAtMs);

  return (
    <Image
      source={FOOTBALL_IMAGE}
      resizeMode="contain"
      style={[
        sceneStyles.footballProjectile,
        {
          left,
          top,
          zIndex: 420,
          opacity: dimmed ? 0.5 : 1,
          transform: [
            { rotate: `${screenAngle}rad` },
            { scaleY: laceFlipScaleY },
          ],
        },
      ]}
    />
  );
}
