# Firestore rules — per-player documents (v0.65.0)

v0.65.0 writes two kinds of document under a seated player's own path:

```
travellerCampaigns/{campaignId}/players/{uid}/characters/{characterId}
travellerCampaigns/{campaignId}/players/{uid}/log/current
```

Both are referee-written copies. The existing `players/{uid}` document is the
seat and is unchanged; this adds a rule for everything beneath it.

## Rule to merge into the platform ruleset

Inside the existing `match /travellerCampaigns/{campaignId}` block, alongside
the `players/{uid}` seat rule:

```
// v0.65.0: a player's own character sheet and addressed log. Only that account
// and the referee may read; only the referee writes. Firestore cannot filter
// fields, so one player's documents are never in a path another can open.
match /players/{uid}/{document=**} {
  allow read: if request.auth != null
    && (request.auth.uid == uid || isReferee(campaignId));
  allow write: if request.auth != null && isReferee(campaignId);
}
```

`isReferee(campaignId)` is whatever the ruleset already uses for the
campaign's `ownerUid` — reuse that helper rather than adding a second test.
If the seat rule is written as `match /players/{uid}` without a recursive
wildcard, the block above sits beside it and does not change who can read or
write the seat itself.

## Rules-suite cases to add (`test-rules.bat`)

- Seated player A reads `players/A/characters/x` and `players/A/log/current`: allowed.
- Seated player B reads either of A's documents: denied.
- Player A writes to `players/A/characters/x` or `players/A/log/current`: denied.
- Referee writes and deletes both: allowed.
- Unseated account (no `players/{uid}` seat) reads its former documents: denied
  once the seat is gone — the client deletes the subtree on unseat, but the
  rule should not depend on that.

## Acceptance additions (three-browser pass, after `multiplayer-acceptance-v0.60.md`)

- Referee assigns a character to player A and republishes: A's CHARACTER tab
  shows the sheet; B's shows `NO CHARACTER ASSIGNED TO YOU YET`.
- Referee resolves a round that wounds A's character: A's sheet shows the
  reduced current value and `STATUS WOUNDED` without a reload.
- Referee jumps, arrives and berths: A's LOG shows the three lines, newest
  first, within a couple of seconds; no COMBAT audit line appears in it.
- Referee reassigns A's character to B: it leaves A's page and appears on B's.
- Referee removes A: A's sheet and log clear; A's next read of the campaign is
  refused.

## Also in v12: `moves` and `presence`

`publish.js` has written `encounters/{id}/moves` (player token drags) and
`encounters/{id}/presence` (selection and target markers) since v0.61.0, and the
v11 ruleset had no rule for either, so every player-side write to them was denied
by the catch-all. v12 admits them:

- `moves/{moveId}`: create-only by a seated account for a combatant it owns,
  claiming its own `uid`; deleted by the referee (after checking the drop) or by
  the player who made it; never updated.
- `presence/{presenceUid}`: one document per account, written by that account
  or cleared by the referee.

Suite cases: player A creates a move for an owned combatant (allowed), for an
unowned one (denied), with someone else's uid (denied); player A updates a move
(denied); referee deletes a move (allowed); player A writes `presence/A`
(allowed) and `presence/B` (denied).
