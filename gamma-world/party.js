// Followers and hirelings in the campaign (CHARISMA, and "Non-player characters ... may also serve as followers or
// hirelings"). The printed rules: who can be led and how many, the reaction roll, offers worth a point or two, morale
// adjustment. Automated-referee policies are marked; they stand in for "it is up to the referee".
import * as gw from '../packages/gamma-world-rules/index.js';
import { characterFor, purse } from './settlement.js';

export const WAGE = 5;          // Policy placeholder: domars a day for a hireling, paid each dawn. The pasted rules give no rate.
export const OFFER = 10;        // Policy: an offer worth one point on the reaction roll costs 10 domars, as at meetings.
export const INTEREST = 4;      // Policy: in a small settlement someone is interested on 4+ on a d6, asked once a day.
// Eden Valley's people are its freed animal communities (the map key).
export const STOCKS = ['rat', 'bear', 'badger', 'reptile', 'cat', 'rabbit', 'dog', 'ape'];
const NAMES = ['Thistle', 'Sable', 'Bracken', 'Ember', 'Moss', 'Flint', 'Wren', 'Burr', 'Ash', 'Reed', 'Tansy', 'Cobb', 'Juniper', 'Slate', 'Fern', 'Garnet'];

export const party = e => (e.party ?? []).filter(m => !m.dead);
export const followers = e => party(e).filter(m => m.role === 'follower');
const pick = (list, rng) => list[gw.die(list.length, rng) - 1];
const describe = m => `${m.name} the ${m.stock || m.species}`;

// Advertise for companions where people gather. One asking a day; the referee's die says whether anyone is interested.
export function seekCompanion(e, rng = Math.random) {
    const day = e.days ?? 0;
    if (e.recruit?.day === day) throw Error(e.recruit.candidate ? 'You have already found someone today' : 'No one else will come forward today');
    const roll = gw.die(6, rng);
    if (roll < INTEREST) return { ...e, recruit: { day, roll, candidate: null } };
    const taken = new Set(party(e).map(m => m.name)), stock = pick(STOCKS, rng), name = pick(NAMES.filter(n => !taken.has(n)), rng);
    const character = gw.generateCompanion({ species: 'animal', stock, name, rng });
    return { ...e, recruit: { day, roll, state: 'open', candidate: { id: `c${day}-${e.steps ?? 0}-${name.toLowerCase()}`, name, species: 'animal', stock, character } } };
}
// Make your case, with or without an offer. Hostile results end it; uncertain allows another offer.
export function approach(e, offer = false, rng = Math.random) {
    const r = e.recruit, who = r?.candidate;
    if (!who || !['open', 'uncertain'].includes(r.state)) throw Error('There is no one to speak with');
    if (r.state === 'uncertain' && !offer) throw Error('Make an offer to try again');
    if (offer && purse(e) < OFFER) throw Error(`An offer costs ${OFFER} domars`);
    const leader = characterFor(e), reaction = gw.recruitReaction(leader, who.species, offer ? 1 : 0, rng);
    let state = reaction.outcome;
    if (state === 'follower' && !gw.canLead(leader, who.species, followers(e).length)) state = 'hireling';
    return { ...e, domars: purse(e) - (offer ? OFFER : 0), recruit: { ...r, state, reaction, capped: state !== reaction.outcome } };
}
export function takeOn(e) {
    const r = e.recruit, who = r?.candidate;
    if (!who || !['follower', 'hireling'].includes(r.state)) throw Error('No one has agreed to come');
    if (r.state === 'hireling' && purse(e) < WAGE) throw Error(`The first day's pay is ${WAGE} domars`);
    const member = { ...who, role: r.state, damage: 0, ...(r.state === 'hireling' ? { wage: WAGE } : {}) };
    return { ...e, domars: purse(e) - (member.wage ?? 0), party: [...(e.party ?? []), member], recruit: { day: r.day, roll: r.roll, candidate: null, joined: who.name } };
}
export function dismiss(e, id) { return { ...e, party: (e.party ?? []).filter(m => m.id !== id) }; }
// Each dawn hirelings are paid; one who cannot be paid leaves.
export function payWages(e, days) {
    let domars = purse(e), members = [...(e.party ?? [])];
    const news = [];
    for (let d = 0; d < days; d++) for (const m of members.filter(m => m.role === 'hireling' && !m.dead)) {
        if (domars >= m.wage) domars -= m.wage;
        else { members = members.filter(x => x !== m); news.push(`${describe(m)} is not paid and leaves.`); }
    }
    const paid = purse(e) - domars;
    if (paid) news.unshift(`Hirelings paid ${paid} domars.`);
    return { entry: { ...e, domars, party: members }, news };
}
// The party as it enters a fight: each companion's character at current hit points, with the leader's morale adjustment.
export function partyFor(e, leader = characterFor(e)) {
    return party(e).map(m => ({ ...m.character, hp: Math.max(1, m.character.maxHp - (m.damage ?? 0)), companionId: m.id, moraleAdjust: gw.leadership(leader, m.species).morale }));
}
export { describe };
