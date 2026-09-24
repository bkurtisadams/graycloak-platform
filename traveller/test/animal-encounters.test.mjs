// animal-encounters.test.mjs — v0.302.0. The Traveller Book (1982) animal
// encounters in play: where the party is, the tables, the clock's checks
// (stopping at the first encounter), the board, and the 1982 reaction DM.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { createPlaySession, reactionModifiers } from '../src/play-session.js';
import { campaignDayNumber, animalRangeTerrain, explainBehaviourCode, ANIMAL_RANGE_TERRAIN } from '../src/animal-encounters.js';
import { TERRAIN_DMS } from '../vendor/classic-traveller-rules/index.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';
import { renderSheets } from '../client/sheets.js';

let JSDOM = null;
try { ({ JSDOM } = await import('jsdom')); } catch { JSDOM = null; }

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'Sea-of-Suns-v0.11.2-buggy.campaign.json');

async function freshSession() {
  const bundle = JSON.parse(await readFile(fixture, 'utf8'));
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(bundle);
  const session = createPlaySession({ registry, campaignId: campaign.identity.id, subsector: FAR_MERIDIAN_SUBSECTOR });
  const run = (command, value = {}) => session.run(command, { fight: { value } });
  return { session, registry, campaignId: campaign.identity.id, run };
}

function withRandom(value, body) {
  const original = Math.random;
  Math.random = () => value;
  try { return body(); } finally { Math.random = original; }
}

test('going out on the surface builds that terrain\u2019s table, one statblock per animal, in the Journal', async () => {
  const { session, registry, campaignId, run } = await freshSession();
  assert.equal(session.view().animals.surface, null, 'in port to begin with');
  const out = run('animals:surface', { terrain: 'prairie' });
  assert.equal(out.ok, true, out.message);
  const view = session.view().animals;
  assert.equal(view.surface.terrain, 'prairie');
  assert.equal(view.tables.length, 1);
  assert.equal(view.airless, true, 'Cinder (E200312-6) has no atmosphere');
  const { campaign, npcActors } = registry.resolveCampaign(campaignId);
  const table = campaign.roster.animals.tables[view.surface.key];
  assert.equal(table.rows.length, 11);
  assert.equal(table.rows.find((row) => row.die === 10).category, 'event');
  const animals = table.rows.filter((row) => row.actorId);
  assert.equal(animals.length, 10);
  for (const row of animals) {
    const actor = npcActors.find((entry) => entry.identity.id === row.actorId);
    assert.equal(actor.profile.kind, 'statblock');
    assert.equal(actor.profile.actorType, 'creature');
    assert.equal(actor.profile.folder, 'Animals/Cinder/Prairie');
    assert.ok(actor.animal.hits.dead >= actor.animal.hits.unconscious);
  }
  const journal = session.view({ referee: { tab: 'Journal', folder: 'Animal encounters/Cinder' } }).referee.shown;
  assert.equal(journal.length, 1);
  assert.deepEqual(journal[0].sheet, { kind: 'animals', id: view.surface.key });
  const [sheet] = session.view({ sheets: [{ kind: 'animals', id: view.surface.key }] }).sheets;
  assert.equal(sheet.table.here, true);
  assert.match(sheet.table.rows.find((row) => row.actorId).code, /^[AF]\d+ [AF]\d+ S\d$/);
  const [statblock] = session.view({ sheets: [{ kind: 'actor', id: animals[0].actorId }] }).sheets;
  assert.ok(statblock.animal);
  assert.equal(statblock.compactOnly, true);
  assert.equal(run('animals:event', { key: table.key, die: 10, text: 'Stampede' }).ok, true);
  assert.equal(registry.resolveCampaign(campaignId).campaign.roster.animals.tables[table.key].rows.find((row) => row.die === 10).event, 'Stampede');
});

test('the clock throws two checks a day and stops on the first encounter', async () => {
  const { session, registry, campaignId, run } = await freshSession();
  run('animals:surface', { terrain: 'prairie' });
  const before = registry.resolveCampaign(campaignId).campaign.time;
  // Every die a 6: the first day's travelling check finds something.
  const passed = withRandom(0.99, () => run('time:pass', { amount: 1, unit: 'weeks' }));
  assert.equal(passed.ok, true, passed.message);
  assert.match(passed.message, /stopping short of the 1 week asked/);
  const { campaign } = registry.resolveCampaign(campaignId);
  assert.equal(campaignDayNumber(campaign.time), campaignDayNumber(before) + 1);
  assert.equal(campaign.time.secondsOfDay, 0);
  const pending = campaign.roster.animals.pending;
  assert.equal(pending.when, 'travelling');
  assert.equal(pending.die, 12, 'all sixes on the table');
  const line = session.view().chat.find((entry) => /Animal encounter on/.test(entry.text ?? entry.message ?? ''));
  assert.ok(line, 'the encounter is in chat');
  assert.equal(line.visibility, 'referee');
  const blocked = run('time:pass', { amount: 1, unit: 'days' });
  assert.equal(blocked.ok, false);
  assert.match(blocked.message, /an animal encounter is waiting/);
  assert.equal(run('animals:dismiss').ok, true);
  assert.equal(run('time:pass', { amount: 1, unit: 'hours' }).ok, true);
});

test('a quiet week passes whole, and each checked day is remembered', async () => {
  const { registry, campaignId, run } = await freshSession();
  run('animals:surface', { terrain: 'desert' });
  const start = campaignDayNumber(registry.resolveCampaign(campaignId).campaign.time);
  const passed = withRandom(0, () => run('time:pass', { amount: 1, unit: 'weeks' }));
  assert.match(passed.message, /^1 week passes/);
  const { campaign } = registry.resolveCampaign(campaignId);
  assert.equal(campaign.roster.animals.surface.lastCheckedDay, start + 7);
  assert.equal(campaign.roster.animals.pending, null);
  // Back in port, no checks at all.
  run('animals:surface', { terrain: '' });
  assert.match(withRandom(0.99, () => run('time:pass', { amount: 1, unit: 'weeks' })).message, /^1 week passes/);
});

test('an encounter goes onto the board with the party, and animals fight on a hits track', async () => {
  const { session, registry, campaignId, run } = await freshSession();
  run('animals:surface', { terrain: 'clear' });
  const table = Object.values(registry.resolveCampaign(campaignId).campaign.roster.animals.tables)[0];
  const row = table.rows.find((entry) => entry.actorId);
  const thrown = run('animals:behaviour', { actorId: row.actorId });
  assert.equal(thrown.ok, true, thrown.message);
  assert.ok(['attack', 'flee', 'nothing'].includes(thrown.behaviour.action));
  const placed = run('animals:place', { actorId: row.actorId, count: 2 });
  assert.equal(placed.ok, true, placed.message);
  const encounter = registry.resolveCampaign(campaignId).encounters.find((entry) => entry.status === 'setup');
  const beasts = encounter.combatants.filter((entry) => entry.animal);
  assert.equal(beasts.length, 2);
  assert.ok(encounter.combatants.some((entry) => entry.side === 'party'));
  const fighter = session.view().fight?.fighters?.find((entry) => entry.animal) ?? null;
  if (fighter) {
    assert.equal(fighter.animal.woundsTaken, 0);
    assert.ok(fighter.weaponChoices.every((choice) => Object.hasOwn(fighter.animal.weapons, choice.key)));
  }
  const wrong = session.run('fight:weapon', { fight: { value: { combatantId: beasts[0].id, weaponKey: 'rifle' } } });
  assert.equal(wrong.ok, false, 'an animal cannot pick up a rifle');
});

test('a corrected date restarts the checks from the new day', async () => {
  const { registry, campaignId, run } = await freshSession();
  run('animals:surface', { terrain: 'forest' });
  const time = registry.resolveCampaign(campaignId).campaign.time;
  run('time:set', { year: time.year, dayOfYear: Math.min(365, time.dayOfYear + 30) });
  const { campaign } = registry.resolveCampaign(campaignId);
  assert.equal(campaign.roster.animals.surface.lastCheckedDay, campaignDayNumber(campaign.time));
});

test('The Traveller Book p.101: population 9+ is -1 on reactions (1977\u2019s 11+ could never apply)', () => {
  assert.equal(reactionModifiers({ population: 9 }).dm, -1);
  assert.equal(reactionModifiers({ population: 10 }).dm, -1);
  assert.equal(reactionModifiers({ population: 8 }).dm, 0);
});

test('the table and the animal statblock draw', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  const { session, registry, campaignId, run } = await freshSession();
  run('animals:surface', { terrain: 'jungle' });
  const table = Object.values(registry.resolveCampaign(campaignId).campaign.roster.animals.tables)[0];
  const actorId = table.rows.find((row) => row.actorId).actorId;
  const asked = [];
  const layer = renderSheets(session.view({ sheets: [{ kind: 'animals', id: table.key }, { kind: 'actor', id: actorId }] }).sheets, { onAnimals: (command, value) => asked.push([command, value]) });
  const text = layer.textContent;
  assert.match(text, /Wounds & weapons/);
  assert.match(text, /Unconscious at \d+ hits, dead at \d+/);
  [...layer.querySelectorAll('button')].find((button) => button.textContent === 'Throw attack / flee').click();
  assert.deepEqual(asked.at(-1), ['behaviour', { actorId, surprise: false, surprised: false }]);
  delete globalThis.document;
  delete globalThis.Node;
});

test('v0.304.0 the 1982 animal terrains map onto Book 1\u2019s range-throw terrains', () => {
  for (const [terrain, book1] of Object.entries(ANIMAL_RANGE_TERRAIN)) {
    if (book1 !== null) assert.ok(Object.hasOwn(TERRAIN_DMS, book1), `${terrain} maps to ${book1}`);
  }
  assert.equal(animalRangeTerrain('forest'), 'forest');
  assert.equal(animalRangeTerrain('depths'), 'maritime-subsurface');
  assert.equal(animalRangeTerrain('crater'), null);
});

test('v0.304.0 the code in words: F0 always flees, special cases named, speed spelled out', () => {
  const grazer = { order: 'FA', flee: { throw: 0, rule: null }, attack: { throw: 7, rule: null }, speed: 3 };
  assert.equal(explainBehaviourCode(grazer), 'flees always (0+), then attacks on 7+; triple speed');
  const pouncer = { order: 'AF', attack: { throw: 0, rule: 'if-surprise' }, flee: { throw: 0, rule: 'if-surprised' }, speed: 1 };
  assert.equal(explainBehaviourCode(pouncer), 'attacks only if it has surprise, then flees if surprised; ordinary speed');
});

test('v0.304.0 surprise, then range, then attack/flee, and the board takes what was settled', async () => {
  const { registry, campaignId, run } = await freshSession();
  run('animals:surface', { terrain: 'forest' });
  const table = Object.values(registry.resolveCampaign(campaignId).campaign.roster.animals.tables)[0];
  assert.equal(run('animals:surprise', { mode: 'roll' }).ok, false, 'nothing is waiting yet');
  assert.equal(run('animals:roll', { key: table.key }).ok, true);
  let pending = registry.resolveCampaign(campaignId).campaign.roster.animals.pending;
  if (!pending.actorId) {
    // An event row: nothing to place. Roll until an animal comes up.
    for (let tries = 0; tries < 20 && !pending.actorId; tries += 1) {
      run('animals:dismiss');
      run('animals:roll', { key: table.key });
      pending = registry.resolveCampaign(campaignId).campaign.roster.animals.pending;
    }
  }
  const surprise = withRandom(0.99, () => run('animals:surprise', { mode: 'roll' }));
  assert.match(surprise.message, /^Surprise \(Book 1 p\.27\): party 1D 6/);
  const called = run('animals:surprise', { mode: 'opposition' });
  assert.match(called.message, /the animals have surprise \(referee\u2019s call\)/);
  const range = run('animals:range', { mode: 'roll' });
  assert.match(range.message, /forest \+1/, 'Book 1 p.27 forest DM');
  pending = registry.resolveCampaign(campaignId).campaign.roster.animals.pending;
  assert.ok(['close', 'short', 'medium', 'long', 'very-long'].includes(pending.range.range));
  assert.equal(run('animals:behaviour', { actorId: pending.actorId }).ok, true);
  const placed = run('animals:place', { actorId: pending.actorId, count: 1 });
  assert.equal(placed.ok, true, placed.message);
  assert.match(placed.message, /Round 1 begins/);
  const fight = registry.resolveCampaign(campaignId).encounters.find((entry) => entry.status === 'active');
  assert.ok(fight, 'the fight began');
  assert.equal(fight.surprise.surpriseSideId, 'opposition');
  assert.equal(registry.resolveCampaign(campaignId).campaign.roster.animals.pending, null);
});
