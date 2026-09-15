import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importShipDocument,createShipCombatEncounter,createSequenceDice,createPlanet,advanceShipCombatPhase} from '../vendor/classic-traveller-rules/index.js';
import {enableVectorMovement,commitShipVector} from '../vendor/classic-traveller-rules/src/starships/vector-movement.js';
import {renderShipVectorMap, renderVectorSceneStage} from '../client/ship-vector-map.js';
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
  // Three bands, the surface, the stationary ship's dot, the preview endpoint,
  // v0.154.0's reachable envelope and v0.155.1's hover target on the disc. The
  // moving ship is an arrow from v0.156.0, so it is a polygon rather than a
  // circle.
  assert.equal(svg.querySelectorAll('circle').length, 8);
  assert.equal(svg.querySelectorAll('polygon').length, 1);
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
  assert.equal(svg.querySelectorAll('circle').length, 3);
  assert.equal(svg.querySelectorAll('polygon').length, 1);
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

// v0.155.1: the card's hover target covered the template out to the weakest
// gravity band, which is open space ships fly through — it sat over the
// endpoint handle and made a ship inside the bands undraggable.
test('the planet card is hovered on the disc only, and typed thrust is capped', { skip: !JSDOM }, () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  const ship = importShipDocument(JSON.parse(readFileSync(new URL('../examples/Hawkeye.ship.json', import.meta.url))));
  const participants = ['intruder', 'native'].map((side) => ({
    shipId: side, side, name: side, ship, carriedPrograms: ['maneuver'], loadedPrograms: ['maneuver']
  }));
  const world = createPlanet({ name: 'San Telmo', diameter: 8 });
  const stage = document.querySelector('main');
  let encounter = enableVectorMovement(createShipCombatEncounter({ id: 'hover', participants }), {
    intruder: { position: { x: 6, y: 0 }, velocity: { x: 0, y: -1 } },
    native: { position: { x: -30, y: 5 }, velocity: { x: 0, y: 0 } }
  }, { planet: world, atmosphere: 6 });
  renderShipVectorMap(stage, encounter, { commit() {}, setup() {} });

  const circles = [...stage.querySelectorAll('svg circle')];
  const target = circles.find((node) => node.getAttribute('fill') === 'transparent');
  const surface = circles.find((node) => node.getAttribute('fill') === 'currentColor' && node.getAttribute('fill-opacity') === '0.18');
  assert.ok(target && surface, 'both the hover target and the surface disc are drawn');
  // The target is the disc, not the template: a size-8 world's outer band is
  // 8.00" against a 4.00" radius, so covering the bands would double it.
  assert.equal(Number(target.getAttribute('r')).toFixed(4), Number(surface.getAttribute('r')).toFixed(4));

  // Book 2 p.26: voluntary thrust may not exceed the M-Drive rating. A Type S
  // is 2G, so 5G typed into the field is brought back to 2.
  const thrustX = stage.querySelector('input');
  thrustX.value = '5';
  thrustX.dispatchEvent(new dom.window.Event('input'));
  assert.equal(thrustX.value, '2.00');
  assert.match(stage.querySelector('#vector-status').textContent, /2\.00 G \/ max 2 G/);

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Option;
});

// v0.156.0: Book 2 p.26 — "The vector then remains on the playing surface for
// reference during the next applicable movement phase." Without a grid, the
// course a ship has flown is the only way to read where it came from.
test('committed moves leave a course trail, and a moving ship reads as an arrow', { skip: !JSDOM }, () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  const ship = importShipDocument(JSON.parse(readFileSync(new URL('../examples/Hawkeye.ship.json', import.meta.url))));
  let encounter = enableVectorMovement(createShipCombatEncounter({
    id: 'trail',
    participants: ['intruder', 'native'].map((side) => ({
      shipId: side, side, name: side, ship, carriedPrograms: ['maneuver'], loadedPrograms: ['maneuver']
    }))
  }), {
    intruder: { position: { x: 0, y: 0 }, velocity: { x: 4, y: 0 } },
    native: { position: { x: 60, y: 0 }, velocity: { x: 0, y: 0 } }
  });
  const stage = document.querySelector('main');
  const draw = () => renderShipVectorMap(stage, encounter, { commit() {}, setup() {} });

  // Nothing has been committed, so there is no string on the table yet.
  draw();
  assert.equal(stage.querySelectorAll('svg line').length, 3, 'two velocity lines and the dashed preview');
  // Stationary native is a dot; the intruder is under way, so it is an arrow.
  assert.equal(stage.querySelectorAll('svg polygon').length, 1);

  // Two committed moves leave two segments behind, each from its own start.
  encounter = commitShipVector(encounter, 'intruder', { x: 0, y: 0 }, createSequenceDice([6, 6]));
  encounter = advanceShipCombatPhase(encounter);
  draw();
  const afterOne = stage.querySelectorAll('svg line').length;
  assert.equal(afterOne, 4, 'one trail segment added');
  const moves = encounter.log.filter((entry) => entry.kind === 'vector-move');
  assert.equal(moves.length, 1);
  assert.deepEqual(moves[0].from, { x: 0, y: 0 });
  assert.deepEqual(moves[0].endpoint, { x: 4, y: 0 });

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Option;
});

// v0.156.1: Book 2 p.23 lets a side move all of its ships in its own movement
// phase, so a thrust dialled in for one ship has to survive selecting another.
// The panel is rebuilt on every render, so the fields cannot hold it.
test('thrust entered for one ship survives selecting another, and a commit consumes it', { skip: !JSDOM }, () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  const ship = importShipDocument(JSON.parse(readFileSync(new URL('../examples/Hawkeye.ship.json', import.meta.url))));
  let encounter = enableVectorMovement(createShipCombatEncounter({
    id: 'pending',
    participants: [
      { shipId: 'marisol', side: 'intruder', name: 'Marisol', ship, carriedPrograms: ['maneuver'], loadedPrograms: ['maneuver'] },
      { shipId: 'corsair', side: 'intruder', name: 'Corsair', ship, carriedPrograms: ['maneuver'], loadedPrograms: ['maneuver'] },
      { shipId: 'native', side: 'native', name: 'Native', ship, carriedPrograms: ['maneuver'], loadedPrograms: ['maneuver'] }
    ]
  }), {
    marisol: { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
    corsair: { position: { x: 40, y: 0 }, velocity: { x: 0, y: 0 } },
    native: { position: { x: 80, y: 0 }, velocity: { x: 0, y: 0 } }
  });
  const stage = document.querySelector('main');
  const committed = [];
  const draw = () => renderShipVectorMap(stage, encounter, {
    commit: (id, acceleration) => { committed.push([id, acceleration]); },
    setup: () => {}
  });
  const fields = () => [...stage.querySelectorAll('input')];
  const picker = () => stage.querySelector('select');

  draw();
  assert.equal(picker().value, 'marisol');
  fields()[0].value = '2';
  fields()[0].dispatchEvent(new dom.window.Event('input'));

  // Select the Corsair: its own fields start at zero, not at Marisol's figure.
  picker().value = 'corsair';
  picker().dispatchEvent(new dom.window.Event('change'));
  assert.equal(fields()[0].value, '0');
  fields()[1].value = '1';
  fields()[1].dispatchEvent(new dom.window.Event('input'));

  // Back to Marisol: the 2G is still there.
  picker().value = 'marisol';
  picker().dispatchEvent(new dom.window.Event('change'));
  assert.equal(fields()[0].value, '2');
  assert.equal(fields()[1].value, '0');

  // Committing spends it — p.26: unused acceleration may not be saved, and a
  // spent one certainly does not persist.
  stage.querySelector('#vector-commit').click();
  assert.deepEqual(committed, [['marisol', { x: 4, y: 0 }]]);
  draw();
  assert.equal(fields()[0].value, '0');

  // The Corsair's pending 1G is untouched by Marisol's commit.
  picker().value = 'corsair';
  picker().dispatchEvent(new dom.window.Event('change'));
  assert.equal(fields()[1].value, '1');

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Option;
});

// v0.156.2: a greyed COMMIT MANEUVER named none of its six causes, so a ship
// that was merely on the non-phasing side looked broken.
test('an unavailable commit says which rule or state blocks it', { skip: !JSDOM }, () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  const ship = importShipDocument(JSON.parse(readFileSync(new URL('../examples/Hawkeye.ship.json', import.meta.url))));
  let encounter = enableVectorMovement(createShipCombatEncounter({
    id: 'blocked',
    participants: [
      { shipId: 'marisol', side: 'native', name: 'Marisol', ship, carriedPrograms: ['maneuver'], loadedPrograms: ['maneuver'] },
      { shipId: 'corsair', side: 'intruder', name: 'Corsair', ship, carriedPrograms: ['maneuver'], loadedPrograms: ['maneuver'] }
    ]
  }), {
    marisol: { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
    corsair: { position: { x: 40, y: 0 }, velocity: { x: 0, y: 0 } }
  });
  const stage = document.querySelector('main');
  const draw = () => renderShipVectorMap(stage, encounter, { commit() {}, setup() {} });
  const commit = () => stage.querySelector('#vector-commit');
  const blocked = () => stage.querySelector('.vector-commit-blocked');

  // The intruder moves first (p.23), so Marisol the native cannot yet.
  draw();
  const picker = stage.querySelector('select');
  picker.value = 'marisol';
  picker.dispatchEvent(new dom.window.Event('change'));
  assert.equal(commit().disabled, true);
  assert.match(blocked().textContent, /Marisol is native, and it is the intruder player turn/);

  // The Corsair can, and says nothing about being blocked.
  picker.value = 'corsair';
  picker.dispatchEvent(new dom.window.Event('change'));
  assert.equal(commit().disabled, false);
  assert.equal(blocked(), null);

  // Out of the movement phase, nobody may move — and it names the phase.
  encounter = advanceShipCombatPhase(encounter);
  draw();
  assert.equal(commit().disabled, true);
  assert.match(blocked().textContent, /this is LASER FIRE/);

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Option;
});

// v0.164.0: the staging board shows a fixed number of inches at 100% and the
// minimap carries the whole span. Fitting the span made an 8-inch world a speck
// on a 400-inch plane, and type drawn in user units tripled in size at 300%.
test('the staging board holds a fixed scale, with the whole span on a minimap', { skip: !JSDOM }, () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  const scene = {
    documentType: 'graycloak-traveller-scene', schemaVersion: 3,
    identity: { id: 'scene-space', name: 'San Telmo Approach' },
    campaignId: 'sea', folder: 'Space',
    board: { kind: 'vector', spanThousandMiles: 400 },
    space: { bodies: [], gravityBodyId: null, atmosphere: null },
    background: { assetId: null },
    tokens: [{ id: 't1', actorId: 'marisol', side: 'party', label: 'MARISOL', position: { x: 10, y: 0 }, velocity: { x: -6, y: 0 } }],
    notes: '', createdAt: 1
  };
  const bodies = [{
    id: 'b1', kind: 'world', name: 'San Telmo', center: { x: 0, y: 0 },
    template: { name: 'San Telmo', center: { x: 0, y: 0 }, radius: 4, densityEarth: 1, surfaceG: 1, massEarth: 1, bands: [{ g: 0.25, outerRadius: 8 }] }
  }];
  const stage = document.querySelector('main');
  renderVectorSceneStage(stage, scene, { bodies, moveShip() {}, setVector() {} });

  // Two SVGs: the board and the minimap.
  assert.equal(stage.querySelectorAll('svg').length, 2);
  const boardSvg = stage.querySelector('.ship-vector-svg');
  const minimap = stage.querySelector('.vector-minimap');
  assert.ok(boardSvg && minimap);

  // 100% shows 100 inches of a 400-inch plane, and says so.
  assert.match(stage.querySelector('#vector-stage-status').textContent, /VIEW 100" OF 400"/);
  const label = () => [...stage.querySelectorAll('.ship-vector-svg text')].find((node) => node.textContent === 'San Telmo');
  assert.equal(Number(label().getAttribute('font-size')), 11);

  // The world is drawn at its real size against that scale: a radius of 4
  // inches at 8 user units an inch is 32 units, not a speck.
  const disc = [...boardSvg.querySelectorAll('circle')].find((node) => node.getAttribute('fill-opacity') === '0.18');
  assert.equal(Number(disc.getAttribute('r')), 32);

  // Zooming redraws, so type counter-scales and holds its size on screen —
  // without the redraw the sizes were left at the previous zoom.
  [...stage.querySelectorAll('button')].find((node) => node.textContent === '[ + ]').click();
  assert.equal(Number(label().getAttribute('font-size')).toFixed(3), (11 / 1.25).toFixed(3));
  assert.match(stage.querySelector('#vector-stage-status').textContent, /VIEW 80" OF 400"/);

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Option;
});

// v0.164.1: a drag has to preview locally and commit once. Writing on every
// pointermove called back into the app, which re-renders, which replaces this
// whole panel — so the SVG the drag was captured on was destroyed after the
// first move and nothing could be dragged.
test('dragging a ship previews it and writes once, on release', { skip: !JSDOM }, () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  const scene = {
    documentType: 'graycloak-traveller-scene', schemaVersion: 3,
    identity: { id: 'scene-drag', name: 'Clear Space' },
    campaignId: 'sea', folder: 'Space',
    board: { kind: 'vector', spanThousandMiles: 400 },
    space: { bodies: [], gravityBodyId: null, atmosphere: null },
    background: { assetId: null },
    tokens: [{ id: 't1', actorId: 'marisol', side: 'party', label: 'MARISOL', position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    notes: '', createdAt: 1
  };
  const stage = document.querySelector('main');
  const writes = [];
  renderVectorSceneStage(stage, scene, { moveShip: (id, point) => writes.push([id, point]), setVector() {} });

  const svg = stage.querySelector('.ship-vector-svg');
  const dot = svg.querySelector('.vector-ship-token');
  const pointer = (type, clientX, clientY) => new dom.window.MouseEvent(type, { clientX, clientY, button: 0, bubbles: true });

  // jsdom has no layout, so getScreenCTM is null and no scene point can be
  // solved — but the contract still holds: nothing is written until release.
  dot.dispatchEvent(pointer('pointerdown', 10, 10));
  svg.dispatchEvent(pointer('pointermove', 60, 40));
  assert.deepEqual(writes, [], 'nothing is written mid-drag');
  svg.dispatchEvent(pointer('pointerup', 60, 40));
  assert.ok(writes.length <= 1, 'at most one write, at the end of the gesture');

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Option;
});

// v0.165.0: Book 2 has no rule for a course that meets a world. The commit is
// refused as the thrust is typed, and a coasting course into it offers the
// referee's surface ruling, because ADVANCE now waits for one.
test('a course into the world blocks the commit and offers a surface ruling', { skip: !JSDOM }, () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  const ship = importShipDocument(JSON.parse(readFileSync(new URL('../examples/Hawkeye.ship.json', import.meta.url))));
  const encounter = enableVectorMovement(createShipCombatEncounter({
    id: 'surface',
    participants: [
      { shipId: 'corsair', side: 'intruder', name: 'Corsair', ship, carriedPrograms: ['maneuver'], loadedPrograms: ['maneuver'] },
      { shipId: 'marisol', side: 'native', name: 'Marisol', ship, carriedPrograms: ['maneuver'], loadedPrograms: ['maneuver'] }
    ]
  }), {
    corsair: { position: { x: 0, y: 0 }, velocity: { x: 3, y: 0 } },
    marisol: { position: { x: 40, y: 0 }, velocity: { x: 0, y: 0 } }
  }, { planet: createPlanet({ name: 'Rock', diameter: 2, center: { x: 2.6, y: 0 } }) });
  const stage = document.querySelector('main');
  const rulings = [];
  renderShipVectorMap(stage, encounter, { commit() {}, adjudicate: (id, ruling) => rulings.push({ id, ...ruling }) });

  const commit = stage.querySelector('#vector-commit');
  assert.equal(commit.disabled, true);
  assert.equal(stage.querySelector('.vector-surface-blocked').hidden, false);
  const ruling = stage.querySelector('.vector-surface-ruling');
  assert.ok(ruling, 'the ruling form is offered');
  assert.match(ruling.textContent, /Corsair's coasting course reaches the world/);

  // Thrusting clear makes the course legal again.
  const thrustY = stage.querySelectorAll('input')[1];
  thrustY.value = '1';
  thrustY.dispatchEvent(new dom.window.Event('input'));
  assert.equal(commit.disabled, false);
  assert.equal(stage.querySelector('.vector-surface-blocked').hidden, true);

  const [x, , vx] = ruling.querySelectorAll('input[type="number"]');
  x.value = '1.4'; vx.value = '-1';
  ruling.querySelector('input[type="text"]').value = 'Hard burn away';
  ruling.querySelector('button').click();
  assert.deepEqual(rulings, [{ id: 'corsair', position: { x: 1.4, y: 0 }, velocity: { x: -1, y: 0 }, note: 'Hard burn away' }]);

  // In clear space there is no ruling to offer.
  renderShipVectorMap(stage, { ...encounter, id: 'clear', spatial: { ...encounter.spatial, planet: null } }, { commit() {}, adjudicate() {} });
  assert.equal(stage.querySelector('.vector-surface-ruling'), null);
  dom.window.close(); delete globalThis.document; delete globalThis.Option;
});
