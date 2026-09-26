// v0.334.0: Traveller's own dialogs, and the lobby's "ask before deleting".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

async function withDom() {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' });
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.CustomEvent = dom.window.CustomEvent;
  const proto = dom.window.HTMLDialogElement.prototype;
  proto.showModal = function showModal() { this.open = true; };
  proto.close = function close() { this.open = false; this.dispatchEvent(new dom.window.Event('close')); };
  const dialogs = await import(`../client/dialogs.js?case=${Math.random()}`);
  const submit = () => document.querySelector('dialog form').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
  return { dom, dialogs, submit };
}

test('v0.334.0 ask before deleting: asks, "don\u2019t ask again" turns it off, then no dialog', async () => {
  const { dialogs, submit } = await withDom();
  const answer = dialogs.askBeforeDeleting({ title: 'Delete character', message: 'Delete Bob? This cannot be undone.' });
  const shown = document.querySelector('dialog');
  assert.match(shown.textContent, /DELETE CHARACTER/);
  assert.doesNotMatch(shown.textContent, /null|undefined/);
  shown.querySelector('input[type="checkbox"]').checked = true;
  submit();
  assert.equal(await answer, true);
  assert.equal(dialogs.confirmDeletes(), false);
  assert.equal(await dialogs.askBeforeDeleting({ title: 'x', message: 'y' }), true);
  assert.equal(document.querySelectorAll('dialog').length, 0, 'no dialog once turned off');
  dialogs.setConfirmDeletes(true);
  assert.equal(dialogs.confirmDeletes(), true);
});

test('v0.334.0 ask, askText: cancel is no, OK gives the text', async () => {
  const { dialogs, submit } = await withDom();
  const no = dialogs.ask({ message: 'Sure?' });
  [...document.querySelectorAll('dialog button')].find((button) => button.textContent.includes('CANCEL')).click();
  assert.deepEqual(await no, { ok: false, remember: false });
  const named = dialogs.askText({ title: 'Rename', message: 'Name', value: 'Sea' });
  document.querySelector('dialog input').value = 'Sea of Suns';
  submit();
  assert.equal(await named, 'Sea of Suns');
});

test('v0.334.0 the lobby uses its own dialogs, and has the setting under the characters', async () => {
  const lobby = await readFile(new URL('../client/enter.js', import.meta.url), 'utf8');
  assert.doesNotMatch(lobby, /window\.(confirm|prompt|alert)\(/);
  assert.match(lobby, /askBeforeDeleting\(\{ title: 'Delete character'/);
  const page = await readFile(new URL('../client/enter.html', import.meta.url), 'utf8');
  assert.match(page, /id="enter-confirm-deletes" type="checkbox" checked> ASK BEFORE DELETING A CHARACTER/);
});
