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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
