// ---------------------------------------------------------------------------
// odd/online.mjs — slice 5, step 4 (Oct 2026): a page's line to the server.
//
// Loads the Firebase SDK from the CDN only when online play is chosen, so
// local play needs no network. One fight is open at a time:
//   createFight(data)   oddCreateFight (the referee opens a fight)
//   openFight(...)      listens to the header, this viewer's view, feed and chat
//   listFights(cid)     a player's fights in a campaign; listAllFights(cid) the referee's
//   deleteFight(...)    oddDeleteFight (the referee removes a fight)
//   chat(data)          oddChat: a line or a /roll, to everyone or privately
//   send(action)        oddAction, one at a time, each carrying the newest
//                       rev the page knows (from the last answer or listener)
// The page never changes the fight itself in online play; it draws whatever
// the view says, and shows each feed entry once, in rev order.
//
// ?emu=1 on the page's URL points everything at the local emulators
// (auth 9099, Firestore 8080, functions 5001).
// ---------------------------------------------------------------------------

import { ODD_FIREBASE_CONFIG } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';

export async function connectOnline({ emulators = false } = {}) {
  const [appSdk, authSdk, fsSdk, fnSdk] = await Promise.all([
    import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`), import(`${SDK}/firebase-functions.js`)
  ]);
  const app = appSdk.initializeApp(ODD_FIREBASE_CONFIG, 'odd-online');
  const auth = authSdk.getAuth(app);
  const db = fsSdk.getFirestore(app);
  const fns = fnSdk.getFunctions(app, 'us-central1');
  if (emulators) {
    authSdk.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    fsSdk.connectFirestoreEmulator(db, '127.0.0.1', 8080);
    fnSdk.connectFunctionsEmulator(fns, '127.0.0.1', 5001);
  }
  const createCall = fnSdk.httpsCallable(fns, 'oddCreateFight');
  const actionCall = fnSdk.httpsCallable(fns, 'oddAction');
  const deleteCall = fnSdk.httpsCallable(fns, 'oddDeleteFight');
  const chatCall = fnSdk.httpsCallable(fns, 'oddChat');

  let open = null;      // { cid, fid, viewer, rev, unsubs, seen }
  let queue = Promise.resolve();

  const call = async (fn, data) => {
    try { return (await fn(data)).data; }
    catch (error) { return { ok: false, code: error?.code ?? 'error', error: error?.message ?? String(error) }; }
  };

  function closeFight() {
    for (const u of open?.unsubs ?? []) u();
    open = null;
  }

  return {
    get user() { return auth.currentUser; },
    get fight() { return open ? { cid: open.cid, fid: open.fid, viewer: open.viewer, rev: open.rev } : null; },
    onUser(cb) { return authSdk.onAuthStateChanged(auth, cb); },
    // Sign-in as GCC does it (gcc/gcc-auth.js): email and password first, Google as the other way in.
    // Same Firebase project, so a GCC account works here unchanged.
    signInEmail: (email, password) => authSdk.signInWithEmailAndPassword(auth, email, password),
    async register(email, password, displayName) {
      const cred = await authSdk.createUserWithEmailAndPassword(auth, email, password);
      if (displayName) await authSdk.updateProfile(cred.user, { displayName });
      return cred.user;
    },
    resetPassword: (email) => authSdk.sendPasswordResetEmail(auth, email),
    // Google always shows its account chooser, so a second account can be picked in a browser
    // already signed in to Google; a blocked popup falls back to a redirect, as on GCC.
    async signInGoogle() {
      const provider = new authSdk.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try { return await authSdk.signInWithPopup(auth, provider); }
      catch (e) {
        if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) return authSdk.signInWithRedirect(auth, provider);
        throw e;
      }
    },
    signOut: () => { closeFight(); return authSdk.signOut(auth); },
    /** GCC's wording for Firebase sign-in errors. */
    friendlyError(e) {
      const map = {
        'auth/email-already-in-use': 'That email is already registered. Try signing in.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with that email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/invalid-credential': 'Invalid email or password.'
      };
      return map[e?.code] ?? e?.message ?? 'Something went wrong. Please try again.';
    },
    createFight: (data) => call(createCall, data),
    /** A player's fights in one campaign (the rules let him list only those naming him). */
    async listFights(cid) {
      const uid = auth.currentUser?.uid; if (!uid) return [];
      const q = fsSdk.query(fsSdk.collection(db, `oddCampaigns/${cid}/fights`), fsSdk.where('players', 'array-contains', uid));
      const snap = await fsSdk.getDocs(q);
      return snap.docs.map((d) => ({ fid: d.id, ...d.data() })).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    },
    /** Every fight in a campaign: the referee's list (the rules let only him list them all). */
    async listAllFights(cid) {
      const snap = await fsSdk.getDocs(fsSdk.collection(db, `oddCampaigns/${cid}/fights`));
      return snap.docs.map((d) => ({ fid: d.id, ...d.data() })).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    },
    deleteFight: (cid, fid) => call(deleteCall, { cid, fid }),
    closeFight,

    /** Listen to one fight as viewer ("referee" or a player's uid). */
    openFight({ cid, fid, viewer, onHeader, onView, onEntry, onChat, onError }) {
      closeFight();
      const base = `oddCampaigns/${cid}/fights/${fid}`;
      const me = { cid, fid, viewer, rev: 0, unsubs: [], seen: new Set() };
      open = me;
      const bump = (rev) => { if (Number.isInteger(rev) && rev > me.rev) me.rev = rev; };
      // Each listener names what it was reading, so a refusal says where.
      const fail = (what) => (error) => onError?.(`reading ${what} (${base}): ${error?.message ?? String(error)}`);
      me.unsubs.push(fsSdk.onSnapshot(fsSdk.doc(db, base), (snap) => { if (!snap.exists()) return fail('the fight header')({ message: 'no such fight' }); bump(snap.data().rev); onHeader?.(snap.data()); }, fail('the fight header')));
      me.unsubs.push(fsSdk.onSnapshot(fsSdk.doc(db, `${base}/views/${viewer}`), (snap) => { if (!snap.exists()) return; bump(snap.data().rev); onView?.(snap.data()); }, fail(`the ${viewer === 'referee' ? "referee's" : "player's"} view`)));
      me.unsubs.push(fsSdk.onSnapshot(fsSdk.query(fsSdk.collection(db, `${base}/feeds/${viewer}/entries`), fsSdk.orderBy('rev')), (snap) => {
        const fresh = snap.docChanges().filter((c) => c.type === 'added').map((c) => c.doc.data()).filter((e) => !me.seen.has(e.rev)).sort((a, b) => a.rev - b.rev);
        for (const e of fresh) { me.seen.add(e.rev); onEntry?.(e); }
      }, fail('the log')));
      const said = new Set();
      me.unsubs.push(fsSdk.onSnapshot(fsSdk.query(fsSdk.collection(db, `${base}/chat/${viewer}/entries`), fsSdk.orderBy('at')), (snap) => {
        for (const c of snap.docChanges()) { const e = c.doc.data(); if (c.type !== 'added' || said.has(e.id)) continue; said.add(e.id); onChat?.(e); }
      }, fail('the chat')));
    },

    /** A chat line { text, to, as } in the open fight. */
    chat(data) {
      const me = open;
      if (!me) return Promise.resolve({ ok: false, code: 'closed', error: 'no fight is open' });
      return call(chatCall, { cid: me.cid, fid: me.fid, ...data });
    },

    /** One action, after any still on its way. Resolves to the server's answer. */
    send(action, rules) {
      const me = open;
      if (!me) return Promise.resolve({ ok: false, code: 'closed', error: 'no fight is open' });
      queue = queue.then(async () => {
        const res = await call(actionCall, { cid: me.cid, fid: me.fid, rev: me.rev, rules, action });
        if (Number.isInteger(res.rev) && res.rev > me.rev) me.rev = res.rev;
        return res;
      });
      return queue;
    }
  };
}
