// v0.78.0: Book 3 (1977) star mapping, world creation, and sectors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDice, createSequenceDice } from '../src/dice.js';
import { parseUniversalWorldProfile } from '../src/worlds/world-profile.js';
import { getJumpDestinations, subsectorHexDistance } from '../src/worlds/subsector.js';
import {
  generateWorldProfile, techLevelDMs, rollBases, generateSubsector, sectorHex, subsectorOfSectorHex, subsectorOffset,
  neighbouringSubsectors, sectorMap, rollNewLanes
} from '../src/worlds/generation.js';

test('a world is created by the p.12 checklist', () => {
  // size 2D-2: 4+4 -> 6; atmosphere 2D-7+6: 3+4 -> 6; hydro 2D-7+6: 4+4 -> 7;
  // population 2D-2: 4+5 -> 7; government 2D-7+7: 3+3 -> 6; law 2D-7+6: 3+3 -> 5; tech 1D 3 + DMs.
  const world = generateWorldProfile(createSequenceDice([4, 4, 3, 4, 4, 4, 4, 5, 3, 3, 3, 3, 3]), { starport: 'B' });
  assert.deepEqual({ ...world }, { starport: 'B', size: 6, atmosphere: 6, hydrographics: 7, population: 7, government: 6, lawLevel: 5, techLevel: 7 });
  // Size 0: atmosphere 0 and hydrographics 0, without throwing for them.
  const rock = generateWorldProfile(createSequenceDice([1, 1, 3, 3, 3, 3, 3, 3, 3]), { starport: 'X' });
  assert.equal(rock.size, 0);
  assert.equal(rock.atmosphere, 0);
  assert.equal(rock.hydrographics, 0);
});

test('the technological index matrix (p.9)', () => {
  const dms = techLevelDMs({ starport: 'A', size: 0, atmosphere: 0, hydrographics: 10, population: 10, government: 13 });
  assert.equal(dms.total, 6 + 2 + 1 + 2 + 4 - 2);
});

test('bases by starport (p.5): naval at A or B on 8+, scout by class', () => {
  assert.deepEqual({ ...rollBases(createSequenceDice([4, 4, 5, 5]), 'A') }, { naval: true, scout: true });
  assert.deepEqual({ ...rollBases(createSequenceDice([3, 4]), 'D') }, { naval: false, scout: true });
  assert.deepEqual({ ...rollBases(createSequenceDice([]), 'E') }, { naval: false, scout: false });
});

test('a generated subsector averages about forty worlds, all valid', () => {
  let total = 0;
  for (let i = 0; i < 40; i += 1) {
    const subsector = generateSubsector(createDice(), { id: `s${i}`, name: 'Test' });
    total += subsector.systems.length;
    for (const system of subsector.systems) assert.doesNotThrow(() => parseUniversalWorldProfile(system.mainWorld.uwp));
    assert.equal(new Set(subsector.systems.map((system) => system.name)).size, subsector.systems.length, 'names are unique');
  }
  assert.ok(total / 40 > 32 && total / 40 < 48, `Book 3 p.1: "on the average, 40 worlds" (got ${total / 40})`);
});

test('a sector is 16 subsectors, A-P across then down; hexes convert both ways', () => {
  assert.deepEqual({ ...subsectorOffset('F') }, { columns: 8, rows: 10 });
  assert.equal(sectorHex('A', '0101'), '0101');
  assert.equal(sectorHex('B', '0101'), '0901');
  assert.equal(sectorHex('E', '0101'), '0111');
  assert.equal(sectorHex('F', '0305'), '1115');
  assert.deepEqual({ ...subsectorOfSectorHex('1115') }, { letter: 'F', localHex: '0305' });
  assert.deepEqual([...neighbouringSubsectors('F')].sort(), ['A', 'B', 'C', 'E', 'G', 'I', 'J', 'K']);
  assert.deepEqual([...neighbouringSubsectors('A')].sort(), ['B', 'E', 'F']);
});

test('the sector is one grid: jumps and lanes cross subsector edges', () => {
  const f = generateSubsector(createDice(), { id: 'f', name: 'F' });
  const g = generateSubsector(createDice(), { id: 'g', name: 'G', taken: new Set(f.systems.map((system) => system.name)) });
  let sector = { id: 'sector', name: 'Test', subsectors: { F: f }, routes: [] };
  sector = { ...sector, routes: [...rollNewLanes(sector, 'F', createDice()).routes] };
  sector = { ...sector, subsectors: { F: f, G: g } };
  const added = rollNewLanes(sector, 'G', createDice());
  sector = { ...sector, routes: [...sector.routes, ...added.routes] };
  const map = sectorMap(sector);
  assert.equal(map.systems.length, f.systems.length + g.systems.length);
  // Hexes 1610 (F's east edge) and 1710 (G's west edge) are one parsec apart.
  assert.equal(subsectorHexDistance('1610', '1710'), 1);
  const edge = map.systems.find((system) => system.subsector === 'F' && Number(system.hex.slice(0, 2)) === 16);
  if (edge) {
    const reach = getJumpDestinations(map, edge.id, 4);
    assert.ok(reach.every((entry) => entry.distance <= 4));
  }
  // New lanes never re-throw a pair within F.
  assert.ok(added.checks.every((check) => map.systems.find((system) => system.id === check.from).subsector === 'G' || map.systems.find((system) => system.id === check.to).subsector === 'G'));
});

// v0.78.0 (step 7): the quick-NPC stack takes the caller's random source.
import { generateQuickNPC, generateOppositionGroup } from '../src/npc-generator.js';

function seeded(seed) {
  let state = seed >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
}

test('a quick NPC and an opposition group replay exactly from the same seed', () => {
  const strip = (npc) => JSON.stringify({ ...npc, id: null, _meta: { ...npc._meta, generated: null } });
  assert.equal(strip(generateQuickNPC({ random: seeded(7) })), strip(generateQuickNPC({ random: seeded(7) })));
  const a = generateOppositionGroup(Object.keys(OPPOSITION)[0], 3, { random: seeded(11) }).map(strip);
  const b = generateOppositionGroup(Object.keys(OPPOSITION)[0], 3, { random: seeded(11) }).map(strip);
  assert.deepEqual(a, b);
});
import { OPPOSITION_TEMPLATES as OPPOSITION } from '../src/npc-templates.js';

// v0.79.1: a jump between sector hexes (columns past 8, rows past 10).
import { beginJump, hexInDirection } from '../src/starships/jump.js';
test('a jump and a misjump work on sector hexes', () => {
  const sector = { columns: 32, rows: 40 };
  assert.equal(hexInDirection('1515', 3, 2, sector).hex, '1716');
  assert.equal(hexInDirection('0101', 6, 1, sector).inSubsector, false);
  assert.throws(() => hexInDirection('1515', 3, 1), /column/, 'without bounds, still a subsector');
});
