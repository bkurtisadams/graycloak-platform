# @graycloak/classic-traveller-rules

Pure JavaScript rules package for the Graycloak Classic Traveller browser-game project. It intentionally has no HTML, Foundry, Firebase, or server dependencies.

## v0.13.1 playable character state

Character Document v3 separates original characteristics and UPP from current STR/DEX/END, records consciousness, and carries an explicit ready weapon and worn armor. Existing v1/v2 gameplay documents migrate deterministically without inventing wounds or armor. `updateCharacterGameplayState()` provides the strict boundary used by the browser character sheet while leaving encounter-to-character wound synchronization for the host's next milestone.

## v0.13.0 personal combat

Adds a generic Classic Traveller Book 1 personal-combat layer: surprise, five abstract range bands, movement, weapon/armor/range target tables, skill and characteristic DMs, untrained attack/defence modifiers, evasion, escape, visible attack and damage dice, first-wound location, physical-characteristic wounds, unconsciousness/death, morale, and end-of-combat recovery. The rules package remains independent of Sea of Suns situations and browser UI.

## v0.12.0.1 fuel purchase quantity fix

Adds `purchaseShipFuel()` so a vessel can buy a specified amount of available starport fuel rather than requiring a fill-to-capacity transaction. `refuelShipToCapacity()` remains available and now delegates to the quantity-based primitive. Fuel price, tank capacity, fuel quality, and ship-account ledger rules are unchanged.

## v0.12.0 encounters and referee checks

v0.12.0 adds the Book 3 patron encounter table, patron availability procedure, and reaction table as pure rules data/functions. It also adds a deliberately labeled generalized referee skill-check helper based on the Book 1 Electronics errata guidance rather than claiming Classic Traveller has a universal task system.

## v0.11.2.1 commerce guard

Speculative cargo sale now requires a destination system different from the cargo origin, preventing same-world buy/sell loops while preserving Book 2 resale pricing.

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
- procedural encounters during/after travel
- starship combat
- server/database adapters

## Tests

From this package directory:

```text
npm test
```

The Graycloak monorepo root workspace test should include this package automatically when installed into the existing workspace.
