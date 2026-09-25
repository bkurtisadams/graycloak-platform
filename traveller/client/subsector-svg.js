const SQRT3 = Math.sqrt(3);

import { formatSubsectorHex } from '../vendor/classic-traveller-rules/index.js?v=v0.325.0';

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
// v0.315.0: `lanes` are the subsector's charted routes (Book 3 p.2, kept as
// map data), drawn world to world; `offLane` marks the worlds in range that
// no lane reaches from here, which need the Generate program (Book 2 p.32).
// v0.321.0: a frame onto a larger map — firstColumn/firstRow are the map
// hexes drawn top-left (a sector is 32x40 in the same numbering) — and the
// borders of the subsectors in it, each { letter, name, firstColumn, firstRow }.
// v0.323.0: `worldStyle: 'book'` draws each world the way the published
// Traveller maps do (Kurt approved the mockup, Sep 2026): starport letter
// above, the world dot by water (filled, red for none, a scatter for a
// belt, hollow when not yet known), a gas giant dot, star and triangle for
// naval and scout bases, names in capitals for a billion or more, amber and
// red zone arcs round the top, the hex number at the top centre. `edges` are
// the neighbouring subsectors' names round the outside, each
// { side, letter, name, firstColumn, firstRow }. The classic style stays the
// default for the other pages.
function appendBookWorld(group, system, center) {
  const k = SUBSECTOR_SVG_GEOMETRY.radius / 44;
  const { x, y } = center;
  const uwp = String(system.mainWorld?.uwp ?? '');
  const digit = (ch) => (/[0-9]/.test(ch) ? Number(ch) : /[A-Z]/.test(ch) ? ch.charCodeAt(0) - 55 : null);
  const size = digit(uwp[1]);
  const hydro = digit(uwp[3]);
  const population = digit(uwp[4]);
  const hidden = Boolean(system.hidden) || size === null;
  if (!hidden && size === 0) {
    const belt = createSvgNode('g', { class: 'world-belt' });
    for (const [dx, dy] of [[-6, -3], [0, -6], [6, -2], [-3, 3], [4, 5], [-7, 6], [1, 1]]) belt.append(createSvgNode('circle', { cx: x + dx * k, cy: y + dy * k, r: 1.8 * k }));
    group.append(belt);
  } else {
    group.append(createSvgNode('circle', { cx: x, cy: y, r: 7 * k, class: `world-dot ${hidden ? 'is-unknown' : hydro > 0 ? 'is-water' : 'is-dry'}` }));
  }
  const port = createSvgNode('text', { x, y: y - 12 * k, class: 'world-starport', 'text-anchor': 'middle' });
  port.textContent = uwp[0] ?? '?';
  group.append(port);
  if (system.gasGiant) group.append(createSvgNode('circle', { cx: x + 17 * k, cy: y - 10 * k, r: 3.2 * k, class: 'world-gas-giant' }));
  const bases = system.bases ?? {};
  if (bases.naval) {
    const cx = x - 18 * k;
    const cy = y - 10 * k;
    const points = Array.from({ length: 10 }, (_, i) => {
      const radius = (i % 2 === 0 ? 6 : 2.6) * k;
      const angle = Math.PI / 2 + (i * Math.PI) / 5;
      return `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy - radius * Math.sin(angle)).toFixed(1)}`;
    }).join(' ');
    const star = createSvgNode('polygon', { points, class: 'world-base is-naval' });
    const title = createSvgNode('title');
    title.textContent = 'Naval base';
    star.append(title);
    group.append(star);
  }
  if (bases.scout) {
    const cx = x - 18 * k;
    const cy = y + (bases.naval ? 4 : -10) * k;
    const triangle = createSvgNode('polygon', { points: `${cx - 5 * k},${cy + 4 * k} ${cx + 5 * k},${cy + 4 * k} ${cx},${cy - 5 * k}`, class: 'world-base is-scout' });
    const title = createSvgNode('title');
    title.textContent = 'Scout base';
    triangle.append(title);
    group.append(triangle);
  }
  const major = !hidden && population !== null && population >= 9;
  splitSystemName(major ? system.name.toUpperCase() : system.name).forEach((line, index) => {
    const label = createSvgNode('text', { x, y: y + 24 * k + index * 10, class: `subsector-system-name${major ? ' is-major' : ''}`, 'text-anchor': 'middle' });
    label.textContent = line;
    group.append(label);
  });
}

// The zone arc as the book draws it: round the top of the hex, open at the
// bottom for the name, so the letter, gas giant and bases sit inside it.
function zoneArc(system, center) {
  if (!['amber', 'red'].includes(system.travelZone)) return null;
  const k = SUBSECTOR_SVG_GEOMETRY.radius / 44;
  const r = 32 * k;
  const oy = center.y + 6 * k;
  const a = (5 * Math.PI) / 180;
  const x0 = center.x - r * Math.cos(a);
  const x1 = center.x + r * Math.cos(a);
  const y0 = oy - r * Math.sin(a);
  return createSvgNode('path', { d: `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 1 1 ${x1.toFixed(1)} ${y0.toFixed(1)}`, class: `world-zone is-${system.travelZone}` });
}

export function renderSubsectorMap({ subsector, columns, rows, current = null, selected = null, reachable = new Map(), objectives = new Set(), onSelect = null, lanes = [], offLane = new Set(), firstColumn = 1, firstRow = 1, borders = [], worldStyle = 'classic', edges = [] } = {}) {
  const book = worldStyle === 'book';
  const baseBox = subsectorSvgViewBox(columns, rows, SUBSECTOR_SVG_GEOMETRY);
  // Room round the outside for the neighbours' names.
  const margin = book && edges.length ? 22 : 0;
  const viewBox = { x: -margin, y: -margin, width: baseBox.width + margin * 2, height: baseBox.height + margin * 2 };
  const svg = createSvgNode('svg', {
    class: 'subsector-svg',
    viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
    role: 'group',
    'aria-label': `${subsector.name} subsector hex map`,
    preserveAspectRatio: 'xMidYMid meet',
    // v0.288.0: the map's own proportions, so a narrow page can give it the
    // full width and exactly the height that width needs.
    style: `--map-ratio: ${viewBox.width} / ${viewBox.height}; --map-w: ${viewBox.width}; --map-h: ${viewBox.height}`
  });

  // v0.100.0: while a destination is required and unset, the in-range hexes
  // pulse. Motion as a prompt, not decoration — it stops the moment one is
  // picked, and the current port never pulses because it does not change
  // during a port call.
  if (current && !selected && reachable.size) svg.classList.add('destination-pending');

  const centerBySystemId = new Map();
  const systemByHex = new Map(subsector.systems.map((system) => [system.hex, system]));
  const bounds = { columns: 99, rows: 99 };
  for (let column = firstColumn; column < firstColumn + columns; column += 1) {
    for (let row = firstRow; row < firstRow + rows; row += 1) {
      const hex = formatSubsectorHex(column, row, bounds);
      const system = systemByHex.get(hex) ?? null;
      // firstColumn - 1 is a multiple of 8, so the odd/even column offset holds.
      const center = subsectorHexCenter(column - firstColumn + 1, row - firstRow + 1, SUBSECTOR_SVG_GEOMETRY);
      const points = formatSvgPoints(flatTopHexPoints(center, SUBSECTOR_SVG_GEOMETRY.radius));
      const group = createSvgNode('g', { class: 'subsector-hex' });
      const polygon = createSvgNode('polygon', { points, class: 'subsector-hex-shape' });
      group.append(polygon);

      const coordinate = createSvgNode('text', book ? {
        x: center.x,
        y: center.y - (Math.sqrt(3) * SUBSECTOR_SVG_GEOMETRY.radius) / 2 + 8,
        class: 'subsector-hex-coordinate',
        'text-anchor': 'middle'
      } : {
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
      if (current && reachable.has(system.id) && offLane.has?.(system.id)) group.classList.add('off-lane');
      if (current?.id === system.id) group.classList.add('current');
      if (selected?.id === system.id) group.classList.add('selected');
      // v0.102.0: where an accepted contract has to be delivered. A job the
      // player has taken on is marked on the map, not only in a panel.
      if (objectives.has?.(system.id)) group.classList.add('objective');

      const relation = current?.id === system.id
        ? 'current system'
        : reachable.has(system.id)
          ? `${reachable.get(system.id)} parsecs, in range${offLane.has?.(system.id) ? ', off the charted lanes, needs Generate' : ''}`
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

      if (book) {
        const arc = zoneArc(system, center);
        if (arc) group.append(arc);
        appendBookWorld(group, system, center);
      } else {
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
      }

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

  // Lanes run centre to centre, stopped short of each world's marker so the
  // marker and its name stay readable. Under the jump line, over the hexes.
  if (lanes.length) {
    const layer = createSvgNode('g', { class: 'subsector-lane-layer', 'aria-hidden': 'true' });
    const trim = SUBSECTOR_SVG_GEOMETRY.radius * 0.38;
    for (const lane of lanes) {
      const a = centerBySystemId.get(lane.from);
      const b = centerBySystemId.get(lane.to);
      if (!a || !b) continue;
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      if (length <= trim * 2) continue;
      const ux = (b.x - a.x) / length;
      const uy = (b.y - a.y) / length;
      const touches = current && (lane.from === current.id || lane.to === current.id);
      layer.append(createSvgNode('line', {
        x1: a.x + ux * trim, y1: a.y + uy * trim, x2: b.x - ux * trim, y2: b.y - uy * trim,
        class: `subsector-lane${touches ? ' is-here' : ''}`
      }));
    }
    svg.append(layer);
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
  // The neighbours' names round the outside (book style).
  if (book && edges.length) {
    const layer = createSvgNode('g', { class: 'subsector-edge-layer', 'aria-hidden': 'true' });
    for (const edge of edges) {
      const a = subsectorHexCenter(edge.firstColumn - firstColumn + 1, edge.firstRow - firstRow + 1, SUBSECTOR_SVG_GEOMETRY);
      const b = subsectorHexCenter(edge.firstColumn - firstColumn + 8, edge.firstRow - firstRow + 10, SUBSECTOR_SVG_GEOMETRY);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const text = `${edge.letter} \u00b7 ${edge.name ? edge.name.toUpperCase() : 'UNCHARTED'}`;
      const at = {
        top: { x: midX, y: -margin / 2 + 4, rotate: 0 },
        bottom: { x: midX, y: baseBox.height + margin / 2 + 4, rotate: 0 },
        left: { x: -margin / 2 + 4, y: midY, rotate: -90 },
        right: { x: baseBox.width + margin / 2 - 4, y: midY, rotate: 90 }
      }[edge.side];
      const label = createSvgNode('text', { x: at.x, y: at.y, class: `subsector-edge-label${edge.name ? '' : ' is-uncharted'}`, 'text-anchor': 'middle', transform: at.rotate ? `rotate(${at.rotate} ${at.x} ${at.y})` : '' });
      label.textContent = text;
      layer.append(label);
    }
    svg.append(layer);
  }

  // Subsector borders and names, over everything but the jump line.
  if (borders.length > 1) {
    const layer = createSvgNode('g', { class: 'subsector-border-layer', 'aria-hidden': 'true' });
    const { radius } = SUBSECTOR_SVG_GEOMETRY;
    const { height } = hexDimensions(radius);
    for (const border of borders) {
      const topLeft = subsectorHexCenter(border.firstColumn - firstColumn + 1, border.firstRow - firstRow + 1, SUBSECTOR_SVG_GEOMETRY);
      const bottomRight = subsectorHexCenter(border.firstColumn - firstColumn + 8, border.firstRow - firstRow + 10, SUBSECTOR_SVG_GEOMETRY);
      const x = topLeft.x - radius * 0.75;
      const y = topLeft.y - height / 2;
      layer.append(createSvgNode('rect', { x, y, width: bottomRight.x + radius * 0.75 - x, height: bottomRight.y + height / 2 - y, class: 'subsector-border' }));
      const label = createSvgNode('text', { x: x + 6, y: y + 14, class: 'subsector-border-label' });
      label.textContent = `${border.letter} \u00b7 ${border.name}`;
      layer.append(label);
    }
    svg.insertBefore(layer, svg.querySelector('.subsector-jump-layer') ?? null);
  }
  return svg;
}


