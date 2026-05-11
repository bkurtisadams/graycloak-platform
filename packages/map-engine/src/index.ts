// @graycloak/map-engine v0.1.0
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
} from './ownership.js';
