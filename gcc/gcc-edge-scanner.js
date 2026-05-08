// gcc-edge-scanner.js v0.5.5 — 2026-05-03
// v0.5.5 — Per-mode sample strategy. samplePixels (plural) returns
//          all individual RGBs in the sampling window; scanParent
//          dispatches on mode.sampleStrategy ('average' | 'any-water').
//          'any-water' classifies each pixel and declares the cell
//          water if any pixel passes — needed for thin river
//          detection that 5×5 averaging loses.
// v0.5.4 — applyResults accepts opts.deferFlush so batch callers
//          (Edges Run-scans) can skip the per-parent flush and
//          flush once at end of batch. Pairs with putBatch in
//          gcc-subhex-store v0.2.0: drops 1128 IDB transactions
//          per full-coastline run to 1.
// v0.5.3 — applyResults passes mode.source through to
//          setSubhexOverride so writes are tagged with provenance
//          (e.g. 'scanner-coast-v1', 'scanner-river-v1') instead
//          of being indistinguishable from hand-authoring. Pairs
//          with gcc-subhex-data v2.7.0 source-field support.
// v0.5.2 — pass-2b honors mode.resolveAmbiguous='direct-only' to
//          skip neighbor-majority resolution (needed for River).
// v0.5.1 — deleted bulk-scan code path entirely.
// v0.5.0 — rename + factor classifier into mode object (slice 1).
// Renamed + factored from gcc-coast-scanner.js v0.4.6 as the slice-1
// step toward the generalized "Edges" scanner. The pipeline (sample
// pixel → classify → off-image abort gate → pass-2 neighbor
// majority → parent-prior fallback → variant-write decision → apply)
// is unchanged; what's new is that the per-pixel classifier and the
// variant-name resolver now live in a mode object loaded from
// gcc-edge-modes.js. scanParent / applyResults read the mode out of
// opts.mode, defaulting to GCCEdgeModes.coast — so the existing
// Coast button + dialog keep working as the manual single-parent
// override.
//
// Slices remaining in the Edges plan:
//   3 — toolbar Edges button + parent-map paint mode + Run-scans
//       panel (operates on a flagged-parents set, gcc-edge-flags).
//   4 — Coast classifier polish in the new pluggable form.
//   5 — Forest classifier on the overlay axis (validates the
//       terrain-vs-overlay two-axis model; introduces the new
//       overlay slot to subhex schema).
//   6 — River + Jungle.
//
// Slice history:
//   1 (v0.5.0) — rename, factor classifier into mode object.
//   2 (v0.5.1) — delete bulk-scan code path entirely
//                (collectParents, scanBulkAsync, applyBulk, undoBulk,
//                openBulkDialog and the dialog's "Bulk scan ▸" link).
//                The Coast button is now selection-required.
//
// External callers reach this module through window.GCCEdgeScanner
// (renamed from GCCCoastScanner — no other JS file referenced the
// old global). The toolbar button id #btn-coast-scan is unchanged
// in this slice; slice 3 adds #btn-edges separately.
//
// History before the rename: see gcc-coast-scanner.js v0.1.0–v0.4.6
// commit messages (water/coast detection by HSV threshold; off-image
// abort gate; iterative neighbor-majority resolution; redundancy
// skip on water-in-water-parent and land-in-land-parent writes).
//
// Coordinate flow:
//   subhex (Q,R) ──subhexSvgCenter──> world SVG (x,y)
//   world SVG (x,y) ──invert imgX──> image pixel (px,py)
//   image pixel ──canvas getImageData──> RGB
//   RGB ──mode.classify──> 'water' | 'land' | 'ambiguous'
//
// Public API:
//   GCCEdgeScanner.openPreview(col, row)
//     Open the single-parent preview/apply dialog (Coast-mode-locked
//     in this slice; slice 5 generalizes it to render mode.sliderSchema).
//
//   GCCEdgeScanner.scanParent(col, row, opts) → { results, summary }
//     Headless scan. opts.mode = mode object (default Coast).
//     opts.threshold / opts.landThreshold override the mode's
//     defaults. Result entries carry { Q, R, classification,
//     resolution, isWater, terrain, alreadyAuthored }.
//
//   GCCEdgeScanner.applyResults(results, opts) → { written, skipped, ... }
//     Write the override for every result whose terrain is set.
(function(){
  'use strict';

  // ── Mode binding ────────────────────────────────────────────────────
  // The per-pixel classifier, threshold defaults, variant-name
  // resolver, and source tag come from the active mode. For slice 1
  // there is exactly one mode (Coast); modes.js loads first via its
  // script tag. The DEFAULT_THRESHOLDS / DEFAULT_LAND_THRESHOLDS /
  // SOURCE_TAG aliases below are kept so the Coast-mode-locked
  // preview dialog (template literals reading hMin/hMax/sMin/etc.)
  // doesn't need to be rewritten in this slice. Slice 5 will
  // generalize the dialog to read mode.sliderSchema instead.
  function _mode(){
    return (window.GCCEdgeModes && window.GCCEdgeModes.coast) || null;
  }
  function _resolveMode(opts){
    return (opts && opts.mode) || _mode();
  }
  // Lazy getters — modes.js may not have run yet at script-parse
  // time on slow loads. We grab the values on first use rather than
  // at IIFE-eval time. This keeps a stale destructure from holding
  // an undefined value if module-load order ever shifts.
  function _coastDefaults(){
    const m = _mode();
    return m ? m.defaultThreshold : null;
  }
  function _coastLandDefaults(){
    const m = _mode();
    return m ? m.defaultLandThreshold : null;
  }
  // Back-compat aliases referenced by the preview-dialog template
  // literals further down. Resolved at scanner-script-eval time —
  // modes.js's IIFE has run by then because its <script> tag
  // precedes this one.
  const DEFAULT_THRESHOLDS      = _coastDefaults()     || { hMin:180, hMax:240, sMin:0.015, sMax:1, vMin:0.30, vMax:0.99 };
  const DEFAULT_LAND_THRESHOLDS = _coastLandDefaults() || { hMin:20,  hMax:110, sMin:0.15,  sMax:1, vMin:0.10, vMax:0.92 };
  const SAMPLE_RADIUS_PX = 2;     // average over a (2r+1)x(2r+1) window
  const SOURCE_TAG = (_mode() && _mode().source) || 'scanner-coast-v1';


  // ── Internal canvas (cached) ────────────────────────────────────────
  // We draw the Darlene image into a canvas at natural size once, then
  // sample from it for as many parents as needed. Re-draws if the image
  // src changes (rare). The canvas is hidden — never inserted into DOM.
  let _canvas = null, _ctx = null, _imgSrc = null, _imgNW = 0, _imgNH = 0;
  function ensureCanvas(){
    const img = document.getElementById('map-img');
    if (!img || !img.naturalWidth) return null;
    if (_canvas && _imgSrc === img.src && _imgNW === img.naturalWidth) return _ctx;
    _canvas = document.createElement('canvas');
    _canvas.width  = img.naturalWidth;
    _canvas.height = img.naturalHeight;
    _ctx = _canvas.getContext('2d', { willReadFrequently: true });
    _ctx.drawImage(img, 0, 0);
    _imgSrc = img.src;
    _imgNW = img.naturalWidth;
    _imgNH = img.naturalHeight;
    return _ctx;
  }

  // ── Coordinate transforms ───────────────────────────────────────────
  // World SVG (wx, wy) → image natural pixel.
  //
  // Geometry of greyhawk-map.html (verified empirically against
  // a live probe at D4-86 / col=64,row=44):
  //   - hexCenter() returns "map coords" where (0,0) = col 0 left edge
  //     = the image's CSS top-left corner. So world (0,0) corresponds
  //     to image-CSS-box (0,0). No stageBounds offset enters here —
  //     the image's stage offset (-stageBounds.minX, -stageBounds.minY)
  //     just shifts the image inside the stage; map coords already
  //     start at the image's top-left.
  //   - Image's CSS box is MAP_W × MAP_H; natural pixels are
  //     naturalWidth × naturalHeight.
  //   - imgX transform: translate(tx,ty) rotate(rot°) scale(sx,sy)
  //     around CSS box center (MAP_W/2, MAP_H/2).
  //
  // Forward chain (image-box pixel → world):
  //   centered = (ibX - MAP_W/2, ibY - MAP_H/2)
  //   scaled   = (sx * cx,       sy * cy)
  //   rotated  = (rotate(scaled by rot°))
  //   world    = (rotated.x + MAP_W/2 + tx, rotated.y + MAP_H/2 + ty)
  // Inverse: subtract translate, un-center, un-rotate, un-scale, re-center.
  function svgToImagePixel(svgX, svgY){
    const img = document.getElementById('map-img');
    if (!img) return null;
    const X = window.imgX || { tx:0, ty:0, sx:1, sy:1, rot:0 };
    const MAP_W = window.MAP_W;
    const MAP_H = window.MAP_H;
    if (!MAP_W || !MAP_H || !img.naturalWidth) return null;

    // 1. Recenter relative to image-box center, removing the
    //    translate.
    let dx = svgX - MAP_W / 2 - X.tx;
    let dy = svgY - MAP_H / 2 - X.ty;

    // 2. Inverse rotate.
    const a = -X.rot * Math.PI / 180;
    const ca = Math.cos(a), sa = Math.sin(a);
    const xr = dx*ca - dy*sa;
    const yr = dx*sa + dy*ca;

    // 3. Inverse scale, re-center → image-CSS-box coords (MAP_W×MAP_H).
    const ibX = xr / X.sx + MAP_W / 2;
    const ibY = yr / X.sy + MAP_H / 2;

    // 4. Scale from image-CSS-box space to natural-pixel space.
    const px = ibX * (img.naturalWidth  / MAP_W);
    const py = ibY * (img.naturalHeight / MAP_H);
    return { px, py };
  }


  // Sample at (px, py) with a (2r+1)x(2r+1) average. One getImageData
  // call per cell — 25× faster than per-pixel calls. Returns:
  //   - { r, g, b }     normal sample, in-bounds
  //   - { offImage: true } sentinel: cell center maps off the image
  //                       (or the entire 5×5 window does). Distinct
  //                       from null so scanParent can fall through
  //                       to parent-prior instead of dropping the
  //                       cell entirely. Map-edge parents (e.g. on
  //                       Darlene's east/south borders) have ~5-15
  //                       cells per parent in this state.
  //   - null            real failure (canvas not ready, etc.)
  function samplePixel(ctx, px, py){
    const r = SAMPLE_RADIUS_PX;
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    if (!cw || !ch) return null;
    const ix = Math.round(px), iy = Math.round(py);
    const x0 = Math.max(0, ix - r);
    const y0 = Math.max(0, iy - r);
    const x1 = Math.min(cw, ix + r + 1);
    const y1 = Math.min(ch, iy + r + 1);
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return { offImage: true };
    const data = ctx.getImageData(x0, y0, w, h).data;
    let rs = 0, gs = 0, bs = 0;
    const n = w * h;
    for (let i = 0; i < n; i++){
      const k = i * 4;
      rs += data[k]; gs += data[k+1]; bs += data[k+2];
    }
    return { r: rs/n, g: gs/n, b: bs/n };
  }

  // samplePixels (plural) returns every individual pixel in the
  // (2r+1)×(2r+1) window as an array of {r,g,b}, instead of averaging
  // them. Used by the 'any-water' sampling strategy: a thin river
  // (1-2 pixels wide on Darlene) gets averaged into oblivion by
  // samplePixel — its 1 blue pixel + 24 green/tan pixels produces a
  // green/tan average that fails the water threshold. By scanning
  // pixels individually, the classifier can declare the cell water
  // if ANY pixel inside it is water-classified, catching thin
  // features that averaging loses.
  function samplePixels(ctx, px, py){
    const r = SAMPLE_RADIUS_PX;
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    if (!cw || !ch) return null;
    const ix = Math.round(px), iy = Math.round(py);
    const x0 = Math.max(0, ix - r);
    const y0 = Math.max(0, iy - r);
    const x1 = Math.min(cw, ix + r + 1);
    const y1 = Math.min(ch, iy + r + 1);
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return { offImage: true };
    const data = ctx.getImageData(x0, y0, w, h).data;
    const n = w * h;
    const pixels = new Array(n);
    let rs = 0, gs = 0, bs = 0;
    for (let i = 0; i < n; i++){
      const k = i * 4;
      const r = data[k], g = data[k+1], b = data[k+2];
      pixels[i] = { r, g, b };
      rs += r; gs += g; bs += b;
    }
    return {
      pixels,
      // Average is also returned so the result object can stand in
      // for samplePixel's return value when callers want both.
      avg: { r: rs/n, g: gs/n, b: bs/n },
    };
  }


  // ── Scan one parent ─────────────────────────────────────────────────
  function scanParent(col, row, opts){
    opts = opts || {};
    const mode = _resolveMode(opts);
    if (!mode){
      return { error: 'no edge mode (load gcc-edge-modes.js)', results: [], summary: null };
    }
    const T  = Object.assign({}, mode.defaultThreshold,     opts.threshold     || {});
    const TL = Object.assign({}, mode.defaultLandThreshold, opts.landThreshold || {});
    const ctx = ensureCanvas();
    if (!ctx){
      return { error: 'map image not ready', results: [], summary: null };
    }
    if (!window.GCCSubhexData){
      return { error: 'GCCSubhexData not loaded', results: [], summary: null };
    }
    const SD = window.GCCSubhexData;
    const cells = SD.ownedByParent(col, row);
    const parentTerrain = (typeof window.getHexTerrain === 'function')
      ? window.getHexTerrain(col, row) : null;
    const waterVariant = mode.variantFor(parentTerrain, 'water', opts);
    const parentIsWater = parentTerrain && (parentTerrain === 'water' || parentTerrain.startsWith('water_'));

    // ── Pass 1: per-cell classification ────────────────────────────────
    // Build results indexed by "Q,R" key for fast neighbor lookup in
    // pass 2. Each entry has classification ∈ water|land|ambiguous and
    // sample data; isWater + resolution are filled in pass 2.
    const byKey = new Map();
    // Sample strategy: 'average' (default, fast, dilutes thin features)
    // or 'any-water' (per-pixel, catches thin features like rivers).
    // The mode opts in via mode.sampleStrategy. River uses 'any-water'
    // because Darlene rivers are 1-2 pixels wide and 5×5 averaging
    // loses them.
    const sampleStrategy = mode.sampleStrategy || 'average';
    const useAnyWater = (sampleStrategy === 'any-water');

    const results = [];
    let sampleFails = 0;
    let offImageCount = 0;
    let anyWaterHits = 0;   // for diagnostics
    for (const { Q, R } of cells){
      const svg = SD.subhexSvgCenter(Q, R);
      const pix = svgToImagePixel(svg.x, svg.y);
      if (!pix){ sampleFails++; continue; }
      const sample = useAnyWater
        ? samplePixels(ctx, pix.px, pix.py)
        : samplePixel(ctx, pix.px, pix.py);
      if (!sample){ sampleFails++; continue; }
      const sub = SD.getSubhex(Q, R, parentTerrain);
      const alreadyAuthored = sub && sub.source === 'authored';
      // Off-image cells: the parent extends past the Darlene image
      // edge (every map-border parent has 5-15 of these). Treat as
      // ambiguous — pass-2 resolves via in-bounds neighbors first,
      // then parent-prior. This authors them correctly instead of
      // dropping them and letting procedural fallback render them.
      let cls, rgb;
      if (sample.offImage){
        offImageCount++;
        cls = 'ambiguous';
        rgb = null;
      } else if (useAnyWater){
        // Any-water: classify each pixel; if any returns 'water',
        // the whole cell is water. Otherwise prefer 'land' if any
        // pixel returns 'land', else 'ambiguous'. rgb for the result
        // record is the average (for diagnostics / preview canvas).
        rgb = sample.avg;
        let foundWater = false, foundLand = false;
        for (const p of sample.pixels){
          const c = mode.classify(p, T, TL);
          if (c === 'water'){ foundWater = true; break; }
          if (c === 'land')  foundLand = true;
        }
        if      (foundWater){ cls = 'water'; anyWaterHits++; }
        else if (foundLand)   cls = 'land';
        else                  cls = 'ambiguous';
      } else {
        rgb = sample;
        cls = mode.classify(rgb, T, TL);
      }
      const r = {
        Q, R, rgb,
        classification: cls,
        offImage: !!sample.offImage,
        isWater: false,        // filled in pass 2
        resolution: null,      // filled in pass 2
        terrain: null,
        alreadyAuthored,
      };
      results.push(r);
      byKey.set(`${Q},${R}`, r);
    }
    if (useAnyWater && anyWaterHits > 0){
      console.log(`[EdgeScanner] (${col},${row}) mode=${mode.id} any-water sampling: ${anyWaterHits} cell(s) classified water by pixel-scan`);
    }

    // ── Off-image abort gate (v0.4.5) ──────────────────────────────────
    // If more than 30% of cells came back off-image, the image is
    // either misaligned or not yet decoded. Authoring with parent-prior
    // would silently stamp the whole parent uniformly — the May 2
    // corruption signature. Bail out: empty results, flag aborted.
    const OFF_IMAGE_ABORT_RATIO = 0.30;
    if (results.length > 0 && (offImageCount / results.length) > OFF_IMAGE_ABORT_RATIO){
      const ratio = (offImageCount / results.length).toFixed(2);
      console.warn(`[EdgeScanner] ABORT parent (${col},${row}) mode=${mode.id}: ${offImageCount}/${results.length} cells off-image (ratio=${ratio}). Image alignment or load-state suspect.`);
      return {
        results: [],
        summary: {
          col, row,
          parentTerrain,
          parentIsWater,
          waterVariant,
          landVariant: parentIsWater ? mode.variantFor(parentTerrain, 'land', opts) : null,
          cellCount: cells.length,
          water: 0, land: 0, ambiguous: 0,
          sampleFails, offImage: offImageCount,
          alreadyAuthored: 0,
          toWrite: 0, toWriteWater: 0, toWriteLand: 0,
          aborted: true,
          abortReason: `off-image ratio ${ratio} > ${OFF_IMAGE_ABORT_RATIO}`,
          resolution: {
            waterDirect: 0, landDirect: 0,
            waterByNeighbor: 0, landByNeighbor: 0,
            waterByParent: 0, landByParent: 0,
          },
          threshold: T,
          landThreshold: TL,
        },
      };
    }

    // ── Pass 2: resolve ambiguous via iterative majority, then parent ──
    // 2a finalizes direct classifications. 2b iterates: each ambiguous
    // cell counts its 6 axial neighbors (definite OR previously-resolved)
    // and resolves to whichever side is the majority. Ties stay
    // ambiguous and feed the next pass — newly-resolved cells become
    // evidence for their still-ambiguous neighbors. 2c falls back to
    // parent-terrain prior for cells still ambiguous after stabilization.
    //
    // The change from v0.4.1's strict "no opposing neighbor" rule to
    // a majority rule fixes water-typed parents whose coastal-transition
    // cells had mixed neighbors: they previously fell through to the
    // water parent-prior even when leaning land. Symmetric on the land
    // side. Definite-classified neighbors still anchor everything.
    const NB = SD.NEIGHBOR_DELTAS;
    let waterN = 0, landN = 0, ambigN = 0, alreadyN = 0;
    let resWaterDirect = 0, resLandDirect = 0;
    let resWaterByNeighbor = 0, resLandByNeighbor = 0;
    let resWaterByParent = 0, resLandByParent = 0;

    // 2a: finalize direct classifications and tally already-authored.
    for (const r of results){
      if (r.alreadyAuthored) alreadyN++;
      if (r.classification === 'water'){
        r.isWater = true;
        r.resolution = 'water';
        resWaterDirect++;
      } else if (r.classification === 'land'){
        r.isWater = false;
        r.resolution = 'land';
        resLandDirect++;
      } else {
        ambigN++;
      }
    }

    // 2b: iterative majority resolution. MAX_PASSES caps propagation
    // distance — at ~10 cells across a parent, 10 passes is enough for
    // any signal to traverse the parent if needed.
    //
    // Mode opt-out: River mode sets resolveAmbiguous='direct-only'
    // because rivers are intentionally thin features (1-2 subhex
    // cells wide) and majority-vote would flip every river cell to
    // land via its 5-of-6 land neighbors. Direct classifications
    // (water pixel detected at the cell's center) are trusted; the
    // rest fall through to parent prior in 2c, which for River
    // means parent-terrain land via riverVariantFor.
    const skipMajority = (mode.resolveAmbiguous === 'direct-only');
    const MAX_PASSES = skipMajority ? 0 : 10;
    let pass = 0;
    let changed = true;
    while (changed && pass < MAX_PASSES){
      changed = false;
      pass++;
      for (const r of results){
        if (r.classification !== 'ambiguous' || r.resolution) continue;
        let nw = 0, nl = 0;
        for (const [dQ, dR] of NB){
          const nb = byKey.get(`${r.Q + dQ},${r.R + dR}`);
          if (!nb) continue;
          // A neighbor counts as water/land if it's directly classified
          // OR resolved via a prior iteration. Cells outside this parent
          // don't contribute evidence either way.
          const c = nb.resolution
            ? (nb.resolution === 'water' || nb.resolution === 'water-via-neighbor' ? 'water'
              : nb.resolution === 'land'  || nb.resolution === 'land-via-neighbor'  ? 'land'
              : null)
            : (nb.classification === 'water' ? 'water'
              : nb.classification === 'land'  ? 'land'
              : null);
          if (c === 'water') nw++;
          else if (c === 'land') nl++;
        }
        if (nw > nl){
          r.isWater = true;
          r.resolution = 'water-via-neighbor';
          resWaterByNeighbor++;
          changed = true;
        } else if (nl > nw){
          r.isWater = false;
          r.resolution = 'land-via-neighbor';
          resLandByNeighbor++;
          changed = true;
        }
        // Tie or no evidence — leave for next pass / parent prior.
      }
    }

    // 2c: anything still ambiguous → parent prior.
    for (const r of results){
      if (r.classification !== 'ambiguous' || r.resolution) continue;
      r.isWater = !!parentIsWater;
      r.resolution = parentIsWater ? 'water-via-parent' : 'land-via-parent';
      if (parentIsWater) resWaterByParent++;
      else               resLandByParent++;
    }

    // Final tally: terrain assignment + water/land counts. r.terrain
    // is what applyResults will write — null means no override needed
    // (procedural fallback is already correct). Specifically:
    //   isWater  → waterVariant always
    //   !isWater → landVariant only when parent is water-typed
    //              (otherwise procedural already gives land)
    const landVariant = mode.variantFor(parentTerrain, 'land', opts);
    let toWriteWater = 0, toWriteLand = 0;
    for (const r of results){
      if (r.isWater){
        waterN++;
        if (waterVariant !== parentTerrain){
          r.terrain = waterVariant;
          toWriteWater++;
        } else {
          // Procedural fallback already gives the parent terrain
          // most of the time; redundant override would just bloat
          // localStorage. Symmetric with the land-in-land-parent
          // skip below.
          r.terrain = null;
        }
      } else {
        landN++;
        if (parentIsWater){
          r.terrain = landVariant;
          toWriteLand++;
        } else {
          r.terrain = null;
        }
      }
    }

    return {
      results,
      summary: {
        col, row,
        parentTerrain,
        parentIsWater,
        waterVariant,
        landVariant: parentIsWater ? landVariant : null,
        cellCount: cells.length,
        water: waterN,
        land: landN,
        ambiguous: ambigN,
        sampleFails,
        offImage: offImageCount,
        alreadyAuthored: alreadyN,
        // Cells that will get an override on apply.
        toWrite: toWriteWater + toWriteLand,
        toWriteWater,
        toWriteLand,
        // Breakdown of how ambiguous cells got resolved.
        resolution: {
          waterDirect: resWaterDirect,
          landDirect: resLandDirect,
          waterByNeighbor: resWaterByNeighbor,
          landByNeighbor: resLandByNeighbor,
          waterByParent: resWaterByParent,
          landByParent: resLandByParent,
        },
        threshold: T,
        landThreshold: TL,
      },
    };
  }

  // ── Apply results to overrides ──────────────────────────────────────
  // Writes the override for every cell whose r.terrain is set:
  //   isWater  → waterVariant (e.g., water_inland_sea)
  //   land in water-typed parent → landVariant (default 'plains')
  //   land in land-typed parent  → r.terrain stays null, skipped
  //                                (procedural fallback is already land)
  // Returns { written, skipped, water, land } so the dialog can show a
  // breakdown. Uses deferred saves when available for batch efficiency.
  // v0.5.3: passes mode.source through on each write so cleanup
  // tooling can later filter by source. Falls back to a stable
  // string when opts.mode is absent (preview-dialog path).
  // v0.5.4: opts.deferFlush — when true, applyResults skips the
  // per-call flushOverrides at the end. Caller (Edges Run-scans
  // batch) is responsible for flushing once at the end of the
  // batch instead of after every parent. Drops 1128 IDB
  // transactions to 1 for a full coastline run.
  function applyResults(results, opts){
    opts = opts || {};
    const overwriteAuthored = !!opts.overwriteAuthored;
    const deferFlush = !!opts.deferFlush;
    if (!window.GCCSubhexData) return { written: 0, skipped: 0, water: 0, land: 0, error: 'no data layer' };
    const SD = window.GCCSubhexData;
    const hasFastPath = (typeof SD.peekOverride === 'function' && typeof SD.flushOverrides === 'function');
    const mode = _resolveMode(opts);
    const source = (mode && mode.source) || SOURCE_TAG;
    let written = 0, skipped = 0, waterW = 0, landW = 0;
    for (const r of results){
      if (!r.terrain) continue;
      if (r.alreadyAuthored && !overwriteAuthored){ skipped++; continue; }
      SD.setSubhexOverride(r.Q, r.R, { terrain: r.terrain, source }, hasFastPath ? { deferSave: true } : undefined);
      written++;
      if (r.isWater) waterW++;
      else           landW++;
    }
    if (hasFastPath && !deferFlush) SD.flushOverrides();
    return { written, skipped, water: waterW, land: landW };
  }


  // ── Preview UI ──────────────────────────────────────────────────────
  // A small modal: parent label, threshold sliders, preview canvas,
  // counts, Apply / Cancel buttons. Reuses the page's gold/parchment
  // styling (themed to the map page chrome).
  let _previewState = null;

  function openPreview(col, row){
    if (col == null || row == null){
      const s = window.state;
      if (s && s.selectedCol != null){
        col = s.selectedCol;
        row = s.selectedRow;
      } else {
        alert('Pick a parent hex first (click one on the map), then run the coast scanner.');
        return;
      }
    }
    closePreview();
    _previewState = {
      col, row,
      threshold:     Object.assign({}, DEFAULT_THRESHOLDS),
      landThreshold: Object.assign({}, DEFAULT_LAND_THRESHOLDS),
      results: null,
    };
    buildPreviewDOM();
    runPreview();
  }

  function closePreview(){
    const ex = document.getElementById('coast-scanner-modal');
    if (ex) ex.remove();
    _previewState = null;
  }

  function buildPreviewDOM(){
    const wrap = document.createElement('div');
    wrap.id = 'coast-scanner-modal';
    wrap.style.cssText = `
      position:fixed; top:50%; left:50%;
      transform:translate(-50%, -50%);
      background:#120900; color:#f4e8c4;
      border:1px solid #c8941a; border-radius:3px;
      padding:14px 16px; z-index:400;
      min-width:480px; max-width:560px;
      max-height:90vh; overflow-y:auto;
      box-shadow:0 10px 50px rgba(0,0,0,.85);
      font-family:'Crimson Text', Georgia, serif;
    `;
    const id = (typeof hexIdStr === 'function') ? hexIdStr(_previewState.col, _previewState.row)
      : `${_previewState.col},${_previewState.row}`;
    wrap.innerHTML = `
      <div style="font-family:'Cinzel',serif; font-size:14px; color:#e8b840; letter-spacing:.06em; text-transform:uppercase; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #5a4a30; display:flex; justify-content:space-between; align-items:baseline;">
        <span>Coast Scanner · ${id}</span>
        <span style="cursor:pointer; color:#c8a070; font-size:18px;" id="cs-close">×</span>
      </div>
      <div id="cs-summary" style="font-size:13px; line-height:1.5; margin-bottom:10px;">scanning…</div>
      <canvas id="cs-canvas" width="320" height="320" style="display:block; margin:0 auto 10px; border:1px solid #5a4a30; background:#000;"></canvas>
      <div style="font-size:11px; color:#c8a070; margin-bottom:8px; line-height:1.4;">Solid = definite · Faded = inferred from neighbors · Grey = inferred from parent terrain</div>
      <div style="font-size:11px; line-height:1.6; margin-bottom:6px;">
        <div style="font-size:10px; color:#e8b840; letter-spacing:.06em; text-transform:uppercase; margin-bottom:4px;">Water threshold (blue hues)</div>
        <div style="display:grid; grid-template-columns:60px 1fr 60px; gap:4px 8px; align-items:center;">
          <label>Hue min</label>
            <input type="range" id="cs-w-hmin" min="0" max="360" value="${DEFAULT_THRESHOLDS.hMin}" style="width:100%;">
            <span id="cs-w-hmin-v">${DEFAULT_THRESHOLDS.hMin}°</span>
          <label>Hue max</label>
            <input type="range" id="cs-w-hmax" min="0" max="360" value="${DEFAULT_THRESHOLDS.hMax}" style="width:100%;">
            <span id="cs-w-hmax-v">${DEFAULT_THRESHOLDS.hMax}°</span>
          <label>Sat min</label>
            <input type="range" id="cs-w-smin" min="0" max="100" value="${Math.round(DEFAULT_THRESHOLDS.sMin*100)}" style="width:100%;">
            <span id="cs-w-smin-v">${Math.round(DEFAULT_THRESHOLDS.sMin*100)}%</span>
          <label>Val min</label>
            <input type="range" id="cs-w-vmin" min="0" max="100" value="${Math.round(DEFAULT_THRESHOLDS.vMin*100)}" style="width:100%;">
            <span id="cs-w-vmin-v">${Math.round(DEFAULT_THRESHOLDS.vMin*100)}%</span>
          <label>Val max</label>
            <input type="range" id="cs-w-vmax" min="0" max="100" value="${Math.round(DEFAULT_THRESHOLDS.vMax*100)}" style="width:100%;">
            <span id="cs-w-vmax-v">${Math.round(DEFAULT_THRESHOLDS.vMax*100)}%</span>
        </div>
      </div>
      <div style="font-size:11px; line-height:1.6; margin-bottom:10px;">
        <div style="font-size:10px; color:#c8a070; letter-spacing:.06em; text-transform:uppercase; margin-bottom:4px;">Land threshold (greens, browns)</div>
        <div style="display:grid; grid-template-columns:60px 1fr 60px; gap:4px 8px; align-items:center;">
          <label>Hue min</label>
            <input type="range" id="cs-l-hmin" min="0" max="360" value="${DEFAULT_LAND_THRESHOLDS.hMin}" style="width:100%;">
            <span id="cs-l-hmin-v">${DEFAULT_LAND_THRESHOLDS.hMin}°</span>
          <label>Hue max</label>
            <input type="range" id="cs-l-hmax" min="0" max="360" value="${DEFAULT_LAND_THRESHOLDS.hMax}" style="width:100%;">
            <span id="cs-l-hmax-v">${DEFAULT_LAND_THRESHOLDS.hMax}°</span>
          <label>Sat min</label>
            <input type="range" id="cs-l-smin" min="0" max="100" value="${Math.round(DEFAULT_LAND_THRESHOLDS.sMin*100)}" style="width:100%;">
            <span id="cs-l-smin-v">${Math.round(DEFAULT_LAND_THRESHOLDS.sMin*100)}%</span>
          <label>Val min</label>
            <input type="range" id="cs-l-vmin" min="0" max="100" value="${Math.round(DEFAULT_LAND_THRESHOLDS.vMin*100)}" style="width:100%;">
            <span id="cs-l-vmin-v">${Math.round(DEFAULT_LAND_THRESHOLDS.vMin*100)}%</span>
          <label>Val max</label>
            <input type="range" id="cs-l-vmax" min="0" max="100" value="${Math.round(DEFAULT_LAND_THRESHOLDS.vMax*100)}" style="width:100%;">
            <span id="cs-l-vmax-v">${Math.round(DEFAULT_LAND_THRESHOLDS.vMax*100)}%</span>
        </div>
      </div>
      <div style="display:flex; gap:8px; justify-content:space-between; align-items:center;">
        <label style="font-size:11px; color:#c8a070; cursor:pointer; user-select:none;">
          <input type="checkbox" id="cs-overwrite"> Overwrite already-authored cells
        </label>
        <div style="display:flex; gap:8px;">
          <button id="cs-cancel" style="background:transparent; color:#f4e8c4; border:1px solid #8b6a30; border-radius:3px; padding:6px 14px; font-family:inherit; font-size:13px; cursor:pointer;">Close</button>
          <button id="cs-apply" style="background:#5a3a0a; color:#f4e8c4; border:1px solid #c8941a; border-radius:3px; padding:6px 14px; font-family:inherit; font-size:13px; cursor:pointer; font-weight:600;">Apply</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
    document.getElementById('cs-close').addEventListener('click', closePreview);
    document.getElementById('cs-cancel').addEventListener('click', closePreview);
    document.getElementById('cs-apply').addEventListener('click', onApplyClick);
    for (const ctl of ['hmin','hmax','smin','vmin','vmax']){
      const wEl = document.getElementById('cs-w-' + ctl);
      const lEl = document.getElementById('cs-l-' + ctl);
      if (wEl) wEl.addEventListener('input', () => onSliderInput('water', ctl));
      if (lEl) lEl.addEventListener('input', () => onSliderInput('land',  ctl));
    }
    document.addEventListener('keydown', _onCsKey, true);
  }

  function _onCsKey(e){
    if (e.key === 'Escape' && document.getElementById('coast-scanner-modal')){
      e.preventDefault(); e.stopPropagation();
      closePreview();
      document.removeEventListener('keydown', _onCsKey, true);
    }
  }

  function onSliderInput(kind, name){
    const T = (kind === 'water') ? _previewState.threshold : _previewState.landThreshold;
    const prefix = (kind === 'water') ? 'cs-w-' : 'cs-l-';
    const v = parseFloat(document.getElementById(prefix + name).value);
    if (name === 'hmin'){ T.hMin = v; document.getElementById(prefix + 'hmin-v').textContent = v + '°'; }
    if (name === 'hmax'){ T.hMax = v; document.getElementById(prefix + 'hmax-v').textContent = v + '°'; }
    if (name === 'smin'){ T.sMin = v/100; document.getElementById(prefix + 'smin-v').textContent = v + '%'; }
    if (name === 'vmin'){ T.vMin = v/100; document.getElementById(prefix + 'vmin-v').textContent = v + '%'; }
    if (name === 'vmax'){ T.vMax = v/100; document.getElementById(prefix + 'vmax-v').textContent = v + '%'; }
    runPreview();
  }

  function runPreview(){
    if (!_previewState) return;
    const { col, row, threshold, landThreshold } = _previewState;
    const out = scanParent(col, row, { threshold, landThreshold });
    _previewState.results = out.results;
    const sumEl = document.getElementById('cs-summary');
    if (out.error){
      sumEl.textContent = 'Error: ' + out.error;
      return;
    }
    const s = out.summary;
    const r = s.resolution;
    const parts = [];
    if (r.waterByNeighbor)  parts.push(`<span style="color:#9adfff;">${r.waterByNeighbor} → water (neighbor)</span>`);
    if (r.landByNeighbor)   parts.push(`<span style="color:#e8c890;">${r.landByNeighbor} → land (neighbor)</span>`);
    if (r.waterByParent)    parts.push(`<span style="color:#9adfff;">${r.waterByParent} → water (parent)</span>`);
    if (r.landByParent)     parts.push(`<span style="color:#e8c890;">${r.landByParent} → land (parent)</span>`);
    const ambigDetail = parts.length ? ` · ${parts.join(' · ')}` : '';
    // When the parent is water-typed, land cells need explicit overrides
    // (procedural fallback would render water). Surface that as "would
    // write Y as <landVariant>" so the user understands what apply does.
    const writeNote = s.parentIsWater
      ? `would write water as <b>${s.waterVariant}</b>, land as <b>${s.landVariant}</b>`
      : `would write water as <b>${s.waterVariant}</b>; land cells use procedural fallback (no override)`;
    sumEl.innerHTML = `
      <div>Parent: <b>${s.parentTerrain || '(unknown)'}</b> · ${writeNote}</div>
      <div>${s.cellCount} cells · <span style="color:#6dc8c8;">${s.water} water</span> · <span style="color:#c8a070;">${s.land} land</span>${ambigDetail}</div>
      <div style="font-size:11px; color:#a08a60; margin-top:2px;">
        Apply will write <b style="color:#e8b840;">${s.toWrite}</b> override${s.toWrite === 1 ? '' : 's'}${s.toWriteLand ? ` (${s.toWriteWater} water + ${s.toWriteLand} land)` : ''}${s.sampleFails ? ` · ${s.sampleFails} sample fail` : ''}${s.alreadyAuthored ? ` · ${s.alreadyAuthored} already authored (skipped unless overwrite)` : ''}
      </div>
    `;
    drawPreviewCanvas();
  }

  function drawPreviewCanvas(){
    if (!_previewState) return;
    const cv = document.getElementById('cs-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const ctx2 = ensureCanvas();
    if (!ctx2){
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,cv.width,cv.height);
      ctx.fillStyle = '#e07070'; ctx.font = '14px sans-serif'; ctx.fillText('Image not loaded', 10, 30);
      return;
    }
    // Compute the parent's image-pixel bounding box from its 6 corners.
    const SD = window.GCCSubhexData;
    const center = SD.parentSvgCenter(_previewState.col, _previewState.row);
    const HEX_R = SD.HEX_R || 20;     // hex radius in SVG units (data layer constant)
    const SQRT3 = Math.sqrt(3);
    const corners = [];
    for (let i = 0; i < 6; i++){
      const a = (Math.PI / 180) * (60 * i);
      corners.push({ x: center.x + HEX_R*Math.cos(a), y: center.y + HEX_R*Math.sin(a) });
    }
    let minPx = Infinity, minPy = Infinity, maxPx = -Infinity, maxPy = -Infinity;
    for (const c of corners){
      const p = svgToImagePixel(c.x, c.y);
      if (!p) continue;
      minPx = Math.min(minPx, p.px); maxPx = Math.max(maxPx, p.px);
      minPy = Math.min(minPy, p.py); maxPy = Math.max(maxPy, p.py);
    }
    const pad = 6;
    minPx -= pad; minPy -= pad; maxPx += pad; maxPy += pad;
    const srcW = maxPx - minPx, srcH = maxPy - minPy;
    if (srcW <= 0 || srcH <= 0){
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,cv.width,cv.height);
      return;
    }
    const scale = Math.min(cv.width / srcW, cv.height / srcH);
    const drawW = srcW * scale, drawH = srcH * scale;
    const offX = (cv.width - drawW) / 2, offY = (cv.height - drawH) / 2;
    // Background
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,cv.width,cv.height);
    // Draw the cropped region of the source image.
    ctx.drawImage(ctx2.canvas,
      Math.max(0, minPx), Math.max(0, minPy),
      Math.min(srcW, ctx2.canvas.width - minPx),
      Math.min(srcH, ctx2.canvas.height - minPy),
      offX, offY, drawW, drawH);
    // Overlay each subhex result. Color encodes the resolution path:
    //   solid blue / amber  = definite (passed strict threshold)
    //   medium blue / amber = via-neighbor (definite neighbor evidence)
    //   grey w/ stroke      = via-parent (no signal, parent prior)
    // This gives a visual confidence map: brightest dots are most
    // certain, ambiguous-cells-with-no-evidence look quietest.
    const results = _previewState.results || [];
    for (const r of results){
      const svg = SD.subhexSvgCenter(r.Q, r.R);
      const pix = svgToImagePixel(svg.x, svg.y);
      if (!pix) continue;
      const x = offX + (pix.px - minPx) * scale;
      const y = offY + (pix.py - minPy) * scale;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2*Math.PI);
      switch (r.resolution){
        case 'water':
          ctx.fillStyle = 'rgba(50,160,255,0.65)';
          ctx.strokeStyle = 'rgba(120,200,255,1.0)';
          break;
        case 'land':
          ctx.fillStyle = 'rgba(200,140,60,0.50)';
          ctx.strokeStyle = 'rgba(220,180,100,0.90)';
          break;
        case 'water-via-neighbor':
          ctx.fillStyle = 'rgba(50,160,255,0.30)';
          ctx.strokeStyle = 'rgba(120,200,255,0.85)';
          break;
        case 'land-via-neighbor':
          ctx.fillStyle = 'rgba(200,140,60,0.25)';
          ctx.strokeStyle = 'rgba(220,180,100,0.75)';
          break;
        case 'water-via-parent':
          ctx.fillStyle = 'rgba(220,220,220,0.40)';
          ctx.strokeStyle = 'rgba(120,200,255,0.85)';
          break;
        case 'land-via-parent':
          ctx.fillStyle = 'rgba(220,220,220,0.40)';
          ctx.strokeStyle = 'rgba(220,180,100,0.85)';
          break;
        default:
          ctx.fillStyle = 'rgba(220,220,220,0.40)';
          ctx.strokeStyle = 'rgba(180,180,180,0.85)';
      }
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  function onApplyClick(){
    if (!_previewState || !_previewState.results) return;
    const cb = document.getElementById('cs-overwrite');
    const overwriteAuthored = !!(cb && cb.checked);
    const out = applyResults(_previewState.results, { overwriteAuthored });
    const parts = [];
    if (out.water) parts.push(`${out.water} water`);
    if (out.land)  parts.push(`${out.land} land`);
    const breakdown = parts.length ? ` (${parts.join(' + ')})` : '';
    alert(`Wrote ${out.written} override${out.written === 1 ? '' : 's'}${breakdown}` +
      (out.skipped ? `, skipped ${out.skipped} already-authored cell${out.skipped === 1 ? '' : 's'}.` : '.'));
    closePreview();
    // Notify the rest of the app that subhex data changed.
    window.dispatchEvent(new CustomEvent('gcc-subhex-changed', { detail: { reason: 'coast-scanner' } }));
  }


  // ── Public surface ──────────────────────────────────────────────────
  // External callers see GCCEdgeScanner. Slice 1 has no callers
  // outside this file (verified by grep across the tree); the rename
  // is therefore safe. rgbToHsv / passesThreshold / classifyPixel /
  // waterVariantForParent / landVariantForParent now live on
  // GCCEdgeModes — call them from there if needed.
  window.GCCEdgeScanner = {
    DEFAULT_THRESHOLDS,
    DEFAULT_LAND_THRESHOLDS,
    SOURCE_TAG,
    svgToImagePixel,
    scanParent, applyResults,
    openPreview, closePreview,
  };

  // ── Toolbar button auto-wire ────────────────────────────────────────
  // Coast button is now selection-required: with a hex selected it
  // opens the single-parent preview/apply dialog. Without a selection
  // it shows a hint via openPreview's own guard. (Pre-v0.5.1 the
  // no-selection branch opened a bulk-scan dialog; that path was
  // architecturally wrong for Greyhawk's transitional-parent
  // sparsity and has been removed. Multi-parent scans land in
  // slice 3 via the parent-map paint flow on a new Edges button.)
  function wireButton(){
    const btn = document.getElementById('btn-coast-scan');
    if (!btn) return false;
    if (btn.dataset.coastWired) return true;
    btn.dataset.coastWired = '1';
    btn.addEventListener('click', () => {
      const s = window.state;
      const col = s ? s.selectedCol : null;
      const row = s ? s.selectedRow : null;
      openPreview(col, row);     // openPreview alerts if col/row missing
    });
    return true;
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', wireButton);
  } else {
    wireButton();
  }
})();
