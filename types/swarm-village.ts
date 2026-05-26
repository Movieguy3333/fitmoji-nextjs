// Swarm Village Foundation types
export type SwarmVillageFoundation =
  | "grass"
  | "grass_path_a"
  | "grass_path_b"
  | "grass_path_c"
  | "grass_path_d"
  | "grass_path_e"
  | "grass_path_f"
  | "grass_path_g"
  | "grass_path_h"
  | "grass_path_i"
  | "grass_path_j"
  | "soil"
  | false;

export type SwarmVillageWallType = "stone" | "wood" | null;

export type SwarmVillageUnit =
  | "boxer"
  | "tennis"
  | "quarterback"
  | "house"
  | "windmill"
  | "capybara_statue"
  | "prizes"
  | "chest"
  | null;

export type SwarmVillageRotation = 0 | 1 | 2 | 3;

export type SwarmVillageBoardCell = {
  foundation: SwarmVillageFoundation;
  wallHeight: number;
  wallHp: number;
  wallMaxHp: number;
  wallType: SwarmVillageWallType;
  wallRotation: SwarmVillageRotation;
  soilPlacedAt: number | null;
  soilStartSwarmCompletionCount: number | null;
  unit: SwarmVillageUnit;
  unitHp: number;
  unitMaxHp: number;
  unitLevel: number;
  unitLastAttackAt: number;
  unitFacingScaleX: 1 | -1;
  unitRotation: SwarmVillageRotation;
  unitRewardBaselineCompletionCount: number | null;
};

export type SwarmVillageMapSnapshot = {
  id: string;
  uid: string | null;
  displayName: string | null;
  board: SwarmVillageBoardCell[];
  gridCols: number;
  swarmCompletionCount: number;
  status: string | null;
  waveSize: number | null;
  waveDefeated: number | null;
  updatedAt: string | null;
};
