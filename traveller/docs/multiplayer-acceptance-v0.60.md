# Traveller multiplayer acceptance — v0.60

Use two ordinary browser profiles for players and one for the referee. Complete
this once against the Firestore emulator before using the deployed project.

## Setup

1. Run the Firestore security-rules suite with `test-rules.bat`.
2. Serve the platform root with `serve-traveller.bat`.
3. Referee: load Sea of Suns, sign in, publish the campaign, and publish an active encounter.
4. Players: open `traveller/client/player.html?campaign=CAMPAIGN_ID` and sign in.
5. Referee: seat both account IDs, assign a different party character to each, and republish.

## Round acceptance

- Each player sees only their assigned character marked as theirs.
- Each player declares once; repeat clicks cannot revise the order.
- The referee receives both orders without refreshing.
- Neither player can declare for the other player's character.
- The referee resolves once; both attacks use the simultaneous Book 1 round.
- Both player pages receive the new map, conditions, round and narration.
- Player narration exposes no characteristics, armour, target numbers, dice or DMs.

## Reconnect acceptance

- Reload one player before resolution: the submitted order still reads as waiting.
- Close and reopen one player: the campaign link restores the current encounter.
- Change to a new encounter: the old scene and declaration listeners stop updating.
- End the encounter: order controls change to `THE FIGHT IS OVER`.
- Begin another encounter: no declaration from the old encounter is applied.

## Refusal acceptance

- Unassign a character after its player page is open. A later declaration is refused by both the database rules and the referee-side ownership check.
- An old-round declaration is ignored without interrupting the referee.
- A missing or unpublished scene reports a useful status rather than exposing referee data.

Record browser, account, campaign, encounter, and any failure before changing code.
