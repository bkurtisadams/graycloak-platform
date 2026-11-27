import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../index.js';
const low = () => 0, high = () => .999999;
test('dice inclusive endpoints and invalid RNG', () => { assert.equal(g.die(6, low), 1); assert.equal(g.die(6, high), 6); assert.throws(() => g.die(6, () => 1)); });
test('PSH charisma capped; constitution d6 HP; no mutations', () => { const c = g.generateCharacter({ rng: high }); assert.equal(c.attributes.CH, 18); assert.equal(c.hp, 108); assert.deepEqual(c.mutationCounts, { physical: 0, mental: 0 }); assert.equal(g.mutationDraft(c).slots.length, 0); });
test('3d6 PSH minimum charisma is six', () => { const c = g.generateCharacter({ method: '3d6', rng: low }); assert.equal(c.attributes.CH, 6); assert.equal(c.hp, 3); });
test('4d6 discards lowest', () => { let i = 0; const values = [0, .2, .4, .99]; const c = g.generateCharacter({ species: 'humanoid', rng: () => values[i++ % 4] }); assert.equal(c.attributes.MS, 11); });
test('mutated animal requires stock', () => assert.throws(() => g.generateCharacter({ species: 'animal' })));
test('mutants roll separate d4 counts', () => { const c = g.generateCharacter({ species: 'animal', animalStock: 'wolf', rng: high }); assert.deepEqual(c.mutationCounts, { physical: 4, mental: 4 }); assert.equal(c.reviewRequired.length, 3); });
test('attribute modifiers and charisma table', () => { assert.equal(g.strengthDamageModifier(3), -3); assert.equal(g.dexterityHitModifier(18), 3); assert.equal(g.artifactIntelligenceModifier(18), -3); assert.deepEqual(g.charisma(18), { followers: 15, morale: 3, reaction: 3 }); });
test('weapon table examples and unusual printed cell', () => { assert.equal(g.weaponTarget(9, 3), 10); assert.equal(g.weaponTarget(4, 16), 18); assert.equal(g.weaponTarget(10, 12), 5); assert.throws(() => g.weaponTarget(0, 3)); });
test('natural matrix bands', () => { assert.equal(g.naturalTarget(1, 1), 20); assert.equal(g.naturalTarget(6, 4), 12); assert.equal(g.naturalTarget(10, 15), 4); });
test('mental matrix automatic and impossible; no dice rolled', () => { const fail = () => { throw Error('unexpected roll'); }; assert.equal(g.mentalAttack({ attackerMS: 18, defenderMS: 3, rng: fail }).hit, true); assert.equal(g.mentalAttack({ attackerMS: 3, defenderMS: 18, rng: fail }).hit, false); assert.equal(g.mentalTarget(10, 10), 10); });
test('physical attack uses range penalty and only rolls damage on hit', () => { assert.equal(g.physicalAttack({ ac: 9, wc: 3, damageDice: 1, damageSides: 8, rng: high }).damage, 8); assert.equal(g.physicalAttack({ ac: 9, wc: 3, damageDice: 1, damageSides: 8, effectiveRange: 10, distance: 21, rng: () => { throw Error('no roll'); } }).reason, 'out-of-range'); assert.equal(g.physicalAttack({ ac: 9, wc: 3, damageDice: 1, damageSides: 8, effectiveRange: 10, distance: 20, rng: high }).rangePenalty, -5); });
test('radiation matrix thresholds and outcomes', () => { assert.equal(g.radiationCell(18, 3), 0); assert.equal(g.radiationCell(18, 15), 8); assert.equal(g.radiationCell(18, 16), 'M'); assert.equal(g.radiationCell(18, 18), 'D'); assert.equal(g.radiation({ cn: 3, intensity: 3, rng: low }).outcome, 'defect'); assert.equal(g.radiation({ cn: 3, intensity: 3, rng: high }).outcome, 'death'); });
test('poison printed exception and antidote example', () => { assert.equal(g.poisonCell(18, 15), 1); assert.equal(g.poisonCell(18, 17), 3); assert.equal(g.poisonCell(11, 10), 'D'); assert.equal(g.poisonCell(11, 9), 2); assert.equal(g.poisonCell(18, 18), 'D'); assert.equal(g.antidoteChance(16, 14), 30); assert.equal(g.antidoteChance(16, 18), 70); assert.equal(g.antidoteChance(16, 16), 100); });
test('movement and initiative', () => { assert.equal(g.movement({ pace: 'charge' }).meters, 24); assert.equal(g.movement({ pace: 'charge' }).canFire, false); assert.equal(g.movement({ mode: 'search', indoors: true }).meters, 1); assert.equal(g.initiative({ rng: low }).first, 'simultaneous'); assert.equal(g.initiative({ leftHighDX: true, rng: low }).first, 'left'); });
test('healing capped and never resurrects', () => { assert.equal(g.healRest({ hp: 3, maxHp: 5 }, 5).hp, 5); assert.equal(g.healRest({ hp: 0, maxHp: 5 }, 5).hp, 0); });
test('artifact condition all sums', () => { for (let a = 1; a <= 6; a++)
    for (let b = 1; b <= 6; b++) {
        let i = 0;
        const x = g.artifactCondition(() => (([a, b][i++]) - 1) / 6 + .0001);
        assert.equal(x.functionChance, a + b <= 5 ? 0 : a + b <= 7 ? 20 : a + b <= 9 ? 40 : (a + b - 7) * 20);
    } });
test('complete physical and mental table coverage for both species', () => { for (const [kind, entries, last] of [['physical', g.PHYSICAL, 90], ['mental', g.MENTAL, 95]]) {
    assert.equal(entries.length, 49);
    for (const species of ['humanoid', 'animal']) {
        for (let n = 1; n <= last; n++)
            assert.equal(g.mutationResult(kind, species, n).type, 'mutation');
        assert.equal(g.mutationResult(kind, species, last + 1).type, 'good-reroll');
        assert.equal(g.mutationResult(kind, species, 100).type, 'choice');
    }
} });
test('selected defects per original counts', () => { assert.deepEqual(g.selectedDefects({ physical: 2, mental: 2 }), { physical: 0, mental: 0, refereeChoice: 1 }); assert.deepEqual(g.selectedDefects({ physical: 4, mental: 3 }), { physical: 1, mental: 1, refereeChoice: 0 }); });
test('good reroll excludes defect and preserves choice constraint', () => { let i = 0; const values = [.91, 0, .04]; const r = g.rollMutation('physical', 'humanoid', () => values[i++]); assert.equal(r.entry.name, 'Chameleon Powers'); assert.equal(r.goodOnly, true); });
