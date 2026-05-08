// adnd-auth.js v1.0.0
// Minimal auth for adnd.graycloak.net — Google sign-in only.
// Full email/password + modal UI can be ported from gcc-auth.js in week 2.

const ADNDAuth = (function() {

  let _app = null;
  let _auth = null;
  let _db = null;
  let _user = null;
  let _listeners = [];
  let _initialized = false;

  const FB_VERSION = '10.12.2';
  const FB_APP_URL       = `https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-app-compat.js`;
  const FB_AUTH_URL      = `https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-auth-compat.js`;
  const FB_FIRESTORE_URL = `https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-firestore-compat.js`;

  function isConfigured() {
    return typeof ADND_FIREBASE_CONFIG !== 'undefined' &&
           ADND_FIREBASE_CONFIG.apiKey &&
           !ADND_FIREBASE_CONFIG.apiKey.startsWith('PASTE_');
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load ' + url));
      document.head.appendChild(s);
    });
  }

  async function init() {
    if (_initialized) return;
    if (!isConfigured()) {
      console.warn('[ADNDAuth] Firebase config not set — edit adnd-firebase-config.js');
      _initialized = true;
      _notifyListeners();
      return;
    }
    try {
      await loadScript(FB_APP_URL);
      await loadScript(FB_AUTH_URL);
      await loadScript(FB_FIRESTORE_URL);
      _app = firebase.initializeApp(ADND_FIREBASE_CONFIG);
      _auth = firebase.auth();
      _db = firebase.firestore();
      _auth.onAuthStateChanged(user => {
        _user = user;
        _notifyListeners();
      });
      _initialized = true;
    } catch(e) {
      console.error('[ADNDAuth] init failed:', e);
      _initialized = true;
      _notifyListeners();
    }
  }

  function onAuthChange(fn) {
    _listeners.push(fn);
    if (_initialized) fn(_user);
  }
  function _notifyListeners() {
    _listeners.forEach(fn => { try { fn(_user); } catch(e) {} });
  }

  async function signInWithGoogle() {
    if (!_auth) throw new Error('Auth not initialized');
    const provider = new firebase.auth.GoogleAuthProvider();
    const cred = await _auth.signInWithPopup(provider);
    return cred.user;
  }

  async function signOut() {
    if (!_auth) return;
    await _auth.signOut();
  }

  function getUser() { return _user; }
  function getDb()   { return _db; }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { signInWithGoogle, signOut, getUser, getDb, onAuthChange, isConfigured };

})();
