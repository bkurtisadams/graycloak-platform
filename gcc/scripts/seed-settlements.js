#!/usr/bin/env node
// seed-settlements.js - Seed Firestore settlements/{id} from
// graycloak-adnd/seed/**/settlements/*.json.
//
// Prereq: npm install  (in this scripts/ folder, installs firebase-admin)
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json \
//     node seed-settlements.js [--mode skip|update]

'use strict';

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const PROJECT_ID = 'graycloaks-campaign-corner';
const SEED_ROOT = path.join(__dirname, '..', '..', 'graycloak-adnd', 'seed');

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

function collectSettlementFiles(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectSettlementFiles(full));
    } else if (entry.isFile()
        && entry.name.endsWith('.json')
        && path.basename(path.dirname(full)) === 'settlements') {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const mode = parseMode();
  const files = collectSettlementFiles(SEED_ROOT);
  console.log(`Loaded ${files.length} settlement JSON file(s) from ${SEED_ROOT}`);
  console.log(`Target: projects/${PROJECT_ID}/settlements/{id}`);
  console.log(`Mode: ${mode}`);
  console.log('');

  if (files.length === 0) {
    console.log('Nothing to seed. Exiting.');
    return;
  }

  admin.initializeApp({ projectId: PROJECT_ID });
  const db = admin.firestore();

  let created = 0, skipped = 0, updated = 0, errors = 0;

  for (const filepath of files) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (e) {
      errors++;
      console.error(`  PARSE ERROR ${filepath}: ${e.message}`);
      continue;
    }
    if (!data.id) {
      errors++;
      console.error(`  NO ID field in ${filepath}`);
      continue;
    }
    const ref = db.collection('settlements').doc(data.id);
    try {
      if (mode === 'skip') {
        const snap = await ref.get();
        if (snap.exists) { skipped++; continue; }
        await ref.set(data);
        created++;
      } else {
        await ref.set(data);
        updated++;
      }
    } catch (e) {
      errors++;
      console.error(`  ERROR on ${data.id}: ${e.message}`);
    }
  }

  console.log(`Done. created=${created} skipped=${skipped} updated=${updated} errors=${errors}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });