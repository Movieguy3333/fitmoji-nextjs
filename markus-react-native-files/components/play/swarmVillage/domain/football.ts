import type { Projectile } from '@/components/play/swarmVillage/model/types';

export const FOOTBALL_SPIN_FLIPS_PER_SECOND = 6;

export const getFootballScreenAngle = (
  projectile: Pick<Projectile, 'velCol' | 'velRow'>,
) => Math.atan2(
  projectile.velRow + projectile.velCol,
  projectile.velCol - projectile.velRow,
);

export const getFootballLaceFlipScaleY = (
  nowMs: number,
  launchedAtMs: number | undefined,
) => {
  if (launchedAtMs == null) return 1;

  const elapsedSeconds = Math.max(0, nowMs - launchedAtMs) / 1000;
  return Math.cos(elapsedSeconds * FOOTBALL_SPIN_FLIPS_PER_SECOND * Math.PI) >= 0 ? 1 : -1;
};
