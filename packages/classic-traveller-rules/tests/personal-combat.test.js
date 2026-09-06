import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSequenceDice,
  createPersonalCombatant,
  resolvePersonalSurprise,
  resolvePersonalAttack,
  rollPersonalAttack,
  classifyBlow,
  blowsRemaining,
  previewPersonalAttack,
  encounterRangeForThrow,
  rollEncounterRange,
  TERRAIN_DMS,
  surpriseDMTotal,
  situationDMTotal,
  applyPersonalDamage,
  resolvePersonalMorale,
  weaponTargetNumber,
  movePersonalCombatRange,
  endPersonalCombatRecovery,
  PERSONAL_WEAPONS,
  PERSONAL_ARMOR_TYPES,
  WEAPONS_MATRIX,
  evasionDefenseDM
} from '../index.js';

function hawkeye() {
  return createPersonalCombatant({ id: 'hawkeye', name: 'Hawkeye', side: 'party', playerCharacter: true,
    characteristics: { STR: 12, DEX: 9, END: 8, INT: 8 }, skills: { Rifle: 2 }, weaponKey: 'rifle' });
}

function raider() {
  return createPersonalCombatant({ id: 'raider', name: 'Raider', side: 'opposition',
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 6 }, skills: { 'Automatic Pistol': 0 }, armor: 'jack', weaponKey: 'automatic-pistol' });
}

test('Book 1 pp.46-47 (errata applied) target numbers derive from the printed matrices', () => {
  // Rifle: nothing +3 / short +1 -> 4; cloth -3 / medium 0 -> 11; combat -5 / very long -3 -> 16.
  assert.equal(weaponTargetNumber('rifle', 'none', 'short'), 4);
  assert.equal(weaponTargetNumber('rifle', 'cloth', 'medium'), 11);
  assert.equal(weaponTargetNumber('rifle', 'combat', 'very-long'), 16);
  // Reflec is the anti-laser armor: laser rifle -8 / short +2 -> 14.
  assert.equal(weaponTargetNumber('laser-rifle', 'reflec', 'short'), 14);
  assert.equal(weaponTargetNumber('laser-carbine', 'reflec', 'close'), 18);
  // Errata: carbine vs ablat -1, SMG at long -3, dagger vs combat -7.
  assert.equal(weaponTargetNumber('carbine', 'ablat', 'short'), 8);
  assert.equal(weaponTargetNumber('submachine-gun', 'none', 'long'), 6);
  assert.equal(weaponTargetNumber('dagger', 'combat', 'close'), 14);
  // Body pistol vs reflec -4; hands vs jack -1; body pistol wounds 2D (errata).
  assert.equal(weaponTargetNumber('body-pistol', 'reflec', 'close'), 10);
  assert.equal(weaponTargetNumber('hands', 'jack', 'close'), 7);
  assert.equal(PERSONAL_WEAPONS['body-pistol'].damageDice, 2);
  assert.equal(PERSONAL_WEAPONS.hands.characteristic, 'STR');
  assert.equal(PERSONAL_WEAPONS.cutlass.fatigueDM, -4);
  for (const [key, spec] of Object.entries(PERSONAL_WEAPONS)) {
    PERSONAL_ARMOR_TYPES.forEach((armor, ai) => spec.rangeDMs.forEach((rangeDM, ri) => {
      const expected = rangeDM === null ? null : 8 - WEAPONS_MATRIX[key][ai] - rangeDM;
      assert.equal(spec.targets[armor][ri], expected, `${key} ${armor} ${ri}`);
    }));
  }
});

test('Book 1 p.32 evasion DM scales with range', () => {
  assert.equal(evasionDefenseDM('close'), -1);
  assert.equal(evasionDefenseDM('short'), -1);
  assert.equal(evasionDefenseDM('medium'), -2);
  assert.equal(evasionDefenseDM('long'), -4);
  assert.equal(evasionDefenseDM('very-long'), -4);
});

test('surprise requires a three-point margin after party DMs', () => {
  const player = hawkeye(); player.surpriseDM = 1;
  const result = resolvePersonalSurprise({ sides: [{ id: 'party', combatants: [player] }, { id: 'opposition', combatants: [raider()] }], dice: createSequenceDice([5, 2]) });
  assert.equal(result.surpriseSideId, 'party');
  assert.equal(result.surprisedSideId, 'opposition');
});

test('Rifle skill and DEX DM produce a visible Book 1 effective hit', () => {
  const result = resolvePersonalAttack({ attacker: hawkeye(), defender: raider(), range: 'medium', dice: createSequenceDice([2, 3, 4, 3, 2, 1]) });
  assert.equal(result.target, 5);
  assert.equal(result.skillDM, 2);
  assert.equal(result.characteristicDM, 1);
  assert.equal(result.total, 8);
  assert.equal(result.success, true);
  assert.deepEqual(result.damageDice, [4, 3, 2]);
  assert.equal(result.damageTotal, 9);
  assert.equal(result.firstBloodRoll, 1);
  assert.equal(result.defenderStatus, 'unconscious');
});

test('movement changes one abstract range band and morale starts at 25 percent casualties', () => {
  assert.equal(movePersonalCombatRange('medium', 'close'), 'short');
  assert.equal(movePersonalCombatRange('short', 'open'), 'medium');
  const below = resolvePersonalMorale({ casualties: 0, originalStrength: 4, dice: createSequenceDice([]) });
  assert.equal(below.required, false);
  const check = resolvePersonalMorale({ casualties: 1, originalStrength: 4, dice: createSequenceDice([2, 4]) });
  assert.equal(check.required, true);
  assert.equal(check.stands, false);
});

test('minor wounds receive the facsimile halfway reset when combat ends', () => {
  const character = hawkeye();
  character.current.STR = 6;
  const recovered = endPersonalCombatRecovery(character);
  assert.equal(recovered.current.STR, 9);
});

test('an untrained defender grants the printed +3 attack DM', () => {
  const defender = raider();
  defender.skills = {};
  const result = resolvePersonalAttack({ attacker: hawkeye(), defender, range: 'medium', dice: createSequenceDice([1, 1, 1, 1, 1, 1]) });
  assert.equal(result.defenderUntrainedDM, 3);
  assert.equal(result.totalDM, 6);
});

test('rollPersonalAttack leaves the defender untouched so wounds can land at round end (B1 p.30 step 2C)', () => {
  const dice = { rollD6: () => 6, roll2D6: () => 12 };
  const make = (id, side) => createPersonalCombatant({
    id, name: id, side, characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 },
    skills: { 'Gun Combat': 1 }, armor: 'none', weaponKey: 'rifle'
  });
  const foe = make('foe', 'opposition');
  const first = rollPersonalAttack({ attacker: make('a', 'party'), defender: foe, range: 'medium', dice });
  assert.equal(first.success, true);
  assert.equal(foe.status, 'active');
  assert.deepEqual(foe.current, { STR: 7, DEX: 7, END: 7 });

  // A second attacker in the same round still sees an active target.
  const second = rollPersonalAttack({ attacker: make('b', 'party'), defender: foe, range: 'medium', dice });
  assert.equal(second.success, true);

  // Both wounds then apply in declaration order; only the first is first blood.
  const afterFirst = applyPersonalDamage(foe, first.damageDice, 4);
  assert.equal(afterFirst.combatant.firstBlood, false);
  const afterSecond = applyPersonalDamage(afterFirst.combatant, second.damageDice, null);
  assert.equal(afterSecond.combatant.hitsTaken, 2);
});

test('resolvePersonalAttack still rolls and applies in one step', () => {
  const dice = { rollD6: () => 6, roll2D6: () => 12 };
  const foe = createPersonalCombatant({ id: 'f', name: 'f', side: 'opposition', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, armor: 'none', weaponKey: 'hands' });
  const attacker = createPersonalCombatant({ id: 'a', name: 'a', side: 'party', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, skills: { 'Gun Combat': 1 }, armor: 'none', weaponKey: 'rifle' });
  const result = resolvePersonalAttack({ attacker, defender: foe, range: 'medium', dice });
  assert.equal(result.success, true);
  assert.ok(result.allocations.length > 0);
  assert.notDeepEqual(result.defender.current, foe.current);
});

test('previewPersonalAttack reports the same throw and DMs as the rolled attack', () => {
  const dice = { rollD6: () => 3, roll2D6: () => 6 };
  const attacker = createPersonalCombatant({ id: 'a', name: 'a', side: 'party', characteristics: { STR: 7, DEX: 11, END: 7, INT: 7 }, skills: { Rifle: 2 }, armor: 'none', weaponKey: 'rifle' });
  const defender = createPersonalCombatant({ id: 'd', name: 'd', side: 'opposition', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, armor: 'jack', weaponKey: 'blade' });
  const preview = previewPersonalAttack({ attacker, defender, range: 'medium', situationalDM: 1 });
  const rolled = rollPersonalAttack({ attacker, defender, range: 'medium', situationalDM: 1, dice });
  for (const key of ['target', 'skillDM', 'characteristicDM', 'untrainedDM', 'parryDM', 'evasionDM', 'defenderUntrainedDM', 'situationalDM', 'totalDM']) {
    assert.equal(preview[key], rolled[key], `preview ${key} must match the rolled attack`);
  }
  assert.equal(preview.requiredRoll, preview.target - preview.totalDM);
  assert.equal(preview.canAttack, true);
});

test('previewPersonalAttack reports weapons that cannot reach the range', () => {
  const attacker = createPersonalCombatant({ id: 'a', name: 'a', side: 'party', characteristics: { STR: 9, DEX: 7, END: 7, INT: 7 }, skills: { Blade: 1 }, armor: 'none', weaponKey: 'blade' });
  const defender = createPersonalCombatant({ id: 'd', name: 'd', side: 'opposition', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, armor: 'none', weaponKey: 'rifle' });
  const preview = previewPersonalAttack({ attacker, defender, range: 'long' });
  assert.equal(preview.canAttack, false);
  assert.equal(preview.target, null);
  assert.equal(preview.requiredRoll, null);
});

test('an evading defender loses parry as well as the attack (B1 p.33)', () => {
  const dice = { rollD6: () => 3, roll2D6: () => 6 };
  const attacker = createPersonalCombatant({ id: 'a', name: 'a', side: 'party', characteristics: { STR: 9, DEX: 7, END: 7, INT: 7 }, skills: { Blade: 1 }, armor: 'none', weaponKey: 'blade' });
  const guard = createPersonalCombatant({ id: 'd', name: 'd', side: 'opposition', characteristics: { STR: 9, DEX: 7, END: 7, INT: 7 }, skills: { Blade: 3 }, armor: 'none', weaponKey: 'blade' });
  const standing = previewPersonalAttack({ attacker, defender: guard, range: 'short' });
  assert.equal(standing.parryDM, -3, 'a standing defender parries with blade skill');
  assert.equal(standing.evasionDM, 0);

  const evading = previewPersonalAttack({ attacker, defender: { ...guard, evading: true }, range: 'short' });
  assert.equal(evading.parryDM, 0, 'an evading defender may not parry');
  assert.equal(evading.evasionDM, -1, 'and takes the evasion DM instead');
  assert.equal(rollPersonalAttack({ attacker, defender: { ...guard, evading: true }, range: 'short', dice }).parryDM, 0);
});

test('the encounter range table and terrain DMs follow B1 p.31', () => {
  // The printed table, entry by entry.
  const printed = {
    1: 'short', 2: 'close', 3: 'short', 4: 'medium', 5: 'short', 6: 'medium', 7: 'medium',
    8: 'long', 9: 'medium', 10: 'very-long', 11: 'long', 12: 'very-long', 13: 'very-long'
  };
  for (const [total, range] of Object.entries(printed)) assert.equal(encounterRangeForThrow(Number(total)), range);
  // Throws outside 1-13 clamp to the printed span.
  assert.equal(encounterRangeForThrow(0), 'short');
  assert.equal(encounterRangeForThrow(20), 'very-long');

  assert.equal(TERRAIN_DMS.city, -4);
  assert.equal(TERRAIN_DMS['building-interior'], -5);
  assert.equal(TERRAIN_DMS.desert, 4);
  assert.equal(TERRAIN_DMS.jungle, 0);

  // A city encounter is pulled toward close range; a desert one toward long.
  const dice = { rollD6: () => 3, roll2D6: () => ({ dice: [3, 3], total: 6 }) };
  assert.equal(rollEncounterRange(dice, { terrain: 'city' }).range, 'close');
  assert.equal(rollEncounterRange(dice, { terrain: 'desert' }).range, 'very-long');
  assert.throws(() => rollEncounterRange(dice, { terrain: 'tundra' }), RangeError);
});

test('surprise and situation DMs sum only the ticked conditions (B1 p.31)', () => {
  assert.equal(surpriseDMTotal({}), 0);
  assert.equal(surpriseDMTotal({ leaderSkill: true, tacticalSkill: true, militaryExperience: true }), 3);
  assert.equal(surpriseDMTotal({ battleDress: true, eightOrMoreAdventurers: true }), 1);
  assert.equal(surpriseDMTotal({ leaderSkill: false }), 0);
  assert.throws(() => surpriseDMTotal({ luck: true }), RangeError);

  assert.equal(situationDMTotal({ cover: true }), -4);
  assert.equal(situationDMTotal({ concealment: true, foldingStock: true }), -2);
  assert.equal(situationDMTotal({ darkness: true }), -9);
  assert.equal(situationDMTotal({ darknessWithLightIntensifier: true }), -6);
  assert.throws(() => situationDMTotal({ fog: true }), RangeError);
});

test('a side may carry its own surprise DM rather than the best individual one (B1 p.31)', () => {
  const dice = { rollD6: () => 3, roll2D6: () => 6 };
  const make = (id, side, surpriseDM) => createPersonalCombatant({
    id, name: id, side, characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, weaponKey: 'rifle', surpriseDM
  });
  const sides = [
    { id: 'party', combatants: [make('a', 'party', 2)], dm: -1 },
    { id: 'opposition', combatants: [make('b', 'opposition', 0)] }
  ];
  const result = resolvePersonalSurprise({ sides, dice });
  assert.equal(result.results[0].dm, -1, 'an explicit side DM wins');
  assert.equal(result.results[1].dm, 0, 'a side without one falls back to its combatants');
});

test('the blow and swing allowance follows Book 1 p.36', () => {
  const dice = { rollD6: () => 6, roll2D6: () => 12 };
  const brawler = createPersonalCombatant({
    id: 'a', name: 'a', side: 'party', characteristics: { STR: 9, DEX: 7, END: 3, INT: 7 },
    skills: { Brawling: 1 }, armor: 'none', weaponKey: 'hands'
  });
  const foe = createPersonalCombatant({ id: 'd', name: 'd', side: 'opposition', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, armor: 'none', weaponKey: 'hands' });

  // The allowance is endurance at the start of the encounter.
  assert.equal(brawler.blowAllowance, 3);
  assert.equal(blowsRemaining(brawler), 3);

  // Three combat blows, each spending one.
  let attacker = brawler;
  for (let blow = 1; blow <= 3; blow += 1) {
    const result = rollPersonalAttack({ attacker, defender: foe, range: 'close', dice });
    assert.equal(result.blowClass, 'combat');
    assert.equal(result.fatigueDM, 0);
    attacker = result.attacker;
    assert.equal(blowsRemaining(attacker), 3 - blow);
  }

  // The fourth is weakened automatically, at the weapon's fatigue DM, and
  // costs nothing further.
  const weakened = rollPersonalAttack({ attacker, defender: foe, range: 'close', dice });
  assert.equal(weakened.blowClass, 'weakened');
  assert.equal(weakened.fatigueDM, -2);
  assert.equal(weakened.attacker.blowsUsed, 3);

  // A character may elect a weakened blow to conserve the allowance.
  const chosen = rollPersonalAttack({ attacker: brawler, defender: foe, range: 'close', weakened: true, dice });
  assert.equal(chosen.blowClass, 'weakened');
  assert.equal(blowsRemaining(chosen.attacker), 3);

  // Surprise and special blows are unrestricted and unweakened.
  assert.equal(rollPersonalAttack({ attacker, defender: foe, range: 'close', surprise: true, dice }).blowClass, 'surprise');
  assert.equal(rollPersonalAttack({ attacker, defender: foe, range: 'close', special: true, dice }).fatigueDM, 0);

  // Gun combat is not affected by endurance at all.
  const shooter = createPersonalCombatant({ id: 'g', name: 'g', side: 'party', characteristics: { STR: 7, DEX: 7, END: 2, INT: 7 }, skills: { Rifle: 1 }, armor: 'none', weaponKey: 'rifle' });
  const shot = rollPersonalAttack({ attacker: { ...shooter, blowsUsed: 99 }, defender: foe, range: 'medium', dice });
  assert.equal(shot.blowClass, null);
  assert.equal(shot.fatigueDM, 0);

  // Rest restores the allowance.
  assert.equal(endPersonalCombatRecovery(attacker).blowsUsed, 0);
});

test('a long gun parries as a cudgel, a pistol not at all (B1 p.36)', () => {
  const attacker = createPersonalCombatant({ id: 'a', name: 'a', side: 'party', characteristics: { STR: 9, DEX: 7, END: 7, INT: 7 }, skills: { Blade: 1 }, armor: 'none', weaponKey: 'blade' });
  const make = (weaponKey, skills) => createPersonalCombatant({ id: 'd', name: 'd', side: 'opposition', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, skills, armor: 'none', weaponKey });

  // A blade defender parries with blade expertise.
  assert.equal(previewPersonalAttack({ attacker, defender: make('sword', { Sword: 2 }), range: 'short' }).parryDM, -2);

  // A rifleman parries as a cudgel: club expertise counts, rifle skill does not.
  assert.equal(previewPersonalAttack({ attacker, defender: make('rifle', { Rifle: 3 }), range: 'short' }).parryDM, 0);
  assert.equal(previewPersonalAttack({ attacker, defender: make('rifle', { Club: 2 }), range: 'short' }).parryDM, -2);

  // A pistol cannot parry.
  assert.equal(previewPersonalAttack({ attacker, defender: make('automatic-pistol', { Club: 2 }), range: 'short' }).parryDM, 0);

  // Shots are never parried.
  const shooter = createPersonalCombatant({ id: 's', name: 's', side: 'party', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, skills: { Rifle: 1 }, armor: 'none', weaponKey: 'rifle' });
  assert.equal(previewPersonalAttack({ attacker: shooter, defender: make('sword', { Sword: 2 }), range: 'medium' }).parryDM, 0);
});
