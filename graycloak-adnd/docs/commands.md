# Graycloak Authoritative Command Boundary v1.0

Graycloak's player runtime is intentionally split into two trust domains:

1. the browser may **preview** rules and construct an intent;
2. a trusted runtime must **re-read authoritative state, recompute the outcome, and commit it atomically**.

v1.0 introduces `Begin Travel` as the first command that follows that model. The module is transport/storage agnostic. It does not call Firestore itself; it returns a semantic commit bundle for a later Firestore transaction adapter.

## Client-safe Begin Travel intent

The browser may submit only the player's choices:

```js
{
  schemaVersion: 1,
  commandId: 'command-travel-...',
  type: 'beginTravel',
  campaignId: 'campaign-1',
  activityId: 'activity-travel-...',
  expectedWorldTick: 1200,
  actorIds: ['char-val', 'char-kris'],
  routeCells: [
    { Q: 10, R: 20 },
    { Q: 11, R: 20 },
    { Q: 12, R: 20 }
  ]
}
```

The command intentionally does **not** contain authoritative outcomes such as:

- Movement Rate;
- terrain class;
- route duration;
- arrival tick;
- Actor runtime patches;
- encounter results.

A modified client can append such fields, but `executeBeginTravelCommand()` normalizes the command back to the allowed intent shape and ignores those claims.

## Authoritative execution

The trusted runtime supplies authoritative context:

- the current campaign record and `worldTick`;
- fresh Actor records;
- authoritative movement profiles (or movement data stored on the Actor);
- authored subhex terrain and parent terrain;
- the canonical map `ownerOf()` function;
- the canonical miles-per-subhex scale;
- the active rules version.

Execution rechecks, in order:

1. command/campaign/activity identity;
2. expected `worldTick` against the current campaign frontier;
3. every Actor still exists in the campaign;
4. every Actor is still at the route origin;
5. every Actor is `current` and not reserved by another Activity;
6. authoritative movement data exists and is valid;
7. route cells are adjacent;
8. authored terrain still supports the route;
9. travel duration is recomputed from trusted terrain + movement data.

A stale preview therefore cannot reserve Actors after another command has moved them, changed the campaign clock, or changed their availability.

## Semantic commit bundle

On success the executor returns one bundle containing:

- the active Travel Activity to create;
- Actor runtime reservation patches;
- a `travel.started` GameEvent;
- transaction preconditions for the campaign clock and Actor snapshots;
- the command id as an idempotency key.

The executor itself does **not** mutate source Actors or write storage.

A later Firestore adapter should run the command inside a transaction and use these preconditions to guarantee that the read state has not changed before applying all writes together.

## Idempotency

`commandId` is the idempotency key and is also used as the `GameEvent.id` for this first command. A storage adapter must reject/replay an already-recorded command rather than execute it twice.

`activityId` is independently stable. The transaction should require that neither the command event nor Activity already exists before first execution.

## Current limitation: movement authority

Current character generation does not yet persist a canonical movement profile for every PC. The map's v0.9 Movement Rate field remains a **preview-only** value and is deliberately excluded from the Begin Travel command.

Until Actor movement is fully modeled, the trusted runtime must supply `authoritativeMovementProfiles` from trusted data/GM policy. This is intentional: a client-entered Movement Rate must never become authoritative merely because it was used to render a preview.

## Not included in v1.0

v1.0 does not yet provide:

- a network endpoint;
- a Cloud Run/Firebase Functions deployment;
- a Firestore transaction adapter;
- a Begin Travel UI button;
- world-clock advancement;
- Activity completion/resolution;
- encounters, provisions, navigation, weather, crossings, or mounts.

The command boundary is the seam those systems can safely attach to later.
