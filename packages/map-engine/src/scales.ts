// @graycloak/map-engine — scales
//
// The Greyhawk map drills down through a chain of scales. Two of them
// already existed in v0.1.0 as bespoke functions (parent + subhex);
// this module generalises that math and adds the missing rungs the
// DMG territory-development rules need.
//
// GLOBAL hex scales share one world-SVG plane anchored on the Darlene
// hex (ANCHOR_COL, ANCHOR_ROW) at axial (0,0). They tile by
// nearest-centre ownership — exactly the discipline ownerOf already
// uses — so adding a rung is "register a radius," not a coordinate
// migration. The chain:
//
//   parent  30 mi   R = 20      (Darlene odd-q offset col/row)
//   subhex   3 mi   R = 2       axial, 10 across a parent     (10:1)
//   mile     1 mi   R = 2/3     axial, 3 across a subhex        (3:1)
//
// 30 / 3 = 10 and 3 / 1 = 3, so mile = parent / 30 exactly. This is
// the rung DESIGN-unified-map.md flagged as the open `local` scale
// ("doesn't fit the existing 10:1 ratio"); the answer is it fits at
// 3:1 from subhex, sharing the same anchor.
//
// SITE-LOCAL grids live BELOW the mile. The DMG stops tiling the world
// here and starts drawing per-site maps: ~200-yard hexes for territory
// core mapping ("nine across" a 1-mile site), then 30-ft squares for
// settlements and 10-ft squares for dungeons/buildings. These are NOT
// in the global axial plane — each is anchored to one freehold's chosen
// mile-hex origin and addressed in local feet. See siteGrid().
//
// No DOM, no IDB, no Firestore. Pure geometry.

import { HEX_R, SUB_R, SQRT3 } from './constants.js';
import { ANCHOR_SVG, axialRound } from './coords.js';
import { parentOwnerOfPoint } from './ownership.js';
import type { Axial, ParentCoord, Vec2 } from './types.js';

/** World SVG units per real mile. The parent hex spans 30 mi at R=20. */
export const WORLD_UNITS_PER_MILE = HEX_R / 30; // 0.6667
export const YARDS_PER_MILE = 1760;
export const FEET_PER_MILE = 5280;

/** Radius of a one-mile global hex, in world SVG units. SUB_R / 3. */
export const MILE_R = SUB_R / 3;

/** A global hex scale: axial cells over the shared Darlene-anchored plane. */
export interface GlobalScale {
  readonly id: 'parent' | 'subhex' | 'mile';
  readonly milesAcross: number;
  /** Hex radius in world SVG units (flat-top). Parent uses offset coords, not this, for centres. */
  readonly radius: number;
  /** id of the coarser scale that owns cells of this one, or null for the top. */
  readonly parent: 'parent' | 'subhex' | null;
}

export const SCALES: Readonly<Record<GlobalScale['id'], GlobalScale>> = {
  parent: { id: 'parent', milesAcross: 30, radius: HEX_R, parent: null },
  subhex: { id: 'subhex', milesAcross: 3, radius: SUB_R, parent: 'parent' },
  mile: { id: 'mile', milesAcross: 1, radius: MILE_R, parent: 'subhex' },
};

// ---------------------------------------------------------------------------
// Generic axial hex math (subhex + mile; parent stays in offset coords).
// Mirrors subhexSvgCenter / svgToAxial but parameterised by radius. At
// radius = SUB_R these are bit-for-bit the v0.1.0 subhex functions.
// ---------------------------------------------------------------------------

/** World-SVG centre of axial (Q,R) at a given hex radius, anchored on ANCHOR_SVG. */
export function svgCenterAtRadius(radius: number, Q: number, R: number): Vec2 {
  return {
    x: ANCHOR_SVG.x + 1.5 * radius * Q,
    y: ANCHOR_SVG.y + SQRT3 * radius * (R + Q / 2),
  };
}

/** Inverse of svgCenterAtRadius: nearest axial cell of the given radius. */
export function axialAtRadius(radius: number, x: number, y: number): Axial {
  const dx = x - ANCHOR_SVG.x;
  const dy = y - ANCHOR_SVG.y;
  const qf = (2 / 3) * dx / radius;
  const rf = (-dx / 3 + SQRT3 * dy / 3) / radius;
  return axialRound(qf, rf);
}

/** World-SVG centre of a one-mile hex. */
export function mileSvgCenter(Q: number, R: number): Vec2 {
  return svgCenterAtRadius(MILE_R, Q, R);
}

/** Nearest one-mile hex to a world-SVG point. */
export function svgToMileAxial(x: number, y: number): Axial {
  return axialAtRadius(MILE_R, x, y);
}

// ---------------------------------------------------------------------------
// Cross-scale ownership. Finer cell -> the coarser cell whose centre is
// nearest. axialRound IS nearest-hex for a regular flat-top grid, so
// axial->axial ownership is exact; the parent rung routes through the
// Darlene offset search (parentOwnerOfPoint), reusing ownerOf's logic.
// ---------------------------------------------------------------------------

/** Subhex (axial) that owns a one-mile hex. */
export function mileToSubhex(Q: number, R: number): Axial {
  const c = mileSvgCenter(Q, R);
  return axialAtRadius(SUB_R, c.x, c.y);
}

/** Parent (Darlene col/row) that owns a one-mile hex, or null off-map. */
export function mileToParent(Q: number, R: number): ParentCoord | null {
  const c = mileSvgCenter(Q, R);
  return parentOwnerOfPoint(c.x, c.y);
}

/**
 * Enumerate the one-mile hexes whose centre falls inside a parent.
 * ~900 cells for an interior parent (30 across × 30 down, hex-packed).
 * Wide search box (±16 mile-steps) catches boundary cells.
 */
export function mileCellsInParent(col: number, row: number): Axial[] {
  // Centre of the parent in mile-axial space.
  const ringHalf = Math.ceil(30 / 2) + 2; // 30 miles across, + margin
  const c0 = axialAtRadius(MILE_R,
    HEX_R + col * 1.5 * HEX_R,
    HEX_R * SQRT3 / 2 + row * SQRT3 * HEX_R + ((col & 1) ? HEX_R * SQRT3 / 2 : 0));
  const out: Axial[] = [];
  for (let dQ = -ringHalf; dQ <= ringHalf; dQ++) {
    for (let dR = -ringHalf; dR <= ringHalf; dR++) {
      const Q = c0.Q + dQ;
      const R = c0.R + dR;
      const o = mileToParent(Q, R);
      if (o && o.col === col && o.row === row) out.push({ Q, R });
    }
  }
  return out;
}

/**
 * Axial ring of radius k around a centre cell (the k-th hex ring),
 * scale-agnostic. ring(0) = the centre only. Used to lay out a
 * freehold's cleared radius in mile-hexes (DMG 20–50 mile radius).
 */
export function axialRing(center: Axial, k: number): Axial[] {
  if (k < 0) return [];
  if (k === 0) return [{ Q: center.Q, R: center.R }];
  const out: Axial[] = [];
  // Walk the six edges of the ring. Directions are NEIGHBOR_DELTAS order.
  const dirs: ReadonlyArray<readonly [number, number]> = [
    [+1, 0], [0, +1], [-1, +1], [-1, 0], [0, -1], [+1, -1],
  ];
  // Start k steps in direction 4 (so the walk closes cleanly).
  let Q = center.Q + dirs[4]![0] * k;
  let R = center.R + dirs[4]![1] * k;
  for (let side = 0; side < 6; side++) {
    const d = dirs[side]!;
    for (let step = 0; step < k; step++) {
      out.push({ Q, R });
      Q += d[0];
      R += d[1];
    }
  }
  return out;
}

/** All cells within axial distance k of a centre (filled hexagon). */
export function axialDisk(center: Axial, k: number): Axial[] {
  const out: Axial[] = [];
  for (let r = 0; r <= k; r++) out.push(...axialRing(center, r));
  return out;
}

/** Axial (cube) distance between two cells. */
export function axialDistance(a: Axial, b: Axial): number {
  const dQ = a.Q - b.Q;
  const dR = a.R - b.R;
  return Math.max(Math.abs(dQ), Math.abs(dR), Math.abs(dQ + dR));
}

// ---------------------------------------------------------------------------
// Site-local grids (below the mile). Per-freehold, local origin, real
// units. A site grid details one global mile-hex (its `origin`). Cells
// are addressed in local integer coords; geometry returns offsets in
// FEET from the site origin so a renderer can place them under any
// transform it likes.
// ---------------------------------------------------------------------------

export type SiteGridKind = 'hex-200yd' | 'square-30ft' | 'square-10ft';

export interface SiteGrid {
  readonly kind: SiteGridKind;
  /** The global one-mile hex this site map details. */
  readonly origin: Axial;
  /** Edge/face size in feet (hex face-to-face, or square side). */
  readonly cellFeet: number;
  /** true for hex grids, false for square grids. */
  readonly isHex: boolean;
}

const SITE_CELL_FEET: Record<SiteGridKind, number> = {
  // "about 200 yards", DMG "nine across" a 1-mile site (1760/9 ≈ 195.6).
  'hex-200yd': 600,
  'square-30ft': 30,
  'square-10ft': 10,
};

export function siteGrid(kind: SiteGridKind, origin: Axial): SiteGrid {
  return {
    kind,
    origin,
    cellFeet: SITE_CELL_FEET[kind],
    isHex: kind === 'hex-200yd',
  };
}

/**
 * Local centre of a site cell, in FEET offset from the site origin.
 * For hex grids (col,row) is offset-ish flat-top; for square grids it
 * is a plain integer lattice. A renderer scales feet -> pixels.
 */
export function siteCellCenterFeet(grid: SiteGrid, col: number, row: number): Vec2 {
  if (grid.isHex) {
    // Flat-top hex: face-to-face = cellFeet, so radius = cellFeet/√3.
    const radius = grid.cellFeet / SQRT3;
    return {
      x: 1.5 * radius * col,
      y: SQRT3 * radius * (row + col / 2),
    };
  }
  const s = grid.cellFeet;
  return { x: (col + 0.5) * s, y: (row + 0.5) * s };
}

/** How many site cells span one mile along an axis (for sizing a full site map). */
export function siteCellsPerMile(grid: SiteGrid): number {
  return FEET_PER_MILE / grid.cellFeet;
}
