// home-codec: a campaign home stored as a map while it fits a Firestore
// document, and gzipped once it would not (Sea of Suns, Nov 2026: the home
// reached ~1,032 KB as a map and every cloud save was refused).
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  packHome, unpackHome, firestoreSize, gzip, gunzip, CampaignTooLargeError,
  HOME_PLAIN_LIMIT_BYTES, HOME_HARD_LIMIT_BYTES
} from '../src/home-codec.js';
import { importCampaignBundle } from '../src/campaign-bundle.js';
import { createCampaignHome } from '../src/campaign-home.js';

const home = (bundle, extra = {}) => ({ schemaVersion: 1, campaignId: 'campaign-x', name: 'Sea of Suns', ownerUid: 'uid-kurt', revision: 7, savedAt: 1700000000000, bundle, ...extra });

// A ledger-shaped bundle: the thing that actually grew (1,410 entries, 216 KB,
// on one ship), made as large as asked.
const ledger = (entries) => ({
  campaign: { identity: { id: 'campaign-x', name: 'Sea of Suns' } },
  documents: {
    ships: [{ identity: { id: 'ship-1' }, state: { finances: { balanceCr: 5201551, ledger: Array.from({ length: entries }, (_, index) => ({
      id: `ship-1:257-4807:speculative-sale:${index}`, kind: 'speculative-sale', balanceCr: 5201551 - index, description: `${index % 9} tons Firearms sold at 80% of base`, date: '257-4807', amountCr: 48000 + index
    })) } } }]
  }
});

// Stands in for the web SDK's Blob and the Admin SDK's Buffer.
class FakeBytes {
  constructor(bytes) { this.bytes = bytes; }
  toUint8Array() { return this.bytes; }
}

test('Firestore\u2019s own counting: strings by UTF-8 + 1, numbers 8, field names on every occurrence', () => {
  assert.equal(firestoreSize('xy'), 3);
  assert.equal(firestoreSize(5), 8);
  assert.equal(firestoreSize(true), 1);
  assert.equal(firestoreSize(null), 1);
  assert.equal(firestoreSize({ a: 'xy' }), 2 + 3, 'name "a" (1+1) plus the string (2+1)');
  assert.equal(firestoreSize([{ a: 1 }, { a: 1 }]), 2 * (2 + 8), 'the name counts again for each entry');
  assert.equal(firestoreSize('\u00e9'), 3, 'two UTF-8 bytes + 1');
  assert.equal(firestoreSize(new Uint8Array(100)), 100);
});

test('gzip round-trips', async () => {
  const text = new TextEncoder().encode('Marisol '.repeat(5000));
  const packed = await gzip(text);
  assert.ok(packed.length < text.length / 20);
  assert.deepEqual(await gunzip(packed), text);
});

test('a home that fits stays a map, exactly as it was, so the function and older pages read it unchanged', async () => {
  const small = home(ledger(50));
  const packed = await packHome(small);
  assert.equal(packed.encoding, 'map');
  assert.equal(packed.data, small);
  assert.equal(packed.data.bundleGzip, undefined);
  assert.deepEqual(await unpackHome(packed.data), small);
});

test('Sea of Suns\u2019s case: a home past what a map can hold is stored gzipped, and reads back identical', async () => {
  const big = home(ledger(9000));
  assert.ok(firestoreSize(big) > 1024 * 1024, `a map of it would be refused: ${firestoreSize(big)}`);
  const packed = await packHome(big);
  assert.equal(packed.encoding, 'gzip-json');
  assert.equal(packed.data.bundle, undefined, 'the map is gone');
  assert.ok(packed.data.bundleGzip instanceof Uint8Array);
  assert.equal(packed.data.encoding, 'gzip-json');
  // The revision check reads these without opening the bytes.
  assert.equal(packed.data.revision, 7);
  assert.equal(packed.data.ownerUid, 'uid-kurt');
  assert.equal(packed.data.savedAt, 1700000000000);
  assert.ok(packed.bytes < HOME_PLAIN_LIMIT_BYTES / 4, `${packed.bytes} bytes as stored`);
  assert.deepEqual(await unpackHome(packed.data), big);
});

test('the SDK\u2019s bytes type goes in through wrapBytes and comes back out of either kind', async () => {
  const big = home(ledger(9000));
  const packed = await packHome(big, { wrapBytes: (bytes) => new FakeBytes(bytes) });
  assert.ok(packed.data.bundleGzip instanceof FakeBytes);
  assert.deepEqual(await unpackHome(packed.data), big);
  // firebase-admin hands back a Buffer, which is a Uint8Array.
  const asBuffer = { ...packed.data, bundleGzip: Buffer.from(packed.data.bundleGzip.toUint8Array()) };
  assert.deepEqual(await unpackHome(asBuffer), big);
});

test('a home an older version stored with bundle as a JSON string still loads', async () => {
  const bundle = ledger(10);
  const legacy = { ...home(bundle), bundle: JSON.stringify(bundle) };
  assert.deepEqual(await unpackHome(legacy), home(bundle));
});

test('a campaign too large even compressed is refused with its size, not by Firestore', async () => {
  const incompressible = { campaign: {}, documents: { blob: randomBytes(1_300_000).toString('base64') } };
  await assert.rejects(packHome(home(incompressible)), (error) => {
    assert.ok(error instanceof CampaignTooLargeError);
    assert.ok(error.bytes > HOME_HARD_LIMIT_BYTES);
    assert.match(error.message, /even compressed/);
    assert.match(error.message, /960 KB/);
    return true;
  });
});

test('a real home (the Sea of Suns fixture) survives packing either way', async () => {
  const bundle = JSON.parse(await readFile(new URL('./fixtures/Sea-of-Suns-v0.11.2-buggy.campaign.json', import.meta.url), 'utf8'));
  const real = createCampaignHome(importCampaignBundle(bundle), { ownerUid: 'uid-kurt' });
  const mapped = await packHome(real);
  assert.deepEqual(await unpackHome(mapped.data), real);
  // And gzipped, which a larger campaign will be.
  const { bundle: inner, ...rest } = real;
  const forced = { ...rest, encoding: 'gzip-json', bundleGzip: await gzip(new TextEncoder().encode(JSON.stringify(inner))) };
  assert.deepEqual(await unpackHome(forced), real);
});

test('v0.363.0 the web client and the cloud function both go through the codec', async () => {
  const publish = await readFile(new URL('../client/publish.js', import.meta.url), 'utf8');
  const functions = await readFile(new URL('../functions/index.js', import.meta.url), 'utf8');
  assert.match(publish, /import \{ packHome, unpackHome, HOME_WARN_BYTES \} from '\.\.\/src\/home-codec\.js\?v=v\d+\.\d+\.\d+';/);
  assert.match(publish, /transaction\.set\(ref, packed\.data\)/);
  assert.match(publish, /return snapshot\.exists \? unpackHome\(snapshot\.data\(\)\) : null;/);
  assert.match(publish, /const home = await unpackHome\(snapshot\.data\(\)\);/);
  assert.doesNotMatch(publish, /JSON\.parse\(home\.bundle\)/, 'rename no longer assumes a string');
  assert.match(functions, /return snapshot\.exists \? unpackHome\(snapshot\.data\(\)\) : null;/);
  assert.match(functions, /transaction\.set\(homeRef, \(await packHome\(home, \{ wrapBytes: \(bytes\) => Buffer\.from\(bytes\) \}\)\)\.data\)/);
});
