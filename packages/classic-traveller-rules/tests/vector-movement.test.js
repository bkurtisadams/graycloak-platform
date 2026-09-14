import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importCharacterDocument, createTypeSScoutReserveShipForCharacter, createShipCombatEncounter, advanceShipCombatPhase, createSequenceDice } from '../index.js';
import {enableVectorMovement,previewShipVector,commitShipVector,vectorRangeDM} from '../src/starships/vector-movement.js';
import {
  createPlanet,
  moveWithGravity,
  applyAtmosphericBraking,
  atmosphereBrakes,
  ATMOSPHERIC_BRAKING_BAND
} from '../src/starships/planetary-gravity.js';
function fixture(){const ch=importCharacterDocument(JSON.parse(readFileSync(new URL('./fixtures/Hawkeye-v0.6.character.json',import.meta.url))));const {ship}=createTypeSScoutReserveShipForCharacter(ch);return enableVectorMovement(createShipCombatEncounter({id:'vector',participants:['intruder','native'].map(side=>({shipId:side,side,ship,carriedPrograms:['maneuver'],loadedPrograms:['maneuver']}))}),{intruder:{position:{x:0,y:0},velocity:{x:3,y:0}},native:{position:{x:151,y:0},velocity:{x:0,y:0}}});}
test('1 G adds two thousand miles per turn; no thrust retains velocity',()=>{let e=fixture();assert.deepEqual(previewShipVector(e,'intruder',{x:2,y:0}).endpoint,{x:5,y:0});e=commitShipVector(e,'intruder',{x:0,y:0},createSequenceDice([6,6]));assert.equal(e.spatial.ships.intruder.position.x,3);assert.throws(()=>commitShipVector(e,'intruder',{x:0,y:0},createSequenceDice([6,6])),/already/);});
test('wrong side, phase and over-thrust are refused',()=>{const e=fixture();assert.throws(()=>commitShipVector(e,'native',{x:0,y:0},createSequenceDice([6,6])),/phase/);assert.throws(()=>previewShipVector(e,'intruder',{x:5,y:0}),/exceeds/);assert.throws(()=>commitShipVector(advanceShipCombatPhase(e),'intruder',{x:0,y:0},createSequenceDice([6,6])),/phase/);});
test('range boundaries use strict greater-than and state round-trips',()=>{const e=fixture();assert.equal(vectorRangeDM(e,'intruder','native').dm,-2);e.spatial.ships.native.position.x=150;assert.equal(vectorRangeDM(e,'intruder','native').dm,0);e.spatial.ships.native.position.x=301;assert.equal(vectorRangeDM(e,'intruder','native').dm,-5);assert.deepEqual(JSON.parse(JSON.stringify(e)),e);});
test('failed computer coasts and commits once',()=>{const e=fixture();e.participants[0].ship.state.damage.computer=12;const n=commitShipVector(e,'intruder',{x:2,y:0},createSequenceDice([6,6]));assert.equal(n.spatial.ships.intruder.position.x,3);});

// ---------------------------------------------------------------------------
// Book 2 pp.27-29 gravity, and p.35 atmospheric braking
// ---------------------------------------------------------------------------

test('Book 2 p.27: templates reproduce the printed standard worlds', () => {
  // World Eight is Earth: D=8, K=1, so R=4, G=1, M=1, and p.27 works the bands
  // out as 8.0, 5.7 and 4.6.
  const earth = createPlanet({ name: 'Earth', diameter: 8 });
  assert.equal(earth.radius, 4);
  assert.equal(earth.massEarth, 1);
  assert.equal(earth.surfaceG, 1);
  const radii = Object.fromEntries(earth.bands.map((band) => [band.g, Number(band.outerRadius.toFixed(2))]));
  assert.equal(radii[0.25], 8);
  // p.27 itself says "5.7 approximately" and "4.6 approximately", so the
  // formula is the authority and the table is the rounding.
  assert.equal(radii[0.5], 5.66);
  assert.equal(radii[0.75], 4.62);
  // No band inside the surface.
  assert.ok(earth.bands.every((band) => band.outerRadius > earth.radius));
});

test('Book 2 p.29: the gravity vector is twice the band strength in units', () => {
  const earth = createPlanet({ name: 'Earth', diameter: 8 });
  // p.29: "a vector dictated by the 0.5 G band of a world is 1.0 inches long".
  // The sentence before it says the length equals the strength in Gs; the
  // worked example is the authority, and it is the same doubling as the
  // 2-units-per-G thrust scale.
  const stationary = moveWithGravity({ position: { x: 5, y: 0 }, velocity: { x: 0, y: 0 }, planet: earth });
  assert.equal(stationary.bandG, 0.5);
  assert.equal(Math.hypot(stationary.gravity.x, stationary.gravity.y).toFixed(2), '1.00');
  // Directed at the planet, so a ship to starboard is pulled to port.
  assert.ok(stationary.gravity.x < 0);
  assert.equal(stationary.endpoint.x, 4);
});

test('Book 2 p.29: gravity is sampled at the midpoint of the course, before thrust', () => {
  const earth = createPlanet({ name: 'Earth', diameter: 8 });
  // Starting well clear at 20 with a course that ends deep in the well: the
  // midpoint at 12 is outside every band, so no gravity applies this turn.
  const outside = moveWithGravity({ position: { x: 20, y: 0 }, velocity: { x: -16, y: 0 }, planet: earth });
  assert.equal(outside.midpoint.x, 12);
  assert.equal(outside.bandG, 0);

  // The same course from 14 has its midpoint at 7, inside the 0.25 G band.
  const inside = moveWithGravity({ position: { x: 14, y: 0 }, velocity: { x: -14, y: 0 }, planet: earth });
  assert.equal(inside.midpoint.x, 7);
  assert.equal(inside.bandG, 0.25);
  // p.29 adds gravity to the course "along with any ordinary course change
  // vector", so thrust does not move the sample point.
  const thrusting = moveWithGravity({ position: { x: 14, y: 0 }, velocity: { x: -14, y: 0 }, thrust: { x: 0, y: 4 }, planet: earth });
  assert.deepEqual(thrusting.midpoint, inside.midpoint);
  assert.equal(thrusting.bandG, 0.25);
});

test('Book 2 p.37: constant acceleration halves this turn and keeps the velocity', () => {
  const earth = createPlanet({ name: 'Earth', diameter: 8 });
  const options = { position: { x: 6, y: 0 }, velocity: { x: 0, y: 0 }, thrust: { x: 0, y: 4 }, planet: earth };
  const instant = moveWithGravity(options);
  const constant = moveWithGravity({ ...options, accelerationMode: 'constant' });
  // p.37: "initial movement... will only be half that of the added vector...
  // Full effect of the new vector will be felt only on succeeding turns. This
  // also applies to the force of gravity."
  assert.deepEqual(constant.velocity, instant.velocity);
  assert.equal(constant.endpoint.y, instant.endpoint.y / 2);
});

test('Book 2 p.35: a grazing pass through standard atmosphere is braked', () => {
  const earth = createPlanet({ name: 'Earth', diameter: 8 });
  const from = { x: -6, y: 4.2 };
  const endpoint = { x: 6, y: 4.2 };
  // Radius 4, so a pass at 4.2 is within the quarter-unit band.
  const braked = applyAtmosphericBraking({ from, endpoint, velocity: { x: 12, y: 0 }, planet: earth, atmosphere: 6 });
  assert.equal(braked.braked, true);
  assert.equal(Number((endpoint.x - braked.endpoint.x).toFixed(2)), ATMOSPHERIC_BRAKING_BAND);

  // Only standard and dense brake: p.35 names those, and Book 3's digits make
  // 6 standard and 8 dense.
  assert.equal(atmosphereBrakes(6), true);
  assert.equal(atmosphereBrakes(8), true);
  assert.equal(atmosphereBrakes(4), false);
  assert.equal(atmosphereBrakes(0), false);
  assert.equal(applyAtmosphericBraking({ from, endpoint, velocity: { x: 12, y: 0 }, planet: earth, atmosphere: 0 }).braked, false);

  // And a pass well clear of the surface is untouched.
  assert.equal(applyAtmosphericBraking({
    from: { x: -6, y: 9 }, endpoint: { x: 6, y: 9 }, velocity: { x: 12, y: 0 }, planet: earth, atmosphere: 6
  }).braked, false);
});

test('a course whose midpoint is inside the planet is left to the referee', () => {
  const earth = createPlanet({ name: 'Earth', diameter: 8 });
  const through = moveWithGravity({ position: { x: -4, y: 0 }, velocity: { x: 8, y: 0 }, planet: earth });
  assert.equal(through.resolved, false);
  assert.equal(through.requiresReferee, true);
  // Book 2's bands are external; nothing in it describes motion inside a world.
  assert.match(through.reason, /surface/);
});
