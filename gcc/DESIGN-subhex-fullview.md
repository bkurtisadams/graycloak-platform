# DESIGN — Subhex Fullview (Path B)

Status: design draft, pending review.
Authors: Kurt + Claude, session 2026-05-09.
Supersedes: per-parent rendering lock in `gcc-subhex-view.js` v1.0+.

This document captures the design for migrating the subhex viewer from
a one-parent-at-a-time renderer to a continuous, multi-parent tiled
canvas with seamless drag-pan and viewport-bbox culling. Single-parent
`open(col, row)` becomes a navigation action ("center the view on this
parent"); the viewport itself is no longer constrained to a parent
silhouette.

The data layer is already global. `ownerOf(Q, R)`, `subhexSvgCenter(Q, R)`,
paths-by-cell indexes, and fog-by-subhex predicates all operate in world
coordinates without any per-parent gate. Fullview is a render-layer and
controls-layer change; the data layer is unchanged.

---

## Summary of decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Coordinate space | World SVG via `subhexSvgCenter(Q, R)`; viewport = pan + zoom transform over world. |
| 2 | Cell enumeration | Viewport-bbox cull each frame; cells looked up by `ownerOf(Q, R)` for owner/terrain. |
| 3 | Pan/zoom UX | Space+drag or middle-mouse pan; wheel zoom (existing); paint tools unchanged. |
| 4 | Parent silhouettes | Toggleable overlay; rendered for every parent intersecting viewport. |
| 5 | State refactor | `parentCol/Row/Q/R/Terrain` → `viewCenterX/Y/zoom`; "current parent" derived from cursor or center. |
| 6 | Navigation API | `open(col, row)` preserved; resolves to `centerOnParent(col, row)`. |
| 7 | Performance | Per-parent tile group caching; rebuild-on-data-change, transform-on-pan. |
| 8 | Path/region/lake rendering | Enumerate by viewport-bbox; existing renderers operate on global cell sets without change. |
| 9 | Parent-path markers / crossings | Generalize from "this parent's edges" to "all parent edges in viewport". |
| 10 | Fog | No change — already global per-subhex; render predicate unchanged. |
| 11 | Lost-vector display | Reserved (future); fullview unblocks but doesn't implement. |

---

## Q1 — Coordinate space and viewport model

### Single source of truth: world SVG

The data layer's `subhexSvgCenter(Q, R)` returns world SVG coordinates
keyed to `HEX_R=20`. This is canonical. Fullview adopts it directly:
the viewer's SVG `viewBox` slides over the world plane, and every cell
renders at its world position regardless of which parent owns it.

The current parent-local geometry (`cellViewport(Q, R)` recentering on
`parentQ/R`) goes away. There is no "viewport center cell" concept;
the viewport is a rectangle in world SVG space.

### Viewport state

```
state.view = {
  cx: <world SVG x>,     // viewport center, world coords
  cy: <world SVG y>,
  zoom: <number>,        // 1.0 = render at HEX_R=20 native scale
  w: <pixels>,           // window inner width
  h: <pixels>,           // window inner height
}
```

`viewBox` is computed: `[cx - W/(2*zoom), cy - H/(2*zoom), W/zoom, H/zoom]`
where `W, H` are world units corresponding to the current window pixel
dimensions at zoom 1.

### Rendering scale

The current view renders at SUB_R=26 (≈10× the data layer's SUB_R=2).
This was chosen so `gcc-subhex-icons.js` (with hardcoded stroke widths)
worked unchanged. Fullview keeps the same effective rendering scale by
applying a constant `displayScale = 13` (so `SUB_R_view = 13 * SUB_R_data`)
inside the SVG transform. The viewport math above uses world SVG units;
the on-screen sizes match v2.13 at zoom 1.

### Why world coords, not parent-local

Parent-local coords forced a coordinate flip every time the viewport
crossed a parent boundary. World coords let the viewport pan freely.
Every helper that took `(Q, R, parentTerrain)` becomes `(Q, R)` with
`parentTerrain` resolved via `ownerOf(Q, R)` lookup. The data layer
already supports this pattern.

---

## Q2 — Cell enumeration and culling

### Visible-cell predicate

For each animation frame (or each rebuild trigger), enumerate cells
whose hex polygon intersects the viewport rectangle:

```
visibleCells():
  const { cx, cy, zoom, w, h } = state.view;
  const halfW = w / (2 * zoom), halfH = h / (2 * zoom);
  const margin = HEX_R * 2;  // generous; cheap
  const bbox = {
    minX: cx - halfW - margin, maxX: cx + halfW + margin,
    minY: cy - halfH - margin, maxY: cy + halfH + margin,
  };
  // Convert bbox corners to axial; iterate the rectangle.
  return cellsInAxialBbox(bbox);
```

`cellsInAxialBbox(bbox)` is a new helper in `gcc-subhex-data.js`. It
returns `{Q, R}[]` for every cell whose center falls in the bbox (with
the margin handling cells whose hexes straddle the edge).

### Owner resolution per cell

For each visible cell:

```
const owner = ownerOf(Q, R);
const parentTerrain = owner ? getHexTerrain(owner.col, owner.row) : null;
const sub = getSubhex(Q, R, parentTerrain);
```

Same call as today; the only change is `parentTerrain` is per-cell
rather than the single `state.parentTerrain` value. The performance
cost is minimal — `ownerOf` is cached in `_ownerCache` and `getHexTerrain`
is an O(1) main-map lookup.

### No more "fragments"

The fragment concept was a workaround for parent-locked rendering: a
cell whose hex polygon overlaps a parent silhouette but is owned by a
neighbor. In fullview every cell renders at its world position with its
true owner; there is no boundary to fragment across. The
`fragmentsForParent` helper stays in the data API (other consumers may
use it) but the viewer stops calling it.

`buildCellGroup`'s `fragmentInfo` parameter is retired in the fullview
renderer. Cell groups always render with their true owner's terrain.

### Cell count in viewport

At zoom 1 (default) with a typical window (~1100 × 700 viewport, ~9.3 ×
6 parent hexes), the visible cell count is ~600–900 cells across 6–12
parents. At zoom 0.5 (max zoom-out), ~2400–3600 cells across 24–40
parents. Both are tractable for a single SVG render; per-parent tile
caching (Q7) handles the rebuild performance.

---

## Q3 — Pan/zoom UX

### Pan gesture: space+drag (primary), middle-mouse (alternate)

The viewer already binds left-click and left-drag to selection and
brush painting. Pan needs to coexist without ambiguity. Two gestures:

1. **Space+drag** — hold space, left-mouse-drag pans the viewport.
   Cursor changes to `grab` while space is held, `grabbing` while
   dragging. Discoverable via tool-tip on the zoom controls; keyboard
   users get an accessible alternative.
2. **Middle-mouse drag** — middle-button down + drag pans. Mouse-only
   alternative; same `grab`/`grabbing` cursor cue.

Right-click is reserved for future context menu (out of scope here).

### No edge-pan, no auto-scroll

Drag-pan only. Hovering the viewport edge does not pan. Consistent with
the current viewer: nothing scrolls without explicit input.

### Wheel zoom (unchanged)

`onSvgWheel` already handles wheel zoom; the implementation continues
to anchor zoom on the cursor position. The math changes from "scale
within parent-locked viewBox" to "adjust `state.view.zoom` and recompute
viewBox from `cx, cy, zoom`," but the felt behavior matches v2.13.

### Zoom slider / buttons

Existing zoom controls stay; they call `setZoom(newZoom, anchor)`. Zoom
range remains `[ZOOM_MIN=0.5, ZOOM_MAX=4.0]`. The default zoom (1.0)
shows roughly the same area as the current per-parent view.

### Paint-tool gestures (unchanged)

Click-to-paint, drag-to-brush, shift-drag-to-erase remain bound to
left-mouse without modifiers. Space+drag preempts paint while space is
held — armed-tool callout updates to "(pan mode)" while space is held
so the GM sees the gesture switch.

---

## Q4 — Parent silhouette rendering

### Toggleable overlay

Parent silhouettes are useful as orientation cues but visually noisy
when the GM is editing terrain or paths. A new `#sxw-show-parents`
toggle controls a parent-outline overlay:

```
[x] Show parent boundaries
```

Default: on.

### Implementation

For every parent whose `parentSvgCenter(col, row)` falls within the
viewport bbox + a margin, render a `<polygon>` with the parent's
flat-top hexagon points. CSS class `.sxw-parent-outline-overlay` styles
it (1px gold, low opacity) so it's perceptible without dominating.

Parent IDs (e.g., "K4-91") render as small labels at parent center when
zoom ≥ 0.7; hidden at deeper zoom-out to keep the canvas clean.

### Why an overlay, not a frame

In the per-parent view, the parent outline served a structural role:
it told the GM what they were editing. In fullview that's no longer a
constraint — the GM can paint anywhere — so the silhouette demotes from
frame to wayfinding cue.

### No parent-shaped clipping

Cells render their full hex shape regardless of parent ownership. There
is no clip-path that hides cell extents at parent boundaries. Cells
that span ownership (the fragment cases) draw their full polygon, and
the seam between parents is invisible at the cell layer — exactly the
"seamless tiling" goal.

---

## Q5 — State refactor

### From parent-local to world-local

Replace:

```
state.parentCol  state.parentRow  state.parentId  state.parentTerrain
state.parentQ    state.parentR
```

With:

```
state.view = { cx, cy, zoom, w, h }
state.cursorParent  // { col, row } | null — derived from cursor each move
state.centerParent  // { col, row } | null — derived from view center each pan
```

`cursorParent` and `centerParent` are write-through derivations; they
update on `mousemove` and `pan-end` respectively. The "what parent are
we on" semantic that several callers (terrain palette, parent ID label,
landmark name fetch) used moves from `state.parentCol/Row` to whichever
derivation fits the caller.

### Parent-derived UI elements

| UI element | Derivation source |
|---|---|
| Window title (landmark name or "Subhexes") | `centerParent` |
| Coord bar (`#sxw-coord-bar`, e.g., "K4-91") | `cursorParent` if hovering, else `centerParent` |
| Default terrain when authoring (palette base) | `cursorParent` for click-paint, `centerParent` for keyboard input |
| Parent-CRUD disabled-state in `gcc-hex-edit.js` | unchanged (queries data layer) |

### `currentParent()` export

The existing `currentParent()` export (used by main map to detect
"clicking the already-open parent") returns `centerParent`. Main-map
behavior preserved: clicking a parent that's already centered is a
no-op; clicking a different parent re-centers.

### State persistence

`gcc-subhex-view-rect` localStorage key gains a `view: { cx, cy, zoom }`
sub-object. On load, restore last view position. New users start
centered on the Greyhawk anchor parent (existing default) at zoom 1.

---

## Q6 — Navigation API

### Back-compat: `open(col, row)` preserved

External callers (main map click handler, `gcc-header.js` "Open
subhexes" button, etc.) use `GCCSubhexView.open(col, row)`. This keeps
working — its semantics shift from "load this parent's view" to "center
the view on this parent":

```
open(col, row):
  ensureWindow();
  state.isOpen = true;
  centerOnParent(col, row);   // new helper; sets state.view.cx/cy
  // existing: window display, controls position, etc.
  rebuildSVG();
```

### `centerOnParent(col, row)`

```
centerOnParent(col, row):
  const c = parentSvgCenter(col, row);
  state.view.cx = c.x;
  state.view.cy = c.y;
  // zoom unchanged unless current zoom is outside bounds for "comfortable parent view"
  applyViewport();
```

If the user has zoomed deep in or out and then jumps to a new parent,
zoom is preserved. Optional refinement: a "fit parent" zoom snap on
double-click of a parent label, deferred.

### Direct world-coord navigation

New exports for future callers (lost-vector marker, journey route
display, etc.):

```
GCCSubhexView.centerOn({ Q, R })       // center on a subhex
GCCSubhexView.centerOn({ col, row })   // center on a parent (alias)
GCCSubhexView.centerOn({ x, y })       // center on world coords
GCCSubhexView.zoomTo(zoom, anchor?)    // set zoom; optional world anchor
```

### Window opening (no parent required)

For a future "open subhex view from main toolbar" entry, `open()` (no
args) opens at the last persisted view. This is additive; existing
`open(col, row)` callers don't change.

---

## Q7 — Performance / tile caching

### Strategy: per-parent tile group, transform on pan

`rebuildSVG()` currently rebuilds every cell on every state change.
For multi-parent fullview, build per-parent `<g>` tile groups once and
keep them around; re-render a tile only when its data changes; pan and
zoom adjust the outer transform without touching tile contents.

```
state.tileCache = Map<'col-row', SVGGElement>
```

Each tile group contains:
- ~100 cell groups for cells owned by that parent
- the parent silhouette outline (overlay)
- parent-path markers for that parent's edges

On `gcc-subhex-changed`, invalidate the affected parent's tile (or the
specific cells' tiles for fine-grained changes). On pan, set transform:
`translate(-cx + W/2/zoom, -cy + H/2/zoom) scale(zoom)`. On viewport
move, mount/unmount tile groups based on parent intersection.

### Tile invalidation triggers

| Event | Invalidates |
|---|---|
| `gcc-subhex-changed` (cell terrain/feature/region/lake) | Tile for owner of changed cell |
| `gcc-subhex-paths-changed` | Tiles for parents touched by changed path |
| `gcc-subhex-lakes-changed` | Tiles for parents touched by changed lake |
| `gcc-fog-changed` (single-cell) | Cell DOM only (re-tag `.fogged`); no tile rebuild |
| `gcc-fog-changed` (bulk) | Tiles for affected parents |
| `gcc-region-changed` | Tiles for parents containing region members |

`gcc-fog.js` already supports per-cell fog updates without tile rebuild
(see v2.11.0 brush flow); fullview preserves that fast path.

### Off-screen tile lifecycle

Tiles built but no longer in viewport: keep cached for fast re-pan, but
detach from the DOM. Cap cache at ~32 tiles (LRU-evicted). Greyhawk
Flanaess at zoom 1 ≈ 30 visible parents max; cache covers a reasonable
recently-visited window.

### First-frame strategy

On `open()` or initial load, build only the visible tiles synchronously.
Background-build adjacent tiles in `requestIdleCallback` so the next
small pan is instant. If `requestIdleCallback` isn't available, fall
back to `setTimeout(0)` deferred build.

### Performance budget

Target: pan and zoom maintain 60 fps on a typical laptop. Tile builds
are off the critical path; only the transform update runs on every pan
frame. Initial open (~6–12 visible tiles) should complete in under
200 ms.

---

## Q8 — Path / region / lake rendering

### Cull by viewport, not by parent

Current `renderPaths`, `renderRegionLabels`, etc. iterate "this parent's
paths/regions/lakes." Fullview iterates "all paths whose cells intersect
the viewport bbox," using the indexes Q7 in `DESIGN-paths-water.md`
established (`pathsByCell`, `cellsByLake`).

```
visiblePaths():
  const cells = visibleCells();
  const ids = new Set();
  for (const { Q, R } of cells){
    for (const id of (pathsByCell.get(`${Q},${R}`) || [])) ids.add(id);
  }
  return [...ids].map(id => getPath(id));
```

Same shape for lakes via `cellsByLake` reverse-index.

### Path geometry in world coords

Path rendering already polylines through cell centers. Cell centers
become world SVG coords (Q1) instead of parent-local coords. The
polyline drawing logic is unchanged otherwise; it just reads from
`subhexSvgCenter(Q, R)` directly instead of `cellViewport(Q, R)`.

### Region labels

Region label placement (centroid of authored cells) computed in world
SVG coords. Single label per region, regardless of whether members
span parents. Labels hide at zoom < 0.7 to keep the wide-zoom view
legible.

### Lake fill

Lakes render as a single filled polygon per lake (or as cell tinting,
depending on Q1 lake-render decision in DESIGN-paths-water.md). Either
way: enumerate via `cellsByLake`, draw in world coords, no parent gate.

---

## Q9 — Parent-path markers and crossings

### Generalize "this parent's edges" to "edges in viewport"

`renderParentPathMarkers` currently calls `GCCPaths.segmentsAt(parentCol,
parentRow)` to enumerate one parent's edges. Fullview iterates every
parent intersecting the viewport:

```
for (const parent of parentsInViewport()){
  for (const seg of GCCPaths.segmentsAt(parent.col, parent.row)){
    placeMarker(...);
  }
}
```

`parentsInViewport()` is a small helper: enumerate parent column/row
pairs whose `parentSvgCenter` falls within bbox + HEX_R margin.

### Marker dedup

Parent-path edges are shared between two parents. Naively iterating
both parents would draw each marker twice. Dedupe by canonicalizing
edge identity to the lexicographically-lower parent (col, row) ordering;
only the "owner" parent's pass draws the marker.

Crossings dedupe identically: each crossing belongs to the cell with
lower (Q, R) ordering across the parent boundary.

### Click affordance preserved

Clicking a parent-path marker still opens the path-segment-author flow.
The handler `onParentPathMarkerClick` operates in world axial space
already (passes through to `GCCPaths.neighborAcross`), so no change.

### Visual treatment at deep zoom-out

Markers fade at `zoom < 0.7` (CSS opacity transition). At zoom < 0.5
they hide entirely. The polylines (path body) remain visible at all
zooms; only the per-edge markers throttle.

---

## Q10 — Fog (no change)

`GCCFog.shouldFogSubhex(Q, R)` already operates globally. The viewer
applies `.fogged` class in `buildCellGroup` per-cell; fullview preserves
that exact code path. Fog brush gestures (paint/sweep) work identically
across parent boundaries because they too are global.

The fog preview toggle (`#sxw-fog-preview`) and brush tool (`#sxw-fog`)
stay in the controls panel unchanged.

### Future: fog auto-reveal on view-pan?

Currently fog reveals when the party token moves on the main map. In
fullview, the GM can pan their view far from the party without
revealing anything (correct behavior: GM omniscience over data,
players' fog still respects party position). No change to reveal
semantics; only the rendering surface changes.

---

## Q11 — Lost-vector display (reserved)

The DMG getting-lost rules (per `gcc-lost.js` Slice 6, and the prior
`b0a93b39` session research) compute a per-hex perceived position that
diverges from real position when parties get lost. This needs
two-vector display: real position (where the party actually is) and
perceived position (where the party thinks they are). The single-parent
viewer can't show that pair when the divergence crosses parent
boundaries.

Fullview unblocks this. The render surface is reserved (a dedicated
`<g class="sxw-lost-vector-layer">` mounts on the viewport root). The
display logic itself is **out of scope for this design** — it gets its
own design doc when the lost-engine wiring is ready to move into
authoring UI.

This document captures the architectural prerequisite only.

---

## Implementation scope (next session)

Single-session scope is tight. Slices ordered so each builds on the
last, and any slice can ship and stabilize before the next.

### Phase 1 — Coordinate refactor

1. **`gcc-subhex-data.js` v2.5.0** — add `cellsInAxialBbox(bbox)`
   helper. Pure addition; no schema change. Tested against the
   existing `ownedByParent` results for sanity.
2. **`gcc-subhex-view.js` v3.0.0** — coordinate refactor only.
   Replace `cellViewport(Q, R)` with `cellWorldCenter(Q, R)` (delegates
   to `subhexSvgCenter`). Replace `state.parentQ/R/Terrain` with
   `state.view = { cx, cy, zoom, w, h }`. Render unchanged
   single-parent silhouette; viewport math runs on world coords with
   the silhouette pinned to current parent. **No multi-parent yet.**
   This is a no-visual-change refactor that proves the world-coord
   plumbing.

### Phase 2 — Multi-parent tiling

3. **`gcc-subhex-view.js` v3.1.0** — multi-parent rendering. Drop the
   parent silhouette as a frame; render every cell in viewport bbox
   via `ownerOf` lookup. Drop the `fragmentsForParent` call site.
   Parent silhouette overlay (Q4) added behind a default-on toggle.
   Initial pan/zoom UX: wheel zoom only; pan via `centerOnParent` API
   when external callers fire `open(col, row)`. **No drag-pan yet.**
4. **`gcc-subhex-view.js` v3.2.0** — drag-pan implementation. Space+drag
   and middle-mouse pan handlers. Cursor styling. Armed-tool callout
   updates while space is held.

### Phase 3 — Performance and rendering scale

5. **`gcc-subhex-view.js` v3.3.0** — per-parent tile group caching.
   `state.tileCache` Map; mount/unmount on viewport change; per-parent
   invalidation hooks for `gcc-subhex-changed`, `gcc-subhex-paths-changed`,
   `gcc-subhex-lakes-changed`, `gcc-region-changed`. LRU eviction at
   ~32 tiles.
6. **`gcc-subhex-view.js` v3.4.0** — viewport-bbox path/region/lake
   enumeration. Replace per-parent path/region/lake iteration with
   `visiblePaths()` / `visibleLakes()` / `visibleRegions()` over
   the indexes from `DESIGN-paths-water.md` Q7.

### Phase 4 — Markers, crossings, polish

7. **`gcc-subhex-view.js` v3.5.0** — parent-path markers and crossings
   generalized to `parentsInViewport()` iteration with marker dedup.
   Visual throttle on markers at `zoom < 0.7`.
8. **`gcc-subhex-view.js` v3.6.0** — view persistence
   (`gcc-subhex-view-rect.view = { cx, cy, zoom }`); navigation API
   exports (`centerOn`, `zoomTo`); parent-ID label rendering.

### Out of scope for this design

- Lost-vector display (Q11; separate design doc when ready).
- Subhex viewer window resize / fullscreen mode (existing window
  resize works; not changing here).
- Panel reorg or palette changes (v2.8/v2.9 layout preserved).
- Mobile / touch gestures (not currently supported in v2.13; not
  added here).
- Mini-map / overview panel.

### Open items

- **Default zoom** at first open of a new install: 1.0 (centered on
  Greyhawk anchor) is the current plan. Confirm during Phase 2.
- **Tile cache size** (~32) is a guess; tune based on Phase 3
  performance measurement.
- **Right-click reservation** for context menu — placeholder; no
  implementation in this design.

---

## Conventions captured

- **World SVG coords** are the canonical render-space convention for
  the subhex layer. Parent-local coords are an artifact of the legacy
  per-parent renderer and should not be reintroduced.
- **Viewport-bbox enumeration** is the GCC convention for multi-parent
  iteration. Per-parent loops survive only inside the data layer
  (`ownedByParent`, `lakesInParent`) where they're cheap and useful;
  the render layer does bbox enumeration.
- **Tile caching** with rebuild-on-data, transform-on-pan is the GCC
  convention for SVG-based map renderers. Future Greyhawk-map
  rewrites adopt the same pattern.
- **Soft graceful degradation at zoom-out**: labels, markers, and
  per-cell decorations fade or hide at `zoom < 0.7`; cells and
  silhouettes remain visible at all zooms. Hard cutoff at
  `zoom < ZOOM_MIN`.
- **Single-parent `open(col, row)`** is preserved as a navigation
  action (back-compat). Internal state has no parent lock; "current
  parent" is derived from cursor or view center per caller need.
