import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  importShipDocument, createShipCombatEncounter, advanceShipCombatPhase, enableVectorMovement, commitShipVector, createSequenceDice
} from '../vendor/classic-traveller-rules/index.js';
import { createSceneDocument, placeSceneShip, placeSceneBody, worldBody, removeSceneToken, setSceneGravityBody } from '../src/scene-document.js';
import { spaceSceneCombatPlan, spaceSceneLink, writeSpaceCombatToScene, OWN_SHIP_PARTICIPANT_ID } from '../src/space-scene-combat.js';

function stagedScene() {
  let scene = createSceneDocument({ campaignId: 'sea', name: 'San Telmo Approach', boardKind: 'vector', spanThousandMiles: 400, atmosphere: 6, createdAt: 1 });
  scene = placeSceneBody(scene, worldBody({ name: 'San Telmo', diameter: 8, center: { x: 0, y: 60 } }));
  scene = placeSceneShip(scene, { actorId: 'ship-marisol', side: 'party', x: -60, y: 0, label: 'MARISOL' }).scene;
  scene = placeSceneShip(scene, { actorId: 'design:type-s-scout-courier', side: 'opposition', x: 60, y: 10, label: 'SCOUT' }).scene;
  scene = placeSceneShip(scene, { actorId: 'design:type-s-scout-courier', side: 'opposition', x: 60, y: -10, label: 'SCOUT', velocity: { x: 0, y: 0 } }).scene;
  scene = placeSceneShip(scene, { actorId: 'design:type-a-free-trader', side: 'neutral', x: 0, y: -100, label: 'TRADER' }).scene;
  return scene;
}

test('a staged space scene is the starting conditions for its fight', () => {
  const scene = stagedScene();
  const plan = spaceSceneCombatPlan(scene, { ownShipId: 'ship-marisol', intruder: 'opposition' });
  assert.deepEqual(plan.problems, []);
  assert.equal(plan.ships.length, 3);
  // The campaign's own ship keeps the id the client closes a fight by.
  const own = plan.ships.find((ship) => ship.own);
  assert.equal(own.participantId, OWN_SHIP_PARTICIPANT_ID);
  assert.equal(own.side, 'native');
  assert.deepEqual(own.velocity, scene.tokens[0].velocity);
  // Two scouts from one design are two participants.
  const scouts = plan.ships.filter((ship) => ship.designKey === 'type-s-scout-courier');
  assert.equal(scouts.length, 2);
  assert.notEqual(scouts[0].participantId, scouts[1].participantId);
  assert.ok(scouts.every((ship) => ship.side === 'intruder'));
  assert.deepEqual(scouts[1].velocity, { x: 0, y: 0 });
  assert.deepEqual(scouts[1].position, { x: 60, y: -10 });
  // The neutral trader stays out; the world is the gravity template.
  assert.equal(plan.standingBy.length, 1);
  assert.equal(plan.planet.name, 'San Telmo');
  assert.deepEqual(plan.planet.center, { x: 0, y: 60 });
  assert.equal(plan.atmosphere, 6);

  // The referee may give the party the intruder turn.
  assert.ok(spaceSceneCombatPlan(scene, { ownShipId: 'ship-marisol', intruder: 'party' }).ships.find((ship) => ship.own).side === 'intruder');
});

test('a scene that cannot make a two-sided fight says why', () => {
  const scene = stagedScene();
  // Without the campaign's ship, its token is not something the client can fly.
  assert.match(spaceSceneCombatPlan(scene, { ownShipId: null }).problems.join(), /not a ship this campaign can fly: MARISOL/);
  const partyless = removeSceneToken(scene, scene.tokens[0].id);
  assert.match(spaceSceneCombatPlan(partyless, { ownShipId: 'ship-marisol' }).problems.join(), /no party ship is staged/);
  const grid = createSceneDocument({ campaignId: 'sea', name: 'Alley', squares: 20, createdAt: 1 });
  assert.throws(() => spaceSceneCombatPlan(grid), TypeError);
});

test('the fight runs from the staged vectors and writes its positions back', () => {
  const ship = importShipDocument(JSON.parse(readFileSync(new URL('../examples/Hawkeye.ship.json', import.meta.url))));
  let scene = stagedScene();
  // Clear space for this one, so the arithmetic is plain.
  scene = setSceneGravityBody(scene, null);
  scene = { ...scene, space: { ...scene.space, bodies: [] } };
  const plan = spaceSceneCombatPlan(scene, { ownShipId: 'ship-marisol', intruder: 'opposition' });
  let encounter = createShipCombatEncounter({
    id: 'staged',
    participants: plan.ships.map((staged) => ({
      shipId: staged.participantId, side: staged.side, name: staged.label, ship,
      carriedPrograms: ['maneuver'], loadedPrograms: ['maneuver']
    }))
  });
  encounter = enableVectorMovement(encounter,
    Object.fromEntries(plan.ships.map((staged) => [staged.participantId, { position: staged.position, velocity: staged.velocity }])),
    plan.planet ? { planet: plan.planet } : {});
  encounter = { ...encounter, sceneLink: spaceSceneLink(plan) };

  // The intruder scouts coast on their staged vectors; the link survives the engine.
  const moving = plan.ships.find((staged) => staged.label === 'SCOUT');
  encounter = advanceShipCombatPhase(encounter);
  assert.deepEqual(encounter.sceneLink, spaceSceneLink(plan));
  const expected = { x: moving.position.x + moving.velocity.x, y: moving.position.y + moving.velocity.y };
  assert.deepEqual(encounter.spatial.ships[moving.participantId].position, expected);

  // The native moves too, then the fight is written back.
  while (encounter.phasingSide !== 'native') encounter = advanceShipCombatPhase(encounter);
  encounter = commitShipVector(encounter, OWN_SHIP_PARTICIPANT_ID, { x: 0, y: 2 }, createSequenceDice([6, 6]));
  const result = writeSpaceCombatToScene(scene, encounter, encounter.sceneLink);
  assert.equal(result.written.length, 3);
  const marisol = result.scene.tokens.find((token) => token.id === plan.ships.find((staged) => staged.own).tokenId);
  assert.deepEqual(marisol.position, encounter.spatial.ships.player.position);
  assert.deepEqual(marisol.velocity, encounter.spatial.ships.player.velocity);
  // The neutral trader was never in it and has not moved.
  assert.deepEqual(result.scene.tokens.find((token) => token.label === 'TRADER').position, { x: 0, y: -100 });

  // A token deleted mid-fight is skipped, not recreated; another scene is refused.
  const pruned = removeSceneToken(scene, moving.tokenId);
  assert.equal(writeSpaceCombatToScene(pruned, encounter, encounter.sceneLink).written.length, 2);
  assert.throws(() => writeSpaceCombatToScene({ ...scene, identity: { ...scene.identity, id: 'other' } }, encounter, encounter.sceneLink), /not staged on this scene/);
});
