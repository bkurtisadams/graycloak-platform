#!/usr/bin/env node
// seed-region-flanaess.js - Seed Firestore regions/flanaess from gcc-terrain.js BASE_TERRAIN.
//
// Writes one packed document containing all painted hexes, keyed col-row,
// with flat terrain string values. Flat (not wrapped in { t: terrain }) to
// stay under Firestore's 40k indexed-field-paths per document limit.
//
// Prereq: 
//   1. npm install  (in this scripts/ folder)
//   2. Paste your exported BASE_TERRAIN block into gcc-terrain.js, replacing
//      the empty one. Commit. Then run this script.
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json \
//     node seed-region-flanaess.js [--mode skip|update]
//
//   --mode skip    (default) Bails if regions/flanaess already exists.
//   --mode update  Overwrites the doc in place.

'use strict';

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const PROJECT_ID = 'graycloaks-campaign-corner';
const TERRAIN_FILE = path.join(__dirname, '..', 'gcc-terrain.js');
const REGION_ID = 'flanaess';
const REGION_NAME = 'Flanaess';
const SCALE_MILES = 30; // Darlene standard

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

  const win = loadBrowserModule(TERRAIN_FILE);
  if (!win.GCCTerrain || !win.GCCTerrain.data) {
    throw new Error(`Failed to load GCCTerrain from ${TERRAIN_FILE}`);
  }
  const BASE = win.GCCTerrain.data;
  const entries = Object.entries(BASE);

  if (entries.length === 0) {
    throw new Error(
      'BASE_TERRAIN is empty in gcc-terrain.js. Paste the exported const body ' +
      'into the file (replacing the empty BASE_TERRAIN = {}) before running.'
    );
  }

  const hexes = {};
  let maxCol = 0, maxRow = 0;
  for (const [key, terrain] of entries) {
    hexes[key] = terrain;
    const [c, r] = key.split('-').map(Number);
    if (c > maxCol) maxCol = c;
    if (r > maxRow) maxRow = r;
  }
  const cols = maxCol + 1;
  const rows = maxRow + 1;

  console.log(`Loaded ${entries.length} hexes from gcc-terrain.js BASE_TERRAIN`);
  console.log(`Grid: ${cols} cols x ${rows} rows`);
  console.log(`Target: projects/${PROJECT_ID}/regions/${REGION_ID}`);
  console.log(`Mode: ${mode}`);
  console.log('');

  admin.initializeApp({ projectId: PROJECT_ID });
  const db = admin.firestore();
  const ref = db.collection('regions').doc(REGION_ID);

  const doc = {
    name: REGION_NAME,
    scale: SCALE_MILES,
    cols,
    rows,
    keyFormat: 'col-row',
    hexCount: entries.length,
    hexes,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (mode === 'skip') {
    const snap = await ref.get();
    if (snap.exists) {
      console.log(`regions/${REGION_ID} already exists. Re-run with --mode update to overwrite.`);
      return;
    }
    await ref.set(doc);
    console.log(`Created regions/${REGION_ID} with ${entries.length} hexes.`);
  } else {
    await ref.set(doc);
    console.log(`Updated regions/${REGION_ID} with ${entries.length} hexes.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
