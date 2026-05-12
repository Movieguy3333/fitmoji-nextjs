import {
  buildNeighborhoodSeedFromPresetDefinition,
  type NeighborhoodPresetDefinition,
} from '@/lib/game/swarmVillageNeighborhood';

const RAW_PRESET_DEFINITIONS = [
  require('@/data/swarmVillageNeighborhoodPresets/quiet-loop.json') as NeighborhoodPresetDefinition,
  require('@/data/swarmVillageNeighborhoodPresets/main-street.json') as NeighborhoodPresetDefinition,
  require('@/data/swarmVillageNeighborhoodPresets/corner-block.json') as NeighborhoodPresetDefinition,
  require('@/data/swarmVillageNeighborhoodPresets/cul-de-sac.json') as NeighborhoodPresetDefinition,
] as const;

export const SWARM_VILLAGE_NEIGHBORHOOD_PRESETS = RAW_PRESET_DEFINITIONS.map((definition) => ({
  ...definition,
  seed: buildNeighborhoodSeedFromPresetDefinition(definition),
}));

export type SwarmVillageNeighborhoodPresetOption =
  (typeof SWARM_VILLAGE_NEIGHBORHOOD_PRESETS)[number];
