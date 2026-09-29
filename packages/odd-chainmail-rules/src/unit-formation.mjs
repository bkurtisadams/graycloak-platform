/**
 * OD&D — Chainmail engine · mass-unit formation geometry
 * odd-chainmail · module/rules/unit-formation.mjs
 * system 0.2.2 · slice: single-scale-formation-token · stamp 0.2.2-single-formation.1
 *
 * Chainmail counts FIGURES internally and sets its battlefield ground scale at
 * 1" = 10 yards. The Foundry mass-battle convention is therefore deliberately
 * literal:
 *
 *   1 Foundry grid square = 1 Chainmail inch = 10 yards
 *   1 formation file/rank cell = 1 grid square
 *
 * Pixel density is presentation only. 20 px/square is the compact default, but
 * 25 px, 50 px, or any other supported Foundry square-grid size is rules-equivalent
 * so long as Scene distance is 1 and units are inches.
 *
 * A Unit Actor stores figure strength plus files/ranks. ONE linked visible Token
 * owns actor linkage, targeting, combat-tracker participation, movement, facing,
 * and the scale-true files × ranks battlefield footprint. No companion Tile is
 * required, so movement and formation art cannot desynchronize.
 *
 * Casualties reduce strength but do not automatically collapse stored files or
 * ranks. The formation keeps its battlefield footprint, representing gaps,
 * until the player reforms it.
 */

export const UnitFormation = Object.freeze({
  LINE: "line",
  COLUMN: "column",
  SQUARE: "square",
  HEDGEHOG: "hedgehog"
});

export const CHAINMAIL_GRID_PX = 20;
export const CHAINMAIL_MIN_GRID_PX = 20;
export const CHAINMAIL_GRID_TYPE = 1; // Foundry square grid
export const CHAINMAIL_INCH_YARDS = 10;
export const CHAINMAIL_GRID_DISTANCE = 1;
export const CHAINMAIL_GRID_UNITS = '"';

const positiveInt = (v) => Math.max(0, Math.trunc(Number(v)) || 0);

/** Default Chainmail figure layout for a configured body of troops. */
export function defaultFormationLayout(figures, formation = UnitFormation.LINE) {
  const n = positiveInt(figures);
  if (!n) return { files: 0, ranks: 0, capacity: 0 };

  let files;
  switch (formation) {
    case UnitFormation.COLUMN:
      files = 1;
      break;
    case UnitFormation.SQUARE:
    case UnitFormation.HEDGEHOG:
      files = Math.ceil(Math.sqrt(n));
      break;
    case UnitFormation.LINE:
    default:
      // The old physical-figure deployment already used a ten-figure maximum
      // row. Keep that useful default: 20 figures become a 10×2 line rather
      // than a 20"-wide strip. The referee can set any files/ranks desired.
      files = Math.min(10, n);
      break;
  }
  const ranks = Math.ceil(n / files);
  return { files, ranks, capacity: files * ranks };
}

/**
 * Normalize stored files/ranks. A missing layout takes the formation default;
 * a stale layout that cannot contain the configured roster grows its rear rank
 * count rather than silently dropping figures.
 */
export function normalizeFormationLayout(figures, formation, files = null, ranks = null) {
  const n = positiveInt(figures);
  if (!n) return { files: 0, ranks: 0, capacity: 0 };
  const d = defaultFormationLayout(n, formation);
  const f = positiveInt(files) || d.files;
  const requestedRanks = positiveInt(ranks) || d.ranks;
  const r = Math.max(requestedRanks, Math.ceil(n / f));
  return { files: f, ranks: r, capacity: f * r };
}

/** Preserve casualties when roster size changes; an unhurt unit scales fully. */
export function reconcileStrength(oldRoster, currentFigures, newRoster) {
  const oldN = positiveInt(oldRoster);
  const newN = positiveInt(newRoster);
  const current = Math.min(oldN, positiveInt(currentFigures));
  return current >= oldN ? newN : Math.min(current, newN);
}

/** Figures able to occupy the front rank at the unit's present strength. */
export function formationFrontage(currentFigures, files) {
  return Math.min(positiveInt(currentFigures), positiveInt(files));
}

/** Scale-true VTT footprint, in Foundry grid squares / Chainmail inches. */
export function formationFootprint(figures, formation = UnitFormation.LINE, files = null, ranks = null) {
  const layout = normalizeFormationLayout(figures, formation, files, ranks);
  return { width: Math.max(1, layout.files), height: Math.max(1, layout.ranks) };
}

/**
 * Backward-compatible alias retained for modules/world macros written against
 * v0.2.0. It now returns the scale-true footprint rather than a compressed one.
 */
export function counterFootprint(formation = UnitFormation.LINE, figures = 1, files = null, ranks = null) {
  return formationFootprint(figures, formation, files, ranks);
}

/** Pixel dimensions of a formation tile on the current scene. */
export function formationTilePixels(files, ranks, gridSize = CHAINMAIL_GRID_PX) {
  const gs = Math.max(1, Number(gridSize) || CHAINMAIL_GRID_PX);
  return {
    width: Math.max(1, positiveInt(files)) * gs,
    height: Math.max(1, positiveInt(ranks)) * gs
  };
}

/** Chainmail scene-grid data suitable for Scene#update. */
export function chainmailGridConfig() {
  return {
    "grid.type": CHAINMAIL_GRID_TYPE,
    "grid.size": CHAINMAIL_GRID_PX,
    "grid.distance": CHAINMAIL_GRID_DISTANCE,
    "grid.units": CHAINMAIL_GRID_UNITS
  };
}

/** Does a Scene/grid-like object use the digital Chainmail RULES scale?
 * Grid pixel size is deliberately not fixed; it is display density only. */
export function isChainmailGrid(sceneOrGrid) {
  const grid = sceneOrGrid?.grid ?? sceneOrGrid;
  if (!grid) return false;
  const units = String(grid.units ?? "").trim().toLowerCase();
  const inchUnits = units === '"' || units === "”" || units === "″" || units === "in" || units === "in." || units === "inch" || units === "inches";
  return Number(grid.type ?? CHAINMAIL_GRID_TYPE) === CHAINMAIL_GRID_TYPE
    && Number(grid.size) >= CHAINMAIL_MIN_GRID_PX
    && Number(grid.distance) === CHAINMAIL_GRID_DISTANCE
    && inchUnits;
}

/** Human-readable physical battlefield span represented by a formation. */
export function formationScaleReadout(files, ranks) {
  const f = positiveInt(files);
  const r = positiveInt(ranks);
  return {
    inchesWide: f,
    inchesDeep: r,
    yardsWide: f * CHAINMAIL_INCH_YARDS,
    yardsDeep: r * CHAINMAIL_INCH_YARDS
  };
}

/* ------------------------------------------------------------------ *
 * Self-tests — Node only.
 * ------------------------------------------------------------------ */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };

  const l = defaultFormationLayout(20, UnitFormation.LINE);
  ok(l.files === 10 && l.ranks === 2, "T1 line defaults to ten files");
  const c = defaultFormationLayout(20, UnitFormation.COLUMN);
  ok(c.files === 1 && c.ranks === 20, "T2 column is one file");
  const s = defaultFormationLayout(20, UnitFormation.SQUARE);
  ok(s.files === 5 && s.ranks === 4 && s.capacity === 20, "T3 square packs compactly");
  const h = defaultFormationLayout(21, UnitFormation.HEDGEHOG);
  ok(h.files === 5 && h.ranks === 5 && h.capacity === 25, "T4 hedgehog square capacity");
  const stale = normalizeFormationLayout(20, UnitFormation.LINE, 5, 2);
  ok(stale.files === 5 && stale.ranks === 4, "T5 stale layout grows ranks to contain roster");
  ok(formationFrontage(13, 20) === 13 && formationFrontage(20, 5) === 5, "T6 frontage clamps to living/files");
  const fp = formationFootprint(20, UnitFormation.LINE, 10, 2);
  ok(fp.width === 10 && fp.height === 2, "T7 footprint equals files × ranks");
  const px = formationTilePixels(10, 2, 50);
  ok(px.width === 500 && px.height === 100, "T8 tile pixels follow scene grid");
  ok(reconcileStrength(20, 20, 30) === 30, "T9 unhurt unit expands with roster");
  ok(reconcileStrength(20, 13, 30) === 13 && reconcileStrength(20, 13, 10) === 10, "T10 casualties persist and clamp");
  const scale = formationScaleReadout(10, 2);
  ok(scale.yardsWide === 100 && scale.yardsDeep === 20, "T11 1 inch = 10 yards readout");
  ok(isChainmailGrid({ size: 20, distance: 1, units: '"' }), "T12 compact 20px inch grid accepted");
  ok(isChainmailGrid({ size: 25, distance: 1, units: '"' }) && isChainmailGrid({ size: 50, distance: 1, units: '"' }), "T13 pixel density does not change rules scale");
  ok(!isChainmailGrid({ size: 20, distance: 5, units: 'ft' }), "T14 wrong distance/units rejected");
  const cfg = chainmailGridConfig();
  ok(cfg["grid.type"] === 1 && cfg["grid.size"] === 20 && cfg["grid.distance"] === 1 && cfg["grid.units"] === '"', "T15 compact grid config canonical");

  console.log(`unit-formation.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}
