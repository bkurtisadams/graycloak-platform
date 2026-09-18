// play-views.js — draws the play page from a view state (see play-sample.js).
//
// Rules for this file, so the page stays what was approved:
//   1. It imports nothing from app.js, ui-model.js or styles.css. The only
//      shared modules are pure ones: the subsector SVG, the world data, the
//      rules package, and the encounter document's band arithmetic.
//   2. Every function takes state and returns DOM. No module-level state.
//   3. A situation adds a scene and a lead card. It never adds a panel.

import { renderSubsectorMap, createSvgNode } from './subsector-svg.js?v=v0.204.0';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js?v=v0.204.0';
import { rangeBandForBandGap, ENCOUNTER_RANGE_LINE_ESCAPE_BANDS } from '../src/encounter-document.js?v=v0.204.0';
import {
  SUBSECTOR_COLUMNS, SUBSECTOR_ROWS, getJumpDestinations, getSubsectorSystem, parseUniversalWorldProfile,
  describeStarport, describeAtmosphere, describeHydrographics, describePopulation, describeLawLevel,
  previewPersonalAttack, getPersonalWeapon, blowsRemaining
} from '../vendor/classic-traveller-rules/index.js?v=v0.204.0';

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
  for (const child of children.flat()) {
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

function declareForm(d, state, handlers) {
  const actor = state.fighters.find((fighter) => fighter.id === d.actorId);
  const foes = state.fighters.filter((fighter) => fighter.side !== actor.side && !fighter.down);
  const target = foes.find((fighter) => fighter.id === d.targetId) ?? foes[0];
  const weaponKey = d.weaponKey ?? actor.weaponKey;
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Movement' },
    d.moves.map((move) => h('button', { type: 'button', class: 'seg-option', 'aria-pressed': move === d.move, text: move,
      onclick: (event) => { for (const b of event.currentTarget.parentNode.children) b.setAttribute('aria-pressed', String(b === event.currentTarget)); } })));
  const weaponSelect = h('select', { onchange: (event) => handlers.onPickWeapon(event.target.value) },
    actor.weapons.map((key) => h('option', { value: key, selected: key === weaponKey, text: getPersonalWeapon(key).name })));
  const targetSelect = h('select', { onchange: (event) => handlers.onPickTarget(event.target.value) },
    foes.map((foe) => h('option', { value: foe.id, selected: foe.id === target?.id, text: `${foe.name}, ${rangeBetween(actor, foe).name.toLowerCase()}` })));
  const line = target ? hitLine(actor, target, weaponKey) : null;
  return h('div', { class: 'declare' },
    seg,
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: d.running }), ' At a run (spends a blow, no attack)'),
    h('div', { class: 'field-pair' },
      h('label', { class: 'field' }, h('span', { class: 'field-label', text: 'Attack with' }), weaponSelect),
      h('label', { class: 'field' }, h('span', { class: 'field-label', text: 'At' }), targetSelect)),
    line ? h('p', { class: 'need' }, h('b', { text: /^\d/.test(line.text) ? `Needs ${line.text}` : line.text[0].toUpperCase() + line.text.slice(1) }),
      line.preview?.canAttack ? ` for ${woundText(line.preview)} wounds` : '') : null,
    line?.preview?.canAttack ? h('p', { class: 'odds', text: dmBreakdown(line.preview) }) : null);
}

function leadCard(next, state, handlers) {
  if (!next) return h('section', { class: 'lead' }, h('h2', { text: 'Nothing pending' }), h('p', { text: 'The port call is complete. Depart when you are ready.' }));
  return h('section', { class: 'lead', 'aria-label': 'Do this next' },
    h('h2', { text: next.title }),
    next.copy ? h('p', { text: next.copy }) : null,
    next.declare ? declareForm(next.declare, state, handlers) : null,
    next.actions?.length ? h('div', { class: 'lead-actions' }, next.actions.map((action) =>
      h('button', { type: 'button', class: action.primary ? 'button is-primary' : 'button' },
        h('span', { text: action.label }), action.note ? h('small', { text: action.note }) : null))) : null,
    next.cite ? h('p', { class: 'cite', text: next.cite }) : null);
}

function stepRow(step) {
  const row = h('li', { class: `step is-${step.state}` });
  const head = h('button', { type: 'button', class: 'step-head', 'aria-expanded': 'false',
    onclick: () => { const open = row.classList.toggle('is-open'); head.setAttribute('aria-expanded', String(open)); } },
    h('span', { class: 'step-mark', 'aria-hidden': 'true' }),
    h('span', { class: 'step-title', text: step.title }),
    h('span', { class: 'step-figure', text: step.figure }));
  row.append(head);
  if (step.verb) row.append(h('button', { type: 'button', class: 'button is-small', text: step.verb }));
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
  const parts = [
    h('header', { class: 'now-head' },
      h('h1', { text: state.situation.title }),
      h('p', { text: state.situation.detail }))
  ];
  if (state.jobs?.length && ['port', 'jump'].includes(state.situation.kind)) parts.push(h('ul', { class: 'jobs', 'aria-label': 'Accepted jobs' }, state.jobs.map(jobRow)));
  if (state.lastRound?.length) {
    parts.push(h('section', { class: 'last-round' }, h('h3', { text: 'Last round' }), state.lastRound.map((line) => h('p', { text: line }))));
  }
  parts.push(leadCard(state.next, state, handlers));
  if (state.hold) parts.push(h('p', { class: 'hold-note', text: state.hold }));
  if (state.roster?.length) parts.push(h('ul', { class: 'roster', 'aria-label': 'Who is fighting' }, state.roster.map(rosterRow)));
  const open = (state.steps ?? []).filter((step) => step.state !== 'done');
  const finished = [...(state.done ?? []), ...(state.steps ?? []).filter((step) => step.state === 'done').map((step) => `${step.title}, ${step.figure}`)];
  if (open.length) parts.push(h('ul', { class: 'steps', 'aria-label': 'Also possible now' }, open.map(stepRow)));
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

function subsectorScene(scene, { onSelectSystem }) {
  const subsector = FAR_MERIDIAN_SUBSECTOR;
  const current = getSubsectorSystem(subsector, scene.currentId ?? scene.fromId);
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
      ? worldCaption(selected, { role: 'there', label: inJump ? `Bound for, ${scene.days - scene.day} days out` : away, onChoose: inJump ? null : () => {} })
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

// Book 1 p.29: lined paper. Same band close, next band short, 2-5 medium,
// 6-9 long, 10-14 very long, 15 escaped. The line is one-dimensional, so it
// is drawn as a narrow strip and the room beside it goes to the fight cards:
// what each combatant is, and what it takes to hit or be hit by them.
function initials(name) {
  return name.replace(/[^A-Z0-9]/g, '').slice(0, 2) || name[0];
}

function bandStrip(state, reader, handlers) {
  const bands = ENCOUNTER_RANGE_LINE_ESCAPE_BANDS + 1;
  const rowH = 40;
  const width = 300;
  const lane = 176;
  const svg = createSvgNode('svg', { viewBox: `0 0 ${width} ${bands * rowH}`, class: 'bands', preserveAspectRatio: 'xMidYMin meet', role: 'group', 'aria-label': 'Range bands' });
  const spans = [];
  for (let band = 0; band < bands; band += 1) {
    const gap = Math.abs(band - reader.band);
    const name = gap >= ENCOUNTER_RANGE_LINE_ESCAPE_BANDS ? 'Out' : RANGE_NAMES[rangeBandForBandGap(gap)];
    const last = spans[spans.length - 1];
    if (last && last.name === name) last.to = band; else spans.push({ name, from: band, to: band });
    svg.append(createSvgNode('rect', { x: 0, y: band * rowH, width: lane, height: rowH, class: `band${gap === 0 ? ' is-own' : ''}` }));
    const number = createSvgNode('text', { x: 8, y: band * rowH + 15, class: 'band-number' });
    number.textContent = String(band + 1);
    svg.append(number);
  }
  for (const span of spans) {
    const top = span.from * rowH + 4;
    const bottom = (span.to + 1) * rowH - 4;
    svg.append(createSvgNode('line', { x1: lane + 10, y1: top, x2: lane + 10, y2: bottom, class: 'span-rule' }));
    const label = createSvgNode('text', { x: lane + 20, y: (top + bottom) / 2 + 5, class: 'span-label' });
    label.textContent = span.name;
    svg.append(label);
  }
  const perBand = new Map();
  for (const fighter of state.fighters) {
    const index = perBand.get(fighter.band) ?? 0;
    perBand.set(fighter.band, index + 1);
    const cx = 50 + index * 36;
    const cy = fighter.band * rowH + rowH / 2;
    const group = createSvgNode('g', {
      class: `marker is-${fighter.side}${fighter.down ? ' is-down' : ''}${fighter === reader ? ' is-selected' : ''}`,
      role: 'button', tabindex: '0', 'aria-label': `${fighter.name}, band ${fighter.band + 1}`
    });
    const title = createSvgNode('title');
    title.textContent = fighter.name;
    group.append(title, createSvgNode('circle', { cx, cy, r: 14 }));
    const initial = createSvgNode('text', { x: cx, y: cy + 4, class: 'marker-initial', 'text-anchor': 'middle' });
    initial.textContent = initials(fighter.name);
    group.append(initial);
    group.addEventListener('click', () => handlers.onSelectMarker(fighter.id));
    group.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handlers.onSelectMarker(fighter.id); } });
    svg.append(group);
  }
  return svg;
}

function condition(fighter) {
  const zeros = ['STR', 'DEX', 'END'].filter((key) => fighter.characteristics[key] <= 0).length;
  if (zeros === 3) return 'Dead';
  if (zeros === 2) return 'Out, seriously wounded';
  if (zeros === 1) return 'Unconscious';
  return ['STR', 'DEX', 'END'].some((key) => fighter.characteristics[key] < fighter.full[key]) ? 'Wounded' : 'Unwounded';
}

function fightCard(fighter, reader, state, handlers) {
  const isReader = fighter === reader;
  const weapon = getPersonalWeapon(fighter.weaponKey);
  const targetId = state.next?.declare?.targetId;
  const stats = h('div', { class: 'card-stats' }, ['STR', 'DEX', 'END'].map((key) => {
    const now = fighter.characteristics[key];
    const full = fighter.full[key];
    return h('span', { class: now < full ? 'is-hurt' : '' }, `${key} `, h('b', { text: now < full ? `${now}/${full}` : String(now) }));
  }));
  const facts = h('dl', { class: 'card-facts' },
    h('dt', { text: 'In hand' }), h('dd', { text: `${weapon.name}, ${woundText({ damageDice: weapon.damageDice, damageModifier: weapon.damageModifier ?? 0 })}` }),
    h('dt', { text: 'Armor' }), h('dd', { text: fighter.armor === 'none' ? 'None' : fighter.armor[0].toUpperCase() + fighter.armor.slice(1) }),
    weapon.melee ? [h('dt', { text: 'Blows left' }), h('dd', { text: `${blowsRemaining(fighter)} of ${fighter.blowAllowance}` })] : null,
    fighter.order ? [h('dt', { text: 'This round' }), h('dd', { text: fighter.order })] : null);
  const parts = [
    h('header', {},
      h('span', { class: 'card-badge', text: initials(fighter.name), 'aria-hidden': 'true' }),
      h('h3', { text: fighter.name }),
      h('span', { class: 'card-condition', text: condition(fighter) })),
    stats,
    facts
  ];
  if (!isReader && !fighter.down && fighter.side !== reader.side) {
    const out = hitLine(reader, fighter);
    const back = hitLine(fighter, reader);
    parts.push(h('div', { class: 'card-odds' },
      h('p', {}, h('span', { text: `${out.range.name}, ${out.range.gap} band${out.range.gap === 1 ? '' : 's'}` })),
      h('p', {}, h('span', { text: `${reader.name} hits on` }), h('b', { text: out.text })),
      h('p', {}, h('span', { text: `Hits ${reader.name} on` }), h('b', { text: back.text }))));
    if (reader.id === state.next?.declare?.actorId) {
      parts.push(h('button', { type: 'button', class: fighter.id === targetId ? 'button is-small is-chosen' : 'button is-small',
        'aria-pressed': fighter.id === targetId, text: fighter.id === targetId ? 'Target' : 'Make target', onclick: () => handlers.onPickTarget(fighter.id) }));
    }
  }
  return h('article', { class: `fight-card is-${fighter.side}${fighter.down ? ' is-down' : ''}${isReader ? ' is-reader' : ''}`,
    onclick: (event) => { if (!event.target.closest('button')) handlers.onSelectMarker(fighter.id); } }, parts);
}

function bandsScene(state, handlers) {
  const reader = state.fighters.find((fighter) => fighter.id === state.scene.selected) ?? state.fighters[0];
  const group = (label, side) => h('section', { class: 'card-group' },
    h('h2', { text: label }),
    h('div', { class: 'card-row' }, state.fighters.filter((fighter) => (fighter.side === 'party') === (side === 'party')).map((fighter) => fightCard(fighter, reader, state, handlers))));
  return [
    h('p', { class: 'scene-title', text: `Ranges and throws are read from ${reader.name}. Select a marker or a card to read from someone else.` }),
    h('div', { class: 'fight' },
      bandStrip(state, reader, handlers),
      h('div', { class: 'cards' }, group('Party', 'party'), group('Opposition', 'foe')))
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
  return subsectorScene(scene, handlers);
}

// ----------------------------------------------------------------- drawers

function gauge(label, { now, full, note }, unit, { inverse = false } = {}) {
  const ratio = full ? now / full : 0;
  return h('div', { class: 'gauge' },
    h('div', { class: 'gauge-head' }, h('span', { text: label }), h('b', { text: `${now} of ${full}${unit}` })),
    h('div', { class: `gauge-bar${!inverse && ratio < 0.5 ? ' is-low' : ''}` }, h('span', { style: `width:${Math.round(ratio * 100)}%` })),
    note ? h('p', { text: note }) : null);
}

function characterDrawer(c) {
  return [
    h('header', { class: 'drawer-head' }, h('h2', { text: c.name }), h('p', {}, h('span', { class: 'code', text: c.upp }), ` ${c.service}`)),
    h('div', { class: 'stats' }, c.characteristics.map((entry) =>
      h('div', { class: `stat${entry.now < entry.full ? ' is-hurt' : ''}` },
        h('span', { text: entry.key }), h('b', { text: entry.now < entry.full ? `${entry.now}/${entry.full}` : String(entry.now) })))),
    h('p', { class: `status${c.hurt ? ' is-hurt' : ''}`, text: `${c.status}. ${c.blows}.` }),
    h('h3', { text: 'Skills' }),
    h('div', { class: 'skills' }, c.skills.map((skill) => h('button', { type: 'button', class: 'button is-small', title: `Throw 2D with ${skill}`, text: skill }))),
    h('h3', { text: 'Carried' }),
    h('dl', { class: 'pairs' },
      c.weapons.flatMap((weapon) => [h('dt', { text: weapon.name }), h('dd', { text: weapon.note || ' ' })]),
      h('dt', { text: 'Armor' }), h('dd', { text: c.armor }),
      h('dt', { text: 'Load' }), h('dd', { text: c.carrying }),
      h('dt', { text: 'Cash' }), h('dd', { text: cr(c.cashCr) })),
    h('button', { type: 'button', class: 'button', text: 'Open the full personnel record' })
  ];
}

function shipDrawer(s) {
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
    h('button', { type: 'button', class: 'button', text: 'Fit armament' })
  ];
}

function refereeDrawer(referee) {
  return [
    h('header', { class: 'drawer-head' }, h('h2', { text: 'Referee' }), h('p', { text: 'Drag an actor onto the scene to place it.' })),
    h('div', { class: 'tabs', role: 'tablist' }, referee.tabs.map((tab, index) => h('button', { type: 'button', role: 'tab', 'aria-selected': index === 0, text: tab }))),
    h('input', { type: 'search', class: 'search', placeholder: 'Find an actor', 'aria-label': 'Find an actor' }),
    referee.groups.map((group) => h('section', { class: 'folder' },
      h('h3', { text: `${group.label} (${group.rows.length})` }),
      group.rows.length
        ? h('ul', {}, group.rows.map(([name, note]) => h('li', { draggable: 'true' }, h('span', { text: name }), h('span', { text: note }))))
        : h('p', { class: 'empty', text: 'Nothing here yet.' }))),
    h('div', { class: 'lead-actions' }, h('button', { type: 'button', class: 'button', text: 'Create an actor' }), h('button', { type: 'button', class: 'button', text: 'Roll an NPC' }))
  ];
}

export function renderDrawer(kind, state, referee) {
  if (kind === 'character') return characterDrawer(state.character).flat();
  if (kind === 'ship') return shipDrawer(state.ship).flat();
  if (kind === 'referee') return refereeDrawer(referee).flat();
  return [];
}

// -------------------------------------------------------------------- talk

export function renderTalkLog(chat) {
  return chat.map((line) => h('p', { class: line.roll ? 'is-roll' : '' }, h('b', { text: `${line.who} ` }), line.text));
}
