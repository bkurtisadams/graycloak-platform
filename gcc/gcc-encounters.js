// gcc-encounters.js v2.0.0 — 2026-04-30
// v2.0.0 (Slice 4): waterborne dispatch. When the caller passes
// opts.lakeId to check() (typically the journey planner when the
// party is on a subhex with a lakeId), check() looks up the lake
// doc via GCCSubhexData.getLake, picks the table by lake.kind ×
// lake.depth (lake_shallow / lake_deep / sea_shallow / sea_deep),
// and rolls on it. Tables are stubbed empty in
// gcc-encounter-data.js for now — engine returns "no entries
// seeded" until they're filled in.
//
// contextFor stays pure parent-level. Lakes are subhex-resolved
// at the call site, not in contextFor.
//
// Per design DESIGN-paths-water.md Slice 4.
//
// gcc-encounters.js — AD&D 1e encounter engine for GCC
//
// Wraps the data in gcc-encounter-data.js with:
//   1. Hex-context resolver: (col,row) → terrain + region + table key
//   2. Encounter check: timing rule + frequency die per population
//   3. Table roll: regional/geographic overlay → DMG fallback
//   4. Reaction / distance / surprise rolls per DMG
//   5. Monster Manual lookup
//
// Pure logic, no DOM. Result panel rendering lives in
// gcc-encounter-panel.js. Foundry-specific bits (ChatMessage,
// game.settings, Actor creation, ARS integration) deliberately
// stripped — GCC has no Foundry context.
//
// Public API:
//   GCCEncounters.checkParty()       roll for the party's current hex
//   GCCEncounters.check({col, row})  roll for an arbitrary hex
//   GCCEncounters.lookupMonster(name) MM stats for a creature name
//   GCCEncounters.contextFor(col,row) inspect the resolved context
//                                     (debug; doesn't roll anything)
//
// ─── DATA SOURCE & DISPLAY CONVENTION ─────────────────────────────────────
// gcc-encounter-data.js bundles the MM, DMG outdoor tables, and Greyhawk
// regional/geographic tables verbatim from the adndEnc Foundry module.
// Treat that file as immutable upstream data — do not edit it to "fix"
// values. The data is shared across the engine, the panel, and any
// future consumers; corrections at the source create maintenance debt
// (forked data, lost upstream updates, opaque rationale for changes).
//
// When a value displays incorrectly, the right fix is at the consumer
// layer:
//
//   Wrong creature lookup       → MM_ALIAS in this file (e.g., 'Men,
//                                 Brigand' → 'Men, Bandit', table
//                                 spelling vs MM canonical, etc.)
//   Movement undersells mount   → MOVEMENT_OVERRIDES in
//                                 gcc-encounter-panel.js (e.g., MM says
//                                 mounted patrols all move 12", but
//                                 knights actually ride heavy warhorses
//                                 at 15")
//   Display format conversion   → render-time helpers in
//                                 gcc-encounter-panel.js (e.g.,
//                                 movementToInches converts the MM's
//                                 "120 ft" to canonical 1e "12\"")
//
// Each override is a documented one-liner with a canon citation in its
// comment. The override map IS the documentation — if you find a wrong
// value, add an entry here rather than editing the data file.
// ──────────────────────────────────────────────────────────────────────────

(function(){
  'use strict';

  // ── Terrain mapping ───────────────────────────────────────────────────────
  // GCC terrain enum has more variety than the DMG's 7 outdoor terrain
  // types. Map GCC's strings to DMG's. Water hexes return null because
  // v1 doesn't handle waterborne encounters.
  const TERRAIN_TO_DMG = {
    plains:        'plain',
    hardwood:      'forest',
    conifer:       'forest',
    jungle:        'forest',
    forest_hills:  'forest',  // ambiguous; the encounter mix leans forest
    hills:         'hills',
    mountains:     'mountains',
    desert:        'desert',
    barrens:       'scrub',
    swamp:         'marsh',
    // Water types are out of scope for v1 (would need underwater /
    // waterborne tables). Return null so the engine reports "no
    // encounters available for this hex" cleanly.
    water:            null,
    water_fresh:      null,
    water_inland_sea: null,
    water_coastal:    null,
    water_shallow:    null,
    water_deep:       null,
  };

  // ── Region → encounter table key ──────────────────────────────────────────
  // The adndEnc module groups regions that share monster ecology under
  // a single table key (e.g., Bissel/Gran March/Keoland share one
  // table because they share a frontier-march encounter mix). This
  // map translates BASE region names into those table keys. Regions
  // not listed have no political-overlay table; the engine falls
  // straight to the DMG terrain table for them.
  const REGION_TABLE_KEY = {
    // Central Flanaess
    'City of Greyhawk':      'greyhawk',
    'Domain of Greyhawk':    'greyhawk',
    'Wild Coast':            'wild_coast',
    'County of Urnst':       'county_duchy_urnst',
    'Duchy of Urnst':        'county_duchy_urnst',
    // Sheldomar
    'Kingdom of Keoland':    'bissel_gran_march_keoland',
    'Gran March':            'bissel_gran_march_keoland',
    'March of Bissel':       'bissel_gran_march_keoland',
    'Yeomanry':              'geoff_sterich_yeomanry',
    'Sterich':               'geoff_sterich_yeomanry',
    'Grand Duchy of Geoff':  'geoff_sterich_yeomanry',
    'County of Ulek':        'county_duchy_principality_ulek',
    'Duchy of Ulek':         'county_duchy_principality_ulek',
    'Principality of Ulek':  'county_duchy_principality_ulek',
    // North-west
    'Archclericy of Veluna': 'furyondy_shield_lands_veluna',
    'Kingdom of Furyondy':   'furyondy_shield_lands_veluna',
    'Shield Lands':          'furyondy_shield_lands_veluna',
    'Highfolk':              'highfolk',
    'Valley of the Highfolk':'highfolk',
    'Perrenland':            'ket_perrenland',
    'Horned Society':        'horned_society',
    'Empire of Iuz':         'iuz',
    'Bandit Kingdoms':       'bandit_kingdoms',
    'Ket':                   'ket_perrenland',
    // North / north-east
    'Rovers of the Barrens': 'rovers_of_the_barrens',
    'Theocracy of the Pale': 'pale_ratik_tenh',
    'Duchy of Tenh':         'pale_ratik_tenh',
    'Archbarony of Ratik':   'pale_ratik_tenh',
    'Bone March':            'bone_march',
    // Central / east
    'Kingdom of Nyrond':     null,  // no specific WoG table; falls to DMG
    'Great Kingdom':         'great_kingdom_medegia_north_province_south_province',
    'North Province':        'great_kingdom_medegia_north_province_south_province',
    'South Province':        'great_kingdom_medegia_north_province_south_province',
    'See of Medegia':        'great_kingdom_medegia_north_province_south_province',
    'County of Sunndi':      'scarlet_brotherhood_sunndi',
    'County of Idee':        'idee_irongate_onnwal',
    'State of Onnwal':       'idee_irongate_onnwal',
    'Free City of Irongate': 'idee_irongate_onnwal',
    'Scarlet Brotherhood':   'scarlet_brotherhood_sunndi',
    // South / sea
    'Hold of the Sea Princes': 'sea_princes',
    'Pomarj':                'pomarj',
    // Special
    'Celene':                'celene',
    // Geographic features that have their own tables — these win over
    // the political overlay when a hex is in both. The adndEnc engine's
    // GREYHAWK_GEOGRAPHICAL_TABLES handles these. Region names map to
    // those keys here.
    'Vesve Forest':          'vesve_forest_eastern',  // default to eastern half
    'Gnarley Forest':        'gnarley_forest',
    'Welkwood':              'welkwood',
    'Suss Forest':           'suss_forest',
    'Dim Forest':            'dim_forest',
    'Oytwood':               'oytwood',
    'Hornwood':              'hornwood',
    'Dreadwood':             'dreadwood',
    'Menowood':              'axewood_menowood_silverwood',
    'Celadon Forest':        'celadon_forest',
    'Adri Forest':           'adri_forest',
    'Phostwood':             'bramblewood_nutherwood_phostwood_udgru',
    'Burneal Forest':        'burneal_forest',
    'Fellreev Forest':       'fellreev_forest',
    'Forlorn Forest':        'forlorn_forest',
    'Gamboge Forest':        'gamboge_forest',
    'Spikey Forest':         'spikey_forest',
    'Loftwood':              'loftwood_timberway',
    'Grandwood Forest':      'grandwood',
    'Timberway Forest':      'loftwood_timberway',
    'Rieuwood':              'rieuwood',
    'Amedio Jungle':         'amedio_jungle_hepmonaland',
    // Mountains
    'Lortmil Mountains':     'lortmil_mountains',
    'Crystalmist Mountains': 'barrier_peaks_crystalmist_jotens',
    'Hellfurnaces':          'hellfurnaces',
    'Sulhaut Mountains':     'sulhaut_mountains',
    'Yatil Mountains':       'clatspur_range_yatil_mountains',
    'Clatspur Range':        'clatspur_range_yatil_mountains',
    'Barrier Peaks':         'barrier_peaks_crystalmist_jotens',
    'Jotens':                'barrier_peaks_crystalmist_jotens',
    'Griff Mountains':       'corusk_mountains_griff_mountains_rakers',
    'Corusk Mountains':      'corusk_mountains_griff_mountains_rakers',
    'Rakers':                'corusk_mountains_griff_mountains_rakers',
    'Glorioles':             'hestmark_highlands_glorioles',
    'Hestmark Highlands':    'hestmark_highlands_glorioles',
    'Drachensgrab Mountains':'blemu_hills_bluff_hills_drachensgrabs_howling_hills_spire_ridge_tors',
    'Ulsprue Mountains':     'ullsprue',
    // Hills
    'Cairn Hills':           'cairn_hills',
    'Kron Hills':            'kron_hills',
    'Abbor-Alz':             'abbor_alz',
    'Flinty Hills':          'flinty_hills_good_hills_gull_cliffs_headlands_hollow_highlands_iron_hills_little_hills_lorridges_stark_mounds',
    'Good Hills':            'flinty_hills_good_hills_gull_cliffs_headlands_hollow_highlands_iron_hills_little_hills_lorridges_stark_mounds',
    'Iron Hills':             'flinty_hills_good_hills_gull_cliffs_headlands_hollow_highlands_iron_hills_little_hills_lorridges_stark_mounds',
    'Headlands':              'flinty_hills_good_hills_gull_cliffs_headlands_hollow_highlands_iron_hills_little_hills_lorridges_stark_mounds',
    'Stark Mounds':           'flinty_hills_good_hills_gull_cliffs_headlands_hollow_highlands_iron_hills_little_hills_lorridges_stark_mounds',
    'Tusman Hills':           'sepia_uplands_tusman_hills_yecha_hills',
    'Yecha Hills':            'sepia_uplands_tusman_hills_yecha_hills',
    'Sepia Uplands':          'sepia_uplands_tusman_hills_yecha_hills',
    'Lorridges':              'flinty_hills_good_hills_gull_cliffs_headlands_hollow_highlands_iron_hills_little_hills_lorridges_stark_mounds',
    'Bluff Hills':            'blemu_hills_bluff_hills_drachensgrabs_howling_hills_spire_ridge_tors',
    'Blemu Hills':            'blemu_hills_bluff_hills_drachensgrabs_howling_hills_spire_ridge_tors',
    'Drachensgrab Hills':     'blemu_hills_bluff_hills_drachensgrabs_howling_hills_spire_ridge_tors',
    'Gull Cliffs':            'flinty_hills_good_hills_gull_cliffs_headlands_hollow_highlands_iron_hills_little_hills_lorridges_stark_mounds',
    'Hollow Highlands':       'flinty_hills_good_hills_gull_cliffs_headlands_hollow_highlands_iron_hills_little_hills_lorridges_stark_mounds',
    'Howling Hills':          'blemu_hills_bluff_hills_drachensgrabs_howling_hills_spire_ridge_tors',
    'Little Hills':           'flinty_hills_good_hills_gull_cliffs_headlands_hollow_highlands_iron_hills_little_hills_lorridges_stark_mounds',
    'Spine Ridge':            'blemu_hills_bluff_hills_drachensgrabs_howling_hills_spire_ridge_tors',
    'Tors':                   'blemu_hills_bluff_hills_drachensgrabs_howling_hills_spire_ridge_tors',
    // Swamps
    'Vast Swamp':             'vast_swamp',
    'Cold Marshes':           'cold_marshes',
    'Lone Heath':             'lone_heath',
    // Wastelands
    'Bright Desert':          'bright_desert',
    'Sea of Dust':            'sea_of_dust',
    'Land of Black Ice':      'land_of_black_ice',
    'Dry Steppes':            'dry_steppes',
    'Rift Canyon':            'rift_canyon',
  };

  // ── Dice ──────────────────────────────────────────────────────────────────
  // Tiny dice utility: roll 'NdM' / 'NdM+K' / 'NdM-K' / 'N-M' / fixed
  // numbers. Returns an integer. Number-appearing strings in the data
  // sometimes use '2-7' (range), '1d4+1' (formula), '2d4' (count), '1'
  // (fixed). Handle all four.
  function rollDice(formula){
    if (formula == null) return 1;
    if (typeof formula === 'number') return formula;
    const s = String(formula).trim().toLowerCase();
    if (s === '') return 1;
    const fixed = parseInt(s, 10);
    if (!isNaN(fixed) && String(fixed) === s) return fixed;
    // Range form '2-7'
    let m = s.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m){
      const lo = +m[1], hi = +m[2];
      return lo + Math.floor(Math.random() * (hi - lo + 1));
    }
    // Dice form 'NdM' / 'NdM+K' / 'NdM-K'
    m = s.match(/^(\d+)d(\d+)\s*([+-]\s*\d+)?$/);
    if (m){
      const n = +m[1], die = +m[2];
      const mod = m[3] ? +m[3].replace(/\s+/g,'') : 0;
      let total = 0;
      for (let i = 0; i < n; i++) total += 1 + Math.floor(Math.random() * die);
      return total + mod;
    }
    // Multiple dice expressions joined with + ('11d6 + 1d6')
    if (s.includes('+')){
      const parts = s.split('+').map(p => p.trim());
      return parts.reduce((sum, p) => sum + rollDice(p), 0);
    }
    // Fallback: 1
    return 1;
  }
  function d(sides){ return 1 + Math.floor(Math.random() * sides); }

  // ── Encounter check (timing rule + frequency die) ─────────────────────────
  function checkOccurs(dmgTerrain, timeOfDay, population){
    const D = window.GCCEncounterData;
    if (!D) return { occurs: false, reason: 'Encounter data not loaded' };
    const allowedTimes = D.DMG_OUTDOOR_TIMING_RULES[dmgTerrain] || [
      'morning','noon','evening','night',
    ];
    if (!allowedTimes.includes(timeOfDay)){
      return {
        occurs: false,
        reason: `No encounters in ${dmgTerrain} during ${timeOfDay}`,
        roll: null,
      };
    }
    const freq = D.DMG_ENCOUNTER_FREQUENCY[population] || D.DMG_ENCOUNTER_FREQUENCY.uninhabited;
    const roll = d(freq.die);
    return {
      occurs: roll <= freq.successOn,
      reason: roll <= freq.successOn ? 'Encounter!' : 'No encounter this check',
      roll,
      die: freq.die,
      successOn: freq.successOn,
    };
  }

  // ── Table roll (handles both DMG-style {min,max} rows and either
  //    'creature' or 'encounter' field name) ────────────────────────────────
  function rollOnTable(table){
    if (!Array.isArray(table) || table.length === 0) return null;
    const roll = d(100);
    for (const row of table){
      if (roll >= row.min && roll <= row.max){
        return {
          roll,
          monster:    row.creature || row.encounter || row.monster || row.type || row.race || '?',
          number:     row.number || row.numberAppearing || null,
          subtable:   row.subtable || null,
          useStandard: !!row.useStandard,
          note:       row.note || null,
          raw:        row,
        };
      }
    }
    return { roll, monster: '?', number: null, raw: null };
  }

  // ── Resolve subtable ──────────────────────────────────────────────────────
  // DMG outdoor rolls return things like { creature:'Demi-human',
  // subtable:'demi_human' }. Resolve once into a concrete monster.
  // Greyhawk regional tables sometimes list "Demi-human" / "Humanoid"
  // as the encounter without an explicit subtable field — detect
  // those and route to the same subtables so we always end up with
  // a concrete creature name.
  const IMPLICIT_SUBTABLES = {
    'demi-human': 'demi_human',
    'demihuman':  'demi_human',
    'humanoid':   'humanoid',
  };
  function resolveSubtable(result, dmgTerrain){
    const D = window.GCCEncounterData;
    let key = result.subtable;
    if (!key && result.monster){
      const norm = String(result.monster).toLowerCase().trim();
      if (IMPLICIT_SUBTABLES[norm]) key = IMPLICIT_SUBTABLES[norm];
    }
    if (!key) return result;
    let sub = D.DMG_SUBTABLES?.[key];
    if (!sub) return result;
    // Some subtables (humanoid, demi_human) are nested by terrain —
    // { plain: [...], scrub: [...], forest: [...] }. Pick the current
    // terrain's array; fall back to 'plain' if the terrain isn't
    // represented (shouldn't happen for canonical DMG subtables, but
    // belt-and-suspenders).
    if (!Array.isArray(sub)){
      sub = sub[dmgTerrain] || sub.plain || sub[Object.keys(sub)[0]];
    }
    if (!Array.isArray(sub)) return result;
    const subResult = rollOnTable(sub);
    if (!subResult) return result;
    return {
      ...result,
      monster: subResult.monster,
      number:  subResult.number || result.number,
      subtable: null,
      subtableUsed: key,
      subtableRoll: subResult.roll,
      note: subResult.note || result.note,
    };
  }

  // ── Reaction / distance / surprise (DMG) ──────────────────────────────────
  function rollReaction(){
    const r = 2 + Math.floor(Math.random()*6) + Math.floor(Math.random()*6);
    let label;
    if (r <= 4)       label = 'Hostile';
    else if (r <= 6)  label = 'Unfriendly';
    else if (r <= 8)  label = 'Neutral';
    else if (r <= 10) label = 'Indifferent';
    else              label = 'Friendly';
    return { roll: r, label };
  }
  // DMG p.48 outdoor encounter distance: base 6d4 inches (1" = 10 yd
  // outdoors → 60-240 yd). Terrain modifies EACH die before summing:
  //   Plain, desert, hills, mountains: no modification
  //   Scrub:  −1 per die rolling 3 or 4
  //   Forest: −1 per die on EVERY roll (00's possible — i.e. 0 dist =
  //           immediate confrontation)
  //   Marsh:  −1 per die rolling 2, 3, or 4
  // Surprise further reduces the result by the surpriser's free-
  // segment count in inches (passed in by the caller). Final
  // distance ≤ 1″ (10 yd) flags an immediate confrontation per DMG.
  function rollDistance(dmgTerrain, surpriseInches){
    surpriseInches = surpriseInches || 0;
    const dieRolls = [];
    let modifiedSum = 0;
    for (let i = 0; i < 6; i++){
      const raw = d(4);
      let modified = raw;
      switch (dmgTerrain){
        case 'forest':
          modified = raw - 1;  // -1 always
          break;
        case 'marsh':
          if (raw >= 2 && raw <= 4) modified = raw - 1;
          break;
        case 'scrub':
          if (raw === 3 || raw === 4) modified = raw - 1;
          break;
        // plain, desert, hills, mountains: no modification
      }
      // Forest can produce 0 ("00's are possible" per DMG); other
      // terrains floor at 1 implicitly since their modifiers don't
      // reduce 1 to 0.
      if (modified < 0) modified = 0;
      dieRolls.push({ raw, modified });
      modifiedSum += modified;
    }
    const rawInches = modifiedSum;
    const effectiveInches = Math.max(0, rawInches - surpriseInches);
    // Convert inches to yards (outdoor scale: 1" = 10 yd).
    const yards = effectiveInches * 10;
    const rawYards = rawInches * 10;
    let formula = '6d4';
    if (dmgTerrain === 'forest') formula = '6d4 (each −1, forest)';
    else if (dmgTerrain === 'marsh') formula = '6d4 (each 2-4 −1, marsh)';
    else if (dmgTerrain === 'scrub') formula = '6d4 (each 3-4 −1, scrub)';
    if (surpriseInches > 0) formula += ` − ${surpriseInches}″ surprise`;
    formula += ' × 10 yd';
    return {
      yards,                   // effective (post-surprise) yards
      rawYards,                // pre-surprise yards
      surpriseInches,          // applied
      confrontation: effectiveInches <= 1,  // DMG: ≤1″ → confrontation
      formula,
      raw: effectiveInches,    // sum in inches (effective)
      dieRolls,                // for debugging / display
    };
  }
  function rollSurprise(){
    const partyRoll = d(6);
    const monsterRoll = d(6);
    const partySurprised   = partyRoll <= 2;
    const monsterSurprised = monsterRoll <= 2;
    // DMG p.48 "value of surprise (as determined by the die which
    // indicated that the condition existed)". When a side is surprised,
    // their die value is the amount the *other* side gets as free
    // action — so partyValue is monster's advantage over party, and
    // monsterValue is party's advantage over monster. When both
    // surprised, the segments cancel and the net goes to whichever
    // side rolled higher.
    const partyValue   = partySurprised   ? partyRoll   : 0;
    const monsterValue = monsterSurprised ? monsterRoll : 0;
    const netSegments = Math.abs(partyValue - monsterValue);
    let surpriserSide = null;          // who gets the free segments
    if (partyValue > monsterValue)      surpriserSide = 'monster';
    else if (monsterValue > partyValue) surpriserSide = 'party';
    let label;
    if (partySurprised && monsterSurprised){
      if (netSegments === 0)            label = 'Both surprised (cancels)';
      else if (surpriserSide === 'monster') label = `Both surprised — monster nets ${netSegments} segment${netSegments === 1 ? '' : 's'}`;
      else                              label = `Both surprised — party nets ${netSegments} segment${netSegments === 1 ? '' : 's'}`;
    }
    else if (partySurprised) label = `Party surprised — monster gets ${partyValue} free segment${partyValue === 1 ? '' : 's'}`;
    else if (monsterSurprised) label = `Monster surprised — party gets ${monsterValue} free segment${monsterValue === 1 ? '' : 's'}`;
    else                                    label = 'Neither surprised';
    return {
      partyRoll, monsterRoll,
      partySurprised, monsterSurprised,
      netSegments,           // free segments for the surpriser side
      surpriserSide,         // 'party' | 'monster' | null
      label,
    };
  }

  // ── Monster Manual lookup ─────────────────────────────────────────────────
  // The MM is a flat array under MONSTER_MANUAL.monsters. Match by case-
  // insensitive name with light tolerance — a row like 'Hobgoblin' matches
  // the table-derived 'hobgoblins', 'Goblin' matches 'goblins', etc.
  let _mmIndex = null;
  function buildMMIndex(){
    const D = window.GCCEncounterData;
    if (!D || !D.MONSTER_MANUAL?.monsters) return new Map();
    const idx = new Map();
    for (const m of D.MONSTER_MANUAL.monsters){
      if (!m.name) continue;
      idx.set(m.name.toLowerCase(), m);
      // Singular fallback for 'Hobgoblins' → 'Hobgoblin'
      const singular = m.name.toLowerCase().replace(/s$/, '');
      if (!idx.has(singular)) idx.set(singular, m);
    }
    return idx;
  }
  // Encounter-table monster names sometimes don't match MM entry
  // names exactly — typos in source data, parenthetical qualifiers,
  // or canon mismatches where the table has flavor variants the MM
  // doesn't enumerate. This map lets specific lookup failures fall
  // back to the closest canonical entry.
  const MM_ALIAS = {
    // Brigand isn't a canonical MM entry; treat as Bandit variant
    // (functionally identical: armed humans operating outside law).
    'men, brigand':           'men, bandit',
    // Encounter table typo; MM has the corrected spelling.
    'men, bucaneer':          'men, buccaneer',
    // 'Men, Nomads' / 'Men, Tribesmen' plurals occasionally appear
    // in tables but MM uses the plural form for both — 's' strip
    // covers most of these. Listed for explicit clarity:
    'men, nomads':            'men, tribesmen',
    // Hobgoblin variants fall back to base Hobgoblin.
    'hobgoblin (raiding)':    'hobgoblin',
    'hobgoblins and norkers': 'hobgoblin',
    'hobgoblin and norker (raiding)': 'hobgoblin',
    // Orc variants similarly.
    'orc (raiding)':          'orc',
    // Comma-splat patrol forms — encounter tables sometimes use
    // 'Men, Patrol, Heavy' while MM uses 'Men, Patrol (Heavy)'.
    'men, patrol, heavy':     'men, patrol (heavy)',
    'men, patrol, light':     'men, patrol (light)',
    'men, patrol, medium':    'men, patrol (medium)',
    'men, patrol, knight':    'men, patrol (knight)',
    'men, patrol, levies':    'men, patrol (levies)',
    'men, patrol, slaver':    'men, patrol (slaver)',
    'men, patrol, warband':   'men, patrol (warband)',
    'men, patrol, false':     'men, patrol (false)',
    // Rhennee with parenthetical qualifier.
    'men, rhennee (near water)': 'men, rhennee',
    'men, tribesmen (hillmen)':  'men, tribesmen',
    'men, pirate (near water)':  'men, buccaneer',  // pirates = chaotic evil buccaneers per MM
    'men, pirate':               'men, buccaneer',
  };
  function lookupMonster(name){
    if (!_mmIndex) _mmIndex = buildMMIndex();
    if (!name) return null;
    const k = String(name).toLowerCase().trim();
    if (_mmIndex.has(k)) return _mmIndex.get(k);
    // Try without trailing 's'
    if (_mmIndex.has(k.replace(/s$/, ''))) return _mmIndex.get(k.replace(/s$/, ''));
    // Try the alias map for known canon mismatches.
    if (MM_ALIAS[k] && _mmIndex.has(MM_ALIAS[k])) return _mmIndex.get(MM_ALIAS[k]);
    // Strip parenthetical qualifiers: "Hobgoblin (raiding)" →
    // "hobgoblin". Common in regional tables that flavor a base
    // creature with circumstance.
    const noParens = k.replace(/\s*\([^)]*\)/g, '').trim();
    if (noParens !== k){
      if (_mmIndex.has(noParens)) return _mmIndex.get(noParens);
      if (_mmIndex.has(noParens.replace(/s$/, ''))) return _mmIndex.get(noParens.replace(/s$/, ''));
      if (MM_ALIAS[noParens] && _mmIndex.has(MM_ALIAS[noParens])) return _mmIndex.get(MM_ALIAS[noParens]);
    }
    // Try splitting on comma ('Wolf, worg' → try 'Wolf')
    const parts = k.split(',').map(p => p.trim());
    if (parts.length > 1){
      if (_mmIndex.has(parts[0])) return _mmIndex.get(parts[0]);
    }
    return null;
  }

  // canFly(mmStats) — true if any move string on the monster mentions
  // "flying". Used by the airborne-encounter filter to determine
  // whether a rolled creature actually engages a flying party. The
  // predicate scans both the top-level move and each variants[].move,
  // since some MM entries (dragons, etc.) put movement on variants.
  function canFly(mmStats){
    if (!mmStats) return false;
    const re = /flying/i;
    if (typeof mmStats.move === 'string' && re.test(mmStats.move)) return true;
    if (Array.isArray(mmStats.variants)){
      for (const v of mmStats.variants){
        if (v && typeof v.move === 'string' && re.test(v.move)) return true;
      }
    }
    return false;
  }

  // ── Hex context resolver ──────────────────────────────────────────────────
  function contextFor(col, row){
    const ctx = {
      col, row,
      gccTerrain: null,
      dmgTerrain: null,
      regionName: null,
      regionCategory: null,
      tableKey: null,
      tableSource: null,  // 'geographic' | 'political' | 'dmg'
      population: 'uninhabited',
      // Default to 'morning' rather than 'noon' — the DMG plains
      // timing rule excludes noon, so noon would always block plains
      // encounters as a default. Morning is in every terrain's
      // allowed-times list so it's a safe baseline. Future CTT hook
      // will set this from the in-game time of day.
      timeOfDay: 'morning',
      climate: 'temperate',
    };
    if (typeof window.GCCTerrain !== 'undefined'){
      ctx.gccTerrain = window.GCCTerrain.get(col, row);
      ctx.dmgTerrain = TERRAIN_TO_DMG[ctx.gccTerrain] ?? null;
    }
    if (typeof window.GCCRegions !== 'undefined'){
      const m = window.GCCRegions.getMembership(col, row);
      if (m){
        ctx.regionName = m.name;
        const r = window.GCCRegions.getByName(m.name);
        ctx.regionCategory = r?.category || 'political';
        // popTier on the region (from REGION_POP_TIERS or per-region
        // override) drives encounter frequency. Falls through to the
        // ctx default ('uninhabited') if the region has no tier.
        if (r?.popTier) ctx.population = r.popTier;
        const k = REGION_TABLE_KEY[m.name];
        if (k){
          ctx.tableKey = k;
          ctx.tableSource = ctx.regionCategory === 'geographic'
            ? 'geographic' : 'political';
        }
      }
    }
    // Landmark-derived popTier override. Cities aren't enumerated in
    // REGION_POP_TIERS at the region level (a 30-mile-hex kingdom
    // averages out to 'patrolled'), but a hex containing or adjacent
    // Landmark-derived popTier resolution.
    //
    //   hex contains kind:'city' or kind:'town' landmark
    //     → ctx.settlement = the landmark. The party is IN a settlement,
    //       not in wilderness. Outdoor encounter rolls don't apply here
    //       — DMG city/town tables are a separate system (Phase 2 in
    //       this engine). check() detects ctx.settlement and short-
    //       circuits with a "city/town tables required" result.
    //
    //   hex within 1 of a kind:'city' landmark hex
    //     → upgrade popTier by one notch (uninhabited→patrolled,
    //       patrolled→dense). The party is in genuine outdoor terrain
    //       (the road approaches, surrounding farmland) but it's
    //       denser than the regional average. Town adjacency does NOT
    //       upgrade — towns at 30-mile-hex scale aren't dense enough
    //       for their surroundings to register differently from
    //       regional default.
    //
    //   otherwise
    //     → regional popTier (or default)
    //
    ctx.popTierSource = ctx.population === 'uninhabited' ? 'default' : 'region';
    ctx.settlement = null;
    if (typeof window.GCCLandmarks !== 'undefined'){
      const here = window.GCCLandmarks.getByHex(col, row);
      if (here?.kind === 'city' || here?.kind === 'town'){
        // Settlement hex — defer to city/town tables (TODO). Don't
        // touch popTier; the check() short-circuit handles the rest.
        ctx.settlement = here;
      } else {
        // Walk neighbor hexes (distance == 1) for a city. Towns
        // intentionally don't trigger this — see comment above.
        const hexDist = window.hexDistance;
        if (typeof hexDist === 'function'){
          let bumped = false;
          for (let dc = -1; dc <= 1 && !bumped; dc++){
            for (let dr = -1; dr <= 1 && !bumped; dr++){
              if (dc === 0 && dr === 0) continue;
              const nc = col + dc, nr = row + dr;
              if (hexDist(col, row, nc, nr) !== 1) continue;
              const lm = window.GCCLandmarks.getByHex(nc, nr);
              if (lm?.kind === 'city'){
                if (ctx.population === 'uninhabited'){
                  ctx.population = 'patrolled';
                  ctx.popTierSource = 'landmark:city-adjacent';
                } else if (ctx.population === 'patrolled'){
                  ctx.population = 'dense';
                  ctx.popTierSource = 'landmark:city-adjacent';
                }
                bumped = true;
              }
            }
          }
        }
      }
    }
    if (!ctx.tableKey && ctx.dmgTerrain){
      // Fall back to DMG outdoor table by terrain.
      ctx.tableKey = `__dmg__:${ctx.dmgTerrain}:${ctx.population}`;
      ctx.tableSource = 'dmg';
    }
    if (!ctx.tableKey && ctx.dmgTerrain){
      // Fall back to DMG outdoor table by terrain.
      ctx.tableKey = `__dmg__:${ctx.dmgTerrain}:${ctx.population}`;
      ctx.tableSource = 'dmg';
    }
    return ctx;
  }

  // ── Resolve "use standard tables" fallback ────────────────────────────────
  function rollDmgTerrain(dmgTerrain, population, climate){
    const D = window.GCCEncounterData;
    if (!D) return null;
    let tableSet;
    if (climate === 'arctic')         tableSet = D.DMG_ARCTIC_CONDITIONS;
    else if (climate === 'subarctic') tableSet = D.DMG_SUBARCTIC_CONDITIONS;
    // The DMG has two temperate table sets: _UNINHABITED (wandering
    // monsters dominate) and _INHABITED (more "Men, Patrol" results,
    // settlement-flavored). Both `dense` and `patrolled` populations
    // use the inhabited table; only `uninhabited` uses the wilderness
    // table.
    else if (population === 'dense' || population === 'patrolled')
                                      tableSet = D.DMG_TEMPERATE_INHABITED;
    else                              tableSet = D.DMG_TEMPERATE_UNINHABITED;
    const table = tableSet?.[dmgTerrain];
    if (!table) return null;
    const result = rollOnTable(table);
    return result ? resolveSubtable(result, dmgTerrain) : null;
  }

  // ── Main entry: roll an encounter for a hex ───────────────────────────────
  // Options:
  //   force: bool    — bypass timing rule + frequency die. The roll always
  //                    proceeds to table selection. Useful for a "force
  //                    encounter" GM action and for testing.
  //   airborne: bool — party is flying. Roll proceeds normally but if the
  //                    rolled monster can't fly, the result is treated as
  //                    occurred:false per DMG: "an encounter occurs only
  //                    if the creature indicated is able to fly or is
  //                    actually flying." The rolled creature is reported
  //                    in the reason for transparency ("groundling: hill
  //                    giant — no airborne engagement").
  function check(hexOrCtx, opts){
    opts = opts || {};
    if (typeof window.GCCEncounterData === 'undefined'){
      return { error: 'Encounter data not loaded — include gcc-encounter-data.js before gcc-encounters.js' };
    }
    const ctx = (hexOrCtx && hexOrCtx.gccTerrain !== undefined)
      ? hexOrCtx
      : contextFor(hexOrCtx.col, hexOrCtx.row);
    // Settlement hex — outdoor wilderness tables don't apply. The DMG
    // has separate city/town encounter tables (DMG_CITYTOWN_TABLES in
    // the data file) which aren't wired into this engine yet. Show a
    // clear placeholder rather than producing a nonsense outdoor roll
    // ("Bear, brown 1d4" inside Greyhawk City). Force flag does NOT
    // bypass this — forcing should still respect the table-system
    // boundary; a forced roll inside a city should fail loud, not
    // silently fall through to forest tables.
    if (ctx.settlement){
      const s = ctx.settlement;
      const kindLabel = s.kind === 'city' ? 'City' : 'Town';
      return {
        ctx,
        occurred: false,
        settlement: s,
        reason: `${kindLabel} hex (${s.name || 'unnamed'}) — see DMG city/town tables (TODO)`,
      };
    }
    // Lake branch (Slice 4). When the caller threads opts.lakeId, the
    // party is on a subhex cell with that lake assigned. Dispatch to
    // the matching waterborne table by kind × depth. Forced rolls
    // bypass the frequency die just like land encounters.
    if (opts.lakeId){
      const lake = (window.GCCSubhexData && typeof window.GCCSubhexData.getLake === 'function')
        ? window.GCCSubhexData.getLake(opts.lakeId)
        : null;
      if (!lake){
        return {
          ctx,
          occurred: false,
          reason: `Unknown lake id "${opts.lakeId}"`,
        };
      }
      const D = window.GCCEncounterData;
      const tableKey = `${lake.kind}_${lake.depth}`;     // e.g. "lake_shallow"
      const table = D.WATERBORNE_TABLES?.[tableKey];
      if (!table || !table.length){
        return {
          ctx,
          occurred: false,
          lake,
          tableKey,
          reason: `No waterborne table seeded for ${tableKey} — see TODO in gcc-encounter-data.js`,
        };
      }
      // Lake encounter frequency falls outside the DMG's land-terrain
      // timing rules. For now, lakes always check (gated by the journey
      // planner's per-day cadence at the call site). When opts.force
      // is true we still mark it forced for display parity. Future
      // hook: per-depth frequency dice.
      const occurs = opts.force
        ? { occurs: true, reason: 'Forced encounter', forced: true }
        : { occurs: true, reason: 'Waterborne (always checks)' };
      const rollResult = rollOnTable(table);
      if (!rollResult){
        return {
          ctx,
          occurred: false,
          lake,
          tableKey,
          reason: `Waterborne table ${tableKey} rolled empty`,
        };
      }
      // Resolve any subtable / monster lookup. Reuse the same machinery
      // as land tables — waterborne tables can use subtables too if a
      // future seeder wants ("Sahuagin (humanoid by terrain)").
      const resolved = resolveSubtable(rollResult, ctx.dmgTerrain);
      const mmStats = lookupMonster(resolved.monster);
      let numberAppearing = resolved.number;
      let numberRolled = null, numberSource = null;
      if (numberAppearing){
        numberRolled = rollDice(numberAppearing);
        numberSource = 'table';
      } else if (mmStats?.numberAppearing){
        numberAppearing = mmStats.numberAppearing;
        numberRolled = rollDice(numberAppearing);
        numberSource = 'mm';
      }
      const surprise = rollSurprise();
      // Distance: water encounters get spotted further than land. The
      // DMG calls out 6"-12" for water, vs 4d6" land base. We borrow
      // rollDistance with the dmgTerrain set to whatever's resolved
      // above; a future tweak can specialize. For now, fall through to
      // the existing rollDistance logic using ctx.dmgTerrain (may be
      // null on pure-water hexes — rollDistance handles that).
      const distance = rollDistance(ctx.dmgTerrain, surprise.netSegments);
      return {
        ctx,
        occurred: true,
        occurs,
        lake,
        tableKey,
        airborne: !!opts.airborne,
        monster: resolved.monster,
        numberFormula: numberAppearing,
        numberRolled,
        numberSource,
        reaction: rollReaction(),
        distance,
        surprise,
        tableSourceUsed: 'waterborne',
        tableRoll: resolved.roll,
        note: resolved.note,
        mmStats,
        raw: resolved,
      };
    }
    if (ctx.dmgTerrain == null){
      return {
        ctx,
        occurred: false,
        reason: ctx.gccTerrain
          ? `No outdoor encounter table for terrain "${ctx.gccTerrain}" (water hexes need waterborne tables — Phase 2)`
          : 'Hex has no terrain set',
      };
    }
    let occurs;
    if (opts.force){
      occurs = { occurs: true, reason: 'Forced encounter', forced: true };
    } else {
      occurs = checkOccurs(ctx.dmgTerrain, ctx.timeOfDay, ctx.population);
      if (!occurs.occurs){
        return { ctx, occurred: false, ...occurs };
      }
    }

    // Pick the table. Geographic > political > DMG fallback.
    const D = window.GCCEncounterData;
    let result = null;
    let tableSourceUsed = ctx.tableSource;
    if (ctx.tableSource === 'geographic' && D.GREYHAWK_GEOGRAPHICAL_TABLES[ctx.tableKey]){
      result = rollOnTable(D.GREYHAWK_GEOGRAPHICAL_TABLES[ctx.tableKey]);
    } else if (ctx.tableSource === 'political' && D.GREYHAWK_REGIONAL_TABLES[ctx.tableKey]){
      result = rollOnTable(D.GREYHAWK_REGIONAL_TABLES[ctx.tableKey]);
    }
    // Fall back to DMG terrain if regional/geographic gave 'use standard'
    // or if no overlay table existed in the first place.
    if (!result || result.useStandard){
      const dmgResult = rollDmgTerrain(ctx.dmgTerrain, ctx.population, ctx.climate);
      if (dmgResult){
        // Preserve the regional roll for display when we fell through.
        if (result?.useStandard){
          dmgResult.fellThroughFrom = result;
        }
        result = dmgResult;
        tableSourceUsed = 'dmg';
      }
    }
    if (!result){
      return { ctx, occurred: false, reason: 'No encounter table matched', occurs };
    }

    // Resolve subtable. Either the row has an explicit subtable
    // field (DMG style), or the monster name itself is a subtable
    // placeholder ("Demi-human", "Humanoid" — Greyhawk regional
    // table style). resolveSubtable handles both. Pass the terrain
    // so nested subtables (humanoid by terrain) can pick the right
    // sub-array.
    result = resolveSubtable(result, ctx.dmgTerrain);

    // Look up MM stats for the rolled monster.
    const mmStats = lookupMonster(result.monster);

    // Airborne party: filter out non-flying creatures. The frequency
    // die already rolled and the table already produced a creature,
    // but a flying party doesn't engage a groundling. We surface the
    // rolled creature in the reason so the GM sees what would have
    // appeared on the ground — useful for tracking what the region
    // actually contains.
    if (opts.airborne && !canFly(mmStats)){
      return {
        ctx,
        occurred: false,
        occurs,
        airborne: true,
        groundling: result.monster,
        reason: `Airborne — rolled ${result.monster} (groundling, no airborne engagement)`,
      };
    }

    // Number-appearing resolution. Roll whatever the table or MM
    // provides — both small formulas (1d4, 2d6) and large ones
    // (50d6 for caravan totals). The panel always displays the
    // formula alongside the rolled number, so the GM can see what
    // the rolled number means and scale down if appropriate
    // ("rolled 187 merchants — reads as the front of a caravan
    // with 187 in the column behind"). Previous heuristic-based
    // gating produced inconsistent display between similar
    // creatures depending on whether their MM numberAppearing
    // crossed an arbitrary cap; rolling everything is simpler
    // and shifts the judgment call to the GM where it belongs.
    let numberAppearing = result.number;
    let numberRolled = null;
    let numberSource = null;
    if (numberAppearing){
      numberRolled = rollDice(numberAppearing);
      numberSource = 'table';
    } else if (mmStats?.numberAppearing){
      numberAppearing = mmStats.numberAppearing;
      numberRolled = rollDice(numberAppearing);
      numberSource = 'mm';
    }

    // Roll surprise first so its segment value can reduce encounter
    // distance per DMG p.48 ("subtracting the value of surprise […]
    // from normal encounter distance").
    const surprise = rollSurprise();
    const distance = rollDistance(ctx.dmgTerrain, surprise.netSegments);
    return {
      ctx,
      occurred: true,
      occurs,
      airborne: !!opts.airborne,
      monster: result.monster,
      numberFormula: numberAppearing,
      numberRolled,
      numberSource,
      reaction: rollReaction(),
      distance,
      surprise,
      tableSourceUsed,
      tableRoll: result.roll,
      note: result.note,
      mmStats,
      raw: result,
    };
  }

  function checkParty(opts){
    if (typeof window.state === 'object' && window.state &&
        typeof window.state.partyCol === 'number'){
      return check({ col: window.state.partyCol, row: window.state.partyRow }, opts);
    }
    return { error: 'Party position not available' };
  }

  window.GCCEncounters = {
    check,
    checkParty,
    contextFor,
    lookupMonster,
    rollDice,           // exposed for testing
    REGION_TABLE_KEY,   // exposed for inspection
    TERRAIN_TO_DMG,     // exposed for inspection
  };
})();