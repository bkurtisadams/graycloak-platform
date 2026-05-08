// gcc-edge-modes.js v0.3.0 — 2026-05-03
// v0.3.0 — River mode adds sampleStrategy='any-water'. Darlene
//          rivers are 1-2 pixels wide; averaging across a 5×5
//          window dilutes them past detection. Per-pixel
//          classification with any-water-pixel-wins recovers
//          thin features.
// v0.2.1 — River mode now sets resolveAmbiguous='direct-only' so
//          the scanner's pass-2 neighbor-majority resolution is
//          skipped. Rivers are intentionally thin (1-2 subhex cells
//          wide) and majority-vote was flipping every river cell
//          to land via its 5-of-6 land neighbors.
// v0.2.0 — added River mode (shares Coast HSV classifier; differs
//          only in variant naming).
// v0.1.0 — initial Coast mode definition.
// Mode definitions for the Edges scanner. Each mode is a plug-in
// classifier+writer object consumed by gcc-edge-scanner. A mode owns:
//   - threshold defaults
//   - the per-pixel classify() that returns one of three classes
//     ('A' / 'B' / 'ambiguous'), but for Coast the legacy literal
//     strings 'water'/'land' are used since the canvas viz, summary
//     copy, and pass-2 majority logic in gcc-edge-scanner are still
//     written in those terms. Future modes (Forest, Jungle) will
//     either reuse the literals as opaque labels or we'll abstract
//     to A/B at slice 5 when the second mode lands.
//   - variantFor() that decides what override value to write per
//     resolved class, returning null for cells the procedural
//     fallback already gets right (redundancy skip).
//   - axis: 'terrain' for Coast/River; 'overlay' for Forest/Jungle
//     (slice 5+) — drives which subhex schema slot applyResults
//     writes to.
//   - source tag, persisted on each authored cell so we can later
//     distinguish scanner-written cells from hand edits.
//
// Slice 1 ships only the Coast mode (port of the pre-v0.5.0
// hardcoded logic out of gcc-coast-scanner.js). Slice 4 will add
// any Coast-specific tweaks; slices 5–6 add Forest, River, Jungle.

(function(){
  'use strict';

  // ── Color utilities ────────────────────────────────────────────────
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
  function passesThreshold(h, s, v, T){
    return h >= T.hMin && h <= T.hMax
        && s >= T.sMin && s <= T.sMax
        && v >= T.vMin && v <= T.vMax;
  }

  // ── Coast mode ─────────────────────────────────────────────────────
  // Water threshold — anything in the blue hue band with even a tiny
  // saturation tint, except pure white. Catches both saturated sea
  // blues (Nyr Dyv proper) and Darlene's near-white lake interior
  // (Whyestil's western fingers in plains/forest parents). The hue
  // band excludes parchment (yellow ~50°) so the very-low saturation
  // floor doesn't pick up cream/tan. Bounds are slightly margined
  // (sMin 0.015 not 0.02; vMax 0.99 not 0.98) to admit pixels right
  // at the boundary that compute as e.g. S=0.0199 due to FP rounding.
  const COAST_WATER_T = {
    hMin: 180, hMax: 240,
    sMin: 0.015, sMax: 1.00,
    vMin: 0.30,  vMax: 0.99,
  };
  // Land threshold — anything clearly green/brown/yellow-tan is
  // "definitely land". Together with COAST_WATER_T, the remaining
  // pixels are 'ambiguous' and resolved by the scanner's pass-2
  // neighbor majority + parent-prior fallback. Defaults catch
  // forest/hills/plains/mountain/Darlene-pale-tan hues (earthy
  // browns from ~20°, greens through ~110°, V up to 0.92 to
  // include Darlene's pale-bright land coloring without grabbing
  // pure-white coast pixels at V≈0.98).
  const COAST_LAND_T = {
    hMin: 20, hMax: 110,
    sMin: 0.15, sMax: 1.00,
    vMin: 0.10, vMax: 0.92,
  };

  // Tri-state classification. 'ambiguous' means neither water nor
  // land threshold matched — the scanner resolves via parent-terrain
  // tiebreaker. Order matters: water first because some water hues
  // overlap loosely with land hues at the edges.
  function coastClassify(rgb, T, TL){
    T  = T  || COAST_WATER_T;
    TL = TL || COAST_LAND_T;
    const { h, s, v } = rgbToHsv(rgb.r, rgb.g, rgb.b);
    if (passesThreshold(h, s, v, T))  return 'water';
    if (passesThreshold(h, s, v, TL)) return 'land';
    return 'ambiguous';
  }

  // Pick the right water variant for a subhex based on the parent's
  // terrain. Identity if the parent is itself a water terrain; falls
  // back to water_fresh for inland (forest/plains/etc.) parents that
  // contain small lakes.
  function waterVariantForParent(parentTerrain){
    if (!parentTerrain) return 'water_fresh';
    if (parentTerrain === 'water')          return 'water_coastal';
    if (parentTerrain.startsWith('water_')) return parentTerrain;
    return 'water_fresh';
  }

  // Default land variant inside a water-typed parent. Plains is safe;
  // future enhancement could pick by pixel hue (greens → forest_oak,
  // browns → hills, tan → plains).
  const DEFAULT_LAND_VARIANT = 'plains';
  function landVariantForParent(parentTerrain, opts){
    return (opts && opts.landVariant) || DEFAULT_LAND_VARIANT;
  }

  // Resolve a class to its variant *label* — always returns the
  // literal variant string (e.g. 'water_coastal', 'plains'). The
  // redundancy decision (skip when procedural fallback already
  // produces the right terrain) lives in gcc-edge-scanner.js's
  // scanParent for now. Slice 5 will lift that into the mode when
  // Forest needs its own skip rule (skip if parent is forest_*).
  function coastVariantFor(parentTerrain, klass, opts){
    if (klass === 'water') return waterVariantForParent(parentTerrain);
    if (klass === 'land')  return landVariantForParent(parentTerrain, opts);
    return null;
  }

  const coast = {
    id: 'coast',
    label: 'Coast',
    glyph: '🌊',
    axis: 'terrain',
    classes: ['water', 'land'],
    defaultThreshold:     COAST_WATER_T,
    defaultLandThreshold: COAST_LAND_T,
    classify:    coastClassify,
    variantFor:  coastVariantFor,
    source: 'scanner-coast-v1',
  };

  // ── River mode ─────────────────────────────────────────────────────
  // River shares Coast's classifier (water vs land via HSV thresholds —
  // a river pixel on Darlene reads as water exactly the same way a
  // coastline pixel does). What's different is the *variant* River
  // writes: water cells inside a river-flagged parent always become
  // water_fresh regardless of the parent's terrain, because rivers
  // are inland watercourses cutting through forest/plains/hills/
  // mountain parents — never coastal/inland-sea. Land variant rule
  // also differs: a river-flagged parent's effective terrain IS the
  // parent's terrain (forest, plains, hills…), so land cells should
  // get the parent's terrain, not the Coast-mode plains default.
  //
  // Pulled forward from slice 6 because Coast and River share the
  // classifier — the only river-specific bit is variantFor.
  function riverVariantFor(parentTerrain, klass, opts){
    if (klass === 'water') return 'water_fresh';
    if (klass === 'land'){
      // Land inside a river-flagged parent = whatever the parent
      // already is. Avoids stamping 'plains' on a forest river hex.
      return parentTerrain || 'plains';
    }
    return null;
  }
  const river = {
    id: 'river',
    label: 'River',
    glyph: '🏞',
    axis: 'terrain',
    classes: ['water', 'land'],
    defaultThreshold:     COAST_WATER_T,
    defaultLandThreshold: COAST_LAND_T,
    classify:    coastClassify,        // same HSV classifier
    variantFor:  riverVariantFor,
    source: 'scanner-river-v1',
    // Per-pixel sampling instead of 5x5 averaging. Darlene rivers
    // are 1-2 pixels wide; averaging dilutes a single river pixel
    // among 24 surrounding land pixels and the result fails the
    // water threshold. With 'any-water', the cell is classified
    // water if ANY pixel in the sampling window passes water.
    sampleStrategy: 'any-water',
    // River-specific: do NOT use neighbor-majority resolution. Coast
    // mode assumes water/land regions are large and contiguous, so
    // ambiguous cells safely resolve via 6-neighbor vote. Rivers are
    // intentionally thin (1-2 subhex cells wide), so a river cell
    // surrounded by 5 land cells would be flipped to land by majority
    // — exactly the wrong behavior. River mode trusts direct
    // classifications only: water cells stay water, land cells stay
    // land, ambiguous cells fall through to parent prior (which for
    // River means parent-terrain land — the correct fallback for
    // mixed pixels along the river bank).
    resolveAmbiguous: 'direct-only',
  };

  // ── Public surface ─────────────────────────────────────────────────
  window.GCCEdgeModes = {
    coast, river,
    list: [coast, river],   // grows as Forest/Jungle land
    byId: { coast, river },
    // Helpers re-exported for the scanner's preview-dialog use and
    // for tests:
    rgbToHsv, passesThreshold,
    waterVariantForParent, landVariantForParent,
  };
})();
