/**
 * npc-generator.js
 * Main NPC generation entry points for Graycloak Classic Traveller.
 * 
 * Exports:
 *   generateQuickNPC(opts)      -> Actor Document (minimal history)
 *   generateFullNPC(opts)       -> Actor Document (full Book 1, or fallback)
 *   generateOppositionGroup(templateKey, count?, opts) -> ActorDocument[]
 * 
 * No UI dependencies. Pure functions over randomness.
 * Designed to be called from:
 *   - Roster panel: [ ADD QUICK NPC ] / [ GENERATE FULL NPC ]
 *   - Encounter setup: [ GENERATE OPPOSITION ]
 *   - Campaign menu: [ GENERATE PATRON ]
 */

import { roll1D, roll2D, pick, rollRange, generateId, generateName, generateDescription } from './npc-primitives.js';
import { QUICK_CAREERS, CAREER_KEYS } from './npc-careers.js';
import { OPPOSITION_TEMPLATES, TEMPLATE_KEYS } from './npc-templates.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function rollUPP(mods = {}) {
  const upp = {
    str: clamp(roll2D() + (mods.str || 0), 2, 15),
    dex: clamp(roll2D() + (mods.dex || 0), 2, 15),
    end: clamp(roll2D() + (mods.end || 0), 2, 15),
    int: clamp(roll2D() + (mods.int || 0), 2, 15),
    edu: clamp(roll2D() + (mods.edu || 0), 2, 15),
    soc: clamp(roll2D() + (mods.soc || 0), 2, 15),
  };
  return upp;
}

function uppString(upp) {
  const hex = (n) => n.toString(16).toUpperCase();
  return `${hex(upp.str)}${hex(upp.dex)}${hex(upp.end)}${hex(upp.int)}${hex(upp.edu)}${hex(upp.soc)}`;
}

function assignSkills(skillPool, count, levelCap = 2) {
  const skills = {};
  const pool = [...skillPool];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const skill = pool.splice(idx, 1)[0];
    const current = skills[skill] || 0;
    // 70% chance to grant level 1, 30% level 2 if cap allows
    const increment = (current < levelCap && Math.random() < 0.3) ? 2 : 1;
    skills[skill] = clamp(current + increment, 0, levelCap);
  }
  return skills;
}

function pickGear(pool) {
  if (!pool || pool.length === 0) return null;
  return pick(pool);
}

function buildActorDocument(base) {
  // Matches the Actor Document schema described in the Graycloak README:
  //   id, bodyType, name, description, upp, characteristics, currentPhysical,
  //   age, career, skills, equipment, credits, notes, effects, state, portraitRef
  const upp = base.upp || rollUPP();
  const id = base.id || generateId('actor');
  const bodyType = base.bodyType || 'biological';

  const doc = {
    id,
    type: 'actor',
    bodyType,
    name: base.name || { full: 'Unknown', short: 'Unknown' },
    description: base.description || '',
    upp: { ...upp },
    characteristics: { ...upp },
    currentPhysical: {
      str: upp.str,
      dex: upp.dex,
      end: upp.end,
    },
    age: base.age || 18,
    career: base.career || null,
    skills: base.skills || {},
    equipment: {
      readyWeapon: base.equipment?.readyWeapon || null,
      wornArmor: base.equipment?.wornArmor || null,
      inventory: base.equipment?.inventory || [],
    },
    credits: base.credits || 0,
    notes: {
      public: base.notes?.public || '',
      referee: base.notes?.referee || '',
    },
    effects: base.effects || [],
    state: base.state || (bodyType === 'biological' ? 'alive' : 'powered-down'),
    portraitRef: base.portraitRef || null,
    // Non-standard but useful metadata (host can strip before persistence)
    _meta: {
      generated: new Date().toISOString(),
      method: base._meta?.method || 'unknown',
      uppString: uppString(upp),
    }
  };

  return doc;
}

// ---------------------------------------------------------------------------
// 1. QUICK NPC
// ---------------------------------------------------------------------------

/**
 * Generate a simplified NPC in milliseconds.
 * No full Book 1 service tables — just a career bundle with plausible stats.
 * 
 * Options:
 *   careerKey   'navy'|'marines'|... or null for random
 *   age         override age
 *   name        override name string
 *   uppMods     { str, dex, end, int, edu, soc } modifiers
 *   levelCap    max skill level (default 2)
 */
export function generateQuickNPC(opts = {}) {
  const careerKey = opts.careerKey || pick(CAREER_KEYS);
  const career = QUICK_CAREERS[careerKey];
  if (!career) throw new Error(`Unknown career: ${careerKey}`);

  const upp = rollUPP({ ...career.uppMods, ...opts.uppMods });
  const age = opts.age || (career.ageBase + (career.ageVar ? career.ageVar() : 0));
  const skillCount = rollRange(career.skillCount.min, career.skillCount.max);
  const skills = assignSkills(career.skillPool, skillCount, opts.levelCap ?? 2);

  // Grant one rank if they have a relevant skill and random chance
  let rank = null;
  let rankTitle = null;
  if (career.ranks && career.ranks.length > 1 && Math.random() < 0.4) {
    const maxRankIdx = clamp(Math.floor(age / 6) - 2, 0, career.ranks.length - 1);
    const rankIdx = rollRange(0, maxRankIdx);
    rank = rankIdx;
    rankTitle = career.ranks[rankIdx];
  }

  const weapon = pickGear(career.weaponPool);
  const armor = pickGear(career.armorPool);
  const credits = career.credits ? career.credits() : 0;
  const nameStr = opts.name || generateName('full');

  const doc = buildActorDocument({
    upp,
    age,
    skills,
    credits,
    name: { full: nameStr, short: nameStr.split(' ')[0] },
    description: generateDescription(career.key, career.label),
    equipment: {
      readyWeapon: weapon,
      wornArmor: armor,
      inventory: weapon ? [weapon] : [],
    },
    career: {
      service: career.label,
      rank: rankTitle,
      terms: Math.max(1, Math.floor((age - 18) / 4)),
      skillsGained: Object.keys(skills).length,
    },
    notes: {
      referee: `Quick NPC (${career.label}). ${career.description}`,
    },
    _meta: { method: 'quick-npc' },
  });

  return doc;
}

// ---------------------------------------------------------------------------
// 2. FULL NPC (Book 1 Character Generation)
// ---------------------------------------------------------------------------

/**
 * Generate a full NPC using Book 1 character generation.
 * 
 * If you already have a `generateCharacter()` function in your rules package,
 * pass it as `opts.runCharacterGeneration` and this wrapper will:
 *   1. Run your engine
 *   2. Convert the result to an Actor Document shape
 *   3. Add NPC metadata
 * 
 * If no engine is provided, uses a built-in simplified fallback that mimics
 * Book 1 terms, survival, skills, aging, and mustering out.
 * 
 * Options:
 *   careerKey              force service, or null for random
 *   maxTerms               cap terms (default 5)
 *   runCharacterGeneration async (serviceKey) => CharacterDocument
 */
export async function generateFullNPC(opts = {}) {
  const careerKey = opts.careerKey || pick(CAREER_KEYS);

  // If the host has a real Book 1 engine, delegate to it
  if (opts.runCharacterGeneration) {
    const charDoc = await opts.runCharacterGeneration(careerKey);
    // Convert Character Document -> Actor Document
    return buildActorDocument({
      ...charDoc,
      _meta: { method: 'full-npc-delegated', sourceCareer: careerKey },
    });
  }

  // Fallback: simplified Book 1 simulation
  return generateFullNPCFallback(careerKey, opts);
}

function generateFullNPCFallback(careerKey, opts) {
  const career = QUICK_CAREERS[careerKey];
  const upp = rollUPP(opts.uppMods);
  let age = 18;
  let alive = true;
  let rankIdx = 0;
  const skills = {};
  const history = [];
  let credits = 0;
  let benefits = [];

  // Enlistment: 8+ (simplified — no DMs in fallback)
  const enlisted = roll2D() >= 8;
  if (!enlisted) {
    // Draft fallback: random service
    history.push({ event: 'drafted', service: career.label, age });
  } else {
    history.push({ event: 'enlisted', service: career.label, age });
  }

  const maxTerms = opts.maxTerms ?? 5;
  let terms = 0;

  for (let t = 0; t < maxTerms && alive; t++) {
    age += 4;
    terms++;

    // Survival: 5+ (simplified)
    const survived = roll2D() >= 5;
    if (!survived) {
      alive = false;
      history.push({ event: 'death', term: t + 1, age });
      break;
    }

    // Commission (Navy/Marines/Army only, 8+)
    if (['navy','marines','army','merchants'].includes(careerKey) && roll2D() >= 8 && rankIdx < 7) {
      rankIdx++;
      history.push({ event: 'commissioned', term: t + 1, rank: career.ranks[rankIdx] });
    }

    // Promotion (8+)
    if (roll2D() >= 8 && rankIdx < 7) {
      rankIdx++;
      history.push({ event: 'promoted', term: t + 1, rank: career.ranks[rankIdx] });
    }

    // Skills: 1 per term from service pool
    const skill = pick(career.skillPool);
    skills[skill] = (skills[skill] || 0) + 1;
    history.push({ event: 'skill', term: t + 1, skill });

    // Aging: physicals -1 each at 34, 50, 66...
    if (age >= 34 && age < 50) {
      const stat = pick(['str','dex','end']);
      upp[stat] = clamp(upp[stat] - 1, 1, 15);
      history.push({ event: 'aging', age, stat, penalty: -1 });
    } else if (age >= 50 && age < 66) {
      ['str','dex','end'].forEach(s => { upp[s] = clamp(upp[s] - 1, 1, 15); });
      history.push({ event: 'aging', age, penalty: -3 });
    } else if (age >= 66) {
      ['str','dex','end'].forEach(s => { upp[s] = clamp(upp[s] - 2, 1, 15); });
      history.push({ event: 'aging', age, penalty: -6 });
    }
  }

  // Mustering out: 1 benefit per term
  for (let b = 0; b < terms; b++) {
    if (roll2D() >= 8) {
      benefits.push('cash');
      credits += rollRange(1000, 10000);
    } else {
      benefits.push(pick(['low-psg','weapon','armor','skill'])); // abstract
    }
  }

  const nameStr = opts.name || generateName('full');
  const weapon = pickGear(career.weaponPool);
  const armor = pickGear(career.armorPool);

  const doc = buildActorDocument({
    upp,
    age,
    skills,
    credits,
    name: { full: nameStr, short: nameStr.split(' ')[0] },
    description: generateDescription(career.key, career.label),
    equipment: {
      readyWeapon: weapon,
      wornArmor: armor,
      inventory: [...(weapon ? [weapon] : []), ...(armor ? [armor] : [])],
    },
    career: {
      service: career.label,
      rank: career.ranks[rankIdx] || career.ranks[0],
      terms,
      benefits,
      mustered: alive,
    },
    notes: {
      referee: `Full NPC (${career.label}). ${alive ? 'Mustered out.' : 'Died in service.'}`,
      public: '',
    },
    state: alive ? 'alive' : 'dead',
    _meta: { method: 'full-npc-fallback', history },
  });

  return doc;
}

// ---------------------------------------------------------------------------
// 3. OPPOSITION GROUP (Encounter Generation)
// ---------------------------------------------------------------------------

/**
 * Generate a group of opposition actors for immediate encounter use.
 * 
 * @param {string} templateKey  key from OPPOSITION_TEMPLATES
 * @param {number} [count]      override count; if omitted uses template range
 * @param {object} [opts]       { nameSeed, uppMods, levelCap }
 * @returns {ActorDocument[]}
 */
export function generateOppositionGroup(templateKey, count, opts = {}) {
  const template = OPPOSITION_TEMPLATES[templateKey];
  if (!template) throw new Error(`Unknown opposition template: ${templateKey}`);

  const groupSize = count ?? rollRange(template.count.min, template.count.max);
  const actors = [];

  for (let i = 0; i < groupSize; i++) {
    const upp = rollUPP({ ...template.uppMods, ...opts.uppMods });
    const skillCount = rollRange(template.skillCount.min, template.skillCount.max);
    const skills = assignSkills(template.skillPool, skillCount, opts.levelCap ?? 1);
    const weapon = pickGear(template.weaponPool);
    const armor = pickGear(template.armorPool);
    const credits = rollRange(template.credits[0], template.credits[1]);

    let nameStr;
    if (template.nameStyle === 'nickname') {
      const base = generateName('short');
      nameStr = `${base} ${pick(['the Red','One-Eye','Slim','Gunner','Doc','Wires','Patch','Rook'])}`;
    } else if (template.nameStyle === 'designation') {
      nameStr = `Unit ${rollRange(100, 999)}-${String.fromCharCode(65 + i)}`;
    } else if (template.nameStyle === 'creature') {
      nameStr = `${template.label} ${i + 1}`;
    } else {
      nameStr = generateName('full');
    }

    const doc = buildActorDocument({
      upp,
      age: template.bodyType === 'creature' ? rollRange(2, 10) : rollRange(18, 50),
      skills,
      credits,
      bodyType: template.bodyType,
      name: { full: nameStr, short: nameStr.split(' ')[0] },
      description: template.description,
      equipment: {
        readyWeapon: weapon,
        wornArmor: armor,
        inventory: [...(weapon ? [weapon] : []), ...(armor ? [armor] : [])],
      },
      career: template.bodyType === 'biological' ? {
        service: template.label,
        rank: null,
        terms: 0,
      } : null,
      notes: {
        referee: `Opposition: ${template.label}. Template: ${templateKey}.`,
      },
      state: template.bodyType === 'biological' ? 'alive' : 'powered-down',
      _meta: { method: 'opposition', templateKey, index: i },
    });

    actors.push(doc);
  }

  return actors;
}

// ---------------------------------------------------------------------------
// 4. UTILITIES
// ---------------------------------------------------------------------------

export function listCareers() {
  return CAREER_KEYS.map(k => ({ key: k, label: QUICK_CAREERS[k].label }));
}

export function listOppositionTemplates() {
  return TEMPLATE_KEYS.map(k => ({ key: k, label: OPPOSITION_TEMPLATES[k].label }));
}

export { buildActorDocument, rollUPP, uppString };
