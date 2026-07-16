import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

async function loadCombatBridge() {
  delete globalThis.GraycloakOSRIC3;
  await import(`../../../gcc/vendor/osric3-rules/browser-global.js?combat=${Date.now()}`);
  const window = {
    GCC: null,
    GraycloakOSRIC3: globalThis.GraycloakOSRIC3,
    dispatchEvent() {},
  };
  const context = {
    window,
    Promise,
    console,
    Object,
    Date,
    JSON,
    parseInt,
    isNaN,
    setTimeout,
    clearTimeout,
  };
  const source = fs.readFileSync(new URL('../../../gcc/gcc-combat.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, context, { filename: 'gcc-combat.js' });
  return window.GCCCombat;
}

test('combat bridge uses the kernel for independent multiclass XP fields', async () => {
  const combat = await loadCombatBridge();
  const chars = [
    {
      _id: 'multi', characterClass: 'Fighter / Magic User', level: '1/1',
      xpTotal: 1990, xpTotal2: 2490, hpCurrent: 7,
    },
    {
      _id: 'single', characterClass: 'Thief', level: 1,
      xpTotal: 1240, hpCurrent: 4,
    },
  ];
  const result = combat._applyResult({
    xp_awarded: 200,
    outcome: 'party_victory',
    party: [
      { id: 'multi', hp_current: 5, dead: false },
      { id: 'single', hp_current: 3, dead: false },
    ],
  }, chars, 'multi');

  assert.equal(result.chars[0].xpTotal, 2040);
  assert.equal(result.chars[0].xpTotal2, 2540);
  assert.equal(result.chars[0].level, '2/2');
  assert.equal(result.chars[1].xpTotal, 1340);
  assert.equal(result.chars[1].level, 2);
  assert.equal(result.chars[0].hpCurrent, 5);
  assert.equal(result.chars[1].hpCurrent, 3);
});

test('combat bridge retains xpTotal fallback for unsupported legacy classes', async () => {
  const combat = await loadCombatBridge();
  const bard = { characterClass: 'Bard', xpTotal: 10 };
  assert.equal(combat._awardXP(bard, 5), null);
  assert.equal(bard.xpTotal, 15);
});

test('combat bridge records prime-requisite bonuses separately from the monster XP pool', async () => {
  const combat = await loadCombatBridge();
  const chars = [
    {
      _id: 'fighter', characterClass: 'Fighter', level: 1, xpTotal: 100,
      str: 16, int: 9, wis: 9, dex: 9, con: 12, cha: 9, hpCurrent: 8,
    },
    {
      _id: 'thief', characterClass: 'Thief', level: 1, xpTotal: 100,
      str: 9, int: 9, wis: 9, dex: 16, con: 12, cha: 9, hpCurrent: 6,
    },
  ];
  const result = combat._applyResult({
    xp_awarded: 200,
    outcome: 'party_victory',
    party: [
      { id: 'fighter', hp_current: 8, dead: false },
      { id: 'thief', hp_current: 6, dead: false },
    ],
  }, chars, 'fighter');

  assert.equal(result.chars[0].xpTotal, 210);
  assert.equal(result.chars[1].xpTotal, 210);
  assert.equal(result.entry.xp, 200);
  assert.equal(result.entry.xpBonus, 20);
  assert.equal(result.entry.xpCredited, 220);
  assert.equal(result.summary, 'Victory! +200 XP (+20 prime-requisite bonus)');
});
