// engine.test.js v1.0.0 - 2026-08-17
// Converted from ars-battlesystem-tab tests/test-rules.js (Foundry console script).
// Pure-engine assertions only; Foundry flag/phase-gating tests remain in the module.
// Where possible, expected values come from the rulebook's own worked examples.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    CombatResultsTable,
    BattlesystemCombat,
    BattlesystemMorale,
    BattlesystemMovement,
    BattlesystemCavalry,
    BattlesystemTerrain,
    ratioFromHD,
    creaturesPerFigure,
    calculateHDPerFigure,
    parseHDNumeric,
    parseDamageString,
    appendMountDamageComponents,
    splitLegacyDamagePair,
    resolveDamagePair,
    buildWeaponDamageDefinition
} from '../index.js';

// ═══ [8.4] Rulebook worked example ═══
// AR 17 vs AC 8 → 9; 2d6 roll of 7 → Attack Roll 16; D8 column → 6 HD/figure;
// 10 figures → 60 HD total.
test('[8.4] rulebook melee example: AR17 vs AC8, roll 7, longswords, 10 figures', () => {
    const result = BattlesystemCombat.resolveMeleeCombat(
        {
            thaco: 17, ratio: '10:1', modifiers: {}, arBaseOverride: 17,
            weapon: { damageDice: 'D8', damageModifier: 0, numberOfDice: 1 },
            numberOfAttacks: 1, eligibleFigures: 10
        },
        { ac: 8, hitDice: 10, size: 'M' },
        () => ({ total: 7, dice: [3, 4] })
    );
    assert.equal(result.arMinusAC, 9);
    assert.equal(result.totalAttackRoll, 16);
    assert.equal(result.damagePerFigure, 6);
    assert.equal(result.rawTotalDamage, 60);
    assert.equal(result.killed, 6);        // 60 HD vs 10 HD/fig
    assert.deepEqual(result.diceResults, [3, 4]);
});

// ═══ [8.3] AR pipeline ═══
test('[8.3] ratio adjustments: 10:1 +0, 5:1 +5, 2:1 +10, 1:1 +15', () => {
    assert.equal(BattlesystemCombat.calculateAR(15, '10:1'), 15);
    assert.equal(BattlesystemCombat.calculateAR(15, '5:1'), 20);
    assert.equal(BattlesystemCombat.calculateAR(15, '2:1'), 25);
    assert.equal(BattlesystemCombat.calculateAR(15, '1:1'), 30);
});

test('[8.3] Table 10 modifiers stack on base', () => {
    const ar = BattlesystemCombat.calculateAR(15, '10:1', {
        openFormation: true, outOfCommand: true, higherGround: true, commanderFighting: true
    });
    assert.equal(ar, 15 + 1 + 1 - 1 - 1);
});

test('[8.3] AR override replaces base but modifiers still apply (v2.5.0 fix)', () => {
    const ar = BattlesystemCombat.calculateAR(15, '10:1', { sunlightPenalty: true }, 20);
    assert.equal(ar, 21);
});

// ═══ [8.5] Dice conversion / column shifting — rulebook examples ═══
test('[8.5] D6+1 reads on D8', () => {
    assert.deepEqual(CombatResultsTable.handleDamageModifier('D6', 1), { dice: 'D8', additionalD20s: 0 });
});

test('[8.5] D12+4 reads on D20', () => {
    assert.deepEqual(CombatResultsTable.handleDamageModifier('D12', 4), { dice: 'D20', additionalD20s: 0 });
});

test('[8.5] D20+3 wraps: D20 result + D4 result', () => {
    assert.deepEqual(CombatResultsTable.handleDamageModifier('D20', 3), { dice: 'D4', additionalD20s: 1 });
});

test('[8.5] D20-3 reads on D14; minus cannot pass D2', () => {
    assert.deepEqual(CombatResultsTable.handleDamageModifier('D20', -3), { dice: 'D14', additionalD20s: 0 });
    assert.deepEqual(CombatResultsTable.handleDamageModifier('D6', -4), { dice: 'D2', additionalD20s: 0 });
});

// RULEBOOK ERRATA [8.5] — RULED: the book's D8+11 example ("sum of D20 and
// D12") and D10+40 example ("D20×4 + D8") are printing errors, inconsistent
// with its own canonical D20+3 example (wrap restarts at D2, one column per
// shift). Engine steps consistently with D20+3: D8+11 → D8 + 1×D20,
// D10+40 → D3 + 4×D20. Ruling: Kurt, 2026-08-17 — known errata, code is RAW.
test('[8.5] D8+11 → D8 + 1×D20 (rulebook example is errata)', () => {
    assert.deepEqual(CombatResultsTable.handleDamageModifier('D8', 11), { dice: 'D8', additionalD20s: 1 });
});

test('[8.5] D10+40 → D3 + 4×D20 (rulebook example is errata)', () => {
    assert.deepEqual(CombatResultsTable.handleDamageModifier('D10', 40), { dice: 'D3', additionalD20s: 4 });
});

test('[8.5] 2D8 multiplies the D8 column result by 2', () => {
    // Attack Roll 16 on D8 = 6 → 2D8 = 12 (rulebook example value)
    const dmg = CombatResultsTable.calculateTotalDamage(16, { damageDice: 'D8', damageModifier: 0, numberOfDice: 2 }, 1);
    assert.equal(dmg, 12);
});

// ═══ [8.6]/[11.5] Multi-component damage ═══
test('[11.5] component weapons: one roll, columns summed', () => {
    // Attack Roll 16: D8 = 6, D4 = 3 → 9
    const weapon = { components: [
        { damageDice: 'D8', damageModifier: 0, numberOfDice: 1 },
        { damageDice: 'D4', damageModifier: 0, numberOfDice: 1 }
    ]};
    assert.equal(CombatResultsTable.calculateTotalDamage(16, weapon, 1), 9);
});

// ═══ [8.7] Casualties and wounds — rulebook examples ═══
test('[8.7] 35 HD vs 10 HD/fig orcs → 3 killed + 1 wound', () => {
    const r = BattlesystemCombat.processCasualties({ hitDice: 10 }, 35);
    assert.equal(r.killed, 3);
    assert.equal(r.wounds, 1);   // remainder 5 ≥ 10/4
});

test('[8.7] 31 HD vs 10 HD/fig orcs → 3 killed, no wound', () => {
    const r = BattlesystemCombat.processCasualties({ hitDice: 10 }, 31);
    assert.equal(r.killed, 3);
    assert.equal(r.wounds, 0);   // remainder 1 < 2.5, disregarded
});

// ═══ [8.1] Eligible fighters (from module test script) ═══
test('[8.1] eligible fighters matrix', () => {
    const ef = u => BattlesystemCombat.calculateEligibleFighters(u);
    assert.equal(ef({ ratio: '1:1', frontage: 5, figures: 1, formation: 'closed', weapon: 'longsword' }), 1);
    assert.equal(ef({ ratio: '10:1', frontage: 5, figures: 20, formation: 'closed', weapon: 'longsword' }), 7);   // 5 + 2 flank
    assert.equal(ef({ ratio: '10:1', frontage: 5, figures: 20, formation: 'closed', weapon: 'spear' }), 12);      // + 1 rear row
    assert.equal(ef({ ratio: '10:1', frontage: 5, figures: 20, formation: 'closed', weapon: 'pike' }), 17);       // + 2 rear rows
    assert.equal(ef({ ratio: '10:1', frontage: 5, figures: 20, formation: 'closed', weapon: 'halberd' }), 12);
    assert.equal(ef({ ratio: '10:1', frontage: 5, figures: 20, formation: 'open', weapon: 'longsword' }), 5);     // no flank/rear in open
    assert.equal(ef({ ratio: '10:1', frontage: 5, figures: 20, formation: 'open', weapon: 'spear' }), 5);
    assert.equal(ef({ ratio: '10:1', frontage: 3, figures: 10, formation: 'skirmish', weapon: 'longsword' }), 3);
    // v2.6.0 contact-aware: measured zero contact means no melee
    assert.equal(ef({ ratio: '10:1', frontage: 5, figures: 20, formation: 'closed', weapon: 'pike', contactFrontage: 0 }), 0);
    // cap at total figures
    assert.equal(ef({ ratio: '10:1', frontage: 5, figures: 6, formation: 'closed', weapon: 'pike' }), 6);
});

// ═══ [4.1] Base morale — rulebook examples ═══
test('[4.1] orc regulars: 11 +1 magic -1 AC8 +1 regular = 12', () => {
    const ml = BattlesystemMorale.calculateBaseMorale({
        hitDice: 1, figures: 12, armorClass: 8,
        hasMagicEquipment: true, unitIsRegular: true
    });
    assert.equal(ml, 12);
});

test('[4.1] hill giant skirmishers: 11 +2 HD +1 magic -2 six figures +1 AC4 = 13', () => {
    const ml = BattlesystemMorale.calculateBaseMorale({
        hitDice: 9, figures: 6, armorClass: 4, hasMagicEquipment: true
    });
    assert.equal(ml, 13);
});

// ═══ [4.6] Discipline ═══
test('[4.6] discipline = base morale + int/alignment; berserkers DL 0', () => {
    const unit = { hitDice: 1, figures: 12, armorClass: 8, unitIsRegular: true,
                   lawfulAlignment: true, highIntelligence: true };
    const base = BattlesystemMorale.calculateBaseMorale(unit);
    assert.equal(BattlesystemMorale.calculateDiscipline(unit), base + 2);
    assert.equal(BattlesystemMorale.calculateDiscipline({ ...unit, isBerserker: true }), 0);
});

// ═══ [4.1] Table 3 HD brackets including +1 HD half-steps ═══
test('[4.1] HD bracket boundaries (v2.1.1 half-step fix)', () => {
    const ml = hd => BattlesystemMorale.calculateBaseMorale({ hitDice: hd, figures: 12, armorClass: 5 });
    assert.equal(ml(0.5), 9);    // -2
    assert.equal(ml(0.75), 10);  // -1
    assert.equal(ml(1), 11);     // no mod
    assert.equal(ml(4), 12);     // +1
    assert.equal(ml(8.5), 12);   // 8+1 still +1 bracket
    assert.equal(ml(9), 13);     // +2
    assert.equal(ml(14.5), 13);  // 14+1 still +2 bracket
    assert.equal(ml(15), 14);    // +3
});

// ═══ [4.3] Morale check mechanics (injected 2d10) ═══
test('[4.3] 2d10 vs current morale: roll ≤ ML passes, > ML fails', () => {
    const unit = { hitDice: 1, figures: 12, armorClass: 8, unitIsRegular: true, baseMorale: 12 };
    const pass = BattlesystemMorale.checkMorale(unit, {}, () => ({ total: 12, dice: [6, 6] }));
    const fail = BattlesystemMorale.checkMorale(unit, {}, () => ({ total: 13, dice: [7, 6] }));
    assert.equal(pass.passed, true);
    assert.equal(fail.passed, false);
    assert.deepEqual(pass.diceResults, [6, 6]);
});

test('[4.6]/[13.9] discipline: DL 0 auto-fails, mindless undead auto-pass', () => {
    assert.equal(BattlesystemMorale.checkDiscipline({ discipline: 0 }).autoFail, true);
    assert.equal(BattlesystemMorale.checkDiscipline({ isMindlessUndead: true }).autoPass, true);
    const r = BattlesystemMorale.checkDiscipline({ discipline: 11 }, () => ({ total: 11, dice: [5, 6] }));
    assert.equal(r.passed, true);
});

// ═══ [7.15]/[6.4] Rout movement ═══
test('[7.15] rout distance = MV + 1/3 MV', () => {
    assert.equal(BattlesystemMovement.getRoutMovement(12), 16);
    assert.equal(BattlesystemMovement.getRoutMovement(9), 12);
});

// ═══ [11.2] Cavalry ═══
test('[11.2] cavalry HD = ceil(avg(rider, mount)); +3-or-less hp bonus not an HD', () => {
    assert.equal(BattlesystemCavalry.calculateCavalryHD(1, 3), 2);
    assert.equal(BattlesystemCavalry.calculateCavalryHD('3+3', 2), 3);   // 3+3 → 3 HD; ceil(2.5) = 3
    assert.equal(BattlesystemCavalry.calculateCavalryHD('6+6', 2), 5);   // 6+6 → 7 HD; ceil(4.5) = 5
});

// ═══ [11.8] Terrain ═══
test('[11.8] terrain movement: road bonus, rough half, water impassable', () => {
    assert.equal(BattlesystemTerrain.getTerrainData('road').mvMultiplier, 4 / 3);
    assert.equal(BattlesystemTerrain.getTerrainData('rough').mvMultiplier, 0.5);
    assert.equal(BattlesystemTerrain.getTerrainData('water').mvMultiplier, 0);
    assert.equal(BattlesystemTerrain.isImmuneToTerrain('woods', 'Elf'), true);
    assert.equal(BattlesystemTerrain.isImmuneToTerrain('rough', 'Dwarf'), true);
    assert.equal(BattlesystemTerrain.isImmuneToTerrain('woods', 'Orc'), false);
});

// ═══ unit-math ═══
test('[2.2] ratio from creature HD', () => {
    assert.equal(ratioFromHD(1), '10:1');
    assert.equal(ratioFromHD(4), '10:1');    // 4 HD flat is below 4+1
    assert.equal(ratioFromHD(4.5), '5:1');   // 4+1
    assert.equal(ratioFromHD(8.5), '5:1');   // 8+
    assert.equal(ratioFromHD(9), '2:1');
});

test('[3.1] HD per figure', () => {
    assert.equal(creaturesPerFigure('10:1'), 10);
    assert.equal(calculateHDPerFigure(1, '10:1'), 10);   // orcs
    assert.equal(calculateHDPerFigure(4, '5:1'), 20);    // ogres
});

test('parseHDNumeric applies DMG +3 rule', () => {
    assert.equal(parseHDNumeric('6+6').numeric, 7);
    assert.equal(parseHDNumeric('3+3').numeric, 3);
    assert.equal(parseHDNumeric('8+2').numeric, 8);
    assert.equal(parseHDNumeric(4).numeric, 4);
});

test('parseDamageString and mount components', () => {
    assert.deepEqual(parseDamageString('2d4'),
        { damageDice: 'D4', damageModifier: 0, numberOfDice: 2, numberOfAttacks: 1 });
    assert.deepEqual(parseDamageString('1d8+1'),
        { damageDice: 'D8', damageModifier: 1, numberOfDice: 1, numberOfAttacks: 1 });
    assert.equal(parseDamageString('1d7'), null);
    const combined = appendMountDamageComponents(
        { damageDice: 'D8', damageModifier: 0, numberOfDice: 1 }, '1d6/1d6');
    assert.equal(combined.components.length, 3);
    assert.equal(combined.numberOfAttacks, 1);
    // v1.14.0: per-component mount L profiles pair positionally, falling back to S/M
    const withL = appendMountDamageComponents(
        { damageDice: 'D8', damageModifier: 0, numberOfDice: 1 }, '1d4/1d6', '1d6/1d8');
    assert.equal(withL.components[1].damageDice, 'D4');
    assert.equal(withL.components[1].damageDiceVsLarge, 'D6');
    assert.equal(withL.components[2].damageDice, 'D6');
    assert.equal(withL.components[2].damageDiceVsLarge, 'D8');
});

// ═══ CRT spot checks against printed table ═══
test('CRT band handling: 0/less, 1-34 direct, 35-39 band, 40+ band', () => {
    assert.equal(CombatResultsTable.getDamageResult(0, 'D8'), 15);
    assert.equal(CombatResultsTable.getDamageResult(-5, 'D8'), 15);
    assert.equal(CombatResultsTable.getDamageResult(16, 'D8'), 6);
    assert.equal(CombatResultsTable.getDamageResult(37, 'D8'), 0);
    assert.equal(CombatResultsTable.getDamageResult(45, 'D20'), 0);
    assert.equal(CombatResultsTable.getDamageResult(45, 'D2'), 0);
});

// ═══ v3.1.0: component-wise vs-Large selection (module v2.7.0 port) ═══
test('[11.5] cavalry vs L: only the rider component with an L profile swaps', () => {
    // Rider lance 1d8 (1d12 vs L), mount hooves 1d6 (no L variant).
    const weapon = { components: [
        { damageDice: 'D8', damageModifier: 0, numberOfDice: 1, damageDiceVsLarge: 'D12' },
        { damageDice: 'D6', damageModifier: 0, numberOfDice: 1 }
    ]};
    const sel = BattlesystemCombat.selectWeaponForTargetSize(weapon, 'L');
    assert.equal(sel.components[0].damageDice, 'D12');
    assert.equal(sel.components[1].damageDice, 'D6');
    // vs M: untouched
    assert.equal(BattlesystemCombat.selectWeaponForTargetSize(weapon, 'M'), weapon);
});

test('selectWeaponForTargetSize applies damageModifierVsLarge', () => {
    const w = { damageDice: 'D8', damageModifier: 1, numberOfDice: 1,
                damageDiceVsLarge: 'D12', damageModifierVsLarge: 0 };
    const sel = BattlesystemCombat.selectWeaponForTargetSize(w, 'large');
    assert.equal(sel.damageDice, 'D12');
    assert.equal(sel.damageModifier, 0);
});

test('isLargeTarget: L words yes; S/M and non-size words no', () => {
    assert.equal(BattlesystemCombat.isLargeTarget('L'), true);
    assert.equal(BattlesystemCombat.isLargeTarget('huge'), true);
    assert.equal(BattlesystemCombat.isLargeTarget('gargantuan'), true);
    assert.equal(BattlesystemCombat.isLargeTarget('M'), false);
    assert.equal(BattlesystemCombat.isLargeTarget('gnoll'), false);  // old prefix-g bug
});

// ═══ unit-math v1.1.0: S/M-vs-L damage pairs (shared.js v1.14.0 port) ═══
test('splitLegacyDamagePair: only splits when RHS is L-marked', () => {
    assert.deepEqual(splitLegacyDamagePair('1d8 / 1d12 L'), { sm: '1d8', large: '1d12' });
    assert.deepEqual(splitLegacyDamagePair('1d4/1d4/1d8'), { sm: '1d4/1d4/1d8', large: '' });
    assert.deepEqual(splitLegacyDamagePair(''), { sm: '', large: '' });
});

test('resolveDamagePair precedence: explicit > legacy > fallback; large defaults to sm', () => {
    assert.deepEqual(resolveDamagePair('1d8', '1d12'), { sm: '1d8', large: '1d12' });
    assert.deepEqual(resolveDamagePair('', '', '1d8 / 1d12 L'), { sm: '1d8', large: '1d12' });
    assert.deepEqual(resolveDamagePair('1d6'), { sm: '1d6', large: '1d6' });
});

test('buildWeaponDamageDefinition attaches VsLarge fields with S/M fallback', () => {
    const w = buildWeaponDamageDefinition('1d8', '1d12');
    assert.equal(w.damageDice, 'D8');
    assert.equal(w.damageDiceVsLarge, 'D12');
    const same = buildWeaponDamageDefinition('2d4');
    assert.equal(same.damageDiceVsLarge, 'D4');
    assert.equal(same.numberOfDiceVsLarge, 2);
});

// ═══ [PHB] vs-Large weapon variant (v2.5.19 feature) ═══
test('vs-Large damage variant used against L targets only', () => {
    const attacker = {
        thaco: 17, ratio: '10:1', modifiers: {}, arBaseOverride: 17,
        weapon: { damageDice: 'D8', damageModifier: 0, numberOfDice: 1,
                  damageDiceVsLarge: 'D12', numberOfDiceVsLarge: 1 },
        numberOfAttacks: 1, eligibleFigures: 1
    };
    const roll = () => ({ total: 7, dice: [3, 4] });
    const vsM = BattlesystemCombat.resolveMeleeCombat(attacker, { ac: 8, hitDice: 10, size: 'M' }, roll);
    const vsL = BattlesystemCombat.resolveMeleeCombat(attacker, { ac: 8, hitDice: 10, size: 'L' }, roll);
    assert.equal(vsM.usedLargeVariant, false);
    assert.equal(vsM.damagePerFigure, 6);    // D8 @ 16
    assert.equal(vsL.usedLargeVariant, true);
    assert.equal(vsL.damagePerFigure, 9);    // D12 @ 16
});

test('v0.14.0 CRT approximation of non-CRT AD&D expressions is flagged and close', async () => {
  const { approximateCrtDamage, damageExpressionStats, parseDamageString } = await import('../src/unit-math.js');
  assert.deepEqual(parseDamageString('1d6-1'), { damageDice:'D6', damageModifier:-1, numberOfDice:1, numberOfAttacks:1 });
  assert.equal(parseDamageString('1d4+1d4'), null);
  assert.deepEqual(damageExpressionStats('3-12'), { expr:'3-12', min:3, max:12, avg:7.5, range:true });
  const a=approximateCrtDamage('2d5');
  assert.equal(a.approximated, true); assert.equal(a.sourceExpr, '2d5');
  const avg=a.numberOfDice*(Number(a.damageDice.slice(1))+1)/2+a.damageModifier;
  assert.ok(Math.abs(avg-6)<=0.5);
  assert.equal(approximateCrtDamage('1d8').approximated, undefined);
});
