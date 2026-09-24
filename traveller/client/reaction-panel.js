// reaction-panel.js — v0.299.0: the reaction throw (Book 3 p.22-23), drawn
// the same on an NPC's sheet and in a fight's setup. The last result, whom the
// party puts forward, a deal (their Admin or Bribery as a DM), the referee's
// own DM, and Throw; a hostile "attacks on 5+/8+" result offers that throw.

function h(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (key === 'checked' || key === 'disabled' || key === 'value') node[key] = value;
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const TONE = (tableTotal) => (tableTotal <= 5 ? 'is-hostile' : tableTotal >= 8 ? 'is-friendly' : 'is-neutral');

export function renderReactionPanel(model, handlers = {}, { title = 'REACTION', readOnly = false } = {}) {
  if (!model) return null;
  const current = model.current;
  const result = current
    ? h('div', { class: `reaction-result ${TONE(current.tableTotal)}` },
      h('b', { text: `${current.tableTotal}: ${current.description}` }),
      h('span', { class: 'reaction-detail', text: ` 2D [${current.dice.join(' ')}]${current.dm ? ` ${current.dm > 0 ? '+' : '\u2212'}${Math.abs(current.dm)}` : ''}${current.speakerName ? ` \u00b7 dealing with ${current.speakerName}` : ''} \u00b7 ${current.date}${current.throws > 1 ? ` \u00b7 thrown ${current.throws} times` : ''}` }),
      current.attack ? h('span', { class: 'reaction-detail', text: ` \u00b7 attack throw ${current.attack.total} vs ${current.attackOn}+: ${current.attack.attacks ? 'they attack' : 'they hold off'}` }) : null)
    : h('p', { class: 'reaction-none', text: 'Not thrown yet. One throw on meeting; one for a whole group (Book 3 p.23).' });
  if (readOnly) return h('div', { class: 'reaction-panel' }, h('div', { class: 'reaction-title', text: title }), result);
  const speaker = h('select', { class: 'sheet-select', 'aria-label': 'Dealing with them' },
    h('option', { value: '', text: 'nobody in particular' }),
    (model.speakers ?? []).map((entry) => h('option', { value: entry.id, text: entry.name })));
  const deal = h('input', { type: 'checkbox', 'aria-label': 'A deal' });
  const dm = h('input', { type: 'number', min: '-6', max: '6', value: '0', 'aria-label': 'Referee DM', style: 'width:48px' });
  const send = (extra = {}) => handlers.onReaction?.({ key: model.key, label: model.label, speakerId: speaker.value || null, deal: deal.checked, dm: Number(dm.value) || 0, ...extra });
  return h('div', { class: 'reaction-panel' },
    h('div', { class: 'reaction-title', text: title }),
    result,
    h('div', { class: 'reaction-controls' },
      h('label', { class: 'sheet-inline', title: '+1 if they have 5+ terms in the army, navy, marines or scouts' }, 'Dealing with ', speaker),
      h('label', { class: 'sheet-check', title: 'Their Admin or Bribery as a DM (Book 3 p.23)' }, deal, ' a deal'),
      h('label', { class: 'sheet-inline', title: 'Other DMs "can and should be created"' }, 'DM ', dm),
      h('button', { type: 'button', class: 'button is-small is-primary', text: current ? 'Throw again' : 'Throw reaction', title: current ? 'After very bad treatment or an unusually dangerous task (Book 3 p.23)' : '2D on the reaction table', onclick: () => send() }),
      current?.attackOn && !current.attack ? h('button', { type: 'button', class: 'button is-small', text: `Do they attack? (${current.attackOn}+)`, onclick: () => handlers.onReactionAttack?.({ key: model.key, label: model.label }) }) : null));
}
