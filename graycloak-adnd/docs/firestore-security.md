# Graycloak AD&D Firestore Authority Rules (v10)

Graycloak AD&D and GCC share the Firebase project `graycloaks-campaign-corner`, so the canonical Firestore rules remain in:

`../gcc/firestore.rules`

`graycloak-adnd/firebase.json` points at that shared file. This avoids maintaining two competing rulesets for the same database.

## Authority boundary

The browser remains useful for authentication, map/world reads, chargen, GM-authored map editing through GCC, and non-authoritative UI. The trusted Firebase Functions/Admin runtime is responsible for MMO state transitions.

Firebase Admin/server SDKs bypass Firestore Security Rules. The deployed service must therefore be protected with IAM and the authenticated command boundary; Security Rules primarily prevent browser/client SDK bypasses.

## Campaign clock

Authenticated campaign owners may continue editing ordinary campaign metadata, but client updates cannot alter:

- `worldTick`
- `worldRevision`

Those are reserved for authoritative runtime writes.

## Character Actors

Existing `characters/{id}` documents remain readable to authenticated clients.

A browser-created character is accepted only when it:

- belongs to the authenticated owner;
- is an `actor` / `character` document;
- starts with `lastResolvedTick`, `availableAtTick`, and `activityId` all `null`;
- does not inject movement-authority fields.

After creation, no browser client (including GM clients) may change these authority fields:

- `id`
- `documentType`
- `type`
- `ownerUid`
- `campaignId`
- `currentLocation`
- `runtime`
- `movementRate`
- `movement`
- `movementProfile`
- `travelMovementProfile`

Trusted Admin writes may update them because server SDKs bypass Security Rules.

Player-side character deletion is also disabled. Campaign owners and GMs retain delete authority for now.

## Activities and events

Top-level `activities/{id}` and `events/{id}` are denied to client SDKs for both reads and writes. They are currently internal authoritative-runtime collections. Player-safe views can be added later as purpose-built projections rather than exposing the raw event ledger.

## Current limitation

Character creation itself is still performed in the browser. These rules prevent a new client-created Actor from arriving already active/reserved or injecting movement authority, but Firestore Rules cannot prove that ability scores, hit points, class choices, gold, and similar OSRIC results were honestly rolled by the client.

The eventual authoritative `CreateCharacter` command should remove that remaining trust gap.

## Validation before deployment

Run the repository tests first:

`npm test`

Then compile the rules with the Firestore emulator before production deployment. From `graycloak-adnd`:

`firebase emulators:start --only firestore`

Confirm that the emulator reports the rules loaded successfully, then stop it with Ctrl+C.

Do not deploy rules until the expected GCC and Graycloak browser workflows have been checked against the emulator or a non-production project.
