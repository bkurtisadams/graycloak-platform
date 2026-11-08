// v0.374.0 (Kurt, Nov 2026): drugs in play — searching for them in the
// Store, medical drug in place of a kit, medical slow drug (Book 2 pp.38-39).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { createPlaySession } from '../src/play-session.js';
import { campaignDayNumber } from '../src/animal-encounters.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'Sea-of-Suns-v0.11.2-buggy.campaign.json');
const HAWKEYE = 'char-04164baa70c3b5a6';

async function atOrison({ medical = null, wounded = false } = {}) {
  const bundle = JSON.parse(await readFile(fixture, 'utf8'));
  bundle.campaign.location = { systemId: 'orison', systemName: 'Orison', worldId: 'orison-main', worldName: 'Orison' };
  const hawkeye = bundle.documents.characters.find((entry) => entry.identity.id === HAWKEYE);
  if (medical !== null) hawkeye.skills = { ...hawkeye.skills, Medical: medical };
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(bundle);
  if (wounded) {
    const stored = registry.resolveCampaign(campaign.identity.id).characters.find((entry) => entry.identity.id === HAWKEYE);
    registry.put({ ...stored, current: { ...stored.current, STR: 6 } });
  }
  const session = createPlaySession({ registry, campaignId: campaign.identity.id, subsector: FAR_MERIDIAN_SUBSECTOR });
  return { registry, session, campaignId: campaign.identity.id };
}
const hawkeye = (session) => session.resolved.characters.find((entry) => entry.identity.id === HAWKEYE);
const doses = (session, name) => (hawkeye(session).inventory ?? []).filter((item) => item.name === name).reduce((n, item) => n + item.quantity, 0);

test('v0.374.0 the Store lists drugs; searching for one takes a day and says what the throws were', async () => {
  const { session, campaignId, registry } = await atOrison();
  const drugs = session.view().compendium.packs.find((pack) => pack.name === 'Drugs');
  assert.ok(drugs.entries.some((entry) => entry.key === 'drug:slow' && entry.buy));
  const before = campaignDayNumber(registry.resolveCampaign(campaignId).campaign.time);
  const result = session.run('gear:buy', { fight: { id: HAWKEYE, value: { key: 'drug:medical', quantity: 2 } } });
  assert.equal(result.ok, true, result.message);
  assert.match(result.message, /(finds none|buys 2 doses)/);
  assert.match(result.message, /against 9\+/);
  assert.match(result.message, /(legal|illegal) here/);
  assert.ok(campaignDayNumber(registry.resolveCampaign(campaignId).campaign.time) >= before + 1, 'a day\u2019s search');
});

test('v0.374.0 a dose of medical drug, with Medical-1, treats ordinary wounds without a kit', async () => {
  const { session } = await atOrison({ medical: 1, wounded: true });
  session.run('gear:give', { fight: { id: HAWKEYE, value: { key: 'drug:medical', quantity: 2 } } });
  const noKit = session.run('character:medical', { fight: { id: HAWKEYE, value: { medicId: HAWKEYE, kit: false } } });
  assert.equal(noKit.ok, false, 'no kit, no drug: refused as before');
  const treated = session.run('character:medical', { fight: { id: HAWKEYE, value: { medicId: HAWKEYE, drug: true } } });
  assert.equal(treated.ok, true, treated.message);
  assert.match(treated.message, /medical drug/);
  assert.equal(hawkeye(session).current.STR, hawkeye(session).characteristics.STR);
  assert.equal(doses(session, 'Medical drug'), 1);
});

test('v0.374.0 medical slow drug: back to full strength in a day, a month older in body', async () => {
  const { session } = await atOrison({ wounded: true });
  session.run('gear:give', { fight: { id: HAWKEYE, value: { key: 'drug:medical-slow', quantity: 1 } } });
  const age = hawkeye(session).chronology.physicalAgeMonths;
  const result = session.run('character:medical-slow', { fight: { id: HAWKEYE } });
  assert.equal(result.ok, true, result.message);
  assert.equal(hawkeye(session).current.STR, hawkeye(session).characteristics.STR);
  assert.equal(hawkeye(session).chronology.physicalAgeMonths, age + 1);
  assert.equal(doses(session, 'Medical slow drug'), 0);
  assert.equal(session.run('character:medical-slow', { fight: { id: HAWKEYE } }).ok, false, 'not wounded now');
});

test('v0.375.0 fast drug: sixty days, then two months younger in body; the antidote cuts it short', async () => {
  const { session, registry, campaignId } = await atOrison();
  session.run('gear:give', { fight: { id: HAWKEYE, value: { key: 'drug:fast', quantity: 2 } } });
  session.run('gear:give', { fight: { id: HAWKEYE, value: { key: 'drug:fast-antidote', quantity: 1 } } });
  const age = hawkeye(session).chronology.physicalAgeMonths;
  const taken = session.run('drug:take', { fight: { id: HAWKEYE, value: { drugKey: 'fast' } } });
  assert.equal(taken.ok, true, taken.message);
  assert.ok(registry.resolveCampaign(campaignId).campaign.roster.drugRegimen[HAWKEYE].fastUntil);
  assert.equal(session.run('drug:take', { fight: { id: HAWKEYE, value: { drugKey: 'fast' } } }).ok, false, 'one at a time');
  const cut = session.run('drug:take', { fight: { id: HAWKEYE, value: { drugKey: 'fast-antidote' } } });
  assert.equal(cut.ok, true, cut.message);
  assert.match(cut.message, /cancelled after 0 days/);
  assert.equal(hawkeye(session).chronology.physicalAgeMonths, age);
  assert.equal(registry.resolveCampaign(campaignId).campaign.roster.drugRegimen?.[HAWKEYE], undefined);
  // A full dose: sixty days on the referee's clock, then the saving.
  session.run('drug:take', { fight: { id: HAWKEYE, value: { drugKey: 'fast' } } });
  const date = registry.resolveCampaign(campaignId).campaign.time;
  const set = session.run('time:set', { fight: { value: { year: date.year, dayOfYear: date.dayOfYear + 60 } } });
  assert.equal(set.ok, true, set.message);
  assert.ok(session.view().chat.some((line) => /fast drug wears off after 60 days: 2 months younger/.test(line.text)));
  assert.equal(hawkeye(session).chronology.physicalAgeMonths, age - 2, 'the saving is taken off the body');
});

test('v0.375.0 anagathics: a month at a time, carried forward', async () => {
  const { session, registry, campaignId } = await atOrison();
  session.run('gear:give', { fight: { id: HAWKEYE, value: { key: 'drug:anagathics', quantity: 2 } } });
  assert.equal(session.run('drug:take', { fight: { id: HAWKEYE, value: { drugKey: 'anagathics' } } }).ok, true);
  const first = registry.resolveCampaign(campaignId).campaign.roster.drugRegimen[HAWKEYE].anagathicsUntil;
  session.run('drug:take', { fight: { id: HAWKEYE, value: { drugKey: 'anagathics' } } });
  const second = registry.resolveCampaign(campaignId).campaign.roster.drugRegimen[HAWKEYE].anagathicsUntil;
  assert.notEqual(first, second, 'a second dose extends the first');
});

test('v0.375.0 truth drug: 2D wounds, off endurance first', async () => {
  const { session } = await atOrison();
  session.run('gear:give', { fight: { id: HAWKEYE, value: { key: 'drug:truth', quantity: 1 } } });
  const before = hawkeye(session).current;
  const result = session.run('drug:truth', { fight: { id: HAWKEYE } });
  assert.equal(result.ok, true, result.message);
  assert.match(result.message, /two minutes of truthful answers, then an hour unconscious and 2D/);
  const after = hawkeye(session).current;
  assert.ok(after.END < before.END || before.END === 0);
});
