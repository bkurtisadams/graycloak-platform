// vector-fight-view.js — Book 2 pp.22-31's vector plot, drawn for the play
// page. play.js builds the model (shipFight.vector, from play-session.js)
// and the handlers; this module only turns them into the drawing — the same
// division client/fight-view.js already uses for the personal-combat board.
//
// Rules matched to play-views.js's own (see that file's own header):
//   1. Every function takes state and returns DOM. No module-level state —
//      unlike client/ship-vector-map.js, nothing here remembers a zoom, a
//      selection or a pending thrust across calls. play.js's own `ui` object
//      is where that would live if this slice grew a camera; it doesn't
//      have one yet (see the header note below).
//   2. Self-contained: its own tiny hyperscript and SVG helpers, its own
//      vfv- prefixed classes, so nothing in styles.css reaches in and this
//      reaches nothing else.
//
// Scope of this slice, stated plainly rather than left to be discovered:
//   - One ship per side (matches shipfight:vector-move's own limit).
//   - Movement and the player's own laser fire/return fire. The opponent's
//     own shot resolves automatically on Advance (shipfight:vector-advance),
//     the same way an unmoved ship auto-coasts leaving the movement phase.
//   - Ordnance and computer reprogramming still have no UI here — Advance
//     steps past those phases without doing anything in them. A note only
//     appears for the phases that matter (fire); silence for these two is
//     deliberate, not an oversight, and worth its own slice.
//   - A fixed-fit camera sized to whatever is on the plot each render. No
//     interactive zoom/pan yet.
//   - v0.246.0: the plot is y-up like the staging board; a typed or clicked
//     thrust repaints its own preview instead of asking play.js to re-render.
//   - No gravity, no planet, no ordnance drawing. shipfight:vector-start has
//     nothing that stages a planet yet either, so there is nothing to test
//     this against in the UI even if it were built.
import { kindButton } from './kind-button.js?v=v0.317.2';

const NS = 'http://www.w3.org/2000/svg';
function h(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes ?? {})) {
    if (value === null || value === undefined) continue;
    if (value === false && !key.startsWith('aria-')) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    // Duck-typed rather than `instanceof Node`: this runs against whichever
    // document created the child (jsdom in tests, the real DOM in the
    // browser), and Node is not necessarily a global in either caller's
    // realm the way document is.
    node.append(child?.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}
function svg(tag, attributes = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

// p.25's own bearing notation: 000\u00b0 is +y (up the plot), clockwise.
function bearingOf(vx, vy) {
  if (!vx && !vy) return 0;
  return Math.round(((Math.atan2(vx, vy) * 180) / Math.PI + 360) % 360);
}
function speedOf(vx, vy) { return Math.hypot(vx, vy); }

const SIDE_CLASS = (side) => `vfv-side-${side === 'intruder' ? 'intruder' : side === 'native' ? 'native' : 'third'}`;

// Plot space is Book 2's own: +y is 000 degrees, up the table, the same way
// the staging board draws it. SVG's y runs down, so every y is negated once,
// here, on its way to the drawing.
const sy = (y) => -y;

function fitViewBox(points) {
  const xs = points.map((p) => p.x), ys = points.map((p) => sy(p.y));
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 4), spanY = Math.max(maxY - minY, 4);
  const margin = Math.max(spanX, spanY) * 0.2 + 2;
  const ASPECT = 430 / 800;
  const w = Math.max(spanX + margin * 2, (spanY + margin * 2) / ASPECT), h2 = w * ASPECT;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return { minX: cx - w / 2, minY: cy - h2 / 2, w, h: h2 };
}

function gridStep(width) {
  for (const step of [1, 5, 10, 50, 100, 500]) if (width / step <= 24) return step;
  return 1000;
}

/**
 * shipFight: the whole view-state object play-session.js builds (roster,
 * spatialMode, vector, phase, outcome, log, actions, ...). vector.pendingThrust
 * is play.js's own ui.vectorThrust, merged in by viewState().
 * handlers: { onThrustChange({x,y}), onCommit({x,y}), onCoast(), onAdvance(),
 *             onFire(), onCommand(command) }.
 *
 * Typing or clicking a thrust repaints the preview in place and reports it
 * through onThrustChange; it does not ask for a re-render, because a re-render
 * rebuilds the field being typed in and the caret is lost after one digit.
 */
export function renderVectorFight(shipFight, handlers = {}) {
  const v = shipFight.vector;
  const root = h('div', { class: 'vfv-root' });
  if (!v) {
    root.append(h('p', { class: 'vfv-empty', text: 'No vector plot for this fight.' }));
    return root;
  }

  let thrust = { x: Number(v.pendingThrust?.x) || 0, y: Number(v.pendingThrust?.y) || 0 };
  const playerPos = v.player.position, playerVel = v.player.velocity;
  const oppPos = v.opponent?.position ?? null;
  const coast = { x: playerPos.x + playerVel.x, y: playerPos.y + playerVel.y };
  // Book 2 p.26: no more inches of thrust per turn than twice the drive's Gs.
  const reach = v.player.maxG * 2;

  const points = [playerPos, oppPos, coast, v.opponent ? { x: oppPos.x + v.opponent.velocity.x, y: oppPos.y + v.opponent.velocity.y } : null].filter(Boolean);
  if (v.awaitingMovement) points.push({ x: coast.x - reach, y: coast.y - reach }, { x: coast.x + reach, y: coast.y + reach });
  const box = fitViewBox(points);
  const unit = Math.max(box.w, box.h);
  const plot = svg('svg', { class: 'vfv-plot', viewBox: `${box.minX} ${box.minY} ${box.w} ${box.h}`, role: 'img', 'aria-label': 'Ship vector plot' });

  const step = gridStep(box.w);
  const grid = svg('g', { class: 'vfv-grid' });
  // Drawn a full view past every edge: the element is rarely the viewBox's
  // own shape, and the letterboxed margin would otherwise show no grid.
  const gx0 = box.minX - box.w, gx1 = box.minX + box.w * 2, gy0 = box.minY - box.h * 2, gy1 = box.minY + box.h * 3;
  for (let x = Math.ceil(gx0 / step) * step; x <= gx1; x += step) grid.append(svg('line', { x1: x, y1: gy0, x2: x, y2: gy1 }));
  for (let y = Math.ceil(gy0 / step) * step; y <= gy1; y += step) grid.append(svg('line', { x1: gx0, y1: y, x2: gx1, y2: y }));
  plot.append(grid);

  if (oppPos) plot.append(svg('line', { x1: playerPos.x, y1: sy(playerPos.y), x2: oppPos.x, y2: sy(oppPos.y), class: 'vfv-range' }));

  const drawShip = (pos, vel, side, label, isPlayer) => {
    const group = svg('g', { class: `vfv-ship ${SIDE_CLASS(side)}${isPlayer ? ' is-player' : ''}` });
    if (vel.x || vel.y) {
      group.append(svg('line', { x1: pos.x, y1: sy(pos.y), x2: pos.x + vel.x, y2: sy(pos.y + vel.y), class: 'vfv-vector' }));
      group.append(svg('circle', { cx: pos.x + vel.x, cy: sy(pos.y + vel.y), r: unit * 0.004, class: 'vfv-vector-head' }));
    }
    const r = unit * 0.009;
    group.append(svg('circle', { cx: pos.x, cy: sy(pos.y), r, class: 'vfv-token' }));
    // An SVG <text> with no font-size falls back to 16 user units, several
    // times the width of a plot only a few dozen units across.
    const t = svg('text', { x: pos.x, y: sy(pos.y) - r * 1.8, class: 'vfv-label', 'font-size': unit * 0.02, 'text-anchor': 'middle' });
    t.textContent = label;
    group.append(t);
    return group;
  };
  plot.append(drawShip(playerPos, playerVel, v.playerSide, 'YOU', true));
  if (v.opponent) plot.append(drawShip(oppPos, v.opponent.velocity, v.opponent.side, v.opponent.name.toUpperCase(), false));

  let paint = () => {};
  if (v.awaitingMovement) {
    // p.25's own figure: the thrust vector laid head to tail on the present
    // one, and the new vector drawn from the tail of the first to the head of
    // the last. The ring is every endpoint the drive can reach this turn.
    const ring = svg('circle', { cx: coast.x, cy: sy(coast.y), r: Math.max(reach, 0.001), class: 'vfv-reach' });
    const thrustLine = svg('line', { x1: coast.x, y1: sy(coast.y), x2: coast.x, y2: sy(coast.y), class: 'vfv-preview' });
    const resultLine = svg('line', { x1: playerPos.x, y1: sy(playerPos.y), x2: coast.x, y2: sy(coast.y), class: 'vfv-result' });
    const endpoint = svg('circle', { cx: coast.x, cy: sy(coast.y), r: unit * 0.006, class: 'vfv-preview-point' });
    plot.append(ring, resultLine, thrustLine, endpoint);
    plot.classList.add('is-plotting');
    paint = () => {
      const end = { x: coast.x + thrust.x, y: coast.y + thrust.y };
      for (const node of [thrustLine, resultLine]) { node.setAttribute('x2', end.x); node.setAttribute('y2', sy(end.y)); }
      endpoint.setAttribute('cx', end.x); endpoint.setAttribute('cy', sy(end.y));
    };
    paint();
  }

  const status = h('p', { class: 'vfv-status' },
    `VEL ${speedOf(playerVel.x, playerVel.y).toFixed(1)}" @ ${String(bearingOf(playerVel.x, playerVel.y)).padStart(3, '0')}\u00b0`,
    v.range ? ` \u00b7 RANGE ${v.range.distance.toFixed(1)}"${v.range.dm ? ` (DM ${v.range.dm})` : ''}` : '',
    ` \u00b7 TURN ${shipFight.gameTurn}, ${shipFight.phase} \u00b7 GRID ${step}"`);

  const parts = [plot, status];

  // v0.282.0: the players' copy (readOnly) draws the plot and nothing to press.
  if (shipFight.readOnly) {
    parts.push(h('p', { class: 'vfv-note', text: 'The referee is running this fight; you are watching the plot.' }));
  } else if (v.awaitingMovement) {
    const over = () => Math.hypot(thrust.x, thrust.y) / 2 > v.player.maxG + 1e-9;
    const readout = h('span', { class: 'vfv-g-readout' });
    const commit = kindButton({ label: 'Commit maneuver', kind: 'travel', primary: true }, { onclick: () => handlers.onCommit?.({ ...thrust }) });
    const warning = h('p', { class: 'vfv-note is-error', text: `Exceeds the functioning ${v.player.maxG} G drive.`, hidden: true });
    const field = (axis) => h('input', {
      type: 'number', step: '0.1', value: String(thrust[axis]), 'aria-label': `Thrust ${axis.toUpperCase()}`,
      oninput: (event) => { thrust = { ...thrust, [axis]: Number(event.currentTarget.value) || 0 }; refresh(); handlers.onThrustChange?.({ ...thrust }); }
    });
    const xField = field('x'), yField = field('y');
    const refresh = () => {
      const end = { x: playerVel.x + thrust.x, y: playerVel.y + thrust.y };
      readout.textContent = `${(Math.hypot(thrust.x, thrust.y) / 2).toFixed(2)} G of ${v.player.maxG} G \u00b7 new vector ${speedOf(end.x, end.y).toFixed(1)}" @ ${String(bearingOf(end.x, end.y)).padStart(3, '0')}\u00b0`;
      commit.disabled = over();
      warning.hidden = !over();
      paint();
    };
    // A click on the plot is the endpoint wanted; the thrust is whatever
    // reaches it, held to the ring (p.26) and to a tenth of an inch.
    plot.addEventListener('click', (event) => {
      const matrix = plot.getScreenCTM?.();
      if (!matrix) return;
      const at = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      let dx = at.x - coast.x, dy = -at.y - coast.y;
      const length = Math.hypot(dx, dy);
      if (length > reach && length > 0) { dx *= reach / length; dy *= reach / length; }
      const tenth = (n) => Math.trunc(n * 10) / 10;
      thrust = { x: tenth(dx), y: tenth(dy) };
      xField.value = String(thrust.x); yField.value = String(thrust.y);
      refresh();
      handlers.onThrustChange?.({ ...thrust });
    });
    refresh();
    parts.push(h('form', { class: 'vfv-thrust', onsubmit: (event) => { event.preventDefault(); if (!over()) handlers.onCommit?.({ ...thrust }); } },
      h('label', {}, 'Thrust X', xField),
      h('label', {}, 'Thrust Y', yField),
      readout,
      h('div', { class: 'vfv-thrust-actions' },
        commit,
        kindButton({ label: 'Coast (no thrust)', kind: 'travel' }, { onclick: () => handlers.onCoast?.() }))),
      h('p', { class: 'vfv-note', text: 'Click inside the ring to plot an endpoint, or type the thrust in inches (2" is 1 G). +Y is 000\u00b0.' }),
      warning);
  } else if (shipFight.outcome === 'in-progress') {
    // Fire and Advance are separate: firing does not end the phase.
    const row = [];
    if (v.awaitingFireDecision) {
      const why = v.canFire ? 'Your turrets may fire.'
        : v.hasFired ? 'Your turrets have fired this phase.'
        : v.fireBlockedReason ? `Nothing to fire: ${v.fireBlockedReason}.`
        : 'No operational turret can fire.';
      parts.push(h('p', { class: 'vfv-note', text: why }));
      if (v.canFire) row.push(kindButton({ label: 'Fire lasers', kind: 'danger', primary: true }, { onclick: () => handlers.onFire?.() }));
    } else if (v.phaseKey === 'laser-fire' || v.phaseKey === 'return-fire') {
      parts.push(h('p', { class: 'vfv-note', text: 'Advancing will resolve the opponent\u2019s own shot automatically, if it has one to take.' }));
    } else if (v.phasingSide !== v.playerSide) {
      parts.push(h('p', { class: 'vfv-note', text: `${v.phasingSide === 'intruder' ? 'The intruder' : 'The native'} side is phasing; nothing for you to plot this turn.` }));
    }
    row.push(kindButton({ label: 'Advance', kind: 'neutral', primary: !v.canFire }, { onclick: () => handlers.onAdvance?.() }));
    parts.push(h('div', { class: 'vfv-actions' }, row));
  }

  if (!shipFight.readOnly && (shipFight.actions ?? []).length) {
    parts.push(h('div', { class: 'vfv-actions' }, shipFight.actions.map((action) =>
      kindButton(action, { small: !action.primary, onclick: () => handlers.onCommand?.(action.command) }))));
  }

  root.append(...parts);
  return root;
}


/**
 * Book 2 p.23's own game turn sequence, as a track: two player turns of five
 * phases, the intruder's first, with the phase play is in lit and the side
 * entitled to act in each one named. v0.247.0 — before it, the screen said
 * only the current phase's name, which gave no sense of where in the turn
 * play was or what was coming.
 */
export function renderPhaseTrack(shipFight) {
  const v = shipFight.vector;
  const root = h('nav', { class: 'vfv-track', 'aria-label': 'Game turn sequence, Book 2 p.23' });
  if (!v?.track) return root;
  root.append(h('div', { class: 'vfv-track-turn' },
    h('span', { class: 'vfv-track-label', text: 'GAME TURN' }),
    h('b', { text: String(shipFight.gameTurn) })));
  for (const side of ['intruder', 'native']) {
    const mine = side === v.playerSide;
    const phasing = v.phasingSide === side;
    // Both player turns run the same five phases (p.23), so both rows list
    // all five; only the side that is phasing has one of them lit. Return
    // fire (C) is the other side's shot inside this side's turn, which the
    // title on each phase says.
    root.append(h('div', { class: `vfv-track-side${mine ? ' is-mine' : ''}` },
      h('span', { class: 'vfv-track-label', text: `${side === 'intruder' ? 'INTRUDER' : 'NATIVE'}${mine ? ' \u00b7 YOURS' : ''}${phasing ? ' \u00b7 PHASING' : ''}` }),
      h('div', { class: 'vfv-track-phases' }, v.track.map((entry) => h('span', {
        class: `vfv-phase${entry.current && phasing ? ' is-current' : ''}`,
        title: `${entry.label} \u2014 ${(entry.key === 'return-fire' ? side !== v.playerSide : side === v.playerSide) ? 'yours' : 'theirs'}`,
        text: `${entry.letter} ${entry.label.replace(/^(Laser |Computer |Ordnance )/, '')}`
      })))));
  }
  return root;
}

/** Book 2 p.24's data card, for each ship in the fight. */
export function renderDataCards(shipFight) {
  const cards = shipFight.vector?.dataCards ?? [];
  const root = h('div', { class: 'vfv-cards' });
  for (const entry of cards) {
    const card = h('div', { class: `vfv-card${entry.own ? ' is-own' : ''}` },
      h('div', { class: 'vfv-card-head' },
        h('b', { text: entry.card ? `${entry.name} (Type ${entry.card.typeCode})` : entry.name }),
        h('span', { class: 'vfv-card-tag', text: entry.own ? 'YOURS' : 'OBSERVED' })));
    if (entry.card) {
      const c = entry.card;
      const lines = [
        ...c.sections.map((section, index) => `${index + 1}. ${section.label} (${section.reading})`),
        `4. Fuel (${c.fuel.aboardTons} of ${c.fuel.capacityTons}${c.fuel.hits ? `, ${c.fuel.hits} hit` : ''})`,
        `5. Hold (${c.hold.capacityTons} tons${c.hold.hits ? `, ${c.hold.hits} hit` : ''})`,
        `6. Bridge (Pilot-${c.bridge.pilotSkill})`,
        ...c.turrets.map((turret) => `${turret.id} (${turret.code || 'empty'}) Gunner-${turret.gunnerSkill}${turret.operational ? '' : ' OUT'}`)
      ];
      card.append(h('div', { class: 'vfv-card-body' }, lines.map((line) => h('div', { text: line }))));
      card.append(h('div', { class: 'vfv-card-computer' },
        h('div', { text: `Model/${c.computer.model} \u00b7 CPU ${c.computer.cpu} \u00b7 storage ${c.computer.storage}${c.computer.hits ? ` \u00b7 ${c.computer.hits} hit (DM ${c.computer.operationDM})` : ''}` }),
        h('div', { class: 'vfv-programs' }, (c.computer.carried ?? []).map((key) => h('span', {
          class: `vfv-program${(c.computer.loaded ?? []).includes(key) ? ' is-loaded' : ''}`,
          text: key.replace(/-/g, ' ')
        })))));
      if (c.decompressed) card.append(h('div', { class: 'vfv-card-note', text: 'Hull breached' }));
    } else if (entry.observed) {
      card.append(h('div', { class: 'vfv-card-body' },
        h('div', { text: `${entry.observed.armedTurrets} armed turret${entry.observed.armedTurrets === 1 ? '' : 's'} seen` }),
        h('div', { text: entry.observed.damage?.length ? `Damage seen: ${entry.observed.damage.join(', ')}` : 'Damage seen: none' })));
    }
    root.append(card);
  }
  return root;
}
