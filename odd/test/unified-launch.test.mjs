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
  assert.match(code, /if \(lobby\.view\) \{ renderWorldStage\(el, g, uid\); return; \}/, "both roles see the scene");
  assert.match(code, /if \(lobby\.view\?\.dungeon && !PLAYER\)/, "a dungeon draft is the referee's alone");
  assert.match(body("defaultScene"), /if \(!PLAYER\) return \{ id: null/, "the referee opens on the kingdom map");
});

test("the sidebar is five tabs, Fights folded into the Tracker (approved mockup 18 Nov 2026)", () => {
  const tabs = [...grid.matchAll(/class="sb-icon" data-sbtab="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(tabs, ["chat", "party", "tracker", "scenes", "settings"]);
  for (const id of ["tkFight", "tkNew", "tkEnd", "acSearch", "acRoll", "scSearch", "actorsList"]) assert.ok(grid.includes(`id="${id}"`), id);
  assert.match(body("renderGameSettings"), /"My profile"[\s\S]*"Players and invitations"[\s\S]*"Sign out"/, "Settings is three buttons; the forms are dialogs");
  assert.doesNotMatch(body("renderRoster"), /xp \\u00b7 next|<table/, "one row per character; xp and gp live on the sheet");
});

test("a character underground is shown the level, and the party at the ruin can go down (pass 18)", () => {
  assert.match(body("renderLobbyStage"), /if \(lobby\.view\?\.delve\) \{ renderDelveStage\(el, g, uid\); return; \}/);
  assert.match(body("openWorld"), /if \(c\?\.under\) \{ openDelve\(c\.under\.lid, id\); return; \}/);
  assert.match(body("defaultScene"), /if \(pick\?\.under\)/);
  assert.match(body("partyBarHtml"), /id="pbEnter"/);
  assert.match(body("sceneAt"), /kind: "dungeon"[\s\S]*kind: "village"/, "a hex's scene: an open dungeon level, or a settlement");
  // v1.572.00: the village's markup lives in village-ui.mjs; the referee looking in leaves by the map's button, a party by the dock's
  const village = readFileSync(new URL("../village-ui.mjs", import.meta.url), "utf8");
  assert.match(village, /export function villageMapHtml[\s\S]*?id="wLeaveScene"/, "a town scene is left by its Leave button");
  assert.match(village, /export function villageDockHtml[\s\S]*?id="wLeaveScene"[\s\S]*?Leave by the road/);
  assert.match(body("hexMapHtml"), /class="w-pt\$\{on \? " on" : ""\}" data-hexk=/, "one Party token to a hex");
});

test("the header shows the page's build, and the server in the repo is new enough for the page", async () => {
  const { SERVER_BUILD } = await import("../functions/world-service.mjs");
  const n = (s) => { const m = /^v(\d+)\.(\d+)\.(\d+)$/.exec(s); return Number(m[1]) * 1e6 + Number(m[2]) * 1e3 + Number(m[3]); };
  const page = /const BUILD = "(v\d+\.\d+\.\d+)";/.exec(grid)?.[1], need = /const SERVER_NEEDED = "(v\d+\.\d+\.\d+)";/.exec(grid)?.[1];
  assert.ok(n(need) <= n(SERVER_BUILD) && n(SERVER_BUILD) <= n(page), `${need} <= ${SERVER_BUILD} <= ${page}`);
  assert.ok(grid.includes('<span class="ver" id="ver"></span>'));
});

test("a fight's viewer is the player himself or the referee", () => {
  assert.match(grid, /const viewer = PLAYER \? api\.user\?\.uid : "referee";/);
});

test("a fight the game opened: found by the monster's key, and anyone in it goes back to the dungeon when it is over", () => {
  assert.ok(grid.includes("MONSTERS.find((x) => x.key === e.monsterKey)"));
  assert.ok(grid.includes('function autoOver() { return !!(online.on && online.header?.auto && state.phase === "over"); }'));
  assert.ok(grid.includes('if (autoOver()) { backToScene(); return; }'));
  assert.ok(grid.includes("The fight opens on this part of the level; the game runs the monsters."));
});

test("village-ui.mjs loads on its own and gives the page what it draws the village with (v1.572.00)", async () => {
  const vg = await import("../village-ui.mjs");
  for (const name of ["VILLAGE_SPOTS", "villageSpots", "villageSpotName", "villageSvg", "villageDoorsHtml", "villageMapHtml", "villageTokensHtml", "doorCardHtml", "innPanelHtml", "tradePanelHtml", "villageDockHtml", "VILLAGE_CSS"]) assert.ok(vg[name] != null, `village-ui.mjs exports ${name}`);
  assert.match(vg.villageSvg({ inn: "The Ox and Ford", market: true }), /The Ox and Ford[\s\S]*Market/);
  assert.doesNotMatch(vg.villageSvg({}), /Market<|innkeeper/, "a place with no inn or market is drawn without them");
  assert.match(vg.doorCardHtml("road", {}, "Langstead"), /Leave by the road/);
  assert.match(grid, /import \* as vg from "\.\/village-ui\.mjs";/);
});

test("the inn's hiring box (v1.574.00): the men in service, those who answered, and the notices, from the rules' own numbers", async () => {
  const vg = await import("../village-ui.mjs"), rules = await import("../../packages/odd-chainmail-rules/index.js");
  const c = { id: "c1", name: "Brom", coins: { gp: 342 }, hp: 4, maxHp: 4, items: [], troops: { men: { lightFoot: 3 }, paidTo: 38 }, notice: { place: "Langstead", day: 8, found: { heavyFoot: 5 } } };
  const env = { rs: rules.roster, may: () => true, busy: false, view: { at: "inn" }, heal: rules.wilderness.healingAfter, dayOf: () => 12 };
  const html = vg.innPanelHtml(env, c, [c], { kind: "village", inn: "The Ox and Ford" }, "Langstead");
  assert.match(html, /In his service · 6 gp a month · paid to day 38/); assert.match(html, /data-ma-go="lightFoot"/);
  assert.match(html, /data-ma-hire="heavyFoot"[^>]*>Hire for 13 gp</, "five Heavy Foot for the 26 days left to pay day");
  assert.match(html, /data-ma-type="archer"/); assert.doesNotMatch(html, /data-ma-type="longbow"/, "a village has no Longbowmen");
  assert.match(html, /At 100 gp each type has 50 chances in 100/);
  const late = vg.innPanelHtml({ ...env, dayOf: () => 16 }, c, [c], { kind: "village", inn: "The Ox and Ford" }, "Langstead");
  assert.doesNotMatch(late, /data-ma-hire/, "those who answered wait a week, no longer");
  const grid = readFileSync(new URL("../combat-grid.html", import.meta.url), "utf8");
  for (const op of ['worldOp("notice"', 'put("hire"', 'put("dismiss"']) assert.ok(grid.includes(op), op);
});

test("hired men go into the referee's fights with their master, and morale names them rightly (v1.576.00)", () => {
  const grid = readFileSync(new URL("../combat-grid.html", import.meta.url), "utf8");
  assert.match(grid, /function addMenOf\(c\)/);
  assert.match(grid, /for \(const c of party\) addMenOf\(c\);/, "the fight opened from a meeting on the road");
  assert.match(grid, /for \(const c of add\) addMenOf\(c\);/, "Setup's Add the party");
  assert.ok(grid.includes("esc(e.plural ?? `${e.name}s`)"), "Heavy Foot, not Heavy Foots");
});
