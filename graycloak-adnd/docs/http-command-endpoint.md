# Graycloak authenticated command endpoint — v1.3

## Purpose

v1.3 adds the first HTTP transport boundary above the trusted v1.2 command service.
It deliberately does **not** choose or require Firebase Functions, Cloud Run,
Express, or another hosting framework. The exported handler uses the ordinary
Node/Express-style `(req, res)` contract and receives authentication and command
service implementations by dependency injection.

The trust path is now:

```text
browser
  |
  | HTTPS POST + Firebase ID token
  v
HTTP endpoint (v1.3)
  |  verifies token
  |  parses/limits JSON
  |  creates principal
  v
trusted command service (v1.2)
  |
  |  reloads campaign, Actors, terrain, movement
  |  executes Begin Travel rules
  v
Firestore transaction adapter (v1.1)
```

The endpoint does not accept a browser-computed travel result. Its JSON body is
only the existing client-safe Begin Travel intent.

## HTTP contract

Recommended path:

```text
POST /api/commands/begin-travel
```

Required headers:

```text
Authorization: Bearer <Firebase ID token>
Content-Type: application/json
```

The body may be the Begin Travel intent directly:

```json
{
  "type": "beginTravel",
  "commandId": "command-travel-1",
  "campaignId": "campaign-1",
  "activityId": "activity-travel-1",
  "expectedWorldTick": 1200,
  "actorIds": ["char-val", "char-kris"],
  "routeCells": [
    { "Q": 10, "R": 20 },
    { "Q": 11, "R": 20 }
  ]
}
```

or wrapped as `{ "command": { ... } }`. The wrapper is useful if the HTTP API
later carries additional request metadata, but the trusted command itself stays
unchanged.

The default maximum body size is 64 KiB. Route commands should be far smaller.

## Authentication

`createBeginTravelHttpHandler()` requires a trusted `verifyIdToken` function.
For Firebase Admin, the deployment wrapper should use the Admin SDK's ID-token
verification, preferably with revocation checking:

```js
const verifyIdToken = (token) => getAuth().verifyIdToken(token, true);
```

The endpoint takes the verified `uid` from the decoded token and creates the
principal passed to v1.2. It never trusts a UID supplied in the JSON body.

The raw bearer token is never passed to the command service and should never be
logged.

## Stable HTTP statuses

The transport translates command/service results into normal HTTP classes:

- `200` — committed or idempotent replay
- `400` — malformed/invalid command
- `401` — missing or invalid authentication
- `403` — authenticated user may not control an Actor
- `404` — requested authoritative campaign/Actor/region does not exist
- `409` — current authoritative state conflicts with the command (stale clock,
  changed Actor state, duplicate command identity, etc.)
- `413` — payload exceeds the endpoint limit
- `415` — body is not JSON
- `500` — trusted runtime/storage/configuration failure

5xx responses deliberately omit internal exception messages and arbitrary
service fields.

## Same-origin deployment

The intended browser deployment is same-origin. Firebase Hosting can eventually
rewrite `/api/commands/begin-travel` to a trusted Cloud Function or Cloud Run
service. Because the browser calls its own site origin, the Graycloak endpoint
itself does not need to enable broad CORS access.

A deployment wrapper is responsible for:

1. initializing Firebase Admin on the trusted host;
2. creating the Firestore-backed v1.2 command service;
3. providing canonical `ownerOf` / map scale dependencies;
4. supplying any authoritative movement resolver;
5. injecting `getAuth().verifyIdToken(...)` into this endpoint;
6. exporting/registering the resulting HTTP handler.

Those deployment-specific dependencies are intentionally outside v1.3. This
keeps the repository lockfile unchanged and lets deployment choice remain a
small adapter rather than contaminating the game/rules layers.

## Security properties

v1.3 guarantees the HTTP boundary itself:

- POST only;
- JSON only;
- bounded request bodies;
- Firebase-style bearer identity must verify before command execution;
- UID comes from the verified token, never request JSON;
- no browser-computed travel outcome becomes authoritative;
- service exception details are not reflected in 5xx responses;
- successful idempotent retries remain successful HTTP responses;
- response bodies expose a small allow-listed result shape.

v1.3 does **not** make a browser process authoritative. The handler belongs on a
trusted server/runtime together with v1.2 and v1.1.
