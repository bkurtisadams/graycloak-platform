import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { createSequenceDice, generatePatronContact, importCharacterDocument, importShipDocument } from '../../packages/classic-traveller-rules/index.js';
import { createCampaignDocument, updateCampaignLocation } from '../src/campaign-document.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';
import { arrivalSituationEventKey, buildPatronSituationOffer, generateArrivalSituationOffer, patronSituationEventKey } from '../world/situation-events.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(here, '../examples');

async function fixture(systemId = 'cinder') {
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  const ship = importShipDocument(await readFile(path.join(examples, 'Hawkeye.ship.json'), 'utf8'));
  const system = FAR_MERIDIAN_SUBSECTOR.systems.find((entry) => entry.id === systemId);
  let campaign = createCampaignDocument({
    id: 'campaign-situation-test', name: 'Sea of Suns', characters: [character], ships: [ship],
    partyCharacterIds: [character.identity.id], activeShipId: ship.identity.id,
    time: { year: 4800, dayOfYear: 106, secondsOfDay: 0 }
  });
  campaign = updateCampaignLocation(campaign, {
    systemId: system.id, systemName: system.name, worldId: system.mainWorld.id, worldName: system.mainWorld.name
  });
  ship.state.portCall = { systemId: system.id, arrivalDate: '106-4800', berthingDueCr: 100, berthingPaid: true };
  return { character, ship: importShipDocument(ship), campaign, system };
}

test('Cinder has an authored arrival situation with a real Hawkeye Electronics choice', async () => {
  const { campaign, ship, system } = await fixture('cinder');
  const offer = generateArrivalSituationOffer({ campaign, ship, system, dice: createSequenceDice([]) });
  assert.equal(offer.title, 'Dead Approach Beacon');
  assert.equal(offer.choices[0].skillName, 'Electronics');
  assert.equal(offer.choices[0].target, 8);
  assert.equal(offer.eventKey, arrivalSituationEventKey({ campaign, ship, system }));
});

test('patron situation key is stable for one port call', async () => {
  const { campaign, ship, system } = await fixture('cinder');
  assert.equal(patronSituationEventKey({ campaign, ship, system }), patronSituationEventKey({ campaign, ship, system }));
});

test('Book 3 Scout patron contact becomes a Sea of Suns skill situation after suitability succeeds', async () => {
  const { campaign, ship, system } = await fixture('cinder');
  const contact = generatePatronContact(createSequenceDice([1, 3, 5, 4, 4])); // Scout, reaction 8
  const offer = buildPatronSituationOffer({ campaign, ship, system, contact, dice: createSequenceDice([2]) });
  assert.equal(offer.kind, 'patron-contact');
  assert.equal(offer.actor.type, 'Scout');
  assert.match(offer.rulesBasis, /classic-traveller-book-3-patron-table/);
  assert.equal(offer.choices[0].skillName, 'Electronics');
});

test('Book 3 no-patron result is preserved as a resolved port-call attempt', async () => {
  const { campaign, ship, system } = await fixture('cinder');
  const contact = generatePatronContact(createSequenceDice([6]));
  const offer = buildPatronSituationOffer({ campaign, ship, system, contact, dice: createSequenceDice([]) });
  assert.equal(offer.status, 'resolved');
  assert.equal(offer.title, 'No Patron Contact');
  assert.match(offer.detail, /roll: 6/i);
});

test('hostile Book 3 patron reactions stay unresolved instead of being silently converted into a declined job', async () => {
  const { campaign, ship, system } = await fixture('cinder');
  const contact = generatePatronContact(createSequenceDice([1, 1, 1, 1, 1])); // Arsonist, reaction 2: immediate attack
  const offer = buildPatronSituationOffer({ campaign, ship, system, contact, dice: createSequenceDice([]) });
  assert.equal(contact.reaction.tableTotal, 2);
  assert.equal(offer.status, undefined);
  assert.match(offer.title, /Hostile Contact/);
  assert.match(offer.detail, /combat resolution is deliberately deferred/i);
});
