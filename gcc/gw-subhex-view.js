// gw-subhex-view.js v0.5.0 — 2026-05-24
// Seamless (Path B) 3-mile subhex viewer for the Gamma World map:
// drill-in + pan/zoom, terrain paint brush, and a freehand vector overlay
// (rivers/roads/trails) + settlement icon markers.
//
// v0.3.0 — freehand vector overlay. Line tools (river solid blue, road
//          dashed, trail dotted, pen) captured freehand and Catmull-Rom
//          smoothed; settlement markers (town/city/village/ruin) placed
//          as free points (shift-click to name); feature-erase tool.
//          Stored via GWAnnotations in world coords; renders above cells.
// v0.2.0 — terrain paint brush + per-stroke undo.
// v0.1.0 — read-only viewer (cull/render/pan/zoom/parent outlines/readout).

(function(){
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const D = () => window.GWSubhexData;
  const A = () => window.GWAnnotations;

  const STROKE_STYLE = {
    river: { color: '#2f6fa8', width: 3,   dash: null },
    road:  { color: '#8a5a2b', width: 2.5, dash: '7 5' },
    trail: { color: '#6b4a2a', width: 2.5, dash: '0.5 7' },
    pen:   { color: '#e8d5a3', width: 2,   dash: null },
  };
  const ICON_PX = 9;          // marker glyph radius in screen px
  const SAMPLE_PX = 4;        // freehand point spacing in screen px

  const state = {
    open: false,
    vb: { x: 0, y: 0, w: 180, h: 120 },
    showParents: true,
    rendered: null,
    drag: null,
    brush: null,         // terrain stroke
    stroke: null,        // freehand vector capture { kind, pts:[], el }
    armed: null,
    undoStack: [],
    cellMap: new Map(),
    raf: 0,
    curParent: null,
    el: {},
  };

  // ── style ──────────────────────────────────────────────────────────────────
  function injectStyle(){
    if (document.getElementById('gw-subhex-style')) return;
    const s = document.createElement('style');
    s.id = 'gw-subhex-style';
    s.textContent = `
      #gw-sx-overlay { position:fixed; top:calc(var(--gcc-bar-h,44px) + var(--topbar-h,46px)); left:0; right:0; bottom:0; z-index:80; background:#050200; display:none; }
      #gw-sx-overlay.open { display:block; }
      #gw-sx-svg { position:absolute; inset:0; width:100%; height:100%; cursor:grab; touch-action:none; }
      #gw-sx-svg.grabbing { cursor:grabbing; }
      #gw-sx-svg.painting { cursor:crosshair; }
      .gw-sx-cell { stroke:rgba(0,0,0,.35); stroke-width:1; vector-effect:non-scaling-stroke; }
      .gw-sx-cell.authored { stroke:#ff8844; stroke-width:1.5; vector-effect:non-scaling-stroke; }
      .gw-sx-cell.hover { stroke:rgba(255,220,120,.95); stroke-width:2; vector-effect:non-scaling-stroke; }
      .gw-sx-parent { fill:none; stroke:rgba(255,200,120,.5); stroke-width:1.5; vector-effect:non-scaling-stroke; pointer-events:none; }
      .gw-sx-line { fill:none; vector-effect:non-scaling-stroke; stroke-linecap:round; stroke-linejoin:round; pointer-events:none; }
      .gw-sx-marker, .gw-sx-marker * { pointer-events:none; }
      #gw-sx-bar { position:absolute; top:10px; left:172px; right:10px; display:flex; align-items:center; gap:10px; z-index:6; pointer-events:none; }
      #gw-sx-bar > * { pointer-events:auto; }
      #gw-sx-bar .sx-title { font-family:'Cinzel',serif; font-size:13px; letter-spacing:.08em; color:#ffaa66; text-shadow:0 0 10px rgba(255,136,68,.35); }
      #gw-sx-bar .sx-spacer { flex:1; }
      #gw-sx-bar label { font-size:12px; color:#c8a96e; display:flex; align-items:center; gap:5px; cursor:pointer; }
      .gw-sx-btn { background:rgba(14,8,2,.93); border:1px solid #5a3a0a; color:#e8d5a3; font-family:'Cinzel',serif; font-size:11px; letter-spacing:.04em; padding:6px 11px; cursor:pointer; border-radius:2px; }
      .gw-sx-btn:hover { background:rgba(255,136,68,.18); border-color:#ff8844; color:#ffaa66; }
      .gw-sx-btn:disabled { opacity:.4; cursor:default; }
      #gw-sx-palette { position:absolute; top:10px; left:10px; width:152px; max-height:calc(100% - 20px); overflow:auto; background:rgba(14,8,2,.95); border:1px solid #5a3a0a; border-radius:3px; padding:8px; z-index:6; font-family:'Crimson Text',serif; }
      #gw-sx-palette .sx-mode { font-size:11px; color:#ffaa66; margin-bottom:7px; min-height:14px; line-height:1.3; }
      #gw-sx-palette .sx-hd { font-family:'Cinzel',serif; font-size:10px; letter-spacing:.1em; color:#c8a96e; margin:9px 0 3px; border-top:1px solid #3a2606; padding-top:6px; }
      #gw-sx-palette .sx-hd:first-of-type { border-top:none; padding-top:0; }
      .gw-sx-sw { display:flex; align-items:center; gap:6px; width:100%; background:none; border:1px solid transparent; color:#e8d5a3; font-size:12px; padding:3px 4px; cursor:pointer; border-radius:2px; text-align:left; }
      .gw-sx-sw:hover { background:rgba(255,136,68,.15); }
      .gw-sx-sw.armed { border-color:#ff8844; background:rgba(255,136,68,.22); }
      .gw-sx-chip { width:15px; height:15px; border:1px solid rgba(0,0,0,.45); flex:none; border-radius:1px; }
      .gw-sx-tools { display:grid; grid-template-columns:1fr 1fr; gap:4px; }
      .gw-sx-tool { background:rgba(0,0,0,.25); border:1px solid #5a3a0a; color:#e8d5a3; font-family:'Crimson Text',serif; font-size:12px; padding:4px 3px; cursor:pointer; border-radius:2px; }
      .gw-sx-tool:hover { background:rgba(255,136,68,.15); }
      .gw-sx-tool.armed { border-color:#ff8844; background:rgba(255,136,68,.22); color:#ffaa66; }
      #gw-sx-palette .sx-row2 { display:flex; gap:6px; margin-top:7px; }
      #gw-sx-palette .sx-row2 .gw-sx-btn { flex:1; padding:5px 4px; }
      #gw-sx-read { position:absolute; bottom:10px; left:10px; min-width:200px; background:rgba(14,8,2,.93); border:1px solid #5a3a0a; border-radius:3px; color:#e8d5a3; padding:8px 12px; font-size:12px; font-family:'Crimson Text',Georgia,serif; z-index:6; }
      #gw-sx-read .sx-t { color:#ffaa66; font-weight:600; }
    `;
    document.head.appendChild(s);
  }

  function mkBtn(label, id){ const b = document.createElement('button'); b.id = id; b.textContent = label; b.className = 'gw-sx-btn'; return b; }
  function hd(text){ const d = document.createElement('div'); d.className = 'sx-hd'; d.textContent = text; return d; }
  function toolBtn(label, armSpec){
    const b = document.createElement('button');
    b.className = 'gw-sx-tool';
    b.textContent = label;
    b.dataset.arm = armKey(armSpec);
    b.addEventListener('click', () => arm(armSpec));
    return b;
  }

  function buildPalette(){
    const pal = document.createElement('div'); pal.id = 'gw-sx-palette';
    const mode = document.createElement('div'); mode.className = 'sx-mode'; mode.id = 'gw-sx-mode';
    mode.textContent = 'Mode: Select';
    pal.appendChild(mode);

    pal.appendChild(hd('Terrain'));
    const T = D().TERRAIN;
    for (const key of Object.keys(T)){
      if (key === 'unknown') continue;
      const sw = document.createElement('button');
      sw.className = 'gw-sx-sw'; sw.dataset.arm = 'paint:' + key;
      sw.innerHTML = `<span class="gw-sx-chip" style="background:${T[key].fill}"></span><span>${T[key].label}</span>`;
      sw.addEventListener('click', () => arm({ type: 'paint', terrain: key }));
      pal.appendChild(sw);
    }
    const trow = document.createElement('div'); trow.className = 'sx-row2';
    const erase = mkBtn('⌫ Erase', 'gw-sx-erase'); erase.dataset.arm = 'erase';
    erase.addEventListener('click', () => arm({ type: 'erase' }));
    const undoB = mkBtn('↶ Undo', 'gw-sx-undo'); undoB.disabled = true;
    undoB.addEventListener('click', undo);
    trow.append(erase, undoB); pal.appendChild(trow);

    pal.appendChild(hd('Lines'));
    const lines = document.createElement('div'); lines.className = 'gw-sx-tools';
    lines.append(
      toolBtn('～ River', { type: 'draw', kind: 'river' }),
      toolBtn('╌ Road',  { type: 'draw', kind: 'road' }),
      toolBtn('⋯ Trail', { type: 'draw', kind: 'trail' }),
      toolBtn('✎ Pen',   { type: 'draw', kind: 'pen' }),
    );
    pal.appendChild(lines);

    pal.appendChild(hd('Settlements'));
    const marks = document.createElement('div'); marks.className = 'gw-sx-tools';
    marks.append(
      toolBtn('◉ Town',    { type: 'marker', kind: 'town' }),
      toolBtn('◎ City',    { type: 'marker', kind: 'city' }),
      toolBtn('• Village', { type: 'marker', kind: 'village' }),
      toolBtn('⌐ Ruin',    { type: 'marker', kind: 'ruin' }),
    );
    pal.appendChild(marks);

    pal.appendChild(hd('Features'));
    const genRow = document.createElement('div'); genRow.className = 'sx-row2';
    const genB = mkBtn('✦ Generate', 'gw-sx-gen');
    genB.addEventListener('click', generateFeatures);
    const clrB = mkBtn('Clear gen', 'gw-sx-gen-clear');
    clrB.addEventListener('click', clearGeneratedFeatures);
    genRow.append(genB, clrB);
    pal.appendChild(genRow);
    const fe = mkBtn('✦ Erase feature', 'gw-sx-annot-erase'); fe.dataset.arm = 'annot-erase';
    fe.style.width = '100%';
    fe.addEventListener('click', () => arm({ type: 'annot-erase' }));
    pal.appendChild(fe);

    return pal;
  }

  function centerParent(){
    const d = D();
    if (d && d.svgToAxial && d.ownerOf){
      const c = d.svgToAxial(state.vb.x + state.vb.w / 2, state.vb.y + state.vb.h / 2);
      const o = d.ownerOf(c.Q, c.R);
      if (o) return o;
    }
    return state.curParent;
  }
  function generateFeatures(){
    const p = centerParent();
    if (!p || !window.GWFeatureGen){ return; }
    const res = window.GWFeatureGen.generateForParent(p.col, p.row);
    renderAnnotations();
    if (res && state.el.mode){
      state.el.mode.textContent = `Parent ${p.col},${p.row}: ${res.markers} sites, ${res.strokes} paths`;
      setTimeout(syncMode, 2800);
    }
  }
  function clearGeneratedFeatures(){
    const p = centerParent();
    if (!p || !window.GWFeatureGen){ return; }
    const n = window.GWFeatureGen.clearForParent(p.col, p.row);
    renderAnnotations();
    if (state.el.mode){ state.el.mode.textContent = `Cleared ${n} generated`; setTimeout(syncMode, 2000); }
  }

  function ensureDom(){
    if (state.el.overlay) return;
    injectStyle();
    const overlay = document.createElement('div'); overlay.id = 'gw-sx-overlay';
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.id = 'gw-sx-svg'; svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const gCells = document.createElementNS(SVGNS, 'g');   gCells.id = 'gw-sx-cells';
    const gParents = document.createElementNS(SVGNS, 'g'); gParents.id = 'gw-sx-parents';
    const gAnnot = document.createElementNS(SVGNS, 'g');   gAnnot.id = 'gw-sx-annot';
    svg.append(gCells, gParents, gAnnot);

    const palette = buildPalette();
    const bar = document.createElement('div'); bar.id = 'gw-sx-bar';
    const back = mkBtn('← Overworld', 'gw-sx-back');
    const title = document.createElement('span'); title.className = 'sx-title'; title.id = 'gw-sx-parent-lbl';
    const spacer = document.createElement('span'); spacer.className = 'sx-spacer';
    const tog = document.createElement('label');
    tog.innerHTML = '<input type="checkbox" id="gw-sx-toggle-parents" checked> Parent outlines';
    const fit = mkBtn('Fit parent', 'gw-sx-fit');
    bar.append(back, title, spacer, tog, fit);
    const read = document.createElement('div'); read.id = 'gw-sx-read';
    read.innerHTML = '<span class="sx-t">Subhex</span><div id="gw-sx-read-body">— hover a cell —</div>';

    overlay.append(svg, palette, bar, read);
    document.body.appendChild(overlay);

    Object.assign(state.el, {
      overlay, svg, gCells, gParents, gAnnot, title, read,
      readBody: read.querySelector('#gw-sx-read-body'),
      mode: palette.querySelector('#gw-sx-mode'),
      undoBtn: palette.querySelector('#gw-sx-undo'),
      palette,
    });
    back.addEventListener('click', close);
    fit.addEventListener('click', () => { if (state.curParent) centerOnParent(state.curParent.col, state.curParent.row); });
    tog.querySelector('input').addEventListener('change', e => { state.showParents = e.target.checked; render(true); });
    wireViewport(svg);
    bindCellHover(svg);
  }

  // ── viewBox + pan/zoom ─────────────────────────────────────────────────────
  function applyViewBox(){ const { x, y, w, h } = state.vb; state.el.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`); }
  function pxW(){ const r = state.el.svg.getBoundingClientRect(); return r.width || 1; }
  function curU(){ return state.vb.w / pxW(); }       // world units per screen px
  function syncAspect(){ const r = state.el.svg.getBoundingClientRect(); if (r.width > 0 && r.height > 0) state.vb.h = state.vb.w * (r.height / r.width); }
  function centerOnParent(col, row){
    const c = D().parentSvgCenter(col, row);
    state.vb.w = 3 * 1.5 * D().HEX_R; syncAspect();
    state.vb.x = c.x - state.vb.w / 2; state.vb.y = c.y - state.vb.h / 2;
    applyViewBox(); render(true);
  }
  function clientToWorld(ev){
    const r = state.el.svg.getBoundingClientRect();
    return { x: state.vb.x + (ev.clientX - r.left) / r.width * state.vb.w,
             y: state.vb.y + (ev.clientY - r.top) / r.height * state.vb.h };
  }
  function cellUnder(ev){ const el = document.elementFromPoint(ev.clientX, ev.clientY); return (el && el.classList && el.classList.contains('gw-sx-cell')) ? el : null; }

  function wireViewport(svg){
    svg.addEventListener('mousedown', e => {
      if (e.button !== 0 && e.button !== 2) return;
      e.preventDefault();
      const a = state.armed;
      if (e.button === 0 && a){
        if ((a.type === 'paint' || a.type === 'erase')){
          const cell = cellUnder(e);
          if (cell){ state.brush = { set: new Set(), undo: [] }; svg.classList.add('painting'); paintCell(+cell.dataset.q, +cell.dataset.r); return; }
        } else if (a.type === 'draw'){ startStroke(e); return; }
        else if (a.type === 'marker'){ placeMarker(e); return; }
        else if (a.type === 'annot-erase'){ eraseAnnotationAt(e); return; }
      }
      state.drag = { sx: e.clientX, sy: e.clientY, vx: state.vb.x, vy: state.vb.y, moved: false };
      svg.classList.add('grabbing');
    });
    svg.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('mousemove', e => {
      if (state.stroke){ extendStroke(e); return; }
      if (state.brush){ const c = cellUnder(e); if (c) paintCell(+c.dataset.q, +c.dataset.r); return; }
      if (!state.drag) return;
      const r = state.el.svg.getBoundingClientRect();
      const dx = (e.clientX - state.drag.sx) / r.width * state.vb.w;
      const dy = (e.clientY - state.drag.sy) / r.height * state.vb.h;
      if (Math.abs(e.clientX - state.drag.sx) + Math.abs(e.clientY - state.drag.sy) > 3) state.drag.moved = true;
      state.vb.x = state.drag.vx - dx; state.vb.y = state.drag.vy - dy; applyViewBox();
    });
    window.addEventListener('mouseup', () => {
      if (state.stroke){ commitStroke(); return; }
      if (state.brush){
        D().flushOverrides();
        if (state.brush.undo.length){ state.undoStack.push(state.brush.undo); if (state.undoStack.length > 30) state.undoStack.shift(); }
        state.brush = null; state.el.svg.classList.remove('painting'); syncUndoBtn(); return;
      }
      if (!state.drag) return;
      const moved = state.drag.moved; state.drag = null; state.el.svg.classList.remove('grabbing');
      if (moved) render();
    });
    svg.addEventListener('wheel', e => {
      if (!state.open || state.stroke) return;
      e.preventDefault();
      const wpt = clientToWorld(e);
      const factor = e.deltaY < 0 ? 1/1.2 : 1.2;
      const minW = 1.5 * D().HEX_R * 0.6, maxW = 1.5 * D().HEX_R * 24;
      let nw = Math.max(minW, Math.min(maxW, state.vb.w * factor));
      const k = nw / state.vb.w;
      state.vb.w = nw; state.vb.h *= k;
      state.vb.x = wpt.x - (wpt.x - state.vb.x) * k;
      state.vb.y = wpt.y - (wpt.y - state.vb.y) * k;
      applyViewBox(); scheduleRender();
    }, { passive: false });
  }
  function scheduleRender(){ if (state.raf) return; state.raf = requestAnimationFrame(() => { state.raf = 0; render(); }); }

  // ── render: cells + parents ────────────────────────────────────────────────
  function cornersStr(cx, cy, R){
    let s = '';
    for (let i = 0; i < 6; i++){ const a = (Math.PI/180)*(60*i); s += (i?' ':'') + (cx+R*Math.cos(a)).toFixed(3) + ',' + (cy+R*Math.sin(a)).toFixed(3); }
    return s;
  }
  function fillFor(d, sub){ return (d.TERRAIN[sub.terrain] || d.TERRAIN.unknown).fill; }

  function render(force){
    if (!state.open) return;
    const d = D();
    const mx = state.vb.w * 0.4, my = state.vb.h * 0.4;
    const bbox = { minX: state.vb.x - mx, maxX: state.vb.x + state.vb.w + mx, minY: state.vb.y - my, maxY: state.vb.y + state.vb.h + my };
    if (!force && state.rendered &&
        bbox.minX >= state.rendered.minX && bbox.maxX <= state.rendered.maxX &&
        bbox.minY >= state.rendered.minY && bbox.maxY <= state.rendered.maxY){ renderAnnotations(); return; }
    state.rendered = bbox;

    const cells = d.cellsInAxialBbox(bbox);
    const ptCache = new Map(); const parentsSeen = new Map(); state.cellMap = new Map();
    const fragC = document.createDocumentFragment();
    for (const { Q, R } of cells){
      const o = d.ownerOf(Q, R);
      let pt = null;
      if (o){ const pk = o.col + ',' + o.row; if (ptCache.has(pk)) pt = ptCache.get(pk); else { pt = d.parentTerrainOf(o.col, o.row); ptCache.set(pk, pt); } if (state.showParents && !parentsSeen.has(pk)) parentsSeen.set(pk, o); }
      const sub = d.getSubhex(Q, R, pt);
      const c = d.subhexSvgCenter(Q, R);
      const poly = document.createElementNS(SVGNS, 'polygon');
      poly.setAttribute('points', cornersStr(c.x, c.y, d.SUB_R));
      poly.setAttribute('class', 'gw-sx-cell' + (sub.source === 'authored' ? ' authored' : ''));
      poly.setAttribute('fill', fillFor(d, sub));
      poly.dataset.q = Q; poly.dataset.r = R;
      fragC.appendChild(poly); state.cellMap.set(Q + '_' + R, poly);
    }
    state.el.gCells.replaceChildren(fragC);

    const fragP = document.createDocumentFragment();
    if (state.showParents){
      for (const [, o] of parentsSeen){
        const pc = d.parentSvgCenter(o.col, o.row);
        const poly = document.createElementNS(SVGNS, 'polygon');
        poly.setAttribute('points', cornersStr(pc.x, pc.y, d.HEX_R));
        poly.setAttribute('class', 'gw-sx-parent');
        fragP.appendChild(poly);
      }
    }
    state.el.gParents.replaceChildren(fragP);
    renderAnnotations();
  }

  // ── annotation overlay ─────────────────────────────────────────────────────
  function smoothPath(pts){
    if (pts.length < 2) return '';
    const f = n => n.toFixed(2);
    if (pts.length === 2) return `M ${f(pts[0][0])},${f(pts[0][1])} L ${f(pts[1][0])},${f(pts[1][1])}`;
    let d = `M ${f(pts[0][0])},${f(pts[0][1])}`;
    for (let i = 0; i < pts.length - 1; i++){
      const p0 = pts[i-1] || pts[i], p1 = pts[i], p2 = pts[i+1], p3 = pts[i+2] || p2;
      const c1x = p1[0] + (p2[0]-p0[0])/6, c1y = p1[1] + (p2[1]-p0[1])/6;
      const c2x = p2[0] - (p3[0]-p1[0])/6, c2y = p2[1] - (p3[1]-p1[1])/6;
      d += ` C ${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(p2[0])},${f(p2[1])}`;
    }
    return d;
  }
  function lineEl(kind, dStr, custom){
    const st = STROKE_STYLE[kind] || STROKE_STYLE.pen;
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', dStr);
    p.setAttribute('class', 'gw-sx-line');
    p.setAttribute('stroke', (custom && custom.color) || st.color);
    p.setAttribute('stroke-width', (custom && custom.width) || st.width);
    if (st.dash) p.setAttribute('stroke-dasharray', st.dash);
    return p;
  }
  function markerEl(kind, x, y, name, u){
    const r = ICON_PX * u;
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'gw-sx-marker');
    const halo = document.createElementNS(SVGNS, 'circle');
    halo.setAttribute('cx', x); halo.setAttribute('cy', y); halo.setAttribute('r', r * 1.25);
    halo.setAttribute('fill', 'rgba(243,234,210,.85)'); halo.setAttribute('stroke', 'rgba(90,42,29,.5)');
    halo.setAttribute('stroke-width', 0.5 * u); halo.setAttribute('vector-effect', 'non-scaling-stroke');
    g.appendChild(halo);
    const ink = '#7a3b1d', ruinInk = '#5a2a2a';
    const add = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); e.setAttribute('vector-effect', 'non-scaling-stroke'); g.appendChild(e); return e; };
    if (kind === 'village'){
      add('circle', { cx:x, cy:y, r:r*0.55, fill:ink });
    } else if (kind === 'ruin'){
      const w = r*0.85;
      add('path', { d:`M ${x-w},${y+w} L ${x-w},${y-w} L ${x-w*0.1},${y-w}`, fill:'none', stroke:ruinInk, 'stroke-width':2 });
      add('path', { d:`M ${x+w},${y-w} L ${x+w},${y+w} L ${x+w*0.1},${y+w}`, fill:'none', stroke:ruinInk, 'stroke-width':2 });
      add('line', { x1:x-w*0.4, y1:y, x2:x+w*0.4, y2:y, stroke:ruinInk, 'stroke-width':2 });
    } else if (kind === 'lair'){
      add('path', { d:`M ${x},${y-r} L ${x+r*0.9},${y+r*0.7} L ${x-r*0.9},${y+r*0.7} Z`, fill:ruinInk, stroke:'none' });
    } else if (kind === 'vault'){
      add('path', { d:`M ${x},${y-r} L ${x+r},${y} L ${x},${y+r} L ${x-r},${y} Z`, fill:'none', stroke:'#3a4a52', 'stroke-width':2 });
      add('circle', { cx:x, cy:y, r:r*0.28, fill:'#3a4a52' });
    } else if (kind === 'city'){
      add('circle', { cx:x, cy:y, r:r, fill:'none', stroke:ink, 'stroke-width':2 });
      add('circle', { cx:x, cy:y, r:r*0.5, fill:ink });
      add('rect', { x:x-r*0.28, y:y-r*0.28, width:r*0.56, height:r*0.56, fill:'#f3ead2' });
    } else { // town (default)
      add('circle', { cx:x, cy:y, r:r*0.85, fill:'none', stroke:ink, 'stroke-width':2 });
      add('rect', { x:x-r*0.42, y:y-r*0.42, width:r*0.84, height:r*0.84, fill:ink });
    }
    if (name){
      const t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', x); t.setAttribute('y', y + r*1.25 + 11*u);
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', 11*u);
      t.setAttribute('font-family', "'Crimson Text',Georgia,serif");
      t.setAttribute('fill', '#ffe9c0'); t.setAttribute('stroke', 'rgba(0,0,0,.7)');
      t.setAttribute('stroke-width', 0.6*u); t.setAttribute('style', 'paint-order:stroke');
      t.setAttribute('vector-effect', 'non-scaling-stroke');
      t.textContent = name;
      g.appendChild(t);
    }
    return g;
  }
  function renderAnnotations(){
    if (!A() || !state.el.gAnnot) return;
    const u = curU();
    const bb = state.rendered || { minX: state.vb.x, maxX: state.vb.x+state.vb.w, minY: state.vb.y, maxY: state.vb.y+state.vb.h };
    const frag = document.createDocumentFragment();
    for (const s of A().strokesInBbox(bb, ICON_PX*u)){
      frag.appendChild(lineEl(s.kind, smoothPath(s.pts), { color: s.color, width: s.width }));
    }
    for (const m of A().markersInBbox({ minX: bb.minX - 50*u, maxX: bb.maxX + 50*u, minY: bb.minY - 50*u, maxY: bb.maxY + 50*u })){
      frag.appendChild(markerEl(m.kind, m.x, m.y, m.name, u));
    }
    state.el.gAnnot.replaceChildren(frag);
  }

  // ── freehand capture ───────────────────────────────────────────────────────
  function startStroke(e){
    const w = clientToWorld(e);
    state.stroke = { kind: state.armed.kind, pts: [[w.x, w.y]] };
    state.el.svg.classList.add('painting');
    const el = lineEl(state.stroke.kind, '', null);
    el.id = 'gw-sx-preview';
    state.el.gAnnot.appendChild(el);
    state.stroke.el = el;
  }
  function extendStroke(e){
    if (!state.stroke) return;
    const w = clientToWorld(e);
    const pts = state.stroke.pts, last = pts[pts.length-1];
    const minW = SAMPLE_PX * curU();
    if (Math.hypot(w.x - last[0], w.y - last[1]) < minW) return;
    pts.push([w.x, w.y]);
    state.stroke.el.setAttribute('d', smoothPath(pts));
  }
  function commitStroke(){
    const st = state.stroke; state.stroke = null;
    state.el.svg.classList.remove('painting');
    if (st && st.el && st.el.parentNode) st.el.parentNode.removeChild(st.el);
    if (st && st.pts.length >= 2){ A().addStroke(st.kind, st.pts); renderAnnotations(); }
  }

  // ── markers + erase ────────────────────────────────────────────────────────
  function placeMarker(e){
    const w = clientToWorld(e);
    let name = '';
    if (e.shiftKey){ try { name = window.prompt('Settlement name (optional):', '') || ''; } catch(_){} }
    A().addMarker(state.armed.kind, w.x, w.y, name ? { name } : null);
    renderAnnotations();
  }
  function distToSeg(px, py, ax, ay, bx, by){
    const dx = bx-ax, dy = by-ay; const l2 = dx*dx + dy*dy;
    let t = l2 ? ((px-ax)*dx + (py-ay)*dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    const cx = ax + t*dx, cy = ay + t*dy;
    return Math.hypot(px-cx, py-cy);
  }
  function eraseAnnotationAt(e){
    const w = clientToWorld(e), u = curU();
    // markers first
    const mr = ICON_PX * u * 1.5;
    let bestM = null, bestMD = mr;
    for (const m of A().listMarkers()){ const dd = Math.hypot(w.x-m.x, w.y-m.y); if (dd <= bestMD){ bestMD = dd; bestM = m; } }
    if (bestM){ A().deleteMarker(bestM.id); renderAnnotations(); return; }
    // then strokes
    const thr = 6 * u;
    let bestS = null, bestSD = thr;
    for (const s of A().listStrokes()){
      for (let i = 0; i < s.pts.length-1; i++){
        const d = distToSeg(w.x, w.y, s.pts[i][0], s.pts[i][1], s.pts[i+1][0], s.pts[i+1][1]);
        if (d <= bestSD){ bestSD = d; bestS = s; }
      }
    }
    if (bestS){ A().deleteStroke(bestS.id); renderAnnotations(); }
  }

  // ── terrain paint ──────────────────────────────────────────────────────────
  function recolorCell(poly, Q, R){
    const d = D(); const o = d.ownerOf(Q, R); const pt = o ? d.parentTerrainOf(o.col, o.row) : null;
    const sub = d.getSubhex(Q, R, pt);
    poly.setAttribute('fill', fillFor(d, sub));
    poly.classList.toggle('authored', sub.source === 'authored');
  }
  function paintCell(Q, R){
    if (!state.brush || !state.armed) return;
    const key = Q + '_' + R; if (state.brush.set.has(key)) return; state.brush.set.add(key);
    const d = D(); const before = d.peekOverride(Q, R);
    state.brush.undo.push({ Q, R, before: before ? JSON.parse(JSON.stringify(before)) : null });
    if (state.armed.type === 'erase') d.clearSubhexTerrain(Q, R, { deferSave: true });
    else d.setSubhexTerrain(Q, R, state.armed.terrain, { deferSave: true });
    const poly = state.cellMap.get(key); if (poly) recolorCell(poly, Q, R);
  }
  function undo(){
    const stroke = state.undoStack.pop(); if (!stroke){ syncUndoBtn(); return; }
    const d = D(); for (const { Q, R, before } of stroke) d.restoreOverride(Q, R, before);
    syncUndoBtn(); render(true);
  }
  function syncUndoBtn(){ if (state.el.undoBtn) state.el.undoBtn.disabled = state.undoStack.length === 0; }

  // ── arming ───────────────────────────────────────────────────────────────
  function armKey(a){
    if (!a) return null;
    if (a.type === 'erase') return 'erase';
    if (a.type === 'annot-erase') return 'annot-erase';
    if (a.type === 'paint') return 'paint:' + a.terrain;
    if (a.type === 'draw') return 'draw:' + a.kind;
    if (a.type === 'marker') return 'marker:' + a.kind;
    return null;
  }
  function arm(spec){
    const cur = armKey(state.armed), nxt = armKey(spec);
    state.armed = (cur === nxt) ? null : spec;
    syncPalette(); syncMode();
  }
  function syncPalette(){
    const cur = armKey(state.armed);
    state.el.palette.querySelectorAll('[data-arm]').forEach(b => b.classList.toggle('armed', b.dataset.arm === cur));
  }
  function syncMode(){
    const a = state.armed, el = state.el.mode;
    if (!a) el.textContent = 'Mode: Select / pan';
    else if (a.type === 'erase') el.textContent = 'Erase terrain · drag to brush';
    else if (a.type === 'paint') el.textContent = `Paint: ${D().TERRAIN[a.terrain].label} · drag to brush`;
    else if (a.type === 'draw') el.textContent = `Draw ${a.kind} · drag to trace`;
    else if (a.type === 'marker') el.textContent = `Place ${a.kind} · click (shift = name)`;
    else if (a.type === 'annot-erase') el.textContent = 'Erase feature · click a line/icon';
  }

  // ── hover readout ──────────────────────────────────────────────────────────
  let _hoverEl = null;
  function bindCellHover(svg){
    svg.addEventListener('mousemove', e => {
      if (state.brush || state.stroke) return;
      const t = e.target;
      if (!t || !t.classList || !t.classList.contains('gw-sx-cell')){ if (_hoverEl){ _hoverEl.classList.remove('hover'); _hoverEl = null; } return; }
      if (_hoverEl === t) return;
      if (_hoverEl) _hoverEl.classList.remove('hover');
      _hoverEl = t; t.classList.add('hover');
      showReadout(+t.dataset.q, +t.dataset.r);
    });
  }
  function showReadout(Q, R){
    const d = D(); const o = d.ownerOf(Q, R); const pt = o ? d.parentTerrainOf(o.col, o.row) : null;
    const sub = d.getSubhex(Q, R, pt);
    const tlabel = (d.TERRAIN[sub.terrain] || d.TERRAIN.unknown).label;
    const owner = o ? `parent ${o.col},${o.row}` : 'unowned';
    state.el.readBody.innerHTML = `Q,R ${Q},${R} · ${owner}<br>${tlabel} <span style="color:#888">(${sub.source})</span>`;
  }

  // ── public API ─────────────────────────────────────────────────────────────
  function open(col, row){
    if (!D()){ console.warn('[gw-subhex-view] GWSubhexData not loaded'); return; }
    ensureDom();
    state.open = true; state.curParent = { col, row };
    state.el.overlay.classList.add('open');
    state.el.title.textContent = `Subhex · parent ${col},${row} · 3 mi/hex`;
    requestAnimationFrame(() => { state.rendered = null; centerOnParent(col, row); });
  }
  function close(){ state.open = false; if (state.el.overlay) state.el.overlay.classList.remove('open'); }
  function isOpen(){ return state.open; }
  function currentParent(){ return state.curParent || null; }

  window.GWSubhexView = { open, close, isOpen, currentParent, render };
  try { console.log('[gw-subhex-view] v0.5.0 loaded'); } catch(_){}
})();
