import { previewShipVector } from '../vendor/classic-traveller-rules/src/starships/vector-movement.js?v=v0.161.0';
import { LASER_RANGE_DMS, atmosphereBrakes, ATMOSPHERIC_BRAKING_BAND } from '../vendor/classic-traveller-rules/index.js?v=v0.161.0';
const NS = 'http://www.w3.org/2000/svg';
const node = (name, attrs = {}, text = '') => { const n = document.createElementNS(NS, name); for (const [k,v] of Object.entries(attrs)) n.setAttribute(k,v); n.textContent = text; return n; };
let selected = null, encounterId = null;
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
export function renderShipVectorMap(stage, encounter, { commit, setup }) {
  if (!stage) return;
  let panel = stage.querySelector('#ship-vector-workspace');
  if (!encounter || encounter.spatialMode !== 'vector') { panel?.remove(); return; }
  if (!panel) { panel = document.createElement('section'); panel.id = 'ship-vector-workspace'; stage.append(panel); }
  if (encounterId !== encounter.id) { encounterId = encounter.id; selected = encounter.participants[0].id; resetView(); pendingThrust = {}; }
  panel.replaceChildren();
  const heading = document.createElement('div'); heading.className = 'vector-controls';
  const title = document.createElement('strong'); title.textContent = `SPACE / TURN ${encounter.gameTurn} / ${encounter.phasingSide.toUpperCase()}`;
  const select = document.createElement('select'); select.setAttribute('aria-label', 'Selected ship');
  encounter.participants.forEach(p => select.add(new Option(p.name, p.id)));
  select.value = selected; select.onchange = () => { selected = select.value; renderShipVectorMap(stage, encounter, { commit, setup }); };
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
  const labelRules = () => { rules.textContent = enforceThrustLimit ? '[ RULES: ON ]' : '[ RULES: OFF ]'; };
  labelRules();
  rules.title = 'Book 2 p.26 caps voluntary thrust at the M-Drive rating, two inches per G, and unused acceleration cannot be saved. With rules on, dragging the endpoint is clamped to that.';
  rules.onclick = () => { enforceThrustLimit = !enforceThrustLimit; renderShipVectorMap(stage, encounter, { commit, setup }); };
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
  if (encounter.gameTurn === 1 && encounter.phaseIndex === 0 && !encounter.log.length && setup) {
    const settings = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'INITIAL POSITION / VELOCITY'; settings.append(summary);
    const values = {};
    for (const name of ['x','y','vx','vy']) {
      const label=document.createElement('label'), input=document.createElement('input');
      input.type='number'; input.step='0.1'; input.value=String(name.length===1?encounter.spatial.ships[selected].position[name]:encounter.spatial.ships[selected].velocity[name[1]]);
      label.textContent=name+' ';label.append(input);settings.append(label);values[name]=input;
    }
    const apply=document.createElement('button');apply.textContent='APPLY INITIAL STATE';
    apply.onclick=()=>{const states=structuredClone(encounter.spatial.ships);states[selected]={position:{x:Number(values.x.value),y:Number(values.y.value)},velocity:{x:Number(values.vx.value),y:Number(values.vy.value)}};setup(states);};
    settings.append(apply);panel.append(settings);
  }
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
    ? 'Coordinates in thousands of miles; turn = 10 minutes. Solid line: velocity. Dashed line: proposed movement. The shaded disc is the world and the rings are its quarter-G bands (Book 2 p.27). The cross marks the course midpoint, which is where gravity is sampled (p.29). Vector ordnance is not available.'
    : 'Clear space: coordinates in thousands of miles; turn = 10 minutes. Solid line: velocity. Dashed line: proposed movement. ADVANCE coasts ships not yet committed. No world is placed, so no gravity applies. Vector ordnance is not available.') + CAMERA_NOTE;
  panel.append(note);
  let transform, dragBasis = null, suppressNextClick = false;
  function draw() {
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
          fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.35, 'stroke-dasharray': '3 5'
        }));
        // v0.148.0: every label sat at the top of its ring, so three bands
        // 8.0, 5.7 and 4.6 apart printed almost on top of one another and the
        // innermost landed on the planet's edge. Spread them around the circle
        // instead, one band per bearing, so each label sits on open arc.
        const bearing = (bandIndex / Math.max(1, planet.bands.length)) * Math.PI * 2 + Math.PI / 4;
        svg.append(node('text', {
          x: x(planet.center.x + Math.cos(bearing) * band.outerRadius),
          y: y(planet.center.y + Math.sin(bearing) * band.outerRadius) + 4,
          fill: 'currentColor', 'fill-opacity': 0.6, 'text-anchor': 'middle', 'font-size': '10'
        }, `${band.g} G`));
      }
      svg.append(node('circle', {
        cx: x(planet.center.x), cy: y(planet.center.y), r: planet.radius * scale,
        fill: 'currentColor', 'fill-opacity': 0.18, stroke: 'currentColor', 'stroke-opacity': 0.5
      }));
      svg.append(node('text', {
        x: x(planet.center.x), y: y(planet.center.y) + 4,
        fill: 'currentColor', 'text-anchor': 'middle', 'font-size': '11'
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
          'stroke-dasharray': `${2 / view.zoom} ${6 / view.zoom}`, 'stroke-width': 1 / view.zoom
        }));
        svg.append(node('text', {
          x: x(selectedShip.position.x), y: y(selectedShip.position.y) - r - 3 / view.zoom,
          fill: 'currentColor', 'fill-opacity': 0.5, 'text-anchor': 'middle',
          'font-size': 9 / view.zoom
        }, `${band.overInches}" \u00b7 DM ${band.dm}`));
      }
    }

    // A stated scale, because the fit changes between turns. With a world on
    // the plot its disc already calibrates everything (1" = 1,000 miles, so a
    // size-8 world is 8" across); in clear space there is no reference object
    // at all and this is the only distance cue.
    const halfWidth = VIEW_W / view.zoom / 2, halfHeight = VIEW_H / view.zoom / 2;
    const targetUnits = 140 / view.zoom;
    const NICE = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    const inches = NICE.filter((step) => step * scale <= targetUnits).pop() ?? NICE[0];
    const barLength = inches * scale;
    const barX = view.cx - halfWidth + 12 / view.zoom;
    const barY = view.cy + halfHeight - 14 / view.zoom;
    const tick = 4 / view.zoom;
    svg.append(node('path', {
      d: `M${barX} ${barY - tick} L${barX} ${barY} L${barX + barLength} ${barY} L${barX + barLength} ${barY - tick}`,
      fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.55, 'stroke-width': 1 / view.zoom
    }));
    svg.append(node('text', {
      x: barX, y: barY - tick - 3 / view.zoom,
      fill: 'currentColor', 'fill-opacity': 0.6, 'font-size': 9 / view.zoom
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
          'stroke-width': 1 / view.zoom
        }));
        svg.append(node('circle', {
          cx: x(move.from.x), cy: y(move.from.y), r: 1.5 / view.zoom,
          fill: 'currentColor', 'fill-opacity': 0.3
        }));
      }
    }
    for(const ship of encounter.participants){const s=encounter.spatial.ships[ship.id];
      svg.append(node('line',{x1:x(s.position.x),y1:y(s.position.y),x2:x(s.position.x+s.velocity.x),y2:y(s.position.y+s.velocity.y),stroke:'currentColor','stroke-width':2}));
      // Heading, not facing. Book 2 gives ships no orientation and no firing
      // arcs — p.22 asks only that a miniature be marked with a point for its
      // true location. What an arrow can honestly show is the direction of
      // travel, so a stationary ship stays a dot: p.25 says that with a vector
      // of 0 "the direction becomes irrelevant".
      const speed = Math.hypot(s.velocity.x, s.velocity.y);
      const size = (ship.id === selected ? 7 : 5) / view.zoom;
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
      token.style.cursor='pointer';token.addEventListener('click',()=>{selected=ship.id;renderShipVectorMap(stage,encounter,{commit, setup});});svg.append(token);
      // v0.148.0: no font-size, so the names rendered at the document default
      // and were larger than the world they orbit.
      svg.append(node('text', {
        x: x(s.position.x) + 10, y: y(s.position.y) - 9,
        fill: 'currentColor', 'font-size': '11',
        'font-weight': ship.id === selected ? '700' : '400'
      }, ship.name));
    }
    // The reachable envelope: the ruler and protractor, drawn. Only while the
    // ship may actually move, so it does not imply a choice that is not there.
    if (envelope && envelope.radiusInches > 0 && !button.disabled) {
      svg.append(node('circle', {
        cx: x(envelope.centre.x), cy: y(envelope.centre.y), r: envelope.radiusInches * scale,
        fill: 'currentColor', 'fill-opacity': 0.05, stroke: 'currentColor',
        'stroke-opacity': 0.3, 'stroke-width': 1 / view.zoom
      }));
    }
    if(preview){const s=encounter.spatial.ships[selected];svg.append(node('line',{x1:x(s.position.x),y1:y(s.position.y),x2:x(preview.endpoint.x),y2:y(preview.endpoint.y),stroke:'currentColor','stroke-dasharray':'6 4','stroke-width':2}));
      const handle=node('circle',{cx:x(preview.endpoint.x),cy:y(preview.endpoint.y),r:5,fill:'none',stroke:'currentColor','stroke-width':2});
      handle.classList.add('vector-endpoint-handle');
      if(!button.disabled){handle.style.cursor='move';handle.addEventListener('pointerdown',startEndpointDrag);}
      svg.append(handle);
      // Book 2 p.29 reads the band at the midpoint of the course vector, before
      // thrust. Drawing it stops the band a ship is "in" looking arbitrary.
      if (planet) {
        const midpoint = { x: s.position.x + s.velocity.x / 2, y: s.position.y + s.velocity.y / 2 };
        const mx = x(midpoint.x), my = y(midpoint.y);
        svg.append(node('line', { x1: mx - 4, y1: my, x2: mx + 4, y2: my, stroke: 'currentColor', 'stroke-opacity': 0.7 }));
        svg.append(node('line', { x1: mx, y1: my - 4, x2: mx, y2: my + 4, stroke: 'currentColor', 'stroke-opacity': 0.7 }));
        if (preview.bandG && preview.gravity) {
          svg.append(node('line', {
            x1: mx, y1: my,
            x2: x(midpoint.x + preview.gravity.x), y2: y(midpoint.y + preview.gravity.y),
            stroke: 'currentColor', 'stroke-width': 3, 'stroke-opacity': 0.8
          }));
        }
      }
    }
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
// v0.161.0: the same plane, before there is a fight on it.
//
// A vector scene is a board in its own right (v0.158.0), so it has to be
// lookable-at without an encounter — which is what closing a fight and finding
// no way back to the map was really about. This draws the scene's own data: the
// pp.26-27 template, the staged ships, and the vector each arrives with.
//
// Deliberately NOT the fight renderer with a null encounter. There are no
// phases here, no thrust and no commit; a ship is dragged to where it starts
// and its opening vector is dragged from its nose. Sharing one function would
// have meant a phase model that is sometimes absent.
export function renderVectorSceneStage(stage, scene, { moveShip, setVector } = {}) {
  if (!stage) return;
  stage.replaceChildren();
  const panel = document.createElement('section');
  panel.id = 'ship-vector-workspace';
  stage.append(panel);

  const heading = document.createElement('div');
  heading.className = 'vector-controls';
  const title = document.createElement('strong');
  const world = scene.space?.planet?.name;
  title.textContent = `${scene.identity.name.toUpperCase()} \u00b7 ${world ? world.toUpperCase() : 'CLEAR SPACE'} \u00b7 STAGING`;
  heading.append(title);
  panel.append(heading);

  const svg = node('svg', {
    role: 'img', 'aria-label': `${scene.identity.name} staging board`,
    viewBox: `0 0 ${VIEW_W} ${VIEW_H}`, preserveAspectRatio: 'xMidYMid meet'
  });
  svg.classList.add('ship-vector-svg');
  panel.append(svg);

  const status = document.createElement('div');
  status.id = 'vector-stage-status';
  status.className = 'vector-controls';
  status.setAttribute('aria-live', 'polite');
  panel.append(status);

  const note = document.createElement('p');
  note.textContent = scene.tokens.length
    ? 'Drag a ship to move it; drag its vector arrowhead to set the course it arrives on. Coordinates in thousands of miles (Book 2 p.22).'
    : 'No ships staged. Nothing is placed on this board yet.';
  panel.append(note);

  const planet = scene.space?.planet ?? null;
  // Fit the span, the template and every staged ship with its vector.
  const points = [{ x: -scene.board.spanThousandMiles / 2, y: -scene.board.spanThousandMiles / 2 },
    { x: scene.board.spanThousandMiles / 2, y: scene.board.spanThousandMiles / 2 }];
  const MARGIN = 28;
  const minX = Math.min(...points.map((p) => p.x)), maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y)), maxY = Math.max(...points.map((p) => p.y));
  const scale = Math.min((VIEW_W - MARGIN * 2) / (maxX - minX), (VIEW_H - MARGIN * 2) / (maxY - minY));
  const x = (v) => VIEW_W / 2 + (v - (minX + maxX) / 2) * scale;
  const y = (v) => VIEW_H / 2 - (v - (minY + maxY) / 2) * scale;

  function draw() {
    svg.replaceChildren();
    if (planet) {
      for (const band of [...(planet.bands ?? [])].sort((a, b) => b.outerRadius - a.outerRadius)) {
        svg.append(node('circle', {
          cx: x(planet.center?.x ?? 0), cy: y(planet.center?.y ?? 0), r: band.outerRadius * scale,
          fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.35, 'stroke-dasharray': '3 5'
        }));
      }
      svg.append(node('circle', {
        cx: x(planet.center?.x ?? 0), cy: y(planet.center?.y ?? 0), r: planet.radius * scale,
        fill: 'currentColor', 'fill-opacity': 0.18, stroke: 'currentColor', 'stroke-opacity': 0.5
      }));
      svg.append(node('text', {
        x: x(planet.center?.x ?? 0), y: y(planet.center?.y ?? 0) + 4,
        fill: 'currentColor', 'text-anchor': 'middle', 'font-size': '11'
      }, planet.name));
    }
    // The span, so an empty plane still reads as measured.
    svg.append(node('rect', {
      x: x(-scene.board.spanThousandMiles / 2), y: y(scene.board.spanThousandMiles / 2),
      width: scene.board.spanThousandMiles * scale, height: scene.board.spanThousandMiles * scale,
      fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.2, 'stroke-dasharray': '2 4'
    }));

    for (const token of scene.tokens) {
      const velocity = token.velocity ?? { x: 0, y: 0 };
      const speed = Math.hypot(velocity.x, velocity.y);
      const head = { x: token.position.x + velocity.x, y: token.position.y + velocity.y };
      if (speed > 0) {
        svg.append(node('line', {
          x1: x(token.position.x), y1: y(token.position.y), x2: x(head.x), y2: y(head.y),
          stroke: 'currentColor', 'stroke-width': 2
        }));
        const arrow = node('circle', { cx: x(head.x), cy: y(head.y), r: 4, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 });
        arrow.classList.add('vector-endpoint-handle');
        arrow.style.cursor = 'move';
        arrow.addEventListener('pointerdown', (event) => startDrag(event, (point) => {
          setVector?.(token.id, { x: point.x - token.position.x, y: point.y - token.position.y });
        }));
        svg.append(arrow);
      }
      const dot = node('circle', { cx: x(token.position.x), cy: y(token.position.y), r: 5, fill: 'currentColor' });
      dot.classList.add('vector-ship-token');
      dot.style.cursor = 'move';
      dot.addEventListener('pointerdown', (event) => startDrag(event, (point) => moveShip?.(token.id, point)));
      svg.append(dot);
      svg.append(node('text', {
        x: x(token.position.x) + 10, y: y(token.position.y) - 9,
        fill: 'currentColor', 'font-size': '11'
      }, `${token.label || token.actorId}${speed ? ` \u00b7 ${speed.toFixed(1)}"` : ' \u00b7 STATIONARY'}`));
    }
    status.textContent = scene.tokens.length
      ? `${scene.tokens.length} STAGED \u00b7 SPAN ${scene.board.spanThousandMiles}" \u00b7 1" = 1,000 MILES`
      : `EMPTY \u00b7 SPAN ${scene.board.spanThousandMiles}" \u00b7 1" = 1,000 MILES`;
  }

  // One drag implementation for both handles: solve the drop back into scene
  // coordinates and hand it to the caller, which owns the document.
  function startDrag(event, apply) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const toScene = (clientX, clientY) => {
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const point = svg.createSVGPoint();
      point.x = clientX; point.y = clientY;
      const local = point.matrixTransform(ctm.inverse());
      return { x: (local.x - x(0)) / scale, y: (y(0) - local.y) / scale };
    };
    try { svg.setPointerCapture(event.pointerId); } catch { /* jsdom */ }
    const move = (moveEvent) => {
      const point = toScene(moveEvent.clientX, moveEvent.clientY);
      if (point) apply(point);
    };
    const end = (endEvent) => {
      svg.removeEventListener('pointermove', move);
      svg.removeEventListener('pointerup', end);
      svg.removeEventListener('pointercancel', end);
      try { svg.releasePointerCapture(endEvent.pointerId); } catch { /* already released */ }
    };
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
  }

  draw();
}
