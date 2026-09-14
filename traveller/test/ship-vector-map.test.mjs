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
 stage.querySelector('button').click();assert.equal(e.spatial.ships.intruder.position.x,-16);assert.equal(stage.querySelector('button').disabled,true);
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
  // Three bands, the surface, two ships and the preview endpoint.
  assert.equal(svg.querySelectorAll('circle').length, 7);
  // Book 2 p.29 samples the band at the course midpoint, so the status says
  // which band applies and how hard it pulls.
  assert.match(stage.querySelector('[aria-live]').textContent, /gravity 0\.25 G band, 0\.50 toward the world/);
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
  assert.match(second.querySelector('p').textContent, /No world is placed/);
});
