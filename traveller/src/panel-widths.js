// panel-widths.js — how wide the two side columns of the play page may be, and
// how a chosen width is kept (v0.365.0).
//
// The left column (what now) and the right one (the sidebar) had fixed widths,
// so the Travellers tab clipped its own buttons at 380px (Kurt, Nov 2026). The
// player may drag either edge; this holds the rules and nothing that touches
// the page, so they can be tested without one.

export const PANEL_LIMITS = Object.freeze({
  now: Object.freeze({ min: 280, max: 720 }),
  sidebar: Object.freeze({ min: 280, max: 900 })
});
// The map keeps at least this much room, whatever the columns ask for.
export const MIN_SCENE_WIDTH = 360;
export const STORAGE_KEY = 'traveller.play.panelWidths';
export const KEY_STEP = 16;
export const KEY_STEP_LARGE = 64;

const PANELS = Object.keys(PANEL_LIMITS);

// The width a panel may take now: inside its own limits, and leaving the map
// its minimum given the other column's present width and the window's width.
// `widths` holds the present width of each panel (a number for both).
export function clampWidth(panel, wanted, { viewport, widths }) {
  const limit = PANEL_LIMITS[panel];
  if (!limit) throw new RangeError(`unknown panel ${panel}`);
  const other = PANELS.find((name) => name !== panel);
  const room = Number.isFinite(viewport) ? viewport - (widths?.[other] ?? 0) - MIN_SCENE_WIDTH : Infinity;
  const ceiling = Math.max(limit.min, Math.min(limit.max, room));
  const value = Number.isFinite(wanted) ? wanted : limit.min;
  return Math.round(Math.min(ceiling, Math.max(limit.min, value)));
}

// A key press moves a column by a step; Shift moves it further. Left/Right are
// as the edge looks: the left column's edge moves right to widen, the
// sidebar's moves left to widen.
export function nudgedWidth(panel, current, key, { large = false } = {}) {
  const step = large ? KEY_STEP_LARGE : KEY_STEP;
  const widen = panel === 'now' ? key === 'ArrowRight' : key === 'ArrowLeft';
  const narrow = panel === 'now' ? key === 'ArrowLeft' : key === 'ArrowRight';
  if (!widen && !narrow) return current;
  return current + (widen ? step : -step);
}

// What the page kept. Anything that is not a plausible number is forgotten, so
// a damaged value can never leave a column unusable.
export function loadWidths(storage) {
  let raw = null;
  try { raw = storage?.getItem(STORAGE_KEY) ?? null; } catch { return {}; }
  if (!raw) return {};
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return {}; }
  const widths = {};
  for (const panel of PANELS) {
    const value = parsed?.[panel];
    const limit = PANEL_LIMITS[panel];
    if (Number.isFinite(value) && value >= limit.min && value <= limit.max) widths[panel] = Math.round(value);
  }
  return widths;
}

export function saveWidths(storage, widths) {
  try {
    const kept = Object.fromEntries(PANELS.filter((panel) => Number.isFinite(widths?.[panel])).map((panel) => [panel, Math.round(widths[panel])]));
    if (Object.keys(kept).length) storage?.setItem(STORAGE_KEY, JSON.stringify(kept));
    else storage?.removeItem(STORAGE_KEY);
  } catch { /* a browser that will not keep it still resizes for the visit */ }
}
