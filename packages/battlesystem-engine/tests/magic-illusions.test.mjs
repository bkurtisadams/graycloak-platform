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

test('[PHB] advanced phantasms preserve their sensory and concentration differences', () => {
  const meta = { class: 'illusionist' };
  const improved = I.illusionProfile({ name: 'Improved Phantasmal Force', level: 2, phbMeta: meta }, { casterLevel: 6 });
  assert.equal(improved.rangeIn, 12); assert.equal(improved.sourceAreaSqIn, 10);
  assert.equal(improved.minimalConcentration, true); assert.equal(improved.concentrationMoveFactor, 0.5);
  assert.equal(improved.postConcentrationRounds, 2); assert.deepEqual(improved.sensory, ['visual','minor-sound']);
  const spectral = I.illusionProfile({ name: 'Spectral Force', level: 3, phbMeta: meta }, { casterLevel: 6 });
  assert.equal(spectral.postConcentrationRounds, 3); assert.deepEqual(spectral.sensory, ['visual','sound','smell','thermal']);
  const permanent = I.illusionProfile({ name: 'Permanent Illusion', level: 6, phbMeta: meta }, { casterLevel: 12 });
  assert.equal(permanent.rangeIn, 12); assert.equal(permanent.concentration, false); assert.equal(permanent.permanent, true); assert.equal(permanent.dispellable, true);
});

test('[PHB] Hallucinatory Terrain distinguishes illusionist and magic-user dimensions', () => {
  const il = I.illusionProfile({ name: 'Hallucinatory Terrain', level: 3, phbMeta: { class: 'illusionist' } }, { casterLevel: 8 });
  assert.equal(il.rangeIn, 18); assert.equal(il.sourceLength, 12); assert.equal(il.castingTimeText, '5 rounds');
  assert.equal(il.saveType, 'none'); assert.equal(il.terrainContactEnds, true);
  const mu = I.illusionProfile({ name: 'Hallucinatory Terrain', level: 4, phbMeta: { class: 'magic-user' } }, { casterLevel: 10 });
  assert.equal(mu.rangeIn, 20); assert.equal(mu.sourceLength, 10); assert.equal(mu.castingTimeText, '1 turn');
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
