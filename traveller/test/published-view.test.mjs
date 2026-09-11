import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { importCharacterDocument, importShipDocument } from '../vendor/classic-traveller-rules/index.js';
import { createCampaignDocument } from '../src/campaign-document.js';
import { createEncounterDocument, resolveEncounterRound, setCombatantCover } from '../src/encounter-document.js';
import { buildPublishedView, buildPublishedCampaign, buildPublishedCharacter, buildPublishedLog, buildPublishedShip, PLAYER_LOG_CATEGORIES } from '../src/published-view.js';
import { createActivityLogDocument, appendActivityLogEntry, ACTIVITY_VISIBILITY } from '../src/activity-log-document.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(here, '../examples');

function sequenceDice(values) {
  let index = 0;
  const dice = { rollD6() { if (index >= values.length) throw new Error('exhausted'); return values[index++]; } };
  dice.roll2D6 = () => { const rolled = [dice.rollD6(), dice.rollD6()]; return { dice: rolled, total: rolled[0] + rolled[1] }; };
  return dice;
}

async function fixture() {
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  const ship = importShipDocument(await readFile(path.join(examples, 'Hawkeye.ship.json'), 'utf8'));
  const campaign = createCampaignDocument({
    id: 'published-view', name: 'Sea of Suns', time: { year: 4800, dayOfYear: 106, secondsOfDay: 0 },
    location: { systemId: 'cinder', systemName: 'Cinder', worldId: 'cinder-main', worldName: 'Cinder' },
    characters: [character], ships: [ship], partyCharacterIds: [character.identity.id], activeShipId: ship.identity.id
  });
  const encounter = createEncounterDocument({
    campaign, character,
    opponent: { name: 'Raider', weaponKey: 'automatic-pistol', armor: 'jack', characteristics: { STR: 8, DEX: 9, END: 7, INT: 6 }, skills: { 'Automatic Pistol': 2 } },
    encounterKey: 'published', date: { year: 4800, dayOfYear: 106 }, range: 'medium', dice: sequenceDice([3, 3])
  });
  return { campaign, encounter };
}

test('the published view carries names, sides, positions and condition', async () => {
  const { encounter } = await fixture();
  const view = buildPublishedView(encounter, { campaignId: 'published-view' });

  // A fight that has not resolved a round yet is at round 0 played.
  assert.equal(view.round, 0);
  assert.equal(view.combatants.length, 2);
  const raider = view.combatants.find((entry) => entry.name === 'Raider');
  assert.equal(raider.side, 'opposition');
  assert.equal(raider.condition, 'active');
  assert.ok(Number.isInteger(raider.position.column));
});

test('the published view leaks nothing a player should not see', async () => {
  let { encounter } = await fixture();
  const raiderId = encounter.combatants.find((entry) => entry.side === 'opposition').id;
  encounter = setCombatantCover(encounter, { combatantId: raiderId, cover: 'cover' }).encounter;
  const view = buildPublishedView(encounter, { campaignId: 'published-view' });

  // Whatever else changes, none of this may appear anywhere in the payload.
  const serialised = JSON.stringify(view);
  for (const forbidden of ['characteristics', 'current', 'armor', 'cover', 'blowAllowance', 'blowsUsed', 'weaponKey', 'skills', 'firstBlood', 'surpriseDM', 'foldingStock', 'militaryExperience']) {
    assert.doesNotMatch(serialised, new RegExp(forbidden), `${forbidden} must not reach the published view`);
  }
  // And spot-check by value: the raider's characteristics are 8/9/7.
  for (const combatant of view.combatants) {
    assert.deepEqual(Object.keys(combatant).sort(), ['condition', 'id', 'name', 'playerCharacter', 'position', 'side', 'tokenLabel']);
  }
});

test('a downed combatant is visibly down, without saying by how much', async () => {
  const { encounter } = await fixture();
  const downed = {
    ...encounter,
    combatants: encounter.combatants.map((entry) => entry.side === 'opposition'
      ? { ...entry, status: 'unconscious', current: { STR: 0, DEX: 2, END: 0 } }
      : entry)
  };
  const view = buildPublishedView(downed, { campaignId: 'published-view' });
  const raider = view.combatants.find((entry) => entry.name === 'Raider');
  assert.equal(raider.condition, 'unconscious');
  assert.equal(JSON.stringify(view).includes('"STR"'), false);
});

test('the narration carries the round that just resolved', async () => {
  const { encounter } = await fixture();
  const target = encounter.combatants.find((entry) => entry.side === 'opposition');
  const result = resolveEncounterRound(encounter, {
    action: 'attack', targetId: target.id, date: { year: 4800, dayOfYear: 106 },
    dice: sequenceDice(Array.from({ length: 40 }, () => 3))
  });
  const view = buildPublishedView(result.encounter, { campaignId: 'published-view' });
  assert.ok(view.narration.length > 0, 'the round produced narration');
  assert.ok(view.narration.every((entry) => typeof entry.text === 'string' && entry.text.length > 0));
  const prose = view.narration.map((entry) => entry.text).join(' ');
  assert.match(prose, /attacks|hits|misses|moves|breaks/);

  // The referee's audit line carries the dice, every DM and the target number,
  // and the target number is the defender's armour. None of it may appear.
  for (const forbidden of ['2D', 'SKILL', 'CHAR', 'UNTRAINED', 'SITUATION', 'TOTAL', 'vs ', 'WOUND LOCATION', 'HIT ']) {
    assert.ok(!prose.includes(forbidden), `player narration must not contain "${forbidden}"`);
  }
  assert.doesNotMatch(prose, /\[\d\]/, 'no dice results');
});

test('the published campaign carries shared state and the ownership map', async () => {
  const { campaign } = await fixture();
  const published = buildPublishedCampaign(campaign, { publishedAt: 12345 });
  assert.equal(published.campaignId, 'published-view');
  assert.equal(published.name, 'Sea of Suns');
  assert.deepEqual(published.time, campaign.time);
  assert.deepEqual(published.ownership, { ownerUid: null, actors: {} });
  assert.equal(published.publishedAt, 12345);
  assert.equal(published.ship, null);
  // The party's character documents are not part of it.
  assert.equal(JSON.stringify(published).includes('Hawkeye'), false);
});

test('the published narration says what happened, not what was rolled', async () => {
  const { encounter } = await fixture();
  const target = encounter.combatants.find((entry) => entry.side === 'opposition');
  const result = resolveEncounterRound(encounter, {
    action: 'attack', targetId: target.id, date: { year: 4800, dayOfYear: 106 },
    dice: sequenceDice(Array.from({ length: 40 }, () => 6))
  });
  const view = buildPublishedView(result.encounter, { campaignId: 'published-view' });
  const prose = view.narration.map((entry) => entry.text).join(' ');

  // Fiction, not arithmetic.
  assert.match(prose, /hits|misses/);
  assert.doesNotMatch(prose, /\d/, 'no numbers at all in attack narration');
});

test('an unrecognised entry kind is dropped rather than published', async () => {
  const { encounter } = await fixture();
  const withMystery = {
    ...encounter,
    round: 2,
    history: [
      ...encounter.history,
      { round: 1, kind: 'referee-whisper', text: 'The raider has 3 END left and is bluffing.' }
    ]
  };
  const view = buildPublishedView(withMystery, { campaignId: 'published-view' });
  assert.equal(JSON.stringify(view).includes('bluffing'), false, 'unknown kinds fail closed');
});

test('the view carries several rounds so a player who looks away keeps them', async () => {
  let { encounter } = await fixture();
  const target = encounter.combatants.find((entry) => entry.side === 'opposition');
  // Three rounds of movement, which never resolves the fight.
  for (let round = 0; round < 3; round += 1) {
    encounter = resolveEncounterRound(encounter, {
      action: 'open', targetId: target.id, date: { year: 4800, dayOfYear: 106 },
      dice: sequenceDice(Array.from({ length: 60 }, () => 3))
    }).encounter;
  }
  const view = buildPublishedView(encounter, { campaignId: 'published-view', rounds: 4 });
  const rounds = new Set(view.narration.map((entry) => entry.round));
  assert.ok(rounds.size >= 2, 'more than the latest round is published');
  assert.ok(Math.max(...rounds) <= view.round);
});

test('the published campaign names the current encounter', async () => {
  const { campaign } = await fixture();
  const published = buildPublishedCampaign(campaign, { currentEncounterId: 'encounter-1' });
  // Players cannot list encounters: the encounter documents are referee-only
  // and Firestore does not return missing parents.
  assert.equal(published.currentEncounterId, 'encounter-1');
  assert.equal(buildPublishedCampaign(campaign).currentEncounterId, null);
});

// --- v0.65.0: the player's own character and the table's log ------------

test('the published character is the sheet in full, in the campaign envelope', async () => {
  const { campaign } = await fixture();
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  const published = buildPublishedCharacter(character, { campaignId: campaign.identity.id, ownerUid: 'uid-hawkeye', publishedAt: 99 });
  assert.equal(published.campaignId, 'published-view');
  assert.equal(published.characterId, character.identity.id);
  assert.equal(published.ownerUid, 'uid-hawkeye');
  assert.equal(published.publishedAt, 99);
  assert.equal(published.identity.name, 'Hawkeye');
  assert.deepEqual(published.characteristics, character.characteristics);
  assert.deepEqual(published.current, character.current);
  assert.deepEqual(published.skills, character.skills);
  assert.equal(published.finances.credits, character.finances.credits);
  assert.equal(published.history.length, character.history.length);
  // A copy, not a reference: publishing must never let a later edit of the
  // payload reach the referee's document.
  published.skills.Pilot = 9;
  assert.notEqual(character.skills.Pilot, 9);
  assert.throws(() => buildPublishedCharacter(null), TypeError);
});

function logWith(entries) {
  let log = createActivityLogDocument({ campaignId: 'published-view', name: 'log' });
  for (const entry of entries) log = appendActivityLogEntry(log, entry);
  return log;
}

test('the published log is an allowlist: combat arithmetic and referee bookkeeping stay home', () => {
  const log = logWith([
    { category: 'JUMP', message: 'Marisol jumps for Cinder.' },
    { category: 'COMBAT', message: 'Hawkeye / Rifle-1 / ROLL 2D [4] [5] = 9 / SKILL +1 / vs 8+ / HIT / WOUND LOCATION END' },
    { category: 'ROSTER', message: 'Raider placed from the roster with END 3.' },
    { category: 'SITUATION', message: 'The patron is lying about the cargo.' },
    { category: 'THREAD', message: 'Thread consequence: the port authority is now hostile.' },
    { category: 'SYSLOG', message: 'Autosaved.' },
    { category: 'TRADE', message: 'Sold 3 tons of textiles for Cr12,000.' }
  ]);
  const published = buildPublishedLog(log, { campaignId: 'published-view', uid: 'uid-a' });
  assert.deepEqual(published.entries.map((entry) => entry.category), ['JUMP', 'TRADE']);
  const serialised = JSON.stringify(published);
  for (const forbidden of ['ROLL 2D', 'vs 8+', 'WOUND LOCATION', 'END 3', 'lying', 'hostile', 'Autosaved', 'sourceActorId', 'sourceDocumentId']) {
    assert.ok(!serialised.includes(forbidden), `${forbidden} must not reach the published log`);
  }
  assert.ok(!PLAYER_LOG_CATEGORIES.includes('COMBAT'));
});

test('entries addressed to a player reach that player and nobody else', () => {
  const log = logWith([
    { category: 'SITUATION', message: 'A note slid under your door.', visibility: ACTIVITY_VISIBILITY.PLAYERS, audiencePlayerIds: ['uid-a'] },
    { category: 'SITUATION', message: 'Your contact winks at you.', visibility: ACTIVITY_VISIBILITY.PLAYERS, audiencePlayerIds: ['char-b'] },
    { category: 'SITUATION', message: 'The referee knows the truth.', visibility: ACTIVITY_VISIBILITY.REFEREE },
    { category: 'NAV', message: 'Course laid in.' }
  ]);
  const forA = buildPublishedLog(log, { uid: 'uid-a' });
  assert.deepEqual(forA.entries.map((entry) => entry.message), ['A note slid under your door.', 'Course laid in.']);
  assert.equal(forA.entries[0].addressed, true);
  // Addressed by the character they play, not only by account.
  const forB = buildPublishedLog(log, { uid: 'uid-b', ownedCharacterIds: ['char-b'] });
  assert.deepEqual(forB.entries.map((entry) => entry.message), ['Your contact winks at you.', 'Course laid in.']);
  for (const published of [forA, forB]) assert.ok(!JSON.stringify(published).includes('knows the truth'));
  assert.throws(() => buildPublishedLog(log, {}), TypeError);
});

test('the published log keeps only the most recent entries', () => {
  const log = logWith(Array.from({ length: 12 }, (_, index) => ({ category: 'NAV', message: `line ${index}` })));
  const published = buildPublishedLog(log, { uid: 'uid-a', limit: 5 });
  assert.equal(published.entries.length, 5);
  assert.equal(published.entries.at(-1).message, 'line 11');
});

test('the published ship is what the party knows: no account, no manifests', async () => {
  const ship = importShipDocument(await readFile(path.join(examples, 'Hawkeye.ship.json'), 'utf8'));
  const published = buildPublishedShip(ship);
  assert.equal(published.name, ship.identity.name);
  assert.equal(published.typeCode, 'S');
  assert.equal(published.jumpRating, 2);
  assert.equal(published.fuel.capacityTons, 40);
  assert.equal(published.cargo.capacityTons, 3);
  const serialised = JSON.stringify(published);
  for (const forbidden of ['finances', 'operatingAccount', 'cargoManifest', 'passengerManifest', 'crew']) {
    assert.ok(!serialised.includes(forbidden), `${forbidden} must not reach the published ship`);
  }
  const { campaign } = await fixture();
  assert.equal(buildPublishedCampaign(campaign, { ship }).ship.shipId, ship.identity.id);
});
