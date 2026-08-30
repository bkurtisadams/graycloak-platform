import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const documentsPath = fileURLToPath(new URL('../public/adnd-documents.js', import.meta.url));
const mapPath = fileURLToPath(new URL('../public/adnd-map-view.js', import.meta.url));

function loadMapView() {
  const context = vm.createContext({
    console,
    URLSearchParams,
    location: { search: '' },
  });
  new vm.Script(fs.readFileSync(documentsPath, 'utf8'), {
    filename: 'adnd-documents.js',
  }).runInContext(context);
  return new vm.Script(fs.readFileSync(mapPath, 'utf8') + '\nADNDMapView', {
    filename: 'adnd-map-view.js',
  }).runInContext(context);
}

test('map read boundary normalizes a legacy character into an Actor', () => {
  const MapView = loadMapView();
  const actor = MapView.normalizeCharacterRecord({
    ownerUid: 'uid-old',
    campaignId: 'camp-1',
    name: 'Legacy Hero',
    level: 6,
    currentLocation: { regionalHexId: 'D4-86', subHexCoord: [10, 20] },
  }, 'legacy-character-id');

  assert.equal(actor.id, 'legacy-character-id');
  assert.equal(actor.documentType, 'actor');
  assert.equal(actor.type, 'character');
  assert.equal(actor.level, 6);
  assert.equal(actor.runtime.lastResolvedTick, null);
  assert.equal(actor.runtime.availableAtTick, null);
  assert.equal(actor.runtime.activityId, null);
  assert.equal(actor.currentLocation.subHexCoord.length, 2);
  assert.equal(actor.currentLocation.subHexCoord[0], 10);
  assert.equal(actor.currentLocation.subHexCoord[1], 20);
});

test('map normalization preserves current Actor identity and runtime values', () => {
  const MapView = loadMapView();
  const actor = MapView.normalizeCharacterRecord({
    id: 'actor-current',
    documentType: 'actor',
    type: 'character',
    name: 'Current Hero',
    runtime: {
      lastResolvedTick: 120,
      availableAtTick: 144,
      activityId: 'activity-travel-1',
    },
  }, 'firestore-doc-id');

  assert.equal(actor.id, 'actor-current');
  assert.equal(actor.documentType, 'actor');
  assert.equal(actor.type, 'character');
  assert.equal(actor.runtime.lastResolvedTick, 120);
  assert.equal(actor.runtime.availableAtTick, 144);
  assert.equal(actor.runtime.activityId, 'activity-travel-1');
});