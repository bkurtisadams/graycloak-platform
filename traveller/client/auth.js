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

import { TRAVELLER_FIREBASE_CONFIG } from './firebase-config.js';

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

export function currentUserId() {
  return currentUser?.uid ?? null;
}

export function onAuthChange(listener) {
  listeners.push(listener);
  listener(currentUser, status);
}

export async function initAuth() {
  if (status !== 'idle') return authStatus();
  status = 'loading';
  notify();
  try {
    for (const url of SDK_SCRIPTS) await loadScript(url);
    if (!globalThis.firebase?.initializeApp) throw new Error('Firebase SDK did not load');
    const app = globalThis.firebase.apps?.length
      ? globalThis.firebase.app()
      : globalThis.firebase.initializeApp(TRAVELLER_FIREBASE_CONFIG);
    auth = globalThis.firebase.auth(app);
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

export async function signIn() {
  if (!auth) throw new Error('sign-in is unavailable; the client is running local-only');
  const provider = new globalThis.firebase.auth.GoogleAuthProvider();
  const credential = await auth.signInWithPopup(provider);
  return credential.user;
}

export async function signOutOfTraveller() {
  if (!auth) return;
  await auth.signOut();
}
