// scene-canvas.js — the board both pages draw.
//
// v0.73.0. The referee's client and the player's page each had their own
// canvas — grid, camera, tokens, drag — and every fix landed on one and not
// the other. This module is the one board: it owns the SVG's viewBox camera
// (zoom, pan, fit, frame), draws the grid for a board of metre cells at a
// grid scale, lays out tokens one grid square wide (stacking those that share
// a square), draws each token's base — shape, label, selection brackets,
// target ring — and runs the drag with its trail and label in screen units.
//
// It knows nothing about encounters, characters or Firestore. Callers pass
// plain token records and get callbacks: decorate a token, draw an underlay
// or overlay with the board's metrics, select, open a menu, describe a drag
// in progress, accept a drop.

const SVG_NS = 'http://www.w3.org/2000/svg';
export const SCENE_CANVAS_SIZE = 1206;
export const SCENE_MIN_ZOOM = 0.5;
export const SCENE_MAX_ZOOM = 16;
const SLOTS = [[0, 0], [-.55, -.55], [0, -.55], [.55, -.55], [-.55, 0], [.55, 0], [-.55, .55], [0, .55], [.55, .55]];

export function svgNode(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined || value === null) continue;
    node.setAttribute(key, String(value));
  }
  return node;
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

// Where tokens sharing a square sit, so a stack reads as a stack.
export function layoutTokens(tokens, { cell, tokenScale }) {
  const cells = new Map();
  for (const token of tokens) {
    const key = `${token.column},${token.row}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(token);
  }
  const centres = new Map();
  for (const occupants of cells.values()) {
    occupants.sort((a, b) => String(a.id).localeCompare(String(b.id))).forEach((token, index) => {
      const [slotX, slotY] = SLOTS[index % SLOTS.length];
      const offsetX = slotX * tokenScale * 0.5;
      const offsetY = slotY * tokenScale * 0.5;
      centres.set(token.id, { x: token.column * cell + offsetX, y: token.row * cell + offsetY, offsetX, offsetY });
    });
  }
  return centres;
}

export function createSceneCanvas({ svg, viewport = null, onCamera = null, maxZoom = SCENE_MAX_ZOOM, minZoom = SCENE_MIN_ZOOM } = {}) {
  if (!svg) throw new TypeError('an <svg> element is required');
  const size = SCENE_CANVAS_SIZE;
  let board = { columns: 201, rows: 201, metersPerSquare: 5 };
  let zoom = 1;
  let view = { x: 0, y: 0, width: size, height: size };
  let frame = 0;
  let tokensById = new Map();
  let centres = new Map();

  const metrics = () => {
    const cell = size / (board.columns - 1);
    return { size, cell, gridScale: board.metersPerSquare, tokenScale: board.metersPerSquare * cell, columns: board.columns, rows: board.rows, zoom, centreOf: (id) => centres.get(id) ?? null };
  };

  // --- camera -------------------------------------------------------------
  function clampView(next) {
    const width = size / zoom;
    const height = size / zoom;
    return {
      x: width >= size ? (size - width) / 2 : clamp(next.x, 0, size - width),
      y: height >= size ? (size - height) / 2 : clamp(next.y, 0, size - height),
      width, height
    };
  }
  function applyView() {
    view = clampView(view);
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
    onCamera?.({ zoom, view });
  }
  function scheduleView() {
    if (frame) return;
    frame = window.requestAnimationFrame(() => { frame = 0; applyView(); });
  }
  function flushView() {
    if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
    applyView();
  }
  function pointFromClient(clientX, clientY) {
    const matrix = svg.getScreenCTM?.();
    if (matrix && svg.createSVGPoint) {
      const point = svg.createSVGPoint();
      point.x = clientX; point.y = clientY;
      return point.matrixTransform(matrix.inverse());
    }
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width / view.width, rect.height / view.height) || 1;
    return { x: view.x + (clientX - rect.left - (rect.width - view.width * scale) / 2) / scale, y: view.y + (clientY - rect.top - (rect.height - view.height * scale) / 2) / scale };
  }
  function setZoom(value, anchor = null) {
    const next = clamp(value, minZoom, maxZoom);
    const point = anchor ? pointFromClient(anchor.clientX, anchor.clientY) : { x: view.x + view.width / 2, y: view.y + view.height / 2 };
    const ratio = zoom / next;
    view = { x: point.x - (point.x - view.x) * ratio, y: point.y - (point.y - view.y) * ratio, width: size / next, height: size / next };
    zoom = next;
    scheduleView();
  }
  function fit() {
    zoom = 1;
    view = { x: 0, y: 0, width: size, height: size };
    flushView();
  }
  // Frame a set of board points: at least `minSquares` squares wide, padded.
  function framePoints(points, { paddingSquares = 12, minSquares = 40, capZoom = maxZoom } = {}) {
    if (!points.length) { fit(); return; }
    const { cell, gridScale } = metrics();
    const xs = points.map((p) => p.x); const ys = points.map((p) => p.y);
    const padding = cell * paddingSquares;
    const span = Math.max(Math.max(...xs) - Math.min(...xs) + padding * 2, Math.max(...ys) - Math.min(...ys) + padding * 2, cell * gridScale * minSquares);
    zoom = Math.min(capZoom, Math.max(minZoom, size / span));
    const width = size / zoom; const height = size / zoom;
    view = { x: (Math.min(...xs) + Math.max(...xs)) / 2 - width / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 - height / 2, width, height };
    flushView();
  }
  function centreOnPoint(point) {
    view = { ...view, x: point.x - view.width / 2, y: point.y - view.height / 2 };
    flushView();
  }

  // Right-drag pans; wheel zooms about the pointer. The viewport (or the svg)
  // takes the listeners so the pan works from the empty board.
  const panSurface = viewport ?? svg;
  let pan = null;
  let suppressContextMenu = false;
  panSurface.addEventListener('pointerdown', (event) => {
    if (event.button !== 2) return;
    if (event.target.closest?.('[data-scene-token]')) return;
    event.preventDefault();
    const rect = svg.getBoundingClientRect();
    pan = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, viewX: view.x, viewY: view.y, scale: Math.min(rect.width / view.width, rect.height / view.height) || 1, moved: false };
    panSurface.setPointerCapture?.(event.pointerId);
    panSurface.classList.add('panning');
  });
  panSurface.addEventListener('pointermove', (event) => {
    if (!pan || pan.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (Math.hypot(event.clientX - pan.clientX, event.clientY - pan.clientY) > 6) pan.moved = true;
    view.x = pan.viewX - (event.clientX - pan.clientX) / pan.scale;
    view.y = pan.viewY - (event.clientY - pan.clientY) / pan.scale;
    scheduleView();
  });
  const endPan = (event) => {
    if (!pan || pan.pointerId !== event.pointerId) return;
    suppressContextMenu = pan.moved;
    pan = null;
    panSurface.classList.remove('panning');
    flushView();
  };
  panSurface.addEventListener('pointerup', endPan);
  panSurface.addEventListener('pointercancel', endPan);
  panSurface.addEventListener('wheel', (event) => {
    event.preventDefault();
    setZoom(zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12), event);
  }, { passive: false });
  svg.addEventListener('dragstart', (event) => event.preventDefault());

  // --- rendering ------------------------------------------------------------
  function setBoard(next) {
    board = { columns: next.columns, rows: next.rows, metersPerSquare: next.metersPerSquare ?? 1 };
  }

  function drawGrid(fragments) {
    const { cell, gridScale } = metrics();
    for (let column = 0; column < board.columns; column += gridScale) {
      const x = (column + gridScale / 2) * cell;
      fragments.push(svgNode('line', { x1: x, y1: 0, x2: x, y2: size, class: column % 25 === 0 ? 'scene-grid major' : 'scene-grid' }));
    }
    for (let row = 0; row < board.rows; row += gridScale) {
      const y = (row + gridScale / 2) * cell;
      fragments.push(svgNode('line', { x1: 0, y1: y, x2: size, y2: y, class: row % 25 === 0 ? 'scene-grid major' : 'scene-grid' }));
    }
  }

  // The token's base. `token.shape` is circle (people), square (robots) or
  // diamond (creatures); `token.side` colours it; `token.state` flags it.
  function drawTokenBase(group, token) {
    const state = token.state ?? {};
    if (state.selected) group.append(svgNode('path', { d: 'M -.48 -.24 V -.48 H -.24 M .24 -.48 H .48 V -.24 M .48 .24 V .48 H .24 M -.24 .48 H -.48 V .24', class: 'scene-token-selected' }));
    if (state.targeted) group.append(svgNode('circle', { cx: 0, cy: 0, r: .48, class: 'scene-token-target' }));
    const bodyClass = ['scene-token-body', token.side === 'party' ? 'party' : 'enemy', token.kind ? `kind-${token.kind}` : '', state.inactive ? 'inactive' : '', state.declared ? 'declared' : '', state.owned ? 'owned' : ''].filter(Boolean).join(' ');
    if (token.shape === 'square') group.append(svgNode('rect', { x: -.36, y: -.36, width: .72, height: .72, class: bodyClass }));
    else if (token.shape === 'diamond') group.append(svgNode('path', { d: 'M 0 -.4 L .4 0 L 0 .4 L -.4 0 Z', class: bodyClass }));
    else group.append(svgNode('circle', { cx: 0, cy: 0, r: token.side === 'party' ? .4 : .36, class: bodyClass }));
    const label = svgNode('text', { x: 0, y: 0, class: `scene-token-label ${token.side === 'party' ? 'party' : 'enemy'}` });
    label.textContent = String(token.label ?? '?').slice(0, 2).toUpperCase();
    group.append(label);
  }

  // Drag: threshold, grid snap, trail from where the move began, label in
  // screen units. `constrain(token, from, to)` may return a nearer square —
  // the token then stops at the allowance rather than going past it — and
  // `describe(token, from, to)` returns { legal: 'legal'|'limit'|'over', text }.
  function attachDrag(group, token, { canDrag, constrain, describe, onDrop, onSelect }) {
    let drag = null;
    group.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault(); event.stopPropagation();
      if (!canDrag?.(token)) { drag = { pointerId: event.pointerId, selectOnly: true }; group.setPointerCapture?.(event.pointerId); return; }
      const { cell } = metrics();
      const centre = centres.get(token.id);
      const point = pointFromClient(event.clientX, event.clientY);
      const from = token.moveFrom ?? { column: token.column, row: token.row };
      drag = {
        pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false, frame: 0,
        originX: centre.x, originY: centre.y, offsetX: centre.offsetX, offsetY: centre.offsetY,
        grabX: point.x - centre.x, grabY: point.y - centre.y,
        trailX: from.column * cell, trailY: from.row * cell, from,
        column: token.column, row: token.row,
        trail: svgNode('line', { class: 'scene-drag-trail legal' }),
        label: svgNode('text', { class: 'scene-drag-label legal' })
      };
      svg.append(drag.trail, drag.label);
      group.setPointerCapture?.(event.pointerId);
      group.classList.add('dragging');
    });
    group.addEventListener('pointermove', (event) => {
      if (!drag || drag.selectOnly || drag.pointerId !== event.pointerId) return;
      event.preventDefault();
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4) drag.moved = true;
      if (!drag.moved) return;
      const { cell, gridScale, tokenScale } = metrics();
      const point = pointFromClient(event.clientX, event.clientY);
      let column = clamp(Math.round((point.x - drag.grabX) / cell / gridScale) * gridScale, 0, board.columns - 1);
      let row = clamp(Math.round((point.y - drag.grabY) / cell / gridScale) * gridScale, 0, board.rows - 1);
      const constrained = constrain?.(token, drag.from, { column, row });
      if (constrained) { column = clamp(constrained.column, 0, board.columns - 1); row = clamp(constrained.row, 0, board.rows - 1); }
      drag.column = column; drag.row = row;
      const described = describe?.(token, drag.from, { column: drag.column, row: drag.row }) ?? { legal: 'legal', text: '' };
      if (drag.frame) return;
      drag.frame = window.requestAnimationFrame(() => {
        if (!drag) return;
        drag.frame = 0;
        const x = drag.column * cell + drag.offsetX; const y = drag.row * cell + drag.offsetY;
        group.setAttribute('transform', `translate(${x} ${y}) scale(${tokenScale})`);
        drag.trail.setAttribute('x1', drag.trailX); drag.trail.setAttribute('y1', drag.trailY);
        drag.trail.setAttribute('x2', x); drag.trail.setAttribute('y2', y);
        drag.trail.setAttribute('class', `scene-drag-trail ${described.legal}`);
        const offset = 12 / zoom;
        drag.label.setAttribute('x', x + offset); drag.label.setAttribute('y', y - offset);
        drag.label.setAttribute('class', `scene-drag-label ${described.legal}`);
        drag.label.style.fontSize = `${18 / zoom}px`;
        drag.label.style.strokeWidth = `${2.5 / zoom}px`;
        drag.label.textContent = described.text;
      });
    });
    const finish = (event, cancelled = false) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const done = drag; drag = null;
      if (done.selectOnly) { if (!cancelled) onSelect?.(token, event); return; }
      if (done.frame) window.cancelAnimationFrame(done.frame);
      done.trail.remove(); done.label.remove();
      group.classList.remove('dragging');
      const { tokenScale } = metrics();
      const reset = () => group.setAttribute('transform', `translate(${done.originX} ${done.originY}) scale(${tokenScale})`);
      if (cancelled) { reset(); return; }
      if (!done.moved) { onSelect?.(token, event); return; }
      if (done.column === token.column && done.row === token.row) { reset(); onSelect?.(token, event); return; }
      onDrop?.(token, { column: done.column, row: done.row }, { reset });
    };
    group.addEventListener('pointerup', (event) => finish(event));
    group.addEventListener('pointercancel', (event) => finish(event, true));
  }

  // Render the board. Returns the token groups by id so a caller may keep
  // references (menus, focus).
  function render({ tokens = [], underlay = null, overlay = null, decorate = null, interaction = {} } = {}) {
    const m = metrics();
    tokensById = new Map(tokens.map((token) => [token.id, token]));
    centres = layoutTokens(tokens, m);
    const fragments = [];
    drawGrid(fragments);
    underlay?.(fragments, { ...m, centres });
    const groups = new Map();
    for (const token of tokens) {
      const centre = centres.get(token.id);
      const group = svgNode('g', {
        class: `scene-token${token.state?.inactive ? ' inactive' : ''}${interaction.canDrag?.(token) ? ' draggable' : ''}`,
        role: 'button', tabindex: 0,
        transform: `translate(${centre.x} ${centre.y}) scale(${m.tokenScale})`,
        'data-scene-token': token.id,
        'aria-label': token.ariaLabel ?? String(token.label ?? token.id)
      });
      group.append(svgNode('circle', { cx: 0, cy: 0, r: .58, class: 'scene-token-hit' }));
      drawTokenBase(group, token);
      decorate?.(group, token, { ...m, centre });
      if (token.title) { const title = svgNode('title'); title.textContent = token.title; group.append(title); }
      attachDrag(group, token, interaction);
      if (interaction.onContextMenu) group.addEventListener('contextmenu', (event) => { event.preventDefault(); interaction.onContextMenu(token, event, group); });
      if (interaction.onHover) {
        group.addEventListener('pointerenter', (event) => interaction.onHover(token, event, true));
        group.addEventListener('pointerleave', (event) => interaction.onHover(token, event, false));
      }
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); interaction.onSelect?.(token, event); }
        if ((event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) && interaction.onContextMenu) interaction.onContextMenu(token, event, group);
      });
      fragments.push(group);
      groups.set(token.id, group);
    }
    overlay?.(fragments, { ...m, centres });
    svg.replaceChildren(...fragments);
    applyView();
    return groups;
  }

  function clear() { svg.replaceChildren(); centres = new Map(); tokensById = new Map(); }

  return {
    svg, setBoard, render, clear, metrics,
    camera: { get zoom() { return zoom; }, get view() { return { ...view }; }, setZoom, zoomBy: (factor, anchor) => setZoom(zoom * factor, anchor), fit, framePoints, centreOnPoint, pointFromClient, applyView: flushView },
    contextMenuSuppressed() { const was = suppressContextMenu; suppressContextMenu = false; return was; },
    tokenAt(id) { return tokensById.get(id) ?? null; }
  };
}
