import { totalEarnedStarsFromGameState } from '@/lib/play/starRewardCelebration';
import type { StarRating } from '@/lib/game/types';

import { ERASE_REFUND_RATE, ITEM_COSTS } from '@/components/play/swarmVillage/model/costs';
import type {
  CachedGameStateSnapshot,
  CachedVillageTestOverrides,
  Tool,
} from '@/components/play/swarmVillage/model/types';

import { clamp, parseStoredPositiveInt } from './utils';

export const getRefundAmountForHpRatio = (baseCost: number, currentHp: number | null | undefined, maxHp: number | null | undefined) => {
  const normalizedBaseCost = Math.max(0, Math.floor(baseCost));
  if (normalizedBaseCost <= 0) return 0;
  const normalizedCurrentHp =
    typeof currentHp === 'number' && Number.isFinite(currentHp)
      ? Math.max(0, currentHp)
      : null;
  const normalizedMaxHp =
    typeof maxHp === 'number' && Number.isFinite(maxHp)
      ? Math.max(0, maxHp)
      : null;

  const hpRatio =
    normalizedCurrentHp == null ||
      normalizedMaxHp == null ||
      normalizedMaxHp <= 0
      ? 1
      : clamp(normalizedCurrentHp / normalizedMaxHp, 0, 1);

  return Math.max(0, Math.round(normalizedBaseCost * ERASE_REFUND_RATE * hpRatio));
};

export const formatToolCostLabel = (tool: Exclude<Tool, 'erase' | 'heal'>) => ITEM_COSTS[tool].toLocaleString();

export const parseStarBalanceFromState = (
  gameState: CachedGameStateSnapshot | null | undefined,
  testOverrides: CachedVillageTestOverrides | null | undefined,
) => {
  const nodeStarsRaw = gameState?.nodeStars ?? {};
  const nodeStars: Record<number, StarRating> = {};
  for (const [key, value] of Object.entries(nodeStarsRaw)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    nodeStars[Number(key)] = Math.max(0, Math.min(3, Math.floor(value))) as StarRating;
  }
  const partyBonusStarsBank = parseStoredPositiveInt(gameState?.partyBonusStarsBank);
  const starsSpent = parseStoredPositiveInt(gameState?.starsSpent);
  const testOverrideStars = parseStoredPositiveInt(testOverrides?.stars);
  return Math.max(0, totalEarnedStarsFromGameState({
    nodeStars,
    testOverrideStars,
    partyBonusStarsBank,
  }) - starsSpent);
};

