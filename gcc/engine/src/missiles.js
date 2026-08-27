// missiles.js v1.2.0 - 2026-08-27 — @graycloak/battlesystem-engine
// v1.2.0: generalize giant rock throwing as a creature missile family. BATTLESYSTEM
//         roster ranges use explicit S/M/L bands (Hill Giant example 7/14/20, 2d8),
//         while subtype damage/range remains source-backed. All giant rocks are ROF 1
//         thrown missiles, not artillery.
// v1.1.0: Hill-Giant-only source-flat prototype (superseded by v1.2.0).
// [10.x] Missile weapon + field artillery data and range logic, migrated from
// battlesystem-board.html v0.24-v0.25 so the engine owns all fire data (the
// board, Foundry ars-battlesystem-tab, and Node sims read the same tables).
//
// MISSILE_WEAPONS: PHB/source ranges in inches (1" = 10 yds outdoors [2.1]) and
// rates of fire. cls drives the Table 12 movement coupling implemented by consumers:
//   archer  — fire twice if unmoved, once at <= 1/2 MV; two firing rows in
//             closed/open order [10.1]
//   xbow    — move OR shoot (slings share the class); crossbow rof 0.5 =
//             every other Game Round [PHB heavy arbalest]
//   thrown  — fire once, <= 2/3 MV (Table 12 caps ALL thrown at one shot;
//             PHB dagger ROF 2 defers to it); two volleys of ammunition
//             unless a scenario says otherwise [10.3]
//   mountedArcher — fire twice if unmoved, once with FULL movement (Table 12);
//             split-fire eligible [10.5] (move 1/2, fire, keep moving)
//
// rangeMode:'flat' remains available for future published creature missiles whose source
// truly supplies a single no-band span. Giant rocks do NOT use it: the published
// BATTLESYSTEM roster gives them S/M/L bands.
//
// ARTILLERY_WEAPONS [10.9]: catapults cannot shoot inside min range, always
// treat their target as AC 5, may use indirect fire at normal penalties, and
// fire every other Game Round (cadence 2). Ballistae need a straight line of
// sight (no indirect), always treat their target as AC 10, and fire every
// round (cadence 1). AR = the crew figure's THACO, NOT ratio-adjusted [10.10];
// a replacement crew fires at +2 for the battle; a wounded crew cannot move
// the piece and fires at half rate (consumers double cadence).
const giantRock = (giant, s, m, l, damage) => Object.freeze({
    label: 'Hurl rocks', giant, s, m, l, rof: 1, cls: 'thrown', damage,
    source: 'AD&D 1e giant rock throwing / BATTLESYSTEM S-M-L roster bands'
});

// BATTLESYSTEM's published Heroes & Commanders roster demonstrates the conversion
// explicitly for Hill Giants: range 7/14/20", damage 2d8. The remaining true-giant
// rows use the same one-third / two-thirds / maximum banding of their published
// rock-throw maximums. Fog/Mountain are included for 1e expansion creatures.
export const GIANT_ROCK_PROFILES = Object.freeze({
    hill:     giantRock('Hill giant',     7, 14, 20, '2d8'),
    mountain: giantRock('Mountain giant', 7, 14, 20, '2d8'),
    frost:    giantRock('Frost giant',    7, 14, 20, '2d10'),
    fire:     giantRock('Fire giant',     7, 14, 20, '2d10'),
    fog:      giantRock('Fog giant',      8, 16, 24, '2d10'),
    cloud:    giantRock('Cloud giant',    8, 16, 24, '2d12'),
    storm:    giantRock('Storm giant',    8, 16, 24, '3d12'),
    stone:    giantRock('Stone giant',   10, 20, 30, '3d10'),
});

export function giantRockTypeFor(race) {
    const k = String(race || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!k.includes('giant')) return null;
    for (const type of ['mountain','stone','frost','fire','cloud','storm','hill','fog']) {
        if (k.includes(type)) return type;
    }
    return null;
}
export function giantRockDataFor(race) {
    const type = giantRockTypeFor(race);
    return type ? GIANT_ROCK_PROFILES[type] : null;
}

export const MISSILE_WEAPONS = Object.freeze({
    longbow:          { s: 7, m: 14, l: 21, rof: 2,   cls: 'archer' },
    shortbow:         { s: 5, m: 10, l: 15, rof: 2,   cls: 'archer' },
    crossbow:         { s: 8, m: 16, l: 24, rof: 0.5, cls: 'xbow' },
    sling:            { s: 4, m: 8,  l: 16, rof: 1,   cls: 'xbow' },
    javelin:          { s: 2, m: 4,  l: 6,  rof: 1,   cls: 'thrown', volleys: 2 },
    spear:            { s: 1, m: 2,  l: 3,  rof: 1,   cls: 'thrown', volleys: 2 },
    handaxe:          { s: 1, m: 2,  l: 3,  rof: 1,   cls: 'thrown', volleys: 2 },
    dagger:           { s: 1, m: 2,  l: 3,  rof: 2,   cls: 'thrown', volleys: 2 },
    hillgiantboulder: GIANT_ROCK_PROFILES.hill,
    hillgiantrock:    GIANT_ROCK_PROFILES.hill,
    mountaingiantboulder: GIANT_ROCK_PROFILES.mountain,
    mountaingiantrock:    GIANT_ROCK_PROFILES.mountain,
    frostgiantboulder: GIANT_ROCK_PROFILES.frost,
    frostgiantrock:    GIANT_ROCK_PROFILES.frost,
    firegiantboulder: GIANT_ROCK_PROFILES.fire,
    firegiantrock:    GIANT_ROCK_PROFILES.fire,
    foggiantboulder: GIANT_ROCK_PROFILES.fog,
    foggiantrock:    GIANT_ROCK_PROFILES.fog,
    cloudgiantboulder: GIANT_ROCK_PROFILES.cloud,
    cloudgiantrock:    GIANT_ROCK_PROFILES.cloud,
    stormgiantboulder: GIANT_ROCK_PROFILES.storm,
    stormgiantrock:    GIANT_ROCK_PROFILES.storm,
    stonegiantboulder: GIANT_ROCK_PROFILES.stone,
    stonegiantrock:    GIANT_ROCK_PROFILES.stone,
});
export const ARTILLERY_WEAPONS = Object.freeze({
    lightCatapult: { label: 'Light Catapult', min: 15, s: 20, m: 25, l: 30, dmg: '2d10', mv: 8, cadence: 2, indirect: true,  fixedTargetAC: 5 },
    heavyCatapult: { label: 'Heavy Catapult', min: 18, s: 24, m: 30, l: 36, dmg: '2d12', mv: 4, cadence: 2, indirect: true,  fixedTargetAC: 5 },
    ballista:      { label: 'Ballista',                s: 11, m: 22, l: 32, dmg: '2d6',  mv: 6, cadence: 1, indirect: false, fixedTargetAC: 10 },
});
// Weapon-name normalization shared by every consumer: lowercase, whitespace and
// apostrophes stripped ("Horseman's Mace" -> horsemansmace, "hand axe" -> handaxe).
export function missileKey(name) {
    return String(name || '').toLowerCase().replace(/[\s']+/g, '');
}
export function missileDataFor(name) {
    return MISSILE_WEAPONS[missileKey(name)] || null;
}
// [10.8] Table 13 range bands as AR deltas (positive = penalty), plus the
// catapult minimum-range refusal [10.9]. Published creature missiles may instead
// use rangeMode:'flat': enforce their source min/max span but do not invent S/M/L
// penalties the source does not provide. Returns { ok, band, arDelta } or
// { ok:false, reason }.
export function rangeBand(dist, w) {
    if (w.rangeMode === 'flat') {
        if (w.min != null && dist < w.min - 1e-6) {
            return { ok: false, reason: `inside the ${w.min}" minimum source range [13.0]` };
        }
        if (dist > w.l + 1e-6) {
            return { ok: false, reason: `beyond the ${w.l}" maximum source range [13.0]` };
        }
        return { ok: true, band: 'flat', arDelta: 0 };
    }
    if (w.min != null && dist < w.min - 1e-6) {
        return { ok: false, reason: `inside the ${w.min}" minimum range [10.9]` };
    }
    if (dist > w.l + 1e-6) {
        return { ok: false, reason: `beyond the ${w.l}" long range [10.8]` };
    }
    if (dist <= w.s) return { ok: true, band: 'short',  arDelta: 0 };
    if (dist <= w.m) return { ok: true, band: 'medium', arDelta: 2 };
    return { ok: true, band: 'long', arDelta: 5 };
}
