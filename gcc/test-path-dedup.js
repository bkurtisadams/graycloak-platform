// Quick Node smoke test for v2.1.0 dedup + findByKindName.
// Run: node test-path-dedup.js

// Stub the browser-y bits the IIFE expects.
const fs = require('fs');
global.window = {};
global.localStorage = {
  _store: {},
  getItem(k){ return this._store[k] ?? null; },
  setItem(k, v){ this._store[k] = String(v); },
  removeItem(k){ delete this._store[k]; },
};
global.document = { dispatchEvent: () => {}, addEventListener: () => {} };
global.CustomEvent = class { constructor(name, init){ this.type = name; this.detail = init?.detail; } };
// Minimal GCCSubhexData stub — paths module reads ownerOf / NEIGHBOR_DELTAS
// for index rebuilds; for our test we don't have any cells yet, so just
// surface the constants.
global.window.GCCSubhexData = {
  NEIGHBOR_DELTAS: [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]],
  ownerOf: () => null,
};

// Load the module.
eval(fs.readFileSync('gcc-subhex-paths.js', 'utf8'));
const P = global.window.GCCSubhexPaths;

let pass = 0, fail = 0;
function check(label, cond){
  if (cond){ console.log('  PASS', label); pass++; }
  else     { console.log('  FAIL', label); fail++; }
}

console.log('== Dedup + findByKindName ==');

// Clean slate (the module persisted to localStorage from prior runs).
global.localStorage._store = {};
// Reload to reset internal PATHS state with the cleared store.
delete global.window.GCCSubhexPaths;
eval(fs.readFileSync('gcc-subhex-paths.js', 'utf8'));
const P2 = global.window.GCCSubhexPaths;

const v = P2.createPath('river', 'Velverdyva');
check('createPath returns doc on first call', v && v.kind === 'river' && v.name === 'Velverdyva');

const dup = P2.createPath('river', 'Velverdyva');
check('createPath returns null on exact dup', dup === null);

const dupTrim = P2.createPath('river', '  Velverdyva  ');
check('createPath dedup is whitespace-tolerant', dupTrim === null);

// Different kind, same name — should succeed (semantically a different entity).
const road = P2.createPath('road', 'Velverdyva');
check('createPath allows same name with different kind', road && road.kind === 'road');

// findByKindName
const found = P2.findByKindName('river', 'Velverdyva');
check('findByKindName matches the river', found && found.id === v.id);

const foundRoad = P2.findByKindName('road', 'Velverdyva');
check('findByKindName matches the road, not the river', foundRoad && foundRoad.id === road.id);

const miss = P2.findByKindName('river', 'Imeda');
check('findByKindName returns null for unknown name', miss === null);

const missKind = P2.findByKindName('trail', 'Velverdyva');
check('findByKindName returns null for kind with no match', missKind === null);

// Trim semantics on lookup.
const foundTrim = P2.findByKindName('river', '  Velverdyva  ');
check('findByKindName is whitespace-tolerant', foundTrim && foundTrim.id === v.id);

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
