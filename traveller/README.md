# Graycloak Traveller

## v0.9.1 map renderer

v0.9.1 is a presentation-only follow-up to v0.9.0. It replaces the CSS-clipped subsector cells with a single responsive SVG honeycomb of true regular hexagons. Jump legality, distance, campaign time, persistence, and document schemas are unchanged.


Standalone browser client for the original-universe Classic Traveller project.

## v0.9.0 scope

v0.9.0 adds the first navigable subsector on top of the persistent v0.8 Campaign Document, Book 1 character generation, and Book 2 Type S Ship Document layers.

The Classic Traveller rules engine remains in `../packages/classic-traveller-rules/`. The rules package owns subsector hex geometry and Jump-N range calculations; the browser renders those results. Original setting content remains under `traveller/world/`.

## Run locally

From the monorepo root:

```text
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/traveller/client/
```

## v0.9.0 navigation flow

The browser includes the provisional **Far Meridian** test subsector. Its names and worlds are original Graycloak campaign content and may be revised later.

Classic Traveller Book 3 uses an 8-by-10 subsector grid with one parsec per hex. The v0.9 rules layer uses that geometry to determine which systems are in range of the active ship.

For an existing v0.8 campaign with no mapped system:

1. Load the campaign.
2. Select any occupied system hex.
3. Use `[ SET CURRENT LOCATION ]` to establish the starting system without advancing campaign time.
4. Select another system. Pale-green systems are within the active ship's Jump rating.
5. Use `[ JUMP TO ... ]` for an in-range destination.

A successful v0.9 jump:

- checks distance against the active ship's Jump rating
- changes the Campaign Document's system/world IDs and names
- advances the campaign clock by seven days

Book 2 describes jump travel as taking about one week regardless of distance. v0.9 resolves that campaign interval as exactly seven days for the current discrete campaign clock. The 365-day campaign-year rollover remains a Graycloak setting/application convention.

## Persistence retained

Campaign Document v1 remains compatible with v0.8. Its location fields already included stable system/world ID slots, so no schema migration was necessary.

The browser continues to provide:

- `[ NEW CAMPAIGN ]`
- `[ SAVE CAMPAIGN ]`
- `[ LOAD CAMPAIGN ]`
- `[ EXPORT CAMPAIGN ]`
- `[ LOAD JSON ]` for chargen, Character, Ship, Campaign, and Campaign Bundle documents

Existing v0.8 local saves therefore remain loadable. A campaign that did not yet have a mapped system simply prompts for a starting location on the new map.

## Existing character and ship support retained

- complete Book 1 character generation
- gameplay Character Document v2
- source-backed duplicate Scout Ship resolution
- Type S Scout/Courier Ship Document v1
- Scout reserve-assignment authority state
- separate stable character/ship IDs
- optional character-name, ship-name, and registry generators
- source-backed Type S one-person pilot/engineering-duty display

Not included in v0.9.0: random world generation, fuel/refueling operations, trade, encounters, personal combat, or starship combat.


## v0.10.1

The Far Meridian subsector now carries authored system/world records. Selecting a mapped system shows its main-world UWP and Book 3 field meanings, bases, gas-giant status, travel-zone advisory, and provisional Sea of Suns notes. Campaign location continues to persist stable system/world IDs; trade and encounters remain out of scope for this milestone.
