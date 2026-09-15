import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importShipDocument,createShipCombatEncounter,createSequenceDice,createPlanet} from '../vendor/classic-traveller-rules/index.js';
import {enableVectorMovement,commitShipVector} from '../vendor/classic-traveller-rules/src/starships/vector-movement.js';
import {renderShipVectorMap} from '../client/ship-vector-map.js';
let JSDOM;try{({JSDOM}=await import('jsdom'));}catch{}
test('vector controls preview a maneuver and disable repeated commits', {skip: !JSDOM},()=>{
 const dom=new JSDOM('<main></main>');globalThis.document=dom.window.document;globalThis.Option=dom.window.Option;
 const ship=importShipDocument(JSON.parse(readFileSync(new URL('../examples/Hawkeye.ship.json',import.meta.url))));
 let e=enableVectorMovement(createShipCombatEncounter({id:'ui',participants:['intruder','native'].map(side=>({shipId:side,side,name:side,ship,carriedPrograms:['maneuver'],loadedPrograms:['maneuver']}))}),{intruder:{position:{x:-20,y:0},velocity:{x:2,y:0}},native:{position:{x:20,y:0},velocity:{x:-2,y:0}}});
 const stage=document.querySelector('main');const draw=()=>renderShipVectorMap(stage,e,{commit:(id,a)=>{e=commitShipVector(e,id,a,createSequenceDice([6,6]));draw();}});draw();
 const input=stage.querySelector('input');input.value='1';input.dispatchEvent(new dom.window.Event('input'));
 assert.match(stage.textContent,/Endpoint -16.00/);
 stage.querySelector('#vector-commit').click();assert.equal(e.spatial.ships.intruder.position.x,-16);assert.equal(stage.querySelector('#vector-commit').disabled,true);
 renderShipVectorMap(stage,null,{commit(){}});assert.equal(stage.children.length,0);
 dom.window.close();delete globalThis.document;delete globalThis.Option;
});

test('the world and its quarter-G bands are drawn, and clear space is not', { skip: !JSDOM }, () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  const ship = importShipDocument(JSON.parse(readFileSync(new URL('../examples/Hawkeye.ship.json', import.meta.url))));
  const participants = ['intruder', 'native'].map((side) => ({
    shipId: side, side, name: side, ship, carriedPrograms: ['maneuver'], loadedPrograms: ['maneuver']
  }));
  const states = {
    intruder: { position: { x: 6, y: 0 }, velocity: { x: 0, y: -1 } },
    native: { position: { x: -30, y: 5 }, velocity: { x: 0, y: 0 } }
  };

  // Book 3's size digit is the diameter in thousands of miles, so a size-8
  // world is an 8-unit disc — and Book 2 p.27 puts its bands at 8.00, 5.66 and
  // 4.62.
  const world = createPlanet({ name: 'San Telmo', diameter: 8 });
  const withWorld = enableVectorMovement(
    createShipCombatEncounter({ id: 'grav', participants }), states, { planet: world, atmosphere: 6 }
  );
  const stage = document.querySelector('main');
  renderShipVectorMap(stage, withWorld, { commit() {}, setup() {} });
  let svg = stage.querySelector('svg');
  const labels = [...svg.querySelectorAll('text')].map((node) => node.textContent);
  assert.deepEqual(labels.slice(0, 4), ['0.25 G', '0.5 G', '0.75 G', 'San Telmo']);
  // Three bands, the surface, two ships, the preview endpoint, v0.154.0's
  // reachable envelope, and v0.155.0's invisible hover target over the whole
  // template (the rings are fill:none, so only their stroke is hoverable).
  assert.equal(svg.querySelectorAll('circle').length, 9);
  // Book 2 p.29 samples the band at the course midpoint, so the status says
  // which band applies and how hard it pulls.
  assert.match(stage.querySelector('#vector-status').textContent, /gravity 0\.25 G band, 0\.50 toward the world/);
  assert.match(stage.querySelector('p').textContent, /quarter-G bands/);

  // With no world placed nothing is drawn and the note says so, rather than
  // implying gravity is being applied.
  const clear = enableVectorMovement(createShipCombatEncounter({ id: 'clear', participants }), {
    intruder: { position: { x: 0, y: 0 }, velocity: { x: 2, y: 0 } },
    native: { position: { x: 40, y: 0 }, velocity: { x: 0, y: 0 } }
  });
  const second = document.createElement('div');
  document.body.append(second);
  renderShipVectorMap(second, clear, { commit() {}, setup() {} });
  svg = second.querySelector('svg');
  assert.equal(svg.querySelectorAll('circle').length, 4);
  assert.match(second.querySelector('p').textContent, /No world is placed/);
});

// v0.151.0: the plot's own camera. The subsector map's [ − ] [ + ] [ FIT ]
// drive setSubsectorZoom and live inside #subsector-section, which is hidden
// while the plot is on the stage, so the plot had no zoom at all.
test('the plot zooms and pans on its own viewBox, leaving plotted coordinates alone', { skip: !JSDOM }, () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  const ship = importShipDocument(JSON.parse(readFileSync(new URL('../examples/Hawkeye.ship.json', import.meta.url))));
  const participants = ['intruder', 'native'].map((side) => ({
    shipId: side, side, name: side, ship, carriedPrograms: ['maneuver'], loadedPrograms: ['maneuver']
  }));
  const encounter = enableVectorMovement(createShipCombatEncounter({ id: 'camera', participants }), {
    intruder: { position: { x: -20, y: 0 }, velocity: { x: 2, y: 0 } },
    native: { position: { x: 20, y: 0 }, velocity: { x: -2, y: 0 } }
  });
  const stage = document.querySelector('main');
  const draw = () => renderShipVectorMap(stage, encounter, { commit() {}, setup() {} });
  draw();
  const svg = () => stage.querySelector('svg');
  const box = () => svg().getAttribute('viewBox');
  const control = (text) => [...stage.querySelectorAll('button')].find((node) => node.textContent === text);
  const label = () => stage.querySelector('.map-zoom-label').textContent;

  assert.equal(box(), '0 0 800 430');
  assert.equal(label(), '100%');

  control('[ + ]').click();
  assert.equal(label(), '125%');
  assert.equal(box(), '80 43 640 344');

  control('[ \u2212 ]').click();
  assert.equal(box(), '0 0 800 430');

  // Clamped at both ends, so neither control can lose the plot.
  for (let i = 0; i < 20; i += 1) control('[ + ]').click();
  assert.equal(label(), '800%');
  for (let i = 0; i < 20; i += 1) control('[ \u2212 ]').click();
  assert.equal(label(), '50%');

  control('[ FIT ]').click();
  assert.equal(box(), '0 0 800 430');

  // The camera survives a re-render — every phase advance redraws the panel,
  // and a zoom that reset itself each turn would be worse than none.
  control('[ + ]').click();
  draw();
  assert.equal(box(), '80 43 640 344');
  assert.equal(label(), '125%');

  // Zoom is a viewBox over the same 800x430 fit, so the drawn geometry is
  // identical at every magnification: click-to-plot reads through
  // getScreenCTM() and needs no scaling of its own.
  const zoomed = [...svg().querySelectorAll('circle')].map((node) => node.getAttribute('cx'));
  control('[ FIT ]').click();
  assert.deepEqual([...svg().querySelectorAll('circle')].map((node) => node.getAttribute('cx')), zoomed);

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Option;
});

// v0.153.0: the plot auto-fits, so the scale changes between turns and nothing
// on a blank field is dimensioned. A world's disc calibrates everything at
// 1" = 1,000 miles; clear space has no reference object at all.
test('the plot states its scale and draws Book 2 p.30 range thresholds in view', { skip: !JSDOM }, () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  const ship = importShipDocument(JSON.parse(readFileSync(new URL('../examples/Hawkeye.ship.json', import.meta.url))));
  const participants = ['intruder', 'native'].map((side) => ({
    shipId: side, side, name: side, ship, carriedPrograms: ['maneuver'], loadedPrograms: ['maneuver']
  }));
  const stage = document.querySelector('main');
  const texts = () => [...stage.querySelectorAll('svg text')].map((node) => node.textContent);

  // Close fight: the scale bar states a small interval and the 150" threshold
  // is several screens away, so it is not drawn.
  const close = enableVectorMovement(createShipCombatEncounter({ id: 'close', participants }), {
    intruder: { position: { x: -10, y: 0 }, velocity: { x: 1, y: 0 } },
    native: { position: { x: 10, y: 0 }, velocity: { x: 0, y: 0 } }
  });
  renderShipVectorMap(stage, close, { commit() {}, setup() {} });
  const scaleLabel = texts().find((text) => /MILES$/.test(text));
  assert.match(scaleLabel, /^(1|2|5|10|20)" \u00b7 [\d,]+ MILES$/);
  assert.equal(texts().some((text) => /DM -2/.test(text)), false);

  // Spread far enough apart and the thresholds come into view with their DMs,
  // which is the whole of what range does in Book 2 — -2 past 150", -5 past
  // 300", nothing in between.
  const far = enableVectorMovement(createShipCombatEncounter({ id: 'far', participants }), {
    intruder: { position: { x: -400, y: 0 }, velocity: { x: 1, y: 0 } },
    native: { position: { x: 400, y: 0 }, velocity: { x: 0, y: 0 } }
  });
  const second = document.createElement('div');
  document.body.append(second);
  renderShipVectorMap(second, far, { commit() {}, setup() {} });
  const farTexts = [...second.querySelectorAll('svg text')].map((node) => node.textContent);
  assert.ok(farTexts.includes('150" \u00b7 DM -2'), 'the -2 threshold is drawn');
  assert.ok(farTexts.includes('300" \u00b7 DM -5'), 'the -5 threshold is drawn');
  // Velocity is stated in Book 2 p.25's own notation rather than left to the eye.
  assert.match(second.querySelector('#vector-status').textContent, /VEL 1\.0" @ 000\u00b0/);

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Option;
});

// v0.154.0: Book 2 p.26 adds thrust to the vector a ship already has, so the
// reachable set is a circle around the COASTING endpoint, not around the ship.
test('the reachable envelope follows the coasting endpoint, and clamps to the drive', { skip: !JSDOM }, () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  const ship = importShipDocument(JSON.parse(readFileSync(new URL('../examples/Hawkeye.ship.json', import.meta.url))));
  const participants = ['intruder', 'native'].map((side) => ({
    shipId: side, side, name: side, ship, carriedPrograms: ['maneuver'], loadedPrograms: ['maneuver']
  }));
  const stage = document.querySelector('main');

  // Stationary: the envelope is centred on the ship itself, because velocity
  // carries it nowhere. A Type S is 2G, so 4 inches of thrust in any direction.
  const still = enableVectorMovement(createShipCombatEncounter({ id: 'still', participants }), {
    intruder: { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
    native: { position: { x: 30, y: 0 }, velocity: { x: 0, y: 0 } }
  });
  renderShipVectorMap(stage, still, { commit() {}, setup() {} });
  assert.match(stage.querySelector('#vector-status').textContent, /VEL 0" \(STATIONARY\)/);

  // Moving: the same 4 inches, but now reachable only around a point 20 inches
  // downrange. The ship cannot stop and cannot turn back.
  const fast = enableVectorMovement(createShipCombatEncounter({ id: 'fast', participants }), {
    intruder: { position: { x: 0, y: 0 }, velocity: { x: 20, y: 0 } },
    native: { position: { x: 200, y: 0 }, velocity: { x: 0, y: 0 } }
  });
  const second = document.createElement('div');
  document.body.append(second);
  renderShipVectorMap(second, fast, { commit() {}, setup() {} });
  assert.match(second.querySelector('#vector-status').textContent, /VEL 20\.0" @ 000\u00b0/);

  // Rules enforcement is offered and says which way it is set, since an
  // unclamped drag is a referee's choice rather than Book 2's.
  const toggle = [...second.querySelectorAll('button')].find((node) => /RULES:/.test(node.textContent));
  assert.equal(toggle.textContent, '[ RULES: ON ]');
  toggle.click();
  assert.equal([...second.querySelectorAll('button')].find((node) => /RULES:/.test(node.textContent)).textContent, '[ RULES: OFF ]');
  toggle.click();

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Option;
});

// v0.155.0: Book 2 p.27 — the template "should be marked with its values for
// R, G, M, D, and K, as well as the planet's name, and any other interesting
// data". Written from the page rather than from what the engine happens to hold.
test('the planet card states p.27 template values and whether p.35 braking applies', { skip: !JSDOM }, () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  const ship = importShipDocument(JSON.parse(readFileSync(new URL('../examples/Hawkeye.ship.json', import.meta.url))));
  const participants = ['intruder', 'native'].map((side) => ({
    shipId: side, side, name: side, ship, carriedPrograms: ['maneuver'], loadedPrograms: ['maneuver']
  }));
  const states = {
    intruder: { position: { x: 20, y: 0 }, velocity: { x: 0, y: -1 } },
    native: { position: { x: -30, y: 5 }, velocity: { x: 0, y: 0 } }
  };
  const world = createPlanet({ name: 'San Telmo', diameter: 8 });
  const stage = document.querySelector('main');

  // Atmosphere 6 is standard, so p.35 braking is available.
  renderShipVectorMap(stage, enableVectorMovement(
    createShipCombatEncounter({ id: 'card', participants }), states, { planet: world, atmosphere: 6 }
  ), { commit() {}, setup() {} });
  const card = stage.querySelector('.vector-planet-card');
  assert.ok(card.hidden, 'the card is hidden until the template is hovered');
  const text = card.textContent;
  assert.match(text, /SAN TELMO/);
  assert.match(text, /8\.00" \u00b7 8,000 MILES/);
  assert.match(text, /1\.00 G/);
  // p.27: a size-8 Earth-density world has M = 1 and bands at 8.00, 5.66, 4.62.
  assert.match(text, /1\.000 EARTH/);
  assert.match(text, /0\.25 G at 8\.00"/);
  assert.match(text, /0\.75 G at 4\.62"/);
  assert.match(text, /BRAKING/);
  assert.match(text, /YES/);

  // Atmosphere 3 is thin: no braking, and the card says which rule decides.
  const thin = document.createElement('div');
  document.body.append(thin);
  renderShipVectorMap(thin, enableVectorMovement(
    createShipCombatEncounter({ id: 'thin', participants }), states, { planet: world, atmosphere: 3 }
  ), { commit() {}, setup() {} });
  assert.match(thin.querySelector('.vector-planet-card').textContent, /NO \u00b7 needs a standard or dense atmosphere/);

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Option;
});
