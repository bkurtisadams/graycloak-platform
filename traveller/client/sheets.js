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
  const armours = (sheet.armorChoices ?? []).map((key) => ({ key, name: key === 'none' ? 'No armour' : key[0].toUpperCase() + key.slice(1) }));
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
      field('Skills', sheet.skills.join(', '), { onchange: (value) => handlers.onEditSkills?.(sheet.id, value), locked, width: 240 }))
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
    sheet.skills.length ? h('div', { class: 'sheet-chips' }, sheet.skills.map((skill) => h('span', { class: 'sheet-chip', text: skill }))) : h('p', { class: 'sheet-note', text: 'No skills recorded.' }),
    h('div', { class: 'sheet-rows' },
      (sheet.weaponChoices ?? []).length ? select('Weapon', sheet.weaponKey, sheet.weaponChoices, (key) => handlers.onEditActor?.(sheet.id, 'loadout', { weaponKey: key, armor: sheet.armor }), { locked }) : null,
      (sheet.armorChoices ?? []).length ? select('Armour', sheet.armor, sheet.armorChoices.map((key) => ({ key, name: key === 'none' ? 'No armour' : key[0].toUpperCase() + key.slice(1) })), (key) => handlers.onEditActor?.(sheet.id, 'loadout', { weaponKey: sheet.weaponKey, armor: key }), { locked }) : null)
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
        : compact ? actorCompact(sheet, handlers) : actorFull(sheet, handlers);
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
