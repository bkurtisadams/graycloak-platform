// adnd-map-view.js v1.5.0 — 2026-08-30
// v1.5.0 — expose a client-safe Begin Travel intent builder. The map can now
//          package selected Actor ids + ordered route cells + expected worldTick
//          for the authoritative command boundary, but still performs no writes.
// v1.4.0 — party-aware travel preview. Route-origin Actors can be selected,
//          explicit movement profiles are auto-filled when present, and local
//          preview-only Movement Rate overrides feed the v0.7/v0.8 travel
//          calculator. Shows duration, slowest Actor, and arrival worldTick;
//          still performs no writes or Begin Travel command.
// v1.3.0 — map route-selection adapter. Route mode collects an ordered chain
//          of adjacent subhexes while normal drag/wheel navigation remains
//          available. The selected route can be previewed against authored
//          terrain and handed to ADNDActivities, but this view still performs
//          no travel writes, Actor movement, or world-clock advancement.
// v1.2.0 — normalize characters through ADNDDocuments at the Firestore read
//          boundary so legacy and current records are Actor-shaped downstream.
// v1.1.1 — river tier key fix: great_river (matches
//          gcc-subhex-paths RIVER_TIERS), was greatriver. Width
//          only; visibility was never affected.
// v1.1.0 — party position + world clock (§6 milestone close-out).
//          With ?camp=<cid>: loads campaigns/{cid} and characters
//          where campaignId == cid; renders a party marker (gold
//          diamond + names) on each occupied currentLocation cell,
//          and the campaign's currentDate in the card header
//          formatted per the Greyhawk calendar ({year, month, day},
//          Fireseek = 1). Center preference: ?q&r → party →
//          settlement → authored cell → D4-86. No clock writes —
//          the GM sets campaigns/{cid}.currentDate (owner-gated
//          under rules v8).
// v1.0.0 — 2026-08-11
// Slice B: read-only player map. Fetches the published world from
// Firestore (regions/flanaess, subHexes/, lakes/, paths/, mapRegions/,
// settlements/, freeholds/ — all authed-read under rules v8) and
// renders an SVG hex map into #map-card. Geometry comes from the
// vendored @graycloak/map-engine build at public/vendor/map-engine
// (emitted by tsconfig.adnd.json, same pattern as the OSRIC 3 kernel).
// No writes, no fog, no party position yet — this is the §6 read
// pipeline milestone: sign in and see the authored world.
//
// View: drag to pan, wheel to zoom. URL overrides: ?q=<Q>&r=<R>
// centers on a subhex; default center is the first settlement found.
// Settlement / freehold markers link to the existing card readers
// (?settlement=<id> / ?freehold=<id>), preserving ?camp=.
//
// Scale notes: authored subhex override wins; otherwise a cell
// inherits its owning parent's Flanaess base terrain. Cells whose
// owner has no Flanaess entry don't render (world edge). Zoomed out
// past CELL_BUDGET cells, the renderer falls back to parent-hex fills
// so the whole Flanaess stays pannable.
const ADNDMapView = (function(){
  'use strict';

  const ENGINE_URL = './vendor/map-engine/index.js';
  // Mirrors gcc-map.js TERRAIN rgb values — display only.
  const TERRAIN_RGB = {
    clear: '245,232,190', plains: '195,215,100', forest: '70,120,55',
    hardwood: '100,150,70', conifer: '50,100,55', jungle: '35,75,40',
    hills: '150,120,80', forest_hills: '120,130,80', mountains: '110,90,75',
    desert: '220,150,90', barrens: '175,140,95', swamp: '90,100,65',
    river: '90,165,175',
    water: '55,105,155', water_fresh: '90,165,175',
    water_inland_sea: '70,140,175', water_coastal: '85,130,165',
    water_shallow: '55,110,160', water_deep: '35,75,130',
  };
  const RIVER_STROKE = 'rgb(70,140,175)';
  const ROAD_STROKE  = 'rgb(120,90,55)';
  const RIVER_W = { stream: 0.35, river: 0.6, great_river: 1.0 };
  // Greyhawk common-year months, currentDate.month 1-12 (Fireseek = 1).
  const GREYHAWK_MONTHS = ['Fireseek', 'Readying', 'Coldeven', 'Planting',
    'Flocktime', 'Wealsun', 'Reaping', 'Goodmonth', 'Harvester',
    'Patchwall', "Ready'reat", 'Sunsebb'];

  const PX_PER_UNIT = 6;      // screen px per world unit at zoom 1
  const ZOOM_MIN = 0.15, ZOOM_MAX = 10;
  const CELL_BUDGET = 6000;   // above this, drop to parent-level fills
  const PARENT_LABEL_ZOOM = 0.8;
  const GRID_COLS = 146, GRID_ROWS = 97;
  const CLICK_SLOP_PX = 4;
  let ME = null;              // map-engine module
  let _ready = null;

  function newRouteSelection(){
    if (typeof ADNDMapRoute !== 'undefined' && ADNDMapRoute &&
        typeof ADNDMapRoute.createSelection === 'function') {
      return ADNDMapRoute.createSelection();
    }
    return { active: false, cells: [], error: null };
  }
  function newTravelPartyState(){
    return {
      seedKey: null,
      selectedActorIds: [],
      movementOverrides: {},
    };
  }
  const state = {
    view: { cx: 0, cy: 0, zoom: 1 },
    data: null,               // { flanaess, subhex, lakes, paths, regions, settlements, freeholds }
    svg: null,
    raf: 0,
    route: newRouteSelection(),
    travelParty: newTravelPartyState(),
  };
  function ready(url){
    if (_ready) return _ready;
    _ready = import(url || ENGINE_URL)
      .then(mod => { ME = mod; return mod; })
      .catch(err => {
        console.error('[map-view] map-engine did not load:', err);
        ME = null;
        return null;
      });
    return _ready;
  }
  // ── Darlene labels ───────────────────────────────────────────────
  // Inverse of gcc-map.js darleneToInternal; round-trips its QA
  // corners (A-1 / P6-74 / A-97 / P6-170).
  function internalToDarlene(col, row){
    const idx = GRID_COLS - 1 - col;
    if (idx < 0 || col < 0 || row < 0 || row >= GRID_ROWS) return null;
    const letter = String.fromCharCode(65 + (idx % 26));
    const band = Math.floor(idx / 26);
    const offset = idx === 0 ? 0 : Math.floor(idx / 2) + 1;
    return `${letter}${band ? band + 1 : ''}-${row + 1 + offset}`;
  }
  // ── Data load ────────────────────────────────────────────────────
  function campaignId(){
    return new URLSearchParams(location.search).get('camp');
  }
  function normalizeCharacterRecord(record, id){
    if (typeof ADNDDocuments !== 'undefined' && ADNDDocuments
        && typeof ADNDDocuments.normalizeCharacter === 'function') {
      return ADNDDocuments.normalizeCharacter(record, id);
    }
    // index.html loads adnd-documents.js before this file. Keep a small
    // compatibility fallback so the map remains independently testable.
    const out = Object.assign({}, record || {});
    out.id = out.id || id || null;
    out.documentType = out.documentType || 'actor';
    out.type = out.type || 'character';
    out.runtime = Object.assign({
      lastResolvedTick: null,
      availableAtTick: null,
      activityId: null,
    }, out.runtime || {});
    return out;
  }
  async function loadAll(db){
    const col = async (name) => {
      const out = {};
      const snap = await db.collection(name).get();
      snap.forEach(doc => { out[doc.id] = doc.data(); });
      return out;
    };
    const cid = campaignId();
    const [flanaessSnap, subhex, lakes, paths, regions, settlements, freeholds,
           campSnap, charSnap] =
      await Promise.all([
        db.collection('regions').doc('flanaess').get(),
        col('subHexes'), col('lakes'), col('paths'),
        col('mapRegions'), col('settlements'), col('freeholds'),
        cid ? db.collection('campaigns').doc(cid).get() : Promise.resolve(null),
        cid ? db.collection('characters').where('campaignId', '==', cid).get()
            : Promise.resolve(null),
      ]);
    const characters = {};
    if (charSnap) charSnap.forEach(doc => {
      characters[doc.id] = normalizeCharacterRecord(doc.data(), doc.id);
    });
    return {
      flanaess: flanaessSnap.exists ? (flanaessSnap.data().hexes || {}) : {},
      subhex, lakes, paths, regions, settlements, freeholds,
      campaign: (campSnap && campSnap.exists) ? campSnap.data() : null,
      characters,
    };
  }
  function formatWorldDate(d){
    if (!d) return null;
    if (typeof d === 'string') return d;
    if (typeof d !== 'object' || typeof d.year !== 'number') return null;
    const month = GREYHAWK_MONTHS[(d.month || 1) - 1] || `month ${d.month}`;
    return `${d.day != null ? d.day + ' ' : ''}${month}, ${d.year} CY`;
  }
  // ── Geometry helpers ─────────────────────────────────────────────
  function hexPoints(cx, cy, r){
    const pts = [];
    for (let k = 0; k < 6; k++){
      const a = Math.PI / 3 * k;
      pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
    }
    return pts.join(' ');
  }
  function viewBbox(w, h){
    const v = state.view;
    const uw = w / (PX_PER_UNIT * v.zoom), uh = h / (PX_PER_UNIT * v.zoom);
    return { minX: v.cx - uw / 2, maxX: v.cx + uw / 2,
             minY: v.cy - uh / 2, maxY: v.cy + uh / 2, uw, uh };
  }
  function parentsInBbox(bb){
    const HEX_R = ME.HEX_R, SQ = ME.SQRT3;
    const c0 = Math.max(0, Math.floor((bb.minX - HEX_R) / (1.5 * HEX_R)) - 1);
    const c1 = Math.min(GRID_COLS - 1, Math.ceil((bb.maxX - HEX_R) / (1.5 * HEX_R)) + 1);
    const r0 = Math.max(0, Math.floor(bb.minY / (SQ * HEX_R)) - 1);
    const r1 = Math.min(GRID_ROWS - 1, Math.ceil(bb.maxY / (SQ * HEX_R)) + 1);
    const out = [];
    for (let col = c0; col <= c1; col++)
      for (let row = r0; row <= r1; row++) out.push({ col, row });
    return out;
  }
  function cellTerrain(Q, R){
    const ov = state.data.subhex[`subhex_${Q}_${R}`];
    if (ov && ov.lakeId && !(ov.terrain || '').startsWith('water')) return 'water_fresh';
    if (ov && ov.terrain) return ov.terrain;
    const o = ME.ownerOf(Q, R);
    return o ? (state.data.flanaess[`${o.col}-${o.row}`] || null) : null;
  }
  function subhexMilesPerStep(){
    const scale = ME && ME.SCALES && ME.SCALES.subhex;
    return scale && Number.isFinite(scale.milesAcross) ? scale.milesAcross : null;
  }
  function routeCells(){
    return state.route && Array.isArray(state.route.cells) ? state.route.cells : [];
  }
  function uniquePartyStartCell(){
    const seen = new Map();
    for (const ch of Object.values((state.data && state.data.characters) || {})){
      const loc = ch && ch.currentLocation;
      if (!loc || !Array.isArray(loc.subHexCoord) || loc.subHexCoord.length < 2) continue;
      const Q = loc.subHexCoord[0], R = loc.subHexCoord[1];
      if (!Number.isSafeInteger(Q) || !Number.isSafeInteger(R)) continue;
      seen.set(`${Q},${R}`, { Q, R });
    }
    return seen.size === 1 ? Array.from(seen.values())[0] : null;
  }
  function previewSelectedRoute(){
    if (typeof ADNDActivities === 'undefined' || !ADNDActivities ||
        typeof ADNDActivities.buildAuthoredRouteSegments !== 'function') {
      return { ok: false, code: 'activities-unavailable' };
    }
    const cells = routeCells();
    if (cells.length < 2) return { ok: false, code: 'route-too-short' };
    const miles = subhexMilesPerStep();
    if (!(miles > 0)) return { ok: false, code: 'map-scale-unavailable' };
    return ADNDActivities.buildAuthoredRouteSegments({
      routeCells: cells,
      routeMilesPerStep: miles,
      subhexes: (state.data && state.data.subhex) || {},
      parentTerrain: (state.data && state.data.flanaess) || {},
      ownerOf: ME && typeof ME.ownerOf === 'function' ? ME.ownerOf : null,
    });
  }
  function buildSelectedTravelPlan(input){
    if (typeof ADNDMapRoute === 'undefined' || !ADNDMapRoute ||
        typeof ADNDMapRoute.buildTravelPlan !== 'function') {
      return { ok: false, code: 'map-route-unavailable' };
    }
    input = input || {};
    const miles = subhexMilesPerStep();
    const request = Object.assign({}, input, {
      campaignId: input.campaignId || campaignId(),
      routeMilesPerStep: input.routeMilesPerStep || miles,
      subhexes: (state.data && state.data.subhex) || {},
      parentTerrain: (state.data && state.data.flanaess) || {},
      ownerOf: ME && typeof ME.ownerOf === 'function' ? ME.ownerOf : null,
    });
    if (request.worldTick == null && state.data && state.data.campaign &&
        typeof ADNDWorldClock !== 'undefined' && ADNDWorldClock &&
        typeof ADNDWorldClock.campaignWorldTick === 'function') {
      request.worldTick = ADNDWorldClock.campaignWorldTick(state.data.campaign);
    }
    return ADNDMapRoute.buildTravelPlan(state.route, request);
  }
  function campaignWorldTick(){
    if (!state.data || !state.data.campaign ||
        typeof ADNDWorldClock === 'undefined' || !ADNDWorldClock ||
        typeof ADNDWorldClock.campaignWorldTick !== 'function') return null;
    return ADNDWorldClock.campaignWorldTick(state.data.campaign);
  }
  function travelPartyCandidates(){
    if (typeof ADNDTravelParty === 'undefined' || !ADNDTravelParty ||
        typeof ADNDTravelParty.listCandidates !== 'function') return [];
    const cells = routeCells();
    const start = cells.length ? cells[0] : uniquePartyStartCell();
    if (!start) return [];
    return ADNDTravelParty.listCandidates(
      (state.data && state.data.characters) || {},
      start,
      campaignWorldTick(),
      campaignId(),
    );
  }
  function travelPartySeedKey(candidates){
    const cells = routeCells();
    const start = cells.length ? cells[0] : uniquePartyStartCell();
    if (!start) return 'none';
    return `${start.Q},${start.R}|${candidates.map(c => c.actorId).join(',')}`;
  }
  function ensureTravelPartySelection(){
    const candidates = travelPartyCandidates();
    const key = travelPartySeedKey(candidates);
    if (!state.travelParty) state.travelParty = newTravelPartyState();
    if (state.travelParty.seedKey !== key){
      state.travelParty.seedKey = key;
      state.travelParty.selectedActorIds = candidates.map(c => c.actorId);
    } else {
      const allowed = new Set(candidates.map(c => c.actorId));
      state.travelParty.selectedActorIds =
        state.travelParty.selectedActorIds.filter(id => allowed.has(id));
    }
    return candidates;
  }
  function selectedTravelActors(candidates){
    candidates = candidates || ensureTravelPartySelection();
    const selected = new Set((state.travelParty && state.travelParty.selectedActorIds) || []);
    return candidates.filter(c => selected.has(c.actorId)).map(c => c.actor);
  }
  function selectedMovementOverrides(actors){
    const out = {};
    const stored = (state.travelParty && state.travelParty.movementOverrides) || {};
    for (const actor of actors || []){
      const actorId = actor && actor.id != null ? String(actor.id) : null;
      if (!actorId) continue;
      if (Object.prototype.hasOwnProperty.call(stored, actorId) && stored[actorId] !== '') {
        out[actorId] = stored[actorId];
      }
    }
    return out;
  }
  function previewSelectedPartyTravel(){
    if (typeof ADNDTravelParty === 'undefined' || !ADNDTravelParty ||
        typeof ADNDTravelParty.buildPreview !== 'function') {
      return { ok: false, code: 'travel-party-unavailable' };
    }
    const route = previewSelectedRoute();
    if (!route.ok) return route;
    const candidates = ensureTravelPartySelection();
    const actors = selectedTravelActors(candidates);
    if (!actors.length) return { ok: false, code: 'no-selected-actors' };
    return ADNDTravelParty.buildPreview({
      actors,
      movementOverrides: selectedMovementOverrides(actors),
      routeSegments: route.routeSegments,
      routeMilesPerStep: route.routeMilesPerStep,
      routeSource: 'authored-map',
      worldTick: campaignWorldTick(),
    });
  }
  function buildSelectedPartyTravelPlan(input){
    if (typeof ADNDTravelParty === 'undefined' || !ADNDTravelParty ||
        typeof ADNDTravelParty.buildMovementProfiles !== 'function') {
      return { ok: false, code: 'travel-party-unavailable' };
    }
    const candidates = ensureTravelPartySelection();
    const actors = selectedTravelActors(candidates);
    if (!actors.length) return { ok: false, code: 'no-selected-actors' };
    const movement = ADNDTravelParty.buildMovementProfiles(
      actors,
      selectedMovementOverrides(actors),
    );
    if (!movement.ok) return movement;
    return buildSelectedTravelPlan(Object.assign({}, input || {}, {
      actors,
      movementProfiles: movement.movementProfiles,
    }));
  }
  function buildBeginTravelIntent(input){
    if (typeof ADNDCommands === 'undefined' || !ADNDCommands ||
        typeof ADNDCommands.createBeginTravelIntent !== 'function') {
      return { ok: false, code: 'commands-unavailable' };
    }
    const candidates = ensureTravelPartySelection();
    const actors = selectedTravelActors(candidates);
    if (!actors.length) return { ok: false, code: 'no-selected-actors' };
    const cells = routeCells();
    if (cells.length < 2) return { ok: false, code: 'route-too-short' };
    input = input || {};
    return ADNDCommands.createBeginTravelIntent({
      commandId: input.commandId,
      activityId: input.activityId,
      campaignId: input.campaignId || campaignId(),
      expectedWorldTick: input.expectedWorldTick == null
        ? campaignWorldTick() : input.expectedWorldTick,
      actorIds: actors.map(actor => String(actor.id)),
      routeCells: cells,
    });
  }

  function travelPreviewText(preview){
    if (!preview || !preview.ok){
      const code = preview && preview.code;
      if (code === 'route-too-short') return 'select at least two route cells';
      if (code === 'no-selected-actors') return 'select at least one traveler';
      if (code === 'missing-movement-profile') {
        const ids = (preview.missingActorIds || []).join(', ');
        return `enter Movement Rate${ids ? ` for ${ids}` : ''}`;
      }
      if (code === 'invalid-movement-profile') return 'one or more Movement Rates are invalid';
      if (code === 'unsupported-map-terrain') return `route blocked: ${preview.mapTerrain || 'unsupported terrain'}`;
      if (code === 'missing-map-terrain') return 'route enters an unauthored map cell';
      return code ? `preview unavailable: ${code}` : 'preview unavailable';
    }
    const travel = preview.outdoorTravel || {};
    const miles = Number.isFinite(travel.distanceMiles) ? `${travel.distanceMiles} mi` : 'distance ?';
    const duration = preview.durationText || `${preview.durationTicks} ticks`;
    const slow = preview.slowestActor
      ? `slowest ${preview.slowestActor.name} (MR ${preview.slowestActor.movementRate})`
      : 'slowest ?';
    const arrival = preview.arrivalTick == null
      ? 'arrival tick unavailable'
      : `arrival tick ${preview.arrivalTick}`;
    const availability = preview.canBegin
      ? 'all selected Actors current'
      : 'preview only · selected Actors not all current/bound';
    return `${miles} · ${duration} · ${slow} · ${arrival} · ${availability}`;
  }
  function refreshTravelPartyControls(){
    if (typeof document === 'undefined') return;
    const list = document.getElementById('map-travel-party-list');
    const previewEl = document.getElementById('map-travel-preview');
    if (!list || !previewEl) return;
    const cells = routeCells();
    if (!cells.length){
      list.innerHTML = '<span style="font-size:11px;color:#777;">select a route start to choose travelers</span>';
      previewEl.textContent = 'no travel preview';
      return;
    }
    const candidates = ensureTravelPartySelection();
    if (!candidates.length){
      list.innerHTML = '<span style="font-size:11px;color:#777;">no loaded Actors at route start</span>';
      previewEl.textContent = 'no travel preview';
      return;
    }
    const selected = new Set(state.travelParty.selectedActorIds);
    const overrides = state.travelParty.movementOverrides || {};
    list.innerHTML = candidates.map(c => {
      const checked = selected.has(c.actorId) ? ' checked' : '';
      let derived = '';
      if (c.movementProfile && typeof ADNDActivities !== 'undefined' && ADNDActivities &&
          typeof ADNDActivities.resolveMovementProfile === 'function') {
        const resolved = ADNDActivities.resolveMovementProfile(c.movementProfile);
        if (resolved.ok) derived = resolved.movementRate;
      }
      const value = Object.prototype.hasOwnProperty.call(overrides, c.actorId)
        ? overrides[c.actorId] : derived;
      const status = c.time && c.time.status ? c.time.status : 'unknown';
      return `<label style="display:inline-flex;align-items:center;gap:4px;margin:2px 10px 2px 0;font-size:11px;">`
        + `<input type="checkbox" data-travel-actor="${esc(c.actorId)}"${checked}>`
        + `<span>${esc(c.name)}</span>`
        + `<span style="color:#777;">${esc(status)}</span>`
        + `<span>MR</span>`
        + `<input type="number" min="0" step="1" data-travel-mr="${esc(c.actorId)}" value="${esc(value)}" placeholder="rate" style="width:58px;padding:2px 4px;font-size:11px;">`
        + `</label>`;
    }).join('');
    previewEl.textContent = travelPreviewText(previewSelectedPartyTravel());
  }
  function routeStatusText(){
    const cells = routeCells();
    if (state.route && state.route.error) {
      if (state.route.error === 'noncontiguous-route') return 'route cells must be adjacent';
      if (state.route.error === 'route-loop') return 'route cannot loop through a selected cell';
      return `route error: ${state.route.error}`;
    }
    if (cells.length === 0) return state.route && state.route.active
      ? 'click a start cell'
      : 'no route selected';
    if (cells.length === 1) return state.route && state.route.active
      ? `start ${cells[0].Q},${cells[0].R} · click an adjacent cell`
      : `start ${cells[0].Q},${cells[0].R}`;
    const preview = previewSelectedRoute();
    if (!preview.ok) {
      if (preview.code === 'unsupported-map-terrain') {
        return `route blocked by unsupported terrain: ${preview.mapTerrain || 'unknown'}`;
      }
      if (preview.code === 'missing-map-terrain') return 'route enters an unauthored map cell';
      return `route preview: ${preview.code}`;
    }
    const miles = (cells.length - 1) * preview.routeMilesPerStep;
    return `${cells.length} cells · ${miles} mi · ${preview.routeSegments.length} legs`;
  }
  function refreshRouteControls(){
    if (typeof document === 'undefined') return;
    const toggle = document.getElementById('map-route-toggle');
    const undo = document.getElementById('map-route-undo');
    const clear = document.getElementById('map-route-clear');
    const status = document.getElementById('map-route-status');
    if (toggle) toggle.textContent = state.route && state.route.active ? 'Stop Route' : 'Plan Route';
    if (undo) undo.disabled = routeCells().length === 0;
    if (clear) clear.disabled = routeCells().length === 0;
    if (status) status.textContent = routeStatusText();
  }
  function setRouteSelection(selection){
    state.route = selection || newRouteSelection();
    refreshRouteControls();
    refreshTravelPartyControls();
    scheduleRender();
  }
  function addRouteCell(cell){
    if (typeof ADNDMapRoute === 'undefined' || !ADNDMapRoute ||
        typeof ADNDMapRoute.appendCell !== 'function') return false;
    const result = ADNDMapRoute.appendCell(state.route, cell);
    setRouteSelection(result.selection);
    return !!result.ok;
  }
  // ── Render ───────────────────────────────────────────────────────
  function esc(s){
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function markerHref(param, id){
    const p = new URLSearchParams(location.search);
    p.delete('settlement'); p.delete('freehold'); p.delete('q'); p.delete('r');
    p.set(param, id);
    return '?' + p.toString();
  }
  function render(){
    const svg = state.svg;
    if (!svg || !state.data || !ME) return;
    const w = svg.clientWidth || 800, h = svg.clientHeight || 520;
    const bb = viewBbox(w, h);
    svg.setAttribute('viewBox',
      `${bb.minX.toFixed(2)} ${bb.minY.toFixed(2)} ${bb.uw.toFixed(2)} ${bb.uh.toFixed(2)}`);

    const cells = ME.cellsInAxialBbox(bb);
    const cellLevel = cells.length <= CELL_BUDGET;
    const chunks = [];
    // Terrain
    if (cellLevel){
      for (const c of cells){
        const t = cellTerrain(c.Q, c.R);
        if (!t) continue;
        const rgb = TERRAIN_RGB[t] || '200,200,200';
        const p = ME.subhexSvgCenter(c.Q, c.R);
        chunks.push(`<polygon points="${hexPoints(p.x, p.y, ME.SUB_R)}" fill="rgb(${rgb})" stroke="rgba(0,0,0,.06)" stroke-width=".05"/>`);
      }
    } else {
      for (const par of parentsInBbox(bb)){
        const t = state.data.flanaess[`${par.col}-${par.row}`];
        if (!t) continue;
        const rgb = TERRAIN_RGB[t] || '200,200,200';
        const p = ME.parentSvgCenter(par.col, par.row);
        chunks.push(`<polygon points="${hexPoints(p.x, p.y, ME.HEX_R)}" fill="rgb(${rgb})" stroke="rgba(0,0,0,.12)" stroke-width=".2"/>`);
      }
    }
    // Paths (rivers under roads)
    const pathDocs = Object.values(state.data.paths || {});
    for (const pass of ['river', 'road']){
      for (const pd of pathDocs){
        if (!Array.isArray(pd.cells) || pd.cells.length < 2) continue;
        const isRiver = pd.kind === 'river' || pd.tier;
        if ((pass === 'river') !== !!isRiver) continue;
        const pts = pd.cells.map(c => {
          const p = ME.subhexSvgCenter(c.Q, c.R);
          return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
        }).join(' ');
        if (isRiver){
          const wPx = RIVER_W[pd.tier] || RIVER_W.river;
          chunks.push(`<polyline points="${pts}" fill="none" stroke="${RIVER_STROKE}" stroke-width="${wPx}" stroke-linejoin="round" stroke-linecap="round"/>`);
        } else {
          const dash = pd.kind === 'trail' ? ' stroke-dasharray="0.8 0.5"' : '';
          chunks.push(`<polyline points="${pts}" fill="none" stroke="${ROAD_STROKE}" stroke-width="${pd.kind === 'trail' ? 0.3 : 0.45}"${dash} stroke-linejoin="round" stroke-linecap="round"/>`);
        }
      }
    }
    // Selected travel route. This is a local planning overlay only; no game state
    // changes occur until a future authoritative command commits a Travel Activity.
    const selectedRoute = routeCells();
    if (selectedRoute.length){
      const pts = selectedRoute.map(c => {
        const p = ME.subhexSvgCenter(c.Q, c.R);
        return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
      }).join(' ');
      if (selectedRoute.length > 1){
        chunks.push(`<polyline points="${pts}" fill="none" stroke="rgba(143,62,12,.95)" stroke-width=".72" stroke-linejoin="round" stroke-linecap="round" pointer-events="none"/>`);
      }
      selectedRoute.forEach((c, index) => {
        const p = ME.subhexSvgCenter(c.Q, c.R);
        chunks.push(`<polygon points="${hexPoints(p.x, p.y, ME.SUB_R * .88)}" fill="rgba(212,160,23,.18)" stroke="rgba(111,62,10,.95)" stroke-width=".28" pointer-events="none"/>`);
        chunks.push(`<text x="${p.x.toFixed(2)}" y="${(p.y + .52).toFixed(2)}" font-size="1.45" text-anchor="middle" font-weight="bold" fill="#5c2e0c" paint-order="stroke" stroke="rgba(250,248,242,.9)" stroke-width=".22" pointer-events="none">${index + 1}</text>`);
      });
    }
    // Parent outlines + Darlene labels
    if (state.view.zoom >= 0.35){
      for (const par of parentsInBbox(bb)){
        if (!state.data.flanaess[`${par.col}-${par.row}`]) continue;
        const p = ME.parentSvgCenter(par.col, par.row);
        chunks.push(`<polygon points="${hexPoints(p.x, p.y, ME.HEX_R)}" fill="none" stroke="rgba(40,30,10,.25)" stroke-width=".18"/>`);
        if (state.view.zoom >= PARENT_LABEL_ZOOM){
          const label = internalToDarlene(par.col, par.row);
          if (label) chunks.push(`<text x="${p.x.toFixed(2)}" y="${(p.y - ME.HEX_R * 0.78).toFixed(2)}" class="mv-parent-label">${esc(label)}</text>`);
        }
      }
    }
    // Region / lake name labels (centroid of member cells)
    if (cellLevel && state.view.zoom >= 0.6){
      const groups = { regionId: state.data.regions, lakeId: state.data.lakes };
      for (const field of Object.keys(groups)){
        const sums = {};
        for (const id of Object.keys(state.data.subhex)){
          const ov = state.data.subhex[id];
          const key = ov && ov[field];
          if (!key) continue;
          const m = /^subhex_(-?\d+)_(-?\d+)$/.exec(id);
          if (!m) continue;
          const p = ME.subhexSvgCenter(+m[1], +m[2]);
          (sums[key] = sums[key] || { x: 0, y: 0, n: 0 });
          sums[key].x += p.x; sums[key].y += p.y; sums[key].n++;
        }
        for (const key of Object.keys(sums)){
          const doc = groups[field][key];
          if (!doc || !doc.name) continue;
          const s = sums[key];
          const x = s.x / s.n, y = s.y / s.n;
          if (x < bb.minX || x > bb.maxX || y < bb.minY || y > bb.maxY) continue;
          chunks.push(`<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" class="mv-area-label${field === 'lakeId' ? ' mv-lake' : ''}">${esc(doc.name)}</text>`);
        }
      }
    }
    // Freeholds: territory ring + keep marker
    for (const id of Object.keys(state.data.freeholds || {})){
      const fh = state.data.freeholds[id];
      let p = null;
      if (fh.center && typeof fh.center.Q === 'number'){
        p = ME.subhexSvgCenter(fh.center.Q, fh.center.R);
      } else if (fh.regionalHexId){
        const par = darleneToInternal(fh.regionalHexId);
        if (par) p = ME.parentSvgCenter(par.col, par.row);
      }
      if (!p) continue;
      if (fh.radiusMiles){
        chunks.push(`<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${(fh.radiusMiles * ME.WORLD_UNITS_PER_MILE).toFixed(2)}" class="mv-freehold-ring"/>`);
      }
      chunks.push(
        `<a href="${esc(markerHref('freehold', id))}"><g class="mv-marker mv-freehold">`
        + `<rect x="${(p.x - 0.9).toFixed(2)}" y="${(p.y - 0.9).toFixed(2)}" width="1.8" height="1.8"/>`
        + `<text x="${p.x.toFixed(2)}" y="${(p.y - 1.5).toFixed(2)}">${esc(fh.name || id)}</text>`
        + `</g></a>`);
    }
    // Settlements
    for (const id of Object.keys(state.data.settlements || {})){
      const st = state.data.settlements[id];
      if (!Array.isArray(st.subHexCoord)) continue;
      const p = ME.subhexSvgCenter(st.subHexCoord[0], st.subHexCoord[1]);
      chunks.push(
        `<a href="${esc(markerHref('settlement', id))}"><g class="mv-marker mv-settlement">`
        + `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="1.1"/>`
        + `<text x="${p.x.toFixed(2)}" y="${(p.y - 1.7).toFixed(2)}">${esc(st.name || id)}</text>`
        + `</g></a>`);
    }
    // Party: characters grouped by occupied cell
    const byCell = {};
    for (const id of Object.keys(state.data.characters || {})){
      const ch = state.data.characters[id];
      const loc = ch.currentLocation;
      if (!loc || !Array.isArray(loc.subHexCoord)) continue;
      const key = `${loc.subHexCoord[0]}_${loc.subHexCoord[1]}`;
      (byCell[key] = byCell[key] || []).push(ch.name || id);
    }
    for (const key of Object.keys(byCell)){
      const [Q, R] = key.split('_').map(Number);
      const p = ME.subhexSvgCenter(Q, R);
      const names = byCell[key].join(', ');
      chunks.push(
        `<g class="mv-marker mv-party">`
        + `<polygon points="${p.x.toFixed(2)},${(p.y - 1.3).toFixed(2)} ${(p.x + 1.3).toFixed(2)},${p.y.toFixed(2)} ${p.x.toFixed(2)},${(p.y + 1.3).toFixed(2)} ${(p.x - 1.3).toFixed(2)},${p.y.toFixed(2)}"/>`
        + `<text x="${p.x.toFixed(2)}" y="${(p.y + 2.6).toFixed(2)}">${esc(names)}</text>`
        + `</g>`);
    }
    svg.innerHTML = chunks.join('');
  }
  function scheduleRender(){
    if (state.raf) return;
    state.raf = requestAnimationFrame(() => { state.raf = 0; render(); });
  }
  // Local port of gcc-map.js darleneToInternal (freehold parent fallback).
  function darleneToInternal(label){
    const m = String(label || '').trim().toUpperCase().match(/^([A-Z])(\d*)-(\d+)$/);
    if (!m) return null;
    const idx = (m[2] ? +m[2] - 1 : 0) * 26 + (m[1].charCodeAt(0) - 65);
    const col = GRID_COLS - 1 - idx;
    const offset = idx === 0 ? 0 : Math.floor(idx / 2) + 1;
    const row = +m[3] - 1 - offset;
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return { col, row };
  }
  // ── Interaction ──────────────────────────────────────────────────
  function clientToSubhex(svg, clientX, clientY){
    if (!svg || !ME || typeof ME.svgToAxial !== 'function') return null;
    const rect = svg.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) return null;
    const scale = PX_PER_UNIT * state.view.zoom;
    const wx = state.view.cx + (clientX - rect.left - rect.width / 2) / scale;
    const wy = state.view.cy + (clientY - rect.top - rect.height / 2) / scale;
    return ME.svgToAxial(wx, wy);
  }
  function wireRouteControls(){
    const toggle = document.getElementById('map-route-toggle');
    const undo = document.getElementById('map-route-undo');
    const clear = document.getElementById('map-route-clear');
    if (toggle) toggle.addEventListener('click', () => {
      if (typeof ADNDMapRoute === 'undefined' || !ADNDMapRoute) return;
      const activating = !(state.route && state.route.active);
      const start = activating && routeCells().length === 0 ? uniquePartyStartCell() : null;
      const result = ADNDMapRoute.setActive(state.route, activating, start);
      setRouteSelection(result.selection);
    });
    if (undo) undo.addEventListener('click', () => {
      if (typeof ADNDMapRoute === 'undefined' || !ADNDMapRoute) return;
      setRouteSelection(ADNDMapRoute.undoSelection(state.route).selection);
    });
    if (clear) clear.addEventListener('click', () => {
      if (typeof ADNDMapRoute === 'undefined' || !ADNDMapRoute) return;
      setRouteSelection(ADNDMapRoute.clearSelection(state.route).selection);
    });
    refreshRouteControls();
  }
  function wireTravelPartyControls(){
    const list = document.getElementById('map-travel-party-list');
    if (!list) return;
    list.addEventListener('change', (e) => {
      const target = e.target;
      if (!target || !state.travelParty) return;
      const actorId = target.getAttribute('data-travel-actor');
      if (actorId != null){
        const selected = new Set(state.travelParty.selectedActorIds || []);
        if (target.checked) selected.add(actorId); else selected.delete(actorId);
        state.travelParty.selectedActorIds = Array.from(selected);
        refreshTravelPartyControls();
        return;
      }
      const mrActorId = target.getAttribute('data-travel-mr');
      if (mrActorId != null){
        state.travelParty.movementOverrides[mrActorId] = target.value;
        refreshTravelPartyControls();
      }
    });
    refreshTravelPartyControls();
  }
  function wireInput(svg){
    let drag = null;
    svg.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('a')) return;      // let marker links click through
      drag = {
        x: e.clientX, y: e.clientY,
        cx: state.view.cx, cy: state.view.cy,
        moved: false,
      };
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) > CLICK_SLOP_PX || Math.abs(dy) > CLICK_SLOP_PX) drag.moved = true;
      const s = PX_PER_UNIT * state.view.zoom;
      state.view.cx = drag.cx - dx / s;
      state.view.cy = drag.cy - dy / s;
      scheduleRender();
    });
    svg.addEventListener('pointerup', (e) => {
      if (!drag) return;
      const wasClick = !drag.moved;
      drag = null;
      if (wasClick && state.route && state.route.active){
        const cell = clientToSubhex(svg, e.clientX, e.clientY);
        if (cell) addRouteCell(cell);
      }
    });
    svg.addEventListener('pointercancel', () => { drag = null; });
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const v = state.view;
      const rect = svg.getBoundingClientRect();
      const s0 = PX_PER_UNIT * v.zoom;
      const wx = v.cx + (e.clientX - rect.left - rect.width / 2) / s0;
      const wy = v.cy + (e.clientY - rect.top - rect.height / 2) / s0;
      const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
      v.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom * factor));
      const s1 = PX_PER_UNIT * v.zoom;
      v.cx = wx - (e.clientX - rect.left - rect.width / 2) / s1;
      v.cy = wy - (e.clientY - rect.top - rect.height / 2) / s1;
      scheduleRender();
    }, { passive: false });
  }
  // ── Boot ─────────────────────────────────────────────────────────
  function shell(msg){
    const card = document.getElementById('map-card');
    if (!card) return null;
    card.innerHTML = `
      <div class="map-card">
        <h2>World Map</h2>
        <div id="map-clock" class="map-clock"></div>
        <div class="map-hint">${esc(msg || 'drag to pan · wheel to zoom · route mode: click adjacent subhexes')}</div>
        <div id="map-route-controls" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 8px;">
          <button id="map-route-toggle" type="button" style="padding:5px 9px;margin:0;font-size:12px;">Plan Route</button>
          <button id="map-route-undo" type="button" style="padding:5px 9px;margin:0;font-size:12px;" disabled>Undo</button>
          <button id="map-route-clear" type="button" style="padding:5px 9px;margin:0;font-size:12px;" disabled>Clear</button>
          <span id="map-route-status" style="font-size:11px;color:#666;">no route selected</span>
        </div>
        <div id="map-travel-party" style="margin:0 0 8px;padding:6px 8px;border:1px solid rgba(0,0,0,.12);border-radius:4px;">
          <div style="font-size:11px;font-weight:700;margin-bottom:4px;">Travel Party</div>
          <div id="map-travel-party-list"></div>
          <div id="map-travel-preview" style="font-size:11px;color:#555;margin-top:4px;">no travel preview</div>
        </div>
        <svg id="map-svg" xmlns="http://www.w3.org/2000/svg"></svg>
      </div>`;
    return document.getElementById('map-svg');
  }
  function renderEmpty(msg){
    const card = document.getElementById('map-card');
    if (card) card.innerHTML = `<div class="map-empty">${esc(msg)}</div>`;
  }
  function pickCenter(){
    const p = new URLSearchParams(location.search);
    if (p.has('q') && p.has('r')){
      return ME.subhexSvgCenter(+p.get('q'), +p.get('r'));
    }
    const ch = Object.values(state.data.characters || {})
      .find(c => c.currentLocation && Array.isArray(c.currentLocation.subHexCoord));
    if (ch) return ME.subhexSvgCenter(
      ch.currentLocation.subHexCoord[0], ch.currentLocation.subHexCoord[1]);
    const st = Object.values(state.data.settlements || {})
      .find(s => Array.isArray(s.subHexCoord));
    if (st) return ME.subhexSvgCenter(st.subHexCoord[0], st.subHexCoord[1]);
    const ids = Object.keys(state.data.subhex);
    if (ids.length){
      const m = /^subhex_(-?\d+)_(-?\d+)$/.exec(ids[0]);
      if (m) return ME.subhexSvgCenter(+m[1], +m[2]);
    }
    return ME.parentSvgCenter(64, 44);   // D4-86, schema-doc starter
  }
  async function boot(){
    const svg = shell('loading world…');
    if (!svg) return;
    const [mod] = await Promise.all([ready()]);
    if (!mod){ renderEmpty('Map engine failed to load'); return; }
    const db = ADNDAuth.getDb();
    if (!db){ renderEmpty('Firestore not initialized'); return; }
    try {
      state.data = await loadAll(db);
    } catch(e){
      console.error('[map-view] load failed:', e);
      renderEmpty(`Map load failed: ${e.message}`);
      return;
    }
    state.route = newRouteSelection();
    state.travelParty = newTravelPartyState();
    const c = pickCenter();
    state.view.cx = c.x; state.view.cy = c.y; state.view.zoom = 1.6;
    state.svg = shell();
    const clockEl = document.getElementById('map-clock');
    if (clockEl){
      const date = formatWorldDate(state.data.campaign && state.data.campaign.currentDate);
      if (date) clockEl.textContent = date;
      else if (campaignId()) clockEl.textContent = 'world date not set';
      else clockEl.style.display = 'none';
    }
    wireRouteControls();
    wireTravelPartyControls();
    wireInput(state.svg);
    render();
    window.addEventListener('resize', scheduleRender);
    const counts = ['subhex', 'lakes', 'paths', 'regions', 'settlements', 'freeholds']
      .map(k => `${Object.keys(state.data[k]).length} ${k}`).join(', ');
    console.log(`[map-view] world loaded: ${counts}`);
  }
  if (typeof ADNDAuth !== 'undefined'){
    ADNDAuth.onAuthChange(user => {
      if (user) boot();
      else renderEmpty('Sign in to view the world map');
    });
  }

  return {
    ready, boot, render, internalToDarlene, darleneToInternal,
    formatWorldDate, normalizeCharacterRecord, loadAll,
    subhexMilesPerStep, routeCells, uniquePartyStartCell, previewSelectedRoute,
    buildSelectedTravelPlan, campaignWorldTick, travelPartyCandidates,
    ensureTravelPartySelection, selectedTravelActors, previewSelectedPartyTravel,
    buildSelectedPartyTravelPlan, buildBeginTravelIntent, travelPreviewText, routeStatusText,
    addRouteCell, clientToSubhex,
    state,
  };
})();
