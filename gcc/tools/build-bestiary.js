// tools/build-bestiary.js — parse gw-mp-bestiary.md into structured data.
// Emits gw-mp-bestiary.js (window.GWBestiary) keyed by the creature names the
// encounter tables roll, with forms[] for multi-stat-block creatures.
// Run: node tools/build-bestiary.js   (from the gcc/ dir)
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MD = fs.readFileSync(path.join(ROOT, 'gw-mp-bestiary.md'), 'utf8');

// pull encounter creature names + number-appearing from the data file
const ctx = { window: {}, console }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'gw-encounter-data.js'), 'utf8'), ctx);
const ED = ctx.window.GWEncounterData;
const SKIP = new Set(['Cryptic Alliance', 'No Encounter']);
const encNames = new Set();
for (const rows of Object.values(ED.ENCOUNTER_TABLES))
  for (const r of rows) if (r.creature && !SKIP.has(r.creature)) encNames.add(r.creature);

// split md into ### blocks
const lines = MD.split(/\r?\n/);
const blocks = [];
let cur = null;
for (const ln of lines) {
  const m = ln.match(/^###\s+(.+?)\s*$/);
  if (m) { cur = { title: m[1].trim(), body: [] }; blocks.push(cur); }
  else if (cur) cur.body.push(ln);
}

const num = name => ED.NUMBER_APPEARING[name] || '1';

// title "Pam (Parn)" -> { name:'Pam', aliases:['Parn'] }
function parseTitle(t) {
  const m = t.match(/^(.+?)\s*\((.+?)\)\s*$/);
  if (m) return { name: m[1].trim(), aliases: m[2].split(/[\/,]/).map(s => s.trim()).filter(Boolean) };
  return { name: t.trim(), aliases: [] };
}

// parse a fenced stat block body (array of lines inside ```...```)
function parseStatBlock(txt) {
  const out = {};
  // BC line — prefer "Effective:" (post size-mod), else "BCs:"/"Base BCs:"
  const bcLine = (txt.match(/^\s*Effective:\s*(.+)$/m) || txt.match(/^[^\n]*\bBCs?:\s*(.+)$/m) || [])[1];
  if (bcLine) {
    out.bc = {};
    for (const [, k, v] of bcLine.matchAll(/\b(ST|EN|AG|IN|CL|MS)\s+(\d+)/g)) out.bc[k] = +v;
  }
  const numAfter = (re) => { const m = txt.match(re); return m ? m[1] : null; };
  out.hits     = numAfter(/\bHits\s+([0-9]+~?)/);
  out.power    = numAfter(/\bPower\s+([0-9]+)/);
  out.move     = numAfter(/\bMove\s+([0-9]+[^\s]*(?:\s(?:ground|swim|fly))?)/);
  out.init     = numAfter(/\bInit\s+(d?[0-9+]+)/);
  out.hth      = numAfter(/\bHTH\s+(d?[0-9+]+)/);
  out.inventing= numAfter(/\bInventing\s+([0-9]+)/);
  out.mass     = numAfter(/\bMass\s+(d[0-9]+(?:\s*\(~?[^)]*\))?)/);
  return out;
}

// armor "Armor 6 = 4/1/0/1" from a free-text abilities string
function parseArmor(s) {
  const m = s && s.match(/Armor\s+(\d+)\s*=\s*(\d+)\/(\d+)\/(\d+)\/(\d+)/);
  if (!m) return null;
  return { total: +m[1], k: +m[2], e: +m[3], b: +m[4], ent: +m[5] };
}

const field = (body, label) => {
  const re = new RegExp('^\\*\\*' + label + ':\\*\\*\\s*(.+)$', 'mi');
  const m = body.join('\n').match(re); return m ? m[1].trim() : null;
};

function parseCreature(b) {
  const { name, aliases } = parseTitle(b.title);
  const body = b.body.join('\n');
  const entry = {
    name, aliases, title: b.title,
    gwSource:   field(b.body, 'GW source'),
    build:      field(b.body, 'Build'),
    origin:     field(b.body, 'Origin'),
    cpEstimate: field(b.body, 'CP estimate'),
    abilities:  field(b.body, 'Abilities'),
    equipment:  field(b.body, 'Equipment'),
    forms: [],
  };
  // collect fenced code blocks, tagged with the nearest preceding #### sub-name
  const fences = [];
  let inFence = false, buf = [], subName = null;
  for (const ln of b.body) {
    const sub = ln.match(/^####\s+(.+?)\s*$/);
    if (sub && !inFence) { subName = sub[1].trim(); continue; }
    if (/^```/.test(ln)) {
      if (!inFence) { inFence = true; buf = []; }
      else { inFence = false; fences.push({ subName, txt: buf.join('\n') }); }
      continue;
    }
    if (inFence) buf.push(ln);
  }
  for (const f of fences) {
    const sb = parseStatBlock(f.txt);
    sb.form = f.subName || null;
    entry.forms.push(sb);
  }
  // creature-level armor (from the shared abilities line, single-form creatures)
  const armor = parseArmor(entry.abilities);
  if (armor) entry.armor = armor;
  entry.generatedOnly = entry.forms.length === 0; // e.g. Tribesmen (generation tables)
  return entry;
}

// build a name -> entry index, matching encounter names to blocks
const parsed = blocks.map(parseCreature);
const byName = {};
function register(key, entry) { if (!byName[key]) byName[key] = entry; }
for (const e of parsed) {
  register(e.name, e);
  for (const a of e.aliases) register(a, e);
}
// ensure every encounter name resolves; attach numberAppearing
const catalog = {};
const unresolved = [];
for (const cn of [...encNames].sort()) {
  let e = byName[cn]
    || parsed.find(p => p.name.toLowerCase() === cn.toLowerCase())
    || parsed.find(p => p.title && p.title.includes(cn))
    || parsed.find(p => p.name.toLowerCase().startsWith(cn.toLowerCase()));
  if (!e) { unresolved.push(cn); continue; }
  const entry = Object.assign({ encounterName: cn, numberAppearing: num(cn) }, e);
  // fold colon-variant siblings ("Robotic Unit: Warbot") in as named forms
  const esc = cn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const varRe = new RegExp('^' + esc + ':\\s*(.+)$');
  for (const v of parsed) {
    const vm2 = v.title.match(varRe);
    if (!vm2) continue;
    for (const f of v.forms) { f.form = f.form || vm2[1].trim(); entry.forms.push(Object.assign({}, f)); }
  }
  if (entry.forms.length) entry.generatedOnly = false;
  delete entry.title;
  catalog[cn] = entry;
}

// emit gw-mp-bestiary.js
const header = `// gw-mp-bestiary.js v0.1.0 — GENERATED by tools/build-bestiary.js. Do not hand-edit.
// Source of truth: gw-mp-bestiary.md (stat blocks) + gw-encounter-data.js (names/number).
// Keyed by the exact creature names the encounter tables roll. Multi-form
// creatures (Android sub-types, Robotic Unit archetypes) carry forms[].
`;
const out = header + '(function(){\n  "use strict";\n  window.GWBestiary = ' +
  JSON.stringify(catalog, null, 2).replace(/\n/g, '\n  ') +
  ';\n  try { console.log("[gw-mp-bestiary] v0.1.0 loaded ("+Object.keys(window.GWBestiary).length+" creatures)"); } catch(_){}\n})();\n';
fs.writeFileSync(path.join(ROOT, 'gw-mp-bestiary.js'), out);

// report
const formCount = Object.values(catalog).reduce((n, e) => n + e.forms.length, 0);
const noBC = Object.values(catalog).filter(e => !e.generatedOnly && !e.forms.some(f => f.bc)).map(e => e.encounterName);
console.log('encounter creatures      :', encNames.size);
console.log('resolved to a block      :', Object.keys(catalog).length);
console.log('unresolved               :', unresolved.length ? unresolved : 'none');
console.log('total parsed stat blocks :', formCount);
console.log('generation-only (no block):', Object.values(catalog).filter(e => e.generatedOnly).map(e => e.encounterName));
console.log('statted but NO BCs parsed :', noBC.length ? noBC : 'none');
