import test from 'node:test'; import assert from 'node:assert/strict';
import { createNpcActorDocument, duplicateNpcActorDocument, setNpcActorArchived, npcActorMatchesSearch } from '../src/npc-actor-document.js';
test('v0.83.0 duplicate, archive, search', () => {
  const a = createNpcActorDocument({ name: 'Raider', role: 'Pirate', actorType: 'npc', faction: 'Vargr Corsairs', characteristics: { STR: 8, DEX: 9, END: 7, INT: 6, EDU: 5, SOC: 4 }, skills: { 'Gun Combat': 1 }, weaponKey: 'rifle', armor: 'jack' });
  const b = duplicateNpcActorDocument(a);
  assert.notEqual(b.identity.id, a.identity.id);
  assert.equal(b.identity.name, 'Raider (copy)');
  assert.equal(b.profile.role, 'Pirate');
  assert.equal(b.loadout.weaponKey, 'rifle');
  assert.equal(b.state.archived, false);
  const c = setNpcActorArchived(a, true);
  assert.equal(c.state.archived, true);
  assert.equal(setNpcActorArchived(c, false).state.archived, false);
  assert.ok(npcActorMatchesSearch(a, 'raid'));
  assert.ok(npcActorMatchesSearch(a, 'pirate'));
  assert.ok(npcActorMatchesSearch(a, 'vargr'));
  assert.ok(!npcActorMatchesSearch(a, 'merchant'));
});
