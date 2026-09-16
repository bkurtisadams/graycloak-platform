// player-wound-allocation.test.mjs — the wounded player's own distribution of
// a wound, across the multiplayer trust boundary (Book 1 p.30).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { importCharacterDocument } from '../vendor/classic-traveller-rules/index.js';
import { createCampaignDocument, setDocumentOwner } from '../src/campaign-document.js';
import {
  createEncounterDocument,
  declareEncounterAction,
  resolveDeclaredRound,
  pendingWoundAllocation,
  allocateRoundWound,
  importEncounterDocument
} from '../src/encounter-document.js';
import { buildPublishedView } from '../src/published-view.js';
import { throwCardModel } from '../client/combat-view.js';
import {
  createPlayerWoundAllocation,
  authorizePlayerWoundAllocation
} from '../src/player-wound-allocation.js';
import {
  woundPromptFrom,
  initialWoundDraft,
  previewWoundDraft,
  moveWoundShare
} from '../client/wound-dialog.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(here, '../examples');
const date = { year: 4800, dayOfYear: 106 };
const PLAYER = 'uid-player-a';
const OTHER = 'uid-player-b';

function sequenceDice(values) {
  let index = 0;
  const dice = { rollD6() { if (index >= values.length) throw new Error('dice sequence exhausted'); return values[index++]; } };
  dice.roll2D6 = () => { const rolled = [dice.rollD6(), dice.rollD6()]; return { dice: rolled, total: rolled[0] + rolled[1] }; };
  return dice;
}

// A paused round: the player's character has been hit for the second time, so
// the groups are theirs to place.
async function pausedFixture() {
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  let campaign = createCampaignDocument({
    id: 'campaign-player-wounds', name: 'Sea of Suns', time: { year: 4800, dayOfYear: 106, secondsOfDay: 0 },
    location: { systemId: 'cinder', systemName: 'Cinder', worldId: 'cinder-main', worldName: 'Cinder' },
    characters: [character], ships: [], partyCharacterIds: [character.identity.id], activeShipId: null
  });
  campaign = setDocumentOwner(campaign, { documentId: character.identity.id, ownerUid: PLAYER });
  let encounter = createEncounterDocument({
    campaign, character, opponent: { name: 'Veyra Kade', playerWeaponKey: 'rifle' },
    date, range: 'medium', dice: sequenceDice([3, 3])
  });
  const pc = encounter.combatants.find((entry) => entry.side === 'party');
  pc.firstBlood = false;
  encounter.combatants.find((entry) => entry.side !== 'party').weaponKey = 'laser-rifle';
  encounter = importEncounterDocument(encounter);
  const foe = encounter.combatants.find((entry) => entry.side !== 'party');
  encounter = declareEncounterAction(encounter, { action: 'wait', actorId: pc.id }).encounter;
  encounter = declareEncounterAction(encounter, { action: 'attack', actorId: foe.id, targetId: pc.id }).encounter;
  const result = resolveDeclaredRound(encounter, { dice: sequenceDice([6, 6, 3, 3, 3, 3, 3, 1]), date, playerAllocatesWounds: true });
  assert.equal(result.pending, true, 'the fixture must pause');
  return { campaign, encounter: result.encounter, pc, foe };
}

test('the paused wound is published to the player, and nothing of the attacker is', async () => {
  const { encounter, pc, foe } = await pausedFixture();
  const view = buildPublishedView(encounter, { campaignId: 'campaign-player-wounds', publishedAt: 1 });
  const wound = view.pendingWound;
  assert.ok(wound, 'the view says what the round is waiting for');
  assert.equal(wound.defenderId, pc.id);
  assert.equal(wound.attackerName, foe.name);
  assert.deepEqual(wound.damageDice, [3, 3, 3, 3, 3]);
  assert.equal(wound.total, 15);
  assert.deepEqual(wound.current, { STR: pc.current.STR, DEX: pc.current.DEX, END: pc.current.END });

  // The wound says nothing about how the blow was thrown: no DMs, no target
  // number, no armour. (v0.180.0 publishes the party's own throws and their
  // own attack results elsewhere in the view; this object is not that.)
  const serialized = JSON.stringify(wound);
  for (const leak of ['totalDM', 'skillDM', 'requiredRoll', 'target', 'armor', 'weaponKey', 'characteristics']) {
    assert.doesNotMatch(serialized, new RegExp(`"${leak}"`), `${leak} must not reach the player`);
  }
  // The unresolved round is not narrated: only rounds already played are.
  assert.ok(view.narration.every((entry) => entry.round < encounter.round));
});

test('a view with no paused round carries no wound', async () => {
  const { encounter } = await pausedFixture();
  const finished = allocateRoundWound(encounter, { dice: sequenceDice([1, 1, 1, 1]), date }).encounter;
  assert.equal(buildPublishedView(finished, { campaignId: 'campaign-player-wounds' }).pendingWound, null);
});

test('the intent refuses a malformed distribution before it is ever sent', () => {
  const base = { uid: PLAYER, encounterId: 'enc', actorId: 'pc', key: '1-0', targets: ['STR', 'DEX'], round: 1, sentAt: 1 };
  assert.ok(createPlayerWoundAllocation(base));
  assert.throws(() => createPlayerWoundAllocation({ ...base, uid: '' }), /signed-in|uid/);
  assert.throws(() => createPlayerWoundAllocation({ ...base, targets: ['STR', 'LUCK'] }), /STR, DEX or END/);
  assert.throws(() => createPlayerWoundAllocation({ ...base, targets: [] }), /STR, DEX or END/);
  assert.throws(() => createPlayerWoundAllocation({ ...base, allocation: [1] }), /one integer share per wound group/);
  assert.throws(() => createPlayerWoundAllocation({ ...base, key: '' }), /wound key/);
  assert.throws(() => createPlayerWoundAllocation({ ...base, round: 0 }), /round/);
});

test('the referee authorizes the answer against its own encounter', async () => {
  const { campaign, encounter, pc } = await pausedFixture();
  const pending = pendingWoundAllocation(encounter);
  const good = {
    uid: PLAYER, encounterId: encounter.identity.id, actorId: pc.id, key: pending.key,
    targets: ['STR', 'STR', 'DEX', 'DEX', 'END'], allocation: null, round: encounter.round, sentAt: 1
  };
  assert.ok(authorizePlayerWoundAllocation(good, { campaign, encounter, pending }));

  // Somebody else's character, somebody else's account, the wrong wound, the
  // wrong round, the wrong number of groups — each refused.
  assert.throws(() => authorizePlayerWoundAllocation({ ...good, uid: OTHER }, { campaign, encounter, pending }), /does not own/);
  assert.throws(() => authorizePlayerWoundAllocation({ ...good, key: 'other' }, { campaign, encounter, pending }), /no longer waiting/);
  assert.throws(() => authorizePlayerWoundAllocation({ ...good, round: encounter.round + 1 }, { campaign, encounter, pending }), /round/);
  assert.throws(() => authorizePlayerWoundAllocation({ ...good, targets: ['STR'] }, { campaign, encounter, pending }), /one characteristic per wound die/);
  assert.throws(() => authorizePlayerWoundAllocation({ ...good, encounterId: 'elsewhere' }, { campaign, encounter, pending }), /does not belong/);
  assert.throws(() => authorizePlayerWoundAllocation(good, { campaign, encounter, pending: null }), /no wound is waiting/);
});

test('a constant that does not add up is refused, wherever the sum went wrong', async () => {
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  let campaign = createCampaignDocument({
    id: 'campaign-constant', name: 'Sea of Suns', time: { year: 4800, dayOfYear: 106, secondsOfDay: 0 },
    location: { systemId: 'cinder', systemName: 'Cinder', worldId: 'cinder-main', worldName: 'Cinder' },
    characters: [character], ships: [], partyCharacterIds: [character.identity.id], activeShipId: null
  });
  campaign = setDocumentOwner(campaign, { documentId: character.identity.id, ownerUid: PLAYER });
  let encounter = createEncounterDocument({
    campaign, character, opponent: { name: 'Veyra Kade', playerWeaponKey: 'rifle' },
    date, range: 'short', dice: sequenceDice([3, 3])
  });
  const pc = encounter.combatants.find((entry) => entry.side === 'party');
  pc.firstBlood = false;
  // Book 1 p.43: a cutlass wounds 2D+4, so there is a constant to distribute.
  encounter.combatants.find((entry) => entry.side !== 'party').weaponKey = 'cutlass';
  encounter = importEncounterDocument(encounter);
  const foe = encounter.combatants.find((entry) => entry.side !== 'party');
  encounter = declareEncounterAction(encounter, { action: 'wait', actorId: pc.id }).encounter;
  encounter = declareEncounterAction(encounter, { action: 'attack', actorId: foe.id, targetId: pc.id }).encounter;
  const paused = resolveDeclaredRound(encounter, { dice: sequenceDice([6, 6, 2, 2, 1]), date, playerAllocatesWounds: true }).encounter;
  const pending = pendingWoundAllocation(paused);
  assert.equal(pending.modifier, 4);
  const intent = {
    uid: PLAYER, encounterId: paused.identity.id, actorId: pc.id, key: pending.key,
    targets: ['STR', 'DEX'], round: paused.round, sentAt: 1
  };
  assert.ok(authorizePlayerWoundAllocation({ ...intent, allocation: [4, 0] }, { campaign: campaign, encounter: paused, pending }));
  assert.ok(authorizePlayerWoundAllocation({ ...intent, allocation: [1, 3] }, { campaign: campaign, encounter: paused, pending }));
  assert.throws(() => authorizePlayerWoundAllocation({ ...intent, allocation: [2, 0] }, { campaign: campaign, encounter: paused, pending }), /distribute the whole modifier \(4\), not 2/);
});

test('the shared dialog previews from the same rules the referee applies', async () => {
  const { encounter, pc } = await pausedFixture();
  const view = buildPublishedView(encounter, { campaignId: 'campaign-player-wounds' });
  // The player's page has only the published wound; the preview must still
  // agree with what the referee's engine will do with the same choice.
  const prompt = woundPromptFrom(view.pendingWound);
  const draft = { ...initialWoundDraft(prompt), targets: ['STR', 'STR', 'DEX', 'DEX', 'END'] };
  const preview = previewWoundDraft(prompt, draft);
  assert.equal(preview.ok, true);
  const applied = allocateRoundWound(encounter, { targets: draft.targets, dice: sequenceDice([1, 1, 1, 1]), date });
  const after = applied.encounter.combatants.find((entry) => entry.id === pc.id);
  assert.deepEqual(
    { STR: preview.current.STR, DEX: preview.current.DEX, END: preview.current.END },
    { STR: after.current.STR, DEX: after.current.DEX, END: after.current.END }
  );
});

test('moving the constant between groups keeps the total the rules demand', () => {
  const prompt = woundPromptFrom({ key: '1-0', damageDice: [3, 4], modifier: 4, current: { STR: 9, DEX: 9, END: 9 }, defenderName: 'X', attackerName: 'Y', weaponName: 'Cutlass' });
  let draft = initialWoundDraft(prompt);
  assert.deepEqual(draft.shares, [4, 0]);
  draft = moveWoundShare(prompt, draft, 1, 1);
  assert.deepEqual(draft.shares, [3, 1]);
  assert.equal(draft.shares.reduce((sum, share) => sum + share, 0), prompt.modifier);
  draft = moveWoundShare(prompt, draft, 1, 1);
  draft = moveWoundShare(prompt, draft, 1, 1);
  draft = moveWoundShare(prompt, draft, 1, 1);
  assert.deepEqual(draft.shares, [0, 4]);
  // Nothing left to take: the move is refused rather than breaking the sum.
  draft = moveWoundShare(prompt, draft, 1, 1);
  assert.equal(draft.shares.reduce((sum, share) => sum + share, 0), prompt.modifier);
  assert.equal(previewWoundDraft(prompt, draft).ok, true);
});

// --- v0.180.0: the rest of the player-page parity ------------------------

test('the party\u2019s own throws are published, and no enemy attribute is named', async () => {
  const { encounter, pc, foe } = await pausedFixture();
  const finished = allocateRoundWound(encounter, { dice: sequenceDice([1, 1, 1, 1]), date }).encounter;
  const view = buildPublishedView(finished, { campaignId: 'campaign-player-wounds' });
  const priced = view.throws.find((entry) => entry.attackerId === pc.id && entry.targetId === foe.id);
  assert.ok(priced, 'the party member is priced against the foe');
  assert.equal(priced.basic, 8);
  assert.equal(typeof priced.needed, 'number');
  assert.equal(typeof priced.chance, 'number');
  // The tables and every defensive DM arrive as one unlabelled figure.
  assert.equal(typeof priced.defenceDM, 'number');
  const serialised = JSON.stringify(view.throws);
  for (const leak of ['armor', 'jack', 'mesh', 'cloth', 'reflec', 'PARRIES', 'UNTRAINED']) {
    assert.doesNotMatch(serialised, new RegExp(leak, 'i'), `${leak} must not be named to a player`);
  }
  // Only the attacker's own rows are labelled.
  for (const row of priced.rows) {
    assert.doesNotMatch(row.label, new RegExp(foe.name, 'i'), 'no row names the defender');
  }
  // The published figure is the figure the referee's own card shows.
  const model = throwCardModel(finished, finished.combatants.find((entry) => entry.id === pc.id), finished.combatants.find((entry) => entry.id === foe.id));
  assert.equal(priced.needed, model.needed);
  assert.equal(priced.totalDM, model.totalDM);
  assert.equal(priced.defenceDM + priced.rows.reduce((sum, row) => sum + row.dm, 0), model.totalDM);
});

test('a fight between two other sides is priced for nobody and carries no cards', async () => {
  const { encounter } = await pausedFixture();
  const finished = allocateRoundWound(encounter, { dice: sequenceDice([1, 1, 1, 1]), date }).encounter;
  const view = buildPublishedView(finished, { campaignId: 'campaign-player-wounds' });
  // Every published throw belongs to a party combatant.
  for (const entry of view.throws) {
    assert.equal(finished.combatants.find((combatant) => combatant.id === entry.attackerId).side, 'party');
  }
  // Every published attack card has a party combatant at one end.
  for (const attack of view.attacks) {
    const sides = [attack.attackerId, attack.targetId].map((id) => finished.combatants.find((entry) => entry.id === id)?.side);
    assert.ok(sides.includes('party'), 'a card is published only for a fight the party was in');
  }
});

test('the party\u2019s own attack results are published as the table saw them', async () => {
  const { encounter, pc } = await pausedFixture();
  const finished = allocateRoundWound(encounter, { targets: ['STR', 'STR', 'DEX', 'DEX', 'END'], dice: sequenceDice([1, 1, 1, 1]), date }).encounter;
  const view = buildPublishedView(finished, { campaignId: 'campaign-player-wounds' });
  const attack = view.attacks.find((entry) => entry.targetId === pc.id);
  assert.ok(attack, 'the blow that wounded the player is a card');
  assert.deepEqual(attack.dice, [6, 6]);
  assert.equal(attack.hit, true);
  // What the two dice had to show, after every DM — the same figure the
  // throw card offers before the click.
  assert.equal(attack.roll >= attack.needed, attack.hit);
  assert.equal(attack.total, attack.roll + attack.totalDM);
  assert.ok(attack.wound, 'a hit carries its wound');
  // Where the wound landed is public — a man clutching his arm is visible —
  // and it is the distribution the player themselves chose.
  assert.deepEqual(attack.wound.allocations.map((entry) => entry.characteristic), ['STR', 'STR', 'DEX', 'DEX', 'END']);
  assert.equal(attack.wound.playerAllocated, true);
  // No DM is broken out: the breakdown would name the defender's armour.
  assert.equal(attack.dms, undefined);
});
