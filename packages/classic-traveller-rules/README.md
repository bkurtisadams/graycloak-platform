# @graycloak/classic-traveller-rules

Pure JavaScript rules package for the Graycloak Classic Traveller browser-game project. It intentionally has no HTML, Foundry, Firebase, or server dependencies.

## v0.11.2 scope

The package retains the established Book 1 character-generation, gameplay Character Document, Book 2 Type S starship, and Book 3 subsector/world layers, and now includes source-backed passenger, freight, speculative-commerce, and charter/private-message primitives.

Starship and commerce support includes:

- canonical Type S Scout/Courier specifications from Book 2 p.19 plus facsimile errata
- Ship Document v3 with v1/v2 migration and persistent passenger manifests
- tracked fuel quantity/quality, cargo manifest, ship operating account, ledger, and port-call state
- Book 2 fuel pricing, berthing costs, Scout-base free fuel, jump-fuel consumption, and gas-giant skimming
- Book 2 passenger demand by origin population plus destination population, travel-zone, and tech-level DMs
- High / Middle / Low passage fares, stateroom/low-berth capacity, and steward requirement for high passage
- Book 2 freight counts, distinct indivisible shipments, cargo tonnage, and Cr1,000-per-ton delivery revenue
- Book 2 life-support costs per occupied stateroom and low berth
- the complete 11-66 Trade and Speculation goods table, including facsimile errata
- weekly speculative lot generation, purchase/resale world-type DMs, partial-purchase handling fees, broker resale DMs/commissions, and Admin/Bribery sale DMs
- an explicit engine policy that modified Actual Value results outside the printed 2-15 table use the nearest printed endpoint
- Book 2 two-week starship charter pricing by cargo and passenger revenue-producing capacity
- Book 2 private-message 9+ availability and Cr20-Cr120 honorarium helpers
- generic ship-account credit support used by persistent contract completion

World/subsector support includes Classic Traveller 8-by-10 subsector coordinates, Jump-N filtering, Universal World Profiles, authored system validation, and the six Book 3 commerce classifications, including the facsimile correction for Non-Agricultural worlds.

The authored Far Meridian systems live under `traveller/world/`; they are original provisional Graycloak campaign content and are not part of this pure rules package.

Not implemented yet:

- random subsector/world generation
- mail revenue
- crew salary / annual maintenance calendar automation
- extended berthing-day automation
- low-berth revival procedure for ships with low berths
- encounters during/after travel
- starship combat
- server/database adapters

## Tests

From this package directory:

```text
npm test
```

The Graycloak monorepo root workspace test should include this package automatically when installed into the existing workspace.
