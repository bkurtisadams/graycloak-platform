// gcc-map.js v0.1.0 — 2026-05-09
// Unified map shell — Phase B Slice 2 of DESIGN-unified-map.md.
// Hosts a fullscreen map with explicit named scales (parent/subhex/
// future), pan + wheel-zoom plumbing, panel chrome, and a scale
// registry. No content yet — parent and subhex renderers (Slices 3
// and 4) populate the canvas. Back-compat shims keep window.state
// (selectedCol/Row) + window.imgX + window.rebuildPathOverlay +
// window.getHexTerrain / getRegion alive for modules not yet
// migrated (gcc-edge-scanner, gcc-paths, gcc-hex-edit, etc.).
//
// Public surface: window.GCCMap. See bottom of file for the full
// export. Renderers register via GCCMap.registerScale({...}); the
// shell handles mount/unmount on scale switch.

(function(){
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────
  // World coords are the data layer's native units (HEX_R = 20 world units
  // per parent hex, SUB_R = 2 per subhex). Per-scale pxPerWorldUnit gives
  // each scale its own "comfortable zoom 1.0" density without retuning the
  // shared coord space.
  const HEX_R = 20;          // parent hex radius in world units
  const SUB_R = 2;           // subhex radius in world units
  const SQRT3 = Math.sqrt(3);
  const ZOOM_STEP = 1.25;
  const PAN_NUDGE_PX = 80;   // arrow-key pan step at any scale

  // TERRAIN palette (lifted from greyhawk-map.html line 1002, retained as
  // shared constant — both renderers read it for fill colors). Only the
  // palette; per-hex terrain assignment lives in GCCTerrain (gcc-terrain.js).
  const TERRAIN = {
    plains:    { name:'Plains',    rgb:'122,158,90'  },
    forest:    { name:'Forest',    rgb:'45,94,40'    },
    hills:     { name:'Hills',     rgb:'139,110,69'  },
    mountains: { name:'Mountains', rgb:'122,96,85'   },
    water:     { name:'Water',     rgb:'74,127,160'  },
    desert:    { name:'Desert',    rgb:'196,176,96'  },
    swamp:     { name:'Swamp',     rgb:'61,107,80'   },
    jungle:    { name:'Jungle',    rgb:'48,90,55'    },
  };

  // ── Scale registry ────────────────────────────────────────────────────────
  // Renderers populate this via GCCMap.registerScale(spec). Order of
  // registration is preserved (drives button order). Each spec:
  //   {
  //     name, label, hexSize, pxPerWorldUnit,
  //     zoomMin, zoomMax, zoomDefault,
  //     renderer: { mount(svg, ctx), render(), unmount() },
  //     tools: [],   // optional, finalized in Slice 5
  //   }
  const _scales = new Map();
  const _scaleOrder = [];

  // ── State ─────────────────────────────────────────────────────────────────
  const state = {
    activeScale: null,                      // name string, set on init
    view: {
      cx: 0, cy: 0,                         // viewport center (world coords)
      zoom: 1.0,                            // active scale's zoom
      perScaleZoom: {},                     // last zoom per scale, restored on switch
      w: 0, h: 0,                           // viewport pixel size
    },
    selection: null,                        // { kind: 'parent'|'subhex', col, row, Q?, R? }
    pan: { dragging:false, startX:0, startY:0, startCx:0, startCy:0, button:null },
    spaceHeld: false,
    initted: false,
  };

  // ── DOM cache ─────────────────────────────────────────────────────────────
  let dom = null;

  function $(id){ return document.getElementById(id); }

  function cacheDom(){
    dom = {
      shell:        $('gcc-map-shell'),
      panel:        $('gcc-map-panel'),
      scaleBtns:    $('gcc-map-scale-buttons'),
      zoomIn:       $('gcc-map-zoom-in'),
      zoomOut:      $('gcc-map-zoom-out'),
      zoomReset:    $('gcc-map-zoom-reset'),
      zoomPct:      $('gcc-map-zoom-pct'),
      selectionBody:$('gcc-map-selection-body'),
      toolsBody:    $('gcc-map-tools-body'),
      canvas:       $('gcc-map-canvas'),
      svg:          $('gcc-map-svg'),
      coords:       $('gcc-map-coords'),
    };
  }

  // ── Geometry ──────────────────────────────────────────────────────────────
  // hexIdStr: Darlene-style "K4-91" id for parent (col, row). Promoted from
  // greyhawk-map.html inline scope to the shell so subhex-view, hex-edit,
  // etc. can read it via window.hexIdStr regardless of which page hosts
  // them. The Darlene encoding is unchanged from the legacy implementation.
  function darleneColLabel(col, gridCols){
    const idx = (gridCols - 1) - col;
    const letter = String.fromCharCode(65 + (idx % 26));
    const rep = Math.floor(idx / 26) + 1;
    return rep === 1 ? letter : letter + rep;
  }
  function darleneDiagonal(col, row, gridCols){
    const k = (gridCols - 1) - col;
    const offset = k === 0 ? 0 : Math.floor(k / 2) + 1;
    return row + 1 + offset;
  }
  // Default to Greyhawk grid dimensions when the page hasn't told us
  // otherwise. Can be overridden via GCCMap.setGridDimensions(cols, rows).
  let GRID_COLS = 146, GRID_ROWS = 97;
  function hexIdStr(col, row){
    return `${darleneColLabel(col, GRID_COLS)}-${darleneDiagonal(col, row, GRID_COLS)}`;
  }

  // ── Viewport ──────────────────────────────────────────────────────────────
  function activeScale(){
    return state.activeScale ? _scales.get(state.activeScale) : null;
  }

  function pxPerWorldUnit(){
    const sc = activeScale();
    return sc ? sc.pxPerWorldUnit * state.view.zoom : state.view.zoom;
  }

  function applyViewBox(){
    if (!dom || !dom.svg) return;
    const sc = activeScale();
    if (!sc){ return; }
    const f = sc.pxPerWorldUnit * state.view.zoom;
    const vbW = state.view.w / f;
    const vbH = state.view.h / f;
    const vbX = state.view.cx - vbW / 2;
    const vbY = state.view.cy - vbH / 2;
    dom.svg.setAttribute('viewBox', `${vbX.toFixed(3)} ${vbY.toFixed(3)} ${vbW.toFixed(3)} ${vbH.toFixed(3)}`);
  }

  function syncViewportSize(){
    if (!dom || !dom.canvas) return;
    const r = dom.canvas.getBoundingClientRect();
    state.view.w = Math.max(1, r.width);
    state.view.h = Math.max(1, r.height);
  }

  function syncZoomDisplay(){
    if (!dom || !dom.zoomPct) return;
    const sc = activeScale();
    if (!sc){ dom.zoomPct.textContent = '—'; return; }
    dom.zoomPct.textContent = `${Math.round(state.view.zoom * 100 / sc.zoomDefault)}%`;
  }

  // Convert client (mouse) coords to world coords. Used by wheel-zoom anchor.
  function clientToWorld(clientX, clientY){
    if (!dom || !dom.canvas) return null;
    const r = dom.canvas.getBoundingClientRect();
    const sc = activeScale();
    if (!sc) return null;
    const f = sc.pxPerWorldUnit * state.view.zoom;
    const dx = (clientX - r.left) - state.view.w / 2;
    const dy = (clientY - r.top)  - state.view.h / 2;
    return { x: state.view.cx + dx / f, y: state.view.cy + dy / f };
  }

  // ── Scale switch ──────────────────────────────────────────────────────────
  function setScale(name, opts){
    if (!_scales.has(name)){
      console.warn('[gcc-map] setScale: unknown scale', name);
      return false;
    }
    if (state.activeScale === name) return true;
    opts = opts || {};
    const prevName = state.activeScale;
    const prev = prevName ? _scales.get(prevName) : null;
    const next = _scales.get(name);

    // Save outgoing scale's zoom
    if (prev){
      state.view.perScaleZoom[prev.name] = state.view.zoom;
      try { prev.renderer && prev.renderer.unmount && prev.renderer.unmount(); } catch(e){ console.error('[gcc-map] unmount error', e); }
    }

    // Restore incoming scale's zoom (or use default)
    state.activeScale = name;
    state.view.zoom = state.view.perScaleZoom[name] != null
      ? state.view.perScaleZoom[name]
      : next.zoomDefault;

    // Selection clears on scale switch (see DESIGN-unified-map.md Q4)
    state.selection = null;
    syncSelectionPanel();
    syncScaleButtons();

    // Mount the new renderer
    try {
      next.renderer && next.renderer.mount && next.renderer.mount(dom.svg, rendererCtx());
    } catch(e){ console.error('[gcc-map] mount error', e); }

    applyViewBox();
    syncZoomDisplay();
    requestRender();
    return true;
  }

  // ── Renderer context ──────────────────────────────────────────────────────
  // Passed to renderer.mount() and accessed via the shell's exported
  // helpers. Renderers don't read state directly; they ask the ctx for
  // viewport bbox, scale info, selection, etc. Keeps coupling shallow so
  // Slice 4's renderer extraction can land cleanly.
  function rendererCtx(){
    return {
      svg: dom.svg,
      activeScale: () => activeScale(),
      viewportBbox: () => {
        const sc = activeScale();
        if (!sc) return { minX:0, minY:0, maxX:0, maxY:0 };
        const f = sc.pxPerWorldUnit * state.view.zoom;
        const halfW = state.view.w / 2 / f;
        const halfH = state.view.h / 2 / f;
        return {
          minX: state.view.cx - halfW,
          maxX: state.view.cx + halfW,
          minY: state.view.cy - halfH,
          maxY: state.view.cy + halfH,
        };
      },
      worldCenter: () => ({ x: state.view.cx, y: state.view.cy }),
      zoom: () => state.view.zoom,
      pxPerWorldUnit: () => pxPerWorldUnit(),
      selection: () => state.selection,
      setSelection: (sel) => {
        state.selection = sel;
        syncSelectionPanel();
        requestRender();
      },
      requestRender,
      hexIdStr,
      TERRAIN,
    };
  }

  // ── Render scheduling ─────────────────────────────────────────────────────
  let _renderQueued = false;
  function requestRender(){
    if (_renderQueued) return;
    _renderQueued = true;
    requestAnimationFrame(() => {
      _renderQueued = false;
      const sc = activeScale();
      applyViewBox();
      syncZoomDisplay();
      try { sc && sc.renderer && sc.renderer.render && sc.renderer.render(); }
      catch(e){ console.error('[gcc-map] render error', e); }
    });
  }

  // ── Pan / zoom ────────────────────────────────────────────────────────────
  function setZoom(z, anchor){
    const sc = activeScale();
    if (!sc) return;
    const clamped = Math.max(sc.zoomMin, Math.min(sc.zoomMax, z));
    if (clamped === state.view.zoom) return;
    if (anchor){
      // Keep the anchor world point fixed under the cursor.
      const before = clientToWorld(anchor.x, anchor.y);
      state.view.zoom = clamped;
      const after = clientToWorld(anchor.x, anchor.y);
      if (before && after){
        state.view.cx += before.x - after.x;
        state.view.cy += before.y - after.y;
      }
    } else {
      state.view.zoom = clamped;
    }
    requestRender();
  }
  function zoomBy(factor, anchor){ setZoom(state.view.zoom * factor, anchor); }
  function resetZoom(){
    const sc = activeScale();
    if (sc) setZoom(sc.zoomDefault);
  }

  function onWheel(ev){
    if (!ev.ctrlKey && !ev.metaKey && !ev.altKey){
      // Plain wheel = scroll, not zoom — only intercept with modifier
      // OR when the cursor is inside the canvas (per current subhex-view
      // convention). For the shell we intercept all wheel inside the
      // canvas (no modifier needed) since the canvas isn't scrollable.
      // Modifier-required is a future preference (DESIGN-unified-map.md
      // Slice 9 polish).
    }
    ev.preventDefault();
    const factor = ev.deltaY < 0 ? ZOOM_STEP : (1 / ZOOM_STEP);
    zoomBy(factor, { x: ev.clientX, y: ev.clientY });
  }

  function isPanGesture(ev){
    // Space+drag, middle-click, OR ctrl/meta+drag = pan. Plain primary
    // drag is reserved for future tools (paint, marquee select, etc.).
    return state.spaceHeld || ev.button === 1 || ev.ctrlKey || ev.metaKey;
  }

  function onMouseDown(ev){
    if (!isPanGesture(ev)) return;
    ev.preventDefault();
    state.pan.dragging = true;
    state.pan.startX = ev.clientX;
    state.pan.startY = ev.clientY;
    state.pan.startCx = state.view.cx;
    state.pan.startCy = state.view.cy;
    state.pan.button = ev.button;
    dom.canvas.classList.add('panning');
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(ev){
    if (!state.pan.dragging) return;
    const sc = activeScale(); if (!sc) return;
    const f = sc.pxPerWorldUnit * state.view.zoom;
    const dx = ev.clientX - state.pan.startX;
    const dy = ev.clientY - state.pan.startY;
    state.view.cx = state.pan.startCx - dx / f;
    state.view.cy = state.pan.startCy - dy / f;
    requestRender();
  }

  function onMouseUp(){
    state.pan.dragging = false;
    dom.canvas.classList.remove('panning');
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  function onCoordHover(ev){
    if (!dom.coords) return;
    const w = clientToWorld(ev.clientX, ev.clientY);
    if (w){
      dom.coords.textContent = `world: ${w.x.toFixed(1)}, ${w.y.toFixed(1)}`;
    }
  }
  function onCoordLeave(){
    if (dom.coords) dom.coords.textContent = '—';
  }

  function onKeyDown(ev){
    if (ev.target && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
    if (ev.key === ' ' && !state.spaceHeld){
      state.spaceHeld = true;
      dom.canvas.classList.add('space-held');
      ev.preventDefault();
      return;
    }
    if (ev.key === '+' || ev.key === '=') { zoomBy(ZOOM_STEP); ev.preventDefault(); return; }
    if (ev.key === '-' || ev.key === '_') { zoomBy(1/ZOOM_STEP); ev.preventDefault(); return; }
    if (ev.key === '0') { resetZoom(); ev.preventDefault(); return; }
    // Numeric scale switches: 1 = first registered scale, 2 = second, etc.
    if (/^[1-9]$/.test(ev.key)){
      const idx = parseInt(ev.key, 10) - 1;
      if (idx < _scaleOrder.length){
        setScale(_scaleOrder[idx]);
        ev.preventDefault();
      }
      return;
    }
    // Arrow keys pan
    const sc = activeScale();
    if (!sc) return;
    const stepWorld = PAN_NUDGE_PX / (sc.pxPerWorldUnit * state.view.zoom);
    if (ev.key === 'ArrowLeft'){  state.view.cx -= stepWorld; requestRender(); ev.preventDefault(); }
    if (ev.key === 'ArrowRight'){ state.view.cx += stepWorld; requestRender(); ev.preventDefault(); }
    if (ev.key === 'ArrowUp'){    state.view.cy -= stepWorld; requestRender(); ev.preventDefault(); }
    if (ev.key === 'ArrowDown'){  state.view.cy += stepWorld; requestRender(); ev.preventDefault(); }
  }
  function onKeyUp(ev){
    if (ev.key === ' '){
      state.spaceHeld = false;
      dom.canvas.classList.remove('space-held');
    }
  }

  // ── Panel: scale buttons ──────────────────────────────────────────────────
  function buildScaleButtons(){
    if (!dom.scaleBtns) return;
    dom.scaleBtns.innerHTML = '';
    for (const name of _scaleOrder){
      const sc = _scales.get(name);
      const btn = document.createElement('button');
      btn.className = 'gcc-map-scale-btn';
      btn.dataset.scale = name;
      btn.textContent = sc.label || name;
      btn.title = `Switch to ${sc.label || name} (${sc.hexSize} mi/hex)`;
      btn.addEventListener('click', () => setScale(name));
      dom.scaleBtns.appendChild(btn);
    }
    syncScaleButtons();
  }
  function syncScaleButtons(){
    if (!dom.scaleBtns) return;
    for (const btn of dom.scaleBtns.querySelectorAll('.gcc-map-scale-btn')){
      btn.classList.toggle('active', btn.dataset.scale === state.activeScale);
    }
  }

  // ── Panel: selection ──────────────────────────────────────────────────────
  function syncSelectionPanel(){
    if (!dom.selectionBody) return;
    const sel = state.selection;
    if (!sel){
      dom.selectionBody.innerHTML = '<em>No selection</em>';
      return;
    }
    if (sel.kind === 'parent'){
      const id = (typeof sel.col === 'number' && typeof sel.row === 'number')
        ? hexIdStr(sel.col, sel.row) : `${sel.col},${sel.row}`;
      dom.selectionBody.innerHTML = `<div class="gcc-map-selection-id">${id}</div>`;
      return;
    }
    if (sel.kind === 'subhex'){
      dom.selectionBody.innerHTML = `<div class="gcc-map-selection-id">subhex (${sel.Q},${sel.R})</div>`;
      return;
    }
    dom.selectionBody.innerHTML = '<em>—</em>';
  }

  // ── Back-compat shims ─────────────────────────────────────────────────────
  // Modules not yet migrated read these globals. Keep them alive until
  // each module gets refactored (Slices 5–7). Listed here, not scattered.
  function installBackCompatShims(){
    // window.state.selectedCol / selectedRow — read by gcc-edge-scanner
    // (lines 600 + 909 of v0.6.0). Live getters, no in-shell state copy.
    if (typeof window.state !== 'object' || window.state === null){
      window.state = {};
    }
    Object.defineProperty(window.state, 'selectedCol', {
      configurable: true,
      get(){ return state.selection && state.selection.kind === 'parent' ? state.selection.col : null; },
    });
    Object.defineProperty(window.state, 'selectedRow', {
      configurable: true,
      get(){ return state.selection && state.selection.kind === 'parent' ? state.selection.row : null; },
    });

    // window.imgX (image-align transform) — read by gcc-edge-scanner
    // (line 163). Image-align is parent-renderer's concern (Slice 3); for
    // now expose a default identity transform so edge-scanner's usage
    // doesn't NaN out before image-align lands.
    if (!window.imgX){
      window.imgX = { tx:0, ty:0, sx:1, sy:1, rot:0 };
    }

    // window.rebuildPathOverlay — called by gcc-paths.js on
    // gcc-subhex-changed events (line ~1058 of gcc-paths.js v0.10.1).
    // Slice 3's parent renderer installs the real implementation.
    if (typeof window.rebuildPathOverlay !== 'function'){
      window.rebuildPathOverlay = function(){ /* no-op until Slice 3 */ };
    }

    // hexIdStr / getHexTerrain / getRegion — promoted from inline scope
    // in greyhawk-map.html. Many modules expect these as globals.
    window.hexIdStr = window.hexIdStr || hexIdStr;
    window.getHexTerrain = window.getHexTerrain || function(col, row){
      if (typeof window.GCCTerrain !== 'undefined'){
        const t = window.GCCTerrain.get(col, row);
        if (t) return t;
      }
      return 'plains';
    };
    window.getRegion = window.getRegion || function(col, row){
      return (typeof window.GCCRegions !== 'undefined')
        ? window.GCCRegions.getRegion(col, row)
        : 'Unknown Reaches';
    };
  }

  // ── Wireup ────────────────────────────────────────────────────────────────
  function wireEvents(){
    dom.canvas.addEventListener('wheel', onWheel, { passive: false });
    dom.canvas.addEventListener('mousedown', onMouseDown);
    dom.canvas.addEventListener('mousemove', onCoordHover);
    dom.canvas.addEventListener('mouseleave', onCoordLeave);
    if (dom.zoomIn)    dom.zoomIn.addEventListener('click', () => zoomBy(ZOOM_STEP));
    if (dom.zoomOut)   dom.zoomOut.addEventListener('click', () => zoomBy(1/ZOOM_STEP));
    if (dom.zoomReset) dom.zoomReset.addEventListener('click', resetZoom);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', () => { syncViewportSize(); requestRender(); });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init(){
    if (state.initted) return;
    cacheDom();
    if (!dom.shell || !dom.svg){
      console.warn('[gcc-map] init aborted — shell DOM missing. Page must include #gcc-map-shell with #gcc-map-svg.');
      return;
    }
    installBackCompatShims();
    syncViewportSize();
    buildScaleButtons();
    wireEvents();
    state.initted = true;

    // Pick initial scale: first registered scale, unless caller already
    // set state.activeScale via setScale(). Future Slice 8 reads URL
    // hash here for #scale=NAME.
    if (!state.activeScale && _scaleOrder.length > 0){
      setScale(_scaleOrder[0]);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  function registerScale(spec){
    if (!spec || !spec.name){
      console.error('[gcc-map] registerScale: spec.name is required');
      return false;
    }
    if (_scales.has(spec.name)){
      console.warn('[gcc-map] registerScale: replacing scale', spec.name);
    } else {
      _scaleOrder.push(spec.name);
    }
    const filled = Object.assign({
      label: spec.name,
      hexSize: 1,
      pxPerWorldUnit: 1,
      zoomMin: 0.1,
      zoomMax: 4,
      zoomDefault: 1.0,
      renderer: { mount(){}, render(){}, unmount(){} },
      tools: [],
    }, spec);
    _scales.set(spec.name, filled);
    if (state.initted){
      buildScaleButtons();
      // If this is the first scale registered post-init, activate it.
      if (!state.activeScale) setScale(spec.name);
    }
    return true;
  }

  function setGridDimensions(cols, rows){
    GRID_COLS = cols|0;
    GRID_ROWS = rows|0;
  }

  function centerOn(target, scaleName){
    if (scaleName) setScale(scaleName);
    if (!target) return;
    if (typeof target.x === 'number' && typeof target.y === 'number'){
      state.view.cx = target.x;
      state.view.cy = target.y;
    } else if (typeof target.col === 'number' && typeof target.row === 'number'){
      // Parent center via legacy hexCenter formula. Both renderers should
      // produce world coords matching this convention.
      state.view.cx = HEX_R + target.col * 1.5 * HEX_R;
      state.view.cy = HEX_R * SQRT3/2 + target.row * SQRT3 * HEX_R + ((target.col & 1) ? HEX_R*SQRT3/2 : 0);
    } else if (typeof target.Q === 'number' && typeof target.R === 'number'){
      // Subhex center via gcc-subhex-data.subhexSvgCenter when available.
      if (window.GCCSubhexData && typeof window.GCCSubhexData.subhexSvgCenter === 'function'){
        const c = window.GCCSubhexData.subhexSvgCenter(target.Q, target.R);
        state.view.cx = c.x;
        state.view.cy = c.y;
      }
    }
    requestRender();
  }

  function openParentSubhex(col, row){
    centerOn({ col, row }, 'subhex');
  }

  // Auto-init on DOMContentLoaded so renderers can register before init
  // fires. If renderers register after DOMContentLoaded (async load),
  // registerScale handles the late-arrival case.
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Defer to next tick so renderers on the same script-load batch get
    // a chance to register first.
    setTimeout(init, 0);
  }

  window.GCCMap = {
    // Lifecycle
    init,
    registerScale,
    setGridDimensions,
    // Navigation
    setScale,
    centerOn,
    openParentSubhex,
    activeScale: () => state.activeScale,
    currentSelection: () => state.selection,
    zoomTo: (z, anchor) => setZoom(z, anchor),
    zoomBy: (f, anchor) => zoomBy(f, anchor),
    resetZoom,
    // Internal helpers (renderers may call these directly)
    requestRender,
    hexIdStr,
    TERRAIN,
    HEX_R, SUB_R, SQRT3,
    // Debug / introspection
    _state: state,
    _scales,
  };

})();
