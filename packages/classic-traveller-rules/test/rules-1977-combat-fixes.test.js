import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPersonalCombatant,
  applyPersonalDamage,
  endPersonalCombatRecovery,
  resolvePersonalMorale,
  parryExpertise,
  TERRAIN_DMS,
  SITUATION_DMS,
  SURPRISE_DMS_NOT_1977
} from '../src/combat/personal-combat.js';
import { REACTION_DMS } from '../src/encounters/patrons.js';

function fixedDice(values) {
  const queue = [...values];
  return { rollD6: () => queue.shift(), roll2D6: () => { const a = queue.shift(); const b = queue.shift(); return { dice: [a, b], total: a + b }; } };
}

function combatant(overrides = {}) {
  return createPersonalCombatant({ id: 'c', name: 'C', side: 'a', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, ...overrides });
}

test('Book 1 p.30: first blood spills past a zeroed characteristic and may kill', () => {
  const target = combatant({ characteristics: { STR: 3, DEX: 3, END: 3, INT: 7 } });
  const { combatant: hit, status } = applyPersonalDamage(target, [6, 6], 1, { modifier: 0 });
  assert.deepEqual(hit.current, { STR: 0, DEX: 0, END: 0 });
  assert.equal(status, 'dead');
});

test('Book 1 p.31: a later wound group spills its excess onto a non-zero characteristic', () => {
  const target = combatant({ characteristics: { STR: 7, DEX: 7, END: 2, INT: 7 } });
  const first = applyPersonalDamage(target, [1], 1).combatant;
  const { combatant: hit, allocations } = applyPersonalDamage(first, [6], null, { targets: ['END'] });
  assert.equal(hit.current.END, 0);
  assert.equal(hit.current.STR + hit.current.DEX, 6 + 7 - 4);
  assert.equal(allocations.filter((a) => a.spilled).length, 1);
});

test('Book 1 p.31: a conscious wounded character is not half-healed at end of combat', () => {
  const wounded = combatant();
  wounded.current.END = 3;
  const rested = endPersonalCombatRecovery(wounded);
  assert.equal(rested.current.END, 3);
  assert.equal(rested.blowsUsed, 0);
});

test('Book 1 p.31: one zero wakes at the halfway point', () => {
  const out = combatant();
  out.current = { STR: 7, DEX: 0, END: 3 };
  out.status = 'unconscious';
  const woke = endPersonalCombatRecovery(out);
  assert.deepEqual(woke.current, { STR: 7, DEX: 3, END: 5 });
});

test('Book 1 p.33: a present leader is +1 on morale', () => {
  const result = resolvePersonalMorale({ casualties: 1, originalStrength: 4, leaderPresent: true, dice: fixedDice([3, 3]) });
  assert.equal(result.dm, 1);
  assert.equal(result.total, 7);
  assert.equal(result.stands, true);
});

test('Graycloak ruling: a pistol cannot fend off a blow; a long gun can', () => {
  // Book 1 p.32 says a gun-armed character "may receive such a protective DM
  // if he actually uses the gun as a brawling weapon (as a club, for
  // example)" without distinguishing pistols. Ruled (Sep 2026): a pistol is
  // too short to block or swing with, so club expertise buys nothing with one
  // in hand; a long gun still defends as a club.
  assert.equal(parryExpertise(combatant({ weaponKey: 'revolver', skills: { Brawling: 1, Club: 1 } })), 0);
  assert.equal(parryExpertise(combatant({ weaponKey: 'body-pistol', skills: { Club: 2 } })), 0);
  assert.equal(parryExpertise(combatant({ weaponKey: 'rifle', skills: { Club: 1 } })), 1);
});

test('Book 1 p.27: 1977 terrain rows present, 1981 situation DMs flagged', () => {
  assert.equal(TERRAIN_DMS.hills, 2);
  assert.equal(TERRAIN_DMS.suburb, -2);
  assert.equal(SITUATION_DMS.cover.raw, false);
  assert.equal(SITUATION_DMS.foldingStock.raw, true);
  assert.ok(SURPRISE_DMS_NOT_1977.includes('battleDress'));
});

test('Book 3 p.23: reaction DM keys off population 11+', () => {
  assert.equal(REACTION_DMS.planetaryPopulation11Plus, -1);
  assert.equal(REACTION_DMS.planetaryPopulation9Plus, undefined);
});
