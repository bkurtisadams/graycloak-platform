# @graycloak/boothill-rules

BOOT HILL 2nd edition rules engine. Pure JavaScript, no host dependencies:
runs in Node, the browser, and the Foundry system `boot-hill-2e` (vendored).

Rules authority: the Boot Hill 2e design doc (Claude Docs), scans of the
printed tables, and Kurt's rulings in `ERRATA.md`.

## Layout

- `index.js` - re-exports every module in `src/`, plus `RULES_VERSION`
- `src/*.mjs` - one rules area per file; each carries its own self-tests
- `test/self-tests.test.js` - runs every module's self-tests under `node --test`, plus the cert anchors

Run all tests from this folder:

    npm test

Run one module's self-tests:

    node src\abilities.mjs

## Slices

- 0.1.0 - characters: ability tables, Initial Modification, experience, age,
  base numbers, Weapons Chart, Price Chart, Survival Modification. Cert: The Colorado Kid.
- 0.2.0 - gunfight: First Shot Determination Chart and firing order, Hit Determination
  Chart, Wound Chart, hard cover, wound bands and effects, shotgun/scatter field of fire.
  Pending: Shotgun/Scatter Gun Effects Table (needs scan).

## Conventions

- Characters store percentile scores; descriptions, ability scores and modifiers are derived.
- Percentiles may hold halves; tables read the whole number.
- Ranges are inches (one town-map square, 6 ft). Costs are cents.
- Every roller takes an injectable `rng`; `mulberry32(seed)` for reproducible play.
