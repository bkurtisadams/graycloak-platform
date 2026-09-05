import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  importCharacterDocument,
  updateCharacterGameplayState
} from '../../packages/classic-traveller-rules/index.js';

import { createCampaignDocument } from '../src/campaign-document.js';
import { createEncounterDocument, resolveEncounterRound } from '../src/encounter-document.js';
import { createNpcActorDocument } from '../src/npc-actor-document.js';
import { synchronizeEncounterDocuments } from '../src/combatant-document-sync.js';

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

async function characterFixture() {
  return importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
}

function campaignFor(character) {
  return createCampaignDocument({
    id: 'campaign-wound-sync-test',
    name: 'Wound Sync Test',
    time: { year: 4800, dayOfYear: 106, secondsOfDay: 0 },
    location: { systemId: 'cinder', systemName: 'Cinder', worldId: 'cinder-main', worldName: 'Cinder' },
    characters: [character],
    partyCharacterIds: [character.identity.id]
  });
}

test('new encounters preserve a character document current physical state', async () => {
  const original = await characterFixture();
  const character = updateCharacterGameplayState(original, {
    current: { ...original.current, STR: original.current.STR - 2, END: original.current.END - 1 }
  });
  const encounter = createEncounterDocument({
    campaign: campaignFor(character),
    character,
    opponent: { name: 'Raider' },
    date: { year: 4800, dayOfYear: 106 },
    dice: sequenceDice([3, 3])
  });

  const party = encounter.combatants.find((entry) => entry.side === 'party');
  assert.deepEqual(party.current, character.current);
  assert.deepEqual(party.characteristics, {
    STR: character.characteristics.STR,
    DEX: character.characteristics.DEX,
    END: character.characteristics.END,
    INT: character.characteristics.INT
  });
});

test('a new encounter requires at least one conscious living party character', async () => {
  const original = await characterFixture();
  const unconscious = updateCharacterGameplayState(original, { consciousness: 'unconscious' });
  assert.throws(() => createEncounterDocument({
    campaign: campaignFor(unconscious),
    character: unconscious,
    opponent: { name: 'Raider' },
    date: { year: 4800, dayOfYear: 106 },
    dice: sequenceDice([3, 3])
  }), /at least one conscious living party character/);
});

test('encounter wounds and Book 1 status synchronize to linked Character Documents', async () => {
  const character = await characterFixture();
  const encounter = createEncounterDocument({
    campaign: campaignFor(character),
    character,
    opponent: { name: 'Raider' },
    date: { year: 4800, dayOfYear: 106 },
    dice: sequenceDice([3, 3])
  });
  const party = encounter.combatants.find((entry) => entry.side === 'party');
  party.current = { STR: 1, DEX: 2, END: 3 };
  party.status = 'unconscious';

  const result = synchronizeEncounterDocuments({ encounter, characters: [character] });
  assert.deepEqual(result.characters[0].current, { STR: 1, DEX: 2, END: 3 });
  assert.equal(result.characters[0].status.alive, true);
  assert.equal(result.characters[0].status.consciousness, 'unconscious');
  assert.equal(result.changes.length, 1);
  assert.equal(result.changes[0].sourceId, character.identity.id);

  party.current = { STR: 0, DEX: 0, END: 0 };
  party.status = 'dead';
  const fatal = synchronizeEncounterDocuments({ encounter, characters: result.characters });
  assert.deepEqual(fatal.characters[0].current, { STR: 0, DEX: 0, END: 0 });
  assert.equal(fatal.characters[0].status.alive, false);
  assert.equal(fatal.characters[0].status.consciousness, 'not-applicable');
});

test('end-of-combat halfway recovery reaches the persistent Character Document', async () => {
  const character = await characterFixture();
  const encounter = createEncounterDocument({
    campaign: campaignFor(character),
    character,
    opponent: { name: 'Defeated Raider' },
    date: { year: 4800, dayOfYear: 106 },
    dice: sequenceDice([6, 1])
  });
  const party = encounter.combatants.find((entry) => entry.side === 'party');
  const opponent = encounter.combatants.find((entry) => entry.side === 'opposition');
  party.current.STR -= 4;
  opponent.status = 'unconscious';

  const resolved = resolveEncounterRound(encounter, {
    action: 'wait',
    actorId: party.id,
    date: { year: 4800, dayOfYear: 106 },
    dice: sequenceDice([])
  }).encounter;
  const recoveredParty = resolved.combatants.find((entry) => entry.id === party.id);
  const expectedStrength = Math.floor((party.current.STR + party.characteristics.STR) / 2);
  assert.equal(resolved.status, 'victory');
  assert.equal(recoveredParty.current.STR, expectedStrength);

  const synchronized = synchronizeEncounterDocuments({ encounter: resolved, characters: [character] });
  assert.equal(synchronized.characters[0].current.STR, expectedStrength);
  assert.equal(synchronized.characters[0].status.consciousness, 'conscious');
});

test('encounter wounds synchronize to linked roster actors without inventing body-state rules', async () => {
  const character = await characterFixture();
  const actor = createNpcActorDocument({
    id: 'actor-wounded-raider',
    name: 'Wounded Raider',
    characteristics: { STR: 8, DEX: 7, END: 6, INT: 5, EDU: 5, SOC: 5 },
    current: { STR: 6, DEX: 7, END: 5 }
  });
  const encounter = createEncounterDocument({
    campaign: campaignFor(character),
    character,
    opponent: {
      actorId: actor.identity.id,
      name: actor.identity.name,
      characteristics: actor.characteristics,
      current: actor.current
    },
    date: { year: 4800, dayOfYear: 106 },
    dice: sequenceDice([3, 3])
  });
  const opponent = encounter.combatants.find((entry) => entry.sourceActorId === actor.identity.id);
  assert.deepEqual(opponent.current, actor.current);
  opponent.current = { STR: 2, DEX: 3, END: 4 };
  opponent.status = 'unconscious';

  const result = synchronizeEncounterDocuments({ encounter, characters: [character], npcActors: [actor] });
  assert.deepEqual(result.npcActors[0].current, { STR: 2, DEX: 3, END: 4 });
  assert.deepEqual(result.npcActors[0].state, actor.state);
  assert.equal(result.changes.length, 1);
  assert.equal(result.changes[0].documentKind, 'npc-actor');
});
