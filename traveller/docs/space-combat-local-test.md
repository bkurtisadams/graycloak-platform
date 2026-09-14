# Traveller v0.132.0 — local space combat and vector movement slice

Use a disposable local campaign. No Git commit or push is needed to test.
This is not the complete Book 2 implementation.

## Install

The ZIP contains only changed/new files, rooted at `traveller/` and `packages/`.
Copy them into `C:\graycloak-platform`, merging folders and replacing the matching files.
The matching browser vendor files are included. The usual serve-traveller.bat can
also regenerate the vendor copy from packages/classic-traveller-rules.
Hard-refresh after starting the server. The main page should show v0.132.0.

## Test commands (from C:\graycloak-platform)

    node --test packages/classic-traveller-rules/tests/*.test.js
    node --test traveller/test/*.test.mjs

The page-load and map DOM tests require the project's jsdom dev dependency.
Without jsdom those checks skip; rules tests still run. No emulator is needed
for this referee-only local slice.

## Start a repeatable encounter

1. Open a disposable campaign with an active ship. Fit a beam laser to its turret
   if you want to test shooting; an unarmed ship can still test movement.
2. Open the right-side COMBAT tab. Click START REFEREE SPACE ENCOUNTER.
3. Confirm the live encounter, then choose OK for the clear-space vector map
   (Cancel selects abbreviated mode). The opponent is an armed scout.
4. Initial placement defaults to player (-20,0), velocity (2,0), opponent (20,5),
   velocity (-2,0). Coordinates and velocity are in thousands of miles and
   thousands of miles per ten-minute turn, respectively.
5. Before any action, choose either ship and expand INITIAL POSITION / VELOCITY
   to set exact initial conditions. After the first action this setup closes.

## Movement

- The hostile scout is intruder and moves first. Select it in the map dropdown.
- Enter X=1 G, Y=0 G: the initial opponent velocity -2 becomes 0, so it stops
  at (20,5). COMMIT MANEUVER is disabled after committing once.
- Entering X=3 G on the 2 G scout must fail without movement.
- ADVANCE coasts every uncommitted ship on the phasing side. A ship retains its
  velocity with zero thrust; it does not stay still unless its velocity is zero.
- On the player's first movement phase, X=1 G, Y=0 G changes velocity 2 to 4
  and moves from (-20,0) to (-16,0).
- Click the map to propose an endpoint; this calculates thrust, not teleportation.
- Laser range modifiers are computed from the current positions: over 150, -2;
  over 300, -5. The map fits all ships and projected endpoints automatically.

## Fire, programs, and escape

- Allocate a turret and RESOLVE FIRE. Selecting it again in the same phase must
  report it has already been used. ADVANCE is still available to pass a phase.
- Destroyed computers cannot fire. Damaged computers test operation and retain
  their result for the phase; the engine log records the result.
- Target plus Return Fire fills Model/1's two-point CPU. For ordinary laser fire
  this slice automatically chooses the better available Predict/Gunner Interact
  benefit. A manual CPU-priority editor is not included yet.
- Reprogramming now provides checkboxes and APPLY LOADOUT. Oversized loaded
  sets or wrong-side requests fail; carried software is not erased when unloaded.
- BREAK OFF requests a referee allowance. Here one shot means one individual
  laser attack, hit or miss. Zero marks escape immediately. This counting
  convention is a referee interpretation, not an additional printed formula.
- In abbreviated mode each functioning launcher can launch at most once per phase.
  ECM and anti-missile resolution cannot be retried in the same phase.

## Local reload and close

1. Advance a phase, allocate a target, and refresh. Reopen COMBAT if necessary.
   Phase, ship damage, ordnance, vector state and saved target selections return.
   Uncommitted thrust input is only a preview and is not saved.
2. CLOSE COMBAT records a referee-called outcome if no outcome was established.
   Final player ship, completed-turn elapsed campaign time, closed checkpoint and
   archive are stored in a single local registry write.
3. Reload. The closed encounter must not reopen or deduct ammunition again.
   Final computer loadout is reused for the same player's next ship encounter.
4. A new encounter preserves the prior archive. These archives currently have no
   dedicated reader UI and are NOT included in campaign JSON exports or cloud homes.

## Explicit boundaries and remaining work

- Active combat is local to one referee browser; no multi-tab or multiplayer
  concurrency guarantee. Only use one active referee tab while testing.
- Active checkpoints and archives are outside portable/cloud campaign bundles.
  Exporting a campaign does not back up an in-progress ship fight.
- Vector mode supports clear-space ship movement and laser ranges only: no gravity,
  detection automation, vector missiles, vector sand, or jump escape. Ordnance is
  refused in vector mode rather than applying abbreviated contact to a map.
- Abbreviated missile automatic contact and -3 per sand canister remain clearly
  labelled extensions. Launcher reload timing still needs fuller modelling.
- Crew expertise import, compartment/suit details, damage control, Double Fire,
  Selective programs, full CPU sharing/priorities, and multiplayer station authority
  still need follow-up work. This release does not claim to fix the entire audit.
- Initial combat readiness still uses the existing default program package and
  depressurized setup; full referee starting-condition controls are not included.
- Browser visual QA could not run because the Chromium download failed.
  Real-page module-load and map DOM interaction tests did run successfully.

## Suggested commit message (after local acceptance)

feat(traveller): add local ship combat checkpoints and clear-space vector movement

Prevent repeated turret/launcher/interception use, gate computer-dependent
combat actions, enforce multi-target capacity, and connect laser escape counts.
Add phase-aware maneuver previews, configurable starting vectors and range DMs.
Persist referee combat checkpoints and atomic local close results. Add working
loadout controls, a referee encounter start button and regression coverage.
Keep vector ordnance and multiplayer combat explicitly outside this first slice.
