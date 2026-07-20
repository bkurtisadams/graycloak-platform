import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

test('generated GCC browser kernel installs a stable global API', async () => {
  delete globalThis.GraycloakOSRIC3;
  await import(`../../../gcc/vendor/osric3-rules/browser-global.js?test=${Date.now()}`);
  assert.equal(globalThis.GraycloakOSRIC3.version, '0.7.0');
  assert.deepEqual(
    globalThis.GraycloakOSRIC3.getSpellSlots('cleric', 1, 18, 'eligible-levels-only'),
    { type: 'Cleric', levels: [3, 0, 0, 0, 0, 0, 0] },
  );
});

test('legacy class data can opt into the kernel without changing its default function', async () => {
  if (!globalThis.GraycloakOSRIC3) await import('../../../gcc/vendor/osric3-rules/browser-global.js');
  const legacy = require('../../../gcc/adnd-class-data.js');
  assert.deepEqual(legacy.getSpellSlots('cleric', 1, 18), {
    type: 'Cleric', levels: [3, 2, 1, 1, 0, 0, 0],
  });
  assert.deepEqual(legacy.getKernelSpellSlots('cleric', 1, 18), {
    type: 'Cleric', levels: [3, 2, 1, 1, 0, 0, 0],
  });
  assert.deepEqual(legacy.getKernelSpellSlots('cleric', 1, 18, 'eligible-levels-only'), {
    type: 'Cleric', levels: [3, 0, 0, 0, 0, 0, 0],
  });
});


test('legacy class data migrates Strength combat fields through the kernel', async () => {
  if (!globalThis.GraycloakOSRIC3) await import('../../../gcc/vendor/osric3-rules/browser-global.js');
  const legacy = require('../../../gcc/adnd-class-data.js');

  function field(value = '') {
    return {
      value,
      dataset: {},
      listeners: {},
      addEventListener(type, listener) { this.listeners[type] = listener; },
    };
  }
  const fields = {
    str: field('18'),
    strPct: field('76'),
    strHitAdj: field(''),
    strDamAdj: field(''),
    strWtAllow: field(''),
  };
  const root = {
    querySelector(selector) {
      const match = selector.match(/data-field="([^"]+)"/);
      return match ? fields[match[1]] || null : null;
    },
  };

  assert.equal(legacy.enableKernelStrengthBridge(root), true);
  assert.equal(fields.strHitAdj.value, '+2');
  assert.equal(fields.strDamAdj.value, '+4');
  assert.equal(fields.strWtAllow.value, '1500');

  fields.strPct.value = '100';
  fields.strPct.listeners.input();
  assert.equal(fields.strHitAdj.value, '+3');
  assert.equal(fields.strDamAdj.value, '+6');
  assert.equal(fields.strWtAllow.value, '3000');
});

test('legacy class data migrates remaining stable ability fields through the kernel', async () => {
  if (!globalThis.GraycloakOSRIC3) await import('../../../gcc/vendor/osric3-rules/browser-global.js');
  const legacy = require('../../../gcc/adnd-class-data.js');

  function field(value = '') {
    return {
      value,
      dataset: {},
      listeners: {},
      addEventListener(type, listener) { this.listeners[type] = listener; },
    };
  }
  const names = [
    'characterClass', 'str', 'strPct', 'strHitAdj', 'strDamAdj', 'strWtAllow',
    'int', 'intAddLang', 'intKnowSpell', 'intMinSpells', 'intMaxSpells',
    'wis', 'wisMagAtkAdj', 'wisSpellBonus', 'wisSpellFail',
    'dex', 'dexReactAdj', 'dexMissileAdj', 'dexDefAdj',
    'con', 'conHpAdj', 'conSysShock', 'conResSurv',
    'cha', 'chaMaxHench', 'chaLoyalty', 'chaReactAdj',
  ];
  const fields = Object.fromEntries(names.map((name) => [name, field('')]));
  Object.assign(fields.characterClass, { value: 'Fighter' });
  Object.assign(fields.str, { value: '18' });
  Object.assign(fields.strPct, { value: '76' });
  Object.assign(fields.int, { value: '16' });
  Object.assign(fields.intKnowSpell, { value: 'manual' });
  Object.assign(fields.wis, { value: '18' });
  Object.assign(fields.dex, { value: '17' });
  Object.assign(fields.con, { value: '18' });
  Object.assign(fields.cha, { value: '17' });

  const root = {
    querySelector(selector) {
      const match = selector.match(/data-field="([^"]+)"/);
      return match ? fields[match[1]] || null : null;
    },
  };

  assert.equal(legacy.enableKernelAbilityBridges(root), true);
  assert.equal(fields.intAddLang.value, '5');
  assert.equal(fields.intKnowSpell.value, 'manual');
  assert.equal(fields.intMinSpells.value, '');
  assert.equal(fields.intMaxSpells.value, '');
  assert.equal(fields.wisMagAtkAdj.value, '+4');
  assert.equal(fields.wisSpellBonus.value, '2/2/1/1');
  assert.equal(fields.wisSpellFail.value, '0');
  assert.equal(fields.dexReactAdj.value, '+2');
  assert.equal(fields.dexMissileAdj.value, '+2');
  assert.equal(fields.dexDefAdj.value, '-3');
  assert.equal(fields.conHpAdj.value, '+4');
  assert.equal(fields.conSysShock.value, '99');
  assert.equal(fields.conResSurv.value, '100');
  assert.equal(fields.chaMaxHench.value, '10');
  assert.equal(fields.chaLoyalty.value, '+30');
  assert.equal(fields.chaReactAdj.value, '+30');

  fields.characterClass.value = 'Fighter / Magic User';
  fields.characterClass.listeners.input();
  assert.equal(fields.conHpAdj.value, '+2');

  fields.wis.value = '12';
  fields.wis.listeners.input();
  assert.equal(fields.wisSpellBonus.value, '');
  assert.equal(fields.wisSpellFail.value, '5');
});
