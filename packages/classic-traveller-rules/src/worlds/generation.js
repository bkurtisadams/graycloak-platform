// ---------------------------------------------------------------------------
// v0.78.0: Book 3 (1977) star mapping and world creation, pp.1-12, and the
// sector a campaign's subsectors sit in.
//
// Star mapping (p.1): a world in a hex on 4-6 on one die (a DM of +1 or -1
// for a denser or sparser region); starport by 2D on the starports table.
// Bases (p.5): naval at A or B on 8+; scout at A 10+, B 9+, C 8+, D 7+.
// World creation (p.12 checklist): size 2D-2; atmosphere 2D-7+size (size 0,
// atmosphere 0); hydrographics 2D-7+size (size 0 or 1, hydrographics 0;
// atmosphere 0, 1 or A+, DM -4); population 2D-2; government 2D-7+population;
// law 2D-7+government; tech 1D plus the technological index matrix (p.9).
// Gas giants by The Traveller Book (1982); see GAS_GIANT_PRESENT_MAX.
// ---------------------------------------------------------------------------

import { requireDice } from '../dice.js';
import { formatUniversalWorldProfile } from './world-profile.js';
import { describeTradeClassifications } from './trade-classifications.js';
import { formatSubsectorHex, SUBSECTOR_COLUMNS, SUBSECTOR_ROWS, SECTOR_COLUMNS, SECTOR_ROWS } from './subsector.js';
import { rollJumpRoutes } from './routes.js';

const d2 = (dice) => dice.rollD6() + dice.rollD6();
const clampMin = (value) => Math.max(0, value);

export const WORLD_PRESENT_MIN = 4;
export const STARPORT_TABLE = Object.freeze({ 2: 'A', 3: 'A', 4: 'A', 5: 'B', 6: 'B', 7: 'C', 8: 'C', 9: 'D', 10: 'E', 11: 'E', 12: 'X' });
export const NAVAL_BASE_THROW = Object.freeze({ A: 8, B: 8 });
export const SCOUT_BASE_THROW = Object.freeze({ A: 10, B: 9, C: 8, D: 7 });
// Book 3 (1977) throws no gas giants. The Traveller Book (1982), adopted
// (Kurt, Sep 2026): "throw 10+ for a gas giant not to be present" — present
// on 2D 9 or less.
export const GAS_GIANT_PRESENT_MAX = 9;

// p.9, the technological index matrix.
const TECH_DMS = Object.freeze({
  starport: { A: 6, B: 4, C: 2, X: -4 },
  size: { 0: 2, 1: 2, 2: 1, 3: 1, 4: 1 },
  atmosphere: { 0: 1, 1: 1, 2: 1, 3: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1 },
  hydrographics: { 9: 1, 10: 2 },
  population: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 9: 2, 10: 4 },
  government: { 0: 1, 5: 1, 13: -2 }
});

export function techLevelDMs(profile) {
  const parts = [
    ['starport', TECH_DMS.starport[profile.starport] ?? 0],
    ['size', TECH_DMS.size[profile.size] ?? 0],
    ['atmosphere', TECH_DMS.atmosphere[profile.atmosphere] ?? 0],
    ['hydrographics', TECH_DMS.hydrographics[profile.hydrographics] ?? 0],
    ['population', TECH_DMS.population[profile.population] ?? 0],
    ['government', TECH_DMS.government[profile.government] ?? 0]
  ].filter(([, dm]) => dm !== 0);
  return Object.freeze({ parts: Object.freeze(parts.map(([key, dm]) => Object.freeze({ key, dm }))), total: parts.reduce((sum, [, dm]) => sum + dm, 0) });
}

export function rollStarport(dice) {
  return STARPORT_TABLE[d2(dice)];
}

/** One world, given its starport (p.12, item 2). */
export function generateWorldProfile(dice, { starport }) {
  requireDice(dice);
  const size = d2(dice) - 2;
  const atmosphere = size === 0 ? 0 : clampMin(d2(dice) - 7 + size);
  let hydrographics = 0;
  if (size > 1) {
    const dm = atmosphere <= 1 || atmosphere >= 10 ? -4 : 0;
    hydrographics = Math.min(10, clampMin(d2(dice) - 7 + size + dm));
  }
  const population = d2(dice) - 2;
  const government = clampMin(d2(dice) - 7 + population);
  const lawLevel = clampMin(d2(dice) - 7 + government);
  const partial = { starport, size, atmosphere, hydrographics, population, government, lawLevel };
  const techLevel = clampMin(dice.rollD6() + techLevelDMs(partial).total);
  return Object.freeze({ ...partial, techLevel });
}

export function rollBases(dice, starport) {
  const naval = NAVAL_BASE_THROW[starport] !== undefined && d2(dice) >= NAVAL_BASE_THROW[starport];
  const scout = SCOUT_BASE_THROW[starport] !== undefined && d2(dice) >= SCOUT_BASE_THROW[starport];
  return Object.freeze({ naval, scout });
}

// World names: two or three original syllables, seeded like everything else.
const ONSETS = ['', 'b', 'br', 'c', 'ch', 'd', 'dr', 'f', 'g', 'gr', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 'sh', 'st', 't', 'th', 'tr', 'v', 'z'];
const VOWELS = ['a', 'e', 'i', 'o', 'u', 'ae', 'ai', 'ea', 'io', 'y'];
const CODAS = ['', '', 'n', 'r', 'l', 's', 'th', 'nd', 'rn', 'x', 'm', 'st'];
function pick(dice, list) {
  const index = ((dice.rollD6() - 1) * 6 + (dice.rollD6() - 1)) % list.length;
  return list[index];
}
export function generateWorldName(dice) {
  const syllables = dice.rollD6() <= 4 ? 2 : 3;
  let name = '';
  for (let i = 0; i < syllables; i += 1) name += pick(dice, ONSETS) + pick(dice, VOWELS) + (i === syllables - 1 ? pick(dice, CODAS) : '');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * A subsector (8x10), mapped and its worlds created (p.12, items 1-3). Hexes
 * are the subsector's own numbers; names are generated and the referee's to
 * change. Lanes are thrown after (p.2), across the whole sector.
 */
export function generateSubsector(dice, { id, name, densityDM = 0, namer = generateWorldName, taken = new Set() } = {}) {
  requireDice(dice);
  if (!id || !name) throw new TypeError('a subsector needs an id and a name');
  const systems = [];
  for (let column = 1; column <= SUBSECTOR_COLUMNS; column += 1) {
    for (let row = 1; row <= SUBSECTOR_ROWS; row += 1) {
      if (dice.rollD6() + densityDM < WORLD_PRESENT_MIN) continue;
      const starport = rollStarport(dice);
      const profile = generateWorldProfile(dice, { starport });
      const bases = rollBases(dice, starport);
      const gasGiant = d2(dice) <= GAS_GIANT_PRESENT_MAX;
      let worldName = namer(dice);
      while (taken.has(worldName)) worldName = namer(dice);
      taken.add(worldName);
      const hex = formatSubsectorHex(column, row);
      const systemId = `${slug(worldName)}-${id}-${hex}`;
      systems.push(Object.freeze({
        id: systemId, hex, name: worldName,
        mainWorld: Object.freeze({ id: `${systemId}-main`, name: worldName, uwp: formatUniversalWorldProfile(profile) }),
        bases, gasGiant, travelZone: 'none',
        notes: `Generated (Book 3, 1977)${describeTradeClassifications(profile).length ? `: ${describeTradeClassifications(profile).map((entry) => entry.label).join(', ')}` : ''}.`
      }));
    }
  }
  return Object.freeze({ id, name, systems: Object.freeze(systems) });
}

// ---------------------------------------------------------------- sectors
// A sector is 16 subsectors, lettered A-P across then down (4x4). A world's
// sector hex is its subsector hex plus the subsector's offset: B +0800,
// E +0010, and so on.
export const SUBSECTOR_LETTERS = Object.freeze('ABCDEFGHIJKLMNOP'.split(''));

export function subsectorOffset(letter) {
  const index = SUBSECTOR_LETTERS.indexOf(letter);
  if (index < 0) throw new RangeError(`subsector letter must be A-P: ${letter}`);
  return Object.freeze({ columns: (index % 4) * SUBSECTOR_COLUMNS, rows: Math.floor(index / 4) * SUBSECTOR_ROWS });
}

export function sectorHex(letter, localHex) {
  const offset = subsectorOffset(letter);
  const column = Number(localHex.slice(0, 2)) + offset.columns;
  const row = Number(localHex.slice(2)) + offset.rows;
  return formatSubsectorHex(column, row, { columns: SECTOR_COLUMNS, rows: SECTOR_ROWS });
}

export function subsectorOfSectorHex(hex) {
  const column = Number(hex.slice(0, 2));
  const row = Number(hex.slice(2));
  const letter = SUBSECTOR_LETTERS[Math.floor((row - 1) / SUBSECTOR_ROWS) * 4 + Math.floor((column - 1) / SUBSECTOR_COLUMNS)];
  const offset = subsectorOffset(letter);
  return Object.freeze({ letter, localHex: formatSubsectorHex(column - offset.columns, row - offset.rows) });
}

/** The letters of the subsectors touching one (edges and corners). */
export function neighbouringSubsectors(letter) {
  const index = SUBSECTOR_LETTERS.indexOf(letter);
  const col = index % 4;
  const row = Math.floor(index / 4);
  const out = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue;
      const c = col + dc;
      const r = row + dr;
      if (c >= 0 && c < 4 && r >= 0 && r < 4) out.push(SUBSECTOR_LETTERS[r * 4 + c]);
    }
  }
  return Object.freeze(out);
}

/**
 * The sector as one map: every charted subsector's systems on sector hexes,
 * with their lanes, in the shape every subsector function already takes.
 * sector: { id, name, subsectors: { [letter]: { id, name, systems, routes } } }
 */
export function sectorMap(sector) {
  const systems = [];
  const routes = [];
  for (const letter of SUBSECTOR_LETTERS) {
    const subsector = sector.subsectors?.[letter];
    if (!subsector) continue;
    for (const system of subsector.systems) systems.push(Object.freeze({ ...system, hex: sectorHex(letter, system.hex), localHex: system.hex, subsector: letter }));
  }
  for (const route of sector.routes ?? []) routes.push(route);
  return Object.freeze({ id: sector.id, name: sector.name, columns: SECTOR_COLUMNS, rows: SECTOR_ROWS, systems: Object.freeze(systems), routes: Object.freeze(routes) });
}

/**
 * Lanes (p.2) for a newly charted subsector: every pair within four hexes
 * that has at least one world in it and has not been checked before — so a
 * lane may cross into a subsector charted earlier, and no pair is thrown twice.
 */
export function rollNewLanes(sector, letter, dice) {
  const map = sectorMap(sector);
  const fresh = new Set(map.systems.filter((system) => system.subsector === letter).map((system) => system.id));
  const nearby = map.systems.filter((system) => fresh.has(system.id) || neighbouringSubsectors(letter).includes(system.subsector));
  const probe = { id: `${sector.id}-${letter}-lanes`, name: 'lanes', columns: SECTOR_COLUMNS, rows: SECTOR_ROWS, systems: nearby };
  const thrown = rollJumpRoutes(probe, dice);
  const isNew = (entry) => fresh.has(entry.from) || fresh.has(entry.to);
  return Object.freeze({
    routes: Object.freeze(thrown.routes.filter(isNew)),
    checks: Object.freeze(thrown.checks.filter(isNew))
  });
}

/**
 * 0.80.0: lanes (p.2) thrown only for the pairs joining one set of systems to
 * another — the pairs a later change to the map left unthrown (Far Meridian's
 * v0.325.0 worlds against a neighbour charted before them). Pairs already
 * joined by a lane are left alone; beyond four hexes the table has no row.
 * fromIds / toIds: system ids on the sector map (sectorMap's ids).
 */
export function rollLanesBetween(sector, fromIds, toIds, dice) {
  const map = sectorMap(sector);
  const a = new Set(fromIds);
  const b = new Set(toIds);
  const laned = new Set((sector.routes ?? []).flatMap((route) => [`${route.from}|${route.to}`, `${route.to}|${route.from}`]));
  const systems = map.systems.filter((system) => a.has(system.id) || b.has(system.id));
  const probe = { id: `${sector.id}-between-lanes`, name: 'lanes', columns: SECTOR_COLUMNS, rows: SECTOR_ROWS, systems };
  const thrown = rollJumpRoutes(probe, dice);
  const crosses = (entry) => ((a.has(entry.from) && b.has(entry.to)) || (a.has(entry.to) && b.has(entry.from)))
    && !laned.has(`${entry.from}|${entry.to}`);
  return Object.freeze({
    routes: Object.freeze(thrown.routes.filter(crosses)),
    checks: Object.freeze(thrown.checks.filter(crosses))
  });
}
