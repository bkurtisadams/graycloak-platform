# @graycloak/classic-traveller-rules

Pure JavaScript Classic Traveller rules package for the Graycloak platform.

## v0.1.0 scope

This first slice deliberately stops at the point where a surviving term reaches skill acquisition. It implements:

- deterministic or random d6 / 2d6 rolling
- initial six-characteristic generation and UPP formatting
- the six Book 1 prior-service entries and draft numbers
- enlistment with cumulative characteristic DMs
- draft resolution after failed enlistment
- four-year term start state
- survival checks, with standard death as the default
- the printed optional injury-on-failed-survival rule behind an explicit chargen option
- first-term draftee commission restriction
- commissions and promotions, including rank titles
- Book 1 basic skill-eligibility counts (2 first term, +1 commission, +1 promotion)
- serializable history/state suitable for later JSON import/export

The package has no DOM, Firebase, Foundry, server, or persistence dependencies.

## Source

Rules are based on *Classic Traveller Facsimile Edition*, Book 1, especially pp. 8-15 of the original Book 1 pagination: Initial Character Generation; Acquiring Skills and Expertise; Prior Service Table; Table of Ranks; Acquired Skills Tables.

The implementation intentionally does not yet automate acquired skill-table results, term completion, reenlistment, aging, retirement, or mustering-out benefits. Those are the next rules slice rather than placeholders hidden in the first slice.

## Test

From this package directory:

```sh
npm test
```

From the Graycloak workspace root, the existing recursive test script will discover the package automatically because `pnpm-workspace.yaml` includes `packages/*`:

```sh
npm test
```
