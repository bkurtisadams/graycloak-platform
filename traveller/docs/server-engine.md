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
3. In `C:\graycloak-platform\graycloak-adnd\firebase.json`, `"functions"`
   is a list of two codebases. The Firebase CLI only deploys folders inside
   `graycloak-adnd\`, so the Traveller one deploys a built copy,
   `graycloak-adnd\traveller-functions\` (made by `deploy.bat`, ignored by
   git), and the AD&D codebase must not upload that copy:
   ```json
   "functions": [
     {
       "codebase": "default",
       "source": ".",
       "runtime": "nodejs22",
       "ignore": ["node_modules", ".git", "firebase-debug.log", "firebase-debug.*.log", "test", "docs", "traveller-functions"]
     },
     {
       "codebase": "traveller",
       "source": "traveller-functions",
       "runtime": "nodejs22",
       "ignore": ["node_modules", ".git", "firebase-debug.log", "firebase-debug.*.log"]
     }
   ],
   ```
4. Merge the v18 rule (`docs/firestore-rules-v18-requests.md`) into
   `graycloak-adnd\firestore.rules` and deploy it once:
   `cd C:\graycloak-platform\graycloak-adnd` then
   `firebase deploy --only firestore:rules`.
5. Build and deploy the function (every time):
   `C:\graycloak-platform\traveller\functions\deploy.bat`
6. Usage and billing → Service level spend caps → **Cloud Run Functions
   (Functions)** → set $5. At 100% the function pauses for the rest of the
   month.

Redeploy after any slice that changes `src\`, `world\` or the rules package:
the function runs the copy made at deploy time. `app\VERSION.json` in the
deployed copy names the client and rules versions; since v0.330.0 every
answer and every save by the function carries them (`engine`), and the
player's page shows a red line when they differ from its own version.

## Checking it works (v0.330.0)

1. Open the campaign on `play.html` as referee; Settings → Referee → The game.
2. Open it as a player (another account, from the lobby) and press a button
   in the left column, e.g. "Wait a day".
3. The line above the steps should change from "Sending…" to the game's
   answer within a few seconds, and the date should move on.
4. If it says "No answer from the game after 20 seconds": Firebase console →
   Functions → `travellerRequest` → Logs. No function listed means it was not
   deployed; no log line for the press means it is not listening where the
   database is (Region, below).

Not done: the Functions emulator. The pages always talk to the live project
(nothing in them switches to the emulators), so a local run would also need
that switch and a seeded copy of a campaign. With one tester and the $5
cap, the live project is the test bed.

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
