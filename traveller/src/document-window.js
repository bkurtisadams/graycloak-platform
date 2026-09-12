// document-window.js — the floating window a document (character sheet,
// later a ship or journal record) opens as, over the current scene.
//
// v0.77.0. Everything here is pure: geometry clamped into a container,
// state transitions as plain objects, and persistence through an injected
// storage (so it is testable without a browser, unlike the DOM wiring that
// uses it). The DOM layer decides *when* to call these; it does not decide
// *what* the resulting geometry or state is.

export const DOCUMENT_WINDOW_DEFAULTS = Object.freeze({
  width: 720, height: 640, minWidth: 320, minHeight: 220, inset: 16
});

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

// Fit a candidate geometry inside a container of the given size, respecting
// minimums and an inset from every edge — so the titlebar is always
// reachable even if the window was last saved somewhere now off-screen
// (a narrower browser window, a different monitor).
export function clampWindowGeometry(candidate = {}, container = {}, options = {}) {
  const minWidth = options.minWidth ?? DOCUMENT_WINDOW_DEFAULTS.minWidth;
  const minHeight = options.minHeight ?? DOCUMENT_WINDOW_DEFAULTS.minHeight;
  const inset = options.inset ?? DOCUMENT_WINDOW_DEFAULTS.inset;
  const containerWidth = Math.max(0, container.width ?? 0);
  const containerHeight = Math.max(0, container.height ?? 0);
  const maxWidth = Math.max(minWidth, containerWidth - inset * 2);
  const maxHeight = Math.max(minHeight, containerHeight - inset * 2);
  const width = clamp(candidate.width ?? DOCUMENT_WINDOW_DEFAULTS.width, minWidth, maxWidth);
  const height = clamp(candidate.height ?? DOCUMENT_WINDOW_DEFAULTS.height, minHeight, maxHeight);
  const defaultX = Math.round((containerWidth - width) / 2);
  const defaultY = Math.round((containerHeight - height) / 2);
  const x = clamp(candidate.x ?? defaultX, inset, Math.max(inset, containerWidth - width - inset));
  const y = clamp(candidate.y ?? defaultY, inset, Math.max(inset, containerHeight - height - inset));
  return { x, y, width, height };
}

// A drag moves the window by the pointer's delta since the drag began, then
// clamps the result — the caller supplies the geometry at drag-start and the
// running delta, not a running geometry, so a drag that goes off-container
// and back is not lossy.
export function dragWindowGeometry(start, delta, container, options) {
  return clampWindowGeometry({ ...start, x: start.x + delta.x, y: start.y + delta.y }, container, options);
}

// A resize (native CSS resize, or a future custom handle) changes width and
// height from the anchored top-left corner; position is unchanged, only the
// size is reclamped.
export function resizeWindowGeometry(current, size, container, options) {
  return clampWindowGeometry({ ...current, width: size.width, height: size.height }, container, options);
}

export function loadWindowGeometry(storage, key) {
  if (!storage) return null;
  try {
    const parsed = JSON.parse(storage.getItem(key));
    if (parsed && ['x', 'y', 'width', 'height'].every((field) => Number.isFinite(parsed[field]))) return parsed;
  } catch { /* corrupt or absent: no saved geometry */ }
  return null;
}

export function saveWindowGeometry(storage, key, geometry) {
  if (!storage) return;
  try { storage.setItem(key, JSON.stringify(geometry)); }
  catch { /* storage unavailable or full: the window still works this session */ }
}

// --- open / closed / minimized, as a plain state object ---------------------

export function createDocumentWindowState() {
  return { open: false, minimized: false, geometry: null };
}

export function openDocumentWindow(state, geometry) {
  return { ...state, open: true, minimized: false, geometry };
}

export function closeDocumentWindow(state) {
  return { ...state, open: false, minimized: false };
}

export function toggleMinimizeDocumentWindow(state) {
  return { ...state, minimized: !state.minimized };
}

export function moveDocumentWindow(state, geometry) {
  return { ...state, geometry };
}
