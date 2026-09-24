import assert from 'node:assert/strict';
import test from 'node:test';
import { BattlesystemMagicIllusions as I } from '../src/magic-illusions.js';

test('[14.14] recognizes the printed illusion list without catching unrelated defenses', () => {
  assert.equal(I.illusionProfile({ name: 'Phantasmal Force', kind: 'spell' })?.illusionName, 'Phantasmal Force');
  assert.equal(I.illusionProfile({ name: 'Hallucinatory Forest', kind: 'spell' })?.requiredPhase, 'missileMagic');
  assert.equal(I.illusionProfile({ name: 'Mirror Image', kind: 'spell' }), null);
  assert.equal(I.illusionProfile({ name: 'Referee Mirage', kind: 'spell' }, { notes: '[illusion]' })?.illusionMagic, true);
});

test('[14.14] illusion casting is Missile and Magic Phase only', () => {
  const p = I.illusionProfile({ name: 'Spectral Force', kind: 'spell' });
  assert.equal(I.timingState(p, { liveBattle: true, phaseId: 'movement' }).ok, false);
  assert.equal(I.timingState(p, { liveBattle: true, phaseId: 'missileMagic' }).ok, true);
});

test('[PHB] Phantasmal Force profiles distinguish Illusionist 1 from Magic-User 3', () => {
  const il = I.illusionProfile({ name: 'Phantasmal Force', level: 1, phbMeta: { class: 'illusionist' } }, { casterLevel: 5 });
  assert.equal(il.phantasmalForce, true);
  assert.equal(il.rangeIn, 11);
  assert.equal(il.sourceAreaSqIn, 9);
  assert.equal(il.sourceLength, 3);
  assert.equal(il.castingTimeSegments, 1);
  assert.equal(il.shape, 'square');
  assert.equal(il.concentration, true);
  assert.equal(il.visualOnly, true);

  const mu = I.illusionProfile({ name: 'Phantasmal Force', level: 3, phbMeta: { class: 'magic-user' } }, { casterLevel: 7 });
  assert.equal(mu.rangeIn, 15);
  assert.equal(mu.sourceAreaSqIn, 15);
  assert.equal(mu.castingTimeSegments, 3);
  assert.equal(mu.movableArea, true);
});

test('[14.14] sensory and referee plausibility modifiers affect only the disbelief Morale gate', () => {
  assert.equal(I.disbeliefMoraleModifier({ missingSensory: true, plausibilityModifier: 1 }), 2);
  assert.equal(I.disbeliefMoraleModifier({ missingSensory: false, plausibilityModifier: -1 }), -1);
  assert.equal(I.disbeliefMoraleModifier({ plausibilityModifier: 99 }), 1);
});

test('[14.14] 1:1 figures save automatically while mass forces must first pass Morale', () => {
  assert.equal(I.disbeliefGate({ individual: true }).maySave, true);
  assert.equal(I.disbeliefGate({ individual: false, moralePassed: false }).maySave, false);
  assert.equal(I.disbeliefGate({ individual: false, moralePassed: true }).maySave, true);
});

test('[14.14] a failed Morale gate gains a next-round save after an allied success', () => {
  const failed = I.disbeliefOutcome({ moralePassed: false, round: 4 });
  assert.equal(failed.outcome, 'believes');
  assert.equal(failed.retryRound, 5);
  const cascade = I.disbeliefOutcome({ moralePassed: false, alliedDisbeliefKnown: true, saveSucceeded: true, round: 5 });
  assert.equal(cascade.disbelieved, true);
  assert.equal(cascade.moraleRequired, false);
});
