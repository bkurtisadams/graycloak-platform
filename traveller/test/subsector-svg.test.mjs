import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SUBSECTOR_SVG_GEOMETRY,
  flatTopHexPoints,
  formatSvgPoints,
  hexDimensions,
  splitSystemName,
  subsectorHexCenter,
  subsectorSvgViewBox
} from '../client/subsector-svg.js';

test('SVG subsector renderer uses regular flat-top hex geometry', () => {
  const { radius } = SUBSECTOR_SVG_GEOMETRY;
  const dimensions = hexDimensions(radius);
  const center = subsectorHexCenter(1, 1);
  const points = flatTopHexPoints(center, radius);
  assert.equal(points.length, 6);
  assert.equal(dimensions.width, radius * 2);
  assert.ok(Math.abs(dimensions.height - Math.sqrt(3) * radius) < 1e-9);
  assert.match(formatSvgPoints(points), /^[-\d.]+,[-\d.]+(?: [-\d.]+,[-\d.]+){5}$/);
});

test('even printed subsector columns are offset down by half a hex', () => {
  const a = subsectorHexCenter(1, 1);
  const b = subsectorHexCenter(2, 1);
  const dimensions = hexDimensions(SUBSECTOR_SVG_GEOMETRY.radius);
  assert.ok(Math.abs((b.x - a.x) - dimensions.horizontalStep) < 1e-9);
  assert.ok(Math.abs((b.y - a.y) - dimensions.height / 2) < 1e-9);
});

test('80-hex viewBox contains the complete 8 by 10 subsector', () => {
  const box = subsectorSvgViewBox(8, 10);
  const last = subsectorHexCenter(8, 10);
  const { radius } = SUBSECTOR_SVG_GEOMETRY;
  const halfHeight = Math.sqrt(3) * radius / 2;
  assert.ok(last.x + radius <= box.width);
  assert.ok(last.y + halfHeight <= box.height);
});

test('system labels may wrap to two compact SVG lines', () => {
  assert.deepEqual(splitSystemName('Port Meridian'), ['Port', 'Meridian']);
  assert.deepEqual(splitSystemName('Aster'), ['Aster']);
});
