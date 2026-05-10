// gcc-map-subhex-palette.js v1.0.0 — 2026-05-10
// Phase B Slice 5a — subhex palette UI, lifted from gcc-subhex-view.js
// v3.1.0's controls window. Registers as a subhex-scale tool via
// GCCMap.registerTool; mounts into the shell's Tools section when
// scale='subhex' is active.
//
// In scope (Slice 5a):
//   - Terrain swatches (paint cells with a terrain rgb fill + glyph)
//   - Erase swatch (revert override → cell inherits owner-parent terrain)
//   - Feature glyphs (place a feature: castle, ruin, tower, etc.)
//   - Feature-erase glyph (clear feature on click)
//   - Fog tool (brush fog: click=reveal, shift-click=hide, drag=sweep)
//   - Fog preview button (toggle GM-vs-player view via GCCFog.togglePreview)
//   - Clear-override button (single-cell revert on the selected cell)
//   - Mode label (live readout of current armed state)
//
// Deferred to Slice 5b:
//   - Region tool + arm picker + region-erase
//   - Path tool + arm picker + path action grid + river-edit dialog
//   - Lake tool + arm picker + new-lake dialog
//   - Detail panel (Name, Notes, Region, Hosts, Feature notes,
//     Landmark pin, More fields, Source provenance)
//   - flashMode wiring back from the renderer (currently no message
//     when feature-erase hits a featureless cell — Slice 5b adds the
//     event bus or shared API)
//
// Architecture: the palette and the subhex renderer collaborate via
// window.GCCMapSubhexRenderer. The palette never touches GCCSubhexData
// for paint — it sets renderer.armed; the renderer's brush handlers
// (restored in renderer v1.1.0) dispatch on rs.armed when the GM
// clicks/drags cells. Disarm-on-unmount keeps a primed brush from
// surviving a scale switch.
//
// CSS reuse: gcc-subhex.css's .sxw-tool-btn, .sxw-mode, .sxw-palette,
// .sxw-feature-btn, .sxw-swatch, .sxw-callout-pane etc. are all class-
// scoped and apply naturally. The palette deliberately uses these
// classes — and data-attribute selectors internally — to avoid ID
// collisions with the legacy floating window (which isn't loaded in
// unified-map.html but might be loaded in other future contexts).

(function(){
  'use strict';
  if (!window.GCCMap || typeof window.GCCMap.registerTool !== 'function'){
    console.error('[subhex-palette] GCCMap.registerTool missing — load gcc-map.js v0.2.3+ first');
    return;
  }

  let _container = null;
  let _ctx = null;
  let _onFogChanged = null;
  let _flashTimer = null;

  function R(){ return window.GCCMapSubhexRenderer; }

  // ── Arm key serialization (matches legacy gcc-subhex-view.js) ──
  // Erase and feature-erase have no value, so their keys end with `:`.
  // Fog is single-mode for now (Slice 5a); same convention.
  function armKey(a){
    if (!a) return null;
    if (a.type === 'erase') return 'erase:';
    if (a.type === 'feature-erase') return 'feature-erase:';
    if (a.type === 'fog') return 'fog:';
    return `${a.type}:${a.value}`;
  }

  // Toggle-or-set arming: same swatch twice disarms. Same as legacy.
  function armPalette(next){
    const R_ = R();
    if (!R_) return;
    const cur = armKey(R_.getArmed());
    const nxt = armKey(next);
    R_.setArmed(cur === nxt ? null : next);
    syncPaletteUI();
    syncModeLabel();
  }

  function syncPaletteUI(){
    if (!_container) return;
    const R_ = R();
    const cur = R_ ? armKey(R_.getArmed()) : null;
    _container.querySelectorAll('.sxw-swatch, .sxw-feature-btn').forEach(b => {
      b.classList.toggle('armed', b.dataset.armKey === cur);
    });
    // Tool buttons: Fog is the only one in 5a. 5b adds region/path/lake.
    const fogBtn = _container.querySelector('[data-tool="fog"]');
    if (fogBtn) fogBtn.classList.toggle('armed', cur === 'fog:');
    // Tool-callout visibility — only the fog callout in 5a.
    const callout = _container.querySelector('.sxw-tool-callout');
    if (callout) callout.style.display = (cur === 'fog:') ? '' : 'none';
    const fogPane = _container.querySelector('[data-callout="fog"]');
    if (fogPane) fogPane.style.display = (cur === 'fog:') ? '' : 'none';
  }

  function syncModeLabel(){
    if (!_container) return;
    const el = _container.querySelector('.sxw-mode');
    if (!el) return;
    const R_ = R();
    const a = R_ ? R_.getArmed() : null;
    el.classList.toggle('sxw-mode-armed', !!a);
    if (!a){
      el.textContent = 'Mode: Select';
    } else if (a.type === 'erase'){
      el.textContent = 'Mode: Erase override · drag to brush';
    } else if (a.type === 'feature-erase'){
      el.textContent = 'Mode: Clear feature · click cells';
    } else if (a.type === 'feature'){
      el.textContent = `Mode: Place feature · ${a.value} · drag to brush`;
    } else if (a.type === 'fog'){
      el.textContent = 'Mode: Fog brush · click to reveal · shift+click to hide · drag to sweep';
    } else {
      const lbl = (window.TERRAIN && window.TERRAIN[a.value])
        ? (window.TERRAIN[a.value].label || a.value) : a.value;
      el.textContent = `Mode: Paint · ${lbl} · drag to brush`;
    }
  }

  // flashMode: transient mode-label message; auto-restores after a
  // short delay. Slice 5b wires the renderer side to dispatch flashes
  // back into the palette (e.g. "No feature here" when feature-erase
  // hits an empty cell). In 5a it's exposed but unused.
  function flashMode(msg){
    if (!_container) return;
    const el = _container.querySelector('.sxw-mode');
    if (!el) return;
    if (_flashTimer) clearTimeout(_flashTimer);
    el.textContent = `Mode: ${msg}`;
    el.classList.add('sxw-mode-flash');
    _flashTimer = setTimeout(() => {
      el.classList.remove('sxw-mode-flash');
      syncModeLabel();
      _flashTimer = null;
    }, 1600);
  }

  // ── Strip builders ──────────────────────────────────────────────
  function buildTerrainStrip(host){
    if (typeof window.TERRAIN === 'undefined') return;
    // Same order as legacy buildPalette (gcc-subhex-view.js).
    const order = [
      'clear','plains','forest','hardwood','conifer','jungle',
      'hills','forest_hills','mountains','desert','barrens','swamp',
      'water_fresh','water_inland_sea','water_coastal','water_shallow','water_deep',
    ];
    for (const t of order){
      const meta = window.TERRAIN[t];
      if (!meta) continue;
      const b = document.createElement('button');
      b.className = 'sxw-swatch';
      b.dataset.armKey = `terrain:${t}`;
      b.title = meta.label || t;
      b.style.background = `rgb(${meta.rgb})`;
      b.addEventListener('click', () => armPalette({ type: 'terrain', value: t }));
      host.appendChild(b);
    }
    const erase = document.createElement('button');
    erase.className = 'sxw-swatch sxw-swatch-erase';
    erase.dataset.armKey = 'erase:';
    erase.title = 'Erase override (revert to seed)';
    erase.textContent = '⌫';
    erase.addEventListener('click', () => armPalette({ type: 'erase' }));
    host.appendChild(erase);
  }

  function buildFeatureStrip(host){
    if (!window.GCCSubhexIcons) return;
    const NS = 'http://www.w3.org/2000/svg';
    for (const kind of window.GCCSubhexIcons.FEATURE_KINDS){
      const b = document.createElement('button');
      b.className = 'sxw-feature-btn';
      b.dataset.armKey = `feature:${kind}`;
      b.title = `Place feature: ${kind}`;
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '20');
      svg.setAttribute('height', '20');
      window.GCCSubhexIcons.appendFeature(svg, kind, 12, 12, 14);
      b.appendChild(svg);
      b.addEventListener('click', () => armPalette({ type: 'feature', value: kind }));
      host.appendChild(b);
    }
    const clearBtn = document.createElement('button');
    clearBtn.className = 'sxw-feature-btn sxw-feature-btn-clear';
    clearBtn.dataset.armKey = 'feature-erase:';
    clearBtn.title = 'Clear feature on click';
    clearBtn.textContent = '⌫';
    clearBtn.addEventListener('click', () => armPalette({ type: 'feature-erase' }));
    host.appendChild(clearBtn);
  }

  // ── Button handlers ────────────────────────────────────────────
  function onFogToolClick(){
    armPalette({ type: 'fog' });
  }
  function onFogPreviewClick(){
    if (window.GCCFog && typeof window.GCCFog.togglePreview === 'function'){
      window.GCCFog.togglePreview();
    }
  }
  // Clear override: revert the selected cell back to seed terrain
  // (inherits owner-parent terrain). Shell selection is the source
  // of truth; no-op if nothing's selected or selection isn't a subhex.
  function onClearClick(){
    const sel = window.GCCMap && window.GCCMap.currentSelection
      ? window.GCCMap.currentSelection() : null;
    if (!sel || sel.kind !== 'subhex') return;
    if (!window.GCCSubhexData) return;
    window.GCCSubhexData.clearSubhex(sel.Q, sel.R);
    const R_ = R();
    if (R_ && typeof R_.applyCellPaint === 'function') R_.applyCellPaint(sel.Q, sel.R);
  }

  function syncFogPreviewBtn(){
    if (!_container) return;
    const btn = _container.querySelector('[data-action="fog-preview"]');
    if (!btn) return;
    const on = !!(window.GCCFog && typeof window.GCCFog.isPreview === 'function' && window.GCCFog.isPreview());
    btn.classList.toggle('sxw-tool-btn-armed', on);
  }

  // ── Tool lifecycle (called by GCCMap.setScale) ─────────────────
  function mount(container, ctx){
    _container = container;
    _ctx = ctx;
    container.innerHTML = `
      <div class="sxw-tools-row">
        <button class="sxw-tool-btn" data-tool="fog">Fog…</button>
        <button class="sxw-tool-btn" data-action="clear" title="Erase override on the selected cell">Clear</button>
        <button class="sxw-tool-btn" data-action="fog-preview" title="Preview as players see (fog of war)">👁 Preview</button>
        <span class="sxw-mode">Mode: Select</span>
      </div>
      <div class="sxw-tool-callout" style="display:none;">
        <div class="sxw-callout-pane" data-callout="fog" style="display:none;">
          <div class="sxw-path-help">
            Click to reveal · shift+click to hide · drag to sweep · click 👁 Preview to see fogged cells
          </div>
        </div>
      </div>
      <div class="sxw-palette-strip">
        <div class="sxw-palette" data-strip="terrain"></div>
        <div class="sxw-feature-palette" data-strip="feature"></div>
      </div>
    `;
    container.querySelector('[data-tool="fog"]').addEventListener('click', onFogToolClick);
    container.querySelector('[data-action="clear"]').addEventListener('click', onClearClick);
    container.querySelector('[data-action="fog-preview"]').addEventListener('click', onFogPreviewClick);
    buildTerrainStrip(container.querySelector('[data-strip="terrain"]'));
    buildFeatureStrip(container.querySelector('[data-strip="feature"]'));
    _onFogChanged = () => { syncFogPreviewBtn(); };
    window.addEventListener('gcc-fog-changed', _onFogChanged);
    syncFogPreviewBtn();
    syncPaletteUI();
    syncModeLabel();
  }

  function unmount(){
    if (_onFogChanged){
      window.removeEventListener('gcc-fog-changed', _onFogChanged);
      _onFogChanged = null;
    }
    if (_flashTimer){
      clearTimeout(_flashTimer);
      _flashTimer = null;
    }
    // Disarm: don't leave a brush primed for a different scale.
    const R_ = R();
    if (R_) R_.setArmed(null);
    if (_container) _container.innerHTML = '';
    _container = null;
    _ctx = null;
  }

  window.GCCMap.registerTool({
    scale: 'subhex',
    name: 'subhex-palette',
    label: 'Subhex Palette',
    mount,
    unmount,
  });

  // Exposed for Slice 5b to dispatch flashes back from the renderer
  // (e.g. "No feature here" when feature-erase hits an empty cell)
  // and to programmatically arm tools from marker clicks.
  window.GCCMapSubhexPalette = {
    arm: armPalette,
    flash: flashMode,
    sync(){ syncPaletteUI(); syncModeLabel(); },
  };
})();
