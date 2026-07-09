// gcc-weather.js v0.2.0 — AD&D / World of Greyhawk campaign weather for GCC
// v0.2.0: day-to-day weather continuity (Dragon #68 / seafaring tables).
//   generateDailyWeather(ctx) now accepts ctx.previous (the prior day's
//   weather object). Multi-day events (gale 1d3 days, monsoon 1d6+6,
//   tropical storm 1d3, hurricane 1d4, heavy clouds 1d10, becalmed 1d100
//   hours) run their rolled duration via precipitation.daysRemaining.
//   Shorter events persist on their chanceContinue percentage; a continued
//   day intensifies 10% of the time and weakens 10% of the time (wind ±25%),
//   per "If the precipitation continues, 10% of the time the effect
//   increases, 10% of the time the effect decreases."
// v0.1.0: initial port.
// Browser-safe weather engine distilled from the user's seafaring notes and
// the gcWeather Foundry module data tables. No Foundry globals, no imports.
(function(){
  if (typeof window === 'undefined') return;

  const VERSION = '0.2.0';

  const MONTHS = [
    'Needfest', 'Fireseek', 'Readying', 'Coldeven', 'Growfest',
    'Planting', 'Flocktime', 'Wealsun', 'Richfest', 'Reaping',
    'Goodmonth', 'Harvester', 'Brewfest', 'Patchwall', "Ready'reat", 'Sunsebb'
  ];

  const MONTH_LENGTHS = {
    Needfest: 7, Fireseek: 28, Readying: 28, Coldeven: 28, Growfest: 7,
    Planting: 28, Flocktime: 28, Wealsun: 28, Richfest: 7, Reaping: 28,
    Goodmonth: 28, Harvester: 28, Brewfest: 7, Patchwall: 28,
    "Ready'reat": 28, Sunsebb: 28,
  };

  // Greyhawk profile from gcWeather's Dragon #68 / World of Greyhawk baseline.
  const BASELINE = {
    Needfest:   { baseTemp: 28, highMod: '1d10',   lowMod: '1d20',   precipChance: 46, sky: { clear: 20, partly: 60 } },
    Fireseek:   { baseTemp: 32, highMod: '1d10',   lowMod: '1d20',   precipChance: 46, sky: { clear: 23, partly: 50 } },
    Readying:   { baseTemp: 34, highMod: '1d6+4',  lowMod: '1d10+4', precipChance: 40, sky: { clear: 25, partly: 50 } },
    Coldeven:   { baseTemp: 42, highMod: '1d8+4',  lowMod: '1d10+4', precipChance: 44, sky: { clear: 27, partly: 54 } },
    Growfest:   { baseTemp: 47, highMod: '1d10+5', lowMod: '1d10+4', precipChance: 45, sky: { clear: 26, partly: 60 } },
    Planting:   { baseTemp: 52, highMod: '1d10+6', lowMod: '1d8+4',  precipChance: 42, sky: { clear: 20, partly: 55 } },
    Flocktime:  { baseTemp: 63, highMod: '1d10+6', lowMod: '1d10+6', precipChance: 42, sky: { clear: 20, partly: 53 } },
    Wealsun:    { baseTemp: 71, highMod: '1d8+8',  lowMod: '1d6+6',  precipChance: 36, sky: { clear: 20, partly: 60 } },
    Richfest:   { baseTemp: 75, highMod: '1d4+6',  lowMod: '1d6+6',  precipChance: 33, sky: { clear: 25, partly: 60 } },
    Reaping:    { baseTemp: 77, highMod: '1d6+4',  lowMod: '1d6+6',  precipChance: 33, sky: { clear: 22, partly: 62 } },
    Goodmonth:  { baseTemp: 75, highMod: '1d4+6',  lowMod: '1d6+6',  precipChance: 33, sky: { clear: 25, partly: 60 } },
    Harvester:  { baseTemp: 68, highMod: '1d8+6',  lowMod: '1d8+6',  precipChance: 33, sky: { clear: 33, partly: 54 } },
    Brewfest:   { baseTemp: 62, highMod: '1d10+5', lowMod: '1d10+5', precipChance: 36, sky: { clear: 35, partly: 60 } },
    Patchwall:  { baseTemp: 57, highMod: '1d10+5', lowMod: '1d10+5', precipChance: 36, sky: { clear: 35, partly: 60 } },
    "Ready'reat": { baseTemp: 46, highMod: '1d10+6', lowMod: '1d10+4', precipChance: 40, sky: { clear: 20, partly: 50 } },
    Sunsebb:    { baseTemp: 33, highMod: '1d8+5',  lowMod: '1d20',   precipChance: 43, sky: { clear: 25, partly: 50 } },
  };

  // Voyage water types mapped to the terrain modifiers in the seafaring notes.
  // Lake is treated as an inland sea: wetter and windier than land, but less
  // extreme than blue-water ocean. Tropical phenomena are gated separately.
  const WATER_MODS = {
    river:     { label: 'River',      precip: 0,  temp: 0, wind: 0,  tropical: false, hurricane: false },
    lake:      { label: 'Inland Sea', precip: 10, temp: 0, wind: 5,  tropical: false, hurricane: false },
    coastal:   { label: 'Sea Coast',  precip: 5,  temp: 0, wind: 5,  tropical: false, hurricane: false },
    openWater: { label: 'At Sea',     precip: 15, temp: 0, wind: 10, tropical: true,  hurricane: true  },
  };

  const WIND_DIRECTIONS = [
    'North', 'South', 'East', 'West', 'Northwest', 'Northeast', 'Southwest', 'Southeast'
  ];

  const PRECIP_TABLE = [
    { lo:  1, hi:  5, key: 'blizzard',       name: 'Blizzard',         tempMax: 15, duration: '3d8',      unit: 'hours', chanceContinue: 10, wind: '4d8+36', blocked: ['desert'] },
    { lo:  6, hi: 20, key: 'snowstorm',      name: 'Snowstorm',        tempMax: 30, duration: '3d6',      unit: 'hours', chanceContinue: 25, wind: '3d8',    blocked: [] },
    { lo: 21, hi: 27, key: 'sleet-hail',     name: 'Sleet / Hail',     duration: '1d6',      unit: 'hours', chanceContinue: 15, wind: '3d10',   blocked: [] },
    { lo: 28, hi: 38, key: 'fog',            name: 'Fog',              tempMin: 25, tempMax: 65, duration: '2d6', unit: 'hours', chanceContinue: 30, wind: '1d10', blocked: ['desert'] },
    { lo: 39, hi: 70, key: 'rain',           name: 'Rain',             tempMin: 25, duration: '1d12',     unit: 'hours', chanceContinue: 30, wind: '1d20',   blocked: [] },
    { lo: 71, hi: 84, key: 'rain-storm',     name: 'Rain Storm',       tempMin: 30, duration: '1d4',      unit: 'hours', chanceContinue: 15, wind: '4d10',   blocked: [] },
    { lo: 85, hi: 89, key: 'gale',           name: 'Gale',             tempMin: 40, duration: '1d3',      unit: 'days',  chanceContinue: 20, wind: '2d12+30', blocked: ['desert', 'plains'] },
    { lo: 90, hi: 92, key: 'monsoon',        name: 'Gale / Monsoon',   tempMin: 55, duration: '1d6+6',    unit: 'days',  chanceContinue: 30, wind: '6d10',    tropical: true, blocked: [] },
    { lo: 93, hi: 97, key: 'tropical-storm', name: 'Tropical Storm',   tempMin: 40, duration: '1d3',      unit: 'days',  chanceContinue: 15, wind: '1d4+1d6+1d10+52', tropical: true, blocked: ['desert'] },
    { lo: 98, hi:100, key: 'unusual',        name: 'Unusual / Special', duration: '0',        unit: 'event', chanceContinue: 1,  wind: '0',      unusual: true, blocked: [] },
  ];

  const UNUSUAL_TABLE = [
    { lo:  1, hi: 10, key: 'becalmed',   name: 'Becalmed',             duration: '1d100',     unit: 'hours',   wind: '0' },
    { lo: 11, hi: 30, key: 'heavy-clouds', name: 'Heavy Clouds',       duration: '1d10',      unit: 'days',    wind: null },
    { lo: 31, hi: 50, key: 'heavy-fog',  name: 'Heavy Fog',            duration: '2d6',       unit: 'hours',   wind: '1d10' },
    { lo: 51, hi: 75, key: 'squall',     name: 'Squall',               duration: '1d100+10',  unit: 'minutes', wind: '1d4+1d6+1d10+52' },
    { lo: 76, hi: 95, key: 'hurricane',  name: 'Hurricane',            duration: '1d4',       unit: 'days',    wind: '7d10+66', hurricane: true },
    { lo: 96, hi:100, key: 'waterspout', name: 'Waterspout / Tornado', duration: '1d20',      unit: 'turns',   wind: '1d10', waterspout: true },
  ];

  function rollDie(sides){ return Math.floor(Math.random() * sides) + 1; }
  function rollDice(count, sides){ let t = 0; for (let i = 0; i < count; i++) t += rollDie(sides); return t; }
  function rollPercentile(){ return rollDie(100); }
  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
  function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

  function rollExpr(expression){
    if (expression == null) return 0;
    const src = String(expression).trim();
    if (!src || src === '0' || /^none$/i.test(src)) return 0;
    // Support additive dice strings used by the seafaring/gcWeather tables:
    // d20, 2d12+30, 1d4+1d6+1d10+52, 1d100+10, 1/2d6.
    return src.replace(/\s+/g, '').split('+').reduce((total, term) => {
      if (!term) return total;
      const frac = term.match(/^(\d+)\/(\d+)d(\d+)$/i);
      if (frac){
        const [, n, d, sides] = frac.map(Number);
        return total + Math.floor((n / d) * rollDie(sides));
      }
      const dice = term.match(/^(\d*)d(\d+)$/i);
      if (dice){
        const count = parseInt(dice[1] || '1', 10);
        const sides = parseInt(dice[2], 10);
        return total + rollDice(count, sides);
      }
      const num = Number(term);
      return Number.isFinite(num) ? total + num : total;
    }, 0);
  }

  function normalizeMonth(month){
    if (typeof month === 'number' && Number.isFinite(month)) return MONTHS[clamp(Math.floor(month), 0, MONTHS.length - 1)];
    if (typeof month === 'string'){
      const exact = MONTHS.find(m => m.toLowerCase() === month.toLowerCase());
      if (exact) return exact;
    }
    return MONTHS[0];
  }

  function monthLength(month){ return MONTH_LENGTHS[normalizeMonth(month)] || 28; }

  function pickSky(base){
    const r = rollPercentile();
    const clear = base?.sky?.clear ?? 20;
    const partly = base?.sky?.partly ?? 30;
    if (r <= clear) return 'Clear';
    if (r <= clear + partly) return 'Partly Cloudy';
    return 'Cloudy';
  }

  function windForceFromSpeed(speed){
    const s = Math.max(0, Math.round(speed || 0));
    if (s <= 1) return { key: 'calm', label: 'Calm', move: '-', missile: '-', melee: '-', wave: '' };
    if (s <= 7) return { key: 'light', label: 'Light Wind', move: '-', missile: '-', melee: '-', wave: '' };
    if (s <= 18) return { key: 'moderate', label: 'Moderate Wind', move: '-', missile: '0/-1/-2/-3', melee: '-', wave: '' };
    if (s <= 31) return { key: 'strong', label: 'Strong Wind', move: '¾', missile: '-1/-2/-3/xx', melee: '-1', wave: '' };
    if (s <= 54) return { key: 'gale', label: 'Gale', move: '⅔', missile: '-2/-4/xx/xx', melee: '-2', wave: '3d8 ft waves' };
    if (s <= 72) return { key: 'storm', label: 'Storm', move: '½', missile: '-4/-6/xx/xx', melee: '-4', wave: 'd10+20 ft waves' };
    return { key: 'hurricane', label: 'Hurricane', move: '¼', missile: 'xx/xx/xx/xx', melee: '-8', wave: '1d20+20 ft waves' };
  }

  function rollWindByForce(waterMod){
    const forceRoll = rollDice(3, 6);
    let range;
    if (forceRoll === 3) range = [0, 1];
    else if (forceRoll <= 8) range = [2, 7];
    else if (forceRoll <= 12) range = [8, 18];
    else if (forceRoll <= 15) range = [19, 31];
    else if (forceRoll === 16) range = [32, 54];
    else if (forceRoll === 17) range = [55, 72];
    else range = [73, 136];
    const speed = rollDie(range[1] - range[0] + 1) + range[0] - 1 + (waterMod?.wind || 0);
    return { speed: Math.max(0, speed), forceRoll };
  }

  function pickTableRow(table, roll){ return table.find(row => roll >= row.lo && roll <= row.hi) || table[table.length - 1]; }

  function temperatureAllowed(row, temp){
    if (row.tempMin != null && temp < row.tempMin) return false;
    if (row.tempMax != null && temp > row.tempMax) return false;
    return true;
  }

  function winterFallback(temp){
    if (temp >= 36) return { key: 'rain', name: 'Rain', duration: '1d12', unit: 'hours', chanceContinue: 30, wind: '1d20' };
    if (temp >= 30) return rollDie(6) <= 3
      ? { key: 'sleet-hail', name: 'Sleet', duration: '1d6', unit: 'hours', chanceContinue: 15, wind: '3d10' }
      : { key: 'snowstorm', name: 'Snowstorm', duration: '3d6', unit: 'hours', chanceContinue: 25, wind: '3d8' };
    return { key: 'snowstorm', name: 'Snowstorm', duration: '3d6', unit: 'hours', chanceContinue: 25, wind: '3d8' };
  }

  function normalizePrecipRow(row, temp, waterMod){
    let out = { ...row };
    if (out.unusual) return out;
    if (out.tropical && !waterMod.tropical){
      // Keep the danger, remove the tropical climate label.
      out = out.key === 'monsoon'
        ? { key: 'rain-storm', name: 'Rain Storm', tempMin: 30, duration: '1d4', unit: 'hours', chanceContinue: 15, wind: '4d10' }
        : { key: 'gale', name: 'Gale', tempMin: 40, duration: '1d3', unit: 'days', chanceContinue: 20, wind: '2d12+30' };
    }
    if (!temperatureAllowed(out, temp)){
      // Frozen precipitation notes: warm frozen results become rain; cold rain
      // becomes sleet/snow. Fog outside its band becomes clouds/no precip.
      if (['blizzard', 'snowstorm', 'sleet-hail'].includes(out.key) && temp >= 36) return winterFallback(temp);
      if (['rain', 'rain-storm', 'gale'].includes(out.key) && temp < (out.tempMin || 32)) return winterFallback(temp);
      if (out.key === 'fog') return { key: 'clouds', name: 'Cloudy', duration: '0', unit: 'hours', chanceContinue: 0, wind: null };
      return winterFallback(temp);
    }
    return out;
  }

  function rollUnusual(temp, waterMod){
    let row = { ...pickTableRow(UNUSUAL_TABLE, rollPercentile()) };
    if (row.hurricane && !waterMod.hurricane){
      row = { key: 'storm', name: 'Storm', duration: '1d1', unit: 'days', chanceContinue: 20, wind: '4d10+20' };
    }
    if (row.key === 'heavy-fog' && (temp < 25 || temp > 65)){
      row = { key: 'heavy-clouds', name: 'Heavy Clouds', duration: '1d10', unit: 'days', wind: null };
    }
    return row;
  }

  function rollPrecipitation(currentTemp, waterMod){
    const row = normalizePrecipRow(pickTableRow(PRECIP_TABLE, rollPercentile()), currentTemp, waterMod);
    const finalRow = row.unusual ? rollUnusual(currentTemp, waterMod) : row;
    return {
      key: finalRow.key,
      type: finalRow.name,
      duration: rollExpr(finalRow.duration),
      durationUnit: finalRow.unit || 'hours',
      chanceContinue: finalRow.chanceContinue ?? 0,
      windExpr: finalRow.wind,
      unusual: !!row.unusual,
      notes: finalRow.notes || '',
    };
  }

  function deriveVoyageEffects(weather, ctx){
    const force = weather.wind.forceKey;
    const precipKey = weather.precipitation.key;
    let movementMultiplier = 1;
    let bonusMiles = 0;
    let navigationPenalty = 0;
    let hazardLevel = null;
    const notes = [];

    if (force === 'calm' || precipKey === 'becalmed'){
      movementMultiplier = 0;
      notes.push('Becalmed; sailing ships make no progress.');
    } else if (force === 'light'){
      movementMultiplier = 0.75;
      notes.push('Light wind slows the ship.');
    } else if (force === 'moderate'){
      notes.push('Moderate wind; normal sailing.');
    } else if (force === 'strong'){
      movementMultiplier = 1.1;
      notes.push('Strong wind gives a small sailing boost.');
      navigationPenalty += 1;
    } else if (force === 'gale'){
      movementMultiplier = 0.75;
      navigationPenalty += 2;
      hazardLevel = 'gale';
      notes.push('Gale force winds; voyage progress is dangerous and controlled.');
    } else if (force === 'storm'){
      movementMultiplier = 0.5;
      navigationPenalty += 4;
      hazardLevel = 'storm';
      notes.push('Storm winds; planned-course progress is poor and hull risk is high.');
    } else if (force === 'hurricane'){
      movementMultiplier = 0.25;
      navigationPenalty += 8;
      hazardLevel = 'hurricane';
      notes.push('Hurricane force winds; survival matters more than course progress.');
    }

    if (['fog', 'heavy-fog'].includes(precipKey)){
      movementMultiplier = Math.min(movementMultiplier, precipKey === 'heavy-fog' ? 0.5 : 0.75);
      navigationPenalty += precipKey === 'heavy-fog' ? 4 : 2;
      notes.push(precipKey === 'heavy-fog' ? 'Heavy fog halves speed and hides hazards.' : 'Fog reduces speed and visibility.');
    }

    if (['rain-storm', 'squall'].includes(precipKey)){
      movementMultiplier = Math.min(movementMultiplier, 0.75);
      navigationPenalty += 2;
      if (!hazardLevel) hazardLevel = 'storm';
      notes.push(precipKey === 'squall' ? 'Squall crosses the route suddenly.' : 'Rain storm batters the ship.');
    }

    if (['blizzard', 'snowstorm', 'sleet-hail'].includes(precipKey)){
      movementMultiplier = Math.min(movementMultiplier, precipKey === 'blizzard' ? 0.25 : 0.5);
      navigationPenalty += precipKey === 'blizzard' ? 5 : 3;
      if (!hazardLevel && weather.wind.speed >= 32) hazardLevel = 'gale';
      notes.push(`${weather.precipitation.type} cuts visibility and makes decks treacherous.`);
    }

    if (['gale', 'tropical-storm', 'hurricane', 'waterspout'].includes(precipKey)){
      if (precipKey === 'gale') hazardLevel = hazardLevel || 'gale';
      if (precipKey === 'tropical-storm' || precipKey === 'waterspout') hazardLevel = 'storm';
      if (precipKey === 'hurricane') hazardLevel = 'hurricane';
    }

    const speedNote = notes.join(' ');
    return {
      movementMultiplier,
      bonusMiles,
      navigationPenalty,
      hazardLevel,
      speedNote,
      damageRisk: !!hazardLevel,
      stormDriftMiles: hazardLevel === 'storm' ? rollDice(1, 10) * 10
        : hazardLevel === 'hurricane' ? rollDice(2, 10) * 10
        : 0,
      source: 'Dragon #68 / World of Greyhawk + seafaring voyage layer',
    };
  }

  // ── CONTINUITY ────────────────────────────────────────────────────────────
  // Convert a freshly rolled precipitation record's duration into whole days
  // remaining AFTER today. Day-unit events run their rolled span; hour-unit
  // events longer than a day (becalmed 1d100 hours) convert; everything else
  // ends today and relies on chanceContinue.
  function daysRemainingFor(precip){
    if (!precip || precip.key === 'none') return 0;
    const d = Number(precip.duration || 0);
    if (precip.durationUnit === 'days') return Math.max(0, Math.ceil(d) - 1);
    if (precip.durationUnit === 'hours' && d > 24) return Math.max(0, Math.ceil(d / 24) - 1);
    return 0;
  }

  // Roll whether yesterday's weather carries into today, per the seafaring
  // tables. Returns null (fresh roll) or a precipitation record for today.
  function continuePrecipitation(prev){
    const p = prev?.precipitation;
    if (!p || p.key === 'none' || p.key === 'clouds') return null;
    const daysLeft = Number(p.daysRemaining || 0);
    let intensity = 0; // -1 weaken, 0 same, +1 intensify
    if (daysLeft > 0){
      // Multi-day event still running its rolled duration.
      const r = rollPercentile();
      if (r <= 10) intensity = 1; else if (r <= 20) intensity = -1;
      return { ...p, daysRemaining: daysLeft - 1, continued: true,
               dayCount: Number(p.dayCount || 1) + 1, intensity };
    }
    // Duration expired — chanceContinue keeps it alive another day.
    if (rollPercentile() <= Number(p.chanceContinue || 0)){
      const r = rollPercentile();
      if (r <= 10) intensity = 1; else if (r <= 20) intensity = -1;
      return { ...p, daysRemaining: 0, continued: true,
               dayCount: Number(p.dayCount || 1) + 1, intensity };
    }
    return null;
  }

  function generateDailyWeather(ctx){
    ctx = ctx || {};
    const monthName = normalizeMonth(ctx.monthName || ctx.month);
    const base = BASELINE[monthName] || BASELINE.Needfest;
    const waterType = ctx.waterType || ctx.terrain || 'coastal';
    const waterMod = WATER_MODS[waterType] || WATER_MODS.coastal;

    const high = Math.round(base.baseTemp + rollExpr(base.highMod) + waterMod.temp);
    const low  = Math.round(base.baseTemp - rollExpr(base.lowMod) + waterMod.temp);
    const currentTemp = Math.round((high + low) / 2);
    let sky = pickSky(base);

    // ── Continuity: yesterday's weather may still be running. ──
    const carried = continuePrecipitation(ctx.previous);
    let precipChance = clamp(base.precipChance + waterMod.precip, 0, 95);
    if (['coastal', 'openWater', 'lake'].includes(waterType)) precipChance = Math.max(40, precipChance);
    let precipitation;
    if (carried){
      precipitation = carried;
    } else {
      const precipitationOccurs = rollPercentile() <= precipChance;
      precipitation = precipitationOccurs
        ? rollPrecipitation(currentTemp, waterMod)
        : { key: 'none', type: 'None', duration: 0, durationUnit: 'hours', chanceContinue: 0, windExpr: null, unusual: false };

      // Weekly unusual weather is represented as a low daily chance, only when no
      // ordinary precipitation already claimed the sky.
      if (!precipitationOccurs && rollPercentile() <= 2){
        const unusual = rollUnusual(currentTemp, waterMod);
        precipitation = {
          key: unusual.key,
          type: unusual.name,
          duration: rollExpr(unusual.duration),
          durationUnit: unusual.unit || 'event',
          chanceContinue: unusual.chanceContinue ?? 0,
          windExpr: unusual.wind,
          unusual: true,
        };
      }
      precipitation.daysRemaining = daysRemainingFor(precipitation);
      precipitation.dayCount = precipitation.key === 'none' ? 0 : 1;
      precipitation.continued = false;
      precipitation.intensity = 0;
    }

    let windBase;
    if (precipitation.windExpr != null){
      windBase = { speed: rollExpr(precipitation.windExpr), forceRoll: null };
    } else {
      windBase = rollWindByForce(waterMod);
    }

    let windSpeed = Math.max(0, Math.round(windBase.speed + (precipitation.windExpr != null ? waterMod.wind : 0)));
    // Continued-day intensity: the effect grows or fades (wind ±25%).
    if (precipitation.continued && precipitation.intensity){
      windSpeed = Math.max(0, Math.round(windSpeed * (precipitation.intensity > 0 ? 1.25 : 0.75)));
    }
    // Inland seas and rivers should not casually turn rare hurricane rolls into
    // hurricane weather. Downgrade the label by capping speed, but keep storms scary.
    if (!waterMod.hurricane && windSpeed >= 73) windSpeed = 72;

    const force = windForceFromSpeed(windSpeed);
    if (['fog', 'heavy-fog', 'heavy-clouds'].includes(precipitation.key)) sky = precipitation.type;
    else if (precipitation.key !== 'none') sky = sky === 'Clear' ? 'Cloudy' : sky;

    const weather = {
      source: 'GCCWeather',
      version: VERSION,
      month: monthName,
      day: ctx.day || null,
      year: ctx.year || null,
      terrain: waterMod.label,
      precipitationChance: precipChance,
      sky,
      temperature: { high, low, current: currentTemp },
      wind: {
        speed: windSpeed,
        direction: pick(WIND_DIRECTIONS),
        force: force.label,
        forceKey: force.key,
        forceRoll: windBase.forceRoll,
        effects: force,
      },
      precipitation,
    };
    weather.voyageEffects = deriveVoyageEffects(weather, ctx);
    const contTag = precipitation.continued ? ` (day ${precipitation.dayCount})` : '';
    weather.summary = `${weather.sky}; ${weather.precipitation.type}${contTag}; ${weather.wind.force} ${weather.wind.speed} mph from ${weather.wind.direction}`;
    return weather;
  }

  function describeWeather(weather){
    if (!weather) return '';
    const p = weather.precipitation || { type: 'None' };
    const cont = p.continued
      ? ` (day ${p.dayCount}${Number(p.daysRemaining) > 0 ? `, ~${p.daysRemaining} more` : ''}${p.intensity > 0 ? ', worsening' : p.intensity < 0 ? ', easing' : ''})`
      : '';
    const dur = !p.continued && p.duration ? ` for ${p.duration} ${p.durationUnit || 'hours'}` : '';
    return `${weather.sky}; ${p.type}${dur}${cont}; ${weather.wind.force || 'Wind'} ${weather.wind.speed} mph from ${weather.wind.direction}; ${weather.temperature.low}°–${weather.temperature.high}°F`;
  }

  window.GCCWeather = {
    VERSION,
    MONTHS,
    MONTH_LENGTHS,
    BASELINE,
    WATER_MODS,
    generateDailyWeather,
    describeWeather,
    monthLength,
    normalizeMonth,
    rollExpr,
    windForceFromSpeed,
  };

  console.log(`[weather] gcc-weather.js v${VERSION} loaded`);
})();
