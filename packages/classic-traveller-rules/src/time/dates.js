// dates.js — the game calendar.
//
// v0.67.0. Every operation already dated its ledger lines with a `dateLabel`
// string of the form DDD-YYYY (day of year, then year), and shipUpkeepDue
// counted elapsed days with a private helper on a 365-day year. That is the
// game's date type; this file exports it so the campaign clock, the situation
// runner and the client can all do the same arithmetic on the same string.
//
// The label stays the stored and passed form — no call site changes. The
// ordinal (an integer count of days) is for arithmetic only and is never
// stored.

export const DAYS_PER_YEAR = 365;
export const DAYS_PER_MONTH = 30;

const LABEL = /^(\d{1,3})-(\d{1,5})$/;

/** DDD-YYYY -> day ordinal, or null for anything that is not a date label. */
export function parseGameDate(label) {
  const match = LABEL.exec(String(label ?? '').trim());
  if (!match) return null;
  const day = Number(match[1]);
  const year = Number(match[2]);
  if (day < 1 || day > DAYS_PER_YEAR) return null;
  return year * DAYS_PER_YEAR + day;
}

export function isGameDate(label) {
  return parseGameDate(label) !== null;
}

export function assertGameDate(label, what = 'date') {
  const ordinal = parseGameDate(label);
  if (ordinal === null) throw new TypeError(`${what} must look like DDD-YYYY; received ${JSON.stringify(label)}`);
  return ordinal;
}

/** day ordinal -> DDD-YYYY, day zero-padded to three digits. */
export function formatGameDate(ordinal) {
  if (!Number.isInteger(ordinal) || ordinal < 1) throw new RangeError(`date ordinal must be a positive integer; received ${ordinal}`);
  const year = Math.floor((ordinal - 1) / DAYS_PER_YEAR);
  const day = ordinal - year * DAYS_PER_YEAR;
  return `${String(day).padStart(3, '0')}-${year}`;
}

export function addDays(label, days) {
  if (!Number.isInteger(days)) throw new TypeError('days must be an integer');
  return formatGameDate(assertGameDate(label) + days);
}

/** Whole days from `fromLabel` to `toLabel`; negative when `to` is earlier. */
export function daysBetween(fromLabel, toLabel) {
  return assertGameDate(toLabel, 'to date') - assertGameDate(fromLabel, 'from date');
}

export function compareGameDates(a, b) {
  return assertGameDate(a) - assertGameDate(b);
}

export function earliestGameDate(labels) {
  let best = null;
  for (const label of labels) {
    if (label === null || label === undefined) continue;
    if (best === null || compareGameDates(label, best) < 0) best = label;
  }
  return best;
}

/** Elapsed whole months (30-day) between two dates, never negative. */
export function monthsElapsed(fromLabel, toLabel) {
  return Math.max(0, Math.floor(daysBetween(fromLabel, toLabel) / DAYS_PER_MONTH));
}

/** Elapsed calendar months on the 365-day year, for ages kept in months. */
export function ageMonthsElapsed(fromLabel, toLabel) {
  return Math.max(0, Math.floor(daysBetween(fromLabel, toLabel) * 12 / DAYS_PER_YEAR));
}
