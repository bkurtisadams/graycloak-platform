import {
  ANIMAL_TERRAIN_TYPES_1982, ANIMAL_TERRAIN_KEYS_1982, ANIMAL_ENCOUNTER_CHECK_1982,
  generateAnimalEncounterTable, rollAnimalTableRow, animalDisplayName, resolveAnimalBehaviour,
  getPersonalWeapon, parseUniversalWorldProfile,
  TERRAIN_DMS, rollEncounterRange, resolvePersonalSurprise, SURPRISE_DMS, butcherAnimal
} from '../vendor/classic-traveller-rules/index.js?v=r0.80.0';
import { createNpcActorDocument } from './npc-actor-document.js';

// ---------------------------------------------------------------------------
// v0.302.0: The Traveller Book (1982) animal encounters, as the campaign keeps
// them. There is no overland travel: the referee says where the party is — in
// port, or out on the surface of the current world in one terrain — and the
// clock does the rest (p.100 checklist: animals twice a day outside urban
// areas). Everything lives on campaign.roster.animals:
//
//   tables:  { [systemId|terrain]: one encounter table, rows naming the
//              statblock each animal became }
//   surface: null in port; else { systemId, worldName, terrain, lastCheckedDay }
//   pending: the last encounter the checks turned up, until dismissed
// ---------------------------------------------------------------------------

const DAYS_IN_YEAR = 365;
export const SECONDS_PER_DAY = 86400;

export function campaignDayNumber(time) {
  return Number(time?.year ?? 0) * DAYS_IN_YEAR + Number(time?.dayOfYear ?? 1);
}

export function animalTableKey(systemId, terrain) {
  return `${systemId}|${terrain}`;
}

export function animalState(campaign) {
  const stored = campaign?.roster?.animals ?? {};
  return {
    tables: { ...(stored.tables ?? {}) }, surface: stored.surface ?? null, pending: stored.pending ?? null,
    // v0.307.0: who is out with the party (null: the whole party), and what
    // has been butchered, by encounter|combatant.
    withIds: Array.isArray(stored.withIds) ? [...stored.withIds] : null,
    butchered: { ...(stored.butchered ?? {}) }
  };
}

// v0.307.0: the characters out on the surface. Everyone who joins is in the
// party, so the referee says who went (Kurt, Sep 2026); unset, the party.
export function surfaceParty(resolved) {
  const { withIds } = animalState(resolved.campaign);
  const ids = withIds ?? resolved.campaign.party?.characterIds ?? [];
  return ids.map((id) => (resolved.characters ?? []).find((entry) => entry.identity.id === id))
    .filter((entry) => entry && String(entry.identity.name ?? '').trim() && entry.status?.alive !== false);
}

export function butcherCarcass(dice, entry, { atmosphere, destroyed }) {
  return butcherAnimal(dice, entry, { atmosphere, destroyed });
}

export function withAnimalState(campaign, patch) {
  const current = animalState(campaign);
  return { ...campaign, roster: { ...campaign.roster, animals: { ...current, ...patch } } };
}

function titleCase(text) {
  return String(text).split(/\s+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function tokenLabelFor(name) {
  const letters = name.split(/[\s-]+/).filter(Boolean).map((word) => word[0].toUpperCase()).join('');
  return letters.slice(0, 2) || name.slice(0, 2).toUpperCase();
}

/**
 * p.95 checklist item 2 for one terrain of the world the party is on: the
 * table, and one statblock per animal row, filed under Animals/<world>/<terrain>.
 */
export function buildAnimalTable({ system, terrain, format = '2D', dice, date = '' }) {
  if (!system) throw new Error('the party is not at a world');
  if (!Object.hasOwn(ANIMAL_TERRAIN_TYPES_1982, terrain)) throw new RangeError(`unknown terrain: ${terrain}`);
  const profile = parseUniversalWorldProfile(system.mainWorld.uwp);
  const table = generateAnimalEncounterTable(dice, {
    terrain, format, planetSize: profile.size, atmosphere: profile.atmosphere,
    world: { name: system.name, upp: system.mainWorld.uwp }
  });
  const terrainLabel = ANIMAL_TERRAIN_TYPES_1982[terrain].label;
  const folder = `Animals/${system.name}/${terrainLabel}`;
  const actors = [];
  const rows = table.rows.map((row) => {
    if (row.category === 'event') return { die: row.die, category: 'event', event: '' };
    const entry = row.animal;
    const name = animalDisplayName(entry.type, entry.attribute, 1);
    const actor = createNpcActorDocument({
      name, kind: 'statblock', actorType: 'creature', folder,
      species: titleCase(entry.type.replace(/-/g, ' ')),
      role: `${titleCase(entry.category)}, ${terrainLabel}`,
      tokenLabel: tokenLabelFor(name),
      weaponKey: entry.weapons[0].key, armor: entry.armor.key,
      animal: { ...JSON.parse(JSON.stringify(entry)), woundMode: 'fixed', world: system.name, terrain }
    });
    actors.push(actor);
    return { die: row.die, category: row.category, actorId: actor.identity.id, quantity: entry.quantity };
  });
  return {
    table: {
      key: animalTableKey(system.id, terrain), systemId: system.id, worldName: system.name, upp: system.mainWorld.uwp,
      terrain, terrainLabel, format: table.format, dice: table.dice, created: date, rows
    },
    actors
  };
}

// v0.305.0: p.93, a filter's wound is 1D per 50 kg, its weapons aside.
export function animalWoundsText(a, joiner = ', ') {
  if (a.type === 'filter') return `${Math.max(1, Math.ceil(Number(a.weightKg) / 50))}D (filter)`;
  return a.weapons.map((weapon) => `${weapon.wound} ${weapon.label}`).join(joiner);
}

// p.91: "throw 5 or 6 on one die".
export function animalCheck(dice, { dm = 0 } = {}) {
  const die = dice.rollD6();
  return { die, dm, hit: die + dm >= ANIMAL_ENCOUNTER_CHECK_1982 };
}

// The row a check lands on, with the statblock it names.
export function rollOnAnimalTable(dice, table, actors = []) {
  const shape = { format: table.format, dice: table.dice, rows: table.rows };
  const { thrown, die, row } = rollAnimalTableRow(dice, shape);
  const actor = row?.actorId ? actors.find((entry) => entry.identity.id === row.actorId) ?? null : null;
  return { thrown, die, row, actor };
}

export function describeAnimalRow(row, actor) {
  if (!row) return 'nothing';
  if (row.category === 'event') return row.event ? `Event: ${row.event}` : 'an event (none written yet)';
  if (!actor?.animal) return 'an animal whose statblock is gone';
  const a = actor.animal;
  const count = row.quantity ?? a.quantity ?? 1;
  return `${count} ${animalDisplayName(a.type, a.attribute, count)}, ${a.weightKg} kg, ${a.hits.unconscious}/${a.hits.further} hits, ${a.armor.label}, ${animalWoundsText(a, ' and ')}, ${a.behaviour.code}`;
}

/**
 * The p.100 checklist over a span of days: two checks a day while the party
 * is out on the surface. Stops at the first encounter (Kurt, Sep 2026: the
 * encounter changes what happens next). Returns the day it stopped on, or
 * null, with every die thrown for the log.
 */
export function runSurfaceChecks(dice, { fromDay, toDay }) {
  const throws = [];
  for (let day = fromDay; day <= toDay; day += 1) {
    for (const when of ['travelling', 'halted']) {
      const check = animalCheck(dice);
      throws.push({ day, when, die: check.die });
      if (check.hit) return { hitDay: day, when, throws };
    }
  }
  return { hitDay: null, when: null, throws };
}

export function animalBehaviourThrow(dice, actor, { surprise = false, surprised = false, preyCount = 1, animalCount = null } = {}) {
  const entry = actor?.animal;
  if (!entry) throw new Error('that statblock is not an animal');
  return resolveAnimalBehaviour(dice, entry, { surprise, surprised, preyCount, animalCount: animalCount ?? entry.quantity ?? 1 });
}

export function describeBehaviour(result) {
  const steps = result.steps.map((step) => step.rule
    ? `${step.which} ${step.rule.replace(/-/g, ' ')}: ${step.met ? 'yes' : 'no'}`
    : `${step.which} ${step.throw}+: 2D ${step.roll} ${step.met ? 'yes' : 'no'}`).join('; ');
  const action = result.action === 'nothing' ? 'does nothing' : result.action === 'attack' ? 'attacks' : 'flees';
  return `${action} (${steps}), speed \u00d7${result.speed}`;
}

// --- v0.304.0: surprise and range, before the attack/flee throw --------------
// Book 1 p.26-27's order: surprise, then range, then what the other side
// does. The Traveller Book's animal terrains are not Book 1's range-throw
// terrains, and no book joins the two; this is Graycloak's mapping (Kurt to
// review). null means no terrain DM.
export const ANIMAL_RANGE_TERRAIN = Object.freeze({
  clear: 'clear', prairie: 'prairie', rough: 'rough', broken: 'broken', mountain: 'mountain',
  forest: 'forest', jungle: 'jungle', river: 'river', swamp: 'swamp', marsh: 'marsh',
  desert: 'desert', beach: 'beach',
  // Book 1 (1977) has no water rows; the 1981 maritime rows are kept as
  // options in the rules package and used here.
  surface: 'maritime-surface', shallows: 'maritime-surface', sargasso: 'maritime-surface',
  depths: 'maritime-subsurface', bottom: 'maritime-subsurface',
  'sea-cave': 'cave', cave: 'cave',
  ruins: 'city', chasm: 'broken', crater: null
});

export function animalRangeTerrain(terrain) {
  const key = ANIMAL_RANGE_TERRAIN[terrain] ?? null;
  return key && Object.hasOwn(TERRAIN_DMS, key) ? key : null;
}

const MILITARY_SERVICES = new Set(['navy', 'army', 'marines', 'scouts']);
// Book 1 p.27: one die a side, surprise to the side 3 or more higher; the
// party's DMs from leader expertise, tactical expertise and military
// experience (the 1977 table). The animals take none.
export function animalSurpriseThrow(dice, characters = []) {
  const skill = (entry, name) => Number(entry.skills?.[name] ?? 0) >= 1;
  const conditions = {
    leaderSkill: characters.some((entry) => skill(entry, 'Leadership')),
    tacticalSkill: characters.some((entry) => skill(entry, 'Tactics')),
    militaryExperience: characters.some((entry) => MILITARY_SERVICES.has(String(entry.career?.service ?? '').toLowerCase()))
  };
  const dm = Object.entries(conditions).filter(([, on]) => on).reduce((sum, [key]) => sum + SURPRISE_DMS[key], 0);
  const result = resolvePersonalSurprise({ sides: [{ id: 'party', combatants: [], dm }, { id: 'opposition', combatants: [], dm: 0 }], dice });
  return { ...result, conditions };
}

export function animalRangeThrow(dice, terrain, { dm = 0 } = {}) {
  const book1 = animalRangeTerrain(terrain);
  return { ...rollEncounterRange(dice, { terrain: book1, dm }), book1Terrain: book1 };
}

// p.95's code in words: F0 on a grazer is a throw of 0+, which always
// succeeds — not one of the special cases, which grazers do not have.
const SPEED_WORDS = Object.freeze({ 0: 'does not move', 1: 'ordinary speed', 2: 'double speed', 3: 'triple speed', 4: 'quadruple speed' });
const RULE_WORDS = Object.freeze({
  'if-possible': 'attacks whatever it can reach',
  'if-surprise': 'attacks only if it has surprise',
  'if-surprised': 'flees if surprised',
  'if-more': 'attacks if it outnumbers its prey'
});
export function explainBehaviourCode(behaviour) {
  if (!behaviour) return '';
  const part = (which) => {
    const code = behaviour[which];
    if (code.rule) return RULE_WORDS[code.rule] ?? code.rule;
    const verb = which === 'attack' ? 'attacks' : 'flees';
    return code.throw <= 2 ? `${verb} always (${code.throw}+)` : `${verb} on ${code.throw}+`;
  };
  const order = behaviour.order === 'FA' ? ['flee', 'attack'] : ['attack', 'flee'];
  return `${order.map(part).join(', then ')}; ${SPEED_WORDS[behaviour.speed] ?? `\u00d7${behaviour.speed} speed`}`;
}

// --- views -----------------------------------------------------------------

export const ANIMAL_TERRAIN_CHOICES = Object.freeze(ANIMAL_TERRAIN_KEYS_1982.map((key) => Object.freeze({
  key, name: `${ANIMAL_TERRAIN_TYPES_1982[key].label} (${ANIMAL_TERRAIN_TYPES_1982[key].equivalent})`
})));

function rowView(row, actorsById) {
  if (row.category === 'event') return { die: row.die, category: 'event', event: row.event ?? '' };
  const actor = actorsById.get(row.actorId) ?? null;
  const a = actor?.animal ?? null;
  if (!a) return { die: row.die, category: row.category, missing: true };
  const count = row.quantity ?? a.quantity ?? 1;
  return {
    die: row.die, category: row.category, actorId: row.actorId, quantity: count,
    name: animalDisplayName(a.type, a.attribute, count),
    weight: `${a.weightKg} kg`, hits: `${a.hits.unconscious}/${a.hits.further}`, armor: a.armor.label === 'none' ? 'none' : a.armor.label,
    weapons: animalWoundsText(a),
    code: a.behaviour.code,
    codeText: explainBehaviourCode(a.behaviour),
    type: a.type
  };
}

export function animalTableSheet(resolved, key) {
  const { tables, surface } = animalState(resolved.campaign);
  const table = tables[key];
  if (!table) return null;
  const actorsById = new Map((resolved.npcActors ?? []).map((entry) => [entry.identity.id, entry]));
  return {
    kind: 'animals', id: key, compactOnly: true,
    title: `${table.terrainLabel} terrain`,
    subtitle: `${table.worldName} (${table.upp})`,
    table: {
      key, terrain: table.terrain, dice: table.dice, created: table.created,
      here: Boolean(surface && animalTableKey(surface.systemId, surface.terrain) === key),
      rows: table.rows.map((row) => rowView(row, actorsById))
    },
    editable: true
  };
}

export function animalJournalEntries(resolved) {
  const { tables } = animalState(resolved.campaign);
  return Object.values(tables).map((table) => ({
    id: table.key,
    name: `${table.terrainLabel} terrain`,
    note: `${table.dice === 1 ? '1D' : '2D'} animal encounter table \u00b7 ${table.upp}`,
    folder: `Animal encounters/${table.worldName}`,
    sheet: { kind: 'animals', id: table.key }
  }));
}

export function animalSurfaceView(resolved, system) {
  const { tables, surface, pending } = animalState(resolved.campaign);
  const actorsById = new Map((resolved.npcActors ?? []).map((entry) => [entry.identity.id, entry]));
  const here = system ? Object.values(tables).filter((table) => table.systemId === system.id) : [];
  const onThisWorld = surface && system && surface.systemId === system.id ? surface : null;
  let airless = false;
  try { airless = system ? parseUniversalWorldProfile(system.mainWorld.uwp).atmosphere <= 1 : false; } catch { airless = false; }
  const out = new Set(surfaceParty(resolved).map((entry) => entry.identity.id));
  const refs = new Set((resolved.campaign.documentRefs?.characters ?? []).map((entry) => entry.id));
  return {
    world: system ? { id: system.id, name: system.name, upp: system.mainWorld.uwp } : null,
    // p.92 Common Sense: airless worlds almost never have life of consequence.
    airless,
    // v0.307.0: who is with the party, out on the surface.
    roster: (resolved.characters ?? []).filter((entry) => refs.has(entry.identity.id) && String(entry.identity.name ?? '').trim())
      .map((entry) => ({ id: entry.identity.id, name: entry.identity.name, with: out.has(entry.identity.id), alive: entry.status?.alive !== false })),
    surface: onThisWorld ? { terrain: onThisWorld.terrain, label: ANIMAL_TERRAIN_TYPES_1982[onThisWorld.terrain]?.label ?? onThisWorld.terrain, key: animalTableKey(onThisWorld.systemId, onThisWorld.terrain), rangeTerrain: animalRangeTerrain(onThisWorld.terrain) } : null,
    terrains: ANIMAL_TERRAIN_CHOICES,
    tables: here.map((table) => ({ key: table.key, terrain: table.terrain, label: table.terrainLabel, dice: table.dice })),
    pending: pending ? {
      ...pending,
      row: pending.actorId ? rowView({ die: pending.die, category: pending.category, actorId: pending.actorId, quantity: pending.quantity }, actorsById) : null
    } : null
  };
}

export function animalSheetView(actor) {
  const a = actor.animal;
  const weapon = (entry) => {
    let spec = null;
    try { spec = getPersonalWeapon(entry.key); } catch { spec = null; }
    return { key: entry.key, label: entry.label, wound: entry.wound, base: spec ? `${spec.damageDice}D${spec.damageModifier ? (spec.damageModifier > 0 ? `+${spec.damageModifier}` : spec.damageModifier) : ''}` : '' };
  };
  const alteration = a.woundAlteration?.times ? `\u00d7${a.woundAlteration.times}` : a.woundAlteration?.dice ? `${a.woundAlteration.dice > 0 ? '+' : ''}${a.woundAlteration.dice}D` : 'none';
  const specials = [];
  if (a.specials?.filter) specials.push(`Filter: draws in anything at close range on 6+, ${a.specials.filter.woundDice}D a round; escape on 7+ (1 END each try, +2 per helper) (p.93).`);
  if (a.specials?.trap) specials.push(`Trap: a character it surprises at close or short range is caught on 5+; struggling free is 9+ (1 END, +1 per helper) (p.93).`);
  if (a.specials?.universalLure) specials.push('Its lure works on people too (p.93).');
  return {
    category: titleCase(a.category), type: titleCase(a.type.replace(/-/g, ' ')), attribute: a.attribute ? titleCase(a.attribute) : 'Walker',
    quantity: a.quantity ?? 1, weightKg: a.weightKg,
    hits: { ...a.hits }, alteration, woundMode: a.woundMode === 'rolled' ? 'rolled' : 'fixed',
    armor: a.armor.label, weapons: a.weapons.map(weapon), code: a.behaviour.code, speed: a.behaviour.speed,
    world: a.world ?? null, terrain: a.terrain ? ANIMAL_TERRAIN_TYPES_1982[a.terrain]?.label ?? a.terrain : null,
    specials
  };
}
