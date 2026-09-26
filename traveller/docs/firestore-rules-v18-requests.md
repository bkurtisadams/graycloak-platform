# Firestore rules v18 — players' requests (v0.329.0)

One addition to `gcc/firestore.rules` (and `graycloak-adnd/firestore.rules`
if it carries the Traveller block).

With the game refereeing, a player's button is a request the server carries
out (`traveller/functions`, `src/remote-request.js`). The player writes it; the
function, which runs with admin rights and is not bound by these rules,
writes the answer onto it. The rule's job is that a player can only ask, in
their own name, in a campaign they are seated in, and can never write an
answer.

```
travellerCampaigns/{campaignId}/requests/{requestId}
  { uid, characterId, command, value, createdAt, status: 'pending' }
  answered by the function: status 'done' | 'refused', message, revision, doneAt
```

## Rule to merge — inside `match /travellerCampaigns/{campaignId}`, beside `players`

```
      // v18: a seated player's request; only the server answers it.
      match /requests/{requestId} {
        allow read: if isTravellerReferee(campaignId)
          || (isAuthed() && resource.data.get('uid', '') == request.auth.uid);
        allow create: if isAuthed()
          && request.resource.data.uid == request.auth.uid
          && request.resource.data.status == 'pending'
          && request.resource.data.command is string
          && request.resource.data.command.size() <= 200
          && request.resource.data.keys().hasOnly(['uid', 'characterId', 'command', 'value', 'createdAt', 'status'])
          && exists(/databases/$(database)/documents/travellerCampaigns/$(campaignId)/players/$(request.auth.uid));
        allow update: if false;
        allow delete: if isTravellerReferee(campaignId);
      }
```

`isTravellerReferee` and `isAuthed` are the helpers the `declarations` rule
already uses. Nothing here checks what the command is: the function refuses
anything off the player's list (`playerMayRun`), anything when a person
referees, and anything from an account not seated (`players/{uid}` with
`seatedAt`), and says so on the request.

## Rules-suite cases to add

- Seated player A creates a request with `uid: A`, `status: 'pending'`: allowed.
- A creates one with `uid: B`: denied.
- A creates one with `status: 'done'`: denied.
- A creates one with an extra field (`message`): denied.
- Unseated account C creates one with `uid: C`: denied.
- A updates or deletes their own request: denied.
- A reads their own request: allowed; A reads B's: denied.
