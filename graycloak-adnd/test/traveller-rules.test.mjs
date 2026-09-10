// traveller-rules.test.mjs
//
// Exercises the deployed ruleset against the Firestore emulator. These are the
// assertions that matter for multiplayer Traveller: a player writes their own
// declaration and nothing else, and never reads the encounter document, which
// carries enemy characteristics and wounds.
//
// v12 adds the per-player documents beneath the seat — the character sheet
// and the filtered log — which only the seated account and the referee read.
//
// Requires the emulator:  firebase emulators:start --only firestore
// Skipped automatically when it is not running, so `npm test` still passes
// without it.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} from '@firebase/rules-unit-testing';

const RULES = fs.readFileSync(fileURLToPath(new URL('../firestore.rules', import.meta.url)), 'utf8');
const PROJECT_ID = 'graycloaks-campaign-corner';
const HOST = '127.0.0.1';
const PORT = 8080;

const REFEREE = 'uid-referee';
const PLAYER = 'uid-player';
const SECOND = 'uid-second';
const OUTSIDER = 'uid-outsider';
const CAMPAIGN = 'sea-of-suns';
const ENCOUNTER = 'encounter-1';
const PC = 'char-hawkeye';
const FOE = 'foe-raider';

// Check that the Firestore emulator specifically is listening, not merely that
// something answers on the port. A static file server on 8080 will happily
// return 200 here and then fail the suite with an HTML error page.
async function emulatorRunning() {
  try {
    const response = await fetch(`http://${HOST}:${PORT}/emulator/v1/projects/${PROJECT_ID}:ruleCoverage.html`);
    if (!response.ok) return false;
    const body = await response.text();
    return !body.includes('Unsupported method') && response.headers.get('content-type') !== null;
  } catch {
    return false;
  }
}

const available = await emulatorRunning();

test('Traveller multiplayer rules', { skip: available ? false : `Firestore emulator not answering on ${HOST}:${PORT} (is something else using that port?)` }, async (t) => {
  // The emulator runs in single-project mode, so a test-only project id logs a
  // warning on every request and, in some emulator versions, is routed to the
  // configured project anyway. Matching it keeps the log clean and the
  // namespace unambiguous; the suite clears its own data at the end regardless.
  const env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES, host: HOST, port: PORT }
  });
  await env.clearFirestore();

  // Seed the campaign and encounter with rules disabled, as the referee's
  // client would have created them.
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`travellerCampaigns/${CAMPAIGN}`).set({
      name: 'Sea of Suns',
      ownership: { ownerUid: REFEREE, actors: { [PC]: PLAYER } }
    });
    await db.doc(`travellerCampaigns/${CAMPAIGN}/players/${PLAYER}`).set({ seatedAt: 1 });
    await db.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}`).set({
      round: 1,
      combatants: [{ id: FOE, current: { STR: 7, DEX: 7, END: 7 } }]
    });
    await db.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/view/current`).set({
      round: 1,
      combatants: [{ id: FOE, name: 'Raider', side: 'opposition', condition: 'active' }]
    });
  });

  const referee = env.authenticatedContext(REFEREE).firestore();
  const player = env.authenticatedContext(PLAYER).firestore();
  const second = env.authenticatedContext(SECOND).firestore();
  const outsider = env.authenticatedContext(OUTSIDER).firestore();
  const anonymous = env.unauthenticatedContext().firestore();

  await t.test('the campaign is readable at the table and nowhere else', async () => {
    await assertSucceeds(referee.doc(`travellerCampaigns/${CAMPAIGN}`).get());
    await assertSucceeds(player.doc(`travellerCampaigns/${CAMPAIGN}`).get());
    await assertFails(outsider.doc(`travellerCampaigns/${CAMPAIGN}`).get());
    await assertFails(anonymous.doc(`travellerCampaigns/${CAMPAIGN}`).get());
  });

  await t.test('only the referee writes the campaign', async () => {
    await assertSucceeds(referee.doc(`travellerCampaigns/${CAMPAIGN}`).update({ name: 'Sea of Suns II' }));
    await assertFails(player.doc(`travellerCampaigns/${CAMPAIGN}`).update({ name: 'Mine now' }));
    // Including the ownership map: a player cannot grant themselves an actor.
    await assertFails(player.doc(`travellerCampaigns/${CAMPAIGN}`).update({
      ownership: { ownerUid: REFEREE, actors: { [PC]: PLAYER, [FOE]: PLAYER } }
    }));
  });

  await t.test('the encounter document is referee-only: enemy detail never reaches a player', async () => {
    await assertSucceeds(referee.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}`).get());
    await assertFails(player.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}`).get());
    await assertFails(player.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}`).update({ round: 99 }));
  });

  await t.test('the published view is readable at the table, writable by the referee', async () => {
    await assertSucceeds(player.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/view/current`).get());
    await assertFails(outsider.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/view/current`).get());
    await assertSucceeds(referee.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/view/current`).set({ round: 2 }));
    await assertFails(player.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/view/current`).set({ round: 3 }));
  });

  await t.test('a player declares for their own combatant', async () => {
    await assertSucceeds(player.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/declarations/${PC}`).set({
      uid: PLAYER, actorId: PC, action: 'attack', targetId: FOE, round: 1
    }));
  });

  await t.test('a player cannot declare for a combatant they do not own', async () => {
    // Absent from the ownership map entirely.
    await assertFails(player.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/declarations/${FOE}`).set({
      uid: PLAYER, actorId: FOE, action: 'wait', targetId: null, round: 1
    }));
  });

  await t.test('a player cannot declare for a combatant owned by someone else', async () => {
    // Present in the map, owned by another account: the denial must come from
    // the comparison, not from indexing a missing key.
    await env.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(`travellerCampaigns/${CAMPAIGN}`).update({
        'ownership.actors.other-pc': OUTSIDER
      });
    });
    await assertFails(player.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/declarations/other-pc`).set({
      uid: PLAYER, actorId: 'other-pc', action: 'attack', targetId: FOE, round: 1
    }));
  });

  await t.test('the actorId on a declaration must match the document it is written to', async () => {
    await assertFails(player.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/declarations/${PC}`).set({
      uid: PLAYER, actorId: FOE, action: 'attack', targetId: FOE, round: 1
    }));
  });

  await t.test('a player cannot forge the uid on a declaration', async () => {
    await assertFails(player.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/declarations/${PC}-forged`).set({
      uid: REFEREE, actorId: PC, action: 'attack', targetId: FOE, round: 1
    }));
  });

  await t.test('a declaration cannot be edited after it is made', async () => {
    await assertFails(player.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/declarations/${PC}`).update({ action: 'evade' }));
  });

  await t.test('the referee clears declarations; players cannot', async () => {
    await assertFails(player.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/declarations/${PC}`).delete());
    await assertSucceeds(referee.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/declarations/${PC}`).delete());
  });

  await t.test('a player submits immutable movement only for their owned token', async () => {
    const path = `travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/moves/move-1`;
    await assertSucceeds(player.doc(path).set({
      uid: PLAYER, encounterId: ENCOUNTER, actorId: PC, column: 42, row: 87, pace: 'walk', round: 1, movedAt: 1000
    }));
    await assertFails(player.doc(path).update({ column: 43 }));
    await assertFails(player.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/moves/move-foe`).set({
      uid: PLAYER, encounterId: ENCOUNTER, actorId: FOE, column: 1, row: 1, pace: 'walk', round: 1, movedAt: 1001
    }));
    await assertFails(player.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/moves/move-bad`).set({
      uid: PLAYER, encounterId: ENCOUNTER, actorId: PC, column: 1001, row: 1, pace: 'walk', round: 1, movedAt: 1002
    }));
    await assertFails(player.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/moves/move-teleport`).set({
      uid: PLAYER, encounterId: ENCOUNTER, actorId: PC, column: 1, row: 1, pace: 'teleport', round: 1, movedAt: 1003
    }));
    await assertFails(player.doc(path).delete());
    await assertSucceeds(referee.doc(path).delete());
  });

  await t.test('canvas presence is readable at the table and writable only as oneself', async () => {
    const path = `travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/presence/${PLAYER}`;
    await assertSucceeds(player.doc(path).set({ uid: PLAYER, selectedIds: [PC], targetIds: [FOE], updatedAt: 1000 }));
    await assertSucceeds(referee.doc(path).get());
    await assertFails(player.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/presence/${OUTSIDER}`).set({
      uid: OUTSIDER, selectedIds: [], targetIds: [], updatedAt: 1001
    }));
    await assertFails(outsider.doc(path).get());
  });

  // --- v12: the player's own documents beneath the seat --------------------
  // The referee publishes each character in full to the account that plays
  // it, and each seated account a log filtered to table knowledge. Firestore
  // cannot filter fields, so the split between players is by path.

  const SHEET = `travellerCampaigns/${CAMPAIGN}/players/${PLAYER}/characters/${PC}`;
  const LOG = `travellerCampaigns/${CAMPAIGN}/players/${PLAYER}/log/current`;

  await t.test('the referee publishes a player their sheet and log', async () => {
    await assertSucceeds(referee.doc(SHEET).set({
      campaignId: CAMPAIGN, characterId: PC, ownerUid: PLAYER,
      identity: { name: 'Hawkeye' }, characteristics: { STR: 10, DEX: 11, END: 5 }, current: { STR: 10, DEX: 11, END: 3 }
    }));
    await assertSucceeds(referee.doc(LOG).set({
      campaignId: CAMPAIGN, uid: PLAYER, entries: [{ category: 'JUMP', message: 'Marisol jumps for Cinder.' }]
    }));
    await assertSucceeds(referee.doc(SHEET).get());
    await assertSucceeds(referee.doc(LOG).get());
  });

  await t.test('a player reads their own sheet and log', async () => {
    await assertSucceeds(player.doc(SHEET).get());
    await assertSucceeds(player.doc(LOG).get());
    // And can list their own characters, which is how the page finds them.
    await assertSucceeds(player.collection(`travellerCampaigns/${CAMPAIGN}/players/${PLAYER}/characters`).get());
  });

  await t.test('another seated player cannot read them', async () => {
    // Seated, so at the table for everything the table shares — and still
    // shut out of a document that sits beneath someone else's seat.
    await env.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(`travellerCampaigns/${CAMPAIGN}/players/${SECOND}`).set({ seatedAt: 2 });
    });
    await assertSucceeds(second.doc(`travellerCampaigns/${CAMPAIGN}`).get());
    await assertFails(second.doc(SHEET).get());
    await assertFails(second.doc(LOG).get());
    await assertFails(second.collection(`travellerCampaigns/${CAMPAIGN}/players/${PLAYER}/characters`).get());
    await assertFails(outsider.doc(SHEET).get());
    await assertFails(anonymous.doc(LOG).get());
  });

  await t.test('a player cannot write beneath their own seat', async () => {
    await assertFails(player.doc(SHEET).update({ 'current.END': 5 }));
    await assertFails(player.doc(SHEET).set({ campaignId: CAMPAIGN, characterId: PC, ownerUid: PLAYER, skills: { Gunnery: 9 } }));
    await assertFails(player.doc(LOG).update({ entries: [] }));
    await assertFails(player.doc(`travellerCampaigns/${CAMPAIGN}/players/${PLAYER}/characters/${FOE}`).set({ ownerUid: PLAYER }));
    await assertFails(player.doc(SHEET).delete());
  });

  await t.test('losing the seat loses the documents, in the rule and not only in the client', async () => {
    const secondSheet = `travellerCampaigns/${CAMPAIGN}/players/${SECOND}/characters/other-pc`;
    await assertSucceeds(referee.doc(secondSheet).set({ campaignId: CAMPAIGN, characterId: 'other-pc', ownerUid: SECOND }));
    await assertSucceeds(second.doc(secondSheet).get());
    // The referee unseats them; the client also deletes the subtree, but the
    // rule must not depend on that having happened.
    await assertSucceeds(referee.doc(`travellerCampaigns/${CAMPAIGN}/players/${SECOND}`).delete());
    await assertFails(second.doc(secondSheet).get());
    await assertSucceeds(referee.doc(secondSheet).delete());
  });

  await t.test('an outsider is shut out entirely', async () => {
    await assertFails(outsider.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/declarations/${PC}`).set({
      uid: OUTSIDER, actorId: PC, action: 'attack', targetId: FOE, round: 1
    }));
    await assertFails(outsider.doc(`travellerCampaigns/${CAMPAIGN}/encounters/${ENCOUNTER}/view/current`).get());
    await assertFails(outsider.doc(`travellerCampaigns/${CAMPAIGN}/players/${OUTSIDER}`).set({ seatedAt: 1 }));
    await assertFails(outsider.doc(`travellerCampaigns/${CAMPAIGN}/players/${OUTSIDER}/characters/${PC}`).set({ ownerUid: OUTSIDER }));
  });

  await t.test('the existing AD&D rules still hold', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('campaigns/adnd-1').set({ ownerUid: REFEREE, worldTick: 10, worldRevision: 1 });
      await context.firestore().doc('characters/adnd-pc').set({
        ownerUid: PLAYER, campaignId: 'adnd-1', documentType: 'actor', type: 'character',
        runtime: { lastResolvedTick: 5, availableAtTick: null, activityId: null }
      });
    });
    // World authority fields stay server-side.
    await assertFails(referee.doc('campaigns/adnd-1').update({ worldTick: 11 }));
    await assertSucceeds(referee.doc('campaigns/adnd-1').update({ name: 'renamed' }));
    // Actor authority fields are immutable to every browser, owner included.
    await assertFails(player.doc('characters/adnd-pc').update({ runtime: { lastResolvedTick: 9, availableAtTick: null, activityId: null } }));
    await assertFails(player.doc('characters/adnd-pc').update({ currentLocation: 'hex-0101' }));
    await assertSucceeds(player.doc('characters/adnd-pc').update({ notes: 'still fine' }));
    // The trusted-runtime collections remain closed.
    await assertFails(referee.doc('activities/a1').get());
    await assertFails(referee.doc('events/e1').get());
  });

  await env.clearFirestore();
  await env.cleanup();
});
