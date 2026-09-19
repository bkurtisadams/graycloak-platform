// play-views.js — draws the play page from a view state (see play-sample.js).
//
// Rules for this file, so the page stays what was approved:
//   1. It imports nothing from app.js, ui-model.js or styles.css. The only
//      shared modules are pure ones: the subsector SVG, the world data, the
//      rules package, and the encounter document's band arithmetic.
//   2. Every function takes state and returns DOM. No module-level state.
//   3. A situation adds a scene and a lead card. It never adds a panel.

import { renderSubsectorMap, createSvgNode } from './subsector-svg.js?v=v0.223.0';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js?v=v0.223.0';
import { rangeBandForBandGap, ENCOUNTER_RANGE_LINE_ESCAPE_BANDS } from '../src/encounter-document.js?v=v0.223.0';
import {
  SUBSECTOR_COLUMNS, SUBSECTOR_ROWS, getJumpDestinations, getSubsectorSystem, parseUniversalWorldProfile,
  describeStarport, describeAtmosphere, describeHydrographics, describePopulation, describeLawLevel,
  previewPersonalAttack, getPersonalWeapon, blowsRemaining
} from '../vendor/classic-traveller-rules/index.js?v=v0.223.0';

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
  return { text: need <= 2 ? 'cannot miss' : need > 12 ? `${need}+` : `${need}+`, preview, range };
}

function woundText(preview) {
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
    weapon.melee ? h('span', { class: `sel-stat${left <= 0 ? ' is-hurt' : ''}`, title: reader.blowsFromWounds
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
  const stats = ['STR', 'DEX', 'END'].map((key, index) => [index ? '\u00b7' : '',
    h('span', { class: fighter.characteristics[key] < fighter.full[key] ? 'is-hurt' : '', text: String(fighter.characteristics[key]) })]);
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
    const fallback = { move: nearest && !reachNearest ? 'Close' : 'Stand', targetId: nearest?.id ?? null };
    const base = pick ?? held ?? fighter.suggestion ?? fallback;
    const source = pick ? 'chosen' : held ? 'declared' : fighter.suggestion ? 'suggested' : 'default';
    const move = base.move ?? 'Stand';
    let targetId = base.targetId ?? null;
    if (targetId && !foes.some((foe) => foe.id === targetId)) targetId = nearest?.id ?? null;
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

function sheetRow(row, state, handlers, focusId) {
  const { fighter } = row;
  const stats = ['STR', 'DEX', 'END'].map((key, index) => [index ? '\u00b7' : '',
    h('span', { class: fighter.characteristics[key] < fighter.full[key] ? 'is-hurt' : '', text: String(fighter.characteristics[key]) })]);
  // One characteristic at zero is unconscious (p.30), so the figure that
  // matters is how close the lowest one is.
  const lowest = Math.min(...['STR', 'DEX', 'END'].map((key) => fighter.characteristics[key]));
  const brink = !row.down && lowest > 0 && lowest <= 2;
  const live = Boolean(state.live) && !row.down;
  const weapon = getPersonalWeapon(fighter.weaponKey);
  return h('tr', { class: `is-${fighter.side}${row.down ? ' is-down' : ''}${fighter.id === focusId ? ' is-focus' : ''}`, onclick: (event) => { if (!event.target.closest('select')) handlers.onSheetFocus?.(fighter.id); } },
    h('td', {}, h('div', { class: 'tr-name' }, h('span', { class: 'tr-dot', 'aria-hidden': 'true' }), h('span', { class: 'tr-select', text: fighter.name }))),
    h('td', { class: 'tr-stats', title: row.down ? condition(fighter) : brink ? 'One more wound may put a characteristic to zero: unconscious (Book 1 p.30)' : condition(fighter) },
      row.down ? condition(fighter).toLowerCase() : [stats, brink ? h('span', { class: 'brink', text: ' \u26a0' }) : null]),
    h('td', {}, row.down ? '' : h('select', { class: 'sheet-select', 'aria-label': `${fighter.name}: movement`, disabled: !live, onchange: (event) => handlers.onSheetChange?.(fighter.id, { move: event.target.value, targetId: row.targetId }) },
      [...SHEET_MOVES, ...(state.round === 1 ? ['Escape'] : [])].map((move) => h('option', { value: move, selected: move === row.move, text: move })))),
    h('td', { class: 'tr-arms', title: `${fighter.weaponLabel}, ${fighter.armorLabel}${weapon.melee ? `, ${blowsRemaining(fighter)} of ${fighter.blowAllowance} combat blows left` : ''}` },
      fighter.weaponLabel, weapon.melee && !row.down ? h('span', { class: 'blows', text: ` \u00b7 ${blowsRemaining(fighter)} blows` }) : null),
    h('td', {}, row.down || row.move === 'Evade' || row.move === 'Escape' ? '' : h('select', { class: 'sheet-select', 'aria-label': `${fighter.name}: target`, disabled: !live, onchange: (event) => handlers.onSheetChange?.(fighter.id, { move: row.move, targetId: event.target.value || null }) },
      row.move === 'Stand' ? h('option', { value: '', selected: !row.targetId, text: '\u2014 hold fire \u2014' }) : null,
      row.foes.map((foe) => h('option', { value: foe.id, selected: foe.id === row.targetId, text: `${foe.name} (${rangeBetween(fighter, foe).name.toLowerCase()})` })))),
    h('td', { class: `sheet-needs is-${row.tone || 'plain'}`, title: row.needs, text: row.needs }));
}

function fightColumn(state, handlers) {
  const rows = state.sheetRows ?? sheetRows(state, {});
  const focus = rows.find((row) => row.fighter.id === state.sheetFocus) ?? rows.find((row) => !row.down) ?? null;
  const referee = state.seat !== 'player';
  const sides = [rows.filter((row) => row.fighter.side === 'party'), rows.filter((row) => row.fighter.side !== 'party')];
  const wound = state.next?.wound ?? null;
  const morale = (state.casualties ?? []).filter((entry) => entry.throwing).map((entry) =>
    `${entry.side === 'party' ? 'The party' : 'The opposition'} has ${entry.out} of ${entry.of} down (${Math.round(entry.share * 100)}%): morale is thrown each round, 7+ to stand${entry.share > 0.5 ? ', at \u22122' : ''}.`);
  return [
    h('header', { class: 'now-head' }, h('h1', { text: state.situation.title }), h('p', { text: [state.setup?.range, state.setup?.surprise].filter(Boolean).join('. ') })),
    state.notice ? h('p', { class: `notice${state.notice.ok ? '' : ' is-error'}`, role: 'status', text: state.notice.message }) : null,
    morale.length ? h('p', { class: 'hold-note is-morale', text: morale.join(' ') }) : null,
    wound ? h('section', { class: 'lead' }, h('h2', { text: state.next.title }), h('p', { text: state.next.copy }), h('p', { class: 'cite', text: state.next.cite })) : null,
    h('table', { class: 'tracker sheet' },
      h('thead', {}, h('tr', {},
        h('th', { text: 'Combatant' }), h('th', { title: 'Strength, dexterity, endurance now', text: 'Status' }),
        h('th', { title: 'Book 1 p.28 step 4A', text: 'Movement' }), h('th', { text: 'Weapon' }),
        h('th', { title: 'Book 1 p.28 step 4B', text: 'Target' }), h('th', { title: '2D against 8+, after every DM', text: 'Needs' }))),
      sides.map((side) => h('tbody', {}, side.map((row) => sheetRow(row, state, handlers, focus?.fighter.id))))),
    // The throw behind the focused row, as a sum, and an NPC's own reasoning.
    focus && !focus.down ? h('section', { class: 'sheet-why' },
      h('h3', { text: focus.fighter.name }),
      focus.attacks && focus.line?.preview?.canAttack ? h('p', { class: 'odds', text: `${dmSum(focus.line.preview)} for ${woundText(focus.line.preview)} wounds.` }) : null,
      focus.target && focus.line && !focus.line.preview?.canAttack ? h('p', { class: `odds${focus.move === 'Close' ? '' : ' is-warning'}`, text: `${getPersonalWeapon(focus.fighter.weaponKey).name} cannot reach ${focus.target.name} at ${focus.line.range.name.toLowerCase()} range${focus.move === 'Close' ? '; closing one band this round.' : '. Close the range, or this order does nothing.'}` }) : null,
      focus.reason ? h('p', { class: 'odds', text: `Suggested: ${focus.reason}. Change the row to overrule it.` }) : null,
      focus.source === 'declared' ? h('p', { class: 'odds', text: 'Already declared this round; changing the row replaces it.' }) : null,
      state.live && state.seat !== 'player' ? h('form', { class: 'editor-row', onsubmit: (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        handlers.onEditCombatant?.(focus.fighter.id, Object.fromEntries(['STR', 'DEX', 'END'].map((key) => [key, data.get(key)])));
      } },
        h('span', { class: 'editor-label', text: 'Set' }),
        ['STR', 'DEX', 'END'].map((key) => h('label', { class: 'editor-score' }, h('span', { text: key }),
          h('input', { name: key, type: 'number', min: '0', max: String(focus.fighter.full[key]), value: String(focus.fighter.characteristics[key]), 'aria-label': `${focus.fighter.name} ${key}` }))),
        h('button', { type: 'submit', class: 'button is-small', text: 'Apply' })) : null) : null,
    h('div', { class: 'lead-actions' },
      state.live && !wound ? h('button', { type: 'button', class: 'button is-primary', onclick: () => handlers.onResolveSheet?.() }, h('span', { text: 'Resolve round' }), h('small', { text: `${rows.filter((row) => !row.down).length} orders, as shown` })) : null,
      referee ? h('button', { type: 'button', class: 'button is-small', text: 'Add to combat' }) : null,
      (state.refereeActions ?? []).map((action) => h('button', { type: 'button', class: 'button is-small', text: action.label, onclick: () => handlers.onCommand?.(action.command) }))),
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

// A fight has to be startable from here, or the page is a dead end: pick who
// the party is up against and the range they meet at (Book 1 p.27).
function startFight(state, handlers) {
  const foes = state.opponents ?? [];
  if (!state.live || !foes.length) return null;
  const party = state.partyChoices ?? [];
  return h('details', { class: 'start-fight' },
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
  const fight = startFight(state, handlers);
  if (fight) parts.push(fight);
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
  // Every order on the sheet is drawn, so the board and the sheet say the same
  // thing: a solid line for an attack, a dashed one for movement without one.
  const drawn = state.sheetRows ?? [];
  if (drawn.length) {
    for (const row of drawn) {
      if (row.down || !row.targetId || !at.has(row.targetId)) continue;
      const from = at.get(row.fighter.id);
      const to = at.get(row.targetId);
      svg.append(createSvgNode('line', { x1: from.cx, y1: from.cy, x2: to.cx, y2: to.cy, class: `target-line is-${row.fighter.side}${row.attacks ? '' : ' is-move'}` }));
    }
  } else {
    const order = orderOf(reader, state);
    if (order?.targetId && at.has(order.targetId) && !isDown(reader)) {
      const from = at.get(reader.id);
      const to = at.get(order.targetId);
      svg.append(createSvgNode('line', { x1: from.cx, y1: from.cy, x2: to.cx, y2: to.cy, class: 'target-line' }));
    }
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

// v0.221.0: the referee's directory. Your old toolbar's tabs, behind one chip:
// a folder tree on the left of the panel, the open folder's entries on the
// right, and a search that ignores folders because that is what searching is
// for. Only the open folder is drawn, so a campaign with thousands of actors
// costs no more to show than one with ten.
function refereeDrawer(referee, state, handlers) {
  const go = (patch) => handlers.onReferee?.(patch);
  const tree = referee.tree ?? [];
  const entries = referee.shown ?? [];
  return [
    h('header', { class: 'drawer-head' },
      h('h2', { text: 'Referee' }),
      h('p', { text: `${referee.total} ${referee.tab.toLowerCase()}${referee.total === 1 ? '' : ''} in this campaign` })),
    h('div', { class: 'tabs', role: 'tablist' }, (referee.tabs ?? []).map((tab) => h('button', {
      type: 'button', role: 'tab', 'aria-selected': tab === referee.tab, text: tab,
      onclick: () => go({ tab, folder: '', query: '' })
    }))),
    h('input', {
      type: 'search', class: 'search', placeholder: `Search ${referee.tab.toLowerCase()}`, value: referee.query ?? '',
      'aria-label': `Search ${referee.tab.toLowerCase()}`,
      oninput: (event) => go({ query: event.target.value })
    }),
    referee.unbuilt ? h('p', { class: 'empty', text: referee.unbuilt }) : null,
    referee.seats?.error ? h('p', { class: 'notice is-error', text: referee.seats.error }) : null,
    referee.seats?.loading ? h('p', { class: 'empty', text: 'Reading seats\u2026' }) : null,
    referee.tab === 'Players' && state.live && referee.seats ? h('div', { class: 'lead-actions' },
      h('button', { type: 'button', class: 'button is-small', text: 'Open an invite', title: 'Mint a code a player can redeem to ask for a seat', onclick: () => handlers.onSeat?.('invite', {}) })) : null,
    h('div', { class: 'directory' },
      h('nav', { class: 'folders', 'aria-label': 'Folders' }, tree.length
        ? tree.map((folder) => h('button', {
          type: 'button',
          class: `folder-row${folder.path === referee.folder ? ' is-open' : ''}`,
          style: `padding-left:${8 + folder.depth * 12}px`,
          'aria-pressed': folder.path === referee.folder,
          onclick: () => go({ folder: folder.path, query: '' })
        }, h('span', { class: 'folder-name', text: folder.name }), h('span', { class: 'folder-count', text: String(folder.count) })))
        : h('p', { class: 'empty', text: 'No folders yet.' })),
      h('ul', { class: 'entries' }, entries.length
        ? entries.map((entry) => h('li', { class: 'entry' },
          h('span', { class: 'entry-name', title: entry.name, text: entry.name }),
          entry.note ? h('span', { class: 'entry-note', title: entry.note, text: entry.note }) : null,
          entry.editable && state.live ? h('button', {
            type: 'button', class: 'button is-small', text: 'File',
            title: 'Move this actor to another folder',
            onclick: () => handlers.onFileActor?.(entry.id, entry.folder)
          }) : null,
          // A seat, an invite or a request to join: what can be done to it.
          entry.seat && state.live ? h('span', { class: 'seat-actions' },
            entry.seat.kind === 'join' ? [
              h('button', { type: 'button', class: 'button is-small', text: 'Admit', onclick: () => handlers.onSeat?.('admit', { ...entry.seat, name: entry.name }) }),
              h('button', { type: 'button', class: 'button is-small', text: 'Decline', onclick: () => handlers.onSeat?.('decline', entry.seat) })
            ] : null,
            entry.seat.kind === 'seat' ? h('button', { type: 'button', class: 'button is-small', text: 'Take back', onclick: () => handlers.onSeat?.('unseat', entry.seat) }) : null,
            entry.seat.kind === 'invite' ? h('button', { type: 'button', class: 'button is-small', text: 'Revoke', onclick: () => handlers.onSeat?.('revoke', entry.seat) }) : null
          ) : null))
        : [h('li', { class: 'entry' }, h('span', { class: 'empty', text: referee.query ? 'Nothing matches.' : 'This folder is empty.' }))])),
    referee.truncated ? h('p', { class: 'cite', text: `${referee.truncated} more here; narrow the search to see them.` }) : null
  ];
}

export function renderDrawer(kind, state, referee, handlers = {}) {
  const tidy = (parts) => parts.flat(Infinity).filter(Boolean);
  if (kind === 'character' && state.character) return tidy(characterDrawer(state.character, state, handlers));
  if (kind === 'ship' && state.ship) return tidy(shipDrawer(state.ship, state));
  if (kind === 'referee') return tidy(refereeDrawer(referee, state, handlers));
  return [];
}

// -------------------------------------------------------------------- talk

export function renderTalkLog(chat) {
  return chat.map((line) => h('p', { class: line.roll ? 'is-roll' : '' }, h('b', { text: `${line.who} ` }), line.text));
}
