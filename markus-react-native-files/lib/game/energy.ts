import type { HealthMetrics } from '@/lib/game/types';

export type SeasonalEnergyMetrics = Pick<HealthMetrics, 'steps' | 'activeCalories' | 'exerciseMinutes'>;

export type EnergyModifierContext = {
  seasonalEnergyCap?: number | null;
  seasonalEnergyOffset?: number | null;
};

export const ENERGY_WEIGHTS_V1 = {
  activeCalories: 4,
  exerciseMinutes: 20,
  stepsDivisor: 10,
} as const;

export const ENERGY_COSTS = {
  heal: 50,
  mapExpansion: 5000,
  villageGrass: 50,
  villageSoil: 100,
  villageWall: 500,
  villageFence: 60,
  villageHouse: 1000,
  villageBoxer: 220,
  villageTennis: 200,
  villageQuarterback: 1000,
  villageWindmill: 1000,
  battlePlant: 50,
  battleUpgradeBoxer: 220,
  battleUpgradeTennis: 180,
  battleRock: 200,
  battleRockSmall: 50,
} as const;

export type EnergyBreakdown = {
  energy_from_calories: number;
  energy_from_minutes: number;
  energy_from_steps: number;
  energy_total: number;
};

const normalizeMetric = (value: number | undefined) =>
  Math.max(0, Math.floor(typeof value === 'number' && Number.isFinite(value) ? value : 0));

const getEnergyModifierContext = (context?: unknown): EnergyModifierContext | null => {
  if (!context || typeof context !== 'object') return null;
  return context as EnergyModifierContext;
};

export function getEnergyBreakdown(metrics: SeasonalEnergyMetrics): EnergyBreakdown {
  const activeCalories = normalizeMetric(metrics.activeCalories);
  const exerciseMinutes = normalizeMetric(metrics.exerciseMinutes);
  const steps = normalizeMetric(metrics.steps);

  const energyFromCalories = activeCalories * ENERGY_WEIGHTS_V1.activeCalories;
  const energyFromMinutes = exerciseMinutes * ENERGY_WEIGHTS_V1.exerciseMinutes;
  const energyFromSteps = Math.floor(steps / ENERGY_WEIGHTS_V1.stepsDivisor);

  return {
    energy_from_calories: energyFromCalories,
    energy_from_minutes: energyFromMinutes,
    energy_from_steps: energyFromSteps,
    energy_total: energyFromCalories + energyFromMinutes + energyFromSteps,
  };
}

export function applyEnergyModifiers(baseEnergy: number, context?: unknown): number {
  const modifierContext = getEnergyModifierContext(context);
  let energy = Math.max(0, Math.floor(baseEnergy));

  if (typeof modifierContext?.seasonalEnergyOffset === 'number' && Number.isFinite(modifierContext.seasonalEnergyOffset)) {
    energy = Math.max(0, energy - normalizeMetric(modifierContext.seasonalEnergyOffset));
  }

  if (typeof modifierContext?.seasonalEnergyCap === 'number' && Number.isFinite(modifierContext.seasonalEnergyCap)) {
    energy = Math.min(energy, normalizeMetric(modifierContext.seasonalEnergyCap));
  }

  return energy;
}

export function deriveSeasonalEnergy(metrics: SeasonalEnergyMetrics, context?: unknown): number {
  return applyEnergyModifiers(getEnergyBreakdown(metrics).energy_total, context);
}

export function getAvailableEnergy({
  seasonalMetrics,
  spentEnergy,
  context,
}: {
  seasonalMetrics: SeasonalEnergyMetrics;
  spentEnergy: number;
  context?: unknown;
}): number {
  return Math.max(0, deriveSeasonalEnergy(seasonalMetrics, context) - normalizeMetric(spentEnergy));
}

export function logEnergyBreakdown(source: string, metrics: SeasonalEnergyMetrics, context?: unknown): EnergyBreakdown {
  const breakdown = getEnergyBreakdown(metrics);
  const energyTotal = applyEnergyModifiers(breakdown.energy_total, context);
  const payload: EnergyBreakdown = {
    ...breakdown,
    energy_total: energyTotal,
  };
  //console.info('[Energy]', { source, ...payload });
  return payload;
}
