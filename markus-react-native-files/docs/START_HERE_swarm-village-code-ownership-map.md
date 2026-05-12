# Swarm Village Code Ownership Map

This map turns the existing Swarm Village docs into a refactor guide for breaking up `SwarmVillageGame.tsx` without changing behavior.

Read with:

- [swarm-village-gameplay.md](./swarm-village-gameplay.md)
- [energy-economy.md](./energy-economy.md)
- [swarm-village-balance-notes.md](./swarm-village-balance-notes.md)
- [swarm-village-api-json-samples.md](./swarm-village-api-json-samples.md)
- [swarm-village-gasha-boxes.md](./swarm-village-gasha-boxes.md)

## Current Refactor Boundary

`SwarmVillageGame.tsx` should become the composition shell for the mode. It should keep screen-level wiring, but shared model values, pure rules, persistence, and feature-specific state should live in smaller modules.

The first extracted layer is:

- `components/play/swarmVillage/model/types.ts`
- `components/play/swarmVillage/model/assets.ts`
- `components/play/swarmVillage/model/constants.ts`
- `components/play/swarmVillage/model/cacheKeys.ts`
- `components/play/swarmVillage/model/costs.ts`
- `components/play/swarmVillage/model/tools.ts`

Pure helper functions now live in:

- `components/play/swarmVillage/domain/board.ts`
- `components/play/swarmVillage/domain/combat.ts`
- `components/play/swarmVillage/domain/crazyCapy.ts`
- `components/play/swarmVillage/domain/economy.ts`
- `components/play/swarmVillage/domain/football.ts`
- `components/play/swarmVillage/domain/forestSpirit.ts`
- `components/play/swarmVillage/domain/foundations.ts`
- `components/play/swarmVillage/domain/pathing.ts`
- `components/play/swarmVillage/domain/placedSprites.ts`
- `components/play/swarmVillage/domain/rewards.ts`
- `components/play/swarmVillage/domain/schedule.ts`
- `components/play/swarmVillage/domain/sprites.ts`
- `components/play/swarmVillage/domain/toolInspect.ts`
- `components/play/swarmVillage/domain/units.ts`
- `components/play/swarmVillage/domain/utils.ts`

Extracted view components now cover focused chunks of the screen:

- `components/play/swarmVillage/SwarmVillageCellTooltip.tsx`
- `components/play/swarmVillage/SwarmVillageCrazyCapySprites.tsx`
- `components/play/swarmVillage/SwarmVillageFootballProjectile.tsx`
- `components/play/swarmVillage/SwarmVillageGalleryPreview.tsx`
- `components/play/swarmVillage/effects/CrazyCapyTapPulseEffect.tsx`
- `components/play/swarmVillage/effects/FootballExplosionEffectView.tsx`
- `components/play/swarmVillage/effects/HealSparkleEffect.tsx`

Extracted side-effect hooks now own non-rendering services:

- `components/play/swarmVillage/hooks/useVillageAudio.ts`
- `components/play/swarmVillage/hooks/useCrazyCapyAudio.ts`
- `components/play/swarmVillage/hooks/useVillagePersistence.ts`
- `components/play/swarmVillage/hooks/useSwarmNotifications.ts`
- `components/play/swarmVillage/hooks/useVillagePreviewCapture.ts`

## Ownership Targets

| Feature area | Source docs | Target owner |
| --- | --- | --- |
| Board dimensions, home footprint, sprite geometry | `swarm-village-gameplay.md`, `swarm-village-balance-notes.md` | `model/constants.ts`, `domain/board.ts`, `domain/sprites.ts` |
| Shared board, unit, enemy, projectile, progress types | `swarm-village-gameplay.md`, `swarm-village-api-json-samples.md` | `model/types.ts` |
| AsyncStorage keys and mirrored status state | `swarm-village-gameplay.md`, `swarm-village-api-json-samples.md` | `model/cacheKeys.ts` |
| Build costs, repair, refunds, upgrades, reward cadence | `energy-economy.md`, `swarm-village-balance-notes.md` | `model/costs.ts`, `domain/economy.ts`, `domain/rewards.ts`, `domain/units.ts` |
| Tool tray definitions | `swarm-village-gameplay.md`, `energy-economy.md` | `model/tools.ts`, UI remains in `SwarmVillageBottomTray.tsx` |
| Asset references used across render paths | `swarm-village-gameplay.md` | `model/assets.ts` |
| Swarm windows, streak rules, countdowns | `swarm-village-gameplay.md`, `swarm-village-api-json-samples.md` | `model/constants.ts`, `domain/schedule.ts`, `domain/combat.ts` |
| Path connectivity and soil harvest access | `swarm-village-gameplay.md` | `domain/foundations.ts`, `domain/pathing.ts` |
| Placement validity, erase, heal, upgrade actions | `swarm-village-gameplay.md`, `energy-economy.md` | `domain/economy.ts`, `domain/units.ts`, later `domain/placement.ts` and `hooks/useSwarmVillagePlacement.ts` |
| Wave simulation and combat targeting | `swarm-village-gameplay.md`, `swarm-village-balance-notes.md` | `domain/combat.ts`, later `hooks/useSwarmVillageCombat.ts` |
| Quarterback football throw presentation | `swarm-village-gameplay.md`, `swarm-village-balance-notes.md` | `domain/football.ts`, `SwarmVillageFootballProjectile.tsx`, Skia projectile rendering |
| Crazy Capy powerup | `swarm-village-gameplay.md`, `game_lenses.md` | `domain/crazyCapy.ts`, `SwarmVillageCrazyCapySprites.tsx`, later `hooks/useCrazyCapyPowerup.ts` |
| Forest Spirit daily-open charge | `swarm-village-gameplay.md`, `game_lenses.md` | `domain/forestSpirit.ts`, later `hooks/useForestSpirit.ts` |
| Draft save, published snapshot, preview upload | `swarm-village-gameplay.md`, `swarm-village-api-json-samples.md` | `hooks/useVillagePersistence.ts`, `hooks/useVillagePreviewCapture.ts` |
| Music, Crazy Capy SFX, and village notifications | `swarm-village-gameplay.md` | `hooks/useVillageAudio.ts`, `hooks/useCrazyCapyAudio.ts`, `hooks/useSwarmNotifications.ts` |
| Prize Machine stars and inventory | `swarm-village-gasha-boxes.md`, vending docs | existing vending modules plus later `hooks/useSwarmVillageRewards.ts` |
| Native and Skia scene rendering | `swarm-village-gameplay.md` | `SwarmVillageSkiaScene.tsx`, extracted shared render components, remaining native render in `SwarmVillageGame.tsx` until later split |

## Completed Refactor Milestones

- Centralized shared model values, assets, cache keys, tool definitions, and costs under `components/play/swarmVillage/model/`.
- Moved pure board, combat, economy, reward, schedule, sprite, unit, pathing, Forest Spirit, Crazy Capy, placed sprite, tool inspect, and football helpers under `components/play/swarmVillage/domain/`.
- Extracted the tool inspect card data builder so `SwarmVillageGame.tsx` no longer owns the large tool-preview switch.
- Extracted repeated native/Skia cell tooltip rendering into `SwarmVillageCellTooltip.tsx`.
- Extracted heal sparkle, Crazy Capy tap pulse, and football explosion effects into `components/play/swarmVillage/effects/`.
- Extracted the gallery preview capture scene into `SwarmVillageGalleryPreview.tsx`.
- Extracted placed sprite construction into `domain/placedSprites.ts` and shared the `PlacedSprite` type with the Skia scene.
- Extracted football projectile presentation into `SwarmVillageFootballProjectile.tsx` with shared angle and lace-flip timing in `domain/football.ts`.
- Extracted active Crazy Capy and Crazy Capy knockout-flight visuals into `SwarmVillageCrazyCapySprites.tsx`.
- Extracted village/combat music, Crazy Capy SFX, save/publish persistence, preview capture/upload, and swarm/reward notifications into focused hooks under `components/play/swarmVillage/hooks/`.

## Refactor Rule

Move code by reason to change, not by line number. Each extraction should make at least one future question obvious, such as "where are the cache keys?", "where are build costs?", or "where are swarm timing rules?".
