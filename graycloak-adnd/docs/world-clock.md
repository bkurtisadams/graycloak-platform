# Graycloak World Clock v0.3

Graycloak uses one authoritative numeric campaign clock. Characters do not own independent timelines.

## Canonical unit

`worldTick` is a non-negative safe integer. One tick equals one OSRIC combat segment: **6 seconds**.

This yields exact integer conversions:

- 1 round = 10 ticks = 1 minute
- 1 turn = 100 ticks = 10 minutes
- 1 hour = 600 ticks
- 1 day = 14,400 ticks

The numeric clock is deliberately calendar-agnostic. A Greyhawk date or a future Graycloak-setting date is a presentation derived from campaign time by a calendar adapter. v0.3 does not replace or derive the existing `campaign.currentDate`; it only establishes the canonical numeric primitive for future authoritative play.

## Campaign state

A campaign may carry:

```text
worldTick: 123456
```

Legacy campaigns with no `worldTick` remain valid. `ADNDWorldClock.campaignWorldTick()` returns `null` rather than silently inventing an epoch.

## Actor runtime state

Actors already reserve:

- `runtime.lastResolvedTick` — last world tick through which the actor's state has been resolved
- `runtime.availableAtTick` — earliest tick at which the actor may become available
- `runtime.activityId` — Activity currently reserving the actor, if any

v0.3 gives those fields deterministic meaning but does not write or advance them.

## Actor time statuses

`ADNDWorldClock.getActorTimeStatus(actor, worldTick)` reports one of:

- `unbound` — actor has not yet been bound to campaign time
- `current` — actor is resolved through the current world tick and is free to act
- `behind` — actor is behind the shared frontier and requires catch-up before acting
- `unavailable` — an Activity or future `availableAtTick` reserves the actor
- `ahead` — actor claims to be resolved beyond the campaign clock; this is invalid authoritative state and is surfaced rather than hidden
- `unknown` — no valid world tick was supplied

An actor is available to begin a new action only when status is `current`.

## Catch-up rule

Being behind never creates a private past version of the world. A behind actor must eventually be resolved forward to the shared `worldTick` before taking a new world-affecting action.

v0.3 defines the query primitives only:

- `actorNeedsTimeBinding(actor, worldTick)`
- `actorNeedsCatchUp(actor, worldTick)`
- `isActorAvailable(actor, worldTick)`
- `getActorTimeStatus(actor, worldTick)`

Binding, catch-up effects, Activity resolution, world-clock advancement, and Firestore writes are deferred to later authoritative-runtime slices.

## No side effects in v0.3

This version intentionally does **not**:

- advance campaign time
- convert `currentDate` into `worldTick`
- bind legacy actors automatically
- process downtime
- create travel Activities
- clear completed Activities
- write to Firestore

Those operations need an authoritative command layer rather than a browser-side helper.
