const SQRT3 = Math.sqrt(3);

export const SUBSECTOR_SVG_GEOMETRY = Object.freeze({
  radius: 38,
  paddingX: 18,
  paddingY: 18
});

export function hexDimensions(radius = SUBSECTOR_SVG_GEOMETRY.radius) {
  if (!Number.isFinite(radius) || radius <= 0) throw new RangeError('radius must be a positive number');
  return {
    width: radius * 2,
    height: SQRT3 * radius,
    horizontalStep: radius * 1.5,
    verticalStep: SQRT3 * radius
  };
}

// Classic Traveller's 0101-style subsector coordinates are vertical columns
// with every even numbered printed column offset downward by half a hex.
export function subsectorHexCenter(column, row, geometry = SUBSECTOR_SVG_GEOMETRY) {
  if (!Number.isInteger(column) || column < 1) throw new RangeError('column must be a positive integer');
  if (!Number.isInteger(row) || row < 1) throw new RangeError('row must be a positive integer');
  const { radius, paddingX, paddingY } = geometry;
  const { height, horizontalStep, verticalStep } = hexDimensions(radius);
  return {
    x: paddingX + radius + (column - 1) * horizontalStep,
    y: paddingY + height / 2 + (row - 1) * verticalStep + (column % 2 === 0 ? height / 2 : 0)
  };
}

export function flatTopHexPoints({ x, y }, radius = SUBSECTOR_SVG_GEOMETRY.radius) {
  const halfHeight = (SQRT3 * radius) / 2;
  return [
    [x - radius, y],
    [x - radius / 2, y - halfHeight],
    [x + radius / 2, y - halfHeight],
    [x + radius, y],
    [x + radius / 2, y + halfHeight],
    [x - radius / 2, y + halfHeight]
  ];
}

export function formatSvgPoints(points) {
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

export function subsectorSvgViewBox(columns, rows, geometry = SUBSECTOR_SVG_GEOMETRY) {
  if (!Number.isInteger(columns) || columns < 1) throw new RangeError('columns must be a positive integer');
  if (!Number.isInteger(rows) || rows < 1) throw new RangeError('rows must be a positive integer');
  const { radius, paddingX, paddingY } = geometry;
  const { height, horizontalStep, verticalStep } = hexDimensions(radius);
  const width = paddingX * 2 + radius * 2 + (columns - 1) * horizontalStep;
  const evenColumnOffset = columns >= 2 ? height / 2 : 0;
  const heightTotal = paddingY * 2 + rows * verticalStep + evenColumnOffset;
  return { x: 0, y: 0, width, height: heightTotal };
}

export function splitSystemName(name, maxCharacters = 11) {
  const value = String(name ?? '').trim();
  if (!value) return [];
  if (value.length <= maxCharacters || !value.includes(' ')) return [value];
  const words = value.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharacters || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}
