# DESIGN — Paths and Water (Option C)

Status: design locked, pending implementation.
Authors: Kurt + Claude, session 2026-04-30.
Supersedes: ad-hoc subhex-first-on-edges logic added in `gcc-paths.js` v0.5+.

This document captures the design for migrating rivers, roads, and water
bodies from parent-layer storage to subhex-as-source-of-truth. Parent
chains become a fallback for unauthored parents during a transition
period; subhex authoring takes authority per parent.

---

## Summary of decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Lakes | First-class records; cell-pointer model with terrain constraint (b3). |
| 2 | Paths data model | Extend existing schema to v3; add `tier` for rivers; cells[] order encodes direction. |
| 3 | Migration strategy | Transition (b): parent fallback per parent, not per edge. |
| 4 | Lake/river junctions | Path metadata canonical; polymorphic `{ lakeId } \| { pathId } \| null`. |
| 5 | Cross-parent continuity | Consecutive cells in different parents = transition; no special data. |
| 6 | Journey planner | River cost gains tier dimension; four encounter tables (lake/sea × shallow/deep). |
| 7 | Performance | Eager index rebuild on `gcc-subhex-changed`; per-cell, per-parent, per-edge maps. |
| 8 | Backwards compat | Lazy cell migration; paths v2→v3 with backup; forward-compat tolerated. |

---

## Q1 — Lakes

Lakes are first-class records in their own storage layer. Cells belong to
a lake via a pointer (`cell.lakeId`), mirroring the existing `regionId`
pattern. The data layer enforces that lake membership requires water
terrain.

### Schema

Lake record (storage key `gcc-subhex-lakes`, doc id `lake_${id}`):

```
{
  id: 'lake-quagflow',          // local id, slug-derived
  kind: 'lake' | 'sea',
  name: 'Lake Quagflow',
  depth: 'shallow' | 'deep',
  regionId: 'furyondy' | null,  // optional jurisdiction
  notes: '',
  schemaVersion: 1,
  authoredAt: ts,
}
```

Cell schema gains:

```
{ ..., lakeId: 'lake-quagflow' | null }
```

Cell doc removed when fully empty (existing convention).

### Constraints

Enforced at write time on both axes:

- `setCellLake(Q, R, lakeId)` rejects unless `cell.terrain ∈ WATER_TERRAINS`.
- `setCellTerrain(Q, R, newTerrain)` auto-clears `lakeId` if `newTerrain` is not water.

Net invariant: `lakeId` non-null ⟺ cell terrain is water.

### Lookup patterns

- `getLake(lakeId)` — O(1) doc read.
- `getLakeForCell(Q, R)` — O(1) cell-doc read.
- `getLakeMembers(lakeId)` — cell scan filtered by `lakeId === id` (cold path; index in Q7).

### Encounter dispatch

When a cell has `lakeId`, encounter logic uses `lake.kind` + `lake.depth`
to pick the table. Un-laked open water falls back to cell terrain.

Four tables to seed (encounter-content task, out of scope for data model):
`lake_shallow`, `lake_deep`, `sea_shallow`, `sea_deep`.

### Rationale (why b3 over b1)

`b1` (lake doc owns its `cells: [{Q,R}]` array) makes "what lake is this
cell in?" a scan over every lake. The journey planner asks this many
times per session; subhex layer's `regionId` already learned this lesson
in v2. Cell-pointer is a single source of truth: delete the cell override,
lake membership vanishes; re-terrain a cell, lakeId auto-clears. Lake
docs never go stale because they don't track membership at all.

### Migration

- Existing water-terrain subhex cells: untouched. Become unnamed water
  until GM authors a lake and assigns retroactively.
- Parent-layer `water_inland_sea` (Nyr Dyv etc.): untouched. Parent
  terrain still serves journey planner adequately. When subhex authoring
  reaches an inland-sea parent, GM creates the lake record then.
- Velverdyva headwaters at D5-82: lake-quagflow record gets created
  during the Velverdyva migration session.

No batch migration pass.

### Rafts

Rafts work on all water types. No `navigable` field; the `kind`+`depth`
combo only feeds encounter table selection, not movement cost.

---

## Q2 — Paths data model

Extend, don't replace. The current subhex path schema is 80% of what
Option C needs. Gaps are tier metadata and lake-junction references
(Q4). Both are additive.

### Schema v3

Path doc (storage key `gcc-subhex-paths`, doc id `path_${id}`):

```
{
  id: 'velverdyva',
  kind: 'river' | 'road' | 'trail',
  tier: 'stream' | 'river' | 'great_river' | null,  // river-only; null on non-rivers
  name: 'Velverdyva',
  notes: '',
  cells: [{Q,R}, ...],          // ordered: source → mouth for rivers
  headwaters: { lakeId } | { pathId } | null,  // see Q4
  mouth:      { lakeId } | { pathId } | null,
  schemaVersion: 3,
  authoredAt: ts,
}
```

### Direction convention

For rivers: `cells[]` order encodes direction. `cells[0]` is the source,
`cells[length-1]` is the mouth. No separate `current` field.

For roads/trails: `cells[]` order has no semantic meaning (authoring
artifact only).

Authoring tool gains a "reverse" button on river path edit dialog.
Roads/trails: no reverse button needed.

### Tributaries

Each named river is its own path doc. Tributaries share a confluence
cell (the cell appears in both paths' `cells[]` arrays). No special
junction record. The journey planner reports both rivers on that cell,
which is correct.

Anonymous tributaries: path doc with `name: null` or `name: ''`,
`kind: 'river'`, `tier: 'stream'`.

### Track / trail normalization

Parent layer `track` and subhex layer `trail` model the same gameplay
concept (lesser-quality path with reduced movement rate). Normalize on
the subhex name: subhex stays `road | trail`, parent `track` migrates
to subhex `trail`. Movement-rate distinction preserved (road ≠ trail).

If a road quality tier system is needed later (highway / road / track),
that's a separate `roadTier` field designed deliberately. Not in scope.

### Why a facade over `gcc-paths.js`

Every existing caller (journey planner, encounter panel, hex edit
dialog, ghost markers) uses the parent-shaped public API. Keeping the
API stable and swapping the backend incrementally lets the migration
proceed lazily (Q3 transition strategy). Subhex-first lookup with
parent-fallback (the v0.5+ pattern) generalizes from "edges only" to
"everything"; call sites don't notice.

---

## Q3 — Migration strategy

### Transition (b): per-parent fallback

Each parent hex is in one of two states:

1. **Subhex-authored.** At least one subhex path or lake claims cells in
   this parent. Subhex is canon for this parent.
2. **Parent-only.** No subhex authoring touches this parent. Parent
   BASE/override data is canon.

The facade resolves per query:

```
edgeRiverInfo(colA, rowA, colB, rowB):
  if (parentHasSubhexAuthoring(colA, rowA) || parentHasSubhexAuthoring(colB, rowB)) {
    // subhex-canonical: use subhex; do NOT consult parent fallback
    return subhexEdgeRiverInfo(...);
  }
  // both parents unauthored: parent fallback
  return parentEdgeRiverInfo(...);
```

### Behavior shift from v0.5+

This is a tightening. v0.5+ uses **per-edge** fallback — subhex first per
edge, parent fallback per edge regardless. Option C uses **per-parent**:
any subhex authoring in either parent disables parent fallback for that
parent's edges.

Cleaner mental model: "I've taken authority for this parent." If a GM
wants to depict a section that disappears underground, they author
subhex paths in that parent and explicitly omit the gap section, rather
than leaving the parent chain to fill in.

### Cross-layer name matching

Subhex path name and parent chain name are matched **normalized**: case-
insensitive, trim whitespace. Subhex Velverdyva = parent Velverdyva.
Typos break the link silently — authoring bug, fixable at the source.

No explicit `canonicalId` field. The name is the natural key.

### Parent CRUD UI behavior

When a parent has subhex authoring, the parent-chain CRUD UI in
`gcc-hex-edit.js` shows **disabled-with-explanation** state for river/
road editing on this parent: "This parent is subhex-authored. Edit
subhex paths instead." Read-only display of the parent chain remains
visible.

Unauthored parents: parent CRUD UI works normally.

### Authoring patterns

- **Underground / intermittent rivers** (per-parent fallback consequence):
  GM authors subhex paths in the parent, omits the gap section in
  `cells[]`. Optionally drops a `feature: { kind: 'landmark', name: 'sinkhole' }`
  on the cell where the river submerges.
- **Bringing a parent under subhex authority**: GM authors at least one
  subhex path or lake claim in the parent. From that moment, parent
  chain data is hidden from the journey planner for that parent.

---

## Q4 — Lake / river junctions

### Canonicality

Path metadata is canonical. Cell adjacency is the consistency check.

`path.headwaters = { lakeId: 'lake-quagflow' }` is the truth that
"Velverdyva sources from Lake Quagflow." The authoring tool soft-warns
if `cells[0]` isn't adjacent to a cell with that lakeId, but writes
proceed.

### Outflow / mouth cells

Derived, not stored:

```
outflowCell(path) = path.cells[0]                    // for rivers with headwaters set
mouthCell(path)   = path.cells[path.cells.length-1]  // for rivers with mouth set
```

Free, can't drift.

### Polymorphic linkage

`headwaters` and `mouth` accept `{ lakeId } | { pathId } | null`:

- `{ lakeId }` — sources from / drains into a named lake.
- `{ pathId }` — sources from / joins another named river. Used for
  tributaries (e.g., Veng's `mouth: { pathId: 'velverdyva' }`).
- `null` — open source / open mouth (off-map, unspecified).

### Soft-warn rules

The cell-adjacency consistency check has two cases:

- `{ lakeId }`: warn if the relevant endpoint cell is not adjacent to a
  cell with that lakeId.
- `{ pathId }`: warn if the relevant endpoint cell is not present in
  that path's `cells[]`.

Both warn, neither blocks.

### River-path-on-lake-cell

A cell can simultaneously have `lakeId` set and appear in a river
`path.cells[]`. The two flags are independent properties. Movement
takes the union (raft works either way, encounter logic uses
`lake.kind`/`lake.depth` because the cell has lakeId).

This is the convention that makes lake-sourced rivers work cleanly
(see Q5).

### Watershed graph

The polymorphic linkage gives a navigable river graph. Walking from
headwaters to mouth: follow `mouth.pathId` recursively for tributaries,
or pause at `mouth.lakeId` for lake stops, terminate at `null`. Useful
for display ("tributary of Velverdyva") and watershed queries
("show me every river in the Selintan basin").

---

## Q5 — Cross-parent continuity

### Path-level continuity

Subhex paths are global. `cells: [{Q,R}, ...]` spans parents freely.
Each consecutive pair has axial distance 1; whichever pair straddles
parent ownership IS the cross-parent transition. No special marker.

### Validation rules

1. Adjacency: every consecutive pair in `cells[]` has axial distance 1
   (existing).
2. No self-intersection within a path (existing).
3. No special handling for cross-parent transitions.

### Lake-to-river transitions

Q4 #4 established: river cells can extend into lake-claimed cells.
Convention:

A river that sources from a lake has its initial `cells[]` inside the
lake until the path exits lake-claimed area. The exit point is the
consecutive pair where cell N has `lakeId` and cell N+1 doesn't. That
pair is the geographic outflow.

Velverdyva: `cells[0..k]` have `lakeId: 'lake-quagflow'`, `cells[k+1..]`
don't. Cell pair (`cells[k]`, `cells[k+1]`) is the outflow.

Symmetric for rivers entering a lake: tail cells get `lakeId` set.

### Rivers crossing lakes

Convention (soft, not enforced): two paths, not one.

A river that enters a lake on one side and "exits" the other is
modeled as:
- Upper Foo: `mouth: { lakeId: 'lake-x' }`, last cells inside the lake.
- Lower Foo: `headwaters: { lakeId: 'lake-x' }`, first cells inside the lake.

Why: the watershed graph from Q4 stays traversable through the lake
(walk from Upper Foo's mouth → lake-x → Lower Foo's headwaters → on).
A single path running through the lake skips the lake node in the graph.

The schema permits one-path-through-lake; the convention is two paths.

### Roads through water cells

Soft-warn at write time if a road path includes a water-terrain cell.
Allows magical-bridge-as-road and similar edge cases; covers the
typical mistake.

### Cross-parent path naming

One path doc per named river/road. Velverdyva is one path doc spanning
all parents. Renamed sections (a road called "Old Keep Road" in one
region and "Goldfields Highway" in another) are two separate path docs,
sharing zero or one cells at the transition.

---

## Q6 — Journey planner integration

### River cost with tier

`edgeRiverCost(colA, rowA, colB, rowB, mode, burden)`:

```
edgeRiverCost(...):
  if (edgeHasCrossing(...)) return 0;             // bridge/ford/ferry
  if (edgeHasSubhexRoad(...)) return 0;           // existing rule
  const info = edgeRiverInfo(...);
  if (!info.hasRiver) return 0;
  switch (info.tier) {
    case 'stream':       return 0;
    case 'river':        return burden === 'light' ? 0   : 0.5;
    case 'great_river':  return burden === 'light' ? 0.5 : 1.0;
    default:             return burden === 'light' ? 0   : 0.5;  // unknown tier = river
  }
```

**Cost numbers are placeholder.** Pin to the Greyhawk box raft rules
when Kurt confirms the citation. Default-on-unknown-tier covers parent-
fallback paths that may not have an authored tier.

### Crossings precedence

Already unified in v0.8 (`edgeCrossingInfo`). Subhex feature on boundary
cell with kind ∈ {bridge, ford, ferry} wins; parent fallback used only
when parent has no subhex authoring (Q3 per-parent rule). Crossroads
kind is informational, doesn't affect cost.

### Encounter dispatch

`gcc-encounters.js` `check()` gains a lakeId branch before terrain
dispatch:

```
check({ terrain, lakeId, ... }):
  if (lakeId) {
    const lake = getLake(lakeId);
    return rollLakeEncounter(lake.kind, lake.depth);
  }
  // existing terrain-based dispatch
```

Four encounter tables: `lake_shallow`, `lake_deep`, `sea_shallow`,
`sea_deep`. Authoring is encounter-content work; out of scope here.

### Helper rewrites

| Helper | Status |
|---|---|
| `edgeRiverInfo` | Rewrite: subhex-first per Q3, return `tier` from path doc. |
| `edgeRiverCost` | Rewrite: tier dimension, see above. |
| `edgeCrossingInfo` | Already prefers subhex (v0.8); generalize for per-parent fallback. |
| `edgeBlocks` | Unchanged (returns false for land travel). |
| `edgeRoadBonus` | Already subhex-first (v0.5+); generalize. |
| `riversAt(col, row)` | Rewrite: scan subhex paths whose cells fall in this parent. |
| `riverNameOnEdge` | Thin wrapper, no change. |
| `allCrossings()` | Rewrite: scan subhex feature cells with kind ∈ {bridge,ford,ferry,crossroads}. |
| `getRoadInfo` / `getRoadChain` | Rewrite: scan subhex paths kind=road. |
| `saveRiver` / `saveRoad` / `deleteRiver` / `deleteRoad` | Disabled when parent has subhex authoring (Q3 #4 UI). |
| `check()` (encounter) | Add lakeId branch before terrain dispatch. |

All public signatures stable. Internal logic shifts under the facade.

---

## Q7 — Performance / indexing

### Strategy: eager rebuild on change

Build indexes once on subhex data load. Rebuild on `gcc-subhex-changed`
event. Queries are direct hash lookups.

GCC's dataset is small enough that the rebuild is sub-millisecond. Cost
of "rebuild on every edit" is negligible. Optimize only if perceptible.

### Indexes

In `gcc-subhex-paths.js`:

```
pathsByCell  : Map<'Q,R',         pathLocalId[]>  // foundational
pathsByParent: Map<'col-row',     pathLocalId[]>  // derived
pathsByEdge  : Map<'colA-rowA-colB-rowB', pathLocalId[]>  // derived
```

In `gcc-subhex-data.js`:

```
cellsByLake  : Map<lakeId, {Q,R}[]>
lakesByParent: Map<'col-row', lakeId[]>
```

Build is a single pass over all paths' `cells[]` and all cells'
`lakeId`. Invalidation is full rebuild.

### `parentHasSubhexAuthoring` helper

Single source of truth for the per-parent fallback gate (Q3):

```
parentHasSubhexAuthoring(col, row):
  return (pathsByParent[`${col}-${row}`] || []).length > 0
      || (lakesByParent[`${col}-${row}`] || []).length > 0;
```

Used by every facade helper that decides between subhex and parent
fallback.

### Future migration to incremental

If rebuild ever becomes perceptible (won't at GCC's scale), migrate
each index to incremental updates inside `savePath`/`deletePath`/
`setCellLake`/`setCellTerrain`. Keep the eager rebuild as the
correctness fallback.

---

## Q8 — Backwards compatibility

### Subhex paths v2 → v3

For each path doc in `gcc-subhex-paths`:

1. If `kind === 'river'` and no `tier`, set `tier: 'river'`.
2. If `kind === 'track'`, rename to `kind: 'trail'`.
3. Add `headwaters: null`, `mouth: null` if absent.
4. Bump `schemaVersion: 3`.

Guard: `gcc-subhex-paths-migrated-v3`.
Backup: `gcc-subhex-paths-pre-v3-backup` (full pre-migration dump).

### Subhex cells

Lazy migration. Cells gain `lakeId` only when authored into a lake.
Cells without `lakeId` remain v2 indefinitely. Reads handle both
versions identically (lakeId absent on v2 docs).

No migration flag. No batch pass. No backup (no destructive change).

### Subhex lakes (new)

No prior data. New empty store at `gcc-subhex-lakes`. First lake the
GM authors creates the storage key.

### Parent-layer paths

No schema change. Parent chains stay live for unauthored parents
indefinitely.

### Migration ordering on first load

1. Subhex paths v2 → v3 migration (with backup).
2. Lakes initialization (read-write empty if absent).
3. Index build (Q7 eager).

Each migration is idempotent.

### Forward-compat tolerance

Older `gcc-subhex-paths.js` reading a v3 doc: ignores `tier`,
`headwaters`, `mouth`. Renders normally; loses tier-based cost
differentiation.

Older `gcc-subhex-data.js` reading a v3 cell with `lakeId`: ignores it.
Renders normally as water terrain.

Older code doesn't read `gcc-subhex-lakes` storage key. No-op.

Newer-to-older downgrade is unsupported but won't corrupt data.

---

## Implementation scope (next session)

Single-session scope. Order matters — earlier items unlock later.

### Phase 1 — Schema and storage

1. **`gcc-subhex-data.js` v2.4.0** — add `lakeId` to cell schema (lazy);
   add lake CRUD (`saveLake`, `getLake`, `setCellLake`, `deleteLake`);
   `WATER_TERRAINS` constant; terrain-change auto-clear of `lakeId`;
   `cellsByLake`/`lakesByParent` index.
2. **`gcc-subhex-paths.js` v2.0.0** — schema v3 (tier, headwaters,
   mouth); v2→v3 migration with backup; track→trail rename;
   `pathsByCell`/`pathsByParent`/`pathsByEdge` index; expose
   `parentHasSubhexAuthoring(col, row)`.

### Phase 2 — Facade rewrites

3. **`gcc-paths.js` v0.9.0** — rewrite per Q6 helper table; per-parent
   fallback gate via `parentHasSubhexAuthoring`; subhex-first for all
   path queries (was edges-only in v0.5+).
4. **`gcc-encounters.js`** — lakeId branch in `check()`; lake encounter
   table dispatch (placeholder tables OK; content work follows).

### Phase 3 — Authoring UI

5. **`gcc-hex-edit.js`** — disable parent CRUD with explanation when
   parent has subhex authoring.
6. **`gcc-subhex-view.js`** — lake authoring tool (paint cells into
   lake, create new lake); river path edit gains `tier` selector,
   reverse button, headwaters/mouth picker (lake/river/none toggle +
   filtered name picker).

### Phase 4 — Validation polish

7. Soft-warn validators: lake-cell terrain constraint, road-through-
   water-cell warn, headwaters/mouth cell-adjacency warn.

### Out of scope for this session

- Encounter table content (lake/sea × shallow/deep table seeding).
- Migration of parent BASE rivers/roads to subhex authoring.
- Tier-cost number pinning (waiting on Kurt's Greyhawk box citation).
- Watershed graph display features.

### Open items

- **Tier-cost numbers** — placeholder pending Greyhawk box raft rule
  citation. Pin in `edgeRiverCost` when confirmed.
- **Road tier system** (highway/road/track) — explicitly deferred. New
  field `roadTier` if/when needed.

---

## Conventions captured

- **Cell-pointer membership** is the GCC convention for cell-to-record
  relationships (regions, lakes). Records are metadata-only; cells point
  at them.
- **Schema versioning** is per-module. Migration flags in localStorage
  are per-module. Naming: `gcc-${module}-migrated-v${N}`. Backups:
  `gcc-${module}-pre-v${N}-backup`.
- **Per-parent fallback** is the gate for parent-layer fallback under
  Option C. Encoded in `parentHasSubhexAuthoring(col, row)`.
- **Soft-warn over hard-block** for cross-record consistency checks
  (cell adjacency for headwaters/mouth, road-through-water). Hard-block
  reserved for invariants enforced by the data layer (lakeId requires
  water terrain).
