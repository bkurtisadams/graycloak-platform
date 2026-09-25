// kind-button.js — a button's kind is its colour and its icon, never colour
// alone (play.css .kind-*). v0.315.3's scheme, shared since v0.315.6 by the
// play page's column and the vector fight, which builds its own DOM.
//
//   owed      money due, or a gap that stops the ship leaving
//   travel    moves the ship or the trip on
//   money     earns, now or on delivery
//   optional  costs time or a gamble; dashed edge
//   danger    starts or escalates a fight
//   neutral   plain: safe, nothing paid or earned; no icon

const SVG_NS = 'http://www.w3.org/2000/svg';

const KIND_ICONS = Object.freeze({
  owed: [['path', { d: 'M3 2h10v12l-2-1.5L9 14l-2-1.5L5 14l-2-1.5z' }], ['path', { d: 'M6 6h4M6 9h4' }]],
  travel: [['path', { d: 'M2 8h11M9 4l4 4-4 4' }]],
  money: [['path', { d: 'M8 2v7M5 6l3 3 3-3M2 10v4h12v-4' }]],
  optional: [['circle', { cx: 8, cy: 8, r: 6 }], ['path', { d: 'M8 4.5V8l2.5 1.5' }]],
  danger: [['circle', { cx: 8, cy: 8, r: 5.5 }], ['path', { d: 'M8 1v4M8 11v4M1 8h4M11 8h4' }]]
});

function svgNode(tag, attributes) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

export function kindIcon(kind) {
  const parts = KIND_ICONS[kind];
  if (!parts) return null;
  const icon = svgNode('svg', { class: 'kind-icon', width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor',
    'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
  for (const [tag, attributes] of parts) icon.append(svgNode(tag, attributes));
  return icon;
}

function span(text, className = null) {
  const node = document.createElement('span');
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

export function kindButton(action, { small = false, onclick = null, type = 'button', disabled = false } = {}) {
  const kind = action.kind ?? 'neutral';
  const button = document.createElement('button');
  button.type = type;
  button.className = `button kind-${kind}${action.primary ? ' is-lead' : ''}${small ? ' is-small' : ''}`;
  if (disabled) button.disabled = true;
  if (onclick) button.addEventListener('click', onclick);
  const icon = kindIcon(kind);
  if (icon) button.append(icon);
  if (action.note) {
    const text = span(null, 'button-text');
    text.append(span(action.label));
    const note = document.createElement('small');
    note.textContent = action.note;
    text.append(note);
    button.append(text);
  } else button.append(span(action.label));
  return button;
}
