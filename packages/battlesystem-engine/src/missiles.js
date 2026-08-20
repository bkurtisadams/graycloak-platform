// missiles.js v1.0.0 - 2026-08-20 — @graycloak/battlesystem-engine
// [10.x] Missile weapon + field artillery data and range logic, migrated from
// battlesystem-board.html v0.24-v0.25 so the engine owns all fire data (the
// board, Foundry ars-battlesystem-tab, and Node sims read the same tables).
//
// MISSILE_WEAPONS: PHB ranges in inches (1" = 10 yds outdoors [2.1]) and rates
// of fire. cls drives the Table 12 movement coupling implemented by consumers:
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
// ARTILLERY_WEAPONS [10.9]: catapults cannot shoot inside min range, always
// treat their target as AC 5, may use indirect fire at normal penalties, and
// fire every other Game Round (cadence 2). Ballistae need a straight line of
// sight (no indirect), always treat their target as AC 10, and fire every
// round (cadence 1). AR = the crew figure's THACO, NOT ratio-adjusted [10.10];
// a replacement crew fires at +2 for the battle; a wounded crew cannot move
// the piece and fires at half rate (consumers double cadence).

export const MISSILE_WEAPONS = Object.freeze({
    longbow:  { s: 7, m: 14, l: 21, rof: 2,   cls: 'archer' },
    shortbow: { s: 5, m: 10, l: 15, rof: 2,   cls: 'archer' },
    crossbow: { s: 8, m: 16, l: 24, rof: 0.5, cls: 'xbow' },
    sling:    { s: 4, m: 8,  l: 16, rof: 1,   cls: 'xbow' },
    javelin:  { s: 2, m: 4,  l: 6,  rof: 1,   cls: 'thrown', volleys: 2 },
    spear:    { s: 1, m: 2,  l: 3,  rof: 1,   cls: 'thrown', volleys: 2 },
    handaxe:  { s: 1, m: 2,  l: 3,  rof: 1,   cls: 'thrown', volleys: 2 },
    dagger:   { s: 1, m: 2,  l: 3,  rof: 2,   cls: 'thrown', volleys: 2 },
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
// catapult minimum-range refusal [10.9]. Returns { ok, band, arDelta } or
// { ok:false, reason }.
export function rangeBand(dist, w) {
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
