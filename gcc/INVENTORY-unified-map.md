# INVENTORY — Unified Map (Phase B Slice 1)

Status: Slice 1 deliverable. Generated 2026-05-09. Companion to
`DESIGN-unified-map.md` (revision 2 — scale-buttons, signed off).

This file enumerates everything currently in `greyhawk-map.html`
(parent map host page, 5218 lines, 30 script tags) and
`gcc-subhex-view.js` v3.1.0 (subhex floating viewer). For each
feature: its source file, the scale it lives at in Phase B, and a
migration strategy (move / split / keep / retire).

Migration strategy values:

- **keep** — module unchanged; loaded by the unified shell as today.
- **keep + register** — module unchanged, but its tools register
  with `GCCMap.registerTool(...)` (Slice 5) instead of being
  surfaced via the topbar.
- **move** — code moves to a new module (typically a renderer).
- **split** — feature has parts that go to multiple destinations.
- **retire** — code goes away. Behavior either dies or is replaced
  by a unified equivalent.

Coverage caveat: this inventory was generated from the visible
surfaces of `greyhawk-map.html` and the subhex view. Modules loaded
via `<script src=>` (gcc-encounters.js, gcc-fog.js, gcc-paths.js,
etc.) were NOT read line-by-line for this slice. Their entries below
reflect what `greyhawk-map.html` calls into them; the corresponding
public API surfaces should be re-confirmed when their modules become
relevant in Slices 3–5. Items marked `(verify)` are confirmed-needed
but with an unread implementation; expect refinements during the
implementing slice.

---

## §1 — Module inventory

### Stylesheets loaded by `greyhawk-map.html`

| File | Purpose | Phase B |
|---|---|---|
| `gcc-header.css` | GCC top-of-page header | keep |
| `gcc-auth.css` | auth UI | keep |
| `gcc-subhex.css` | subhex render styles (v1.15.0) | keep — applies wherever the subhex renderer mounts |
| `gcc-settings.css` | settings dialog | keep |
| `gcc-dialog.css` | modal dialog helper | keep |
| `gcc-map.css` (NEW) | unified shell + parent renderer | new in Slice 2 |

### Scripts loaded by `greyhawk-map.html`

In load order (matters for globals available at init):

| File | Globals exposed | Scale | Migration |
|---|---|---|---|
| `gcc-regions.js` | `GCCRegions` | parent | keep + register (Slice 5 — region overview as a tool) |
| `gcc-encounter-data.js` | encounter tables | any | keep |
| `gcc-encounters.js` | `GCCEncounters` | any | keep + register |
| `gcc-encounter-panel.js` | `GCCEncounterPanel` | any | keep + register |
| `gcc-landmarks.js` | `GCCLandmarks` | any (used by both renderers) | keep + register (landmark editor as a tool) |
| `gcc-terrain.js` | `GCCTerrain`, `TERRAIN` constant | any | keep |
| `gcc-paths.js` | `GCCPaths` (parent-level segments) | parent (subhex renderer reads it for boundary markers) | keep |
| `gcc-rng.js` | seeded RNG helpers | any | keep |
| `gcc-subhex-store.js` | low-level subhex IndexedDB | subhex | keep |
| `gcc-subhex-data.js` | `GCCSubhexData` (Q,R, ownerOf, etc.) | subhex | keep — also used by parent renderer for ownership lookups |
| `gcc-fog.js` | `GCCFog` | both fogs | keep — verify (Q: does it expose subhex fog and parent fog separately, or one unified surface?) |
| `gcc-lost.js` | `GCCLost` | any (journey integration) | keep |
| `gcc-subhex-icons.js` | subhex icon SVG | subhex | keep — stroke-width strategy (DESIGN-unified-map.md Q2 open item) is decided in Slice 3 |
| `gcc-subhex-paths.js` | `GCCSubhexPaths` | subhex | keep |
| `gcc-hex-edit.js` | hex editor module | parent | keep + register (hex editor as a tool, parent-only) |
| `gcc-voyage.js` | `GCCVoyage` | any | keep + register |
| `gcc-dialog.js` | `GCCDialog` | any | keep |
| `gcc-subhex-view.js` v3.1.0 | `GCCSubhexView.{open,close,isOpen,currentParent}` | subhex | **split** — render core lifts to `gcc-map-subhex-renderer.js` (Slice 4); window chrome retires (Slice 7); `GCCSubhexView.*` survives as a back-compat shim into `GCCMap.*` |
| `gcc-edge-modes.js` | edge classification modes | parent | keep + register (Edges tool) |
| `gcc-edge-scanner.js` | edge scanner | parent | keep + register |
| `gcc-edge-flags.js` | edge-classifier flags | parent | keep |
| `gcc-edges.js` | `GCCEdges` | parent | keep + register |
| `gcc-settings.js` | `GCCSettings` | any | keep — Phase B should add map-view prefs to its schema (per existing Settings dialog TODO) |
| `gcc-data.js` | (loaded near end of body) | ? | verify — purpose unread; may be a campaign-data bridge |
| `gcc-header.js` | top-bar wiring | any | keep |
| `gcc-firebase-config.js` | Firebase init | any | keep |
| `gcc-auth.js` | auth flow | any | keep |

New modules to create in Phase B:

| File | Purpose | Created in |
|---|---|---|
| `gcc-map.js` | unified shell, viewport state, scale registry, panel host, navigation API | Slice 2 |
| `gcc-map.css` | shell layout + scale-button styles + panel chrome | Slice 2 |
| `gcc-map-parent-renderer.js` | parent-scale renderer (lifted from inline JS in greyhawk-map.html) | Slice 3 |
| `gcc-map-subhex-renderer.js` | subhex-scale renderer (lifted from gcc-subhex-view.js v3.1.0 internals) | Slice 4 |
| `gcc-map-minimap.js` | persistent minimap (parent-scale, world overview + viewport rect) | Slice 6 |

---

## §2 — Inline JS in `greyhawk-map.html`

151 functions, mixed concerns. Grouped here by what they do; column
"Destination" says where they go in Phase B.

### §2.1 — Geometry (parent scale) → `gcc-map-parent-renderer.js`

| Function | Lines | Notes |
|---|---|---|
| `gridSize` | 920 | exposes `GRID_COLS` / `GRID_ROWS` |
| `darleneColLabel` / `darleneDiagonal` / `darleneToInternal` | 932/939/951 | Darlene-style hex coord encoding/decoding |
| `colStep` / `rowStep` / `hexCenter` / `hexCenterDisplay` / `hexCorners` / `hexCornersDisplay` | 1552–1574 | parent-hex layout primitives |
| `hexIdStr` | 1574 | "K4-91"-style ids — globally used; stays a global |
| `mapToHex` / `hexDistance` / `offsetToCube` / `cubeToOffset` / `cubeRound` / `hexLine` | 1575–1652 | axial / cube hex math |

**Migration**: move into `gcc-map-parent-renderer.js`'s geometry
section. `hexIdStr` is referenced by `gcc-subhex-view.js`,
`gcc-hex-edit.js`, journey planner — keep it in a shared place
(`gcc-map.js`'s geometry module).

### §2.2 — Pan/zoom + transform (becomes shell concern) → `gcc-map.js`

| Function | Lines | Notes |
|---|---|---|
| `computeStageBounds` / `mapToStage` / `stageToMap` / `screenToMap` / `updateStageFrame` | 2412–2453 | parent-scale coord transforms |
| `applyTransform` / `clampPan` / `doZoom` / `centerOnHex` | 4231–4287 | pan/zoom mechanics |
| `makeDraggable` | 4287 | reusable dragging helper |

**Migration**: move into `gcc-map.js`. The unified shell handles
pan/zoom; renderers don't see transforms directly. `makeDraggable` is
reusable for the minimap and dialogs — surface as a small helper.

### §2.3 — Image align mode (parent scale only) → `gcc-map-parent-renderer.js`

| Function | Lines | Notes |
|---|---|---|
| `applyImgTransform` / `updateImgReadout` / `saveImgTransform` / `loadImgTransform` / `resetImgTransform` | 1373–1402 | Darlene scan transform |
| `snapshotImgTransform` / `applyImgSnapshot` | 1421/1425 | snapshot helpers |
| `readHistory` / `writeHistory` / `pushHistoryEntry` / `refreshHistoryDropdown` / `downloadStateFile` / `loadHistoryByIndex` | 1434–1522 | history dropdown for image alignment |
| `enterImgAlignMode` / `exitImgAlignMode` / `revertImgAlign` | 1487/1500/1510 | mode toggle |
| `imgNudge` / `imgScaleBy` / `imgRotateBy` | 1532–1546 | nudge controls |
| `#img-align-panel` UI (lines 821–852) | DOM | the alignment overlay |
| `imgX` constant + `state.imgAlignMode` / `imgDragging` / etc. | 1325–1372 | state |

**Migration**: parent-scale-only tool. Move into a self-contained
module under the parent renderer (`gcc-map-parent-image-align.js` or
inside `gcc-map-parent-renderer.js` as a tool registration). Active
only when the user arms "Image" tool at parent scale (per existing
topbar `#btn-image-align`).

### §2.4 — Travel profile / flight / ship → `gcc-map.js` (shared services)

| Function | Lines | Notes |
|---|---|---|
| `flightMilesPerDay` / `isFlyingMount` / `mountRestNarrative` / `emitMountRestEvent` | 1097–1135 | flight rules |
| `shipDefaultPropulsion` / `shipMilesPerDay` / `waterTypeAtHex` / `shipCurrentModifier` | 1212–1295 | ship rules |
| `_shipPathNeighbors` / `_shipPathInGrid` / `_shipPathNavigable` / `findShipPath` | 1652–1676 | ship pathing |
| `travelTime` / `travelMilesPerDay` | 2180/2226 | travel rate calc |
| `loadTravelProfile` / `saveTravelProfile` / `travelProfileLabel` | 2250/2272/2382 | profile persistence |
| `state.travelProfile` | 1325 | state |
| `#travel-dialog` UI (lines 653–730) | DOM | profile editor |
| `openTravelDialog` / `closeTravelDialog` / `updateTravelDialogGrayState` / `applyTravelProfile` | 3318–3343 | dialog wiring |
| Constants: `TRAVEL_RATES`, `HEX_MILES`, `FLIGHT_VEHICLES`, `SHIP_VESSELS`, `SHIP_RATES`, `SHIP_HOURLY_MPH` | 1056–1199 | rate tables |

**Migration**: this is shared travel-rate machinery used by the
journey planner. Move into a `gcc-map-travel.js` module (or absorb
into `gcc-map.js`). The travel-mode dialog itself becomes a
GCCDialog-driven modal; survives unchanged. Tool: "Travel" registers
as `any`-scale.

### §2.5 — Calendar / time-of-day → `gcc-map.js` (shared services)

| Function | Lines | Notes |
|---|---|---|
| `ghDateAdd` / `ghDateLabel` / `ghDateDiff` | 1752–1776 | Greyhawk calendar arith |
| `loadTimeOfDay` / `saveTimeOfDay` / `timeOfDayLabel` | 2346–2382 | time-of-day persistence |
| `state.timeOfDay` | 1325 | state |
| Side-panel `#p-tod-sel` dropdown | DOM | UI |

**Migration**: shared service. The `gcc-time-tracker.js` (CTT) module
already exists in the broader GCC ecosystem (per memory: Calendar
Time Tracker, Foundry-side); not loaded in `greyhawk-map.html`.
Phase B keeps the inline GH calendar arith here (unrelated to CTT).

### §2.6 — Lost engine integration → `gcc-map.js` (journey service)

| Function | Lines | Notes |
|---|---|---|
| `lostPathFollowed` / `lostHexFamiliar` | 1991/2010 | predicates |
| `_lostSeedFor` / `_lostMulberry32` | 2026/2039 | deterministic RNG seeding |
| `computeJourneyLostPreview` / `_lostGateLabel` / `_lostDeviationShort` / `_lostTooltip` | 2052–2121 | preview calc |
| `renderJourneyLost` | 2138 | UI render |
| `loadLostPrefs` / `saveLostPrefs` | 2281/2290 | persistence |
| `state.lostPrefs` | 1325 | state |
| Journey-dialog `#jd-has-guide` / `#jd-has-map` / `#jd-following-feature` | 772–774 | UI |

**Migration**: stays attached to the journey planner. Module-level
helpers move into `gcc-map-journey.js` along with the planner; data
layer (`GCCLost`) unchanged.

### §2.7 — Region (parent-scale region overlay)

| Function | Lines | Notes |
|---|---|---|
| `getRegion(col,row)` (inline) | 2168 | resolves region by parent col/row |
| `getHexTerrain(col,row)` | 2173 | resolves terrain — used everywhere as a global |
| `#region-info` UI | 641–650 | dialog |
| `openRegionInfo` / `closeRegionInfo` | 3223/3307 | dialog wiring |
| `GCCRegions.*` (external module) | — | data layer |

**Migration**: `getHexTerrain` and `getRegion` are widely-called
inline globals. Promote both to module-level helpers in
`gcc-map.js` (or expose via `GCCMap.getHexTerrain` /
`GCCMap.getRegion`); update existing callers (subhex-view,
hex-edit, etc.) which read them via window scope. Data layer
(`GCCRegions`) unchanged.

### §2.8 — Hex grid build / rebuild (parent renderer core) → `gcc-map-parent-renderer.js`

| Function | Lines | Notes |
|---|---|---|
| `buildHexGrid` | 2459 | builds `<polygon>` per hex into `#hex-cells` |
| `rebuildGrid` | 2769 | thin wrapper |
| `buildJourneyOverlay` / `applyJourneyHexClasses` / `refreshJourneyOverlay` | 2533–2602 | journey-route polyline + per-hex classes |
| `buildCoordLabels` | 2602 | Darlene column/diagonal labels along map edges |
| `buildLandmarkOverlay` / `rebuildLandmarkOverlay` | 2669/2773 | landmark glyphs + names |
| `buildPathOverlay` / `rebuildPathOverlay` | 2786/2893 | parent-level path polylines |
| `updatePartyMarker` | 2902 | party token at current hex |
| `onHexHover` / `onHexClick` | 2914/2922 | event handlers |

**Migration**: this is the core of the parent renderer. Lift en bloc
into `gcc-map-parent-renderer.js`. Each "build*" function maps to a
layer in the renderer's z-stack (DESIGN-unified-map.md Q3). Per-hex
event handlers become the renderer's click delegation.

### §2.9 — Side panel (replaced by unified Selection section)

| Function | Lines | Notes |
|---|---|---|
| `ensureSidePanelPlaced` / `updateSidePanel` | 2963/2970 | content updates |
| `#side-panel` DOM (563–600) | DOM | container |
| Panel rows: hex, landmark, terrain, region, travel, time-of-day, explored count | DOM | fields |
| Panel buttons: Move Here / Plan Journey / Landmark Info / Region Info / Explore Sub-Map / Check Encounter / Make Camp / Build Stronghold | DOM | actions |

**Migration**: the unified shell's "Selection" section replaces this.
Same fields, same buttons, but rendered by the unified panel. Each
button's onClick delegates to the same underlying handler (Plan
Journey → `openJourneyPlanner`, Explore Sub-Map →
`GCCMap.openParentSubhex(col, row)`, etc.). "Build Stronghold" — UI
present but verify wiring (likely stub).

### §2.10 — Move dialog → keep as modal

| Function | Lines | Notes |
|---|---|---|
| `showMoveDialog` / `closeMoveDialog` / `confirmMove` | 3080/3090/4196 | wiring |
| `#move-dialog` DOM (616–626) | DOM | modal |

**Migration**: keep as parent-scale modal (a click on a destination
hex confirms party move). Same code; called by the parent
renderer's click handler.

### §2.11 — Landmark info dialog → keep as modal

| Function | Lines | Notes |
|---|---|---|
| `openLandmarkInfo` / `closeLandmarkInfo` | 3102/3212 | wiring |
| `#landmark-info` DOM (628–639) | DOM | modal |

**Migration**: keep. Available from both scales (landmark editor is
`any`-scale per Q7); the info dialog is a read-only view.

### §2.12 — Region info dialog → keep as modal

`openRegionInfo` / `closeRegionInfo` (lines 3223/3307), `#region-info`
DOM (641–650). Same as landmark — keep, available cross-scale.

### §2.13 — Journey planner → `gcc-map-journey.js`

| Function | Lines | Notes |
|---|---|---|
| `computeJourneyDuration` / `projectedEncounterChecks` | 1794/1968 | duration + encounter projection |
| `openJourneyPlanner` / `closeJourneyPlanner` | 3371/3401 | dialog wiring |
| `buildJourneyPlan` / `setJourneyPlanMode` | 3409/3448 | plan construction |
| `refreshJourneyTraceButtons` / `extendJourneyTrace` / `moveJourneyDestination` / `undoJourneyTrace` / `resetJourneyTrace` / `recomputeJourneyPlan` | 3472–3546 | manual-trace mode |
| `renderJourneyCrossings` | 3644 | path-crossing display |
| `buildJourneyTimeline` / `hexAtTimelineOffset` | 3684/3744 | timeline |
| `#journey-dialog` DOM (734–803) | DOM | planner UI |
| `state.journey` | 1325 | state |

### §2.14 — Active journey (in-progress) → `gcc-map-journey.js`

| Function | Lines | Notes |
|---|---|---|
| `saveActiveJourney` / `loadActiveJourney` / `clearActiveJourney` / `archiveJourney` | 3751–3787 | persistence |
| `movePartyDuringJourney` | 3787 | hex advance |
| `startJourneyExecution` / `scheduleTick` / `tickJourney` / `advanceJourneySlot` | 3798–3995 | execution loop |
| `continueJourney` / `abortJourney` / `arriveJourney` | 3995–4032 | end states |
| `showJourneyLog` / `closeJourneyLog` / `renderJourneyLog` | 4032–4196 | log dialog |
| `#journey-log` DOM (806–818) | DOM | log UI |

**Migration**: planner + active journey + lost-engine + journey-
log all move to `gcc-map-journey.js`. Tool: "Journey" registers as
`any`-scale (works from parent or subhex). The polyline overlay is
built by the parent renderer; subhex renderer should also support
journey-route rendering (open item — see Slice 5 design).

### §2.15 — Party state → `gcc-map.js`

| Function | Lines | Notes |
|---|---|---|
| `loadPartyPos` / `savePartyPos` | 2306/2320 | persistence |
| `revealFogAtParty` | 2331 | fog reveal trigger |
| `state.partyCol` / `partyRow` | 1325/1329 | state |

**Migration**: into `gcc-map.js` shared services. Both renderers
read it (parent draws the party hex marker; subhex draws the party
subhex marker).

### §2.16 — Misc / utility

| Function | Lines | Destination |
|---|---|---|
| `showToast` | 4369 | `gcc-map.js` (uses `#toast`, line 852) |
| `showHexContextMenu` / `closeHexContextMenu` / `_hexCtxMenuOutside` / `_hexCtxMenuKey` | 4380–4432 | parent renderer (right-click context menu) |
| `wireEvents` | 4437 | retires — replaced by per-renderer event registration |
| `fallbackCopy` | 4822 | `gcc-map.js` shared util |
| `syncBarHeight` | 5118 | shell (top-bar height tracking) |
| `init` | 5124 | retires — replaced by `gcc-map.js` initialization |

### §2.17 — Top-level constants → split

| Constant | Destination |
|---|---|
| `HEX_R = 20` | `gcc-map.js` (shared, also matches data layer) |
| `GRID_COLS = 146` / `GRID_ROWS = 97` | `gcc-map.js` (Flanaess world dimensions) |
| `cal` (calendar config) | `gcc-map-parent-renderer.js` |
| `MAP_W` / `MAP_H` | `gcc-map.js` |
| `LABEL_PAD_*` / `LABEL_OFFSET` | `gcc-map-parent-renderer.js` |
| `TERRAIN` | already in `gcc-terrain.js`; verify which copy is canonical (the inline one at line 1002 may shadow the module's) |
| `TRAVEL_RATES` / `HEX_MILES` | `gcc-map-travel.js` |
| `FLIGHT_VEHICLES` / `SHIP_VESSELS` / `SHIP_RATES` / `SHIP_HOURLY_MPH` | `gcc-map-travel.js` |
| `imgX` (image alignment baseline) | `gcc-map-parent-image-align.js` |

**Open item**: the inline `TERRAIN` const at line 1002 likely
shadows the one defined in `gcc-terrain.js`. Slice 3 reconciles —
either the inline one moves to the module, or the module is the
single source.

### §2.18 — Top-level state object → `gcc-map.js`

`state` (lines 1325–1348). Properties:

| Property | Owner in Phase B |
|---|---|
| `zoom` / `panX` / `panY` | shell (`state.view`) — superseded by `state.view.{cx, cy, zoom, perScaleZoom}` |
| `dragging` / `didDrag` / `dragStartX` / `dragStartY` / `panStartX` / `panStartY` | shell pan-gesture state |
| `moveMode` / `showLabels` | parent renderer mode flags |
| `partyCol` / `partyRow` | shared (`gcc-map.js`) |
| `timeOfDay` | shared service (§2.5) |
| `selectedCol` / `selectedRow` | shell selection (`state.selection`) at parent scale |
| `hexData` / `pendingMove` | shell shared |
| `travelProfile` | shared service (§2.4) |
| `lostPrefs` | journey service (§2.6) |
| `imgAlignMode` / `imgDragging` / `imgRotDragging` / etc. | image-align tool (§2.3) |
| `journey` | journey service (§2.13) |

`window.state` (line 1353) and `window.imgX` (line 1372): exposed
for cross-script access. Phase B exposes via `GCCMap.*` instead;
keep the legacy globals during migration (Slices 2–6) and remove
in Slice 7 alongside the subhex-window retirement, after auditing
external readers.

---

## §3 — DOM elements in `greyhawk-map.html`

### Top-level chrome (replaced by unified shell)

| Element | Lines | Purpose | Phase B |
|---|---|---|---|
| `#gcc-bar` | 526 | GCC site header (cross-page) | keep |
| `#topbar` | 532 | zoom/mode/edit/Hex/Edges/Coast/Voyage buttons + mode-label | retire — buttons become Tools tab in unified panel; mode-label folds into Selection / View section |
| `#mode-label` | 550 | "OVERWORLD · 30 MI/HEX" indicator | retire — scale buttons replace |
| `#map-wrap` | 556 | scrollable map container | retire — unified shell takes over |
| `#map-stage` / `#map-img` / `#hex-svg` | 557 | parent-scale render mounts | retire — parent renderer owns its `<g>` inside the shell SVG |
| `#side-panel` | 563 | parent-scale info / actions | retire — Selection section in unified panel replaces |
| `#legend` | 602 | terrain swatch legend | keep — possibly fold into View section |
| `#coords` | 613 | hover readout | retire — unified shell shows coord under cursor |
| `#opacity-wrap` | 614 | grid opacity slider | keep — moves into View section, becomes scale-aware |
| `#overlay-bg` | 615 | modal scrim | keep |
| `#toast` | 852 | toast container | keep |

### Modals / dialogs (kept as-is)

| Element | Lines | Purpose | Phase B |
|---|---|---|---|
| `#move-dialog` | 616 | confirm party move | keep |
| `#landmark-info` | 628 | landmark info display | keep |
| `#region-info` | 641 | region info display | keep |
| `#travel-dialog` | 653 | travel-mode editor | keep |
| `#journey-dialog` | 734 | journey planner | keep |
| `#journey-log` | 806 | active-journey log | keep |
| `#img-align-panel` | 821 | image-align editing UI | keep — parent-scale tool only |

All dialogs are positioned absolutely over `#overlay-bg`; the unified
shell preserves the same overlay convention.

### Topbar buttons (retire — become tools)

| Button | Tool registration | Scale |
|---|---|---|
| `#btn-zoom-in` / `#btn-zoom-out` / `#btn-reset` | View section (zoom controls) | shell |
| `#btn-move-mode` | Move tool | parent |
| `#btn-hex-labels` | View section (toggle) | parent |
| `#btn-coord-labels` | View section (toggle) | parent |
| `#btn-image-align` | Image Align tool | parent |
| `#btn-hex-edit` | Hex Editor tool | parent |
| `#btn-edges` | Edges tool | parent |
| `#btn-coast-scan` | Coast Scanner tool | parent |
| `#btn-voyage` | Voyage tool | any |
| `#btn-settings` | shell — Settings dialog (existing module) | shell |
| `#btn-panel-toggle` | shell — panel collapse | shell |

---

## §4 — `gcc-subhex-view.js` v3.1.0 (subhex-side)

Already covered by `DESIGN-subhex-fullview.md` Slice 1–3. For Phase B
the relevant decomposition:

### §4.1 — Render core → `gcc-map-subhex-renderer.js`

Functions to lift (extract the `(function(){ ... })()` IIFE's body
into a renderer module that takes `(svg, state)`):

- `cellWorldCenter`, `cellCorners`, `cellDomId`
- `parentWorldCenter`, `parentCornersAt`
- `viewportBboxData`, `visibleCells`, `parentsInViewport`
- `buildCellGroup`
- `rebuildSVG` — becomes `renderer.render()`
- `applyCellPaint`
- `renderPaths`, `renderArmedPathGhost`, `pathPolylinePoints`
- `renderRegionLabels`
- `renderParentPathMarkers` + `placeMarker` + `pathMarkerColor` +
  `edgeMidpointFor` + `boundaryCellForEdge` +
  `authoredBoundaryCellForSegment` + `pathMarkerTooltip` +
  `findSubhexPathForSegment` + `onParentPathMarkerClick`
- `renderCrossings` + `detectCrossings` + supporting helpers
- `applyViewBox` — becomes shell concern (renderer just emits
  geometry in world coords; shell sets the viewBox transform)
- Cell event handlers: `onCellMouseDown`, `onCellMouseEnter`,
  `onCellClick`, `paintCell`, brush state handling
- `effectiveParentTerrainFor`, `selectedCellOwner`,
  `selectedParentTerrain`

### §4.2 — Window chrome → retired (Slice 7)

- `ensureWindow`, `ensureControlsWindow`
- `onDragStart`, `onDragMove`, `onDragEnd`, `clampWindowPos`
- `resetWindowPos`, `persistWindowRect`, `positionControlsBesideMap`
- `clampCtrlPos`
- All `#subhex-window` DOM construction + the controls-window DOM

The unified shell IS the window. None of this survives.

### §4.3 — Panel content → migrates into unified panel (Slice 5)

The controls window's contents (palette, feature glyphs, tool
callouts, detail panel, region/path/lake authoring UIs) move into
the unified shell's Tools section as scale=`subhex` registrations.
The `gcc-subhex.css` rules apply unchanged.

### §4.4 — Public API → back-compat shim (Slice 7)

```
GCCSubhexView.open(col, row)  →  GCCMap.openParentSubhex(col, row)
GCCSubhexView.close()          →  GCCMap.setScale('parent')   (or no-op)
GCCSubhexView.isOpen()         →  true (always — unified map IS the page)
GCCSubhexView.currentParent()  →  derived from view center when activeScale='subhex'
```

---

## §5 — Per-feature migration table (synthesis)

Slice column indicates which Phase B slice does the work.

| Feature | Source | Scale | Migration | Slice |
|---|---|---|---|---|
| Top GCC bar | `gcc-header.js` | shell | keep | — |
| Topbar zoom buttons | inline | shell | keep, move to View section | 2 |
| Mode label "OVERWORLD · 30 MI/HEX" | inline | shell | retire — scale button is the indicator | 2 |
| Map background image (Darlene scan) | inline + `imgX` | parent | move to parent renderer | 3 |
| Image-align tool | inline | parent | move to parent renderer module | 3/5 |
| Parent hex grid | `buildHexGrid` | parent | move to parent renderer | 3 |
| Hex labels (IDs) | `buildCoordLabels` | parent | move to parent renderer | 3 |
| Darlene coord labels | `buildCoordLabels` | parent | move to parent renderer | 3 |
| Landmarks (glyphs + names) | `buildLandmarkOverlay` + `GCCLandmarks` | parent (also subhex; parent landmarks pin on subhex too) | parent renderer + subhex renderer reads `GCCLandmarks` | 3, 4 |
| Parent-level paths (rivers/roads) | `buildPathOverlay` + `GCCPaths` | parent | move to parent renderer | 3 |
| Subhex cells | `gcc-subhex-view.js` | subhex | extract render core into module | 4 |
| Subhex parent-outline overlay | `gcc-subhex-view.js` v3.1.0 | subhex | comes with extraction | 4 |
| Subhex paths / regions / crossings / markers | `gcc-subhex-view.js` v3.1.0 | subhex | comes with extraction | 4 |
| Subhex fog | `gcc-fog.js` (via subhex renderer) | subhex | unchanged module; renderer reads | 4 |
| Parent fog | `gcc-fog.js` (parent-side) | parent | unchanged module; parent renderer reads | 3 |
| Party token | `updatePartyMarker` + `state.partyCol`/`Row` | both | parent renderer + subhex renderer both render | 3, 4 |
| Side panel | `#side-panel` + `updateSidePanel` | parent | retire — unified Selection section | 5 |
| Move dialog | `#move-dialog` + `confirmMove` | parent | keep | — |
| Landmark info dialog | `#landmark-info` + `openLandmarkInfo` | any | keep | — |
| Region info dialog | `#region-info` + `openRegionInfo` | any | keep | — |
| Travel mode dialog | `#travel-dialog` + helpers | shared | keep, register as `any`-scale tool | 5 |
| Journey planner | `#journey-dialog` + journey functions | shared | move to `gcc-map-journey.js`; register as tool | 5 |
| Active journey | journey execution + `#journey-log` | shared | move to `gcc-map-journey.js` | 5 |
| Lost engine | `_lost*` + `GCCLost` | shared | move to journey service | 5 |
| Journey route polyline | `buildJourneyOverlay` + `refreshJourneyOverlay` | both renderers | parent renderer renders + subhex renderer renders | 3, 4 |
| Hex editor | `gcc-hex-edit.js` | parent | keep + register | 5 |
| Edges scanner / flags / modes | `gcc-edge-*.js` | parent | keep + register | 5 |
| Coast scanner | `gcc-edges.js` | parent | keep + register (verify) | 5 |
| Voyage simulator | `gcc-voyage.js` | any | keep + register | 5 |
| Encounter generator | `gcc-encounters.js` + `gcc-encounter-panel.js` | any | keep + register | 5 |
| Region editor / overview | `gcc-regions.js` | both | keep + register; tool surfaces at both scales | 5 |
| Settings dialog | `gcc-settings.js` | shell | keep; add map-view prefs to its schema | 5 |
| Subhex floating window | `gcc-subhex-view.js` window chrome | — | retire | 7 |
| `GCCSubhexView.*` callers (main map, hex-edit, header) | various | — | back-compat shim | 7 |
| Minimap | (none) | shell | new module | 6 |
| URL hash routing | (none) | shell | new in `gcc-map.js` | 8 |
| LocalStorage view persistence | (none, partial — `gcc-subhex-window-pos` / `gh-img-xform` etc.) | shell | new in `gcc-map.js`, key `gcc-map-view` | 8 |
| Toast | `showToast` + `#toast` | shell | move to `gcc-map.js` | 2 |
| Right-click context menu (`showHexContextMenu`) | inline | parent | move to parent renderer | 3 |

---

## §6 — Things to verify during implementation

Items I couldn't confirm without reading additional modules:

1. **`gcc-fog.js` API surface.** Does it expose parent-fog and
   subhex-fog as separate APIs, or one unified surface? Affects
   whether the parent and subhex renderers each call into different
   methods. Slice 3 / Slice 4 verify.
2. **`gcc-data.js`** (loaded after `gcc-auth.js`). Purpose unread;
   may be a campaign-data bridge for landmarks / regions / paths.
   Slice 1 follow-up: read this file before Slice 2 starts.
3. **Inline `TERRAIN` const at line 1002** vs. the one in
   `gcc-terrain.js`. One probably shadows the other. Reconcile in
   Slice 3.
4. **Inline `getHexTerrain` / `getRegion` callers.** Multiple
   modules (subhex-view, hex-edit, paths) read these via window
   scope. Promote to `GCCMap.*` and audit callers. Slice 3 / Slice 5.
5. **`window.state` external readers.** `gcc-edge-scanner.js` and
   possibly others read `window.state.partyCol/Row`, `journey`,
   etc. Audit before retiring `window.state` (Slice 7+).
6. **"Build Stronghold" button** (`#p-btn-build`). Wired? Stub?
   Verify wiring or capture as deferred-feature in Slice 5.
7. **Subhex-renderer party-token rendering.** Currently the subhex
   view doesn't draw the party. Phase B needs both renderers to
   render the party at their scale. Slice 4 design refinement.
8. **Journey-route rendering at subhex scale.** Polyline through
   the subhex centers along the planned route. New work; Slice 4
   or Slice 5 covers.
9. **`gcc-subhex-store.js`** and `gcc-subhex-data.js` interaction.
   Phase B doesn't touch the data layer, but renderer extraction
   should preserve current loading order (data layer before
   renderer).
10. **Tools that have sub-windows** (e.g., hex-edit's panel,
    voyage's simulator UI). Do they fit in the unified panel's
    Tools section, or do they remain as floating panels driven by
    GCCDialog? Slice 5 design call.

---

## §7 — Slice-1 outputs

- This file: `gcc/INVENTORY-unified-map.md`
- `gcc/DESIGN-unified-map.md` revision 2 (signed off)

Slice 2 starts when both files are confirmed. Slice 2's first task:
**read `gcc-data.js`** and any other unread modules, resolve the
verify items in §6, then begin scaffolding `gcc-map.js` v0.1.

No code changes in Slice 1 — `greyhawk-map.html` and the existing
modules are unchanged.
