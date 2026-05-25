// gw-encounter-data.js v0.4.0 — Gamma World 1e wilderness encounter tables.
// Source: GW 1e Players Booklet, ENCOUNTERS / ENCOUNTERS TABLE.
// Schema mirrors gcc-encounter-data.js: { min, max, creature, number, note? }
// Tables roll 1d20 (TABLE_DIE_SIZE), not 1d100 like the AD&D tables — a
// future gw-encounters.js resolver will dispatch on TABLE_DIE_SIZE.
// Daily check: 1d6, 6 = encounter. Same again at night while travelling
// through uncharted terrain (RAW). Cryptic Alliance results defer to the
// region layer at the party's current cell.
//
// OCR sweep applied (v0.2.0): creature names verified against GW1e booklet
// and bestiary in gw-mp-bestiary.md. Resolved 14 OCR variants:
//   - Renames: Pam->Parn, Pinelo->Pineto, Hori->Horl Choo, Bari Nep->Barl Nep,
//     Nari Ep->Narl Ep, Teri->Terl
//   - Consolidations: Seroon+Lou->Seroon Lou (one creature per source);
//     Choo+Choo Kep+Hori->Horl Choo (all OCR fragments of one source name);
//     Telden->Ert Telden (OCR truncation)
//   - Phantoms (not real creatures per source verification) replaced:
//     Erl->Brutorz (mountain table); Sert->Serf, Arn Blight->Blight,
//     Serf Hisser->Hisser (radioactive table — OCR-merged adjacencies)

(function(){
  'use strict';

  const TABLE_DIE_SIZE = 20;

  // Number appearing per creature. Defaults; GM may override per encounter.
  // RAW says the referee determines numbers, with Tribesmen explicitly
  // 2d10 (the booklet also mentions "1-100" for full tribes).
  const NUMBER_APPEARING = {
    'Android':              '1',
    'Ark':                  '1d4',
    'Arn':                  '1d4',
    'Badder':               '1d6',
    'Barl Nep':             '1d3',
    'Ber Lep':              '1d3',
    'Blaash':               '1d3',
    'Blight':               '1d6',
    'Brutorz':              '1d6',
    'Cal Then':             '1d2',
    'Centisteed':           '1d4',
    'Cren Tosh':            '1d4',
    'Crep Plant':           '1',
    'Ert':                  '1d4',
    'Ert Telden':           '1d3',
    'Fen':                  '1d4',
    'Fleshin':              '1d4',
    'Gren':                 '1d4',
    'Herkel':               '1d2',
    'Herp':                 '1d4',
    'Hisser':               '1d4',
    'Hoop':                 '1d6',
    'Hopper':               '2d4',
    'Horl Choo':            '1d6',
    'Kai Lin':              '1d4',
    'Keeshin':              '1',
    'Kep':                  '1d4',
    'Menarl':               '1',
    'Narl Ep':              '1d6',
    'Obb':                  '1d6',
    'Orlen':                '1',
    'Parn':                 '1d4',
    'Perth':                '1d3',
    'Pineto':               '1d4',
    'Podog':                '1d6',
    'Rakox':                '1d6',
    'Robotic Unit':         '1d4',
    'Sep':                  '1d6',
    'Seroon Lou':           '3d6',
    'Serf':                 '1d6',
    'Sleeth':               '1d2',
    'Soul Besh':            '1d3',
    'Terl':                 '1d3',
    'Tribesmen':            '2d10', // RAW: 1-100 for full tribes; 2d10 wandering
    'Win Seen':             '1d3',
    'Yexil':                '1',
    'Zarn':                 '1',
    'Zeethh':               '1d4',
  };

  function n(name){ return NUMBER_APPEARING[name] || '1'; }

  // 7-terrain × 1d20 wilderness encounter table.
  // Ruins and Radioactive Zones columns are short; high rolls map to
  // Cryptic Alliance / No Encounter per RAW (verify exact ranges).
  const ENCOUNTER_TABLES = {
    clear: [
      { min:  1, max:  1, creature: 'Yexil',            number: n('Yexil') },
      { min:  2, max:  2, creature: 'Horl Choo',             number: n('Horl Choo') },
      { min:  3, max:  3, creature: 'Centisteed',       number: n('Centisteed') },
      { min:  4, max:  4, creature: 'Perth',            number: n('Perth') },
      { min:  5, max:  5, creature: 'Zeethh',           number: n('Zeethh') },
      { min:  6, max:  6, creature: 'Hoop',             number: n('Hoop') },
      { min:  7, max:  7, creature: 'Sleeth',           number: n('Sleeth') },
      { min:  8, max:  8, creature: 'Brutorz',          number: n('Brutorz') },
      { min:  9, max:  9, creature: 'Zarn',             number: n('Zarn') },
      { min: 10, max: 10, creature: 'Hopper',           number: n('Hopper') },
      { min: 11, max: 11, creature: 'Robotic Unit',     number: n('Robotic Unit') },
      { min: 12, max: 12, creature: 'Badder',           number: n('Badder') },
      { min: 13, max: 13, creature: 'Arn',              number: n('Arn') },
      { min: 14, max: 14, creature: 'Herp',             number: n('Herp') },
      { min: 15, max: 15, creature: 'Blaash',           number: n('Blaash') },
      { min: 16, max: 16, creature: 'Rakox',            number: n('Rakox') },
      { min: 17, max: 17, creature: 'Android',          number: n('Android') },
      { min: 18, max: 18, creature: 'Tribesmen',        number: n('Tribesmen'), note: 'PSH or humanoid band' },
      { min: 19, max: 19, creature: 'Podog',            number: n('Podog') },
      { min: 20, max: 20, creature: 'Cryptic Alliance', number: null,           note: "Per ref's region map" },
    ],

    mountains: [
      { min:  1, max:  1, creature: 'Podog',            number: n('Podog') },
      { min:  2, max:  2, creature: 'Horl Choo',         number: n('Horl Choo') },
      { min:  3, max:  3, creature: 'Zeethh',           number: n('Zeethh') },
      { min:  4, max:  4, creature: 'Brutorz',              number: n('Brutorz') },
      { min:  5, max:  5, creature: 'Hoop',             number: n('Hoop') },
      { min:  6, max:  6, creature: 'Arn',              number: n('Arn') },
      { min:  7, max:  7, creature: 'Yexil',            number: n('Yexil') },
      { min:  8, max:  8, creature: 'Blight',           number: n('Blight') },
      { min:  9, max:  9, creature: 'Crep Plant',       number: n('Crep Plant') },
      { min: 10, max: 10, creature: 'Android',          number: n('Android') },
      { min: 11, max: 11, creature: 'Cal Then',         number: n('Cal Then') },
      { min: 12, max: 12, creature: 'Parn',              number: n('Parn') },
      { min: 13, max: 13, creature: 'Robotic Unit',     number: n('Robotic Unit') },
      { min: 14, max: 14, creature: 'Orlen',            number: n('Orlen') },
      { min: 15, max: 15, creature: 'Tribesmen',        number: n('Tribesmen') },
      { min: 16, max: 16, creature: 'Hisser',           number: n('Hisser') },
      { min: 17, max: 17, creature: 'Herp',             number: n('Herp') },
      { min: 18, max: 18, creature: 'Zarn',             number: n('Zarn') },
      { min: 19, max: 19, creature: 'Sep',              number: n('Sep') },
      { min: 20, max: 20, creature: 'Cryptic Alliance', number: null,           note: "Per ref's region map" },
    ],

    forest: [
      { min:  1, max:  1, creature: 'Win Seen',         number: n('Win Seen') },
      { min:  2, max:  2, creature: 'Kai Lin',          number: n('Kai Lin') },
      { min:  3, max:  3, creature: 'Horl Choo',             number: n('Horl Choo') },
      { min:  4, max:  4, creature: 'Gren',             number: n('Gren') },
      { min:  5, max:  5, creature: 'Herp',             number: n('Herp') },
      { min:  6, max:  6, creature: 'Obb',              number: n('Obb') },
      { min:  7, max:  7, creature: 'Hisser',           number: n('Hisser') },
      { min:  8, max:  8, creature: 'Ert',              number: n('Ert') },
      { min:  9, max:  9, creature: 'Robotic Unit',     number: n('Robotic Unit') },
      { min: 10, max: 10, creature: 'Arn',              number: n('Arn') },
      { min: 11, max: 11, creature: 'Soul Besh',        number: n('Soul Besh') },
      { min: 12, max: 12, creature: 'Centisteed',       number: n('Centisteed') },
      { min: 13, max: 13, creature: 'Blaash',           number: n('Blaash') },
      { min: 14, max: 14, creature: 'Pineto',           number: n('Pineto') },
      { min: 15, max: 15, creature: 'Ark',              number: n('Ark') },
      { min: 16, max: 16, creature: 'Perth',            number: n('Perth') },
      { min: 17, max: 17, creature: 'Sep',              number: n('Sep') },
      { min: 18, max: 18, creature: 'Serf',             number: n('Serf') },
      { min: 19, max: 19, creature: 'Badder',           number: n('Badder') },
      { min: 20, max: 20, creature: 'Cryptic Alliance', number: null,           note: "Per ref's region map" },
    ],

    desert: [
      { min:  1, max:  1, creature: 'Obb',              number: n('Obb') },
      { min:  2, max:  2, creature: 'Sep',              number: n('Sep') },
      { min:  3, max:  3, creature: 'Horl Choo',             number: n('Horl Choo') },
      { min:  4, max:  4, creature: 'Soul Besh',        number: n('Soul Besh') },
      { min:  5, max:  5, creature: 'Sleeth',           number: n('Sleeth') },
      { min:  6, max:  6, creature: 'Parn',              number: n('Parn') },
      { min:  7, max:  7, creature: 'Podog',            number: n('Podog') },
      { min:  8, max:  8, creature: 'Ert Telden',           number: n('Ert Telden') },
      { min:  9, max:  9, creature: 'Blaash',           number: n('Blaash') },
      { min: 10, max: 10, creature: 'Kep',              number: n('Kep') },
      { min: 11, max: 11, creature: 'Kai Lin',          number: n('Kai Lin') },
      { min: 12, max: 12, creature: 'Perth',            number: n('Perth') },
      { min: 13, max: 13, creature: 'Serf',             number: n('Serf') },
      { min: 14, max: 14, creature: 'Tribesmen',        number: n('Tribesmen') },
      { min: 15, max: 15, creature: 'Android',          number: n('Android') },
      { min: 16, max: 16, creature: 'Robotic Unit',     number: n('Robotic Unit') },
      { min: 17, max: 17, creature: 'Cal Then',         number: n('Cal Then') },
      { min: 18, max: 18, creature: 'Blight',           number: n('Blight') },
      { min: 19, max: 19, creature: 'Zarn',             number: n('Zarn') },
      { min: 20, max: 20, creature: 'Cryptic Alliance', number: null,           note: "Per ref's region map" },
    ],

    water: [
      { min:  1, max:  1, creature: 'Crep Plant',       number: n('Crep Plant') },
      { min:  2, max:  2, creature: 'Seroon Lou',           number: n('Seroon Lou') },
      { min:  3, max:  3, creature: 'Hisser',           number: n('Hisser') },
      { min:  4, max:  4, creature: 'Win Seen',         number: n('Win Seen') },
      { min:  5, max:  5, creature: 'Narl Ep',          number: n('Narl Ep') },
      { min:  6, max:  6, creature: 'Terl',             number: n('Terl') },
      { min:  7, max:  7, creature: 'Menarl',           number: n('Menarl') },
      { min:  8, max:  8, creature: 'Fleshin',          number: n('Fleshin') },
      { min:  9, max:  9, creature: 'Cren Tosh',        number: n('Cren Tosh') },
      { min: 10, max: 10, creature: 'Barl Nep',         number: n('Barl Nep') },
      { min: 11, max: 11, creature: 'Ert Telden',       number: n('Ert Telden') },
      { min: 12, max: 12, creature: 'Fen',              number: n('Fen') },
      { min: 13, max: 13, creature: 'Keeshin',          number: n('Keeshin') },
      { min: 14, max: 14, creature: 'Herkel',           number: n('Herkel') },
      { min: 15, max: 15, creature: 'Ert',              number: n('Ert') },
      { min: 16, max: 16, creature: 'Android',          number: n('Android') },
      { min: 17, max: 17, creature: 'Badder',           number: n('Badder') },
      { min: 18, max: 18, creature: 'Robotic Unit',     number: n('Robotic Unit') },
      { min: 19, max: 19, creature: 'Tribesmen',        number: n('Tribesmen') },
      { min: 20, max: 20, creature: 'Cryptic Alliance', number: null,           note: "Per ref's region map" },
    ],

    // Ruins column: 11 unique entries, then Cryptic Alliance / No Encounter
    // fill the higher rolls. Verify ranges against the printed booklet.
    ruins: [
      { min:  1, max:  1, creature: 'Badder',                number: n('Badder') },
      { min:  2, max:  2, creature: 'Seroon Lou',                   number: n('Seroon Lou') },
      { min:  3, max:  3, creature: 'Ber Lep',               number: n('Ber Lep') },
      { min:  4, max:  4, creature: 'Yexil',                 number: n('Yexil') },
      { min:  5, max:  5, creature: 'Orlen',                 number: n('Orlen') },
      { min:  6, max:  6, creature: 'Ark',                   number: n('Ark') },
      { min:  7, max:  7, creature: 'Android',               number: n('Android') },
      { min:  8, max:  8, creature: 'Robotic Unit',          number: n('Robotic Unit') },
      { min:  9, max:  9, creature: 'Hoop',                  number: n('Hoop') },
      { min: 10, max: 10, creature: 'Tribesmen',             number: n('Tribesmen') },
      { min: 11, max: 11, creature: 'Sleeth',                number: n('Sleeth') },
      { min: 12, max: 13, creature: 'Cryptic Alliance',      number: null,                    note: "Per ref's region map" },
      { min: 14, max: 20, creature: 'No Encounter',          number: null },
    ],

    // Radioactive Zones column: 9 unique entries; Cryptic Alliance / No
    // Encounter fill higher rolls. Daily 5%/day rad-poisoning save still
    // applies on entry regardless of encounter result (see HAZARDS).
    radioactive: [
      { min:  1, max:  1, creature: 'Serf',             number: n('Serf') },
      { min:  2, max:  2, creature: 'Blight',       number: n('Blight') },
      { min:  3, max:  3, creature: 'Hisser',      number: n('Hisser') },
      { min:  4, max:  4, creature: 'Android',          number: n('Android') },
      { min:  5, max:  5, creature: 'Blaash',           number: n('Blaash') },
      { min:  6, max:  6, creature: 'Zarn',             number: n('Zarn') },
      { min:  7, max:  7, creature: 'Robotic Unit',     number: n('Robotic Unit') },
      { min:  8, max:  8, creature: 'Tribesmen',        number: n('Tribesmen') },
      { min:  9, max:  9, creature: 'Parn',              number: n('Parn') },
      { min: 10, max: 11, creature: 'Cryptic Alliance', number: null,                note: "Per ref's region map" },
      { min: 12, max: 20, creature: 'No Encounter',     number: null },
    ],
  };

  // Cryptic Alliances visible on the printed GW map. id values double as
  // region.regionId values once authored in gcc-regions.js — picking the
  // alliance for a 'Cryptic Alliance' encounter result = looking up the
  // region the party's cell belongs to.
  const CRYPTIC_ALLIANCES = [
    { id: 'healers',                name: 'Healers',                hint: 'Wisconsin / Minnesota' },
    { id: 'archivists',             name: 'Archivists',             hint: 'Idaho / Montana' },
    { id: 'restorationists',        name: 'Restorationists',        hint: 'New England / Maine' },
    { id: 'created',                name: 'Created',                hint: 'Mid-Atlantic / Pennsylvania' },
    { id: 'brotherhood-of-thought', name: 'Brotherhood of Thought', hint: 'Northern California' },
    { id: 'iron-society',           name: 'Iron Society',           hint: 'Colorado / New Mexico' },
    { id: 'followers-of-the-voice', name: 'Followers of the Voice', hint: 'Tennessee / Carolinas' },
    { id: 'ranks-of-the-fit',       name: 'Ranks of the Fit',       hint: 'Tennessee / Mississippi' },
    { id: 'radioactivists',         name: 'Radioactivists',         hint: 'Florida' },
    { id: 'seekers',                name: 'Seekers',                hint: 'Texas (Lubbock)' },
    { id: 'zoopremists',            name: 'Zoopremists',            hint: 'Northern Mexico' },
  ];

  // RAW encounter check cadence. Daily and nightly 1d6, 6 = encounter.
  // For watch-scale exploration in dangerous areas (radioactive zones,
  // ruin perimeters), GW 1e gives the GM latitude — treat each watch
  // as a daily check at GM discretion.
  const ENCOUNTER_FREQUENCY = {
    rule:        '1d6 daily + 1d6 nightly; 6 = encounter, then 1d20 on terrain table',
    dieCheck:    6,
    triggerOn:   6,
    dieResolve:  TABLE_DIE_SIZE,
    watchScale:  '1d6 per watch (6 watches/day) in dangerous terrain — GM discretion',
  };

  // Subhex / parent terrain key → encounter table key. Subhex terrain
  // values come from gcc-subhex-data.js terrain palette. Unknown keys
  // fall back to 'clear'. Add entries as new terrain kinds are authored
  // (e.g. 'irradiated-ruins' → 'radioactive' with ruin override flag).
  const TERRAIN_TO_TABLE = {
    plains:      'clear',
    grassland:   'clear',
    clear:       'clear',
    hills:       'mountains',
    marsh:       'forest',
    'forested-hill': 'forest',
    'forested-mountains': 'mountains',
    mountains:   'mountains',
    forest:      'forest',
    woods:       'forest',
    swamp:       'forest',
    desert:      'desert',
    badlands:    'desert',
    radioactive: 'radioactive',
    ruins:       'ruins',
    city:        'ruins',
    coast:       'clear',
    water:       'water',
    sea:         'water',
    lake:        'water',
    river:       'water',
  };

  // Feature.kind → table key override. RAW priority order: ruin → radioactive
  // → terrain. A subhex with terrain='desert' and feature.kind='ruin'
  // resolves on the Ruins table, not Desert. Keys below are the live subhex
  // FEATURE_KINDS (gw-subhex-data.js) plus legacy 'ancient-*' aliases.
  const FEATURE_TO_TABLE = {
    // live subhex feature kinds
    'ruin':               'ruins',
    'vault':              'ruins',
    // legacy aliases
    'ancient-building':   'ruins',
    'ancient-village':    'ruins',
    'ancient-town':       'ruins',
    'ancient-city':       'ruins',
    'ancient-metropolis': 'ruins',
    'spaceport':          'radioactive',
    'fortification':      'ruins',
  };

  window.GWEncounterData = {
    TABLE_DIE_SIZE,
    NUMBER_APPEARING,
    ENCOUNTER_TABLES,
    CRYPTIC_ALLIANCES,
    ENCOUNTER_FREQUENCY,
    TERRAIN_TO_TABLE,
    FEATURE_TO_TABLE,
  };

})();
