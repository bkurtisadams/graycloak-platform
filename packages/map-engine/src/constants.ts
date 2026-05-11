// @graycloak/map-engine v0.1.0
// constants — single source of truth for grid geometry.
//
// Ported verbatim from gcc-subhex-data.js v2.9.0. Changing any value
// here is a coordinate-system migration, not a minor bump.

/** Parent hex radius in world SVG units. */
export const HEX_R = 20;

/** Subhex radius in world SVG units. HEX_R / 10, exact. */
export const SUB_R = 2;

/** √3, precomputed once. */
export const SQRT3 = Math.sqrt(3);

/**
 * Anchor parent — the Darlene hex whose center is treated as the
 * subhex axial origin (Q=0, R=0). 70/50 picked in the GCC subhex
 * design to land near the middle of the Flanaess so Q and R stay
 * small for typical authoring.
 */
export const ANCHOR_COL = 70;
export const ANCHOR_ROW = 50;

/**
 * Six axial neighbors of a flat-top hex, in clockwise order
 * starting from the +Q (east) direction.
 */
export const NEIGHBOR_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [+1,  0], [ 0, +1], [-1, +1],
  [-1,  0], [ 0, -1], [+1, -1],
];
