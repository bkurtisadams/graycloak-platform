// gcc-map-subhex-renderer.js v1.5.0 — 2026-05-12
// v1.5.0 — Path-click handler reads a.extendEnd from the armed
//          payload. 'head' routes to GCCSubhexPaths.prependCell /
//          truncateAfter; 'tail' (default, back-compat) keeps the
//          existing appendCell / truncateBefore. Marker-click arm
//          site (line 882) stamps extendEnd via
//          GCCMapSubhexPalette.getExtendEnd() so the toggle state
//          survives even when arming happens from a marker click
//          rather than the picker. Wired by palette v1.4.0; paths
//          functions added in gcc-subhex-paths v2.3.0.
// v1.4.1 — 2026-05-11
// v1.4.1 — #15 instrumentation. renderParentPathMarkers and placeMarker
// emit a [Paths] trace when window.GCC_DEBUG_PATHS is truthy: per-parent
// segment count, per-seg skip reason (no color / invalid edge),
// per-edge placeMarker entry, and best-cell resolution inside
// placeMarker. Use to diagnose the missing road-marker bug at D4-86
// (col 64, row 44). No behavior change with the flag unset.
// v1.4.0 — Slice 5b followup — paint undo capture hooks. paintCell
// snapshots the cell's pre-mutation state (terrain/feature/regionId/
// lakeId) and forwards it to GCCMapSubhexPalette.captureBefore;
// onCellMouseDown calls beginStroke; onBrushEnd calls endStroke.
// Path tool retains its own ↶ Undo (per-cell pop); fog retains its
// own deferred-save model. Generic undo covers terrain/erase/
// feature/feature-erase/region/region-erase/lake/lake-erase.
// v1.3.0 — Slice 5b2 — crossing menu: clicking a × badge opens a
// foreignObject popup with kind chips (Bridge / Ford / Ferry /
// Crossroads / Landmark) + Dismiss. Picking writes a feature; Dismiss
// records the suppression in localStorage. Menu mounts as a sibling
// of the layered render tree so rebuildAllLayers doesn't wipe it.
// v1.2.0 — Slice 5b1 — extend paintCell with region/region-erase/
// lake/lake-erase/path branches; replace onParentPathMarkerClick
// toast stub with a real arm-flow call into GCCMapSubhexPalette;
// notify palette after every paintCell so the detail panel refreshes
// when the painted cell is the current shell selection.
// v1.1.0 — Slice 5a — restore brush handlers (onCellMouseDown,
// onCellMouseEnter, onBrushEnd), effectiveParentTerrainFor, and
// paintCell from gcc-subhex-view.js v3.1.0. paintCell trimmed to the
// arming branches Slice 5a supports: terrain, erase (revert override),
// feature, feature-erase, fog. region / region-erase / lake / lake-
// erase / path branches stay deferred to Slice 5b alongside their
// picker UIs. buildCellGroup binds mousedown + mouseenter listeners
// on each cell so the brush works on click + drag. GCCMapSubhexRenderer
// exports paintCell, effectiveParentTerrainFor, and getArmed for the
// palette module.
//
// v1.0.0 — Phase B Slice 4 — subhex render core lifted from
// gcc-subhex-view.js v3.1.0 per INVENTORY-unified-map.md §4.1.
//
// In scope (Slice 4):
//   - Geometry: cellWorldCenter, cellCorners, cellDomId,
//     parentWorldCenter, parentCornersAt, viewportBboxData,
//     visibleCells, parentsInViewport
//   - buildCellGroup + applyCellPaint (visual only; .authored/.selected
//     class management; reads override state from GCCSubhexData)
//   - renderPaths + renderArmedPathGhost + pathPolylinePoints
//   - renderRegionLabels
//   - renderParentPathMarkers + helpers (placeMarker / pathMarkerColor /
//     edgeMidpointFor / boundaryCellForEdge /
//     authoredBoundaryCellForSegment / pathMarkerTooltip /
//     findSubhexPathForSegment)
//   - detectCrossings + renderCrossings (visual)
//   - Cell click → ctx.setSelection({ kind:'subhex', Q, R })
//
// Deferred to Slice 5 (palette UI):
//   - Paint/brush handlers (onCellMouseDown / onCellMouseEnter /
//     onBrushEnd / paintCell / effectiveParentTerrainFor)
//   - Parent-path marker click → openRiverEditDialog
//   - Crossing badge click → showCrossingMenu / applyCrossingFeature
//   - Fog brush
//
// Deferred to Slice 7 (window chrome retire):
//   - gcc-subhex-view.js's floating window + controls window
//   - GCCSubhexView.* shim into GCCMap.*
//
// Coord system: matches legacy v3.1.0. SUB_R=26, PARENT_R=260,
// DISPLAY_SCALE=13 applied in cellWorldCenter / parentWorldCenter.
// gcc-subhex.css's pixel sizes (font-size, stroke-width) calibrated
// against this coord system; reusing them as-is requires the same
// internal scale. Shell-side coordsScale=13 declared on the registered
// scale spec; gcc-map.js v0.2.1 converts state.view.cx/cy across
// scale switches so a geographic point stays under view center.
//
// Legacy gcc-subhex-view.js stays loaded — its floating window is
// still the subhex view for greyhawk-map.html. Unified-map.html does
// not invoke GCCSubhexView.open() so the legacy window never appears.

(function(){
  'use strict';
  if (!window.GCCMap){
    console.error('[subhex-renderer] GCCMap missing — load gcc-map.js first');
    return;
  }

  const NS = 'http://www.w3.org/2000/svg';
  const SUB_R = 26;            // display-scale subhex radius (= 2 data × 13)
  const PARENT_R = 260;        // display-scale parent radius (= 20 data × 13)
  const DISPLAY_SCALE = 13;    // multiplier from data coords to display coords
  const SQRT3 = Math.sqrt(3);

  const CROSSING_DISMISS_KEY = 'gcc-subhex-crossings-dismissed';

  // ── Module-private state ───────────────────────────────────────
  // armed / markerHighlight: palette-controlled, set externally via
  // window.GCCMapSubhexRenderer.setArmed (Slice 5a) and Slice 5b's
  // marker click handlers. dismissedCrossings persists across reloads.
  // brushing / brushedThisDrag / fogBrushHide: brush state for cell
  // paint, restored in Slice 5a from the legacy v3.1.0 brush flow.
  const rs = {
    armed: null,
    markerHighlight: null,
    dismissedCrossings: loadDismissedCrossings(),
    brushing: false,
    brushedThisDrag: null,
    fogBrushHide: false,
  };

  // Cleared by unmount, set by mount.
  let _ctx = null;
  let _root = null;
  let layers = null;
  let _onFogChanged = null;
  let _onDataChanged = null;

  // ── localStorage ───────────────────────────────────────────────
  function loadDismissedCrossings(){
    try { return JSON.parse(localStorage.getItem(CROSSING_DISMISS_KEY) || '{}'); }
    catch(e){ return {}; }
  }
  function saveDismissedCrossings(map){
    try { localStorage.setItem(CROSSING_DISMISS_KEY, JSON.stringify(map)); }
    catch(e){}
  }

  // ── Global accessors (cached refs to window globals) ───────────
  function D(){ return window.GCCSubhexData; }
  function P(){ return window.GCCSubhexPaths; }
  function I(){ return window.GCCSubhexIcons; }
  function getTerrain(col, row){
    return (typeof window.getHexTerrain === 'function')
      ? window.getHexTerrain(col, row) : null;
  }
  function terrainRgb(t){
    const T = window.TERRAIN || {};
    return (t && T[t]?.rgb) ? `rgb(${T[t].rgb})` : '#d8c890';
  }
  function hexIdStr(col, row){
    if (typeof window.hexIdStr === 'function') return window.hexIdStr(col, row);
    return `${col},${row}`;
  }

  // ── Geometry ───────────────────────────────────────────────────
  function cellWorldCenter(Q, R){
    const d = D();
    if (!d || typeof d.subhexSvgCenter !== 'function') return { x: 0, y: 0 };
    const c = d.subhexSvgCenter(Q, R);
    return { x: c.x * DISPLAY_SCALE, y: c.y * DISPLAY_SCALE };
  }
  function cellCorners(Q, R){
    const c = cellWorldCenter(Q, R);
    const out = new Array(6);
    for (let i = 0; i < 6; i++){
      const a = (Math.PI / 180) * (60 * i);
      out[i] = [c.x + SUB_R * Math.cos(a), c.y + SUB_R * Math.sin(a)];
    }
    return out;
  }
  function cellDomId(Q, R){ return `sxw-cell-${Q}_${R}`; }
  function parentWorldCenter(col, row){
    const d = D();
    if (!d || typeof d.parentSvgCenter !== 'function') return { x: 0, y: 0 };
    const c = d.parentSvgCenter(col, row);
    return { x: c.x * DISPLAY_SCALE, y: c.y * DISPLAY_SCALE };
  }
  function parentCornersAt(col, row){
    const c = parentWorldCenter(col, row);
    const out = new Array(6);
    for (let i = 0; i < 6; i++){
      const a = (Math.PI / 180) * (60 * i);
      out[i] = [c.x + PARENT_R * Math.cos(a), c.y + PARENT_R * Math.sin(a)];
    }
    return out;
  }
  // Viewport bbox in data-layer coords (HEX_R=20, SUB_R=2 native).
  // Shell ctx.viewportBbox is in display-scale coords (this scale's
  // world units = legacy display-scale-px). Divide by DISPLAY_SCALE
  // for the data-layer call. Margin = HEX_R_DATA * 2 covers cells
  // whose hex polygons straddle the viewport edge and parents whose
  // silhouette overlaps without their center being inside.
  function viewportBboxData(){
    const bb = _ctx.viewportBbox();
    const HEX_R_DATA = PARENT_R / DISPLAY_SCALE;
    const margin = HEX_R_DATA * 2;
    return {
      minX: bb.minX / DISPLAY_SCALE - margin,
      maxX: bb.maxX / DISPLAY_SCALE + margin,
      minY: bb.minY / DISPLAY_SCALE - margin,
      maxY: bb.maxY / DISPLAY_SCALE + margin,
    };
  }
  function visibleCells(){
    const d = D();
    if (!d || typeof d.cellsInAxialBbox !== 'function') return [];
    return d.cellsInAxialBbox(viewportBboxData());
  }
  function parentsInViewport(){
    const d = D();
    if (!d || typeof d.parentSvgCenter !== 'function') return [];
    const bbox = viewportBboxData();
    const HEX_R_DATA = PARENT_R / DISPLAY_SCALE;
    const colStep = 1.5 * HEX_R_DATA;
    const rowStep = SQRT3 * HEX_R_DATA;
    const colLo = Math.max(0, Math.floor((bbox.minX - HEX_R_DATA) / colStep) - 1);
    const colHi = Math.ceil((bbox.maxX - HEX_R_DATA) / colStep) + 1;
    const rowLo = Math.max(0, Math.floor((bbox.minY - HEX_R_DATA*SQRT3/2) / rowStep) - 1);
    const rowHi = Math.ceil((bbox.maxY - HEX_R_DATA*SQRT3/2) / rowStep) + 1;
    const out = [];
    for (let col = colLo; col <= colHi; col++){
      for (let row = rowLo; row <= rowHi; row++){
        const c = d.parentSvgCenter(col, row);
        if (c.x >= bbox.minX && c.x <= bbox.maxX && c.y >= bbox.minY && c.y <= bbox.maxY){
          out.push({ col, row });
        }
      }
    }
    return out;
  }

  // ── Cell rendering ─────────────────────────────────────────────
  function appendLandmarkHalo(parent, cx, cy){
    const halo = document.createElementNS(NS, 'circle');
    halo.setAttribute('cx', cx);
    halo.setAttribute('cy', cy);
    halo.setAttribute('r', SUB_R * 0.95);
    halo.setAttribute('class', 'sxw-landmark-halo');
    parent.appendChild(halo);
  }

  function buildCellGroup(Q, R, layer){
    const d = D();
    const owner = d.ownerOf(Q, R);
    if (!owner) return null;
    const ownerTerrain = getTerrain(owner.col, owner.row);
    const sub = d.getSubhex(Q, R, ownerTerrain);
    const c = cellWorldCenter(Q, R);
    const corners = cellCorners(Q, R);
    const pts = corners.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

    const sel = _ctx.selection();
    const isSelected = !!(sel && sel.kind === 'subhex' && sel.Q === Q && sel.R === R);

    const group = document.createElementNS(NS, 'g');
    group.setAttribute('class', 'sxw-cell-group');
    group.id = cellDomId(Q, R);
    group.dataset.q = Q;
    group.dataset.r = R;
    if (window.GCCFog && window.GCCFog.shouldFogSubhex(Q, R)){
      group.classList.add('fogged');
    }

    const poly = document.createElementNS(NS, 'polygon');
    poly.setAttribute('points', pts);
    let cls = 'sxw-cell';
    if (sub.source === 'authored') cls += ' authored';
    if (isSelected) cls += ' selected';
    poly.setAttribute('class', cls);
    poly.setAttribute('fill', terrainRgb(sub.terrain));
    group.appendChild(poly);

    if (I()){
      const terrainG = document.createElementNS(NS, 'g');
      terrainG.setAttribute('class', 'sxw-terrain-layer');
      I().append(terrainG, sub.terrain, c.x, c.y, SUB_R, Q, R);
      group.appendChild(terrainG);
      if (sub.feature && sub.feature.kind){
        const featG = document.createElementNS(NS, 'g');
        featG.setAttribute('class', 'sxw-feature-layer');
        if (sub.feature.landmarkId) appendLandmarkHalo(featG, c.x, c.y);
        I().appendFeature(featG, sub.feature.kind, c.x, c.y, SUB_R);
        group.appendChild(featG);
      }
    }

    group.addEventListener('mousedown', onCellMouseDown);
    group.addEventListener('mouseenter', onCellMouseEnter);
    group.addEventListener('click', onCellClick);
    layer.appendChild(group);
    return group;
  }

  // Visual refresh of one cell — terrain fill, .authored class,
  // terrain icon, feature icon. Read-only against current GCCSubhexData
  // state. Slice 5 callers (palette paint, fog brush) re-invoke this
  // after mutating data.
  function applyCellPaint(Q, R){
    const group = document.getElementById(cellDomId(Q, R));
    if (!group) return;
    const d = D();
    const owner = d.ownerOf(Q, R);
    const ownerTerrain = owner ? getTerrain(owner.col, owner.row) : null;
    const sub = d.getSubhex(Q, R, ownerTerrain);
    const poly = group.querySelector('.sxw-cell');
    if (!poly) return;
    poly.setAttribute('fill', terrainRgb(sub.terrain));
    poly.classList.toggle('authored', sub.source === 'authored');
    group.querySelectorAll('.sxw-terrain-layer, .sxw-feature-layer').forEach(n => n.remove());
    if (I()){
      const c = cellWorldCenter(Q, R);
      const terrainG = document.createElementNS(NS, 'g');
      terrainG.setAttribute('class', 'sxw-terrain-layer');
      I().append(terrainG, sub.terrain, c.x, c.y, SUB_R, Q, R);
      group.appendChild(terrainG);
      if (sub.feature && sub.feature.kind){
        const featG = document.createElementNS(NS, 'g');
        featG.setAttribute('class', 'sxw-feature-layer');
        if (sub.feature.landmarkId) appendLandmarkHalo(featG, c.x, c.y);
        I().appendFeature(featG, sub.feature.kind, c.x, c.y, SUB_R);
        group.appendChild(featG);
      }
    }
  }

  // ── Brush + paint (Slice 5a port from gcc-subhex-view.js v3.1.0) ──
  // The cell mousedown / mouseenter / mouseup chain drives the brush.
  // paintCell dispatches on rs.armed. Slice 5a covers terrain / erase /
  // feature / feature-erase / fog. region / path / lake arming branches
  // come back in Slice 5b alongside their picker UIs.
  function onCellMouseDown(ev){
    if (ev.button !== undefined && ev.button !== 0) return;
    if (!rs.armed) return;
    ev.preventDefault();
    ev.stopPropagation();
    const Q = +ev.currentTarget.dataset.q;
    const R = +ev.currentTarget.dataset.r;
    if (rs.armed.type !== 'path'){
      rs.brushing = true;
      rs.brushedThisDrag = new Set();
    }
    if (rs.armed.type === 'fog'){
      rs.fogBrushHide = !!(ev.shiftKey || ev.altKey);
    }
    // Paint-undo: open a new stroke before any captureBefore call.
    // Path/fog skip; their tools manage their own undo models.
    if (rs.armed.type !== 'fog' && rs.armed.type !== 'path'
        && window.GCCMapSubhexPalette
        && typeof window.GCCMapSubhexPalette.beginStroke === 'function'){
      window.GCCMapSubhexPalette.beginStroke();
    }
    paintCell(Q, R, ev.currentTarget);
    if (rs.brushing) window.addEventListener('mouseup', onBrushEnd);
  }

  function onCellMouseEnter(ev){
    const g = ev.currentTarget;
    // Raise on hover so the hover stroke isn't masked by adjacent cells.
    const parent = g.parentNode;
    if (parent && parent.lastChild !== g) parent.appendChild(g);
    if (!rs.brushing) return;
    const Q = +g.dataset.q;
    const R = +g.dataset.r;
    paintCell(Q, R, g);
  }

  function onBrushEnd(){
    if (rs.armed?.type === 'fog' && window.GCCFog){
      window.GCCFog.flush();
    }
    // Paint-undo: commit the stroke (palette ignores if empty —
    // fog/path branches skipped capture so their strokes are empty).
    if (window.GCCMapSubhexPalette
        && typeof window.GCCMapSubhexPalette.endStroke === 'function'){
      window.GCCMapSubhexPalette.endStroke();
    }
    rs.brushing = false;
    rs.brushedThisDrag = null;
    rs.fogBrushHide = false;
    window.removeEventListener('mouseup', onBrushEnd);
  }

  // Resolve the parent terrain to use when reading/writing this cell.
  // Owner-resolved via ownerOf — works regardless of which parent holds
  // the cell. Used by paintCell to give getSubhex the correct fallback
  // terrain (cells with no override inherit from owner parent).
  function effectiveParentTerrainFor(group){
    if (!group) return null;
    const Q = +group.dataset.q, R = +group.dataset.r;
    const owner = D().ownerOf(Q, R);
    if (!owner) return null;
    return getTerrain(owner.col, owner.row);
  }

  function paintCell(Q, R, group){
    const key = `${Q}_${R}`;
    if (rs.brushedThisDrag && rs.brushedThisDrag.has(key)) return;
    if (rs.brushedThisDrag) rs.brushedThisDrag.add(key);
    const a = rs.armed;
    if (!a) return;
    const pTerrain = effectiveParentTerrainFor(group);
    // Paint-undo capture (v1.4.0). Snapshot the cell's pre-mutation
    // state before any branch writes. fog has its own deferred-save
    // model; path has its own ↶ Undo (per-cell pop). Both are skipped.
    // Cell is identified by (Q,R) only — _currentStroke dedups so
    // repeated paints on the same cell within one stroke capture
    // only the original pre-state.
    if (a.type !== 'fog' && a.type !== 'path' && window.GCCMapSubhexPalette
        && typeof window.GCCMapSubhexPalette.captureBefore === 'function'){
      const sub = D().getSubhex(Q, R, pTerrain);
      window.GCCMapSubhexPalette.captureBefore(Q, R, {
        terrain:  sub.terrain  || null,
        feature:  sub.feature ? JSON.parse(JSON.stringify(sub.feature)) : null,
        regionId: sub.regionId || null,
        lakeId:   sub.lakeId   || null,
      });
    }
    if (a.type === 'erase'){
      D().setSubhexOverride(Q, R, { terrain: null });
    } else if (a.type === 'terrain'){
      D().setSubhexOverride(Q, R, { terrain: a.value });
    } else if (a.type === 'feature'){
      const existing = D().getSubhex(Q, R, pTerrain);
      const prior = existing && existing.feature;
      const next = (prior && prior.kind === a.value) ? prior : { kind: a.value };
      D().setSubhexFeature(Q, R, next);
    } else if (a.type === 'feature-erase'){
      const existing = D().getSubhex(Q, R, pTerrain);
      const hadFeature = existing && existing.feature && existing.feature.kind;
      D().clearSubhexFeature(Q, R);
      if (!hadFeature && window.GCCMapSubhexPalette){
        window.GCCMapSubhexPalette.flash('No feature here — paths use the Path tool');
      }
    } else if (a.type === 'fog'){
      // Defer save until onBrushEnd flushes; toggle the .fogged class
      // directly so the sweep updates live without firing the global
      // gcc-fog-changed listener for every painted cell.
      const Fog = window.GCCFog;
      if (!Fog) return;
      if (rs.fogBrushHide){
        Fog.hideSubhex(Q, R, { deferSave: true });
      } else {
        Fog.revealSubhex(Q, R, { deferSave: true });
      }
      if (group){
        group.classList.toggle('fogged', !!Fog.shouldFogSubhex(Q, R));
      }
    } else if (a.type === 'region'){
      D().assignCellToRegion(Q, R, a.value, pTerrain);
      _ctx.requestRender();
    } else if (a.type === 'region-erase'){
      D().unassignCellFromRegion(Q, R);
      _ctx.requestRender();
    } else if (a.type === 'lake'){
      const ok = D().setCellLake(Q, R, a.value, pTerrain);
      if (!ok && window.GCCMapSubhexPalette){
        window.GCCMapSubhexPalette.flash('Cell terrain must be water to assign to a lake');
      }
    } else if (a.type === 'lake-erase'){
      D().unsetCellLake(Q, R);
    } else if (a.type === 'path'){
      // Path tool doesn't drag-paint; click-only. brushing guard
      // matches legacy gcc-subhex-view.js paintCell.
      if (rs.brushing) return;
      // Which end of the path do clicks act on? Default 'tail' for
      // back-compat with payloads that predate v1.4.0 of the
      // palette. 'head' routes to prependCell / truncateAfter.
      const extendEnd = a.extendEnd === 'head' ? 'head' : 'tail';
      // Re-clicking an already-laid cell truncates from that cell
      // onward (tail) or backward (head). Otherwise extend-if-adjacent.
      const armedPath = P() && P().getPath(a.value);
      const onArmed = armedPath && armedPath.cells.some(c => c.Q === Q && c.R === R);
      if (onArmed){
        if (extendEnd === 'head'){
          P().truncateAfter(a.value, Q, R);
        } else {
          P().truncateBefore(a.value, Q, R);
        }
        if (window.GCCMapSubhexPalette){
          window.GCCMapSubhexPalette.rebuildPathPicker(a.value);
        }
        _ctx.requestRender();
        applyCellPaint(Q, R);
        notifyPaintedCell(Q, R);
        return;
      }
      const ok = extendEnd === 'head'
        ? P().prependCell(a.value, Q, R)
        : P().appendCell(a.value, Q, R);
      if (!ok){
        // append/prependCell rejects when the click isn't axially
        // adjacent to the path's last/first cell. Surface a flash so
        // the GM isn't left wondering why the click was silently
        // ignored.
        const ap = P().getPath(a.value);
        if (window.GCCMapSubhexPalette){
          if (ap && ap.cells.length){
            const target = extendEnd === 'head' ? ap.cells[0] : ap.cells[ap.cells.length - 1];
            const label = extendEnd === 'head' ? 'first' : 'last';
            window.GCCMapSubhexPalette.flash(`Not adjacent to path's ${label} cell (Q${target.Q}, R${target.R})`);
          } else {
            window.GCCMapSubhexPalette.flash('Could not extend path');
          }
        }
        return;
      }
      // If authoring toward a parent-path-marker destination, check
      // whether the newly-appended cell reached the marker's boundary
      // subhex. If so, the segment is now end-to-end authored — clear
      // the highlight so the destination dot drops its highlight class.
      if (rs.markerHighlight){
        const mh = rs.markerHighlight;
        const segments = window.GCCPaths
          ? (window.GCCPaths.segmentsAt(mh.col, mh.row) || []) : [];
        const seg = segments[mh.segIndex];
        if (seg){
          const otherEdge = (mh.edge === seg.entryEdge) ? seg.exitEdge : seg.entryEdge;
          if (typeof otherEdge === 'number' && otherEdge >= 0){
            const owned = D().ownedByParent(mh.col, mh.row);
            const destCell = boundaryCellForEdge(mh.col, mh.row, otherEdge, owned);
            if (destCell && destCell.Q === Q && destCell.R === R){
              rs.markerHighlight = null;
            }
          }
        }
      }
      if (window.GCCMapSubhexPalette){
        window.GCCMapSubhexPalette.rebuildPathPicker(a.value);
      }
      _ctx.requestRender();
    }
    applyCellPaint(Q, R);
    notifyPaintedCell(Q, R);
  }

  // Notify the palette that a cell was just painted so its detail
  // panel refreshes if the painted cell is the current shell
  // selection. Centralized at the bottom of paintCell so every branch
  // gets the notification without duplicating per-branch syncs.
  function notifyPaintedCell(Q, R){
    if (!window.GCCMapSubhexPalette || !_ctx) return;
    const sel = _ctx.selection();
    if (sel && sel.kind === 'subhex' && sel.Q === Q && sel.R === R){
      window.GCCMapSubhexPalette.syncDetail();
    }
  }

  // ── Cell click → shell selection ───────────────────────────────
  function onCellClick(ev){
    ev.stopPropagation();
    // Slice 4: clicks always select. Slice 5 returns early when a
    // palette tool is armed (the brush handlers take over).
    if (rs.armed) return;
    const Q = +ev.currentTarget.dataset.q;
    const R = +ev.currentTarget.dataset.r;
    selectCell(Q, R);
  }

  function selectCell(Q, R){
    _ctx.setSelection({ kind: 'subhex', Q, R });
    // setSelection triggers a render; .selected is re-applied via
    // buildCellGroup's class branch.
  }

  // Owner of the currently selected cell (back-compat helper, used
  // by Slice 5 detail panel).
  function selectedCellOwner(){
    const sel = _ctx ? _ctx.selection() : null;
    if (!sel || sel.kind !== 'subhex') return null;
    return D().ownerOf(sel.Q, sel.R);
  }
  function selectedParentTerrain(){
    const owner = selectedCellOwner();
    return owner ? getTerrain(owner.col, owner.row) : null;
  }

  // ── Paths ──────────────────────────────────────────────────────
  function renderPaths(layer){
    const p = P();
    if (!p) return;
    const parents = parentsInViewport();
    const seenIds = new Set();
    const paths = [];
    for (const parent of parents){
      for (const pp of p.pathsInParent(parent.col, parent.row)){
        if (seenIds.has(pp.id)) continue;
        seenIds.add(pp.id);
        paths.push(pp);
      }
    }
    if (!paths.length) return;
    for (const pp of paths){
      if (!pp.cells || pp.cells.length < 1) continue;
      const pts = pathPolylinePoints(pp.cells);
      if (pts.length < 2){
        const c = cellWorldCenter(pp.cells[0].Q, pp.cells[0].R);
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('cx', c.x);
        dot.setAttribute('cy', c.y);
        dot.setAttribute('r', 3);
        dot.setAttribute('class', `sxw-path-dot sxw-path-${pp.kind}`);
        dot.dataset.pathId = pp.id;
        layer.appendChild(dot);
        continue;
      }
      const poly = document.createElementNS(NS, 'polyline');
      poly.setAttribute('points', pts.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '));
      poly.setAttribute('class', `sxw-path sxw-path-${pp.kind}`);
      poly.setAttribute('fill', 'none');
      poly.dataset.pathId = pp.id;
      if (rs.armed && rs.armed.type === 'path' && rs.armed.value === pp.id){
        poly.classList.add('armed');
      }
      layer.appendChild(poly);
    }
  }

  function pathPolylinePoints(cells){
    if (!cells || !cells.length) return [];
    if (cells.length === 1){
      const c = cellWorldCenter(cells[0].Q, cells[0].R);
      return [[c.x, c.y]];
    }
    const pts = [];
    const first = cellWorldCenter(cells[0].Q, cells[0].R);
    pts.push([first.x, first.y]);
    for (let i = 0; i < cells.length - 1; i++){
      const a = cellWorldCenter(cells[i].Q, cells[i].R);
      const b = cellWorldCenter(cells[i+1].Q, cells[i+1].R);
      pts.push([(a.x + b.x) / 2, (a.y + b.y) / 2]);
    }
    const last = cellWorldCenter(cells[cells.length-1].Q, cells[cells.length-1].R);
    pts.push([last.x, last.y]);
    return pts;
  }

  // Pulsing dot on a visible neighbor of the armed path's last cell
  // when that last cell isn't in viewport. Inert in Slice 4 (no
  // armed state); kept in render path so Slice 5 wiring is plug-in.
  function renderArmedPathGhost(layer){
    if (!rs.armed || rs.armed.type !== 'path') return;
    if (!P()) return;
    const armed = P().getPath(rs.armed.value);
    if (!armed || !armed.cells || armed.cells.length === 0) return;
    const last = armed.cells[armed.cells.length - 1];
    const visSet = new Set(visibleCells().map(c => `${c.Q}_${c.R}`));
    if (visSet.has(`${last.Q}_${last.R}`)) return;
    const NEIGHBORS = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
    let target = null;
    for (const [dq, dr] of NEIGHBORS){
      const cQ = last.Q + dq, cR = last.R + dr;
      if (visSet.has(`${cQ}_${cR}`)){
        target = { Q: cQ, R: cR };
        break;
      }
    }
    if (!target) return;
    const c = cellWorldCenter(target.Q, target.R);
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', c.x);
    dot.setAttribute('cy', c.y);
    dot.setAttribute('r', 5);
    dot.setAttribute('class', `sxw-armed-ghost sxw-path-${armed.kind}`);
    dot.dataset.pathId = armed.id;
    layer.appendChild(dot);
  }

  // ── Region labels ──────────────────────────────────────────────
  function renderRegionLabels(layer){
    const d = D();
    if (!d) return;
    const regions = d.listRegions();
    if (!regions.length) return;
    const bb = _ctx.viewportBbox();
    for (const region of regions){
      const members = d.regionMembers(region.id);
      if (members.length < 3) continue;
      let sx = 0, sy = 0;
      for (const { Q, R } of members){
        const c = cellWorldCenter(Q, R);
        sx += c.x; sy += c.y;
      }
      const cx = sx / members.length;
      const cy = sy / members.length;
      if (cx < bb.minX || cx > bb.maxX || cy < bb.minY || cy > bb.maxY) continue;
      const text = document.createElementNS(NS, 'text');
      text.setAttribute('x', cx);
      text.setAttribute('y', cy);
      text.setAttribute('class', 'sxw-region-label');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.textContent = region.name;
      layer.appendChild(text);
    }
  }

  // ── Parent path markers (visual + click → inert toast) ─────────
  function pathMarkerColor(seg){
    if (seg.kind === 'river') return '#378ADD';
    if (seg.kind === 'road')  return '#8b5a2b';
    if (seg.kind === 'track') return '#c8a06f';
    return null;
  }
  function edgeMidpointFor(col, row, edge){
    const c = parentWorldCenter(col, row);
    const a1 = (Math.PI / 180) * (60 * ((edge + 4) % 6));
    const a2 = (Math.PI / 180) * (60 * ((edge + 5) % 6));
    return {
      x: c.x + PARENT_R * (Math.cos(a1) + Math.cos(a2)) / 2,
      y: c.y + PARENT_R * (Math.sin(a1) + Math.sin(a2)) / 2,
    };
  }
  function boundaryCellForEdge(col, row, edge, owned){
    const mid = edgeMidpointFor(col, row, edge);
    let best = null, bestD = Infinity;
    for (const cell of owned){
      const v = cellWorldCenter(cell.Q, cell.R);
      const dx = v.x - mid.x, dy = v.y - mid.y;
      const d2 = dx*dx + dy*dy;
      if (d2 < bestD){ bestD = d2; best = cell; }
    }
    return best;
  }
  function authoredBoundaryCellForSegment(parent, seg, edge, owned){
    if (!P() || !seg.name) return null;
    if (!D()) return null;
    if (typeof window.GCCPaths?.neighborAcross !== 'function') return null;
    const nbParent = window.GCCPaths.neighborAcross(parent.col, parent.row, edge);
    if (!nbParent) return null;
    const d = D();
    const NEIGHBORS = d.NEIGHBOR_DELTAS || [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
    const edgeCells = [];
    for (const c of owned){
      for (const [dq, dr] of NEIGHBORS){
        const owner = d.ownerOf(c.Q + dq, c.R + dr);
        if (owner && owner.col === nbParent.col && owner.row === nbParent.row){
          edgeCells.push(c);
          break;
        }
      }
    }
    if (!edgeCells.length) return null;
    const paths = P().listPaths();
    let bestCell = null, bestD = Infinity;
    const mid = edgeMidpointFor(parent.col, parent.row, edge);
    for (const pp of paths){
      if (pp.kind !== seg.kind) continue;
      if (pp.name !== seg.name) continue;
      if (!pp.cells || !pp.cells.length) continue;
      const cellSet = new Set(pp.cells.map(c => `${c.Q}_${c.R}`));
      for (const ec of edgeCells){
        if (!cellSet.has(`${ec.Q}_${ec.R}`)) continue;
        const v = cellWorldCenter(ec.Q, ec.R);
        const dx = v.x - mid.x, dy = v.y - mid.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < bestD){ bestD = d2; bestCell = ec; }
      }
    }
    return bestCell;
  }
  function findSubhexPathForSegment(seg, boundaryQ, boundaryR){
    if (!P() || !seg.name) return null;
    const paths = P().listPaths();
    for (const pp of paths){
      if (pp.kind !== seg.kind) continue;
      if (pp.name !== seg.name) continue;
      if (!pp.cells || !pp.cells.length) continue;
      for (const c of pp.cells){
        if (c.Q === boundaryQ && c.R === boundaryR) return pp.id;
      }
    }
    return null;
  }
  function pathMarkerTooltip(parent, seg, edge, authored){
    const neighbor = (typeof window.GCCPaths?.neighborAcross === 'function')
      ? window.GCCPaths.neighborAcross(parent.col, parent.row, edge) : null;
    const neighborLabel = neighbor ? hexIdStr(neighbor.col, neighbor.row) : '?';
    const name = seg.name || '(unnamed)';
    const verb = authored ? ' [authored — edit in Slice 5]' : ' [author in Slice 5]';
    return `${name} (${seg.kind}) → ${neighborLabel}${verb}`;
  }
  function placeMarker(layer, parent, seg, edge, owned, color, segIndex){
    const authoredCell = authoredBoundaryCellForSegment(parent, seg, edge, owned);
    const best = authoredCell || boundaryCellForEdge(parent.col, parent.row, edge, owned);
    if (window.GCC_DEBUG_PATHS) console.log(`[Paths]     best=`,
      best ? `(${best.Q},${best.R})${authoredCell?' (authored)':''}` : 'null — abort');
    if (!best) return;
    const mid = edgeMidpointFor(parent.col, parent.row, edge);
    const cellPos = cellWorldCenter(best.Q, best.R);
    let dx = mid.x - cellPos.x, dy = mid.y - cellPos.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    let mx = cellPos.x, my = cellPos.y;
    if (len > 0){
      const offset = SUB_R * 0.5;
      mx = cellPos.x + dx * (offset / len);
      my = cellPos.y + dy * (offset / len);
    }
    const g = document.createElementNS(NS, 'g');
    const isEntry = edge === seg.entryEdge;
    const authoredId = findSubhexPathForSegment(seg, best.Q, best.R);
    let cls = `sxw-parent-path-marker sxw-ppm-${seg.kind}`;
    if (authoredId) cls += ' authored';
    if (rs.markerHighlight
        && rs.markerHighlight.col === parent.col
        && rs.markerHighlight.row === parent.row
        && rs.markerHighlight.segIndex === segIndex
        && rs.markerHighlight.edge !== edge){
      cls += ' destination';
    }
    g.setAttribute('class', cls);
    g.dataset.parentCol = parent.col;
    g.dataset.parentRow = parent.row;
    g.dataset.segIndex = segIndex;
    g.dataset.edge = edge;
    g.dataset.kind = seg.kind;
    g.dataset.name = seg.name || '';
    g.dataset.cellQ = best.Q;
    g.dataset.cellR = best.R;
    g.dataset.end = isEntry ? 'entry' : 'exit';
    if (authoredId) g.dataset.authoredPath = authoredId;
    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', mx.toFixed(1));
    circle.setAttribute('cy', my.toFixed(1));
    circle.setAttribute('r', '4.5');
    circle.setAttribute('fill', color);
    g.appendChild(circle);
    const title = document.createElementNS(NS, 'title');
    title.textContent = pathMarkerTooltip(parent, seg, edge, !!authoredId);
    g.appendChild(title);
    g.addEventListener('click', onParentPathMarkerClick);
    layer.appendChild(g);
  }
  function renderParentPathMarkers(layer){
    if (!window.GCCPaths) return;
    const parents = parentsInViewport();
    if (!parents.length) return;
    const DBG = window.GCC_DEBUG_PATHS;
    if (DBG) console.log('[Paths] renderParentPathMarkers parents=', parents.length);
    // Slice 3 caveat (carries through): shared edges between two
    // visible parents draw two markers (one from each side). Marker
    // dedup is Slice 7's job.
    for (const parent of parents){
      const segments = window.GCCPaths.segmentsAt(parent.col, parent.row);
      if (DBG) console.log(`[Paths] (${parent.col},${parent.row}) segs=`,
        (segments||[]).map(s => `${s.kind}:${s.name||'(unnamed)'}@${s.entryEdge}/${s.exitEdge}`));
      if (!segments || !segments.length) continue;
      const owned = D().ownedByParent(parent.col, parent.row);
      if (DBG) console.log(`[Paths] (${parent.col},${parent.row}) owned=`, owned.length);
      if (!owned.length) continue;
      for (let segIndex = 0; segIndex < segments.length; segIndex++){
        const seg = segments[segIndex];
        const color = pathMarkerColor(seg);
        if (!color){
          if (DBG) console.log(`[Paths]   seg[${segIndex}] ${seg.kind}:${seg.name||'?'} → no color, skip`);
          continue;
        }
        for (const edgeKey of ['entryEdge', 'exitEdge']){
          const edge = seg[edgeKey];
          if (typeof edge !== 'number' || edge < 0 || edge > 5){
            if (DBG) console.log(`[Paths]   seg[${segIndex}] ${seg.kind}:${seg.name||'?'} ${edgeKey}=${edge} → invalid, skip`);
            continue;
          }
          if (DBG) console.log(`[Paths]   placeMarker (${parent.col},${parent.row}) seg[${segIndex}] ${seg.kind}:${seg.name||'?'} ${edgeKey}=${edge}`);
          placeMarker(layer, parent, seg, edge, owned, color, segIndex);
        }
      }
    }
  }
  function onParentPathMarkerClick(ev){
    ev.stopPropagation();
    const g = ev.currentTarget;
    const parentCol = +g.dataset.parentCol;
    const parentRow = +g.dataset.parentRow;
    const segIndex  = +g.dataset.segIndex;
    const edge      = +g.dataset.edge;
    const kind      = g.dataset.kind;
    const name      = g.dataset.name || '(unnamed)';
    const Q         = +g.dataset.cellQ;
    const R         = +g.dataset.cellR;
    const authoredId = g.dataset.authoredPath;
    if (!P() || !window.GCCMapSubhexPalette){
      // Defensive: palette isn't loaded yet, or paths data missing.
      return;
    }
    let pathId;
    if (authoredId){
      // Visual-placement matched a path containing this exact
      // boundary cell — arm that one. Fast path.
      pathId = authoredId;
    } else {
      // Visual-placement missed (path doesn't yet contain this cell),
      // but a path with the same kind+name may still exist elsewhere
      // — typically authored from another parent and not yet extended
      // into this one. Arm the existing one instead of duplicating.
      const existing = P().findByKindName(kind, name);
      if (existing){
        pathId = existing.id;
      } else {
        // Truly new — create with kind+name from the marker; anchor
        // first cell at the boundary subhex.
        const newPath = P().createPath(kind, name);
        if (!newPath) return;
        P().appendCell(newPath.id, Q, R);
        pathId = newPath.id;
      }
    }
    rs.markerHighlight = { col: parentCol, row: parentRow, segIndex, edge };
    const extendEnd = window.GCCMapSubhexPalette && window.GCCMapSubhexPalette.getExtendEnd
      ? window.GCCMapSubhexPalette.getExtendEnd() : 'tail';
    rs.armed = { type: 'path', value: pathId, extendEnd };
    window.GCCMapSubhexPalette.armPathFromMarker(pathId);
    _ctx.requestRender();
  }

  // ── Crossings (visual + inert badge) ───────────────────────────
  function dismissKey(Q, R, pathIds){
    const sorted = [...pathIds].sort();
    return `${Q}_${R}|${sorted.join('|')}`;
  }
  function detectCrossings(){
    if (!P()) return [];
    const parents = parentsInViewport();
    if (!parents.length) return [];
    const seenIds = new Set();
    const paths = [];
    for (const parent of parents){
      for (const pp of P().pathsInParent(parent.col, parent.row)){
        if (seenIds.has(pp.id)) continue;
        seenIds.add(pp.id);
        paths.push(pp);
      }
    }
    if (paths.length < 2) return [];
    const byCell = new Map();
    for (const pp of paths){
      if (!pp.cells) continue;
      const seen = new Set();
      for (const c of pp.cells){
        const k = `${c.Q}_${c.R}`;
        if (seen.has(k)) continue;
        seen.add(k);
        if (!byCell.has(k)) byCell.set(k, []);
        byCell.get(k).push(pp);
      }
    }
    const visSet = new Set(visibleCells().map(c => `${c.Q}_${c.R}`));
    const out = [];
    for (const [key, plist] of byCell){
      if (plist.length < 2) continue;
      if (!visSet.has(key)) continue;
      // Skip pure water-meets-water confluences (river joining
      // river — geography, not crossing).
      const allWater = plist.every(pp => pp.kind === 'river' || pp.kind === 'stream');
      if (allWater) continue;
      const [Q, R] = key.split('_').map(Number);
      const owner = D().ownerOf(Q, R);
      if (!owner) continue;
      const ownerTerrain = getTerrain(owner.col, owner.row);
      const sub = D().getSubhex(Q, R, ownerTerrain);
      if (sub && sub.feature && sub.feature.kind) continue;
      const dKey = dismissKey(Q, R, plist.map(pp => pp.id));
      if (rs.dismissedCrossings[dKey]) continue;
      out.push({ Q, R, paths: plist });
    }
    return out;
  }
  function renderCrossings(layer){
    const crossings = detectCrossings();
    if (!crossings.length) return;
    for (const x of crossings){
      const c = cellWorldCenter(x.Q, x.R);
      const bx = c.x + SUB_R * 0.55;
      const by = c.y - SUB_R * 0.55;
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'sxw-crossing-badge');
      g.dataset.q = x.Q;
      g.dataset.r = x.R;
      g.dataset.pathIds = x.paths.map(pp => pp.id).join(',');
      g.dataset.pathKinds = x.paths.map(pp => pp.kind).join(',');
      g.dataset.pathNames = x.paths.map(pp => pp.name || '').join('||');
      const bg = document.createElementNS(NS, 'circle');
      bg.setAttribute('cx', bx.toFixed(1));
      bg.setAttribute('cy', by.toFixed(1));
      bg.setAttribute('r', '5.5');
      bg.setAttribute('class', 'sxw-crossing-badge-bg');
      g.appendChild(bg);
      const x1 = document.createElementNS(NS, 'line');
      x1.setAttribute('x1', (bx - 3).toFixed(1));
      x1.setAttribute('y1', (by - 3).toFixed(1));
      x1.setAttribute('x2', (bx + 3).toFixed(1));
      x1.setAttribute('y2', (by + 3).toFixed(1));
      x1.setAttribute('class', 'sxw-crossing-badge-x');
      g.appendChild(x1);
      const x2 = document.createElementNS(NS, 'line');
      x2.setAttribute('x1', (bx - 3).toFixed(1));
      x2.setAttribute('y1', (by + 3).toFixed(1));
      x2.setAttribute('x2', (bx + 3).toFixed(1));
      x2.setAttribute('y2', (by - 3).toFixed(1));
      x2.setAttribute('class', 'sxw-crossing-badge-x');
      g.appendChild(x2);
      const tip = document.createElementNS(NS, 'title');
      const names = x.paths.map(pp => pp.name || `(${pp.kind})`).join(' × ');
      tip.textContent = `Crossing: ${names} — click to set bridge/ford/ferry/crossroads`;
      g.appendChild(tip);
      g.addEventListener('click', onCrossingBadgeClick);
      layer.appendChild(g);
    }
  }

  // ── Crossing menu (foreignObject popup) ────────────────────────
  // Picking a kind writes the feature; Dismiss records suppression
  // (per-path-set key) so the badge stops appearing for that exact
  // path-mix. Suppression keys include sorted path-ids so swapping
  // which paths cross at the cell un-suppresses.
  function onCrossingBadgeClick(ev){
    ev.stopPropagation();
    const g = ev.currentTarget;
    const Q = +g.dataset.q;
    const R = +g.dataset.r;
    const pathIds   = g.dataset.pathIds.split(',');
    const pathKinds = g.dataset.pathKinds.split(',');
    const pathNames = g.dataset.pathNames.split('||');
    const kinds = suggestedCrossingKinds(pathKinds);
    showCrossingMenu(Q, R, pathIds, pathKinds, pathNames, kinds);
  }
  function suggestedCrossingKinds(pathKinds){
    const kinds = new Set(pathKinds);
    const hasRiver = kinds.has('river');
    const hasRoad  = kinds.has('road');
    const hasTrack = kinds.has('track') || kinds.has('trail');
    if (hasRiver && (hasRoad || hasTrack)) return ['bridge', 'ford', 'ferry'];
    if (hasRoad && hasTrack) return ['crossroads'];
    if (hasRoad && kinds.size === 1 && pathKinds.length >= 2) return ['crossroads'];
    if (hasTrack && kinds.size === 1 && pathKinds.length >= 2) return ['crossroads'];
    if (hasRiver && kinds.size === 1 && pathKinds.length >= 2){
      // Two rivers meeting — defensive fallback; detectCrossings
      // suppresses these so the click flow shouldn't reach here.
      return ['landmark'];
    }
    return ['landmark'];
  }
  function showCrossingMenu(Q, R, pathIds, pathKinds, pathNames, kinds){
    closeCrossingMenu();
    if (!_root) return;
    const c = cellWorldCenter(Q, R);
    const mx = c.x + SUB_R * 0.55;
    const my = c.y - SUB_R * 0.55;
    const fo = document.createElementNS(NS, 'foreignObject');
    fo.setAttribute('class', 'sxw-crossing-menu');
    const W = 160, H = 30 + 28 * (kinds.length + 1);
    // Clamp inside the current viewport so the menu never spills off-
    // screen. _ctx.viewportBbox() gives display-scale world bounds.
    const bb = _ctx.viewportBbox();
    const place  = (mx + 8 + W < bb.maxX) ? mx + 8 : mx - W - 8;
    const placeY = (my + H < bb.maxY) ? my : Math.max(bb.minY + 8, bb.maxY - H - 8);
    fo.setAttribute('x', place.toFixed(1));
    fo.setAttribute('y', placeY.toFixed(1));
    fo.setAttribute('width', W);
    fo.setAttribute('height', H);
    const html = document.createElement('div');
    html.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    html.className = 'sxw-crossing-menu-body';
    const hint = document.createElement('div');
    hint.className = 'sxw-crossing-menu-hint';
    hint.textContent = pathNames.filter(n => n).join(' × ') || 'Crossing';
    html.appendChild(hint);
    for (const kind of kinds){
      const btn = document.createElement('button');
      btn.className = 'sxw-crossing-menu-btn';
      btn.textContent = kind.charAt(0).toUpperCase() + kind.slice(1);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        applyCrossingFeature(Q, R, kind, pathKinds, pathNames);
        closeCrossingMenu();
      });
      html.appendChild(btn);
    }
    const dismiss = document.createElement('button');
    dismiss.className = 'sxw-crossing-menu-btn sxw-crossing-menu-btn-dismiss';
    dismiss.textContent = 'Dismiss';
    dismiss.addEventListener('click', (e) => {
      e.stopPropagation();
      const dismissed = loadDismissedCrossings();
      dismissed[dismissKey(Q, R, pathIds)] = 1;
      saveDismissedCrossings(dismissed);
      rs.dismissedCrossings = dismissed;
      closeCrossingMenu();
      if (_ctx) _ctx.requestRender();
    });
    html.appendChild(dismiss);
    fo.appendChild(html);
    // Append to _root as a sibling of the layered render tree so
    // rebuildAllLayers (which only wipes layers[*].innerHTML) leaves
    // the menu intact during pan/zoom redraws.
    _root.appendChild(fo);
    // Close on outside click — one-shot global capture listener.
    setTimeout(() => {
      const off = (e) => {
        if (!fo.contains || (e.target && !fo.contains(e.target))){
          closeCrossingMenu();
          window.removeEventListener('mousedown', off, true);
        }
      };
      window.addEventListener('mousedown', off, true);
    }, 0);
  }
  function closeCrossingMenu(){
    if (!_root) return;
    _root.querySelectorAll('.sxw-crossing-menu').forEach(n => n.remove());
  }
  // Compose a default name for the crossing feature based on the
  // paths it bridges. "Bridge over Selintan", "Ford on the Old Coast
  // Road", "Crossroads of X and Y".
  function crossingName(kind, pathKinds, pathNames){
    const named = [];
    for (let i = 0; i < pathKinds.length; i++){
      if (pathNames[i]) named.push({ kind: pathKinds[i], name: pathNames[i] });
    }
    if (kind === 'bridge'){
      const river = named.find(p => p.kind === 'river');
      return river ? `Bridge over ${river.name}` : 'Bridge';
    }
    if (kind === 'ford'){
      const river = named.find(p => p.kind === 'river');
      return river ? `Ford on ${river.name}` : 'Ford';
    }
    if (kind === 'ferry'){
      const river = named.find(p => p.kind === 'river');
      return river ? `Ferry across ${river.name}` : 'Ferry';
    }
    if (kind === 'crossroads'){
      if (named.length >= 2) return `Crossroads of ${named[0].name} and ${named[1].name}`;
      return 'Crossroads';
    }
    if (kind === 'landmark' && named.length >= 2){
      const allRivers = named.every(p => p.kind === 'river');
      if (allRivers) return `Confluence of ${named[0].name} and ${named[1].name}`;
    }
    return kind.charAt(0).toUpperCase() + kind.slice(1);
  }
  function applyCrossingFeature(Q, R, kind, pathKinds, pathNames){
    if (!D()) return;
    const name = crossingName(kind, pathKinds, pathNames);
    D().setSubhexFeature(Q, R, { kind, name });
    applyCellPaint(Q, R);
    if (window.GCCMapSubhexPalette){
      const sel = _ctx ? _ctx.selection() : null;
      if (sel && sel.kind === 'subhex' && sel.Q === Q && sel.R === R){
        window.GCCMapSubhexPalette.syncDetail();
      }
    }
    if (_ctx) _ctx.requestRender();
  }

  // ── Layer management + full rebuild ────────────────────────────
  function makeLayer(cls){
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', cls);
    return g;
  }

  // Full rebuild of all layers. Called from render() on every
  // viewport / data change. Slice 5 may introduce per-layer
  // invalidation for finer-grained updates; Slice 4 brute-forces.
  function rebuildAllLayers(){
    if (!layers) return;
    for (const key of Object.keys(layers)){
      layers[key].innerHTML = '';
    }

    // Cells layer: every visible cell, terrain via ownerOf.
    const cells = visibleCells();
    for (const { Q, R } of cells){
      buildCellGroup(Q, R, layers.cells);
    }

    // Parent overlay (always on for now; Slice 5 wires a toggle if
    // the showParents pref survives the panel reorg).
    const showLabels = _ctx.zoom() >= 0.7;
    const parents = parentsInViewport();
    layers.parents.setAttribute('pointer-events', 'none');
    for (const parent of parents){
      const corners = parentCornersAt(parent.col, parent.row);
      const pts = corners.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
      const poly = document.createElementNS(NS, 'polygon');
      poly.setAttribute('points', pts);
      poly.setAttribute('class', 'sxw-parent-outline-overlay');
      layers.parents.appendChild(poly);
      if (showLabels){
        const c = parentWorldCenter(parent.col, parent.row);
        const text = document.createElementNS(NS, 'text');
        text.setAttribute('x', c.x.toFixed(1));
        text.setAttribute('y', (c.y - PARENT_R * 0.78).toFixed(1));
        text.setAttribute('class', 'sxw-parent-outline-label');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.textContent = hexIdStr(parent.col, parent.row);
        layers.parents.appendChild(text);
      }
    }

    renderPaths(layers.paths);
    renderArmedPathGhost(layers.ghost);
    renderRegionLabels(layers.regions);
    renderParentPathMarkers(layers.markers);
    renderCrossings(layers.crossings);
  }

  // ── Renderer contract ──────────────────────────────────────────
  function mount(svg, ctx){
    _ctx = ctx;
    _root = document.createElementNS(NS, 'g');
    _root.setAttribute('class', 'gcc-map-subhex-root');
    svg.appendChild(_root);

    // Z-order: cells (bottom) → parent overlay → paths → ghost →
    // region labels → parent-path markers → crossings (top). Same
    // append order as legacy rebuildSVG.
    layers = {
      cells:     makeLayer('sxw-cells-layer'),
      parents:   makeLayer('sxw-parent-outline-overlay-layer'),
      paths:     makeLayer('sxw-paths-layer'),
      ghost:     makeLayer('sxw-armed-ghost-layer'),
      regions:   makeLayer('sxw-region-label-layer'),
      markers:   makeLayer('sxw-parent-path-markers'),
      crossings: makeLayer('sxw-crossings-layer'),
    };
    for (const key of ['cells','parents','paths','ghost','regions','markers','crossings']){
      _root.appendChild(layers[key]);
    }

    // Data-change listeners. Cheap brute-force re-render on any
    // upstream change — Slice 5 may refine to per-cell applyCellPaint
    // for the palette flow.
    _onFogChanged = () => { if (_ctx) _ctx.requestRender(); };
    window.addEventListener('gcc-fog-changed', _onFogChanged);

    rebuildAllLayers();
  }

  function render(){
    rebuildAllLayers();
  }

  function unmount(){
    if (_onFogChanged){
      window.removeEventListener('gcc-fog-changed', _onFogChanged);
      _onFogChanged = null;
    }
    closeCrossingMenu();
    if (_root && _root.parentNode) _root.parentNode.removeChild(_root);
    _root = null;
    layers = null;
    _ctx = null;
  }

  // ── Register with shell ────────────────────────────────────────
  // pxPerWorldUnit: 1 — the renderer's world coords are already at
  // display-scale (legacy ×13 baked in), so the shell's
  // viewBox-from-pixels math runs 1:1 against them.
  // coordsScale: 13 — declares that this scale's world units are 13×
  // the canonical parent-scale world units. gcc-map.js v0.2.1
  // converts state.view.cx/cy when switching scales so a geographic
  // point stays under the view center.
  window.GCCMap.registerScale({
    name: 'subhex',
    label: '3-mile',
    hexSize: 3,
    pxPerWorldUnit: 1,
    coordsScale: DISPLAY_SCALE,
    zoomMin: 0.5,
    zoomMax: 4.0,
    zoomDefault: 1.0,
    renderer: { mount, render, unmount },
    tools: [],
  });

  // ── Back-compat exports for palette + future Slice 5b wiring ──
  // setArmed/getArmed are the palette's bridge to the brush. The
  // palette calls setArmed when the GM clicks a swatch/glyph; the
  // brush handlers above read rs.armed on every mousedown/enter.
  window.GCCMapSubhexRenderer = {
    setArmed(armed){ rs.armed = armed; if (_ctx) _ctx.requestRender(); },
    getArmed(){ return rs.armed; },
    setMarkerHighlight(h){ rs.markerHighlight = h; if (_ctx) _ctx.requestRender(); },
    applyCellPaint,
    paintCell,
    effectiveParentTerrainFor,
    selectedCellOwner,
    selectedParentTerrain,
  };
})();
