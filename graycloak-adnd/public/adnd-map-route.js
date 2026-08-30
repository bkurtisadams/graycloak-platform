// adnd-map-route.js v0.8.0 — 2026-08-30
// Pure ordered-route selection adapter for the Graycloak world map.
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
    routeDistanceMiles,
    buildTravelPlan,
  };
})();
