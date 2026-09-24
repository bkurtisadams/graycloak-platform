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

test('v0.305.0 an empty setup board with an animal encounter waiting: no reaction table for people, the encounter shown', { skip: !JSDOM }, async () => {
  const { session, registry, campaignId, run } = await freshSession();
  run('animals:surface', { terrain: 'forest' });
  const table = Object.values(registry.resolveCampaign(campaignId).campaign.roster.animals.tables)[0];
  const animalRow = table.rows.find((row) => row.actorId);
  // Roll straight onto an animal row: all-random until one lands.
  for (let tries = 0; tries < 30; tries += 1) {
    run('animals:roll', { key: table.key });
    if (registry.resolveCampaign(campaignId).campaign.roster.animals.pending.actorId) break;
    run('animals:dismiss');
  }
  assert.ok(animalRow);
  assert.equal(session.run('fight:setup').ok, true);
  const view = session.view();
  assert.equal(view.setupPhase, true);
  assert.equal(view.fightReaction, null, 'animals answer to p.95, not the reaction table');
  assert.equal(view.animals.surface.rangeTerrain, 'forest');
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  const { renderScene, renderMastChips } = await import('../client/play-views.js');
  const scene = renderScene({ ...view, live: true, seat: 'referee' }, { onAnimals: () => null });
  const holder = dom.window.document.createElement('div');
  holder.append(...[scene].flat(Infinity).filter(Boolean));
  assert.match(holder.textContent, /Animal encounter/);
  assert.match(holder.textContent, /1\. Surprise/);
  // v0.306.0: the board's own range and surprise are not repeated beside it.
  assert.doesNotMatch(holder.textContent, /Throw range/);
  assert.doesNotMatch(holder.textContent, /Roll surprise/);
  assert.match(holder.textContent, /Put the encounter on the board, or drag/);
  const chips = dom.window.document.createElement('div');
  chips.append(...[renderMastChips({ ...view, seat: 'referee' }, { openDrawer: () => null, drawer: null })].flat(Infinity).filter(Boolean));
  assert.match(chips.textContent, /Board open, setting up/);
  delete globalThis.document;
  delete globalThis.Node;
});

async function waitingAnimal(terrain = 'clear') {
  const fresh = await freshSession();
  fresh.run('animals:surface', { terrain });
  const table = Object.values(fresh.registry.resolveCampaign(fresh.campaignId).campaign.roster.animals.tables)[0];
  for (let tries = 0; tries < 40; tries += 1) {
    fresh.run('animals:roll', { key: table.key });
    if (fresh.registry.resolveCampaign(fresh.campaignId).campaign.roster.animals.pending.actorId) break;
    fresh.run('animals:dismiss');
  }
  return { ...fresh, pending: () => fresh.registry.resolveCampaign(fresh.campaignId).campaign.roster.animals.pending };
}

test('v0.307.0 only those out with the party go on the board, and a board with characters keeps them', async () => {
  const { session, registry, campaignId, run, pending } = await waitingAnimal();
  const roster = session.view().animals.roster;
  assert.ok(roster.length >= 1, 'the fixture has characters');
  const chosen = roster[0].id;
  assert.equal(run('animals:with', { ids: [chosen] }).ok, true);
  assert.equal(run('animals:with', { ids: [] }).ok, false, 'somebody has to go');
  assert.deepEqual(session.view().animals.roster.filter((entry) => entry.with).map((entry) => entry.id), [chosen]);
  assert.equal(run('animals:place', { actorId: pending().actorId, count: 1 }).ok, true);
  const board = registry.resolveCampaign(campaignId).encounters.find((entry) => entry.status === 'setup');
  assert.deepEqual(board.combatants.filter((entry) => entry.side === 'party').map((entry) => entry.id), [chosen]);
});

test('v0.307.0 a fleeing animal: let go and logged, or on the board with escape declared', async () => {
  const first = await waitingAnimal();
  // Force the throw: a copy of the encounter with its behaviour thrown as flee.
  const campaign = first.registry.resolveCampaign(first.campaignId).campaign;
  const fleeing = { ...campaign.roster.animals.pending, behaviour: { action: 'flee', speed: 3, text: 'flees' } };
  first.registry.put({ ...campaign, roster: { ...campaign.roster, animals: { ...campaign.roster.animals, pending: fleeing } } });
  const gone = first.run('animals:dismiss', { fled: true });
  assert.match(gone.message, /fled; the party let (it|them) go/);

  const second = await waitingAnimal();
  const again = second.registry.resolveCampaign(second.campaignId).campaign;
  second.registry.put({ ...again, roster: { ...again.roster, animals: { ...again.roster.animals, pending: { ...again.roster.animals.pending, behaviour: { action: 'flee', speed: 3, text: 'flees' }, surprise: { side: null, thrown: null, text: 'neither side has surprise (referee\u2019s call)' } } } } });
  second.session.reload?.();
  const placed = second.run('animals:place', { actorId: second.pending()?.actorId ?? again.roster.animals.pending.actorId, count: 1 });
  assert.equal(placed.ok, true, placed.message);
  assert.match(placed.message, /fleeing: escape is declared for round 1/);
  const fight = second.registry.resolveCampaign(second.campaignId).encounters.find((entry) => entry.status === 'active');
  const beast = fight.combatants.find((entry) => entry.animal);
  assert.equal(beast.tactics, 'manual');
  assert.ok(fight.roundState.declaredActions.some((entry) => entry.actorId === beast.id && entry.action === 'escape'));
});

test('v0.307.0 p.92 butchering a dead animal, once', async () => {
  const { session, registry, campaignId, run, pending } = await waitingAnimal();
  const actorId = pending().actorId;
  run('animals:surprise', { mode: 'party' });
  run('animals:range', { mode: 'close' });
  assert.equal(run('animals:place', { actorId, count: 1 }).ok, true);
  // End it by hand: the animal dead.
  const fight = registry.resolveCampaign(campaignId).encounters.find((entry) => entry.status === 'active');
  const beast = fight.combatants.find((entry) => entry.animal);
  registry.put({ ...fight, combatants: fight.combatants.map((entry) => (entry.id === beast.id ? { ...entry, status: 'dead', animal: { ...entry.animal, woundsTaken: entry.animal.hits.dead } } : entry)) });
  session.reload?.();
  const first = run('animals:butcher', { encounterId: fight.identity.id, combatantId: beast.id });
  assert.equal(first.ok, true, first.message);
  assert.match(first.message, /(edible|not edible)/);
  assert.equal(run('animals:butcher', { encounterId: fight.identity.id, combatantId: beast.id }).ok, false, 'once a carcass');
});
