const SQRT3 = Math.sqrt(3);

import { formatSubsectorHex } from '../vendor/classic-traveller-rules/index.js';

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


export function createSvgNode(name, attributes = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function appendBaseMarkers(group, system, center) {
  const bases = system?.bases ?? {};
  if (!bases.scout && !bases.naval) return;
  const radius = SUBSECTOR_SVG_GEOMETRY.radius;
  let x = center.x + radius * 0.47;
  const y = center.y - (Math.sqrt(3) * radius) / 2 + 11;

  if (bases.naval) {
    const naval = createSvgNode('g', { class: 'subsector-base-marker naval-base-marker' });
    const navalTitle = createSvgNode('title');
    navalTitle.textContent = 'Naval Base';
    naval.append(navalTitle);
    const diamond = createSvgNode('path', {
      d: `M ${x} ${y - 4.2} L ${x + 4.2} ${y} L ${x} ${y + 4.2} L ${x - 4.2} ${y} Z`,
      class: 'subsector-base-icon-shape'
    });
    const cross = createSvgNode('path', {
      d: `M ${x - 5.2} ${y} H ${x + 5.2} M ${x} ${y - 5.2} V ${y + 5.2}`,
      class: 'subsector-base-icon-line'
    });
    naval.append(diamond, cross);
    group.append(naval);
    x -= 12;
  }

  if (bases.scout) {
    const scout = createSvgNode('g', { class: 'subsector-base-marker scout-base-marker' });
    const scoutTitle = createSvgNode('title');
    scoutTitle.textContent = 'Scout Base';
    scout.append(scoutTitle);
    const triangle = createSvgNode('path', {
      d: `M ${x} ${y - 5} L ${x + 5} ${y + 4} L ${x - 5} ${y + 4} Z`,
      class: 'subsector-base-icon-shape'
    });
    scout.append(triangle);
    group.append(scout);
  }
}

// v0.70.0: the subsector hex map, lifted from the referee client so the
// player page draws the same one. `reachable` is a Map of systemId -> parsecs
// (empty for a read-only map); with no `onSelect` the hexes are not buttons.
export function renderSubsectorMap({ subsector, columns, rows, current = null, selected = null, reachable = new Map(), objectives = new Set(), onSelect = null } = {}) {
  const viewBox = subsectorSvgViewBox(columns, rows, SUBSECTOR_SVG_GEOMETRY);
  const svg = createSvgNode('svg', {
    class: 'subsector-svg',
    viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
    role: 'group',
    'aria-label': `${subsector.name} subsector hex map`,
    preserveAspectRatio: 'xMidYMid meet'
  });

  // v0.100.0: while a destination is required and unset, the in-range hexes
  // pulse. Motion as a prompt, not decoration — it stops the moment one is
  // picked, and the current port never pulses because it does not change
  // during a port call.
  if (current && !selected && reachable.size) svg.classList.add('destination-pending');

  const centerBySystemId = new Map();
  const systemByHex = new Map(subsector.systems.map((system) => [system.hex, system]));
  for (let column = 1; column <= columns; column += 1) {
    for (let row = 1; row <= rows; row += 1) {
      const hex = formatSubsectorHex(column, row);
      const system = systemByHex.get(hex) ?? null;
      const center = subsectorHexCenter(column, row, SUBSECTOR_SVG_GEOMETRY);
      const points = formatSvgPoints(flatTopHexPoints(center, SUBSECTOR_SVG_GEOMETRY.radius));
      const group = createSvgNode('g', { class: 'subsector-hex' });
      const polygon = createSvgNode('polygon', { points, class: 'subsector-hex-shape' });
      group.append(polygon);

      const coordinate = createSvgNode('text', {
        x: center.x - SUBSECTOR_SVG_GEOMETRY.radius * 0.63,
        y: center.y - (Math.sqrt(3) * SUBSECTOR_SVG_GEOMETRY.radius) / 2 + 9,
        class: 'subsector-hex-coordinate'
      });
      coordinate.textContent = hex;
      group.append(coordinate);

      if (!system) {
        group.classList.add('empty-hex');
        svg.append(group);
        continue;
      }

      group.classList.add('system-hex');
      centerBySystemId.set(system.id, center);
      if (current && reachable.has(system.id)) group.classList.add('reachable');
      if (current?.id === system.id) group.classList.add('current');
      if (selected?.id === system.id) group.classList.add('selected');
      // v0.102.0: where an accepted contract has to be delivered. A job the
      // player has taken on is marked on the map, not only in a panel.
      if (objectives.has?.(system.id)) group.classList.add('objective');

      const relation = current?.id === system.id
        ? 'current system'
        : reachable.has(system.id)
          ? `${reachable.get(system.id)} parsecs, in range`
          : current
            ? 'out of range'
            : 'available starting system';
      if (onSelect) {
        group.setAttribute('role', 'button');
        group.setAttribute('tabindex', '0');
      }
      const baseNames = [system.bases?.scout ? 'Scout Base' : null, system.bases?.naval ? 'Naval Base' : null].filter(Boolean);
      const baseLabel = baseNames.length ? `, ${baseNames.join(' and ')}` : '';
      group.setAttribute('aria-label', `${system.name}, hex ${hex}, ${relation}${baseLabel}`);
      group.dataset.systemId = system.id;

      const title = createSvgNode('title');
      const objective = objectives.has?.(system.id) ? ' / ACCEPTED JOB DESTINATION' : '';
      title.textContent = `${system.name} / ${system.mainWorld.name} / ${system.mainWorld.uwp} / ${hex} / ${relation}${baseNames.length ? ` / ${baseNames.join(' + ')}` : ''}${objective}`;
      group.append(title);

      const marker = createSvgNode('text', {
        x: center.x,
        y: center.y + 3,
        class: 'subsector-system-marker',
        'text-anchor': 'middle'
      });
      marker.textContent = current?.id === system.id ? '◆' : '●';
      group.append(marker);

      const lines = splitSystemName(system.name);
      lines.forEach((line, index) => {
        const label = createSvgNode('text', {
          x: center.x,
          y: center.y + 17 + index * 10,
          class: 'subsector-system-name',
          'text-anchor': 'middle'
        });
        label.textContent = line;
        group.append(label);
      });

      // The destination carries its own ring so it reads at a glance without
      // depending on stroke weight alone, which is easy to miss at low zoom.
      if (selected?.id === system.id) {
        group.append(createSvgNode('circle', {
          cx: center.x, cy: center.y, r: SUBSECTOR_SVG_GEOMETRY.radius * 0.62,
          class: 'subsector-destination-ring'
        }));
      }

      appendBaseMarkers(group, system, center);

      if (onSelect) {
        const select = () => onSelect(system);
        group.addEventListener('click', select);
        group.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          select();
        });
      }
      svg.append(group);
    }
  }

  // The jump line is drawn last so it sits over the hexes, and takes no
  // pointer events so it never blocks a hex click. It states the parsecs
  // being spent, which is the one number the choice turns on.
  const origin = current ? centerBySystemId.get(current.id) : null;
  const target = selected && selected.id !== current?.id ? centerBySystemId.get(selected.id) : null;
  if (origin && target) {
    const layer = createSvgNode('g', { class: 'subsector-jump-layer', 'aria-hidden': 'true' });
    layer.append(createSvgNode('line', {
      x1: origin.x, y1: origin.y, x2: target.x, y2: target.y, class: 'subsector-jump-line'
    }));
    const parsecs = reachable.get(selected.id);
    if (Number.isFinite(parsecs)) {
      const label = createSvgNode('text', {
        x: (origin.x + target.x) / 2, y: (origin.y + target.y) / 2 - 4,
        class: 'subsector-jump-label', 'text-anchor': 'middle'
      });
      label.textContent = `${parsecs} PC`;
      layer.append(label);
    }
    svg.append(layer);
  }
  return svg;
}


