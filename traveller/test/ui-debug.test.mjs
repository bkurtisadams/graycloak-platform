import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseVisibility, describeNode, inspectChain, inspectElement, formatInspection } from '../src/ui-debug.js';

// A fake element tree: enough shape for the readers, no DOM.
function node(tag, { id = '', className = '', hidden = false, rect = {}, style = {}, parent = null } = {}) {
  return {
    tagName: tag.toUpperCase(), id, className, hidden, parent,
    _rect: { width: 100, height: 50, left: 10, top: 20, ...rect },
    _style: { display: 'block', visibility: 'visible', opacity: '1', overflow: 'visible', position: 'static', gridRow: 'auto', flex: '0 1 auto', ...style }
  };
}
const readers = { box: (n) => n._rect, style: (n) => n._style, parentOf: (n) => n.parent };

test('a node is described with the numbers that matter', () => {
  const described = describeNode(node('div', { id: 'directory-actors', className: 'campaign-directory' }), readers);
  assert.equal(described.label, 'div#directory-actors.campaign-directory');
  assert.equal(described.width, 100);
  assert.equal(described.x, 10);
  assert.equal(described.hidden, false);
});

test('the chain walks outward, nearest first, and stops where told', () => {
  const root = node('main');
  const mid = node('section', { id: 'roster-section', parent: root });
  const leaf = node('div', { id: 'directory-actors', parent: mid });
  const chain = inspectChain(leaf, { ...readers, stopAt: root });
  assert.deepEqual(chain.map((level) => level.label), ['div#directory-actors', 'section#roster-section']);
});

test('the real ACTORS bug is named at the right level', () => {
  // The v0.84.2 shape: a correct panel, a hidden section, a zero-size child.
  const panel = node('section', { className: 'sidebar-panel', rect: { width: 345, height: 606 } });
  const section = node('section', { id: 'roster-section', hidden: true, style: { display: 'none' }, rect: { width: 0, height: 0, left: 0, top: 0 }, parent: panel });
  const dir = node('div', { id: 'directory-actors', style: { display: 'flex' }, rect: { width: 0, height: 0, left: 0, top: 0 }, parent: section });
  const result = inspectElement(dir, readers);
  assert.equal(result.visible, false);
  assert.equal(result.reason, 'display:none');
  assert.equal(result.at, 'section#roster-section', 'the ancestor, not the element');
  assert.match(result.hint, /switched off/);
});

test('a collapsed row is distinguished from one never laid out', () => {
  // v0.79.2: the stage was 645x1 at a real position — laid out, not hidden.
  const collapsed = [{ label: 'section.shell-stage', width: 645, height: 1, x: 80, y: 59, display: 'flex', visibility: 'visible', opacity: '1', hidden: false }];
  const a = diagnoseVisibility(collapsed);
  assert.match(a.reason, /^no height \(1px\)$/, 'the real collapse was 1px, not 0');
  assert.match(a.hint, /not be stretching it|definite ancestor/);
  // Zero size at 0,0 is the never-laid-out case and says so instead.
  const never = [{ label: 'div#x', width: 0, height: 0, x: 0, y: 0, display: 'flex', visibility: 'visible', opacity: '1', hidden: false }];
  assert.match(diagnoseVisibility(never).hint, /never laid out/);
  assert.match(diagnoseVisibility(never).reason, /no width or height/);
});

test('hidden, invisible and transparent are each reported distinctly, and a healthy element passes', () => {
  const base = { label: 'div#x', width: 10, height: 10, x: 1, y: 1, display: 'block', visibility: 'visible', opacity: '1', hidden: false };
  assert.equal(diagnoseVisibility([{ ...base, hidden: true }]).reason, 'hidden attribute');
  assert.equal(diagnoseVisibility([{ ...base, visibility: 'hidden' }]).reason, 'visibility:hidden');
  assert.equal(diagnoseVisibility([{ ...base, opacity: '0' }]).reason, 'opacity:0');
  const healthy = diagnoseVisibility([base]);
  assert.equal(healthy.visible, true);
  assert.equal(healthy.reason, 'on screen');
});

test('the formatted report reads as one line per level with the verdict last', () => {
  const panel = node('section', { className: 'sidebar-panel', rect: { width: 345, height: 606 } });
  const dir = node('div', { id: 'directory-actors', hidden: true, rect: { width: 0, height: 0, left: 0, top: 0 }, parent: panel });
  const text = formatInspection(inspectElement(dir, readers));
  const lines = text.split('\n');
  assert.match(lines[0], /^div#directory-actors {2}0x0 @0,0/);
  assert.match(lines[1], /^section\.sidebar-panel {2}345x606/);
  assert.match(text, /→ hidden attribute at div#directory-actors/);
});
