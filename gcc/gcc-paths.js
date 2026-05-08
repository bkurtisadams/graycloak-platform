// gcc-paths.js v0.10.1 — 2026-05-02
// v0.10.1: reconcile current mapping with the journey planner.
// The journey planner's existing inline shipCurrentModifier (in
// greyhawk-map.html) treats the chain's `current` field (1/2/3) as
// the direct daily modifier (×8), so:
//   current=1 → ±8 mi/day
//   current=2 → ±16 mi/day
//   current=3 → ±24 mi/day
// v0.10.0 mistakenly mapped current → mph first (1→0.5, 2→1, 3→2),
// which under-applied by 2× compared to what the planner ships were
// already running on. Match the planner — it's the older code, the
// displayed travel times have been calibrated against it, and the
// data model treats `current` as a tier value not an mph.
//
// Per docs/rules/movement.md (updated): GCC interprets WoG current
// 1/2/3 as the direct ×8 daily modifier in DMG terms, folding the
// C×8 calculation into a single multiplier.
//
// Public surface unchanged — currentMphFromTier returns the value
// callers will multiply by 8, so it now returns 1/2/3 directly.
// edgeRiverCurrentMph stays usefully named (the *8 happens at the
// consumer); the field is still in mph-equivalent units, just no
// longer divided by 2.
//
// v0.10.0 — 2026-05-02
// v0.10.0: river direction helpers for voyage. Adds:
//   - edgeRiverDirection(cA, rA, cB, rB) →
//       null | { tier, current, riverName, direction, source }
//     where direction ∈ 'with' | 'against' | 'cross':
//       'with'    — moving A→B is downstream (B is downstream of A on
//                   the same river chain)
//       'against' — moving A→B is upstream (A is downstream of B)
//       'cross'   — both A and B are river hexes but not on the same
//                   chain or not adjacent on the chain (i.e. the river
//                   crosses the A↔B edge perpendicularly)
//     Returns null when neither hex has a river segment that touches
//     the A↔B edge.
//   - currentMphFromTier(current) →
//       0.5 mph (current=1, gentle), 1 mph (=2, normal), 2 mph (=3, strong)
//     This is GCC's interpretation of WoG's 1/2/3 current scale,
//     used to feed DMG's C×8 formula. See docs/rules/movement.md.
//   - edgeRiverCurrentMph(cA, rA, cB, rB) →
//       null | { mph, direction, riverName, tier }
//     convenience wrapper that combines edgeRiverDirection +
//     currentMphFromTier with sign applied:
//       direction='with'    → mph =  +C
//       direction='against' → mph =  -C
//       direction='cross'   → mph =   0
//     The voyage planner consumes this directly.
//
// Subhex-canonical edges are handled too — they delegate to the
// subhex layer for direction. Subhex paths don't carry per-segment
// direction yet, so subhex-only edges return direction='cross' for
// now (no with/against bonus). TODO: subhex paths need an
// upstream/downstream tag for full parity.
//
// v0.9.0 — 2026-04-30
// v0.9.0: per-parent fallback gate (Slice 3 of DESIGN-paths-water.md).
// Tightening of v0.5+: when EITHER parent of a queried edge has any
// subhex authoring (paths or lakes — checked via
// _parentHasSubhexAuthoring), the subhex layer is canonical for that
// parent's edges. Parent-layer rivers, roads, and crossings are
// hidden from the planner for that parent. When neither parent has
// subhex authoring, parent-layer data is used as before.
//
// This is a behavior shift from v0.5+ which used per-edge fallback
// (parent data filled gaps the GM hadn't subhex-authored at this
// specific edge). Per-parent makes "I've taken authority for this
// parent" the cleaner mental model.
//
// New TIER_COST const at the top — placeholder numbers per the design:
//   stream:      0 / 0
//   river:       0 / 0.5    (light / encumbered)
//   great_river: 0.5 / 1.0
// Pin to the Greyhawk box raft rules when Kurt confirms citation.
//
// Helpers rewritten internally; public API stable. New export
// parentHasSubhexAuthoring (Slice 5's hex-edit gating uses it).
// CRUD writers (saveRiver, saveRoad, saveCrossing, deleteRiver,
// deleteRoad, deleteCrossing) now throw a specific Error when any
// chain hex's parent has subhex authoring — UI catches & shows the
// disabled-with-explanation banner.
// gcc-paths.js v0.8.0 — 2026-04-29
// v0.8.0: edgeCrossingInfo(colA,rowA,colB,rowB) returns the crossing
// the journey planner would use on this edge, preferring the subhex
// layer's named crossing over the parent-layer record. Lets the
// dialog surface a Crossings line that confirms authored bridges
// /fords/ferries are actually being used.
// v0.7.0: Crossings carry an optional `notes` field. saveCrossing
// signature is now (colA, rowA, colB, rowB, kind, name, notes);
// allCrossings() returns notes alongside name. Override storage and
// replay preserve notes.
// v0.6.0: Greyhawk raft rule. Rivers no longer fully block movement.
// Per the 1980 Greyhawk box: light parties swim across (no cost),
// encumbered parties build floats (~half day). Bridges, fords, and
// ferries reduce the cost to zero. Subhex roads on the boundary cell
// also reduce the cost to zero (Rule 1 still applies). New
// edgeRiverCost(colA, rowA, colB, rowB, mode, burden) returns extra
// days for the edge given party burden. edgeBlocks now always
// returns false for land travel (legacy compat) — the cost-aware
// planner uses edgeRiverCost. edgeRiverInfo's `blocks` flag is now
// informational only. Streams remain free as before.
// v0.5.0: edgeBlocks and edgeRoadBonus now consult the subhex layer
// first via window.GCCSubhexPaths.subhexBoundaryInfo. Per Rule 1
// (Kurt 2026-04-29): if the GM has authored a subhex road on the
// boundary cell between two parents, that edge is traversable
// regardless of any parent-level river. If no subhex road is present,
// behavior falls back to the existing 30mi parent-layer logic. The
// subhex layer thus becomes authoritative for any region the GM has
// detailed; unauthored regions still work via the original parent
// data.
// v0.4.1 — 2026-04-28
// Edge-based path features for the Greyhawk hex map: rivers, roads,
// bridges, fords, ferries. v0.2 adds editor-driven CRUD with
// localStorage override layering on top of hardcoded base data.
// v0.3.0: Phase B — crossing CRUD (saveCrossing/deleteCrossing/
// allCrossings/crossingAt) with override storage + replay. No base
// crossings yet; all live in the override layer until baked.
// v0.4.0: Phase C — road CRUD (saveRoad/deleteRoad/getRoadInfo/
// getRoadChain) parallels the river layer. Road segments carry
// kind: 'road'|'track' directly; roadsAt filter accepts both.
// No base roads yet.
//
// ── Edge numbering ──────────────────────────────────────────────────────────
// Flat-top hexes with odd-q-offset coordinates (odd cols shifted DOWN
// by half a row). Edges numbered clockwise from N: 0=N, 1=NE, 2=SE,
// 3=S, 4=SW, 5=NW. Opposite edge = (e + 3) % 6.
//
// ── Storage ─────────────────────────────────────────────────────────────────
// SEGMENTS (rivers/roads): per-hex records in hexSegments. Each segment
// has entryEdge + exitEdge identifying its hex boundaries; first hex of
// a chain has entry = -1 (open source), last has exit = -1 (open mouth).
//
// EDGE FEATURES (bridges/fords/ferries): single record per shared edge
// stored on the lower-coord hex per ownerHex().
//
// ── Override model ──────────────────────────────────────────────────────────
// Two-layer like gcc-terrain / gcc-regions. Base data is hardcoded
// here; override data lives in localStorage as {name → {type, current,
// chain}} plus a deletedRivers tombstone list. rebuild() wipes and
// replays both — base entities not in deleted set restored, override
// entities (including ones sharing a base name) clobber the base.
//
// ── v0.2 scope ─────────────────────────────────────────────────────────────
// Phase A of the Hex Editor wiring: rivers only. Roads, edge-feature
// CRUD, and Firebase sync remain as in v0.1 (Phase B/C/F).
//
// v0.2.1: All 44 canonical Flanaess rivers baked into base data.
// Placeholder bridges removed (Phase B will add real ones via the
// Crossings editor). After loading, click Reset All in the Paths
// pane to clear stale localStorage overrides from the v0.2 placeholders.

(function(){
  'use strict';

  const NEIGHBOR_OFFSETS = {
    even: [[0,-1],[1,-1],[1,0],[0,1],[-1,0],[-1,-1]],
    odd:  [[0,-1],[1, 0],[1,1],[0,1],[-1,1],[-1, 0]],
  };
  const EDGE_NAMES = ['N','NE','SE','S','SW','NW'];
  const RIVER_TYPES = ['stream','river','great_river'];
  const ROAD_KINDS = ['road','track'];
  const CROSSING_KINDS = new Set(['bridge','footbridge','ford','ferry']);

  // Tier-cost table — extra travel-days added by an unbridged river
  // edge of the given tier, indexed by party burden. Placeholder
  // numbers per DESIGN-paths-water.md Q6; pin to Greyhawk box raft
  // rules when the citation is confirmed.
  const TIER_COST = {
    stream:      { light: 0,   encumbered: 0   },
    river:       { light: 0,   encumbered: 0.5 },
    great_river: { light: 0.5, encumbered: 1.0 },
  };

  // Subhex-authoring gate (Slice 3). The subhex layer is canonical for
  // a parent when EITHER paths or lakes are authored anywhere in it.
  // Defensive: returns false when the subhex modules haven't loaded
  // yet (script-load order puts gcc-paths.js before the subhex modules).
  function _parentHasSubhexAuthoring(col, row){
    if (typeof window === 'undefined') return false;
    const SP = window.GCCSubhexPaths;
    const SD = window.GCCSubhexData;
    if (SP && typeof SP.parentHasPathAuthoring === 'function'){
      if (SP.parentHasPathAuthoring(col, row)) return true;
    }
    if (SD && typeof SD.parentHasLakeAuthoring === 'function'){
      if (SD.parentHasLakeAuthoring(col, row)) return true;
    }
    return false;
  }
  // Either-side gate: an edge is subhex-canonical if either parent is
  // subhex-authored. Per design Q3.
  function _edgeIsSubhexCanonical(colA, rowA, colB, rowB){
    return _parentHasSubhexAuthoring(colA, rowA)
        || _parentHasSubhexAuthoring(colB, rowB);
  }
  // Public alias for Slice 5's hex-edit gating.
  const parentHasSubhexAuthoring = _parentHasSubhexAuthoring;

  function neighborAcross(col, row, edge){
    const off = (col % 2 === 0) ? NEIGHBOR_OFFSETS.even : NEIGHBOR_OFFSETS.odd;
    const [dc, dr] = off[edge];
    return { col: col + dc, row: row + dr };
  }
  function edgeBetween(colA, rowA, colB, rowB){
    const off = (colA % 2 === 0) ? NEIGHBOR_OFFSETS.even : NEIGHBOR_OFFSETS.odd;
    for (let e = 0; e < 6; e++){
      if (colA + off[e][0] === colB && rowA + off[e][1] === rowB) return e;
    }
    return -1;
  }
  function ownerHex(colA, rowA, colB, rowB){
    if (colA < colB) return { col: colA, row: rowA };
    if (colA > colB) return { col: colB, row: rowB };
    return rowA < rowB ? { col: colA, row: rowA } : { col: colB, row: rowB };
  }
  function keyOf(col, row){ return `${col}-${row}`; }
  function areAdjacent(colA, rowA, colB, rowB){
    return edgeBetween(colA, rowA, colB, rowB) >= 0;
  }

  // ── Stores ─────────────────────────────────────────────────────────────
  const hexSegments = {};       // 'col-row' → [seg, ...]
  const hexEdgeFeatures = {};   // 'col-row' → { edgeNum: [feature, ...] }
  const namedRivers = {};       // 'Selintan' → [{col, row, segment}, ...]
  const namedRoads = {};

  function _addSegment(col, row, seg){
    const k = keyOf(col, row);
    (hexSegments[k] = hexSegments[k] || []).push(seg);
    if (seg.name){
      const bucket = seg.kind === 'river' ? namedRivers : namedRoads;
      (bucket[seg.name] = bucket[seg.name] || []).push({ col, row, segment: seg });
    }
  }
  function _addEdgeFeature(col, row, edge, feature){
    const k = keyOf(col, row);
    if (!hexEdgeFeatures[k]) hexEdgeFeatures[k] = {};
    (hexEdgeFeatures[k][edge] = hexEdgeFeatures[k][edge] || []).push(feature);
  }
  function _wipeRiver(name){
    const entries = namedRivers[name] || [];
    for (const { col, row, segment } of entries){
      const k = keyOf(col, row);
      const arr = hexSegments[k];
      if (!arr) continue;
      const filtered = arr.filter(s => s !== segment);
      if (filtered.length === 0) delete hexSegments[k];
      else hexSegments[k] = filtered;
    }
    delete namedRivers[name];
  }
  function _wipeRoad(name){
    const entries = namedRoads[name] || [];
    for (const { col, row, segment } of entries){
      const k = keyOf(col, row);
      const arr = hexSegments[k];
      if (!arr) continue;
      const filtered = arr.filter(s => s !== segment);
      if (filtered.length === 0) delete hexSegments[k];
      else hexSegments[k] = filtered;
    }
    delete namedRoads[name];
  }
  function _clearAll(){
    for (const k of Object.keys(hexSegments)) delete hexSegments[k];
    for (const k of Object.keys(hexEdgeFeatures)) delete hexEdgeFeatures[k];
    for (const k of Object.keys(namedRivers)) delete namedRivers[k];
    for (const k of Object.keys(namedRoads)) delete namedRoads[k];
  }

  // ── Accessors ──────────────────────────────────────────────────────────
  function segmentsAt(col, row){ return hexSegments[keyOf(col, row)] || []; }
  function riversAt(col, row){   return segmentsAt(col, row).filter(s => s.kind === 'river'); }
  function roadsAt(col, row){    return segmentsAt(col, row).filter(s => s.kind === 'road' || s.kind === 'track'); }
  function edgeFeaturesAt(colA, rowA, colB, rowB){
    const owner = ownerHex(colA, rowA, colB, rowB);
    const ownerIsA = (owner.col === colA && owner.row === rowA);
    const nbCol = ownerIsA ? colB : colA;
    const nbRow = ownerIsA ? rowB : rowA;
    const e = edgeBetween(owner.col, owner.row, nbCol, nbRow);
    if (e < 0) return [];
    return hexEdgeFeatures[keyOf(owner.col, owner.row)]?.[e] || [];
  }

  function _riverOnEdge(colA, rowA, colB, rowB){
    const eA = edgeBetween(colA, rowA, colB, rowB);
    if (eA < 0) return null;
    for (const seg of riversAt(colA, rowA)){
      if (seg.entryEdge === eA || seg.exitEdge === eA) return seg;
    }
    const eB = (eA + 3) % 6;
    for (const seg of riversAt(colB, rowB)){
      if (seg.entryEdge === eB || seg.exitEdge === eB) return seg;
    }
    return null;
  }
  function _roadOnEdge(colA, rowA, colB, rowB){
    const eA = edgeBetween(colA, rowA, colB, rowB);
    if (eA < 0) return null;
    for (const seg of roadsAt(colA, rowA)){
      if (seg.entryEdge === eA || seg.exitEdge === eA) return seg;
    }
    const eB = (eA + 3) % 6;
    for (const seg of roadsAt(colB, rowB)){
      if (seg.entryEdge === eB || seg.exitEdge === eB) return seg;
    }
    return null;
  }

  // ── Subhex-edge inspection helpers (Slice 3) ───────────────────────────
  //
  // When a parent is subhex-canonical, we ask the subhex layer "is there
  // a river / road / crossing on this parent boundary?" These return
  // shapes the existing resolvers can plug into. They consult
  // GCCSubhexPaths.subhexBoundaryInfo (already cell-pair-aware in v1.3+)
  // and return river tier from the subhex path doc directly.

  // Returns { hasRiver, tier, name, crossing } describing the subhex
  // layer's verdict for the parent boundary. Returns null when the
  // subhex modules aren't loaded.
  function _subhexEdgeView(colA, rowA, colB, rowB){
    if (typeof window === 'undefined' || !window.GCCSubhexPaths) return null;
    const SP = window.GCCSubhexPaths;
    if (typeof SP.subhexBoundaryInfo !== 'function') return null;
    const info = SP.subhexBoundaryInfo(colA, rowA, colB, rowB);
    if (!info) return null;
    // subhexBoundaryInfo gives hasRoad / hasRiver / crossing but not
    // the river's tier / name. Walk the cells it found and pull from
    // path docs.
    let tier = null;
    let name = null;
    if (info.hasRiver && info.boundaryCell && typeof SP.pathsAtCell === 'function'){
      // Find a river-kind path whose cells include this boundary cell
      // AND a neighbor cell owned by the *other* parent (that's the
      // edge crossing). pathsAtCell already returns all paths through
      // the cell; we just pick the first river/stream and read its
      // tier.
      const here = SP.pathsAtCell(info.boundaryCell.Q, info.boundaryCell.R);
      for (const p of here){
        if (p.kind === 'river' || p.kind === 'stream'){
          // v3 docs carry tier; v2 docs (forward-compat downgrade) may
          // not. Default to 'river' (the v2→v3 migration default).
          tier = p.tier || 'river';
          name = p.name || null;
          break;
        }
      }
    }
    return {
      hasRiver: !!info.hasRiver,
      hasRoad:  !!info.hasRoad,
      tier,
      riverName: name,
      crossing: info.crossing || null,
      boundaryCell: info.boundaryCell || null,
    };
  }

  // ── Resolver ───────────────────────────────────────────────────────────
  // Per-parent fallback gate (Slice 3). When either parent of the queried
  // edge has subhex authoring, the subhex layer is canonical for this
  // boundary. Parent layer is consulted only when neither parent is
  // subhex-authored.
  //
  // The Greyhawk box (1980) lets parties cross rivers without a bridge
  // or ford by swimming if light, or by building floats if encumbered
  // (~half day delay). So rivers don't "block" — they add a time cost
  // when no crossing is present and the party can't just swim.
  // edgeRiverInfo still returns the legacy `blocks` flag for callers
  // that expect a binary, but the cost-aware planner uses
  // edgeRiverCost.
  //
  // Map subhex tier → parent-shape `type` for legacy callers reading
  // `info.river.type`. Subhex tier values already match the legacy
  // RIVER_TYPES strings exactly, so this is identity. Parent-layer
  // rivers carry `current: 1|2|3` but also `type` directly, so the
  // existing parent path already returns a compatible shape.
  function edgeRiverInfo(colA, rowA, colB, rowB){
    if (_edgeIsSubhexCanonical(colA, rowA, colB, rowB)){
      const view = _subhexEdgeView(colA, rowA, colB, rowB);
      if (!view || !view.hasRiver){
        return { blocks: false, river: null, crossing: null };
      }
      const tier = view.tier || 'river';
      const river = {
        kind: 'river',
        type: tier,                     // 'stream' | 'river' | 'great_river'
        tier,                           // explicit tier surface (new)
        name: view.riverName || '',
        // current is parent-layer-specific (1/2/3); subhex paths don't
        // carry it. Map tier back to a sensible default for callers
        // that read it: stream=1, river=2, great_river=3.
        current: tier === 'stream' ? 1 : (tier === 'great_river' ? 3 : 2),
        source: 'subhex',
      };
      const crossing = view.crossing
        ? { kind: view.crossing.kind, name: view.crossing.name || '', notes: view.crossing.notes || '' }
        : null;
      if (tier === 'stream') return { blocks: false, river, crossing };
      return { blocks: !crossing, river, crossing };
    }
    // Parent-canonical path (no subhex authoring on either side).
    const river = _riverOnEdge(colA, rowA, colB, rowB);
    if (!river) return { blocks: false, river: null, crossing: null };
    const crossing = edgeFeaturesAt(colA, rowA, colB, rowB)
      .find(f => CROSSING_KINDS.has(f.kind));
    // Surface tier alongside legacy `type` for forward-compat.
    const enriched = { ...river, tier: river.type };
    if (river.type === 'stream') return { blocks: false, river: enriched, crossing: crossing || null };
    return { blocks: !crossing, river: enriched, crossing: crossing || null };
  }

  // ── River direction (for voyage planner) ─────────────────────────────
  //
  // "If a boat moves from hex A to hex B, is it going downstream,
  // upstream, or across?" The chain model stores direction implicitly:
  // segment.exitEdge is the downstream-pointing edge. So:
  //   - if A's segment.exitEdge points at B → A→B is downstream ('with')
  //   - if A's segment.entryEdge points at B → A→B is upstream ('against')
  //   - both A and B have a river but no chain link between them →
  //     'cross' (the river runs perpendicular to A↔B and is being
  //     crossed). This is the existing crossing case, returned for
  //     completeness so callers can short-circuit to base speed.
  //   - neither A nor B has a relevant river → null
  //
  // Crucially, this only fires for the river segment that touches the
  // A↔B edge. A hex can have multiple rivers passing through; we want
  // the one that the boat is *on*, which is the one whose chain
  // includes both A and B as adjacent stops.
  function edgeRiverDirection(colA, rowA, colB, rowB){
    // Subhex-canonical: subhex layer tells us there's a river on this
    // boundary, but doesn't carry segment-level direction yet. Mark
    // 'cross' so the voyage planner uses base speed without bonus.
    // TODO: when subhex paths grow upstream/downstream tags, lift this.
    if (_edgeIsSubhexCanonical(colA, rowA, colB, rowB)){
      const view = _subhexEdgeView(colA, rowA, colB, rowB);
      if (!view || !view.hasRiver) return null;
      const tier = view.tier || 'river';
      return {
        tier,
        current: tier === 'stream' ? 1 : (tier === 'great_river' ? 3 : 2),
        riverName: view.riverName || '',
        direction: 'cross',
        source: 'subhex',
      };
    }
    const eA = edgeBetween(colA, rowA, colB, rowB);
    if (eA < 0) return null;
    const eB = (eA + 3) % 6;
    // Check A's segments for one that links to B via this edge.
    for (const seg of riversAt(colA, rowA)){
      if (seg.exitEdge === eA){
        return {
          tier: seg.type,
          current: seg.current,
          riverName: seg.name,
          direction: 'with',
          source: 'parent',
        };
      }
      if (seg.entryEdge === eA){
        return {
          tier: seg.type,
          current: seg.current,
          riverName: seg.name,
          direction: 'against',
          source: 'parent',
        };
      }
    }
    // Symmetric check from B's side, in case A's segment data is
    // missing but B's records the same edge from the other angle.
    for (const seg of riversAt(colB, rowB)){
      if (seg.exitEdge === eB){
        // B's exit points at A, so river flows B→A; A→B is upstream.
        return {
          tier: seg.type,
          current: seg.current,
          riverName: seg.name,
          direction: 'against',
          source: 'parent',
        };
      }
      if (seg.entryEdge === eB){
        // B's entry comes from A; river flows A→B; A→B is downstream.
        return {
          tier: seg.type,
          current: seg.current,
          riverName: seg.name,
          direction: 'with',
          source: 'parent',
        };
      }
    }
    // Neither hex has a chain link via this edge — but is there still
    // a river crossing it (river enters/exits through eA from a side
    // not in our chain link check)? edgeRiverInfo answers this; if so,
    // it's a 'cross'. This handles the case where two different rivers
    // converge near the same edge.
    const info = edgeRiverInfo(colA, rowA, colB, rowB);
    if (info && info.river){
      return {
        tier: info.river.tier || info.river.type || 'river',
        current: info.river.current,
        riverName: info.river.name || '',
        direction: 'cross',
        source: 'parent',
      };
    }
    return null;
  }

  // GCC's interpretation of WoG current 1/2/3 as the direct ×8 daily
  // modifier in DMG-equivalent terms. Caller multiplies by 8 to get
  // mi/day. See docs/rules/movement.md.
  function currentMphFromTier(current){
    if (current === 1) return 1;
    if (current === 2) return 2;
    if (current === 3) return 3;
    return 0;
  }

  // Convenience for voyage planner. Returns signed mph adjustment:
  //   { mph: +C, direction: 'with',    riverName, tier }  downstream
  //   { mph: -C, direction: 'against', riverName, tier }  upstream
  //   { mph:  0, direction: 'cross',   riverName, tier }  crossing
  //   null                                                 no river
  // Voyage planner consumes mph as: dailyMiles += mph * 8.
  function edgeRiverCurrentMph(colA, rowA, colB, rowB){
    const dir = edgeRiverDirection(colA, rowA, colB, rowB);
    if (!dir) return null;
    const C = currentMphFromTier(dir.current);
    let mph = 0;
    if (dir.direction === 'with')    mph =  C;
    else if (dir.direction === 'against') mph = -C;
    return {
      mph,
      direction: dir.direction,
      riverName: dir.riverName,
      tier: dir.tier,
      current: dir.current,
    };
  }

  // Extra days added by crossing this edge, given the river state and
  // party's burden. Per design Q6: gated by per-parent authoring.
  // Tier-aware via TIER_COST table.
  function edgeRiverCost(colA, rowA, colB, rowB, mode, burden){
    if (mode === 'flying' || mode === 'ship') return 0;
    const info = edgeRiverInfo(colA, rowA, colB, rowB);
    if (!info.river) return 0;
    if (info.crossing) return 0;
    // Subhex-canonical: a road on the boundary cell also makes
    // passage free (Rule 1 from v0.5+, preserved). edgeRiverInfo's
    // crossing field already covers authored bridges/fords/ferries;
    // we additionally check road via the subhex-edge view.
    if (info.river.source === 'subhex'){
      const view = _subhexEdgeView(colA, rowA, colB, rowB);
      if (view && view.hasRoad) return 0;
    }
    const tier = info.river.tier || 'river';
    const row = TIER_COST[tier] || TIER_COST.river;
    return burden === 'light' ? row.light : row.encumbered;
  }

  // Returns the "best" crossing on this parent edge, for the journey
  // planner's Crossings summary. Per-parent fallback gate (Slice 3).
  // Returns:
  //   { source: 'subhex', kind, name, notes, Q, R }  — subhex feature
  //   { source: 'parent', kind, name, notes }        — parent record
  //   null                                            — no crossing
  function edgeCrossingInfo(colA, rowA, colB, rowB){
    if (_edgeIsSubhexCanonical(colA, rowA, colB, rowB)){
      const view = _subhexEdgeView(colA, rowA, colB, rowB);
      if (view && view.crossing){
        const c = view.crossing;
        return { source: 'subhex', kind: c.kind, name: c.name || '', notes: c.notes || '', Q: c.Q, R: c.R };
      }
      // Subhex-canonical but no crossing on this edge — do NOT fall
      // back to parent. Per design Q3: a parent with subhex authoring
      // hides parent-layer data entirely.
      return null;
    }
    const pc = crossingAt(colA, rowA, colB, rowB);
    if (pc){
      return { source: 'parent', kind: pc.kind, name: pc.name || '', notes: pc.notes || '' };
    }
    return null;
  }

  // Legacy: returns true only for genuinely impassable cases. With the
  // raft rule, river edges no longer block — they just add cost.
  // edgeBlocks is preserved for legacy callers (always false in normal
  // play); the cost-aware planner uses edgeRiverCost. Flying / ship
  // modes still cross any river edge for free.
  function edgeBlocks(colA, rowA, colB, rowB, mode){
    if (mode === 'flying' || mode === 'ship') return false;
    return false;
  }

  function edgeRoadBonus(colA, rowA, colB, rowB, terrain){
    const t = (typeof window !== 'undefined' && window.TERRAIN) ? window.TERRAIN[terrain] : null;
    const isHard = t && t.difficulty && t.difficulty !== 'normal';
    if (_edgeIsSubhexCanonical(colA, rowA, colB, rowB)){
      const view = _subhexEdgeView(colA, rowA, colB, rowB);
      if (!view || !view.hasRoad) return 1.0;
      // Subhex layer doesn't currently distinguish road vs trail at
      // this query point — pick conservative road bonus on easy
      // terrain, track bonus on hard. Same as v0.5+ behavior.
      return isHard ? 1.2 : 1.5;
    }
    // Parent-canonical.
    const road = _roadOnEdge(colA, rowA, colB, rowB);
    if (!road) return 1.0;
    const effKind = (road.kind === 'road' && isHard) ? 'track' : road.kind;
    return effKind === 'road' ? 1.5 : 1.2;
  }

  function getNamedRiver(name){ return namedRivers[name] || []; }
  function getNamedRoad (name){ return namedRoads [name] || []; }
  function allRiverNames(){ return Object.keys(namedRivers).sort(); }
  function allRoadNames (){ return Object.keys(namedRoads ).sort(); }

  // ── Chain ↔ segments ───────────────────────────────────────────────────
  // Build per-hex segment records from a chain of adjacent hexes.
  // chain[0] is upstream (entry = -1, open source); chain[-1] is
  // downstream (exit = -1, open mouth). Internal hexes get entry =
  // edge to prev, exit = edge to next.
  function chainToSegments(chain){
    const segs = [];
    for (let i = 0; i < chain.length; i++){
      const h = chain[i];
      const prev = i > 0 ? chain[i-1] : null;
      const next = i < chain.length-1 ? chain[i+1] : null;
      const entry = prev ? edgeBetween(h.col, h.row, prev.col, prev.row) : -1;
      const exit  = next ? edgeBetween(h.col, h.row, next.col, next.row) : -1;
      segs.push({ col: h.col, row: h.row, entry, exit });
    }
    return segs;
  }
  // Returns null on success; otherwise the index of the first non-adjacent
  // step. chain.length < 2 is treated as valid.
  function validateChain(chain){
    for (let i = 1; i < chain.length; i++){
      if (!areAdjacent(chain[i-1].col, chain[i-1].row, chain[i].col, chain[i].row)) return i;
    }
    return null;
  }

  // ── In-memory write (used by base loader + override replay) ────────────
  function setRiverFromChain(name, type, current, chain){
    if (!name) throw new Error('river needs a name');
    if (!RIVER_TYPES.includes(type)) throw new Error(`bad river type: ${type}`);
    const broken = validateChain(chain);
    if (broken !== null) throw new Error(`chain breaks at index ${broken}`);
    _wipeRiver(name);
    const segs = chainToSegments(chain);
    for (const s of segs){
      _addSegment(s.col, s.row, {
        kind: 'river', type, current, name,
        entryEdge: s.entry, exitEdge: s.exit,
        downstreamEdge: s.exit,
      });
    }
  }

  // namedRivers entries are in chain order (upstream → downstream) by
  // virtue of setRiverFromChain pushing in chain order.
  function getRiverChain(name){
    const entries = namedRivers[name];
    if (!entries || entries.length === 0) return null;
    return entries.map(e => ({ col: e.col, row: e.row }));
  }
  function getRiverInfo(name){
    const entries = namedRivers[name];
    if (!entries || entries.length === 0) return null;
    const first = entries[0].segment;
    return {
      name,
      type: first.type,
      current: first.current,
      hexCount: entries.length,
      isBase: baseRiverNames.includes(name),
      isOverride: !!overrideRivers[name],
    };
  }

  // ── In-memory write (roads) ────────────────────────────────────────────
  // Roads work like rivers but with kind ∈ {'road','track'} as the
  // primary discriminator (no current, no upstream/downstream). Chain
  // order is just route order; either endpoint is valid as the start.
  function setRoadFromChain(name, kind, chain){
    if (!name) throw new Error('road needs a name');
    if (!ROAD_KINDS.includes(kind)) throw new Error(`bad road kind: ${kind}`);
    const broken = validateChain(chain);
    if (broken !== null) throw new Error(`chain breaks at index ${broken}`);
    _wipeRoad(name);
    const segs = chainToSegments(chain);
    for (const s of segs){
      _addSegment(s.col, s.row, {
        kind, name,
        entryEdge: s.entry, exitEdge: s.exit,
      });
    }
  }
  function getRoadChain(name){
    const entries = namedRoads[name];
    if (!entries || entries.length === 0) return null;
    return entries.map(e => ({ col: e.col, row: e.row }));
  }
  function getRoadInfo(name){
    const entries = namedRoads[name];
    if (!entries || entries.length === 0) return null;
    const first = entries[0].segment;
    return {
      name,
      kind: first.kind,
      hexCount: entries.length,
      isBase: baseRoadNames.includes(name),
      isOverride: !!overrideRoads[name],
    };
  }

  // ── Persistence (localStorage overrides) ───────────────────────────────
  const LS_RIVERS         = 'gcc-paths-rivers';
  const LS_DELETED        = 'gcc-paths-rivers-deleted';
  const LS_CROSSINGS      = 'gcc-paths-crossings';
  const LS_ROADS          = 'gcc-paths-roads';
  const LS_ROADS_DELETED  = 'gcc-paths-roads-deleted';

  let overrideRivers = {};
  let deletedBaseRivers = new Set();
  // Crossings keyed by canonical edge id "ownerCol-ownerRow-edge".
  // Each value: {kind, name}. No deleted-tombstone list because there
  // are no base crossings yet — Phase B introduces them via the editor.
  let overrideCrossings = {};
  // Roads parallel rivers: name → {kind, chain}, plus tombstones.
  let overrideRoads = {};
  let deletedBaseRoads = new Set();

  function loadOverrides(){
    try {
      const r = localStorage.getItem(LS_RIVERS);
      overrideRivers = r ? JSON.parse(r) : {};
      const d = localStorage.getItem(LS_DELETED);
      deletedBaseRivers = new Set(d ? JSON.parse(d) : []);
      const c = localStorage.getItem(LS_CROSSINGS);
      overrideCrossings = c ? JSON.parse(c) : {};
      const ro = localStorage.getItem(LS_ROADS);
      overrideRoads = ro ? JSON.parse(ro) : {};
      const rd = localStorage.getItem(LS_ROADS_DELETED);
      deletedBaseRoads = new Set(rd ? JSON.parse(rd) : []);
    } catch (e) {
      overrideRivers = {};
      deletedBaseRivers = new Set();
      overrideCrossings = {};
      overrideRoads = {};
      deletedBaseRoads = new Set();
    }
  }
  function saveOverridesLS(){
    try {
      localStorage.setItem(LS_RIVERS, JSON.stringify(overrideRivers));
      localStorage.setItem(LS_DELETED, JSON.stringify(Array.from(deletedBaseRivers)));
      localStorage.setItem(LS_CROSSINGS, JSON.stringify(overrideCrossings));
      localStorage.setItem(LS_ROADS, JSON.stringify(overrideRoads));
      localStorage.setItem(LS_ROADS_DELETED, JSON.stringify(Array.from(deletedBaseRoads)));
    } catch (e) {}
  }

  // Hard-gate (Slice 3, design Q3 #4 / Q6 helper table). When any chain
  // hex's parent has subhex authoring, parent-layer CRUD is disabled.
  // Throws a specific error so Slice 5's UI can catch and display the
  // disabled-with-explanation banner. UI gates first; this is the
  // last line of defense.
  function _assertChainNotSubhexAuthored(chain){
    if (!chain || !chain.length) return;
    for (const h of chain){
      if (_parentHasSubhexAuthoring(h.col, h.row)){
        throw new Error(
          `parent (${h.col},${h.row}) is subhex-authored — edit subhex paths instead`
        );
      }
    }
  }
  // For deleteRiver / deleteRoad, the chain isn't passed in. Look it up
  // from the in-memory state and gate on that.
  function _assertNamedRiverNotSubhexAuthored(name){
    const entries = namedRivers[name];
    if (!entries || !entries.length) return;
    for (const e of entries){
      if (_parentHasSubhexAuthoring(e.col, e.row)){
        throw new Error(
          `parent (${e.col},${e.row}) is subhex-authored — edit subhex paths instead`
        );
      }
    }
  }
  function _assertNamedRoadNotSubhexAuthored(name){
    const entries = namedRoads[name];
    if (!entries || !entries.length) return;
    for (const e of entries){
      if (_parentHasSubhexAuthoring(e.col, e.row)){
        throw new Error(
          `parent (${e.col},${e.row}) is subhex-authored — edit subhex paths instead`
        );
      }
    }
  }

  // Editor-driven save: persist override + replay.
  function saveRiver(name, type, current, chain){
    const cleanChain = chain.map(h => ({ col: h.col|0, row: h.row|0 }));
    const broken = validateChain(cleanChain);
    if (broken !== null) throw new Error(`chain breaks at index ${broken}`);
    if (!RIVER_TYPES.includes(type)) throw new Error(`bad river type: ${type}`);
    _assertChainNotSubhexAuthored(cleanChain);
    overrideRivers[name] = { type, current: +current, chain: cleanChain };
    deletedBaseRivers.delete(name);
    saveOverridesLS();
    rebuild();
  }
  function deleteRiver(name){
    _assertNamedRiverNotSubhexAuthored(name);
    if (overrideRivers[name]) delete overrideRivers[name];
    if (baseRiverNames.includes(name)) deletedBaseRivers.add(name);
    saveOverridesLS();
    rebuild();
  }
  function saveRoad(name, kind, chain){
    const cleanChain = chain.map(h => ({ col: h.col|0, row: h.row|0 }));
    const broken = validateChain(cleanChain);
    if (broken !== null) throw new Error(`chain breaks at index ${broken}`);
    if (!ROAD_KINDS.includes(kind)) throw new Error(`bad road kind: ${kind}`);
    _assertChainNotSubhexAuthored(cleanChain);
    overrideRoads[name] = { kind, chain: cleanChain };
    deletedBaseRoads.delete(name);
    saveOverridesLS();
    rebuild();
  }
  function deleteRoad(name){
    _assertNamedRoadNotSubhexAuthored(name);
    if (overrideRoads[name]) delete overrideRoads[name];
    if (baseRoadNames.includes(name)) deletedBaseRoads.add(name);
    saveOverridesLS();
    rebuild();
  }
  function clearOverrides(){
    overrideRivers = {};
    deletedBaseRivers = new Set();
    overrideCrossings = {};
    overrideRoads = {};
    deletedBaseRoads = new Set();
    saveOverridesLS();
    rebuild();
  }
  function exportOverrides(){
    return {
      rivers: JSON.parse(JSON.stringify(overrideRivers)),
      deletedRivers: Array.from(deletedBaseRivers),
      crossings: JSON.parse(JSON.stringify(overrideCrossings)),
      roads: JSON.parse(JSON.stringify(overrideRoads)),
      deletedRoads: Array.from(deletedBaseRoads),
    };
  }

  // ── Crossings (bridges/fords/ferries) ──────────────────────────────────
  // Single record per shared edge, stored under the canonical owner hex
  // per ownerHex(). Editor-driven; no base crossings until Phase F bake.
  function _crossingKey(colA, rowA, colB, rowB){
    const owner = ownerHex(colA, rowA, colB, rowB);
    const ownerIsA = (owner.col === colA && owner.row === rowA);
    const nbCol = ownerIsA ? colB : colA;
    const nbRow = ownerIsA ? rowB : rowA;
    const e = edgeBetween(owner.col, owner.row, nbCol, nbRow);
    if (e < 0) return null;
    return `${owner.col}-${owner.row}-${e}`;
  }
  function _parseCrossingKey(key){
    const parts = key.split('-');
    if (parts.length !== 3) return null;
    const col = +parts[0], row = +parts[1], edge = +parts[2];
    if (!Number.isFinite(col) || !Number.isFinite(row) || !Number.isFinite(edge)) return null;
    return { col, row, edge };
  }
  function saveCrossing(colA, rowA, colB, rowB, kind, name, notes){
    if (!CROSSING_KINDS.has(kind)) throw new Error(`bad crossing kind: ${kind}`);
    const k = _crossingKey(colA, rowA, colB, rowB);
    if (!k) throw new Error('hexes are not adjacent');
    if (_parentHasSubhexAuthoring(colA, rowA) || _parentHasSubhexAuthoring(colB, rowB)){
      throw new Error(
        `parent (${colA},${rowA}) or (${colB},${rowB}) is subhex-authored — edit subhex paths instead`
      );
    }
    overrideCrossings[k] = { kind, name: (name || '').trim(), notes: (notes || '').trim() };
    saveOverridesLS();
    rebuild();
  }
  function deleteCrossing(colA, rowA, colB, rowB){
    const k = _crossingKey(colA, rowA, colB, rowB);
    if (!k) return;
    if (_parentHasSubhexAuthoring(colA, rowA) || _parentHasSubhexAuthoring(colB, rowB)){
      throw new Error(
        `parent (${colA},${rowA}) or (${colB},${rowB}) is subhex-authored — edit subhex paths instead`
      );
    }
    if (overrideCrossings[k]){
      delete overrideCrossings[k];
      saveOverridesLS();
      rebuild();
    }
  }
  function crossingAt(colA, rowA, colB, rowB){
    return edgeFeaturesAt(colA, rowA, colB, rowB).find(f => CROSSING_KINDS.has(f.kind)) || null;
  }
  function allCrossings(){
    const out = [];
    for (const k of Object.keys(hexEdgeFeatures)){
      const [colStr, rowStr] = k.split('-');
      const col = +colStr, row = +rowStr;
      const edges = hexEdgeFeatures[k];
      for (const eStr of Object.keys(edges)){
        const e = +eStr;
        const nb = neighborAcross(col, row, e);
        for (const f of edges[eStr]){
          if (CROSSING_KINDS.has(f.kind)){
            out.push({
              key: `${col}-${row}-${e}`,
              ownerCol: col, ownerRow: row, edge: e,
              hexA: { col, row }, hexB: nb,
              kind: f.kind, name: f.name || '', notes: f.notes || '',
            });
          }
        }
      }
    }
    return out;
  }
  function riverNameOnEdge(colA, rowA, colB, rowB){
    const r = _riverOnEdge(colA, rowA, colB, rowB);
    return r ? r.name : null;
  }

  // ── Base data ──────────────────────────────────────────────────────────
  // Hardcoded baseline. Coordinates approximate — replace via the
  // Hex Editor.
  const baseRiverNames = [];
  function _baseRiver(name, type, current, chain){
    baseRiverNames.push(name);
    setRiverFromChain(name, type, current, chain);
  }
  const baseRoadNames = [];
  function _baseRoad(name, kind, chain){
    baseRoadNames.push(name);
    setRoadFromChain(name, kind, chain);
  }
  function loadBaseData(){
    // Greyhawk Wars campaign data — 44 named rivers from the
    // Darlene/Living Greyhawk maps, painted via the Hex Editor
    // and baked here as the new base layer (v0.2.1).
    _baseRiver('Selintan', 'great_river', 2, [{col:66,row:43},{col:65,row:43},{col:64,row:44},{col:63,row:44},{col:63,row:45},{col:63,row:46},{col:64,row:47},{col:64,row:48},{col:63,row:48},{col:64,row:49},{col:65,row:49}]);
    _baseRiver('Velverdyva', 'great_river', 2, [{col:38,row:27},{col:37,row:27},{col:37,row:28},{col:38,row:29},{col:38,row:30},{col:39,row:30},{col:39,row:31},{col:39,row:32},{col:39,row:33},{col:39,row:34},{col:40,row:35},{col:41,row:35},{col:42,row:35},{col:43,row:35},{col:44,row:36},{col:45,row:36},{col:44,row:37},{col:44,row:38},{col:44,row:39},{col:44,row:40},{col:45,row:40},{col:46,row:40},{col:47,row:40},{col:47,row:41},{col:47,row:42},{col:47,row:43},{col:47,row:44},{col:48,row:45},{col:49,row:44},{col:50,row:45},{col:50,row:46},{col:50,row:47},{col:51,row:47},{col:52,row:47},{col:53,row:46},{col:54,row:46},{col:54,row:45},{col:54,row:44},{col:55,row:43},{col:55,row:44},{col:56,row:45},{col:57,row:45},{col:58,row:45}]);
    _baseRiver('Sheldomar', 'great_river', 2, [{col:36,row:57},{col:37,row:56},{col:38,row:56},{col:38,row:55},{col:39,row:54},{col:40,row:55},{col:41,row:55},{col:42,row:55},{col:42,row:56},{col:42,row:57},{col:43,row:57},{col:44,row:58},{col:45,row:58},{col:44,row:59},{col:44,row:60},{col:44,row:61},{col:45,row:61},{col:46,row:62},{col:47,row:62},{col:48,row:63},{col:49,row:63},{col:50,row:64},{col:51,row:64},{col:51,row:65},{col:51,row:66},{col:51,row:67},{col:51,row:68}]);
    _baseRiver('Javan', 'great_river', 3, [{col:20,row:48},{col:21,row:48},{col:22,row:49},{col:22,row:48},{col:23,row:47},{col:24,row:47},{col:25,row:46},{col:26,row:47},{col:26,row:48},{col:26,row:49},{col:26,row:50},{col:27,row:50},{col:27,row:51},{col:27,row:52},{col:26,row:53},{col:26,row:54},{col:27,row:54},{col:28,row:55},{col:29,row:55},{col:30,row:55},{col:31,row:55},{col:31,row:56},{col:30,row:57},{col:30,row:58},{col:31,row:58},{col:31,row:59},{col:30,row:60},{col:30,row:61},{col:31,row:61},{col:31,row:62},{col:31,row:63},{col:32,row:64},{col:33,row:64},{col:34,row:64},{col:35,row:63},{col:36,row:64},{col:36,row:65},{col:37,row:65},{col:37,row:66},{col:37,row:67},{col:38,row:67},{col:39,row:67},{col:40,row:68},{col:40,row:69},{col:40,row:70},{col:39,row:70},{col:39,row:71},{col:38,row:72},{col:38,row:73},{col:39,row:73},{col:40,row:73},{col:41,row:73},{col:41,row:74},{col:42,row:75},{col:43,row:74},{col:43,row:73},{col:44,row:73},{col:45,row:73}]);
    _baseRiver('Flanmi', 'great_river', 2, [{col:118,row:42},{col:118,row:43},{col:118,row:44},{col:117,row:44},{col:118,row:45},{col:119,row:45},{col:120,row:46},{col:120,row:47},{col:120,row:48},{col:121,row:48},{col:122,row:49},{col:123,row:49},{col:123,row:50},{col:122,row:51},{col:121,row:51},{col:120,row:52},{col:119,row:52},{col:119,row:53},{col:119,row:54},{col:120,row:55},{col:121,row:55},{col:121,row:56},{col:121,row:57},{col:120,row:58},{col:119,row:57},{col:118,row:58},{col:117,row:57},{col:116,row:58},{col:115,row:58},{col:115,row:59},{col:114,row:60},{col:115,row:60},{col:115,row:61},{col:114,row:62},{col:114,row:63},{col:115,row:63},{col:116,row:64},{col:117,row:63},{col:118,row:64},{col:119,row:64},{col:119,row:65},{col:118,row:66},{col:118,row:67},{col:119,row:67},{col:120,row:68}]);
    _baseRiver('Artonsamay', 'great_river', 2, [{col:68,row:19},{col:69,row:18},{col:70,row:18},{col:71,row:18},{col:71,row:19},{col:71,row:20},{col:72,row:21},{col:73,row:21},{col:74,row:22},{col:75,row:22},{col:76,row:23},{col:76,row:24},{col:77,row:24},{col:78,row:25},{col:79,row:24},{col:80,row:25},{col:81,row:25},{col:82,row:26},{col:83,row:26},{col:84,row:27},{col:85,row:27},{col:86,row:28},{col:87,row:28},{col:87,row:29},{col:87,row:30},{col:87,row:31},{col:87,row:32},{col:87,row:33},{col:87,row:34},{col:86,row:34},{col:86,row:33},{col:85,row:32},{col:85,row:33},{col:85,row:34},{col:85,row:35},{col:84,row:36},{col:83,row:35},{col:83,row:34},{col:82,row:34},{col:82,row:33},{col:81,row:32},{col:80,row:33},{col:80,row:34},{col:80,row:35},{col:79,row:34},{col:79,row:35},{col:78,row:36},{col:77,row:35},{col:76,row:36}]);
    _baseRiver('Nesser', 'great_river', 2, [{col:78,row:44},{col:79,row:43},{col:80,row:44},{col:80,row:45},{col:79,row:45},{col:79,row:46},{col:79,row:47},{col:80,row:48},{col:81,row:48},{col:81,row:49},{col:80,row:50},{col:79,row:50},{col:79,row:51},{col:80,row:51},{col:81,row:51},{col:80,row:52},{col:79,row:52},{col:80,row:53},{col:81,row:53},{col:81,row:54},{col:80,row:55},{col:81,row:55},{col:82,row:55},{col:82,row:56},{col:82,row:57},{col:82,row:58},{col:82,row:59},{col:82,row:60}]);
    _baseRiver('Harp', 'river', 2, [{col:106,row:34},{col:107,row:34},{col:107,row:35},{col:107,row:36},{col:107,row:37},{col:107,row:38},{col:107,row:39},{col:107,row:40},{col:108,row:41},{col:108,row:42},{col:109,row:42},{col:109,row:43},{col:109,row:44},{col:109,row:45},{col:110,row:46},{col:110,row:47},{col:109,row:47},{col:109,row:48},{col:108,row:49},{col:107,row:48},{col:106,row:48},{col:105,row:47},{col:104,row:47},{col:103,row:47},{col:103,row:48},{col:104,row:49},{col:104,row:50},{col:104,row:51},{col:105,row:51},{col:106,row:52},{col:106,row:53},{col:105,row:53},{col:105,row:54},{col:106,row:55},{col:106,row:56},{col:105,row:56},{col:104,row:56},{col:103,row:55},{col:102,row:55},{col:101,row:54}]);
    _baseRiver('Veng', 'river', 2, [{col:58,row:29},{col:58,row:30},{col:58,row:31},{col:59,row:31},{col:60,row:31},{col:61,row:30},{col:62,row:30},{col:63,row:30},{col:63,row:31},{col:62,row:32},{col:62,row:33},{col:61,row:33},{col:61,row:34},{col:62,row:35},{col:63,row:35},{col:64,row:35},{col:65,row:35},{col:64,row:36},{col:64,row:37},{col:65,row:37}]);
    _baseRiver('Jewel', 'river', 2, [{col:57,row:48},{col:58,row:49},{col:58,row:50},{col:59,row:50},{col:59,row:51},{col:58,row:52},{col:58,row:53},{col:58,row:54},{col:57,row:54},{col:57,row:55},{col:57,row:56},{col:57,row:57},{col:56,row:58},{col:57,row:58},{col:57,row:59},{col:58,row:60},{col:59,row:60},{col:59,row:61},{col:60,row:62},{col:61,row:62},{col:62,row:63},{col:63,row:63},{col:62,row:64},{col:61,row:64},{col:61,row:65},{col:60,row:66},{col:60,row:67}]);
    _baseRiver('Fler', 'river', 2, [{col:43,row:3},{col:42,row:4},{col:41,row:4},{col:40,row:5},{col:39,row:5},{col:39,row:6},{col:38,row:7},{col:37,row:6},{col:36,row:7},{col:35,row:7},{col:34,row:8},{col:33,row:8},{col:33,row:9},{col:32,row:10},{col:32,row:11},{col:32,row:12},{col:32,row:13},{col:33,row:13},{col:32,row:14},{col:32,row:15},{col:32,row:16},{col:32,row:17}]);
    _baseRiver('Tuflik', 'river', 2, [{col:26,row:39},{col:25,row:38},{col:24,row:38},{col:24,row:37},{col:24,row:36},{col:23,row:35},{col:22,row:36},{col:22,row:37},{col:21,row:37},{col:20,row:37},{col:19,row:36},{col:19,row:35},{col:18,row:35},{col:17,row:34},{col:17,row:33},{col:16,row:33},{col:15,row:32},{col:14,row:32},{col:13,row:31},{col:12,row:31},{col:11,row:31},{col:10,row:31},{col:10,row:30},{col:9,row:29},{col:8,row:29},{col:8,row:28}]);
    _baseRiver('Att', 'river', 2, [{col:49,row:35},{col:50,row:36},{col:51,row:36},{col:52,row:37},{col:53,row:37},{col:54,row:38},{col:55,row:38},{col:56,row:39},{col:55,row:39},{col:54,row:40},{col:53,row:40},{col:52,row:41},{col:51,row:41},{col:51,row:42},{col:50,row:43},{col:51,row:43},{col:52,row:44},{col:53,row:44},{col:54,row:45}]);
    _baseRiver('Blackwater', 'river', 2, [{col:47,row:13},{col:48,row:14},{col:49,row:14},{col:50,row:15},{col:51,row:14},{col:52,row:15},{col:52,row:16},{col:53,row:16},{col:54,row:17}]);
    _baseRiver('Blashikmund', 'river', 2, [{col:22,row:20},{col:22,row:21},{col:22,row:22},{col:21,row:22},{col:20,row:22},{col:19,row:21},{col:18,row:22},{col:17,row:22},{col:17,row:23},{col:17,row:24},{col:17,row:25},{col:16,row:25},{col:15,row:25},{col:15,row:26},{col:15,row:27},{col:15,row:28},{col:15,row:29},{col:14,row:30},{col:14,row:31},{col:13,row:31}]);
    _baseRiver('Cold', 'river', 2, [{col:78,row:17},{col:79,row:17},{col:79,row:18},{col:78,row:19},{col:78,row:20},{col:77,row:20},{col:77,row:21},{col:77,row:22},{col:77,row:23},{col:77,row:24}]);
    _baseRiver('Crystal', 'river', 2, [{col:52,row:34},{col:53,row:34},{col:54,row:34},{col:55,row:34},{col:56,row:35},{col:57,row:35},{col:58,row:35},{col:59,row:35},{col:60,row:35},{col:61,row:34}]);
    _baseRiver('Davish', 'river', 3, [{col:23,row:67},{col:23,row:66},{col:23,row:65},{col:24,row:65},{col:25,row:64},{col:26,row:64},{col:26,row:63},{col:27,row:62},{col:28,row:63},{col:29,row:62},{col:30,row:63},{col:31,row:63}]);
    _baseRiver('Deepstil', 'river', 2, [{col:46,row:19},{col:47,row:19},{col:48,row:20},{col:49,row:19},{col:50,row:20},{col:51,row:20},{col:52,row:21},{col:53,row:20},{col:54,row:21}]);
    _baseRiver('Dulsi', 'river', 2, [{col:56,row:11},{col:55,row:11},{col:54,row:12},{col:54,row:13},{col:55,row:13},{col:55,row:14},{col:55,row:15},{col:55,row:16},{col:54,row:17},{col:54,row:18},{col:53,row:18},{col:54,row:19},{col:54,row:20},{col:54,row:21},{col:54,row:22},{col:54,row:23}]);
    _baseRiver('Duntide', 'river', 1, [{col:96,row:42},{col:95,row:42},{col:95,row:43},{col:94,row:44},{col:93,row:44},{col:93,row:45},{col:92,row:46},{col:92,row:47},{col:91,row:47},{col:90,row:48},{col:90,row:49},{col:89,row:48},{col:88,row:48},{col:88,row:49},{col:87,row:49},{col:87,row:50},{col:86,row:51},{col:86,row:52},{col:86,row:53},{col:86,row:54},{col:85,row:54},{col:85,row:55},{col:84,row:56},{col:84,row:57},{col:83,row:57},{col:82,row:58}]);
    _baseRiver('Ery', 'river', 1, [{col:65,row:44},{col:65,row:45},{col:64,row:46},{col:63,row:46}]);
    _baseRiver('Fals', 'river', 3, [{col:34,row:40},{col:33,row:40},{col:33,row:41},{col:34,row:42},{col:35,row:41},{col:36,row:42},{col:37,row:42},{col:38,row:42},{col:39,row:41},{col:39,row:40},{col:38,row:40},{col:38,row:39},{col:39,row:38},{col:40,row:38},{col:41,row:38},{col:42,row:38},{col:43,row:38},{col:44,row:39}]);
    _baseRiver('Franz', 'river', 2, [{col:88,row:38},{col:87,row:38},{col:87,row:39},{col:86,row:40},{col:85,row:40},{col:85,row:41},{col:85,row:42},{col:84,row:43},{col:83,row:42},{col:82,row:43},{col:81,row:43},{col:81,row:44},{col:80,row:45}]);
    _baseRiver('Frozen', 'river', 2, [{col:98,row:15},{col:97,row:14},{col:97,row:13},{col:96,row:13},{col:95,row:13},{col:95,row:12},{col:96,row:12},{col:97,row:11},{col:97,row:10},{col:96,row:11},{col:95,row:10},{col:95,row:9},{col:95,row:8},{col:94,row:8},{col:94,row:9},{col:93,row:9},{col:92,row:10}]);
    _baseRiver('Grayflood', 'river', 2, [{col:102,row:65},{col:103,row:65},{col:104,row:65},{col:105,row:64},{col:106,row:64},{col:107,row:64}]);
    _baseRiver('Handmaiden', 'river', 2, [{col:52,row:52},{col:51,row:52},{col:52,row:53},{col:52,row:54},{col:53,row:54},{col:54,row:55},{col:54,row:56},{col:54,row:57},{col:55,row:57},{col:56,row:58}]);
    _baseRiver('Hool', 'river', 2, [{col:35,row:82},{col:36,row:82},{col:36,row:81},{col:36,row:80},{col:35,row:79},{col:36,row:79},{col:36,row:78},{col:37,row:77},{col:37,row:76},{col:38,row:76},{col:39,row:75},{col:40,row:75},{col:41,row:74}]);
    _baseRiver('Imeda', 'river', 2, [{col:128,row:52},{col:127,row:52},{col:126,row:52},{col:125,row:52},{col:124,row:53},{col:123,row:53},{col:123,row:54},{col:122,row:55},{col:121,row:55}]);
    _baseRiver('Jenelrad', 'river', 3, [{col:121,row:6},{col:120,row:7},{col:120,row:8},{col:119,row:8},{col:119,row:9},{col:118,row:10},{col:117,row:10},{col:117,row:11},{col:117,row:12}]);
    _baseRiver('Kewl', 'river', 4, [{col:49,row:53},{col:50,row:54},{col:50,row:55},{col:49,row:55},{col:49,row:56},{col:50,row:57},{col:49,row:57},{col:48,row:58},{col:48,row:59},{col:47,row:59},{col:47,row:60},{col:48,row:61},{col:49,row:61},{col:49,row:62},{col:50,row:63},{col:50,row:64}]);
    _baseRiver('Lort', 'river', 2, [{col:41,row:52},{col:42,row:53},{col:42,row:54},{col:42,row:55}]);
    _baseRiver('Mikar', 'river', 2, [{col:131,row:54},{col:130,row:54},{col:129,row:54},{col:129,row:55},{col:130,row:56},{col:130,row:57},{col:129,row:57},{col:129,row:58},{col:129,row:59},{col:128,row:60},{col:127,row:60},{col:127,row:61},{col:126,row:61},{col:125,row:61},{col:124,row:62},{col:123,row:62},{col:123,row:63},{col:122,row:64},{col:121,row:64},{col:120,row:65},{col:119,row:65}]);
    _baseRiver('Neen', 'river', 1, [{col:70,row:44},{col:70,row:45},{col:69,row:45},{col:68,row:46},{col:67,row:45},{col:66,row:46},{col:66,row:47},{col:65,row:46},{col:64,row:46}]);
    _baseRiver('Old', 'river', 2, [{col:56,row:61},{col:55,row:61},{col:54,row:62},{col:53,row:62},{col:52,row:63},{col:52,row:64},{col:51,row:64}]);
    _baseRiver('Opicm', 'river', 2, [{col:63,row:11},{col:63,row:12},{col:63,row:13},{col:63,row:14},{col:63,row:15},{col:63,row:16},{col:62,row:17},{col:62,row:18},{col:61,row:18},{col:61,row:19},{col:62,row:20},{col:62,row:21},{col:62,row:22},{col:61,row:22}]);
    _baseRiver('Pawluck', 'river', 1, [{col:102,row:73},{col:101,row:72},{col:102,row:72},{col:103,row:72},{col:104,row:72},{col:104,row:73},{col:105,row:73},{col:105,row:74},{col:106,row:74},{col:107,row:73},{col:107,row:74},{col:106,row:75},{col:107,row:75},{col:108,row:75},{col:109,row:74},{col:109,row:75},{col:108,row:76},{col:107,row:76}]);
    _baseRiver('Realstream', 'river', 3, [{col:29,row:43},{col:29,row:44},{col:30,row:45},{col:30,row:46},{col:30,row:47},{col:30,row:48},{col:31,row:48},{col:32,row:49},{col:32,row:50},{col:31,row:50},{col:31,row:51},{col:31,row:52},{col:30,row:53},{col:29,row:53},{col:28,row:54},{col:27,row:54}]);
    _baseRiver('Ritensa', 'river', 2, [{col:66,row:25},{col:67,row:25},{col:67,row:26},{col:68,row:27},{col:68,row:28},{col:69,row:28},{col:69,row:29},{col:68,row:30},{col:67,row:30},{col:67,row:31},{col:66,row:32},{col:65,row:32},{col:65,row:33},{col:65,row:34},{col:64,row:35}]);
    _baseRiver('Teesar', 'river', 2, [{col:117,row:34},{col:116,row:35},{col:115,row:35},{col:114,row:35},{col:113,row:35},{col:113,row:36},{col:113,row:37},{col:112,row:38},{col:112,row:39},{col:111,row:39},{col:111,row:40},{col:110,row:41},{col:110,row:42},{col:109,row:42}]);
    _baseRiver('Thelly', 'river', 2, [{col:105,row:59},{col:105,row:60},{col:106,row:61},{col:107,row:61},{col:107,row:62},{col:107,row:63},{col:107,row:64},{col:108,row:65},{col:109,row:64},{col:110,row:65},{col:111,row:65},{col:112,row:66},{col:113,row:66},{col:114,row:66},{col:115,row:66},{col:116,row:66},{col:117,row:66},{col:118,row:67}]);
    _baseRiver('Trask', 'river', 2, [{col:121,row:39},{col:122,row:40},{col:123,row:39},{col:124,row:40},{col:125,row:40},{col:125,row:41},{col:126,row:41},{col:127,row:40},{col:128,row:40},{col:129,row:39},{col:130,row:39},{col:131,row:39}]);
    _baseRiver('Yol', 'river', 2, [{col:95,row:21},{col:96,row:22},{col:97,row:22},{col:97,row:23},{col:96,row:24},{col:96,row:25},{col:95,row:25},{col:94,row:26},{col:94,row:27},{col:93,row:27},{col:92,row:28},{col:92,row:29},{col:91,row:29},{col:90,row:29},{col:89,row:29},{col:88,row:30},{col:87,row:30}]);
    _baseRiver('Zumker', 'river', 4, [{col:92,row:16},{col:91,row:16},{col:90,row:17},{col:89,row:17},{col:89,row:18},{col:88,row:19},{col:88,row:20},{col:88,row:21},{col:87,row:21},{col:86,row:21},{col:85,row:21},{col:84,row:22},{col:84,row:23},{col:84,row:24},{col:83,row:24},{col:82,row:25},{col:82,row:26}]);
  }

  function rebuild(){
    _clearAll();
    baseRiverNames.length = 0;
    baseRoadNames.length = 0;
    loadBaseData();
    for (const name of deletedBaseRivers){
      _wipeRiver(name);
    }
    for (const name of deletedBaseRoads){
      _wipeRoad(name);
    }
    for (const [name, def] of Object.entries(overrideRivers)){
      if (!def || !def.chain) continue;
      try {
        setRiverFromChain(name, def.type, def.current, def.chain);
      } catch (e) {
        console.warn('[gcc-paths] river override apply failed:', name, e);
      }
    }
    for (const [name, def] of Object.entries(overrideRoads)){
      if (!def || !def.chain) continue;
      try {
        setRoadFromChain(name, def.kind, def.chain);
      } catch (e) {
        console.warn('[gcc-paths] road override apply failed:', name, e);
      }
    }
    for (const [k, def] of Object.entries(overrideCrossings)){
      if (!def || !CROSSING_KINDS.has(def.kind)) continue;
      const parsed = _parseCrossingKey(k);
      if (!parsed) continue;
      try {
        _addEdgeFeature(parsed.col, parsed.row, parsed.edge, {
          kind: def.kind, name: def.name || '', notes: def.notes || '',
        });
      } catch (e) {
        console.warn('[gcc-paths] crossing apply failed:', k, e);
      }
    }
    if (typeof window !== 'undefined' && typeof window.rebuildPathOverlay === 'function'){
      try { window.rebuildPathOverlay(); } catch (e) {}
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────
  loadOverrides();
  rebuild();

  // When the subhex layer changes (paths or lakes), the per-parent
  // gate may flip for some parents — rebuild the overlay so any
  // parent-layer chains hidden by a newly-authored subhex don't keep
  // rendering as if they were canonical. Doesn't change the in-memory
  // override stores, just refreshes display.
  if (typeof window !== 'undefined' && window.addEventListener){
    window.addEventListener('gcc-subhex-changed', () => {
      if (typeof window.rebuildPathOverlay === 'function'){
        try { window.rebuildPathOverlay(); } catch (e) {}
      }
    });
  }

  // ── Export ─────────────────────────────────────────────────────────────
  window.GCCPaths = {
    // Geometry
    neighborAcross, edgeBetween, ownerHex, areAdjacent,
    EDGE_NAMES, EDGE_N: 0, EDGE_NE: 1, EDGE_SE: 2, EDGE_S: 3, EDGE_SW: 4, EDGE_NW: 5,
    RIVER_TYPES, ROAD_KINDS, CROSSING_KINDS, TIER_COST,
    // Data accessors
    segmentsAt, riversAt, roadsAt, edgeFeaturesAt,
    getNamedRiver, getNamedRoad, allRiverNames, allRoadNames,
    getRiverChain, getRiverInfo,
    getRoadChain, getRoadInfo,
    crossingAt, allCrossings, riverNameOnEdge,
    edgeCrossingInfo,
    // CRUD (persists)
    saveRiver, deleteRiver, clearOverrides, exportOverrides,
    saveRoad, deleteRoad,
    saveCrossing, deleteCrossing,
    // Resolver
    edgeRiverInfo, edgeBlocks, edgeRiverCost, edgeRoadBonus,
    edgeRiverDirection, edgeRiverCurrentMph, currentMphFromTier,
    // Authoring gate (Slice 3)
    parentHasSubhexAuthoring,
    // Utility
    chainToSegments, validateChain,
    // Lifecycle
    rebuild,
  };
})();
