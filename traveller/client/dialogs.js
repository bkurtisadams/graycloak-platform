// dialogs.js — v0.334.0: Traveller's own dialogs.
//
// The browser's confirm(), prompt() and alert() are drawn by Windows (or the
// browser) in their own style, block the page, and cannot carry a "don't ask
// again" (Kurt: deleting most of the characters he rolls, the Windows box
// every time was the annoying part). These are the same three questions in
// the page's own style — the lobby's bracketed buttons on the roll-dialog
// frame — and they answer with a promise instead of stopping the page.
//
//   await ask({ title, message, confirm, cancel, danger, remember })
//     -> { ok, remember }   remember: the "don't ask again" box, if offered
//   await askText({ title, message, value, placeholder, confirm })
//     -> the text, or null if cancelled
//   await tell({ title, message })
//
// A page with no <dialog> support (an old browser, a test without it) falls
// back to the browser's own boxes, so a question is never skipped silently.

const supported = () => typeof document !== 'undefined'
  && typeof window !== 'undefined'
  && typeof window.HTMLDialogElement === 'function'
  && typeof document.createElement('dialog').showModal === 'function';

function element(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'text') node.textContent = value;
    else if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  node.append(...children.filter(Boolean));
  return node;
}

const bracket = (label) => (/^\[.*\]$/.test(label) ? label : `[ ${label.toUpperCase()} ]`);

function open({ title, message, buttons, field = null, remember = null, danger = false }) {
  return new Promise((resolve) => {
    const dialog = element('dialog', { class: `roll-dialog tv-dialog${danger ? ' is-danger' : ''}`, 'aria-labelledby': 'tv-dialog-title' });
    const form = element('form', { class: 'roll-dialog-form', method: 'dialog' });
    const box = remember ? element('input', { type: 'checkbox' }) : null;
    let answer = null;
    const finish = (value) => { answer = value; dialog.close(); };
    const actions = element('div', { class: 'roll-dialog-actions' },
      ...buttons.map((button) => element('button', {
        type: button.value === 'ok' ? 'submit' : 'button',
        class: `text-button${button.primary ? ' action-button' : ''}`,
        text: bracket(button.label),
        onclick: button.value === 'ok' ? null : () => finish(button.value)
      })));
    form.addEventListener('submit', (event) => { event.preventDefault(); finish('ok'); });
    form.append(...[
      element('div', { class: 'roll-dialog-header' }, element('strong', { id: 'tv-dialog-title', text: String(title ?? '').toUpperCase() })),
      message ? element('p', { class: 'tv-dialog-message', text: message }) : null,
      field,
      box ? element('label', { class: 'tv-dialog-remember' }, box, ` ${remember}`) : null,
      actions
    ].filter(Boolean));
    dialog.append(form);
    // Escape and the backdrop's close both mean "no".
    dialog.addEventListener('cancel', () => { answer = answer ?? 'cancel'; });
    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve({ value: answer ?? 'cancel', remember: Boolean(box?.checked), text: field?.value ?? null });
    });
    document.body.append(dialog);
    dialog.showModal();
    (field ?? form.querySelector('button[type="submit"]'))?.focus();
  });
}

/** A yes/no question. Resolves { ok, remember }. */
export async function ask({ title = 'Confirm', message = '', confirm = 'OK', cancel = 'Cancel', danger = false, remember = null } = {}) {
  if (!supported()) return { ok: window.confirm(`${message}`), remember: false };
  const result = await open({
    title, message, danger, remember,
    buttons: [{ label: cancel, value: 'cancel' }, { label: confirm, value: 'ok', primary: true }]
  });
  return { ok: result.value === 'ok', remember: result.value === 'ok' && result.remember };
}

/** A line of text. Resolves the text, or null when cancelled. */
export async function askText({ title = 'Enter', message = '', value = '', placeholder = '', confirm = 'OK', cancel = 'Cancel' } = {}) {
  if (!supported()) return window.prompt(message, value);
  const field = element('input', { type: 'text', class: 'tv-dialog-field', value, placeholder, 'aria-label': title });
  field.value = value;
  const result = await open({ title, message, field, buttons: [{ label: cancel, value: 'cancel' }, { label: confirm, value: 'ok', primary: true }] });
  return result.value === 'ok' ? result.text : null;
}

/** A message with one button. */
export async function tell({ title = 'Note', message = '', confirm = 'OK' } = {}) {
  if (!supported()) { window.alert(message); return; }
  await open({ title, message, buttons: [{ label: confirm, value: 'ok', primary: true }] });
}

// ---- the lobby's "ask before deleting" setting ------------------------------
// Per browser, on by default: deleting or discarding a character asks first.
// The dialog's own "don't ask again" box turns it off; the lobby's checkbox
// under the character list turns it back on.
const CONFIRM_DELETES_KEY = 'traveller.confirmDeletes';

export function confirmDeletes() {
  try { return window.localStorage.getItem(CONFIRM_DELETES_KEY) !== 'off'; } catch { return true; }
}

export function setConfirmDeletes(on) {
  try { window.localStorage.setItem(CONFIRM_DELETES_KEY, on ? 'on' : 'off'); } catch { /* private mode: asks every time */ }
  // The lobby's checkbox follows a change made from the dialog.
  try { window.dispatchEvent(new CustomEvent('traveller:confirm-deletes', { detail: { on: Boolean(on) } })); } catch { /* no window */ }
}

/**
 * Ask before a delete, unless the player turned the question off. Resolves
 * true to go ahead.
 */
export async function askBeforeDeleting({ title, message, confirm = 'Delete' }) {
  if (!confirmDeletes()) return true;
  const { ok, remember } = await ask({ title, message, confirm, danger: true, remember: 'Don\u2019t ask again (turn it back on under your characters)' });
  if (ok && remember) setConfirmDeletes(false);
  return ok;
}
