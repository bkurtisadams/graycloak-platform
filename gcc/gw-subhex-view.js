// gw-subhex-view.js v0.45.0 — 2026-07-08
// v0.45.0 — viewer polish slice: persisted viewport (center + zoom restored on
//           reopen; explicit parent clicks still recenter at your zoom), public
//           centerOn/zoomTo navigation API, raster diagnostics readout (cache
//           size, hits/regens, evictions, pending encodes, live blob URLs) with
//           a Rebuild-tiles button, transient status line so raster stats and
//           generation results stop fighting the armed-mode text, hidden:0/1
//           raster tile-key dimension (player-safe tiles later are a context
//           flip, not a cache retrofit), Esc disarms the active tool, Ctrl+Z
//           undoes terrain, and palette position + section collapse persist.
// v0.44.0 — raster perf + slider fix: per-parent dirty tracking (edits evict
//           only touched tiles instead of regenerating every visible tile),
//           async toBlob/object-URL tile encoding off the sync path (no more
//           main-thread WebP dataURL stalls), LRU tile cache eviction, one
//           layout read per raster pass (tile size/labels computed once and
//           threaded), fog revealed-cell center memo + fog redrawn on pan end,
//           and Base map / opacity / subhex-fill sliders now work in raster
//           mode (basemap stacked under the raster layer; hex-op fades it).
// v0.43.8 — restore fog with viewport veil + revealed-cell cutouts, and show
//           named feature labels only at closer zoom levels instead of far out.
// v0.43.7 — fog viewport fix: render fog from the live viewport instead of
//           the padded terrain/raster coverage bounds so Show fog works in
//           both live SVG and raster modes after deferred pan/zoom refreshes.
// v0.43.6 — raster far-zoom perf: adapt tile size/coverage pad by zoom
//           level and reuse SVG <image> nodes so cached tiles do not decode/layout
//           from scratch whenever the visible parent set changes.
// v0.43.5 — raster zoom debounce fix: post-wheel idle refresh now recomputes
//           raster coverage without forcing cached tile regeneration; tile cache
//           capacity now covers the whole visible raster neighborhood.
// v0.43.4 — raster zoom perf: wheel zoom now only updates the SVG viewBox
//           during active wheel input and defers raster tile coverage/fog rebuilds
//           until zoom settles, avoiding per-tick tile churn and sticky zoom.
// v0.43.3 — raster zoom perf: keep wheel zoom on the raster/overlay path,
//           skip hidden live-cell rebuilds, and avoid center-only tile churn.
// v0.43.2 — raster seam fix: request transparent tile gutters, render a
//           viewport-driven parent tile set instead of a fixed 3x3 cage, and
//           show seam-fragment counts from the atlas/renderer.
// v0.43.0 — multi-parent raster panning: raster mode now renders a cached
//           neighborhood of parent tiles around the view center so panning can
//           cross 30-mile parent boundaries while live overlays stay active.
// v0.42.0 — raster alignment: map rendered tile images back through the
//           renderer's pixel-to-world bounds, clamp hover/selection/edit clicks
//           to the current parent while single-tile raster mode is active, and
//           suppress duplicate live parent/target outlines over the raster tile.
// gw-subhex-view.js v0.41.0 — 2026-07-07
// v0.41.0 — raster-backed subhex preview mode: an opt-in Raster tile toggle
//           renders the current 30-mile parent hex with GWSubhexTileRenderer and
//           uses it as the base layer while keeping hover, selection, fog, party,
//           target, and editor overlays live.
// gw-subhex-view.js v0.40.0 — 2026-07-07
// v0.40.0 — Ancient roads v1: first-class ancient-road stroke type, top-bar
//           Ancient roads toggle, Build ▸ Lines tool button, broken-highway
//           styling, condition metadata, and fast-pan rendering support.
// gw-subhex-view.js v0.39.0 — 2026-07-07
// v0.39.0 — drag perf: keep a lightweight fast annotation layer visible while
//           panning. The full marker/label layer, radiation hatch, and optional
//           base-map image still drop during drag, but roads/rivers/trails and
//           point-of-interest dots remain visible so navigation does not go blind.
// gw-subhex-view.js v0.38.0 — 2026-06-18
// v0.38.0 — render perf: memoize each subhex's "M…Z" path string by Q,R (centers
//           are deterministic so geometry is built once per cell ever, not once
//           per render) and precompute the 6 corner offsets once per SUB_R so the
//           hot loop drops its per-cell cos/sin. Used by render() and renderFog().
// gw-subhex-view.js v0.37.0 — 2026-05-29
// v0.37.0 — emit 'gw-party-changed' on party/fog/clock save so a campaign-bound
//           map auto-publishes to players (gw-map-sync).
// v0.36.0 — 2026-05-29
// v0.36.0 — marker editor "Hide from players" checkbox + dashed badge on hidden
//           features (GM view). Data flag lives in gw-annotations (exportSafe).
// v0.35.0 — 2026-05-25
// Seamless (Path B) 3-mile subhex viewer for the Gamma World map:
// drill-in + pan/zoom, terrain paint brush, and a freehand vector overlay
// (rivers/roads/trails) + settlement icon markers.
//
// v0.35.0 — Site dossiers: selecting a marker in Edit mode shows a GW1e stocking
//           dossier below the controls (population, inhabitants, Cryptic Alliance,
//           leader, disposition for settlements; canon contents for other sites).
//           Deterministic per location+kind via window.GWStock.
// v0.34.0 — Monastery + Installation markers (glyphs in markerEl, place buttons in
//           Build ▸ Settlements, retypable via Edit) and a Coast terrain (normal
//           travel tier). From the official subhex/overworld map keys.
// v0.33.0 — terrain palette additions: hills + marsh (canon, from the map key)
//           and forested-hill + forested-mountains (house). Travel tiers: hills
//           and forested-hill rugged, marsh and forested-mountains very-rugged.
//           Paint swatches auto-list; fills/derivation in gw-subhex-data, gen
//           rates in gw-feature-gen, encounter aliases in gw-encounter-data.
// v0.32.0 — show the Generate target. Generate/Clear-gen already act on the parent
//           under the view center, but it was invisible; now that parent gets a gold
//           dashed highlight (gTarget layer) and a live "▸ target: parent X,Y" label
//           under the Generate button, updating as you pan. Pan to any parent and
//           Generate it without flipping back to the overworld.
// v0.31.0 — Edit feature mode: an "✎ Edit" button (Build ▸ Features) arms a select
//           tool. Click a placed marker to open an inline editor — rename, change
//           type (any of the 12 kinds), or delete — and drag the icon on the map to
//           move it. Selected marker shows a cyan dashed ring. All persisted via the
//           existing GWAnnotations updateMarker/deleteMarker.
// v0.30.0 — split the Tools palette into Build / Play tabs. Build = terrain,
//           hazards, lines, settlements, features; Play = party, fog, time,
//           encounters. Grip/zoom/mode stay pinned above both; active tab
//           persists (gw-sx-tab). Sections remain individually collapsible.
// v0.29.0 — drag perf: hide the full-res base map image during a pan (like gHaz/
//           gAnnot already are), restoring it on mouseup. It was the heaviest child
//           of the composited panG layer; at high zoom it became a world-sized GPU
//           texture that degraded dragging until the view was rebuilt. No node leak
//           was found — every render path replaceChildren's; this is paint cost.
// v0.28.0 — experiment: pan via CSS translate3d on panG (style.transform) instead
//           of the SVG transform attribute, to try GPU-composited dragging. Paired
//           with the existing dynamic will-change toggle; cleared on mouseup. Easy
//           revert if it drifts/blurs (swap back to setAttribute translate).
// v0.27.0 — subhex opacity slider now drives terrain FILL opacity (fill-opacity
//           via --gw-cell-fill) instead of group opacity, so the hex grid stroke
//           stays crisp while the fills fade. Floor dropped to 0: take fills to 0
//           and you get the parent map fully visible with just the hex grid over it.
// v0.26.0 — fix subhex opacity see-through: basemap was stacked ABOVE gCells, so
//           fading the subhex layer revealed only the page behind it while the
//           parent map painted on top. Move basemap to the bottom of panG so the
//           parent shows through the faded hexes as intended.
// v0.25.0 — add a Subhex layer opacity slider (top bar, cyan) that fades the
//           gCells terrain fills independently of the base-map opacity, so the
//           parent map can stay opaque while you see through the subhexes. Persisted.
// v0.24.0 — marker icons for the new seeded site kinds: robot-farm (Mech-Land),
//           fortification, spaceport. (Generation lives in gw-feature-gen v0.2.0.)
// v0.23.0 — dice-off: when the day's remaining travel time can't cover the next
//           hex, roll d100 vs (time left ÷ hex cost). Make it → push on (spent);
//           miss → camp where you are. Both undoable; result shown in Time section.
// v0.22.0 — party-move undo: "↶ Undo move" reverts the last move/placement as a
//           unit (position, fog reveal, clock + exertion, primed cell). 50-deep.
// v0.21.0 — pace model: assume Light burden (MP has no encumbrance). Normal =
//           2 mph = 8 mi/route-turn = 24 mi over a 3-turn travel day; rugged/
//           very-rugged = 16/8 mi/day (DMG 3:2:1). Drops the Load selector.
// v0.20.0 — switch travel pace to the AD&D DMG miles/day model (terrain tier ×
//           party load), keeping GW's route-turn clock. Adds a Load selector and
//           a current-pace readout. Mountains now ~½ a travel day/hex, not 19h.
// v0.19.0 — recalibrate the clock to GW1e RAW: distance is km/turn by terrain
//           (1 km/turn swamp/mountain … 8 km/turn clear), time tracked in
//           minutes so a clear 3-mile hex ≈ 0.6 turn. Adds the rest rule —
//           travel >4 of 6 turns without rest → half rate (Camp resets it).
// v0.18.0 — hex-crawl slice 2: route-turn clock on a Gregorian 2471 calendar
//           (6 four-hour turns/day). Moving the party advances the clock by
//           the entered subhex's terrain cost (TURN_COST table). Time section:
//           date readout + Turn/Day/Camp/Set-date controls. Persisted.
// v0.17.0 — hex-crawl slice 1: party token + fog of war on the 3-mile grid.
//           Party section (Place = GM teleport, Move = step toward click);
//           entering a subhex reveals a 1-ring disk (9 mi) and primes the
//           encounter roller. Fog veils unrevealed cells once a party exists.
//           Time/encounter hooks stubbed in setPartyAt for later slices.
// v0.16.0 — click a subhex in pan/select mode to select it (persistent cyan
//           highlight); "Roll here" uses the selected cell.
// v0.15.0 — palette: terrain swatches in a 2-column grid with larger
//           click targets.
// v0.14.0 — readability/UI pass: collapsible palette sections, draggable
//           palette is now resizable, and a persisted UI-zoom (± row +
//           Ctrl+wheel) scales the overlay panels (CSS zoom, Chrome).
// v0.13.0 — per-subhex encounters: "Roll here" resolves the hovered/center
//           cell's terrain + hazard + feature via the shared GWEncounter
//           resolver, with MP Builder JSON export buttons on the result.
// v0.12.1 — pan perf: cache svg rect at drag start (no per-move reflow),
//           rAF-coalesce the pan transform, and drop the radiation pattern +
//           annotation layers during a drag (restored on mouseup).
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
    'ancient-road': { color: '#5f5145', width: 3.25, dash: '12 7 2 7' },
    pen:   { color: '#e8d5a3', width: 2,   dash: null },
  };
  const ANCIENT_ROAD_STYLE = {
    usable:       { color:'#726556', dash:'18 5', opacity:0.96 },
    broken:       { color:'#635548', dash:'12 7 2 7', opacity:0.92 },
    buried:       { color:'#786b58', dash:'3 7', opacity:0.58 },
    'bridge-out': { color:'#7a5542', dash:'10 5 1 5 1 5', opacity:0.96 },
    blocked:      { color:'#87483e', dash:'2 5', opacity:0.86 },
    lost:         { color:'#766a59', dash:'1 9', opacity:0.42 },
  };
  const ICON_PX = 9;          // marker glyph radius in screen px
  const FEATURE_LABEL_MAX_U = 0.20; // show feature names at close/detail zoom only
  const SAMPLE_PX = 4;        // freehand point spacing in screen px
  const RASTER_VIEW_PAD_PARENTS = 1.25; // near-zoom offscreen neighbor buffer while panning
  const RASTER_MAX_VISIBLE_TILES = 72;  // near-zoom safety cap for raster views
  const RASTER_ZOOM_IDLE_MS = 260;  // delay heavyweight raster refresh until wheel input settles

  const state = {
    open: false,
    vb: { x: 0, y: 0, w: 180, h: 120 },
    showParents: true,
    rendered: null,
    drag: null,
    brush: null,         // terrain stroke
    stroke: null,        // freehand vector capture { kind, pts:[], el }
    armed: null,
    lineWidth: 3,
    lineMode: 'points',  // 'points' (spline waypoints) | 'freehand'
    snapHex: false,
    ancientRoadCondition: 'broken',
    showAncientRoads: true,
    rasterBase: false,
    rasterKey: null,          // rendered neighborhood key
    rasterBusy: false,
    rasterDirtyParents: new Set(),   // parent "col,row" keys (or '*') needing tile regen
    rasterTiles: new Map(),   // tileKey -> { url, bounds, stats, col, row, size }
    rasterImageEls: new Map(), // tileKey -> reusable SVG <image> node
    rasterParentKeys: new Set(),
    rasterStats: null,      // last raster layer totals for diagnostics
    rasterPerf: { hits: 0, regens: 0, evictions: 0, flushes: 0, encoding: 0, blobUrls: 0 },
    rasterShowHidden: true,   // GM view bakes hidden features; player-safe tiles flip this
    statusTimer: 0,
    viewSaveTimer: 0,
    editor: null,        // active path editor { kind, pts, width, editingId, origPts, dragIdx }
    undoStack: [],
    cellMap: new Map(),
    hazMap: new Map(),
    previewMap: new Map(),
    hoverKey: null,
    selected: null,     // { Q, R } — persistent click selection for encounters
    party: null,        // { Q, R } — party token position (global subhex axial)
    partyUndo: [],      // snapshots for undoing party moves (position + fog + clock)
    revealed: null,     // Set<"Q_R"> — fog: subhexes seen by the party (lazy-loaded)
    fogOn: true,        // GM fog overlay visible (only veils when a party exists)
    clock: null,        // { year, month, day, min, exert } — campaign date + route-turn (lazy-loaded)
    raf: 0,
    panRaf: 0,
    viewRaf: 0,
    rasterIdleTimer: 0,
    rasterZooming: false,
    markerSel: null,   // id of the marker being edited (Edit feature mode)
    markerDrag: null,  // { m, moved } while dragging a marker to move it
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
      #gw-sx-raster-base { pointer-events:none; image-rendering:auto; }
      #gw-sx-raster-base image { pointer-events:none; image-rendering:auto; }
      #gw-sx-svg.grabbing { cursor:grabbing; }
      #gw-sx-svg.painting { cursor:crosshair; }
      .gw-sx-cellpath { stroke:rgba(0,0,0,.35); stroke-width:1; vector-effect:non-scaling-stroke; fill-opacity:var(--gw-cell-fill, 1); }
      .gw-sx-authpath { fill:none; stroke:#ff8844; stroke-width:1.5; vector-effect:non-scaling-stroke; pointer-events:none; }
      .gw-sx-marker-sel { fill:none; stroke:#66d9ff; stroke-width:1.5; stroke-dasharray:3 2.5; vector-effect:non-scaling-stroke; pointer-events:none; }
      .gw-sx-parent-target { fill:rgba(255,196,90,.06); stroke:#ffc45a; stroke-width:2.5; stroke-dasharray:6 4; vector-effect:non-scaling-stroke; pointer-events:none; }
      .gw-sx-hover { fill:none; stroke:rgba(255,220,120,.95); stroke-width:2; vector-effect:non-scaling-stroke; pointer-events:none; }
      .gw-sx-sel { fill:rgba(110,210,255,.14); stroke:#66d9ff; stroke-width:2.5; vector-effect:non-scaling-stroke; pointer-events:none; }
      .gw-sx-fog { fill:rgba(8,10,16,.55); fill-rule:evenodd; stroke:none; pointer-events:none; }
      .gw-sx-party { fill:rgba(255,82,82,.16); stroke:#ff5252; stroke-width:2.5; vector-effect:non-scaling-stroke; pointer-events:none; }
      .gw-sx-party-dot { fill:#ff5252; stroke:#fff; stroke-width:1; vector-effect:non-scaling-stroke; pointer-events:none; }
      .gw-sx-parent { fill:none; stroke:rgba(255,200,120,.5); stroke-width:1.5; vector-effect:non-scaling-stroke; pointer-events:none; }
      .gw-sx-rad { fill:url(#gw-sx-rad); stroke:rgba(195,240,55,.4); stroke-width:1; vector-effect:non-scaling-stroke; pointer-events:none; }
      .gw-sx-line { fill:none; vector-effect:non-scaling-stroke; stroke-linecap:round; stroke-linejoin:round; pointer-events:none; }
      .gw-sx-marker, .gw-sx-marker * { pointer-events:none; }
      .gw-sx-fast-marker { fill:rgba(243,234,210,.82); stroke:rgba(90,42,29,.7); stroke-width:1.2; vector-effect:non-scaling-stroke; pointer-events:none; }
      .gw-sx-fast-marker.hidden { fill:rgba(243,234,210,.55); stroke:#ff5252; stroke-dasharray:3 2; }
      #gw-sx-bar { position:absolute; top:10px; left:172px; right:10px; display:flex; align-items:center; gap:10px; z-index:6; pointer-events:none; }
      #gw-sx-bar > * { pointer-events:auto; }
      #gw-sx-bar .sx-title { font-family:'Cinzel',serif; font-size:13px; letter-spacing:.08em; color:#ffce9e; background:rgba(14,8,2,.9); border:1px solid #5a3a0a; padding:5px 10px; border-radius:2px; }
      #gw-sx-bar .sx-spacer { flex:1; }
      #gw-sx-bar label { font-size:12px; color:#f0dcae; background:rgba(14,8,2,.9); border:1px solid #5a3a0a; padding:5px 9px; border-radius:2px; display:flex; align-items:center; gap:5px; cursor:pointer; }
      .gw-sx-btn { background:rgba(14,8,2,.93); border:1px solid #5a3a0a; color:#e8d5a3; font-family:'Cinzel',serif; font-size:11px; letter-spacing:.04em; padding:6px 11px; cursor:pointer; border-radius:2px; }
      .gw-sx-btn:hover { background:rgba(255,136,68,.18); border-color:#ff8844; color:#ffaa66; }
      .gw-sx-btn:disabled { opacity:.4; cursor:default; }
      #gw-sx-palette { position:absolute; top:10px; left:10px; width:168px; min-width:150px; min-height:120px; max-height:calc(100% - 20px); overflow-y:auto; overflow-x:hidden; resize:both; background:rgba(14,8,2,.95); border:1px solid #5a3a0a; border-radius:3px; padding:8px; z-index:6; font-family:'Crimson Text',serif; }
      #gw-sx-palette::-webkit-scrollbar { width:9px; }
      #gw-sx-palette::-webkit-scrollbar-track { background:rgba(0,0,0,.25); }
      #gw-sx-palette::-webkit-scrollbar-thumb { background:#5a3a0a; border-radius:5px; }
      #gw-sx-palette .sx-grip { position:sticky; top:-8px; margin:-8px -8px 6px; padding:6px 8px; background:rgba(30,16,4,.98); border-bottom:1px solid #5a3a0a; font-family:'Cinzel',serif; font-size:10px; letter-spacing:.1em; color:#dcb87e; cursor:move; user-select:none; display:flex; align-items:center; gap:6px; z-index:2; }
      #gw-sx-palette .sx-grip:hover { color:#ffaa66; }
      #gw-sx-palette .sx-mode { font-size:11px; color:#ffce9e; margin-bottom:2px; min-height:14px; line-height:1.3; }
      #gw-sx-palette .sx-status { font-size:10px; font-style:italic; color:#a9c49a; margin-bottom:5px; min-height:12px; line-height:1.3; }
      #gw-sx-palette .sx-rdiag { display:none; align-items:center; gap:5px; font-size:10px; color:#cbb088; margin-bottom:6px; line-height:1.35; }
      #gw-sx-palette .sx-rdiag.on { display:flex; }
      #gw-sx-palette .sx-rdiag span { flex:1; }
      #gw-sx-palette .sx-rdiag button { flex:none; width:22px; height:20px; font-size:12px; line-height:1; cursor:pointer; background:rgba(0,0,0,.25); border:1px solid #5a3a0a; color:#e8d5a3; border-radius:2px; }
      #gw-sx-palette .sx-rdiag button:hover { background:rgba(255,136,68,.18); color:#ffaa66; }
      #gw-sx-palette .sx-tabs { display:flex; gap:5px; margin:2px 0 5px; }
      #gw-sx-palette .sx-tab { flex:1; font-size:11px; padding:5px 4px; cursor:pointer; background:rgba(255,136,68,.07); color:#cbb088; border:1px solid #5a3a0a; border-radius:3px; font-family:'Cinzel',serif; letter-spacing:.04em; }
      #gw-sx-palette .sx-tab:hover { color:#ffaa66; }
      #gw-sx-palette .sx-tab.active { background:rgba(255,136,68,.26); color:#ffd9a8; border-color:#ff8844; }
      #gw-sx-palette .sx-hd { font-family:'Cinzel',serif; font-size:10px; letter-spacing:.1em; color:#e0c089; margin:9px 0 3px; border-top:1px solid #3a2606; padding-top:6px; cursor:pointer; user-select:none; }
      #gw-sx-palette .sx-hd:first-of-type { border-top:none; padding-top:0; }
      #gw-sx-palette .sx-hd:hover { color:#ffaa66; }
      #gw-sx-palette .sx-caret { display:inline-block; width:11px; color:#a98; }
      #gw-sx-zoom { display:flex; align-items:center; gap:4px; margin-bottom:7px; }
      #gw-sx-zoom button { width:24px; height:22px; font-size:15px; line-height:1; cursor:pointer; background:rgba(0,0,0,.25); border:1px solid #5a3a0a; color:#e8d5a3; border-radius:2px; }
      #gw-sx-zoom button:hover { background:rgba(255,136,68,.18); color:#ffaa66; }
      #gw-sx-zoom .sx-zlabel { flex:1; text-align:center; font-size:11px; color:#ffce9e; }
      .gw-sx-terr { display:grid; grid-template-columns:1fr 1fr; gap:4px; }
      .gw-sx-sw { display:flex; align-items:center; gap:6px; width:100%; background:rgba(0,0,0,.18); border:1px solid #5a3a0a; color:#e8d5a3; font-size:12px; padding:5px 5px; cursor:pointer; border-radius:2px; text-align:left; overflow:hidden; }
      .gw-sx-sw span:last-child { white-space:nowrap; text-overflow:ellipsis; overflow:hidden; }
      .gw-sx-sw:hover { background:rgba(255,136,68,.15); }
      .gw-sx-sw.armed { border-color:#ff8844; background:rgba(255,136,68,.22); }
      .gw-sx-chip { width:17px; height:17px; border:1px solid rgba(0,0,0,.45); flex:none; border-radius:1px; }
      .gw-sx-tools { display:grid; grid-template-columns:1fr 1fr; gap:4px; }
      .gw-sx-tool { background:rgba(0,0,0,.25); border:1px solid #5a3a0a; color:#e8d5a3; font-family:'Crimson Text',serif; font-size:12px; padding:4px 3px; cursor:pointer; border-radius:2px; }
      .gw-sx-tool:hover { background:rgba(255,136,68,.15); }
      .gw-sx-tool.armed { border-color:#ff8844; background:rgba(255,136,68,.22); color:#ffaa66; }
      #gw-sx-palette .sx-row2 { display:flex; gap:6px; margin-top:7px; }
      #gw-sx-palette .sx-row2 .gw-sx-btn { flex:1; padding:5px 4px; }
      #gw-sx-read { position:absolute; bottom:10px; right:10px; min-width:200px; max-width:280px; background:rgba(14,8,2,.93); border:1px solid #5a3a0a; border-radius:3px; color:#e8d5a3; padding:8px 12px; font-size:12px; font-family:'Crimson Text',Georgia,serif; z-index:6; }
      #gw-sx-read .sx-t { color:#ffaa66; font-weight:600; }
      #gw-sx-enc { position:absolute; top:54px; right:10px; width:244px; max-height:calc(100% - 130px); overflow-y:auto; background:rgba(14,8,2,.96); border:1px solid #5a3a0a; border-radius:3px; color:#e8d5a3; padding:9px 11px 10px; font-size:12px; font-family:'Crimson Text',Georgia,serif; z-index:7; display:none; }
      #gw-sx-medit { position:absolute; left:50%; bottom:14px; transform:translateX(-50%); min-width:236px; display:none; background:rgba(14,8,2,.97); border:1px solid #5a3a0a; border-radius:4px; color:#e8d5a3; padding:9px 11px; font-family:'Crimson Text',Georgia,serif; z-index:8; box-shadow:0 4px 18px rgba(0,0,0,.55); }
      #gw-sx-medit.show { display:block; }
      #gw-sx-medit .sx-med-h { font-family:'Cinzel',serif; font-size:10px; letter-spacing:.1em; color:#ffce9e; margin-bottom:7px; }
      #gw-sx-medit .sx-med-row { display:flex; align-items:center; gap:7px; margin-bottom:6px; }
      #gw-sx-medit .sx-med-row span { font-size:11px; color:#cbb088; min-width:34px; }
      #gw-sx-medit .sx-med-row input, #gw-sx-medit .sx-med-row select { flex:1; background:#1a1206; border:1px solid #5a3a0a; border-radius:2px; color:#f0e0c0; padding:3px 5px; font-size:12px; font-family:inherit; }
      #gw-sx-medit .sx-med-btns { display:flex; gap:6px; margin-top:2px; }
      #gw-sx-medit .sx-med-btns button { flex:1; cursor:pointer; background:rgba(255,136,68,.12); color:#ffce9e; border:1px solid #5a3a0a; border-radius:2px; padding:5px 4px; font-size:11px; font-family:'Crimson Text',serif; }
      #gw-sx-medit .sx-med-btns button:hover { background:rgba(255,136,68,.24); border-color:#ff8844; }
      #gw-sx-medit #gw-sx-med-del:hover { background:rgba(180,60,50,.3); border-color:#b44; color:#ffb0a8; }
      #gw-sx-medit .sx-med-tip { font-size:10px; font-style:italic; color:#a98; margin-top:6px; }
      #gw-sx-medit .sx-dos { display:none; margin-top:8px; padding-top:7px; border-top:1px solid #5a3a0a; max-height:230px; overflow-y:auto; max-width:300px; }
      #gw-sx-medit .sx-dos-h { font-family:'Cinzel',serif; font-size:9px; letter-spacing:.13em; color:#ffce9e; margin-bottom:5px; opacity:.85; }
      #gw-sx-medit .sx-dos-row { display:flex; gap:8px; align-items:baseline; margin-bottom:4px; font-size:11.5px; line-height:1.35; }
      #gw-sx-medit .sx-dos-row span { flex:0 0 78px; color:#b59a72; font-size:10px; text-transform:uppercase; letter-spacing:.04em; padding-top:1px; }
      #gw-sx-medit .sx-dos-row b { flex:1; color:#f0e0c0; font-weight:600; }
      #gw-sx-enc.show { display:block; }
      #gw-sx-enc .enc-x { position:absolute; top:3px; right:7px; cursor:pointer; color:#a98; font-size:14px; line-height:1; }
      #gw-sx-enc .enc-x:hover { color:#ffaa66; }
      #gw-sx-enc .enc-cr { color:#ffaa66; font-weight:600; font-size:14px; margin-top:2px; }
      #gw-sx-enc .enc-meta { color:#aaa899; font-size:10px; line-height:1.4; }
      #gw-sx-enc .enc-nope { color:#888; font-style:italic; }
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

  function makePaletteDraggable(pal, handle){
    let drag = null;
    const onMove = e => {
      if (!drag) return;
      const host = state.el.overlay.getBoundingClientRect();
      let left = e.clientX - drag.dx - host.left;
      let top  = e.clientY - drag.dy - host.top;
      left = Math.max(0, Math.min(left, host.width - pal.offsetWidth));
      top  = Math.max(0, Math.min(top, host.height - 44));
      pal.style.left = left + 'px'; pal.style.top = top + 'px'; pal.style.right = 'auto';
      pal.style.maxHeight = (host.height - top - 10) + 'px';
    };
    const onUp = e => {
      if (!drag) return;
      drag = null;
      try { handle.releasePointerCapture(e.pointerId); } catch(_){}
      savePalPos({ left: parseFloat(pal.style.left) || 0, top: parseFloat(pal.style.top) || 0 });
    };
    handle.addEventListener('pointerdown', e => {
      e.preventDefault();
      const r = pal.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      try { handle.setPointerCapture(e.pointerId); } catch(_){}
    });
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  }
  function applyPalPos(pal){
    const p = loadPalPos(); if (!p) return;
    const host = state.el.overlay.getBoundingClientRect();
    const left = Math.max(0, Math.min(+p.left, Math.max(0, host.width - 60)));
    const top  = Math.max(0, Math.min(+p.top, Math.max(0, host.height - 44)));
    pal.style.left = left + 'px'; pal.style.top = top + 'px'; pal.style.right = 'auto';
    if (host.height) pal.style.maxHeight = (host.height - top - 10) + 'px';
  }

  // ── UI zoom (readability) ───────────────────────────────────────────────────
  // CSS `zoom` (crisp in Chrome) applied to the overlay's HTML panels — not the
  // SVG map, which has its own pan/zoom. Persisted; adjustable via the ± row,
  // Ctrl+wheel over a panel, or Ctrl +/-/0. Range 0.8–2.5.
  const ZOOM_KEY = 'gw-sx-ui-zoom', ZMIN = 0.8, ZMAX = 2.5, ZSTEP = 0.1;
  // Subhex terrain-layer opacity — independent of the base-map (parent) opacity,
  // so you can keep the parent crisp and fade the hex fills to see through them.
  const HEXOP_KEY = 'gw-sx-hex-op';
  function loadHexOp(){ try { const v = parseInt(localStorage.getItem(HEXOP_KEY), 10); return (v >= 0 && v <= 100) ? v : 100; } catch(_){ return 100; } }
  function saveHexOp(v){ try { localStorage.setItem(HEXOP_KEY, String(v)); } catch(_){} }
  const ANCIENT_ROADS_KEY = 'gw-sx-ancient-roads-on';
  function loadAncientRoadsVis(){ try { return localStorage.getItem(ANCIENT_ROADS_KEY) !== '0'; } catch(_){ return true; } }
  function saveAncientRoadsVis(v){ try { localStorage.setItem(ANCIENT_ROADS_KEY, v ? '1' : '0'); } catch(_){} }
  const RASTER_BASE_KEY = 'gw-sx-raster-base-on';
  function loadRasterBaseVis(){ try { return localStorage.getItem(RASTER_BASE_KEY) === '1'; } catch(_){ return false; } }
  function saveRasterBaseVis(v){ try { localStorage.setItem(RASTER_BASE_KEY, v ? '1' : '0'); } catch(_){} }
  const TAB_KEY = 'gw-sx-tab';
  function loadTab(){ try { return localStorage.getItem(TAB_KEY) === 'play' ? 'play' : 'build'; } catch(_){ return 'build'; } }
  function saveTab(v){ try { localStorage.setItem(TAB_KEY, v); } catch(_){} }
  const PALPOS_KEY = 'gw-sx-palpos';
  function loadPalPos(){ try { const p = JSON.parse(localStorage.getItem(PALPOS_KEY) || 'null'); return (p && Number.isFinite(+p.left) && Number.isFinite(+p.top)) ? p : null; } catch(_){ return null; } }
  function savePalPos(p){ try { localStorage.setItem(PALPOS_KEY, JSON.stringify(p)); } catch(_){} }
  const COLLAPSED_KEY = 'gw-sx-collapsed';
  function loadCollapsed(){ try { const a = JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '[]'); return new Set(Array.isArray(a) ? a : []); } catch(_){ return new Set(); } }
  function saveCollapsed(set){ try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...set])); } catch(_){} }
  // Persisted viewport: reopening the same parent resumes exactly where you
  // were; opening a different parent recenters there at your accustomed zoom.
  const VIEW_KEY = 'gw-sx-view';
  function loadView(){
    try {
      const v = JSON.parse(localStorage.getItem(VIEW_KEY) || 'null');
      return (v && Number.isFinite(+v.x) && Number.isFinite(+v.y) && +v.w > 0) ? { x: +v.x, y: +v.y, w: +v.w } : null;
    } catch(_){ return null; }
  }
  function saveViewSoon(){
    if (state.viewSaveTimer) clearTimeout(state.viewSaveTimer);
    state.viewSaveTimer = setTimeout(() => {
      state.viewSaveTimer = 0;
      try { localStorage.setItem(VIEW_KEY, JSON.stringify({ x: state.vb.x, y: state.vb.y, w: state.vb.w })); } catch(_){}
    }, 400);
  }

  // ── party token + fog of war persistence ────────────────────────────────────
  // Global across parents — it's one continuous 3-mile grid, so a single party
  // position and a single revealed-set, not per-parent.
  const PARTY_KEY = 'gw-sx-party', FOG_KEY = 'gw-sx-revealed', FOGVIS_KEY = 'gw-sx-fog-on';
  const SIGHT_RADIUS = 1;   // rings revealed on entering a subhex (1 = center + ring = 9 mi across)
  function loadPartyState(){
    if (state.revealed) return;                 // already loaded
    state.revealed = new Set();
    try { const a = JSON.parse(localStorage.getItem(FOG_KEY) || '[]'); if (Array.isArray(a)) a.forEach(k => state.revealed.add(k)); } catch(_){}
    try { const p = JSON.parse(localStorage.getItem(PARTY_KEY) || 'null'); if (p && Number.isFinite(p.Q) && Number.isFinite(p.R)) state.party = p; } catch(_){}
    try { state.fogOn = localStorage.getItem(FOGVIS_KEY) !== '0'; } catch(_){}
    try { const c = JSON.parse(localStorage.getItem(CLOCK_KEY) || 'null');
      if (c && Number.isFinite(c.year)){
        if (!Number.isFinite(c.min)) c.min = Number.isFinite(c.turn) ? (c.turn - 1) * TURN_MIN : DAWN_MIN;  // migrate old {turn}
        if (!Number.isFinite(c.exert)) c.exert = 0;
        delete c.turn;
        state.clock = c;
      }
    } catch(_){}
    if (!state.clock) state.clock = defaultClock();
    // If a saved party exists but the revealed set was missing/cleared, seed the
    // starting visibility ring so Show fog has an immediate hole to display.
    if (state.party && state.revealed && state.revealed.size === 0){
      reveal(state.party.Q, state.party.R);
    }
  }
  function saveParty(){ try { localStorage.setItem(PARTY_KEY, JSON.stringify(state.party)); } catch(_){} try { window.dispatchEvent(new CustomEvent('gw-party-changed')); } catch(_){} }
  function saveRevealed(){ try { localStorage.setItem(FOG_KEY, JSON.stringify([...state.revealed])); } catch(_){} try { window.dispatchEvent(new CustomEvent('gw-party-changed')); } catch(_){} }
  function saveFogVis(){ try { localStorage.setItem(FOGVIS_KEY, state.fogOn ? '1' : '0'); } catch(_){} }

  // ── time: RAW route movement on a Gregorian 2471 calendar ────────────────────
  // GW1e: one route move ≈ 4 hours, six route-turns per day. Distance is 1 km/turn
  // over swamp/mountains up to 8 km/turn over clear terrain (rates already fold in
  // careful searching). Time is tracked in minutes so a clear 3-mile hex costs ~0.6
  // of a turn and a mountain hex costs several. km/turn values are tunable.
  const CLOCK_KEY = 'gw-sx-clock';
  const TURN_MIN = 240, DAY_MIN = 1440, DAWN_MIN = TURN_MIN;     // 4-hour route-turn; dawn = 04:00
  const HEX_MILES = 3;                                           // a subhex is 3 miles across
  const TRAVEL_TURNS_PER_DAY = 3;                                // ~12h travel; the rest is sleep/camp
  const REST_DUE_MIN = TRAVEL_TURNS_PER_DAY * TURN_MIN;          // a full travel day before rest is due
  // Light burden always (MP has no encumbrance). Normal terrain = 2 mph → 8 mi per
  // 4-hour route-turn → 24 mi over a 3-turn travel day. Rugged / very-rugged scale
  // down by the DMG Light-column 3:2:1 ratio (24 / 16 / 8 mi/day). Tunable.
  const TERRAIN_TIER = {
    plains: 'normal', desert: 'normal', forest: 'rugged', 'heavy-forest': 'very_rugged',
    mountains: 'very_rugged', 'snow-mountains': 'very_rugged', ruins: 'rugged', water: 'very_rugged',
    hills: 'rugged', marsh: 'very_rugged', 'forested-hill': 'rugged', 'forested-mountains': 'very_rugged', coast: 'normal',
    unknown: 'normal', _default: 'normal',
  };
  const MILES_PER_DAY = { normal: 24, rugged: 16, very_rugged: 8 };
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const TURN_LABEL = { 1:'Deep night', 2:'Dawn', 3:'Morning', 4:'Midday', 5:'Evening', 6:'Night' };
  function defaultClock(){ return { year: 2471, month: 4, day: 1, min: DAWN_MIN, exert: 0 }; }
  function isLeap(y){ return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0); }
  function daysInMonth(y, m){ return [31, isLeap(y)?29:28, 31,30,31,30,31,31,30,31,30,31][m-1]; }
  function saveClock(){ try { localStorage.setItem(CLOCK_KEY, JSON.stringify(state.clock)); } catch(_){} try { window.dispatchEvent(new CustomEvent('gw-party-changed')); } catch(_){} }
  function advanceDay(c){
    c.day += 1;
    if (c.day > daysInMonth(c.year, c.month)){ c.day = 1; c.month += 1; if (c.month > 12){ c.month = 1; c.year += 1; } }
  }
  function advanceMinutes(n){
    const c = state.clock; c.min += n;
    while (c.min >= DAY_MIN){ c.min -= DAY_MIN; advanceDay(c); }
    saveClock(); renderClock();
  }
  function milesPerDayFor(sub){
    const tier = TERRAIN_TIER[sub && sub.terrain] || TERRAIN_TIER._default;
    return MILES_PER_DAY[tier] || MILES_PER_DAY.normal;
  }
  // minutes to enter a 3-mile subhex: spread the day's DMG miles over the travel-turns
  function costMinutesFor(sub){ return Math.round(HEX_MILES * TRAVEL_TURNS_PER_DAY * TURN_MIN / milesPerDayFor(sub)); }
  // advance the clock for entering a subhex; over-exertion halves the rate (RAW)
  function travelInto(sub){
    const c = state.clock;
    let cost = costMinutesFor(sub);
    if ((c.exert || 0) >= REST_DUE_MIN) cost *= 2;     // past 4 travel-turns without rest
    c.exert = (c.exert || 0) + cost;
    advanceMinutes(cost);                               // saves + renders
  }
  function makeCamp(){ const c = state.clock; if (c.min >= DAWN_MIN) advanceDay(c); c.min = DAWN_MIN; c.exert = 0; saveClock(); renderClock(); }
  function setDate(){
    const c = state.clock;
    const v = prompt('Set campaign date (YYYY-MM-DD):',
      `${c.year}-${String(c.month).padStart(2,'0')}-${String(c.day).padStart(2,'0')}`);
    if (!v) return;
    const m = v.match(/^(\d{1,5})-(\d{1,2})-(\d{1,2})$/); if (!m) return;
    const year = +m[1], month = Math.min(12, Math.max(1, +m[2]));
    const day = Math.min(daysInMonth(year, month), Math.max(1, +m[3]));
    state.clock = { year, month, day, min: c.min, exert: c.exert || 0 }; saveClock(); renderClock();
  }
  function clockText(){
    const c = state.clock; if (!c) return '';
    const turn = Math.min(6, Math.floor(c.min / TURN_MIN) + 1);
    const hh = String(Math.floor(c.min / 60)).padStart(2,'0'), mm = String(c.min % 60).padStart(2,'0');
    let s = `${MONTHS[c.month-1]} ${c.day}, ${c.year} AD <span style="color:#9a8">· the Black Years</span>`
          + `<br><span style="color:#cba">Route-turn ${turn}/6 — ${TURN_LABEL[turn]} · ${hh}:${mm}</span>`;
    if ((c.exert || 0) >= REST_DUE_MIN) s += `<br><span style="color:#ff8a6a">⚠ Over-exerted — ½ travel rate until rest</span>`;
    if (state.party && D()){
      const sub = D().getSubhexAt(state.party.Q, state.party.R);
      const tier = (TERRAIN_TIER[sub.terrain] || 'normal').replace('_', ' ');
      s += `<br><span style="color:#8ab0a0">Pace ${milesPerDayFor(sub)} mi/day · ${tier}</span>`;
    }
    return s;
  }
  function renderClock(){ if (state.el.clockBody) state.el.clockBody.innerHTML = clockText(); }
  function loadZoom(){ const v = parseFloat(localStorage.getItem(ZOOM_KEY)); return (v >= ZMIN && v <= ZMAX) ? v : 1; }
  function applyZoom(z){
    state.uiZoom = z;
    try { localStorage.setItem(ZOOM_KEY, String(z)); } catch(_){}
    ['palette', 'read', 'enc'].forEach(k => { const el = state.el[k]; if (el) el.style.zoom = z; });
    const lbl = state.el.palette && state.el.palette.querySelector('.sx-zlabel');
    if (lbl) lbl.textContent = Math.round(z * 100) + '%';
  }
  function bumpZoom(delta){ applyZoom(Math.max(ZMIN, Math.min(ZMAX, +(state.uiZoom || 1) + delta))); }
  function buildZoomRow(){
    const row = document.createElement('div'); row.id = 'gw-sx-zoom';
    const minus = document.createElement('button'); minus.textContent = '\u2212'; minus.title = 'Smaller UI (Ctrl \u2212)';
    const lbl = document.createElement('span'); lbl.className = 'sx-zlabel'; lbl.textContent = '100%';
    lbl.title = 'UI size — click to reset; Ctrl+wheel over a panel to adjust';
    const plus = document.createElement('button'); plus.textContent = '+'; plus.title = 'Larger UI (Ctrl +)';
    minus.addEventListener('click', () => bumpZoom(-ZSTEP));
    plus.addEventListener('click', () => bumpZoom(ZSTEP));
    lbl.addEventListener('click', () => applyZoom(1));
    row.append(minus, lbl, plus);
    return row;
  }
  function makeCollapsible(pal){
    const collapsed = loadCollapsed();
    pal.querySelectorAll('.sx-hd').forEach(h => {
      const name = h.textContent;
      const caret = document.createElement('span'); caret.className = 'sx-caret';
      h.prepend(caret);
      const apply = isCollapsed => {
        caret.textContent = isCollapsed ? '\u25b8' : '\u25be';
        h.classList.toggle('collapsed', isCollapsed);
        let n = h.nextElementSibling;
        while (n && !n.classList.contains('sx-hd')){ n.style.display = isCollapsed ? 'none' : ''; n = n.nextElementSibling; }
      };
      apply(collapsed.has(name));
      h.addEventListener('click', () => {
        const isCollapsed = !h.classList.contains('collapsed');
        apply(isCollapsed);
        if (isCollapsed) collapsed.add(name); else collapsed.delete(name);
        saveCollapsed(collapsed);
      });
    });
  }

  function buildPalette(){
    const pal = document.createElement('div'); pal.id = 'gw-sx-palette';
    const grip = document.createElement('div'); grip.className = 'sx-grip';
    grip.innerHTML = '<span>⠿</span><span>Tools — drag</span>';
    pal.appendChild(grip);
    makePaletteDraggable(pal, grip);
    pal.appendChild(buildZoomRow());
    const mode = document.createElement('div'); mode.className = 'sx-mode'; mode.id = 'gw-sx-mode';
    mode.textContent = 'Mode: Select';
    pal.appendChild(mode);
    const status = document.createElement('div'); status.className = 'sx-status'; status.id = 'gw-sx-status';
    pal.appendChild(status);
    const rdiag = document.createElement('div'); rdiag.className = 'sx-rdiag'; rdiag.id = 'gw-sx-rdiag';
    const rdiagTxt = document.createElement('span');
    const rebuild = document.createElement('button'); rebuild.id = 'gw-sx-raster-rebuild'; rebuild.textContent = '⟲';
    rebuild.title = 'Rebuild raster tiles — evict the whole tile cache and regenerate the visible neighborhood';
    rebuild.addEventListener('click', rebuildRasterTiles);
    rdiag.append(rdiagTxt, rebuild);
    pal.appendChild(rdiag);
    state.el.status = status;
    state.el.rdiag = rdiag;
    state.el.rdiagTxt = rdiagTxt;

    // ── Build / Play tab split ─────────────────────────────────────────────
    // Build = map authoring (terrain, hazards, lines, settlements, features);
    // Play = running a session (party, fog, time, encounters). Grip/zoom/mode
    // stay pinned above both. Active tab persists.
    const tabs = document.createElement('div'); tabs.className = 'sx-tabs';
    const buildTabBtn = document.createElement('button'); buildTabBtn.className = 'sx-tab'; buildTabBtn.textContent = '🛠 Build';
    buildTabBtn.title = 'Map authoring — terrain, hazards, lines, settlements, features';
    const playTabBtn = document.createElement('button'); playTabBtn.className = 'sx-tab'; playTabBtn.textContent = '🎲 Play';
    playTabBtn.title = 'Run a session — party, fog, time, encounters';
    tabs.append(buildTabBtn, playTabBtn);
    pal.appendChild(tabs);
    const buildPanel = document.createElement('div'); buildPanel.className = 'sx-tabpanel';
    const playPanel  = document.createElement('div'); playPanel.className  = 'sx-tabpanel';
    let pane = buildPanel;
    function setTab(which){
      const play = which === 'play';
      buildPanel.style.display = play ? 'none' : '';
      playPanel.style.display  = play ? '' : 'none';
      buildTabBtn.classList.toggle('active', !play);
      playTabBtn.classList.toggle('active', play);
      saveTab(play ? 'play' : 'build');
    }
    buildTabBtn.addEventListener('click', () => setTab('build'));
    playTabBtn.addEventListener('click', () => setTab('play'));

    pane.appendChild(hd('Terrain'));
    const T = D().TERRAIN;
    const terr = document.createElement('div'); terr.className = 'gw-sx-terr';
    for (const key of Object.keys(T)){
      if (key === 'unknown') continue;
      const sw = document.createElement('button');
      sw.className = 'gw-sx-sw'; sw.dataset.arm = 'paint:' + key;
      sw.innerHTML = `<span class="gw-sx-chip" style="background:${T[key].fill}"></span><span>${T[key].label}</span>`;
      sw.addEventListener('click', () => arm({ type: 'paint', terrain: key }));
      terr.appendChild(sw);
    }
    pane.appendChild(terr);
    const trow = document.createElement('div'); trow.className = 'sx-row2';
    const erase = mkBtn('⌫ Erase', 'gw-sx-erase'); erase.dataset.arm = 'erase';
    erase.addEventListener('click', () => arm({ type: 'erase' }));
    const undoB = mkBtn('↶ Undo', 'gw-sx-undo'); undoB.disabled = true;
    undoB.addEventListener('click', undo);
    trow.append(erase, undoB); pane.appendChild(trow);

    pane.appendChild(hd('Hazards'));
    const hrow = document.createElement('div'); hrow.className = 'sx-row2';
    const radB = mkBtn('☢ Radiation', 'gw-sx-rad-btn'); radB.dataset.arm = 'hazard:radiation';
    radB.title = 'Paint hard radiation onto any terrain';
    radB.addEventListener('click', () => arm({ type: 'hazard', mode: 'radiation' }));
    const radE = mkBtn('⌫ Clear rad', 'gw-sx-rad-erase'); radE.dataset.arm = 'hazard:off';
    radE.title = 'Remove radiation (carves safe pockets out of irradiated regions)';
    radE.addEventListener('click', () => arm({ type: 'hazard', mode: 'off' }));
    hrow.append(radB, radE); pane.appendChild(hrow);

    pane.appendChild(hd('Lines'));
    const lines = document.createElement('div'); lines.className = 'gw-sx-tools';
    lines.append(
      toolBtn('～ River', { type: 'draw', kind: 'river' }),
      toolBtn('╌ Road',  { type: 'draw', kind: 'road' }),
      toolBtn('⋯ Trail', { type: 'draw', kind: 'trail' }),
      toolBtn('▥ Ancient', { type: 'draw', kind: 'ancient-road' }),
      toolBtn('✎ Pen',   { type: 'draw', kind: 'pen' }),
    );
    pane.appendChild(lines);
    const arRow = document.createElement('div');
    arRow.style.cssText = 'display:flex; align-items:center; gap:6px; margin-top:6px;';
    const arLbl = document.createElement('span'); arLbl.textContent = 'Ancient'; arLbl.style.cssText = "font-size:11px; color:#e0c089;";
    const arSel = document.createElement('select');
    arSel.id = 'gw-sx-ancient-condition';
    arSel.title = 'Condition saved on new ancient-road strokes for later travel and bridge-out rules';
    arSel.style.cssText = 'flex:1; min-width:0; background:rgba(0,0,0,.24); border:1px solid #5a3a0a; color:#e8d5a3; font-family:inherit; font-size:11px; padding:3px;';
    const arConditions = (A() && A().ANCIENT_ROAD_CONDITIONS) || ['usable','broken','buried','bridge-out','blocked','lost'];
    for (const c of arConditions){ const opt = document.createElement('option'); opt.value = c; opt.textContent = c; arSel.appendChild(opt); }
    arSel.value = state.ancientRoadCondition;
    arSel.addEventListener('change', () => { state.ancientRoadCondition = arSel.value || 'broken'; if (state.editor && state.editor.kind === 'ancient-road') state.editor.condition = state.ancientRoadCondition; syncMode(); });
    state.el.ancientConditionSel = arSel;
    arRow.append(arLbl, arSel);
    pane.appendChild(arRow);
    const wRow = document.createElement('div');
    wRow.style.cssText = 'display:flex; align-items:center; gap:6px; margin-top:6px;';
    const wLbl = document.createElement('span'); wLbl.textContent = 'Width'; wLbl.style.cssText = "font-size:11px; color:#e0c089;";
    const wInput = document.createElement('input');
    wInput.type = 'range'; wInput.min = '1'; wInput.max = '8'; wInput.step = '0.5'; wInput.value = String(state.lineWidth);
    wInput.style.cssText = 'flex:1; accent-color:#ff8844;'; wInput.title = 'Line width (thin minor / thick major)';
    const wOut = document.createElement('span'); wOut.textContent = String(state.lineWidth); wOut.style.cssText = 'font-size:11px; color:#e8d5a3; min-width:16px; text-align:right;';
    wInput.addEventListener('input', () => { state.lineWidth = +wInput.value; wOut.textContent = wInput.value; if (state.editor){ state.editor.width = state.lineWidth; editorRender(); } });
    wRow.append(wLbl, wInput, wOut);
    pane.appendChild(wRow);
    const optRow = document.createElement('div');
    optRow.style.cssText = "display:flex; flex-direction:column; gap:2px; margin-top:6px; font-size:11px; color:#e0c089;";
    optRow.innerHTML = '<label style="display:flex;align-items:center;gap:5px;cursor:pointer;"><input type="checkbox" id="gw-sx-freehand"> Freehand draw</label>' +
                       '<label style="display:flex;align-items:center;gap:5px;cursor:pointer;"><input type="checkbox" id="gw-sx-snap"> Snap to hex</label>';
    pane.appendChild(optRow);
    optRow.querySelector('#gw-sx-freehand').addEventListener('change', e => { state.lineMode = e.target.checked ? 'freehand' : 'points'; if (state.editor) finishEditor(); syncMode(); });
    optRow.querySelector('#gw-sx-snap').addEventListener('change', e => { state.snapHex = e.target.checked; });
    const edRow = document.createElement('div'); edRow.className = 'sx-row2';
    const finB = mkBtn('✓ Finish', 'gw-sx-fin'); finB.disabled = true; finB.addEventListener('click', finishEditor);
    const canB = mkBtn('✕ Cancel', 'gw-sx-can'); canB.disabled = true; canB.addEventListener('click', cancelEditor);
    edRow.append(finB, canB); pane.appendChild(edRow);

    pane.appendChild(hd('Settlements'));
    const marks = document.createElement('div'); marks.className = 'gw-sx-tools';
    marks.append(
      toolBtn('◉ Town',    { type: 'marker', kind: 'town' }),
      toolBtn('◎ City',    { type: 'marker', kind: 'city' }),
      toolBtn('• Village', { type: 'marker', kind: 'village' }),
      toolBtn('⌐ Ruin',    { type: 'marker', kind: 'ruin' }),
      toolBtn('✝ Monastery',  { type: 'marker', kind: 'monastery' }),
      toolBtn('⌂ Installation', { type: 'marker', kind: 'installation' }),
    );
    pane.appendChild(marks);

    pane.appendChild(hd('Features'));
    const genRow = document.createElement('div'); genRow.className = 'sx-row2';
    const genB = mkBtn('✦ Generate', 'gw-sx-gen');
    genB.title = 'Seed features for the highlighted parent; raster mode targets the current tile';
    genB.addEventListener('click', generateFeatures);
    const clrB = mkBtn('Clear gen', 'gw-sx-gen-clear');
    clrB.title = 'Clear generated features from the highlighted parent';
    clrB.addEventListener('click', clearGeneratedFeatures);
    genRow.append(genB, clrB);
    pane.appendChild(genRow);
    const genTgt = document.createElement('div'); genTgt.id = 'gw-sx-gen-target';
    genTgt.style.cssText = 'font-size:10px;color:#cbb088;font-style:italic;margin:3px 0 1px;min-height:13px;';
    genTgt.textContent = '▸ target follows view center';
    pane.appendChild(genTgt);
    state.el.genTarget = genTgt;
    const feRow = document.createElement('div'); feRow.className = 'sx-row2';
    const edit = mkBtn('✎ Edit', 'gw-sx-annot-edit'); edit.dataset.arm = 'annot-edit';
    edit.title = 'Select a placed feature to rename, change its type, drag to move, or delete';
    edit.addEventListener('click', () => arm({ type: 'annot-edit' }));
    const fe = mkBtn('⌫ Erase', 'gw-sx-annot-erase'); fe.dataset.arm = 'annot-erase';
    fe.title = 'Delete a placed feature (click its icon)';
    fe.addEventListener('click', () => arm({ type: 'annot-erase' }));
    feRow.append(edit, fe); pane.appendChild(feRow);

    pane = playPanel;   // ── Play tab from here down ──
    pane.appendChild(hd('Party'));
    const ppB = mkBtn('📍 Place party', 'gw-sx-party-place'); ppB.dataset.arm = 'party-place'; ppB.style.width = '100%';
    ppB.title = 'GM: drop/teleport the party on any subhex (reveals around it, no time cost)';
    ppB.addEventListener('click', () => arm({ type: 'party-place' }));
    pane.appendChild(ppB);
    const pmB = mkBtn('🧭 Move party', 'gw-sx-party-move'); pmB.dataset.arm = 'party-move'; pmB.style.width = '100%';
    pmB.title = 'Step the party one 3-mile hex toward the clicked cell';
    pmB.addEventListener('click', () => arm({ type: 'party-move' }));
    pane.appendChild(pmB);
    const puB = mkBtn('↶ Undo move', 'gw-sx-party-undo'); puB.style.width = '100%'; puB.disabled = true;
    puB.title = 'Undo the last party move/placement (position, fog, and clock)';
    puB.addEventListener('click', undoPartyMove);
    pane.appendChild(puB);
    state.el.partyUndoBtn = puB;
    const fogRow = document.createElement('label');
    fogRow.style.cssText = 'display:flex;align-items:center;gap:5px;font-size:11px;color:#d8c4a0;margin:4px 0 2px;cursor:pointer;';
    const fogCb = document.createElement('input'); fogCb.type = 'checkbox'; fogCb.id = 'gw-sx-fog-cb'; fogCb.checked = true;
    fogCb.addEventListener('change', () => { state.fogOn = fogCb.checked; saveFogVis(); renderFog(); });
    fogRow.append(fogCb, document.createTextNode(' Show fog'));
    pane.appendChild(fogRow);
    state.el.fogCb = fogCb;
    const resetFog = mkBtn('⟲ Reset fog', 'gw-sx-fog-reset'); resetFog.style.width = '100%';
    resetFog.title = 'Re-hide every subhex (clears what the party has seen)';
    resetFog.addEventListener('click', () => { if (state.revealed) state.revealed.clear(); if (state.party) reveal(state.party.Q, state.party.R); saveRevealed(); renderFog(); });
    pane.appendChild(resetFog);

    pane.appendChild(hd('Time'));
    const clockBody = document.createElement('div'); clockBody.id = 'gw-sx-clock';
    clockBody.style.cssText = 'font-size:11px;line-height:1.45;color:#e8d6b0;margin:2px 0 5px;';
    pane.appendChild(clockBody);
    state.el.clockBody = clockBody;
    const tRow = document.createElement('div'); tRow.style.cssText = 'display:flex;gap:4px;margin-bottom:3px;';
    const tTurn = mkBtn('+Turn', 'gw-sx-t-turn'); tTurn.style.flex = '1'; tTurn.title = 'Advance one 4-hour route-turn';
    tTurn.addEventListener('click', () => advanceMinutes(TURN_MIN));
    const tDay = mkBtn('+Day', 'gw-sx-t-day'); tDay.style.flex = '1'; tDay.title = 'Advance one full day';
    tDay.addEventListener('click', () => { advanceDay(state.clock); saveClock(); renderClock(); });
    tRow.append(tTurn, tDay); pane.appendChild(tRow);
    const tRow2 = document.createElement('div'); tRow2.style.cssText = 'display:flex;gap:4px;';
    const tCamp = mkBtn('⛺ Camp', 'gw-sx-t-camp'); tCamp.style.flex = '1'; tCamp.title = 'Rest overnight — jump to next dawn';
    tCamp.addEventListener('click', makeCamp);
    const tSet = mkBtn('📅 Set', 'gw-sx-t-set'); tSet.style.flex = '1'; tSet.title = 'Set the campaign date';
    tSet.addEventListener('click', setDate);
    tRow2.append(tCamp, tSet); pane.appendChild(tRow2);
    const travelMsg = document.createElement('div'); travelMsg.id = 'gw-sx-travel-msg';
    travelMsg.style.cssText = 'font-size:10px;font-style:italic;color:#c2a7b0;margin-top:3px;';
    pane.appendChild(travelMsg);
    state.el.travelMsg = travelMsg;

    pane.appendChild(hd('Encounters'));
    const encB = mkBtn('🎲 Roll here', 'gw-sx-enc-roll'); encB.style.width = '100%';
    encB.title = 'Roll a wilderness encounter for the selected (or hovered) subhex';
    encB.addEventListener('click', rollEncounterHere);
    pane.appendChild(encB);
    state.el.encBtn = encB;

    pal.appendChild(buildPanel);
    pal.appendChild(playPanel);
    setTab(loadTab());

    makeCollapsible(pal);
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
  function targetParent(){
    // In raster mode the tile neighborhood follows the view center, so generated
    // feature actions target the same parent the raster layer is centered on.
    return state.rasterBase ? rasterParent() : centerParent();
  }
  function generateFeatures(){
    const p = targetParent();
    if (!p || !window.GWFeatureGen){ return; }
    const res = window.GWFeatureGen.generateForParent(p.col, p.row);
    markRasterDirtyParent(p);
    renderAnnotations();
    if (state.rasterBase) updateRasterBase(false);
    if (res) setStatus(`Parent ${p.col},${p.row}: ${res.markers} sites, ${res.strokes} paths`);
  }
  function clearGeneratedFeatures(){
    const p = targetParent();
    if (!p || !window.GWFeatureGen){ return; }
    const n = window.GWFeatureGen.clearForParent(p.col, p.row);
    markRasterDirtyParent(p);
    renderAnnotations();
    if (state.rasterBase) updateRasterBase(false);
    setStatus(`Cleared ${n} generated`, 2000);
  }

  // ── encounters ─────────────────────────────────────────────────────────────
  // Roll for the selected subhex (or the hovered / view-center cell as a
  // fallback), resolving on that cell's own terrain + hazard + feature via the
  // shared GWEncounter resolver. RAW priority feature -> radiation -> terrain
  // lives in rollEncounter.
  function rollEncounterHere(){
    const d = D();
    if (!window.GWEncounter || !window.GWEncounterData){
      showEncounter('<span class="enc-x" title="Close">✕</span><span class="enc-nope">Encounter tables not loaded.</span>'); return;
    }
    let Q, R;
    if (state.selected){ Q = state.selected.Q; R = state.selected.R; }
    else if (state.hoverKey){ const p = state.hoverKey.split('_'); Q = +p[0]; R = +p[1]; }
    else {
      const rp = activeRasterParent();
      const pc = rp && d.parentCenterAxial ? d.parentCenterAxial(rp.col, rp.row) : null;
      if (pc){ Q = pc.Q; R = pc.R; }
      else { const c = d.svgToAxial(state.vb.x + state.vb.w / 2, state.vb.y + state.vb.h / 2); Q = c.Q; R = c.R; }
    }
    if (state.rasterBase && !cellInActiveRasterParent(Q, R)){
      showEncounter('<span class="enc-x" title="Close">✕</span><span class="enc-nope">Pick a subhex inside the rendered raster neighborhood first.</span>'); return;
    }
    const sub = d.getSubhexAt(Q, R);
    const feat = d.getCellFeature(Q, R);
    const featKind = feat && feat.kind ? feat.kind : null;
    const tlabel = (d.TERRAIN[sub.terrain] || d.TERRAIN.unknown).label;
    const check = 1 + Math.floor(Math.random() * 6);
    const res = window.GWEncounter.roll(sub.terrain, sub.hazard, featKind);
    renderEncounterPanel({ Q, R, sub, featKind, tlabel, check, res });
  }
  function renderEncounterPanel(o){
    const rad = o.sub.hazard === 'radiation' ? ' <span style="color:#c3f037">☢</span>' : '';
    const feat = o.featKind ? ` · ${o.featKind}` : '';
    let html = '<span class="enc-x" title="Close">✕</span>';
    html += `<div class="enc-meta">Subhex ${o.Q},${o.R} · ${o.tlabel}${rad}${feat}</div>`;
    html += `<div class="enc-meta">Check 1d6 → <b>${o.check}</b>${o.check === 6 ? ' ✶' : ''}`;
    if (o.res && o.res.tableKey) html += ` · <em>${o.res.tableKey}</em> 1d20 → ${o.res.roll}`;
    html += '</div>';
    let creature = null;
    if (o.check !== 6){
      html += '<div class="enc-nope">No encounter.</div>';
    } else if (o.res.error){
      html += `<div class="enc-nope">${o.res.error}</div>`;
    } else {
      const r = o.res.row;
      if (r.creature === 'No Encounter') html += '<div class="enc-nope">No encounter (high roll).</div>';
      else {
        html += `<div class="enc-cr">${r.creature}</div>`;
        if (r.number) html += `<div>No. appearing: ${r.number}</div>`;
        if (r.note)   html += `<div class="enc-meta" style="font-style:italic;">${r.note}</div>`;
        if (window.GWBestiary && window.GWBestiary[r.creature]) creature = r.creature;
      }
    }
    showEncounter(html);
    if (creature && window.GWEncounter.attachExport) window.GWEncounter.attachExport(state.el.enc, creature);
  }
  function showEncounter(html){
    const el = state.el.enc; if (!el) return;
    el.innerHTML = html; el.classList.add('show');
    const x = el.querySelector('.enc-x'); if (x) x.onclick = () => el.classList.remove('show');
  }

  // ── cell selection (for encounters) ─────────────────────────────────────────
  // Click a subhex in pan/select mode to mark it; it stays highlighted (cyan)
  // until you pick another, so you can then hit "Roll" in the palette.
  function selectCell(Q, R){
    if (state.rasterBase && !cellInActiveRasterParent(Q, R)){ clearSelection(); return false; }
    state.selected = { Q, R };
    renderSelection();
    if (state.el.encBtn) state.el.encBtn.textContent = `🎲 Roll: ${Q},${R}`;
    return true;
  }
  function clearSelection(){
    state.selected = null;
    renderSelection();
    if (state.el.encBtn) state.el.encBtn.textContent = '🎲 Roll here';
  }
  function renderSelection(){
    const g = state.el.gSel; if (!g) return;
    if (!state.selected){ g.replaceChildren(); return; }
    if (state.rasterBase && !cellInActiveRasterParent(state.selected.Q, state.selected.R)){
      g.replaceChildren();
      if (state.el.encBtn) state.el.encBtn.textContent = '🎲 Roll here';
      return;
    }
    const d = D(); const c = d.subhexSvgCenter(state.selected.Q, state.selected.R);
    const p = document.createElementNS(SVGNS, 'polygon');
    p.setAttribute('points', cornersStr(c.x, c.y, d.SUB_R));
    p.setAttribute('class', 'gw-sx-sel');
    g.replaceChildren(p);
  }

  // ── party token + fog of war (3-mile grid) ──────────────────────────────────
  function hexDist(q1, r1, q2, r2){
    return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
  }
  // reveal the subhex + a hex-disk of SIGHT_RADIUS around it (radius 1 = 9 mi across)
  function reveal(Q, R){
    if (!state.revealed) state.revealed = new Set();
    const added = [];
    for (let dq = -SIGHT_RADIUS; dq <= SIGHT_RADIUS; dq++){
      for (let dr = -SIGHT_RADIUS; dr <= SIGHT_RADIUS; dr++){
        if (hexDist(Q, R, Q + dq, R + dr) > SIGHT_RADIUS) continue;
        const k = (Q + dq) + '_' + (R + dr);
        if (!state.revealed.has(k)){ state.revealed.add(k); added.push(k); }
      }
    }
    if (added.length){ saveRevealed(); renderFog(); }
    return added;
  }
  function setPartyAt(Q, R, entered){
    const snap = {                              // capture pre-move state for undo
      party: state.party ? { Q: state.party.Q, R: state.party.R } : null,
      clock: state.clock ? { ...state.clock } : null,
      selected: state.selected ? { Q: state.selected.Q, R: state.selected.R } : null,
      added: null,
    };
    state.party = { Q, R };
    saveParty();
    snap.added = reveal(Q, R);                  // fog keys this move revealed (to roll back)
    renderParty();
    if (entered){
      selectCell(Q, R);                       // prime the encounter roller on the just-entered cell
      travelInto(D().getSubhexAt(Q, R));       // RAW km/turn travel time (advances the clock)
      // TODO(encounter slice): optional auto-roll via window.GWEncounter when toggled on.
    }
    pushPartyUndo(snap);
  }
  function pushPartyUndo(snap){
    state.partyUndo.push(snap);
    if (state.partyUndo.length > 50) state.partyUndo.shift();
    syncPartyUndoBtn();
  }
  function undoPartyMove(){
    const snap = state.partyUndo.pop(); if (!snap) return;
    state.party = snap.party;
    if (snap.clock) state.clock = snap.clock;
    if (snap.added && state.revealed) snap.added.forEach(k => state.revealed.delete(k));
    saveParty(); saveRevealed(); saveClock();
    renderParty(); renderFog(); renderClock();
    if (snap.selected) selectCell(snap.selected.Q, snap.selected.R); else clearSelection();
    setTravelMsg('');
    syncPartyUndoBtn();
  }
  function syncPartyUndoBtn(){ if (state.el.partyUndoBtn) state.el.partyUndoBtn.disabled = !state.partyUndo.length; }
  function placeParty(Q, R){ setPartyAt(Q, R, false); }     // GM teleport: reveal only, no time/encounter
  function movePartyToward(Q, R){
    if (!state.party){ setPartyAt(Q, R, true); return; }     // first move drops the party (counts as entering)
    const p = state.party;
    if (p.Q === Q && p.R === R) return;
    let best = null, bestD = Infinity;                       // single 3-mile step toward the click
    for (const n of D().neighborsOf(p.Q, p.R)){
      const dd = hexDist(n.Q, n.R, Q, R);
      if (dd < bestD){ bestD = dd; best = n; }
    }
    if (!best) return;
    // dice-off: if the day's remaining travel time can't cover the next hex, roll
    // to see if the party squeezes it in (chance = time left ÷ hex cost) or camps short.
    const baseCost = costMinutesFor(D().getSubhexAt(best.Q, best.R));
    const remaining = REST_DUE_MIN - ((state.clock && state.clock.exert) || 0);
    if (remaining > 0 && remaining < baseCost){
      const pct = Math.max(1, Math.round(remaining / baseCost * 100));
      const d100 = 1 + Math.floor(Math.random() * 100);
      if (d100 <= pct){
        setPartyAt(best.Q, best.R, true);
        setTravelMsg(`✓ Pushed on — reached the hex (rolled ${d100} ≤ ${pct}%). Party is spent.`);
      } else {
        campWhereYouAre();
        setTravelMsg(`✗ Fell short (rolled ${d100} > ${pct}%) — camped here for the night.`);
      }
      return;
    }
    setPartyAt(best.Q, best.R, true);
    setTravelMsg('');
  }
  function campWhereYouAre(){                                 // fall-short camp; undoable as one action
    const snap = {
      party: state.party ? { Q: state.party.Q, R: state.party.R } : null,
      clock: state.clock ? { ...state.clock } : null,
      selected: state.selected ? { Q: state.selected.Q, R: state.selected.R } : null,
      added: [],
    };
    makeCamp();
    pushPartyUndo(snap);
  }
  function setTravelMsg(msg){ if (state.el.travelMsg) state.el.travelMsg.textContent = msg || ''; }
  function renderParty(){
    const g = state.el.gParty; if (!g) return;
    if (!state.party){ g.replaceChildren(); return; }
    if (state.rasterBase && !cellInActiveRasterParent(state.party.Q, state.party.R)){ g.replaceChildren(); return; }
    const d = D(); const c = d.subhexSvgCenter(state.party.Q, state.party.R);
    const ring = document.createElementNS(SVGNS, 'circle');
    ring.setAttribute('cx', c.x); ring.setAttribute('cy', c.y); ring.setAttribute('r', (d.SUB_R * 0.42).toFixed(2));
    ring.setAttribute('class', 'gw-sx-party');
    const dot = document.createElementNS(SVGNS, 'circle');
    dot.setAttribute('cx', c.x); dot.setAttribute('cy', c.y); dot.setAttribute('r', (d.SUB_R * 0.16).toFixed(2));
    dot.setAttribute('class', 'gw-sx-party-dot');
    g.replaceChildren(ring, dot);
  }
  function fogBounds(){
    // Fog is an overlay tied to the visible viewport, not to the heavier padded
    // terrain/raster coverage cache. Keeping it local prevents stale or huge fog
    // paths when raster pan/zoom work is deferred for performance.
    const mx = state.vb.w * 0.35, my = state.vb.h * 0.35;
    return { minX: state.vb.x - mx, maxX: state.vb.x + state.vb.w + mx, minY: state.vb.y - my, maxY: state.vb.y + state.vb.h + my };
  }
  function fogRectPath(bb){
    const f = n => (+n).toFixed(2);
    return `M ${f(bb.minX)},${f(bb.minY)} H ${f(bb.maxX)} V ${f(bb.maxY)} H ${f(bb.minX)} Z `;
  }
  // Revealed-key -> {Q,R,x,y} memo: centers are deterministic, so the parse +
  // subhexSvgCenter cost is paid once per cell ever, not once per fog render.
  const _fogCenter = new Map();
  function fogCellCenter(key){
    let c = _fogCenter.get(key);
    if (c !== undefined) return c;
    const s = String(key), i = s.indexOf('_');
    const Q = +s.slice(0, i), R = +s.slice(i + 1);
    if (i <= 0 || !Number.isFinite(Q) || !Number.isFinite(R)) c = null;
    else { const p = D().subhexSvgCenter(Q, R); c = { Q, R, x: p.x, y: p.y }; }
    if (_fogCenter.size > 300000) _fogCenter.clear();
    _fogCenter.set(key, c);
    return c;
  }

  // Draw one viewport-sized fog veil and punch out revealed cells with even-odd
  // fill. This keeps fog independent of the terrain/raster coverage cache and
  // avoids building enormous paths for every unrevealed cell at far zoom.
  function renderFog(){
    const g = state.el.gFog; if (!g) return;
    g.replaceChildren();
    if (!state.fogOn) return;
    const d = D();
    if (!d || !d.subhexSvgCenter) return;
    if (!state.revealed) state.revealed = new Set();
    const bb = fogBounds();
    const pad = d.SUB_R * 1.2;
    const minX = bb.minX - pad, maxX = bb.maxX + pad, minY = bb.minY - pad, maxY = bb.maxY + pad;
    let dStr = fogRectPath(bb);
    for (const key of state.revealed){
      const c = fogCellCenter(key);
      if (!c || c.x < minX || c.x > maxX || c.y < minY || c.y > maxY) continue;
      dStr += subhexPath(c.Q, c.R);
    }
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', dStr);
    p.setAttribute('class', 'gw-sx-fog');
    p.setAttribute('fill-rule', 'evenodd');
    g.appendChild(p);
  }

  function ensureDom(){
    if (state.el.overlay) return;
    injectStyle();
    const overlay = document.createElement('div'); overlay.id = 'gw-sx-overlay';
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.id = 'gw-sx-svg'; svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const rasterBase = document.createElementNS(SVGNS, 'g'); rasterBase.id = 'gw-sx-raster-base';
    rasterBase.style.display = 'none'; rasterBase.style.pointerEvents = 'none';
    const gCells = document.createElementNS(SVGNS, 'g');   gCells.id = 'gw-sx-cells';
    const gHaz = document.createElementNS(SVGNS, 'g');      gHaz.id = 'gw-sx-haz';
    const defs = document.createElementNS(SVGNS, 'defs');
    const pat = document.createElementNS(SVGNS, 'pattern');
    pat.id = 'gw-sx-rad';
    pat.setAttribute('width', '1.1'); pat.setAttribute('height', '1.1');
    pat.setAttribute('patternUnits', 'userSpaceOnUse'); pat.setAttribute('patternTransform', 'rotate(45)');
    const pr = document.createElementNS(SVGNS, 'rect');
    pr.setAttribute('width', '1.1'); pr.setAttribute('height', '1.1'); pr.setAttribute('fill', 'rgba(150,210,40,0.16)');
    const pl = document.createElementNS(SVGNS, 'line');
    pl.setAttribute('x1', '0'); pl.setAttribute('y1', '0'); pl.setAttribute('x2', '0'); pl.setAttribute('y2', '1.1');
    pl.setAttribute('stroke', 'rgba(195,240,55,0.6)'); pl.setAttribute('stroke-width', '0.3');
    pat.append(pr, pl); defs.append(pat);
    const gParents = document.createElementNS(SVGNS, 'g'); gParents.id = 'gw-sx-parents';
    const basemap = document.createElementNS(SVGNS, 'image'); basemap.id = 'gw-sx-basemap';
    basemap.setAttribute('href', 'gwmap.png?v=3');
    basemap.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'gwmap.png?v=3');
    basemap.setAttribute('x', '0'); basemap.setAttribute('y', '0');
    basemap.setAttribute('width', '3001'); basemap.setAttribute('height', '1863');
    basemap.setAttribute('preserveAspectRatio', 'none');
    basemap.setAttribute('opacity', '0.6');
    basemap.style.display = 'none'; basemap.style.pointerEvents = 'none';
    const gAnnotFast = document.createElementNS(SVGNS, 'g'); gAnnotFast.id = 'gw-sx-annot-fast';
    gAnnotFast.style.display = 'none';
    const gAnnot = document.createElementNS(SVGNS, 'g');   gAnnot.id = 'gw-sx-annot';
    const gEditor = document.createElementNS(SVGNS, 'g');  gEditor.id = 'gw-sx-editor';
    const gPreview = document.createElementNS(SVGNS, 'g'); gPreview.id = 'gw-sx-preview';
    const gHover = document.createElementNS(SVGNS, 'g');   gHover.id = 'gw-sx-hover';
    const gSel = document.createElementNS(SVGNS, 'g');     gSel.id = 'gw-sx-sel';
    const gFog = document.createElementNS(SVGNS, 'g');     gFog.id = 'gw-sx-fog';
    const gParty = document.createElementNS(SVGNS, 'g');   gParty.id = 'gw-sx-party';
    const gTarget = document.createElementNS(SVGNS, 'g');  gTarget.id = 'gw-sx-target';
    const panG = document.createElementNS(SVGNS, 'g');     panG.id = 'gw-sx-pan';
    // basemap first = bottom layer: the parent map sits UNDER both the subhex
    // terrain and the raster tile layer, so fading gCells (live) or rasterBase
    // (raster mode) with the subhex-opacity slider reveals the parent map.
    panG.append(basemap, rasterBase, gCells, gHaz, gPreview, gParents, gTarget, gAnnotFast, gAnnot, gEditor, gFog, gSel, gParty, gHover);
    svg.append(defs, panG);

    const palette = buildPalette();
    const bar = document.createElement('div'); bar.id = 'gw-sx-bar';
    const back = mkBtn('← Overworld', 'gw-sx-back');
    const title = document.createElement('span'); title.className = 'sx-title'; title.id = 'gw-sx-parent-lbl';
    const spacer = document.createElement('span'); spacer.className = 'sx-spacer';
    const tog = document.createElement('label');
    tog.innerHTML = '<input type="checkbox" id="gw-sx-toggle-parents" checked> Parent outlines';
    const arTog = document.createElement('label');
    state.showAncientRoads = loadAncientRoadsVis();
    arTog.innerHTML = `<input type="checkbox" id="gw-sx-toggle-ancient" ${state.showAncientRoads ? 'checked' : ''}> Ancient roads`;
    const rasterTog = document.createElement('label');
    state.rasterBase = loadRasterBaseVis();
    rasterTog.title = 'Use generated raster tiles as the base layer around the view center. Turn off for full live SVG authoring.';
    rasterTog.innerHTML = `<input type="checkbox" id="gw-sx-toggle-raster" ${state.rasterBase ? 'checked' : ''}> Raster tile`;
    const mapTog = document.createElement('label');
    mapTog.innerHTML = '<input type="checkbox" id="gw-sx-toggle-map"> Base map';
    const mapOp = document.createElement('input');
    mapOp.type = 'range'; mapOp.id = 'gw-sx-map-op'; mapOp.min = '15'; mapOp.max = '100'; mapOp.step = '5'; mapOp.value = '60';
    mapOp.title = 'Base map opacity'; mapOp.style.cssText = 'width:80px; accent-color:#ff8844;';
    const hexOp = document.createElement('input');
    hexOp.type = 'range'; hexOp.id = 'gw-sx-hex-op'; hexOp.min = '0'; hexOp.max = '100'; hexOp.step = '5';
    hexOp.value = String(loadHexOp());
    hexOp.title = 'Subhex fill opacity — fade the terrain fills (live) or the raster tile layer to reveal the parent map';
    hexOp.style.cssText = 'width:80px; accent-color:#66d9ff;';
    gCells.style.setProperty('--gw-cell-fill', (loadHexOp() / 100).toFixed(2));   // apply persisted terrain-fill opacity
    rasterBase.style.opacity = (loadHexOp() / 100).toFixed(2);
    const fit = mkBtn('Fit parent', 'gw-sx-fit');
    bar.append(back, title, spacer, tog, arTog, rasterTog, mapTog, mapOp, hexOp, fit);
    const read = document.createElement('div'); read.id = 'gw-sx-read';
    read.innerHTML = '<span class="sx-t">Subhex</span><div id="gw-sx-read-body">— hover a cell —</div>';
    const enc = document.createElement('div'); enc.id = 'gw-sx-enc';

    // ── marker editor (Edit feature mode) ──
    const med = document.createElement('div'); med.id = 'gw-sx-medit';
    const kindOpts = A() ? A().MARKER_KINDS.map(k => `<option value="${k}">${k}</option>`).join('') : '';
    med.innerHTML =
      '<div class="sx-med-h">EDIT FEATURE</div>' +
      '<div class="sx-med-row"><span>Name</span><input id="gw-sx-med-name" type="text" placeholder="(unnamed)"></div>' +
      '<div class="sx-med-row"><span>Type</span><select id="gw-sx-med-kind">' + kindOpts + '</select></div>' +
      '<div class="sx-med-row"><span>Hidden</span><label style="flex:1;display:flex;align-items:center;gap:6px;font-size:11px;color:#cbb088;cursor:pointer"><input id="gw-sx-med-hidden" type="checkbox"> Hide from players</label></div>' +
      '<div class="sx-med-btns"><button id="gw-sx-med-del">🗑 Delete</button><button id="gw-sx-med-done">✓ Done</button></div>' +
      '<div id="gw-sx-med-dossier" class="sx-dos"></div>' +
      '<div class="sx-med-tip">Drag the icon on the map to move it.</div>';

    overlay.append(svg, palette, bar, read, enc, med);
    document.body.appendChild(overlay);
    applyPalPos(palette);

    Object.assign(state.el, {
      overlay, svg, rasterBase, gCells, gParents, gAnnotFast, gAnnot, gEditor, gHaz, panG, gPreview, gHover, gSel, gFog, gParty, gTarget, basemap, title, read, enc,
      readBody: read.querySelector('#gw-sx-read-body'),
      mode: palette.querySelector('#gw-sx-mode'),
      undoBtn: palette.querySelector('#gw-sx-undo'),
      finBtn: palette.querySelector('#gw-sx-fin'),
      canBtn: palette.querySelector('#gw-sx-can'),
      medit: med,
      medName: med.querySelector('#gw-sx-med-name'),
      medKind: med.querySelector('#gw-sx-med-kind'),
      medDossier: med.querySelector('#gw-sx-med-dossier'),
      medHidden: med.querySelector('#gw-sx-med-hidden'),
      palette,
    });
    state.el.medName.addEventListener('input', () => { if (state.markerSel){ A().updateMarker(state.markerSel, { name: state.el.medName.value }); markRasterDirtySelMarker(); renderAnnotations(); renderDossier(); } });
    state.el.medKind.addEventListener('change', () => { if (state.markerSel){ A().updateMarker(state.markerSel, { kind: state.el.medKind.value }); markRasterDirtySelMarker(); renderAnnotations(); renderDossier(); } });
    state.el.medHidden.addEventListener('change', () => { if (state.markerSel){ A().updateMarker(state.markerSel, { hidden: state.el.medHidden.checked }); markRasterDirtySelMarker(); renderAnnotations(); } });
    med.querySelector('#gw-sx-med-del').addEventListener('click', () => { if (state.markerSel){ markRasterDirtySelMarker(); A().deleteMarker(state.markerSel); closeMarkerEditor(); renderAnnotations(); } });
    med.querySelector('#gw-sx-med-done').addEventListener('click', closeMarkerEditor);
    back.addEventListener('click', close);
    fit.addEventListener('click', () => { if (state.curParent) centerOnParent(state.curParent.col, state.curParent.row); });
    tog.querySelector('input').addEventListener('change', e => { state.showParents = e.target.checked; render(true); });
    arTog.querySelector('input').addEventListener('change', e => { state.showAncientRoads = e.target.checked; saveAncientRoadsVis(state.showAncientRoads); renderAnnotations(); if (state.rasterBase) updateRasterBase(false); });
    rasterTog.querySelector('input').addEventListener('change', e => {
      state.rasterBase = !!e.target.checked;
      saveRasterBaseVis(state.rasterBase);
      state.rendered = null;
      if (!state.rasterBase) state.rasterKey = null;
      render(true);
      updateRasterDiag();
      syncMode();
    });
    mapTog.querySelector('input').addEventListener('change', e => { basemap.style.display = e.target.checked ? '' : 'none'; });
    mapOp.addEventListener('input', e => { basemap.setAttribute('opacity', (e.target.value / 100).toFixed(2)); });
    hexOp.addEventListener('input', e => {
      const v = (e.target.value / 100).toFixed(2);
      gCells.style.setProperty('--gw-cell-fill', v);
      rasterBase.style.opacity = v;
      saveHexOp(e.target.value);
    });
    wireViewport(svg);
    bindCellHover(svg);
    window.addEventListener('keydown', onEditorKey);

    // Ctrl+wheel over a panel adjusts UI zoom (plain wheel still scrolls it).
    [palette, read, enc].forEach(el => el.addEventListener('wheel', e => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      bumpZoom(e.deltaY < 0 ? ZSTEP : -ZSTEP);
    }, { passive: false }));
    applyZoom(loadZoom());
    applyRasterModeVisibility();
  }

  function rasterParent(){
    return centerParent() || state.curParent;
  }
  // One layout read per raster pass: curU() forces getBoundingClientRect, so
  // tile size + label visibility are computed once here and threaded through
  // key/render calls instead of re-reading layout per parent tile.
  function rasterViewContext(){
    const d = D();
    const u = curU();
    const px = (2 * ((d && d.HEX_R) || 20)) / Math.max(u, 0.0001);
    const size = px >= 360 ? 1024 : px >= 220 ? 768 : px >= 120 ? 512 : 384;
    return { size, labels: u <= FEATURE_LABEL_MAX_U, hidden: state.rasterShowHidden !== false };
  }
  function rasterVisibleParentCols(){
    const d = D();
    if (!d) return 1;
    return state.vb.w / Math.max(1, 1.5 * (d.HEX_R || 20));
  }
  function rasterViewPadParents(){
    // At far zoom, a single view already contains many parents; a large offscreen
    // buffer just creates extra images the browser has to decode and move.
    const cols = rasterVisibleParentCols();
    if (cols >= 14) return 0.15;
    if (cols >= 10) return 0.35;
    if (cols >= 7) return 0.75;
    return RASTER_VIEW_PAD_PARENTS;
  }
  function rasterMaxVisibleTiles(){
    const cols = rasterVisibleParentCols();
    if (cols >= 14) return 40;
    if (cols >= 10) return 52;
    return RASTER_MAX_VISIBLE_TILES;
  }
  function rasterTileCacheMax(){
    return Math.max(RASTER_MAX_VISIBLE_TILES, rasterMaxVisibleTiles() * 3);
  }
  function rasterTileKey(p, ctx){
    return p ? `${p.col},${p.row}|ancient:${state.showAncientRoads ? 1 : 0}|labels:${ctx.labels ? 1 : 0}|hidden:${ctx.hidden ? 1 : 0}|size:${ctx.size}` : '';
  }
  function rasterLayerKey(parents, ctx){
    // Tile coverage, not view center, determines whether the raster image layer
    // needs to be rebuilt. The center parent can change while wheel-zooming
    // around the cursor; forcing a tile DOM rebuild for that label-only change
    // made raster zoom feel like walking through swamp syrup.
    return (parents || []).map(p => rasterTileKey(p, ctx)).join(';');
  }
  function rasterParentBounds(p, pad){
    const d = D();
    if (!d || !p) return null;
    const c = d.parentSvgCenter(+p.col, +p.row);
    const r = d.HEX_R + (Number.isFinite(+pad) ? +pad : 0);
    return { minX: c.x - r, maxX: c.x + r, minY: c.y - r * Math.sqrt(3) / 2, maxY: c.y + r * Math.sqrt(3) / 2 };
  }
  function bboxesTouch(a, b){
    return !!(a && b && a.maxX >= b.minX && a.minX <= b.maxX && a.maxY >= b.minY && a.minY <= b.maxY);
  }
  function rasterViewportBounds(){
    const d = D();
    const pad = (d && d.HEX_R ? d.HEX_R : 20) * rasterViewPadParents();
    return { minX: state.vb.x - pad, maxX: state.vb.x + state.vb.w + pad, minY: state.vb.y - pad, maxY: state.vb.y + state.vb.h + pad };
  }
  function rasterParentDistanceToView(p){
    const d = D();
    if (!d || !p) return Infinity;
    const c = d.parentSvgCenter(+p.col, +p.row);
    const cx = state.vb.x + state.vb.w / 2;
    const cy = state.vb.y + state.vb.h / 2;
    return (c.x - cx) * (c.x - cx) + (c.y - cy) * (c.y - cy);
  }
  function rasterNeighborParents(center){
    const out = [];
    const atlas = window.GWSubhexAtlas;
    const d = D();
    if (!center || !d) return out;
    const bounds = rasterViewportBounds();
    const world = atlas && typeof atlas.inferBounds === 'function' ? atlas.inferBounds() : null;
    const hexR = d.HEX_R || 20, root3 = Math.sqrt(3);
    const stepX = 1.5 * hexR, stepY = root3 * hexR;
    const hardMinCol = world ? world.minCol : Math.max(0, +center.col - 8);
    const hardMaxCol = world ? world.maxCol : +center.col + 8;
    const roughPadX = hexR * 2.5;
    const roughPadY = hexR * root3 * 1.5;
    const minCol = Math.max(hardMinCol, Math.floor((bounds.minX - hexR - roughPadX) / stepX));
    const maxCol = Math.min(hardMaxCol, Math.ceil((bounds.maxX - hexR + roughPadX) / stepX));
    for (let col = minCol; col <= maxCol; col++){
      const oddY = (col & 1) ? hexR * root3 / 2 : 0;
      const baseY = hexR * root3 / 2 + oddY;
      const roughMinRow = Math.floor((bounds.minY - baseY - roughPadY) / stepY);
      const roughMaxRow = Math.ceil((bounds.maxY - baseY + roughPadY) / stepY);
      const minRow = Math.max(world ? world.minRow : +center.row - 8, roughMinRow);
      const maxRow = Math.min(world ? world.maxRow : +center.row + 8, roughMaxRow);
      for (let row = minRow; row <= maxRow; row++){
        if (atlas && typeof atlas.hasParent === 'function' && !atlas.hasParent(col, row)) continue;
        const p = { col, row };
        if (!bboxesTouch(rasterParentBounds(p, 0.75), bounds) && !(+col === +center.col && +row === +center.row)) continue;
        out.push(p);
      }
    }
    const maxTiles = rasterMaxVisibleTiles();
    if (out.length > maxTiles){
      out.sort((a, b) => rasterParentDistanceToView(a) - rasterParentDistanceToView(b));
      out.length = maxTiles;
    }
    out.sort((a, b) => (a.col - b.col) || (a.row - b.row));
    return out;
  }
  function evictRasterTile(key){
    const rec = state.rasterTiles.get(key);
    if (!rec) return;
    if (rec.blob && rec.url){ try { URL.revokeObjectURL(rec.url); } catch(_){} state.rasterPerf.blobUrls--; }
    state.rasterTiles.delete(key);
    state.rasterImageEls.delete(key);
    state.rasterPerf.evictions++;
  }
  function trimRasterTileCache(max){
    max = max || 36;
    while (state.rasterTiles.size > max){
      const first = state.rasterTiles.keys().next().value;
      if (first == null) break;
      evictRasterTile(first);
    }
  }
  function rasterCoverageHasParent(p){
    if (!p) return false;
    const k = `${p.col},${p.row}`;
    if (state.rasterParentKeys && state.rasterParentKeys.has(k)) return true;
    const rp = rasterParent();
    return !!rp && sameParent(p, rp);
  }
  function applyRasterModeVisibility(){
    if (!state.el.rasterBase) return;
    const on = !!state.rasterBase;
    state.el.rasterBase.style.display = on && state.el.rasterBase.childNodes.length ? '' : 'none';
    if (state.el.basemap){
      const baseChecked = !!(document.getElementById('gw-sx-toggle-map') || {}).checked;
      state.el.basemap.style.display = baseChecked ? '' : 'none';
    }
    // In raster mode, the generated tiles are the expensive visual base. Keep the
    // lightweight interactive layers alive, but hide the live terrain/path stacks.
    [state.el.gCells, state.el.gHaz, state.el.gParents, state.el.gAnnot].forEach(el => { if (el) el.style.display = on ? 'none' : ''; });
    // The fast layer is a drag-only live-mode layer. Raster mode does not need it,
    // and live mode should keep it hidden except during an active pan.
    if (state.el.gAnnotFast) state.el.gAnnotFast.style.display = 'none';
  }
  // Dirty tracking is per 30-mile parent: editing one marker or brushing a few
  // cells evicts only that parent's cached tiles instead of regenerating every
  // visible tile. '*' (bare markRasterDirty) still means "everything".
  function markRasterDirty(){ state.rasterDirtyParents.add('*'); }
  function markRasterDirtyParent(p){ if (p) state.rasterDirtyParents.add(`${p.col},${p.row}`); }
  function markRasterDirtyWorld(x, y){
    const d = D();
    if (!d || !d.svgToAxial || !d.ownerOf) return markRasterDirty();
    const a = d.svgToAxial(+x, +y);
    const o = d.ownerOf(a.Q, a.R);
    if (o) markRasterDirtyParent(o); else markRasterDirty();
  }
  function markRasterDirtyCells(cells){
    const d = D();
    if (!d || !d.ownerOf) return markRasterDirty();
    for (const c of (cells || [])) markRasterDirtyParent(d.ownerOf(c.Q, c.R));
  }
  function markRasterDirtyPts(pts){
    const d = D();
    if (!d || !d.svgToAxial || !d.ownerOf) return markRasterDirty();
    const mark = (x, y) => { const a = d.svgToAxial(x, y); markRasterDirtyParent(d.ownerOf(a.Q, a.R)); };
    const step = (d.HEX_R || 20) * 0.6;   // sparse spline waypoints can skip whole parents
    let prev = null;
    for (const p of (pts || [])){
      const x = +p[0], y = +p[1];
      if (prev){
        const len = Math.hypot(x - prev[0], y - prev[1]);
        for (let t = step; t < len; t += step) mark(prev[0] + (x - prev[0]) * t / len, prev[1] + (y - prev[1]) * t / len);
      }
      mark(x, y);
      prev = [x, y];
    }
  }
  function markRasterDirtySelMarker(){
    const m = state.markerSel && A() ? A().listMarkers().find(x => x.id === state.markerSel) : null;
    if (m) markRasterDirtyWorld(m.x, m.y); else markRasterDirty();
  }
  // Evict cached tiles for dirty parents (all size/label variants) so they
  // regenerate on demand — including offscreen tiles the old boolean flag
  // left stale after its one visible-tile pass.
  function flushRasterDirty(){
    const dirty = state.rasterDirtyParents;
    if (!dirty.size) return false;
    state.rasterPerf.flushes++;
    const all = dirty.has('*');
    for (const k of [...state.rasterTiles.keys()]){
      if (all || dirty.has(k.slice(0, k.indexOf('|')))) evictRasterTile(k);
    }
    dirty.clear();
    return true;
  }
  function renderRasterTile(p, force, ctx){
    const key = rasterTileKey(p, ctx);
    if (!force && state.rasterTiles.has(key)){
      const hit = state.rasterTiles.get(key);
      state.rasterTiles.delete(key); state.rasterTiles.set(key, hit);   // LRU touch
      state.rasterPerf.hits++;
      return hit;
    }
    if (state.rasterTiles.has(key)) evictRasterTile(key);
    state.rasterPerf.regens++;
    const result = window.GWSubhexTileRenderer.renderParent(p.col, p.row, {
      size: ctx.size,
      marginPx: 0,
      paddingWorld: 1.0,
      showStamp: false,
      showGrid: true,
      showRadiation: true,
      showMarkers: true,
      showLabels: ctx.labels,
      showAncientRoads: state.showAncientRoads,
      transparentBackground: true,
      showHidden: ctx.hidden,
      maxLabels: 18,
    });
    const b = result.displayBounds || result.imageWorldBounds || result.bounds;
    const rec = {
      col: p.col, row: p.row, key, size: ctx.size,
      bounds: { minX:+b.minX, minY:+b.minY, maxX:+b.maxX, maxY:+b.maxY },
      stats: result.stats || {},
      url: null, blob: false,
    };
    state.rasterTiles.set(key, rec);
    trimRasterTileCache(rasterTileCacheMax());
    // Encode off the sync path: toDataURL('image/webp') blocked the main
    // thread for every tile; toBlob encodes async and the object URL is
    // attached to the (reused) <image> node when it lands.
    const canvas = result.canvas;
    if (typeof canvas.toBlob === 'function'){
      state.rasterPerf.encoding++;
      canvas.toBlob(blob => {
        state.rasterPerf.encoding--;
        if (state.rasterTiles.get(key) !== rec) return;   // evicted/replaced meanwhile
        if (blob){ rec.url = URL.createObjectURL(blob); rec.blob = true; state.rasterPerf.blobUrls++; }
        else rec.url = canvas.toDataURL('image/webp', 0.9);
        const img = state.rasterImageEls.get(key);
        if (img){
          img.setAttribute('href', rec.url);
          img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', rec.url);
        }
        updateRasterDiag();
      }, 'image/webp', 0.9);
    } else {
      rec.url = canvas.toDataURL('image/webp', 0.9);
    }
    return rec;
  }
  function imageForRasterTile(rec){
    const b = rec.bounds;
    let img = state.rasterImageEls.get(rec.key);
    if (!img){
      img = document.createElementNS(SVGNS, 'image');
      img.setAttribute('preserveAspectRatio', 'none');
      state.rasterImageEls.set(rec.key, img);
    }
    img.setAttribute('x', b.minX);
    img.setAttribute('y', b.minY);
    img.setAttribute('width', b.maxX - b.minX);
    img.setAttribute('height', b.maxY - b.minY);
    img.setAttribute('data-parent', `${rec.col},${rec.row}`);
    img.setAttribute('data-size', rec.size);
    if (rec.url && img.getAttribute('href') !== rec.url){
      img.setAttribute('href', rec.url);
      img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', rec.url);
    }
    return img;
  }
  function updateRasterBase(force){
    if (!state.el.rasterBase) return null;
    if (!state.rasterBase){
      state.rasterKey = null;
      state.rasterParentKeys.clear();
      state.el.rasterBase.style.display = 'none';
      return null;
    }
    if (state.rasterBusy) return null;
    const wasDirty = flushRasterDirty();
    const center = rasterParent();
    const ctx = rasterViewContext();
    const parents = rasterNeighborParents(center);
    const key = rasterLayerKey(parents, ctx);
    if (!center || !parents.length || !window.GWSubhexTileRenderer || !key){
      state.rasterParentKeys.clear();
      state.el.rasterBase.replaceChildren();
      state.el.rasterBase.style.display = 'none';
      return null;
    }
    if (!force && !wasDirty && state.rasterKey === key && state.el.rasterBase.childNodes.length){
      applyRasterModeVisibility();
      return null;
    }
    state.rasterBusy = true;
    try {
      const frag = document.createDocumentFragment();
      const nextKeys = new Set();
      let totalCells = 0;
      let totalFragments = 0;
      for (const p of parents){
        const rec = renderRasterTile(p, force, ctx);
        frag.appendChild(imageForRasterTile(rec));
        nextKeys.add(`${p.col},${p.row}`);
        totalCells += +(rec.stats && rec.stats.cells || 0);
        totalFragments += +(rec.stats && rec.stats.fragments || 0);
      }
      state.el.rasterBase.replaceChildren(frag);
      state.rasterParentKeys = nextKeys;
      state.rasterKey = key;
      state.rasterStats = { parents: parents.length, cells: totalCells, fragments: totalFragments, size: ctx.size };
      updateRasterDiag();
      applyRasterModeVisibility();
      return { center, parents, cells: totalCells };
    } catch (err){
      state.rasterKey = null;
      state.rasterParentKeys.clear();
      state.rasterStats = null;
      state.rasterBase = false;
      saveRasterBaseVis(false);
      state.el.rasterBase.replaceChildren();
      state.el.rasterBase.style.display = 'none';
      setStatus('Raster tile failed: ' + (err && err.message ? err.message : err), 6000);
      updateRasterDiag();
      try { console.error('[gw-subhex-view] raster tile failed', err); } catch(_){}
      applyRasterModeVisibility();
      return null;
    } finally {
      state.rasterBusy = false;
    }
  }

  // Transient status line: raster stats, generation results, and errors get
  // their own channel with a single timer instead of hijacking the armed-mode
  // text through racing setTimeout(syncMode) restores.
  function setStatus(msg, ms){
    if (!state.el.status) return;
    if (state.statusTimer){ clearTimeout(state.statusTimer); state.statusTimer = 0; }
    state.el.status.textContent = msg || '';
    if (msg && ms !== 0){
      state.statusTimer = setTimeout(() => { state.statusTimer = 0; if (state.el.status) state.el.status.textContent = ''; }, ms || 2800);
    }
  }
  function updateRasterDiag(){
    if (!state.el.rdiag) return;
    const on = !!state.rasterBase;
    state.el.rdiag.classList.toggle('on', on);
    if (!on || !state.el.rdiagTxt) return;
    const st = state.rasterStats, pf = state.rasterPerf;
    const head = st ? `${st.parents}p·${st.size}px` : '—';
    const enc = pf.encoding ? ` · enc ${pf.encoding}` : '';
    state.el.rdiagTxt.textContent =
      `Raster ${head} · cache ${state.rasterTiles.size} · hit ${pf.hits}/gen ${pf.regens} · ev ${pf.evictions}/fl ${pf.flushes} · ${pf.blobUrls} blobs${enc}`;
    state.el.rdiagTxt.title = st
      ? `Raster layer: ${st.parents} visible parents · ${st.size}px tiles · ${st.cells} cells${st.fragments ? ` + ${st.fragments} seams` : ''}\ncache hits ${pf.hits} · regenerated ${pf.regens} · evicted ${pf.evictions} · dirty flushes ${pf.flushes}\n${pf.blobUrls} live blob URLs · ${pf.encoding} encodes pending`
      : '';
  }
  function rebuildRasterTiles(){
    markRasterDirty();
    if (state.rasterBase && state.open){
      updateRasterBase(false);
      renderRasterOverlays({ fog: true });
      setStatus('Raster tiles rebuilt');
    } else {
      flushRasterDirty();
      setStatus('Raster tile cache cleared');
    }
    updateRasterDiag();
  }

  function renderBounds(){
    const mx = state.vb.w * 0.4, my = state.vb.h * 0.4;
    return { minX: state.vb.x - mx, maxX: state.vb.x + state.vb.w + mx, minY: state.vb.y - my, maxY: state.vb.y + state.vb.h + my };
  }

  function bboxInside(inner, outer){
    return !!(inner && outer &&
      inner.minX >= outer.minX && inner.maxX <= outer.maxX &&
      inner.minY >= outer.minY && inner.maxY <= outer.maxY);
  }

  function renderRasterOverlays(opts){
    opts = opts || {};
    updateRasterDiag();
    applyRasterModeVisibility();
    if (opts.fog !== false) renderFog();
    renderParty();
    renderSelection();
    renderGenTarget();
    editorRender();
  }

  function renderRasterViewport(force){
    if (!state.open) return;
    const bbox = renderBounds();
    if (force || !bboxInside(bbox, state.rendered)) state.rendered = bbox;
    if (!state.rasterZooming){
      updateRasterBase(false);
      renderRasterOverlays({ fog: true });
    } else {
      // During active wheel zoom, do not rebuild tile coverage or fog. The SVG
      // viewBox scales existing raster images and overlays cheaply; heavyweight
      // work is deferred until the wheel has been quiet for a moment.
      renderRasterOverlays({ fog: false });
    }
  }

  function scheduleRasterIdleRefresh(){
    if (!state.rasterBase) return;
    state.rasterZooming = true;
    if (state.rasterIdleTimer) clearTimeout(state.rasterIdleTimer);
    state.rasterIdleTimer = setTimeout(() => {
      state.rasterIdleTimer = 0;
      state.rasterZooming = false;
      if (!state.open || !state.rasterBase) return;
      // Recompute coverage/overlays after zoom settles, but do not force cached
      // raster tiles to regenerate. Tile pixels are zoom-independent; forcing a
      // rebuild here caused sticky wheel zoom when many parent images were visible.
      state.rendered = null;
      renderRasterViewport(false);
    }, RASTER_ZOOM_IDLE_MS);
  }

  // ── viewBox + pan/zoom ─────────────────────────────────────────────────────
  function applyViewBox(){ const { x, y, w, h } = state.vb; state.el.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`); saveViewSoon(); }
  function scheduleViewBox(){
    if (state.viewRaf) return;
    state.viewRaf = requestAnimationFrame(() => {
      state.viewRaf = 0;
      applyViewBox();
    });
  }
  function pxW(){ const r = state.el.svg.getBoundingClientRect(); return r.width || 1; }
  function curU(){ return state.vb.w / pxW(); }       // world units per screen px
  function shouldShowFeatureLabels(){ return curU() <= FEATURE_LABEL_MAX_U; }
  function syncAspect(){ const r = state.el.svg.getBoundingClientRect(); if (r.width > 0 && r.height > 0) state.vb.h = state.vb.w * (r.height / r.width); }
  function centerOnParent(col, row, w){
    const c = D().parentSvgCenter(col, row);
    state.vb.w = (+w > 0) ? +w : 3 * 1.5 * D().HEX_R; syncAspect();
    state.vb.x = c.x - state.vb.w / 2; state.vb.y = c.y - state.vb.h / 2;
    applyViewBox(); render(true);
  }
  // Zoom clamps shared by wheel zoom and the public zoomTo.
  function viewWidthClamp(w){
    const minW = 1.5 * D().HEX_R * 0.6, maxW = 1.5 * D().HEX_R * 24;
    return Math.max(minW, Math.min(maxW, +w));
  }
  // Public navigation: center the viewport on a subhex (keeping zoom, or at an
  // explicit width) / set zoom about the view center. u = world units per
  // screen px, matching curU().
  function centerOn(Q, R, opts){
    if (!state.open || !D()) return;
    const c = D().subhexSvgCenter(+Q, +R);
    if (opts && +opts.w > 0){ state.vb.w = viewWidthClamp(+opts.w); syncAspect(); }
    state.vb.x = c.x - state.vb.w / 2; state.vb.y = c.y - state.vb.h / 2;
    state.rendered = null;
    applyViewBox(); render(true);
  }
  function zoomTo(u){
    if (!state.open || !(+u > 0)) return;
    const cx = state.vb.x + state.vb.w / 2, cy = state.vb.y + state.vb.h / 2;
    state.vb.w = viewWidthClamp(+u * pxW()); syncAspect();
    state.vb.x = cx - state.vb.w / 2; state.vb.y = cy - state.vb.h / 2;
    state.rendered = null;
    applyViewBox(); render(true);
  }
  function clientToWorld(ev){
    const r = state.el.svg.getBoundingClientRect();
    return { x: state.vb.x + (ev.clientX - r.left) / r.width * state.vb.w,
             y: state.vb.y + (ev.clientY - r.top) / r.height * state.vb.h };
  }
  function sameParent(a, b){ return !!(a && b && +a.col === +b.col && +a.row === +b.row); }
  function activeRasterParent(){ return state.rasterBase ? rasterParent() : null; }
  function cellOwner(Q, R){ const d = D(); return d && d.ownerOf ? d.ownerOf(Q, R) : null; }
  function cellInActiveRasterParent(Q, R){
    if (!state.rasterBase) return true;
    return rasterCoverageHasParent(cellOwner(Q, R));
  }
  function worldPointInActiveRasterParent(w){
    if (!state.rasterBase) return true;
    if (!w || !Number.isFinite(w.x) || !Number.isFinite(w.y)) return false;
    const a = D().svgToAxial(w.x, w.y);
    return cellInActiveRasterParent(a.Q, a.R);
  }
  function cellAt(ev, opts){
    const w = clientToWorld(ev); const a = D().svgToAxial(w.x, w.y);
    if (!(opts && opts.allowOutsideRaster) && state.rasterBase && !cellInActiveRasterParent(a.Q, a.R)) return null;
    return { Q: a.Q, R: a.R };
  }

  function wireViewport(svg){
    svg.addEventListener('mousedown', e => {
      if (e.button !== 0 && e.button !== 2) return;
      e.preventDefault();
      const a = state.armed;
      if (e.button === 0 && a){
        if ((a.type === 'paint' || a.type === 'erase' || a.type === 'hazard')){
          const cell = cellAt(e);
          if (cell){ state.brush = { set: new Set(), undo: [] }; svg.classList.add('painting'); paintCell(cell.Q, cell.R); return; }
        } else if (a.type === 'draw'){
          if (state.lineMode === 'freehand'){ startStroke(e); return; }
          const hit = editorHitDot(e);
          if (hit >= 0){ state.editor.dragIdx = hit; return; }
          const w = clientToWorld(e);
          if (!worldPointInActiveRasterParent(w)) return;
          state.drag = { r: svg.getBoundingClientRect(), sx: e.clientX, sy: e.clientY, vx: state.vb.x, vy: state.vb.y, moved: false, pointAdd: { x: w.x, y: w.y } };
          svg.classList.add('grabbing');
          return;
        }
        else if (a.type === 'marker'){ placeMarker(e); return; }
        else if (a.type === 'annot-erase'){ eraseAnnotationAt(e); return; }
        else if (a.type === 'annot-edit'){
          const m = markerAt(e);
          if (m){ selectMarker(m.id); state.markerDrag = { m, moved: false, ox: m.x, oy: m.y }; return; }
          closeMarkerEditor();   // clicked empty space — deselect, but allow panning
          state.drag = { r: svg.getBoundingClientRect(), sx: e.clientX, sy: e.clientY, vx: state.vb.x, vy: state.vb.y, moved: false };
          svg.classList.add('grabbing');
          return;
        }
        else if (a.type === 'party-place'){ const c = cellAt(e); if (c) placeParty(c.Q, c.R); return; }
        else if (a.type === 'party-move'){ const c = cellAt(e); if (c) movePartyToward(c.Q, c.R); return; }
      }
      state.drag = { r: svg.getBoundingClientRect(), sx: e.clientX, sy: e.clientY, vx: state.vb.x, vy: state.vb.y, moved: false, selCell: cellAt(e) };
      svg.classList.add('grabbing');
    });
    svg.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('mousemove', e => {
      if (state.markerDrag){
        const w = clientToWorld(e);
        if (!worldPointInActiveRasterParent(w)) return;
        state.markerDrag.m.x = w.x; state.markerDrag.m.y = w.y; state.markerDrag.moved = true;
        renderAnnotations(); return;
      }
      if (state.stroke){ extendStroke(e); return; }
      if (state.editor && state.editor.dragIdx != null){
        const w = clientToWorld(e);
        if (!worldPointInActiveRasterParent(w)) return;
        const p = state.snapHex ? snapPt(w) : w;
        state.editor.pts[state.editor.dragIdx] = [p.x, p.y]; editorRender(); return;
      }
      if (state.brush){ const c = cellAt(e); if (c) paintCell(c.Q, c.R); return; }
      if (!state.drag) return;
      const r = state.drag.r;
      const dx = (e.clientX - state.drag.sx) / r.width * state.vb.w;
      const dy = (e.clientY - state.drag.sy) / r.height * state.vb.h;
      if (!state.drag.moved && Math.abs(e.clientX - state.drag.sx) + Math.abs(e.clientY - state.drag.sy) > 3){
        state.drag.moved = true; state.el.panG.style.willChange = 'transform'; clearHover();
        // Drop only the priciest layers during the drag and restore on mouseup.
        // The lightweight fast annotation layer stays visible so roads, rivers,
        // trails, and point-of-interest dots remain useful while panning.
        state.el.gHaz.style.display = 'none'; state.el.gAnnot.style.display = 'none';
        state.fastAnnotDisp = state.el.gAnnotFast.style.display;
        state.el.gAnnotFast.style.display = state.rasterBase ? 'none' : '';
        state.basemapDisp = state.el.basemap.style.display;
        state.el.basemap.style.display = 'none';
      }
      state.drag.dx = dx; state.drag.dy = dy;
      schedulePan();
    });
    window.addEventListener('mouseup', () => {
      if (state.markerDrag){
        const md = state.markerDrag; state.markerDrag = null;
        if (md.moved){
          A().updateMarker(md.m.id, { x: md.m.x, y: md.m.y });   // persist once
          markRasterDirtyWorld(md.ox, md.oy); markRasterDirtyWorld(md.m.x, md.m.y);
        }
        renderAnnotations(); return;
      }
      if (state.editor && state.editor.dragIdx != null){ state.editor.dragIdx = null; return; }
      if (state.stroke){ commitStroke(); return; }
      if (state.brush){
        D().flushOverrides();
        if (state.brush.undo.length){ state.undoStack.push(state.brush.undo); if (state.undoStack.length > 30) state.undoStack.shift(); }
        const painted = [...state.brush.set].map(k => { const i = k.indexOf('_'); return { Q: +k.slice(0, i), R: +k.slice(i + 1) }; });
        state.brush = null; state.el.svg.classList.remove('painting');
        state.el.gPreview.replaceChildren(); state.previewMap = new Map();
        markRasterDirtyCells(painted); syncUndoBtn(); render(true); return;
      }
      if (!state.drag) return;
      const dr = state.drag; state.drag = null; state.el.svg.classList.remove('grabbing');
      if (state.panRaf){ cancelAnimationFrame(state.panRaf); state.panRaf = 0; }
      if (dr.pointAdd && !dr.moved){ editorAddPoint(dr.pointAdd); return; }
      if (dr.moved){
        state.vb.x = dr.vx - (dr.dx || 0); state.vb.y = dr.vy - (dr.dy || 0);
        state.el.panG.style.transform = ''; state.el.panG.style.willChange = '';
        applyViewBox();
        state.el.gHaz.style.display = ''; state.el.gAnnot.style.display = '';
        state.el.gAnnotFast.style.display = state.fastAnnotDisp == null ? 'none' : state.fastAnnotDisp;
        state.el.basemap.style.display = state.basemapDisp || '';
        if (state.rasterBase){
          renderRasterOverlays({ fog: true });
          scheduleRasterIdleRefresh();
        } else {
          render();
        }
        applyRasterModeVisibility();
      } else if (dr.selCell){
        selectCell(dr.selCell.Q, dr.selCell.R);
      }
    });
    svg.addEventListener('wheel', e => {
      if (!state.open || state.stroke) return;
      e.preventDefault();
      const wpt = clientToWorld(e);
      const factor = e.deltaY < 0 ? 1/1.2 : 1.2;
      let nw = viewWidthClamp(state.vb.w * factor);
      const k = nw / state.vb.w;
      state.vb.w = nw; state.vb.h *= k;
      state.vb.x = wpt.x - (wpt.x - state.vb.x) * k;
      state.vb.y = wpt.y - (wpt.y - state.vb.y) * k;
      if (state.rasterBase){
        scheduleViewBox();
        scheduleRasterIdleRefresh();
      } else {
        applyViewBox();
        scheduleRender();
      }
    }, { passive: false });
  }
  function scheduleRender(){ if (state.raf) return; state.raf = requestAnimationFrame(() => { state.raf = 0; render(); }); }
  function schedulePan(){
    if (state.panRaf || !state.drag) return;
    state.panRaf = requestAnimationFrame(() => {
      state.panRaf = 0;
      if (!state.drag) return;
      state.el.panG.style.transform = `translate3d(${state.drag.dx}px, ${state.drag.dy}px, 0)`;
    });
  }

  // ── render: cells + parents ────────────────────────────────────────────────
  function cornersStr(cx, cy, R){
    let s = '';
    for (let i = 0; i < 6; i++){ const a = (Math.PI/180)*(60*i); s += (i?' ':'') + (cx+R*Math.cos(a)).toFixed(3) + ',' + (cy+R*Math.sin(a)).toFixed(3); }
    return s;
  }
  function fillFor(d, sub){ return (d.TERRAIN[sub.terrain] || d.TERRAIN.unknown).fill; }
  // Per-subhex path memo: a cell's center is deterministic, so its "M…Z" subpath
  // never changes. Corner offsets are identical for every subhex at a given SUB_R,
  // so precompute them once (no trig per cell) and add to the center.
  const _pathCache = new Map();
  let _hexOff = null, _hexOffR = null;
  function hexOffsets(rad){
    if (_hexOff && _hexOffR === rad) return _hexOff;
    _hexOff = [];
    for (let i = 0; i < 6; i++){ const a = (Math.PI/180)*(60*i); _hexOff.push([rad*Math.cos(a), rad*Math.sin(a)]); }
    _hexOffR = rad; _pathCache.clear();
    return _hexOff;
  }
  function subhexPath(Q, R){
    const key = Q + ',' + R;
    const hit = _pathCache.get(key);
    if (hit !== undefined) return hit;
    const d = D(), c = d.subhexSvgCenter(Q, R), off = hexOffsets(d.SUB_R);
    let s = '';
    for (let i = 0; i < 6; i++){ s += (i ? 'L' : 'M') + (c.x + off[i][0]).toFixed(2) + ',' + (c.y + off[i][1]).toFixed(2) + ' '; }
    s += 'Z ';
    if (_pathCache.size > 300000) _pathCache.clear();   // soft cap, mirrors _terrainCache
    _pathCache.set(key, s);
    return s;
  }

  function render(force){
    if (!state.open) return;
    if (state.rasterBase){ renderRasterViewport(!!force); return; }
    const d = D();
    const bbox = renderBounds();
    if (!force && bboxInside(bbox, state.rendered)){
      applyRasterModeVisibility();
      renderAnnotations(); renderFog(); renderParty(); renderGenTarget();
      return;
    }
    state.rendered = bbox;

    const cells = d.cellsInAxialBbox(bbox);
    const ptCache = new Map(); const phCache = new Map(); const parentsSeen = new Map();
    const byColor = new Map();   // fill color -> array of hex subpaths
    const radD = [], authD = []; // radiation + authored-outline subpaths
    for (const { Q, R } of cells){
      const o = d.ownerOf(Q, R);
      let pt = null, ph = null;
      if (o){
        const pk = o.col + ',' + o.row;
        if (ptCache.has(pk)){ pt = ptCache.get(pk); ph = phCache.get(pk); }
        else { pt = d.parentTerrainOf(o.col, o.row); ph = d.parentHazardOf(o.col, o.row); ptCache.set(pk, pt); phCache.set(pk, ph); }
        if (state.showParents && !parentsSeen.has(pk)) parentsSeen.set(pk, o);
      }
      const sub = d.getSubhex(Q, R, pt, ph);
      const sp = subhexPath(Q, R);
      const color = fillFor(d, sub);
      let arr = byColor.get(color); if (!arr){ arr = []; byColor.set(color, arr); }
      arr.push(sp);
      if (sub.hazard === 'radiation') radD.push(sp);
      if (sub.source === 'authored') authD.push(sp);
    }
    // one <path> per terrain color, plus authored-outline + radiation paths
    const fragC = document.createDocumentFragment();
    for (const [color, parts] of byColor){
      const p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', parts.join('')); p.setAttribute('fill', color); p.setAttribute('class', 'gw-sx-cellpath');
      fragC.appendChild(p);
    }
    if (authD.length){ const ap = document.createElementNS(SVGNS, 'path'); ap.setAttribute('d', authD.join('')); ap.setAttribute('class', 'gw-sx-authpath'); fragC.appendChild(ap); }
    state.el.gCells.replaceChildren(fragC);
    if (radD.length){ const rp = document.createElementNS(SVGNS, 'path'); rp.setAttribute('d', radD.join('')); rp.setAttribute('class', 'gw-sx-rad'); state.el.gHaz.replaceChildren(rp); }
    else state.el.gHaz.replaceChildren();

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
    if (state.rasterBase) updateRasterBase(false);
    applyRasterModeVisibility();
    renderAnnotations();
    renderFog();
    renderParty();
    renderGenTarget();
  }
  // Highlight + label the parent that Generate/Clear-gen will act on (the parent
  // under the view center). Lets you target any parent without leaving subhex mode.
  function renderGenTarget(){
    const g = state.el.gTarget; if (!g) return;
    const p = targetParent();
    if (state.el.genTarget){
      state.el.genTarget.textContent = p
        ? (state.rasterBase ? `▸ raster center: parent ${p.col},${p.row}` : `▸ target: parent ${p.col},${p.row}`)
        : '▸ no parent centered';
    }
    const d = D();
    if (!p || !d || state.rasterBase){ g.replaceChildren(); return; }
    const c = d.parentSvgCenter(p.col, p.row);
    const poly = document.createElementNS(SVGNS, 'polygon');
    poly.setAttribute('points', cornersStr(c.x, c.y, d.HEX_R));
    poly.setAttribute('class', 'gw-sx-parent-target');
    g.replaceChildren(poly);
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
  function pathLine(dStr, color, width, dash, opacity){
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', dStr);
    p.setAttribute('class', 'gw-sx-line');
    p.setAttribute('stroke', color);
    p.setAttribute('stroke-width', width);
    if (dash) p.setAttribute('stroke-dasharray', dash);
    if (opacity != null) p.setAttribute('opacity', opacity);
    return p;
  }
  function lineEl(kind, dStr, custom){
    const st = STROKE_STYLE[kind] || STROKE_STYLE.pen;
    const width = (custom && custom.width) || st.width;
    if (kind === 'ancient-road'){
      const cond = (custom && custom.condition) || 'broken';
      const ast = ANCIENT_ROAD_STYLE[cond] || ANCIENT_ROAD_STYLE.broken;
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'gw-sx-ancient-road');
      g.setAttribute('data-condition', cond);
      const base = pathLine(dStr, 'rgba(34,25,18,.78)', Math.max(1, width + 1.6), null, Math.min(0.52, ast.opacity));
      const top = pathLine(dStr, (custom && custom.color) || ast.color || st.color, width, ast.dash || st.dash, ast.opacity);
      g.append(base, top);
      return g;
    }
    return pathLine(dStr, (custom && custom.color) || st.color, width, st.dash, null);
  }
  function setLineD(el, dStr){
    if (!el) return;
    if (el.tagName && el.tagName.toLowerCase() === 'path') el.setAttribute('d', dStr);
    else el.querySelectorAll && el.querySelectorAll('path').forEach(p => p.setAttribute('d', dStr));
  }
  function markerEl(kind, x, y, name, u, hidden, showLabel){
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
    } else if (kind === 'robot-farm'){
      const mech = '#3d6b57';                                   // Mech-Land: robot head + antenna
      add('rect', { x:x-r*0.6, y:y-r*0.45, width:r*1.2, height:r*1.0, rx:r*0.2, fill:'none', stroke:mech, 'stroke-width':2 });
      add('circle', { cx:x-r*0.25, cy:y, r:r*0.13, fill:mech });
      add('circle', { cx:x+r*0.25, cy:y, r:r*0.13, fill:mech });
      add('line', { x1:x, y1:y-r*0.45, x2:x, y2:y-r, stroke:mech, 'stroke-width':2 });
      add('circle', { cx:x, cy:y-r, r:r*0.14, fill:mech });
    } else if (kind === 'fortification'){
      const steel = '#4a5560';                                  // bastion / shield
      add('path', { d:`M ${x},${y-r} L ${x+r*0.8},${y-r*0.4} L ${x+r*0.8},${y+r*0.35} L ${x},${y+r} L ${x-r*0.8},${y+r*0.35} L ${x-r*0.8},${y-r*0.4} Z`, fill:'none', stroke:steel, 'stroke-width':2 });
      add('line', { x1:x, y1:y-r*0.45, x2:x, y2:y+r*0.55, stroke:steel, 'stroke-width':2 });
    } else if (kind === 'spaceport'){
      const tech = '#6a4a7a';                                   // rocket on a pad
      add('path', { d:`M ${x},${y-r} L ${x+r*0.34},${y+r*0.45} L ${x-r*0.34},${y+r*0.45} Z`, fill:'none', stroke:tech, 'stroke-width':2 });
      add('circle', { cx:x, cy:y-r*0.15, r:r*0.13, fill:tech });
      add('line', { x1:x-r*0.6, y1:y+r*0.7, x2:x+r*0.6, y2:y+r*0.7, stroke:tech, 'stroke-width':2 });
    } else if (kind === 'monastery'){
      const mon = '#5b5a8a';                                    // chapel: body, peaked roof, cross finial
      add('rect', { x:x-r*0.5, y:y, width:r*1.0, height:r*0.72, fill:'none', stroke:mon, 'stroke-width':2 });
      add('path', { d:`M ${x-r*0.66},${y} L ${x},${y-r*0.72} L ${x+r*0.66},${y} Z`, fill:'none', stroke:mon, 'stroke-width':2 });
      add('line', { x1:x, y1:y-r*0.72, x2:x, y2:y-r*1.18, stroke:mon, 'stroke-width':2 });
      add('line', { x1:x-r*0.22, y1:y-r*0.98, x2:x+r*0.22, y2:y-r*0.98, stroke:mon, 'stroke-width':2 });
    } else if (kind === 'installation'){
      const inst = '#2f7d8a';                                   // domed facility + antenna dish
      add('line', { x1:x-r*0.8, y1:y+r*0.45, x2:x+r*0.8, y2:y+r*0.45, stroke:inst, 'stroke-width':2 });
      add('path', { d:`M ${x-r*0.62},${y+r*0.45} A ${r*0.62},${r*0.62} 0 0 1 ${x+r*0.62},${y+r*0.45}`, fill:'none', stroke:inst, 'stroke-width':2 });
      add('line', { x1:x+r*0.32, y1:y-r*0.02, x2:x+r*0.55, y2:y-r*0.9, stroke:inst, 'stroke-width':1.5 });
      add('circle', { cx:x+r*0.55, cy:y-r*0.9, r:r*0.14, fill:inst });
    } else { // town (default)
      add('circle', { cx:x, cy:y, r:r*0.85, fill:'none', stroke:ink, 'stroke-width':2 });
      add('rect', { x:x-r*0.42, y:y-r*0.42, width:r*0.84, height:r*0.84, fill:ink });
    }
    if (hidden){
      add('circle', { cx:x, cy:y, r:r*1.55, fill:'none', stroke:'#ff5252', 'stroke-width':1.4, 'stroke-dasharray':`${r*0.5} ${r*0.34}` });
    }
    if (name && showLabel){
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
  function markerFastEl(m, u){
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('cx', m.x); c.setAttribute('cy', m.y); c.setAttribute('r', Math.max(2.2 * u, ICON_PX * 0.34 * u));
    c.setAttribute('class', 'gw-sx-fast-marker' + (m.hidden ? ' hidden' : ''));
    return c;
  }
  function renderAnnotations(){
    if (!A() || !state.el.gAnnot || !state.el.gAnnotFast) return;
    if (state.rasterBase && state.rasterDirtyParents.size) updateRasterBase(false);
    const u = curU();
    const bb = state.rendered || { minX: state.vb.x, maxX: state.vb.x+state.vb.w, minY: state.vb.y, maxY: state.vb.y+state.vb.h };
    const markerBb = { minX: bb.minX - 50*u, maxX: bb.maxX + 50*u, minY: bb.minY - 50*u, maxY: bb.maxY + 50*u };
    const frag = document.createDocumentFragment();
    const fastFrag = document.createDocumentFragment();
    for (const s of A().strokesInBbox(bb, ICON_PX*u)){
      if (s.kind === 'ancient-road' && !state.showAncientRoads) continue;
      const path = smoothPath(s.pts);
      frag.appendChild(lineEl(s.kind, path, { color: s.color, width: s.width, condition: s.condition }));
      fastFrag.appendChild(lineEl(s.kind, path, { color: s.color, condition: s.condition, width: Math.max(1.4 * u, (s.width || (STROKE_STYLE[s.kind] || STROKE_STYLE.pen).width) * 0.85) }));
    }
    const showLabels = shouldShowFeatureLabels();
    for (const m of A().markersInBbox(markerBb)){
      frag.appendChild(markerEl(m.kind, m.x, m.y, m.name, u, m.hidden, showLabels));
      fastFrag.appendChild(markerFastEl(m, u));
      if (state.markerSel === m.id) frag.appendChild(markerSelRing(m.x, m.y, u));
    }
    state.el.gAnnot.replaceChildren(frag);
    state.el.gAnnotFast.replaceChildren(fastFrag);
    applyRasterModeVisibility();
    editorRender();
  }

  // ── freehand capture ───────────────────────────────────────────────────────
  function strokePersistOpts(kind, width, src){
    const opts = { width };
    if (kind === 'ancient-road'){
      opts.condition = (src && src.condition) || state.ancientRoadCondition || 'broken';
      if (src && src.roadName) opts.roadName = src.roadName;
      if (src && src.ancientName) opts.ancientName = src.ancientName;
      if (src && src.source) opts.source = src.source;
    }
    return opts;
  }
  function startStroke(e){
    const w = clientToWorld(e);
    if (!worldPointInActiveRasterParent(w)) return;
    state.stroke = { kind: state.armed.kind, pts: [[w.x, w.y]], condition: state.armed.kind === 'ancient-road' ? state.ancientRoadCondition : undefined };
    state.el.svg.classList.add('painting');
    const el = lineEl(state.stroke.kind, '', { width: state.lineWidth, condition: state.stroke.condition });
    el.id = 'gw-sx-preview';
    state.el.gAnnot.appendChild(el);
    state.stroke.el = el;
  }
  function extendStroke(e){
    if (!state.stroke) return;
    const w = clientToWorld(e);
    if (!worldPointInActiveRasterParent(w)) return;
    const pts = state.stroke.pts, last = pts[pts.length-1];
    const minW = SAMPLE_PX * curU();
    if (Math.hypot(w.x - last[0], w.y - last[1]) < minW) return;
    pts.push([w.x, w.y]);
    setLineD(state.stroke.el, smoothPath(pts));
  }
  function commitStroke(){
    const st = state.stroke; state.stroke = null;
    state.el.svg.classList.remove('painting');
    if (st && st.el && st.el.parentNode) st.el.parentNode.removeChild(st.el);
    if (st && st.pts.length >= 2){ A().addStroke(st.kind, st.pts, strokePersistOpts(st.kind, state.lineWidth, st)); markRasterDirtyPts(st.pts); renderAnnotations(); }
  }

  // ── spline waypoint editor (points mode) ────────────────────────────────────
  function snapPt(w){
    const d = D(); const a = d.svgToAxial(w.x, w.y);
    if (state.rasterBase && !cellInActiveRasterParent(a.Q, a.R)) return w;
    return d.subhexSvgCenter(a.Q, a.R);
  }
  function editorHitDot(e){
    if (!state.editor) return -1;
    const w = clientToWorld(e), hitR = 7 * curU(), pts = state.editor.pts;
    for (let i = 0; i < pts.length; i++){ if (Math.hypot(w.x - pts[i][0], w.y - pts[i][1]) < hitR) return i; }
    return -1;
  }
  function nearestStrokeAt(w){
    const thr = 6 * curU(); let best = null, bd = thr;
    for (const s of A().listStrokes()){
      for (let i = 0; i < s.pts.length - 1; i++){
        if (s.kind === 'ancient-road' && !state.showAncientRoads) continue;
        const d = distToSeg(w.x, w.y, s.pts[i][0], s.pts[i][1], s.pts[i+1][0], s.pts[i+1][1]);
        if (d <= bd){ bd = d; best = s; }
      }
    }
    return best;
  }
  function editorAddPoint(p0){
    if (!state.editor && (!state.armed || state.armed.type !== 'draw')) return;
    if (!worldPointInActiveRasterParent(p0)) return;
    const p = state.snapHex ? snapPt(p0) : p0;
    if (!state.editor){
      const s = nearestStrokeAt(p0);
      if (s){ loadStrokeForEdit(s); return; }
      state.editor = { kind: state.armed.kind, pts: [], width: state.lineWidth, condition: state.armed.kind === 'ancient-road' ? state.ancientRoadCondition : undefined, editingId: null, origPts: null, dragIdx: null };
    }
    state.editor.pts.push([p.x, p.y]);
    editorRender(); syncEditBtns(); syncMode();
  }
  function loadStrokeForEdit(s){
    state.editor = {
      kind: s.kind, pts: s.pts.map(p => [p[0], p[1]]),
      width: s.width || (STROKE_STYLE[s.kind] || STROKE_STYLE.pen).width,
      condition: s.condition, roadName: s.roadName, ancientName: s.ancientName, source: s.source,
      editingId: s.id, origPts: s.pts.map(p => [p[0], p[1]]), dragIdx: null,
    };
    if (s.kind === 'ancient-road'){
      state.ancientRoadCondition = s.condition || 'broken';
      if (state.el.ancientConditionSel) state.el.ancientConditionSel.value = state.ancientRoadCondition;
    }
    A().deleteStroke(s.id);
    markRasterDirtyPts(s.pts); renderAnnotations(); editorRender(); syncEditBtns(); syncMode();
  }
  function editorRemoveLast(){ if (state.editor && state.editor.pts.length){ state.editor.pts.pop(); editorRender(); syncEditBtns(); syncMode(); } }
  function finishEditor(){
    const ed = state.editor; if (!ed) return;
    state.editor = null;
    if (ed.pts.length >= 2){ A().addStroke(ed.kind, ed.pts, strokePersistOpts(ed.kind, ed.width, ed)); markRasterDirtyPts(ed.pts); }
    editorRender(); renderAnnotations(); syncEditBtns(); syncMode();
  }
  function cancelEditor(){
    const ed = state.editor; if (!ed) return;
    state.editor = null;
    if (ed.editingId && ed.origPts && ed.origPts.length >= 2){ A().addStroke(ed.kind, ed.origPts, strokePersistOpts(ed.kind, ed.width, ed)); markRasterDirtyPts(ed.origPts); }
    editorRender(); renderAnnotations(); syncEditBtns(); syncMode();
  }
  function editorRender(){
    const g = state.el.gEditor; if (!g) return;
    g.replaceChildren();
    const ed = state.editor; if (!ed || !ed.pts.length) return;
    const u = curU();
    if (ed.pts.length >= 2) g.appendChild(lineEl(ed.kind, smoothPath(ed.pts), { width: ed.width, condition: ed.condition }));
    ed.pts.forEach((p, i) => {
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]); c.setAttribute('r', 4 * u);
      c.setAttribute('fill', i === 0 ? '#ffe9c0' : '#ffffff');
      c.setAttribute('stroke', '#5a3a0a'); c.setAttribute('stroke-width', 1.2);
      c.setAttribute('vector-effect', 'non-scaling-stroke');
      g.appendChild(c);
    });
  }
  function syncEditBtns(){
    if (state.el.finBtn) state.el.finBtn.disabled = !(state.editor && state.editor.pts.length >= 2);
    if (state.el.canBtn) state.el.canBtn.disabled = !state.editor;
  }
  function onEditorKey(e){
    if (!state.open) return;
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (state.editor){
      if (e.key === 'Enter'){ e.preventDefault(); finishEditor(); }
      else if (e.key === 'Escape'){ e.preventDefault(); cancelEditor(); }
      else if (e.key === 'Backspace'){ e.preventDefault(); editorRemoveLast(); }
      return;
    }
    if (e.key === 'Escape'){
      // No active spline editor: Esc backs out of whatever is engaged —
      // marker editor first, then the armed tool.
      if (state.markerSel || (state.el.medit && state.el.medit.classList.contains('show'))){ e.preventDefault(); closeMarkerEditor(); return; }
      if (state.armed){ e.preventDefault(); state.armed = null; syncPalette(); syncMode(); }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')){
      if (state.undoStack.length){ e.preventDefault(); undo(); }
    }
  }

  // ── markers + erase ────────────────────────────────────────────────────────
  function placeMarker(e){
    const w = clientToWorld(e);
    if (!worldPointInActiveRasterParent(w)) return;
    let name = '';
    if (e.shiftKey){ try { name = window.prompt('Settlement name (optional):', '') || ''; } catch(_){} }
    A().addMarker(state.armed.kind, w.x, w.y, name ? { name } : null);
    markRasterDirtyWorld(w.x, w.y); renderAnnotations();
  }
  function distToSeg(px, py, ax, ay, bx, by){
    const dx = bx-ax, dy = by-ay; const l2 = dx*dx + dy*dy;
    let t = l2 ? ((px-ax)*dx + (py-ay)*dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    const cx = ax + t*dx, cy = ay + t*dy;
    return Math.hypot(px-cx, py-cy);
  }
  function markerAt(e){
    const w = clientToWorld(e), u = curU(), r = ICON_PX * u * 1.5;
    if (!worldPointInActiveRasterParent(w)) return null;
    let best = null, bd = r;
    for (const m of A().listMarkers()){ const dd = Math.hypot(w.x - m.x, w.y - m.y); if (dd <= bd){ bd = dd; best = m; } }
    return best;
  }
  function markerSelRing(x, y, u){
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', ICON_PX * u * 1.6);
    c.setAttribute('class', 'gw-sx-marker-sel');
    return c;
  }
  function selectMarker(id){
    const m = A().listMarkers().find(x => x.id === id); if (!m) return;
    state.markerSel = id;
    state.el.medName.value = m.name || '';
    state.el.medKind.value = m.kind;
    state.el.medHidden.checked = !!m.hidden;
    state.el.medit.classList.add('show');
    renderDossier();
    renderAnnotations();
  }
  function renderDossier(){
    const box = state.el.medDossier; if (!box) return;
    const id = state.markerSel;
    const m = (id && A()) ? A().listMarkers().find(x => x.id === id) : null;
    if (!m || !window.GWStock || !D()){ box.innerHTML = ''; box.style.display = 'none'; return; }
    const a = D().svgToAxial(m.x, m.y);
    let terrain = null, hazard = null;
    try { const sub = D().getSubhexAt(a.Q, a.R); if (sub){ terrain = sub.terrain; hazard = sub.hazard; } } catch (_){}
    const dos = window.GWStock.dossierFor(m.kind, a.Q, a.R, { terrain, hazard, name: m.name });
    if (!dos || !dos.lines || !dos.lines.length){ box.innerHTML = ''; box.style.display = 'none'; return; }
    const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    box.innerHTML = '<div class="sx-dos-h">DOSSIER</div>' +
      dos.lines.map(([k, v]) => '<div class="sx-dos-row"><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>').join('');
    box.style.display = '';
  }
  function closeMarkerEditor(){
    if (!state.markerSel && !(state.el.medit && state.el.medit.classList.contains('show'))) return;
    state.markerSel = null;
    if (state.el.medit) state.el.medit.classList.remove('show');
    renderAnnotations();
  }
  function eraseAnnotationAt(e){
    const w = clientToWorld(e), u = curU();
    if (!worldPointInActiveRasterParent(w)) return;
    const bestM = markerAt(e);                       // markers first
    if (bestM){ markRasterDirtyWorld(bestM.x, bestM.y); A().deleteMarker(bestM.id); renderAnnotations(); return; }
    // then strokes
    const thr = 6 * u;
    let bestS = null, bestSD = thr;
    for (const s of A().listStrokes()){
      for (let i = 0; i < s.pts.length-1; i++){
        if (s.kind === 'ancient-road' && !state.showAncientRoads) continue;
        const d = distToSeg(w.x, w.y, s.pts[i][0], s.pts[i][1], s.pts[i+1][0], s.pts[i+1][1]);
        if (d <= bestSD){ bestSD = d; bestS = s; }
      }
    }
    if (bestS){ markRasterDirtyPts(bestS.pts); A().deleteStroke(bestS.id); renderAnnotations(); }
  }

  // ── terrain + hazard paint ──────────────────────────────────────────────────
  // Base map is merged paths (cheap to pan); during a brush stroke each painted
  // cell is drawn into a small preview layer for instant feedback, then folded
  // back into the merged paths by a single render(true) on mouseup.
  function paintCell(Q, R){
    if (!state.brush || !state.armed) return;
    if (state.rasterBase && !cellInActiveRasterParent(Q, R)) return;
    const key = Q + '_' + R; if (state.brush.set.has(key)) return; state.brush.set.add(key);
    const d = D(); const before = d.peekOverride(Q, R);
    state.brush.undo.push({ Q, R, before: before ? JSON.parse(JSON.stringify(before)) : null });
    const a = state.armed;
    if (a.type === 'hazard'){
      if (a.mode === 'radiation') d.setSubhexHazard(Q, R, 'radiation', { deferSave: true });
      else { const o = d.ownerOf(Q, R); const ph = o ? d.parentHazardOf(o.col, o.row) : null; d.setSubhexHazard(Q, R, ph === 'radiation' ? 'none' : 'inherit', { deferSave: true }); }
    } else if (a.type === 'erase'){ d.clearSubhexTerrain(Q, R, { deferSave: true }); }
    else d.setSubhexTerrain(Q, R, a.terrain, { deferSave: true });
    previewCell(Q, R);
  }
  function previewCell(Q, R){
    const d = D(); const key = Q + '_' + R;
    const old = state.previewMap.get(key); if (old) old.forEach(el => el.remove());
    const sub = d.getSubhexAt(Q, R);
    const c = d.subhexSvgCenter(Q, R); const pts = cornersStr(c.x, c.y, d.SUB_R);
    const els = [];
    const mk = cls => { const p = document.createElementNS(SVGNS, 'polygon'); p.setAttribute('points', pts); p.setAttribute('class', cls); p.setAttribute('pointer-events', 'none'); state.el.gPreview.appendChild(p); els.push(p); return p; };
    const fill = mk('gw-sx-cellpath'); fill.setAttribute('fill', fillFor(d, sub));
    if (sub.hazard === 'radiation') mk('gw-sx-rad');
    if (sub.source === 'authored') mk('gw-sx-authpath');
    state.previewMap.set(key, els);
  }
  function undo(){
    const stroke = state.undoStack.pop(); if (!stroke){ syncUndoBtn(); return; }
    const d = D(); for (const { Q, R, before } of stroke) d.restoreOverride(Q, R, before);
    markRasterDirtyCells(stroke); syncUndoBtn(); render(true);
  }
  function syncUndoBtn(){ if (state.el.undoBtn) state.el.undoBtn.disabled = state.undoStack.length === 0; }

  // ── arming ───────────────────────────────────────────────────────────────
  function armKey(a){
    if (!a) return null;
    if (a.type === 'erase') return 'erase';
    if (a.type === 'annot-erase') return 'annot-erase';
    if (a.type === 'annot-edit') return 'annot-edit';
    if (a.type === 'paint') return 'paint:' + a.terrain;
    if (a.type === 'hazard') return 'hazard:' + a.mode;
    if (a.type === 'draw') return 'draw:' + a.kind;
    if (a.type === 'marker') return 'marker:' + a.kind;
    if (a.type === 'party-place') return 'party-place';
    if (a.type === 'party-move') return 'party-move';
    return null;
  }
  function arm(spec){
    if (state.editor) finishEditor();
    closeMarkerEditor();
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
    else if (a.type === 'hazard') el.textContent = a.mode === 'radiation' ? 'Paint radiation · drag to brush' : 'Clear radiation · drag to brush';
    else if (a.type === 'draw'){
      const name = a.kind === 'ancient-road' ? `ancient road (${state.ancientRoadCondition || 'broken'})` : a.kind;
      if (state.lineMode === 'freehand') el.textContent = `Draw ${name} · drag to trace`;
      else if (state.editor && state.editor.pts.length) el.textContent = `${name}: click=add · drag dot=move · Enter=finish · Esc=cancel`;
      else el.textContent = `Draw ${name} · click to add points (or click a line to edit)`;
    }
    else if (a.type === 'marker') el.textContent = `Place ${a.kind} · click (shift = name)`;
    else if (a.type === 'annot-erase') el.textContent = 'Erase feature · click a line/icon';
    else if (a.type === 'annot-edit') el.textContent = 'Edit feature · click an icon (then drag to move)';
    else if (a.type === 'party-place') el.textContent = 'Place party · click any hex (GM, no time)';
    else if (a.type === 'party-move') el.textContent = 'Move party · click a hex to step toward it';
  }

  // ── hover readout ──────────────────────────────────────────────────────────
  function clearHover(){ state.hoverKey = null; if (state.el.gHover) state.el.gHover.replaceChildren(); }
  function bindCellHover(svg){
    svg.addEventListener('mousemove', e => {
      if (state.brush || state.stroke || state.drag || state.markerDrag){ return; }
      const cell = cellAt(e);
      if (!cell){
        if (state.hoverKey !== null){ clearHover(); }
        if (state.rasterBase && state.el.readBody) state.el.readBody.innerHTML = '— outside raster tile neighborhood —';
        return;
      }
      const key = cell.Q + '_' + cell.R;
      if (state.hoverKey === key) return;
      state.hoverKey = key;
      const d = D(); const c = d.subhexSvgCenter(cell.Q, cell.R);
      const p = document.createElementNS(SVGNS, 'polygon');
      p.setAttribute('points', cornersStr(c.x, c.y, d.SUB_R));
      p.setAttribute('class', 'gw-sx-hover');
      state.el.gHover.replaceChildren(p);
      showReadout(cell.Q, cell.R);
    });
  }
  function showReadout(Q, R){
    const d = D(); const o = d.ownerOf(Q, R);
    const pt = o ? d.parentTerrainOf(o.col, o.row) : null, ph = o ? d.parentHazardOf(o.col, o.row) : null;
    const sub = d.getSubhex(Q, R, pt, ph);
    const tlabel = (d.TERRAIN[sub.terrain] || d.TERRAIN.unknown).label;
    const owner = o ? `parent ${o.col},${o.row}` : 'unowned';
    const rad = sub.hazard === 'radiation' ? ' <span style="color:#c3f037">☢ radiation</span>' : '';
    state.el.readBody.innerHTML = `Q,R ${Q},${R} · ${owner}<br>${tlabel} <span style="color:#888">(${sub.source})</span>${rad}`;
  }

  // ── public API ─────────────────────────────────────────────────────────────
  function open(col, row){
    if (!D()){ console.warn('[gw-subhex-view] GWSubhexData not loaded'); return; }
    ensureDom();
    state.open = true; state.curParent = { col, row };
    state.el.overlay.classList.add('open');
    if (state.el.enc) state.el.enc.classList.remove('show');
    clearSelection();
    closeMarkerEditor();
    loadPartyState();
    if (state.el.fogCb) state.el.fogCb.checked = state.fogOn;
    renderClock();
    syncPartyUndoBtn();
    state.el.title.textContent = `Subhex · parent ${col},${row} · 3 mi/hex`;
    requestAnimationFrame(() => {
      state.rendered = null;
      const v = loadView();
      if (v){
        state.vb.x = v.x; state.vb.y = v.y; state.vb.w = v.w; syncAspect();
        const c = centerParent();
        if (c && sameParent(c, { col, row })){
          // Reopening the parent you were in: resume the exact viewport.
          applyViewBox(); render(true);
          return;
        }
        // Different parent: center there, but keep your accustomed zoom.
        centerOnParent(col, row, v.w);
        return;
      }
      centerOnParent(col, row);
    });
  }
  function close(){
    if (state.editor) finishEditor();
    if (state.viewSaveTimer){ clearTimeout(state.viewSaveTimer); state.viewSaveTimer = 0;
      try { localStorage.setItem(VIEW_KEY, JSON.stringify({ x: state.vb.x, y: state.vb.y, w: state.vb.w })); } catch(_){} }
    if (state.rasterIdleTimer){ clearTimeout(state.rasterIdleTimer); state.rasterIdleTimer = 0; }
    if (state.viewRaf){ cancelAnimationFrame(state.viewRaf); state.viewRaf = 0; }
    state.rasterZooming = false;
    state.open = false;
    if (state.el.overlay) state.el.overlay.classList.remove('open');
  }
  function isOpen(){ return state.open; }
  function currentParent(){ return state.curParent || null; }

  window.GWSubhexView = { open, close, isOpen, currentParent, render, centerOn, zoomTo, rebuildRasterTiles };
  try { console.log('[gw-subhex-view] v0.45.0 loaded'); } catch(_){}
})();
