// scene-staging.test.mjs — creating a vector-board scene, staging ships on
// it through scene:stage-ship/-unstage-ship, and starting a vector fight
// from it, all through the real session.run()/view() API.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { createPlaySession } from '../src/play-session.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'Sea-of-Suns-v0.11.2-buggy.campaign.json');

async function freshSession() {
  const bundle = JSON.parse(await readFile(fixture, 'utf8'));
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(bundle);
  return { session: createPlaySession({ registry, campaignId: campaign.identity.id, subsector: FAR_MERIDIAN_SUBSECTOR }), registry, campaignId: campaign.identity.id };
}

function scenesTab(session, stagingSceneId = null) {
  return session.view({ referee: { tab: 'Scenes', stagingSceneId } }).referee;
}

test('scene:create with boardKind vector makes a space scene; without it, a grid scene', async () => {
  const { session } = await freshSession();
  const created = session.run('scene:create', { fight: { value: { name: 'Aster Approach', boardKind: 'vector' } } });
  assert.equal(created.ok, true, created.message);
  const spaceEntry = scenesTab(session).shown.find((entry) => entry.name === 'Aster Approach');
  assert.ok(spaceEntry);
  assert.equal(spaceEntry.isVectorBoard, true);
  assert.match(spaceEntry.note, /^space,/);

  const gridResult = session.run('scene:create', { fight: { value: { name: 'The Bridge Deck' } } });
  assert.equal(gridResult.ok, true);
  const gridEntry = scenesTab(session).shown.find((entry) => entry.name === 'The Bridge Deck');
  assert.equal(gridEntry.isVectorBoard, false);
});

test('staging: the ship picker offers the campaign\u2019s own ship and every standard design', async () => {
  const { session } = await freshSession();
  session.run('scene:create', { fight: { value: { name: 'Space', boardKind: 'vector' } } });
  const sceneId = scenesTab(session).shown.find((entry) => entry.name === 'Space').id;

  const staging = scenesTab(session, sceneId).staging;
  assert.ok(staging, 'staging is built when a scene is being staged');
  assert.equal(staging.tokens.length, 0);
  assert.equal(staging.canStart, false);
  assert.match(staging.blockedReason, /no party ship is staged/);
  assert.ok(staging.choices.some((choice) => choice.note.includes('your ship')), 'the campaign\u2019s own ship is offered');
  assert.ok(staging.choices.some((choice) => choice.actorId === 'design:type-s-scout-courier'), 'a standard design is offered');
});

test('stage-ship places a ship; the own ship drops off the list, a design stays offered', async () => {
  const { session, registry, campaignId } = await freshSession();
  session.run('scene:create', { fight: { value: { name: 'Space', boardKind: 'vector' } } });
  const sceneId = scenesTab(session).shown.find((entry) => entry.name === 'Space').id;
  const ownShipId = registry.resolveCampaign(campaignId).ships[0].identity.id;

  const staged = session.run('scene:stage-ship', { fight: { id: sceneId, value: { actorId: ownShipId, side: 'party', x: -20, y: 0, label: 'Marisol' } } });
  assert.equal(staged.ok, true, staged.message);

  let staging = scenesTab(session, sceneId).staging;
  assert.equal(staging.tokens.length, 1);
  assert.deepEqual(staging.tokens[0], { id: staging.tokens[0].id, label: 'Marisol', side: 'party', position: { x: -20, y: 0 }, velocity: staging.tokens[0].velocity });
  assert.equal(staging.choices.some((choice) => choice.actorId === ownShipId), false, 'the own ship is a single hull and leaves the list once staged');
  assert.ok(staging.choices.some((choice) => choice.actorId === 'design:type-s-scout-courier'), 'a design reference stays offered for a second hull of the same type');
  assert.match(staging.blockedReason, /no opposition ship is staged/);

  const second = session.run('scene:stage-ship', { fight: { id: sceneId, value: { actorId: 'design:type-s-scout-courier', side: 'opposition', x: 20, y: 0, label: 'Corsair' } } });
  assert.equal(second.ok, true, second.message);
  staging = scenesTab(session, sceneId).staging;
  assert.equal(staging.tokens.length, 2);
  assert.equal(staging.canStart, true);
  assert.equal(staging.blockedReason, null);

  // unstage-ship removes it and the block reappears.
  const tokenId = staging.tokens.find((token) => token.side === 'opposition').id;
  const removed = session.run('scene:unstage-ship', { fight: { id: sceneId, value: tokenId } });
  assert.equal(removed.ok, true, removed.message);
  staging = scenesTab(session, sceneId).staging;
  assert.equal(staging.tokens.length, 1);
  assert.equal(staging.canStart, false);
});

test('the full flow: create, stage both sides, start combat, and the fight is real vector combat', async () => {
  const { session, registry, campaignId } = await freshSession();
  session.run('scene:create', { fight: { value: { name: 'Space', boardKind: 'vector' } } });
  const sceneId = scenesTab(session).shown.find((entry) => entry.name === 'Space').id;
  const ownShipId = registry.resolveCampaign(campaignId).ships[0].identity.id;

  session.run('scene:stage-ship', { fight: { id: sceneId, value: { actorId: ownShipId, side: 'party', x: -20, y: 0, label: 'Marisol' } } });
  session.run('scene:stage-ship', { fight: { id: sceneId, value: { actorId: 'design:type-s-scout-courier', side: 'opposition', x: 20, y: 0, label: 'Corsair' } } });
  // scene:create above made this scene active by default (the campaign's
  // first scene) — shipfight:vector-start defaults to the active scene, so
  // no sceneId needs to be passed here, matching how the referee's own
  // Start Combat button in the staging panel calls it.
  const started = session.run('shipfight:vector-start', { fight: { intruder: 'party' } });
  assert.equal(started.ok, true, started.message);

  const shipFight = session.view().shipFight;
  assert.equal(shipFight.spatialMode, 'vector');
  assert.equal(shipFight.vector.awaitingMovement, true, 'the party staged as intruder, so the player\u2019s ship moves first');
});
