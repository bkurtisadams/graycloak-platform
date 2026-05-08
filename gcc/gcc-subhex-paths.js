// gcc-subhex-paths.js v2.1.0 — 2026-05-06
// v2.0.0: schema v2 → v3. Rivers gain `tier` ('stream'|'river'|
// 'great_river'). All paths gain `headwaters` and `mouth` linkage
// fields, polymorphic { lakeId } | { pathId } | null. Defensive
// `track` → `trail` rename. Migration writes a full pre-v3 dump to
// `gcc-subhex-paths-pre-v3-backup` before any change, gated by the
// new flag `gcc-subhex-paths-migrated-v3`. Existing v0.9→v1.0
// migration (parent-scoped → global) remains in place; both run on
// load, idempotent.
//
// Three internal indexes (eager rebuild on save, on
// gcc-subhex-changed, and on init):
//   _PATHS_BY_CELL    'Q,R'                    → Set<localId>
//   _PATHS_BY_PARENT  'col-row'                → Set<localId>
//   _PATHS_BY_EDGE    canonical 'cA-rA-cB-rB'  → Set<localId>
// Hot-path queries (pathsAtCell, pathsInParent, parentHasPathAuthoring)
// go through the indexes; cold-path scans (everything else) untouched.
//
// New writers: setPathTier, setPathHeadwaters, setPathMouth,
// reverseCells. New reader: parentHasPathAuthoring (canonical name
// for what gcc-paths.js will OR with GCCSubhexData.parentHasLakeAuthoring
// in Slice 3). The legacy parentHasSubhexPaths is aliased to it so
// existing call sites in gcc-paths.js v0.8 keep working unchanged.
//
// Per design DESIGN-paths-water.md (Slice 2).
// gcc-subhex-paths.js v1.4.0 — 2026-04-29
// v1.4.0: subhexBoundaryInfo also returns the crossing feature on the
// boundary cell when one exists. New result field
// `crossing: { kind, name, notes, Q, R } | null`. Lets the parent
// journey planner surface authored bridges/fords/ferries by name in
// the Crossings line. Resolution preference: a crossing on the road-
// bearing cell wins; if no crossing is on the road cell but one sits
// on another boundary cell of the same edge, that's returned instead.
// v1.3.0: subhexBoundaryInfo now considers ALL boundary cell pairs
// between two parents, not just the geometrically-closest one. The
// old "single boundary cell" model failed when a road on one bank
// of a river crossed a parent boundary at a cell offset from the
// edge midpoint — the planner picked the midpoint cell (which had
// only the river on it) and reported hasRoad=false. New model:
// scan every cell of parent A whose axial neighbor is owned by
// parent B; if any such pair is on the same road path, the edge
// is traversable. Same for rivers. The boundaryCell returned now
// prefers the road-bearing cell so callers (like the ghost marker)
// can highlight the relevant cell.
// v1.2.0: subhex layer is now consulted by the parent-layer movement
// planner. Add subhexBoundaryInfo(parentColA, rowA, parentColB, rowB)
// — returns { hasData, boundaryCell, hasRoad, hasRiver } describing
// what subhex paths exist on the cell between two parents. When
// hasData is true, the planner uses subhex truth (Rule 1: a road on
// the boundary cell makes the edge traversable). When hasData is
// false, the planner falls back to the 30mi parent-layer data.
// Helpers: parentHasSubhexPaths(col, row),
// boundaryCellBetweenParents(colA, rowA, colB, rowB).
// v1.1.0: add truncateBefore(localId, Q, R) — keep cells up to but
// not including the matched cell, drop the rest. Used by the view's
// per-cell remove flow: clicking an armed path's cell during Path
// tool authoring removes that cell (and everything after it).
// Subhex path data layer, global-coordinate model. A path is an ordered
// chain of subhex cells (each adjacent to the previous via axial neighbor
// distance 1). Paths are now global — a single path can cross parent
// boundaries.
//
// ── Schema v3 ───────────────────────────────────────────────────────────
// {
//   id: 'velverdyva',           // local id, slug-derived
//   kind: 'river',              // river | road | trail
//   tier: 'river',              // 'stream' | 'river' | 'great_river' | null
//                               //   river-only; null for non-rivers
//   name: 'Velverdyva',
//   notes: '',
//   cells: [{Q,R}, {Q,R}, ...], // ordered, each adjacent to previous
//                               //   for rivers: cells[0] = source, cells[length-1] = mouth
//                               //   for roads/trails: order is authoring artifact only
//   headwaters: { lakeId } | { pathId } | null,   // see DESIGN Q4
//   mouth:      { lakeId } | { pathId } | null,
//   schemaVersion: 3,
//   authoredAt: ts,
// }
//
// Storage key 'gcc-subhex-paths' as
//   { [`path_${pathLocalId}`]: pathDoc }
//
// ── Migration v0.9 → v1.0 ──────────────────────────────────────────────
// For each existing path `${parentId}__${localId}`:
//   1. Resolve parent (col, row) via window.darleneToInternal
//   2. PCenter = parentCenterAxial(col, row) via GCCSubhexData
//   3. Translate every cell {q,r} ∈ [0..10] → {Q: PQ + q-5, R: PR + r-5}
//   4. Re-key path doc to `path_${localId}`, renaming on collision.
// Runs once, guarded by 'gcc-subhex-paths-migrated-v2'.

(function(){
  'use strict';

  const PATH_KINDS = ['river', 'road', 'trail'];
  const PATH_KINDS_SET = new Set(PATH_KINDS);
  const RIVER_TIERS = ['stream', 'river', 'great_river'];
  const RIVER_TIERS_SET = new Set(RIVER_TIERS);
  const SCHEMA_VERSION = 3;
  const LS_KEY = 'gcc-subhex-paths';
  const MIGRATION_FLAG_KEY_V2 = 'gcc-subhex-paths-migrated-v2';
  const MIGRATION_FLAG_KEY_V3 = 'gcc-subhex-paths-migrated-v3';
  const BACKUP_KEY_V3         = 'gcc-subhex-paths-pre-v3-backup';

  let PATHS = {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) PATHS = JSON.parse(raw) || {};
  } catch(e){ PATHS = {}; }

  function save(){
    try { localStorage.setItem(LS_KEY, JSON.stringify(PATHS)); } catch(e){}
    _rebuildPathIndexes();
    try { window.dispatchEvent(new CustomEvent('gcc-subhex-changed')); } catch(e){}
  }

  function pathDocId(localId){ return `path_${localId}`; }
  function parsePathDocId(id){
    const m = /^path_(.+)$/.exec(id);
    return m ? m[1] : null;
  }
  function slugify(s){
    return String(s || '').trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'path';
  }
  function genLocalId(name){
    const base = slugify(name);
    let id = base, n = 2;
    while (PATHS[pathDocId(id)]) id = `${base}-${n++}`;
    return id;
  }

  // Six axial neighbors (flat-top).
  const NEIGHBOR_DELTAS = [
    [+1,  0], [ 0, +1], [-1, +1],
    [-1,  0], [ 0, -1], [+1, -1],
  ];
  function isNeighbor(a, b){
    if (!a || !b) return false;
    const dQ = b.Q - a.Q, dR = b.R - a.R;
    for (const [ddQ, ddR] of NEIGHBOR_DELTAS){
      if (dQ === ddQ && dR === ddR) return true;
    }
    return false;
  }

  // ── Queries ─────────────────────────────────────────────────────────────

  function listPaths(){
    return Object.values(PATHS).slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  // Paths with at least one cell whose owner is this parent — used by the
  // view to decide which paths to render in a given subhex window.
  // Index-driven; cold-path returns empty if the data layer isn't
  // loaded yet.
  function pathsInParent(col, row){
    const set = _PATHS_BY_PARENT.get(`${col}-${row}`);
    if (!set || !set.size) return [];
    const out = [];
    for (const id of set){
      const p = PATHS[pathDocId(id)];
      if (p) out.push(p);
    }
    return out.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  function getPath(localId){
    if (!localId) return null;
    return PATHS[pathDocId(localId)] || null;
  }

  // Look up a path by kind + name. Returns the longest-cells match
  // when there are duplicates (for forward-compat with pre-v2.1.0
  // data that may already contain dups). Returns null if no match.
  // Used by the marker-click handler to arm an existing path even
  // when its cells[] hasn't yet reached the boundary cell of the
  // current parent.
  function findByKindName(kind, name){
    if (!kind || !name) return null;
    const trimmed = String(name).trim();
    let best = null;
    for (const id in PATHS){
      const p = PATHS[id];
      if (!p || p.kind !== kind) continue;
      if ((p.name || '').trim() !== trimmed) continue;
      if (!best || (p.cells?.length || 0) > (best.cells?.length || 0)) best = p;
    }
    return best;
  }

  function createPath(kind, name){
    if (!PATH_KINDS_SET.has(kind) || !name) return null;
    // Dedup guard: refuse to create a second path with the same
    // kind+name. Authoring "Velverdyva (river)" twice is almost
    // always a mistake — typically the GM clicked a parent-marker
    // that didn't recognize an in-progress path on the other side
    // of a parent boundary. Return null so the caller can lookup
    // and arm the existing one instead.
    const trimmed = String(name).trim();
    for (const id in PATHS){
      const p = PATHS[id];
      if (p && p.kind === kind && (p.name || '').trim() === trimmed) return null;
    }
    const localId = genLocalId(name);
    const doc = {
      id: localId,
      kind,
      // Rivers default to tier='river' — most common case, GM
      // downgrades to stream or upgrades to great_river explicitly.
      // Non-rivers carry tier=null.
      tier: kind === 'river' ? 'river' : null,
      name: String(name).trim(),
      notes: '',
      cells: [],
      headwaters: null,
      mouth: null,
      schemaVersion: SCHEMA_VERSION,
      authoredAt: Date.now(),
    };
    PATHS[pathDocId(localId)] = doc;
    save();
    return doc;
  }

  function renamePath(localId, newName){
    const p = getPath(localId);
    if (!p || !newName) return false;
    p.name = String(newName).trim() || p.name;
    p.authoredAt = Date.now();
    save();
    return true;
  }

  function deletePath(localId){
    const docId = pathDocId(localId);
    if (!PATHS[docId]) return false;
    delete PATHS[docId];
    save();
    return true;
  }

  // Append a cell to the end of a path. Validates adjacency to current
  // last cell (or empty-path start).
  function appendCell(localId, Q, R){
    const p = getPath(localId);
    if (!p) return false;
    const last = p.cells.length ? p.cells[p.cells.length - 1] : null;
    if (last){
      if (last.Q === Q && last.R === R) return false;
      if (!isNeighbor(last, { Q, R })) return false;
    }
    p.cells.push({ Q, R });
    p.authoredAt = Date.now();
    save();
    return true;
  }

  function popCell(localId){
    const p = getPath(localId);
    if (!p || !p.cells.length) return false;
    p.cells.pop();
    p.authoredAt = Date.now();
    save();
    return true;
  }

  // Truncate the path at the first cell matching (Q, R): keep all cells
  // before it, drop that cell and everything after. If the matched
  // cell is the first cell, the path becomes empty (callers may then
  // choose to delete it). Used by the view's per-cell remove flow:
  // clicking an armed path's cell while the Path tool is active treats
  // the click as "I want the path to stop before here."
  function truncateBefore(localId, Q, R){
    const p = getPath(localId);
    if (!p || !p.cells.length) return false;
    const idx = p.cells.findIndex(c => c.Q === Q && c.R === R);
    if (idx < 0) return false;
    p.cells.splice(idx);
    p.authoredAt = Date.now();
    save();
    return true;
  }

  // Find every path that includes (Q, R). Index-driven; cold-start
  // fallback walks docs once if the index hasn't been built.
  function pathsAtCell(Q, R){
    const set = _PATHS_BY_CELL.get(`${Q},${R}`);
    if (!set || !set.size) return [];
    const out = [];
    for (const id of set){
      const p = PATHS[pathDocId(id)];
      if (p) out.push(p);
    }
    return out;
  }

  // ── Tier / linkage writers (v3) ────────────────────────────────────────

  function setPathTier(localId, tier){
    const p = getPath(localId);
    if (!p) return false;
    if (p.kind !== 'river') return false;
    if (tier !== null && !RIVER_TIERS_SET.has(tier)) return false;
    p.tier = tier;
    p.authoredAt = Date.now();
    save();
    return true;
  }

  // Validate a polymorphic linkage value: { lakeId } | { pathId } | null.
  // Returns the normalized value (a fresh object or null) or undefined
  // if the input is malformed.
  function _normalizeLinkage(v){
    if (v === null || v === undefined) return null;
    if (typeof v !== 'object') return undefined;
    if ('lakeId' in v && typeof v.lakeId === 'string' && v.lakeId.trim()){
      return { lakeId: v.lakeId.trim() };
    }
    if ('pathId' in v && typeof v.pathId === 'string' && v.pathId.trim()){
      return { pathId: v.pathId.trim() };
    }
    return undefined;
  }

  function setPathHeadwaters(localId, value){
    const p = getPath(localId);
    if (!p) return false;
    const norm = _normalizeLinkage(value);
    if (norm === undefined) return false;
    p.headwaters = norm;
    p.authoredAt = Date.now();
    save();
    return true;
  }

  function setPathMouth(localId, value){
    const p = getPath(localId);
    if (!p) return false;
    const norm = _normalizeLinkage(value);
    if (norm === undefined) return false;
    p.mouth = norm;
    p.authoredAt = Date.now();
    save();
    return true;
  }

  // Reverse the order of cells. Per design Q2: rivers carry direction
  // in cells[] order (cells[0]=source, cells[length-1]=mouth). The
  // authoring tool gets a "reverse" button for rivers. Roads/trails
  // can call this too — order is artifact only — but it's primarily a
  // river concern.
  function reverseCells(localId){
    const p = getPath(localId);
    if (!p) return false;
    p.cells = p.cells.slice().reverse();
    // Swap headwaters/mouth too, since their semantics are tied to
    // cells[0] / cells[length-1].
    const h = p.headwaters; p.headwaters = p.mouth; p.mouth = h;
    p.authoredAt = Date.now();
    save();
    return true;
  }

  // ── Indexes (eager rebuild on save / event) ────────────────────────────
  //
  // Three indexes feed the hot-path queries. The full rebuild is a single
  // pass over PATHS' cell lists; at GCC's scale this stays sub-millisecond
  // and isn't worth incrementalizing. Per design Q7.

  let _PATHS_BY_CELL   = new Map();   // 'Q,R'        → Set<localId>
  let _PATHS_BY_PARENT = new Map();   // 'col-row'    → Set<localId>
  let _PATHS_BY_EDGE   = new Map();   // canonical edge key → Set<localId>

  // Canonical edge key: ordered (lower col, lower row) first so both
  // directions of the same parent boundary resolve to the same key.
  // Mirrors the convention gcc-paths.js uses for ownerHex / edge keys.
  function edgeKey(colA, rowA, colB, rowB){
    if (colA < colB || (colA === colB && rowA < rowB)){
      return `${colA}-${rowA}-${colB}-${rowB}`;
    }
    return `${colB}-${rowB}-${colA}-${rowA}`;
  }

  function _addToSet(map, key, val){
    let set = map.get(key);
    if (!set){ set = new Set(); map.set(key, set); }
    set.add(val);
  }

  function _rebuildPathIndexes(){
    _PATHS_BY_CELL   = new Map();
    _PATHS_BY_PARENT = new Map();
    _PATHS_BY_EDGE   = new Map();
    if (!window.GCCSubhexData) return;   // owner lookups need data layer.
    const ownerOf = window.GCCSubhexData.ownerOf;
    for (const docId of Object.keys(PATHS)){
      const p = PATHS[docId];
      if (!p || !p.cells || !p.cells.length) continue;
      let prevOwner = null;
      for (let i = 0; i < p.cells.length; i++){
        const c = p.cells[i];
        if (typeof c.Q !== 'number' || typeof c.R !== 'number') continue;
        // Cell index.
        _addToSet(_PATHS_BY_CELL, `${c.Q},${c.R}`, p.id);
        // Parent index.
        const o = ownerOf(c.Q, c.R);
        if (o){
          _addToSet(_PATHS_BY_PARENT, `${o.col}-${o.row}`, p.id);
          // Edge index: when consecutive cells live in different
          // parents, this path crosses that parent boundary.
          if (prevOwner && (prevOwner.col !== o.col || prevOwner.row !== o.row)){
            _addToSet(
              _PATHS_BY_EDGE,
              edgeKey(prevOwner.col, prevOwner.row, o.col, o.row),
              p.id,
            );
          }
          prevOwner = o;
        } else {
          prevOwner = null;
        }
      }
    }
  }

  // Rebuild on every save event. External writers (terrain change in
  // gcc-subhex-data.js auto-clearing a cell that contained a path
  // anchor) also fire gcc-subhex-changed, so listen for that and
  // rebuild — keeps indexes correct even when a write originates
  // outside this module.
  if (typeof window !== 'undefined' && window.addEventListener){
    window.addEventListener('gcc-subhex-changed', _rebuildPathIndexes);
  }

  // Indexed convenience queries. parentHasPathAuthoring is the
  // canonical name (Slice 3's facade ORs it with
  // GCCSubhexData.parentHasLakeAuthoring). parentHasSubhexPaths is
  // aliased to it for compatibility with gcc-paths.js v0.8 which
  // already calls the old name.
  function parentHasPathAuthoring(col, row){
    const set = _PATHS_BY_PARENT.get(`${col}-${row}`);
    return !!(set && set.size > 0);
  }

  function pathsCrossingParentEdge(colA, rowA, colB, rowB){
    const set = _PATHS_BY_EDGE.get(edgeKey(colA, rowA, colB, rowB));
    if (!set || !set.size) return [];
    const out = [];
    for (const id of set){
      const p = PATHS[pathDocId(id)];
      if (p) out.push(p);
    }
    return out;
  }

  // ── Boundary queries (for the parent-layer planner) ───────────────────
  // The parent-layer movement planner uses these to ask: "if I cross
  // from parent A to parent B, what does the subhex authoring say?"
  // The subhex layer is canonical when present — if the GM has
  // authored even one path in either parent, the planner trusts the
  // subhex picture entirely for that parent boundary.

  // Quick check: does this parent have ANY subhex paths whose cells
  // are owned by it? Used by the planner to decide whether to consult
  // subhex data or fall back to the 30mi-resolution parent layer.
  // Aliased to parentHasPathAuthoring (the canonical Slice 2+ name)
  // so existing call sites in gcc-paths.js v0.8 keep working unchanged.
  const parentHasSubhexPaths = parentHasPathAuthoring;

  // Inspect the boundary between two parents and report what subhex
  // authoring says about it. Returns:
  //   { hasData: bool      — at least one of the two parents has any
  //                          subhex paths (so we should trust subhex),
  //     boundaryCell: {Q,R} — the boundary cell (subhex closest to the
  //                          shared parent edge midpoint),
  //     hasRoad: bool      — a road or track passes through that cell,
  //     hasRiver: bool     — a river or stream passes through that cell }
  // If hasData is false, the planner should fall back to parent data.
  // Per Rule 1: a road on the boundary cell makes the edge traversable.
  // A river without a road would normally block, but at this layer we
  // just report what's there — the caller decides.
  function subhexBoundaryInfo(parentColA, parentRowA, parentColB, parentRowB){
    if (!window.GCCSubhexData){
      return { hasData: false, boundaryCell: null, hasRoad: false, hasRiver: false, crossing: null };
    }
    const aHas = parentHasSubhexPaths(parentColA, parentRowA);
    const bHas = parentHasSubhexPaths(parentColB, parentRowB);
    if (!aHas && !bHas){
      return { hasData: false, boundaryCell: null, hasRoad: false, hasRiver: false, crossing: null };
    }
    // A road crosses the parent edge if any pair of axially-adjacent
    // cells (one owned by A, one owned by B) are both on the same
    // road or track path. We scan parent A's boundary cells, look at
    // each cell's neighbors, and check whether any neighbor owned by
    // parent B shares a path with it. Same for rivers.
    const NEIGHBORS = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
    const ownedA = window.GCCSubhexData.ownedByParent(parentColA, parentRowA);
    const CROSSING_KINDS = new Set(['bridge','ford','ferry','crossroads']);
    let hasRoad = false, hasRiver = false;
    let representativeCell = null;
    let roadCell = null;
    // Track every cell on either side of the boundary that touches a
    // shared path. Crossing feature can live on any of them; the road-
    // bearing cell is the natural place but the GM might author on
    // either side.
    const boundaryCells = [];
    const seenKeys = new Set();
    function pushBoundary(Q, R){
      const k = `${Q}_${R}`;
      if (seenKeys.has(k)) return;
      seenKeys.add(k);
      boundaryCells.push({ Q, R });
    }
    for (const c of ownedA){
      // For each neighbor of c that's owned by parent B, this cell c
      // is on the parent edge. Check if c and the neighbor share any
      // path, and bucket the result.
      for (const [dq, dr] of NEIGHBORS){
        const nQ = c.Q + dq, nR = c.R + dr;
        const nOwner = window.GCCSubhexData.ownerOf(nQ, nR);
        if (!nOwner || nOwner.col !== parentColB || nOwner.row !== parentRowB) continue;
        // c is in A and (nQ, nR) is in B. Check shared paths.
        const atC = pathsAtCell(c.Q, c.R);
        const atN = pathsAtCell(nQ, nR);
        if (!atC.length) continue;
        for (const p of atC){
          if (!atN.some(p2 => p2.id === p.id)) continue;
          // p crosses the parent boundary at this cell pair.
          if (p.kind === 'road' || p.kind === 'track'){
            hasRoad = true;
            roadCell = c;
          } else if (p.kind === 'river' || p.kind === 'stream'){
            hasRiver = true;
          }
          pushBoundary(c.Q, c.R);
          pushBoundary(nQ, nR);
        }
        // Track at least one boundary cell for the return value.
        if (!representativeCell) representativeCell = c;
      }
    }
    // Resolve crossing feature: prefer the road-bearing cell. If no
    // crossing is on the road cell, fall through to any other boundary
    // cell that has one. Returns null if no boundary cell hosts a
    // crossing feature.
    let crossing = null;
    function readCrossing(Q, R){
      if (typeof window.GCCSubhexData.getCellFeature !== 'function') return null;
      const f = window.GCCSubhexData.getCellFeature(Q, R);
      if (!f || !CROSSING_KINDS.has(f.kind)) return null;
      return { kind: f.kind, name: f.name || '', notes: f.notes || '', Q, R };
    }
    if (roadCell) crossing = readCrossing(roadCell.Q, roadCell.R);
    if (!crossing){
      for (const bc of boundaryCells){
        const found = readCrossing(bc.Q, bc.R);
        if (found){ crossing = found; break; }
      }
    }
    // Prefer the road cell as the "boundary cell" returned, since
    // that's the one callers want to highlight or query about. Fall
    // back to any boundary cell, then to the closest-to-midpoint
    // computation for the no-data case.
    const cell = roadCell || representativeCell
      || boundaryCellBetweenParents(parentColA, parentRowA, parentColB, parentRowB);
    return { hasData: true, boundaryCell: cell, hasRoad, hasRiver, crossing };
  }

  // Pick the subhex cell on parent A whose center is geometrically
  // closest to the midpoint of the shared parent edge. Mirrors the
  // marker-anchoring logic in gcc-subhex-view.js. The parent edge
  // direction is implied by the (A, B) pair — we don't need to know
  // the edge index up front; we just find the boundary cell of A
  // closest to B's center.
  function boundaryCellBetweenParents(colA, rowA, colB, rowB){
    if (!window.GCCSubhexData) return null;
    const aCenter = window.GCCSubhexData.parentCenterAxial(colA, rowA);
    const bCenter = window.GCCSubhexData.parentCenterAxial(colB, rowB);
    // Direction from A to B in axial space.
    const dQ = bCenter.Q - aCenter.Q;
    const dR = bCenter.R - aCenter.R;
    // The boundary cell of A is roughly half a parent away in that
    // direction. Parents are 10 subhex units apart center-to-center,
    // so the boundary midpoint is +5 in (dQ, dR) direction.
    const len = Math.sqrt(dQ * dQ + dR * dR + dQ * dR);
    if (len === 0) return null;
    const targetQ = aCenter.Q + 5 * dQ / len;
    const targetR = aCenter.R + 5 * dR / len;
    // Find the owned cell of parent A closest to that target.
    const owned = window.GCCSubhexData.ownedByParent(colA, rowA);
    if (!owned.length) return null;
    let best = null, bestD = Infinity;
    for (const c of owned){
      const dq = c.Q - targetQ, dr = c.R - targetR;
      // Hex distance via cube coords: max(|q|,|r|,|s|).
      const s = -dq - dr;
      const d = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(s));
      if (d < bestD){ bestD = d; best = c; }
    }
    return best;
  }

  function exportPaths(){ return JSON.parse(JSON.stringify(PATHS)); }
  function importPaths(obj){
    if (!obj || typeof obj !== 'object') return false;
    PATHS = JSON.parse(JSON.stringify(obj));
    save();
    return true;
  }

  // ── Migration v0.9 → v1.0 ──────────────────────────────────────────────
  {
    let migratedFlag = false;
    try { migratedFlag = !!localStorage.getItem(MIGRATION_FLAG_KEY_V2); } catch(e){}
    if (!migratedFlag){
      let mp = 0, mc = 0, dropped = 0;
      const next = {};
      for (const oldId of Object.keys(PATHS)){
        const oldDoc = PATHS[oldId];
        const m = /^(.+)__(.+)$/.exec(oldId);
        if (!m){ dropped++; continue; }
        const parentId = m[1];
        const oldLocalId = oldDoc?.id || m[2];
        const parent = (typeof window.darleneToInternal === 'function')
          ? window.darleneToInternal(parentId)
          : null;
        if (!parent || !window.GCCSubhexData){ dropped++; continue; }
        const center = window.GCCSubhexData.parentCenterAxial(parent.col, parent.row);

        const newCells = [];
        for (const c of (oldDoc.cells || [])){
          if (typeof c.q !== 'number' || typeof c.r !== 'number') continue;
          newCells.push({ Q: center.Q + (c.q - 5), R: center.R + (c.r - 5) });
          mc++;
        }

        let newLocalId = oldLocalId;
        let n = 2;
        while (next[pathDocId(newLocalId)]) newLocalId = `${oldLocalId}-${n++}`;

        next[pathDocId(newLocalId)] = {
          id: newLocalId,
          kind: oldDoc.kind || 'road',
          name: oldDoc.name || newLocalId,
          notes: oldDoc.notes || '',
          cells: newCells,
          schemaVersion: 2,
          authoredAt: oldDoc.authoredAt || Date.now(),
        };
        mp++;
      }
      PATHS = next;
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(PATHS));
        localStorage.setItem(MIGRATION_FLAG_KEY_V2, '1');
      } catch(e){}
      if (mp || dropped){
        console.log(`[GCCSubhexPaths] v0.9→v1.0: ${mp} path(s), ${mc} cell(s) migrated; ${dropped} dropped.`);
      }
    }
  }

  // ── Migration v2 → v3 ──────────────────────────────────────────────────
  // Per design Q8: write a full pre-v3 backup; default tier='river' for
  // any river kind without a tier; defensive 'track' → 'trail' rename
  // (no current data uses 'track', but be paranoid); add headwaters
  // and mouth = null on all docs lacking them; bump schemaVersion to 3.
  // Idempotent: gated on MIGRATION_FLAG_KEY_V3.
  {
    let migratedFlag = false;
    try { migratedFlag = !!localStorage.getItem(MIGRATION_FLAG_KEY_V3); } catch(e){}
    if (!migratedFlag){
      const ids = Object.keys(PATHS);
      // Backup before mutating. Skip if the dump fails — better to
      // proceed without a backup than to skip the migration.
      try {
        localStorage.setItem(BACKUP_KEY_V3, JSON.stringify(PATHS));
      } catch(e){
        console.warn('[GCCSubhexPaths] v2→v3 backup write failed:', e);
      }
      let mt = 0, mr = 0, mp = 0;
      for (const docId of ids){
        const doc = PATHS[docId];
        if (!doc) continue;
        let dirty = false;
        if (doc.kind === 'track'){
          doc.kind = 'trail';
          dirty = true;
          mr++;
        }
        if (doc.kind === 'river' && !doc.tier){
          doc.tier = 'river';
          dirty = true;
          mt++;
        }
        if (doc.kind !== 'river' && doc.tier !== null){
          // Includes the undefined case (v2 doc, no tier field at all):
          // for non-river kinds, tier is canonically null in v3.
          doc.tier = null;
          dirty = true;
        }
        if (!('headwaters' in doc)){ doc.headwaters = null; dirty = true; }
        if (!('mouth'      in doc)){ doc.mouth      = null; dirty = true; }
        if (doc.schemaVersion !== SCHEMA_VERSION){
          doc.schemaVersion = SCHEMA_VERSION;
          dirty = true;
        }
        if (dirty) mp++;
      }
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(PATHS));
        localStorage.setItem(MIGRATION_FLAG_KEY_V3, '1');
      } catch(e){}
      if (mp){
        console.log(`[GCCSubhexPaths] v2→v3: ${mp} path(s) updated (${mt} default tiers, ${mr} track→trail).`);
      }
    }
  }

  // Build indexes once now that all migrations are done. save() and the
  // gcc-subhex-changed listener handle subsequent rebuilds.
  _rebuildPathIndexes();

  window.GCCSubhexPaths = {
    PATH_KINDS, RIVER_TIERS, SCHEMA_VERSION,
    listPaths, pathsInParent, getPath, findByKindName, createPath, renamePath, deletePath,
    appendCell, popCell, truncateBefore, pathsAtCell, isNeighbor,
    setPathTier, setPathHeadwaters, setPathMouth, reverseCells,
    parentHasPathAuthoring, parentHasSubhexPaths,
    pathsCrossingParentEdge, edgeKey,
    subhexBoundaryInfo, boundaryCellBetweenParents,
    exportPaths, importPaths,
  };
})();
