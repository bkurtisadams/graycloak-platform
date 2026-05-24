// gcc-map-mile-renderer.js v1.0.0 — 2026-05-24
// Phase B Slice 1 (stronghold/freehold) — the 1-mile scale. Closes the
// `local` scale DESIGN-unified-map.md reserved at 3:1 from the subhex
// (MILE_R = SUB_R/3, 30:1 from the parent). Read-only: it draws the
// mile-hex grid tinted by inherited terrain so you can drill subhex →
// mile over the same world. No authored mile data layer, no paint, no
// paths/fog/regions — those stay subhex concerns. Freehold overlays
// land in Slice 2+.
//
// Coord system mirrors the subhex renderer. The subhex renderer bakes
// DISPLAY_SCALE=13 into its world coords (subhex radius 26) and declares
// coordsScale=13. A mile-hex is 1/3 the subhex face, so to render it at
// the SAME on-screen radius (26 — reusing gcc-subhex.css calibration)
// the mile world coords are 3× denser: DISPLAY_SCALE=39, coordsScale=39.
// gcc-map.js converts state.view.cx/cy by 39/13 on a subhex→mile switch,
// so the geographic center is preserved and same-size hexes reveal a 3×
// closer view. pxPerWorldUnit stays 1 — world coords are already display
// scale.
//
// Terrain inheritance: a mile cell has no data of its own. It resolves
// the subhex its center falls in (svgToAxial on the data-coord center),
// then that subhex's owning parent, then the subhex's effective terrain
// (authored override or procedural) — exactly the subhex renderer's
// fill source. The mile / subhex / parent lattices are independent
// nearest-center partitions; a mile cell on a parent boundary resolves
// its owner on its own and need not nest. Never assume containment.

(function(){
  'use strict';
  if (!window.GCCMap){
    console.error('[mile-renderer] GCCMap missing — load gcc-map.js first');
    return;
  }

  const NS = 'http://www.w3.org/2000/svg';
  const DISPLAY_SCALE = 39;     // 3× the subhex's 13 — mile cell renders at radius 26
  const CELL_R = 26;            // on-screen mile-hex radius (matches subhex cell)
  const PARENT_R = 780;         // = HEX_R(20) × DISPLAY_SCALE, for the parent overlay
  const SQRT3 = Math.sqrt(3);

  let _ctx = null;
  let _root = null;
  let layers = null;

  // ── Global accessors ───────────────────────────────────────────
  function D(){ return window.GCCSubhexData; }
  function getTerrain(col, row){
    return (typeof window.getHexTerrain === 'function')
      ? window.getHexTerrain(col, row) : null;
  }
  function terrainRgb(t){
    const T = window.TERRAIN || {};
    return (t && T[t]?.rgb) ? `rgb(${T[t].rgb})` : '#d8c890';
  }
  function hexIdStr(col, row){
    if (typeof window.hexIdStr === 'function') return window.hexIdStr(col, row);
    return `${col},${row}`;
  }

  // ── Geometry ───────────────────────────────────────────────────
  function cellWorldCenter(Q, R){
    const d = D();
    if (!d || typeof d.mileSvgCenter !== 'function') return { x: 0, y: 0 };
    const c = d.mileSvgCenter(Q, R);
    return { x: c.x * DISPLAY_SCALE, y: c.y * DISPLAY_SCALE };
  }
  function cellCorners(Q, R){
    const c = cellWorldCenter(Q, R);
    const out = new Array(6);
    for (let i = 0; i < 6; i++){
      const a = (Math.PI / 180) * (60 * i);
      out[i] = [c.x + CELL_R * Math.cos(a), c.y + CELL_R * Math.sin(a)];
    }
    return out;
  }
  function cellDomId(Q, R){ return `mile-cell-${Q}_${R}`; }
  function parentWorldCenter(col, row){
    const d = D();
    if (!d || typeof d.parentSvgCenter !== 'function') return { x: 0, y: 0 };
    const c = d.parentSvgCenter(col, row);
    return { x: c.x * DISPLAY_SCALE, y: c.y * DISPLAY_SCALE };
  }
  function parentCornersAt(col, row){
    const c = parentWorldCenter(col, row);
    const out = new Array(6);
    for (let i = 0; i < 6; i++){
      const a = (Math.PI / 180) * (60 * i);
      out[i] = [c.x + PARENT_R * Math.cos(a), c.y + PARENT_R * Math.sin(a)];
    }
    return out;
  }
  // Viewport bbox in data-layer coords (HEX_R=20, SUB_R=2 native).
  // Shell ctx.viewportBbox is in this scale's world units (display
  // scale ×39). Divide for the data-layer call; margin = HEX_R_DATA × 2
  // covers cells whose polygons straddle the edge.
  function viewportBboxData(){
    const bb = _ctx.viewportBbox();
    const HEX_R_DATA = PARENT_R / DISPLAY_SCALE;
    const margin = HEX_R_DATA * 2;
    return {
      minX: bb.minX / DISPLAY_SCALE - margin,
      maxX: bb.maxX / DISPLAY_SCALE + margin,
      minY: bb.minY / DISPLAY_SCALE - margin,
      maxY: bb.maxY / DISPLAY_SCALE + margin,
    };
  }
  function visibleCells(){
    const d = D();
    if (!d || typeof d.mileCellsInAxialBbox !== 'function') return [];
    return d.mileCellsInAxialBbox(viewportBboxData());
  }
  function parentsInViewport(){
    const d = D();
    if (!d || typeof d.parentSvgCenter !== 'function') return [];
    const bbox = viewportBboxData();
    const HEX_R_DATA = PARENT_R / DISPLAY_SCALE;
    const colStep = 1.5 * HEX_R_DATA;
    const rowStep = SQRT3 * HEX_R_DATA;
    const colLo = Math.max(0, Math.floor((bbox.minX - HEX_R_DATA) / colStep) - 1);
    const colHi = Math.ceil((bbox.maxX - HEX_R_DATA) / colStep) + 1;
    const rowLo = Math.max(0, Math.floor((bbox.minY - HEX_R_DATA*SQRT3/2) / rowStep) - 1);
    const rowHi = Math.ceil((bbox.maxY - HEX_R_DATA*SQRT3/2) / rowStep) + 1;
    const out = [];
    for (let col = colLo; col <= colHi; col++){
      for (let row = rowLo; row <= rowHi; row++){
        const c = d.parentSvgCenter(col, row);
        if (c.x >= bbox.minX && c.x <= bbox.maxX && c.y >= bbox.minY && c.y <= bbox.maxY){
          out.push({ col, row });
        }
      }
    }
    return out;
  }

  // ── Terrain inheritance ────────────────────────────────────────
  // The subhex (and its owning parent) that a mile center falls in,
  // plus the effective subhex terrain the mile cell inherits. Returns
  // null owner when no parent claims the cell (off-map / sea gap).
  function inheritedFor(Q, R){
    const d = D();
    const dc = d.mileSvgCenter(Q, R);            // data-coord center
    const sub = d.svgToAxial(dc.x, dc.y);        // owning subhex axial
    const owner = d.ownerOf(sub.Q, sub.R);       // owning parent {col,row}
    const ownerTerrain = owner ? getTerrain(owner.col, owner.row) : null;
    const s = d.getSubhex(sub.Q, sub.R, ownerTerrain);
    return { sub, owner, ownerTerrain, terrain: s ? s.terrain : ownerTerrain };
  }

  // ── Cell rendering ─────────────────────────────────────────────
  function buildCellGroup(Q, R, layer){
    const inh = inheritedFor(Q, R);
    if (!inh.owner) return null;                 // unclaimed — skip

    const corners = cellCorners(Q, R);
    const pts = corners.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

    const sel = _ctx.selection();
    const isSelected = !!(sel && sel.kind === 'mile' && sel.Q === Q && sel.R === R);

    const group = document.createElementNS(NS, 'g');
    group.setAttribute('class', 'gcc-mile-cell-group');
    group.id = cellDomId(Q, R);
    group.dataset.q = Q;
    group.dataset.r = R;
    if (window.GCCFog && typeof window.GCCFog.shouldFogSubhex === 'function'
        && window.GCCFog.shouldFogSubhex(inh.sub.Q, inh.sub.R)){
      group.classList.add('fogged');
    }

    const poly = document.createElementNS(NS, 'polygon');
    poly.setAttribute('points', pts);
    poly.setAttribute('class', isSelected ? 'gcc-mile-cell selected' : 'gcc-mile-cell');
    poly.setAttribute('fill', terrainRgb(inh.terrain));
    group.appendChild(poly);

    group.addEventListener('click', onCellClick);
    layer.appendChild(group);
    return group;
  }

  // ── Cell click → shell selection ───────────────────────────────
  function onCellClick(ev){
    ev.stopPropagation();
    const Q = +ev.currentTarget.dataset.q;
    const R = +ev.currentTarget.dataset.r;
    _ctx.setSelection({ kind: 'mile', Q, R });
  }

  // ── Layers / rebuild ───────────────────────────────────────────
  function makeLayer(cls){
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', cls);
    return g;
  }
  function rebuildAllLayers(){
    if (!layers) return;
    for (const key of Object.keys(layers)){
      layers[key].innerHTML = '';
    }

    for (const { Q, R } of visibleCells()){
      buildCellGroup(Q, R, layers.cells);
    }

    const showLabels = _ctx.zoom() >= 0.7;
    layers.parents.setAttribute('pointer-events', 'none');
    for (const parent of parentsInViewport()){
      const corners = parentCornersAt(parent.col, parent.row);
      const pts = corners.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
      const poly = document.createElementNS(NS, 'polygon');
      poly.setAttribute('points', pts);
      poly.setAttribute('class', 'gcc-mile-parent-outline');
      layers.parents.appendChild(poly);
      if (showLabels){
        const c = parentWorldCenter(parent.col, parent.row);
        const text = document.createElementNS(NS, 'text');
        text.setAttribute('x', c.x.toFixed(1));
        text.setAttribute('y', (c.y - PARENT_R * 0.82).toFixed(1));
        text.setAttribute('class', 'gcc-mile-parent-label');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.textContent = hexIdStr(parent.col, parent.row);
        layers.parents.appendChild(text);
      }
    }
  }

  // ── Renderer contract ──────────────────────────────────────────
  function mount(svg, ctx){
    _ctx = ctx;
    _root = document.createElementNS(NS, 'g');
    _root.setAttribute('class', 'gcc-map-mile-root');
    svg.appendChild(_root);
    layers = {
      cells:   makeLayer('gcc-mile-cells-layer'),
      parents: makeLayer('gcc-mile-parent-layer'),
    };
    _root.appendChild(layers.cells);
    _root.appendChild(layers.parents);
    rebuildAllLayers();
  }
  function render(){ rebuildAllLayers(); }
  function unmount(){
    if (_root && _root.parentNode) _root.parentNode.removeChild(_root);
    _root = null;
    layers = null;
    _ctx = null;
  }

  // ── Register with shell ────────────────────────────────────────
  window.GCCMap.registerScale({
    name: 'mile',
    label: '1-mile',
    hexSize: 1,
    pxPerWorldUnit: 1,
    coordsScale: DISPLAY_SCALE,
    zoomMin: 0.25,
    zoomMax: 4.0,
    zoomDefault: 1.0,
    renderer: { mount, render, unmount },
    tools: [],
  });

  window.GCCMapMileRenderer = { inheritedFor };
})();
