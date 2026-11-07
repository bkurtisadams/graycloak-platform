// home-codec.js — how a campaign home sits in Firestore (v0.363.0).
//
// Sea of Suns (Nov 2026): every cloud save failed with "cannot be written
// because its size ... exceeds the maximum allowed size". Firestore caps a
// document at 1 MiB, and the campaign is ONE document (state/current). It had
// grown to ~1,032 KB as Firestore counts a map (every nested field name counts
// on every occurrence): the ship's ledger alone was 1,410 entries / 216 KB, the
// charted sector 144 KB, and every finished contract, situation and fight is
// kept. The same home gzips to ~155 KB.
//
// So a home is stored one of two ways, and read either way:
//   - as a map, `bundle: {...}`, while that comes to no more than
//     HOME_PLAIN_LIMIT_BYTES. Unchanged from before; the cloud function and any
//     older page read it as they always did.
//   - as bytes, `bundleGzip` (gzipped JSON) with `encoding: 'gzip-json'`, once
//     the map would not leave room to grow. The revision, owner and save time
//     stay plain fields beside it, because the revision check reads them.
// A home an older version wrote with `bundle` as a JSON string still loads.
//
// Isomorphic: the browser and the Node 22 cloud function both have
// CompressionStream, Blob and Response. The only thing that differs is what
// "bytes" is in each Firestore SDK, so the caller passes wrapBytes (the web
// SDK's Blob.fromUint8Array; Buffer.from for firebase-admin) and unpackHome
// accepts either kind back.

// Firestore's cap is 1 MiB (1,048,576 bytes) for the document; leave room for
// the name and index overhead it also counts.
export const HOME_HARD_LIMIT_BYTES = 960 * 1024;
// Past this the map form is on its way to the cap, so switch to bytes.
export const HOME_PLAIN_LIMIT_BYTES = 700 * 1024;
// Worth saying so before it stops saving.
export const HOME_WARN_BYTES = 600 * 1024;
const DOCUMENT_OVERHEAD_BYTES = 400;

export class CampaignTooLargeError extends Error {
  constructor({ bytes, limit }) {
    super(`This campaign is ${Math.round(bytes / 1024).toLocaleString('en-US')} KB even compressed, and Firestore holds ${Math.round(limit / 1024).toLocaleString('en-US')} KB in one document. Export it, then clear finished contracts, situations or fights, or ask for the campaign to be split.`);
    this.name = 'CampaignTooLargeError';
    this.bytes = bytes;
    this.limit = limit;
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// How Firestore counts a stored value (firebase.google.com/docs/firestore/
// storage-size): a string is its UTF-8 length + 1, a number 8, a boolean or
// null 1, an array the sum of its values, a map the sum of each field name
// (UTF-8 length + 1) and its value. Bytes count their length.
export function firestoreSize(value) {
  if (value === null || value === undefined) return 1;
  switch (typeof value) {
    case 'string': return encoder.encode(value).length + 1;
    case 'number': return 8;
    case 'boolean': return 1;
    default: break;
  }
  if (value instanceof Uint8Array) return value.length;
  if (typeof value.toUint8Array === 'function') return value.toUint8Array().length;
  if (Array.isArray(value)) return value.reduce((total, entry) => total + firestoreSize(entry), 0);
  return Object.entries(value).reduce((total, [key, entry]) => total + encoder.encode(key).length + 1 + firestoreSize(entry), 0);
}

async function through(bytes, stream) {
  const response = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await response.arrayBuffer());
}
export const gzip = (bytes) => through(bytes, new CompressionStream('gzip'));
export const gunzip = (bytes) => through(bytes, new DecompressionStream('gzip'));

function bytesOf(field) {
  if (field instanceof Uint8Array) return field;
  if (typeof field?.toUint8Array === 'function') return field.toUint8Array();
  throw new TypeError('the compressed campaign is not bytes');
}

// The document to write for a home. `wrapBytes` turns a Uint8Array into the
// SDK's bytes type. Returns { data, encoding, bytes }.
export async function packHome(home, { wrapBytes = (bytes) => bytes } = {}) {
  const plain = firestoreSize(home) + DOCUMENT_OVERHEAD_BYTES;
  if (plain <= HOME_PLAIN_LIMIT_BYTES) return { data: home, encoding: 'map', bytes: plain };
  const { bundle, ...rest } = home;
  const compressed = await gzip(encoder.encode(JSON.stringify(bundle)));
  const data = { ...rest, encoding: 'gzip-json', bundleGzip: wrapBytes(compressed) };
  const bytes = firestoreSize({ ...rest, encoding: 'gzip-json' }) + compressed.length + DOCUMENT_OVERHEAD_BYTES;
  if (bytes > HOME_HARD_LIMIT_BYTES) throw new CampaignTooLargeError({ bytes, limit: HOME_HARD_LIMIT_BYTES });
  return { data, encoding: 'gzip-json', bytes };
}

// A home as the rest of the client knows it — `bundle` an object — from
// whichever way it was stored.
export async function unpackHome(data) {
  if (!data || typeof data !== 'object') return data;
  if (data.bundleGzip !== undefined && data.bundleGzip !== null) {
    const { bundleGzip, encoding, ...rest } = data;
    return { ...rest, bundle: JSON.parse(decoder.decode(await gunzip(bytesOf(bundleGzip)))) };
  }
  if (typeof data.bundle === 'string') return { ...data, bundle: JSON.parse(data.bundle) };
  return data;
}
