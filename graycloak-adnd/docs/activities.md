# Graycloak Activity / Travel Primitives v1.0

v0.7 bridges the authored world map into the v0.6 axial route model. Given an ordered list of adjacent subhex coordinates, the Activity layer can now resolve each entered cell's authored terrain, classify it into an outdoor travel band, construct route segments, and create a Travel Activity.

It still does **not** pathfind, write Firestore, advance campaign time, move Actors, roll encounters, or resolve completed Activities.


## v1.0 authoritative command boundary

Travel preview and travel authority are now deliberately separate. The map may package selected Actor ids, the ordered route cells, and the campaign `expectedWorldTick` into a client-safe `beginTravel` intent through `ADNDCommands.createBeginTravelIntent()` / `ADNDMapView.buildBeginTravelIntent()`. It does not submit Movement Rate, terrain, duration, arrival time, or Actor patches as authoritative facts.

`ADNDCommands.executeBeginTravelCommand()` is intended to run only against trusted state. It reloads/rechecks the campaign frontier and Actors, verifies every Actor is still at the route origin and temporally current, obtains authoritative movement profiles, rebuilds the authored route terrain, and reruns the Activity planner. On success it returns the Travel Activity, Actor reservation patches, a `travel.started` GameEvent, and transaction preconditions as one semantic commit bundle. It still performs no Firestore writes itself. See `docs/commands.md`.

## Rules and policy boundary

The travel-speed formulas remain the OSRIC 3.0 outdoor hiking bands already used by v0.5/v0.6:

- level terrain: Movement Rate × 0.20 miles/day
- rugged terrain: Movement Rate × 0.15 miles/day
- very rugged terrain: Movement Rate × 0.10 miles/day

OSRIC defines those three movement bands, but Graycloak's authored world uses a more detailed terrain vocabulary. Therefore the mapping from authored terrain names to those bands is a **Graycloak map policy**, not an OSRIC table.

Default v0.7 mapping:

```text
level
  clear
  plains

rugged
  forest
  hardwood
  conifer
  hills
  desert

very-rugged
  forest_hills
  jungle
  mountains
  barrens
  swamp
```

`river` and the `water*` terrain types are intentionally not classified for pedestrian travel yet. A later crossing/naval layer must decide whether a bridge, ford, ferry, boat, swimming, or other rule makes that transition legal.

Callers may provide a small `terrainClasses` override object when a campaign adds a custom authored terrain name:

```js
terrainClasses: {
  ash_wastes: 'rugged'
}
```

## Authored terrain precedence

v0.7 mirrors the player map's terrain precedence.

For a given global axial cell `(Q,R)`:

1. look for `subHexes/subhex_{Q}_{R}`;
2. if the subhex is part of a lake and is not already explicitly water terrain, treat it as `water_fresh`;
3. otherwise use the subhex's explicit `terrain` override if present;
4. otherwise inherit the owning parent hex's base terrain.

The helper is:

```js
ADNDActivities.resolveAuthoredCellTerrain(coord, {
  subhexes,
  parentTerrain,
  ownerOf,
  terrainClasses
})
```

`subhexes` is the keyed object already produced by the player-map loader. `parentTerrain` is the packed base-terrain map such as `regions/flanaess.hexes`. `ownerOf(Q,R)` is supplied by `@graycloak/map-engine` when the subhex document itself does not contain an owner.

The result records both:

```text
mapTerrain     // authored vocabulary, e.g. forest
terrain        // travel band, e.g. rugged
terrainSource  // subhex-override | parent-inherited | lake
```

## Route cells -> route segments

The v0.7 route-builder accepts an ordered list of actual map cells:

```js
const route = ADNDActivities.buildAuthoredRouteSegments({
  routeMilesPerStep: 3,
  routeCells: [
    [10, 20],
    [11, 20],
    [12, 20]
  ],
  subhexes,
  parentTerrain,
  ownerOf
});
```

Every consecutive cell must be adjacent. v0.7 does not fill gaps or select a path.

The route above becomes two v0.6-compatible segments.

### Entered-cell cost

A segment's movement cost uses the terrain of the cell being **entered**.

For:

```text
A -> B -> C
```

segment `A -> B` uses B's terrain, and segment `B -> C` uses C's terrain.

The starting cell does not consume another cell's worth of travel merely because the party begins there.

Each generated segment carries calculation provenance:

```text
from
to
terrain
mapTerrain
terrainSource
enteredCellId
owner
```

The normal v0.6 route calculator then adds:

```text
steps
distanceMiles
terrainFactor
partyMovementRate
milesPerDay
travelDays
```

## Direct authored-map Travel Activity

The convenience wrapper combines map lookup, segment construction, route-duration calculation, and the existing pure Activity planner:

```js
const plan = ADNDActivities.createAuthoredMapTravelPlan({
  id: 'activity-travel-1',
  campaignId,
  actors,
  worldTick,

  routeMilesPerStep: MapEngine.SCALES.subhex.milesAcross,
  routeCells: [
    [10, 20],
    [11, 20],
    [12, 20]
  ],

  subhexes: loadedMapData.subhex,
  parentTerrain: loadedMapData.flanaess,
  ownerOf: MapEngine.ownerOf,

  movementProfiles
});
```

If `origin` and `destination` are omitted, the wrapper creates structured subhex location refs from the first and last route cells.

The resulting Activity records:

```text
system.outdoorTravel.routeMode   = axial-segments
system.outdoorTravel.routeSource = authored-map
```

and stores the raw terrain provenance on every segment.

The source Actors are still not mutated. The result contains the same Actor reservation patches introduced in v0.4 for a future authoritative transaction.

## Missing and unsupported terrain are explicit failures

If an entered cell has neither an authored override nor resolvable inherited parent terrain, route construction returns:

```text
missing-map-terrain
```

If terrain exists but is not currently legal for this travel mode, such as `water_fresh`, route construction returns:

```text
unsupported-map-terrain
```

This is deliberate. The runtime should not invent a travel rate just to keep a route moving.

## Existing travel modes remain valid

v0.7 does not remove any prior API:

- manual `durationTicks`
- v0.5 single-terrain `distanceMiles + terrain`
- v0.6 caller-built `routeSegments`

`createAuthoredMapTravelPlan()` is an additional map-aware entry point.

## Still deferred

v0.7 intentionally does not implement:

- shortest-path or A* pathfinding
- map click/drag route UI
- roads/trails changing terrain cost
- bridges/fords/ferries and water crossing
- deriving movement profiles from Actor inventory
- mounted travel
- vehicles
- forced marches
- weather
- getting lost/navigation
- wilderness encounters
- food/water consumption
- camping/rest
- automatic world-clock advancement
- Activity resolution
- Firestore writes

The next useful slice is the **map adapter/UI boundary**: let `adnd-map-view.js` expose the loaded map-engine scale/terrain data to this route builder, then support selecting an ordered route on the map without yet adding pathfinding.

---

## v0.8 map route-selection adapter

v0.8 adds a small pure `ADNDMapRoute` layer and connects it to `adnd-map-view.js`.
It does not change the v0.7 Activity calculation rules. Instead, it gives the player
map a safe way to collect the `routeCells` that v0.7 already knows how to adjudicate.

The browser UI remains a planner only. Selecting a route does **not** move an Actor,
reserve time, create a Firestore Activity, or advance `campaign.worldTick`.

### Map interaction

The World Map card now exposes:

```text
Plan Route   Undo   Clear
```

When route mode is active:

- ordinary click adds the selected subhex;
- every new cell must be adjacent to the current endpoint;
- dragging still pans the map;
- the mouse wheel still zooms;
- clicking the immediately previous route cell backtracks one step;
- clicking another previously selected cell is rejected rather than creating a loop;
- settlement/freehold marker links continue to behave as links.

If all located loaded characters occupy one shared subhex, `Plan Route` seeds that cell as
the starting point. If the loaded characters occupy different cells, the route starts
empty and the first click chooses the origin. This is deliberately only a convenience;
v0.8 does not decide which Actors will eventually participate in the trip.

The selected route is drawn as a numbered overlay so its order remains visible.
The status line shows the cell count and map-derived mileage, or an authored-terrain
error such as an unsupported water cell.

### Pure route-selection API

`adnd-map-route.js` exposes the pure selection state separately from the DOM:

```js
let selection = ADNDMapRoute.createSelection();
selection = ADNDMapRoute.setActive(selection, true, [10, 20]).selection;
selection = ADNDMapRoute.appendCell(selection, [11, 20]).selection;
selection = ADNDMapRoute.appendCell(selection, [12, 20]).selection;
```

The selection object is intentionally small:

```text
active
cells[]
error
```

`routeDistanceMiles(selection, milesPerStep)` derives the geometric mileage without
performing travel adjudication.

### Player-map Activity adapter

`ADNDMapView.buildSelectedTravelPlan(input)` bridges the selected route into v0.7.
The map view supplies:

```text
routeCells
MapEngine.SCALES.subhex.milesAcross
loaded subhex documents
loaded parent terrain
MapEngine.ownerOf
campaignId (when available from ?camp=)
worldTick (when available from the loaded campaign)
```

The caller must still supply authoritative gameplay inputs that the map does not yet
own, especially:

```text
id / activityId
actors
movementProfiles
```

For example:

```js
const plan = ADNDMapView.buildSelectedTravelPlan({
  id: 'activity-travel-1',
  actors,
  movementProfiles
});
```

That call remains pure. It returns the same Travel Activity + Actor reservation patches
as `ADNDActivities.createAuthoredMapTravelPlan()`. Nothing is written automatically.

`ADNDMapView.previewSelectedRoute()` is lighter-weight and requires no movement
profiles. It resolves the current route against authored terrain so the UI can show
terrain/water problems while the player is still choosing cells.

### Still deferred after v0.8

v0.8 still does not implement:

- shortest-path or A* route finding
- choosing which Actor/party is travelling
- deriving movement profiles from Actor equipment/encumbrance
- a final "Begin Travel" command
- authoritative Activity/Actor Firestore transactions
- road/trail modifiers
- bridges/fords/ferries or water travel
- mounts, vehicles, forced marches, weather, navigation, encounters, supplies, or camp/rest
- automatic world-clock advancement or Activity completion

The next slice should make the route planner **party-aware**: choose the travelling
Actor set, derive/collect the movement profile data required by v0.5, preview the
calculated duration, and only then prepare a future authoritative `Begin Travel`
command boundary.

---

## v0.9 party-aware travel preview

v0.9 adds a pure `ADNDTravelParty` adapter and a small Travel Party panel to the
World Map. It remains a **preview layer only**. Choosing travelers or entering a
Movement Rate does not write character data, reserve time, create an Activity,
or move anyone on the map.

### Route-origin Actor selection

Once a route has a starting cell, the map lists only loaded Actors whose
`currentLocation.subHexCoord` matches that route origin. The initial local
selection includes all such Actors; checkboxes may remove Actors from the
preview party.

Actors elsewhere on the map cannot be added to that route preview. Campaign-id
filtering is also preserved.

### Movement profile bridge

The current starting-character schema does not yet persist an authoritative
OSRIC movement rate. v0.9 therefore does not invent one.

`ADNDTravelParty.explicitMovementProfile(actor)` recognizes explicit movement
information when some upstream source already provides it:

```text
actor.travelMovementProfile
actor.movementProfile
actor.movementRate
actor.movement.movementRate
actor.movement.rate
actor.movement.baseMovementRate + optional encumbrance/armour fields
```

If none exists, the World Map shows a local `MR` field beside that Actor. A
value entered there is a **preview-only override**. It is not persisted to the
Actor and is not evidence that the value has been rules-audited.

This preserves the v0.5 boundary: the travel calculator may consume an already
known effective movement profile, while inventory-weight encumbrance remains
outside this slice until its OSRIC tables are verified and the Item system can
supply authoritative equipment state.

### Read-only party preview

`ADNDTravelParty.buildPreview()` consumes:

```text
actors[]
movementOverrides / movementProfiles
routeSegments[]
routeMilesPerStep
worldTick (optional for duration-only preview)
```

It calls the existing mixed-terrain route calculator and returns:

```text
durationTicks
durationText
outdoorTravel.distanceMiles
outdoorTravel.travelDays
slowestActor
worldTick
arrivalTick
actorStatuses[]
canBegin
```

The slowest Actor is determined from effective Movement Rate. Because the
OSRIC terrain multiplier is applied equally to all members of the party, the
Actor with the lowest effective Movement Rate sets the party pace on every
ordinary pedestrian route segment.

A preview can still calculate duration for an `unbound` legacy Actor. In that
case `canBegin` is false. This is intentional: the player can inspect route
cost without weakening the shared-time-frontier rule that only `current`
Actors may begin a new Activity.

### Arrival display

The map shows the calculated arrival **worldTick** and relative duration. v0.9
does not convert that tick into a Greyhawk/calendar date. `worldTick` is
calendar-agnostic by design, and a proper calendar adapter is still deferred.
This avoids hard-coding Greyhawk calendar rules into the MMO time engine just
to decorate a preview.

### Future authoritative bridge

`ADNDMapView.buildSelectedPartyTravelPlan(input)` is exposed for the next
slice. It takes the current local traveler selection and preview movement
profiles, then feeds them into the existing selected-route Travel Activity
planner. It remains pure and requires the caller to provide any required
Activity identity. There is still no `Begin Travel` UI in v0.9.

### Still deferred after v0.9

v0.9 still does not implement:

- authoritative Actor movement-rate derivation from Items/encumbrance
- time binding or catch-up side effects
- a `Begin Travel` command
- Activity / Actor Firestore transactions
- world-clock advancement
- Activity completion/resolution
- shortest-path or A* pathfinding
- road/trail speed modifiers
- bridges, fords, ferries, boats, or water travel
- mounts and vehicles
- forced marches
- weather
- navigation/getting lost
- wilderness encounters
- food/water consumption
- camping/rest

The next slice should establish the **authoritative Begin Travel command
boundary** without yet resolving travel. That command must revalidate the route,
Actor ownership/location/time status, and movement inputs server-side before
atomically creating the Activity and reserving the participating Actors.
