// gw-subhex-tile-renderer.js v0.1.1 — 2026-07-07
// Raster preview renderer for the deterministic Gamma World subhex atlas.
//
// Tile Renderer Slice 1: paint one selected 30-mile parent hex into a canvas
// from GWSubhexAtlas.tileSourceForParent(). This is a dev/proof layer only:
// it does not replace the live SVG subhex viewer and it does not make image
// tiles canonical. Canvas/WebP/PNG output is a render artifact.
//
// Depends on window.GWSubhexAtlas and window.GWSubhexData.

(function(){
  'use strict';

  const RENDERER_VERSION = '0.1.1';
  const DEFAULT_SIZE = 1024;
  const DEFAULT_PADDING_WORLD = 1.2;
  const SQRT3 = Math.sqrt(3);

  const FALLBACK_TERRAIN = {
    water: '#72a3c8', coast: '#9cb87a', plains: '#e6b04e', desert: '#eaca44',
    hills: '#b58a52', marsh: '#4e8b78', forest: '#76b057', 'heavy-forest': '#28644f',
    'forested-hill': '#7d8a46', 'forested-mountains': '#566b3e', mountains: '#6e5046',
    'snow-mountains': '#dcd7d7', ruins: '#a8576b', unknown: '#3c3c3c',
  };

  const STROKE = {
    river: { color: '#5da0d3', px: 5.2, cap: 'round', dash: null },
    road:  { color: '#8c6b43', px: 4.6, cap: 'round', dash: null },
    trail: { color: '#c0a070', px: 2.8, cap: 'round', dash: [5, 6] },
    pen:   { color: '#f0d7a0', px: 3.0, cap: 'round', dash: null },
  };
  const ANCIENT = {
    usable:     { color: '#7b6b58', px: 5.2, dash: [16, 7], opacity: 0.86 },
    broken:     { color: '#5f5145', px: 5.2, dash: [13, 8, 2.5, 8], opacity: 0.78 },
    buried:     { color: '#72634d', px: 4.4, dash: [5, 7], opacity: 0.48 },
    'bridge-out': { color: '#8f553d', px: 5.5, dash: [10, 5, 2, 5, 2, 8], opacity: 0.86 },
    blocked:    { color: '#4a3830', px: 5.5, dash: [8, 5, 1.8, 5], opacity: 0.66 },
    lost:       { color: '#4e5851', px: 4.0, dash: [2, 8], opacity: 0.38 },
  };

  const MARKER_ICON = {
    city: '◎', town: '■', village: '•', ruin: '⌐', vault: '◇', lair: '▲', camp: '△',
    shrine: '✦', monastery: '✝', landmark: '◆', 'robot-farm': '⚙', fortification: '⬟',
    spaceport: '⌃', installation: '⌂',
  };

  function D(){ return window.GWSubhexData || null; }
  function Atlas(){ return window.GWSubhexAtlas || null; }

  function finite(v, fallback){ return Number.isFinite(+v) ? +v : fallback; }
  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
  function cssColorForTerrain(key){
    const d = D();
    return (d && d.TERRAIN && d.TERRAIN[key] && d.TERRAIN[key].fill) || FALLBACK_TERRAIN[key] || FALLBACK_TERRAIN.unknown;
  }

  function flatCorners(cx, cy, r){
    const pts = [];
    for (let i = 0; i < 6; i++){
      const a = i * Math.PI / 3;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }
  function polygonPath(ctx, pts){
    if (!pts || !pts.length) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }
  function hexPath(ctx, cx, cy, r){ polygonPath(ctx, flatCorners(cx, cy, r)); }

  function expandBounds(b, pad){
    return { minX: b.minX - pad, minY: b.minY - pad, maxX: b.maxX + pad, maxY: b.maxY + pad };
  }
  function pointsBounds(pts){
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of (pts || [])){
      if (!Array.isArray(p) || !Number.isFinite(+p[0]) || !Number.isFinite(+p[1])) continue;
      minX = Math.min(minX, +p[0]); maxX = Math.max(maxX, +p[0]);
      minY = Math.min(minY, +p[1]); maxY = Math.max(maxY, +p[1]);
    }
    return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
  }
  function parentHexBounds(source){
    const d = D();
    const pc = source && source.parent && source.parent.center;
    const r = d ? d.HEX_R : 20;
    if (!pc) return source && source.parent && source.parent.bbox ? source.parent.bbox : { minX: 0, minY: 0, maxX: 40, maxY: 40 };
    return pointsBounds(flatCorners(pc.x, pc.y, r));
  }
  function boundsFromSource(source, opts){
    const pad = finite(opts && opts.paddingWorld, DEFAULT_PADDING_WORLD);
    // Tile previews should be scaled to the selected 30-mile parent hex, not
    // to every road/river point whose bbox happens to intersect it. Including
    // long authored rivers in the fit bounds made the parent terrain collapse
    // into a tiny blob while the path sprawled across the whole canvas.
    let b = expandBounds(parentHexBounds(source), pad);
    if (opts && opts.fitContents === true){
      const d = D();
      const r = d ? d.SUB_R : 2;
      const cells = (source.parent && source.parent.subhex && source.parent.subhex.cells) || [];
      for (const c of cells){
        if (!c || !c.center) continue;
        b.minX = Math.min(b.minX, c.center.x - r);
        b.maxX = Math.max(b.maxX, c.center.x + r);
        b.minY = Math.min(b.minY, c.center.y - r);
        b.maxY = Math.max(b.maxY, c.center.y + r);
      }
    }
    return b;
  }
  function clipToParent(ctx, source){
    const d = D();
    const pc = source && source.parent && source.parent.center;
    if (!pc) return false;
    hexPath(ctx, pc.x, pc.y, d ? d.HEX_R : 20);
    ctx.clip();
    return true;
  }
  function makeProjection(canvas, bounds, marginPx){
    const w = bounds.maxX - bounds.minX;
    const h = bounds.maxY - bounds.minY;
    const innerW = Math.max(1, canvas.width - marginPx * 2);
    const innerH = Math.max(1, canvas.height - marginPx * 2);
    const scale = Math.min(innerW / w, innerH / h);
    const offsetX = marginPx + (innerW - w * scale) / 2 - bounds.minX * scale;
    const offsetY = marginPx + (innerH - h * scale) / 2 - bounds.minY * scale;
    return {
      scale, offsetX, offsetY,
      worldPx: px => px / scale,
      apply(ctx){ ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY); },
      reset(ctx){ ctx.setTransform(1, 0, 0, 1, 0, 0); },
      x(x){ return x * scale + offsetX; },
      y(y){ return y * scale + offsetY; },
    };
  }

  function createCanvas(sizeOrOpts, maybeH){
    const w = Math.max(128, Math.floor(finite(sizeOrOpts, DEFAULT_SIZE)));
    const h = Math.max(128, Math.floor(finite(maybeH, w)));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function clearCanvas(ctx, canvas, opts){
    const bg = (opts && opts.background) || '#130b04';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // subtle parchment-noise bands without random pixels, so the same tile is stable
    ctx.globalAlpha = 0.025;
    ctx.fillStyle = '#f0d090';
    for (let y = 0; y < canvas.height; y += 37) ctx.fillRect(0, y, canvas.width, 1);
    ctx.restore();
  }

  function drawCells(ctx, source, proj, opts){
    const d = D();
    const subR = d ? d.SUB_R : 2;
    const cells = (source.parent && source.parent.subhex && source.parent.subhex.cells) || [];
    for (const c of cells){
      if (!c || !c.center) continue;
      hexPath(ctx, c.center.x, c.center.y, subR);
      ctx.fillStyle = cssColorForTerrain(c.terrain || 'unknown');
      ctx.globalAlpha = 0.95;
      ctx.fill();
    }
    if (opts.showRadiation !== false){
      for (const c of cells){
        if (!c || !c.center || c.hazard !== 'radiation') continue;
        drawRadiationHex(ctx, c.center.x, c.center.y, subR, proj);
      }
    }
    if (opts.showGrid !== false){
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(25, 15, 8, 0.38)';
      ctx.lineWidth = proj.worldPx(0.8);
      for (const c of cells){
        if (!c || !c.center) continue;
        hexPath(ctx, c.center.x, c.center.y, subR);
        ctx.stroke();
      }
    }
  }

  function drawRadiationHex(ctx, x, y, r, proj){
    ctx.save();
    hexPath(ctx, x, y, r);
    ctx.fillStyle = 'rgba(185, 235, 45, 0.22)';
    ctx.fill();
    ctx.clip();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = 'rgba(215, 255, 80, 0.58)';
    ctx.lineWidth = proj.worldPx(1.05);
    const step = proj.worldPx(7);
    const span = r * 2.8;
    for (let t = -span; t <= span; t += step){
      ctx.beginPath();
      ctx.moveTo(x - span, y + t + span);
      ctx.lineTo(x + span, y + t - span);
      ctx.stroke();
    }
    ctx.restore();
  }

  function collectStrokesAndMarkers(source){
    const generated = source.generated || (source.parent && source.parent.generated && source.parent.generated.plan) || null;
    const authored = source.authoredAnnotations || {};
    const genPlan = (source.parent && source.parent.generated && source.parent.generated.plan) || generated || {};
    const strokes = [];
    const markers = [];
    if (genPlan && Array.isArray(genPlan.strokes)) strokes.push(...genPlan.strokes.map(x => Object.assign({ gen: true }, x)));
    if (authored && Array.isArray(authored.strokes)) strokes.push(...authored.strokes);
    if (genPlan && Array.isArray(genPlan.markers)) markers.push(...genPlan.markers.map(x => Object.assign({ gen: true }, x)));
    if (authored && Array.isArray(authored.markers)) markers.push(...authored.markers);
    return { strokes, markers };
  }

  function smoothCanvasPath(ctx, pts){
    if (!pts || pts.length < 2) return false;
    const clean = pts.map(p => [Number(p[0]), Number(p[1])]).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (clean.length < 2) return false;
    ctx.beginPath();
    ctx.moveTo(clean[0][0], clean[0][1]);
    if (clean.length === 2){ ctx.lineTo(clean[1][0], clean[1][1]); return true; }
    for (let i = 0; i < clean.length - 1; i++){
      const p0 = clean[i - 1] || clean[i];
      const p1 = clean[i];
      const p2 = clean[i + 1];
      const p3 = clean[i + 2] || p2;
      ctx.bezierCurveTo(
        p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
        p2[0], p2[1]
      );
    }
    return true;
  }

  function setDashPx(ctx, arr, proj){
    ctx.setLineDash(Array.isArray(arr) ? arr.map(px => Math.max(0.01, proj.worldPx(px))) : []);
  }
  function drawStrokes(ctx, source, proj, opts){
    const { strokes } = collectStrokesAndMarkers(source);
    const showAncient = opts.showAncientRoads !== false;
    const drawOne = (s) => {
      if (!s || !Array.isArray(s.pts) || s.pts.length < 2) return;
      if (s.hidden && opts.showHidden === false) return;
      if (s.kind === 'ancient-road' && !showAncient) return;
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (s.kind === 'ancient-road'){
        const st = ANCIENT[s.condition || 'broken'] || ANCIENT.broken;
        if (smoothCanvasPath(ctx, s.pts)){
          ctx.globalAlpha = Math.min(0.48, st.opacity || 0.7);
          ctx.strokeStyle = 'rgba(31, 22, 16, 0.92)';
          ctx.lineWidth = proj.worldPx(st.px + 3.1);
          ctx.setLineDash([]);
          ctx.stroke();
        }
        if (smoothCanvasPath(ctx, s.pts)){
          ctx.globalAlpha = st.opacity || 0.75;
          ctx.strokeStyle = s.color || st.color;
          ctx.lineWidth = proj.worldPx(st.px);
          setDashPx(ctx, st.dash, proj);
          ctx.stroke();
        }
      } else {
        const st = STROKE[s.kind] || STROKE.pen;
        ctx.globalAlpha = s.hidden ? 0.38 : 0.92;
        ctx.strokeStyle = s.color || st.color;
        ctx.lineWidth = proj.worldPx(s.width ? clamp(+s.width * 2.5, 2.5, 13) : st.px);
        setDashPx(ctx, st.dash, proj);
        if (smoothCanvasPath(ctx, s.pts)) ctx.stroke();
      }
      ctx.restore();
    };
    // Water first, then trails/roads, ancient highways on top.
    strokes.filter(s => s.kind === 'river').forEach(drawOne);
    strokes.filter(s => s.kind !== 'river' && s.kind !== 'ancient-road').forEach(drawOne);
    strokes.filter(s => s.kind === 'ancient-road').forEach(drawOne);
  }

  function priorityForMarker(m){
    const kind = m && m.kind;
    if (!m || !m.name) return 99;
    if (!m.gen) return 0;
    if (kind === 'city' || kind === 'town' || kind === 'ruin') return 1;
    if (kind === 'village' || kind === 'vault' || kind === 'spaceport' || kind === 'installation') return 2;
    return 3;
  }
  function boxesOverlap(a, b){
    return !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);
  }
  function drawMarkers(ctx, source, proj, opts){
    const { markers } = collectStrokesAndMarkers(source);
    if (opts.showMarkers === false) return;
    const visible = markers
      .filter(m => m && Number.isFinite(+m.x) && Number.isFinite(+m.y) && !(m.hidden && opts.showHidden === false))
      .sort((a, b) => priorityForMarker(a) - priorityForMarker(b));
    const labelBoxes = [];
    const maxLabels = Number.isFinite(+opts.maxLabels) ? Math.max(0, +opts.maxLabels) : 18;
    let labelsDrawn = 0;
    for (const m of visible){
      const r = proj.worldPx(m.kind === 'city' ? 8 : 6);
      ctx.save();
      ctx.globalAlpha = m.hidden ? 0.55 : 1;
      ctx.beginPath();
      ctx.arc(+m.x, +m.y, r, 0, Math.PI * 2);
      ctx.fillStyle = m.gen ? 'rgba(245, 235, 205, 0.82)' : 'rgba(255, 243, 206, 0.95)';
      ctx.strokeStyle = m.hidden ? '#ff6860' : 'rgba(73, 43, 24, 0.75)';
      ctx.lineWidth = proj.worldPx(1.6);
      if (m.hidden) setDashPx(ctx, [4, 3], proj); else ctx.setLineDash([]);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#6b3218';
      ctx.font = `${Math.max(proj.worldPx(9.5), r * 1.38)}px Georgia, serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(MARKER_ICON[m.kind] || '•', +m.x, +m.y + r * 0.06);
      if (opts.showLabels !== false && m.name && labelsDrawn < maxLabels){
        const fontWorld = proj.worldPx(m.kind === 'city' || m.kind === 'town' ? 12.4 : 10.6);
        ctx.font = `${fontWorld}px Georgia, serif`;
        ctx.textBaseline = 'top';
        const text = String(m.name).slice(0, 34);
        const ty = +m.y + r * 1.45;
        const w = ctx.measureText(text).width;
        const pad = proj.worldPx(3);
        const box = { x1: +m.x - w / 2 - pad, x2: +m.x + w / 2 + pad, y1: ty - pad, y2: ty + fontWorld * 1.25 + pad };
        if (!labelBoxes.some(b => boxesOverlap(box, b))){
          labelBoxes.push(box); labelsDrawn++;
          ctx.lineWidth = proj.worldPx(2.6);
          ctx.strokeStyle = 'rgba(20, 10, 4, 0.82)';
          ctx.fillStyle = '#fff0c6';
          ctx.strokeText(text, +m.x, ty);
          ctx.fillText(text, +m.x, ty);
        }
      }
      ctx.restore();
    }
  }

  function drawParentFrame(ctx, source, proj){
    const d = D();
    const pc = source.parent && source.parent.center;
    const r = d ? d.HEX_R : 20;
    if (!pc) return;
    ctx.save();
    hexPath(ctx, pc.x, pc.y, r);
    ctx.fillStyle = 'rgba(255, 210, 120, 0.035)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 205, 120, 0.86)';
    ctx.lineWidth = proj.worldPx(2.4);
    ctx.setLineDash([proj.worldPx(9), proj.worldPx(5)]);
    ctx.stroke();
    ctx.restore();
  }

  function drawLegendAndStamp(ctx, canvas, source, stats, opts){
    if (opts.showStamp === false) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const pad = 14;
    const title = `Gamma World subhex tile preview · parent ${source.parent.col},${source.parent.row}`;
    const sub = `${source.parent.terrain || 'unknown'}${source.parent.hazard ? ' · ' + source.parent.hazard : ''} · ${stats.cells} cells · ${stats.markers} AOI · ${stats.strokes} paths`;
    ctx.fillStyle = 'rgba(16, 8, 2, 0.72)';
    ctx.fillRect(0, 0, canvas.width, 48);
    ctx.font = '600 15px Georgia, serif';
    ctx.fillStyle = '#ffbd82';
    ctx.fillText(title, pad, 18);
    ctx.font = '12px Georgia, serif';
    ctx.fillStyle = '#dec79a';
    ctx.fillText(sub, pad, 36);
    ctx.restore();
  }

  function renderTileSource(source, opts){
    opts = opts || {};
    if (!source || !source.parent) throw new Error('No tile source was supplied.');
    const size = Math.max(128, Math.floor(finite(opts.size, DEFAULT_SIZE)));
    const canvas = opts.canvas || createCanvas(size, opts.height || size);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is not available.');
    const bounds = boundsFromSource(source, opts);
    const proj = makeProjection(canvas, bounds, finite(opts.marginPx, 24));
    const ann = collectStrokesAndMarkers(source);
    const cells = (source.parent.subhex && source.parent.subhex.cells) || [];
    const stats = { cells: cells.length, strokes: ann.strokes.length, markers: ann.markers.length };

    clearCanvas(ctx, canvas, opts);
    proj.apply(ctx);
    ctx.save();
    clipToParent(ctx, source);
    drawCells(ctx, source, proj, opts);
    drawStrokes(ctx, source, proj, opts);
    drawMarkers(ctx, source, proj, opts);
    ctx.restore();
    drawParentFrame(ctx, source, proj);
    drawLegendAndStamp(ctx, canvas, source, stats, opts);

    return { canvas, source, bounds, stats, version: RENDERER_VERSION };
  }

  function renderParent(col, row, opts){
    opts = opts || {};
    const atlas = Atlas();
    if (!atlas || typeof atlas.tileSourceForParent !== 'function') throw new Error('GWSubhexAtlas.tileSourceForParent() is not available.');
    const source = atlas.tileSourceForParent(+col, +row);
    if (!source) throw new Error(`Parent ${col},${row} is outside the atlas bounds.`);
    return renderTileSource(source, opts);
  }

  function canvasBlob(canvas, type, quality){
    return new Promise((resolve, reject) => {
      if (!canvas || typeof canvas.toBlob !== 'function') return reject(new Error('Canvas export is not supported.'));
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else if (type !== 'image/png') canvas.toBlob(fallback => fallback ? resolve(fallback) : reject(new Error('Canvas export failed.')), 'image/png');
        else reject(new Error('Canvas export failed.'));
      }, type || 'image/png', quality == null ? 0.92 : quality);
    });
  }
  async function downloadCanvas(canvas, filename, type, quality){
    const blob = await canvasBlob(canvas, type, quality);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    let dlName = filename || 'gw-subhex-tile-preview.png';
    if (type === 'image/webp' && blob.type === 'image/png') dlName = dlName.replace(/\.webp$/i, '.png');
    a.download = dlName;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return blob;
  }

  function ensurePreviewStyle(){
    if (document.getElementById('gw-tile-preview-style')) return;
    const s = document.createElement('style');
    s.id = 'gw-tile-preview-style';
    s.textContent = `
      #gw-tile-preview-modal { position:fixed; inset:0; z-index:500; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.68); }
      #gw-tile-preview-modal .gw-tile-card { width:min(92vw, 980px); max-height:92vh; overflow:auto; background:rgba(16,8,2,.97); border:1px solid #6b430d; box-shadow:0 10px 40px rgba(0,0,0,.75); padding:12px; color:#e8d5a3; }
      #gw-tile-preview-modal .gw-tile-head { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
      #gw-tile-preview-modal .gw-tile-title { flex:1; font-family:Cinzel, Georgia, serif; color:#ffaa66; font-size:13px; letter-spacing:.08em; }
      #gw-tile-preview-modal canvas { display:block; max-width:100%; height:auto; border:1px solid rgba(255,160,80,.35); background:#130b04; image-rendering:auto; }
      #gw-tile-preview-modal .gw-tile-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
      #gw-tile-preview-modal .gw-tile-note { font-size:11px; color:#c8a96e; margin-top:8px; }
    `;
    document.head.appendChild(s);
  }

  function showPreview(result, opts){
    opts = opts || {};
    ensurePreviewStyle();
    let modal = document.getElementById('gw-tile-preview-modal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'gw-tile-preview-modal';
    const card = document.createElement('div'); card.className = 'gw-tile-card';
    const head = document.createElement('div'); head.className = 'gw-tile-head';
    const title = document.createElement('div'); title.className = 'gw-tile-title';
    title.textContent = `Tile preview · parent ${result.source.parent.col},${result.source.parent.row}`;
    const close = document.createElement('button'); close.textContent = 'Close'; close.addEventListener('click', () => modal.remove());
    head.append(title, close);
    card.appendChild(head);
    card.appendChild(result.canvas);
    const actions = document.createElement('div'); actions.className = 'gw-tile-actions';
    const base = `gw-subhex-parent-${result.source.parent.col}-${result.source.parent.row}`;
    const webp = document.createElement('button'); webp.textContent = 'Download WebP';
    webp.addEventListener('click', async () => { webp.disabled = true; try { await downloadCanvas(result.canvas, base + '.webp', 'image/webp', 0.9); } finally { webp.disabled = false; } });
    const png = document.createElement('button'); png.textContent = 'Download PNG';
    png.addEventListener('click', async () => { png.disabled = true; try { await downloadCanvas(result.canvas, base + '.png', 'image/png'); } finally { png.disabled = false; } });
    actions.append(webp, png);
    card.appendChild(actions);
    const note = document.createElement('div'); note.className = 'gw-tile-note';
    note.textContent = 'Preview only: this raster image is generated from atlas data and is not the canonical map source.';
    card.appendChild(note);
    modal.appendChild(card);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
    return modal;
  }

  window.GWSubhexTileRenderer = {
    version: RENDERER_VERSION,
    renderParent,
    renderTileSource,
    canvasBlob,
    downloadCanvas,
    showPreview,
  };
  try { console.log('[gw-subhex-tile-renderer] v0.1.1 loaded'); } catch(_){ }
})();
