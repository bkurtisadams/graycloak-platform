# graycloak-adnd — Week 2: Schema Design

*v3 — 2026-05-11, all decisions locked.*
*Consolidated from chats c956f109 (Apr 21), b50a5ce1 (Apr 22), 13612c42
(Apr 30), eb640c29 (Mar 27), grounded against gcc-data.js v1.2.0,
gcc-invite.js v1.0.0, gcc-subhex-data.js v2.9.0, firestore.rules v3,
seed-region-flanaess.js, seed-landmarks.js, adnd-dmg-tools
henchman-generator.js v1.2.0.*

---

## 1. Context

**graycloak-adnd** is the Firebase-hosted player runtime for the AD&D 1e
Greyhawk world that GCC authors. Working domain: `adnd.graycloak.net`.
Targeted at ~20–100 concurrent players. Session-based / persistent-world
hybrid: world ticks between sessions; structured combat fires during
sessions.

**Architecture: GCC = workshop, graycloak-adnd = stage.**

```
┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│ GCC (graycloak.net)  │      │  Shared Firestore    │      │ graycloak-adnd       │
│  GM authoring        │ ───▶ │  (project:           │ ◀─── │  (adnd.graycloak.net)│
│  • hex editor        │      │   graycloaks-        │      │  Player runtime      │
│  • terrain paint     │      │   campaign-corner)   │      │  • map + fog of war  │
│  • landmarks         │      │  • regions/          │      │  • party position    │
│  • settlements       │      │  • landmarks/        │      │  • encounters        │
│  • subhex editor     │      │  • subHexes/         │      │  • combat            │
│  • character sheets  │      │  • campaigns/        │      │  • chat              │
│  GMs only            │      │  • invites/          │      │  Players only        │
└──────────────────────┘      │  • users/            │      └──────────────────────┘
                              │  • lakes/ (planned)  │
                              │  • entities/ (Wk 2+) │
                              │  • worldClock/ (Wk2+)│
                              └──────────────────────┘
```

**Shared monorepo**: `graycloak-platform` (pnpm workspaces). Branches:
- `gcc/` — authoring surface, where Firestore writes originate
- `graycloak-adnd/` — player runtime, Week 1 scaffold
- `packages/map-engine/` — TypeScript shared library, bootstrapped but empty
- `editor/` — separate sub-package, scope TBD

**graycloak-adnd is NOT ammog.** ammog is a separate Node/WebSocket/SQLite
AD&D experiment, parked.

---

## 2. Current state — grounded

### 2.1 Firestore: what exists today

| Collection | Doc ID format | Source of writes | Status |
|---|---|---|---|
| `regions/{regionId}` | `flanaess` | `scripts/seed-region-flanaess.js` (admin) | Live. Packed doc with `hexes` map keyed `col-row`. |
| `landmarks/{hexId}` | `D4-86` etc. | `scripts/seed-landmarks.js` (admin) | Live. One doc per hex landmark. |
| `campaigns/{campaignId}` | `camp-<ms>` | `gcc-invite.js` `pushSharedData()` (GM) | Live. SHARED_FIELDS projection. |
| `campaigns/{cid}/players/{uid}` | player uid | invite join flow | Live. |
| `campaigns/{cid}/rolls/{rollId}` | autogen | dice roller | Live. |
| `invites/{code}` | 6-char alnum | GM `createInvite()` | Live. |
| `users/{uid}/data/{document}` | varies | `gcc-sync.js` | Live. User-private sync. |
| `users/{uid}/lists/{listKey}/items/{itemId}` | char/veh IDs | `gcc-sync.js` | Live. Per-entity docs. |
| `subHexes/{docId}` | `subhex_{Q}_{R}` (planned) | **No writes today** | Rule exists (write-deny), no code writes. **This is the gap.** |
| `lakes/{lakeId}` | `lake_{slug}` (planned) | **No writes today** | Not even a rule yet. |
| `entities/{entityId}` | TBD | **No writes today** | Greenfield. |
| `settlements/{settlementId}` | TBD | **No writes today** | Greenfield. |
| `worldClock/current` | `current` (singleton) | **No writes today** | Greenfield. |

### 2.2 Subhex data — IndexedDB-local today

Per `gcc-subhex-data.js` v2.8.x: subhex overrides, regions (local
overlay sense), lakes, and fog all persist to **IndexedDB** via
`gcc-subhex-store.js`, not Firestore. The IDB key conventions:

```js
subhexId(Q, R)       → `subhex_${Q}_${R}`
regionDocId(localId) → `region_${localId}`   // local overlay, not Flanaess seed
lakeDocId(localId)   → `lake_${localId}`
```

The `firestore.rules` comment on line 61 referencing
`{parentDarleneId}__{q}_{r}` is **stale** — that format was abandoned
in chat 13612c42 when the geometry was corrected. Subhexes don't tile
cleanly inside a single parent; they tile globally and parents cut
some cells along their edges. Current code uses **global axial only**.

### 2.3 Security rules — `firestore.rules` v3

Currently deployed:
- `users/{uid}/...` — owner-only read/write; items readable by any authed user
- `invites/{code}` — any authed can read/create; owner can update/delete
- `campaigns/{cid}` — any authed reads; owner writes (with `!('ownerUid' in resource.data)` fallback for legacy docs)
- `campaigns/{cid}/players/{playerId}` — self-add or GM-add
- `campaigns/{cid}/rolls/{rollId}` — authed create with `uid == auth.uid`, anyone deletes
- `subHexes/{docId}` — any authed reads, **all writes denied**
- Everything else — denied

No rules yet for `regions`, `landmarks`, `lakes`, `entities`,
`settlements`, `worldClock`. Reads/writes to those go through the
`match /{document=**}` deny-all catchall — including the seed-script
reads from authenticated browsers, which is why the seed scripts run
under a service-account key (`GOOGLE_APPLICATION_CREDENTIALS`).

### 2.4 graycloak-adnd Week 1 baseline

Shipped in `graycloak-adnd/public/`:
- `index.html`
- `adnd-firebase-config.js v1.0.0` — same Firebase project as GCC
- `adnd-auth.js v1.0.0` — Google sign-in only (~95 lines)
- `adnd-test.js v1.0.0` — Firestore round-trip smoke test
- `adnd-style.css`

Plus `firebase.json`, `.firebaserc`, `package.json`, `README.md`. Live at
`adnd-graycloak.web.app`. Sign-in ✓. Firestore round-trip ✓.

---

## 3. Week 2 scope

Two threads run in parallel:

### 3.1 Firestore — fill the gaps

1. **`firestore.rules` v4** — add rules for `regions`, `landmarks`,
   `lakes`, `subHexes` (open writes to GM only), `entities`,
   `settlements`, `worldClock`
2. **Subhex Firestore sync** — first write path for subhex data. Two
   shapes possible: (a) IDB stays canonical, GM clicks "Publish to
   Firestore" to flush, or (b) Firestore becomes canonical with IDB
   as cache. (See §9 Q1.)
3. **Add world-clock plumbing** — campaign doc gains `currentDate`
   field, OR new `worldClock/{campaignId}` collection. (See §9 Q2.)
4. **Entity / settlement / lake doc shapes** — concrete designs for the
   greenfield collections
5. **Hand-author a starter region** — one Darlene hex worth of authored
   subhexes + a settlement + 3–5 landmarks

### 3.2 packages/map-engine — start the shared library

Currently `src/index.ts` is empty. First targets:
- Port `subhexSvgCenter(Q, R)`, `axialRound`, `svgToAxial`,
  `ownerOf(Q, R)`, `cellsInAxialBbox` from `gcc-subhex-data.js`
- Port `HEX_R`, `SUB_R`, terrain constants
- Stop there for Week 2; rendering layer is Week 3+ port

Output of Week 2: this doc finalized + `firestore.rules` v4 deployed +
seed JSON + map-engine v0.1.0 with coord helpers.

---

## 4. Firestore schema — grounded

### 4.1 campaigns/{campaignId}

Already exists, written by `gcc-invite.js` `pushSharedData()`. The
`SHARED_FIELDS` array IS the schema graycloak-adnd reads:

```jsonc
{
  // Auto-added by pushSharedData
  "_updated": "<ISO>",
  "ownerUid": "<GM uid>",

  // From SHARED_FIELDS (gcc-invite.js line 196)
  "name": "Greyhawk Wars",
  "system": "add1e",            // "add1e" | "faserip" | "mp"
  "status": "active",
  "gm": "Graycloak",
  "gmTitle": "DM",
  "world": "Greyhawk",
  "genre": "high fantasy",
  "pitch": "...",
  "description": "...",
  "schedule": "biweekly Sundays",
  "playMode": "online",
  "vttLabel": "Foundry",
  "vttUrl": "...",
  "nextSession": "<ISO>",
  "startDate": "<ISO>",
  "xpMethod": "milestone",
  "rulebooks": "...",
  "houseRules": "...",
  "sharedNotes": "player-visible notes",
  "sessions": [<session>, ...],
  "lore": [<lore>, ...],
  "campaignImage": "<url>",
  "hqImage": "<url>",
  "hqNotes": "...",
  "characters": [<character>, ...],
  "promotedPlayers": { "<uid>": true },
  "teamName": "The Vigilants"

  // NOT pushed — GM-private, excluded by pushSharedData
  // "notes"
}
```

**Local-only fields** in `gcc-data.js` `addCampaign` that DON'T sync:
`id`, `schemaVersion`, `players` (count), `session` (count),
`lastPlayed`, `pinned`, `vttPlatform`, `notes`, `rules`, `created`.

**graycloak-adnd needs**: `currentDate`, world clock pointer. Neither
exists today. See §9 Q2.

**`rules: {}` map** lives only in local GCC data. graycloak-adnd needs
this at runtime (e.g., to know if NWP / segmented initiative are on).
Either lift into SHARED_FIELDS, or use a parallel
`campaigns/{cid}/runtime/rules` doc.

### 4.2 characters — two-layer model

The existing pattern in `gcc-invite.js` solves the
GM-authored-vs-player-owned split:

**Layer 1 — full character data** (per-system, owner-local):
- Path: `users/{uid}/lists/{listKey}/items/{charId}`
  where `listKey ∈ {gcc-add1e-chars, gcc-faserip-chars, mp-char-list, ...}`
- Full sheet; visible only to owner (plus authed reads per existing rules)

**Layer 2 — character snapshot** (campaign-shared projection):
- Embedded in `campaigns/{cid}.characters[]` array (already done), OR
- Per-player at `campaigns/{cid}/players/{uid}.charSnapshot`
- Built by `buildCharSnapshot(savedChar, systemId)` in `gcc-invite.js`
- Per-system. add1e:

```jsonc
{
  "_id": "adnd_<ms>_<n>",
  "characterName": "Kris of the Northwind",
  "player": "Alex",
  "characterClass": "Ranger",
  "level": 7,
  "race": "Human",
  "str": 17, "strPct": 0,
  "int": 13, "wis": 14, "dex": 16, "con": 15, "cha": 12,
  "ac": 4,
  "hpCurrent": 48, "hpMax": 54,
  "xpTotal": 35000,
  "characterType": "pc",        // pc | npc | henchman | hireling
  "portrait": "<base64 or url>"
}
```

The fallback resolver `getPlayerCharacterWithFallback()` (already
implemented) tries Layer 1 first, falls back to Layer 2 snapshot.
graycloak-adnd uses the same pattern.

**For runtime, Layer 2 needs**: `currentLocation` (regionalHexId +
subHexCoord), `mounts[]` (entity refs). See §4.7.

### 4.3 regions/{regionId}

Already exists. Written by `scripts/seed-region-flanaess.js`. Packed
doc — all hexes in one document under Firestore's 40k indexed-field-paths
limit:

```jsonc
{
  "name": "Flanaess",
  "scale": 30,                  // miles per parent hex
  "cols": <n>,
  "rows": <n>,
  "keyFormat": "col-row",
  "hexCount": <n>,
  "hexes": {
    "64-44": "plains",
    "65-44": "forest",
    "63-44": "river",
    // ...
  },
  "updatedAt": <Timestamp>
}
```

For graycloak-adnd: base terrain layer, GM-authored, read-only to
players. Per-hex overrides layer on top via other collections.

### 4.4 landmarks/{hexId}

Already exists. Written by `scripts/seed-landmarks.js`. One doc per
hex with a landmark:

```jsonc
{
  "hexId": "D4-86",
  // ...spread from gcc-landmarks.js GH_LANDMARKS[hexId]
}
```

**Action**: audit `gcc-landmarks.js` GH_LANDMARKS to document the
actual fields here. The seed script just spreads `data`.

### 4.5 subHexes/{docId}

**Doc ID format**: `subhex_{Q}_{R}` (matches `gcc-subhex-data.js`
`subhexId()`). Global axial coords; no parent prefix; Q and R can be
negative.

Today's IDB shape (post-migration to Firestore would carry through):

```jsonc
{
  "Q": -65, "R": -25,
  "owner": { "col": 63, "row": 44 },   // parent that owns this cell
  "terrain": "forest",                  // override of inherited parent terrain
  "name": "Whisperwood Verge",
  "notes": "GM-only notes",
  "playerNotes": "player-visible flavor",
  "feature": {                          // optional feature on this cell
    "kind": "bridge",                   // bridge | ford | crossroads | ferry | ...
    "name": "Old Stone Bridge",
    "notes": "..."
  },
  "paths": {                            // embedded — decision #3
    "rivers": [{ "name": "Selintan", "entry": 1, "exit": 4, "tier": "river" }],
    "roads":  [{ "name": "Great Western", "kind": "road", "entry": 1, "exit": 4 }],
    "crossings": []
  },
  "source": "manual",                   // manual | scanner | seed
  "schemaVersion": 3,
  "_updated": "<ISO>"
}
```

Path data — rivers/roads/crossings — was previously split into a
separate store via `gcc-subhex-paths.js` v2.1.0. Embedding under
`paths` is the decision; the path layer will need an adapter to flush
out of its separate store into the embed when subhex docs are written.

**Rule update for Week 2** — open subhex writes to GM:
```
match /subHexes/{docId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && isGM();   // see §9 Q6
}
```

### 4.6 lakes/{lakeId}, mapRegions/{slug} — greenfield

Subhex data layer already manages these locally:
- `lakeDocId(localId)` → `lake_${slug}`
- `regionDocId(localId)` → `region_${slug}` — local overlay regions

**Decision #4**: rename Firestore collection for the subhex-layer
overlays to `mapRegions/{slug}` to disambiguate from the Flanaess
base-terrain `regions/flanaess` doc. IDB key stays `region_${slug}` in
GCC for back-compat; the sync layer renames on write.

Firestore counterparts (TBD shape):
```
lakes/{lake_slug}
{
  "name": "Lake Glasspool",
  "subhexes": [{Q,R}, ...],            // cells the lake covers
  "type": "lake",                       // lake | sea | inlet
  "drainageMouth": {Q,R},
  "_updated": "<ISO>"
}

mapRegions/{slug}
{
  "name": "Whisperwood",
  "kind": "forest",                     // forest | swamp | range | ...
  "subhexes": [{Q,R}, ...],
  "displayColor": "#3a6b2e",
  "_updated": "<ISO>"
}
```

### 4.7 entities/{entityId} — greenfield (animals, NPCs, mounts)

Decision from c956f109 audit: animals are entities, not gear (they
take damage, have morale).

```jsonc
{
  "id": "ent_<ms>",
  "type": "animal",            // animal | npc | hireling | henchman | mount | familiar
  "subType": "warhorse",
  "name": "Brego",
  "ownerUid": "<player or GM uid>",   // REQUIRED — gates rule writes (v4 rules)
  "ownerCharId": "<charId> | null",   // game-level owner; may differ from ownerUid for NPC mounts
  "campaignId": "<cid>",              // REQUIRED — gates rule writes (v4 rules)
  "hp": { "current": 30, "max": 30 },
  "ac": 7,
  "attacks": [{ "name": "hoof", "damage": "1d6", "count": 2 }],
  "morale": 8,
  "load": { "carried": 120, "max": 250 },
  "currentLocation": {
    "regionalHexId": "D4-86",
    "subHexCoord": [-65, -25]
  },
  "classFeatureSlot": null,    // "druidCompanion" | "paladinMount" | null
  "_updated": "<ISO>"
}
```

`ownerUid` and `ownerCharId` can differ: an NPC mount may be "owned"
(game-fiction) by an NPC character but `ownerUid` is the GM's user id
(permission-level). For PC mounts they typically match.

**MVP animal scope**: purchased mounts + pack animals + war/guard dogs.
**Post-MVP**: class-feature animals.

**Mounted combat MVP** (simplified): combat participants gain
`mountedOn: <entityId> | null`. Full RAW is v2.

### 4.8 settlements/{settlementId} — greenfield

```jsonc
{
  "id": "set_dyvers",
  "name": "Dyvers",
  "size": "city",
  "population": 30000,
  "alignment": "CN",
  "regionalHexId": "D4-86",
  "subHexCoord": [-64, -25],
  "ruler": "...",
  "services": ["temple", "magicShop", "alchemist", "scribe"],
  "animalMarkets": {
    "available": ["warhorse", "draftHorse", "mule", "warDog", "pony"],
    "priceMod": 1.0
  },
  "notes": "..."
}
```

### 4.9 worldClock — per-campaign field (decision #2)

`campaigns/{cid}.currentDate` — different campaigns tick independently
(Greyhawk Wars at 569 CY, future Earth-676 AD&D campaign at its own
date).

```jsonc
// campaigns/{cid}.currentDate
{
  "year": 569,
  "month": 7,                   // 1-12 (Greyhawk: Fireseek = 1, ...)
  "day": 11,
  "segment": 0,                 // 0-59 (AD&D 1e turn segment)
  "calendar": "greyhawk"
}
```

Lift into `SHARED_FIELDS` so it pushes to Firestore. The GM updates
this via the existing CTT calendar UI (which already exists per memory)
and `pushSharedData` mirrors it.

---

## 5. Security rules — proposed v4 (diff vs v3)

```
// NEW
match /regions/{regionId} {
  allow read: if request.auth != null;
  allow write: if false;        // admin script only via service account
}

match /landmarks/{hexId} {
  allow read: if request.auth != null;
  allow write: if false;        // admin script only
}

match /lakes/{lakeId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;   // tighten with isGM() in Week 3
}

// CHANGED
match /subHexes/{docId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;   // tighten with isGM()
}

// NEW
match /entities/{entityId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;   // tighten with owner-or-GM rule
}

match /settlements/{settlementId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;   // tighten with isGM()
}
```

**GM detection at rules layer** (decision #6) — use **`gms/{uid}`** docs.
A doc at `gms/<uid>` means that user has GM rights cross-campaign.
Rules use `exists(/databases/$(database)/documents/gms/$(request.auth.uid))`
to check. Seeded by an admin script for now; later a self-promote
mechanism if needed. For campaign-scoped writes (entities owned by a
character in a specific campaign), keep the per-campaign owner check
that already exists.

Helper to define inside rules (rules_version = '2' supports functions):

```
function isGM() {
  return request.auth != null
    && exists(/databases/$(database)/documents/gms/$(request.auth.uid));
}

function isCampaignOwner(cid) {
  return request.auth != null
    && get(/databases/$(database)/documents/campaigns/$(cid)).data.ownerUid
       == request.auth.uid;
}
```

Then writes to `lakes`, `subHexes`, `mapRegions`, `settlements` gate on
`isGM()`. Writes to `entities` gate on either entity-owner or
`isCampaignOwner(resource.data.campaignId)`.

---

## 6. Starter region

Pick **D4-86** (col 64, row 44). Already has authored subhex data from
#15 work this session: Selintan river, Great Western road, River road
all exit edge 4 (SW). Concretely:

- `regions/flanaess` (already seeded)
- `landmarks/D4-86` (if a landmark exists)
- ~10–20 `subHexes/subhex_{Q}_{R}` docs around (64, 44) — flush from IDB
- 1 `settlements/<id>` (TBD which closest authored settlement)
- `campaigns/<cid>.currentDate` set to current Greyhawk date (Fireseek
  X, 569 CY)

Goal: prove the read pipeline end-to-end. Player logs in to
`adnd.graycloak.net`, sees one Darlene hex of subhexes with authored
terrain, paths, and a settlement marker. Nothing interactive.

---

## 7. Port roadmap

In dependency order, from the b50a5ce1 audit. Hours are audit priors,
not commitments. New: target the port code into `packages/map-engine`
or new packages (`@graycloak/weather`, `@graycloak/encounters`, etc.)
for non-map concerns.

| # | Module | Hours | Target package | Notes |
|---|---|---|---|---|
| 1 | gcWeather | 18–24 | `@graycloak/weather` (new) | Strip Foundry hooks, ESM. |
| 2 | greyhawk-encounters-v2 | ~20 | `@graycloak/encounters` (new) | Tables-only port. |
| 3 | DMG Construction wilderness gen | ~35 | `@graycloak/map-engine` | Already Roll20-grid-aware. |
| 4 | adnd-treasure + map hook | ~25 | `@graycloak/treasure` (new) | Depends on #2, #3. |
| 5 | Henchman/hireling (`adnd-dmg-tools`) | ~25–35 | `@graycloak/henchmen` (new) | Foundry module. Port `generateHenchman`/`generateSpecialist`/`generateMenAtArms` + henchman-tables.js + race-class-tables.js + npc-generator.js. Strip Foundry adapter (`ChatMessage`, `Hooks`, `renderTemplate`). |
| 6 | AMMOG combat engine | ~100 ±40 | `@graycloak/combat` (new) | Biggest single port. |
| 7 | Stronghold builder | Audit only | TBD | MVP-vs-v2 deferred. |
| 8 | DMG Construction dungeon gen | v2+ | `@graycloak/dungeon` (new) | Post-MVP. |

**New code (not ports), per c956f109:**
- Node game server OR Firebase Functions (serverless tradeoff TBD)
- WebSocket layer OR Firestore listeners for live combat
- Hex map UI runtime — built on `@graycloak/map-engine`
- Chat console (4 channels) — Firestore-backed
- GM referee console
- Activity state machine
- Standing order execution engine
- Messaging / courier system

Audit estimate: **port 250–400h + new code 200–350h ≈ 9–15 month MVP**.

---

## 8. MVP scope — in / out

**In:**
- Single Greyhawk campaign at seed scale (one Darlene hex region)
- Player login, character viewing, party position viewing
- World clock advancing
- Daily weather + visibility/travel-speed effects
- Encounter rolls (regional tables)
- Combat (simplified mounted; full segment init / THAC0 / weapon vs AC / thief skills / spells L1–3)
- Treasure (DMG-accurate)
- Purchased mounts + pack animals + war/guard dogs
- Hex-scale travel; subhex-scale awareness (LOS, fog)
- Chat console (4 channels)
- GM referee console
- Auth + per-campaign invite codes (already in GCC, port to player runtime)

**Out (post-MVP):**
- Class-feature animals (druid companion, paladin warhorse, familiar, ranger followers)
- Full RAW mounted combat (charge, lance, dismount, horse-bolt morale)
- Strongholds (audit only)
- Dungeon mode
- Spells L4+
- Naval encounters
- Cross-region travel content

---

## 9. Locked decisions

Resolved 2026-05-11.

1. **Subhex canonicality** — **IDB-canonical, periodic flush to
   Firestore via "Publish" action.** Matches the GM workflow ("I'm done
   authoring this region; push to players"). Avoids per-keystroke
   Firestore writes during paint sessions. Implementation: a "Publish
   subhexes" button somewhere in the GCC UI that batch-writes dirty
   IDB entries to `subHexes/{subhex_Q_R}`.

2. **World clock placement** — **per-campaign field**
   (`campaigns/{cid}.currentDate`). See §4.9.

3. **Path data location** — **embed under `subHexes/{id}.paths`**. See
   §4.5.

4. **Naming collision: `regions/`** — **rename subhex-layer overlays to
   `mapRegions/{slug}`** in Firestore. IDB keeps `region_${slug}` for
   back-compat; sync layer renames on write. See §4.6.

5. **Henchman/hireling module** — confirmed: `adnd-dmg-tools`. Port
   surface documented in §7 row 5. Henchman/hireling/men-at-arms
   generators all ride on `npc-generator.js`; that's a transitive port
   dependency.

6. **GM role detection at rules layer** — **`gms/{uid}` docs**. See §5
   for the `isGM()` helper. For campaign-scoped writes, additionally
   check `isCampaignOwner(cid)`.

7. **Schema versioning** — **explicit `schemaVersion` on every
   top-level doc**, with a centralized migrations registry in
   `@graycloak/migrations` (new package). Adopt incrementally — v1 is
   the baseline as docs are seeded.

8. **`packages/map-engine` build target** — TypeScript + ESM, with an
   `exports` map for CJS compatibility if Node tooling later requires
   it. Browser consumers (GCC) load via direct ESM import; Node
   consumers (game server, seed scripts) load via the `exports` map.

---

## 10. What "Week 2 done" looks like

- This doc reviewed and §9 decisions locked
- `firestore.rules` v4 written and deployed
- First subhex Firestore write path (admin "Publish" action OR direct GM sync)
- `seed/D4-86/` folder with subhex JSON, settlement JSON, currentDate
- `packages/map-engine` v0.1.0 with `subhexSvgCenter`, `axialRound`,
  `svgToAxial`, `ownerOf`, `cellsInAxialBbox`, constants
- A minimal read-test in graycloak-adnd that fetches and renders the
  seed region

Week 3 picks up gcWeather port (item #1 in the roadmap).
