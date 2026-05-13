// gcc-map-subhex-palette.js v1.4.1 — 2026-05-13
// v1.4.1 — Undo no longer leaves cells dirty. captureBefore now also
//          snapshots peekOverride(Q, R) as `raw`. onUndoClick calls
//          GCCSubhexData.restoreOverride which writes the pre-stroke
//          entry back via the no-dirty-stamp path, including the
//          original _dirtyAt / _publishedAt. Three cases handled:
//            raw === null  → cell was procedural; clearSubhex.
//            raw has _dirtyAt → was authored-dirty; restore dirty.
//            raw no _dirtyAt → was authored-clean (published);
//                              restore clean, badge decrements.
//          Removes the "Known limitation" called out in v1.3.0.
// v1.4.0 — Path tool "Extend from: head | tail" segmented toggle
//          in the path callout pane. Selecting 'head' re-arms with
//          extendEnd:'head' on the armed payload; the renderer
//          (gcc-map-subhex-renderer v1.5.0) dispatches clicks to
//          prependCell/truncateAfter instead of appendCell/
//          truncateBefore. Mode label reflects current end. New
//          getExtendEnd() export for the renderer's marker-click
//          re-arm at line 882. Replaces the reverse-edit-reverse
//          round-trip GMs were doing to author the head end.
// v1.3.1 — 2026-05-12
// v1.3.1 — syncDetailPanel sets sxw-source-{authored|canonical|
//          procedural} state class on the .sxw-source element so
//          gcc-map.css v0.2.5 can style the authored state with a
//          bold red treatment while leaving the other states tan.
//          Text content unchanged.
// v1.3.0 — 2026-05-10
// v1.3.0 — Slice 5b followup — generic paint undo. ↶ Undo button in
// the tools-row next to Clear. Stack of up to 20 strokes; one stroke
// = one mousedown→mouseup cycle (drag = N cells, click = 1 cell).
// Captures pre-mutation terrain/feature/regionId/lakeId via
// captureBefore (called from the renderer at the top of paintCell).
// Path tool's own ↶ Undo and fog's deferred-save are unaffected —
// neither participates in this stroke-based undo.
// v1.2.0 — Slice 5b2 — openRiverEditDialog: tier picker + headwaters/
// mouth linkage form. Replaces the flashMode stub on the Tier·Linkage
// (sxw-path-edit) button. Crossing menu lives renderer-side (5b2
// renderer changes ship in v1.3.0).
// v1.1.0 — Slice 5b1 — full authoring UI:
//   - Region / Path / Lake tool buttons + callout pickers
//   - Path section with action grid (Undo / Rename / Tier·Linkage /
//     Reverse / Delete / Done)  [Tier·Linkage = River edit dialog,
//     stubbed in 5b1 — toast only; full dialog lands in Slice 5b2]
//   - Detail panel (Name, Notes, Region, Hosts, Feature notes,
//     Landmark pin, More fields, Source provenance)
//   - New-lake dialog (GCCDialog.confirm based)
//   - Persistence on field blur (persistFields, persistFeature)
//   - syncDetail / rebuildPathPicker / armPathFromMarker exports for
//     the renderer to call after paintCell mutations
//
// Architecture (carried over from 5a + extended):
//   - The palette and the subhex renderer collaborate via
//     window.GCCMapSubhexRenderer and window.GCCMapSubhexPalette.
//   - The palette owns all UI state (armed picker selection, callout
//     visibility, detail-panel fields). The renderer owns brushing
//     state (rs.armed, rs.brushing, rs.markerHighlight).
//   - Shell selection (subhex Q/R) is the source of truth for which
//     cell the detail panel reflects. ctx.selection() reads it; the
//     palette listens for the shell's selection-changed lifecycle by
//     (a) running syncDetailPanel on mount, (b) accepting
//     syncDetail() calls from the renderer after paintCell, and
//     (c) polling ctx.selection() each animation frame to catch shell
//     selection changes (cell clicks). The poll is cheap (~one
//     string-compare per frame, only while subhex scale is mounted).

(function(){
  'use strict';
  if (!window.GCCMap || typeof window.GCCMap.registerTool !== 'function'){
    console.error('[subhex-palette] GCCMap.registerTool missing — load gcc-map.js v0.2.3+ first');
    return;
  }

  let _container = null;
  let _ctx = null;
  let _onFogChanged = null;
  let _flashTimer = null;
  let _selectionWatchId = null;
  let _lastSelKey = null;
  // Paint-undo state: stack of strokes (each stroke = array of
  // {key, Q, R, before}). _currentStroke is the open one being built
  // during a brush. MAX_UNDO caps the stack; older strokes drop off
  // the bottom. Cleared on unmount (scale switch resets the stack).
  const MAX_UNDO = 20;
  let _undoStack = [];
  let _currentStroke = null;
  // Path-tool "Extend from" mode. 'tail' (default) = appendCell /
  // truncateBefore behavior (legacy). 'head' = prependCell /
  // truncateAfter — extend or trim the front of the path without
  // a Reverse round-trip. Re-armed onto the path payload so the
  // renderer's click handler can dispatch correctly.
  let _extendEnd = 'tail';

  function R(){ return window.GCCMapSubhexRenderer; }
  function D(){ return window.GCCSubhexData; }
  function P(){ return window.GCCSubhexPaths; }
  function selSubhex(){
    if (!_ctx) return null;
    const sel = _ctx.selection();
    return (sel && sel.kind === 'subhex') ? sel : null;
  }
  function findEl(id){ return _container ? _container.querySelector('#' + id) : null; }
  function escapeHtml(s){
    return String(s).replace(/[&<>"]/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[ch]));
  }

  // ── Arm key serialization (matches legacy gcc-subhex-view.js) ──
  function armKey(a){
    if (!a) return null;
    if (a.type === 'erase') return 'erase:';
    if (a.type === 'feature-erase') return 'feature-erase:';
    if (a.type === 'fog') return 'fog:';
    if (a.type === 'region-erase') return 'region-erase:';
    if (a.type === 'lake-erase') return 'lake-erase:';
    return `${a.type}:${a.value}`;
  }

  function armPalette(next){
    const R_ = R();
    if (!R_) return;
    const cur = armKey(R_.getArmed());
    const nxt = armKey(next);
    R_.setArmed(cur === nxt ? null : next);
    if (R_.getArmed()){
      // Arming via the swatch/glyph strip closes any open callout. The
      // tool buttons (Region/Path/Lake/Fog) drive their own callout
      // visibility via their click handlers.
      showCalloutPane(null);
    }
    syncPaletteUI();
    syncModeLabel();
  }

  function syncPaletteUI(){
    if (!_container) return;
    const R_ = R();
    const cur = R_ ? armKey(R_.getArmed()) : null;
    _container.querySelectorAll('.sxw-swatch, .sxw-feature-btn').forEach(b => {
      b.classList.toggle('armed', b.dataset.armKey === cur);
    });
    // Tool-button armed class is driven by showCalloutPane(name); the
    // path-section header + action button visibility comes from
    // syncPathActionButtons. Both are called from each handler that
    // changes armed state, so syncPaletteUI itself only needs to
    // toggle the swatch/glyph .armed flags.
  }

  function syncModeLabel(){
    if (!_container) return;
    const el = _container.querySelector('.sxw-mode');
    if (!el) return;
    const R_ = R();
    const a = R_ ? R_.getArmed() : null;
    el.classList.toggle('sxw-mode-armed', !!a);
    if (!a){
      el.textContent = 'Mode: Select';
    } else if (a.type === 'erase'){
      el.textContent = 'Mode: Erase override · drag to brush';
    } else if (a.type === 'feature-erase'){
      el.textContent = 'Mode: Clear feature · click cells';
    } else if (a.type === 'feature'){
      el.textContent = `Mode: Place feature · ${a.value} · drag to brush`;
    } else if (a.type === 'region'){
      const region = D() ? D().getRegion(a.value) : null;
      el.textContent = `Mode: Assign to region · ${region ? region.name : '(unknown)'} · drag to brush`;
    } else if (a.type === 'region-erase'){
      el.textContent = 'Mode: Remove from region · click cells';
    } else if (a.type === 'lake'){
      const lake = D() ? D().getLake(a.value) : null;
      el.textContent = `Mode: Assign to lake · ${lake ? lake.name : '(unknown)'} · drag to brush`;
    } else if (a.type === 'lake-erase'){
      el.textContent = 'Mode: Remove from lake · click cells';
    } else if (a.type === 'fog'){
      el.textContent = 'Mode: Fog brush · click to reveal · shift+click to hide · drag to sweep';
    } else if (a.type === 'path'){
      const path = P() ? P().getPath(a.value) : null;
      const pname = path ? path.name : '(unknown)';
      const len = path ? path.cells.length : 0;
      const end = a.extendEnd === 'head' ? 'head' : 'tail';
      el.textContent = `Mode: Extend path · ${pname} · ${len} cell${len === 1 ? '' : 's'} · from ${end} · click neighbor to extend, click own cell to truncate`;
    } else {
      const lbl = (window.TERRAIN && window.TERRAIN[a.value])
        ? (window.TERRAIN[a.value].label || a.value) : a.value;
      el.textContent = `Mode: Paint · ${lbl} · drag to brush`;
    }
  }

  function flashMode(msg){
    if (!_container) return;
    const el = _container.querySelector('.sxw-mode');
    if (!el) return;
    if (_flashTimer) clearTimeout(_flashTimer);
    el.textContent = `Mode: ${msg}`;
    el.classList.add('sxw-mode-flash');
    _flashTimer = setTimeout(() => {
      el.classList.remove('sxw-mode-flash');
      syncModeLabel();
      _flashTimer = null;
    }, 1600);
  }

  // ── Callout pane visibility ────────────────────────────────────
  function showCalloutPane(name){
    if (!_container) return;
    const cont = _container.querySelector('.sxw-tool-callout');
    if (cont) cont.style.display = name ? '' : 'none';
    const panes = ['region', 'path', 'lake', 'fog'];
    for (const p of panes){
      const el = _container.querySelector(`[data-callout="${p}"]`);
      if (el) el.style.display = (p === name) ? '' : 'none';
    }
    const tools = ['region', 'path', 'lake', 'fog'];
    for (const t of tools){
      const btn = _container.querySelector(`[data-tool="${t}"]`);
      if (btn) btn.classList.toggle('armed', t === name);
    }
  }

  // ── Strip builders (terrain + feature) ─────────────────────────
  function buildTerrainStrip(host){
    if (typeof window.TERRAIN === 'undefined') return;
    const order = [
      'clear','plains','forest','hardwood','conifer','jungle',
      'hills','forest_hills','mountains','desert','barrens','swamp',
      'water_fresh','water_inland_sea','water_coastal','water_shallow','water_deep',
    ];
    for (const t of order){
      const meta = window.TERRAIN[t];
      if (!meta) continue;
      const b = document.createElement('button');
      b.className = 'sxw-swatch';
      b.dataset.armKey = `terrain:${t}`;
      b.title = meta.label || t;
      b.style.background = `rgb(${meta.rgb})`;
      b.addEventListener('click', () => armPalette({ type: 'terrain', value: t }));
      host.appendChild(b);
    }
    const erase = document.createElement('button');
    erase.className = 'sxw-swatch sxw-swatch-erase';
    erase.dataset.armKey = 'erase:';
    erase.title = 'Erase override (revert to seed)';
    erase.textContent = '⌫';
    erase.addEventListener('click', () => armPalette({ type: 'erase' }));
    host.appendChild(erase);
  }

  function buildFeatureStrip(host){
    if (!window.GCCSubhexIcons) return;
    const NS = 'http://www.w3.org/2000/svg';
    for (const kind of window.GCCSubhexIcons.FEATURE_KINDS){
      const b = document.createElement('button');
      b.className = 'sxw-feature-btn';
      b.dataset.armKey = `feature:${kind}`;
      b.title = `Place feature: ${kind}`;
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '20');
      svg.setAttribute('height', '20');
      window.GCCSubhexIcons.appendFeature(svg, kind, 12, 12, 14);
      b.appendChild(svg);
      b.addEventListener('click', () => armPalette({ type: 'feature', value: kind }));
      host.appendChild(b);
    }
    const clearBtn = document.createElement('button');
    clearBtn.className = 'sxw-feature-btn sxw-feature-btn-clear';
    clearBtn.dataset.armKey = 'feature-erase:';
    clearBtn.title = 'Clear feature on click';
    clearBtn.textContent = '⌫';
    clearBtn.addEventListener('click', () => armPalette({ type: 'feature-erase' }));
    host.appendChild(clearBtn);
  }

  // ── Region tool ─────────────────────────────────────────────────
  function onRegionToolClick(){
    const R_ = R(); if (!R_) return;
    const a = R_.getArmed();
    if (a && (a.type === 'region' || a.type === 'region-erase')){
      R_.setArmed(null);
      showRegionArmedPicker(false);
      syncPaletteUI();
      syncModeLabel();
      return;
    }
    rebuildRegionArmedPicker();
    showRegionArmedPicker(true);
  }
  function showRegionArmedPicker(visible, presetValue){
    const sel = findEl('sxw-region-armed');
    if (!sel) return;
    if (visible){
      sel.style.display = '';
      showCalloutPane('region');
      if (presetValue !== undefined){ sel.value = presetValue; }
      else if (!sel.value){
        const regions = D() ? D().listRegions() : [];
        if (regions.length){ sel.value = regions[0].id; }
      }
    } else {
      sel.style.display = 'none';
      showCalloutPane(null);
    }
  }
  function rebuildRegionArmedPicker(){
    const sel = findEl('sxw-region-armed');
    if (!sel || !D()) return;
    const prev = sel.value;
    sel.innerHTML = '';
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '— pick a region to assign —';
    sel.appendChild(noneOpt);
    for (const r of D().listRegions()){
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = `${r.name} (${r.terrain})`;
      sel.appendChild(opt);
    }
    const eraseOpt = document.createElement('option');
    eraseOpt.value = '__erase__';
    eraseOpt.textContent = '⌫ Remove from region (click cells)';
    sel.appendChild(eraseOpt);
    const newOpt = document.createElement('option');
    newOpt.value = '__new__';
    newOpt.textContent = '+ New region from selected cell\'s terrain…';
    sel.appendChild(newOpt);
    if (prev) sel.value = prev;
  }
  function onRegionArmedChange(ev){
    const R_ = R(); if (!R_) return;
    const val = ev.target.value;
    const sel = selSubhex();
    if (val === '__erase__'){
      R_.setArmed({ type: 'region-erase' });
    } else if (val === '__new__'){
      if (!sel){
        if (typeof alert === 'function') alert('Select a cell first to use its terrain for the new region.');
        ev.target.value = '';
        return;
      }
      const pTerrain = R_.selectedParentTerrain();
      const sub = D().getSubhex(sel.Q, sel.R, pTerrain);
      if (!sub || !sub.terrain){ ev.target.value = ''; return; }
      const name = (typeof prompt === 'function') ? prompt('New region name:') : null;
      if (!name){ ev.target.value = ''; return; }
      const region = D().createRegion(name, sub.terrain);
      if (region){
        D().assignCellToRegion(sel.Q, sel.R, region.id, pTerrain);
        R_.applyCellPaint(sel.Q, sel.R);
        rebuildRegionArmedPicker();
        ev.target.value = region.id;
        R_.setArmed({ type: 'region', value: region.id });
      } else {
        ev.target.value = '';
        return;
      }
    } else if (val){
      R_.setArmed({ type: 'region', value: val });
    } else {
      R_.setArmed(null);
    }
    syncDetailPanel();
    syncPaletteUI();
    syncModeLabel();
  }

  // ── Path tool ──────────────────────────────────────────────────
  function onPathToolClick(){
    const R_ = R(); if (!R_) return;
    const a = R_.getArmed();
    if (a && a.type === 'path'){
      R_.setArmed(null);
      R_.setMarkerHighlight(null);
      showPathArmedPicker(false);
      syncPaletteUI();
      syncModeLabel();
      syncPathActionButtons();
      return;
    }
    rebuildPathArmedPicker();
    showPathArmedPicker(true);
    syncPathActionButtons();
  }
  function showPathArmedPicker(visible, presetValue){
    showCalloutPane(visible ? 'path' : null);
    const sel = findEl('sxw-path-armed');
    if (sel){
      sel.style.display = visible ? '' : 'none';
      if (visible && presetValue !== undefined){
        sel.value = presetValue;
      }
    }
    syncPathActionButtons();
  }
  function rebuildPathArmedPicker(){
    const sel = findEl('sxw-path-armed');
    if (!sel || !P()) return;
    const prev = sel.value;
    sel.innerHTML = '';
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '— pick a path to extend —';
    sel.appendChild(noneOpt);
    const paths = P().listPaths();
    const KIND_LABEL = { river: 'Rivers', road: 'Roads', trail: 'Trails' };
    for (const kind of P().PATH_KINDS){
      const ofKind = paths.filter(p => p.kind === kind);
      if (!ofKind.length) continue;
      const grp = document.createElement('optgroup');
      grp.label = KIND_LABEL[kind] || kind;
      for (const p of ofKind){
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.cells.length} cells)`;
        grp.appendChild(opt);
      }
      sel.appendChild(grp);
    }
    const createGrp = document.createElement('optgroup');
    createGrp.label = '── Create new ──';
    for (const kind of P().PATH_KINDS){
      const opt = document.createElement('option');
      opt.value = `__new__:${kind}`;
      opt.textContent = `+ New ${kind}…`;
      createGrp.appendChild(opt);
    }
    sel.appendChild(createGrp);
    if (prev) sel.value = prev;
  }
  function onPathArmedChange(ev){
    const R_ = R(); if (!R_) return;
    const val = ev.target.value;
    if (val.startsWith('__new__:')){
      const kind = val.slice('__new__:'.length);
      const name = (typeof prompt === 'function') ? prompt(`New ${kind} name:`) : null;
      if (!name){ ev.target.value = ''; return; }
      const existing = P().findByKindName(kind, name);
      if (existing){
        flashMode(`"${existing.name}" already exists — armed for extension instead of creating a new ${kind}`);
        rebuildPathArmedPicker();
        ev.target.value = existing.id;
        R_.setArmed({ type: 'path', value: existing.id, extendEnd: _extendEnd });
        R_.setMarkerHighlight(null);
      } else {
        const path = P().createPath(kind, name);
        if (!path){ ev.target.value = ''; return; }
        rebuildPathArmedPicker();
        ev.target.value = path.id;
        R_.setArmed({ type: 'path', value: path.id, extendEnd: _extendEnd });
        R_.setMarkerHighlight(null);
      }
    } else if (val){
      // Switched to a different path. The legacy attempted to preserve
      // the marker highlight when the new path's kind+name matched the
      // highlighted segment; in practice GMs always either follow the
      // marker or pick a fresh path. Clear unconditionally.
      R_.setArmed({ type: 'path', value: val, extendEnd: _extendEnd });
      R_.setMarkerHighlight(null);
    } else {
      R_.setArmed(null);
      R_.setMarkerHighlight(null);
    }
    syncDetailPanel();
    syncPaletteUI();
    syncModeLabel();
    syncPathActionButtons();
  }
  function syncPathActionButtons(){
    const R_ = R(); const a = R_ ? R_.getArmed() : null;
    const armed = !!(a && a.type === 'path');
    const ids = ['sxw-path-undo', 'sxw-path-rename', 'sxw-path-delete', 'sxw-path-done'];
    for (const id of ids){
      const el = findEl(id);
      if (el) el.style.display = armed ? '' : 'none';
    }
    let isRiver = false;
    if (armed){
      const path = P() && P().getPath(a.value);
      isRiver = !!(path && path.kind === 'river');
    }
    for (const id of ['sxw-path-edit', 'sxw-path-reverse']){
      const el = findEl(id);
      if (el) el.style.display = (armed && isRiver) ? '' : 'none';
    }
    const help = findEl('sxw-path-help');
    if (help) help.style.display = armed ? '' : 'none';
    const head = findEl('sxw-path-section-head');
    if (head){
      if (armed){
        const path = P() && P().getPath(a.value);
        if (path){
          const meta = `${path.kind} · ${path.cells.length} cell${path.cells.length === 1 ? '' : 's'}`;
          head.innerHTML = `PATH · ${escapeHtml(path.name)} <span class="sxw-section-meta">(${meta})</span>`;
          head.style.display = '';
        } else {
          head.textContent = 'PATH';
          head.style.display = '';
        }
      } else {
        head.textContent = 'PATH';
        head.style.display = 'none';
      }
    }
    const section = findEl('sxw-path-section');
    if (section) section.style.display = armed ? '' : 'none';
  }
  function onPathUndoClick(){
    const R_ = R(); const a = R_ ? R_.getArmed() : null;
    if (!a || a.type !== 'path' || !P()) return;
    const ok = P().popCell(a.value);
    if (!ok){ flashMode('Path is empty — nothing to undo'); return; }
    rebuildPathArmedPicker();
    const sel = findEl('sxw-path-armed');
    if (sel) sel.value = a.value;
    if (_ctx) _ctx.requestRender();
    syncModeLabel();
    syncPathActionButtons();
  }
  function onPathRenameClick(){
    const R_ = R(); const a = R_ ? R_.getArmed() : null;
    if (!a || a.type !== 'path' || !P()) return;
    const path = P().getPath(a.value);
    if (!path) return;
    const name = (typeof prompt === 'function') ? prompt('Rename path:', path.name) : null;
    if (!name) return;
    P().renamePath(a.value, name);
    rebuildPathArmedPicker();
    const sel = findEl('sxw-path-armed');
    if (sel) sel.value = a.value;
    if (_ctx) _ctx.requestRender();
    syncModeLabel();
    syncPathActionButtons();
  }
  function onPathReverseClick(){
    const R_ = R(); const a = R_ ? R_.getArmed() : null;
    if (!a || a.type !== 'path' || !P()) return;
    const path = P().getPath(a.value);
    if (!path || path.kind !== 'river') return;
    const ok = (typeof confirm === 'function')
      ? confirm(`Reverse flow direction of "${path.name}"? Headwaters and mouth will swap.`)
      : true;
    if (!ok) return;
    P().reverseCells(a.value);
    if (_ctx) _ctx.requestRender();
    syncModeLabel();
    syncPathActionButtons();
    flashMode(`Reversed flow of ${path.name}`);
  }
  // Segmented toggle: which end of the path do click-extends and
  // click-truncates act on? Defaults to 'tail' (legacy behavior).
  // Updates _extendEnd, refreshes button .active state, and re-arms
  // with the new end so the renderer's click handler dispatches to
  // prependCell/truncateAfter or appendCell/truncateBefore.
  function onExtendEndClick(ev){
    const btn = ev.currentTarget;
    const end = btn.dataset.end === 'head' ? 'head' : 'tail';
    if (end === _extendEnd) return;
    _extendEnd = end;
    if (_container){
      _container.querySelectorAll('.sxw-path-end-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.end === _extendEnd);
      });
    }
    const R_ = R(); const a = R_ ? R_.getArmed() : null;
    if (a && a.type === 'path' && R_){
      R_.setArmed(Object.assign({}, a, { extendEnd: _extendEnd }));
    }
    syncModeLabel();
  }
  function onPathEditClick(){
    const R_ = R(); const a = R_ ? R_.getArmed() : null;
    if (!a || a.type !== 'path' || !P()) return;
    const path = P().getPath(a.value);
    if (!path || path.kind !== 'river') return;
    openRiverEditDialog(path);
  }

  // River edit dialog. Three editable groups: tier, headwaters,
  // mouth. Direction is read-only here — use the ↻ Reverse button on
  // the action row to flip it. On Save, only changed fields fire
  // their writers.
  //
  // Linkage shape per gcc-subhex-paths v3: { lakeId } | { pathId } | null.
  // Slice 6b shows all lakes and all rivers (other than self) without
  // adjacency filtering — a future slice will warn on non-adjacent
  // picks.
  function openRiverEditDialog(path){
    const dlg = window.GCCDialog || window.MPDialog;
    if (!dlg || typeof dlg.confirm !== 'function'){
      if (typeof alert === 'function') alert('Dialog system not available');
      return;
    }
    const lakes = D() ? D().listLakes() : [];
    const allPaths = P() ? P().listPaths() : [];
    const otherRivers = allPaths.filter(p => p.kind === 'river' && p.id !== path.id);
    const lakeOpts = lakes.map(l =>
      `<option value="${escapeHtml(l.id)}">${escapeHtml(l.name)} (${escapeHtml(l.kind)} · ${escapeHtml(l.depth)})</option>`
    ).join('');
    const riverOpts = otherRivers.map(r =>
      `<option value="${escapeHtml(r.id)}">${escapeHtml(r.name)}${r.tier ? ' (' + escapeHtml(r.tier) + ')' : ''}</option>`
    ).join('');
    const tierVal = path.tier || '';
    const tierOpt = (v, label) =>
      `<option value="${v}"${tierVal === v ? ' selected' : ''}>${label}</option>`;
    const linkKind = (lk) => {
      if (!lk) return 'none';
      if (lk.lakeId) return 'lake';
      if (lk.pathId) return 'path';
      return 'none';
    };
    const linkVal = (lk) => {
      if (!lk) return '';
      return lk.lakeId || lk.pathId || '';
    };
    const hKind = linkKind(path.headwaters);
    const mKind = linkKind(path.mouth);
    const hVal  = linkVal(path.headwaters);
    const mVal  = linkVal(path.mouth);
    const first = path.cells[0];
    const last  = path.cells[path.cells.length - 1];
    const dirReadout = (path.cells.length >= 2)
      ? `headwaters cell (${first.Q},${first.R}) → mouth cell (${last.Q},${last.R})`
      : (path.cells.length === 1 ? `single cell (${first.Q},${first.R})` : 'no cells authored');
    const linkBlock = (id, kind, val, label) => ''
      + `<fieldset style="border:1px solid #c0a070;background:#faf8f2;padding:6px 8px;margin:0 0 8px 0">`
      +   `<legend style="font-size:11px;font-weight:700;color:#8b0000;padding:0 4px">${label}</legend>`
      +   `<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">`
      +     `<label style="font-size:11px;font-weight:700">Kind:</label>`
      +     `<select id="sxw-river-${id}-kind" style="padding:3px">`
      +       `<option value="none"${kind === 'none' ? ' selected' : ''}>— none (unset) —</option>`
      +       `<option value="lake"${kind === 'lake' ? ' selected' : ''}>lake</option>`
      +       `<option value="path"${kind === 'path' ? ' selected' : ''}>river (tributary)</option>`
      +     `</select>`
      +   `</div>`
      +   `<div id="sxw-river-${id}-lake-row" style="display:${kind === 'lake' ? 'flex' : 'none'};gap:8px;align-items:center;margin-bottom:4px">`
      +     `<label style="font-size:11px;font-weight:700;min-width:40px">Lake:</label>`
      +     `<select id="sxw-river-${id}-lake" style="flex:1;padding:3px">`
      +       `<option value="">— pick a lake —</option>` + lakeOpts
      +     `</select>`
      +   `</div>`
      +   `<div id="sxw-river-${id}-path-row" style="display:${kind === 'path' ? 'flex' : 'none'};gap:8px;align-items:center;margin-bottom:4px">`
      +     `<label style="font-size:11px;font-weight:700;min-width:40px">River:</label>`
      +     `<select id="sxw-river-${id}-path" style="flex:1;padding:3px">`
      +       `<option value="">— pick a river —</option>` + riverOpts
      +     `</select>`
      +   `</div>`
      + `</fieldset>`;
    const html = ''
      + '<div class="sxw-river-form" style="text-align:left;">'
      +   `<div style="font-size:11px;color:#666;margin-bottom:8px">Editing: <strong>${escapeHtml(path.name)}</strong></div>`
      +   '<fieldset style="border:1px solid #c0a070;background:#faf8f2;padding:6px 8px;margin:0 0 8px 0">'
      +     '<legend style="font-size:11px;font-weight:700;color:#8b0000;padding:0 4px">Tier</legend>'
      +     '<select id="sxw-river-tier" style="width:100%;padding:4px">'
      +       tierOpt('',            '— unset —')
      +       tierOpt('stream',      'stream — small, fordable, low movement cost')
      +       tierOpt('river',       'river — standard, requires bridge/ferry')
      +       tierOpt('great_river', 'great river — major waterway, high movement cost')
      +     '</select>'
      +   '</fieldset>'
      +   '<fieldset style="border:1px solid #c0a070;background:#faf8f2;padding:6px 8px;margin:0 0 8px 0">'
      +     '<legend style="font-size:11px;font-weight:700;color:#8b0000;padding:0 4px">Direction</legend>'
      +     `<div style="font-size:11px;color:#444">${escapeHtml(dirReadout)}</div>`
      +     '<div style="font-size:10px;color:#888;margin-top:3px">Use the ↻ Reverse button on the action row to swap headwaters and mouth.</div>'
      +   '</fieldset>'
      +   linkBlock('headwaters', hKind, hVal, 'Headwaters (source)')
      +   linkBlock('mouth',      mKind, mVal, 'Mouth (terminus)')
      + '</div>';
    function wireKindToggle(id, initialVal){
      const kindEl  = document.getElementById('sxw-river-' + id + '-kind');
      const lakeRow = document.getElementById('sxw-river-' + id + '-lake-row');
      const pathRow = document.getElementById('sxw-river-' + id + '-path-row');
      const lakeEl  = document.getElementById('sxw-river-' + id + '-lake');
      const pathEl  = document.getElementById('sxw-river-' + id + '-path');
      if (!kindEl) return;
      if (initialVal){
        if (kindEl.value === 'lake' && lakeEl) lakeEl.value = initialVal;
        if (kindEl.value === 'path' && pathEl) pathEl.value = initialVal;
      }
      kindEl.addEventListener('change', () => {
        const k = kindEl.value;
        if (lakeRow) lakeRow.style.display = (k === 'lake') ? 'flex' : 'none';
        if (pathRow) pathRow.style.display = (k === 'path') ? 'flex' : 'none';
      });
    }
    dlg.confirm('Edit River', html, { okText: 'Save', cancelText: 'Cancel' }).then(ok => {
      if (!ok) return;
      const fresh = P() ? P().getPath(path.id) : null;
      if (!fresh) return;
      const tierEl = document.getElementById('sxw-river-tier');
      const newTier = tierEl ? (tierEl.value || null) : (fresh.tier || null);
      if ((fresh.tier || null) !== (newTier || null)){
        P().setPathTier(fresh.id, newTier);
      }
      const readLink = (id) => {
        const kEl = document.getElementById('sxw-river-' + id + '-kind');
        const k = kEl ? kEl.value : 'none';
        if (k === 'lake'){
          const v = document.getElementById('sxw-river-' + id + '-lake');
          const val = v ? v.value : '';
          return val ? { lakeId: val } : null;
        }
        if (k === 'path'){
          const v = document.getElementById('sxw-river-' + id + '-path');
          const val = v ? v.value : '';
          return val ? { pathId: val } : null;
        }
        return null;
      };
      const linkEq = (a, b) => {
        const aId = a ? (a.lakeId || a.pathId || '') : '';
        const bId = b ? (b.lakeId || b.pathId || '') : '';
        return aId === bId;
      };
      const newH = readLink('headwaters');
      const newM = readLink('mouth');
      if (!linkEq(fresh.headwaters, newH)) P().setPathHeadwaters(fresh.id, newH);
      if (!linkEq(fresh.mouth,      newM)) P().setPathMouth(fresh.id, newM);
      if (_ctx) _ctx.requestRender();
      syncModeLabel();
      syncPathActionButtons();
      flashMode(`Saved ${fresh.name}`);
    });
    // Wire kind→row visibility toggles after the dialog body is in
    // the DOM. GCCDialog.confirm mounts synchronously; a microtask
    // defer is sufficient.
    Promise.resolve().then(() => {
      wireKindToggle('headwaters', hVal);
      wireKindToggle('mouth', mVal);
    });
  }
  function onPathDeleteClick(){
    const R_ = R(); const a = R_ ? R_.getArmed() : null;
    if (!a || a.type !== 'path' || !P()) return;
    const path = P().getPath(a.value);
    if (!path) return;
    const ok = (typeof confirm === 'function')
      ? confirm(`Delete path "${path.name}" (${path.kind})? This cannot be undone.`)
      : true;
    if (!ok) return;
    P().deletePath(a.value);
    R_.setArmed(null);
    R_.setMarkerHighlight(null);
    rebuildPathArmedPicker();
    showPathArmedPicker(false);
    const sel = findEl('sxw-path-armed');
    if (sel) sel.value = '';
    if (_ctx) _ctx.requestRender();
    syncDetailPanel();
    syncPaletteUI();
    syncModeLabel();
    syncPathActionButtons();
  }
  function onPathDoneClick(){
    const R_ = R(); const a = R_ ? R_.getArmed() : null;
    if (!a || a.type !== 'path') return;
    R_.setArmed(null);
    R_.setMarkerHighlight(null);
    showPathArmedPicker(false);
    const sel = findEl('sxw-path-armed');
    if (sel) sel.value = '';
    if (_ctx) _ctx.requestRender();
    syncPaletteUI();
    syncModeLabel();
    syncPathActionButtons();
  }

  // Called by the renderer's onParentPathMarkerClick after it sets
  // rs.armed + rs.markerHighlight. We align the palette UI (rebuild
  // picker, show callout, sync labels). The renderer already
  // triggered a render via _ctx.requestRender().
  function armPathFromMarker(pathId){
    rebuildPathArmedPicker();
    showPathArmedPicker(true, pathId);
    showRegionArmedPicker(false);
    syncDetailPanel();
    syncPaletteUI();
    syncModeLabel();
    syncPathActionButtons();
  }

  // Called by the renderer after paintCell append/truncate so the
  // picker's cell-count label refreshes.
  function rebuildPathPicker(armedValue){
    rebuildPathArmedPicker();
    const sel = findEl('sxw-path-armed');
    if (sel && armedValue) sel.value = armedValue;
    syncPathActionButtons();
  }

  // ── Lake tool ──────────────────────────────────────────────────
  function onLakeToolClick(){
    const R_ = R(); if (!R_) return;
    const a = R_.getArmed();
    if (a && (a.type === 'lake' || a.type === 'lake-erase')){
      R_.setArmed(null);
      showLakeArmedPicker(false);
      syncPaletteUI();
      syncModeLabel();
      return;
    }
    rebuildLakeArmedPicker();
    showLakeArmedPicker(true);
  }
  function showLakeArmedPicker(visible, presetValue){
    const sel = findEl('sxw-lake-armed');
    if (!sel) return;
    if (visible){
      sel.style.display = '';
      showCalloutPane('lake');
      if (presetValue !== undefined){ sel.value = presetValue; }
      else if (!sel.value){
        const lakes = D() ? D().listLakes() : [];
        if (lakes.length){ sel.value = lakes[0].id; }
      }
    } else {
      sel.style.display = 'none';
      showCalloutPane(null);
    }
  }
  function rebuildLakeArmedPicker(){
    const sel = findEl('sxw-lake-armed');
    if (!sel || !D()) return;
    const prev = sel.value;
    sel.innerHTML = '';
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '— pick a lake to assign —';
    sel.appendChild(noneOpt);
    for (const l of D().listLakes()){
      const opt = document.createElement('option');
      opt.value = l.id;
      opt.textContent = `${l.name} (${l.kind} · ${l.depth})`;
      sel.appendChild(opt);
    }
    const eraseOpt = document.createElement('option');
    eraseOpt.value = '__erase__';
    eraseOpt.textContent = '⌫ Remove from lake (click cells)';
    sel.appendChild(eraseOpt);
    const newOpt = document.createElement('option');
    newOpt.value = '__new__';
    newOpt.textContent = '+ New lake…';
    sel.appendChild(newOpt);
    if (prev) sel.value = prev;
  }
  function onLakeArmedChange(ev){
    const R_ = R(); if (!R_) return;
    const val = ev.target.value;
    if (val === '__erase__'){
      R_.setArmed({ type: 'lake-erase' });
    } else if (val === '__new__'){
      ev.target.value = '';
      openNewLakeDialog();
      return;
    } else if (val){
      R_.setArmed({ type: 'lake', value: val });
    } else {
      R_.setArmed(null);
    }
    syncDetailPanel();
    syncPaletteUI();
    syncModeLabel();
  }
  function openNewLakeDialog(){
    const dlg = window.GCCDialog || window.MPDialog;
    if (!dlg || typeof dlg.confirm !== 'function'){
      if (typeof alert === 'function') alert('Dialog system not available');
      return;
    }
    const regions = D() ? D().listRegions() : [];
    const regOpts = ['<option value="">— none —</option>']
      .concat(regions.map(r =>
        `<option value="${escapeHtml(r.id)}">${escapeHtml(r.name)} (${escapeHtml(r.terrain)})</option>`
      )).join('');
    const html = ''
      + '<div class="sxw-lake-form" style="text-align:left;">'
      +   '<div style="margin-bottom:8px">'
      +     '<label style="display:block;font-size:11px;font-weight:700;margin-bottom:2px">Name</label>'
      +     '<input id="sxw-lake-form-name" type="text" style="width:100%;padding:4px" placeholder="Lake Quagflow">'
      +   '</div>'
      +   '<div style="margin-bottom:8px;display:flex;gap:8px">'
      +     '<div style="flex:1">'
      +       '<label style="display:block;font-size:11px;font-weight:700;margin-bottom:2px">Kind</label>'
      +       '<select id="sxw-lake-form-kind" style="width:100%;padding:4px">'
      +         '<option value="lake">lake</option>'
      +         '<option value="sea">sea</option>'
      +       '</select>'
      +     '</div>'
      +     '<div style="flex:1">'
      +       '<label style="display:block;font-size:11px;font-weight:700;margin-bottom:2px">Depth</label>'
      +       '<select id="sxw-lake-form-depth" style="width:100%;padding:4px">'
      +         '<option value="shallow">shallow</option>'
      +         '<option value="deep">deep</option>'
      +       '</select>'
      +     '</div>'
      +   '</div>'
      +   '<div style="margin-bottom:8px">'
      +     '<label style="display:block;font-size:11px;font-weight:700;margin-bottom:2px">Region (optional)</label>'
      +     '<select id="sxw-lake-form-region" style="width:100%;padding:4px">' + regOpts + '</select>'
      +   '</div>'
      +   '<div>'
      +     '<label style="display:block;font-size:11px;font-weight:700;margin-bottom:2px">Notes</label>'
      +     '<textarea id="sxw-lake-form-notes" style="width:100%;min-height:60px;padding:4px" placeholder="optional"></textarea>'
      +   '</div>'
      + '</div>';
    dlg.confirm('New Lake', html, { okText: 'Create', cancelText: 'Cancel' }).then(ok => {
      if (!ok) return;
      const nameEl  = document.getElementById('sxw-lake-form-name');
      const kindEl  = document.getElementById('sxw-lake-form-kind');
      const depthEl = document.getElementById('sxw-lake-form-depth');
      const regEl   = document.getElementById('sxw-lake-form-region');
      const notesEl = document.getElementById('sxw-lake-form-notes');
      const name  = (nameEl?.value || '').trim();
      const kind  = kindEl?.value || 'lake';
      const depth = depthEl?.value || 'shallow';
      const regionId = regEl?.value || null;
      const notes = notesEl?.value || '';
      if (!name){
        if (dlg.alert) dlg.alert('New Lake', 'Name is required.');
        return;
      }
      const lake = D() ? D().createLake(name, kind, depth, regionId, notes) : null;
      if (!lake){
        if (dlg.alert) dlg.alert('New Lake', 'Could not create lake. Check name/kind/depth.');
        return;
      }
      rebuildLakeArmedPicker();
      const sel = findEl('sxw-lake-armed');
      if (sel) sel.value = lake.id;
      const R_ = R();
      if (R_) R_.setArmed({ type: 'lake', value: lake.id });
      syncDetailPanel();
      syncPaletteUI();
      syncModeLabel();
    });
  }

  // ── Fog tool ───────────────────────────────────────────────────
  function onFogToolClick(){
    const R_ = R(); if (!R_) return;
    const a = R_.getArmed();
    if (a && a.type === 'fog'){
      R_.setArmed(null);
      showCalloutPane(null);
      syncPaletteUI();
      syncModeLabel();
      return;
    }
    R_.setArmed({ type: 'fog' });
    showCalloutPane('fog');
    syncPaletteUI();
    syncModeLabel();
  }
  function onFogPreviewClick(){
    if (window.GCCFog && typeof window.GCCFog.togglePreview === 'function'){
      window.GCCFog.togglePreview();
    }
  }
  function syncFogPreviewBtn(){
    if (!_container) return;
    const btn = _container.querySelector('[data-action="fog-preview"]');
    if (!btn) return;
    const on = !!(window.GCCFog && typeof window.GCCFog.isPreview === 'function' && window.GCCFog.isPreview());
    btn.classList.toggle('sxw-tool-btn-armed', on);
  }

  // ── Clear (single-cell revert) ─────────────────────────────────
  function onClearClick(){
    const s = selSubhex();
    if (!s || !D()) return;
    D().clearSubhex(s.Q, s.R);
    const R_ = R();
    if (R_ && typeof R_.applyCellPaint === 'function') R_.applyCellPaint(s.Q, s.R);
    syncDetailPanel();
  }

  // ── Paint undo ─────────────────────────────────────────────────
  // beginStroke / captureBefore / endStroke are called from the
  // renderer (paintCell + brush handlers). The renderer guards the
  // calls — path and fog branches don't participate.
  //
  // captureBefore is dedup'd per stroke: only the FIRST mutation of
  // each cell within a stroke records its pre-state. Drag-paints that
  // hit the same cell multiple times still produce one undo entry per
  // cell (correctly restoring to the pre-stroke state, not the
  // pre-last-paint state).
  //
  // v1.4.1 fix: also snapshot the raw OVERRIDES entry (peekOverride)
  // at capture time. Undo uses this raw entry to restore the exact
  // pre-stroke state including _dirtyAt / _publishedAt, so undoing
  // a paint on a procedural cell brings the dirty count back to its
  // pre-stroke value (no stray dirty entry left behind).
  function beginStroke(){
    _currentStroke = [];
  }
  function captureBefore(Q, R, before){
    if (!_currentStroke){
      // No open stroke (e.g. paintCell called outside a brush cycle —
      // shouldn't happen but be defensive). Start one on the fly.
      _currentStroke = [];
    }
    const key = `${Q}_${R}`;
    if (_currentStroke.some(e => e.key === key)) return;
    // Snapshot the raw override entry (or null if procedural). Deep
    // clone so subsequent in-place mutations of OVERRIDES don't leak
    // back into the undo entry.
    const D_ = D();
    const rawLive = D_ && typeof D_.peekOverride === 'function' ? D_.peekOverride(Q, R) : null;
    const raw = rawLive ? JSON.parse(JSON.stringify(rawLive)) : null;
    _currentStroke.push({ key, Q, R, before, raw });
  }
  function endStroke(){
    if (_currentStroke && _currentStroke.length){
      _undoStack.push(_currentStroke);
      if (_undoStack.length > MAX_UNDO) _undoStack.shift();
      syncUndoButton();
    }
    _currentStroke = null;
  }
  function onUndoClick(){
    const stroke = _undoStack.pop();
    if (!stroke){
      flashMode('Nothing to undo');
      syncUndoButton();
      return;
    }
    for (const e of stroke){
      restoreCellState(e.Q, e.R, e.raw);
    }
    if (_ctx) _ctx.requestRender();
    syncDetailPanel();
    syncUndoButton();
    const n = stroke.length;
    flashMode(`Undid ${n} cell${n === 1 ? '' : 's'}`);
  }
  function restoreCellState(Q, R, raw){
    const D_ = D();
    if (!D_) return;
    // Single-call restore via the data layer. Handles all three cases
    // (procedural / authored-dirty / authored-clean) and bypasses
    // dirty-stamping so undo doesn't leave a stray _dirtyAt behind.
    // See gcc-subhex-data.js v2.12.0 restoreOverride.
    if (typeof D_.restoreOverride === 'function'){
      D_.restoreOverride(Q, R, raw);
    }
    // Re-render the cell to reflect the restored state.
    const rend = window.GCCMapSubhexRenderer;
    if (rend && typeof rend.applyCellPaint === 'function') rend.applyCellPaint(Q, R);
  }
  function syncUndoButton(){
    if (!_container) return;
    const btn = _container.querySelector('[data-action="undo"]');
    if (!btn) return;
    const n = _undoStack.length;
    btn.disabled = n === 0;
    btn.title = n === 0
      ? 'Undo last paint stroke (nothing to undo)'
      : `Undo last paint stroke (${n} stroke${n === 1 ? '' : 's'} on the stack)`;
  }

  // ── Detail panel ───────────────────────────────────────────────
  function syncDetailPanel(){
    if (!_container) return;
    const coord  = findEl('sxw-coord');
    const terr   = findEl('sxw-terrain');
    const ownerSep = findEl('sxw-owner-sep');
    const ownerEl  = findEl('sxw-owner');
    const name   = findEl('sxw-name');
    const notes  = findEl('sxw-notes');
    const fkind  = findEl('sxw-feature-kind');
    const fname  = findEl('sxw-feature-name');
    const flib   = findEl('sxw-feature-libid');
    const fnotes = findEl('sxw-feature-notes');
    const lpick  = findEl('sxw-landmark-pick');
    const linfoR = findEl('sxw-landmark-info-row');
    const linfo  = findEl('sxw-landmark-info');
    const rpick  = findEl('sxw-region-pick');
    const rname  = findEl('sxw-region-name');
    const plist  = findEl('sxw-paths-list');
    const lakeInfo = findEl('sxw-lake-info');
    const source = findEl('sxw-source');
    const clearB = findEl('sxw-clear');
    if (!coord || !terr || !name || !notes || !fkind || !fname || !flib || !fnotes
        || !rpick || !rname || !source || !clearB) return;
    const sel = selSubhex();
    if (!sel){
      coord.textContent = '— select a cell';
      terr.textContent  = '—';
      if (ownerSep) ownerSep.style.display = 'none';
      if (ownerEl)  ownerEl.style.display  = 'none';
      const detailEl = findEl('sxw-detail');
      if (detailEl) detailEl.classList.add('no-cell');
      name.value = '';   name.disabled  = true;
      notes.value = '';  notes.disabled = true;
      fkind.value = '';  fkind.disabled = true;
      fname.value = '';  fname.disabled = true;
      flib.value  = '';  flib.disabled  = true;
      fnotes.value = ''; fnotes.disabled = true;
      if (lpick){ lpick.value = ''; lpick.disabled = true; }
      if (linfoR) linfoR.style.display = 'none';
      rebuildRegionPickOptions(rpick, '', null);
      rpick.disabled = true;
      rname.value = '';  rname.disabled = true;
      if (plist) plist.textContent = '—';
      if (lakeInfo) lakeInfo.textContent = '—';
      const lakeSep  = findEl('sxw-lake-sep');
      const pathsSep = findEl('sxw-paths-sep');
      if (lakeSep)  lakeSep.style.display  = 'none';
      if (pathsSep) pathsSep.style.display = 'none';
      source.textContent = '';
      clearB.disabled    = true;
      return;
    }
    const R_ = R();
    const pTerrain = R_ ? R_.selectedParentTerrain() : null;
    const sub = D().getSubhex(sel.Q, sel.R, pTerrain);
    const detailEl = findEl('sxw-detail');
    if (detailEl) detailEl.classList.remove('no-cell');
    coord.textContent = `Q${sel.Q}, R${sel.R}`;
    terr.textContent  = sub.terrain
      ? ((window.TERRAIN && window.TERRAIN[sub.terrain] && window.TERRAIN[sub.terrain].label) || sub.terrain)
      : '—';
    const owner = R_ ? R_.selectedCellOwner() : null;
    // Owner hint shows whenever owner data is available. In the
    // unified shell there's no fixed center-parent the way the
    // floating window had; the viewport pans freely. Always-on hint
    // is slightly noisier than legacy but always informative.
    if (owner && typeof window.hexIdStr === 'function'){
      const ownerLabel = window.hexIdStr(owner.col, owner.row);
      if (ownerEl){
        ownerEl.textContent = `Owned by ${ownerLabel}`;
        ownerEl.style.display = '';
      }
      if (ownerSep) ownerSep.style.display = '';
    } else {
      if (ownerEl)  ownerEl.style.display = 'none';
      if (ownerSep) ownerSep.style.display = 'none';
    }
    name.value  = sub.name  || '';  name.disabled  = false;
    notes.value = sub.notes || '';  notes.disabled = false;
    const f = sub.feature || null;
    const isPinned = !!(f && f.landmarkId);
    fkind.value = f ? (f.kind || '') : '';
    fkind.disabled = isPinned;
    fname.value = f ? (f.name || '') : '';
    fname.disabled = !f || isPinned;
    flib.value  = f ? (f.libraryId || '') : '';
    flib.disabled = !f;
    fnotes.value = f ? (f.notes || '') : '';
    fnotes.disabled = !f;
    if (lpick){
      rebuildLandmarkPickOptions(lpick, owner, f && f.landmarkId);
      lpick.disabled = false;
    }
    if (linfoR && linfo){
      if (isPinned && window.GCCLandmarks){
        const lm = window.GCCLandmarks.getById(f.landmarkId);
        if (lm){
          const bits = [];
          bits.push(`${lm.kind || 'landmark'}`);
          if (lm.size) bits.push(lm.size);
          if (lm.pop != null) bits.push(`pop ${lm.pop}`);
          if (lm.rulerName){
            const rt = lm.rulerTitle ? `${lm.rulerTitle} ` : '';
            bits.push(`ruler: ${rt}${lm.rulerName}`);
          } else if (lm.rulerTitle){
            bits.push(`ruler: ${lm.rulerTitle}`);
          }
          linfo.textContent = `${lm.name} · ${bits.join(' · ')} (edit in parent: ${f.landmarkId})`;
          linfoR.style.display = '';
        } else {
          linfo.textContent = `Pin → ${f.landmarkId} (landmark not found)`;
          linfoR.style.display = '';
        }
      } else {
        linfoR.style.display = 'none';
      }
    }
    rebuildRegionPickOptions(rpick, sub.terrain, sub.regionId);
    rpick.disabled = false;
    const region = sub.regionId ? D().getRegion(sub.regionId) : null;
    rname.value = region ? region.name : '';
    rname.disabled = !region;
    if (plist){
      const cellPaths = P() ? P().pathsAtCell(sel.Q, sel.R) : [];
      const hasPaths = cellPaths.length > 0;
      plist.textContent = hasPaths
        ? cellPaths.map(p => `${p.name} (${p.kind})`).join(', ')
        : '—';
      const pathsSep = findEl('sxw-paths-sep');
      if (pathsSep) pathsSep.style.display = hasPaths ? '' : 'none';
      plist.style.display = hasPaths ? '' : 'none';
    }
    if (lakeInfo){
      const lake = sub.lakeId ? D().getLake(sub.lakeId) : null;
      lakeInfo.textContent = lake
        ? `in ${lake.name} (${lake.kind} · ${lake.depth})`
        : '—';
      const lakeSep = findEl('sxw-lake-sep');
      if (lakeSep) lakeSep.style.display = lake ? '' : 'none';
      lakeInfo.style.display = lake ? '' : 'none';
    }
    source.textContent = sub.source === 'authored' ? 'Authored override (localStorage)'
      : sub.source === 'canonical' ? 'Canonical Greyhawk feature'
      : 'Procedural — derived from world seed';
    source.classList.toggle('sxw-source-authored',   sub.source === 'authored');
    source.classList.toggle('sxw-source-canonical',  sub.source === 'canonical');
    source.classList.toggle('sxw-source-procedural', sub.source !== 'authored' && sub.source !== 'canonical');
    clearB.disabled = (sub.source !== 'authored');
  }

  function rebuildRegionPickOptions(sel, terrain, selectedRegionId){
    if (!sel || !D()) return;
    sel.innerHTML = '';
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '— none —';
    sel.appendChild(noneOpt);
    if (terrain){
      const regions = D().listRegions().filter(r => r.terrain === terrain);
      for (const r of regions){
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.name;
        sel.appendChild(opt);
      }
      const newOpt = document.createElement('option');
      newOpt.value = '__new__';
      newOpt.textContent = `+ New ${terrain} region…`;
      sel.appendChild(newOpt);
    }
    sel.value = selectedRegionId || '';
  }
  function rebuildLandmarkPickOptions(sel, owner, selectedLandmarkId){
    if (!sel) return;
    sel.innerHTML = '';
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '— none —';
    sel.appendChild(noneOpt);
    if (!owner || typeof window.GCCLandmarks === 'undefined'
        || typeof window.hexIdStr !== 'function'){
      sel.value = '';
      return;
    }
    const parentId = window.hexIdStr(owner.col, owner.row);
    const lm = window.GCCLandmarks.getById(parentId);
    if (lm){
      const opt = document.createElement('option');
      opt.value = parentId;
      opt.textContent = `${lm.name} (${lm.kind || 'landmark'})`;
      sel.appendChild(opt);
    }
    sel.value = selectedLandmarkId || '';
  }

  function onRegionPickChange(ev){
    const s = selSubhex(); if (!s || !D()) return;
    const val = ev.target.value;
    const R_ = R();
    const pTerrain = R_ ? R_.selectedParentTerrain() : null;
    if (val === '__new__'){
      const sub = D().getSubhex(s.Q, s.R, pTerrain);
      if (!sub || !sub.terrain){
        ev.target.value = (sub && sub.regionId) || '';
        return;
      }
      const name = (typeof prompt === 'function') ? prompt('New region name:') : null;
      if (!name){ ev.target.value = sub.regionId || ''; return; }
      const region = D().createRegion(name, sub.terrain);
      if (region){
        D().assignCellToRegion(s.Q, s.R, region.id, pTerrain);
        if (R_) R_.setArmed({ type: 'region', value: region.id });
        showRegionArmedPicker(true, region.id);
        syncPaletteUI();
        syncModeLabel();
      }
    } else if (val === ''){
      D().unassignCellFromRegion(s.Q, s.R);
    } else {
      D().assignCellToRegion(s.Q, s.R, val, pTerrain);
    }
    if (R_) R_.applyCellPaint(s.Q, s.R);
    if (_ctx) _ctx.requestRender();
    syncDetailPanel();
  }
  function onRegionRename(ev){
    const s = selSubhex(); if (!s || !D()) return;
    const R_ = R();
    const pTerrain = R_ ? R_.selectedParentTerrain() : null;
    const sub = D().getSubhex(s.Q, s.R, pTerrain);
    if (!sub || !sub.regionId) return;
    const newName = ev.target.value.trim();
    if (!newName) return;
    D().renameRegion(sub.regionId, newName);
    if (_ctx) _ctx.requestRender();
    syncDetailPanel();
    rebuildRegionArmedPicker();
  }
  function onLandmarkPickChange(ev){
    const s = selSubhex(); if (!s || !D()) return;
    const val = ev.target.value;
    if (val){
      D().pinLandmarkToCell(s.Q, s.R, val);
    } else {
      const sub = D().getSubhex(s.Q, s.R);
      const prev = sub.feature && sub.feature.landmarkId;
      if (prev) D().unpinLandmark(prev);
    }
    const R_ = R();
    if (R_) R_.applyCellPaint(s.Q, s.R);
    if (_ctx) _ctx.requestRender();
    syncDetailPanel();
  }
  function persistFields(){
    const s = selSubhex(); if (!s || !D()) return;
    const nameEl  = findEl('sxw-name');
    const notesEl = findEl('sxw-notes');
    if (!nameEl || !notesEl) return;
    D().setSubhexOverride(s.Q, s.R, { name: nameEl.value.trim(), notes: notesEl.value });
    const R_ = R();
    if (R_) R_.applyCellPaint(s.Q, s.R);
    syncDetailPanel();
  }
  function persistFeature(){
    const s = selSubhex(); if (!s || !D()) return;
    const kindEl = findEl('sxw-feature-kind');
    if (!kindEl) return;
    const kind = kindEl.value;
    if (!kind){
      D().clearSubhexFeature(s.Q, s.R);
    } else {
      const fnameEl  = findEl('sxw-feature-name');
      const flibEl   = findEl('sxw-feature-libid');
      const fnotesEl = findEl('sxw-feature-notes');
      const fname = fnameEl ? fnameEl.value.trim() : '';
      const flib  = flibEl  ? flibEl.value.trim()  : '';
      const fnotes = fnotesEl ? fnotesEl.value.trim() : '';
      D().setSubhexFeature(s.Q, s.R, {
        kind,
        name: fname || undefined,
        libraryId: flib || undefined,
        notes: fnotes || undefined,
      });
    }
    const R_ = R();
    if (R_) R_.applyCellPaint(s.Q, s.R);
    if (_ctx) _ctx.requestRender();
    syncDetailPanel();
  }

  // ── Selection-change watcher ────────────────────────────────────
  // The shell doesn't emit a selection-changed event. _ctx.selection()
  // reflects live state. Poll on rAF so the detail panel refreshes
  // when the user clicks another cell. Cheap (one obj-deref + string
  // compare per frame, only while subhex scale is mounted).
  function watchSelectionTick(){
    if (!_container) return;
    const s = selSubhex();
    const key = s ? `${s.Q}_${s.R}` : '';
    if (key !== _lastSelKey){
      _lastSelKey = key;
      syncDetailPanel();
    }
    _selectionWatchId = requestAnimationFrame(watchSelectionTick);
  }

  // ── Tool lifecycle (called by GCCMap.setScale) ─────────────────
  function mount(container, ctx){
    _container = container;
    _ctx = ctx;
    container.innerHTML = `
      <div class="sxw-tools-row">
        <button class="sxw-tool-btn" data-tool="region">Region…</button>
        <button class="sxw-tool-btn" data-tool="path">Path…</button>
        <button class="sxw-tool-btn" data-tool="lake">Lake…</button>
        <button class="sxw-tool-btn" data-tool="fog">Fog…</button>
        <button class="sxw-tool-btn" id="sxw-clear" data-action="clear" title="Erase override on the selected cell">Clear</button>
        <button class="sxw-tool-btn" data-action="undo" title="Undo last paint stroke (nothing to undo)" disabled>↶ Undo</button>
        <button class="sxw-tool-btn" data-action="fog-preview" title="Preview as players see (fog of war)">👁 Preview</button>
        <span class="sxw-mode">Mode: Select</span>
      </div>
      <div class="sxw-tool-callout" style="display:none;">
        <div class="sxw-callout-pane" data-callout="region" style="display:none;">
          <span class="sxw-callout-label">Region:</span>
          <select class="sxw-region-armed" id="sxw-region-armed"></select>
        </div>
        <div class="sxw-callout-pane" data-callout="lake" style="display:none;">
          <span class="sxw-callout-label">Lake:</span>
          <select class="sxw-region-armed" id="sxw-lake-armed"></select>
        </div>
        <div class="sxw-callout-pane" data-callout="fog" style="display:none;">
          <div class="sxw-path-help">
            Click to reveal · shift+click to hide · drag to sweep · click 👁 Preview to see fogged cells
          </div>
        </div>
        <div class="sxw-callout-pane" data-callout="path" style="display:none;">
          <div class="sxw-callout-pathrow">
            <span class="sxw-callout-label">Path:</span>
            <select class="sxw-path-armed" id="sxw-path-armed"></select>
          </div>
          <div class="sxw-path-end-row">
            <span class="sxw-callout-label">Extend from:</span>
            <button class="sxw-path-end-btn" data-end="head" title="Extend or trim the head (start) of the path">head</button>
            <button class="sxw-path-end-btn active" data-end="tail" title="Extend or trim the tail (end) of the path">tail</button>
          </div>
          <div class="sxw-path-actions">
            <button class="sxw-tool-btn sxw-path-action" id="sxw-path-undo" title="Remove the last cell of the armed path">↶ Undo</button>
            <button class="sxw-tool-btn sxw-path-action" id="sxw-path-rename" title="Rename the armed path">✎ Rename</button>
            <button class="sxw-tool-btn sxw-path-action" id="sxw-path-edit" title="Edit tier and headwaters/mouth linkage (rivers only)">⚙ Tier/Linkage</button>
            <button class="sxw-tool-btn sxw-path-action" id="sxw-path-reverse" title="Reverse flow direction — swaps headwaters and mouth (rivers only)">↻ Reverse</button>
            <button class="sxw-tool-btn sxw-path-action sxw-tool-btn-danger" id="sxw-path-delete" title="Delete the armed path">⌫ Delete</button>
            <button class="sxw-tool-btn sxw-path-action sxw-tool-btn-armed" id="sxw-path-done" title="Stop editing this path">✓ Done</button>
          </div>
          <div class="sxw-path-help" id="sxw-path-help">
            Click a neighboring cell to extend · click an existing cell to remove it (and everything after)
          </div>
        </div>
      </div>
      <div class="sxw-palette-strip">
        <div class="sxw-palette" data-strip="terrain"></div>
        <div class="sxw-feature-palette" data-strip="feature"></div>
      </div>
      <div class="sxw-path-section" id="sxw-path-section" style="display:none;">
        <div class="sxw-section-head" id="sxw-path-section-head" style="display:none;">PATH</div>
      </div>
      <div class="sxw-detail" id="sxw-detail">
        <div class="sxw-detail-head" id="sxw-detail-head">
          <span class="sxw-detail-label">Cell details</span>
          <span class="sxw-sep" id="sxw-coord-sep">·</span>
          <span class="sxw-readonly" id="sxw-coord">— select a cell</span>
          <span class="sxw-sep" id="sxw-owner-sep" style="display:none;">·</span>
          <span class="sxw-readonly sxw-owner-hint" id="sxw-owner" style="display:none;"></span>
        </div>
        <div class="sxw-detail-summary" id="sxw-detail-summary">
          <span class="sxw-summary-label">Terrain</span>
          <span class="sxw-readonly" id="sxw-terrain">—</span>
          <span class="sxw-sep sxw-summary-sep" id="sxw-lake-sep" style="display:none;">·</span>
          <span class="sxw-readonly" id="sxw-lake-info">—</span>
          <span class="sxw-sep sxw-summary-sep" id="sxw-paths-sep" style="display:none;">·</span>
          <span class="sxw-readonly" id="sxw-paths-list">—</span>
        </div>
        <div class="sxw-detail-body" id="sxw-detail-body">
          <div class="sxw-row sxw-row-inline">
            <label>Name</label>
            <input type="text" id="sxw-name" placeholder="(unnamed)" disabled>
          </div>
          <div class="sxw-row sxw-row-inline">
            <label>Notes</label>
            <textarea id="sxw-notes" placeholder="GM notes" disabled></textarea>
          </div>
          <div class="sxw-row sxw-row-inline sxw-row-region">
            <label>Region</label>
            <select id="sxw-region-pick" disabled>
              <option value="">— none —</option>
            </select>
            <input type="text" id="sxw-region-name" placeholder="Region name" disabled>
          </div>
          <div class="sxw-row sxw-row-inline sxw-row-landmark-info" id="sxw-landmark-info-row" style="display:none;">
            <label>Landmark</label>
            <span class="sxw-readonly" id="sxw-landmark-info">—</span>
          </div>
          <details class="sxw-more-fields" id="sxw-more-fields">
            <summary>More fields</summary>
            <div class="sxw-row sxw-row-inline sxw-row-feature">
              <label>Hosts</label>
              <select id="sxw-feature-kind" disabled>
                <option value="">— none —</option>
              </select>
              <input type="text" id="sxw-feature-name" placeholder="Feature name" disabled>
              <input type="text" id="sxw-feature-libid" placeholder="Library ID" disabled>
            </div>
            <div class="sxw-row sxw-row-inline sxw-row-feature-notes">
              <label>Feature notes</label>
              <textarea id="sxw-feature-notes" placeholder="Notes for this feature (toll, condition, lore…)" disabled></textarea>
            </div>
            <div class="sxw-row sxw-row-inline sxw-row-landmark">
              <label>Landmark pin</label>
              <select id="sxw-landmark-pick" disabled>
                <option value="">— none —</option>
              </select>
            </div>
          </details>
          <div class="sxw-source" id="sxw-source"></div>
        </div>
      </div>
    `;
    // Populate the detail-panel Hosts <select> with all feature kinds
    // (separate from the feature-palette icon strip above).
    const fkindSel = findEl('sxw-feature-kind');
    if (fkindSel && window.GCCSubhexIcons){
      for (const k of window.GCCSubhexIcons.FEATURE_KINDS){
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = k;
        fkindSel.appendChild(opt);
      }
    }
    // Tool buttons
    container.querySelector('[data-tool="region"]').addEventListener('click', onRegionToolClick);
    container.querySelector('[data-tool="path"]').addEventListener('click', onPathToolClick);
    container.querySelector('[data-tool="lake"]').addEventListener('click', onLakeToolClick);
    container.querySelector('[data-tool="fog"]').addEventListener('click', onFogToolClick);
    container.querySelector('[data-action="clear"]').addEventListener('click', onClearClick);
    container.querySelector('[data-action="undo"]').addEventListener('click', onUndoClick);
    container.querySelector('[data-action="fog-preview"]').addEventListener('click', onFogPreviewClick);
    // Armed pickers
    findEl('sxw-region-armed').addEventListener('change', onRegionArmedChange);
    findEl('sxw-path-armed').addEventListener('change', onPathArmedChange);
    findEl('sxw-lake-armed').addEventListener('change', onLakeArmedChange);
    // Path action buttons
    findEl('sxw-path-undo').addEventListener('click', onPathUndoClick);
    findEl('sxw-path-rename').addEventListener('click', onPathRenameClick);
    findEl('sxw-path-edit').addEventListener('click', onPathEditClick);
    findEl('sxw-path-reverse').addEventListener('click', onPathReverseClick);
    findEl('sxw-path-delete').addEventListener('click', onPathDeleteClick);
    findEl('sxw-path-done').addEventListener('click', onPathDoneClick);
    // Extend-from toggle (segmented head|tail)
    container.querySelectorAll('.sxw-path-end-btn').forEach(btn => {
      btn.addEventListener('click', onExtendEndClick);
    });
    // Detail-panel persistence
    findEl('sxw-name').addEventListener('blur', persistFields);
    findEl('sxw-notes').addEventListener('blur', persistFields);
    findEl('sxw-feature-kind').addEventListener('change', persistFeature);
    findEl('sxw-feature-name').addEventListener('blur', persistFeature);
    findEl('sxw-feature-libid').addEventListener('blur', persistFeature);
    findEl('sxw-feature-notes').addEventListener('blur', persistFeature);
    findEl('sxw-landmark-pick').addEventListener('change', onLandmarkPickChange);
    findEl('sxw-region-pick').addEventListener('change', onRegionPickChange);
    findEl('sxw-region-name').addEventListener('blur', onRegionRename);
    // Palette strips
    buildTerrainStrip(container.querySelector('[data-strip="terrain"]'));
    buildFeatureStrip(container.querySelector('[data-strip="feature"]'));
    _onFogChanged = () => { syncFogPreviewBtn(); };
    window.addEventListener('gcc-fog-changed', _onFogChanged);
    syncFogPreviewBtn();
    syncPaletteUI();
    syncModeLabel();
    syncDetailPanel();
    syncPathActionButtons();
    syncUndoButton();
    _lastSelKey = null;
    _selectionWatchId = requestAnimationFrame(watchSelectionTick);
  }

  function unmount(){
    if (_onFogChanged){
      window.removeEventListener('gcc-fog-changed', _onFogChanged);
      _onFogChanged = null;
    }
    if (_flashTimer){
      clearTimeout(_flashTimer);
      _flashTimer = null;
    }
    if (_selectionWatchId){
      cancelAnimationFrame(_selectionWatchId);
      _selectionWatchId = null;
    }
    _undoStack = [];
    _currentStroke = null;
    const R_ = R();
    if (R_) R_.setArmed(null);
    if (_container) _container.innerHTML = '';
    _container = null;
    _ctx = null;
  }

  window.GCCMap.registerTool({
    scale: 'subhex',
    name: 'subhex-palette',
    label: 'Subhex Palette',
    mount,
    unmount,
  });

  // Exposed for the renderer (paintCell, onParentPathMarkerClick) to
  // route flashes, picker rebuilds, marker-driven arm flows, and
  // paint-undo capture back to the palette UI.
  window.GCCMapSubhexPalette = {
    arm: armPalette,
    flash: flashMode,
    sync(){ syncPaletteUI(); syncModeLabel(); },
    syncDetail: syncDetailPanel,
    rebuildPathPicker,
    armPathFromMarker,
    beginStroke,
    captureBefore,
    endStroke,
    getExtendEnd(){ return _extendEnd; },
  };
})();
