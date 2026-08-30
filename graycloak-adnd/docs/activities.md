# Graycloak Activity / Travel Primitives v0.5

v0.5 extends the pure Travel Activity planner with outdoor hiking-duration calculation. It still does not write Firestore, advance campaign time, move Actors, roll encounters, or resolve completed Activities.

## Rules boundary

The outdoor pace layer implements the OSRIC 3.0 Player Guide Section 1.5.3.2 outdoor hiking formulas:

- level terrain: Movement Rate × 0.20 miles/day
- rugged terrain: Movement Rate × 0.15 miles/day
- very rugged terrain: Movement Rate × 0.10 miles/day

The supported encumbrance pace bands are:

- full
- three-quarter
- half
- quarter
- immobile

Armour may supply an independent maximum Movement Rate.

v0.5 deliberately does **not** calculate an Actor's encumbrance band from carried weight. The current `@graycloak/osric3-rules` encumbrance thresholds are still marked as a legacy import awaiting direct OSRIC 3 verification. Callers may therefore either:

1. supply an already-final `movementRate`, or
2. supply a `baseMovementRate`, an already-known `encumbrancePace`, and an optional `armourMovementCap`.

This keeps unaudited weight thresholds out of persistent travel results.

## Calculated travel input

`ADNDActivities.createTravelPlan()` can now omit `durationTicks` and instead supply:

```text
distanceMiles
terrain
movementProfiles
```

`movementProfiles` is keyed by Actor ID.

A final Movement Rate may be supplied directly:

```js
movementProfiles: {
  'char-val': { movementRate: 120 },
  'char-kris': { movementRate: 90 }
}
```

Or a rate may be derived from already-known movement facts:

```js
movementProfiles: {
  'char-val': {
    baseMovementRate: 120,
    encumbrancePace: 'half',
    armourMovementCap: 90
  }
}
```

The encumbrance fraction is applied to Base Movement Rate and the armour cap remains an independent absolute maximum.

## Party pace

A multi-Actor Travel Activity moves at the slowest participating Actor's outdoor pace. Every participating Actor must still pass the v0.4 shared-time and campaign checks before travel may begin.

The calculated Activity records the per-Actor pace data and the resulting party pace so later authoritative events can explain how the travel duration was obtained.

## Fractional travel days

OSRIC wilderness procedure uses the day as its normal exploration unit. Graycloak nevertheless needs an exact `availableAtTick` for asynchronous Activities.

v0.5 therefore uses this scheduling convention:

```text
travelDays = distanceMiles / partyMilesPerDay
durationTicks = ceil(travelDays × TICKS_PER_DAY)
```

Example: Movement Rate 120 in level terrain yields 24 miles/day. A 12-mile trip is scheduled as 0.5 day, or 7,200 world ticks.

This proportional conversion is a Graycloak MMO scheduling rule layered on top of the OSRIC daily hiking rate. It is not intended to redefine OSRIC's wilderness order of play. Later wilderness resolution may still divide a multi-day Activity into daily encounter/navigation/camp steps.

## Manual duration escape hatch

Supplying a positive `durationTicks` still bypasses calculated outdoor movement and marks the Activity with:

```text
durationSource: manual
```

This is intentional for GM adjudication, unusual travel modes, teleports, scripted movement, or rules not yet modeled.

Calculated outdoor travel is marked:

```text
durationSource: osric-outdoor
```

and records:

```text
system.outdoorTravel.ruleset
system.outdoorTravel.section
system.outdoorTravel.distanceMiles
system.outdoorTravel.terrain
system.outdoorTravel.terrainFactor
system.outdoorTravel.partyMovementRate
system.outdoorTravel.milesPerDay
system.outdoorTravel.travelDays
system.outdoorTravel.actorPaces
```

## Still deferred

v0.5 intentionally does not implement:

- deriving encumbrance from inventory weight
- ancestry/base-movement lookup from the OSRIC kernel
- road bonuses or penalties
- route segmentation across multiple terrain types
- mounted travel
- vehicles
- forced marches
- weather
- getting lost/navigation
- wilderness encounters
- food/water consumption
- camping/rest
- automatic world-clock advancement
- Activity resolution or Firestore writes

Those concerns can be layered on after this duration calculator has proven stable.
