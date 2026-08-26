// @graycloak/battlesystem-engine v0.8.0 - 2026-08-26
// v0.8.0: spells.js owns the complete PHB class/level catalog + metadata and
//         the existing pure named spell preset / Hold Person / Sleep rule helpers.
//         Board geometry, rolls, application, preparation, and UI remain host-side.
// v0.7.1: correct Daoud's Wondrous Lanthorn source-distance scaling: its
//         dungeon-scale 30-foot range is 3 AD&D game inches and its 10-foot
//         no-save/no-MR zone is 1 game inch; those tabletop inches carry unchanged
//         onto the outdoor BATTLESYSTEM battlefield.
// v0.7.0: spells.js begins source-backed spell/item-spell adapters. Daoud's
//         Wondrous Lanthorn supplies effective level, fuel costs, source targeting,
//         and close-range save/MR overrides while host spell resolvers remain shared.
// v0.6.0: items.js extracts canonical character items, inventory/loadout state,
//         item resources, weapon/armor normalization, item-provided actions/effects,
//         and legacy weapon/magic-item migration helpers from the GCC board.
//         Read predicates remain identity-stable; normalization occurs only on
//         hydration/replacement/edit paths.
// v0.5.0: effects.js + actions.js establish the pure effect/action vocabulary used
//         by canonical Hero items and spell/item action surfaces.
// v0.4.2: combat.js v3.3.2 - heavy lance S/M ruled 2d4+1 (3-9 as the idiomatic
//         1e dice combo, superseding v3.3.1's 3d3). No API changes.
// v0.4.1: combat.js v3.3.1 - lances corrected to the verified PHB table (light
//         1d6 / 1d8 L; heavy 3d3 / 3d6 L). No API changes.
// v0.4.0: combat.js v3.3.0 - PHB lance damage pairs (light/medium/heavy + 'lance'
//         alias) for the cavalry slice. BattlesystemCavalry [11.1]-[11.5] and
//         appendMountDamageComponents were already exported; no API changes.
// v0.3.0: missiles.js module - MISSILE_WEAPONS + ARTILLERY_WEAPONS [10.9],
//         missileKey/missileDataFor normalization, rangeBand [10.8]/[10.9].
//         Fire data migrated out of battlesystem-board.html (v0.24-v0.25).
// BATTLESYSTEM 1e mass combat rules engine. Pure JS, no host dependencies.
// Consumers: ars-battlesystem-tab (Foundry), battlesystem-board.html (GCC),
// Node battle simulations (Emridy Meadows).

export { CombatResultsTable } from './src/combat-table.js';
export { BattlesystemCombat } from './src/combat.js';
export { BattlesystemMorale } from './src/morale.js';
export { BattlesystemMovement } from './src/movement.js';
export { BattlesystemCreatures } from './src/creatures.js';
export { BattlesystemCavalry } from './src/cavalry.js';
export { BattlesystemTerrain } from './src/terrain.js';
export { BattlesystemEffects, EFFECT_MODES } from './src/effects.js';
export { BattlesystemActions, CHARACTER_ACTION_KINDS } from './src/actions.js';
export { BattlesystemItems } from './src/items.js';
export { BattlesystemSpells } from './src/spells.js';
export { MISSILE_WEAPONS, ARTILLERY_WEAPONS, missileKey, missileDataFor, rangeBand } from './src/missiles.js';
export {
  ratioFromHD,
  creaturesPerFigure,
  calculateHDPerFigure,
  parseHDNumeric,
  parseDamageString,
  appendMountDamageComponents,
  splitLegacyDamagePair,
  resolveDamagePair,
  buildWeaponDamageDefinition
} from './src/unit-math.js';
