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
  assert.match(page, /id="enter-confirm-deletes" type="checkbox" checked> ASK BEFORE DELETING</);
});

// v0.335.0: discard from the first roll; a finished roll kept as an NPC.
test('v0.335.0 discard is always on the generation page; Keep as NPC saves an NPC that cannot join', async () => {
  const page = await readFile(new URL('../client/enter.html', import.meta.url), 'utf8');
  const complete = page.slice(page.indexOf('id="enter-complete"'), page.indexOf('</div>', page.indexOf('id="enter-complete"')));
  assert.doesNotMatch(complete, /enter-discard-character/, 'not only in the finished row');
  assert.match(page, /class="enter-chargen-discard">\s*<button id="enter-discard-character"/);
  assert.match(page, /id="enter-keep-npc"[^>]*>\[ KEEP AS NPC \]/);
  const lobby = await readFile(new URL('../client/enter.js', import.meta.url), 'utf8');
  assert.match(lobby, /saveCharacter\(\{ role: 'npc' \}\)/);
  assert.equal((lobby.match(/!record\.pendingJoin && !isNpcRecord\(record\) && characterRecordStatus/g) ?? []).length, 2, 'NPCs neither join nor start a campaign');
});

test('v0.335.0 a character record carries its role; an NPC can be made playable', async () => {
  const { createCharacterRecord, setCharacterRecordRole, isNpcRecord, validateCharacterRecord } = await import('../src/character-record.js');
  const { importCharacterDocument } = await import('../vendor/classic-traveller-rules/index.js');
  const text = await readFile(new URL('../examples/Hawkeye.character.json', import.meta.url), 'utf8');
  const document = importCharacterDocument(text);
  const npc = createCharacterRecord(document, { ownerUid: 'u1', role: 'npc' });
  assert.equal(isNpcRecord(npc), true);
  assert.deepEqual(validateCharacterRecord(npc), []);
  const pc = setCharacterRecordRole(npc, 'pc');
  assert.equal(isNpcRecord(pc), false);
  assert.equal(createCharacterRecord(document, { ownerUid: 'u1' }).role, 'pc');
  assert.throws(() => setCharacterRecordRole(npc, 'villain'), TypeError);
  assert.deepEqual(validateCharacterRecord({ ...npc, role: 'villain' }).includes('role must be pc or npc'), true);
});

// v0.339.0: several fields at once, for the Vehicles tab's New ship.
test('v0.339.0 askForm: selects and text, a field shown only when asked for, cancel is null', async () => {
  const { dom, dialogs, submit } = await withDom();
  const fields = [
    { name: 'designKey', label: 'Design', type: 'select', options: [{ value: 'a', label: 'Type A' }, { value: 's', label: 'Type S' }] },
    { name: 'holder', label: 'Held by', type: 'select', options: [{ value: 'character:x', label: 'Bob' }, { value: 'patron', label: 'A patron' }] },
    { name: 'holderName', label: 'Name', type: 'text', showWhen: (values) => values.holder === 'patron' }
  ];
  const first = dialogs.askForm({ title: 'New ship', fields });
  const [design, holder] = document.querySelectorAll('dialog select');
  const nameRow = document.querySelector('dialog input[type="text"]').closest('label');
  assert.equal(nameRow.hidden, true, 'no name to give while a character holds it');
  design.value = 's';
  holder.value = 'patron'; holder.dispatchEvent(new dom.window.Event('change'));
  assert.equal(nameRow.hidden, false);
  document.querySelector('dialog input[type="text"]').value = 'Colonel Marr';
  submit();
  assert.deepEqual(await first, { designKey: 's', holder: 'patron', holderName: 'Colonel Marr' });
  const second = dialogs.askForm({ title: 'New ship', fields });
  assert.equal(document.activeElement, document.querySelector('dialog select'), 'the first field has focus');
  submit();
  assert.deepEqual(await second, { designKey: 'a', holder: 'character:x' }, 'a hidden field is left out');
  const third = dialogs.askForm({ title: 'New ship', fields });
  [...document.querySelectorAll('dialog button')].find((button) => button.textContent.includes('CANCEL')).click();
  assert.equal(await third, null);
});

// v0.340.0: the play page next — every message and question in its own dialogs.
test('v0.340.0 the play page uses its own dialogs, styled by its own stylesheet', async () => {
  const page = await readFile(new URL('../client/play.js', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /window\.(confirm|prompt|alert)\(/);
  assert.match(page, /import \{ ask, askText, askForm, tell \} from '\.\/dialogs\.js/);
  assert.match(page, /onDeleteActor: async/);
  assert.doesNotMatch(page, /this seat\?/, 'no seat wording in what the referee reads');
  const css = await readFile(new URL('../client/play.css', import.meta.url), 'utf8');
  assert.match(css, /\.tv-dialog \{/);
});
