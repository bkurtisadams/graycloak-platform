// gcc-regions.js v0.3.0 — 2026-04-25
// World of Greyhawk region boundaries, current-grid coordinate frame.
//
// Two formats per region, lookup precedence hex-tags (across all
// regions) → polygon vertices:
//   { name, hexes: ["P4-85", ...] }   // explicit hex membership (primary)
//   { name, vertices: [...] }         // closed polygon (secondary)
//
// Hex-set entries and polygon vertices may be Darlene IDs ("P4-85") OR
// [col,row] pairs. Point-in-polygon uses canonical unit-space hex centers.
//
// v0.3.0: rectangle regions removed. BASE entries now only carry
//   name/kind/color/anchors — geometry comes from painted hex sets.
//   Rects were a pre-hex-set placeholder and produced misclassification
//   on a hex grid (a bbox in (col,row) doesn't trace a country's border).
//   Bootstrap-from-landmarks + paint is the authoritative workflow now.
//   Empty BASE regions sit in the picker waiting to be painted; QA
//   is meaningful once Bootstrap has run. setRegionMeta no longer
//   accepts suppressRect.
//
// v0.2.0: hex-set membership format and editor API.
//   - GH_REGIONS entries can carry `hexes` (preferred) or `vertices`.
//   - localStorage overrides: new regions, hex membership edits, color
//     and kind updates. Layered like gcc-terrain / gcc-landmarks.
//   - addRegion / removeRegion / addHexes / removeHexes / setHexes /
//     erasePaintAt / clearHexes / fillFromPolygon /
//     bootstrapFromLandmarks / exportOverrides / clearOverrides /
//     exportMergedSource.
//   - getMembership() returns { name, source } where source is
//     'hexes' | 'vertices' — lets the editor distinguish
//     painted hexes from polygon fallback.
//   - Each region carries a `color` for editor overlay rendering;
//     defaulted by hash of name when not provided.
//
// v0.1.0: polygon + rect dual support, point-in-polygon over unit-space
//   hex centers, lazy polygon resolution, QA harness.

(function(){
  const SQRT3 = Math.sqrt(3);
  const LS_KEY_DEFS  = 'gcc-region-defs-v1';   // {name: {kind, color}}
  const LS_KEY_HEXES = 'gcc-region-hexes-v1';  // {name: ["col-row", ...]}

  function hexCenterU(col, row){
    return { x: col * 1.5, y: row * SQRT3 + (col % 2 === 1 ? SQRT3 / 2 : 0) };
  }

  function resolveVertex(v){
    if (Array.isArray(v)) return { col: v[0], row: v[1] };
    if (typeof v === 'string'){
      // Internal "col-row" form first — works without darleneToInternal.
      const m = /^(\d+)-(\d+)$/.exec(v);
      if (m) return { col: +m[1], row: +m[2] };
      if (typeof darleneToInternal !== 'function') return null;
      return darleneToInternal(v);
    }
    return null;
  }

  function pointInPoly(x, y, pts){
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++){
      const xi = pts[i].x, yi = pts[i].y;
      const xj = pts[j].x, yj = pts[j].y;
      if (((yi > y) !== (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi)){
        inside = !inside;
      }
    }
    return inside;
  }

  function hashHue(name){
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    return Math.abs(h) % 360;
  }
  function defaultColor(name){
    return `hsl(${hashHue(name)}, 55%, 50%)`;
  }

  function colorToRgbTriplet(c){
    if (!c) return '0, 0, 0';
    if (c.startsWith('#')){
      const v = c.slice(1);
      const exp = v.length === 3
        ? v.split('').map(ch => parseInt(ch + ch, 16))
        : [parseInt(v.slice(0,2),16), parseInt(v.slice(2,4),16), parseInt(v.slice(4,6),16)];
      return exp.join(', ');
    }
    if (c.startsWith('hsl')){
      const m = /hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/.exec(c);
      if (!m) return '0, 0, 0';
      const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
      const a = s * Math.min(l, 1 - l);
      const f = n => {
        const k = (n + h * 12) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      };
      return [f(0), f(8), f(4)].map(v => Math.round(v * 255)).join(', ');
    }
    return '0, 0, 0';
  }

  // ── REGION DATA ────────────────────────────────────────────────────────────
  // BASE: file-baked region definitions. Just curated metadata —
  // name, kind, color, capital, and anchor landmarks for QA.
  // Geometry comes from painted hex sets (Bootstrap / Outline editor).
  //
  // Coverage: Flanaess polities at 1983 canonical baseline. Matches
  // Darlene-map era naming. Post-Wars (569 CY) state for things like
  // Iuz absorbing the Horned Society, Shield Lands occupation, etc.
  // is deferred — when it lands it will layer on top via overrides.
  //
  // Naming convention: formal title where the polity has one in its
  // LGG entry heading (Kingdom of Keoland, Archbarony of Ratik, See
  // of Medegia, etc.); bare name otherwise (Wild Coast, Bandit
  // Kingdoms, Sea Princes — territories without a formal title).
  //
  // Capital field is bibliographic (which city is the seat of
  // government); editor consumers can use it as a reminder when
  // tagging a city landmark with `region:` so the capital actually
  // sits inside its own region's painted hexes.
  //
  // Order is no longer load-bearing — the two-pass lookup (hex-tags
  // first across all regions, then polygon vertices) means inner /
  // outer overlap resolves by which region painted the hex, not by
  // file position. Listed roughly clockwise from Greyhawk City for
  // ease of human scanning.
  // ── REGION DETAILS (1983 boxed-set canon metadata) ───────────────────
  // Keyed by BASE region name. Merged into each region at applyDefs
  // time so consumers can read region.ruler / region.humanPop /
  // region.resources / region.notes etc. Honorific prefixes have
  // been stripped from ruler strings to factual name+title.
  // Population tier per region — drives encounter check frequency.
  // Per DMG p.47 Chance Of Encounter:
  //   dense       1 in 20  ('relatively dense')
  //   patrolled   1 in 12  ('moderate to sparse / patrolled')
  //   uninhabited 1 in 10  ('uninhabited / wilderness')
  //
  // Important caveat: the DMG categories really apply at the area
  // level, not the kingdom level. Most of any kingdom is farmland and
  // light forest with occasional patrols ('patrolled'). Only the
  // immediate vicinity of a city qualifies as 'relatively dense'.
  // Hex-level overrides (or landmark-radius auto-derivation) are the
  // right long-term fix; for now this map is region-default only,
  // with the understanding that 'dense' is reserved for things that
  // really are dense at the 30-mile-hex scale (large cities and
  // their immediate surroundings).
  //
  // Override per region via setRegionMeta(name, { popTier: 'dense' }).
  const REGION_POP_TIERS = {
    // ── Dense (1 in 20) ─────────────────────────────────────────────────────
    // Reserved for region entries that are themselves a city. The only
    // current case is the single-hex Greyhawk City entry. Kingdom-wide
    // regions cannot be 'dense' at 30-mile-hex scale — most of their
    // territory is patrolled fields and forests.
    "City of Greyhawk":        "dense",

    // ── Patrolled (1 in 12) ─────────────────────────────────────────────────
    // Settled or actively-administered states. The default for political
    // regions, listed explicitly here so the classification is auditable
    // and the override layer can flip individual entries without
    // changing the default behavior.
    "Kingdom of Furyondy":     "patrolled",
    "Archclericy of Veluna":   "patrolled",
    "Kingdom of Keoland":      "patrolled",
    "Great Kingdom":           "patrolled",
    "County of Urnst":         "patrolled",
    "Duchy of Urnst":          "patrolled",
    "Kingdom of Nyrond":       "patrolled",
    "Domain of Greyhawk":      "patrolled",
    "March of Bissel":         "patrolled",
    "Gran March":              "patrolled",
    "Sterich":                 "patrolled",
    "Yeomanry":                "patrolled",
    "Grand Duchy of Geoff":    "patrolled",
    "Highfolk":                "patrolled",
    "Valley of the Highfolk":  "patrolled",
    "Perrenland":              "patrolled",
    "Ket":                     "patrolled",
    "County of Ulek":          "patrolled",
    "Duchy of Ulek":           "patrolled",
    "Principality of Ulek":    "patrolled",
    "County of Idee":          "patrolled",
    "State of Onnwal":         "patrolled",
    "County of Sunndi":        "patrolled",
    "Free City of Irongate":   "patrolled",
    "Theocracy of the Pale":   "patrolled",
    "Duchy of Tenh":           "patrolled",
    "Archbarony of Ratik":     "patrolled",
    "Hold of the Sea Princes": "patrolled",
    "Shield Lands":            "patrolled",
    "Prelacy of Almor":        "patrolled",
    "See of Medegia":          "patrolled",
    "North Province":          "patrolled",
    "South Province":          "patrolled",
    "Celene":                  "patrolled",
    "Archbarony of Blackmoor": "patrolled",

    // ── Uninhabited (1 in 10) ───────────────────────────────────────────────
    // Lawless, contested, or hostile-controlled. All geographic regions
    // also default to uninhabited via the category-based fallback in
    // applyDefs; not listed here individually.
    "Bandit Kingdoms":         "uninhabited",
    "Empire of Iuz":           "uninhabited",
    "Horned Society":          "uninhabited",
    "Bone March":              "uninhabited",
    "Pomarj":                  "uninhabited",
    "Wild Coast":              "uninhabited",
    "Rovers of the Barrens":   "uninhabited",
    "Scarlet Brotherhood":     "uninhabited",
    "Iron League":             "uninhabited",
  };

  const REGION_DETAILS = {
    "Prelacy of Almor": {
      ruler: "Kevont, the Prelate of Almor",
      capPop: "4,789",
      humanPop: "200,000+",
      demihumans: "Few",
      humanoids: "Few",
      resources: "foodstuffs, cloth, copper",
    },
    "Bandit Kingdoms": {
      ruler: "Various claims to royal titles exist",
      capPop: "17,310",
      humanPop: "95,000+",
      demihumans: "Few if any",
      humanoids: "Many",
      resources: "silver (mines in rift area)",
      notes: "17 states ruled by robber chieftains.",
    },
    "March of Bissel": {
      ruler: "Walgar, the Margrave of Bissel",
      capPop: "3,430",
      humanPop: "50,000",
      demihumans: "Some",
      humanoids: "Some",
      resources: "foodstuffs, cloth, gold, gems (I)",
    },
    "Archbarony of Blackmoor": {
      ruler: "Archbaron Bestmo of Blackmoor",
      capPop: "666",
      humanPop: "20,000 to 30,000+/-",
      demihumans: "Unlikely",
      humanoids: "Considerable numbers",
      resources: "ivory, copper, gems (II)",
    },
    "Bone March": {
      ruler: "The Marquis of Bonemarch (title currently held by no one)",
      capPop: "6,300",
      humanPop: "40,000+/-",
      demihumans: "Few (beleaguered gnomes of the Flinty Hills)",
      humanoids: "Many (gnolls, ogres, ores in numbers)",
      resources: "silver, gems (I, II)",
      notes: "Source spelling in OCR/text: Bonemarch.",
    },
    "Celene": {
      ruler: "Yolande, Queen of Celene, Lady Rhalta of All Elvenkind",
      capPop: "6,950",
      humanPop: "20,000",
      demihumans: "Gray Elves (9,500); Sylvan Elves (8,000); Gnomes (13,500); Halflings",
      humanoids: "None",
      resources: "foodstuffs, cloth, silver",
    },
    "City of Dyvers": {
      ruler: "Margus, the Magister of Dyvers",
      capPop: "42,000+ city",
      humanPop: "42,000+ city; 53,000 total including surrounding area",
      demihumans: "Some",
      humanoids: "Few",
      resources: "shipbuilding supplies",
      notes: "Capital not separately listed because entry is a city-state.",
    },
    "Caliphate of Ekbir": {
      ruler: "Xargun, the Caliph of Ekbir",
      capPop: "29,400",
      humanPop: "250,000",
      demihumans: "Doubtful",
      humanoids: "Few",
      resources: "foodstuffs, cloth",
    },
    "Frost Barbarians": {
      ruler: "King Ralff of the Fruztii",
      capPop: "3,300",
      humanPop: "50,000+/-",
      demihumans: "Few",
      humanoids: "Some",
      resources: "foodstuffs, furs, silver, gold",
    },
    "Kingdom of Furyondy": {
      ruler: "Belvor IV, the King of Furyondy",
      capPop: "15,600",
      humanPop: "350,000+",
      demihumans: "Some",
      humanoids: "Doubtful",
      resources: "foodstuffs, cloth, gold",
    },
    "Grand Duchy of Geoff": {
      ruler: "Owen I, Grand Duke of Geoff",
      capPop: "4,800",
      humanPop: "65,000",
      demihumans: "High Elves (6,000); some others",
      humanoids: "Some (see Crystalmist Mountains)",
      resources: "cloth, copper, silver, gold, gems (I)",
    },
    "Gran March": {
      ruler: "Petros, Commandant of Gran March",
      capPop: "4,500",
      humanPop: "80,000",
      demihumans: "Some",
      humanoids: "Few",
      resources: "foodstuffs, cloth, copper, gems (III)",
    },
    "Great Kingdom": {
      ruler: "Ivid V, the Overking of Aerdy, Grand Prince of the North",
      capPop: "41,000",
      humanPop: "5,000,000 (includes N. and S. Province and Medegia)",
      demihumans: "Some (scattered on fringes of kingdom)",
      humanoids: "Some (mixture)",
      resources: "foodstuffs, cloth, copper, silver, gold, gems (IV)",
    },
    "City of Greyhawk": {
      ruler: "Nerof Gasgol, the Lord Mayor of Greyhawk",
      capPop: "58,000 city",
      humanPop: "58,000 city; 75,000+ total including surrounding area",
      demihumans: "Some",
      humanoids: "Some",
      resources: "silver, electrum, gold, platinum, gems (I-IV)",
      notes: "Capital not separately listed because entry is a city-state.",
    },
    "Highfolk": {
      ruler: "Loftin Graystand, Mayor of Highfolk",
      humanPop: "2,500 (excluding demi-humans)",
      demihumans: "High Elves (5,000) and some others",
      humanoids: "None",
      resources: "gold",
      notes: "Town entry.",
    },
    "Valley of the Highfolk": {
      ruler: "No single ruler; Lord of the High Elves serves as nominal authority",
      humanPop: "20,000 (woodsmen)",
      demihumans: "High Elves (12,000); Sylvan Elves (9,000); Gnomes (4,000); Halflings (2,000 Tallfellows); Gray Elves (1,000)",
      humanoids: "Some (raiders only)",
      resources: "gold, rare woods",
    },
    "Horned Society": {
      ruler: "The Hierarchs (true names unknown)",
      capPop: "16,200",
      humanPop: "45,000 (?)",
      demihumans: "Very doubtful",
      humanoids: "Hobgoblins (12,000); others",
    },
    "Ice Barbarians": {
      ruler: "Lolgoff Bearhear, the King of Cruski; Fasstal of all the Suelii",
      capPop: "5,100",
      humanPop: "60,000",
      demihumans: "Few",
      humanoids: "Likely in mountains",
      resources: "furs, copper, gems (I)",
    },
    "County of Idee": {
      ruler: "Count Fedorik Eddri of Idee",
      capPop: "4,900",
      humanPop: "60,000+",
      demihumans: "Some",
      humanoids: "Doubtful",
      resources: "foodstuffs, copper, gold",
    },
    "Free City of Irongate": {
      ruler: "Cobb Darg, Lord High Mayor of Irongate",
      capPop: "44,000 city",
      humanPop: "44,000 city; 57,000 total including surrounding area",
      demihumans: "Many",
      humanoids: "None",
      resources: "gems (II, III)",
      notes: "Capital not separately listed because entry is a city-state.",
    },
    "Empire of Iuz": {
      ruler: "Iuz, Lord of Evil (evil demi-god)",
      capPop: "10,000",
      humanPop: "40,000",
      demihumans: "None",
      humanoids: "Many (numbers unknown)",
      resources: "furs, electrum",
    },
    "Kingdom of Keoland": {
      ruler: "Kimbertos Skotti, the King of Keoland; Lord of Gran March; Plar of Sterich",
      capPop: "21,600",
      humanPop: "300,000 (excluding dependencies)",
      demihumans: "Sylvan Elves; Gnomes; Halflings",
      humanoids: "Doubtful",
      resources: "foodstuffs, cloth, gold, gems (III)",
    },
    "Ket": {
      ruler: "Zoltan, the Beygraf of Ket and Shield of the True Faith",
      capPop: "23,400",
      humanPop: "85,000",
      demihumans: "Few",
      humanoids: "Few",
      resources: "silver, gems (I, IV)",
    },
    "Lordship of the Isles": {
      ruler: "Prince Latmac Ranold of Duxchan; Lord of the Isles",
      capPop: "5,500",
      humanPop: "80,000",
      demihumans: "Few",
      humanoids: "Doubtful",
      resources: "rare woods, spices",
    },
    "North Province": {
      ruler: "Grenell, the Herzog of the North Province",
      capPop: "29,100",
      humanPop: "750,000",
      demihumans: "Few",
      humanoids: "Some",
      resources: "foodstuffs, cloth, electrum",
    },
    "Kingdom of Nyrond": {
      ruler: "King Archbold III of Nyrond; Duke of Flinthill",
      capPop: "46,500",
      humanPop: "1,375,000",
      demihumans: "Sylvan Elves; Gnomes; Halflings",
      humanoids: "Few",
      resources: "foodstuffs, cloth, copper, silver, gems (I, II)",
      notes: "Ruler line appears after the stat block in extracted text.",
    },
    "State of Onnwal": {
      ruler: "Ewerd Destron, the Szek of Onnwal",
      capPop: "4,700",
      humanPop: "40,000",
      demihumans: "Dwarves (2,000)",
      humanoids: "None",
      resources: "platinum, gems (III)",
    },
    "Theocracy of the Pale": {
      ruler: "Ogon Tillit, the Theocrat and Supreme Prelate of the Pale",
      capPop: "21,500",
      humanPop: "250,000",
      demihumans: "Some",
      humanoids: "Few",
      resources: "foodstuffs, copper, gems (IV)",
    },
    "Perrenland": {
      ruler: "Franz, Voormann of All Perrenland",
      capPop: "25,000+",
      humanPop: "200,000",
      demihumans: "Some",
      humanoids: "Some",
      resources: "copper",
    },
    "Plains of the Paynims": {
      ruler: "Various nomadic leaders (Amir, Khan, Ilkhan, Orakhon, Shah, etc.)",
      humanPop: "Uncertain; possibly 500,000 or more",
      demihumans: "Doubtful",
      humanoids: "Doubtful but possible",
      notes: "Leaders called Amir, Khan, Ilkhan, Orakhon, Shah, Tarkhan, Padishah, or Kha Khan depending on tribe.",
    },
    "Pomarj": {
      ruler: "No single ruler; humanoid warlords contest control",
      humanPop: "20,000 (?)",
      demihumans: "None",
      humanoids: "Ores (15,000); Goblins (10,000); others",
      resources: "silver, electrum, gold, gems (I, II)",
    },
    "Archbarony of Ratik": {
      ruler: "Lexnol, the Lord Baron of Ratik",
      capPop: "3,240",
      humanPop: "35,000",
      demihumans: "Mountain Dwarves (8,000+); Gnomes (3,000+)",
      humanoids: "Many",
      resources: "shipbuilding supplies, furs, gold, gems (IV)",
    },
    "City of Rel Astra": {
      ruler: "Drax, the Constable Mayor of Rel Astra",
      capPop: "63,900",
      humanPop: "90,000",
      demihumans: "Very few",
      humanoids: "Some",
      notes: "Resources line not printed in source block.",
    },
    "Rovers of the Barrens": {
      ruler: "Kishwa Dogteeth, Ataman of the Standards; Chief of the Wardogs",
      humanPop: "65,000?",
      demihumans: "Few",
      humanoids: "Numerous",
      resources: "furs, gold",
    },
    "Scarlet Brotherhood": {
      ruler: "The Father of Obedience (true name unknown)",
      humanPop: "35,000+/-",
      demihumans: "Doubtful",
      humanoids: "Highly probable",
      resources: "rare woods, spices, gold, gems (I, III, IV)",
    },
    "Sea Barons": {
      ruler: "Sencho Foy, Lord High Admiral of Asperdi; Commander of the Sea Barons",
      capPop: "7,100",
      humanPop: "55,000",
      demihumans: "Few",
      humanoids: "Few",
    },
    "Hold of the Sea Princes": {
      ruler: "Prince Jeon II of Monmurg; Ruler of the Azure Sea",
      capPop: "14,200",
      humanPop: "100,000",
      demihumans: "Few",
      humanoids: "Probable",
      resources: "foodstuffs",
    },
    "Shield Lands": {
      ruler: "Holmer, the Earl of Walworth; Knight Commander of the Shield Lands",
      capPop: "21,300",
      humanPop: "65,000",
      demihumans: "Few",
      humanoids: "Few",
      resources: "foodstuffs",
    },
    "Snow Barbarians": {
      ruler: "King of the Schnai",
      capPop: "5,400",
      humanPop: "90,000+",
      demihumans: "Some",
      humanoids: "Many (in mountains)",
      resources: "copper, gems (I, II)",
    },
    "South Province": {
      ruler: "Chelor, the Herzog of the South Province",
      capPop: "7,000",
      humanPop: "400,000",
      demihumans: "Doubtful",
      humanoids: "Few",
      resources: "foodstuffs, silver",
    },
    "Spindrift Isles": {
      ruler: "The Councils of Five and Seven (true names unknown)",
      capPop: "10,000",
      humanPop: "30,000",
      demihumans: "Many in the northern isles; 1,500+ on Lendore Isle",
      humanoids: "Many on Lendore Isle, mainly ores and kobolds",
    },
    "Sterich": {
      ruler: "Querchard, the Earl of Sterich",
      capPop: "5,000",
      humanPop: "40,000",
      demihumans: "Mountain Dwarves (4,000); Gnomes; Halflings",
      humanoids: "Some (in mountains)",
      resources: "silver, electrum, gold, gems (II, III)",
    },
    "Hold of Stonefist": {
      ruler: "Sevvord Redbeard, the Master of the Hold",
      capPop: "2,100",
      humanPop: "60,000+",
      demihumans: "Doubtful",
      humanoids: "Some",
      resources: "furs, ivory, silver, gems (I)",
    },
    "County of Sunndi": {
      ruler: "Count Hazendel of Sunndi; Olvensteward of the South",
      capPop: "3,600",
      humanPop: "60,000",
      demihumans: "Gray Elves (7,000); Mountain Dwarves (3,000+); Gnomes (2,000+)",
      humanoids: "Some (see Vast Swamp)",
      resources: "electrum, platinum, gems (II, IV)",
    },
    "Duchy of Tenh": {
      ruler: "Duke Ehyeh of Tenh",
      capPop: "23,800",
      humanPop: "200,000",
      demihumans: "Some",
      humanoids: "Numerous (in mountains)",
      resources: "foodstuffs, platinum",
    },
    "Tiger Nomads": {
      ruler: "Ilkhan Cligir of the Chakyik Hordes",
      capPop: "3,800",
      humanPop: "75,000+",
      demihumans: "Few",
      humanoids: "Few",
      resources: "furs, silver, gems (I)",
    },
    "Pashalik of Tusmit": {
      ruler: "Jadhim, the Pasha of Tusmit",
      capPop: "18,500",
      humanPop: "150,000",
      demihumans: "Few",
      humanoids: "Few",
      resources: "foodstuffs, silver, gold",
    },
    "County of Ulek": {
      ruler: "Lewenn, the Count Palatine of Ulek",
      capPop: "10,900",
      humanPop: "25,000",
      demihumans: "Gnomes (5,000); Halflings (4,000); others",
      humanoids: "None",
      resources: "foodstuffs, copper, silver, gems (I, II)",
    },
    "Duchy of Ulek": {
      ruler: "Grenowin, the Duke of Ulek",
      capPop: "13,800",
      humanPop: "15,000",
      demihumans: "High Elves (12,000); Sylvan Elves (4,000); Gnomes",
      humanoids: "Doubtful",
      resources: "foodstuffs, cloth, electrum, gems (I, II)",
    },
    "Principality of Ulek": {
      ruler: "Prince Olinstaad Corond of Ulek; Lord of the Peaks of Haven",
      capPop: "17,200",
      humanPop: "30,000+",
      demihumans: "Dwarves (18,000); Mountain Dwarves (9,000); Gnomes; Halflings",
      humanoids: "Doubtful",
      resources: "foodstuffs, silver, gems (II, IV)",
    },
    "Ull": {
      ruler: "Draske, the Orakhon of Ull",
      capPop: "6,000+/-",
      humanPop: "100,000+",
      demihumans: "Doubtful",
      humanoids: "Some (in mountains)",
      resources: "silver, gems (II)",
    },
    "County of Urnst": {
      ruler: "Countess Belissica of Urnst",
      capPop: "39,100",
      humanPop: "200,000",
      demihumans: "Halflings (3,000); others few",
      humanoids: "Few",
      resources: "foodstuffs, cloth, gold",
    },
    "Duchy of Urnst": {
      ruler: "Duke Karll of Urnst; Warden of the Abbor-Alz",
      capPop: "20,900",
      humanPop: "200,000",
      demihumans: "Halflings (5,000); Gnomes (3,000); Dwarves (3,000)",
      humanoids: "Few",
      resources: "foodstuffs, silver, electrum, gold, platinum, gems (I-IV)",
    },
    "Valley of the Mage": {
      ruler: "The Exalted Mage of the Valley; Laird of the Domain",
      humanPop: "10,000 (?)",
      demihumans: "Possibly Elves, Gnomes",
      humanoids: "Unknown",
    },
    "Archclericy of Veluna": {
      ruler: "Hazen, the Canon of Veluna; Shepherd of the Faithful",
      capPop: "12,600",
      humanPop: "250,000 (excluding Viscounty of Verbobonc)",
      demihumans: "High Elves (10,000); Gnomes (7,000); others",
      humanoids: "Few",
      resources: "foodstuffs, copper, silver, gold",
    },
    "Viscounty of Verbobonc": {
      ruler: "Wilfrick, the Viscount of Verbobonc",
      capPop: "11,600",
      humanPop: "35,000",
      demihumans: "Gnomes (4,000); Sylvan Elves (2,500)",
      humanoids: "Few",
      resources: "copper, gems (I-IV)",
    },
    "Wild Coast": {
      ruler: "No single ruler; major towns Safeton, Narwell, Fax, Badwall, Elredd",
      capPop: "Safeton 4,600; Narwell 2,900; Fax 6,700; Badwall 5,200; Elredd 8,400",
      humanPop: "150,000+(?)",
      demihumans: "Many",
      humanoids: "Many",
    },
    "Wolf Nomads": {
      ruler: "Bargru, Tarkhan of the Wegwiur; Commander of the Relentless Horde",
      capPop: "4,000",
      humanPop: "80,000",
      demihumans: "Few",
      humanoids: "Few",
      resources: "furs, copper",
    },
    "Yeomanry": {
      ruler: "Crispin Redwell, the Freeholder; Spokesman for the Yeomanry League",
      capPop: "6,000",
      humanPop: "100,000",
      demihumans: "High Elves (2,000); Dwarves; Halflings",
      humanoids: "Few (many in mountains)",
      resources: "foodstuffs, cloth, silver, gems (II)",
    },
    "Sultanate of Zeif": {
      ruler: "Murad, the Sultan of Zeif",
      capPop: "40,300",
      humanPop: "200,000",
      demihumans: "Doubtful",
      humanoids: "Doubtful",
      resources: "foodstuffs, gems (III)",
    },
    "Azure Sea": {
      notes: "Main carrier of commerce between west and central nations.",
    },
    "Nyr Dyv": {
      notes: "Largest known freshwater lake; home waters of the Rhennee bargefolk.",
    },
    "Abbor-Alz": {
      notes: "Rocky hill chain between Nesser River and Woolly Bay; known mineral wealth in Urnst-held portion.",
    },
    "Cairn Hills": {
      notes: "Borderland of Greyhawk and the Duchy of Urnst; known for ancient cairns and treasure finds.",
    },
    "Hestmark Highlands": {
      notes: "Includes Dullstrand (pop. 5,500); precious metals and gems noted.",
    },
    "Kron Hills": {
      notes: "Nearly 20,000 gnomes estimated; mined for metals, precious metals, and gems.",
    },
    "Cold Marshes": {
      notes: "Fens and bogs north of the Howling Hills; sources of Dulsi and Opicm Rivers.",
    },
    "Vast Swamp": {
      notes: "Large morass above the Tilvanot Peninsula; legends connect it to Acererak.",
    },
    "Corusk Mountains": {
      notes: "Backbone of the Thillonrian Peninsula.",
    },
    "Crystalmist Mountains": {
      notes: "Highest range in the Flanaess; precious metals and gems noted.",
    },
    "Griff Mountains": {
      notes: "Range between Stonefist, Tenh, and the Pale; valuable mineral deposits noted.",
    },
    "Hellfurnaces": {
      notes: "Volcanically active part of the Crystalmist range.",
    },
    "Yatil Mountains": {
      notes: "Rich in ore deposits and gems.",
    },
    "Adri Forest": {
      humanPop: "25,000-",
      demihumans: "Few",
      humanoids: "Few",
    },
    "Amedio Jungle": {
      demihumans: "Unlikely",
      humanoids: "Possible",
      resources: "foodstuffs, rare woods, spices, ivory, platinum, gems (III, IV)",
    },
    "Celadon Forest": {
      demihumans: "Sylvan Elves and Treants noted",
    },
    "Dreadwood": {
      humanPop: "5,000",
      demihumans: "Sylvan Elves (8,000); Gnomes (1,000); Halflings",
      humanoids: "Some",
    },
    "Gamboge Forest": {
      humanPop: "7,000",
      demihumans: "Sylvan Elves (11,000); Gnomes (3,000); High Elves (1,500); Halflings",
      humanoids: "Some",
    },
    "Gnarley Forest": {
      humanPop: "12,000",
      demihumans: "Sylvan Elves (7,000); Gnomes (3,000); others",
      humanoids: "Some",
    },
    "Grandwood Forest": {
      humanPop: "25,000",
      demihumans: "Sylvan Elves (7,000); some others",
      humanoids: "Some",
    },
    "Vesve Forest": {
      humanPop: "20,000",
      demihumans: "Sylvan Elves (10,000); Gnomes (6,000); High Elves (3,000); Halflings",
      humanoids: "Hobgoblins (5,000); Gnolls (3,000)",
    },
    "Welkwood": {
      humanPop: "10,000+",
      demihumans: "Many",
      humanoids: "Some (raiding parties)",
    },
    "Bright Desert": {
      humanPop: "Unknown (scattered nomads)",
      demihumans: "Doubtful",
      humanoids: "Doubtful",
      resources: "copper, silver, gold, and gem minerals noted",
      notes: "Heading appears as Wastelands; first entry is Bright Desert.",
    },
    "Dry Steppes": {
      notes: "Baklunish nomad hordes noted.",
    },
    "Rift Canyon": {
      notes: "White Plume Mountain noted just south of the canyon.",
    },
    "Sea of Dust": {
      notes: "Former Suel/Suloise Empire; Forgotten City legend noted.",
    },
  };

  const GH_REGIONS = [
    // ── Central Flanaess ────────────────────────────────────────────────
    { name:'City of Greyhawk',          kind:'land', color:'#cc4444', capital:'Greyhawk',         anchors:['C4-86'] },
    { name:'Domain of Greyhawk',        kind:'land', color:'#dd7755', capital:'Greyhawk',         anchors:['C4-91'] },
    { name:'Hardby',                    kind:'land', color:'#cc6655', capital:'Hardby'                              },
    { name:'Wild Coast',                kind:'land', color:'#88aa44', capital:'Safeton',          anchors:['G4-89','F4-95','H4-95'] },
    { name:'County of Urnst',           kind:'land', color:'#bbaa44', capital:'Radigast City',    anchors:['Q3-74'] },
    { name:'Duchy of Urnst',            kind:'land', color:'#998822', capital:'Leukish',          anchors:['R3-81'] },
    // ── Sheldomar Valley (south-west) ───────────────────────────────────
    { name:'Kingdom of Keoland',        kind:'land', color:'#cc8822', capital:'Niole Dra',        anchors:['P4-117','X4-113'] },
    { name:'County of Ulek',            kind:'land', color:'#cc9966', capital:'Jurnre'                              },
    { name:'Duchy of Ulek',             kind:'land', color:'#aa7744', capital:'Tringlee'                             },
    { name:'Principality of Ulek',      kind:'land', color:'#bb6633', capital:'Gryrax'                              },
    { name:'Yeomanry',                  kind:'land', color:'#ddaa55', capital:'Loftwick'                            },
    { name:'Gran March',                kind:'land', color:'#cc9944', capital:'Hookhill'                            },
    { name:'March of Bissel',           kind:'land', color:'#ccaa66', capital:'Thornward'                           },
    { name:'Grand Duchy of Geoff',      kind:'land', color:'#aa8855', capital:'Gorna'                               },
    { name:'Sterich',                   kind:'land', color:'#998866', capital:'Istivin'                             },
    // ── Veluna / Furyondy / Iuz frontier (north-west) ───────────────────
    { name:'Archclericy of Veluna',     kind:'land', color:'#dddd99', capital:'Mitrik'                              },
    { name:'Viscounty of Verbobonc',    kind:'land', color:'#aa6644', capital:'Verbobonc',        anchors:['O4-95'] },
    { name:'Kingdom of Furyondy',       kind:'land', color:'#4488cc', capital:'Chendl',           anchors:['P4-85','E4-83'] },
    { name:'Shield Lands',              kind:'land', color:'#5577aa', capital:'Critwall'                            },
    { name:'Highfolk',                  kind:'land', color:'#66aabb', capital:'Highfolk Town'                       },
    { name:'Valley of the Highfolk',    kind:'land', color:'#7abbcc', capital:null                                  },
    { name:'Perrenland',                kind:'land', color:'#cccc77', capital:'Schwartzenbruin'                     },
    { name:'Horned Society',            kind:'land', color:'#552255', capital:'Molag',            anchors:['E4-74'] },
    { name:'Empire of Iuz',             kind:'land', color:'#660000', capital:'Dorakaa',          anchors:['H4-70'] },
    { name:'Bandit Kingdoms',           kind:'land', color:'#774422', capital:'Rookroost'                           },
    // ── Far north and north-east ────────────────────────────────────────
    { name:'Wolf Nomads',               kind:'land', color:'#999966', capital:'Eru-Tovar'                           },
    { name:'Tiger Nomads',              kind:'land', color:'#aaaa55', capital:'Yecha'                               },
    { name:'Rovers of the Barrens',     kind:'land', color:'#886633', capital:null                                  },
    { name:'Hold of Stonefist',         kind:'land', color:'#7788aa', capital:'Vlekstaad'                           },
    { name:'Theocracy of the Pale',     kind:'land', color:'#ddddee', capital:'Wintershiven'                        },
    { name:'Duchy of Tenh',             kind:'land', color:'#aa9988', capital:'Nevond Nevnend'                      },
    { name:'Frost Barbarians',          kind:'land', color:'#bbccdd', capital:'Krakenheim'                          },
    { name:'Snow Barbarians',           kind:'land', color:'#ccddee', capital:'Soull'                               },
    { name:'Ice Barbarians',            kind:'land', color:'#aaccdd', capital:'Glot'                                },
    { name:'Bone March',                kind:'land', color:'#ccccaa', capital:'Spinecastle'                         },
    { name:'Archbarony of Ratik',       kind:'land', color:'#bbaa77', capital:'Marner'                              },
    { name:'Archbarony of Blackmoor',   kind:'land', color:'#7090a8', capital:'Dantredun'                           },
    // ── Central / east (Nyrond and around) ──────────────────────────────
    { name:'Kingdom of Nyrond',         kind:'land', color:'#88bb55', capital:'Rel Mord'                            },
    // ── Great Kingdom and successors ────────────────────────────────────
    { name:'Great Kingdom',             kind:'land', color:'#884444', capital:'Rauxes',           anchors:['A2-69','R-72'] },
    { name:'North Province',            kind:'land', color:'#993333', capital:'Eastfair'                            },
    { name:'South Province',            kind:'land', color:'#aa3333', capital:'Zelradton'                           },
    { name:'See of Medegia',            kind:'land', color:'#aa4455', capital:'Mentrey'                             },
    { name:'City of Rel Astra',         kind:'land', color:'#aa5544', capital:'Rel Astra'                           },
    { name:'County of Sunndi',          kind:'land', color:'#669966', capital:'Pitchfield'                          },
    { name:'County of Idee',            kind:'land', color:'#aabb66', capital:'Naerie'                              },
    { name:'State of Onnwal',           kind:'land', color:'#88aa66', capital:'Scant'                               },
    { name:'Free City of Irongate',     kind:'land', color:'#776655', capital:'Irongate'                            },
    { name:'Prelacy of Almor',          kind:'land', color:'#ccbb88', capital:'Chathold'                            },
    { name:'Lordship of the Isles',     kind:'land', color:'#558899', capital:'Sulward'                             },
    { name:'Sea Barons',                kind:'land', color:'#446677', capital:'Asperdi'                             },
    { name:'Spindrift Isles',           kind:'land', color:'#5588aa', capital:'Lo Reltarma'                         },
    // ── South coast ─────────────────────────────────────────────────────
    { name:'Hold of the Sea Princes',   kind:'land', color:'#aa6688', capital:'Monmurg'                             }, // 1983 says Monmurg; "Hokar" was an earlier alt
    { name:'Pomarj',                    kind:'land', color:'#aa3322', capital:'Highport'                            },
    { name:'Scarlet Brotherhood',       kind:'land', color:'#990000', capital:null                                  }, // hidden city; territory not on map
    // ── Baklunish west (off-map for most Flanaess play, but in 1983 source) ─
    { name:'Caliphate of Ekbir',        kind:'land', color:'#cc9955', capital:'Ekbir'                               },
    { name:'Sultanate of Zeif',         kind:'land', color:'#aa8844', capital:'Zeif'                                },
    { name:'Pashalik of Tusmit',        kind:'land', color:'#bb9966', capital:'Sefmur'                              },
    { name:'Ull',                       kind:'land', color:'#aa9955', capital:'Ulakand'                             },
    { name:'Plains of the Paynims',     kind:'land', color:'#bbaa66', capital:null                                  },
    // ── Misc small domains ──────────────────────────────────────────────
    { name:'Valley of the Mage',        kind:'land', color:'#774499', capital:null                                  },
    // ── City-states ────────────────────────────────────────────────────
    { name:'City of Dyvers',            kind:'land', color:'#cc7755', capital:'Dyvers'                              },
    // Note: the Iron League is an alliance of southern polities (County
    // of Idee, County of Sunndi, State of Onnwal, Free City of Irongate,
    // Lordship of the Isles), not a polity itself. Members are listed
    // individually above. A future cultural/alliance tag can capture
    // Iron League membership without conflating it with a region.

    // ── GEOGRAPHIC FEATURES (named natural regions) ─────────────────────
    // Forests, mountain ranges, hill chains, lakes, rivers, swamps, and
    // deserts that the LGG and Darlene map call out by name. category is
    // 'geographic'; subkind narrows the type for downstream consumers
    // (encounter tables, color schemes). Political regions above default
    // to category:'political' via applyDefs, so explicit category is
    // omitted there to keep BASE entries terse.
    //
    // Single-membership note: a hex painted into Vesve Forest is no
    // longer in Kingdom of Furyondy from the engine's POV. The forest/
    // kingdom overlap problem is acknowledged but out of scope for now;
    // paint borders accordingly. Rivers (linear, narrow) tend to avoid
    // this since they're typically painted on water hexes anyway.

    // ── Forests ─────────────────────────────────────────────────────────
    { name:'Vesve Forest',          category:'geographic', subkind:'forest', kind:'land', color:'#3d6630' },
    { name:'Gnarley Forest',        category:'geographic', subkind:'forest', kind:'land', color:'#406b32' },
    { name:'Welkwood',              category:'geographic', subkind:'forest', kind:'land', color:'#4a7338' },
    { name:'Suss Forest',           category:'geographic', subkind:'forest', kind:'land', color:'#3a5d2c' },
    { name:'Dim Forest',            category:'geographic', subkind:'forest', kind:'land', color:'#2d4823' },
    { name:'Oytwood',               category:'geographic', subkind:'forest', kind:'land', color:'#446a36' },
    { name:'Hornwood',              category:'geographic', subkind:'forest', kind:'land', color:'#446a36' },
    { name:'Dreadwood',             category:'geographic', subkind:'forest', kind:'land', color:'#2a3f20' },
    { name:'Menowood',              category:'geographic', subkind:'forest', kind:'land', color:'#406b32' },
    { name:'Celadon Forest',        category:'geographic', subkind:'forest', kind:'land', color:'#4d7740' },
    { name:'Adri Forest',           category:'geographic', subkind:'forest', kind:'land', color:'#3a5a2e' },
    { name:'Phostwood',             category:'geographic', subkind:'forest', kind:'land', color:'#3a5a2e' },
    { name:'Burneal Forest',        category:'geographic', subkind:'forest', kind:'land', color:'#2d4823' },
    { name:'Fellreev Forest',       category:'geographic', subkind:'forest', kind:'land', color:'#3a5a2e' },
    { name:'Forlorn Forest',        category:'geographic', subkind:'forest', kind:'land', color:'#2d4823' },
    { name:'Gamboge Forest',        category:'geographic', subkind:'forest', kind:'land', color:'#5a7a3a' },
    { name:'Spikey Forest',         category:'geographic', subkind:'forest', kind:'land', color:'#3a5a2e' },
    { name:'Loftwood',              category:'geographic', subkind:'forest', kind:'land', color:'#446a36' },
    { name:'Grandwood Forest',      category:'geographic', subkind:'forest', kind:'land', color:'#3a5d2c' },
    { name:'Timberway Forest',      category:'geographic', subkind:'forest', kind:'land', color:'#446a36' },
    { name:'Rieuwood',              category:'geographic', subkind:'forest', kind:'land', color:'#406b32' },
    { name:'Amedio Jungle',         category:'geographic', subkind:'forest', kind:'land', color:'#1f3818' },
    { name:'Hool Marshes',          category:'geographic', subkind:'swamp',  kind:'land', color:'#5a6840' },

    // ── Mountains ───────────────────────────────────────────────────────
    { name:'Lortmil Mountains',     category:'geographic', subkind:'mountains', kind:'land', color:'#7a6855' },
    { name:'Crystalmist Mountains', category:'geographic', subkind:'mountains', kind:'land', color:'#8a7866' },
    { name:'Hellfurnaces',          category:'geographic', subkind:'mountains', kind:'land', color:'#6a4a3a' },
    { name:'Sulhaut Mountains',     category:'geographic', subkind:'mountains', kind:'land', color:'#7a6655' },
    { name:'Yatil Mountains',       category:'geographic', subkind:'mountains', kind:'land', color:'#7a6655' },
    { name:'Clatspur Range',        category:'geographic', subkind:'mountains', kind:'land', color:'#75634f' },
    { name:'Barrier Peaks',         category:'geographic', subkind:'mountains', kind:'land', color:'#7a6655' },
    { name:'Jotens',                category:'geographic', subkind:'mountains', kind:'land', color:'#75634f' },
    { name:'Griff Mountains',       category:'geographic', subkind:'mountains', kind:'land', color:'#7a6655' },
    { name:'Corusk Mountains',      category:'geographic', subkind:'mountains', kind:'land', color:'#75634f' },
    { name:'Rakers',                category:'geographic', subkind:'mountains', kind:'land', color:'#7a6655' },
    { name:'Glorioles',             category:'geographic', subkind:'mountains', kind:'land', color:'#75634f' },
    { name:'Hestmark Highlands',    category:'geographic', subkind:'mountains', kind:'land', color:'#75634f' },

    // ── Hills ───────────────────────────────────────────────────────────
    { name:'Cairn Hills',           category:'geographic', subkind:'hills',  kind:'land', color:'#9a8866' },
    { name:'Kron Hills',            category:'geographic', subkind:'hills',  kind:'land', color:'#9a8866' },
    { name:'Abbor-Alz',             category:'geographic', subkind:'hills',  kind:'land', color:'#a08a6a' },
    { name:'Flinty Hills',          category:'geographic', subkind:'hills',  kind:'land', color:'#9a8866' },
    { name:'Good Hills',            category:'geographic', subkind:'hills',  kind:'land', color:'#9a8866' },
    { name:'Iron Hills',            category:'geographic', subkind:'hills',  kind:'land', color:'#8a7855' },
    { name:'Headlands',             category:'geographic', subkind:'hills',  kind:'land', color:'#9a8866' },
    { name:'Stark Mounds',          category:'geographic', subkind:'hills',  kind:'land', color:'#9a8866' },
    { name:'Tusman Hills',          category:'geographic', subkind:'hills',  kind:'land', color:'#9a8866' },
    { name:'Yecha Hills',           category:'geographic', subkind:'hills',  kind:'land', color:'#9a8866' },
    { name:'Sepia Uplands',         category:'geographic', subkind:'hills',  kind:'land', color:'#a89a76' },
    { name:'Lorridges',             category:'geographic', subkind:'hills',  kind:'land', color:'#9a8866' },
    { name:'Bluff Hills',           category:'geographic', subkind:'hills',  kind:'land', color:'#9a8866' },

    // ── Swamps / marshes ────────────────────────────────────────────────
    { name:'Vast Swamp',            category:'geographic', subkind:'swamp',  kind:'land', color:'#5a6840' },
    { name:'Pelisso Swamps',        category:'geographic', subkind:'swamp',  kind:'land', color:'#5a6840' },
    { name:'Ghastly Swamp',         category:'geographic', subkind:'swamp',  kind:'land', color:'#4d5933' },
    { name:'Mistmarsh',             category:'geographic', subkind:'swamp',  kind:'land', color:'#5a6840' },
    { name:'Rushmoor',              category:'geographic', subkind:'swamp',  kind:'land', color:'#5a6840' },
    { name:'Troll Fens',            category:'geographic', subkind:'swamp',  kind:'land', color:'#4d5933' },

    // ── Deserts and waste ───────────────────────────────────────────────
    { name:'Bright Desert',         category:'geographic', subkind:'desert', kind:'land', color:'#c8a86a' },
    { name:'Sea of Dust',           category:'geographic', subkind:'desert', kind:'land', color:'#cdb47a' },
    { name:'Land of Black Ice',     category:'geographic', subkind:'desert', kind:'land', color:'#b0c4d4' },

    // ── Inland water bodies ─────────────────────────────────────────────
    { name:'Nyr Dyv',               category:'geographic', subkind:'lake',   kind:'water', color:'#3a6a8a' },
    { name:'Whyestil Lake',         category:'geographic', subkind:'lake',   kind:'water', color:'#3a6a8a' },
    { name:'Lake Quag',             category:'geographic', subkind:'lake',   kind:'water', color:'#3a6a8a' },
    { name:'Spendlowe Lake',        category:'geographic', subkind:'lake',   kind:'water', color:'#3a6a8a' },
    { name:'Icy Sea',               category:'geographic', subkind:'sea',    kind:'water', color:'#5680a0' },

    // ── Rivers ──────────────────────────────────────────────────────────
    { name:'Velverdyva River',      category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },
    { name:'Selintan River',        category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },
    { name:'Nesser River',          category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },
    { name:'Imeda River',           category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },
    { name:'Veng River',            category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },
    { name:'Att River',             category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },
    { name:'Artonsamay River',      category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },
    { name:'Harp River',            category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },
    { name:'Duntide',               category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },
    { name:'Franz River',           category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },
    { name:'Flanmi River',          category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },
    { name:'Grayflood',             category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },
    { name:'Javan River',           category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },
    { name:'Sheldomar River',       category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },
    { name:'Davish River',          category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },
    { name:'Old River',             category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },
    { name:'Yol River',             category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },
    { name:'Dulsi River',           category:'geographic', subkind:'river',  kind:'water', color:'#4a7a9a' },

    // ── Other ──────────────────────────────────────────────────────────
    { name:'Rift Canyon',           category:'geographic', subkind:'canyon', kind:'land', color:'#7a5a3a' },

    // ── Additional 1983 canon hills/highlands ──────────────────────────
    { name:'Blemu Hills',           category:'geographic', subkind:'hills',  kind:'land', color:'#9a8866' },
    { name:'Drachensgrab Hills',    category:'geographic', subkind:'hills',  kind:'land', color:'#7a5a4a' },
    { name:'Gull Cliffs',           category:'geographic', subkind:'hills',  kind:'land', color:'#a89a76' },
    { name:'Hollow Highlands',      category:'geographic', subkind:'hills',  kind:'land', color:'#9a8866' },
    { name:'Howling Hills',         category:'geographic', subkind:'hills',  kind:'land', color:'#9a8866' },
    { name:'Little Hills',          category:'geographic', subkind:'hills',  kind:'land', color:'#9a8866' },
    { name:'Spine Ridge',           category:'geographic', subkind:'hills',  kind:'land', color:'#8a7855' },
    { name:'Tors',                  category:'geographic', subkind:'hills',  kind:'land', color:'#9a8866' },

    // ── Additional 1983 canon mountain ranges ──────────────────────────
    { name:'Drachensgrab Mountains', category:'geographic', subkind:'mountains', kind:'land', color:'#7a5a4a' },
    { name:'Ulsprue Mountains',     category:'geographic', subkind:'mountains', kind:'land', color:'#7a6655' },

    // ── Additional 1983 canon marshes ──────────────────────────────────
    { name:'Gnatmarsh',             category:'geographic', subkind:'swamp',  kind:'land', color:'#5a6840' },
    { name:'Lone Heath',            category:'geographic', subkind:'swamp',  kind:'land', color:'#5a6840' },

    // ── Additional 1983 canon wastelands ───────────────────────────────
    { name:'Dry Steppes',           category:'geographic', subkind:'desert', kind:'land', color:'#bca858' },

    // ── Major bodies of water (1983 boxed set canon) ───────────────────
    // The Darlene map calls these out by name. They sit at the edges of
    // the Flanaess and form natural boundaries; encounter modules and
    // the voyage simulator reference them by name.
    { name:'Azure Sea',             category:'geographic', subkind:'sea',    kind:'water', color:'#3d7ba8' },
    { name:'Solnor Ocean',          category:'geographic', subkind:'sea',    kind:'water', color:'#2d6090' },
    { name:'Aerdi Sea',             category:'geographic', subkind:'sea',    kind:'water', color:'#3a6a8a' },
    { name:'Sea of Gearnat',        category:'geographic', subkind:'sea',    kind:'water', color:'#3a6a8a' },
    { name:'Dramidj Ocean',         category:'geographic', subkind:'sea',    kind:'water', color:'#3070a0' },
    { name:'Densac Gulf',           category:'geographic', subkind:'sea',    kind:'water', color:'#3a6a8a' },
    { name:'Oljatt Sea',            category:'geographic', subkind:'sea',    kind:'water', color:'#3a6a8a' },
    { name:'Tilva Strait',          category:'geographic', subkind:'sea',    kind:'water', color:'#3a6a8a' },
    { name:'Spindrift Sound',       category:'geographic', subkind:'sea',    kind:'water', color:'#3a6a8a' },

    // ── Bays (lesser water) ────────────────────────────────────────────
    { name:'Grendep Bay',           category:'geographic', subkind:'sea',    kind:'water', color:'#4080a8' },
    { name:'Jeklea Bay',            category:'geographic', subkind:'sea',    kind:'water', color:'#4080a8' },
    { name:'Relmor Bay',            category:'geographic', subkind:'sea',    kind:'water', color:'#4080a8' },
    { name:'White Fanged Bay',      category:'geographic', subkind:'sea',    kind:'water', color:'#5e9bbe' },
    { name:'Woolly Bay',            category:'geographic', subkind:'sea',    kind:'water', color:'#4080a8' },
  ];
  const BASE_REGION_NAMES = new Set(GH_REGIONS.map(r => r.name));

  const POLY_CACHE = new Map();
  const HEX_CACHE  = new Map();

  // ── Overrides (localStorage) ─────────────────────────────────────────────
  let OVERRIDE_DEFS  = {};
  let OVERRIDE_HEXES = {};
  try {
    const a = localStorage.getItem(LS_KEY_DEFS);
    if (a) OVERRIDE_DEFS = JSON.parse(a) || {};
    const b = localStorage.getItem(LS_KEY_HEXES);
    if (b) OVERRIDE_HEXES = JSON.parse(b) || {};
  } catch(e){ OVERRIDE_DEFS = {}; OVERRIDE_HEXES = {}; }

  function saveDefs(){
    try { localStorage.setItem(LS_KEY_DEFS, JSON.stringify(OVERRIDE_DEFS)); } catch(e){}
  }
  function saveHexes(){
    try { localStorage.setItem(LS_KEY_HEXES, JSON.stringify(OVERRIDE_HEXES)); } catch(e){}
  }

  // Apply OVERRIDE_DEFS — patch BASE color/kind, append new regions.
  function applyDefs(){
    for (const [name, def] of Object.entries(OVERRIDE_DEFS)){
      const idx = GH_REGIONS.findIndex(r => r.name === name);
      if (idx < 0){
        // Override-only region. If a Bootstrap-created override has
        // metadata (color/category set explicitly), respect it; otherwise
        // default to political (kingdoms/duchies are the common case).
        GH_REGIONS.push({
          name,
          kind:     def.kind     || 'land',
          color:    def.color    || defaultColor(name),
          category: def.category || 'political',
        });
      } else {
        // Override augments BASE. BASE wins on category/subkind so the
        // curated geographic classification isn't overwritten by a
        // Bootstrap entry that omits those fields. popTier from the
        // override always wins (it's a direct user choice).
        if (def.kind)  GH_REGIONS[idx].kind  = def.kind;
        if (def.color && !GH_REGIONS[idx].color) GH_REGIONS[idx].color = def.color;
        if (def.popTier !== undefined) GH_REGIONS[idx].popTier = def.popTier;
      }
    }
    // Apply defaults: BASE political entries omit category for terseness,
    // so default any region without one to 'political' here.
    for (const r of GH_REGIONS){
      if (!r.color) r.color = defaultColor(r.name);
      if (!r.category) r.category = 'political';
    }
    // Merge REGION_DETAILS metadata onto each region by name. Fields
    // are non-destructive: an explicit field on the region object wins
    // over the details table, so user-set values via setRegionMeta
    // don't get clobbered. Available fields: ruler, capPop, humanPop,
    // demihumans, humanoids, resources, notes.
    const DETAIL_FIELDS = ['ruler','capPop','humanPop','demihumans','humanoids','resources','notes'];
    for (const r of GH_REGIONS){
      const d = REGION_DETAILS[r.name];
      if (!d) continue;
      for (const f of DETAIL_FIELDS){
        if (d[f] !== undefined && r[f] === undefined) r[f] = d[f];
      }
    }
    // Merge popTier from REGION_POP_TIERS, then default any region
    // without an explicit tier by category: political → patrolled
    // (lightly populated kingdom default), geographic → uninhabited.
    // User overrides via setRegionMeta win over the table.
    for (const r of GH_REGIONS){
      if (r.popTier === undefined && REGION_POP_TIERS[r.name] !== undefined){
        r.popTier = REGION_POP_TIERS[r.name];
      }
      if (r.popTier === undefined){
        r.popTier = (r.category === 'geographic') ? 'uninhabited' : 'patrolled';
      }
    }
  }
  applyDefs();

  // ── Migrations ─────────────────────────────────────────────────────────
  // One-time renames that move localStorage override hex sets from a
  // legacy name to its current canonical name. Runs at module init. The
  // migration LOG_KEY records which migrations have already run so they
  // don't fire repeatedly. Hex data, region defs (color/category etc.),
  // and user-meaningful identity are all preserved across the rename.
  //
  // When adding a migration: bump the version's name in MIGRATIONS, push
  // the old→new rename, leave the old entries in this list forever (so
  // users who haven't loaded recently still get migrated when they do).
  const MIGRATIONS_KEY = 'gcc-region-migrations-v1';
  const MIGRATIONS = [
    // [oldName, newName]
    ['Perren Land',          'Perrenland'],
    ['Welkwood Forest',      'Welkwood'],
    ['Pelisso Swamp',        'Pelisso Swamps'],
    ['Rushmoors',            'Rushmoor'],
    ['Duntide River',        'Duntide'],
    ['County of Almor',      'Prelacy of Almor'],
    ['Sea Princes',          'Hold of the Sea Princes'],
    ['Tenh',                 'Duchy of Tenh'],
    ['Idee',                 'County of Idee'],
    ['Onnwal',               'State of Onnwal'],
    ['Bissel',               'March of Bissel'],
    ['Geoff',                'Grand Duchy of Geoff'],
    // Lake of Unknown Depths is the alt name for Nyr Dyv — merge.
    ['Lake of Unknown Depths', 'Nyr Dyv'],
  ];

  function runMigrations(){
    let already = {};
    try {
      const raw = localStorage.getItem(MIGRATIONS_KEY);
      if (raw) already = JSON.parse(raw) || {};
    } catch(e){ already = {}; }

    let migrated = 0;
    for (const [oldName, newName] of MIGRATIONS){
      const tag = `${oldName}=>${newName}`;
      if (already[tag]) continue;
      // Move override hexes (additive: union with any existing hexes
      // under the new name, since BASE may have populated some).
      if (OVERRIDE_HEXES[oldName] && OVERRIDE_HEXES[oldName].length){
        const cur = new Set(OVERRIDE_HEXES[newName] || []);
        for (const k of OVERRIDE_HEXES[oldName]) cur.add(k);
        OVERRIDE_HEXES[newName] = Array.from(cur);
        migrated += OVERRIDE_HEXES[oldName].length;
      }
      delete OVERRIDE_HEXES[oldName];
      // Move override defs only if no def exists for the new name.
      // Otherwise keep the new name's def (BASE-or-newer wins).
      if (OVERRIDE_DEFS[oldName]){
        if (!OVERRIDE_DEFS[newName]){
          OVERRIDE_DEFS[newName] = OVERRIDE_DEFS[oldName];
        }
        delete OVERRIDE_DEFS[oldName];
      }
      already[tag] = true;
    }
    if (migrated > 0){
      saveDefs();
      saveHexes();
      // Re-apply def overrides so the renamed entries pick up their BASE
      // metadata if they exist there now.
      applyDefs();
      console.log(`[gcc-regions] migrated ${migrated} hex(es) across ${MIGRATIONS.length} renames`);
    }
    try {
      localStorage.setItem(MIGRATIONS_KEY, JSON.stringify(already));
    } catch(e){}
  }
  runMigrations();

  function applyHexes(){
    HEX_CACHE.clear();
    for (const r of GH_REGIONS){
      if (OVERRIDE_HEXES[r.name]) r.hexes = OVERRIDE_HEXES[r.name].slice();
    }
  }
  applyHexes();

  function hexSetFor(idx){
    if (HEX_CACHE.has(idx)) return HEX_CACHE.get(idx);
    const r = GH_REGIONS[idx];
    if (!r || !r.hexes){ HEX_CACHE.set(idx, null); return null; }
    const set = new Set();
    for (const h of r.hexes){
      const v = resolveVertex(h);
      if (v) set.add(`${v.col}-${v.row}`);
    }
    HEX_CACHE.set(idx, set);
    return set;
  }

  function polyPointsFor(idx){
    if (POLY_CACHE.has(idx)) return POLY_CACHE.get(idx);
    const reg = GH_REGIONS[idx];
    if (!reg || !reg.vertices){ POLY_CACHE.set(idx, null); return null; }
    const pts = [];
    for (const v of reg.vertices){
      const hit = resolveVertex(v);
      if (!hit){ POLY_CACHE.set(idx, null); return null; }
      pts.push(hexCenterU(hit.col, hit.row));
    }
    const out = pts.length >= 3 ? pts : null;
    POLY_CACHE.set(idx, out);
    return out;
  }

  // 'vertices' | false. Hex-set is checked separately in the first
  // pass of two-pass lookup so a painted hex anywhere wins over a
  // geometry hit on an earlier-listed region.
  function hitGeometry(col, row, idx){
    const r = GH_REGIONS[idx];
    if (r.vertices){
      const pts = polyPointsFor(idx);
      if (pts){
        const u = hexCenterU(col, row);
        if (pointInPoly(u.x, u.y, pts)) return 'vertices';
      }
    }
    return false;
  }

  function findHexTag(col, row){
    const key = `${col}-${row}`;
    for (let i = 0; i < GH_REGIONS.length; i++){
      const set = hexSetFor(i);
      if (set && set.has(key)) return i;
    }
    return -1;
  }

  function getRegion(col, row){
    const tagged = findHexTag(col, row);
    if (tagged >= 0) return GH_REGIONS[tagged].name;
    for (let i = 0; i < GH_REGIONS.length; i++){
      if (hitGeometry(col, row, i)) return GH_REGIONS[i].name;
    }
    return 'Unknown Reaches';
  }

  function getRegionInfo(col, row){
    const tagged = findHexTag(col, row);
    if (tagged >= 0){
      const r = GH_REGIONS[tagged];
      return { name: r.name, kind: r.kind || 'land', subkind: r.subkind || null };
    }
    for (let i = 0; i < GH_REGIONS.length; i++){
      if (hitGeometry(col, row, i)){
        const r = GH_REGIONS[i];
        return { name: r.name, kind: r.kind || 'land', subkind: r.subkind || null };
      }
    }
    return { name: 'Unknown Reaches', kind: 'land', subkind: null };
  }

  function getMembership(col, row){
    const tagged = findHexTag(col, row);
    if (tagged >= 0){
      const r = GH_REGIONS[tagged];
      return { name: r.name, source: 'hexes', color: r.color };
    }
    for (let i = 0; i < GH_REGIONS.length; i++){
      const src = hitGeometry(col, row, i);
      if (src) return { name: GH_REGIONS[i].name, source: src, color: GH_REGIONS[i].color };
    }
    return null;
  }

  function getHexTagged(col, row){
    const key = `${col}-${row}`;
    for (let i = 0; i < GH_REGIONS.length; i++){
      const set = hexSetFor(i);
      if (set && set.has(key)){
        return { name: GH_REGIONS[i].name, color: GH_REGIONS[i].color };
      }
    }
    return null;
  }

  function all(){ return GH_REGIONS.slice(); }
  function getByName(name){ return GH_REGIONS.find(r => r.name === name) || null; }
  function names(){ return GH_REGIONS.map(r => r.name); }

  // ── Editor mutations ──────────────────────────────────────────────────────
  function addRegion({ name, kind, color, category, subkind }){
    if (!name || typeof name !== 'string') return false;
    if (GH_REGIONS.some(r => r.name === name)) return false;
    OVERRIDE_DEFS[name] = {
      kind:     kind     || 'land',
      color:    color    || defaultColor(name),
      category: category || 'political',
    };
    if (subkind) OVERRIDE_DEFS[name].subkind = subkind;
    saveDefs();
    const reg = {
      name,
      kind:     OVERRIDE_DEFS[name].kind,
      color:    OVERRIDE_DEFS[name].color,
      category: OVERRIDE_DEFS[name].category,
    };
    if (subkind) reg.subkind = subkind;
    GH_REGIONS.push(reg);
    return true;
  }

  function removeRegion(name){
    const idx = GH_REGIONS.findIndex(r => r.name === name);
    if (idx < 0) return false;
    delete OVERRIDE_HEXES[name];
    saveHexes();
    if (!BASE_REGION_NAMES.has(name)){
      delete OVERRIDE_DEFS[name];
      saveDefs();
      GH_REGIONS.splice(idx, 1);
    } else {
      // BASE — strip override hexes; metadata remains.
      delete GH_REGIONS[idx].hexes;
    }
    POLY_CACHE.clear();
    HEX_CACHE.clear();
    return true;
  }

  function setRegionColor(name, color){
    const r = getByName(name);
    if (!r) return false;
    r.color = color;
    OVERRIDE_DEFS[name] = Object.assign({}, OVERRIDE_DEFS[name] || { kind: r.kind }, { color });
    saveDefs();
    return true;
  }

  // Unified metadata setter for the editor. color/kind/category/subkind;
  // fields not passed are left alone. Pass null to a category/subkind
  // field to clear it (treats as "no change" if undefined).
  function setRegionMeta(name, { color, kind, category, subkind, popTier } = {}){
    const r = getByName(name);
    if (!r) return false;
    if (color    !== undefined) r.color    = color;
    if (kind     !== undefined) r.kind     = kind;
    if (category !== undefined) r.category = category;
    if (subkind  !== undefined) r.subkind  = subkind;
    if (popTier  !== undefined) r.popTier  = popTier;
    const cur = OVERRIDE_DEFS[name] || {};
    OVERRIDE_DEFS[name] = {
      kind:     kind     !== undefined ? kind     : (cur.kind     || r.kind || 'land'),
      color:    color    !== undefined ? color    : (cur.color    || r.color),
      category: category !== undefined ? category : (cur.category || r.category || 'political'),
    };
    if (subkind !== undefined ? subkind : cur.subkind){
      OVERRIDE_DEFS[name].subkind = subkind !== undefined ? subkind : cur.subkind;
    }
    if (popTier !== undefined ? popTier : cur.popTier){
      OVERRIDE_DEFS[name].popTier = popTier !== undefined ? popTier : cur.popTier;
    }
    saveDefs();
    return true;
  }

  function isBase(name){ return BASE_REGION_NAMES.has(name); }

  // Accept "col-row", [col,row], or Darlene ID. Always store internal
  // "col-row" form so overrides round-trip without darleneToInternal.
  function normalizeHexId(h){
    if (Array.isArray(h)) return `${h[0]}-${h[1]}`;
    if (typeof h !== 'string') return null;
    if (/^\d+-\d+$/.test(h)) return h;
    if (typeof darleneToInternal === 'function'){
      const v = darleneToInternal(h);
      if (v) return `${v.col}-${v.row}`;
    }
    return null;
  }

  function setHexes(name, hexIds){
    if (!getByName(name)) return false;
    const ids = (hexIds || []).map(normalizeHexId).filter(Boolean);
    OVERRIDE_HEXES[name] = ids;
    saveHexes();
    applyHexes();
    return true;
  }

  function addHexes(name, hexIds){
    if (!getByName(name)) return false;
    const ids = (hexIds || []).map(normalizeHexId).filter(Boolean);
    if (!ids.length) return false;
    const newKeys = new Set(ids);
    // Painting into A removes from any other override set.
    for (const other in OVERRIDE_HEXES){
      if (other === name) continue;
      const filtered = OVERRIDE_HEXES[other].filter(k => !newKeys.has(k));
      if (filtered.length !== OVERRIDE_HEXES[other].length){
        OVERRIDE_HEXES[other] = filtered;
      }
    }
    const cur = new Set(OVERRIDE_HEXES[name] || []);
    let changed = false;
    for (const k of ids){ if (!cur.has(k)){ cur.add(k); changed = true; } }
    OVERRIDE_HEXES[name] = Array.from(cur);
    saveHexes();
    applyHexes();
    return changed;
  }

  function removeHexes(name, hexIds){
    if (!OVERRIDE_HEXES[name]) return false;
    const drop = new Set((hexIds || []).map(normalizeHexId).filter(Boolean));
    const before = OVERRIDE_HEXES[name].length;
    OVERRIDE_HEXES[name] = OVERRIDE_HEXES[name].filter(k => !drop.has(k));
    if (OVERRIDE_HEXES[name].length === before) return false;
    saveHexes();
    applyHexes();
    return true;
  }

  // Erase whichever override claims (col,row). Returns the cleared name.
  function erasePaintAt(col, row){
    const k = `${col}-${row}`;
    for (const name in OVERRIDE_HEXES){
      const arr = OVERRIDE_HEXES[name];
      const idx = arr.indexOf(k);
      if (idx >= 0){
        arr.splice(idx, 1);
        saveHexes();
        applyHexes();
        return name;
      }
    }
    return null;
  }

  function clearHexes(name){
    if (!OVERRIDE_HEXES[name]) return false;
    delete OVERRIDE_HEXES[name];
    saveHexes();
    applyHexes();
    return true;
  }

  // Seed from gcc-landmarks.js — for each landmark with a `region` tag,
  // add its hex to that region's painted set. Creates regions as needed.
  function bootstrapFromLandmarks(){
    if (typeof GCCLandmarks === 'undefined' || !GCCLandmarks.all) return null;
    const byRegion = new Map();
    for (const [hexId, lm] of GCCLandmarks.all()){
      if (!lm.region) continue;
      if (!byRegion.has(lm.region)) byRegion.set(lm.region, []);
      byRegion.get(lm.region).push(hexId);
    }
    let regionsAdded = 0, hexesAdded = 0;
    for (const [regName, ids] of byRegion){
      if (!getByName(regName)){
        addRegion({ name: regName, kind: 'land' });
        regionsAdded++;
      }
      const before = (OVERRIDE_HEXES[regName] || []).length;
      addHexes(regName, ids);
      const after = (OVERRIDE_HEXES[regName] || []).length;
      hexesAdded += (after - before);
    }
    return { regions: regionsAdded, hexes: hexesAdded, total: byRegion.size };
  }

  // Trace-and-fill. vertices in [col,row] or Darlene-ID.
  function fillFromPolygon(vertices, regionName, gridBounds){
    if (!getByName(regionName)) return 0;
    const pts = [];
    for (const v of vertices || []){
      const hit = resolveVertex(v);
      if (!hit) return 0;
      pts.push(hexCenterU(hit.col, hit.row));
    }
    if (pts.length < 3) return 0;
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const p of pts){
      if (p.x < xMin) xMin = p.x; if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y; if (p.y > yMax) yMax = p.y;
    }
    const colMax = (gridBounds && gridBounds.colMax) || 146;
    const rowMax = (gridBounds && gridBounds.rowMax) || 96;
    const cMin = Math.max(0, Math.floor(xMin / 1.5) - 1);
    const cMax = Math.min(colMax - 1, Math.ceil(xMax / 1.5) + 1);
    const rMin = Math.max(0, Math.floor(yMin / SQRT3) - 1);
    const rMax = Math.min(rowMax - 1, Math.ceil(yMax / SQRT3) + 1);
    const claimed = [];
    for (let c = cMin; c <= cMax; c++){
      for (let r = rMin; r <= rMax; r++){
        const u = hexCenterU(c, r);
        if (pointInPoly(u.x, u.y, pts)) claimed.push(`${c}-${r}`);
      }
    }
    if (!claimed.length) return 0;
    addHexes(regionName, claimed);
    return claimed.length;
  }

  // ── Override I/O ──────────────────────────────────────────────────────────
  function exportOverrides(){
    return {
      defs:  JSON.parse(JSON.stringify(OVERRIDE_DEFS)),
      hexes: JSON.parse(JSON.stringify(OVERRIDE_HEXES)),
    };
  }

  function clearOverrides(){
    // Remove editor-added regions; clear all override hex sets.
    for (let i = GH_REGIONS.length - 1; i >= 0; i--){
      if (!BASE_REGION_NAMES.has(GH_REGIONS[i].name)){
        GH_REGIONS.splice(i, 1);
      } else {
        delete GH_REGIONS[i].hexes;
      }
    }
    OVERRIDE_DEFS = {};
    OVERRIDE_HEXES = {};
    saveDefs();
    saveHexes();
    POLY_CACHE.clear();
    HEX_CACHE.clear();
  }

  // Emit a paste-ready GH_REGIONS array.
  function exportMergedSource(){
    const lines = ['  const GH_REGIONS = ['];
    for (const r of GH_REGIONS){
      const parts = [];
      parts.push(`name:${JSON.stringify(r.name)}`);
      // Emit category before kind to match BASE entry shape; political
      // is the default and is omitted to keep entries terse.
      if (r.category && r.category !== 'political'){
        parts.push(`category:${JSON.stringify(r.category)}`);
      }
      if (r.subkind) parts.push(`subkind:${JSON.stringify(r.subkind)}`);
      parts.push(`kind:${JSON.stringify(r.kind || 'land')}`);
      parts.push(`color:${JSON.stringify(r.color || defaultColor(r.name))}`);
      if (r.capital) parts.push(`capital:${JSON.stringify(r.capital)}`);
      if (r.ruler)      parts.push(`ruler:${JSON.stringify(r.ruler)}`);
      if (r.capPop)     parts.push(`capPop:${JSON.stringify(r.capPop)}`);
      if (r.humanPop)   parts.push(`humanPop:${JSON.stringify(r.humanPop)}`);
      if (r.demihumans) parts.push(`demihumans:${JSON.stringify(r.demihumans)}`);
      if (r.humanoids)  parts.push(`humanoids:${JSON.stringify(r.humanoids)}`);
      if (r.resources)  parts.push(`resources:${JSON.stringify(r.resources)}`);
      if (r.notes)      parts.push(`notes:${JSON.stringify(r.notes)}`);
      if (r.vertices) parts.push(`vertices:${JSON.stringify(r.vertices)}`);
      if (r.hexes && r.hexes.length){
        const sorted = r.hexes.slice().sort((a,b) => {
          const [ac, ar] = a.split('-').map(Number);
          const [bc, br] = b.split('-').map(Number);
          return ac !== bc ? ac - bc : ar - br;
        });
        parts.push(`hexes:${JSON.stringify(sorted)}`);
      }
      if (r.anchors)  parts.push(`anchors:${JSON.stringify(r.anchors)}`);
      lines.push(`    { ${parts.join(', ')} },`);
    }
    lines.push('  ];');
    return lines.join('\n');
  }

  function rebuild(){ POLY_CACHE.clear(); HEX_CACHE.clear(); }

  function setVertices(name, vertices){
    const idx = GH_REGIONS.findIndex(r => r.name === name);
    if (idx < 0) return false;
    GH_REGIONS[idx].vertices = vertices;
    POLY_CACHE.delete(idx);
    return true;
  }

  function stats(){
    let total = 0;
    const counts = {};
    for (const name in OVERRIDE_HEXES){
      const n = OVERRIDE_HEXES[name].length;
      counts[name] = n;
      total += n;
    }
    return { total, counts, regions: GH_REGIONS.length };
  }

  function qa(){
    if (typeof darleneToInternal !== 'function'){
      console.warn('GCCRegions.qa: darleneToInternal not available yet');
      return null;
    }
    console.log('── GCCRegions QA ──');
    let pass = 0, fail = 0;
    for (const r of GH_REGIONS){
      if (!r.anchors) continue;
      for (const id of r.anchors){
        const hit = darleneToInternal(id);
        if (!hit){ fail++; console.log(`✗ ${r.name}: bad anchor ${id}`); continue; }
        const got = getRegion(hit.col, hit.row);
        if (got === r.name){ pass++; }
        else { fail++; console.log(`✗ ${r.name}: anchor ${id} (${hit.col},${hit.row}) → ${got}`); }
      }
    }
    console.log(`${pass}/${pass+fail} anchor landmarks classified into their declared region`);
    return { pass, fail };
  }

  // Convenience accessor returning just the boxed-set canon metadata
  // for a region (or null if the region doesn't exist). Skips the
  // engine-internal fields (color, hexes, vertices, etc.) so consumers
  // get a pure data view.
  function getDetails(name){
    const r = getByName(name);
    if (!r) return null;
    const out = {};
    const FIELDS = ['kind','category','subkind','capital','ruler',
                    'capPop','humanPop','demihumans','humanoids',
                    'resources','notes','anchors','popTier'];
    for (const f of FIELDS){
      if (r[f] !== undefined) out[f] = r[f];
    }
    return out;
  }

  window.GCCRegions = {
    data: GH_REGIONS,
    getRegion,
    getRegionInfo,
    getMembership,
    getHexTagged,
    getDetails,
    all,
    names,
    getByName,
    addRegion,
    removeRegion,
    setRegionColor,
    setRegionMeta,
    isBase,
    setHexes,
    addHexes,
    removeHexes,
    erasePaintAt,
    clearHexes,
    bootstrapFromLandmarks,
    fillFromPolygon,
    setVertices,
    exportOverrides,
    clearOverrides,
    exportMergedSource,
    rebuild,
    stats,
    qa,
    colorToRgbTriplet,
    defaultColor,
  };
})();
