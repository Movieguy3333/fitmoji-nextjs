# Fitmoji Game Design Through Schell's Lenses

This document maps the major Fitmoji and Swarm Village design choices to concepts from Jesse Schell's *The Art of Game Design: A Book of Lenses* and *A Deck of Lenses*.

It is written for advisor discussion: the goal is not to claim every system is finished or perfectly balanced, but to show that the design choices are intentional, testable, and connected to established game design questions.

## Reference Frame

Schell's Deck of Lenses is a design-question toolkit. The official Schell Games app listing describes the deck as 113 lens cards spanning game mechanics, technology, aesthetics, psychology, creativity, teamwork, playtesting, and business concerns. O'Reilly's table of contents for *The Art of Game Design* lists lenses including Essential Experience, Endogenous Value, Problem Solving, Elemental Tetrad, Functional Space, Time, State Machine, Emergence, Goals, Rules, Skill, Expected Value, Chance, Fairness, Challenge, Meaningful Choices, Triangularity, Reward, Punishment, Simplicity/Complexity, Elegance, Character, Imagination, and Economy.

Useful references:

- [The Art of Game Design: a Deck of Lenses App](https://apps.apple.com/us/app/the-art-of-game-design-a-deck-of-lenses/id385531319)
- [O'Reilly: The Art of Game Design, 3rd Edition - Table of Lenses](https://www.oreilly.com/library/view/the-art-of/9781351803632/xhtml/C02b_tol.xhtml)
- [Swarm Village Gameplay Guide](./swarm-village-gameplay.md)
- [Energy Economy Guide](./energy-economy.md)
- [Swarm Village Gasha Boxes](./swarm-village-gasha-boxes.md)

## Design Thesis

Fitmoji turns real-world wellness activity into a persistent, expressive strategy space.

The core experience is not simply "earn points for steps." The player converts real activity into energy, uses that energy to shape a village, defends that village during scheduled swarms, earns stars through successful stewardship, and reinvests those stars into upgrades, prize pulls, and special powerups.

The design goal is to make healthy activity feel like care, authorship, and preparation rather than obligation.

## Lens Mapping Summary

| Game Aspect | Primary Schell Lens | Design Alignment |
| --- | --- | --- |
| Activity-derived energy | Lens of Endogenous Value; Lens of Economy | Steps, active calories, and exercise minutes become a game-native build currency instead of external statistics. |
| Seasonal energy balance | Lens of Fairness; Lens of Economy | Seasonal recalculation and the new-player cap keep health-history advantages from overwhelming new players. |
| Persistent village | Lens of Essential Experience; Lens of Character | The village is not a disposable run; it becomes a personal place that remembers the player's choices. |
| Isometric board and Skia rendering | Lens of Elemental Tetrad; Lens of Functional Space | Mechanics, aesthetics, story, and technology support the same village-defense fantasy. |
| Buildable foundations | Lens of Rules; Lens of Functional Space | Foundations make the board legible as a rule-bound construction space. |
| Directional paths | Lens of Problem Solving; Lens of Emergence | Paths are no longer cosmetic only; directional openings create route-building puzzles. |
| Connected soil harvest | Lens of Meaningful Choices; Lens of Goals | Soil can grow anywhere, but rewards require access, turning roads into economic infrastructure. |
| Avatar walking routes | Lens of Character; Lens of Imagination | The player's avatar inhabits the village, making the board feel lived in between swarms. |
| Walls and fences | Lens of Challenge; Lens of Economy | Defensive options differ by cost, durability, and tactical use. |
| Boxer and Tennis trees | Lens of Skill; Lens of Head and Hands | Close-range and long-range defenders ask the player to think spatially and react during waves. |
| Tree upgrades | Lens of Meaningful Choices; Lens of Reward | Stars and energy can be spent on reliable local power instead of prize pulls, creating a strategic sink. |
| Tree size growth | Lens of Reward; Lens of Character | Larger sprites make progression readable at a glance and give upgraded trees identity. |
| Scheduled swarms | Lens of Time; Lens of Goals | Twice-daily windows give the village a rhythm and make defense feel event-like. |
| Active in-wave building | Lens of Action; Lens of Challenge | The swarm is not passive simulation; the player can heal, build, erase, and deploy while pressure rises. |
| Enemy variants | Lens of Challenge; Lens of Novelty | Normal and snow IJOMs create changing threats without requiring a new core ruleset. |
| Soil, windmill, and chest rewards | Lens of Reward; Lens of Expected Value | Each reward source has a different cadence: small reliable harvests, delayed windmill payouts, and uncertain chests. |
| Prize Machine / gasha | Lens of Chance; Lens of Triangularity | Stars can be spent on uncertain rewards, creating risk/reward contrast with direct upgrades. |
| Capybara Statue and Crazy Capy | Lens of Surprise; Lens of Novelty | A prize unlock becomes an active board power, connecting collection to combat expression. |
| Forest Spirit powerup | Lens of Reward; Lens of Motivation | Seven consecutive daily opens earn a support charge that repairs damaged items, rewarding presence without shaming absence. |
| Missed-swarm wear concept | Lens of Punishment; Lens of Fairness | Light unattended damage can give absence consequence, but should feel like village maintenance rather than moral failure. |
| Heal and erase actions | Lens of Action; Lens of Fairness | Players can repair mistakes, recover some energy, and keep experimenting without feeling trapped. |
| Manual save and autosave | Lens of State Machine; Lens of Fairness | Persistence protects player investment and makes swarm results trustworthy. |
| HUD, tray, and modals | Lens of Interface; Lens of Simplicity/Complexity | The interface exposes many systems while trying to keep the active decision visible: build, defend, collect, upgrade, or save. |
| Notifications and widget | Lens of Time; Lens of Motivation | Out-of-app reminders connect the real daily rhythm to the village's availability and rewards. |

## Advisor Talking Points

### 1. The Lens of Endogenous Value

Schell's endogenous value lens asks whether items and currencies matter inside the game world. Fitmoji's energy is not an abstract wellness score; it is the resource used to place foundations, build walls, buy defenders, heal damaged objects, upgrade trees, and expand the map.

Design claim: real activity gains meaning because it changes the persistent village.

Evidence:

- Energy comes from active calories, exercise minutes, and steps.
- Energy is spent on village construction and maintenance.
- Available energy is seasonal energy minus spent village energy.

### 2. The Lens of Economy

Fitmoji uses two major currencies with different emotional roles:

- Energy is earned through activity and spent on construction, maintenance, and upgrades.
- Stars are earned through successful village play and spent on Prize Machine pulls or tree upgrades.

Design claim: the player chooses between reliability and possibility.

Examples:

- Spend stars on Boxer/Tennis tree upgrades for guaranteed combat value.
- Spend stars on the Prize Machine for uncertain unlocks, cosmetics, power-adjacent rewards, or special features.
- Save energy for expensive goals like windmills, capybara statues, or map expansion.

### 3. The Lens of Meaningful Choices

Swarm Village is built around choices that should have visible tradeoffs:

- Place more soil for future stars or invest in defense.
- Spend stars on direct tree upgrades or gasha pulls.
- Build paths for economic access or use those tiles for walls, trees, and houses.
- Heal damaged items now or save energy for new construction.
- Upgrade an existing defender or place another level-1 defender elsewhere.

Design claim: no single resource sink should become the obvious answer every time.

Balance risk to watch:

- If tree upgrades are too efficient, Prize Machine pulls become irresponsible.
- If Prize Machine rewards are too dominant, upgrades feel boring.
- If path requirements are too strict too early, soil becomes frustrating instead of strategic.

### 4. The Lens of Functional Space

The isometric grid is not just a backdrop. It is a functional rule space:

- Each cell can hold foundation, wall state, unit state, and reward metadata.
- Path openings must connect in matching directions.
- Soil harvest checks access through connected paths.
- Walls and defenders shape enemy behavior.
- The castle/home base anchors the network.

Design claim: the player's spatial layout is the game board, the economy map, and the story surface at the same time.

### 5. The Lens of Problem Solving

Path-connected harvest turns decoration into a solvable spatial problem. A player can place soil anywhere, but they must solve access if they want to collect from it.

Design claim: the village asks small planning questions without becoming a spreadsheet.

Example player question:

> "How do I connect this wheat patch to my road network without opening my defenses?"

That is stronger than:

> "Where can I place another reward tile?"

### 6. The Lens of Time

Swarm Village uses time in several layers:

- Seasonal energy accumulation.
- Twice-daily swarm windows.
- Soil, windmill, and chest reward cycles.
- Daily open streaks for Forest Spirit.
- Long-term village persistence.

Design claim: Fitmoji aligns game rhythm with real life without requiring endless sessions.

Design risk:

- Time systems can become pressure systems. The game should keep missed-time consequences light, explainable, and recoverable.
- Swarm difficulty should not rise just because a village is old. Current wave sizing uses active defense streak and remaining wall layers instead of village age, so a loss can reset the streak pressure and give the player room to rebuild.

### 7. The Lens of Reward

Rewards are layered by cadence:

- Swarm victory gives a small star reward.
- Connected soil gives small harvest rewards.
- Windmills create larger delayed payouts.
- Chests create uncertain bonus payouts.
- Prize Machine pulls can unlock cosmetics, power-adjacent items, physical prizes, or village features.
- Forest Spirit rewards consistent daily presence with a healing charge.

Design claim: different reward cadences support different player motivations: routine, anticipation, risk, collection, and care.

### 8. The Lens of Punishment

The current design discussion around missed swarms is best framed as light consequence, not shame. A small unattended-damage rule can make missed defense meaningful if it is:

- small
- visible
- recoverable
- fictionally justified
- balanced by positive systems like Forest Spirit

Recommended framing:

> "The swarm came while you were away. Your village weathered it, and now it needs care."

Design claim: consequence makes defense meaningful, but the tone must stay humane because Fitmoji is tied to wellness behavior.

### 9. The Lens of Challenge

Challenge comes from multiple sources:

- Enemy pressure during swarms.
- Snow IJOMs as stronger wall-seeking variants.
- Exercise-minute scaling that raises pressure for more active players.
- Active defended-swarm streaks that increase wave size.
- Remaining wall layers that add a small amount of extra wave size.
- Spatial pressure from board layout.
- Economy pressure from limited energy and star sinks.

Design claim: difficulty is not only enemy stats; it is also the player's preparation, layout, in-wave reactions, and recent success. Losses should break the streak-based ramp so failure creates recovery gameplay instead of a doom loop.

### 10. The Lens of Triangularity

Triangularity is the choice between safe low reward and risky high reward.

Fitmoji examples:

- Tree upgrades are reliable but consume stars that could go to Prize Machine pulls.
- Chests are delayed and uncertain but can pay more than soil.
- Windmills are expensive and fragile but produce large delayed star payouts.
- Prize Machine pulls can produce ordinary rewards or rare unlocks.

Design claim: the economy becomes interesting when the player can choose between predictable progress and exciting uncertainty.

### 11. The Lens of Chance and Expected Value

The Prize Machine and chest rewards introduce chance, but they sit beside reliable earn/spend paths.

Design claim: chance should amplify excitement without replacing agency.

Design guardrails:

- Keep odds understandable enough that players trust the system.
- Use guaranteed alternatives such as upgrades so players who dislike randomness still have progress.
- Avoid making random rewards mandatory for basic play.

### 12. The Lens of Character and Imagination

The avatar walking the path network changes the village from a static board into a place. Crazy Capy and Forest Spirit extend that idea with memorable, characterful powers.

Design claim: systems become easier to care about when they have characters attached.

Examples:

- The avatar walks to connected soil before harvesting.
- Crazy Capy is not just damage; it is a roaming creature with audio, redirection, and knockout feedback.
- Forest Spirit turns daily presence into a visible act of repair.

### 13. The Lens of the Elemental Tetrad

Schell's elemental tetrad connects mechanics, story, aesthetics, and technology. Swarm Village has a strong tetrad alignment:

- Mechanics: build, path, defend, harvest, upgrade, heal, pull prizes.
- Story: a personal village that must be cared for and defended.
- Aesthetics: isometric board, animated enemies, reward glows, larger upgraded trees, characterful powerups.
- Technology: Skia rendering for high-density animated board content with React Native HUD and control surfaces.

Design claim: the rendering architecture is not just technical cleanup; it supports the intended experience of a lively village.

### 14. The Lens of Simplicity/Complexity

Swarm Village has many systems, but they should reduce to a few player verbs:

- Build.
- Connect.
- Defend.
- Collect.
- Upgrade.
- Repair.
- Pull.

Design claim: complexity is acceptable when it emerges from simple verbs and clear feedback.

Design risk:

- Path variants named `Path A`, `Path B`, and so on are implementation-readable but not player-readable. Since paths now matter mechanically, the interface should eventually present them as shapes or connection types rather than alphabetic variants.

### 15. The Lens of Fairness

Fairness appears in several places:

- New-player seasonal energy caps prevent inherited health history from overpowering the first season.
- Refunds let players recover some energy from erased objects.
- Tree upgrade stars are not refunded, which keeps star spending consequential.
- Autosave protects swarm outcomes and reward collection.
- Forest Spirit gives consistent players a positive recovery tool rather than relying only on missed-swarm penalties.

Design claim: players should feel their effort matters, but they should not feel trapped by early mistakes or life interruptions.

## Current Major Systems And Lens Fit

### Energy System

Primary lenses:

- Endogenous Value
- Economy
- Fairness
- Motivation

Energy turns health data into village agency. The system works because it changes what the player can build, repair, and improve. It should remain understandable enough that players can connect real activity to game progress.

### Star System

Primary lenses:

- Reward
- Economy
- Meaningful Choices
- Triangularity

Stars are earned from village success and spent on two major directions: reliable upgrades or uncertain Prize Machine pulls. This makes stars a strategic currency rather than only a score.

### Paths

Primary lenses:

- Functional Space
- Problem Solving
- Emergence
- Simplicity/Complexity

Paths now support avatar movement and soil harvest access. This is a major design improvement because it converts decoration into logistics.

### Soil

Primary lenses:

- Goals
- Reward
- Problem Solving
- Time

Soil gives a small star reward after several defended swarms, but collection requires a connected path. This makes soil a low-stakes introduction to infrastructure planning.

### Boxer And Tennis Trees

Primary lenses:

- Skill
- Challenge
- Meaningful Choices
- Character

The two defender types create tactical differences: close-range toughness versus long-range projectile coverage. Upgrades reinforce attachment to existing placed trees.

### Tree Upgrades

Primary lenses:

- Reward
- Economy
- Meaningful Choices
- Endogenous Value

Tree upgrades spend both energy and stars. The visual growth makes the invisible stat increase readable and gives the player a stronger sense of ownership.

### Swarms

Primary lenses:

- Challenge
- Action
- Time
- Goals

Swarms are scheduled events that test the village. Because the player can build and heal during the wave, the mode stays interactive instead of becoming a passive tower-defense replay.

### Crazy Capy

Primary lenses:

- Novelty
- Surprise
- Reward
- Character

Crazy Capy is unlocked through the Prize Machine and powered by active calories. It connects collection, activity, village layout, and combat into one memorable feature.

### Forest Spirit

Primary lenses:

- Motivation
- Reward
- Fairness
- Punishment

Forest Spirit rewards seven consecutive daily opens with a support powerup that heals damaged units and walls. It creates a positive counterweight to any missed-swarm wear system.

### Prize Machine

Primary lenses:

- Chance
- Expected Value
- Triangularity
- Curiosity

The Prize Machine gives stars a long-term sink. It works best when it includes both expressive rewards and meaningful unlocks, while direct tree upgrades remain available for players who want reliable progress.

### Persistence And Save State

Primary lenses:

- State Machine
- Fairness
- Endogenous Value

The village matters because it persists. Manual save, autosave before swarms, and completed-swarm publishing support trust in the player's investment.

### Notifications And Widget

Primary lenses:

- Time
- Motivation
- Interface

Notifications and the iOS widget extend the village rhythm outside the app. They should invite action without creating anxiety.

## Design Risks To Discuss

### Risk 1: Too Many Currencies Or Sinks

Energy, stars, upgrades, Prize Machine pulls, and reward cycles can become hard to parse.

Lens check:

- Simplicity/Complexity
- Economy
- Interface

Advisor question:

> Does each currency have a distinct emotional role?

### Risk 2: Punishment Tone

Missed-swarm wear can make the village feel alive, but the tone matters because Fitmoji is wellness-adjacent.

Lens check:

- Punishment
- Fairness
- Motivation

Advisor question:

> Does absence create recoverable maintenance, or does it create guilt?

### Risk 3: Path Friction

Path-required harvest creates better strategy, but it can frustrate players if path shapes are not readable.

Lens check:

- Functional Space
- Interface
- Problem Solving

Advisor question:

> Can players predict why a soil tile is or is not connected?

### Risk 4: Gasha Versus Direct Progress

Stars now support both tree upgrades and Prize Machine pulls.

Lens check:

- Triangularity
- Chance
- Expected Value
- Meaningful Choices

Advisor question:

> Are both spending routes attractive, or does one become a dominant strategy?

### Risk 5: Visual Scale And Board Readability

Tree upgrades increase sprite size by 20% per level up to level 4. This makes progress visible, but it can create overlap in a dense isometric scene.

Lens check:

- Interface
- Functional Space
- Elegance

Advisor question:

> Does visual growth improve readability, or eventually hide important board state?

## Short Advisor Pitch

Fitmoji uses Schell's lenses to turn wellness data into a designed game experience. The Lens of Endogenous Value explains why steps and exercise become energy instead of just points. The Lens of Economy explains the relationship between energy, stars, upgrades, and prize pulls. The Lens of Meaningful Choices explains why players choose between soil, paths, defenses, upgrades, and gasha. The Lens of Time explains scheduled swarms, harvest cycles, daily opens, and seasonal energy. The Lens of Punishment and Fairness helps us keep missed-swarm consequences light, recoverable, and emotionally appropriate.

The design is strongest when every mechanic supports the same promise:

> Your real activity helps you care for, defend, and personalize a living village.
