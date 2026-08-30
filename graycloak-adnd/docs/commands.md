# Graycloak Authoritative Command Boundary v1.1

Graycloak's player runtime is intentionally split into two trust domains:

1. the browser may **preview** rules and construct an intent;
2. a trusted runtime must **re-read authoritative state, recompute the outcome, and commit it atomically**.

v1.0 introduced `Begin Travel` as the first command that follows that model. v1.1 adds the first Firestore transaction adapter for the semantic commit bundle. The browser still does not become authoritative.

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

## v1.1 Firestore transaction adapter

`runtime/firestore-transaction.mjs` applies a validated v1 semantic commit bundle through a Firestore-compatible `runTransaction()` API. It is deliberately outside `public/` and is not loaded by `public/index.html`.

The default physical collections are:

```text
campaigns/{campaignId}
characters/{actorId}
activities/{activityId}
events/{commandId}
```

The Actor collection remains `characters` for this phase. The Foundry-inspired Actor abstraction does not require a destructive `characters` to `actors` migration.

Inside the transaction, v1.1 verifies:

1. the command-event idempotency marker does not already exist, or represents the same already-committed command;
2. the target Activity id does not already exist for a first execution;
3. the campaign still exists and has the exact expected `worldTick`;
4. every Actor still exists;
5. every Actor still has the expected `campaignId`, `currentLocation`, and time-runtime snapshot.

Only after all reads and preconditions succeed does the adapter:

1. create the Activity;
2. patch each Actor's `runtime` reservation;
3. create the immutable GameEvent.

Those writes commit atomically. If a precondition fails, none of them are written.

### Idempotent retry

The GameEvent document at `events/{commandId}` is the durable idempotency marker. If the same command is retried after it was already committed, the adapter returns `already-committed` without reserving Actors again. This remains true even if the original travel Activity later completes and the Actors have moved on.

If the same command id is already occupied by a conflicting event, the adapter returns `idempotency-conflict`.

### Storage boundary that v1.1 does not claim

The v1.0 bundle currently carries transaction preconditions for campaign time and Actor snapshots only. Authored terrain and externally supplied movement policy are revalidated by the trusted command executor before bundle creation, but they are not yet represented as Firestore transaction preconditions.

Therefore v1.1 must not be described as detecting a concurrent GM edit to authored terrain between command execution and bundle commit. If that becomes important, the command context should add explicit map-data revision/fingerprint preconditions rather than hiding the gap.

## Current limitation: movement authority

Current character generation does not yet persist a canonical movement profile for every PC. The map's v0.9 Movement Rate field remains a **preview-only** value and is deliberately excluded from the Begin Travel command.

Until Actor movement is fully modeled, the trusted runtime must supply `authoritativeMovementProfiles` from trusted data/GM policy. This is intentional: a client-entered Movement Rate must never become authoritative merely because it was used to render a preview.

## Not included in v1.1

v1.1 does not yet provide:

- a network endpoint;
- a Cloud Run/Firebase Functions deployment;
- a Begin Travel UI button;
- Firestore Security Rules for the new authoritative collections;
- world-clock advancement;
- Activity completion/resolution;
- encounters, provisions, navigation, weather, crossings, or mounts;
- transaction fingerprints for authored map terrain or external movement-policy revisions.

The command boundary and transaction adapter are the seams those systems can attach to later.
