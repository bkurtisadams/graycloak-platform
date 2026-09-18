// play-session.test.mjs — the play page's headless view of a campaign.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { buildPlayViewState, characterView, daysBetween, formatCampaignDate, jobViews } from '../src/play-session.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'Sea-of-Suns-v0.11.2-buggy.campaign.json');

async function resolved() {
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(JSON.parse(await readFile(fixture, 'utf8')));
  return registry.resolveCampaign(campaign.identity.id);
}

test('a resolved campaign becomes the play page view state', async () => {
  const state = buildPlayViewState(await resolved(), { subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(state.live, true);
  assert.deepEqual(state.campaign, { id: 'campaign-38a2aab661b8ebca', name: 'Sea of Suns', date: '106-4800' });
  assert.deepEqual(state.place, { name: 'Cinder', detail: 'Starport E, hex 0802' });
  assert.equal(state.situation.kind, 'port');
  assert.deepEqual(state.scene, { kind: 'subsector', currentId: 'cinder', selectedId: null, jump: 2 });
});

test('the character is read from the document, wounds from its current values', async () => {
  const { character } = buildPlayViewState(await resolved(), { subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(character.name, 'Hawkeye');
  assert.equal(character.upp, 'AB5678');
  assert.equal(character.service, 'Scout, 5 terms, age 38');
  assert.equal(character.cashCr, 60000);
  assert.equal(character.status, 'Unwounded');
  assert.ok(character.skills.includes('Navigation-2'));
  assert.deepEqual(character.weapons, [{ name: 'Laser Rifle', note: 'In hand' }]);

  const hurt = characterView({ identity: { id: 'c', name: 'X' }, characteristics: { STR: 8, DEX: 7, END: 6, INT: 5, EDU: 5, SOC: 5 }, current: { STR: 8, DEX: 7, END: 0 } });
  assert.equal(hurt.status, 'Unconscious');
  assert.equal(hurt.hurt, true);
  assert.deepEqual(hurt.characteristics.find((entry) => entry.key === 'END'), { key: 'END', full: 6, now: 0 });
});

test('the ship is read from its specification and state', async () => {
  const { ship } = buildPlayViewState(await resolved(), { subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(ship.name, 'Marisol');
  assert.equal(ship.kind, '100 t Scout/Courier');
  assert.equal(ship.accountCr, 843620);
  assert.deepEqual(ship.fuel, { now: 40, full: 40, note: 'Mixed fuel aboard' });
  assert.equal(ship.hold.now, 1);
  assert.equal(ship.hold.full, 3);
  assert.match(ship.hold.note, /1 t Priority Small-Lot Delivery/);
  assert.deepEqual(ship.crew, [{ name: 'Hawkeye', roles: 'Pilot' }]);
  assert.equal(ship.damage, null);
  assert.match(ship.upkeep, /Scout Service/);
});

test('accepted jobs are listed soonest first with their time left', async () => {
  const { jobs } = buildPlayViewState(await resolved(), { subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.deepEqual(jobs.map((job) => [job.to, job.due, job.urgent]), [
    ['Calder', '14 days overdue', true],
    ['Pelagos', 'Due today', true],
    ['Orison', '14 days left', false]
  ]);
  assert.deepEqual(jobViews([{ status: 'completed', identity: { id: 'x', title: 'Done' } }], { year: 4800, dayOfYear: 1 }), []);
});

test('dates', () => {
  assert.equal(formatCampaignDate({ year: 4800, dayOfYear: 7 }), '007-4800');
  assert.equal(daysBetween({ year: 4800, dayOfYear: 360 }, { year: 4801, dayOfYear: 5 }), 10);
});

test('play-session touches no DOM', async () => {
  const source = await readFile(new URL('../src/play-session.js', import.meta.url), 'utf8');
  assert.equal(/\bdocument\.(?!identity|characteristics|current|status|career|age|finances|skills|loadout|upp|crew|design|specifications|state|authority)/.test(source), false);
  assert.equal(/\bwindow\b|localStorage/.test(source), false);
});
