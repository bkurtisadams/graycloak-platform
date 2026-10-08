// odd-rules.test.mjs — slice 5, step 3 (Oct 2026)
//
// OD&D online fights against the Firestore emulator. What matters: no
// browser reads a fight's state (the dice, enemy hit points) or its action
// record; a player reads only his own view and feed, and only while he is in
// the fight; nobody but the server writes anything.
//
// Requires the emulator (test-rules.bat starts it). Skipped when it is not
// running, so `npm test` still passes without it.

import test from 'node:test';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

const RULES = fs.readFileSync(fileURLToPath(new URL('../firestore.rules', import.meta.url)), 'utf8');
const PROJECT_ID = 'graycloaks-campaign-corner';
const HOST = '127.0.0.1';
const PORT = 8080;

const REFEREE = 'uid-referee';
const KURT = 'uid-kurt';
const BOB = 'uid-bob';
const OUTSIDER = 'uid-outsider';
const CAMP = 'odd-camp';
const FIGHT = 'fight-1';
const F = `oddCampaigns/${CAMP}/fights/${FIGHT}`;

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

test('OD&D online fight rules', { skip: available ? false : `Firestore emulator not answering on ${HOST}:${PORT}` }, async (t) => {
  const env = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: RULES, host: HOST, port: PORT } });
  await env.clearFirestore();

  // What the odd functions write (admin SDK, so rules disabled here).
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`oddCampaigns/${CAMP}`).set({ refereeUid: REFEREE, system: 'odd' });
    await db.doc(F).set({ rev: 3, step: 'move-A', players: [KURT, BOB], waitingOn: [KURT] });
    await db.doc(`${F}/server/state`).set({ rngState: { s: 12345 }, figures: [{ id: 3, hp: 5, maxHp: 5 }] });
    await db.doc(`${F}/actions/00000003`).set({ rev: 3, uid: KURT, action: { type: 'move' } });
    for (const who of ['referee', KURT, BOB]) {
      await db.doc(`${F}/views/${who}`).set({ rev: 3 });
      await db.doc(`${F}/feeds/${who}/entries/00000003`).set({ rev: 3, events: [] });
      await db.doc(`${F}/chat/${who}/entries/c1`).set({ id: 'c1', text: 'hello' });
    }
    await db.doc(`oddCampaigns/${CAMP}/fights/fight-2`).set({ rev: 1, players: [BOB] });
  });

  const referee = env.authenticatedContext(REFEREE).firestore();
  const kurt = env.authenticatedContext(KURT).firestore();
  const bob = env.authenticatedContext(BOB).firestore();
  const outsider = env.authenticatedContext(OUTSIDER).firestore();
  const anonymous = env.unauthenticatedContext().firestore();

  await t.test('the campaign is the referee\'s to read', async () => {
    await assertSucceeds(referee.doc(`oddCampaigns/${CAMP}`).get());
    await assertFails(kurt.doc(`oddCampaigns/${CAMP}`).get());
    await assertFails(outsider.doc(`oddCampaigns/${CAMP}`).get());
    await assertFails(anonymous.doc(`oddCampaigns/${CAMP}`).get());
  });

  await t.test('before any fight opens it, the GCC campaign\'s owner is the referee (pass 3)', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.doc('campaigns/gcc-only').set({ ownerUid: KURT, name: 'Kurt\'s OD&D', system: 'odd' });
      await db.doc('oddCampaigns/gcc-only/fights/f1').set({ rev: 1, players: [] });
    });
    await assertSucceeds(kurt.collection('oddCampaigns/gcc-only/fights').get());
    await assertFails(bob.collection('oddCampaigns/gcc-only/fights').get());
    await assertFails(outsider.doc('oddCampaigns/gcc-only/fights/f1').get());
  });

  await t.test('the game (pass 3): members read it, its presence and their own lobby chat; co-referees are referees', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.doc('oddCampaigns/game1').set({ refereeUid: REFEREE, referees: [KURT], members: [REFEREE, KURT, BOB], joinCode: 'ABCD1234' });
      await db.doc('oddCampaigns/game1/presence/' + BOB).set({ seen: 1 });
      await db.doc(`oddCampaigns/game1/chat/${BOB}/entries/c1`).set({ text: 'hi' });
      await db.doc('oddCampaigns/game1/chat/referee/entries/c1').set({ text: 'hi' });
      await db.doc('oddCampaigns/game1/fights/f9').set({ rev: 1, players: [] });
    });
    await assertSucceeds(bob.doc('oddCampaigns/game1').get());
    await assertFails(outsider.doc('oddCampaigns/game1').get());
    await assertSucceeds(bob.doc('oddCampaigns/game1/presence/' + BOB).get());
    await assertFails(outsider.doc('oddCampaigns/game1/presence/' + BOB).get());
    await assertSucceeds(bob.collection(`oddCampaigns/game1/chat/${BOB}/entries`).get());
    await assertFails(bob.collection('oddCampaigns/game1/chat/referee/entries').get());
    await assertSucceeds(kurt.collection('oddCampaigns/game1/chat/referee/entries').get(), 'a co-referee reads the referee\'s copy');
    await assertSucceeds(kurt.collection('oddCampaigns/game1/fights').get(), 'and lists every fight');
    await assertFails(bob.doc('oddCampaigns/game1').update({ members: [BOB] }));
    await assertFails(bob.doc('oddCampaigns/game1/presence/' + BOB).set({ seen: 2 }));
  });

  await t.test('a fight header is read by the referee and the players in it', async () => {
    await assertSucceeds(referee.doc(F).get());
    await assertSucceeds(kurt.doc(F).get());
    await assertFails(kurt.doc(`oddCampaigns/${CAMP}/fights/fight-2`).get());
    await assertFails(outsider.doc(F).get());
    await assertFails(anonymous.doc(F).get());
  });

  await t.test('a player lists his own fights, not the campaign\'s', async () => {
    const fights = (db) => db.collection(`oddCampaigns/${CAMP}/fights`);
    await assertSucceeds(fights(kurt).where('players', 'array-contains', KURT).get());
    await assertSucceeds(fights(bob).where('players', 'array-contains', BOB).get());
    await assertFails(fights(kurt).get());
    await assertSucceeds(fights(referee).get());
  });

  await t.test('nobody but the server reads the fight state or the action record', async () => {
    for (const db of [referee, kurt, bob, outsider]) {
      await assertFails(db.doc(`${F}/server/state`).get());
      await assertFails(db.doc(`${F}/actions/00000003`).get());
    }
  });

  await t.test('a player reads his own view and feed only', async () => {
    await assertSucceeds(kurt.doc(`${F}/views/${KURT}`).get());
    await assertSucceeds(kurt.collection(`${F}/feeds/${KURT}/entries`).get());
    await assertFails(kurt.doc(`${F}/views/${BOB}`).get());
    await assertFails(kurt.doc(`${F}/views/referee`).get());
    await assertFails(kurt.collection(`${F}/feeds/${BOB}/entries`).get());
    await assertFails(kurt.collection(`${F}/feeds/referee/entries`).get());
    await assertSucceeds(kurt.collection(`${F}/chat/${KURT}/entries`).get());
    await assertFails(kurt.collection(`${F}/chat/${BOB}/entries`).get());
    await assertFails(kurt.collection(`${F}/chat/referee/entries`).get());
    await assertSucceeds(referee.collection(`${F}/chat/${BOB}/entries`).get());
    await assertFails(outsider.doc(`${F}/views/${OUTSIDER}`).get());
  });

  await t.test('the referee reads every view and feed', async () => {
    for (const who of ['referee', KURT, BOB]) {
      await assertSucceeds(referee.doc(`${F}/views/${who}`).get());
      await assertSucceeds(referee.collection(`${F}/feeds/${who}/entries`).get());
    }
  });

  await t.test('a player taken out of the fight loses his view', async () => {
    await env.withSecurityRulesDisabled((context) => context.firestore().doc(F).update({ players: [KURT] }));
    await assertFails(bob.doc(`${F}/views/${BOB}`).get());
    await assertFails(bob.collection(`${F}/chat/${BOB}/entries`).get());
    await assertFails(bob.doc(F).get());
  });

  await t.test('browsers write nothing', async () => {
    for (const db of [referee, kurt]) {
      await assertFails(db.doc(`oddCampaigns/${CAMP}`).set({ refereeUid: KURT }));
      await assertFails(db.doc(F).update({ rev: 99 }));
      await assertFails(db.doc(`${F}/views/${KURT}`).set({ rev: 99 }));
      await assertFails(db.doc(`${F}/feeds/${KURT}/entries/00000099`).set({ rev: 99 }));
      await assertFails(db.doc(`${F}/chat/${KURT}/entries/forged`).set({ text: 'forged' }));
      await assertFails(db.doc(`${F}/server/state`).set({ rngState: { s: 1 } }));
      await assertFails(db.doc(`${F}/actions/00000099`).set({ rev: 99 }));
    }
    await assertFails(outsider.doc('oddCampaigns/new-camp').set({ refereeUid: OUTSIDER }));
  });

  await env.clearFirestore();
  await env.cleanup();
});
