// Loads adnd-chargen.js as the browser loads it — a classic script whose
// only export is the ADNDChargen global — then drives it against the
// generated kernel in public/vendor. Deterministic: every roll takes a
// seeded RandomSource, so expected values are exact.
// Requires --experimental-vm-modules for the kernel's dynamic import.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(new URL('../public/adnd-chargen.js', import.meta.url));
const kernelUrl = new URL('../public/vendor/osric3-rules/index.js', import.meta.url).href;

const script = new vm.Script(fs.readFileSync(scriptPath, 'utf8') + '\nADNDChargen', {
  filename: 'adnd-chargen.js',
  importModuleDynamically: (specifier) => import(specifier),
});
const Chargen = script.runInThisContext();
await Chargen.ready(kernelUrl);

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE = { str: 17, int: 12, wis: 13, dex: 16, con: 16, cha: 11 };

function build(overrides) {
  return Chargen.buildCharacter(Object.assign({
    raceId: 'human',
    classId: 'fighter',
    baseScores: BASE,
    genderId: 'female',
    alignment: 'LG',
    ownerUid: 'uid-test',
    campaignId: 'camp-test',
    name: 'Testman',
    method: 'I',
    random: seeded(1),
  }, overrides));
}

test('kernel loads and reports its version', () => {
  assert.equal(Chargen.rulesVersion(), '0.8.0');
});

test('every generation method yields six scores; only III is fixed-order', () => {
  for (const method of Chargen.METHODS) {
    const sets = Chargen.rollSets(method, seeded(7));
    assert.ok(sets.length >= 1);
    for (const set of sets) {
      assert.equal(set.values.length, 6);
      for (const value of set.values) assert.ok(value >= 3 && value <= 18);
    }
    assert.equal(Chargen.isArrangeable(method), method !== 'III');
  }
  assert.equal(Chargen.rollSets('IV', seeded(7)).length, 12);
});

test('assignment order maps positionally onto the ability ids', () => {
  const scores = Chargen.toScores([18, 17, 16, 15, 14, 13]);
  assert.deepEqual(scores, { str: 18, int: 17, wis: 16, dex: 15, con: 14, cha: 13 });
});

test('class options carry eligibility, reason, and level cap', () => {
  const options = Chargen.classOptions('half-orc', BASE);
  const byId = Object.fromEntries(options.map((o) => [o.classId, o]));
  assert.equal(byId.fighter.allowed, true);
  assert.equal(byId.cleric.allowed, false);
  assert.equal(byId.cleric.reason, 'npc-only');
  assert.ok(!('paladin' in byId));

  const human = Object.fromEntries(Chargen.classOptions('human', BASE).map((o) => [o.classId, o]));
  assert.equal(human.fighter.levelCap, null);
  assert.equal(human.ranger.allowed, false);
  assert.equal(human.ranger.reason, 'below-minimums');
  assert.equal(human.ranger.missingMinimums.int.required, 13);
});

test('ineligible race/class combinations are rejected with a reason', () => {
  assert.equal(build({ raceId: 'dwarf', classId: 'cleric' }).error,
    'A dwarf cannot be a player-character cleric.');
  assert.equal(build({ classId: 'ranger' }).error,
    'ranger requires INT 13, you have 12.');
});

test('a seeded build is reproducible and internally consistent', () => {
  const first = build({});
  const second = build({});
  assert.equal(first.valid, true);
  assert.deepEqual(first.doc, second.doc);

  const doc = first.doc;
  assert.equal(doc.schemaVersion, 1);
  assert.equal(doc.rulesVersion, '0.8.0');
  assert.equal(doc.ownerUid, 'uid-test');
  assert.equal(doc.campaignId, 'camp-test');
  assert.equal(doc.level, 1);
  assert.equal(doc.experience, 0);
  assert.equal(doc.armorClass, 10);
  assert.equal(doc.createdAt, null);
  assert.equal(doc.hitPoints.current, doc.hitPoints.maximum);
  assert.ok(doc.hitPoints.maximum >= 1 && doc.hitPoints.maximum <= 12);
  assert.ok(doc.startingGold >= 50 && doc.startingGold <= 200);
  assert.equal(doc.gold, doc.startingGold);
});

test('fighter first level comes off the kernel tables', () => {
  const doc = build({}).doc;
  assert.equal(doc.levelTitle, 'Veteran');
  assert.equal(doc.thac0, 20);
  assert.equal(doc.experienceToNextLevel, 2001);
  assert.equal(doc.experienceBonusPct, 10);
  assert.deepEqual(doc.savingThrows, {
    'paralyzation-poison-death': 14,
    'petrification-polymorph': 15,
    'rod-staff-wand': 16,
    'breath-weapon': 17,
    spell: 17,
  });
});

test('racial adjustments reach the saved abilities', () => {
  const doc = build({ raceId: 'half-orc', classId: 'fighter' }).doc;
  assert.equal(doc.racialScores.str, BASE.str + 1);
  assert.equal(doc.racialScores.con, BASE.con + 1);
  assert.equal(doc.racialScores.cha, BASE.cha - 2);
  assert.deepEqual(doc.baseScores, BASE);
});

test('exceptional strength is fighters-only and needs an 18', () => {
  const eighteen = Object.assign({}, BASE, { str: 18 });
  assert.ok(build({ baseScores: eighteen }).doc.exceptionalStrength > 0);
  assert.equal(build({ baseScores: eighteen, classId: 'thief' }).doc.exceptionalStrength, 0);
  assert.equal(build({}).doc.exceptionalStrength, 0);
});

test('arcane casters get a slot, Read Magic, and a pending flag', () => {
  const doc = build({ raceId: 'elf', classId: 'magic-user' }).doc;
  assert.equal(doc.spellSlots.type, 'Magic-User');
  assert.equal(doc.spellSlots.levels[0], 1);
  assert.deepEqual(doc.spells, ['Read Magic']);
  assert.equal(doc.spellsPending, true);
  assert.equal(doc.thiefSkills, null);
});

test('rogues get thief skills and no spells', () => {
  const doc = build({ raceId: 'halfling', classId: 'thief' }).doc;
  assert.equal(doc.spellSlots, null);
  assert.equal(doc.spellsPending, false);
  assert.ok(doc.thiefSkills['pick-locks'] > 0);
  assert.ok(doc.thiefSkills.hide > 0);
});

test('fighters get no spell slots', () => {
  assert.equal(build({}).doc.spellSlots, null);
  assert.deepEqual(build({}).doc.spells, []);
});
