// v0.204.0: the fight's two columns, built from the range-band mockup's own
// markup and classes (Combat.dc.html on the design canvas), not from the
// app's older panels restyled. app.js builds the model and the handlers;
// this module only turns them into the drawing. Every class here is
// prefixed fv- so nothing in styles.css can reach in.

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function row(left, right, { leftClass = '', rightClass = 'fv-mono' } = {}) {
  const line = h('div', 'fv-row');
  const a = typeof left === 'string' ? h('span', leftClass, left) : left;
  const b = typeof right === 'string' ? h('span', rightClass, right) : right;
  line.append(a, b);
  return line;
}

function card(title, tag, { tone = '' } = {}) {
  const box = h('div', `fv-card${tone ? ` fv-card-${tone}` : ''}`);
  const head = h('div', 'fv-row');
  head.append(h('span', 'fv-card-title', title));
  if (tag) head.append(h('span', `fv-tag${tag.tone ? ` fv-tag-${tag.tone}` : ''}`, tag.text));
  box.append(head);
  return box;
}

function button(label, className, onClick, { disabled = false, title = '' } = {}) {
  const node = h('button', `fv-btn ${className}`.trim(), label);
  node.type = 'button';
  node.disabled = disabled;
  if (title) node.title = title;
  if (onClick) node.addEventListener('click', onClick);
  return node;
}

/**
 * The left column. model:
 *   place, round, phaseTag {text, tone}
 *   declarations: [{name, target, detail, state: 'declared'|'waiting'}]
 *   tally: 'A ×1 · B ×1'
 *   resolveLabel, canResolve
 *   opposition: {tag, lines: [{name, target, detail, state}], morale}
 *   dms: ['City −4 (range)', ...]
 *   log: {tag, lines: [...]}
 *   throwCard: element | null   (the app's own throw card node)
 * on: {resolve, autoNpcs, endCombat}
 */
export function renderFightDock(host, model, on) {
  host.replaceChildren();
  host.classList.add('fv-dock');
  host.append(row(h('span', 'fv-lbl', 'What now?'), h('span', 'fv-mono fv-muted fv-small', model.place)));

  const round = card(`Round ${model.round} · declarations`, model.phaseTag, { tone: 'live' });
  for (const line of model.declarations) {
    const left = h('span', line.state === 'waiting' ? 'fv-muted' : '', `${line.name}${line.target ? ` → ${line.target}` : ''}`);
    const right = h('span', `fv-mono fv-small${line.state === 'waiting' ? ' fv-muted' : ''}`, line.detail);
    round.append(row(left, right));
  }
  if (model.tally) round.append(row(h('span', 'fv-lbl', 'Party fire on'), h('span', 'fv-mono fv-small', model.tally)));
  const verbs = h('div', 'fv-verbs');
  verbs.append(
    button(model.resolveLabel, '', on.resolve, { disabled: !model.canResolve }),
    button('Auto NPCs', 'fv-quiet', on.autoNpcs, { title: 'Every NPC still declaring by hand goes on auto' })
  );
  round.append(verbs);
  if (model.throwCard) round.append(model.throwCard);
  host.append(round);

  const opp = card('Opposition', model.opposition.tag);
  for (const line of model.opposition.lines) {
    const down = line.state === 'down';
    opp.append(row(
      h('span', down ? 'fv-dim' : '', `${line.name}${line.target ? ` → ${line.target}` : ''}`),
      h('span', `fv-mono fv-small${down ? ' fv-dim' : line.state === 'waiting' ? ' fv-muted' : ''}`, line.detail)
    ));
  }
  if (model.opposition.morale) opp.append(row(h('span', 'fv-lbl', 'Morale'), h('span', 'fv-mono fv-small', model.opposition.morale)));
  host.append(opp);

  const dms = card('Scene DMs', { text: 'B1 p.27' });
  const chips = h('div', 'fv-chips');
  for (const text of model.dms) chips.append(h('span', 'fv-chip', text));
  dms.append(chips);
  host.append(dms);

  const log = card('Round log', { text: model.log.tag });
  for (const text of model.log.lines) log.append(h('div', 'fv-log-line', text));
  host.append(log);

  host.append(h('div', 'fv-grow'));
  const foot = h('div', 'fv-verbs');
  foot.append(button('End combat', 'fv-danger fv-grow', on.endCombat));
  if (model.suspended) {
    foot.append(button(model.suspended.label, 'fv-quiet', on.togglePort, { title: 'Book 1 p.30: port, trade and jobs wait until the encounter is resolved' }));
  }
  host.append(foot);
}

/**
 * The right column. model:
 *   name, subtitle, upp
 *   stats: [{key, value, base, hurt}] for STR DEX END; mental: 'INT 11 · EDU 8 · SOC 7'
 *   status: {text, tone}, blows
 *   posture: 'STAND · rifle · jack'
 *   verbs: null | {fire: {label, disabled}, evade, close, open (each {on:boolean})}
 *   tracker: {note, rows: [{id, side:'party'|'foe'|'other', name, track:[{value,hurt}], orders, state:'active'|'down', selected}]}
 *   ship: 'collapsed · fuel 12/40 · hold 15 t'
 *   canAllocate
 * on: {selectRow(id), contextRow(event,id), fire, evade, close, open, ready(event), add, allocate}
 */
export function renderFightSide(host, model, on) {
  host.replaceChildren();
  host.classList.add('fv-side');

  const ident = h('div', 'fv-ident');
  const who = h('div', 'fv-ident-who');
  const name = h('button', 'fv-name', model.name);
  name.type = 'button';
  if (on.openSheet) name.addEventListener('click', on.openSheet);
  who.append(name, h('div', 'fv-muted fv-subtitle', model.subtitle));
  ident.append(who, h('div', 'fv-mono fv-upp', model.upp));
  host.append(ident);

  const boxes = h('div', 'fv-boxes');
  for (const stat of model.stats) {
    const box = h('button', `fv-box${stat.hurt ? ' fv-box-hurt' : ''}`);
    box.type = 'button';
    box.append(h('span', 'fv-box-key', stat.key), h('b', 'fv-box-value', stat.hurt ? `${stat.value}/${stat.base}` : String(stat.value)));
    if (on.roll) box.addEventListener('click', () => on.roll(stat.key));
    boxes.append(box);
  }
  const mental = h('div', 'fv-box fv-box-mental fv-mono', model.mental);
  boxes.append(mental);
  host.append(boxes);

  host.append(row(h('span', 'fv-lbl', 'Status'), h('span', `fv-mono fv-status${model.status.tone ? ` fv-status-${model.status.tone}` : ''}`, `${model.status.text}${model.blows ? ` · ${model.blows}` : ''}`)));
  const posture = row(h('span', 'fv-lbl', 'Posture'), h('span', 'fv-mono', model.posture));
  if (on.ready) {
    const ready = button('Ready', 'fv-quiet fv-tiny', on.ready, { title: 'Change the weapon in hand' });
    posture.append(ready);
  }
  host.append(posture);

  if (model.verbs) {
    const verbs = h('div', 'fv-verbs fv-verbs-orders');
    verbs.append(
      button(model.verbs.fire.label, `fv-fire${model.verbs.fire.on ? ' fv-on' : ''}`, on.fire, { disabled: model.verbs.fire.disabled }),
      button('Evade', `fv-quiet${model.verbs.evade.on ? ' fv-on' : ''}`, on.evade),
      button('Close', `fv-quiet${model.verbs.close.on ? ' fv-on' : ''}`, on.close),
      button('Open', `fv-quiet${model.verbs.open.on ? ' fv-on' : ''}`, on.open)
    );
    host.append(verbs);
  }

  const trackerHead = row(h('span', 'fv-lbl', 'Combat tracker'), h('span', 'fv-mono fv-muted fv-small', model.tracker.note));
  trackerHead.classList.add('fv-tracker-head');
  host.append(trackerHead);
  const tracker = h('div', 'fv-tracker');
  for (const entry of model.tracker.rows) {
    const line = h('div', `fv-trow fv-trow-${entry.side}${entry.state === 'down' ? ' fv-trow-down' : ''}${entry.selected ? ' fv-trow-selected' : ''}`);
    line.tabIndex = 0;
    line.append(h('span', 'fv-dot'));
    line.append(h('span', 'fv-trow-name', entry.name));
    const track = h('span', 'fv-mono fv-track');
    entry.track.forEach((cell, index) => {
      if (index) track.append(document.createTextNode('·'));
      track.append(h('b', cell.hurt ? 'fv-hurt' : '', String(cell.value)));
    });
    line.append(track);
    line.append(h('span', `fv-mono fv-small fv-orders${entry.state === 'down' ? ' fv-dim' : entry.orders === 'undeclared' ? ' fv-warn' : ''}`, entry.orders));
    line.addEventListener('click', () => on.selectRow(entry.id));
    line.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); on.selectRow(entry.id); } });
    line.addEventListener('contextmenu', (event) => { event.preventDefault(); on.contextRow(event, entry.id); });
    tracker.append(line);
  }
  host.append(tracker);

  const tools = h('div', 'fv-verbs fv-tracker-tools');
  tools.append(
    button('+ Add to combat', 'fv-quiet fv-grow', on.add),
    button('Wound allocation', 'fv-quiet fv-grow', on.allocate, { disabled: !model.canAllocate })
  );
  host.append(tools);

  host.append(h('div', 'fv-grow'));
  const ship = row(h('span', 'fv-lbl', 'Ship'), h('span', 'fv-mono fv-muted fv-small', model.ship));
  ship.classList.add('fv-ship');
  host.append(ship);
}
