// gcc-no-context-menu.js v1.0.0 — 2026-05-24
// Drop-in: suppress the browser's native right-click menu so right-drag
// can be used to pan. Skips editable targets (input / textarea / select
// / contenteditable) so copy/paste menus still work in forms — safe to
// include on any page, not just full-screen maps. Zero config:
//   <script src="gcc-no-context-menu.js"></script>
// Pages that already handle contextmenu themselves (e.g. greyhawk-map's
// custom hex menu, or the unified shell via gcc-map.js) don't need this.

(function(){
  'use strict';
  function isEditable(t){
    if (!t || !t.tagName) return false;
    const tag = t.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
        || t.isContentEditable === true;
  }
  document.addEventListener('contextmenu', function(e){
    if (!isEditable(e.target)) e.preventDefault();
  });
})();
