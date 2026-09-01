# @graycloak/classic-traveller-rules

Pure JavaScript rules package for the Graycloak Classic Traveller browser-game project.
It intentionally has no HTML, Foundry, Firebase, or server dependencies.

## v0.9.0 scope

v0.9.0 retains the established Book 1 character-generation and Book 2 starship layers and adds the first Book 3 subsector/navigation primitives.

Character generation includes:

- six 2D characteristics and UPP formatting
- all six Book 1 prior services
- enlistment, draft, survival, commission, promotion, reenlistment, retirement, aging, and mustering out
- acquired skills, legal specialization catalogs, and Scout two-skills-per-term handling
- deterministic dice injection for tests
- chargen schema v4 validation/import/export
- completed chargen -> gameplay Character Document conversion

Gameplay Character Document v2 includes stable IDs, ship references by ID, and the source-backed Scout Ship duplicate-benefit rule.

Starship support includes the canonical Type S Scout/Courier Ship Document v1 with the Book 2 p.19/facsimile-errata data used by the browser client.

Subsector/navigation primitives add:

- Classic Traveller 8-column by 10-row subsector coordinate validation
- printed four-digit hex formatting such as `0405`
- one-parsec hex distance calculation
- Jump-N destination filtering against an authored subsector
- pure lookup/distance helpers with no browser or campaign-setting dependencies

The authored Far Meridian systems themselves live under `traveller/world/`; they are original provisional Graycloak campaign content, not Classic Traveller canon and not part of the pure rules package.

Not implemented yet:

- random subsector/world generation
- fuel purchase/skimming and refueling state
- trade, cargo/passenger generation, or economics loop
- encounters during/after travel
- starship combat
- server/database adapters

## Tests

From this package directory:

```text
npm test
```

The Graycloak monorepo root workspace test should include this package automatically when installed into the existing workspace.


## v0.10 world/system primitives

The pure rules package now includes Book 3 Universal World Profile parsing, formatting, validation, and descriptive helpers for starport, size, atmosphere, hydrographics, population, government, and law level. It also validates authored system records with scout/naval base flags, gas-giant presence, and Book 3 amber/red travel-zone values.
