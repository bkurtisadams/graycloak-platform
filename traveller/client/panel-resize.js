// panel-resize.js — drag the edges of the play page's two side columns
// (v0.365.0). The rules (limits, clamping, what is kept) are in
// src/panel-widths.js; this puts two handles on the shell and applies a width
// as the --now-width / --sidebar-width the grid already reads.
//
// The handles are children of the shell itself, not of the columns: the scene
// and the sidebar are redrawn wholesale, which would take a handle with them.
// A width the player has not chosen is left alone, so the page's own widths
// for a fight or a staging board still apply until they drag.
import { PANEL_LIMITS, clampWidth, nudgedWidth, loadWidths, saveWidths } from '../src/panel-widths.js?v=v0.372.1';

const VARIABLES = { now: '--now-width', sidebar: '--sidebar-width' };
const LABELS = { now: 'Resize the left column', sidebar: 'Resize the sidebar' };

export function installPanelResize({ shell, storage = globalThis.localStorage, win = globalThis.window } = {}) {
  if (!shell || shell.querySelector(':scope > .panel-handle')) return null;
  const doc = shell.ownerDocument;
  const saved = loadWidths(storage);
  const chosen = {};
  const handles = {};

  const viewport = () => win?.innerWidth ?? Infinity;
  // The width a column has now, chosen or not, as the grid is drawing it.
  const present = (panel) => {
    const node = panel === 'now' ? shell.querySelector('.now') : shell.querySelector('.sidebar');
    const measured = node?.getBoundingClientRect?.().width;
    return Number.isFinite(measured) && measured > 0 ? measured : (chosen[panel] ?? PANEL_LIMITS[panel].min);
  };
  const widthsNow = () => ({ now: chosen.now ?? present('now'), sidebar: chosen.sidebar ?? present('sidebar') });

  function apply(panel, width) {
    shell.style.setProperty(VARIABLES[panel], `${width}px`);
    handles[panel].setAttribute('aria-valuenow', String(width));
  }
  function choose(panel, wanted) {
    const width = clampWidth(panel, wanted, { viewport: viewport(), widths: widthsNow() });
    chosen[panel] = width;
    apply(panel, width);
    return width;
  }
  function reset(panel) {
    delete chosen[panel];
    shell.style.removeProperty(VARIABLES[panel]);
    handles[panel].removeAttribute('aria-valuenow');
    saveWidths(storage, chosen);
  }

  function makeHandle(panel) {
    const limit = PANEL_LIMITS[panel];
    const handle = doc.createElement('div');
    handle.className = 'panel-handle';
    handle.dataset.panel = panel;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', LABELS[panel]);
    handle.setAttribute('aria-valuemin', String(limit.min));
    handle.setAttribute('aria-valuemax', String(limit.max));
    handle.title = `${LABELS[panel]}: drag, or use the arrow keys. Double-click puts it back.`;
    handle.tabIndex = 0;

    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      shell.classList.add('is-resizing');
      const rect = shell.getBoundingClientRect();
      const move = (moved) => {
        // The left column ends where the pointer is; the sidebar begins there.
        choose(panel, panel === 'now' ? moved.clientX - rect.left : rect.right - moved.clientX);
      };
      const stop = () => {
        win.removeEventListener('pointermove', move);
        win.removeEventListener('pointerup', stop);
        win.removeEventListener('pointercancel', stop);
        shell.classList.remove('is-resizing');
        saveWidths(storage, chosen);
      };
      win.addEventListener('pointermove', move);
      win.addEventListener('pointerup', stop);
      win.addEventListener('pointercancel', stop);
    });

    handle.addEventListener('keydown', (event) => {
      if (event.key === 'Home' || event.key === 'Escape') { event.preventDefault(); reset(panel); return; }
      const next = nudgedWidth(panel, chosen[panel] ?? present(panel), event.key, { large: event.shiftKey });
      if (next === (chosen[panel] ?? present(panel))) return;
      event.preventDefault();
      choose(panel, next);
      saveWidths(storage, chosen);
    });

    handle.addEventListener('dblclick', () => reset(panel));
    shell.append(handle);
    handles[panel] = handle;
    return handle;
  }

  makeHandle('now');
  makeHandle('sidebar');
  // Below the masthead, whatever its height is at this window width.
  const mast = shell.querySelector('.mast');
  const place = () => {
    const top = mast?.getBoundingClientRect?.().height ?? 0;
    for (const handle of Object.values(handles)) handle.style.top = `${Math.round(top)}px`;
  };
  place();
  if (typeof win?.ResizeObserver === 'function' && mast) new win.ResizeObserver(place).observe(mast);

  // Kept widths go on one after the other, each measured against what the
  // other column has by then, so two wide choices cannot squeeze the map.
  for (const panel of Object.keys(saved)) choose(panel, saved[panel]);
  // A narrower window pulls a chosen width back so the map keeps its room.
  win?.addEventListener?.('resize', () => {
    place();
    for (const panel of Object.keys(chosen)) {
      const width = clampWidth(panel, chosen[panel], { viewport: viewport(), widths: widthsNow() });
      if (width !== chosen[panel]) { chosen[panel] = width; apply(panel, width); }
    }
  });
  return { reset, chosen: () => ({ ...chosen }), handles };
}
