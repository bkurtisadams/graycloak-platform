# @graycloak/odd-chainmail-rules

OD&D (Books I-III) + Chainmail rules engine. Pure JavaScript, no host
dependencies: runs in Node, the browser, and Cloud Functions.

Rules authority: the OD&D Rules Reference doc (Claude Docs) and Kurt's rulings log.

## Layout

- `index.js` - re-exports every module in `src/`
- `src/*.mjs` - one rules area per file; each carries its own self-tests
- `test/self-tests.test.js` - runs every module's self-tests under `node --test`

Run all tests from this folder:

    npm test

Run one module's self-tests:

    node src\combat-engine.mjs

## Provenance

Extracted from the odd-chainmail Foundry system (`module/rules/`), Sep 2026.
Every pure module was copied; three Foundry-bound spell modules were left out
(`spell-effects.mjs`, `spell-registry.mjs`, `spellcasting.mjs`).

Changes made during extraction:

1. Self-test guard works on Windows (the old guard compared a file:// URL to a
   Windows path and never matched, so `node <module>` printed nothing).
2. `tables.mjs`: Appendix B columns now map Leather Armor to AC 7 and Shield
   Only to AC 8 (Book I p.19). The Foundry build read Leather as AC 8, so
   daggers, hand axes, morning stars and spears used the wrong number against
   leather and shield-only targets.
3. `hit-dice.mjs`, `fighting-capability.mjs`: Thieves use the Greyhawk thief
   table's own hit dice and Fighting Capability (Kurt's ruling) instead of the
   Magic-User rows.
4. `index.js`: `reactionFor` exists in both `morale.mjs` and `retainers.mjs`;
   exported as `moraleReactionFor` and `retainerReactionFor`.

## Changes since extraction

- 0.1.1: `resolveExchange` now passes a creature's attack profile (natural
  attack, extra damage dice, flat damage bonus) through to each blow. Before,
  an ogre in a two-way exchange hit for 1d6 instead of 1d6+2 and gained
  weapon-speed blows it shouldn't have.

- 0.2.0: new `engagement.mjs` for grid combat: movement budget in 3⅓'
  cells (1" indoors = 3 cells; diagonals 1½), reachable cells around walls,
  adjacency, facing from position (front, left or right flank, rear), the
  Chainmail p.16 half-move join rule, and melee rounds counted from first
  contact.

- 0.3.0: new `casting.mjs` (casting gate, Sleep, Charm Person, Hold Person,
  Protection from Evil, monster saves); `morale.mjs` adds troop-type Loss
  Table rows (`troopLossLine`) and Book II morale adjustments.
- 0.3.1: `resolveAttackPool` takes `everyDieBonus` (a modifier on every blow)
  and `damageDoubled` on the target; used for held targets (+4, double
  damage) and Protection from Evil (-1). `castingGate` now keys on a hit
  (`hitFirst`), per Kurt's ruling.
- 0.3.2: `slotsFor` returns no spell slots for Fighting-Men and Thieves.
- 0.4.0: `monsters.mjs` holds the whole Book II bestiary (76 entries:
  men, humanoids, undead, fantastic creatures, dragons, giants,
  lycanthropes, elementals, clean-up crew, horses) with Chainmail Fantasy
  Reference Table troop types and morale, special abilities, and a grid
  `size` in cells.
- 0.5.0: new `specials.mjs` for monster special abilities in man-to-man
  combat: energy drain, regeneration timing, breath-or-bite and breath
  areas (cone, line, cloud), swallowing, wyvern sting, hydra heads, and
  the creatures that hit dwarves and gnomes for half damage.
- 0.6.0: new `treasure.mjs` (Book II treasure types A–I, gems, jewellery,
  Magic/Maps table, every magic item table, sword alignment/intelligence/
  egoism/purpose, maps, carried coins, lair extras) and `inventory.mjs`
  (carried coins and items, weights, XP value, transfers, move with load).
- 0.6.1: `engagement.mjs` adds `chargeAllowance` and `canCharge` (Chainmail
  charge moves, Kurt's mapping for OD&D move rates).
- 0.6.2: `casting.mjs` adds Fire Ball and Lightning Bolt (`spellDamageDice`,
  `fireBallCells` that conforms to confined spaces, `lightningCells` that
  doubles back off walls).
- 0.7.0: new `reactions.mjs` (encounter reaction with bribe, force and
  alignment modifiers; languages and parley; offer of service; surrender;
  Book III pursuit; orc lair morale and tribal hostility). Every monster
  gets a `mind` (intelligence tier, behaviour profile, language, common).
  `specials.mjs` adds `drainLevels`, `drainerDamage`, `risesAs`,
  `ghoulTouch`, `trollRound` with fire/acid, and gaze (`gazeCheck`, avert,
  reflector, `BLIND`). `casting.mjs` adds `areaSpellDice`, `saveForHalf`,
  `lightningStartOk`. `engagement.mjs` adds the 45° mounted charge curve.
  Dragon talk and sleep chances (Book II), `oilDeters` (DMG 75% vs
  unintelligent pursuers), `foundAsleep`.
- 0.8.0: man-to-man morale (`manToManMoraleDue`, `manToManLossCheck`:
  a third of the side killed; castle defenders exempt); monster morale
  bonuses and dragon fear (`moraleDiceBonus`, `fearRadius`) read from the
  monster data; `commanderLost` takes a unit's own bonus. New
  `charge-morale.mjs` (cavalry charge check and table) and
  `exploration.mjs` (underworld turn, Book III rest rule).
- 0.9.0: combat runner, pass 1. New `runner.mjs` (exported as
  `fightRunner`): `apply(state, action, rng)` returns data events and owns
  the Chainmail turn sequence with the initiative winner's election, the
  step order (artillery kept in place), the morale pass after fire and
  melee, and the end of the fight. New `board.mjs` (exported as `board`):
  pure geometry and figure status. `serialRng` / `rngHolder`: a seeded
  generator whose state can be saved, matching `mulberry32`.
- 0.10.0: combat runner, pass 2. New `movement.mjs` (exported as
  `movement`): move rates, charge allowance, reach, legal moves, closing on
  a target, group moves. New `behaviour.mjs` (exported as `behaviour`): the
  profile-driven decision loop. The runner adds the actions "move",
  "charge-mode", "close-on", "group-move" and "behave".

## Open items

- `chargen.mjs` / `multiclass.mjs` include Greyhawk multi-class thief combos
  (e.g. elf Fighter/Magic-User/Thief). Confirm whether these stay, given the
  ruling that only the Thief class comes from Greyhawk.
- chainmail-board.html has its own inline resolvers (mass melee, morale,
  joust, missiles). Moving it onto this package is a separate job.
