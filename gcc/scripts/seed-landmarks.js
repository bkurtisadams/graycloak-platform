#!/usr/bin/env node
// seed-landmarks.js - Seed Firestore landmarks/{hexId} from gcc-landmarks.js GH_LANDMARKS.
//
// Prereq: npm install  (in this scripts/ folder, installs firebase-admin)
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json \
//     node seed-landmarks.js [--mode skip|update]
//
//   --mode skip    (default) Create only. Skips docs that already exist.
//   --mode update  Overwrite existing docs. Use to re-sync after source edits.

'use strict';

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const PROJECT_ID = 'graycloaks-campaign-corner';
const LANDMARKS_FILE = path.join(__dirname, '..', 'gcc-landmarks.js');

function parseMode() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--mode');
  const mode = i >= 0 && args[i + 1] ? args[i + 1] : 'skip';
  if (!['skip', 'update'].includes(mode)) {
    console.error(`Invalid --mode: ${mode}. Use 'skip' or 'update'.`);
    process.exit(1);
  }
  return mode;
}

// Load a browser-IIFE module (gcc-landmarks.js) in Node by shimming `window`
// and `localStorage`. The IIFE already has a try/catch around localStorage
// access, so a getItem that returns null is harmless.
function loadBrowserModule(filepath) {
  const source = fs.readFileSync(filepath, 'utf8');
  const fakeWindow = {};
  const fakeLocalStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  new Function('window', 'localStorage', source)(fakeWindow, fakeLocalStorage);
  return fakeWindow;
}

async function main() {
  const mode = parseMode();

  const win = loadBrowserModule(LANDMARKS_FILE);
  if (!win.GCCLandmarks || !win.GCCLandmarks.data) {
    throw new Error(`Failed to load GCCLandmarks from ${LANDMARKS_FILE}`);
  }
  const entries = Object.entries(win.GCCLandmarks.data);
  console.log(`Loaded ${entries.length} landmarks from gcc-landmarks.js`);
  console.log(`Target: projects/${PROJECT_ID}/landmarks/{hexId}`);
  console.log(`Mode: ${mode}`);
  console.log('');

  admin.initializeApp({ projectId: PROJECT_ID });
  const db = admin.firestore();

  let created = 0, skipped = 0, updated = 0, errors = 0;

  for (const [hexId, data] of entries) {
    const ref = db.collection('landmarks').doc(hexId);
    try {
      if (mode === 'skip') {
        const snap = await ref.get();
        if (snap.exists) { skipped++; continue; }
        await ref.set({ hexId, ...data });
        created++;
      } else {
        await ref.set({ hexId, ...data });
        updated++;
      }
      const total = created + skipped + updated;
      if (total % 10 === 0) {
        process.stdout.write(`  ${total}/${entries.length}\r`);
      }
    } catch (e) {
      errors++;
      console.error(`  ERROR on ${hexId}: ${e.message}`);
    }
  }

  console.log('');
  console.log(`Done. created=${created} skipped=${skipped} updated=${updated} errors=${errors}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
