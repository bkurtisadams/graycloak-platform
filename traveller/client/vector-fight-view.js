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
//     interactive zoom/pan yet — ship-vector-map.js's is tested and could be
//     adapted, but it keeps that state in module closures, which is exactly
//     what rule 1 above rules out here; giving this a real camera later
//     means a vectorUi field on play.js's `ui`, not importing that module.
//   - No gravity, no planet, no ordnance drawing. shipfight:vector-start has
//     nothing that stages a planet yet either, so there is nothing to test
//     this against in the UI even if it were built.

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

// A fixed viewBox sized to fit both ships (and, once thrust is being typed,
// the plotted endpoint) with a margin — recomputed fresh every render, since
// nothing here remembers a camera between renders (see the header).
function fitViewBox(points) {
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 4), spanY = Math.max(maxY - minY, 4);
  const margin = Math.max(spanX, spanY) * 0.25 + 2;
  const w = spanX + margin * 2, h2 = spanY + margin * 2;
  const size = Math.max(w, h2 / (430 / 800)); // keep the 800x430 aspect, fit the wider dimension
  return { minX: minX - margin, minY: minY - margin, w: size, h: size * (430 / 800), cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/**
 * shipFight: the whole view-state object play-session.js builds (roster,
 * spatialMode, vector, phase, outcome, log, actions, ...). vector.pendingThrust
 * is play.js's own ui.vectorThrust, merged in by viewState() the same way
 * ui.fightMove/ui.fightTargetId already overlay onto state.next.declare —
 * not a separate parameter here, to match that existing convention.
 * handlers: { onThrustChange({x,y}), onCommit(), onCoast(), onAdvance(),
 *             onCommand(command) } — onCommand covers End fight / repair,
 * the same generic dispatch play-views.js already uses elsewhere.
 */
export function renderVectorFight(shipFight, handlers = {}) {
  const v = shipFight.vector;
  const root = h('div', { class: 'vfv-root' });
  if (!v) {
    root.append(h('p', { class: 'vfv-empty', text: 'No vector plot for this fight.' }));
    return root;
  }

  const thrust = v.pendingThrust ?? { x: 0, y: 0 };
  const playerPos = v.player.position, playerVel = v.player.velocity;
  const oppPos = v.opponent?.position ?? null;

  // p.26: a preview endpoint one turn of thrust ahead, drawn dashed — pure
  // arithmetic (position + velocity + thrust), not the engine's own gravity-
  // and-braking preview, since this slice has no planet to preview against.
  const previewEndpoint = { x: playerPos.x + playerVel.x + thrust.x, y: playerPos.y + playerVel.y + thrust.y };
  const g = Math.hypot(thrust.x, thrust.y) / 2;

  const points = [playerPos, oppPos, v.awaitingMovement ? previewEndpoint : null].filter(Boolean);
  const box = fitViewBox(points);
  const plot = svg('svg', { class: 'vfv-plot', viewBox: `${box.minX} ${box.minY} ${box.w} ${box.h}`, role: 'img', 'aria-label': 'Ship vector plot' });

  const drawShip = (pos, vel, side, label, isPlayer) => {
    const group = svg('g', { class: `vfv-ship ${SIDE_CLASS(side)}${isPlayer ? ' is-player' : ''}` });
    if (vel.x || vel.y) {
      group.append(svg('line', { x1: pos.x, y1: pos.y, x2: pos.x + vel.x, y2: pos.y + vel.y, class: 'vfv-vector' }));
    }
    const r = Math.max(box.w, box.h) * 0.012;
    group.append(svg('circle', { cx: pos.x, cy: pos.y, r, class: 'vfv-token' }));
    // font-size is explicit and scaled to the plot for a reason: an SVG
    // <text> with none falls back to the browser's default (16 user units),
    // and this plot's whole coordinate space is typically only a few dozen
    // units across — the default renders each label several times the width
    // of the entire plot. (Caught from a real screenshot, not a test: jsdom
    // has no layout engine, so a missing font-size draws nothing wrong in
    // any assertion here — only measuring a real render catches it, the
    // same reason test/support/layout-browser.mjs exists for the old UI.)
    const fontSize = Math.max(box.w, box.h) * 0.028;
    const t = svg('text', { x: pos.x, y: pos.y - r * 1.6, class: 'vfv-label', 'font-size': fontSize, 'text-anchor': 'middle' });
    t.textContent = label;
    group.append(t);
    return group;
  };
  plot.append(drawShip(playerPos, playerVel, v.playerSide, 'YOU', true));
  if (v.opponent) plot.append(drawShip(oppPos, v.opponent.velocity, v.opponent.side, v.opponent.name.toUpperCase(), false));

  if (v.awaitingMovement) {
    plot.append(svg('line', {
      x1: playerPos.x + playerVel.x, y1: playerPos.y + playerVel.y, x2: previewEndpoint.x, y2: previewEndpoint.y,
      class: 'vfv-preview'
    }));
    plot.append(svg('circle', { cx: previewEndpoint.x, cy: previewEndpoint.y, r: Math.max(box.w, box.h) * 0.008, class: 'vfv-preview-point' }));
  }

  const status = h('p', { class: 'vfv-status' },
    `VEL ${speedOf(playerVel.x, playerVel.y).toFixed(1)}" @ ${String(bearingOf(playerVel.x, playerVel.y)).padStart(3, '0')}\u00b0`,
    v.range ? ` \u00b7 RANGE ${v.range.distance.toFixed(1)}"${v.range.dm ? ` (DM ${v.range.dm})` : ''}` : '',
    ` \u00b7 TURN ${shipFight.gameTurn}, ${shipFight.phase}`);

  const parts = [plot, status];

  if (v.awaitingMovement) {
    const setThrust = (axis, value) => handlers.onThrustChange?.({ ...thrust, [axis]: Number(value) || 0 });
    parts.push(h('form', { class: 'vfv-thrust', onsubmit: (event) => event.preventDefault() },
      h('label', {}, 'Thrust X', h('input', {
        type: 'number', step: '0.1', value: String(thrust.x), 'aria-label': 'Thrust X',
        oninput: (event) => setThrust('x', event.currentTarget.value)
      })),
      h('label', {}, 'Thrust Y', h('input', {
        type: 'number', step: '0.1', value: String(thrust.y), 'aria-label': 'Thrust Y',
        oninput: (event) => setThrust('y', event.currentTarget.value)
      })),
      h('span', { class: 'vfv-g-readout', text: `${g.toFixed(2)} G / max ${v.player.maxG} G` }),
      h('div', { class: 'vfv-thrust-actions' },
        h('button', {
          type: 'button', class: 'button is-primary', text: 'Commit maneuver',
          disabled: g > v.player.maxG + 1e-9,
          onclick: () => handlers.onCommit?.(thrust)
        }),
        h('button', { type: 'button', class: 'button', text: 'Coast (no thrust)', onclick: () => handlers.onCoast?.() }))));
    if (g > v.player.maxG + 1e-9) {
      parts.push(h('p', { class: 'vfv-note is-error', text: `Exceeds the functioning ${v.player.maxG} G drive.` }));
    }
  } else if (shipFight.outcome === 'in-progress') {
    if (v.awaitingFireDecision) {
      // Fire and Advance are separate on purpose: firing doesn't end the
      // phase by itself (you could Hold and still need to Advance), so
      // there's one control for "take the shot" and one for "move on",
      // rather than folding them together the way the abbreviated flow's
      // single Fire/Hold button does.
      parts.push(h('p', { class: 'vfv-note', text: v.canFire ? 'Your turrets may fire.' : 'No operational turret can fire.' }));
      if (v.canFire) parts.push(h('button', { type: 'button', class: 'button is-primary', text: 'Fire lasers', onclick: () => handlers.onFire?.() }));
    } else if (v.phaseKey === 'laser-fire' || v.phaseKey === 'return-fire') {
      parts.push(h('p', { class: 'vfv-note', text: 'Advancing will resolve the opponent\u2019s own shot automatically, if it has one to take.' }));
    } else if (v.phasingSide !== v.playerSide) {
      parts.push(h('p', { class: 'vfv-note', text: `${v.phasingSide === 'intruder' ? 'The intruder' : 'The native'} side is phasing; nothing for you to plot this turn.` }));
    }
    parts.push(h('button', { type: 'button', class: 'button is-primary', text: 'Advance', onclick: () => handlers.onAdvance?.() }));
  }

  if ((shipFight.actions ?? []).length) {
    parts.push(h('div', { class: 'vfv-actions' }, shipFight.actions.map((action) =>
      h('button', { type: 'button', class: `button${action.primary ? ' is-primary' : ' is-small'}`, text: action.label, onclick: () => handlers.onCommand?.(action.command) }))));
  }

  root.append(...parts);
  return root;
}
