# Swarm Village Balance Notes

This doc explains the current Swarm Village combat and economy values so it is easier to rebalance costs, health, enemy pressure, and energy gain.

Primary gameplay source:

- [components/play/SwarmVillageGame.tsx](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/SwarmVillageGame.tsx)
- [components/play/swarmVillage/model/costs.ts](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/swarmVillage/model/costs.ts)
- [components/play/swarmVillage/model/constants.ts](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/swarmVillage/model/constants.ts)
- [components/play/swarmVillage/domain/](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/swarmVillage/domain)
- [components/play/swarmVillage/hooks/](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/swarmVillage/hooks)
- [components/play/swarmVillage/SwarmVillageSkiaScene.tsx](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/swarmVillage/SwarmVillageSkiaScene.tsx)
- [lib/game/energy.ts](/Users/markusproctor/Documents/Apps/mobile/fitmoji/lib/game/energy.ts)

Rendering note:

- `SwarmVillageGame` owns screen orchestration and the active wave loop, while shared balance constants and pure rules live under `model/` and `domain/`.
- Side-effect hooks own music, SFX, persistence, preview capture, and notification behavior so balance rules stay easier to inspect.
- `SwarmVillageSkiaScene` owns the high-performance board rendering, animated IJOM sprites, Skia reward glows, and canvas-side sprite alignment.
- Extracted React Native presentation components own focused overlays such as tool inspect, cell tooltip, football projectile, Crazy Capy sprites, gallery preview, and effects.

## Energy Conversion Reference

Current conversion:

- `1 active calorie = 4 energy`
- `1 exercise minute = 20 energy`
- `10 steps = 1 energy`

Step equivalents:

- `100 steps = 10 energy`
- `500 steps = 50 energy`
- `1,000 steps = 100 energy`
- `2,000 steps = 200 energy`
- `10,000 steps = 1,000 energy`

## Build Costs In Energy And Step Equivalents

Current costs:

- `Grass`: `50 energy`
- `Path tile`: `50 energy`
- `Fence`: `60 energy`
- `Soil`: `100 energy`
- `Wall`: `500 energy`
- `Tennis`: `200 energy`
- `Boxer`: `220 energy`
- `Quarterback`: `1,000 energy`
- `House`: `1,000 energy`
- `Windmill`: `1,000 energy`
- `Map expansion`: `5,000 energy`
- `Heal +25%`: `50 energy`

Step equivalents:

- `Fence` = `600 steps`
- `Wall` = `5,000 steps`
- `Tennis` = `2,000 steps`
- `Boxer` = `2,200 steps`
- `Quarterback` = `10,000 steps`
- `Heal` = `500 steps`
- `House` = `10,000 steps`
- `Windmill` = `10,000 steps`
- `Map expansion` = `50,000 steps`

## Soil Reward Access

- Soil costs `100 energy`.
- Wheat becomes ready after `3` defended swarms.
- A harvest pays `+1★`.
- Harvest access requires a continuous connected path route from the Starter House/home footprint.
- The adjacent path tile must have a visible dirt opening toward the soil tile.
- A path tile that only runs beside the soil, or bends away from it, does not make the soil connected.
- An isolated one-tile path stub beside soil does not make the soil connected.
- The tooltip status dot is red when disconnected, yellow when connected and growing, and green when connected and ready.
- When harvesting, the village avatar walks the connected path route to the soil before the reward is collected.

## Defensive Item Health And Damage

### Walls

- `Wood fence`
  - Cost: `60 energy`
  - HP per layer: `6`
  - Max stack height: `4`
  - Total HP at height 4: `24`
- `Stone wall`
  - Cost: `200 energy`
  - HP per layer: `20`
  - Max stack height: `4`
  - Total HP at height 4: `80`

Important wall behavior:

- Walls store HP one layer at a time.
- When a layer breaks, height drops by 1 and the next layer resets to full HP.
- So a 4-high stone wall behaves like `4 x 20 HP`, not one pooled `80 HP` bar.

Effective cost per HP:

- `Wood fence`: `60 / 6 = 10 energy per HP`
- `Stone wall`: `500 / 20 = 25 energy per HP`

Purely on HP-per-cost, fences are more efficient.
Stone walls are still stronger as chokepoints because each layer takes longer to chew through.

Current visual placement metrics:

- `Stone wall` sprite box: `64 x 55`
- `Wood fence` sprite box: `62 x 49`
- both are centered and offset inward so edge placements do not hang off the isometric board

### Units

- `Boxer`
  - Cost: `220 energy`
  - Level 1 HP: `135`
  - Level 1 damage: `10`
  - Range: about `1.15`
  - Attack cooldown: `1000 ms`
- `Tennis`
  - Cost: `200 energy`
  - Level 1 HP: `115`
  - Level 1 damage: `2`
  - Range: `6`
  - Attack cooldown: `3000 ms`
- `Quarterback`
  - Cost: `1,000 energy`
  - Level 1 HP: `150`
  - Level 1 damage: `5`
  - Range: `30`
  - Throw cooldown: `1200 ms`
  - Manual throw uses a pull-back joystick, parabolic `football.webp` projectile, and `3x3` splash damage on impact
- `Windmill`
  - Cost: `1,000 energy`
  - HP: `6`
  - Reward: `10 stars` after `5` successful swarms
- `House`
  - Cost: `1,000 energy`
  - HP: `0`
  - Decoration only

### Tree Upgrade Economy

Boxer, Tennis, and Quarterback trees have four levels.

- Level `1`: default at placement
- Level `2`: costs `2 stars` and `100 energy`
- Level `3`: costs `3 stars` and `125 energy`
- Level `4`: costs `4 stars` and `150 energy`

Each upgrade is multiplicative:

- Max HP: `+20%` per upgrade
- Attack damage: `+25.5%` per upgrade
- Sprite size: `+20%` per upgrade

Upgrade HP behavior:

- damaged trees heal by `20%` of the new max HP when upgraded
- full-health trees upgrade to full HP at the new max
- upgrade healing is capped at the new max HP

Current derived combat stats:

| Unit | Level | Max HP | Damage |
| --- | ---: | ---: | ---: |
| Boxer | 1 | 135 | 10 |
| Boxer | 2 | 162 | 12.55 |
| Boxer | 3 | 194 | 15.75 |
| Boxer | 4 | 233 | 19.77 |
| Tennis | 1 | 115 | 2 |
| Tennis | 2 | 138 | 2.51 |
| Tennis | 3 | 166 | 3.15 |
| Tennis | 4 | 199 | 3.95 |
| Quarterback | 1 | 150 | 5 |
| Quarterback | 2 | 180 | 6.28 |
| Quarterback | 3 | 216 | 7.88 |
| Quarterback | 4 | 259 | 9.88 |

Design intent:

- create a star sink inside Swarm Village, not only in the Prize Machine
- reward players for investing in existing damaged trees
- make stronger trees readable at a glance through size growth

### Castle

- Castle HP: `180`
- If an Ijom reaches the castle, it deals `14` castle damage and disappears.

## Healing

- Heal restores `25%` of target max HP
- Heal cost: `50 energy`

Examples:

- Heal a boxer: `33.75`, rounded up to `34 HP`
- Heal a tennis unit: `28.75`, rounded up to `29 HP`
- Heal a windmill: `1.5`, rounded up to `2 HP`
- Heal a wood fence layer: `1.5`, rounded up to `2 HP`
- Heal a stone wall layer: `5 HP`

## Ijom Stats

### Normal Ijom

- Spawn chance: about `80%`
- HP: `18`
- Damage to units: scales from exercise minutes
- Wall damage per hit: `1`
- Skia art: animated `ijom-walk.gif`

Base damage formula:

```ts
baseDamage = max(6, 8 + floor(exerciseMinutes / 170))
```

Examples:

- `0` exercise minutes: `8 damage`
- `170` exercise minutes: `9 damage`
- `340` exercise minutes: `10 damage`
- `680` exercise minutes: `12 damage`

### Snow Ijom

- Spawn chance: about `20%`
- HP: `36`
- Unit damage: `3x` normal Ijom damage
- Wall damage per hit: `1`
- Special behavior: seeks out walls and damages them
- Skia art: animated `snow-ijom.gif`
- Visual scale: `1.3x`

Snow damage examples:

- If normal damage is `8`, snow damage is `24`
- If normal damage is `10`, snow damage is `30`
- If normal damage is `12`, snow damage is `36`

## What Ijoms Actually Attack

### Units

Ijoms can attack:

- `Boxer`
- `Tennis`
- `Quarterback`
- `Windmill`
- `Treasure Chest`

Attack cadence on units:

- Every `900 ms`

Damage to units:

- Uses the Ijom's `damage` stat
- Regular and snow Ijoms both damage units

### Walls

Very important:

- regular and snow IJOMs both damage walls
- Wall attack cooldown: `820 ms`
- regular IJOMs deal `1 wall HP` per wall hit
- snow IJOMs deal `1 wall HP` per wall hit
- They do not use their full `damage` stat against walls

That means:

- A single `wood fence` layer with `6 HP` survives about `6` wall hits
- A single `stone wall` layer with `20 HP` survives about `20` wall hits

Very rough survival time against one focused Ijom:

- Wood fence layer: `6 x 0.82s = ~4.9 seconds`
- Stone wall layer: `20 x 0.82s = ~16.4 seconds`

### Castle

If an Ijom reaches the castle:

- The castle loses `14 HP`
- The Ijom is removed

Roughly:

- `13` successful castle breaches can destroy a full `180 HP` castle

## How Player Defenses Kill Ijoms

### Boxer

- `10 damage` per hit at level 1
- `1000 ms` cooldown
- Can only hit close targets
- Kills a normal `18 HP` Ijom in `2` hits
- Kills a snow `36 HP` Ijom in `4` hits at level 1

### Tennis

- `2 damage` per projectile at level 1
- `3000 ms` cooldown
- Range `6`
- Kills a normal `18 HP` Ijom in `9` hits at level 1
- Kills a snow `36 HP` Ijom in `18` hits at level 1

### Quarterback

- `5 damage` per football at level 1
- `1200 ms` throw cooldown
- Range `30`
- Player controls angle and power with the football joystick
- Footballs use a parabolic arc and explode on impact
- Football laces flip top-to-bottom at `2` flips per second while traveling
- Splash damage affects IJOMs in a `3x3` impact area
- Kills a normal `18 HP` Ijom in `4` direct/splash hits at level 1
- Kills a snow `36 HP` Ijom in `8` direct/splash hits at level 1

## Swarm Size And Spawn Pressure

When the player activates a swarm, wave size is calculated as:

```ts
waveSize = 22 + streakBonus + wallBonus
```

Where:

- `base wave size = 22`
- `streakBonus = currentSwarmStreak * 6`
- `wallBonus = floor(totalWallHeight / 2)`

Interpretation:

- Every active defended-swarm streak step adds `6` extra IJOMs
- Every `2` wall layers currently on the board adds `1` extra IJOM
- Village age does not increase wave size anymore
- A defeat resets the active swarm streak to `0`, which prevents the old age-based doom loop where a player could lose defenses while future waves kept growing

Examples:

- New village, no walls, streak `0`: `22`
- Streak `3`, no walls: `22 + 18 = 40`
- Streak `0`, 20 total wall layers after a loss: `22 + 10 = 32`
- Streak `4`, 20 total wall layers: `22 + 24 + 10 = 56`

## Spawn Speed Over Time

The wave simulation runs every `32 ms` and scales movement/projectile work by elapsed time. This keeps the animated GIF walk cycles from looking choppy while preserving the intended gameplay speed.

Spawn interval:

```ts
spawnIntervalMs = max(350, 1100 - floor(exerciseMinutes / 160))
```

Examples:

- `0` exercise minutes: `1100 ms`
- `160` minutes: `1099 ms`
- `320` minutes: `1098 ms`

Important note:

- This formula changes very slowly because it only subtracts `1 ms` per `160` exercise minutes.
- In practice, spawn speed is almost flat unless the player has extremely high exercise totals.

## Movement Speed Over Time

Raw enemy speed:

```ts
rawSpeed =
  (0.008 + random(0 to 0.008)) *
  12.5 *
  0.25
```

That gives a base speed range of about:

- `0.025` to `0.05` before difficulty ramp

Difficulty ramp:

```ts
difficultyRamp = min(1.35, 1 + exerciseMinutes / 1600)
```

Examples:

- `0` exercise minutes: `1.00x`
- `160` minutes: `1.10x`
- `800` minutes: `1.35x cap`

## Enemy Spacing And Board Bounds

Current enemy spacing values:

- regular IJOM personal-space radius: `0.52`
- snow IJOM personal-space radius: `0.66`
- spawn scan depth: `4` rows
- spawn spacing buffer: `0.16`

Current behavior:

- enemies spawn only when a valid board lane has enough room
- crowded spawn lanes delay new spawns instead of stacking enemies on top of each other
- movement resolves enemy-to-enemy spacing each tick
- enemies stay on the board surface except for the valid castle approach band

This matters more with the new animated artwork because the walk cycles are wider and make overlap much more obvious.

## Economy Gut Check

This is the main balancing question: do steps create energy too quickly relative to what the player can do with it?

### Why Steps May Feel Generous

- `600 steps = 1 fence`
- `2,000 steps = 1 stone wall layer`
- `2,000 steps = 1 tennis unit`
- `2,200 steps = 1 boxer`
- `500 steps = 1 heal`
- `10,000 steps = 1 windmill`
- `50,000 steps = 1 map expansion`

That means a player who gets `8,000 to 10,000` steps in a day earns:

- `800 to 1,000 energy from steps alone`

Ignoring calories and exercise minutes, that is enough for roughly:

- `16 to 20 fences`
- `4 to 5 stone wall layers`
- `4 to 5 tennis units`
- `3 to 4 boxers`
- `26 to 33 heals`
- `0.2 map expansions`

And that is before adding:

- active calorie energy
- exercise minute energy

### My Read

Steps are probably generous for cheap actions.

The biggest red flags are:

- `Fence at 60 energy`
  - only `600 steps`
  - very easy to spam
- `Heal at 50 energy`
  - only `500 steps`
  - very cheap for sustain
- `Tennis at 200 energy`
  - only `2,000 steps`
  - ranged offense may arrive very quickly

The bigger-ticket items feel more reasonable:

- `Windmill at 1,000 energy`
- `Map expansion at 5,000 energy`

Map expansion now requires about `50,000 steps` if steps are the only source.

### But There Is A Counterbalance

There is one big caveat:

- waves grow with active defended-swarm streaks and remaining wall layers
- losses reset the streak portion of wave growth
- snow Ijoms hit windmills and units hard
- both regular and snow Ijoms can now damage walls
- normal Ijoms can still slip through and hit the castle for `14` each

So the economy may feel generous early and then tighten as successful streaks and wall investment rise, while still allowing a defeated player to rebuild against a lower base-pressure wave.

### Likely Tuning Levers

If steps feel too strong, the safest tuning levers are:

1. Raise `stepsDivisor` in [lib/game/energy.ts](/Users/markusproctor/Documents/Apps/mobile/fitmoji/lib/game/energy.ts:5)
   - `10` to `12` or `15` would slow step conversion
2. Raise cheap defense costs
   - especially `villageFence`
   - possibly `heal`
3. Leave premium goals alone
   - `windmill`
   - `mapExpansion`

### Simple Rebalance Ideas

Conservative option:

- `stepsDivisor: 12`
- `heal: 40`
- `villageFence: 75`

Stronger option:

- `stepsDivisor: 15`
- `heal: 50`
- `villageFence: 100`

## Where To Edit

- Energy conversion:
  [lib/game/energy.ts](/Users/markusproctor/Documents/Apps/mobile/fitmoji/lib/game/energy.ts)
- Village combat values:
  [components/play/SwarmVillageGame.tsx](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/SwarmVillageGame.tsx)
- Skia board rendering and visual alignment:
  [components/play/swarmVillage/SwarmVillageSkiaScene.tsx](/Users/markusproctor/Documents/Apps/mobile/fitmoji/components/play/swarmVillage/SwarmVillageSkiaScene.tsx)
