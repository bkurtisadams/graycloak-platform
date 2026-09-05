import test from 'node:test';
import assert from 'node:assert/strict';

import { createMemoryStorage } from '../src/document-registry.js';
import {
  PLAYER_ROLES,
  createPlayerSession,
  createPlayerSessionStore,
  playerCanControlCharacter,
  setPlayerViewedCharacter
} from '../src/player-session.js';
import {
  ACTIVITY_VISIBILITY,
  appendActivityLogEntry,
  createActivityLogDocument,
  importActivityLogDocument,
  visibleActivityLogEntries
} from '../src/activity-log-document.js';
import { createMemoryCampaignStateStore } from '../src/campaign-state-store.js';
import { createCampaignCommandIntent, createCampaignCommandService } from '../src/campaign-command.js';

function session(playerId, characterId, role = PLAYER_ROLES.PLAYER) {
  return createPlayerSession({
    campaignId: 'campaign-multiplayer',
    playerId,
    displayName: playerId.toUpperCase(),
    role,
    controlledCharacterIds: characterId ? [characterId] : [],
    viewedCharacterId: characterId
  });
}

test('player character focus is per-client state rather than shared campaign state', () => {
  const storage = createMemoryStorage();
  const sessions = createPlayerSessionStore({ storage });
  const first = sessions.put(createPlayerSession({
    campaignId: 'campaign-multiplayer', playerId: 'player-one', displayName: 'PLAYER ONE', role: PLAYER_ROLES.PLAYER,
    controlledCharacterIds: ['char-hawkeye', 'char-mara'], viewedCharacterId: 'char-hawkeye'
  }));
  const second = sessions.put(session('player-two', 'char-river'));

  const changed = setPlayerViewedCharacter(first, 'char-mara', {
    partyCharacterIds: ['char-hawkeye', 'char-mara', 'char-river']
  });
  sessions.put(changed);
  assert.equal(sessions.get('campaign-multiplayer', 'player-one').viewedCharacterId, 'char-mara');
  assert.equal(sessions.get('campaign-multiplayer', 'player-two').viewedCharacterId, 'char-river');
  assert.equal(second.viewedCharacterId, 'char-river');
});

test('a player controls assigned characters while referee and spectator roles remain distinct', () => {
  const player = session('player-one', 'char-hawkeye');
  const referee = session('referee-one', null, PLAYER_ROLES.REFEREE);
  const spectator = session('spectator-one', null, PLAYER_ROLES.SPECTATOR);
  assert.equal(playerCanControlCharacter(player, 'char-hawkeye'), true);
  assert.equal(playerCanControlCharacter(player, 'char-river'), false);
  assert.equal(playerCanControlCharacter(referee, 'char-river'), true);
  assert.equal(playerCanControlCharacter(spectator, 'char-hawkeye'), false);
});

test('activity log visibility produces public, addressed-player, and referee views', () => {
  let log = createActivityLogDocument({ campaignId: 'campaign-multiplayer' });
  log = appendActivityLogEntry(log, { category: 'NAV', message: 'Ship enters Aster', createdAt: '2026-09-05T00:00:00.000Z' });
  log = appendActivityLogEntry(log, {
    category: 'NOTE', message: 'Hawkeye receives a private message', createdAt: '2026-09-05T00:00:01.000Z',
    visibility: ACTIVITY_VISIBILITY.PLAYERS, audiencePlayerIds: ['player-one']
  });
  log = appendActivityLogEntry(log, {
    category: 'REFEREE', message: 'Patron motive is false', createdAt: '2026-09-05T00:00:02.000Z',
    visibility: ACTIVITY_VISIBILITY.REFEREE
  });

  const playerOne = visibleActivityLogEntries(log, session('player-one', 'char-hawkeye'));
  const playerTwo = visibleActivityLogEntries(log, session('player-two', 'char-river'));
  const referee = visibleActivityLogEntries(log, session('referee-one', null, PLAYER_ROLES.REFEREE));
  assert.deepEqual(playerOne.map((entry) => entry.message), ['Ship enters Aster', 'Hawkeye receives a private message']);
  assert.deepEqual(playerTwo.map((entry) => entry.message), ['Ship enters Aster']);
  assert.equal(referee.length, 3);
});

test('Activity Log Document v1 migrates legacy entries to public v2 entries', () => {
  const migrated = importActivityLogDocument({
    documentType: 'graycloak-traveller-activity-log', schemaVersion: 1,
    identity: { id: 'log-legacy', name: 'Legacy Log' }, campaignId: 'campaign-multiplayer',
    entries: [{
      id: 'entry-1', sequence: 1, category: 'NAV', message: 'Legacy event', dateLabel: '001-4800',
      createdAt: '2026-09-05T00:00:00.000Z', sourceDocumentId: null, sourceActorId: null
    }]
  });
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.entries[0].visibility, ACTIVITY_VISIBILITY.PUBLIC);
  assert.deepEqual(migrated.entries[0].audiencePlayerIds, []);
});

test('two clients share revisioned state, reject stale writes, and receive committed snapshots', () => {
  const store = createMemoryCampaignStateStore();
  store.seed('campaign-multiplayer', { shipAccountCr: 0 });
  const seen = [];
  store.subscribe('campaign-multiplayer', (snapshot) => seen.push(snapshot.revision));
  const service = createCampaignCommandService({
    store,
    definitions: {
      creditShip: {
        normalizeChoices(choices) {
          const amountCr = Number(choices.amountCr);
          if (!Number.isInteger(amountCr) || amountCr < 1) throw new TypeError('amountCr must be positive');
          return { amountCr };
        },
        execute({ state, choices }) {
          return { ...state, shipAccountCr: state.shipAccountCr + choices.amountCr };
        }
      }
    }
  });
  const first = session('player-one', 'char-hawkeye');
  const second = session('player-two', 'char-river');
  const command = (commandId, expectedRevision, actorId, amountCr) => createCampaignCommandIntent({
    commandId, campaignId: 'campaign-multiplayer', expectedRevision, type: 'creditShip', actorId,
    choices: { amountCr, claimedFinalBalance: 999999 }
  });

  const one = service.execute(command('command-one', 0, 'char-hawkeye', 10), { session: first });
  const stale = service.execute(command('command-two', 0, 'char-river', 5), { session: second });
  const retry = service.execute(command('command-three', 1, 'char-river', 5), { session: second });
  const duplicate = service.execute(command('command-one', 0, 'char-hawkeye', 10), { session: first });

  assert.equal(one.status, 'committed');
  assert.equal(stale.code, 'stale');
  assert.equal(retry.status, 'committed');
  assert.equal(duplicate.status, 'already-committed');
  assert.equal(store.read('campaign-multiplayer').state.shipAccountCr, 15);
  assert.deepEqual(seen, [0, 1, 2]);
});

test('campaign command service rejects spectators and unowned actors', () => {
  const store = createMemoryCampaignStateStore({ 'campaign-multiplayer': { count: 0 } });
  const service = createCampaignCommandService({ store, definitions: { increment: { execute: ({ state }) => ({ count: state.count + 1 }) } } });
  const intent = (actorId) => createCampaignCommandIntent({ commandId: `cmd-${actorId}`, campaignId: 'campaign-multiplayer', expectedRevision: 0, type: 'increment', actorId });
  assert.equal(service.execute(intent('char-river'), { session: session('player-one', 'char-hawkeye') }).code, 'forbidden');
  assert.equal(service.execute(intent('char-hawkeye'), { session: session('spectator-one', null, PLAYER_ROLES.SPECTATOR) }).code, 'forbidden');
  assert.equal(store.read('campaign-multiplayer').revision, 0);
});
