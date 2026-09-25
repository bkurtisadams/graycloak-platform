// section-strip.js — a ship's sections as a strip (v0.316.3), shared by the
// play page's ship panel and fight roster and the floating ship sheet.

function el(tag, className, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

// v0.316.3: the ship's sections as a strip, lit by state: running, hit, out
// (destroyed or disabled) or under repair. Colour with a mark, never alone.
const STRIP_MARKS = Object.freeze({ ok: '', hit: '!', out: '\u2715', repairing: '\u21bb' });
export function renderSectionStrip(strip, { label = 'Ship sections' } = {}) {
  if (!strip?.length) return null;
  const list = el('ul', 'section-strip');
  list.setAttribute('aria-label', label);
  for (const cell of strip) {
    const item = el('li', `section-cell is-${cell.state}`);
    item.title = [cell.label, cell.state === 'ok' ? 'running' : cell.state === 'repairing' ? 'under repair (Book 2 p.35)' : cell.state, cell.hits ? `${cell.hits} hit${cell.hits === 1 ? '' : 's'}` : null, cell.detail].filter(Boolean).join(' \u00b7 ');
    item.append(el('span', 'section-label', cell.label));
    const mark = el('span', 'section-mark', STRIP_MARKS[cell.state]);
    mark.setAttribute('aria-hidden', 'true');
    item.append(mark);
    if (cell.detail) item.append(el('span', 'section-detail', cell.detail));
    list.append(item);
  }
  return list;
}

