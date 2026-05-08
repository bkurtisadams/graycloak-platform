// test-lost.js — slice 5 (Lost engine) coverage
// Run: cd /home/claude/out && node test-lost.js
//
// Verifies gcc-lost:
//   - terrainCategory() maps every GCC terrain to a DMG category (or
//     intentional null for water/urban)
//   - chanceFor() returns the right per-terrain chance
//   - _checkGates priority order matches DMG (water > guide > path >
//     map > mapped > unknown)
//   - checkAndRoll's three deviation distributions (60lr, 60-120, any)
//     produce the documented roll → result mappings
//   - rolled-but-not-lost path returns the right shape
//   - Defensive: terrain=null, terrain=unknown-string

const L = require('./gcc-lost.js');

let passes = 0, fails = 0;
function assert(cond, msg){ cond ? passes++ : (fails++, console.error('  FAIL:', msg)); }
function assertEq(a, b, msg){ assert(JSON.stringify(a) === JSON.stringify(b), `${msg}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); }
function section(name){ console.log(`\n── ${name} ──`); }

// Deterministic RNG that returns successive scripted values in [0,1).
// Each call returns the next value; throws if exhausted.
function scriptedRng(values){
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error('scripted rng exhausted');
    return values[i++];
  };
}
// Helper: rng value that produces _d(sides) === N
function dToRng(N, sides){
  // _d returns floor(rng * sides) + 1, so for result N we need
  //   N - 1 <= rng * sides < N
  //   (N - 1) / sides <= rng < N / sides
  // Pick the midpoint to avoid floor-boundary issues.
  return ((N - 1) + 0.5) / sides;
}

// ── 1. terrainCategory mapping ────────────────────────────────────────
section('terrainCategory mapping');
{
  // Plain
  assert(L.terrainCategory('plains')          === 'plain',     'plains → plain');
  assert(L.terrainCategory('grasslands')      === 'plain',     'grasslands → plain');
  // Scrub
  assert(L.terrainCategory('scrub')           === 'scrub',     'scrub → scrub');
  assert(L.terrainCategory('barrens')         === 'scrub',     'barrens → scrub');
  // Forest (incl. jungle)
  assert(L.terrainCategory('forest')          === 'forest',    'forest → forest');
  assert(L.terrainCategory('forest_oak')      === 'forest',    'forest_oak → forest');
  assert(L.terrainCategory('forest_pine')     === 'forest',    'forest_pine → forest');
  assert(L.terrainCategory('hardwood')        === 'forest',    'hardwood → forest');
  assert(L.terrainCategory('conifer')         === 'forest',    'conifer → forest');
  assert(L.terrainCategory('jungle')          === 'forest',    'jungle → forest (heavy forest per WoG)');
  // Desert
  assert(L.terrainCategory('desert')          === 'desert',    'desert → desert');
  assert(L.terrainCategory('dust')            === 'desert',    'dust → desert');
  // Hills
  assert(L.terrainCategory('hills')           === 'hills',     'hills → hills');
  assert(L.terrainCategory('forest_hills')    === 'hills',     'forest_hills → hills');
  // Mountains
  assert(L.terrainCategory('mountains')       === 'mountains', 'mountains → mountains');
  // Marsh
  assert(L.terrainCategory('marsh')           === 'marsh',     'marsh → marsh');
  assert(L.terrainCategory('swamp')           === 'marsh',     'swamp → marsh');
  // Water — intentional null (no land-lost rules)
  assert(L.terrainCategory('water')           === null,        'water → null');
  assert(L.terrainCategory('water_fresh')     === null,        'water_fresh → null');
  assert(L.terrainCategory('water_coastal')   === null,        'water_coastal → null');
  assert(L.terrainCategory('water_inland_sea')=== null,        'water_inland_sea → null');
  // Urban — also null (gate 2 closes; no roll)
  assert(L.terrainCategory('village')         === null,        'village → null');
  assert(L.terrainCategory('town')            === null,        'town → null');
  assert(L.terrainCategory('city')            === null,        'city → null');
  // Unknown — undefined (deliberately not in map; surfaces as 'unknown' gate)
  assert(L.terrainCategory('martian_canal')   === undefined,   'unknown terrain → undefined');
  // null/missing
  assert(L.terrainCategory(null)              === null,        'null → null (defensive)');
}

// ── 2. chanceFor lookup ───────────────────────────────────────────────
section('chanceFor');
{
  assert(L.chanceFor('plains')      === 1, 'plains chance 1');
  assert(L.chanceFor('scrub')       === 3, 'scrub chance 3');
  assert(L.chanceFor('forest')      === 7, 'forest chance 7');
  assert(L.chanceFor('desert')      === 4, 'desert chance 4');
  assert(L.chanceFor('hills')       === 2, 'hills chance 2');
  assert(L.chanceFor('mountains')   === 5, 'mountains chance 5');
  assert(L.chanceFor('marsh')       === 6, 'marsh chance 6');
  assert(L.chanceFor('jungle')      === 7, 'jungle (=forest) chance 7');
  // No-roll terrains return 0
  assert(L.chanceFor('water')       === 0, 'water chance 0');
  assert(L.chanceFor('city')        === 0, 'city chance 0');
  assert(L.chanceFor('martian_canal') === 0, 'unknown chance 0');
  assert(L.chanceFor(null)          === 0, 'null chance 0');
}

// ── 3. Gate priority ──────────────────────────────────────────────────
section('gate priority (water > guide > path > map > mapped > unknown)');
{
  // water beats every other gate
  let r = L.checkAndRoll({ terrain: 'water', hasGuide: true, hasMap: true, followingPath: true, destinationRevealed: true });
  assertEq(r, { rolled: false, blockedBy: 'water' }, 'water terrain blocks first');

  // unknown terrain (e.g. typo) — surfaces 'unknown'
  r = L.checkAndRoll({ terrain: 'martian_canal' });
  assertEq(r, { rolled: false, blockedBy: 'unknown' }, 'unknown terrain blocks');

  // null terrain — also 'unknown'
  r = L.checkAndRoll({ terrain: null });
  assertEq(r, { rolled: false, blockedBy: 'unknown' }, 'null terrain blocks');

  // Below this point: terrain is forest (a legit roll-able terrain).
  // Verify each gate closes the roll regardless of others.
  r = L.checkAndRoll({ terrain: 'forest', hasGuide: true });
  assertEq(r, { rolled: false, blockedBy: 'guide' }, 'guide blocks');

  r = L.checkAndRoll({ terrain: 'forest', followingPath: true });
  assertEq(r, { rolled: false, blockedBy: 'path' }, 'following-path blocks');

  r = L.checkAndRoll({ terrain: 'forest', hasMap: true });
  assertEq(r, { rolled: false, blockedBy: 'map' }, 'map blocks');

  r = L.checkAndRoll({ terrain: 'forest', destinationRevealed: true });
  assertEq(r, { rolled: false, blockedBy: 'mapped' }, 'mapped destination blocks');

  // Priority test: when multiple are true, returns highest priority
  r = L.checkAndRoll({ terrain: 'forest', hasGuide: true, followingPath: true, hasMap: true });
  assertEq(r.blockedBy, 'guide', 'guide wins over path+map');

  r = L.checkAndRoll({ terrain: 'forest', followingPath: true, hasMap: true });
  assertEq(r.blockedBy, 'path', 'path wins over map');

  r = L.checkAndRoll({ terrain: 'forest', hasMap: true, destinationRevealed: true });
  assertEq(r.blockedBy, 'map', 'map wins over mapped');
}

// ── 4. Roll outcome — not lost ────────────────────────────────────────
section('rolled but not lost');
{
  // Plains (chance 1): roll 2 — not lost
  const r = L.checkAndRoll({ terrain: 'plains', rng: scriptedRng([dToRng(2, 10)]) });
  assertEq(r, { rolled: true, lost: false, chance: 1, roll: 2 }, 'plains roll 2 → not lost');
}
{
  // Forest (chance 7): roll 8 — not lost
  const r = L.checkAndRoll({ terrain: 'forest', rng: scriptedRng([dToRng(8, 10)]) });
  assertEq(r, { rolled: true, lost: false, chance: 7, roll: 8 }, 'forest roll 8 → not lost');
}
{
  // Edge: roll == chance is "lost" (DMG: "x in 10")
  const r = L.checkAndRoll({ terrain: 'plains', rng: scriptedRng([dToRng(1, 10), dToRng(1, 6)]) });
  assert(r.lost === true, 'plains roll 1 (=chance) → lost (boundary)');
}

// ── 5. 60lr deviation distribution (plain/scrub/desert/hills/rough) ──
section("60lr deviation (plain, side=L)");
{
  // Force chance hit + side=2 (left half)
  const r = L.checkAndRoll({ terrain: 'plains', rng: scriptedRng([dToRng(1, 10), dToRng(2, 6)]) });
  assert(r.lost === true, 'plains lost');
  assertEq(r.deviation, { rel: 'left', degrees: 60 }, 'plains lost: side=2 → left, 60°');
  assert(r.category === 'plain', 'category=plain');
}
section("60lr deviation (plain, side=R)");
{
  const r = L.checkAndRoll({ terrain: 'desert', rng: scriptedRng([dToRng(1, 10), dToRng(5, 6)]) });
  assert(r.lost === true, 'desert lost');
  assertEq(r.deviation, { rel: 'right', degrees: 60 }, 'desert lost: side=5 → right, 60°');
}
section("60lr edges of side roll");
{
  // side=3 boundary → left
  let r = L.checkAndRoll({ terrain: 'plains', rng: scriptedRng([dToRng(1, 10), dToRng(3, 6)]) });
  assertEq(r.deviation, { rel: 'left', degrees: 60 }, 'side=3 → left (DMG: 1-3=L)');
  // side=4 boundary → right
  r = L.checkAndRoll({ terrain: 'plains', rng: scriptedRng([dToRng(1, 10), dToRng(4, 6)]) });
  assertEq(r.deviation, { rel: 'right', degrees: 60 }, 'side=4 → right (DMG: 4-6=R)');
}

// ── 6. 60-120 deviation (mountains) ──────────────────────────────────
section('60-120 deviation (mountains)');
{
  // chance hit (roll 1 ≤ 5), side=2 (left), magnitude=2 (60°)
  let r = L.checkAndRoll({ terrain: 'mountains', rng: scriptedRng([dToRng(1, 10), dToRng(2, 6), dToRng(2, 6)]) });
  assert(r.lost === true, 'mountains lost');
  assertEq(r.deviation, { rel: 'left', degrees: 60 }, 'mountains: side=L, mag<=3 → 60° L');
  // side=5 (right), magnitude=5 (120°)
  r = L.checkAndRoll({ terrain: 'mountains', rng: scriptedRng([dToRng(1, 10), dToRng(5, 6), dToRng(5, 6)]) });
  assertEq(r.deviation, { rel: 'right', degrees: 120 }, 'mountains: side=R, mag>3 → 120° R');
  // side=3 (left boundary), magnitude=3 (60° boundary)
  r = L.checkAndRoll({ terrain: 'mountains', rng: scriptedRng([dToRng(1, 10), dToRng(3, 6), dToRng(3, 6)]) });
  assertEq(r.deviation, { rel: 'left', degrees: 60 }, 'mountains: side=3 (L), mag=3 (60°)');
  // side=4 (right boundary), magnitude=4 (120° boundary)
  r = L.checkAndRoll({ terrain: 'mountains', rng: scriptedRng([dToRng(1, 10), dToRng(4, 6), dToRng(4, 6)]) });
  assertEq(r.deviation, { rel: 'right', degrees: 120 }, 'mountains: side=4 (R), mag=4 (120°)');
}

// ── 7. any-direction deviation (forest/marsh) ────────────────────────
section('any-direction deviation (forest)');
{
  // d6 1 → 60° R (right ahead)
  let r = L.checkAndRoll({ terrain: 'forest', rng: scriptedRng([dToRng(1, 10), dToRng(1, 6)]) });
  assertEq(r.deviation, { rel: 'ahead-right', degrees: 60 }, 'forest d6=1 → ahead-right 60');
  // d6 2 → 120° R (right behind)
  r = L.checkAndRoll({ terrain: 'forest', rng: scriptedRng([dToRng(1, 10), dToRng(2, 6)]) });
  assertEq(r.deviation, { rel: 'behind-right', degrees: 120 }, 'forest d6=2 → behind-right 120');
  // d6 3 → 180° (directly behind)
  r = L.checkAndRoll({ terrain: 'forest', rng: scriptedRng([dToRng(1, 10), dToRng(3, 6)]) });
  assertEq(r.deviation, { rel: 'behind', degrees: 180 }, 'forest d6=3 → behind 180');
  // d6 4 → 180° also
  r = L.checkAndRoll({ terrain: 'forest', rng: scriptedRng([dToRng(1, 10), dToRng(4, 6)]) });
  assertEq(r.deviation, { rel: 'behind', degrees: 180 }, 'forest d6=4 → behind 180 (same)');
  // d6 5 → 120° L
  r = L.checkAndRoll({ terrain: 'forest', rng: scriptedRng([dToRng(1, 10), dToRng(5, 6)]) });
  assertEq(r.deviation, { rel: 'behind-left', degrees: 120 }, 'forest d6=5 → behind-left 120');
  // d6 6 → 60° L
  r = L.checkAndRoll({ terrain: 'forest', rng: scriptedRng([dToRng(1, 10), dToRng(6, 6)]) });
  assertEq(r.deviation, { rel: 'ahead-left', degrees: 60 }, 'forest d6=6 → ahead-left 60');
}
section('any-direction deviation (marsh)');
{
  // Spot-check marsh uses the same any-direction table
  const r = L.checkAndRoll({ terrain: 'marsh', rng: scriptedRng([dToRng(1, 10), dToRng(1, 6)]) });
  assertEq(r.deviation, { rel: 'ahead-right', degrees: 60 }, 'marsh d6=1 → ahead-right 60');
}
section('any-direction deviation (jungle)');
{
  // Jungle maps to forest category → any-direction table
  const r = L.checkAndRoll({ terrain: 'jungle', rng: scriptedRng([dToRng(1, 10), dToRng(3, 6)]) });
  assertEq(r.deviation, { rel: 'behind', degrees: 180 }, 'jungle d6=3 → behind 180 (same as forest)');
}

// ── 8. Statistical sanity (Math.random sweep) ────────────────────────
section('statistical sanity over many rolls');
{
  // Forest chance is 7/10 — over 10000 rolls, lost-rate should be
  // ~70% within ±3% (3-sigma at sqrt(10000*.7*.3) ≈ 46, so ±1.4%
  // is the 3-sigma band; ±3% is loose).
  let lost = 0;
  const N = 10000;
  for (let i = 0; i < N; i++){
    const r = L.checkAndRoll({ terrain: 'forest' });
    if (r.lost) lost++;
  }
  const rate = lost / N;
  assert(Math.abs(rate - 0.7) < 0.03, `forest lost-rate ≈ 0.7 (got ${rate.toFixed(3)})`);
}
{
  // Plains chance 1/10 → ~10%
  let lost = 0;
  const N = 10000;
  for (let i = 0; i < N; i++){
    if (L.checkAndRoll({ terrain: 'plains' }).lost) lost++;
  }
  const rate = lost / N;
  assert(Math.abs(rate - 0.1) < 0.02, `plains lost-rate ≈ 0.1 (got ${rate.toFixed(3)})`);
}
{
  // Forest any-direction: each of {ahead-right, behind-right, behind,
  // behind-left, ahead-left} should be ~1/6 except 'behind' which is
  // ~2/6. Sample only lost rolls.
  const counts = { 'ahead-right': 0, 'behind-right': 0, 'behind': 0, 'behind-left': 0, 'ahead-left': 0 };
  let lostCt = 0;
  const N = 30000;
  for (let i = 0; i < N; i++){
    const r = L.checkAndRoll({ terrain: 'forest' });
    if (r.lost){ counts[r.deviation.rel]++; lostCt++; }
  }
  // Each non-180 should be ~lostCt/6; 180 should be ~lostCt*2/6
  const expectSingle = lostCt / 6;
  const expectDouble = lostCt * 2 / 6;
  for (const k of ['ahead-right','behind-right','behind-left','ahead-left']){
    const ratio = counts[k] / expectSingle;
    assert(ratio > 0.85 && ratio < 1.15, `forest ${k}: count ${counts[k]} ≈ ${expectSingle.toFixed(0)} (ratio ${ratio.toFixed(2)})`);
  }
  const behindRatio = counts['behind'] / expectDouble;
  assert(behindRatio > 0.85 && behindRatio < 1.15, `forest behind: count ${counts['behind']} ≈ ${expectDouble.toFixed(0)} (ratio ${behindRatio.toFixed(2)})`);
}

// ── 9. LOST_CATEGORIES table inspection ──────────────────────────────
section('LOST_CATEGORIES table');
{
  const C = L.LOST_CATEGORIES;
  assert(typeof C === 'object', 'LOST_CATEGORIES exists');
  assert(C.plain.chance === 1, 'plain.chance = 1');
  assert(C.forest.deviation === 'any', 'forest.deviation = any');
  assert(C.mountains.deviation === '60-120', 'mountains.deviation = 60-120');
  assert(C.marsh.deviation === 'any', 'marsh.deviation = any');
  // Distribution name sanity
  const valid = new Set(['60lr', '60-120', 'any']);
  for (const cat of Object.keys(C)){
    assert(valid.has(C[cat].deviation), `${cat}.deviation is one of valid names`);
    assert(C[cat].chance >= 1 && C[cat].chance <= 10, `${cat}.chance in [1,10]`);
  }
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
