# Firestore rules v13 — player characters, invites, join requests (v0.67.0)

Three additions to both `gcc/firestore.rules` and `graycloak-adnd/firestore.rules`.
Bump the header to v13 in both. Suite cases are in
`graycloak-adnd/test/traveller-rules.test.mjs` (the changed-files zip carries it).

## 1. Helpers — beside `ownsTravellerCombatant`

```
    // v13: does this code open a seat at this campaign? Reads the invite
    // twice rather than once so a missing document denies by exists() instead
    // of by evaluation error.
    function travellerInviteOpens(code, campaignId) {
      return code is string
        && code != ''
        && exists(/databases/$(database)/documents/invites/$(code))
        && get(/databases/$(database)/documents/invites/$(code)).data.get('game', '') == 'traveller'
        && get(/databases/$(database)/documents/invites/$(code)).data.get('campaignId', '') == campaignId;
    }

    // The referee of the campaign a world names, guarding the null that an
    // unassigned world carries in campaignId.
    function isTravellerRefereeOfWorld(world) {
      return world.get('campaignId', '') is string
        && world.get('campaignId', '') != ''
        && isTravellerReferee(world.get('campaignId', ''));
    }
```

## 2. Join requests — inside `match /travellerCampaigns/{campaignId}`, after the `players` block

```
      // v13: a request to sit down. A player creates one for themselves by
      // redeeming a valid Traveller invite for this campaign, may withdraw
      // it, and may not revise it. The referee reads and clears.
      match /joins/{playerUid} {
        allow read: if isTravellerReferee(campaignId)
          || (isAuthed() && request.auth.uid == playerUid);
        allow create: if isAuthed()
          && request.auth.uid == playerUid
          && declarationField('uid') == playerUid
          && declarationField('campaignId') == campaignId
          && travellerInviteOpens(declarationField('code'), campaignId);
        allow update: if false;
        allow delete: if isTravellerReferee(campaignId)
          || (isAuthed() && request.auth.uid == playerUid);
      }
```

## 3. The player's own characters — top level, before `// ── GM roster`

```
    // ── Graycloak Traveller: the player's own characters ───────
    // v13. A character rolled at enter.html, owned by the account that rolled
    // it and carrying where it is: nowhere yet, a referee's campaign, or the
    // solo world. The owner reads, edits and deletes it but may not move it
    // between worlds by hand — a seat is the referee's to give and take — so
    // the world may change only at the hands of the referee of the campaign
    // it is leaving or joining, and they may change nothing else.
    match /travellerCharacters/{characterId} {
      allow read: if isAuthed()
        && resource.data.get('ownerUid', '') == request.auth.uid;
      allow create: if isAuthed()
        && request.resource.data.get('ownerUid', '') == request.auth.uid
        && request.resource.data.get('characterId', '') == characterId
        && request.resource.data.get('world', {}).get('kind', '') == 'unassigned';
      allow update: if isAuthed()
        && (
          (resource.data.get('ownerUid', '') == request.auth.uid
            && request.resource.data.get('ownerUid', '') == request.auth.uid
            && request.resource.data.get('world', {}) == resource.data.get('world', {}))
          || (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['world', 'pendingJoin', 'updatedAt'])
            && (isTravellerRefereeOfWorld(request.resource.data.get('world', {}))
              || isTravellerRefereeOfWorld(resource.data.get('world', {}))))
        );
      allow delete: if isAuthed()
        && resource.data.get('ownerUid', '') == request.auth.uid;
    }
```

Traveller invites use the existing `invites/{code}` rule unchanged: any signed-in
account reads a code, creates one, and only the owner updates or deletes it.
The referee's Players dialog lists its open invites with a query on
`campaignId == X && game == 'traveller'`; if the console asks for a composite
index the first time, accept it.

## Acceptance additions

- Referee opens `[ PLAYERS ]` → `[ NEW INVITE ]`, copies the link.
- Player (fresh account, incognito) opens the link: signs in, sees `YOU HAVE NO
  CHARACTERS YET`, rolls one through to mustering out, names it, saves it. The
  list shows it as `NOT YET AT A TABLE`. Reload: it is still there.
- Player `[ JOIN A TABLE ]`, code pre-filled from the link, `[ SIT DOWN ]`. The
  row reads `AWAITING A SEAT AT …`; the referee's dialog shows them under
  `WAITING TO SIT DOWN` with UPP and service, without refreshing.
- Referee `[ SEAT ]`: the character appears in the party and the directory owned
  by that account; the player's row changes to `SEATED AT …` with
  `[ ENTER WORLD ]`, which opens `player.html` already connected, with their
  sheet on the CHARACTER tab.
- Referee `[ REMOVE ]` on the seated player: the lobby row returns to
  `NOT YET AT A TABLE`.
- A wrong code is refused with `THAT CODE WAS NOT ACCEPTED`.
