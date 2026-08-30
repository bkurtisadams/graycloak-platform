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

## v1.2 trusted command-service shell

`runtime/command-service.mjs` is the first trusted orchestration layer around the pure command executor and the v1.1 Firestore transaction adapter. It is deliberately transport agnostic: an HTTP, Cloud Run, or Firebase Functions endpoint can call it later without moving rules or persistence authority into the browser.

For `Begin Travel`, the service now performs this sequence:

1. normalize the raw client intent with the same `ADNDCommands` contract used by the browser;
2. require an authenticated principal;
3. load the current campaign record and every requested Actor from Firestore;
4. authorize the principal for every Actor before exposing command history or applying state;
5. detect a previously committed matching command event for end-to-end idempotent retry;
6. load the authoritative region parent-terrain document and only the route's referenced `subHexes/{id}` documents;
7. resolve trusted movement profiles from Actor state or a server-supplied movement policy resolver;
8. execute `executeBeginTravelCommand()` against that fresh authoritative context;
9. annotate the GameEvent with the requesting uid and command-service version;
10. pass the semantic bundle to `applyCommitBundle()` for the atomic Firestore transaction.

### Authentication and Actor authorization

The default authorization rule is intentionally strict: `principal.uid` must equal `actor.ownerUid` for every Actor in the command.

That means a future multi-owner party cannot be moved merely because one player selected everybody on the map. Party consent, party leadership, and GM authority should be implemented as a trusted `authorizeActor(actor, principal, context)` policy supplied to the service. Until such a policy exists, the safe default is owner-only.

### End-to-end idempotency

v1.1 can recognize a repeated *commit bundle*, but an already-committed Begin Travel command changes the Actors into an unavailable/reserved state. Re-running the command executor first would therefore correctly reject those Actors before the v1.1 adapter ever saw the old idempotency marker.

v1.2 closes that seam. After authentication and Actor authorization, the service checks `events/{commandId}` before recomputing travel. A matching historical event returns `already-committed`; a conflicting event returns `idempotency-conflict`. The transaction adapter still repeats its own idempotency check to close races between the service read and the final commit.

### Authoritative map reads

The service does not load the entire `subHexes` collection. It loads the region document used for inherited parent terrain and the individual subhex documents named by the normalized route. That is sufficient for the current authored-terrain resolver and avoids turning one travel command into a world-sized Firestore read.

The pure map geometry remains a trusted dependency supplied by the host (`ownerOf` plus the canonical miles-per-subhex scale). v1.2 does not duplicate map-engine geometry inside the service.

### Transitional Node command-runtime loader

The current pure command modules are classic browser scripts, not ESM. `runtime/command-runtime.mjs` loads the exact local `adnd-documents.js`, `adnd-world-clock.js`, `adnd-activities.js`, and `adnd-commands.js` sources once in Node and exposes their runtime objects to the trusted service.

This is a bridge, not a second rules implementation. A future dedicated ESM/server build target can replace the loader without changing the command-service contract.

## Current limitation: movement authority

Current character generation does not yet persist a canonical movement profile for every PC. The map's v0.9 Movement Rate field remains a **preview-only** value and is deliberately excluded from the Begin Travel command.

Until Actor movement is fully modeled, the trusted runtime may supply a `movementProfileResolver` from trusted data/GM policy. If no resolver is configured, the command executor still accepts explicit movement data already stored on the authoritative Actor. A client-entered preview Movement Rate is never accepted as authoritative input.

## Not included in v1.2

v1.2 still does not provide:

- an HTTP/network endpoint;
- Cloud Run/Firebase Functions deployment glue;
- a Begin Travel UI button;
- Firestore Security Rules for the new authoritative collections;
- multi-owner party consent/leadership policy;
- world-clock advancement;
- Activity completion/resolution;
- encounters, provisions, navigation, weather, crossings, or mounts;
- transaction fingerprints for authored map terrain or external movement-policy revisions.

The trusted service now connects intent → authoritative reads → pure command execution → atomic storage, while leaving transport and later gameplay systems outside this slice.
