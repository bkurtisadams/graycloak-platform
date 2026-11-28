// TIME, MOVEMENT, AND TURN LENGTH. Route movement: a turn is about four hours; walking covers one to ten kilometers
// a turn "depending on terrain and character movement speed"; "on average, one kilometer per turn over swampy or
// mountainous terrain to eight kilometers per turn over clear terrain is suggested". Six route turns make a day;
// characters "will have to rest at least two of the six ... or suffer a double fatigue loss during combat and reduce
// travel rates by half until rest is taken. In any case, rest must be taken after two days of exertion."
export const ROUTE_TURN_MINUTES = 240, REST_MINUTES = 2 * ROUTE_TURN_MINUTES, AWAKE_LIMIT = 4 * ROUTE_TURN_MINUTES, EXERTION_LIMIT = 2 * 1440;
// Kilometers a route turn on foot. Clear (8) and swampy or mountainous (1) are the printed suggestions; the values
// between are automated-referee policy, kept inside the printed range of one to ten.
export const ROUTE_KM = Object.freeze({
    clear: 8, plains: 8, grassland: 8, coast: 8,
    desert: 6,
    hills: 4, forest: 4, woods: 4, badlands: 4, wasteland: 4, ruins: 4, city: 4, radioactive: 4,
    'forested-hill': 3,
    'heavy-forest': 2,
    mountains: 1, 'snow-mountains': 1, 'forested-mountains': 1, marsh: 1, swamp: 1,
});
export const PRINTED_ROUTE_KM = Object.freeze(['clear', 'mountains', 'snow-mountains', 'forested-mountains', 'marsh', 'swamp']);
// The printed rates are slow on purpose: "adventurers in a campaign will be traveling slower as they search carefully
// for signs of the Ancients and ... the wild and dangerous creatures". The same paragraph gives "the average man on
// foot" five kilometers an hour and lets a party "travel at a faster rate ... by allowing them to walk past valuable
// artifacts or into the lair of some deadly creature with little or no warning". Referee ruling: travelling is the
// normal pace and searching is the option. Travelling is 5 km an hour in the open (20 km a turn, 2.5 times the
// searching rate) and slows with the terrain in the same proportions.
export const PACE = Object.freeze({ travel: 2.5, search: 1 });
export const routeRate = (terrain, pace = 'search') => (ROUTE_KM[terrain] ?? 4) * (PACE[pace] ?? 1);
// Minutes to cover a distance at a route rate; a party that has gone without its rest travels at half rate.
export function travelMinutes(kilometers, kmPerTurn, { halved = false } = {}) {
    if (!(kilometers >= 0) || !(kmPerTurn >= 1 && kmPerTurn <= 25)) throw new RangeError('Route rates run from 1 km a turn to 5 km an hour');
    return Math.round(kilometers / (kmPerTurn * (halved ? 0.5 : 1)) * ROUTE_TURN_MINUTES);
}
// awake: minutes of activity since the last rest of two route turns.
export function restState(awake = 0) {
    return { awake, exhausted: awake > AWAKE_LIMIT, collapse: awake >= EXERTION_LIMIT, untilTired: Math.max(0, AWAKE_LIMIT - awake) };
}
// A march of so many minutes of walking, begun so long since the last rest. Unless the party is on a forced march it
// makes camp (two route turns) whenever four turns have passed without rest, so a slow hex can take more than a day.
// On a forced march nothing is added for sleep; the pace is the caller's to halve once the party is exhausted.
// Automatic camping is automated-referee policy: the book only says the rest must be taken.
export function marchTime(walking, awake = 0, { forced = false } = {}) {
    if (forced) return { total: walking, awake: awake + walking, camps: 0 };
    let total = 0, camps = 0, left = walking;
    while (left > 0) {
        const room = AWAKE_LIMIT - awake;
        if (room <= 0) { total += REST_MINUTES; awake = 0; camps++; continue; }
        const leg = Math.min(room, left);
        total += leg; awake += leg; left -= leg;
    }
    return { total, awake, camps };
}
// Referee ruling: old roads and trails speed travel. How much is automated-referee policy: following a road, the
// terrain no longer matters and the rate is that of open ground; following a trail, the terrain's rate is doubled,
// up to the open-ground rate. A step follows a way when both the hex left and the hex entered carry it.
export function wayRate(terrainRate, way, openRate) {
    return way === 'road' ? Math.max(terrainRate, openRate) : way === 'trail' ? Math.max(terrainRate, Math.min(openRate, terrainRate * 2)) : terrainRate;
}
