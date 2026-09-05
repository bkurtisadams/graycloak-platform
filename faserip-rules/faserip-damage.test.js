// faserip-damage test suite — run: node faserip-damage.test.js
// [CERT] tests certify against Players Book worked examples and prose.

import {
  bluntDamage, meleeWeaponDamage, bluntThrowDamage, chargeDamage,
  defenseValue, applyDefense, resolveChargeImpact, forceFieldBreach,
  resolveResistance, enduranceLossStep, recoveryAmount, healingPerHour,
  applyHealing, resolveFallImpact, KARMA_STABILIZE_ONE_ROUND, KARMA_EXTRA_ENDURANCE_FEAT,
  chargeDamageParts, chargeToHitShift, chargeMissContinuation, MATERIAL_EXAMPLES,
  INDESTRUCTIBLE_MATERIAL_RANKS, CHARGE_MAX_TO_HIT_CS,
  impairedEnduranceNumber, enduranceRestoreStep, regainConsciousnessFeat,
  stabilizationOutcome, disabilityCheck, robotReactivation, recoveryAllowed,
  ZERO_HEALTH_UNCONSCIOUS_ROUNDS, STUN_ROUNDS, STABILIZE_UNCONSCIOUS_HOURS, WAKE_RETRY_TURNS,
  RECOVERY_DELAY_TURNS, RECOVERY_PER_DAY, HEALING_INTERVAL_TURNS,
  IMPAIRED_ABILITY_SHIFT, ENDURANCE_RANK_HEAL_DAYS, DISABILITY_ABILITIES,
  DAMAGE_VERSION, DAMAGE_CERTIFIED,
} from './faserip-damage.js';

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; console.log(`  ok  ${label}`); }
  catch (e) { fail++; console.log(`FAIL  ${label}\n      ${e.message}`); }
}
function eq(a, b) {
  const ja = JSON.stringify(a), jb = JSON.stringify(b);
  if (ja !== jb) throw new Error(`expected ${jb}, got ${ja}`);
}

console.log(`faserip-damage v${DAMAGE_VERSION}  (DAMAGE_CERTIFIED=${DAMAGE_CERTIFIED})\n`);

// --- Damage by attack form ---------------------------------------------

t('[CERT] bare hands inflict Strength rank number', () => {
  eq(bluntDamage({ strength: 75 }), 75);
});

t('[CERT] Aunt May Feeble(2) + Excellent lead pipe -> 3 (min of next rank above Strength)', () => {
  eq(bluntDamage({ strength: 2, weaponMaterialRank: 'EX' }), 3);
});

t('[CERT] Daredevil Good(10) + Excellent lead pipe -> 16', () => {
  eq(bluntDamage({ strength: 10, weaponMaterialRank: 'EX' }), 16);
});

t('[CERT] Thing Monstrous(75) + Excellent lead pipe -> 20 (capped at material)', () => {
  eq(bluntDamage({ strength: 75, weaponMaterialRank: 'EX' }), 20);
});

t('[CERT] Wonder Man + knife: minimum 10, maximum 20 (Excellent material)', () => {
  eq(meleeWeaponDamage({ listedDamage: 10, strength: 100, weaponMaterialRank: 'EX' }), { min: 10, max: 20 });
});

t('[CERT] weak wielder never drops a designed weapon below its listed damage', () => {
  eq(meleeWeaponDamage({ listedDamage: 10, strength: 2, weaponMaterialRank: 'EX' }), { min: 10, max: 10 });
});

t('[CERT] blunt thrown: lesser of Strength and item material strength', () => {
  eq(bluntThrowDamage({ strength: 100, itemMaterialRank: 'GD' }), 10);
  eq(bluntThrowDamage({ strength: 6, itemMaterialRank: 'RM' }), 6);
});

t('[CERT] charging example: Endurance Good(10), 10 areas -> 10 + 2x10 = 30', () => {
  eq(chargeDamage({ endurance: 10, areas: 10 }), 30);
});

t('[CERT] charging uses higher of Endurance or Body Armor as the base', () => {
  eq(chargeDamage({ endurance: 10, bodyArmor: 40, areas: 5 }), 50);
});

// --- Defenses ----------------------------------------------------------

t('[CERT] Body Armor vs Energy: Ex(25)->5, Mn(87)->67, Gd(10)->0', () => {
  eq(defenseValue({ kind: 'body-armor', rankNumber: 25 }, 'energy'), 5);
  eq(defenseValue({ kind: 'body-armor', rankNumber: 87 }, 'energy'), 67);
  eq(defenseValue({ kind: 'body-armor', rankNumber: 10 }, 'energy'), 0);
});

t('[CERT] Force Field: full vs Energy, -10 vs all other attacks', () => {
  eq(defenseValue({ kind: 'force-field', rankNumber: 21 }, 'energy'), 21);
  eq(defenseValue({ kind: 'force-field', rankNumber: 21 }, 'physical'), 11);
});

t('[CERT] dagger (10) vs Amazing(50) Body Armor: no damage, no Kill effect', () => {
  const r = applyDefense({ damage: 10, defense: { kind: 'body-armor', rankNumber: 50 } });
  eq(r.through, 0);
  eq(r.effectsApply, false);
});

t('[CERT] borderline rule: damage exactly balanced by defenses -> 0 through, effects still apply', () => {
  const r = applyDefense({ damage: 50, defense: { kind: 'body-armor', rankNumber: 50 } });
  eq(r.through, 0);
  eq(r.effectsApply, true);
});

t('[CERT] damage past armor: through = damage - value, effects apply', () => {
  const r = applyDefense({ damage: 75, defense: { kind: 'body-armor', rankNumber: 40 } });
  eq(r.through, 35);
  eq(r.effectsApply, true);
});

t('[CERT] charging rebound example: 30 dmg, target BA Ex(20), attacker BA Gd(10) -> target 10, attacker 10', () => {
  const r = resolveChargeImpact({ damage: 30, targetDefense: 20, attackerDefense: 10 });
  eq(r.targetTakes, 10);
  eq(r.rebound, 20);
  eq(r.attackerTakes, 10);
});

t('[CERT] charging a Good(10) wall unarmored: attacker takes 10', () => {
  const r = resolveChargeImpact({ damage: 30, targetDefense: 10, attackerDefense: 0 });
  eq(r.attackerTakes, 10);
});

t('[CERT] force field breach: damage exceeding rank number breaches with excess', () => {
  eq(forceFieldBreach({ fieldRankNumber: 75, damage: 75 }), { breached: false, excess: 0 });
  eq(forceFieldBreach({ fieldRankNumber: 75, damage: 76 }), { breached: true, excess: 1 });
});

// --- Resistances -------------------------------------------------------

t('[CERT] Amazing(50) fire resistance ignores Incredible(40) steam automatically', () => {
  const r = resolveResistance({ resistanceNumber: 50, intensityNumber: 40, roll: 1 });
  eq(r.negated, true);
  eq(r.automatic, true);
});

t('[CERT] equal-intensity resistance: yellow FEAT negates; failure falls back to armor', () => {
  const good = resolveResistance({ resistanceNumber: 50, intensityNumber: 50, roll: 60 });
  eq(good.needed, 'yellow');
  eq(good.negated, true);
  const bad = resolveResistance({ resistanceNumber: 50, intensityNumber: 50, roll: 30 });
  eq(bad.negated, false);
  eq(bad.fallbackArmor, 50);
});

// --- Life, death, and healing ------------------------------------------

t('[CERT] death spiral: one rank per turn, checks at highest number of new rank', () => {
  const step = enduranceLossStep('EX');
  eq(step.dead, false);
  eq(step.rank, 'GD');
  eq(step.numberForChecks, 15);
});

t('[CERT] slipping below Shift 0 is death', () => {
  eq(enduranceLossStep('SH0').dead, true);
});

t('[CERT] stabilization karma costs: 50 for one round, 200 for extra Endurance FEAT', () => {
  eq(KARMA_STABILIZE_ONE_ROUND, 50);
  eq(KARMA_EXTRA_ENDURANCE_FEAT, 200);
});

t('[CERT] Recovery regains Endurance rank number; Healing per hour doubles under medical care', () => {
  eq(recoveryAmount(30), 30);
  eq(healingPerHour(30), 30);
  eq(healingPerHour(30, { medicalCare: true }), 60);
});

t('[CERT] healing never exceeds maximum Health', () => {
  eq(applyHealing({ current: 90, max: 100, amount: 30 }), 100);
});

t('[CERT] She-Hulk landing: Incredible(40) BA vs Excellent road at speed 20 — the road gives, she takes nothing', () => {
  const r = resolveFallImpact({ enduranceNumber: 40, bodyArmorNumber: 40, impactSpeedAreas: 20, floorsFallen: 33, groundMaterialRank: 'EX' });
  eq(r.groundGives, true);
  eq(r.heroTakes, 0);
});

t('[CERT] unarmored faller onto Excellent road at speed 10: ground gives, rebound 20 taken', () => {
  const r = resolveFallImpact({ enduranceNumber: 6, impactSpeedAreas: 10, floorsFallen: 10, groundMaterialRank: 'EX' });
  eq(r.chargeDamage, 26);
  eq(r.groundGives, true);
  eq(r.heroTakes, 20);
});

t('[CERT] ground holds: charging model rebounds full damage; distance model takes floors fallen (errata OPEN)', () => {
  const charging = resolveFallImpact({ enduranceNumber: 6, impactSpeedAreas: 10, floorsFallen: 10, groundMaterialRank: 'RM' });
  eq(charging.groundGives, false);
  eq(charging.heroTakes, 26);
  const distance = resolveFallImpact({ enduranceNumber: 6, impactSpeedAreas: 10, floorsFallen: 10, groundMaterialRank: 'RM', model: 'distance' });
  eq(distance.heroTakes, 10);
});

// --- Charging helpers (v0.8.1) -----------------------------------------

t('[CERT] charging parts: End Gd(10), 10 areas -> base 10 reducible + 20 fixed speed bonus = 30', () => {
  eq(chargeDamageParts({ endurance: 10, areas: 10 }), { base: 10, speedBonus: 20, total: 30, baseReducible: true, speedBonusFixed: true });
});

t('[CERT] charging parts use the higher of Endurance and Body Armor as the base', () => {
  eq(chargeDamageParts({ endurance: 10, bodyArmor: 20, areas: 3 }).base, 20);
});

t('[CERT] charging to-hit: +1CS per area moved, maximum +3CS, none without a full area', () => {
  eq([0, 1, 2, 3, 4, 7].map(chargeToHitShift), [null, 1, 2, 3, 3, 3]);
  eq(CHARGE_MAX_TO_HIT_CS, 3);
});

t('[CERT] charging miss continues half speed rounded up in a straight line', () => {
  eq(chargeMissContinuation(7), 4);
  eq(chargeMissContinuation(4), 2);
});

t('[CERT] Material Strength examples: steel Remarkable, Vibranium Incredible, Adamantium Unearthly; Class 1000+ indestructible', () => {
  eq(MATERIAL_EXAMPLES.RM.includes('steel'), true);
  eq(MATERIAL_EXAMPLES.IN.includes('Vibranium'), true);
  eq(MATERIAL_EXAMPLES.UN[0], 'Adamantium steel');
  eq(INDESTRUCTIBLE_MATERIAL_RANKS, ['CL1000', 'CL3000', 'CL5000']);
});

// --- Life, Death, and Health (v0.9.0) -----------------------------------

t('[CERT] 0 Health: unconscious 1-10 rounds; a Stun lasts 1-10 rounds', () => {
  eq(ZERO_HEALTH_UNCONSCIOUS_ROUNDS, { min: 1, max: 10 });
  eq(STUN_ROUNDS, { min: 1, max: 10 });
});

t('[CERT] impaired Endurance number is the highest of the reduced rank (Ex -> Gd counts as 15)', () => {
  eq(impairedEnduranceNumber('GD'), 15);
  eq(enduranceLossStep('EX'), { dead: false, rank: 'GD', numberForChecks: 15 });
  eq(enduranceLossStep('FE'), { dead: false, rank: 'SH0', numberForChecks: 0 });
});

t('[CERT] at Shift 0 the character is not yet dead; the next loss is', () => {
  eq(enduranceLossStep('PR').rank, 'FE');
  eq(enduranceLossStep('SH0').dead, true);
});

t('[CERT] aid halts the loss: unconscious 1-10 more hours at 0 Health, conscious above it', () => {
  eq(stabilizationOutcome({ health: 0 }), { lossHalted: true, unconscious: true, hours: { min: 1, max: 10 } });
  eq(stabilizationOutcome({ health: 3 }), { lossHalted: true, unconscious: false, hours: null });
  eq(STABILIZE_UNCONSCIOUS_HOURS, { min: 1, max: 10 });
});

t('[CERT] regain consciousness: green Endurance FEAT; success wakes with Health = Endurance number', () => {
  const ok = regainConsciousnessFeat({ enduranceRank: 'GD', enduranceNumber: 15, roll: 60 });
  eq([ok.needed, ok.color, ok.success, ok.wakeHealth, ok.retryTurns], ['green', 'green', true, 15, null]);
});

t('[CERT] regain consciousness: white fails and re-checks in 1-10 turns', () => {
  const no = regainConsciousnessFeat({ enduranceRank: 'GD', enduranceNumber: 15, roll: 10 });
  eq([no.color, no.success, no.wakeHealth, no.retryTurns], ['white', false, null, WAKE_RETRY_TURNS]);
  eq(WAKE_RETRY_TURNS, { min: 1, max: 10 });
});

t('[CERT] impaired Endurance heals one rank per week, per day under care, at -2CS meanwhile', () => {
  eq(IMPAIRED_ABILITY_SHIFT, -2);
  eq(ENDURANCE_RANK_HEAL_DAYS, { normal: 7, hospital: 1 });
});

t('[CERT] restoring ranks: intermediate ranks use the highest number, the original rank gets its own number back', () => {
  eq(enduranceRestoreStep({ rankKey: 'GD', originalRankKey: 'RM', originalNumber: 30 }), { restored: true, atCap: false, rank: 'EX', number: 25 });
  eq(enduranceRestoreStep({ rankKey: 'EX', originalRankKey: 'RM', originalNumber: 30 }), { restored: true, atCap: true, rank: 'RM', number: 30 });
  eq(enduranceRestoreStep({ rankKey: 'RM', originalRankKey: 'RM', originalNumber: 30 }).restored, false);
});

t('[CERT] disabilities at Shift 0: physical abilities above Good make a green FEAT; failure drops to the next printed number (Mn 75 -> Am 50)', () => {
  eq(DISABILITY_ABILITIES, ['fighting', 'agility', 'strength', 'endurance']);
  eq(disabilityCheck({ abilityRank: 'GD', roll: 1 }).atRisk, false);
  const fail = disabilityCheck({ abilityRank: 'MN', roll: 1 });
  eq([fail.atRisk, fail.impaired, fail.rank, fail.number], [true, true, 'AM', 50]);
  eq(disabilityCheck({ abilityRank: 'MN', roll: 99 }).impaired, false);
});

t('[CERT] Vision reactivation: Reason FEAT vs Unearthly intensity, 100 days, no Karma', () => {
  eq(robotReactivation({ highestRankKey: 'UN', highestPowerNumber: 100 }), { reasonIntensity: 'UN', days: 100, karmaOnReturn: 0 });
});

t('[CERT] Recovery gate: ten turns, once per day, not after a knockout or further damage', () => {
  eq(RECOVERY_DELAY_TURNS, 10);
  eq(RECOVERY_PER_DAY, 1);
  eq(recoveryAllowed({ conscious: true }).allowed, true);
  eq(recoveryAllowed({ conscious: false }).reason, 'unconscious');
  eq(recoveryAllowed({ conscious: true, knockedOut: true }).reason, 'knocked unconscious');
  eq(recoveryAllowed({ conscious: true, damagedAgain: true }).reason, 'damaged again');
  eq(recoveryAllowed({ conscious: true, usedToday: true }).reason, 'once per day');
  eq(recoveryAllowed({ conscious: true, turnsSinceDamage: 4 }), { allowed: false, reason: 'ten turns', turnsRemaining: 6 });
});

t('[CERT] Healing interval is one hour = 600 turns', () => {
  eq(HEALING_INTERVAL_TURNS, 600);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
