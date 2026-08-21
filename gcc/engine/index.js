// @graycloak/battlesystem-engine v0.4.2 - 2026-08-21
// v0.4.2: combat.js v3.3.2 — heavy lance S/M ruled 2d4+1 (3-9 as the idiomatic
//         1e dice combo, superseding v3.3.1's 3d3). No API changes.
// v0.4.1: combat.js v3.3.1 — lances corrected to the verified PHB table (light
//         1d6 / 1d8 L; heavy 3d3 / 3d6 L). No API changes.
// v0.4.0: combat.js v3.3.0 — PHB lance damage pairs (light/medium/heavy + 'lance'
//         alias) for the cavalry slice. BattlesystemCavalry [11.1]-[11.5] and
//         appendMountDamageComponents were already exported; no API changes.
// v0.3.0: missiles.js module — MISSILE_WEAPONS + ARTILLERY_WEAPONS [10.9],
//         missileKey/missileDataFor normalization, rangeBand [10.8]/[10.9].
//         Fire data migrated out of battlesystem-board.html (v0.24-v0.25).
// BATTLESYSTEM 1e mass combat rules engine. Pure JS, no host dependencies.
// Consumers: ars-battlesystem-tab (Foundry), battlesystem-board.html (GCC),
// Node battle simulations (Emridy Meadows).
//
// Dice: resolveMeleeCombat accepts an injected roll2d6 () => ({ total, dice }).
// Foundry pre-evaluates its Roll and passes the result; sims pass a seeded PRNG.

export { CombatResultsTable } from './src/combat-table.js';
export { BattlesystemCombat } from './src/combat.js';
export { BattlesystemMorale } from './src/morale.js';
export { BattlesystemMovement } from './src/movement.js';
export { BattlesystemCreatures } from './src/creatures.js';
export { BattlesystemCavalry } from './src/cavalry.js';
export { BattlesystemTerrain } from './src/terrain.js';
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
