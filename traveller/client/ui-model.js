import {
  CHARGEN_ACTIONS,
  SERVICES,
  SKILL_TABLES,
  getAvailableActions,
  parseUniversalWorldProfile,
  encodeTravellerDigit,
  describeStarport,
  describeWorldSize,
  describeAtmosphere,
  describeHydrographics,
  describePopulation,
  describeGovernment,
  describeLawLevel
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


export const HELP_TOPICS = Object.freeze({
  'personnel-record': Object.freeze({
    title: 'PERSONNEL RECORD',
    body: 'The Universal Personality Profile (UPP) lists STR, DEX, END, INT, EDU, and SOC in that order. Values above 9 use Traveller hexadecimal notation, so A means 10, B means 11, and so on. The record also shows your current service, rank, terms, skills, credits, benefits, and chargen phase. RANDOM beside the name field is an optional client-side naming aid, not a Classic Traveller rule; you may always type your own name.'
  }),
  'final-character-record': Object.freeze({
    title: 'FINAL PERSONNEL RECORD',
    body: 'This is the compact gameplay-facing character record derived from completed chargen. It keeps the final UPP, career, skills, finances, benefits, service history, and references to separately stored ships. A Scout Ship benefit is a reserve assignment: only one may be acquired, later Scout Ship results have no further effect, the vessel is recallable, and it cannot be sold by the character.'
  }),
  'ship-register': Object.freeze({
    title: "SHIP'S REGISTER",
    body: 'The ship is a separate persistent document referenced by character ID and ship ID. The Type S record comes from the Book 2 standard Scout/Courier design. Authority is shown separately from assignment: a Scout benefit provides a reserve vessel subject to Scout Service recall and does not make the character an unrestricted owner. RANDOM ship names and generated S-##### registry numbers are optional project utilities, not formats prescribed by Classic Traveller RAW.'
  }),
  'campaign-status': Object.freeze({
    title: 'CAMPAIGN STATUS',
    body: 'A Campaign Document is the persistent shell that ties gameplay Character and Ship Documents together by stable ID. SAVE CAMPAIGN stores the campaign and referenced documents in this browser. EXPORT CAMPAIGN creates one portable bundle containing the Campaign Document plus its referenced character and ship documents. The ordinal date is a Graycloak campaign-state convention. In v0.9 the system and world fields are driven by the authored subsector map so their IDs and displayed names stay synchronized.'
  }),
  'subsector-map': Object.freeze({
    title: 'SUBSECTOR NAVIGATION',
    body: 'Classic Traveller Book 3 maps a subsector as an 8-by-10 field of one-parsec hexes. Select a system to inspect its distance. Pale green systems are within the active ship’s jump rating. If the campaign has no mapped location yet, select a system and set it as the starting location without advancing time. JUMP advances the campaign by seven days as the current Graycloak implementation of Book 2’s approximately one-week jump interval. The Far Meridian names and worlds are original provisional campaign content, not Traveller canon.'
  }),
  'system-record': Object.freeze({
    title: 'SYSTEM RECORD',
    body: 'The Universal World Profile (UWP) is the compact Book 3 code for starport, size, atmosphere, hydrographics, population, government, law level, and tech level. Scout and naval bases, gas giants, and amber/red travel zones are recorded separately. Far Meridian system data is authored provisional Sea of Suns content; the meanings and validation of the UWP fields come from the Classic Traveller rules layer.'
  }),
  'service-history': Object.freeze({
    title: 'SERVICE HISTORY',
    body: 'This is the condensed career record: enlistment or draft, terms served, survival, commissions, promotions, reenlistment decisions, and final mustering out. It is intended to become part of the character’s persistent biography.'
  }),
  'generation-log': Object.freeze({
    title: 'GENERATION LOG',
    body: 'This is the detailed audit trail for character generation. It records the actual dice, DMs, totals, targets, skill results, aging results, cash, and benefits used to produce the personnel record.'
  }),
  'service-selection': Object.freeze({
    title: 'SERVICE APPLICATION',
    body: 'Choose the service your character tries to enter. The rules engine rolls enlistment and applies any characteristic DMs automatically. If enlistment fails, the next step is the draft; the draft service is determined randomly rather than chosen.'
  }),
  'draft-required': Object.freeze({
    title: 'DRAFT',
    body: 'Your voluntary enlistment attempt failed. Resolve the one-die draft to determine which service takes the character. Once drafted, the career continues in that service.'
  }),
  'term-ready': Object.freeze({
    title: 'SERVICE TERM',
    body: 'A Traveller service term lasts four years. Beginning a term moves the character into the term sequence: survival first, then any commission or promotion opportunities, followed by acquired skills.'
  }),
  'survival-required': Object.freeze({
    title: 'SURVIVAL',
    body: 'Every term requires a survival throw. Under standard Classic Traveller Book 1 character generation, failure is fatal. A successful survival throw allows the term to continue.'
  }),
  'commission-option': Object.freeze({
    title: 'COMMISSION',
    body: 'Eligible characters may attempt to become commissioned officers. You may also decline the attempt. A successful commission grants officer rank and an additional acquired-skill opportunity for the term. Scouts and Other do not use the normal commission structure.'
  }),
  'promotion-option': Object.freeze({
    title: 'PROMOTION',
    body: 'A commissioned character may attempt promotion when eligible, or decline the attempt. Success advances rank and grants an additional acquired-skill opportunity for the term.'
  }),
  'skills-pending': Object.freeze({
    title: 'ACQUIRED SKILLS',
    body: 'Choose a skill table before each roll. Only tables currently legal for this character are shown. The rules engine then rolls on the selected table and applies the resulting characteristic increase, skill, or required specialization.'
  }),
  'skill-specialization-required': Object.freeze({
    title: 'SKILL SPECIALIZATION',
    body: 'Some acquired-skill results name a broad category rather than a final skill. Choose one of the legal weapon or vehicle specialties shown. The rules engine supplies and validates the choices, so a Vehicle result cannot accidentally become a gun skill.'
  }),
  'term-completion-ready': Object.freeze({
    title: 'TERM COMPLETION',
    body: 'All required actions for this term are resolved. Completing the term advances chronological age by four years, records the finished term, and moves to aging or reenlistment as appropriate.'
  }),
  'aging-required': Object.freeze({
    title: 'AGING',
    body: 'Classic Traveller aging begins once the character reaches the relevant physical-age thresholds. Aging checks can reduce characteristics. Resolve aging before the career can proceed to reenlistment.'
  }),
  'aging-crisis-required': Object.freeze({
    title: 'AGING CRISIS',
    body: 'An aging result reduced a characteristic to zero and created a medical crisis. Resolve the crisis survival throw. Medical skill and the slow-drug option are supplied to the rules engine for this resolution.'
  }),
  'reenlistment-required': Object.freeze({
    title: 'REENLISTMENT',
    body: 'After a completed term, roll to see whether the service will retain the character. Failure ends the career. A qualifying result allows a choice to continue or muster out. An exact 12 requires another term rather than permitting voluntary separation.'
  }),
  'reenlistment-decision': Object.freeze({
    title: 'REENLISTMENT DECISION',
    body: 'The service is willing to retain the character. Choose REENLIST to begin another four-year term or MUSTER OUT to end the career and collect benefits. If continuation had been mandatory, this choice would not be offered.'
  }),
  'muster-out-required': Object.freeze({
    title: 'MUSTERING OUT',
    body: 'The service career has ended. Begin mustering out to calculate how many benefit rolls the character receives and whether retirement pay applies. The resulting cash and material benefits become part of the starting character.'
  }),
  'muster-out-rolls-pending': Object.freeze({
    title: 'MUSTERING OUT BENEFITS',
    body: 'For each remaining mustering-out roll, choose either CASH or BENEFIT. No more than three rolls may be made on the Cash table. The rules engine applies any Gambling or rank modifiers automatically when they are relevant.'
  }),
  'muster-benefit-specialization-required': Object.freeze({
    title: 'BENEFIT SPECIALIZATION',
    body: 'A Gun or Blade mustering-out benefit requires a specific weapon declaration. Choose one of the legal weapons shown. If this is an additional benefit of the same category, TAKE AS SKILL lets the repeated benefit increase that weapon skill instead.'
  }),
  complete: Object.freeze({
    title: 'CHARACTER COMPLETE',
    body: 'Character generation is finished. The final personnel record is now derived into a compact gameplay character document. SAVE CHARGEN JSON preserves the full generation state; EXPORT CHARACTER writes the gameplay document used by later Traveller systems.'
  }),
  dead: Object.freeze({
    title: 'CHARACTER DECEASED',
    body: 'The character died during Book 1 generation. The record can still be saved for reference, or NEW CHARACTER can begin another attempt.'
  })
});

const ATTENTION_PHASES = new Set([
  'draft-required',
  'commission-option',
  'promotion-option',
  'skill-specialization-required',
  'aging-crisis-required',
  'reenlistment-decision',
  'muster-out-rolls-pending',
  'muster-benefit-specialization-required'
]);

export function helpForTopic(topic) {
  return HELP_TOPICS[topic] ?? null;
}

const PROCEDURE_TEXT = Object.freeze({
  'service-selection': 'Choose one of the six prior services. The engine will resolve enlistment and apply the appropriate characteristic DMs.',
  'draft-required': 'The enlistment attempt failed. Resolve the one-die draft.',
  'term-ready': 'The character is ready to enter the next service term.',
  'survival-required': 'Resolve survival for the current term. Under the standard Book 1 rule, failure is fatal.',
  'commission-option': 'The character is eligible to attempt a commission this term, or may decline the attempt.',
  'promotion-option': 'The commissioned character is eligible to attempt promotion this term, or may decline the attempt.',
  'skills-pending': 'Choose an eligible acquired-skill table before rolling. The engine determines the result.',
  'skill-specialization-required': 'The rolled skill requires a specific weapon or vehicle expertise. Choose one of the legal specializations shown below.',
  'term-completion-ready': 'All current-term skill opportunities are resolved. Complete the term and advance campaign age.',
  'aging-required': 'Resolve the pending Book 1 aging checkpoint.',
  'aging-crisis-required': 'A characteristic reached zero during aging. Resolve the required survival crisis.',
  'reenlistment-required': 'Roll the service reenlistment throw.',
  'reenlistment-decision': 'Reenlistment is available. Choose whether to continue service or muster out.',
  'muster-out-required': 'Service has ended. Begin mustering out to determine cash and material benefits.',
  'muster-out-rolls-pending': 'Choose the Cash or Benefits table for each remaining mustering-out roll.',
  'muster-benefit-specialization-required': 'A Gun or Blade benefit requires immediate declaration of a specific legal weapon. Choose from the list below.',
  complete: 'Character generation is complete. Export the gameplay character document. If a Scout Ship reserve assignment is available, assign its separate Ship Document before entering campaign play.',
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


function groupedBenefitLines(benefits = {}) {
  const lines = [];
  for (const entry of benefits.passages ?? []) lines.push(`PASSAGE ${entry.name}${entry.count > 1 ? ` ×${entry.count}` : ''}`);
  for (const entry of benefits.memberships ?? []) lines.push(`MEMBERSHIP ${entry.name}${entry.count > 1 ? ` ×${entry.count}` : ''}`);
  for (const entry of benefits.equipment ?? []) lines.push(`EQUIPMENT ${entry.name}${entry.count > 1 ? ` ×${entry.count}` : ''}`);
  for (const entry of benefits.shipEntitlements ?? []) {
    const rolled = Number(entry.rolls ?? 0);
    const effective = entry.effectiveCount === null ? 'UNRESOLVED' : String(entry.effectiveCount);
    const ignored = Number(entry.noEffectCount ?? 0);
    lines.push(`SHIP ENTITLEMENT ${entry.name} / ROLLS ${rolled} / EFFECTIVE ${effective} / ${String(entry.disposition ?? 'unresolved').toUpperCase()}`);
    if (ignored > 0) lines.push(`  ADDITIONAL ${entry.name.toUpperCase()} RESULTS WITH NO FURTHER EFFECT: ${ignored}`);
  }
  return lines.length ? lines : ['BENEFITS none'];
}

export function buildFinalCharacterRecord(document) {
  const c = document.characteristics;
  const career = document.career;
  const rank = career.rankTitle || (career.rank > 0 ? `Rank ${career.rank}` : 'unranked');
  const retired = document.status.retired
    ? `YES / ${formatCredits(document.finances.retirementPayAnnual)} annual`
    : 'NO';
  const benefitLines = groupedBenefitLines(document.benefits);

  return box([
    `FINAL PERSONNEL RECORD // GAMEPLAY DOCUMENT v${document.schemaVersion}`,
    `NAME ${document.identity.name || '(unnamed)'}`,
    `UPP ${document.upp}    AGE ${document.age}    STATUS ${document.status.alive ? 'ALIVE' : 'DECEASED'}`,
    `STR ${c.STR}    DEX ${c.DEX}    END ${c.END}    INT ${c.INT}    EDU ${c.EDU}    SOC ${c.SOC}`,
    `CAREER ${serviceName(career.service)} / ${rank}`,
    `TERMS ${career.terms}    YEARS SERVED ${career.yearsServed}    DRAFTED ${career.drafted ? 'YES' : 'NO'}`,
    `CREDITS ${formatCredits(document.finances.credits)}    RETIRED ${retired}`,
    `SKILLS ${formatSkills(document.skills)}`,
    ...benefitLines,
    ...(document.shipRefs?.length
      ? document.shipRefs.map((ref) => `SHIP REF ${ref.shipId} / ${ref.relationship.toUpperCase()}${ref.shipName ? ` / ${ref.shipName}` : ''}`)
      : ['SHIP REF none'])
  ], 82);
}

export function buildShipRecord(ship) {
  const s = ship.specifications;
  const authority = ship.authority;
  const turret = s.armament.turrets[0];
  const weapons = turret?.weapons?.length ? turret.weapons.join(', ') : 'NONE INSTALLED';
  const fuelCurrent = ship.state.currentFuelTons === null ? '--' : ship.state.currentFuelTons;
  const cargoUsed = ship.state.cargoUsedTons === null ? '--' : ship.state.cargoUsedTons;
  const crew = ship.crew.assignments.length
    ? ship.crew.assignments.map((entry) => `${entry.role.toUpperCase()} ${entry.characterName || entry.characterId}`).join(' / ')
    : 'none';
  const pilotAssignment = ship.crew.assignments.find((entry) => entry.role === 'pilot');
  const standardEngineeringDuty = s.crew.standardCount === 1
    && s.crew.standardDuties.includes('pilot')
    && s.crew.standardDuties.includes('engineer')
    && pilotAssignment;
  const engineeringDutyLine = standardEngineeringDuty
    ? `ENGINEERING DUTIES ${pilotAssignment.characterName || pilotAssignment.characterId} / STANDARD TYPE S DUTY; ENGINEERING SKILL NOT IMPLIED`
    : null;

  return box([
    "SHIP'S REGISTER // GAMEPLAY DOCUMENT v1",
    `ID ${ship.identity.id}`,
    `NAME ${ship.identity.name || '(not assigned)'}    REGISTRY ${ship.identity.registry || '(not assigned)'}    STATUS ${ship.state.operationalStatus.toUpperCase()}`,
    `TYPE ${ship.design.typeCode} ${ship.design.name.toUpperCase()}    HULL ${s.hull.tons}t ${s.hull.standard ? 'STANDARD' : 'CUSTOM'} / ${s.hull.streamlined ? 'STREAMLINED' : 'UNSTREAMLINED'}`,
    `JUMP ${s.drives.jump.rating} (${s.drives.jump.letter})    MANEUVER ${s.drives.maneuver.rating}G (${s.drives.maneuver.letter})    POWER ${s.drives.powerPlant.letter}`,
    `FUEL ${fuelCurrent}/${s.fuel.capacityTons}t    COMPUTER MODEL/${s.computer.model} CPU ${s.computer.cpu} STORAGE ${s.computer.storage}`,
    `STATEROOMS ${s.accommodations.staterooms}    LOW BERTHS ${s.accommodations.lowBerths}    CARGO ${cargoUsed}/${s.cargo.capacityTons}t`,
    `TURRET ${turret?.mount?.toUpperCase() ?? 'NONE'} / FIRE CONTROL ${turret?.fireControlInstalled ? 'INSTALLED' : 'NONE'} / WEAPONS ${weapons}`,
    `VEHICLE ${s.vehicles.map((vehicle) => vehicle.name).join(', ') || 'none'}`,
    `STANDARD CREW ${s.crew.standardCount} / DUTIES ${s.crew.standardDuties.map((duty) => duty.toUpperCase()).join(' + ')}`,
    `ASSIGNED CREW ${crew}`,
    ...(engineeringDutyLine ? [engineeringDutyLine] : []),
    `CONTROL ${authority.controllingAuthority}    ASSIGNMENT ${authority.assignmentType.toUpperCase()}    RECALLABLE ${authority.recallable ? 'YES' : 'NO'}`,
    `CHARACTER TITLE ${authority.characterOwnsShip ? 'RECORDED' : 'NOT GRANTED BY BENEFIT'}    SALE ALLOWED ${authority.saleAllowed ? 'YES' : 'NO'}    USE AS DESIRED ${authority.useAsDesired ? 'YES' : 'NO'}`,
    `LEGAL TITLE HOLDER ${authority.legalTitleHolder ?? 'NOT EXPLICITLY STATED IN BOOK 1'}`,
    `FUEL AT SCOUT BASES ${authority.servicePrivileges.freeFuelAtScoutBases ? 'FREE' : 'NORMAL COST'}    CLASS B SCOUT-BASE MAINT ${authority.servicePrivileges.freeMaintenanceAtScoutBasesAtClassBStarports ? 'FREE' : 'NORMAL COST'}`,
    `STANDARD COST MCr${s.economics.newCostMCr.toFixed(2)}    BUILD ${s.economics.buildMonths} MONTHS    ANNUAL MAINT ${formatCredits(s.economics.annualRoutineMaintenanceCr)}`,
    `MAINTENANCE STATUS ${ship.state.maintenance.status.toUpperCase()}`
  ], 96);
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
    detail: details.join(' · '),
    helpTopic: character.phase,
    attention: ATTENTION_PHASES.has(character.phase)
  };
}


export function formatCampaignDate(time = {}) {
  const day = String(Number(time.dayOfYear ?? 1)).padStart(3, '0');
  const year = String(Number(time.year ?? 0)).padStart(4, '0');
  const seconds = Number(time.secondsOfDay ?? 0);
  const hour = Math.floor(seconds / 3600);
  const minute = Math.floor((seconds % 3600) / 60);
  return `${day}-${year} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function buildCampaignRecord(campaign, { characters = [], ships = [], missing = [] } = {}) {
  const characterMap = new Map(characters.map((entry) => [entry.identity.id, entry]));
  const shipMap = new Map(ships.map((entry) => [entry.identity.id, entry]));
  const activeShip = campaign.activeShipId ? shipMap.get(campaign.activeShipId) : null;
  const partyLines = campaign.party.characterIds.map((id) => {
    const character = characterMap.get(id);
    if (!character) return `PARTY ${id} / DOCUMENT MISSING`;
    return `PARTY ${character.identity.name || id} / ${serviceName(character.career.service).toUpperCase()} / UPP ${character.upp} / ${formatCredits(character.finances.credits)}`;
  });
  const activeShipLine = activeShip
    ? `ACTIVE SHIP ${activeShip.identity.name || activeShip.identity.id} / ${activeShip.identity.registry || 'NO REGISTRY'} / TYPE ${activeShip.design.typeCode}`
    : campaign.activeShipId
      ? `ACTIVE SHIP ${campaign.activeShipId} / DOCUMENT MISSING`
      : 'ACTIVE SHIP none';
  const system = campaign.location.systemName || campaign.location.systemId || '(not assigned)';
  const world = campaign.location.worldName || campaign.location.worldId || '(not assigned)';

  return box([
    `CAMPAIGN STATUS // DOCUMENT v${campaign.schemaVersion}`,
    `ID ${campaign.identity.id}`,
    `CAMPAIGN ${campaign.identity.name || '(unnamed)'}`,
    `DATE ${formatCampaignDate(campaign.time)}`,
    `LOCATION SYSTEM ${system} / WORLD ${world}`,
    activeShipLine,
    ...partyLines,
    `DOCUMENTS CHARACTERS ${campaign.documentRefs.characters.length} / SHIPS ${campaign.documentRefs.ships.length}`,
    `SHIP FUNDS not yet tracked`,
    ...(missing.length ? [`MISSING DOCUMENTS ${missing.join(', ')}`] : [])
  ], 96);
}

export function buildJumpPlan({ campaign, currentSystem = null, selectedSystem = null, distance = null, jumpRating = null } = {}) {
  if (!campaign) return '';
  if (!selectedSystem) {
    return box([
      'NAVIGATION PLAN',
      currentSystem
        ? `CURRENT ${currentSystem.name} / HEX ${currentSystem.hex} / SELECT A DESTINATION`
        : 'CURRENT LOCATION NOT MAPPED / SELECT A SYSTEM TO SET THE STARTING LOCATION'
    ], 82);
  }
  if (!currentSystem) {
    return box([
      'NAVIGATION PLAN',
      `START ${selectedSystem.name} / HEX ${selectedSystem.hex}`,
      `WORLD ${selectedSystem.mainWorld.name}`,
      'ACTION SET CURRENT LOCATION / NO CAMPAIGN TIME ADVANCE'
    ], 82);
  }
  const inRange = Number.isInteger(distance) && Number.isInteger(jumpRating) && distance >= 1 && distance <= jumpRating;
  return box([
    'NAVIGATION PLAN',
    `FROM ${currentSystem.name} / ${currentSystem.hex}`,
    `TO ${selectedSystem.name} / ${selectedSystem.hex} / WORLD ${selectedSystem.mainWorld.name}`,
    `DISTANCE ${distance ?? '--'} PARSEC${distance === 1 ? '' : 'S'} / SHIP JUMP-${jumpRating ?? '--'}`,
    inRange ? 'STATUS IN RANGE / JUMP TIME APPROX. ONE WEEK' : 'STATUS OUT OF RANGE'
  ], 82);
}



function worldCode(value) {
  return encodeTravellerDigit(Number(value));
}

function formatBases(bases = {}) {
  const values = [];
  if (bases.naval) values.push('NAVAL');
  if (bases.scout) values.push('SCOUT');
  return values.length ? values.join(' + ') : 'NONE';
}

export function buildSystemRecord(system) {
  if (!system) return '';
  const profile = parseUniversalWorldProfile(system.mainWorld.uwp);
  const zone = system.travelZone === 'none' ? 'NONE / NORMAL' : system.travelZone.toUpperCase();
  return box([
    `SYSTEM RECORD // ${system.name.toUpperCase()} // ${system.hex}`,
    `MAIN WORLD ${system.mainWorld.name.toUpperCase()}    UWP ${system.mainWorld.uwp}`,
    `STARPORT ${profile.starport} / ${describeStarport(profile.starport).toUpperCase()}`,
    `SIZE ${worldCode(profile.size)} / ${describeWorldSize(profile.size).toUpperCase()}`,
    `ATMOSPHERE ${worldCode(profile.atmosphere)} / ${describeAtmosphere(profile.atmosphere).toUpperCase()}`,
    `HYDROGRAPHICS ${worldCode(profile.hydrographics)} / ${describeHydrographics(profile.hydrographics).toUpperCase()}`,
    `POPULATION ${worldCode(profile.population)} / ${describePopulation(profile.population).toUpperCase()}`,
    `GOVERNMENT ${worldCode(profile.government)} / ${describeGovernment(profile.government).toUpperCase()}`,
    `LAW LEVEL ${worldCode(profile.lawLevel)} / ${describeLawLevel(profile.lawLevel).toUpperCase()}`,
    `TECH LEVEL ${worldCode(profile.techLevel)}${profile.techLevel > 9 ? ` / NUMERIC ${profile.techLevel}` : ''}`,
    `BASES ${formatBases(system.bases)}    GAS GIANT ${system.gasGiant ? 'YES' : 'NO'}    TRAVEL ZONE ${zone}`,
    `NOTES ${system.notes || 'none'}`
  ], 96);
}
