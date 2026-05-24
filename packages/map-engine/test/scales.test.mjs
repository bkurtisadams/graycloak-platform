// Tests for @graycloak/map-engine scales.
// Run after build: `pnpm build && node --test test/scales.test.mjs`

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  HEX_R, SUB_R, ANCHOR_COL, ANCHOR_ROW, ANCHOR_SVG,
  SCALES, MILE_R, WORLD_UNITS_PER_MILE,
  parentCenterAxial,
  svgCenterAtRadius, axialAtRadius,
  mileSvgCenter, svgToMileAxial,
  mileToSubhex, mileToParent, mileCellsInParent,
  axialRing, axialDisk, axialDistance,
  siteGrid, siteCellCenterFeet, siteCellsPerMile,
  clearOwnerCache, ownerOf, parentOwnerOfPoint,
  subhexSvgCenter, ownedByParent,
} from '../dist/index.js';

test('scale registry encodes the 30/3/1 mile chain', () => {
  assert.equal(SCALES.parent.milesAcross, 30);
  assert.equal(SCALES.subhex.milesAcross, 3);
  assert.equal(SCALES.mile.milesAcross, 1);
  assert.equal(SCALES.parent.radius, HEX_R);
  assert.equal(SCALES.subhex.radius, SUB_R);
  // mile = subhex / 3 = parent / 30
  assert.ok(Math.abs(SCALES.mile.radius - SUB_R / 3) < 1e-12);
  assert.ok(Math.abs(MILE_R - HEX_R / 30) < 1e-12);
  assert.ok(Math.abs(WORLD_UNITS_PER_MILE - HEX_R / 30) < 1e-12);
});

test('svgCenterAtRadius(SUB_R, ...) reproduces subhexSvgCenter exactly', () => {
  for (const [Q, R] of [[0, 0], [5, -3], [-10, 7], [12, 4]]) {
    const a = svgCenterAtRadius(SUB_R, Q, R);
    const b = subhexSvgCenter(Q, R);
    assert.ok(Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9,
      `mismatch at (${Q},${R})`);
  }
});

test('mile axial round-trips through its centre', () => {
  for (const [Q, R] of [[0, 0], [9, -4], [-15, 11], [30, 0], [-7, -7]]) {
    const v = mileSvgCenter(Q, R);
    assert.deepEqual(svgToMileAxial(v.x, v.y), { Q, R }, `round-trip at (${Q},${R})`);
  }
});

test('mile (0,0) sits at the anchor and is owned by the anchor parent', () => {
  clearOwnerCache();
  const c = mileSvgCenter(0, 0);
  assert.ok(Math.abs(c.x - ANCHOR_SVG.x) < 1e-9 && Math.abs(c.y - ANCHOR_SVG.y) < 1e-9);
  assert.deepEqual(mileToParent(0, 0), { col: ANCHOR_COL, row: ANCHOR_ROW });
  assert.deepEqual(mileToSubhex(0, 0), { Q: 0, R: 0 });
});

test('mileCellsInParent yields a parent-worth (~900) of mile-hexes, centre included', () => {
  clearOwnerCache();
  const cells = mileCellsInParent(ANCHOR_COL, ANCHOR_ROW);
  // 30 across hex-packed ≈ 30*30*(area factor). Pin a generous window.
  assert.ok(cells.length >= 700, `expected >= 700, got ${cells.length}`);
  assert.ok(cells.length <= 1100, `expected <= 1100, got ${cells.length}`);
  assert.ok(cells.some(c => c.Q === 0 && c.R === 0));
  // Every returned cell really is owned by the anchor parent.
  for (const c of cells) {
    const o = mileToParent(c.Q, c.R);
    assert.deepEqual(o, { col: ANCHOR_COL, row: ANCHOR_ROW });
  }
});

test('cross-scale ownership nests in the interior; fragments only at the edge', () => {
  // The three scales are independent nearest-centre partitions of the
  // same plane, so their boundaries do NOT strictly nest: a mile-hex
  // straddling a parent edge can belong to parent A while its nearest
  // *subhex* centre belongs to B (the "fragment" reality from
  // DESIGN-subhex-fullview.md, generalised). Interior cells always
  // agree; disagreements are edge-only. The render layer must place
  // each cell at its own scale's true owner — never assume nesting.
  clearOwnerCache();
  const cells = mileCellsInParent(ANCHOR_COL, ANCHOR_ROW);
  const ctr = svgToMileAxial(
    mileSvgCenter(0, 0).x, mileSvgCenter(0, 0).y); // anchor parent centre ≈ (0,0)
  let agree = 0;
  const disagreements = [];
  for (const c of cells) {
    const o = mileToParent(c.Q, c.R); // mile cell really is in this parent
    assert.deepEqual(o, { col: ANCHOR_COL, row: ANCHOR_ROW });
    const sub = mileToSubhex(c.Q, c.R);
    const subOwner = ownerOf(sub.Q, sub.R);
    if (subOwner && subOwner.col === ANCHOR_COL && subOwner.row === ANCHOR_ROW) agree++;
    else disagreements.push(c);
  }
  // Centre cell nests cleanly.
  assert.ok(agree > 0);
  assert.deepEqual(mileToSubhex(0, 0), { Q: 0, R: 0 });
  // Overwhelming majority nest.
  assert.ok(agree / cells.length > 0.9, `agreement ${(agree / cells.length).toFixed(3)} too low`);
  // Every disagreement is a boundary cell, far from the parent centre.
  for (const c of disagreements) {
    assert.ok(axialDistance(ctr, c) >= 13, `fragment at interior cell (${c.Q},${c.R})`);
  }
});

test('axialRing(k) has 6k cells, all at distance k; ring(0) is the centre', () => {
  const ctr = { Q: 4, R: -2 };
  assert.deepEqual(axialRing(ctr, 0), [ctr]);
  for (const k of [1, 2, 3, 7]) {
    const ring = axialRing(ctr, k);
    assert.equal(ring.length, 6 * k, `ring ${k} size`);
    for (const c of ring) assert.equal(axialDistance(ctr, c), k);
    // No duplicates.
    assert.equal(new Set(ring.map(c => `${c.Q}_${c.R}`)).size, ring.length);
  }
});

test('axialDisk(k) is the closed hexagon: 1 + 3k(k+1) cells', () => {
  const ctr = { Q: 0, R: 0 };
  for (const k of [0, 1, 2, 5, 20]) {
    const disk = axialDisk(ctr, k);
    assert.equal(disk.length, 1 + 3 * k * (k + 1), `disk ${k} size`);
    for (const c of disk) assert.ok(axialDistance(ctr, c) <= k);
  }
});

test('site grids: cell sizes, scaling, and hex/square geometry', () => {
  const origin = { Q: 3, R: 5 };
  const yd = siteGrid('hex-200yd', origin);
  const v30 = siteGrid('square-30ft', origin);
  const v10 = siteGrid('square-10ft', origin);

  assert.equal(yd.isHex, true);
  assert.equal(v30.isHex, false);
  assert.equal(yd.cellFeet, 600);   // 200 yards
  assert.equal(v30.cellFeet, 30);
  assert.equal(v10.cellFeet, 10);

  // 1 mile = 5280 ft -> 176 squares of 30 ft, 528 of 10 ft.
  assert.equal(siteCellsPerMile(v30), 176);
  assert.equal(siteCellsPerMile(v10), 528);

  // Square (0,0) centre is half a cell in.
  assert.deepEqual(siteCellCenterFeet(v30, 0, 0), { x: 15, y: 15 });
  // Adjacent square is one cell over.
  assert.deepEqual(siteCellCenterFeet(v10, 1, 0), { x: 15, y: 5 });

  // Hex centres advance by 1.5*radius in x; radius = 600/sqrt3.
  const r = 600 / Math.sqrt(3);
  const h = siteCellCenterFeet(yd, 1, 0);
  assert.ok(Math.abs(h.x - 1.5 * r) < 1e-6);
});

test('REGRESSION: ownerOf still matches the v0.1.0 contract after refactor', () => {
  clearOwnerCache();
  for (const [col, row] of [[ANCHOR_COL, ANCHOR_ROW], [69, 49], [71, 51], [64, 44]]) {
    const ax = parentCenterAxial(col, row);
    assert.deepEqual(ownerOf(ax.Q, ax.R), { col, row });
  }
  const owned = ownedByParent(ANCHOR_COL, ANCHOR_ROW);
  assert.ok(owned.length >= 80 && owned.length <= 110, `ownedByParent count ${owned.length}`);
});

test('parentOwnerOfPoint agrees with ownerOf at subhex centres', () => {
  clearOwnerCache();
  for (const [Q, R] of [[0, 0], [5, -3], [-10, 7], [12, 4], [33, 19]]) {
    const c = subhexSvgCenter(Q, R);
    assert.deepEqual(parentOwnerOfPoint(c.x, c.y), ownerOf(Q, R), `at subhex (${Q},${R})`);
  }
});
