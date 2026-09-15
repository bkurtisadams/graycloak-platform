// v0.178.0: Book 1 p.30 — after first blood, each wound die is applied to a
// characteristic the wounded PLAYER chooses, and the weapon's constant is
// distributed by the player too. The round resolver may pause at step 2C for
// that choice and finish once it is given.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { importCharacterDocument } from '../vendor/classic-traveller-rules/index.js';
import { createCampaignDocument } from '../src/campaign-document.js';
import {
  createEncounterDocument,
  declareEncounterAction,
  resolveDeclaredRound,
  pendingWoundAllocation,
  previewWoundAllocation,
  allocateRoundWound,
  importEncounterDocument,
  exportEncounterDocument
} from '../src/encounter-document.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(here, '../examples');
const date = { year: 4800, dayOfYear: 106 };

function sequenceDice(values) {
  let index = 0;
  const dice = { rollD6() { if (index >= values.length) throw new Error('dice sequence exhausted'); return values[index++]; } };
  dice.roll2D6 = () => { const rolled = [dice.rollD6(), dice.rollD6()]; return { dice: rolled, total: rolled[0] + rolled[1] }; };
  return dice;
}

async function woundedFixture() {
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  const campaign = createCampaignDocument({
    id: 'campaign-wounds', name: 'Sea of Suns', time: { year: 4800, dayOfYear: 106, secondsOfDay: 0 },
    location: { systemId: 'cinder', systemName: 'Cinder', worldId: 'cinder-main', worldName: 'Cinder' },
    characters: [character], ships: [], partyCharacterIds: [character.identity.id], activeShipId: null
  });
  let encounter = createEncounterDocument({
    campaign, character, opponent: { name: 'Veyra Kade', playerWeaponKey: 'laser-rifle' },
    date, range: 'medium', dice: sequenceDice([3, 3])
  });
  // First blood is random (p.30); the choice arises from the second wound on.
  const pc = encounter.combatants.find((entry) => entry.side === 'party');
  pc.firstBlood = false;
  // Book 1 p.43: a laser rifle wounds 5D, which makes the distribution visible.
  encounter.combatants.find((entry) => entry.side !== 'party').weaponKey = 'laser-rifle';
  encounter = importEncounterDocument(encounter);
  encounter = declareEncounterAction(encounter, { action: 'wait', actorId: pc.id }).encounter;
  const foe = encounter.combatants.find((entry) => entry.side !== 'party');
  encounter = declareEncounterAction(encounter, { action: 'attack', actorId: foe.id, targetId: pc.id }).encounter;
  return { encounter, pc, foe };
}

// A laser rifle hit: 2D [6][6], then 5D of wounds.
const hitDice = [6, 6, 3, 3, 3, 3, 3, 1, 1];

test('without the flag, a round applies the referee default and never pauses', async () => {
  const { encounter } = await woundedFixture();
  const result = resolveDeclaredRound(encounter, { dice: sequenceDice(hitDice), date });
  assert.equal(result.pending, false);
  assert.equal(result.encounter.roundState.resolution, null);
  assert.equal(result.encounter.round, 2);
});

test('with playerAllocatesWounds, the round pauses on a PC wound after first blood and says what is owed', async () => {
  const { encounter, pc, foe } = await woundedFixture();
  const result = resolveDeclaredRound(encounter, { dice: sequenceDice(hitDice), date, playerAllocatesWounds: true });
  assert.equal(result.pending, true);
  assert.equal(result.entries.length, 0, 'nothing reaches the log until the round ends');
  const paused = result.encounter;
  assert.equal(paused.round, 1, 'the round has not ended');
  assert.ok(paused.roundState.resolution, 'the paused round is on the document');
  const pending = pendingWoundAllocation(paused);
  assert.equal(pending.defender.id, pc.id);
  assert.equal(pending.attacker.id, foe.id);
  assert.deepEqual(pending.damageDice, [3, 3, 3, 3, 3]);
  assert.equal(pending.modifier, 0);
  assert.equal(pending.total, 15);
  assert.equal(pending.remaining, 1);
  // The wounded character is untouched until the choice is made.
  const before = paused.combatants.find((entry) => entry.id === pc.id);
  assert.deepEqual(before.current, pc.current);
  // Nothing else may move while the round is paused.
  assert.throws(() => declareEncounterAction(paused, { action: 'wait', actorId: pc.id }), /waiting to be allocated/);
  assert.throws(() => resolveDeclaredRound(paused, { dice: sequenceDice(hitDice), date }), /waiting to be allocated/);
  // A paused round survives a save and a load.
  const roundTrip = importEncounterDocument(exportEncounterDocument(paused));
  assert.deepEqual(pendingWoundAllocation(roundTrip), pending);
});

test('the preview is dice-free and shows the chosen distribution', async () => {
  const { encounter, pc } = await woundedFixture();
  const paused = resolveDeclaredRound(encounter, { dice: sequenceDice(hitDice), date, playerAllocatesWounds: true }).encounter;
  const targets = ['STR', 'STR', 'DEX', 'END', 'END'];
  const preview = previewWoundAllocation(paused, { targets });
  assert.equal(preview.combatant.current.STR, pc.current.STR - 6);
  assert.equal(preview.combatant.current.DEX, pc.current.DEX - 3);
  assert.equal(preview.combatant.current.END, Math.max(0, pc.current.END - 6));
  // Shares must distribute the whole constant.
  assert.throws(() => previewWoundAllocation(paused, { allocation: [1, 0, 0, 0, 0], targets }), /distribute the whole modifier/);
});

test('allocating the wound applies the choice, records it, and finishes the round', async () => {
  const { encounter, pc } = await woundedFixture();
  const paused = resolveDeclaredRound(encounter, { dice: sequenceDice(hitDice), date, playerAllocatesWounds: true });
  const pending = pendingWoundAllocation(paused.encounter);
  // Spread so nothing reaches zero: the fight goes on to round 2.
  const targets = ['STR', 'STR', 'DEX', 'DEX', 'STR'];
  const done = allocateRoundWound(paused.encounter, { key: pending.key, targets, dice: sequenceDice([1, 1, 1, 1]), date });
  assert.equal(done.pending, false);
  assert.equal(done.encounter.roundState.resolution, null);
  assert.equal(done.encounter.status, 'active');
  assert.equal(done.encounter.round, 2);
  const after = done.encounter.combatants.find((entry) => entry.id === pc.id);
  assert.equal(after.current.STR, pc.current.STR - 9);
  assert.equal(after.current.DEX, pc.current.DEX - 6);
  assert.equal(after.current.END, pc.current.END);
  const attack = done.entries.find((entry) => entry.kind === 'attack');
  assert.ok(attack, 'the attack reaches the log once the round ends');
  assert.equal(attack.detail.playerAllocated, true);
  assert.match(attack.text, /HIT/);
  assert.deepEqual(done.encounter.history.filter((entry) => entry.round === 1 && entry.kind === 'attack').length, 1);
  assert.throws(() => allocateRoundWound(done.encounter, { key: pending.key, dice: sequenceDice([1]), date }), /no wound is waiting/);
});

test('the wrong key is refused and an omitted choice takes the referee default', async () => {
  const { encounter } = await woundedFixture();
  const paused = resolveDeclaredRound(encounter, { dice: sequenceDice(hitDice), date, playerAllocatesWounds: true });
  assert.throws(() => allocateRoundWound(paused.encounter, { key: 'nope', dice: sequenceDice([1]), date }), /no longer waiting/);
  const done = allocateRoundWound(paused.encounter, { dice: sequenceDice([1, 1, 1, 1]), date });
  assert.equal(done.pending, false);
  assert.equal(done.encounter.round, 2);
});
