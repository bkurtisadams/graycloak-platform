// gcc-fog.js v0.3.0 — 2026-05-03
// v0.3.0: surface save errors. Previously the save() catch was empty
// — quota errors silently dropped, in-memory revealed-Set state could
// diverge from localStorage. Now logs to console.error and dispatches
// `gcc-storage-error` event. Matches gcc-subhex-data.js v2.6.0.
// v0.2.0: preview-mode flag + shouldFog helpers for renderer use.
// Preview is a UI pref (whether the GM is currently viewing the map
// "as players see it"), persisted in its own localStorage key
// (gcc-fog-preview) — not per-map; one switch covers all maps.
// shouldFogSubhex(Q,R) / shouldFogParent(col,row) return true iff the
// grain is fogged AND preview is on AND the cell is unrevealed.
//
// v0.1.0 — 2026-05-02
// Fog-of-war substrate. Storage + API only; no rendering, no UI, no
// auto-reveal wiring. Downstream (render overlay, paint brush, party
// auto-reveal, Lost engine) reads from this module.
//
// ── Data model ─────────────────────────────────────────────────────────────
// Two independent sparse Sets per map:
//   revealedParents  — keys `${col},${row}`     (Darlene offset coords)
//   revealedSubhexes — keys `${Q},${R}`          (global axial; may be neg.)
//
// Per-map config { mapId, parentFog, subhexFog }:
//   Greyhawk      → { parentFog: false, subhexFog: true }   (Darlene public)
//   Gamma World   → { parentFog: true,  subhexFog: true }   (both fogged)
// A flag of `false` means the substrate ignores writes/queries for that
// grain and treats every cell as revealed (no fog).
//
// ── Storage ────────────────────────────────────────────────────────────────
// localStorage key: `gcc-fog-${mapId}` → { schemaVersion, parents:[...],
// subhexes:[...] }. Sets are serialized as plain string arrays.
// Not currently in GCCSync.SIMPLE_KEYS — local only, like subhex overrides.
//
// ── Bulk writes ────────────────────────────────────────────────────────────
// Single-cell ops (revealSubhex, hideParent, …) save immediately.
// Bulk ops (revealSubhexes, revealSubhexRadius, revealAllInParent, …)
// accept opts.deferSave; pair with flush() to save once. Mirrors the
// pattern in gcc-subhex-data.js v2.5.0.
//
// ── Events ─────────────────────────────────────────────────────────────────
// Dispatches `gcc-fog-changed` on window after every save (single or
// flushed). Renderers subscribe and rerender.

(function(){
  'use strict';

  const SCHEMA_VERSION = 1;
  const DEFAULT_CONFIG = {
    mapId: 'default',
    parentFog: true,
    subhexFog: true,
  };
  const LS_PREVIEW_KEY = 'gcc-fog-preview';

  let CONFIG = Object.assign({}, DEFAULT_CONFIG);
  let LS_KEY = `gcc-fog-${CONFIG.mapId}`;

  let revealedParents  = new Set();
  let revealedSubhexes = new Set();

  let previewMode = false;
  try {
    previewMode = localStorage.getItem(LS_PREVIEW_KEY) === '1';
  } catch(e){}

  function lsKeyFor(mapId){ return `gcc-fog-${mapId}`; }

  function load(){
    revealedParents  = new Set();
    revealedSubhexes = new Set();
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return;
      if (Array.isArray(data.parents))  data.parents.forEach(k => revealedParents.add(String(k)));
      if (Array.isArray(data.subhexes)) data.subhexes.forEach(k => revealedSubhexes.add(String(k)));
    } catch(e){
      revealedParents = new Set();
      revealedSubhexes = new Set();
    }
  }

  function save(){
    try {
      const payload = {
        schemaVersion: SCHEMA_VERSION,
        mapId: CONFIG.mapId,
        parents:  Array.from(revealedParents),
        subhexes: Array.from(revealedSubhexes),
      };
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch(e){
      console.error(`[GCCFog] save failed for "${LS_KEY}":`, e.name, '—', e.message);
      try {
        window.dispatchEvent(new CustomEvent('gcc-storage-error', {
          detail: { key: LS_KEY, error: e.name, message: e.message },
        }));
      } catch(_){}
    }
    try { window.dispatchEvent(new CustomEvent('gcc-fog-changed')); } catch(e){}
  }

  function flush(){ save(); }

  // ── Config ─────────────────────────────────────────────────────────────

  function init(opts){
    const next = Object.assign({}, DEFAULT_CONFIG, opts || {});
    CONFIG = {
      mapId:     String(next.mapId || 'default'),
      parentFog: !!next.parentFog,
      subhexFog: !!next.subhexFog,
    };
    LS_KEY = lsKeyFor(CONFIG.mapId);
    load();
  }

  function setConfig(patch){
    if (!patch) return;
    if ('parentFog' in patch) CONFIG.parentFog = !!patch.parentFog;
    if ('subhexFog' in patch) CONFIG.subhexFog = !!patch.subhexFog;
    if ('mapId' in patch && String(patch.mapId) !== CONFIG.mapId){
      CONFIG.mapId = String(patch.mapId);
      LS_KEY = lsKeyFor(CONFIG.mapId);
      load();
    }
    try { window.dispatchEvent(new CustomEvent('gcc-fog-changed')); } catch(e){}
  }

  function config(){ return Object.assign({}, CONFIG); }

  // ── Preview mode (UI pref) ─────────────────────────────────────────────

  function isPreview(){ return previewMode; }

  function setPreview(on){
    const next = !!on;
    if (next === previewMode) return false;
    previewMode = next;
    try { localStorage.setItem(LS_PREVIEW_KEY, previewMode ? '1' : '0'); } catch(e){}
    try { window.dispatchEvent(new CustomEvent('gcc-fog-changed')); } catch(e){}
    return true;
  }

  function togglePreview(){ setPreview(!previewMode); return previewMode; }

  // shouldFog* — convenience for renderers. true iff the grain is fogged
  // by config AND the GM is in preview mode AND the cell is unrevealed.
  function shouldFogSubhex(Q, R){
    if (!CONFIG.subhexFog) return false;
    if (!previewMode) return false;
    return !revealedSubhexes.has(subhexKey(Q, R));
  }
  function shouldFogParent(col, row){
    if (!CONFIG.parentFog) return false;
    if (!previewMode) return false;
    return !revealedParents.has(parentKey(col, row));
  }

  // ── Keys ───────────────────────────────────────────────────────────────

  function parentKey(col, row){ return `${col|0},${row|0}`; }
  function subhexKey(Q, R){ return `${Q|0},${R|0}`; }
  function parseParentKey(k){
    const m = /^(-?\d+),(-?\d+)$/.exec(String(k));
    return m ? { col: +m[1], row: +m[2] } : null;
  }
  function parseSubhexKey(k){
    const m = /^(-?\d+),(-?\d+)$/.exec(String(k));
    return m ? { Q: +m[1], R: +m[2] } : null;
  }

  // ── Subhex queries / writes ────────────────────────────────────────────

  function isSubhexRevealed(Q, R){
    if (!CONFIG.subhexFog) return true;
    return revealedSubhexes.has(subhexKey(Q, R));
  }

  function revealSubhex(Q, R, opts){
    if (!CONFIG.subhexFog) return false;
    const k = subhexKey(Q, R);
    if (revealedSubhexes.has(k)) return false;
    revealedSubhexes.add(k);
    if (!opts || !opts.deferSave) save();
    return true;
  }

  function hideSubhex(Q, R, opts){
    if (!CONFIG.subhexFog) return false;
    const k = subhexKey(Q, R);
    if (!revealedSubhexes.has(k)) return false;
    revealedSubhexes.delete(k);
    if (!opts || !opts.deferSave) save();
    return true;
  }

  function revealSubhexes(list, opts){
    if (!CONFIG.subhexFog || !Array.isArray(list)) return 0;
    let n = 0;
    for (const c of list){
      if (!c) continue;
      const k = subhexKey(c.Q, c.R);
      if (!revealedSubhexes.has(k)){ revealedSubhexes.add(k); n++; }
    }
    if (n && (!opts || !opts.deferSave)) save();
    return n;
  }

  function hideSubhexes(list, opts){
    if (!CONFIG.subhexFog || !Array.isArray(list)) return 0;
    let n = 0;
    for (const c of list){
      if (!c) continue;
      const k = subhexKey(c.Q, c.R);
      if (revealedSubhexes.has(k)){ revealedSubhexes.delete(k); n++; }
    }
    if (n && (!opts || !opts.deferSave)) save();
    return n;
  }

  // Hex distance (axial, flat-top): max(|dQ|, |dR|, |dQ+dR|).
  function subhexDistance(Q1, R1, Q2, R2){
    const dQ = Q1 - Q2, dR = R1 - R2;
    return Math.max(Math.abs(dQ), Math.abs(dR), Math.abs(dQ + dR));
  }

  function revealSubhexRadius(Q, R, radius, opts){
    if (!CONFIG.subhexFog) return 0;
    const r = Math.max(0, radius|0);
    let n = 0;
    for (let dQ = -r; dQ <= r; dQ++){
      const rMin = Math.max(-r, -dQ - r);
      const rMax = Math.min( r, -dQ + r);
      for (let dR = rMin; dR <= rMax; dR++){
        const k = subhexKey(Q + dQ, R + dR);
        if (!revealedSubhexes.has(k)){ revealedSubhexes.add(k); n++; }
      }
    }
    if (n && (!opts || !opts.deferSave)) save();
    return n;
  }

  // ── Parent queries / writes ────────────────────────────────────────────

  function isParentRevealed(col, row){
    if (!CONFIG.parentFog) return true;
    return revealedParents.has(parentKey(col, row));
  }

  function revealParent(col, row, opts){
    if (!CONFIG.parentFog) return false;
    const k = parentKey(col, row);
    if (revealedParents.has(k)) return false;
    revealedParents.add(k);
    if (!opts || !opts.deferSave) save();
    return true;
  }

  function hideParent(col, row, opts){
    if (!CONFIG.parentFog) return false;
    const k = parentKey(col, row);
    if (!revealedParents.has(k)) return false;
    revealedParents.delete(k);
    if (!opts || !opts.deferSave) save();
    return true;
  }

  function revealParents(list, opts){
    if (!CONFIG.parentFog || !Array.isArray(list)) return 0;
    let n = 0;
    for (const p of list){
      if (!p) continue;
      const k = parentKey(p.col, p.row);
      if (!revealedParents.has(k)){ revealedParents.add(k); n++; }
    }
    if (n && (!opts || !opts.deferSave)) save();
    return n;
  }

  function hideParents(list, opts){
    if (!CONFIG.parentFog || !Array.isArray(list)) return 0;
    let n = 0;
    for (const p of list){
      if (!p) continue;
      const k = parentKey(p.col, p.row);
      if (revealedParents.has(k)){ revealedParents.delete(k); n++; }
    }
    if (n && (!opts || !opts.deferSave)) save();
    return n;
  }

  // ── Cross-grain helpers ────────────────────────────────────────────────

  // Reveal every subhex owned by the named parent. Uses
  // GCCSubhexData.ownedByParent to enumerate. Defers save by default
  // (caller decides; revealAllInParent is rarely a single-cell op).
  function revealAllInParent(col, row, opts){
    if (!CONFIG.subhexFog) return 0;
    const SD = window.GCCSubhexData;
    if (!SD || !SD.ownedByParent) return 0;
    const cells = SD.ownedByParent(col, row) || [];
    let n = 0;
    for (const c of cells){
      const k = subhexKey(c.Q, c.R);
      if (!revealedSubhexes.has(k)){ revealedSubhexes.add(k); n++; }
    }
    if (n && (!opts || !opts.deferSave)) save();
    return n;
  }

  function hideAllInParent(col, row, opts){
    if (!CONFIG.subhexFog) return 0;
    const SD = window.GCCSubhexData;
    if (!SD || !SD.ownedByParent) return 0;
    const cells = SD.ownedByParent(col, row) || [];
    let n = 0;
    for (const c of cells){
      const k = subhexKey(c.Q, c.R);
      if (revealedSubhexes.has(k)){ revealedSubhexes.delete(k); n++; }
    }
    if (n && (!opts || !opts.deferSave)) save();
    return n;
  }

  // Count of revealed subhexes whose owner is (col, row). Used by render
  // ("any cell revealed → show parent shape") and Lost engine ("are we in
  // mapped territory?").
  function subhexesRevealedInParent(col, row){
    if (!CONFIG.subhexFog) return 0;
    const SD = window.GCCSubhexData;
    if (!SD || !SD.ownedByParent) return 0;
    const cells = SD.ownedByParent(col, row) || [];
    let n = 0;
    for (const c of cells){
      if (revealedSubhexes.has(subhexKey(c.Q, c.R))) n++;
    }
    return n;
  }

  function parentHasAnyRevealedSubhex(col, row){
    return subhexesRevealedInParent(col, row) > 0;
  }

  // ── Bulk admin ─────────────────────────────────────────────────────────

  function hideAll(){
    revealedParents.clear();
    revealedSubhexes.clear();
    save();
  }

  function revealedSubhexCount(){ return revealedSubhexes.size; }
  function revealedParentCount(){ return revealedParents.size; }

  function allRevealedSubhexes(){
    const out = [];
    for (const k of revealedSubhexes){
      const p = parseSubhexKey(k);
      if (p) out.push(p);
    }
    return out;
  }
  function allRevealedParents(){
    const out = [];
    for (const k of revealedParents){
      const p = parseParentKey(k);
      if (p) out.push(p);
    }
    return out;
  }

  // ── Import / export ────────────────────────────────────────────────────

  function exportFog(){
    return {
      schemaVersion: SCHEMA_VERSION,
      mapId: CONFIG.mapId,
      parents:  Array.from(revealedParents),
      subhexes: Array.from(revealedSubhexes),
    };
  }

  // opts.merge=true (default) ORs into current state; merge=false replaces.
  function importFog(data, opts){
    if (!data || typeof data !== 'object') return false;
    const merge = !opts || opts.merge !== false;
    if (!merge){ revealedParents.clear(); revealedSubhexes.clear(); }
    if (Array.isArray(data.parents))  data.parents.forEach(k => revealedParents.add(String(k)));
    if (Array.isArray(data.subhexes)) data.subhexes.forEach(k => revealedSubhexes.add(String(k)));
    save();
    return true;
  }

  // ── Boot ───────────────────────────────────────────────────────────────

  // Load with default config; a host page should call init({mapId,...})
  // at boot to point at the right key. Without init(), substrate runs
  // against `gcc-fog-default` with both grains fogged.
  load();

  window.GCCFog = {
    SCHEMA_VERSION,
    init, setConfig, config,
    isPreview, setPreview, togglePreview,
    shouldFogSubhex, shouldFogParent,
    parentKey, subhexKey, parseParentKey, parseSubhexKey,
    isSubhexRevealed, revealSubhex, hideSubhex,
    revealSubhexes, hideSubhexes, revealSubhexRadius,
    isParentRevealed, revealParent, hideParent,
    revealParents, hideParents,
    revealAllInParent, hideAllInParent,
    subhexesRevealedInParent, parentHasAnyRevealedSubhex,
    subhexDistance,
    hideAll,
    revealedSubhexCount, revealedParentCount,
    allRevealedSubhexes, allRevealedParents,
    exportFog, importFog,
    flush,
  };
})();
