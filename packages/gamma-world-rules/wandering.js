// Random encounters at route movement (ENCOUNTERS): "the referee must check for random encounters once each day
// and night ... rolling a single six-sided die: a roll of six indicates an encounter", then "an appropriate die"
// for the time and a d20 on the ENCOUNTERS TABLE for the terrain where the party then stands.
// The tables, numbers appearing and bestiary are the campaign map's own data (gcc/gw-encounter-data.js,
// gcc/gw-creatures.js) and are passed in; nothing here copies them.
import { die, dice } from './index.js';
import { CREATURES } from './encounter.js';

export const DAY_BEGINS = 360, PERIOD = 720;
// Day runs 06:00-18:00 and night 18:00-06:00 (referee policy: the book names the two checks, not their hours).
export function travelPeriod(totalMinutes) {
    const index = Math.floor((totalMinutes - DAY_BEGINS) / PERIOD);
    return { index, night: ((index % 2) + 2) % 2 === 1, start: DAY_BEGINS + index * PERIOD };
}
// One check per period: d6, and on a six a d12 for the hour of the period in which it happens.
export function wanderingCheck(period, rng = Math.random) {
    const roll = die(6, rng), hour = roll === 6 ? die(12, rng) : null;
    return { period: period.index, night: period.night, roll, hour, at: hour ? period.start + (hour - 1) * 60 : null };
}
// Advance travel from one time to another. A pending encounter falls due once its time is reached (or at once, if
// travel began after that hour); otherwise entering a new period makes that period's check.
export function advanceWandering(state, from, to, rng = Math.random) {
    if (state?.at != null && to >= state.at) return { state: { ...state, at: null }, due: true, check: null };
    const period = travelPeriod(to);
    if (state?.period === period.index) return { state, due: false, check: null };
    const check = wanderingCheck(period, rng);
    if (check.at != null && check.at <= to) return { state: { period: check.period, at: null }, due: true, check };
    return { state: { period: check.period, at: check.at }, due: false, check };
}
export function tableKey(data, { terrain, hazard = null, feature = null } = {}) {
    return data.FEATURE_TO_TABLE?.[feature] ?? (hazard === 'radiation' ? 'radioactive' : null) ?? data.TERRAIN_TO_TABLE?.[terrain]
        // Terrain kinds added to the map after its table was written: read them by their family.
        ?? (/mountain/.test(terrain ?? '') ? 'mountains' : /forest/.test(terrain ?? '') ? 'forest' : 'clear');
}
export function rollNumber(expression, rng = Math.random) {
    const m = /^(\d+)(?:d(\d+))?$/.exec(String(expression ?? '1').trim());
    if (!m) return 1;
    return m[2] ? dice(Number(m[1]), Number(m[2]), rng) : Number(m[1]);
}
export function rollEncounter(data, key, rng = Math.random) {
    const table = data.ENCOUNTER_TABLES[key] ?? data.ENCOUNTER_TABLES.clear, roll = die(data.TABLE_DIE_SIZE ?? 20, rng);
    const row = table.find(r => roll >= r.min && roll <= r.max);
    return { table: key, roll, creature: row?.creature ?? 'No Encounter', number: row?.number ? rollNumber(row.number, rng) : null };
}

const slug = name => name.toLowerCase().replace(/[^a-z]/g, '').replace(/s$/, '');
// Table spellings that differ from the bestiary's.
const ALIAS = { ert: 'eat', terl: 'teal' };
const MELEE = /bite|claw|mandible|horn|kick|tail|blade|lash|spear-stem|proboscis/i;
export function findCreature(bestiary, name) {
    const key = ALIAS[slug(name)] ?? slug(name);
    return bestiary.find(c => slug(c.name) === key) ?? null;
}
// A bestiary entry the tactical engine can play today: a creature with hit dice, ground movement and a physical
// attack given in dice. Everything else it can do is listed in notes as not yet played. Returns null when the
// creature cannot be played yet (no dice attack, rooted, technology users, androids).
export function playableCreature(bestiary, name) {
    const key = slug(name);
    if (CREATURES[key]) return { key, definition: CREATURES[key] };
    const c = findCreature(bestiary, name);
    if (!c || !Number.isInteger(c.hd)) return null;
    const move = Number.parseInt(String(c.move), 10);
    if (!(move > 0)) return null;
    const attack = (c.attacks ?? []).find(a => MELEE.test(a.n) && /^\d+d\d+/.test(a.d));
    if (!attack) return null;
    const [, n, d] = /^(\d+)d(\d+)/.exec(attack.d), meters = Number.parseFloat(String(c.size));
    const unplayed = [...(c.attacks ?? []).filter(a => a !== attack).map(a => a.n), ...(c.mutations ?? [])];
    return { key, definition: {
        name: name, meeting: 'roll', speaks: !!c.intelligent, ac: c.ac, hd: c.hd, move, ms: Number.isInteger(c.ms) ? c.ms : null, dx: 10,
        intelligent: !!c.intelligent, natural: [Number(n), Number(d)], large: meters >= 2 || /large|horse|ox/i.test(String(c.size)),
        notes: `${attack.n} ${n}d${d}${/^\d+d\d+$/.test(attack.d) ? '' : ` (printed: ${attack.d})`}.${unplayed.length ? ` Not yet played: ${unplayed.join(', ')}.` : ''}`,
    } };
}
