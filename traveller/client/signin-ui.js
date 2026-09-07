// signin-ui.js — the sign-in dialog, shared by the referee client and the
// player page.
//
// Google is offered because most people have it; email and password because
// some do not, and because Google will not let you invent an account for
// testing. Firebase has both enabled.

import { signIn, signInWithEmail, createAccountWithEmail } from './auth.js';

const DIALOG_ID = 'signin-dialog';

function build() {
  const dialog = document.createElement('dialog');
  dialog.id = DIALOG_ID;
  dialog.className = 'roll-dialog signin-dialog';
  dialog.innerHTML = `
    <form class="roll-dialog-form" method="dialog">
      <div class="roll-dialog-heading">
        <strong>SIGN IN</strong>
        <button data-signin="close" class="text-button" type="button">[ CLOSE ]</button>
      </div>
      <div class="signin-basis">A Graycloak account identifies you to your referee. It is the same account across every Graycloak game.</div>
      <button data-signin="google" class="text-button action-button" type="button">[ SIGN IN WITH GOOGLE ]</button>
      <div class="signin-rule">OR</div>
      <label>EMAIL <input data-signin="email" type="email" autocomplete="username"></label>
      <label>PASSWORD <input data-signin="password" type="password" autocomplete="current-password"></label>
      <label class="signin-name" hidden>NAME <input data-signin="name" type="text" autocomplete="nickname" placeholder="shown to your referee"></label>
      <div class="actions">
        <button data-signin="email-in" class="text-button action-button" type="button">[ SIGN IN ]</button>
        <button data-signin="toggle-create" class="text-button" type="button">[ CREATE AN ACCOUNT ]</button>
      </div>
      <div data-signin="status" class="signin-status"></div>
    </form>`;
  document.body.append(dialog);
  return dialog;
}

export function openSignInDialog() {
  const dialog = document.querySelector(`#${DIALOG_ID}`) ?? build();
  const field = (name) => dialog.querySelector(`[data-signin="${name}"]`);
  const status = field('status');
  const nameRow = dialog.querySelector('.signin-name');
  let creating = false;

  const setStatus = (text, kind = '') => {
    status.textContent = text;
    status.className = `signin-status${kind ? ` ${kind}` : ''}`;
  };

  const run = async (action) => {
    try {
      setStatus('WORKING…');
      const user = await action();
      setStatus('');
      dialog.close();
      return user;
    } catch (error) {
      // Firebase error codes are terse; the message is more use than the code.
      setStatus(error?.message ?? String(error), 'error');
      return null;
    }
  };

  field('close').onclick = () => dialog.close();
  field('google').onclick = () => run(() => signIn());
  field('email-in').onclick = () => run(() => (creating
    ? createAccountWithEmail(field('email').value.trim(), field('password').value, { displayName: field('name').value.trim() || null })
    : signInWithEmail(field('email').value.trim(), field('password').value)));
  field('toggle-create').onclick = () => {
    creating = !creating;
    nameRow.hidden = !creating;
    field('email-in').textContent = creating ? '[ CREATE ACCOUNT ]' : '[ SIGN IN ]';
    field('toggle-create').textContent = creating ? '[ I ALREADY HAVE ONE ]' : '[ CREATE AN ACCOUNT ]';
    setStatus('');
  };

  setStatus('');
  dialog.showModal();
  return dialog;
}
