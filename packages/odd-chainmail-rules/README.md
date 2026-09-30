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

## Open items

- `chargen.mjs` / `multiclass.mjs` include Greyhawk multi-class thief combos
  (e.g. elf Fighter/Magic-User/Thief). Confirm whether these stay, given the
  ruling that only the Thief class comes from Greyhawk.
- chainmail-board.html has its own inline resolvers (mass melee, morale,
  joust, missiles). Moving it onto this package is a separate job.
