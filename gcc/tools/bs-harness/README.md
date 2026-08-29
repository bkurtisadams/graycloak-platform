# bs-harness — headless self-test runner for gcc/battlesystem-board.html

Runs the board's boot self-tests (and optional functional checks) under jsdom, without a browser.

    cd tools/bs-harness && npm install jsdom@24
    node run.mjs <repo-root>            # prints "[BS-BOARD] self-tests: N ok · FAILED: ..."
    node extra.mjs && node run_extra.mjs <repo-root>   # appends checks.js to the run (PASS/FAIL lines)

How it works: the board's `<script type="module">` is rewritten as a classic script, the engine is
imported from gcc/engine/index.js and injected as window.__ENGINE__, a few SVG/dialog APIs are shimmed,
and `window.__S()` / `window.__G(name)` expose module-scope state and functions to checks.

Known harness-only failure: "[UI/v0.56.18] battlefield drag suppresses native SVG text selection"
(jsdom does not compute user-select). Everything else should pass; baseline 954 ok at v0.61.2.1.

dbg*.js are ad-hoc functional checks used during v0.58–v0.61 (multi-target, skirmish, cues, rail,
figure selection/targeting); wrap one with the same pattern as extra.mjs to run it.
