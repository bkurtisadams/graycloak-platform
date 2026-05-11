// Smoke test for @graycloak/map-engine v0.1.0.
// Run after build: `pnpm build && pnpm test`
// Plain JS (no TS syntax) so node --test runs it directly.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  HEX_R, SUB_R, SQRT3,
  ANCHOR_COL, ANCHOR_ROW, ANCHOR_SVG,
  parentSvgCenter,
  parentCenterAxial,
  subhexSvgCenter,
  axialRound,
  svgToAxial,
  neighborsOf,
  axialKey,
  parseAxialKey,
  ownerOf,
  ownedByParent,
  cellsInAxialBbox,
  clearOwnerCache,
} from '../dist/index.js';

test('constants match the GCC source-of-truth', () => {
  assert.equal(HEX_R, 20);
  assert.equal(SUB_R, 2);
  assert.equal(ANCHOR_COL, 70);
  assert.equal(ANCHOR_ROW, 50);
  assert.ok(Math.abs(SQRT3 - Math.sqrt(3)) < 1e-12);
});

test('parentSvgCenter(70, 50) matches formula and ANCHOR_SVG agrees', () => {
  const expected = {
    x: HEX_R + 70 * 1.5 * HEX_R,
    y: HEX_R * SQRT3 / 2 + 50 * SQRT3 * HEX_R + (70 & 1 ? HEX_R * SQRT3 / 2 : 0),
  };
  const c = parentSvgCenter(70, 50);
  assert.ok(Math.abs(c.x - expected.x) < 1e-9);
  assert.ok(Math.abs(c.y - expected.y) < 1e-9);
  assert.ok(Math.abs(ANCHOR_SVG.x - expected.x) < 1e-9);
  assert.ok(Math.abs(ANCHOR_SVG.y - expected.y) < 1e-9);
});

test('parentCenterAxial(ANCHOR_COL, ANCHOR_ROW) === { Q: 0, R: 0 }', () => {
  const a = parentCenterAxial(ANCHOR_COL, ANCHOR_ROW);
  assert.deepEqual(a, { Q: 0, R: 0 });
});

test('subhexSvgCenter(0, 0) === ANCHOR_SVG', () => {
  const c = subhexSvgCenter(0, 0);
  assert.ok(Math.abs(c.x - ANCHOR_SVG.x) < 1e-9);
  assert.ok(Math.abs(c.y - ANCHOR_SVG.y) < 1e-9);
});

test('svgToAxial inverts subhexSvgCenter for a sample of cells', () => {
  const cases = [[0, 0], [5, -3], [-10, 7], [12, 4], [-7, -7]];
  for (const [Q, R] of cases) {
    const v = subhexSvgCenter(Q, R);
    const back = svgToAxial(v.x, v.y);
    assert.deepEqual(back, { Q, R }, `round-trip failed at (${Q}, ${R})`);
  }
});

test('axialRound of integer values is identity', () => {
  const cases = [[0, 0], [3, 5], [-2, 8], [-10, -10]];
  for (const [Q, R] of cases) {
    assert.deepEqual(axialRound(Q, R), { Q, R });
  }
});

test('neighborsOf returns six unique cells, each at axial distance 1', () => {
  const ns = neighborsOf(5, -3);
  assert.equal(ns.length, 6);
  const keys = new Set(ns.map(n => `${n.Q}_${n.R}`));
  assert.equal(keys.size, 6, 'neighbors must be unique');
  for (const n of ns) {
    const dQ = n.Q - 5;
    const dR = n.R - -3;
    // Axial dist 1 → max(|dQ|, |dR|, |dQ+dR|) === 1
    const dist = Math.max(Math.abs(dQ), Math.abs(dR), Math.abs(dQ + dR));
    assert.equal(dist, 1, `neighbor (${n.Q},${n.R}) not at distance 1`);
  }
});

test('axialKey / parseAxialKey round-trip', () => {
  const cases = [[0, 0], [5, -3], [-12, 47], [-1, -1]];
  for (const [Q, R] of cases) {
    const k = axialKey(Q, R);
    const back = parseAxialKey(k);
    assert.deepEqual(back, { Q, R });
  }
  assert.equal(parseAxialKey('not-a-key'), null);
  assert.equal(parseAxialKey('subhex_0_0'), null); // intentionally no prefix
});

test('ownerOf at parent center returns that parent', () => {
  clearOwnerCache();
  const cases = [[ANCHOR_COL, ANCHOR_ROW], [69, 49], [71, 51], [64, 44]];
  for (const [col, row] of cases) {
    const ax = parentCenterAxial(col, row);
    const o = ownerOf(ax.Q, ax.R);
    assert.deepEqual(o, { col, row }, `owner of parent center (${col},${row}) was ${JSON.stringify(o)}`);
  }
});

test('ownedByParent returns a parent-worth of cells for an interior parent', () => {
  clearOwnerCache();
  // Exact count is geometry-dependent. The GCC original says ~100;
  // pin the expected window between 80 and 110 to catch regressions
  // without over-fitting.
  const owned = ownedByParent(ANCHOR_COL, ANCHOR_ROW);
  assert.ok(owned.length >= 80, `expected >= 80, got ${owned.length}`);
  assert.ok(owned.length <= 110, `expected <= 110, got ${owned.length}`);
  // Center cell is included.
  assert.ok(owned.some(c => c.Q === 0 && c.R === 0));
});

test('cellsInAxialBbox handles degenerate and small bboxes', () => {
  assert.deepEqual(cellsInAxialBbox(null), []);
  assert.deepEqual(cellsInAxialBbox(undefined), []);
  assert.deepEqual(cellsInAxialBbox({ minX: 5, maxX: 5, minY: 0, maxY: 10 }), []);
  // A tiny bbox containing only the anchor cell center.
  const eps = SUB_R / 4;
  const inside = cellsInAxialBbox({
    minX: ANCHOR_SVG.x - eps, maxX: ANCHOR_SVG.x + eps,
    minY: ANCHOR_SVG.y - eps, maxY: ANCHOR_SVG.y + eps,
  });
  assert.ok(inside.some(c => c.Q === 0 && c.R === 0), 'anchor cell should be returned');
});

test('cellsInAxialBbox over a parent-sized window returns a parent worth of cells', () => {
  const r = HEX_R;
  const box = {
    minX: ANCHOR_SVG.x - r, maxX: ANCHOR_SVG.x + r,
    minY: ANCHOR_SVG.y - r, maxY: ANCHOR_SVG.y + r,
  };
  const cells = cellsInAxialBbox(box);
  assert.ok(cells.length > 50, `too few cells: ${cells.length}`);
  assert.ok(cells.length < 400, `too many cells: ${cells.length}`);
});
