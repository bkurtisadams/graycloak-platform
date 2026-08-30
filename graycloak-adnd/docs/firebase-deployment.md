# Graycloak AD&D — Firebase command deployment (v1.4)

v1.4 turns the deployment-neutral command stack from v1.0–v1.3 into one real
Firebase Functions v2 endpoint while keeping authority on the server.

## Deployed path

Firebase Hosting rewrites:

`/api/commands/begin-travel`

into the 2nd-generation HTTPS function:

`beginTravel`

The SPA catch-all rewrite remains after the API rewrite, so the API path is not
mistaken for `index.html`.

## Runtime

The function uses Node.js 22. This matches the current supported Firebase
Functions runtime and the Firebase Admin 14.x requirement.

The function package is `graycloak-adnd` itself (`functions.source = "."`).
That is deliberate: the trusted runtime needs the command sources under
`runtime/` plus the generated browser/map artifacts under `public/`.

`test/` and `docs/` are excluded from the Functions upload.

## Composition

`firebase-functions.mjs` initializes the default Admin app and injects:

- Admin Firestore into `createCommandService()`;
- Admin Auth into the v1.3 endpoint adapter;
- `ownerOf()` and the canonical 3-mile subhex scale from
  `public/vendor/map-engine/index.js`.

The deployed HTTP function is infrastructure-public so Firebase Hosting can
invoke it. This does **not** make the Graycloak command public: the v1.3 handler
still requires a Firebase ID token and verifies it with
`verifyIdToken(token, true)` before the command service sees a principal.

CORS is disabled because the intended browser route is same-origin through
Firebase Hosting.

## Install dependencies

From the repository root:

```text
pnpm install
```

This version intentionally adds `firebase-admin` and `firebase-functions` to
`graycloak-adnd/package.json`, so `pnpm-lock.yaml` is expected to change and
should be committed with v1.4.

## Emulator

From `C:\graycloak-platform\graycloak-adnd`:

```text
firebase emulators:start --only functions,hosting,firestore
```

Then send requests through the Hosting origin, not directly to a browser-side
Firestore write path.

## Deploy

Cloud Functions deployment requires the Firebase project to be on a billing
plan that supports Functions deployment.

From `C:\graycloak-platform\graycloak-adnd`:

```text
firebase deploy --only functions,hosting:adnd
```

The Hosting rewrite uses `pinTag: true`, so Hosting releases remain tied to the
function revision they were deployed with.

## Current security boundary

v1.4 makes the server path deployable, but it does not by itself remove any
legacy Firestore write permissions that may still exist for browser clients.
Before exposing a real **Begin Travel** button, authoritative collections and
fields should be locked down in Firestore Security Rules so the browser cannot
bypass this endpoint by writing equivalent state directly.
