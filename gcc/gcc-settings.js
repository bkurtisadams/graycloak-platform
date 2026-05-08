// gcc-settings.js v0.1.0 — 2026-04-29
// Cross-cutting settings store. Schema-versioned JSON in
// localStorage, key 'gcc-settings'. Live updates via onChange
// subscribers — when a setting changes, callbacks fire so views
// (CSS variables, button visibility, etc.) update without a save
// step. Defaults fall back when key missing or fields absent.
//
// API:
//   GCCSettings.get(path)              — current value, or DEFAULT
//   GCCSettings.set(path, value)       — saves and notifies
//   GCCSettings.onChange(path, cb)     — subscribe; returns unsub fn
//   GCCSettings.openDialog()           — show modal
//   GCCSettings.export() / import(obj) — for future sync work
//
// Path notation is dotted: "display.gridOpacity",
// "display.headerButtons.btn-hex-edit". Paths nest under top-level
// sections so future settings groups don't collide.

(function(){
  const LS_KEY = 'gcc-settings';
  const SCHEMA_VERSION = 1;

  // Defaults — single source of truth. When a setting is missing
  // from the saved object, get() falls back to the value here.
  const DEFAULTS = {
    v: SCHEMA_VERSION,
    display: {
      gridOpacity: 1.0,           // 0–1 multiplier on hex-cell stroke
    },
    header: {
      buttonsVisible: {},          // { 'btn-id': true/false } per button
    },
  };

  let state = loadState();
  const subscribers = new Map();   // path -> Set<callback>

  function loadState(){
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      const obj = JSON.parse(raw);
      // Future migrations would go here. For v1 there's nothing
      // to migrate from.
      if (typeof obj !== 'object' || obj === null){
        return JSON.parse(JSON.stringify(DEFAULTS));
      }
      // Merge with defaults so missing fields don't break gets.
      return mergeDefaults(obj, DEFAULTS);
    } catch (e){
      return JSON.parse(JSON.stringify(DEFAULTS));
    }
  }

  // Recursive merge: copy fields from `defaults` into `obj` if
  // missing. Doesn't overwrite existing values.
  function mergeDefaults(obj, defaults){
    const out = { ...obj };
    for (const k of Object.keys(defaults)){
      if (defaults[k] !== null && typeof defaults[k] === 'object' && !Array.isArray(defaults[k])){
        out[k] = mergeDefaults(out[k] || {}, defaults[k]);
      } else if (out[k] === undefined){
        out[k] = defaults[k];
      }
    }
    return out;
  }

  function saveState(){
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); }
    catch (e){ /* quota / disabled storage — ignore */ }
  }

  // Walk a dotted path, returning the value or undefined if any
  // segment is missing. e.g. ('display.gridOpacity').
  function pathGet(obj, path){
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts){
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[p];
    }
    return cur;
  }

  // Set a dotted path, creating intermediate objects as needed.
  function pathSet(obj, path, value){
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++){
      const p = parts[i];
      if (cur[p] == null || typeof cur[p] !== 'object') cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function get(path){
    const v = pathGet(state, path);
    if (v !== undefined) return v;
    return pathGet(DEFAULTS, path);
  }

  function set(path, value){
    const old = pathGet(state, path);
    if (old === value) return;
    pathSet(state, path, value);
    saveState();
    notify(path, value, old);
  }

  function onChange(path, cb){
    if (!subscribers.has(path)) subscribers.set(path, new Set());
    subscribers.get(path).add(cb);
    return function unsubscribe(){
      const set = subscribers.get(path);
      if (set){ set.delete(cb); if (set.size === 0) subscribers.delete(path); }
    };
  }

  function notify(path, value, old){
    // Notify exact-match subscribers first.
    const exact = subscribers.get(path);
    if (exact){ for (const cb of exact){ try { cb(value, old); } catch(e){} } }
    // Notify ancestor subscribers (path "display" sees changes to
    // "display.gridOpacity"). Walk up the dotted path.
    const parts = path.split('.');
    for (let i = parts.length - 1; i > 0; i--){
      const ancestor = parts.slice(0, i).join('.');
      const subs = subscribers.get(ancestor);
      if (!subs) continue;
      const ancestorVal = get(ancestor);
      for (const cb of subs){ try { cb(ancestorVal, undefined, path); } catch(e){} }
    }
  }

  function exportSettings(){ return JSON.parse(JSON.stringify(state)); }
  function importSettings(obj){
    if (!obj || typeof obj !== 'object') return false;
    state = mergeDefaults(obj, DEFAULTS);
    saveState();
    // Notify all subscribers — settings might have changed
    // wholesale.
    for (const [path] of subscribers){ notify(path, get(path)); }
    return true;
  }

  // ── Dialog ────────────────────────────────────────────────────────────
  // Modal overlay with sections. Built lazily on first openDialog()
  // call; cached afterwards.

  let dialogEl = null;

  function openDialog(){
    if (!dialogEl) dialogEl = buildDialog();
    populateDialog();
    dialogEl.classList.add('open');
  }

  function closeDialog(){
    if (dialogEl) dialogEl.classList.remove('open');
  }

  function buildDialog(){
    const wrap = document.createElement('div');
    wrap.id = 'gcc-settings-dialog';
    wrap.innerHTML = `
      <div class="gcc-set-backdrop"></div>
      <div class="gcc-set-modal">
        <div class="gcc-set-header">
          <h2>⚙ Settings</h2>
          <button class="gcc-set-close" title="Close">✕</button>
        </div>
        <div class="gcc-set-body">
          <div class="gcc-set-section">
            <h3>Display</h3>
            <div class="gcc-set-row">
              <label for="gcc-set-grid-op">Grid opacity</label>
              <input type="range" id="gcc-set-grid-op" min="0" max="100" step="1">
              <span class="gcc-set-val" id="gcc-set-grid-op-val">—</span>
            </div>
          </div>
          <div class="gcc-set-section">
            <h3>Header buttons</h3>
            <p class="gcc-set-hint">Hide buttons from the header bar that you no longer use. Hidden buttons keep their keyboard shortcuts (if any).</p>
            <div id="gcc-set-header-btns"></div>
          </div>
        </div>
        <div class="gcc-set-footer">
          <button class="gcc-set-reset">Reset to defaults</button>
          <button class="gcc-set-done">Done</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    wrap.querySelector('.gcc-set-backdrop').addEventListener('click', closeDialog);
    wrap.querySelector('.gcc-set-close').addEventListener('click', closeDialog);
    wrap.querySelector('.gcc-set-done').addEventListener('click', closeDialog);
    wrap.querySelector('.gcc-set-reset').addEventListener('click', () => {
      if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;
      importSettings(JSON.parse(JSON.stringify(DEFAULTS)));
      populateDialog();
    });

    // Grid opacity slider: live update as the user drags.
    const slider = wrap.querySelector('#gcc-set-grid-op');
    const valEl  = wrap.querySelector('#gcc-set-grid-op-val');
    slider.addEventListener('input', () => {
      const v = +slider.value / 100;
      set('display.gridOpacity', v);
      valEl.textContent = Math.round(v * 100) + '%';
    });

    // Esc to close.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dialogEl?.classList.contains('open')){
        closeDialog();
      }
    });

    return wrap;
  }

  function populateDialog(){
    if (!dialogEl) return;
    // Grid opacity slider state.
    const op = get('display.gridOpacity');
    dialogEl.querySelector('#gcc-set-grid-op').value = Math.round(op * 100);
    dialogEl.querySelector('#gcc-set-grid-op-val').textContent = Math.round(op * 100) + '%';
    // Header buttons: enumerate from the actual header DOM.
    populateHeaderButtonsList();
  }

  function populateHeaderButtonsList(){
    const container = dialogEl.querySelector('#gcc-set-header-btns');
    if (!container) return;
    container.innerHTML = '';
    // Collect candidate buttons: only those marked data-hideable on
    // the topbar. Essential buttons (zoom, panel toggle) intentionally
    // omit the marker so they can't be hidden.
    const bar = document.getElementById('topbar') || document.getElementById('gcc-bar');
    if (!bar){
      container.innerHTML = '<p class="gcc-set-hint">No header buttons found.</p>';
      return;
    }
    const btns = Array.from(bar.querySelectorAll('button[id][data-hideable="true"]'));
    if (btns.length === 0){
      container.innerHTML = '<p class="gcc-set-hint">No hideable header buttons configured.</p>';
      return;
    }
    const visibility = get('header.buttonsVisible') || {};
    for (const btn of btns){
      const id = btn.id;
      // Derive a friendly label: prefer data-label if present, else
      // the button's text (trimmed), else its title attribute, else
      // the id.
      const label = btn.dataset.label
        || (btn.textContent || '').trim()
        || btn.title
        || id;
      const visible = visibility[id] !== false; // default visible
      const row = document.createElement('label');
      row.className = 'gcc-set-checkbox-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = visible;
      cb.addEventListener('change', () => {
        const cur = get('header.buttonsVisible') || {};
        const next = { ...cur, [id]: cb.checked };
        set('header.buttonsVisible', next);
      });
      const txt = document.createElement('span');
      txt.textContent = label;
      row.appendChild(cb);
      row.appendChild(txt);
      container.appendChild(row);
    }
  }

  // ── Live appliers ─────────────────────────────────────────────────────
  // Apply the current settings to the DOM. Called on load and whenever
  // a relevant setting changes.

  function applyGridOpacity(value){
    const v = (value === undefined) ? get('display.gridOpacity') : value;
    document.documentElement.style.setProperty('--grid-opacity', String(v));
  }

  function applyHeaderButtonVisibility(){
    const map = get('header.buttonsVisible') || {};
    for (const [id, visible] of Object.entries(map)){
      const el = document.getElementById(id);
      if (!el) continue;
      el.style.display = visible ? '' : 'none';
    }
  }

  function applyAll(){
    applyGridOpacity();
    applyHeaderButtonVisibility();
  }

  // Hook live updates on init.
  onChange('display.gridOpacity', (v) => applyGridOpacity(v));
  onChange('header.buttonsVisible', () => applyHeaderButtonVisibility());

  // Apply on load. Defer until DOM is parsed (header buttons need to
  // exist); use DOMContentLoaded if document isn't ready yet.
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyAll);
  } else {
    applyAll();
  }

  window.GCCSettings = {
    get, set, onChange,
    openDialog, closeDialog,
    export: exportSettings, import: importSettings,
    SCHEMA_VERSION,
  };
})();
