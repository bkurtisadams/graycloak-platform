import assert from 'node:assert/strict';
import { BattlesystemMagicDefenses as D } from '../src/magic-defenses.js';

assert.equal(D.defenseProfile({name:'Mirror Image'})?.defenseKey,'mirror-image');
assert.equal(D.defenseProfile({name:'Mirror Image'})?.passThroughFire,true);
assert.equal(D.defenseProfile({name:'Shield'})?.automation,'referee');
assert.equal(D.defenseProfile({sourceName:"Daoud's Wondrous Lanthorn",functionName:'Prismatic Sphere'})?.defenseName,'Prismatic Sphere');
assert.equal(D.defenseProfile({name:'Fireball'}),null);
assert.equal(D.defenseProfile({name:'Fireball'},{notes:'cast Shield later'}),null);
for(const name of D.names){const p=D.defenseProfile({name});assert.equal(p?.defenseName,name);assert.equal(p?.passThroughFire,true);}
assert.deepEqual(D.mirrorImageDamage(40,3),{
  incomingDamage:40,duplicatesBefore:3,shares:4,realDamage:10,absorbedDamage:30,duplicatesLost:3,duplicatesAfter:0
});
assert.equal(D.mirrorImageDamage(7,0).realDamage,7);
assert.equal(D.mirrorImageDamage(0,4).duplicatesAfter,4);
console.log('magic-defenses: ok');
