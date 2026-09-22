// seat.js — v0.277.0: the player's seat on the new play page.
//
// Kurt's screenshot (Sep 2026): players entering a campaign still got the old
// player page. This is the new one, in two parts. This first part is the
// frame: the masthead, the player's own sheets (the referee page's tabbed
// sheet, read-only), where the party is, and the shared chat. The fight, with
// orders and wound placement, is the second part; until it lands a fight
// links to the old page, which still handles it.
//
// A player cannot read the campaign itself, only what the referee publishes
// for them (Firestore rules): the campaign summary, their own characters,
// their filtered log, and the chat. Everything here is built from those.

import { h, renderTalkLog } from './play-views.js?v=v0.277.0';
import { renderSheets, forgetSheetPosition } from './sheets.js?v=v0.277.0';
import { initAuth, currentUserId, onAuthChange, authStatus } from './auth.js?v=v0.277.0';
import { ensureFirestore, watchChat, sendChatMessage } from './publish.js?v=v0.277.0';
import { interpretChatInput, createChatMessage, rollFormula, formatRoll } from '../src/dice-tray.js?v=v0.277.0';
import { playerSheetViews, formatCampaignDate } from '../src/play-session.js?v=v0.277.0';
import { importCharacterDocument, skillGuide, skillDM, PERSONAL_WEAPONS } from '../vendor/classic-traveller-rules/index.js?v=v0.277.0';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js?v=v0.277.0';

const THEME_KEY = 'graycloak-traveller-theme';
const $ = (id) => document.getElementById(id);
const campaignId = new URLSearchParams(window.location.search).get('campaign');

const state = {
  envelope: null,
  published: new Map(), // characterId -> published character document
  log: null,
  chat: [],
  status: null,
  sheets: null // [{ kind, id, tab, compact }] — null until the first characters arrive
};
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
    if (envelope.currentEncounterId) {
      body.push(h('section', { class: 'seat-card is-fight' },
        h('h2', { text: 'A fight is under way' }),
        h('p', { text: 'Fighting from this page arrives in the next update. Until then, give your orders on the older player page.' }),
        h('a', { class: 'button is-primary', href: `player.html?campaign=${encodeURIComponent(campaignId)}`, text: 'Open the fight' })));
    }
  }
  $('scene').replaceChildren(h('div', { class: 'seat-scene' }, ...body));
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
  onSheetRoll: () => setStatus('Attacks are made from the fight, which arrives on this page in the next update.', 'ok')
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
  state.envelope = null; state.published = new Map(); state.log = null; state.chat = [];
  const uid = currentUserId();
  if (!uid || !campaignId) { render(); return; }
  try {
    const db = await ensureFirestore();
    stops.push(db.doc(`travellerCampaigns/${campaignId}`).onSnapshot((snapshot) => {
      state.envelope = snapshot.exists ? snapshot.data() : null;
      if (!snapshot.exists) setStatus('No such campaign, or you are not seated at it.', 'error');
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
