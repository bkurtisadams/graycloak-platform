// gcc-header.js v2.2.1 — 2026-10-21
// v2.2.1: with no campaign open the campaignParam tool links bare (odd/index.html lists the user's games), not disabled.
// v2.2.0: a tool with campaignParam (odd's Launch game) links to the open campaign (?id= on this page).
// Shared site-wide header logic + theme system for all GCC pages
// Requires gcc-data.js to be loaded first

(function() {
  const ESC = s => { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; };

  // Pull system definitions from canonical source (gcc-data.js)
  function getSystemDefs() {
    return (typeof GCC !== 'undefined' && GCC.SYSTEM_DEFS) ? GCC.SYSTEM_DEFS : [];
  }

  const SHARED_TOOLS = [
    { icon: '⚑', name: 'Campaigns', href: 'index.html' },
    { icon: '🕮', name: 'Library', href: 'library.html' },
  ];

  // ── Theme ──
  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function getStoredTheme() {
    try { return localStorage.getItem('gcc-theme'); } catch(e) { return null; }
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-gcc-theme', t);
    const icon = document.getElementById('gcc-theme-icon');
    if (icon) icon.textContent = t === 'dark' ? '☀' : '☽';
    // Notify page-level code that theme changed
    window.dispatchEvent(new CustomEvent('gcc-theme-change', { detail: { theme: t } }));
  }
  function initTheme() {
    applyTheme(getStoredTheme() || getSystemTheme());
  }

  // Apply theme immediately (before DOM ready) to prevent flash
  initTheme();

  // ── Detect current page ──
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  // ── Render ──
  function renderGCCBar() {
    const bar = document.getElementById('gcc-bar');
    if (!bar) return;

    // Build tools dropdown
    let dd = '<div class="gcc-td-section"><div class="gcc-td-section-title">SYSTEM TOOLS</div>';
    getSystemDefs().forEach(sys => {
      dd += `<div class="gcc-td-sys-hdr"><span class="gcc-td-sys-icon">${sys.icon}</span> ${ESC(sys.name)}</div>`;
      sys.tools.forEach(t => {
        const isActive = t.href && t.href === currentPage;
        // a tool that takes the open campaign (odd's Launch game): its id from this page's ?id=; with none the bare link lists the user's games
        const needsCamp = !!t.campaignParam, campId = needsCamp ? new URLSearchParams(window.location.search).get('id') : null;
        const href = t.href && needsCamp && campId ? t.href + '?' + t.campaignParam + '=' + encodeURIComponent(campId) : t.href;
        const cls = href ? ('gcc-td-link' + (isActive ? ' active' : '')) : 'gcc-td-link disabled';
        dd += `<a class="${cls}"${href ? ' href="'+ESC(href)+'"' : ''}><span class="bullet">◆</span> ${ESC(t.name)}</a>`;
      });
    });
    dd += '</div><div class="gcc-td-section"><div class="gcc-td-section-title">SHARED TOOLS</div>';
    SHARED_TOOLS.forEach(t => {
      const href = t.href ? ESC(t.href) : '#';
      dd += `<a class="gcc-td-shared-link" href="${href}"><span class="gcc-td-shared-icon">${t.icon}</span> ${ESC(t.name)}</a>`;
    });
    dd += '</div>';

    document.getElementById('gcc-tools-dd').innerHTML = dd;

    // Wire tools dropdown
    const btnTools = document.getElementById('gcc-btn-tools');
    const toolsDD = document.getElementById('gcc-tools-dd');
    const toolsOL = document.getElementById('gcc-tools-overlay');

    btnTools.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = toolsDD.classList.toggle('open');
      toolsOL.classList.toggle('open', open);
    });
    toolsOL.addEventListener('click', () => {
      toolsDD.classList.remove('open');
      toolsOL.classList.remove('open');
    });
  }

  // ── Wire theme on any page (even without gcc-bar) ──
  function wireTheme() {
    const btnTheme = document.getElementById('gcc-btn-theme');
    if (btnTheme && !btnTheme._gccWired) {
      btnTheme._gccWired = true;
      btnTheme.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-gcc-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        try { localStorage.setItem('gcc-theme', next); } catch(e) {}
      });
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!getStoredTheme()) applyTheme(e.matches ? 'dark' : 'light');
    });
  }

  // ── Init ──
  function init() {
    renderGCCBar();
    wireTheme();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose theme API for page-level code
  window.GCCTheme = { apply: applyTheme, get: () => document.documentElement.getAttribute('data-gcc-theme') };
})();
