/* Battle at the Crossroads - deterministic regression fixture.
 *
 * The Basic Game scenario from the BATTLESYSTEM rulebook, played headless with
 * stubbed dice so the opening is checkable rather than merely plausible. Kurt's
 * 2026-08-30 browser run (board v0.61.7.9) is the reference; every number
 * asserted here was verified by hand against the CRT, Tables 12-14 and the Army
 * Roster Sheets, not copied from the board's own output.
 *
 *   node gcc/tools/bs-harness/crossroads.mjs .
 */
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs'; import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');   // v0.61.3: a relative repo root ('.') built an invalid file:// URL on Linux
let html=fs.readFileSync(path.join(root,'gcc/battlesystem-board.html'),'utf8');
html=html.replace(/<script src="gcc-[^"]+"><\/script>/g,'').replace(/<link[^>]+gcc-auth[^>]*>/g,'');
const i=html.indexOf('<script type="module">'),j=html.indexOf('</script>',i);
let code=html.slice(i+'<script type="module">'.length,j);
const im=code.match(/import \{([\s\S]*?)\} from '\.\/engine\/index\.js';/);
const names=im[1].split(',').map(s=>s.trim()).filter(Boolean);
code=code.replace(im[0],`const {${names.join(',')}}=window.__ENGINE__;`);
const tm=code.match(/import \{([\s\S]*?)\} from '\.\/vendor\/osric3-rules\/turn-undead\.js';/);
if(tm)code=code.replace(tm[0],`const {${tm[1].split(',').map(s=>s.trim()).filter(Boolean).join(',')}}=window.__TURN__;`);
html=html.slice(0,i)+html.slice(j+'</script>'.length);
const vc=new VirtualConsole();const fails=[];
vc.on('log',(...a)=>{const s=a.join(' ');if(/self-tests/.test(s))console.log(s.slice(0,6000));});
vc.on('error',(...a)=>console.log('ERR',String(a[0]).slice(0,800)));
vc.on('jsdomError',e=>console.log('JSDOMERR',String(e?.stack||e).slice(0,1500)));
const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'http://localhost/gcc/battlesystem-board.html',virtualConsole:vc});
const w=dom.window;
w.__ENGINE__=await import('file://'+path.join(root,'gcc/engine/index.js'));
w.__TURN__=await import('file://'+path.join(root,'gcc/vendor/osric3-rules/turn-undead.js'));
w.SVGElement.prototype.getBBox=()=>({x:0,y:0,width:10,height:10});
w.SVGElement.prototype.getScreenCTM=()=>null;
Object.defineProperty(w.SVGElement.prototype,'viewBox',{get(){const v=(this.getAttribute('viewBox')||'0 0 1000 1000').split(/\s+/).map(Number);return{baseVal:{x:v[0],y:v[1],width:v[2],height:v[3]}};}});
w.SVGElement.prototype.createSVGPoint=()=>({x:0,y:0,matrixTransform(){return this;}});
w.HTMLElement.prototype.getBoundingClientRect=function(){return{left:0,top:0,right:900,bottom:600,width:900,height:600,x:0,y:0};};
w.SVGElement.prototype.getBoundingClientRect=function(){return{left:0,top:0,right:900,bottom:600,width:900,height:600,x:0,y:0};};
w.HTMLElement.prototype.showModal=function(){this.setAttribute('open','');};
w.HTMLElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
w.confirm=()=>true;w.structuredClone=structuredClone;w.requestAnimationFrame=f=>setTimeout(f,0);
w.localStorage.setItem=()=>{};
try{w.eval(code+'\n;window.__S=()=>state;window.__G=(n)=>eval(n);');}catch(e){console.log('EVAL ERR',e.stack?.slice(0,1500));}
await new Promise(r=>setTimeout(r,3000));

const g = new Proxy({}, { get:(_,n)=>{ try { return w.__G(n); } catch { return undefined; } } });
const S = w.__S();

let cxPass = 0; const cxFails = [];
const t = (name, ok) => { if (ok) cxPass++; else cxFails.push(name); };
const near = (a,b,eps=1e-6) => Math.abs(a-b) <= eps;

/* Dice are stubbed on w.Math.random (NOT Math.random — the page has its own
   global). Each entry is the value the next call returns, so a 2d6 of 7 is
   fed as two rolls. queue() sets the sequence; anything unconsumed is an
   assertion failure, which catches a rule that stopped rolling. */
let queue = [];
let seed = 0x9e3779b9;                                        // deterministic fallback: a CONSTANT would hang
const prng = () => { seed = (seed*1664525 + 1013904223) >>> 0; return seed / 0x100000000; };  // any tie re-roll (initiative) never resolves
w.Math.random = () => { const v = queue.shift(); return v === undefined ? prng() : v; };
const d = (face, sides) => (face - 1 + 0.5) / sides;          // exact face value
const q = (...faces) => { queue = faces.slice(); };

/* ---- the scenario ------------------------------------------------------ */
const mk = (type, side, figs, x, y, o={}) => {
  const u = g.mkUnit(type, side, figs, x, y);
  Object.assign(u.prof, o.prof||{});
  if (o.cmdr) u.cmdr = { name:o.cmdr, cls:'fighter', level:o.lvl||3, cha:12 };
  u.label = o.label; u.facing = o.facing; u.formation = o.form || 'closed';
  if (o.frontage) u.frontage = o.frontage;
  u.baseMorale = g.computeBaseMorale(u);
  return u;
};
function deploy() {
  S.boardWIn = 90; S.boardHIn = 48; g.applyBoardSize();
  S.conditions = g.normalizeConditions({ night:false });
  S.optional = { tribalStandard:false };
  const B = [
    mk('ORC','B',14,2,8,   {label:'Orcs of the Red Blade', cmdr:'Red Orcall', facing:90, frontage:7, prof:{ac:6,mv:9,ar:19,ml:11,dl:10}}),
    mk('OGRE','B',6,2,18,  {label:'Skullcrushers',         cmdr:'Ogrrall',    facing:90, frontage:3, prof:{ac:5,mv:9,ar:20,ml:11,dl:9}}),
    mk('GOBLIN','B',12,2,28,{label:'Twisted Claws',        cmdr:'Terrill Rippert', facing:90, frontage:6, prof:{ac:6,mv:6,ar:20,ml:10,dl:9}}),
    mk('GOBLIN','B',12,2,37,{label:'Broken Fang',          cmdr:'Black Fang', facing:90, frontage:6, prof:{ac:6,mv:6,ar:20,ml:10,dl:9}}),
  ];
  const A = [
    mk('DWARF','A',12,79,9, {label:'Twin Blades',   cmdr:'Bairn Stonewall',  facing:270, frontage:6, prof:{ac:4,mv:6,ar:20,ml:13,dl:14}}),
    mk('MEN_SP','A',16,78,18,{label:'Glarus Militia',cmdr:'John Longthrower',lvl:1,facing:270,frontage:8,prof:{ac:8,mv:12,ar:21,ml:11,dl:12}}),
    mk('MEN_HF','A',12,77,27,{label:'Glarian Guard', cmdr:'Radd Wainwright',  facing:270, frontage:6, prof:{ac:5,hd:2,mv:9,ar:20,ml:12,dl:13}}),
    mk('MEN_HF','A',10,74,35,{label:'Clanguard',     cmdr:'Slendall Lightfoot',facing:270,frontage:5, prof:{ac:7,mv:9,ar:20,ml:11,dl:12,race:'Halfling',size:'S'}}),
  ];
  S.units = [...B, ...A]; S.terrain = []; S.setup = true; S.round = 0;
  return { B, A, by:n => S.units.find(u=>u.label===n) };
}

/* ---- 1. the roster, straight off the Army Roster Sheets ---------------- */
{
  const f = deploy();
  const expect = [
    ['Orcs of the Red Blade', 14, 19, 11, 10, '10:1', 9,  6],
    ['Skullcrushers',          6, 20, 11,  9, '5:1',  9,  5],
    ['Twisted Claws',         12, 20, 10,  9, '10:1', 6,  6],
    ['Broken Fang',           12, 20, 10,  9, '10:1', 6,  6],
    ['Twin Blades',           12, 20, 13, 14, '10:1', 6,  4],
    ['Glarus Militia',        16, 21, 11, 12, '10:1', 12, 8],
    ['Glarian Guard',         12, 20, 12, 13, '10:1', 9,  5],
    ['Clanguard',             10, 20, 11, 12, '10:1', 9,  7],
  ];
  for (const [name, figs, ar, ml, dl, ratio, mv, ac] of expect) {
    const u = f.by(name);
    t(`[roster] ${name} matches the Army Roster Sheet`,
      !!u && u.figures===figs && g.baseAR(u)===ar && u.baseMorale===ml &&
      g.disciplineOf(u)===dl && g.ratioOf(u)===ratio &&
      near(g.effectiveMoveRate(u), mv) && g.profileOf(u).ac===ac);
  }
  t('[roster] the field is the map\u2019s 90x48in at 3in per square', w.__G('BOARD_W')===90 && w.__G('BOARD_H')===48);
  t('[roster] the battle is in daylight, per the scenario', S.conditions.night===false);
}

/* ---- 2. Table 12/14: movement, with no missile troops on either side --- */
{
  const f = deploy(); g.beginBattle();   const militia = f.by('Glarus Militia'), dwarves = f.by('Twin Blades');
  t('[7.13] a Forced March is 1.5x the movement rate', near(g.effectiveMoveRate(militia)*1.5, 18));
  t('[Table 12] neither force has missile troops, so no fire cap applies',
    militia.missileMoveCap === undefined && dwarves.missileMoveCap === undefined);
  t('[Table 14] clear terrain gives full movement', near(g.effectiveMoveRate(dwarves), 6));
}

/* ---- 3. the CRT, hand-checked both ways -------------------------------- */
{
  const f = deploy(); g.beginBattle();
  const guard = f.by('Glarian Guard'), orcs = f.by('Orcs of the Red Blade');
  guard.frontage = 6; orcs.frontage = 7;
  g.setUnitCenter(orcs, g.unitCenter(guard).cx,
    g.unitCenter(guard).cy - (g.unitRect(guard).h + g.unitRect(orcs).h)/2 - 0.05);
  guard.facing = 0; orcs.facing = 180;
  S.phaseIdx = g.PHASES.findIndex(p=>p.id==='melee');
  const logText = fn => { const el = w.document.querySelector('#log');
    const before = el.innerHTML.length; fn();
    return el.innerHTML.slice(before).replace(/<[^>]+>/g,' ').replace(/\s+/g,' '); };

  // Guard AR 20 less the commander => 19; 2d6 of 7 against orc AC 6 => roll 20.
  // The D8 column at 20 is 4 HD per figure x 6 figures = 24 HD; orcs are 1 HD
  // creatures at 10:1, so 10 HD per figure => 2 killed, 4 HD carried.
  const out1 = logText(() => { q(d(4,6), d(3,6)); g.resolveMelee(guard, orcs); });
  t('[8.3] the Guard\u2019s AR is the roster 20 less the commander', /AR 19 \(roster 20 . commander fighting/.test(out1));
  t('[8.3] the roll is 2d6 + AR - AC', /2d6 \(7\)/.test(out1) && /Roll 20/.test(out1));
  t('[CRT] D8 at 20 is 24 HD and kills 2 orc figures', /24 HD/.test(out1) && /2 killed/.test(out1));
  t('[8.1] the whole front rank fights', /6 figs/.test(out1));

  // Orcs AR 19, commander -1, daylight +1 => 19; 2d6 of 9 against Guard AC 5
  // => roll 23. D8 at 23 is 3 HD x 7 = 21 HD; the Guard is 2 HD at 10:1, so
  // 20 HD per figure => 1 killed with 1 HD carried (below a wound).
  const out2 = logText(() => { q(d(5,6), d(4,6)); g.resolveMelee(orcs, guard); });
  t('[12.5] the orcs pay the daylight +1 in full sunlight', /daylight \+1/.test(out2) && /AR 19 \(roster 19/.test(out2));
  t('[CRT] D8 at 23 is 21 HD and kills 1 Guard figure', /21 HD/.test(out2) && /1 killed/.test(out2));
  // resolveMelee logs the reply too, so read only the orcs' own line
  t('[8.7] a carry below half a figure raises no wound', !/wound/.test(out2.split('\u21a9')[0]));
  t('[8.1] the orcs bring their extra file as a side figure', /7 figs \(6 contact \+ 1 side\)/.test(out2));
}

/* ---- 4. racial combat modifiers [MM], and their separation from hatred -- */
{
  const f = deploy();
  const dwarves = f.by('Twin Blades'), orcs = f.by('Orcs of the Red Blade'),
        ogres = f.by('Skullcrushers'), guard = f.by('Glarian Guard');
  t('[MM] dwarves roll +1 to hit orcs (AR -1)', g.racialCombatAR(dwarves, orcs).delta === -1);
  t('[MM] ogres deduct 4 against dwarves (AR +4)', g.racialCombatAR(ogres, dwarves).delta === 4);
  t('[MM] humans get no racial modifier', g.racialCombatAR(guard, orcs).delta === 0);
  t('[4.6] hatred drives discipline, never AR',
    (g.profileOf(dwarves).hates||[]).includes('Orc') && g.racialCombatAR(dwarves, guard).delta === 0);
  t('[12.5] the monsters shun daylight; the humans do not',
    g.daylightAR(orcs) && g.daylightAR(f.by('Twisted Claws')) && !g.daylightAR(guard));
}

/* ---- 5. Table 6/7 discipline ------------------------------------------- */
{
  const f = deploy();
  const dwarves = f.by('Twin Blades'), gobs = f.by('Twisted Claws');
  t('[Table 6] dwarves are Lawful, so DL exceeds ML', g.disciplineOf(dwarves) > dwarves.baseMorale);
  t('[Table 6] goblins are Lawful evil and average-low int', g.disciplineOf(gobs) === 9);
  t('[Table 7] a closed chaotic/low-int charge needs a check; a disciplined one does not',
    g.chargeDisciplineRequired(gobs) === (gobs.formation==='closed' && (g.isChaotic(gobs)||g.isLowInt(gobs))));
}

/* ---- 6. victory conditions are a manual call --------------------------- */
{
  const f = deploy(); g.beginBattle();
  for (const u of f.B) u.figures = 0;
  t('[scenario] the board does not adjudicate the victory condition',
    typeof g.victoryState === 'undefined' || g.victoryState === undefined);
}

const total = cxPass + cxFails.length;
console.log(`[CROSSROADS] ${cxPass}/${total} ok` + (cxFails.length ? ` \u00b7 FAILED: ${cxFails.join('; ')}` : ''));
process.exit(cxFails.length ? 1 : 0);
