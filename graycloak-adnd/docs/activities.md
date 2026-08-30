# Graycloak Activity / Travel Primitives v0.4

v0.4 makes the existing `Activity` Document useful for the first time-spanning MMO action: travel. It remains deliberately pure and non-authoritative.

## Activity purpose

An Activity is a stable-ID document representing a commitment that occupies one or more Actors over campaign time. Travel, training, rest, research, and construction can later use the same pattern.

v0.4 implements only `type: "travel"`.

## Travel input

`ADNDActivities.createTravelPlan()` expects:

- a stable Activity `id`
- a campaign `campaignId`
- one or more Actor documents
- the shared campaign `worldTick`
- a positive integer `durationTicks`
- an `origin` location reference
- a `destination` location reference

Location references may be a stable string ID such as `place-hommlet`, or a structured plain object such as the current map's regional/subhex location data. A location reference is not required to become its own Document merely to participate in travel.

The duration is supplied by the caller. v0.4 does **not** implement OSRIC wilderness movement rates, terrain costs, weather, mounts, roads, encumbrance, or route finding. Those rules belong in a later travel-rules layer.

## Availability rule

Every participating Actor must belong to the same supplied campaign and be `current` at the supplied `worldTick` according to `ADNDWorldClock`. Cross-campaign Activities are rejected.

Travel therefore refuses Actors that are:

- `unbound`
- `behind`
- `unavailable`
- `ahead`
- `unknown`

This prevents a party from beginning a new shared-world action while one member is temporally unresolved.

## Pure result

A successful plan returns two things that an eventual authoritative command can commit transactionally:

1. one active Travel Activity document
2. one runtime reservation patch for each participating Actor

The Activity carries:

```text
id
type: travel
actorIds
startedAtTick
availableAtTick
status: active
system.durationTicks
system.origin
system.destination
```

Each Actor patch carries:

```text
runtime.lastResolvedTick = startedAtTick
runtime.availableAtTick = activity.availableAtTick
runtime.activityId = activity.id
```

Planning does not mutate the source Actor objects.

## Due is not resolved

`ADNDActivities.isActivityDue(activity, worldTick)` answers whether an active Activity has reached its `availableAtTick`.

Being due does **not** automatically:

- move an Actor to the destination
- clear `activityId`
- advance `lastResolvedTick`
- advance the campaign clock
- roll encounters
- spend supplies
- apply damage or other consequences
- write Firestore

Those are authoritative resolution operations intentionally deferred to later slices.

## Why the Activity owns the reservation

A party of multiple Actors shares one Activity ID. This gives a group trip one stable object that later encounter rolls, route choices, events, cancellation, and resolution can reference rather than duplicating travel state independently on every Actor.
