import { VillagePageClient } from "@/components/village-page-client";
import { normalizeSwarmVillageBoard } from "@/lib/swarm-village/render";
import type { SwarmVillageMapSnapshot } from "@/types/swarm-village";

const GRID_ROWS = 20;
const GRID_COLS = 9;

function buildDevBoard() {
  const cells: unknown[] = Array.from({ length: GRID_ROWS * GRID_COLS }, () => ({
    foundation: "grass",
  }));

  const set = (row: number, col: number, data: object) => {
    cells[row * GRID_COLS + col] = { foundation: "grass", ...data };
  };

  // Stone wall spanning cols 2–6 at row 14 — wide enough that most enemies
  // must smash through rather than walk around, triggering the smash animation.
  for (const col of [2, 3, 4, 5, 6]) {
    set(14, col, { wallHeight: 1, wallType: "stone", wallHp: 20 });
  }

  // Combat trees behind the wall — will trade blows with enemies that break through.
  set(9, 3, { unit: "tennis" });
  set(9, 4, { unit: "boxer" });
  set(9, 5, { unit: "tennis" });

  // House close to the castle as a last line.
  set(5, 4, { unit: "house" });

  return normalizeSwarmVillageBoard(cells, GRID_COLS);
}

const MOCK_MAP: SwarmVillageMapSnapshot = {
  id: "dev",
  uid: null,
  displayName: "Dev Player",
  board: buildDevBoard(),
  gridCols: GRID_COLS,
  swarmCompletionCount: 0,
  status: null,
  waveSize: null,
  waveDefeated: null,
  updatedAt: null,
};

export default function DevPage() {
  return (
    <main className="relative h-[100svh] min-h-[38rem] overflow-hidden bg-[#245971] text-[#231f20]">
      <VillagePageClient
        map={MOCK_MAP}
        playerName="Dev Player"
        villageName="Animation Test Village"
        tagline="Stone wall at row 14 · Boxer + Tennis at row 9 · House at row 5"
      />
    </main>
  );
}
