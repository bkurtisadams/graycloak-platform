# @graycloak/classic-traveller-rules

Pure JavaScript rules package for the Graycloak Classic Traveller browser-game project.
It intentionally has no HTML, Foundry, Firebase, or server dependencies.

## v0.5.0 scope

Implemented from Classic Traveller Book 1:

- six 2D initial characteristics and UPP formatting
- the six prior services and their enlistment, survival, commission, promotion, and reenlistment rules
- failed enlistment and the one-die draft
- four-year service terms and the optional two-year injury separation rule
- acquired skills, EDU 8+ restriction, specialization pauses, and rank/service automatic skills
- Scout exception: two acquired skills in every term
- term completion and career history
- aging checks beginning at physical age 34 and recurring at four-year intervals
- Book 1 aging characteristic-loss bands and aging crises
- medical-skill DM on aging-crisis survival, slow-drug physical aging, and no-slow-drug recovery delay
- mandatory reenlistment on an exact 12
- reenlistment denial, voluntary departure, and mandatory retirement after the seventh term unless mandatory reenlistment occurs
- retirement pay from the fifth term onward
- Book 1 mustering-out cash and material-benefit tables
- rank-based extra mustering-out rolls and benefit-table DM
- Gambling-1+ cash-table DM
- maximum three cash-table rolls
- immediate declaration of Gun/Blade material benefits, with later benefits of the same type optionally taken as skill
- credits, material benefits, retirement pay, and final COMPLETE chargen state
- deterministic dice injection for regression testing

v0.4.0 added the stable host-facing boundary:

- `CHARGEN_ACTIONS` action vocabulary
- `getAvailableActions(character)` so clients do not duplicate phase legality rules
- `performChargenAction(character, action, payload)` as a single UI-facing dispatcher
- action-specific choice metadata for services, skill tables, specialization, aging, and mustering out
- schema v4 character documents
- `validateCharacter()` and `assertValidCharacter()` structural/state validation
- `exportCharacter()` and `importCharacter()` strict JSON helpers
- import rejection of unknown fields, impossible phase/state combinations, inconsistent UPPs, invalid ranks, bad counters, and malformed JSON
- migration of compatible v3 character documents to schema v4

Not implemented in the pure rules package:

- validation catalogs for specific gun, blade/polearm, and vehicle specializations
- full skill-effect rules outside character generation
- persistent server/database adapters

## Tests

From this package directory:

```text
npm test
```

From the Graycloak monorepo root, the normal workspace test command should include this package automatically because the workspace includes `packages/*`.


## v0.5.0 client milestone

The first browser chargen client lives outside this package at `traveller/client/`. It consumes the public lifecycle API and does not duplicate Book 1 target numbers or phase legality rules.
