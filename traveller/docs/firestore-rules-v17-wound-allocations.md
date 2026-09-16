# Firestore rules v17 — wound allocations (v0.179.0)

One addition to both `gcc/firestore.rules` and `graycloak-adnd/firestore.rules`.

Book 1 p.30 leaves the distribution of a wound's groups to the wounded player.
v0.178.0 made the referee's round pause for that choice; v0.179.0 lets the
player answer from their own page. The answer travels the same way a
declaration does — the player writes an intent, the referee reads it, checks
it against its own encounter (`authorizePlayerWoundAllocation`) and applies
it. The database rule is the security boundary; the referee's check is the
second one.

```
travellerCampaigns/{campaignId}/encounters/{encounterId}/woundAllocations/{woundKey}
```

Keyed by the wound rather than by the actor, so two wounds in one round are
two documents and an answer to a wound already applied cannot be mistaken for
an answer to the next one.

## Rule to merge — inside `match /travellerCampaigns/{campaignId}/encounters/{encounterId}`, beside the `declarations` block

```
      // v17: the wounded player's own distribution of a wound (Book 1 p.30).
      // Create-only for the player, as a declaration is: once sent it cannot
      // be revised after seeing what it did. The player may only answer for a
      // combatant they own, and only for their own uid. The referee reads
      // every answer and clears them once the round finishes.
      match /woundAllocations/{woundKey} {
        allow read: if isTravellerReferee(campaignId)
          || (isAuthed() && resource.data.get('uid', '') == request.auth.uid);
        allow create: if isAuthed()
          && declarationField('uid') == request.auth.uid
          && declarationField('key') == woundKey
          && declarationField('encounterId') == encounterId
          && ownsTravellerCombatant(campaignId, declarationField('actorId'));
        allow update: if false;
        allow delete: if isTravellerReferee(campaignId);
      }
```

`ownsTravellerCombatant(campaignId, actorId)` and `declarationField(...)` are
the helpers the existing `declarations` rule already uses — reuse them rather
than adding a second test. If `declarations` is written with a different
helper name for reading `request.resource.data`, use that one here.

Nothing in the rule inspects the dice or the characteristics: a player who
sends a distribution that does not add up, names the wrong number of groups,
or answers a wound that is no longer waiting is refused by
`authorizePlayerWoundAllocation` on the referee's side and told so on their
own log. The rule's job is only ownership and immutability.

## Rules-suite cases to add (`test-rules.bat`, `graycloak-adnd/test/traveller-rules.test.mjs`)

- Player A, owning combatant X, creates `woundAllocations/{key}` with
  `uid: A`, `actorId: X`, `key` matching the document id: allowed.
- Player A creates one with `uid: B`: denied.
- Player A creates one for combatant Y, which B owns: denied.
- Player A creates one whose `key` field differs from the document id: denied.
- Player A creates one whose `encounterId` field names another encounter: denied.
- Player A updates their own allocation after creating it: denied.
- Player B reads A's allocation: denied. The referee reads it: allowed.
- Player A deletes their own allocation: denied. The referee deletes it: allowed.
- An unseated account creates one for a combatant it does not own: denied.

Expect the suite to go from 30 cases to 39.

## Acceptance additions (three-browser pass)

1. Referee seats player A on a character and publishes. A's page shows the
   sheet and the scene.
2. Referee runs a fight and resolves a round in which A's character takes its
   **second** wound (the first is Book 1 p.30's random one and is never
   offered). The referee's status line reads `<CHARACTER> IS HIT / WAITING
   FOR <PLAYER>` and the referee's own dialog does **not** open.
3. A's page opens the wound dialog by itself, showing the attacker, the
   weapon, the dice and A's own current STR/DEX/END — and no throw, no DMs and
   no armour anywhere on the page.
4. A places the groups and presses PLACE THE WOUND. The referee's round
   finishes within a second or two: the log gets the round's lines, the clock
   advances 15 seconds, and A's sheet shows the reduced characteristics.
5. A presses LET THE REFEREE PLACE IT instead: A's dialog closes, and the
   referee can open its own dialog from the tracker's ALLOCATE button and
   finish the round.
6. B's page never shows the dialog, and B cannot answer for A's character
   (check the console: the rule denies the write).
7. A closes their browser mid-wound. The referee's ALLOCATE button still
   finishes the round with REFEREE DEFAULT.
8. Two of A's characters are wounded in the same round: A is asked twice, one
   wound at a time, and the round finishes after the second answer.
