# The game as referee, on the server (v0.329.0)

With a campaign's referee set to **the game** (Settings), a seated player's
buttons on `seat.html` work with nobody's referee page open. A press writes a
request; the Cloud Function `travellerRequest` (`traveller/functions/`) runs
the same `play-session.js` the referee's page runs, saves the campaign at the
next revision, publishes what players see, and answers on the request.

With a person refereeing, the seat page shows the situation without buttons
(the referee's approval is a later slice).

## What a player may ask

`src/player-requests.js` `playerMayRun`: the trip (port business, course,
depart, jump, arrival choices), speculation, crew and shipyard repairs, the
shipyard, looking for patrons, taking or turning down a job, carrying out a
job, serving jail time, resting, and the abbreviated ship fight's orders.
Never the referee's tools, the clock, re-charting, editing, or fights on the
band board.

## One-time setup (Command Prompt)

1. Firebase CLI, if not installed: `npm install -g firebase-tools`, then
   `firebase login`.
2. The function's packages:
   ```
   cd C:\graycloak-platform\traveller\functions
   npm install
   npm run check
   ```
   `check` copies the game into `functions\app` and loads it under Node.
3. In the `firebase.json` that deploys `gcc/firestore.rules`, add (the
   `source` path is relative to that `firebase.json`):
   ```json
   "functions": [
     {
       "source": "../traveller/functions",
       "codebase": "traveller",
       "predeploy": ["node \"$RESOURCE_DIR/scripts/copy-app.mjs\"", "node \"$RESOURCE_DIR/scripts/check.mjs\""],
       "ignore": ["node_modules", ".git", "*.log"]
     }
   ]
   ```
4. Merge the v18 rule (`docs/firestore-rules-v18-requests.md`).
5. Deploy, from the folder holding that `firebase.json`:
   ```
   firebase deploy --only functions:traveller,firestore:rules
   ```
6. Usage and billing → Service level spend caps → **Cloud Run Functions
   (Functions)** → set $5. At 100% the function pauses for the rest of the
   month.

Redeploy after any slice that changes `src\`, `world\` or the rules package:
the function runs the copy made at deploy time. `app\VERSION.json` in the
deployed copy names the client and rules versions.

## Region

`functions/index.js` sets `us-central1`, which matches a Firestore database
in `nam5` (US multi-region) or `us-central1`. If the database is elsewhere,
set the region to its location before deploying.

## Safety

- The function fires only when a request document is **created** and only
  updates that document; it never creates one, so it cannot trigger itself.
- `maxInstances: 2`, 60 s timeout, no retries.
- A request whose save meets a newer revision is carried out once more from
  the newer campaign, then refused.
- A referee page open during a player's request sees the new revision and
  asks to reload.
