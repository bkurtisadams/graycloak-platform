// gw-annotations.js v0.5.0 — 2026-05-29
// v0.5.0 — `hidden` flag on markers/strokes (GM-only features kept off the
//          player publish) + exportSafe() returning the non-hidden set.
// v0.4.0 — 2026-05-25 (monastery + installation marker kinds)
// Freehand vector overlay for the Gamma World subhex map: smooth line
// strokes (rivers/roads/trails/pen) and point markers (settlement icons),
// stored in world-SVG coordinates so they pan/zoom with the subhex view.
// Grid-independent — strokes ignore hex boundaries entirely.
//
// Strokes store RAW sampled points; the renderer smooths (Catmull-Rom) at
// draw time, so a stroke stays re-smoothable. Markers are points with a
// kind + optional name. localStorage-backed; emits gw-annotations-changed.

(function(){
  'use strict';
  const LS_KEY = 'gw-annotations';
  const SCHEMA = 1;

  let DB = { v: SCHEMA, strokes: [], markers: [] };
  let _loaded = false;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw){
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.strokes) && Array.isArray(p.markers)){ DB = p; _loaded = true; }
    }
  } catch(e){ DB = { v: SCHEMA, strokes: [], markers: [] }; }
  // First load with no working annotations: seed from the committed map (gw-authored.js).
  if (!_loaded || (!DB.strokes.length && !DB.markers.length)){
    try {
      const c = (typeof window !== 'undefined' && window.GW_AUTHORED && window.GW_AUTHORED.stores && window.GW_AUTHORED.stores[LS_KEY]) || null;
      if (c && Array.isArray(c.strokes) && Array.isArray(c.markers) && (c.strokes.length || c.markers.length)) DB = c;
    } catch(e){}
  }

  function save(){
    try { localStorage.setItem(LS_KEY, JSON.stringify(DB)); }
    catch(e){ try { console.warn('[gw-annotations] save failed:', e && e.name); } catch(_){} }
  }
  function emit(reason){
    try { window.dispatchEvent(new CustomEvent('gw-annotations-changed', { detail: { reason } })); } catch(_){}
  }
  function uid(prefix){ return prefix + Date.now().toString(36) + Math.floor(Math.random()*1e6).toString(36); }

  function bboxOf(pts){
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of pts){
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return { minX, minY, maxX, maxY };
  }
  function intersects(a, b, pad){
    pad = pad || 0;
    return !(a.maxX < b.minX - pad || a.minX > b.maxX + pad ||
             a.maxY < b.minY - pad || a.minY > b.maxY + pad);
  }

  // ── strokes ────────────────────────────────────────────────────────────────
  const STROKE_KINDS = ['river', 'road', 'trail', 'pen'];
  function addStroke(kind, pts, opts){
    if (!Array.isArray(pts) || pts.length < 2) return null;
    const k = STROKE_KINDS.includes(kind) ? kind : 'pen';
    const clean = pts.map(p => [+p[0], +p[1]]);
    const s = { id: uid('s'), kind: k, pts: clean, bbox: bboxOf(clean) };
    if (opts && opts.color) s.color = opts.color;
    if (opts && opts.width) s.width = +opts.width;
    if (opts && opts.gen) s.gen = true;
    if (opts && opts.parent) s.parent = String(opts.parent);
    if (opts && opts.hidden) s.hidden = true;
    DB.strokes.push(s);
    if (!(opts && opts.deferSave)) { save(); emit('stroke-add'); }
    return s.id;
  }
  function updateStroke(id, fields){
    const s = DB.strokes.find(x => x.id === id);
    if (!s) return false;
    if (fields.pts && Array.isArray(fields.pts) && fields.pts.length >= 2){
      s.pts = fields.pts.map(p => [+p[0], +p[1]]); s.bbox = bboxOf(s.pts);
    }
    if ('kind' in fields && STROKE_KINDS.includes(fields.kind)) s.kind = fields.kind;
    if ('color' in fields) s.color = fields.color || undefined;
    if ('width' in fields) s.width = fields.width ? +fields.width : undefined;
    if ('hidden' in fields){ if (fields.hidden) s.hidden = true; else delete s.hidden; }
    save(); emit('stroke-update');
    return true;
  }
  function deleteStroke(id){
    const i = DB.strokes.findIndex(x => x.id === id);
    if (i < 0) return false;
    DB.strokes.splice(i, 1);
    save(); emit('stroke-delete');
    return true;
  }
  function listStrokes(){ return DB.strokes; }
  function strokesInBbox(bbox, pad){
    if (!bbox) return DB.strokes.slice();
    return DB.strokes.filter(s => intersects(s.bbox, bbox, pad));
  }

  // ── markers ────────────────────────────────────────────────────────────────
  const MARKER_KINDS = ['city', 'town', 'village', 'ruin', 'vault', 'lair', 'camp', 'shrine', 'monastery', 'landmark', 'robot-farm', 'fortification', 'spaceport', 'installation'];
  function addMarker(kind, x, y, opts){
    const k = MARKER_KINDS.includes(kind) ? kind : 'landmark';
    const m = { id: uid('m'), kind: k, x: +x, y: +y };
    if (opts && opts.name && String(opts.name).trim()) m.name = String(opts.name).trim();
    if (opts && opts.gen) m.gen = true;
    if (opts && opts.parent) m.parent = String(opts.parent);
    if (opts && opts.hidden) m.hidden = true;
    DB.markers.push(m);
    if (!(opts && opts.deferSave)) { save(); emit('marker-add'); }
    return m.id;
  }
  function updateMarker(id, fields){
    const m = DB.markers.find(x => x.id === id);
    if (!m) return false;
    if ('x' in fields) m.x = +fields.x;
    if ('y' in fields) m.y = +fields.y;
    if ('kind' in fields && MARKER_KINDS.includes(fields.kind)) m.kind = fields.kind;
    if ('name' in fields){ const n = String(fields.name || '').trim(); if (n) m.name = n; else delete m.name; }
    if ('hidden' in fields){ if (fields.hidden) m.hidden = true; else delete m.hidden; }
    save(); emit('marker-update');
    return true;
  }
  function deleteMarker(id){
    const i = DB.markers.findIndex(x => x.id === id);
    if (i < 0) return false;
    DB.markers.splice(i, 1);
    save(); emit('marker-delete');
    return true;
  }
  function listMarkers(){ return DB.markers; }
  function markersInBbox(bbox){
    if (!bbox) return DB.markers.slice();
    return DB.markers.filter(m => m.x >= bbox.minX && m.x <= bbox.maxX && m.y >= bbox.minY && m.y <= bbox.maxY);
  }

  function clearAll(){
    DB = { v: SCHEMA, strokes: [], markers: [] };
    try { localStorage.removeItem(LS_KEY); } catch(_){}
    emit('clear-all');
  }
  // Remove procedurally generated items (optionally limited to one parent).
  function clearGenerated(parentKey){
    const keep = it => !(it.gen && (!parentKey || it.parent === parentKey));
    const before = DB.strokes.length + DB.markers.length;
    DB.strokes = DB.strokes.filter(keep);
    DB.markers = DB.markers.filter(keep);
    save(); emit('clear-generated');
    return before - (DB.strokes.length + DB.markers.length);
  }
  function flush(){ save(); emit('flush'); }

  // Player-safe view: everything not flagged hidden. Phase-2 publish uses this.
  function exportSafe(){
    return {
      v: DB.v,
      strokes: DB.strokes.filter(s => !s.hidden),
      markers: DB.markers.filter(m => !m.hidden),
    };
  }

  window.GWAnnotations = {
    STROKE_KINDS, MARKER_KINDS,
    addStroke, updateStroke, deleteStroke, listStrokes, strokesInBbox,
    addMarker, updateMarker, deleteMarker, listMarkers, markersInBbox,
    clearAll, clearGenerated, flush, save, exportSafe,
  };
  try { console.log('[gw-annotations] v0.4.0 loaded', { strokes: DB.strokes.length, markers: DB.markers.length }); } catch(_){}
})();
