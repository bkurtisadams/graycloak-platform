// gcc-voyage.js v0.8.0 — 2026-07-09
// v0.8.0: weather continuity + click-to-place ports.
//   - Daily weather now passes the previous day into GCCWeather
//     (ctx.previous), enabling Dragon #68 multi-day events: a gale rolled
//     for 1d3 days actually runs 1d3 days, monsoons run 1d6+6, and
//     expired events persist on their chanceContinue percentage
//     (intensifying 10% / easing 10% of continued days).
//   - Ports without a landmark can be placed by clicking the Darlene map:
//     Setup → Port setup → Place, then click a hex. Placed hexes live in
//     localStorage (gcc.voyage.portHexes.v1); a real landmark added later
//     always takes precedence. Placing a port immediately re-pathfinds any
//     planned legs that touch it so the water route shows on the map.
// v0.7.0: dialog + sim fixes.
//   - Fix voyage overlay vanishing after hex edits: buildHexGrid() wipes
//     #hex-svg (svg.innerHTML=''), orphaning #voyage-overlay. ensureOverlay
//     now checks isConnected, and rebuildGrid is patched to re-render
//     ship/route/trail after a grid rebuild.
//   - Dialog: default top now clears the fixed gcc-bar + topbar chrome
//     (was top:64px, under the toolbar). Panel width/height persist across
//     refresh (gh-voyage-size). Setup pane is two-column via container
//     queries; position header card also stacks by panel width, not viewport.
//   - Start Voyage now confirms before replacing an active voyage.
//   - Oared ships (dailyOar on templates) row when becalmed instead of
//     sitting dead (OD&D/1e: sail impossible under 5 mph wind; oars fine).
//   - Encounters: RAW-aligned daily odds (DMG: 1-in-20 per check; 2 checks
//     coastal/lake, 1 deep water, 3 fresh water), explicit hostile flags
//     (keyword sniffing mis-tagged 'Bandit raft', 'Giant shark'), an
//     evasion roll per the Seafaring evasion table before hostile damage,
//     and encounters now also occur while becalmed.
//   - Storm drift is applied: failed Ship Sailing in gale/storm/hurricane
//     now costs voyageEffects.stormDriftMiles of leg progress (was
//     informational text only).
//   - Repair rate 50 → 100 gp/hull (Seafaring: trained port repair
//     100 gp/day/point; 50 gp is the self-repair materials rate).
// v0.6.1: widen/resizable voyage dialog and add a persistent ship
//   position header with map-centering controls.
// v0.6.0: persist active voyage state, add canonical voyage location,
//   and improve itinerary planning with route helper text + auto-plan.
// v0.5.0: add voyage settlement/pending finance actions for explicit
//   repair and arrival accounting via gcc-voyage-finance.js.
// v0.4.0: consume GCCWeather for AD&D / World of Greyhawk daily voyage
//   weather: Greyhawk months, wind force, precipitation, fog, gale/storm
//   hazards, navigation penalties, and log details.
// v0.3.1: demote missing optional ports to diagnostics and add
//   a high-contrast route halo so planned voyages remain visible over water.
// v0.3.0: river current direction modifier per DMG p.49.
// On river legs (leg.waterType === 'river'), each day's navMiles is
// adjusted by C×8 in the direction of travel:
//   downstream → +C×8 mi/day (sometimes ×2 or ×4 if hazards)
//   upstream   → -C×8 mi/day
//   crossing   → no change
// where C is the river's current converted to mph via
// GCCPaths.currentMphFromTier (1=0.5, 2=1, 3=2 mph).
//
// Implementation reads the day's river edge from leg.path: the
// segment from the current path index to index+1. If neither end of
// that segment has a river chain that points the right way (e.g. ship
// has overshot or rounded out), no modifier is applied. Per-day
// adjustment is also surfaced as an event so the player sees why
// they're moving fast/slow.
//
// Per docs/rules/movement.md: this only fires on water travel.
// Land parties walking alongside a river get nothing — their speed
// is purely terrain-driven (with road bonus where applicable).
//
// v0.2.0 — 2026-04-22
// Voyage Simulator plugin for greyhawk-map.html. Replaces the standalone
// voyage-map.html (Leaflet-based, separate hex grid, no GCC integration).
// Ports reference GCCLandmarks by name — hex positions resolve at runtime
// through darleneToInternal, so the ship rides the same canonical SVG grid
// as the rest of the map and inherits touch/drag/zoom/alignment for free.
//
// Requires globals from greyhawk-map.html:
//   hexCenterDisplay, mapToStage, darleneToInternal, showToast, makeDraggable,
//   GRID_COLS, GRID_ROWS
// Requires gcc-landmarks.js:
//   GCCLandmarks.getByName(name) → { id, name, kind, ... }
// Requires gcc-terrain.js:
//   GCCTerrain.get(col, row) → terrain key or null (used for water routing)
//
// v0.2.0: ship now follows water. Each route leg is pathfound through water
//   hexes (A* on flat-top odd-q offset grid) at add-time and again at
//   startVoyage (to pick up hexes painted since). Ship interpolates along
//   the hex sequence rather than port-to-port straight line. Unpathable
//   legs still render as a dashed red fallback line with a warning toast.
// v0.1.0: initial port — setup/voyage/log tabs, per-leg route planning,
//   per-day weather/encounters/navigation/hull damage, ship marker + route
//   polyline overlays on map-stage. Port economy (cargo/ledger) stubbed
//   for a later pass; the engine functions are present but not wired.

(function(){
  if (typeof window === 'undefined') return;
  const LOG = (...a) => console.log('[voyage]', ...a);
  LOG('gcc-voyage.js v0.8.0 loaded');

  // ── DATA ──────────────────────────────────────────────────────────────────
  // Ship templates: dailySail in miles-per-10-hour-sailing-day, hull in HP.
  // dailyOar: miles-per-day rowed (Seafaring ship table, rowed column).
  // 0 = no meaningful oar power; ship is dead in the water when becalmed.
  const SHIP_TEMPLATES = [
    { id:'cog',           name:'Cog',                   dailySail:36, dailyOar:15, hull:21 },
    { id:'caravel',       name:'Caravel',               dailySail:48, dailyOar:0,  hull:18 },
    { id:'sailing_ship',  name:'Sailing Ship',          dailySail:30, dailyOar:20, hull:25 },
    { id:'galley_large',  name:'Large Galley',          dailySail:50, dailyOar:30, hull:10 },
    { id:'galley_war',    name:'War Galley',            dailySail:36, dailyOar:12, hull:18 },
    { id:'sailing_boat',  name:'Sailing Boat (Fishing)',dailySail:60, dailyOar:10, hull:14 },
    { id:'keelboat',      name:'Keelboat',              dailySail:20, dailyOar:10, hull:9  },
    { id:'longship',      name:'Longship',              dailySail:50, dailyOar:18, hull:7  },
    { id:'merchantman',   name:'Merchantman',           dailySail:24, dailyOar:0,  hull:34 },
    { id:'dromond',       name:'Dromond',               dailySail:36, dailyOar:30, hull:30 },
    { id:'rowboat',       name:'Rowboat / Skiff',       dailySail:18, dailyOar:9,  hull:3  },
    { id:'outrigger',     name:'Outrigger',             dailySail:24, dailyOar:18, hull:6  },
  ];

  const MONTHS = (window.GCCWeather && Array.isArray(window.GCCWeather.MONTHS))
    ? window.GCCWeather.MONTHS
    : [
      "Needfest","Fireseek","Readying","Coldeven","Growfest",
      "Planting","Flocktime","Wealsun","Richfest",
      "Reaping","Goodmonth","Harvester","Brewfest",
      "Patchwall","Ready'reat","Sunsebb"
    ];

  const CREW_QUALITY_MOD = { green:-2, average:0, experienced:1, veteran:2 };

  // Ports keyed by landmark name (case-sensitive, must match GCCLandmarks entries).
  // connections: { destName: distanceMiles }  — distances from AD&D Seafaring.
  // defaultWater: coastal | openWater | lake | river  — per-leg override via UI.
  const PORTS = {
    "City of Greyhawk": { defaultWater:'lake', connections:{
      "Dyvers":90, "Verbobonc":150, "Leukish":120, "Hardby":60,
      "Safeton":60, "Fax":90, "Port Elredd":120, "Nessermouth":60,
    }},
    "Dyvers": { defaultWater:'lake', connections:{
      "City of Greyhawk":90, "Verbobonc":60, "Leukish":150,
      "Hardby":150, "Safeton":120,
    }},
    "Verbobonc": { defaultWater:'river', connections:{
      "City of Greyhawk":150, "Dyvers":60, "Leukish":180,
    }},
    "Leukish": { defaultWater:'lake', connections:{
      "City of Greyhawk":120, "Dyvers":150, "Verbobonc":180, "Port Elredd":90,
    }},
    "Hardby": { defaultWater:'coastal', connections:{
      "Rel Mord":150, "Gradsul":200, "City of Greyhawk":60,
      "Fax":90, "Port Elredd":150,
    }},
    "Safeton": { defaultWater:'coastal', connections:{
      "City of Greyhawk":60, "Dyvers":90, "Nessermouth":30,
    }},
    "Fax": { defaultWater:'coastal', connections:{
      "City of Greyhawk":90, "Hardby":90, "Rel Mord":120,
    }},
    "Port Elredd": { defaultWater:'coastal', connections:{
      "City of Greyhawk":120, "Leukish":90, "Hardby":150, "Rel Mord":180,
    }},
    "Nessermouth": { defaultWater:'river', connections:{
      "Safeton":30, "City of Greyhawk":60,
    }},
    "Rel Mord": { defaultWater:'coastal', connections:{
      "Hardby":150, "Gradsul":120, "Fax":120, "Port Elredd":180,
    }},
    "Gradsul": { defaultWater:'openWater', connections:{
      "Hardby":200, "Rel Mord":120,
    }},
  };

  const WATER_TYPES = [
    { id:'coastal',   label:'Coastal'    },
    { id:'openWater', label:'Open Water' },
    { id:'lake',      label:'Lake'       },
    { id:'river',     label:'River'      },
  ];

  // ── STATE ─────────────────────────────────────────────────────────────────
  const state = {
    active: false,
    activeTab: 'setup',
    panelEl: null,
    veDrag: null,
    voyage: null,          // current voyage state (see buildVoyageState)
    routeLegs: [],         // [{ from, to, waterType, distance }]
    overlayG: null,        // SVG <g> that holds ship marker + route line + trail
    placingPort: null,     // port name currently being placed via map click
  };

  // ── SMALL HELPERS ─────────────────────────────────────────────────────────
  const rollD  = s => Math.floor(Math.random()*s)+1;
  const rollDN = (n,s) => { let t=0; for(let i=0;i<n;i++) t+=rollD(s); return t; };
  const uid = (prefix='id') => `${prefix}_${Math.random().toString(36).slice(2,8)}_${Date.now().toString(36)}`;

  // Seafaring: 1 hull point permanently repaired in port for 100 gp/day by
  // trained workers. (Self-repair by crew is ~50 gp materials + a week.)
  const REPAIR_GP_PER_HULL = 100;
  const VOYAGE_STORAGE_KEY = 'gcc.voyage.state.v1';
  const PORT_HEX_KEY = 'gcc.voyage.portHexes.v1';

  // Manually placed port hexes (user clicked the map). Landmarks stay
  // canonical: a GCCLandmarks entry always wins; these overrides only fill
  // in ports that have no landmark yet. { "Rel Mord": {col,row}, ... }
  let portHexOverrides = loadPortHexOverrides();
  function loadPortHexOverrides(){
    try {
      const raw = localStorage.getItem(PORT_HEX_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return (obj && typeof obj === 'object') ? obj : {};
    } catch (err){ return {}; }
  }
  function savePortHexOverrides(){
    try { localStorage.setItem(PORT_HEX_KEY, JSON.stringify(portHexOverrides)); }
    catch (err){ LOG('could not save port hex overrides', err); }
  }
  function portOverrideHex(name){
    const h = portHexOverrides[name];
    return (h && Number.isFinite(h.col) && Number.isFinite(h.row)) ? { col:h.col, row:h.row } : null;
  }
  function portFromLandmark(name){
    if (typeof GCCLandmarks === 'undefined' || typeof darleneToInternal !== 'function') return null;
    const lm = GCCLandmarks.getByName(name);
    if (!lm || !lm.id) return null;
    return darleneToInternal(lm.id);  // { col, row } or null
  }

  function portHex(name){
    return portFromLandmark(name) || portOverrideHex(name);
  }
  function portAvailable(name){ return !!portHex(name); }
  // 'landmark' | 'placed' | null — used by the setup diagnostics UI.
  function portSource(name){
    if (portFromLandmark(name)) return 'landmark';
    if (portOverrideHex(name)) return 'placed';
    return null;
  }

  // ── HEX GEOMETRY + WATER PATHFINDING ──────────────────────────────────────
  // Flat-top hex grid in odd-q offset (odd columns shifted DOWN — matches
  // greyhawk-map.html hexCenter: y += rowStep*0.5 when col is odd).
  // Neighbor deltas [NW, N, NE, SE, S, SW] depend on column parity.
  const HEX_NB_EVEN = [[-1,-1],[0,-1],[1,-1],[1,0],[0,1],[-1,0]];
  const HEX_NB_ODD  = [[-1, 0],[0,-1],[1, 0],[1,1],[0,1],[-1,1]];
  function hexNeighbors(col, row){
    const deltas = (col & 1) ? HEX_NB_ODD : HEX_NB_EVEN;
    return deltas.map(([dc,dr]) => ({ col:col+dc, row:row+dr }));
  }
  // Axial conversion for admissible A* heuristic.
  function hexDistance(a, b){
    const aq = a.col, ar = a.row - ((a.col - (a.col & 1)) >> 1);
    const bq = b.col, br = b.row - ((b.col - (b.col & 1)) >> 1);
    const dq = aq - bq, dr = ar - br;
    return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
  }
  function isWaterHex(col, row){
    if (typeof GCCTerrain === 'undefined') return false;
    return GCCTerrain.get(col, row) === 'water';
  }
  function inGrid(col, row){
    const gc = (typeof GRID_COLS !== 'undefined') ? GRID_COLS : 146;
    const gr = (typeof GRID_ROWS !== 'undefined') ? GRID_ROWS : 97;
    return col >= 0 && row >= 0 && col < gc && row < gr;
  }
  // A* water-hex search. Land allowed only at start and goal (so a port on
  // a land hex can launch from / arrive at, but intermediates must be water).
  // Returns array of {col,row} including both endpoints, or null if no path.
  function findWaterPath(start, goal, opts){
    opts = opts || {};
    const maxIter = opts.maxIter || 10000;
    if (!start || !goal) return null;
    const startKey = `${start.col}-${start.row}`;
    const goalKey  = `${goal.col}-${goal.row}`;
    if (startKey === goalKey) return [{ col:start.col, row:start.row }];
    const open = new Map();   // key → node {col,row,f}
    const closed = new Set();
    const came = new Map();
    const gScore = new Map();
    open.set(startKey, { col:start.col, row:start.row, f: hexDistance(start, goal) });
    gScore.set(startKey, 0);
    let iter = 0;
    while (open.size && iter++ < maxIter){
      // Pick node with lowest f (linear scan — trivially fast for this grid).
      let bestKey = null, bestNode = null, bestF = Infinity;
      for (const [k, v] of open){
        if (v.f < bestF){ bestF = v.f; bestKey = k; bestNode = v; }
      }
      if (bestKey === goalKey){
        const path = [];
        let k = bestKey;
        while (k){
          const [c, r] = k.split('-').map(Number);
          path.unshift({ col:c, row:r });
          k = came.get(k);
        }
        return path;
      }
      open.delete(bestKey);
      closed.add(bestKey);
      for (const nb of hexNeighbors(bestNode.col, bestNode.row)){
        if (!inGrid(nb.col, nb.row)) continue;
        const nbKey = `${nb.col}-${nb.row}`;
        if (closed.has(nbKey)) continue;
        // Water-only, except allow start and goal (for land-side ports).
        const atEndpoint = (nbKey === startKey || nbKey === goalKey);
        if (!atEndpoint && !isWaterHex(nb.col, nb.row)) continue;
        const tentativeG = (gScore.get(bestKey) || 0) + 1;
        if (tentativeG < (gScore.get(nbKey) ?? Infinity)){
          came.set(nbKey, bestKey);
          gScore.set(nbKey, tentativeG);
          const f = tentativeG + hexDistance(nb, goal);
          open.set(nbKey, { col:nb.col, row:nb.row, f });
        }
      }
    }
    return null;
  }

  // ── PORT PLACEMENT (click a map hex to locate a missing port) ────────────
  // Uses greyhawk-map globals screenToMap/mapToHex. A capture-phase listener
  // on #map-wrap beats the map's own onHexClick; a mousedown tracker filters
  // out pan-drags (the map's internal didDrag flag isn't reachable from here).
  let _placeClickHandler = null;
  let _placeDownHandler = null;
  let _placeDownAt = null;

  function beginPortPlacement(name){
    if (!PORTS[name]) return;
    cancelPortPlacement(true);
    const wrap = document.getElementById('map-wrap');
    if (!wrap || typeof screenToMap !== 'function' || typeof mapToHex !== 'function'){
      setStatus('Map hex picking is unavailable on this page.', 'err');
      return;
    }
    state.placingPort = name;
    document.body.classList.add('ve-placing-port');
    _placeDownHandler = e => { _placeDownAt = { x:e.clientX, y:e.clientY }; };
    _placeClickHandler = e => {
      if (!state.placingPort) return;
      if (_placeDownAt && (Math.abs(e.clientX - _placeDownAt.x) > 4 || Math.abs(e.clientY - _placeDownAt.y) > 4)) return; // pan, not a pick
      const m = screenToMap(e.clientX, e.clientY);
      const hit = mapToHex(m.x, m.y);
      if (!hit) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      completePortPlacement(hit.col, hit.row);
    };
    wrap.addEventListener('mousedown', _placeDownHandler, true);
    wrap.addEventListener('click', _placeClickHandler, true);
    setStatus(`Click a map hex to place ${name}. Drag the panel aside if it covers the spot. Esc cancels.`, 'warn');
    if (typeof showToast === 'function') showToast(`Placing port: ${name} — click a map hex`);
  }

  function cancelPortPlacement(silent){
    const wrap = document.getElementById('map-wrap');
    if (wrap){
      if (_placeClickHandler) wrap.removeEventListener('click', _placeClickHandler, true);
      if (_placeDownHandler) wrap.removeEventListener('mousedown', _placeDownHandler, true);
    }
    _placeClickHandler = null; _placeDownHandler = null; _placeDownAt = null;
    document.body.classList.remove('ve-placing-port');
    if (!state.placingPort) return;
    state.placingPort = null;
    if (!silent) setStatus('Port placement cancelled.');
  }

  function completePortPlacement(col, row){
    const name = state.placingPort;
    cancelPortPlacement(true);
    if (!name) return;
    portHexOverrides[name] = { col, row, placedAt: new Date().toISOString() };
    savePortHexOverrides();
    // Re-path planned legs that touch this port so the water route shows
    // immediately (this was the "click hexes to show the path" ask).
    state.routeLegs.forEach(leg => {
      if (leg.from === name || leg.to === name){
        const fh = portHex(leg.from), th = portHex(leg.to);
        leg.path = (fh && th) ? findWaterPath(fh, th) : null;
      }
    });
    renderSetupPane();
    renderRouteOverlay();
    renderPositionHeader();
    emitVoyageChanged('port-placed');
    const lbl = hexLabel({ col, row });
    const water = isWaterHex(col, row);
    setStatus(`Placed ${name} at ${lbl}.${water ? '' : ' Note: hex is not painted water — the port can launch/arrive on land, but it needs adjacent water hexes to path.'}`);
    if (typeof showToast === 'function') showToast(`${name} placed at ${lbl}`);
  }

  function clearPortPlacement(name){
    if (!portHexOverrides[name]) return;
    delete portHexOverrides[name];
    savePortHexOverrides();
    state.routeLegs.forEach(leg => {
      if (leg.from === name || leg.to === name) leg.path = null;
    });
    renderSetupPane();
    renderRouteOverlay();
    setStatus(`Cleared placed hex for ${name}.`);
  }

  function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // ── SIMULATION ENGINE ───────────────────────────────────────────────────
  function generateWeather(ctx){
    if (window.GCCWeather && typeof window.GCCWeather.generateDailyWeather === 'function'){
      return window.GCCWeather.generateDailyWeather(ctx || {});
    }
    // Fallback only if gcc-weather.js is missing. Keeps gale/storm reachable.
    const windSpeed = rollDN(3,20);
    const dirs = ['North','South','East','West','Northwest','Northeast','Southwest','Southeast'];
    const dir = dirs[rollD(8)-1];
    const skyRoll = rollD(100);
    const sky = skyRoll<=20 ? 'Clear' : skyRoll<=50 ? 'Partly Cloudy' : 'Cloudy';
    const force = windSpeed <= 1 ? 'Calm' : windSpeed <= 7 ? 'Light Wind' : windSpeed <= 18 ? 'Moderate Wind'
      : windSpeed <= 31 ? 'Strong Wind' : windSpeed <= 54 ? 'Gale' : windSpeed <= 72 ? 'Storm' : 'Hurricane';
    const precip = windSpeed>=55 ? 'Rain Storm' : windSpeed>=32 ? 'Gale' : rollD(100)<=40 ? 'Rain' : 'None';
    return {
      source:'fallback',
      wind:{ speed:windSpeed, direction:dir, force, forceKey:force.toLowerCase().split(' ')[0] },
      sky,
      precipitation:{ key:precip.toLowerCase().replace(/\s+/g,'-'), type:precip, duration:precip!=='None' ? rollD(12) : 0, durationUnit:'hours' },
      temperature:{ high:65+rollD(20)-10, low:45+rollD(10), current:55 },
      voyageEffects:{ movementMultiplier: windSpeed<=1 ? 0 : windSpeed<=7 ? 0.75 : windSpeed>=55 ? 0.5 : windSpeed>=32 ? 0.75 : 1, navigationPenalty: windSpeed>=55 ? 4 : windSpeed>=32 ? 2 : 0, hazardLevel: windSpeed>=73 ? 'hurricane' : windSpeed>=55 ? 'storm' : windSpeed>=32 ? 'gale' : null, speedNote:'' }
    };
  }
  function calculateSailingSpeed(baseSpeed, weather){
    const w = Number(weather?.wind?.speed || 0);
    const fx = weather?.voyageEffects;
    if (fx && Number.isFinite(fx.movementMultiplier)){
      const mult = fx.movementMultiplier;
      const bonus = Number(fx.bonusMiles || 0);
      const speed = Math.max(0, Math.round((baseSpeed * mult) + bonus));
      const force = weather.wind?.force || 'Wind';
      const bits = [`${force} (${w} mph).`];
      if (mult === 0) bits.push('No planned-course progress.');
      else if (mult !== 1) bits.push(`${Math.round(mult * 100)}% planned-course progress.`);
      else bits.push('Normal planned-course progress.');
      if (fx.speedNote) bits.push(fx.speedNote);
      return { speed, note:bits.join(' '), becalmed:mult === 0 };
    }

    let speed = baseSpeed, note = '';
    if (w<5) return { speed:0, note:'Becalmed — wind too light.', becalmed:true };
    if (w<20){
      const penalty = Math.floor((20-w)/10)*8;
      speed = Math.max(1, baseSpeed-penalty);
      note = `Light winds (${w} mph). −${penalty} mi/day.`;
    } else if (w<=30){
      note = `Good sailing winds (${w} mph).`;
    } else {
      const bonus = Math.floor((w-30)/10)*16;
      speed += bonus;
      note = `Strong winds (${w} mph). +${bonus} mi/day.`;
    }
    const wet = ['drizzle','rainstorm-light','rainstorm-heavy','hailstorm','Rain','Rain Storm'];
    if (wet.includes(weather.precipitation.type)){
      const pct = Math.floor(Math.random()*6)+5;
      const bonus = Math.floor(speed*pct/100);
      speed += bonus;
      note += ` Wet sails +${bonus} mi.`;
    }
    return { speed, note, becalmed:false };
  }
  // DMG p.47/Seafaring: encounters occur 1-in-20 per check. Salt water gets
  // two checks/day in coastal/shallow water, one in deep water; fresh water
  // gets three checks/day. Approximated as a single d20 per day against a
  // per-check-count threshold.
  function checkEncounter(waterType){
    const thresholds = { coastal:2, openWater:1, lake:2, river:3 };
    const threshold = thresholds[waterType] || 2;
    if (rollD(20) > threshold) return null;
    const ENC = {
      coastal:[
        { n:'Pirate vessel (1d4+1 ships)', h:true }, { n:'Merchant convoy (2d6 ships)' },
        { n:'Fishing fleet' }, { n:'Naval patrol' }, { n:'Sea serpent', h:true },
        { n:'Giant shark', h:true }, { n:'Stranded sailors' }, { n:'Wreck (salvageable)' },
        { n:'Storm-damaged vessel needing aid' }, { n:'Smugglers' },
      ],
      openWater:[
        { n:'Pirate squadron', h:true }, { n:'Merchant vessel' }, { n:'Sea dragon', h:true },
        { n:'School of sea horses' }, { n:'Giant squid', h:true }, { n:'Whale pod' },
        { n:'Floating wreckage' }, { n:'Ghost ship', h:true }, { n:'Sea elves' },
        { n:'Merfolk delegation' },
      ],
      lake:[
        { n:'Fishermen' }, { n:'River traders' }, { n:'Lake monster', h:true },
        { n:'Bandit raft', h:true }, { n:'Elvish vessel' }, { n:'Dwarven barge' },
        { n:'Sunken ruins visible' }, { n:'Fog bank (navigation hazard)' },
        { n:'Water weird', h:true }, { n:'Lake hermit' },
      ],
      river:[
        { n:'River pirates', h:true }, { n:'Ferry barge' }, { n:'Crocodiles', h:true },
        { n:'Giant catfish' }, { n:'Bandits on shore', h:true }, { n:'Sunken barge (obstacle)' },
        { n:'River toll collectors' }, { n:'Nixies' }, { n:'River troll', h:true },
        { n:'Log jam' },
      ],
    };
    const list = ENC[waterType] || ENC.coastal;
    const enc = list[Math.floor(Math.random()*list.length)];
    return { name:enc.n, hostile:!!enc.h, distance:(rollD(6)*10)+'yds' };
  }

  // Seafaring evasion table (abridged): base 80%, open water −50%,
  // gale +20%, storm +30%, fog +50%; damaged ship −hull-damage%.
  function rollEvasion(waterType, weather, v){
    let chance = 80;
    if (waterType === 'openWater') chance -= 50;
    const w = Number(weather?.wind?.speed || 0);
    const p = String(weather?.precipitation?.key || '');
    if (p === 'fog' || p === 'heavy-fog') chance += 50;
    else if (w >= 55) chance += 30;
    else if (w >= 32) chance += 20;
    const dmgPct = v?.hullMax ? Math.round((1 - v.hullCurrent / v.hullMax) * 100) : 0;
    chance -= Math.max(0, dmgPct);
    chance = Math.max(5, Math.min(95, chance));
    const roll = rollD(100);
    return { success: roll <= chance, roll, chance };
  }
  function rollNavigationCheck(navSkill, crewMod, weather, waterType){
    const mustCheck = waterType === 'openWater' || Number(weather?.voyageEffects?.navigationPenalty || 0) > 0;
    if (!mustCheck) return null;
    const roll = rollD(20);
    const hazardMod = Number(weather?.voyageEffects?.navigationPenalty || 0)
      || (weather.wind.speed>=50 ? 5 : weather.wind.speed>=30 ? 2 : 0);
    const target = navSkill + crewMod - hazardMod;
    if (roll <= target) return null;
    const lostPct = Math.min(50, (roll-target)*5);
    return { failed:true, roll, target, lostPct, hazardMod };
  }
  function assessWeatherHazard(weather){
    const w = Number(weather?.wind?.speed || 0);
    const p = weather?.precipitation?.key || weather?.precipitation?.type || '';
    const hz = weather?.voyageEffects?.hazardLevel;
    if (hz === 'hurricane' || p === 'hurricane' || w>=73) return { type:'Critical', mod:10, desc:'Hurricane Force Weather' };
    if (hz === 'storm' || p === 'waterspout' || p === 'squall' || w>=55) return { type:'Major', mod:6, desc:p === 'waterspout' ? 'Waterspout / Tornado' : 'Storm' };
    if (hz === 'gale' || p === 'gale' || w>=32) return { type:'Major', mod:4, desc:'Gale Force Winds' };
    const sky = String(weather?.sky || '').toLowerCase();
    if (sky.includes('fog') || p === 'fog' || p === 'heavy-fog')
      return { type:'Minor', mod:p === 'heavy-fog' ? 4 : 3, desc:p === 'heavy-fog' ? 'Heavy Fog' : 'Fog' };
    return null;
  }
  function calendarAdvance(cal, days=1){
    const DPM = (window.GCCWeather && window.GCCWeather.MONTH_LENGTHS)
      ? window.GCCWeather.MONTH_LENGTHS
      : { Needfest:7, Growfest:7, Richfest:7, Brewfest:7 };
    let { day, month, year } = cal;
    for (let i=0;i<days;i++){
      const dpm = DPM[MONTHS[month]] || 28;
      day++;
      if (day>dpm){ day=1; month++; }
      if (month>=MONTHS.length){ month=0; year++; }
    }
    return { day, month, year };
  }
  function formatDate(cal){ return `${cal.day} ${MONTHS[cal.month]} ${cal.year} CY`; }

  function saveVoyageState(){
    try {
      const payload = {
        version: 1,
        savedAt: new Date().toISOString(),
        routeLegs: state.routeLegs || [],
        voyage: state.voyage || null,
      };
      localStorage.setItem(VOYAGE_STORAGE_KEY, JSON.stringify(payload));
    } catch (err){ LOG('could not save voyage state', err); }
  }

  function loadVoyageState(){
    try {
      const raw = localStorage.getItem(VOYAGE_STORAGE_KEY);
      if (!raw) return false;
      const payload = JSON.parse(raw);
      if (Array.isArray(payload?.routeLegs)) state.routeLegs = payload.routeLegs;
      if (payload?.voyage && Array.isArray(payload.voyage.legs)){
        state.voyage = payload.voyage;
        normalizeVoyageState(state.voyage);
      }
      return true;
    } catch (err){ LOG('could not load voyage state', err); return false; }
  }

  function clearSavedVoyageState(){
    try { localStorage.removeItem(VOYAGE_STORAGE_KEY); } catch (err){ /* ignore */ }
  }

  function dateObjToText(cal){ return cal ? formatDate(cal) : ''; }

  function cloneHex(h){
    return h ? { col:Number(h.col || 0), row:Number(h.row || 0) } : null;
  }

  function currentLeg(v=state.voyage){
    return v?.legs?.[v.currentLegIdx] || null;
  }

  function currentLegProgress(v=state.voyage){
    const leg = currentLeg(v);
    if (!leg) return { leg:null, pct:0, milesOnLeg:0, milesRemainingOnLeg:0 };
    const milesOnLeg = Math.max(0, Math.min(Number(v.milesOnLeg || 0), Number(leg.distance || 0)));
    const dist = Math.max(1, Number(leg.distance || 0));
    return {
      leg,
      pct: Math.max(0, Math.min(1, milesOnLeg / dist)),
      milesOnLeg: Math.round(milesOnLeg),
      milesRemainingOnLeg: Math.max(0, Math.round(Number(leg.distance || 0) - milesOnLeg)),
    };
  }

  function buildVoyageLocation(v=state.voyage){
    if (!v?.legs?.length) return null;
    const pos = cloneHex(shipHexPosition());
    const base = {
      date: dateObjToText(v.calendar),
      voyageDay: Number(v.dayNumber || 0),
      currentLegIdx: Number(v.currentLegIdx || 0),
      currentHex: pos,
      route: voyageRouteLabel(v),
    };
    if (v.shipSank){
      const p = currentLegProgress(v);
      return { ...base, mode:'sunk', label:`Sunk: ${p.leg ? `${p.leg.from} → ${p.leg.to}` : voyageRouteLabel(v)}`, lastPort:p.leg?.from || '', nextPort:p.leg?.to || '', port:'', milesOnLeg:p.milesOnLeg, milesRemainingOnLeg:p.milesRemainingOnLeg };
    }
    if (v.finished || v.currentLegIdx >= v.legs.length){
      const dest = v.legs[v.legs.length - 1]?.to || '';
      return { ...base, mode:'arrived', label:dest ? `Arrived: ${dest}` : 'Arrived', port:dest, lastPort:dest, nextPort:'', milesOnLeg:0, milesRemainingOnLeg:0 };
    }
    const p = currentLegProgress(v);
    const leg = p.leg || v.legs[0];
    if (v.dayNumber === 0 && v.currentLegIdx === 0 && Number(v.milesOnLeg || 0) === 0){
      return { ...base, mode:'in_port', label:leg.from || 'In port', port:leg.from || '', lastPort:leg.from || '', nextPort:leg.to || '', milesOnLeg:0, milesRemainingOnLeg:Number(leg.distance || 0) };
    }
    const exactPort = (Number(v.milesOnLeg || 0) === 0 && v.currentLegIdx > 0) ? v.legs[v.currentLegIdx - 1]?.to : '';
    if (exactPort && !v._forceUnderwayLocation){
      return { ...base, mode:'in_port', label:exactPort, port:exactPort, lastPort:exactPort, nextPort:leg.to || '', milesOnLeg:0, milesRemainingOnLeg:Number(leg.distance || 0) };
    }
    const water = leg.waterType ? ` · ${leg.waterType}` : '';
    return {
      ...base,
      mode:'underway',
      label:`Underway: ${leg.from} → ${leg.to}`,
      port:'',
      lastPort:leg.from || '',
      nextPort:leg.to || '',
      milesOnLeg:p.milesOnLeg,
      milesRemainingOnLeg:p.milesRemainingOnLeg,
      progressPct: Math.round(p.pct * 100),
      waterType: leg.waterType || '',
      note:`${p.milesOnLeg}/${leg.distance || 0} mi${water}`,
    };
  }

  function updateVoyageLocation(reason='location'){
    if (!state.voyage) return null;
    normalizeVoyageState(state.voyage, false);
    state.voyage.location = buildVoyageLocation(state.voyage);
    state.voyage.currentDate = dateObjToText(state.voyage.calendar);
    state.voyage.updatedAt = new Date().toISOString();
    if (state.voyage.finished && !state.voyage.arrivalDate) state.voyage.arrivalDate = state.voyage.currentDate;
    return state.voyage.location;
  }

  function normalizeVoyageState(v=state.voyage, updateLocation=true){
    if (!v) return null;
    v.legs = Array.isArray(v.legs) ? v.legs : [];
    v.log = Array.isArray(v.log) ? v.log : [];
    v.hexTrail = Array.isArray(v.hexTrail) ? v.hexTrail : [];
    v.calendar = v.calendar || { day:1, month:0, year:576 };
    v.startCalendar = v.startCalendar || { ...v.calendar };
    v.startDate = v.startDate || dateObjToText(v.startCalendar);
    v.currentDate = dateObjToText(v.calendar);
    v.hullDamageTaken = Number(v.hullDamageTaken || 0);
    ensureSettlement(v);
    if (updateLocation) updateVoyageLocation('normalize');
    return v;
  }

  function voyageCurrentLocation(v=state.voyage){
    if (!v) return null;
    return v.location || buildVoyageLocation(v);
  }

  function voyageCurrentLocationLabel(v=state.voyage){
    const loc = voyageCurrentLocation(v);
    return loc?.label || voyageCurrentPort(v) || '';
  }

  function emitVoyageChanged(reason='changed'){
    if (state.voyage) updateVoyageLocation(reason);
    renderPositionHeader();
    saveVoyageState();
    try {
      document.dispatchEvent(new CustomEvent('gcc:voyage:changed', { detail:{ reason, voyage:state.voyage } }));
    } catch (err){ /* CustomEvent unavailable in very old browsers */ }
  }

  function ensureSettlement(v=state.voyage){
    if (!v) return null;
    v.settlement = v.settlement || {};
    v.settlement.pending = Array.isArray(v.settlement.pending) ? v.settlement.pending : [];
    v.settlement.posted = Array.isArray(v.settlement.posted) ? v.settlement.posted : [];
    v.settlement.notes = Array.isArray(v.settlement.notes) ? v.settlement.notes : [];
    v.settlement.repairGpPerHull = Number(v.settlement.repairGpPerHull || REPAIR_GP_PER_HULL);
    return v.settlement;
  }

  function voyageCurrentPort(v=state.voyage){
    if (!v?.legs?.length) return '';
    const loc = v.location || buildVoyageLocation(v);
    if (loc?.port) return loc.port;
    if (loc?.mode === 'underway') return loc.label || '';
    if (v.finished || v.currentLegIdx >= v.legs.length) return v.legs[v.legs.length - 1]?.to || '';
    if (v.currentLegIdx > 0 && Number(v.milesOnLeg || 0) === 0) return v.legs[v.currentLegIdx - 1]?.to || '';
    const leg = v.legs[v.currentLegIdx] || v.legs[0];
    return leg?.from || '';
  }

  function voyageRouteLabel(v=state.voyage){
    if (!v?.legs?.length) return '';
    const start = v.legs[0]?.from || '';
    const end = v.legs[v.legs.length - 1]?.to || '';
    return start && end ? `${start} → ${end}` : '';
  }

  function estimateRepairCost(hullDamage=0, v=state.voyage){
    const rate = Number(ensureSettlement(v)?.repairGpPerHull || REPAIR_GP_PER_HULL);
    return Math.max(0, Math.round(Number(hullDamage || 0) * rate));
  }

  function addPendingFinanceAction(data={}, v=state.voyage){
    const s = ensureSettlement(v);
    if (!s) return null;
    const category = data.category || 'repair';
    const hullDamage = Number(data.hullDamage || 0);
    const action = {
      id: data.id || uid('vfp'),
      status: 'pending',
      createdAt: new Date().toISOString(),
      day: data.day || v.dayNumber || 0,
      date: data.date || (v.calendar ? formatDate(v.calendar) : ''),
      port: data.port || voyageCurrentLocationLabel(v),
      location: data.location || voyageCurrentLocationLabel(v),
      route: data.route || voyageRouteLabel(v),
      category,
      direction: data.direction || (['cargo_sale','charter','voyage_profit','trade_profit'].includes(category) ? 'income' : 'expense'),
      amountGp: Number(data.amountGp ?? (category === 'repair' ? estimateRepairCost(hullDamage, v) : 0)),
      memo: data.memo || 'Voyage settlement item.',
      eventType: data.eventType || category,
      hullDamage,
      restoreHullAllowed: !!(data.restoreHullAllowed ?? (category === 'repair' && hullDamage > 0)),
      meta: Object.assign({ location: voyageCurrentLocation(v) }, data.meta && typeof data.meta === 'object' ? data.meta : {})
    };
    s.pending.unshift(action);
    emitVoyageChanged('pending-finance-added');
    return action;
  }

  function markPendingFinancePosted(id, txnId='', opts={}){
    const v = state.voyage;
    const s = ensureSettlement(v);
    if (!s) return null;
    const action = s.pending.find(a => a.id === id);
    if (!action) return null;
    action.status = 'posted';
    action.postedAt = new Date().toISOString();
    action.transactionId = txnId || action.transactionId || '';
    if (opts.repairHull && action.restoreHullAllowed && action.hullDamage > 0 && v){
      const before = Number(v.hullCurrent || 0);
      v.hullCurrent = Math.min(Number(v.hullMax || before), before + Number(action.hullDamage || 0));
      action.repairApplied = true;
      action.repairedHp = v.hullCurrent - before;
    }
    s.posted.unshift({ ...action });
    emitVoyageChanged('pending-finance-posted');
    renderVoyagePane();
    return action;
  }

  function dismissPendingFinanceAction(id){
    const s = ensureSettlement(state.voyage);
    if (!s) return false;
    const action = s.pending.find(a => a.id === id);
    if (!action) return false;
    action.status = 'dismissed';
    action.dismissedAt = new Date().toISOString();
    emitVoyageChanged('pending-finance-dismissed');
    renderVoyagePane();
    return true;
  }

  function getVoyageSummary(v=state.voyage){
    if (!v) return null;
    const s = ensureSettlement(v);
    const pending = s.pending.filter(a => a.status === 'pending');
    const posted = s.pending.filter(a => a.status === 'posted');
    const currentHullLoss = Math.max(0, Number(v.hullMax || 0) - Number(v.hullCurrent || 0));
    const totalHullDamage = Number(v.hullDamageTaken || 0);
    const pendingRepairGp = pending
      .filter(a => a.category === 'repair')
      .reduce((sum,a) => sum + Math.max(0, Number(a.amountGp || 0)), 0);
    const weatherDelayDays = (v.log || []).filter(e => e?.speedInfo?.becalmed || Number(e?.speedInfo?.speed || e?.miles || 0) === 0).length;
    const stormDays = (v.log || []).filter(e => ['gale','storm','hurricane'].includes(String(e?.weather?.voyageEffects?.hazardLevel || '').toLowerCase())).length;
    return {
      voyageId: v.finance?.voyageId || '',
      route: voyageRouteLabel(v),
      origin: v.legs?.[0]?.from || '',
      destination: v.legs?.[v.legs.length - 1]?.to || '',
      currentPort: voyageCurrentLocationLabel(v),
      currentLocation: voyageCurrentLocation(v),
      startDate: v.startDate || '',
      currentDate: v.currentDate || dateObjToText(v.calendar),
      arrivalDate: v.arrivalDate || '',
      days: v.dayNumber || 0,
      distanceCovered: v.distanceCovered || 0,
      totalDistance: v.totalDistance || 0,
      finished: !!v.finished,
      shipSank: !!v.shipSank,
      hullCurrent: v.hullCurrent || 0,
      hullMax: v.hullMax || 0,
      currentHullLoss,
      totalHullDamage,
      pendingRepairGp,
      pendingCount: pending.length,
      postedCount: posted.length,
      weatherDelayDays,
      stormDays,
      repairGpPerHull: s.repairGpPerHull
    };
  }

  function currentLegWaterType(){
    if (!state.voyage) return 'coastal';
    const leg = state.voyage.legs[state.voyage.currentLegIdx];
    return leg ? leg.waterType : 'coastal';
  }

  // For a river leg, look up the current hex and the next hex on
  // leg.path, then ask GCCPaths how that edge relates to the river:
  // 'with' (downstream), 'against' (upstream), or 'cross'. Returns
  //   null                       — not a river leg / no path / no
  //                                GCCPaths / no river on that edge
  //   { miles, direction, riverName, current }
  //                              — daily mi adjustment (signed)
  // Voyage planner adds `miles` to navMiles before final accounting.
  function currentLegRiverModifier(){
    if (!state.voyage) return null;
    const v = state.voyage;
    const leg = v.legs[v.currentLegIdx];
    if (!leg || leg.waterType !== 'river') return null;
    if (!leg.path || leg.path.length < 2) return null;
    if (!window.GCCPaths || !window.GCCPaths.edgeRiverCurrentMph) return null;
    // Find current path index. shipHexPosition returns the hex; we
    // recompute index here so we can also see the next step.
    const progress = leg.distance > 0 ? v.milesOnLeg / leg.distance : 0;
    const idx = Math.min(leg.path.length - 2, Math.max(0, Math.floor(progress * (leg.path.length - 1))));
    const a = leg.path[idx];
    const b = leg.path[idx + 1];
    if (!a || !b) return null;
    const info = window.GCCPaths.edgeRiverCurrentMph(a.col, a.row, b.col, b.row);
    if (!info) return null;
    return {
      miles: info.mph * 8,             // DMG: C × 8 mi/day
      direction: info.direction,
      riverName: info.riverName,
      current: info.current,
      tier: info.tier,
    };
  }
  function shipHexPosition(){
    const v = state.voyage; if (!v) return null;
    const leg = v.legs[v.currentLegIdx];
    if (!leg){
      const last = v.legs[v.legs.length-1];
      return last ? portHex(last.to) : null;
    }
    const progress = leg.distance>0 ? v.milesOnLeg/leg.distance : 0;
    // If the leg has a pathfound water route, interpolate along it by
    // hex-count so the ship follows coastlines/rivers. Otherwise fall back
    // to straight-line port-to-port interpolation.
    if (leg.path && leg.path.length > 1){
      const idx = Math.min(leg.path.length - 1, Math.max(0, Math.floor(progress * (leg.path.length - 1))));
      return { ...leg.path[idx] };
    }
    const from = portHex(leg.from), to = portHex(leg.to);
    if (!from || !to) return null;
    return {
      col: Math.round(from.col + (to.col-from.col)*progress),
      row: Math.round(from.row + (to.row-from.row)*progress)
    };
  }

  function simulateOneDay(){
    const v = state.voyage;
    if (!v || v.finished || v.shipSank) return null;
    v.dayNumber++;
    v.calendar = calendarAdvance(v.calendar, 1);
    v.currentDate = formatDate(v.calendar);
    const dateStr = v.currentDate;
    v._forceUnderwayLocation = true;
    updateVoyageLocation('day-start');
    const waterType = currentLegWaterType();
    const weather = generateWeather({
      day: v.calendar.day,
      month: v.calendar.month,
      monthName: MONTHS[v.calendar.month],
      year: v.calendar.year,
      waterType,
      shipId: v.shipId,
      shipType: v.shipType,
      captain: v.captain,
      previous: v.lastWeather || null,   // enables Dragon #68 day-to-day continuity
    });
    v.lastWeather = weather;
    let speedInfo = calculateSailingSpeed(v.dailySail, weather);
    const events = [];
    // Becalmed sail power, but the ship has oars → row instead. Only when
    // there's no active weather hazard (rowing through a gale is not a plan).
    const oar = Number(v.dailyOar || 0);
    if (speedInfo.becalmed && oar > 0 && !weather?.voyageEffects?.hazardLevel){
      speedInfo = { speed:oar, note:`Becalmed — crew rows ${oar} mi/day.`, becalmed:false, rowed:true };
      events.push({ type:'weather', text:'Becalmed; the crew takes to the oars.' });
    }
    if (weather.source === 'GCCWeather'){
      events.push({ type:'weather', text: window.GCCWeather.describeWeather(weather) });
      if (weather.voyageEffects?.stormDriftMiles){
        events.push({ type:'navigation', text:`Storm drift risk: ship may be blown ${weather.voyageEffects.stormDriftMiles} miles off course unless the captain keeps control.` });
      }
    }
    let milesThisDay = 0;

    // Encounters are checked whether or not the ship makes way — a becalmed
    // ship is still on the water (DMG daily encounter checks).
    const enc = checkEncounter(waterType);
    if (enc){
      if (enc.hostile){
        const ev = rollEvasion(waterType, weather, v);
        if (ev.success){
          events.push({ type:'encounter', text:`${enc.name} sighted at ${enc.distance} — evaded (${ev.roll} ≤ ${ev.chance}%).` });
        } else {
          const crewLoss = rollD(3)-1, hullDmg = rollD(4);
          v.hullCurrent -= hullDmg;
          v.hullDamageTaken = Number(v.hullDamageTaken || 0) + hullDmg;
          const repairGp = estimateRepairCost(hullDmg, v);
          addPendingFinanceAction({
            category:'repair',
            direction:'expense',
            amountGp:repairGp,
            hullDamage:hullDmg,
            eventType:'encounter_damage',
            memo:`Repair ${hullDmg} hull HP after ${enc.name} on ${dateStr}.`,
            day:v.dayNumber,
            date:dateStr,
            port:voyageCurrentLocationLabel(v),
            meta:{ encounter:enc.name, encounterDistance:enc.distance, waterType, evasionRoll:ev.roll, evasionChance:ev.chance }
          }, v);
          if (crewLoss>0) events.push({ type:'crew', text:`${enc.name} at ${enc.distance}! ${crewLoss} crew lost.` });
          events.push({ type:'encounter', text:`${enc.name} — evasion failed (${ev.roll} > ${ev.chance}%). Hull −${hullDmg} HP. Pending repair estimate: ${repairGp} gp.` });
        }
      } else {
        events.push({ type:'encounter', text:`${enc.name} at ${enc.distance}.` });
      }
    }

    if (speedInfo.becalmed){
      events.push({ type:'becalmed', text:'Becalmed — no progress.' });
    } else {
      // Navigation
      const nav = rollNavigationCheck(v.navSkill, v.crewMod, weather, waterType);
      let navMiles = speedInfo.speed;
      if (nav){
        const lost = Math.floor(navMiles*nav.lostPct/100);
        navMiles = Math.max(0, navMiles-lost);
        events.push({ type:'navigation', text:`Navigation error — lost ${lost} mi (rolled ${nav.roll}, needed ≤${nav.target}).` });
      }
      // Weather hazard
      const hz = assessWeatherHazard(weather);
      if (hz){
        const pilot = rollD(20), target = v.navSkill + v.crewMod - hz.mod;
        if (pilot > target){
          const dmg = hz.type==='Critical' ? rollDN(1,6)+4 : hz.type==='Major' ? rollDN(1,4)+2 : rollDN(1,3)+1;
          v.hullCurrent -= dmg;
          v.hullDamageTaken = Number(v.hullDamageTaken || 0) + dmg;
          const repairGp = estimateRepairCost(dmg, v);
          addPendingFinanceAction({
            category:'repair',
            direction:'expense',
            amountGp:repairGp,
            hullDamage:dmg,
            eventType:'weather_damage',
            memo:`Repair ${dmg} hull HP after ${hz.desc} on ${dateStr}.`,
            day:v.dayNumber,
            date:dateStr,
            port:voyageCurrentLocationLabel(v),
            meta:{ weatherHazard:hz.desc, windForce:weather.wind?.force || '', windSpeed:weather.wind?.speed || 0, waterType }
          }, v);
          events.push({ type:'damage', text:`${hz.desc}! Ship Sailing failed (${pilot} > ${target}). Hull −${dmg} HP. (${v.hullCurrent}/${v.hullMax} remaining). Pending repair estimate: ${repairGp} gp.` });
          // Seafaring/RC: each storm day the ship is blown d10×10 mi off
          // course. GCCWeather pre-rolls this as stormDriftMiles; apply it
          // as lost leg progress when the captain loses control.
          const drift = Number(weather?.voyageEffects?.stormDriftMiles || 0);
          if (drift > 0){
            v.milesOnLeg = Math.max(0, Number(v.milesOnLeg || 0) - drift);
            events.push({ type:'navigation', text:`Blown ${drift} mi off course by the ${hz.desc.toLowerCase()}.` });
          }
        } else {
          events.push({ type:'weather', text:`${hz.desc}: captain holds course (${pilot} ≤ ${target}).` });
        }
      }

      // River current modifier (DMG C×8). Applies only to river legs.
      // Adds positive mi/day downstream, negative upstream. Crossing
      // legs (river perpendicular to travel) get zero. Logs an event
      // so the player can see why progress is fast or slow.
      const riverMod = currentLegRiverModifier();
      if (riverMod && riverMod.miles !== 0){
        navMiles = Math.max(0, navMiles + riverMod.miles);
        const sign  = riverMod.miles > 0 ? '+' : '';
        const verb  = riverMod.direction === 'with' ? 'downstream' : 'upstream';
        const river = riverMod.riverName || 'river';
        events.push({ type:'current', text:`${river} current (${verb}) ${sign}${riverMod.miles} mi/day.` });
      }

      milesThisDay = navMiles;
      v.distanceCovered += milesThisDay;
      v.milesOnLeg      += milesThisDay;

      while (v.currentLegIdx < v.legs.length){
        const leg = v.legs[v.currentLegIdx];
        if (v.milesOnLeg >= leg.distance){
          const overflow = v.milesOnLeg - leg.distance;
          v.currentLegIdx++;
          v.milesOnLeg = overflow;
          if (v.currentLegIdx < v.legs.length){
            ensureSettlement(v).notes.push({ day:v.dayNumber, date:dateStr, type:'arrival', text:`Arrived at ${leg.to}.` });
            v._forceUnderwayLocation = false;
            updateVoyageLocation('port-arrival');
            events.push({ type:'port', text:`Arrived at ${leg.to}. Port settlement options are available in Voyage Ledger.` });
          } else {
            v.finished = true;
            v._forceUnderwayLocation = false;
            const dest = v.legs[v.legs.length-1].to;
            v.arrivalDate = dateStr;
            const s = ensureSettlement(v);
            s.notes.push({ day:v.dayNumber, date:dateStr, type:'arrival', text:`Voyage complete at ${dest}. Review settlement before ending the voyage.` });
            events.push({ type:'port', text:`Arrived at ${dest}. Voyage complete! Review Voyage Settlement for repair, port, and resupply posting.` });
            break;
          }
        } else break;
      }

      if (v.hullCurrent <= 0){
        v.shipSank = true;
        v.finished = true;
        v._forceUnderwayLocation = false;
        events.push({ type:'damage', text:'☠ Ship sank!' });
      }
    }

    updateVoyageLocation('day-end');
    const pos = shipHexPosition();
    if (pos) v.hexTrail.push(pos);
    const entry = { day:v.dayNumber, date:dateStr, weather, speedInfo, miles:milesThisDay,
                    distTotal:v.distanceCovered, events, hexPos:pos, location: voyageCurrentLocation(v) };
    v.log.push(entry);
    emitVoyageChanged('day-advanced');
    return entry;
  }

  // ── UI: STYLES ────────────────────────────────────────────────────────────
  function ensureStyles(){
    if (document.getElementById('ve-styles')) return;
    const s = document.createElement('style');
    s.id = 've-styles';
    s.textContent = `
      #voyage-panel {
        /* Default top must clear the fixed gcc-bar (~44px) + #topbar (46px);
           top:64px put the drag header under the toolbar. */
        position:fixed; top:calc(var(--gcc-bar-h, 44px) + 56px); right:24px;
        width:min(1080px, calc(100vw - 48px));
        height:min(760px, calc(100vh - var(--gcc-bar-h, 44px) - 80px));
        min-width:520px; min-height:420px; z-index:2000;
        background:rgba(20,14,6,.96); border:1px solid #c8941a; border-radius:10px;
        font-family:'Cinzel',serif; color:#f4e4b8; box-shadow:0 4px 20px rgba(0,0,0,.6);
        max-width:calc(100vw - 24px); max-height:calc(100vh - 24px); display:flex; flex-direction:column;
        overflow:hidden; resize:both;
        container-type:inline-size; container-name:voyage-panel;
      }
      #voyage-panel::after {
        content:''; position:absolute; right:3px; bottom:3px; width:16px; height:16px;
        background:linear-gradient(135deg, transparent 0 45%, rgba(200,148,26,.45) 46% 52%, transparent 53% 62%, rgba(200,148,26,.6) 63% 70%, transparent 71%);
        pointer-events:none; opacity:.9;
      }
      #voyage-panel .ve-hdr {
        display:flex; justify-content:space-between; align-items:center;
        padding:8px 10px; background:rgba(200,148,26,.18); border-bottom:1px solid #8b6e45;
        font-size:13px; font-weight:600; letter-spacing:.05em;
        cursor:grab; user-select:none; flex-shrink:0;
      }
      #voyage-panel .ve-hdr.dragging { cursor:grabbing; }
      #voyage-panel .ve-close {
        background:none; border:none; color:#c8a96e; font-size:14px; cursor:pointer; padding:0 4px;
      }
      #voyage-panel .ve-close:hover { color:#e8b840; }
      #voyage-panel .ve-tabs {
        display:flex; border-bottom:1px solid #8b6e45; background:rgba(0,0,0,.25); flex-shrink:0;
      }
      #voyage-panel .ve-position-dock {
        flex-shrink:0; padding:10px; border-bottom:1px solid rgba(139,110,69,.65);
        background:linear-gradient(180deg, rgba(28,18,7,.96), rgba(18,12,3,.96));
      }
      /* Stacked by default; widen to three columns when the PANEL (not the
         viewport) is wide enough — the panel is user-resizable. */
      #voyage-panel .ve-position-card {
        display:grid; grid-template-columns:1fr;
        gap:10px; align-items:center; padding:9px 10px; border:1px solid rgba(200,148,26,.38);
        border-radius:10px; background:rgba(0,0,0,.22); box-shadow:inset 0 0 0 1px rgba(255,232,170,.04);
      }
      @container voyage-panel (min-width: 700px){
        #voyage-panel .ve-position-card { grid-template-columns:minmax(200px,1.2fr) minmax(260px,2fr) auto; }
        #voyage-panel .ve-position-card.idle { grid-template-columns:1fr auto; }
      }
      #voyage-panel .ve-position-title { min-width:0; }
      #voyage-panel .ve-position-ship {
        font-size:14px; color:#f4e4b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      }
      #voyage-panel .ve-position-route {
        margin-top:2px; color:#e8b840; font-family:Georgia,serif; font-size:12px; line-height:1.25;
      }
      #voyage-panel .ve-position-meta {
        display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; min-width:0;
      }
      #voyage-panel .ve-position-chip {
        background:#0d0600; border:1px solid #4a3518; border-radius:8px; padding:5px 7px;
        font-family:Georgia,serif; min-width:0;
      }
      #voyage-panel .ve-position-chip b {
        display:block; color:#f4e4b8; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
      }
      #voyage-panel .ve-position-chip span {
        display:block; color:#c8a96e; text-transform:uppercase; letter-spacing:.08em; font-size:8px; margin-top:1px;
      }
      #voyage-panel .ve-position-actions { display:flex; gap:6px; align-items:center; justify-content:flex-end; }
      #voyage-panel .ve-position-actions .ve-btn { width:auto; margin:0; white-space:nowrap; padding:5px 8px; font-size:9px; }
      #voyage-panel .ve-progress-track {
        grid-column:1 / -1; height:5px; background:#0d0600; border:1px solid #4a3518; border-radius:999px; overflow:hidden;
      }
      #voyage-panel .ve-progress-fill { height:100%; background:linear-gradient(90deg,#9c5b18,#e8b840); width:0%; }
      @media (max-width:760px){
        #voyage-panel { left:12px; right:12px; width:auto; min-width:0; }
      }
      @container voyage-panel (max-width: 699px){
        #voyage-panel .ve-position-meta { grid-template-columns:1fr 1fr; }
        #voyage-panel .ve-position-actions { justify-content:flex-start; flex-wrap:wrap; }
      }
      /* Setup pane: two columns when the panel is wide (ship/crew/date left,
         itinerary planner right); single column when narrow. */
      #voyage-panel .ve-setup-grid { display:grid; grid-template-columns:1fr; gap:0 18px; align-items:start; }
      @container voyage-panel (min-width: 680px){
        #voyage-panel .ve-setup-grid { grid-template-columns:minmax(230px,1fr) minmax(300px,1.35fr); }
      }
      #voyage-panel .ve-setup-grid > div > .ve-lbl:first-child { margin-top:0; }
      #voyage-panel .ve-tab {
        flex:1; padding:7px 4px; background:none; border:none; color:#8b6e45;
        font-family:'Cinzel',serif; font-size:10px; letter-spacing:.08em; cursor:pointer;
        text-transform:uppercase; border-bottom:2px solid transparent; transition:all .12s;
      }
      #voyage-panel .ve-tab:hover { color:#c8a96e; background:rgba(200,148,26,.06); }
      #voyage-panel .ve-tab.active {
        color:#e8b840; border-bottom-color:#c8941a; background:rgba(200,148,26,.1);
      }
      #voyage-panel .ve-pane { display:none; padding:10px; overflow-y:auto; flex:1; min-height:0; }
      #voyage-panel .ve-pane.active { display:block; }
      #voyage-panel .ve-pane::-webkit-scrollbar { width:4px; }
      #voyage-panel .ve-pane::-webkit-scrollbar-thumb { background:#5a3a0a; border-radius:2px; }
      #voyage-panel .ve-lbl {
        display:block; font-size:9px; letter-spacing:.12em; text-transform:uppercase;
        color:#c8941a; margin:8px 0 3px; font-family:'Cinzel',serif;
      }
      #voyage-panel .ve-lbl:first-child { margin-top:0; }
      #voyage-panel .ve-input, #voyage-panel .ve-select {
        width:100%; background:#0d0600; border:1px solid #5a3a0a; color:#f4e4b8;
        padding:5px 7px; font-size:12px; border-radius:2px; outline:none; font-family:Georgia,serif;
      }
      #voyage-panel .ve-input:focus, #voyage-panel .ve-select:focus { border-color:#c8941a; }
      #voyage-panel .ve-row { display:flex; gap:6px; }
      #voyage-panel .ve-row > * { flex:1; min-width:0; }
      #voyage-panel .ve-btn {
        width:100%; padding:6px; margin-top:6px; background:rgba(200,148,26,.1);
        border:1px solid #5a3a0a; color:#f4e4b8; font-family:'Cinzel',serif;
        font-size:11px; letter-spacing:.05em; cursor:pointer; border-radius:2px; transition:all .14s;
      }
      #voyage-panel .ve-btn:hover { background:rgba(200,148,26,.25); border-color:#c8941a; color:#e8b840; }
      #voyage-panel .ve-btn.primary { border-color:#883311; color:#ff8855; background:rgba(180,50,20,.12); }
      #voyage-panel .ve-btn.primary:hover { background:rgba(180,50,20,.28); border-color:#cc4422; }
      #voyage-panel .ve-btn.danger { border-color:#661111; color:#ff5544; }
      #voyage-panel .ve-btn:disabled { opacity:.4; cursor:not-allowed; }
      #voyage-panel .ve-status {
        font-size:10px; color:#c8a96e; padding:6px 8px; margin-top:8px;
        background:rgba(0,0,0,.3); border-left:2px solid #5a3a0a; font-family:Georgia,serif;
        line-height:1.4;
      }
      #voyage-panel .ve-help {
        font-size:10px; color:#c8a96e; padding:7px 8px; margin:4px 0 8px;
        background:rgba(200,148,26,.07); border:1px solid rgba(200,148,26,.18);
        border-radius:6px; font-family:Georgia,serif; line-height:1.35;
      }
      #voyage-panel .ve-advanced-route {
        margin-top:8px; padding:6px 8px; border:1px solid rgba(200,148,26,.18);
        border-radius:6px; background:rgba(0,0,0,.18); color:#c8a96e; font-size:10px;
      }
      #voyage-panel .ve-advanced-route summary { cursor:pointer; color:#d9b76f; }
      #voyage-panel .ve-route-summary {
        padding:5px 6px; margin-bottom:4px; color:#e8b840; background:rgba(200,148,26,.08);
        border-bottom:1px solid rgba(200,148,26,.18); font-size:10px;
      }
      #voyage-panel .ve-legs {
        margin:6px 0; font-size:11px; font-family:Georgia,serif;
        max-height:140px; overflow-y:auto;
      }
      #voyage-panel .ve-leg {
        display:flex; justify-content:space-between; align-items:center;
        padding:4px 6px; border-bottom:1px solid rgba(200,148,26,.12); gap:6px;
      }
      #voyage-panel .ve-leg:last-child { border-bottom:0; }
      #voyage-panel .ve-leg-text { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; }
      #voyage-panel .ve-leg-text small { color:#c8a96e; font-size:10px; }
      #voyage-panel .ve-leg-x {
        background:none; border:none; color:#aa4422; cursor:pointer; font-size:14px;
        padding:0 3px; line-height:1;
      }
      #voyage-panel .ve-leg-x:hover { color:#ff6644; }
      #voyage-panel .ve-log {
        font-size:11px; font-family:Georgia,serif; line-height:1.4;
      }
      #voyage-panel .ve-log-day {
        border-top:1px solid #5a3a0a; padding:6px 0; margin-top:6px;
      }
      #voyage-panel .ve-log-day:first-child { border-top:0; margin-top:0; }
      #voyage-panel .ve-log-hdr { color:#e8b840; font-family:'Cinzel',serif; font-size:11px; letter-spacing:.04em; }
      #voyage-panel .ve-log-sub { color:#c8a96e; font-size:10px; margin-top:2px; }
      #voyage-panel .ve-log-evt { color:#f4e4b8; margin-top:3px; padding-left:8px; }
      #voyage-panel .ve-log-evt.damage { color:#ff7755; }
      #voyage-panel .ve-log-evt.port   { color:#55cc88; }
      #voyage-panel .ve-warn { color:#ff9944; font-size:10px; font-style:italic; margin-top:4px; }
      #voyage-panel .ve-diagnostic {
        margin-top:8px; padding:6px 8px; border:1px solid rgba(200,148,26,.22);
        border-radius:8px; background:rgba(18,12,3,.38); color:#c8a96e; font-size:10px;
      }
      #voyage-panel .ve-diagnostic summary {
        cursor:pointer; color:#d9b76f; font-family:'Cinzel',serif; letter-spacing:.04em;
      }
      #voyage-panel .ve-diagnostic div { margin-top:5px; line-height:1.35; font-style:italic; }
      #voyage-panel .ve-port-help { font-style:italic; margin-bottom:4px; }
      #voyage-panel .ve-port-row {
        display:flex; align-items:center; gap:8px; padding:3px 2px; font-style:normal;
        border-bottom:1px solid rgba(200,148,26,.1);
      }
      #voyage-panel .ve-port-row:last-child { border-bottom:0; }
      #voyage-panel .ve-port-name { flex:1; min-width:0; color:#f4e4b8; font-family:Georgia,serif; font-size:11px; }
      #voyage-panel .ve-port-status { color:#c8a96e; font-size:10px; white-space:nowrap; }
      #voyage-panel .ve-port-status.landmark { color:#77cc88; }
      #voyage-panel .ve-port-status.placed { color:#88ccee; }
      #voyage-panel .ve-port-status.missing { color:#ff9944; }
      #voyage-panel .ve-port-btns { display:flex; gap:4px; }
      #voyage-panel .ve-mini {
        background:rgba(200,148,26,.1); border:1px solid #5a3a0a; color:#f4e4b8;
        font-family:'Cinzel',serif; font-size:9px; letter-spacing:.04em;
        padding:2px 7px; cursor:pointer; border-radius:2px;
      }
      #voyage-panel .ve-mini:hover { background:rgba(200,148,26,.25); border-color:#c8941a; color:#e8b840; }
      #voyage-panel .ve-mini.danger { border-color:#661111; color:#ff5544; }
      body.ve-placing-port #map-wrap { cursor:crosshair !important; }

      /* Toolbar button */
      #btn-voyage.active { background:rgba(100,180,220,.22); color:#aaddff; border-color:#4488aa; }

      /* Map overlays */
      #voyage-overlay { pointer-events:none; }
      #voyage-overlay .voyage-route-halo,
      #voyage-overlay .voyage-route-fallback-halo {
        fill:none; stroke:#f8f1d2; stroke-width:4.2; stroke-linecap:round;
        stroke-linejoin:round; stroke-dasharray:7,5; opacity:.82;
      }
      #voyage-overlay .voyage-route {
        fill:none; stroke:#164f9a; stroke-width:2.15; stroke-linecap:round;
        stroke-linejoin:round; stroke-dasharray:7,5; opacity:.96;
      }
      #voyage-overlay .voyage-route-fallback {
        fill:none; stroke:#cc3322; stroke-width:2; stroke-linecap:round;
        stroke-linejoin:round; stroke-dasharray:6,4; opacity:.9;
      }
      #voyage-overlay .voyage-trail {
        fill:none; stroke:#88ccee; stroke-width:1; opacity:.55;
      }
      #voyage-overlay .voyage-ship {
        font-size:14px; text-anchor:middle; dominant-baseline:central;
        fill:#ffeebb; stroke:#1a0f03; stroke-width:.4; paint-order:stroke;
      }
      #voyage-overlay .voyage-port {
        fill:#44aadd; stroke:#1a0f03; stroke-width:.5;
      }
    `;
    document.head.appendChild(s);
  }

  // ── UI: PANEL CONSTRUCTION ────────────────────────────────────────────────
  function buildPanel(){
    const p = document.createElement('div');
    p.id = 'voyage-panel';
    p.innerHTML = `
      <div class="ve-hdr">
        <span>⚓ Voyage Simulator</span>
        <button class="ve-close" title="Exit (Esc)">✕</button>
      </div>
      <div class="ve-tabs">
        <button class="ve-tab active" data-tab="setup">Setup</button>
        <button class="ve-tab" data-tab="voyage">Voyage</button>
        <button class="ve-tab" data-tab="log">Log</button>
      </div>
      <div class="ve-position-dock" id="ve-position-dock"></div>
      <div class="ve-pane active" id="ve-pane-setup">${setupPaneHTML()}</div>
      <div class="ve-pane" id="ve-pane-voyage">${voyagePaneHTML()}</div>
      <div class="ve-pane" id="ve-pane-log"><div class="ve-log" id="ve-log"></div></div>
    `;
    document.body.appendChild(p);
    state.panelEl = p;

    // Drag
    if (typeof window.makeDraggable === 'function'){
      const hdr = p.querySelector('.ve-hdr');
      state.veDrag = window.makeDraggable(p, hdr, 'gh-voyage-pos');
      state.veDrag.restore();
    }

    // Size persistence: makeDraggable only saves x/y, so a resized panel
    // snapped back to defaults on refresh. Restore, then track via
    // ResizeObserver (debounced) under gh-voyage-size.
    try {
      const SZ = 'gh-voyage-size';
      const sz = JSON.parse(localStorage.getItem(SZ) || 'null');
      if (sz && sz.w >= 520 && sz.h >= 420){
        p.style.width  = Math.min(sz.w, window.innerWidth  - 24) + 'px';
        p.style.height = Math.min(sz.h, window.innerHeight - 24) + 'px';
      }
      if (typeof ResizeObserver === 'function'){
        let szT = null;
        new ResizeObserver(() => {
          clearTimeout(szT);
          szT = setTimeout(() => {
            try { localStorage.setItem(SZ, JSON.stringify({ w:p.offsetWidth, h:p.offsetHeight })); }
            catch (err){ /* ignore */ }
          }, 250);
        }).observe(p);
      }
    } catch (err){ /* ignore */ }

    p.querySelector('.ve-close').onclick = exit;
    p.querySelectorAll('.ve-tab').forEach(t =>
      t.onclick = () => setActiveTab(t.dataset.tab));
    p.querySelector('#ve-position-dock')?.addEventListener('click', e => {
      const action = e.target?.closest?.('[data-ve-pos-action]')?.dataset?.vePosAction;
      if (action === 'center') centerMapOnShip();
      if (action === 'route') setActiveTab('setup');
      if (action === 'log') setActiveTab('log');
    });

    wireSetupPane();
    renderPositionHeader();
    wireVoyagePane();
  }

  // Setup pane: captain, ship, crew, route planner.
  function setupPaneHTML(){
    const availablePorts = Object.keys(PORTS).filter(portAvailable);
    const missingPorts   = Object.keys(PORTS).filter(n => !portAvailable(n));
    const portOpts = availablePorts.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
    const shipOpts = SHIP_TEMPLATES.map(s =>
      `<option value="${s.id}">${esc(s.name)} (${s.dailySail} mi/d${s.dailyOar ? ` sail / ${s.dailyOar} oar` : ''}, ${s.hull} HP)</option>`).join('');
    const monthOpts = MONTHS.map((m,i) => `<option value="${i}">${esc(m)}</option>`).join('');
    const waterOpts = WATER_TYPES.map(w => `<option value="${w.id}">${esc(w.label)}</option>`).join('');

    return `
      <div class="ve-setup-grid">
      <div>
      <label class="ve-lbl">Captain Name</label>
      <input class="ve-input" id="ve-capt" type="text" value="Captain" maxlength="40">

      <label class="ve-lbl">Ship</label>
      <select class="ve-select" id="ve-ship">${shipOpts}</select>

      <div class="ve-row">
        <div>
          <label class="ve-lbl">Daily Sail (mi)</label>
          <input class="ve-input" id="ve-speed" type="number" min="1" max="120" value="36">
        </div>
        <div>
          <label class="ve-lbl">Hull HP</label>
          <input class="ve-input" id="ve-hull" type="number" min="1" max="80" value="21">
        </div>
      </div>

      <div class="ve-row">
        <div>
          <label class="ve-lbl">Crew Quality</label>
          <select class="ve-select" id="ve-crew">
            <option value="green">Green (−2)</option>
            <option value="average" selected>Average (0)</option>
            <option value="experienced">Experienced (+1)</option>
            <option value="veteran">Veteran (+2)</option>
          </select>
        </div>
        <div>
          <label class="ve-lbl">Nav Skill</label>
          <input class="ve-input" id="ve-nav" type="number" min="1" max="20" value="12">
        </div>
      </div>

      <div class="ve-row">
        <div>
          <label class="ve-lbl">Start Day</label>
          <input class="ve-input" id="ve-sday" type="number" min="1" max="28" value="1">
        </div>
        <div>
          <label class="ve-lbl">Month</label>
          <select class="ve-select" id="ve-smonth">${monthOpts}</select>
        </div>
        <div>
          <label class="ve-lbl">Year CY</label>
          <input class="ve-input" id="ve-syear" type="number" min="1" max="999" value="576">
        </div>
      </div>
      </div>
      <div>
      <label class="ve-lbl">Itinerary Planner</label>
      <div class="ve-help">Choose a start port and final destination, then use <b>Plan Route</b> for the shortest known port chain. Use <b>Add Stop to Itinerary</b> only when you want to force a manual stopover.</div>

      <label class="ve-lbl">Start / Current Port</label>
      <select class="ve-select" id="ve-from">${portOpts}</select>
      <label class="ve-lbl">Final Destination</label>
      <select class="ve-select" id="ve-final">${portOpts}</select>
      <button class="ve-btn primary" id="ve-planroute">Plan Route</button>

      <details class="ve-advanced-route">
        <summary>Manual stopover / advanced leg tools</summary>
        <label class="ve-lbl">Next Stop</label>
        <select class="ve-select" id="ve-to"></select>
        <label class="ve-lbl">Water Type for Next Segment</label>
        <select class="ve-select" id="ve-water">${waterOpts}</select>
        <button class="ve-btn" id="ve-addleg">Add Stop to Itinerary</button>
      </details>

      <label class="ve-lbl">Planned Itinerary</label>
      <div class="ve-legs" id="ve-legs"></div>
      <div class="ve-row">
        <button class="ve-btn danger" id="ve-clearroute">Clear</button>
        <button class="ve-btn primary" id="ve-start">Start Voyage</button>
      </div>
      </div>
      </div>

      ${(() => {
        const rows = Object.keys(PORTS).map(n => {
          const src = portSource(n);
          const status = src === 'landmark' ? '✓ landmark'
            : src === 'placed' ? `📍 ${esc(hexLabel(portOverrideHex(n)))}`
            : '— not placed';
          const btns = src === 'landmark' ? ''
            : src === 'placed'
              ? `<button class="ve-mini" data-place-port="${esc(n)}">Re-place</button><button class="ve-mini danger" data-clear-port="${esc(n)}" title="Clear placed hex">✕</button>`
              : `<button class="ve-mini" data-place-port="${esc(n)}">Place</button>`;
          return `<div class="ve-port-row"><span class="ve-port-name">${esc(n)}</span><span class="ve-port-status ${src || 'missing'}">${status}</span><span class="ve-port-btns">${btns}</span></div>`;
        }).join('');
        const located = Object.keys(PORTS).length - missingPorts.length;
        return `<details class="ve-diagnostic" ${missingPorts.length ? 'open' : ''}>
          <summary>Port setup: ${located} of ${Object.keys(PORTS).length} ports located${missingPorts.length ? ` · ${missingPorts.length} missing` : ''}</summary>
          <div class="ve-port-help">Ports resolve from 🧰 Hex → Landmarks by name. A port with no landmark can be placed by hand: click <b>Place</b>, then click its hex on the Darlene map. Placed hexes are stored locally and a landmark added later takes precedence.</div>
          ${rows}
        </details>`;
      })()}

      <div class="ve-status" id="ve-status">Plan an itinerary, then Start Voyage. Active voyages and planned routes now persist after refresh.</div>
    `;
  }

  function hexLabel(pos){
    if (!pos) return '—';
    try { if (typeof hexIdStr === 'function') return hexIdStr(pos.col, pos.row); }
    catch (err){ /* ignore */ }
    return `${pos.col}, ${pos.row}`;
  }

  function remainingVoyageMiles(v=state.voyage){
    if (!v?.legs?.length) return 0;
    if (v.finished || v.shipSank) return 0;
    const p = currentLegProgress(v);
    const future = v.legs.slice(Number(v.currentLegIdx || 0) + 1)
      .reduce((sum, l) => sum + Number(l.distance || 0), 0);
    return Math.max(0, Math.round(Number(p.milesRemainingOnLeg || 0) + future));
  }

  function linkedShipName(v=state.voyage){
    try {
      const link = window.GCCVoyageFinance?.getLink?.() || {};
      const fs = window.GCCFinance?.getState?.();
      const asset = fs?.assets?.find?.(a => a.id === link.assetId);
      if (asset?.name) return asset.name;
    } catch (err){ /* ignore */ }
    return v?.shipType || 'Ship';
  }

  function positionHeaderHTML(){
    const v = state.voyage;
    if (!v){
      const planned = state.routeLegs?.length ? voyageRouteLabel({ legs:state.routeLegs }) : '';
      const start = state.panelEl?.querySelector('#ve-from')?.value || '';
      const startHex = start ? portHex(start) : null;
      return `<div class="ve-position-card idle">
        <div class="ve-position-title">
          <div class="ve-position-ship">⚓ No active voyage</div>
          <div class="ve-position-route">${planned ? `Planned route: ${esc(planned)}` : (start ? `Current planner port: ${esc(start)}` : 'Plan an itinerary on the Setup tab.')}</div>
        </div>
        <div class="ve-position-actions">
          <button class="ve-btn" data-ve-pos-action="route">Route Planner</button>
          <button class="ve-btn" data-ve-pos-action="center" ${startHex ? '' : 'disabled'}>Center Map</button>
        </div>
      </div>`;
    }
    updateVoyageLocation('position-header');
    const loc = voyageCurrentLocation(v) || {};
    const leg = currentLeg(v);
    const pos = loc.currentHex || shipHexPosition();
    const remaining = remainingVoyageMiles(v);
    const eta = (!v.finished && !v.shipSank && Number(v.dailySail || 0) > 0)
      ? Math.max(1, Math.ceil(remaining / Number(v.dailySail || 1)))
      : 0;
    const total = Math.max(1, Number(v.totalDistance || 0));
    const pct = v.finished ? 100 : Math.max(0, Math.min(100, Math.round(Number(v.distanceCovered || 0) / total * 100)));
    const status = v.shipSank ? 'Sunk' : v.finished ? 'Arrived' : loc.mode === 'underway' ? 'Underway' : 'Docked';
    const legMeta = leg ? `${Math.round(Number(v.milesOnLeg || 0))}/${Number(leg.distance || 0)} mi` : '—';
    return `<div class="ve-position-card ${esc(loc.mode || '')}">
      <div class="ve-position-title">
        <div class="ve-position-ship">${loc.mode === 'underway' ? '🚢' : loc.mode === 'arrived' ? '⚓' : loc.mode === 'sunk' ? '☠' : '⚓'} ${esc(linkedShipName(v))}</div>
        <div class="ve-position-route">${esc(loc.label || voyageRouteLabel(v) || 'At sea')}</div>
      </div>
      <div class="ve-position-meta">
        <div class="ve-position-chip"><b>${esc(status)}</b><span>Status</span></div>
        <div class="ve-position-chip"><b>${esc(v.currentDate || formatDate(v.calendar))}</b><span>Date</span></div>
        <div class="ve-position-chip"><b>${esc(hexLabel(pos))}</b><span>Current Hex</span></div>
        <div class="ve-position-chip"><b>${esc(legMeta)}</b><span>Current Leg</span></div>
        <div class="ve-position-chip"><b>${remaining} mi</b><span>Remaining</span></div>
        <div class="ve-position-chip"><b>${eta ? `${eta} day${eta === 1 ? '' : 's'}` : '—'}</b><span>ETA</span></div>
      </div>
      <div class="ve-position-actions">
        <button class="ve-btn" data-ve-pos-action="center" ${pos ? '' : 'disabled'}>Center Map on Ship</button>
        <button class="ve-btn" data-ve-pos-action="route">Show Route</button>
        <button class="ve-btn" data-ve-pos-action="log">Open Log</button>
      </div>
      <div class="ve-progress-track"><div class="ve-progress-fill" style="width:${pct}%"></div></div>
    </div>`;
  }

  function renderPositionHeader(){
    const dock = state.panelEl?.querySelector('#ve-position-dock');
    if (!dock) return;
    dock.innerHTML = positionHeaderHTML();
  }

  function centerMapOnShip(){
    const v = state.voyage;
    const pos = v ? (voyageCurrentLocation(v)?.currentHex || shipHexPosition()) : portHex(state.panelEl?.querySelector('#ve-from')?.value || '');
    if (!pos){ setStatus('No ship position is available to center on yet.', 'warn'); return; }
    if (typeof centerOnHex === 'function'){
      centerOnHex(pos.col, pos.row);
      renderShip();
      renderRouteOverlay();
      renderTrailOverlay();
      setStatus(`Centered map on ${v ? 'ship' : 'planner port'} at ${hexLabel(pos)}.`);
    } else {
      setStatus('Map centering helper is unavailable on this page.', 'warn');
    }
  }

  function voyagePaneHTML(){
    return `
      <div id="ve-voyage-body">
        <div class="ve-status">No active voyage. Build a route on the Setup tab.</div>
      </div>
    `;
  }

  function wireSetupPane(){
    const p = state.panelEl;
    const fromSel  = p.querySelector('#ve-from');
    const shipSel  = p.querySelector('#ve-ship');
    const speedInp = p.querySelector('#ve-speed');
    const hullInp  = p.querySelector('#ve-hull');
    const waterSel = p.querySelector('#ve-water');

    shipSel.onchange = () => {
      const s = SHIP_TEMPLATES.find(x => x.id === shipSel.value);
      if (s){ speedInp.value = s.dailySail; hullInp.value = s.hull; }
    };

    const refreshDest = () => {
      const from = fromSel.value;
      const toSel = p.querySelector('#ve-to');
      const port = PORTS[from];
      const prev = toSel.value;
      const dests = port
        ? Object.keys(port.connections).filter(portAvailable)
        : Object.keys(PORTS).filter(n => n !== from && portAvailable(n));
      toSel.innerHTML = dests.map(n => `<option value="${esc(n)}">${esc(n)} (${port?.connections[n] ?? '?'} mi)</option>`).join('');
      if ([...toSel.options].some(o => o.value === prev)) toSel.value = prev;
      // Default water type to the 'from' port's default
      if (port?.defaultWater) waterSel.value = port.defaultWater;
      setFinalDestinationOptions();
    };
    fromSel.onchange = () => { refreshDest(); renderPositionHeader(); };
    refreshDest();

    p.querySelector('#ve-addleg').onclick = addLeg;
    p.querySelector('#ve-planroute').onclick = planRoute;
    p.querySelector('#ve-clearroute').onclick = clearRoute;
    p.querySelector('#ve-start').onclick = startVoyage;
    speedInp.oninput = renderLegsUI;

    p.querySelectorAll('[data-place-port]').forEach(b =>
      b.onclick = () => beginPortPlacement(b.dataset.placePort));
    p.querySelectorAll('[data-clear-port]').forEach(b =>
      b.onclick = () => clearPortPlacement(b.dataset.clearPort));

    renderLegsUI();
  }

  // Rebuild the setup pane (port lists change when a port is placed/cleared)
  // while preserving whatever the user has typed/selected.
  function renderSetupPane(){
    const p = state.panelEl;
    const pane = p?.querySelector('#ve-pane-setup');
    if (!pane) return;
    const keep = {};
    ['ve-capt','ve-ship','ve-speed','ve-hull','ve-crew','ve-nav',
     've-sday','ve-smonth','ve-syear','ve-from','ve-final','ve-to','ve-water']
      .forEach(id => { const el = p.querySelector('#'+id); if (el) keep[id] = el.value; });
    pane.innerHTML = setupPaneHTML();
    wireSetupPane();
    Object.entries(keep).forEach(([id, val]) => {
      const el = p.querySelector('#'+id);
      if (!el) return;
      if (el.tagName === 'SELECT'){
        if ([...el.options].some(o => o.value === val)) el.value = val;
      } else el.value = val;
    });
    p.querySelector('#ve-from')?.dispatchEvent(new Event('change'));
  }

  function wireVoyagePane(){ /* wired per-render via onclick handlers */ }

  // ── UI: TABS ──────────────────────────────────────────────────────────────
  function setActiveTab(tab){
    state.activeTab = tab;
    renderPositionHeader();
    const p = state.panelEl;
    p.querySelectorAll('.ve-tab').forEach(t => t.classList.toggle('active', t.dataset.tab===tab));
    p.querySelectorAll('.ve-pane').forEach(el => el.classList.remove('active'));
    p.querySelector('#ve-pane-'+tab)?.classList.add('active');
    if (tab==='log') renderLog();
    if (tab==='voyage') renderVoyagePane();
  }

  // ── ROUTE PLANNING HELPERS ─────────────────────────────────────────────────
  function waterTypeLabel(id){ return WATER_TYPES.find(w => w.id === id)?.label || id || 'Water'; }

  function estimateDaysForDistance(distance){
    const speed = Math.max(1, Number(state.panelEl?.querySelector('#ve-speed')?.value || state.voyage?.dailySail || 36));
    return Math.max(1, Math.ceil(Number(distance || 0) / speed));
  }

  function routeTotals(legs=state.routeLegs){
    const miles = legs.reduce((sum,l) => sum + Number(l.distance || 0), 0);
    return { miles, days: estimateDaysForDistance(miles) };
  }

  function pathStatus(leg){
    if (leg.path && leg.path.length > 1) return `${leg.path.length} water hexes`;
    return 'straight fallback';
  }

  function availablePortNames(){ return Object.keys(PORTS).filter(portAvailable); }

  function shortestPortPath(from, to){
    if (!from || !to || from === to) return null;
    const allowed = new Set(availablePortNames());
    if (!allowed.has(from) || !allowed.has(to)) return null;
    const dist = new Map([[from, 0]]);
    const prev = new Map();
    const q = new Set([from]);
    while (q.size){
      let cur = null, best = Infinity;
      for (const n of q){ const d = dist.get(n) ?? Infinity; if (d < best){ best=d; cur=n; } }
      q.delete(cur);
      if (cur === to) break;
      const con = PORTS[cur]?.connections || {};
      for (const [next, miles] of Object.entries(con)){
        if (!allowed.has(next)) continue;
        const nd = best + Number(miles || 0);
        if (nd < (dist.get(next) ?? Infinity)){
          dist.set(next, nd); prev.set(next, cur); q.add(next);
        }
      }
    }
    if (!dist.has(to)) return null;
    const path = [to];
    while (path[0] !== from){
      const p = prev.get(path[0]);
      if (!p) return null;
      path.unshift(p);
    }
    return path;
  }

  function makeLeg(from, to, waterType){
    const dist = PORTS[from]?.connections?.[to];
    if (!dist) return null;
    const fromHex = portHex(from), toHex = portHex(to);
    const path = (fromHex && toHex) ? findWaterPath(fromHex, toHex) : null;
    return { from, to, waterType: waterType || PORTS[from]?.defaultWater || 'coastal', distance:dist, path };
  }

  function setFinalDestinationOptions(){
    const p = state.panelEl;
    const fromSel = p?.querySelector('#ve-from');
    const finalSel = p?.querySelector('#ve-final');
    if (!fromSel || !finalSel) return;
    const prev = finalSel.value;
    const from = fromSel.value;
    const opts = availablePortNames().filter(n => n !== from);
    finalSel.innerHTML = opts.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
    if ([...finalSel.options].some(o => o.value === prev)) finalSel.value = prev;
  }

  // ── UI: ROUTE LIST ────────────────────────────────────────────────────────
  function renderLegsUI(){
    const list = state.panelEl.querySelector('#ve-legs');
    if (!list) return;
    if (!state.routeLegs.length){
      list.innerHTML = '<div style="color:#8b6e45;font-style:italic;font-size:11px;padding:6px">No itinerary yet. Choose a start and final destination, then click Plan Route.</div>';
      return;
    }
    const totals = routeTotals();
    const items = state.routeLegs.map((leg,i) => {
      const warn = leg.path && leg.path.length > 1 ? '' : ' · ⚠ no water path';
      return `<div class="ve-leg">
        <span class="ve-leg-text"><b>${i+1}.</b> ${esc(leg.from)} → ${esc(leg.to)}<br><small>${leg.distance} mi · ${esc(waterTypeLabel(leg.waterType))} · ${esc(pathStatus(leg))}${warn}</small></span>
        <button class="ve-leg-x" data-i="${i}" title="Remove segment">✕</button>
      </div>`;
    }).join('');
    list.innerHTML = `
      <div class="ve-route-summary">${state.routeLegs.length} segment${state.routeLegs.length===1?'':'s'} · ${totals.miles} mi · estimated ${totals.days} sailing day${totals.days===1?'':'s'}</div>
      ${items}
    `;
    list.querySelectorAll('.ve-leg-x').forEach(b =>
      b.onclick = () => removeLeg(parseInt(b.dataset.i,10)));
  }

  function setStatus(msg, cls=''){
    const el = state.panelEl?.querySelector('#ve-status');
    if (el){ el.textContent = msg; el.style.color = cls==='warn' ? '#ff9944' : cls==='err' ? '#ff5544' : '#c8a96e'; }
  }

  // ── ACTIONS: ROUTE ────────────────────────────────────────────────────────
  function planRoute(){
    const p = state.panelEl;
    const from = p.querySelector('#ve-from').value;
    const final = p.querySelector('#ve-final').value;
    if (!from || !final || from === final){ setStatus('Pick a different start port and final destination.', 'warn'); return; }
    const names = shortestPortPath(from, final);
    if (!names || names.length < 2){ setStatus(`No known port route from ${from} to ${final}. Try manual stopovers.`, 'warn'); return; }
    const legs = [];
    for (let i=0; i<names.length-1; i++){
      const leg = makeLeg(names[i], names[i+1]);
      if (!leg){ setStatus(`Missing route distance for ${names[i]} → ${names[i+1]}.`, 'err'); return; }
      legs.push(leg);
    }
    state.routeLegs = legs;
    const last = names[names.length - 1];
    p.querySelector('#ve-from').value = last;
    p.querySelector('#ve-from').dispatchEvent(new Event('change'));
    renderLegsUI();
    renderRouteOverlay();
    emitVoyageChanged('route-planned');
    const totals = routeTotals(legs);
    const fallbackCount = legs.filter(l => !l.path || l.path.length < 2).length;
    setStatus(`Planned ${names.join(' → ')} (${totals.miles} mi, about ${totals.days} sailing day${totals.days===1?'':'s'}).${fallbackCount ? ` ⚠ ${fallbackCount} segment${fallbackCount===1?'':'s'} need painted water paths.` : ''}`, fallbackCount ? 'warn' : '');
  }

  function addLeg(){
    const p = state.panelEl;
    const from = p.querySelector('#ve-from').value;
    const to   = p.querySelector('#ve-to').value;
    const waterType = p.querySelector('#ve-water').value;
    if (!from || !to || from===to){ setStatus('Pick different origin and destination.', 'warn'); return; }
    const fp = PORTS[from];
    const dist = fp?.connections[to];
    if (!dist){ setStatus('No direct route between those ports.', 'warn'); return; }
    // Pathfind a water route through painted water hexes. Success → ship
    // follows the path; failure → dashed red fallback line + warning toast.
    const leg = makeLeg(from, to, waterType);
    const path = leg?.path || null;
    state.routeLegs.push(leg || { from, to, waterType, distance:dist, path:null });
    // Auto-chain: next leg starts from the port we just arrived at
    p.querySelector('#ve-from').value = to;
    p.querySelector('#ve-from').dispatchEvent(new Event('change'));
    renderLegsUI();
    renderRouteOverlay();
    emitVoyageChanged('route-leg-added');
    if (path){
      setStatus(`Added stop: ${from} → ${to} (${dist} mi, ${path.length} hex route).`);
    } else {
      setStatus(`Added stop: ${from} → ${to} (${dist} mi). ⚠ No water path — paint hexes via 🧰 Hex → Paint.`, 'warn');
    }
  }

  function removeLeg(i){
    state.routeLegs.splice(i,1);
    renderLegsUI();
    renderRouteOverlay();
    emitVoyageChanged('route-leg-removed');
  }

  function clearRoute(){
    state.routeLegs = [];
    renderLegsUI();
    renderRouteOverlay();
    setStatus('Route cleared.');
    emitVoyageChanged('route-cleared');
  }

  // ── ACTIONS: VOYAGE ──────────────────────────────────────────────────────
  function startVoyage(){
    if (!state.routeLegs.length){ setStatus('Plan an itinerary or add at least one stop first.', 'warn'); return; }
    if (state.voyage && !state.voyage.finished){
      if (!window.confirm('A voyage is already underway. Starting a new one discards its log and pending settlement items. Continue?')) return;
    }
    const p = state.panelEl;
    const shipId = p.querySelector('#ve-ship').value;
    const shipTpl = SHIP_TEMPLATES.find(s => s.id===shipId) || SHIP_TEMPLATES[0];
    const hullMax   = parseInt(p.querySelector('#ve-hull').value,10)  || shipTpl.hull;
    const dailySail = parseInt(p.querySelector('#ve-speed').value,10) || shipTpl.dailySail;
    const crew      = p.querySelector('#ve-crew').value || 'average';
    const navSkill  = parseInt(p.querySelector('#ve-nav').value,10)   || 12;
    const sd = parseInt(p.querySelector('#ve-sday').value,10)    || 1;
    const sm = parseInt(p.querySelector('#ve-smonth').value,10)  || 0;
    const sy = parseInt(p.querySelector('#ve-syear').value,10)   || 576;

    let cum = 0;
    // Recompute water paths in case user painted more water since adding legs.
    state.routeLegs.forEach(leg => {
      const fh = portHex(leg.from), th = portHex(leg.to);
      if (fh && th) leg.path = findWaterPath(fh, th);
    });
    const legs = state.routeLegs.map(l => { cum += l.distance; return { ...l, cumDist:cum }; });

    const startCalendar = { day:sd, month:sm, year:sy };
    state.voyage = {
      captain: p.querySelector('#ve-capt').value || 'Captain',
      shipId,
      shipType: shipTpl.name,
      hullMax, hullCurrent: hullMax,
      dailySail,
      dailyOar: Number(shipTpl.dailyOar || 0),
      crewQuality: crew,
      crewMod: CREW_QUALITY_MOD[crew] ?? 0,
      navSkill,
      calendar: { ...startCalendar },
      startCalendar,
      startDate: formatDate(startCalendar),
      currentDate: formatDate(startCalendar),
      arrivalDate: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      legs,
      totalDistance: cum,
      distanceCovered: 0,
      currentLegIdx: 0,
      milesOnLeg: 0,
      dayNumber: 0,
      finished: false,
      shipSank: false,
      log: [],
      hexTrail: [],
      hullDamageTaken: 0,
      settlement: { pending:[], posted:[], notes:[], repairGpPerHull:REPAIR_GP_PER_HULL },
    };
    updateVoyageLocation('voyage-started');
    setStatus(`Voyage started — ${state.voyage.shipType} sailing ${legs[0].from} → ${legs[legs.length-1].to}.`);
    setActiveTab('voyage');
    renderShip();
    renderRouteOverlay();
    emitVoyageChanged('voyage-started');
  }

  function advanceDay(){
    const entry = simulateOneDay();
    if (!entry){ setStatus('Voyage is over.', 'warn'); return; }
    renderShip();
    renderTrailOverlay();
    renderVoyagePane();
    // Auto-switch to Log if an interesting event happened
    if (entry.events.some(e => ['port','damage','encounter'].includes(e.type))){
      // Stay on voyage tab but re-render log in background
    }
  }

  function advanceMany(n){
    for (let i=0;i<n && state.voyage && !state.voyage.finished; i++) simulateOneDay();
    renderShip();
    renderTrailOverlay();
    renderVoyagePane();
  }

  function endVoyage(){
    if (!state.voyage) return;
    if (!window.confirm('End current voyage? The active voyage state will be cleared, but the planned itinerary remains.')) return;
    state.voyage = null;
    saveVoyageState();
    clearVoyageOverlays();
    renderRouteOverlay();
    renderVoyagePane();
    setStatus('Voyage ended.');
  }

  // ── UI: VOYAGE PANE RENDER ────────────────────────────────────────────────
  function renderVoyagePane(){
    renderPositionHeader();
    const body = state.panelEl?.querySelector('#ve-voyage-body');
    if (!body) return;
    const v = state.voyage;
    if (!v){
      body.innerHTML = '<div class="ve-status">No active voyage. Build a route on the Setup tab.</div>';
      renderPositionHeader();
      return;
    }
    updateVoyageLocation('render');
    renderPositionHeader();
    const leg = v.legs[v.currentLegIdx];
    const loc = voyageCurrentLocation(v);
    const legTxt = leg
      ? `${esc(leg.from)} → ${esc(leg.to)} (${Math.round(v.milesOnLeg)}/${leg.distance} mi · ${esc(waterTypeLabel(leg.waterType))})`
      : 'At destination';
    const hullPct = Math.round((v.hullCurrent/v.hullMax)*100);
    const hullCol = hullPct<25 ? '#ff5544' : hullPct<50 ? '#ff9944' : '#77cc88';
    const statusLine = v.shipSank ? '<b style="color:#ff5544">☠ SHIP SANK</b>'
                     : v.finished ? '<b style="color:#55cc88">✓ VOYAGE COMPLETE</b>'
                     : `Day ${v.dayNumber} · ${esc(formatDate(v.calendar))}`;
    body.innerHTML = `
      <div style="font-family:'Cinzel',serif;font-size:11px;color:#e8b840;letter-spacing:.04em;margin-bottom:4px">${statusLine}</div>
      <div style="font-family:Georgia,serif;font-size:11px;color:#c8a96e;margin-bottom:8px">
        Captain ${esc(v.captain)} · ${esc(v.shipType)}
      </div>
      <label class="ve-lbl">Current Location</label>
      <div style="font-size:12px;font-family:Georgia,serif;color:#f4e4b8">${esc(loc?.label || '—')}${loc?.note ? ` <span style="color:#c8a96e">(${esc(loc.note)})</span>` : ''}</div>
      <label class="ve-lbl">Current Leg</label>
      <div style="font-size:12px;font-family:Georgia,serif;color:#f4e4b8">${legTxt}</div>
      <label class="ve-lbl">Dates</label>
      <div style="font-size:11px;font-family:Georgia,serif;color:#c8a96e">Started ${esc(v.startDate || '')} · Current ${esc(v.currentDate || formatDate(v.calendar))}${v.arrivalDate ? ` · Arrived ${esc(v.arrivalDate)}` : ''}</div>
      <label class="ve-lbl">Progress</label>
      <div style="font-size:12px;font-family:Georgia,serif">${v.distanceCovered} / ${v.totalDistance} mi  <span style="color:#c8a96e">(${v.totalDistance>0 ? Math.round(v.distanceCovered/v.totalDistance*100) : 0}%)</span></div>
      <label class="ve-lbl">Hull</label>
      <div style="font-size:12px;font-family:Georgia,serif;color:${hullCol}">${v.hullCurrent} / ${v.hullMax} HP (${hullPct}%)</div>
      ${(() => { const sum = getVoyageSummary(v); return sum?.pendingCount ? `<div class="ve-status" style="margin-top:8px">Settlement: ${sum.pendingCount} pending finance item${sum.pendingCount===1?'':'s'} · repairs ${sum.pendingRepairGp} gp</div>` : ''; })()}
      <div class="ve-row" style="margin-top:10px">
        <button class="ve-btn primary" id="ve-advance" ${v.finished?'disabled':''}>Advance 1 Day</button>
        <button class="ve-btn" id="ve-advance7" ${v.finished?'disabled':''}>+7 Days</button>
      </div>
      <button class="ve-btn danger" id="ve-end">End Voyage</button>
      ${v.log.length ? `<div class="ve-status" style="margin-top:10px">Last: ${esc(v.log[v.log.length-1].date)} · ${v.log[v.log.length-1].miles} mi · ${esc(v.log[v.log.length-1].speedInfo.note)}</div>` : ''}
    `;
    body.querySelector('#ve-advance')?.addEventListener('click', advanceDay);
    body.querySelector('#ve-advance7')?.addEventListener('click', () => advanceMany(7));
    body.querySelector('#ve-end')?.addEventListener('click', endVoyage);
  }

  // ── UI: LOG PANE RENDER ───────────────────────────────────────────────────
  function renderLog(){
    const el = state.panelEl?.querySelector('#ve-log');
    if (!el) return;
    const v = state.voyage;
    if (!v || !v.log.length){ el.innerHTML = '<div style="color:#8b6e45;font-style:italic;font-size:11px">No voyage log yet.</div>'; return; }
    el.innerHTML = v.log.slice().reverse().map(e => {
      const evt = e.events.map(x => `<div class="ve-log-evt ${esc(x.type)}">${esc(x.text)}</div>`).join('');
      return `<div class="ve-log-day">
        <div class="ve-log-hdr">Day ${e.day} · ${esc(e.date)}</div>
        <div class="ve-log-sub">${esc(e.weather.wind.force || 'Wind')} ${e.weather.wind.speed} mph ${esc(e.weather.wind.direction)} · ${esc(e.weather.sky)} · ${esc(e.weather.precipitation.type)}</div>
        <div class="ve-log-sub">Sailed ${e.miles} mi (total ${e.distTotal}) · ${esc(e.location?.label || '')}</div>
        ${evt}
      </div>`;
    }).join('');
  }

  // ── MAP OVERLAYS ──────────────────────────────────────────────────────────
  function ensureOverlay(){
    // buildHexGrid() does svg.innerHTML='' — a hex edit (rebuildGrid) leaves
    // state.overlayG pointing at a detached node and the ship silently
    // disappears. Recreate whenever the group is no longer in the document.
    if (state.overlayG && state.overlayG.isConnected) return state.overlayG;
    state.overlayG = null;
    const svg = document.getElementById('hex-svg');
    if (!svg) return null;
    const ns = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(ns, 'g');
    g.id = 'voyage-overlay';
    svg.appendChild(g);
    state.overlayG = g;
    return g;
  }

  function clearVoyageOverlays(){
    if (state.overlayG){ state.overlayG.remove(); state.overlayG = null; }
  }

  function renderShip(){
    const g = ensureOverlay();
    if (!g) return;
    g.querySelectorAll('.voyage-ship').forEach(el => el.remove());
    const pos = shipHexPosition();
    if (!pos || typeof hexCenterDisplay!=='function' || typeof mapToStage!=='function') return;
    const c = hexCenterDisplay(pos.col, pos.row);
    const s = mapToStage(c.x, c.y);
    const ns = 'http://www.w3.org/2000/svg';
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('class', 'voyage-ship');
    t.setAttribute('x', s.x.toFixed(1));
    t.setAttribute('y', s.y.toFixed(1));
    t.textContent = '⛵';
    g.appendChild(t);
  }

  function renderRouteOverlay(){
    const g = ensureOverlay();
    if (!g) return;
    g.querySelectorAll('.voyage-route, .voyage-route-halo, .voyage-route-fallback, .voyage-route-fallback-halo, .voyage-port').forEach(el => el.remove());
    const legs = state.voyage ? state.voyage.legs : state.routeLegs;
    if (!legs.length){ if (!state.voyage) clearVoyageOverlays(); return; }
    const ns = 'http://www.w3.org/2000/svg';
    const hexToScreen = h => {
      const c = hexCenterDisplay(h.col, h.row);
      return mapToStage(c.x, c.y);
    };
    // Port dots at each leg endpoint
    const drawPort = name => {
      const h = portHex(name); if (!h) return;
      const s = hexToScreen(h);
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('class', 'voyage-port');
      dot.setAttribute('cx', s.x.toFixed(1));
      dot.setAttribute('cy', s.y.toFixed(1));
      dot.setAttribute('r', '3');
      g.appendChild(dot);
    };
    drawPort(legs[0].from);
    legs.forEach(l => drawPort(l.to));
    // One polyline per leg. Prefer the pathfound water route; fall back to
    // a dashed red port-to-port line when pathfinding failed.
    legs.forEach(leg => {
      let pts = null, cls = 'voyage-route';
      if (leg.path && leg.path.length > 1){
        pts = leg.path.map(h => { const s = hexToScreen(h); return `${s.x.toFixed(1)},${s.y.toFixed(1)}`; });
      } else {
        const fh = portHex(leg.from), th = portHex(leg.to);
        if (!fh || !th) return;
        const fs = hexToScreen(fh), ts = hexToScreen(th);
        pts = [`${fs.x.toFixed(1)},${fs.y.toFixed(1)}`, `${ts.x.toFixed(1)},${ts.y.toFixed(1)}`];
        cls = 'voyage-route-fallback';
      }
      const halo = document.createElementNS(ns, 'polyline');
      halo.setAttribute('class', cls === 'voyage-route' ? 'voyage-route-halo' : 'voyage-route-fallback-halo');
      halo.setAttribute('points', pts.join(' '));
      g.insertBefore(halo, g.firstChild);

      const poly = document.createElementNS(ns, 'polyline');
      poly.setAttribute('class', cls);
      poly.setAttribute('points', pts.join(' '));
      g.insertBefore(poly, halo.nextSibling);
    });
  }

  function renderTrailOverlay(){
    const g = ensureOverlay();
    if (!g) return;
    g.querySelectorAll('.voyage-trail').forEach(el => el.remove());
    const v = state.voyage;
    if (!v || !v.hexTrail.length) return;
    const ns = 'http://www.w3.org/2000/svg';
    const pts = v.hexTrail.map(h => {
      const c = hexCenterDisplay(h.col, h.row);
      const s = mapToStage(c.x, c.y);
      return `${s.x.toFixed(1)},${s.y.toFixed(1)}`;
    });
    const poly = document.createElementNS(ns, 'polyline');
    poly.setAttribute('class', 'voyage-trail');
    poly.setAttribute('points', pts.join(' '));
    g.insertBefore(poly, g.firstChild);
  }

  // ── LIFECYCLE ─────────────────────────────────────────────────────────────
  function enter(){
    if (state.active) return;
    state.active = true;
    ensureStyles();
    if (!state._loaded){ loadVoyageState(); state._loaded = true; }
    if (!state.panelEl) buildPanel();
    else {
      state.panelEl.style.display = 'flex';
      if (state.veDrag) state.veDrag.restore();
    }
    renderRouteOverlay();
    if (state.panelEl){ renderLegsUI(); renderVoyagePane(); }
    if (state.voyage){ updateVoyageLocation('enter'); renderShip(); renderTrailOverlay(); }
    document.addEventListener('keydown', onKey, true);
    const btn = document.getElementById('btn-voyage');
    if (btn) btn.classList.add('active');
    LOG('entered');
  }

  function exit(){
    if (!state.active) return;
    cancelPortPlacement(true);
    state.active = false;
    if (state.panelEl) state.panelEl.style.display = 'none';
    document.removeEventListener('keydown', onKey, true);
    const btn = document.getElementById('btn-voyage');
    if (btn) btn.classList.remove('active');
  }

  function toggle(){ state.active ? exit() : enter(); }

  function onKey(e){
    if (e.key === 'Escape' && state.active){
      if (state.placingPort) cancelPortPlacement();
      else exit();
      e.stopPropagation();
    }
  }

  // Re-render every voyage overlay (route, ship, trail) — used after the hex
  // grid is rebuilt, which wipes #hex-svg and everything in it.
  function refreshOverlays(){
    if (state.overlayG && !state.overlayG.isConnected) state.overlayG = null;
    if (!state.routeLegs.length && !state.voyage) return;
    renderRouteOverlay();
    if (state.voyage){ renderShip(); renderTrailOverlay(); }
  }

  // ── BOOT ──────────────────────────────────────────────────────────────────
  function wire(){
    const btn = document.getElementById('btn-voyage');
    if (btn){ btn.addEventListener('click', toggle); LOG('✓ #btn-voyage wired'); }
    else LOG('✗ #btn-voyage not found — add to toolbar');
    // gcc-hex-edit.js calls rebuildGrid() after paint/edit, which destroys the
    // voyage overlay. Wrap it so overlays come back immediately.
    if (typeof window.rebuildGrid === 'function' && !window.rebuildGrid._voyagePatched){
      const orig = window.rebuildGrid;
      const patched = function(){
        const r = orig.apply(this, arguments);
        refreshOverlays();
        return r;
      };
      patched._voyagePatched = true;
      window.rebuildGrid = patched;
      LOG('✓ rebuildGrid patched for overlay refresh');
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  window.GCCVoyage = {
    enter, exit, toggle, state,
    advanceOneDay: simulateOneDay,
    getSummary: () => getVoyageSummary(),
    getPendingFinanceActions: () => (ensureSettlement(state.voyage)?.pending || []).map(a => ({ ...a })),
    addPendingFinanceAction: data => addPendingFinanceAction(data),
    markPendingFinancePosted,
    dismissPendingFinanceAction,
    estimateRepairCost: hp => estimateRepairCost(hp),
    currentPort: () => voyageCurrentPort(),
    currentLocation: () => voyageCurrentLocation(),
    currentLocationLabel: () => voyageCurrentLocationLabel(),
    saveState: saveVoyageState,
    loadState: loadVoyageState,
    clearSavedState: clearSavedVoyageState,
    routeLabel: () => voyageRouteLabel()
  };
})();
