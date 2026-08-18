// @graycloak/battlesystem-engine v0.1.0 - 2026-08-17
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
