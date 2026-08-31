# @graycloak/classic-traveller-rules

Pure JavaScript rules package for the Graycloak Classic Traveller browser-game project.
It intentionally has no HTML, Foundry, Firebase, or server dependencies.

## v0.3.0 scope

Implemented from Classic Traveller Book 1:

- six 2D initial characteristics and UPP formatting
- the six prior services and their enlistment, survival, commission, promotion, and reenlistment rules
- failed enlistment and the one-die draft
- four-year service terms and the optional two-year injury separation rule
- acquired skills, EDU 8+ restriction, specialization pauses, and rank/service automatic skills
- Scout exception: two acquired skills in every term
- term completion and serializable career history
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

Not implemented yet:

- validation catalogs for specific gun, blade/polearm, and vehicle specializations
- full skill-effect rules outside character generation
- high-level import/export helpers beyond the naturally JSON-serializable state object
- browser UI or persistence adapters

## Tests

From this package directory:

```text
npm test
```

From the Graycloak monorepo root, the normal workspace test command should include this package automatically because the workspace includes `packages/*`.
