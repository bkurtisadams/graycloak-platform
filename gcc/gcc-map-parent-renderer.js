// gcc-map-parent-renderer.js v1.0.0 — 2026-05-09
// Phase B Slice 3 — real parent-scale renderer extracted from
// greyhawk-map.html inline JS. Lifts buildHexGrid, buildLandmarkOverlay,
// buildPathOverlay, buildJourneyOverlay, buildCoordLabels,
// updatePartyMarker, hex events, image transform application + history,
// and the SVG hex context menu into a single renderer module that
// registers with GCCMap as 'parent' scale.
//
// What's in:
//   - Darlene scan (SVG <image>) with imgX transform + persistence
//     (load/save). Editing the alignment is Slice 5 (tool); rendering
//     and persistence live here so the image always lands correctly.
//   - Full hex grid (146x97 polygons) with terrain paint, fog,
//     selection, party-hex, journey-hex/end classes
//   - Path overlay (rivers + roads + crossings) via GCCPaths
//   - Landmark overlay via GCCLandmarks
//   - Journey route polyline + destination bullseye via state.journey
//   - Coord labels along the four edges
//   - Party marker (red dot + pulse) at state.partyCol/Row
//   - Hex hover (coord readout) + click (selection + dialogs)
//   - Right-click hex context menu ("Open Subhex View")
//   - Edge flags overlay (gcc-edges.js) re-built into the parent layer
//   - Real window.rebuildPathOverlay / rebuildLandmarkOverlay /
//     rebuildGrid / buildHexGrid back-compat globals (replacing the
//     no-op shims gcc-map.js v0.2.0 installs)
//
// What's out (lands later):
//   - Image-align edit UI (mode toggle, nudge/scale/rotate, history
//     dropdown, download state) — Slice 5 tool
//   - Move dialog flow — kept as legacy modal in greyhawk-map.html;
//     when unified-map.html replaces greyhawk-map.html in Slice 7,
//     the modal HTML moves with it
//   - Subhex-grain journey rendering — Phase B Slice 4 + journey
//     planner extension
//   - Tools UI — Slice 5 (Hex Editor, Edges, Coast, Voyage, etc.
//     register via tool registry then)
//   - Side panel "Move Here / Plan Journey / etc." action buttons —
//     wired via tool registry in Slice 5
//
// Coordinate convention: world coords throughout. The unified shell's
// SVG viewBox owns pan/zoom; this renderer just emits world-coord
// SVG geometry and lets the shell scale it. Legacy mapToStage(...)
// callsites still work because gcc-map.js v0.2.0 makes mapToStage
// the identity (no label-pad offset; world coords are SVG coords).

(function(){
  'use strict';
  if (!window.GCCMap){
    console.error('[parent-renderer] GCCMap missing — load gcc-map.js first');
    return;
  }

  // ── Module state ──────────────────────────────────────────────────────────
  let _ctx = null;
  let _root = null;
  let _layers = {};         // named <g> per draw layer
  let _imageGroup = null;   // the <g> wrapping <image> (gets imgX transform)
  let _imageEl = null;

  // imgX — the persistent image transform. Owns its own state (not in
  // gcc-map.js's state object) since image-align is a parent-scale
  // concern. Default is the canonical aligned transform from
  // greyhawk-map.html line 1371 (Apr 2026 alignment pass).
  const imgX = {
    tx: -0.081475302718232,
    ty: -42.38657072504594,
    sx: 1.0427791124276655,
    sy: 1.053243463445003,
    rot: 0,
  };

  function loadImgTransform(){
    try {
      const saved = JSON.parse(localStorage.getItem('gh-img-xform') || 'null');
      if (saved && typeof saved.tx === 'number'){
        imgX.tx = saved.tx; imgX.ty = saved.ty;
        imgX.sx = saved.sx || 1; imgX.sy = saved.sy || 1;
        imgX.rot = saved.rot || 0;
      }
    } catch(e){}
  }
  function saveImgTransform(){
    try { localStorage.setItem('gh-img-xform', JSON.stringify(imgX)); } catch(e){}
  }
  // Apply imgX as an SVG transform on the wrapping group. Matches the
  // legacy CSS transform (transform-origin: center center) by composing:
  //   translate(tx,ty) translate(cx,cy) rotate(rot) scale(sx,sy) translate(-cx,-cy)
  // where (cx, cy) is image center — MAP_W/2, MAP_H/2.
  function applyImgTransform(){
    if (!_imageGroup) return;
    const cx = _ctx.MAP_W() / 2;
    const cy = _ctx.MAP_H() / 2;
    const tr = `translate(${imgX.tx},${imgX.ty}) translate(${cx},${cy}) rotate(${imgX.rot}) scale(${imgX.sx},${imgX.sy}) translate(${-cx},${-cy})`;
    _imageGroup.setAttribute('transform', tr);
  }

  // ── Layer construction ────────────────────────────────────────────────────
  function ensureLayer(name){
    if (_layers[name]) return _layers[name];
    const ns = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', `gcc-map-parent-${name}-layer`);
    g.id = `gcc-map-parent-${name}`;
    _layers[name] = g;
    _root.appendChild(g);
    return g;
  }

  // ── buildHexGrid ──────────────────────────────────────────────────────────
  // Builds the parent hex grid, paths, labels, coord labels, landmarks,
  // journey overlay, edge flags, and party marker. Equivalent to the
  // legacy buildHexGrid in greyhawk-map.html line 2459, restructured
  // to mount layers into the renderer's _root group rather than
  // operating on a top-level #hex-svg. The order of svg.appendChild
  // calls in the legacy is preserved as the order layers are appended
  // to _root, so z-stacking matches.
  function buildHexGrid(){
    if (!_root) return;
    const ns = 'http://www.w3.org/2000/svg';
    const TERRAIN = window.TERRAIN;
    const hexCenter = window.hexCenter;
    const hexCornersDisplay = window.hexCornersDisplay;
    const hexIdStr = window.hexIdStr;

    // Wipe existing content layers (image group stays — its transform
    // persists across rebuilds)
    for (const n of ['cells','paths','labels','coordLabels','landmarks','journey','edgeFlags','partyMarker']){
      const old = _layers[n];
      if (old && old.parentNode) old.parentNode.removeChild(old);
      delete _layers[n];
    }

    const cellsG  = ensureLayer('cells');
    const labelsG = ensureLayer('labels');
    const showLabels = !!(window.state && window.state.showLabels);
    labelsG.style.display = showLabels ? '' : 'none';

    const sel = window.GCCMap.currentSelection();
    const selCol = (sel && sel.kind === 'parent') ? sel.col : null;
    const selRow = (sel && sel.kind === 'parent') ? sel.row : null;

    const cols = window.GRID_COLS;
    const rows = window.GRID_ROWS;
    for (let col = 0; col < cols; col++){
      for (let row = 0; row < rows; row++){
        const c = hexCenter(col, row);
        const cornersD = hexCornersDisplay(col, row);
        const pts = cornersD.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
        const poly = document.createElementNS(ns, 'polygon');
        poly.setAttribute('points', pts);
        let cls = 'hex-cell';
        if (window.state?.hexData?.[`${col}-${row}`]?.explored) cls += ' explored';
        if (selCol === col && selRow === row) cls += ' selected';
        if (window.GCCFog && window.GCCFog.shouldFogParent && window.GCCFog.shouldFogParent(col, row)){
          cls += ' fogged';
        }
        poly.setAttribute('class', cls);
        poly.dataset.col = col; poly.dataset.row = row;
        poly.id = `hex-${col}-${row}`;
        if (window.GCCTerrain){
          const t = window.GCCTerrain.get(col, row);
          if (t && TERRAIN[t]?.rgb) poly.style.setProperty('--hex-paint-rgb', TERRAIN[t].rgb);
        }
        cellsG.appendChild(poly);

        const txt = document.createElementNS(ns, 'text');
        txt.setAttribute('x', c.x.toFixed(1));
        txt.setAttribute('y', c.y.toFixed(1));
        txt.setAttribute('class', 'hex-label');
        txt.textContent = hexIdStr(col, row);
        labelsG.appendChild(txt);
      }
    }

    // Path / coord / landmark / journey layers built next so they
    // stack above hex cells but below party marker.
    buildPathOverlay();
    buildCoordLabels();
    buildLandmarkOverlay();
    buildJourneyOverlay();

    // Edge flags overlay (gcc-edges.js own render) — call its rebuild
    // hook so dots survive a full grid rebuild (calibration changes).
    if (window.GCCEdges && typeof window.GCCEdges.rebuildOverlay === 'function'){
      try { window.GCCEdges.rebuildOverlay(); } catch(e){ console.warn('[parent-renderer] GCCEdges.rebuildOverlay failed', e); }
    }

    // Party marker on top.
    buildPartyMarker();
    applyJourneyHexClasses();
    updatePartyMarker();
  }

  // ── buildPathOverlay ──────────────────────────────────────────────────────
  function buildPathOverlay(){
    const ns = 'http://www.w3.org/2000/svg';
    const old = _layers.paths;
    if (old && old.parentNode) old.parentNode.removeChild(old);
    const g = ensureLayer('paths');
    g.style.pointerEvents = 'none';
    if (typeof window.GCCPaths === 'undefined') return g;
    const hexCenter = window.hexCenter;

    // Roads first so rivers paint over shared hexes.
    if (typeof window.GCCPaths.allRoadNames === 'function'){
      for (const name of window.GCCPaths.allRoadNames()){
        const chain = window.GCCPaths.getRoadChain(name);
        if (!chain || chain.length < 2) continue;
        const info = window.GCCPaths.getRoadInfo(name);
        const cls = info && info.kind === 'track' ? 'path-track' : 'path-road';
        const pts = chain.map(h => {
          const c = hexCenter(h.col, h.row);
          return `${c.x.toFixed(1)},${c.y.toFixed(1)}`;
        }).join(' ');
        const poly = document.createElementNS(ns, 'polyline');
        poly.setAttribute('points', pts);
        poly.setAttribute('class', cls);
        poly.dataset.name = name;
        g.appendChild(poly);
      }
    }
    for (const name of window.GCCPaths.allRiverNames()){
      const chain = window.GCCPaths.getRiverChain(name);
      if (!chain || chain.length < 1) continue;
      const info = window.GCCPaths.getRiverInfo(name);
      const w = info.type === 'great_river' ? 3.4
              : info.type === 'river'       ? 2.4
              :                                1.5;
      if (chain.length >= 2){
        const pts = chain.map(h => {
          const c = hexCenter(h.col, h.row);
          return `${c.x.toFixed(1)},${c.y.toFixed(1)}`;
        }).join(' ');
        const poly = document.createElementNS(ns, 'polyline');
        poly.setAttribute('points', pts);
        poly.setAttribute('class', 'path-river');
        poly.setAttribute('stroke-width', w);
        poly.dataset.name = name;
        g.appendChild(poly);
      } else {
        const c = hexCenter(chain[0].col, chain[0].row);
        const dot = document.createElementNS(ns, 'circle');
        dot.setAttribute('cx', c.x); dot.setAttribute('cy', c.y);
        dot.setAttribute('r', w);
        dot.setAttribute('class', 'path-river');
        g.appendChild(dot);
      }
    }
    if (typeof window.GCCPaths.allCrossings === 'function'){
      for (const cr of window.GCCPaths.allCrossings()){
        const ca = hexCenter(cr.hexA.col, cr.hexA.row);
        const cb = hexCenter(cr.hexB.col, cr.hexB.row);
        const mx = (ca.x + cb.x) * 0.5, my = (ca.y + cb.y) * 0.5;
        const dx = cb.x - ca.x, dy = cb.y - ca.y;
        const angDeg = Math.atan2(dy, dx) * 180 / Math.PI;
        const cg = document.createElementNS(ns, 'g');
        cg.setAttribute('transform', `translate(${mx.toFixed(1)},${my.toFixed(1)}) rotate(${angDeg.toFixed(1)})`);
        cg.setAttribute('class', `path-cross path-cross-${cr.kind}`);
        if (cr.name) cg.dataset.name = cr.name;
        if (cr.kind === 'bridge'){
          const r = document.createElementNS(ns, 'rect');
          r.setAttribute('x', -2.4); r.setAttribute('y', -7);
          r.setAttribute('width', 4.8); r.setAttribute('height', 14);
          r.setAttribute('rx', 1);
          cg.appendChild(r);
        } else if (cr.kind === 'footbridge'){
          const r = document.createElementNS(ns, 'rect');
          r.setAttribute('x', -1.5); r.setAttribute('y', -6);
          r.setAttribute('width', 3); r.setAttribute('height', 12);
          cg.appendChild(r);
        } else if (cr.kind === 'ford'){
          for (const xo of [-1.6, 1.6]){
            const ln = document.createElementNS(ns, 'line');
            ln.setAttribute('x1', xo); ln.setAttribute('y1', -6);
            ln.setAttribute('x2', xo); ln.setAttribute('y2',  6);
            cg.appendChild(ln);
          }
        } else if (cr.kind === 'ferry'){
          const c = document.createElementNS(ns, 'circle');
          c.setAttribute('cx', 0); c.setAttribute('cy', 0);
          c.setAttribute('r', 3.6);
          cg.appendChild(c);
          const ln = document.createElementNS(ns, 'line');
          ln.setAttribute('x1', 0); ln.setAttribute('y1', -2.2);
          ln.setAttribute('x2', 0); ln.setAttribute('y2',  2.2);
          cg.appendChild(ln);
        }
        g.appendChild(cg);
      }
    }
    return g;
  }
  function rebuildPathOverlay(){ buildPathOverlay(); }

  // ── buildCoordLabels ──────────────────────────────────────────────────────
  // Renders Darlene-style edge labels (column letters top, diagonal numbers
  // sides+bottom). Hidden by default; toggled via body.coords-shown.
  // LABEL_OFFSET distance from each hex edge into the surrounding margin.
  function buildCoordLabels(){
    const ns = 'http://www.w3.org/2000/svg';
    const old = _layers.coordLabels;
    if (old && old.parentNode) old.parentNode.removeChild(old);
    const g = ensureLayer('coordLabels');
    g.style.pointerEvents = 'none';
    const hexCenter = window.hexCenter;
    const cal = window.GCCMap.cal;
    const cols = window.GRID_COLS, rows = window.GRID_ROWS;
    const LABEL_OFFSET = 22;

    for (let c = 0; c < cols; c++){
      const top = hexCenter(c, 0);
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', top.x.toFixed(1));
      t.setAttribute('y', (top.y - cal.hexSize - LABEL_OFFSET).toFixed(1));
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('class', 'coord-letter');
      t.textContent = window.darleneColLabel(c);
      g.appendChild(t);
    }
    for (let r = 0; r < rows; r++){
      const right = hexCenter(cols - 1, r);
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', (right.x + cal.hexSize + LABEL_OFFSET).toFixed(1));
      t.setAttribute('y', (right.y + 3).toFixed(1));
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('class', 'coord-number');
      t.textContent = String(window.darleneDiagonal(cols - 1, r));
      g.appendChild(t);
    }
    for (let r = 0; r < rows; r++){
      const left = hexCenter(0, r);
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', (left.x - cal.hexSize - LABEL_OFFSET).toFixed(1));
      t.setAttribute('y', (left.y + 3).toFixed(1));
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('class', 'coord-number');
      t.textContent = String(window.darleneDiagonal(0, r));
      g.appendChild(t);
    }
    for (let c = 1; c < cols - 1; c++){
      const d = window.darleneDiagonal(c, rows - 1);
      if (d <= 97) continue;
      const pos = hexCenter(c, rows - 1);
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', pos.x.toFixed(1));
      t.setAttribute('y', (pos.y + cal.hexSize + LABEL_OFFSET + 2).toFixed(1));
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('class', 'coord-number');
      t.textContent = String(d);
      g.appendChild(t);
    }
    return g;
  }

  // ── buildLandmarkOverlay ──────────────────────────────────────────────────
  function buildLandmarkOverlay(){
    const ns = 'http://www.w3.org/2000/svg';
    const old = _layers.landmarks;
    if (old && old.parentNode) old.parentNode.removeChild(old);
    const g = ensureLayer('landmarks');
    g.style.pointerEvents = 'none';
    if (typeof window.GCCLandmarks === 'undefined') return g;
    const hexCenter = window.hexCenter;
    const KIND_STYLE = {
      city:     { shape:'circle',  r:3.5, fill:'#c8941a',   stroke:'#e8b840', sw:0.6 },
      town:     { shape:'circle',  r:2.8, fill:'none',      stroke:'#c8941a', sw:0.8 },
      castle:   { shape:'square',  s:5.0, fill:'#8b2a1a',   stroke:'#e8b840', sw:0.6 },
      ruin:     { shape:'x',       s:4.0, stroke:'#8b6e45', sw:1.0 },
      village:  { shape:'circle',  r:1.8, fill:'#8b6e45',   stroke:'#c8a96e', sw:0.4 },
      feature:  { shape:'diamond', s:4.5, fill:'#4a7fa0',   stroke:'#8bc5e0', sw:0.6 },
      landmark: { shape:'diamond', s:4.0, fill:'#8b5aa0',   stroke:'#c090e0', sw:0.6 },
    };
    for (const [id, lm] of window.GCCLandmarks.all()){
      const hit = window.GCCLandmarks.hex(id);
      if (!hit) continue;
      const hexC = hexCenter(hit.col, hit.row);
      const sym = lm.symbolPixel;
      const haveSym = lm._override && sym && typeof sym.mx === 'number';
      const x = haveSym ? sym.mx : hexC.x;
      const y = haveSym ? sym.my : hexC.y;
      const style = KIND_STYLE[lm.kind] || KIND_STYLE.feature;
      const overrideFill = '#44ffbb', overrideStroke = '#aaffdd';
      let mark;
      switch (style.shape){
        case 'circle':
          mark = document.createElementNS(ns, 'circle');
          mark.setAttribute('cx', x.toFixed(1));
          mark.setAttribute('cy', y.toFixed(1));
          mark.setAttribute('r', style.r);
          break;
        case 'square':
          mark = document.createElementNS(ns, 'rect');
          mark.setAttribute('x', (x - style.s/2).toFixed(1));
          mark.setAttribute('y', (y - style.s/2).toFixed(1));
          mark.setAttribute('width', style.s);
          mark.setAttribute('height', style.s);
          break;
        case 'diamond': {
          mark = document.createElementNS(ns, 'polygon');
          const s = style.s;
          mark.setAttribute('points', `${x},${y-s} ${x+s},${y} ${x},${y+s} ${x-s},${y}`);
          break;
        }
        case 'x': {
          mark = document.createElementNS(ns, 'path');
          const s = style.s;
          mark.setAttribute('d', `M${x-s},${y-s} L${x+s},${y+s} M${x+s},${y-s} L${x-s},${y+s}`);
          mark.setAttribute('fill', 'none');
          break;
        }
      }
      if (style.fill && style.shape !== 'x') mark.setAttribute('fill', lm._override ? overrideFill : style.fill);
      if (style.stroke) mark.setAttribute('stroke', lm._override ? overrideStroke : style.stroke);
      if (style.sw) mark.setAttribute('stroke-width', style.sw);
      mark.setAttribute('class', lm._override ? 'landmark-mark landmark-override' : 'landmark-mark');
      mark.dataset.id = id;
      g.appendChild(mark);

      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', x.toFixed(1));
      label.setAttribute('y', (y + 9).toFixed(1));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'landmark-label');
      label.textContent = lm.name;
      g.appendChild(label);

      if (lm.isPort){
        const anchor = document.createElementNS(ns, 'text');
        anchor.setAttribute('x', (x + 4.5).toFixed(1));
        anchor.setAttribute('y', (y - 3.5).toFixed(1));
        anchor.setAttribute('class', 'landmark-port');
        anchor.textContent = '⚓';
        anchor.dataset.id = id;
        g.appendChild(anchor);
      } else if (lm.onWater){
        const wave = document.createElementNS(ns, 'text');
        wave.setAttribute('x', (x + 4.5).toFixed(1));
        wave.setAttribute('y', (y - 3.5).toFixed(1));
        wave.setAttribute('class', 'landmark-water');
        wave.textContent = '≈';
        wave.dataset.id = id;
        g.appendChild(wave);
      }
    }
    return g;
  }
  function rebuildLandmarkOverlay(){ buildLandmarkOverlay(); }

  // ── buildJourneyOverlay ───────────────────────────────────────────────────
  function buildJourneyOverlay(){
    const ns = 'http://www.w3.org/2000/svg';
    const old = _layers.journey;
    if (old && old.parentNode) old.parentNode.removeChild(old);
    const g = ensureLayer('journey');
    g.style.pointerEvents = 'none';
    const j = window.state?.journey;
    if (!j || !j.route || j.route.length < 2) return g;
    const hexCenter = window.hexCenter;
    const pts = j.route.map(h => {
      const c = hexCenter(h.col, h.row);
      return `${c.x.toFixed(1)},${c.y.toFixed(1)}`;
    }).join(' ');
    const line = document.createElementNS(ns, 'polyline');
    line.id = 'journey-route-line';
    line.setAttribute('points', pts);
    g.appendChild(line);
    const dest = j.route[j.route.length - 1];
    const dc = hexCenter(dest.col, dest.row);
    const ring = document.createElementNS(ns, 'circle');
    ring.setAttribute('class', 'journey-end-ring');
    ring.setAttribute('cx', dc.x.toFixed(1));
    ring.setAttribute('cy', dc.y.toFixed(1));
    ring.setAttribute('r', '9');
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('class', 'journey-end-dot');
    dot.setAttribute('cx', dc.x.toFixed(1));
    dot.setAttribute('cy', dc.y.toFixed(1));
    dot.setAttribute('r', '2.5');
    g.appendChild(ring);
    g.appendChild(dot);
    return g;
  }
  function refreshJourneyOverlay(){
    buildJourneyOverlay();
    applyJourneyHexClasses();
  }
  function applyJourneyHexClasses(){
    document.querySelectorAll('.journey-hex,.journey-end').forEach(el => {
      el.classList.remove('journey-hex','journey-end');
    });
    const j = window.state?.journey;
    if (!j || !j.route) return;
    const route = j.route;
    for (let i = 0; i < route.length; i++){
      const h = route[i];
      const el = document.getElementById(`hex-${h.col}-${h.row}`);
      if (!el) continue;
      el.classList.add(i === route.length - 1 ? 'journey-end' : 'journey-hex');
    }
  }

  // ── Party marker ──────────────────────────────────────────────────────────
  function buildPartyMarker(){
    const ns = 'http://www.w3.org/2000/svg';
    const old = _layers.partyMarker;
    if (old && old.parentNode) old.parentNode.removeChild(old);
    const markerG = ensureLayer('partyMarker');
    markerG.style.pointerEvents = 'none';
    const pulse = document.createElementNS(ns, 'circle');
    pulse.setAttribute('r', '9');
    pulse.setAttribute('fill', 'rgba(204,34,0,.28)');
    pulse.setAttribute('class', 'party-pulse');
    pulse.id = 'party-pulse';
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('r', '5');
    dot.setAttribute('fill', '#dd2200');
    dot.setAttribute('stroke', '#ffaa88');
    dot.setAttribute('stroke-width', '1.5');
    dot.id = 'party-dot';
    markerG.appendChild(pulse);
    markerG.appendChild(dot);
    return markerG;
  }
  function updatePartyMarker(){
    const partyCol = window.state?.partyCol;
    const partyRow = window.state?.partyRow;
    if (typeof partyCol !== 'number') return;
    const c = window.hexCenter(partyCol, partyRow);
    ['party-pulse','party-dot'].forEach(id => {
      const el = document.getElementById(id);
      if (el){ el.setAttribute('cx', c.x); el.setAttribute('cy', c.y); }
    });
    document.querySelectorAll('.party-hex').forEach(el => el.classList.remove('party-hex'));
    document.getElementById(`hex-${partyCol}-${partyRow}`)?.classList.add('party-hex');
  }

  // ── Hex events ────────────────────────────────────────────────────────────
  function onCellMouseEnter(ev){
    const poly = ev.currentTarget;
    const col = +poly.dataset.col, row = +poly.dataset.row;
    const lm = (typeof window.GCCLandmarks !== 'undefined')
      ? window.GCCLandmarks.getByHex(col, row) : null;
    const TERRAIN = window.TERRAIN;
    const tStr = window.getHexTerrain(col, row);
    const base = `${window.hexIdStr(col, row)}  ·  ${TERRAIN[tStr]?.label || tStr}  ·  ${window.getRegion(col, row)}`;
    const txt = lm ? `${lm.name}  ·  ${base}` : base;
    const c = document.getElementById('gcc-map-coords');
    if (c) c.textContent = txt;
  }
  function onCellClick(ev){
    const poly = ev.currentTarget;
    const col = +poly.dataset.col, row = +poly.dataset.row;
    // Clear previous selection class, set new
    const prev = window.GCCMap.currentSelection();
    if (prev && prev.kind === 'parent'){
      document.getElementById(`hex-${prev.col}-${prev.row}`)?.classList.remove('selected');
    }
    poly.classList.add('selected');
    _ctx.setSelection({ kind:'parent', col, row });
  }
  function wireCellEvents(){
    const cellsG = _layers.cells;
    if (!cellsG) return;
    cellsG.querySelectorAll('polygon.hex-cell').forEach(poly => {
      poly.addEventListener('mouseenter', onCellMouseEnter);
      poly.addEventListener('click', onCellClick);
    });
  }

  // ── Hex context menu (right-click "Open Subhex View") ─────────────────────
  let _hexCtxMenuEl = null;
  function showHexContextMenu(x, y, col, row){
    closeHexContextMenu();
    const menu = document.createElement('div');
    menu.className = 'hex-ctx-menu';
    const id = window.hexIdStr(col, row);
    const lm = (typeof window.GCCLandmarks !== 'undefined') ? window.GCCLandmarks.getById(id) : null;
    const head = document.createElement('div');
    head.className = 'hex-ctx-head';
    head.textContent = lm ? `${lm.name} (${id})` : id;
    menu.appendChild(head);
    const item = document.createElement('div');
    item.className = 'hex-ctx-item';
    item.textContent = 'Open Subhex View';
    item.addEventListener('click', () => {
      closeHexContextMenu();
      window.GCCMap.openParentSubhex(col, row);
    });
    menu.appendChild(item);
    document.body.appendChild(menu);
    const r = menu.getBoundingClientRect();
    const px = Math.max(2, Math.min(x, window.innerWidth - r.width - 4));
    const py = Math.max(2, Math.min(y, window.innerHeight - r.height - 4));
    menu.style.left = px + 'px';
    menu.style.top = py + 'px';
    _hexCtxMenuEl = menu;
    setTimeout(() => {
      document.addEventListener('mousedown',  _hexCtxMenuOutside, true);
      document.addEventListener('keydown',    _hexCtxMenuKey,     true);
      window.addEventListener('blur',         closeHexContextMenu);
    }, 0);
  }
  function closeHexContextMenu(){
    if (!_hexCtxMenuEl) return;
    _hexCtxMenuEl.remove();
    _hexCtxMenuEl = null;
    document.removeEventListener('mousedown',  _hexCtxMenuOutside, true);
    document.removeEventListener('keydown',    _hexCtxMenuKey,     true);
    window.removeEventListener('blur',         closeHexContextMenu);
  }
  function _hexCtxMenuOutside(e){
    if (_hexCtxMenuEl && !_hexCtxMenuEl.contains(e.target)) closeHexContextMenu();
  }
  function _hexCtxMenuKey(e){
    if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); closeHexContextMenu(); }
  }
  function onSvgContextMenu(ev){
    // Right-click on a cell shows context menu. Suppress browser default.
    const target = ev.target;
    if (target && target.classList && target.classList.contains('hex-cell')){
      ev.preventDefault();
      const col = +target.dataset.col, row = +target.dataset.row;
      showHexContextMenu(ev.clientX, ev.clientY, col, row);
    }
  }

  // ── Event subscriptions ───────────────────────────────────────────────────
  function _onFogChanged(){
    // Cheap path: toggle .fogged class on existing cells without rebuild.
    if (!window.GCCFog || !_layers.cells) return;
    _layers.cells.querySelectorAll('polygon.hex-cell').forEach(poly => {
      const col = +poly.dataset.col, row = +poly.dataset.row;
      poly.classList.toggle('fogged', !!window.GCCFog.shouldFogParent(col, row));
    });
  }
  function _onSubhexChanged(){
    // Subhex authoring may flip GCCPaths.parentHasSubhexAuthoring gates;
    // path overlay rebuild handles that. Light rebuild — paths only.
    rebuildPathOverlay();
  }

  // ── Renderer interface ────────────────────────────────────────────────────
  function mount(svg, ctx){
    _ctx = ctx;
    const ns = 'http://www.w3.org/2000/svg';

    _root = document.createElementNS(ns, 'g');
    _root.setAttribute('class', 'gcc-map-parent-root');
    svg.appendChild(_root);

    // Image layer first (bottom). Wrap <image> in a <g> so the imgX
    // transform applies cleanly without affecting later layers.
    _imageGroup = document.createElementNS(ns, 'g');
    _imageGroup.setAttribute('class', 'gcc-map-parent-image-layer');
    _imageGroup.style.pointerEvents = 'none';
    _imageEl = document.createElementNS(ns, 'image');
    _imageEl.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'greyhawk-map.jpg');
    _imageEl.setAttribute('href', 'greyhawk-map.jpg');
    _imageEl.setAttribute('x', 0);
    _imageEl.setAttribute('y', 0);
    _imageEl.setAttribute('width', _ctx.MAP_W());
    _imageEl.setAttribute('height', _ctx.MAP_H());
    _imageEl.setAttribute('preserveAspectRatio', 'none');
    _imageGroup.appendChild(_imageEl);
    _root.appendChild(_imageGroup);
    _layers.image = _imageGroup;

    loadImgTransform();
    applyImgTransform();

    // Initial build of all geometry layers
    buildHexGrid();

    // Wire events
    wireCellEvents();
    svg.addEventListener('contextmenu', onSvgContextMenu);
    window.addEventListener('gcc-fog-changed', _onFogChanged);
    window.addEventListener('gcc-subhex-changed', _onSubhexChanged);

    // Install real back-compat globals (replacing gcc-map.js shims)
    window.rebuildPathOverlay = rebuildPathOverlay;
    window.rebuildLandmarkOverlay = rebuildLandmarkOverlay;
    window.rebuildGrid = buildHexGrid;
    window.buildHexGrid = buildHexGrid;
    window.refreshJourneyOverlay = refreshJourneyOverlay;
    window.applyJourneyHexClasses = applyJourneyHexClasses;
    window.updatePartyMarker = updatePartyMarker;
    window.applyImgTransform = applyImgTransform;
    window.saveImgTransform = saveImgTransform;
    window.loadImgTransform = loadImgTransform;
    window.imgX = imgX;
  }

  function render(){
    // Pan/zoom is handled by the shell's viewBox transform. The parent
    // map (146×97 hexes) is small enough that no viewport-bbox culling
    // is needed — buildHexGrid renders the whole thing once on mount.
    // render() is a no-op except in cases where a Slice 5 tool needs
    // to refresh per-frame (none yet). Selection class flip happens
    // in onCellClick directly; no full rebuild needed.
  }

  function unmount(){
    if (_root && _root.parentNode) _root.parentNode.removeChild(_root);
    _root = null;
    _imageGroup = null;
    _imageEl = null;
    _layers = {};
    _ctx = null;
    closeHexContextMenu();
    window.removeEventListener('gcc-fog-changed', _onFogChanged);
    window.removeEventListener('gcc-subhex-changed', _onSubhexChanged);
    // Reset back-compat globals to harmless no-ops (safer than leaving
    // dangling closures over freed _layers / _root).
    window.rebuildPathOverlay = function(){};
    window.rebuildLandmarkOverlay = function(){};
    window.rebuildGrid = function(){};
    window.buildHexGrid = function(){};
    window.refreshJourneyOverlay = function(){};
    window.applyJourneyHexClasses = function(){};
    window.updatePartyMarker = function(){};
  }

  window.GCCMap.registerScale({
    name: 'parent',
    label: '30-mile',
    hexSize: 30,
    pxPerWorldUnit: 1,
    zoomMin: 0.05,
    zoomMax: 2.0,
    zoomDefault: 0.5,
    renderer: { mount, render, unmount },
    tools: [],
  });
})();
