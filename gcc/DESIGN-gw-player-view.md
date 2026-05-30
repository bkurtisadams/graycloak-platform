# DESIGN-gw-player-view.md

Status: decisions locked · 2026-05-29
Decision locked: **publish-once + `hidden` flag** (per discussion)

## Goal

Remote players, on their own machines (D&D-Beyond style — Roll20 for play,
GCC for the map + sheets), can view the Gamma World campaign map: the explored
area around the party token, and never the GM's secrets. "Hidden" must mean the
secret never reaches the player's browser, not merely that it isn't drawn.

## Current architecture (as-built — confirmed from source)

- Two scales: the 30-mile **parent grid** (`gw-map.html`) and the 3-mile
  **subhex detail** (`gw-subhex-view.js`, opened via `GWSubhexView.open(col,row)`).
- The subhex viewer owns party token, fog, route-turn clock, encounters, and
  feature authoring/generation. It is a **single-user GM tool**: `gcc-auth.js`
  loads, but there is no Firestore sync, no campaign context, no GM/player mode.
- Fog is the viewer's own, **not `gcc-fog.js`**:
  - `state.revealed` — `Set<"Q_R">` (global subhex axial), localStorage `gw-sx-revealed`
  - `state.party` — `{Q,R}`, localStorage `gw-sx-party`
  - `state.fogOn` — GM overlay toggle, localStorage `gw-sx-fog-on`
  - `state.clock` — campaign date + route-turn, localStorage `gw-sx-clock`
- Features/POIs = `GWAnnotations` markers + strokes (localStorage `gw-annotations`,
  first-load seeded from static `gw-authored.js`). `GWFeatureGen` generates them
  client-side, deterministically from a world seed, into `GWAnnotations`.
- `renderFog()` veils unrevealed cells **only when `fogOn && party`**.
- `renderAnnotations()` draws **all** markers/strokes in the viewport bbox — no
  fog gate, no `hidden` concept. **Markers currently render over fogged cells.**

Implication: there is no player path today, and the client holds (or can
regenerate) everything. Hiding has to be enforced at the publish boundary, not
in the renderer.

## Threat model & decision

- Base maps are public (parent terrain, `gwmap.png`) — fine to ship whole.
- Secrets = GM-only features. Flagged `hidden`, they are **never published**, so
  they never cross the wire. That is the real-secrecy guarantee.
- Fog = reveal ordering over public/published content. **Publish-once:** the full
  non-hidden set is published; the player renderer draws only features whose cell
  is revealed. A determined player could devtools-peek a non-hidden-but-unrevealed
  feature; anything that must not be peeked is marked `hidden`. (See open
  decision on scoping publish to explored parents, which tightens this.)
- The GM client stays authoritative: it moves the party and reveals; players only
  consume. Players cannot self-reveal.

## Data model (new)

Firestore, one player-safe doc per campaign (single doc, `revealed` as a flat
array, rewritten on each publish — see Decision #2):

    campaigns/{cid}/maps/gw
      {
        ownerUid, _updated,
        party:   { Q, R } | null,
        revealed: ["Q_R", ...],                              // grows as party moves
        clock:   { year, month, day, min, exert } | null,    // players see date + route-turn
        ann: {                                               // explored parents only (Decision #3)
          markers: [ {id,kind,x,y,name?}, ... ],             // hidden excluded
          strokes: [ {id,kind,pts,...}, ... ],               // hidden excluded; clipped to revealed at render
        }
      }

Storage stays one doc. Revealed is tens of KB even after a long campaign, writes
are charged per-write (so reveal-on-move is cheap), and scoping `ann` to explored
parents keeps the doc well under 1 MB. Escape hatch if a campaign ever gets huge:
shard `ann` per parent (`maps/gw_{col}_{row}`) — documented, not built.

Rules (reuses the campaign-membership pattern from the invite work):

    match /campaigns/{cid}/maps/{mapId} {
      allow read:  if request.auth != null
        && (isCampaignOwner(cid)
            || exists(/databases/$(database)/documents/campaigns/$(cid)/players/$(request.auth.uid)));
      allow write: if request.auth != null && isCampaignOwner(cid);
    }

`hidden:true` lives on markers/strokes in `GWAnnotations` (GM-local only; the
publish filter drops them, so the field never appears in Firestore).

## Phases

**0 — `hidden` primitive** (independent; useful even before multiplayer)
- `gw-annotations.js`: accept/persist `hidden` on markers and strokes; add an
  `exportSafe()` that returns the non-hidden set.
- `gw-subhex-view.js`: "Hidden from players" checkbox in the marker editor; in
  GM view, draw hidden items with a badge so the GM sees what's concealed.

**1 — campaign context + role on the map pages**
- Read `?campaign=cid` (and resolve via `GCCInvite.isOwner(cid)` → mode `gm`|`player`),
  loading `gcc-invite.js` / `gcc-sync.js`. Without a campaign param, behave as
  today (standalone GM tool).

**2 — publish (GM)**
- `gw-map-sync.js`: `push(cid)` assembles the player-safe payload (party, revealed,
  clock, and `GWAnnotations.exportSafe()` **scoped to explored parents** — a parent
  with any revealed subhex), writes `campaigns/{cid}/maps/gw`. Manual "Publish to
  players" button + debounced auto-push on party move / annotation change / entering
  a new parent. Add the rules block above.

**3 — pull + live player render**
- Member subscribes to the doc with `onSnapshot` and re-renders on every GM
  publish, so the map reveals as the party moves (Decision #4). Hydrates a
  **read-only** `GWSubhexView`:
  - fog always on (ignore the `fogOn`/preview gate; players never see unrevealed)
  - no Build tab, no party Place/Move, no generate/export, all paint arms disabled
  - markers: draw only if the marker's cell (`svgToAxial(m.x,m.y)`) is in `revealed`
  - strokes: clip to revealed cells — sample the smoothed path, draw only the runs
    whose cell is revealed (Decision #1)
  - `renderFog()` player branch: veil every unrevealed cell unconditionally
  - render the clock / campaign date read-only (Decision #5)

**4 — polish**
- `gw-map.html` player mode: hide terrain edit / generate / export / authoring;
  optionally lock navigation to the party's parent.
- Reconnect/backfill handling, publish-status indicator for the GM.

## Integration points (files)

- `gw-annotations.js` — `hidden` in add/update/serialize; `exportSafe()`.
- `gw-subhex-view.js` — marker-editor checkbox + badge; mode flag; player branches
  in `renderAnnotations()` / `renderFog()`; `exportState()` (party + revealed +
  clock); read-only guards on the arm/paint paths.
- `gw-map.html` — campaign param; player-mode hiding of authoring UI; load deps.
- `gw-map-sync.js` — **new** — publish/pull (+ optional onSnapshot).
- `firestore.rules` — `campaigns/{cid}/maps/{mapId}` block.

## Decisions (locked 2026-05-29)

1. **Strokes under fog** — clip to revealed cells; show only the road/trail
   segments in hexes the party has seen. Published whole (scoped to explored
   parents), clipped at render.
2. **`revealed[]` growth** — single doc, flat array, rewritten per publish. Cheap
   at this scale; per-parent shard documented as the escape hatch, not built.
3. **Scope publish to explored parents** — adopted. Only parents the party has
   entered contribute features to the player doc; tightens devtools-peek and bounds
   doc size. Re-publish a parent's features once on first entry.
4. **Live updates** — core. Player subscribes via `onSnapshot`; map reveals as the
   GM moves the party.
5. **Clock visibility** — players see the route-turn clock and campaign date.
