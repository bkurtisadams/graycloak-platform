// gw-feature-gen.js v0.8.0 — 2026-07-11
// v0.8.0 — diversify generated site names: lairs now draw from eight distinct
//          naming families (terrain, relic infrastructure, omens, brood names,
//          possessives, under-sites, and coded habitats) instead of the dominant
//          adjective + hole-synonym pattern. Ruins gain facility/district forms,
//          and each parent generation rejects duplicate names and repeated lair
//          tail words while remaining deterministic.
// v0.7.0 — add side-effect-free planForParent() so the full-world
//          subhex atlas/tile renderer can read deterministic generated
//          markers and paths without writing to the annotation store.
// v0.6.0 — name dedup: much larger word pools, extra name patterns (qualifier,
//          possessive), and location-derived codes for the cryptic/tech kinds
//          (Vault G-577, Mech-Land 633, Installation Kappa-218) so coded sites
//          rarely collide. Settlements/ruins lean on the huge compound space.
// gw-feature-gen.js v0.5.0 — 2026-05-25
// v0.4.0 — feature rates for the new terrains: hills (lairs/ruins + some
//          settlement), marsh (sparse lairs/ruins), forested-hill, and
//          forested-mountains.
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
    hills:            { lair: 0.026, ruin: 0.016, village: 0.014, town: 0.006, vault: 0.004 },
    marsh:            { lair: 0.020, ruin: 0.010, village: 0.004 },
    coast:            { village: 0.030, town: 0.012, ruin: 0.012, lair: 0.005 },
    'forested-hill':  { lair: 0.026, ruin: 0.013, village: 0.012, town: 0.005 },
    'forested-mountains': { lair: 0.028, ruin: 0.010, vault: 0.006 },
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
        placed.push({ Q: c.Q, R: c.R, x: c.x, y: c.y, kind, terrain: c.terr, hazard: c.haz });
        return true;
      }
      return false;
    };
    if (rng() < 0.40) tryPlace('robot-farm', null);
    if (rng() < 0.25) tryPlace('fortification', null);
    if (cand.some(c => c.haz === 'radiation') && rng() < 0.20) tryPlace('spaceport', c => c.haz === 'radiation');
  }

  // ── procedural site names ───────────────────────────────────────────────
  // Deterministic per location+kind. The name stream is independent of feature
  // placement and road RNG, so re-generating a parent yields stable names.
  //
  // v0.8 deliberately avoids one dominant "adjective + den synonym" funnel.
  // Lairs rotate through several different grammatical families, and the parent
  // planner retries deterministic variants to prevent exact duplicates and a
  // cluster of names ending in the same word.
  const NM = {
    pre:  ['Dust','Ash','Rust','Salt','Cinder','Ember','Bone','Mud','Stone','Iron','Glass','Tar','Scrap','Husk','Grey','Pale','Bitter','Hollow','Thorn','Briar','Gloom','Murk','Cold','Drift','Crag','Sump','Slag','Char','Bramble','Flint','Reed','Fen','Moss','Pine','Oak','Elder','Hazel','Stag','Wolf','Raven','Fox','Bear','Hawk','Spire','Quarry','Soot','Smoke','Brine','Grist','Forge','Copper','Tin','Cobalt','Marrow','Sallow','Tallow','Wither','Lone','Weary'],
    suf:  ['ford','well','haven','hold','reach','fall','bend','crossing','gate','mire','hollow','ridge','stead','watch','end','row','burg','market','mill','forge','bridge','dale','moor','shore','point','cliff','rest','gulch','spring','wash','flat','bluff','post','ton','vale'],
    qual: ['New','Old','Upper','Lower','East','West','North','South','Far','Little','Great','Lost'],
    person:['Kael','Vorn','Hale','Mara','Sef','Dorn','Bex','Tam','Rue','Goll','Vance','Yara','Cray','Soll','Nix','Wren','Juno','Hask','Orly','Pell','Sable','Tace','Vell','Quill'],
    feat: ['Rest','Crossing','Landing','Camp','Hold','Wells','Reach','Ferry','Stand','Run','Folly','Refuge','Outpost','Watch','Claim','Roost','Bluff','Hollow','Bend','Spring'],
    city: ['Nuyok','Filade','Bostodge','Chigo','Ditroyt','Atlana','Memfis','Denva','Seatle','Portlan','Sanfran','Vegath','Dallax','Hewston','Pheonx','Baltmor','Klevlan','Pittsburk','Sin Loose','Noo Leans','Saint Loo','Cleve','Tampah','Orlann','Tuscon','Albukirk','Witcha','Omahaw','Tolido','Akrun','Renoh','Fresna','Spokan','Boysee','Helna','Fargoh','Duluth','Topeeka','Lubbok','Amrillo','Cheyen','Yuman','Tempeh'],

    rAdj: ['Shattered','Sunken','Glassed','Silent','Forgotten','Toppled','Bleached','Burnt','Drowned','Buried','Cracked','Fallen','Ashen','Vine-choked','Rusted','Flooded','Leaning','Sealed','Overgrown','Wind-scoured'],
    rForm:['Arcology','Towers','Concourse','Works','District','Causeway','Domes','Hab-Blocks','Exchange','Refinery','Campus','Terminal','Plant','Transit Yards','Skyway','Foundry','Reservoir','Pavilions','Ringway','Suburb'],
    rFacility:['Research Annex','Municipal Works','Medical Center','Transit Hub','Power Station','Waterworks','Freight Terminal','Data Campus','Defense Complex','Agricultural Lab','Civic Center','Materials Plant','Communications Array','Weather Station','Reclamation Yard','Orbital Office'],

    // Lair families. Complete or nearly complete phrases keep combinations
    // evocative and grammatical instead of producing random adjective soup.
    lMood:['Gnawed','Howling','Scaled','Rotting','Whispering','Festering','Ashen','Venomous','Snarling','Tainted','Mottled','Hungering','Skittering','Brackish','Glistening','Withered','Bloated','Shrieking','Clotted','Lightless','Breathing','Crawling','Warm','Watchful'],
    lLand:['Cleft','Sink','Gully','Wash','Crag','Fen','Reedbed','Bluff','Thicket','Mound','Caverns','Scree','Ravine','Basin','Cut','Scar','Ditch','Gorge','Badlands','Tangle','Deep'],
    lLandMarsh:['Reedbed','Mire','Fen','Sump','Backwater','Mudbank','Sink','Drowned Grove','Blackwater','Quagmire'],
    lLandMountain:['Cleft','Crag','Scree','Ravine','Gorge','Fault','High Cut','Talus','Ice Caves','Wind Gap'],
    lLandDesert:['Wash','Gully','Badlands','Dry Basin','Salt Cut','Dune Scar','Arroyo','Sunken Road','Dust Bowl','Mesa Caves'],
    lLandForest:['Thicket','Rootmaze','Briar Tangle','Hollow Wood','Moss Cleft','Deadfall','Canopy Sink','Black Grove','Fern Deep','Rotwood'],
    lLandRuin:['Service Level','Sub-Basement','Transit Cut','Utility Trench','Collapsed Deck','Access Shaft','Freight Crawl','Hab Tunnel','Drain Maze','Maintenance Ring'],
    lEpithet:['Glasswing','Rustclaw','Bonejaw','Ashback','Mudspine','Wireworm','Sporemaw','Red-Eye','Pale Fang','Black Moth','Needleback','Brine Toad','Soot Leech','Cinder Rat','Moss Horn','Tar Eel','Split-Horn','White Mandible','Longjaw','Glowbelly','Iron Pincer','Grey Crawler','Blue Chitin','Softshell'],
    lRelic:['Drainage Works','Cooling Tunnels','Service Shafts','Collapsed Interchange','Flooded Station','Buried Concourse','Old Quarry','Broken Aqueduct','Waste Sumps','Red Silo','Abandoned Waterworks','Dead Substation','Freight Tunnels','North Spillway','Dry Reservoir','Ventilation Plant','Storm Culverts','Lower Pump House','Cable Galleries','Reactor Outflow'],
    lOmen:['Many Teeth','Red Eyes','Empty Skins','Soft Footsteps','Cold Breath','Bent Antennae','Falling Feathers','Chittering Dark','White Bones','Long Hunger','Thousand Legs','Last Howl','Moving Walls','Wet Wings','No Shadows','Second Footfall','Hollow Voices','Warm Stones'],
    lClaim:['Camp','Claim','Blind','Refuge','Trap','Folly','Last Stand','Feeding Ground','Hunting Ground','Watch','Crawl','Bone Yard','Deadfall','Hideout','Old Claim'],
    lCollective:['Brood','Pack','Swarm','Colony','Clutch','Choir','Host','Warren','Nest'],
    lBrood:['Pale Wings','Red Eyes','Glass Teeth','Long Claws','Soft Feet','Black Moths','Wire Worms','Mud Toads','Ash Rats','Spore Hounds','Bone Ants','Needlebacks','Blind Eels','Iron Beetles','Glow Flies','White Mandibles'],
    lCode:['Habitat','Specimen Zone','Containment Site','Bio-Enclosure','Fauna Annex','Exclusion Cell'],

    corp: ['Ankhar','Createk','Vortex','Apertia','Helix','Genus','Omnitech','Ryker','Delvan','Solcorp','Maxon','Cyberdyne','Valtec','Nyx','Orbix','Hadron'],
    fNam: ['Cinder','Vance','Holt','Kael','Drummond','Stark','Reyes','Vorn','Hale','Marsh','Cray','Sable','Orly','Pell'],
    fSuf: ['Bastion','Redoubt','Bunker','Bulwark','Keep','Hold'],
    grk:  ['Alpha','Beta','Gamma','Delta','Theta','Sigma','Omega','Kappa','Lambda','Zeta','Epsilon','Phi'],
  };
  const NAME_AZ = 'ABCDEFGHJKLMNPRSTVWXZ';

  function lairLandPool(terrain){
    if (terrain === 'marsh' || terrain === 'coast') return NM.lLandMarsh;
    if (terrain === 'mountains' || terrain === 'snow-mountains' || terrain === 'forested-mountains') return NM.lLandMountain;
    if (terrain === 'desert') return NM.lLandDesert;
    if (terrain === 'forest' || terrain === 'heavy-forest' || terrain === 'forested-hill') return NM.lLandForest;
    if (terrain === 'ruins') return NM.lLandRuin;
    return NM.lLand;
  }

  function nameFor(kind, Q, R, terrain, variant){
    const G = window.GCCRng;
    const v = Number.isFinite(+variant) ? +variant : 0;
    const rng = G.mulberry32(G.seedFor(WORLD_SEED, 'name-v2', kind, Q, R, terrain || '', v));
    const pick = a => a[Math.floor(rng() * a.length)];
    const compound = () => pick(NM.pre) + pick(NM.suf);
    const settle = () => { const r = rng();
      if (r < 0.16) return pick(NM.person) + "'s " + pick(NM.feat);
      if (r < 0.30) return pick(NM.qual) + ' ' + compound();
      if (r < 0.38) return pick(NM.city) + ' Reach';
      return compound(); };

    // Coded designations derive from coordinates plus the deterministic retry
    // variant, so a rejected duplicate can produce a genuinely different code.
    const salt = (v + 1) * 83492791;
    const num3 = () => (((((Q * 73856093) ^ (R * 19349663) ^ salt) >>> 0) % 900) + 100);
    const lett = () => NAME_AZ[(((Q * 40503) ^ (R * 12289) ^ salt) >>> 0) % NAME_AZ.length];

    switch (kind){
      case 'village':
      case 'town':
      case 'city': return settle();

      case 'ruin': { const r = rng();
        if (r < 0.24) return 'Ruins of ' + compound();
        if (r < 0.40) return 'Ruins of ' + pick(NM.city);
        if (r < 0.58) return 'The ' + pick(NM.rAdj) + ' ' + pick(NM.rForm);
        if (r < 0.74) return pick(NM.corp) + ' ' + pick(NM.rFacility);
        if (r < 0.88) return pick(NM.qual) + ' ' + pick(NM.rFacility);
        return pick(NM.city) + ' ' + pick(NM.rForm); }

      case 'lair': {
        const land = lairLandPool(terrain);
        // A coordinate-seeded local place-name gives every prose family a much
        // larger identity space without falling back to visible hex numbers.
        const anchor = (rng() < 0.22 ? pick(NM.qual) + ' ' : '') + compound();
        // Eight roughly even families. No family dominates the map.
        switch (Math.floor(rng() * 8)){
          case 0: return 'The ' + pick(NM.lMood) + ' ' + pick(land) + ' of ' + anchor;
          case 1: return pick(NM.lEpithet) + ' ' + pick(land) + ' at ' + anchor;
          case 2: return anchor + ' ' + pick(NM.lRelic);
          case 3: return 'The ' + pick(NM.lOmen) + ' at ' + anchor;
          case 4: return pick(NM.person) + "'s " + pick(NM.lClaim) + ' at ' + anchor;
          case 5: return 'The ' + pick(NM.lBrood) + ' of ' + anchor;
          case 6: return 'Beneath ' + anchor;
          default:return pick(NM.lCode) + ' ' + lett() + '-' + num3();
        } }

      case 'vault':         return 'Vault ' + lett() + '-' + num3();
      case 'robot-farm':    return rng() < 0.5 ? 'Mech-Land ' + num3() : 'Agri-Complex ' + pick(NM.grk) + '-' + num3();
      case 'fortification': { const r = rng();
        if (r < 0.25) return 'Fort ' + pick(NM.fNam);
        if (r < 0.65) return compound() + ' ' + pick(NM.fSuf);
        return 'Bastion ' + num3(); }
      case 'spaceport': { const r = rng();
        if (r < 0.3) return 'Port ' + pick(NM.corp);
        if (r < 0.65) return compound() + ' Launch Complex';
        return 'Launch Pad ' + num3(); }
      case 'installation':  return 'Installation ' + pick(NM.grk) + '-' + num3();
      case 'monastery': { const r = rng();
        if (r < 0.4) return compound() + ' Monastery';
        if (r < 0.7) return 'Monastery of ' + pick(NM.person);
        return 'The ' + pick(NM.rAdj) + ' Cloister'; }
      default: return compound();
    }
  }

  function normalizedName(s){
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function finalWord(s){
    const a = normalizedName(s).split(/\s+/).filter(Boolean);
    return a.length ? a[a.length - 1] : '';
  }

  // Assign names as a group so one parent cannot generate duplicate labels or
  // five neighboring lairs all ending in "Pit". Retries are deterministic and
  // therefore safe for atlas previews and repeat generation.
  function assignGeneratedNames(placed, parentTerrain){
    const used = new Set();
    const lairTails = new Map();
    return placed.map(p => {
      const terrain = p.terrain || parentTerrain || 'unknown';
      let chosen = '';
      let chosenTail = '';
      for (let variant = 0; variant < 24; variant++){
        const candidate = nameFor(p.kind, p.Q, p.R, terrain, variant);
        const key = normalizedName(candidate);
        const tail = p.kind === 'lair' ? finalWord(candidate) : '';
        const repeatedTail = tail && (lairTails.get(tail) || 0) > 0;
        if (!used.has(key) && !repeatedTail){ chosen = candidate; chosenTail = tail; break; }
        // Exact uniqueness remains mandatory. After many retries, permit a
        // repeated final word rather than falling back to coordinate gibberish.
        if (variant >= 16 && !used.has(key)){ chosen = candidate; chosenTail = tail; break; }
      }
      if (!chosen) chosen = nameFor(p.kind, p.Q, p.R, terrain, 97);
      used.add(normalizedName(chosen));
      if (p.kind === 'lair'){
        chosenTail = chosenTail || finalWord(chosen);
        if (chosenTail) lairTails.set(chosenTail, (lairTails.get(chosenTail) || 0) + 1);
      }
      return chosen;
    });
  }

  function planForParent(col, row){
    const D = window.GWSubhexData, R = window.GCCRng;
    if (!D || !R){ console.warn('[gw-feature-gen] deps missing'); return null; }
    const pk = col + ',' + row;
    const cells = D.ownedByParent(col, row) || [];
    if (!cells.length){
      return { parent: pk, col, row, parentTerrain: D.parentTerrainOf(col, row), markers: [], strokes: [], stats: { markers: 0, strokes: 0, settlements: 0, sites: 0 } };
    }

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
      placed.push({ Q: c.Q, R: c.R, x: ctr.x, y: ctr.y, kind, terrain: sub.terrain, hazard: sub.hazard });
    }
    placeRareSites(D, R, cells, pt, placed, col, row);   // top-down: robot farms / forts / spaceports

    const generatedNames = assignGeneratedNames(placed, pt);
    const markers = placed.map((p, i) => ({
      kind: p.kind, x: p.x, y: p.y,
      gen: true, parent: pk, name: generatedNames[i],
      Q: p.Q, R: p.R,
    }));
    const strokes = [];

    const settle = placed.filter(p => p.kind === 'town' || p.kind === 'village');
    for (const e of mst(settle)){
      if (e.d > MAX_ROAD) continue;
      strokes.push({ kind: 'road', pts: jitterPath(settle[e.a], settle[e.b], rng), gen: true, parent: pk });
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
      if (best){ used.add(best.i); strokes.push({ kind: 'trail', pts: jitterPath(s, sites[best.i], rng), gen: true, parent: pk }); }
    }

    return {
      parent: pk, col, row,
      parentTerrain: pt,
      markers,
      strokes,
      stats: { markers: markers.length, strokes: strokes.length, settlements: settle.length, sites: sites.length },
    };
  }

  function generateForParent(col, row){
    const A = window.GWAnnotations;
    if (!A){ console.warn('[gw-feature-gen] deps missing'); return null; }
    const pk = col + ',' + row;
    const plan = planForParent(col, row);
    if (!plan) return null;
    A.clearGenerated(pk);
    for (const m of plan.markers){ A.addMarker(m.kind, m.x, m.y, { gen: true, parent: pk, name: m.name, deferSave: true }); }
    for (const s of plan.strokes){ A.addStroke(s.kind, s.pts, { gen: true, parent: pk, deferSave: true }); }
    A.flush();
    return plan.stats;
  }
  function clearForParent(col, row){
    if (!window.GWAnnotations) return 0;
    return window.GWAnnotations.clearGenerated(col + ',' + row);
  }

  window.GWFeatureGen = { planForParent, generateForParent, clearForParent, FEATURE_RATES };
  try { console.log('[gw-feature-gen] v0.8.0 loaded'); } catch(_){}
})();
