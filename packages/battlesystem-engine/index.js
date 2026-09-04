// @graycloak/battlesystem-engine v0.16.0 - 2026-09-04
// v0.16.0: magic-healing.js adds pure BATTLESYSTEM [14.16] curative-magic recognition:
//          named cure/heal/raise/wish spells, HD cured per spell level, hp÷4 conversion,
//          and the cumulative ½-HD Wound-marker threshold. Hosts own targets/state/logs.
// v0.15.0: aerial.js adds pure BATTLESYSTEM [15.4] bombing data: fixed target
//          AC by altitude, whole man-sized weight-equivalent normalization, the
//          2d6 damage profile, and the one-class maneuverability penalty.
// v0.14.0: individual-combat.js rollDamage rolls AD&D expressions as written (any die
//          size, NdS±M term sums, negative modifiers, MM a-b ranges). unit-math.js adds
//          damageExpressionStats + approximateCrtDamage (nearest legal CRT die, flagged
//          approximated/sourceExpr) for §9.4A hero-vs-unit; parseDamageString accepts
//          '-' modifiers and is anchored. items.js: explicit kind beats name heuristics,
//          syncWeaponRows matches by itemId, an explicitly empty Primary is preserved
//          (mainWeaponExplicit).
// v0.13.0: secondary-effects.js adds pure reusable conditional creature-effect records,
//          trigger/attack-match/chance/save metadata, multi-hit batch predicates, and
//          level-drain bridging. Hosts retain AD&D saves, state/status/equipment mutation,
//          logs, UI, and referee rulings.
// v0.12.0: innate-actions.js adds pure structured innate/spell-like action records,
//          frequency/chance/caster-level/timing/target/resolver metadata, Magic-entry
//          bridging, and activation/timing checks. Hosts retain battlefield UI,
//          state mutation, logs, spell/item resources, placement, and referee rulings.
// v0.11.2: spells.js adds the ordinary AD&D Magic Missile execution contract/preset:
//          caster-level range and missile count, selected-target no-save damage,
//          and a magic damage tag so host Magic Resistance resolves first.
// v0.11.1: creature-defenses.js extracts reusable creature-defense normalization,
//          AD&D magic-resistance adjustment/rolls, arbitrary tagged damage
//          responses, generalized weapon requirements, and legacy §13.3
//          Magic/Silver migration. Hosts retain UI, state mutation, logs, and rulings.
// v0.11.0: attack-routines.js separates ordered attacks inside one AD&D routine
//          from the cadence that repeats the entire routine; §9.4B can now resolve
//          multi-part monster routines without treating each component as #AT.
// v0.10.4: magic-movement.js adds pure §14.13 movement-magic recognition and
//          the Missile-&-Magic-Phase-only timing contract, including innate
//          Teleport. Normal AD&D/D&D movement effects remain host/referee-owned.
// v0.10.3: magic-defenses.js adds pure §14.12 defensive-magic recognition,
//          Pass-Through eligibility metadata, and the explicit BATTLESYSTEM
//          Mirror Image HD-damage sharing calculation. Hosts retain AD&D
//          spell-specific resolution, state mutation, UI, logs, and referee rulings.
// v0.10.2: missiles.js generalizes giant rock throwing across recognized giant races,
//          using BATTLESYSTEM S/M/L roster bands and subtype damage. Giants expose
//          Hurl rocks as ROF 1 thrown missile capability rather than artillery.
// v0.10.1: Hill-Giant-only source-flat prototype (superseded by v0.10.2).
// v0.10.0: individual-combat.js extracts pure §9.4B AD&D 1e individual-combat
//          cadence, initiative scheduling, THAC0/AC hit resolution, hp damage,
//          weapon hitability traits, regeneration, and level-drain pause state.
//          Board hosts retain geometry, roster adapters, logs, DOM/UI, and dialogs.
// v0.9.1: spells.js layers source/item overrides over canonical named-spell
//         presets and adds ordinary Cleric Flame Strike to the shared damage
//         preset vocabulary. Board hosts still own battlefield execution.
// v0.9.0: spells.js adds pure execution contracts for named spell resolver,
//         automation, caster class, target/save/damage/timing/status routing.
//         Board hosts retain geometry, dice, state mutation, logs, and UI.
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
export { damageExpressionStats, approximateCrtDamage } from './src/unit-math.js';
export { BattlesystemSpells } from './src/spells.js';
export { BattlesystemIndividualCombat } from './src/individual-combat.js';
export { BattlesystemAttackRoutines } from './src/attack-routines.js';
export { BattlesystemMagicDefenses } from './src/magic-defenses.js';
export { BattlesystemCreatureDefenses } from './src/creature-defenses.js';
export { BattlesystemMagicMovement } from './src/magic-movement.js';
export { BattlesystemMagicHealing } from './src/magic-healing.js';
export { BattlesystemInnateActions } from './src/innate-actions.js';
export { BattlesystemSecondaryEffects } from './src/secondary-effects.js';
export { BattlesystemAerial } from './src/aerial.js';
export { MISSILE_WEAPONS, GIANT_ROCK_PROFILES, ARTILLERY_WEAPONS, missileKey, missileDataFor, giantRockTypeFor, giantRockDataFor, rangeBand } from './src/missiles.js';
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
