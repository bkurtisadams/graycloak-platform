// auth.js v1.0.0 — sign-in only.
//
// Follows graycloak-adnd/public/adnd-auth.js: the Firebase compat SDK loaded
// from the CDN at runtime, Google popup sign-in, and a listener list so the
// client re-renders when the account changes.
//
// Nothing here reads or writes Firestore. Traveller remains a local
// application that keeps its campaigns in this browser; signing in only
// establishes an identity, which the campaign directory uses to record who
// plays which actor. If the SDK cannot be reached — offline, blocked, opened
// from file:// — the client carries on signed out and entirely local, which is
// how it has worked up to now and must keep working.

import { TRAVELLER_FIREBASE_CONFIG } from './firebase-config.js?v=v0.269.0';

const SDK_VERSION = '10.12.2';
const SDK_SCRIPTS = Object.freeze([
  `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app-compat.js`,
  `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth-compat.js`
]);

let auth = null;
let currentUser = null;
let status = 'idle';
let lastError = null;
const listeners = [];

function notify() {
  for (const listener of listeners) {
    try { listener(currentUser, status); } catch (error) { console.error(error); }
  }
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) { resolve(); return; }
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error(`failed to load ${url}`)));
    document.head.append(script);
  });
}

export function authStatus() {
  return { user: currentUser, status, error: lastError };
}

// v0.240.0: "sign-in is unavailable; the client is running local-only" said
// nothing about *why* — the actual reason (the SDK script failed to load,
// blocked by a network or a content policy; a bad Firebase config; offline)
// was captured in lastError and then never shown to anyone. Every place that
// refuses to act because auth never came up now says the real reason too.
function localOnlyError() {
  return new Error(`sign-in is unavailable; the client is running local-only${lastError ? ` \u2014 ${lastError}` : ''}`);
}

export function currentUserId() {
  return currentUser?.uid ?? null;
}

export function onAuthChange(listener) {
  listeners.push(listener);
  listener(currentUser, status);
}

export async function initAuth() {
  // v0.240.0: was `status !== 'idle'`, which made this a one-shot: a single
  // transient failure at page load (a network blip while the SDK scripts
  // were fetching, say) left status at 'unavailable' forever, and every
  // sign-in action failed for the rest of the page's life even once
  // whatever caused it had passed — the person had no way to know a reload
  // was the fix. 'unavailable' now retries; only an attempt already under
  // way, or one that already succeeded, is skipped.
  if (status === 'loading' || status === 'ready') return authStatus();
  status = 'loading';
  notify();
  try {
    for (const url of SDK_SCRIPTS) await loadScript(url);
    if (!globalThis.firebase?.initializeApp) throw new Error('Firebase SDK did not load');
    const app = globalThis.firebase.apps?.length
      ? globalThis.firebase.app()
      : globalThis.firebase.initializeApp(TRAVELLER_FIREBASE_CONFIG);
    auth = globalThis.firebase.auth(app);
    // v0.68.0: sign in every visit. Session persistence keeps the account for
    // this tab only, so a shared machine at the table does not carry one
    // person's account into the next window.
    try { await auth.setPersistence(globalThis.firebase.auth.Auth.Persistence.SESSION); }
    catch (error) { console.warn('[traveller-auth] session persistence unavailable:', error?.message ?? error); }
    auth.onAuthStateChanged((user) => {
      currentUser = user ?? null;
      status = 'ready';
      notify();
    });
    status = 'ready';
  } catch (error) {
    // Offline or blocked: stay local. This is a supported state, not a failure.
    console.warn('[traveller-auth] running signed out and local:', error?.message ?? error);
    lastError = error?.message ?? String(error);
    status = 'unavailable';
  }
  notify();
  return authStatus();
}

// A sign-in action calls this instead of checking `auth` itself, so a
// status of 'unavailable' gets one fresh attempt right when someone is
// actually trying to sign in, rather than failing on the strength of
// whatever happened once, unattended, back at page load.
async function ensureAuth() {
  if (!auth) await initAuth();
  if (!auth) throw localOnlyError();
  return auth;
}

export async function signIn() {
  await ensureAuth();
  const provider = new globalThis.firebase.auth.GoogleAuthProvider();
  const credential = await auth.signInWithPopup(provider);
  return credential.user;
}

// Email and password, for players without a Google account — and for making
// test accounts, which Google will not let you invent.
export async function signInWithEmail(email, password) {
  await ensureAuth();
  const credential = await auth.signInWithEmailAndPassword(email, password);
  return credential.user;
}

export async function createAccountWithEmail(email, password, { displayName = null } = {}) {
  await ensureAuth();
  const credential = await auth.createUserWithEmailAndPassword(email, password);
  if (displayName) {
    try { await credential.user.updateProfile({ displayName }); } catch (error) { console.warn(error); }
  }
  return credential.user;
}

// v0.207.1: Firebase's messages are written for developers ("Firebase: Error
// (auth/invalid-credential).") and say nothing a person at the sign-in box can
// act on. Say what happened, and keep the code so a report can name it.
const AUTH_ERROR_TEXT = Object.freeze({
  'auth/invalid-credential': 'That email and password do not match. If you usually sign in with Google using this address, the account has no password yet: sign in with Google, or use Set or reset password to choose one.',
  'auth/wrong-password': 'That password is not right for this email.',
  'auth/user-not-found': 'No account uses that email. Create the account first.',
  'auth/invalid-email': 'That is not a complete email address.',
  'auth/missing-password': 'Enter a password.',
  'auth/missing-email': 'Enter an email address.',
  'auth/weak-password': 'Passwords need at least six characters.',
  'auth/email-already-in-use': 'An account already uses that email. If it is your Google sign-in, it has no password yet: use Set or reset password to choose one.',
  'auth/operation-not-allowed': 'Email sign-in is switched off for this Firebase project. Enable Email/Password under Authentication, Sign-in method.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'The sign-in service could not be reached. Check the connection.',
  'auth/unauthorized-domain': 'This address is not an authorized domain for the Firebase project.',
  'auth/popup-blocked': 'The browser blocked the Google window. Allow pop-ups for this site.',
  'auth/popup-closed-by-user': 'The Google window was closed before sign-in finished.',
  'auth/user-disabled': 'That account has been disabled.',
  'auth/requires-recent-login': 'For safety Firebase only changes a password just after signing in. Sign out, sign in with Google again, and set the password straight away.',
  'auth/provider-already-linked': 'This account already has a password. Try again; it will be replaced rather than added.',
  'auth/credential-already-in-use': 'Another account already uses that email with a password.'
});

// v0.207.2: one account per email address. Someone who first signed in with
// Google has an account with no password on it, so email sign-in answers
// invalid-credential and creating the account answers email-already-in-use.
// Firebase's reset email is the way out: finishing it puts a password on the
// existing account, which then accepts either sign-in. Firebase answers the
// same whether or not the address has an account, so this never reveals one.
export async function sendPasswordReset(email) {
  await ensureAuth();
  await auth.sendPasswordResetEmail(email);
}

// v0.207.3: set the password from inside the account, with no email involved.
// An account reached through Google can be given a password (link), and one
// that already has a password can have it replaced (update). Firebase insists
// the sign-in be recent, which it is for someone who has just used Google.
export function accountProviders() {
  return (currentUser?.providerData ?? []).map((entry) => entry.providerId);
}

export async function setAccountPassword(password) {
  if (!auth || !currentUser) throw new Error('sign in first');
  if (!currentUser.email) throw new Error('this account has no email address to sign in with');
  if (String(password ?? '').length < 6) throw Object.assign(new Error('weak password'), { code: 'auth/weak-password' });
  if (accountProviders().includes('password')) await currentUser.updatePassword(password);
  else await currentUser.linkWithCredential(globalThis.firebase.auth.EmailAuthProvider.credential(currentUser.email, password));
  try { await currentUser.reload(); } catch (error) { console.warn(error); }
  // v0.207.4: prove it. Re-authenticate with the email and the password just
  // set; if Firebase accepts that, email sign-in with the same two values
  // cannot fail for any reason inside Firebase. A failure here is reported as
  // a failure to set, not swallowed.
  const credential = globalThis.firebase.auth.EmailAuthProvider.credential(currentUser.email, password);
  await currentUser.reauthenticateWithCredential(credential);
  return { email: currentUser.email, verified: true, providers: accountProviders(), length: String(password).length };
}

// What was actually sent, for the sign-in box to show beside a failure: the
// address as Firebase received it, and the password's length and whether it
// carried stray spaces. Never the password itself.
export function describeAttempt(email, password) {
  const value = String(password ?? '');
  const notes = [`${value.length} character${value.length === 1 ? '' : 's'}`];
  if (value !== value.trim()) notes.push('with a space at the start or end');
  if (/[A-Z]/.test(value) && !/[a-z]/.test(value)) notes.push('all capitals, check Caps Lock');
  return `Tried "${email}" with a password of ${notes.join(', ')}.`;
}

export function describeAuthError(error) {
  const code = typeof error?.code === 'string' ? error.code : null;
  const text = code ? AUTH_ERROR_TEXT[code] : null;
  if (text) return `${text} (${code})`;
  return error?.message ?? String(error);
}

export async function signOutOfTraveller() {
  if (!auth) return;
  await auth.signOut();
}
