// gcc-edges.js v0.4.2 — 2026-05-03
// v0.4.2 — Remove River from the picker. Per-pixel sampling caught
//          rivers but at 4-5 cell-wide bands instead of the 1-cell
//          trail the geometry calls for; the path module already
//          tracks rivers properly. Mode definition stays in
//          gcc-edge-modes.js for possible future revisit. Existing
//          River-flagged parents stay in storage; their dots stay
//          on the overlay; they just can't be acted on through
//          the picker. To clear them: shift-click each flagged
//          hex, or use the Clear button (wipes all flags).
// v0.4.1 — Run-scans apply loop passes deferFlush:true so 1128
//          parents accumulate dirty entries in memory; one
//          flushOverrides at end of batch produces one putBatch.
// v0.4.0 — Two UX adds for full-coastline-scale runs:
//          1. Draggable panel — header acts as drag handle, position
//             persists in localStorage 'gcc-edge-panel-pos'. Clamps
//             to viewport so saved positions don't strand the panel
//             off-screen if the window shrinks.
//          2. Progress UI for runs ≥ 30 parents: panel body swaps
//             out for a progress bar + label (mirrors the Coast
//             tool's csb-progress pattern). Loop yields every 25
//             iterations via setTimeout(0) so the bar repaints.
//             Apply stage also runs through this UI. After apply,
//             awaits GCCSubhexData.flushOverrides() so the toast
//             only fires once writes are durable on disk.
// v0.3.3 — Per-parent cap is informational only, no longer blocks.
//          Hand-flagged parents are presumed correct; a parent
//          writing 100 cells means the GM legitimately wants 100
//          overrides (e.g. mismatch between hand-painted parent
//          terrain and Darlene image at that location). TOTAL_HARD
//          remains the only blocking gate (catches actual quota-
//          blowing runaway, like the May 3 incident).
// v0.3.2 — Diagnostic improvements: sort dry-run rows by mode
//          (so River rows aren't buried among 1000+ coast rows in
//          mixed runs); per-mode summary table emitted alongside
//          the row table; rows stashed on window.__edgesLastDebug
//          so DevTools can post-hoc query (e.g.
//          __edgesLastDebug.filter(r => r.mode === 'river')).
// v0.3.1 — Retune anti-runaway caps for real authoring scale.
//          PER_PARENT_SOFT 50 → 95 (real coastlines cap ~85, only
//          classifier-runaway hits 95+). TOTAL_HARD 5000 → 100000
//          (full Greyhawk coastline = 1,125 parents × ~45 cells
//          ≈ 50k legit cells, with 2× headroom). Note: 50k+ writes
//          at ~110 bytes each may exceed the ~5MB localStorage
//          quota — chunked authoring or Firestore backing for
//          scanner output is a likely follow-up.
// v0.3.0 — Two-stage Run-scans: dry-run all parents first, gate
//          on per-parent (>50 cells) and total (>5000 cells) caps
//          before applying. Diagnostic table emitted before
//          apply, not after, so it's visible even when a cap
//          aborts the run. Catches classifier-runaway like the
//          May 3 River incident before the writes hit
//          localStorage.
// v0.2.1 — Run-scans now logs per-parent diagnostics via
//          console.table for debug visibility into what classified
//          as what.
// v0.2.0 — promote River into the picker (shares Coast classifier,
//          differs only in variant-naming); add shift/right-click
//          remove-all-flags-on-hex gesture for easier cleanup
//          regardless of which mode painted what.
// v0.1.0 — initial slice 3 paint mode + panel + dot overlay.
// Edges paint mode + panel + flagged-parent dot overlay (slice 3 of
// the Edges scanner redesign). Workflow:
//
//   1. Click 🪡 Edges in the toolbar to enter paint mode.
//   2. Pick a mode in the panel (Coast is the only mode in slice 3).
//   3. Click parent hexes on the map to toggle flags. Visible
//      colored dots appear at flagged parents.
//   4. Click "Run scans" to iterate every (parent, mode) pair and
//      write overrides via GCCEdgeScanner.scanParent + applyResults.
//   5. "Clear flags" wipes the flag set. "Exit" leaves paint mode.
//
// The "Show flag dots" toggle hides/shows the overlay independently
// of paint-mode state — useful for keeping the GM aware of which
// parents have authored detail without paint-mode chrome on screen.
// Persisted in localStorage as gcc-edge-dots-visible (default true).
//
// Architecture notes:
//   - Capture-phase mousedown on #map-wrap, mirroring the Hex
//     Editor paint tab (gcc-hex-edit.js v0.5.0+). Beats the map's
//     bubble-phase pan handler.
//   - Coords resolved via screenToMap + mapToHex (defined in
//     greyhawk-map.html, hoisted onto window).
//   - SVG dot overlay layer #edge-flag-overlay parallels
//     #landmark-overlay; pointerEvents:none so clicks pass through
//     to the hex polygons.
//   - Run-scans uses GCCSubhexData.flushOverrides at the end of
//     the batch (single localStorage write across all parents).
//
// Cross-script gotcha: greyhawk-map.html script-src loaders DON'T
// share top-level const/let — only window.* propagates. All cross-
// module references go through window.GCCEdges / window.GCCEdgeFlags
// / window.GCCEdgeScanner / etc.

(function(){
  'use strict';

  const DOTS_VISIBLE_KEY = 'gcc-edge-dots-visible';

  // ── Per-mode visual style ──────────────────────────────────────────
  // Color and label for the panel radio + the SVG dot overlay. Must
  // stay in sync with GCCEdgeModes.list — slice 5 adds forest, slice
  // 6 adds river/jungle. Hidden modes (e.g. an experimental one not
  // ready for the picker) can be omitted from MODE_UI without
  // breaking storage compatibility.
  const MODE_UI = {
    coast:  { label: 'Coast',  glyph: '🌊', color: '#4a9fd0' },
    river:  { label: 'River',  glyph: '🌊', color: '#5fb8a8' },
    forest: { label: 'Forest', glyph: '🌲', color: '#5a9a3a' },
    jungle: { label: 'Jungle', glyph: '🌴', color: '#2f7a3a' },
  };
  // Modes available in the picker. River was tried in v15.1.18-26 but
  // the per-pixel sampling produced a 4-5 cell-wide water band along
  // a 1-cell-wide river, which is wrong for 3-mile subhexes. The path
  // module already tracks rivers properly. River mode definition
  // stays in gcc-edge-modes.js (inert) for possible future revisit.
  // Slice 5 adds Forest; slice 6 adds Jungle.
  const SLICE_MODES = ['coast'];

  // ── Module state ───────────────────────────────────────────────────
  const state = {
    active: false,
    activeMode: 'coast',
    paintDragging: false,
    lastPaintKey: null,
    showDots: _loadShowDots(),
    panelEl: null,
  };

  function _loadShowDots(){
    try {
      const raw = localStorage.getItem(DOTS_VISIBLE_KEY);
      if (raw === null) return true;
      return raw === '1';
    } catch(_){ return true; }
  }
  function _saveShowDots(v){
    try { localStorage.setItem(DOTS_VISIBLE_KEY, v ? '1' : '0'); } catch(_){}
  }

  // ── Style injection ────────────────────────────────────────────────
  // Cursor for paint mode + toolbar active state. Mirrors the
  // gcc-hex-edit.js pattern (style block appended on script init).
  function _injectStyle(){
    if (document.getElementById('gcc-edges-style')) return;
    const s = document.createElement('style');
    s.id = 'gcc-edges-style';
    s.textContent = `
      body.edges-painting #map-wrap { cursor:cell !important; }
      #btn-edges.active { background:rgba(200,148,26,.28); color:#ffeebb; border-color:#c8941a; }
    `;
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', _injectStyle);
  } else {
    _injectStyle();
  }

  function LOG(...args){ if (window.GCC_DEBUG_EDGES) console.log('[Edges]', ...args); }

  // ── SVG dot overlay ────────────────────────────────────────────────
  // Builds (or rebuilds) #edge-flag-overlay inside #hex-svg. One small
  // circle per (flagged-parent, mode) pair. Multiple modes on a single
  // parent stack horizontally with a 4px offset so all are visible.
  // pointerEvents:none keeps the overlay from intercepting paint
  // clicks — the underlying hex polygon owns the click event.
  function buildEdgeFlagOverlay(){
    const ns = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(ns, 'g');
    g.id = 'edge-flag-overlay';
    g.style.pointerEvents = 'none';
    if (!state.showDots) g.style.display = 'none';
    if (typeof window.GCCEdgeFlags === 'undefined') return g;
    if (typeof window.hexCenterDisplay !== 'function' && typeof window.hexCenter !== 'function') return g;
    const center = window.hexCenterDisplay || window.hexCenter;
    const mapToStage = window.mapToStage;
    const all = window.GCCEdgeFlags.getAll();
    for (const f of all){
      const c = center(f.col, f.row);
      const stage = (typeof mapToStage === 'function') ? mapToStage(c.x, c.y) : c;
      const modes = f.modes;
      // Stack: center the row of dots on the parent center. With
      // n=1 dot, offset 0; with n=2, offsets ±4; with n=3, -8/0/+8;
      // generally i*8 - (n-1)*4 along x for evenly spaced dots.
      const n = modes.length;
      const SPACING = 8;
      for (let i = 0; i < n; i++){
        const m = modes[i];
        const ui = MODE_UI[m] || { color: '#888' };
        const dx = i * SPACING - (n - 1) * (SPACING / 2);
        const dot = document.createElementNS(ns, 'circle');
        dot.setAttribute('cx', (stage.x + dx).toFixed(1));
        dot.setAttribute('cy', stage.y.toFixed(1));
        dot.setAttribute('r', '3.2');
        dot.setAttribute('fill', ui.color);
        dot.setAttribute('stroke', '#fff');
        dot.setAttribute('stroke-width', '0.8');
        dot.setAttribute('opacity', '0.92');
        g.appendChild(dot);
      }
    }
    return g;
  }
  function rebuildEdgeFlagOverlay(){
    const svg = document.getElementById('hex-svg');
    if (!svg) return;
    const old = document.getElementById('edge-flag-overlay');
    const next = buildEdgeFlagOverlay();
    if (old && old.parentNode) old.parentNode.replaceChild(next, old);
    else svg.appendChild(next);
  }
  function setShowDots(v){
    state.showDots = !!v;
    _saveShowDots(state.showDots);
    const el = document.getElementById('edge-flag-overlay');
    if (el) el.style.display = state.showDots ? '' : 'none';
    // Also tick the panel checkbox if open and out of sync.
    const cb = state.panelEl && state.panelEl.querySelector('#edges-show-dots');
    if (cb && cb.checked !== state.showDots) cb.checked = state.showDots;
  }

  // ── Panel ──────────────────────────────────────────────────────────
  // Position persists in localStorage 'gcc-edge-panel-pos'. On first
  // load (or out-of-bounds saved position from a viewport resize),
  // falls back to the default top-right corner. Drag handle is the
  // header div; clicks on the close × pass through.
  const PANEL_POS_KEY = 'gcc-edge-panel-pos';

  function _loadPanelPos(){
    try {
      const raw = localStorage.getItem(PANEL_POS_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (typeof p.left !== 'number' || typeof p.top !== 'number') return null;
      // Clamp to viewport in case the user resized smaller since saving.
      const maxLeft = Math.max(0, window.innerWidth - 50);
      const maxTop  = Math.max(0, window.innerHeight - 50);
      return { left: Math.min(p.left, maxLeft), top: Math.min(p.top, maxTop) };
    } catch(_){ return null; }
  }
  function _savePanelPos(left, top){
    try { localStorage.setItem(PANEL_POS_KEY, JSON.stringify({ left, top })); } catch(_){}
  }

  function buildPanel(){
    const wrap = document.createElement('div');
    wrap.id = 'edges-panel';
    const pos = _loadPanelPos();
    const initialPosCss = pos
      ? `left:${pos.left}px; top:${pos.top}px;`
      : `top:60px; right:16px;`;
    wrap.style.cssText = `
      position:fixed; ${initialPosCss}
      width:280px; z-index:300;
      background:#120900; color:#f4e8c4;
      border:1px solid #c8941a; border-radius:3px;
      padding:12px 14px;
      box-shadow:0 6px 30px rgba(0,0,0,.7);
      font-family:'Crimson Text', Georgia, serif;
    `;
    wrap.innerHTML = `
      <div id="edges-header" style="font-family:'Cinzel',serif; font-size:13px; color:#e8b840; letter-spacing:.06em; text-transform:uppercase; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #5a4a30; display:flex; justify-content:space-between; align-items:baseline; cursor:move; user-select:none;">
        <span>🪡 Edges</span>
        <span style="cursor:pointer; color:#c8a070; font-size:18px;" id="edges-close" title="Exit">×</span>
      </div>
      <div id="edges-body">
      <div style="font-size:10px; color:#c8a070; letter-spacing:.06em; text-transform:uppercase; margin-bottom:4px;">Mode</div>
      <div id="edges-mode-picker" style="font-size:12px; line-height:1.7; margin-bottom:10px;"></div>
      <div id="edges-stats" style="font-size:12px; color:#c8a070; margin-bottom:10px; line-height:1.4;">—</div>
      <div style="display:flex; gap:6px; margin-bottom:10px;">
        <button id="edges-run" style="flex:1; background:#5a3a0a; color:#f4e8c4; border:1px solid #c8941a; border-radius:3px; padding:6px 0; font-family:inherit; font-size:12px; cursor:pointer; font-weight:600;">Run scans</button>
        <button id="edges-clear" style="background:transparent; color:#f4e8c4; border:1px solid #8b6a30; border-radius:3px; padding:6px 10px; font-family:inherit; font-size:12px; cursor:pointer;" title="Remove all flags">Clear</button>
      </div>
      <label style="display:flex; align-items:center; gap:6px; font-size:11px; color:#c8a070; cursor:pointer; user-select:none;">
        <input type="checkbox" id="edges-show-dots" ${state.showDots ? 'checked' : ''}>
        Show flag dots on map
      </label>
      <div style="font-size:10px; color:#8b6a30; margin-top:8px; line-height:1.5;">
        <b style="color:#c8a070;">Click</b> a parent to toggle the active mode.<br>
        <b style="color:#c8a070;">Shift-click</b> or <b style="color:#c8a070;">right-click</b> to clear all modes from a hex.
      </div>
      </div><!-- /edges-body -->
      <div id="edges-progress" style="display:none;">
        <div id="edges-progress-msg" style="font-size:13px; line-height:1.5; margin-bottom:10px; color:#f4e8c4;">Scanning…</div>
        <div style="height:14px; background:#2a1a08; border:1px solid #5a4a30; border-radius:2px; overflow:hidden; margin-bottom:6px;">
          <div id="edges-progress-bar" style="height:100%; width:0%; background:linear-gradient(90deg,#c8941a,#e8b840); transition:width .2s;"></div>
        </div>
        <div id="edges-progress-label" style="font-size:11px; color:#c8a070;">starting…</div>
      </div>
    `;
    document.body.appendChild(wrap);
    state.panelEl = wrap;
    _renderModePicker();
    _renderStats();
    document.getElementById('edges-close').addEventListener('click', exit);
    document.getElementById('edges-run').addEventListener('click', onRunClick);
    document.getElementById('edges-clear').addEventListener('click', onClearClick);
    document.getElementById('edges-show-dots').addEventListener('change', e => {
      setShowDots(!!e.target.checked);
    });
    _wirePanelDrag(wrap);
  }

  // ── Panel drag ─────────────────────────────────────────────────────
  // Mousedown on header (but not on the close × or anything inside
  // edges-body) starts a drag. Move with the mouse, save position
  // on mouseup. We anchor by left/top, ignoring the initial right:16px
  // anchor — once dragged, the panel uses absolute left/top
  // coordinates and won't track viewport-edge resizes (acceptable;
  // user explicitly placed it).
  function _wirePanelDrag(wrap){
    const header = wrap.querySelector('#edges-header');
    if (!header) return;
    let dragging = false;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;
    function onDown(ev){
      // Don't initiate drag if the user clicked the close button.
      if (ev.target.closest('#edges-close')) return;
      dragging = true;
      startX = ev.clientX;
      startY = ev.clientY;
      const rect = wrap.getBoundingClientRect();
      startLeft = rect.left;
      startTop  = rect.top;
      // Pin the wrap to absolute left/top (overriding any right-anchor).
      wrap.style.left = startLeft + 'px';
      wrap.style.top  = startTop  + 'px';
      wrap.style.right = 'auto';
      ev.preventDefault();
      ev.stopPropagation();
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('mouseup',   onUp,   true);
    }
    function onMove(ev){
      if (!dragging) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let nl = startLeft + dx;
      let nt = startTop  + dy;
      // Clamp so a sliver always stays visible.
      const w = wrap.offsetWidth, h = wrap.offsetHeight;
      nl = Math.max(-w + 50, Math.min(window.innerWidth - 50, nl));
      nt = Math.max(0, Math.min(window.innerHeight - 30, nt));
      wrap.style.left = nl + 'px';
      wrap.style.top  = nt + 'px';
    }
    function onUp(ev){
      if (!dragging) return;
      dragging = false;
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup',   onUp,   true);
      const rect = wrap.getBoundingClientRect();
      _savePanelPos(rect.left, rect.top);
    }
    header.addEventListener('mousedown', onDown, true);
  }
  function _renderModePicker(){
    const host = state.panelEl && state.panelEl.querySelector('#edges-mode-picker');
    if (!host) return;
    const rows = [];
    for (const id of SLICE_MODES){
      const ui = MODE_UI[id] || { label: id, color: '#888' };
      const checked = (state.activeMode === id) ? 'checked' : '';
      rows.push(`
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="radio" name="edges-mode" value="${id}" ${checked}>
          <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${ui.color}; border:1px solid rgba(255,255,255,0.4);"></span>
          <span>${ui.label}</span>
        </label>`);
    }
    // Future-modes hint.
    rows.push(`<div style="font-size:10px; color:#8b6a30; margin-top:6px;">Forest, Jungle land in later slices.</div>`);
    host.innerHTML = rows.join('');
    host.querySelectorAll('input[name="edges-mode"]').forEach(r => {
      r.addEventListener('change', e => { state.activeMode = e.target.value; });
    });
  }
  function _renderStats(){
    const host = state.panelEl && state.panelEl.querySelector('#edges-stats');
    if (!host) return;
    if (typeof window.GCCEdgeFlags === 'undefined'){
      host.textContent = '(GCCEdgeFlags not loaded)';
      return;
    }
    const c = window.GCCEdgeFlags.count();
    if (c.total === 0){
      host.innerHTML = `<span style="color:#8b6a30;">No parents flagged. Click a hex to start.</span>`;
      return;
    }
    const breakdown = Object.entries(c.byMode)
      .map(([m, n]) => {
        const ui = MODE_UI[m] || { label: m, color: '#888' };
        return `<span style="color:${ui.color};">${n} ${ui.label.toLowerCase()}</span>`;
      })
      .join(' · ');
    host.innerHTML = `<b style="color:#e8b840;">${c.total}</b> parent${c.total === 1 ? '' : 's'} flagged · ${breakdown}`;
  }

  // ── Run / Clear ────────────────────────────────────────────────────
  // Anti-runaway caps. The May 3 incident: River-mode scans wrote
  // 10,206 water_fresh cells across ~115 parents (≈88 cells per
  // parent — every cell, not the river line) and overflowed
  // localStorage quota.
  //
  // Tuned for real authoring scale (Kurt's full Greyhawk coastline
  // = 1,125 parents × ~45 cells/parent average ≈ 50k legit cells):
  //
  //   PER_PARENT_SOFT — any single parent writing more cells than
  //                     this is suspicious. Tuned to 95 so only
  //                     classifier-runaway (the May 3 pattern of
  //                     ~88-cell parents writing all 88) triggers.
  //                     Real coastlines cap around 85 cells written.
  //   TOTAL_HARD      — ceiling on cumulative writes per Run. Tuned
  //                     to 100k to leave 2× headroom over full-
  //                     coastline authoring (~50k legit cells).
  //                     Above this, Run aborts before any apply.
  const PER_PARENT_SOFT = 95;
  const TOTAL_HARD      = 100000;

  // ── Progress UI helpers ────────────────────────────────────────────
  function _showProgress(msg){
    const panel = state.panelEl;
    if (!panel) return;
    const body = panel.querySelector('#edges-body');
    const prog = panel.querySelector('#edges-progress');
    if (body) body.style.display = 'none';
    if (prog) prog.style.display = 'block';
    _setProgress(msg || 'Scanning…', 0, '');
  }
  function _hideProgress(){
    const panel = state.panelEl;
    if (!panel) return;
    const body = panel.querySelector('#edges-body');
    const prog = panel.querySelector('#edges-progress');
    if (body) body.style.display = '';
    if (prog) prog.style.display = 'none';
  }
  function _setProgress(msg, pct, label){
    const panel = state.panelEl;
    if (!panel) return;
    const m   = panel.querySelector('#edges-progress-msg');
    const bar = panel.querySelector('#edges-progress-bar');
    const lbl = panel.querySelector('#edges-progress-label');
    if (m   && msg   != null) m.textContent = msg;
    if (bar && pct   != null) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (lbl && label != null) lbl.textContent = label;
  }

  async function onRunClick(){
    if (typeof window.GCCEdgeFlags === 'undefined' || typeof window.GCCEdgeScanner === 'undefined'){
      alert('Edges scanner not loaded.');
      return;
    }
    if (typeof window.GCCEdgeModes === 'undefined'){
      alert('Edges modes not loaded.');
      return;
    }
    const flags = window.GCCEdgeFlags.getAll();
    if (flags.length === 0){
      _toast('No flagged parents to scan.');
      return;
    }
    // Build the work list as (parent, mode) pairs.
    const work = [];
    for (const f of flags){
      for (const modeId of f.modes){
        const mode = window.GCCEdgeModes.byId && window.GCCEdgeModes.byId[modeId];
        if (!mode){
          console.warn(`[Edges] flagged mode "${modeId}" not registered — skipping`);
          continue;
        }
        work.push({ col: f.col, row: f.row, modeId, mode });
      }
    }
    if (work.length === 0){
      _toast('No (parent, mode) pairs to scan.');
      return;
    }

    // ── Stage 1: dry-run ──────────────────────────────────────────
    // Run scanParent on every (parent, mode) pair WITHOUT applying.
    // Collect each parent's would-write count and build the diag
    // table from the same data. This lets us see runaway patterns
    // before touching localStorage.
    //
    // For runs over PROGRESS_THRESHOLD parents, swap the panel for
    // a progress UI and yield to the event loop every YIELD_EVERY
    // iterations so the bar repaints. Below the threshold the loop
    // is fast enough (~50ms for 10 parents) that the UI swap would
    // only flicker — skip.
    const PROGRESS_THRESHOLD = 30;
    const YIELD_EVERY = 25;
    const useProgress = work.length >= PROGRESS_THRESHOLD;
    if (useProgress) _showProgress(`Scanning ${work.length} parent${work.length===1?'':'s'}…`);

    const dryResults = [];
    const debugRows = [];
    let totalWouldWrite = 0;
    let parentsAborted = 0;
    const errors = [];
    const suspiciousParents = [];
    for (let i = 0; i < work.length; i++){
      const w = work[i];
      const out = window.GCCEdgeScanner.scanParent(w.col, w.row, { mode: w.mode });
      if (out.error){
        errors.push(`${w.col},${w.row} (${w.modeId}): ${out.error}`);
        debugRows.push({ parent: `${w.col},${w.row}`, mode: w.modeId, status: 'ERROR: ' + out.error });
      } else if (out.summary && out.summary.aborted){
        parentsAborted++;
        debugRows.push({ parent: `${w.col},${w.row}`, mode: w.modeId, status: 'aborted (off-image)' });
      } else {
        const s = out.summary || {};
        const r = s.resolution || {};
        const wouldWrite = s.toWrite || 0;
        totalWouldWrite += wouldWrite;
        if (wouldWrite > PER_PARENT_SOFT){
          suspiciousParents.push({ col: w.col, row: w.row, modeId: w.modeId, wouldWrite });
        }
        dryResults.push({ work: w, out });
        debugRows.push({
          parent:    `${w.col},${w.row}`,
          mode:      w.modeId,
          terrain:   s.parentTerrain || '(none)',
        cells:     s.cellCount,
        water:     s.water,
        land:      s.land,
        ambig:     s.ambiguous,
        wDirect:   r.waterDirect || 0,
        lDirect:   r.landDirect || 0,
        wByNbr:    r.waterByNeighbor || 0,
        lByNbr:    r.landByNeighbor || 0,
        wByParent: r.waterByParent || 0,
        lByParent: r.landByParent || 0,
        offImg:    s.offImage || 0,
        wouldWrite,
        status:    wouldWrite > PER_PARENT_SOFT ? '⚠ over per-parent cap' : '',
        });
      }
      // Progress + yield (only when over threshold).
      if (useProgress && (i % YIELD_EVERY === 0 || i === work.length - 1)){
        const done = i + 1;
        const pct  = Math.round((done / work.length) * 100);
        _setProgress(null, pct, `${done} of ${work.length} parent${work.length===1?'':'s'} · ${totalWouldWrite} cells so far`);
        await new Promise(r => setTimeout(r, 0));
      }
    }
    if (useProgress) _hideProgress();

    // Sort debug rows by mode (alphabetical) then parent so
    // mixed-mode runs group same-mode parents together — keeps
    // river rows from getting buried in 1000+ coast rows.
    debugRows.sort((a, b) => {
      const m = (a.mode || '').localeCompare(b.mode || '');
      if (m) return m;
      return (a.parent || '').localeCompare(b.parent || '');
    });

    // Stash on window for post-hoc query when the table is too
    // long to scroll through. Usage in DevTools:
    //   __edgesLastDebug.filter(r => r.mode === 'river')
    try { window.__edgesLastDebug = debugRows; } catch(_){}

    // Emit diag table BEFORE any apply, so the user can read it
    // even if the run gets cancelled by a cap.
    if (debugRows.length){
      try {
        console.groupCollapsed(`[Edges] Run-scans dry-run (${debugRows.length} row${debugRows.length===1?'':'s'}, would write ${totalWouldWrite} cell${totalWouldWrite===1?'':'s'})`);
        if (typeof console.table === 'function') console.table(debugRows);
        else console.log(debugRows);
        console.groupEnd();

        // Also log a per-mode summary up top so it's visible
        // without expanding the full table.
        const byMode = {};
        for (const r of debugRows){
          const m = r.mode || '?';
          byMode[m] = byMode[m] || { rows: 0, wouldWrite: 0, overCap: 0 };
          byMode[m].rows++;
          byMode[m].wouldWrite += (r.wouldWrite || 0);
          if ((r.wouldWrite || 0) > PER_PARENT_SOFT) byMode[m].overCap++;
        }
        console.log('[Edges] Per-mode summary:');
        if (typeof console.table === 'function') console.table(byMode);
        else console.log(byMode);
      } catch(_){}
    }
    if (errors.length){
      console.warn('[Edges] dry-run errors:', errors);
    }

    // ── Stage 2: cap gate ─────────────────────────────────────────
    // Only TOTAL_HARD is a blocking gate — it catches genuine
    // quota-blowing runaway (May 3 incident pattern). PER_PARENT_SOFT
    // is informational only: gets logged with the diagnostic, doesn't
    // block. Reasoning: the GM hand-flagged each parent, so a parent
    // writing 100 cells is the parent legitimately needing 100
    // overrides (e.g. a parent painted as land that's actually all
    // ocean on Darlene), not classifier runaway.
    if (totalWouldWrite > TOTAL_HARD){
      const msg =
        `Aborting: this run would write ${totalWouldWrite} cells, ` +
        `over the safety ceiling of ${TOTAL_HARD}.\n\n` +
        `Open DevTools console for the per-parent breakdown. ` +
        `If the diagnostic looks correct and you genuinely want ` +
        `to write that many cells, raise TOTAL_HARD in gcc-edges.js.`;
      alert(msg);
      _toast(`Aborted: ${totalWouldWrite} cells exceeds cap of ${TOTAL_HARD}`);
      return;
    }
    if (suspiciousParents.length){
      // Informational only — log to console, don't block.
      console.log(`[Edges] ${suspiciousParents.length} parent(s) would write more than ${PER_PARENT_SOFT} cells each (informational; not blocking).`);
    }
    const summary = `Run ${dryResults.length} scan${dryResults.length === 1 ? '' : 's'} → write ${totalWouldWrite} cell${totalWouldWrite === 1 ? '' : 's'}?`;
    if (!confirm(summary)) return;

    // ── Stage 3: apply ────────────────────────────────────────────
    if (useProgress) _showProgress(`Applying ${totalWouldWrite} override${totalWouldWrite===1?'':'s'}…`);
    let totalWritten = 0, totalSkipped = 0;
    for (let i = 0; i < dryResults.length; i++){
      const dr = dryResults[i];
      // deferFlush — let the per-parent applyResults accumulate
      // dirty entries; we flush once at end of the whole batch.
      // Critical for 50k-cell scale: drops 1128 separate IDB
      // transactions to 1.
      const ap = window.GCCEdgeScanner.applyResults(dr.out.results, { mode: dr.work.mode, deferFlush: true });
      totalWritten += ap.written || 0;
      totalSkipped += ap.skipped || 0;
      if (useProgress && (i % YIELD_EVERY === 0 || i === dryResults.length - 1)){
        const done = i + 1;
        const pct = Math.round((done / dryResults.length) * 100);
        _setProgress(null, pct, `${done} of ${dryResults.length} parent${dryResults.length===1?'':'s'} · ${totalWritten} written`);
        await new Promise(r => setTimeout(r, 0));
      }
    }
    // Wait for IDB writes to actually hit disk before claiming done.
    // Without this, the toast says "50508 written" but the writes
    // may still be queued — a fast reload would lose data.
    if (window.GCCSubhexData && typeof window.GCCSubhexData.flushOverrides === 'function'){
      if (useProgress) _setProgress('Flushing to disk…', 100, '');
      try { await window.GCCSubhexData.flushOverrides(); } catch(_){}
    }
    if (useProgress) _hideProgress();
    const parts = [`${dryResults.length} scan${dryResults.length === 1 ? '' : 's'} run`,
                   `${totalWritten} override${totalWritten === 1 ? '' : 's'} written`];
    if (totalSkipped) parts.push(`${totalSkipped} skipped`);
    if (parentsAborted) parts.push(`${parentsAborted} aborted (off-image)`);
    if (errors.length) parts.push(`${errors.length} error${errors.length === 1 ? '' : 's'}`);
    _toast(parts.join(' · '));
    if (totalWritten > 0){
      window.dispatchEvent(new CustomEvent('gcc-subhex-changed', {
        detail: { reason: 'edges-run' },
      }));
    }
  }
  function onClearClick(){
    if (typeof window.GCCEdgeFlags === 'undefined') return;
    const c = window.GCCEdgeFlags.count();
    if (c.total === 0){ _toast('No flags to clear.'); return; }
    if (!confirm(`Remove all ${c.total} parent flag${c.total === 1 ? '' : 's'}? Subhex overrides already written are not affected.`)) return;
    window.GCCEdgeFlags.clearAll();
  }

  // ── Toast ──────────────────────────────────────────────────────────
  function _toast(msg){
    if (typeof window.showToast === 'function'){ window.showToast(msg); return; }
    console.log('[Edges]', msg);
  }

  // ── Map click capture ──────────────────────────────────────────────
  // Capture-phase on #map-wrap so we beat the map's bubble-phase
  // pan-arming handler. We swallow the event entirely (preventDefault
  // + stopImmediatePropagation) so left-click while in paint mode
  // never starts a pan. Drag-paint is intentionally NOT supported —
  // flagging is point-and-click; dragging across parents would be a
  // footgun.
  //
  // Click semantics:
  //   left click          → toggle active-mode flag on hex
  //   shift+left click    → remove ALL flags (any mode) from hex
  //   right click         → same as shift+left (remove all)
  // The "remove all" path means the GM doesn't have to remember
  // which mode painted a hex to clear it — particularly useful when
  // a hex has stacked dots from multiple modes.
  function _removeAllFlags(col, row){
    const F = window.GCCEdgeFlags;
    if (!F) return 0;
    const modes = F.getModes(col, row);
    let n = 0;
    for (const m of modes){
      if (F.removeFlag(col, row, m)) n++;
    }
    return n;
  }
  function onMapMousedown(ev){
    if (!state.active) return;
    // Accept left (0) and right (2). Middle-click ignored.
    if (ev.button !== 0 && ev.button !== 2) return;
    if (typeof window.screenToMap !== 'function' || typeof window.mapToHex !== 'function') return;
    const m = window.screenToMap(ev.clientX, ev.clientY);
    if (!m) return;
    const hit = window.mapToHex(m.x, m.y);
    if (!hit) return;
    if (state.panelEl && state.panelEl.contains(ev.target)) return;
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    ev.preventDefault();
    if (typeof window.GCCEdgeFlags === 'undefined') return;
    const isRemoveAll = (ev.button === 2) || ev.shiftKey;
    if (isRemoveAll){
      const n = _removeAllFlags(hit.col, hit.row);
      if (n > 0) LOG('remove-all', hit.col, hit.row, '→', n, 'flags removed');
      return;
    }
    const newState = window.GCCEdgeFlags.toggleFlag(hit.col, hit.row, state.activeMode);
    LOG('toggle', hit.col, hit.row, state.activeMode, '→', newState);
  }

  // Right-click on the map should clear flags (when in Edges mode)
  // rather than open the browser context menu. Capture-phase on
  // map-wrap so we beat anything else; only swallows when we're in
  // Edges mode and the click is over a flagged hex (otherwise the
  // normal context menu would be slightly weird to suppress).
  function onMapContextMenu(ev){
    if (!state.active) return;
    if (typeof window.screenToMap !== 'function' || typeof window.mapToHex !== 'function') return;
    const m = window.screenToMap(ev.clientX, ev.clientY);
    if (!m) return;
    const hit = window.mapToHex(m.x, m.y);
    if (!hit) return;
    ev.preventDefault();
    ev.stopPropagation();
  }

  // ── Lifecycle ──────────────────────────────────────────────────────
  function enter(){
    if (state.active) return;
    state.active = true;
    document.body.classList.add('edges-painting');
    if (!state.panelEl) buildPanel();
    else state.panelEl.style.display = 'block';
    const wrap = document.getElementById('map-wrap');
    if (wrap){
      wrap.addEventListener('mousedown', onMapMousedown, true);
      wrap.addEventListener('contextmenu', onMapContextMenu, true);
    }
    document.addEventListener('keydown', onKey, true);
    const btn = document.getElementById('btn-edges');
    if (btn) btn.classList.add('active');
    // Make sure the dot overlay is in sync with current data on
    // entry. (It was rebuilt on every flag change; this handles the
    // first-entry case where no flag changes have fired yet.)
    rebuildEdgeFlagOverlay();
    LOG('entered, mode=', state.activeMode);
  }
  function exit(){
    if (!state.active) return;
    state.active = false;
    document.body.classList.remove('edges-painting');
    if (state.panelEl) state.panelEl.style.display = 'none';
    const wrap = document.getElementById('map-wrap');
    if (wrap){
      wrap.removeEventListener('mousedown', onMapMousedown, true);
      wrap.removeEventListener('contextmenu', onMapContextMenu, true);
    }
    document.removeEventListener('keydown', onKey, true);
    const btn = document.getElementById('btn-edges');
    if (btn) btn.classList.remove('active');
    LOG('exited');
  }
  function toggle(){ state.active ? exit() : enter(); }

  function onKey(e){
    if (e.key === 'Escape'){ exit(); }
  }

  // ── Wire reactions to flag changes ─────────────────────────────────
  // Repaint the overlay + refresh the panel stats whenever flags
  // change, regardless of whether we're in paint mode (the dots stay
  // visible by default so the GM always knows what's flagged).
  if (typeof window !== 'undefined' && window.addEventListener){
    window.addEventListener('gcc-edge-flags-changed', () => {
      rebuildEdgeFlagOverlay();
      _renderStats();
    });
    // Build the overlay once on the next tick, after greyhawk-map's
    // buildHexGrid has run. Ensures dots show up on page load even
    // before the user enters paint mode.
    function _initialOverlay(){
      // Defer: hex-svg only exists after greyhawk-map's DOMContentLoaded
      // wires up. setTimeout(0) runs after the current task chain.
      setTimeout(rebuildEdgeFlagOverlay, 0);
    }
    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', _initialOverlay);
    } else {
      _initialOverlay();
    }
  }

  // ── Toolbar wire ───────────────────────────────────────────────────
  function wireButton(){
    const btn = document.getElementById('btn-edges');
    if (!btn) return false;
    if (btn.dataset.edgesWired) return true;
    btn.dataset.edgesWired = '1';
    btn.addEventListener('click', toggle);
    return true;
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', wireButton);
  } else {
    wireButton();
  }

  window.GCCEdges = {
    enter, exit, toggle,
    setShowDots,
    rebuildOverlay: rebuildEdgeFlagOverlay,
    MODE_UI, SLICE_MODES,
  };
})();
