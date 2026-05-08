// gcc-edge-flags.js v0.1.0 — 2026-05-03
// Persistent storage for the parent-hex flag set used by the Edges
// scanner workflow. Each entry pins a parent (col, row) to a list
// of mode ids (e.g. ['coast'], or later ['coast', 'forest']) telling
// the scanner which classifiers to run on that parent. Coast is
// the only mode flagable in slice 3; slices 5–6 add Forest, River,
// Jungle which write to the same store as additional mode tags.
//
// Storage shape (localStorage key 'gcc-edge-flags'):
//   { "col,row": { col, row, modes: ["coast", "forest"] }, … }
// Tiny — typical Greyhawk authoring will have ~30–50 entries
// across the whole map. No Firestore mirror in v1; a per-user
// device-local list is fine, since this is authoring scaffolding,
// not gameplay state.
//
// Save-error pattern matches gcc-subhex-data.js v2.6.0 / gcc-fog.js
// v0.3.0: every save dispatches `gcc-storage-error` with { key,
// error } on quota / serialization failure rather than silently
// swallowing.
//
// Events:
//   - 'gcc-edge-flags-changed' { detail: { reason, col?, row?, modeId? } }
//     Fired after every successful state change. Listeners (the
//     Edges panel, the SVG dot overlay) repaint on this.

(function(){
  'use strict';

  const KEY = 'gcc-edge-flags';
  // In-memory canonical state. Loaded once at script-eval time.
  // Never read from localStorage past load — all reads hit FLAGS.
  let FLAGS = {};
  load();

  function _id(col, row){ return `${col},${row}`; }

  function _reportStorageError(e){
    try { console.error(`[EdgeFlags] save failed for "${KEY}":`, e); } catch(_){}
    try {
      window.dispatchEvent(new CustomEvent('gcc-storage-error', {
        detail: { key: KEY, error: e },
      }));
    } catch(_){}
  }

  function load(){
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw){ FLAGS = {}; return; }
      const parsed = JSON.parse(raw);
      // Normalize: drop entries with no modes; coerce modes to a
      // unique-string array. Tolerates older shapes that may carry
      // a single string instead of an array.
      const out = {};
      for (const id of Object.keys(parsed || {})){
        const e = parsed[id];
        if (!e || typeof e.col !== 'number' || typeof e.row !== 'number') continue;
        const modes = Array.isArray(e.modes) ? e.modes
                    : (typeof e.modes === 'string' ? [e.modes] : []);
        const uniq = Array.from(new Set(modes.filter(m => typeof m === 'string' && m)));
        if (uniq.length === 0) continue;
        out[_id(e.col, e.row)] = { col: e.col, row: e.row, modes: uniq };
      }
      FLAGS = out;
    } catch(e){
      console.error(`[EdgeFlags] load failed:`, e);
      FLAGS = {};
    }
  }

  function save(){
    try {
      localStorage.setItem(KEY, JSON.stringify(FLAGS));
    } catch(e){
      _reportStorageError(e);
    }
  }

  function _emit(reason, extra){
    try {
      window.dispatchEvent(new CustomEvent('gcc-edge-flags-changed', {
        detail: Object.assign({ reason }, extra || {}),
      }));
    } catch(_){}
  }

  // ── Public surface ─────────────────────────────────────────────────

  // All flagged parents as an array. Cheap; backed by a plain object.
  function getAll(){
    const out = [];
    for (const id of Object.keys(FLAGS)){
      const e = FLAGS[id];
      out.push({ col: e.col, row: e.row, modes: e.modes.slice() });
    }
    return out;
  }

  // Modes flagged on a single parent. Returns an empty array for
  // unflagged parents (never null, simplifies caller code).
  function getModes(col, row){
    const e = FLAGS[_id(col, row)];
    return e ? e.modes.slice() : [];
  }

  // True iff the parent carries the given mode flag.
  function hasFlag(col, row, modeId){
    const e = FLAGS[_id(col, row)];
    return !!(e && e.modes.indexOf(modeId) >= 0);
  }

  // All parents flagged for a specific mode. Used by Run-scans to
  // build the per-mode work queue.
  function parentsForMode(modeId){
    const out = [];
    for (const id of Object.keys(FLAGS)){
      const e = FLAGS[id];
      if (e.modes.indexOf(modeId) >= 0) out.push({ col: e.col, row: e.row });
    }
    return out;
  }

  // Counts. Returns { total, byMode: { coast: N, … } }.
  function count(){
    let total = 0;
    const byMode = {};
    for (const id of Object.keys(FLAGS)){
      total++;
      for (const m of FLAGS[id].modes){
        byMode[m] = (byMode[m] || 0) + 1;
      }
    }
    return { total, byMode };
  }

  // Add a flag. No-op if already present. Returns true if state
  // changed (i.e. wasn't already set), false otherwise.
  function addFlag(col, row, modeId){
    if (typeof modeId !== 'string' || !modeId) return false;
    const id = _id(col, row);
    let e = FLAGS[id];
    if (!e){
      FLAGS[id] = { col, row, modes: [modeId] };
      save();
      _emit('add', { col, row, modeId });
      return true;
    }
    if (e.modes.indexOf(modeId) >= 0) return false;
    e.modes.push(modeId);
    save();
    _emit('add', { col, row, modeId });
    return true;
  }

  // Remove a flag. Empties the entry's modes → drops the whole
  // entry. Returns true if state changed.
  function removeFlag(col, row, modeId){
    const id = _id(col, row);
    const e = FLAGS[id];
    if (!e) return false;
    const i = e.modes.indexOf(modeId);
    if (i < 0) return false;
    e.modes.splice(i, 1);
    if (e.modes.length === 0) delete FLAGS[id];
    save();
    _emit('remove', { col, row, modeId });
    return true;
  }

  // Toggle: add if missing, remove if present. Returns the new
  // boolean state of the flag for this parent+mode pair.
  function toggleFlag(col, row, modeId){
    if (hasFlag(col, row, modeId)){
      removeFlag(col, row, modeId);
      return false;
    }
    addFlag(col, row, modeId);
    return true;
  }

  // Drop all flags. Used by the panel's "Clear flags" button.
  function clearAll(){
    if (Object.keys(FLAGS).length === 0) return false;
    FLAGS = {};
    save();
    _emit('clear', {});
    return true;
  }

  window.GCCEdgeFlags = {
    getAll, getModes, hasFlag, parentsForMode, count,
    addFlag, removeFlag, toggleFlag, clearAll,
    // Test hooks — Node test stubs localStorage and re-loads.
    _reload: load,
    _STORAGE_KEY: KEY,
  };
})();
