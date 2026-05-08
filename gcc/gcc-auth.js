// gcc-auth.js v1.0.0 — 2026-04-08
// Firebase Auth integration for Graycloak's Campaign Corner
// Requires: gcc-firebase-config.js loaded first (provides GCC_FIREBASE_CONFIG)

const GCCAuth = (function() {

  let _app = null;
  let _auth = null;
  let _user = null;
  let _listeners = [];
  let _modal = null;
  let _initialized = false;

  const ESC = s => { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; };

  // ── Firebase SDK URLs (compat builds for vanilla JS) ──
  const FB_VERSION = '10.12.2';
  const FB_APP_URL = `https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-app-compat.js`;
  const FB_AUTH_URL = `https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-auth-compat.js`;

  function isConfigured() {
    return typeof GCC_FIREBASE_CONFIG !== 'undefined' &&
           GCC_FIREBASE_CONFIG.apiKey &&
           GCC_FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY';
  }

  // ── Load Firebase SDK dynamically ──
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

  async function initFirebase() {
    if (_initialized) return;
    if (!isConfigured()) {
      console.warn('[GCCAuth] Firebase not configured — auth disabled. Edit gcc-firebase-config.js');
      _initialized = true;
      _notifyListeners();
      return;
    }
    try {
      await loadScript(FB_APP_URL);
      await loadScript(FB_AUTH_URL);
      _app = firebase.initializeApp(GCC_FIREBASE_CONFIG);
      _auth = firebase.auth();
      _auth.onAuthStateChanged(user => {
        _user = user;
        _updateHeaderUI();
        _notifyListeners();
      });
      _auth.getRedirectResult().catch(e => console.warn('[GCCAuth] redirect result error:', e));
      _initialized = true;
    } catch(e) {
      console.error('[GCCAuth] Firebase init failed:', e);
      _initialized = true;
      _notifyListeners();
    }
  }

  // ── Listener system ──
  function onAuthChange(fn) {
    _listeners.push(fn);
    if (_initialized) fn(_user);
  }
  function _notifyListeners() {
    _listeners.forEach(fn => { try { fn(_user); } catch(e) {} });
  }

  // ── Auth actions ──
  async function register(email, password, displayName) {
    if (!_auth) throw new Error('Auth not initialized');
    const cred = await _auth.createUserWithEmailAndPassword(email, password);
    if (displayName && cred.user) {
      await cred.user.updateProfile({ displayName });
    }
    return cred.user;
  }

  async function signIn(email, password) {
    if (!_auth) throw new Error('Auth not initialized');
    const cred = await _auth.signInWithEmailAndPassword(email, password);
    return cred.user;
  }

function _isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|Mobile|CriOS|FxiOS/i.test(navigator.userAgent);
  }

  async function signInWithGoogle() {
    if (!_auth) throw new Error('Auth not initialized');
    const provider = new firebase.auth.GoogleAuthProvider();
    if (_isMobile()) {
      await _auth.signInWithRedirect(provider);
      return null;
    }
    try {
      const cred = await _auth.signInWithPopup(provider);
      return cred.user;
    } catch (e) {
      if (e.code === 'auth/popup-blocked' ||
          e.code === 'auth/operation-not-supported-in-this-environment' ||
          e.code === 'auth/cancelled-popup-request') {
        await _auth.signInWithRedirect(provider);
        return null;
      }
      throw e;
    }
  }

  async function signOut() {
    if (!_auth) return;
    await _auth.signOut();
  }

  async function resetPassword(email) {
    if (!_auth) throw new Error('Auth not initialized');
    await _auth.sendPasswordResetEmail(email);
  }

  function getUser() { return _user; }

  // ── Header UI ──
  function _getInitials(user) {
    if (user.displayName) {
      return user.displayName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }
    return (user.email || '?')[0].toUpperCase();
  }

  function _updateHeaderUI() {
    const slot = document.getElementById('gcc-auth-slot');
    if (!slot) return;

    if (!isConfigured()) {
      slot.innerHTML = '';
      return;
    }

    if (_user) {
      const name = ESC(_user.displayName || _user.email.split('@')[0]);
      const initials = ESC(_getInitials(_user));
      slot.innerHTML =
        `<div class="gcc-auth-wrap">` +
          `<button class="gcc-auth-chip" id="gcc-auth-chip">` +
            `<span class="gcc-auth-avatar">${initials}</span>` +
            `<span class="gcc-auth-name">${name}</span>` +
          `</button>` +
          `<div class="gcc-auth-dd" id="gcc-auth-dd">` +
            `<div class="gcc-auth-dd-email">${ESC(_user.email)}</div>` +
            `<div class="gcc-auth-dd-sync" id="gcc-auth-sync-status">Sync: connecting…</div>` +
            `<button class="gcc-auth-dd-item" id="gcc-auth-sync-btn">⟳ Sync Now</button>` +
            `<button class="gcc-auth-dd-item" id="gcc-auth-profile">Edit Profile</button>` +
            `<button class="gcc-auth-dd-item" id="gcc-auth-signout">Sign Out</button>` +
          `</div>` +
        `</div>`;
      _wireUserMenu();
    } else {
      slot.innerHTML =
        `<button class="gcc-auth-chip" id="gcc-auth-signin-btn">` +
          `<span class="gcc-auth-avatar">?</span>` +
          `<span class="gcc-auth-name">Sign In</span>` +
        `</button>`;
      document.getElementById('gcc-auth-signin-btn').addEventListener('click', () => showModal());
    }
  }

  function _wireUserMenu() {
    const chip = document.getElementById('gcc-auth-chip');
    const dd = document.getElementById('gcc-auth-dd');
    if (!chip || !dd) return;

    chip.addEventListener('click', e => {
      e.stopPropagation();
      dd.classList.toggle('open');
    });
    document.addEventListener('click', () => dd.classList.remove('open'), { once: false });

    const btnOut = document.getElementById('gcc-auth-signout');
    if (btnOut) btnOut.addEventListener('click', async () => {
      dd.classList.remove('open');
      await signOut();
    });

    const btnProfile = document.getElementById('gcc-auth-profile');
    if (btnProfile) btnProfile.addEventListener('click', () => {
      dd.classList.remove('open');
      showModal('profile');
    });

    // Sync button
    const btnSync = document.getElementById('gcc-auth-sync-btn');
    if (btnSync) btnSync.addEventListener('click', async () => {
      const status = document.getElementById('gcc-auth-sync-status');
      if (status) status.textContent = 'Sync: pushing…';
      btnSync.disabled = true;
      try {
        if (typeof GCCSync !== 'undefined') {
          await GCCSync.syncNow();
          if (status) status.textContent = 'Sync: up to date ✓';
        }
      } catch(e) {
        if (status) status.textContent = 'Sync: error';
      }
      btnSync.disabled = false;
    });

    // Listen for sync ready
    window.addEventListener('gcc-sync-ready', () => {
      const status = document.getElementById('gcc-auth-sync-status');
      if (status) status.textContent = 'Sync: active ✓';
    });
    window.addEventListener('gcc-sync-offline', () => {
      const status = document.getElementById('gcc-auth-sync-status');
      if (status) status.textContent = 'Sync: offline';
    });
    // If sync already active
    if (typeof GCCSync !== 'undefined' && GCCSync.isActive()) {
      const status = document.getElementById('gcc-auth-sync-status');
      if (status) status.textContent = 'Sync: active ✓';
    }
  }

  // ── Auth Modal ──
  function _createModal() {
    if (_modal) return;
    const overlay = document.createElement('div');
    overlay.className = 'gcc-auth-overlay';
    overlay.id = 'gcc-auth-overlay';
    overlay.innerHTML = _modalHTML();
    document.body.appendChild(overlay);
    _modal = overlay;

    overlay.addEventListener('click', e => { if (e.target === overlay) hideModal(); });
    overlay.querySelector('.gcc-auth-close').addEventListener('click', hideModal);

    _wireTabs();
    _wireForms();
  }

  function _modalHTML() {
    return `<div class="gcc-auth-modal">
      <button class="gcc-auth-close" title="Close">&times;</button>
      <div class="gcc-auth-hdr">
        <div class="gcc-auth-hdr-title" id="gcc-auth-modal-title">CAMPAIGN CORNER</div>
        <div class="gcc-auth-hdr-sub" id="gcc-auth-modal-sub">Sign in to sync across devices</div>
      </div>

      <div class="gcc-auth-tabs" id="gcc-auth-tabs">
        <button class="gcc-auth-tab active" data-tab="signin">Sign In</button>
        <button class="gcc-auth-tab" data-tab="register">Register</button>
      </div>

      <!-- Sign In Form -->
      <form class="gcc-auth-form" id="gcc-auth-form-signin">
        <div class="gcc-auth-msg" id="gcc-auth-msg-signin"></div>
        <div class="gcc-auth-field">
          <label class="gcc-auth-label" for="gcc-si-email">EMAIL</label>
          <input class="gcc-auth-input" id="gcc-si-email" type="email" placeholder="you@example.com" autocomplete="email" required>
        </div>
        <div class="gcc-auth-field">
          <label class="gcc-auth-label" for="gcc-si-pass">PASSWORD</label>
          <input class="gcc-auth-input" id="gcc-si-pass" type="password" placeholder="••••••••" autocomplete="current-password" required>
        </div>
        <button type="button" class="gcc-auth-forgot" id="gcc-auth-forgot">Forgot password?</button>
        <button type="submit" class="gcc-auth-submit">SIGN IN</button>
        <div class="gcc-auth-divider">OR</div>
        <button type="button" class="gcc-auth-google" id="gcc-auth-google-si">
          <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.87 7.36 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Sign in with Google
        </button>
      </form>

      <!-- Register Form -->
      <form class="gcc-auth-form" id="gcc-auth-form-register" style="display:none">
        <div class="gcc-auth-msg" id="gcc-auth-msg-register"></div>
        <div class="gcc-auth-field">
          <label class="gcc-auth-label" for="gcc-reg-name">DISPLAY NAME</label>
          <input class="gcc-auth-input" id="gcc-reg-name" type="text" placeholder="Graycloak" autocomplete="name" required>
        </div>
        <div class="gcc-auth-field">
          <label class="gcc-auth-label" for="gcc-reg-email">EMAIL</label>
          <input class="gcc-auth-input" id="gcc-reg-email" type="email" placeholder="you@example.com" autocomplete="email" required>
        </div>
        <div class="gcc-auth-field">
          <label class="gcc-auth-label" for="gcc-reg-pass">PASSWORD</label>
          <input class="gcc-auth-input" id="gcc-reg-pass" type="password" placeholder="At least 6 characters" autocomplete="new-password" required minlength="6">
        </div>
        <div class="gcc-auth-field">
          <label class="gcc-auth-label" for="gcc-reg-pass2">CONFIRM PASSWORD</label>
          <input class="gcc-auth-input" id="gcc-reg-pass2" type="password" placeholder="••••••••" autocomplete="new-password" required minlength="6">
        </div>
        <button type="submit" class="gcc-auth-submit">CREATE ACCOUNT</button>
        <div class="gcc-auth-divider">OR</div>
        <button type="button" class="gcc-auth-google" id="gcc-auth-google-reg">
          <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.87 7.36 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Sign up with Google
        </button>
      </form>

      <!-- Profile Form (shown when signed in) -->
      <form class="gcc-auth-form" id="gcc-auth-form-profile" style="display:none">
        <div class="gcc-auth-msg" id="gcc-auth-msg-profile"></div>
        <div class="gcc-auth-field">
          <label class="gcc-auth-label" for="gcc-prof-name">DISPLAY NAME</label>
          <input class="gcc-auth-input" id="gcc-prof-name" type="text" autocomplete="name">
        </div>
        <button type="submit" class="gcc-auth-submit">UPDATE PROFILE</button>
      </form>
    </div>`;
  }

  function _wireTabs() {
    const tabs = _modal.querySelectorAll('.gcc-auth-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        _showForm(tab.dataset.tab);
      });
    });
  }

  function _showForm(which) {
    const formSI = _modal.querySelector('#gcc-auth-form-signin');
    const formReg = _modal.querySelector('#gcc-auth-form-register');
    const formProf = _modal.querySelector('#gcc-auth-form-profile');
    const tabs = _modal.querySelector('#gcc-auth-tabs');
    const title = _modal.querySelector('#gcc-auth-modal-title');
    const sub = _modal.querySelector('#gcc-auth-modal-sub');

    formSI.style.display = 'none';
    formReg.style.display = 'none';
    formProf.style.display = 'none';

    _clearMessages();

    if (which === 'profile') {
      tabs.style.display = 'none';
      formProf.style.display = 'block';
      title.textContent = 'YOUR PROFILE';
      sub.textContent = _user ? _user.email : '';
      const nameInput = _modal.querySelector('#gcc-prof-name');
      if (_user) nameInput.value = _user.displayName || '';
    } else {
      tabs.style.display = 'flex';
      title.textContent = 'CAMPAIGN CORNER';
      sub.textContent = 'Sign in to sync across devices';
      if (which === 'register') {
        formReg.style.display = 'block';
      } else {
        formSI.style.display = 'block';
      }
    }
  }

  function _clearMessages() {
    _modal.querySelectorAll('.gcc-auth-msg').forEach(el => {
      el.className = 'gcc-auth-msg';
      el.textContent = '';
    });
  }

  function _showMsg(formId, text, type) {
    const el = _modal.querySelector(`#gcc-auth-msg-${formId}`);
    if (!el) return;
    el.className = 'gcc-auth-msg ' + type;
    el.textContent = text;
  }

  function _setSubmitting(form, busy) {
    const btn = form.querySelector('.gcc-auth-submit');
    if (btn) {
      btn.disabled = busy;
      btn.textContent = busy ? 'PLEASE WAIT…' : btn.dataset.origText || btn.textContent;
      if (!busy && !btn.dataset.origText) return;
      if (!btn.dataset.origText) btn.dataset.origText = btn.textContent.replace('PLEASE WAIT…', '');
    }
  }

  function _friendlyError(code) {
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
      'auth/invalid-credential': 'Invalid email or password.',
    };
    return map[code] || 'Something went wrong. Please try again.';
  }

  function _wireForms() {
    // Sign In
    const formSI = _modal.querySelector('#gcc-auth-form-signin');
    formSI.addEventListener('submit', async e => {
      e.preventDefault();
      _clearMessages();
      const email = _modal.querySelector('#gcc-si-email').value.trim();
      const pass = _modal.querySelector('#gcc-si-pass').value;
      if (!email || !pass) { _showMsg('signin', 'Please fill in all fields.', 'error'); return; }
      _setSubmitting(formSI, true);
      try {
        await signIn(email, pass);
        hideModal();
      } catch(err) {
        _showMsg('signin', _friendlyError(err.code), 'error');
      }
      _setSubmitting(formSI, false);
    });

    // Register
    const formReg = _modal.querySelector('#gcc-auth-form-register');
    formReg.addEventListener('submit', async e => {
      e.preventDefault();
      _clearMessages();
      const name = _modal.querySelector('#gcc-reg-name').value.trim();
      const email = _modal.querySelector('#gcc-reg-email').value.trim();
      const pass = _modal.querySelector('#gcc-reg-pass').value;
      const pass2 = _modal.querySelector('#gcc-reg-pass2').value;
      if (!name || !email || !pass || !pass2) { _showMsg('register', 'Please fill in all fields.', 'error'); return; }
      if (pass !== pass2) { _showMsg('register', 'Passwords do not match.', 'error'); return; }
      if (pass.length < 6) { _showMsg('register', 'Password must be at least 6 characters.', 'error'); return; }
      _setSubmitting(formReg, true);
      try {
        await register(email, pass, name);
        hideModal();
      } catch(err) {
        _showMsg('register', _friendlyError(err.code), 'error');
      }
      _setSubmitting(formReg, false);
    });

    // Profile update
    const formProf = _modal.querySelector('#gcc-auth-form-profile');
    formProf.addEventListener('submit', async e => {
      e.preventDefault();
      _clearMessages();
      const name = _modal.querySelector('#gcc-prof-name').value.trim();
      if (!name) { _showMsg('profile', 'Display name cannot be empty.', 'error'); return; }
      _setSubmitting(formProf, true);
      try {
        if (_user) {
          await _user.updateProfile({ displayName: name });
          await _user.reload();
          _user = _auth.currentUser;
          _updateHeaderUI();
          _showMsg('profile', 'Profile updated!', 'success');
        }
      } catch(err) {
        _showMsg('profile', _friendlyError(err.code), 'error');
      }
      _setSubmitting(formProf, false);
    });

    // Google buttons
    const googleSI = _modal.querySelector('#gcc-auth-google-si');
    const googleReg = _modal.querySelector('#gcc-auth-google-reg');
    const googleHandler = async (msgId) => {
      _clearMessages();
      try {
        await signInWithGoogle();
        hideModal();
      } catch(err) {
        _showMsg(msgId, _friendlyError(err.code), 'error');
      }
    };
    googleSI.addEventListener('click', () => googleHandler('signin'));
    googleReg.addEventListener('click', () => googleHandler('register'));

    // Forgot password
    const forgot = _modal.querySelector('#gcc-auth-forgot');
    forgot.addEventListener('click', async () => {
      _clearMessages();
      const email = _modal.querySelector('#gcc-si-email').value.trim();
      if (!email) { _showMsg('signin', 'Enter your email above, then click Forgot Password.', 'error'); return; }
      try {
        await resetPassword(email);
        _showMsg('signin', 'Password reset email sent! Check your inbox.', 'success');
      } catch(err) {
        _showMsg('signin', _friendlyError(err.code), 'error');
      }
    });
  }

  function showModal(tab) {
    _createModal();
    if (tab === 'profile' && _user) {
      _showForm('profile');
    } else if (tab === 'register') {
      _showForm('register');
      _modal.querySelectorAll('.gcc-auth-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === 'register');
      });
    } else {
      _showForm('signin');
      _modal.querySelectorAll('.gcc-auth-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === 'signin');
      });
    }
    _modal.classList.add('open');
  }

  function hideModal() {
    if (_modal) _modal.classList.remove('open');
  }

  // ── Init on DOM ready ──
  function init() {
    initFirebase().then(() => {
      _updateHeaderUI();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    register,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    getUser,
    onAuthChange,
    showModal,
    hideModal,
    isConfigured,
  };

})();
