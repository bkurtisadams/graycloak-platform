// play-views.js — draws the play page from a view state (see play-sample.js).
//
// Rules for this file, so the page stays what was approved:
//   1. It imports nothing from app.js, ui-model.js or styles.css. The only
//      shared modules are pure ones: the subsector SVG, the world data, the
//      rules package, and the encounter document's band arithmetic.
//   2. Every function takes state and returns DOM. No module-level state.
//   3. A situation adds a scene and a lead card. It never adds a panel.

import { renderSubsectorMap, createSvgNode } from './subsector-svg.js?v=v0.317.2';
import { renderReactionPanel } from './reaction-panel.js?v=v0.317.2';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js?v=v0.317.2';
import { rangeBandForBandGap, ENCOUNTER_RANGE_LINE_ESCAPE_BANDS } from '../src/encounter-document.js?v=v0.317.2';
import {
  SUBSECTOR_COLUMNS, SUBSECTOR_ROWS, getJumpDestinations, getSubsectorSystem, parseUniversalWorldProfile, laneBetween,
  describeStarport, describeAtmosphere, describeHydrographics, describePopulation, describeLawLevel,
  describeWorldSize, describeGovernment, describeTradeClassifications,
  previewPersonalAttack, getPersonalWeapon, blowsRemaining
} from '../vendor/classic-traveller-rules/index.js?v=v0.317.2';
import { renderVectorFight, renderPhaseTrack, renderDataCards } from './vector-fight-view.js?v=v0.317.2';
import { kindButton, kindIcon } from './kind-button.js?v=v0.317.2';
import { renderSectionStrip } from './section-strip.js?v=v0.317.2';
export { renderSectionStrip };
import { actorBadge, shipBadge } from './sheets.js?v=v0.317.2';
import { woundPromptFrom, initialWoundDraft, previewWoundDraft, renderWoundGroups, renderWoundPreview } from './wound-dialog.js?v=v0.317.2';
// v0.245.0: the original working staging board (client/ship-vector-map.js,
// built v0.161-v0.198 for the old referee client) rather than a reimple-
// mentation. Drag a ship to place it, drag its velocity arrow to set its
// starting vector, place and drag a world, zoom, pan, minimap — all already
// built and tested (test/ship-vector-map.test.mjs), including the drag-
// previews-locally-commits-on-release fix that this page's own rebuild-
// everything render would otherwise break.
//
// It is the one module this file reaches that keeps state of its own (zoom,
// pan, drag-in-progress), against rule 2 at the top of this file. That is a
// deliberate, documented carve-out, not an oversight: the state is purely
// presentational (no game state — every write goes out through the callbacks
// below to play-session.js commands), and it is precisely what lets a drag
// survive the re-render. See the same note in ship-vector-map.js.
import { renderVectorSceneStage } from './ship-vector-map.js?v=v0.317.2';

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

// v0.229.0: a directory entry's small preview — currently only the Scenes tab
// sets entry.thumbnail, and it is always a plain SVG string (colour and a
// grid, the same token colours the combat board uses; never a photo — see
// the scene-document.js thumbnail comment). h() has no markup attribute, so
// this is the one place in the file that sets innerHTML.
function entryThumb(markup) {
  const wrap = document.createElement('span');
  wrap.className = 'entry-thumb';
  wrap.innerHTML = markup;
  return wrap;
}

// ---------------------------------------------------------------- masthead

export function renderMastChips(state, { openDrawer, drawer, openSheet = null, openSheets = [] }) {
  const chips = [];
  const c = state.character;
  if (c) {
    chips.push(h('button', { class: `chip${c.hurt ? ' is-hurt' : ''}`, type: 'button', 'aria-pressed': drawer === 'character', onclick: () => openDrawer('character') },
      h('span', { class: 'chip-name', text: c.name || '(unnamed)' }),
      h('span', { class: 'chip-line' }, h('span', { class: 'code', text: c.upp }), ` ${c.hurt ? c.status : cr(c.cashCr)}`)));
  }
  const s = state.ship;
  if (s) {
    // v0.317.0: the ship chip opens the ship's sheet — the one place for the
    // ship, as the Vehicles tab does — not a second, different panel.
    const open = openSheets.some((entry) => entry.kind === 'ship' && entry.id === s.id);
    chips.push(h('button', { class: `chip${s.damage ? ' is-hurt' : ''}`, type: 'button', 'aria-pressed': open, onclick: () => (openSheet ? openSheet('ship', s.id) : openDrawer('ship')) },
      h('span', { class: 'chip-name', text: s.name }),
      h('span', { class: 'chip-line', text: `Fuel ${s.fuel.now}/${s.fuel.full}  Hold ${s.hold.full - s.hold.now} t free` })));
  }
  // v0.226.0: Combat belongs beside the character and the ship, not buried at
  // the foot of the port column. A running fight already owns the screen, so
  // the chip reports the round; with none, it opens the drawer that starts one.
  if (state.seat === 'referee') {
    const fighting = (Boolean(state.fighters?.length) && !state.setupPhase) || Boolean(state.shipFight);
    // v0.305.0: an open board in setup said "No fight" while it had the screen.
    const settingUp = Boolean(state.setupPhase);
    chips.push(h('button', {
      class: `chip${fighting ? ' is-hurt' : ''}`, type: 'button', 'aria-pressed': drawer === 'combat',
      title: fighting ? 'A fight is running; it has the screen' : 'Put the party on the board against someone',
      // v0.254.0: Combat opens the band board, empty and in setup, rather
      // than a form. A fight already running just has the screen.
      onclick: () => (fighting ? null : openDrawer('combat-board'))
    },
    h('span', { class: 'chip-name', text: 'Combat' }),
    h('span', { class: 'chip-line', text: fighting ? state.situation.title.replace('Fight, ', '').replace('Ship fight, ', 'Ship, ') : settingUp ? 'Board open, setting up' : 'No fight' })));
    // v0.253.0: no Referee chip. Its directories are the sidebar's tabs,
    // always on screen, so a chip that opened them has nothing to open.
  }
  // v0.316.1: the Shipyard beside the ship (Kurt, Sep 2026: at the foot of
  // the port column it went unseen). In port it always shows, and says why
  // there is none at a class C, D, E or X port.
  if (state.shipyardAt !== undefined && state.situation?.kind === 'port') {
    const yard = state.shipyard;
    const line = yard
      ? [`class ${yard.starport}`, yard.hardpoints.empty ? `${yard.hardpoints.empty} empty hardpoint${yard.hardpoints.empty === 1 ? '' : 's'}` : null].filter(Boolean).join(' \u00b7 ')
      : `none at a class ${state.shipyardAt ?? '?'} port`;
    const attention = yard?.attention ?? [];
    chips.push(h('button', { class: `chip${attention.length ? ' is-owed' : ''}`, type: 'button', 'aria-pressed': drawer === 'shipyard', disabled: !yard,
      title: yard ? (attention.length ? `The shipyard can put right: ${attention.join('; ')}` : 'Turrets, weapons and software (Book 2 pp.12, 15-16)') : 'Turrets, weapons and software are fitted at class A or B starports',
      onclick: yard ? () => openDrawer('shipyard') : null },
    h('span', { class: 'chip-name' }, attention.length ? kindIcon('owed') : null, ' Shipyard'),
    h('span', { class: 'chip-line', text: attention.length ? `${line} \u00b7 needs attention` : line })));
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
  return { text: need <= 2 ? 'cannot miss' : need > 12 ? `${need}+` : `${need}+`, preview, range };
}

function woundText(preview) {
  // v0.302.0: an animal's wound is a number fixed when it was generated.
  if (preview.fixedWound !== null && preview.fixedWound !== undefined) return `${preview.fixedWound} (fixed)`;
  const modifier = preview.damageModifier ? (preview.damageModifier > 0 ? `+${preview.damageModifier}` : `\u2212${Math.abs(preview.damageModifier)}`) : '';
  return `${preview.damageDice}D${modifier}`;
}

// The throw as a sum: 8+ base, then each DM that is not zero, then the result.
function dmSum(preview) {
  const parts = [];
  const add = (label, value) => { if (value) parts.push(`${value > 0 ? '+' : '\u2212'}${Math.abs(value)} ${label}`); };
  // The weapon matrix and the range matrix arrive combined in `target`.
  add(`${preview.weaponName} vs ${preview.armor === 'none' ? 'no armor' : preview.armor} at ${preview.range.replace('-', ' ')} range`, 8 - preview.target);
  add('expertise', preview.skillDM);
  add('characteristic', preview.characteristicDM);
  add('untrained', preview.untrainedDM);
  add('their parry', preview.parryDM);
  add('their evasion', preview.evasionDM);
  add('they are untrained', preview.defenderUntrainedDM);
  add('weakened blow', preview.fatigueDM);
  add('its weapon', preview.weaponDM);
  add('their armor', preview.armorDM);
  add('situation', preview.situationalDM);
  // 2D cannot roll under 2, so a required throw at or below 2 is a certainty
  // and printing it ("-1+") is meaningless.
  const need = preview.requiredRoll <= 2 ? 'hits on any throw' : `${preview.requiredRoll}+`;
  return `8+ base ${parts.length ? parts.join(', ') : 'with no modifiers'} \u2192 ${need}`;
}

function dmBreakdown(preview) {
  const parts = [`${preview.weaponName} against ${preview.armor === 'none' ? 'no armor' : preview.armor} at ${RANGE_NAMES[preview.range].toLowerCase()} range is ${preview.target}+`];
  const dms = [['expertise', preview.skillDM], ['characteristic', preview.characteristicDM], ['untrained', preview.untrainedDM],
    ['parry', preview.parryDM], ['evasion', preview.evasionDM], ['untrained defender', preview.defenderUntrainedDM], ['weakened blow', preview.fatigueDM]];
  for (const [label, value] of dms) if (value) parts.push(`${label} ${value > 0 ? '+' : '\u2212'}${Math.abs(value)}`);
  return `${parts.join(', ')}.`;
}

function isDown(fighter) {
  if (fighter.animal) return Boolean(fighter.down);
  return fighter.down || ['STR', 'DEX', 'END'].some((key) => fighter.characteristics[key] <= 0);
}

// v0.302.0: an animal has a hits track (The Traveller Book p.92), not
// characteristics.
function animalCondition(animal) {
  if (animal.destroyed) return 'Destroyed';
  if (animal.woundsTaken >= animal.hits.dead) return 'Dead';
  if (animal.woundsTaken >= animal.hits.unconscious) return 'Unconscious';
  return animal.woundsTaken > 0 ? 'Wounded' : 'Unwounded';
}

function statCells(fighter) {
  if (fighter.animal) {
    const a = fighter.animal;
    return [h('span', { class: a.woundsTaken > 0 ? 'is-hurt' : '', title: `Hits taken; unconscious at ${a.hits.unconscious}, dead at ${a.hits.dead}`, text: `${a.woundsTaken}/${a.hits.dead}` })];
  }
  return ['STR', 'DEX', 'END'].map((key, index) => [index ? '\u00b7' : '',
    h('span', { class: fighter.characteristics[key] < fighter.full[key] ? 'is-hurt' : '', text: String(fighter.characteristics[key]) })]);
}

function condition(fighter) {
  if (fighter.animal) return animalCondition(fighter.animal);
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
// v0.216.0: the tracker shows orders that have actually been GIVEN. It used
// to overlay the selected combatant's in-progress choice here, which made a
// combatant look declared while they were selected and undeclared as soon as
// selection moved on. The choice being built belongs in the panel above, not
// in the record of what has been declared.
function orderOf(fighter, state) {
  const d = state.live ? null : state.next?.declare;
  if (d && fighter.id === d.actorId) {
    const evading = d.move === 'Evade';
    const verb = getPersonalWeapon(d.weaponKey ?? fighter.weaponKey).melee ? 'swing' : 'fire';
    return { move: d.running ? `${d.move}, running` : d.move, attack: evading || d.running ? null : verb, targetId: evading || d.running ? null : d.targetId, weaponKey: d.weaponKey ?? fighter.weaponKey };
  }
  return fighter.order ?? null;
}

function orderText(fighter, state) {
  if (isDown(fighter)) return { Dead: 'dead', Destroyed: 'destroyed', 'Seriously wounded': 'serious wound', Unconscious: 'unconscious' }[condition(fighter)] ?? 'down';
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
  const beast = reader.animal;
  const beastWound = (key) => (beast.filter ? `${beast.filter.woundDice}D, filter` : beast.woundMode === 'rolled' ? 'rolled' : String(beast.weapons[key]?.wound ?? ''));
  const dice = beast ? beastWound(weaponKey) : woundText({ damageDice: weapon.damageDice, damageModifier: weapon.damageModifier ?? 0 });
  const label = (key) => {
    if (beast) return `${(reader.weaponChoices ?? []).find((choice) => choice.key === key)?.name ?? key}  ${beastWound(key)}`;
    const spec = getPersonalWeapon(key); return `${spec.name}  ${woundText({ damageDice: spec.damageDice, damageModifier: spec.damageModifier ?? 0 })}`;
  };
  const left = blowsRemaining(reader);
  return h('div', { class: 'sel-gear' },
    h('label', { class: 'sel-stat is-gear' }, h('small', { text: 'In hand' }),
      declaring && reader.weapons.length > 1
        ? h('select', { class: 'gear-select', onchange: (event) => handlers.onPickWeapon(event.target.value) },
          reader.weapons.map((key) => h('option', { value: key, selected: key === weaponKey, text: label(key) })))
        : h('b', { text: beast ? label(weaponKey) : `${weapon.name}  ${dice}` })),
    h('span', { class: 'sel-stat is-gear' }, h('small', { text: 'Armor' }), h('b', { text: reader.armor === 'none' ? 'None' : `${reader.armor[0].toUpperCase()}${reader.armor.slice(1)}${reader.armorDM ? `+${reader.armorDM}` : ''}` })),
    reader.encumbrance ? h('span', { class: 'sel-stat is-hurt', title: `Book 1 p.33: carrying ${reader.encumbrance === -2 ? 'to three times strength, as part of a military force' : 'more than their strength in kilograms'}, ${reader.name} counts ${reader.encumbrance === -2 ? 'two' : 'one'} less on STR, DEX and END for all purposes\u2014including wounds and strength advantage.` },
      h('small', { text: 'Laden' }), h('b', { text: String(reader.encumbrance) })) : null,
    weapon.melee && !beast ? h('span', { class: `sel-stat${left <= 0 ? ' is-hurt' : ''}`, title: reader.blowsFromWounds
        ? `Combat blows before every swing is weakened. ${reader.name} entered this fight already wounded, so the allowance is the endurance carried in (${reader.blowAllowance}), not the full ${reader.full.END} (Book 1 p.32).`
        : 'Combat blows before every swing is weakened. The allowance is the endurance the fight began with and does not fall as wounds land (Book 1 p.32).' },
      h('small', { text: reader.blowsFromWounds ? 'Blows (hurt)' : 'Blows' }), h('b', { text: `${left}/${reader.blowAllowance}` })) : null);
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
      reader.animal
        ? [h('span', { class: `sel-stat${reader.animal.woundsTaken ? ' is-hurt' : ''}` }, h('small', { text: 'Hits taken' }), h('b', { text: String(reader.animal.woundsTaken) })),
          h('span', { class: 'sel-stat' }, h('small', { text: 'Out at' }), h('b', { text: String(reader.animal.hits.unconscious) })),
          h('span', { class: 'sel-stat' }, h('small', { text: 'Dead at' }), h('b', { text: String(reader.animal.hits.dead) }))]
        : ['STR', 'DEX', 'END'].map((key) => {
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
          line ? h('b', { class: 'attack-need', text: /^\d/.test(line.text) ? `needs ${line.text}` : line.text }) : null),
      // Book 1 p.29: every throw is 2D against 8+; the number shown is 8 less
      // the DMs. Showing the sum is the difference between a figure to obey
      // and a figure to reason about.
      line?.preview?.canAttack ? h('p', { class: 'odds', text: dmSum(line.preview) }) : null,
      line && !line.preview?.canAttack
        ? h('p', { class: 'odds is-warning', text: `${getPersonalWeapon(weaponKey).name} cannot reach at ${line.range.name.toLowerCase()} range. Close the range, or change weapon \u2014 an attack declared now would do nothing.` })
        : null);
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
  // Two different impossibilities looked identical before: a weapon that
  // cannot reach at this range at all, and a throw so modified it can never
  // come up. The first is a dash, the second is the number it would need.
  const short = (line) => {
    if (!line) return '';
    if (/^\d/.test(line.text)) return line.text;
    if (line.text === 'cannot miss') return 'auto';
    if (line.preview && !line.preview.canAttack) return '\u2014';
    return line.preview && Number.isFinite(line.preview.requiredRoll) ? `${line.preview.requiredRoll}+` : '\u2014';
  };
  const range = fighter === reader ? '' : { Close: 'C', Short: 'S', Medium: 'M', Long: 'L', 'Very long': 'VL', 'Out of range': 'out' }[rangeBetween(reader, fighter).name];
  const stats = statCells(fighter);
  const order = orderText(fighter, state);
  return h('tr', { class: `is-${fighter.side}${down ? ' is-down' : ''}${fighter === reader ? ' is-reader' : ''}`,
    onclick: (event) => { if (!event.target.closest('button')) handlers.onSelectMarker(fighter.id); } },
    h('td', {}, h('div', { class: 'tr-name' }, h('span', { class: 'tr-dot', 'aria-hidden': 'true' }), h('button', { type: 'button', class: 'tr-select', text: fighter.name, onclick: () => handlers.onSelectMarker(fighter.id) }))),
    h('td', { class: 'tr-arms', title: `${fighter.weaponLabel}, ${fighter.armorLabel}`, text: fighter.weaponLabel }),
    h('td', { class: 'tr-stats' }, stats),
    h('td', { class: 'tr-range', title: fighter === reader ? '' : rangeBetween(reader, fighter).name, text: range }),
    h('td', { class: 'tr-hit' }, canTarget
      ? h('button', {
        type: 'button',
        class: `tr-target${out.preview?.canAttack ? '' : ' is-unreachable'}`,
        'aria-pressed': targeted,
        title: out.preview?.canAttack
          ? `Target ${fighter.name}. ${dmBreakdown(out.preview)}`
          : `${getPersonalWeapon(reader.weaponKey).name} cannot reach ${fighter.name} at ${out.range.name.toLowerCase()} range. This orders ${reader.name} to close instead.`,
        text: short(out),
        onclick: () => handlers.onPickTarget(fighter.id, { reachable: Boolean(out.preview?.canAttack) })
      })
      : short(out)),
    h('td', { class: 'tr-target-name', text: fighter.order?.targetId ? (state.fighters.find((entry) => entry.id === fighter.order.targetId)?.name ?? '') : '' }),
    h('td', { class: `tr-order${order === 'undeclared' ? ' is-undeclared' : ''}`, title: order, text: order }));
}

// ---- the round as a declaration sheet ---------------------------------------
// Book 1 p.26 step 4: "A. Each character indicates his movement status. B. Each
// character indicates his attack and his target." Two passes over everyone, so
// the screen is one row per combatant, filled in and resolved together. There
// is no selected combatant to declare for and nothing hidden behind one.

const SHEET_MOVES = ['Stand', 'Close', 'Close (run)', 'Open', 'Open (run)', 'Evade'];
const NO_ATTACK_MOVES = new Set(['Close (run)', 'Open (run)', 'Evade', 'Escape']);

// Each row's order: what the referee has chosen on the sheet, else what the
// engine already holds, else what an NPC would do left to itself, else the
// plain default — attack the nearest enemy, closing if the weapon cannot reach.
export function sheetRows(state, chosen = {}) {
  const fighters = state.fighters ?? [];
  return fighters.map((fighter) => {
    const down = isDown(fighter);
    const foes = fighters.filter((other) => other.side !== fighter.side && !isDown(other));
    const nearest = [...foes].sort((a, b) => Math.abs(a.band - fighter.band) - Math.abs(b.band - fighter.band))[0] ?? null;
    const pick = chosen[fighter.id] ?? null;
    const held = fighter.order ? { move: ({ attack: 'Stand', wait: 'Stand', close: 'Close', 'close-run': 'Close (run)', open: 'Open', 'open-run': 'Open (run)', evade: 'Evade', escape: 'Escape' })[fighter.order.engineAction] ?? 'Stand', targetId: fighter.order.targetId } : null;
    const reachNearest = nearest ? hitLine(fighter, nearest).preview?.canAttack : false;
    // v0.255.0: nobody targets anybody until told to (Kurt, Sep 2026: tokens
    // dragged onto the board were aiming at the nearest enemy by themselves).
    // Auto-target puts the old behaviour back as an option: the nearest foe
    // for a character, the NPC's own choice for an NPC.
    const auto = Boolean(state.autoTarget);
    const fallback = auto
      ? { move: nearest && !reachNearest ? 'Close' : 'Stand', targetId: nearest?.id ?? null }
      : { move: 'Stand', targetId: null };
    const base = pick ?? held ?? (auto ? fighter.suggestion : null) ?? fallback;
    const source = pick ? 'chosen' : held ? 'declared' : auto && fighter.suggestion ? 'suggested' : 'default';
    const move = base.move ?? 'Stand';
    let targetId = base.targetId ?? null;
    if (targetId && !foes.some((foe) => foe.id === targetId)) targetId = auto ? nearest?.id ?? null : null;
    if (move === 'Evade' || move === 'Escape') targetId = null;
    const target = foes.find((foe) => foe.id === targetId) ?? null;
    const attacks = Boolean(target) && !NO_ATTACK_MOVES.has(move);
    const line = target ? hitLine(fighter, target) : null;
    let needs = '';
    let tone = '';
    if (down) needs = '';
    else if (state.setup?.surprisedSide && (fighter.side === 'party' ? 'party' : 'opposition') === state.setup.surprisedSide) { needs = 'surprised: cannot act'; tone = 'muted'; }
    else if (move === 'Evade') { needs = 'evading: no attack'; tone = 'muted'; }
    else if (move === 'Escape') { needs = 'escape on 9+'; tone = 'muted'; }
    else if (!target) { needs = 'holds fire'; tone = 'muted'; }
    else if (NO_ATTACK_MOVES.has(move)) { needs = 'running: no attack'; tone = 'muted'; }
    else if (line && !line.preview?.canAttack) {
      needs = move === 'Close' ? "can't reach \u2014 closing" : "can't reach";
      tone = move === 'Close' ? 'muted' : 'warn';
    } else if (line) {
      const need = line.preview.requiredRoll;
      needs = need <= 2 ? 'auto' : `${need}+`;
      tone = need > 12 ? 'warn' : 'go';
    }
    return { fighter, down, foes, move, targetId, target, attacks, line, needs, tone, source, reason: source === 'suggested' ? fighter.suggestion.reason : null };
  });
}

const ARMOR_NAMES = Object.freeze({ none: 'None', jack: 'Jack', mesh: 'Mesh', cloth: 'Cloth', reflec: 'Reflec', ablat: 'Ablat', combat: 'Battle dress' });
function armorName(key) {
  return ARMOR_NAMES[key] ?? String(key ?? 'none').replace(/-/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function sheetRow(row, state, handlers, focusId) {
  const { fighter } = row;
  const stats = statCells(fighter);
  // One characteristic at zero is unconscious (p.30), so the figure that
  // matters is how close the lowest one is. An animal's is its hits to spare.
  const lowest = fighter.animal
    ? fighter.animal.hits.unconscious - fighter.animal.woundsTaken
    : Math.min(...['STR', 'DEX', 'END'].map((key) => fighter.characteristics[key]));
  const brink = !row.down && lowest > 0 && lowest <= 2;
  // A concluded fight is shown, not played: its orders are read-only.
  const live = Boolean(state.live) && !row.down && !state.concluded;
  const weapon = getPersonalWeapon(fighter.weaponKey);
  return h('tr', {
    class: `is-${fighter.side}${row.down ? ' is-down' : ''}${fighter.id === focusId ? ' is-focus' : ''}`,
    onclick: (event) => { if (!event.target.closest('select')) handlers.onSheetFocus?.(fighter.id); },
    // v0.252.0: the row and its token carry the same menu, so an order can
    // be given from wherever the referee is looking.
    oncontextmenu: row.down ? null : (event) => {
      event.preventDefault();
      handlers.onSheetFocus?.(fighter.id);
      handlers.onFighterMenu?.(fighter, { x: event.clientX, y: event.clientY }, { move: row.move, targetId: row.targetId, foes: row.foes });
    }
  },
    h('td', {}, h('div', { class: 'tr-name' }, h('span', { class: 'tr-dot', 'aria-hidden': 'true' }), h('span', { class: 'tr-select', text: fighter.name }))),
    h('td', { class: 'tr-stats', title: row.down ? condition(fighter) : brink ? 'One more wound may put a characteristic to zero: unconscious (Book 1 p.30)' : condition(fighter) },
      row.down ? condition(fighter).toLowerCase() : [stats, brink ? h('span', { class: 'brink', text: ' \u26a0' }) : null]),
    h('td', {}, row.down ? '' : h('select', { class: 'sheet-select', 'aria-label': `${fighter.name}: movement`, disabled: !live, onchange: (event) => handlers.onSheetChange?.(fighter.id, { move: event.target.value, targetId: row.targetId }) },
      [...SHEET_MOVES, ...(state.round === 1 ? ['Escape'] : [])].map((move) => h('option', { value: move, selected: move === row.move, text: move })))),
    // v0.255.0: the weapon is a choice, not a label (Kurt, Sep 2026: a bar
    // fight is fists, whatever rifle the character carries). The list is what
    // the combatant has on them, and bare hands.
    h('td', { class: 'tr-arms', title: `${fighter.weaponLabel}, ${fighter.armorLabel}${weapon.melee ? `, ${blowsRemaining(fighter)} of ${fighter.blowAllowance} combat blows left` : ''}` },
      live && (fighter.weaponChoices ?? []).length > 1
        ? h('select', { class: 'sheet-select', 'aria-label': `${fighter.name}: weapon`, onchange: (event) => handlers.onWeapon?.(fighter.id, event.target.value) },
          // v0.270.0: each other option says what it means in these hands,
          // briefly; the one in hand says it under the list instead, so the
          // closed list is not cut off mid-tag.
          fighter.weaponChoices.map((choice) => {
            const held = choice.key === fighter.weaponKey;
            const text = !choice.tag ? choice.name : held || !choice.tag.short ? choice.baseName : `${choice.baseName} (${choice.tag.short})`;
            return h('option', { value: choice.key, selected: held, title: choice.tag?.title ?? null, text });
          }))
        : fighter.weaponLabel,
      // And under it, the weapon in hand, only when it is not plain.
      !row.down && fighter.weaponTag?.short ? h('span', { class: `weapon-tag${fighter.weaponTag.warn ? ' is-warn' : ''}`, title: fighter.weaponTag.title, text: fighter.weaponTag.short }) : null,
      weapon.melee && !row.down ? h('span', { class: 'blows', text: ` \u00b7 ${blowsRemaining(fighter)} blows` }) : null),
    // v0.257.0: armour is on show so the table reads what everyone is
    // wearing — marines in battle dress change a player's mind. The referee
    // sets it; a player only reads it.
    h('td', { class: 'tr-armor' },
      state.live && state.seat !== 'player' && (fighter.armorChoices ?? []).length
        ? h('select', { class: 'sheet-select', 'aria-label': `${fighter.name}: armour`, onchange: (event) => handlers.onArmor?.(fighter.id, event.target.value) },
          fighter.armorChoices.map((key) => h('option', { value: key, selected: key === fighter.armor, text: armorName(key) })))
        : armorName(fighter.armor)),
    h('td', {}, row.down || row.move === 'Evade' || row.move === 'Escape' ? '' : h('select', { class: 'sheet-select', 'aria-label': `${fighter.name}: target`, disabled: !live, onchange: (event) => handlers.onSheetChange?.(fighter.id, { move: row.move, targetId: event.target.value || null }) },
      row.move === 'Stand' ? h('option', { value: '', selected: !row.targetId, text: '\u2014 hold fire \u2014' }) : null,
      row.foes.map((foe) => h('option', { value: foe.id, selected: foe.id === row.targetId, text: `${foe.name} (${rangeBetween(fighter, foe).name.toLowerCase()})` })))),
    h('td', { class: `sheet-needs is-${row.tone || 'plain'}`, title: row.needs, text: row.needs }));
}

// v0.252.0: the fight takes the screen, the way staging and the ship fight
// already do. Before this the declaration table lived in the 420px now
// column, where it was wider than its own container: it overlapped the
// header above it and clipped the Needs column on the right — which is the
// column that says why a row cannot act.
//
// So the table, the band grid and Book 1 p.27's step strip are the scene, and
// the column keeps what is genuinely about one combatant: the throw behind
// the focused row, the wound prompt, morale, and last round.

function encounterStepStrip(state, handlers) {
  const steps = state.encounterSteps ?? [];
  if (!steps.length) return null;
  return h('nav', { class: 'fight-steps', 'aria-label': 'Encounter steps, Book 1 p.27' },
    h('div', { class: 'fight-round' }, h('span', { class: 'fight-round-label', text: 'ROUND' }), h('b', { text: String(state.round ?? 1) })),
    steps.map((step) => h('div', { class: `fight-step is-${step.state}`, title: step.cite },
      h('b', { text: `${step.number}. ${step.title}` }),
      h('span', { text: step.detail }),
      step.action ? h('button', {
        type: 'button', class: 'button is-small', text: step.action.label,
        onclick: () => handlers.onCommand?.(step.action.command)
      }) : null)));
}

// v0.305.0: a waiting animal encounter (The Traveller Book pp.91-95), drawn
// the same in the Party dialog and on the setup board: the book's line, the
// code in words, then Book 1's order — surprise, range — and the animals'
// attack/flee, each thrown or called; then onto the board. `act` runs one
// animals:* command.
export function renderAnimalEncounter(animals, act) {
  const pending = animals.pending;
  const row = pending.row;
  const when = { travelling: 'while travelling', halted: 'while halted', now: 'on a check now', called: 'called by the referee' }[pending.when] ?? '';
  const header = `${pending.terrain}, ${pending.worldName} \u00b7 ${pending.date} ${when} \u00b7 ${pending.thrown === pending.die ? '' : `thrown ${pending.thrown}, `}row ${pending.die}`;
  const step = (label, result, buttons) => h('div', { class: 'encounter-step' },
    h('span', { class: 'encounter-step-label', text: label }),
    h('span', { class: `encounter-step-result${result ? '' : ' is-open'}`, text: result ?? 'not yet' }),
    h('span', { class: 'encounter-step-actions' }, buttons));
  const callSelect = (options, command) => h('select', { 'aria-label': `Call the ${command}`, onchange: (event) => { if (event.target.value) act(command, { mode: event.target.value }); } },
    h('option', { value: '', text: 'or call it\u2026' }), options.map(([value, text]) => h('option', { value, text })));
  const body = [];
  if (pending.category === 'event') {
    body.push(h('p', { class: 'encounter-line', text: `Event: ${pending.event || 'nothing written for this row yet; write it on the table.'}` }));
  } else if (!row || row.missing) {
    body.push(h('p', { class: 'encounter-line', text: 'The statblock for this row is gone.' }));
  } else {
    const rangeTerrain = animals.surface?.rangeTerrain;
    // v0.308.0: the book's line as one line that wraps between its parts,
    // not a table squeezed into a dialog.
    const part = (label, value) => h('span', { class: 'encounter-part' }, label ? h('small', { text: label }) : null, h('b', { text: value }));
    body.push(
      h('p', { class: 'encounter-statline' },
        part('', `${row.quantity} ${row.name}`), part('', row.weight), part('hits', row.hits),
        part('armor', row.armor), part('', row.weapons), part('', row.code)),
      h('p', { class: 'encounter-code', text: `${row.codeText}.${row.type === 'filter' ? ' Draws in anything at close range on 6+; escape 7+, 1 END a try, +2 a helper (p.93).' : ''}` }),
      step('1. Surprise', pending.surprise?.text ?? null, [
        h('button', { type: 'button', class: 'button is-small', text: 'Roll', title: 'Book 1 p.27: 1D a side, surprise at 3 or more higher; the party\u2019s leader, tactics and military DMs', onclick: () => act('surprise', { mode: 'roll' }) }),
        callSelect([['party', 'party has it'], ['opposition', 'animals have it'], ['none', 'neither']], 'surprise')]),
      step('2. Range', pending.range?.text ?? null, [
        h('button', { type: 'button', class: 'button is-small', text: 'Roll', title: rangeTerrain ? `Book 1 p.27: 2D plus the ${rangeTerrain.replace(/-/g, ' ')} DM` : 'Book 1 p.27: 2D, no terrain DM for this terrain', onclick: () => act('range', { mode: 'roll' }) }),
        callSelect([['close', 'close'], ['short', 'short'], ['medium', 'medium'], ['long', 'long'], ['very-long', 'very long']], 'range')]),
      step('3. Attack or flee', pending.behaviour?.text ?? null, [
        h('button', { type: 'button', class: 'button is-small', text: pending.behaviour ? 'Again' : 'Throw', title: 'The Traveller Book p.95, in the animal\u2019s own order, using the surprise above', onclick: () => act('behaviour', { actorId: pending.actorId }) })]));
  }
  // v0.307.0: a fleeing animal is let go by default; on the board it runs.
  const fled = pending.behaviour?.action === 'flee';
  const idle = pending.behaviour?.action === 'nothing';
  const count = h('input', { type: 'number', min: '1', value: String(row?.quantity ?? 1), 'aria-label': 'How many to place', style: 'width:56px' });
  const settled = `${pending.surprise ? 'places them at the range above and begins round 1 with that surprise' : pending.range ? 'places them at the range above; settle surprise on the board' : 'places them two bands off; throw range and surprise on the board'}${fled ? ', fleeing: escape is declared for round 1' : idle ? '; they do nothing unless given orders' : ''}`;
  return h('fieldset', { class: 'time-box encounter-box' }, h('legend', { text: 'Animal encounter' }),
    h('p', { class: 'encounter-head', text: header }),
    ...body,
    h('div', { class: 'surface-row' },
      pending.actorId ? h('label', { class: 'surface-inline' }, 'Place ', count) : null,
      fled ? h('button', { type: 'button', class: 'button is-small is-primary', text: 'Let it go', title: 'It fled; the encounter is over', onclick: () => act('dismiss', { fled: true }) }) : null,
      pending.actorId ? h('button', { type: 'button', class: `button is-small${fled ? '' : ' is-primary'}`, text: fled ? 'Put on the board anyway' : 'Put on the board', title: `With the party: ${settled}`, onclick: () => act('place', { actorId: pending.actorId, count: Number(count.value) || 1 }) }) : null,
      fled ? null : h('button', { type: 'button', class: 'button is-small', text: 'Set aside', onclick: () => act('dismiss', {}) })),
    null);
}

// v0.254.0: the board before round 1. Book 1 p.27's step 1 is surprise and
// step 2 range; placing the tokens is step 2, and Kurt's call on step 1 for a
// fight set up by hand is that the referee decides whether to roll at all.
function setupStrip(state, handlers) {
  const party = state.fighters.filter((entry) => entry.side === 'party').length;
  const foes = state.fighters.filter((entry) => entry.side !== 'party').length;
  const ready = party > 0 && foes > 0;
  const encounterWaiting = Boolean(state.animals?.pending && state.live && state.seat !== 'player');
  const begin = (surprise) => handlers.onBeginFight?.(surprise);
  // v0.271.0: Book 1 p.27, the range the parties met at. Thrown with the
  // terrain DM or stated; either moves the opposition that far off. Dragging
  // the tokens afterwards is still the referee's to do.
  const opening = state.openingRange;
  const terrain = opening ? h('select', { class: 'sheet-select', 'aria-label': 'Terrain', disabled: !ready },
    h('option', { value: '', text: 'No terrain DM' }),
    opening.terrains.map((entry) => h('option', { value: entry.key, selected: entry.key === state.lastTerrain, text: entry.name }))) : null;
  const stated = opening ? h('select', { class: 'sheet-select', 'aria-label': 'State the range', disabled: !ready, onchange: (event) => { if (event.target.value) handlers.onOpeningRange?.({ range: event.target.value }); } },
    h('option', { value: '', text: 'or state it\u2026' }),
    ['close', 'short', 'medium', 'long', 'very-long'].map((range) => h('option', { value: range, text: range.replace('-', ' ') }))) : null;
  const rangeLine = opening ? h('div', { class: 'fight-setup-range' },
    h('span', { class: 'fight-setup-count', text: `Range (p.27): ${opening.now ? `${opening.now} on the board now` : 'both sides needed'}.` }),
    terrain,
    h('button', { type: 'button', class: 'button is-small', disabled: !ready, text: 'Throw range', title: '2D plus the terrain DM (Book 1 p.27); the opposition is moved that far off', onclick: () => handlers.onOpeningRange?.({ terrain: terrain.value || null }) }),
    stated,
    opening.set ? h('span', { class: 'fight-setup-note', text: opening.set }) : null) : null;
  return h('section', { class: 'fight-setup', 'aria-label': 'Setting up the fight' },
    // v0.305.0: an animal encounter waiting is what this board is for.
    encounterWaiting ? renderAnimalEncounter(state.animals, (command, value) => handlers.onAnimals?.(command, value)) : null,
    // v0.306.0: while the encounter's own surprise and range stand ready and
    // the board is empty, the board's copies of them only confuse.
    encounterWaiting && !ready ? null : rangeLine,
    // v0.299.0: the opposition's reaction, one throw for the group.
    state.fightReaction && state.live ? renderReactionPanel(state.fightReaction, handlers, { title: 'Their reaction (Book 3 p.23; The Traveller Book p.101): one throw for the group' }) : null,
    h('span', { class: 'fight-setup-count', text: ready
      ? `${party} party, ${foes} opposition. Surprise, then begin (p.26):`
      : encounterWaiting ? 'Put the encounter on the board, or drag characters and actors onto a band.' : 'Both sides are needed before surprise. Right-click a token to remove it.' }),
    ...(encounterWaiting && !ready ? [] : [
      h('button', { type: 'button', class: 'button is-small is-primary', disabled: !ready, text: 'Roll surprise', onclick: () => begin('roll') }),
      h('button', { type: 'button', class: 'button is-small', disabled: !ready, text: 'Party has it', onclick: () => begin('party') }),
      h('button', { type: 'button', class: 'button is-small', disabled: !ready, text: 'Opposition has it', onclick: () => begin('opposition') }),
      h('button', { type: 'button', class: 'button is-small', disabled: !ready, text: 'Nobody', onclick: () => begin('none') })]));
}

// v0.255.0: Kurt's review of v0.254.0 — the band line was still the
// smallest thing on screen, the header and setup buttons took half as much
// room as the grid, and the left column repeated what chat already said. So
// the fight is one header line, the band line across the screen, and the
// table; the left column is gone, and what was only in it (the wound prompt,
// morale, the focused row's throw) moved beside what it is about.
function fightHeader(state, handlers) {
  const steps = state.encounterSteps ?? [];
  const facts = [state.setup?.range, state.setup?.surprise].filter(Boolean).map((line) => line.replace(/\.$/, '').toLowerCase());
  return h('header', { class: 'fight-head' },
    h('h2', { text: state.setupPhase ? 'Setting up a fight' : state.situation.title.replace(', ', ' \u00b7 ') }),
    state.setupPhase ? null : h('span', { class: 'fight-facts', text: facts.join(' \u00b7 ') }),
    state.setupPhase ? null : steps.map((step) => h('span', {
      class: `fight-pill is-${step.state}`, title: `${step.detail} (${step.cite})`, text: `${step.number} ${step.title}`
    })),
    state.setupPhase ? null : steps.filter((step) => step.action).map((step) => h('button', {
      type: 'button', class: 'button is-small', text: step.action.label, onclick: () => handlers.onCommand?.(step.action.command)
    })),
    h('label', { class: 'fight-toggle', title: 'Fill each row\u2019s target with the nearest enemy, and NPCs\u2019 with their own choice. Off by default: everyone targets on purpose.' },
      h('input', { type: 'checkbox', checked: Boolean(state.autoTarget), onchange: (event) => handlers.onAutoTarget?.(event.currentTarget.checked) }),
      ' Auto-target'),
    (state.refereeActions ?? []).map((action) => h('button', { type: 'button', class: 'button is-small', text: action.label, onclick: () => handlers.onCommand?.(action.command) })));
}

// v0.260.0: Book 1 p.30's wound, answered on the fight screen. "Each die
// rolled is taken as a single wound or group of hits, and must be applied to a
// single characteristic; further modifications may be distributed against,
// or added to, such wound groups as desired." The prompt said so in words
// and drew nothing to answer it with — and Resolve round is withheld while a
// wound is waiting — so the fight simply stopped (Kurt's report, Sep 2026).
// The groups and the preview are client/wound-dialog.js's, shared with the
// player's page since v0.179.0.
function woundPanel(state, handlers) {
  const prompt = woundPromptFrom(state.next.wound);
  const draft = state.woundDraft?.key === prompt.key ? state.woundDraft : initialWoundDraft(prompt);
  const groups = h('div', { class: 'wound-groups' });
  renderWoundGroups(groups, prompt, draft, (next) => handlers.onWoundDraft?.(next));
  const preview = h('div', { class: 'wound-preview' });
  try { renderWoundPreview(preview, prompt, previewWoundDraft(prompt, draft)); } catch { /* a draft the rules reject previews nothing */ }
  const allowed = state.live && (state.seat !== 'player' || state.next.wound.defenderId === state.characterId);
  return h('section', { class: 'fight-wound', role: 'group', 'aria-label': 'Where the wound falls' },
    h('div', { class: 'fight-wound-head' },
      h('b', { text: state.next.title }),
      h('span', { text: state.next.copy }),
      h('span', { class: 'cite', text: state.next.cite })),
    groups,
    preview,
    allowed ? h('button', { type: 'button', class: 'button is-primary', text: 'Apply the wound', onclick: () => handlers.onAllocateWound?.(draft) }) : h('p', { class: 'cite', text: `Waiting for ${prompt.defenderName}\u2019s player to place it.` }));
}

function fightScene(state, handlers) {
  const rows = state.sheetRows ?? sheetRows(state, {});
  const focus = rows.find((row) => row.fighter.id === state.sheetFocus) ?? rows.find((row) => !row.down) ?? null;
  const referee = state.seat !== 'player';
  const sides = [rows.filter((row) => row.fighter.side === 'party'), rows.filter((row) => row.fighter.side !== 'party')];
  const live = rows.filter((row) => !row.down).length;
  const wound = state.next?.wound ?? null;
  const morale = (state.casualties ?? []).filter((entry) => entry.throwing).map((entry) => entry.words);
  const whyRow = (row) => {
    if (!focus || row.fighter.id !== focus.fighter.id || focus.down) return null;
    const parts = [];
    if (focus.attacks && focus.line?.preview?.canAttack) parts.push(`${dmSum(focus.line.preview)} for ${woundText(focus.line.preview)} wounds.`);
    if (focus.target && focus.line && !focus.line.preview?.canAttack) parts.push(`${getPersonalWeapon(focus.fighter.weaponKey).name} cannot reach ${focus.target.name} at ${focus.line.range.name.toLowerCase()} range${focus.move === 'Close' ? '; closing one band this round.' : '. Close the range, or this order does nothing.'}`);
    if (!focus.target && !['Evade', 'Escape'].includes(focus.move)) parts.push('No target: select this token, hover an enemy and press T.');
    if (focus.reason) parts.push(`Suggested: ${focus.reason}.`);
    return h('tr', { class: 'sheet-why-row' }, h('td', { colspan: '7' },
      parts.join(' '),
      referee && state.live ? h('button', { type: 'button', class: 'link-button', text: ' Referee: set scores\u2026', onclick: () => handlers.onEditScoresPrompt?.(focus.fighter) }) : null));
  };
  return [
    h('div', { class: 'fight-shell' },
      fightHeader(state, handlers),
      state.setupPhase ? setupStrip(state, handlers) : null,
      state.concluded ? h('section', { class: 'fight-concluded', role: 'status' },
        h('h3', { text: state.concluded.headline }),
        // Leave the fight is on the header line already.
        h('p', { text: `${state.concluded.rounds} round${state.concluded.rounds === 1 ? '' : 's'}.${state.concluded.casualties.length ? ` ${state.concluded.casualties.map((entry) => `${entry.name} ${entry.status}`).join(', ')}.` : ''}` }),
        // v0.307.0: The Traveller Book p.92, food from the kill.
        ...(state.concluded.carcasses ?? []).map((carcass) => h('p', { class: 'fight-carcass' },
          carcass.butchered ? h('span', { text: carcass.butchered })
            : carcass.destroyed ? h('span', { text: `${carcass.name}: destroyed, no food or pelt value (p.92).` })
              : [h('span', { text: `${carcass.name}: dead. ` }),
                state.live && state.seat !== 'player' ? h('button', { type: 'button', class: 'button is-small', text: 'Butcher', title: 'Edible on 5+ (\u22123 on a tainted atmosphere); 1D \u00d7 5% of its weight is meat (p.92)', onclick: () => handlers.onAnimals?.('butcher', { encounterId: state.concluded.encounterId, combatantId: carcass.id }) }) : null]))) : null,
      wound ? woundPanel(state, handlers) : null,
      morale.length ? h('p', { class: 'hold-note is-morale' }, morale.join(' ')) : null,
      referee && state.live ? moraleSettings(state, handlers) : null,
      // v0.299.0: what the opposition made of the party, and the attack
      // throw a hostile result calls for.
      referee && state.live && !state.setupPhase && state.fightReaction?.current ? renderReactionPanel(state.fightReaction, handlers, { title: 'Their reaction (Book 3 p.23)' }) : null,
      h('div', { class: 'fight-board' }, bandsScene(state, handlers)),
      h('section', { class: 'fight-orders', 'aria-label': 'Declarations' },
        h('table', { class: 'tracker sheet' },
          h('thead', {}, h('tr', {},
            h('th', { text: 'Combatant' }), h('th', { title: 'Strength, dexterity, endurance now', text: 'Status' }),
            h('th', { title: 'Book 1 p.28 step 4A', text: 'Movement' }), h('th', { text: 'Weapon' }), h('th', { title: 'What each is wearing (Book 1 p.42). Set by the referee.', text: 'Armour' }),
            h('th', { title: 'Book 1 p.28 step 4B \u2014 or hover an enemy token and press T', text: 'Target' }), h('th', { title: '2D against 8+, after every DM', text: 'Needs' }))),
          sides.map((side) => h('tbody', {}, side.flatMap((row) => [sheetRow(row, state, handlers, focus?.fighter.id), whyRow(row)]).filter(Boolean)))),
        h('div', { class: 'fight-actions' },
          state.live && !wound && !state.concluded && !state.setupPhase
            ? h('button', { type: 'button', class: 'button is-primary', onclick: () => handlers.onResolveSheet?.() },
              h('span', { text: 'Resolve round' }), h('small', { text: `${live} order${live === 1 ? '' : 's'}, as shown` }))
            : null,
          // p.30: a round is every combatant throwing once, together. Said
          // here because the table reads like a turn order and is not one.
          state.setupPhase ? null : h('span', { class: 'cite', text: 'Every attack in a round lands together (Book 1 p.30).' }))))
  ];
}

// v0.254.0: the now column while a fight is being set up says how, rather
// than showing a round nobody has begun.
function setupColumn(state) {
  return [
    h('header', { class: 'now-head' }, h('h1', { text: 'Setting up a fight' })),
    state.notice?.message ? h('p', { class: `notice${state.notice.ok ? '' : ' is-error'}`, role: 'status', text: state.notice.message }) : null,
    h('ol', { class: 'setup-steps' },
      h('li', { text: 'Drag characters and actors from the Actors tab onto a band. Player characters join the party; everyone else the opposition.' }),
      h('li', { text: 'Drag a token to move it, or right-click it to take it off the board.' }),
      h('li', { text: 'Decide surprise: roll it, or call it yourself (Book 1 p.26). That begins round 1.' }),
      h('li', { text: 'Then select a token, hover an enemy and press T to target it.' }))
  ];
}

// v0.272.0: Book 1 p.33's two per-side choices the engine cannot read off
// the combatants: whether the side is a military unit, and the referee's DM
// ("valiant parties may have a higher throw"). Leaders are read from the
// Leader skill. Folded away until wanted.
function moraleSettings(state, handlers) {
  const sides = (state.casualties ?? []);
  if (!sides.length) return null;
  const summary = sides.map((entry) => `${entry.side === 'party' ? 'party' : 'opposition'} ${entry.total >= 0 ? '+' : '\u2212'}${Math.abs(entry.total)}`).join(', ');
  return h('details', { class: 'morale-settings' },
    h('summary', { text: `Morale (Book 1 p.33): DMs ${summary}${sides.some((entry) => entry.broken) ? ' \u00b7 the party has broken' : ''}` }),
    sides.map((entry) => {
      const side = entry.side === 'party' ? 'party' : 'opposition';
      return h('div', { class: 'morale-side' },
        h('b', { text: side === 'party' ? 'Party' : 'Opposition' }),
        h('label', { class: 'sheet-check' },
          h('input', { type: 'checkbox', checked: entry.militaryUnit, onchange: (event) => handlers.onMorale?.(side, { militaryUnit: event.currentTarget.checked }) }),
          ' military unit (+1)'),
        h('label', { class: 'sheet-inline' }, 'referee DM ',
          h('input', { type: 'number', min: '-6', max: '6', value: String(entry.refereeDM), 'aria-label': `${side} morale DM`, style: 'width:52px',
            onchange: (event) => handlers.onMorale?.(side, { dm: Number(event.currentTarget.value) || 0 }) })),
        h('span', { class: 'cite', text: entry.dms.length ? entry.dms.join(', ') : 'no DMs' }));
    }),
    h('p', { class: 'cite', text: 'Thrown for a side once a quarter of it is unconscious or killed, 7+ to stand. A leader is anyone with Leader skill; killed, \u22122 for two rounds and until another leader takes over.' }));
}

function fightColumn(state, handlers) {
  const rows = state.sheetRows ?? sheetRows(state, {});
  const focus = rows.find((row) => row.fighter.id === state.sheetFocus) ?? rows.find((row) => !row.down) ?? null;
  const wound = state.next?.wound ?? null;
  const morale = (state.casualties ?? []).filter((entry) => entry.throwing).map((entry) => entry.words);
  return [
    h('header', { class: 'now-head' }, h('h1', { text: 'This round' }), h('p', { text: focus ? focus.fighter.name : 'Nobody left standing' })),
    state.notice ? h('p', { class: `notice${state.notice.ok ? '' : ' is-error'}`, role: 'status', text: state.notice.message }) : null,
    morale.length ? h('p', { class: 'hold-note is-morale', text: morale.join(' ') }) : null,
    wound ? h('section', { class: 'lead' }, h('h2', { text: state.next.title }), h('p', { text: state.next.copy }), h('p', { class: 'cite', text: state.next.cite })) : null,
    focus && !focus.down ? h('section', { class: 'sheet-why' },
      h('h3', { text: focus.fighter.name }),
      focus.attacks && focus.line?.preview?.canAttack ? h('p', { class: 'odds', text: `${dmSum(focus.line.preview)} for ${woundText(focus.line.preview)} wounds.` }) : null,
      focus.target && focus.line && !focus.line.preview?.canAttack ? h('p', { class: `odds${focus.move === 'Close' ? '' : ' is-warning'}`, text: `${getPersonalWeapon(focus.fighter.weaponKey).name} cannot reach ${focus.target.name} at ${focus.line.range.name.toLowerCase()} range${focus.move === 'Close' ? '; closing one band this round.' : '. Close the range, or this order does nothing.'}` }) : null,
      focus.reason ? h('p', { class: 'odds', text: `Suggested: ${focus.reason}. Change the row to overrule it.` }) : null,
      focus.source === 'declared' ? h('p', { class: 'odds', text: 'Already declared this round; changing the row replaces it.' }) : null,
      state.live && state.seat !== 'player' && !focus.fighter.animal ? h('form', { class: 'editor-row', onsubmit: (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const read = (key) => form.querySelector(`[name="${key}"]`)?.value ?? '';
        handlers.onEditCombatant?.(focus.fighter.id, Object.fromEntries(['STR', 'DEX', 'END'].map((key) => [key, read(key)])));
      } },
        h('span', { class: 'editor-label', text: 'Set' }),
        ['STR', 'DEX', 'END'].map((key) => h('label', { class: 'editor-score' }, h('span', { text: key }),
          h('input', { name: key, type: 'number', min: '0', max: String(focus.fighter.full[key]), value: String(focus.fighter.characteristics[key]), 'aria-label': `${focus.fighter.name} ${key}` }))),
        h('button', { type: 'submit', class: 'button is-small', text: 'Apply' })) : null) : null,
    state.lastRound?.length ? h('section', { class: 'last-round' }, h('h3', { text: 'Last round' }), state.lastRound.map((line) => h('p', { text: line }))) : null
  ];
}

// v0.316.0: the shipyard at a class A or B port — turrets into empty
// hardpoints, weapons into turrets, programs for the computer. v0.316.1: a
// drawer from the masthead's Shipyard chip.
function shipyardPanel(yard, handlers) {
  const buy = (entry, verb) => (entry.command
    ? kindButton({ label: verb, note: entry.figure, kind: 'optional' }, { small: true, onclick: () => handlers.onCommand?.(entry.command) })
    : h('span', { class: 'yard-blocked', text: `${entry.figure} \u2014 ${entry.blocked}` }));
  const row = (title, detail, action) => h('li', { class: 'yard-row' },
    h('span', { class: 'yard-title' }, h('b', { text: title }), detail ? h('small', { text: detail }) : null), action);
  const hardpoints = yard.hardpoints;
  const summary = [`class ${yard.starport}`, hardpoints.empty ? `${hardpoints.empty} empty hardpoint${hardpoints.empty === 1 ? '' : 's'}` : null,
    yard.turrets.some((turret) => turret.room > 0) ? 'turret room' : null, 'software'].filter(Boolean).join(' \u00b7 ');
  return h('div', { class: 'shipyard' },
    h('header', { class: 'drawer-head' }, h('h2', { text: 'Shipyard' }), h('p', { text: summary })),
    yard.attention?.length ? h('ul', { class: 'yard-attention' }, yard.attention.map((text) => h('li', {}, kindIcon('owed'), h('span', { text: `${text[0].toUpperCase()}${text.slice(1)}.` })))) : null,
    h('p', { class: 'cite', text: `Account ${cr(yard.balanceCr)}, hold ${yard.freeHold} t free. Fitted at once, charged to the ship. ${yard.cite}.` }),
    h('h4', { text: `Turrets \u2014 ${hardpoints.fitted} of ${hardpoints.total} hardpoints fitted` }),
    yard.mounts.length
      ? h('ul', { class: 'yard-list' }, yard.mounts.map((entry) => row(entry.label, 'a ton of the hold for its fire control', buy(entry, 'Fit'))))
      : h('p', { class: 'cite', text: 'Every hardpoint carries a turret.' }),
    yard.turrets.map((turret) => h('div', { class: 'yard-turret' },
      h('p', {}, h('b', { text: `Turret ${turret.id}` }), ` ${turret.mount}: ${turret.weapons.length ? turret.weapons.join(', ') : 'empty'}${turret.room ? `, room for ${turret.room}` : ', full'}`),
      turret.offers.length ? h('ul', { class: 'yard-list' }, turret.offers.map((entry) => row(entry.label, null, buy(entry, 'Install')))) : null)),
    yard.computer ? [
      h('h4', { text: `Computer \u2014 Model/${yard.computer.model}, CPU ${yard.computer.cpu}, storage ${yard.computer.storage ?? 'none'}` }),
      h('p', { class: 'cite', text: `Retrofit in place of the installed model; the old one is traded in at 25% of its price (Book 2 p.15). A model supports jumps to its own number, a bis one more, and never less than the design did (The Traveller Book, 1982); the drive still sets the range. Now jump-${yard.computer.maximumSupportedJump}.` }),
      h('ul', { class: 'yard-list' }, yard.computer.offers.filter((entry) => entry.upgrade || entry.command).map((entry) => row(entry.label, entry.detail, buy(entry, 'Fit'))))
    ] : null,
    h('h4', { text: 'Software' }),
    h('p', { class: 'cite', text: `Carried: ${yard.carried.join(', ') || 'nothing'}.` }),
    h('ul', { class: 'yard-list' }, yard.software.map((entry) => row(entry.label, [`${entry.group}, ${entry.space} space`, entry.note].filter(Boolean).join(' \u2014 '), buy(entry, 'Buy')))));
}

// v0.315.6: kindButton and kindIcon live in kind-button.js, shared with the
// vector fight.
export { kindButton, kindIcon };

function leadCard(next, state, handlers) {
  if (!next) return h('section', { class: 'lead' }, h('h2', { text: 'Nothing pending' }), h('p', { text: 'The port call is complete. Depart when you are ready.' }));
  return h('section', { class: 'lead', 'aria-label': 'Do this next' },
    h('h2', { text: next.title }),
    next.copy ? h('p', { text: next.copy }) : null,
    next.actions?.length ? h('div', { class: 'lead-actions' }, next.actions.map((action) =>
      (action.kind
        ? kindButton(action, { onclick: action.command ? () => handlers.onCommand?.(action.command) : null })
        : h('button', { type: 'button', class: action.primary ? 'button is-primary' : 'button', onclick: action.command ? () => handlers.onCommand?.(action.command) : null },
          h('span', { text: action.label }), action.note ? h('small', { text: action.note }) : null)))) : null,
    next.cite ? h('p', { class: 'cite', text: next.cite }) : null);
}

// v0.315.0: departureChecklist's rows, before the Depart button. A failing
// gate blocks; a risk is only a risk, and the misjump row is loud.
// Which departure checklists are open, across redraws (by destination).
const openChecklists = new Set();

function checklistPanel(list) {
  const mark = (row) => (row.ok ? '\u2713' : row.blocking ? '\u2717' : '!');
  const notes = [
    `Life support ${cr(list.lifeSupportCr)}${list.overstayCr ? `, berthing past six days ${cr(list.overstayCr)}` : ''}, charged on the way out.`,
    list.driveFailureParts.length ? `Weekly drive-failure throw DM +${list.driveFailureDM}: ${list.driveFailureParts.join('; ')}.` : null
  ].filter(Boolean);
  // v0.317.2 (Kurt, Sep 2026): folded away by default; the summary carries the
  // verdict, red when something stops the jump, amber for a risk only.
  const blocking = list.rows.filter((row) => row.blocking && !row.ok);
  const risks = list.rows.filter((row) => !row.blocking && !row.ok);
  const key = list.target?.id ?? 'none';
  const state = blocking.length
    ? `${blocking.length} stop${blocking.length === 1 ? 's' : ''} the jump: ${blocking.map((row) => row.label.toLowerCase()).join(', ')}`
    : risks.length ? `clear, with ${risks.map((row) => row.label.toLowerCase()).join(', ')}` : 'all clear \u2713';
  const panel = h('details', { class: `checklist${blocking.length ? ' is-blocked' : risks.length ? ' is-risk' : ''}`, 'aria-label': 'Departure checklist', open: openChecklists.has(key) },
    h('summary', {},
      blocking.length ? kindIcon('danger') : risks.length ? kindIcon('owed') : null,
      h('span', { text: list.target ? `Before the jump to ${list.target.name}` : 'Before the jump' }),
      h('span', { class: 'check-state', text: state })),
    h('div', { class: 'check-body' },
      h('ul', { class: 'check-rows' }, list.rows.map((row) => h('li', { class: `check-row ${row.ok ? 'is-ok' : row.blocking ? 'is-blocking' : 'is-risk'}${row.loud ? ' is-loud' : ''}` },
        h('span', { class: 'check-mark', 'aria-hidden': 'true', text: mark(row) }),
        h('span', { class: 'check-label', text: row.label }),
        h('span', { class: 'check-detail', text: row.detail })))),
      notes.map((text) => h('p', { class: 'check-note', text })),
      h('p', { class: 'check-note is-loud', text: list.diameters }),
      h('p', { class: 'cite', text: 'Book 2 pp.4, 6, 17, 32; The Traveller Book (1982)' })));
  panel.addEventListener('toggle', () => { if (panel.open) openChecklists.add(key); else openChecklists.delete(key); });
  return panel;
}

function stepRow(step, handlers = {}) {
  const row = h('li', { class: `step is-${step.state}${step.kind ? ` kind-${step.kind}` : ''}` });
  const head = h('button', { type: 'button', class: 'step-head', 'aria-expanded': 'false',
    onclick: () => { const open = row.classList.toggle('is-open'); head.setAttribute('aria-expanded', String(open)); } },
    h('span', { class: 'step-mark', 'aria-hidden': 'true' }),
    h('span', { class: 'step-title', text: step.title }),
    h('span', { class: 'step-figure', text: step.figure }));
  row.append(head);
  if (step.verb) {
    row.append(step.kind
      ? kindButton({ label: step.verb, kind: step.kind }, { small: true, onclick: step.command ? () => handlers.onCommand?.(step.command) : null })
      : h('button', { type: 'button', class: 'button is-small', text: step.verb, onclick: step.command ? () => handlers.onCommand?.(step.command) : null }));
  }
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

// A fight has to be startable from here, or the page is a dead end: pick who
// the party is up against and the range they meet at (Book 1 p.27).
function startFight(state, handlers, { open = false } = {}) {
  const foes = state.opponents ?? [];
  if (!state.live || !foes.length) return null;
  const party = state.partyChoices ?? [];
  return h('details', { class: 'start-fight', open },
    h('summary', {}, h('h3', { text: 'Start a fight' })),
    h('p', { class: 'cite', text: 'Who takes the field, who they meet, and the range they meet at (Book 1 p.27).' }),
    party.length ? h('div', { class: 'foes' }, h('span', { class: 'foes-label', text: 'Party' }), party.map((member) => h('label', { class: `check${member.eligible ? '' : ' is-blocked'}` },
      h('input', { type: 'checkbox', value: member.id, 'data-party': member.id, checked: member.eligible, disabled: !member.eligible }),
      ` ${member.name}${member.note ? ` (${member.note})` : ''}`))) : null,
    h('div', { class: 'foes' }, h('span', { class: 'foes-label', text: 'Against' }), foes.map((foe) => h('label', { class: 'check' },
      h('input', { type: 'checkbox', value: foe.id, 'data-foe': foe.id }), ` ${foe.name}${foe.note ? ` (${foe.note})` : ''}`))),
    h('div', { class: 'row' },
      h('select', { 'data-range': true, 'aria-label': 'Range they meet at' },
        ['close', 'short', 'medium', 'long', 'very-long'].map((range) => h('option', { value: range, selected: range === 'medium', text: range.replace('-', ' ') }))),
      h('button', { type: 'button', class: 'button', text: 'Begin', onclick: (event) => {
        const box = event.currentTarget.closest('.start-fight');
        const opponentIds = [...box.querySelectorAll('[data-foe]')].filter((entry) => entry.checked).map((entry) => entry.value);
        const characterIds = [...box.querySelectorAll('[data-party]')].filter((entry) => entry.checked).map((entry) => entry.value);
        handlers.onStartFight?.(opponentIds, box.querySelector('[data-range]').value, characterIds);
      } })));
}

export function renderNow(state, handlers = {}) {
  if (state.setupPhase) return setupColumn(state).filter(Boolean);
  if (state.fighters?.length) return fightColumn(state, handlers).filter(Boolean);
  // v0.230.0: a ship fight takes the centre scene (shipFightScene in
  // renderScene) with the roster, phase and actions already on it — this
  // column just needs to stop showing the port procedure underneath it,
  // the same way fightColumn's early return does for a personal fight.
  if (state.staging) return stagingColumn(state.staging, handlers);
  if (state.shipFight) {
    const fight = state.shipFight;
    return [
      h('header', { class: 'now-head' },
        h('h1', { text: 'Ship fight' }),
        h('p', { text: `${fight.opponentLabel} \u2014 ${fight.outcome === 'in-progress' ? `turn ${fight.gameTurn}, ${fight.phase}` : 'over'}` })),
      state.notice ? h('p', { class: `notice${state.notice.ok ? '' : ' is-error'}`, role: 'status', text: state.notice.message }) : null
    ].filter(Boolean);
  }
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
  if (state.checklist) parts.push(checklistPanel(state.checklist));
  // v0.315.6: a hijacking or a boarding halts the trip for a personal fight.
  if (state.boardFight) {
    parts.push(startFight(state, handlers, { open: true })
      ?? h('p', { class: 'empty', text: `There are no actors to put against the party yet. Add ${state.boardFight.opponents} as a statblock in the Actors tab, then start the fight here.` }));
  }
  if (state.hold) parts.push(h('p', { class: 'hold-note', text: state.hold }));
  if (state.roster?.length) parts.push(h('ul', { class: 'roster', 'aria-label': 'Who is fighting' }, state.roster.map(rosterRow)));
  const open = (state.steps ?? []).filter((step) => step.state !== 'done');
  const finished = [...(state.done ?? []), ...(state.steps ?? []).filter((step) => step.state === 'done').map((step) => `${step.title}, ${step.figure}`)];
  if (open.length) parts.push(h('ul', { class: 'steps', 'aria-label': 'Also possible now' }, open.map((step) => stepRow(step, handlers))));
  if (finished.length) parts.push(h('p', { class: 'done-line' }, h('span', { class: 'done-label', text: 'Done ' }), finished.join('. ') + '.'));
  return parts;
}

// ------------------------------------------------------------------ scenes

function worldCaption(system, { role, label, world = null, note = null } = {}) {
  const profile = parseUniversalWorldProfile(system.mainWorld.uwp);
  // v0.227.0: Book 3's PLANETARY CHARACTERISTICS, in the order and under the
  // names the book prints them, with the UWP digit each is read from. The
  // caption used to run five of the eight together as prose and leave out
  // size, government and technological index entirely.
  // v0.227.1: the label already says what the thing is, so the description
  // must not repeat it. "Tech level 9 / Technological index 9" said one fact
  // twice; "Starport A / Excellent quality installation" and "Population 9 /
  // Billions of inhabitants" each carried a word the row header had already
  // given. The package's strings are left alone — other callers read them as
  // sentences — and trimmed here, where the label supplies the context.
  const trim = (text) => {
    let out = String(text ?? '');
    if (/^no starport$/i.test(out)) return 'None';           // stripping the noun would leave "No"
    if (/desert/i.test(out)) return 'Desert';                 // "No free-standing water / desert"
    if (/water world/i.test(out)) return 'Water world';       // "No land masses / water world"
    out = out
      .replace(/\s*installation\b/i, '')                     // Starport: "Good quality installation"
      .replace(/^No inhabitants$/i, 'None')                 // Population 0, to match the rest
      .replace(/\s*of inhabitants\b/i, '')                   // Population: inconsistent in the source
      .replace(/(\d+%)\s*water\b/i, '$1')                    // Hydrographics: the label says water
      .replace(/\s*\(approx\.\)\s*$/, '')
      .trim();
    return out ? out.replace(/^./, (first) => first.toUpperCase()) : null;
  };

  const rows = [
    ['Starport', profile.starport, describeStarport(profile.starport), 'starport'],
    ['Size', profile.size, describeWorldSize(profile.size), 'size'],
    ['Atmosphere', profile.atmosphere, describeAtmosphere(profile.atmosphere), 'atmosphere'],
    ['Hydrographics', profile.hydrographics, describeHydrographics(profile.hydrographics), 'hydrographics'],
    ['Population', profile.population, describePopulation(profile.population), 'population'],
    ['Government', profile.government, describeGovernment(profile.government), 'government'],
    ['Law level', profile.lawLevel, describeLawLevel(profile.lawLevel), 'lawLevel'],
    // Book 3 gives the technological index no wording of its own; the digit
    // is the whole of it, so nothing is printed beside it.
    ['Tech level', profile.techLevel, null, 'techLevel']
  ];
  const bases = [system.bases?.naval ? 'Naval base' : null, system.bases?.scout ? 'Scout base' : null, system.gasGiant ? 'Gas giant' : null].filter(Boolean);
  return h('div', { class: `caption caption-${role}` },
    h('p', { class: 'caption-role', text: label }),
    h('h2', {}, system.name, ' ', h('span', { class: 'code', text: system.mainWorld.uwp })),
    h('dl', { class: 'uwp' }, rows.flatMap(([label, digit, text, key]) => {
      const detail = trim(text);
      // Book 3's fuller reading sits on the row rather than in the line, for
      // the five characteristics whose detail is reference rather than a
      // decision. Starport and atmosphere carry theirs in plain sight below.
      const title = world?.detail?.[key] ?? null;
      return [
        h('dt', { title, text: label }),
        h('dd', { title }, h('span', { class: 'uwp-digit code', text: String(digit) }), detail ? ` ${detail}` : null)
      ];
    })),
    // What this port can do for the ship, and what a character must wear to
    // step outside: both change what the party does here, so neither hides.
    world?.starport ? h('p', { class: 'caption-facility', text: world.starport }) : null,
    world?.gear ? h('p', { class: 'caption-gear', text: world.gear }) : null,
    // v0.315.2: Book 3 p.8's check against what the party carries is a row
    // in the port column now; on the caption it grew with every character.
    (() => {
      // Book 3 pp.21-22: the classifications a world's own profile earns it.
      let trade = [];
      try { trade = describeTradeClassifications(profile); } catch { trade = []; }
      const labels = (Array.isArray(trade) ? trade : []).map((entry) => entry?.label ?? String(entry)).filter(Boolean);
      const notes = [...labels, ...bases];
      return notes.length ? h('p', { class: 'caption-bases', text: notes.join(' \u00b7 ') }) : null;
    })(),
    note ? h('p', { class: `caption-lane${note.warn ? ' is-warning' : ''}`, text: note.text }) : null,
    null);
}

// v0.303.0: the map's zoom (Kurt, Sep 2026: a narrow scene put the selected
// world's card below a map too tall to see past). A view holds no state, so
// the setting lives in the browser and is applied straight to the drawing.
const MAP_ZOOMS = Object.freeze([0.4, 0.5, 0.6, 0.75, 0.9, 1, 1.25, 1.5, 2]);
function savedMapZoom() {
  try { const saved = Number(globalThis.localStorage?.getItem('traveller.mapZoom')); return MAP_ZOOMS.includes(saved) ? saved : 1; } catch { return 1; }
}

// v0.315.2: the lanes can be turned off (Kurt, Sep 2026), and say what they
// are. Like the zoom, a view setting kept in the browser.
function savedLanesShown() {
  try { return globalThis.localStorage?.getItem('traveller.mapLanes') !== 'off'; } catch { return true; }
}

function lanesToggle(svg) {
  const button = h('button', { type: 'button', class: 'button is-small map-lanes', 'aria-pressed': String(savedLanesShown()), title: 'Show or hide the charted space lanes', text: 'Lanes' });
  button.onclick = () => {
    const on = svg.classList.toggle('hide-lanes') === false;
    button.setAttribute('aria-pressed', String(on));
    try { globalThis.localStorage?.setItem('traveller.mapLanes', on ? 'on' : 'off'); } catch { /* private window */ }
  };
  return button;
}

function lanesLegend() {
  const row = (kind, text) => h('li', {}, h('span', { class: `legend-swatch is-${kind}`, 'aria-hidden': 'true' }), h('span', { text }));
  return h('details', { class: 'map-legend' },
    h('summary', { text: 'Key' }),
    h('ul', {},
      row('lane', 'Charted lane: the starport sells a flight-plan cassette for it (Book 3 p.2, Book 2 p.32)'),
      row('here', 'The same, for a lane from the world the ship is at'),
      row('reach', 'In jump range'),
      row('off', 'In jump range but off the lanes: needs the Generate program')));
}

function mapZoomControl(svg) {
  const level = h('button', { type: 'button', class: 'map-zoom-level', title: 'Fit the map to the panel', text: `${Math.round(savedMapZoom() * 100)}%` });
  const set = (value) => {
    svg.style.setProperty('--map-zoom', String(value));
    level.textContent = `${Math.round(value * 100)}%`;
    try { globalThis.localStorage?.setItem('traveller.mapZoom', String(value)); } catch { /* private window */ }
  };
  const step = (direction) => {
    const index = MAP_ZOOMS.indexOf(savedMapZoom());
    set(MAP_ZOOMS[Math.max(0, Math.min(MAP_ZOOMS.length - 1, (index < 0 ? MAP_ZOOMS.indexOf(1) : index) + direction))]);
  };
  level.onclick = () => set(1);
  svg.style.setProperty('--map-zoom', String(savedMapZoom()));
  return h('div', { class: 'map-zoom', role: 'group', 'aria-label': 'Map zoom' },
    h('button', { type: 'button', title: 'Zoom out', 'aria-label': 'Zoom out', text: '\u2212', onclick: () => step(-1) }),
    level,
    h('button', { type: 'button', title: 'Zoom in', 'aria-label': 'Zoom in', text: '+', onclick: () => step(1) }));
}

export function subsectorScene(scene, { onSelectSystem, onCommand }, readOnly = false) {
  const subsector = FAR_MERIDIAN_SUBSECTOR;
  let current;
  try { current = getSubsectorSystem(subsector, scene.currentId ?? scene.fromId); } catch { current = null; }
  if (!current) return [h('p', { class: 'scene-title', text: `${subsector.name} subsector. This campaign's location is not on it.` })];
  const selectedId = scene.selectedId ?? scene.toId ?? scene.courseId ?? null;
  let selected = null;
  try { selected = selectedId ? getSubsectorSystem(subsector, selectedId) : null; } catch { selected = null; }
  const reachable = new Map(getJumpDestinations(subsector, current.id, scene.jump ?? 0).map((entry) => [entry.system.id, entry.distance]));
  // v0.315.0: the charted lanes (Book 3 p.2) and, from here, the worlds in
  // range none of them reaches, which need the Generate program (Book 2 p.32).
  const rule = scene.lanes ?? 'charted';
  const lanes = rule === 'never' ? [] : (subsector.routes ?? []);
  const onLane = (id) => rule === 'always' || (rule === 'charted' && laneBetween(subsector, current.id, id));
  const offLane = new Set([...reachable.keys()].filter((id) => !onLane(id)));
  const svg = renderSubsectorMap({
    subsector, columns: SUBSECTOR_COLUMNS, rows: SUBSECTOR_ROWS, current, selected, reachable, lanes, offLane,
    onSelect: scene.kind === 'subsector' ? (system) => onSelectSystem(system.id === current.id ? null : system.id) : null
  });
  svg.classList.add('map');
  if (!savedLanesShown()) svg.classList.add('hide-lanes');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const inJump = scene.kind === 'jump';
  const captions = inJump ? [] : [worldCaption(current, { role: 'here', label: 'You are here', world: scene.world })];
  if (selected && selected.id !== current.id) {
    const distance = reachable.get(selected.id);
    const course = selected.id === scene.courseId;
    const away = `${course ? 'Course set, ' : ''}${distance} parsec${distance === 1 ? '' : 's'} away`;
    const note = inJump || !Number.isFinite(distance) ? null
      : offLane.has(selected.id)
        ? { warn: !scene.generate, text: scene.generate ? 'Off the charted lanes: the Generate program plots the jump (Book 2 p.32).' : 'Off the charted lanes: no cassette is sold for it, and this ship does not carry the Generate program (Book 2 p.32).' }
        : { warn: false, text: 'On a charted lane: the starport sells the flight-plan cassette (Book 2 p.32).' };
    // v0.315.2: the course is set from the map head or the column, not here.
    captions.push(Number.isFinite(distance)
      ? worldCaption(selected, { role: 'there', label: inJump ? `Bound for, ${scene.days - scene.day} days out` : away, note })
      : h('div', { class: 'caption caption-there' }, h('p', { class: 'caption-role', text: 'Out of range' }),
        h('h2', { text: selected.name }), h('p', { class: 'caption-facts', text: `Beyond Jump-${scene.jump} from ${current.name}.` })));
  }
  // v0.315.1: the course button also sits in the map's head, which is always
  // on screen; the caption's own copy can be below the fold.
  const chosen = selected && selected.id !== current.id && Number.isFinite(reachable.get(selected.id)) && !inJump && scene.canSetCourse && selected.id !== scene.courseId;
  // v0.315.5: the jump's day clock sits in the head beside its own label. It
  // was pinned absolute to the scene's top right, where the Key, Lanes and
  // zoom controls now are, and read as a row of empty buttons over them.
  const clock = scene.kind === 'jump'
    ? h('span', { class: 'jump-clock', role: 'img', 'aria-label': `Day ${scene.day} of ${scene.days} in jump` },
      h('span', { class: 'jump-clock-label', text: `Jump day ${scene.day} of ${scene.days}` }),
      h('span', { class: 'jump-clock-days' }, Array.from({ length: scene.days }, (_, index) => h('span', { class: index < scene.day ? 'is-spent' : '' }))))
    : null;
  const parts = [
    h('div', { class: 'scene-title map-head' }, h('span', { text: `${subsector.name} subsector` }),
      clock,
      chosen ? h('span', { class: 'map-course' }, kindButton({ label: `Set course for ${selected.name}`, kind: 'travel', primary: true }, { small: true, onclick: () => onCommand?.(`trip:choose-destination:${selected.id}`) })) : null,
      lanes.length ? lanesLegend() : null,
      lanes.length ? lanesToggle(svg) : null,
      mapZoomControl(svg)),
    svg,
    h('div', { class: 'captions' }, captions)
  ];
  return parts;
}

// Book 1 p.29 (1977): lined paper, drawn across the whole scene. Same band
// close, next band short, 2-5 medium, 6-9 long, 10-14 very long, 15 escaped.
// The bands have no size in metres; they are steps of range. Ranges
// are read from the selected marker; its declared target gets a line.
// v0.255.0: the band line runs across the screen, not down it (Kurt,
// Sep 2026: "the range band panel is still the smallest element in the UI").
// Drawn vertically, sixteen stacked bands in a wide, short screen were
// scaled to the height and came out narrow with 9px labels. Across, bands are
// columns and the wide screen goes to the grid; and only the bands in play
// are drawn, a few past the furthest token, rather than all sixteen.
export function bandsScene(state, handlers) {
  // A board being set up may have nobody on it yet, so there may be no one to
  // read ranges from; the bands then read from band 1.
  const reader = state.fighters.find((fighter) => fighter.id === state.scene.selected) ?? state.fighters[0] ?? null;
  const edge = ENCOUNTER_RANGE_LINE_ESCAPE_BANDS + 1;
  const furthest = state.fighters.reduce((most, fighter) => Math.max(most, Number(fighter.band ?? 0)), 0);
  // Room to drag someone a few bands out while setting up, and to see where
  // the next band or two of movement lands; never fewer than eight.
  const fitted = Math.min(edge, Math.max(8, furthest + 4));
  // v0.257.0: the referee can zoom — out to the whole field to show how far
  // the edge is, or in on a few bands. state.bandsShown is that choice; left
  // unset the board fits the bands in play.
  const shown = Math.max(3, Math.min(edge, Number(state.bandsShown) || fitted));
  // v0.265.0: a crowded band widens instead of the whole board shrinking.
  // The board used to grow taller with the deepest stack, and since it is
  // drawn to fit its box, eleven Mercenaries in one band shrank every token
  // on it. Now the height is fixed at ROWS tokens; a band holding more lays
  // them out in side-by-side columns and is drawn that much wider, so a
  // token is the same size however many share a band.
  const ribbon = 26;
  const foot = 22;
  const ROWS = 6;
  const SUB_COLUMN = 118;
  const height = 480;
  const rowH = (height - ribbon - 12 - foot) / ROWS;
  const baseW = 1200 / shown;
  const perBand = new Map();
  for (const fighter of state.fighters) perBand.set(fighter.band, (perBand.get(fighter.band) ?? 0) + 1);
  const subColumns = (band) => Math.max(1, Math.ceil((perBand.get(band) ?? 0) / ROWS));
  const bandW = [];
  const bandX = [];
  let width = 0;
  for (let band = 0; band < shown; band += 1) {
    const columns = subColumns(band);
    bandX.push(width);
    bandW.push(columns > 1 ? Math.max(baseW, columns * SUB_COLUMN) : baseW);
    width += bandW[band];
  }
  const svg = createSvgNode('svg', { viewBox: `0 0 ${width} ${height}`, class: 'bands is-across', preserveAspectRatio: 'xMidYMin meet', role: 'group', 'aria-label': 'Range bands' });

  const bandRects = [];
  // The range names across the top, read from the selected token.
  const spans = [];
  for (let band = 0; band < shown; band += 1) {
    const gap = Math.abs(band - (reader?.band ?? 0));
    const name = gap >= ENCOUNTER_RANGE_LINE_ESCAPE_BANDS ? 'Out of range' : RANGE_NAMES[rangeBandForBandGap(gap)];
    const last = spans[spans.length - 1];
    if (last && last.name === name) last.to = band; else spans.push({ name, from: band, to: band, own: gap === 0 });
  }
  for (const span of spans) {
    const x = bandX[span.from];
    const w = bandX[span.to] + bandW[span.to] - x;
    svg.append(createSvgNode('rect', { x: x + 1, y: 1, width: w - 2, height: ribbon - 2, class: `span-ribbon${span.own ? ' is-own' : ''}` }));
    const label = createSvgNode('text', { x: x + w / 2, y: ribbon - 8, class: 'span-label', 'text-anchor': 'middle' });
    label.textContent = span.name.toUpperCase();
    svg.append(label);
  }
  for (let band = 0; band < shown; band += 1) {
    const gap = Math.abs(band - (reader?.band ?? 0));
    const rect = createSvgNode('rect', { x: bandX[band], y: ribbon + 4, width: bandW[band], height: height - ribbon - 4 - foot, class: `band${gap === 0 ? ' is-own' : ''}` });
    bandRects.push(rect);
    svg.append(rect);
    const number = createSvgNode('text', { x: bandX[band] + bandW[band] / 2, y: height - 6, class: 'band-number', 'text-anchor': 'middle' });
    // A widened band says how many it holds, so the extra width reads as a
    // crowd rather than as a longer stretch of range.
    number.textContent = subColumns(band) > 1 ? `${band + 1} \u00b7 ${perBand.get(band)} here` : String(band + 1);
    svg.append(number);
  }

  // Tokens fill down their band's column, then into the next column across.
  // One beyond the drawn bands (zoomed in past it) sits off the right edge,
  // as it always has.
  const at = new Map();
  const placed = new Map();
  for (const fighter of state.fighters) {
    const band = Number(fighter.band ?? 0);
    const index = placed.get(band) ?? 0;
    placed.set(band, index + 1);
    const row = index % ROWS;
    const cy = ribbon + 12 + row * rowH + rowH / 2 - 8;
    if (band < 0 || band >= shown) { at.set(fighter.id, { cx: width + baseW * (band - shown + 0.5), cy }); continue; }
    const columns = subColumns(band);
    const pitch = bandW[band] / columns;
    at.set(fighter.id, { cx: bandX[band] + Math.floor(index / ROWS) * pitch + pitch / 2, cy });
  }
  // Every order on the sheet is drawn, so the board and the table say the same
  // thing: a solid line for an attack, a dashed one for movement without one.
  for (const row of state.sheetRows ?? []) {
    if (row.down || !row.targetId || !at.has(row.targetId)) continue;
    const from = at.get(row.fighter.id);
    const to = at.get(row.targetId);
    svg.append(createSvgNode('line', { x1: from.cx, y1: from.cy, x2: to.cx, y2: to.cy, class: `target-line is-${row.fighter.side}${row.attacks ? '' : ' is-move'}` }));
  }
  for (const fighter of state.fighters) {
    const { cx, cy } = at.get(fighter.id);
    const down = isDown(fighter);
    const group = createSvgNode('g', {
      class: `marker is-${fighter.side}${down ? ' is-down' : ''}${fighter === reader ? ' is-selected' : ''}`,
      role: 'button', tabindex: '0', 'aria-label': `${fighter.name}, band ${fighter.band + 1}`
    });
    // The selected token wears a ring, so which one is selected can be read
    // off the board itself (Kurt, Sep 2026).
    if (fighter === reader) group.append(createSvgNode('circle', { cx, cy, r: 24, class: 'marker-ring' }));
    group.append(createSvgNode('circle', { cx, cy, r: 17 }));
    const initial = createSvgNode('text', { x: cx, y: cy + 5, class: 'marker-initial', 'text-anchor': 'middle' });
    initial.textContent = shortName(fighter);
    const name = createSvgNode('text', { x: cx, y: cy + 34, class: 'marker-name', 'text-anchor': 'middle' });
    name.textContent = down ? `${fighter.name} (down)` : fighter.name;
    group.append(initial, name);
    group.addEventListener('click', () => { if (!group.dataset.dragged) handlers.onSelectMarker(fighter.id); delete group.dataset.dragged; });
    group.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handlers.onSelectMarker(fighter.id); } });
    // Hover is remembered so T can target whatever is under the pointer —
    // Foundry's gesture, and the old client's.
    group.addEventListener('mouseenter', () => handlers.onHoverMarker?.(fighter.id));
    group.addEventListener('mouseleave', () => handlers.onHoverMarker?.(null));
    group.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      handlers.onSelectMarker(fighter.id);
      handlers.onFighterMenu?.(fighter, { x: event.clientX, y: event.clientY });
    });
    // While the board is being set up, a token is dragged to its band.
    // v0.268.0: the token follows the pointer and the band under it lights
    // up. It used to stay put until released, and the press selected the
    // board's text instead, so a drag looked as if nothing was happening
    // (Kurt, Sep 2026). The token moves across only: a band is a column.
    if (state.setupPhase) {
      group.classList.add('is-draggable');
      group.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        const start = event.clientX;
        const origin = svgX(svg, event.clientX, event.clientY);
        let lit = null;
        const light = (band) => {
          if (lit === band) return;
          if (lit !== null) bandRects[lit]?.classList.remove('is-drop');
          lit = band;
          if (lit !== null && lit !== fighter.band) bandRects[lit]?.classList.add('is-drop');
        };
        const move = (moved) => {
          if (Math.abs(moved.clientX - start) > 6) { group.dataset.dragged = '1'; group.classList.add('is-dragging'); }
          if (!group.dataset.dragged) return;
          const x = svgX(svg, moved.clientX, moved.clientY);
          if (x !== null && origin !== null) group.setAttribute('transform', `translate(${x - origin} 0)`);
          light(bandAt(svg, moved.clientX, moved.clientY, bandX, bandW));
        };
        const drop = (released) => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', drop);
          light(null);
          group.classList.remove('is-dragging');
          group.removeAttribute('transform');
          if (!group.dataset.dragged) return;
          const band = bandAt(svg, released.clientX, released.clientY, bandX, bandW);
          if (band !== null && band !== fighter.band) handlers.onRepositionToken?.(fighter.id, band);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', drop);
      });
    }
    svg.append(group);
  }
  // A character or actor dragged in from the sidebar's Actors tab lands on
  // the band it is dropped on.
  if (state.setupPhase) {
    svg.addEventListener('dragover', (event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
    svg.addEventListener('drop', (event) => {
      event.preventDefault();
      let data = null;
      try { data = JSON.parse(event.dataTransfer.getData('application/x-traveller-actor') || 'null'); } catch { data = null; }
      if (!data) return;
      const band = bandAt(svg, event.clientX, event.clientY, bandX, bandW);
      if (band !== null) handlers.onDropActor?.(data, band);
    });
  }
  const zoom = (next) => handlers.onBandZoom?.(next);
  return [
    h('div', { class: 'band-bar' },
      h('p', { class: 'scene-title', text: reader
        ? `Ranges read from ${reader.name}. Bands 1\u2013${shown} of ${ENCOUNTER_RANGE_LINE_ESCAPE_BANDS} shown; one band a round, two at a run.`
        : 'Drag characters and actors from the Actors tab onto a band.' }),
      h('span', { class: 'band-zoom', role: 'group', 'aria-label': 'Zoom the band line' },
        h('button', { type: 'button', class: 'button is-small', 'aria-label': 'Show fewer bands', disabled: shown <= 3, text: '+', onclick: () => zoom(Math.max(3, shown - 2)) }),
        h('button', { type: 'button', class: 'button is-small', 'aria-label': 'Show more bands', disabled: shown >= edge, text: '\u2212', onclick: () => zoom(Math.min(edge, shown + 2)) }),
        h('button', { type: 'button', class: `button is-small${state.bandsShown ? '' : ' is-chosen'}`, text: 'Fit', onclick: () => zoom(null) }),
        h('button', { type: 'button', class: `button is-small${Number(state.bandsShown) === edge ? ' is-chosen' : ''}`, text: `All ${edge}`, onclick: () => zoom(edge) }))),
    svg
  ];
}

// A point on screen in the board's own units, or null before it is drawn.
function svgX(svg, clientX, clientY) {
  const matrix = svg.getScreenCTM?.();
  if (!matrix) return null;
  return new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse()).x;
}

// Which band a point on screen falls in, or null if it is off the board.
function bandAt(svg, clientX, clientY, bandX, bandW) {
  const matrix = svg.getScreenCTM?.();
  if (!matrix) return null;
  const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
  const band = bandX.findIndex((x, index) => point.x >= x && point.x < x + bandW[index]);
  return band >= 0 ? band : null;
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
  if (state.staging) return stagingScene(state.staging, handlers);
  if (state.shipFight) return shipFightScene(state.shipFight, handlers);
  const scene = state.scene;
  // v0.252.0: a personal fight is a screen, not a band grid with a table
  // squeezed in beside it.
  if ((state.fighters?.length || state.setupPhase) && scene.kind === 'bands') return fightScene(state, handlers);
  if (scene.kind === 'bands') return bandsScene(state, handlers);
  if (scene.kind === 'plot') return plotScene(state);
  return subsectorScene(scene, handlers, Boolean(state.live));
}

// v0.230.0: a lasers-only, abbreviated (Book 2 p.37) ship fight. v0.241.0
// adds the vector-mode branch (Book 2 pp.22-31) — client/vector-fight-view.js
// draws the plot itself; this function stays the roster/phase shell either
// way and only decides which centre panel goes under it.
export function shipFightScene(fight, handlers) {
  const repairBlock = (fight.repairActions?.length || fight.cancelRepairAction?.length) ? h('div', { class: 'repair-actions' },
    h('p', { class: 'cite', text: fight.repairNote }),
    h('div', { class: 'lead-actions' }, [...(fight.repairActions ?? []), ...(fight.cancelRepairAction ?? [])].map((action) =>
      h('button', { type: 'button', class: 'button is-small', text: action.label, onclick: () => handlers.onCommand?.(action.command) })))
  ) : null;
  const centre = fight.spatialMode === 'vector'
    ? [renderVectorFight(fight, handlers), repairBlock].filter(Boolean)
    : h('div', { class: 'ship-fight-actions' },
        h('div', { class: 'lead-actions' }, (fight.actions ?? []).map((action) =>
          kindButton(action, { small: !action.primary, onclick: () => handlers.onCommand?.(action.command) }))),
        // Kept visually apart from the row above: repair is a standing
        // declaration for the game turn, not a phase-ending action like
        // Fire/Hold/Flee, and clicking one of these alone advances nothing.
        repairBlock);
  const lead = h('header', { class: 'lead' },
    h('h2', { text: fight.outcome === 'in-progress' ? `Ship fight \u2014 turn ${fight.gameTurn}, ${fight.phase}` : 'Ship fight \u2014 over' }),
    h('p', { text: fight.outcome === 'in-progress'
      ? (fight.spatialMode === 'vector' ? 'Book 2 pp.22-31: vector movement.' : 'Book 2 p.37: abbreviated combat, no range. Every operational laser turret fires at the one foe.')
      : { disabled: 'Disabled and adrift \u2014 a boarding is uncontested.', disarmed: 'No working weapon left, but it can still run.', disengaged: 'It broke off.' }[fight.outcome] ?? `Outcome: ${fight.outcome}` }));
  const blocked = fight.fireBlocked && fight.outcome === 'in-progress' ? h('p', { class: 'notice is-warning', text: fight.fireBlocked }) : null;
  const roster = h('ul', { class: 'entries' }, fight.roster.map((ship) => h('li', { class: `entry${ship.side === 'native' ? ' is-active' : ''}` },
    h('span', { class: 'entry-name', text: ship.name }),
    h('span', { class: 'entry-note', text: `${ship.armedTurrets} armed turret${ship.armedTurrets === 1 ? '' : 's'}${ship.adrift ? ', adrift' : ''}${ship.decompressed ? ', hull breached' : ''}${ship.fled && !ship.escaped ? `, fleeing (${ship.shotsRemainingBeforeEscape} shot${ship.shotsRemainingBeforeEscape === 1 ? '' : 's'} left)` : ''}${ship.escaped ? ', escaped' : ''}${ship.surrendered ? ', surrendered' : ''}` }),
    renderSectionStrip(ship.strip, { label: `${ship.name}: sections` }),
    ship.repairing ? h('span', { class: 'entry-note', text: `Repairing: ${ship.repairing} (Book 2 p.35)` }) : null,
    ship.toothless ? h('span', { class: 'entry-flag', text: 'TOOTHLESS' }) : null)));
  // An empty log renders nothing: a bare null handed to replaceChildren is
  // stringified by the DOM into the text "null" (v0.242.0).
  const log = fight.log.length ? h('div', { class: 'fight-log' }, h('ul', { class: 'entries' }, fight.log.map((line) => h('li', { class: 'entry' }, h('span', { class: 'entry-note', text: line }))))) : null;
  // v0.246.0: the vector plot needs the scene's one stretching row to itself.
  // Stacked under the roster and the log it got whatever height was left,
  // which was none, so the fight has its own two-column shell instead.
  if (fight.spatialMode === 'vector') {
    // v0.247.0: p.23's turn track across the top, the plot in the middle,
    // p.24's data cards and the log down the side. The roster line stays
    // under the cards for the flags the card itself does not carry
    // (fleeing, escaped, surrendered).
    return [h('div', { class: 'ship-fight is-vector' },
      lead,
      renderPhaseTrack(fight),
      h('div', { class: 'ship-fight-main' }, centre),
      h('aside', { class: 'ship-fight-side', 'aria-label': 'Ship data cards and log' }, renderDataCards(fight), roster, log))];
  }
  return [lead, blocked, roster, log, centre].filter(Boolean);
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

// v0.219.0: the referee changes what a character is. Book 1 leaves the last
// word with the referee, and until now nothing here could exercise it — an
// unnamed party member could not even be named.
function refereeEditor(c, state, handlers) {
  if (!state.live || state.seat === 'player' || !c.editable) return null;
  const send = (field, value) => handlers.onEditCharacter?.(c.id, field, value);
  const scores = ['STR', 'DEX', 'END'];
  return h('details', { class: 'editor' },
    h('summary', {}, h('h3', { text: 'Change this character' })),
    h('p', { class: 'cite', text: 'Referee only. A characteristic cannot go above its original; at zero the character is unconscious, at three zeros dead.' }),
    h('form', { class: 'editor-row', onsubmit: (event) => { event.preventDefault(); send('name', new FormData(event.currentTarget).get('name')); } },
      h('input', { name: 'name', type: 'text', value: c.name, 'aria-label': 'Name' }),
      h('button', { type: 'submit', class: 'button is-small', text: 'Rename' })),
    h('form', { class: 'editor-row', onsubmit: (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      send('current', Object.fromEntries(scores.map((key) => [key, data.get(key)])));
    } },
      scores.map((key) => h('label', { class: 'editor-score' }, h('span', { text: key }),
        h('input', { name: key, type: 'number', min: '0', max: String(c.editable.full[key]), value: String(c.editable.current[key] ?? c.editable.full[key]), 'aria-label': `${key} now, of ${c.editable.full[key]}` }),
        h('small', { text: `/${c.editable.full[key]}` }))),
      h('button', { type: 'submit', class: 'button is-small', text: 'Set' })),
    h('form', { class: 'editor-row', onsubmit: (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      send('loadout', { weaponKey: data.get('weaponKey'), armor: data.get('armor') });
    } },
      h('select', { name: 'weaponKey', 'aria-label': 'Weapon in hand' },
        (state.weaponCatalog ?? []).map((weapon) => h('option', { value: weapon.key, selected: weapon.key === c.editable.weaponKey, text: weapon.name }))),
      h('select', { name: 'armor', 'aria-label': 'Armor worn' },
        (state.armorCatalog ?? []).map((armor) => h('option', { value: armor, selected: armor === c.editable.armorKey, text: armor === 'none' ? 'No armor' : armor }))),
      h('button', { type: 'submit', class: 'button is-small', text: 'Arm' })));
}

function characterDrawer(c, state, handlers) {
  const live = Boolean(state.live);
  return [
    state.party?.length > 1 ? h('div', { class: 'tabs', role: 'tablist' }, state.party.map((member) => h('button', { type: 'button', role: 'tab', 'aria-selected': member.id === c.id, text: member.name || '(unnamed)', onclick: () => handlers.onPickCharacter(member.id) }))) : null,
    h('header', { class: 'drawer-head' }, h('h2', { text: c.name || '(unnamed character)' }), h('p', {}, h('span', { class: 'code', text: c.upp }), ` ${c.service}`)),
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
    refereeEditor(c, state, handlers),
    live ? null : h('button', { type: 'button', class: 'button', text: 'Open the full personnel record' })
  ];
}

function shipDrawer(s, state, handlers) {
  const live = Boolean(state.live);
  return [
    h('header', { class: 'drawer-head' }, h('h2', { text: s.name }), h('p', { text: `${s.kind}, ${s.registry}` })),
    renderSectionStrip(s.strip),
    h('dl', { class: 'pairs' }, h('dt', { text: 'Ship’s account' }), h('dd', { text: cr(s.accountCr) }), h('dt', { text: 'Upkeep' }), h('dd', { text: s.upkeep })),
    gauge('Fuel', s.fuel, ' t'),
    gauge('Hold', s.hold, ' t', { inverse: true }),
    gauge('Staterooms', s.berths, '', { inverse: true }),
    h('h3', { text: 'Crew' }),
    h('dl', { class: 'pairs' }, s.crew.flatMap((member) => [h('dt', { text: member.name }), h('dd', { text: member.roles })])),
    h('h3', { text: 'Armament' }),
    h('p', { text: s.armament }),
    s.damage ? [h('h3', { text: 'Damage' }), h('p', { class: 'status is-hurt', text: s.damage })] : null,
    refereeShipEditor(s, state, handlers),
    live ? null : h('button', { type: 'button', class: 'button', text: 'Fit armament' })
  ];
}

// v0.238.0: the referee's fiat for a ship stuck with no way to reach fuel or
// funds through ordinary play (an empty tank at a starport with none to buy
// and no gas giant, say) — the same override refereeEditor already gives a
// character, applied to the two numbers most likely to strand a game: fuel
// aboard and the ship's own account.
function refereeShipEditor(s, state, handlers) {
  if (!state.live || state.seat === 'player') return null;
  const send = (field, value) => handlers.onEditShip?.(s.id, field, value);
  return h('details', { class: 'editor' },
    h('summary', {}, h('h3', { text: 'Change this ship' })),
    h('p', { class: 'cite', text: 'Referee only — sets state directly, no cost and no time passing.' }),
    h('form', { class: 'editor-row', onsubmit: (event) => {
      event.preventDefault();
      send('fuel', new FormData(event.currentTarget).get('fuel'));
    } },
      h('label', { class: 'editor-score' }, h('span', { text: 'Fuel' }),
        h('input', { name: 'fuel', type: 'number', min: '0', max: String(s.fuel.full), value: String(s.fuel.now), 'aria-label': `Fuel now, of ${s.fuel.full}` }),
        h('small', { text: `/${s.fuel.full} t` })),
      h('button', { type: 'submit', class: 'button is-small', text: 'Set' })),
    h('form', { class: 'editor-row', onsubmit: (event) => {
      event.preventDefault();
      send('account', new FormData(event.currentTarget).get('account'));
    } },
      h('label', { class: 'editor-score' }, h('span', { text: 'Account' }),
        h('input', { name: 'account', type: 'number', min: '0', step: '1', value: String(s.accountCr), 'aria-label': 'Ship’s account, in credits' })),
      h('button', { type: 'submit', class: 'button is-small', text: 'Set' })));
}

// v0.221.0: the referee's directory. Your old toolbar's tabs, behind one chip:
// a folder tree on the left of the panel, the open folder's entries on the
// right, and a search that ignores folders because that is what searching is
// for. Only the open folder is drawn, so a campaign with thousands of actors
// costs no more to show than one with ten.
// v0.285.0: the Players tab as one list, no folders — the join link, who is
// asking, who is seated with which character, and anyone whose player has
// gone. Roll20's player list and D&D Beyond's campaign page, in one place.
function playersPanel(model, state, handlers) {
  const act = (action, value) => handlers.onSeat?.(action, value);
  const when = (time) => {
    if (!time) return 'not yet seen';
    const minutes = Math.round((Date.now() - time) / 60000);
    if (minutes < 2) return 'here now';
    if (minutes < 90) return `seen ${minutes} minutes ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 36) return `seen ${hours} hours ago`;
    return `seen ${new Date(time).toLocaleDateString()}`;
  };
  const section = (title, rows, empty) => h('section', { class: 'players-section' },
    h('h3', { class: 'players-heading', text: title }),
    rows.length ? h('ul', { class: 'entries' }, rows) : h('p', { class: 'empty', text: empty }));
  return [
    h('section', { class: 'players-section players-link' },
      h('h3', { class: 'players-heading', text: 'Join link' }),
      h('p', { class: 'cite', text: model.link ? 'Players open it and choose a character to join with.' : 'No link yet. Make one to invite players.' }),
      state.live ? h('div', { class: 'lead-actions' },
        model.link ? h('button', { type: 'button', class: 'button is-small is-primary', text: 'Copy link', onclick: () => act('copy-link', { code: model.link }) }) : null,
        h('button', { type: 'button', class: 'button is-small', text: model.link ? 'Reset link' : 'Make a link',
          title: model.link ? 'A new link; the old one stops working' : 'Make the campaign\u2019s join link', onclick: () => act('reset-link', {}) })) : null,
      state.live ? h('label', { class: 'sheet-check', title: 'Off: players who open your link join at once, and you can Remove anyone' },
        h('input', { type: 'checkbox', checked: model.approvePlayers, onchange: (event) => act('approve-setting', event.currentTarget.checked) }),
        ' Approve players myself') : null),
    !model.approvePlayers && !model.requests.length ? null : section(`${model.approvePlayers ? 'Asking to join' : 'Joining'} (${model.requests.length})`, model.requests.map((request) => h('li', { class: 'entry' },
      h('span', { class: 'entry-name', text: request.characterName ? `${request.characterName}` : request.name }),
      h('span', { class: 'entry-note', text: model.approvePlayers ? `${request.name}` : `${request.name} \u00b7 coming in now` }),
      state.live && model.approvePlayers ? h('span', { class: 'seat-actions' },
        h('button', { type: 'button', class: 'button is-small', text: 'Approve', onclick: () => act('admit', { kind: 'join', uid: request.uid, characterId: request.characterId, name: request.name }) }),
        h('button', { type: 'button', class: 'button is-small', text: 'Decline', onclick: () => act('decline', { kind: 'join', uid: request.uid }) })) : null)), 'Nobody is waiting.'),
    state.live ? h('p', { class: 'cite' },
      h('button', { type: 'button', class: 'button is-small', text: 'Refresh', title: 'Read seats, links and joins again', onclick: () => act('refresh', {}) }), ' ',
      h('button', { type: 'button', class: 'button is-small', text: 'Copy diagnostics', title: 'Copy what this page knows about players and joins, to paste to Claude', onclick: () => act('diagnostics', {}) })) : null,
    section(`Players (${model.members.length})`, model.members.map((member) => h('li', { class: 'entry' },
      h('span', { class: 'entry-name', text: member.name }),
      h('span', { class: 'entry-note', text: `${member.characters.length
        ? `plays ${member.characters.map((entry) => entry.name).join(', ')}`
        : member.joining ? `bringing in ${member.joining.characterName ?? member.joining.character?.identity?.name ?? 'their character'}\u2026` : 'no character here; ask them to open your link again'} \u00b7 ${when(member.lastSeenAt)}` }),
      state.live ? h('span', { class: 'seat-actions' },
        !member.characters.length && member.joining ? h('button', { type: 'button', class: 'button is-small is-primary', text: 'Bring in', title: 'Bring their character into the campaign now',
          onclick: () => act('admit', { kind: 'join', uid: member.uid, characterId: member.joining.characterId ?? null, name: member.name }) }) : null,
        ...member.characters.map((entry) => h('button', { type: 'button', class: 'button is-small', text: 'Sheet', title: `Open ${entry.name}\u2019s sheet`, onclick: () => handlers.onOpenSheet?.('actor', entry.id) })),
        h('button', { type: 'button', class: 'button is-small', text: 'Remove', title: 'Remove this player; their character goes home with them', onclick: () => act('remove', member) })) : null)), 'No players seated yet.'),
    model.departed.length ? section('Player gone', model.departed.map((entry) => h('li', { class: 'entry' },
      h('span', { class: 'entry-name', text: entry.name }),
      h('span', { class: 'entry-note', text: entry.fighting ? 'their player left; this waits until the fight ends' : 'their player has left the campaign' }),
      state.live && !entry.fighting ? h('span', { class: 'seat-actions' },
        h('button', { type: 'button', class: 'button is-small', text: 'Let them go', onclick: () => act('release', { id: entry.id, name: entry.name, keepCopy: false }) }),
        h('button', { type: 'button', class: 'button is-small', text: 'Keep a copy', title: 'Keep a copy in Actors as your own', onclick: () => act('release', { id: entry.id, name: entry.name, keepCopy: true }) })) : null)), '') : null
  ];
}

function refereeDrawer(referee, state, handlers) {
  const go = (patch) => handlers.onReferee?.(patch);
  if (referee.tab === 'Players' && referee.members) {
    return [
      referee.seats?.error ? h('p', { class: 'notice is-error', text: referee.seats.error }) : null,
      ...playersPanel(referee.members, state, handlers)
    ];
  }
  const tree = referee.tree ?? [];
  const entries = referee.shown ?? [];
  // v0.254.0: the sidebar's own tab strip names the tab, so the drawer's
  // "Referee" header and its second row of tabs are gone — the screenshot
  // showed both strips at once.
  return [
    h('p', { class: 'side-count-line', text: `${referee.total} ${referee.tab.toLowerCase()} in this campaign` }),
    h('input', {
      type: 'search', class: 'search', placeholder: `Search ${referee.tab.toLowerCase()}`, value: referee.query ?? '',
      'aria-label': `Search ${referee.tab.toLowerCase()}`,
      oninput: (event) => go({ query: event.target.value })
    }),
    referee.unbuilt ? h('p', { class: 'empty', text: referee.unbuilt }) : null,
    referee.seats?.error ? h('p', { class: 'notice is-error', text: referee.seats.error }) : null,
    referee.seats?.loading ? h('p', { class: 'empty', text: 'Reading seats\u2026' }) : null,
    referee.tab === 'Players' && state.live && referee.seats ? h('div', { class: 'lead-actions' },
      h('button', { type: 'button', class: 'button is-small', text: 'New join link', title: 'Make a link players open to ask for a seat; it is copied for you', onclick: () => handlers.onSeat?.('invite', {}) })) : null,
    // v0.229.0: Foundry's directory shape for Scenes — a create button above
    // the folders, same place the Players tab puts its own lead action.
    referee.tab === 'Scenes' && state.live ? h('div', { class: 'lead-actions' },
      h('button', { type: 'button', class: 'button is-small', text: 'New scene', onclick: () => handlers.onSceneAction?.('create', null, referee.folder) }),
      h('button', { type: 'button', class: 'button is-small', text: 'New space scene', title: 'A vector board for Book 2 pp.22-31 ship combat', onclick: () => handlers.onSceneAction?.('create-space', null, referee.folder) })) : null,
    h('div', { class: 'directory' },
      referee.tab === 'Actors' && state.live ? h('div', { class: 'directory-actions' },
        h('button', { type: 'button', class: 'button is-small', text: 'Create actor', onclick: () => handlers.onCreateActor?.('actor', referee.folder) }),
        h('button', { type: 'button', class: 'button is-small', text: 'Create statblock', onclick: () => handlers.onCreateActor?.('statblock', referee.folder) })) : null,
      h('nav', { class: 'folders', 'aria-label': 'Folders' }, tree.length
        ? tree.map((folder) => h('button', {
          type: 'button',
          class: `folder-row${folder.path === referee.folder ? ' is-open' : ''}`,
          style: `padding-left:${8 + folder.depth * 12}px`,
          'aria-pressed': folder.path === referee.folder,
          onclick: () => go({ folder: folder.path, query: '' }),
          // v0.265.0: right-click a folder to rename or remove it.
          // v0.266.0: Unfiled too, whose menu files its contents instead.
          oncontextmenu: state.live && (referee.tab === 'Actors' || referee.tab === 'Scenes')
            ? (event) => { event.preventDefault(); handlers.onFolderMenu?.({ tab: referee.tab, path: folder.path }, { x: event.clientX, y: event.clientY }); }
            : null
        }, h('span', { class: 'folder-name', text: folder.name }), h('span', { class: 'folder-count', text: String(folder.count) })))
        : h('p', { class: 'empty', text: 'No folders yet.' })),
      h('ul', { class: 'entries' }, entries.length
        ? entries.map((entry) => h('li', {
          // v0.249.0: the row itself opens the document, Foundry's own
          // gesture. Right-click gives the same verbs as a menu, so the row
          // no longer has to carry a button for each of them.
          class: `entry${entry.active ? ' is-active' : ''}${entry.sheet ? ' is-openable' : ''}`,
          // v0.254.0: an Actors row drags onto the combat board.
          draggable: entry.drag ? 'true' : null,
          ondragstart: entry.drag ? (event) => {
            event.dataTransfer.setData('application/x-traveller-actor', JSON.stringify(entry.drag));
            event.dataTransfer.effectAllowed = 'copy';
          } : null,
          onclick: entry.sheet ? (event) => { if (!event.target.closest('button')) handlers.onOpenSheet?.(entry.sheet.kind, entry.sheet.id); } : null,
          oncontextmenu: entry.sheet ? (event) => { event.preventDefault(); handlers.onRowMenu?.(entry, { x: event.clientX, y: event.clientY }); } : null
        },
          entry.badge ? (entry.badge.kind === 'ship' ? shipBadge(entry.badge.typeCode, { side: entry.badge.side }) : actorBadge(entry.badge.kind, { side: entry.badge.side })) : null,
          entry.thumbnail ? entryThumb(entry.thumbnail) : null,
          h('span', { class: 'entry-name', title: entry.name, text: entry.name }),
          entry.note ? h('span', { class: 'entry-note', title: entry.note, text: entry.note }) : null,
          entry.active ? h('span', { class: 'entry-flag', text: 'ACTIVE' }) : null,
          entry.actorKind === 'statblock' ? h('span', { class: 'entry-flag is-quiet', text: 'STATBLOCK' }) : null,
          // v0.249.0: filing, renaming and deleting moved to the row's own
          // context menu, so the row itself carries no buttons.
          // A seat, an invite or a request to join: what can be done to it.
          entry.seat && state.live ? h('span', { class: 'seat-actions' },
            entry.seat.kind === 'join' ? [
              h('button', { type: 'button', class: 'button is-small', text: 'Admit', onclick: () => handlers.onSeat?.('admit', { ...entry.seat, name: entry.name }) }),
              h('button', { type: 'button', class: 'button is-small', text: 'Decline', onclick: () => handlers.onSeat?.('decline', entry.seat) })
            ] : null,
            entry.seat.kind === 'seat' ? h('button', { type: 'button', class: 'button is-small', text: 'Take back', onclick: () => handlers.onSeat?.('unseat', entry.seat) }) : null,
            entry.seat.kind === 'invite' ? h('button', { type: 'button', class: 'button is-small', text: 'Revoke', onclick: () => handlers.onSeat?.('revoke', entry.seat) }) : null
          ) : null,
          // v0.229.0: a scene's own actions — Foundry's ACTIVATE, plus filing
          // and deleting. Rename, resize and duplicate stay in the referee
          // client; this tab is for organising and activating during play.
          // Scene rows keep Activate on the row itself: it is the one verb
          // used mid-session, and hunting for it in a menu costs a click
          // every time. The rest is on the menu with everything else.
          entry.scene && state.live ? h('span', { class: 'scene-actions' },
            h('button', {
              type: 'button', class: 'button is-small', text: entry.active ? 'Deactivate' : 'Activate',
              title: entry.active ? 'Stop showing this scene to players' : 'Show this scene to every player',
              onclick: () => handlers.onSceneAction?.('activate', entry.id)
            }),
            entry.isVectorBoard ? h('button', {
              type: 'button', class: 'button is-small', text: referee.stagingSceneId === entry.id ? 'Close staging' : 'Stage',
              title: 'Place ships on this board and start a vector fight',
              onclick: () => handlers.onSceneAction?.('stage', entry.id)
            }) : null,
          ) : null,
          null))
        : [h('li', { class: 'entry' }, h('span', { class: 'empty', text: referee.query ? 'Nothing matches.' : 'This folder is empty.' }))])),
    referee.truncated ? h('p', { class: 'cite', text: `${referee.truncated} more here; narrow the search to see them.` }) : null
  ];
}

// ------------------------------------------------------------ staging
// v0.246.0: staging a space scene takes the screen, the way a fight does.
// The board (client/ship-vector-map.js's renderVectorSceneStage, built for
// the old client and still the only thing that can drag a ship or its
// velocity arrow) fills the scene column; the checklist below is the left
// column. The board draws its own copy of the three staging rows: they are
// sent to a detached host so only one of each appears, here.

function stageHost(staging, handlers) {
  const host = h('div', { class: 'staging-board' });
  // renderVectorSceneStage writes into its host and reads
  // getBoundingClientRect for its own scale maths, so it is called after
  // play.js's replaceChildren has attached this node.
  queueMicrotask(() => {
    if (!host.isConnected) return;
    renderVectorSceneStage(host, staging.scene, {
      bodies: staging.bodies,
      shipChoices: staging.choices,
      controlsHost: document.createElement('div'),
      moveShip: (tokenId, point) => handlers.onUpdateStagedShip?.(tokenId, { x: point.x, y: point.y }),
      setVector: (tokenId, velocity) => handlers.onSetShipVector?.(tokenId, velocity),
      stageShip: (choice, side) => handlers.onStageShip?.(choice, side, 0, 0),
      removeShip: (tokenId) => handlers.onUnstageShip?.(tokenId),
      placeBody: (spec) => handlers.onSceneBody?.('place', spec),
      moveBody: (bodyId, point) => handlers.onSceneBody?.('move', { bodyId, x: point.x, y: point.y }),
      removeBody: (bodyId) => handlers.onSceneBody?.('remove', bodyId),
      combatBlocked: staging.blockedReason
    });
  });
  return host;
}

function stagingScene(staging, handlers) {
  return [
    // The board draws its own footer with the scale and the drag help, so
    // this line says only what that one leaves out.
    h('p', { class: 'scene-title', text: `${staging.sceneName} \u00b7 ${staging.spanThousandMiles}" board \u00b7 000\u00b0 is up` }),
    stageHost(staging, handlers)
  ];
}

const SIDE_COLOR = { party: 'var(--signal)', opposition: 'var(--red)', neutral: 'var(--ink-2)' };

function stagedShipCard(token, handlers, writable) {
  const set = (patch) => handlers.onUpdateStagedShip?.(token.id, patch);
  const setVector = (patch) => handlers.onSetShipVector?.(token.id, {
    speed: patch.speed ?? token.speed, bearing: patch.bearing ?? token.bearing
  });
  const number = (value, label, onchange, width) => h('input', {
    type: 'number', step: label.includes('bearing') ? '5' : '1', value: String(value), 'aria-label': label,
    disabled: !writable, style: `width:${width}px`,
    onchange: (event) => onchange(Number(event.currentTarget.value) || 0)
  });
  return h('div', { class: 'staged-ship' },
    h('div', { class: 'staged-ship-head' },
      h('span', { class: 'staged-dot', style: `background:${SIDE_COLOR[token.side] ?? SIDE_COLOR.neutral}` }),
      h('span', { class: 'staged-name', text: token.label }),
      h('span', { class: 'staged-hull', text: token.hull }),
      writable ? h('button', { type: 'button', class: 'button is-small', text: 'Remove', 'aria-label': `Remove ${token.label} from the scene`, onclick: () => handlers.onUnstageShip?.(token.id) }) : null),
    h('div', { class: 'staged-fields' },
      h('label', { class: 'staged-row' }, h('span', { text: 'Side' }),
        h('select', { 'aria-label': `${token.label}'s side`, disabled: !writable, onchange: (event) => set({ side: event.currentTarget.value }) },
          ['party', 'opposition', 'neutral'].map((side) => h('option', { value: side, selected: side === token.side, text: side[0].toUpperCase() + side.slice(1) })))),
      h('div', { class: 'staged-row' }, h('span', { text: 'Flown by' }), h('span', { class: 'staged-value', text: token.controller })),
      h('div', { class: 'staged-row' }, h('span', { text: 'Position' }),
        h('span', { class: 'staged-pair' },
          h('span', { class: 'staged-axis', text: 'X' }), number(Math.round(token.position.x), `${token.label}'s X position`, (value) => set({ x: value }), 56),
          h('span', { class: 'staged-axis', text: 'Y' }), number(Math.round(token.position.y), `${token.label}'s Y position`, (value) => set({ y: value }), 56))),
      // Book 2 p.25 states a vector as a length and a direction.
      h('div', { class: 'staged-row' }, h('span', { text: 'Vector' }),
        h('span', { class: 'staged-pair' },
          number(Math.round(token.speed * 10) / 10, `${token.label}'s speed in inches per turn`, (value) => setVector({ speed: value }), 56),
          h('span', { class: 'staged-axis', text: '" at' }),
          number(token.bearing, `${token.label}'s bearing in degrees`, (value) => setVector({ bearing: value }), 56),
          h('span', { class: 'staged-axis', text: '\u00b0' })))));
}

function stagingColumn(staging, handlers) {
  const writable = staging.writable !== false;
  const parts = [
    h('header', { class: 'now-head' },
      h('h1', { text: 'Staging' }),
      h('p', { text: `${staging.sceneName} \u00b7 Book 2 p.24, preparation for play` }))
  ];
  if (staging.notice) parts.push(h('p', { class: `notice${staging.notice.ok ? '' : ' is-error'}`, role: 'status', text: staging.notice.message }));

  parts.push(h('section', { class: 'staging-step' },
    h('h2', { text: '1. Ships' }),
    staging.tokens.length
      ? h('div', { class: 'staged-ships' }, staging.tokens.map((token) => stagedShipCard(token, handlers, writable)))
      : h('p', { class: 'empty', text: 'Nothing staged yet. Add a ship below, or drag one onto the board.' }),
    writable ? h('form', { class: 'staging-add', onsubmit: (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const choice = staging.choices.find((entry) => entry.actorId === data.get('actorId'));
      if (!choice) return;
      handlers.onStageShip?.(choice, data.get('side'), 0, 0);
      event.currentTarget.reset();
    } },
      h('select', { name: 'actorId', 'aria-label': 'Ship to add' },
        staging.choices.map((choice) => h('option', { value: choice.actorId, text: `${choice.label} \u2014 ${choice.note}` }))),
      h('select', { name: 'side', 'aria-label': 'Side for the added ship' },
        h('option', { value: 'opposition', text: 'Opposition' }),
        h('option', { value: 'party', text: 'Party' })),
      h('button', { type: 'submit', class: 'button is-small', text: 'Add' })) : null));

  // Book 2 pp.26-28: one world on the table, and the atmosphere digit p.35's
  // braking reads. Placed here rather than only by the board's own row so
  // the checklist is the whole of setup.
  parts.push(h('section', { class: 'staging-step' },
    h('h2', { text: '2. World' }),
    staging.world
      ? h('div', { class: 'staged-world' },
        h('div', { class: 'staged-row' }, h('span', { text: 'On the board' }), h('span', { class: 'staged-value', text: `${staging.world.name}, ${staging.world.diameter}" across` })),
        h('div', { class: 'staged-row' }, h('span', { text: 'Atmosphere' }),
          h('select', { 'aria-label': 'Atmosphere digit', disabled: !writable, onchange: (event) => handlers.onSceneAtmosphere?.(event.currentTarget.value === '' ? null : Number(event.currentTarget.value)) },
            [['', 'None recorded'], ['6', '6, standard \u2014 brakes'], ['8', '8, dense \u2014 brakes'], ['0', '0, vacuum'], ['3', '3, thin']].map(([value, label]) =>
              h('option', { value, selected: String(staging.atmosphere ?? '') === value, text: label })))),
        h('p', { class: 'cite', text: 'p.29: gravity is sampled at the midpoint of a course. p.35: a vector passing within \u00bc" of a standard or dense atmosphere is shortened \u00bc".' }),
        writable ? h('button', { type: 'button', class: 'button is-small', text: 'Remove world', onclick: () => handlers.onSceneBody?.('remove', staging.world.id) }) : null)
      : h('div', { class: 'staged-world' },
        h('p', { class: 'empty', text: 'Clear space. Nothing bends a course.' }),
        writable ? h('form', { class: 'staging-add', onsubmit: (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          handlers.onSceneBody?.('place', { kind: 'world', name: String(data.get('name') || 'World'), diameter: Number(data.get('diameter')) || 8, densityEarth: 1, center: { x: 0, y: 0 } });
          event.currentTarget.reset();
        } },
          h('input', { name: 'name', type: 'text', placeholder: 'World name', 'aria-label': 'World name' }),
          h('input', { name: 'diameter', type: 'number', step: '1', value: '8', 'aria-label': 'Diameter in thousands of miles' }),
          h('button', { type: 'submit', class: 'button is-small', text: 'Place' })) : null)));

  parts.push(h('div', { class: 'staging-pair' },
    h('section', { class: 'staging-step' },
      h('h2', { text: '3. Intruder' }),
      h('div', { class: 'staging-choice' }, ['party', 'opposition'].map((side) => h('button', {
        type: 'button', 'aria-pressed': staging.intruder === side, disabled: !writable,
        class: `button is-small${staging.intruder === side ? ' is-chosen' : ''}`,
        text: side[0].toUpperCase() + side.slice(1),
        onclick: () => handlers.onStagingChange?.({ intruder: side })
      }))),
      h('p', { class: 'cite', text: 'p.22: moves and fires first each turn. Whoever forced the encounter.' })),
    h('section', { class: 'staging-step' },
      h('h2', { text: '4. Pressure' }),
      h('div', { class: 'staging-choice' }, [[false, 'Suited up'], [true, 'Caught']].map(([value, label]) => h('button', {
        type: 'button', 'aria-pressed': Boolean(staging.pressurised) === value, disabled: !writable,
        class: `button is-small${Boolean(staging.pressurised) === value ? ' is-chosen' : ''}`,
        text: label,
        onclick: () => handlers.onStagingChange?.({ pressurised: value })
      }))),
      h('p', { class: 'cite', text: 'p.34: ships depressurise before combat where they can.' }))));

  parts.push(h('section', { class: 'staging-step is-last' },
    staging.opening
      ? h('p', { class: 'staging-range', text: `Opening range ${staging.opening.distance.toFixed(1)}"${staging.opening.dm ? `, DM ${staging.opening.dm}` : ', no range DM'}. Beyond 150" is \u22122, beyond 300" is \u22125 (p.30).` })
      : null,
    h('div', { class: 'lead-actions' },
      h('button', { type: 'button', class: 'button is-primary', text: 'Start combat', disabled: !writable || !staging.canStart, onclick: () => handlers.onStartVectorCombat?.(staging.intruder, Boolean(staging.pressurised)) }),
      h('button', { type: 'button', class: 'button', text: 'Back to scenes', onclick: () => handlers.onSceneAction?.('stage', staging.sceneId) })),
    !staging.canStart ? h('p', { class: 'cite', text: staging.blockedReason }) : null));

  return parts.filter(Boolean);
}

function combatDrawer(state, handlers) {
  if (state.fighters?.length) {
    return [
      h('header', { class: 'drawer-head' }, h('h2', { text: state.situation.title }), h('p', { text: state.situation.detail })),
      h('p', { class: 'empty', text: 'The fight has the screen: declare on the sheet and resolve the round there. Close this to get back to it.' }),
      h('div', { class: 'lead-actions' }, (state.refereeActions ?? []).map((action) =>
        h('button', { type: 'button', class: 'button is-small', text: action.label, onclick: () => handlers.onCommand?.(action.command) })))
    ];
  }
  return [
    h('header', { class: 'drawer-head' }, h('h2', { text: 'Combat' }), h('p', { text: 'Nothing is running.' })),
    startFight(state, handlers, { open: true })
      ?? h('p', { class: 'empty', text: 'This campaign has no roster actors to fight yet; make one in the referee client.' })
  ];
}

// v0.249.0: one context menu shape for every directory, with the verbs that
// make sense for that row's kind. play.js positions and dismisses it.
// v0.252.0: a combatant's own orders, on the token or its row. Movement and
// target are declarations (Book 1 p.28 step 4), so they go through the same
// handlers the table's dropdowns use; the referee's fiat is here too, rather
// than inline beside the attack where it read as part of the round.
export function renderFighterMenu(menu, handlers = {}) {
  if (!menu?.fighter) return null;
  const fighter = menu.fighter;
  const item = (text, onclick, { danger = false } = {}) => h('button', {
    type: 'button', class: `row-menu-item${danger ? ' is-danger' : ''}`, text,
    onclick: () => { handlers.onCloseFighterMenu?.(); onclick(); }
  });
  const moves = [...SHEET_MOVES, ...(menu.round === 1 ? ['Escape'] : [])];
  const items = [
    // Both go through onSheetChange, the same handler the table's own
    // dropdowns use, so an order given here is the same order.
    ...moves.map((move) => item(`Movement: ${move.toLowerCase()}`, () => handlers.onSheetChange?.(fighter.id, { move, targetId: menu.targetId ?? null }))),
    ...(menu.foes ?? []).map((foe) => item(`Target: ${foe.name}`, () => handlers.onSheetChange?.(fighter.id, { move: menu.move ?? 'Stand', targetId: foe.id })))
  ];
  if (fighter.sourceActorId) items.push(item('Open sheet', () => handlers.onOpenSheet?.('actor', fighter.sourceActorId)));
  // Taking a token off the board is a setup verb; once the fight has begun
  // the engine has no command for pulling a combatant out mid-round.
  if (menu.setup && menu.referee) items.push(item('Remove from the board', () => handlers.onRemoveToken?.(fighter.id), { danger: true }));
  // No "remove from the fight" yet: the engine has no command for pulling a
  // combatant out mid-round, and offering a button that does nothing is
  // worse than not offering it.
  const node = h('div', { class: 'row-menu', role: 'menu', 'aria-label': `${fighter.name} orders` },
    h('div', { class: 'row-menu-head', text: `${fighter.name} \u00b7 band ${fighter.band + 1}` }), items);
  return placeMenu(node, menu.at, items.length);
}

// v0.254.0: a menu opened near the foot or the right edge of the screen used
// to run off it (Kurt's screenshot: Thug 3's orders were cut off below the
// table). The height is estimated from the item count before it is in the
// document, then the menu flips up or left to stay on screen.
function placeMenu(node, at, count) {
  const width = 240;
  const height = 28 + count * 27;
  const viewW = globalThis.innerWidth ?? 1280;
  const viewH = globalThis.innerHeight ?? 800;
  const x = at.x + width > viewW - 8 ? Math.max(8, at.x - width) : at.x;
  const y = at.y + height > viewH - 8 ? Math.max(8, at.y - height) : at.y;
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  node.style.maxHeight = `${viewH - 16}px`;
  return node;
}

export function renderRowMenu(menu, handlers = {}) {
  const item = (text, onclick, { danger = false } = {}) => h('button', {
    type: 'button', class: `row-menu-item${danger ? ' is-danger' : ''}`, text,
    onclick: () => { handlers.onCloseRowMenu?.(); onclick(); }
  });
  // v0.265.0: a folder's own menu, Foundry's Edit and Remove. Removing keeps
  // what was filed there, moving it up a level.
  if (menu?.folder) {
    const { tab, path } = menu.folder;
    // v0.266.0: Unfiled is not a folder, so it cannot be renamed or removed;
    // its one verb files everything shown there into a real folder.
    const folderItems = path === 'Unfiled'
      ? [item('File everything here in\u2026', () => handlers.onFileUnfiled?.(tab))]
      : [
        item('Rename folder\u2026', () => handlers.onRenameFolder?.(tab, path)),
        item('Remove folder, keep contents', () => handlers.onRemoveFolder?.(tab, path), { danger: true })
      ];
    const node = h('div', { class: 'row-menu', role: 'menu', 'aria-label': `${path} folder` },
      h('div', { class: 'row-menu-head', text: path }), folderItems);
    return placeMenu(node, menu.at, folderItems.length);
  }
  if (!menu?.entry) return null;
  const entry = menu.entry;
  const kind = entry.sheet?.kind;
  const items = [item('Open sheet', () => handlers.onOpenSheet?.(kind, entry.id))];
  if (kind === 'scene') {
    items.push(item(entry.active ? 'Deactivate' : 'Activate', () => handlers.onSceneAction?.('activate', entry.id)));
    if (entry.isVectorBoard) items.push(item('Open on the canvas', () => handlers.onSceneAction?.('stage', entry.id)));
    items.push(item('Move to folder\u2026', () => handlers.onSceneAction?.('file', entry.id, entry.folder)));
    items.push(item('Delete', () => handlers.onSceneAction?.('delete', entry.id), { danger: true }));
  } else if (kind === 'actor' && entry.character) {
    // v0.265.0: a player character gets the same verbs as an actor, less
    // the actor/statblock switch, which has no meaning for a character.
    items.push(item('Rename\u2026', () => handlers.onRenameActor?.(entry.id, entry.name, 'character')));
    items.push(item('Copy', () => handlers.onCopyDocument?.('character', entry.id)));
    items.push(item('Move to folder\u2026', () => handlers.onFileActor?.(entry.id, entry.folder, 'character')));
    items.push(item('Delete', () => handlers.onDeleteActor?.(entry.id, entry.name, 'character'), { danger: true }));
  } else if (kind === 'actor') {
    items.push(item(entry.actorKind === 'statblock' ? 'Place on scene' : 'Put on the board', () => handlers.onStageDocument?.('actor', entry.id)));
    if (entry.editable) {
      items.push(item('Rename\u2026', () => handlers.onRenameActor?.(entry.id, entry.name)));
      items.push(item('Copy', () => handlers.onCopyDocument?.('actor', entry.id)));
      items.push(item(entry.actorKind === 'statblock' ? 'Make an actor' : 'Make a statblock', () => handlers.onActorKind?.(entry.id, entry.actorKind === 'statblock' ? 'actor' : 'statblock')));
      items.push(item('Move to folder\u2026', () => handlers.onFileActor?.(entry.id, entry.folder)));
      items.push(item('Delete', () => handlers.onDeleteActor?.(entry.id, entry.name), { danger: true }));
    }
  } else if (kind === 'ship') {
    items.push(item('Stage on a scene', () => handlers.onStageDocument?.('ship', entry.id)));
  }
  const node = h('div', { class: 'row-menu', role: 'menu', 'aria-label': `${entry.name} actions` },
    h('div', { class: 'row-menu-head', text: entry.name }), items);
  return placeMenu(node, menu.at, items.length);
}

// v0.257.0: settings, kept to this browser. The first is Kurt's: how much of
// a combat round chat reports. Terse gives only the attacks, since the band
// line already shows where everyone moved; verbose adds the moves.
function settingsDrawer(state, handlers) {
  const settings = state.viewSettings ?? {};
  const choice = (name, value, label, note) => h('label', { class: 'setting-choice' },
    h('input', { type: 'radio', name, value, checked: settings[name] === value, onchange: () => handlers.onSetting?.(name, value) }),
    h('span', {}, h('b', { text: label }), h('small', { text: note })));
  return [
    h('h3', { text: 'Settings' }),
    h('fieldset', { class: 'setting' },
      h('legend', { text: 'Combat messages in chat' }),
      choice('combatMessages', 'terse', 'Attacks only', 'Who hit whom. The band line already shows where everyone is.'),
      choice('combatMessages', 'verbose', 'Attacks and movement', 'Adds a line for every close, open and evade.')),
    h('fieldset', { class: 'setting' },
      h('legend', { text: 'Targeting' }),
      h('label', { class: 'setting-choice' },
        h('input', { type: 'checkbox', checked: Boolean(settings.autoTarget), onchange: (event) => handlers.onSetting?.('autoTarget', event.currentTarget.checked) }),
        h('span', {}, h('b', { text: 'Auto-target' }), h('small', { text: 'Fill each row with the nearest enemy, and NPCs with their own choice.' })))),
    h('p', { class: 'cite', text: 'Saved in this browser only.' })
  ];
}

// v0.264.0: the Compendium, Foundry's name for it. Book 1's weapons and
// armour and Book 3's equipment, in packs; each row can be dragged onto an
// open character sheet (Buy or Give, chosen on the drop), or opened here to
// do the same without dragging, which a phone cannot.
export const GEAR_DRAG_TYPE = 'application/x-graycloak-gear';

function formatGrams(grams) {
  if (grams === null || grams === undefined) return '';
  if (grams >= 1000000) return `${(grams / 1000000).toLocaleString('en-US')} t`;
  if (grams >= 1000) return `${(grams / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })} kg`;
  return grams ? `${grams} g` : '\u2014';
}

function compendiumDrawer(state, handlers) {
  const compendium = state.compendium;
  if (!compendium) return [h('p', { class: 'empty', text: 'The Compendium is not loaded.' })];
  const view = state.compendiumUi ?? {};
  const query = String(view.query ?? '').trim().toLowerCase();
  const go = (patch) => handlers.onCompendium?.(patch);
  const characters = state.compendiumCharacters ?? [];
  const world = compendium.world;
  const row = (entry) => {
    const open = view.expanded === entry.key;
    const flag = !entry.buy ? h('span', { class: 'gear-flag is-no', title: entry.reason, text: entry.reason?.startsWith('Needs tech') ? `TL${entry.techLevel}` : entry.reason?.startsWith('Strictly') ? 'Military' : '\u2014' })
      : entry.warning ? h('span', { class: 'gear-flag is-warn', title: entry.warning, text: `Law ${world?.lawLevel}` }) : null;
    const summary = h('div', {
      class: `gear-row${open ? ' is-open' : ''}`, draggable: state.live ? 'true' : 'false', role: 'button', tabindex: '0',
      title: `${entry.note || entry.name}${entry.reason ? `\n\n${entry.reason}` : entry.warning ? `\n\n${entry.warning}` : ''}\n\nDrag onto a character sheet, or click for Buy and Give.`,
      ondragstart: (event) => { event.dataTransfer.setData(GEAR_DRAG_TYPE, entry.key); event.dataTransfer.setData('text/plain', entry.name); event.dataTransfer.effectAllowed = 'copy'; },
      onclick: () => go({ expanded: open ? null : entry.key }),
      onkeydown: (event) => { if (event.key === 'Enter') go({ expanded: open ? null : entry.key }); }
    },
    h('span', { class: 'gear-name', text: entry.name }),
    flag,
    h('span', { class: 'gear-price', text: `Cr ${entry.priceCr.toLocaleString('en-US')}` }),
    h('span', { class: 'gear-weight', text: entry.kind === 'armour' ? 'worn' : formatGrams(entry.weightGrams) }));
    if (!open) return summary;
    const who = h('select', { class: 'sheet-select', 'aria-label': 'Character' }, characters.map((entry) => h('option', { value: entry.id, text: entry.name })));
    const quantity = entry.kind === 'item' ? h('input', { type: 'number', min: '1', value: '1', class: 'gear-qty', 'aria-label': 'How many' }) : null;
    return h('div', { class: 'gear-open' },
      summary,
      h('div', { class: 'gear-detail' },
        entry.note ? h('p', { text: entry.note }) : null,
        entry.priceNote ? h('p', { class: 'cite', text: entry.priceNote }) : null,
        entry.techLevel !== null ? h('p', { class: 'cite', text: `Tech level ${entry.techLevel}` }) : null,
        entry.reason ? h('p', { class: 'sheet-note is-error', text: entry.reason }) : null,
        entry.warning ? h('p', { class: 'sheet-note is-warn', text: entry.warning }) : null,
        state.live && characters.length ? h('div', { class: 'gear-actions' },
          who, quantity,
          h('button', { type: 'button', class: 'button is-small is-primary', disabled: !entry.buy, title: entry.reason ?? '', text: 'Buy', onclick: () => handlers.onGear?.('buy', who.value, entry.key, quantity ? quantity.value : 1) }),
          h('button', { type: 'button', class: 'button is-small', text: 'Give', title: 'The referee\u2019s grant: no charge', onclick: () => handlers.onGear?.('give', who.value, entry.key, quantity ? quantity.value : 1) })) : null,
        h('p', { class: 'cite', text: `Book ${entry.kind === 'item' ? 3 : 1} p.${entry.page}` })));
  };
  return [
    h('p', { class: 'side-count-line', text: world ? `Prices and availability at ${world.name}: tech level ${world.techLevel}, law level ${world.lawLevel}` : 'In space: nothing can be bought until the party is in port' }),
    h('input', { type: 'search', class: 'search', placeholder: 'Search the compendium', 'aria-label': 'Search the compendium', value: view.query ?? '', oninput: (event) => go({ query: event.target.value }) }),
    ...compendium.packs.map((pack) => {
      const entries = pack.entries.filter((entry) => !query || entry.name.toLowerCase().includes(query) || String(entry.group).toLowerCase().includes(query));
      if (!entries.length) return null;
      const collapsed = !query && (view.collapsed ?? {})[pack.name];
      const groups = [...new Set(entries.map((entry) => entry.group))];
      return h('section', { class: 'gear-pack' },
        h('button', { type: 'button', class: 'gear-pack-head', 'aria-expanded': String(!collapsed), onclick: () => go({ collapsed: { ...(view.collapsed ?? {}), [pack.name]: !collapsed } }) },
          h('span', { text: `${collapsed ? '\u25b8' : '\u25be'} ${pack.name}` }), h('small', { text: String(entries.length) })),
        collapsed ? null : groups.map((group) => h('div', { class: 'gear-group' },
          groups.length > 1 || group !== pack.name ? h('div', { class: 'gear-group-label', text: group }) : null,
          entries.filter((entry) => entry.group === group).map(row))));
    }),
    h('p', { class: 'cite', text: 'Drag an item onto an open character sheet. Buy pays from that character\u2019s cash; Give is the referee\u2019s grant.' })
  ];
}

// The choice made on a drop: Buy (if this world sells it) or Give.
export function renderGearDrop(drop, handlers) {
  const entry = drop.entry;
  const quantity = entry.kind === 'item' ? h('input', { type: 'number', min: '1', value: '1', class: 'gear-qty', 'aria-label': 'How many' }) : null;
  const left = Math.max(8, Math.min(drop.at.x, (globalThis.innerWidth ?? 1200) - 290));
  const top = Math.max(8, Math.min(drop.at.y, (globalThis.innerHeight ?? 800) - 220));
  return h('div', { class: 'gear-drop', role: 'dialog', 'aria-label': `${entry.name} for ${drop.characterName}`, style: `left:${left}px;top:${top}px` },
    h('b', { text: `${entry.name} \u2192 ${drop.characterName}` }),
    h('span', { class: 'cite', text: `Cr ${entry.priceCr.toLocaleString('en-US')}${entry.kind === 'item' ? ' each' : ''} \u00b7 ${drop.cashCr === null ? '' : `has Cr ${drop.cashCr.toLocaleString('en-US')}`}` }),
    entry.priceNote ? h('p', { class: 'cite', text: entry.priceNote }) : null,
    entry.reason ? h('p', { class: 'sheet-note is-error', text: entry.reason }) : null,
    entry.warning ? h('p', { class: 'sheet-note is-warn', text: entry.warning }) : null,
    h('div', { class: 'gear-actions' },
      quantity,
      h('button', { type: 'button', class: 'button is-small is-primary', disabled: !entry.buy, text: 'Buy', onclick: () => handlers.onGear?.('buy', drop.characterId, entry.key, quantity ? quantity.value : 1) }),
      h('button', { type: 'button', class: 'button is-small', text: 'Give', onclick: () => handlers.onGear?.('give', drop.characterId, entry.key, quantity ? quantity.value : 1) }),
      h('button', { type: 'button', class: 'button is-small', text: 'Cancel', onclick: () => handlers.onCloseGearDrop?.() })));
}

export function renderDrawer(kind, state, referee, handlers = {}) {
  const tidy = (parts) => parts.flat(Infinity).filter(Boolean);
  if (kind === 'character' && state.character) return tidy(characterDrawer(state.character, state, handlers));
  if (kind === 'ship' && state.ship) return tidy(shipDrawer(state.ship, state, handlers));
  if (kind === 'combat') return tidy(combatDrawer(state, handlers));
  if (kind === 'shipyard') return tidy([state.shipyard ? shipyardPanel(state.shipyard, handlers) : h('p', { class: 'empty', text: 'No shipyard here: turrets, weapons and software are fitted at class A or B starports.' })]);
  if (kind === 'settings') return tidy(settingsDrawer(state, handlers));
  if (kind === 'compendium') return tidy(compendiumDrawer(state, handlers));
  if (kind === 'referee') return tidy(refereeDrawer(referee, state, handlers));
  return [];
}

// -------------------------------------------------------------------- talk

// v0.253.0: the chat panel's stream. Three kinds of entry: a message
// someone typed, a roll, and a notice — the activity log's own lines, which
// were the whole of the old Journal tab. Notices are what Kurt called noise:
// COMBAT and ARRIVAL show by default, and the rest fold into one line that
// expands in place. The log keeps everything either way.
// v0.299.0: ENCOUNTER — reaction throws — shows too.
export const CHAT_NOTICE_DEFAULTS = Object.freeze(['COMBAT', 'ARRIVAL', 'MEDICAL', 'SKILL', 'GEAR', 'ENCOUNTER']);

// v0.262.0: the campaign date, as a divider where it changes rather than on
// every line (Kurt, Sep 2026) — a fight's thirty lines share one day, and a
// week's travel gets one divider a day. Clear hides what came before without
// deleting it: the log is the campaign's record, and Export still has it all.
export function renderTalkLog(chat, { showAll = false, onShowAll = null, categories = CHAT_NOTICE_DEFAULTS, clearedAt = null, onUnclear = null } = {}) {
  const shown = [];
  const hidden = clearedAt ? chat.filter((entry) => String(entry.at) <= clearedAt).length : 0;
  if (hidden) {
    shown.push(h('button', { type: 'button', class: 'talk-folded talk-cleared', text: `Chat cleared \u00b7 show ${hidden} earlier`, onclick: () => onUnclear?.() }));
  }
  let folded = [];
  let day = null;
  const flush = () => {
    if (!folded.length) return;
    const count = folded.length;
    const kinds = [...new Set(folded.map((entry) => entry.category.toLowerCase()))].slice(0, 3).join(', ');
    shown.push(h('button', {
      type: 'button', class: 'talk-folded',
      text: `${count} ${kinds} notice${count === 1 ? '' : 's'} hidden \u2014 show`,
      onclick: () => onShowAll?.()
    }));
    folded = [];
  };
  for (const entry of chat) {
    if (hidden && String(entry.at) <= clearedAt) continue;
    if (entry.kind === 'notice' && !showAll && !categories.includes(entry.category)) {
      folded.push(entry);
      continue;
    }
    flush();
    if (entry.dateLabel && entry.dateLabel !== day) {
      day = entry.dateLabel;
      shown.push(h('p', { class: 'talk-day', role: 'separator', text: entry.dateLabel }));
    }
    if (entry.kind === 'notice') {
      // v0.257.0: the working behind a short line — the throw and every DM
      // — on hover, and on tap too, since a phone has no hover.
      // A skill described from the sheet opens at once: the description is
      // what was asked for (v0.263.0).
      shown.push(entry.detail
        ? h('details', { class: 'talk-notice has-detail', title: entry.detail, open: entry.category === 'SKILL' },
          h('summary', { text: entry.text }),
          h('pre', { class: 'talk-detail', text: entry.detail }))
        : h('p', { class: 'talk-notice', title: entry.category, text: entry.text }));
    } else if (entry.kind === 'roll') {
      // v0.263.0: a skill throw carries its working and Book 1's targets.
      shown.push(h('article', { class: 'talk-roll' },
        h('div', { class: 'talk-who' }, h('b', { text: entry.who })),
        entry.detail
          ? h('details', { class: 'talk-roll-body has-detail', title: entry.detail }, h('summary', { text: entry.text }), h('pre', { class: 'talk-detail', text: entry.detail }))
          : h('div', { class: 'talk-roll-body', text: entry.text })));
    } else {
      shown.push(h('article', { class: 'talk-message' },
        h('div', { class: 'talk-who' }, h('b', { text: entry.who })),
        h('p', { text: entry.text })));
    }
  }
  flush();
  return shown.length ? shown : [h('p', { class: 'talk-empty', text: 'Nothing said yet. Type below, or /roll 2D.' })];
}

// v0.262.0: the chat as plain text, for Export. Every line carries its date
// here, since a saved file has no dividers to lean on, and a line's working
// (the throw and each DM) follows it indented.
export function chatExportText({ campaignName = 'Campaign', date = '', lines = [] } = {}) {
  const out = [`${campaignName} \u2014 chat, exported ${date}`, ''];
  for (const entry of lines) {
    const who = entry.kind === 'notice' ? '' : `${entry.who}: `;
    const text = String(entry.text ?? '').replace(/\n/g, '\n    ');
    out.push(`[${entry.dateLabel ?? ''}] ${who}${text}`);
    if (entry.detail) for (const line of String(entry.detail).split('\n')) out.push(`    ${line}`);
  }
  return `${out.join('\n')}\n`;
}

// The sidebar's tabs: Chat first, then the directories.
export const SIDEBAR_TABS = Object.freeze(['Chat', 'Journal', 'Actors', 'Players', 'Vehicles', 'Scenes', 'Compendium']);

export function renderSideTabs(active, { players = 0, onTab = null } = {}) {
  return SIDEBAR_TABS.map((tab) => h('button', {
    type: 'button', class: 'side-tab', 'aria-pressed': tab === active ? 'true' : 'false',
    onclick: () => onTab?.(tab)
  }, tab, tab === 'Players' && players ? h('span', { class: 'side-count', text: ` ${players}` }) : null));
}
