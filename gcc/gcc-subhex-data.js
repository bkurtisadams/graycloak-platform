// gcc-subhex-data.js v2.8.1 — 2026-05-03
// v2.8.1: save() uses GCCSubhexStore.putBatch() to write all dirty
// entries in a single IDB transaction, instead of one-transaction-
// per-entry. Earlier observed: 50k cells took ~30 minutes via
// 50k sequential puts; with putBatch it's seconds. Pairs with
// gcc-subhex-store v0.2.0.
//
// v2.8.0 — 2026-05-03
// v2.8.0: IndexedDB-backed canonical persistence (slice F1 of the
// Firestore migration). localStorage was hitting its 5MB quota at
// 50k+ overrides on May 3, 2026. Overrides now live in IDB
// (database 'gcc-subhex', store 'overrides'); localStorage stays
// as a size-capped boot cache (top 2000 most-recent entries) so
// hard-reload renders instantly while IDB warms up. IDB has no
// practical cap for this scale — typical browser quotas are
// hundreds of MB.
//
// Boot flow:
//   1. Module load reads localStorage synchronously into OVERRIDES
//      (back-compat; warm cache).
//   2. Background: GCCSubhexStore.ready() → loadAll() → merges IDB
//      entries into OVERRIDES, fires gcc-subhex-changed when done.
//   3. UI shows whatever's in OVERRIDES at any moment; IDB-only
//      cells appear after step 2 (~100-300ms typical).
//
// Save flow (unchanged from caller perspective):
//   - In-memory OVERRIDES updated synchronously
//   - save() enqueues IDB write via store.put() (async, queued)
//   - save() also writes the bounded boot cache to localStorage
//   - flushOverrides() awaits the IDB write queue drain
//
// Migration:
//   - First ready() with empty IDB and non-empty localStorage
//     copies every entry into IDB. Boot cache stays intact.
//   - Slice F2 will add Firestore as the cross-device sync layer
//     on top of IDB (IDB stays the local cache).
//
// Save error surfacing (v2.6.0+ contract still honored):
//   - 'gcc-storage-error' event with { key, error, message }
//   - localStorage failures: key='gcc-subhex-overrides' (boot cache
//     quota — non-fatal, IDB is the real save)
//   - IDB failures: key='gcc-subhex (idb)' (these are real)
//
// REGIONS / LAKES are NOT yet on IDB in F1 — they remain
// localStorage-only. Both are small (<100 entries typical). Slice
// F2 moves them.
//
// v2.7.0 — 2026-05-03
// v2.7.0: per-override `source` field. Records who wrote each
// override so future cleanup can distinguish hand-authoring from
// scanner output without heuristics. Default 'authored' for any
// caller that doesn't supply one (covers the existing in-app paint
// / outline / hex-editor paths). Edge scanner passes its mode-
// specific source (e.g. 'scanner-coast-v1', 'scanner-river-v1').
// Fully back-compat: existing entries without a `source` field are
// treated as 'authored' on read; getSubhex returns it untouched.
// Motivation: May 3 cleanup of 14,594 stale scanner entries had
// to fall back to "no name/notes/feature/regionId/lakeId = scanner"
// heuristic, which is fragile and would mis-flag any future
// hand-painted plain-terrain cells.
//
// v2.6.0 — 2026-05-03
// v2.6.0: surface localStorage save errors. Previously every save
// path used `try { localStorage.setItem(...) } catch(e){}` with an
// empty catch — quota errors and other write failures silently
// dropped on the floor. May 3 incident: full-map Coast scanner
// pushed the subhex blob past the per-origin quota; saves threw
// QuotaExceededError every time, in-memory state diverged from
// localStorage, on reload all post-scan work appeared to vanish.
// This release: catch blocks log the error to console.error AND
// dispatch a `gcc-storage-error` window event with { key, error }
// so UI can surface a toast/banner. Same pattern applied to OVERRIDES,
// REGIONS, LAKES, and the v1.1→v2.0 migration block.
// v2.5.0: bulk-write hooks. setSubhexOverride and clearSubhex accept
// an optional `opts.deferSave` flag that suppresses the per-call save()
// (which serializes the entire OVERRIDES object). flushOverrides()
// performs an explicit save when the bulk caller is done. peekOverride
// (Q, R) returns the raw OVERRIDES entry (or undefined) without
// running canonicalSubhex/proceduralTerrain — much faster than
// getSubhex when the caller only needs to know whether an override
// already exists.
//
// Default behavior unchanged: callers that don't pass opts get the
// same per-call save semantics as before.
//
// Motivation: coast scanner's bulk apply writes 100k+ subhex
// overrides in one operation. Per-call save() did O(N²) total work
// because each save serializes the whole OVERRIDES object.
//
// v2.4.0 — 2026-04-30
// v2.4.0: lakes — first-class records (storage key gcc-subhex-lakes,
// schema v1: { id, kind:'lake'|'sea', name, depth:'shallow'|'deep',
// regionId?, notes, schemaVersion, authoredAt }). Cells gain optional
// lakeId pointer. Invariant: lakeId non-null ⟺ cell terrain ∈
// WATER_TERRAINS; setSubhexOverride auto-clears lakeId when terrain
// transitions to non-water. New CRUD: createLake, getLake, listLakes,
// renameLake, deleteLake, setCellLake, unsetCellLake, lakeMembers,
// lakesInParent, parentHasLakeAuthoring. Cell schema is unchanged
// (still v2) — lakeId is additive, lazy migration, v2 readers ignore it.
// Lake docs are independently versioned (LAKE_SCHEMA_VERSION).
// Per design DESIGN-paths-water.md (Slice 1).
// v2.3.0 — 2026-04-30
// v2.3.0: landmark pinning. The subhex layer can now refine WHERE
// in a 30-mile parent a settlement sits. New optional feature
// field `landmarkId` (the parent's Darlene hex ID) marks the cell
// as the precise location of that landmark. The subhex doesn't
// own the metadata — name, kind, pop, ruler still live in
// gcc-landmarks; the subhex just owns the placement. Helpers:
//   findCellPinnedToLandmark(landmarkId) — { Q, R } | null
//   pinLandmarkToCell(Q, R, landmarkId)  — moves any prior pin
//   unpinLandmark(landmarkId)            — clears the pin only
// FEATURE_KINDS gains 'city' and 'town' so the glyph layer can
// scale settlements; without a landmarkId pin these are homebrew
// settlements (the parent layer remains the source of truth for
// canonical/named settlements).
// v2.2.0: feature.notes — bridges/fords/ferries/crossroads can carry
// free-form notes alongside the existing name. New getCellFeature(Q,R)
// helper returns just the feature without terrain plumbing, for
// callers (subhex paths, journey planner) that only need the feature.
// v2.1.0: add bridge / ford / crossroads / ferry to FEATURE_KINDS
// for path-crossing features. No schema change; existing
// authored features remain valid.
// v2.0.1: fragmentsForParent now uses SAT polygon-overlap instead of
// a circular reach test. The circle-of-radius-22 test included ~50
// cells per parent; only ~33 actually overlap the parent's hex
// polygon. The over-included cells rendered as floating hexes outside
// the parent boundary, which looked wrong now that we don't clip.
// Subhex data layer rebuilt on a global axial coord model. Replaces the
// per-parent local (q,r) ∈ [0..10] layout (v0.4–v1.1), which did not tile
// across parent boundaries.
//
// ── Geometry (verified) ────────────────────────────────────────────────────
// Main map: HEX_R=20 SVG units, flat-top, neighbor distance = HEX_R*√3 ≈
// 34.64 SVG = 30 miles. So 1 mi = HEX_R*√3/30 SVG and a 3-mile subhex has
// neighbor distance 2√3 SVG units, giving sub_R = 2.0 SVG (exact 10:1).
//
// ── Coords ─────────────────────────────────────────────────────────────────
// Subhex axial (Q, R) ∈ ℤ. Origin: ANCHOR_COL=70, ANCHOR_ROW=50 — the
// parent at that offset position has its center subhex at (Q,R)=(0,0).
// Once chosen this anchor is fixed forever; changing it requires
// rewriting every doc id.
//
// Parent (col, row) center axial (closed-form):
//   Q = (col - ANCHOR_COL) * 10
//   R = 10*(row - ANCHOR_ROW) - 5*(col - ANCHOR_COL) + 5*(col%2 - ANCHOR_COL%2)
//
// Owner of subhex (Q, R) = parent whose center is closest in SVG distance.
// Ties resolved by lower col, then lower row.
//
// ── Doc ids ────────────────────────────────────────────────────────────────
// Cells:    `subhex_${Q}_${R}`        (Q/R may be negative)
// Regions:  `region_${localId}`        (was `${parentId}__${localId}`)
// Members are scanned from cell.regionId — no parallel list to keep in sync.
//
// ── Schema (v2) ────────────────────────────────────────────────────────────
// Cell override doc fields (all optional, doc removed when fully empty):
//   terrain   : terrain key string or null
//   name      : cell name
//   notes     : freeform GM notes
//   feature   : { kind, name?, libraryId? } or null
//   regionId  : region localId reference, or null
//   schemaVersion: 2
//   authoredAt: ts
//
// Region doc:
//   { id (localId), name, terrain, schemaVersion: 2, authoredAt }
// Regions are now global — a region can span multiple parents.
//
// ── Migration v1.1 → v2.0 ──────────────────────────────────────────────────
// For each existing override `${parentId}__${q}_${r}` where (q,r)∈[0..10]
// with center (5,5):
//   1. Resolve parent (col, row) via window.darleneToInternal
//   2. parent_center_axial(col, row) = (PQ, PR)
//   3. New axial = (PQ + q - 5, PR + r - 5)
//   4. Re-key to `subhex_${Q}_${R}`
// Regions: re-key from `${parentId}__${localId}` to `region_${localId}`,
// renaming on collision so two parents with a "swamp" region become
// "swamp" and "swamp-2".
// Paths: handled in gcc-subhex-paths.js v1.0 (mirror migration).
// Guarded by MIGRATION_FLAG_KEY 'gcc-subhex-migrated-v5' (bumped from v4).

(function(){
  'use strict';

  const WORLD_SEED = 'greyhawk-flanaess-v1';
  const SCHEMA_VERSION = 2;

  // Anchor — fixed forever once chosen. Center of the Greyhawk map area.
  const ANCHOR_COL = 70;
  const ANCHOR_ROW = 50;

  // World SVG geometry (mirrors greyhawk-map.html). HEX_R is canonical.
  const HEX_R = 20;
  const SUB_R = 2;                  // = HEX_R / 10, exact
  const SQRT3 = Math.sqrt(3);

  const LS_KEY = 'gcc-subhex-overrides';
  const LS_REGIONS_KEY = 'gcc-subhex-regions';
  const LS_LAKES_KEY = 'gcc-subhex-lakes';
  const MIGRATION_FLAG_KEY = 'gcc-subhex-migrated-v5';
  const PARENT_BIAS = 0.75;

  // Per-parent-terrain variation tables (carried over from v1.1).
  const VARIATION = {
    clear:        { plains: 4, forest: 2, hills: 2, hardwood: 1 },
    plains:       { clear: 3, forest: 2, hills: 2, hardwood: 1, swamp: 1 },
    forest:       { hardwood: 4, clear: 2, hills: 2, swamp: 1 },
    hardwood:     { forest: 4, conifer: 2, hills: 2, clear: 1 },
    conifer:      { hardwood: 3, forest: 2, mountains: 2, hills: 1 },
    jungle:       { swamp: 3, forest: 2, hills: 1 },
    hills:        { plains: 3, forest: 2, mountains: 2, forest_hills: 2, clear: 1 },
    forest_hills: { hills: 3, hardwood: 3, forest: 2, mountains: 1 },
    mountains:    { hills: 4, forest_hills: 2, conifer: 1 },
    desert:       { barrens: 3, plains: 2, hills: 1 },
    barrens:      { desert: 3, hills: 2, plains: 1 },
    swamp:        { forest: 2, plains: 2, water_fresh: 1 },
    water:            { water: 1 },
    water_fresh:      { water_fresh: 1 },
    water_inland_sea: { water_inland_sea: 1 },
    water_coastal:    { water_coastal: 1 },
    water_shallow:    { water_shallow: 1 },
    water_deep:       { water_deep: 1 },
  };

  const FEATURE_KINDS = [
    'city', 'town',
    'castle', 'ruin', 'tower', 'village',
    'camp', 'cache', 'shrine', 'lair',
    'grave', 'landmark',
    'bridge', 'ford', 'crossroads', 'ferry',
  ];
  const FEATURE_KINDS_SET = new Set(FEATURE_KINDS);

  // Water-terrain set. Membership in this set gates lake assignment:
  // a cell may carry lakeId only if its effective terrain is one of
  // these. Mirrors the keys in VARIATION above.
  const WATER_TERRAINS = new Set([
    'water', 'water_fresh', 'water_inland_sea',
    'water_coastal', 'water_shallow', 'water_deep',
  ]);

  const LAKE_KINDS  = ['lake', 'sea'];
  const LAKE_KINDS_SET = new Set(LAKE_KINDS);
  const LAKE_DEPTHS = ['shallow', 'deep'];
  const LAKE_DEPTHS_SET = new Set(LAKE_DEPTHS);
  const LAKE_SCHEMA_VERSION = 1;

  // ── Geometry helpers ────────────────────────────────────────────────────

  // World SVG center of a parent hex at offset (col, row). Mirrors
  // greyhawk-map.html hexCenter() exactly.
  function parentSvgCenter(col, row){
    return {
      x: HEX_R + col * 1.5 * HEX_R,
      y: HEX_R*SQRT3/2 + row*SQRT3*HEX_R + ((col & 1) ? HEX_R*SQRT3/2 : 0),
    };
  }

  // World axial (Q, R) of a parent's center subhex. Closed-form.
  function parentCenterAxial(col, row){
    const dCol = col - ANCHOR_COL;
    return {
      Q: dCol * 10,
      R: 10*(row - ANCHOR_ROW) - 5*dCol + 5*(col & 1) - 5*(ANCHOR_COL & 1),
    };
  }

  const ANCHOR_SVG = parentSvgCenter(ANCHOR_COL, ANCHOR_ROW);
  function subhexSvgCenter(Q, R){
    return {
      x: ANCHOR_SVG.x + 1.5 * SUB_R * Q,
      y: ANCHOR_SVG.y + SQRT3 * SUB_R * (R + Q/2),
    };
  }

  function axialRound(qf, rf){
    let x = qf, z = rf, y = -x - z;
    let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
    const xd = Math.abs(rx - x), yd = Math.abs(ry - y), zd = Math.abs(rz - z);
    if (xd > yd && xd > zd)      rx = -ry - rz;
    else if (yd > zd)             ry = -rx - rz;
    else                          rz = -rx - ry;
    return { Q: rx, R: rz };
  }
  function svgToAxial(x, y){
    const dx = x - ANCHOR_SVG.x;
    const dy = y - ANCHOR_SVG.y;
    const qf = (2/3) * dx / SUB_R;
    const rf = (-dx/3 + SQRT3*dy/3) / SUB_R;
    return axialRound(qf, rf);
  }

  // Owner of subhex (Q, R) — nearest parent center in SVG, tiebreak
  // (lower col, then lower row). Cached.
  const _ownerCache = new Map();
  function ownerOf(Q, R){
    const key = `${Q}_${R}`;
    let cached = _ownerCache.get(key);
    if (cached) return cached;
    const sx = ANCHOR_SVG.x + 1.5 * SUB_R * Q;
    const sy = ANCHOR_SVG.y + SQRT3 * SUB_R * (R + Q/2);
    const colEst = ANCHOR_COL + Math.round(Q / 10);
    const rowEst = ANCHOR_ROW + Math.round((R + Q/2) / 10);
    let best = null, bestD = Infinity;
    for (let dc = -2; dc <= 2; dc++){
      for (let dr = -2; dr <= 2; dr++){
        const col = colEst + dc, row = rowEst + dr;
        if (col < 0 || row < 0) continue;
        const c = parentSvgCenter(col, row);
        const d = (sx - c.x)*(sx - c.x) + (sy - c.y)*(sy - c.y);
        if (d < bestD - 1e-9){
          best = { col, row }; bestD = d;
        } else if (Math.abs(d - bestD) < 1e-9){
          if (best === null || col < best.col || (col === best.col && row < best.row)){
            best = { col, row }; bestD = d;
          }
        }
      }
    }
    if (best) _ownerCache.set(key, best);
    return best;
  }

  // Enumerate the subhex axials owned by a parent. ~100 cells per
  // parent in the regular interior.
  function ownedByParent(col, row){
    const center = parentCenterAxial(col, row);
    const out = [];
    for (let dQ = -11; dQ <= 11; dQ++){
      for (let dR = -11; dR <= 11; dR++){
        const Q = center.Q + dQ, R = center.R + dR;
        const o = ownerOf(Q, R);
        if (o && o.col === col && o.row === row) out.push({ Q, R });
      }
    }
    return out;
  }

  // SAT: do two convex polygons (each as [[x,y], ...]) overlap?
  function _polysOverlap(a, b){
    for (const poly of [a, b]){
      for (let i = 0; i < poly.length; i++){
        const [x1, y1] = poly[i];
        const [x2, y2] = poly[(i + 1) % poly.length];
        const nx = y2 - y1, ny = -(x2 - x1);
        let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
        for (const [x, y] of a){
          const p = x*nx + y*ny;
          if (p < aMin) aMin = p; if (p > aMax) aMax = p;
        }
        for (const [x, y] of b){
          const p = x*nx + y*ny;
          if (p < bMin) bMin = p; if (p > bMax) bMax = p;
        }
        if (aMax < bMin - 1e-9 || bMax < aMin - 1e-9) return false;
      }
    }
    return true;
  }
  function _flatTopCorners(cx, cy, R){
    const out = new Array(6);
    for (let i = 0; i < 6; i++){
      const a = (Math.PI / 180) * (60 * i);
      out[i] = [cx + R * Math.cos(a), cy + R * Math.sin(a)];
    }
    return out;
  }

  // Subhex axials whose hex polygon overlaps the given parent polygon
  // but are owned by a different parent — used for fragment rendering.
  // Uses an actual polygon-overlap test (SAT) so cells that only
  // approximately approach the parent are excluded.
  function fragmentsForParent(col, row){
    const center = parentCenterAxial(col, row);
    const pc = parentSvgCenter(col, row);
    const parentPoly = _flatTopCorners(pc.x, pc.y, HEX_R);
    const out = [];
    for (let dQ = -11; dQ <= 11; dQ++){
      for (let dR = -11; dR <= 11; dR++){
        const Q = center.Q + dQ, R = center.R + dR;
        const o = ownerOf(Q, R);
        if (!o || (o.col === col && o.row === row)) continue;
        const sc = subhexSvgCenter(Q, R);
        const cellPoly = _flatTopCorners(sc.x, sc.y, SUB_R);
        if (_polysOverlap(parentPoly, cellPoly)){
          out.push({ Q, R, ownerCol: o.col, ownerRow: o.row });
        }
      }
    }
    return out;
  }

  // Six axial neighbors (flat-top).
  const NEIGHBOR_DELTAS = [
    [+1,  0], [ 0, +1], [-1, +1],
    [-1,  0], [ 0, -1], [+1, -1],
  ];

  // ── Storage ────────────────────────────────────────────────────────────
  //
  // Overrides: IDB primary (via GCCSubhexStore), localStorage as
  // bounded boot cache. Boot reads localStorage synchronously for a
  // fast initial render; IDB hydration happens on first tick after
  // module load and merges any IDB-only entries into in-memory state.
  //
  // Regions / Lakes: localStorage only in slice F1 — moves in F2.
  //
  // Track per-id dirty flags so save() only writes the entries that
  // actually changed (avoids a full-set write every time someone
  // edits one cell). dirty.add(id) on mutation; save() drains the
  // set into IDB puts, then writes the bounded boot cache.
  let OVERRIDES = {};
  const _dirty = new Set();        // ids modified since last save
  const _deleted = new Set();      // ids removed since last save
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) OVERRIDES = JSON.parse(raw) || {};
  } catch(e){ OVERRIDES = {}; }

  let REGIONS = {};
  try {
    const raw = localStorage.getItem(LS_REGIONS_KEY);
    if (raw) REGIONS = JSON.parse(raw) || {};
  } catch(e){ REGIONS = {}; }

  let LAKES = {};
  try {
    const raw = localStorage.getItem(LS_LAKES_KEY);
    if (raw) LAKES = JSON.parse(raw) || {};
  } catch(e){ LAKES = {}; }

  // Hydrate from IDB on next tick. We don't block module load on
  // this — readers see the localStorage cache immediately and the
  // IDB-only entries fade in once loaded. UI listens for the
  // gcc-subhex-changed event to re-render.
  let _idbReady = null;
  function _hydrateFromIdb(){
    if (_idbReady) return _idbReady;
    if (typeof window.GCCSubhexStore === 'undefined'){
      console.warn('[GCCSubhexData] GCCSubhexStore not loaded; staying on localStorage-only');
      _idbReady = Promise.resolve();
      return _idbReady;
    }
    const STORE = window.GCCSubhexStore;
    _idbReady = (async () => {
      try {
        const idbAll = await STORE.loadAll();
        // Merge IDB into OVERRIDES. IDB wins over the boot cache —
        // the cache is by definition stale or a subset.
        let added = 0, replaced = 0;
        for (const id of Object.keys(idbAll)){
          if (id in OVERRIDES) replaced++;
          else                 added++;
          OVERRIDES[id] = idbAll[id];
        }
        if (added || replaced){
          console.log(`[GCCSubhexData] IDB hydration: +${added} added, ${replaced} confirmed (total ${Object.keys(OVERRIDES).length})`);
          _rebuildLakeIndexes();
          try { window.dispatchEvent(new CustomEvent('gcc-subhex-changed', { detail: { reason: 'idb-hydrate' } })); } catch(_){}
        }
      } catch(e){
        console.error('[GCCSubhexData] IDB hydration failed:', e);
      }
    })();
    return _idbReady;
  }
  // Kick off hydration after the current synchronous module-load
  // chain finishes. setTimeout(0) > Promise.resolve().then because
  // GCCSubhexStore may not be defined yet at module-eval time
  // (script tag ordering); the first tick gives it a chance.
  if (typeof window !== 'undefined' && typeof setTimeout === 'function'){
    setTimeout(_hydrateFromIdb, 0);
  }

  function _reportStorageError(key, e){
    console.error(`[GCCSubhexData] save failed for "${key}":`, e.name, '—', e.message,
      '\n  in-memory state will diverge from localStorage; export now to avoid loss.');
    try {
      window.dispatchEvent(new CustomEvent('gcc-storage-error', {
        detail: { key, error: e.name, message: e.message },
      }));
    } catch(_){}
  }

  function save(){
    // IDB primary: drain dirty/deleted into a single batched
    // transaction. v2.8.0 used per-entry puts which created one
    // IDB transaction per cell — 50k transactions in series took
    // ~30 minutes. v2.8.1 batches via putBatch.
    const STORE = window.GCCSubhexStore;
    if (STORE && typeof STORE.putBatch === 'function'){
      const puts = {};
      let putCount = 0;
      for (const id of _dirty){
        if (id in OVERRIDES){ puts[id] = OVERRIDES[id]; putCount++; }
      }
      const deletes = Array.from(_deleted);
      if (putCount > 0 || deletes.length > 0){
        STORE.putBatch(putCount > 0 ? puts : null, deletes.length > 0 ? deletes : null);
      }
      // Bounded boot cache for fast next-load. F2 may drop this
      // when Firestore takes over the durable role.
      STORE.writeBootCache(OVERRIDES);
    } else if (STORE){
      // Older store with only single put/remove — fall back.
      for (const id of _dirty){
        if (id in OVERRIDES) STORE.put(id, OVERRIDES[id]);
      }
      for (const id of _deleted){
        STORE.remove(id);
      }
      STORE.writeBootCache(OVERRIDES);
    } else {
      // No store loaded — fall back to whole-set localStorage write
      // (legacy behavior, will hit quota at scale but keeps F1
      // installable in environments where GCCSubhexStore failed
      // to load).
      try { localStorage.setItem(LS_KEY, JSON.stringify(OVERRIDES)); }
      catch(e){ _reportStorageError(LS_KEY, e); }
    }
    _dirty.clear();
    _deleted.clear();
    _rebuildLakeIndexes();
    try { window.dispatchEvent(new CustomEvent('gcc-subhex-changed')); } catch(e){}
  }
  function saveRegions(){
    try { localStorage.setItem(LS_REGIONS_KEY, JSON.stringify(REGIONS)); }
    catch(e){ _reportStorageError(LS_REGIONS_KEY, e); }
    try { window.dispatchEvent(new CustomEvent('gcc-subhex-changed')); } catch(e){}
  }
  function saveLakes(){
    try { localStorage.setItem(LS_LAKES_KEY, JSON.stringify(LAKES)); }
    catch(e){ _reportStorageError(LS_LAKES_KEY, e); }
    _rebuildLakeIndexes();
    try { window.dispatchEvent(new CustomEvent('gcc-subhex-changed')); } catch(e){}
  }

  function subhexId(Q, R){ return `subhex_${Q}_${R}`; }
  function parseSubhexId(id){
    const m = /^subhex_(-?\d+)_(-?\d+)$/.exec(id);
    if (!m) return null;
    return { Q: +m[1], R: +m[2] };
  }
  function regionDocId(localId){ return `region_${localId}`; }
  function parseRegionId(id){
    const m = /^region_(.+)$/.exec(id);
    return m ? m[1] : null;
  }
  function lakeDocId(localId){ return `lake_${localId}`; }
  function parseLakeId(id){
    const m = /^lake_(.+)$/.exec(id);
    return m ? m[1] : null;
  }
  function slugify(s, fallback){
    return String(s || '').trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || (fallback || 'region');
  }
  function genRegionLocalId(name){
    const base = slugify(name, 'region');
    let id = base, n = 2;
    while (REGIONS[regionDocId(id)]) id = `${base}-${n++}`;
    return id;
  }
  function genLakeLocalId(name){
    const base = slugify(name, 'lake');
    let id = base, n = 2;
    while (LAKES[lakeDocId(id)]) id = `${base}-${n++}`;
    return id;
  }

  // ── Procedural ─────────────────────────────────────────────────────────

  function proceduralTerrain(parentTerrain, Q, R){
    if (!parentTerrain) return null;
    const seed = window.GCCRng.seedFor(WORLD_SEED, 'subhex-terrain', Q, R);
    const rng = window.GCCRng.mulberry32(seed);
    if (window.GCCRng.chance(rng, PARENT_BIAS)) return parentTerrain;
    const table = VARIATION[parentTerrain] || { [parentTerrain]: 1 };
    return window.GCCRng.pickWeighted(rng, table);
  }

  function canonicalSubhex(Q, R){ return null; }   // Phase D stub.

  function getSubhex(Q, R, parentTerrain){
    const id = subhexId(Q, R);
    const ov = OVERRIDES[id];
    if (ov){
      return {
        id, Q, R,
        terrain:  ov.terrain || canonicalSubhex(Q, R)?.terrain
                  || proceduralTerrain(parentTerrain, Q, R),
        name:     ov.name || '',
        notes:    ov.notes || '',
        feature:  ov.feature || null,
        regionId: ov.regionId || null,
        lakeId:   ov.lakeId || null,
        source:   'authored',
        schemaVersion: ov.schemaVersion || SCHEMA_VERSION,
      };
    }
    const canon = canonicalSubhex(Q, R);
    if (canon){
      return { id, Q, R, source: 'canonical', name: '', notes: '', feature: null, regionId: null, lakeId: null, ...canon };
    }
    return {
      id, Q, R,
      terrain: proceduralTerrain(parentTerrain, Q, R),
      name: '', notes: '', feature: null, regionId: null, lakeId: null,
      source: 'seed',
      schemaVersion: SCHEMA_VERSION,
    };
  }

  function normalizeFeature(f){
    if (!f) return null;
    if (typeof f === 'string') f = { kind: f };
    if (!f.kind || !FEATURE_KINDS_SET.has(f.kind)) return null;
    const out = { kind: f.kind };
    if (f.name && String(f.name).trim()) out.name = String(f.name).trim();
    if (f.libraryId && String(f.libraryId).trim()) out.libraryId = String(f.libraryId).trim();
    if (f.notes && String(f.notes).trim()) out.notes = String(f.notes).trim();
    if (f.landmarkId && String(f.landmarkId).trim()) out.landmarkId = String(f.landmarkId).trim();
    return out;
  }

  // Lightweight reader for callers that only need the cell's feature
  // (e.g. journey planner asking "is there a bridge on this cell?").
  // Skips the procedural-terrain machinery — just consults override
  // first, then canonical. Returns null if neither has a feature.
  function getCellFeature(Q, R){
    const id = subhexId(Q, R);
    const ov = OVERRIDES[id];
    if (ov && ov.feature) return ov.feature;
    const canon = canonicalSubhex(Q, R);
    return (canon && canon.feature) || null;
  }

  function setSubhexOverride(Q, R, fields, opts){
    const id = subhexId(Q, R);
    const cur = OVERRIDES[id] || {};
    const next = { ...cur };
    let terrainChanged = false;
    const prevTerrain = cur.terrain || null;
    if ('terrain' in fields){
      const newT = fields.terrain || null;
      if (newT !== prevTerrain) terrainChanged = true;
      next.terrain = newT;
    }
    if ('name'    in fields) next.name    = fields.name || '';
    if ('notes'   in fields) next.notes   = fields.notes || '';
    if ('feature' in fields) next.feature = normalizeFeature(fields.feature);
    if ('regionId' in fields) next.regionId = fields.regionId || null;
    if ('lakeId'   in fields) next.lakeId   = fields.lakeId   || null;
    // v2.7.0: per-override provenance. Caller supplies 'source' to
    // identify what wrote this entry. Defaults to 'authored' for
    // back-compat with callers that don't pass one. Scanner output
    // passes its mode-specific source like 'scanner-coast-v1' so
    // cleanup tooling can target scanner writes precisely.
    if ('source' in fields) next.source = fields.source || 'authored';
    else if (!next.source)  next.source = 'authored';

    const prevRegionId = cur.regionId || null;
    if (terrainChanged && next.regionId){
      const region = REGIONS[regionDocId(next.regionId)];
      const effective = next.terrain || canonicalSubhex(Q, R)?.terrain || null;
      if (region && effective && region.terrain !== effective){
        next.regionId = null;
      }
    }

    // Lake invariant: lakeId non-null ⟺ effective terrain ∈ WATER_TERRAINS.
    // On any terrain change to a non-water value, clear lakeId. Symmetric
    // to the regionId guard above but membership-based, not equality-based.
    if (terrainChanged && next.lakeId){
      const effective = next.terrain || canonicalSubhex(Q, R)?.terrain || null;
      if (!effective || !WATER_TERRAINS.has(effective)){
        next.lakeId = null;
      }
    }

    next.schemaVersion = SCHEMA_VERSION;
    next.authoredAt = Date.now();
    const empty = !next.terrain && !next.name && !next.notes && !next.feature
                  && !next.regionId && !next.lakeId;
    if (empty){
      delete OVERRIDES[id];
      _dirty.delete(id);
      _deleted.add(id);
    } else {
      OVERRIDES[id] = next;
      _deleted.delete(id);
      _dirty.add(id);
    }
    if (!opts || !opts.deferSave) save();

    const newRegionId = next.regionId || null;
    if (prevRegionId && prevRegionId !== newRegionId) gcRegionIfEmpty(prevRegionId);
    // Note: no auto-gc for lakes on detach. Per design Q1, lake docs are
    // independent metadata — they don't track membership and don't go
    // stale when their last cell unassigns. GC is opt-in via explicit
    // gcLakeIfEmpty call from a "clean up unused lakes" tool.
    return true;
  }

  function setSubhexFeature(Q, R, feature){ return setSubhexOverride(Q, R, { feature }); }
  function clearSubhexFeature(Q, R){ return setSubhexOverride(Q, R, { feature: null }); }

  // Landmark pinning ──────────────────────────────────────────────────────
  // A parent landmark (gcc-landmarks entry, keyed by Darlene hex ID) can
  // be pinned to a single subhex cell within its parent. The pin lives
  // on feature.landmarkId; metadata stays in gcc-landmarks. Pinning
  // enforces single-source: only one cell may carry a given landmarkId
  // at a time. Moving the pin clears the old cell automatically.
  function findCellPinnedToLandmark(landmarkId){
    if (!landmarkId) return null;
    for (const id in OVERRIDES){
      const ov = OVERRIDES[id];
      if (ov.feature && ov.feature.landmarkId === landmarkId){
        const parsed = parseSubhexId(id);
        if (parsed) return { Q: parsed.Q, R: parsed.R };
      }
    }
    return null;
  }
  // Pin landmarkId to (Q, R). If kind/name aren't provided in opts, infer
  // from the landmark record (when GCCLandmarks is loaded). Clears any
  // pre-existing pin to the same landmark on a different cell. If opts
  // includes landmarkId === null, the call unpins (leaves any other
  // feature data on the cell intact).
  function pinLandmarkToCell(Q, R, landmarkId, opts){
    opts = opts || {};
    // Move-the-pin: clear the old cell's landmarkId if it differs.
    const existing = findCellPinnedToLandmark(landmarkId);
    if (existing && (existing.Q !== Q || existing.R !== R)){
      unpinLandmark(landmarkId);
    }
    const cur = getSubhex(Q, R);
    const f = { ...(cur.feature || {}) };
    f.landmarkId = landmarkId;
    // Sync kind/name from landmark when caller hasn't specified them.
    // Falls back to leaving them alone if the landmark API is unavailable.
    if (typeof window !== 'undefined' && window.GCCLandmarks){
      const lm = window.GCCLandmarks.getById(landmarkId);
      if (lm){
        if (opts.kind != null) f.kind = opts.kind;
        else if (FEATURE_KINDS_SET.has(lm.kind)) f.kind = lm.kind;
        else f.kind = 'landmark';
        if (opts.name != null) f.name = opts.name;
        else if (lm.name) f.name = lm.name;
      }
    }
    if (!f.kind) f.kind = 'landmark';
    return setSubhexOverride(Q, R, { feature: f });
  }
  function unpinLandmark(landmarkId){
    const existing = findCellPinnedToLandmark(landmarkId);
    if (!existing) return false;
    const id = subhexId(existing.Q, existing.R);
    const ov = OVERRIDES[id];
    if (!ov || !ov.feature) return false;
    const oldF = ov.feature;
    // If the feature on the cell looks pure-landmark (only the kind
    // and name we'd have written from the landmark, no GM-authored
    // notes/libraryId), clear it entirely. Otherwise just drop the
    // landmarkId and leave the user's extras intact.
    let isPureLandmark = false;
    if (typeof window !== 'undefined' && window.GCCLandmarks){
      const lm = window.GCCLandmarks.getById(landmarkId);
      if (lm){
        const expectedKind = FEATURE_KINDS_SET.has(lm.kind) ? lm.kind : 'landmark';
        isPureLandmark = oldF.kind === expectedKind
                      && (oldF.name || '') === (lm.name || '')
                      && !oldF.notes && !oldF.libraryId;
      }
    }
    if (isPureLandmark){
      return setSubhexOverride(existing.Q, existing.R, { feature: null });
    }
    const newF = { ...oldF };
    delete newF.landmarkId;
    return setSubhexOverride(existing.Q, existing.R, { feature: newF });
  }

  function clearSubhex(Q, R, opts){
    const id = subhexId(Q, R);
    if (id in OVERRIDES){
      delete OVERRIDES[id];
      _dirty.delete(id);
      _deleted.add(id);
      if (!opts || !opts.deferSave) save();
      return true;
    }
    return false;
  }
  function clearAll(){
    // Full reset — push down to IDB via store.clear() so the cache
    // doesn't keep an old in-flight write alive.
    OVERRIDES = {};
    _dirty.clear();
    _deleted.clear();
    if (window.GCCSubhexStore){ window.GCCSubhexStore.clear(); }
    else { try { localStorage.removeItem(LS_KEY); } catch(_){} }
    _rebuildLakeIndexes();
    try { window.dispatchEvent(new CustomEvent('gcc-subhex-changed')); } catch(_){}
  }

  // Bulk-write helpers. peekOverride returns the raw OVERRIDES entry
  // (or undefined) without invoking canonicalSubhex/proceduralTerrain
  // — much cheaper than getSubhex when the caller only needs to know
  // whether an override exists. flushOverrides is the explicit save
  // call after a series of {deferSave:true} writes.
  function peekOverride(Q, R){
    return OVERRIDES[subhexId(Q, R)];
  }
  // flushOverrides() drains pending dirty/deleted into the IDB
  // queue (via save()), then returns a promise that resolves once
  // every queued IDB write has hit disk. Callers that need to know
  // when persistence is durable (tests, sign-out flow) should
  // await this; callers that just want to commit an in-memory
  // batch can call it without await (sync-style).
  function flushOverrides(){
    save();
    return window.GCCSubhexStore ? window.GCCSubhexStore.flush() : Promise.resolve();
  }

  // ── Regions (global scope) ─────────────────────────────────────────────

  function listRegions(){
    return Object.values(REGIONS).slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  function getRegion(localId){
    if (!localId) return null;
    return REGIONS[regionDocId(localId)] || null;
  }

  function createRegion(name, terrain){
    if (!name || !terrain) return null;
    const localId = genRegionLocalId(name);
    const region = {
      id: localId,
      name: String(name).trim(),
      terrain,
      schemaVersion: SCHEMA_VERSION,
      authoredAt: Date.now(),
    };
    REGIONS[regionDocId(localId)] = region;
    saveRegions();
    return region;
  }

  function renameRegion(localId, newName){
    const region = getRegion(localId);
    if (!region || !newName) return false;
    region.name = String(newName).trim() || region.name;
    region.authoredAt = Date.now();
    saveRegions();
    return true;
  }

  function deleteRegion(localId){
    const docId = regionDocId(localId);
    if (!REGIONS[docId]) return false;
    delete REGIONS[docId];
    saveRegions();
    let dirty = false;
    for (const cellId of Object.keys(OVERRIDES)){
      const ov = OVERRIDES[cellId];
      if (ov.regionId !== localId) continue;
      delete ov.regionId;
      if (!ov.terrain && !ov.name && !ov.notes && !ov.feature) delete OVERRIDES[cellId];
      dirty = true;
    }
    if (dirty) save();
    return true;
  }

  function assignCellToRegion(Q, R, localId, parentTerrain){
    const region = getRegion(localId);
    if (!region) return false;
    const sub = getSubhex(Q, R, parentTerrain);
    if (!sub) return false;
    if (sub.terrain !== region.terrain) return false;
    return setSubhexOverride(Q, R, { regionId: localId });
  }

  function unassignCellFromRegion(Q, R){
    return setSubhexOverride(Q, R, { regionId: null });
  }

  function regionMembers(localId){
    const out = [];
    for (const cellId of Object.keys(OVERRIDES)){
      const ov = OVERRIDES[cellId];
      if (ov.regionId !== localId) continue;
      const p = parseSubhexId(cellId);
      if (p) out.push({ Q: p.Q, R: p.R });
    }
    return out;
  }

  function regionsInParent(col, row){
    const out = new Map();
    for (const cellId of Object.keys(OVERRIDES)){
      const ov = OVERRIDES[cellId];
      if (!ov.regionId) continue;
      const p = parseSubhexId(cellId);
      if (!p) continue;
      const o = ownerOf(p.Q, p.R);
      if (!o || o.col !== col || o.row !== row) continue;
      const region = REGIONS[regionDocId(ov.regionId)];
      if (region && !out.has(region.id)) out.set(region.id, region);
    }
    return Array.from(out.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  function gcRegionIfEmpty(localId){
    if (!localId) return;
    const docId = regionDocId(localId);
    if (!REGIONS[docId]) return;
    if (regionMembers(localId).length > 0) return;
    delete REGIONS[docId];
    saveRegions();
  }

  // ── Lakes (global scope) ───────────────────────────────────────────────
  // Lake records mirror regions: cell-pointer membership via cell.lakeId
  // (no parallel members[] list to keep in sync). Cell terrain must be
  // in WATER_TERRAINS for the cell to carry lakeId — enforced at
  // setCellLake write time and re-checked on terrain change in
  // setSubhexOverride. Two indexes (_LAKES_BY_PARENT, _CELLS_BY_LAKE)
  // serve hot-path queries; both are eagerly rebuilt by save() and
  // saveLakes() so callers see consistent state without manual
  // invalidation.

  let _LAKES_BY_PARENT = new Map();   // 'col-row'  → Set<lakeLocalId>
  let _CELLS_BY_LAKE   = new Map();   // lakeLocalId → Array<{Q,R}>

  function _rebuildLakeIndexes(){
    _LAKES_BY_PARENT = new Map();
    _CELLS_BY_LAKE = new Map();
    for (const cellId of Object.keys(OVERRIDES)){
      const ov = OVERRIDES[cellId];
      if (!ov || !ov.lakeId) continue;
      const p = parseSubhexId(cellId);
      if (!p) continue;
      // Cells-by-lake.
      let arr = _CELLS_BY_LAKE.get(ov.lakeId);
      if (!arr){ arr = []; _CELLS_BY_LAKE.set(ov.lakeId, arr); }
      arr.push({ Q: p.Q, R: p.R });
      // Lakes-by-parent.
      const o = ownerOf(p.Q, p.R);
      if (!o) continue;
      const k = `${o.col}-${o.row}`;
      let set = _LAKES_BY_PARENT.get(k);
      if (!set){ set = new Set(); _LAKES_BY_PARENT.set(k, set); }
      set.add(ov.lakeId);
    }
  }

  function listLakes(){
    return Object.values(LAKES).slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  function getLake(localId){
    if (!localId) return null;
    return LAKES[lakeDocId(localId)] || null;
  }

  function createLake(name, kind, depth, regionId, notes){
    if (!name) return null;
    if (!LAKE_KINDS_SET.has(kind))   return null;
    if (!LAKE_DEPTHS_SET.has(depth)) return null;
    const localId = genLakeLocalId(name);
    const lake = {
      id: localId,
      kind,
      name: String(name).trim(),
      depth,
      regionId: regionId || null,
      notes: notes ? String(notes) : '',
      schemaVersion: LAKE_SCHEMA_VERSION,
      authoredAt: Date.now(),
    };
    LAKES[lakeDocId(localId)] = lake;
    saveLakes();
    return lake;
  }

  function renameLake(localId, newName){
    const lake = getLake(localId);
    if (!lake || !newName) return false;
    lake.name = String(newName).trim() || lake.name;
    lake.authoredAt = Date.now();
    saveLakes();
    return true;
  }

  // Generic field updater for kind/depth/regionId/notes. Validates
  // constrained fields. Skips unknown fields silently.
  function updateLake(localId, fields){
    const lake = getLake(localId);
    if (!lake || !fields || typeof fields !== 'object') return false;
    if ('kind'  in fields){
      if (!LAKE_KINDS_SET.has(fields.kind)) return false;
      lake.kind = fields.kind;
    }
    if ('depth' in fields){
      if (!LAKE_DEPTHS_SET.has(fields.depth)) return false;
      lake.depth = fields.depth;
    }
    if ('regionId' in fields) lake.regionId = fields.regionId || null;
    if ('notes'    in fields) lake.notes    = fields.notes ? String(fields.notes) : '';
    if ('name'     in fields && fields.name){
      lake.name = String(fields.name).trim() || lake.name;
    }
    lake.authoredAt = Date.now();
    saveLakes();
    return true;
  }

  function deleteLake(localId){
    const docId = lakeDocId(localId);
    if (!LAKES[docId]) return false;
    delete LAKES[docId];
    saveLakes();
    // Detach lakeId from any cells that pointed at this lake.
    let dirty = false;
    for (const cellId of Object.keys(OVERRIDES)){
      const ov = OVERRIDES[cellId];
      if (ov.lakeId !== localId) continue;
      delete ov.lakeId;
      if (!ov.terrain && !ov.name && !ov.notes && !ov.feature && !ov.regionId){
        delete OVERRIDES[cellId];
      }
      dirty = true;
    }
    if (dirty) save();
    return true;
  }

  function setCellLake(Q, R, localId, parentTerrain){
    const lake = getLake(localId);
    if (!lake) return false;
    const sub = getSubhex(Q, R, parentTerrain);
    if (!sub) return false;
    if (!WATER_TERRAINS.has(sub.terrain)) return false;
    return setSubhexOverride(Q, R, { lakeId: localId });
  }

  function unsetCellLake(Q, R){
    return setSubhexOverride(Q, R, { lakeId: null });
  }

  function lakeMembers(localId){
    const arr = _CELLS_BY_LAKE.get(localId);
    return arr ? arr.slice() : [];
  }

  function lakesInParent(col, row){
    const set = _LAKES_BY_PARENT.get(`${col}-${row}`);
    if (!set) return [];
    const out = [];
    for (const id of set){
      const doc = LAKES[lakeDocId(id)];
      if (doc) out.push(doc);
    }
    return out.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  function parentHasLakeAuthoring(col, row){
    const set = _LAKES_BY_PARENT.get(`${col}-${row}`);
    return !!(set && set.size > 0);
  }

  function gcLakeIfEmpty(localId){
    if (!localId) return;
    const docId = lakeDocId(localId);
    if (!LAKES[docId]) return;
    if (lakeMembers(localId).length > 0) return;
    delete LAKES[docId];
    saveLakes();
  }

  // ── Export / import / introspection ────────────────────────────────────

  function allAuthored(){
    return Object.entries(OVERRIDES).map(([id, data]) => {
      const p = parseSubhexId(id);
      return p ? { id, ...p, ...data } : null;
    }).filter(Boolean);
  }
  function authoredCount(){ return Object.keys(OVERRIDES).length; }
  function exportOverrides(){ return JSON.parse(JSON.stringify(OVERRIDES)); }
  function importOverrides(obj){
    if (!obj || typeof obj !== 'object') return false;
    OVERRIDES = JSON.parse(JSON.stringify(obj));
    save();
    return true;
  }
  function exportRegions(){ return JSON.parse(JSON.stringify(REGIONS)); }
  function importRegions(obj){
    if (!obj || typeof obj !== 'object') return false;
    REGIONS = JSON.parse(JSON.stringify(obj));
    saveRegions();
    return true;
  }
  function exportLakes(){ return JSON.parse(JSON.stringify(LAKES)); }
  function importLakes(obj){
    if (!obj || typeof obj !== 'object') return false;
    LAKES = JSON.parse(JSON.stringify(obj));
    saveLakes();
    return true;
  }

  // ── Migration v1.1 → v2.0 ──────────────────────────────────────────────
  {
    let migratedFlag = false;
    try { migratedFlag = !!localStorage.getItem(MIGRATION_FLAG_KEY); } catch(e){}
    if (!migratedFlag){
      let mc = 0, dropped = 0, mr = 0;
      const nextOv = {};
      const nextRg = {};
      const regionRekey = {};   // `${parentId}__${oldLocalId}` → newLocalId

      // Regions first.
      for (const oldDocId of Object.keys(REGIONS)){
        const oldDoc = REGIONS[oldDocId];
        const m = /^(.+)__(.+)$/.exec(oldDocId);
        const oldLocalId = oldDoc?.id || (m ? m[2] : oldDocId);
        let newLocalId = oldLocalId;
        let n = 2;
        while (nextRg[regionDocId(newLocalId)]) newLocalId = `${oldLocalId}-${n++}`;
        regionRekey[oldDocId] = newLocalId;
        nextRg[regionDocId(newLocalId)] = {
          id: newLocalId,
          name: oldDoc?.name || newLocalId,
          terrain: oldDoc?.terrain || null,
          schemaVersion: SCHEMA_VERSION,
          authoredAt: oldDoc?.authoredAt || Date.now(),
        };
        mr++;
      }

      // Cells.
      for (const oldId of Object.keys(OVERRIDES)){
        const ov = OVERRIDES[oldId];
        const m = /^(.+)__(\d+)_(\d+)$/.exec(oldId);
        if (!m){ dropped++; continue; }
        const parentId = m[1];
        const q = +m[2], r = +m[3];
        const parent = (typeof window.darleneToInternal === 'function')
          ? window.darleneToInternal(parentId)
          : null;
        if (!parent){ dropped++; continue; }
        const center = parentCenterAxial(parent.col, parent.row);
        const Q = center.Q + (q - 5);
        const R = center.R + (r - 5);
        const newId = subhexId(Q, R);

        let nextRegionId = ov.regionId || null;
        if (nextRegionId){
          const oldRegionDocId = `${parentId}__${nextRegionId}`;
          if (regionRekey[oldRegionDocId]) nextRegionId = regionRekey[oldRegionDocId];
        }

        const candidate = {
          ...ov,
          regionId: nextRegionId,
          schemaVersion: SCHEMA_VERSION,
        };
        const existing = nextOv[newId];
        if (!existing || (candidate.authoredAt || 0) >= (existing.authoredAt || 0)){
          nextOv[newId] = candidate;
        }
        mc++;
      }

      OVERRIDES = nextOv;
      REGIONS = nextRg;
      // Route the migrated state through the new save() path so IDB
      // (slice F1+) sees it. Mark every entry dirty so save() pushes
      // them. The migration flag still goes to localStorage directly
      // (it's a tiny scalar; quota isn't a concern).
      for (const id of Object.keys(OVERRIDES)) _dirty.add(id);
      save();
      saveRegions();
      try { localStorage.setItem(MIGRATION_FLAG_KEY, '1'); }
      catch(e){ _reportStorageError(MIGRATION_FLAG_KEY, e); }
      if (mc || mr || dropped){
        console.log(`[GCCSubhexData] v1.1→v2.0: ${mc} cell(s), ${mr} region(s) migrated; ${dropped} dropped.`);
      }
    }
  }

  // Initial lake index build. save() and saveLakes() rebuild on every
  // mutation — this seeds the initial state for the first frame's reads.
  _rebuildLakeIndexes();

  window.GCCSubhexData = {
    WORLD_SEED, SCHEMA_VERSION, ANCHOR_COL, ANCHOR_ROW, HEX_R, SUB_R,
    FEATURE_KINDS,
    WATER_TERRAINS, LAKE_KINDS, LAKE_DEPTHS, LAKE_SCHEMA_VERSION,
    parentSvgCenter, parentCenterAxial, subhexSvgCenter,
    svgToAxial, ownerOf, ownedByParent, fragmentsForParent,
    NEIGHBOR_DELTAS,
    subhexId, parseSubhexId, regionDocId, parseRegionId,
    lakeDocId, parseLakeId,
    getSubhex, setSubhexOverride, clearSubhex, clearAll,
    peekOverride, flushOverrides,
    setSubhexFeature, clearSubhexFeature, getCellFeature,
    findCellPinnedToLandmark, pinLandmarkToCell, unpinLandmark,
    listRegions, regionsInParent, getRegion, createRegion, renameRegion, deleteRegion,
    assignCellToRegion, unassignCellFromRegion, regionMembers, gcRegionIfEmpty,
    listLakes, lakesInParent, getLake, createLake, renameLake, updateLake, deleteLake,
    setCellLake, unsetCellLake, lakeMembers, gcLakeIfEmpty, parentHasLakeAuthoring,
    allAuthored, authoredCount,
    exportOverrides, importOverrides,
    exportRegions, importRegions,
    exportLakes, importLakes,
    proceduralTerrain, canonicalSubhex,
    VARIATION,
  };
})();
