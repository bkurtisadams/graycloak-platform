// @graycloak/map-engine — freehold
//
// Pure rules for AD&D 1e territory development and the fighter
// freehold: the level gate, the clearing/construction state machine,
// monster-incursion checks, the economy (men-at-arms upkeep vs the
// 7 sp / inhabitant / month revenue), and settler eligibility.
//
// Everything here is deterministic given its inputs. Anything that
// "rolls" takes an injected rng (() => number in [0,1)); production
// passes Math.random, tests pass a seeded stub. No DOM, no Firestore.
//
// Rule sources are the AD&D 1e PHB (class name-level abilities) and
// DMG ("The Campaign — Territory Development", reproduced in the
// design doc). Where the RAW gives a literal number it is a named
// constant; where the RAW leaves composition to the DM (the exact
// follower roster, wage scale) the value is a tunable table with a
// documented default, flagged CONFIRM/TUNABLE.

import { axialDisk, axialDistance } from './scales.js';
import type { Axial } from './types.js';

// ---------------------------------------------------------------------------
// Name-level gate. The fighter reaches Lord at 9th and may establish a
// freehold (PHB). Other classes have their own name levels and their
// own (different) stronghold economics; only the fighter rule is RAW
// here. Non-fighter entries are the level at which that class may
// build a stronghold — their revenue/follower rules differ and are
// DM-adjudicated. CONFIRM per class entry vs PHB before relying on it.
// ---------------------------------------------------------------------------

export type AdndClass =
  | 'fighter' | 'ranger' | 'paladin'
  | 'cleric' | 'druid'
  | 'magic-user' | 'illusionist'
  | 'thief' | 'assassin' | 'monk' | 'bard';

export interface FreeholdGate {
  readonly level: number;
  readonly title: string;
  /** true only where the fighter-style freehold revenue rule applies as written. */
  readonly fighterStyleRevenue: boolean;
  readonly note?: string;
}

export const FREEHOLD_GATE: Readonly<Record<AdndClass, FreeholdGate>> = {
  fighter: { level: 9, title: 'Lord', fighterStyleRevenue: true },
  ranger: { level: 10, title: 'Ranger Lord', fighterStyleRevenue: false, note: 'Followers arrive at 10th; no automatic freehold revenue in RAW.' },
  paladin: { level: 9, title: 'Lord', fighterStyleRevenue: false, note: 'May build a stronghold; tithing/upkeep constraints apply.' },
  cleric: { level: 8, title: 'Patriarch/Matriarch', fighterStyleRevenue: false, note: 'Religious stronghold; faithful followers, not paid men-at-arms.' },
  druid: { level: 9, title: 'Druid', fighterStyleRevenue: false, note: 'Hierarchical; strongholds are atypical.' },
  'magic-user': { level: 12, title: 'Wizard', fighterStyleRevenue: false, note: 'May build a stronghold ~11th–12th; attracts apprentices, not men-at-arms.' },
  illusionist: { level: 12, title: 'Illusionist', fighterStyleRevenue: false },
  thief: { level: 10, title: 'Master Thief', fighterStyleRevenue: false, note: 'Establishes a guild rather than a cleared freehold.' },
  assassin: { level: 12, title: 'Guildmaster', fighterStyleRevenue: false },
  monk: { level: 8, title: 'Master', fighterStyleRevenue: false },
  bard: { level: 9, title: 'Bard', fighterStyleRevenue: false },
};

export function freeholdGate(cls: AdndClass): FreeholdGate | null {
  return FREEHOLD_GATE[cls] ?? null;
}

export function qualifiesForFreehold(cls: AdndClass, level: number): boolean {
  const g = FREEHOLD_GATE[cls];
  return !!g && level >= g.level;
}

// ---------------------------------------------------------------------------
// Revenue. Fighter freehold: 7 sp / month / inhabitant from trade,
// tariffs and taxes (PHB). 10 sp = 1 gp.
// ---------------------------------------------------------------------------

export const REVENUE_SP_PER_INHABITANT = 7;
export const SP_PER_GP = 10;

export interface FreeholdRevenue {
  readonly population: number;
  readonly silverPieces: number;
  readonly goldPieces: number;
}

export function monthlyRevenue(population: number): FreeholdRevenue {
  const pop = Math.max(0, Math.floor(population));
  const sp = pop * REVENUE_SP_PER_INHABITANT;
  return { population: pop, silverPieces: sp, goldPieces: sp / SP_PER_GP };
}

// ---------------------------------------------------------------------------
// Men-at-arms. On establishing AND clearing the freehold the fighter
// attracts a body of men-at-arms led by an above-average fighter, who
// serve as mercenaries so long as they are paid (PHB). The exact
// roster is left to the DM (DMG followers table); the structure is
// fixed here, the counts are a TUNABLE default — CONFIRM vs the DMG
// fighter-followers table for your campaign.
// ---------------------------------------------------------------------------

export type TroopType =
  | 'leader' | 'sergeant'
  | 'light-foot' | 'heavy-foot' | 'archer' | 'crossbow'
  | 'light-horse' | 'medium-horse' | 'heavy-horse';

export interface TroopWage {
  /** Monthly wage in gold pieces per soldier. TUNABLE — DMG mercenary rates. */
  readonly gpPerMonth: number;
}

/** Default monthly wages (gp). TUNABLE — align to your DMG mercenary table. */
export const DEFAULT_WAGES: Readonly<Record<TroopType, TroopWage>> = {
  leader: { gpPerMonth: 100 },
  sergeant: { gpPerMonth: 15 },
  'light-foot': { gpPerMonth: 2 },
  'heavy-foot': { gpPerMonth: 3 },
  archer: { gpPerMonth: 4 },
  crossbow: { gpPerMonth: 3 },
  'light-horse': { gpPerMonth: 6 },
  'medium-horse': { gpPerMonth: 8 },
  'heavy-horse': { gpPerMonth: 12 },
};

export interface TroopStack {
  readonly type: TroopType;
  readonly count: number;
  /** Leader/sergeant level, when applicable. */
  readonly level?: number;
}

export type MenAtArmsRoster = ReadonlyArray<TroopStack>;

/**
 * Default attracted roster. STRUCTURE is RAW (a leader who is an
 * above-average fighter + rank-and-file); COUNTS are a tunable
 * placeholder — CONFIRM vs the DMG fighter-followers table. Returns a
 * fresh roster; pass `scale` to grow it for a larger/wealthier hold.
 */
export function defaultAttractedRoster(scale = 1): MenAtArmsRoster {
  const n = (x: number) => Math.max(1, Math.round(x * scale));
  return [
    { type: 'leader', count: 1, level: 3 }, // "above-average fighter"
    { type: 'sergeant', count: n(2), level: 2 },
    { type: 'heavy-foot', count: n(20) },
    { type: 'archer', count: n(10) },
    { type: 'light-horse', count: n(10) },
  ];
}

/** Total soldiers in a roster (leader + sergeants + rank-and-file). */
export function rosterHeadcount(roster: MenAtArmsRoster): number {
  return roster.reduce((s, t) => s + t.count, 0);
}

/** Monthly upkeep of a roster in gp, using the given (or default) wage table. */
export function monthlyUpkeepGp(
  roster: MenAtArmsRoster,
  wages: Readonly<Record<TroopType, TroopWage>> = DEFAULT_WAGES,
): number {
  return roster.reduce((sum, t) => sum + t.count * (wages[t.type]?.gpPerMonth ?? 0), 0);
}

/** Net monthly balance in gp: revenue minus men-at-arms upkeep. */
export function monthlyNetGp(
  population: number,
  roster: MenAtArmsRoster,
  wages?: Readonly<Record<TroopType, TroopWage>>,
): number {
  return monthlyRevenue(population).goldPieces - monthlyUpkeepGp(roster, wages);
}

// ---------------------------------------------------------------------------
// Territory footprint. The freehold is cleared in a radius of 20–50
// miles around the stronghold (PHB). Clearing/exploration happens at
// the one-mile scale (DMG: explore the campaign hex "about one mile per
// hex"), so the footprint is an axial disk of mile-hexes.
// ---------------------------------------------------------------------------

export const FREEHOLD_RADIUS_MIN_MILES = 20;
export const FREEHOLD_RADIUS_MAX_MILES = 50;

export function clampFreeholdRadius(radiusMiles: number): number {
  return Math.min(FREEHOLD_RADIUS_MAX_MILES, Math.max(FREEHOLD_RADIUS_MIN_MILES, Math.round(radiusMiles)));
}

/** Mile-hexes inside the freehold (filled disk at the mile scale). */
export function freeholdFootprintMiles(centerMileAxial: Axial, radiusMiles: number): Axial[] {
  return axialDisk(centerMileAxial, clampFreeholdRadius(radiusMiles));
}

/** Is a mile-hex a border cell (on the outer ring adjacent to uncleared land)? */
export function isBorderCell(centerMileAxial: Axial, cell: Axial, radiusMiles: number): boolean {
  return axialDistance(centerMileAxial, cell) === clampFreeholdRadius(radiusMiles);
}

// ---------------------------------------------------------------------------
// Clearing / construction state machine + monster-incursion checks.
// All "in N" odds are expressed as a probability and resolved against
// an injected rng so tests are deterministic.
// ---------------------------------------------------------------------------

export type TerritoryState =
  | 'wilderness'   // uncleared, full random-monster regime
  | 'constructing' // castle being built; garrison holds the core 7 hexes
  | 'cleared'      // patrolled; border + central checks only
  | 'settled'      // inhabited/patrolled > 30 mi center-to-border
  | 'reverting';   // patrols lapsed; sliding back to wilderness

/** During construction: 1-in-20 per day a monster wanders the core 7 hexes, unless patrolling. */
export const CONSTRUCTION_INCURSION_PER_DAY = 1 / 20;
/** Cleared hold: border hexes checked once per day. */
export const CLEARED_BORDER_CHECKS_PER_DAY = 1;
/** Cleared hold: central territory checked once per week. */
export const CLEARED_CENTRAL_CHECKS_PER_WEEK = 1;
/** Inhabited-table checks per week: 1 with no road through, 3 if a road passes through. */
export const INHABITED_CHECKS_PER_WEEK_NO_ROAD = 1;
export const INHABITED_CHECKS_PER_WEEK_WITH_ROAD = 3;
/** Settled hold (>30 mi to border): central checks only; ignore unfavorable results save one/month. */
export const SETTLED_THRESHOLD_MILES = 30;
export const SETTLED_UNFAVORABLE_ALLOWED_PER_MONTH = 1;

export type Rng = () => number;
const defaultRng: Rng = Math.random;

/** Resolve one construction day. Returns true if a monster wandered in. */
export function rollConstructionIncursion(opts: { patrolling: boolean }, rng: Rng = defaultRng): boolean {
  if (opts.patrolling) return false; // active patrolling beyond the area suppresses the check
  return rng() < CONSTRUCTION_INCURSION_PER_DAY;
}

export interface ClearedCheckPlan {
  readonly borderChecksPerDay: number;
  readonly centralChecksPerWeek: number;
  readonly inhabitedChecksPerWeek: number;
}

/** How many of each check a cleared (not yet settled) hold makes. */
export function clearedCheckPlan(opts: { roadThrough: boolean }): ClearedCheckPlan {
  return {
    borderChecksPerDay: CLEARED_BORDER_CHECKS_PER_DAY,
    centralChecksPerWeek: CLEARED_CENTRAL_CHECKS_PER_WEEK,
    inhabitedChecksPerWeek: opts.roadThrough
      ? INHABITED_CHECKS_PER_WEEK_WITH_ROAD
      : INHABITED_CHECKS_PER_WEEK_NO_ROAD,
  };
}

/** A territory is "settled" once patrolled land reaches >30 mi center-to-border. */
export function isSettledByRadius(radiusMiles: number): boolean {
  return radiusMiles > SETTLED_THRESHOLD_MILES;
}

export interface TerritorySignals {
  /** Castle construction has finished. */
  readonly castleComplete: boolean;
  /** Regular border patrols are being maintained. */
  readonly patrolsMaintained: boolean;
  /** Patrolled land center-to-border in miles. */
  readonly patrolledRadiusMiles: number;
  /** All adjacent lands are themselves inhabited and patrolled (blocks full reversion). */
  readonly surroundedByCivilization: boolean;
}

/**
 * Advance the territory state one tick given current state + signals.
 * Encodes the DMG progression and the reversion rule: lapsed patrols
 * send a cleared/settled hold to `reverting`; a reverting hold drops to
 * `wilderness` unless ringed by civilised lands (in which case it
 * lingers — and, per the DMG, becomes a magnet for the surrounding
 * region's unsavoury monsters).
 */
export function nextTerritoryState(current: TerritoryState, s: TerritorySignals): TerritoryState {
  switch (current) {
    case 'wilderness':
      return 'constructing';
    case 'constructing':
      if (!s.castleComplete) return 'constructing';
      return s.patrolsMaintained ? 'cleared' : 'reverting';
    case 'cleared':
      if (!s.patrolsMaintained) return 'reverting';
      return isSettledByRadius(s.patrolledRadiusMiles) ? 'settled' : 'cleared';
    case 'settled':
      if (!s.patrolsMaintained) return 'reverting';
      return isSettledByRadius(s.patrolledRadiusMiles) ? 'settled' : 'cleared';
    case 'reverting':
      if (s.patrolsMaintained) return 'cleared';
      // Surrounded by civilisation: doesn't fully revert, but stays a
      // troubled enclave rather than recovering on its own.
      return s.surroundedByCivilization ? 'reverting' : 'wilderness';
  }
}

// ---------------------------------------------------------------------------
// Settler eligibility. As fame spreads, inhabitants arrive whose type
// and alignment match the area and the lord (DMG). A simple alignment
// adjacency test: settlers share, or are one step from, the lord's
// alignment. (Two-axis AD&D alignment: L/N/C × G/N/E.)
// ---------------------------------------------------------------------------

export type Alignment =
  | 'LG' | 'NG' | 'CG'
  | 'LN' | 'N' | 'CN'
  | 'LE' | 'NE' | 'CE';

const LAW_AXIS: Record<string, number> = { L: -1, N: 0, C: 1 };
const GOOD_AXIS: Record<string, number> = { G: -1, N: 0, E: 1 };

function alignmentAxes(a: Alignment): { law: number; good: number } {
  if (a === 'N') return { law: 0, good: 0 };
  const law = LAW_AXIS[a[0] as string] ?? 0;
  const good = GOOD_AXIS[a[1] as string] ?? 0;
  return { law, good };
}

/** Chebyshev distance on the 3×3 alignment grid (0 = same, up to 2). */
export function alignmentDistance(a: Alignment, b: Alignment): number {
  const x = alignmentAxes(a);
  const y = alignmentAxes(b);
  return Math.max(Math.abs(x.law - y.law), Math.abs(x.good - y.good));
}

/** Would a settler of `candidate` alignment move into a `lord`-aligned hold? */
export function settlerAlignmentMatches(lord: Alignment, candidate: Alignment, tolerance = 1): boolean {
  return alignmentDistance(lord, candidate) <= tolerance;
}
