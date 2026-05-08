// gcc-images.js v1.1.0 — 2026-04-24
// v1.1.0: add downscale() helper for capping data URL size before upload
// IndexedDB image store for Graycloak's Campaign Corner// IndexedDB image store for Graycloak's Campaign Corner
// Stores image data URLs in IndexedDB to avoid localStorage quota limits.
// Campaign/session data stores an image key (e.g. "img_ses_1234") instead
// of the raw data URL. This module handles put/get/delete/bulk operations.

const GCCImages = (function() {
  const DB_NAME = 'gcc-images';
  const DB_VERSION = 1;
  const STORE_NAME = 'images';
  let _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          // DB exists at this version but store is missing — version bump to create it
          db.close();
          const req2 = indexedDB.open(DB_NAME, db.version + 1);
          req2.onupgradeneeded = e2 => {
            const db2 = e2.target.result;
            if (!db2.objectStoreNames.contains(STORE_NAME)) {
              db2.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
          };
          req2.onsuccess = e2 => { _db = e2.target.result; resolve(_db); };
          req2.onerror = e2 => { console.warn('[GCCImages] DB upgrade failed:', e2); reject(e2); };
          return;
        }
        _db = db;
        resolve(_db);
      };
      req.onerror = e => { console.warn('[GCCImages] DB open failed:', e); reject(e); };
    });
  }

  // Generate a unique image key
  function genKey(prefix) {
    return (prefix || 'img') + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  // Store an image data URL under a key. Returns the key.
  async function put(key, dataUrl) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ key, data: dataUrl });
      tx.oncomplete = () => resolve(key);
      tx.onerror = e => { console.warn('[GCCImages] put failed:', key, e); reject(e); };
    });
  }

  // Store a new image, generating a key. Returns the key.
  async function store(dataUrl, prefix) {
    const key = genKey(prefix || 'img');
    await put(key, dataUrl);
    return key;
  }

  // Retrieve an image data URL by key. Returns null if not found.
  async function get(key) {
    if (!key) return null;
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = e => { console.warn('[GCCImages] get failed:', key, e); resolve(null); };
    });
  }

  // Retrieve multiple images by keys. Returns { key: dataUrl, ... }
  async function getBulk(keys) {
    if (!keys || !keys.length) return {};
    const db = await open();
    const result = {};
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      let pending = keys.length;
      keys.forEach(key => {
        if (!key) { pending--; if (!pending) resolve(result); return; }
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result) result[key] = req.result.data;
          pending--;
          if (!pending) resolve(result);
        };
        req.onerror = () => { pending--; if (!pending) resolve(result); };
      });
      if (!pending) resolve(result);
    });
  }

  // Delete an image by key
  async function remove(key) {
    if (!key) return;
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = e => { console.warn('[GCCImages] remove failed:', key, e); resolve(); };
    });
  }

  // Delete multiple images by keys
  async function removeBulk(keys) {
    if (!keys || !keys.length) return;
    const db = await open();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      keys.forEach(k => { if (k) store.delete(k); });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  // Check if a string is an image key (not a data URL)
  function isKey(val) {
    return val && typeof val === 'string' && val.startsWith('img_') && !val.startsWith('data:');
  }

  // Check if a string is a data URL (inline image data)
  function isDataUrl(val) {
    return val && typeof val === 'string' && val.startsWith('data:');
  }

  // Downscale a data URL to fit within maxPx (longest edge) and maxBytes.
  // Returns a new data URL (JPEG, quality 0.85 stepping down to 0.4).
  // Passes through if already small.
  async function downscale(dataUrl, maxPx, maxBytes) {
    maxPx = maxPx || 1600;
    maxBytes = maxBytes || 1.5 * 1024 * 1024;
    if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
    if (dataUrl.length * 0.75 < maxBytes) return dataUrl;
    const img = new Image();
    try {
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const qualities = [0.85, 0.7, 0.55, 0.4];
      let out = dataUrl;
      for (const q of qualities) {
        out = canvas.toDataURL('image/jpeg', q);
        if (out.length * 0.75 < maxBytes) break;
      }
      canvas.width = 0; canvas.height = 0;
      return out;
    } finally {
      img.src = '';
    }
  }
  
  // Migrate an inline data URL to IndexedDB, returning the new key.
  // If already a key, returns it unchanged.
  async function migrate(val, prefix) {
    if (!val) return '';
    if (isKey(val)) return val;
    if (isDataUrl(val)) return await store(val, prefix);
    return val; // unknown format, leave as-is
  }

  return {
    open,
    genKey,
    put,
    store,
    get,
    getBulk,
    remove,
    removeBulk,
    isKey,
    isDataUrl,
    migrate,
    downscale,
  };
})();
