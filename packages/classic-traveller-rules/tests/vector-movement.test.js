import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importCharacterDocument, createTypeSScoutReserveShipForCharacter, createShipCombatEncounter, advanceShipCombatPhase, createSequenceDice, createShipDocument, creditShipAccount, armShipTurret, purchaseOrdnance, launchOrdnance, moveOrdnance, declareFlight, currentPhase, obscuringSand, validateOrdnanceRuling } from '../index.js';
import {enableVectorMovement,previewShipVector,commitShipVector,coastVectorShips,vectorRangeDM,configureVectorPlanet,adjudicateVectorSurface} from '../src/starships/vector-movement.js';
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

// ---------------------------------------------------------------------------
// Vector ordnance (Book 2 pp.18, 23, 30) — ported, wired to this engine
// ---------------------------------------------------------------------------

function armedCruiserFor(id, weapons, missiles) {
  const captain = `c-${id}`;
  let ship = createShipDocument({
    designKey: 'type-c-cruiser', id, name: id,
    authority: {
      assignmentType: 'private-owner', controllingAuthority: id, legalTitleHolder: 'Captain',
      legalTitleSourceStatus: 'test', characterOwnsShip: true, assignedCharacterId: captain,
      assignedCharacterName: 'Captain', recallable: false, saleAllowed: true, useAsDesired: true,
      possessionAtServicePleasure: false,
      servicePrivileges: { freeFuelAtScoutBases: false, freeMaintenanceAtScoutBasesAtClassBStarports: false },
      operatorResponsibilities: { upkeep: true, crewCosts: true }
    },
    crewAssignments: [{ role: 'pilot', characterId: captain, characterName: 'Captain' }]
  });
  ship = creditShipAccount(ship, 50000000, { kind: 'capital', description: 'Fitting-out fund' });
  weapons.forEach((weapon, index) => {
    ship = armShipTurret(ship, { turretId: `T-${index + 1}`, weapon, pricePerWeaponCr: 0 }).ship;
  });
  return missiles ? purchaseOrdnance(ship, { missiles }).ship : ship;
}

// Book 2 never prints a missile's thrust or a contact radius, or the size of a
// sand cloud, so the referee supplies them and the module refuses a ruling with
// no recorded note.
const MISSILE_RULING = { maxG: 6, contactRadius: 0.5, note: 'Homing missile: 6 G, contact within half a unit' };

function ordnanceEncounter() {
  const programs = ['target', 'launch', 'maneuver'];
  let encounter = createShipCombatEncounter({
    id: 'vo', intruderSide: 'intruder',
    participants: [
      { shipId: 'a', side: 'intruder', ship: armedCruiserFor('a', ['missile-launcher', 'beam-laser'], 4),
        carriedPrograms: programs, loadedPrograms: programs, pressurisedSections: [] },
      { shipId: 'b', side: 'native', ship: armedCruiserFor('b', ['beam-laser'], 0),
        carriedPrograms: programs, loadedPrograms: programs, pressurisedSections: [] }
    ]
  });
  return enableVectorMovement(encounter, {
    a: { position: { x: 0, y: 0 }, velocity: { x: 4, y: 0 } },
    b: { position: { x: 40, y: 0 }, velocity: { x: 0, y: 0 } }
  });
}

test('Book 2 p.30: a round carries the launching ship\'s vector and waits a turn', () => {
  let encounter = ordnanceEncounter();
  for (let step = 0; step < 3; step += 1) encounter = advanceShipCombatPhase(encounter);
  assert.equal(currentPhase(encounter).key, 'ordnance-launch');
  encounter = launchOrdnance(encounter, { shipId: 'a', missiles: 1, targetId: 'b', vectorRuling: MISSILE_RULING });

  const round = encounter.ordnance[0];
  // "All ordnance which is launched has the launching ship's vector." v0.53.0:
  // and its position — which is x=4 now, because the launcher coasted its
  // 4-unit vector when movement ended (p.26). Before, it silently stayed put.
  assert.deepEqual(round.position, { x: 4, y: 0 });
  assert.deepEqual(round.velocity, { x: 4, y: 0 });
  assert.equal(round.status, 'in-flight');
  // "The launched item does not actually move until the following friendly
  // movement phase", and this is still the launcher's own turn.
  for (let step = 0; step < 2; step += 1) encounter = advanceShipCombatPhase(encounter);
  assert.equal(currentPhase(encounter).key, 'movement');
  encounter = moveOrdnance(encounter);
  assert.equal(encounter.ordnance[0].status, 'in-flight');
  assert.deepEqual(encounter.ordnance[0].position, { x: 4, y: 0 });
});

test('a vector missile has to cross the distance, and homes without overshooting', () => {
  let encounter = ordnanceEncounter();
  for (let step = 0; step < 3; step += 1) encounter = advanceShipCombatPhase(encounter);
  encounter = launchOrdnance(encounter, { shipId: 'a', missiles: 1, targetId: 'b', vectorRuling: MISSILE_RULING });

  const positions = [];
  for (let turn = 0; turn < 6 && encounter.ordnance[0].status !== 'contact'; turn += 1) {
    while (currentPhase(encounter).key !== 'movement' || encounter.phasingSide !== 'intruder') {
      encounter = advanceShipCombatPhase(encounter);
    }
    encounter = moveOrdnance(encounter);
    positions.push(Number(encounter.ordnance[0].position.x.toFixed(2)));
    if (encounter.ordnance[0].status === 'contact') break;
    encounter = advanceShipCombatPhase(encounter);
  }
  // Launcher's 4 plus a ruled 6 G, steering toward the target: it arrives at
  // the contact circle rather than flying past it.
  assert.equal(encounter.ordnance[0].status, 'contact');
  assert.ok(positions.at(-1) > 39 && positions.at(-1) <= 40, `arrived at ${positions.at(-1)}`);
  assert.equal(encounter.ordnance[0].contactedGameTurn, encounter.gameTurn);
});

test('Book 2 p.18: a missile whose target escapes has nothing to home on', () => {
  let encounter = ordnanceEncounter();
  for (let step = 0; step < 3; step += 1) encounter = advanceShipCombatPhase(encounter);
  encounter = launchOrdnance(encounter, { shipId: 'a', missiles: 1, targetId: 'b', vectorRuling: MISSILE_RULING });
  encounter = declareFlight(encounter, { shipId: 'b', shotsBeforeEscape: 0 });
  while (currentPhase(encounter).key !== 'movement' || encounter.phasingSide !== 'intruder') {
    encounter = advanceShipCombatPhase(encounter);
  }
  encounter = moveOrdnance(encounter);
  assert.equal(encounter.ordnance[0].status, 'spent');
});

test('a vector launch refuses a ruling with no recorded note', () => {
  let encounter = ordnanceEncounter();
  for (let step = 0; step < 3; step += 1) encounter = advanceShipCombatPhase(encounter);
  assert.throws(() => launchOrdnance(encounter, {
    shipId: 'a', missiles: 1, targetId: 'b', vectorRuling: { maxG: 6, contactRadius: 0.5 }
  }), /record the referee ordnance ruling/);
  // Book 2 prints none of these figures, so there is no default to fall back on.
  assert.throws(() => validateOrdnanceRuling('missile', { note: 'x' }), /missile G/);
  assert.throws(() => validateOrdnanceRuling('sand', { note: 'x' }), /sand radius/);
});

test('Book 2 p.30: sand is measured along the firing line, -3 per complete half unit', () => {
  // This replaces the abbreviated-mode house figure of -3 per canister with the
  // printed rule, because vector mode has a line to measure.
  const cloud = (x, y, radius) => ({ kind: 'sand', status: 'active', position: { x, y }, ruling: { radius, note: 'test cloud' } });
  const across = { spatialMode: 'vector', ordnance: [cloud(10, 0, 1)] };
  assert.equal(obscuringSand(across, { x: 0, y: 0 }, { x: 20, y: 0 }).dm, -12);

  // Overlapping clouds are counted once — a referee convention, since the book
  // does not say.
  const overlapping = { spatialMode: 'vector', ordnance: [cloud(10, 0, 1), cloud(10.5, 0, 1)] };
  assert.equal(obscuringSand(overlapping, { x: 0, y: 0 }, { x: 20, y: 0 }).dm, -15);

  // A line that misses the cloud is unobscured.
  assert.equal(obscuringSand(across, { x: 0, y: 5 }, { x: 20, y: 5 }).dm, 0);

  // "per 1/2 inch" is per COMPLETE half inch, so a graze gives one step.
  const grazing = { spatialMode: 'vector', ordnance: [cloud(10, 0.95, 1)] };
  assert.equal(obscuringSand(grazing, { x: 0, y: 0 }, { x: 20, y: 0 }).dm, -3);
});

test('a course into the surface is the referee\'s, and the ruling is recorded', () => {
  const programs = ['target', 'maneuver'];
  let encounter = createShipCombatEncounter({
    id: 'surface', intruderSide: 'intruder',
    participants: [
      { shipId: 'a', side: 'intruder', ship: armedCruiserFor('sa', ['beam-laser'], 0), carriedPrograms: programs, loadedPrograms: programs, pressurisedSections: [] },
      { shipId: 'b', side: 'native', ship: armedCruiserFor('sb', ['beam-laser'], 0), carriedPrograms: programs, loadedPrograms: programs, pressurisedSections: [] }
    ]
  });
  encounter = enableVectorMovement(encounter, {
    // A course straight through an 8000-mile world.
    a: { position: { x: -10, y: 0 }, velocity: { x: 20, y: 0 } },
    b: { position: { x: 60, y: 0 }, velocity: { x: 0, y: 0 } }
  });
  encounter = configureVectorPlanet(encounter, { name: 'San Telmo', diameter: 8 }, 'instantaneous', { atmosphere: 6 });
  assert.equal(encounter.spatial.planet.radius, 4);
  assert.equal(encounter.spatial.accelerationMode, 'instantaneous');

  // Book 2's bands are external; it says nothing about motion inside a world.
  const blocked = previewShipVector(encounter, 'a', { x: 0, y: 0 });
  assert.equal(blocked.unresolved, true);
  assert.throws(() => commitShipVector(encounter, 'a', { x: 0, y: 0 }, createSequenceDice([6, 6])), /course cannot be resolved/);

  // The referee places it instead, and has to say why.
  assert.throws(() => adjudicateVectorSurface(encounter, { id: 'a', position: { x: 6, y: 0 }, velocity: { x: 2, y: 0 } }), /ruling note required/);
  const ruled = adjudicateVectorSurface(encounter, {
    id: 'a', position: { x: 6, y: 0 }, velocity: { x: 2, y: 0 }, note: 'Skimmed the atmosphere and came out the far side'
  });
  assert.deepEqual(ruled.spatial.ships.a.position, { x: 6, y: 0 });
  const entry = ruled.log.at(-1);
  assert.equal(entry.kind, 'surface-ruling');
  assert.equal(entry.refereeRuling, true);
  assert.equal(entry.raw, false);
  // And it cannot be placed inside the world.
  assert.throws(() => adjudicateVectorSurface(encounter, {
    id: 'a', position: { x: 1, y: 0 }, velocity: { x: 0, y: 0 }, note: 'inside'
  }), /outside the surface/);
});

// ---------------------------------------------------------------------------
// v0.53.0: Book 2 p.26 coasting, and a course that meets the world
// ---------------------------------------------------------------------------

test('Book 2 p.26: a ship that does not thrust still travels its vector when movement ends', () => {
  let e = fixture();
  // The intruder commits nothing; ADVANCE carries it 3 units on its vector.
  e = advanceShipCombatPhase(e);
  assert.deepEqual(e.spatial.ships.intruder.position, { x: 3, y: 0 });
  assert.equal(e.spatial.ships.intruder.movedTurn, 1);
  const entry = e.log.find((item) => item.kind === 'vector-move' && item.coasted);
  assert.equal(entry.shipId, 'intruder');
  assert.equal(entry.g, 0);
  // The native is not phasing, so it has not moved yet.
  assert.equal(e.spatial.ships.native.movedTurn, 0);
  while (!(currentPhase(e).key === 'movement' && e.phasingSide === 'native')) e = advanceShipCombatPhase(e);
  // Stationary is a vector of 0 (p.25): it coasts in place, and is marked moved.
  e = advanceShipCombatPhase(e);
  assert.deepEqual(e.spatial.ships.native.position, { x: 151, y: 0 });
  assert.equal(e.spatial.ships.native.movedTurn, 1);
});

test('a committed ship is not coasted a second time', () => {
  let e = fixture();
  e = commitShipVector(e, 'intruder', { x: 2, y: 0 }, createSequenceDice([6, 6]));
  const coast = coastVectorShips(e);
  assert.equal(coast.coasted.length, 0);
  e = advanceShipCombatPhase(e);
  assert.deepEqual(e.spatial.ships.intruder.position, { x: 5, y: 0 });
  assert.equal(e.log.filter((item) => item.kind === 'vector-move').length, 1);
});

test('coasting samples gravity at the course midpoint (p.29)', () => {
  let e = configureVectorPlanet(fixture(), { name: 'Earth', diameter: 8, center: { x: 1.5, y: 7 } });
  const expected = previewShipVector(e, 'intruder', { x: 0, y: 0 });
  assert.ok(expected.bandG > 0);
  e = advanceShipCombatPhase(e);
  assert.deepEqual(e.spatial.ships.intruder.position, expected.endpoint);
  assert.deepEqual(e.spatial.ships.intruder.velocity, expected.velocity);
});

test('a course through the world is refused, and movement cannot end until the referee rules', () => {
  // A world of radius 1 sitting across the intruder's 3-unit coast, clear of
  // the course midpoint so the course resolves and only touches the surface.
  let e = configureVectorPlanet(fixture(), { name: 'Rock', diameter: 2, center: { x: 2.6, y: 0 } });
  assert.equal(previewShipVector(e, 'intruder', { x: 0, y: 0 }).surfaceContact, true);
  assert.throws(() => commitShipVector(e, 'intruder', { x: 0, y: 0 }, createSequenceDice([6, 6])), /surface ruling/);
  const coast = coastVectorShips(e);
  assert.deepEqual(coast.awaitingRuling.map((item) => item.shipId), ['intruder']);
  assert.deepEqual(coast.encounter.spatial.ships.intruder.position, { x: 0, y: 0 });
  assert.throws(() => advanceShipCombatPhase(e), /surface ruling required/);

  // The referee places it outside the surface with a vector, and the turn goes on.
  e = adjudicateVectorSurface(e, { id: 'intruder', position: { x: 1.4, y: 0 }, velocity: { x: 0, y: 0 }, note: 'Retro burn, held station above the rock' });
  e = advanceShipCombatPhase(e);
  assert.equal(currentPhase(e).key, 'laser-fire');
  assert.deepEqual(e.spatial.ships.intruder.position, { x: 1.4, y: 0 });
});

// v0.54.0: the Graycloak standing ruling, and vector sand that actually takes
// effect. activateVectorSand had no caller, so a cloud never obscured a shot.
test('the standing ordnance ruling launches both kinds, and cast sand obscures from phase D', async () => {
  const { VECTOR_ORDNANCE_DEFAULT_RULING } = await import('../index.js');
  assert.equal(VECTOR_ORDNANCE_DEFAULT_RULING.raw, false);
  const programs = ['target', 'launch', 'maneuver'];
  let ship = armedCruiserFor('a', ['missile-launcher', 'sandcaster', 'beam-laser'], 4);
  ship = purchaseOrdnance(ship, { sandCanisters: 3 }).ship;
  let encounter = enableVectorMovement(createShipCombatEncounter({
    id: 'sand', intruderSide: 'intruder',
    participants: [
      { shipId: 'a', side: 'intruder', ship, carriedPrograms: programs, loadedPrograms: programs, pressurisedSections: [] },
      { shipId: 'b', side: 'native', ship: armedCruiserFor('b', ['beam-laser'], 0), carriedPrograms: programs, loadedPrograms: programs, pressurisedSections: [] }
    ]
  }), {
    a: { position: { x: 0, y: 0 }, velocity: { x: 4, y: 0 } },
    b: { position: { x: 40, y: 0 }, velocity: { x: 0, y: 0 } }
  });
  while (currentPhase(encounter).key !== 'ordnance-launch') encounter = advanceShipCombatPhase(encounter);
  encounter = launchOrdnance(encounter, { shipId: 'a', missiles: 1, targetId: 'b', launcherIds: ['T-1:1'], vectorRuling: VECTOR_ORDNANCE_DEFAULT_RULING });
  encounter = launchOrdnance(encounter, { shipId: 'a', sandCanisters: 1, launcherIds: ['T-2:1'], vectorRuling: VECTOR_ORDNANCE_DEFAULT_RULING });
  const sand = () => encounter.ordnance.find((round) => round.kind === 'sand');
  assert.equal(encounter.ordnance.find((round) => round.kind === 'missile').ruling.contactRadius, 0.5);
  assert.equal(sand().ruling.radius, 0.5);
  assert.deepEqual(sand().position, { x: 4, y: 0 });
  const line = () => obscuringSand(encounter, encounter.spatial.ships.b.position, encounter.spatial.ships.a.position);

  // Round to the intruder's next movement: the cloud travels with the launcher's vector.
  while (!(currentPhase(encounter).key === 'movement' && encounter.phasingSide === 'intruder' && encounter.gameTurn === 2)) encounter = advanceShipCombatPhase(encounter);
  encounter = moveOrdnance(encounter);
  assert.equal(sand().status, 'pending-effect');
  encounter = advanceShipCombatPhase(encounter); // coasts a to x=8, into laser fire
  assert.deepEqual(sand().position, { x: 8, y: 0 });
  assert.equal(line().dm, 0, 'not yet in effect');
  encounter = advanceShipCombatPhase(encounter);
  encounter = advanceShipCombatPhase(encounter); // into phase D
  assert.equal(currentPhase(encounter).key, 'ordnance-launch');
  assert.equal(sand().status, 'active');
  // Half an inch of cloud between b and a: Book 2 p.30's -3.
  assert.equal(line().dm, -3);
});

// v0.55.0: a round that reaches the world is removed rather than jamming the
// movement phase (referee ruling; Book 2 is silent).
test('a missile that reaches a world is spent and logged, and movement goes on', async () => {
  const { VECTOR_ORDNANCE_DEFAULT_RULING } = await import('../index.js');
  const programs = ['target', 'launch', 'maneuver'];
  let encounter = createShipCombatEncounter({
    id: 'impact', intruderSide: 'intruder',
    participants: [
      { shipId: 'a', side: 'intruder', ship: armedCruiserFor('a', ['missile-launcher'], 3), carriedPrograms: programs, loadedPrograms: programs, pressurisedSections: [] },
      { shipId: 'b', side: 'native', ship: armedCruiserFor('b', ['beam-laser'], 0), carriedPrograms: programs, loadedPrograms: programs, pressurisedSections: [] }
    ]
  });
  encounter = enableVectorMovement(encounter, {
    a: { position: { x: 0, y: 0 }, velocity: { x: 4, y: 0 } },
    b: { position: { x: 40, y: 0 }, velocity: { x: 0, y: 0 } }
  });
  // A small world squarely between them.
  encounter = configureVectorPlanet(encounter, { name: 'Rock', diameter: 4, center: { x: 20, y: 0 } });
  while (currentPhase(encounter).key !== 'ordnance-launch') encounter = advanceShipCombatPhase(encounter);
  encounter = launchOrdnance(encounter, { shipId: 'a', missiles: 1, targetId: 'b', vectorRuling: VECTOR_ORDNANCE_DEFAULT_RULING });
  while (!(currentPhase(encounter).key === 'movement' && encounter.phasingSide === 'intruder' && encounter.gameTurn === 2)) encounter = advanceShipCombatPhase(encounter);
  encounter = moveOrdnance(encounter);
  const round = encounter.ordnance[0];
  assert.equal(round.status, 'spent');
  assert.equal(round.position.x, 18);
  const impact = encounter.log.find((entry) => entry.kind === 'ordnance-surface-impact');
  assert.equal(impact.id, round.id);
  assert.equal(impact.raw, false);
  // Nothing is left to jam the phase, and a spent round is not moved again.
  encounter = advanceShipCombatPhase(encounter);
  assert.equal(currentPhase(encounter).key, 'laser-fire');
});

// v0.56.0: a phase with no legal action is recognised, per phase.
test('shipCombatPhaseActions finds what the acting side can legally do', async () => {
  const { shipCombatPhaseActions, allocateLaserFire, resolveLaserFire } = await import('../index.js');
  const programs = ['target', 'return-fire', 'maneuver'];
  let encounter = createShipCombatEncounter({
    id: 'legal', intruderSide: 'intruder',
    participants: [
      { shipId: 'a', side: 'intruder', ship: armedCruiserFor('a', ['beam-laser'], 0), carriedPrograms: programs, loadedPrograms: programs, pressurisedSections: [] },
      { shipId: 'b', side: 'native', ship: armedCruiserFor('b', ['beam-laser'], 0), carriedPrograms: [...programs, 'launch'], loadedPrograms: programs, pressurisedSections: [] }
    ]
  });
  // Abbreviated movement: nothing to thrust, nothing to reload.
  let actions = shipCombatPhaseActions(encounter);
  assert.equal(actions.phase, 'movement');
  assert.equal(actions.legal, false);
  assert.match(actions.reason, /thrust/);

  // On a plot the phasing ship can thrust, until it has moved.
  let plotted = enableVectorMovement(encounter, {
    a: { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
    b: { position: { x: 40, y: 0 }, velocity: { x: 0, y: 0 } }
  });
  assert.deepEqual(shipCombatPhaseActions(plotted).actions, [{ kind: 'thrust', shipId: 'a' }]);
  plotted = commitShipVector(plotted, 'a', { x: 0, y: 0 }, createSequenceDice([6, 6]));
  assert.equal(shipCombatPhaseActions(plotted).legal, false);

  // Laser fire: the intruder's beam laser, until it has fired.
  encounter = advanceShipCombatPhase(encounter);
  actions = shipCombatPhaseActions(encounter);
  assert.deepEqual(actions.actions, [{ kind: 'fire', shipId: 'a', turretId: 'T-1' }]);
  encounter = allocateLaserFire(encounter, [{ shipId: 'a', turretId: 'T-1', targetId: 'b' }]);
  encounter = resolveLaserFire(encounter, createSequenceDice([1, 1, 1, 1, 1, 1, 1, 1])).encounter;
  assert.equal(shipCombatPhaseActions(encounter).legal, false, 'the only laser has fired');

  // Return fire: the native was fired on and runs Return Fire.
  encounter = advanceShipCombatPhase(encounter);
  actions = shipCombatPhaseActions(encounter);
  assert.equal(actions.side, 'native');
  assert.deepEqual(actions.actions, [{ kind: 'return-fire', shipId: 'b', turretId: 'T-1' }]);

  // Ordnance: no racks and nothing in contact.
  encounter = advanceShipCombatPhase(encounter);
  assert.equal(shipCombatPhaseActions(encounter).legal, false);

  // Reprogramming: the intruder carries nothing it has not loaded.
  encounter = advanceShipCombatPhase(encounter);
  assert.equal(shipCombatPhaseActions(encounter).phase, 'reprogramming');
  assert.equal(shipCombatPhaseActions(encounter).legal, false);
  // The native carries Launch in storage, so its reprogramming phase is live.
  while (!(currentPhase(encounter).key === 'reprogramming' && encounter.phasingSide === 'native')) encounter = advanceShipCombatPhase(encounter);
  assert.deepEqual(shipCombatPhaseActions(encounter).actions, [{ kind: 'reprogram', shipId: 'b' }]);
});

// v0.57.0: Book 2 p.35 damage control, one attempt per ship, thrown in the
// Game Turn Interphase.
test('damage control is declared during the turn and thrown at 9+ in the interphase', async () => {
  const { declareDamageControl, cancelDamageControl, damageControlOptions, DAMAGE_CONTROL_THROW } = await import('../index.js');
  assert.equal(DAMAGE_CONTROL_THROW, 9);
  const programs = ['target', 'maneuver'];
  const damaged = armedCruiserFor('a', ['beam-laser'], 0);
  damaged.state.damage.maneuverDrive = 1;
  damaged.state.damage.computer = 2;
  damaged.state.damage.turrets = ['T-1'];
  let encounter = createShipCombatEncounter({
    id: 'repair', intruderSide: 'intruder',
    participants: [
      { shipId: 'a', side: 'intruder', ship: damaged, carriedPrograms: programs, loadedPrograms: programs, pressurisedSections: [], skills: { engineering: 2, computer: 1 } },
      { shipId: 'b', side: 'native', ship: armedCruiserFor('b', ['beam-laser'], 0), carriedPrograms: programs, loadedPrograms: programs, pressurisedSections: [] }
    ]
  });
  const options = damageControlOptions(encounter.participants[0]);
  assert.deepEqual(options.map((entry) => [entry.location, entry.turretId, entry.dm]), [['maneuver-drive', null, 2], ['computer', null, 1], ['turret', 'T-1', 0]]);
  assert.throws(() => declareDamageControl(encounter, { shipId: 'a', location: 'jump-drive' }), /no repairable jump-drive/);
  assert.throws(() => declareDamageControl(encounter, { shipId: 'b', location: 'hull' }), /no repairable/);

  // One slot per ship: a second declaration replaces the first.
  encounter = declareDamageControl(encounter, { shipId: 'a', location: 'computer' });
  encounter = declareDamageControl(encounter, { shipId: 'a', location: 'maneuver-drive' });
  assert.deepEqual(encounter.participants[0].damageControl, { gameTurn: 1, location: 'maneuver-drive', turretId: null, crewId: null, crewName: '', vacates: [], dm: 2, dmSource: 'engineering', note: '' });

  // Nothing happens until the turn ends, and the interphase needs dice.
  while (!(currentPhase(encounter).key === 'reprogramming' && encounter.phasingSide === 'native')) encounter = advanceShipCombatPhase(encounter);
  assert.equal(encounter.participants[0].ship.state.damage.maneuverDrive, 1);
  assert.throws(() => advanceShipCombatPhase(encounter), /dice/i);
  // 4 + 3 + engineering 2 = 9: repaired.
  let ended = advanceShipCombatPhase(encounter, { dice: createSequenceDice([4, 3]) });
  assert.equal(ended.gameTurn, 2);
  assert.equal(ended.participants[0].ship.state.damage.maneuverDrive, 0);
  assert.equal(ended.participants[0].damageControl, null);
  const entry = ended.log.find((item) => item.kind === 'damage-control');
  assert.deepEqual([entry.total, entry.target, entry.repaired, entry.location], [9, 9, true, 'maneuver-drive']);

  // A referee's DM, and a failure that leaves the damage in place.
  ended = declareDamageControl(ended, { shipId: 'a', location: 'turret', turretId: 'T-1', dm: 1, note: 'Gunner with mechanical-1' });
  assert.equal(ended.participants[0].damageControl.dmSource, 'referee');
  while (!(currentPhase(ended).key === 'reprogramming' && ended.phasingSide === 'native')) ended = advanceShipCombatPhase(ended);
  ended = advanceShipCombatPhase(ended, { dice: createSequenceDice([3, 4]) });
  assert.deepEqual(ended.participants[0].ship.state.damage.turrets, ['T-1']);
  assert.equal(ended.log.filter((item) => item.kind === 'damage-control').at(-1).repaired, false);

  // Withdrawn before the turn ends: no throw, no dice needed.
  ended = cancelDamageControl(declareDamageControl(ended, { shipId: 'a', location: 'computer' }), { shipId: 'a' });
  while (!(currentPhase(ended).key === 'reprogramming' && ended.phasingSide === 'native')) ended = advanceShipCombatPhase(ended);
  assert.equal(advanceShipCombatPhase(ended).gameTurn, 4);
});


// v0.58.0 (ruling): a repair is made by a named crew member, who gives up his
// stations for the rest of the game turn, and cannot start one after acting.
test('the crew member making a repair leaves his stations for the turn', async () => {
  const { declareDamageControl, cancelDamageControl, stationVacated, shipCombatPhaseActions, allocateLaserFire, resolveLaserFire } = await import('../index.js');
  const programs = ['target', 'maneuver'];
  const ship = armedCruiserFor('a', ['beam-laser'], 0);
  ship.state.damage.hold = 1;
  const make = () => enableVectorMovement(createShipCombatEncounter({
    id: 'crew', intruderSide: 'intruder',
    participants: [
      { shipId: 'a', side: 'intruder', ship, carriedPrograms: programs, loadedPrograms: programs, pressurisedSections: [],
        stations: { pilot: 'ana', gunners: { 'T-1': 'bo' } }, skills: { pilot: 2, computer: 1, gunnery: { 'T-1': 1 } } },
      { shipId: 'b', side: 'native', ship: armedCruiserFor('b', ['beam-laser'], 0), carriedPrograms: programs, loadedPrograms: programs, pressurisedSections: [] }
    ]
  }), { a: { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }, b: { position: { x: 40, y: 0 }, velocity: { x: 0, y: 0 } } });

  let encounter = make();
  assert.throws(() => declareDamageControl(encounter, { shipId: 'a', location: 'hold' }), /name the crew member/);

  // The gunner repairs: his turret does not fire this turn.
  encounter = declareDamageControl(encounter, { shipId: 'a', location: 'hold', crewId: 'bo', crewName: 'Bo', dm: 1 });
  assert.deepEqual(encounter.participants[0].damageControl.vacates, ['gunner:T-1']);
  assert.equal(stationVacated(encounter.participants[0], 'gunner:T-1'), true);
  encounter = commitShipVector(encounter, 'a', { x: 1, y: 0 }, createSequenceDice([6, 6]));
  encounter = advanceShipCombatPhase(encounter);
  assert.equal(shipCombatPhaseActions(encounter).legal, false, 'the only turret has no gunner this turn');
  encounter = allocateLaserFire(encounter, [{ shipId: 'a', turretId: 'T-1', targetId: 'b' }]);
  const fired = resolveLaserFire(encounter, createSequenceDice([6, 6, 6, 6])).encounter;
  assert.match(fired.log.find((entry) => entry.kind === 'laser-fire').reason, /making a repair/);

  // The pilot repairs: no thrust, and the computer (his by default) loses his skill.
  encounter = declareDamageControl(make(), { shipId: 'a', location: 'hold', crewId: 'ana', crewName: 'Ana' });
  assert.deepEqual(encounter.participants[0].damageControl.vacates, ['pilot', 'computer']);
  assert.throws(() => commitShipVector(encounter, 'a', { x: 1, y: 0 }, createSequenceDice([6, 6])), /pilot is making a repair/);
  encounter = commitShipVector(encounter, 'a', { x: 0, y: 0 }, createSequenceDice([6, 6]));
  // Withdrawing gives the station back.
  assert.equal(stationVacated(cancelDamageControl(encounter, { shipId: 'a' }).participants[0], 'pilot'), false);

  // Having flown this turn, the pilot cannot start a repair until the next.
  encounter = commitShipVector(make(), 'a', { x: 1, y: 0 }, createSequenceDice([6, 6]));
  assert.throws(() => declareDamageControl(encounter, { shipId: 'a', location: 'hold', crewId: 'ana', crewName: 'Ana' }), /Ana has already acted as pilot this turn/);
  // Someone else still can.
  assert.equal(declareDamageControl(encounter, { shipId: 'a', location: 'hold', crewId: 'bo', crewName: 'Bo' }).participants[0].damageControl.crewId, 'bo');
});
