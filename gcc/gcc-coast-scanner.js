// gcc-coast-scanner.js v0.4.6 — 2026-05-03
// v0.4.6: skip redundant water overrides. Pre-v0.4.6 the scanner
// always wrote water cells with explicit overrides, even when the
// override would match the parent's terrain (e.g. water_inland_sea
// cell inside a water_inland_sea parent — procedural fallback would
// produce the same result). This was asymmetric with the land path,
// which already skipped land-in-land-parent writes. For Greyhawk,
// vast water parents (Nyr Dyv, oceans) generated hundreds of K of
// redundant writes; a full-map scan blew localStorage quota and
// silently failed to save. The fix: in scanParent's terrain-assign
// pass, only set r.terrain = waterVariant if waterVariant differs
// from parentTerrain. Otherwise null (no override). Reduces a typical
// full-map scan from ~460K writes to ~50-80K — coastline fidelity
// preserved (transitions still get explicit overrides), interior
// homogeneous water parents fall to procedural like land already did.
// v0.4.5: two safety changes after May 2 corruption events.
// (1) waterVariantForParent('water') now returns 'water_coastal'
//     instead of 'water_fresh'. Greyhawk parents typed plain 'water'
//     are coastline by convention; inland seas should be typed
//     'water_inland_sea' and lakes 'water_fresh' on the parent hex
//     itself. The old default collapsed every west-coast/Wooly-Bay
//     parent to freshwater on bulk apply.
// (2) Off-image abort gate. If more than 30% of a parent's cells
//     come back from samplePixel as { offImage:true } in pass 1, the
//     parent is aborted: results returned empty, summary flagged
//     aborted:true with the off-image ratio. Map-edge parents have
//     5-15% off-image legitimately (~5-15 cells of 100); the gate
//     trips only on the catastrophic case where image alignment is
//     wrong or canvas isn't decoded yet, which on May 2 silently
//     stamped ~25% of authored parents with uniform parent-prior.
// v0.4.4: author cells whose centers fall off the Darlene image.
// Previously, samplePixel returned null when the entire 5×5 sample
// window was outside the canvas bounds, and scanParent skipped the
// cell entirely (no entry in results, no apply). Map-edge parents
// (Darlene's east/south borders) had 5-15 such cells per parent
// that fell through to procedural fallback. Procedural usually
// produced the right thing for deep-water parents (parent=water →
// procedural=water), but coastal/edge parents would render
// incorrectly.
//
// Fix: samplePixel returns a sentinel { offImage: true } instead
// of null when the entire window is out of bounds. scanParent
// classifies these cells as 'ambiguous' so pass-2's iterative
// majority rule resolves them from in-bounds neighbors first;
// failing that, parent-prior. Authored result either way, no
// procedural fallthrough on map-edge parents.
//
// Summary now exposes summary.offImage count alongside sampleFails.
//
// v0.4.3: apply-side fix for water-typed parents. v0.4.2's pass-2
// correctly classified land cells inside water-typed parents (e.g.,
// U3-74 / Nyr Dyv interior), but applyResults / applyBulk only ever
// wrote isWater cells. Land cells in those parents fell through to
// procedural fallback — which is water for water_* parents. So the
// preview was right but the rendered cells stayed water.
//
// Now scanParent populates r.terrain on land cells in water-typed
// parents (default 'plains', via landVariantForParent — pluggable
// via opts.landVariant). applyResults / applyBulk gate on
// r.terrain != null instead of r.isWater. Land-typed parents are
// unchanged: r.terrain stays null on land cells, applyResults skips
// them (procedural fallback already gives the right thing).
//
// Single-parent dialog gains an "Overwrite already-authored cells"
// checkbox matching the bulk dialog. Use it to clean up any cells
// that the v0.4.1 broken algorithm over-authored as water in
// water-typed parents.
//
// Summary now exposes toWrite, toWriteWater, toWriteLand so the
// dialog can show a meaningful breakdown ("Will write 79 water +
// 21 land overrides"). Bulk totals likewise.
//
// v0.4.2: pass-2 majority rule. v0.4.1's strict "no opposing
// neighbor" rule mis-classified coastal-transition cells in water-
// typed parents (e.g., U3-74 / Nyr Dyv interior): a cell with mixed
// neighbors (4 water + 2 land) hit "both" and fell through to the
// parent-prior, which is water for water_* parents — even when the
// cell visually leans land. Same problem symmetrically on the land
// side, just less visible because most of the Flanaess is land-
// typed.
//
// New pass-2 has three phases:
//   2a — finalize direct (definite) classifications
//   2b — iterate up to 10 passes; each ambiguous cell resolves to
//        its definite/already-resolved neighbor majority. Ties and
//        no-evidence stay ambiguous for the next pass; newly-
//        resolved cells become evidence on the next pass.
//   2c — still-ambiguous after stabilization → parent-prior tiebreak
// Definite classifications still anchor everything, so well-tuned
// parents (verified Nyr Dyv proper at ~99%) are unaffected: only
// coastal-transition cells with previously-unresolvable mixed
// neighbors get classified now instead of falling to parent-prior.
//
// v0.4.1: bulk apply perf — was crashing the page on coast-scope.
// applyBulk and undoBulk are now async and chunked (2000 cells per
// chunk with setTimeout(0) yields), and they pass {deferSave:true}
// through to the data layer so the per-call save() that serializes
// the entire OVERRIDES blob runs once at the end via flushOverrides
// instead of once per cell. Was O(N²) total work; now O(N).
//
// Companion change in gcc-subhex-data.js v2.5.0: setSubhexOverride
// and clearSubhex accept {deferSave:true}, plus new peekOverride
// and flushOverrides helpers. Falls back gracefully if those aren't
// present (older data layer) — slow path still works, just won't
// scale past a few thousand cells.
//
// Apply phase gains a progress bar + cancel button. Undo phase
// likewise shows progress (red bar). Cancellation captures a
// partial snapshot so undo still works on the cells that were
// written before cancel fired.
//
// v0.4.0 — 2026-05-02
// v0.4.0: bulk apply. Three new public functions and a bulk dialog
// UI. collectParents(scope) returns the parents to scan for one of
// three scopes:
//   'water' — every parent whose terrain is a water variant
//   'coast' — water + every land parent adjacent to a water parent
//             (recommended; coastlines bleed across parent borders)
//   'all'   — every parent on the map
// scanBulkAsync(parents, opts, onProgress) chunks scanParent calls
// across setTimeout(0) yields so the progress UI keeps painting;
// returns { perParent: Map<key, {col,row,results,summary}>, totals }.
// applyBulk(scanData, opts) writes water overrides for all isWater
// cells across all scanned parents; captures a per-cell undo
// snapshot ({Q, R, hadOverride, priorTerrain}). undoBulk(snapshot)
// restores prior state cell-by-cell.
//
// Toolbar 🌊 button is now context-aware: with a hex selected it
// opens the single-parent preview as before; with nothing selected
// it opens the bulk dialog. The single-parent preview header gains
// a "Switch to bulk ▸" link.
//
// Bulk apply uses DEFAULT_THRESHOLDS — no per-parent tuning. For
// outliers the workflow is: bulk-apply with defaults, spot-check
// problem parents in the single-parent preview, hand-tune & apply.
//
// samplePixel optimized: one getImageData rect call per cell
// instead of 25 per-pixel calls. ~25× speedup, important for
// whole-map scans (was ~7 minutes, now ~17 seconds).
//
// v0.3.1: loosen water DEFAULT_THRESHOLDS so Darlene's near-white
// lake water (e.g. inside G4-88, plains parent containing the
// western edge of Whyestil) classifies as definite water on the
// strict pass. v0.3.0's S>=0.20 / V<=0.85 was tuned for saturated
// inland-sea blues and rejected the desaturated lake interior, so
// approach-C had nothing to spread from there.
//
// New water defaults:
//   Hue:  180°-240°    (was 180°-230°; widened to catch deeper blues)
//   Sat:  >= 0.015     (was >= 0.20; pale-blue-tinted-white now passes)
//   Val:  0.30-0.99    (was 0.30-0.85; admits whitish water, still
//                       rejects pure-pure-white text & UI highlights)
//
// Discriminator vs parchment is hue: parchment is yellow-tinted
// (H~50°), Darlene's lake is blue-tinted (H~200°), so even a tiny
// Sat min still excludes parchment because it's outside the hue band.
//
// v0.3.0 — 2026-05-02
// v0.3.0: edge-aware classification (approach C). The v0.2 parent-
// terrain tiebreaker pointed in the wrong direction for parents that
// CONTAIN water but aren't water-typed (e.g. plains hex containing
// the western edge of Whyestil Lake at G4-88). Ambiguous coastal
// pixels there were defaulting to land regardless of the visible
// water signal in neighboring cells.
//
// Two-pass scan now:
//   Pass 1: classify each cell as 'water' | 'land' | 'ambiguous'
//   Pass 2: for each ambiguous cell, look at its 6 axial neighbors:
//     - if any definite-water neighbor and no definite-land → water
//     - if any definite-land neighbor and no definite-water → land
//     - if both/neither → fall through to parent-terrain tiebreaker
//
// This means definite classifications "spread" one cell into ambiguous
// regions. Cells far from any color signal still use the parent's
// terrain as the prior. Result on G4-88 (plains parent): ambiguous
// cells adjacent to the definite-blue strip in the upper-left now
// correctly classify as water; cells deep in the plains stay land.
//
// Result.resolution field added: 'water' | 'land' | 'water-via-neighbor'
// | 'land-via-neighbor' | 'water-via-parent' | 'land-via-parent'.
// Preview summary breaks down which way ambiguous cells went.
//
// v0.2.1 — 2026-05-02
// v0.2.1: raise DEFAULT_LAND_THRESHOLDS.vMax from 0.70 to 0.92.
// Verified empirically against I4-89: Darlene's land coloring is
// pale-bright yellow-tan (V~0.85-0.88), not the moderate-tone V<0.70
// I assumed. With the old default, land cells fell into "ambiguous"
// and the parent-terrain tiebreaker (water_inland_sea → water) flipped
// them all to water. New cap at 0.92 catches Darlene's pale land
// without picking up pure-white coastal pixels (V≈0.98).
//
// v0.2.0 — 2026-05-02
// v0.2.0: parent-terrain tiebreaker for ambiguous pixels.
// Darlene's coastal water is nearly white (RGB ~245,245,250 with H~240°
// but S~0.02, V~0.98), failing the v0.1 saturated-blue threshold. Same
// goes for pale parchment land: too desaturated to call definitively.
// New tri-state classifier:
//   classifyPixel(r,g,b) → 'water' | 'land' | 'ambiguous'
// And in scanParent, ambiguous cells use the parent's terrain as the
// tiebreaker (water_* parents default ambiguous → water; land parents
// default ambiguous → land). The modal now exposes a separate land
// threshold so the GM can tune both water and land detection.
//
// v0.1.2 — 2026-05-02
// v0.1.2: fix svgToImagePixel — world coords from hexCenter() are
// already in image-CSS-box space (origin at the image's CSS top-left).
// The 0.1.1 fix added a stageBounds offset that shouldn't have been
// there. Verified empirically against a live probe at D4-86 (col=64,
// row=44): world (1940, 1541.53) → natural pixel (956.48, 804.92),
// matching DOM bounding-rect ground truth (977.49, 804.95) to within
// rounding.
//
// v0.1.1 — 2026-05-02 (DID NOT FIX THE BUG)
// v0.1.0 — 2026-05-02
//
// Scans the Darlene map image and classifies each subhex cell of a
// parent hex as water-vs-land, writing subhex overrides for the water
// cells. Sole feature: water/coast detection by HSV threshold on
// pixel samples taken at each subhex center.
//
// The Darlene image is positioned in the page via a CSS transform
// (imgX in greyhawk-map.html). To sample the right pixel for a given
// subhex SVG center, we invert that transform: SVG world → pre-transform
// image pixel, then read from a hidden canvas drawn at the image's
// natural size.
//
// Public API (single-parent MVP):
//   GCCCoastScanner.openPreview(col, row)
//     Open a modal dialog showing the scan result for parent (col, row).
//     Operator can adjust the threshold, preview the classification,
//     and apply it as subhex overrides (source='scanner-coast-v1').
//
//   GCCCoastScanner.scanParent(col, row, opts) → { results, summary }
//     Headless scan returning [{Q, R, isWater, terrain, alreadyAuthored}, …].
//     opts.threshold = HSV thresholds (see DEFAULT_THRESHOLDS).
//
//   GCCCoastScanner.applyResults(results) → { written, skipped }
//     Write water overrides for all results where isWater=true and the
//     cell isn't already authored. Skips authored cells unless
//     opts.overwriteAuthored=true.
//
// Coordinate flow:
//   subhex (Q,R) ──subhexSvgCenter──> world SVG (x,y)
//   world SVG (x,y) ──invert imgX──> image pixel (px,py)
//   image pixel ──canvas getImageData──> RGB
//   RGB ──rgbToHsv → threshold──> isWater bool
//
// Calibration baseline: HSV with H ∈ [180°, 230°], S > 0.20, V ∈ [0.30, 0.85]
// works well against Darlene's blue water palette without picking up
// the parchment background or shaded mountains. Threshold can be
// adjusted live in the preview panel.

(function(){
  'use strict';

  // ── Defaults ────────────────────────────────────────────────────────
  // Water threshold — anything in the blue hue band with even a tiny
  // saturation tint, except pure-pure-white. Catches both saturated
  // sea blues (Nyr Dyv proper) and Darlene's near-white lake interior
  // (Whyestil's western fingers in plains/forest parents). The hue
  // band excludes parchment (which is yellow-tinted ~50°) so the
  // very-low saturation floor doesn't pick up cream/tan. Bounds are
  // slightly margined (sMin 0.015 not 0.02; vMax 0.99 not 0.98) to
  // admit pixels right at the boundary that compute as e.g. S=0.0199
  // due to floating-point.
  const DEFAULT_THRESHOLDS = {
    hMin: 180, hMax: 240,
    sMin: 0.015, sMax: 1.00,
    vMin: 0.30, vMax: 0.99,
  };
  // Land threshold — anything clearly green/brown/yellow-tan is
  // "definitely land". Together with DEFAULT_THRESHOLDS for water, the
  // remaining pixels are "ambiguous" and resolved by parent-terrain
  // tiebreaker in scanParent. Defaults catch forest/hills/plains/
  // mountain/Darlene-pale-tan hues (earthy browns from ~20°, greens
  // through ~110°, V up to 0.92 to include Darlene's pale-bright land
  // coloring without grabbing pure-white coast pixels at V≈0.98).
  const DEFAULT_LAND_THRESHOLDS = {
    hMin: 20, hMax: 110,
    sMin: 0.15, sMax: 1.00,
    vMin: 0.10, vMax: 0.92,
  };
  const SAMPLE_RADIUS_PX = 2;     // average over a (2r+1)x(2r+1) window
  const SOURCE_TAG = 'scanner-coast-v1';

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

  // ── Color classification ────────────────────────────────────────────
  function rgbToHsv(r, g, b){
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d > 0){
      if      (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else                h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : d / max;
    return { h, s, v: max };
  }
  function isWaterRgb(r, g, b, T){
    const { h, s, v } = rgbToHsv(r, g, b);
    return h >= T.hMin && h <= T.hMax
        && s >= T.sMin && s <= T.sMax
        && v >= T.vMin && v <= T.vMax;
  }
  function passesThreshold(h, s, v, T){
    return h >= T.hMin && h <= T.hMax
        && s >= T.sMin && s <= T.sMax
        && v >= T.vMin && v <= T.vMax;
  }
  // Tri-state classification. 'ambiguous' means neither water nor land
  // threshold matched — the caller should resolve via parent-terrain
  // tiebreaker. Order matters: water check first because some water
  // hues overlap loosely with land hues at the edges.
  function classifyPixel(r, g, b, waterT, landT){
    waterT = waterT || DEFAULT_THRESHOLDS;
    landT  = landT  || DEFAULT_LAND_THRESHOLDS;
    const { h, s, v } = rgbToHsv(r, g, b);
    if (passesThreshold(h, s, v, waterT)) return 'water';
    if (passesThreshold(h, s, v, landT))  return 'land';
    return 'ambiguous';
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

  // Pick the right water variant for a subhex based on the parent's
  // terrain. Identity if the parent is itself a water terrain; falls
  // back to water_fresh for inland (forest/plains/etc.) parents that
  // contain small lakes.
  function waterVariantForParent(parentTerrain){
    if (!parentTerrain) return 'water_fresh';
    if (parentTerrain === 'water')              return 'water_coastal';
    if (parentTerrain.startsWith('water_'))     return parentTerrain;
    return 'water_fresh';
  }

  // Pick the land variant to author when the parent is water-typed
  // and the scanner identifies a land cell. Land-typed parents don't
  // need this — their procedural fallback is already land. But a
  // water-typed parent procedurally renders water everywhere, so any
  // land cell needs an explicit override or it'll display as water.
  // Plains is a safe default; future enhancement could pick by pixel
  // hue (greens → forest_oak, browns → hills, tan → plains).
  const DEFAULT_LAND_VARIANT = 'plains';
  function landVariantForParent(parentTerrain, opts){
    return (opts && opts.landVariant) || DEFAULT_LAND_VARIANT;
  }

  // ── Scan one parent ─────────────────────────────────────────────────
  function scanParent(col, row, opts){
    opts = opts || {};
    const T  = Object.assign({}, DEFAULT_THRESHOLDS,      opts.threshold     || {});
    const TL = Object.assign({}, DEFAULT_LAND_THRESHOLDS, opts.landThreshold || {});
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
    const waterVariant = waterVariantForParent(parentTerrain);
    const parentIsWater = parentTerrain && (parentTerrain === 'water' || parentTerrain.startsWith('water_'));

    // ── Pass 1: per-cell classification ────────────────────────────────
    // Build results indexed by "Q,R" key for fast neighbor lookup in
    // pass 2. Each entry has classification ∈ water|land|ambiguous and
    // sample data; isWater + resolution are filled in pass 2.
    const byKey = new Map();
    const results = [];
    let sampleFails = 0;
    let offImageCount = 0;
    for (const { Q, R } of cells){
      const svg = SD.subhexSvgCenter(Q, R);
      const pix = svgToImagePixel(svg.x, svg.y);
      if (!pix){ sampleFails++; continue; }
      const sample = samplePixel(ctx, pix.px, pix.py);
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
      } else {
        rgb = sample;
        cls = classifyPixel(rgb.r, rgb.g, rgb.b, T, TL);
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

    // ── Off-image abort gate (v0.4.5) ──────────────────────────────────
    // If more than 30% of cells came back off-image, the image is
    // either misaligned or not yet decoded. Authoring with parent-prior
    // would silently stamp the whole parent uniformly — the May 2
    // corruption signature. Bail out: empty results, flag aborted.
    const OFF_IMAGE_ABORT_RATIO = 0.30;
    if (results.length > 0 && (offImageCount / results.length) > OFF_IMAGE_ABORT_RATIO){
      const ratio = (offImageCount / results.length).toFixed(2);
      console.warn(`[CoastScanner] ABORT parent (${col},${row}): ${offImageCount}/${results.length} cells off-image (ratio=${ratio}). Image alignment or load-state suspect.`);
      return {
        results: [],
        summary: {
          col, row,
          parentTerrain,
          parentIsWater,
          waterVariant,
          landVariant: parentIsWater ? landVariantForParent(parentTerrain, opts) : null,
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
    const MAX_PASSES = 10;
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
    const landVariant = landVariantForParent(parentTerrain, opts);
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
  function applyResults(results, opts){
    opts = opts || {};
    const overwriteAuthored = !!opts.overwriteAuthored;
    if (!window.GCCSubhexData) return { written: 0, skipped: 0, water: 0, land: 0, error: 'no data layer' };
    const SD = window.GCCSubhexData;
    const hasFastPath = (typeof SD.peekOverride === 'function' && typeof SD.flushOverrides === 'function');
    let written = 0, skipped = 0, waterW = 0, landW = 0;
    for (const r of results){
      if (!r.terrain) continue;
      if (r.alreadyAuthored && !overwriteAuthored){ skipped++; continue; }
      SD.setSubhexOverride(r.Q, r.R, { terrain: r.terrain }, hasFastPath ? { deferSave: true } : undefined);
      written++;
      if (r.isWater) waterW++;
      else           landW++;
    }
    if (hasFastPath) SD.flushOverrides();
    return { written, skipped, water: waterW, land: landW };
  }

  // ── Bulk scan helpers ───────────────────────────────────────────────
  // Three scopes:
  //   'water' — every parent whose terrain is a water variant
  //   'coast' — water + every land parent adjacent to a water parent
  //             (recommended; coastlines bleed across parent borders)
  //   'all'   — every parent on the map (slowest)
  // collectParents returns [{col, row, terrain}] for the chosen scope.

  function _isWaterTerrain(t){
    return !!t && (t === 'water' || t.startsWith('water_'));
  }

  // 6 axial neighbors of a parent hex on the odd-q offset grid. Falls
  // back to inline offsets if GCCPaths.neighborAcross isn't available
  // for some reason; the scanner shouldn't depend on path module load
  // order.
  function _parentNeighbors(col, row){
    if (window.GCCPaths && window.GCCPaths.neighborAcross){
      const out = [];
      for (let e = 0; e < 6; e++){
        out.push(window.GCCPaths.neighborAcross(col, row, e));
      }
      return out;
    }
    const isOdd = col & 1;
    const off = isOdd
      ? [[0,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]]
      : [[0,-1],[1,-1],[1,0],[0,1],[-1,0],[-1,-1]];
    return off.map(([dc,dr]) => ({col: col+dc, row: row+dr}));
  }

  function collectParents(scope){
    scope = scope || 'coast';
    const cols = (typeof window.GRID_COLS === 'number') ? window.GRID_COLS : 146;
    const rows = (typeof window.GRID_ROWS === 'number') ? window.GRID_ROWS : 97;
    const getT = (typeof window.getHexTerrain === 'function') ? window.getHexTerrain : null;
    if (!getT) return [];
    const all = [];
    for (let c = 0; c < cols; c++){
      for (let r = 0; r < rows; r++){
        all.push({ col: c, row: r, terrain: getT(c, r) });
      }
    }
    if (scope === 'all')   return all;
    if (scope === 'water') return all.filter(p => _isWaterTerrain(p.terrain));
    const waterSet = new Set();
    for (const p of all){
      if (_isWaterTerrain(p.terrain)) waterSet.add(`${p.col},${p.row}`);
    }
    return all.filter(p => {
      if (_isWaterTerrain(p.terrain)) return true;
      for (const nb of _parentNeighbors(p.col, p.row)){
        if (waterSet.has(`${nb.col},${nb.row}`)) return true;
      }
      return false;
    });
  }

  // Chunk parents and yield to the event loop between chunks so the
  // progress UI repaints. Returns aggregated results; per-parent
  // entries also keep their own results array for applyBulk.
  async function scanBulkAsync(parents, opts, onProgress){
    opts = opts || {};
    const out = {
      perParent: new Map(),
      totals: {
        parents: parents.length,
        cellsScanned: 0,
        water: 0, land: 0,
        sampleFails: 0,
        alreadyAuthored: 0,
        errors: 0,
        toWrite: 0,
        toWriteWater: 0,
        toWriteLand: 0,
      },
      cancelled: false,
    };
    const CHUNK = 8;
    for (let i = 0; i < parents.length; i += CHUNK){
      if (opts.shouldCancel && opts.shouldCancel()){
        out.cancelled = true;
        return out;
      }
      const slice = parents.slice(i, i + CHUNK);
      for (const p of slice){
        const r = scanParent(p.col, p.row, opts);
        if (r.error){ out.totals.errors++; continue; }
        out.perParent.set(`${p.col},${p.row}`, {
          col: p.col, row: p.row,
          results: r.results,
          summary: r.summary,
        });
        const s = r.summary;
        out.totals.cellsScanned    += s.cellCount;
        out.totals.water           += s.water;
        out.totals.land            += s.land;
        out.totals.sampleFails     += s.sampleFails;
        out.totals.alreadyAuthored += s.alreadyAuthored;
        out.totals.toWrite         += (s.toWrite      || 0);
        out.totals.toWriteWater    += (s.toWriteWater || 0);
        out.totals.toWriteLand     += (s.toWriteLand  || 0);
      }
      if (onProgress) onProgress(Math.min(i + CHUNK, parents.length), parents.length);
      await new Promise(res => setTimeout(res, 0));
    }
    return out;
  }

  // Write the override for every cell whose r.terrain is set across
  // all scanned parents. Includes land cells in water-typed parents
  // (where procedural fallback is water and would mis-render the cell).
  // Async + chunked for responsiveness; uses peekOverride for fast
  // prior-check and {deferSave:true} on every write with a single
  // flushOverrides at the end.
  async function applyBulk(scanData, opts, onProgress){
    opts = opts || {};
    const overwriteAuthored = !!opts.overwriteAuthored;
    if (!window.GCCSubhexData){
      return { error: 'no data layer', written: 0, skipped: 0, water: 0, land: 0, parentsAffected: 0, snapshot: [], cancelled: false };
    }
    const SD = window.GCCSubhexData;
    const hasFastPath = (typeof SD.peekOverride === 'function' && typeof SD.flushOverrides === 'function');
    let written = 0, skipped = 0, waterW = 0, landW = 0;
    const parentsAffected = new Set();
    const snapshot = [];
    // Flatten parent → cells-with-non-null-terrain for chunked iteration.
    const work = [];
    for (const [key, p] of scanData.perParent){
      const parentTerrain = (typeof window.getHexTerrain === 'function')
        ? window.getHexTerrain(p.col, p.row) : null;
      for (const r of p.results){
        if (!r.terrain) continue;
        work.push({ key, Q: r.Q, R: r.R, terrain: r.terrain, isWater: r.isWater, parentTerrain });
      }
    }
    const total = work.length;
    const WRITE_CHUNK = 2000;
    let cancelled = false;
    for (let i = 0; i < work.length; i += WRITE_CHUNK){
      if (opts.shouldCancel && opts.shouldCancel()){ cancelled = true; break; }
      const end = Math.min(i + WRITE_CHUNK, work.length);
      for (let j = i; j < end; j++){
        const w = work[j];
        let hadOverride = false, priorTerrain = null;
        if (hasFastPath){
          const peek = SD.peekOverride(w.Q, w.R);
          if (peek){
            hadOverride = true;
            priorTerrain = peek.terrain || null;
          }
        } else {
          const prior = SD.getSubhex(w.Q, w.R, w.parentTerrain);
          hadOverride = !!(prior && prior.source === 'authored');
          priorTerrain = hadOverride ? prior.terrain : null;
        }
        if (hadOverride && !overwriteAuthored){ skipped++; continue; }
        snapshot.push({ Q: w.Q, R: w.R, hadOverride, priorTerrain });
        SD.setSubhexOverride(w.Q, w.R, { terrain: w.terrain }, hasFastPath ? { deferSave: true } : undefined);
        written++;
        if (w.isWater) waterW++;
        else           landW++;
        parentsAffected.add(w.key);
      }
      if (onProgress) onProgress(end, total);
      await new Promise(res => setTimeout(res, 0));
    }
    if (hasFastPath) SD.flushOverrides();
    return {
      written, skipped,
      water: waterW, land: landW,
      parentsAffected: parentsAffected.size,
      snapshot,
      cancelled,
    };
  }

  async function undoBulk(snapshot, onProgress){
    if (!snapshot || !Array.isArray(snapshot)) return { restored: 0 };
    if (!window.GCCSubhexData) return { restored: 0, error: 'no data layer' };
    const SD = window.GCCSubhexData;
    const hasFastPath = (typeof SD.flushOverrides === 'function');
    const WRITE_CHUNK = 2000;
    let restored = 0;
    for (let i = 0; i < snapshot.length; i += WRITE_CHUNK){
      const end = Math.min(i + WRITE_CHUNK, snapshot.length);
      for (let j = i; j < end; j++){
        const s = snapshot[j];
        if (s.hadOverride){
          SD.setSubhexOverride(s.Q, s.R, { terrain: s.priorTerrain }, hasFastPath ? { deferSave: true } : undefined);
        } else {
          SD.clearSubhex(s.Q, s.R, hasFastPath ? { deferSave: true } : undefined);
        }
        restored++;
      }
      if (onProgress) onProgress(end, snapshot.length);
      await new Promise(res => setTimeout(res, 0));
    }
    if (hasFastPath) SD.flushOverrides();
    return { restored };
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
        <span style="display:flex; gap:10px; align-items:baseline;">
          <a id="cs-bulk-link" style="cursor:pointer; color:#c8a070; font-size:11px; text-transform:none; letter-spacing:0; text-decoration:underline;" title="Scan multiple parents at once">Bulk scan ▸</a>
          <span style="cursor:pointer; color:#c8a070; font-size:18px;" id="cs-close">×</span>
        </span>
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
    document.getElementById('cs-bulk-link').addEventListener('click', () => {
      closePreview();
      openBulkDialog();
    });
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

  // ── Bulk dialog UI ──────────────────────────────────────────────────
  // Three-phase dialog:
  //   1. Scope picker — pick water/coast/all, see live parent count
  //   2. Scan in progress — progress bar, cancel button
  //   3. Apply summary — totals, overwrite-authored toggle, Apply/Undo
  // Phase transitions update DOM in place so the modal doesn't flicker.
  let _bulkState = null;

  function openBulkDialog(){
    closeBulkDialog();
    closePreview();
    _bulkState = {
      scope: 'coast',
      phase: 'pick',          // 'pick' | 'scanning' | 'review' | 'applied'
      scanData: null,
      lastSnapshot: null,
      cancelRequested: false,
    };
    buildBulkDOM();
    refreshScopeCount();
  }

  function closeBulkDialog(){
    const ex = document.getElementById('coast-scanner-bulk-modal');
    if (ex) ex.remove();
    document.removeEventListener('keydown', _onBulkKey, true);
    _bulkState = null;
  }

  function _onBulkKey(e){
    if (e.key === 'Escape' && document.getElementById('coast-scanner-bulk-modal')){
      e.preventDefault(); e.stopPropagation();
      if (_bulkState && _bulkState.phase === 'scanning'){
        _bulkState.cancelRequested = true;
      } else {
        closeBulkDialog();
      }
    }
  }

  function buildBulkDOM(){
    const wrap = document.createElement('div');
    wrap.id = 'coast-scanner-bulk-modal';
    wrap.style.cssText = `
      position:fixed; top:50%; left:50%;
      transform:translate(-50%, -50%);
      background:#120900; color:#f4e8c4;
      border:1px solid #c8941a; border-radius:3px;
      padding:14px 16px; z-index:400;
      min-width:460px; max-width:560px;
      max-height:90vh; overflow-y:auto;
      box-shadow:0 10px 50px rgba(0,0,0,.85);
      font-family:'Crimson Text', Georgia, serif;
    `;
    wrap.innerHTML = `
      <div style="font-family:'Cinzel',serif; font-size:14px; color:#e8b840; letter-spacing:.06em; text-transform:uppercase; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #5a4a30; display:flex; justify-content:space-between; align-items:baseline;">
        <span>Coast Scanner · Bulk</span>
        <span style="cursor:pointer; color:#c8a070; font-size:18px;" id="csb-close">×</span>
      </div>
      <div id="csb-body"></div>
    `;
    document.body.appendChild(wrap);
    document.getElementById('csb-close').addEventListener('click', closeBulkDialog);
    document.addEventListener('keydown', _onBulkKey, true);
    renderBulkBody();
  }

  function renderBulkBody(){
    const body = document.getElementById('csb-body');
    if (!body || !_bulkState) return;
    if (_bulkState.phase === 'pick')     return renderBulkPick(body);
    if (_bulkState.phase === 'scanning') return renderBulkScanning(body);
    if (_bulkState.phase === 'review')   return renderBulkReview(body);
    if (_bulkState.phase === 'applying') return renderBulkApplying(body);
    if (_bulkState.phase === 'applied')  return renderBulkApplied(body);
    if (_bulkState.phase === 'undoing')  return renderBulkUndoing(body);
  }

  function renderBulkPick(body){
    body.innerHTML = `
      <div style="font-size:13px; line-height:1.5; margin-bottom:10px;">
        Scan multiple parent hexes at once and write water overrides
        across all of them. Uses default thresholds — for outliers,
        tune in the single-parent preview first.
      </div>
      <div style="font-size:12px; line-height:1.7; margin-bottom:10px;">
        <label style="display:block; cursor:pointer;">
          <input type="radio" name="csb-scope" value="water"> Water-only parents
          <span style="color:#a08a60; font-size:11px;">— inland seas, lakes</span>
        </label>
        <label style="display:block; cursor:pointer;">
          <input type="radio" name="csb-scope" value="coast" checked> Water + adjacent
          <span style="color:#a08a60; font-size:11px;">— coastlines (recommended)</span>
        </label>
        <label style="display:block; cursor:pointer;">
          <input type="radio" name="csb-scope" value="all"> Whole map
          <span style="color:#a08a60; font-size:11px;">— slowest, completeness</span>
        </label>
      </div>
      <div id="csb-count" style="font-size:13px; color:#c8a070; margin-bottom:12px;">—</div>
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button id="csb-cancel" style="background:transparent; color:#f4e8c4; border:1px solid #8b6a30; border-radius:3px; padding:6px 14px; font-family:inherit; font-size:13px; cursor:pointer;">Close</button>
        <button id="csb-scan" style="background:#5a3a0a; color:#f4e8c4; border:1px solid #c8941a; border-radius:3px; padding:6px 14px; font-family:inherit; font-size:13px; cursor:pointer; font-weight:600;">Scan</button>
      </div>
    `;
    document.getElementById('csb-cancel').addEventListener('click', closeBulkDialog);
    document.getElementById('csb-scan').addEventListener('click', onBulkScanClick);
    body.querySelectorAll('input[name="csb-scope"]').forEach(el => {
      el.addEventListener('change', () => {
        _bulkState.scope = el.value;
        refreshScopeCount();
      });
    });
  }

  function refreshScopeCount(){
    if (!_bulkState) return;
    const el = document.getElementById('csb-count');
    if (!el) return;
    const parents = collectParents(_bulkState.scope);
    _bulkState._cachedParents = parents;
    el.innerHTML = parents.length
      ? `Will scan <b style="color:#e8b840;">${parents.length.toLocaleString()}</b> parent${parents.length === 1 ? '' : 's'}.`
      : `<span style="color:#c87070;">No parents match this scope (map terrain not loaded?).</span>`;
  }

  async function onBulkScanClick(){
    if (!_bulkState) return;
    const parents = _bulkState._cachedParents || collectParents(_bulkState.scope);
    if (!parents.length) return;
    _bulkState.phase = 'scanning';
    _bulkState.cancelRequested = false;
    renderBulkBody();
    const t0 = performance.now();
    const result = await scanBulkAsync(parents, {
      shouldCancel: _bulkShouldCancel,
    }, (done, total) => {
      const bar = document.getElementById('csb-progress-bar');
      const lbl = document.getElementById('csb-progress-label');
      if (bar) bar.style.width = `${(done / total) * 100}%`;
      if (lbl) lbl.textContent = `${done.toLocaleString()} / ${total.toLocaleString()} parents`;
    });
    _bulkState.scanData = result;
    _bulkState.elapsedMs = performance.now() - t0;
    _bulkState.phase = result.cancelled ? 'pick' : 'review';
    if (result.cancelled){
      renderBulkBody();
      const c = document.getElementById('csb-count');
      if (c) c.innerHTML = `<span style="color:#c87070;">Scan cancelled.</span>`;
      return;
    }
    renderBulkBody();
  }

  // shouldCancel wiring — separate function so scanBulkAsync can poll
  // it without _bulkState being captured at call time.
  function _bulkShouldCancel(){
    return !!(_bulkState && _bulkState.cancelRequested);
  }

  function renderBulkScanning(body){
    body.innerHTML = `
      <div style="font-size:13px; line-height:1.5; margin-bottom:10px;">Scanning…</div>
      <div style="height:14px; background:#2a1a08; border:1px solid #5a4a30; border-radius:2px; overflow:hidden; margin-bottom:6px;">
        <div id="csb-progress-bar" style="height:100%; width:0%; background:linear-gradient(90deg,#c8941a,#e8b840); transition:width .2s;"></div>
      </div>
      <div id="csb-progress-label" style="font-size:11px; color:#c8a070; margin-bottom:12px;">starting…</div>
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button id="csb-cancel-scan" style="background:transparent; color:#f4e8c4; border:1px solid #8b6a30; border-radius:3px; padding:6px 14px; font-family:inherit; font-size:13px; cursor:pointer;">Cancel</button>
      </div>
    `;
    document.getElementById('csb-cancel-scan').addEventListener('click', () => {
      if (_bulkState) _bulkState.cancelRequested = true;
    });
  }

  function renderBulkReview(body){
    const sd = _bulkState.scanData;
    const t = sd.totals;
    const elapsed = (_bulkState.elapsedMs / 1000).toFixed(1);
    // toWrite = cells scanParent flagged for authoring (water everywhere
    // + land cells inside water-typed parents). alreadyAuthored is the
    // overlap of those with existing overrides — they're skipped unless
    // overwriteAuthored is checked.
    const candidateWrites = t.toWrite;
    const skippedAlready  = t.alreadyAuthored;
    const landBreakdown = (t.toWriteLand > 0)
      ? ` (${t.toWriteWater.toLocaleString()} water + ${t.toWriteLand.toLocaleString()} land)`
      : '';
    body.innerHTML = `
      <div style="font-size:13px; line-height:1.5; margin-bottom:10px;">
        Scanned <b>${t.parents.toLocaleString()}</b> parents in ${elapsed}s.
      </div>
      <div style="font-size:12px; line-height:1.6; margin-bottom:10px; padding:8px; background:#1a0e02; border:1px solid #5a4a30; border-radius:2px;">
        <div><b>${t.cellsScanned.toLocaleString()}</b> cells classified</div>
        <div style="color:#9adfff;">${t.water.toLocaleString()} water</div>
        <div style="color:#e8c890;">${t.land.toLocaleString()} land</div>
        ${t.sampleFails ? `<div style="color:#c87070;">${t.sampleFails} sample fail</div>` : ''}
        ${t.errors ? `<div style="color:#c87070;">${t.errors} parent errors (skipped)</div>` : ''}
      </div>
      <div style="font-size:12px; line-height:1.6; margin-bottom:10px;">
        <label style="cursor:pointer; user-select:none;">
          <input type="checkbox" id="csb-overwrite"> Overwrite already-authored cells
          ${skippedAlready ? `<span style="color:#a08a60;"> (${skippedAlready.toLocaleString()} would be affected)</span>` : ''}
        </label>
      </div>
      <div id="csb-write-summary" style="font-size:13px; color:#c8a070; margin-bottom:12px;"></div>
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button id="csb-back" style="background:transparent; color:#f4e8c4; border:1px solid #8b6a30; border-radius:3px; padding:6px 14px; font-family:inherit; font-size:13px; cursor:pointer;">Back</button>
        <button id="csb-apply" style="background:#5a3a0a; color:#f4e8c4; border:1px solid #c8941a; border-radius:3px; padding:6px 14px; font-family:inherit; font-size:13px; cursor:pointer; font-weight:600;">Apply</button>
      </div>
    `;
    const updateWriteSummary = () => {
      const ow = document.getElementById('csb-overwrite').checked;
      const writes = ow ? candidateWrites : Math.max(0, candidateWrites - skippedAlready);
      const skipMsg = ow ? '' : ` (${skippedAlready.toLocaleString()} already-authored will be skipped)`;
      document.getElementById('csb-write-summary').innerHTML =
        `Will write <b style="color:#e8b840;">${writes.toLocaleString()}</b> override${writes === 1 ? '' : 's'}${landBreakdown}${skipMsg}.`;
    };
    updateWriteSummary();
    document.getElementById('csb-overwrite').addEventListener('change', updateWriteSummary);
    document.getElementById('csb-back').addEventListener('click', () => {
      _bulkState.phase = 'pick';
      _bulkState.scanData = null;
      renderBulkBody();
      refreshScopeCount();
    });
    document.getElementById('csb-apply').addEventListener('click', onBulkApplyClick);
  }

  async function onBulkApplyClick(){
    if (!_bulkState || !_bulkState.scanData) return;
    const overwriteAuthored = document.getElementById('csb-overwrite').checked;
    _bulkState.phase = 'applying';
    _bulkState.applyTotal = 0;
    _bulkState.applyDone = 0;
    renderBulkBody();
    const out = await applyBulk(_bulkState.scanData, {
      overwriteAuthored,
      shouldCancel: _bulkShouldCancel,
    }, (done, total) => {
      const bar = document.getElementById('csb-progress-bar');
      const lbl = document.getElementById('csb-progress-label');
      if (bar) bar.style.width = `${(done / Math.max(1,total)) * 100}%`;
      if (lbl) lbl.textContent = `${done.toLocaleString()} / ${total.toLocaleString()} cells`;
    });
    if (!_bulkState) return;
    _bulkState.lastSnapshot = out.snapshot;
    _bulkState.applyResult = out;
    _bulkState.phase = 'applied';
    renderBulkBody();
    window.dispatchEvent(new CustomEvent('gcc-subhex-changed', { detail: { reason: 'coast-scanner-bulk' } }));
  }

  function renderBulkApplying(body){
    body.innerHTML = `
      <div style="font-size:13px; line-height:1.5; margin-bottom:10px;">Writing overrides…</div>
      <div style="height:14px; background:#2a1a08; border:1px solid #5a4a30; border-radius:2px; overflow:hidden; margin-bottom:6px;">
        <div id="csb-progress-bar" style="height:100%; width:0%; background:linear-gradient(90deg,#c8941a,#e8b840); transition:width .2s;"></div>
      </div>
      <div id="csb-progress-label" style="font-size:11px; color:#c8a070; margin-bottom:12px;">starting…</div>
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button id="csb-cancel-apply" style="background:transparent; color:#f4e8c4; border:1px solid #8b6a30; border-radius:3px; padding:6px 14px; font-family:inherit; font-size:13px; cursor:pointer;">Cancel</button>
      </div>
    `;
    document.getElementById('csb-cancel-apply').addEventListener('click', () => {
      if (_bulkState) _bulkState.cancelRequested = true;
    });
  }

  function renderBulkApplied(body){
    const out = _bulkState.applyResult;
    const cancelMsg = out.cancelled ? `<div style="color:#c87070; margin-top:6px;">Cancelled mid-apply — partial write captured. Undo will roll back what was written.</div>` : '';
    const breakdown = (out.land > 0)
      ? ` (<span style="color:#9adfff;">${out.water.toLocaleString()} water</span> + <span style="color:#e8c890;">${out.land.toLocaleString()} land</span>)`
      : '';
    body.innerHTML = `
      <div style="font-size:13px; line-height:1.6; margin-bottom:12px; padding:10px; background:#1a0e02; border:1px solid #5a4a30; border-radius:2px;">
        Wrote <b style="color:#e8b840;">${out.written.toLocaleString()}</b> override${out.written === 1 ? '' : 's'}${breakdown}
        across <b>${out.parentsAffected.toLocaleString()}</b> parent${out.parentsAffected === 1 ? '' : 's'}.
        ${out.skipped ? `<br><span style="color:#a08a60;">${out.skipped.toLocaleString()} already-authored cell${out.skipped === 1 ? '' : 's'} skipped.</span>` : ''}
        ${cancelMsg}
      </div>
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button id="csb-undo" style="background:transparent; color:#f4e8c4; border:1px solid #c87070; border-radius:3px; padding:6px 14px; font-family:inherit; font-size:13px; cursor:pointer;" ${out.written ? '' : 'disabled style="opacity:.4;"'}>Undo</button>
        <button id="csb-done" style="background:#5a3a0a; color:#f4e8c4; border:1px solid #c8941a; border-radius:3px; padding:6px 14px; font-family:inherit; font-size:13px; cursor:pointer; font-weight:600;">Close</button>
      </div>
    `;
    document.getElementById('csb-done').addEventListener('click', closeBulkDialog);
    document.getElementById('csb-undo').addEventListener('click', onBulkUndoClick);
  }

  async function onBulkUndoClick(){
    if (!_bulkState || !_bulkState.lastSnapshot) return;
    _bulkState.phase = 'undoing';
    renderBulkBody();
    const r = await undoBulk(_bulkState.lastSnapshot, (done, total) => {
      const bar = document.getElementById('csb-progress-bar');
      const lbl = document.getElementById('csb-progress-label');
      if (bar) bar.style.width = `${(done / Math.max(1,total)) * 100}%`;
      if (lbl) lbl.textContent = `${done.toLocaleString()} / ${total.toLocaleString()} cells`;
    });
    window.dispatchEvent(new CustomEvent('gcc-subhex-changed', { detail: { reason: 'coast-scanner-bulk-undo' } }));
    alert(`Restored ${r.restored.toLocaleString()} cell${r.restored === 1 ? '' : 's'}.`);
    closeBulkDialog();
  }

  function renderBulkUndoing(body){
    body.innerHTML = `
      <div style="font-size:13px; line-height:1.5; margin-bottom:10px;">Restoring…</div>
      <div style="height:14px; background:#2a1a08; border:1px solid #5a4a30; border-radius:2px; overflow:hidden; margin-bottom:6px;">
        <div id="csb-progress-bar" style="height:100%; width:0%; background:linear-gradient(90deg,#c87070,#e8a8a8); transition:width .2s;"></div>
      </div>
      <div id="csb-progress-label" style="font-size:11px; color:#c8a070; margin-bottom:12px;">starting…</div>
    `;
  }

  // ── Public surface ──────────────────────────────────────────────────
  window.GCCCoastScanner = {
    DEFAULT_THRESHOLDS,
    DEFAULT_LAND_THRESHOLDS,
    SOURCE_TAG,
    rgbToHsv, isWaterRgb, classifyPixel, svgToImagePixel,
    waterVariantForParent, landVariantForParent,
    scanParent, applyResults,
    openPreview, closePreview,
    // Bulk
    collectParents, scanBulkAsync, applyBulk, undoBulk,
    openBulkDialog, closeBulkDialog,
  };

  // ── Toolbar button auto-wire ────────────────────────────────────────
  function wireButton(){
    const btn = document.getElementById('btn-coast-scan');
    if (!btn) return false;
    if (btn.dataset.coastWired) return true;
    btn.dataset.coastWired = '1';
    btn.addEventListener('click', () => {
      // Context-aware: with a hex selected, scan that one (existing
      // single-parent flow). With nothing selected, open the bulk
      // dialog so the user can scan whole-map / coast / water-only.
      const s = window.state;
      const col = s ? s.selectedCol : null;
      const row = s ? s.selectedRow : null;
      if (col == null || row == null){
        openBulkDialog();
        return;
      }
      openPreview(col, row);
    });
    return true;
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', wireButton);
  } else {
    wireButton();
  }
})();
