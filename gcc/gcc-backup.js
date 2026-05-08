// gcc-backup.js v1.2.0 — 2026-05-03
// v1.2.0: include subhex + fog data. Subhex overrides, regions, lakes,
// migration flag, and per-map fog state were not previously backed up,
// despite holding the bulk of authored map data (thousands of cells
// per campaign). May 2 corruption that destroyed ~25% of authored
// subhex data was unrecoverable for this reason.
// v1.1.0 — 2026-04-12
// Full data export/import for Graycloak's Campaign Corner
// Captures: all localStorage sync keys + IndexedDB images
// Requires: gcc-data.js, gcc-images.js, gcc-dialog.js

const GCCBackup = (function() {

  const BACKUP_VERSION = 1;

  // All localStorage keys to include in backup
  const ALL_KEYS = [
    'gcc-campaigns',
    'gcc-activity',
    'gcc-jumpback',
    'gcc-vtts',
    'gcc-settings',
    'mp-char-list',
    'mp-veh-list',
    'mp-campaigns',
    'mp-campaign-sel',
    'gcc-faserip-chars',
    'gcc-add1e-chars',
    'gcc-subhex-overrides',
    'gcc-subhex-regions',
    'gcc-subhex-lakes',
    'gcc-subhex-migrated-v5',
    'gcc-fog-greyhawk',
    'gcc-fog-preview',
  ];

  // ── Export ──

  async function getAllImages() {
    const dbName = 'gcc-images';
    const storeName = 'images';
    return new Promise((resolve) => {
      const req = indexedDB.open(dbName, 1);
      req.onerror = () => resolve({});
      req.onsuccess = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(storeName)) { db.close(); resolve({}); return; }
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          const map = {};
          (getAll.result || []).forEach(row => { map[row.key] = row.data; });
          db.close();
          resolve(map);
        };
        getAll.onerror = () => { db.close(); resolve({}); };
      };
    });
  }

  async function exportAll() {
    const data = {};
    ALL_KEYS.forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try { data[key] = JSON.parse(raw); }
        catch(e) { data[key] = raw; }
      }
    });

    const images = await getAllImages();

    const backup = {
      _gccBackup: true,
      version: BACKUP_VERSION,
      created: new Date().toISOString(),
      userAgent: navigator.userAgent,
      localStorage: data,
      images: images,
    };

    const json = JSON.stringify(backup);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const stamp = d.getFullYear() +
      String(d.getMonth()+1).padStart(2,'0') +
      String(d.getDate()).padStart(2,'0') + '_' +
      String(d.getHours()).padStart(2,'0') +
      String(d.getMinutes()).padStart(2,'0');
    a.href = url;
    a.download = 'gcc-backup-' + stamp + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    return { ok: true, size: json.length, keys: Object.keys(data).length, images: Object.keys(images).length };
  }

  // ── Import ──

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = e => {
        try { resolve(JSON.parse(e.target.result)); }
        catch(err) { reject(new Error('Invalid JSON file')); }
      };
      r.onerror = () => reject(new Error('Failed to read file'));
      r.readAsText(file);
    });
  }

  async function importAll(file) {
    console.log('[GCCBackup] Starting import...');
    const backup = await readFile(file);

    if (!backup._gccBackup) {
      return { ok: false, reason: 'Not a GCC backup file' };
    }

    // Restore localStorage keys
    let keyCount = 0;
    if (backup.localStorage) {
      Object.keys(backup.localStorage).forEach(key => {
        const val = backup.localStorage[key];
        localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
        keyCount++;
      });
    }
    console.log('[GCCBackup] Restored', keyCount, 'localStorage keys');

    // Restore IndexedDB images via GCCImages.put (reuses its connection)
    let imgCount = 0;
    if (backup.images) {
      const imgKeys = Object.keys(backup.images);
      console.log('[GCCBackup] Restoring', imgKeys.length, 'images...');
      for (const key of imgKeys) {
        try {
          await GCCImages.put(key, backup.images[key]);
          imgCount++;
        } catch(e) {
          console.warn('[GCCBackup] Image restore failed for', key, e);
        }
      }
      console.log('[GCCBackup] Restored', imgCount, 'images');
    }

    return { ok: true, keys: keyCount, images: imgCount, created: backup.created };
  }

  // ── Stats (for display in settings dialog) ──

  async function getStats() {
    let lsBytes = 0;
    let lsKeys = 0;
    ALL_KEYS.forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        lsBytes += raw.length * 2; // JS strings are UTF-16
        lsKeys++;
      }
    });

    let imgCount = 0;
    let imgBytes = 0;
    try {
      const images = await getAllImages();
      imgCount = Object.keys(images).length;
      Object.values(images).forEach(v => { imgBytes += (v || '').length; });
    } catch(e) {}

    return {
      lsKeys,
      lsBytes,
      imgCount,
      imgBytes,
      totalBytes: lsBytes + imgBytes,
    };
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ── Settings Dialog ──

  async function showSettingsDialog() {
    const stats = await getStats();

    const charCounts = [];
    try {
      const fc = JSON.parse(localStorage.getItem('gcc-faserip-chars') || '[]');
      if (fc.length) charCounts.push(fc.length + ' FASERIP');
    } catch(e) {}
    try {
      const ac = JSON.parse(localStorage.getItem('gcc-add1e-chars') || '[]');
      if (ac.length) charCounts.push(ac.length + ' AD&amp;D');
    } catch(e) {}
    try {
      const mc = JSON.parse(localStorage.getItem('mp-char-list') || '[]');
      if (mc.length) charCounts.push(mc.length + ' Mighty Protectors');
    } catch(e) {}

    const campCount = (JSON.parse(localStorage.getItem('gcc-campaigns') || '[]')).length;

    // Build a standalone overlay so we don't conflict with gcc-dlg
    let el = document.getElementById('gcc-bk-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'gcc-bk-overlay';
      el.className = 'gcc-dlg-overlay';
      el.innerHTML =
        '<div class="gcc-dlg wide" id="gcc-bk-dlg">' +
          '<div class="gcc-dlg-header">' +
            '<span class="gcc-dlg-title">⚙ Settings &amp; Backup</span>' +
            '<button class="gcc-dlg-close" id="gcc-bk-close">&times;</button>' +
          '</div>' +
          '<div class="gcc-dlg-body" id="gcc-bk-body"></div>' +
          '<div class="gcc-dlg-footer" id="gcc-bk-footer"></div>' +
        '</div>';
      document.body.appendChild(el);

      // Close on overlay click or X
      el.addEventListener('click', (e) => { if (e.target === el) closeBkDialog(); });
      document.getElementById('gcc-bk-close').addEventListener('click', closeBkDialog);
    }

    const body = document.getElementById('gcc-bk-body');
    const footer = document.getElementById('gcc-bk-footer');

    body.innerHTML =
      '<div style="margin-bottom:16px">' +
        '<div class="gcc-bk-section-title">DATA SUMMARY</div>' +
        '<div class="gcc-bk-stats">' +
          '<div class="gcc-bk-stat"><span class="gcc-bk-stat-val">' + campCount + '</span><span class="gcc-bk-stat-label">Campaigns</span></div>' +
          '<div class="gcc-bk-stat"><span class="gcc-bk-stat-val">' + (charCounts.length ? charCounts.join(', ') : '0') + '</span><span class="gcc-bk-stat-label">Characters</span></div>' +
          '<div class="gcc-bk-stat"><span class="gcc-bk-stat-val">' + stats.imgCount + '</span><span class="gcc-bk-stat-label">Images</span></div>' +
          '<div class="gcc-bk-stat"><span class="gcc-bk-stat-val">' + formatBytes(stats.totalBytes) + '</span><span class="gcc-bk-stat-label">Total Size</span></div>' +
        '</div>' +
      '</div>' +
      '<div style="margin-bottom:16px">' +
        '<div class="gcc-bk-section-title">EXPORT BACKUP</div>' +
        '<p class="gcc-bk-desc">Download a complete backup of all campaigns, characters, images, and settings as a single JSON file.</p>' +
        '<button class="gcc-dlg-btn primary" id="gcc-bk-export">⬇ Export All Data</button>' +
        '<span class="gcc-bk-msg" id="gcc-bk-export-msg"></span>' +
      '</div>' +
      '<div>' +
        '<div class="gcc-bk-section-title">IMPORT BACKUP</div>' +
        '<p class="gcc-bk-desc">Restore from a previously exported backup file. This will overwrite existing data for the same keys.</p>' +
        '<label class="gcc-dlg-btn" id="gcc-bk-import-label" style="cursor:pointer">⬆ Import Backup File' +
          '<input type="file" accept=".json" id="gcc-bk-import-file" style="display:none">' +
        '</label>' +
        '<span class="gcc-bk-msg" id="gcc-bk-import-msg"></span>' +
      '</div>';

    footer.innerHTML = '';
    const btnClose = document.createElement('button');
    btnClose.className = 'gcc-dlg-btn';
    btnClose.textContent = 'Close';
    btnClose.onclick = closeBkDialog;
    footer.appendChild(btnClose);

    // Wire export
    document.getElementById('gcc-bk-export').addEventListener('click', async () => {
      const btn = document.getElementById('gcc-bk-export');
      btn.disabled = true;
      btn.textContent = 'Exporting...';
      try {
        const result = await exportAll();
        document.getElementById('gcc-bk-export-msg').innerHTML =
          '<span style="color:var(--green,#2a8a3a)"> ✓ Exported ' + result.keys + ' data keys, ' + result.images + ' images (' + formatBytes(result.size) + ')</span>';
      } catch(e) {
        document.getElementById('gcc-bk-export-msg').innerHTML =
          '<span style="color:var(--red,#cc3333)"> ✗ Export failed: ' + (e.message || e) + '</span>';
      }
      btn.disabled = false;
      btn.textContent = '⬇ Export All Data';
    });

    // Wire import
    document.getElementById('gcc-bk-import-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const msgEl = document.getElementById('gcc-bk-import-msg');
      msgEl.innerHTML = '<span style="color:var(--tx2)">Reading file...</span>';

      try {
        const result = await importAll(file);
        if (result.ok) {
          msgEl.innerHTML =
            '<span style="color:var(--green,#2a8a3a)"> ✓ Restored ' + result.keys + ' data keys, ' + result.images + ' images. Reloading...</span>';
          setTimeout(() => window.location.reload(), 1500);
        } else {
          msgEl.innerHTML = '<span style="color:var(--red,#cc3333)"> ✗ ' + _esc(result.reason) + '</span>';
        }
      } catch(err) {
        console.error('[GCCBackup] Import error:', err);
        msgEl.innerHTML = '<span style="color:var(--red,#cc3333)"> ✗ ' + _esc(err.message || 'Import failed') + '</span>';
      }
      // Reset file input so same file can be re-selected
      e.target.value = '';
    });

    el.classList.add('open');
  }

  function closeBkDialog() {
    const el = document.getElementById('gcc-bk-overlay');
    if (el) el.classList.remove('open');
  }

  // HTML escape helper
  function _esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  return {
    exportAll,
    importAll,
    getStats,
    formatBytes,
    showSettingsDialog,
    _esc,
  };

})();
