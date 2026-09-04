import test from 'node:test';
import assert from 'node:assert/strict';
import { BattlesystemAerial } from '../index.js';

test('[15.4] bombing uses fixed AC 10/8/4 at low/medium/high altitude', () => {
  assert.equal(BattlesystemAerial.bombingTargetAC(0), null);
  assert.equal(BattlesystemAerial.bombingTargetAC(1), 10);
  assert.equal(BattlesystemAerial.bombingTargetAC(2), 8);
  assert.equal(BattlesystemAerial.bombingTargetAC(3), 4);
  assert.equal(BattlesystemAerial.bombingTargetAC(4), null);
  assert.equal(BattlesystemAerial.bombingTargetAC(1.5), null);
});

test('[15.4] each whole man-sized equivalent supplies one 2d6 bomb attack', () => {
  assert.deepEqual(BattlesystemAerial.bombingProfile({ altitude: 2, equivalents: 3 }), {
    targetAC: 8,
    equivalents: 3,
    damage: '2d6',
    maneuverabilityPenalty: 1,
  });
  assert.equal(BattlesystemAerial.bombingProfile({ altitude: 1, equivalents: 0 }), null);
  assert.equal(BattlesystemAerial.normalizeBombEquivalents(2.9), 2);
});
