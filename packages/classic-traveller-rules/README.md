# @graycloak/classic-traveller-rules

Pure JavaScript rules package for the Graycloak Classic Traveller browser-game project.
It intentionally has no HTML, Foundry, Firebase, or server dependencies.

## v0.7.2 scope

v0.7.2 retains the v0.7.0 rules and persistence layer unchanged while the browser receives a focused usability pass. The rules package continues to provide the complete Book 1 character-generation engine and persistent starship layer.

Character generation includes:

- six 2D characteristics and UPP formatting
- all six Book 1 prior services
- enlistment, draft, survival, commission, promotion, reenlistment, retirement, aging, and mustering out
- acquired skills, legal specialization catalogs, and Scout two-skills-per-term handling
- deterministic dice injection for tests
- chargen schema v4 validation/import/export
- completed chargen -> gameplay Character Document conversion

Gameplay Character Document v2 adds:

- stable character document IDs
- ship references by ship ID instead of embedding ship state
- migration of v1 gameplay Character Documents
- source-backed resolution of the Scout Ship benefit: one effective reserve assignment; additional Scout Ship results have no further effect

Starship support adds:

- Ship Document schema v1 with strict validation/import/export
- canonical Classic Traveller Type S Scout/Courier standard design
- Book 2 p.19 and Facsimile errata corrections, including the standard hull and MCr29.43 cost
- 100-ton streamlined hull, Jump-2, 2-G, power plant A, 40 tons fuel, Model/1bis computer, four staterooms, no low berths, three tons cargo, double turret/fire control with no weapons, and Air/Raft
- one-person standard Type S crew/duty description without overriding Book 2's general under-200-ton crew rule
- Scout reserve-assignment authority state: recallable, not saleable, usable as desired, free fuel at Scout bases, free maintenance at Scout bases at class B starports, and character responsibility for upkeep/crew costs
- explicit preservation that Book 1 does not name the legal title holder; the schema records Scout Service control without inventing a stronger title rule

Not implemented yet:

- campaign calendar and world location
- routine travel/jump execution
- trade, cargo/passenger generation, or economics loop
- starship combat
- server/database adapters

## Tests

From this package directory:

```text
npm test
```

The Graycloak monorepo root workspace test should include this package automatically when installed into the existing workspace.
