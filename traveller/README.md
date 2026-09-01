# Graycloak Traveller

Standalone browser client for the original-universe Classic Traveller project.

## v0.8.0 scope

v0.8.0 adds the first persistent campaign shell on top of the existing Book 1 character-generation and Book 2 Type S Ship Document layers.

The Classic Traveller rules engine remains in `../packages/classic-traveller-rules/`. Campaign persistence is an application-layer concern under `traveller/src/`; it does not add or alter Classic Traveller rules.

## Run locally

From the monorepo root:

```text
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/traveller/client/
```

## v0.8.0 campaign flow

A Campaign Document v1 contains stable references rather than embedded character or ship state. Its current scope is deliberately small:

- stable campaign ID and editable campaign name
- canonical campaign date as ordinal day/year plus seconds-of-day internally
- current system/world placeholders as free-text campaign state
- active party character IDs
- active ship ID
- references to Character and Ship Documents

The browser now provides:

- `[ NEW CAMPAIGN ]` to create a campaign from the currently loaded gameplay character and optional ship
- `[ SAVE CAMPAIGN ]` to save the campaign and its referenced documents in browser local storage
- `[ LOAD CAMPAIGN ]` to restore the last locally saved campaign without manually reloading each Character/Ship JSON file
- `[ EXPORT CAMPAIGN ]` to export one portable Campaign Bundle JSON containing the Campaign Document plus exactly its referenced Character and Ship Documents
- `[ LOAD JSON ]` recognizes chargen saves, Character Documents, Ship Documents, Campaign Documents, and portable Campaign Bundles

Imported Character and Ship Documents are placed into the local document registry by stable ID. Loading a campaign resolves those IDs rather than embedding duplicate state.

The default date begins at `001-4800 00:00`, matching the current project-era convention. This campaign calendar representation and the free-text location fields are Graycloak application conventions, not additions to Classic Traveller RAW.

## Existing character and ship support retained

- complete Book 1 character generation
- gameplay Character Document v2
- source-backed duplicate Scout Ship resolution
- Type S Scout/Courier Ship Document v1
- Scout reserve-assignment authority state
- separate stable character/ship IDs
- optional character-name, ship-name, and registry generators
- source-backed Type S one-person pilot/engineering-duty display

No subsector generation, jump execution, trade loop, encounters, personal combat, or starship combat are included in v0.8.0.
