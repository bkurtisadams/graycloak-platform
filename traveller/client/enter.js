// enter.js — the player's front door.
//
// v0.67.0. Sign in; see the characters this account owns; roll another with
// the same Book 1 chargen the referee's client uses; sit one down at a
// referee's table by redeeming an invite code; enter the world it is in. The
// referee's client is never loaded here.
//
// Writes: the account's own travellerCharacters records, and one join request
// per campaign beneath the campaign it applies to. Nothing else.

import { initAuth, onAuthChange, signOutOfTraveller, currentUserId, authStatus } from './auth.js?v=v0.338.0';
import { openSignInDialog, openPasswordDialog } from './signin-ui.js?v=v0.338.0';
// v0.334.0: Traveller's own dialogs in place of the browser's (Kurt).
import { ask, askText, askBeforeDeleting, confirmDeletes, setConfirmDeletes } from './dialogs.js?v=v0.338.0';
import {
  ensureFirestore, saveCharacterRecord, deleteCharacterRecord, watchOwnCharacterRecords,
  readInvite, writeJoinRequest, deleteJoinRequest, listOwnCampaigns, saveCampaignHome,
  renameCampaignHome, deleteCampaignHome, listCampaignInvites, createInvite,
  loadPublishedCharacter, leaveSeat, seatSelf, loadPublishedCampaign
} from './publish.js?v=v0.338.0';
import { campaignHomeSummary, createCampaignHome } from '../src/campaign-home.js?v=v0.338.0';
import { importCampaignBundle } from '../src/campaign-bundle.js?v=v0.338.0';
import { setCampaignOwner, markCampaignPublished } from '../src/campaign-document.js?v=v0.338.0';
import { buildPublishedCampaign } from '../src/published-view.js?v=v0.338.0';
import { renderChargenSheet, renderChargenActions, renderChargenTables } from './chargen-view.js?v=v0.338.0';
import { buildProcedure, formatHistoryEvent } from './ui-model.js?v=v0.338.0';
import { loadTravellerDocument, TRAVELLER_DOCUMENT_KINDS } from './document-loader.js?v=v0.338.0';
import { generateCharacterName } from './generators.js?v=v0.338.0';
import {
  createCharacterRecord, characterRecordStatus, setCharacterRecordPendingJoin, normalizeInviteCode, createJoinRequest, WORLD_KINDS,
  setCharacterRecordWorld, unassignedWorld, createTravellerInvite, generateInviteCode, returnCharacterHome,
  isNpcRecord, setCharacterRecordRole
} from '../src/character-record.js?v=v0.338.0';
import {
  CHARGEN_PHASES, createCharacter, createCharacterDocument, performChargenAction, exportCharacter, importCharacter,
  exportCharacterDocument
} from '../vendor/classic-traveller-rules/index.js?v=r0.82.0';

const el = {
  status: document.querySelector('#enter-status'),
  heading: document.querySelector('#enter-heading'),
  account: document.querySelector('#enter-account'),
  accountButton: document.querySelector('#enter-account-button'),
  signin: document.querySelector('#enter-signin'),
  signinButton: document.querySelector('#enter-signin-button'),
  characters: document.querySelector('#enter-characters'),
  list: document.querySelector('#enter-character-list'),
  selected: document.querySelector('#enter-selected'),
  newCharacter: document.querySelector('#enter-new-character'),
  loadCharacter: document.querySelector('#enter-load-character'),
  characterFile: document.querySelector('#enter-character-file'),
  campaignList: document.querySelector('#enter-campaign-list'),
  joinPanel: document.querySelector('#enter-join-panel'),
  loadCampaign: document.querySelector('#enter-load-campaign'),
  campaignFile: document.querySelector('#enter-campaign-file'),
  chargen: document.querySelector('#enter-chargen'),
  name: document.querySelector('#enter-character-name'),
  randomName: document.querySelector('#enter-random-name'),
  procedure: document.querySelector('#enter-procedure'),
  actions: document.querySelector('#enter-actions'),
  complete: document.querySelector('#enter-complete'),
  save: document.querySelector('#enter-save-character'),
  discard: document.querySelector('#enter-discard-character'),
  keepNpc: document.querySelector('#enter-keep-npc'),
  tables: document.querySelector('#enter-tables'),
  generationLog: document.querySelector('#enter-generation-log'),
  sheet: {
    name: document.querySelector('#enter-sheet-name'),
    date: document.querySelector('#enter-sheet-date'),
    upp: document.querySelector('#enter-sheet-upp'),
    rank: document.querySelector('#enter-sheet-rank'),
    age: document.querySelector('#enter-sheet-age'),
    world: document.querySelector('#enter-sheet-world'),
    healthStatus: document.querySelector('#enter-sheet-health-status'),
    characteristics: document.querySelector('#enter-sheet-characteristics'),
    service: document.querySelector('#enter-sheet-service'),
    weapon: document.querySelector('#enter-sheet-weapon'),
    armor: document.querySelector('#enter-sheet-armor'),
    equipment: document.querySelector('#enter-sheet-equipment'),
    skills: document.querySelector('#enter-sheet-skills'),
    benefits: document.querySelector('#enter-sheet-benefits'),
    historyRecord: document.querySelector('#enter-sheet-history-record'),
    notes: null
  }
};

// A character in progress survives a reload: the Book 1 tables are not a form
// you want to fill in twice.
const DRAFT_STORAGE_PREFIX = 'graycloak.traveller.enter.draft.v1:';

let records = [];
let campaigns = [];
let campaignsLoadedFor = null;
let unsubscribeRecords = null;
let watchedUid = null;
let view = 'characters';
let character = null;

function setStatus(text, kind = '') {
  el.status.textContent = text;
  el.status.className = `player-status${kind ? ` ${kind}` : ''}`;
}

function draftKey() { return `${DRAFT_STORAGE_PREFIX}${currentUserId() ?? 'anonymous'}`; }
function saveDraft() {
  try { if (character) window.localStorage.setItem(draftKey(), exportCharacter(character)); else window.localStorage.removeItem(draftKey()); }
  catch (error) { console.error(error); }
}
function loadDraft() {
  try { const raw = window.localStorage.getItem(draftKey()); return raw ? importCharacter(raw) : null; }
  catch (error) { console.error(error); return null; }
}

// --- Account ---------------------------------------------------------------

// v0.207.3: a [ PASSWORD ] button beside [ SIGN OUT ], made here rather than
// in enter.html so the page markup and its pins are untouched.
function passwordButton() {
  let button = document.querySelector('#account-password');
  if (!button) {
    button = document.createElement('button');
    button.id = 'account-password';
    button.type = 'button';
    button.className = el.accountButton.className;
    button.textContent = '[ PASSWORD ]';
    button.title = 'Set or change the password for email sign-in';
    button.onclick = () => openPasswordDialog();
    el.accountButton.before(button);
  }
  return button;
}

function renderAccount() {
  const { user, status } = authStatus();
  passwordButton().hidden = !user || !user.email;
  if (status === 'unavailable') {
    el.account.textContent = 'OFFLINE';
    el.accountButton.hidden = true;
    return;
  }
  if (user) {
    el.account.textContent = (user.displayName || user.email || user.uid).toUpperCase();
    el.accountButton.hidden = false;
    el.accountButton.textContent = '[ SIGN OUT ]';
    el.accountButton.onclick = () => signOutOfTraveller();
    return;
  }
  el.account.textContent = '';
  el.accountButton.hidden = false;
  el.accountButton.textContent = '[ SIGN IN ]';
  el.accountButton.onclick = () => openSignInDialog();
}

// --- Characters -----------------------------------------------------------

function watchRecords() {
  const uid = currentUserId();
  if (uid === watchedUid) return;
  unsubscribeRecords?.(); unsubscribeRecords = null;
  records = []; watchedUid = uid;
  if (!uid) { render(); return; }
  ensureFirestore()
    .then(() => watchOwnCharacterRecords(uid, (entries) => {
      records = [...entries].sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0));
      welcomeHome();
      render();
    }))
    .then((unsubscribe) => { if (uid === watchedUid) unsubscribeRecords = unsubscribe; else unsubscribe(); })
    .catch((error) => setStatus(error?.message ?? String(error), 'error'));
}

// v0.285.0: a character the referee removed (its world set back to
// unassigned) still carries its note of the campaign; it comes home with
// that campaign's sheet and the stamp, once.
const welcoming = new Set();
async function welcomeHome() {
  for (const record of records) {
    const trip = record.lastCampaign;
    if (!trip?.campaignId || record.world?.kind !== WORLD_KINDS.UNASSIGNED || welcoming.has(record.characterId)) continue;
    welcoming.add(record.characterId);
    try {
      const home = await bringHome(record, trip.campaignId);
      await saveCharacterRecord(home);
      setStatus(`${record.name.toUpperCase()} IS BACK FROM ${String(trip.campaignName ?? 'A CAMPAIGN').toUpperCase()}`, 'ok');
    } catch (error) {
      console.warn('[traveller] coming home:', error);
    }
  }
}

// A character JSON — a finished Character Document from any Graycloak client
// or an older export, or a chargen in progress — becomes one of this
// account's characters, or resumes as the draft.
async function loadCharacterFile(file) {
  try {
    const uid = currentUserId();
    if (!uid) throw new Error('sign in first');
    const loaded = loadTravellerDocument(await file.text());
    if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.CHARACTER) {
      if (records.some((entry) => entry.characterId === loaded.characterDocument.identity.id)) throw new Error(`${loaded.characterDocument.identity.name} is already one of your characters`);
      const record = createCharacterRecord(loaded.characterDocument, { ownerUid: uid });
      await saveCharacterRecord(record);
      setStatus(`${record.name.toUpperCase()} LOADED`, 'ok');
      return;
    }
    if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.CHARGEN) {
      if (character && !(await ask({ title: 'Replace', message: 'Replace the character in generation with this file?', confirm: 'Replace' })).ok) return;
      startChargen(loaded.character);
      setStatus(`${(loaded.character.name || 'UNNAMED').toUpperCase()} RESUMED IN GENERATION`, 'ok');
      return;
    }
    throw new Error('that file is a ship or a campaign, not a character');
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

// --- Campaigns ---------------------------------------------------------------

async function loadCampaigns() {
  const uid = currentUserId();
  if (!uid || uid === campaignsLoadedFor) return;
  campaignsLoadedFor = uid;
  try {
    campaigns = (await listOwnCampaigns(uid)).map(campaignHomeSummary)
      .sort((left, right) => (right.savedAt ?? 0) - (left.savedAt ?? 0));
  } catch (error) {
    console.error(error);
    campaigns = [];
  }
  render();
}

// v0.220.0: after a rename or a delete the list has to be read again, and
// loadCampaigns() will not repeat itself for the same account.
async function refreshCampaigns() {
  campaignsLoadedFor = null;
  await loadCampaigns();
}

// The lobby lists the cloud, but a campaign is also kept in this browser's
// registry, and play.html reads that. Keep the two from disagreeing.
const REGISTRY_KEY = 'graycloak-traveller-document-registry-v1';
const ACTIVE_KEY = 'graycloak-traveller-active-campaign-id-v1';

function withLocalRegistry(change) {
  try {
    const raw = window.localStorage.getItem(REGISTRY_KEY);
    if (!raw) return;
    const store = JSON.parse(raw);
    if (change(store) === false) return;
    window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(store));
  } catch (error) { console.warn('[traveller] local registry:', error); }
}

function renameLocalCampaign(campaignId, name) {
  withLocalRegistry((store) => {
    const campaign = store.documents?.[campaignId];
    if (!campaign?.identity) return false;
    campaign.identity.name = name;
    return true;
  });
}

function forgetLocalCampaign(campaignId) {
  withLocalRegistry((store) => {
    if (!store.documents?.[campaignId]) return false;
    delete store.documents[campaignId];
    return true;
  });
  try {
    if (window.localStorage.getItem(ACTIVE_KEY) === campaignId) window.localStorage.removeItem(ACTIVE_KEY);
  } catch (error) { console.warn('[traveller] active campaign:', error); }
}

// A campaign file loaded here gets its home at once, under this account.
async function loadCampaignFile(file) {
  try {
    const uid = currentUserId();
    if (!uid) throw new Error('sign in first');
    const bundle = importCampaignBundle(await file.text());
    let campaign = setCampaignOwner(bundle.campaign, uid);
    const now = Date.now();
    campaign = markCampaignPublished(campaign, now);
    const home = createCampaignHome({ ...bundle, campaign }, { ownerUid: uid, savedAt: now });
    const envelope = buildPublishedCampaign(campaign, { publishedAt: now });
    await saveCampaignHome(home, envelope, { expectedRevision: null });
    campaignsLoadedFor = null;
    setStatus(`${(campaign.identity.name || 'CAMPAIGN').toUpperCase()} LOADED INTO THE CLOUD`, 'ok');
    await loadCampaigns();
  } catch (error) {
    console.error(error);
    setStatus(error?.name === 'StaleCampaignHomeError' ? 'THAT CAMPAIGN ALREADY HAS A CLOUD COPY / RUN IT INSTEAD' : (error?.message ?? String(error)), 'error');
    campaignsLoadedFor = null;
    await loadCampaigns();
  }
}

function campaignDate(time) {
  return time ? `${String(time.dayOfYear).padStart(3, '0')}-${time.year}` : '--';
}

// v0.289.0: one list of campaigns — the ones you run and the ones you play
// in — each with one button, OPEN, and the rest behind [ ⋯ ] (Kurt, Sep 2026:
// the lobby was clunky; D&D Beyond's My Campaigns is one list with a role on
// each card). NEW CAMPAIGN starts one from a character you choose.
// v0.290.0: which [ ⋯ ] is open survives a re-render (the lobby redraws
// whenever a record or campaign changes), and it opens in place, under its
// button, rather than floating off the edge of its column.
let openMenu = null;
function moreMenu(buttons, key = null, label = 'More') {
  const more = document.createElement('details');
  more.className = 'enter-more';
  if (key && openMenu === key) more.open = true;
  more.addEventListener('toggle', () => {
    if (more.open) openMenu = key;
    else if (openMenu === key) openMenu = null;
  });
  const summary = document.createElement('summary');
  summary.className = 'lobby-more';
  summary.textContent = '[ \u22ef ]';
  summary.title = 'More';
  summary.setAttribute('aria-label', label);
  const list = document.createElement('div');
  list.className = 'enter-more-list lobby-menu';
  list.setAttribute('role', 'menu');
  list.append(...buttons.filter(Boolean));
  more.append(summary, list);
  return more;
}

function textButton(label, onclick, { title = null } = {}) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'text-button action-button';
  button.textContent = label;
  if (title) button.title = title;
  button.addEventListener('click', onclick);
  return button;
}

function linkButton(label, href, { primary = false, title = null } = {}) {
  const link = document.createElement('a');
  link.className = `text-button action-button${primary ? ' campaign-transition-action' : ''}`;
  link.href = href;
  link.textContent = label;
  if (title) link.title = title;
  return link;
}

// v0.337.0 (Kurt's approved mockup): cards in the lobby's own style — a
// strip naming the role, the campaign's name, date and world, who you play
// and the ship, and one main button; the rest behind [ ⋯ ].
function el2(tag, className = '', text = null, props = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = text;
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined) continue;
    if (key === 'onclick') node.addEventListener('click', value);
    else node.setAttribute(key, value);
  }
  return node;
}
// A menu item: plain words, left-aligned; Delete in the danger colour.
function menuItem(label, onclick, { danger = false, title = null } = {}) {
  return el2('button', `lobby-menu-item${danger ? ' is-danger' : ''}`, label, { type: 'button', role: 'menuitem', title, onclick });
}
function menuLink(label, href, { title = null } = {}) {
  return el2('a', 'lobby-menu-item', label, { href, role: 'menuitem', title });
}
function mainButton(label, onclick, { title = null } = {}) {
  return el2('button', 'lobby-main', label, { type: 'button', title, onclick });
}
function mainLink(label, href, { title = null } = {}) {
  return el2('a', 'lobby-main', label, { href, title });
}
function worldLine(summary) {
  const where = summary?.location ?? {};
  const world = where.worldName ?? where.systemName ?? null;
  const system = where.systemName && where.worldName && where.systemName !== where.worldName ? ` (${where.systemName})` : '';
  return [campaignDate(summary?.time), world ? `${world}${system}` : 'UNMAPPED'].join(' \u00b7 ').toUpperCase();
}
function sectorLine(summary) {
  return [summary?.sectorName, summary?.subsectorName].filter(Boolean).join(' \u00b7 ').toUpperCase();
}
function campaignCardFrame({ role, byline, menu, name, left = [], right = [], main }) {
  const card = el2('article', 'lobby-card lobby-campaign');
  const strip = el2('div', 'lobby-campaign-strip');
  strip.append(el2('span', 'lobby-badge', role));
  if (byline) strip.append(el2('span', 'lobby-byline', byline));
  strip.append(el2('span', 'lobby-spacer'));
  if (menu) strip.append(menu);
  const body = el2('div', 'lobby-campaign-body');
  const leftCol = el2('div', 'lobby-col');
  leftCol.append(el2('h3', 'lobby-campaign-name', name), ...left.filter(Boolean));
  const rightCol = el2('div', 'lobby-col');
  rightCol.append(...right.filter(Boolean));
  body.append(leftCol, rightCol);
  const foot = el2('div', 'lobby-card-foot');
  if (main) foot.append(main);
  card.append(strip, body, foot);
  return card;
}
const small = (text) => el2('div', 'lobby-small', text);
const label = (text) => el2('div', 'lobby-label', text);
const strong = (text) => el2('div', 'lobby-strong', text);
function refereeLine(summary) {
  return summary?.refereeMode === 'game' ? 'THE GAME REFEREES' : 'YOU REFEREE';
}
function shipOf(summary) {
  if (!summary?.shipName) return null;
  return `${summary.shipName}${summary.shipTypeCode ? ` \u00b7 Type ${summary.shipTypeCode}` : ''}`;
}

function refereeCard(campaign) {
  const rename = menuItem('Rename', async () => {
      const name = await askText({ title: 'Rename campaign', message: 'Name for this campaign', value: campaign.name && campaign.name !== 'Unnamed Campaign' ? campaign.name : '', confirm: 'Rename' });
      if (name === null) return;
      const wanted = name.trim();
      if (!wanted) { setStatus('A campaign needs a name.', 'error'); return; }
      try {
        setStatus('RENAMING\u2026');
        await renameCampaignHome(campaign.campaignId, wanted);
        renameLocalCampaign(campaign.campaignId, wanted);
        setStatus(`RENAMED TO ${wanted.toUpperCase()}`, 'ok');
        await refreshCampaigns();
      } catch (error) { setStatus(error?.message ?? String(error), 'error'); }
    });

  const remove = menuItem('Delete\u2026', async () => {
      const label = campaign.name || campaign.campaignId;
      // A campaign with history deserves a typed confirmation; an untouched
      // one only needs a yes. Trimmed and case-insensitive — the point is
      // making sure the referee reads and means the name, not a spelling
      // test — and the cancellation message echoes what was typed, so a
      // mismatch is diagnosable instead of just "it didn't work".
      const played = Number(campaign.revision ?? 0) > 2;
      let typed = null;
      // v0.334.0: a campaign is not a rolled character: its guard stays on
      // whatever the characters' "ask before deleting" says.
      let ok;
      if (played) {
        const answer = await askText({ title: 'Delete campaign', message: `Deleting ${label} cannot be undone. Type the campaign name to confirm.`, confirm: 'Delete' });
        if (answer === null) return;
        typed = String(answer).trim();
        ok = typed.toLowerCase() === label.toLowerCase();
      } else {
        ok = (await ask({ title: 'Delete campaign', message: `Delete ${label}? This cannot be undone.`, confirm: 'Delete', danger: true })).ok;
      }
      if (!ok) { if (played) setStatus(`DELETE CANCELLED: typed "${typed}", needed "${label}".`, 'error'); return; }
      try {
        setStatus('DELETING\u2026');
        // v0.273.0: characters in this campaign are sent back to the lobby
        // as part of the delete (publish.js), before the campaign goes.
        const released = await deleteCampaignHome(campaign.campaignId, { seatedCharacterIds: [
          ...(campaign.seatedCharacterIds ?? []),
          ...records.filter((record) => record.world?.campaignId === campaign.campaignId).map((record) => record.characterId)
        ] });
        forgetLocalCampaign(campaign.campaignId);
        setStatus(`${String(label).toUpperCase()} DELETED${released ? `; ${released} CHARACTER${released === 1 ? '' : 'S'} BACK IN THE LOBBY` : ''}`, 'ok');
        await refreshCampaigns();
      } catch (error) {
        console.error(error);
        setStatus(`DELETE FAILED: ${error?.code === 'permission-denied' ? 'THE CLOUD REFUSED IT (ARE YOU SIGNED IN AS ITS REFEREE?)' : String(error?.message ?? error).toUpperCase()}`, 'error');
      }
    }, { danger: true, title: 'Remove this campaign from the cloud and this browser' });

  const link = menuItem('Copy join link', () => copyJoinLink(campaign), { title: 'Copy the link players open to join this campaign' });
  const tools = menuLink('Referee tools (older page)', `index.html?campaign=${encodeURIComponent(campaign.campaignId)}`, { title: 'The older referee page: scenes, the tactical grid, settings, export' });
  const players = (campaign.seatedCharacterIds ?? []).length;
  return campaignCardFrame({
    role: 'REFEREE',
    byline: refereeLine(campaign),
    menu: moreMenu([link, rename, tools, remove], `campaign:${campaign.campaignId}`, `More for ${campaign.name ?? 'this campaign'}`),
    name: campaign.name || campaign.campaignId,
    left: [small(worldLine(campaign)), sectorLine(campaign) ? small(sectorLine(campaign)) : null],
    right: [label('PLAYERS\u2019 CHARACTERS'), strong(String(players)), shipOf(campaign) ? label('TRAVELLING IN') : null, shipOf(campaign) ? strong(shipOf(campaign)) : null],
    main: mainLink('[ OPEN ]', `play.html?campaign=${encodeURIComponent(campaign.campaignId)}`)
  });
}

// A campaign you play in has no [ ⋯ ]: leaving belongs to the character.
function playerCard(record, waiting) {
  const campaignId = waiting ? record.pendingJoin.campaignId : record.world.campaignId;
  const campaignName = waiting ? (record.pendingJoin.campaignName || campaignId) : (record.world.campaignName || campaignId);
  const summary = playedCampaigns.get(campaignId) ?? null;
  if (waiting) {
    return campaignCardFrame({
      role: 'WAITING', byline: 'FOR THE REFEREE TO LET YOU IN', menu: null, name: campaignName,
      left: [small(`${record.name} asked to join.`)],
      right: [label('YOU PLAY'), strong(record.name)],
      main: mainButton('[ WITHDRAW ]', () => withdrawJoin(record))
    });
  }
  return campaignCardFrame({
    role: 'PLAYER',
    byline: [summary?.refereeName ? `REFEREE: ${String(summary.refereeName).toUpperCase()}` : null, summary?.refereeMode === 'game' ? 'THE GAME REFEREES' : null].filter(Boolean).join(' \u00b7 '),
    menu: null,
    name: campaignName,
    left: [summary ? small(worldLine(summary)) : null, sectorLine(summary) ? small(sectorLine(summary)) : null],
    right: [label('YOU PLAY'), strong(record.name), shipOf(summary) ? label('TRAVELLING IN') : null, shipOf(summary) ? strong(shipOf(summary)) : null],
    main: mainLink('[ OPEN ]', `seat.html?campaign=${encodeURIComponent(campaignId)}`)
  });
}

// v0.337.0: + NEW CAMPAIGN opens the choice of a free character inside its
// own card: "Which of your characters starts it?"
let newCampaignOpen = false;
function renderNewCampaign() {
  const box = document.querySelector('#enter-new-campaign-choices');
  const button = document.querySelector('#enter-new-campaign');
  if (!box || !button) return;
  button.textContent = newCampaignOpen ? '[ CANCEL ]' : '[ + NEW CAMPAIGN ]';
  box.hidden = !newCampaignOpen;
  if (!newCampaignOpen) { box.replaceChildren(); return; }
  const free = records.filter((record) => !record.pendingJoin && !isNpcRecord(record) && characterRecordStatus(record).enter === null);
  box.replaceChildren(
    el2('p', 'lobby-add-note', free.length ? 'Which of your characters starts it?' : 'None of your characters is free. Roll one first, or take one out of a campaign.'),
    ...free.map((record) => mainLink(`[ START WITH ${record.name.toUpperCase()} ]`, `index.html?start=${encodeURIComponent(record.characterId)}`)));
}

// Campaigns you play in: their players' copy (name, date, world, ship) is
// read once per visit, as the referee's own come from listOwnCampaigns.
const playedCampaigns = new Map();
const playedLoading = new Set();
async function loadPlayedCampaign(campaignId) {
  if (!campaignId || playedCampaigns.has(campaignId) || playedLoading.has(campaignId)) return;
  playedLoading.add(campaignId);
  try {
    const envelope = await loadPublishedCampaign(campaignId);
    playedCampaigns.set(campaignId, envelope ? campaignHomeSummary(envelope) : null);
  } catch (error) {
    // Asked once a visit: a campaign that cannot be read shows its name only.
    playedCampaigns.set(campaignId, null);
    console.warn('[traveller-lobby] campaign summary:', campaignId, error?.code ?? error);
  } finally {
    playedLoading.delete(campaignId);
  }
  render();
}

function renderCampaigns() {
  if (!el.campaignList) return;
  const playing = records.filter((record) => record.world?.kind === WORLD_KINDS.CAMPAIGN && record.world.campaignId
    && !campaigns.some((campaign) => campaign.campaignId === record.world.campaignId));
  const waiting = records.filter((record) => record.pendingJoin?.campaignId);
  for (const record of playing) loadPlayedCampaign(record.world.campaignId);
  const cards = [...campaigns.map(refereeCard), ...playing.map((record) => playerCard(record, false)), ...waiting.map((record) => playerCard(record, true))];
  const count = document.querySelector('#enter-campaign-count');
  if (count) count.textContent = String(cards.length);
  renderNewCampaign();
  el.campaignList.replaceChildren(...(cards.length ? cards : [el2('p', 'enter-empty', 'NO CAMPAIGNS YET. START ONE, OR OPEN A REFEREE\u2019S JOIN LINK.')]));
}

function recordSummary(record) {
  const character = record.character;
  const career = character.career ?? {};
  return `${character.upp} / ${String(career.service ?? 'no service').toUpperCase()}${career.rankTitle ? ` / ${career.rankTitle.toUpperCase()}` : ''} / AGE ${character.age} / ${Object.keys(character.skills ?? {}).length} SKILLS`;
}

// v0.337.0 (Kurt's approved mockup): a character card — a strip saying
// where the character is, the name (it opens the sheet), UPP, career and
// age, a mustering-out ship, and one main button for what comes next.
const SERVICE_NOUN = Object.freeze({ navy: 'NAVY', marines: 'MARINE', army: 'ARMY', scouts: 'SCOUT', merchants: 'MERCHANT', other: 'OTHER' });
// One age everywhere: the physical age the character document keeps.
function ageOf(c) {
  return Number.isFinite(c?.chronology?.chronologicalAgeMonths) ? Math.floor(c.chronology.chronologicalAgeMonths / 12) : c?.age;
}
function careerLine(c) {
  const career = c?.career ?? {};
  const who = [SERVICE_NOUN[career.service] ?? String(career.service ?? 'NO SERVICE').toUpperCase(), career.rankTitle ? String(career.rankTitle).toUpperCase() : null].filter(Boolean).join(' ');
  const terms = career.terms ? `${career.terms} TERM${career.terms === 1 ? '' : 'S'}` : null;
  return [who, terms, Number.isFinite(ageOf(c)) ? `AGE ${ageOf(c)}` : null].filter(Boolean).join(' \u00b7 ');
}
// A ship the character holds, or one rolled on mustering out and not yet
// brought into play (Book 1 pp.22-23).
function shipLines(c, record = null) {
  const lines = [];
  // v0.338.0: in a campaign, the players' copy knows what became of a
  // mustering-out ship (brought in, named) before this lobby copy does.
  const played = record?.world?.campaignId ? playedCampaigns.get(record.world.campaignId)?.ships ?? null : null;
  if (played) {
    for (const ship of played.held ?? []) {
      if (ship.holderCharacterId !== record.characterId) continue;
      lines.push({ short: `${String(ship.typeName ?? `Type ${ship.typeCode ?? '?'}`).toUpperCase()} \u00b7 ${String(ship.name).toUpperCase()}`, built: true, ref: { shipName: ship.name, shipType: ship.typeCode }, published: ship });
    }
    for (const entry of played.waiting ?? []) {
      if (entry.characterId !== record.characterId) continue;
      lines.push(entry.benefit === 'Free Trader'
        ? { short: 'TYPE A FREE TRADER (BENEFIT)', built: false, name: 'Type A Free Trader', receipts: (c?.benefits?.shipEntitlements ?? []).find((e) => e.name === 'Free Trader')?.rolls ?? 1 }
        : { short: 'TYPE S SCOUT (BENEFIT)', built: false, name: 'Type S Scout/Courier', receipts: 1 });
    }
    return lines;
  }
  for (const ref of c?.shipRefs ?? []) {
    const kind = ref.shipType === 'A' ? 'TYPE A FREE TRADER' : ref.shipType === 'S' ? 'TYPE S SCOUT' : `TYPE ${ref.shipType || '?'}`;
    lines.push({ short: `${kind}${ref.shipName ? ` \u00b7 ${String(ref.shipName).toUpperCase()}` : ''}`, built: true, ref });
  }
  for (const entry of c?.benefits?.shipEntitlements ?? []) {
    const trader = entry.name === 'Free Trader' && entry.disposition === 'unresolved';
    const scout = entry.name === 'Scout Ship' && entry.disposition === 'reserve-assignment-available';
    if (trader) lines.push({ short: 'TYPE A FREE TRADER (BENEFIT)', built: false, name: 'Type A Free Trader', receipts: entry.rolls ?? 1 });
    if (scout) lines.push({ short: 'TYPE S SCOUT (BENEFIT)', built: false, name: 'Type S Scout/Courier', receipts: 1 });
  }
  return lines;
}
function characterState(record) {
  const status = characterRecordStatus(record);
  if (status.enter === 'campaign') return { key: 'campaign', label: `IN ${String(record.world.campaignName ?? 'A CAMPAIGN').toUpperCase()}` };
  if (status.enter === 'solo') return { key: 'solo', label: 'SOLO WORLD (NOT YET OPEN)' };
  if (record.pendingJoin) return { key: 'waiting', label: `WAITING FOR ${String(record.pendingJoin.campaignName ?? 'A CAMPAIGN').toUpperCase()}` };
  if (isNpcRecord(record)) return { key: 'npc', label: 'NPC' };
  return { key: 'free', label: 'FREE' };
}
// The one thing to do next with this character.
function characterMain(record) {
  const state = characterState(record);
  if (state.key === 'campaign') return mainLink(`[ OPEN ${String(record.world.campaignName ?? 'CAMPAIGN').toUpperCase()} ]`, `seat.html?campaign=${encodeURIComponent(record.world.campaignId)}`);
  if (state.key === 'waiting') return mainButton('[ WITHDRAW ]', () => withdrawJoin(record), { title: 'Stop waiting to join' });
  if (state.key === 'npc') return mainButton('[ VIEW SHEET ]', () => openSheet(record));
  if (state.key === 'free') return mainLink('[ START A CAMPAIGN ]', `index.html?start=${encodeURIComponent(record.characterId)}`, { title: 'Referee a new campaign that starts with this character; to join someone else\u2019s, open their join link' });
  return mainButton('[ VIEW SHEET ]', () => openSheet(record));
}
function characterMenu(record) {
  const state = characterState(record);
  const items = [
    menuItem('View sheet', () => openSheet(record)),
    menuItem('Export character file', () => exportRecord(record)),
    state.key === 'campaign' ? menuItem(`Leave ${record.world.campaignName ?? 'the campaign'}`, () => leaveCampaign(record), { title: `${record.name} comes home with everything that happened there` }) : null,
    state.key === 'waiting' ? menuItem('Withdraw', () => withdrawJoin(record)) : null,
    state.key === 'free' ? menuItem('Make NPC', () => changeRole(record, 'npc')) : null,
    state.key === 'npc' ? menuItem('Make playable', () => changeRole(record, 'pc')) : null,
    menuItem('Delete\u2026', () => removeRecord(record), { danger: true })
  ];
  return moreMenu(items.filter(Boolean), `character:${record.characterId}`, `More for ${record.name}`);
}

function renderCharacterRow(record) {
  const c = record.character ?? {};
  const state = characterState(record);
  const card = el2('article', `lobby-card lobby-character is-${state.key}`);
  const strip = el2('div', 'lobby-strip');
  strip.append(el2('span', 'lobby-strip-label', state.label), el2('span', 'lobby-spacer'), characterMenu(record));
  const body = el2('div', 'lobby-character-body');
  body.append(
    el2('button', 'lobby-name', record.name, { type: 'button', title: `Open ${record.name}\u2019s sheet`, onclick: () => openSheet(record) }),
    el2('div', 'lobby-upp', c.upp ?? '------'),
    small(careerLine(c)),
    ...shipLines(c, record).map((line) => small(line.short)));
  const foot = el2('div', 'lobby-card-foot');
  foot.append(characterMain(record));
  card.append(strip, body, foot);
  return card;
}

// v0.69.1: a character in generation is offered on the list, not imposed.
function renderDraftRow() {
  const draft = loadDraft();
  if (!draft) return null;
  const card = el2('article', 'lobby-card lobby-character is-draft');
  const strip = el2('div', 'lobby-strip');
  const discard = menuItem('Discard\u2026', async () => {
    if (!(await askBeforeDeleting({ title: 'Discard', message: 'Discard the character in generation?', confirm: 'Discard' }))) return;
    character = null; saveDraft(); render();
  }, { danger: true });
  strip.append(el2('span', 'lobby-strip-label', 'IN GENERATION'), el2('span', 'lobby-spacer'), moreMenu([discard], 'draft', 'More for the character in generation'));
  const body = el2('div', 'lobby-character-body');
  body.append(
    el2('div', 'lobby-name is-static', draft.name || '(Unnamed)'),
    el2('div', 'lobby-upp', draft.upp ?? '------'),
    small(`${draft.service ? String(draft.service).toUpperCase() : 'NO SERVICE YET'} \u00b7 AGE ${draft.age} \u00b7 TERM ${draft.currentTerm?.number ?? draft.terms}`),
    small('NOT YET SAVED'));
  const foot = el2('div', 'lobby-card-foot');
  foot.append(mainButton('[ RESUME ]', () => startChargen(draft)));
  card.append(strip, body, foot);
  return card;
}

// A character's file, as a download (the same document Load a character
// file reads back).
function exportRecord(record) {
  try {
    const text = exportCharacterDocument(record.character, { space: 2 });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    link.download = `${String(record.name || 'character').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'character'}.character.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

// v0.337.0: the full sheet opens in a panel from the right (TAS Form 2),
// from a card's name or View sheet, instead of always filling the centre.
let selectedCharacterId = null;
let sheetOpen = false;

function selectedRecord() {
  if (!records.length || !selectedCharacterId) return null;
  return records.find((record) => record.characterId === selectedCharacterId) ?? null;
}

function openSheet(record) {
  selectedCharacterId = record?.characterId ?? null;
  sheetOpen = Boolean(record);
  render();
  document.querySelector('#enter-sheet-close')?.focus();
}
function closeSheet() {
  sheetOpen = false;
  render();
}

function renderSelectedCharacter() {
  const panel = document.querySelector('#enter-sheet-panel');
  const record = sheetOpen ? selectedRecord() : null;
  if (panel) panel.hidden = !record;
  if (!el.selected || !record) return;
  const c = record.character ?? {};
  const state = characterState(record);
  const career = c.career ?? {};
  const form = el2('div', 'lobby-form');
  const cell = (labelText, value, extra = '') => {
    const box = el2('div', `lobby-form-cell${extra}`);
    box.append(el2('div', 'lobby-form-label', labelText), el2('div', 'lobby-form-value', value));
    return box;
  };
  const row = (...cells) => { const r = el2('div', 'lobby-form-row'); r.append(...cells); return r; };
  const nameCell = el2('div', 'lobby-form-cell is-wide');
  nameCell.append(el2('div', 'lobby-form-label', 'NAME'), el2('div', 'lobby-form-name', record.name));
  const statusCell = el2('div', 'lobby-form-cell');
  statusCell.append(el2('div', 'lobby-form-label', 'STATUS'), el2('div', 'lobby-form-value is-status', state.label));
  const ageYears = ageOf(c) ?? '--';
  form.append(
    row(nameCell, statusCell),
    row(cell('UPP', c.upp ?? '------', ' is-upp'), cell('SERVICE', `${String(career.service ?? 'none').toUpperCase()}${career.terms ? ` \u00b7 ${career.terms} TERM${career.terms === 1 ? '' : 'S'}` : ''}`), cell('RANK', String(career.rankTitle ?? '--').toUpperCase())),
    row(cell('AGE', String(ageYears)), cell('CASH', `Cr${Number(c.finances?.credits ?? 0).toLocaleString('en-US')}`), cell('RETIREMENT PAY', c.finances?.retirementPayAnnual > 0 ? `Cr${c.finances.retirementPayAnnual.toLocaleString('en-US')} / YEAR` : 'NONE')));
  const block = (title, ...children) => {
    const section = el2('section', 'lobby-form-block');
    section.append(el2('div', 'lobby-form-title', title), ...children);
    return section;
  };
  const skills = el2('div', 'lobby-chips');
  const skillEntries = Object.entries(c.skills ?? {}).filter(([, level]) => level > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!skillEntries.length) skills.append(small('NO SKILLS'));
  for (const [name, level] of skillEntries) skills.append(el2('span', 'lobby-chip', `${name}-${level}`));
  const kit = el2('div', 'lobby-pairs');
  kit.append(el2('span', 'lobby-pair-label', 'READY WEAPON'), el2('span', '', String(c.loadout?.weaponKey ?? 'none').replace(/-/g, ' ').replace(/^./, (x) => x.toUpperCase())),
    el2('span', 'lobby-pair-label', 'WORN ARMOR'), el2('span', '', String(c.loadout?.armor ?? 'none').replace(/^./, (x) => x.toUpperCase())));
  const ships = shipLines(c, record).map((line) => {
    const box = el2('div', 'lobby-ship');
    if (line.built) {
      const m = line.published?.mortgage;
      const owes = m ? ` ${m.paymentsRemaining} payments of Cr${Number(m.monthlyPaymentCr).toLocaleString('en-US')} owed${m.nextDueDate ? `, next due ${m.nextDueDate}` : ''}.` : '';
      const where = line.published ? (line.published.active ? ' The travellers\u2019 ship.' : line.published.berthedAt ? ` Berthed at ${line.published.berthedAt}.` : '') : '';
      box.append(el2('div', 'lobby-strong', line.ref.shipName || line.short), small(`${line.ref.shipType === 'A' ? 'Type A Free Trader, owned' : line.ref.shipType === 'S' ? 'Type S Scout/Courier, on reserve from the Scout Service' : 'Ship'}.${where}${owes}`));
    } else {
      const campaignName = state.key === 'campaign' ? (record.world.campaignName ?? 'the campaign') : null;
      const owed = line.name === 'Type A Free Trader' ? `, with ${Math.max(0, 480 - 120 * (line.receipts - 1))} payments of Cr154,500 owed from that day` : '';
      box.append(el2('div', 'lobby-strong', line.name),
        small(`Mustering-out benefit (Book 1 pp.22\u201323). Not yet in play: ${campaignName ? `the referee of ${campaignName} brings it in from the Travellers tab${owed}.` : `it comes into play with a campaign this character joins or starts${owed}.`}`));
    }
    return box;
  });
  const others = [
    ...(c.benefits?.passages ?? []).map((entry) => `${entry.name}${entry.count > 1 ? ` \u00d7${entry.count}` : ''}`),
    ...(c.benefits?.memberships ?? []).map((entry) => entry.name),
    ...(c.benefits?.equipment ?? []).map((entry) => `${entry.name}${entry.count > 1 ? ` \u00d7${entry.count}` : ''}`)
  ];
  form.append(
    block('SKILLS', skills),
    block('EQUIPMENT', kit),
    block('SHIPS AND BENEFITS', ...(ships.length ? ships : [small('NO SHIP')]), small(others.length ? others.join(' \u00b7 ') : 'NO OTHER BENEFITS')));
  const history = el2('details', 'lobby-history');
  history.append(el2('summary', '', 'SERVICE AND GENERATION HISTORY'),
    el2('pre', 'record', (c.history ?? []).map((event) => { try { return formatHistoryEvent(event); } catch { return ''; } }).filter(Boolean).join('\n') || 'No history recorded.'));
  const actions = el2('div', 'lobby-sheet-actions');
  const main = characterMain(record);
  if (main.textContent !== '[ VIEW SHEET ]') actions.append(main);
  actions.append(el2('button', 'lobby-other', '[ EXPORT ]', { type: 'button', onclick: () => exportRecord(record) }));
  el.selected.replaceChildren(form, history, actions);
}

// v0.284.0: arriving by a campaign's join link, the lobby asks which of
// your free characters joins it — or to roll a new one — as D&D Beyond's
// join page does.
let joinDismissed = false;
let joinInvite = { code: null, invite: null, error: null, loading: false };
async function loadJoinInvite() {
  if (!inviteFromUrl || !currentUserId() || joinInvite.code === inviteFromUrl) return;
  joinInvite = { code: inviteFromUrl, invite: null, error: null, loading: true };
  try {
    const invite = await readInvite(inviteFromUrl);
    joinInvite = invite && invite.game === 'traveller' && invite.campaignId
      ? { code: inviteFromUrl, invite, error: null, loading: false }
      : { code: inviteFromUrl, invite: null, error: 'That link does not open a Traveller campaign any more. Ask your referee for a new one.', loading: false };
  } catch (error) {
    joinInvite = { code: inviteFromUrl, invite: null, error: error?.message ?? String(error), loading: false };
  }
  render();
}

function renderJoinPanel() {
  const panel = el.joinPanel;
  if (!panel) return;
  if (!inviteFromUrl || joinDismissed || !currentUserId()) { panel.hidden = true; return; }
  panel.hidden = false;
  const heading = document.createElement('div');
  heading.className = 'enter-section-heading';
  const name = joinInvite.invite?.campaignName ?? joinInvite.invite?.campaignId ?? null;
  heading.textContent = name ? `JOIN ${String(name).toUpperCase()}` : 'JOIN A CAMPAIGN';
  const referee = joinInvite.invite?.refereeName ? Object.assign(document.createElement('p'), { className: 'enter-toolbar-note', textContent: `Referee ${joinInvite.invite.refereeName}` }) : null;
  const body = [];
  if (joinInvite.loading || joinInvite.code !== inviteFromUrl) body.push(Object.assign(document.createElement('p'), { className: 'enter-empty', textContent: 'READING THE LINK\u2026' }));
  else if (joinInvite.error) body.push(Object.assign(document.createElement('p'), { className: 'enter-empty', textContent: joinInvite.error.toUpperCase() }));
  else {
    const already = records.find((record) => record.world?.campaignId === joinInvite.invite.campaignId || record.pendingJoin?.campaignId === joinInvite.invite.campaignId);
    if (already) {
      body.push(Object.assign(document.createElement('p'), { className: 'enter-empty', textContent: `${already.name.toUpperCase()} IS ${already.pendingJoin ? 'ALREADY WAITING TO JOIN' : 'ALREADY IN THIS CAMPAIGN'}.` }));
    }
    const free = records.filter((record) => !record.pendingJoin && !isNpcRecord(record) && characterRecordStatus(record).enter === null);
    body.push(Object.assign(document.createElement('p'), { className: 'enter-toolbar-note', textContent: free.length ? 'Choose a character to join with, or roll a new one.' : 'None of your characters is free to join. Roll a new one, or leave a campaign first.' }));
    if (joinInvite.invite.approval) body.push(Object.assign(document.createElement('p'), { className: 'enter-toolbar-note', textContent: 'This referee lets each player in themselves; you will wait for them.' }));
    for (const record of free) {
      const pick = document.createElement('button');
      pick.type = 'button'; pick.className = 'text-button action-button campaign-transition-action';
      pick.textContent = `[ JOIN WITH ${record.name.toUpperCase()} ]`;
      pick.title = recordSummary(record);
      pick.addEventListener('click', () => joinWith(record, inviteFromUrl, joinInvite.invite));
      body.push(pick);
    }
  }
  const roll = document.createElement('button');
  roll.type = 'button'; roll.className = 'text-button action-button';
  roll.textContent = '[ ROLL A NEW CHARACTER ]';
  roll.addEventListener('click', () => startChargen());
  const later = document.createElement('button');
  later.type = 'button'; later.className = 'text-button';
  later.textContent = '[ NOT NOW ]';
  later.addEventListener('click', () => { joinDismissed = true; render(); });
  const tools = document.createElement('div'); tools.className = 'enter-character-tools';
  tools.append(roll, later);
  panel.replaceChildren(heading, ...(referee ? [referee] : []), ...body, tools);
}

// v0.284.0: a campaign's join link — its open invite, or a new one — copied
// to the clipboard, and shown in case the browser will not copy.
async function copyJoinLink(campaign) {
  try {
    setStatus('FINDING THE JOIN LINK\u2026');
    const open = await listCampaignInvites(campaign.campaignId);
    let code = open[0]?.code ?? null;
    if (!code) {
      const invite = createTravellerInvite({ code: generateInviteCode(), ownerUid: currentUserId(), campaignId: campaign.campaignId, campaignName: campaign.name ?? null });
      await createInvite(invite);
      code = invite.code;
    }
    const link = joinLinkFor(code);
    let copied = false;
    try { await navigator.clipboard.writeText(link); copied = true; } catch { copied = false; }
    setStatus(copied ? 'JOIN LINK COPIED. SEND IT TO YOUR PLAYERS.' : 'COPY THE JOIN LINK BELOW AND SEND IT TO YOUR PLAYERS.', 'ok');
    if (!copied) await askText({ title: 'Join link', message: 'The join link for your players (select it and copy):', value: link, confirm: 'Done' });
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function renderCharacters() {
  renderJoinPanel();
  const draftRow = renderDraftRow();
  const count = document.querySelector('#enter-character-count');
  if (count) count.textContent = String(records.length);
  if (!records.length && !draftRow) {
    el.list.replaceChildren(el2('p', 'enter-empty', 'YOU HAVE NO CHARACTERS YET. ROLL ONE TO BEGIN.'));
    renderSelectedCharacter();
    return;
  }
  el.list.replaceChildren(...[draftRow, ...records.map(renderCharacterRow)].filter(Boolean));
  renderSelectedCharacter();
}

async function changeRole(record, role) {
  try {
    await saveCharacterRecord(setCharacterRecordRole(record, role));
    setStatus(`${record.name.toUpperCase()} ${role === 'npc' ? 'IS NOW AN NPC' : 'IS NOW PLAYABLE'}`, 'ok');
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

async function removeRecord(record) {
  const seatedAt = record.world?.kind === WORLD_KINDS.CAMPAIGN ? (record.world.campaignName || 'a campaign') : null;
  const warning = seatedAt ? `\n\n${record.name} is in ${seatedAt}. The referee keeps the campaign's copy; this deletes yours.` : '';
  if (!(await askBeforeDeleting({ title: 'Delete character', message: `Delete ${record.name}? This cannot be undone.${warning}` }))) return;
  try {
    await deleteCharacterRecord(record.characterId);
    setStatus(`${record.name.toUpperCase()} DELETED`, 'ok');
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

// v0.273.0: a character stands up from its campaign and comes back to the
// lobby. The referee keeps the campaign's copy and the seat until they take
// it back; this only frees the character to join somewhere else.
// v0.285.0: Leave that really leaves. The character comes home with its
// campaign sheet and a stamp on its history (Kurt's ruling), then stands up,
// and the seat goes (rules v19), so the referee's Players tab sees them gone.
function tripFor(record, to = null) {
  const campaignId = record.world?.campaignId ?? record.lastCampaign?.campaignId ?? null;
  const noted = record.lastCampaign?.campaignId === campaignId ? record.lastCampaign : {};
  return { campaignId, campaignName: noted.campaignName ?? record.world?.campaignName ?? null, refereeName: noted.refereeName ?? null, from: noted.from ?? null, to: to ?? noted.to ?? null };
}

async function bringHome(record, campaignId) {
  let published = null;
  try { published = await loadPublishedCharacter(campaignId, currentUserId(), record.characterId); }
  catch (error) { console.warn('[traveller] campaign sheet:', error?.code ?? error); }
  return returnCharacterHome(record, published, tripFor(record));
}

async function leaveCampaign(record) {
  const where = record.world?.campaignName || 'this campaign';
  if (!(await ask({ title: 'Leave campaign', message: `Take ${record.name} out of ${where}?\n\n${record.name} comes home with everything that happened there, free to join another campaign.`, confirm: 'Take them out' })).ok) return;
  try {
    const campaignId = record.world.campaignId;
    // Home first, while still seated (the world unchanged), then out.
    const home = await bringHome(record, campaignId);
    await saveCharacterRecord(home);
    await saveCharacterRecord(setCharacterRecordWorld(home, unassignedWorld()));
    await leaveSeat(campaignId, currentUserId()).catch((error) => console.warn('[traveller] seat:', error?.code ?? error));
    setStatus(`${record.name.toUpperCase()} HAS LEFT ${String(where).toUpperCase()}`, 'ok');
  } catch (error) {
    console.error(error);
    setStatus(error?.code === 'permission-denied'
      ? 'THE CLOUD REFUSED IT: LEAVING NEEDS THE v18 FIRESTORE RULES DEPLOYED'
      : (error?.message ?? String(error)), 'error');
  }
}

// --- Invites ---------------------------------------------------------------

// v0.284.0: a join link or a bare code, whichever the referee sent.
function inviteCodeFrom(text) {
  const raw = String(text ?? '').trim();
  try {
    const url = new URL(raw);
    return normalizeInviteCode(url.searchParams.get('join') ?? url.searchParams.get('invite') ?? '');
  } catch { return normalizeInviteCode(raw); }
}

function joinLinkFor(code) {
  const url = new URL('enter.html', window.location.href);
  url.search = `?join=${encodeURIComponent(code)}`;
  return url.toString();
}

// v0.289.0: Join in one step (rules v20). The character goes with a join
// note the referee's page reads to bring it into the campaign; the player
// seats themselves on the strength of the link and goes straight to the
// campaign. A link that asks for approval keeps the old wait.
async function joinWith(record, rawCode, knownInvite = null) {
  const code = inviteCodeFrom(rawCode);
  try {
    if (!code) throw new Error('that link has no code in it');
    const invite = knownInvite?.code === code ? knownInvite : await readInvite(code);
    if (!invite || invite.game !== 'traveller' || !invite.campaignId) throw new Error('that link does not open a Traveller campaign');
    const uid = currentUserId();
    const { user } = authStatus();
    const playerName = user?.displayName ?? user?.email ?? null;
    const join = createJoinRequest({ uid, name: playerName, code, campaignId: invite.campaignId, record });
    await writeJoinRequest(join);
    const campaignName = invite.campaignName ?? invite.campaignId;
    if (invite.approval) {
      await saveCharacterRecord(setCharacterRecordPendingJoin(record, { campaignId: invite.campaignId, campaignName: invite.campaignName ?? null, code }));
      joinDismissed = true;
      setStatus(`${record.name.toUpperCase()} IS WAITING FOR THE REFEREE OF ${String(campaignName).toUpperCase()}`, 'ok');
      return;
    }
    setStatus(`JOINING ${String(campaignName).toUpperCase()}\u2026`);
    await seatSelf(invite.campaignId, uid, { name: playerName, code });
    await saveCharacterRecord(setCharacterRecordWorld({ ...record, pendingJoin: null }, {
      kind: WORLD_KINDS.CAMPAIGN, campaignId: invite.campaignId, campaignName: invite.campaignName ?? null, since: Date.now()
    }));
    window.location.href = `seat.html?campaign=${encodeURIComponent(invite.campaignId)}`;
  } catch (error) {
    console.error(error);
    setStatus(error?.code === 'permission-denied' ? 'THAT LINK WAS NOT ACCEPTED. ASK YOUR REFEREE FOR A NEW ONE.' : (error?.message ?? String(error)), 'error');
  }
}

async function withdrawJoin(record) {
  try {
    await deleteJoinRequest(record.pendingJoin.campaignId, currentUserId());
    await saveCharacterRecord(setCharacterRecordPendingJoin(record, null));
    setStatus('REQUEST WITHDRAWN', 'ok');
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

// --- Chargen ---------------------------------------------------------------

function startChargen(existing = null) {
  character = existing ?? createCharacter();
  view = 'chargen';
  saveDraft();
  render();
}

function execute(action, payload = {}) {
  try {
    const result = performChargenAction(character, action, payload);
    character = result.character;
    saveDraft();
    setStatus('');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function renderProcedure(procedure) {
  el.procedure.replaceChildren();
  el.procedure.className = `procedure${procedure.attention ? ' attention' : ''}`;
  const whatNow = document.createElement('div'); whatNow.className = 'what-now'; whatNow.textContent = 'WHAT NOW?';
  const phase = document.createElement('div'); phase.className = 'phase'; phase.textContent = procedure.title;
  const text = document.createElement('div'); text.textContent = procedure.text;
  el.procedure.append(whatNow, phase, text);
  if (procedure.detail) { const detail = document.createElement('div'); detail.className = 'phase-detail'; detail.textContent = procedure.detail; el.procedure.append(detail); }
}

function renderChargen() {
  if (!character) return;
  if (el.name.value !== (character.name ?? '')) el.name.value = character.name ?? '';
  const procedure = buildProcedure(character);
  renderProcedure(procedure);
  const done = character.phase === CHARGEN_PHASES.COMPLETE;
  const dead = character.phase === CHARGEN_PHASES.DEAD;
  el.actions.replaceChildren();
  el.complete.hidden = !(done || dead);
  // v0.335.0: only a finished character can be kept as an NPC (or saved).
  if (el.keepNpc) el.keepNpc.hidden = !done;
  el.save.hidden = !done;
  if (!done && !dead) renderChargenActions(el.actions, character, procedure.available, execute);
  renderChargenSheet(character, el.sheet);
  renderChargenTables(el.tables, character, execute);
  renderGenerationLog();
}

// The referee's client logs every chargen event to its Activity Log; the lobby
// had nothing, so a mustering-out roll landed on the sheet without a word.
function renderGenerationLog() {
  if (!el.generationLog) return;
  const events = character?.history ?? [];
  if (!events.length) { el.generationLog.replaceChildren(); return; }
  el.generationLog.replaceChildren(...[...events].reverse().slice(0, 40).map((event, index) => {
    const row = document.createElement('div');
    row.className = `enter-generation-line${index === 0 ? ' latest' : ''}`;
    row.textContent = formatHistoryEvent(event);
    return row;
  }));
}

async function saveCharacter({ role = 'pc' } = {}) {
  try {
    if (!character || character.phase !== CHARGEN_PHASES.COMPLETE) throw new Error('finish mustering out first');
    const uid = currentUserId();
    if (!uid) throw new Error('sign in before saving');
    // v0.335.0: an NPC may go unnamed; it gets a random name.
    const name = el.name.value.trim() || (role === 'npc' ? generateCharacterName() : '');
    if (!name) throw new Error('give the character a name');
    const named = { ...character, name };
    const record = createCharacterRecord(createCharacterDocument(named), { ownerUid: uid, role });
    await saveCharacterRecord(record);
    character = null;
    saveDraft();
    view = 'characters';
    setStatus(`${name.toUpperCase()} ${role === 'npc' ? 'KEPT AS AN NPC' : 'SAVED'}`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

async function discardCharacter() {
  if (character && character.phase !== CHARGEN_PHASES.DEAD && !(await askBeforeDeleting({ title: 'Discard', message: 'Discard this character?', confirm: 'Discard' }))) return;
  character = null;
  saveDraft();
  view = 'characters';
  render();
}

// --- Render ----------------------------------------------------------------

function render() {
  renderAccount();
  const signedIn = Boolean(currentUserId());
  el.signin.hidden = signedIn;
  el.characters.hidden = !signedIn || view !== 'characters';
  el.chargen.hidden = !signedIn || view !== 'chargen';
  el.heading.textContent = !signedIn ? 'GRAYCLOAK TRAVELLER' : view === 'chargen' ? 'CHARACTER GENERATION' : '';
  if (!signedIn) return;
  if (view === 'characters') { renderCharacters(); renderCampaigns(); }
  else renderChargen();
}

el.signinButton.addEventListener('click', () => openSignInDialog());
// v0.337.0: the new-campaign choice, and the sheet panel's close.
document.querySelector('#enter-new-campaign')?.addEventListener('click', () => { newCampaignOpen = !newCampaignOpen; render(); });
document.querySelector('#enter-sheet-close')?.addEventListener('click', () => closeSheet());
document.querySelector('#enter-sheet-panel')?.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSheet(); });
el.newCharacter.addEventListener('click', () => startChargen());
el.loadCharacter.addEventListener('click', () => el.characterFile.click());
el.characterFile.addEventListener('change', () => {
  const file = el.characterFile.files?.[0];
  el.characterFile.value = '';
  if (file) loadCharacterFile(file);
});
el.loadCampaign.addEventListener('click', () => el.campaignFile.click());
el.campaignFile.addEventListener('change', () => {
  const file = el.campaignFile.files?.[0];
  el.campaignFile.value = '';
  if (file) loadCampaignFile(file);
});
el.randomName.addEventListener('click', () => { el.name.value = generateCharacterName(); el.name.dispatchEvent(new Event('input')); });
el.name.addEventListener('input', () => { if (character) { character = { ...character, name: el.name.value }; saveDraft(); el.sheet.name.textContent = el.name.value || '(UNNAMED)'; } });
el.save.addEventListener('click', () => saveCharacter());
el.keepNpc?.addEventListener('click', () => saveCharacter({ role: 'npc' }));
el.discard.addEventListener('click', discardCharacter);
// v0.334.0: the "ask before deleting" setting, under the character list.
{
  const box = document.querySelector('#enter-confirm-deletes');
  if (box) {
    box.checked = confirmDeletes();
    box.addEventListener('change', () => setConfirmDeletes(box.checked));
    window.addEventListener('traveller:confirm-deletes', () => { box.checked = confirmDeletes(); });
  }
}

// An invite in the link pre-fills the code once a character is chosen.
// v0.284.0: ?join= is the join link; ?invite= still works.
const inviteFromUrl = normalizeInviteCode(new URLSearchParams(window.location.search).get('join') ?? new URLSearchParams(window.location.search).get('invite')) || null;

onAuthChange(() => {
  watchRecords();
  if (currentUserId()) loadCampaigns().catch((error) => console.error(error));
  else { campaigns = []; campaignsLoadedFor = null; }
  // Sign-in lands on the list; a draft from before a reload is offered there.
  if (!currentUserId()) { character = null; view = 'characters'; }
  if (inviteFromUrl && currentUserId()) loadJoinInvite();
  render();
});
initAuth().then(render);
