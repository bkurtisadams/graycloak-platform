// sheets.js — v0.249.0. Foundry's own idea: a directory row opens the
// document in a panel of its own, over whatever is on screen, several at
// once. play-session.js's sheetViews() builds the model; this file draws it
// and owns the two presentations.
//
// The two presentations, and why:
//   - Wide: a floating frame, dragged by its title bar, closed with its own
//     X. Two ships can sit side by side.
//   - Narrow (phones): the same sheet full-screen with a back arrow. Nothing
//     to drag to on a phone, and a title-bar drag fights the browser's own
//     scrolling. The component never positions itself; the wrapper does, so
//     the same sheet body serves both.
//
// Rules matched to play-views.js's: every function takes state and returns
// DOM, its own tiny hyperscript, its own sheet- prefixed classes. The one
// piece of state it does keep is each panel's dragged position, which is
// view state play.js has no use for and which must survive a re-render.

const DRAGGED = new Map();

function h(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'text') node.textContent = value;
    else if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node[key] = value;
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

function svg(tag, attributes = {}, ...children) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (value === null || value === undefined) continue;
    node.setAttribute(key, String(value));
  }
  for (const child of children.flat(Infinity)) if (child) node.append(child);
  return node;
}

/**
 * The badge a row and a sheet share. An actor is one figure, a statblock is
 * several — the difference is the whole point of the split, so it is drawn
 * rather than left to a word at the end of the row.
 */
export function actorBadge(kind, { side = 'party', size = 30 } = {}) {
  const colour = side === 'opposition' ? 'var(--red)' : side === 'neutral' ? 'var(--ink-2)' : 'var(--signal)';
  const node = svg('svg', { viewBox: '0 0 32 32', class: 'sheet-badge', width: size, height: size, role: 'img', 'aria-label': kind === 'statblock' ? 'Statblock' : 'Actor' });
  if (kind === 'statblock') {
    node.append(
      svg('circle', { cx: 11, cy: 13, r: 4, fill: 'var(--ink-2)' }),
      svg('path', { d: 'M4 27 a8 7 0 0 1 14 0 Z', fill: 'var(--ink-2)' }),
      svg('circle', { cx: 22, cy: 11, r: 3.5, fill: colour }),
      svg('path', { d: 'M15 25 a8 7 0 0 1 14 0 Z', fill: colour })
    );
  } else {
    node.append(svg('circle', { cx: 16, cy: 12, r: 5, fill: colour }), svg('path', { d: 'M6 28 a10 9 0 0 1 20 0 Z', fill: colour }));
  }
  return node;
}

/** A hull badge for a ship row: the type code inside a shape per hull kind. */
export function shipBadge(typeCode, { side = 'party', size = 30 } = {}) {
  const colour = side === 'opposition' ? 'var(--red)' : 'var(--signal)';
  const node = svg('svg', { viewBox: '0 0 32 32', class: 'sheet-badge', width: size, height: size, role: 'img', 'aria-label': `Type ${typeCode ?? '?'} hull` });
  const wedge = ['S', 'C', 'Y'].includes(typeCode);
  node.append(wedge
    ? svg('path', { d: 'M16 5 L26 20 L16 27 L6 20 Z', fill: colour })
    : svg('rect', { x: 6, y: 9, width: 20, height: 14, fill: colour }));
  const text = svg('text', { x: 16, y: 20, 'font-size': 9, 'text-anchor': 'middle', fill: 'var(--raise)', 'font-weight': 700 });
  text.textContent = typeCode ?? '?';
  node.append(text);
  return node;
}

// ----------------------------------------------------------------- bodies

function field(label, value, { onchange = null, width = null, type = 'text', locked = false } = {}) {
  const input = h('input', {
    type, value: String(value ?? ''), 'aria-label': label, disabled: locked || !onchange,
    class: locked ? 'is-locked' : null, style: width ? `width:${width}px` : null,
    onchange: onchange ? (event) => onchange(event.currentTarget.value) : null
  });
  return h('label', { class: 'sheet-field' }, h('span', { text: label }), input);
}

function shipBody(sheet, handlers) {
  const parts = [];
  if (!sheet.editable) {
    parts.push(h('p', { class: 'sheet-note is-error', text: 'A fight is writing to this ship. Corrections go through the fight, or wait until it ends.' }));
  }
  parts.push(h('div', { class: 'sheet-section-label', text: 'BOOK 2 P.24 DATA CARD' }));
  parts.push(sheet.lines.length
    ? h('pre', { class: 'sheet-card', text: sheet.lines.join('\n') })
    : h('p', { class: 'sheet-note', text: 'No data card: this hull has no recorded drives or computer.' }));
  const ship = sheet.ship;
  if (ship) {
    parts.push(h('div', { class: 'sheet-rows' },
      field('Name', sheet.title, { onchange: (value) => handlers.onEditShip?.(sheet.id, 'name', value), locked: !sheet.editable }),
      field('Fuel aboard, tons', ship.fuel.now, { type: 'number', width: 90, onchange: (value) => handlers.onEditShip?.(sheet.id, 'fuel', value), locked: !sheet.editable }),
      field('Ship account, Cr', ship.accountCr ?? 0, { type: 'number', width: 130, onchange: (value) => handlers.onEditShip?.(sheet.id, 'account', value), locked: !sheet.editable })));
  }
  parts.push(h('div', { class: 'sheet-actions' },
    h('button', { type: 'button', class: 'button is-small', text: 'Stage on a scene', onclick: () => handlers.onStageDocument?.('ship', sheet.id) }),
    h('button', { type: 'button', class: 'button is-small', text: 'Copy', onclick: () => handlers.onCopyDocument?.('ship', sheet.id) })));
  return parts;
}

function uppGrid(sheet, handlers, { locked }) {
  const keys = ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'];
  return h('div', { class: 'sheet-upp' }, keys.map((key) => h('label', { class: 'sheet-upp-cell' },
    h('span', { text: key }),
    h('input', {
      type: 'number', value: String(sheet.characteristics[key] ?? 0), 'aria-label': `${key} of ${sheet.title}`,
      disabled: locked, class: locked ? 'is-locked' : null,
      onchange: (event) => handlers.onEditActor?.(sheet.id, 'characteristics', { ...sheet.characteristics, [key]: Number(event.currentTarget.value) || 0 })
    }))));
}

function select(label, value, choices, onchange, { locked = false } = {}) {
  const node = h('select', {
    'aria-label': label, disabled: locked,
    onchange: (event) => onchange(event.currentTarget.value)
  }, choices.map(({ key, name }) => h('option', { value: key, selected: key === value, text: name })));
  return h('label', { class: 'sheet-field' }, h('span', { text: label }), node);
}

// The compact form, which is the whole of a statblock's sheet and the
// fighting form of a character's: the UPP as six boxes, the weapon, the
// skills, and the one action. A statblock also carries the numbering option
// and places several at once; a character has one of itself to place.
function actorCompact(sheet, handlers) {
  const locked = !sheet.editable;
  const weapons = sheet.weaponChoices ?? [];
  const armours = (sheet.armorChoices ?? []).map((key) => ({ key, name: key === 'none' ? 'No armour' : key === 'combat' ? 'Battle Dress' : key[0].toUpperCase() + key.slice(1) }));
  const parts = [
    h('div', { class: 'sheet-compact-head' },
      actorBadge(sheet.statblock ? 'statblock' : 'actor', { side: sheet.statblock ? 'opposition' : 'party', size: 38 }),
      h('div', {},
        h('div', { class: 'sheet-upp-line', text: sheet.upp }),
        h('div', { class: 'sheet-note', text: sheet.subtitle }))),
    uppGrid(sheet, handlers, { locked }),
    h('div', { class: 'sheet-rows' },
      weapons.length ? select('Weapon', sheet.weaponKey, weapons, (key) => handlers.onEditActor?.(sheet.id, 'loadout', { weaponKey: key, armor: sheet.armor }), { locked }) : null,
      armours.length ? select('Armour', sheet.armor, armours, (key) => handlers.onEditActor?.(sheet.id, 'loadout', { weaponKey: sheet.weaponKey, armor: key }), { locked }) : null),
    h('div', { class: 'sheet-rows' },
      // v0.263.0: a character's skills are objects ("[object Object]" was
      // the join of them); an actor's are already text.
      field('Skills', sheet.skills.map((skill) => (typeof skill === 'string' ? skill : skill.label)).join(', '), { onchange: (value) => handlers.onEditSkills?.(sheet.id, value), locked, width: 240 }))
  ];
  if (sheet.statblock) {
    const count = h('input', { type: 'number', min: '1', value: '1', 'aria-label': 'How many to place', style: 'width:56px' });
    parts.push(h('label', { class: 'sheet-check' },
      h('input', { type: 'checkbox', checked: sheet.numberTokens, disabled: locked, onchange: (event) => handlers.onNumberTokens?.(sheet.id, event.currentTarget.checked) }),
      ' Number the tokens (Bandit 1, Bandit 2\u2026)'));
    parts.push(h('div', { class: 'sheet-actions' },
      h('span', { class: 'sheet-note', text: 'A pattern: each token placed owns its own wounds.' }),
      h('label', { class: 'sheet-inline' }, 'Place ', count),
      h('button', { type: 'button', class: 'button is-small', text: 'Place on scene', onclick: () => handlers.onStageDocument?.('actor', sheet.id, Number(count.value) || 1) })));
  } else {
    parts.push(h('div', { class: 'sheet-actions' },
      h('span', { class: 'sheet-note', text: 'One person: one sheet, one set of wounds.' }),
      h('button', { type: 'button', class: 'button is-small', text: 'Put on the board', onclick: () => handlers.onStageDocument?.('actor', sheet.id, 1) })));
  }
  return parts.filter(Boolean);
}

function actorFull(sheet, handlers) {
  const locked = !sheet.editable;
  const parts = [
    h('div', { class: 'sheet-rows' },
      field('Name', sheet.title, { onchange: (value) => handlers.onEditActor?.(sheet.id, 'name', value), locked }),
      sheet.character ? null : field('Folder', sheet.folder ?? '', { onchange: (value) => handlers.onFileActor?.(sheet.id, value), locked })),
    h('div', { class: 'sheet-section-label', text: 'UNIVERSAL PERSONALITY PROFILE' }),
    uppGrid(sheet, handlers, { locked }),
    // v0.266.0: an actor's full form edits skills too; only the compact
    // form could, so an actor opened full had no way to add one.
    sheet.character
      ? (sheet.skills.length ? h('div', { class: 'sheet-chips' }, sheet.skills.map((skill) => h('span', { class: 'sheet-chip', text: typeof skill === 'string' ? skill : skill.label }))) : h('p', { class: 'sheet-note', text: 'No skills recorded.' }))
      : h('div', { class: 'sheet-rows' }, field('Skills', sheet.skills.join(', '), { onchange: (value) => handlers.onEditSkills?.(sheet.id, value), locked, width: 320 })),
    h('div', { class: 'sheet-rows' },
      (sheet.weaponChoices ?? []).length ? select('Weapon', sheet.weaponKey, sheet.weaponChoices, (key) => handlers.onEditActor?.(sheet.id, 'loadout', { weaponKey: key, armor: sheet.armor }), { locked }) : null,
      (sheet.armorChoices ?? []).length ? select('Armour', sheet.armor, sheet.armorChoices.map((key) => ({ key, name: key === 'none' ? 'No armour' : key === 'combat' ? 'Battle Dress' : key[0].toUpperCase() + key.slice(1) })), (key) => handlers.onEditActor?.(sheet.id, 'loadout', { weaponKey: sheet.weaponKey, armor: key }), { locked }) : null)
  ];
  if (!sheet.character) {
    // Kurt, Sep 2026: numbering defaults to on, because a tracker of five
    // rows all reading "Bandit" cannot be used.
    parts.push(h('label', { class: 'sheet-check' },
      h('input', { type: 'checkbox', checked: sheet.numberTokens, onchange: (event) => handlers.onNumberTokens?.(sheet.id, event.currentTarget.checked) }),
      ' Number the tokens (Bandit 1, Bandit 2\u2026)'));
    parts.push(h('div', { class: 'sheet-actions' },
      h('span', { class: 'sheet-note', text: sheet.statblock ? 'A pattern: each token placed owns its own wounds.' : 'One person: one sheet, one set of wounds.' }),
      h('button', {
        type: 'button', class: 'button is-small',
        text: sheet.statblock ? 'Make an actor' : 'Make a statblock',
        onclick: () => handlers.onActorKind?.(sheet.id, sheet.statblock ? 'actor' : 'statblock')
      })));
  }
  return parts.filter(Boolean);
}

// --------------------------------------------------------- character sheet
// v0.250.0. Built for play rather than as a facsimile of TAS Form 2: a band
// of vitals that never scrolls away, then four tabs in the order they get
// opened. Form 2's own content is the Record tab; Form 2 itself is the print
// view of the same fields.

const KG = (grams) => `${Math.round(grams / 100) / 10} kg`;

function vitalsBand(sheet) {
  const cell = (key) => {
    const entry = sheet.effective[key];
    const hurt = entry.now < entry.full;
    const held = entry.played !== entry.now;
    return h('div', { class: `sheet-vital${hurt ? ' is-hurt' : ''}`, title: held ? 'Encumbered: one less on this (Book 1 p.33)' : null },
      h('span', { class: 'sheet-vital-key', text: key }),
      h('span', { class: 'sheet-vital-now' },
        String(held ? entry.played : entry.now),
        hurt ? h('small', { text: `/${entry.full}` }) : null));
  };
  const aging = sheet.aging ?? {};
  const modifier = Math.round((aging.modifierMonths ?? 0) / 12);
  return h('div', { class: 'sheet-band' },
    h('div', { class: 'sheet-vitals' }, ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'].map(cell)),
    h('div', { class: 'sheet-band-side' },
      h('div', {}, h('span', { class: 'sheet-label', text: 'Cash' }), h('b', { text: `Cr ${Number(sheet.cashCr).toLocaleString('en-US')}` })),
      sheet.load ? h('div', {}, h('span', { class: 'sheet-label', text: 'Load' }), h('span', { text: `${KG(sheet.load.loadGrams)} of ${KG(sheet.load.normalGrams)}` })) : null,
      h('div', {}, h('span', { class: 'sheet-label', text: 'Age' }),
        h('span', { text: `${aging.age}${modifier ? ` (${modifier > 0 ? '+' : ''}${modifier})` : ''}${aging.nextCheckAge ? ` \u00b7 check at ${aging.nextCheckAge}` : ''}` }))));
}

function playTab(sheet, handlers) {
  const locked = !sheet.editable;
  const armours = (sheet.armorChoices ?? []).map((key) => ({ key, name: key === 'none' ? 'No armour' : key === 'combat' ? 'Battle Dress' : key[0].toUpperCase() + key.slice(1) }));
  const encumbered = (sheet.load?.penalty ?? 0) !== 0;
  return [
    encumbered ? h('p', { class: 'sheet-note is-error', text: `${sheet.load.words} \u2014 the scores above are what every throw from this sheet uses.` }) : null,
    h('div', { class: 'sheet-section-label', text: 'IN HAND' }),
    h('div', { class: 'sheet-inhand' },
      h('div', { class: 'sheet-inhand-what' },
        h('b', { text: sheet.weaponName ?? 'Empty hands' }),
        h('span', { class: 'sheet-note', text: sheet.weaponKey && sheet.skills.find((skill) => skill.name.toLowerCase() === (sheet.weaponName ?? '').toLowerCase())
          ? `${sheet.weaponName}-${sheet.skills.find((skill) => skill.name.toLowerCase() === sheet.weaponName.toLowerCase()).level}`
          : 'expertise \u00bd, as every character has in every weapon: no penalty, no DM (Book 1 p.12)' })),
      h('button', { type: 'button', class: 'button is-small is-primary', text: 'Attack', disabled: !sheet.weaponKey, onclick: () => handlers.onSheetRoll?.(sheet.id, { kind: 'attack', weaponKey: sheet.weaponKey }) })),
    h('div', { class: 'sheet-rows' },
      (sheet.weaponChoices ?? []).length ? select('Weapon', sheet.weaponKey, sheet.weaponChoices, (key) => handlers.onEditCharacter?.(sheet.id, 'loadout', { weaponKey: key, armor: sheet.armor }), { locked }) : null,
      armours.length ? select('Armour', sheet.armor, armours, (key) => handlers.onEditCharacter?.(sheet.id, 'loadout', { weaponKey: sheet.weaponKey, armor: key }), { locked }) : null),
    h('p', { class: 'sheet-note', text: 'Armour sets the throw anyone shooting at you needs, as well as your own protection (Book 1 p.42).' }),
    conditionBlock(sheet, handlers),
    // v0.263.0: the label is the throw (2D + Book 1's DM, into chat); the
    // second line says what the skill is for, not the level again; ⓘ or
    // Shift+click puts the full description in chat.
    h('div', { class: 'sheet-section-label', text: 'SKILLS \u2014 CLICK TO THROW \u00b7 SHIFT+CLICK OR \u24d8 TO DESCRIBE IN CHAT' }),
    sheet.skills.length
      ? h('div', { class: 'sheet-skills' }, sheet.skills.map((skill) => h('div', { class: 'sheet-skill-card' },
        h('button', {
          type: 'button', class: 'sheet-skill',
          title: `${skill.summary ?? ''}${skill.page ? ` (Book 1 p.${skill.page})` : ''}\n\nClick: throw 2D ${skill.dm >= 0 ? '+' : '\u2212'}${Math.abs(skill.dm)}. Shift+click: describe in chat.`,
          onclick: (event) => (event.shiftKey ? handlers.onSkillInfo?.(sheet.id, skill.name) : handlers.onSkillRoll?.(sheet.id, skill.name))
        },
        h('b', { text: skill.label }),
        h('small', { text: skill.tagline ?? '' })),
        h('button', { type: 'button', class: 'sheet-skill-info', 'aria-label': `Describe ${skill.name} in chat`, title: 'Describe in chat', text: '\u24d8', onclick: () => handlers.onSkillInfo?.(sheet.id, skill.name) }))))
      : h('p', { class: 'sheet-note', text: 'No skills recorded.' })
  ].filter(Boolean);
}

// v0.261.0: Book 1 p.31 — "Return to full strength requires medical
// attention, or three days of rest"; the severely wounded (two
// characteristics taken to zero) cannot rest it off. The medical throw is
// Kurt's ruling: 8+, DM the attending character's Medical, -5 with none.
function conditionBlock(sheet, handlers) {
  const condition = sheet.condition;
  if (!condition) return null;
  if (condition.dead) return h('p', { class: 'sheet-note is-error', text: 'Dead.' });
  if (!condition.wounded && !condition.severe) return h('p', { class: 'sheet-note', text: 'Unwounded.' });
  const medic = h('select', { class: 'sheet-select', 'aria-label': 'Attending' },
    condition.medics.map((entry) => h('option', { value: entry.id, text: `${entry.name} \u2014 ${entry.level === null ? 'no Medical (\u22125)' : `Medical-${entry.level}`}` })));
  const xeno = h('input', { type: 'checkbox', 'aria-label': 'Non-human patient' });
  return h('div', { class: 'sheet-condition' },
    h('div', { class: 'sheet-section-label', text: 'CONDITION' }),
    h('p', { class: `sheet-note${condition.severe ? ' is-error' : ''}`, text: condition.severe
      ? 'Severely wounded: only medical attention will bring back full strength (Book 1 p.31).'
      : 'Wounded: three days of rest, or medical attention, brings back full strength (Book 1 p.31).' }),
    h('div', { class: 'sheet-actions' },
      h('button', { type: 'button', class: 'button is-small', disabled: condition.severe, title: condition.severe ? 'Not possible while severely wounded' : 'Advances the campaign three days', text: 'Rest three days', onclick: () => handlers.onRest?.(sheet.id) }),
      h('span', { class: 'sheet-inline' }, 'Attending ', medic),
      h('label', { class: 'sheet-check', title: '1981 xeno-medicine: \u22122 treating a non-human' }, xeno, ' non-human'),
      h('button', { type: 'button', class: 'button is-small is-primary', text: 'Medical attention (8+)', title: 'Takes a day, success or not', onclick: () => handlers.onMedical?.(sheet.id, medic.value, xeno.checked) })));
}

function gearTab(sheet, handlers) {
  const load = sheet.load;
  const parts = [];
  if (load) {
    // Book 1 p.33 drawn out: free to STR in kilograms, encumbered to twice
    // it, military to three times, each band widened or narrowed by the
    // local gravity.
    const span = load.tripleGrams || 1;
    const width = (grams) => `${Math.min(100, (grams / span) * 100)}%`;
    parts.push(h('div', { class: 'sheet-load' },
      h('div', { class: 'sheet-load-head' },
        h('span', { class: 'sheet-label', text: 'Load' }),
        h('b', { text: KG(load.loadGrams) }),
        h('span', { class: 'sheet-note', text: `of ${KG(load.normalGrams)} free${load.gravityFactor === null ? '' : `, gravity ${load.gravityFactor}${load.multiplier !== 1 ? ` (${load.multiplier > 1 ? '+' : '\u2212'}${Math.abs(Math.round((load.multiplier - 1) * 1000) / 10)}%)` : ''}`}` }),
        load.penalty ? h('span', { class: 'sheet-load-flag', text: load.words }) : null),
      h('div', { class: 'sheet-load-bar' },
        h('span', { class: 'is-free', style: `width:${width(load.normalGrams)}` }),
        h('span', { class: 'is-enc', style: `width:${width(load.doubleGrams - load.normalGrams)}` }),
        h('span', { class: 'is-mil', style: `width:${width(load.tripleGrams - load.doubleGrams)}` }),
        h('span', { class: 'sheet-load-mark', style: `left:${width(load.loadGrams)}` })),
      h('p', { class: 'sheet-note', text: `Free to ${KG(load.normalGrams)}; encumbered to ${KG(load.doubleGrams)} at one off STR, DEX and END; a military force may carry to ${KG(load.tripleGrams)} at two off.` })));
  }
  parts.push(h('div', { class: 'sheet-section-label' }, 'CARRIED'));
  const rows = (sheet.inventory ?? []).map((item) => h('tr', {},
    h('td', {}, h('input', {
      class: 'sheet-cell', value: item.name, 'aria-label': `Name of ${item.name}`,
      onchange: (event) => handlers.onInventory?.(sheet.id, 'update', item.id, { name: event.currentTarget.value })
    })),
    h('td', {}, h('input', {
      class: 'sheet-cell', type: 'number', min: '1', value: String(item.quantity), 'aria-label': `Quantity of ${item.name}`,
      onchange: (event) => handlers.onInventory?.(sheet.id, 'update', item.id, { quantity: Number(event.currentTarget.value) || 1 })
    })),
    h('td', {}, h('input', {
      class: 'sheet-cell', type: 'number', step: '0.1', min: '0', value: String(item.weightGrams / 1000), 'aria-label': `Weight of ${item.name} in kilograms`,
      onchange: (event) => handlers.onInventory?.(sheet.id, 'update', item.id, { weightKg: Number(event.currentTarget.value) || 0 })
    })),
    h('td', { class: 'sheet-cell-total', text: item.carried ? (item.counts ? KG(item.totalGrams) : 'not counted') : 'stowed' }),
    h('td', {}, h('label', { class: 'sheet-check' },
      h('input', { type: 'checkbox', checked: item.carried, 'aria-label': `${item.name} carried`, onchange: () => handlers.onInventory?.(sheet.id, 'toggle', item.id) }),
      ' carried')),
    h('td', {}, h('button', { type: 'button', class: 'sheet-remove', 'aria-label': `Remove ${item.name}`, text: '\u00d7', onclick: () => handlers.onInventory?.(sheet.id, 'remove', item.id) }))));
  parts.push(h('table', { class: 'sheet-table' },
    h('thead', {}, h('tr', {}, ['Item', 'Qty', 'Each kg', 'Counts', 'Carried', ''].map((label) => h('th', { text: label })))),
    h('tbody', {}, rows.length ? rows : h('tr', {}, h('td', { colspan: '6', class: 'sheet-note', text: 'Nothing carried.' })))));
  // Read off the fields rather than through FormData: the page's own
  // FormData and the one a test harness provides are not the same class, and
  // constructing one from the other's <form> throws.
  parts.push(h('form', { class: 'sheet-add', onsubmit: (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const value = (name) => form.querySelector(`[name="${name}"]`)?.value ?? '';
    handlers.onInventory?.(sheet.id, 'add', null, { name: value('name'), weightKg: Number(value('weightKg')) || 0, quantity: Number(value('quantity')) || 1 });
    form.reset();
  } },
    h('input', { name: 'name', type: 'text', placeholder: 'Item', 'aria-label': 'New item name' }),
    h('input', { name: 'quantity', type: 'number', min: '1', value: '1', 'aria-label': 'New item quantity' }),
    h('input', { name: 'weightKg', type: 'number', step: '0.1', min: '0', value: '0', 'aria-label': 'New item weight in kilograms' }),
    h('button', { type: 'submit', class: 'button is-small', text: 'Add item' })));
  parts.push(h('p', { class: 'sheet-note', text: 'Clothing, personal armour and minor items \u2014 holsters, scabbards, belts \u2014 are not counted (p.33). Untick carried for anything stowed aboard ship.' }));
  if (load) {
    parts.push(h('label', { class: 'sheet-check' },
      h('input', { type: 'checkbox', checked: load.military, onchange: (event) => handlers.onInventory?.(sheet.id, 'military', event.currentTarget.checked ? 'on' : 'off') }),
      ' Carrying as part of a military force (p.33: to three times STR, at two off)'));
  }
  if ((sheet.entitlements ?? []).length) {
    parts.push(h('div', { class: 'sheet-section-label', text: 'PASSAGES AND ENTITLEMENTS' }));
    parts.push(h('div', { class: 'sheet-chips' }, sheet.entitlements.map((entry) => h('span', { class: 'sheet-chip', text: entry }))));
  }
  return parts;
}

function recordTab(sheet, handlers) {
  const record = sheet.record ?? {};
  const write = (key) => (value) => handlers.onEditRecord?.(sheet.id, { [key]: value });
  const text = (label, key, { own = true } = {}) => h('label', { class: 'sheet-field' },
    h('span', { text: label }),
    h('input', {
      value: record[key] ?? '', 'aria-label': label, class: own ? 'is-own' : null,
      placeholder: own ? 'not recorded' : null,
      onchange: (event) => write(key)(event.currentTarget.value)
    }));
  const area = (label, key) => h('label', { class: 'sheet-field is-wide' },
    h('span', { text: label }),
    h('textarea', { rows: '2', class: 'is-own', 'aria-label': label, onchange: (event) => write(key)(event.currentTarget.value) }, record[key] ?? ''));
  const aging = sheet.aging ?? {};
  const modifier = Math.round((aging.modifierMonths ?? 0) / 12);
  return [
    h('div', { class: 'sheet-group' },
      h('h3', { text: 'WHO THEY ARE' }),
      h('div', { class: 'sheet-rows' },
        h('label', { class: 'sheet-field' }, h('span', { text: 'Name' }),
          h('input', { value: sheet.title, 'aria-label': 'Name', onchange: (event) => handlers.onEditCharacter?.(sheet.id, 'name', event.currentTarget.value) })),
        text('Noble title', 'nobleTitle'),
        text('Birthworld', 'birthworld'),
        text('Birthdate', 'birthdate')),
      h('p', { class: 'sheet-note', text: `Age ${aging.age}${modifier ? `, modifier ${modifier > 0 ? '+' : ''}${modifier} from anagathics or low berths` : ', no modifier'}${aging.nextCheckAge ? ` \u00b7 next aging check at ${aging.nextCheckAge}` : ''}.` })),
    h('div', { class: 'sheet-group' },
      h('h3', { text: 'SERVICE' }),
      h('div', { class: 'sheet-rows' },
        text('Branch', 'branch'),
        text('Dischargeworld', 'dischargeworld'),
        text('Preferred pistol', 'preferredPistol'),
        text('Preferred blade', 'preferredBlade')),
      area('Special assignments', 'specialAssignments'),
      area('Awards and decorations', 'awards'),
      area('Equipment qualified on', 'equipmentQualifiedOn'),
      h('label', { class: 'sheet-check' },
        h('input', { type: 'checkbox', checked: record.travellersMember, onchange: (event) => write('travellersMember')(event.currentTarget.checked) }),
        ' Travellers\u2019 Aid Society member'),
      h('p', { class: 'sheet-note', text: 'Service, terms, rank and retirement come from generation and are on the printed form.' })),
    h('div', { class: 'sheet-group' },
      h('h3', { text: 'PSIONICS' }),
      h('div', { class: 'sheet-rows' },
        text('Date of test', 'psionicTestDate'),
        h('label', { class: 'sheet-field' }, h('span', { text: 'PSR' }),
          h('input', { type: 'number', min: '0', max: '15', class: 'is-own', value: record.psionicStrength ?? '', 'aria-label': 'Psionic strength rating', onchange: (event) => write('psionicStrength')(event.currentTarget.value) })),
        text('Training completed', 'psionicTrainingCompleted')),
      area('Talents and current levels', 'psionicTalents'),
      h('p', { class: 'sheet-note', text: 'Confidential: the referee decides who else sees this block.' }))
  ];
}

function notesTab(sheet, handlers) {
  return [
    h('label', { class: 'sheet-field is-wide' }, h('span', { text: 'Notes' }),
      h('textarea', { rows: '10', 'aria-label': 'Character notes', onchange: (event) => handlers.onEditCharacter?.(sheet.id, 'notes', event.currentTarget.value) }, sheet.notes ?? '')),
    h('p', { class: 'sheet-note', text: 'Contacts, debts and anything else worth writing down. Yours to keep.' })
  ];
}

function characterBody(sheet, handlers) {
  const tab = sheet.tab && sheet.tabs.includes(sheet.tab) ? sheet.tab : sheet.tabs[0];
  const build = { Play: playTab, Gear: gearTab, Record: recordTab, Notes: notesTab };
  return [
    vitalsBand(sheet),
    h('div', { class: 'sheet-tabs' },
      sheet.tabs.map((name) => h('button', {
        // Written out rather than passed as a boolean: h() turns `true` into
        // a bare attribute, and aria-pressed must read "true" or "false".
        type: 'button', class: 'sheet-tab', 'aria-pressed': name === tab ? 'true' : 'false', text: name,
        onclick: () => handlers.onSheetTab?.(sheet.kind, sheet.id, name)
      })),
      h('button', { type: 'button', class: 'button is-small sheet-print', text: 'Print TAS Form 2', onclick: () => handlers.onPrintCharacter?.(sheet.id) })),
    h('div', { class: 'sheet-tab-body' }, build[tab](sheet, handlers))
  ];
}

function sceneBody(sheet, handlers) {
  return [
    h('div', { class: 'sheet-rows' }, field('Name', sheet.title, { onchange: (value) => handlers.onRenameScene?.(sheet.id, value) })),
    h('p', { class: 'sheet-note', text: sheet.subtitle }),
    h('div', { class: 'sheet-section-label', text: 'STAGED' }),
    sheet.tokens.length
      ? h('ul', { class: 'sheet-list' }, sheet.tokens.map((token) => h('li', { text: `${token.label} \u2014 ${token.side}` })))
      : h('p', { class: 'sheet-note', text: 'Nothing staged yet.' }),
    sheet.bodies.length ? h('ul', { class: 'sheet-list' }, sheet.bodies.map((body) => h('li', { text: `${body.name} (${body.kind})` }))) : null,
    h('div', { class: 'sheet-actions' },
      h('button', { type: 'button', class: `button is-small${sheet.active ? '' : ' is-primary'}`, text: sheet.active ? 'Deactivate' : 'Activate', onclick: () => handlers.onSceneAction?.('activate', sheet.id) }),
      sheet.vector ? h('button', { type: 'button', class: 'button is-small', text: 'Open on the canvas', onclick: () => handlers.onSceneAction?.('stage', sheet.id) }) : null)
  ].filter(Boolean);
}

// ------------------------------------------------------------------ frame

// The dragged position is written as custom properties rather than as left
// and top, so the phone rule can lay the panel out full-screen without having
// to beat an inline style with !important.
function place(panel, at) {
  panel.style.setProperty('--sheet-x', `${at.x}px`);
  panel.style.setProperty('--sheet-y', `${at.y}px`);
}

function dragging(panel, handle, key) {
  handle.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    const start = DRAGGED.get(key) ?? { x: panel.offsetLeft, y: panel.offsetTop };
    const from = { x: event.clientX, y: event.clientY };
    handle.setPointerCapture(event.pointerId);
    const move = (moved) => {
      const at = { x: start.x + (moved.clientX - from.x), y: start.y + (moved.clientY - from.y) };
      // Never off the top or past the right edge: a panel dragged out of
      // reach cannot be dragged back, having taken its own title bar with it.
      at.x = Math.max(8 - panel.offsetWidth + 80, Math.min(at.x, window.innerWidth - 80));
      at.y = Math.max(0, Math.min(at.y, window.innerHeight - 40));
      DRAGGED.set(key, at);
      place(panel, at);
    };
    const drop = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', drop); };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', drop);
  });
}

/**
 * sheets: the array play-session.js's sheetViews() returned.
 * handlers: { onCloseSheet(kind,id), onCompactSheet(kind,id,compact),
 *             onEditShip, onEditActor, onFileActor, onActorKind,
 *             onNumberTokens, onStageDocument, onCopyDocument,
 *             onRenameScene, onSceneAction }
 */
export function renderSheets(sheets, handlers = {}) {
  const layer = h('div', { class: 'sheet-layer' });
  sheets.forEach((sheet, index) => {
    const key = `${sheet.kind}:${sheet.id}`;
    const compact = Boolean(sheet.compact);
    const body = sheet.kind === 'ship' ? shipBody(sheet, handlers)
      : sheet.kind === 'scene' ? sceneBody(sheet, handlers)
        : compact ? actorCompact(sheet, handlers) : (sheet.character ? characterBody(sheet, handlers) : actorFull(sheet, handlers));
    const bar = h('div', { class: 'sheet-bar' },
      h('button', { type: 'button', class: 'sheet-back', 'aria-label': 'Back', text: '\u2190', onclick: () => handlers.onCloseSheet?.(sheet.kind, sheet.id) }),
      h('span', { class: 'sheet-title', text: sheet.title }),
      h('span', { class: 'sheet-subtitle', text: sheet.subtitle }),
      h('span', { class: 'sheet-bar-actions' },
        sheet.compactOnly || sheet.kind !== 'actor' ? null : h('button', {
          type: 'button', class: 'sheet-toggle', text: compact ? 'Full' : 'Compact',
          onclick: () => handlers.onCompactSheet?.(sheet.kind, sheet.id, !compact)
        }),
        h('button', { type: 'button', class: 'sheet-close', 'aria-label': `Close ${sheet.title}`, text: '\u00d7', onclick: () => handlers.onCloseSheet?.(sheet.kind, sheet.id) })));
    const panel = h('section', { class: `sheet${compact ? ' is-compact' : ''}`, 'aria-label': `${sheet.title} sheet` }, bar, h('div', { class: 'sheet-body' }, body));
    // v0.264.0: a character's sheet takes a drop from the Compendium, as
    // Foundry's does from a compendium pack; the drop asks Buy or Give.
    if (sheet.kind === 'actor' && sheet.character) {
      const carriesGear = (event) => [...(event.dataTransfer?.types ?? [])].includes('application/x-graycloak-gear');
      panel.addEventListener('dragover', (event) => {
        if (!carriesGear(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        panel.classList.add('is-drop-target');
      });
      panel.addEventListener('dragleave', (event) => { if (!panel.contains(event.relatedTarget)) panel.classList.remove('is-drop-target'); });
      panel.addEventListener('drop', (event) => {
        if (!carriesGear(event)) return;
        event.preventDefault();
        panel.classList.remove('is-drop-target');
        handlers.onGearDrop?.(sheet.id, event.dataTransfer.getData('application/x-graycloak-gear'), { x: event.clientX, y: event.clientY });
      });
    }
    const at = DRAGGED.get(key) ?? { x: 180 + index * 34, y: 90 + index * 30 };
    place(panel, at);
    dragging(panel, bar, key);
    layer.append(panel);
  });
  return layer;
}

/** Forget a closed panel's position, so it reopens where it belongs. */
export function forgetSheetPosition(kind, id) {
  DRAGGED.delete(`${kind}:${id}`);
}
