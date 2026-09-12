// ui-debug.js — answering "why can't I see this?" from the console.
//
// v0.90.0. Four times now the answer has been an ancestor two or three levels
// above the element: #roster-section hidden by the retired operations desk,
// .shell-stage collapsed to 1px by an inherited align-items: start, a stage
// sized from a percentage height with no definite ancestor. In each case the
// element itself was correct and the browser's own numbers found it in one
// paste, while reasoning about the code did not.
//
// The inspection logic here is pure: it takes a node and two injected
// readers — a bounding box and a computed style — and returns a plain object.
// That makes it testable without a browser, which matters because a broken
// diagnostic is worse than none: it sends you hunting the wrong thing.

// Below this an element is collapsed for practical purposes — a border alone
// measures a pixel or two.
export const COLLAPSED_PX = 4;

// Why an element might not be on screen, in the order worth checking. The
// first matching reason is the one to act on.
export function diagnoseVisibility(chain) {
  for (const level of chain) {
    if (level.display === 'none') return { visible: false, reason: 'display:none', at: level.label, hint: 'An ancestor is switched off. Look for a hidden attribute or a rule setting display:none — often code that owned the element before a refactor.' };
    if (level.hidden) return { visible: false, reason: 'hidden attribute', at: level.label, hint: 'Something set .hidden = true. Find who, and whether it still should.' };
    if (level.visibility === 'hidden') return { visible: false, reason: 'visibility:hidden', at: level.label, hint: 'Occupies space but is not painted.' };
    if (level.opacity === '0') return { visible: false, reason: 'opacity:0', at: level.label, hint: 'Painted transparent.' };
  }
  // Present in the layout, but with nothing to show. The threshold is not
  // zero: the v0.79.2 stage collapse measured 645x1, because a border still
  // occupies a pixel even when the content box is empty. Anything under a few
  // pixels is collapsed in every way that matters, and an exact-zero test
  // would have missed the case this exists for.
  const tooSmall = (value) => value < COLLAPSED_PX;
  const zero = chain.find((level) => tooSmall(level.width) || tooSmall(level.height));
  if (zero) {
    const which = tooSmall(zero.width) && tooSmall(zero.height) ? 'no width or height'
      : tooSmall(zero.width) ? `no width (${zero.width}px)` : `no height (${zero.height}px)`;
    return {
      visible: false, reason: which, at: zero.label,
      hint: zero.x === 0 && zero.y === 0
        ? 'Zero size at position 0,0 usually means the element was never laid out — check for display:none above it.'
        : 'Laid out but collapsed. A flex or grid parent may not be stretching it, or a percentage height has no definite ancestor to resolve against.'
    };
  }
  return { visible: true, reason: 'on screen', at: chain[0]?.label ?? null, hint: '' };
}

export function describeNode(node, { box, style }) {
  const rect = box(node);
  const computed = style(node);
  const id = node.id ? `#${node.id}` : '';
  const cls = typeof node.className === 'string' && node.className ? `.${node.className.trim().split(/\s+/).join('.')}` : '';
  return {
    label: `${(node.tagName ?? 'NODE').toLowerCase()}${id}${cls}`,
    width: Math.round(rect.width), height: Math.round(rect.height),
    x: Math.round(rect.left), y: Math.round(rect.top),
    display: computed.display, visibility: computed.visibility, opacity: computed.opacity,
    overflow: computed.overflow, position: computed.position,
    gridRow: computed.gridRow, flex: computed.flex,
    hidden: Boolean(node.hidden)
  };
}

// Walk from the node to the stop element (exclusive), nearest first.
export function inspectChain(node, { box, style, parentOf, stopAt = null } = {}) {
  const chain = [];
  let current = node;
  while (current && current !== stopAt && chain.length < 30) {
    chain.push(describeNode(current, { box, style }));
    current = parentOf(current);
  }
  return chain;
}

export function inspectElement(node, readers) {
  const chain = inspectChain(node, readers);
  return { chain, ...diagnoseVisibility(chain) };
}

// One line per level, nearest first, with the diagnosis last — the shape I
// have been asking for by hand.
export function formatInspection({ chain, reason, at, hint }) {
  const lines = chain.map((level) =>
    `${level.label}  ${level.width}x${level.height} @${level.x},${level.y}  display:${level.display}  visibility:${level.visibility}  hidden:${level.hidden}`
  );
  lines.push(`→ ${reason}${at ? ` at ${at}` : ''}${hint ? `\n  ${hint}` : ''}`);
  return lines.join('\n');
}
