import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  importShipDocument, createShipCombatEncounter, enableVectorMovement, advanceShipCombatPhase, currentPhase,
  armShipTurret, purchaseOrdnance, creditShipAccount, shipDataCard, commitShipVector, createSequenceDice
} from '../vendor/classic-traveller-rules/index.js';
import { createSceneDocument, placeSceneShip, setSceneTokenSide, setSceneTokenLabel } from '../src/scene-document.js';
import { stagingTokenMenuModel, fightTokenMenuModel, vectorToward, baseShipLabel } from '../src/ship-token-menu.js';
import { dataCardLines } from '../src/ship-data-card-text.js';

const hawkeye = importShipDocument(JSON.parse(readFileSync(new URL('../examples/Hawkeye.ship.json', import.meta.url))));

test('the staging menu: sides, vector targets, and duplicate only for a design', () => {
  let scene = createSceneDocument({ campaignId: 'sea', name: 'Approach', boardKind: 'vector', spanThousandMiles: 400, createdAt: 1 });
  scene = placeSceneShip(scene, { actorId: 'ship-marisol', side: 'party', x: -60, y: 0, label: 'MARISOL' }).scene;
  scene = placeSceneShip(scene, { actorId: 'design:type-s-scout-courier', side: 'opposition', x: 60, y: 0, label: 'SCOUT' }).scene;
  const [own, scout] = scene.tokens;
  const ownMenu = stagingTokenMenuModel(scene, own.id);
  assert.equal(ownMenu.canDuplicate, false);
  assert.deepEqual(ownMenu.sides, ['party', 'opposition', 'neutral']);
  assert.deepEqual(ownMenu.vectorTargets.map((entry) => entry.label), ['SCOUT']);
  assert.equal(stagingTokenMenuModel(scene, scout.id).canDuplicate, true);

  const moved = setSceneTokenLabel(setSceneTokenSide(scene, { tokenId: scout.id, side: 'neutral' }), { tokenId: scout.id, label: '  Picket  ' });
  assert.equal(moved.tokens[1].side, 'neutral');
  assert.equal(moved.tokens[1].label, 'Picket');
  assert.throws(() => setSceneTokenSide(scene, { tokenId: scout.id, side: 'pirates' }), RangeError);

  const toward = vectorToward({ x: 0, y: 0 }, { x: 30, y: 40 }, 6);
  assert.equal(toward.x.toFixed(6), '3.600000');
  assert.equal(toward.y.toFixed(6), '4.800000');
  assert.deepEqual(vectorToward({ x: 1, y: 1 }, { x: 1, y: 1 }, 6), { x: 0, y: 0 });
  assert.equal(baseShipLabel('SCOUT 3'), 'SCOUT');
  assert.equal(baseShipLabel('TYPE S'), 'TYPE S');
});

function armed(id, weapons, { missiles = 0, sand = 0 } = {}) {
  let ship = { ...JSON.parse(JSON.stringify(hawkeye)), identity: { ...hawkeye.identity, id } };
  ship = creditShipAccount(importShipDocument(ship), 10_000_000, { kind: 'capital', description: 'test' });
  weapons.forEach((weapon) => { ship = armShipTurret(ship, { turretId: 'T-1', weapon, pricePerWeaponCr: 0 }).ship; });
  if (missiles || sand) ship = purchaseOrdnance(ship, { missiles, sandCanisters: sand }).ship;
  return ship;
}

function fight() {
  const programs = ['target', 'launch', 'maneuver', 'return-fire'];
  const encounter = createShipCombatEncounter({
    id: 'menu',
    participants: [
      { shipId: 'corsair', side: 'intruder', name: 'Corsair', ship: armed('corsair', ['beam-laser', 'missile-launcher']), carriedPrograms: programs, loadedPrograms: programs, pressurisedSections: [] },
      { shipId: 'marisol', side: 'native', name: 'Marisol', ship: armed('marisol', ['sandcaster']), carriedPrograms: programs, loadedPrograms: programs, pressurisedSections: [] }
    ]
  });
  return enableVectorMovement(encounter, {
    corsair: { position: { x: 0, y: 0 }, velocity: { x: 2, y: 0 } },
    marisol: { position: { x: 160, y: 0 }, velocity: { x: 0, y: 0 } }
  });
}

test('the fight menu offers only what the current phase allows', () => {
  let encounter = fight();
  // Movement: the phasing ship may plot; the other side has nothing to do yet.
  let corsair = fightTokenMenuModel(encounter, 'corsair');
  assert.deepEqual(corsair.movement, { moved: false, surface: false });
  assert.equal(corsair.ranges[0].dm, -2, '160" is past p.30\'s 150"');
  assert.equal(fightTokenMenuModel(encounter, 'marisol').movement, null);
  encounter = commitShipVector(encounter, 'corsair', { x: 0, y: 0 }, createSequenceDice([6, 6]));
  assert.equal(fightTokenMenuModel(encounter, 'corsair').movement.moved, true);

  // Laser fire: only on an enemy token, and only turrets with a laser.
  encounter = advanceShipCombatPhase(encounter);
  assert.equal(currentPhase(encounter).key, 'laser-fire');
  assert.deepEqual(fightTokenMenuModel(encounter, 'marisol').fireAt.map((entry) => [entry.shipId, entry.turretId, entry.blocked]), [['corsair', 'T-1', null]]);
  assert.deepEqual(fightTokenMenuModel(encounter, 'corsair').fireAt, []);

  // Ordnance: a missile rack on the enemy's token, sand on the acting ship's own.
  while (currentPhase(encounter).key !== 'ordnance-launch') encounter = advanceShipCombatPhase(encounter);
  const launch = fightTokenMenuModel(encounter, 'marisol').launchAt;
  assert.equal(launch.length, 1);
  assert.equal(launch[0].launcherId, 'T-1:2');
  assert.match(launch[0].blocked, /Empty/, 'no missiles bought, so the rack is empty and says so');
  assert.deepEqual(fightTokenMenuModel(encounter, 'corsair').castSand, [], 'the Corsair has no sandcaster');
});

test('the data card reads as Book 2 p.24 lays it out', () => {
  const encounter = fight();
  const lines = dataCardLines(shipDataCard(encounter.participants[0]));
  assert.match(lines[0], /^Corsair \(Type S\)/);
  assert.match(lines[1], /^1\. M-Drive \(A \/ G-2\)\s+Model\/1$/);
  assert.ok(lines.some((line) => /^6\. Bridge \(Pilot-\d\)/.test(line)));
  assert.ok(lines.some((line) => /^T-1 \(B, M\) Gunner-0/.test(line)));
});
