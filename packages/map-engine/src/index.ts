// @graycloak/map-engine v0.2.0
//
// Pure-logic coordinate math and ownership resolution for the
// Greyhawk Darlene grid + subhex axial system. Ported from
// gcc-subhex-data.js v2.9.0; shared between GCC (authoring),
// graycloak-adnd (player runtime), and any future tool that needs
// to reason about hex geometry.
//
// No DOM, no IDB, no Firestore. Safe to import in browser, Node,
// and worker contexts.

export {
  HEX_R,
  SUB_R,
  SQRT3,
  ANCHOR_COL,
  ANCHOR_ROW,
  NEIGHBOR_DELTAS,
} from './constants.js';

export type {
  Axial,
  ParentCoord,
  Vec2,
  Bbox,
} from './types.js';

export {
  parentSvgCenter,
  parentCenterAxial,
  subhexSvgCenter,
  axialRound,
  svgToAxial,
  neighborsOf,
  axialKey,
  parseAxialKey,
  ANCHOR_SVG,
} from './coords.js';

export {
  ownerOf,
  ownedByParent,
  cellsInAxialBbox,
  clearOwnerCache,
  parentOwnerOfPoint,
} from './ownership.js';

export {
  WORLD_UNITS_PER_MILE,
  YARDS_PER_MILE,
  FEET_PER_MILE,
  MILE_R,
  SCALES,
  svgCenterAtRadius,
  axialAtRadius,
  mileSvgCenter,
  svgToMileAxial,
  mileToSubhex,
  mileToParent,
  mileCellsInParent,
  axialRing,
  axialDisk,
  axialDistance,
  siteGrid,
  siteCellCenterFeet,
  siteCellsPerMile,
} from './scales.js';

export type {
  GlobalScale,
  SiteGrid,
  SiteGridKind,
} from './scales.js';

export {
  FREEHOLD_GATE,
  freeholdGate,
  qualifiesForFreehold,
  REVENUE_SP_PER_INHABITANT,
  SP_PER_GP,
  monthlyRevenue,
  DEFAULT_WAGES,
  defaultAttractedRoster,
  rosterHeadcount,
  monthlyUpkeepGp,
  monthlyNetGp,
  FREEHOLD_RADIUS_MIN_MILES,
  FREEHOLD_RADIUS_MAX_MILES,
  clampFreeholdRadius,
  freeholdFootprintMiles,
  isBorderCell,
  CONSTRUCTION_INCURSION_PER_DAY,
  CLEARED_BORDER_CHECKS_PER_DAY,
  CLEARED_CENTRAL_CHECKS_PER_WEEK,
  INHABITED_CHECKS_PER_WEEK_NO_ROAD,
  INHABITED_CHECKS_PER_WEEK_WITH_ROAD,
  SETTLED_THRESHOLD_MILES,
  SETTLED_UNFAVORABLE_ALLOWED_PER_MONTH,
  rollConstructionIncursion,
  clearedCheckPlan,
  isSettledByRadius,
  nextTerritoryState,
  alignmentDistance,
  settlerAlignmentMatches,
} from './freehold.js';

export type {
  AdndClass,
  FreeholdGate,
  FreeholdRevenue,
  TroopType,
  TroopWage,
  TroopStack,
  MenAtArmsRoster,
  TerritoryState,
  TerritorySignals,
  ClearedCheckPlan,
  Alignment,
  Rng,
} from './freehold.js';
