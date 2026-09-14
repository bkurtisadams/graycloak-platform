import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importShipDocument,createShipCombatEncounter,createSequenceDice} from '../vendor/classic-traveller-rules/index.js';
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
