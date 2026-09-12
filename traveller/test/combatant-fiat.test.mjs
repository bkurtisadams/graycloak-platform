import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { importCharacterDocument } from '../vendor/classic-traveller-rules/index.js';
import { importCampaignBundle } from '../src/campaign-bundle.js';
import { createEncounterDocument, setCombatantCurrent, restoreCombatant, setCombatantStatus } from '../src/encounter-document.js';

const dice = { rollD6: () => 3, roll2D6: () => ({ dice: [3, 3], total: 6 }) };
const here = path.dirname(fileURLToPath(import.meta.url));

async function fight() {
  const character = importCharacterDocument(await readFile(path.join(here, '../examples/Hawkeye.character.json'), 'utf8'));
  const campaign = importCampaignBundle(await readFile(path.join(here, 'fixtures/Sea-of-Suns-v0.11.2-buggy.campaign.json'), 'utf8')).campaign;
  return createEncounterDocument({
    campaign, character, opponent: { name: 'Raider' }, encounterKey: 'fiat',
    date: { year: 4800, dayOfYear: 106 }, range: 'medium', dice
  });
}

test('v0.89.0 a referee may set a combatant\'s wound track, capped at the original', async () => {
  const encounter = await fight();
  const pc = encounter.combatants.find((entry) => entry.side === 'party');
  const hurt = setCombatantCurrent(encounter, { combatantId: pc.id, scores: { STR: 2, END: 0 } });
  const after = hurt.encounter.combatants.find((entry) => entry.id === pc.id);
  assert.equal(after.current.STR, 2);
  assert.equal(after.current.END, 0);
  assert.match(hurt.entry.text, /STR \d+ to 2/);
  // The original is the ceiling: healing restores towards it, never past it.
  const over = setCombatantCurrent(hurt.encounter, { combatantId: pc.id, scores: { STR: 99 } });
  assert.equal(over.encounter.combatants.find((entry) => entry.id === pc.id).current.STR, after.characteristics.STR);
  assert.throws(() => setCombatantCurrent(encounter, { combatantId: pc.id, scores: { STR: -1 } }), RangeError);
  assert.throws(() => setCombatantCurrent(encounter, { combatantId: 'nobody', scores: { STR: 1 } }), /unavailable/);
  // No change is not an event.
  assert.equal(setCombatantCurrent(encounter, { combatantId: pc.id, scores: { STR: after.characteristics.STR } }).entry, null);
});

test('v0.89.0 restoring returns every characteristic and wakes the unconscious', async () => {
  const encounter = await fight();
  const pc = encounter.combatants.find((entry) => entry.side === 'party');
  let state = setCombatantCurrent(encounter, { combatantId: pc.id, scores: { STR: 0, DEX: 0, END: 0 } }).encounter;
  state = setCombatantStatus(state, { combatantId: pc.id, status: 'unconscious' }).encounter;
  const restored = restoreCombatant(state, { combatantId: pc.id });
  const back = restored.encounter.combatants.find((entry) => entry.id === pc.id);
  assert.deepEqual(
    { STR: back.current.STR, DEX: back.current.DEX, END: back.current.END },
    { STR: back.characteristics.STR, DEX: back.characteristics.DEX, END: back.characteristics.END }
  );
  assert.equal(back.status, 'active', 'nobody stays unconscious at full strength');
  assert.match(restored.entry.text, /Referee sets/);
});
