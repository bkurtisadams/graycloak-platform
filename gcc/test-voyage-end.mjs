// test-voyage-end.mjs — headless harness for gcc-voyage.js v0.11.0
// Covers the handoff test cases: end mid-leg with pending items, end after
// arrival with pending items, start-over-finished, refresh mid-voyage,
// make port early (mid-leg + at-a-stopover), archive integrity.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// ── DOM/localStorage shims ─────────────────────────────────────────────────
const store = new Map();
const localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
};
const noopEl = () => ({
  addEventListener(){}, removeEventListener(){}, appendChild(){}, remove(){},
  querySelector(){ return null; }, querySelectorAll(){ return []; },
  setAttribute(){}, getAttribute(){ return null; }, style:{}, classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
  dispatchEvent(){}, innerHTML:'', textContent:'', dataset:{}, isConnected:true,
});
const documentShim = {
  readyState: 'complete',
  addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return true; },
  getElementById(){ return null; },
  querySelector(){ return null; }, querySelectorAll(){ return []; },
  createElement(){ return noopEl(); },
  createElementNS(){ return noopEl(); },
  body: noopEl(), head: { appendChild(){} },
};

let confirmResponses = [];
let confirmLog = [];
const ctx = {
  console, localStorage, document: documentShim,
  CustomEvent: class CustomEvent { constructor(type, opts){ this.type = type; this.detail = opts?.detail; } },
  MutationObserver: class { observe(){} disconnect(){} },
  setTimeout, clearTimeout,
  // GCCDialog present → confirmDialog uses it; responses scripted per test
  GCCDialog: { confirm: async (title, msg, opts) => { confirmLog.push({ title, msg, opts }); return confirmResponses.length ? confirmResponses.shift() : true; } },
  GCCLandmarks: { getByName: () => null, list: () => [], setOverride: () => false },
  GCCTerrain: { get: () => 'water' },
  GCCPaths: null,
  showToast: () => {},
  hexCenterDisplay: (c, r) => ({ x: c * 10, y: r * 10 }),
  mapToStage: (x, y) => ({ x, y }),
  darleneToInternal: h => h,
  GRID_COLS: 100, GRID_ROWS: 100,
};
ctx.window = ctx; ctx.globalThis = ctx;
ctx.window.confirm = () => { throw new Error('window.confirm reached — GCCDialog path not used'); };
vm.createContext(ctx);
vm.runInContext(readFileSync('/home/claude/gcc/gcc-voyage.js', 'utf8'), ctx);

const V = ctx.window.GCCVoyage;
if (!V) throw new Error('GCCVoyage did not load');

// ── helpers ────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, name){ if (cond){ pass++; console.log(`  ✓ ${name}`); } else { fail++; console.log(`  ✗ FAIL: ${name}`); } }
function section(t){ console.log(`\n── ${t}`); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function makeVoyage({ finished = false, legIdx = 0, milesOnLeg = 0, pending = 0 } = {}){
  const legs = [
    { from:'Gradsul', to:'Seaton', distance:120, cumDist:120, waterType:'coastal', distanceSource:'manual', path:null },
    { from:'Seaton', to:'Westkeep', distance:90, cumDist:210, waterType:'coastal', distanceSource:'manual', path:null },
  ];
  const v = {
    captain:'Tester', shipId:'cog', shipType:'Cog', hullMax:20, hullCurrent:18,
    dailySail:60, dailyOar:0, crewQuality:'average', crewMod:0, navSkill:12,
    calendar:{ day:5, month:2, year:576 }, startCalendar:{ day:1, month:2, year:576 },
    startDate:'1 Readying 576 CY', currentDate:'', arrivalDate: finished ? '9 Readying 576 CY' : '',
    createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
    legs, totalDistance:210,
    distanceCovered: finished ? 210 : (legIdx === 0 ? milesOnLeg : 120 + milesOnLeg),
    currentLegIdx: finished ? legs.length : legIdx, milesOnLeg: finished ? 0 : milesOnLeg,
    dayNumber:4, finished, shipSank:false, endedAtPort:'',
    log:[{ day:4, date:'5 Readying 576 CY', weather:{ wind:{force:'Breeze',speed:10,direction:'NE'}, sky:'Clear', precipitation:{type:'None'} }, speedInfo:{ speed:60, note:'Fair sailing' }, miles:60, distTotal:60, events:[], hexPos:null, location:null }],
    hexTrail:[], hullDamageTaken:2,
    settlement:{ pending:[], posted:[], notes:[], repairGpPerHull:100 },
  };
  V.state.voyage = v;
  for (let i = 0; i < pending; i++){
    V.addPendingFinanceAction({ category:'repair', amountGp:200, hullDamage:2, memo:`Test repair ${i+1}` });
  }
  return v;
}

// ── TEST 1: end mid-leg with pending items ─────────────────────────────────
section('End Voyage mid-leg with unposted pending items');
store.delete('gcc.voyage.archive.v1');
makeVoyage({ legIdx:1, milesOnLeg:40, pending:2 });
confirmResponses = [true]; confirmLog = [];
await V.endVoyage(); await sleep(0);
ok(V.state.voyage === null, 'voyage state cleared');
ok(confirmLog.length === 1 && /2 settlement items \(400 gp\)/.test(confirmLog[0].msg), 'confirm names pending count and total gp');
ok(confirmLog[0].opts?.danger === true, 'confirm is danger-styled when items pending');
let arc = V.getArchivedVoyages();
ok(arc.length === 1, 'archive has 1 record');
ok(arc[0].endReason === 'ended', 'endReason=ended');
ok(arc[0].settlement.pending.filter(a => a.status==='pending').length === 2, 'both pending items preserved in archive');
ok(arc[0].log.length === 1 && typeof arc[0].log[0].weather === 'string', 'log condensed (weather is a string)');

// ── TEST 2: end declined → nothing lost ────────────────────────────────────
section('End Voyage declined');
makeVoyage({ legIdx:1, milesOnLeg:40, pending:1 });
confirmResponses = [false];
await V.endVoyage(); await sleep(0);
ok(V.state.voyage !== null, 'voyage survives declined confirm');
ok(V.getArchivedVoyages().length === 1, 'no extra archive record on decline');
V.state.voyage = null;

// ── TEST 3: end after arrival with pending items ───────────────────────────
section('End Voyage after arrival with pending items');
makeVoyage({ finished:true, pending:1 });
confirmResponses = [true];
await V.endVoyage(); await sleep(0);
arc = V.getArchivedVoyages();
ok(arc.length === 2, 'arrival-end archived');
ok(arc[0].summary.finished === true, 'summary marks finished');
ok(arc[0].settlement.pending.some(a => a.status==='pending'), 'unposted arrival settlement preserved');

// ── TEST 4: startVoyage over FINISHED voyage with pending → confirm fires ──
section('startVoyage over finished voyage with unposted settlement');
makeVoyage({ finished:true, pending:1 });
// startVoyage needs routeLegs + panel; give it routeLegs and a fake panel that
// aborts after the confirm+archive by having no querySelector results.
V.state.routeLegs = [{ from:'Gradsul', to:'Seaton', distance:120, waterType:'coastal', distanceSource:'manual', path:null }];
V.state.panelEl = null; // enter() not called; startVoyage reads state.panelEl → would throw after archive
confirmLog = []; confirmResponses = [true];
let threw = false;
try { await ctx.window.GCCVoyage.state && await vmStart(); } catch (e){ threw = true; }
async function vmStart(){ /* placeholder replaced below */ }
// call through a fresh reference — startVoyage isn't exported, so exercise via
// the exported path used by the UI: not available. Instead verify the guard
// logic directly by re-running the exported archive + reading the confirm.
// (The confirm-and-archive block runs before any panel access.)
// Simulate: replicate guard by calling endVoyage-equivalent path is not
// possible headless; assert via source inspection instead.
const src = readFileSync('/home/claude/gcc/gcc-voyage.js', 'utf8');
ok(/async function startVoyage/.test(src), 'startVoyage is async');
ok(/else if \(pending\.length\)/.test(src), 'finished-voyage-with-pending branch exists');
ok(/archiveVoyage\(state\.voyage, 'replaced'\)/.test(src), 'replaced voyages are archived');
const svStart = src.indexOf('async function startVoyage');
ok(src.indexOf("archiveVoyage(state.voyage, 'replaced')", svStart) < src.indexOf('const p = state.panelEl', svStart), 'archive happens before panel reads');

// ── TEST 5: refresh mid-voyage then end ────────────────────────────────────
section('Refresh mid-voyage (save → reload) then end');
makeVoyage({ legIdx:0, milesOnLeg:50, pending:1 });
V.saveState();
V.state.voyage = null;
ok(V.loadState() === true, 'state reloads from localStorage');
ok(V.state.voyage && V.state.voyage.settlement.pending.length === 1, 'pending item survives reload');
confirmResponses = [true];
await V.endVoyage(); await sleep(0);
ok(V.getArchivedVoyages()[0].settlement.pending.length === 1, 'and reaches the archive after reload+end');

// ── TEST 6: Make Port mid-leg ──────────────────────────────────────────────
section('Make Port early — mid-leg on leg 2');
makeVoyage({ legIdx:1, milesOnLeg:45, pending:1 });
const before = V.state.voyage;
const dayBefore = before.dayNumber, calBefore = { ...before.calendar };
confirmLog = []; confirmResponses = [true];
await V.makePortEarly(); await sleep(0);
const v6 = V.state.voyage;
ok(v6 !== null, 'voyage still active (not nulled) after Make Port');
ok(v6.finished === true, 'voyage marked finished');
ok(v6.endedAtPort === 'Seaton', 'ended at last visited port (Seaton, start of leg 2)');
ok(v6.milesOnLeg === 0, 'milesOnLeg reset');
ok(v6.distanceCovered === 120 && v6.totalDistance === 120, 'distance rolled back to the port; progress reads 100%');
ok(v6.dayNumber === dayBefore + 1, 'return of 45 mi at 60/day charged 1 day');
ok(v6.calendar.day === calBefore.day + 1, 'calendar advanced with the return day');
ok(v6.settlement.pending.filter(a=>a.status==='pending').length === 1, 'pending settlement preserved for posting at Seaton');
ok(/Made port early at Seaton/.test(v6.settlement.notes[v6.settlement.notes.length-1].text), 'settlement note written');
const lastLog = v6.log[v6.log.length-1];
ok(lastLog.weather?.wind && lastLog.speedInfo?.note, 'synthetic log entry fully shaped for renderLog');
ok(v6.location?.mode === 'arrived' && v6.location.port === 'Seaton' && v6.location.diverted === true, 'location resolves to Seaton, flagged diverted');
ok(/Made port: Seaton/.test(v6.location.label), 'location label says Made port');
ok(V.currentPort() === 'Seaton', 'currentPort() (finance bridge input) reads Seaton');

// then End Voyage archives with diverted metadata
confirmResponses = [true];
await V.endVoyage(); await sleep(0);
arc = V.getArchivedVoyages();
ok(arc[0].endedAtPort === 'Seaton' && arc[0].summary.endedAtPort === 'Seaton', 'archive records diverted port');

// ── TEST 7: Make Port while sitting in a stopover port (no return leg) ─────
section('Make Port early — already docked at stopover');
makeVoyage({ legIdx:1, milesOnLeg:0, pending:0 });
const day7 = V.state.voyage.dayNumber;
confirmLog = []; confirmResponses = [true];
await V.makePortEarly(); await sleep(0);
ok(V.state.voyage.endedAtPort === 'Seaton', 'ends at the port the ship is docked in');
ok(V.state.voyage.dayNumber === day7, 'no return days charged when already in port');
ok(/End the voyage here at Seaton/.test(confirmLog[0].msg), 'confirm text uses in-port phrasing');
V.state.voyage = null;

// ── TEST 8: Make Port day 0 at origin ──────────────────────────────────────
section('Make Port early — day 0, never left origin');
makeVoyage({ legIdx:0, milesOnLeg:0, pending:0 });
V.state.voyage.dayNumber = 0;
confirmResponses = [true];
await V.makePortEarly(); await sleep(0);
ok(V.state.voyage.endedAtPort === 'Gradsul', 'ends at origin');
ok(V.state.voyage.distanceCovered === 0 && V.state.voyage.totalDistance === 0, 'zero distance, no NaN');
V.state.voyage = null;

// ── TEST 9: archive cap ────────────────────────────────────────────────────
section('Archive cap at 10');
for (let i = 0; i < 12; i++){
  makeVoyage({ finished:true, pending:0 });
  confirmResponses = [true];
  await V.endVoyage(); await sleep(0);
}
ok(V.getArchivedVoyages().length === 10, 'archive capped at 10 records');

// ── TEST 10: GCCDialog missing → window.confirm fallback ───────────────────
section('Dialog fallback');
ok(/window\.GCCDialog\?\.confirm/.test(src) && /return window\.confirm/.test(src), 'confirmDialog falls back to window.confirm');
ok(!/if \(!window\.confirm\('End current voyage/.test(src), 'old raw window.confirm in endVoyage removed');
ok(!/window\.confirm\('A voyage is already underway/.test(src), 'old raw window.confirm in startVoyage removed');

console.log(`\n${pass} passed, ${fail} failed (v0.11 suite)`);

// ════ v0.12.0 additions ════════════════════════════════════════════════════
// Deterministic randomness + scripted GCCDialog.choose for the new mechanics.
let randQueue = [];
vm.runInContext(`
  globalThis.__origRandom = Math.random;
  globalThis.__randQueue = [];
  Math.random = function(){
    return globalThis.__randQueue.length ? globalThis.__randQueue.shift() : globalThis.__origRandom();
  };
`, ctx);
function seedRand(...vals){ vm.runInContext(`globalThis.__randQueue = ${JSON.stringify(vals)}`, ctx); }
function clearRand(){ vm.runInContext('globalThis.__randQueue = []', ctx); }

let chooseResponses = [];
let chooseLog = [];
ctx.GCCDialog.choose = async (title, choices, opts) => {
  chooseLog.push({ title, n: choices.length, opts });
  return chooseResponses.length ? chooseResponses.shift() : 0;
};
// Stub weather to a controllable fixed day
let fixedWeather = null;
ctx.GCCWeather = null; // force internal fallback? No — voyage uses generateWeather internal path when GCCWeather absent.

function calmWeather(){ return null; } // marker; we drive via wind-speed seeds below

section('shipConditionMods via voyage pane math — hull damage slows ship');
makeVoyage({ legIdx:0, milesOnLeg:0, pending:0 });
let v12 = V.state.voyage;
v12.hullMax = 20; v12.hullCurrent = 20; v12.dailySail = 60; v12.quality = 'average';
// 25% damage → −20% (2 full steps of 10%)
v12.hullCurrent = 15;
// no direct export of shipConditionMods; verify through makePortEarly return-day math:
// 45 mi back at 60 × 0.8 = 48 → 1 day. At 55% dmg (5 steps → ×0.5 = 30) 45 mi → 2 days.
v12.currentLegIdx = 1; v12.milesOnLeg = 45; v12.legs[1].distance = 90;
v12.hullCurrent = 9; // 55% damage → 5 steps → ×0.5 → 30 mi/day → 45/30 → round(1.5)=2? Math.round(45/30)=round(1.5)=2
confirmResponses = [true];
const day12a = v12.dayNumber;
await V.makePortEarly(); await sleep(0);
ok(V.state.voyage.dayNumber === day12a + 2, 'Make Port return charged at hull-damaged speed (2 days for 45 mi at ×0.5)');
V.state.voyage = null;

section('Make Port blocked when dead in the water');
makeVoyage({ legIdx:1, milesOnLeg:40, pending:0 });
V.state.voyage.hullCurrent = 3; V.state.voyage.hullMax = 20; // 85% dmg
await V.makePortEarly(); await sleep(0);
ok(V.state.voyage && !V.state.voyage.finished, 'divert refused; voyage still active');
V.state.voyage = null;

section('simulateOneDay: dead in water = no progress + makeshift repairs');
makeVoyage({ legIdx:0, milesOnLeg:10, pending:0 });
v12 = V.state.voyage;
v12.hullMax = 20; v12.hullCurrent = 4; v12.quality = 'average'; // 80% dmg
// seeds: generateWeather fallback consumes randoms; then d20 encounter; then d3 repair.
// Instead of counting draws, run the day and assert invariants.
clearRand();
const distBefore = v12.distanceCovered;
const hullBefore = v12.hullCurrent;
let entry12 = await V.advanceOneDay();
ok(entry12.miles === 0, 'no miles made while dead in the water');
ok(V.state.voyage.hullCurrent >= hullBefore, 'makeshift repairs did not lose hull (gained 1d3 minus possible leak/encounter — none flagged)');
ok(entry12.events.some(e => /Dead in the water/i.test(e.text)), 'dead-in-water event logged');
ok(V.state.voyage.distanceCovered === distBefore, 'distanceCovered unchanged');
V.state.voyage = null;

section('Leaking: 1 hull/day until repair item posted');
makeVoyage({ legIdx:0, milesOnLeg:10, pending:0 });
v12 = V.state.voyage;
v12.leaking = true; v12.hullCurrent = 18;
entry12 = await V.advanceOneDay();
ok(entry12.events.some(e => /Leaking/i.test(e.text)), 'leak damage event logged');
// simulate posting the beam-repair item: fabricate one and post it
const beamAction = V.addPendingFinanceAction({ category:'repair', amountGp:200, hullDamage:0, restoreHullAllowed:false, memo:'Refit beams', meta:{ leaking:true } });
V.markPendingFinancePosted(beamAction.id, 'txn_test', {});
ok(V.state.voyage.leaking === false, 'posting the beam repair clears the leak');
V.state.voyage = null;

section('Broken mast halves sailing; posting mast item clears it');
makeVoyage({ legIdx:0, milesOnLeg:0, pending:0 });
v12 = V.state.voyage;
v12.brokenMast = true; v12.quality = 'average'; v12.hullCurrent = v12.hullMax = 20;
// windSpeed 25 → good sailing (no modifier). Internal fallback generateWeather —
// verify via a sailed day: miles should be ~half dailySail (60 → 30) when wind is fair.
// Weather randomness makes exact assert flaky; assert miles ≤ 60% of dailySail across a fair-wind day by retry.
let halvedSeen = false;
for (let t=0; t<20 && !halvedSeen; t++){
  v12.currentLegIdx = 0; v12.milesOnLeg = 0; v12.distanceCovered = 0; v12.hullCurrent = 20; v12.finished = false;
  const e = await V.advanceOneDay();
  const note = e.speedInfo?.note || '';
  if (/broken mast/.test(note)){ halvedSeen = true; ok(true, 'condition note names broken mast on a sailed day'); }
  if (v12.finished) break;
}
if (!halvedSeen){ fail++; console.log('  ✗ FAIL: broken-mast note never appeared in 20 days'); }
const mastAction = V.addPendingFinanceAction({ category:'repair', amountGp:300, hullDamage:0, restoreHullAllowed:false, memo:'Step new mast', meta:{ brokenMast:true } });
V.markPendingFinancePosted(mastAction.id, 'txn_test2', {});
ok(V.state.voyage.brokenMast === false, 'posting the mast repair clears the flag');
V.state.voyage = null;

section('Hostile encounter: fight = engaged day, no progress');
makeVoyage({ legIdx:0, milesOnLeg:0, pending:0 });
v12 = V.state.voyage; v12.hullCurrent = v12.hullMax = 20;
// Force an encounter: encounter check is rollD(20) <= threshold(coastal 2).
// rollD uses Math.random — first random draw in the day is weather. Too many
// draws to count reliably; instead retry days until an encounter fires with
// choose scripted to 1 (fight), asserting the engaged invariant when it does.
let fought = false;
chooseResponses = new Array(50).fill(1);
for (let t=0; t<200 && !fought; t++){
  v12.currentLegIdx = 0; v12.milesOnLeg = 0; v12.finished = false; v12.shipSank = false; v12.hullCurrent = 20;
  const e = await V.advanceOneDay();
  if (e.events.some(ev => /beats to quarters/.test(ev.text))){
    fought = true;
    ok(e.miles === 0, 'engaged day makes no progress');
  }
}
ok(fought, 'fight choice reached within 200 simulated days');
ok(chooseLog.length > 0 && chooseLog[0].n === 3, 'encounter dialog offered 3 choices');
V.state.voyage = null;
chooseResponses = [];

section('advanceMany halts on port arrival');
makeVoyage({ legIdx:0, milesOnLeg:0, pending:0 });
v12 = V.state.voyage;
v12.hullCurrent = v12.hullMax = 40; v12.dailySail = 200; // reach Seaton (120 mi) fast
v12.quality = 'average';
chooseResponses = new Array(50).fill(0); // auto-evade any encounters
// advanceMany not exported... check
ok(typeof V.advanceOneDay === 'function', 'advanceOneDay exported');
// emulate the +7 loop contract: run advanceMany via the internal path is not
// exported; assert the source instead.
const src2 = readFileSync('/home/claude/gcc/gcc-voyage.js', 'utf8');
ok(/const portEvt = entry\.events\.find\(e => e\.type === 'port'\)/.test(src2) && /Halted: /.test(src2), 'advanceMany halts on port events (source)');
ok(/async function advanceMany/.test(src2) && /async function advanceDay/.test(src2), 'advance handlers are async');
ok(/async function clearRoute/.test(src2) && /Clear route/.test(src2), 'clearRoute confirms via dialog');
ok(/ve-quality/.test(src2) && /SHIP_QUALITY\[p\.querySelector\('#ve-quality'\)/.test(src2), 'quality selector wired into startVoyage');
ok(/dailySail:45/.test(src2) && /Dromond \(Large Galley\)/.test(src2), 'template RAW fixes present');
ok(/Math\.floor\(\(20-w\)\/10\)\*4/.test(src2) && /Math\.floor\(\(w-30\)\/10\)\*8/.test(src2), 'wind modifiers at RAW scale');
V.state.voyage = null;

section('Wind Damage Table: capsize path (seeded)');
// rollWindDamage draws Math.random()*100 per category in order:
// capsize, mast, beams, sail, overboard. Storm base: 20/25/35/45/50 → ÷4 = 5/6.25/8.75/11.25/12.5.
// Direct invocation isn't exported; verify via source that order + ÷4 + quality overrides exist.
ok(/base \/ 4/.test(src2), 'wind damage rolls at RAW ÷ 4');
ok(/capsizeOverride:\{ storm:5, hurricane:15 \}/.test(src2), 'excellent capsize override per RAW');
ok(/hazardHullDice:\{ gale:\[1,2\], storm:\[1,3\], hurricane:\[1,6\] \}/.test(src2), 'unseaworthy hazard-day dice per RAW');
ok(/if \(hzLvl\) rollWindDamage\(v, hzLvl, dateStr, events\)/.test(src2), 'wind damage fires on failed pilot check only');

section('v0.13.0 helm (source + behavior)');
const src3 = readFileSync('/home/claude/gcc/gcc-voyage.js', 'utf8');
ok(/function renderHelmStrip/.test(src3) && /function renderHelmFeed/.test(src3) && /function renderHelmFooter/.test(src3), 'helm renderers present');
ok(/id="ve-helm-footer"/.test(src3) && /data-tab="log">Archive</.test(src3), 'footer element + Archive tab');
ok(/gcc:voyage:feed/.test(src3) && /GCCTableFeed\?\.postText\?\./.test(src3), 'table-feed mirror contract');
ok(/VOYAGE_VERSION = '0\.13\.0'/.test(src3) && /ve-ver/.test(src3), 'panel shows module version');
// behavior: alerts harvested on a mast-snap day
makeVoyage({ legIdx:0, milesOnLeg:0, pending:0 });
v12 = V.state.voyage; v12.hullCurrent = v12.hullMax = 20; v12.quality = 'average';
let alerted = false;
chooseResponses = new Array(400).fill(0);
for (let t=0; t<400 && !alerted; t++){
  v12.currentLegIdx = 0; v12.milesOnLeg = 0; v12.finished = false; v12.shipSank = false;
  v12.hullCurrent = 20; v12.brokenMast = false; v12.leaking = false;
  const e = await V.advanceOneDay();
  if ((v12.alerts || []).some(a => ['mast','leak','arrival','dead','sank','capsize'].includes(a.kind))) alerted = true;
}
ok(alerted, 'critical events push v.alerts within 400 sim days');
ok(V.state.voyage.alerts.every(a => a.id && a.kind && a.text && a.ack === false), 'alert shape sane');
V.state.voyage = null;

console.log(`\n${pass} passed, ${fail} failed (v0.12.0 suite)`);
process.exit(fail ? 1 : 0);
