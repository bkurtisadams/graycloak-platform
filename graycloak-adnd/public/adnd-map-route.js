// adnd-map-route.js v0.9.0 — 2026-10-26
// Pure ordered-route selection adapter for the Graycloak world map.
//
// v0.9.0 adds findRoute(): A* over the hex grid using authored terrain, so a
// click on a distant cell can be expanded into a legal adjacent chain. Cost
// is travel time (1 / miles-per-movement factor per cell), so the planner
// prefers plains over mountains rather than fewest hops; water and unauthored
// cells are impassable. The result is still only a client-side selection —
// the trusted runtime revalidates every cell when travel begins.
//
// This layer knows nothing about DOM rendering or Firestore. It keeps an ordered
// list of adjacent subhex cells and can hand that selection to ADNDActivities'
// authored-map travel planner. Map UI code may use it for click-to-route without
// giving the browser authority to move Actors or commit Activities.
const ADNDMapRoute = (function(){
  'use strict';

  const ROUTE_VERSION = 1;
  const ROUTE_ERROR = Object.freeze({
    INVALID_SELECTION: 'invalid-selection',
    INVALID_CELL: 'invalid-cell',
    NONCONTIGUOUS_ROUTE: 'noncontiguous-route',
    ROUTE_LOOP: 'route-loop',
    ROUTE_TOO_SHORT: 'route-too-short',
    ACTIVITIES_UNAVAILABLE: 'activities-unavailable',
    INVALID_MAP_ADAPTER: 'invalid-map-adapter',
    NO_ROUTE: 'no-route',
    ROUTE_SEARCH_LIMIT: 'route-search-limit',
  });

  function normalizeCell(value){
    if (typeof ADNDActivities !== 'undefined' && ADNDActivities &&
        typeof ADNDActivities.normalizeAxialCoord === 'function') {
      return ADNDActivities.normalizeAxialCoord(value);
    }
    let Q = null, R = null;
    if (Array.isArray(value) && value.length >= 2){
      Q = value[0]; R = value[1];
    } else if (value && typeof value === 'object') {
      if (Array.isArray(value.subHexCoord) && value.subHexCoord.length >= 2){
        Q = value.subHexCoord[0]; R = value.subHexCoord[1];
      } else {
        Q = value.Q; R = value.R;
      }
    }
    if (!Number.isSafeInteger(Q) || !Number.isSafeInteger(R)) return null;
    return { Q, R };
  }

  function sameCell(a, b){
    const aa = normalizeCell(a), bb = normalizeCell(b);
    return !!aa && !!bb && aa.Q === bb.Q && aa.R === bb.R;
  }

  function axialDistance(a, b){
    if (typeof ADNDActivities !== 'undefined' && ADNDActivities &&
        typeof ADNDActivities.axialDistance === 'function') {
      return ADNDActivities.axialDistance(a, b);
    }
    const aa = normalizeCell(a), bb = normalizeCell(b);
    if (!aa || !bb) return null;
    const dQ = aa.Q - bb.Q;
    const dR = aa.R - bb.R;
    return Math.max(Math.abs(dQ), Math.abs(dR), Math.abs(dQ + dR));
  }

  function cloneCells(cells){
    return Array.isArray(cells)
      ? cells.map(normalizeCell).filter(Boolean).map(c => ({ Q: c.Q, R: c.R }))
      : [];
  }

  function createSelection(input){
    input = input || {};
    const cells = cloneCells(input.cells);
    return {
      active: !!input.active,
      cells,
      error: input.error || null,
    };
  }

  function setActive(selection, active, startCell){
    const next = createSelection(selection);
    next.active = !!active;
    next.error = null;
    if (next.active && next.cells.length === 0 && startCell != null){
      const start = normalizeCell(startCell);
      if (!start) return { ok: false, code: ROUTE_ERROR.INVALID_CELL, selection: next };
      next.cells.push(start);
    }
    return { ok: true, selection: next };
  }

  function clearSelection(selection){
    const next = createSelection(selection);
    next.cells = [];
    next.error = null;
    return { ok: true, selection: next };
  }

  function undoSelection(selection){
    const next = createSelection(selection);
    if (next.cells.length > 0) next.cells.pop();
    next.error = null;
    return { ok: true, selection: next };
  }

  function appendCell(selection, value){
    const next = createSelection(selection);
    const cell = normalizeCell(value);
    if (!cell) {
      next.error = ROUTE_ERROR.INVALID_CELL;
      return { ok: false, code: ROUTE_ERROR.INVALID_CELL, selection: next };
    }
    next.error = null;
    if (next.cells.length === 0){
      next.cells.push(cell);
      return { ok: true, action: 'start', selection: next };
    }

    const last = next.cells[next.cells.length - 1];
    if (sameCell(last, cell)) return { ok: true, action: 'same-cell', selection: next };

    // Clicking the immediately previous cell is a convenient map-native undo.
    if (next.cells.length >= 2 && sameCell(next.cells[next.cells.length - 2], cell)){
      next.cells.pop();
      return { ok: true, action: 'backtrack', selection: next };
    }

    if (axialDistance(last, cell) !== 1){
      next.error = ROUTE_ERROR.NONCONTIGUOUS_ROUTE;
      return { ok: false, code: ROUTE_ERROR.NONCONTIGUOUS_ROUTE, selection: next };
    }
    if (next.cells.some(existing => sameCell(existing, cell))){
      next.error = ROUTE_ERROR.ROUTE_LOOP;
      return { ok: false, code: ROUTE_ERROR.ROUTE_LOOP, selection: next };
    }

    next.cells.push(cell);
    return { ok: true, action: 'append', selection: next };
  }

  function routeDistanceMiles(selection, milesPerStep){
    const sel = createSelection(selection);
    if (!(Number.isFinite(milesPerStep) && milesPerStep > 0)) return null;
    return Math.max(0, sel.cells.length - 1) * milesPerStep;
  }

  // ── Pathfinding ──────────────────────────────────────────────────
  const AXIAL_DIRS = Object.freeze([[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]);
  const DEFAULT_MAX_EXPANSIONS = 20000;

  function enteredCellCost(cell, input){
    if (typeof ADNDActivities === 'undefined' || !ADNDActivities ||
        typeof ADNDActivities.resolveAuthoredCellTerrain !== 'function') return null;
    const resolved = ADNDActivities.resolveAuthoredCellTerrain(cell, input);
    if (!resolved || !resolved.ok) return null;
    const factors = ADNDActivities.TERRAIN_MILES_PER_MOVEMENT || {};
    const factor = factors[resolved.terrain];
    if (!(factor > 0)) return null;
    return 1 / factor;   // relative days per cell: level 5, rugged 6.67, very rugged 10
  }

  // A* from start to goal over adjacent subhexes. Returns the full chain
  // including start and goal, or { ok:false, code } when no path exists.
  function findRoute(start, goal, input){
    const a = normalizeCell(start), b = normalizeCell(goal);
    if (!a || !b) return { ok: false, code: ROUTE_ERROR.INVALID_CELL };
    input = input || {};
    if (!input.subhexes || !input.parentTerrain) return { ok: false, code: ROUTE_ERROR.INVALID_MAP_ADAPTER };
    if (sameCell(a, b)) return { ok: true, cells: [{ Q: a.Q, R: a.R }], cost: 0, expansions: 0 };
    const maxExpansions = Number.isInteger(input.maxExpansions) && input.maxExpansions > 0
      ? input.maxExpansions : DEFAULT_MAX_EXPANSIONS;
    const factors = (typeof ADNDActivities !== 'undefined' && ADNDActivities && ADNDActivities.TERRAIN_MILES_PER_MOVEMENT) || {};
    const bestFactor = Math.max(...Object.values(factors).filter(f => f > 0), 0.2);
    const minCost = 1 / bestFactor;
    const key = c => `${c.Q},${c.R}`;
    const h = c => axialDistance(c, b) * minCost;
    const open = [{ cell: a, f: h(a) }];
    const g = new Map([[key(a), 0]]);
    const came = new Map();
    const closed = new Set();
    const costCache = new Map();
    const cellCost = c => {
      const k = key(c);
      if (!costCache.has(k)) costCache.set(k, enteredCellCost(c, input));
      return costCache.get(k);
    };
    let expansions = 0;
    while (open.length){
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      const current = open.splice(bi, 1)[0].cell;
      const ck = key(current);
      if (closed.has(ck)) continue;
      closed.add(ck);
      if (sameCell(current, b)){
        const cells = [];
        let k = ck;
        while (k){ const [Q, R] = k.split(',').map(Number); cells.push({ Q, R }); k = came.get(k); }
        cells.reverse();
        return { ok: true, cells, cost: g.get(ck), expansions };
      }
      if (++expansions > maxExpansions) return { ok: false, code: ROUTE_ERROR.ROUTE_SEARCH_LIMIT, expansions };
      for (const [dq, dr] of AXIAL_DIRS){
        const next = { Q: current.Q + dq, R: current.R + dr };
        const nk = key(next);
        if (closed.has(nk)) continue;
        const step = cellCost(next);
        if (step === null) continue;
        const tentative = g.get(ck) + step;
        if (g.has(nk) && tentative >= g.get(nk)) continue;
        g.set(nk, tentative);
        came.set(nk, ck);
        open.push({ cell: next, f: tentative + h(next) });
      }
    }
    return { ok: false, code: ROUTE_ERROR.NO_ROUTE, expansions };
  }

  // Append a possibly distant cell: adjacent cells append directly; others are
  // expanded through findRoute() from the current end of the selection.
  function appendPath(selection, value, input){
    const next = createSelection(selection);
    const cell = normalizeCell(value);
    if (!cell) return appendCell(next, value);
    if (next.cells.length === 0 || axialDistance(next.cells[next.cells.length - 1], cell) <= 1) {
      return appendCell(next, cell);
    }
    const found = findRoute(next.cells[next.cells.length - 1], cell, input);
    if (!found.ok) {
      next.error = found.code;
      return { ok: false, code: found.code, selection: next };
    }
    let sel = next;
    for (const step of found.cells.slice(1)){
      const r = appendCell(sel, step);
      if (!r.ok) return r;
      sel = r.selection;
    }
    return { ok: true, action: 'path', selection: sel, added: found.cells.length - 1, cost: found.cost };
  }

  function buildTravelPlan(selection, input){
    const sel = createSelection(selection);
    if (sel.cells.length < 2) {
      return { ok: false, code: ROUTE_ERROR.ROUTE_TOO_SHORT };
    }
    if (typeof ADNDActivities === 'undefined' || !ADNDActivities ||
        typeof ADNDActivities.createAuthoredMapTravelPlan !== 'function') {
      return { ok: false, code: ROUTE_ERROR.ACTIVITIES_UNAVAILABLE };
    }
    input = input || {};
    if (!(Number.isFinite(input.routeMilesPerStep) && input.routeMilesPerStep > 0) ||
        !input.subhexes || !input.parentTerrain || typeof input.ownerOf !== 'function') {
      return { ok: false, code: ROUTE_ERROR.INVALID_MAP_ADAPTER };
    }
    const request = Object.assign({}, input, {
      routeCells: sel.cells.map(c => [c.Q, c.R]),
    });
    return ADNDActivities.createAuthoredMapTravelPlan(request);
  }

  return {
    ROUTE_VERSION,
    ROUTE_ERROR,
    normalizeCell,
    sameCell,
    axialDistance,
    createSelection,
    setActive,
    clearSelection,
    undoSelection,
    appendCell,
    findRoute,
    appendPath,
    routeDistanceMiles,
    buildTravelPlan,
  };
})();
