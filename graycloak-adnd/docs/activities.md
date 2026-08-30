# Graycloak Activity / Travel Primitives v0.6

v0.6 extends the pure Travel Activity planner with explicit axial route segments and map-derived distance. It still does not pathfind, write Firestore, advance campaign time, move Actors, roll encounters, or resolve completed Activities.

## Rules boundary

The outdoor pace layer continues to use the OSRIC 3.0 Player Guide Section 1.5.3.2 hiking formulas:

- level terrain: Movement Rate × 0.20 miles/day
- rugged terrain: Movement Rate × 0.15 miles/day
- very rugged terrain: Movement Rate × 0.10 miles/day

The Activity layer does **not** own Graycloak map scale. The current map engine already defines the global subhex and mile scales. A caller that has loaded `@graycloak/map-engine` should pass the relevant map scale into the travel planner as `routeMilesPerStep`.

For the current player world map:

```js
routeMilesPerStep = MapEngine.SCALES.subhex.milesAcross;
```

This is 3 miles in the present map-engine scale, but `adnd-activities.js` deliberately does not hard-code that world geometry.

## Explicit route segments

A calculated route is supplied as an ordered chain of adjacent axial map-cell transitions:

```js
routeSegments: [
  {
    from: { subHexCoord: [10, 20] },
    to:   { subHexCoord: [11, 20] },
    terrain: 'level'
  },
  {
    from: { subHexCoord: [11, 20] },
    to:   { subHexCoord: [12, 20] },
    terrain: 'rugged'
  }
],
routeMilesPerStep: 3
```

Coordinates may be supplied as:

```text
[Q, R]
{ Q, R }
{ subHexCoord: [Q, R] }
```

The cube-coordinate distance formula matches the existing `@graycloak/map-engine axialDistance()` behavior.

## Why every segment must be adjacent

v0.6 requires every route segment to cross exactly one axial cell edge, and each segment must begin where the previous segment ended.

This is intentional.

Terrain is attached to the specific route segment. Allowing a single long segment to jump across several cells would permit the caller to label an entire skipped path as one terrain type even if the intervening authored map contained different terrain.

Pathfinding is still deferred. The future map/path layer is responsible for producing the ordered adjacent-cell chain.

## Mixed terrain

Each route segment is resolved independently against the same participating Actors' movement profiles.

For a Movement Rate 120 party using a 3-mile subhex step:

```text
3 miles level  / 24 miles/day = 0.125 day
3 miles rugged / 18 miles/day = 0.166666... day
total                         = 0.291666... day
```

Graycloak then schedules the Activity with:

```text
durationTicks = ceil(totalTravelDays × TICKS_PER_DAY)
```

The example above is 4,200 world ticks.

The Activity stores the segment calculations so the authoritative runtime can later explain why the trip took as long as it did.

## Route provenance

Route-calculated travel uses:

```text
durationSource: osric-outdoor-route
```

and records:

```text
system.outdoorTravel.routeMode
system.outdoorTravel.routeMilesPerStep
system.outdoorTravel.segmentCount
system.outdoorTravel.distanceMiles
system.outdoorTravel.partyMovementRate
system.outdoorTravel.travelDays
system.outdoorTravel.origin
system.outdoorTravel.destination
system.outdoorTravel.segments[]
```

Each stored segment includes:

```text
from
to
steps
distanceMiles
terrain
terrainFactor
partyMovementRate
milesPerDay
travelDays
```

This is calculation provenance, not a pathfinding result.

## Origin/destination consistency

When the Activity's `origin` or `destination` contains a subhex coordinate, v0.6 verifies that it matches the first or last route coordinate.

Named Place IDs remain valid even when the place's coordinates are not present in the request, so:

```js
origin: 'place-a'
destination: 'place-b'
```

may still accompany a route.

## Existing travel modes remain valid

The v0.5 single-terrain form remains supported:

```js
distanceMiles: 12,
terrain: 'level',
movementProfiles: { ... }
```

and continues to use:

```text
durationSource: osric-outdoor
```

A positive manual `durationTicks` still overrides all calculated routing data and uses:

```text
durationSource: manual
```

This remains the GM/script escape hatch for travel modes not yet modeled.

## Encumbrance boundary

v0.6 still does not calculate encumbrance from carried pounds. Callers must provide either an already-final `movementRate`, or an already-known `baseMovementRate` / `encumbrancePace` / optional `armourMovementCap` profile.

That keeps the current unaudited inventory-weight thresholds out of persistent travel calculations.

## Still deferred

v0.6 intentionally does not implement:

- route/path finding
- map UI route selection
- road/trail modifiers
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

The next useful layer can connect authored map cells to route construction, or add road/path effects after the route geometry has proven stable.
