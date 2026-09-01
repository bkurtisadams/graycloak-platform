# Graycloak Traveller

Standalone browser client for the original-universe Classic Traveller project.

## v0.7.1 scope

The browser retains the complete Book 1 character-generation flow and the v0.7.0 Type S Scout/Courier Ship Document handoff. v0.7.1 is a focused usability pass.

The client imports the pure rules engine from `../packages/classic-traveller-rules/`. It does not duplicate Book 1 career tables or Book 2 ship specifications in browser code.

## Run locally

From the monorepo root:

```text
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/traveller/client/
```

Do not type the URL into Command Prompt; enter it in the browser address bar.

## v0.7.1 browser flow

After character generation is complete:

- `[ EXPORT CHARACTER ]` exports gameplay Character Document v2
- a character with an available Scout Ship benefit receives `[ ASSIGN SCOUT SHIP ]`
- assignment creates a separate Type S Ship Document and links the Character Document to it by ship ID
- the Ship's Register displays the source-backed Type S specifications and Scout reserve authority terms
- ship name and registry may be entered without changing canonical design data
- `[ EXPORT SHIP ]` exports Ship Document v1

Usability additions in v0.7.1:

- `[ RANDOM ]` beside the character name suggests a broad provisional human name
- `[ RANDOM ]` beside the ship name suggests a ship name
- `[ GENERATE ]` beside registry creates a Type S candidate in the project format `S-#####`
- generators never run automatically and never prevent manual entry
- the generated registry format is a Graycloak project convention, not a Classic Traveller RAW format
- the Ship's Register now shows the standard Type S engineering duty assigned to its one-person crew while explicitly noting that the duty does not grant Engineering skill

For a duplicate Scout Ship result, the final personnel record shows the number of benefit rolls, one effective reserve assignment, and the number of additional results which have no further effect under Book 1.

## Source-backed Type S data

The canonical design comes from Classic Traveller Book 2 p.19 and the Facsimile errata. In particular, the standard Type S uses a Model/1bis computer. The later Book 2 combat data-card example is not used to overwrite the standard-design specification.

No Firebase, accounts, campaign world, trade loop, travel execution, personal combat, or starship combat are included in v0.7.1.
