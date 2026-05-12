import SwarmVillageGame from '@/components/play/SwarmVillageGame';

type SwarmVillageSkiaDemoProps = {
  devForceNeighborhoodSetupToken?: number;
  devNeighborhoodLocationOverride?: {
    latitude: number;
    longitude: number;
  } | null;
  simulateWaveToken?: number;
  waveEnemyCount?: number;
  onExit?: () => void;
};

export default function SwarmVillageSkiaDemo({
  devForceNeighborhoodSetupToken,
  devNeighborhoodLocationOverride,
  onExit,
}: SwarmVillageSkiaDemoProps) {
  return (
    <SwarmVillageGame
      devForceNeighborhoodSetupToken={devForceNeighborhoodSetupToken}
      devNeighborhoodLocationOverride={devNeighborhoodLocationOverride}
      renderMode="skia"
      onExit={onExit}
    />
  );
}
