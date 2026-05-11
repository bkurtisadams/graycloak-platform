// @graycloak/map-engine v0.1.0
// coords — pure coordinate math. No state, no caches, no side
// effects. All functions are stable under inversion (svgToAxial
// composed with subhexSvgCenter is identity, modulo rounding).

import {
  HEX_R, SUB_R, SQRT3,
  ANCHOR_COL, ANCHOR_ROW,
  NEIGHBOR_DELTAS,
} from './constants.js';
import type { Axial, ParentCoord, Vec2 } from './types.js';

/**
 * World SVG center of a parent hex at offset (col, row).
 * Odd-q offset layout with flat-top hexes; columns at 1.5×HEX_R
 * spacing, odd columns offset down by √3/2×HEX_R.
 *
 * Mirrors greyhawk-map.html `hexCenter()` exactly.
 */
export function parentSvgCenter(col: number, row: number): Vec2 {
  return {
    x: HEX_R + col * 1.5 * HEX_R,
    y: HEX_R * SQRT3 / 2 + row * SQRT3 * HEX_R + ((col & 1) ? HEX_R * SQRT3 / 2 : 0),
  };
}

/** World SVG point of the anchor parent's center. Precomputed. */
export const ANCHOR_SVG: Vec2 = parentSvgCenter(ANCHOR_COL, ANCHOR_ROW);

/**
 * World axial (Q, R) of a parent's center subhex. Closed form: every
 * step east in parent space is +10 Q; every step south is +10 R, with
 * a -5Q adjustment and a +5 parity term for the odd-q offset.
 */
export function parentCenterAxial(col: number, row: number): Axial {
  const dCol = col - ANCHOR_COL;
  return {
    Q: dCol * 10,
    R: 10 * (row - ANCHOR_ROW) - 5 * dCol + 5 * (col & 1) - 5 * (ANCHOR_COL & 1),
  };
}

/**
 * World SVG center of subhex (Q, R). Flat-top with axial step
 * Q→(1.5·SUB_R, 0) and R→(0, √3·SUB_R), plus a Q/2 phase shift on
 * the y axis.
 */
export function subhexSvgCenter(Q: number, R: number): Vec2 {
  return {
    x: ANCHOR_SVG.x + 1.5 * SUB_R * Q,
    y: ANCHOR_SVG.y + SQRT3 * SUB_R * (R + Q / 2),
  };
}

/**
 * Round fractional axial coords to the nearest integer axial cell.
 * Uses the cube-coord max-deviation tiebreak so cells along edges
 * resolve consistently.
 */
export function axialRound(qf: number, rf: number): Axial {
  const x = qf;
  const z = rf;
  const y = -x - z;
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  const xd = Math.abs(rx - x);
  const yd = Math.abs(ry - y);
  const zd = Math.abs(rz - z);
  if (xd > yd && xd > zd) {
    rx = -ry - rz;
  } else if (yd > zd) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }
  return { Q: rx, R: rz };
}

/**
 * Inverse of subhexSvgCenter. Given a world SVG point, return the
 * axial of the subhex whose centre is closest.
 */
export function svgToAxial(x: number, y: number): Axial {
  const dx = x - ANCHOR_SVG.x;
  const dy = y - ANCHOR_SVG.y;
  const qf = (2 / 3) * dx / SUB_R;
  const rf = (-dx / 3 + SQRT3 * dy / 3) / SUB_R;
  return axialRound(qf, rf);
}

/**
 * Six axial neighbors of (Q, R) in NEIGHBOR_DELTAS order
 * (clockwise from east).
 */
export function neighborsOf(Q: number, R: number): Axial[] {
  return NEIGHBOR_DELTAS.map(([dQ, dR]) => ({ Q: Q + dQ, R: R + dR }));
}

/** Stable string key for an axial coord. Matches gcc-subhex-data subhexId() minus the prefix. */
export function axialKey(Q: number, R: number): string {
  return `${Q}_${R}`;
}

/** Parse the stringified key produced by axialKey. Returns null on malformed input. */
export function parseAxialKey(key: string): Axial | null {
  const m = /^(-?\d+)_(-?\d+)$/.exec(key);
  if (!m) return null;
  return { Q: Number(m[1]), R: Number(m[2]) };
}

// Re-export ParentCoord for downstream consumers that don't want to
// reach into types.ts directly.
export type { Axial, ParentCoord, Vec2 } from './types.js';
