import test from 'node:test';
import assert from 'node:assert/strict';
import * as gw from '../index.js';
import { seekCompanion, approach, takeOn, payWages, partyFor, followers, WAGE, OFFER } from '../../../gamma-world/party.js';
import { storeCombat } from '../../../gamma-world/campaign.js';
import { rest } from '../../../gamma-world/settlement.js';

const seq = (...values) => { let i = 0; return () => values[i++ % values.length]; };
const who = (species, CH) => ({ species, attributes: { CH } });

test('CHARISMA TABLE: maximum followers, morale and reaction for every score', () => {
  const printed = [[3, 1, -3, -3], [4, 1, -3, -2], [5, 2, -2, -2], [6, 2, -2, -1], [7, 3, -1, -1], [8, 3, -1, 0], [9, 4, 0, 0], [10, 4, 0, 0], [11, 4, 0, 0], [12, 5, 0, 0], [13, 5, 0, 1], [14, 6, 1, 1], [15, 7, 1, 2], [16, 8, 2, 2], [17, 10, 2, 3], [18, 15, 3, 3]];
  for (const [CH, followers, morale, reaction] of printed) assert.deepEqual(gw.leadership(who('psh', CH), 'psh'), { followers, morale, reaction }, `Charisma ${CH}`);
});

test('CHARISMA TABLE MODIFIERS: all nine pairings of player and non-player type', () => {
  const printed = { psh: { psh: [0, 0, 0], humanoid: [-2, -1, -1], animal: [-3, -1, -1] }, humanoid: { psh: [-2, -1, -1], humanoid: [0, 0, 0], animal: [-2, -1, -1] }, animal: { psh: [-3, -2, -2], humanoid: [-2, -2, -1], animal: [0, 0, 0] } };
  for (const [pc, row] of Object.entries(printed)) for (const [npc, [f, m, r]] of Object.entries(row))
    assert.deepEqual(gw.leadership(who(pc, 12), npc), { followers: 5 + f, morale: m, reaction: r }, `${pc} leading ${npc}`);
  assert.equal(gw.leadership(who('psh', 3), 'animal').followers, 0, 'never below none');
  assert.equal(gw.canLead(who('psh', 12), 'animal', 2), false);
  assert.equal(gw.canLead(who('psh', 12), 'animal', 1), true);
});

test('reaction to being asked along: 12 follows, 9-11 hires on, 6-8 is uncertain, 5 or less ends it', () => {
  assert.deepEqual([12, 11, 9, 8, 6, 5, 2].map(gw.recruitOutcome), ['follower', 'hireling', 'hireling', 'uncertain', 'uncertain', 'refused', 'refused']);
  // Charisma 17 PSH with a mutated animal: +3 - 1 = +2; an offer adds 1. 2d6 of 9 becomes 12.
  const r = gw.recruitReaction(who('psh', 17), 'animal', 1, seq(0.5, 0.75));
  assert.deepEqual([r.rolled, r.modifier, r.score, r.label, r.outcome], [9, 3, 12, 'enthusiastic', 'follower']);
});

const companion = () => gw.generateCompanion({ species: 'animal', stock: 'badger', name: 'Thistle' });
test('a companion is rolled as a character: 3d6 attributes, mutations, primitive arms', () => {
  for (let i = 0; i < 20; i++) {
    const c = companion();
    assert.equal(c.species, 'animal');
    assert.ok(c.maxHp > 0 && c.hp === c.maxHp && c.equipment.weaponId && c.effects);
    assert.equal(new Set(c.mutations).size, c.mutations.length);
  }
});

const entry = (CH, extra = {}) => { const b = gw.generateCharacter({ species: 'psh', name: 'Ashe', rng: seq(0.5) }); b.attributes.CH = CH; return { record: { base: b, generation: gw.mutationDraft(b), choices: [], equipment: { weaponId: 'long-sword', armorId: 'hide' }, weightKg: 70 }, inventory: [], domars: 100, days: 2, scene: 'eden-valley', position: { x: 30, y: 21 }, ...extra }; };

test('asking in the settlement: once a day, 4+ finds someone; the reaction decides follower, hireling or neither', () => {
  let e = seekCompanion(entry(12), seq(0.4));
  assert.deepEqual([e.recruit.roll, e.recruit.candidate], [3, null]);
  assert.throws(() => seekCompanion(e), /No one else will come forward today/);
  e = seekCompanion(entry(12), seq(0.6, 0.3, 0.1));
  assert.equal(e.recruit.candidate.species, 'animal');
  assert.throws(() => seekCompanion(e), /already found someone today/);
  // Charisma 12 PSH with a mutated animal: reaction -1. 2d6 of 10 is 9: will hire on.
  let hired = approach(e, false, seq(0.7, 0.7));
  assert.deepEqual([hired.recruit.reaction.rolled, hired.recruit.reaction.score, hired.recruit.state, hired.domars], [10, 9, 'hireling', 100]);
  hired = takeOn(hired);
  assert.deepEqual([hired.party.length, hired.party[0].role, hired.party[0].wage, hired.domars], [1, 'hireling', WAGE, 100 - WAGE]);
  // 2d6 of 8 is 7: uncertain. Only an offer reopens it; 12 with the offer is... 2d6 12 - 1 + 1 = 12: a follower.
  const unsure = approach(e, false, seq(0.5, 0.5));
  assert.equal(unsure.recruit.state, 'uncertain');
  assert.throws(() => approach(unsure, false), /Make an offer to try again/);
  const loyal = takeOn(approach(unsure, true, seq(0.99, 0.99)));
  assert.deepEqual([loyal.party[0].role, loyal.party[0].wage, loyal.domars, followers(loyal).length], ['follower', undefined, 100 - OFFER, 1]);
  // 2d6 of 4 is 3: hostile, and no further attempt.
  const no = approach(e, false, seq(0.2, 0.2));
  assert.equal(no.recruit.state, 'refused');
  assert.throws(() => approach(no, true), /no one to speak with/);
  assert.throws(() => takeOn(no), /No one has agreed/);
});

test('the follower limit holds: beyond it an enthusiastic recruit comes only for pay', () => {
  // Charisma 12 PSH leading mutated animals: 5 - 3 = 2 followers, and two already follow.
  const e = seekCompanion(entry(12), seq(0.6, 0.3, 0.1));
  const low = entry(12); low.recruit = e.recruit; low.party = ['a', 'b'].map(id => ({ id, name: id, species: 'animal', role: 'follower', damage: 0 }));
  const r = approach(low, true, seq(0.99, 0.99));
  assert.deepEqual([r.recruit.reaction.outcome, r.recruit.state, r.recruit.capped], ['follower', 'hireling', true]);
});

test('hirelings are paid each dawn and leave when they cannot be; followers cost nothing', () => {
  const m = role => ({ id: role, name: role, species: 'animal', stock: 'cat', role, damage: 0, character: companion(), ...(role === 'hireling' ? { wage: WAGE } : {}) });
  const e = { domars: 12, party: [m('follower'), m('hireling')] };
  const two = payWages(e, 2);
  assert.deepEqual([two.entry.domars, two.entry.party.length, two.news], [2, 2, ['Hirelings paid 10 domars.']]);
  const three = payWages(e, 3);
  assert.deepEqual([three.entry.domars, three.entry.party.map(x => x.role)], [2, ['follower']]);
  assert.match(three.news[1], /is not paid and leaves/);
});

test('companions fight beside the survivor, check morale with the leader\'s adjustment, and carry wounds home', () => {
  const lead = entry(18), ally = { id: 'a1', name: 'Thistle', species: 'animal', stock: 'badger', role: 'follower', damage: 4, character: companion() };
  lead.party = [ally];
  const base = gw.deriveCharacter(lead.record.base, lead.record.generation, [], lead.record.equipment), allies = partyFor(lead, base);
  assert.deepEqual([allies[0].hp, allies[0].companionId, allies[0].moraleAdjust], [ally.character.maxHp - 4, 'a1', 2]);
  let s = gw.beginInteractive(gw.createEncounter(base, { creature: 'podog', count: 2, allies, rng: seq(0.9, 0.1, 0.5) }), { rng: seq(0.5) });
  assert.deepEqual(s.actors.map(a => a.side), ['left', 'left', 'right', 'right']);
  assert.equal(s.actors[1].ally, true);
  for (let i = 0; i < 12 && s.status === 'active'; i++) s = gw.interactiveCommand(s, { type: 'end', expectedRevision: s.revision }, { rng: seq(0.95, 0.5, 0.7, 0.3) });
  const log = s.log.join(' ');
  assert.match(log, /Thistle moves/);
  assert.match(log, /Thistle → Podog \d: d20/);
  assert.match(log, /Podog \d → (Thistle|Ashe): d20/);
  // A badly hurt follower checks morale: d10 1 would break an intelligent being, but Charisma 18 with a mutated animal gives +2.
  let t = gw.createEncounter(base, { creature: 'podog', count: 1, allies, rng: seq(0.9, 0.1, 0.5) });
  t.actors[1].hp = 1;
  t = gw.beginInteractive(t, { rng: seq(0) });
  assert.match(t.log.join(' '), /Thistle morale check \(d10 1, leader's Charisma \+2, needs 3\): holds/);
  // After the fight the wounds are kept, and the dead are struck off with a line of news.
  const done = { ...s, status: 'victory' };
  done.actors = done.actors.map(a => a.ally ? { ...a, hp: a.maxHp - 9 } : a);
  assert.equal(storeCombat(lead, done).party[0].damage, 9);
  done.actors = done.actors.map(a => a.ally ? { ...a, hp: 0 } : a);
  const after = storeCombat(lead, done);
  assert.deepEqual([after.party.length, after.advancement.news], [0, ['Thistle was killed in the fight.']]);
  // Resting heals companions a point a day with the survivor.
  const rested = rest({ ...lead, party: [{ ...ally, damage: 3 }] }, true);
  assert.deepEqual([rested.party[0].damage, rested.days], [0, 5]);
});

test('referee ruling: when the survivor falls the companions fight on, to victory or to the last', () => {
  const lead = entry(18), base = gw.deriveCharacter(lead.record.base, lead.record.generation, [], lead.record.equipment);
  const strong = { ...companion(), hp: 500, maxHp: 500, companionId: 'a1', moraleAdjust: 3 }, weak = { ...companion(), hp: 1, maxHp: 40, companionId: 'a2', moraleAdjust: 3 };
  const fight = ally => { let s = gw.createEncounter(base, { creature: 'podog', count: 1, allies: [ally], rng: seq(0.9, 0.1, 0.5) }); s = gw.beginInteractive(s, { rng: seq(0.5) }); s.actors[0].hp = 0; s.actors[0].dying = false; return gw.interactiveCommand(s, { type: 'end', expectedRevision: s.revision }, { rng: seq(0.95, 0.6, 0.8, 0.4, 0.99) }); };
  const won = fight(strong), log = won.log.join(' ');
  assert.match(log, /Ashe has fallen\. The companions fight on\./);
  assert.equal(won.status, 'victory');
  assert.match(log, /The companions hold the field, but Ashe has fallen\./);
  assert.equal(won.actors[0].hp, 0);
  assert.ok(won.round > 1, 'the rounds played out without waiting for the fallen survivor');
  const lost = fight(weak);
  assert.equal(lost.status, 'defeat');
  // Companions earn no experience (ruling): it is the survivor's alone, and theirs is unchanged.
  assert.equal(won.actors[1].experience, strong.experience);
});
