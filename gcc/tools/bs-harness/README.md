# bs-harness — headless self-test runner for gcc/battlesystem-board.html

Runs the board's boot self-tests (and optional functional checks) under jsdom, without a browser.

    cd tools/bs-harness && npm install jsdom@24
    node run.mjs <repo-root>            # prints "[BS-BOARD] self-tests: N ok · FAILED: ..."
    node extra.mjs && node run_extra.mjs <repo-root>   # appends checks.js to the run (PASS/FAIL lines)

How it works: the board's `<script type="module">` is rewritten as a classic script, the engine is
imported from gcc/engine/index.js and injected as window.__ENGINE__, a few SVG/dialog APIs are shimmed,
and `window.__S()` / `window.__G(name)` expose module-scope state and functions to checks.

Known harness-only failure: "[UI/v0.56.18] battlefield drag suppresses native SVG text selection"
(jsdom does not compute user-select). Everything else should pass; baseline 1096 ok at v0.61.13 (1019 at v0.61.6.4, 1017 at v0.61.6.3, 1008 at v0.61.6.2, 1004 at v0.61.6.1, 1003 at v0.61.6, 996 at v0.61.5.4, 954 at v0.61.2.1). `node run.mjs .` from the repo root works — the root is path.resolve()d.

dbg*.js are ad-hoc functional checks used during v0.58–v0.61 (multi-target, skirmish, cues, rail,
figure selection/targeting); wrap one with the same pattern as extra.mjs to run it.

## crossroads.mjs — scenario regression fixture

`node gcc/tools/bs-harness/crossroads.mjs .` → expect `[CROSSROADS] 30/30 ok` (exit 0).

The rulebook's Basic Game scenario, *Battle at the Crossroads*, played headless
with stubbed dice. Kurt's 2026-08-30 browser run (board v0.61.7.9) is the
reference, but every asserted number was worked by hand from the CRT, Tables
12–14 and the Army Roster Sheets rather than copied from the board's output, so
a disagreement means the board changed, not that the fixture drifted.

Covers: the eight-unit roster (figures, AR, ML, DL, ratio, MV, AC), the 90×48″
field, Table 12/14 movement with no missile troops, two hand-checked CRT
exchanges in both directions (including the daylight +1 and the fractional-HD
carry), the MM racial modifiers and their separation from Table 7 hatred, and
Table 6 discipline.

Dice: stub `w.Math.random` (the page has its own global — `Math.random` in the
harness does nothing). Queue exact faces with `q(d(face,sides), …)`. The
fallback when the queue empties is a small PRNG, **not** a constant: a constant
makes tied initiative re-roll forever.
