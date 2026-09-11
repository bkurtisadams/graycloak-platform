import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { importCharacterDocument, importShipDocument } from '../vendor/classic-traveller-rules/index.js';
import { createCampaignDocument } from '../src/campaign-document.js';
import { createEncounterDocument, repositionEncounterCombatant, setCombatantCover, setEncounterLighting } from '../src/encounter-document.js';
import { chooseNpcDeclaration, rankNpcTargets, pendingNpcDeclarations } from '../src/npc-tactics.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(here, '../examples');

function sequenceDice(values) {
  let index = 0;
  const dice = {
    rollD6() {
      if (index >= values.length) throw new Error('dice sequence exhausted');
      return values[index++];
    }
  };
  dice.roll2D6 = () => {
    const rolled = [dice.rollD6(), dice.rollD6()];
    return { dice: rolled, total: rolled[0] + rolled[1] };
  };
  return dice;
}

async function fixture(opponents) {
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  const ship = importShipDocument(await readFile(path.join(examples, 'Hawkeye.ship.json'), 'utf8'));
  const campaign = createCampaignDocument({
    id: 'npc-tactics', name: 'Tactics', time: { year: 4800, dayOfYear: 106, secondsOfDay: 0 },
    location: { systemId: 'cinder', systemName: 'Cinder', worldId: 'cinder-main', worldName: 'Cinder' },
    characters: [character], ships: [ship], partyCharacterIds: [character.identity.id], activeShipId: ship.identity.id
  });
  return createEncounterDocument({
    campaign, character, opponents,
    encounterKey: 'tactics', date: { year: 4800, dayOfYear: 106 }, range: 'medium', dice: sequenceDice([3, 3])
  });
}

const raider = (name, weaponKey, skills = {}) => ({
  name, weaponKey, armor: 'none',
  characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, skills
});

test('an NPC attacks a target its weapon can reach', async () => {
  // Skilled enough that the throw is actually makeable — an unskilled gunman
  // needs 13+ at medium range and correctly closes instead.
  const encounter = await fixture([raider('Gunman', 'automatic-pistol', { 'Automatic Pistol': 3 })]);
  const npc = encounter.combatants.find((entry) => entry.side === 'opposition');
  const pc = encounter.combatants.find((entry) => entry.side === 'party');
  const declaration = chooseNpcDeclaration(encounter, npc);
  assert.equal(declaration.action, 'attack');
  assert.equal(declaration.targetId, pc.id);
  assert.match(declaration.reason, /needs \d+\+/);
});

test('an NPC whose weapon cannot reach closes instead, and says why', async () => {
  let encounter = await fixture([raider('Bruiser', 'blade')]);
  const npc = encounter.combatants.find((entry) => entry.side === 'opposition');
  const pc = encounter.combatants.find((entry) => entry.side === 'party');
  encounter = repositionEncounterCombatant(encounter, { combatantId: npc.id, column: pc.position.column + 20, row: pc.position.row }).encounter;
  const declaration = chooseNpcDeclaration(encounter, encounter.combatants.find((entry) => entry.id === npc.id));
  assert.equal(declaration.action, 'close');
  assert.equal(declaration.targetId, pc.id);
  assert.match(declaration.reason, /cannot reach/);
});

test('an NPC prefers the target it is likeliest to hit, not merely the nearest', async () => {
  let encounter = await fixture([raider('Gunman', 'automatic-pistol', { 'Automatic Pistol': 3 })]);
  const npc = encounter.combatants.find((entry) => entry.side === 'opposition');
  const pc = encounter.combatants.find((entry) => entry.side === 'party');

  // Same weapon, same range: cover on the PC makes the throw worse, and with
  // only one target the NPC must still engage it.
  encounter = setCombatantCover(encounter, { combatantId: pc.id, cover: 'cover' }).encounter;
  const ranked = rankNpcTargets(encounter, encounter.combatants.find((entry) => entry.id === npc.id));
  assert.equal(ranked.length, 1);
  assert.ok(ranked[0].requiredRoll > 2, 'cover raises the throw the NPC needs');
});

test('an NPC facing a throw no 2D roll can make closes rather than firing', async () => {
  let encounter = await fixture([raider('Gunman', 'automatic-pistol', { 'Automatic Pistol': 3 })]);
  const npc = encounter.combatants.find((entry) => entry.side === 'opposition');
  const pc = encounter.combatants.find((entry) => entry.side === 'party');
  encounter = setCombatantCover(encounter, { combatantId: pc.id, cover: 'cover' }).encounter;
  encounter = setEncounterLighting(encounter, 'darkness').encounter;
  const declaration = chooseNpcDeclaration(encounter, encounter.combatants.find((entry) => entry.id === npc.id));
  assert.equal(declaration.action, 'close');
  assert.match(declaration.reason, /no throw can hit/);
});

test('only active combatants set to auto are declared for', async () => {
  const encounter = await fixture([raider('Gunman', 'automatic-pistol', { 'Automatic Pistol': 3 }), raider('Bruiser', 'blade')]);
  // Opposition defaults to auto, the party to manual.
  const pending = pendingNpcDeclarations(encounter);
  assert.equal(pending.length, 2);
  assert.ok(pending.every((entry) => encounter.combatants.find((c) => c.id === entry.actorId).side === 'opposition'));

  const downed = {
    ...encounter,
    combatants: encounter.combatants.map((entry) => entry.name === 'Bruiser' ? { ...entry, status: 'unconscious' } : entry)
  };
  assert.equal(pendingNpcDeclarations(downed).length, 1);
  assert.equal(chooseNpcDeclaration(downed, downed.combatants.find((entry) => entry.name === 'Bruiser')), null);
});

test('the surprise round bars the surprised side from automatic declarations', async () => {
  const encounter = await fixture([raider('Gunman', 'automatic-pistol', { 'Automatic Pistol': 3 })]);

  // Round 1 with the party surprising: the opposition may not act, so the
  // routine must not declare for them. Declaring anyway is refused by the
  // resolver, which is correct but leaves the round littered with errors.
  const surprised = {
    ...encounter,
    round: 1,
    surprise: { ...encounter.surprise, surpriseSideId: 'party', surprisedSideId: 'opposition' }
  };
  assert.equal(pendingNpcDeclarations(surprised).length, 0);

  // With the opposition surprising, they act.
  const surprising = {
    ...encounter,
    round: 1,
    surprise: { ...encounter.surprise, surpriseSideId: 'opposition', surprisedSideId: 'party' }
  };
  assert.equal(pendingNpcDeclarations(surprising).length, 1);

  // From round 2 surprise no longer applies.
  assert.equal(pendingNpcDeclarations({ ...surprised, round: 2 }).length, 1);
});
