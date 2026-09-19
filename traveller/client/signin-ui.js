// signin-ui.js — the sign-in dialog, shared by the referee client and the
// player page.
//
// Google is offered because most people have it; email and password because
// some do not, and because Google will not let you invent an account for
// testing. Firebase has both enabled.

import { signIn, signInWithEmail, createAccountWithEmail, describeAuthError, sendPasswordReset, setAccountPassword, accountProviders, authStatus, describeAttempt } from './auth.js?v=v0.218.1';

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
      <label class="signin-show"><input data-signin="show" type="checkbox"> SHOW PASSWORD <span class="signin-hint">(browsers sometimes fill in an old one)</span></label>
      <label class="signin-name" hidden>NAME <input data-signin="name" type="text" autocomplete="nickname" placeholder="shown to your referee"></label>
      <div class="actions">
        <button data-signin="email-in" class="text-button action-button" type="button">[ SIGN IN ]</button>
        <button data-signin="toggle-create" class="text-button" type="button">[ CREATE AN ACCOUNT ]</button>
        <button data-signin="reset" class="text-button" type="button" title="Emails a link that lets you choose a password. Use it if you usually sign in with Google and want email sign-in too.">[ SET OR RESET PASSWORD ]</button>
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
      setStatus(describeAuthError(error), 'error');
      return null;
    }
  };

  // v0.207.1: the dialog element outlives this call but `creating` does not.
  // Reopened after [ CREATE AN ACCOUNT ], it still showed the create form
  // while `creating` was false again, so [ CREATE ACCOUNT ] tried to sign in
  // to an account that did not exist. Every open starts from sign-in.
  const showMode = () => {
    nameRow.hidden = !creating;
    field('email-in').textContent = creating ? '[ CREATE ACCOUNT ]' : '[ SIGN IN ]';
    field('toggle-create').textContent = creating ? '[ I ALREADY HAVE ONE ]' : '[ CREATE AN ACCOUNT ]';
    field('password').setAttribute('autocomplete', creating ? 'new-password' : 'current-password');
  };
  showMode();
  field('password').value = '';
  // Enter in either box does what the button does.
  for (const name of ['email', 'password', 'name']) {
    field(name).onkeydown = (event) => { if (event.key === 'Enter') { event.preventDefault(); field('email-in').click(); } };
  }

  field('show').checked = false;
  field('password').type = 'password';
  field('show').onchange = () => { field('password').type = field('show').checked ? 'text' : 'password'; };

  field('close').onclick = () => dialog.close();
  field('google').onclick = () => run(() => signIn());
  field('email-in').onclick = async () => {
    const email = field('email').value.trim();
    const password = field('password').value;
    const user = await run(() => (creating
      ? createAccountWithEmail(email, password, { displayName: field('name').value.trim() || null })
      : signInWithEmail(email, password)));
    // v0.207.4: a failure says what was sent, so a stale autofill or a typo
    // in the address is visible instead of guessed at.
    if (!user && !creating) setStatus(`${status.textContent} ${describeAttempt(email, password)}`, 'error');
  };
  // v0.207.2: a Google-only account has no password, which email sign-in
  // reports as invalid-credential. The reset email puts one on it.
  field('reset').onclick = async () => {
    const email = field('email').value.trim();
    if (!email) { setStatus('Enter your email address first, then press this again.', 'error'); field('email').focus(); return; }
    try {
      setStatus('WORKING\u2026');
      await sendPasswordReset(email);
      setStatus(`If ${email} has a Graycloak account, an email is on its way with a link to choose a password. Check spam too. Then sign in here with that password.`, 'ok');
    } catch (error) {
      setStatus(describeAuthError(error), 'error');
    }
  };
  field('toggle-create').onclick = () => {
    creating = !creating;
    showMode();
    setStatus('');
  };

  setStatus('');
  dialog.showModal();
  return dialog;
}

// v0.207.3: for someone already signed in (with Google, say): give the account
// a password, or replace the one it has, without waiting on a reset email.
const PASSWORD_DIALOG_ID = 'traveller-password-dialog';

export function openPasswordDialog() {
  let dialog = document.querySelector(`#${PASSWORD_DIALOG_ID}`);
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = PASSWORD_DIALOG_ID;
    dialog.className = 'roll-dialog signin-dialog';
    dialog.innerHTML = `
      <form class="roll-dialog-form" method="dialog">
        <div class="roll-dialog-heading">
          <strong>ACCOUNT PASSWORD</strong>
          <button data-pw="close" class="text-button" type="button">[ CLOSE ]</button>
        </div>
        <div data-pw="basis" class="signin-basis"></div>
        <label>NEW PASSWORD <input data-pw="password" type="text" autocomplete="new-password" minlength="6"></label>
        <div class="actions">
          <button data-pw="save" class="text-button action-button" type="button">[ SET PASSWORD ]</button>
        </div>
        <div data-pw="status" class="signin-status"></div>
      </form>`;
    document.body.append(dialog);
  }
  const field = (name) => dialog.querySelector(`[data-pw="${name}"]`);
  const { user } = authStatus();
  const hasPassword = accountProviders().includes('password');
  field('basis').textContent = user?.email
    ? `${user.email} ${hasPassword ? 'already has a password; this replaces it' : 'has no password yet; this adds one'}. It is a Graycloak password, separate from your Google one. Afterwards you can sign in with Google or with this email and password. At least six characters; it is shown as you type so there is no doubt what was set.`
    : 'Sign in first.';
  field('password').value = '';
  field('status').textContent = '';
  field('status').className = 'signin-status';
  field('close').onclick = () => dialog.close();
  field('password').onkeydown = (event) => { if (event.key === 'Enter') { event.preventDefault(); field('save').click(); } };
  field('save').onclick = async () => {
    const status = field('status');
    try {
      status.className = 'signin-status';
      status.textContent = 'WORKING\u2026';
      const result = await setAccountPassword(field('password').value);
      status.className = 'signin-status ok';
      status.textContent = `PASSWORD SET AND CHECKED: Firebase accepted ${result.email} with the new ${result.length}-character password just now. Sign-in methods on this account: ${result.providers.join(', ')}.`;
      field('password').value = '';
    } catch (error) {
      status.className = 'signin-status error';
      status.textContent = describeAuthError(error);
    }
  };
  dialog.showModal();
  field('password').focus();
  return dialog;
}
