import { previewShipVector } from '../vendor/classic-traveller-rules/src/starships/vector-movement.js?v=v0.154.0';
import { LASER_RANGE_DMS } from '../vendor/classic-traveller-rules/index.js?v=v0.154.0';
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
export function renderShipVectorMap(stage, encounter, { commit, setup }) {
  if (!stage) return;
  let panel = stage.querySelector('#ship-vector-workspace');
  if (!encounter || encounter.spatialMode !== 'vector') { panel?.remove(); return; }
  if (!panel) { panel = document.createElement('section'); panel.id = 'ship-vector-workspace'; stage.append(panel); }
  if (encounterId !== encounter.id) { encounterId = encounter.id; selected = encounter.participants[0].id; resetView(); }
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
  const ax = field('Thrust X (G)', '0'), ay = field('Thrust Y (G)', '0');
  const button = document.createElement('button'); button.id = 'vector-commit'; button.textContent = 'COMMIT MANEUVER'; tools.append(button); panel.append(tools);
  const p = encounter.participants.find(p => p.id === selected);
  button.disabled = encounter.outcome !== 'in-progress' || encounter.phaseIndex !== 0 || p.side !== encounter.phasingSide || encounter.spatial.ships[selected].movedTurn === encounter.gameTurn || p.escaped || p.surrendered;
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

    for(const ship of encounter.participants){const s=encounter.spatial.ships[ship.id];
      svg.append(node('line',{x1:x(s.position.x),y1:y(s.position.y),x2:x(s.position.x+s.velocity.x),y2:y(s.position.y+s.velocity.y),stroke:'currentColor','stroke-width':2}));
      const dot=node('circle',{cx:x(s.position.x),cy:y(s.position.y),r:ship.id===selected?5:3.5,fill:'currentColor'}); dot.style.cursor='pointer';dot.addEventListener('click',()=>{selected=ship.id;renderShipVectorMap(stage,encounter,{commit, setup});});svg.append(dot);
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
  ax.oninput=ay.oninput=draw;
  button.onclick=()=>commit(selected,{x:Number(ax.value)*2,y:Number(ay.value)*2});
  // Click an endpoint to plot; do not teleport the ship.
  svg.addEventListener('click',e=>{
    if (suppressNextClick) { suppressNextClick = false; return; }
    if (e.target.tagName === 'circle' || button.disabled || !transform) return;
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
