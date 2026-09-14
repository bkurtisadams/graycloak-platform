/**
 * Quick NPC generation — Traveller Book 1 (1977).
 *
 * There is no separate NPC generation procedure in the 1977 books. Book 1 p.8
 * says a character hired as crew is generated the same way as anyone else, and
 * Book 3's encounter tables give you a TYPE of person, not statistics. So this
 * does not invent a generator: it drives the ordinary Book 1 sequence through
 * the lifecycle API with dice and automatic choices, which means an NPC rolled
 * here is one a player could have rolled.
 *
 * Driving getAvailableActions rather than calling the phases in a fixed order
 * matters: the sequence cannot drift out of step with the real one, and a phase
 * added later is picked up without touching this file.
 *
 * The choices a player would make, and what is chosen here:
 *
 *   Service      random, unless asked for. On enlistment failure the character
 *                is drafted, which is what Book 1 p.5 does to a volunteer who
 *                is turned away.
 *   Commission   always attempted, and promotion likewise. An NPC with rank is
 *                more use at the table than one without, and Book 1 allows the
 *                attempt every term.
 *   Skill table  random among those legal for the character, which is what the
 *                spread of an unplanned career looks like.
 *   Terms        random within a range, then mustered out. Book 1 requires the
 *                reenlistment throw whether or not the character wants to stay,
 *                so a bad throw can end a career early — that is left alone.
 *   Death        Book 1 p.5 kills a character who fails survival and says to
 *                generate a new one. That is what happens here: the attempt is
 *                abandoned and another started, up to a limit. A referee who
 *                wants survivors instead can pass the survival-injury option,
 *                which the rules package already supports.
 */

import { createDice } from '../dice.js';
import { createCharacter, CHARGEN_PHASES } from './chargen.js';
import { getAvailableActions, performChargenAction, CHARGEN_ACTIONS } from './lifecycle.js';
import { SERVICE_KEYS } from '../careers/services.js';

/** Book 1 p.5: a character serves a minimum of one term. */
export const NPC_TERM_RANGE = Object.freeze({ minimum: 1, maximum: 4 });

/** How many characters may die before the attempt gives up. */
export const NPC_GENERATION_ATTEMPTS = 12;

/**
 * An index into a list, from the dice rather than Math.random so a seeded dice
 * source stays reproducible.
 *
 * Two dice give 36 outcomes instead of 6, which divides evenly into lists of
 * 2, 3, 4, 6, 9, 12 and 18 — including the two that matter here, six services
 * and four skill tables. One die modulo four would have favoured the first two
 * entries by half again.
 */
function index(dice, length) {
  const roll = (dice.rollD6() - 1) * 6 + (dice.rollD6() - 1);
  return roll % length;
}

function pick(list, dice) {
  if (!list.length) return null;
  return list[index(dice, list.length)];
}

function chooseTerms(dice, { terms = null } = {}) {
  if (Number.isInteger(terms)) return Math.max(NPC_TERM_RANGE.minimum, terms);
  const span = NPC_TERM_RANGE.maximum - NPC_TERM_RANGE.minimum + 1;
  return NPC_TERM_RANGE.minimum + index(dice, span);
}

/**
 * One attempt at a career. Returns the finished character, or null if they died
 * in service — which Book 1 treats as a character who simply does not exist.
 */
function attemptCareer(dice, { service = null, terms = null, name, options }) {
  let character = createCharacter({ name, dice, options });
  const targetTerms = chooseTerms(dice, { terms });
  let guard = 0;

  while (character.phase !== CHARGEN_PHASES.COMPLETE && guard < 400) {
    guard += 1;
    if (character.phase === CHARGEN_PHASES.DEAD) return null;

    const available = getAvailableActions(character);
    const can = (action) => available.actions.includes(action);
    const act = (action, payload = {}) => {
      character = performChargenAction(character, action, { dice, ...payload }).character;
    };

    if (can(CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT)) {
      const wanted = service && available.choices.services.includes(service)
        ? service
        : pick([...available.choices.services], dice);
      act(CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT, { service: wanted });
      continue;
    }
    // Book 1 p.5: a rejected volunteer is subject to the draft.
    if (can(CHARGEN_ACTIONS.RESOLVE_DRAFT)) { act(CHARGEN_ACTIONS.RESOLVE_DRAFT); continue; }
    if (can(CHARGEN_ACTIONS.BEGIN_TERM)) { act(CHARGEN_ACTIONS.BEGIN_TERM); continue; }
    if (can(CHARGEN_ACTIONS.RESOLVE_SURVIVAL)) { act(CHARGEN_ACTIONS.RESOLVE_SURVIVAL); continue; }
    if (can(CHARGEN_ACTIONS.ROLL_COMMISSION)) { act(CHARGEN_ACTIONS.ROLL_COMMISSION); continue; }
    if (can(CHARGEN_ACTIONS.ROLL_PROMOTION)) { act(CHARGEN_ACTIONS.ROLL_PROMOTION); continue; }
    if (can(CHARGEN_ACTIONS.ROLL_SKILL)) {
      act(CHARGEN_ACTIONS.ROLL_SKILL, { tableKey: pick([...available.choices.skillTables], dice) });
      continue;
    }
    if (can(CHARGEN_ACTIONS.RESOLVE_SKILL_SPECIALIZATION)) {
      act(CHARGEN_ACTIONS.RESOLVE_SKILL_SPECIALIZATION, {
        specialization: pick([...available.choices.specializations], dice)
      });
      continue;
    }
    if (can(CHARGEN_ACTIONS.COMPLETE_TERM)) { act(CHARGEN_ACTIONS.COMPLETE_TERM); continue; }
    if (can(CHARGEN_ACTIONS.RESOLVE_AGING)) { act(CHARGEN_ACTIONS.RESOLVE_AGING); continue; }
    if (can(CHARGEN_ACTIONS.RESOLVE_AGING_CRISIS)) {
      // Book 1 p.9: the crisis throw takes the attending medic's expertise. A
      // rolled NPC has nobody attending, so it is thrown unaided.
      act(CHARGEN_ACTIONS.RESOLVE_AGING_CRISIS, { medicalSkill: 0 });
      continue;
    }
    if (can(CHARGEN_ACTIONS.ROLL_REENLISTMENT)) { act(CHARGEN_ACTIONS.ROLL_REENLISTMENT); continue; }
    if (can(CHARGEN_ACTIONS.REENLIST) || can(CHARGEN_ACTIONS.MUSTER_OUT)) {
      // Serve to the target, then leave — but Book 1 requires the throw either
      // way, so a mandatory reenlistment on a natural 12 still overrides this.
      const staying = character.terms < targetTerms && can(CHARGEN_ACTIONS.REENLIST);
      act(staying ? CHARGEN_ACTIONS.REENLIST : CHARGEN_ACTIONS.MUSTER_OUT);
      continue;
    }
    if (can(CHARGEN_ACTIONS.BEGIN_MUSTER_OUT)) { act(CHARGEN_ACTIONS.BEGIN_MUSTER_OUT); continue; }
    if (can(CHARGEN_ACTIONS.ROLL_MUSTER_CASH) || can(CHARGEN_ACTIONS.ROLL_MUSTER_BENEFIT)) {
      // Book 1 p.7 caps cash at three rolls; take cash while it is offered and
      // benefits after, since benefits are what makes an NPC interesting.
      act(can(CHARGEN_ACTIONS.ROLL_MUSTER_CASH) && character.musterOut.cashRolls < 1
        ? CHARGEN_ACTIONS.ROLL_MUSTER_CASH
        : CHARGEN_ACTIONS.ROLL_MUSTER_BENEFIT);
      continue;
    }
    if (can(CHARGEN_ACTIONS.RESOLVE_MUSTER_BENEFIT_SPECIALIZATION)) {
      act(CHARGEN_ACTIONS.RESOLVE_MUSTER_BENEFIT_SPECIALIZATION, {
        specialization: pick([...available.choices.specializations], dice)
      });
      continue;
    }
    // Nothing offered and not complete: stop rather than spin.
    break;
  }

  return character.phase === CHARGEN_PHASES.COMPLETE ? character : null;
}

/**
 * Roll a complete Book 1 character for use as an NPC.
 *
 * Returns { character, attempts, died } — `died` counts the careers that ended
 * in the line of duty on the way here, which is worth showing: it is the honest
 * Book 1 outcome and not an error.
 */
export function generateNpcCharacter({
  dice = createDice(),
  service = null,
  terms = null,
  name = 'Unnamed NPC',
  options = {},
  maximumAttempts = NPC_GENERATION_ATTEMPTS
} = {}) {
  if (service !== null && !SERVICE_KEYS.includes(service)) {
    throw new RangeError(`unknown service: ${service}`);
  }
  let died = 0;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const character = attemptCareer(dice, { service, terms, name, options });
    if (character) return Object.freeze({ character, attempts: attempt, died });
    died += 1;
  }
  throw new Error(`no character survived ${maximumAttempts} attempts at generation`);
}

// ---------------------------------------------------------------------------
// Hiring crew at a starport — Book 1, NON-PLAYER CHARACTERS.
//
// The book gives the procedure outright, and both of its methods:
//
//   "a starship captain may be looking for a crew for his ship, in which case,
//   the referee would generate characters until one occurs with the required
//   skill (such as navigation, medical, etc.). Generally, the first appropriate
//   character to be generated would present himself for employment, and if not
//   accepted or considered suitable, an appropriate delay would occur before
//   another presents himself.
//
//   As an alternative, the referee might simply generate a character and assign
//   him the required skill, plus perhaps 1 or 2 more."
//
// So 'search' generates until the skill turns up, and 'assign' takes the
// shortcut. The delay between candidates is the referee's — the book says "an
// appropriate delay" and names no number — so what is reported here is how many
// characters were generated to find this one, which is what a referee would
// judge the delay from.
// ---------------------------------------------------------------------------

/** Book 2 p.16 crew positions and the expertise each wants. */
export const CREW_ROLE_SKILLS = Object.freeze({
  pilot: 'Pilot',
  navigator: 'Navigation',
  engineer: 'Engineering',
  steward: 'Steward',
  medic: 'Medical',
  gunner: 'Gunnery'
});

/** How many characters to generate before the search is called off. */
export const CREW_SEARCH_LIMIT = 40;

export function generateCrewCandidate({
  role,
  dice = createDice(),
  method = 'search',
  minimumLevel = 1,
  searchLimit = CREW_SEARCH_LIMIT,
  name = 'Candidate',
  options = {}
} = {}) {
  const key = String(role ?? '').trim().toLowerCase();
  const skill = CREW_ROLE_SKILLS[key];
  if (!skill) throw new RangeError(`unknown crew role: ${role}`);
  if (!['search', 'assign'].includes(method)) throw new RangeError(`unknown method: ${method}`);

  let generated = 0;
  let died = 0;
  let best = null;

  for (let attempt = 1; attempt <= searchLimit; attempt += 1) {
    const rolled = generateNpcCharacter({ dice, name, options });
    generated += 1;
    died += rolled.died;
    const level = rolled.character.skills[skill] ?? 0;
    // Keep the closest miss: a referee who calls off the search would rather
    // see the best applicant than nobody.
    if (!best || level > (best.character.skills[skill] ?? 0)) best = rolled;
    if (level >= minimumLevel) {
      return Object.freeze({
        character: rolled.character,
        role: key, skill, level,
        method: 'search', assigned: false,
        generated, died,
        // "the first appropriate character to be generated would present
        // himself for employment" — the rest were passed over.
        passedOver: generated - 1,
        raw: true
      });
    }
  }

  if (method === 'search') {
    return Object.freeze({
      character: null,
      role: key, skill, level: 0,
      method: 'search', assigned: false,
      generated, died, passedOver: generated,
      bestCandidate: best?.character ?? null,
      exhausted: true,
      raw: true
    });
  }

  // The book's alternative: "generate a character and assign him the required
  // skill, plus perhaps 1 or 2 more." The extra skills are left to the caller —
  // "perhaps" is not a rule, and a referee assigning them should choose.
  const character = best.character;
  const assigned = {
    ...character,
    skills: { ...character.skills, [skill]: Math.max(minimumLevel, character.skills[skill] ?? 0) }
  };
  return Object.freeze({
    character: assigned,
    role: key, skill, level: assigned.skills[skill],
    method: 'assign', assigned: true,
    generated, died, passedOver: 0,
    raw: true
  });
}
