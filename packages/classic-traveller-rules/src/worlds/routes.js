// routes.js — the charted space lanes of a subsector.
//
// v0.70.0. Book 3 (1977) p.2-3, Route Determination: each pair of worlds
// within four hexes is checked once, one die against the jump routes table
// by the two starport types and the distance; equal or greater charts a
// lane. Class X has no row and never holds a lane.
//
// Lanes are map data, rolled once when a subsector is made and kept on it
// (subsector.routes), so every campaign in that subsector sees the same map.
// Book 2 p.32 then sells a flight-plan cassette for each lane; anywhere else
// needs the Generate program.

import { requireDice } from '../dice.js';
import { assertValidAuthoredSubsector, subsectorHexDistance } from './subsector.js';

const STARPORT_ORDER = 'ABCDE';

// Book 3 p.3. Throw one die; null where the table prints a dash.
export const JUMP_ROUTES_TABLE = Object.freeze({
  'A-A': Object.freeze([1, 2, 4, 5]),
  'A-B': Object.freeze([1, 3, 4, 5]),
  'A-C': Object.freeze([1, 4, 6, null]),
  'A-D': Object.freeze([1, 5, null, null]),
  'A-E': Object.freeze([2, null, null, null]),
  'B-B': Object.freeze([1, 3, 4, 6]),
  'B-C': Object.freeze([2, 4, 6, null]),
  'B-D': Object.freeze([3, 6, null, null]),
  'B-E': Object.freeze([4, null, null, null]),
  'C-C': Object.freeze([3, 6, null, null]),
  'C-D': Object.freeze([4, null, null, null]),
  'C-E': Object.freeze([4, null, null, null]),
  'D-D': Object.freeze([4, null, null, null]),
  'D-E': Object.freeze([5, null, null, null]),
  'E-E': Object.freeze([6, null, null, null])
});
export const MAX_ROUTE_DISTANCE = 4;

export function routePairKey(starportA, starportB) {
  const a = String(starportA ?? '').trim().toUpperCase();
  const b = String(starportB ?? '').trim().toUpperCase();
  if (!STARPORT_ORDER.includes(a) || !STARPORT_ORDER.includes(b) || !a || !b) return null;
  return STARPORT_ORDER.indexOf(a) <= STARPORT_ORDER.indexOf(b) ? `${a}-${b}` : `${b}-${a}`;
}

/** The throw that charts a lane, or null where none can exist. */
export function jumpRouteThrow(starportA, starportB, distance) {
  if (!Number.isInteger(distance) || distance < 1 || distance > MAX_ROUTE_DISTANCE) return null;
  const key = routePairKey(starportA, starportB);
  return key ? JUMP_ROUTES_TABLE[key][distance - 1] : null;
}

const starportOf = (system) => String(system?.mainWorld?.uwp ?? '').trim().charAt(0).toUpperCase();

/**
 * Book 3 p.2: every pair within four hexes, once. Returns the lanes charted
 * and every check made, for a referee who wants to see the throws.
 */
export function rollJumpRoutes(subsector, dice) {
  assertValidAuthoredSubsector(subsector);
  requireDice(dice);
  const systems = [...subsector.systems].sort((a, b) => a.hex.localeCompare(b.hex));
  const checks = [];
  for (let i = 0; i < systems.length; i += 1) {
    for (let j = i + 1; j < systems.length; j += 1) {
      const a = systems[i];
      const b = systems[j];
      const distance = subsectorHexDistance(a.hex, b.hex);
      const target = jumpRouteThrow(starportOf(a), starportOf(b), distance);
      if (target === null) continue;
      const roll = dice.rollD6();
      checks.push(Object.freeze({ from: a.id, to: b.id, distance, target, roll, charted: roll >= target }));
    }
  }
  const routes = checks.filter((entry) => entry.charted).map((entry) => Object.freeze({ from: entry.from, to: entry.to, distance: entry.distance }));
  return Object.freeze({ routes: Object.freeze(routes), checks: Object.freeze(checks) });
}

export function subsectorRoutes(subsector) {
  return Array.isArray(subsector?.routes) ? subsector.routes : [];
}

/** True when a charted lane joins the two systems, in either direction. */
export function laneBetween(subsector, systemIdA, systemIdB) {
  return subsectorRoutes(subsector).some((route) => (route.from === systemIdA && route.to === systemIdB) || (route.from === systemIdB && route.to === systemIdA));
}

export function lanesFrom(subsector, systemId) {
  return subsectorRoutes(subsector)
    .filter((route) => route.from === systemId || route.to === systemId)
    .map((route) => Object.freeze({ systemId: route.from === systemId ? route.to : route.from, distance: route.distance }));
}
