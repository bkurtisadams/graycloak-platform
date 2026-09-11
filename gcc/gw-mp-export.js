// gw-mp-export.js v0.2.1 — export a GWBestiary creature as MP Builder JSON,
// the exact shape consumed by mp_engine.js `!mp import --name <handout>`.
//
// Workflow: roll encounter -> GWMPExport.json(name) -> paste into a Roll20
// handout -> `!mp import --name <handout>`. The MP sheet derives Hits/Power/
// Move/Init/HTH/saves/defense from the BC costs, so we set BC costs (= the
// effective scores) + armor + abilities; the sheet computes the rest.
//
// Contract (from mp_engine.js cmdMPImport):
//   stats.{st,en,ag,in,cl}.cp  -> <bc>_cost  (sheet: score = cost + mod, mod=0 here)
//   protKinetic/Energy/Bio/Entropy/Psychic/Other(+2/+3) -> repeating_protection
//   abilities[] {desc,cp,ip}   -> repeating_abilities
//   attacks[]   {name,toHit,damage,dmgType,kb} -> repeating_attacks
//   name/originType/species/mass/weight/base_ip(inventing)/story -> identity+bio

(function(){
  'use strict';
  const B = () => window.GWBestiary;

  // Bestiary ability entries are separated by semicolons.  Some older entries
  // use commas instead.  Prefer semicolons whenever present: commas can be
  // part of a single ability's descriptive clause (e.g. duration/range).
  function splitTop(s){
    let depth = 0, hasSemicolon = false;
    for (const ch of s){
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      else if (ch === ';' && depth === 0) hasSemicolon = true;
    }
    const delimiter = hasSemicolon ? ';' : ',';
    const out = []; depth = 0; let cur = '';
    for (const ch of s){
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      if (ch === delimiter && depth === 0){ out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  // A row may document its base cost and modifiers.  Its final cost is what
  // belongs in the Builder's CP column (e.g. permanent Size Change).
  const cpOf = seg => {
    const final = seg.match(/final\s+\(?\s*~?([\d.]+)\s*CP/i);
    if (final) return final[1];
    const m = seg.match(/\(\s*~?([\d.]+)\s*CP/i);
    return m ? m[1] : '';
  };
  const isArmorSeg = seg => /^Armor\b/i.test(seg) && /=/.test(seg);
  const estimatedCP = raw => {
    const m = String(raw || '').match(/~?([\d.]+)/);
    return m ? m[1] : '';
  };

  // "d4 (~150 lbs)" -> { mass:'d4', weight:'150' }
  function parseMass(raw){
    if (!raw) return { mass: '', weight: '' };
    const w = (raw.match(/~?([\d,]+)\s*lbs/i) || [])[1] || '';
    const mass = (raw.match(/^\s*(d?\d+[+\-]?\d*)/) || [])[1] || '';
    return { mass, weight: w.replace(/,/g, '') };
  }

  function abilityRows(text){
    if (!text) return [];
    return splitTop(text)
      .filter(seg => seg && !isArmorSeg(seg))      // armor handled as protection
      .map(seg => ({ desc: seg, cp: cpOf(seg), ip: '' }));
  }

  // Weaknesses are negative-CP entries in the same abilities list (MP construction).
  // CP is a trailing signed number, e.g. "Distinctive (two-headed) -5".
  function weaknessRows(text){
    if (!text) return [];
    return splitTop(text).filter(Boolean).map(seg => {
      // Ledger-form weaknesses state their final cost in parentheses; retain
      // support for the older trailing "-5" notation too.
      const m = seg.match(/final\s+(-\d+(?:\.\d+)?)\s*CP/i)
        || seg.match(/(-\d+(?:\.\d+)?)\s*$/);
      return { desc: seg, cp: m ? m[1] : '', ip: '' };
    });
  }

  // build the MP Builder JSON object for one creature (+ optional form index)
  function build(name, opts){
    const bst = B(); if (!bst) throw new Error('GWBestiary not loaded');
    const e = bst[name]; if (!e) throw new Error('Unknown creature: ' + name);
    opts = opts || {};
    const fi = Math.max(0, Math.min(opts.formIndex || 0, Math.max(0, e.forms.length - 1)));
    const f = e.forms[fi] || {};
    const formName = f.form ? (f.form.indexOf(e.name) === 0 ? f.form : `${e.name} — ${f.form}`) : e.name;
    const bc = f.bc || {};
    const mw = parseMass(f.mass);

    const data = { name: formName };

    // BCs: cost = effective score (sheet adds mod=0)
    const BCK = { st: 'ST', en: 'EN', ag: 'AG', in: 'IN', cl: 'CL' };
    data.stats = {};
    for (const k in BCK){ const v = bc[BCK[k]]; if (v != null) data.stats[k] = { cp: String(v) }; }

    // identity / bio.  Keep Story open for the GM's actual narrative.  The
    // source text and conversion rationale are retained in gwBuildNotes, a
    // field the Builder preserves on later exports without cramming them into
    // the visible Story box.
    data.originType = e.origin || '';
    data.species    = e.build || '';
    data.mass       = mw.mass;
    data.weight     = mw.weight;
    if (f.inventing) data.inventing = String(f.inventing);
    if (e.cpEstimate) data.xpBase = estimatedCP(e.cpEstimate);
    data.story = '';
    data.gwBuildNotes = {
      source: e.gwSource || '',
      conversion: e.build || '',
      cpEstimate: e.cpEstimate || '',
      encounter: `${e.encounterName} (No. appearing ${e.numberAppearing})`,
      combat: `HTH ${f.hth || '—'}; Init ${f.init || '—'}; Move ${f.move || '—'}`,
      equipment: e.equipment || ''
    };

    // Abilities and weaknesses belong in the printed ability rows.  Put
    // equipment there as a CP-less reminder until it can be priced/entered as
    // a specific attack or protection item.
    data.abilities = abilityRows(e.abilities)
      .concat(weaknessRows(e.weaknesses));
    if (e.equipment) data.abilities.push({ desc: 'Equipment: ' + e.equipment, cp: '', ip: '' });
    while (data.abilities.length < 12) data.abilities.push({ cp: '', desc: '', ip: '' });

    // attacks: Base HTH is auto on the sheet from ST; provide one melee row
    // using the bestiary HTH so the token has an attack out of the box.
    data.attacks = [];
    if (f.hth) data.attacks.push({ name: 'Strike (HTH)', toHit: '', damage: f.hth, dmgType: 'Kinetic', kb: '' });
    while (data.attacks.length < 3) data.attacks.push({ name: '', toHit: '', damage: '', dmgType: '', kb: '' });

    // protection: K/E/B/Ent from parsed armor
    if (e.armor){
      data.protKinetic = String(e.armor.k || 0);
      data.protEnergy  = String(e.armor.e || 0);
      data.protBio     = String(e.armor.b || 0);
      data.protEntropy = String(e.armor.ent || 0);
    }
    return data;
  }

  function json(name, opts){ return JSON.stringify(build(name, opts), null, 2); }
  function handoutName(name, opts){ return 'MP Import: ' + build(name, opts).name; }

  function copy(name, opts){
    const txt = json(name, opts);
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt);
    const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta);
    ta.select(); try { document.execCommand('copy'); } finally { ta.remove(); }
    return Promise.resolve();
  }
  function download(name, opts){
    const blob = new Blob([json(name, opts)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = handoutName(name, opts).replace(/[^\w.-]+/g, '_') + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  window.GWMPExport = { build, json, handoutName, copy, download };
  try { console.log('[gw-mp-export] v0.2.1 loaded'); } catch(_){}
})();
