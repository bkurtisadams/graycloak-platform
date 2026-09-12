import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampWindowGeometry, dragWindowGeometry, resizeWindowGeometry,
  loadWindowGeometry, saveWindowGeometry,
  createDocumentWindowState, openDocumentWindow, closeDocumentWindow,
  toggleMinimizeDocumentWindow, moveDocumentWindow
} from '../src/document-window.js';

function fakeStorage() {
  const map = new Map();
  return { getItem: (key) => (map.has(key) ? map.get(key) : null), setItem: (key, value) => map.set(key, value), _map: map };
}

test('a fresh window centres itself in the container at the default size', () => {
  const geometry = clampWindowGeometry({}, { width: 1200, height: 800 });
  assert.equal(geometry.width, 520);
  assert.equal(geometry.height, 500);
  assert.equal(geometry.x, Math.round((1200 - 520) / 2));
  assert.equal(geometry.y, Math.round((800 - 500) / 2));
});

test('geometry never exceeds the container, minus the inset, even when asked to', () => {
  const geometry = clampWindowGeometry({ x: 5000, y: 5000, width: 5000, height: 5000 }, { width: 900, height: 600 });
  assert.equal(geometry.width, 900 - 16 * 2);
  assert.equal(geometry.height, 600 - 16 * 2);
  assert.equal(geometry.x, 16);
  assert.equal(geometry.y, 16);
});

test('a container smaller than the minimum size still yields a usable window, not a negative one', () => {
  const geometry = clampWindowGeometry({}, { width: 200, height: 100 });
  assert.equal(geometry.width, 300);
  assert.equal(geometry.height, 200);
  assert.ok(geometry.x >= 16 - 1e-9);
  assert.ok(geometry.y >= 16 - 1e-9);
});

test('a saved geometry from a wider window is pulled back on-screen after the browser narrows', () => {
  const saved = { x: 900, y: 500, width: 720, height: 640 };
  const geometry = clampWindowGeometry(saved, { width: 800, height: 600 });
  assert.ok(geometry.x + geometry.width <= 800 - 16 + 1e-9);
  assert.ok(geometry.y + geometry.height <= 600 - 16 + 1e-9);
});

test('a drag moves by the pointer delta from where the drag began, not from the current position', () => {
  const start = { x: 100, y: 100, width: 400, height: 300 };
  const container = { width: 1200, height: 800 };
  const midway = dragWindowGeometry(start, { x: 40, y: -10 }, container);
  assert.deepEqual(midway, { x: 140, y: 90, width: 400, height: 300 });
  // A drag that continues from the same start (not from `midway`) with a
  // larger delta is not compounded — this is what makes an off-container
  // drag that comes back lossless.
  const further = dragWindowGeometry(start, { x: 80, y: -10 }, container);
  assert.equal(further.x, 180);
});

test('a resize changes size, anchored at the current position, and reclamps', () => {
  const current = { x: 700, y: 400, width: 400, height: 300 };
  const resized = resizeWindowGeometry(current, { width: 900, height: 900 }, { width: 1000, height: 700 });
  assert.equal(resized.width, 900);
  // The window would now overflow the container from x:700, so x is pulled
  // back in rather than the width being silently shrunk without notice.
  assert.ok(resized.x + resized.width <= 1000 - 16 + 1e-9);
});

test('geometry round-trips through storage, and a corrupt or missing value yields nothing', () => {
  const storage = fakeStorage();
  const geometry = { x: 10, y: 20, width: 500, height: 400 };
  saveWindowGeometry(storage, 'traveller.character-window', geometry);
  assert.deepEqual(loadWindowGeometry(storage, 'traveller.character-window'), geometry);
  assert.equal(loadWindowGeometry(storage, 'traveller.nothing-saved'), null);
  storage._map.set('traveller.bad', '{not json');
  assert.equal(loadWindowGeometry(storage, 'traveller.bad'), null);
  storage._map.set('traveller.partial', JSON.stringify({ x: 1, y: 2 }));
  assert.equal(loadWindowGeometry(storage, 'traveller.partial'), null);
  assert.equal(loadWindowGeometry(null, 'traveller.character-window'), null);
});

test('open, close and minimize are plain state transitions', () => {
  let state = createDocumentWindowState();
  assert.deepEqual(state, { open: false, minimized: false, geometry: null });
  const geometry = { x: 0, y: 0, width: 400, height: 300 };
  state = openDocumentWindow(state, geometry);
  assert.deepEqual(state, { open: true, minimized: false, geometry });
  state = toggleMinimizeDocumentWindow(state);
  assert.equal(state.minimized, true);
  assert.equal(state.open, true, 'minimizing does not close the window');
  state = toggleMinimizeDocumentWindow(state);
  assert.equal(state.minimized, false);
  const moved = { x: 50, y: 60, width: 400, height: 300 };
  state = moveDocumentWindow(state, moved);
  assert.deepEqual(state.geometry, moved);
  state = closeDocumentWindow(state);
  assert.deepEqual(state, { open: false, minimized: false, geometry: moved }, 'closing keeps the last geometry for next time');
});
