// gcc-subhex-icons.js v1.0.0 — 2026-05-01
// v1.0.0 — per-kind feature glyph colors. Each FEATURE_GLYPHS entry
// renders in a category-specific ink (gold for inhabited
// settlements/landmarks, purple for arcane towers, blue for shrines,
// red for lairs, brown for ruins/graves, amber for travel
// infrastructure, slate-grey for crossroads/ferries). The halo
// behind each glyph picks up a faint tint of the same family so
// the categories cluster visually even before the shape is read.
// Glyph functions consult currentInk() / currentAccent() helpers
// that read a module-level _currentKind set by appendFeature; the
// rendering remains synchronous so the global is safe.
//
// v0.9.0 — 2026-04-30
// v0.9 adds CITY and TOWN glyphs. City reads as a walled silhouette
// (wall + three buildings + central tower with flag); town reads as
// a central peaked-roof building flanked by two smaller huts. Both
// scale visually larger than the existing village (three small huts)
// so the three settlement tiers — village/town/city — are
// distinguishable at a glance.
//
// v0.8.0 — 2026-04-28
// Terrain icon registry for the subhex window. One small SVG glyph per
// terrain type, stamped into each cell at a deterministic-jittered
// position so identical-terrain neighbors don't form a polka-dot grid.
// Style mirrors the line-art Darlene/Greyhawk vibe: single-color ink
// strokes, no fills except mountains. Cell radius ~26 viewbox units;
// icons sized for ~14 unit footprint with the cell.
//
// v0.8 adds CROSSING GLYPHS — bridge / ford / crossroads / ferry —
// for the auto-detected path-crossing features. Bridge: three-arch
// stone bridge over water. Ford: two parallel dashed lines (the road)
// with a wavy line between (shallow water). Crossroads: bold X with
// a red dot at the intersection. Ferry: hulled boat with a triangular
// sail on a water line.
//
// v0.7 adds FEATURE GLYPHS — louder, filled, parchment-haloed icons
// for castle/ruin/tower/village/camp/cache/shrine/lair/grave/landmark.
// Inspired by the Maure Castle environs map: bold silhouettes on a
// pale halo so they read clearly against any terrain color and against
// the subdued terrain icons stamped beneath.
//
// Phase A icon set (7): hills, mountains, hardwood, forest/conifer,
// swamp, plains, clear. Other terrains (jungle, desert, barrens,
// forest_hills, water_*) fall through to the closest match or render
// no icon — color fill carries the cell.
//
// Public API:
//   GCCSubhexIcons.append(parentG, terrain, cx, cy, subR, q, r)
//     Appends terrain icon child elements to parentG (SVG <g>) at the
//     cell center, with deterministic jitter seeded on (q, r). No-op
//     if terrain has no icon.
//   GCCSubhexIcons.appendFeature(parentG, kind, cx, cy, subR)
//     Appends feature glyph child elements (halo + glyph) at the
//     cell center, no jitter. No-op if kind not recognized.
//   GCCSubhexIcons.FEATURE_KINDS  → array of kinds for which a glyph
//     is registered (used by view to filter the palette).

(function(){
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  // Map every terrain key to a glyph kind. Keys not in this map render
  // no icon. Keep the kinds small — visual grouping > visual variety
  // at this scale.
  const TERRAIN_TO_GLYPH = {
    hills:        'hills',
    forest_hills: 'hills',
    mountains:    'mountains',
    forest:       'conifer',
    conifer:      'conifer',
    hardwood:     'hardwood',
    jungle:       'hardwood',
    swamp:        'swamp',
    plains:       'plains',
    desert:       'dunes',
    barrens:      'barrens',
    // clear and water_* render no icon — flat fill speaks for itself.
  };

  const INK = {
    hills:     '#3a2410',
    mountains: '#1a0a00',
    conifer:   '#0a2010',
    hardwood:  '#0a2810',
    swamp:     '#2a3a10',
    plains:    '#3a4a10',
    dunes:     '#5a4015',
    barrens:   '#4a3a18',
  };

  function el(tag, attrs){
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    e.setAttribute('class', (attrs.class ? attrs.class + ' ' : '') + 'sxw-icon');
    e.style.pointerEvents = 'none';
    return e;
  }

  // Glyph builders. Each takes (g, cx, cy, s) where s is half the
  // visual footprint (≈ SUB_R * 0.42 by default, set in append()).
  const GLYPHS = {
    hills(g, cx, cy, s){
      const ink = INK.hills;
      // Three little arcs in a "^^^" run, slightly varied heights.
      const d = `M ${cx - s*1.1} ${cy + s*0.3}` +
                ` Q ${cx - s*0.75} ${cy - s*0.45} ${cx - s*0.4} ${cy + s*0.3}` +
                ` Q ${cx - s*0.05} ${cy - s*0.55} ${cx + s*0.3} ${cy + s*0.3}` +
                ` Q ${cx + s*0.65} ${cy - s*0.45} ${cx + s*1.0} ${cy + s*0.3}`;
      g.appendChild(el('path', { d, fill: 'none', stroke: ink, 'stroke-width': '1.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    },
    mountains(g, cx, cy, s){
      const ink = INK.mountains;
      // Jagged peak silhouette filled.
      const d = `M ${cx - s} ${cy + s*0.55}` +
                ` L ${cx - s*0.35} ${cy - s*0.7}` +
                ` L ${cx + s*0.05} ${cy - s*0.05}` +
                ` L ${cx + s*0.55} ${cy - s*0.45}` +
                ` L ${cx + s} ${cy + s*0.55} Z`;
      g.appendChild(el('path', { d, fill: ink, stroke: ink, 'stroke-width': '0.6', 'stroke-linejoin': 'round' }));
    },
    hardwood(g, cx, cy, s){
      const ink = INK.hardwood;
      // Round canopy + tiny trunk.
      g.appendChild(el('line', { x1: cx, y1: cy + s*0.2, x2: cx, y2: cy + s*0.7, stroke: ink, 'stroke-width': '1.2', 'stroke-linecap': 'round' }));
      g.appendChild(el('circle', { cx, cy: cy - s*0.1, r: s*0.55, fill: ink }));
    },
    conifer(g, cx, cy, s){
      const ink = INK.conifer;
      // Triangular canopy + trunk.
      g.appendChild(el('line', { x1: cx, y1: cy + s*0.2, x2: cx, y2: cy + s*0.7, stroke: ink, 'stroke-width': '1.2', 'stroke-linecap': 'round' }));
      const d = `M ${cx} ${cy - s*0.85} L ${cx - s*0.6} ${cy + s*0.25} L ${cx + s*0.6} ${cy + s*0.25} Z`;
      g.appendChild(el('path', { d, fill: ink }));
    },
    swamp(g, cx, cy, s){
      const ink = INK.swamp;
      // Stylized reeds and a low wave.
      g.appendChild(el('path', {
        d: `M ${cx - s*0.85} ${cy + s*0.35} Q ${cx - s*0.4} ${cy - s*0.05} ${cx} ${cy + s*0.35} Q ${cx + s*0.4} ${cy - s*0.05} ${cx + s*0.85} ${cy + s*0.35}`,
        fill: 'none', stroke: ink, 'stroke-width': '1.0', 'stroke-linecap': 'round',
      }));
      g.appendChild(el('line', { x1: cx - s*0.35, y1: cy - s*0.45, x2: cx - s*0.35, y2: cy - s*0.05, stroke: ink, 'stroke-width': '0.9' }));
      g.appendChild(el('line', { x1: cx + s*0.35, y1: cy - s*0.45, x2: cx + s*0.35, y2: cy - s*0.05, stroke: ink, 'stroke-width': '0.9' }));
    },
    plains(g, cx, cy, s){
      const ink = INK.plains;
      // Faint grass tuft — three short verticals.
      g.appendChild(el('line', { x1: cx - s*0.3, y1: cy + s*0.35, x2: cx - s*0.2, y2: cy - s*0.05, stroke: ink, 'stroke-width': '0.8', 'stroke-linecap': 'round' }));
      g.appendChild(el('line', { x1: cx, y1: cy + s*0.35, x2: cx, y2: cy - s*0.2, stroke: ink, 'stroke-width': '0.8', 'stroke-linecap': 'round' }));
      g.appendChild(el('line', { x1: cx + s*0.3, y1: cy + s*0.35, x2: cx + s*0.2, y2: cy - s*0.05, stroke: ink, 'stroke-width': '0.8', 'stroke-linecap': 'round' }));
    },
    dunes(g, cx, cy, s){
      const ink = INK.dunes;
      // Two low arches.
      g.appendChild(el('path', {
        d: `M ${cx - s} ${cy + s*0.2} Q ${cx - s*0.5} ${cy - s*0.15} ${cx} ${cy + s*0.2} Q ${cx + s*0.5} ${cy - s*0.15} ${cx + s} ${cy + s*0.2}`,
        fill: 'none', stroke: ink, 'stroke-width': '1.0', 'stroke-linecap': 'round',
      }));
    },
    barrens(g, cx, cy, s){
      const ink = INK.barrens;
      // Scattered dots.
      const dots = [[-0.6, 0.1], [-0.1, -0.3], [0.4, 0.2], [0.6, -0.4], [0.0, 0.4]];
      for (const [dx, dy] of dots){
        g.appendChild(el('circle', { cx: cx + s*dx, cy: cy + s*dy, r: '0.9', fill: ink }));
      }
    },
  };

  function append(parentG, terrain, cx, cy, subR, q, r){
    if (!parentG || !terrain) return;
    const kind = TERRAIN_TO_GLYPH[terrain];
    if (!kind || !GLYPHS[kind]) return;
    // Deterministic jitter seeded on (q,r). Range ±20% of subR keeps
    // the icon comfortably inside the cell at any orientation.
    let jx = 0, jy = 0;
    if (window.GCCRng){
      const h = window.GCCRng.cyrb53(`subhex-icon|${q}|${r}`, 0);
      jx = (((h & 0xff) / 255) - 0.5) * subR * 0.25;
      jy = ((((h >>> 8) & 0xff) / 255) - 0.5) * subR * 0.25;
    }
    const s = subR * 0.42;
    GLYPHS[kind](parentG, cx + jx, cy + jy, s);
  }

  // ── Feature glyphs ────────────────────────────────────────────────────
  // Bolder than terrain icons. Each renders as a parchment-cream halo
  // disk topped with a filled silhouette in dark ink and (optionally)
  // a small accent. Sized to ~70% of cell radius so they read clearly
  // even when the terrain icon is also stamped in the cell.

  const FEATURE_INK   = '#1a0a00';
  const FEATURE_ACCENT = '#a32d2d';
  const FEATURE_HALO_FILL   = '#f4e8c4';
  const FEATURE_HALO_STROKE = '#5a4a30';

  // Per-kind colors. ink = main glyph fill, accent = secondary detail
  // (flag, eye, water line, etc.), haloFill / haloStroke = the disk
  // behind the glyph. Categories: gold = inhabited (city/town/village
  // /castle/landmark); purple = arcane (tower); blue = sacred (shrine);
  // red = danger (lair); brown = decay (ruin/grave); amber = travel
  // infra (camp/cache/bridge/ford); slate-grey = neutral travel
  // (crossroads/ferry). Halo fill is a much paler tint of the ink.
  const FEATURE_PALETTE = {
    castle:     { ink:'#7a5810', accent:'#a32d2d', haloFill:'#f9e8c6', haloStroke:'#b8881a' },
    city:       { ink:'#7a5810', accent:'#a32d2d', haloFill:'#f9e8c6', haloStroke:'#b8881a' },
    town:       { ink:'#7a5810', accent:'#a32d2d', haloFill:'#f9e8c6', haloStroke:'#b8881a' },
    village:    { ink:'#7a5810', accent:'#a32d2d', haloFill:'#f9e8c6', haloStroke:'#b8881a' },
    landmark:   { ink:'#5a3a0a', accent:'#5a3a0a', haloFill:'#f4e4be', haloStroke:'#8a6a30' },
    tower:      { ink:'#3a1f5a', accent:'#7f4ec8', haloFill:'#ece0fa', haloStroke:'#6b3aa0' },
    shrine:     { ink:'#1a3a5a', accent:'#3a78b5', haloFill:'#dee8f4', haloStroke:'#3a78b5' },
    lair:       { ink:'#6a1a14', accent:'#c64030', haloFill:'#f5dadc', haloStroke:'#a8302a' },
    ruin:       { ink:'#3a2e1a', accent:'#3a2e1a', haloFill:'#e8e2d4', haloStroke:'#6a5a40' },
    grave:      { ink:'#3a2e1a', accent:'#3a2e1a', haloFill:'#e8e2d4', haloStroke:'#6a5a40' },
    camp:       { ink:'#6a3a10', accent:'#c87830', haloFill:'#f6e6c8', haloStroke:'#a86420' },
    cache:      { ink:'#6a3a10', accent:'#c87830', haloFill:'#f6e6c8', haloStroke:'#a86420' },
    bridge:     { ink:'#4a3210', accent:'#aa7e3a', haloFill:'#f0e2c8', haloStroke:'#8a6a30' },
    ford:       { ink:'#4a3210', accent:'#3a78b5', haloFill:'#f0e2c8', haloStroke:'#8a6a30' },
    crossroads: { ink:'#3a3228', accent:'#a32d2d', haloFill:'#ece8e0', haloStroke:'#5a5048' },
    ferry:      { ink:'#3a3228', accent:'#3a78b5', haloFill:'#ece8e0', haloStroke:'#5a5048' },
  };

  // Set by appendFeature() before invoking the glyph fn; read by
  // currentInk()/currentAccent() inside each glyph. Synchronous render
  // path makes this safe.
  let _currentKind = null;
  function currentInk(){
    const p = _currentKind && FEATURE_PALETTE[_currentKind];
    return p ? p.ink : FEATURE_INK;
  }
  function currentAccent(){
    const p = _currentKind && FEATURE_PALETTE[_currentKind];
    return p ? p.accent : FEATURE_ACCENT;
  }
  function currentHaloFill(){
    const p = _currentKind && FEATURE_PALETTE[_currentKind];
    return p ? p.haloFill : FEATURE_HALO_FILL;
  }
  function currentHaloStroke(){
    const p = _currentKind && FEATURE_PALETTE[_currentKind];
    return p ? p.haloStroke : FEATURE_HALO_STROKE;
  }

  function appendHalo(g, cx, cy, r){
    g.appendChild(el('circle', {
      cx, cy, r,
      fill: currentHaloFill(),
      stroke: currentHaloStroke(),
      'stroke-width': '1.3',
    }));
  }

  const FEATURE_GLYPHS = {
    castle(g, cx, cy, s){
      // Square keep with three crenellations and a tiny red flag.
      const w = s * 1.2, h = s * 0.9;
      const x0 = cx - w/2, y0 = cy - h*0.4;
      g.appendChild(el('rect', {
        x: x0, y: y0 + h*0.25, width: w, height: h*0.75, fill: currentInk(),
      }));
      // Crenellations across the top
      const cw = w / 5;
      for (let i = 0; i < 3; i++){
        g.appendChild(el('rect', {
          x: x0 + cw + i*cw*1.2, y: y0, width: cw*0.8, height: h*0.35, fill: currentInk(),
        }));
      }
      // Flagpole + flag
      g.appendChild(el('line', {
        x1: cx + w*0.35, y1: y0 + h*0.05, x2: cx + w*0.35, y2: cy - s*0.85,
        stroke: currentInk(), 'stroke-width': '0.8',
      }));
      g.appendChild(el('path', {
        d: `M ${cx + w*0.35} ${cy - s*0.85} L ${cx + w*0.65} ${cy - s*0.7} L ${cx + w*0.35} ${cy - s*0.55} Z`,
        fill: currentAccent(),
      }));
    },
    ruin(g, cx, cy, s){
      // Two broken column fragments, jagged tops.
      g.appendChild(el('path', {
        d: `M ${cx - s*0.7} ${cy + s*0.55} L ${cx - s*0.7} ${cy - s*0.1} L ${cx - s*0.55} ${cy - s*0.4} L ${cx - s*0.4} ${cy - s*0.05} L ${cx - s*0.25} ${cy + s*0.55} Z`,
        fill: currentInk(),
      }));
      g.appendChild(el('path', {
        d: `M ${cx + s*0.15} ${cy + s*0.55} L ${cx + s*0.15} ${cy - s*0.2} L ${cx + s*0.35} ${cy - s*0.5} L ${cx + s*0.55} ${cy - s*0.15} L ${cx + s*0.55} ${cy + s*0.55} Z`,
        fill: currentInk(),
      }));
      // Rubble dot
      g.appendChild(el('circle', { cx: cx - s*0.05, cy: cy + s*0.45, r: s*0.1, fill: currentInk() }));
    },
    tower(g, cx, cy, s){
      // Tall narrow tower with conical roof.
      const w = s * 0.7;
      g.appendChild(el('rect', {
        x: cx - w/2, y: cy - s*0.4, width: w, height: s*1.0, fill: currentInk(),
      }));
      g.appendChild(el('path', {
        d: `M ${cx - w*0.7} ${cy - s*0.4} L ${cx} ${cy - s*0.95} L ${cx + w*0.7} ${cy - s*0.4} Z`,
        fill: currentInk(),
      }));
      // Window
      g.appendChild(el('rect', {
        x: cx - s*0.1, y: cy - s*0.1, width: s*0.2, height: s*0.3,
        fill: currentHaloFill(),
      }));
    },
    city(g, cx, cy, s){
      // Walled silhouette: low base wall, three buildings of varied
      // heights behind it, central one taller with a flag. Reads
      // unambiguously bigger than town/village at the same scale.
      // Wall base
      g.appendChild(el('rect', {
        x: cx - s*0.85, y: cy + s*0.25, width: s*1.7, height: s*0.35, fill: currentInk(),
      }));
      // Crenellations along wall top
      const cw = s * 0.18;
      for (let i = 0; i < 5; i++){
        g.appendChild(el('rect', {
          x: cx - s*0.8 + i * s*0.34, y: cy + s*0.13, width: cw, height: s*0.14, fill: currentInk(),
        }));
      }
      // Left building (medium)
      g.appendChild(el('rect', {
        x: cx - s*0.7, y: cy - s*0.15, width: s*0.34, height: s*0.4, fill: currentInk(),
      }));
      g.appendChild(el('path', {
        d: `M ${cx - s*0.78} ${cy - s*0.15} L ${cx - s*0.53} ${cy - s*0.4} L ${cx - s*0.28} ${cy - s*0.15} Z`,
        fill: currentInk(),
      }));
      // Right building (medium)
      g.appendChild(el('rect', {
        x: cx + s*0.36, y: cy - s*0.15, width: s*0.34, height: s*0.4, fill: currentInk(),
      }));
      g.appendChild(el('path', {
        d: `M ${cx + s*0.28} ${cy - s*0.15} L ${cx + s*0.53} ${cy - s*0.4} L ${cx + s*0.78} ${cy - s*0.15} Z`,
        fill: currentInk(),
      }));
      // Central tower (tallest)
      g.appendChild(el('rect', {
        x: cx - s*0.18, y: cy - s*0.55, width: s*0.36, height: s*0.8, fill: currentInk(),
      }));
      // Tower roof — flat with crenellation gap
      g.appendChild(el('rect', {
        x: cx - s*0.22, y: cy - s*0.65, width: s*0.44, height: s*0.12, fill: currentInk(),
      }));
      // Flagpole + flag
      g.appendChild(el('line', {
        x1: cx, y1: cy - s*0.65, x2: cx, y2: cy - s*1.0,
        stroke: currentInk(), 'stroke-width': '0.8',
      }));
      g.appendChild(el('path', {
        d: `M ${cx} ${cy - s*1.0} L ${cx + s*0.3} ${cy - s*0.88} L ${cx} ${cy - s*0.76} Z`,
        fill: currentAccent(),
      }));
    },
    town(g, cx, cy, s){
      // Central square building (peaked roof) flanked by two smaller
      // huts. Bigger than village's three-hut cluster, smaller than
      // city's walled silhouette.
      // Central building
      g.appendChild(el('rect', {
        x: cx - s*0.32, y: cy - s*0.05, width: s*0.64, height: s*0.55, fill: currentInk(),
      }));
      g.appendChild(el('path', {
        d: `M ${cx - s*0.42} ${cy - s*0.05} L ${cx} ${cy - s*0.5} L ${cx + s*0.42} ${cy - s*0.05} Z`,
        fill: currentInk(),
      }));
      // Left hut
      g.appendChild(el('rect', {
        x: cx - s*0.78, y: cy + s*0.18, width: s*0.34, height: s*0.32, fill: currentInk(),
      }));
      g.appendChild(el('path', {
        d: `M ${cx - s*0.85} ${cy + s*0.18} L ${cx - s*0.61} ${cy - s*0.05} L ${cx - s*0.37} ${cy + s*0.18} Z`,
        fill: currentInk(),
      }));
      // Right hut
      g.appendChild(el('rect', {
        x: cx + s*0.44, y: cy + s*0.18, width: s*0.34, height: s*0.32, fill: currentInk(),
      }));
      g.appendChild(el('path', {
        d: `M ${cx + s*0.37} ${cy + s*0.18} L ${cx + s*0.61} ${cy - s*0.05} L ${cx + s*0.85} ${cy + s*0.18} Z`,
        fill: currentInk(),
      }));
      // Small accent dot in central building (door/window)
      g.appendChild(el('rect', {
        x: cx - s*0.06, y: cy + s*0.22, width: s*0.12, height: s*0.28, fill: currentHaloFill(),
      }));
    },
    village(g, cx, cy, s){
      // Three small huts with peaked roofs.
      const huts = [[-s*0.55, s*0.05], [s*0.0, -s*0.15], [s*0.55, s*0.05]];
      for (const [hx, hy] of huts){
        // Body
        g.appendChild(el('rect', {
          x: cx + hx - s*0.22, y: cy + hy, width: s*0.44, height: s*0.42, fill: currentInk(),
        }));
        // Roof
        g.appendChild(el('path', {
          d: `M ${cx + hx - s*0.32} ${cy + hy} L ${cx + hx} ${cy + hy - s*0.32} L ${cx + hx + s*0.32} ${cy + hy} Z`,
          fill: currentInk(),
        }));
      }
    },
    camp(g, cx, cy, s){
      // Tent + small flame.
      g.appendChild(el('path', {
        d: `M ${cx - s*0.7} ${cy + s*0.45} L ${cx} ${cy - s*0.55} L ${cx + s*0.7} ${cy + s*0.45} Z`,
        fill: currentInk(),
      }));
      g.appendChild(el('path', {
        d: `M ${cx - s*0.18} ${cy + s*0.45} L ${cx} ${cy - s*0.05} L ${cx + s*0.18} ${cy + s*0.45} Z`,
        fill: currentHaloFill(),
      }));
      // Tiny flame accent at peak
      g.appendChild(el('circle', { cx: cx + s*0.55, cy: cy + s*0.25, r: s*0.18, fill: currentAccent() }));
    },
    cache(g, cx, cy, s){
      // Filled disk with central X.
      g.appendChild(el('circle', { cx, cy, r: s*0.7, fill: currentInk() }));
      g.appendChild(el('path', {
        d: `M ${cx - s*0.32} ${cy - s*0.32} L ${cx + s*0.32} ${cy + s*0.32} M ${cx + s*0.32} ${cy - s*0.32} L ${cx - s*0.32} ${cy + s*0.32}`,
        stroke: currentHaloFill(), 'stroke-width': '1.6', 'stroke-linecap': 'round',
      }));
    },
    shrine(g, cx, cy, s){
      // Tall cross with stepped base.
      g.appendChild(el('rect', { x: cx - s*0.7, y: cy + s*0.45, width: s*1.4, height: s*0.2, fill: currentInk() }));
      g.appendChild(el('rect', { x: cx - s*0.5, y: cy + s*0.25, width: s*1.0, height: s*0.2, fill: currentInk() }));
      g.appendChild(el('rect', { x: cx - s*0.13, y: cy - s*0.7, width: s*0.26, height: s*1.0, fill: currentInk() }));
      g.appendChild(el('rect', { x: cx - s*0.45, y: cy - s*0.25, width: s*0.9,  height: s*0.22, fill: currentInk() }));
    },
    lair(g, cx, cy, s){
      // Cave-mouth arch with a glint inside.
      g.appendChild(el('path', {
        d: `M ${cx - s*0.75} ${cy + s*0.55} L ${cx - s*0.75} ${cy - s*0.05} A ${s*0.75} ${s*0.6} 0 0 1 ${cx + s*0.75} ${cy - s*0.05} L ${cx + s*0.75} ${cy + s*0.55} Z`,
        fill: currentInk(),
      }));
      // Two yellow eye-glints
      g.appendChild(el('circle', { cx: cx - s*0.22, cy: cy + s*0.2, r: s*0.09, fill: '#E5B53C' }));
      g.appendChild(el('circle', { cx: cx + s*0.22, cy: cy + s*0.2, r: s*0.09, fill: '#E5B53C' }));
    },
    grave(g, cx, cy, s){
      // Rounded headstone with a cross etched on top.
      g.appendChild(el('path', {
        d: `M ${cx - s*0.55} ${cy + s*0.55} L ${cx - s*0.55} ${cy - s*0.15} A ${s*0.55} ${s*0.55} 0 0 1 ${cx + s*0.55} ${cy - s*0.15} L ${cx + s*0.55} ${cy + s*0.55} Z`,
        fill: currentInk(),
      }));
      // Cross
      g.appendChild(el('rect', { x: cx - s*0.06, y: cy - s*0.45, width: s*0.12, height: s*0.5, fill: currentHaloFill() }));
      g.appendChild(el('rect', { x: cx - s*0.22, y: cy - s*0.32, width: s*0.44, height: s*0.12, fill: currentHaloFill() }));
      // Mound below
      g.appendChild(el('path', {
        d: `M ${cx - s*0.85} ${cy + s*0.7} Q ${cx} ${cy + s*0.45} ${cx + s*0.85} ${cy + s*0.7} Z`,
        fill: currentInk(),
      }));
    },
    landmark(g, cx, cy, s){
      // Diamond marker — generic "noteworthy."
      g.appendChild(el('path', {
        d: `M ${cx} ${cy - s*0.7} L ${cx + s*0.7} ${cy} L ${cx} ${cy + s*0.7} L ${cx - s*0.7} ${cy} Z`,
        fill: currentInk(),
      }));
      g.appendChild(el('circle', { cx, cy, r: s*0.18, fill: currentAccent() }));
    },
    bridge(g, cx, cy, s){
      // Three-arch stone bridge over a horizontal water line.
      // Water line below.
      g.appendChild(el('line', {
        x1: cx - s*0.85, y1: cy + s*0.55, x2: cx + s*0.85, y2: cy + s*0.55,
        stroke: currentInk(), 'stroke-width': '0.6',
      }));
      // Deck
      g.appendChild(el('rect', {
        x: cx - s*0.85, y: cy - s*0.45, width: s*1.7, height: s*0.18, fill: currentInk(),
      }));
      // Three arches
      const archY = cy - s*0.27;
      const archW = s*0.4, archH = s*0.45;
      for (let i = 0; i < 3; i++){
        const ax = cx - s*0.65 + i * s*0.65;
        g.appendChild(el('path', {
          d: `M ${ax - archW/2} ${archY + archH} A ${archW/2} ${archH} 0 0 1 ${ax + archW/2} ${archY + archH}`,
          fill: 'none', stroke: currentInk(), 'stroke-width': '0.7',
        }));
      }
    },
    ford(g, cx, cy, s){
      // Two parallel dashed lines indicating a shallow stream
      // crossing — like a road dashed across a river.
      g.appendChild(el('line', {
        x1: cx - s*0.85, y1: cy - s*0.2, x2: cx + s*0.85, y2: cy - s*0.2,
        stroke: currentInk(), 'stroke-width': '0.9', 'stroke-dasharray': '2 1.5',
      }));
      g.appendChild(el('line', {
        x1: cx - s*0.85, y1: cy + s*0.2, x2: cx + s*0.85, y2: cy + s*0.2,
        stroke: currentInk(), 'stroke-width': '0.9', 'stroke-dasharray': '2 1.5',
      }));
      // Wavy water through the middle.
      g.appendChild(el('path', {
        d: `M ${cx - s*0.7} ${cy} Q ${cx - s*0.45} ${cy - s*0.12} ${cx - s*0.2} ${cy} T ${cx + s*0.3} ${cy} T ${cx + s*0.7} ${cy}`,
        fill: 'none', stroke: currentAccent(), 'stroke-width': '0.7',
      }));
    },
    crossroads(g, cx, cy, s){
      // Bold X with a small circle at the intersection.
      g.appendChild(el('line', {
        x1: cx - s*0.7, y1: cy - s*0.7, x2: cx + s*0.7, y2: cy + s*0.7,
        stroke: currentInk(), 'stroke-width': '1.6', 'stroke-linecap': 'round',
      }));
      g.appendChild(el('line', {
        x1: cx - s*0.7, y1: cy + s*0.7, x2: cx + s*0.7, y2: cy - s*0.7,
        stroke: currentInk(), 'stroke-width': '1.6', 'stroke-linecap': 'round',
      }));
      g.appendChild(el('circle', { cx, cy, r: s*0.18, fill: currentAccent() }));
    },
    ferry(g, cx, cy, s){
      // Simple boat hull on a wavy water line, with a small mast.
      g.appendChild(el('path', {
        d: `M ${cx - s*0.85} ${cy + s*0.4} Q ${cx - s*0.45} ${cy + s*0.5} ${cx - s*0.2} ${cy + s*0.4} T ${cx + s*0.45} ${cy + s*0.4} T ${cx + s*0.85} ${cy + s*0.4}`,
        fill: 'none', stroke: currentAccent(), 'stroke-width': '0.8',
      }));
      // Hull (curved trapezoid).
      g.appendChild(el('path', {
        d: `M ${cx - s*0.7} ${cy + s*0.05} L ${cx + s*0.7} ${cy + s*0.05} L ${cx + s*0.5} ${cy + s*0.3} Q ${cx} ${cy + s*0.45} ${cx - s*0.5} ${cy + s*0.3} Z`,
        fill: currentInk(),
      }));
      // Mast
      g.appendChild(el('line', {
        x1: cx, y1: cy + s*0.05, x2: cx, y2: cy - s*0.55,
        stroke: currentInk(), 'stroke-width': '0.9',
      }));
      // Triangular sail
      g.appendChild(el('path', {
        d: `M ${cx} ${cy - s*0.55} L ${cx + s*0.45} ${cy + s*0.0} L ${cx} ${cy + s*0.0} Z`,
        fill: currentHaloFill(), stroke: currentInk(), 'stroke-width': '0.6',
      }));
    },
  };

  const FEATURE_KINDS = Object.keys(FEATURE_GLYPHS);

  function appendFeature(parentG, kind, cx, cy, subR){
    if (!parentG || !kind || !FEATURE_GLYPHS[kind]) return;
    _currentKind = kind;
    // Halo first (back), glyph on top.
    const haloR = subR * 0.62;
    appendHalo(parentG, cx, cy, haloR);
    const s = subR * 0.5;
    FEATURE_GLYPHS[kind](parentG, cx, cy, s);
    _currentKind = null;
  }

  window.GCCSubhexIcons = { append, appendFeature, TERRAIN_TO_GLYPH, FEATURE_KINDS };
})();
