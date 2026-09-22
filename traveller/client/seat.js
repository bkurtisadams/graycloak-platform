// seat.js — v0.277.0: the player's seat on the new play page.
//
// Kurt's screenshot (Sep 2026): players entering a campaign still got the old
// player page. This is the new one: the masthead, the player's own sheets
// (the referee page's tabbed sheet, read-only), where the party is, the
// shared chat (v0.277.0), and the fight — the band line, their orders, and
// their wounds to place (v0.278.0).
//
// A player cannot read the campaign itself, only what the referee publishes
// for them (Firestore rules): the campaign summary, their own characters,
// their filtered log, and the chat. Everything here is built from those.

import { h, renderTalkLog, bandsScene } from './play-views.js?v=v0.280.0';
import { renderSheets, forgetSheetPosition } from './sheets.js?v=v0.280.0';
import { initAuth, currentUserId, onAuthChange, authStatus } from './auth.js?v=v0.280.0';
import { ensureFirestore, watchChat, sendChatMessage, watchDeclarations, writeDeclaration, writeWoundAllocation } from './publish.js?v=v0.280.0';
import { createPlayerDeclaration } from '../src/player-declaration.js?v=v0.280.0';
import { createPlayerWoundAllocation } from '../src/player-wound-allocation.js?v=v0.280.0';
import { woundPromptFrom, initialWoundDraft, previewWoundDraft, renderWoundGroups, renderWoundPreview, woundHitLine } from './wound-dialog.js?v=v0.280.0';
import { interpretChatInput, createChatMessage, rollFormula, formatRoll } from '../src/dice-tray.js?v=v0.280.0';
import { playerSheetViews, formatCampaignDate } from '../src/play-session.js?v=v0.280.0';
import { importCharacterDocument, skillGuide, skillDM, PERSONAL_WEAPONS } from '../vendor/classic-traveller-rules/index.js?v=v0.280.0';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js?v=v0.280.0';

const THEME_KEY = 'graycloak-traveller-theme';
const $ = (id) => document.getElementById(id);
const campaignId = new URLSearchParams(window.location.search).get('campaign');

const state = {
  envelope: null,
  published: new Map(), // characterId -> published character document
  log: null,
  chat: [],
  status: null,
  sheets: null, // [{ kind, id, tab, compact }] — null until the first characters arrive
  // v0.278.0: the fight, as the referee publishes it for players.
  view: null,
  viewFor: null,
  declarations: [],
  selected: null,
  bandsShown: null,
  drafts: new Map(), // actorId -> { action, targetId }
  woundDraft: null,
  answeredWoundKey: null
};
const fightStops = [];
const stops = [];

// A published character is the character document with the campaign's
// envelope added. Sheets published before v0.277.0 lack the inventory,
// record and provenance, and are filled with empties until the referee's
// next save sends them in full.
function characterFrom(published) {
  const { campaignId: _c, characterId: _id, ownerUid: _o, publishedAt: _p, ...document } = published;
  try {
    return importCharacterDocument({ inventory: [], record: {}, provenance: {}, ...document });
  } catch (error) {
    console.warn('[traveller-seat] sheet not readable yet:', error?.message ?? error);
    return null;
  }
}

function characters() {
  return [...state.published.values()].map(characterFrom).filter(Boolean);
}

function myName() {
  const first = characters()[0];
  const { user } = authStatus();
  return first?.identity?.name || user?.displayName || user?.email || 'Player';
}

function setStatus(text, kind = 'ok') {
  state.status = text ? { text, kind } : null;
  renderMast();
}

// ---- rendering ----------------------------------------------------------

function renderMast() {
  const envelope = state.envelope;
  $('mast-campaign').textContent = envelope?.name ?? 'Traveller';
  $('mast-place').textContent = envelope?.location?.worldName ?? envelope?.location?.systemName ?? '';
  $('mast-detail').textContent = envelope?.location?.systemName && envelope.location.systemName !== envelope.location.worldName ? envelope.location.systemName : '';
  $('mast-date').textContent = envelope?.time ? formatCampaignDate(envelope.time) : '';
  const status = $('mast-status');
  status.hidden = !state.status;
  if (state.status) {
    status.className = `mast-save is-${state.status.kind === 'error' ? 'error' : 'cloud'}`;
    status.textContent = state.status.text;
  }
  const chips = characters().map((character) => {
    const hurt = ['STR', 'DEX', 'END'].some((key) => Number(character.current?.[key]) < Number(character.characteristics?.[key]));
    return h('button', { type: 'button', class: `chip${hurt ? ' is-hurt' : ''}`, title: 'Open the sheet', onclick: () => openSheet(character.identity.id) },
      h('span', { class: 'chip-name', text: character.identity.name || '(unnamed)' }),
      h('span', { class: 'chip-line' }, h('span', { class: 'code', text: character.upp ?? '' }), hurt ? ' Wounded' : ` Cr ${Number(character.finances?.credits ?? 0).toLocaleString('en-US')}`));
  });
  const ship = envelope?.ship;
  if (ship) {
    chips.push(h('span', { class: 'chip' },
      h('span', { class: 'chip-name', text: ship.name ?? 'Ship' }),
      h('span', { class: 'chip-line', text: `Fuel ${ship.fuel?.aboardTons ?? '?'}/${ship.fuel?.capacityTons ?? '?'}  Hold ${Math.max(0, (ship.cargo?.capacityTons ?? 0) - (ship.cargo?.usedTons ?? 0))} t free` })));
  }
  $('mast-chips').replaceChildren(...chips);
  $('theme').textContent = document.documentElement.dataset.theme === 'dark' ? 'Light' : 'Dark';
  document.title = `${envelope?.location?.worldName ?? 'Traveller'} | ${envelope?.name ?? ''} | Traveller`;
}

function renderNow() {
  const list = characters();
  const who = list.length
    ? list.map((character) => h('div', { class: 'seat-who' },
      h('b', { text: character.identity.name || '(unnamed)' }),
      h('span', { class: 'cite', text: [character.upp, character.career?.service].filter(Boolean).join(' \u00b7 ') }),
      h('button', { type: 'button', class: 'button is-small', text: 'Sheet', onclick: () => openSheet(character.identity.id) })))
    : [h('p', { class: 'cite', text: currentUserId() ? 'Waiting for the referee to publish your character.' : 'Sign in from the lobby to take your seat.' })];
  $('now').replaceChildren(h('section', { class: 'lead' }, h('h2', { text: 'You play' }), ...who));
}

function renderScene() {
  const envelope = state.envelope;
  const body = [];
  if (!campaignId) {
    body.push(h('p', { text: 'No campaign named. Enter from the lobby.' }));
  } else if (!envelope) {
    body.push(h('p', { class: 'cite', text: currentUserId() ? 'Connecting\u2026' : 'Sign in from the lobby first.' }));
  } else {
    const where = envelope.location ?? {};
    body.push(h('section', { class: 'seat-card' },
      h('h2', { text: 'Where you are' }),
      h('p', {}, h('b', { text: where.worldName ?? where.systemName ?? 'Somewhere' }),
        where.systemName && where.systemName !== where.worldName ? ` in the ${where.systemName} system` : ''),
      h('p', { class: 'cite', text: envelope.time ? `Date ${formatCampaignDate(envelope.time)}` : '' })));
    const ship = envelope.ship;
    if (ship) {
      body.push(h('section', { class: 'seat-card' },
        h('h2', { text: ship.name ?? 'Your ship' }),
        h('p', { class: 'cite', text: [ship.typeName, ship.tons ? `${ship.tons} t` : null, ship.jumpRating ? `Jump-${ship.jumpRating}` : null].filter(Boolean).join(' \u00b7 ') }),
        h('p', { text: `Fuel ${ship.fuel?.aboardTons ?? '?'} / ${ship.fuel?.capacityTons ?? '?'} t \u00b7 Hold ${ship.cargo?.usedTons ?? 0} / ${ship.cargo?.capacityTons ?? '?'} t` })));
    }
    if (envelope.currentEncounterId && !fightLive()) {
      body.push(h('section', { class: 'seat-card is-fight' },
        h('h2', { text: 'A fight is under way' }),
        h('p', { class: 'cite', text: 'Waiting for the referee\u2019s board\u2026' })));
    }
  }
  if (fightLive()) {
    $('shell').dataset.situation = 'fight';
    $('scene').replaceChildren(fightScene());
    return;
  }
  $('shell').dataset.situation = 'port';
  $('scene').replaceChildren(h('div', { class: 'seat-scene' }, ...body));
}

// ---- the fight (v0.278.0) ---------------------------------------------------
// Drawn from the published view: where everyone stands (the band line), the
// player's own throw against each foe, and the last rounds told as a story.
// The player's part is their own combatants' orders, sent to the referee as
// declarations, and their own wounds, placed when the round pauses for them.

function fightLive() {
  return Boolean(state.view && (state.view.status === 'active' || state.view.status === 'setup') && state.view.encounterId === state.envelope?.currentEncounterId);
}

function mine() {
  const uid = currentUserId();
  return new Set(Object.entries(state.envelope?.ownership?.actors ?? {}).filter(([, owner]) => owner === uid).map(([id]) => id));
}

const DOWN = new Set(['unconscious', 'dead', 'escaped', 'withdrawn']);
const ORDERS = [
  { action: 'attack', label: 'Attack', target: true },
  { action: 'wait', label: 'Hold (no action)', target: false },
  { action: 'close', label: 'Close one band', target: true },
  { action: 'open', label: 'Open one band', target: true },
  { action: 'close-run', label: 'Close at a run (two bands)', target: true },
  { action: 'open-run', label: 'Open at a run (two bands)', target: true },
  { action: 'evade', label: 'Evade', target: false },
  { action: 'escape', label: 'Escape', target: false }
];

function fighters() {
  return (state.view?.combatants ?? []).map((entry) => ({
    id: entry.id,
    name: entry.name,
    side: entry.side === 'party' ? 'party' : 'foe',
    band: Number(entry.position?.column ?? 0),
    down: DOWN.has(entry.condition),
    characteristics: { STR: 1, DEX: 1, END: 1 },
    condition: entry.condition
  }));
}

function declarationFor(actorId) {
  return state.declarations.find((entry) => entry.actorId === actorId && entry.round === state.view?.declaringRound) ?? null;
}

async function sendOrder(actorId) {
  const draft = state.drafts.get(actorId) ?? { action: 'attack', targetId: null };
  const order = ORDERS.find((entry) => entry.action === draft.action) ?? ORDERS[0];
  try {
    const declaration = createPlayerDeclaration({
      uid: currentUserId(), actorId, action: order.action,
      targetId: order.target ? draft.targetId : null,
      round: state.view.declaringRound, declaredAt: Date.now()
    });
    await writeDeclaration(campaignId, state.view.encounterId, declaration);
    setStatus('Order sent. Waiting for the referee.', 'ok');
  } catch (error) {
    setStatus(error?.code === 'permission-denied' ? 'The order was refused: already given this round?' : (error?.message ?? String(error)), 'error');
  }
}

function orderRow(fighter, foes) {
  const sent = declarationFor(fighter.id);
  const throws = (state.view.throws ?? []).filter((entry) => entry.attackerId === fighter.id);
  if (fighter.down) return h('div', { class: 'seat-order is-down' }, h('b', { text: fighter.name }), h('span', { class: 'cite', text: ` is ${fighter.condition}.` }));
  if (sent) {
    const target = foes.find((foe) => foe.id === sent.targetId);
    const order = ORDERS.find((entry) => entry.action === sent.action);
    return h('div', { class: 'seat-order is-sent' },
      h('b', { text: fighter.name }),
      h('span', { text: ` \u2014 ${order?.label ?? sent.action}${target ? `: ${target.name}` : ''}.` }),
      h('span', { class: 'cite', text: ' Sent; waiting for the referee to resolve the round.' }));
  }
  const draft = state.drafts.get(fighter.id) ?? { action: 'attack', targetId: foes.find((foe) => !foe.down)?.id ?? null };
  state.drafts.set(fighter.id, draft);
  const order = ORDERS.find((entry) => entry.action === draft.action) ?? ORDERS[0];
  const needs = (targetId) => {
    const card = throws.find((entry) => entry.targetId === targetId);
    if (!card) return '';
    return card.reach === false ? ' (out of reach)' : ` (${card.weaponName}: ${card.needed}+)`;
  };
  const actionSelect = h('select', { class: 'sheet-select', 'aria-label': `${fighter.name}: order`,
    onchange: (event) => { state.drafts.set(fighter.id, { ...draft, action: event.currentTarget.value }); renderScene(); } },
  ORDERS.map((entry) => h('option', { value: entry.action, selected: entry.action === draft.action, text: entry.label })));
  const targetSelect = order.target ? h('select', { class: 'sheet-select', 'aria-label': `${fighter.name}: target`,
    onchange: (event) => { state.drafts.set(fighter.id, { ...draft, targetId: event.currentTarget.value }); renderScene(); } },
  foes.filter((foe) => !foe.down).map((foe) => h('option', { value: foe.id, selected: foe.id === draft.targetId, text: `${foe.name}${draft.action === 'attack' ? needs(foe.id) : ''}` }))) : null;
  const card = draft.action === 'attack' ? throws.find((entry) => entry.targetId === draft.targetId) : null;
  return h('div', { class: 'seat-order' },
    h('b', { text: fighter.name }),
    actionSelect, targetSelect,
    h('button', { type: 'button', class: 'button is-primary', text: 'Send order', disabled: order.target && !draft.targetId, onclick: () => sendOrder(fighter.id) }),
    card ? h('p', { class: 'cite seat-throw', text: `${card.weaponName}: 2D ${card.totalDM >= 0 ? '+' : '\u2212'}${Math.abs(card.totalDM)}, needs ${card.needed}+ at ${String(card.range ?? '').replace('-', ' ')} range${card.rows.length ? ` \u2014 ${card.rows.map((row) => `${row.label} ${row.dm >= 0 ? '+' : '\u2212'}${Math.abs(row.dm)}`).join(', ')}` : ''}${card.defenceDM ? `, their defence ${card.defenceDM >= 0 ? '+' : '\u2212'}${Math.abs(card.defenceDM)}` : ''}.` }) : null);
}

function fightScene() {
  const list = fighters();
  const own = mine();
  const foes = list.filter((entry) => entry.side === 'foe');
  const selected = state.selected ?? list.find((entry) => own.has(entry.id))?.id ?? null;
  const sheetRows = list.filter((entry) => own.has(entry.id)).map((fighter) => {
    const sent = declarationFor(fighter.id);
    const draft = state.drafts.get(fighter.id);
    const targetId = sent?.targetId ?? (ORDERS.find((entry) => entry.action === draft?.action)?.target ? draft?.targetId : null) ?? null;
    return { fighter, targetId, attacks: (sent?.action ?? draft?.action) === 'attack', down: fighter.down };
  });
  const board = bandsScene({ fighters: list, scene: { selected }, bandsShown: state.bandsShown, setupPhase: false, sheetRows }, {
    onSelectMarker: (id) => { state.selected = id; renderScene(); },
    onBandZoom: (next) => { state.bandsShown = next; renderScene(); }
  });
  const narration = [...(state.view.narration ?? [])].sort((a, b) => a.round - b.round).slice(-12);
  const setup = state.view.status === 'setup';
  return h('div', { class: 'fight-column seat-fight' },
    setup
      ? h('div', { class: 'fight-head' },
        h('h2', { text: 'A fight is being set up' }),
        h('span', { class: 'cite', text: 'The referee is placing everyone. Your orders open when the fight begins.' }))
      : h('div', { class: 'fight-head' },
        h('h2', { text: `Fight \u00b7 round ${state.view.declaringRound ?? state.view.round}` }),
        h('span', { class: 'cite', text: `met at ${String(state.view.range ?? '').replace('-', ' ')} range` })),
    h('div', { class: 'fight-board' }, board),
    setup ? null : h('section', { class: 'seat-orders', 'aria-label': 'Your orders' },
      h('h3', { text: `Your orders for round ${state.view.declaringRound ?? state.view.round}` }),
      ...list.filter((entry) => own.has(entry.id)).map((fighter) => orderRow(fighter, foes)),
      own.size ? null : h('p', { class: 'cite', text: 'None of yours are in this fight.' })),
    narration.length ? h('section', { class: 'seat-narration', 'aria-label': 'What happened' },
      h('h3', { text: 'What happened' }),
      ...narration.map((entry) => h('p', {}, h('span', { class: 'cite', text: `Round ${entry.round}. ` }), entry.text))) : null);
}

// Book 1 p.30: when the round pauses on one of this player's characters, the
// wound's groups are theirs to place. Same panel and checks as the old page;
// the referee applies the answer, or places it themselves if handed back.
function renderWoundPrompt() {
  const dialog = $('wound-dialog');
  const pending = state.view?.pendingWound ?? null;
  const prompt = pending && mine().has(pending.defenderId) ? woundPromptFrom(pending) : null;
  if (!prompt || state.answeredWoundKey === prompt.key) {
    if (!prompt) state.woundDraft = null;
    if (dialog.open) dialog.close();
    return;
  }
  if (!state.woundDraft || state.woundDraft.key !== prompt.key) state.woundDraft = initialWoundDraft(prompt);
  $('wound-title').textContent = `${prompt.defenderName} is hit`;
  $('wound-remaining').textContent = prompt.remaining > 1 ? `${prompt.remaining} wounds this round` : '';
  $('wound-hit').textContent = woundHitLine(prompt);
  renderWoundGroups($('wound-groups'), prompt, state.woundDraft, (next) => { state.woundDraft = next; renderWoundPrompt(); });
  const preview = previewWoundDraft(prompt, state.woundDraft);
  $('wound-error').hidden = preview.ok;
  $('wound-error').textContent = preview.ok ? '' : String(preview.error);
  $('wound-apply').disabled = !preview.ok;
  renderWoundPreview($('wound-preview'), prompt, preview);
  if (!dialog.open) dialog.showModal();
}

$('wound-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const pending = state.view?.pendingWound;
  if (!pending || !state.woundDraft) return;
  const prompt = woundPromptFrom(pending);
  try {
    const allocation = createPlayerWoundAllocation({
      uid: currentUserId(), encounterId: state.view.encounterId, actorId: pending.defenderId, key: prompt.key,
      targets: [...state.woundDraft.targets],
      allocation: prompt.modifier ? [...state.woundDraft.shares] : null,
      round: prompt.round ?? state.view.declaringRound ?? 1, sentAt: Date.now()
    });
    await writeWoundAllocation(campaignId, state.view.encounterId, allocation);
    state.answeredWoundKey = prompt.key;
    $('wound-dialog').close();
    setStatus('Wound placed. Waiting for the referee.', 'ok');
  } catch (error) {
    $('wound-error').hidden = false;
    $('wound-error').textContent = error?.message ?? String(error);
  }
});
$('wound-decline').addEventListener('click', () => {
  const pending = state.view?.pendingWound;
  if (pending) state.answeredWoundKey = pending.key;
  $('wound-dialog').close();
});

async function watchFight() {
  const encounterId = state.envelope?.currentEncounterId ?? null;
  if (encounterId === state.viewFor) return;
  while (fightStops.length) fightStops.pop()?.();
  state.viewFor = encounterId;
  state.view = null; state.declarations = []; state.selected = null;
  // A fight arriving shrinks any open sheet to its compact form, so it does
  // not sit over the board.
  if (encounterId && state.sheets) state.sheets = state.sheets.map((entry) => ({ ...entry, compact: true }));
  if (!encounterId) { render(); return; }
  try {
    const db = await ensureFirestore();
    fightStops.push(db.doc(`travellerCampaigns/${campaignId}/encounters/${encounterId}/view/current`).onSnapshot((snapshot) => {
      const round = state.view?.declaringRound;
      state.view = snapshot.exists ? snapshot.data() : null;
      if (state.view?.declaringRound !== round) state.drafts = new Map();
      render();
    }, (error) => console.warn('[traveller-seat] fight:', error)));
    const stop = await watchDeclarations(campaignId, encounterId, (entries) => { state.declarations = entries; renderScene(); });
    if (state.viewFor === encounterId) fightStops.push(stop); else stop();
  } catch (error) {
    console.warn('[traveller-seat] fight:', error);
  }
}

function sheetViews() {
  if (!state.envelope) return [];
  return playerSheetViews(state.envelope, characters(), state.sheets ?? [], { subsector: FAR_MERIDIAN_SUBSECTOR });
}

function renderOverlay() {
  const sheets = sheetViews();
  const layer = $('overlay');
  layer.replaceChildren(...(sheets.length ? [renderSheets(sheets, handlers)] : []));
  layer.hidden = !sheets.length;
}

// The player's chat: the shared chat, with their own published log (what the
// campaign's travel and trade did, and anything addressed to them) woven in.
function chatLines() {
  const said = state.chat.map((entry) => ({
    id: `chat-${entry.id}`,
    kind: entry.kind === 'roll' ? 'roll' : 'message',
    category: entry.kind === 'roll' ? 'ROLL' : 'CHAT',
    who: entry.name || 'Someone',
    speakerId: null,
    text: entry.kind === 'roll' && entry.roll ? formatRoll(entry.roll) : entry.text,
    dateLabel: null,
    at: entry.createdAt ?? 0,
    visibility: 'public',
    detail: null
  }));
  const logged = (state.log?.entries ?? []).map((entry) => ({
    id: `log-${entry.id}`,
    kind: 'notice',
    category: entry.category,
    who: 'Referee',
    speakerId: null,
    text: entry.message,
    dateLabel: entry.dateLabel ?? null,
    at: entry.createdAt ?? 0,
    visibility: 'public',
    detail: null
  }));
  return [...said, ...logged].sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
}

function renderChat() {
  const log = $('talk-log');
  const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
  log.replaceChildren(...renderTalkLog(chatLines(), { showAll: true }));
  if (atBottom) log.scrollTop = log.scrollHeight;
}

function render() {
  renderMast();
  renderNow();
  renderScene();
  renderOverlay();
  renderChat();
  renderWoundPrompt();
}

// ---- sheets ---------------------------------------------------------------

function openSheet(id) {
  const open = state.sheets ?? [];
  const already = open.find((entry) => entry.id === id);
  state.sheets = [...open.filter((entry) => entry !== already), already ?? { kind: 'actor', id, compact: false, tab: null }];
  render();
}

async function say(message) {
  try { await sendChatMessage(campaignId, message); }
  catch (error) { setStatus(error?.code === 'permission-denied' ? 'You are not seated at this campaign.' : (error?.message ?? String(error)), 'error'); }
}

const weaponNames = Object.values(PERSONAL_WEAPONS).map((spec) => spec.name);

const handlers = {
  onCloseSheet: (kind, id) => { state.sheets = (state.sheets ?? []).filter((entry) => entry.id !== id); forgetSheetPosition(kind, id); render(); },
  onCompactSheet: (kind, id, compact) => { state.sheets = (state.sheets ?? []).map((entry) => (entry.id === id ? { ...entry, compact } : entry)); render(); },
  onSheetTab: (kind, id, tab) => { state.sheets = (state.sheets ?? []).map((entry) => (entry.id === id ? { ...entry, tab } : entry)); render(); },
  // A skill card throws 2D plus the skill's DM into the shared chat, as the
  // referee's sheet does; Shift or (i) puts the skill's summary there.
  onSkillRoll: (id, name) => {
    const character = characters().find((entry) => entry.identity.id === id);
    const level = Number(character?.skills?.[name] ?? 0);
    const dm = skillDM(name, level, { weaponNames });
    const roll = rollFormula(`2d6${dm >= 0 ? '+' : ''}${dm}`);
    say(createChatMessage({ uid: currentUserId(), name: character?.identity?.name ?? myName(), kind: 'say', text: `${name}-${level}: 2D [${roll.dice.join(' ')}] ${dm >= 0 ? '+' : '\u2212'} ${Math.abs(dm)} = ${roll.total}` }));
  },
  onSkillInfo: (id, name) => {
    const character = characters().find((entry) => entry.identity.id === id);
    const guide = skillGuide(name, { weaponNames });
    say(createChatMessage({ uid: currentUserId(), name: character?.identity?.name ?? myName(), kind: 'say', text: `${name}-${character?.skills?.[name] ?? 0}: ${guide.tagline}.${guide.page ? ` (Book 1 p.${guide.page})` : ''}` }));
  },
  onSheetRoll: () => setStatus('Attacks are ordered from the fight: choose Attack and a target under Your orders.', 'ok')
};

// ---- chat input -------------------------------------------------------------

$('talk-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $('talk-input');
  const text = input.value.trim();
  if (!text || !campaignId || !currentUserId()) return;
  const formula = /^\/(?:r|roll)\s+(.+)$/i.exec(text)?.[1] ?? text;
  try {
    say(interpretChatInput(formula === text ? text : formula, { uid: currentUserId(), name: myName() }));
    input.value = '';
  } catch (error) {
    setStatus(error?.message ?? String(error), 'error');
  }
});
$('talk-input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); $('talk-form').requestSubmit(); }
});
for (const die of document.querySelectorAll('.die[data-roll]')) {
  die.addEventListener('click', () => {
    if (!campaignId || !currentUserId()) return;
    say(createChatMessage({ uid: currentUserId(), name: myName(), kind: 'roll', roll: rollFormula(die.dataset.roll) }));
  });
}
$('theme').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode */ }
  renderMast();
});

// ---- connecting -------------------------------------------------------------

async function connect() {
  while (stops.length) stops.pop()?.();
  while (fightStops.length) fightStops.pop()?.();
  state.viewFor = null; state.view = null;
  state.envelope = null; state.published = new Map(); state.log = null; state.chat = [];
  const uid = currentUserId();
  if (!uid || !campaignId) { render(); return; }
  try {
    const db = await ensureFirestore();
    stops.push(db.doc(`travellerCampaigns/${campaignId}`).onSnapshot((snapshot) => {
      state.envelope = snapshot.exists ? snapshot.data() : null;
      if (!snapshot.exists) setStatus('No such campaign, or you are not seated at it.', 'error');
      watchFight();
      render();
    }, (error) => setStatus(error?.code === 'permission-denied' ? 'You are not seated at this campaign.' : error.message, 'error')));
    const mine = db.doc(`travellerCampaigns/${campaignId}/players/${uid}`);
    stops.push(mine.collection('characters').onSnapshot((snapshot) => {
      state.published = new Map(snapshot.docs.map((entry) => [entry.id, entry.data()]));
      // The player's own sheet opens the first time it arrives.
      if (state.sheets === null && state.published.size) state.sheets = [{ kind: 'actor', id: [...state.published.keys()][0], compact: false, tab: null }];
      render();
    }, (error) => console.warn('[traveller-seat] characters:', error)));
    stops.push(mine.collection('log').doc('current').onSnapshot((snapshot) => {
      state.log = snapshot.exists ? snapshot.data() : null;
      renderChat();
    }, (error) => console.warn('[traveller-seat] log:', error)));
    const stopChat = await watchChat(campaignId, (messages) => { state.chat = messages; renderChat(); });
    stops.push(stopChat);
  } catch (error) {
    setStatus(error?.message ?? String(error), 'error');
  }
}

async function start() {
  render();
  await initAuth();
  let seen;
  onAuthChange((user) => {
    const uid = user?.uid ?? null;
    if (uid === seen) return;
    seen = uid;
    connect();
  });
  if (seen === undefined) { seen = currentUserId() ?? null; connect(); }
}

start();
