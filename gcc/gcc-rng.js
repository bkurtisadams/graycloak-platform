// gcc-rng.js v0.1.0 — 2026-04-28
// Deterministic seeded RNG used by procedural map content (subhexes today;
// 1mi cells, encounter rolls, generated dungeons later). cyrb53 turns any
// string-keyed tuple into a uint32; mulberry32 expands that uint32 into
// a deterministic stream. Seed-derived only — no Date/Math.random anywhere.
//
// Usage:
//   const seed = GCCRng.seedFor(WORLD_SEED, parentId, 'subhex', q, r);
//   const rng  = GCCRng.mulberry32(seed);
//   const t    = GCCRng.pickWeighted(rng, { forest: 4, hills: 1 });

(function(){
  'use strict';

  function cyrb53(str, seed){
    seed = (seed | 0);
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++){
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)) >>> 0;
  }

  function mulberry32(seed){
    let s = seed >>> 0;
    return function(){
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seedFor(){
    const parts = new Array(arguments.length);
    for (let i = 0; i < arguments.length; i++) parts[i] = String(arguments[i]);
    return cyrb53(parts.join('|'), 0);
  }

  function pickWeighted(rng, table){
    let total = 0;
    const keys = Object.keys(table);
    for (const k of keys) total += table[k];
    if (total <= 0) return keys[0];
    let roll = rng() * total;
    for (const k of keys){
      roll -= table[k];
      if (roll <= 0) return k;
    }
    return keys[keys.length - 1];
  }

  function chance(rng, p){ return rng() < p; }

  function int(rng, min, max){ return Math.floor(rng() * (max - min + 1)) + min; }

  window.GCCRng = { cyrb53, mulberry32, seedFor, pickWeighted, chance, int };
})();
