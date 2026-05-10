// gcc-map-subhex-renderer.js v0.1.0 — 2026-05-09
// Phase B Slice 2 stub. Registers a 'subhex' scale with GCCMap and
// mounts a placeholder label centered in viewport. Slice 4 replaces
// this with the real subhex renderer — the v3.1.0 render core lifted
// out of gcc-subhex-view.js (cells, parent overlay, paths, region
// labels, parent-path markers, crossings). The mount/render/unmount
// interface here is the contract Slice 4's renderer fills.

(function(){
  'use strict';
  if (!window.GCCMap){
    console.error('[subhex-renderer] GCCMap missing — load gcc-map.js first');
    return;
  }

  let _root = null;
  let _ctx  = null;

  function mount(svg, ctx){
    _ctx = ctx;
    const ns = 'http://www.w3.org/2000/svg';
    _root = document.createElementNS(ns, 'g');
    _root.setAttribute('class', 'gcc-map-subhex-root');
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
    const primary = document.createElementNS(ns, 'text');
    primary.setAttribute('class', 'gcc-map-stub-label');
    primary.setAttribute('x', c.x);
    primary.setAttribute('y', c.y);
    primary.setAttribute('font-size', 1.8);
    primary.textContent = 'Subhex scale (3-mile)';
    _root.appendChild(primary);

    const sub = document.createElementNS(ns, 'text');
    sub.setAttribute('class', 'gcc-map-stub-sublabel');
    sub.setAttribute('x', c.x);
    sub.setAttribute('y', c.y + 2.4);
    sub.setAttribute('font-size', 1.1);
    sub.textContent = 'Slice 4 — v3.1.0 render core lifts here';
    _root.appendChild(sub);
  }

  function unmount(){
    if (_root && _root.parentNode) _root.parentNode.removeChild(_root);
    _root = null;
    _ctx  = null;
  }

  window.GCCMap.registerScale({
    name: 'subhex',
    label: '3-mile',
    hexSize: 3,
    pxPerWorldUnit: 13,          // matches gcc-subhex-view.js v3.1.0 DISPLAY_SCALE
    zoomMin: 0.5,
    zoomMax: 4.0,
    zoomDefault: 1.0,
    renderer: { mount, render, unmount },
    tools: [],
  });
})();
