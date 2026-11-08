// odd/test/unified-launch.test.mjs — one table link for every role (pass 11), checked against the code as it stands
// (rewritten Nov 2026: the first version tested a patch that was never merged as written).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const grid = readFileSync(new URL("../combat-grid.html", import.meta.url), "utf8");
/** The source of one top-level function in combat-grid.html, up to the next top-level function. */
function body(name) {
  const start = grid.search(new RegExp(`\\n(async )?function ${name}\\(`));
  assert.ok(start >= 0, `combat-grid.html has ${name}()`);
  const rest = grid.slice(start + 1), next = rest.slice(1).search(/\n(async )?function [A-Za-z0-9_]+\(/);
  return next < 0 ? rest : rest.slice(0, next + 1);
}
const before = (code, a, b, why) => { const i = code.indexOf(a), j = code.indexOf(b); assert.ok(i >= 0 && j >= 0 && i < j, why); };

test("the lobby sends a first join and a returning member to the same table link", () => {
  assert.match(index, /location\.replace\(`combat-grid\.html\?welcome=1&c=\$\{encodeURIComponent\(cid\)\}/);
  assert.match(index, /location\.replace\(`combat-grid\.html\?c=\$\{encodeURIComponent\(cid\)\}/);
  const launches = index.match(/location\.replace\(`combat-grid\.html[^`]*`/g) ?? [];
  assert.ok(launches.length >= 2 && launches.every((u) => !/[?&]player\b/.test(u)), "no launch goes to a ?player page");
});

test("the table reads the role from the game it opened, before any watcher starts", () => {
  const code = body("startTable");
  before(code, 'api.game("open", table.cid)', "setTableRole(!isRefOf(r.game, uid))", "the game is opened before the role is set");
  before(code, "setTableRole(!isRefOf(r.game, uid))", "startTableWatchers()", "the role is set before the watchers start");
  before(code, "if (!r.ok) { table.started = false;", "setTableRole(", "a refused open sets no role and starts nothing");
  assert.match(body("startTableWatchers"), /\{ all: !PLAYER \}/, "a player watches only the characters he may see");
});

test("a promotion or demotion switches the watchers in place, with no new page", () => {
  assert.match(body("applyGame"), /if \(nowPlayer !== PLAYER\) \{ changeTableRole\(nowPlayer\); return; \}/);
  const change = body("changeTableRole");
  for (const call of ["setTableRole(player)", "startTableWatchers()", "stopLobbyChat()"]) assert.ok(change.includes(call), `changeTableRole calls ${call}`);
  assert.doesNotMatch(change, /location\.(replace|href|assign)/);
  assert.match(body("startTableWatchers"), /^function startTableWatchers\(\) \{\n\s*stopTableWatchers\(\);/, "the old watchers stop first");
});

test("signing out stops the watchers and the presence heartbeat, then goes back to the lobby", () => {
  const stop = body("stopTable");
  for (const part of ["stopTableWatchers()", "stopLobbyChat()", "clearInterval(table.here)", 'removeEventListener("visibilitychange", table.hereFn)']) assert.ok(stop.includes(part), `stopTable: ${part}`);
  assert.match(body("goOnline"), /if \(online\.api\.user\) startTable\(\); else \{ stopTable\(\); location\.replace\(`index\.html\?c=/);
});

test("the referee and the players get the same stage: the scene, with a player's onboarding cards first", () => {
  const code = body("renderLobbyStage");
  before(code, "if (PLAYER && renderPlayerOnboarding(el, g, uid))", "lobby.view = defaultScene(uid)", "a player's welcome and first roll come before the scene");
  assert.match(code, /if \(lobby\.view\) \{ renderWorldStage\(el, g, uid\); renderBoardPanel\(\); return; \}/, "both roles see the scene, the board beside it");
  assert.match(code, /if \(lobby\.view\?\.dungeon && !PLAYER\)/, "a dungeon draft is the referee's alone");
  assert.match(body("defaultScene"), /if \(!PLAYER\) return \{ id: null/, "the referee opens on the kingdom map");
});

test("a fight's viewer is the player himself or the referee", () => {
  assert.match(grid, /const viewer = PLAYER \? api\.user\?\.uid : "referee";/);
});
