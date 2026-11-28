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
const TOUCH = /claw|bite|spine|proboscis/i, INTENSITY = /intensity (\d+)/i;
// A bestiary entry the tactical engine can play today: a creature with hit dice and ground movement whose attack is
// a physical one given in dice, a poisoned touch, or a radiation aura. Poison riders and a blood drain are read from
// the same entry. Anything else it can do is listed in notes as not yet played. Returns null when the creature
// cannot be played yet (rooted, technology users, androids, attacks with no stated range).
export function playableCreature(bestiary, name) {
    const key = slug(name);
    if (CREATURES[key]) return { key, definition: CREATURES[key] };
    const c = findCreature(bestiary, name);
    if (!c || !Number.isInteger(c.hd)) return null;
    const move = Number.parseInt(String(c.move), 10);
    if (!(move > 0)) return null;
    const attacks = c.attacks ?? [], used = new Set();
    const strike = attacks.find(a => MELEE.test(a.n) && /^\d+d\d+/.test(a.d)) ?? attacks.find(a => TOUCH.test(a.n) && /poison/i.test(`${a.n} ${a.d}`) && INTENSITY.test(a.d));
    const aura = attacks.find(a => /radiation aura/i.test(a.n) && INTENSITY.test(a.d) && /(\d+)m radius/.test(a.d));
    const drain = attacks.find(a => /blood drain/i.test(a.n) && /^(\d+)hp/.test(a.d));
    if (!strike && !aura) return null;
    const definition = { name, meeting: 'roll', speaks: !!c.intelligent, ac: c.ac, hd: c.hd, move, ms: Number.isInteger(c.ms) ? c.ms : null, dx: 10, intelligent: !!c.intelligent,
        large: Number.parseFloat(String(c.size)) >= 2 || /large|horse|ox/i.test(String(c.size)) };
    const said = [];
    if (strike) {
        used.add(strike);
        const dmg = /^(\d+)d(\d+)/.exec(strike.d), poisoned = /poison/i.test(`${strike.n} ${strike.d}`) && INTENSITY.exec(strike.d);
        definition.natural = dmg ? [Number(dmg[1]), Number(dmg[2])] : [0, 6];
        if (poisoned) definition.poison = { intensity: Number(poisoned[1]), paralytic: /paralytic/i.test(strike.d), stone: /stone/i.test(strike.d) };
        said.push(`${strike.n} ${dmg ? dmg[0] : 'no damage'}${poisoned ? `, ${definition.poison.paralytic ? 'paralytic ' : ''}poison intensity ${poisoned[1]}` : ''}${/^\d+d\d+$/.test(strike.d) || poisoned ? '' : ` (printed: ${strike.d})`}`);
    }
    if (aura) { used.add(aura); definition.radiate = { intensity: Number(INTENSITY.exec(aura.d)[1]), range: Number(/(\d+)m radius/.exec(aura.d)[1]) }; said.push(`${aura.n} intensity ${definition.radiate.intensity}, ${definition.radiate.range} m`); }
    if (drain && definition.poison?.paralytic) { used.add(drain); definition.drain = Number(/^(\d+)hp/.exec(drain.d)[1]); said.push(`${drain.n} ${definition.drain} a turn on a paralysed victim`); }
    const unplayed = [...attacks.filter(a => !used.has(a)).map(a => a.n), ...(c.mutations ?? [])];
    definition.notes = `${said.join('; ')}.${unplayed.length ? ` Not yet played: ${unplayed.join(', ')}.` : ''}`;
    return { key, definition };
}
