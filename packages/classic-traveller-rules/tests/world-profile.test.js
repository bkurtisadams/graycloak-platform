import test from 'node:test';
import assert from 'node:assert/strict';

import {
  decodeTravellerDigit,
  encodeTravellerDigit,
  formatUniversalWorldProfile,
  parseUniversalWorldProfile,
  validateUniversalWorldProfile,
  validateAuthoredSystemRecord,
  describeStarport,
  describeAtmosphere,
  describeHydrographics,
  describePopulation,
  describeGovernment
} from '../index.js';

test('Traveller digit notation skips I and O and round-trips numeric values', () => {
  assert.equal(encodeTravellerDigit(10), 'A');
  assert.equal(encodeTravellerDigit(17), 'H');
  assert.equal(encodeTravellerDigit(18), 'J');
  assert.equal(decodeTravellerDigit('A'), 10);
  assert.equal(decodeTravellerDigit('J'), 18);
  assert.throws(() => decodeTravellerDigit('I'), /invalid Traveller digit/);
});

test('Book 3 UWP format parses and formats Aster Prime', () => {
  const parsed = parseUniversalWorldProfile('B765845-9');
  assert.deepEqual(parsed, {
    starport: 'B',
    size: 7,
    atmosphere: 6,
    hydrographics: 5,
    population: 8,
    government: 4,
    lawLevel: 5,
    techLevel: 9
  });
  assert.equal(formatUniversalWorldProfile(parsed), 'B765845-9');
  assert.equal(validateUniversalWorldProfile('B765845-9').valid, true);
  assert.equal(validateUniversalWorldProfile('Q765845-9').valid, false);
});

test('Book 3 profile descriptions expose starport and world-characteristic meanings', () => {
  assert.equal(describeStarport('B'), 'Good quality installation');
  assert.equal(describeAtmosphere(6), 'Standard');
  assert.equal(describeHydrographics(5), '50% water');
  assert.equal(describePopulation(8), 'Hundreds of millions');
  assert.equal(describeGovernment(4), 'Representative democracy');
});

test('authored system records require a valid UWP and explicit Book 3 system flags', () => {
  const system = {
    id: 'aster',
    hex: '0505',
    name: 'Aster',
    mainWorld: { id: 'aster-prime', name: 'Aster Prime', uwp: 'B765845-9' },
    bases: { scout: true, naval: false },
    gasGiant: true,
    travelZone: 'none',
    notes: 'Fixture.'
  };
  assert.equal(validateAuthoredSystemRecord(system).valid, true);
  const invalid = structuredClone(system);
  invalid.travelZone = 'green';
  assert.equal(validateAuthoredSystemRecord(invalid).valid, false);
});

test('Book 3 commerce classifications derive from UWP characteristics including Non-Agricultural errata', async () => {
  const { deriveTradeClassifications } = await import('../index.js');
  assert.deepEqual(deriveTradeClassifications(parseUniversalWorldProfile('B667755-A')), ['agricultural', 'rich']);
  assert.deepEqual(deriveTradeClassifications(parseUniversalWorldProfile('C544635-8')), ['agricultural', 'nonIndustrial']);
  assert.deepEqual(deriveTradeClassifications(parseUniversalWorldProfile('C200677-9')), ['nonAgricultural', 'nonIndustrial']);
  assert.deepEqual(deriveTradeClassifications(parseUniversalWorldProfile('B765845-9')), ['rich']);
});
