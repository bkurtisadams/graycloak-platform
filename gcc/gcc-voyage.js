// gcc-voyage.js v0.3.0 — 2026-05-02
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
  LOG('gcc-voyage.js v0.2.0 loaded');

  // ── DATA ──────────────────────────────────────────────────────────────────
  // Ship templates: dailySail in miles-per-10-hour-sailing-day, hull in HP.
  const SHIP_TEMPLATES = [
    { id:'cog',           name:'Cog',                   dailySail:36, hull:21 },
    { id:'caravel',       name:'Caravel',               dailySail:48, hull:18 },
    { id:'sailing_ship',  name:'Sailing Ship',          dailySail:30, hull:25 },
    { id:'galley_large',  name:'Large Galley',          dailySail:50, hull:10 },
    { id:'galley_war',    name:'War Galley',            dailySail:36, hull:18 },
    { id:'sailing_boat',  name:'Sailing Boat (Fishing)',dailySail:60, hull:14 },
    { id:'keelboat',      name:'Keelboat',              dailySail:20, hull:9  },
    { id:'longship',      name:'Longship',              dailySail:50, hull:7  },
    { id:'merchantman',   name:'Merchantman',           dailySail:24, hull:34 },
    { id:'dromond',       name:'Dromond',               dailySail:36, hull:30 },
    { id:'rowboat',       name:'Rowboat / Skiff',       dailySail:18, hull:3  },
    { id:'outrigger',     name:'Outrigger',             dailySail:24, hull:6  },
  ];

  const MONTHS = [
    "Needfest","Fireseek","Readying","Coldeven",
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
  };

  // ── SMALL HELPERS ─────────────────────────────────────────────────────────
  const rollD  = s => Math.floor(Math.random()*s)+1;
  const rollDN = (n,s) => { let t=0; for(let i=0;i<n;i++) t+=rollD(s); return t; };

  function portHex(name){
    if (typeof GCCLandmarks === 'undefined' || typeof darleneToInternal !== 'function') return null;
    const lm = GCCLandmarks.getByName(name);
    if (!lm || !lm.id) return null;
    return darleneToInternal(lm.id);  // { col, row } or null
  }
  function portAvailable(name){ return !!portHex(name); }

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

  function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // ── SIMULATION ENGINE (ported from voyage-map.html, same math) ───────────
  function generateWeather(){
    const windSpeed = rollDN(2,10)+5;
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    const dir = dirs[rollD(8)-1];
    const skyRoll = rollD(10);
    const sky = skyRoll<=2 ? 'overcast' : skyRoll<=4 ? 'partly cloudy'
              : skyRoll<=6 ? 'clear'    : skyRoll<=8 ? 'clear'
              : skyRoll===9 ? 'fog' : 'heavy fog';
    const pr = rollD(20);
    let precip = 'none';
    if (pr<=3) precip='rainstorm-light';
    else if (pr<=5) precip='rainstorm-heavy';
    else if (pr===6) precip='hailstorm';
    else if (pr>=18) precip='drizzle';
    if (windSpeed>=50) precip='gale';
    if (windSpeed>=75) precip='hurricane';
    return {
      wind:{ speed:windSpeed, direction:dir },
      sky,
      precipitation:{ type:precip, duration:precip!=='none' ? rollD(6)+2 : 0 },
      temperature:{ high:65+rollD(20)-10, low:45+rollD(10) }
    };
  }
  function calculateSailingSpeed(baseSpeed, weather){
    const w = weather.wind.speed;
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
    const wet = ['drizzle','rainstorm-light','rainstorm-heavy','hailstorm'];
    if (wet.includes(weather.precipitation.type)){
      const pct = Math.floor(Math.random()*6)+5;
      const bonus = Math.floor(speed*pct/100);
      speed += bonus;
      note += ` Wet sails +${bonus} mi.`;
    }
    return { speed, note, becalmed:false };
  }
  function checkEncounter(waterType){
    const thresholds = { coastal:3, openWater:4, lake:3, river:2 };
    const threshold = thresholds[waterType] || 3;
    if (rollD(20) > threshold) return null;
    const ENC = {
      coastal:[ 'Pirate vessel (1d4+1 ships)','Merchant convoy (2d6 ships)','Fishing fleet',
        'Naval patrol','Sea serpent','Giant shark','Stranded sailors',
        'Wreck (salvageable)','Storm-damaged vessel needing aid','Smugglers' ],
      openWater:[ 'Pirate squadron','Merchant vessel','Sea dragon','School of sea horses',
        'Giant squid','Whale pod','Floating wreckage','Ghost ship','Sea elves','Merfolk delegation' ],
      lake:[ 'Fishermen','River traders','Lake monster','Bandit raft','Elvish vessel',
        'Dwarven barge','Sunken ruins visible','Fog bank (navigation hazard)','Water weird','Lake hermit' ],
      river:[ 'River pirates','Ferry barge','Crocodiles','Giant catfish','Bandits on shore',
        'Sunken barge (obstacle)','River toll collectors','Nixies','River troll','Log jam' ],
    };
    const list = ENC[waterType] || ENC.coastal;
    const enc = list[Math.floor(Math.random()*list.length)];
    const hostile = ['Pirate','pirate','Dragon','dragon','Serpent','serpent','Bandits','bandit','Troll','troll','Squid']
      .some(k => enc.includes(k));
    return { name:enc, hostile, distance:(rollD(6)*10)+'yds' };
  }
  function rollNavigationCheck(navSkill, crewMod, weather, waterType){
    if (waterType !== 'openWater') return null;
    const roll = rollD(20);
    const hazardMod = weather.wind.speed>=50 ? 5 : weather.wind.speed>=30 ? 2 : 0;
    const target = navSkill + crewMod - hazardMod;
    if (roll <= target) return null;
    const lostPct = Math.min(50, (roll-target)*5);
    return { failed:true, roll, target, lostPct };
  }
  function assessWeatherHazard(weather){
    const w = weather.wind.speed, p = weather.precipitation.type;
    if (p==='hurricane' || w>=75) return { type:'Critical', mod:10, desc:'Hurricane' };
    if (p==='gale'      || w>=50) return { type:'Major',    mod:5,  desc:'Gale Force Winds' };
    if (w>=35)                    return { type:'Minor',    mod:2,  desc:'Thunderstorm' };
    if (weather.sky.includes('fog'))
      return { type:'Minor', mod:3, desc: weather.sky.includes('heavy') ? 'Heavy Fog' : 'Fog' };
    return null;
  }
  function calendarAdvance(cal, days=1){
    const DPM = { Needfest:7, Richfest:7, Brewfest:7 };
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
    const dateStr = formatDate(v.calendar);
    const waterType = currentLegWaterType();
    const weather = generateWeather();
    const speedInfo = calculateSailingSpeed(v.dailySail, weather);
    const events = [];
    let milesThisDay = 0;

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
          events.push({ type:'damage', text:`${hz.desc}! Piloting failed (${pilot} > ${target}). Hull −${dmg} HP. (${v.hullCurrent}/${v.hullMax} remaining)` });
        }
      }
      // Encounter
      const enc = checkEncounter(waterType);
      if (enc){
        if (enc.hostile){
          const crewLoss = rollD(3)-1, hullDmg = rollD(4);
          v.hullCurrent -= hullDmg;
          if (crewLoss>0) events.push({ type:'crew', text:`${enc.name} at ${enc.distance}! ${crewLoss} crew lost.` });
          events.push({ type:'encounter', text:`${enc.name} — hull −${hullDmg} HP.` });
        } else {
          events.push({ type:'encounter', text:`${enc.name} at ${enc.distance}.` });
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
            events.push({ type:'port', text:`Arrived at ${leg.to}.` });
          } else {
            v.finished = true;
            const dest = v.legs[v.legs.length-1].to;
            events.push({ type:'port', text:`Arrived at ${dest}. Voyage complete!` });
            break;
          }
        } else break;
      }

      if (v.hullCurrent <= 0){
        v.shipSank = true;
        v.finished = true;
        events.push({ type:'damage', text:'☠ Ship sank!' });
      }
    }

    const pos = shipHexPosition();
    if (pos) v.hexTrail.push(pos);
    const entry = { day:v.dayNumber, date:dateStr, weather, speedInfo, miles:milesThisDay,
                    distTotal:v.distanceCovered, events, hexPos:pos };
    v.log.push(entry);
    return entry;
  }

  // ── UI: STYLES ────────────────────────────────────────────────────────────
  function ensureStyles(){
    if (document.getElementById('ve-styles')) return;
    const s = document.createElement('style');
    s.id = 've-styles';
    s.textContent = `
      #voyage-panel {
        position:fixed; top:72px; right:280px; width:300px; z-index:2000;
        background:rgba(20,14,6,.96); border:1px solid #c8941a; border-radius:3px;
        font-family:'Cinzel',serif; color:#f4e4b8; box-shadow:0 4px 20px rgba(0,0,0,.6);
        max-height:calc(100vh - 120px); display:flex; flex-direction:column;
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
      #voyage-panel .ve-legs {
        margin:6px 0; font-size:11px; font-family:Georgia,serif;
        max-height:140px; overflow-y:auto;
      }
      #voyage-panel .ve-leg {
        display:flex; justify-content:space-between; align-items:center;
        padding:4px 6px; border-bottom:1px solid rgba(200,148,26,.12); gap:6px;
      }
      #voyage-panel .ve-leg:last-child { border-bottom:0; }
      #voyage-panel .ve-leg-text { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
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

      /* Toolbar button */
      #btn-voyage.active { background:rgba(100,180,220,.22); color:#aaddff; border-color:#4488aa; }

      /* Map overlays */
      #voyage-overlay { pointer-events:none; }
      #voyage-overlay .voyage-route {
        fill:none; stroke:#4488cc; stroke-width:1.4; stroke-dasharray:3,2; opacity:.75;
      }
      #voyage-overlay .voyage-route-fallback {
        fill:none; stroke:#cc3322; stroke-width:1.4; stroke-dasharray:5,3; opacity:.7;
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

    p.querySelector('.ve-close').onclick = exit;
    p.querySelectorAll('.ve-tab').forEach(t =>
      t.onclick = () => setActiveTab(t.dataset.tab));

    wireSetupPane();
    wireVoyagePane();
  }

  // Setup pane: captain, ship, crew, route planner.
  function setupPaneHTML(){
    const availablePorts = Object.keys(PORTS).filter(portAvailable);
    const missingPorts   = Object.keys(PORTS).filter(n => !portAvailable(n));
    const portOpts = availablePorts.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
    const shipOpts = SHIP_TEMPLATES.map(s =>
      `<option value="${s.id}">${esc(s.name)} (${s.dailySail} mi/d, ${s.hull} HP)</option>`).join('');
    const monthOpts = MONTHS.map((m,i) => `<option value="${i}">${esc(m)}</option>`).join('');
    const waterOpts = WATER_TYPES.map(w => `<option value="${w.id}">${esc(w.label)}</option>`).join('');

    return `
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

      <label class="ve-lbl">Route — From</label>
      <select class="ve-select" id="ve-from">${portOpts}</select>
      <label class="ve-lbl">Route — To</label>
      <select class="ve-select" id="ve-to"></select>
      <label class="ve-lbl">Water Type</label>
      <select class="ve-select" id="ve-water">${waterOpts}</select>
      <button class="ve-btn" id="ve-addleg">+ Add Leg</button>

      <label class="ve-lbl">Planned Route</label>
      <div class="ve-legs" id="ve-legs"></div>
      <div class="ve-row">
        <button class="ve-btn danger" id="ve-clearroute">Clear</button>
        <button class="ve-btn primary" id="ve-start">Start Voyage</button>
      </div>

      ${missingPorts.length ? `<div class="ve-warn">Not yet placed as landmarks: ${missingPorts.map(esc).join(', ')}. Add via 🧰 Hex → Landmarks to enable them as ports.</div>` : ''}

      <div class="ve-status" id="ve-status">Build a route, then Start Voyage.</div>
    `;
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
    };
    fromSel.onchange = refreshDest;
    refreshDest();

    p.querySelector('#ve-addleg').onclick = addLeg;
    p.querySelector('#ve-clearroute').onclick = clearRoute;
    p.querySelector('#ve-start').onclick = startVoyage;

    renderLegsUI();
  }

  function wireVoyagePane(){ /* wired per-render via onclick handlers */ }

  // ── UI: TABS ──────────────────────────────────────────────────────────────
  function setActiveTab(tab){
    state.activeTab = tab;
    const p = state.panelEl;
    p.querySelectorAll('.ve-tab').forEach(t => t.classList.toggle('active', t.dataset.tab===tab));
    p.querySelectorAll('.ve-pane').forEach(el => el.classList.remove('active'));
    p.querySelector('#ve-pane-'+tab)?.classList.add('active');
    if (tab==='log') renderLog();
    if (tab==='voyage') renderVoyagePane();
  }

  // ── UI: ROUTE LIST ────────────────────────────────────────────────────────
  function renderLegsUI(){
    const list = state.panelEl.querySelector('#ve-legs');
    if (!list) return;
    if (!state.routeLegs.length){
      list.innerHTML = '<div style="color:#8b6e45;font-style:italic;font-size:11px;padding:6px">No legs yet.</div>';
      return;
    }
    list.innerHTML = state.routeLegs.map((leg,i) =>
      `<div class="ve-leg">
        <span class="ve-leg-text">${i+1}. ${esc(leg.from)} → ${esc(leg.to)} (${leg.distance} mi · ${esc(leg.waterType)})</span>
        <button class="ve-leg-x" data-i="${i}" title="Remove leg">✕</button>
      </div>`
    ).join('');
    list.querySelectorAll('.ve-leg-x').forEach(b =>
      b.onclick = () => removeLeg(parseInt(b.dataset.i,10)));
  }

  function setStatus(msg, cls=''){
    const el = state.panelEl?.querySelector('#ve-status');
    if (el){ el.textContent = msg; el.style.color = cls==='warn' ? '#ff9944' : cls==='err' ? '#ff5544' : '#c8a96e'; }
  }

  // ── ACTIONS: ROUTE ────────────────────────────────────────────────────────
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
    const fromHex = portHex(from), toHex = portHex(to);
    const path = (fromHex && toHex) ? findWaterPath(fromHex, toHex) : null;
    state.routeLegs.push({ from, to, waterType, distance:dist, path });
    // Auto-chain: next leg starts from the port we just arrived at
    p.querySelector('#ve-from').value = to;
    p.querySelector('#ve-from').dispatchEvent(new Event('change'));
    renderLegsUI();
    renderRouteOverlay();
    if (path){
      setStatus(`Added ${from} → ${to} (${dist} mi, ${path.length} hex route).`);
    } else {
      setStatus(`Added ${from} → ${to} (${dist} mi). ⚠ No water path — paint hexes via 🧰 Hex → Paint.`, 'warn');
    }
  }

  function removeLeg(i){
    state.routeLegs.splice(i,1);
    renderLegsUI();
    renderRouteOverlay();
  }

  function clearRoute(){
    state.routeLegs = [];
    renderLegsUI();
    renderRouteOverlay();
    setStatus('Route cleared.');
  }

  // ── ACTIONS: VOYAGE ──────────────────────────────────────────────────────
  function startVoyage(){
    if (!state.routeLegs.length){ setStatus('Add at least one leg first.', 'warn'); return; }
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

    state.voyage = {
      captain: p.querySelector('#ve-capt').value || 'Captain',
      shipType: shipTpl.name,
      hullMax, hullCurrent: hullMax,
      dailySail,
      crewQuality: crew,
      crewMod: CREW_QUALITY_MOD[crew] ?? 0,
      navSkill,
      calendar: { day:sd, month:sm, year:sy },
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
    };
    setStatus(`Voyage started — ${state.voyage.shipType} sailing ${legs[0].from} → ${legs[legs.length-1].to}.`);
    setActiveTab('voyage');
    renderShip();
    renderRouteOverlay();
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
    if (!window.confirm('End current voyage? All progress will be lost.')) return;
    state.voyage = null;
    clearVoyageOverlays();
    renderRouteOverlay();
    renderVoyagePane();
    setStatus('Voyage ended.');
  }

  // ── UI: VOYAGE PANE RENDER ────────────────────────────────────────────────
  function renderVoyagePane(){
    const body = state.panelEl?.querySelector('#ve-voyage-body');
    if (!body) return;
    const v = state.voyage;
    if (!v){
      body.innerHTML = '<div class="ve-status">No active voyage. Build a route on the Setup tab.</div>';
      return;
    }
    const leg = v.legs[v.currentLegIdx];
    const legTxt = leg
      ? `${esc(leg.from)} → ${esc(leg.to)} (${v.milesOnLeg}/${leg.distance} mi · ${esc(leg.waterType)})`
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
      <label class="ve-lbl">Current Leg</label>
      <div style="font-size:12px;font-family:Georgia,serif;color:#f4e4b8">${legTxt}</div>
      <label class="ve-lbl">Progress</label>
      <div style="font-size:12px;font-family:Georgia,serif">${v.distanceCovered} / ${v.totalDistance} mi  <span style="color:#c8a96e">(${v.totalDistance>0 ? Math.round(v.distanceCovered/v.totalDistance*100) : 0}%)</span></div>
      <label class="ve-lbl">Hull</label>
      <div style="font-size:12px;font-family:Georgia,serif;color:${hullCol}">${v.hullCurrent} / ${v.hullMax} HP (${hullPct}%)</div>
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
        <div class="ve-log-sub">Wind ${e.weather.wind.speed} mph ${esc(e.weather.wind.direction)} · ${esc(e.weather.sky)} · ${esc(e.weather.precipitation.type)}</div>
        <div class="ve-log-sub">Sailed ${e.miles} mi (total ${e.distTotal})</div>
        ${evt}
      </div>`;
    }).join('');
  }

  // ── MAP OVERLAYS ──────────────────────────────────────────────────────────
  function ensureOverlay(){
    if (state.overlayG) return state.overlayG;
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
    g.querySelectorAll('.voyage-route, .voyage-route-fallback, .voyage-port').forEach(el => el.remove());
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
      const poly = document.createElementNS(ns, 'polyline');
      poly.setAttribute('class', cls);
      poly.setAttribute('points', pts.join(' '));
      g.insertBefore(poly, g.firstChild);
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
    if (!state.panelEl) buildPanel();
    else {
      state.panelEl.style.display = 'flex';
      if (state.veDrag) state.veDrag.restore();
    }
    renderRouteOverlay();
    if (state.voyage){ renderShip(); renderTrailOverlay(); }
    document.addEventListener('keydown', onKey, true);
    const btn = document.getElementById('btn-voyage');
    if (btn) btn.classList.add('active');
    LOG('entered');
  }

  function exit(){
    if (!state.active) return;
    state.active = false;
    if (state.panelEl) state.panelEl.style.display = 'none';
    document.removeEventListener('keydown', onKey, true);
    const btn = document.getElementById('btn-voyage');
    if (btn) btn.classList.remove('active');
  }

  function toggle(){ state.active ? exit() : enter(); }

  function onKey(e){
    if (e.key === 'Escape' && state.active){ exit(); e.stopPropagation(); }
  }

  // ── BOOT ──────────────────────────────────────────────────────────────────
  function wire(){
    const btn = document.getElementById('btn-voyage');
    if (btn){ btn.addEventListener('click', toggle); LOG('✓ #btn-voyage wired'); }
    else LOG('✗ #btn-voyage not found — add to toolbar');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  window.GCCVoyage = { enter, exit, toggle, state };
})();
