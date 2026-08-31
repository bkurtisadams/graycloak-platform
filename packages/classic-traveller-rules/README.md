# @graycloak/classic-traveller-rules

Pure JavaScript rules package for the Graycloak Classic Traveller browser-game project.
It intentionally has no HTML, Foundry, Firebase, or server dependencies.

## v0.2.0 scope

Implemented from Classic Traveller Book 1:

- six 2D initial characteristics and UPP formatting
- the six prior services and their enlistment, survival, commission, promotion, and reenlistment targets/DMs
- failed enlistment and the one-die draft
- four-year service-term setup
- Book 1 survival and the optional injury alternative already introduced in v0.1.0
- commission and promotion eligibility
- acquired-skill eligibility: two in the initial term, one in later terms, +1 on commission, +1 on promotion
- all four acquired-skill tables
- EDU 8+ restriction on the fourth table
- characteristic alterations applied immediately
- repeated basic-skill acquisitions increase skill level
- Blade Combat, Gun Combat, and Vehicle results pause for the required specific expertise choice
- rank/service automatic skills, each granted only once
- service-term completion, age advancement, service years, and completed-term history
- transition to reenlistment (or muster out after optional-rule injury)
- serializable chargen state
- deterministic dice injection for tests

Not implemented yet:

- reenlistment resolution
- aging throws
- retirement / mandatory reenlistment
- mustering-out cash and benefit tables
- weapon/vehicle specialization catalogs and validation
- full skill-effect rules
- UI or persistence adapters

## Tests

From this package directory:

```text
npm test
```

From the Graycloak monorepo root, the normal workspace test command should include this package automatically because the workspace already includes `packages/*`.


## v0.2.1 packaging hotfix

Adds a public-API integrity regression test covering the acquired-skill and term-completion exports. No Traveller rules behavior changed from v0.2.0.
