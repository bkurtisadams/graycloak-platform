import {
  CHARGEN_ACTIONS,
  SERVICES,
  SKILL_TABLES,
  getAvailableActions
} from '../../packages/classic-traveller-rules/index.js';

export const PHASE_LABELS = Object.freeze({
  'service-selection': 'SERVICE APPLICATION',
  'draft-required': 'DRAFT',
  'term-ready': 'TERM READY',
  'survival-required': 'SURVIVAL',
  'commission-option': 'COMMISSION',
  'promotion-option': 'PROMOTION',
  'skills-pending': 'ACQUIRED SKILLS',
  'skill-specialization-required': 'SKILL SPECIALIZATION',
  'term-completion-ready': 'TERM COMPLETION',
  'aging-required': 'AGING',
  'aging-crisis-required': 'AGING CRISIS',
  'reenlistment-required': 'REENLISTMENT',
  'reenlistment-decision': 'REENLISTMENT DECISION',
  'muster-out-required': 'MUSTERING OUT',
  'muster-out-rolls-pending': 'MUSTERING OUT BENEFITS',
  'muster-benefit-specialization-required': 'BENEFIT SPECIALIZATION',
  complete: 'CHARACTER COMPLETE',
  dead: 'CHARACTER DECEASED'
});

export const ACTION_LABELS = Object.freeze({
  [CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT]: 'ROLL ENLISTMENT',
  [CHARGEN_ACTIONS.RESOLVE_DRAFT]: 'ROLL DRAFT',
  [CHARGEN_ACTIONS.BEGIN_TERM]: 'BEGIN TERM',
  [CHARGEN_ACTIONS.RESOLVE_SURVIVAL]: 'ROLL SURVIVAL',
  [CHARGEN_ACTIONS.ROLL_COMMISSION]: 'ROLL COMMISSION',
  [CHARGEN_ACTIONS.SKIP_COMMISSION]: 'DECLINE COMMISSION',
  [CHARGEN_ACTIONS.ROLL_PROMOTION]: 'ROLL PROMOTION',
  [CHARGEN_ACTIONS.SKIP_PROMOTION]: 'DECLINE PROMOTION',
  [CHARGEN_ACTIONS.ROLL_SKILL]: 'ROLL SKILL',
  [CHARGEN_ACTIONS.RESOLVE_SKILL_SPECIALIZATION]: 'ACCEPT SPECIALIZATION',
  [CHARGEN_ACTIONS.COMPLETE_TERM]: 'COMPLETE TERM',
  [CHARGEN_ACTIONS.RESOLVE_AGING]: 'ROLL AGING',
  [CHARGEN_ACTIONS.RESOLVE_AGING_CRISIS]: 'ROLL CRISIS SURVIVAL',
  [CHARGEN_ACTIONS.ROLL_REENLISTMENT]: 'ROLL REENLISTMENT',
  [CHARGEN_ACTIONS.REENLIST]: 'REENLIST',
  [CHARGEN_ACTIONS.MUSTER_OUT]: 'MUSTER OUT',
  [CHARGEN_ACTIONS.BEGIN_MUSTER_OUT]: 'BEGIN MUSTERING OUT',
  [CHARGEN_ACTIONS.ROLL_MUSTER_CASH]: 'ROLL CASH',
  [CHARGEN_ACTIONS.ROLL_MUSTER_BENEFIT]: 'ROLL BENEFIT',
  [CHARGEN_ACTIONS.RESOLVE_MUSTER_BENEFIT_SPECIALIZATION]: 'ACCEPT BENEFIT'
});

const PROCEDURE_TEXT = Object.freeze({
  'service-selection': 'Choose one of the six prior services. The engine will resolve enlistment and apply the appropriate characteristic DMs.',
  'draft-required': 'The enlistment attempt failed. Resolve the one-die draft.',
  'term-ready': 'The character is ready to enter the next service term.',
  'survival-required': 'Resolve survival for the current term. Under the standard Book 1 rule, failure is fatal.',
  'commission-option': 'The character is eligible to attempt a commission this term, or may decline the attempt.',
  'promotion-option': 'The commissioned character is eligible to attempt promotion this term, or may decline the attempt.',
  'skills-pending': 'Choose an eligible acquired-skill table before rolling. The engine determines the result.',
  'skill-specialization-required': 'The rolled skill requires a specific weapon or vehicle expertise. Enter the exact specialization to record.',
  'term-completion-ready': 'All current-term skill opportunities are resolved. Complete the term and advance campaign age.',
  'aging-required': 'Resolve the pending Book 1 aging checkpoint.',
  'aging-crisis-required': 'A characteristic reached zero during aging. Resolve the required survival crisis.',
  'reenlistment-required': 'Roll the service reenlistment throw.',
  'reenlistment-decision': 'Reenlistment is available. Choose whether to continue service or muster out.',
  'muster-out-required': 'Service has ended. Begin mustering out to determine cash and material benefits.',
  'muster-out-rolls-pending': 'Choose the Cash or Benefits table for each remaining mustering-out roll.',
  'muster-benefit-specialization-required': 'A Gun or Blade benefit requires immediate declaration of a specific weapon.',
  complete: 'Character generation is complete. Save the JSON record or begin a new character.',
  dead: 'The character died during generation. Save the record if desired, or begin a new character.'
});

function clampText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function wrap(text, width) {
  const source = clampText(text);
  if (!source) return [''];
  const words = source.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if (!line) {
      line = word;
    } else if ((line.length + 1 + word.length) <= width) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function box(lines, width = 78) {
  const inner = width - 4;
  const expanded = lines.flatMap((line) => wrap(line, inner));
  const top = `┌${'─'.repeat(width - 2)}┐`;
  const bottom = `└${'─'.repeat(width - 2)}┘`;
  return [top, ...expanded.map((line) => `│ ${line.padEnd(inner)} │`), bottom].join('\n');
}

export function serviceName(serviceKey) {
  return serviceKey ? (SERVICES[serviceKey]?.name ?? serviceKey) : 'UNASSIGNED';
}

export function skillTableName(tableKey) {
  return SKILL_TABLES[tableKey]?.name ?? tableKey;
}

function formatCredits(value) {
  return `Cr${Number(value ?? 0).toLocaleString('en-US')}`;
}

function formatSkills(skills = {}) {
  const entries = Object.entries(skills)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, level]) => `${name}-${level}`);
  return entries.length ? entries.join(', ') : 'none';
}

function formatBenefits(benefits = []) {
  if (!benefits.length) return 'none';
  return benefits.map((benefit) => {
    if (benefit.type === 'weapon') return `${benefit.specialization} (${benefit.category})`;
    if (benefit.name) return benefit.name;
    return benefit.type ?? 'benefit';
  }).join(', ');
}

export function buildCharacterRecord(character) {
  const c = character.characteristics;
  const rank = character.rankTitle || (character.rank > 0 ? `Rank ${character.rank}` : 'none');
  const career = `${serviceName(character.service)} / ${rank}`;
  const retired = character.retired ? `YES / ${formatCredits(character.retirementPayAnnual)} annual` : 'NO';
  const remaining = character.musterOut?.remainingRolls ?? 0;

  return box([
    `UPP ${character.upp}    AGE ${character.age}    STATUS ${character.alive ? 'ALIVE' : 'DECEASED'}`,
    `STR ${c.STR}    DEX ${c.DEX}    END ${c.END}    INT ${c.INT}    EDU ${c.EDU}    SOC ${c.SOC}`,
    `CAREER ${career}`,
    `TERMS ${character.terms}    YEARS SERVED ${character.yearsServed}    DRAFTED ${character.drafted ? 'YES' : 'NO'}`,
    `CREDITS ${formatCredits(character.credits)}    RETIRED ${retired}`,
    `SKILLS ${formatSkills(character.skills)}`,
    `BENEFITS ${formatBenefits(character.materialBenefits)}`,
    `PHASE ${PHASE_LABELS[character.phase] ?? character.phase}${remaining ? `    MUSTER ROLLS REMAINING ${remaining}` : ''}`
  ]);
}

function diceText(event) {
  if (Array.isArray(event.dice)) return event.dice.join('+');
  if (Number.isInteger(event.roll)) return String(event.roll);
  return '';
}

function checkText(event) {
  const dice = diceText(event);
  const dm = Number(event.dm ?? 0);
  const total = event.total ?? (Number.isFinite(event.roll) ? event.roll + dm : null);
  const target = event.target;
  const parts = [];
  if (dice) parts.push(`roll ${dice}`);
  if (dm) parts.push(`DM ${dm >= 0 ? '+' : ''}${dm}`);
  if (total !== null && total !== undefined) parts.push(`total ${total}`);
  if (target !== null && target !== undefined) parts.push(`vs ${target}+`);
  return parts.join(' · ');
}

function outcomeText(outcome) {
  if (!outcome) return '';
  if (outcome.type === 'characteristic') return `${outcome.characteristic} ${outcome.amount >= 0 ? '+' : ''}${outcome.amount}`;
  if (outcome.type === 'skill') return outcome.name;
  if (outcome.type === 'specialization') return `${outcome.name} (${outcome.specializationType})`;
  if (outcome.type === 'weapon') return `${outcome.category} weapon`;
  if (outcome.type === 'material') return outcome.name;
  if (outcome.type === 'none') return 'no benefit';
  return outcome.type ?? '';
}

export function formatHistoryEvent(event) {
  const age = Number.isFinite(event.age) ? `AGE ${event.age}` : 'AGE --';
  switch (event.type) {
    case 'character-created':
      return `${age}  CHARACTER CREATED  UPP ${event.upp}`;
    case 'enlistment':
      return `${age}  ENLIST ${serviceName(event.service).toUpperCase()}  ${checkText(event)}  ${event.success ? 'ACCEPTED' : 'FAILED'}`;
    case 'draft':
      return `${age}  DRAFT  d6 ${event.roll} -> ${serviceName(event.service).toUpperCase()}`;
    case 'term-start':
      return `${age}  TERM ${event.term} BEGINS  ${serviceName(event.service).toUpperCase()}${event.drafted ? ' / DRAFTEE' : ''}`;
    case 'survival':
      return `${age}  SURVIVAL T${event.term}  ${checkText(event)}  ${String(event.outcome).toUpperCase()}`;
    case 'commission':
      return `${age}  COMMISSION  ${checkText(event)}  ${event.success ? `SUCCESS / ${event.rankTitle}` : 'FAILED'}`;
    case 'commission-skipped':
      return `${age}  COMMISSION DECLINED`;
    case 'promotion':
      return `${age}  PROMOTION  ${checkText(event)}  ${event.success ? `SUCCESS / ${event.rankTitle}` : 'FAILED'}`;
    case 'promotion-skipped':
      return `${age}  PROMOTION DECLINED`;
    case 'skill-roll':
      return `${age}  SKILL / ${event.tableName} / d6 ${event.roll} -> ${outcomeText(event.outcome)}${event.result?.level ? `-${event.result.level}` : ''}${event.pendingSpecialization ? ' / SPECIALIZATION REQUIRED' : ''}`;
    case 'skill-specialization':
      return `${age}  SPECIALIZE ${event.source} -> ${event.specialization}-${event.level}`;
    case 'term-complete':
      return `${age}  TERM ${event.term} COMPLETE  ${event.yearsServed} YEARS / ${event.rankTitle || 'UNRANKED'}`;
    case 'aging': {
      const checks = (event.checks ?? []).map((check) => `${check.characteristic}:${check.success ? 'OK' : `-${check.loss}`}`).join(' ');
      return `${age}  AGING @ PHYSICAL ${event.physicalAge}  ${checks}`;
    }
    case 'aging-crisis':
      return `${age}  AGING CRISIS ${event.characteristic}  ${checkText(event)}  ${event.success ? `SURVIVED / ${event.recoveryMonths} MONTHS` : 'DEATH'}`;
    case 'reenlistment':
      return `${age}  REENLISTMENT  ${checkText(event)}  ${String(event.outcome).toUpperCase()}`;
    case 'reenlistment-choice':
      return `${age}  ${event.choice === 'reenlist' ? 'REENLISTED' : 'MUSTER OUT ELECTED'}`;
    case 'muster-out-start':
      return `${age}  MUSTERING OUT BEGINS  ${event.totalRolls} ROLLS${event.retired ? ` / RETIREMENT ${formatCredits(event.retirementPayAnnual)} ANNUAL` : ''}`;
    case 'muster-out-cash':
      return `${age}  CASH  d6 ${event.roll}${event.dm ? ` DM +${event.dm}` : ''} -> ${formatCredits(event.amount)}`;
    case 'muster-out-benefit':
      return `${age}  BENEFIT  d6 ${event.roll}${event.dm ? ` DM +${event.dm}` : ''} -> ${outcomeText(event.outcome)}${event.pendingSpecialization ? ' / DECLARATION REQUIRED' : ''}`;
    case 'muster-out-weapon':
      return `${age}  BENEFIT RESOLVED  ${event.type === 'skill' ? `${event.specialization}-${event.level}` : `${event.specialization} (${event.category})`}`;
    case 'chargen-complete':
      return `${age}  CHARACTER COMPLETE  ${formatCredits(event.credits)} / UPP ${event.upp}`;
    default:
      return `${age}  ${String(event.type ?? 'event').toUpperCase()}`;
  }
}

const SERVICE_HISTORY_TYPES = new Set([
  'enlistment', 'draft', 'term-start', 'survival', 'commission', 'promotion',
  'term-complete', 'reenlistment', 'reenlistment-choice', 'muster-out-start',
  'chargen-complete'
]);

export function buildServiceHistory(character) {
  const lines = character.history.filter((event) => SERVICE_HISTORY_TYPES.has(event.type)).map(formatHistoryEvent);
  return lines.length ? lines.join('\n') : 'No service events recorded.';
}

export function buildGenerationLog(character, limit = 24) {
  const lines = character.history.slice(-limit).map(formatHistoryEvent);
  return lines.length ? lines.join('\n') : 'No generation events recorded.';
}

export function buildProcedure(character) {
  const available = getAvailableActions(character);
  const details = [];
  if (available.choices.skillsDue) details.push(`${available.choices.skillsDue} skill roll${available.choices.skillsDue === 1 ? '' : 's'} remaining`);
  if (available.choices.remainingRolls) details.push(`${available.choices.remainingRolls} mustering-out roll${available.choices.remainingRolls === 1 ? '' : 's'} remaining`);
  if (available.choices.pendingSkill?.specializationType) details.push(`required type: ${available.choices.pendingSkill.specializationType}`);
  if (available.choices.pendingBenefit?.category) details.push(`required category: ${available.choices.pendingBenefit.category}`);
  return {
    available,
    title: PHASE_LABELS[character.phase] ?? character.phase.toUpperCase(),
    text: PROCEDURE_TEXT[character.phase] ?? 'Awaiting a legal chargen action.',
    detail: details.join(' · ')
  };
}
