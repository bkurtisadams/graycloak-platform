// gcc-version-badge.js v1.0.0 — 2026-05-24
// Drop-in: shows a small fixed version stamp so you can always tell
// which build of a page you're looking at. Set the version BEFORE the
// script loads, either way:
//   <script>window.GCC_VERSION = 'unified-map v0.1.0';</script>
//   <script src="gcc-version-badge.js"></script>
// or via attribute: <html data-gcc-version="unified-map v0.1.0">.
// No-op if no version is set. Rendered as a fixed bottom-right badge
// (pointer-events:none so it never blocks the map) rather than injected
// into each page's header, since headers vary per page — this keeps it
// uniform and layout-safe everywhere.

(function(){
  'use strict';
  const v = window.GCC_VERSION
        || document.documentElement.getAttribute('data-gcc-version');
  if (!v) return;
  function mount(){
    if (document.getElementById('gcc-version-badge')) return;
    const el = document.createElement('div');
    el.id = 'gcc-version-badge';
    el.textContent = v;
    el.style.cssText = [
      'position:fixed', 'bottom:6px', 'right:8px', 'z-index:9999',
      'font:11px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
      'color:#c8941a', 'background:rgba(8,4,0,0.72)',
      'border:1px solid rgba(200,148,26,0.35)', 'border-radius:3px',
      'padding:2px 7px', 'letter-spacing:0.03em', 'pointer-events:none',
    ].join(';');
    document.body.appendChild(el);
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
