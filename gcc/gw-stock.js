// gw-stock.js v0.2.0 — Gamma World 1e site stocking (deterministic dossiers).
// Rolls who/what occupies a generated or placed site, grounded in GW1e: settlement
// sizes + shaman rule, the 13 Cryptic Alliances, character types (PSH / humanoid /
// mutated animal / mutated plant / android), Mech-Land and fortification contents,
// ancient-ruin tiers, and spaceports. Deterministic per (kind, Q, R) so a site's
// dossier is stable and survives re-generation. Depends on window.GCCRng.
(function(){
  'use strict';
  const SEED = 'gamma-terra-v1';
  const G = () => window.GCCRng;

  const INHAB = { psh:'Pure Strain Humans', humanoid:'humanoids', animal:'mutant animals', plant:'mutant plants', android:'androids' };
  const SHORT = { psh:'PSH', humanoid:'humanoid', animal:'mutant animal', plant:'mutant plant', android:'android' };

  // Cryptic Alliances (GW1e). terr = terrains that bias their presence; sizes = the
  // settlement scales they tend to hold; accepts/hostile by character type; weight
  // = base relative frequency.
  const ALLIANCES = [
    { key:'brotherhood', name:'Brotherhood of Thought',
      gist:'Unify all intelligent creatures in enlightened coexistence.',
      accepts:['humanoid','psh','animal'], hostile:[], disp:'peaceable, keeps a low profile',
      terr:['forest','heavy-forest','forested-hill','forested-mountains','mountains','hills'], sizes:['village'], weight:3 },
    { key:'seekers', name:'The Seekers',
      gist:'Unite humans and mutants; eradicate all surviving technology.',
      accepts:['psh','humanoid'], hostile:[], disp:'guarded, wealthy, anti-tech',
      terr:['plains','coast','hills'], sizes:['village','town','city'], weight:2 },
    { key:'purists', name:'Knights of Genetic Purity',
      gist:'Pure Strain Humans who hunt mutated humans. Bear a red square.',
      accepts:['psh'], hostile:['humanoid'], disp:'openly hostile to mutants',
      terr:['ruins','plains','desert'], sizes:['village','town'], weight:2 },
    { key:'entropy', name:'Friends of Entropy (Red Death)',
      gist:'Seek the extinction of all life and the end of all machines.',
      accepts:['humanoid','psh'], hostile:['psh','humanoid','animal','plant','android'], disp:'hostile, raiding, steals children',
      terr:['desert','marsh'], sizes:['village'], weight:1 },
    { key:'iron', name:'The Iron Society',
      gist:'Human mutants bent on destroying every Pure Strain Human.',
      accepts:['humanoid'], hostile:['psh'], disp:'hostile to PSH; mutant powers + Ancient arms',
      terr:['desert','ruins'], sizes:['village','town'], weight:2 },
    { key:'zoo', name:'Zoopremisists',
      gist:'Thinking mutant animals who would rule; telepathic secret police.',
      accepts:['animal'], hostile:['psh','humanoid'], disp:'secretive, hostile to humans',
      terr:['forest','heavy-forest','marsh','forested-hill'], sizes:['village'], weight:1 },
    { key:'healers', name:'The Healers',
      gist:'Quasi-monastic order tending the sick of any race. Widely respected.',
      accepts:['humanoid','psh','animal','plant'], hostile:[], disp:'benevolent; rarely attacked',
      terr:[], sizes:['village','town'], weight:2 },
    { key:'restorationists', name:'The Restorationists',
      gist:'Rebuild the lost civilization; armed with Ancient weapons and robots.',
      accepts:['psh','humanoid'], hostile:[], disp:'single-minded, shuns other alliances',
      terr:['ruins'], sizes:['village','town','city'], weight:2 },
    { key:'voice', name:'Followers of the Voice',
      gist:'Worship computers; gather near working installations.',
      accepts:['humanoid','psh','animal','android'], hostile:[], disp:'zealous, machine-reverent',
      terr:['ruins'], sizes:['village','town'], weight:1 },
    { key:'ranks', name:'The Ranks of the Fit',
      gist:'Militarist order seeking world rule; only mutant animals lead.',
      accepts:['animal','humanoid','psh'], hostile:[], disp:'militaristic, expansionist',
      terr:['plains','hills','coast'], sizes:['town','city'], weight:2 },
    { key:'archivists', name:'The Archivists',
      gist:'Small humanoids who hoard and worship artifacts in deep caves.',
      accepts:['humanoid'], hostile:[], disp:'acquisitive, reclusive',
      terr:['mountains','hills','ruins'], sizes:['village'], weight:1 },
    { key:'radioactivists', name:'The Radioactivists',
      gist:'Cult of a radiation god; thrive in irradiated wastes.',
      accepts:['humanoid','animal'], hostile:[], disp:'fanatical',
      terr:['desert'], sizes:['village'], weight:1 },
    { key:'created', name:'The Created',
      gist:'Android cult; machine-made life should rule. They pass as human.',
      accepts:['android'], hostile:[], disp:'subversive, hidden among humans',
      terr:['ruins'], sizes:['town','city'], weight:1 },
  ];

  // Map-overlay tints for the parent-hex territory layer (single source of truth).
  const ALLIANCE_COLOR = {
    brotherhood:'#4a90d9', seekers:'#7cb342', purists:'#e53935', entropy:'#263238',
    iron:'#546e7a', zoo:'#fb8c00', healers:'#26a69a', restorationists:'#5e35b1',
    voice:'#00bcd4', ranks:'#3949ab', archivists:'#fdd835', radioactivists:'#c0ca33',
    created:'#ec407a',
  };
  for (const a of ALLIANCES) a.color = ALLIANCE_COLOR[a.key] || '#888888';

  const TITLES = {
    village: ['Shaman','Chief','Elder','Witch-doctor','Speaker','Boss','Headman'],
    town:    ['Warlord','Boss','High Elder','Marshal','Overseer','Reeve'],
    city:    ['Warlord','Governor','Lord-Mayor','Overseer','High Speaker','Archon'],
  };
  const HOOKS = ['a working Ancient energy pistol','a humming artifact none else can wake','a data slate of the Ancients',
    'a med-kit that brings back the dying','a robot servant that obeys only them','a map to a sealed vault',
    'an Ancient com-unit that sometimes answers','a glowing power cell kept as a holy relic',
    'a suit of intact Ancient armor','the pass-codes to a nearby Mech-Land'];

  const mk = (kind,Q,R) => G().mulberry32(G().seedFor(SEED,'stock',kind,Q,R));
  const pickF = rng => arr => arr[Math.floor(rng()*arr.length)];

  function settlement(kind, rng, ctx){
    const pick = pickF(rng);
    const size = kind === 'city' ? 'city' : kind === 'town' ? 'town' : 'village';
    const pop = size==='village' ? 50 + Math.floor(rng()*451)
              : size==='town'    ? 500 + Math.floor(rng()*3500)
              :                     5000 + Math.floor(rng()*45001);
    const terr = ctx && ctx.terrain, irr = ctx && ctx.hazard === 'radiation';

    let alliance = null;
    const affChance = size==='village' ? 0.30 : size==='town' ? 0.40 : 0.45;
    if (rng() < affChance){
      const pool = [];
      for (const a of ALLIANCES){
        if (a.sizes.indexOf(size) < 0) continue;
        let w = a.weight;
        if (a.terr.length && (a.terr.indexOf(terr) >= 0 || (irr && (a.key==='iron'||a.key==='radioactivists'||a.key==='entropy')))) w *= 3;
        for (let i=0;i<w;i++) pool.push(a);
      }
      if (pool.length) alliance = pool[Math.floor(rng()*pool.length)];
    }

    let dominant, minorities = [];
    if (alliance){
      dominant = alliance.accepts[0];
      minorities = alliance.accepts.slice(1, 3);
    } else {
      const base = irr            ? ['humanoid','humanoid','animal','psh']
                 : terr==='ruins' ? ['psh','humanoid','humanoid','animal']
                 :                  ['humanoid','humanoid','psh','animal','plant'];
      dominant = base[Math.floor(rng()*base.length)];
      const others = ['psh','humanoid','animal','plant'].filter(t => t !== dominant);
      const n = 1 + Math.floor(rng()*2);
      for (let i=0;i<n && others.length;i++) minorities.push(others.splice(Math.floor(rng()*others.length),1)[0]);
    }

    const leaderType = alliance ? alliance.accepts[0] : dominant;
    const hook = (size==='village' && !alliance) ? ', who holds ' + pick(HOOKS) : '';
    const disp = alliance ? alliance.disp
               : size==='village' ? 'suspicious and shy of outsiders'
               : size==='town'    ? 'wary but open to trade'
               :                     'cosmopolitan but guarded';
    const tech = alliance && (alliance.key==='restorationists' || alliance.key==='iron' || alliance.key==='purists') ? 'Ancient weapons in evidence'
               : alliance && (alliance.key==='seekers' || alliance.key==='entropy') ? 'technology shunned or destroyed'
               : size==='village' ? 'low — the crossbow is the "ultimate weapon"'
               : size==='town'    ? 'modest, with some salvaged gear'
               :                     'mixed, a few Ancient devices in use';

    const noun = size==='village' ? 'villagers' : size==='town' ? 'townsfolk' : 'inhabitants';
    const lines = [
      ['Population', pop.toLocaleString() + ' ' + noun],
      ['Inhabitants', 'Mostly ' + INHAB[dominant] + (minorities.length ? ', with ' + minorities.map(m=>INHAB[m]).join(' & ') : '')],
      ['Affiliation', alliance ? alliance.name : 'Independent'],
    ];
    if (alliance) lines.push(['Agenda', alliance.gist]);
    lines.push(['Leader', 'A ' + SHORT[leaderType] + ' ' + pick(TITLES[size]) + hook]);
    lines.push(['Disposition', disp]);
    lines.push(['Tech level', tech]);
    return lines;
  }

  function dossierFor(kind, Q, R, ctx){
    if (!G()) return null;
    const rng = mk(kind, Q, R), pick = pickF(rng);
    let lines;
    switch (kind){
      case 'village': case 'town': case 'city':
        lines = settlement(kind, rng, ctx); break;
      case 'robot-farm': {
        const own = rng() < 0.55;
        lines = [
          ['Maintenance robots', String(3 + Math.floor(rng()*10))],
          ['Security robots', String(1 + Math.floor(rng()*10))],
          ['Control', 'logic circuits in the main control building'],
          ['Ownership', own ? 'private to a local ' + pick(['tribe','village','city']) + ' (human/humanoid guards too)' : 'unclaimed, fully robot-run'],
          ['Access', 'proper Ancient authorization yields food without rousing security'],
        ]; break; }
      case 'fortification': {
        const r = rng();
        const state = r < 0.5 ? 'Depowered' : r < 0.85 ? 'Active' : 'Manned';
        const note = state==='Depowered' ? 'security dead; likely already sacked of useful contents'
                   : state==='Active'    ? 'security systems and robots still run on pre-2322 programming, but no commander'
                   :                       'active, with a directing intelligence — ' + pick(['remnant Ancients','a band of Restorationists','a self-styled warlord','a rogue computer']);
        lines = [['State', state], ['Notes', note], ['Contents', rng()<0.5 ? 'relatively intact and unharmed' : 'partly stripped']]; break; }
      case 'installation': {
        const t = pick(['military','earthquake-proof','research']);
        const sec = 1 + Math.floor(rng()*10);
        lines = [['Type', 'Ancient ' + t + ' installation'], ['Security robots', String(sec)]];
        if (t==='military') lines.push(['Defenses', (rng()<0.25 ? (1+Math.floor(rng()*4))+' defense/attack bots; ' : '') + (rng()<0.5 ? 'electronic security still active' : 'electronic security offline')]);
        else if (t==='earthquake-proof') lines.push(['Contents', 'important Ancient government records']);
        else lines.push(['Defenses', rng()<0.75 ? 'a powerful security system still functions' : 'security system has failed']);
        break; }
      case 'spaceport':
        lines = [['Setting', 'center of an extremely irradiated devastation'],
                 ['Survived', 'shielded — complex equipment, aircraft, spacecraft' + (rng()<0.3 ? ', and possibly a starship' : '')]]; break;
      case 'vault':
        lines = [['Type', 'sealed Ancient cache'], ['Contents', pick(['Ancient devices and power cells','records and data slates','dormant robots','weapons of the Ancients','sealed and unknown'])]]; break;
      case 'ruin': {
        const r = rng();
        const tier = r < 0.30 ? 'Ancient Building' : r < 0.55 ? 'Ancient Village' : r < 0.75 ? 'Ancient Town' : r < 0.90 ? 'Ancient City' : 'Ancient Metropolis';
        const note = tier==='Ancient Building' ? 'a structure tough enough to survive — military, earthquake-proof, or research'
                   : tier==='Ancient Village' || tier==='Ancient Town' ? 'picked clean of useful materials; good only for shelter, often overgrown'
                   : tier==='Ancient City' ? 'a residue of hard radiation — dangerous, but a likely place to find Ancient devices'
                   : 'mile upon mile of radioactive slag; surviving pockets almost surely hold Ancient devices';
        lines = [['Tier', tier], ['Notes', note]]; break; }
      case 'lair': {
        const n = 1 + Math.floor(rng()*8);
        const noun = pick(['beast','horror','predator','thing','brute']);
        lines = [['Occupants', n + ' mutated ' + (n === 1 ? noun : noun + 's')],
                 ['Roll on', 'creature/bestiary tables for the exact occupant']]; break; }
      case 'monastery':
        lines = [['Order', pick(['the Healers','a contemplative order','an unaffiliated brotherhood'])],
                 ['Notes', 'tends the sick and wounded of any race; rarely attacked']]; break;
      default:
        return null;
    }
    return { name: ctx && ctx.name ? ctx.name : null, lines };
  }

  window.GWStock = { dossierFor, ALLIANCES };
  try { console.log('[gw-stock] v0.2.0 loaded', { alliances: ALLIANCES.length }); } catch(_){}
})();
