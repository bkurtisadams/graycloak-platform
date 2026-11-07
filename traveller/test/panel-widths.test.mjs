// panel-widths: the rules for the two resizable side columns (v0.365.0), and
// panel-resize: the handles on the shell, against a jsdom page.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PANEL_LIMITS, MIN_SCENE_WIDTH, STORAGE_KEY, clampWidth, nudgedWidth, loadWidths, saveWidths
} from '../src/panel-widths.js';

let JSDOM = null;
try { ({ JSDOM } = await import('jsdom')); } catch { JSDOM = null; }

const memory = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key), data };
};

test('a column stays inside its own limits', () => {
  const room = { viewport: 2560, widths: { now: 408, sidebar: 380 } };
  assert.equal(clampWidth('sidebar', 100, room), PANEL_LIMITS.sidebar.min);
  assert.equal(clampWidth('sidebar', 5000, room), PANEL_LIMITS.sidebar.max);
  assert.equal(clampWidth('now', 500, room), 500);
  assert.equal(clampWidth('now', NaN, room), PANEL_LIMITS.now.min, 'not a number: the least');
});

test('the map keeps its room: a column cannot take what the other column and the map need', () => {
  // 1200 wide with the left column at 408: the sidebar may have 1200 - 408 - 360.
  assert.equal(clampWidth('sidebar', 900, { viewport: 1200, widths: { now: 408, sidebar: 380 } }), 1200 - 408 - MIN_SCENE_WIDTH);
  // A window too narrow for the minimums still gives the least a column may be.
  assert.equal(clampWidth('sidebar', 900, { viewport: 700, widths: { now: 408, sidebar: 380 } }), PANEL_LIMITS.sidebar.min);
});

test('arrow keys move the edge the way it looks, and Shift moves it further', () => {
  assert.equal(nudgedWidth('now', 400, 'ArrowRight'), 416, 'the left column widens as its edge moves right');
  assert.equal(nudgedWidth('now', 400, 'ArrowLeft'), 384);
  assert.equal(nudgedWidth('sidebar', 400, 'ArrowLeft'), 416, 'the sidebar widens as its edge moves left');
  assert.equal(nudgedWidth('sidebar', 400, 'ArrowRight', { large: true }), 336);
  assert.equal(nudgedWidth('sidebar', 400, 'ArrowUp'), 400);
});

test('what was kept comes back; anything damaged is forgotten, never a column that cannot be used', () => {
  const storage = memory();
  saveWidths(storage, { now: 455.4, sidebar: 612 });
  assert.deepEqual(loadWidths(storage), { now: 455, sidebar: 612 });
  assert.deepEqual(loadWidths(memory({ [STORAGE_KEY]: '{"now":5,"sidebar":99999}' })), {}, 'out of range');
  assert.deepEqual(loadWidths(memory({ [STORAGE_KEY]: 'not json' })), {});
  assert.deepEqual(loadWidths(memory({ [STORAGE_KEY]: '{"now":"wide"}' })), {});
  assert.deepEqual(loadWidths(null), {});
  assert.deepEqual(loadWidths({ getItem() { throw new Error('storage is off'); } }), {});
  saveWidths(storage, {});
  assert.equal(storage.data.has(STORAGE_KEY), false, 'nothing chosen keeps nothing');
  assert.doesNotThrow(() => saveWidths({ setItem() { throw new Error('quota'); }, removeItem() { throw new Error('quota'); } }, { now: 400 }));
});

function page({ innerWidth = 1600 } = {}) {
  const dom = new JSDOM(`<div class="shell" id="shell"><header class="mast"></header><aside class="now"></aside><main class="scene"></main><aside class="sidebar"></aside></div>`, { url: 'http://localhost/' });
  const { window } = dom;
  Object.defineProperty(window, 'innerWidth', { value: innerWidth, configurable: true, writable: true });
  const shell = window.document.getElementById('shell');
  shell.getBoundingClientRect = () => ({ left: 0, right: innerWidth, width: innerWidth, top: 0, bottom: 800, height: 800 });
  shell.querySelector('.now').getBoundingClientRect = () => ({ width: 408 });
  shell.querySelector('.sidebar').getBoundingClientRect = () => ({ width: 380 });
  shell.querySelector('.mast').getBoundingClientRect = () => ({ height: 56 });
  return { dom, window, shell };
}
const pointer = (window, type, clientX) => window.dispatchEvent(Object.assign(new window.MouseEvent(type, { bubbles: true, clientX }), {}));
const press = (window, handle, clientX) => handle.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX, button: 0 }));

test('v0.365.0 two handles on the shell, below the masthead, labelled for a keyboard', { skip: !JSDOM }, async () => {
  const { installPanelResize } = await import('../client/panel-resize.js');
  const { window, shell } = page();
  installPanelResize({ shell, storage: memory(), win: window });
  const handles = [...shell.querySelectorAll(':scope > .panel-handle')];
  assert.deepEqual(handles.map((node) => node.dataset.panel), ['now', 'sidebar']);
  assert.equal(handles[0].getAttribute('role'), 'separator');
  assert.equal(handles[0].getAttribute('aria-label'), 'Resize the left column');
  assert.equal(handles[1].getAttribute('aria-label'), 'Resize the sidebar');
  assert.equal(handles[0].style.top, '56px');
  assert.equal(handles[0].tabIndex, 0);
  assert.equal(shell.style.getPropertyValue('--now-width'), '', 'a width nobody chose is left alone');
  assert.equal(installPanelResize({ shell, storage: memory(), win: window }), null, 'installed once');
});

test('v0.365.0 dragging the left column\u2019s edge sets its width, and lets go keeps it', { skip: !JSDOM }, async () => {
  const { installPanelResize } = await import('../client/panel-resize.js');
  const { window, shell } = page();
  const storage = memory();
  installPanelResize({ shell, storage, win: window });
  const left = shell.querySelector('[data-panel="now"]');
  press(window, left, 408);
  assert.ok(shell.classList.contains('is-resizing'));
  pointer(window, 'pointermove', 520);
  assert.equal(shell.style.getPropertyValue('--now-width'), '520px');
  pointer(window, 'pointermove', 40);
  assert.equal(shell.style.getPropertyValue('--now-width'), '280px', 'not narrower than its least');
  pointer(window, 'pointermove', 500);
  pointer(window, 'pointerup', 500);
  assert.equal(shell.classList.contains('is-resizing'), false);
  assert.deepEqual(loadWidths(storage), { now: 500 });
  pointer(window, 'pointermove', 700);
  assert.equal(shell.style.getPropertyValue('--now-width'), '500px', 'after the drop it no longer follows the pointer');
});

test('v0.365.0 dragging the sidebar\u2019s edge measures from the right, and the map keeps its room', { skip: !JSDOM }, async () => {
  const { installPanelResize } = await import('../client/panel-resize.js');
  const { window, shell } = page({ innerWidth: 1200 });
  installPanelResize({ shell, storage: memory(), win: window });
  const right = shell.querySelector('[data-panel="sidebar"]');
  press(window, right, 820);
  pointer(window, 'pointermove', 800);
  assert.equal(shell.style.getPropertyValue('--sidebar-width'), '400px', 'the shell\u2019s right edge less the pointer');
  pointer(window, 'pointermove', 100);
  assert.equal(shell.style.getPropertyValue('--sidebar-width'), `${1200 - 408 - MIN_SCENE_WIDTH}px`, 'not so wide the map has less than its minimum');
  pointer(window, 'pointerup', 100);
});

test('v0.365.0 arrow keys, Shift, and Home or a double-click put a column back', { skip: !JSDOM }, async () => {
  const { installPanelResize } = await import('../client/panel-resize.js');
  const { window, shell } = page();
  const storage = memory();
  installPanelResize({ shell, storage, win: window });
  const right = shell.querySelector('[data-panel="sidebar"]');
  const key = (node, name, extra = {}) => node.dispatchEvent(new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...extra }));
  key(right, 'ArrowLeft');
  assert.equal(shell.style.getPropertyValue('--sidebar-width'), '396px', 'from the 380 it is drawn at, 16 wider');
  key(right, 'ArrowLeft', { shiftKey: true });
  assert.equal(shell.style.getPropertyValue('--sidebar-width'), '460px');
  assert.deepEqual(loadWidths(storage), { sidebar: 460 });
  key(right, 'Home');
  assert.equal(shell.style.getPropertyValue('--sidebar-width'), '');
  assert.deepEqual(loadWidths(storage), {});
  key(right, 'ArrowLeft');
  right.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
  assert.equal(shell.style.getPropertyValue('--sidebar-width'), '', 'a double-click resets too');
});

test('v0.365.0 widths kept from an earlier visit are applied, and a narrower window pulls them back', { skip: !JSDOM }, async () => {
  const { installPanelResize } = await import('../client/panel-resize.js');
  const { window, shell } = page({ innerWidth: 1600 });
  const storage = memory();
  saveWidths(storage, { now: 600, sidebar: 800 });
  installPanelResize({ shell, storage, win: window });
  assert.equal(shell.style.getPropertyValue('--now-width'), '600px');
  assert.equal(shell.style.getPropertyValue('--sidebar-width'), '640px', '1600 - 600 - the map\u2019s minimum, not the 800 asked');
  window.innerWidth = 1200;
  window.dispatchEvent(new window.Event('resize'));
  assert.ok(Number.parseInt(shell.style.getPropertyValue('--sidebar-width'), 10) + Number.parseInt(shell.style.getPropertyValue('--now-width'), 10) <= 1200 - MIN_SCENE_WIDTH + 1);
});
