// gcc-map-parent-renderer.js v0.1.0 — 2026-05-09
// Phase B Slice 2 stub. Registers a 'parent' scale with GCCMap and
// mounts a placeholder label centered in viewport. Slice 3 replaces
// this with the real parent-hex renderer extracted from the inline
// JS in greyhawk-map.html (buildHexGrid, buildLandmarkOverlay,
// buildPathOverlay, etc.). The interface (mount/render/unmount) is
// the contract Slice 3's renderer fills.

(function(){
  'use strict';
  if (!window.GCCMap){
    console.error('[parent-renderer] GCCMap missing — load gcc-map.js first');
    return;
  }

  let _root = null;   // <g> root for this renderer's content
  let _ctx  = null;   // renderer context from the shell

  function mount(svg, ctx){
    _ctx = ctx;
    const ns = 'http://www.w3.org/2000/svg';
    _root = document.createElementNS(ns, 'g');
    _root.setAttribute('class', 'gcc-map-parent-root');
    svg.appendChild(_root);
    render();
  }

  function render(){
    if (!_root || !_ctx) return;
    const ns = 'http://www.w3.org/2000/svg';
    _root.innerHTML = '';
    const c = _ctx.worldCenter();
    const sc = _ctx.activeScale();
    if (!sc) return;
    // Two centered labels — primary and tagline. Sized in world units
    // so they scale with zoom (intentional for a stub; real renderer
    // uses non-scaling-stroke for chrome per DESIGN-unified-map.md Q2).
    const primary = document.createElementNS(ns, 'text');
    primary.setAttribute('class', 'gcc-map-stub-label');
    primary.setAttribute('x', c.x);
    primary.setAttribute('y', c.y);
    primary.setAttribute('font-size', 24);
    primary.textContent = 'Parent scale (30-mile)';
    _root.appendChild(primary);

    const sub = document.createElementNS(ns, 'text');
    sub.setAttribute('class', 'gcc-map-stub-sublabel');
    sub.setAttribute('x', c.x);
    sub.setAttribute('y', c.y + 30);
    sub.setAttribute('font-size', 14);
    sub.textContent = 'Slice 3 — buildHexGrid + landmarks + paths land here';
    _root.appendChild(sub);
  }

  function unmount(){
    if (_root && _root.parentNode) _root.parentNode.removeChild(_root);
    _root = null;
    _ctx  = null;
  }

  window.GCCMap.registerScale({
    name: 'parent',
    label: '30-mile',
    hexSize: 30,
    pxPerWorldUnit: 1,           // matches greyhawk-map.html's native 1:1 world:px
    zoomMin: 0.1,
    zoomMax: 2.0,
    zoomDefault: 0.5,            // matches legacy main-map default
    renderer: { mount, render, unmount },
    tools: [],                   // populated in Slice 5
  });
})();
