// gcc-lost.js v0.1.0 — 2026-05-04
// DMG p.49 "Becoming Lost" engine. Pure-logic library — no rendering,
// no UI, no journey-planner wiring. Downstream callers (the journey
// planner, GM "what does the party think they see?" view, etc.) feed
// it terrain + party-profile flags + a route hint and get back either
// "no roll, here's why" or "rolled, here's the deviation."
//
// Source of truth: docs/rules/movement.md "Becoming Lost" section.
// Per-terrain chance, deviation tables, and the four gates are all
// captured there. When code and rules disagree, code is wrong.
//
// Public surface:
//   GCCLost.checkAndRoll(opts) → result
//   GCCLost.terrainCategory(terrain) → string|null
//   GCCLost.chanceFor(terrain) → 0..10
//   GCCLost.LOST_CATEGORIES — table for inspection
//
// API design notes:
//   - Caller is responsible for resolving terrain (e.g. via
//     GCCSubhexData.getSubhex). The lib doesn't reach into other
//     modules so it stays unit-testable in node.
//   - opts.rng defaults to Math.random; tests pass a deterministic
//     stub.
//   - Gates short-circuit in priority order:
//       water  → no land-lost rules apply (DMG sea-travel uses
//                separate rules — out of v1 scope)
//       guide  → DMG p.49 gate 1
//       path   → DMG p.49 gate 2 (following well-defined course)
//       map    → DMG p.49 gate 3 (correct map in hand)
//       mapped → DMG p.49 gate 4 (destination already explored)
//       unknown→ defensive (terrain not in category table)
//   - Result shape encodes the *why* on every path so the journey
//     planner UI can show "no roll: party has guide" / "rolled but
//     made it" / "lost: drift 60° R".

(function(){
  'use strict';

  // ── Terrain → DMG Lost category ─────────────────────────────────────
  // The DMG table uses 8 categories; GCC terrain has more granularity
  // (forest_oak, forest_pine, etc.). Map each GCC terrain to its
  // DMG-equivalent category. Returns null for water/urban/road
  // (no-roll terrains).
  const TERRAIN_TO_CATEGORY = {
    // Plain (1/10, 60° L/R)
    plains:        'plain',
    grasslands:    'plain',

    // Scrub (3/10, 60° L/R)
    scrub:         'scrub',
    barrens:       'scrub',

    // Forest (7/10, any-direction)
    forest:        'forest',
    forest_oak:    'forest',
    forest_pine:   'forest',
    hardwood:      'forest',
    conifer:       'forest',
    jungle:        'forest',   // jungle = heavy forest per WoG glossary

    // Desert (4/10, 60° L/R)
    desert:        'desert',
    dust:          'desert',

    // Hills (2/10, 60° L/R)
    hills:         'hills',
    forest_hills:  'hills',    // forested hills — terrain-driving feature is hill

    // Mountains (5/10, 60°/120° L/R)
    mountains:     'mountains',

    // Marsh (6/10, any-direction)
    marsh:         'marsh',
    swamp:         'marsh',

    // Water — no land-lost rule. Water travel has its own navigation
    // rules (DMG seamanship), out of scope for v1. Returning null
    // surfaces blockedBy='water' from checkAndRoll.
    water:         null,
    water_fresh:   null,
    water_coastal: null,
    water_inland_sea: null,
    // Urban / road — gate 2 (following a course) closes; no roll.
    // Mapped here as null so the lib's terrainCategory() lookup is
    // exhaustive over GCC terrains and we don't fall through to the
    // generic unknown-terrain path.
    village:       null,
    town:          null,
    city:          null,
  };

  // ── DMG category metadata ───────────────────────────────────────────
  // chance is in 1d10 (DMG: "x in 10"). deviation is the deviation
  // distribution to roll if the chance hits.
  //   '60lr'   — d6, 1-3=L, 4-6=R; magnitude always 60°
  //   '60-120' — same side roll, plus a magnitude roll: d6, 1-3=60°,
  //              4-6=120°
  //   'any'    — d6 mapped to 60°R / 120°R / 180° / 120°L / 60°L
  const LOST_CATEGORIES = {
    plain:     { chance: 1, deviation: '60lr'   },
    scrub:     { chance: 3, deviation: '60lr'   },
    forest:    { chance: 7, deviation: 'any'    },
    rough:     { chance: 3, deviation: '60lr'   },
    desert:    { chance: 4, deviation: '60lr'   },
    hills:     { chance: 2, deviation: '60lr'   },
    mountains: { chance: 5, deviation: '60-120' },
    marsh:     { chance: 6, deviation: 'any'    },
  };

  function terrainCategory(terrain){
    if (terrain == null) return null;
    if (terrain in TERRAIN_TO_CATEGORY) return TERRAIN_TO_CATEGORY[terrain];
    return undefined;   // signals "unknown to mapping" vs. "deliberately null"
  }
  function chanceFor(terrain){
    const cat = terrainCategory(terrain);
    if (!cat) return 0;
    return LOST_CATEGORIES[cat].chance;
  }

  // ── Dice ───────────────────────────────────────────────────────────
  function _d(rng, sides){
    return Math.floor(rng() * sides) + 1;
  }

  // ── Deviation rolls ─────────────────────────────────────────────────
  // Returns { rel, degrees } where rel is one of:
  //   'left'           — purely 60° or 120° to the left of intended
  //   'right'          — purely 60° or 120° to the right
  //   'ahead-right'    — 60° R (any-direction table)
  //   'behind-right'   — 120° R (any-direction table)
  //   'behind'         — 180° (any-direction table)
  //   'behind-left'    — 120° L (any-direction table)
  //   'ahead-left'     — 60° L (any-direction table)
  // The 60lr / 60-120 categories use 'left'/'right' (these *are*
  // forward-quadrant deviations; they don't go behind). The any-
  // direction table is the only one that produces 180° or rear
  // quadrants. By design (per DMG): no result returns the intended
  // heading — being lost means you went somewhere other than where
  // you tried.
  function _rollDeviation(distribution, rng){
    if (distribution === '60lr'){
      const side = _d(rng, 6);
      return {
        rel: side <= 3 ? 'left' : 'right',
        degrees: 60,
      };
    }
    if (distribution === '60-120'){
      const side = _d(rng, 6);
      const mag  = _d(rng, 6);
      return {
        rel: side <= 3 ? 'left' : 'right',
        degrees: mag <= 3 ? 60 : 120,
      };
    }
    if (distribution === 'any'){
      // d6 read clockwise from intended (12 o'clock):
      //   1: 60° R  (right ahead)
      //   2: 120° R (right behind)
      //   3-4: 180° (directly behind)
      //   5: 120° L (left behind)
      //   6: 60° L  (left ahead)
      const r = _d(rng, 6);
      switch (r){
        case 1: return { rel: 'ahead-right',  degrees:  60 };
        case 2: return { rel: 'behind-right', degrees: 120 };
        case 3:
        case 4: return { rel: 'behind',       degrees: 180 };
        case 5: return { rel: 'behind-left',  degrees: 120 };
        case 6: return { rel: 'ahead-left',   degrees:  60 };
      }
    }
    // Defensive — should never reach here.
    return { rel: 'unknown', degrees: 0 };
  }

  // ── Gate checks ─────────────────────────────────────────────────────
  // Priority order matches the DMG: any single failed gate closes the
  // roll entirely (gate-not-modifier — a guide doesn't reduce the
  // chance, it eliminates it). We check in priority order so the
  // returned blockedBy is stable and informative.
  function _checkGates(opts){
    if (opts.terrain == null) return 'unknown';
    const cat = terrainCategory(opts.terrain);
    if (cat === null)         return 'water';     // includes urban
    if (cat === undefined)    return 'unknown';   // terrain not in map
    if (opts.hasGuide)        return 'guide';
    if (opts.followingPath)   return 'path';
    if (opts.hasMap)          return 'map';
    if (opts.destinationRevealed) return 'mapped';
    return null;   // all gates open
  }

  // ── Public: checkAndRoll ────────────────────────────────────────────
  function checkAndRoll(opts){
    opts = opts || {};
    const rng = (typeof opts.rng === 'function') ? opts.rng : Math.random;
    const blockedBy = _checkGates(opts);
    if (blockedBy){
      return { rolled: false, blockedBy };
    }
    const cat = terrainCategory(opts.terrain);
    const meta = LOST_CATEGORIES[cat];
    const chance = meta.chance;
    const roll   = _d(rng, 10);
    if (roll > chance){
      return { rolled: true, lost: false, chance, roll };
    }
    const deviation = _rollDeviation(meta.deviation, rng);
    return { rolled: true, lost: true, chance, roll, deviation, category: cat };
  }

  // ── Export ─────────────────────────────────────────────────────────
  const api = {
    checkAndRoll,
    terrainCategory,
    chanceFor,
    LOST_CATEGORIES,
    TERRAIN_TO_CATEGORY,
  };
  if (typeof window !== 'undefined') window.GCCLost = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
