// gw-feature-gen.js v0.3.0 — 2026-05-25
// v0.3.0 — procedural auto-naming of generated sites. Each marker gets a
//          Gamma-World-flavored name (corrupted Ancient cities for ruins,
//          scavenger compounds for settlements, ominous lairs, tech
//          designations for robot farms/forts/spaceports), seeded per
//          location+kind so re-generating a parent is stable.
// v0.2.0 — hazard-aware per-cell pass (radiation reads as deathlands) + a
//          top-down rare pass for sited features: robot farms (anywhere),
//          fortifications (uncommon), spaceports (irradiated parents only).
//          Settlements now also trail to robot farms and forts.
// Deterministic, seeded procedural features for the Gamma World subhex map.
// For one 30-mile parent, places settlements and sites by subhex terrain,
// spaces them out, links settlements with meandering ancient roads, and runs
// trails to nearby ruins/lairs. Everything is written into GWAnnotations
// tagged { gen:true, parent:"col,row" } so a re-run replaces only the
// generated set for that parent and never touches hand-drawn/placed items.
//
// Depends on window.GWSubhexData, window.GCCRng, window.GWAnnotations.

(function(){
  'use strict';
  const WORLD_SEED = 'gamma-terra-v1';

  // Per-subhex-cell probability of seeding each feature, by that cell's terrain.
  const FEATURE_RATES = {
    plains:           { village: 0.045, town: 0.020, ruin: 0.015, lair: 0.005 },
    forest:           { village: 0.020, town: 0.010, lair: 0.022, ruin: 0.012 },
    'heavy-forest':   { village: 0.008, lair: 0.030, ruin: 0.010 },
    mountains:        { lair: 0.030, ruin: 0.012, vault: 0.004 },
    'snow-mountains': { lair: 0.015, ruin: 0.006 },
    desert:           { ruin: 0.022, lair: 0.010, village: 0.006 },
    deathlands:       { ruin: 0.050, lair: 0.022, vault: 0.010 },
    ruins:            { ruin: 0.090, vault: 0.022, lair: 0.018 },
    water:            {},
  };
  const ROLL_ORDER = ['village', 'town', 'ruin', 'lair', 'vault'];
  const KIND_RADIUS = { town: 9, village: 8, ruin: 5, lair: 5, vault: 6, 'robot-farm': 12, fortification: 12, spaceport: 14 };  // min spacing (world units)
  const MAX_ROAD   = 46;   // drop MST road edges longer than this (within-parent)
  const TRAIL_RANGE = 26;  // a settlement trails to a site within this range

  function chooseFeature(terr, rng){
    const rates = FEATURE_RATES[terr];
    if (!rates) return null;
    let roll = rng();
    for (const k of ROLL_ORDER){ const p = rates[k] || 0; if (roll < p) return k; roll -= p; }
    return null;
  }
  function tooClose(x, y, kind, placed){
    const r = KIND_RADIUS[kind] || 5;
    for (const p of placed){
      const md = Math.max(r, KIND_RADIUS[p.kind] || 5);
      if (Math.hypot(x - p.x, y - p.y) < md) return true;
    }
    return false;
  }
  // Minimum spanning tree over settlement points (Prim's; tiny node counts).
  function mst(nodes){
    if (nodes.length < 2) return [];
    const inTree = [0], rest = [], edges = [];
    for (let i = 1; i < nodes.length; i++) rest.push(i);
    while (rest.length){
      let best = null;
      for (const a of inTree) for (const b of rest){
        const d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
        if (!best || d < best.d) best = { a, b, d };
      }
      edges.push(best); inTree.push(best.b); rest.splice(rest.indexOf(best.b), 1);
    }
    return edges;
  }
  // Endpoints + a jittered midpoint; renderer smooths it into a gentle meander.
  function jitterPath(a, b, rng){
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const pts = [[a.x, a.y]];
    const off = (rng() * 2 - 1) * len * 0.14;
    pts.push([a.x + dx * 0.5 + nx * off, a.y + dy * 0.5 + ny * off]);
    pts.push([b.x, b.y]);
    return pts;
  }

  // Top-down rare/sited features the per-cell pass can't express well: scarce and
  // terrain/hazard-gated. Robot farms turn up anywhere; forts are uncommon;
  // spaceports only in irradiated parents (RAW: "center of an extremely
  // devastated area, saturated with hard radiation").
  function placeRareSites(D, R, cells, pt, placed, col, row){
    const rng = R.mulberry32(R.seedFor(WORLD_SEED, 'sites', col, row));
    const cand = [];
    for (const c of cells){
      const sub = D.getSubhex(c.Q, c.R, pt);
      if (sub.terrain === 'water') continue;
      const ctr = D.subhexSvgCenter(c.Q, c.R);
      cand.push({ Q: c.Q, R: c.R, x: ctr.x, y: ctr.y, terr: sub.terrain, haz: sub.hazard });
    }
    if (!cand.length) return;
    for (let i = cand.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); const t = cand[i]; cand[i] = cand[j]; cand[j] = t; }
    const tryPlace = (kind, ok) => {
      for (const c of cand){
        if (ok && !ok(c)) continue;
        if (tooClose(c.x, c.y, kind, placed)) continue;
        placed.push({ Q: c.Q, R: c.R, x: c.x, y: c.y, kind });
        return true;
      }
      return false;
    };
    if (rng() < 0.40) tryPlace('robot-farm', null);
    if (rng() < 0.25) tryPlace('fortification', null);
    if (cand.some(c => c.haz === 'radiation') && rng() < 0.20) tryPlace('spaceport', c => c.haz === 'radiation');
  }

  // ── procedural site names ───────────────────────────────────────────────
  // Deterministic per location+kind (own seed stream, independent of placement
  // and road RNG), so re-generating a parent yields the same names and a given
  // site keeps its name. Gamma-World-flavored: corrupted Ancient city names,
  // scavenger compounds, ominous lairs, and tech designations for robot sites.
  const NM = {
    pre:  ['Dust','Ash','Rust','Salt','Cinder','Ember','Bone','Mud','Stone','Iron','Glass','Tar','Scrap','Husk','Grey','Pale','Bitter','Hollow','Thorn','Briar','Gloom','Murk','Cold','Drift','Crag','Sump','Slag','Char','Bramble','Flint'],
    suf:  ['ford','well','haven','hold','reach','fall','bend','crossing','gate','mire','hollow','ridge','stead','watch','end','row','burg'],
    city: ['Nuyok','Filade','Bostodge','Chigo','Ditroyt','Atlana','Memfis','Denva','Seatle','Portlan','Sanfran','Vegath','Dallax','Hewston','Pheonx','Baltmor','Klevlan','Pittsburk','Sin Loose','Noo Leans','Saint Loo'],
    rAdj: ['Shattered','Sunken','Glassed','Silent','Forgotten','Toppled','Hollow','Bleached','Burnt','Drowned','Buried'],
    lAdj: ['Gnawed','Blood','Howling','Scaled','Rotting','Sunken','Broken','Whispering','Festering','Ashen','Venom','Ironclaw','Razor'],
    lDen: ['Warren','Den','Hollow','Pit','Burrow','Nest','Maw','Lair','Tangle','Hole'],
    corp: ['Ankhar','Createk','Vortex','Apertia','Helix','Genus','Omnitech','Ryker','Delvan','Solcorp','Maxon','Cyberdyne'],
    fNam: ['Cinder','Vance','Holt','Kael','Drummond','Stark','Reyes','Vorn','Hale','Marsh','Cray'],
    fSuf: ['Bastion','Redoubt','Bunker','Bulwark','Keep','Hold'],
    grk:  ['Alpha','Beta','Gamma','Delta','Theta','Sigma','Omega','Kappa','Lambda','Zeta'],
  };
  const NAME_AZ = 'ABCDEFGHJKLMNPRSTVWXZ';
  function nameFor(kind, Q, R){
    const G = window.GCCRng;
    const rng = G.mulberry32(G.seedFor(WORLD_SEED, 'name', kind, Q, R));
    const pick = a => a[Math.floor(rng() * a.length)];
    const compound = () => pick(NM.pre) + pick(NM.suf);
    const n99 = () => 1 + Math.floor(rng() * 99);
    switch (kind){
      case 'village':
      case 'town': return compound();
      case 'ruin': { const r = rng();
        if (r < 0.5) return 'Ruins of ' + pick(NM.city);
        if (r < 0.8) return 'Old ' + compound();
        return 'The ' + pick(NM.rAdj) + ' Ruins'; }
      case 'lair': return 'The ' + pick(NM.lAdj) + ' ' + pick(NM.lDen);
      case 'vault':
        return rng() < 0.5 ? 'Vault ' + NAME_AZ[Math.floor(rng()*NAME_AZ.length)] + '-' + n99()
                           : pick(NM.corp) + ' ' + pick(['Vault','Cache','Bunker']);
      case 'robot-farm': { const r = rng();
        if (r < 0.4) return 'Mech-Land ' + n99();
        if (r < 0.7) return 'Agri-Complex ' + pick(NM.grk);
        return 'Sector ' + n99() + ' Farm'; }
      case 'fortification': { const r = rng();
        if (r < 0.45) return 'Fort ' + pick(NM.fNam);
        if (r < 0.8) return compound() + ' ' + pick(NM.fSuf);
        return 'Bastion ' + n99(); }
      case 'spaceport': { const r = rng();
        if (r < 0.4) return 'Port ' + pick(NM.corp);
        if (r < 0.75) return compound() + ' Launch Complex';
        return 'Launch Pad ' + n99(); }
      default: return compound();
    }
  }

  function generateForParent(col, row){
    const D = window.GWSubhexData, R = window.GCCRng, A = window.GWAnnotations;
    if (!D || !R || !A){ console.warn('[gw-feature-gen] deps missing'); return null; }
    const pk = col + ',' + row;
    A.clearGenerated(pk);
    const cells = D.ownedByParent(col, row) || [];
    if (!cells.length) return { markers: 0, strokes: 0, settlements: 0, sites: 0 };

    const pt = D.parentTerrainOf(col, row);
    const rng = R.mulberry32(R.seedFor(WORLD_SEED, 'features', col, row));

    // deterministic shuffle so placement isn't biased to one corner
    const order = cells.slice();
    for (let i = order.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }

    const placed = [];
    for (const c of order){
      const sub = D.getSubhex(c.Q, c.R, pt);
      const rateKey = (sub.hazard === 'radiation') ? 'deathlands' : sub.terrain;   // irradiated ground reads as deathlands
      const kind = chooseFeature(rateKey, rng);
      if (!kind) continue;
      const ctr = D.subhexSvgCenter(c.Q, c.R);
      if (tooClose(ctr.x, ctr.y, kind, placed)) continue;
      placed.push({ Q: c.Q, R: c.R, x: ctr.x, y: ctr.y, kind });
    }
    placeRareSites(D, R, cells, pt, placed, col, row);   // top-down: robot farms / forts / spaceports

    let mc = 0, sc = 0;
    for (const p of placed){ A.addMarker(p.kind, p.x, p.y, { gen: true, parent: pk, name: nameFor(p.kind, p.Q, p.R), deferSave: true }); mc++; }

    const settle = placed.filter(p => p.kind === 'town' || p.kind === 'village');
    for (const e of mst(settle)){
      if (e.d > MAX_ROAD) continue;
      A.addStroke('road', jitterPath(settle[e.a], settle[e.b], rng), { gen: true, parent: pk, deferSave: true }); sc++;
    }

    const sites = placed.filter(p => p.kind === 'ruin' || p.kind === 'lair' || p.kind === 'vault' || p.kind === 'robot-farm' || p.kind === 'fortification');
    const used = new Set();
    for (const s of settle){
      let best = null;
      for (let i = 0; i < sites.length; i++){
        if (used.has(i)) continue;
        const d = Math.hypot(s.x - sites[i].x, s.y - sites[i].y);
        if (d <= TRAIL_RANGE && (!best || d < best.d)) best = { i, d };
      }
      if (best){ used.add(best.i); A.addStroke('trail', jitterPath(s, sites[best.i], rng), { gen: true, parent: pk, deferSave: true }); sc++; }
    }

    A.flush();
    return { markers: mc, strokes: sc, settlements: settle.length, sites: sites.length };
  }
  function clearForParent(col, row){
    if (!window.GWAnnotations) return 0;
    return window.GWAnnotations.clearGenerated(col + ',' + row);
  }

  window.GWFeatureGen = { generateForParent, clearForParent, FEATURE_RATES };
  try { console.log('[gw-feature-gen] v0.3.0 loaded'); } catch(_){}
})();
