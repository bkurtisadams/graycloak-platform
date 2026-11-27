import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../index.js';
const rngFor = n => (() => (n - .5) / 10);
test('all chart nodes cover each die result and point to valid nodes or terminal', () => { for (const [chart, nodes] of Object.entries(g.ARTIFACT_CHARTS))
    for (const [node, row] of Object.entries(nodes)) {
        assert.equal(row.at(-1)[0], 10);
        assert.ok(row.every(([n], i) => i === 0 || n > row[i - 1][0]));
        for (let i = 1; i <= 10; i++) {
            const to = g.chartTransition(chart, node, i);
            assert.ok(['F', 'H'].includes(to) || nodes[to]);
        }
    } });
test('printed direct routes through charts A B C', () => { for (const [chart, route] of [['A', [1, 1, 1]], ['B', [1, 1, 1, 1, 1]], ['C', [1, 1, 1, 1, 1, 1]]]) {
    let n = 'S';
    for (const r of route)
        n = g.chartTransition(chart, n, r);
    assert.equal(n, 'F');
} });
test('chart A danger resets, elapsed time retained', () => { let a = g.discoverArtifact(g.TECHNOLOGY.laserPistol, () => .99); a = { ...a, node: 'D' }; a = g.experiment(a, { IN: 12, rng: rngFor(10) }); assert.equal(a.node, 'S'); assert.equal(a.last.hazard, true); assert.equal(a.minutes, 12); });
test('identification does not depend on condition; interruption resets only unfinished chart', () => { let a = g.discoverArtifact(g.TECHNOLOGY.laserPistol, () => 0); for (let i = 0; i < 3; i++)
    a = g.experiment(a, { IN: 12, rng: () => 0 }); assert.equal(a.identified, true); assert.equal(a.functionChance, 0); assert.equal(g.interruptIdentification(a).node, 'F'); a = g.installCell(a, 'hydrogen'); assert.equal(g.operateArtifact(a, () => 0).works, false); assert.equal(g.operateArtifact(a, () => 0).artifact.charges, 10); });
test('brain talent speeds research, molecular understanding identifies chart A instantly', () => { const a = g.discoverArtifact(g.TECHNOLOGY.laserPistol, () => .99); assert.equal(g.experiment(a, { IN: 12, mutations: ['mental-15'], rng: () => 0 }).minutes, 4); const b = g.experiment(a, { IN: 12, mutations: ['mental-30'], rng: () => 0 }); assert.equal(b.identified, true); assert.equal(b.minutes, 0); });
test('laser cell, first two AC1 deflections and energy consumption', () => { let a = { ...g.discoverArtifact(g.TECHNOLOGY.laserPistol, () => .99), identified: true }; assert.throws(() => g.installCell(a, 'solar')); a = g.installCell(a, 'hydrogen'); let count = 0; for (let i = 0; i < 3; i++) {
    const r = g.laserAttack(a, { ac: 1, distance: 5, deflections: count, rng: () => .99 });
    a = r.artifact;
    count = r.deflections;
    assert.equal(r.damage, i < 2 ? 0 : 30);
} assert.equal(a.charges, 7); });
test('authorization and repair restrictions', () => { const p = { unit: 'security', species: 'psh', valid: true, stage: 4 }; assert.equal(g.authorizeRobot(p), true); assert.equal(g.authorizeRobot({ ...p, species: 'robot' }), false); assert.equal(g.authorizeRobot({ ...p, stage: 3 }), false); assert.equal(g.authorizeRobot({ ...p, mode: 'wild' }), false); assert.equal(g.repairRobot({ species: 'robot', hp: 18, maxHp: 20 }, 5).partsUsed, 2); assert.throws(() => g.repairRobot({ species: 'psh', hp: 18, maxHp: 20 }, 5)); });

test('canIdentify reports dead ends caused by low Intelligence', () => {
  const fresh = g.discoverArtifact(g.TECHNOLOGY.laserPistol, () => 0.5);
  assert.equal(g.canIdentify(fresh, { IN: 12 }), true);
  assert.equal(g.canIdentify(fresh, { IN: 3 }), false);
  assert.equal(g.canIdentify(fresh, { IN: 5 }), true);
  assert.equal(g.canIdentify({ ...fresh, node: 'U' }, { IN: 5 }), false);
  assert.equal(g.canIdentify({ ...fresh, node: 'U' }, { IN: 3, mutations: ['mental-30'] }), true);
});
