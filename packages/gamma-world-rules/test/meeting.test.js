import test from 'node:test';
import assert from 'node:assert/strict';
import * as gw from '../index.js';

const seq = values => { let i = 0; return () => values[i++ % values.length]; };
const d6 = n => (n - 0.5) / 6;
function survivor(CH = 10) {
  const base = gw.generateCharacter({ species: 'psh', name: 'Test', rng: () => 0.5 });
  base.attributes.CH = CH;
  return gw.deriveCharacter(base, gw.mutationDraft(base), [], { armorId: 'none', weaponId: 'long-sword' });
}
// First strike: player rolls 6, creatures 4, so the player holds the option and nobody is surprised.
function meet(CH, extra = []) {
  const rng = seq([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, d6(6), d6(4), ...extra]);
  const s = gw.createEncounter(survivor(CH), { creature: 'badder', meeting: true, intelligentMorale: true, rng });
  return { s: gw.beginInteractive(s, { rng }), rng };
}
const send = (s, command, rng) => gw.interactiveCommand(s, { ...command, expectedRevision: s.revision }, { rng });

test('reaction table bands follow the printed table', () => {
  assert.deepEqual([2, 3, 5, 6, 8, 9, 11, 12].map(gw.reactionLabel), ['extremely hostile', 'hostile', 'hostile', 'uncertain', 'uncertain', 'friendly', 'friendly', 'enthusiastic']);
});

test('a meeting holds combat until the player chooses, and blocks other commands', () => {
  const { s } = meet(10);
  assert.deepEqual(gw.meetingOptions(s), { talk: true, gift: true, attack: true, leave: true, result: null });
  assert.equal(gw.interactivePath(s, 3, 5), null);
  assert.throws(() => send(s, { type: 'end' }), /meet them first/);
  const left = send(s, { type: 'meet', choice: 'leave' });
  assert.equal(left.status, 'withdrawn');
  const fight = send(s, { type: 'meet', choice: 'attack' });
  assert.equal(gw.meetingOptions(fight), null);
  assert.ok(gw.interactivePath(fight, 3, 5));
});

test('talking rolls 2d6 with Charisma and the character-type adjustment', () => {
  const friendly = meet(18);
  const a = send(friendly.s, { type: 'meet', choice: 'talk' }, seq([d6(4), d6(4)]));
  assert.equal(a.meeting.result.modifier, 2);
  assert.equal(a.meeting.result.score, 10);
  assert.equal(a.status, 'peaceful');
  const hostile = meet(10);
  const b = send(hostile.s, { type: 'meet', choice: 'talk' }, seq([d6(3), d6(3)]));
  assert.equal(b.meeting.result.score, 5);
  assert.equal(b.status, 'active');
  assert.equal(b.turn.action, 'parley');
  assert.equal(gw.meetingOptions(b), null);
});

test('an uncertain result can be tried again with a fresh offer each time', () => {
  const { s } = meet(10);
  const unsure = send(s, { type: 'meet', choice: 'talk' }, seq([d6(4), d6(4)]));
  assert.equal(unsure.meeting.result.label, 'uncertain');
  assert.deepEqual([gw.meetingOptions(unsure).talk, gw.meetingOptions(unsure).gift], [false, true]);
  assert.throws(() => send(unsure, { type: 'meet', choice: 'talk' }), /already spoken/);
  const gift = send(unsure, { type: 'meet', choice: 'gift' }, seq([d6(4), d6(4)]));
  assert.equal(gift.meeting.result.modifier, 0);
  assert.equal(gw.meetingOptions(gift).gift, true);
  const again = send(gift, { type: 'meet', choice: 'gift' }, seq([d6(5), d6(4)]));
  assert.equal(again.status, 'peaceful');
});

test('creatures that cannot be spoken with are rolled at once with no Charisma adjustment', () => {
  const start = roll => gw.beginInteractive(gw.createEncounter(survivor(18), { creature: 'arn', meeting: true, rng: seq([0.9, 0.1, 0.7]) }), { rng: seq([...roll, 0.5]) });
  const calm = start([d6(5), d6(4)]);
  assert.equal(calm.meeting.result.modifier, 0);
  assert.equal(calm.status, 'peaceful');
  const wary = start([d6(4), d6(3)]);
  assert.deepEqual(gw.meetingOptions(wary), { talk: false, gift: false, attack: true, leave: true, result: wary.meeting.result });
  assert.throws(() => send(wary, { type: 'meet', choice: 'talk' }), /cannot be spoken with/);
  const angry = start([d6(2), d6(2)]);
  assert.equal(gw.meetingOptions(angry), null);
  assert.equal(angry.status, 'active');
  assert.equal(gw.createEncounter(survivor(), { creature: 'ark', meeting: true, rng: seq([0.9, 0.1, 0.7]) }).meeting, null);
  assert.equal(gw.createEncounter(survivor(), { creature: 'badder', rng: seq([0.9, 0.1, 0.7]) }).meeting, null);
});

test('intelligent creatures check morale below half hit points only when the option is on', () => {
  for (const [on, expected] of [[true, true], [false, false]]) {
    const rng = seq([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, d6(6), d6(4)]);
    let s = gw.beginInteractive(gw.createEncounter(survivor(), { creature: 'badder', intelligentMorale: on, rng }), { rng });
    s.actors[1].hp = 1;
    s = send(s, { type: 'end' }, seq([0.05]));
    assert.equal(s.actors[1].fled, expected);
  }
});

test('experience thresholds and the bonus matrix follow the printed tables', () => {
  assert.deepEqual(gw.thresholdsCrossed(0, 2999), []);
  assert.deepEqual(gw.thresholdsCrossed(2999, 3000), [3000]);
  assert.deepEqual(gw.thresholdsCrossed(2500, 12000), [3000, 6000, 12000]);
  assert.deepEqual(gw.thresholdsCrossed(999999, 3000000), [1000000, 2000000, 3000000]);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(r => gw.experienceBonus(r).attribute), ['MS', 'CN', 'DX', 'CH', 'PS', 'IN']);
  assert.deepEqual([7, 8, 9, 10].map(r => gw.experienceBonus(r).kind), ['hit', 'hit', 'damage', 'damage']);
  assert.equal(gw.experienceBonus(3, { DX: 18 }).kind, 'none');
  assert.equal(gw.ARTIFACT_EXPERIENCE['Laser pistol'], 1000);
});

test('the damage bonus adds one point per die rolled', () => {
  const c = survivor();
  const plain = gw.equipmentAttack({ character: c, weaponId: 'long-sword', targetAC: 10, rng: () => 0.99 }).damage;
  const better = gw.equipmentAttack({ character: { ...c, effects: { ...c.effects, damagePerDie: 2 } }, weaponId: 'long-sword', targetAC: 10, rng: () => 0.99 }).damage;
  assert.equal(better - plain, 2);
});

test('campaign experience: identified finds add points and a crossed threshold rolls one bonus', async () => {
  const { settleExperience, applyAdvancement } = await import('../../../gamma-world/campaign.js');
  const { awardExperience, characterFor } = await import('../../../gamma-world/settlement.js');
  const base = gw.generateCharacter({ species: 'psh', name: 'Test', rng: () => 0.5 });
  const entry = { id: 'x', record: { base, generation: gw.mutationDraft(base), choices: [], equipment: { armorId: 'none', weaponId: 'club' }, weightKg: 70 }, progress: null, inventory: [], position: { x: 2, y: 5 } };
  const small = awardExperience(entry, 1000, () => 0.95);
  assert.equal(characterFor(small).experience, 1000);
  assert.equal(small.advancement, undefined);
  const big = awardExperience(small, 2000, () => 0.95);
  assert.equal(big.advancement.bonuses.length, 1);
  assert.equal(big.advancement.bonuses[0].kind, 'damage');
  assert.equal(characterFor(big).effects.damagePerDie, 1);
  const dx = awardExperience(big, 3000, () => 0.25);
  assert.equal(dx.advancement.bonuses[1].attribute, 'DX');
  assert.equal(characterFor(dx).attributes.DX, characterFor(big).attributes.DX + 1);
  const ms = settleExperience({ ...dx, progress: { ...dx.progress, experience: 12000 } }, 6000, characterFor(dx).attributes, () => 0.05);
  assert.equal(ms.progress.MS, dx.progress.MS + 1);
  assert.equal(applyAdvancement(characterFor(ms), ms).attributes.MS >= ms.progress.MS, true);
});
