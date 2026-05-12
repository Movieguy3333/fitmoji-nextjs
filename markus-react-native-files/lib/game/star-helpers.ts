import type {
    HealthMetricKey,
    HealthMetrics,
    MapNode,
    NodeCompletionCriterion,
    NodeMissionRewardRange,
    StarRating,
} from './types';

/**
 * Returns the threshold amount for a given star tier on a criterion.
 */
export function getCriterionAmountByStar(
  criterion: NodeCompletionCriterion,
  stars: 1 | 2 | 3,
): number {
  if (stars === 3) return criterion.threeStarAmount || 0;
  if (stars === 2) return criterion.twoStarAmount || 0;
  return criterion.oneStarAmount || 0;
}

/**
 * Computes how many stars the player has earned for a node given current
 * delta metrics (current - baseline). Returns 0 if no criteria are met.
 */
export function getNodeStarsEarned(
  criteria: NodeCompletionCriterion[] | undefined,
  metrics: Partial<HealthMetrics>,
): StarRating {
  if (!criteria || criteria.length === 0) return 3;

  for (const stars of [3, 2, 1] as const) {
    const meets = criteria.every(
      (c) => (metrics[c.metric] ?? 0) >= getCriterionAmountByStar(c, stars),
    );
    if (meets) return stars;
  }

  return 0;
}

/**
 * Returns the currency reward amount for a node at a given star tier.
 */
export function getRewardAmountByStar(
  reward: NodeMissionRewardRange,
  stars: StarRating,
): number {
  if (stars === 3) return reward.threeStarAmount ?? 0;
  if (stars === 2) return reward.twoStarAmount ?? 0;
  if (stars === 1) return reward.oneStarAmount ?? 0;
  return 0;
}

/**
 * Computes all currency rewards for completing a node at a given star rating.
 * Returns a map of currencyId → amount.
 */
export function computeNodeRewards(
  node: MapNode,
  stars: StarRating,
): Record<string, number> {
  const rewards: Record<string, number> = {};
  if (!node.missionRewardRanges || stars === 0) return rewards;

  for (const range of node.missionRewardRanges) {
    const amount = getRewardAmountByStar(range, stars);
    if (amount > 0) {
      rewards[range.currencyId] = amount;
    }
  }
  return rewards;
}

/**
 * Computes delta metrics: current - baseline, floored at 0.
 */
export function computeDeltaMetrics(
  current: HealthMetrics,
  baseline: HealthMetrics,
): HealthMetrics {
  return {
    steps: Math.max(0, current.steps - baseline.steps),
    activeCalories: Math.max(0, current.activeCalories - baseline.activeCalories),
    exerciseMinutes: Math.max(0, current.exerciseMinutes - baseline.exerciseMinutes),
    flightsClimbed: Math.max(0, current.flightsClimbed - baseline.flightsClimbed),
  };
}

/**
 * Determines node type based on cumulative steps and completion history.
 */
export function resolveNodeType(
  node: MapNode,
  cumulativeSteps: number,
  starsEarned: StarRating | undefined,
): 'locked' | 'unlocked' | 'completed' {
  if (starsEarned && starsEarned > 0) return 'completed';
  if (cumulativeSteps >= node.minSteps) return 'unlocked';
  return 'locked';
}

/**
 * Returns the total number of stars available across all nodes on a map.
 */
export function getTotalAvailableStars(nodes: MapNode[]): number {
  return nodes.length * 3;
}

/**
 * Returns the total stars earned across all nodes for a map.
 */
export function getTotalEarnedStars(
  nodeStars: Record<number, StarRating> | undefined,
): number {
  if (!nodeStars) return 0;
  return Object.values(nodeStars).reduce((sum, s) => sum + s, 0);
}

/**
 * Given per-metric progress and the node criteria, returns the progress
 * fraction (0..1) for a specific metric toward a specific star tier.
 */
export function getMetricProgress(
  criterion: NodeCompletionCriterion,
  currentValue: number,
  targetStars: 1 | 2 | 3,
): number {
  const target = getCriterionAmountByStar(criterion, targetStars);
  if (target <= 0) return 1;
  return Math.min(1, currentValue / target);
}

/**
 * Returns human-readable label for a health metric.
 */
export function getMetricLabel(metric: HealthMetricKey): string {
  switch (metric) {
    case 'steps': return 'Steps';
    case 'activeCalories': return 'Active Calories';
    case 'exerciseMinutes': return 'Exercise Minutes';
    case 'flightsClimbed': return 'Flights Climbed';
  }
}

/**
 * Returns a metric icon emoji for display.
 */
export function getMetricIcon(metric: HealthMetricKey): string {
  switch (metric) {
    case 'steps': return '👟';
    case 'activeCalories': return '🔥';
    case 'exerciseMinutes': return '⏱️';
    case 'flightsClimbed': return '🪜';
  }
}
