// vector-fight-view.test.mjs — the vector-mode ship fight's plot and thrust
// form (client/vector-fight-view.js), and the play-session.js view-state
// (shipFight.vector) it is drawn from.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { createPlaySession } from '../src/play-session.js';
import { createSceneDocument, placeSceneShip } from '../src/scene-document.js';
import { addSceneToCampaign, setActiveCampaignScene } from '../src/campaign-document.js';
import { createShipDocument, armShipTurret } from '../vendor/classic-traveller-rules/index.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';
import { renderVectorFight } from '../client/vector-fight-view.js';
import { renderScene } from '../client/play-views.js';

let JSDOM; try { ({ JSDOM } = await import('jsdom')); } catch { /* layout tests skip, this one needs the DOM only */ }

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'Sea-of-Suns-v0.11.2-buggy.campaign.json');

async function stagedVectorFight({ intruder = 'party' } = {}) {
  const bundle = JSON.parse(await readFile(fixture, 'utf8'));
  bundle.campaign.location = { systemId: 'aster', systemName: 'Aster', worldId: 'aster-main', worldName: 'Aster' };
  const old = bundle.documents.ships[0];
  let ship = createShipDocument({
    designKey: 'type-s-scout-courier', id: old.identity.id, name: 'Marisol', registry: 'A-1', authority: old.authority,
    crewAssignments: [{ role: 'pilot', characterId: 'char-04164baa70c3b5a6', characterName: 'Hawkeye' }],
    state: { currentFuelTons: 40 }
  });
  ship = armShipTurret(ship, { turretId: ship.specifications.armament.turrets[0].id, weapon: 'beam-laser', pricePerWeaponCr: 0 }).ship;
  bundle.documents.ships[0] = ship;

  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(bundle);

  let scene = createSceneDocument({ id: 'scene-space-verify', campaignId: campaign.identity.id, name: 'Verify Space', boardKind: 'vector', spanThousandMiles: 400 });
  scene = placeSceneShip(scene, { actorId: ship.identity.id, side: 'party', x: -20, y: 0, velocity: { x: 2, y: 0 }, label: 'Marisol' }).scene;
  scene = placeSceneShip(scene, { actorId: 'design:type-s-scout-courier', side: 'opposition', x: 20, y: 0, velocity: { x: -2, y: 0 }, label: 'Corsair' }).scene;
  registry.put(scene);

  let updatedCampaign = addSceneToCampaign(registry.resolveCampaign(campaign.identity.id).campaign, scene, { makeActive: false });
  updatedCampaign = setActiveCampaignScene(updatedCampaign, scene.identity.id);
  registry.put(updatedCampaign);

  const session = createPlaySession({ registry, campaignId: campaign.identity.id, subsector: FAR_MERIDIAN_SUBSECTOR });
  session.run('shipfight:vector-start', { fight: { intruder, pressurised: true } });
  return session;
}

test('shipFight.vector is well-shaped when the player is phasing (intruder)', async () => {
  const session = await stagedVectorFight({ intruder: 'party' });
  const view = session.view();
  assert.equal(view.shipFight.spatialMode, 'vector');
  const v = view.shipFight.vector;
  assert.equal(v.awaitingMovement, true, 'the intruder moves first (p.23), and the player is the intruder here');
  assert.deepEqual(v.player.position, { x: -20, y: 0 });
  assert.deepEqual(v.player.velocity, { x: 2, y: 0 });
  assert.equal(v.player.maxG, 2, 'a Type S Scout/Courier carries a 2G maneuver drive');
  assert.equal(v.opponent.name, 'Corsair');
  assert.ok(v.range.distance > 0);
  assert.equal(view.shipFight.actions.length, 0, 'the vector view replaces the generic fire/hold/flee row entirely');
});

test('shipFight.vector says the player cannot act when the native side is phasing', async () => {
  const session = await stagedVectorFight({ intruder: 'opposition' });
  const v = session.view().shipFight.vector;
  assert.equal(v.awaitingMovement, false, 'the opposition is the intruder here, so it moves first, not the player');
  assert.equal(v.phasingSide, 'intruder');
  assert.equal(v.playerSide, 'native');
});

test('renderVectorFight draws the plotting form when awaiting the player\u2019s move, and wires thrust/commit/coast', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  const session = await stagedVectorFight({ intruder: 'party' });
  const shipFight = session.view().shipFight;

  const events = { thrust: null, committed: null, coasted: false };
  const handlers = {
    onThrustChange: (next) => { events.thrust = next; },
    onCommit: (acceleration) => { events.committed = acceleration; },
    onCoast: () => { events.coasted = true; }
  };
  const root = renderVectorFight(shipFight, handlers);
  document.querySelector('main').append(root);

  // Both ships are drawn, correctly side-classed.
  assert.equal(document.querySelectorAll('.vfv-ship').length, 2);
  assert.ok(document.querySelector('.vfv-ship.is-player.vfv-side-intruder'), 'the player ship is drawn as the intruder, matching the started fight');
  assert.ok(document.querySelector('.vfv-ship.vfv-side-native'), 'the opponent is drawn as the native side');

  // The status line states velocity, range and turn/phase in Book 2's own notation.
  assert.match(document.querySelector('.vfv-status').textContent, /VEL 2\.0" @ 090\u00b0/);
  assert.match(document.querySelector('.vfv-status').textContent, /RANGE 40\.0"/);
  assert.match(document.querySelector('.vfv-status').textContent, /TURN 1/);

  // Typing thrust reaches the handler with the other axis preserved.
  const [xField, yField] = document.querySelectorAll('.vfv-thrust input[type="number"]');
  xField.value = '1.5';
  xField.dispatchEvent(new dom.window.Event('input'));
  assert.deepEqual(events.thrust, { x: 1.5, y: 0 });

  // Commit passes the exact thrust object typed, not a re-derived one.
  document.querySelector('.vfv-thrust-actions button.is-primary').click();
  assert.deepEqual(events.committed, { x: 1.5, y: 0 }, 'v0.247.0: the form holds what was typed without waiting on a re-render');
  assert.match(document.querySelector('.vfv-g-readout').textContent, /0\.75 G of 2 G/, 'the readout repaints in place');

  // Coast is offered as a separate, always-available action.
  document.querySelector('.vfv-thrust-actions button:not(.is-primary)').click();
  assert.equal(events.coasted, true);

  dom.window.close();
  delete globalThis.document;
});

test('renderVectorFight offers Advance, not a thrust form, when the player cannot act', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  const session = await stagedVectorFight({ intruder: 'opposition' });
  const shipFight = session.view().shipFight;

  const events = { advanced: false };
  const root = renderVectorFight(shipFight, { onAdvance: () => { events.advanced = true; } });
  document.querySelector('main').append(root);

  assert.equal(document.querySelector('.vfv-thrust'), null, 'no thrust form when it is not the player\u2019s movement phase');
  const advanceButton = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Advance');
  assert.ok(advanceButton);
  advanceButton.click();
  assert.equal(events.advanced, true);

  dom.window.close();
  delete globalThis.document;
});

test('renderVectorFight offers Fire lasers when awaiting the player\u2019s fire decision, wired to onFire', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  const session = await stagedVectorFight({ intruder: 'party' });
  session.run('shipfight:vector-coast', { fight: { shipId: 'player' } });
  session.run('shipfight:vector-advance'); // -> laser-fire, player's turn
  const shipFight = session.view().shipFight;
  assert.equal(shipFight.vector.awaitingFireDecision, true);

  const events = { fired: false, advanced: false };
  const root = renderVectorFight(shipFight, { onFire: () => { events.fired = true; }, onAdvance: () => { events.advanced = true; } });
  document.querySelector('main').append(root);

  const fireButton = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Fire lasers');
  assert.ok(fireButton, 'a Fire lasers button is offered');
  fireButton.click();
  assert.equal(events.fired, true);

  // Advance is still offered alongside it \u2014 firing doesn't end the phase.
  const advanceButton = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Advance');
  assert.ok(advanceButton);
  advanceButton.click();
  assert.equal(events.advanced, true);

  dom.window.close();
  delete globalThis.document;
});

test('a vector fight with no log yet renders nothing literal for the empty log \u2014 not the text "null"', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  const session = await stagedVectorFight({ intruder: 'party' });
  const state = { ...session.view(), live: true };
  assert.equal(state.shipFight.log.length, 0, 'a freshly started fight has nothing logged yet \u2014 the exact case that exposed this');

  const nodes = renderScene(state, {});
  const main = document.querySelector('main');
  main.replaceChildren(...nodes);
  assert.doesNotMatch(main.textContent, /\bnull\b/, 'no array entry reached replaceChildren as a bare null, which the DOM stringifies to "null"');

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Node;
});

test('ship labels get an explicit font-size scaled to the plot, not the SVG default', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  const session = await stagedVectorFight({ intruder: 'party' });
  const shipFight = session.view().shipFight;
  const root = renderVectorFight(shipFight, {});
  document.querySelector('main').append(root);

  const labels = [...document.querySelectorAll('.vfv-label')];
  assert.equal(labels.length, 2);
  for (const label of labels) {
    const size = Number(label.getAttribute('font-size'));
    assert.ok(Number.isFinite(size) && size > 0, 'font-size is set and a real number, not left to the SVG default');
    // The plot here spans 40 units (ships 40" apart, per stagedVectorFight's
    // own fixture); a label anywhere near the SVG default of 16 would be
    // almost half the width of the entire plot, which is the bug a real
    // screenshot caught (two overlapping default-sized labels reading as
    // one mangled word). A real label should be a small fraction of that.
    assert.ok(size < 5, `font-size ${size} is not scaled down from the SVG default for this plot`);
  }

  dom.window.close();
  delete globalThis.document;
});

test('a full round of vector combat, through the real session: move, fire, the opponent\u2019s own shot resolves on Advance, return fire is available', async () => {
  const session = await stagedVectorFight({ intruder: 'party' });

  // Movement phase: coast (no maneuver program loaded on this fixture ship).
  let result = session.run('shipfight:vector-coast', { fight: { shipId: 'player' } });
  assert.equal(result.ok, true, result.message);

  // Laser-fire phase (intruder = player): the player may fire.
  result = session.run('shipfight:vector-advance');
  assert.equal(result.ok, true, result.message);
  let view = session.view();
  assert.equal(view.shipFight.vector.phaseKey, 'laser-fire');
  assert.equal(view.shipFight.vector.awaitingFireDecision, true);
  assert.equal(view.shipFight.vector.canFire, true, 'the fixture ship carries an armed turret');

  const fired = session.run('shipfight:vector-fire');
  assert.equal(fired.ok, true, fired.message);
  assert.ok(fired.message.length > 0, 'a real shot is narrated one way or another');

  // A second shot this same phase isn't refused — the engine narrates it as
  // a no-op instead (the turret already fired), matching how resolveLaserFire
  // handles this generally rather than a check this command adds itself.
  //
  // Only when there is still a fight: the shot above is a real 2D throw, and
  // a hit that disables the foe ends it, at which point firing again is
  // rightly refused. Asserting through that was a real flake, roughly one
  // run in ten.
  if (session.view().shipFight.outcome === 'in-progress') {
    const secondShot = session.run('shipfight:vector-fire');
    assert.equal(secondShot.ok, true, secondShot.message);
    assert.match(secondShot.message, /already fired this phase/);
  }

  // Return-fire phase (opposing = native = the opponent): advancing resolves
  // the opponent's own shot automatically, without a player command for it.
  if (session.view().shipFight.outcome !== 'in-progress') return;
  result = session.run('shipfight:vector-advance');
  assert.equal(result.ok, true, result.message);
  view = session.view();
  if (view.shipFight.outcome === 'in-progress') {
    assert.equal(view.shipFight.vector.phaseKey, 'return-fire');
  }
});

test('firing outside laser-fire/return-fire, or on the wrong side\u2019s phase, is refused by name', async () => {
  const session = await stagedVectorFight({ intruder: 'party' });
  // Still in the movement phase.
  const duringMovement = session.run('shipfight:vector-fire');
  assert.equal(duringMovement.ok, false);
  assert.match(duringMovement.message, /weapons do not fire during Movement/);

  session.run('shipfight:vector-coast', { fight: { shipId: 'player' } });
  session.run('shipfight:vector-advance'); // -> laser-fire, player's turn to fire
  session.run('shipfight:vector-advance'); // -> return-fire, opponent's own shot auto-resolves
  session.run('shipfight:vector-advance'); // -> ordnance-launch (phasing side, player)
  // Now it should be ordnance-launch — not a fire phase.
  const view = session.view();
  if (view.shipFight.outcome === 'in-progress') {
    assert.equal(view.shipFight.vector.phaseKey, 'ordnance-launch');
    const duringOrdnance = session.run('shipfight:vector-fire');
    assert.equal(duringOrdnance.ok, false);
    assert.match(duringOrdnance.message, /weapons do not fire during Ordnance Launch/);
  }
});

test('a full movement phase, through the real session and the real render, moves the ship and unblocks Advance', async () => {
  const session = await stagedVectorFight({ intruder: 'party' });
  let shipFight = session.view().shipFight;
  assert.equal(shipFight.vector.awaitingMovement, true);

  const coast = session.run('shipfight:vector-coast', { fight: { shipId: 'player' } });
  assert.equal(coast.ok, true, coast.message);

  shipFight = session.view().shipFight;
  assert.equal(shipFight.vector.awaitingMovement, false, 'the player ship has moved this turn now');
  assert.deepEqual(shipFight.vector.player.position, { x: -18, y: 0 }, 'coasting on {x:2,y:0} velocity for one turn from x:-20');

  const advance = session.run('shipfight:vector-advance');
  assert.equal(advance.ok, true, advance.message);
  assert.match(advance.message, /Laser Fire/);
});


// ---------------------------------------------------------------------------
// v0.246.0: what a real browser showed and jsdom could not.
// ---------------------------------------------------------------------------

test('v0.246.0 every vfv- class the plot draws with has a rule in play.css', async () => {
  const view = await readFile(new URL('../client/vector-fight-view.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../client/play.css', import.meta.url), 'utf8');
  const used = new Set([...view.matchAll(/vfv-[a-z-]+[a-z]/g)].map((match) => match[0]).filter((name) => !name.endsWith('-side')));
  const unstyled = [...used].filter((name) => !['vfv-side-intruder', 'vfv-side-native', 'vfv-side-third', 'vfv-empty', 'vfv-ship'].includes(name) && !css.includes(`.${name}`));
  assert.deepEqual(unstyled, [], 'an SVG line with no stroke is invisible; v0.241-v0.245 shipped with no vfv- rule at all');
  assert.match(css, /\.vfv-vector \{[^}]*stroke:/, 'the velocity vector has a stroke');
});

test('v0.246.0 the plot is y-up, like the staging board and its own bearing readout', { skip: !JSDOM }, async () => {
  const session = await stagedVectorFight({ intruder: 'party' });
  const dom = new JSDOM('<!doctype html><body></body>');
  globalThis.document = dom.window.document;
  const shipFight = session.view().shipFight;
  shipFight.vector.opponent.position = { x: 20, y: 10 };
  const root = renderVectorFight(shipFight, {});
  const tokens = [...root.querySelectorAll('.vfv-token')];
  assert.equal(Number(tokens[1].getAttribute('cy')), -10, 'a ship at +10 is drawn above the origin, not below it');
});

test('v0.246.0 the default combat loadout is p.31\u2019s own six, Maneuver included, so a vector fight can thrust', async () => {
  const { shipCombatLoadout } = await import('../src/ship-arrival-combat.js');
  const session = await stagedVectorFight({ intruder: 'party' });
  const loadout = shipCombatLoadout(session.resolved.ships[0]);
  assert.ok(loadout.loaded.includes('maneuver'), 'Book 2 p.32: Maneuver is required to allow the use of Maneuver drive');
  assert.ok(loadout.carried.includes('launch'));
  const moved = session.run('shipfight:vector-move', { fight: { shipId: 'player', acceleration: { x: 2, y: 2 } } });
  assert.equal(moved.ok, true, moved.message);
});

test('v0.246.0 Fire lasers is offered once: the view asks the engine, and a spent turret is not offered again', async () => {
  const session = await stagedVectorFight({ intruder: 'party' });
  session.run('shipfight:vector-coast', { fight: { shipId: 'player' } });
  session.run('shipfight:vector-advance');
  assert.equal(session.view().shipFight.vector.canFire, true);
  session.run('shipfight:vector-fire');
  const after = session.view().shipFight.vector;
  if (session.view().shipFight.outcome === 'in-progress') {
    assert.equal(after.canFire, false);
    assert.equal(after.hasFired, true);
  }
});
