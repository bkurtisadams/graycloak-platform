import { previewShipVector } from '../vendor/classic-traveller-rules/src/starships/vector-movement.js?v=v0.229.0';
import { LASER_RANGE_DMS, atmosphereBrakes, ATMOSPHERIC_BRAKING_BAND } from '../vendor/classic-traveller-rules/index.js?v=v0.229.0';
const NS = 'http://www.w3.org/2000/svg';
const node = (name, attrs = {}, text = '') => { const n = document.createElementNS(NS, name); for (const [k,v] of Object.entries(attrs)) n.setAttribute(k,v); n.textContent = text; return n; };
let selected = null, encounterId = null, selectedForTurn = null;
// v0.189.0: the ship under the pointer, so hover reads on the plot as it does on
// the personal board. Kept across redraws (a zoom rebuilds every node).
let hovered = null;
// The selection the app was last told about. Announced after every render, so
// the first render, a turn's automatic pick and a click all reach the sidebar.
let announcedSelection = null;
// v0.189.0: the app reads the selection to outline the same ship's data card,
// so the plot and the sidebar never disagree about which ship is selected.
export function vectorSelectedShipId() { return selected; }
// v0.190.0: the ship under the pointer, which T aims the selected ship at.
export function vectorHoveredShipId() { return hovered; }
// v0.190.0: ship combat's sides are Book 2 p.23's intruder and native — the
// engine has no other — so the colour follows them (Kurt 2026-09-16: red
// intruder, blue native). v0.187.0 keyed on 'party'/'opposition', which no
// ship combat participant ever has, so every ship drew as a third party.
export function vectorSideClass(side) {
  return `vector-side-${side === 'intruder' ? 'intruder' : side === 'native' ? 'native' : 'third'}`;
}
// Corner brackets around a point, the scene board's selection mark
// (scene-canvas.js v0.82.0) drawn in screen units so zoom never thins or fattens
// it. `h` is the half-size of the box, `c` the length of each corner arm.
function cornerBrackets(cx, cy, h, c) {
  const l = cx - h, r = cx + h, t = cy - h, b = cy + h;
  return `M ${l} ${t + c} V ${t} H ${l + c} M ${r - c} ${t} H ${r} V ${t + c} `
    + `M ${r} ${b - c} V ${b} H ${r - c} M ${l + c} ${b} H ${l} V ${b - c}`;
}
// v0.151.0: the plot's own camera. The subsector map's zoom controls drive
// setSubsectorZoom, which touches the subsector SVG and nothing else, and they
// live inside #subsector-section, which is hidden whenever the plot is up — so
// the plot could neither be zoomed nor reached by them. It fits its content to
// a fixed 800x430 box, which is the right default and no use at all when two
// ships close to within a fraction of an inch of each other.
//
// Zoom is expressed as a viewBox over that same box rather than as a change to
// the fit scale, so every coordinate the drawing code computes is unchanged and
// getScreenCTM() keeps click-to-plot correct at any magnification.
const VIEW_W = 800, VIEW_H = 430, ZOOM_MIN = 0.5, ZOOM_MAX = 8, ZOOM_STEP = 1.25, WHEEL_STEP = 1.15;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
let view = { zoom: 1, cx: VIEW_W / 2, cy: VIEW_H / 2 };
const resetView = () => { view = { zoom: 1, cx: VIEW_W / 2, cy: VIEW_H / 2 }; };
// v0.154.0: rules enforcement, as the Chainmail board has it. On, a dragged
// endpoint is clamped to what Book 2 p.26 allows — the M-Drive's rating in Gs,
// two inches each, added to the vector the ship already has. Off, the drag
// passes the raw figure through and the engine's own refusal is shown instead.
let enforceThrustLimit = true;
// v0.156.1: thrust a player has dialled in but not yet committed, per ship.
// The panel is rebuilt on every render and the fields are local to it, so
// selecting another ship — or any unrelated redraw, like a phase advance on the
// other side — silently reset an entered figure to zero. Book 2 p.23 lets a
// side move all of its ships in one movement phase, so several pending thrusts
// have to coexist.
let pendingThrust = {};
// v0.175.0: user units per screen pixel. The plot's viewBox is 800 x 430, but
// the SVG is drawn wider than 800 pixels on most screens, and zooming shrinks
// the viewBox further — so a stroke of "2" was 2 x (CSS scale) x zoom pixels
// wide: at 231% on a wide window, about ten. Sizes are stated in screen pixels
// and converted through this. jsdom has no layout, so it falls back to 1.
function svgPixelScale(svg, viewWidth, viewHeight) {
  const rect = typeof svg.getBoundingClientRect === 'function' ? svg.getBoundingClientRect() : null;
  if (!rect || !rect.width || !rect.height) return 1;
  const scale = Math.min(rect.width / viewWidth, rect.height / viewHeight);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

export function renderShipVectorMap(stage, encounter, { commit, adjudicate, tokenMenu = null, onSelect = null, targetsOf = null }) {
  if (!stage) return;
  let panel = stage.querySelector('#ship-vector-workspace');
  if (!encounter || encounter.spatialMode !== 'vector') { panel?.remove(); return; }
  if (!panel) { panel = document.createElement('section'); panel.id = 'ship-vector-workspace'; stage.append(panel); }
  if (encounterId !== encounter.id) { encounterId = encounter.id; selected = encounter.participants[0].id; resetView(); pendingThrust = {}; selectedForTurn = null; }
  // v0.175.0: when a side's movement begins, select one of its own ships that
  // has still to move. The first participant stayed selected, so the native
  // scout sat selected through the intruder's turn with its thrust held.
  const turnKey = `${encounter.gameTurn}:${encounter.phasingSide}`;
  if (selectedForTurn !== turnKey) {
    selectedForTurn = turnKey;
    const mover = encounter.participants.find((entry) => entry.side === encounter.phasingSide && !entry.escaped && !entry.surrendered
      && encounter.spatial?.ships?.[entry.id]?.movedTurn !== encounter.gameTurn);
    if (mover) selected = mover.id;
  }
  if (announcedSelection !== selected) { announcedSelection = selected; onSelect?.(selected); }
  panel.replaceChildren();
  const heading = document.createElement('div'); heading.className = 'vector-controls';
  const title = document.createElement('strong'); title.textContent = `SPACE / TURN ${encounter.gameTurn} / ${encounter.phasingSide.toUpperCase()}`;
  const select = document.createElement('select'); select.setAttribute('aria-label', 'Selected ship');
  encounter.participants.forEach(p => select.add(new Option(p.name, p.id)));
  // v0.189.0: the dropdown, a click on a token and the token menu's "select"
  // all go through choose(), so there is one selection and the app hears of it.
  const rerender = () => renderShipVectorMap(stage, encounter, { commit, adjudicate, tokenMenu, onSelect, targetsOf });
  const choose = (shipId) => { selected = shipId; rerender(); };
  select.value = selected; select.onchange = () => choose(select.value);
  const zoomButton = (text, label, handler) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'text-button map-zoom-button'; b.textContent = text; b.setAttribute('aria-label', label); b.onclick = handler; return b; };
  const zoomLabel = document.createElement('span'); zoomLabel.className = 'map-zoom-label'; zoomLabel.setAttribute('aria-live', 'polite'); zoomLabel.textContent = '100%';
  const zoomTools = document.createElement('span'); zoomTools.className = 'vector-zoom-tools'; zoomTools.setAttribute('aria-label', 'Vector plot zoom controls');
  zoomTools.append(
    zoomButton('[ \u2212 ]', 'Zoom out', () => zoomTo(view.zoom / ZOOM_STEP)),
    zoomLabel,
    zoomButton('[ + ]', 'Zoom in', () => zoomTo(view.zoom * ZOOM_STEP)),
    zoomButton('[ FIT ]', 'Fit the whole plot', () => { resetView(); applyView(); })
  );
  const rules = document.createElement('button');
  rules.type = 'button';
  rules.className = 'text-button';
  // v0.171.0: was [ RULES: ON/OFF ], which read as switching the rules off. It
  // only clamps the dragged endpoint: the engine refuses an over-thrust either
  // way (previewShipVector throws).
  const labelRules = () => { rules.textContent = enforceThrustLimit ? '[ CLAMP THRUST: ON ]' : '[ CLAMP THRUST: OFF ]'; };
  labelRules();
  rules.title = 'Book 2 p.26 caps voluntary thrust at the M-Drive rating, two inches per G. With the clamp on, a dragged endpoint stops at the drive limit; with it off you may drag past it, but COMMIT is still refused.';
  rules.onclick = () => { enforceThrustLimit = !enforceThrustLimit; renderShipVectorMap(stage, encounter, { commit, adjudicate, tokenMenu }); };
  heading.append(title, select, rules, zoomTools); panel.append(heading);
  const tools = document.createElement('div'); tools.className = 'vector-controls';
  const field = (name, value) => { const label = document.createElement('label'); label.textContent = name + ' '; const input = document.createElement('input'); input.type = 'number'; input.value = value; input.step = '0.1'; label.append(input); tools.append(label); return input; };
  const held = pendingThrust[selected] ?? { x: 0, y: 0 };
  const ax = field('Thrust X (G)', String(held.x)), ay = field('Thrust Y (G)', String(held.y));
  const button = document.createElement('button'); button.id = 'vector-commit'; button.textContent = 'COMMIT MANEUVER'; tools.append(button); panel.append(tools);
  const p = encounter.participants.find(p => p.id === selected);
  // v0.156.2: six separate conditions greyed this button and it named none of
  // them, so a ship that simply was not on the phasing side looked broken. Each
  // reason cites the rule or the state it comes from, in the order the engine's
  // own guard checks them.
  const phaseNames = ['MOVEMENT', 'LASER FIRE', 'LASER RETURN FIRE', 'ORDNANCE LAUNCH', 'REPROGRAMMING'];
  const commitBlockedBecause = encounter.outcome !== 'in-progress'
    ? `This fight is over (${String(encounter.outcome).toUpperCase()}).`
    : p.escaped ? `${p.name} has escaped the action.`
    : p.surrendered ? `${p.name} has surrendered.`
    : p.side !== encounter.phasingSide
      ? `${p.name} is ${p.side}, and it is the ${encounter.phasingSide} player turn. Book 2 p.23: a side moves in its own turn, so this thrust is held until then.`
      : encounter.phaseIndex !== 0
        ? `Ships move in the movement phase; this is ${phaseNames[encounter.phaseIndex] ?? 'another phase'}. Book 2 p.22: activity happens only in its own phase.`
        : encounter.spatial.ships[selected].movedTurn === encounter.gameTurn
          ? `${p.name} has already moved this game turn.`
          : null;
  button.disabled = Boolean(commitBlockedBecause);
  button.title = commitBlockedBecause ?? 'Adds this thrust to the ship\u2019s existing vector and moves it (Book 2 p.26).';
  if (commitBlockedBecause) {
    const why = document.createElement('span');
    why.className = 'vector-commit-blocked';
    why.textContent = commitBlockedBecause;
    tools.append(why);
  }
  // v0.165.0: the engine refuses a course that meets the world, so the button
  // says so as the thrust changes rather than failing on click. draw() sets it.
  const surfaceWhy = document.createElement('span');
  surfaceWhy.className = 'vector-surface-blocked';
  surfaceWhy.hidden = true;
  tools.append(surfaceWhy);
  // v0.165.0: a coasting course into the world has to be ruled before movement
  // can end (Book 2 p.26 moves every ship; nothing in pp.26-29 says what a world
  // does to one). Offered only where the engine would accept it.
  if (adjudicate && !commitBlockedBecause) {
    let coastingIntoWorld = false;
    try {
      const coastPreview = previewShipVector(encounter, selected, { x: 0, y: 0 });
      coastingIntoWorld = Boolean(coastPreview.unresolved || coastPreview.surfaceContact);
    } catch { coastingIntoWorld = false; }
    if (coastingIntoWorld) {
      const ruling = document.createElement('fieldset');
      ruling.className = 'vector-controls vector-surface-ruling';
      const legend = document.createElement('legend');
      legend.textContent = 'SURFACE RULING';
      const explain = document.createElement('p');
      explain.textContent = `${p.name}'s coasting course reaches the world. Book 2's gravity bands stop at the surface and no rule says what happens there, so ADVANCE waits for your ruling: thrust away from it, or place the ship outside the surface with the vector it leaves on. A landing or a loss closes the encounter instead.`;
      ruling.append(legend, explain);
      const own = encounter.spatial.ships[selected];
      const input = (name, value) => {
        const label = document.createElement('label');
        label.textContent = `${name} `;
        const field = document.createElement('input');
        field.type = 'number'; field.step = '0.1'; field.value = String(Number(value.toFixed(2)));
        label.append(field); ruling.append(label);
        return field;
      };
      const rx = input('X', own.position.x), ry = input('Y', own.position.y);
      const rvx = input('VX', 0), rvy = input('VY', 0);
      const noteLabel = document.createElement('label');
      noteLabel.textContent = 'RULING ';
      const noteField = document.createElement('input');
      noteField.type = 'text';
      noteField.placeholder = 'What happened, in a sentence (logged)';
      noteLabel.append(noteField);
      const record = document.createElement('button');
      record.type = 'button';
      record.textContent = 'RECORD RULING';
      record.onclick = () => adjudicate(selected, {
        position: { x: Number(rx.value), y: Number(ry.value) },
        velocity: { x: Number(rvx.value), y: Number(rvy.value) },
        note: noteField.value
      });
      ruling.append(noteLabel, record);
      panel.append(ruling);
    }
  }
  // v0.171.0: INITIAL POSITION / VELOCITY and APPLY INITIAL STATE removed. Its
  // callback was `() => {}` in every release, and a fight's starting positions
  // and vectors now come from the scene it was staged on.
  const svg = node('svg', { role:'img', 'aria-label':'Ship positions, velocity and acceleration vectors', viewBox:'0 0 800 430', preserveAspectRatio:'xMidYMid meet' }); svg.classList.add('ship-vector-svg'); panel.append(svg);
  const toView = (clientX, clientY) => { const ctm = svg.getScreenCTM(); if (!ctm) return null; const point = svg.createSVGPoint(); point.x = clientX; point.y = clientY; return point.matrixTransform(ctm.inverse()); };
  function applyView() {
    const w = VIEW_W / view.zoom, h = VIEW_H / view.zoom;
    view.cx = clamp(view.cx, 0, VIEW_W);
    view.cy = clamp(view.cy, 0, VIEW_H);
    svg.setAttribute('viewBox', `${view.cx - w / 2} ${view.cy - h / 2} ${w} ${h}`);
    zoomLabel.textContent = `${Math.round(view.zoom * 100)}%`;
  }
  // Zooming about the pointer rather than the centre: at 800% the thing you are
  // looking at is what you want to keep, not the middle of the box.
  function zoomTo(next, anchor = null) {
    const zoom = clamp(next, ZOOM_MIN, ZOOM_MAX);
    if (anchor) {
      view.cx = anchor.x - (anchor.x - view.cx) * (view.zoom / zoom);
      view.cy = anchor.y - (anchor.y - view.cy) * (view.zoom / zoom);
    }
    view.zoom = zoom;
    applyView();
    // Sizes are drawn for a zoom, so a new zoom has to redraw (handoff trap).
    if (drawnOnce) draw();
  }
  svg.addEventListener('wheel', (e) => { e.preventDefault(); zoomTo(view.zoom * (e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP), toView(e.clientX, e.clientY)); }, { passive: false });
  // Right-drag and middle-drag pan, matching the stage's own panning. Neither
  // raises a click event, so plotting an endpoint with the left button is
  // untouched and needs no drag threshold.
  let panFrom = null;
  svg.addEventListener('contextmenu', (e) => e.preventDefault());
  svg.addEventListener('pointerdown', (e) => { if (e.button !== 1 && e.button !== 2) return; panFrom = { x: e.clientX, y: e.clientY }; svg.setPointerCapture(e.pointerId); e.preventDefault(); });
  svg.addEventListener('pointermove', (e) => {
    if (!panFrom) return;
    const from = toView(panFrom.x, panFrom.y), to = toView(e.clientX, e.clientY);
    if (!from || !to) return;
    view.cx -= to.x - from.x;
    view.cy -= to.y - from.y;
    panFrom = { x: e.clientX, y: e.clientY };
    applyView();
  });
  const endPan = (e) => { if (!panFrom) return; panFrom = null; if (svg.hasPointerCapture?.(e.pointerId)) svg.releasePointerCapture(e.pointerId); };
  svg.addEventListener('pointerup', endPan);
  svg.addEventListener('pointercancel', endPan);
  applyView();
  // v0.155.0: Book 2 p.27 says the template "should be marked with its values
  // for R, G, M, D, and K, as well as the planet's name, and any other
  // interesting data" — a hover card specified fifty years early. Anchored to
  // the plot's corner rather than following the cursor, so it never sits where
  // the endpoint is being dragged.
  const planetCard = document.createElement('div');
  planetCard.className = 'vector-planet-card';
  planetCard.hidden = true;
  panel.append(planetCard);
  const status = document.createElement('div'); status.id='vector-status'; status.className='vector-controls'; status.setAttribute('aria-live','polite'); panel.append(status);
  const note = document.createElement('p');
  // v0.139.0: gravity is drawn now. Book 2 p.29 samples the band at the
  // MIDPOINT of the course, which is why the midpoint is marked — a ship can
  // end a turn deep in a well and still take no gravity, or the reverse.
  const CAMERA_NOTE = ' Wheel or [ + ] / [ \u2212 ] to zoom, right-drag or middle-drag to pan, [ FIT ] for the whole plot.';
  note.textContent = (encounter.spatial.planet
    ? 'Coordinates in thousands of miles; turn = 10 minutes. Solid line: velocity. Dashed line: proposed movement. The shaded disc is the world and the rings are its quarter-G bands (Book 2 p.27). The cross marks the course midpoint, which is where gravity is sampled (p.29). ADVANCE coasts every ship not yet committed (p.26). Diamonds are missiles; circles are sand, dashed until it takes effect.'
    : 'Clear space: coordinates in thousands of miles; turn = 10 minutes. Solid line: velocity. Dashed line: proposed movement. ADVANCE coasts every ship not yet committed (p.26). No world is placed, so no gravity applies. Diamonds are missiles; circles are sand, dashed until it takes effect.') + CAMERA_NOTE;
  panel.append(note);
  let transform, dragBasis = null, suppressNextClick = false, drawnOnce = false;
  function draw() {
    drawnOnce = true;
    // v0.189.0: ships are raised above everything drawn after them, and the
    // endpoint handle above the ships. The dashed preview and the reachable
    // envelope used to be drawn over the tokens and took their clicks, so a
    // ship inside another's envelope, or under its own preview line, could not
    // be selected at all.
    const shipLayer = [];
    let endpointHandle = null;
    const pixelUnits = view.zoom * svgPixelScale(svg, VIEW_W, VIEW_H);
    const px = (n) => n / pixelUnits;
    pendingThrust[selected] = { x: Number(ax.value) || 0, y: Number(ay.value) || 0 };
    svg.replaceChildren();
    // Book 2 p.25 states a vector as inches and a bearing ("6 inches at 90"),
    // which is the single most important number in vector movement and was
    // readable only by eyeballing the solid line.
    const own = encounter.spatial.ships[selected];
    const speed = own ? Math.hypot(own.velocity.x, own.velocity.y) : 0;
    const bearing = speed ? ((Math.atan2(own.velocity.y, own.velocity.x) * 180 / Math.PI) + 360) % 360 : 0;
    const vector = speed
      ? `VEL ${speed.toFixed(1)}" @ ${String(Math.round(bearing)).padStart(3, '0')}\u00b0`
      : 'VEL 0" (STATIONARY)';
    let preview;
    try {
      preview = previewShipVector(encounter, selected, { x:Number(ax.value)*2, y:Number(ay.value)*2 });
      const touchesWorld = Boolean(preview.unresolved || preview.surfaceContact);
      surfaceWhy.hidden = Boolean(commitBlockedBecause) || !touchesWorld;
      surfaceWhy.textContent = touchesWorld ? 'This course reaches the world\u2019s surface. Book 2 has no rule for that, so it cannot be committed: change the thrust, or record a surface ruling.' : '';
      button.disabled = Boolean(commitBlockedBecause) || touchesWorld;
      if (preview.unresolved) {
        // Book 2's bands are external; nothing in it describes motion inside a
        // world, so the course goes to the referee rather than being guessed.
        status.textContent = `${vector} · ${preview.g.toFixed(2)} G / max ${preview.maximumG} G · REFEREE: ${preview.reason}`;
        preview = null;
      } else {
        const gravity = preview.bandG
          ? ` · gravity ${preview.bandG} G band, ${Math.hypot(preview.gravity.x, preview.gravity.y).toFixed(2)} toward the world`
          : '';
        const braked = preview.braked ? ' · BRAKED by atmosphere (p.35)' : '';
        const contact = preview.surfaceContact ? ' · SURFACE CONTACT' : '';
        status.textContent = `${vector} · ${preview.g.toFixed(2)} G / max ${preview.maximumG} G · Endpoint ${preview.endpoint.x.toFixed(2)}, ${preview.endpoint.y.toFixed(2)}${gravity}${braked}${contact}`;
      }
    }
    catch(e) { status.textContent=e.message; }
    // Book 2 p.26 adds thrust to the vector the ship ALREADY has, so the set of
    // endpoints a drive can reach is a circle centred on where velocity alone
    // would carry the ship — not on the ship. A stationary 1G ship may go two
    // inches anywhere; the same ship doing 20 inches may only nudge its arrival
    // point by two, which is the whole feel of vector movement and is invisible
    // in a pair of typed thrust fields.
    //
    // Gravity is sampled at the course midpoint and is independent of thrust
    // (planetary-gravity.js), so the coasting endpoint carries it and the
    // envelope stays a true circle around that point. Atmospheric braking can
    // shorten the result, so inside a braking band the envelope is approximate.
    let coast = null, envelope = null;
    try {
      const at = previewShipVector(encounter, selected, { x: 0, y: 0 });
      if (at.resolved !== false && !at.unresolved) {
        const factor = encounter.spatial.accelerationMode === 'constant' ? 0.5 : 1;
        coast = at.endpoint;
        envelope = { centre: at.endpoint, maximumG: at.maximumG, radiusInches: at.maximumG * 2 * factor, factor };
      }
    } catch { coast = null; envelope = null; }
    const points = Object.values(encounter.spatial.ships).flatMap(s => [s.position, {x:s.position.x+s.velocity.x,y:s.position.y+s.velocity.y}]);
    if (preview) points.push(preview.endpoint);
    // The world has to fit too, out to its weakest band, or the disc is drawn
    // off the edge of the surface it is meant to explain.
    const planet = encounter.spatial.planet ?? null;
    if (planet) {
      const reach = Math.max(planet.radius, ...(planet.bands ?? []).map(b => b.outerRadius));
      points.push({ x: planet.center.x - reach, y: planet.center.y - reach }, { x: planet.center.x + reach, y: planet.center.y + reach });
    }
    const minX=Math.min(...points.map(p=>p.x))-10,maxX=Math.max(...points.map(p=>p.x))+10,minY=Math.min(...points.map(p=>p.y))-10,maxY=Math.max(...points.map(p=>p.y))+10;
    // v0.148.0: the drawing area is the viewBox less a margin on each side, and
    // the content is centred in it. Previously the height allowance was well
    // short of the box, which left the plot sitting low with empty space above.
    const MARGIN = 28;
    const width = 800 - MARGIN * 2;
    const height = 430 - MARGIN * 2;
    const scale = Math.min(width / (maxX - minX), height / (maxY - minY));
    const x=v=>400+(v-(minX+maxX)/2)*scale,y=v=>215-(v-(minY+maxY)/2)*scale;
    transform={x,y,scale};dragBasis=envelope;
    if (planet) {
      // Outermost band first, so the stronger inner bands read as denser.
      for (const [bandIndex, band] of [...(planet.bands ?? [])].sort((a, b) => b.outerRadius - a.outerRadius).entries()) {
        svg.append(node('circle', {
          cx: x(planet.center.x), cy: y(planet.center.y), r: band.outerRadius * scale,
          fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.35, 'stroke-dasharray': `${px(3)} ${px(5)}`, 'stroke-width': px(1)
        }));
        // v0.148.0: every label sat at the top of its ring, so three bands
        // 8.0, 5.7 and 4.6 apart printed almost on top of one another and the
        // innermost landed on the planet's edge. Spread them around the circle
        // instead, one band per bearing, so each label sits on open arc.
        const bearing = (bandIndex / Math.max(1, planet.bands.length)) * Math.PI * 2 + Math.PI / 4;
        svg.append(node('text', {
          x: x(planet.center.x + Math.cos(bearing) * band.outerRadius),
          y: y(planet.center.y + Math.sin(bearing) * band.outerRadius) + px(4),
          fill: 'currentColor', 'fill-opacity': 0.6, 'text-anchor': 'middle', 'font-size': px(10)
        }, `${band.g} G`));
      }
      svg.append(node('circle', {
        cx: x(planet.center.x), cy: y(planet.center.y), r: planet.radius * scale,
        fill: 'currentColor', 'fill-opacity': 0.18, stroke: 'currentColor', 'stroke-opacity': 0.5, 'stroke-width': px(1)
      }));
      svg.append(node('text', {
        x: x(planet.center.x), y: y(planet.center.y) + px(4),
        fill: 'currentColor', 'text-anchor': 'middle', 'font-size': px(11)
      }, planet.name));
      // v0.155.1: the hover target covered the whole template, out to the
      // weakest band — which is open space that ships fly through and where an
      // endpoint has to be draggable. The disc is the target now.
      const hover = node('circle', {
        cx: x(planet.center.x), cy: y(planet.center.y), r: planet.radius * scale,
        fill: 'transparent', stroke: 'none'
      });
      hover.style.cursor = 'help';
      hover.addEventListener('pointerenter', () => { planetCard.hidden = false; });
      hover.addEventListener('pointerleave', () => { planetCard.hidden = true; });
      svg.append(hover);
      const atmosphere = encounter.spatial.atmosphere;
      const brakes = Number.isInteger(atmosphere) ? atmosphereBrakes(atmosphere) : false;
      planetCard.replaceChildren();
      const rows = [
        ['D / DIAMETER', `${(planet.radius * 2).toFixed(2)}" \u00b7 ${(planet.radius * 2000).toLocaleString('en-US')} MILES`],
        ['R / RADIUS', `${planet.radius.toFixed(2)}"`],
        ['G / SURFACE', `${planet.surfaceG.toFixed(2)} G`],
        ['M / MASS', `${planet.massEarth.toFixed(3)} EARTH`],
        ['K / DENSITY', `${Number(planet.densityEarth).toFixed(2)} EARTH`],
        ['BANDS', (planet.bands ?? []).map((b) => `${b.g} G at ${b.outerRadius.toFixed(2)}"`).join(' \u00b7 ') || 'NONE'],
        ['ATMOSPHERE', Number.isInteger(atmosphere) ? String(atmosphere) : 'NOT SET'],
        ['BRAKING', brakes
          ? `YES \u00b7 a vector within ${ATMOSPHERIC_BRAKING_BAND}" of the surface loses ${ATMOSPHERIC_BRAKING_BAND}" (p.35)`
          : 'NO \u00b7 needs a standard or dense atmosphere (p.35)'],
        ['SURFACE', 'A course crossing the disc is referred to the referee']
      ];
      const name = document.createElement('strong');
      name.textContent = planet.name.toUpperCase();
      planetCard.append(name);
      for (const [label, value] of rows) {
        const row = document.createElement('div');
        row.className = 'vector-planet-row';
        const key = document.createElement('span');
        key.className = 'vector-planet-key';
        key.textContent = label;
        const text = document.createElement('span');
        text.textContent = value;
        row.append(key, text);
        planetCard.append(row);
      }
    }
    // v0.153.0: Book 2 p.30's range DMs are the whole of what distance does in
    // this game — -2 beyond 150", -5 beyond 300", and nothing in between. On a
    // table the ruler makes that legible; an auto-fitting plot re-scales every
    // turn, so the thresholds were invisible until a shot was resolved. Drawn
    // around the selected ship, dashed to read as a measurement rather than as
    // a feature of space the way the gravity bands are.
    const selectedShip = encounter.spatial.ships[selected];
    if (selectedShip) {
      const visibleSpan = Math.max(VIEW_W, VIEW_H) / view.zoom;
      for (const band of LASER_RANGE_DMS) {
        const r = band.overInches * scale;
        // Only when part of the ring is actually in view; at a close fit the
        // 150" threshold is several screens away and drawing it is noise.
        if (r > visibleSpan) continue;
        svg.append(node('circle', {
          cx: x(selectedShip.position.x), cy: y(selectedShip.position.y), r,
          fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.25,
          'stroke-dasharray': `${px(2)} ${px(6)}`, 'stroke-width': px(1)
        }));
        svg.append(node('text', {
          x: x(selectedShip.position.x), y: y(selectedShip.position.y) - r - px(3),
          fill: 'currentColor', 'fill-opacity': 0.5, 'text-anchor': 'middle',
          'font-size': px(9)
        }, `${band.overInches}" \u00b7 DM ${band.dm}`));
      }
    }

    // A stated scale, because the fit changes between turns. With a world on
    // the plot its disc already calibrates everything (1" = 1,000 miles, so a
    // size-8 world is 8" across); in clear space there is no reference object
    // at all and this is the only distance cue.
    const halfWidth = VIEW_W / view.zoom / 2, halfHeight = VIEW_H / view.zoom / 2;
    const targetUnits = px(140);
    const NICE = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    const inches = NICE.filter((step) => step * scale <= targetUnits).pop() ?? NICE[0];
    const barLength = inches * scale;
    const barX = view.cx - halfWidth + px(12);
    const barY = view.cy + halfHeight - px(14);
    const tick = px(4);
    svg.append(node('path', {
      d: `M${barX} ${barY - tick} L${barX} ${barY} L${barX + barLength} ${barY} L${barX + barLength} ${barY - tick}`,
      fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.55, 'stroke-width': px(1)
    }));
    svg.append(node('text', {
      x: barX, y: barY - tick - px(3),
      fill: 'currentColor', 'fill-opacity': 0.6, 'font-size': px(9)
    }, `${inches}" \u00b7 ${(inches * 1000).toLocaleString('en-US')} MILES`));

    // v0.156.0: the string left on the table. Book 2 p.26: "The vector then
    // remains on the playing surface for reference during the next applicable
    // movement phase." Every committed move is logged with its from and its
    // endpoint, so the whole course is reconstructible without new state.
    //
    // Deliberately NOT added to the fit: including old positions would zoom the
    // plot out further every turn until the current fight was a speck. The
    // trail can run off the edge, and the camera goes to it.
    for (const ship of encounter.participants) {
      const moves = encounter.log.filter((entry) => entry.kind === 'vector-move' && entry.shipId === ship.id && entry.from && entry.endpoint);
      for (const [index, move] of moves.entries()) {
        const age = moves.length - index;
        svg.append(node('line', {
          x1: x(move.from.x), y1: y(move.from.y), x2: x(move.endpoint.x), y2: y(move.endpoint.y),
          stroke: 'currentColor', 'stroke-opacity': Math.max(0.12, 0.4 - age * 0.04),
          'stroke-width': px(1)
        }));
        svg.append(node('circle', {
          cx: x(move.from.x), cy: y(move.from.y), r: px(1.5),
          fill: 'currentColor', 'fill-opacity': 0.3
        }));
      }
    }
    // v0.168.0: ordnance on the plot. It had position and velocity since
    // v1.214.00 and was never drawn, so a missile closing on a ship or a sand
    // cloud on the line of fire could only be read from the log. Sand is its
    // ruled radius, dashed until it takes effect; a missile is a small diamond
    // with its velocity, ringed once it has made contact.
    for (const round of encounter.ordnance ?? []) {
      if (!round.position || !['in-flight', 'pending-effect', 'active', 'contact'].includes(round.status)) continue;
      const cx = x(round.position.x), cy = y(round.position.y);
      if (round.kind === 'sand') {
        const active = round.status === 'active';
        const cloud = node('circle', {
          cx, cy, r: Math.max(round.ruling.radius * scale, px(3)),
          fill: 'currentColor', 'fill-opacity': active ? 0.18 : 0.05,
          stroke: 'currentColor', 'stroke-opacity': 0.6, 'stroke-width': px(1),
          ...(active ? {} : { 'stroke-dasharray': `${px(3)} ${px(3)}` })
        });
        cloud.classList.add('vector-sand');
        svg.append(cloud);
        svg.append(node('text', { x: cx, y: cy - Math.max(round.ruling.radius * scale, px(3)) - px(2), fill: 'currentColor', 'fill-opacity': 0.7, 'text-anchor': 'middle', 'font-size': px(8) }, active ? 'SAND' : 'SAND (NEXT PHASE D)'));
        continue;
      }
      if (round.velocity) {
        svg.append(node('line', { x1: cx, y1: cy, x2: x(round.position.x + round.velocity.x), y2: y(round.position.y + round.velocity.y), stroke: 'currentColor', 'stroke-opacity': 0.6, 'stroke-width': px(1) }));
      }
      const m = px(3.5);
      const missile = node('polygon', { points: `${cx},${cy - m} ${cx + m},${cy} ${cx},${cy + m} ${cx - m},${cy}`, fill: 'currentColor' });
      missile.classList.add('vector-missile');
      // v0.187.0: whose missile this is, so phase D shows whose ordnance is
      // about to detonate on whom. Dashes still carry not-yet-in-effect.
      missile.classList.add(vectorSideClass(round.launcherSide));
      svg.append(missile);
      if (round.status === 'contact') {
        svg.append(node('circle', { cx, cy, r: m * 2.2, fill: 'none', stroke: 'currentColor', 'stroke-width': px(1.5) }));
      }
      svg.append(node('text', { x: cx + m * 1.6, y: cy + m, fill: 'currentColor', 'fill-opacity': 0.8, 'font-size': px(8) }, `${round.id}${round.status === 'contact' ? ' CONTACT' : ''}`));
    }
    for(const ship of encounter.participants){const s=encounter.spatial.ships[ship.id];
      svg.append(node('line',{x1:x(s.position.x),y1:y(s.position.y),x2:x(s.position.x+s.velocity.x),y2:y(s.position.y+s.velocity.y),stroke:'currentColor','stroke-width':px(1.5)}));
      // Heading, not facing. Book 2 gives ships no orientation and no firing
      // arcs — p.22 asks only that a miniature be marked with a point for its
      // true location. What an arrow can honestly show is the direction of
      // travel, so a stationary ship stays a dot: p.25 says that with a vector
      // of 0 "the direction becomes irrelevant".
      const speed = Math.hypot(s.velocity.x, s.velocity.y);
      const size = px(ship.id === selected ? 7 : 5);
      let token;
      if (speed > 0) {
        const angle = Math.atan2(-s.velocity.y, s.velocity.x);
        const point = (distance, offset) => {
          const a = angle + offset;
          return `${x(s.position.x) + Math.cos(a) * distance},${y(s.position.y) + Math.sin(a) * distance}`;
        };
        token = node('polygon', {
          points: [point(size * 1.4, 0), point(size, Math.PI * 0.78), point(size, -Math.PI * 0.78)].join(' '),
          fill: 'currentColor'
        });
      } else {
        token = node('circle', { cx: x(s.position.x), cy: y(s.position.y), r: size * 0.6, fill: 'currentColor' });
      }
      token.classList.add('vector-ship-token');
      // v0.187.0: the side carries the colour. Book 2 p.23's intruder/native
      // split is turn ORDER, not friend and foe — the INT/NAT pills in the
      // phase rail keep saying that — so the hue follows the side a ship
      // fights on, which is what a referee scanning a three-ship board needs.
      token.classList.add(vectorSideClass(ship.side));
      // v0.189.0: the token sits in a group with a transparent hit disc, so a
      // 5px arrow is not a 5px target, and the group carries the ship's id for
      // the selection and hover marks. Clicks on the disc are still "on a ship",
      // not on empty space, so they never plot an endpoint (a circle target).
      const cx = x(s.position.x), cy = y(s.position.y);
      const group = node('g', { 'data-ship-id': ship.id });
      group.classList.add('vector-ship');
      const hit = node('circle', { cx, cy, r: px(11), fill: 'transparent' });
      hit.classList.add('vector-ship-hit');
      group.append(hit, token);
      group.style.cursor = 'pointer';
      group.addEventListener('click', () => choose(ship.id));
      // Hover toggles its mark in place rather than redrawing the plot, which
      // would rebuild the thrust fields under the user's cursor.
      const hoverMark = node('path', { d: cornerBrackets(cx, cy, px(11), px(4)), 'stroke-width': px(1.5) });
      hoverMark.classList.add('vector-ship-hover');
      if (hovered === ship.id && ship.id !== selected) hoverMark.classList.add('is-hovered');
      group.addEventListener('pointerenter', () => {
        hovered = ship.id;
        svg.querySelectorAll('.vector-ship-hover.is-hovered').forEach((mark) => mark.classList.remove('is-hovered'));
        if (ship.id !== selected) hoverMark.classList.add('is-hovered');
      });
      group.addEventListener('pointerleave', () => {
        if (hovered === ship.id) hovered = null;
        hoverMark.classList.remove('is-hovered');
      });
      // v0.170.0: the token's menu. A right-button press on a token must not
      // start the plot's pan, or the menu opens on a moving board.
      if (tokenMenu) {
        group.addEventListener('pointerdown', (event) => { if (event.button === 2) event.stopPropagation(); });
        group.addEventListener('contextmenu', (event) => {
          event.preventDefault(); event.stopPropagation();
          tokenMenu(event, ship.id, { select: () => choose(ship.id) });
        });
        token.append(node('title', {}, `${ship.name}: click to select, right-click for actions`));
      }
      svg.append(group, hoverMark);
      shipLayer.push(group, hoverMark);
      // v0.189.0: the selected ship wears the gold corner brackets every other
      // Graycloak board uses for "the one you are giving orders to" — the
      // personal board's ring and the scene board's brackets are the same gold.
      if (ship.id === selected) {
        const mark = node('path', { d: cornerBrackets(cx, cy, px(12), px(5)), 'stroke-width': px(2) });
        mark.classList.add('vector-ship-selected');
        svg.append(mark);
        shipLayer.push(mark);
      }
      // v0.190.0: a ship the selected ship's turrets are aimed at wears the
      // personal board's target ring, dashed so it never reads as selection.
      if (targetsOf && selected && targetsOf(selected).includes(ship.id)) {
        const ring = node('circle', { cx, cy, r: px(15), 'stroke-width': px(2), 'stroke-dasharray': `${px(4)} ${px(3)}` });
        ring.classList.add('vector-ship-target');
        svg.append(ring);
        shipLayer.push(ring);
      }
      // v0.148.0: no font-size, so the names rendered at the document default
      // and were larger than the world they orbit.
      const label = node('text', {
        x: x(s.position.x) + px(14), y: y(s.position.y) - px(9),
        fill: 'currentColor', 'font-size': px(11),
        'font-weight': ship.id === selected ? '700' : '400'
      }, ship.name);
      // v0.189.0: a ship that has committed its move this turn says so on the
      // plot, not only in the hint line and a disabled COMMIT button.
      if (s.movedTurn === encounter.gameTurn) {
        const moved = node('tspan', { dx: px(4), 'fill-opacity': 0.75 }, '\u2713');
        moved.classList.add('vector-ship-moved');
        moved.append(node('title', {}, `${ship.name} has committed its move this turn (Book 2 p.26).`));
        label.append(moved);
      }
      svg.append(label);
      shipLayer.push(label);
    }
    // The reachable envelope: the ruler and protractor, drawn. Only while the
    // ship may actually move, so it does not imply a choice that is not there.
    if (envelope && envelope.radiusInches > 0 && !button.disabled) {
      // v0.189.0: a drawing, not a target. As a filled circle it caught every
      // click inside it, and the plot ignores clicks on circles, so clicking
      // inside the reachable area never plotted an endpoint.
      const reach = node('circle', {
        cx: x(envelope.centre.x), cy: y(envelope.centre.y), r: envelope.radiusInches * scale,
        fill: 'currentColor', 'fill-opacity': 0.05, stroke: 'currentColor',
        'stroke-opacity': 0.3, 'stroke-width': px(1), 'pointer-events': 'none'
      });
      reach.classList.add('vector-envelope');
      svg.append(reach);
    }
    if(preview){const s=encounter.spatial.ships[selected];svg.append(node('line',{x1:x(s.position.x),y1:y(s.position.y),x2:x(preview.endpoint.x),y2:y(preview.endpoint.y),stroke:'currentColor','stroke-dasharray':`${px(6)} ${px(4)}`,'stroke-width':px(1.5)}));
      const handle=node('circle',{cx:x(preview.endpoint.x),cy:y(preview.endpoint.y),r:px(5),fill:'none',stroke:'currentColor','stroke-width':px(1.5)});
      handle.classList.add('vector-endpoint-handle');
      endpointHandle = handle;
      if(!button.disabled){handle.style.cursor='move';handle.addEventListener('pointerdown',startEndpointDrag);}
      svg.append(handle);
      // Book 2 p.29 reads the band at the midpoint of the course vector, before
      // thrust. Drawing it stops the band a ship is "in" looking arbitrary.
      if (planet) {
        const midpoint = { x: s.position.x + s.velocity.x / 2, y: s.position.y + s.velocity.y / 2 };
        const mx = x(midpoint.x), my = y(midpoint.y);
        svg.append(node('line', { x1: mx - px(4), y1: my, x2: mx + px(4), y2: my, stroke: 'currentColor', 'stroke-opacity': 0.7, 'stroke-width': px(1) }));
        svg.append(node('line', { x1: mx, y1: my - px(4), x2: mx, y2: my + px(4), stroke: 'currentColor', 'stroke-opacity': 0.7, 'stroke-width': px(1) }));
        if (preview.bandG && preview.gravity) {
          svg.append(node('line', {
            x1: mx, y1: my,
            x2: x(midpoint.x + preview.gravity.x), y2: y(midpoint.y + preview.gravity.y),
            stroke: 'currentColor', 'stroke-width': px(2), 'stroke-opacity': 0.8
          }));
        }
      }
    }
    svg.append(...shipLayer);
    if (endpointHandle) svg.append(endpointHandle);
  }
  // Dragging the ENDPOINT, not the ship: where the ship ends up is a choice,
  // where it is now is not. The drop position is solved back into thrust the
  // same way a click is, and clamped to the envelope when rules are enforced.
  function viewPoint(event) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    return point.matrixTransform(ctm.inverse());
  }
  function thrustFromViewPoint(q) {
    if (!transform || !dragBasis) return null;
    const dataX = (q.x - transform.x(0)) / transform.scale;
    const dataY = (transform.y(0) - q.y) / transform.scale;
    let gx = (dataX - dragBasis.centre.x) / dragBasis.factor / 2;
    let gy = (dataY - dragBasis.centre.y) / dragBasis.factor / 2;
    const magnitude = Math.hypot(gx, gy);
    if (enforceThrustLimit && magnitude > dragBasis.maximumG && magnitude > 0) {
      const clamp = dragBasis.maximumG / magnitude;
      gx *= clamp; gy *= clamp;
    }
    return { gx, gy };
  }
  function applyThrustFrom(event) {
    const q = viewPoint(event);
    if (!q) return;
    const thrust = thrustFromViewPoint(q);
    if (!thrust) return;
    ax.value = thrust.gx.toFixed(2);
    ay.value = thrust.gy.toFixed(2);
    draw();
  }
  function startEndpointDrag(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    // draw() replaces the SVG's children on every update, so the handle itself
    // is destroyed mid-drag. Capture and listen on the SVG, which survives.
    event.stopPropagation();
    try { svg.setPointerCapture(event.pointerId); } catch { /* jsdom, and pens */ }
    const move = (moveEvent) => applyThrustFrom(moveEvent);
    const end = (endEvent) => {
      svg.removeEventListener('pointermove', move);
      svg.removeEventListener('pointerup', end);
      svg.removeEventListener('pointercancel', end);
      try { svg.releasePointerCapture(endEvent.pointerId); } catch { /* already released */ }
      suppressNextClick = true;
    };
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
  }
  // The drag clamps to the drive; typing into the fields did not, so a typed
  // figure over the rating reached previewShipVector and came back as a thrown
  // refusal with no course drawn. Same cap, same place.
  function clampFields() {
    if (!enforceThrustLimit || !dragBasis) return;
    const gx = Number(ax.value) || 0, gy = Number(ay.value) || 0;
    const magnitude = Math.hypot(gx, gy);
    if (magnitude > dragBasis.maximumG && magnitude > 0) {
      const clamp = dragBasis.maximumG / magnitude;
      ax.value = (gx * clamp).toFixed(2);
      ay.value = (gy * clamp).toFixed(2);
    }
  }
  ax.oninput=ay.oninput=()=>{clampFields();draw();};
  button.onclick=()=>{const spent=selected;const thrust={x:Number(ax.value)*2,y:Number(ay.value)*2};delete pendingThrust[spent];commit(spent,thrust);};
  // Click an endpoint to plot; do not teleport the ship.
  svg.addEventListener('click',e=>{
    if (suppressNextClick) { suppressNextClick = false; return; }
    // A ship token is a polygon when it is moving, so tagName is no longer the
    // test for "this click was on something, not on empty space".
    if (e.target.tagName === 'circle' || e.target.classList?.contains('vector-ship-token')
      || e.target.classList?.contains('vector-endpoint-handle') || button.disabled || !transform) return;
    const q = viewPoint(e);
    if (!q) return;
    const thrust = thrustFromViewPoint(q);
    if (!thrust) return;
    ax.value = thrust.gx.toFixed(2);
    ay.value = thrust.gy.toFixed(2);
    draw();
  });
  draw();
}

// ---------------------------------------------------------------------------
// v0.164.0: the same plane, before there is a fight on it — with a minimap.
//
// A vector scene is a board in its own right (v0.158.0), so it has to be
// lookable-at without an encounter, which is what closing a fight and finding
// no way back to the map was about.
//
// The scale question, which the earlier version got wrong: this board does NOT
// fit its span. Book 2's span is the whole plane — 400 inches by default, which
// is 400,000 miles — and a fight happens inside a few dozen inches of it, so
// fitting the span made San Telmo's 8-inch disc a speck. The main view instead
// shows a fixed number of inches across at 100% zoom, the way a table shows a
// fixed number of inches of surface, and the minimap carries the whole span
// with the viewport drawn on it.
//
// Deliberately NOT the fight renderer with a null encounter: there are no
// phases here, no thrust and no commit.
const STAGE_INCHES_ACROSS = 100;
const MINIMAP_SIZE = 132;
let stageView = { zoom: 1, cx: 0, cy: 0 };
let stageViewSceneId = null;

// v0.198.0: controlsHost, when given, receives the staging controls (place a
// body, stage a ship, starting conditions and START COMBAT) as one card
// instead of rows above the plot: the scene is a place, and what to do next
// belongs in WHAT NOW?. The handlers are unchanged.
export function renderVectorSceneStage(stage, scene, { moveShip, setVector, stageShip, removeShip, moveBody, removeBody, placeBody, bodies = [], shipChoices = [], startCombat = null, combatBlocked = null, tokenMenu = null, controlsHost = null } = {}) {
  if (!stage) return;
  if (stageViewSceneId !== scene.identity.id) {
    stageViewSceneId = scene.identity.id;
    // Open centred on whatever is staged, or on the origin when nothing is.
    const staged = [...bodies.map((body) => body.center), ...scene.tokens.map((token) => token.position)];
    const centre = staged.length
      ? { x: staged.reduce((sum, p) => sum + p.x, 0) / staged.length, y: staged.reduce((sum, p) => sum + p.y, 0) / staged.length }
      : { x: 0, y: 0 };
    stageView = { zoom: 1, cx: centre.x, cy: centre.y };
  }
  stage.replaceChildren();
  const panel = document.createElement('section');
  panel.id = 'ship-vector-workspace';
  stage.append(panel);

  const heading = document.createElement('div');
  heading.className = 'vector-controls';
  const title = document.createElement('strong');
  // v0.198.0: the scene's name once; the world only when it is not the same
  // name ("SAN TELMO · SAN TELMO · STAGING" read as a stutter).
  const sceneName = scene.identity.name.toUpperCase();
  const worlds = bodies.filter((body) => body.kind === 'world').map((body) => body.name.toUpperCase()).filter((name) => name !== sceneName);
  title.textContent = [sceneName, worlds.join(' + ') || (bodies.some((body) => body.kind === 'world') ? '' : 'CLEAR SPACE'), 'STAGING'].filter(Boolean).join(' \u00b7 ');
  const zoomLabel = document.createElement('span');
  zoomLabel.className = 'map-zoom-label';
  zoomLabel.setAttribute('aria-live', 'polite');
  const zoomTools = document.createElement('span');
  zoomTools.className = 'vector-zoom-tools';
  const zoomButton = (text, label, handler) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'text-button map-zoom-button';
    button.textContent = text; button.setAttribute('aria-label', label); button.onclick = handler;
    return button;
  };
  zoomTools.append(
    zoomButton('[ \u2212 ]', 'Zoom out', () => zoomStage(stageView.zoom / ZOOM_STEP)),
    zoomLabel,
    zoomButton('[ + ]', 'Zoom in', () => zoomStage(stageView.zoom * ZOOM_STEP)),
    zoomButton('[ FIT ]', 'Back to the default scale, centred on the origin', () => { stageView = { zoom: 1, cx: 0, cy: 0 }; draw(); })
  );
  heading.append(title, zoomTools);
  panel.append(heading);

  // Where the three staging rows go: the dock card when a host is given.
  let card = null;
  const host = (() => {
    if (!controlsHost) return panel;
    controlsHost.replaceChildren();
    card = document.createElement('div');
    card.className = 'procedure-card required dock-staging-card';
    const head = document.createElement('div');
    head.className = 'procedure-card-title';
    head.append(
      Object.assign(document.createElement('span'), { textContent: 'Stage the scene' }),
      Object.assign(document.createElement('span'), { className: 'procedure-card-tag', textContent: `${scene.tokens.length} SHIP${scene.tokens.length === 1 ? '' : 'S'}` })
    );
    card.append(head);
    const copy = document.createElement('div');
    copy.className = 'procedure-card-copy';
    copy.textContent = 'Place bodies, stage ships on their sides, then set who intrudes and the pressure state. Book 2 pp.22-23.';
    card.append(copy);
    controlsHost.append(card);
    controlsHost.hidden = false;
    return card;
  })();
  const step = (label) => {
    if (!card) return null;
    const lab = document.createElement('div');
    lab.className = 'procedure-group-label dock-staging-step';
    lab.textContent = label;
    host.append(lab);
    return lab;
  };

  // Placing a world, a belt or a battery. What matters about each is its data
  // rather than where it starts, so each arrives at the view's centre and is
  // dragged from there.
  if (placeBody) {
    step('1 \u00b7 BODIES');
    const tools = document.createElement('div');
    tools.className = 'vector-controls';
    const kind = document.createElement('select');
    kind.setAttribute('aria-label', 'Kind of body');
    kind.add(new Option('WORLD', 'world'));
    kind.add(new Option('ASTEROID BELT', 'asteroid-field'));
    kind.add(new Option('DEFENCE BATTERY', 'emplacement'));
    const name = document.createElement('input');
    name.type = 'text'; name.maxLength = 40; name.placeholder = 'name';
    name.setAttribute('aria-label', 'Name');
    const sizeLabel = document.createElement('label');
    const sizeText = document.createTextNode('DIAMETER ');
    const size = document.createElement('input');
    size.type = 'number'; size.step = '1'; size.min = '1'; size.value = '8';
    sizeLabel.append(sizeText, size);
    const add = document.createElement('button');
    add.type = 'button';
    add.textContent = 'PLACE';
    const describe = () => {
      // A world by diameter (Book 3's size digit, and p.28's figures for a gas
      // giant), a belt by the extent it covers, a battery by its turrets.
      sizeText.textContent = kind.value === 'world' ? 'DIAMETER "' : kind.value === 'asteroid-field' ? 'RADIUS "' : 'TURRETS ';
      size.value = kind.value === 'world' ? '8' : kind.value === 'asteroid-field' ? '20' : '3';
    };
    kind.onchange = describe;
    describe();
    add.onclick = () => {
      const label = name.value.trim();
      const value = Number.parseFloat(size.value);
      const at = { x: stageView.cx, y: stageView.cy };
      if (kind.value === 'world') placeBody({ kind: 'world', name: label || 'World', diameter: value, densityEarth: 1, center: at });
      else if (kind.value === 'asteroid-field') placeBody({ kind: 'asteroid-field', name: label || 'Asteroid belt', radius: value, center: at });
      else placeBody({ kind: 'emplacement', name: label || 'Defence battery', site: 'orbital', turrets: Math.max(1, Math.round(value)), center: at });
      name.value = '';
    };
    tools.append(kind, name, sizeLabel, add);
    host.append(tools);
  }

  // v0.166.0: the fight starts from this board. The intruder is the referee's
  // call (Book 2 p.22 names the sides "for convenience"); pressurisation is
  // p.35's, and only the campaign's own ship has a crew placed to lose.
  const startBlock = () => {
    if (!startCombat) return;
    step('3 \u00b7 STARTING CONDITIONS');
    const tools = document.createElement('div');
    tools.className = 'vector-controls vector-start-combat';
    const intruder = document.createElement('select');
    intruder.setAttribute('aria-label', 'Intruder');
    intruder.add(new Option('OPPOSITION INTRUDES', 'opposition'));
    intruder.add(new Option('PARTY INTRUDES', 'party'));
    const pressure = document.createElement('select');
    pressure.setAttribute('aria-label', 'Pressurisation');
    pressure.add(new Option('DEPRESSURISED', 'depressurised'));
    pressure.add(new Option('CAUGHT PRESSURISED', 'pressurised'));
    const start = document.createElement('button');
    start.type = 'button';
    start.id = 'vector-start-combat';
    start.textContent = card ? '[ START COMBAT ]' : 'START COMBAT';
    if (card) start.className = 'text-button action-button';
    start.disabled = Boolean(combatBlocked);
    start.title = combatBlocked ?? 'Party and opposition ships fight from where they are staged, on the vectors they are staged with. Neutral ships stay out. The intruder moves first every game turn (Book 2 p.23).';
    start.onclick = () => startCombat({ intruder: intruder.value, pressurised: pressure.value === 'pressurised' });
    tools.append(intruder, pressure, start);
    if (combatBlocked) {
      const why = document.createElement('span');
      why.className = 'vector-commit-blocked';
      why.textContent = combatBlocked;
      tools.append(why);
    }
    host.append(tools);
  };
  if (!card) startBlock();

  if (stageShip && shipChoices.length) {
    step('2 \u00b7 SHIPS');
    const tools = document.createElement('div');
    tools.className = 'vector-controls';
    const picker = document.createElement('select');
    picker.setAttribute('aria-label', 'Ship to stage');
    for (const choice of shipChoices) picker.add(new Option(`${choice.label} \u00b7 ${choice.note}`, choice.actorId));
    const sidePicker = document.createElement('select');
    sidePicker.setAttribute('aria-label', 'Side');
    sidePicker.add(new Option('PARTY', 'party'));
    sidePicker.add(new Option('OPPOSITION', 'opposition'));
    sidePicker.add(new Option('NEUTRAL', 'neutral'));
    const add = document.createElement('button');
    add.type = 'button';
    add.textContent = 'STAGE SHIP';
    add.onclick = () => {
      const choice = shipChoices.find((entry) => entry.actorId === picker.value);
      if (choice) stageShip(choice, sidePicker.value);
    };
    tools.append(picker, sidePicker, add);
    host.append(tools);
  }
  if (card) startBlock();

  const board = document.createElement('div');
  board.className = 'vector-stage-board';
  panel.append(board);

  const svg = node('svg', {
    role: 'img', 'aria-label': `${scene.identity.name} staging board`,
    viewBox: `0 0 ${VIEW_W} ${VIEW_H}`, preserveAspectRatio: 'xMidYMid meet'
  });
  svg.classList.add('ship-vector-svg');
  board.append(svg);

  // The minimap: the whole span, with the viewport drawn on it. Click or drag
  // to move the viewport, which is the answer to a plane far larger than any
  // useful view of it (p.28 notes Luna alone is 250 inches away at this scale).
  const minimap = node('svg', {
    role: 'img', 'aria-label': 'Whole board, with the current view marked',
    viewBox: `0 0 ${MINIMAP_SIZE} ${MINIMAP_SIZE}`, width: MINIMAP_SIZE, height: MINIMAP_SIZE
  });
  minimap.classList.add('vector-minimap');
  board.append(minimap);

  const status = document.createElement('div');
  status.id = 'vector-stage-status';
  status.className = 'vector-controls';
  status.setAttribute('aria-live', 'polite');
  panel.append(status);

  const note = document.createElement('p');
  note.textContent = (bodies.length || scene.tokens.length)
    ? 'Drag a ship to move it; drag its vector arrowhead to set the course it arrives on; right-click a ship for its side, vector, name, data card, duplicate and remove. Right-drag to pan, or click the minimap. Coordinates in thousands of miles (Book 2 p.22).'
    : 'Nothing staged. PLACE a world, belt or battery, and STAGE SHIP to put a ship on the board.';
  panel.append(note);

  // px per inch, explicitly. VIEW_W user units span STAGE_INCHES_ACROSS inches
  // at 100%, and zoom divides that — so 100% is always the same scale on this
  // board regardless of how large the span is.
  // What is being dragged right now, and where the pointer has it. Null except
  // during a gesture.
  let dragPreview = null;
  const shipAt = (token) => (dragPreview?.kind === 'ship' && dragPreview.id === token.id && dragPreview.point) || token.position;
  const vectorOf = (token) => (dragPreview?.kind === 'vector' && dragPreview.id === token.id && dragPreview.point
    ? { x: dragPreview.point.x - shipAt(token).x, y: dragPreview.point.y - shipAt(token).y }
    : (token.velocity ?? { x: 0, y: 0 }));
  const bodyAt = (body) => (dragPreview?.kind === 'body' && dragPreview.id === body.id && dragPreview.point) || body.center;
  const unitsPerInch = VIEW_W / STAGE_INCHES_ACROSS;
  const x = (value) => VIEW_W / 2 + (value - stageView.cx) * unitsPerInch;
  const y = (value) => VIEW_H / 2 - (value - stageView.cy) * unitsPerInch;
  const half = scene.board.spanThousandMiles / 2;

  function applyStageView() {
    const w = VIEW_W / stageView.zoom, h = VIEW_H / stageView.zoom;
    svg.setAttribute('viewBox', `${VIEW_W / 2 - w / 2} ${VIEW_H / 2 - h / 2} ${w} ${h}`);
    zoomLabel.textContent = `${Math.round(stageView.zoom * 100)}%`;
  }
  function zoomStage(next) {
    stageView.zoom = clamp(next, ZOOM_MIN, ZOOM_MAX);
    draw();
  }
  const stagePoint = (clientX, clientY) => {
    // v0.201.2: jsdom draws no layout, so it has no screen CTM; a pointer
    // there has no stage point, and a move over it is nothing, not a throw.
    if (typeof svg.getScreenCTM !== 'function' || typeof svg.createSVGPoint !== 'function') return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const point = svg.createSVGPoint();
    point.x = clientX; point.y = clientY;
    return point.matrixTransform(ctm.inverse());
  };
  // Scene inches from a pointer position, through the live viewBox.
  const toScene = (clientX, clientY) => {
    const local = stagePoint(clientX, clientY);
    if (!local) return null;
    return { x: stageView.cx + (local.x - VIEW_W / 2) / unitsPerInch, y: stageView.cy - (local.y - VIEW_H / 2) / unitsPerInch };
  };

  function drawMinimap() {
    minimap.replaceChildren();
    const span = scene.board.spanThousandMiles;
    const perInch = MINIMAP_SIZE / span;
    const mx = (value) => MINIMAP_SIZE / 2 + value * perInch;
    const my = (value) => MINIMAP_SIZE / 2 - value * perInch;
    minimap.append(node('rect', { x: 0, y: 0, width: MINIMAP_SIZE, height: MINIMAP_SIZE, fill: 'var(--paper)', stroke: 'currentColor', 'stroke-opacity': 0.4 }));
    for (const body of bodies) {
      const radius = body.kind === 'world' ? body.template.radius : body.kind === 'asteroid-field' ? body.radius : 0;
      minimap.append(node('circle', {
        cx: mx(bodyAt(body).x), cy: my(bodyAt(body).y), r: Math.max(1.5, radius * perInch),
        fill: 'currentColor', 'fill-opacity': body.kind === 'world' ? 0.35 : 0.15,
        stroke: 'currentColor', 'stroke-opacity': 0.4, 'stroke-width': 0.5
      }));
    }
    // Ships are drawn at a fixed size, never to scale: at a 400-inch span a
    // ship is a rounding error, and an invisible dot is no use on an overview.
    for (const token of scene.tokens) {
      minimap.append(node('circle', {
        cx: mx(shipAt(token).x), cy: my(shipAt(token).y), r: 2,
        fill: 'currentColor', 'fill-opacity': token.side === 'party' ? 0.9 : 0.55
      }));
    }
    const viewInches = STAGE_INCHES_ACROSS / stageView.zoom;
    const viewHeight = viewInches * (VIEW_H / VIEW_W);
    minimap.append(node('rect', {
      x: mx(stageView.cx - viewInches / 2), y: my(stageView.cy + viewHeight / 2),
      width: Math.max(2, viewInches * perInch), height: Math.max(2, viewHeight * perInch),
      fill: 'none', stroke: 'currentColor', 'stroke-width': 1
    }));
    minimap.append(node('title', {}, `Whole board: ${span}" a side. Click to move the view.`));
  }
  const recentreFromMinimap = (event) => {
    const rect = minimap.getBoundingClientRect();
    if (!rect.width) return;
    const span = scene.board.spanThousandMiles;
    stageView.cx = clamp(((event.clientX - rect.left) / rect.width - 0.5) * span, -half, half);
    stageView.cy = clamp((0.5 - (event.clientY - rect.top) / rect.height) * span, -half, half);
    draw();
  };
  minimap.style.cursor = 'crosshair';
  minimap.addEventListener('pointerdown', (event) => { event.preventDefault(); recentreFromMinimap(event); });

  function draw() {
    applyStageView();
    svg.replaceChildren();
    // v0.175.0: z converts screen pixels to user units, so it carries the
    // SVG's CSS scale as well as the zoom (see svgPixelScale).
    const z = stageView.zoom * svgPixelScale(svg, VIEW_W, VIEW_H);
    // The span, where it falls. Off the view when zoomed in, which is correct:
    // the minimap is what shows the whole plane.
    svg.append(node('rect', {
      x: x(-half), y: y(half), width: half * 2 * unitsPerInch, height: half * 2 * unitsPerInch,
      fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.2,
      'stroke-width': 1 / z, 'stroke-dasharray': `${2 / z} ${4 / z}`
    }));

    for (const body of bodies) {
      const centre = bodyAt(body);
      if (body.kind === 'world') {
        for (const band of [...(body.template.bands ?? [])].sort((a, b) => b.outerRadius - a.outerRadius)) {
          svg.append(node('circle', {
            cx: x(centre.x), cy: y(centre.y), r: band.outerRadius * unitsPerInch,
            fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.35,
            'stroke-width': 1 / z, 'stroke-dasharray': `${3 / z} ${5 / z}`
          }));
        }
        svg.append(node('circle', {
          cx: x(centre.x), cy: y(centre.y), r: body.template.radius * unitsPerInch,
          fill: 'currentColor', 'fill-opacity': 0.18, stroke: 'currentColor',
          'stroke-opacity': 0.5, 'stroke-width': 1 / z
        }));
      } else if (body.kind === 'asteroid-field') {
        svg.append(node('circle', {
          cx: x(centre.x), cy: y(centre.y), r: body.radius * unitsPerInch,
          fill: 'currentColor', 'fill-opacity': 0.05, stroke: 'currentColor', 'stroke-opacity': 0.4,
          'stroke-width': 1 / z, 'stroke-dasharray': `${1 / z} ${4 / z}`
        }));
      } else {
        const mark = 6 / z;
        svg.append(node('path', {
          d: `M${x(centre.x)} ${y(centre.y) - mark} L${x(centre.x) + mark} ${y(centre.y)} L${x(centre.x)} ${y(centre.y) + mark} L${x(centre.x) - mark} ${y(centre.y)} Z`,
          fill: 'currentColor', 'fill-opacity': 0.75
        }));
      }
      svg.append(node('text', {
        x: x(centre.x), y: y(centre.y) + 4 / z,
        fill: 'currentColor', 'text-anchor': 'middle', 'font-size': 11 / z
      }, body.kind === 'emplacement' ? `${body.name} (${body.site.toUpperCase()} \u00d7${body.turrets})` : body.name));
      if (moveBody) {
        const reach = body.kind === 'world' ? body.template.radius : body.kind === 'asteroid-field' ? body.radius : 0;
        const grip = node('circle', {
          cx: x(centre.x), cy: y(centre.y), r: Math.max(6 / z, reach * unitsPerInch),
          fill: 'transparent', stroke: 'none'
        });
        grip.classList.add('vector-world-grip');
        grip.style.cursor = 'move';
        grip.append(node('title', {}, `${body.name} \u2014 drag to move, double-click to remove`));
        grip.addEventListener('pointerdown', (event) => { dragPreview = { kind: 'body', id: body.id, point: centre }; startDrag(event, (point) => moveBody(body.id, point)); });
        if (removeBody) grip.addEventListener('dblclick', () => removeBody(body.id));
        svg.append(grip);
      }
    }

    for (const token of scene.tokens) {
      const at = shipAt(token);
      const velocity = vectorOf(token);
      const speed = Math.hypot(velocity.x, velocity.y);
      const head = { x: at.x + velocity.x, y: at.y + velocity.y };
      if (speed > 0) {
        svg.append(node('line', {
          x1: x(at.x), y1: y(at.y), x2: x(head.x), y2: y(head.y),
          stroke: 'currentColor', 'stroke-width': 2 / z
        }));
        const arrow = node('circle', { cx: x(head.x), cy: y(head.y), r: 4 / z, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 / z });
        // v0.171.0: no setVector means a read-only board (the player page), so
        // there is nothing to drag.
        if (setVector) {
          arrow.classList.add('vector-endpoint-handle');
          arrow.style.cursor = 'move';
          arrow.addEventListener('pointerdown', (event) => {
            dragPreview = { kind: 'vector', id: token.id, point: head };
            startDrag(event, (point) => setVector(token.id, { x: point.x - at.x, y: point.y - at.y }));
          });
        }
        svg.append(arrow);
      }
      const dot = node('circle', { cx: x(at.x), cy: y(at.y), r: 5 / z, fill: 'currentColor' });
      dot.classList.add('vector-ship-token');
      if (moveShip) {
        dot.style.cursor = 'move';
        dot.addEventListener('pointerdown', (event) => {
          // v0.170.0: the right button opens the token menu, not a pan.
          if (event.button === 2 && tokenMenu) { event.stopPropagation(); return; }
          dragPreview = { kind: 'ship', id: token.id, point: at }; startDrag(event, (point) => moveShip(token.id, point));
        });
      }
      svg.append(dot);
      const label = node('text', {
        x: x(at.x) + 10 / z, y: y(at.y) - 9 / z,
        fill: 'currentColor', 'font-size': 11 / z
      }, `${token.label || token.actorId}${speed ? ` \u00b7 ${speed.toFixed(1)}"` : ' \u00b7 STATIONARY'}`);
      // v0.170.0: a double-click on the name took the ship off the board, which
      // nobody could discover and anybody could do by accident. REMOVE is on the
      // token's menu now, with its side, vector, name and data card.
      if (tokenMenu) {
        for (const target of [dot, label]) {
          target.addEventListener('contextmenu', (event) => { event.preventDefault(); event.stopPropagation(); tokenMenu(event, token); });
        }
        label.addEventListener('pointerdown', (event) => { if (event.button === 2) event.stopPropagation(); });
        label.style.cursor = 'context-menu';
        dot.append(node('title', {}, `${token.label || token.actorId}: drag to move, right-click for side, vector, name, data card and remove`));
      }
      svg.append(label);
    }

    // The scale, stated: what an inch is on this board at this zoom.
    const shown = STAGE_INCHES_ACROSS / z;
    status.textContent = `${scene.tokens.length} STAGED \u00b7 VIEW ${shown.toFixed(0)}" OF ${scene.board.spanThousandMiles}" \u00b7 1" = 1,000 MILES`;
    drawMinimap();
  }

  // v0.164.1: a drag PREVIEWS locally and commits once, on release.
  //
  // Writing on every pointermove called back into the app, which re-renders,
  // which replaces this whole panel — so the SVG the drag was captured on was
  // destroyed after the first move and the pointer listeners went with it.
  // Nothing could be dragged more than an imperceptible distance. The same trap
  // the fight plot's endpoint drag avoids by capturing on the SVG; here the SVG
  // itself goes, so the write has to wait for the end of the gesture.
  function startDrag(event, commit) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    try { svg.setPointerCapture(event.pointerId); } catch { /* jsdom */ }
    let last = null;
    const move = (moveEvent) => {
      const point = toScene(moveEvent.clientX, moveEvent.clientY);
      if (!point) return;
      last = point;
      dragPreview = { ...dragPreview, point };
      draw();
    };
    const end = (endEvent) => {
      svg.removeEventListener('pointermove', move);
      svg.removeEventListener('pointerup', end);
      svg.removeEventListener('pointercancel', end);
      try { svg.releasePointerCapture(endEvent.pointerId); } catch { /* already released */ }
      dragPreview = null;
      if (last) commit(last);
      else draw();
    };
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
  }

  // Panning moves the centre in inches, so it works the same at every zoom.
  let panFrom = null;
  svg.addEventListener('contextmenu', (event) => event.preventDefault());
  svg.addEventListener('pointerdown', (event) => {
    if (event.button !== 1 && event.button !== 2) return;
    panFrom = toScene(event.clientX, event.clientY);
    try { svg.setPointerCapture(event.pointerId); } catch { /* jsdom */ }
    event.preventDefault();
  });
  svg.addEventListener('pointermove', (event) => {
    if (!panFrom) return;
    const to = toScene(event.clientX, event.clientY);
    if (!to) return;
    stageView.cx = clamp(stageView.cx - (to.x - panFrom.x), -half, half);
    stageView.cy = clamp(stageView.cy - (to.y - panFrom.y), -half, half);
    draw();
  });
  const endPan = (event) => {
    if (!panFrom) return;
    panFrom = null;
    try { svg.releasePointerCapture(event.pointerId); } catch { /* already released */ }
  };
  svg.addEventListener('pointerup', endPan);
  svg.addEventListener('pointercancel', endPan);
  svg.addEventListener('wheel', (event) => {
    event.preventDefault();
    zoomStage(stageView.zoom * (event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP));
  }, { passive: false });

  draw();
}
