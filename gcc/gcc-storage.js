// gcc-storage.js v1.0.0 — 2026-04-12
// Firebase Storage for shared campaign images
// Uploads image data URLs to Storage, returns download URLs for player access.
// Requires: gcc-firebase-config.js (loaded), gcc-auth.js

const GCCStorage = (function() {

  const FB_VERSION = '10.12.2';
  const FB_STORAGE_URL = `https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-storage-compat.js`;

  let _storage = null;
  let _ready = false;

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
    if (_storage) return _storage;
    try {
      await loadScript(FB_STORAGE_URL);
      _storage = firebase.storage();
      _ready = true;
      return _storage;
    } catch(e) {
      console.warn('[GCCStorage] init failed:', e);
      return null;
    }
  }

  function getUid() {
    return (typeof GCCAuth !== 'undefined' && GCCAuth.getUser()) ? GCCAuth.getUser().uid : null;
  }

  // Upload a data URL to Firebase Storage. Returns the download URL.
  // path: storage path, e.g. "campaigns/{campId}/banner.jpg"
  // dataUrl: "data:image/jpeg;base64,..." or "data:image/png;base64,..."
  async function upload(path, dataUrl) {
    if (!_storage) await init();
    if (!_storage) return null;
    // Safety: only accept actual data URLs
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      if (dataUrl && (dataUrl.startsWith('http://') || dataUrl.startsWith('https://'))) return dataUrl;
      return null;
    }
    try {
      const ref = _storage.ref(path);
      const resp = await fetch(dataUrl);
      const blob = await resp.blob();
      const snap = await ref.put(blob, { contentType: blob.type });
      const url = await snap.ref.getDownloadURL();
      return url;
    } catch(e) {
      console.warn('[GCCStorage] upload failed:', path, e);
      return null;
    }
  }

  // Delete a file from Storage (best-effort, no error on missing)
  async function remove(path) {
    if (!_storage) await init();
    if (!_storage) return;
    try {
      await _storage.ref(path).delete();
    } catch(e) {
      // ignore — file may not exist
    }
  }

  // Check if a string is a Firebase Storage download URL
  function isStorageUrl(val) {
    return val && typeof val === 'string' && val.includes('firebasestorage');
  }

  // Upload a campaign image if it's a data URL or IndexedDB key.
  // Returns the Storage download URL, or the original value if already a URL.
  // imgVal: image value (data URL, IDB key, Storage URL, or empty)
  // storagePath: where to store in Firebase Storage
  // getFromIDB: async function(key) => dataUrl, for resolving IDB keys
  async function uploadCampaignImage(imgVal, storagePath, getFromIDB) {
    if (!imgVal) return '';
    // Already a Storage URL — keep it
    if (isStorageUrl(imgVal)) return imgVal;
    // Already a regular URL — keep it
    if (imgVal.startsWith('http://') || imgVal.startsWith('https://')) return imgVal;
    // Data URL — upload directly
    if (imgVal.startsWith('data:')) {
      return (await upload(storagePath, imgVal)) || '';
    }
    // IndexedDB key — resolve then upload
    if (typeof getFromIDB === 'function') {
      const dataUrl = await getFromIDB(imgVal);
      if (dataUrl) return (await upload(storagePath, dataUrl)) || '';
    }
    return '';
  }

  return {
    init,
    upload,
    remove,
    isStorageUrl,
    uploadCampaignImage,
  };

})();
