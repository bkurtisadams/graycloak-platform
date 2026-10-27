#!/usr/bin/env node
// seed-test-actor.js - Create or reset one test Actor in Firestore
// characters/{id} for the graycloak-adnd player runtime.
//
// The browser may not write currentLocation / runtime / movementRate (rules
// reserve them for the trusted runtime), so this uses the Admin SDK.
//
// Prereq: npm install  (in this scripts/ folder, installs firebase-admin)
// Usage (cmd):
//   set GOOGLE_APPLICATION_CREDENTIALS=.\service-account-key.json
//   node seed-test-actor.js --camp <campaignId> --uid <ownerUid> --q <Q> --r <R>
//        [--name "Test Fighter"] [--mr 120] [--hp 3/9] [--id <docId>]
//        [--epoch "576 Fireseek 1 6"] [--mode skip|reset]
//
// --mode skip  (default) leaves an existing doc alone
// --mode reset rewrites location/runtime/movement (and --hp if given) back
//              to the start cell, bound to the campaign's current worldTick
// --hp cur/max sets hitPoints {current, maximum} so Rest has something to heal
// --epoch      "year month day [hour]" writes campaigns/{camp}.calendarEpoch
//              (month by name, festivals included) — the date at worldTick 0

'use strict';

const admin = require('firebase-admin');

const PROJECT_ID = 'graycloaks-campaign-corner';

function arg(name, fallback) {
  const args = process.argv.slice(2);
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
}

function parseArgs() {
  const camp = arg('camp');
  const uid = arg('uid');
  const q = Number(arg('q'));
  const r = Number(arg('r'));
  const mr = Number(arg('mr', '120'));
  const hpArg = arg('hp');
  let hp = null;
  if (hpArg !== undefined) {
    const m = /^(\d+)\/(\d+)$/.exec(String(hpArg));
    hp = m ? { current: Number(m[1]), maximum: Number(m[2]) } : null;
  }
  const epochArg = arg('epoch');
  let epoch = null;
  if (epochArg !== undefined) {
    const parts = String(epochArg).trim().split(/\s+/);
    const year = Number(parts[0]), day = Number(parts[2]), hour = parts[3] === undefined ? 6 : Number(parts[3]);
    epoch = parts.length >= 3 && Number.isInteger(year) && Number.isInteger(day) && Number.isInteger(hour)
      ? { year, month: parts[1], day, hour } : null;
  }
  const mode = arg('mode', 'skip');
  const problems = [];
  if (!camp) problems.push('--camp <campaignId> is required');
  if (!uid) problems.push('--uid <ownerUid> is required');
  if (!Number.isInteger(q) || !Number.isInteger(r)) problems.push('--q and --r must be integers');
  if (!(Number.isFinite(mr) && mr > 0)) problems.push('--mr must be a positive number');
  if (hpArg !== undefined && (!hp || hp.maximum < 1 || hp.current > hp.maximum)) problems.push('--hp must be cur/max, e.g. 3/9');
  if (epochArg !== undefined && !epoch) problems.push('--epoch must be "year month day [hour]", e.g. "576 Fireseek 1 6"');
  if (!['skip', 'reset'].includes(mode)) problems.push(`--mode ${mode}: use skip or reset`);
  if (problems.length) {
    problems.forEach(p => console.error(p));
    process.exit(1);
  }
  return {
    camp, uid, q, r, mr, mode, hp, epoch,
    name: arg('name', 'Test Fighter'),
    id: arg('id', `test-actor-${camp}`),
  };
}

async function main() {
  const opts = parseArgs();
  admin.initializeApp({ projectId: PROJECT_ID });
  const db = admin.firestore();

  const campSnap = await db.collection('campaigns').doc(opts.camp).get();
  if (!campSnap.exists) {
    console.error(`campaigns/${opts.camp} does not exist`);
    process.exit(1);
  }
  const worldTick = campSnap.data().worldTick;
  if (!Number.isInteger(worldTick) || worldTick < 0) {
    console.error(`campaigns/${opts.camp}.worldTick is ${JSON.stringify(worldTick)}; set it to an integer (e.g. 0) first`);
    process.exit(1);
  }

  if (opts.epoch) {
    await db.collection('campaigns').doc(opts.camp).set({ calendarEpoch: opts.epoch }, { merge: true });
    console.log(`campaigns/${opts.camp}.calendarEpoch = ${opts.epoch.day} ${opts.epoch.month} ${opts.epoch.year} CY, hour ${opts.epoch.hour}`);
  }

  const ref = db.collection('characters').doc(opts.id);
  const snap = await ref.get();
  const now = Date.now();

  const authority = {
    campaignId: opts.camp,
    ownerUid: opts.uid,
    currentLocation: { subHexCoord: [opts.q, opts.r] },
    runtime: { lastResolvedTick: worldTick, availableAtTick: worldTick, activityId: null },
    movementRate: opts.mr,
    updatedAt: now,
  };
  if (opts.hp) authority.hitPoints = opts.hp;

  if (snap.exists) {
    if (opts.mode === 'skip') {
      console.log(`characters/${opts.id} exists; skipped (use --mode reset to rewrite its position)`);
      return;
    }
    await ref.set(authority, { merge: true });
    console.log(`characters/${opts.id} reset to [${opts.q}, ${opts.r}] at worldTick ${worldTick}${opts.hp ? `, hp ${opts.hp.current}/${opts.hp.maximum}` : ''}`);
    return;
  }

  const doc = Object.assign({
    id: opts.id,
    documentType: 'actor',
    type: 'character',
    schemaVersion: 1,
    name: opts.name,
    createdAt: now,
  }, authority);
  await ref.set(doc);
  console.log(`characters/${opts.id} created: ${opts.name} at [${opts.q}, ${opts.r}], MR ${opts.mr}${opts.hp ? `, hp ${opts.hp.current}/${opts.hp.maximum}` : ''}, worldTick ${worldTick}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
