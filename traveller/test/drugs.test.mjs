// v0.374.0 (Kurt, Nov 2026): Book 2 pp.38-39 (1977), the drugs — slow and
// combat drug in a personal fight, synergy, and the wear-off.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { importCharacterDocument } from '../vendor/classic-traveller-rules/index.js';
import { importCampaignBundle } from '../src/campaign-bundle.js';
import { createEncounterDocument, takeEncounterDrug, resolveEncounterRound, endEncounterByReferee, combatantSlowed } from '../src/encounter-document.js';

// Every attack misses (2D of 2), every wear-off die is a 1.
const dice = { rollD6: () => 1, roll2D6: () => ({ dice: [1, 1], total: 2 }) };
const date = { year: 4800, dayOfYear: 106 };
const here = path.dirname(fileURLToPath(import.meta.url));

async function fight() {
  const character = importCharacterDocument(await readFile(path.join(here, '../examples/Hawkeye.character.json'), 'utf8'));
  const campaign = importCampaignBundle(await readFile(path.join(here, 'fixtures/Sea-of-Suns-v0.11.2-buggy.campaign.json'), 'utf8')).campaign;
  return createEncounterDocument({ campaign, character, opponent: { name: 'Raider' }, encounterKey: 'drugs', date, range: 'short', dice });
}
const pcOf = (encounter) => encounter.combatants.find((entry) => entry.side === 'party');
const foeOf = (encounter) => encounter.combatants.find((entry) => entry.side !== 'party');
function round(encounter) {
  return resolveEncounterRound(encounter, { action: 'attack', actorId: pcOf(encounter).id, targetId: foeOf(encounter).id, dice, date }).encounter;
}
const attacksBy = (encounter, id, inRound) => encounter.history.filter((entry) => entry.kind === 'attack' && entry.actorId === id && entry.round === inRound).length;

test('v0.374.0 slow drug: from 3 rounds after taking, two attacks a round', async () => {
  let encounter = (await fight());
  const pc = pcOf(encounter);
  encounter = takeEncounterDrug(encounter, { combatantId: pc.id, drugKey: 'slow' }).encounter;
  assert.throws(() => takeEncounterDrug(encounter, { combatantId: pc.id, drugKey: 'slow' }), /already on slow drug/);
  for (let index = 0; index < 4; index += 1) encounter = round(encounter);
  assert.equal(attacksBy(encounter, pc.id, 1), 1);
  assert.equal(attacksBy(encounter, pc.id, 3), 1);
  assert.equal(attacksBy(encounter, pc.id, 4), 2, 'round 1 + 3: two combat rounds to each one');
  // The two hits ended the fight, and the drug wore off with it.
  assert.ok(encounter.history.some((entry) => entry.round === 4 && /takes hold/.test(entry.text ?? '')));
  assert.ok(encounter.history.some((entry) => /slow drug wears off/.test(entry.text ?? '')));
  assert.equal(combatantSlowed({ drugs: [{ key: 'slow', first: 4, last: 43, ended: false }] }, 4), true);
  assert.equal(combatantSlowed({ drugs: [{ key: 'slow', first: 4, last: 43, ended: false }] }, 3), false);
});

test('v0.374.0 combat drug: +2 strength and endurance from 2 rounds on; off at the fight\u2019s end with 1D wounds', async () => {
  let encounter = await fight();
  const before = pcOf(encounter);
  encounter = takeEncounterDrug(encounter, { combatantId: before.id, drugKey: 'combat' }).encounter;
  encounter = round(encounter);
  assert.equal(pcOf(encounter).characteristics.STR, before.characteristics.STR, 'not yet');
  encounter = round(encounter);
  const boosted = pcOf(encounter);
  assert.equal(boosted.characteristics.STR, before.characteristics.STR + 2);
  assert.equal(boosted.current.END, before.current.END + 2);
  assert.equal(boosted.blowAllowance, before.blowAllowance + 2);
  const ended = endEncounterByReferee(encounter, { date, dice }).encounter;
  const after = pcOf(ended);
  assert.equal(after.characteristics.STR, before.characteristics.STR, 'the boost is gone');
  const lost = ['STR', 'DEX', 'END'].reduce((sum, key) => sum + before.current[key] - after.current[key], 0);
  assert.equal(lost, 1, 'and 1D wounds (a 1)');
  assert.ok(ended.history.some((entry) => entry.kind === 'drug' && /wears off/.test(entry.text)));
});

test('v0.374.0 two drugs: synergy, 1D each multiplied, when the last ends (Book 2 p.39)', async () => {
  let encounter = await fight();
  const pc = pcOf(encounter);
  encounter = takeEncounterDrug(encounter, { combatantId: pc.id, drugKey: 'slow' }).encounter;
  encounter = takeEncounterDrug(encounter, { combatantId: pc.id, drugKey: 'combat' }).encounter;
  const ended = endEncounterByReferee(encounter, { date, dice }).encounter;
  const synergy = ended.history.find((entry) => entry.kind === 'drug' && /synergy/.test(entry.text));
  assert.ok(synergy);
  assert.match(synergy.text, /= 1 wounds/);
});
