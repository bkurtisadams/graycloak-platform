import {
  ANIMAL_TERRAIN_TYPES_1982, ANIMAL_TERRAIN_KEYS_1982, ANIMAL_ENCOUNTER_CHECK_1982,
  generateAnimalEncounterTable, rollAnimalTableRow, animalDisplayName, resolveAnimalBehaviour,
  getPersonalWeapon, parseUniversalWorldProfile
} from '../vendor/classic-traveller-rules/index.js';
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
  return { tables: { ...(stored.tables ?? {}) }, surface: stored.surface ?? null, pending: stored.pending ?? null };
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
  return `${count} ${animalDisplayName(a.type, a.attribute, count)}, ${a.weightKg} kg, ${a.hits.unconscious}/${a.hits.further} hits, ${a.armor.label}, ${a.weapons.map((weapon) => `${weapon.wound} ${weapon.label}`).join(' and ')}, ${a.behaviour.code}`;
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
    weapons: a.weapons.map((weapon) => `${weapon.wound} ${weapon.label}`).join(', '),
    code: a.behaviour.code
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
  return {
    world: system ? { id: system.id, name: system.name, upp: system.mainWorld.uwp } : null,
    // p.92 Common Sense: airless worlds almost never have life of consequence.
    airless,
    surface: onThisWorld ? { terrain: onThisWorld.terrain, label: ANIMAL_TERRAIN_TYPES_1982[onThisWorld.terrain]?.label ?? onThisWorld.terrain, key: animalTableKey(onThisWorld.systemId, onThisWorld.terrain) } : null,
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
