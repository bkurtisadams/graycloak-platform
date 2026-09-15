// combat-view.test.mjs — the view models behind the throw card, the two-step
// declaration and the attack result card. Pure functions, so they can be
// checked against Book 1's printed tables directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { importCharacterDocument, weaponTargetNumber, previewPersonalAttack } from '../vendor/classic-traveller-rules/index.js';
import { createCampaignDocument } from '../src/campaign-document.js';
import {
  createEncounterDocument,
  declareEncounterAction,
  resolveDeclaredRound,
  setEncounterLighting,
  setCombatantCover
} from '../src/encounter-document.js';
import {
  throwCardModel,
  chanceOfTwoDice,
  matrixDMs,
  deriveDeclaration,
  declarationSummary,
  attackCardModel,
  woundFormula
} from '../client/combat-view.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(here, '../examples');
const date = { year: 4800, dayOfYear: 106 };

function sequenceDice(values) {
  let index = 0;
  const dice = { rollD6() { if (index >= values.length) throw new Error('dice sequence exhausted'); return values[index++]; } };
  dice.roll2D6 = () => { const rolled = [dice.rollD6(), dice.rollD6()]; return { dice: rolled, total: rolled[0] + rolled[1] }; };
  return dice;
}

async function fixture({ range = 'medium' } = {}) {
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  const campaign = createCampaignDocument({
    id: 'campaign-throw-card', name: 'Sea of Suns', time: { year: 4800, dayOfYear: 106, secondsOfDay: 0 },
    location: { systemId: 'cinder', systemName: 'Cinder', worldId: 'cinder-main', worldName: 'Cinder' },
    characters: [character], ships: [], partyCharacterIds: [character.identity.id], activeShipId: null
  });
  // Hawkeye has Laser Rifle-1 and DEX 11, so both the expertise row and the
  // characteristic row carry a real DM — a card that dropped either would
  // disagree with the engine, which is what these tests check.
  const encounter = createEncounterDocument({
    campaign, character, opponent: { name: 'Veyra Kade', playerWeaponKey: 'laser-rifle' },
    date, range, dice: sequenceDice([3, 3])
  });
  const pc = encounter.combatants.find((entry) => entry.side === 'party');
  const foe = encounter.combatants.find((entry) => entry.side !== 'party');
  return { encounter, pc, foe };
}

test('2D odds are the 36 outcomes, not an approximation', () => {
  assert.equal(chanceOfTwoDice(2), 100);
  assert.equal(chanceOfTwoDice(7), 58); // 21/36
  assert.equal(chanceOfTwoDice(8), 42); // 15/36
  assert.equal(chanceOfTwoDice(12), 3); // 1/36
  assert.equal(chanceOfTwoDice(13), 0);
});

test('the matrix rows are Book 1 pp.42-43 as printed', () => {
  // p.42: rifle against cloth is -2. p.43: rifle at medium is +0, long is -1.
  assert.equal(matrixDMs('rifle', 'cloth', 'medium').armorDM, -2);
  assert.equal(matrixDMs('rifle', 'cloth', 'medium').rangeDM, 0);
  assert.equal(matrixDMs('rifle', 'cloth', 'long').rangeDM, -1);
  // p.43: a blade has no medium column at all.
  assert.equal(matrixDMs('blade', 'none', 'medium').rangeDM, null);
  // p.42: a cutlass against jack is +3; p.43 short is +2.
  assert.equal(matrixDMs('cutlass', 'jack', 'short').armorDM, 3);
  assert.equal(matrixDMs('cutlass', 'jack', 'short').rangeDM, 2);
});

test('the throw card totals to the same figure the engine will demand', async () => {
  const { encounter, pc, foe } = await fixture();
  const model = throwCardModel(encounter, pc, foe);
  assert.equal(model.reach, true);
  assert.equal(model.basic, 8);
  const keys = model.rows.map((row) => row.key);
  assert.ok(keys.includes('skill'), 'Laser Rifle-1 is a row');
  assert.ok(keys.includes('characteristic'), 'DEX 11 is a row');
  assert.equal(model.needed, model.engineNeeded, 'the card cannot promise a figure the dice do not demand');
  // The two matrix rows reproduce the engine's table target: 8 - armor - range.
  const armor = model.rows.find((row) => row.key === 'armor').dm;
  const range = model.rows.find((row) => row.key === 'range').dm;
  assert.equal(8 - armor - range, weaponTargetNumber(pc.weaponKey, foe.armor, model.range));
  assert.equal(model.chance, chanceOfTwoDice(model.needed));
  assert.equal(woundFormula(model.wound.dice, model.wound.modifier), '5D');
});

test('every referee condition reaches the card as its own row', async () => {
  const { encounter, pc, foe } = await fixture();
  const dark = setEncounterLighting(encounter, 'darkness').encounter;
  const covered = setCombatantCover(dark, { combatantId: foe.id, cover: 'cover' }).encounter;
  const attacker = covered.combatants.find((entry) => entry.id === pc.id);
  const defender = covered.combatants.find((entry) => entry.id === foe.id);
  const model = throwCardModel(covered, attacker, defender);
  const keys = model.rows.map((row) => row.key);
  assert.ok(keys.includes('lighting'), 'the encounter lighting is a row');
  assert.ok(keys.includes('cover'), "the defender's cover is a row");
  assert.equal(model.needed, model.engineNeeded);
  // Book 1 p.31 errata: darkness -9 and cover -4 make this much harder.
  const plain = throwCardModel(encounter, pc, foe);
  assert.ok(model.needed > plain.needed);
});

test('a weapon with no column at this range reads as no reach, not as a hard throw', async () => {
  const { encounter, pc, foe } = await fixture();
  const knifeFighter = { ...pc, weaponKey: 'blade' };
  const model = throwCardModel(encounter, knifeFighter, foe);
  assert.equal(model.reach, false);
  assert.equal(model.needed, null);
  assert.equal(model.chance, 0);
});

test('an evading defender is priced before the attacker commits', async () => {
  const { encounter, pc, foe } = await fixture();
  const evading = { ...foe, evading: true };
  const model = throwCardModel(encounter, pc, evading);
  const evasion = model.rows.find((row) => row.key === 'evasion');
  assert.ok(evasion, 'evasion is a row of its own');
  assert.equal(evasion.dm, -2, 'Book 1 p.28: -2 at medium range');
  assert.equal(model.needed, model.engineNeeded);
});

test('the two decisions derive Book 1\u2019s single action word', () => {
  assert.deepEqual(deriveDeclaration({ movement: 'stand', targetId: 'foe' }), { action: 'attack', targetId: 'foe', attacks: true });
  assert.deepEqual(deriveDeclaration({ movement: 'stand', targetId: null }), { action: 'wait', targetId: null, attacks: false });
  assert.deepEqual(deriveDeclaration({ movement: 'evade' }), { action: 'evade', targetId: null, attacks: false });
  assert.deepEqual(deriveDeclaration({ movement: 'close', pace: 'walk', targetId: 'foe' }), { action: 'close', targetId: 'foe', attacks: true });
  // Book 1 p.28: running counts as a combat blow and prevents an attack.
  assert.deepEqual(deriveDeclaration({ movement: 'close', pace: 'run', targetId: 'foe' }), { action: 'close-run', targetId: 'foe', attacks: false });
  assert.deepEqual(deriveDeclaration({ movement: 'open', pace: 'run', targetId: 'foe' }), { action: 'open-run', targetId: 'foe', attacks: false });
  // Book 1 p.28: escape is offered before combat begins only.
  assert.deepEqual(deriveDeclaration({ movement: 'escape', round: 1 }), { action: 'escape', targetId: null, attacks: false });
  assert.throws(() => deriveDeclaration({ movement: 'escape', round: 2 }), /only before combat begins/);
  assert.throws(() => deriveDeclaration({ movement: 'close' }), /choose whom to close on/);
});

test('the declaration reads as a sentence before it is sent', () => {
  assert.equal(declarationSummary({ movement: 'stand' }, {}), 'STAND / NO ATTACK');
  assert.equal(declarationSummary({ movement: 'stand' }, { targetName: 'KADE' }), 'ATTACK KADE');
  assert.equal(declarationSummary({ movement: 'close', pace: 'walk' }, { targetName: 'KADE' }), 'CLOSE + ATTACK KADE');
  assert.equal(declarationSummary({ movement: 'evade' }, { targetName: 'KADE' }), 'EVADE');
  assert.equal(declarationSummary({ movement: 'stand' }, { targetName: 'KADE', reach: false }), 'ATTACK KADE (NO REACH)');
});

test('a resolved attack becomes a card whose needed figure matches the throw card', async () => {
  const { encounter, pc, foe } = await fixture();
  const before = throwCardModel(encounter, pc, foe);
  let next = declareEncounterAction(encounter, { action: 'attack', actorId: pc.id, targetId: foe.id }).encounter;
  next = declareEncounterAction(next, { action: 'wait', actorId: foe.id }).encounter;
  const result = resolveDeclaredRound(next, { dice: sequenceDice([6, 6, 3, 3, 3, 1, 1, 1]), date });
  const entry = result.entries.find((item) => item.kind === 'attack');
  const card = attackCardModel(entry, result.encounter);
  assert.equal(card.kind, 'attack');
  assert.equal(card.attackerName, pc.name);
  assert.equal(card.defenderName, foe.name);
  assert.deepEqual(card.dice, [6, 6]);
  assert.equal(card.needed, before.needed, 'what the card says was needed is what the throw card promised');
  assert.equal(card.hit, true);
  assert.ok(card.wound, 'a hit carries its wound');
  assert.ok(card.wound.allocations.length >= 1);
  // Book 1 p.30: the first wound falls entirely on one random characteristic.
  assert.equal(card.wound.allocations[0].firstBlood, true);
  assert.equal(card.wound.total, card.wound.dice.reduce((sum, die) => sum + die, 0) + card.wound.modifier);
  for (const part of card.dms) assert.notEqual(part.dm, 0, 'a zero DM is not worth a chip');
});

test('a miss carries no wound, and an out-of-reach attack becomes a note', async () => {
  const { encounter, pc, foe } = await fixture();
  // Book 1 p.31 errata: darkness is -9, which even a skilled shot can miss on.
  const dark = setEncounterLighting(encounter, 'darkness').encounter;
  let next = declareEncounterAction(dark, { action: 'attack', actorId: pc.id, targetId: foe.id }).encounter;
  next = declareEncounterAction(next, { action: 'wait', actorId: foe.id }).encounter;
  const result = resolveDeclaredRound(next, { dice: sequenceDice([1, 1, 1, 1, 1, 1]), date });
  const card = attackCardModel(result.entries.find((item) => item.kind === 'attack'), result.encounter);
  assert.equal(card.hit, false);
  assert.equal(card.wound, null);
  assert.equal(attackCardModel({ kind: 'attack', text: 'cannot engage' }, result.encounter).kind, 'note');
});

test('previewPersonalAttack stays the single source of the figure', async () => {
  // If the engine ever changes how a DM is counted, the card must move with
  // it: this asserts the relationship rather than a number.
  const { encounter, pc, foe } = await fixture({ range: 'long' });
  const model = throwCardModel(encounter, pc, foe);
  const preview = previewPersonalAttack({ attacker: pc, defender: foe, range: 'long' });
  assert.equal(model.needed, Math.max(2, preview.requiredRoll));
  assert.equal(model.wound.max, preview.woundRange.max);
});
