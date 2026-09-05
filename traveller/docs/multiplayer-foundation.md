# Traveller Multiplayer Foundation v1

This release prepares the Traveller application for simultaneous players without claiming that a live network transport already exists.

## Reused project lessons

The foundation follows the strongest boundaries already present elsewhere in Graycloak:

- Graycloak AD&D: browsers submit choices; a trusted command service reloads current state, authorizes the actor, recomputes outcomes, and commits atomically.
- Chainmail and BATTLESYSTEM: players control assigned pieces, spectators cannot mutate state, the referee remains authoritative, and private information is projected by audience.

Traveller does not copy the board simulators' full-snapshot publishing model. A campaign contains longer-lived documents, private referee material, commerce, characters, ships, and encounters. It therefore uses revisioned commands as its intended mutation boundary.

## New boundaries

### Player session

`src/player-session.js` holds client-specific state:

- campaign and player identity;
- role: `solo`, `player`, `referee`, or `spectator`;
- assigned/controlled Character Document IDs;
- the character currently viewed by that client.

The viewed character is no longer changed by rewriting shared campaign state. Campaign Document v9 retains `activeCharacterId` as the portable solo/default focus for compatibility, while the browser's selector now edits the local session.

### Visibility

Activity Log Document v2 adds:

- `visibility: public | players | referee`;
- `audiencePlayerIds` for addressed-player entries.

Legacy v1 entries migrate to `public`. Referee and solo sessions see the complete ledger; players receive public entries plus entries addressed to them; spectators receive public entries only.

Visibility projection is a presentation safety boundary in the current offline build. A future backend must not send referee-only source documents to unauthorized clients merely because the UI filters them.

### Revisioned campaign state

`src/campaign-state-store.js` defines the state envelope used by a future shared transport:

```text
schemaVersion
campaignId
revision
state
```

Every transaction supplies an expected revision and command ID. A stale revision is rejected, a committed command ID is idempotent, and subscribers receive the new snapshot. The included memory adapter supports deterministic multi-client tests. It is not a production authority service.

### Command service

`src/campaign-command.js` separates client intent from trusted execution:

1. normalize the command envelope;
2. find the registered command definition;
3. authorize the player/session and actor;
4. normalize only the allowed player choices;
5. execute against freshly read state;
6. commit through the revisioned store.

Command definitions—not the generic envelope—decide which choices are legal and compute the resulting state. A client-provided outcome field has no effect unless a trusted definition explicitly accepts it.

## What remains before live multiplayer

- authenticated campaign membership and character assignment records;
- a Firestore or equivalent state-store adapter using real atomic transactions;
- a trusted server command endpoint that reloads sessions rather than trusting browser-supplied role data;
- command definitions for Traveller travel, commerce, situations, and combat;
- referee-only projections for situations, patrons, NPC notes, and secret throws;
- presence, invitations, reconnect handling, and real-browser acceptance tests.

Solo/offline campaign play continues to use the existing document registry and browser autosave.
