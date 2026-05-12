import {
  CHEST_REQUIRED_FULL_HEALTH_HOMES,
  CHEST_STREAK_REQUIREMENT,
  SOIL_SWARM_TARGET,
  WINDMILL_SWARM_TARGET,
} from '@/components/play/swarmVillage/model/costs';
import type { BoardCell } from '@/components/play/swarmVillage/model/types';

export const getSoilSwarmProgress = (cell: BoardCell, swarmCompletionCount: number) => {
  if (cell.foundation !== 'soil') return 0;
  const baseline =
    typeof cell.soilStartSwarmCompletionCount === 'number' && Number.isFinite(cell.soilStartSwarmCompletionCount)
      ? Math.max(0, Math.floor(cell.soilStartSwarmCompletionCount))
      : swarmCompletionCount;
  return Math.max(0, swarmCompletionCount - baseline);
};

export const isSoilCropReady = (cell: BoardCell, swarmCompletionCount: number) =>
  getSoilSwarmProgress(cell, swarmCompletionCount) >= SOIL_SWARM_TARGET;

export const getWindmillSwarmProgress = (cell: BoardCell, swarmCompletionCount: number) => {
  if (cell.unit !== 'windmill') return 0;
  const baseline =
    typeof cell.unitRewardBaselineCompletionCount === 'number' && Number.isFinite(cell.unitRewardBaselineCompletionCount)
      ? Math.max(0, Math.floor(cell.unitRewardBaselineCompletionCount))
      : swarmCompletionCount;
  return Math.max(0, swarmCompletionCount - baseline);
};

export const isWindmillRewardReady = (cell: BoardCell, swarmCompletionCount: number) =>
  getWindmillSwarmProgress(cell, swarmCompletionCount) >= WINDMILL_SWARM_TARGET;

export const getChestSwarmProgress = (cell: BoardCell, swarmCompletionCount: number) => {
  if (cell.unit !== 'chest') return 0;
  const baseline =
    typeof cell.unitRewardBaselineCompletionCount === 'number' && Number.isFinite(cell.unitRewardBaselineCompletionCount)
      ? Math.max(0, Math.floor(cell.unitRewardBaselineCompletionCount))
      : swarmCompletionCount;
  return Math.max(0, swarmCompletionCount - baseline);
};

export const isChestRewardReady = (cell: BoardCell, swarmCompletionCount: number, fullHealthHomeCount: number) =>
  fullHealthHomeCount >= CHEST_REQUIRED_FULL_HEALTH_HOMES &&
  getChestSwarmProgress(cell, swarmCompletionCount) >= CHEST_STREAK_REQUIREMENT;

