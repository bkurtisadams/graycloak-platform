// Gamma World 1e (1981), pp.17–21. Local tactical simulation; explicit referee policies in README.
import { antidoteChance, die, dice, charisma, initiative, physicalAttack, integer, naturalTarget, mentalBlast, characterMovement, receiveDamage, bleedingRound, bindWounds, totalHealing, radiation, characterHazard, physicalPower, PHYSICAL_POWER_RULES, getWeapon, getArmor, equipmentAttack, deriveCharacter, generateCharacter, mutationDraft, laserAttack } from './index.js';
export const GRID_METERS = 3;
export const CREATURES = Object.freeze({
    badder: { name: 'Badder', meeting: 'roll', speaks: true, ac: 4, hd: 6, move: 12, ms: 16, dx: 18, intelligent: true, weapon: 'club', large: false, notes: 'p.22–23: empathy, keen smell, hard of hearing; club loadout is a sandbox choice.' },
    ark: { name: 'Ark', ac: 4, hd: 8, move: 15, ms: 10, dx: 10, intelligent: true, weapon: 'club', large: true, notes: 'p.22: club and shield; telekinesis, weather and life leech not implemented.' },
    podog: { name: 'Podog', meeting: 'roll', ac: 5, hd: 4, move: 15, ms: null, dx: 10, intelligent: false, natural: [2, 6], large: true, notes: 'p.26: wild Podog, bite/slash 2d6; opening mimicked cry and poison immunity; mounted AC, pack tactics and rare dual brains pending.' },
    brutorz: { name: 'Brutorz', meeting: 'roll', speaks: true, ac: 7, hd: 14, move: 18, ms: 12, dx: 10, intelligent: true, natural: [3, 6], large: true, notes: 'p.23: practice encounter only, bite 3d6; alternate kicks and precognition pending.' },
    arn: { name: 'Arn', meeting: 'roll', ac: 9, hd: 8, move: 3, ms: null, dx: 10, intelligent: false, natural: [2, 6], large: false, notes: 'p.22: provoked ground encounter, no flight simulated.' },
});
const weaponStart = { 'battle-axe': 14, 'hand-axe': 14, arrow: 15, crossbow: 15, club: 15, dagger: 18, flail: 12, javelin: 16, lance: 14, mace: 14, 'morning-star': 13, polearm: 12, 'sling-bullet': 18, 'sling-stone': 18, spear: 16, 'long-sword': 14, 'short-sword': 14, 'two-handed-sword': 11 };
export function fatigueFactor({ weaponId, armorAC = 10, rounds = 0, rest = 0, PS = 10, synthetic = false }) { integer(rounds, 0, 100000); integer(rest, 0, 100000); if (synthetic)
    return 0; const armorStart = armorAC === 10 ? Infinity : armorAC === 9 ? 18 : armorAC === 8 ? 17 : armorAC >= 6 ? 16 : armorAC >= 2 ? 15 : Infinity; return Math.max(0, Math.max(0, rounds - (weaponStart[weaponId] ?? Infinity) + 1) + Math.max(0, rounds - armorStart + 1) - rest - Math.max(0, PS - 15)); }
export function moraleCheck({ intelligent = false, lair = false, young = false, rng = Math.random } = {}) { const roll = die(10, rng), bonus = lair ? (intelligent ? 1 : 3) * (young ? 2 : 1) : 0; return { roll, bonus, holds: roll + bonus >= (intelligent ? 3 : 5) }; }
export function firstStrike({ leftImmune = false, rightImmune = false, possible = true, rng = Math.random } = {}) { let left = die(6, rng), right = die(6, rng); const surpriseRolls = { left, right }, ls = possible && !leftImmune && left <= 2, rs = possible && !rightImmune && right <= 2; if (ls !== rs)
    return { left, right, surpriseRolls, leftSurprised: ls, rightSurprised: rs, first: ls ? 'right' : 'left' }; for (let n = 0; n < 100; n++) {
    if (left !== right)
        return { left, right, surpriseRolls, leftSurprised: ls, rightSurprised: rs, first: left > right ? 'left' : 'right' };
    left = die(6, rng);
    right = die(6, rng);
} throw Error('First strike tie reroll limit reached'); }
const clone = x => structuredClone(x), active = a => a.hp > 0 && !a.fled, dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) * GRID_METERS, adjacent = (a, b) => dist(a, b) <= GRID_METERS * Math.SQRT2 + 1e-8;
export const distance = dist;
const emptyEffects = () => ({ movementMultiplier: 1, attacksPerRound: 1, mentalResistance: 10 });
function unit(c, id, x, y, side, extra = {}) { return { ...clone(c), id, x, y, side, hd: c.attributes.CN, large: false, intelligent: true, normalMove: 12, fled: false, dying: false, rest: 0, fightRounds: 0, uses: {}, mentalSuccesses: 0, mentalDefenses: 0, plantCharge: 4, ...extra }; }
function enemy(key, i, rng, definition, count = 1) { const d = definition ?? CREATURES[key]; if (!d)
    throw Error('Unknown creature'); const hp = dice(d.hd, 6, rng), ms = d.ms ?? dice(3, 6, rng); return unit({ name: `${d.name} ${i + 1}`, species: 'creature', attributes: { MS: ms, IN: 10, DX: d.dx, CH: 10, CN: 10, PS: 10 }, hp, maxHp: hp, armorClass: d.ac, mutations: [], equipment: { weaponId: d.weapon ?? null, armorId: 'none' }, effects: { ...emptyEffects(), mentalResistance: ms, poisonResistance: 10, poisonImmune: key === 'podog', radiationResistance: 10 }, reviewRequired: [], experience: 0 }, `npc-${i + 1}`, count > 3 ? 11 + Math.floor(i / 5) * 2 : 11, count > 3 ? 1 + (i % 5) * 2 : 2 + i * 3, 'right', { hd: d.hd, large: d.large, intelligent: d.intelligent, normalMove: d.move, natural: d.natural ?? null, poison: d.poison ?? null, radiate: d.radiate ?? null, drain: d.drain ?? null, creatureKey: key }); }
export function createEncounter(character, { creature = 'badder', definition = null, allies = [], count = 1, rng = Math.random, surprisePossible = true, blocked = [], meeting = false, intelligentMorale = false } = {}) { if (!character?.selectionComplete || !character.effects || character.hp <= 0)
    throw Error('Complete a living character first'); integer(count, 1, 8, 'opponents'); const kind = definition ?? CREATURES[creature]; if (!kind) throw Error('Unknown creature'); const places = [[1, 3], [1, 7], [2, 2], [2, 8], [0, 5], [0, 3], [0, 7], [1, 1], [1, 9], [0, 1], [0, 9], [3, 1], [3, 9], [0, 2], [0, 8]]; integer(allies.length, 0, places.length, 'companions'); const player = unit(character, 'player', 2, 5, 'left'), actors = [player, ...allies.map((c, i) => unit(c, `ally-${i + 1}`, places[i][0], places[i][1], 'left', { ally: true, companionId: c.companionId ?? null, moraleAdjust: c.moraleAdjust ?? 0 })), ...Array.from({ length: count }, (_, i) => enemy(creature, i, rng, definition, count))]; const order = firstStrike({ leftImmune: !!player.effects.surpriseImmune, possible: surprisePossible, rng }); if (creature === 'podog') {
    order.first = 'right';
    order.mimickedCry = true;
} return { creatureName: kind.name, intelligentMorale: !!intelligentMorale, meeting: meeting && kind.meeting === 'roll' ? { open: true, speaks: !!kind.speaks, talked: false, gifted: false, result: null } : null, version: 1, round: 1, seconds: 0, width: 15, height: 11, blocked: structuredClone(blocked), actors, order, status: 'active', log: [`Round 1: first strike ${order.first === 'left' ? 'player' : 'creatures'} (${order.left}/${order.right}); ${order.leftSurprised && order.rightSurprised ? 'Both sides surprised' : order.leftSurprised ? 'Your side surprised' : order.rightSurprised ? 'Creatures surprised' : 'Neither side surprised'}.${order.mimickedCry ? ' Podog mimics the prey’s cry and takes first strike.' : ''}`], pendingRulings: [], xpAwarded: 0 }; }
export const blockedCell = (s, x, y) => (s.blocked ?? []).some(p => p.x === x && p.y === y);
export function lineOfSight(s, a, b) { const dx = b.x - a.x, dy = b.y - a.y, n = Math.max(Math.abs(dx), Math.abs(dy)) * 2; for (let i = 1; i < n; i++) {
    const x = Math.round(a.x + dx * i / n), y = Math.round(a.y + dy * i / n);
    if (blockedCell(s, x, y))
        return false;
} return true; }
const occupant = (s, x, y, except) => blockedCell(s, x, y) || s.actors.some(a => a.id !== except && active(a) && a.x === x && a.y === y);
export function movementLimit(a, pace = 'normal') { if (!['normal', 'trot', 'charge'].includes(pace))
    throw Error('Unknown pace'); return characterMovement(a, a.normalMove * ({ normal: 1, trot: 4 / 3, charge: 2 }[pace])); }
export function pathDistance(start, path) { let total = 0, prev = start; for (const next of path) {
    total += dist(prev, next);
    prev = next;
} return total; }
export function findPath(s, actorId, x, y, pace = 'normal') {
    const a = s.actors.find(t => t.id === actorId);
    if (!a || !active(a))
        return null;
    integer(x, 0, s.width - 1, 'x');
    integer(y, 0, s.height - 1, 'y');
    if (occupant(s, x, y, a.id))
        return null;
    const max = movementLimit(a, pace), queue = [{ x: a.x, y: a.y, path: [], cost: 0 }], best = new Map([[`${a.x},${a.y}`, 0]]);
    while (queue.length) {
        queue.sort((u, v) => u.cost - v.cost);
        const cur = queue.shift();
        if (cur.cost > best.get(`${cur.x},${cur.y}`) + 1e-8)
            continue;
        if (cur.x === x && cur.y === y)
            return cur.path;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const nx = cur.x + dx, ny = cur.y + dy, k = `${nx},${ny}`, cost = cur.cost + Math.hypot(dx, dy) * GRID_METERS;
            if (nx < 0 || ny < 0 || nx >= s.width || ny >= s.height || cost > max + 1e-8 || cost >= (best.get(k) ?? Infinity) - 1e-8 || occupant(s, nx, ny, a.id))
                continue;
            if (dx && dy && (occupant(s, cur.x + dx, cur.y, a.id) || occupant(s, cur.x, cur.y + dy, a.id)))
                continue;
            best.set(k, cost);
            queue.push({ x: nx, y: ny, path: [...cur.path, { x: nx, y: ny }], cost });
        }
    }
    return null;
}
const poweredIds = ['physical-7', 'physical-10', 'physical-37', 'physical-42', 'plant-8', 'plant-14', 'plant-16', 'plant-33'];
export function availableActions(a) { const out = [{ id: 'weapon', label: a.equipment?.weaponId ? getWeapon(a.equipment.weaponId).name : 'Weapon' }]; if (a.artifact?.identified && a.artifact.definition.name === 'Laser pistol')
    out.push({ id: 'laser', label: `Laser pistol (${a.artifact.charges} shots)` }); if (a.natural)
    out.push({ id: 'natural', label: 'Natural attack' }); if (a.effects.mentalBlast)
    out.push({ id: 'mental-24', label: 'Mental Blast' }); if (a.effects.totalHealing)
    out.push({ id: 'heal', label: 'Total Healing' }); for (const id of poweredIds)
    if (a.mutations.includes(id))
        out.push({ id, label: ({ 'physical-7': 'Electrical contact', 'physical-10': 'Heat Generation', 'physical-37': 'Radiated Eyes', 'physical-42': 'Sonic Attack', 'plant-8': 'Carnivorous Jaws', 'plant-14': 'Plant electrical charge', 'plant-16': 'Plant Heat Generation', 'plant-33': 'Plant Sonic Attack' })[id] }); out.push({ id: 'advance', label: 'Move only' }, { id: 'bind', label: 'Bind wounds' }, { id: 'rest', label: 'Rest / wait' }, { id: 'flee', label: 'Withdraw (sandbox)' }); return out.filter(o => o.id !== 'weapon' || a.equipment?.weaponId); }
function weaponFatigue(a) { return fatigueFactor({ weaponId: a.equipment?.weaponId, armorAC: getArmor(a.equipment?.armorId ?? 'none').ac, rounds: a.fightRounds + 1, rest: a.rest, PS: a.attributes.PS, synthetic: a.species === 'robot' }); }
function modeFor(a) { return ['arrow', 'crossbow', 'sling-bullet', 'sling-stone'].includes(a.equipment?.weaponId) ? 'missile' : 'melee'; }
function validatePlan(s, a, p) { if (!p || !availableActions(a).some(o => o.id === p.action))
    throw Error('Action unavailable'); const pace = p.pace ?? 'normal'; if (!['normal', 'trot', 'charge'].includes(pace))
    throw Error('Unknown pace'); const to = p.move ?? { x: a.x, y: a.y }; const path = findPath(s, a.id, to.x, to.y, pace); if (path === null)
    throw Error('Destination unreachable'); if (path.length && ['rest', 'bind', 'heal'].includes(p.action))
    throw Error('Rest, binding or healing cannot be combined with movement (sandbox policy)'); const attacks = !['rest', 'bind', 'heal', 'flee', 'advance'].includes(p.action); const mode = p.mode ?? modeFor(a); if (p.action === 'weapon' && (!['melee', 'missile'].includes(mode) || mode === 'missile' && getWeapon(a.equipment.weaponId).range === null || mode === 'melee' && modeFor(a) === 'missile'))
    throw Error('Invalid weapon attack mode'); if (p.action === 'weapon' && getWeapon(a.equipment.weaponId).wc <= weaponFatigue(a))
    throw Error('Too fatigued to attack with this weapon; rest first'); if (path.length && pace !== 'normal' && a.species !== 'robot' && (p.action === 'weapon' && mode === 'missile' || ['laser', 'physical-10', 'physical-37', 'physical-42', 'plant-16', 'plant-33', 'mental-24'].includes(p.action)))
    throw Error('Cannot use that ranged attack while trotting or charging'); if (attacks) {
    const t = s.actors.find(t => t.id === p.targetId);
    if (!t || !active(t) || t.side === a.side)
        throw Error('Select a living opponent');
    const projected = { ...a, ...to };
    if (p.action === 'mental-24' && t.species === 'robot')
        throw Error('Ordinary mental attacks do not affect robots in this sandbox');
    if (!attackInRange(projected, t, p.action, mode))
        throw Error('Target out of range');
    if (!lineOfSight(s, projected, t))
        throw Error('Line of sight blocked');
    if (p.action === 'laser' && a.artifact.functioning === false)
        throw Error('Laser pistol is nonfunctional');
    if (p.action === 'laser' && !a.artifact.charges)
        throw Error('Laser pistol has no energy');
    const rule = PHYSICAL_POWER_RULES[p.action] ?? PHYSICAL_POWER_RULES[{ 'plant-16': 'physical-10', 'plant-33': 'physical-42' }[p.action]];
    if (rule && a.uses[p.action] != null && s.round - a.uses[p.action] < rule.interval)
        throw Error('Mutation is recovering');
    if (p.action === 'mental-24' && a.uses[p.action] != null && s.round - a.uses[p.action] < 2)
        throw Error('Mental Blast is recovering');
    if (p.action === 'plant-14' && a.plantCharge < 1)
        throw Error('Plant charge depleted');
} if (p.action === 'heal')
    totalHealing(a, s.seconds); return { ...p, move: to, pace, mode, path }; }
function attackInRange(a, t, action, mode) { const d = dist(a, t); if (action === 'laser')
    return d <= 200; if (action === 'weapon') {
    const w = getWeapon(a.equipment.weaponId);
    return mode === 'missile' ? d <= 2 * (w.range ?? 0) : adjacent(a, t);
} if (action === 'radiate')
    return !!a.radiate && d <= a.radiate.range; if (action === 'natural' || action === 'plant-8' || action === 'plant-14' || action === 'physical-7')
    return adjacent(a, t); if (action === 'mental-24' || action === 'physical-10' || action === 'plant-16')
    return d <= 15; if (action === 'physical-37' || action === 'physical-42' || action === 'plant-33')
    return d <= 10; return false; }
export function planPlayer(s, plan) { if (s.status !== 'active')
    throw Error('Encounter ended'); return validatePlan(s, s.actors.find(a => a.id === 'player'), plan); }
function aiPlan(s, a) { const t = s.actors.filter(x => x.side !== a.side && active(x)).sort((p, q) => dist(a, p) - dist(a, q))[0] ?? s.actors.find(x => x.side !== a.side); const action = a.natural ? 'natural' : a.radiate ? 'radiate' : 'weapon', reach = action === 'radiate' ? a.radiate.range : GRID_METERS * Math.SQRT2 + 1e-8; if (!active(t) || action === 'weapon' && getWeapon(a.equipment.weaponId).wc <= weaponFatigue(a))
    return { action: 'rest', move: { x: a.x, y: a.y }, pace: 'normal' }; if (dist(a, t) <= reach)
    return { action, targetId: t.id, mode: 'melee', move: { x: a.x, y: a.y }, pace: 'normal' }; let best = { x: a.x, y: a.y }, d = dist(a, t); for (let y = 0; y < s.height; y++)
    for (let x = 0; x < s.width; x++) {
        const nd = dist({ x, y }, t);
        if (nd < d && findPath(s, a.id, x, y) !== null) {
            best = { x, y };
            d = nd;
        }
    } return { action: d <= reach ? action : 'advance', targetId: t.id, mode: 'melee', move: best, pace: 'normal' }; }
function note(s, msg) { s.log.push(msg); }
function moveActor(s, a, p) { if (!active(a))
    return false; const to = p.move; if (!to)
    return true; const path = findPath(s, a.id, to.x, to.y, p.pace ?? 'normal'); if (!path) {
    note(s, `${a.name}: planned destination blocked; remains in place.`);
    return false;
} if (path.length) {
    const meters = pathDistance(a, path);
    a.x = to.x;
    a.y = to.y;
    note(s, `${a.name} moves ${+meters.toFixed(1)} m.`);
} return true; }
function hurt(s, t, amount, a, ctx = {}) { const before = t.hp; if (before <= 0)
    return 0; const updated = receiveDamage(t, amount, ctx); Object.assign(t, updated); note(s, `${t.name} takes ${t.lastDamage} damage${t.side === 'left' ? ` (${before} → ${t.hp} HP)` : ''}.`); if (t.hp === 0) {
    t.dying = !t.acted && !t.fled && a && adjacent(a, t) && t.lastDamage - before < before / 2 && t.lastDamage >= before;
    t.dyingTarget = t.dying ? a.id : null;
    note(s, `${t.name} falls${t.dying ? ' (close-range dying stroke eligible)' : ''}.`);
} return before - t.hp; }
function advanceMS(s, a, key) { if (a.species === 'robot' || a.mutations.includes('mental-27'))
    return; a[key] = (a[key] ?? 0) + 1; if (a[key] % 5 === 0 && a.attributes.MS < 18) {
    a.attributes.MS++;
    a.effects.mentalResistance = Math.min(18, (a.effects.mentalResistance ?? a.attributes.MS - 1) + 1);
    note(s, `${a.name} gains 1 Mental Strength after five ${key === 'mentalSuccesses' ? 'damaging attacks' : 'successful defenses'}.`);
} }
function resultRoll(s, a, t, r) { note(s, `${a.name} → ${t.name}: ${r.reason ?? (r.roll === null ? String(r.target) : `d20 ${r.roll} vs ${r.target}`)}${r.reason ? '' : r.hit ? ' HIT' : ' MISS'}.`); }
// Poison and radiation delivered by a creature (pp.28-29 matrices through characterHazard). A number is dice of
// damage, D on the poison matrix kills unless the poison is paralytic, and the radiation matrix can kill or mutate.
// POISON MATRIX text: the matching antidote within 2 melee rounds of a D saves the victim, who takes 2d6; another
// antidote works 50% of the time, 10% more or less per level of difference. A victim carrying no antidote dies at once.
// Policy while there are no companions: a paralysed lone survivor cannot take an antidote and is killed.
function exposure(s, a, victim, kind, intensity, rng, { paralytic = false, stone = false } = {}) {
    if (!active(victim)) return;
    if (kind === 'radiation' && victim.species === 'robot') { s.pendingRulings.push(`${victim.name}: radiation vs robot requires referee ruling`); note(s, 'Robot radiation result not automated.'); return; }
    const o = characterHazard(victim, kind, intensity, rng), resisted = kind === 'poison' ? victim.effects.poisonResistance : victim.effects.radiationResistance;
    const label = `${kind === 'poison' ? (paralytic ? 'Paralytic poison' : 'Poison') : 'Radiation'} intensity ${intensity} vs ${resisted}`;
    const kill = why => { note(s, `${label}: ${why}`); victim.hp = 0; victim.dying = false; note(s, `${victim.name} falls.`); };
    if (o.outcome === 'immune') note(s, `${label}: ${victim.name} is immune.`);
    else if (o.outcome === 'damage') { if (o.damage > 0) { note(s, `${label}: ${o.cell}d6.`); hurt(s, victim, o.damage, null, { damageType: kind, damageDice: o.cell }); } else note(s, `${label}: no effect.`); }
    else if (o.outcome === 'fatal-poison' && paralytic) kill(`${victim.name} is paralysed and helpless.${a.drain ? ` ${a.name} drains ${a.drain} hit points a turn;` : ''} with no companion to intervene, ${victim.name} dies.`);
    else if (o.outcome === 'fatal-poison' && victim.antidotes?.length) { victim.poisoned = { intensity, deadline: s.round + 2, stone }; note(s, `${label}: D. ${victim.name} will ${stone ? 'turn to stone' : 'die'} unless an antidote works within 2 melee rounds.`); }
    else if (o.outcome === 'fatal-poison') kill(stone ? `${victim.name} turns to stone.` : `fatal, and there is no antidote. ${victim.name} dies.`);
    else if (o.outcome === 'death') kill(`fatal. ${victim.name} dies.`);
    else { note(s, `${label}: ${o.outcome === 'defect' ? 'D, survived (20%) with a mutational defect' : 'M, a new mutation'}, to appear in one week.`); s.pendingRulings.push(`${victim.name}: ${o.outcome} manifests in 7 days`); if (victim.id === 'player') (s.pendingEffects ??= []).push({ kind: o.outcome }); }
}
// The 2 melee rounds allowed for an antidote have passed.
function poisonTick(s) {
    for (const a of s.actors) if (active(a) && a.poisoned && s.round >= a.poisoned.deadline) { note(s, `No antidote in time: ${a.name} ${a.poisoned.stone ? 'turns to stone' : 'dies of poison'}.`); a.hp = 0; a.dying = false; a.poisoned = null; }
}
function attack(s, a, t, p, rng) {
    if (!t || !active(t))
        return;
    const action = p.action;
    if (!lineOfSight(s, a, t)) {
        note(s, `${a.name}: line of sight blocked.`);
        return;
    }
    if (!attackInRange(a, t, action, p.mode)) {
        note(s, `${a.name}: target moved out of range.`);
        return;
    }
    const d = dist(a, t);
    if (action === 'laser') {
        const r = laserAttack(a.artifact, { ac: t.armorClass, distance: d, deflections: t.laserDeflections ?? 0, rng });
        a.artifact = r.artifact;
        t.laserDeflections = r.deflections;
        note(s, `${a.name}: laser ${!r.works ? 'fails to operate' : r.deflected ? 'deflected' : r.hit ? 'hits' : 'misses'}; ${a.artifact.charges} shots left.`);
        if (r.hit && !r.deflected)
            hurt(s, t, r.damage, a, { damageType: 'energy', damageDice: 5 });
        return;
    }
    if (action === 'weapon') {
        const f = weaponFatigue(a);
        const r = equipmentAttack({ character: a, weaponId: a.equipment.weaponId, targetAC: t.armorClass, large: t.large, distance: d, mode: p.mode, fatigue: f, rng });
        resultRoll(s, a, t, r);
        if (f)
            note(s, `Fatigue reduces weapon class by ${f}.`);
        if (r.hit)
            hurt(s, t, r.damage, a, { damageDice: r.damageDice });
        return;
    }
    if (action === 'mental-24') {
        if (t.species === 'robot') {
            note(s, 'Ordinary mental blast has no effect on a robot (sandbox policy).');
            return;
        }
        const r = mentalBlast({ attacker: a, defender: t, distance: d, round: s.round, lastUsedRound: a.uses[action] ?? null, rng });
        a.uses[action] = s.round;
        resultRoll(s, a, t, r);
        const damage = r.hit ? hurt(s, t, r.damage, a, { damageType: 'mental', damageDice: 3 }) : 0;
        if (damage > 0)
            advanceMS(s, a, 'mentalSuccesses');
        else
            advanceMS(s, t, 'mentalDefenses');
        return;
    }
    if (action === 'natural' || action === 'plant-8') {
        const [n, sides] = action === 'plant-8' ? [1, 8] : a.natural;
        const r = physicalAttack({ ac: t.armorClass, hd: a.hd, damageDice: Math.max(1, n), damageSides: sides, rng });
        resultRoll(s, a, t, r);
        if (r.hit && n > 0)
            hurt(s, t, r.damage, a, { damageDice: n });
        if (r.hit && action === 'natural' && a.poison)
            exposure(s, a, t, 'poison', a.poison.intensity, rng, a.poison);
        return;
    }
    if (action === 'radiate') {
        note(s, `${a.name} gives off radiation, ${a.radiate.range} m radius.`);
        for (const victim of s.actors.filter(x => x.side !== a.side && active(x) && dist(a, x) <= a.radiate.range))
            exposure(s, a, victim, 'radiation', a.radiate.intensity, rng);
        return;
    }
    if (action === 'plant-14') {
        const n = a.plantCharge;
        if (!n)
            return;
        a.plantCharge = 0;
        a.uses[action] = s.round;
        hurt(s, t, dice(n, 6, rng), a, { damageType: 'electrical', damageDice: n });
        return;
    }
    const alias = { 'plant-16': 'physical-10', 'plant-33': 'physical-42' }[action] ?? action, rule = PHYSICAL_POWER_RULES[alias];
    if (!rule)
        throw Error('Power not implemented');
    if (a.uses[action] != null && s.round - a.uses[action] < rule.interval) {
        note(s, `${a.name}: power recovering.`);
        return;
    }
    a.uses[action] = s.round;
    const targets = rule.area ? s.actors.filter(x => x.id !== a.id && active(x)).filter(x => dist(a, x) <= rule.range) : [t];
    if (!rule.area) {
        const hit = die(20, rng), threshold = naturalTarget(t.armorClass, a.hd);
        note(s, `${a.name}: power attack d20 ${hit} vs ${threshold}.`);
        if (hit < threshold)
            return;
    }
    const power = physicalPower({ attacker: { ...a, mutations: [...a.mutations, alias], hp: Math.max(1, a.hp) }, mutationId: alias, targets: targets.map(x => ({ id: x.id, distance: rule.contact ? 0 : dist(a, x), touching: adjacent(a, x) })), round: s.round, rng });
    for (const r of power.results) {
        const victim = s.actors.find(x => x.id === r.id);
        if (r.type === 'radiation') {
            if (victim.species === 'robot') {
                s.pendingRulings.push(`${victim.name}: radiation vs robot requires referee ruling`);
                note(s, 'Robot radiation result not automated.');
                continue;
            }
            const outcome = characterHazard(victim, 'radiation', r.intensity, rng);
            note(s, `Radiation intensity ${r.intensity}: ${outcome.outcome}.`);
            if (outcome.outcome === 'damage')
                hurt(s, victim, outcome.damage, a, { damageType: 'radiation' });
            else if (outcome.outcome === 'death') {
                victim.hp = 0;
                victim.dying = false;
            }
            else
                s.pendingRulings.push(`${victim.name}: ${outcome.outcome} manifests in 7 days`);
        }
        else
            hurt(s, victim, r.damage, a, { damageType: r.type, damageDice: r.damageDice });
    }
}
function act(s, a, p, rng, simultaneous = false) { if (!p || a.acted || a.fled || !active(a) && !(a.dying || simultaneous))
    return; a.acted = true; if (!active(a) && !simultaneous) {
    if (p.action === 'advance' && a.side === 'right' && a.dyingTarget === p.targetId)
        p = { ...p, action: a.natural ? 'natural' : 'weapon', mode: 'melee' };
    if (!['weapon', 'natural', 'plant-8', 'physical-7', 'plant-14'].includes(p.action) || p.targetId !== a.dyingTarget || p.mode === 'missile') {
        note(s, `${a.name}: no legal dying stroke.`);
        return;
    }
    note(s, `${a.name} makes a dying stroke.`);
} if (p.action === 'flee') {
    a.fled = true;
    note(s, `${a.name} withdraws from the sandbox.`);
    return;
} if (p.action === 'rest') {
    if (a.equipment?.weaponId && weaponFatigue(a) > 0)
        a.rest++;
    note(s, `${a.name} rests.`);
    return;
} if (p.action === 'advance') {
    if (a.side === 'right') {
        const t = s.actors.find(x => x.id === p.targetId);
        if (t && active(t) && !a.natural && a.radiate && dist(a, t) <= a.radiate.range)
            attack(s, a, t, { ...p, action: 'radiate' }, rng);
        else if (t && active(t) && adjacent(a, t))
            attack(s, a, t, { ...p, action: a.natural ? 'natural' : 'weapon', mode: 'melee' }, rng);
    }
    a.fightRounds++;
    return;
} if (p.action === 'bind') {
    Object.assign(a, bindWounds(a));
    note(s, `${a.name} binds wounds.`);
    return;
} if (p.action === 'heal') {
    if (a.hp > 0)
        Object.assign(a, totalHealing(a, s.seconds));
    return;
} const t = s.actors.find(x => x.id === p.targetId); try {
    attack(s, a, t, p, rng);
    if (a.effects.attacksPerRound > 1 && ['weapon', 'natural', 'plant-8'].includes(p.action) && t && active(t))
        attack(s, a, t, p, rng);
}
catch (err) {
    note(s, `${a.name}: ${err.message}`);
} a.fightRounds++; }
export function resolveRound(state, plan, { rng = Math.random } = {}) {
    const playerPlan = planPlayer(state, plan), s = clone(state), p = s.actors.find(a => a.id === 'player');
    const starting = s.actors.filter(active).map(a => a.id);
    for (const a of s.actors) {
        a.acted = false;
        a.dying = false;
        if (moraleDue(s, a)) {
            const m = moraleCheck({ intelligent: a.intelligent, rng });
            note(s, `${a.name} morale d10 ${m.roll}: ${m.holds ? 'holds' : 'flees'}.`);
            if (!m.holds)
                a.fled = true;
        }
    }
    const plans = new Map([[p.id, playerPlan]]);
    for (const a of s.actors.filter(a => a.side === 'right' && active(a)))
        plans.set(a.id, aiPlan(s, a));
    const side = which => { for (const a of s.actors.filter(a => a.side === which && active(a)))
        moveActor(s, a, plans.get(a.id) ?? {}); for (const a of s.actors.filter(a => a.side === which))
        act(s, a, plans.get(a.id), rng); };
    if (s.order.first === 'simultaneous') {
        for (const a of s.actors.filter(active))
            moveActor(s, a, plans.get(a.id) ?? {}); // simultaneous attacks use pre-attack targets; allow a killed combatant its declared counterattack
        for (const a of s.actors.filter(a => starting.includes(a.id) && !a.fled))
            act(s, a, plans.get(a.id), rng, true);
    }
    else {
        side(s.order.first);
        side(s.order.first === 'left' ? 'right' : 'left');
    }
    for (const a of s.actors) {
        if (active(a) && a.bleeding) {
            const old = a.hp;
            Object.assign(a, bleedingRound(a));
            note(s, `${a.name} bleeds ${old - a.hp} HP.`);
        }
        if (a.uses['plant-14'] !== s.round)
            a.plantCharge = Math.min(4, a.plantCharge + 1);
        a.dying = false;
    }
    poisonTick(s);
    s.seconds += 10;
    const enemies = s.actors.filter(a => a.side === 'right');
    if (p.hp <= 0)
        s.status = 'defeat';
    else if (p.fled)
        s.status = 'withdrawn';
    else if (enemies.every(a => !active(a))) {
        s.status = 'victory';
        s.xpAwarded = enemies.filter(a => a.hp === 0).reduce((n, a) => n + a.maxHp, 0);
        p.experience += s.xpAwarded;
    }
    if (s.status === 'active') {
        s.round++;
        s.order = initiative({ leftHighDX: active(p) && p.attributes.DX >= 17, rightHighDX: enemies.some(a => active(a) && a.attributes.DX >= 17), rng });
        note(s, `Round ${s.round}: ${s.order.first === 'left' ? 'Your side acts first' : s.order.first === 'right' ? 'Creatures act first' : 'Simultaneous attacks'} (initiative ${s.order.left}–${s.order.right}).`);
    }
    else
        note(s, `Encounter ended: ${s.status}${s.xpAwarded ? `, ${s.xpAwarded} XP for defeated foes` : ''}.`);
    return s;
}
// Interactive half-round API. Existing resolveRound remains for legacy callers/tests.
// Only committed states are saved; every command increments revision, including movement.
const pc = s => s.actors.find(a => a.id === 'player');
const enemies = s => s.actors.filter(a => a.side === 'right');
// Companions fight beside the player and act on the player's half of the round, after the player.
const allies = s => s.actors.filter(a => a.side === 'left' && a.id !== 'player');
function allyHalf(s, rng) { for (const a of allies(s)) {
    if (a.fled || a.acted || !active(a))
        continue;
    const p = aiPlan(s, a);
    moveActor(s, a, p);
    act(s, a, p, rng);
} }
function enemyHalf(s, rng) { for (const a of enemies(s)) {
    if (a.fled || a.acted || (!active(a) && !a.dying))
        continue;
    const p = active(a) ? aiPlan(s, a) : { action: a.natural ? 'natural' : 'weapon', mode: 'melee', targetId: a.dyingTarget };
    if (active(a))
        moveActor(s, a, p);
    act(s, a, p, rng);
} }
// p.21: unintelligent creatures below half their hit points must check morale. Intelligent beings check only
// in special circumstances; with intelligentMorale on, the automated referee treats being below half hit points,
// or half their side being down, as such a circumstance. Fearless beings never check.
function moraleDue(s, a) {
    if (!active(a) || a.id === 'player') return false;
    const hurt = a.hp < a.maxHp / 2;
    // Followers and hirelings check like other intelligent beings in a fight going badly, with the leader's morale adjustment.
    if (a.side === 'left') return hurt;
    if (!a.intelligent) return hurt;
    if (!s.intelligentMorale || a.fearless) return false;
    const side = s.actors.filter(x => x.side === 'right'), down = side.filter(x => !active(x)).length;
    return hurt || (side.length > 1 && down * 2 >= side.length);
}
// p.7 reaction table with the Charisma and character-type adjustments. Who may be met, when the roll is made
// and what each result leads to are automated-referee policies recorded in the README.
export const REACTIONS = Object.freeze([[2, 'extremely hostile'], [5, 'hostile'], [8, 'uncertain'], [11, 'friendly'], [12, 'enthusiastic']]);
export function reactionLabel(score) { return REACTIONS.find(([max]) => score <= max)[1]; }
// The Charisma and character-type adjustments assume the two sides can communicate (p.8); without that the roll is unadjusted.
function reactionRoll(s, bonus, rng) {
    const p = pc(s), rolled = dice(2, 6, rng), modifier = (s.meeting?.speaks === false ? 0 : charisma(Math.min(18, Math.max(3, p.attributes.CH))).reaction + (p.species === 'animal' ? 0 : -1)) + bonus, score = Math.min(12, Math.max(2, rolled + modifier));
    return { rolled, modifier, score, label: reactionLabel(score) };
}
function them(s) { const list = s.actors.filter(a => a.side === 'right' && active(a)), name = s.creatureName ?? CREATURES[list[0]?.creatureKey]?.name ?? 'creature', many = list.length > 1; return { who: many ? `The ${name}s` : `The ${name}`, many }; }
function settleMeeting(s, r, spoke) {
    const m = s.meeting, { who, many } = them(s);
    m.result = r;
    note(s, `Reaction: 2d6 ${r.rolled}${r.modifier ? ` ${r.modifier > 0 ? '+' : '−'} ${Math.abs(r.modifier)}` : ''} = ${r.score}, ${r.label}.`);
    if (r.score >= 9) { m.open = false; s.status = 'peaceful'; note(s, m.speaks ? `${who} ${r.score >= 12 ? (many ? 'greet' : 'greets') + ' you warmly' : (many ? 'mean' : 'means') + ' no harm'}. You part in peace.` : `${who} ${many ? 'show' : 'shows'} no interest in you and ${many ? 'move' : 'moves'} off.`); return; }
    if (r.score <= 5) { m.open = false; note(s, m.speaks ? `${who} will not talk and ${many ? 'attack' : 'attacks'}.` : `${who} ${many ? 'attack' : 'attacks'}.`); if (spoke) { s.turn.action = 'parley'; pc(s).acted = true; } return; }
    note(s, `${who} ${many ? 'hold their ground and watch' : 'holds its ground and watches'} you. ${m.speaks ? 'An offer might help, or you can attack or back away.' : 'Attack or back away.'}`);
}
export function meetingOptions(s) {
    const m = s?.meeting;
    if (!m?.open || s.status !== 'active') return null;
    return { talk: m.speaks && !m.talked, gift: m.speaks, attack: true, leave: true, result: m.result };
}
function openHalf(s, rng) { for (const a of s.actors) {
    a.acted = false;
    a.dying = false;
    if (moraleDue(s, a)) {
        const m = moraleCheck({ intelligent: a.intelligent, rng }), adj = a.moraleAdjust ?? 0, holds = adj ? m.roll + m.bonus + adj >= (a.intelligent ? 3 : 5) : m.holds;
        note(s, `${a.name} morale check (d10 ${m.roll}${adj ? `, leader's Charisma ${adj > 0 ? '+' : ''}${adj}` : ''}, needs ${a.intelligent ? 3 : 5}): ${holds ? 'holds' : 'breaks and flees'}.`);
        if (!holds)
            a.fled = true;
    }
} s.turn = { moved: 0, action: null, queued: null, origin: { x: pc(s).x, y: pc(s).y }, pace: 'normal' };
    if (s.meeting?.open && s.round === 1 && !s.meeting.result && (s.order.first !== 'left' || !s.meeting.speaks)) {
        // The creatures hold the first-strike option, or cannot be spoken with: the referee rolls their reaction at once.
        s.meeting.talked = true;
        settleMeeting(s, reactionRoll(s, 0, rng), false);
        if (s.status !== 'active') { s.turn.action = 'parley'; return; }
        if (s.meeting.open) s.order = { ...s.order, first: 'left' };
    }
    if (s.meeting?.open) return;
    if (s.order.first === 'right')
        enemyHalf(s, rng); if (pc(s).hp <= 0 && !pc(s).dying)
    finishHalf(s, rng);
else if (enemies(s).every(a => !active(a)))
    finishHalf(s, rng); }
function finishHalf(s, rng) { const p = pc(s); for (const a of s.actors) {
    if (active(a) && a.bleeding) {
        const old = a.hp;
        Object.assign(a, bleedingRound(a));
        note(s, `${a.name} bleeds ${old - a.hp} HP.`);
    }
    if (a.uses['plant-14'] !== s.round)
        a.plantCharge = Math.min(4, a.plantCharge + 1);
    a.dying = false;
} poisonTick(s); s.seconds += 10; if (p.hp <= 0)
    s.status = 'defeat';
else if (p.fled)
    s.status = 'withdrawn';
else if (enemies(s).every(a => !active(a))) {
    s.status = 'victory';
    s.xpAwarded = enemies(s).filter(a => a.hp === 0).reduce((n, a) => n + a.maxHp, 0);
    p.experience += s.xpAwarded;
} if (s.status === 'active') {
    s.round++;
    s.order = initiative({ leftHighDX: p.attributes.DX >= 17, rightHighDX: enemies(s).some(a => active(a) && a.attributes.DX >= 17), rng });
    note(s, `Round ${s.round}: ${s.order.first === 'left' ? 'Your side acts first' : s.order.first === 'right' ? 'Creatures act first' : 'Simultaneous attacks'} (initiative ${s.order.left}–${s.order.right}).`);
    openHalf(s, rng);
}
else
    note(s, `Encounter ended: ${s.status}${s.xpAwarded ? `, ${s.xpAwarded} XP` : ''}.`); }
export function beginInteractive(state, { rng = Math.random } = {}) { if (state.turn || state.status !== 'active')
    return clone(state); const s = clone(state); s.revision = (s.revision ?? 0) + 1; openHalf(s, rng); return s; }
const paceRank = { normal: 0, trot: 1, charge: 2 };
function effectivePace(s, requested = 'normal') { if (!Object.hasOwn(paceRank, requested))
    throw Error('Unknown pace'); const old = s.turn?.pace ?? 'normal'; return paceRank[requested] > paceRank[old] ? requested : old; }
export function interactivePath(s, x, y, pace = 'normal') { const p = pc(s); if (s.status !== 'active' || !s.turn || s.turn.action || !active(p) || s.meeting?.open)
    return null; const selected = effectivePace(s, pace), path = findPath(s, p.id, x, y, selected); return path && pathDistance(p, path) + s.turn.moved <= movementLimit(p, selected) + 1e-8 ? path : null; }
// Optional first-strike negotiation for the limited Badder sandbox. Reaction table p.7;
// eligibility and consequences are explicit automated-referee policies, not RAW diplomacy combat.
export function canParley(s) { const p = pc(s); return !s.meeting && s.status === 'active' && s.round === 1 && s.order.first === 'left' && s.turn && !s.turn.action && !s.turn.moved && active(p) && ['psh', 'humanoid', 'animal'].includes(p.species) && enemies(s).some(active) && enemies(s).filter(active).every(a => a.creatureKey === 'badder'); }
export function interactivePlan(s, action, targetId, mode) { if (s.status !== 'active' || !s.turn || s.turn.action)
    throw Error('Your action has already been used or encounter ended'); const p = pc(s); if (!active(p)) {
    if (!p.dying || targetId !== p.dyingTarget || !['weapon', 'natural', 'plant-8', 'physical-7', 'plant-14'].includes(action) || mode === 'missile')
        throw Error('Only a close-range dying stroke is possible');
    const temp = clone(s);
    pc(temp).hp = 1;
    return planPlayer(temp, { action, targetId, mode });
} if (s.turn.moved && ['rest', 'bind', 'heal'].includes(action))
    throw Error('Cannot combine this action with movement'); if (s.turn.moved && s.turn.pace !== 'normal' && s.turn.pace && p.species !== 'robot' && (action === 'weapon' && (mode ?? modeFor(p)) === 'missile' || ['laser', 'physical-10', 'physical-37', 'physical-42', 'plant-16', 'plant-33', 'mental-24'].includes(action)))
    throw Error('Cannot use that attack after trotting or charging'); return planPlayer(s, { action, targetId, mode }); }
export function interactiveCommand(state, command, { rng = Math.random } = {}) { if (state.status !== 'active' || !state.turn)
    throw Error('No active player turn'); if (command.expectedRevision !== state.revision)
    throw Error('Stale combat action'); const s = clone(state), p = pc(s); if (s.meeting?.open && command.type !== 'meet') throw Error('Decide how to meet them first: talk, attack or back away'); if (command.type === 'move') {
    const pace = effectivePace(s, command.pace), path = interactivePath(s, command.x, command.y, pace);
    if (!path?.length)
        throw Error('Destination unreachable or movement already finished');
    const meters = pathDistance(p, path);
    p.x = command.x;
    p.y = command.y;
    s.turn.moved += meters;
    s.turn.pace = pace;
    note(s, `${p.name} moves ${+meters.toFixed(1)} m (${pace}).`);
}
else if (command.type === 'meet') {
    const m = s.meeting;
    if (!m?.open) throw Error('There is no one to meet here');
    if (command.choice === 'attack') { m.open = false; note(s, `${p.name} attacks.`); }
    else if (command.choice === 'leave') { m.open = false; s.status = 'withdrawn'; note(s, `${p.name} backs away. ${them(s).who} ${them(s).many ? 'let' : 'lets'} you go.`); }
    else if (command.choice === 'talk' || command.choice === 'gift') {
        const gift = command.choice === 'gift';
        if (!m.speaks) throw Error('They cannot be spoken with');
        if (!gift && m.talked) throw Error('You have already spoken; make an offer to try again');
        if (gift) m.gifted = true;
        m.talked = true;
        note(s, gift ? `${p.name} offers a gift and speaks.` : `${p.name} speaks.`);
        settleMeeting(s, reactionRoll(s, gift ? 1 : 0, rng), true);
    }
    else throw Error('Unknown meeting choice');
}
else if (command.type === 'antidote') {
    if (!active(p) || !p.poisoned) throw Error('No poison to treat');
    if (s.turn.action) throw Error('Your action has already been used');
    const i = (p.antidotes ?? []).indexOf(command.intensity);
    if (i < 0) throw Error('You do not carry that antidote');
    p.antidotes.splice(i, 1);
    const chance = antidoteChance(p.poisoned.intensity, command.intensity), roll = chance >= 100 ? null : die(100, rng);
    s.turn.action = 'antidote';
    p.acted = true;
    if (roll === null || roll <= chance) {
        note(s, `${p.name} takes the intensity ${command.intensity} antidote against intensity ${p.poisoned.intensity} poison: ${roll === null ? 'the specific antidote, certain' : `${chance}% chance, d100 ${roll}`}. It works; 2d6 damage.`);
        p.poisoned = null;
        hurt(s, p, dice(2, 6, rng), null, { damageType: 'poison', damageDice: 2 });
    }
    else note(s, `${p.name} takes the intensity ${command.intensity} antidote against intensity ${p.poisoned.intensity} poison: ${chance}% chance, d100 ${roll}. It fails.`);
}
else if (command.type === 'parley') {
    if (!canParley(s))
        throw Error('Parley not available in this encounter');
    const rolled = dice(2, 6, rng), modifier = charisma(Math.min(18, Math.max(3, p.attributes.CH))).reaction + (p.species === 'animal' ? 0 : -1), score = Math.min(12, Math.max(2, rolled + modifier));
    s.turn.action = 'parley';
    p.acted = true;
    note(s, `${p.name} attempts negotiation: 2d6 ${rolled}, reaction modifier ${modifier}, result ${score}.`);
    if (score >= 9) {
        s.status = 'peaceful';
        note(s, 'The Badders allow the party to depart. Encounter ended without combat.');
    }
    else
        note(s, score <= 5 ? 'The Badders reject the overture. End Turn to resolve their response.' : 'The Badders hesitate but do not agree to safe passage. End Turn to resolve their response.');
}
else if (command.type === 'attack') {
    const plan = interactivePlan(s, command.action, command.targetId, command.mode);
    s.turn.action = plan.action;
    if (s.order.first === 'simultaneous') {
        s.turn.queued = plan;
        note(s, `${p.name} declares ${availableActions(p).find(a => a.id === plan.action)?.label ?? plan.action}; resolves simultaneously on End Turn.`);
    }
    else
        act(s, p, plan, rng);
}
else if (command.type === 'end') {
    if (!s.turn.action && active(p)) {
        const action = s.turn.moved ? 'advance' : 'rest';
        s.turn.action = action;
        act(s, p, { action }, rng);
    }
    if (s.order.first === 'simultaneous') {
        const others = [...allies(s), ...enemies(s)], plans = new Map(others.filter(active).map(a => [a.id, aiPlan(s, a)]));
        for (const a of others.filter(active))
            moveActor(s, a, plans.get(a.id));
        if (s.turn.queued)
            act(s, p, s.turn.queued, rng, true);
        for (const a of others)
            if (plans.has(a.id))
                act(s, a, plans.get(a.id), rng, true);
    }
    else {
        allyHalf(s, rng);
        if (s.order.first === 'left')
            enemyHalf(s, rng);
    }
    finishHalf(s, rng);
}
else
    throw Error('Unknown combat command'); s.revision++; return s; }
