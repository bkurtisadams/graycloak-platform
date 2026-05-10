// gcc-map.js v0.2.2 — 2026-05-10
// v0.2.2 — Slice 4 followup. Pan gesture restored to legacy: right-
// click-drag (button 2) joins space-drag, middle-click, and ctrl/cmd-
// drag. state.pan grows a `moved` flag; mousemove sets it when the
// drag exceeds 3px. New onContextMenu canvas listener suppresses the
// browser context menu when state.pan.moved is true on right-button
// release, so right-click-drag panning doesn't pop a context menu on
// release. Clean right-clicks (no drag) propagate so the parent
// renderer's "Open Subhex View" popup keeps working.
//
// v0.2.1 — Phase B Slice 4 — adds per-scale coordsScale. The parent
// renderer's world coords (HEX_R=20) and the subhex renderer's world
// coords (legacy display-scale, HEX_R*13=260) are not the same unit
// system; coordsScale lets each scale declare its scaling factor
// from the canonical parent-scale world coords. setScale converts
// state.view.cx/cy when switching scales so a single geographic
// point stays under the view center. centerOn multiplies (col,row)
// and (Q,R) targets by the active scale's coordsScale. Default
// coordsScale=1 (parent), subhex registers with coordsScale=13.
//
// v0.2.0 — Phase B Slice 3 prep. Full TERRAIN palette imported from
// greyhawk-map.html (was: 8 placeholder entries). Window-scoped
// back-compat globals hex-edit and other modules need: TERRAIN,
// hexCenter, hexCorners, hexCornersDisplay, mapToHex, mapToStage,
// stageToMap, screenToMap, hexIdStr, darleneColLabel, darleneDiagonal,
// darleneToInternal, computeStageBounds, makeDraggable, showToast.
// In the unified shell, mapToStage/stageToMap are the identity (no
// label-pad offset; the SVG viewBox owns world coords directly), so
// hex-edit's `mapToStage(hexCenter(...))` paths render correctly at
// world-coord positions in the renderer's SVG.
//
// v0.1.0 — Slice 2 unified shell scaffold. See DESIGN-unified-map.md
// revision 2 for the full design. Public surface: window.GCCMap.

(function(){
  'use strict';

  // ── World-coord constants (shared with data layer) ────────────────────────
  const HEX_R = 20;
  const SUB_R = 2;
  const SQRT3 = Math.sqrt(3);
  const ZOOM_STEP = 1.25;
  const PAN_NUDGE_PX = 80;

  // Greyhawk grid dimensions. Other maps (Gamma World, future campaigns)
  // override via GCCMap.setGridDimensions(cols, rows). MAP_W / MAP_H are
  // derived for stage bounds + image dimensions.
  let GRID_COLS = 146, GRID_ROWS = 97;
  let MAP_W = Math.ceil((GRID_COLS - 1) * 1.5 * HEX_R + 2 * HEX_R);
  let MAP_H = Math.ceil(GRID_ROWS * SQRT3 * HEX_R + SQRT3 * HEX_R / 2);

  // Calibration — kept as a mutable object so the parent renderer's image-
  // align tool (Slice 5) can adjust offsets if a different map is loaded.
  // Default offsets place col=0,row=0 hex center at world (HEX_R, HEX_R*√3/2).
  const cal = { hexSize: HEX_R, offsetX: HEX_R, offsetY: HEX_R * SQRT3 / 2 };

  // ── TERRAIN palette ──────────────────────────────────────────────────────
  // Full canon palette imported from greyhawk-map.html line 1002. Every
  // entry has rgb (CSS rgb triple) + label (UI string) + difficulty (DMG
  // OUTDOOR MOVEMENT category — null for water types where ship rates take
  // over). Renderers compose `rgba(rgb, --hex-paint-alpha)` for cell fills;
  // travel-time helpers read difficulty.
  const TERRAIN = {
    clear:        { label:'Clear/Road',          difficulty:'normal',      rgb:'245, 232, 190' },
    plains:       { label:'Plains',              difficulty:'normal',      rgb:'195, 215, 100' },
    forest:       { label:'Forest',              difficulty:'rugged',      rgb:'70, 120, 55'   },
    hardwood:     { label:'Hardwood Forest',     difficulty:'rugged',      rgb:'100, 150, 70'  },
    conifer:      { label:'Conifer Forest',      difficulty:'rugged',      rgb:'50, 100, 55'   },
    jungle:       { label:'Jungle',              difficulty:'very_rugged', rgb:'35, 75, 40'    },
    hills:        { label:'Hills',               difficulty:'rugged',      rgb:'150, 120, 80'  },
    forest_hills: { label:'Forested Hills',      difficulty:'very_rugged', rgb:'120, 130, 80'  },
    mountains:    { label:'Mountains',           difficulty:'very_rugged', rgb:'110, 90, 75'   },
    desert:       { label:'Desert',              difficulty:'normal',      rgb:'220, 150, 90'  },
    barrens:      { label:'Barrens',             difficulty:'normal',      rgb:'175, 140, 95'  },
    swamp:        { label:'Swamp/Marsh',         difficulty:'very_rugged', rgb:'90, 100, 65'   },
    water:             { label:'Water (generic)',     difficulty:null, rgb:'55, 105, 155' },
    water_fresh:       { label:'Fresh (river/lake)',  difficulty:null, rgb:'90, 165, 175' },
    water_inland_sea:  { label:'Inland Sea',          difficulty:null, rgb:'70, 140, 175' },
    water_coastal:     { label:'Coastal',             difficulty:null, rgb:'85, 130, 165' },
    water_shallow:     { label:'Shallow Sea',         difficulty:null, rgb:'55, 110, 160' },
    water_deep:        { label:'Deep Sea',            difficulty:null, rgb:'35, 75, 130'  },
  };

  // ── Scale registry ────────────────────────────────────────────────────────
  const _scales = new Map();
  const _scaleOrder = [];

  // ── State ─────────────────────────────────────────────────────────────────
  const state = {
    activeScale: null,
    view: { cx: 0, cy: 0, zoom: 1.0, perScaleZoom: {}, w: 0, h: 0 },
    selection: null,
    pan: { dragging:false, moved:false, startX:0, startY:0, startCx:0, startCy:0, button:null },
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
      toast:        $('toast'),
    };
  }

  // ── Geometry — shared with parent renderer + back-compat globals ──────────
  function colStep(){ return cal.hexSize * 1.5; }
  function rowStep(){ return cal.hexSize * SQRT3; }
  function hexCenter(col, row){
    return {
      x: cal.offsetX + col * colStep(),
      y: cal.offsetY + row * rowStep() + (col & 1 ? rowStep() * 0.5 : 0),
    };
  }
  function hexCorners(cx, cy){
    return Array.from({length:6}, (_, i) => {
      const a = (Math.PI / 180) * (60 * i);
      return [cx + cal.hexSize * Math.cos(a), cy + cal.hexSize * Math.sin(a)];
    });
  }
  function hexCornersDisplay(col, row){
    const c = hexCenter(col, row);
    return hexCorners(c.x, c.y);
  }
  function mapToHex(mx, my){
    const cs = colStep(), rs = rowStep();
    let bestCol = 0, bestRow = 0, bestDist = Infinity;
    const estCol = Math.round((mx - cal.offsetX) / cs);
    const cMin = Math.max(0, estCol - 1);
    const cMax = Math.min(GRID_COLS - 1, estCol + 1);
    for (let c = cMin; c <= cMax; c++){
      const estRow = Math.round((my - cal.offsetY - (c & 1 ? rs * 0.5 : 0)) / rs);
      const rMin = Math.max(0, estRow - 1);
      const rMax = Math.min(GRID_ROWS - 1, estRow + 1);
      for (let r = rMin; r <= rMax; r++){
        const { x, y } = hexCenter(c, r);
        const d = (mx - x) * (mx - x) + (my - y) * (my - y);
        if (d < bestDist){ bestDist = d; bestCol = c; bestRow = r; }
      }
    }
    if (bestDist > cal.hexSize * cal.hexSize) return null;
    return { col: bestCol, row: bestRow };
  }
  function darleneColLabel(col){
    const idx = (GRID_COLS - 1) - col;
    const letter = String.fromCharCode(65 + (idx % 26));
    const rep = Math.floor(idx / 26) + 1;
    return rep === 1 ? letter : letter + rep;
  }
  function darleneDiagonal(col, row){
    const k = (GRID_COLS - 1) - col;
    const offset = k === 0 ? 0 : Math.floor(k / 2) + 1;
    return row + 1 + offset;
  }
  function darleneToInternal(label){
    const m = String(label || '').trim().toUpperCase().match(/^([A-Z])(\d*)-(\d+)$/);
    if (!m) return null;
    const idx = (m[2] ? +m[2] - 1 : 0) * 26 + (m[1].charCodeAt(0) - 65);
    const col = (GRID_COLS - 1) - idx;
    const offset = idx === 0 ? 0 : Math.floor(idx / 2) + 1;
    const row = +m[3] - 1 - offset;
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return { col, row };
  }
  function hexIdStr(col, row){
    return `${darleneColLabel(col)}-${darleneDiagonal(col, row)}`;
  }
  // computeStageBounds — back-compat shim. In the unified shell the SVG
  // viewBox owns world coords directly, so stageBounds is just the world
  // extent (no label-pad shift). Returns the same shape legacy code expects.
  function computeStageBounds(){
    const left = cal.offsetX - cal.hexSize - 4;
    const top  = cal.offsetY - rowStep() * 0.5 - 4;
    const lastCol = GRID_COLS - 1, lastRow = GRID_ROWS - 1;
    const right = cal.offsetX + lastCol * colStep() + cal.hexSize + 4;
    const bottom = cal.offsetY + lastRow * rowStep()
                 + (lastCol & 1 ? rowStep() * 0.5 : 0) + rowStep() * 0.5 + 4;
    const sb = {
      minX: Math.min(0, left), minY: Math.min(0, top),
      maxX: Math.max(MAP_W, right), maxY: Math.max(MAP_H, bottom),
    };
    sb.width  = Math.ceil(sb.maxX - sb.minX);
    sb.height = Math.ceil(sb.maxY - sb.minY);
    return sb;
  }
  // mapToStage / stageToMap — identity in the unified shell. Legacy main-map
  // offset world coords by stageBounds.minX/Y so the SVG viewBox could start
  // at (0,0) with label-pad on top. Unified shell uses SVG viewBox in world
  // coords directly; no offset. Kept as functions so `mapToStage(hexCenter(...))`
  // callsites in hex-edit still work.
  function mapToStage(x, y){ return { x, y }; }
  function stageToMap(x, y){ return { x, y }; }

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
    if (!sc) return;
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
  // screenToMap — back-compat for hex-edit click handlers. Returns world
  // coords (legacy "map" coords). When unified shell isn't initted, falls
  // back to identity (caller's clientX/clientY treated as world coords —
  // wrong but won't NaN).
  function screenToMap(sx, sy){
    const w = clientToWorld(sx, sy);
    return w || { x: sx, y: sy };
  }

  // ── Scale switch ──────────────────────────────────────────────────────────
  function setScale(name, opts){
    if (!_scales.has(name)){
      console.warn('[gcc-map] setScale: unknown scale', name);
      return false;
    }
    if (state.activeScale === name) return true;
    opts = opts || {};
    const prev = state.activeScale ? _scales.get(state.activeScale) : null;
    const next = _scales.get(name);
    if (prev){
      state.view.perScaleZoom[prev.name] = state.view.zoom;
      try { prev.renderer && prev.renderer.unmount && prev.renderer.unmount(); }
      catch(e){ console.error('[gcc-map] unmount error', e); }
    }
    state.activeScale = name;
    // World-coord systems differ per scale: parent uses raw hex world
    // units, subhex uses display-scaled px units (legacy v3.1.0
    // compatibility, so gcc-subhex.css pixel sizes stay correct).
    // Convert the persisted cx/cy when crossing scales so the same
    // geographic point stays under the view center.
    const prevScale = prev ? (prev.coordsScale || 1) : 1;
    const nextScale = next.coordsScale || 1;
    if (prevScale !== nextScale){
      state.view.cx *= (nextScale / prevScale);
      state.view.cy *= (nextScale / prevScale);
    }
    state.view.zoom = state.view.perScaleZoom[name] != null
      ? state.view.perScaleZoom[name]
      : next.zoomDefault;
    state.selection = null;
    syncSelectionPanel();
    syncScaleButtons();
    try { next.renderer && next.renderer.mount && next.renderer.mount(dom.svg, rendererCtx()); }
    catch(e){ console.error('[gcc-map] mount error', e); }
    applyViewBox();
    syncZoomDisplay();
    requestRender();
    return true;
  }

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
          minX: state.view.cx - halfW, maxX: state.view.cx + halfW,
          minY: state.view.cy - halfH, maxY: state.view.cy + halfH,
        };
      },
      worldCenter: () => ({ x: state.view.cx, y: state.view.cy }),
      zoom: () => state.view.zoom,
      pxPerWorldUnit: () => pxPerWorldUnit(),
      clientToWorld,
      selection: () => state.selection,
      setSelection: (sel) => {
        state.selection = sel;
        syncSelectionPanel();
        requestRender();
      },
      requestRender,
      hexIdStr, hexCenter, hexCorners, hexCornersDisplay, mapToHex,
      darleneColLabel, darleneDiagonal, darleneToInternal,
      mapToStage, stageToMap,
      TERRAIN,
      cal, MAP_W: () => MAP_W, MAP_H: () => MAP_H,
      GRID_COLS: () => GRID_COLS, GRID_ROWS: () => GRID_ROWS,
      HEX_R, SUB_R, SQRT3,
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
    ev.preventDefault();
    const factor = ev.deltaY < 0 ? ZOOM_STEP : (1 / ZOOM_STEP);
    zoomBy(factor, { x: ev.clientX, y: ev.clientY });
  }
  function isPanGesture(ev){
    return state.spaceHeld || ev.button === 1 || ev.button === 2 || ev.ctrlKey || ev.metaKey;
  }
  function onMouseDown(ev){
    if (!isPanGesture(ev)) return;
    ev.preventDefault();
    state.pan.dragging = true;
    state.pan.moved = false;
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
    if (!state.pan.moved && Math.abs(dx) + Math.abs(dy) > 3) state.pan.moved = true;
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
  // Suppress the browser context menu when right-drag pan actually
  // moved the view. Clean right-clicks (no drag) propagate so the
  // parent renderer's "Open Subhex View" popup still works.
  function onContextMenu(ev){
    if (state.pan.moved){
      ev.preventDefault();
      ev.stopPropagation();
      state.pan.moved = false;
    }
  }
  function onCoordHover(ev){
    if (!dom.coords) return;
    const w = clientToWorld(ev.clientX, ev.clientY);
    if (w){
      const h = mapToHex(w.x, w.y);
      if (h) dom.coords.textContent = hexIdStr(h.col, h.row);
      else   dom.coords.textContent = `world: ${w.x.toFixed(1)}, ${w.y.toFixed(1)}`;
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
    if (/^[1-9]$/.test(ev.key)){
      const idx = parseInt(ev.key, 10) - 1;
      if (idx < _scaleOrder.length){ setScale(_scaleOrder[idx]); ev.preventDefault(); }
      return;
    }
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

  function syncSelectionPanel(){
    if (!dom.selectionBody) return;
    const sel = state.selection;
    if (!sel){ dom.selectionBody.innerHTML = '<em>No selection</em>'; return; }
    if (sel.kind === 'parent'){
      const id = (typeof sel.col === 'number' && typeof sel.row === 'number')
        ? hexIdStr(sel.col, sel.row) : `${sel.col},${sel.row}`;
      const terrain = (typeof window.getHexTerrain === 'function')
        ? window.getHexTerrain(sel.col, sel.row) : '—';
      const region = (typeof window.getRegion === 'function')
        ? window.getRegion(sel.col, sel.row) : '—';
      const tLabel = TERRAIN[terrain]?.label || terrain;
      dom.selectionBody.innerHTML = `<div class="gcc-map-selection-id">${id}</div><div class="gcc-map-selection-row"><span>Terrain:</span><span>${tLabel}</span></div><div class="gcc-map-selection-row"><span>Region:</span><span>${region}</span></div>`;
      return;
    }
    if (sel.kind === 'subhex'){
      dom.selectionBody.innerHTML = `<div class="gcc-map-selection-id">subhex (${sel.Q},${sel.R})</div>`;
      return;
    }
    dom.selectionBody.innerHTML = '<em>—</em>';
  }

  // ── Toast (back-compat utility) ───────────────────────────────────────────
  let _tt = null;
  function showToast(msg){
    const t = dom?.toast || document.getElementById('toast');
    if (!t){ console.log('[toast]', msg); return; }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(_tt);
    _tt = setTimeout(() => t.classList.remove('show'), 3500);
  }

  // ── makeDraggable (back-compat utility — used by hex-edit, side panels) ──
  function makeDraggable(target, handle, key){
    const st = { active:false, sx:0, sy:0, startX:0, startY:0 };
    const load = () => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch(e){ return null; } };
    const save = (x, y) => { try { localStorage.setItem(key, JSON.stringify({ x, y })); } catch(e){} };
    const topOffset = () => ((document.getElementById('gcc-bar')?.offsetHeight || 44) + 4);
    const clamp = (x, y) => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const w = target.offsetWidth || 240, h = target.offsetHeight || 120;
      const top = topOffset();
      return { x: Math.max(4, Math.min(vw - w - 4, x)), y: Math.max(top, Math.min(vh - h - 4, y)) };
    };
    const place = (x, y) => {
      const c = clamp(x, y);
      target.style.left = c.x + 'px'; target.style.top = c.y + 'px';
      target.style.right = ''; target.style.bottom = ''; target.style.transform = '';
    };
    const placeCenter = () => {
      const w = target.offsetWidth || 240, h = target.offsetHeight || 120;
      const top = topOffset();
      place((window.innerWidth - w) / 2, top + Math.max(0, (window.innerHeight - top - h) / 2));
    };
    const restore = () => {
      const p = load();
      if (p && typeof p.x === 'number'){ place(p.x, p.y); return true; }
      return false;
    };
    const reset = () => { try { localStorage.removeItem(key); } catch(e){} };
    const onDown = (cx, cy) => {
      st.active = true; st.sx = cx; st.sy = cy;
      const r = target.getBoundingClientRect();
      st.startX = r.left; st.startY = r.top;
      handle.classList.add('dragging');
    };
    const onMove = (cx, cy) => {
      if (!st.active) return;
      place(st.startX + (cx - st.sx), st.startY + (cy - st.sy));
    };
    const onUp = () => {
      if (!st.active) return;
      st.active = false;
      handle.classList.remove('dragging');
      const r = target.getBoundingClientRect();
      save(r.left, r.top);
    };
    handle.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      if (e.target.closest('button')) return;
      e.preventDefault();
      onDown(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onUp);
    handle.addEventListener('dblclick', () => {
      reset();
      target.style.left = ''; target.style.top = '';
      target.style.right = ''; target.style.bottom = ''; target.style.transform = '';
      showToast('Position reset');
    });
    return { restore, place, placeCenter, reset };
  }

  // ── Back-compat shims ─────────────────────────────────────────────────────
  function installBackCompatShims(){
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
    if (!window.imgX){
      window.imgX = { tx:0, ty:0, sx:1, sy:1, rot:0 };
    }
    if (typeof window.rebuildPathOverlay !== 'function'){
      window.rebuildPathOverlay = function(){ /* parent renderer installs the real impl on mount */ };
    }
    // Geometry + grid globals — promoted from greyhawk-map.html inline scope.
    window.HEX_R = HEX_R;
    window.GRID_COLS = GRID_COLS;
    window.GRID_ROWS = GRID_ROWS;
    window.MAP_W = MAP_W;
    window.MAP_H = MAP_H;
    Object.defineProperty(window, 'stageBounds', {
      configurable: true,
      get(){ return computeStageBounds(); },
    });
    window.gridSize = () => ({ cols: GRID_COLS, rows: GRID_ROWS });
    window.hexIdStr = hexIdStr;
    window.hexCenter = hexCenter;
    window.hexCenterDisplay = hexCenter;
    window.hexCorners = hexCorners;
    window.hexCornersDisplay = hexCornersDisplay;
    window.mapToHex = mapToHex;
    window.darleneColLabel = darleneColLabel;
    window.darleneDiagonal = darleneDiagonal;
    window.darleneToInternal = darleneToInternal;
    window.mapToStage = mapToStage;
    window.stageToMap = stageToMap;
    window.screenToMap = screenToMap;
    window.computeStageBounds = computeStageBounds;
    window.makeDraggable = makeDraggable;
    window.showToast = showToast;
    window.TERRAIN = TERRAIN;
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

  function wireEvents(){
    dom.canvas.addEventListener('wheel', onWheel, { passive: false });
    dom.canvas.addEventListener('mousedown', onMouseDown);
    dom.canvas.addEventListener('mousemove', onCoordHover);
    dom.canvas.addEventListener('mouseleave', onCoordLeave);
    dom.canvas.addEventListener('contextmenu', onContextMenu);
    if (dom.zoomIn)    dom.zoomIn.addEventListener('click', () => zoomBy(ZOOM_STEP));
    if (dom.zoomOut)   dom.zoomOut.addEventListener('click', () => zoomBy(1/ZOOM_STEP));
    if (dom.zoomReset) dom.zoomReset.addEventListener('click', resetZoom);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', () => { syncViewportSize(); requestRender(); });
  }

  function init(){
    if (state.initted) return;
    cacheDom();
    if (!dom.shell || !dom.svg){
      console.warn('[gcc-map] init aborted — shell DOM missing.');
      return;
    }
    installBackCompatShims();
    syncViewportSize();
    buildScaleButtons();
    wireEvents();
    state.initted = true;
    if (!state.activeScale && _scaleOrder.length > 0){
      setScale(_scaleOrder[0]);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  function registerScale(spec){
    if (!spec || !spec.name){ console.error('[gcc-map] registerScale: spec.name is required'); return false; }
    if (_scales.has(spec.name)){ console.warn('[gcc-map] registerScale: replacing scale', spec.name); }
    else { _scaleOrder.push(spec.name); }
    const filled = Object.assign({
      label: spec.name, hexSize: 1, pxPerWorldUnit: 1,
      coordsScale: 1,
      zoomMin: 0.1, zoomMax: 4, zoomDefault: 1.0,
      renderer: { mount(){}, render(){}, unmount(){} },
      tools: [],
    }, spec);
    _scales.set(spec.name, filled);
    if (state.initted){
      buildScaleButtons();
      if (!state.activeScale) setScale(spec.name);
    }
    return true;
  }
  function setGridDimensions(cols, rows){
    GRID_COLS = cols | 0;
    GRID_ROWS = rows | 0;
    MAP_W = Math.ceil((GRID_COLS - 1) * 1.5 * HEX_R + 2 * HEX_R);
    MAP_H = Math.ceil(GRID_ROWS * SQRT3 * HEX_R + SQRT3 * HEX_R / 2);
    window.GRID_COLS = GRID_COLS; window.GRID_ROWS = GRID_ROWS;
    window.MAP_W = MAP_W; window.MAP_H = MAP_H;
  }
  function centerOn(target, scaleName){
    if (scaleName) setScale(scaleName);
    if (!target) return;
    const sc = activeScale();
    const s = sc ? (sc.coordsScale || 1) : 1;
    if (typeof target.x === 'number' && typeof target.y === 'number'){
      state.view.cx = target.x; state.view.cy = target.y;
    } else if (typeof target.col === 'number' && typeof target.row === 'number'){
      const c = hexCenter(target.col, target.row);
      state.view.cx = c.x * s; state.view.cy = c.y * s;
    } else if (typeof target.Q === 'number' && typeof target.R === 'number'){
      if (window.GCCSubhexData && typeof window.GCCSubhexData.subhexSvgCenter === 'function'){
        const c = window.GCCSubhexData.subhexSvgCenter(target.Q, target.R);
        state.view.cx = c.x * s; state.view.cy = c.y * s;
      }
    }
    requestRender();
  }
  function openParentSubhex(col, row){
    centerOn({ col, row }, 'subhex');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

  window.GCCMap = {
    init, registerScale, setGridDimensions,
    setScale, centerOn, openParentSubhex,
    activeScale: () => state.activeScale,
    currentSelection: () => state.selection,
    zoomTo: (z, anchor) => setZoom(z, anchor),
    zoomBy: (f, anchor) => zoomBy(f, anchor),
    resetZoom,
    requestRender,
    hexIdStr, hexCenter, hexCorners, mapToHex,
    showToast, makeDraggable,
    TERRAIN, HEX_R, SUB_R, SQRT3,
    cal,
    _state: state, _scales,
  };

})();
