// play-views.js — draws the play page from a view state (see play-sample.js).
//
// Rules for this file, so the page stays what was approved:
//   1. It imports nothing from app.js, ui-model.js or styles.css. The only
//      shared modules are pure ones: the subsector SVG, the world data, the
//      rules package, and the encounter document's band arithmetic.
//   2. Every function takes state and returns DOM. No module-level state.
//   3. A situation adds a scene and a lead card. It never adds a panel.

import { renderSubsectorMap, createSvgNode } from './subsector-svg.js?v=v0.211.1';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js?v=v0.211.1';
import { rangeBandForBandGap, ENCOUNTER_RANGE_LINE_ESCAPE_BANDS } from '../src/encounter-document.js?v=v0.211.1';
import {
  SUBSECTOR_COLUMNS, SUBSECTOR_ROWS, getJumpDestinations, getSubsectorSystem, parseUniversalWorldProfile,
  describeStarport, describeAtmosphere, describeHydrographics, describePopulation, describeLawLevel,
  previewPersonalAttack, getPersonalWeapon, blowsRemaining
} from '../vendor/classic-traveller-rules/index.js?v=v0.211.1';

export function h(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes ?? {})) {
    if (value === null || value === undefined) continue;
    if (value === false && !key.startsWith('aria-')) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (key.startsWith('aria-')) node.setAttribute(key, String(value));
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const cr = (amount) => `Cr ${Number(amount).toLocaleString('en-US')}`;

// ---------------------------------------------------------------- masthead

export function renderMastChips(state, { openDrawer, drawer }) {
  const chips = [];
  const c = state.character;
  if (c) {
    chips.push(h('button', { class: `chip${c.hurt ? ' is-hurt' : ''}`, type: 'button', 'aria-pressed': drawer === 'character', onclick: () => openDrawer('character') },
      h('span', { class: 'chip-name', text: c.name }),
      h('span', { class: 'chip-line' }, h('span', { class: 'code', text: c.upp }), ` ${c.hurt ? c.status : cr(c.cashCr)}`)));
  }
  const s = state.ship;
  if (s) {
    chips.push(h('button', { class: `chip${s.damage ? ' is-hurt' : ''}`, type: 'button', 'aria-pressed': drawer === 'ship', onclick: () => openDrawer('ship') },
      h('span', { class: 'chip-name', text: s.name }),
      h('span', { class: 'chip-line', text: `Fuel ${s.fuel.now}/${s.fuel.full}  Hold ${s.hold.full - s.hold.now} t free` })));
  }
  if (state.seat === 'referee') {
    chips.push(h('button', { class: 'chip chip-plain', type: 'button', 'aria-pressed': drawer === 'referee', onclick: () => openDrawer('referee') },
      h('span', { class: 'chip-name', text: 'Referee' }),
      h('span', { class: 'chip-line', text: 'Actors, scenes, players' })));
  }
  return chips;
}

// -------------------------------------------------------------- what now?

function jobRow(job) {
  return h('li', { class: `job${job.urgent ? ' is-urgent' : ''}` },
    h('span', { class: 'job-title', text: `${job.title} to ${job.to}` }),
    h('span', { class: 'job-due', text: job.due }),
    h('span', { class: 'job-pay', text: cr(job.payCr) }));
}

// ---- fights: every number here is read from the rules package -------------

const RANGE_NAMES = { close: 'Close', short: 'Short', medium: 'Medium', long: 'Long', 'very-long': 'Very long' };

// Book 1 p.29 (1977) bands: range is read from the gap alone. The contact
// check is kept for the tactical grid, where close is contact.
function inContact(a, b) {
  return Boolean(a.contactIds?.includes(b.id) && b.contactIds?.includes(a.id));
}

function rangeBetween(a, b) {
  const gap = Math.abs(a.band - b.band);
  if (gap >= ENCOUNTER_RANGE_LINE_ESCAPE_BANDS) return { gap, key: null, name: 'Out of range' };
  const key = rangeBandForBandGap(gap);
  return { gap, key, name: RANGE_NAMES[key] };
}

// What the 2D must show for `attacker` to hit `defender` with the weapon in
// hand, as words a player can act on.
function hitLine(attacker, defender, weaponKey = attacker.weaponKey) {
  const range = rangeBetween(attacker, defender);
  if (!range.key) return { text: 'out of range', preview: null, range };
  const preview = previewPersonalAttack({ attacker: { ...attacker, weaponKey }, defender, range: range.key });
  if (!preview.canAttack) return { text: 'cannot reach', preview, range };
  const need = preview.requiredRoll;
  return { text: need <= 2 ? 'cannot miss' : need > 12 ? 'cannot hit' : `${need}+`, preview, range };
}

function woundText(preview) {
  const modifier = preview.damageModifier ? (preview.damageModifier > 0 ? `+${preview.damageModifier}` : `\u2212${Math.abs(preview.damageModifier)}`) : '';
  return `${preview.damageDice}D${modifier}`;
}

function dmBreakdown(preview) {
  const parts = [`${preview.weaponName} against ${preview.armor === 'none' ? 'no armor' : preview.armor} at ${RANGE_NAMES[preview.range].toLowerCase()} range is ${preview.target}+`];
  const dms = [['expertise', preview.skillDM], ['characteristic', preview.characteristicDM], ['untrained', preview.untrainedDM],
    ['parry', preview.parryDM], ['evasion', preview.evasionDM], ['untrained defender', preview.defenderUntrainedDM], ['weakened blow', preview.fatigueDM]];
  for (const [label, value] of dms) if (value) parts.push(`${label} ${value > 0 ? '+' : '\u2212'}${Math.abs(value)}`);
  return `${parts.join(', ')}.`;
}

function isDown(fighter) {
  return fighter.down || ['STR', 'DEX', 'END'].some((key) => fighter.characteristics[key] <= 0);
}

function condition(fighter) {
  const zeros = ['STR', 'DEX', 'END'].filter((key) => fighter.characteristics[key] <= 0).length;
  if (zeros === 3) return 'Dead';
  if (zeros === 2) return 'Seriously wounded';
  if (zeros === 1) return 'Unconscious';
  return ['STR', 'DEX', 'END'].some((key) => fighter.characteristics[key] < fighter.full[key]) ? 'Wounded' : 'Unwounded';
}

function shortName(fighter) {
  return fighter.name.replace(/[^A-Z0-9]/g, '').slice(0, 2) || fighter.name[0];
}

// The declaration in force for a combatant: the player's live choice for the
// one being declared, the stored order for everyone else.
function orderOf(fighter, state) {
  const d = state.next?.declare;
  if (d && fighter.id === d.actorId) {
    const evading = d.move === 'Evade';
    const verb = getPersonalWeapon(d.weaponKey ?? fighter.weaponKey).melee ? 'swing' : 'fire';
    return { move: d.running ? `${d.move}, running` : d.move, attack: evading || d.running ? null : verb, targetId: evading || d.running ? null : d.targetId, weaponKey: d.weaponKey ?? fighter.weaponKey };
  }
  return fighter.order ?? null;
}

function orderText(fighter, state) {
  if (isDown(fighter)) return { Dead: 'dead', 'Seriously wounded': 'serious wound', Unconscious: 'unconscious' }[condition(fighter)];
  const order = orderOf(fighter, state);
  if (!order) return 'undeclared';
  const target = order.targetId ? state.fighters.find((entry) => entry.id === order.targetId) : null;
  const move = order.move.toLowerCase().replace(', running', ' (run)');
  return target ? `\u2192 ${shortName(target)} ${order.attack ? (move === 'stand' ? order.attack : `${move}+${order.attack}`) : move}` : move;
}

// Weapon and armor drive every DM in the fight, so they sit in boxes like the
// characteristics. The weapon box is the control for changing it. Blows left
// shows only with a brawling or blade weapon in hand: guns ignore endurance
// (Book 1 p.32).
function gearRow(reader, state, handlers) {
  const d = state.next?.declare;
  const declaring = d && d.actorId === reader.id && !isDown(reader);
  const weaponKey = declaring ? (d.weaponKey ?? reader.weaponKey) : reader.weaponKey;
  const weapon = getPersonalWeapon(weaponKey);
  const dice = woundText({ damageDice: weapon.damageDice, damageModifier: weapon.damageModifier ?? 0 });
  const label = (key) => { const spec = getPersonalWeapon(key); return `${spec.name}  ${woundText({ damageDice: spec.damageDice, damageModifier: spec.damageModifier ?? 0 })}`; };
  const left = blowsRemaining(reader);
  return h('div', { class: 'sel-gear' },
    h('label', { class: 'sel-stat is-gear' }, h('small', { text: 'In hand' }),
      declaring && reader.weapons.length > 1
        ? h('select', { class: 'gear-select', onchange: (event) => handlers.onPickWeapon(event.target.value) },
          reader.weapons.map((key) => h('option', { value: key, selected: key === weaponKey, text: label(key) })))
        : h('b', { text: `${weapon.name}  ${dice}` })),
    h('span', { class: 'sel-stat is-gear' }, h('small', { text: 'Armor' }), h('b', { text: reader.armor === 'none' ? 'None' : reader.armor[0].toUpperCase() + reader.armor.slice(1) })),
    weapon.melee ? h('span', { class: `sel-stat${left <= 0 ? ' is-hurt' : ''}`, title: 'Combat blows before every swing is weakened (Book 1 p.31)' },
      h('small', { text: 'Blows' }), h('b', { text: `${left}/${reader.blowAllowance}` })) : null);
}

// The selected combatant: who they are, what state they are in, and — when
// they are yours to declare for — the two choices Book 1 p.28 asks for each
// round: a movement status, and an attack.
function selectedPanel(reader, state, handlers) {
  const d = state.next?.declare;
  const declaring = d && d.actorId === reader.id;
  const parts = [
    h('div', { class: 'sel-head' },
      h('div', {}, h('h2', { text: reader.name }), reader.service ? h('p', { text: reader.service }) : h('p', { text: reader.side === 'party' ? 'Party' : 'Opposition' })),
      reader.upp ? h('span', { class: 'sel-upp', text: reader.upp }) : null),
    h('div', { class: 'sel-stats' },
      ['STR', 'DEX', 'END'].map((key) => {
        const now = reader.characteristics[key];
        const full = reader.full[key];
        return h('span', { class: `sel-stat${now < full ? ' is-hurt' : ''}` }, h('small', { text: key }), h('b', { text: now < full ? `${now}/${full}` : String(now) }));
      })),
    gearRow(reader, state, handlers),
    h('dl', { class: 'sel-lines' },
      h('dt', { text: 'Status' }),
      h('dd', { class: condition(reader) === 'Unwounded' ? '' : 'is-hurt', text: condition(reader) }))
  ];
  if (declaring && !isDown(reader)) {
    const foes = state.fighters.filter((fighter) => fighter.side !== reader.side && !isDown(fighter));
    const target = foes.find((fighter) => fighter.id === d.targetId) ?? null;
    const weaponKey = d.weaponKey ?? reader.weaponKey;
    const noAttack = d.move === 'Evade' || d.running;
    const line = target && !noAttack ? hitLine(reader, target, weaponKey) : null;
    parts.push(
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Movement this round' },
        d.moves.map((move) => h('button', { type: 'button', class: 'seg-option', 'aria-pressed': move === d.move, text: move, onclick: () => handlers.onPickMove(move) }))),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: d.running, onchange: (event) => handlers.onPickRunning(event.target.checked) }), ' At a run: two bands, spends a blow, no attack'),
      noAttack
        ? h('p', { class: 'attack-line is-off', text: d.move === 'Evade' ? 'Evading: no attack this round.' : 'Running: no attack this round.' })
        : h('div', { class: 'attack-line' },
          h('span', { class: 'attack-at' }, target ? `\u2192 ${target.name}` : 'pick a target below'),
          line ? h('b', { class: 'attack-need', title: line.preview?.canAttack ? dmBreakdown(line.preview) : '', text: /^\d/.test(line.text) ? `needs ${line.text}` : line.text }) : null));
  } else if (!isDown(reader)) {
    parts.push(h('p', { class: 'attack-line is-off', text: `This round: ${orderText(reader, state)}` }));
  }
  return h('section', { class: 'selected', 'aria-label': 'Selected combatant' }, parts);
}

function trackerRow(fighter, reader, state, handlers) {
  const opposing = fighter.side !== reader.side;
  const down = isDown(fighter);
  const d = state.next?.declare;
  const canTarget = d && d.actorId === reader.id && opposing && !down;
  const targeted = canTarget && d.targetId === fighter.id;
  const out = opposing && !down ? hitLine(reader, fighter, d && d.actorId === reader.id ? (d.weaponKey ?? reader.weaponKey) : reader.weaponKey) : null;
  const back = opposing && !down ? hitLine(fighter, reader) : null;
  const short = (line) => (line ? (/^\d/.test(line.text) ? line.text : line.text === 'cannot miss' ? 'auto' : '\u2014') : '');
  const range = fighter === reader ? '' : { Close: 'C', Short: 'S', Medium: 'M', Long: 'L', 'Very long': 'VL', 'Out of range': 'out' }[rangeBetween(reader, fighter).name];
  const stats = ['STR', 'DEX', 'END'].map((key, index) => [index ? '\u00b7' : '',
    h('span', { class: fighter.characteristics[key] < fighter.full[key] ? 'is-hurt' : '', text: String(fighter.characteristics[key]) })]);
  const order = orderText(fighter, state);
  return h('tr', { class: `is-${fighter.side}${down ? ' is-down' : ''}${fighter === reader ? ' is-reader' : ''}`,
    onclick: (event) => { if (!event.target.closest('button')) handlers.onSelectMarker(fighter.id); } },
    h('td', {}, h('div', { class: 'tr-name' }, h('span', { class: 'tr-dot', 'aria-hidden': 'true' }), h('button', { type: 'button', class: 'tr-select', text: fighter.name, onclick: () => handlers.onSelectMarker(fighter.id) }))),
    h('td', { class: 'tr-stats' }, stats),
    h('td', { class: 'tr-range', title: fighter === reader ? '' : rangeBetween(reader, fighter).name, text: range }),
    h('td', { class: 'tr-hit' }, canTarget
      ? h('button', { type: 'button', class: 'tr-target', 'aria-pressed': targeted, title: out.preview?.canAttack ? `Target ${fighter.name}. ${dmBreakdown(out.preview)}` : `${fighter.name}: ${out.text}`, text: short(out), onclick: () => handlers.onPickTarget(fighter.id) })
      : short(out)),
    h('td', { class: 'tr-hit', title: back?.preview?.canAttack ? dmBreakdown(back.preview) : (back?.text ?? ''), text: short(back) }),
    h('td', { class: `tr-order${order === 'undeclared' ? ' is-undeclared' : ''}`, title: order, text: order }));
}

function fightColumn(state, handlers) {
  const reader = state.fighters.find((fighter) => fighter.id === state.scene.selected) ?? state.fighters[0];
  const sides = [state.fighters.filter((fighter) => fighter.side === 'party'), state.fighters.filter((fighter) => fighter.side !== 'party')];
  const referee = state.seat !== 'player';
  return [
    h('header', { class: 'now-head' }, h('h1', { text: state.situation.title }), h('p', { text: state.situation.detail })),
    selectedPanel(reader, state, handlers),
    h('table', { class: 'tracker' },
      h('thead', {}, h('tr', {},
        h('th', { text: 'Combatant' }), h('th', { title: 'Strength, dexterity, endurance now', text: 'S\u00b7D\u00b7E' }), h('th', { title: `Range from ${reader.name}`, text: 'Rng' }),
        h('th', { title: `What ${reader.name} must throw to hit them. Click to target.`, text: 'Hit' }), h('th', { title: `What they must throw to hit ${reader.name}`, text: 'Hit by' }), h('th', { text: 'This round' }))),
      sides.map((side) => h('tbody', {}, side.map((fighter) => trackerRow(fighter, reader, state, handlers))))),
    h('div', { class: 'lead-actions' },
      (state.next?.actions ?? []).map((action) => h('button', { type: 'button', class: action.primary ? 'button is-primary' : 'button' }, h('span', { text: action.label }), action.note ? h('small', { text: action.note }) : null)),
      referee ? h('button', { type: 'button', class: 'button is-small', text: 'Add to combat' }) : null,
      referee ? h('button', { type: 'button', class: 'button is-small', text: 'End fight' }) : null),
    state.lastRound?.length ? h('section', { class: 'last-round' }, h('h3', { text: 'Last round' }), state.lastRound.map((line) => h('p', { text: line }))) : null
  ];
}

function leadCard(next, state, handlers) {
  if (!next) return h('section', { class: 'lead' }, h('h2', { text: 'Nothing pending' }), h('p', { text: 'The port call is complete. Depart when you are ready.' }));
  return h('section', { class: 'lead', 'aria-label': 'Do this next' },
    h('h2', { text: next.title }),
    next.copy ? h('p', { text: next.copy }) : null,
    next.actions?.length ? h('div', { class: 'lead-actions' }, next.actions.map((action) =>
      h('button', { type: 'button', class: action.primary ? 'button is-primary' : 'button', onclick: action.command ? () => handlers.onCommand?.(action.command) : null },
        h('span', { text: action.label }), action.note ? h('small', { text: action.note }) : null))) : null,
    next.cite ? h('p', { class: 'cite', text: next.cite }) : null);
}

function stepRow(step, handlers = {}) {
  const row = h('li', { class: `step is-${step.state}` });
  const head = h('button', { type: 'button', class: 'step-head', 'aria-expanded': 'false',
    onclick: () => { const open = row.classList.toggle('is-open'); head.setAttribute('aria-expanded', String(open)); } },
    h('span', { class: 'step-mark', 'aria-hidden': 'true' }),
    h('span', { class: 'step-title', text: step.title }),
    h('span', { class: 'step-figure', text: step.figure }));
  row.append(head);
  if (step.verb) row.append(h('button', { type: 'button', class: 'button is-small', text: step.verb, onclick: step.command ? () => handlers.onCommand?.(step.command) : null }));
  row.append(h('p', { class: 'step-more' }, step.copy, step.cite ? h('span', { class: 'cite', text: ` ${step.cite}` }) : null));
  return row;
}

function rosterRow(entry) {
  return h('li', { class: `fighter is-${entry.side}${entry.down ? ' is-down' : ''}${entry.hurt ? ' is-hurt' : ''}` },
    h('span', { class: 'fighter-mark', 'aria-hidden': 'true' }),
    h('span', { class: 'fighter-name', text: entry.name }),
    h('span', { class: 'fighter-line', text: entry.line }),
    entry.declared ? h('span', { class: 'fighter-declared', text: entry.declared }) : null);
}

export function renderNow(state, handlers = {}) {
  if (state.fighters?.length) return fightColumn(state, handlers).filter(Boolean);
  const parts = [
    h('header', { class: 'now-head' },
      h('h1', { text: state.situation.title }),
      h('p', { text: state.situation.detail }))
  ];
  if (state.jobs?.length && ['port', 'jump'].includes(state.situation.kind)) parts.push(h('ul', { class: 'jobs', 'aria-label': 'Accepted jobs' }, state.jobs.map(jobRow)));
  if (state.lastRound?.length) {
    parts.push(h('section', { class: 'last-round' }, h('h3', { text: 'Last round' }), state.lastRound.map((line) => h('p', { text: line }))));
  }
  if (state.notice) parts.push(h('p', { class: `notice${state.notice.ok ? '' : ' is-error'}`, role: 'status', text: state.notice.message }));
  parts.push(leadCard(state.next, state, handlers));
  if (state.hold) parts.push(h('p', { class: 'hold-note', text: state.hold }));
  if (state.roster?.length) parts.push(h('ul', { class: 'roster', 'aria-label': 'Who is fighting' }, state.roster.map(rosterRow)));
  const open = (state.steps ?? []).filter((step) => step.state !== 'done');
  const finished = [...(state.done ?? []), ...(state.steps ?? []).filter((step) => step.state === 'done').map((step) => `${step.title}, ${step.figure}`)];
  if (open.length) parts.push(h('ul', { class: 'steps', 'aria-label': 'Also possible now' }, open.map((step) => stepRow(step, handlers))));
  if (finished.length) parts.push(h('p', { class: 'done-line' }, h('span', { class: 'done-label', text: 'Done ' }), finished.join('. ') + '.'));
  return parts;
}

// ------------------------------------------------------------------ scenes

function worldCaption(system, { role, label, onChoose = null } = {}) {
  const profile = parseUniversalWorldProfile(system.mainWorld.uwp);
  const facts = [
    describeStarport(profile.starport),
    /atmosphere/i.test(describeAtmosphere(profile.atmosphere)) ? describeAtmosphere(profile.atmosphere) : `${describeAtmosphere(profile.atmosphere)} atmosphere`,
    describeHydrographics(profile.hydrographics),
    describePopulation(profile.population),
    `Law ${profile.lawLevel}: ${describeLawLevel(profile.lawLevel).toLowerCase()}`
  ];
  const bases = [system.bases?.naval ? 'Naval base' : null, system.bases?.scout ? 'Scout base' : null, system.gasGiant ? 'Gas giant' : null].filter(Boolean);
  return h('div', { class: `caption caption-${role}` },
    h('p', { class: 'caption-role', text: label }),
    h('h2', {}, system.name, ' ', h('span', { class: 'code', text: system.mainWorld.uwp })),
    h('p', { class: 'caption-facts', text: `${facts.join('. ')}.` }),
    bases.length ? h('p', { class: 'caption-bases', text: bases.join(', ') }) : null,
    onChoose ? h('button', { type: 'button', class: 'button is-primary', onclick: onChoose }, h('span', { text: `Set course for ${system.name}` })) : null);
}

function subsectorScene(scene, { onSelectSystem }, readOnly = false) {
  const subsector = FAR_MERIDIAN_SUBSECTOR;
  let current;
  try { current = getSubsectorSystem(subsector, scene.currentId ?? scene.fromId); } catch { current = null; }
  if (!current) return [h('p', { class: 'scene-title', text: `${subsector.name} subsector. This campaign's location is not on it.` })];
  const selected = (scene.selectedId ?? scene.toId) ? getSubsectorSystem(subsector, scene.selectedId ?? scene.toId) : null;
  const reachable = new Map(getJumpDestinations(subsector, current.id, scene.jump).map((entry) => [entry.system.id, entry.distance]));
  const svg = renderSubsectorMap({
    subsector, columns: SUBSECTOR_COLUMNS, rows: SUBSECTOR_ROWS, current, selected, reachable,
    onSelect: scene.kind === 'subsector' ? (system) => onSelectSystem(system.id === current.id ? null : system.id) : null
  });
  svg.classList.add('map');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const inJump = scene.kind === 'jump';
  const captions = inJump ? [] : [worldCaption(current, { role: 'here', label: 'You are here' })];
  if (selected && selected.id !== current.id) {
    const distance = reachable.get(selected.id);
    const away = `${distance} parsec${distance === 1 ? '' : 's'} away`;
    captions.push(Number.isFinite(distance)
      ? worldCaption(selected, { role: 'there', label: inJump ? `Bound for, ${scene.days - scene.day} days out` : away, onChoose: inJump || readOnly ? null : () => {} })
      : h('div', { class: 'caption caption-there' }, h('p', { class: 'caption-role', text: 'Out of range' }),
        h('h2', { text: selected.name }), h('p', { class: 'caption-facts', text: `Beyond Jump-${scene.jump} from ${current.name}.` })));
  }
  const parts = [
    h('p', { class: 'scene-title', text: `${subsector.name} subsector` }),
    svg,
    h('div', { class: 'captions' }, captions)
  ];
  if (scene.kind === 'jump') {
    parts.push(h('div', { class: 'jump-clock', role: 'img', 'aria-label': `Day ${scene.day} of ${scene.days}` },
      Array.from({ length: scene.days }, (_, index) => h('span', { class: index < scene.day ? 'is-spent' : '' }))));
  }
  return parts;
}

// Book 1 p.29 (1977): lined paper, drawn across the whole scene. Same band
// close, next band short, 2-5 medium, 6-9 long, 10-14 very long, 15 escaped.
// The bands have no size in metres; they are steps of range. Ranges
// are read from the selected marker; its declared target gets a line.
function bandsScene(state, handlers) {
  const reader = state.fighters.find((fighter) => fighter.id === state.scene.selected) ?? state.fighters[0];
  const bands = ENCOUNTER_RANGE_LINE_ESCAPE_BANDS + 1;
  const rowH = 46;
  const width = 1000;
  const gutter = 130;
  const lane = width - gutter;
  const svg = createSvgNode('svg', { viewBox: `0 0 ${width} ${bands * rowH}`, class: 'bands', preserveAspectRatio: 'xMidYMid meet', role: 'group', 'aria-label': 'Range bands' });
  const spans = [];
  for (let band = 0; band < bands; band += 1) {
    const gap = Math.abs(band - reader.band);
    const name = gap >= ENCOUNTER_RANGE_LINE_ESCAPE_BANDS ? 'Out of range' : RANGE_NAMES[rangeBandForBandGap(gap)];
    const last = spans[spans.length - 1];
    if (last && last.name === name) last.to = band; else spans.push({ name, from: band, to: band });
    svg.append(createSvgNode('rect', { x: 0, y: band * rowH, width: lane, height: rowH, class: `band${gap === 0 ? ' is-own' : ''}` }));
    const number = createSvgNode('text', { x: 10, y: band * rowH + 17, class: 'band-number' });
    number.textContent = String(band + 1);
    svg.append(number);
  }
  for (const span of spans) {
    const top = span.from * rowH + 4;
    const bottom = (span.to + 1) * rowH - 4;
    svg.append(createSvgNode('line', { x1: lane + 12, y1: top, x2: lane + 12, y2: bottom, class: 'span-rule' }));
    const label = createSvgNode('text', { x: lane + 22, y: (top + bottom) / 2 + 5, class: 'span-label' });
    label.textContent = span.name;
    svg.append(label);
  }
  const at = new Map();
  const perBand = new Map();
  for (const fighter of state.fighters) {
    const index = perBand.get(fighter.band) ?? 0;
    perBand.set(fighter.band, index + 1);
    // Markers in contact (tactical grid fights) are drawn touching.
    const partner = state.fighters.find((other) => at.has(other.id) && other.band === fighter.band && inContact(fighter, other));
    at.set(fighter.id, partner ? { cx: at.get(partner.id).cx + 30, cy: at.get(partner.id).cy, tucked: true } : { cx: 80 + index * 230, cy: fighter.band * rowH + rowH / 2 });
  }
  const order = orderOf(reader, state);
  if (order?.targetId && at.has(order.targetId) && !isDown(reader)) {
    const from = at.get(reader.id);
    const to = at.get(order.targetId);
    svg.append(createSvgNode('line', { x1: from.cx, y1: from.cy, x2: to.cx, y2: to.cy, class: 'target-line' }));
  }
  for (const fighter of state.fighters) {
    const { cx, cy } = at.get(fighter.id);
    const down = isDown(fighter);
    const group = createSvgNode('g', {
      class: `marker is-${fighter.side}${down ? ' is-down' : ''}${fighter === reader ? ' is-selected' : ''}`,
      role: 'button', tabindex: '0', 'aria-label': `${fighter.name}, band ${fighter.band + 1}`
    });
    group.append(createSvgNode('circle', { cx, cy, r: 14 }));
    const initial = createSvgNode('text', { x: cx, y: cy + 5, class: 'marker-initial', 'text-anchor': 'middle' });
    initial.textContent = shortName(fighter);
    const name = createSvgNode('text', { x: cx + 24, y: cy + 6, class: 'marker-name' });
    name.textContent = down ? `${fighter.name} (down)` : fighter.name;
    group.append(initial, name);
    group.addEventListener('click', () => handlers.onSelectMarker(fighter.id));
    group.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handlers.onSelectMarker(fighter.id); } });
    svg.append(group);
  }
  return [
    h('p', { class: 'scene-title', text: `Ranges read from ${reader.name}. One band a round, two at a run; fifteen bands from the nearest enemy is off the field.` }),
    svg
  ];
}

function plotScene(state) {
  const svg = createSvgNode('svg', { viewBox: '0 0 900 620', class: 'plot', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Vector plot: Marisol and a corsair near Orison' });
  svg.append(createSvgNode('circle', { cx: 960, cy: 700, r: 330, class: 'plot-world' }));
  const worldLabel = createSvgNode('text', { x: 720, y: 560, class: 'plot-label' });
  worldLabel.textContent = 'Orison';
  svg.append(worldLabel);
  const ships = [
    { name: 'Marisol', x: 300, y: 380, vx: 110, vy: -60, side: 'party' },
    { name: 'Corsair', x: 560, y: 170, vx: -70, vy: 50, side: 'foe' }
  ];
  svg.append(createSvgNode('line', { x1: 300, y1: 380, x2: 560, y2: 170, class: 'plot-range' }));
  const range = createSvgNode('text', { x: 440, y: 262, class: 'plot-label' });
  range.textContent = '33,000 miles';
  svg.append(range);
  for (const ship of ships) {
    svg.append(createSvgNode('line', { x1: ship.x, y1: ship.y, x2: ship.x + ship.vx, y2: ship.y + ship.vy, class: `plot-vector is-${ship.side}` }));
    svg.append(createSvgNode('circle', { cx: ship.x + ship.vx, cy: ship.y + ship.vy, r: 4, class: `plot-future is-${ship.side}` }));
    svg.append(createSvgNode('path', { d: `M ${ship.x} ${ship.y - 11} L ${ship.x + 9} ${ship.y + 9} L ${ship.x - 9} ${ship.y + 9} Z`, class: `plot-ship is-${ship.side}` }));
    const label = createSvgNode('text', { x: ship.x + 16, y: ship.y + 5, class: 'plot-name' });
    label.textContent = ship.name;
    svg.append(label);
  }
  const turn = state.turn;
  return [
    h('ol', { class: 'phases', 'aria-label': `Turn order. ${turn.side} is acting.` }, turn.phases.map((phase, index) =>
      h('li', { class: index === turn.current ? 'is-current' : index < turn.current ? 'is-spent' : '', text: phase }))),
    svg,
    h('p', { class: 'scene-foot', text: 'One inch is 1,000 miles. Each arrow is where the ship will be next turn.' })
  ];
}

export function renderScene(state, handlers) {
  const scene = state.scene;
  if (scene.kind === 'bands') return bandsScene(state, handlers);
  if (scene.kind === 'plot') return plotScene(state);
  return subsectorScene(scene, handlers, Boolean(state.live));
}

// ----------------------------------------------------------------- drawers

function gauge(label, { now, full, note }, unit, { inverse = false } = {}) {
  const ratio = full ? now / full : 0;
  return h('div', { class: 'gauge' },
    h('div', { class: 'gauge-head' }, h('span', { text: label }), h('b', { text: `${now} of ${full}${unit}` })),
    h('div', { class: `gauge-bar${!inverse && ratio < 0.5 ? ' is-low' : ''}` }, h('span', { style: `width:${Math.round(ratio * 100)}%` })),
    note ? h('p', { text: note }) : null);
}

// What the character carries, and what it costs them (Book 1 p.32). Carried
// items count toward load; items put down stay listed so they can be picked
// up again. Read-only when the page cannot change the campaign.
function inventorySection(c, state, handlers) {
  if (!c.load) return c.carrying ? [h('h3', { text: 'Carried' }), h('dl', { class: 'pairs' }, h('dt', { text: 'Load' }), h('dd', { text: c.carrying }))] : null;
  const act = state.live && handlers.onInventory ? (command, item) => handlers.onInventory(command, c.id, item) : null;
  const rows = c.inventory.map((item) => h('li', { class: `inv${item.carried ? '' : ' is-down'}` },
    h('label', { class: 'inv-name' },
      h('input', { type: 'checkbox', checked: item.carried, disabled: !act, title: item.carried ? 'Carried. Untick to put it down.' : 'Put down. Tick to carry it.', onchange: act ? () => act(`inventory:toggle:${item.id}`) : null }),
      h('span', { text: item.quantity > 1 ? `${item.name} \u00d7${item.quantity}` : item.name })),
    h('span', { class: 'inv-weight', text: item.weight }),
    act ? h('button', { type: 'button', class: 'inv-remove', 'aria-label': `Remove ${item.name}`, title: 'Remove from the inventory', text: '\u00d7', onclick: () => act(`inventory:remove:${item.id}`) }) : null));
  const form = act ? h('form', { class: 'inv-add', onsubmit: (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get('weapon')) act('inventory:add', { weaponKey: data.get('weapon') });
    else act('inventory:add', { name: data.get('name'), weightKg: data.get('kg'), quantity: data.get('qty') });
  } },
    h('select', { name: 'weapon', 'aria-label': 'Add a weapon from Book 1', onchange: (event) => { for (const field of event.currentTarget.form.querySelectorAll('.inv-custom')) field.disabled = Boolean(event.currentTarget.value); } },
      h('option', { value: '', text: 'Something else\u2026' }),
      (state.weaponCatalog ?? []).map((weapon) => h('option', { value: weapon.key, text: `${weapon.name}, ${(weapon.grams / 1000).toFixed(2).replace(/\.?0+$/, '')} kg` }))),
    h('input', { class: 'inv-custom', name: 'name', type: 'text', placeholder: 'Item', 'aria-label': 'Item name' }),
    h('input', { class: 'inv-custom inv-num', name: 'kg', type: 'number', min: '0', step: '0.05', placeholder: 'kg', 'aria-label': 'Weight in kilograms, each' }),
    h('input', { class: 'inv-custom inv-num', name: 'qty', type: 'number', min: '1', step: '1', value: '1', 'aria-label': 'Quantity' }),
    h('button', { type: 'submit', class: 'button is-small', text: 'Add' })) : null;
  return [
    h('h3', { text: 'Carried' }),
    h('div', { class: `load is-${c.load.state}` },
      h('div', { class: 'gauge-head' }, h('span', { text: 'Load' }), h('b', { text: c.load.text })),
      h('p', { class: 'load-words', text: c.load.words }),
      h('p', { class: 'load-limits', text: c.load.limits })),
    c.inventory.length ? h('ul', { class: 'inv-list' }, rows) : h('p', { class: 'empty', text: 'Nothing listed. Clothing, worn armor, holsters and belts never count.' }),
    form,
    act ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: c.load.military, onchange: (event) => act(`inventory:military:${event.currentTarget.checked ? 'on' : 'off'}`) }), ' Part of a military force: may carry triple, at two less') : null
  ];
}

function characterDrawer(c, state, handlers) {
  const live = Boolean(state.live);
  return [
    state.party?.length > 1 ? h('div', { class: 'tabs', role: 'tablist' }, state.party.map((member) => h('button', { type: 'button', role: 'tab', 'aria-selected': member.id === c.id, text: member.name, onclick: () => handlers.onPickCharacter(member.id) }))) : null,
    h('header', { class: 'drawer-head' }, h('h2', { text: c.name }), h('p', {}, h('span', { class: 'code', text: c.upp }), ` ${c.service}`)),
    h('div', { class: 'stats' }, c.characteristics.map((entry) =>
      h('div', { class: `stat${entry.now < entry.full ? ' is-hurt' : ''}` },
        h('span', { text: entry.key }), h('b', { text: entry.now < entry.full ? `${entry.now}/${entry.full}` : String(entry.now) })))),
    h('p', { class: `status${c.hurt ? ' is-hurt' : ''}`, text: c.blows ? `${c.status}. ${c.blows}.` : `${c.status}.` }),
    h('h3', { text: 'Skills' }),
    h('div', { class: 'skills' }, c.skills.length ? c.skills.map((skill) => (live ? h('span', { class: 'skill', text: skill }) : h('button', { type: 'button', class: 'button is-small', title: `Throw 2D with ${skill}`, text: skill }))) : h('span', { class: 'empty', text: 'None' })),
    h('h3', { text: 'In hand and worn' }),
    h('dl', { class: 'pairs' },
      c.weapons.flatMap((weapon) => [h('dt', { text: weapon.name }), h('dd', { text: weapon.note || ' ' })]),
      h('dt', { text: 'Armor' }), h('dd', { text: c.armor }),
      h('dt', { text: 'Cash' }), h('dd', { text: cr(c.cashCr) })),
    inventorySection(c, state, handlers),
    live ? null : h('button', { type: 'button', class: 'button', text: 'Open the full personnel record' })
  ];
}

function shipDrawer(s, state) {
  const live = Boolean(state.live);
  return [
    h('header', { class: 'drawer-head' }, h('h2', { text: s.name }), h('p', { text: `${s.kind}, ${s.registry}` })),
    h('dl', { class: 'pairs' }, h('dt', { text: 'Ship’s account' }), h('dd', { text: cr(s.accountCr) }), h('dt', { text: 'Upkeep' }), h('dd', { text: s.upkeep })),
    gauge('Fuel', s.fuel, ' t'),
    gauge('Hold', s.hold, ' t', { inverse: true }),
    gauge('Staterooms', s.berths, '', { inverse: true }),
    h('h3', { text: 'Crew' }),
    h('dl', { class: 'pairs' }, s.crew.flatMap((member) => [h('dt', { text: member.name }), h('dd', { text: member.roles })])),
    h('h3', { text: 'Armament' }),
    h('p', { text: s.armament }),
    s.damage ? [h('h3', { text: 'Damage' }), h('p', { class: 'status is-hurt', text: s.damage })] : null,
    live ? null : h('button', { type: 'button', class: 'button', text: 'Fit armament' })
  ];
}

function refereeDrawer(referee, state) {
  const live = Boolean(state.live);
  return [
    h('header', { class: 'drawer-head' }, h('h2', { text: 'Referee' }), h('p', { text: 'Drag an actor onto the scene to place it.' })),
    h('div', { class: 'tabs', role: 'tablist' }, referee.tabs.map((tab, index) => h('button', { type: 'button', role: 'tab', 'aria-selected': index === 0, text: tab }))),
    h('input', { type: 'search', class: 'search', placeholder: 'Find an actor', 'aria-label': 'Find an actor' }),
    referee.groups.map((group) => h('section', { class: 'folder' },
      h('h3', { text: `${group.label} (${group.rows.length})` }),
      group.rows.length
        ? h('ul', {}, group.rows.map(([name, note]) => h('li', { draggable: 'true' }, h('span', { text: name }), h('span', { text: note }))))
        : h('p', { class: 'empty', text: 'Nothing here yet.' }))),
    live ? null : h('div', { class: 'lead-actions' }, h('button', { type: 'button', class: 'button', text: 'Create an actor' }), h('button', { type: 'button', class: 'button', text: 'Roll an NPC' }))
  ];
}

export function renderDrawer(kind, state, referee, handlers = {}) {
  const tidy = (parts) => parts.flat(Infinity).filter(Boolean);
  if (kind === 'character' && state.character) return tidy(characterDrawer(state.character, state, handlers));
  if (kind === 'ship' && state.ship) return tidy(shipDrawer(state.ship, state));
  if (kind === 'referee') return tidy(refereeDrawer(referee, state));
  return [];
}

// -------------------------------------------------------------------- talk

export function renderTalkLog(chat) {
  return chat.map((line) => h('p', { class: line.roll ? 'is-roll' : '' }, h('b', { text: `${line.who} ` }), line.text));
}
