# Energy Economy Guide

This document describes the current `energy` economy used by Swarm Village in [SwarmVillageGame.tsx](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/SwarmVillageGame.tsx).

Read this alongside [swarm-village-gameplay.md](/Users/markusproctor/Documents/Apps/mobile/fitmoji/docs/swarm-village-gameplay.md) when changing village progression, prices, or UI copy.

## What Energy Is

`energy` is the village's build-and-maintenance currency.

Players spend it to:

- place foundations, including walking paths
- place walls, units, and reward structures
- heal damaged walls and units
- expand the map

Energy is not a separate drop table or consumable item. It is derived live from seasonal health totals.

## Season And Formula

The source of truth lives in [lib/game/energy.ts](/Users/markusproctor/Documents/Apps/mobile/fitmoji/lib/game/energy.ts).

Current formula:

```ts
energy =
  (activeCalories * 4) +
  (exerciseMinutes * 20) +
  Math.floor(steps / 10);
```

Current weights:

```ts
export const ENERGY_WEIGHTS_V1 = {
  activeCalories: 4,
  exerciseMinutes: 20,
  stepsDivisor: 10,
} as const;
```

That means:

- `1 active calorie = 4 energy`
- `1 exercise minute = 20 energy`
- `10 steps = 1 energy`
- `1,000 steps = 100 energy`
- `10,000 steps = 1,000 energy`

Quick examples:

- `300 active calories` = `1,200 energy`
- `20 exercise minutes` = `400 energy`
- `4,500 steps` = `450 energy`
- `300 active calories + 20 exercise minutes + 4,500 steps` = `2,050 energy`

## Seasonal Balance Rules

Swarm Village uses `sinceAprilMetrics`, so the current energy season starts on April 1 each year.

The balance the player can spend is:

```ts
availableEnergy = seasonalEnergy - spentEnergy
```

Important implementation details:

- `seasonalEnergy` is recalculated from live health metrics, not stored as a wallet.
- `spentEnergy` is tracked separately and persisted by the village mode.
- if the formula changes, every player's available balance changes immediately.
- if only costs change, the earned side stays the same and only spending pressure changes.

## New-Player Seasonal Cap

Swarm Village now applies a special first-season adjustment for users created after the current April season start.

Current behavior in [SwarmVillageGame.tsx](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/SwarmVillageGame.tsx):

- late-joining players are temporarily capped at `5000` seasonal energy
- the mode stores a per-season `seasonalEnergyOffset` in AsyncStorage
- after initialization, the effective balance is produced by subtracting that offset from the raw seasonal total

This prevents a brand-new account from instantly inheriting an oversized energy pool from historical health data inside the same season.

## Current Swarm Village Costs

Shared energy conversion values are defined in `ENERGY_COSTS` in [lib/game/energy.ts](/Users/markusproctor/Documents/Apps/mobile/fitmoji/lib/game/energy.ts). Swarm Village item costs, reward constants, repair/refund values, and upgrade costs now live in [components/play/swarmVillage/model/costs.ts](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/swarmVillage/model/costs.ts).

### Foundations

- `grass`: `50`
- `grass_path_a`: `50`
- `grass_path_b`: `50`
- `grass_path_c`: `50`
- `grass_path_d`: `50`
- `grass_path_e`: `50`
- `grass_path_f`: `50`
- `grass_path_g`: `50`
- `grass_path_h`: `50`
- `grass_path_i`: `50`
- `grass_path_j`: `50`
- `soil`: `100`

All path variants cost the same amount, but they are not interchangeable for gameplay. Each path tile has directional openings; soil harvest access requires a continuous connected path route from the Starter House/home footprint to a path tile whose opening points into the soil tile.

### Defenses And Structures

- `fence`: `60`
- `wall`: `500`
- `tennis`: `200`
- `boxer`: `220`
- `quarterback`: `1000`
- `house`: `1000`
- `windmill`: `1000`
- `chest`: `500`
- `capybara_statue`: `2000`

### Maintenance And Expansion

- `heal`: `50`
- `tree upgrade to level 2`: `100 energy` plus `2★`
- `tree upgrade to level 3`: `125 energy` plus `3★`
- `tree upgrade to level 4`: `150 energy` plus `4★`
- `mapExpansion`: `5000` per added column

## Spend, Heal, And Refund Rules

### Healing

Healing costs `50 energy` and restores `25%` of max HP.

Valid heal targets:

- boxer
- tennis
- quarterback
- windmill
- chest
- wall layers

### Tree Upgrades

Boxer, Tennis, and Quarterback trees start at level `1` when placed.

Upgrades spend both currencies:

- level `2`: `100 energy` and `2★`
- level `3`: `125 energy` and `3★`
- level `4`: `150 energy` and `4★`

Each upgrade increases max HP by `20%`, attack damage by `25.5%`, and visible sprite size by `20%`.

If the tree is damaged, the upgrade also heals `20%` of the new max HP, capped at the new max. Full-health trees become full health at the new max.

### Erasing

Erase refunds are no longer just a flat percentage in every case.

Current rules:

- foundations refund `50%` of their placement cost
- units refund up to `50%`, scaled by remaining HP
- Boxer, Tennis, and Quarterback unit refund base cost includes energy spent on tree upgrades
- stars spent on tree upgrades are not refunded by erase
- walls refund up to `50%` for the top layer, scaled by that layer's remaining HP
- empty grass cannot be erased

This means damaged combat pieces refund less than pristine ones.

### Clearing The Village

The debug-style `clearBuild` flow resets the village board and sets `spentEnergy` back to `0`, effectively refunding everything.

## Energy And Current UX

Energy now shows up in several player-facing surfaces:

- the bottom tray energy button opens the energy explainer modal
- the energy explainer modal shows earned-this-season, spent-in-village, and available-now
- the iOS Swarm widget receives `energyBalance` in its payload

## Where To Edit Things

Edit the formula here:

- [lib/game/energy.ts](/Users/markusproctor/Documents/Apps/mobile/fitmoji/lib/game/energy.ts)

Edit most shared village costs here:

- [components/play/swarmVillage/model/costs.ts](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/swarmVillage/model/costs.ts)

Edit app-wide energy conversion and non-village energy behavior here:

- [lib/game/energy.ts](/Users/markusproctor/Documents/Apps/mobile/fitmoji/lib/game/energy.ts)

Edit village spend/refund formatting helpers here:

- [components/play/swarmVillage/domain/economy.ts](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/swarmVillage/domain/economy.ts)

Edit the energy modal copy here:

- [components/play/swarmVillage/SwarmVillageModals.tsx](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/swarmVillage/SwarmVillageModals.tsx)

Edit widget publishing here:

- [lib/widget/swarmWidget.ts](/Users/markusproctor/Documents/Apps/mobile/fitmoji/lib/widget/swarmWidget.ts)

Edit widget UI here:

- [targets/widget/FitmojiSwarmWidget.swift](/Users/markusproctor/Documents/Apps/mobile/fitmoji/targets/widget/FitmojiSwarmWidget.swift)
