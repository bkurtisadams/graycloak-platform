import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { importCharacterDocument } from '../vendor/classic-traveller-rules/index.js';
import { createCampaignDocument } from '../src/campaign-document.js';
import {
  createEncounterDocument, startEncounterCombat, attemptEncounterEscape,
  declareEncounterAction, resolveDeclaredRound, resolveEncounterMorale,
  setEncounterPartyMoraleEnforcement, setCombatantStatus
} from '../src/encounter-document.js';

const here = path.dirname(fileURLToPath(import.meta.url));
function sequenceDice(values) {
  let index = 0;
  const dice = { rollD6() { if (index >= values.length) throw new Error('dice sequence exhausted'); return values[index++]; } };
  dice.roll2D6 = () => { const rolled = [dice.rollD6(), dice.rollD6()]; return { dice: rolled, total: rolled[0] + rolled[1] }; };
  return dice;
}

async function fixture({ partySize = 1, weaponKey = 'laser-rifle', contactStarted = false } = {}) {
  const base = importCharacterDocument(await readFile(path.join(here, '../examples/Hawkeye.character.json'), 'utf8'));
  const characters = Array.from({ length: partySize }, (_, index) => ({
    ...structuredClone(base), identity: { ...base.identity, id: `${base.identity.id}-${index + 1}`, name: index ? `Scout ${index + 1}` : 'Hawkeye' }
  }));
  const campaign = createCampaignDocument({
    id: 'campaign-procedure-test', name: 'Sea of Suns', time: { year: 4800, dayOfYear: 200, secondsOfDay: 0 },
    location: { systemId: 'calder', systemName: 'Calder', worldId: 'calder-main', worldName: 'Calder' },
    characters, partyCharacterIds: characters.map((entry) => entry.identity.id)
  });
  const encounter = createEncounterDocument({
    campaign, characters, partyLoadouts: Object.fromEntries(characters.map((entry) => [entry.identity.id, { weaponKey }])),
    opponent: { name: 'Guard', weaponKey: 'automatic-pistol' }, encounterKey: 'procedure',
    date: { year: 4800, dayOfYear: 200 }, range: 'medium', contactStarted, dice: sequenceDice([3, 3])
  });
  return { encounter, characters };
}

test('Book 1 encounter decisions occur before combat declarations', async () => {
  const { encounter } = await fixture();
  const party = encounter.combatants.find((entry) => entry.side === 'party');
  assert.throws(() => declareEncounterAction(encounter, { action: 'wait', actorId: party.id }), /choose FIGHT or attempt ESCAPE/);
  const escaped = attemptEncounterEscape(encounter, {
    date: { year: 4800, dayOfYear: 200 }, dice: sequenceDice([4, 4])
  });
  assert.equal(escaped.escaped, true, '8 + medium range DM 1 reaches the printed 9+ target');
  assert.equal(escaped.encounter.status, 'escaped');
});

test('strict round resolution never invents an undeclared attack', async () => {
  const { encounter } = await fixture();
  let fight = startEncounterCombat(encounter).encounter;
  const party = fight.combatants.find((entry) => entry.side === 'party');
  const foe = fight.combatants.find((entry) => entry.side === 'opposition');
  fight = declareEncounterAction(fight, { action: 'wait', actorId: party.id }).encounter;
  assert.throws(() => resolveDeclaredRound(fight, { date: { year: 4800, dayOfYear: 200 }, dice: sequenceDice([]) }), /declarations required for Guard/);
  fight = declareEncounterAction(fight, { action: 'wait', actorId: foe.id }).encounter;
  const resolved = resolveDeclaredRound(fight, { date: { year: 4800, dayOfYear: 200 }, dice: sequenceDice([]) });
  assert.equal(resolved.entries.some((entry) => entry.kind === 'attack'), false);
});

test('Book 1 surprise continues through quiet volleys and ends on an unsilenced shot', async () => {
  const { encounter } = await fixture({ contactStarted: true });
  let fight = structuredClone(encounter);
  fight.surprise = { ...fight.surprise, surpriseSideId: 'party', surprisedSideId: 'opposition', active: true, volley: 1 };
  const party = fight.combatants.find((entry) => entry.side === 'party');
  const foe = fight.combatants.find((entry) => entry.side === 'opposition');
  fight = declareEncounterAction(fight, { action: 'attack', actorId: party.id, targetId: foe.id }).encounter;
  fight = resolveDeclaredRound(fight, { date: { year: 4800, dayOfYear: 200 }, dice: sequenceDice([1, 1]) }).encounter;
  assert.equal(fight.surprise.active, true);
  assert.equal(fight.surprise.volley, 2);
  fight.combatants.find((entry) => entry.id === party.id).weaponKey = 'rifle';
  fight = declareEncounterAction(fight, { action: 'attack', actorId: party.id, targetId: foe.id }).encounter;
  fight = resolveDeclaredRound(fight, { date: { year: 4800, dayOfYear: 200 }, dice: sequenceDice([1, 1]) }).encounter;
  assert.equal(fight.surprise.active, false);
  assert.equal(fight.history.at(-1).detail.reason, 'unsilenced-gunshot');
});

test('party morale is a visible gate and PC withdrawal is optional', async () => {
  const { encounter } = await fixture({ partySize: 4, contactStarted: true });
  let fight = setCombatantStatus(encounter, { combatantId: encounter.combatants[0].id, status: 'unconscious' }).encounter;
  for (const combatant of fight.combatants.filter((entry) => entry.status === 'active')) {
    fight = declareEncounterAction(fight, { action: 'wait', actorId: combatant.id }).encounter;
  }
  fight = resolveDeclaredRound(fight, { date: { year: 4800, dayOfYear: 200 }, dice: sequenceDice([]) }).encounter;
  assert.deepEqual(fight.engagement.moraleDue.map((entry) => entry.side), ['party']);
  const advisory = resolveEncounterMorale(fight, { side: 'party', date: { year: 4800, dayOfYear: 200 }, dice: sequenceDice([1, 1]) });
  assert.equal(advisory.encounter.status, 'active');
  assert.match(advisory.entry.text, /REFEREE DECIDES PLAYER RESPONSE/);

  const enforced = setEncounterPartyMoraleEnforcement(fight, true).encounter;
  const routed = resolveEncounterMorale(enforced, { side: 'party', date: { year: 4800, dayOfYear: 200 }, dice: sequenceDice([1, 1]) });
  assert.equal(routed.encounter.status, 'defeat');
  assert.equal(routed.encounter.outcome.reason, 'morale');
});
