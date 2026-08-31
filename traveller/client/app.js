import {
  CHARGEN_ACTIONS,
  createCharacter,
  exportCharacter,
  importCharacter,
  performChargenAction
} from '../../packages/classic-traveller-rules/index.js';

import {
  ACTION_LABELS,
  buildCharacterRecord,
  buildGenerationLog,
  buildProcedure,
  buildServiceHistory,
  serviceName,
  skillTableName
} from './ui-model.js';

const el = {
  status: document.querySelector('#system-status'),
  name: document.querySelector('#character-name'),
  record: document.querySelector('#character-record'),
  procedure: document.querySelector('#procedure'),
  actions: document.querySelector('#actions'),
  serviceHistory: document.querySelector('#service-history'),
  generationLog: document.querySelector('#generation-log'),
  newCharacter: document.querySelector('#new-character'),
  saveCharacter: document.querySelector('#save-character'),
  loadCharacter: document.querySelector('#load-character'),
  loadFile: document.querySelector('#load-file')
};

let character = createCharacter();

function setStatus(message, kind = '') {
  el.status.textContent = message;
  el.status.className = `status${kind ? ` ${kind}` : ''}`;
}

function actionButton(label, action, payload = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'text-button';
  button.textContent = `[ ${label} ]`;
  button.dataset.action = action;
  button.addEventListener('click', () => execute(action, payload));
  return button;
}

function promptControl(labelText, input) {
  const wrap = document.createElement('span');
  wrap.className = 'prompt-control';
  const label = document.createElement('label');
  label.textContent = labelText;
  if (input.id) label.htmlFor = input.id;
  wrap.append(label, input);
  return wrap;
}

function renderGenericActions(actions) {
  for (const action of actions) {
    el.actions.append(actionButton(ACTION_LABELS[action] ?? action.toUpperCase(), action));
  }
}

function renderActions(procedure) {
  el.actions.replaceChildren();
  const { available } = procedure;

  if (!available.actions.length) {
    const text = document.createElement('span');
    text.className = 'empty';
    text.textContent = 'NO FURTHER CHARACTER-GENERATION ACTIONS.';
    el.actions.append(text);
    return;
  }

  if (available.actions.includes(CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT)) {
    for (const service of available.choices.services) {
      el.actions.append(actionButton(serviceName(service).toUpperCase(), CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT, { service }));
    }
    return;
  }

  if (available.actions.includes(CHARGEN_ACTIONS.ROLL_SKILL)) {
    for (const tableKey of available.choices.skillTables) {
      el.actions.append(actionButton(skillTableName(tableKey).toUpperCase(), CHARGEN_ACTIONS.ROLL_SKILL, { tableKey }));
    }
    return;
  }

  if (available.actions.includes(CHARGEN_ACTIONS.RESOLVE_SKILL_SPECIALIZATION)) {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'skill-specialization';
    input.placeholder = 'e.g. Rifle';
    input.autocomplete = 'off';
    input.spellcheck = false;
    el.actions.append(promptControl('SPECIALIZATION', input));
    const accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'text-button';
    accept.textContent = '[ ACCEPT SPECIALIZATION ]';
    accept.addEventListener('click', () => execute(CHARGEN_ACTIONS.RESOLVE_SKILL_SPECIALIZATION, { specialization: input.value }));
    el.actions.append(accept);
    input.focus();
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

    el.actions.append(promptControl('MEDICAL SKILL', medical));
    el.actions.append(promptControl('SLOW DRUG', slow));

    const accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'text-button';
    accept.textContent = '[ ROLL CRISIS SURVIVAL ]';
    accept.addEventListener('click', () => execute(CHARGEN_ACTIONS.RESOLVE_AGING_CRISIS, {
      medicalSkill: Number.parseInt(medical.value, 10) || 0,
      slowDrug: slow.checked
    }));
    el.actions.append(accept);
    return;
  }

  if (available.actions.includes(CHARGEN_ACTIONS.RESOLVE_MUSTER_BENEFIT_SPECIALIZATION)) {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'benefit-specialization';
    input.placeholder = available.choices.pendingBenefit?.category === 'gun' ? 'e.g. Rifle' : 'e.g. Cutlass';
    input.autocomplete = 'off';
    input.spellcheck = false;

    const asSkill = document.createElement('input');
    asSkill.type = 'checkbox';
    asSkill.id = 'benefit-as-skill';

    el.actions.append(promptControl('WEAPON', input));
    el.actions.append(promptControl('TAKE AS SKILL IF ELIGIBLE', asSkill));

    const accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'text-button';
    accept.textContent = '[ ACCEPT BENEFIT ]';
    accept.addEventListener('click', () => execute(CHARGEN_ACTIONS.RESOLVE_MUSTER_BENEFIT_SPECIALIZATION, {
      specialization: input.value,
      asSkill: asSkill.checked
    }));
    el.actions.append(accept);
    input.focus();
    return;
  }

  renderGenericActions(available.actions);
}

function render() {
  if (el.name.value !== character.name) el.name.value = character.name ?? '';
  el.record.textContent = buildCharacterRecord(character);
  el.serviceHistory.textContent = buildServiceHistory(character);
  el.generationLog.textContent = buildGenerationLog(character);

  const procedure = buildProcedure(character);
  el.procedure.replaceChildren();
  const phase = document.createElement('div');
  phase.className = 'phase';
  phase.textContent = procedure.title;
  const text = document.createElement('div');
  text.textContent = procedure.text;
  el.procedure.append(phase, text);
  if (procedure.detail) {
    const detail = document.createElement('div');
    detail.className = 'phase-detail';
    detail.textContent = procedure.detail;
    el.procedure.append(detail);
  }
  renderActions(procedure);
}

function execute(action, payload = {}) {
  try {
    const result = performChargenAction(character, action, payload);
    character = result.character;
    setStatus('ACTION RESOLVED', 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function safeFilename(name) {
  const cleaned = String(name || 'traveller-character')
    .trim()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return `${cleaned || 'traveller-character'}.json`;
}

function saveCharacter() {
  try {
    const json = exportCharacter(character, { space: 2 });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFilename(character.name);
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus('JSON SAVED', 'ok');
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

async function loadCharacter(file) {
  if (!file) return;
  try {
    const text = await file.text();
    character = importCharacter(text);
    setStatus('JSON LOADED', 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  } finally {
    el.loadFile.value = '';
  }
}

el.name.addEventListener('input', () => {
  character = { ...character, name: el.name.value };
  setStatus('NAME UPDATED', 'ok');
});

el.newCharacter.addEventListener('click', () => {
  if (!window.confirm('Discard the current chargen state and create a new character?')) return;
  character = createCharacter();
  setStatus('NEW CHARACTER GENERATED', 'ok');
  render();
});

el.saveCharacter.addEventListener('click', saveCharacter);
el.loadCharacter.addEventListener('click', () => el.loadFile.click());
el.loadFile.addEventListener('change', () => loadCharacter(el.loadFile.files?.[0]));

render();
