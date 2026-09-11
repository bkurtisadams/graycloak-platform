// chargen-view.js — the Book 1 character-generation view, lifted out of app.js
// in v0.66.0 so a page that is not the referee's client can run chargen.
//
// Everything here renders from a chargen `character` (the rules package's
// in-progress record, not a Character Document) into elements the caller
// passes, and reports the player's choices through the `execute(action,
// payload)` callback. It owns no state: the host page holds the character,
// runs the rules-package chargen action itself, and re-renders. That keeps the referee
// client's execute() — which also resets campaign state — where it was, and
// lets the player lobby supply its own.

import {
  CHARGEN_ACTIONS,
  CHARGEN_PHASES,
  formatUPP,
  SERVICES,
  SKILL_TABLES,
  MUSTERING_OUT_TABLES,
  AGING_BANDS
} from '../vendor/classic-traveller-rules/index.js';
import {
  ACTION_LABELS,
  buildServiceHistory,
  chargenTablesForPhase,
  nobleTitleLabel,
  serviceName,
  PHASE_LABELS,
  skillTableName
} from './ui-model.js';

export const SHEET_CHARACTERISTICS = Object.freeze([
  ['STR', 'STRENGTH'],
  ['DEX', 'DEXTERITY'],
  ['END', 'ENDURANCE'],
  ['INT', 'INTELLIGENCE'],
  ['EDU', 'EDUCATION'],
  ['SOC', 'SOCIAL STANDING']
]);

function formatCr(value) {
  return `Cr${Number(value ?? 0).toLocaleString('en-US')}`;
}

// --- the sheet ------------------------------------------------------------

export function appendSheetDatum(list, label, value) {
  const term = document.createElement('dt');
  term.textContent = label;
  const detail = document.createElement('dd');
  detail.textContent = value;
  list.append(term, detail);
}

export function renderSheetBenefitRows(container, rows) {
  container.replaceChildren();
  for (const [label, value] of rows) {
    const item = document.createElement('div');
    item.className = 'sheet-benefit-item';
    const heading = document.createElement('span');
    heading.textContent = label;
    const detail = document.createElement('strong');
    detail.textContent = value;
    item.append(heading, detail);
    container.append(item);
  }
}

// v0.18.1: the in-progress chargen character fills the same Book 1 form the
// playable sheet uses, so the scene is the sheet from the first roll.
//
// `el` is the sheet's element map: name, date, upp, rank, age, world,
// healthStatus, characteristics, service, weapon, armor, equipment, skills,
// benefits, historyRecord, notes.
export function renderChargenSheet(character, el) {
  if (!character) return;
  const inProgress = character.phase !== CHARGEN_PHASES.COMPLETE && character.phase !== CHARGEN_PHASES.DEAD;
  el.name.textContent = character.name || '(UNNAMED)';
  el.date.textContent = inProgress ? 'IN GENERATION' : (character.phase === CHARGEN_PHASES.DEAD ? 'DECEASED' : 'FINAL');
  el.upp.textContent = formatUPP(character.characteristics);
  el.rank.textContent = character.rankTitle || (character.service ? 'NO RANK' : '--');
  el.age.textContent = String(character.age);
  el.world.textContent = character.service ? serviceName(character.service).toUpperCase() : 'NO SERVICE';
  const phaseLabel = PHASE_LABELS[character.phase] ?? character.phase.toUpperCase();
  el.healthStatus.textContent = `PHASE ${phaseLabel}${character.currentTerm ? ` // TERM ${character.currentTerm.number}` : ''}${character.drafted ? ' // DRAFTED' : ''}`;

  el.characteristics.replaceChildren();
  const createdUpp = character.history?.find((entry) => entry.type === 'character-created')?.upp;
  const original = typeof createdUpp === 'string' && createdUpp.length === 6
    ? Object.fromEntries(['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'].map((k, i) => [k, parseInt(createdUpp[i], 36)]))
    : character.characteristics;
  for (const [key, label] of SHEET_CHARACTERISTICS) {
    const value = character.characteristics[key];
    const base = original[key];
    const box = document.createElement('div');
    box.className = `sheet-characteristic${value < base ? ' injured' : ''}`;
    box.title = `${label} ${value}`;
    const code = document.createElement('span'); code.className = 'sheet-stat-code'; code.textContent = key;
    const strong = document.createElement('strong'); strong.className = 'sheet-stat-value'; strong.textContent = String(value);
    const note = document.createElement('span'); note.className = 'sheet-stat-current'; note.textContent = value === base ? 'CURRENT' : `WAS ${base}`;
    box.append(code, strong, note);
    el.characteristics.append(box);
  }

  el.service.replaceChildren();
  appendSheetDatum(el.service, 'SERVICE', character.service ? serviceName(character.service).toUpperCase() : 'UNASSIGNED');
  appendSheetDatum(el.service, 'TERMS', `${character.terms}${character.currentTerm ? ` (TERM ${character.currentTerm.number} IN PROGRESS)` : ''}`);
  appendSheetDatum(el.service, 'YEARS SERVED', String(character.yearsServed));
  appendSheetDatum(el.service, 'RANK', character.rankTitle || 'NONE');
  appendSheetDatum(el.service, 'NOBLE TITLE', nobleTitleLabel(character.characteristics.SOC));
  appendSheetDatum(el.service, 'DRAFTED', character.drafted ? 'YES' : 'NO');
  if (character.retired) appendSheetDatum(el.service, 'RETIREMENT PAY', formatCr(character.retirementPayAnnual));

  el.weapon.replaceChildren();
  el.armor.replaceChildren();
  el.equipment.textContent = character.materialBenefits.filter((entry) => entry.type === 'weapon' || entry.category).map((entry) => entry.name).join(' / ') || 'NONE YET';

  el.skills.replaceChildren();
  const skills = Object.entries(character.skills).sort(([left], [right]) => left.localeCompare(right));
  const lastRoll = character.currentTerm?.skillRolls?.at?.(-1) ?? null;
  const justGained = lastRoll ? (lastRoll.specialization?.specialization ?? (lastRoll.outcome?.type === 'skill' ? lastRoll.outcome.name : null)) : null;
  if (!skills.length) el.skills.textContent = 'NONE YET';
  for (const [name, level] of skills) {
    const chip = document.createElement('span');
    chip.className = `sheet-skill${name === justGained ? ' sheet-skill-new' : ''}`;
    chip.textContent = `${name}-${level}`;
    el.skills.append(chip);
  }
  if (character.skillsDue > 0) {
    const pending = document.createElement('span');
    pending.className = 'sheet-skill sheet-skill-pending';
    pending.textContent = `${character.skillsDue} PENDING`;
    el.skills.append(pending);
  }

  const benefits = character.materialBenefits.map((entry) => entry.name);
  renderSheetBenefitRows(el.benefits, character.musterOut || character.credits || benefits.length
    ? [
        ['CREDITS', formatCr(character.credits)],
        ['BENEFITS', benefits.join(' / ') || 'NONE'],
        ['MUSTER ROLLS', character.musterOut ? `${character.musterOut.remainingRolls ?? 0} REMAINING` : 'NOT YET REACHED'],
      ]
    : [['MUSTERING OUT', 'NOT YET REACHED']]);
  el.historyRecord.textContent = buildServiceHistory(character);
  if (el.notes) el.notes.value = '';
}

// --- WHAT NOW? actions ----------------------------------------------------

export function actionButton(label, action, payload, execute) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'text-button action-button';
  button.textContent = `[ ${label} ]`;
  button.dataset.action = action;
  button.addEventListener('click', () => execute(action, typeof payload === 'function' ? payload() : (payload ?? {})));
  return button;
}

export function promptControl(labelText, input) {
  const wrap = document.createElement('span');
  wrap.className = 'prompt-control';
  const label = document.createElement('label');
  label.textContent = labelText;
  if (input.id) label.htmlFor = input.id;
  wrap.append(label, input);
  return wrap;
}

function renderGenericActions(container, actions, execute) {
  for (const action of actions) {
    container.append(actionButton(ACTION_LABELS[action] ?? action.toUpperCase(), action, {}, execute));
  }
}

// The chargen branch of WHAT NOW?: enlistment, skill tables, specializations,
// aging crises and mustering-out choices. Everything a completed character can
// do (start a campaign, export) belongs to the host page, not here.
export function renderChargenActions(container, character, available, execute) {
  if (!available.actions.length) {
    const text = document.createElement('span');
    text.className = 'empty';
    text.textContent = 'NO FURTHER CHARACTER-GENERATION ACTIONS.';
    container.append(text);
    return;
  }

  if (available.actions.includes(CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT)) {
    for (const service of available.choices.services) {
      container.append(actionButton(serviceName(service).toUpperCase(), CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT, { service }, execute));
    }
    return;
  }

  if (available.actions.includes(CHARGEN_ACTIONS.ROLL_SKILL)) {
    for (const tableKey of available.choices.skillTables) {
      container.append(actionButton(skillTableName(tableKey).toUpperCase(), CHARGEN_ACTIONS.ROLL_SKILL, { tableKey }, execute));
    }
    return;
  }

  if (available.actions.includes(CHARGEN_ACTIONS.RESOLVE_SKILL_SPECIALIZATION)) {
    const label = document.createElement('span');
    label.className = 'choice-label';
    label.textContent = `CHOOSE ${String(available.choices.pendingSkill?.name ?? 'SPECIALIZATION').toUpperCase()}:`;
    container.append(label);
    for (const specialization of available.choices.specializations ?? []) {
      container.append(actionButton(
        specialization.toUpperCase(),
        CHARGEN_ACTIONS.RESOLVE_SKILL_SPECIALIZATION,
        { specialization },
        execute
      ));
    }
    return;
  }

  if (available.actions.includes(CHARGEN_ACTIONS.RESOLVE_AGING_CRISIS)) {
    const medical = document.createElement('input');
    medical.type = 'number';
    medical.id = 'medical-skill';
    medical.min = '0';
    medical.step = '1';
    medical.value = String(character.skills.Medical ?? 0);

    const slow = document.createElement('input');
    slow.type = 'checkbox';
    slow.id = 'slow-drug';
    slow.checked = true;

    container.append(promptControl('MEDICAL SKILL', medical));
    container.append(promptControl('SLOW DRUG', slow));

    const accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'text-button action-button';
    accept.textContent = '[ ROLL CRISIS SURVIVAL ]';
    accept.addEventListener('click', () => execute(CHARGEN_ACTIONS.RESOLVE_AGING_CRISIS, {
      medicalSkill: Number.parseInt(medical.value, 10) || 0,
      slowDrug: slow.checked
    }));
    container.append(accept);
    return;
  }

  if (available.actions.includes(CHARGEN_ACTIONS.RESOLVE_MUSTER_BENEFIT_SPECIALIZATION)) {
    const asSkill = document.createElement('input');
    asSkill.type = 'checkbox';
    asSkill.id = 'benefit-as-skill';
    if (available.choices.canTakeAsSkill) {
      container.append(promptControl('TAKE AS SKILL', asSkill));
    }

    const label = document.createElement('span');
    label.className = 'choice-label';
    label.textContent = `CHOOSE ${String(available.choices.pendingBenefit?.category ?? 'WEAPON').toUpperCase()}:`;
    container.append(label);

    // Book 1 p.22: expertise may only be taken in a weapon already received
    // as a benefit, so ticking TAKE AS SKILL narrows the choice to those.
    const skillable = new Set(available.choices.skillSpecializations ?? []);
    const buttons = (available.choices.specializations ?? []).map((specialization) => {
      const button = actionButton(
        specialization.toUpperCase(),
        CHARGEN_ACTIONS.RESOLVE_MUSTER_BENEFIT_SPECIALIZATION,
        () => ({ specialization, asSkill: asSkill.checked }),
        execute
      );
      button.dataset.specialization = specialization;
      container.append(button);
      return button;
    });
    const applySkillFilter = () => {
      for (const button of buttons) {
        const allowed = !asSkill.checked || skillable.has(button.dataset.specialization);
        button.disabled = !allowed;
        button.title = allowed ? '' : 'Expertise may only be taken in a weapon received as a benefit (Book 1 p.22)';
      }
    };
    asSkill.addEventListener('change', applySkillFilter);
    applySkillFilter();
    return;
  }

  renderGenericActions(container, available.actions, execute);
}

// ---------------------------------------------------------------------------
// v0.18.0 chargen context: the Book 1 tables that apply to the current phase
// ---------------------------------------------------------------------------
export function tableElement(title, headers, rows, { highlight = null, note = null, hitCell = null, action = null } = {}) {
  const box = document.createElement('div');
  box.className = 'chargen-table';
  const head = document.createElement('div');
  head.className = 'chargen-table-head';
  const label = document.createElement('span');
  label.textContent = title;
  head.append(label);
  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button action-button chargen-table-action';
    button.textContent = action.label;
    button.disabled = Boolean(action.disabled);
    if (!action.disabled) button.addEventListener('click', action.run);
    head.append(button);
  }
  box.append(head);
  if (note) { const n = document.createElement('div'); n.className = 'chargen-table-note'; n.textContent = note; box.append(n); }
  const table = document.createElement('table');
  table.className = 'chargen-grid';
  if (headers?.length) {
    const tr = document.createElement('tr');
    for (const h of headers) { const th = document.createElement('th'); th.textContent = h; tr.append(th); }
    table.append(tr);
  }
  rows.forEach((row, index) => {
    const tr = document.createElement('tr');
    if (highlight !== null && index === highlight) tr.className = 'hit';
    row.forEach((cell, cellIndex) => {
      const td = document.createElement('td');
      td.textContent = cell;
      // hitCell = [rowIndex, firstCellIndex]: highlight the die and its result only.
      if (hitCell && hitCell[0] === index && (cellIndex === hitCell[1] || cellIndex === hitCell[1] + 1)) td.className = 'hit-cell';
      tr.append(td);
    });
    table.append(tr);
  });
  box.append(table);
  return box;
}

export function describeOutcome(outcome) {
  if (!outcome) return '—';
  if (outcome.type === 'characteristic') return `${outcome.amount > 0 ? '+' : ''}${outcome.amount} ${outcome.characteristic}`;
  if (outcome.type === 'skill' || outcome.type === 'specialization') return outcome.name;
  if (outcome.type === 'material') return outcome.name;
  if (outcome.type === 'weapon') return outcome.category === 'gun' ? 'Gun' : 'Blade';
  if (outcome.type === 'none') return '—';
  return String(outcome.name ?? outcome.type);
}

export function renderChargenTables(container, character, execute) {
  if (!container) return;
  container.replaceChildren();
  if (!character) return;
  const mode = chargenTablesForPhase(character.phase);
  const serviceKey = character.service;
  const service = serviceKey ? SERVICES[serviceKey] : null;
  const lastRoll = character.currentTerm?.skillRolls?.at?.(-1) ?? null;
  const intro = document.createElement('div');
  intro.className = 'chargen-tables-intro';
  intro.textContent = mode === 'skills'
    ? `Acquired Skills · ${service?.name ?? 'service'} column (Book 1 p.15). ${character.skillsDue > 0 ? `${character.skillsDue} roll${character.skillsDue === 1 ? '' : 's'} due: pick a table and roll here.` : 'Resolve the pending result in WHAT NOW?.'}`
    : mode === 'muster' ? `Mustering Out · ${service?.name ?? 'service'} (Book 1 p.14). One roll per term plus rank bonus; at most three on cash.`
      : mode === 'aging' ? 'Aging (Book 1 p.12). Throw the number shown or lose the amount listed.'
        : service ? `Prior Service · ${service.name} (Book 1 p.14).` : 'Prior Service Table (Book 1 p.14). Choose a service to enlist in.';
  container.append(intro);

  if (mode === 'skills' && service) {
    const edu = character.characteristics.EDU;
    for (const key of ['personal-development', 'service-skills', 'advanced-education', 'advanced-education-8']) {
      const table = SKILL_TABLES[key];
      const column = table.columns[serviceKey];
      const locked = table.minimumEducation !== null && edu < table.minimumEducation;
      const rows = [];
      for (let i = 0; i < 6; i += 2) rows.push([String(i + 1), describeOutcome(column[i]), String(i + 2), describeOutcome(column[i + 1])]);
      const hitCell = lastRoll && lastRoll.table === key ? [Math.floor((lastRoll.roll - 1) / 2), (lastRoll.roll - 1) % 2 === 0 ? 0 : 2] : null;
      const canRoll = character.phase === CHARGEN_PHASES.SKILLS_PENDING && !locked;
      const box = tableElement(table.name.toUpperCase(), null, rows, {
        hitCell,
        note: locked ? `Requires EDU ${table.minimumEducation}+ (EDU ${edu}).` : null,
        action: { label: canRoll ? '[ ROLL 1D HERE ]' : (locked ? `[ EDU ${edu} ]` : '[ ROLL ]'), disabled: !canRoll, run: () => execute(CHARGEN_ACTIONS.ROLL_SKILL, { tableKey: key }) }
      });
      if (locked) box.classList.add('locked');
      container.append(box);
    }
  } else if (mode === 'muster' && service) {
    const tables = MUSTERING_OUT_TABLES[serviceKey];
    const lastMusterRoll = character.musterOut?.results?.at?.(-1) ?? null;
    const benefitHit = lastMusterRoll?.type === 'benefit' ? [lastMusterRoll.total - 1, 0] : null;
    const cashHit = lastMusterRoll?.type === 'cash' ? [lastMusterRoll.total - 1, 0] : null;
    container.append(tableElement('BENEFITS', ['ROLL', 'BENEFIT'], tables.benefits.map((b, i) => [String(i + 1), describeOutcome(b)]), { hitCell: benefitHit, note: character.rank >= 5 ? 'Rank 5–6: DM +1 on this table.' : null }));
    container.append(tableElement('CASH', ['ROLL', 'CR'], tables.cash.map((c, i) => [String(i + 1), c.toLocaleString('en-US')]), { hitCell: cashHit, note: (character.skills?.Gambling ?? 0) >= 1 ? 'Gambling: DM +1 on this table.' : 'Maximum three rolls on cash.' }));
  } else if (mode === 'aging') {
    container.append(tableElement('AGING', ['AGE', 'STR', 'DEX', 'END', 'INT'], AGING_BANDS.map((band) => [
      `${band.minimumAge}–${Number.isFinite(band.maximumAge) ? band.maximumAge : '+'}`,
      ...['STR', 'DEX', 'END', 'INT'].map((k) => { const r = band.rules.find((rule) => rule.characteristic === k); return r ? `−${r.loss} (${r.target}+)` : '—'; })
    ])));
  } else {
    const dm = (list) => list.map((d) => `+${d.modifier} if ${d.characteristic} ${d.minimum}+`).join(', ');
    if (service) {
      const svc = service;
      const line = (check) => check ? `${check.target}+${check.dms?.length ? ` (${dm(check.dms)})` : ''}` : '—';
      container.append(tableElement(`PRIOR SERVICE · ${svc.name.toUpperCase()}`, ['THROW', 'TARGET'], [
        ['Enlistment', line(svc.enlistment)],
        ['Survival', line(svc.survival)],
        ['Commission', line(svc.commission)],
        ['Promotion', line(svc.promotion)],
        ['Reenlistment', `${svc.reenlistment.target}+ (12 exactly is mandatory)`]
      ], { highlight: ({ 'survival-required': 1, 'commission-option': 2, 'promotion-option': 3, 'reenlistment-required': 4 })[character.phase] ?? null }));
    } else {
      container.append(tableElement('PRIOR SERVICE · ENLISTMENT', ['SERVICE', 'ENLIST', 'DMS', 'SURVIVE'], Object.values(SERVICES).map((svc) => [svc.name, `${svc.enlistment.target}+`, dm(svc.enlistment.dms) || '—', `${svc.survival.target}+`])));
    }
    if (service && service.ranks.length > 1) {
      container.append(tableElement('RANKS', ['RANK', 'TITLE'], service.ranks.slice(1).map((r, i) => [String(i + 1), r]), { highlight: character.rank > 0 ? character.rank - 1 : null }));
    }
  }
}
