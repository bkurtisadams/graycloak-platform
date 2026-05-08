# adnd.graycloak.net — Week 1 Scaffold

Goal: prove the end-to-end pipe. DNS → hosting → auth → Firestore read/write.
No game logic yet. Success looks like opening adnd.graycloak.net in a browser,
signing in with Google, clicking "Run Test," and seeing green success output.

## Files

- `firebase.json` — hosting config with target `adnd`
- `.firebaserc` — project + hosting site mapping
- `public/index.html` — smoke test page
- `public/adnd-firebase-config.js` — Firebase config (paste values from GCC)
- `public/adnd-auth.js` — stripped-down version of gcc-auth.js
- `public/adnd-test.js` — Firestore write/read smoke test
- `public/adnd-style.css` — minimal readable styling

## Setup steps

### 1. Copy Firebase config values from GCC

Open GCC's `gcc-firebase-config.js`. Copy the six values
(apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)
into `public/adnd-firebase-config.js`.

Also edit `.firebaserc` and replace `PASTE_GCC_PROJECT_ID_HERE` (two places)
with your actual projectId.

### 2. Create the Firebase hosting site

In the Firebase console (console.firebase.google.com):
- Select the Graycloaks Campaign Corner project
- Hosting → Add another site
- Name it `adnd-graycloak` (matches the target in firebase.json)
- Firebase will give you a temporary URL like `adnd-graycloak.web.app`

### 3. First deploy (uses the .web.app URL — skip custom domain for now)

From this directory:

```
firebase login                    # if not already
firebase deploy --only hosting:adnd
```

Open the `.web.app` URL. You should see the smoke test page.

### 4. Add localhost to authorized domains (so local testing works too)

Firebase console → Authentication → Settings → Authorized domains.
Add `localhost` if not already present. Then you can open
`public/index.html` locally in a browser for testing.

### 5. Run the smoke test

Click "Sign in with Google." A popup opens, you sign in, the page updates
to show your uid. Click "Run Test." You should see green output ending with
"Write + read succeeded at {timestamp}".

### 6. If the test write fails with a permissions error

GCC's Firestore rules may or may not cover `users/{uid}/adnd_test/{docId}`.
If the test fails with a permissions message, open Firestore Rules in the
console and confirm something like this exists:

```
match /users/{uid}/{documents=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

If it's more restrictive, add a permissive rule for the test path.

### 7. Connect custom domain adnd.graycloak.net

In Firebase console:
- Hosting → the `adnd-graycloak` site → Add custom domain
- Enter `adnd.graycloak.net`
- Firebase shows you DNS records to add (one TXT for verification, two A records)

In Cloudflare DNS for graycloak.net:
- Add the TXT record Firebase gave you — set proxy status to "DNS only" (gray cloud)
- Wait a few minutes, click Verify in the Firebase console
- Once verified, Firebase shows two A records — add both to Cloudflare, also "DNS only"
- Firebase then provisions SSL (can take 5–60 minutes)

IMPORTANT: the records MUST be "DNS only" (gray cloud) during SSL provisioning,
not "Proxied" (orange cloud). You can flip to Proxied later if you want
Cloudflare's CDN/caching, but Firebase's own SSL handles HTTPS either way.

### 8. Done

Once SSL is live, adnd.graycloak.net loads the smoke test and Google sign-in
works the same as it does on graycloak.net — same user, same uid.

## What week 2 looks like

- Firestore schema for users, campaigns, characters, regional hexes, sub-hexes
- Authored starter region content (a few hexes of the Greyhawk Wars area)
- Campaign invite flow (reuse GCC's pattern)
- Begin hex map runtime work
