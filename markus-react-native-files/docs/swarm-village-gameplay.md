# Swarm Village Gameplay Guide

This document explains the current implementation of Swarm Village in [SwarmVillageGame.tsx](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/SwarmVillageGame.tsx).

Swarm Village now supports two render paths:

- the original React Native render path
- the Skia render path, enabled by `renderMode="skia"`

The Skia path is the preferred performance architecture for the live village board because it keeps the heavy isometric scene in a single canvas-driven renderer while preserving the existing game rules, HUD, tray, modals, persistence, first-time tour, and neighborhood setup logic.

Read this together with [energy-economy.md](/Users/markusproctor/Documents/Apps/mobile/fitmoji/docs/energy-economy.md) and [swarm-village-gasha-boxes.md](/Users/markusproctor/Documents/Apps/mobile/fitmoji/docs/swarm-village-gasha-boxes.md). Swarm Village is tightly coupled to activity-derived energy and to the Prize Machine meta loop.

## What The Mode Is

Swarm Village is a persistent isometric builder-plus-defense mode centered on `North Keep`.

The player loop is:

1. Earn energy from seasonal health data.
2. Build foundations, paths, walls, defenders, and reward structures.
3. Let the village avatar wander the path network between swarms.
4. Defend the castle during the next swarm window.
5. Earn stars from victory and reward structures.
6. Reinvest energy into a stronger or more expressive village.

## Core State And Persistence

The village is not a throwaway run.

Persisted state includes:

- board layout
- grid width
- spent energy
- swarm timing and streak progress
- total swarm completions
- first build timestamp
- Crazy Capy charge baseline calories

Current persistence model:

- local draft state is cached in AsyncStorage
- unsaved changes are tracked from serialized board plus spent energy
- manual save writes the current draft baseline
- starting a swarm with unsaved changes triggers a pre-swarm autosave path
- completed swarms also publish a saved snapshot

## Board Model

The board is a fixed-height isometric grid.

Current dimensions:

- `GRID_ROWS = 20`
- `DEFAULT_GRID_COLS = 9`

The castle footprint is fixed near the top-center. Core castle stat:

- `SHIP_MAX_HP = 180`

Each cell can hold:

- a `foundation`
- a stacked wall layer set
- one `unit`
- reward timers or progress metadata for soil, windmills, and chests

## Rendering Architecture

[SwarmVillageGame.tsx](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/SwarmVillageGame.tsx) remains the composition shell for the mode. The Skia route does not run a separate lightweight ruleset anymore; it mounts the real game with `renderMode="skia"` through [SwarmVillageSkiaDemo.tsx](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/SwarmVillageSkiaDemo.tsx).

Current split:

- screen-level state, placement orchestration, swarm simulation, tour flow, and neighborhood setup stay in `SwarmVillageGame`
- shared types, costs, constants, assets, cache keys, and tool definitions live under `components/play/swarmVillage/model/`
- pure board, combat, economy, pathing, reward, schedule, sprite, unit, Crazy Capy, football, and Forest Spirit helpers live under `components/play/swarmVillage/domain/`
- audio, Crazy Capy SFX, persistence, preview capture/upload, and notification side effects live under `components/play/swarmVillage/hooks/`
- the heavy board scene is drawn by [SwarmVillageSkiaScene.tsx](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/swarmVillage/SwarmVillageSkiaScene.tsx)
- the HUD, bottom tray, modals, tool inspect card, cell tooltip, gallery preview, projectile presentation, Crazy Capy visuals, and other app-style controls are React Native UI components under `components/play/swarmVillage/`
- panning in the Skia scene uses `react-native-gesture-handler` plus Reanimated shared values
- Skia draws the high-churn scene content: foundations, soil, walls, fences, structures, defenders, animated enemies, projectiles, ghost previews, HP bars, and reward-ready effects

This split exists because the village board behaves more like a sprite scene than a normal form-driven app screen. Keeping hundreds of tiles and animated sprites out of the React Native view tree dramatically reduces layout work, memory pressure, and heat during panning or active waves.

### Skia Scene Details

The Skia scene currently uses:

- `.webp` tile assets for grass, paths, and soil
- Skia image draws for placed structures and defenders
- animated GIF decoding for windmills and IJOM walk cycles
- `ijom-walk.gif` for regular IJOMs
- `snow-ijom.gif` for snow IJOMs
- a `1.3x` visual scale for snow IJOMs because they are treated as a mini-boss variant
- a real blurred Skia halo plus twinkle accents for reward-ready soil, windmills, and chests

The reward-ready glow is intentionally rendered with a diffused `BlurMask` layer instead of only modulating opacity on a flat oval. The goal is to preserve the old premium "stars available" feel while keeping the effect inside the canvas renderer.

### Placement Feedback

During drag placement, the target cell is highlighted so the player can see where the item will land.

Current behavior:

- hover highlight follows the cell under the dragged tool
- the placed cell is not left permanently yellow after a successful drop
- the drag ghost uses the same sprite metrics as the final placed object
- stone wall and wood fence sprites are tightened and centered so edge placements do not visibly hang off the board

## Foundations And Walking Paths

Foundations are the ground layer for village building. Most placed content requires a foundation first.

Current foundation set:

- `grass`
- `grass_path_a`
- `grass_path_b`
- `grass_path_c`
- `grass_path_d`
- `grass_path_e`
- `grass_path_f`
- `grass_path_g`
- `grass_path_h`
- `grass_path_i`
- `grass_path_j`
- `soil`

Gameplay meaning:

- `grass` is normal buildable ground
- path variants are also buildable ground, but they additionally create avatar walk lanes
- `soil` is a special foundation that can later produce stars

## Avatar Exploration On Paths

This is one of the newest village behaviors: connected walking paths let the player's avatar explore the village between swarms.

Current implementation details:

- only decorative path foundations count as walkable lanes
- plain `grass` does not create avatar walking routes
- the path tile must be empty: no wall and no unit on that tile
- adjacent path tiles must connect in both directions to count as a valid route
- the avatar does not wander during active swarms
- the avatar starts from the castle door, picks a connected path network, wanders for a while, then returns home

Current movement tuning:

- walk speed: `0.05` per tick
- idle delay before a walk begins: `4s` to `9s`
- wander length: `3` to `30` path steps
- pause between steps: `650ms` to `1600ms`

The avatar uses the player's gameplay avatar image when available, otherwise the profile photo, and finally the default village avatar art.

### Path Connectivity Rules

The path shapes are directional, not cosmetic-only.

Current connection map:

- `Path A` / `grass_path_a`: `col-1`, `col+1`
- `Path B` / `grass_path_b`: `row-1`, `row+1`
- `Path C` / `grass_path_c`: `row+1`, `col+1`
- `Path D` / `grass_path_d`: `row-1`, `row+1`, `col-1`, `col+1`
- `Path E` / `grass_path_e`: `row-1`, `row+1`, `col+1`
- `Path F` / `grass_path_f`: `row-1`, `row+1`, `col-1`
- `Path G` / `grass_path_g`: `row+1`, `col-1`
- `Path H` / `grass_path_h`: `row-1`, `col+1`
- `Path I` / `grass_path_i`: `row-1`, `col-1`
- `Path J` / `grass_path_j`: `row-1`, `col-1`, `col+1`

That means path layout now matters for more than decoration. If a tile is blocked or a neighboring connection does not match, the avatar will not use that route.

The direction names above are board-neighbor directions from `PATH_TRAVEL_DELTAS`, not screen cardinal directions. They must match the visible dirt openings in the tile art. A path tile that is merely adjacent to another path or soil tile does not count as connected unless its dirt shape opens toward that neighbor.

## Buildable Content

### Walls

#### Stone Wall

- cost: `500 energy`
- data model supports height up to `4`
- HP per top layer: `20`

Stone walls are the sturdier lane blockers.

#### Fence

- cost: `60 energy`
- data model supports height up to `4`
- HP per top layer: `6`

Fences are cheaper but much weaker.

Important wall behavior:

- only one wall type can occupy a cell at a time
- the current placement flow only allows placing a wall on an empty foundation tile
- walls do not stack on top of units
- when the top layer breaks, wall height drops by `1`
- the next surviving layer becomes the new active top layer

### Units

#### Boxer

- cost: `220 energy`
- level at placement: `1`
- level 1 HP: `135`
- level 1 damage: `10`
- range: about `1.15`
- cooldown: `1000 ms`

Role: close-range melee defender.

#### Tennis

- cost: `200 energy`
- level at placement: `1`
- level 1 HP: `115`
- level 1 damage: `2` per projectile hit
- range: `6`
- cooldown: `3000 ms`

Role: long-range projectile defender.

#### Quarterback

- cost: `1000 energy`
- level at placement: `1`
- level 1 HP: `150`
- level 1 damage: `5`
- range: `30`
- throw cooldown: `1200 ms`

Role: player-controlled artillery defender. Quarterback throws a football with an Angry Birds-style pull-back control instead of auto-firing like the other trees.

#### Tree Upgrades

Boxer, Tennis, and Quarterback trees can be upgraded after they have already been placed on the map.

Upgrade access:

- tap an existing Boxer, Tennis, or Quarterback tree on the map
- use the upgrade action in that tree's item tooltip
- the tooltip hides immediately after pressing upgrade so the level-up animation is visible

Upgrade costs:

- level `1`: default at placement
- level `2`: `2★` and `100 energy`
- level `3`: `3★` and `125 energy`
- level `4`: `4★` and `150 energy`

Each upgrade applies multiplicative scaling from the previous level:

- max HP increases by `20%`
- attack damage increases by `25.5%`
- sprite size increases by `20%`

Upgrading a damaged tree also restores `20%` of the new level's max HP, capped at that new max. If the tree was already full health, it upgrades to full HP at the new max.

Visual feedback:

- upgraded trees are visibly larger than lower-level trees
- level-up uses the heal sparkle effect with a blue color variant

#### House

- cost: `1000 energy`
- combat role: none

Role: progression support, especially for chest eligibility.

#### Windmill

- cost: `1000 energy`
- HP: `6`
- reward: `10★`
- reward cycle: every `5` defended swarms after placement or collection

#### Treasure Chest

- cost: `500 energy`
- HP: `20`
- requires at least `1` house on the board
- becomes reward-ready after `2` defended swarms
- disappears after opening

Current chest reward weights:

- `1★`: `36`
- `2★`: `26`
- `3★`: `18`
- `4★`: `10`
- `5★`: `10`

#### Capybara Statue

- cost: `2000 energy`
- unlock source: prize machine
- cannot be placed until `capybara_statue` exists in vending inventory

Role: enables Crazy Capy.

#### Soil

- cost: `100 energy`
- harvest reward: `1★`
- ready after `3` defended swarms

Important soil behavior:

- soil harvest requires a continuous connected path route from the Starter House/home footprint
- the adjacent path tile must visibly open toward the soil tile
- that adjacent path tile must belong to the same connected path network as the home-access path
- a nearby path that bends away from the soil does not count
- an isolated one-tile path stub beside soil does not count, even if it opens toward the soil
- connected soil tooltips show a yellow dot while wheat is still growing
- connected ready soil tooltips show a green dot and enable `Harvest +1★`
- disconnected soil tooltips show a red dot and disable harvest until the path shape is fixed
- pressing harvest sends the player's village avatar along the connected path route before the star is awarded
- enemies can trample soil
- trampling resets soil growth progress to the current swarm baseline

## Maintenance Actions

### Heal

- cost: `50 energy`
- restore amount: `25%` of max HP, rounded up

Valid targets:

- boxer
- tennis
- quarterback
- windmill
- chest
- wall layers

### Erase

- base refund target: `50%`

Current erase behavior:

- foundations refund a flat `50%`
- units refund up to `50%`, scaled by remaining HP
- Boxer, Tennis, and Quarterback refund calculations include energy spent on tree upgrades
- stars spent on tree upgrades are not refunded by erase
- wall layers refund up to `50%`, scaled by the top layer's remaining HP
- empty grass tiles cannot be erased

## Swarm Schedule

Swarm Village is driven by real-world Eastern Time windows.

Current daily windows:

- `12:00 PM ET`
- `6:00 PM ET`

Player-facing behavior:

- when a swarm is not ready, the HUD shows the next unlock timing
- when the current window is unlocked, the HUD swaps to `Activate Defenses`
- swarm streak display only stays alive if the player keeps defending without large day gaps

## Notifications And Widgets

Swarm Village now has dedicated reminder surfaces beyond the in-app HUD.

Current notification behavior:

- future swarm-ready notifications are scheduled ahead of upcoming windows
- reward-ready notifications are sent for connected ready soil, windmills, and chests

Current iOS widget behavior:

- the game publishes `nextSwarmAtMs`
- it publishes whether the swarm is currently unlocked
- it publishes `starsBalance`
- it publishes `energyBalance`
- it publishes `streakCount`
- the widget can deep link into `fitmoji://village`

The widget is implemented in [FitmojiSwarmWidget.swift](/Users/markusproctor/Documents/Apps/mobile/fitmoji/targets/widget/FitmojiSwarmWidget.swift) and receives its payload through [lib/widget/swarmWidget.ts](/Users/markusproctor/Documents/Apps/mobile/fitmoji/lib/widget/swarmWidget.ts).

## Starting A Swarm

The player starts a swarm from the HUD action.

Current preconditions:

- swarm progress must be loaded
- the current ET window must be unlocked
- unsaved village changes must be resolved first

When a swarm starts:

- the village snapshot is autosaved and published
- wave counters reset
- enemies and projectiles are cleared
- castle HP returns to full
- the next swarm availability timestamp is advanced

Player-facing activation toast:

- `Swarm activated`

## During A Swarm

This needs to be stated explicitly: Swarm Village does not lock into a passive watch-only combat phase once the swarm begins.

During an active swarm, the player can still interact with the village in real time.

Current in-wave actions include:

- healing damaged walls
- healing damaged combat units and vulnerable reward structures
- placing new foundations
- placing new walls and fences
- placing new units such as `boxer`, `tennis`, and `quarterback`
- placing other valid village structures if their normal placement rules are satisfied
- erasing existing content
- throwing footballs from placed Quarterback trees
- activating Crazy Capy if its normal requirements are satisfied
- redirecting Crazy Capy by tapping the board while it is active

Important implementation detail:

- these edits take effect immediately during the running wave because the swarm simulation reads the live board state

That means in-wave play is an active defense-management phase, not just prebuilt tower defense.

### What Is Not Allowed Or Does Not Happen

- map expansion is not available during an active swarm
- the village avatar does not wander during active swarms
- normal placement restrictions still apply during a swarm

Examples of those normal placement restrictions:

- you still need a valid foundation before placing most structures
- you cannot place a unit onto a wall tile
- you cannot place a wall where one already exists
- the castle footprint still cannot be edited

## Wave Size And Difficulty

Base wave size:

- `DEFAULT_WAVE_SIZE = 22`

Current formula:

```ts
waveSize = DEFAULT_WAVE_SIZE + streakBonus + wallBonus
```

Where:

- `streakBonus = currentSwarmStreak * STREAK_IJOM_RAMP`
- `STREAK_IJOM_RAMP = 6`
- `wallBonus = floor(totalWallHeight / WALL_IJOM_DIVISOR)`
- `WALL_IJOM_DIVISOR = 2`

Interpretation:

- a player with no active streak starts from `22` IJOMs
- each active defended-swarm streak step adds `6` IJOMs
- every `2` wall layers currently on the board adds `1` IJOM
- village age no longer increases swarm size
- losses reset the active swarm streak to `0`, so rebuilding after defeat drops the streak portion of the wave back to zero
- exercise minutes additionally increase enemy spawn pressure, speed pressure, and damage pressure

Examples:

- new village, no walls, streak `0`: `22`
- streak `3`, no walls: `22 + 18 = 40`
- loss-recovery village, streak `0`, `20` remaining wall layers: `22 + 10 = 32`
- streak `4`, `20` wall layers: `22 + 24 + 10 = 56`

## Enemy Model

There are currently two enemy variants:

- normal Ijom
- snow Ijom

### Shared Castle Pressure

If an enemy reaches the castle, it deals:

- `14` castle damage

Then that enemy disappears.

### Normal Ijom

- HP: `18`
- wall damage per hit: `1`
- Skia art: animated walk GIF

### Snow Ijom

- HP: `36`
- damage multiplier: `3x` the normal base damage calculation
- wall damage per hit: `1`
- special behavior: seeks nearby walls within `SNOW_WALL_SEEK_RANGE = 3`
- Skia art: animated `snow-ijom.gif`
- visual scale: `1.3x`

Snow IJOMs are intentionally larger than regular IJOMs because they read as a mini-boss enemy on the board.

### Spawn Spacing And Board Bounds

Enemy spawning and movement are distance-aware.

Current behavior:

- new enemies try to spawn on valid board cells near the spawn edge
- if the spawn lane is too crowded, the enemy waits instead of being placed on top of another enemy
- enemies resolve spacing against nearby IJOMs during movement
- enemies are clamped to the board surface except for the valid castle approach band

This is especially important now that regular and snow IJOMs use larger animated artwork. Without spacing and board clamping, the walk cycles can visually overlap or appear to walk off the isometric board.

### Preview Spawns

The Skia village includes debug preview buttons for testing enemy artwork and movement without affecting the daily swarm result or streak.

Current preview buttons:

- `Preview IJOM`
- `Preview Snow IJOM`

Preview enemies reuse the same movement, attack, spacing, and board-bound logic as swarm enemies, but they do not complete or fail a real swarm.

If a preview enemy is on the board, Quarterback throw mode can be tested outside an active swarm. This keeps the football trajectory, splash damage, camera, and joystick workflow testable without consuming the daily swarm window.

### Dynamic Difficulty Inputs

The wave simulation scales off `exerciseMinutes`.

Current rules:

- simulation interval is `32 ms`
- spawn interval starts at `1100 ms`
- spawn interval floors at `350 ms`
- base enemy damage starts at `8`
- base enemy damage never drops below `6`
- extra active minutes increase base damage
- movement pressure is multiplied by an exercise-minute difficulty ramp

## Enemy Priorities

At a high level, enemies behave like this:

1. If they have reached the castle, damage it and disappear.
2. If they are next to a vulnerable unit, attack that unit.
3. If they are next to a wall, attack that wall.
4. If they are snow Ijoms and can find a nearby wall, steer into that wall.
5. Otherwise, move toward the castle.

Enemies can damage:

- boxer
- tennis
- quarterback
- windmill
- chest
- walls
- the castle

Houses and capybara statues are not combat units.

## Combat Resolution

### Boxer

Boxers directly hit the nearest enemy inside melee range.

### Tennis

Tennis units launch projectiles that travel, collide, and then apply damage.

### Quarterback

Quarterback is a manual throw tree. When a Quarterback is selected and at least one enemy exists, the player gets a dedicated football joystick.

Current throw behavior:

- holding the joystick starts throw mode and collapses expanded HUD/tray UI
- the camera eases out to a wider view and stays there until throw mode is finished
- dragging away from the joystick controls launch angle and power
- the trajectory preview updates while aiming without pausing enemy simulation
- release launches a `football.webp` projectile along a parabolic arc
- the football image flips its laces top-to-bottom at `2` flips per second while traveling
- footballs explode on impact or at the end of their range
- explosion damage applies to IJOMs in a `3x3` impact area

Implementation notes:

- shared football angle and lace-flip timing live in `domain/football.ts`
- the native football projectile image is rendered by `SwarmVillageFootballProjectile.tsx`
- the Skia projectile path uses the same football helper functions so native and Skia presentation stay aligned

### Victory

A swarm is cleared when:

- all planned enemies have spawned
- all active enemies are gone
- castle HP is still above `0`

Victory currently leads to:

- victory modal
- completed-swarm autosave
- `+1★` when the victory flow finishes

### Loss

The player loses when:

- castle HP reaches `0`

Loss currently leads to:

- defeat modal
- completed-swarm autosave
- swarm streak reset to `0`

Loss does not erase the village. Damaged walls, destroyed units, and trampled soil remain part of the saved board state, but the next wave's streak-based difficulty drops back down so the player has a more realistic rebuild path.

## Crazy Capy

Crazy Capy is the main active powerup in the mode.

### Requirements

To use Crazy Capy:

- the player must have unlocked the capybara statue from the prize machine
- at least one capybara statue must be placed
- a swarm must be active
- the charge meter must be full

### Charge Rule

Crazy Capy recharges from active calories, not elapsed time.

Current recharge rule:

- `1000 active calories` since the last activation

### Duration

Current duration:

- `20 seconds` per placed capybara statue

Examples:

- `1 statue = 20s`
- `2 statues = 40s`
- `3 statues = 60s`

### Activation And Behavior

When activated, Crazy Capy:

- spawns near the castle
- roams through the village
- avoids walls
- can be redirected by tapping the board
- tapping a board cell while it is active steers it toward that area
- plays custom ambient and swing audio while active

Current combat values:

- damage per hit: `10`
- hit radius: `0.72`
- per-enemy hit cooldown: `420 ms`

When Crazy Capy gets the KO:

- the enemy uses a knockout fly-off animation

The badge and modal also expose current charge progress in active calories.

Implementation notes:

- Crazy Capy movement, targeting, charging, and knockout effect creation live in `domain/crazyCapy.ts`
- active Crazy Capy and Crazy Capy knockout-flight visuals live in `SwarmVillageCrazyCapySprites.tsx`
- board tap pulses live in `effects/CrazyCapyTapPulseEffect.tsx`

## Stars And Progression

Swarm Village awards stars from several sources:

- surviving a swarm: `+1★`
- harvesting connected soil: `+1★`
- collecting a windmill payout: `+10★`
- opening a chest: weighted `1-5★`

Stars are separate from energy.

Current progression ties:

- stars feed the prize machine economy
- stars and energy can be reinvested into Boxer, Tennis, and Quarterback tree upgrades
- the prize machine can unlock special village content like the capybara statue
- village layout quality affects both defense success and long-tail reward cadence

## Current UI Surfaces

### HUD

The top HUD shows:

- the village mode header
- star balance
- swarm state or activation CTA
- wave label
- streak

Header behavior:

- normal state: `SWARM VILLAGE`
- ready state: `Activate Defenses`
- active wave state: `DEFENSES ACTIVATED`

### Bottom Tray

The bottom tray shows:

- an energy button that opens the explainer modal
- paginated build tools
- heal
- erase
- prize machine
- save

Path tools and grass tools both live in the build tray. Connected empty path tiles let the avatar wander the village, and correct path openings are required for soil harvest access.

### Modals

Current major modals:

- map expansion
- energy explainer
- Crazy Capy info
- victory
- defeat

## Primary Source Files

- Gameplay mode:
  [components/play/SwarmVillageGame.tsx](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/SwarmVillageGame.tsx)
- Skia wrapper:
  [components/play/SwarmVillageSkiaDemo.tsx](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/SwarmVillageSkiaDemo.tsx)
- Skia board renderer:
  [components/play/swarmVillage/SwarmVillageSkiaScene.tsx](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/swarmVillage/SwarmVillageSkiaScene.tsx)
- HUD:
  [components/play/swarmVillage/SwarmVillageHud.tsx](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/swarmVillage/SwarmVillageHud.tsx)
- Bottom tray:
  [components/play/swarmVillage/SwarmVillageBottomTray.tsx](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/swarmVillage/SwarmVillageBottomTray.tsx)
- Modals:
  [components/play/swarmVillage/SwarmVillageModals.tsx](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/swarmVillage/SwarmVillageModals.tsx)
- Energy rules:
  [lib/game/energy.ts](/Users/markusproctor/Documents/Apps/mobile/fitmoji/lib/game/energy.ts)
- Widget publishing:
  [lib/widget/swarmWidget.ts](/Users/markusproctor/Documents/Apps/mobile/fitmoji/lib/widget/swarmWidget.ts)
- Widget UI:
  [targets/widget/FitmojiSwarmWidget.swift](/Users/markusproctor/Documents/Apps/mobile/fitmoji/targets/widget/FitmojiSwarmWidget.swift)
