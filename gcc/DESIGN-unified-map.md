# DESIGN — Unified Map (Phase B)

Status: design draft, revision 2 — scale-buttons.
Authors: Kurt + Claude, session 2026-05-09.
Supersedes: standalone parent map page (`greyhawk-map.html` as 30-mile
hex renderer) + floating subhex viewer window (`gcc-subhex-view.js`'s
draggable `#subhex-window`).

Builds on: `DESIGN-subhex-fullview.md`. The Slice 1–3 work in
`gcc-subhex-view.js` v3.0.0–v3.1.0 (world-coord viewport, multi-parent
tiling, viewport-bbox enumeration) is the foundation Phase B sits on.

This document captures the design for collapsing the parent-map page
and the subhex viewer into a single fullscreen map with explicit
scale selection. Scale is a button-driven mode, not a derived
property of zoom: the GM picks `30-mile`, `3-mile`, etc., and that
choice determines what renders. Zoom remains free within each scale
for "see more vs. see less of this scale's hexes."

The parent-map page dies in Phase B. Existing bookmarks pointing at
`greyhawk-map.html` keep working — that URL becomes the unified map.

### What changed from revision 1

Revision 1 derived scale from zoom thresholds with a crossover band.
Revision 2 makes scale an explicit mode (Q1, Q3, Q4, Q5, Q11), which
removes threshold tuning, crossover-band perf concerns, and dual-
layer compositing from the design entirely. Zoom is now zoom; scale
is now scale.

---

## Summary of decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Scale model | Explicit named scales (`parent`, `subhex`, future `subsubhex` / `local` / etc.) selected by buttons. Exactly one scale active at any moment. |
| 2 | Coordinate space | Single canonical world SVG (data-layer coords, HEX_R=20 / SUB_R=2 native). Each scale has its own `pxPerWorldUnit` baseline + zoom range. |
| 3 | Render strategy | One renderer active at a time. The active scale's renderer owns the SVG; inactive renderers are unmounted. |
| 4 | Scale switch | Instantaneous swap. State that carries across switches: world center (cx, cy), active tool (if it applies at the new scale), selection (translated by rule). |
| 5 | Pan / zoom UX | Inherits from subhex fullview design (wheel zoom, space+drag, middle-mouse). Free zoom within each scale; auto-switch to neighboring scale when wheel-zoom hits the scale's zoom limit (convenience continuity). |
| 6 | Minimap | Persistent small SVG, always parent-scale, viewport rectangle overlay. Drag rect to pan, click to teleport. Toggleable, position-persistent. |
| 7 | Tools surface | Single side panel. Tools registered with scale predicates (`parent` / `subhex` / `any`); panel filters visible tools to active scale. Switching scale auto-disarms tools that no longer apply. |
| 8 | Navigation API | `GCCMap.setScale(name)`, `GCCMap.centerOn(target, scale?)`, `GCCMap.zoomTo(zoom)`. Back-compat: `GCCSubhexView.open(col, row)` becomes an alias for `GCCMap.openParentSubhex(col, row)` (sets scale=`subhex`, centers on the parent). |
| 9 | URL state | `#scale=NAME&view=cx,cy,zoom` hash for shareable links; `#parent=K4-91`, `#subhex=Q,R` shortcuts. Existing bookmarks to `greyhawk-map.html` keep working. |
| 10 | Performance | Per-scale viewport-bbox culling. Tile caching at subhex scale (DESIGN-subhex-fullview.md Slice 5). Only the active scale runs a renderer; switch is build-fresh-then-mount. |
| 11 | Migration | New file `gcc-map.js` (the unified shell). `greyhawk-map.html` rewritten to host it. Existing `gcc-subhex-view.js` rendering core factored into `gcc-map-subhex-renderer.js`; the floating window itself retires in Slice 7 (confirmed). |

---

## Q1 — Scale model

### Scales are named modes

A scale is a (name, hex size, data layer, renderer) tuple. The
unified shell holds a registry; the active scale is one entry from
the registry.

| Name | Hex size | Data layer | Render module | Phase |
|---|---|---|---|---|
| `parent` | 30 mi | main-map TERRAIN + GCCLandmarks + GCCPaths | `gcc-map-parent-renderer.js` | B |
| `subhex` | 3 mi | GCCSubhexData + GCCSubhexPaths | `gcc-map-subhex-renderer.js` (extracted from gcc-subhex-view.js) | B |
| `subsubhex` | ~0.3 mi (10:1 from subhex) | TBD | reserved | C |
| `local` (1 mi) | 1 mi | TBD — see below | reserved | C+ |

The `local` 1-mile scale Kurt mentioned doesn't fit the existing
10:1 ratio between parent and subhex. Adding it requires either:
(a) a new data layer with a different ratio (e.g., 3:1 from subhex,
giving 1-mile cells inside 3-mile subhexes), or (b) revisiting the
parent / subhex ratio entirely. Phase B implements `parent` and
`subhex`; the architecture is scale-count-agnostic so `local` and
`subsubhex` slot in when their data layers exist without rework.

### One scale active at a time

`state.activeScale` is the registry entry currently rendering. Every
render call delegates to `activeScale.renderer`. Inactive renderers
are dormant (no DOM, no event listeners).

There is no crossover, no opacity blending, no dual-layer
compositing. Scale switches replace the active renderer wholesale.

### Per-scale zoom

Each scale registry entry carries:

```
{
  name: 'subhex',
  hexSize: 3,                    // miles, for display
  pxPerWorldUnit: 13,            // baseline at zoom=1
  zoomMin: 0.5,
  zoomMax: 4.0,
  zoomDefault: 1.0,
  renderer: GCCMapSubhexRenderer,
  tools: ['subhex-paint', 'subhex-region', ...],
}
```

`pxPerWorldUnit` × `zoom` gives the SVG transform's scale factor.
`zoomMin / zoomMax` are the wheel-zoom and slider bounds for that
scale. When wheel-zoom would exceed the bound, see Q5 (auto-switch).

### Why explicit scales

- A 30-mile hex and a 3-mile subhex aren't "the same thing at
  different zoom levels"; they're different semantic units (a
  campaign-planning hex vs. a travel/exploration hex). Buttons make
  that explicit.
- No threshold tuning. No crossover-band perf cost. No "what scale
  am I at?" indicator (the highlighted button is the indicator).
- Scale-specific tools are unambiguous — clicking the `subhex`
  button is the act of declaring "I want to author at this scale."
- New scales are new registry entries. No cascading thresholds to
  re-balance every time.

---

## Q2 — Unified coordinate space

### One canonical world SVG

The data layer's existing convention is canonical:
`subhexSvgCenter(Q, R)` and `parentSvgCenter(col, row)` from
`gcc-subhex-data.js` define world coords. HEX_R = 20 world units;
SUB_R = 2 world units. Both renderers operate on these coords.

The current `gcc-subhex-view.js` v3.1.0 maintains this discipline
internally but applies a `DISPLAY_SCALE = 13` multiplier at render
time, a holdover from the per-window viewer's hardcoded SUB_R=26
stroke widths in `gcc-subhex-icons.js`. Phase B unifies on raw world
coords; `DISPLAY_SCALE` becomes `subhex.pxPerWorldUnit = 13` in the
scale registry, applied via SVG `<g>` transform.

### Viewport state

```
state.view = {
  cx: <world x>,             // viewport center in world coords
  cy: <world y>,
  zoom: <number>,            // per-scale zoom (resets to scale.zoomDefault on switch)
  perScaleZoom: { parent: 1.0, subhex: 1.0, ... },  // last zoom per scale
  w: <pixels>, h: <pixels>,  // window inner dimensions
}
```

`(cx, cy)` is shared across all scales — switching scale keeps you
over the same world point. `zoom` is per-scale; the `perScaleZoom`
map remembers each scale's last zoom so toggling between scales
feels stable (you don't re-set to default every time).

### viewBox computation

```
scaleFactor = activeScale.pxPerWorldUnit * state.view.zoom
viewBoxW    = state.view.w / scaleFactor
viewBoxH    = state.view.h / scaleFactor
viewBox     = [cx - viewBoxW/2, cy - viewBoxH/2, viewBoxW, viewBoxH]
```

Each scale has its own `pxPerWorldUnit` baseline so each scale's
zoom=1 produces a sensible default size for its hex unit. zoom 1 at
parent scale renders the world at "comfortable parent map" density;
zoom 1 at subhex scale renders the world at "comfortable subhex
editing" density. These are independent calibrations.

### Stroke width strategy

Two viable approaches, picked during Slice 3:

1. **Non-scaling-stroke**: stroke widths declared once in absolute
   px, `vector-effect: non-scaling-stroke` keeps them visually
   constant at any zoom. Cleanest result.
2. **Per-scale absolute**: each renderer sets its own stroke widths
   in world units, and they thicken/thin with zoom (current v3.1.0
   behavior).

Recommendation: non-scaling-stroke for selection / overlay strokes
(those should look the same at any zoom); per-scale absolute for
icons (a forest icon at parent scale is genuinely a different
graphic than at subhex scale). Final call in Slice 3.

---

## Q3 — Render strategy

### One renderer at a time

The unified shell calls `activeScale.renderer.mount(svg, state)` on
scale switch. The renderer takes ownership of the SVG: builds its
layers, registers its event handlers, manages its tile cache. On
switch-out, the shell calls `renderer.unmount()` — the renderer
removes its DOM and listeners.

### Parent renderer

At `parent` scale:

- Every parent hex polygon visible in viewport bbox (+ margin)
- Fill by `TERRAIN[t].rgb` for the parent's terrain
- Landmark glyphs (`GCCLandmarks`) at parent centers; names at zoom
  ≥ landmark-label threshold
- Parent-level paths (`GCCPaths`) drawn as polylines through parent
  centers, kind-colored
- Region overlays (parent-level regions from main-map data)
- Main-map fog of war
- Parties / tokens at their parent positions
- Selected-parent highlight ring

This is the rendering core of current `greyhawk-map.html` extracted
into a renderer module that takes a viewport bbox as input. Slice 1's
inventory sweep enumerates the exact features to migrate.

### Subhex renderer

At `subhex` scale:

- Every subhex cell visible in viewport bbox (+ margin) — Slice 3 of
  DESIGN-subhex-fullview.md
- Parent outline overlay (toggleable, default on)
- Subhex paths, region labels, parent-path markers, crossings
- Subhex fog
- Selected-cell highlight

This is `gcc-subhex-view.js` v3.1.0's render core, lifted into a
module without the floating-window chrome.

### Layer order (z-stack within the active renderer)

Bottom to top:

1. Hex fills (parent or subhex, per active scale)
2. Parent-outline overlay (subhex scale only; default on)
3. Region fills / overlays
4. Path polylines (kind-colored)
5. Parent-path markers (subhex scale)
6. Crossings × badges (subhex scale)
7. Landmarks / features
8. Selection rings + halos
9. Parties / tokens
10. Fog (multiplicative darkening)
11. Lost-vector layer (Phase C reserved)
12. Cursor / paint preview

Each layer is a `<g>` under the renderer's root group.

---

## Q4 — Scale switch

### Instantaneous swap

Clicking a scale button triggers:

```
1. activeScale.renderer.unmount()           // remove DOM, listeners, tile cache
2. state.view.zoom = state.view.perScaleZoom[newScale.name] ?? newScale.zoomDefault
3. activeScale = newScale
4. activeScale.renderer.mount(svg, state)   // build fresh
5. activeScale.renderer.render()            // first frame
```

No animation, no opacity blend. The switch is a clean cut.

If switch animation feels too abrupt in practice, Slice 9 polish can
add a brief crossfade (single-frame fade of the outgoing renderer's
root `<g>` before unmount). Default behavior remains: instant.

### State carried across switches

| State | Behavior on switch |
|---|---|
| World center `(cx, cy)` | Preserved exactly — the new scale renders the same world point at viewport center |
| Zoom | Restored from `perScaleZoom[newScale]` if seen before in session, else `newScale.zoomDefault` |
| Active tool | Stays armed if `tool.scales` includes the new scale; else auto-disarmed |
| Selection | Translated by rule — see below |
| Pan/zoom gesture state | Reset (no in-flight drags survive a switch) |
| Markers / brush state | Reset |

### Selection translation rules

| Old scale → New scale | Translation |
|---|---|
| `parent` → `subhex` | Selection cleared. (Selecting a parent at parent scale is "I'm interested in this hex"; that doesn't translate to a meaningful single subhex selection.) |
| `subhex` → `parent` | Cleared. (Could highlight the owning parent, but it's not really "the same selection" — leave it clean.) |
| same → same | (Not a switch.) |

Override in a future slice if user testing wants selection-survival
across switches; default is "switch is a fresh context."

### Auto-switch on zoom-limit-hit

Wheel-zooming out at `subhex.zoomMin` and continuing to scroll out:
auto-switch to `parent` scale at a zoom that produces visual size
continuity (the new scale's zoom is chosen so on-screen hex sizes
are roughly continuous across the switch). Inverse for zoom-in past
`parent.zoomMax`.

This gives the GM continuous-feeling navigation without giving up
explicit scale control via buttons. Implementation in Slice 4.

Edge cases:

- Auto-switch only fires on wheel zoom, not on slider/keyboard zoom
  (those clamp at the scale's bounds — explicit "stay at this
  scale" gesture).
- Hold `Shift` while wheel-scrolling to disable auto-switch (clamp
  at the bound). Optional refinement; defer to Slice 9.

---

## Q5 — Pan / zoom UX

Inherits from `DESIGN-subhex-fullview.md` Q3:

- **Wheel zoom**: anchored on cursor (already works in v3.1.0).
  Auto-switches scales on zoom-limit-hit (Q4).
- **Space + drag**: pan (Slice 4 of subhex fullview, lands before
  Phase B Slice 2).
- **Middle-mouse drag**: pan alternate.
- **Click + drag (no modifier)**: paint / select (scale-dependent).
- **Right-click**: reserved (future context menu).

Identical at every scale. No mode switch on scale selection beyond
the renderer change.

### Scale buttons

Tab-bar–style strip in the chrome, one button per registered scale:

```
[ 30-mile ] [ 3-mile ] [ … ]
```

Position: top of the side panel's "View" section (Q7), or as a
floating chrome strip top-center of the SVG. Slice 2 picks; tentative
preference is the side panel "View" section so all view chrome lives
together.

Active button: gold-fill armed style (matches existing
`.sxw-tool-btn-armed`). Tooltips on inactive buttons show the
scale's hex size for clarity.

Keyboard shortcuts: `1` = parent, `2` = subhex, `3` = (future scale),
etc. Configurable in Slice 5.

### Click semantics by scale

| Scale | Click on background | Click on hex/cell |
|---|---|---|
| `parent` | clear selection | select parent (highlight ring) |
| `subhex` | clear selection | select subhex cell |
| (future scales) | clear selection | select that scale's unit |

A double-click on a parent at parent scale: switch to subhex scale,
center on that parent, restore that scale's last zoom. Optional
convenience; defer to Slice 4.

### Keyboard

- `+` / `-` / `=`: zoom in / out / reset (within active scale)
- `0`: scale-to-fit (whole world at parent scale; whole parent at
  subhex scale; whole subhex at smaller scales)
- `1`, `2`, `3`, …: scale switches (above)
- Arrow keys: pan
- `g`: toggle parent-outline overlay (subhex scale)
- `m`: toggle minimap

Provisional; finalize during Slice 5 (tools migration).

---

## Q6 — Minimap

### Function

Persistent small SVG showing the entire Flanaess at parent scale,
with a yellow viewport rectangle overlaid. World orientation that's
always available regardless of active scale or pan position.

### Behavior

- Drag the viewport rectangle: pans the main view 1:1.
- Click anywhere on the minimap: jumps the main view's center to
  that world point (active scale + zoom unchanged).
- Shift+click: jumps and switches scale to `subhex` centered on
  the clicked parent.

### Placement and sizing

- Default position: bottom-right corner of the main map.
- Default size: ~200 × 150 px.
- Draggable header (like the v3.1.0 controls window). Position
  persists in localStorage.
- Toggleable via `m` key or a small chrome button.

### Rendering

A stripped-down parent renderer:

- Parent hex polygons with terrain fill
- Major rivers and roads (parent-level paths) in 1px
- Landmarks as 2px dots (no labels)
- Viewport rectangle in yellow stroke (sized to the active scale's
  viewport at the minimap's zoom)

Re-renders on data change (debounced) and on every viewport pan
(transform-only, no rebuild).

### What it doesn't do (Phase B)

- No subhex-scale detail (always parent scale).
- No fog rendering — kept clean for orientation.
- No party tokens (clutter at this size; reconsider in polish slice).
- No editing affordances (read-only navigation aid).

---

## Q7 — Tools surface

### One panel, scale-aware

Currently main-map and subhex-view have separate tool surfaces. Phase
B unifies them. Tools register with a scale predicate; the panel
shows only tools whose predicate matches the active scale.

### Tool registry sketch

```
GCCMap.registerTool({
  id: 'subhex-paint',
  label: 'Terrain',
  scales: ['subhex'],          // 'parent' | 'subhex' | 'any' | array
  panel: subhexPaintPanel(),
  onArm: ..., onDisarm: ...,
});
```

### Tool inventory (provisional — finalize in Slice 1)

| Tool | Scales |
|---|---|
| Landmark editor | `parent`, `subhex` |
| Hex editor | `parent` |
| Region overview | `parent`, `subhex` |
| Journey planner | `any` |
| Weather | `any` |
| Encounter generator | `parent`, `subhex` |
| Parties / tokens | `any` |
| Subhex terrain paint | `subhex` |
| Subhex region/path/lake authoring | `subhex` |
| Subhex fog brush | `subhex` |
| Parent fog brush | `parent` |
| LOST engine display | `any` |

Tools whose scale doesn't include the active scale: hidden from the
panel (not just disabled). Scale switches auto-disarm the active
tool when its scale predicate no longer matches.

### Panel layout

Left side panel (collapsible). Three sections:

1. **View**: scale buttons, zoom controls, parent-outline toggle,
   minimap toggle, scale indicator (the active button itself).
2. **Selection**: details for the currently-selected hex/cell at
   the active scale (replaces v3.1.0's controls window).
3. **Tools**: scale-filtered tool buttons + their callouts.

Panel position and width persist; default ~360px, collapsible to a
sliver (icon-only).

---

## Q8 — Navigation API

### Public API

```
GCCMap.open()                              // open at last persisted view
GCCMap.openParentSubhex(col, row)          // setScale('subhex'), centerOn parent
GCCMap.setScale(name)                      // switch to named scale
GCCMap.centerOn(target, scale?)            // target = {col,row} | {Q,R} | {x,y}
GCCMap.zoomTo(zoom, anchor?)               // active-scale zoom; optional world anchor
GCCMap.scaleToFit(target?)                 // fit a parent / subhex / world to viewport
GCCMap.fitFlanaess()                       // setScale('parent'), fit world
GCCMap.activeScale()                       // string: 'parent' | 'subhex' | …
GCCMap.currentSelection()                  // { kind, ...details } | null
```

`GCCMap.centerOn(target, scale?)`:

- If `scale` provided, switches to it.
- If target is `{col, row}`: centers on parent center (works at any
  scale; world coords are shared).
- If target is `{Q, R}`: centers on subhex center; if scale arg
  omitted and active scale isn't `subhex`, no auto-switch (caller's
  responsibility).
- If target is `{x, y}`: centers on world coord.

### Back-compat shims

```
GCCSubhexView.open(col, row)  → GCCMap.openParentSubhex(col, row)
GCCSubhexView.isOpen()        → true
GCCSubhexView.close()         → GCCMap.setScale('parent')   (or no-op)
GCCSubhexView.currentParent() → derived from view center, when activeScale === 'subhex'
```

External callers (the main-map's "Explore Sub-Map" button, header
shortcuts, hex-edit module) keep calling `GCCSubhexView.open(...)`
during the migration. Slice 6 retires the shim once callers are
audited.

### View persistence

`localStorage.gcc-map-view`:

```
{
  scale: 'subhex',
  cx, cy,
  perScaleZoom: { parent: 0.4, subhex: 1.2 }
}
```

Restored on load when no URL hash overrides. URL hash takes
precedence when present.

---

## Q9 — URL state

### Hash routing

| Hash | Effect |
|---|---|
| `#scale=NAME&view=cx,cy,zoom` | Restore exact view |
| `#parent=K4-91` | Set scale=`subhex`, center on parent K4-91 |
| `#subhex=Q,R` | Set scale=`subhex`, center on subhex (Q, R) |
| (none) | Restore localStorage view, or default |

Bookmarks to `greyhawk-map.html` (no hash) keep working — they
restore the last view or default.

### What dies

- `greyhawk-map.html`'s in-page rendering code (hexCenter,
  drawHexGrid, etc.) moves to `gcc-map-parent-renderer.js` or is
  retired in favor of the unified renderer.
- `gcc-subhex-view.js`'s window chrome (drag, resize, close, reset
  position, controls window) — the unified shell IS the page.
- Any back-link from subhex to parent — replaced by the parent-scale
  button.

---

## Q10 — Feature inventory (deferred to Slice 1)

A complete catalog of every feature in current `greyhawk-map.html`,
plus subhex-view features, plus dependencies between them, plus
which scale each feature lives at. Slice 1's deliverable; the
output is a checklist that drives Slices 2–7.

Known buckets, non-exhaustive:

- Hex grid, terrain coloring, landmark glyphs (parent-scale base)
- Hex editor module (`gcc-hex-edit.js`)
- Landmark editor (`GCCLandmarks`)
- Journey planner / route display
- Calendar / time tracker integration
- Weather display
- Parties / token positions
- Fog of war (parent-level)
- LOST engine display
- Encounter / treasure generator integration
- Region overview
- Settlements list
- Parent-level paths (`GCCPaths`)
- Header chrome: title, coord bar, search, settings stub
- Subhex viewer (everything in `gcc-subhex-view.js`)

Slice 1 produces a table: feature → file → scale → migration
strategy (move / split / keep / retire).

---

## Q11 — Performance

### Per-scale culling only

Active renderer takes a viewport bbox and only emits visible
content. At parent scale, that's parent hexes; at subhex scale,
that's subhex cells. No layer iterates the whole world.

### No crossover budget

Revision 1's crossover band is gone. Only one renderer is mounted
at any time, so there's no "both layers active" scenario to budget.

### Tile caching

DESIGN-subhex-fullview.md Slice 5 lands before Phase B Slice 4.
Subhex tiles are built once per parent and cached; zoom and pan are
transform-only operations on cached tiles.

Parent renderer caches similarly: each visible-parent's `<g>` group
is built once and cached, invalidated on data change.

### Scale-switch cost

Switch unmounts the outgoing renderer (drops its DOM and tile
cache) and builds the incoming renderer. Worst case: building a
subhex-scale view of ~30 visible parents = ~30 tile builds = ~3000
cell DOM nodes. Provisional budget: ≤200 ms first frame; ≤16 ms
subsequent frames (transform-only).

If switch cost feels sluggish, Slice 9 polish can preserve the
outgoing renderer's tile cache in memory between switches (mount /
unmount only — no rebuild) at the cost of holding more memory.
Default: rebuild on switch (cleaner state).

### First-frame latency

Target: ≤300 ms from page load to first usable frame at the URL-
specified scale + zoom. Bound mostly by data layer load (subhex
overrides in IndexedDB, paths in Firestore). Skeleton frame can
render at parent scale before subhex data is available.

---

## Q12 — Migration / rollout strategy

### Slice plan

**Slice 1 — Inventory and design sign-off.** No code. Feature
inventory (Q10) produced as a checklist. Open items in this design
resolved or noted. Output: signed-off `DESIGN-unified-map.md` v3 +
`INVENTORY-unified-map.md`.

**Slice 2 — Unified shell scaffold.** New file `gcc-map.js` v0.1.
New file `gcc-map.css`. `greyhawk-map.html` rewritten to host the
unified shell — fullscreen SVG, side panel skeleton, scale registry
infrastructure, empty renderer hooks, no actual content yet.
`pxPerWorldUnit` calibrated for both scales. Wheel zoom + pan
working. Visual: blank canvas with chrome and scale buttons that
switch between empty renderers.

**Slice 3 — Parent renderer.** Extract main-map rendering into
`gcc-map-parent-renderer.js`. Wire to the shell. Subhex view still
standalone (floating window). Visual: parent map at parent scale,
fullscreen, pan/zoom works. Scale button switches to (still empty)
subhex placeholder.

**Slice 4 — Subhex renderer integration.** Lift v3.1.0's render
core into `gcc-map-subhex-renderer.js`. Wire into the shell. Auto-
switch on zoom-limit-hit working. Subhex floating window still
exists in parallel — Slice 7 retires it. Visual: button-toggle
between parent and subhex, both fullscreen, both pan/zoom.

**Slice 5 — Tools migration.** Tool registry in the shell. Move
main-map tools (landmark editor, hex editor, weather, parties,
journey, fog, encounters, regions) into the unified panel. Subhex
tools (paint, region/path/lake authoring, fog brush) likewise.
Scale predicates wired. Visual: panel adapts to active scale.

**Slice 6 — Minimap.** Persistent minimap implementation. Drag-rect,
click-to-jump, shift+click-to-subhex. Toggle on/off. Position
persists.

**Slice 7 — Subhex floating window retired.** `gcc-subhex-view.js`'s
window chrome and event handlers go away (confirmed). Render code
stays as the library `gcc-map-subhex-renderer.js` (already extracted
in Slice 4). Back-compat shim: `GCCSubhexView.open(col, row)`
redirects to `GCCMap.openParentSubhex(col, row)`. External callers
updated where trivial; shim covers the rest.

**Slice 8 — URL hash + view persistence.** `#scale=`, `#view=`,
`#parent=`, `#subhex=` hash routing. localStorage view persistence.
Back/forward browser history navigates view state.

**Slice 9 — Polish.** Optional crossfade animation on scale switch,
scale-to-fit animations, keyboard shortcuts finalized, perf
measurement, accessibility pass.

### Slice ordering rationale

- Each slice ships a working state.
- Slice 2 ships an empty shell with scale buttons (boring but
  verifies plumbing).
- Slice 3 ships a usable parent map fullscreen.
- Slice 4 ships the unified two-scale view (the main milestone).
- Tools (Slice 5) come after both renderers exist so we know where
  scale-context tools live.
- Minimap (Slice 6) is independent; ordered after Slice 5 to keep
  slice sequencing simple.
- Subhex window retirement (Slice 7) is last among "structural"
  slices so the floating window stays as a fallback during
  development.
- URL routing (Slice 8) and polish (Slice 9) are post-migration.

### Files and modules at end of Phase B

```
gcc/
  greyhawk-map.html               (rewritten — unified shell host)
  gcc-map.js                      (NEW — shell, viewport state, panel, registry)
  gcc-map.css                     (NEW — shell styles)
  gcc-map-parent-renderer.js      (NEW — parent scale render)
  gcc-map-subhex-renderer.js      (NEW — extracted from gcc-subhex-view.js)
  gcc-map-minimap.js              (NEW — minimap)
  gcc-subhex-view.js              (RETIRED — window chrome gone, render moved)
  gcc-subhex-data.js              (UNCHANGED)
  gcc-subhex-paths.js             (UNCHANGED)
  gcc-subhex.css                  (UNCHANGED — subhex render styles still apply)
  gcc-hex-edit.js                 (UPDATED — registers via tool registry)
  gcc-fog.js                      (UNCHANGED)
  ... other modules unchanged
```

### Compatibility during migration

Slices 2–4 leave both rendering systems intact. The shell renders
parent scale via the new renderer; the floating subhex window still
opens via `GCCSubhexView.open()`. After Slice 4, the floating window
is redundant but still works. Slice 7 cuts it.

Existing campaigns / data / saves: fully compatible. No data layer
schema changes.

---

## Out of scope for Phase B

- **`subsubhex` and `local` scales (Phase C+).** Reserved in the
  registry; no implementation. Adding them later is "register a
  new scale entry," nothing structural.
- **Mobile / touch.** Same posture as `DESIGN-subhex-fullview.md` —
  not currently supported, not added.
- **Multi-monitor / projector mode.** A future "player view"
  showing only player-relevant layers (no GM tools, no fog editor,
  no future-events) is its own design doc.
- **Offline mode.** Inherit current behavior; no Phase B work.
- **Server-side rendering / static export.** Out of scope.
- **Lost-vector display.** Reserved (Phase B unblocks the unified
  surface; the lost-engine wiring gets its own design when ready).
- **Animation library.** Optional Slice 9 polish; default Phase B
  has no tweens.

---

## Open items

- **Stroke width strategy** (Q2 end). Non-scaling-stroke vs absolute
  vs SUB_R-relative. Pick during Slice 3 once parent renderer is in
  the unified scale transform.
- **Per-scale `pxPerWorldUnit` calibration** (Q1, Q2). Tune in
  Slice 2 against actual screen sizes to match v3.1.0's on-screen
  subhex size and current main-map's on-screen parent size.
- **Scale button placement** (Q5 / Q7). Side panel "View" section vs
  floating chrome strip top-center of SVG. Slice 2 decides.
- **Auto-switch zoom continuity formula** (Q4). The zoom value the
  new scale starts at when auto-switched to. Pick during Slice 4.
- **Auto-switch on/off** (Q4). Some GMs may prefer scale buttons
  only, no zoom-limit auto-switch. Configurable in Slice 5
  preferences if needed.
- **Selection translation** (Q4). Default is "clear on switch."
  Could change if user testing wants subhex-selection to highlight
  owning parent when switching out, etc.
- **Double-click to zoom in / switch scale** (Q5 end). Provisional;
  defer to Slice 4.
- **Keyboard map** (Q5 end). Provisional; finalize Slice 5.
- **Tool inventory** (Q7). Provisional; Slice 1 produces canon.
- **Minimap default toggle state** (Q6). Default on at first install
  is the plan; revisit if the overlay feels noisy.
- **Hash router behavior on data not-yet-loaded** (Q9). If
  `#parent=K4-91` references a parent before its tile is built,
  initial center is approximate; refine during Slice 8.
- **`local` 1-mile scale ratio** (Q1). Ratio to subhex (3:1?) and
  data layer architecture is its own decision when Phase C+ starts.
- **Slice 1 inventory file location**. Suggest
  `gcc/INVENTORY-unified-map.md` (design artifact, not a runtime
  module).

---

## Conventions captured

- **One world coord space.** All renderers operate on the data
  layer's native HEX_R=20 / SUB_R=2 world. Display scale is one
  multiplier applied at the SVG transform level. No per-renderer
  scale multipliers.
- **Viewport-bbox enumeration is universal.** Every renderer takes a
  bbox and emits visible content. No "current parent" or "current
  scale subset" gating inside the data layer.
- **Tile caching with rebuild-on-data, transform-on-pan.** Already
  the convention for subhex; carries to parent renderer.
- **Scale is a mode, not a derived property.** Buttons, not
  thresholds. Active scale is explicit and discoverable.
- **Tool registry with scale predicates.** Tools declare which
  scales they apply to; the panel filters. Removes the per-page
  tool surface that exists today.
- **Single navigation API.** `GCCMap.*` is the surface; legacy
  `GCCSubhexView.*` survives only as shims.
- **URL hash as routing.** Hash holds view state for shareable
  links; localStorage backstops as the persistence layer.
- **Soft graceful degradation at extreme zoom.** Labels / markers
  / decorations fade or hide at deep zoom-out within a scale
  (already established in subhex fullview design); same convention
  extends to landmark labels at parent scale.
