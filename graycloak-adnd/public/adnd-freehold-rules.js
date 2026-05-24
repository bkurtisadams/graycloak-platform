// adnd-freehold-rules.js v1.0.0 — 2026-05-24
// Runtime copy of @graycloak/map-engine's freehold rules — the display
// subset the reader needs (gate, revenue, men-at-arms economy, radius,
// settled threshold). The engine (packages/map-engine/src/freehold.ts)
// stays canonical and is the test oracle; this is the plain-script
// mirror for the no-bundler runtime, same pattern GCC uses for the
// mile coords. Keep the two in sync; constants/structure are RAW
// (PHB/DMG), counts + wages are TUNABLE defaults (CONFIRM vs DMG).
//
// Pure: no DOM, no Firestore. Exposed as the global ADNDFreehold
// (classic-script scope, accessible by bare name across <script> tags,
// the same way adnd-auth.js exposes ADNDAuth).

const ADNDFreehold = (function(){
  'use strict';

  // ── Name-level gate (PHB). Fighter reaches Lord at 9th and gets the
  // freehold revenue rule as written; other classes gate at their own
  // levels with DM-adjudicated economics (fighterStyleRevenue:false).
  const FREEHOLD_GATE = {
    fighter:       { level: 9,  title: 'Lord',                 fighterStyleRevenue: true },
    ranger:        { level: 10, title: 'Ranger Lord',          fighterStyleRevenue: false, note: 'Followers arrive at 10th; no automatic freehold revenue in RAW.' },
    paladin:       { level: 9,  title: 'Lord',                 fighterStyleRevenue: false, note: 'May build a stronghold; tithing/upkeep constraints apply.' },
    cleric:        { level: 8,  title: 'Patriarch/Matriarch',  fighterStyleRevenue: false, note: 'Religious stronghold; faithful followers, not paid men-at-arms.' },
    druid:         { level: 9,  title: 'Druid',                fighterStyleRevenue: false, note: 'Hierarchical; strongholds are atypical.' },
    'magic-user':  { level: 12, title: 'Wizard',               fighterStyleRevenue: false, note: 'Attracts apprentices, not men-at-arms.' },
    illusionist:   { level: 12, title: 'Illusionist',          fighterStyleRevenue: false },
    thief:         { level: 10, title: 'Master Thief',         fighterStyleRevenue: false, note: 'Establishes a guild rather than a cleared freehold.' },
    assassin:      { level: 12, title: 'Guildmaster',          fighterStyleRevenue: false },
    monk:          { level: 8,  title: 'Master',               fighterStyleRevenue: false },
    bard:          { level: 9,  title: 'Bard',                 fighterStyleRevenue: false },
  };
  function freeholdGate(cls){ return FREEHOLD_GATE[cls] || null; }
  function qualifiesForFreehold(cls, level){
    const g = FREEHOLD_GATE[cls];
    return !!g && level >= g.level;
  }

  // ── Revenue. 7 sp / month / inhabitant (PHB). 10 sp = 1 gp.
  const REVENUE_SP_PER_INHABITANT = 7;
  const SP_PER_GP = 10;
  function monthlyRevenue(population){
    const pop = Math.max(0, Math.floor(population || 0));
    const sp = pop * REVENUE_SP_PER_INHABITANT;
    return { population: pop, silverPieces: sp, goldPieces: sp / SP_PER_GP };
  }

  // ── Men-at-arms. STRUCTURE is RAW (above-average fighter leader +
  // rank-and-file mercenaries paid monthly); COUNTS + wages are TUNABLE
  // defaults — CONFIRM vs the DMG fighter-followers + mercenary tables.
  const DEFAULT_WAGES = {
    leader:        { gpPerMonth: 100 },
    sergeant:      { gpPerMonth: 15 },
    'light-foot':  { gpPerMonth: 2 },
    'heavy-foot':  { gpPerMonth: 3 },
    archer:        { gpPerMonth: 4 },
    crossbow:      { gpPerMonth: 3 },
    'light-horse': { gpPerMonth: 6 },
    'medium-horse':{ gpPerMonth: 8 },
    'heavy-horse': { gpPerMonth: 12 },
  };
  function defaultAttractedRoster(scale){
    const s = scale || 1;
    const n = x => Math.max(1, Math.round(x * s));
    return [
      { type: 'leader',      count: 1,     level: 3 },
      { type: 'sergeant',    count: n(2),  level: 2 },
      { type: 'heavy-foot',  count: n(20) },
      { type: 'archer',      count: n(10) },
      { type: 'light-horse', count: n(10) },
    ];
  }
  function rosterHeadcount(roster){
    return (roster || []).reduce((s, t) => s + (t.count || 0), 0);
  }
  function monthlyUpkeepGp(roster, wages){
    const w = wages || DEFAULT_WAGES;
    return (roster || []).reduce((sum, t) => sum + (t.count || 0) * ((w[t.type] && w[t.type].gpPerMonth) || 0), 0);
  }
  function monthlyNetGp(population, roster, wages){
    return monthlyRevenue(population).goldPieces - monthlyUpkeepGp(roster, wages);
  }

  // ── Territory radius + settled threshold (PHB/DMG).
  const FREEHOLD_RADIUS_MIN_MILES = 20;
  const FREEHOLD_RADIUS_MAX_MILES = 50;
  function clampFreeholdRadius(radiusMiles){
    return Math.min(FREEHOLD_RADIUS_MAX_MILES, Math.max(FREEHOLD_RADIUS_MIN_MILES, Math.round(radiusMiles || 0)));
  }
  const SETTLED_THRESHOLD_MILES = 30;
  function isSettledByRadius(radiusMiles){ return radiusMiles > SETTLED_THRESHOLD_MILES; }

  // Cleared-hold monster-check cadence (DMG): border daily, central
  // weekly; inhabited-table checks 1/week, or 3/week with a road through.
  const INHABITED_CHECKS_PER_WEEK_NO_ROAD = 1;
  const INHABITED_CHECKS_PER_WEEK_WITH_ROAD = 3;
  function clearedCheckPlan(opts){
    return {
      borderChecksPerDay: 1,
      centralChecksPerWeek: 1,
      inhabitedChecksPerWeek: (opts && opts.roadThrough)
        ? INHABITED_CHECKS_PER_WEEK_WITH_ROAD
        : INHABITED_CHECKS_PER_WEEK_NO_ROAD,
    };
  }

  const TERRITORY_STATES = ['wilderness', 'constructing', 'cleared', 'settled', 'reverting'];

  return {
    FREEHOLD_GATE, freeholdGate, qualifiesForFreehold,
    REVENUE_SP_PER_INHABITANT, SP_PER_GP, monthlyRevenue,
    DEFAULT_WAGES, defaultAttractedRoster, rosterHeadcount,
    monthlyUpkeepGp, monthlyNetGp,
    FREEHOLD_RADIUS_MIN_MILES, FREEHOLD_RADIUS_MAX_MILES, clampFreeholdRadius,
    SETTLED_THRESHOLD_MILES, isSettledByRadius, clearedCheckPlan,
    TERRITORY_STATES,
  };
})();
