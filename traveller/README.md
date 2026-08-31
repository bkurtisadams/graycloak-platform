# Graycloak Traveller

Standalone browser client for the original-universe Classic Traveller project.

## v0.5.0 scope

The first playable slice is the Book 1 character generator in `client/`.

The browser client imports the pure rules engine from `../packages/classic-traveller-rules/` and uses only the public lifecycle/serialization API. The client does not contain enlistment targets, survival targets, career tables, aging tables, or mustering-out tables.

## Run locally

From the monorepo root, start any static HTTP server. For example, with Python installed:

```text
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/traveller/client/
```

Opening `index.html` directly as a `file://` URL is not recommended because browser ES-module security rules may block the import of the rules package.

## Current client features

- generate a new age-18 character and UPP
- enter/edit character name
- choose a service and drive chargen entirely from `getAvailableActions()`
- enlistment, draft, terms, survival, commission, promotion, skills, aging, reenlistment, retirement, and mustering out
- specialization prompts when required by the engine
- visible personnel record, current procedure, service history, and generation log
- export validated character JSON
- import validated character JSON and resume chargen

No Firebase, accounts, campaign world, trading, combat, or server persistence are included in v0.5.0.
