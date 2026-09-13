// ---------------------------------------------------------------------------
// Classic Traveller Book 2 p.11 (1977): MAXIMUM DRIVE POTENTIAL.
//
// One table serves all three fittings. Correlating a drive or power plant
// letter with a hull size gives the maximum potential: the jump number (Jn) for
// a jump drive, the acceleration in Gs for a maneuver drive, and the power
// plant size rating (Pn) for a power plant. A dash means that combination does
// not function in that hull.
//
// This is the table combat damage reads. Book 2 p.33: "Each hit achieved on a
// drive or power plant reduces its letter classification by one... The
// potential of the drive or power plant is then computed based on its temporary
// new letter." A drive reduced below A is destroyed outright and must be
// replaced rather than repaired; a power plant reduced into a dash cell cannot
// function.
// ---------------------------------------------------------------------------

export const DRIVE_LETTERS = Object.freeze([
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M',
  'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
]);

export const DRIVE_POTENTIAL_HULL_SIZES = Object.freeze([
  100, 200, 400, 600, 800, 1000, 2000, 3000, 4000, 5000
]);

// null is the table's dash. Rows are in DRIVE_LETTERS order.
const ROWS = Object.freeze({
  100: [2, 4, 6, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  200: [1, 2, 3, 4, 5, 6, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  400: [null, null, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, null, null, null, null, null, null, null, null, null, null, null],
  600: [null, null, null, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, null, null, null, null],
  800: [null, null, null, null, null, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6],
  1000: [null, null, null, null, null, null, null, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 5, 6],
  2000: [null, null, null, null, null, null, null, null, null, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 3, 4],
  3000: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, 1, 1, 1, 1, 1, 1, 1, 1, 2, 3],
  4000: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 1, 1, 1, 2, 3],
  5000: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 1, 2]
});

export const MAXIMUM_DRIVE_POTENTIAL = Object.freeze(
  Object.fromEntries(Object.entries(ROWS).map(([hull, row]) => [
    hull,
    Object.freeze(Object.fromEntries(DRIVE_LETTERS.map((letter, index) => [letter, row[index]])))
  ]))
);

export function normalizeDriveLetter(letter) {
  const key = String(letter ?? '').trim().toUpperCase();
  if (!DRIVE_LETTERS.includes(key)) throw new RangeError(`unknown drive letter: ${letter}`);
  return key;
}

/**
 * Book 2 p.10: "When consulting the maximum drive potential table, tonnage of
 * custom hulls is rounded up to the next higher figure."
 */
export function drivePotentialHullSize(hullTons) {
  const tons = Number(hullTons);
  if (!Number.isFinite(tons) || tons <= 0) throw new TypeError('hull tonnage must be a positive number');
  const size = DRIVE_POTENTIAL_HULL_SIZES.find((entry) => tons <= entry);
  if (!size) throw new RangeError(`no maximum drive potential row for a ${tons}-ton hull; the largest is 5000`);
  return size;
}

/**
 * The maximum potential for a drive letter in a hull, or null where the table
 * shows a dash and the fitting does not function.
 */
export function maximumDrivePotential(hullTons, letter) {
  return MAXIMUM_DRIVE_POTENTIAL[drivePotentialHullSize(hullTons)][normalizeDriveLetter(letter)] ?? null;
}

/**
 * Book 2 p.33. Applies `hits` reductions of one letter each and reports what
 * the fitting can still do.
 *
 * `destroyed` is the p.33 rule that a drive reduced to less than A is destroyed
 * and must be replaced rather than repaired. `functional` is false either way
 * when the reduced letter lands on a dash — a power plant in that position
 * "cannot function" even though it has not been reduced past A.
 */
export function damagedDrivePotential(hullTons, letter, hits = 0) {
  const start = DRIVE_LETTERS.indexOf(normalizeDriveLetter(letter));
  const count = Math.max(0, Math.floor(Number(hits) || 0));
  const index = start - count;
  if (index < 0) {
    return Object.freeze({ letter: null, potential: null, destroyed: true, functional: false, hits: count });
  }
  const reduced = DRIVE_LETTERS[index];
  const potential = maximumDrivePotential(hullTons, reduced);
  return Object.freeze({
    letter: reduced,
    potential,
    destroyed: false,
    functional: potential !== null,
    hits: count
  });
}
