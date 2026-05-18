# Implementation prompt: tile placement & deletion for Swarm Village

You are adding a feature to the Fitmoji web app that lets the player click any
tile on the swarm-village board to place a unit (`boxer`, `tennis`,
`quarterback`, or `wall`) or delete a unit they previously placed. The user
told me the feature should "live in
`/Users/meedo/Desktop/Projects/fitmoji-nextjs/app/village/[mapId]/page.tsx`",
but `page.tsx` is just a Server Component that fetches data and renders
`VillagePageClient`. The actual placement surface is in the client components
below — touch them, not `page.tsx`.

---

## 1. Codebase orientation

Read these files before you change anything:

- `app/village/[mapId]/page.tsx` — Server Component. Fetches the map, renders
  `<VillagePageClient map={swarmMap} ... />`. **Do not add interactive logic
  here.**
- `components/village-page-client.tsx` — Client Component. Owns
  `controls: SimControls`, `swarmStatus: BattleStatus`, and the launch/stop
  button. It passes `controls` and `map` into `SwarmVillageLiveScene`. This is
  where placement state belongs (tool selection + edited board).
- `components/swarm-village-live-scene.tsx` — Renders the iso board. Calls
  `useSwarmSimulation({ initialBoard: map.board, gridCols, controls })`.
  Sprites are absolutely positioned inside a div whose width is
  `min(132vw, ${aspect * 100}svh)` with a fixed aspect ratio. This is where
  tile click handling and hover highlight belong.
- `lib/swarm-village/sim/useSwarmSimulation.ts` — The sim loop. **Critical:** a
  `useEffect([initialBoard, gridCols])` rebuilds `boardRef.current` from
  `initialBoard` whenever its reference changes, **and resets enemies,
  projectiles, ship HP, and status to 'ready'.** Mid-wave board edits via a
  new `initialBoard` will therefore clobber the wave. Plan accordingly (see
  Design Decisions below).
- `lib/swarm-village/sim/types.ts` — `SwarmVillageBoardCell` shape, `Enemy`,
  `BattleStatus = 'ready' | 'wave' | 'cleared' | 'lost'`.
- `types/swarm-village.ts` — Canonical cell type. Note `unit` can be
  `'boxer' | 'tennis' | 'quarterback' | 'house' | 'windmill' |
  'capybara_statue' | 'prizes' | 'chest' | null`, and walls are encoded as
  `wallType: 'stone' | 'wood' | null` plus `wallHeight: number` (0 = no wall,
  max 4) plus `wallHp` / `wallRotation`.
- `lib/swarm-village/sim/units.ts` — `getUnitMaxHp(unit, level)`,
  `getWallMaxHp(wallType)`, `getCombatUnitDamage`, etc. Use these when
  initializing a freshly-placed cell so HP fields are correct.
- `lib/swarm-village/sim/constants.ts` — Exports `GRID_ROWS = 20`,
  `TILE_WIDTH = 74`, `TILE_HEIGHT = 38`, `HALF_W`, `HALF_H`,
  `BOARD_TOP_INSET = 134`, `isCastleCell(r,c)`, `isStarterHomeCell(r,c)`,
  `isHomeReservedCell(r,c)`. Use the helpers — don't reimplement reserved-cell
  logic.
- `lib/swarm-village/render.ts` — `buildSwarmVillageScene` lays out sprites.
  It uses `isoPosition(geometry, row, col, elevation = 0)` which returns
  `{ left: boardCenterX + (col - row)*HALF_W - HALF_W, top: BOARD_TOP_INSET +
  (col + row)*HALF_H - elevation*VOXEL_HEIGHT }`. Inverse-iso math for hit
  testing is given in §5 below.

The grid is 20 rows × `map.gridCols` cols (defaults to 9). The board is a flat
`SwarmVillageBoardCell[]` indexed `row * gridCols + col`.

---

## 2. Feature specification

A floating toolbar (positioned similarly to the existing
`SwarmSimControls` gear panel — top-right area, `z-[900]` or so) lets the
player pick one of six tools:

1. Boxer
2. Tennis
3. Quarterback
4. Wall — stone
5. Wall — wood
6. Delete (eraser)

Clicking a tile on the board:

- With a unit tool selected → place that unit on the tile, if the tile is
  legal (see Design Decisions §3).
- With a wall tool selected → set `wallType` + `wallHeight = 1` on the tile,
  if legal.
- With Delete selected → remove any unit and/or wall the player previously
  placed on that tile. Pre-existing units and walls from `map.board` are
  immutable.
- Tile is illegal → no-op (visual feedback optional — a quick red flash is a
  nice-to-have, not required).

Hover state: highlight the tile under the cursor (a subtle tinted overlay
diamond is enough). If the cell is illegal under the current tool, tint it
red; otherwise green.

The toolbar should also show a "Reset placements" button that wipes all
player-placed cells back to map defaults.

---

## 3. Design decisions (defaults — flip if you disagree)

```
// DECISION 1: Placement is only allowed when swarmStatus === 'ready'.
// During an active wave, the toolbar is disabled and tile clicks are ignored.
// Rationale: useSwarmSimulation rebuilds its boardRef from initialBoard on
// every change to that reference, which resets the wave. The simplest and
// safest path is to edit only between waves.
```

```
// DECISION 2: Placements are in-memory for this session only. Refreshing
// the page reverts to map.board from the server. No Firestore writes.
```

```
// DECISION 3: Legal tiles are cells where, in the ORIGINAL map.board,
// foundation is grass/path/soil (not false), no unit is present, and
// wallHeight is 0. Also block isHomeReservedCell(row, col). The player can
// only place on cells that started empty.
```

```
// DECISION 4: Walls placed by the player always have wallHeight = 1.
// (No stacking from this UI.) If the user wants taller walls, that's a
// future feature.
```

```
// DECISION 5: Delete only removes player placements. Track this with a
// Set<string> of "row-col" keys for placed cells. A delete on a cell not in
// the set is a no-op.
```

---

## 4. Implementation plan

### 4a. State in `VillagePageClient`

Add:

```ts
type PlacementTool =
  | 'boxer' | 'tennis' | 'quarterback'
  | 'wall_stone' | 'wall_wood'
  | 'delete'
  | null; // null = no tool selected, clicks are inert

const [tool, setTool] = useState<PlacementTool>(null);
const [placedKeys, setPlacedKeys] = useState<Set<string>>(() => new Set());
const [editedBoard, setEditedBoard] = useState<SwarmVillageBoardCell[]>(
  () => map.board.map((c) => ({ ...c })),
);
```

Pass `editedBoard` (NOT `map.board`) into `<SwarmVillageLiveScene ... map={{
...map, board: editedBoard }}>` so the simulation reads from it.

Add two callbacks:

```ts
function handleTilePlace(row: number, col: number) {
  if (swarmStatus !== 'ready' || !tool) return;
  // legality check using map.board (original) + placedKeys
  // mutate editedBoard immutably, update placedKeys
}

function handleResetPlacements() {
  setEditedBoard(map.board.map((c) => ({ ...c })));
  setPlacedKeys(new Set());
}
```

Disable the toolbar visually when `swarmStatus !== 'ready'`.

### 4b. Toolbar component

Create `components/swarm-placement-toolbar.tsx`. Mirror the gear-panel
positioning pattern in `SwarmSimControls`. Props:

```ts
type Props = {
  tool: PlacementTool;
  onToolChange: (t: PlacementTool) => void;
  onReset: () => void;
  disabled: boolean; // true when swarmStatus !== 'ready'
};
```

Six tool buttons + a reset button. Highlight the selected tool. Clicking the
selected tool again deselects it (sets to `null`).

### 4c. Click + hover in `SwarmVillageLiveScene`

Add new props:

```ts
onTileClick?: (row: number, col: number) => void;
hoverTintForTile?: (row: number, col: number) => 'legal' | 'illegal' | null;
```

The board container is the `<div>` with `style={{ aspectRatio: ... }}`. Wire
`onPointerMove` + `onPointerLeave` + `onClick` on that div:

1. Compute `(row, col)` from the pointer event (math in §5).
2. On move, store the hovered `(row, col)` in local state and render a
   diamond overlay at that cell (use the existing `isoPosition` math and the
   `toLayerStyle` helper).
3. On click, call `onTileClick(row, col)`.
4. Make sure the overlay diamond has `pointer-events: none` so it doesn't
   eat the click.

`pointer-events` audit: today many sprites have `pointerEvents: 'none'` and
some don't. Walk the existing sprite styles and confirm none capture clicks
above the board container, or set `pointer-events: none` on all sprites and
listen only on the container. The simpler path is the latter.

### 4d. Wire `VillagePageClient` to the scene

```tsx
<SwarmVillageLiveScene
  map={{ ...map, board: editedBoard }}
  // ...
  onTileClick={handleTilePlace}
  hoverTintForTile={(r, c) => /* legal/illegal/null based on tool */}
/>
<SwarmPlacementToolbar
  tool={tool}
  onToolChange={setTool}
  onReset={handleResetPlacements}
  disabled={swarmStatus !== 'ready'}
/>
```

### 4e. Building a placed cell correctly

Use `getUnitMaxHp` and `getWallMaxHp` from `lib/swarm-village/sim/units.ts`
when building the new cell so HP fields are right and the existing renderer
draws the HP bar correctly. Example for placing a tennis:

```ts
const maxHp = getUnitMaxHp('tennis', 1);
nextBoard[idx] = {
  ...prev,
  unit: 'tennis',
  unitLevel: 1,
  unitHp: maxHp,
  unitMaxHp: maxHp,
  unitLastAttackAt: 0,
  unitFacingScaleX: 1,
  unitRotation: 0,
  unitRewardBaselineCompletionCount: null,
};
```

For a wall:

```ts
const wallType: SwarmVillageWallType = 'stone'; // or 'wood'
const wallMax = getWallMaxHp(wallType);
nextBoard[idx] = {
  ...prev,
  wallType,
  wallHeight: 1,
  wallHp: wallMax,
  wallRotation: 0,
};
```

For delete, restore from `map.board[idx]` (the original) so any pre-existing
content is preserved.

---

## 5. Tile hit testing (inverse iso)

The board container has fixed `boardWidth` × `boardHeight` pixel coordinates
(from `buildSwarmVillageScene`) but is rendered scaled to fit its responsive
container. Convert pointer events as follows:

```ts
function pointerToCell(
  ev: React.PointerEvent<HTMLDivElement>,
  boardEl: HTMLDivElement,
  boardWidth: number,
  boardHeight: number,
  boardCenterX: number,
  gridCols: number,
): { row: number; col: number } | null {
  const rect = boardEl.getBoundingClientRect();
  // pointer in board-pixel space:
  const px = ((ev.clientX - rect.left) / rect.width) * boardWidth;
  const py = ((ev.clientY - rect.top) / rect.height) * boardHeight;

  // isoPosition gives the top-left of the tile's TILE_WIDTH x TILE_HEIGHT
  // bounding box at (boardCenterX + (col - row) * HALF_W - HALF_W,
  //                  BOARD_TOP_INSET + (col + row) * HALF_H).
  // The tile center is offset by (HALF_W, HALF_H) from that point.
  const u = (px - boardCenterX) / HALF_W;            // ≈ col - row
  const v = (py - BOARD_TOP_INSET - HALF_H) / HALF_H; // ≈ col + row

  const col = Math.floor((u + v) / 2);
  const row = Math.floor((v - u) / 2);

  if (row < 0 || row >= GRID_ROWS) return null;
  if (col < 0 || col >= gridCols) return null;
  return { row, col };
}
```

`HALF_W`, `HALF_H`, `BOARD_TOP_INSET`, and `GRID_ROWS` are all exported from
`lib/swarm-village/sim/constants.ts`. Use the exports — do not redeclare.

Note: this math treats tiles as axis-aligned bounding boxes, not true
diamonds. That's fine for placement — clicks near a tile corner may land on a
neighbor, but the result is always a valid cell and feels acceptable. If you
want true diamond hit-testing, do an extra check against `|u + v - 2*col| +
|v - u - 2*row| <= 1` after the floor.

---

## 6. Verification checklist

Before declaring done, manually verify each of these in a dev build:

1. Toolbar renders, tools are mutually exclusive, clicking selected tool
   deselects.
2. Hover highlight appears on the correct tile across the whole grid,
   including edge tiles.
3. Click an empty grass tile with Boxer selected → boxer sprite appears,
   HP bar shows during a wave.
4. Place a wall with stone tool → stone wall renders at height 1.
5. Click a placed unit with Delete selected → it disappears, the cell
   reverts to grass.
6. Click a pre-existing house/windmill with Delete → no-op.
7. Click a castle-area tile with any unit tool → no-op (and red hover tint).
8. Launch a swarm → toolbar becomes disabled, tile clicks are ignored,
   placed units participate in combat correctly (boxers melee, tennis fires
   tennis balls, QBs throw footballs).
9. After a wave clears or is lost, status returns to 'ready' and the
   toolbar re-enables. Placed units are still there.
10. "Reset placements" wipes everything the player added but leaves the
    original map intact.
11. No TypeScript errors. No React `key` warnings. Run the project's
    existing lint command.

---

## 7. Out of scope

- Persisting placements to Firestore or any backend.
- Upgrading placed units (unitLevel stays at 1).
- Stacking walls beyond `wallHeight = 1`.
- Rotation UI for walls/units.
- Mobile drag-to-paint placement (single-click only).
- Mid-wave placement.

If you think any of these are essential, stop and ask before implementing.
