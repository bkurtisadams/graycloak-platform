// gcc-landmarks.js v0.7.3 — 2026-04-23
// World of Greyhawk landmarks, keyed by Darlene hex ID.
// Layered store: BASE file data + PENDING (no hex yet) + OVERRIDES (localStorage).
//
// v0.7.3: casing-preservation fix. Stale lowercase override keys were
//   shadowing BASE entries the user had capitalized in the file —
//   mergedView processes overrides after BASE and the spread wins, so
//   "forgotten city" override clobbered "Forgotten City" BASE at the
//   same hex ID and Export round-tripped lowercase back into the file.
//   Fix: (1) canonicalizeName() helper that looks up BASE/PENDING case-
//   insensitively and returns the canonical casing; (2) setOverride
//   uses canonicalizeName for the override key, so file casing wins
//   on every re-save; (3) migrateCaseMismatches() one-shot recases
//   existing override keys and `region` values to match BASE on load.
//   Also fixed lowercase names in BASE: ekbir→Ekbir, forgotten city→
//   Forgotten City, rookroost→Rookroost, yecha→Yecha. Populated the
//   City of Greyhawk with full structured LGG data.
// v0.7.2: added LGG header fields — rulerName, rulerTitle, popTotal,
//   demihumans, humanoids, resources. pop (existing) is now editable
//   through overrides too. All plumbed through setOverride and
//   exportMergedSource. Supports the henchmen-recruitment use case
//   (DMG tables reference population + racial density).
// v0.7.1: added `desc` field — long-form landmark description surfaced in
//   the map's landmark info panel (Layer 1 of the landmark-details work).
//   Editable via the hex editor's Landmarks pane. Plumbed through
//   setOverride and exportMergedSource.
// v0.7.0: `isPort` (broad "water-accessible") renamed to `onWater`; the
//   name `isPort` is now reserved for a narrower "trading seaport"
//   designation the voyage simulator will own later. Legacy override
//   migration copies any stored `isPort:true` to `onWater:true` and
//   drops the old field. Expanded BASE to 108 canonical landmarks.
// v0.6.3: added isPort boolean attribute (composes with any kind — a
//   landmark can be a city AND a port). Tagged 11 canonical ports on
//   Nyr Dyv / Azure Sea / Solnor coasts. setOverride and
//   exportMergedSource persist isPort through overrides.
// v0.6.2: added 13 canonical landmarks — Highport, Eastfair, Highfolk,
//   Critwall, Forgotten City, Gryrax, Rookroost, Hochoch, Enstad, Jurnre
//   region, Kro Terlep, Admundfort, Zelradton. Saltmarsh dropped from
//   PENDING (not on Darlene map — U1-U3 publication era, non-canon here).
// v0.6.1: canonical ID sweep. All 17 pre-existing BASE entries re-pinned to
//   canonical Darlene hex IDs against the image-align transform. Four former
//   pendings placed (Mitrik, Rel Mord, Irongate, Maure Castle); two new
//   entries (Ekbir, Yecha) added. Nulb and Saltmarsh remain pending.
// v0.6.0: single pixel field per override (symbolPixel). hexCenterPixel
//   retired along with the landmark-based affine/TPS solvers; image-align
//   transform replaces that workflow.
// v0.5.0: two pixel fields (symbolPixel, hexCenterPixel).
// v0.4.0: setOverride accepted optional clickPixel for affine calibration.
//
// Format: "Letter[Rep]-Diag": { name, kind, ... }
//   kind:       "city" | "town" | "castle" | "ruin" | "village" | "feature" | "landmark"
//   size:       size qualifier — "metropolis" | "city" | "small-city" | etc.
//   pop:        primary population (number, matches LGG "Population")
//   popTotal:   total population including surrounding area (number, LGG "total")
//   rulerName:  ruler's given name (e.g. "Nerof Gasgol")
//   rulerTitle: ruler's title/honorifics (e.g. "Lord Mayor")
//   demihumans: density qualifier — "None" | "Few" | "Some" | "Many" | freeform
//   humanoids:  density qualifier — same vocabulary as demihumans
//   resources:  comma-separated string (e.g. "silver, gold, gems (I-IV)")
//   notes:      short freeform text (shown on map hover via id)
//   desc:       long-form description — player-visible, shown in landmark info panel
//   onWater:    true (optional) — landmark is on or adjacent to water (river,
//               lake, coast). Renders a wave ≈ overlay on the map. Broad tag.
//   isPort:     true (optional, reserved) — landmark is a true trading seaport
//               for the voyage simulator. Renders an anchor ⚓ overlay. Narrow
//               subset of onWater cities; not user-exposed yet.

(function(){
  const LS_KEY = 'gcc-landmark-overrides-v1';

  // ── BASE: verified via the landmark editor against 27MB Darlene scan ──────
  const GH_LANDMARKS = {
    "A4-101": { name: "Highport",           kind: "city", onWater: true },
    "A4-105": { name: "Stoneheim",          kind: "city" },
    "A5-133": { name: "Hokar",              kind: "city" },
    "B2-47":  { name: "Johnsport",          kind: "city", onWater: true },
    "B2-56":  { name: "Eastfair",           kind: "city" },
    "B2-99":  { name: "Ducchan",            kind: "city", onWater: true },
    "B3-38":  { name: "Bastro",             kind: "city", onWater: true },
    "B3-75":  { name: "Rel Mord",           kind: "city", region: "Kingdom of Nyrond", onWater: true },
    "B5-90":  { name: "Highfolk",           kind: "city" },
    "B5-95":  { name: "Mitrik",             kind: "city", region: "Archclericy of Veluna", onWater: true },
    "C-17":   { name: "Glot",               kind: "city", onWater: true },
    "C2-27":  { name: "Krakenheim",         kind: "city", onWater: true },
    "C3-42":  { name: "Vlekstaad",          kind: "city", onWater: true },
    "C4-78":  { name: "Critwall",           kind: "city", region: "Shield Lands", onWater: true },
    "C4-91":  { name: "Hardby",             kind: "town", size: "small-city", pop: 7500, region: "Domain of Greyhawk", onWater: true },
    "C5-77":  { name: "Traft",              kind: "city", onWater: true },
    "D-55":   { name: "Oakenhart",          kind: "city", onWater: true },
    "D-79":   { name: "Lo Reltarma",        kind: "city" },
    "D2-78":  { name: "Torrich",            kind: "city" },
    "D2-93":  { name: "Dullstrand",         kind: "city", onWater: true },
    "D3-63":  { name: "Midmeadow",          kind: "city" },
    "D4-86":  { name: "City of Greyhawk",   kind: "city", size: "metropolis", pop: 58000, popTotal: 75000, rulerName: "Nerof Gasgol", rulerTitle: "His Solemn Authority, the Lord Mayor of Greyhawk", demihumans: "Some", humanoids: "Some", resources: "silver, electrum, gold, platinum, gems (I-IV)", region: "Domain of Greyhawk", onWater: true, desc: "Greyhawk was established as a trading post on the Selintan River during the period of early migrations. As it flourished, a local warlord built a small keep on the hills above the village called Greyhawk which had sprung up around the trading center, extracting taxes from the trade and occasionally raiding caravans (particularly those coming with silver ingots found in the burial mounds of the Cairn Hills). This petty noble soon became quite rich and powerful and assumed the title of Landgraf of Selintan. Greyhawk and the power of the new Landgraf grew rapidly thereafter, and his son and heir, Ganz, was wed to the daughter of the Gynarch (Despotrix) of Hardby, a sorceress of no small repute. Their descendants ruled a growing domain which rose to considerable heights c. 375 CY under the rule of Zagig Yragerne (the so-called Mad Archmage). It was Zagig who built the sprawling Castle Greyhawk (now a ruin) and poured funds into the City of Greyhawk in order to make it into the \"Gem of the Flanaess.\" His reign was bizarre in many other ways, and it came as no surprise when it was reported that Zagig Yragerne had mysteriously vanished after years of rule when no change or aging could be detected. The castle was abandoned, supposedly due to a terrible curse upon the place, but the City proper continued to flourish. In 498 CY it was proclaimed a free and independent city, ruling a territory from Hardby on the Woolly bay to the Nyr Dyv, between the eastern folds of the Cairn Hills and the Gnarley forest, including much of what is now the northern section of the Wild Coast region. These holdings have been lost over the intervening decades, and a decline in trade seemed certain to turn the place into a backwater, save for recent events. Several years ago a series of treasure troves was discovered in or near Greyhawk Castle. Immense wealth began flowing into the city, and artisans and mercenaries began flocking to Greyhawk due to this boom. Local lords used this influx of hard money to revitalize the city, and it again rules a considerable portion of the area, claiming all of the land from Nyr Dyv to the Neen River where it joins the Selintan, including the mines in the Cairn Hills. The Despotrix of Hardby now pays tribute to Greyhawk to avoid being absorbed in the growing city state once again.\n\nGreyhawk is ruled by its Lord Mayor; this individual is chosen by the Directing Oligarchy. The latter body is composed of the Captain-General of the Watch, the Constable, the Guildmaster of Thieves, the Guildmaster of Assassins, and various representatives of the Society of Magi, the Merchants and Traders Union, Artisans League, and Clerical leaders. The total number of the Directors ranges from 12 to 18." },
    "D5-109": { name: "Shiboleth",          kind: "city" },
    "D5-123": { name: "Longspear",          kind: "city" },
    "E3-50":  { name: "Nevond Nevnend",     kind: "city", onWater: true },
    "E3-98":  { name: "Irongate",           kind: "city", region: "Iron League", onWater: true },
    "E4-73":  { name: "Molag",              kind: "city", region: "Horned Society", onWater: true },
    "E4-82":  { name: "Willip",             kind: "city", region: "Kingdom of Furyondy", onWater: true },
    "E5-82":  { name: "Schwartzenbruin",    kind: "city", onWater: true },
    "E5-120": { name: "Cryllor",            kind: "city", onWater: true },
    "F2-62":  { name: "Edgefield",          kind: "city" },
    "F2-75":  { name: "Jalpa",              kind: "city", onWater: true },
    "F2-83":  { name: "Nulbish",            kind: "city", onWater: true },
    "F4-94":  { name: "Safeton",            kind: "town", region: "Wild Coast", onWater: true },
    "F4-101": { name: "Elredd",             kind: "city", onWater: true },
    "F5-105": { name: "Hookhill",           kind: "city" },
    "G-22":   { name: "Soill",              kind: "city", onWater: true },
    "G-54":   { name: "Asperdi",            kind: "city", onWater: true },
    "G6-114": { name: "Ullakand",           kind: "city" },
    "H2-47":  { name: "Ratikhill",          kind: "city" },
    "H4-89":  { name: "Dyvers",             kind: "city", size: "city", pop: 42000, region: "Wild Coast", onWater: true },
    "H4-99":  { name: "Fax",                kind: "city", onWater: true },
    "H6-95":  { name: "Ekbir",              kind: "city" },
    "I2-44":  { name: "Marner",             kind: "city", onWater: true },
    "I2-51":  { name: "Spinecastle",        kind: "city" },
    "I3-64":  { name: "Stoink",             kind: "city", onWater: true },
    "I3-83":  { name: "Beetu",              kind: "city" },
    "I4-68":  { name: "Dorakaa",            kind: "city", region: "Empire of Iuz", onWater: true },
    "I4-94":  { name: "Narwell",            kind: "town", region: "Wild Coast" },
    "I4-102": { name: "Badwall",            kind: "city" },
    "I5-100": { name: "Thornward",          kind: "city", onWater: true },
    "J2-37":  { name: "Djekul",             kind: "city" },
    "J3-74":  { name: "Trigol",             kind: "city", onWater: true },
    "J3-79":  { name: "Woodwych",           kind: "city" },
    "J4-76":  { name: "Grabford",           kind: "city", onWater: true },
    "J5-120": { name: "Flen",               kind: "city", onWater: true },
    "J6-163": { name: "Forgotten City",     kind: "city" },
    "K-54":   { name: "Winetha",            kind: "city", onWater: true },
    "K2-61":  { name: "Knurl",              kind: "city", onWater: true },
    "K2-107": { name: "Ekul",               kind: "city", onWater: true },
    "K3-59":  { name: "Redpsan",            kind: "city", onWater: true },
    "K4-111": { name: "Havenhill",          kind: "city" },
    "K6-124": { name: "Kester",             kind: "city" },
    "L2-90":  { name: "Pitchfield",         kind: "city" },
    "L4-113": { name: "Gryrax",             kind: "city", onWater: true },
    "L6-101": { name: "Zeif",               kind: "city", onWater: true },
    "M4-95":  { name: "Nulb",               kind: "village" },
    "M5-93":  { name: "Molvar",             kind: "city" },
    "M5-114": { name: "Orlane",             kind: "city" },
    "M5-130": { name: "Loftwick",           kind: "city" },
    "N-11":   { name: "Jotsplat",           kind: "city", onWater: true },
    "N-18":   { name: "Knudje",             kind: "city" },
    "N-52":   { name: "Rinloru",            kind: "city" },
    "N-59":   { name: "Roland",             kind: "city" },
    "N2-68":  { name: "Innspa",             kind: "city", onWater: true },
    "N3-58":  { name: "Rookroost",          kind: "city" },
    "N3-100": { name: "Scant",              kind: "city", onWater: true },
    "N4-96":  { name: "Hommlet",            kind: "village" },
    "N4-104": { name: "Courwood",           kind: "city", onWater: true },
    "N5-82":  { name: "Exag",               kind: "city" },
    "N5-114": { name: "Hochoch",            kind: "city", region: "Gran March", onWater: true },
    "O-48":   { name: "Atirr",              kind: "city", onWater: true },
    "O3-65":  { name: "Riftcrag",           kind: "city" },
    "O5-123": { name: "Istivin",            kind: "city", onWater: true },
    "O6-108": { name: "Antalotol",          kind: "city" },
    "P-70":   { name: "Rel Astra",          kind: "city", region: "Great Kingdom", onWater: true },
    "P3-82":  { name: "Nellix",             kind: "city", onWater: true },
    "P4-89":  { name: "Littleberg",         kind: "city", region: "Kingdom of Furyondy", onWater: true },
    "P4-95":  { name: "Verbobonc",          kind: "city", region: "Viscounty of Verbobonc", onWater: true },
    "P4-100": { name: "Enstad",             kind: "city", region: "Celene", onWater: true },
    "Q2-56":  { name: "Ogburg",             kind: "city" },
    "Q3-73":  { name: "Radigast City",      kind: "city", region: "County of Urnst", onWater: true },
    "Q4-55":  { name: "Dandredun",          kind: "city" },
    "Q4-81":  { name: "Crockport",          kind: "city", onWater: true },
    "Q4-83":  { name: "Chendl",             kind: "city", region: "Kingdom of Furyondy", onWater: true },
    "Q4-117": { name: "Gradsul",            kind: "city", region: "Kingdom of Keoland", onWater: true },
    "R2-33":  { name: "Kelten",             kind: "city" },
    "R2-88":  { name: "Hexpools",           kind: "city", onWater: true },
    "R3-80":  { name: "Leukish",            kind: "city", region: "Duchy of Urnst", onWater: true },
    "R4-112": { name: "Jurnre",             kind: "city", region: "County of Ulek", onWater: true },
    "R5-120": { name: "Gorna",              kind: "city" },
    "S-77":   { name: "Mentrey",            kind: "city" },
    "S2-79":  { name: "Chathold",           kind: "city", onWater: true },
    "S4-107": { name: "Tringlee",           kind: "city" },
    "S5-98":  { name: "Lopolla",            kind: "city", onWater: true },
    "T4-125": { name: "Monmurg",            kind: "city", onWater: true },
    "U-90":   { name: "Sulward",            kind: "city", onWater: true },
    "U2-85":  { name: "Prymp",              kind: "city", onWater: true },
    "U3-103": { name: "Blue",               kind: "city", onWater: true },
    "U4-64":  { name: "Eru-Tovar",          kind: "city", onWater: true },
    "V-48":   { name: "Kaport Bay",         kind: "city", onWater: true },
    "V-59":   { name: "Delarie",            kind: "city", onWater: true },
    "V2-99":  { name: "Naerie",             kind: "city", onWater: true },
    "V2-112": { name: "Kro Terlep",         kind: "city", onWater: true },
    "V4-130": { name: "Port Toli",          kind: "city", onWater: true },
    "W2-40":  { name: "Purmill",            kind: "city", onWater: true },
    "X2-69":  { name: "Womtham",            kind: "city", onWater: true },
    "X3-77":  { name: "Admundfort",         kind: "city", region: "Shield Lands", onWater: true },
    "X3-86":  { name: "Maure Castle",       kind: "castle", notes: "Maure family ruin" },
    "Y-68":   { name: "Rauxes",             kind: "city", region: "Great Kingdom", onWater: true },
    "Y2-53":  { name: "Wintershiven",       kind: "city", onWater: true },
    "Y2-77":  { name: "Mithat",             kind: "city", onWater: true },
    "Y2-92":  { name: "Zelradton",          kind: "city" },
    "Y4-96":  { name: "Veluna City",        kind: "city", region: "Veluna" },
    "Y4-107": { name: "Waybury",            kind: "city" },
    "Y4-113": { name: "Niole Dra",          kind: "city", size: "city", region: "Kingdom of Keoland", onWater: true },
    "Y4-128": { name: "Westkeep",           kind: "city" },
    "Y5-79":  { name: "Yecha",              kind: "city" },
    "Z-82":   { name: "Pontylver",          kind: "city", onWater: true },
    "Z2-45":  { name: "Callbut",            kind: "city" },
    "Z2-80":  { name: "Oldred",             kind: "city", onWater: true },
    "Z5-98":  { name: "Sefmur",             kind: "city", onWater: true },
    "Z5-100": { name: "Ceshra",             kind: "city", onWater: true },
  };

  // ── PENDING: known cities still waiting for hex ID assignment ─────────────
  // Place via the Hex Editor, Landmarks tab (gcc-hex-edit.js).
  const GH_PENDING = [
    { name: "Nulb", kind: "village" },
  ];

  // ── OVERRIDES: user placements via editor, persisted to localStorage ──────
  let OVERRIDES = {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) OVERRIDES = JSON.parse(raw) || {};
  } catch(e){ OVERRIDES = {}; }

  function saveOverrides(){
    try { localStorage.setItem(LS_KEY, JSON.stringify(OVERRIDES)); } catch(e){}
  }

  function mergedView(){
    const out = {};
    const overriddenNames = new Set(Object.keys(OVERRIDES));
    for (const [id, e] of Object.entries(GH_LANDMARKS)){
      if (overriddenNames.has(e.name)) continue;
      out[id] = e;
    }
    for (const name of overriddenNames){
      const ov = OVERRIDES[name];
      if (!ov || !ov.id) continue;
      const basePair = Object.entries(GH_LANDMARKS).find(([,v]) => v.name === name);
      const pendingEntry = GH_PENDING.find(p => p.name === name);
      const baseEntry = basePair ? basePair[1] : (pendingEntry || {});
      out[ov.id] = { ...baseEntry, ...ov, _override: true };
    }
    return out;
  }

  function getLandmarkById(id){ return mergedView()[id] || null; }
  function getLandmarkByHex(col, row){
    if(typeof hexIdStr !== 'function') return null;
    return mergedView()[hexIdStr(col, row)] || null;
  }
  function allLandmarks(){ return Object.entries(mergedView()); }
  function landmarkHex(id){
    if(typeof darleneToInternal !== 'function') return null;
    return darleneToInternal(id);
  }

  function allNames(){
    const s = new Set();
    for (const e of Object.values(GH_LANDMARKS)) s.add(e.name);
    for (const p of GH_PENDING) s.add(p.name);
    for (const n of Object.keys(OVERRIDES)) s.add(n);
    return [...s].sort();
  }

  function getByName(name){
    const ov = OVERRIDES[name];
    const basePair = Object.entries(GH_LANDMARKS).find(([,v]) => v.name === name);
    const base = basePair ? { id: basePair[0], ...basePair[1] } : null;
    const pending = GH_PENDING.find(p => p.name === name) || null;
    if (!ov && !base && !pending) return null;
    return { ...(pending||{}), ...(base||{}), ...(ov||{}) };
  }

  // Canonicalize a name against BASE + PENDING: if a case-insensitive match
  // exists, return the canonical (BASE/PENDING) casing; otherwise return the
  // input unchanged. Protects against stale lowercase override keys
  // shadowing BASE entries the user has capitalized in the file.
  function canonicalizeName(name){
    if (typeof name !== 'string') return name;
    const lower = name.toLowerCase();
    for (const [, v] of Object.entries(GH_LANDMARKS)){
      if (v.name.toLowerCase() === lower) return v.name;
    }
    for (const p of GH_PENDING){
      if (p.name.toLowerCase() === lower) return p.name;
    }
    return name;
  }

  function setOverride(entry){
    if (!entry || !entry.name || !entry.id) return false;
    // Use BASE's casing as the override key whenever one exists. Without
    // this, an override keyed "forgotten city" will shadow a BASE entry
    // named "Forgotten City" at the same hex ID (mergedView processes
    // overrides after BASE and the spread wins), erasing the user's
    // manual capitalization fix on every re-save.
    const canonName = canonicalizeName(entry.name);
    const merged = {
      name: canonName,
      id: entry.id,
      kind: entry.kind || (getByName(canonName) || {}).kind || 'feature',
      _override: true,
    };
    const existing = getByName(canonName) || {};
    if (entry.region || existing.region) merged.region = entry.region || existing.region;
    if (entry.notes  || existing.notes)  merged.notes  = entry.notes  || existing.notes;
    // desc: long-form landmark description surfaced in the info panel
    // on the map. Explicit empty string clears an existing desc; undefined
    // inherits. (Notes/region use || so '' falls through — desc is
    // new data, no legacy to preserve.)
    if (typeof entry.desc === 'string') merged.desc = entry.desc;
    else if (existing.desc) merged.desc = existing.desc;
    // LGG header fields (v0.7.2). All use the same explicit-empty-clears
    // semantics as desc: caller passes '' to wipe, undefined to inherit.
    // rulerName / rulerTitle split so long honorifics don't crowd the name
    // ("His Solemn Authority, the Lord Mayor of Greyhawk" + "Nerof Gasgol").
    ['rulerName','rulerTitle','demihumans','humanoids','resources'].forEach(k => {
      if (typeof entry[k] === 'string') merged[k] = entry[k];
      else if (existing[k]) merged[k] = existing[k];
    });
    // Numeric pop fields: accept number or numeric string (with commas/
    // non-digits stripped, since <input type=number> and copy-paste from
    // LGG both happen). 0 or unparseable → cleared; undefined → inherit.
    ['pop','popTotal'].forEach(k => {
      if (entry[k] !== undefined){
        const n = parseInt(String(entry[k]).replace(/[^0-9]/g,''), 10);
        if (!isNaN(n) && n > 0) merged[k] = n;
        // else: explicit clear — leave merged[k] unset
      } else if (existing[k]){
        merged[k] = existing[k];
      }
    });
    // size: also inherit through overrides now that LGG-editing is in play
    // (metropolis / city / small-city etc). Inherit-only; no editor toggle.
    if (existing.size) merged.size = existing.size;
    // onWater (broad water-adjacent) and isPort (narrow trading seaport —
    // reserved for voyage sim). Both booleans use three-state logic: an
    // explicit boolean in `entry` wins, otherwise inherit from base.
    if (typeof entry.onWater === 'boolean') merged.onWater = entry.onWater;
    else if (typeof existing.onWater === 'boolean') merged.onWater = existing.onWater;
    if (typeof entry.isPort === 'boolean') merged.isPort = entry.isPort;
    else if (typeof existing.isPort === 'boolean') merged.isPort = existing.isPort;

    // v0.6.0: single pixel field. symbolPixel — where the city art is drawn
    // on the Darlene scan. Drives marker rendering in buildLandmarkOverlay.
    // The old hexCenterPixel was used by the landmark-based affine/TPS
    // alignment, removed 2026-04-19 in favour of the image-align transform.
    const prev = OVERRIDES[canonName] || {};
    const sym = entry.symbolPixel || prev.symbolPixel;
    if (sym && typeof sym.mx === 'number' && typeof sym.my === 'number'){
      merged.symbolPixel = { mx: +sym.mx, my: +sym.my };
    }
    OVERRIDES[canonName] = merged;
    saveOverrides();
    return true;
  }

  // One-shot cleanup: strip legacy clickPixel (pre-v0.5) and hexCenterPixel
  // (v0.5, used by removed alignment solvers) from stored overrides. Both
  // are superseded by symbolPixel + the image-align transform.
  function migrateLegacyOverrides(){
    let migrated = 0;
    for (const name in OVERRIDES){
      const o = OVERRIDES[name];
      if (!o || typeof o !== 'object') continue;
      if (o.clickPixel){
        if (!o.symbolPixel && typeof o.clickPixel.mx === 'number'){
          o.symbolPixel = { mx: +o.clickPixel.mx, my: +o.clickPixel.my };
        }
        delete o.clickPixel;
        migrated++;
      }
      if (o.hexCenterPixel){
        delete o.hexCenterPixel;
        migrated++;
      }
      // v0.7.0 rename: the earlier `isPort` override meant "water-adjacent"
      // (Kurt's broad usage). Move it to `onWater` so `isPort` can be
      // reclaimed for the narrow trading-seaport tag the voyage sim owns.
      if (o.isPort === true && o.onWater === undefined){
        o.onWater = true;
        delete o.isPort;
        migrated++;
      }
    }
    if (migrated > 0){
      saveOverrides();
      console.log('[gcc-landmarks] stripped', migrated, 'legacy pixel fields');
    }
  }
  migrateLegacyOverrides();

  // One-shot cleanup (v0.7.3): recase stale override keys and region
  // values against BASE canonical casing. When the user fixes a name or
  // region in gcc-landmarks.js manually (e.g. "forgotten city" →
  // "Forgotten City", "country of ulek" → "County of Ulek"), any
  // pre-existing override keyed or valued with the old lowercase will
  // shadow that fix via mergedView. Without this migration, Export
  // re-emits lowercase and round-trips clobber the user's file edits.
  // Runs on every load; no-op if nothing needs recasing.
  function migrateCaseMismatches(){
    let migrated = 0;
    // Canonical region lookup: union of regions across all BASE entries.
    const canonicalRegions = new Map();
    for (const [, v] of Object.entries(GH_LANDMARKS)){
      if (v.region) canonicalRegions.set(v.region.toLowerCase(), v.region);
    }
    // Process each override: recase key + name field, then recase region.
    const oldKeys = Object.keys(OVERRIDES);
    for (const oldKey of oldKeys){
      const o = OVERRIDES[oldKey];
      if (!o || typeof o !== 'object') continue;
      // Name / key recase
      const canonName = canonicalizeName(oldKey);
      if (canonName !== oldKey){
        if (OVERRIDES[canonName]){
          // Canonical-cased override already exists; drop the stale one.
          delete OVERRIDES[oldKey];
        } else {
          o.name = canonName;
          OVERRIDES[canonName] = o;
          delete OVERRIDES[oldKey];
        }
        migrated++;
      }
      // Region recase — works on whatever the override object is now,
      // after potential rekey above.
      const target = OVERRIDES[canonName] || OVERRIDES[oldKey];
      if (target && typeof target.region === 'string'){
        const canonReg = canonicalRegions.get(target.region.toLowerCase());
        if (canonReg && canonReg !== target.region){
          target.region = canonReg;
          migrated++;
        }
      }
    }
    if (migrated > 0){
      saveOverrides();
      console.log('[gcc-landmarks] recased', migrated, 'override field(s) to match BASE');
    }
  }
  migrateCaseMismatches();

  function removeOverride(name){
    if (OVERRIDES[name]){ delete OVERRIDES[name]; saveOverrides(); return true; }
    return false;
  }
  function clearOverrides(){ OVERRIDES = {}; saveOverrides(); }
  function exportOverrides(){ return JSON.parse(JSON.stringify(OVERRIDES)); }

  function exportMergedSource(){
    const merged = mergedView();
    const lines = ['  const GH_LANDMARKS = {'];
    const entries = Object.entries(merged).sort((a,b)=>a[0].localeCompare(b[0]));
    for (const [id, e] of entries){
      const parts = [`name: ${JSON.stringify(e.name)}`, `kind: ${JSON.stringify(e.kind)}`];
      if (e.size)       parts.push(`size: ${JSON.stringify(e.size)}`);
      if (e.pop)        parts.push(`pop: ${e.pop}`);
      if (e.popTotal)   parts.push(`popTotal: ${e.popTotal}`);
      if (e.rulerName)  parts.push(`rulerName: ${JSON.stringify(e.rulerName)}`);
      if (e.rulerTitle) parts.push(`rulerTitle: ${JSON.stringify(e.rulerTitle)}`);
      if (e.demihumans) parts.push(`demihumans: ${JSON.stringify(e.demihumans)}`);
      if (e.humanoids)  parts.push(`humanoids: ${JSON.stringify(e.humanoids)}`);
      if (e.resources)  parts.push(`resources: ${JSON.stringify(e.resources)}`);
      if (e.region)     parts.push(`region: ${JSON.stringify(e.region)}`);
      if (e.notes)      parts.push(`notes: ${JSON.stringify(e.notes)}`);
      if (e.desc)       parts.push(`desc: ${JSON.stringify(e.desc)}`);
      if (e.onWater)    parts.push(`onWater: true`);
      if (e.isPort)     parts.push(`isPort: true`);
      lines.push(`    ${JSON.stringify(id).padEnd(10)}: { ${parts.join(', ')} },`);
    }
    lines.push('  };');
    return lines.join('\n');
  }

  function unplacedPending(){
    return GH_PENDING.filter(p => !OVERRIDES[p.name]);
  }

  window.GCCLandmarks = {
    data: GH_LANDMARKS,
    pending: GH_PENDING,
    getById: getLandmarkById,
    getByHex: getLandmarkByHex,
    getByName,
    all: allLandmarks,
    allNames,
    hex: landmarkHex,
    setOverride,
    removeOverride,
    clearOverrides,
    exportOverrides,
    exportMergedSource,
    unplacedPending,
  };
})();
