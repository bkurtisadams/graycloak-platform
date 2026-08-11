// @graycloak/map-engine v0.1.0
// ownership — which parent owns which subhex, and which subhexes
// fall in a viewport.
//
// ownerOf is the foundation of the per-parent gate elsewhere in the
// system. The result is stable for a given (Q, R) once the geometry
// constants are fixed, so we cache it process-wide.
import { HEX_R, SUB_R, SQRT3, ANCHOR_COL, ANCHOR_ROW, } from './constants.js';
import { parentSvgCenter, ANCHOR_SVG, } from './coords.js';
const _ownerCache = new Map();
/**
 * Clear the ownerOf cache. Tests use this between cases to keep
 * memory clean; production code generally doesn't need to.
 */
export function clearOwnerCache() {
    _ownerCache.clear();
}
/**
 * Parent that owns subhex (Q, R). "Owns" = nearest parent center in
 * world SVG, with tiebreak (lower col, then lower row). Returns null
 * only for subhexes whose nearest parent would have negative col or
 * row (off-map).
 *
 * The 5×5 search window (-2..+2 around the estimated parent) is
 * sufficient because subhex spacing is exactly 1/10 of parent
 * spacing — the true owner is never more than ±1 from the estimate
 * in odd-q layout, and ±2 is a safety margin.
 */
export function ownerOf(Q, R) {
    const key = `${Q}_${R}`;
    const cached = _ownerCache.get(key);
    if (cached)
        return cached;
    const sx = ANCHOR_SVG.x + 1.5 * SUB_R * Q;
    const sy = ANCHOR_SVG.y + SQRT3 * SUB_R * (R + Q / 2);
    const best = parentOwnerOfPoint(sx, sy);
    if (best)
        _ownerCache.set(key, best);
    return best;
}
/**
 * Parent (Darlene odd-q offset col/row) whose center is nearest a
 * world-SVG point. "Owns" = nearest parent center, with tiebreak
 * (lower col, then lower row). Returns null when the nearest parent
 * would have negative col or row (off-map).
 *
 * Factored out of ownerOf so finer global scales (subhex, mile) can
 * resolve their owning parent from a cell center without going
 * through the subhex axial path. Behaviour for subhex centers is
 * identical to the original ownerOf search.
 */
export function parentOwnerOfPoint(x, y) {
    // Estimate the offset coord by inverting parentSvgCenter, then
    // search a ±2 window — wide enough for the odd-q parity wobble.
    const colEst = Math.round((x - HEX_R) / (1.5 * HEX_R));
    const rowEst = Math.round((y - HEX_R * SQRT3 / 2) / (SQRT3 * HEX_R));
    let best = null;
    let bestD = Infinity;
    for (let dc = -2; dc <= 2; dc++) {
        for (let dr = -2; dr <= 2; dr++) {
            const col = colEst + dc;
            const row = rowEst + dr;
            if (col < 0 || row < 0)
                continue;
            const c = parentSvgCenter(col, row);
            const ddx = x - c.x;
            const ddy = y - c.y;
            const d = ddx * ddx + ddy * ddy;
            if (d < bestD - 1e-9) {
                best = { col, row };
                bestD = d;
            }
            else if (Math.abs(d - bestD) < 1e-9) {
                if (best === null || col < best.col || (col === best.col && row < best.row)) {
                    best = { col, row };
                    bestD = d;
                }
            }
        }
    }
    return best;
}
/**
 * Enumerate the subhex axials owned by a parent. ~100 cells per
 * parent in the regular interior; fewer for parents on the map
 * edge whose territory extends off-map.
 *
 * The (-11..+11) search box is wider than the 10-step parent
 * spacing to catch ownership at the boundary cells correctly.
 */
export function ownedByParent(col, row) {
    // Inline the parentCenterAxial body to avoid a circular import.
    const dCol = col - ANCHOR_COL;
    const cQ = dCol * 10;
    const cR = 10 * (row - ANCHOR_ROW) - 5 * dCol + 5 * (col & 1) - 5 * (ANCHOR_COL & 1);
    const out = [];
    for (let dQ = -11; dQ <= 11; dQ++) {
        for (let dR = -11; dR <= 11; dR++) {
            const Q = cQ + dQ;
            const R = cR + dR;
            const o = ownerOf(Q, R);
            if (o && o.col === col && o.row === row)
                out.push({ Q, R });
        }
    }
    return out;
}
/**
 * Enumerate {Q, R} of every subhex whose center falls inside the
 * given world-SVG axis-aligned bbox.
 *
 * Closed form: Q steps every 1.5·SUB_R along x; for each Q, R steps
 * every √3·SUB_R along y with a Q/2 phase offset. No clipping to
 * ownerOf — a cell appears whether or not any parent claims it.
 *
 * Semantics: cell center inside bbox. Callers wanting cell-polygon
 * overlap should pre-expand bbox by ~SUB_R on each side.
 *
 * Returns [] for degenerate (zero/negative width or height) bboxes.
 */
export function cellsInAxialBbox(bbox) {
    const out = [];
    if (!bbox)
        return out;
    const { minX, maxX, minY, maxY } = bbox;
    if (!(minX < maxX) || !(minY < maxY))
        return out;
    const qStep = 1.5 * SUB_R;
    const rStep = SQRT3 * SUB_R;
    const qLo = Math.floor((minX - ANCHOR_SVG.x) / qStep);
    const qHi = Math.ceil((maxX - ANCHOR_SVG.x) / qStep);
    for (let Q = qLo; Q <= qHi; Q++) {
        const phase = Q / 2;
        const rLo = Math.floor((minY - ANCHOR_SVG.y) / rStep - phase);
        const rHi = Math.ceil((maxY - ANCHOR_SVG.y) / rStep - phase);
        for (let R = rLo; R <= rHi; R++) {
            const cx = ANCHOR_SVG.x + qStep * Q;
            const cy = ANCHOR_SVG.y + rStep * (R + phase);
            if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
                out.push({ Q, R });
            }
        }
    }
    return out;
}
