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

- an HTTP/network endpoint (added in v1.3, see `docs/http-command-endpoint.md`);
- Cloud Run/Firebase Functions deployment glue (added in v1.4, `firebase-functions.mjs`);
- a Begin Travel UI button (added in map-view v1.6.0, below);
- Firestore Security Rules for the new authoritative collections;
- multi-owner party consent/leadership policy;
- world-clock advancement (added in v1.7.0 Resolve Travel, below);
- Activity completion/resolution (added in v1.7.0 Resolve Travel, below);
- encounters, provisions, navigation, weather, crossings, or mounts;
- transaction fingerprints for authored map terrain or external movement-policy revisions.

The trusted service now connects intent → authoritative reads → pure command execution → atomic storage, while leaving transport and later gameplay systems outside this slice.

## v1.6.0 Create Character command boundary

v1.6.0 adds the client-safe `createCharacter` command contract and a pure trusted
creation plan. It does **not** write Firestore, expose a new HTTP endpoint, or
change browser chargen yet.

The browser-side intent is restricted to player choices:

```js
{
  schemaVersion: 1,
  commandId: 'command-create-...',
  type: 'createCharacter',
  campaignId: 'campaign-1',
  generationMethod: 'III',
  raceId: 'elf',
  classId: 'magic-user',
  genderId: 'female',
  name: 'Val',
  alignment: 'neutral-good'
}
```

The command intentionally excludes authoritative or derived state including
`ownerUid`, character/document id, ability scores, random seeds/results, hit
points, gold, spells, rules version, runtime fields, and world placement.
Appended client claims are discarded during normalization.

### Narrow Method III gate

Only fixed-order generation Method III is accepted in v1.6.0. Methods I, II,
and IV remain on the existing browser chargen path until Graycloak has a
server-backed staged roll/assignment workflow. This prevents the new trusted
boundary from pretending that a one-shot command can preserve the player's
post-roll assignment choices for arrangeable methods.

This restriction is also a provenance guard: v1.6.0 does not yet persist a
character built from the still-partially-audited OSRIC chargen tables.

### Trusted creation plan

`executeCreateCharacterCommand()` requires trusted context for:

- the fresh campaign record and its current `worldTick`;
- the authenticated owner uid;
- a server-selected character document id;
- a trusted character builder;
- optional authoritative rules version and timestamps.

The trusted builder receives only normalized player choices. The executor then
overwrites identity, ownership, campaign, name/race/class/gender/method,
location, and runtime fields after the builder returns. New characters are
bound to the current world frontier but have `currentLocation: null`; entering
the world remains a later slice.

On success the executor returns:

- the authoritative Actor document;
- a `character.created` GameEvent;
- a semantic `creationPlan` with campaign, event-id, and character-id
  preconditions.

The existing v1.1 `applyCommitBundle()` adapter is Travel-specific and must not
be used with this creation plan. A later v1.6 slice will add an atomic
character-creation transaction and starting Item instances after the focused
OSRIC chargen provenance audit.

## map-view v1.6.0 Begin Travel submit

The world map's Travel Party panel now carries a **Begin Travel** button. It is
enabled only when the campaign has a `worldTick`, the route previews cleanly,
and the v1.5 intent builder accepts the selection. On click the browser:

1. mints one `commandId` / `activityId` pair for the attempt (kept across
   retries so the endpoint's idempotency check replays rather than duplicates;
   dropped when the route changes or the commit succeeds);
2. fetches the signed-in user's Firebase ID token;
3. `POST`s the client-safe intent to the same-origin
   `/api/commands/begin-travel` rewrite as `Authorization: Bearer <token>`;
4. renders the endpoint's public result (activity id, duration, arrival tick,
   or the service error code and stage), reloads `campaigns/{cid}` and the
   campaign's Actors, clears the route, and marks reserved Actors
   (`runtime.activityId` set) as travelling on the party marker.

Nothing authoritative is computed in the browser; every value shown comes back
from the endpoint. Actors still stay at the route origin until a later
resolve-travel command moves them and advances the clock.

## v1.7.0 Resolve Travel command boundary

Resolve Travel is the mirror of Begin Travel. The browser may ask for one
active Travel Activity to be resolved; everything that happens is recomputed
from trusted state.

### Client-safe intent

```js
{
  schemaVersion: 1,
  commandId: 'command-resolve-...',
  type: 'resolveTravel',
  campaignId: 'campaign-1',
  activityId: 'activity-travel-...',
  expectedWorldTick: 1200
}
```

Actor ids are deliberately absent: the Activity names its own party. Any other
field a client appends is dropped during normalization.

### Trusted execution (`executeResolveTravelCommand`)

Rechecks, in order: campaign identity and `expectedWorldTick` against the
frontier; the Activity exists, belongs to the campaign, is a Travel Activity,
and is `active`; its `availableAtTick` and `system.destination` are valid;
every Actor it names exists, is in the campaign, and is reserved by exactly
this Activity with the matching `availableAtTick`.

On success it returns a `resolveTravel` commit bundle:

- `updateActivity` — `status: completed`, `completedAtTick`;
- `patchActors` — each Actor's `currentLocation` becomes the Activity's
  destination and its `runtime` becomes `{ lastResolvedTick: T, availableAtTick: T, activityId: null }`;
- `updateCampaign` — `{ worldTick: T }` when the clock moved, else `null`;
- `createEvent` — a `travel.completed` GameEvent keyed by the command id;
- `preconditions` — campaign `worldTick`, Activity `status`/`availableAtTick`,
  and the Actor snapshots, all re-verified inside the transaction.

### v1 single-party clock policy

`T` is the Activity's arrival tick when that lies ahead of the campaign
`worldTick`, otherwise the current `worldTick`. In other words resolving a
journey pulls the one campaign clock forward to the moment of arrival. This is
the right behaviour while a campaign has one travelling party; once several
parties share a clock, advancing it becomes a GM or scheduler decision. The
service exposes `advanceClockOnResolve: false` for that future: with it off, a
resolve before the arrival tick is refused as `activity-not-active` with
`reason: 'not-yet-due'`.

### Storage and transport

`applyResolveBundle()` (firestore-transaction v1.2) commits the bundle
atomically with the same idempotency-marker pattern as Begin Travel.
`handleResolveTravel()` (command-service v1.3) reads the campaign, event marker
and Activity, authorizes the principal for every reserved Actor, executes, and
commits. `createResolveTravelHttpHandler()` (http-command-endpoint v1.4) binds
it at `POST /api/commands/resolve-travel`, deployed as the `resolveTravel`
function beside `beginTravel`. Public success fields add `destination`,
`resolvedTick`, `worldTick`, and `clockAdvanced`.

### map-view v1.7.0

The Travel Party panel lists every active journey (Actors sharing a
`runtime.activityId`) with its arrival tick and a **Resolve Travel** button.
The map mints one command id per Activity attempt, POSTs the intent, then
reloads the campaign and Actors so the party marker moves and the clock line
shows the new tick. The MR box is labelled in feet (OSRIC Movement Rate, 120
ft = 12") because the stored `movementRate` is what the outdoor travel table
divides by five.

Still outside this slice: encounter checks during travel, provisions, weather,
crossings, mounts, and multi-party clock arbitration.

## v1.8.0 Rest command boundary

Rest is the second clock mover and the first town action.

### Client-safe intent

```js
{
  schemaVersion: 1,
  commandId: 'command-rest-...',
  type: 'rest',
  campaignId: 'campaign-1',
  activityId: 'activity-rest-...',
  expectedWorldTick: 1200,
  actorIds: ['char-val', 'char-kris'],
  days: 3                      // integer 1–30
}
```

### Trusted execution (`executeRestCommand`)

Rechecks campaign identity and `expectedWorldTick`; every named Actor exists,
is in the campaign, and has time status `current` or `behind` (a reserved,
unbound, or ahead Actor is refused as `actor-not-available`). It then:

- advances the clock by `days × TICKS_PER_DAY` (single-party clock policy,
  as Resolve Travel);
- rebinds each Actor's `runtime` to the new tick with no reservation;
- on Actors carrying `hitPoints { current, maximum }`, restores
  `days × healPerDay`, capped at `maximum`. `healPerDay` comes from the host
  (`options.restHealPerDay` on the service) and defaults to 1 hp per day of
  rest. Actors without a `hitPoints` field are rebound but untouched;
- records a `rest` Activity already in `completed` status and a
  `rest.completed` GameEvent whose `data.restored` lists hp regained per
  Actor.

Not modelled yet, pending a ruling against the OSRIC text: the Constitution
bonus after a full week of rest and any long-rest acceleration. The host's
`restHealPerDay` is the hook; a per-Actor resolver can replace it later
without changing the intent.

### Storage and transport

`applyRestBundle()` (firestore-transaction v1.3) commits atomically with the
idempotency marker, campaign-tick and Actor-snapshot preconditions.
`handleRest()` (command-service v1.4) owner-authorizes each Actor.
`createRestHttpHandler()` (http-command-endpoint v1.5) binds it at
`POST /api/commands/rest`, deployed as the `rest` function. Public success
fields add `days` and `restored`.

### map-view v1.8.0

The Travel Party panel shows where the party is (the settlement it stands in,
linked to its card, or the bare cell), each available Actor's hp when stored,
and a Rest button with a 1–30 day input for every Actor that is current or
behind. On success it reloads the campaign and Actors, so the header date and
hp update.

## Calendar (v1.8.0)

`campaigns/{cid}.calendarEpoch = { year, month, day, hour }` (month by name,
festival weeks included) is the Greyhawk date at `worldTick` 0.
`adnd-calendar.js` derives date, weekday and time of day from any tick, and
the map header shows "Moonday, 3 Fireseek 576 CY · 02:00 · tick 26401". Without
an epoch the header falls back to the legacy `currentDate` text, then the bare
tick. `worldTick` remains the only authoritative time; the epoch is
presentation.

