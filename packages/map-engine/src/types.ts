// @graycloak/map-engine v0.1.0
// types — shared coordinate and geometric types.

/** Axial subhex coordinate. Q steps east, R steps southeast. */
export interface Axial {
  readonly Q: number;
  readonly R: number;
}

/** Darlene-grid parent hex coordinate (odd-q offset). */
export interface ParentCoord {
  readonly col: number;
  readonly row: number;
}

/** World SVG point. */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** Axis-aligned world SVG bounding box. */
export interface Bbox {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}
