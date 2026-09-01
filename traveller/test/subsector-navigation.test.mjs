import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getJumpDestinations,
  getSubsectorSystem,
  jumpDistanceBetweenSystems,
  validateAuthoredSubsector,
  validateAuthoredSystemRecord,
  parseUniversalWorldProfile
} from '../../packages/classic-traveller-rules/index.js';

import {
  advanceCampaignDays,
  createCampaignDocument,
  updateCampaignLocation
} from '../src/campaign-document.js';

import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';

const character = {
  identity: { id: 'char-test', name: 'Hawkeye' }
};
const ship = {
  identity: { id: 'ship-test', name: 'Marisol', registry: 'S-17384' },
  design: { typeCode: 'S' }
};

test('Far Meridian is a valid authored 8x10 Traveller subsector fixture', () => {
  const result = validateAuthoredSubsector(FAR_MERIDIAN_SUBSECTOR);
  assert.equal(result.valid, true, result.errors.join('; '));
  assert.equal(FAR_MERIDIAN_SUBSECTOR.systems.some((system) => system.name === 'Port Meridian'), true);
  assert.equal(FAR_MERIDIAN_SUBSECTOR.systems.some((system) => system.name === 'Aurelia'), false);
  for (const system of FAR_MERIDIAN_SUBSECTOR.systems) {
    const worldResult = validateAuthoredSystemRecord(system);
    assert.equal(worldResult.valid, true, `${system.name}: ${worldResult.errors.join('; ')}`);
  }
});

test('Marisol Jump-2 range from Port Meridian includes one- and two-parsec systems only', () => {
  const destinations = getJumpDestinations(FAR_MERIDIAN_SUBSECTOR, 'port-meridian', 2);
  assert.equal(destinations.some((entry) => entry.system.id === 'aster' && entry.distance === 1), true);
  assert.equal(destinations.some((entry) => entry.system.id === 'bellona' && entry.distance === 2), true);
  assert.equal(destinations.every((entry) => entry.distance <= 2), true);
  assert.equal(destinations.some((entry) => entry.system.id === 'cinder'), false);
});

test('a jump updates mapped campaign location and advances the v0.9 campaign clock seven days', () => {
  let campaign = createCampaignDocument({
    id: 'campaign-sea-of-suns',
    name: 'Sea of Suns',
    characters: [character],
    ships: [ship],
    time: { year: 4800, dayOfYear: 1, secondsOfDay: 0 }
  });
  const origin = getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, 'port-meridian');
  const destination = getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, 'aster');
  assert.equal(jumpDistanceBetweenSystems(FAR_MERIDIAN_SUBSECTOR, origin.id, destination.id), 1);

  campaign = updateCampaignLocation(campaign, {
    systemId: origin.id,
    systemName: origin.name,
    worldId: origin.mainWorld.id,
    worldName: origin.mainWorld.name
  });
  campaign = updateCampaignLocation(campaign, {
    systemId: destination.id,
    systemName: destination.name,
    worldId: destination.mainWorld.id,
    worldName: destination.mainWorld.name
  });
  campaign = advanceCampaignDays(campaign, 7);

  assert.equal(campaign.location.systemId, 'aster');
  assert.equal(campaign.location.worldName, 'Aster Prime');
  assert.deepEqual(campaign.time, { year: 4800, dayOfYear: 8, secondsOfDay: 0 });
});

test('campaign day advancement rolls over a 365-day Graycloak campaign year', () => {
  let campaign = createCampaignDocument({
    id: 'campaign-year-rollover',
    name: 'Sea of Suns',
    characters: [character],
    ships: [ship],
    time: { year: 4800, dayOfYear: 363, secondsOfDay: 0 }
  });
  campaign = advanceCampaignDays(campaign, 7);
  assert.deepEqual(campaign.time, { year: 4801, dayOfYear: 5, secondsOfDay: 0 });
});


test('Aster carries the authored Book 3 world/system record used by the browser', () => {
  const aster = getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, 'aster');
  assert.equal(aster.mainWorld.name, 'Aster Prime');
  assert.equal(aster.mainWorld.uwp, 'B765845-9');
  assert.deepEqual(parseUniversalWorldProfile(aster.mainWorld.uwp), {
    starport: 'B', size: 7, atmosphere: 6, hydrographics: 5,
    population: 8, government: 4, lawLevel: 5, techLevel: 9
  });
  assert.deepEqual(aster.bases, { scout: true, naval: false });
  assert.equal(aster.gasGiant, true);
  assert.equal(aster.travelZone, 'none');
});

 test('Far Meridian includes amber and red advisory travel-zone examples without inventing a green zone', () => {
  assert.equal(FAR_MERIDIAN_SUBSECTOR.systems.some((system) => system.travelZone === 'amber'), true);
  assert.equal(FAR_MERIDIAN_SUBSECTOR.systems.some((system) => system.travelZone === 'red'), true);
  assert.equal(FAR_MERIDIAN_SUBSECTOR.systems.some((system) => system.travelZone === 'green'), false);
});
