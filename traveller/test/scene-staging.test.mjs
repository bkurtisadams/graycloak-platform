// scene-staging.test.mjs — creating a vector-board scene, staging ships on
// it through scene:stage-ship/-unstage-ship, and starting a vector fight
// from it, all through the real session.run()/view() API.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { createPlaySession, vectorFromSpeedBearing } from '../src/play-session.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';
import { renderDrawer, renderNow, renderScene } from '../client/play-views.js';

let JSDOM; try { ({ JSDOM } = await import('jsdom')); } catch { /* skip the render test if unavailable */ }

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'Sea-of-Suns-v0.11.2-buggy.campaign.json');

async function freshSession() {
  const bundle = JSON.parse(await readFile(fixture, 'utf8'));
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(bundle);
  return { session: createPlaySession({ registry, campaignId: campaign.identity.id, subsector: FAR_MERIDIAN_SUBSECTOR }), registry, campaignId: campaign.identity.id };
}

function scenesTab(session, stagingSceneId = null) {
  // v0.246.0: staging took over the screen, so the staging view arrives at
  // the top of the view state rather than inside the Scenes tab. The tab
  // itself still says which scene is being staged, for its own button.
  const state = session.view({ referee: { tab: 'Scenes', stagingSceneId }, staging: stagingSceneId ? { sceneId: stagingSceneId } : null });
  return { ...state.referee, staging: state.staging ?? null };
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
  const marisol = staging.tokens[0];
  assert.equal(marisol.label, 'Marisol');
  assert.equal(marisol.side, 'party');
  assert.deepEqual(marisol.position, { x: -20, y: 0 });
  assert.match(marisol.hull, /your ship/);
  assert.equal(typeof marisol.controller, 'string');
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

test('update-ship moves a staged token and changes its side, live', async () => {
  const { session, registry, campaignId } = await freshSession();
  session.run('scene:create', { fight: { value: { name: 'Space', boardKind: 'vector' } } });
  const sceneId = scenesTab(session).shown.find((entry) => entry.name === 'Space').id;
  const ownShipId = registry.resolveCampaign(campaignId).ships[0].identity.id;
  session.run('scene:stage-ship', { fight: { id: sceneId, value: { actorId: ownShipId, side: 'party', x: -20, y: 0, label: 'Marisol' } } });
  const tokenId = scenesTab(session, sceneId).staging.tokens[0].id;

  const moved = session.run('scene:update-ship', { fight: { id: sceneId, value: { tokenId, x: -100, y: 40 } } });
  assert.equal(moved.ok, true, moved.message);
  let staging = scenesTab(session, sceneId).staging;
  assert.deepEqual(staging.tokens[0].position, { x: -100, y: 40 });
  assert.equal(staging.tokens[0].side, 'party', 'moving does not touch the side');

  const resided = session.run('scene:update-ship', { fight: { id: sceneId, value: { tokenId, side: 'opposition' } } });
  assert.equal(resided.ok, true, resided.message);
  staging = scenesTab(session, sceneId).staging;
  assert.equal(staging.tokens[0].side, 'opposition');
  assert.deepEqual(staging.tokens[0].position, { x: -100, y: 40 }, 'changing side does not touch position');
});

test('set-ship-vector and the body commands back the staging board\u2019s drag callbacks', async () => {
  const { session, registry, campaignId } = await freshSession();
  session.run('scene:create', { fight: { value: { name: 'Space', boardKind: 'vector' } } });
  const sceneId = scenesTab(session).shown.find((entry) => entry.name === 'Space').id;
  const ownShipId = registry.resolveCampaign(campaignId).ships[0].identity.id;
  session.run('scene:stage-ship', { fight: { id: sceneId, value: { actorId: ownShipId, side: 'party', x: -20, y: 0, label: 'Marisol' } } });
  const tokenId = scenesTab(session, sceneId).staging.tokens[0].id;

  // Dragging the velocity arrow.
  const vector = session.run('scene:set-ship-vector', { fight: { id: sceneId, value: { tokenId, velocity: { x: 4, y: -3 } } } });
  assert.equal(vector.ok, true, vector.message);
  assert.deepEqual(scenesTab(session, sceneId).staging.tokens[0].velocity, { x: 4, y: -3 });

  // Placing a world, dragging it, removing it.
  const placed = session.run('scene:place-body', { fight: { id: sceneId, value: { kind: 'world', name: 'San Telmo', diameter: 8, densityEarth: 1, center: { x: 0, y: 0 } } } });
  assert.equal(placed.ok, true, placed.message);
  let staging = scenesTab(session, sceneId).staging;
  assert.equal(staging.bodies.length, 1);
  assert.equal(staging.bodies[0].name, 'San Telmo');
  // Book 2 p.28: one world samples gravity — the first placed takes that role.
  assert.equal(staging.scene.space.gravityBodyId, staging.bodies[0].id);
  // Book 2 p.27: the template's quarter-G bands are computed, not supplied.
  assert.ok(staging.bodies[0].template.bands.length > 0, 'the p.27 band template was built for it');

  const bodyId = staging.bodies[0].id;
  const moved = session.run('scene:move-body', { fight: { id: sceneId, value: { bodyId, x: 30, y: 12 } } });
  assert.equal(moved.ok, true, moved.message);
  assert.deepEqual(scenesTab(session, sceneId).staging.bodies[0].center, { x: 30, y: 12 });

  const removed = session.run('scene:remove-body', { fight: { id: sceneId, value: bodyId } });
  assert.equal(removed.ok, true, removed.message);
  assert.equal(scenesTab(session, sceneId).staging.bodies.length, 0);
});

test('the real staging board mounts into the panel and its callbacks reach the real commands', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;
  // No queueMicrotask override: jsdom's own delegates back to the global,
  // so reassigning it recurses infinitely. Node's native one is fine here —
  // stageHost only needs the mount deferred past the current task.

  const { session, registry, campaignId } = await freshSession();
  session.run('scene:create', { fight: { value: { name: 'Space', boardKind: 'vector' } } });
  const sceneId = scenesTab(session).shown.find((entry) => entry.name === 'Space').id;
  const ownShipId = registry.resolveCampaign(campaignId).ships[0].identity.id;
  session.run('scene:stage-ship', { fight: { id: sceneId, value: { actorId: ownShipId, side: 'party', x: -20, y: 0, label: 'Marisol' } } });

  // v0.246.0: the board is the scene column now, not a drawer row.
  const view = session.view({ referee: { tab: 'Scenes', stagingSceneId: sceneId }, staging: { sceneId } });
  const nodes = renderScene({ ...view, live: true }, {
    onUpdateStagedShip: (tokenId, patch) => session.run('scene:update-ship', { fight: { id: sceneId, value: { tokenId, ...patch } } }),
    onSetShipVector: (tokenId, velocity) => session.run('scene:set-ship-vector', { fight: { id: sceneId, value: { tokenId, velocity } } }),
    onSceneBody: (action, value) => session.run(`scene:${action}-body`, { fight: { id: sceneId, value } })
  });
  document.querySelector('main').replaceChildren(...nodes);
  // stageHost defers the mount to a microtask (the host must be in the
  // document first, for ship-vector-map.js's own layout maths).
  await new Promise((resolve) => setTimeout(resolve, 0));

  const board = document.querySelector('.staging-board #ship-vector-workspace');
  assert.ok(board, 'the real staging board mounted inside the panel');
  assert.ok(board.querySelector('svg.ship-vector-svg'), 'it drew its board SVG');
  assert.ok(board.querySelector('.vector-ship-token'), 'the staged ship is drawn on it');

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Node;
  delete globalThis.Option;
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

test('v0.246.0 the staging column draws a card per staged ship, live-editable through the real handlers', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;

  const { session, registry, campaignId } = await freshSession();
  session.run('scene:create', { fight: { value: { name: 'Space', boardKind: 'vector' } } });
  const sceneId = scenesTab(session).shown.find((entry) => entry.name === 'Space').id;
  const ownShipId = registry.resolveCampaign(campaignId).ships[0].identity.id;
  session.run('scene:stage-ship', { fight: { id: sceneId, value: { actorId: ownShipId, side: 'party', x: -20, y: 0, label: 'Marisol' } } });

  const stateOf = () => session.view({ referee: { tab: 'Scenes', stagingSceneId: sceneId }, staging: { sceneId } });
  const nodes = renderNow({ ...stateOf(), live: true }, {
    onUpdateStagedShip: (tokenId, patch) => session.run('scene:update-ship', { fight: { id: sceneId, value: { tokenId, ...patch } } }),
    onSetShipVector: (tokenId, velocity) => session.run('scene:set-ship-vector', { fight: { id: sceneId, value: { tokenId, velocity: vectorFromSpeedBearing(velocity.speed, velocity.bearing) } } }),
    onUnstageShip: (tokenId) => session.run('scene:unstage-ship', { fight: { id: sceneId, value: tokenId } })
  });
  document.querySelector('main').replaceChildren(...nodes);

  const card = document.querySelector('.staged-ship');
  assert.ok(card, 'one card is drawn');
  assert.equal(card.querySelector('.staged-name').textContent, 'Marisol');
  assert.match(card.querySelector('.staged-hull').textContent, /your ship/);
  assert.equal(card.querySelectorAll('.staged-row').length, 4, 'side, flown-by, position and vector rows');

  const xInput = card.querySelector('input[aria-label$="X position"]');
  xInput.value = '-150';
  xInput.dispatchEvent(new dom.window.Event('change'));
  assert.equal(stateOf().staging.tokens[0].position.x, -150);

  // Book 2 p.25: the referee states a vector as a length and a direction,
  // and it reaches the scene as the x/y pair the engine keeps.
  const speed = document.querySelector('input[aria-label$="speed in inches per turn"]');
  speed.value = '6';
  speed.dispatchEvent(new dom.window.Event('change'));
  const bearing = document.querySelector('input[aria-label$="bearing in degrees"]');
  bearing.value = '90';
  bearing.dispatchEvent(new dom.window.Event('change'));
  const staged = stateOf().staging.tokens[0];
  assert.equal(Math.round(staged.velocity.x), 6, '090\u00b0 is +x');
  assert.equal(Math.round(staged.velocity.y), 0);
  assert.equal(staged.bearing, 90);

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Node;
});


test('v0.246.1 staging takes the screen: the board is the scene, the checklist is the now column, and the drawer is not involved', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;

  const { session, registry, campaignId } = await freshSession();
  session.run('scene:create', { fight: { value: { name: 'Space', boardKind: 'vector' } } });
  const sceneId = scenesTab(session).shown.find((entry) => entry.name === 'Space').id;
  const ownShipId = registry.resolveCampaign(campaignId).ships[0].identity.id;
  session.run('scene:stage-ship', { fight: { id: sceneId, value: { actorId: ownShipId, side: 'party', x: -30, y: 0, label: 'Marisol' } } });
  session.run('scene:stage-ship', { fight: { id: sceneId, value: { actorId: 'design:type-s-scout-courier', side: 'opposition', x: 30, y: 0, label: 'Corsair' } } });

  const state = { ...session.view({ referee: { tab: 'Scenes', stagingSceneId: sceneId }, staging: { sceneId, intruder: 'party', pressurised: true } }), live: true };
  assert.equal(state.situation.kind, 'staging', 'staging is the situation, so the shell gives it the screen');
  assert.equal(state.staging.intruder, 'party');
  assert.equal(state.staging.pressurised, true);
  // Book 2 p.30's own bands, so a staged position can be judged before the
  // first shot rather than after it.
  assert.equal(Math.round(state.staging.opening.distance), 60);
  assert.equal(state.staging.opening.dm, 0);

  document.querySelector('main').replaceChildren(...renderNow(state, {}));
  const headings = [...document.querySelectorAll('.staging-step h2')].map((node) => node.textContent);
  assert.deepEqual(headings, ['1. Ships', '2. World', '3. Intruder', '4. Pressure'], 'the whole of p.24 setup is one checklist');
  assert.equal(document.querySelectorAll('.staged-ship').length, 2);
  const start = [...document.querySelectorAll('button')].filter((node) => node.textContent === 'Start combat');
  assert.equal(start.length, 1, 'one Start combat, not the board\u2019s copy as well');
  assert.equal(start[0].disabled, false, 'both sides are staged');

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Node;
  delete globalThis.Option;
});

test('v0.246.1 a world placed on the scene is described by the checklist, with the atmosphere p.35 braking reads', async () => {
  const { session } = await freshSession();
  session.run('scene:create', { fight: { value: { name: 'Space', boardKind: 'vector' } } });
  const sceneId = scenesTab(session).shown.find((entry) => entry.name === 'Space').id;
  const stagingOf = () => session.view({ staging: { sceneId } }).staging;
  assert.equal(stagingOf().world, null, 'clear space until a world is placed');

  session.run('scene:place-body', { fight: { id: sceneId, value: { kind: 'world', name: 'Cinder', diameter: 8, densityEarth: 1, center: { x: 0, y: 0 } } } });
  assert.equal(stagingOf().world.name, 'Cinder');

  const set = session.run('scene:atmosphere', { fight: { id: sceneId, value: 6 } });
  assert.equal(set.ok, true, set.message);
  assert.equal(stagingOf().atmosphere, 6);
  session.run('scene:atmosphere', { fight: { id: sceneId, value: null } });
  assert.equal(stagingOf().atmosphere, null);
});
