// enter.js — the player's front door.
//
// v0.67.0. Sign in; see the characters this account owns; roll another with
// the same Book 1 chargen the referee's client uses; sit one down at a
// referee's table by redeeming an invite code; enter the world it is in. The
// referee's client is never loaded here.
//
// Writes: the account's own travellerCharacters records, and one join request
// per campaign beneath the campaign it applies to. Nothing else.

import { initAuth, onAuthChange, signOutOfTraveller, currentUserId, authStatus } from './auth.js?v=v0.325.1';
import { openSignInDialog, openPasswordDialog } from './signin-ui.js?v=v0.325.1';
import {
  ensureFirestore, saveCharacterRecord, deleteCharacterRecord, watchOwnCharacterRecords,
  readInvite, writeJoinRequest, deleteJoinRequest, listOwnCampaigns, saveCampaignHome,
  renameCampaignHome, deleteCampaignHome, listCampaignInvites, createInvite,
  loadPublishedCharacter, leaveSeat, seatSelf
} from './publish.js?v=v0.325.1';
import { campaignHomeSummary, createCampaignHome } from '../src/campaign-home.js?v=v0.325.1';
import { importCampaignBundle } from '../src/campaign-bundle.js?v=v0.325.1';
import { setCampaignOwner, markCampaignPublished } from '../src/campaign-document.js?v=v0.325.1';
import { buildPublishedCampaign } from '../src/published-view.js?v=v0.325.1';
import { renderChargenSheet, renderChargenActions, renderChargenTables } from './chargen-view.js?v=v0.325.1';
import { buildProcedure, formatHistoryEvent } from './ui-model.js?v=v0.325.1';
import { loadTravellerDocument, TRAVELLER_DOCUMENT_KINDS } from './document-loader.js?v=v0.325.1';
import { generateCharacterName } from './generators.js?v=v0.325.1';
import {
  createCharacterRecord, characterRecordStatus, setCharacterRecordPendingJoin, normalizeInviteCode, createJoinRequest, WORLD_KINDS,
  setCharacterRecordWorld, unassignedWorld, createTravellerInvite, generateInviteCode, returnCharacterHome
} from '../src/character-record.js?v=v0.325.1';
import {
  CHARGEN_PHASES, createCharacter, createCharacterDocument, performChargenAction, exportCharacter, importCharacter
} from '../vendor/classic-traveller-rules/index.js?v=v0.325.1';

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
      if (character && !window.confirm('Replace the character in generation with this file?')) return;
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
function moreMenu(buttons, key = null) {
  const more = document.createElement('details');
  more.className = 'enter-more';
  if (key && openMenu === key) more.open = true;
  more.addEventListener('toggle', () => {
    if (more.open) openMenu = key;
    else if (openMenu === key) openMenu = null;
  });
  const summary = document.createElement('summary');
  summary.className = 'text-button action-button';
  summary.textContent = '[ \u22ef ]';
  summary.title = 'More';
  const list = document.createElement('div');
  list.className = 'enter-more-list';
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

function refereeCard(campaign) {
  const row = document.createElement('div');
  row.className = 'enter-character enterable';
  const name = document.createElement('strong'); name.className = 'enter-character-name'; name.textContent = (campaign.name || campaign.campaignId).toUpperCase();
  const role = document.createElement('span'); role.className = 'enter-character-summary'; role.textContent = 'REFEREE';
  const state = document.createElement('span'); state.className = 'enter-character-state';
  state.textContent = `${campaignDate(campaign.time)} / ${String(campaign.location?.worldName ?? campaign.location?.systemName ?? 'UNMAPPED').toUpperCase()}`;
  const tools = document.createElement('div'); tools.className = 'enter-character-tools';
    const rename = document.createElement('button');
    rename.type = 'button'; rename.className = 'text-button action-button';
    rename.textContent = '[ RENAME ]';
    rename.addEventListener('click', async () => {
      const name = window.prompt('Name for this campaign', campaign.name && campaign.name !== 'Unnamed Campaign' ? campaign.name : '');
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

    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'text-button action-button';
    remove.textContent = '[ DELETE ]';
    remove.title = 'Remove this campaign from the cloud and this browser';
    remove.addEventListener('click', async () => {
      const label = campaign.name || campaign.campaignId;
      // A campaign with history deserves a typed confirmation; an untouched
      // one only needs a yes. Trimmed and case-insensitive — the point is
      // making sure the referee reads and means the name, not a spelling
      // test — and the cancellation message echoes what was typed, so a
      // mismatch is diagnosable instead of just "it didn't work".
      const played = Number(campaign.revision ?? 0) > 2;
      let typed = null;
      const ok = played
        ? (() => {
          typed = String(window.prompt(`Deleting ${label} cannot be undone. Type the campaign name to confirm.`) ?? '').trim();
          return typed.toLowerCase() === label.toLowerCase();
        })()
        : window.confirm(`Delete ${label}? This cannot be undone.`);
      if (!ok) { if (played) setStatus(`DELETE CANCELLED: typed "${typed}", needed "${label}".`, 'error'); return; }
      try {
        setStatus('DELETING\u2026');
        // v0.273.0: characters seated here are sent back to the lobby as
        // part of the delete (publish.js), before the campaign goes.
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
    });

  const link = textButton('[ COPY JOIN LINK ]', () => copyJoinLink(campaign), { title: 'Copy the link players open to join this campaign' });
  rename.textContent = '[ RENAME ]';
  tools.append(
    linkButton('[ OPEN ]', `play.html?campaign=${encodeURIComponent(campaign.campaignId)}`, { primary: true }),
    moreMenu([link, rename, linkButton('[ REFEREE TOOLS ]', `index.html?campaign=${encodeURIComponent(campaign.campaignId)}`, { title: 'The older referee page: scenes, the tactical grid, settings, export' }), remove], `campaign:${campaign.campaignId}`));
  row.append(name, role, state, tools);
  return row;
}

function playerCard(record, waiting) {
  const campaignName = waiting ? (record.pendingJoin.campaignName || record.pendingJoin.campaignId) : (record.world.campaignName || record.world.campaignId);
  const row = document.createElement('div');
  row.className = `enter-character${waiting ? '' : ' enterable'}`;
  const name = document.createElement('strong'); name.className = 'enter-character-name'; name.textContent = String(campaignName).toUpperCase();
  const role = document.createElement('span'); role.className = 'enter-character-summary'; role.textContent = `PLAYING ${record.name.toUpperCase()}`;
  const state = document.createElement('span'); state.className = 'enter-character-state'; state.textContent = waiting ? 'WAITING FOR THE REFEREE TO LET YOU IN' : '';
  const tools = document.createElement('div'); tools.className = 'enter-character-tools';
  if (waiting) tools.append(moreMenu([textButton('[ WITHDRAW ]', () => withdrawJoin(record))], `waiting:${record.characterId}`));
  else {
    tools.append(
      linkButton('[ OPEN ]', `seat.html?campaign=${encodeURIComponent(record.world.campaignId)}`, { primary: true }),
      moreMenu([textButton('[ LEAVE ]', () => leaveCampaign(record), { title: `${record.name} comes home with everything that happened there` })], `playing:${record.characterId}`));
  }
  row.append(name, role, state, tools);
  return row;
}

let newCampaignOpen = false;
function newCampaignRow() {
  const wrap = document.createElement('div');
  wrap.className = 'enter-new-campaign';
  const toggle = textButton(newCampaignOpen ? '[ CANCEL ]' : '[ NEW CAMPAIGN ]', () => { newCampaignOpen = !newCampaignOpen; render(); });
  wrap.append(toggle);
  if (newCampaignOpen) {
    const free = records.filter((record) => !record.pendingJoin && characterRecordStatus(record).enter === null);
    const note = document.createElement('p'); note.className = 'enter-toolbar-note';
    note.textContent = free.length ? 'Which of your characters starts it?' : 'None of your characters is free. Roll one first, or leave a campaign.';
    wrap.append(note, ...free.map((record) => linkButton(`[ START WITH ${record.name.toUpperCase()} ]`, `index.html?start=${encodeURIComponent(record.characterId)}`, { primary: true })));
  }
  return wrap;
}

function renderCampaigns() {
  if (!el.campaignList) return;
  const playing = records.filter((record) => record.world?.kind === WORLD_KINDS.CAMPAIGN && record.world.campaignId
    && !campaigns.some((campaign) => campaign.campaignId === record.world.campaignId));
  const waiting = records.filter((record) => record.pendingJoin?.campaignId);
  const cards = [...campaigns.map(refereeCard), ...playing.map((record) => playerCard(record, false)), ...waiting.map((record) => playerCard(record, true))];
  el.campaignList.replaceChildren(newCampaignRow(), ...(cards.length ? cards : [Object.assign(document.createElement('div'), {
    className: 'enter-empty', textContent: 'NO CAMPAIGNS YET. START ONE, OR OPEN A REFEREE\u2019S JOIN LINK.'
  })]));
}

function recordSummary(record) {
  const character = record.character;
  const career = character.career ?? {};
  return `${character.upp} / ${String(career.service ?? 'no service').toUpperCase()}${career.rankTitle ? ` / ${career.rankTitle.toUpperCase()}` : ''} / AGE ${character.age} / ${Object.keys(character.skills ?? {}).length} SKILLS`;
}

function renderCharacterRow(record) {
  const status = characterRecordStatus(record);
  const row = document.createElement('div');
  row.className = `enter-character${status.enter ? ' enterable' : ''}${selectedRecord()?.characterId === record.characterId ? ' is-selected' : ''}`;
  row.tabIndex = 0;
  // v0.290.0: nor the [ ⋯ ] menu, whose click re-rendered the list and shut it.
  row.addEventListener('click', (event) => { if (event.target.closest('button, a, input, summary, details')) return; selectCharacter(record); });
  row.addEventListener('keydown', (event) => { if (event.key === 'Enter' && event.target === row) selectCharacter(record); });
  const name = document.createElement('strong'); name.className = 'enter-character-name'; name.textContent = record.name.toUpperCase();
  const summary = document.createElement('span'); summary.className = 'enter-character-summary'; summary.textContent = recordSummary(record);
  const state = document.createElement('span'); state.className = 'enter-character-state'; state.textContent = status.label;
  const tools = document.createElement('div'); tools.className = 'enter-character-tools';

  // v0.289.0: a character row says where it is and offers only Delete;
  // playing, leaving and joining happen from the campaign cards and a
  // referee's join link.
  if (status.enter === 'solo') state.textContent = 'SOLO WORLD (NOT YET OPEN)';
  else if (status.enter === 'campaign') state.textContent = `IN ${String(record.world.campaignName ?? 'A CAMPAIGN').toUpperCase()}`;
  else if (record.pendingJoin) state.textContent = `WAITING FOR ${String(record.pendingJoin.campaignName ?? 'A CAMPAIGN').toUpperCase()}`;
  else state.textContent = 'FREE';
  tools.append(moreMenu([textButton('[ DELETE ]', () => removeRecord(record))], `character:${record.characterId}`));
  row.append(name, summary, state, tools);

  return row;
}

// v0.69.1: a character in generation is offered on the list, not imposed.
function renderDraftRow() {
  const draft = loadDraft();
  if (!draft) return null;
  const row = document.createElement('div');
  row.className = 'enter-character enter-draft';
  const name = document.createElement('strong'); name.className = 'enter-character-name'; name.textContent = (draft.name || 'UNNAMED').toUpperCase();
  const summary = document.createElement('span'); summary.className = 'enter-character-summary';
  summary.textContent = `IN GENERATION / ${draft.service ? String(draft.service).toUpperCase() : 'NO SERVICE YET'} / AGE ${draft.age} / TERM ${draft.currentTerm?.number ?? draft.terms}`;
  const state = document.createElement('span'); state.className = 'enter-character-state'; state.textContent = 'NOT YET SAVED';
  const tools = document.createElement('div'); tools.className = 'enter-character-tools';
  const resume = document.createElement('button');
  resume.type = 'button'; resume.className = 'text-button action-button campaign-transition-action'; resume.textContent = '[ RESUME ]';
  resume.addEventListener('click', () => startChargen(draft));
  const discard = document.createElement('button');
  discard.type = 'button'; discard.className = 'text-button action-button'; discard.textContent = '[ DISCARD ]';
  discard.addEventListener('click', () => { if (window.confirm('Discard the character in generation?')) { character = null; saveDraft(); render(); } });
  tools.append(resume, discard);
  row.append(name, summary, state, tools);
  return row;
}

// v0.199.0: the character you pick reads in full in the centre column.
let selectedCharacterId = null;

function selectedRecord() {
  if (!records.length) return null;
  return records.find((record) => record.characterId === selectedCharacterId) ?? records[0];
}

function selectCharacter(record) {
  selectedCharacterId = record?.characterId ?? null;
  render();
}

function renderSelectedCharacter() {
  if (!el.selected) return;
  const record = selectedRecord();
  if (!record) {
    el.selected.replaceChildren(Object.assign(document.createElement('div'), { className: 'enter-empty', textContent: 'PICK A CHARACTER, OR ROLL ONE.' }));
    return;
  }
  const c = record.character ?? {};
  const status = characterRecordStatus(record);
  const sheet = document.createElement('article');
  sheet.className = 'traveller-character-sheet enter-record';
  const banner = document.createElement('header');
  banner.className = 'sheet-banner';
  banner.innerHTML = '<div><span class="sheet-number">PERSONAL DATA AND HISTORY</span><strong></strong></div><div><span>STATUS</span><strong></strong></div>';
  banner.querySelectorAll('strong')[0].textContent = record.name;
  banner.querySelectorAll('strong')[1].textContent = status.label;
  sheet.append(banner);
  const grid = document.createElement('div');
  grid.className = 'sheet-identity-grid';
  const cell = (label, value) => {
    const box = document.createElement('div');
    box.append(Object.assign(document.createElement('span'), { textContent: label }), Object.assign(document.createElement('strong'), { textContent: value }));
    return box;
  };
  const career = c.career ?? {};
  const ageYears = Number.isFinite(c.chronology?.chronologicalAgeMonths) ? Math.floor(c.chronology.chronologicalAgeMonths / 12) : (c.age ?? '--');
  grid.append(
    cell('UPP', c.upp ?? '------'),
    cell('SERVICE', `${String(career.service ?? 'none').toUpperCase()}${career.terms ? ` · ${career.terms} TERM${career.terms === 1 ? '' : 'S'}` : ''}`),
    cell('RANK', career.rankTitle ?? '--'),
    cell('AGE', String(ageYears)),
    cell('WORLD', record.world?.kind === 'campaign' ? (record.world.campaignName ?? record.world.campaignId ?? 'A CAMPAIGN').toUpperCase() : 'UNASSIGNED'),
    cell('CASH', `Cr${Number(c.finances?.credits ?? 0).toLocaleString()}`)
  );
  sheet.append(grid);
  const block = (title, body) => {
    const section = document.createElement('section');
    section.className = 'sheet-block';
    section.append(Object.assign(document.createElement('h3'), { textContent: title }), body);
    return section;
  };
  const skills = document.createElement('div');
  skills.className = 'sheet-skills';
  const skillEntries = Object.entries(c.skills ?? {}).filter(([, level]) => level > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!skillEntries.length) skills.textContent = 'NO SKILLS';
  for (const [name, level] of skillEntries) skills.append(Object.assign(document.createElement('span'), { className: 'sheet-skill', textContent: `${name}-${level}` }));
  sheet.append(block('SKILLS', skills));
  const kit = document.createElement('dl');
  kit.className = 'sheet-data-list';
  const datum = (label, value) => { kit.append(Object.assign(document.createElement('dt'), { textContent: label }), Object.assign(document.createElement('dd'), { textContent: value })); };
  datum('READY WEAPON', String(c.loadout?.weaponKey ?? 'none').replace(/-/g, ' ').toUpperCase());
  datum('WORN ARMOR', String(c.loadout?.armor ?? 'none').toUpperCase());
  const benefits = Array.isArray(c.benefits) ? c.benefits : [];
  if (benefits.length) datum('BENEFITS', benefits.map((b) => (typeof b === 'string' ? b : b?.label ?? b?.kind ?? '')).filter(Boolean).join(' · '));
  if (Number.isFinite(c.finances?.retirementPayAnnual) && c.finances.retirementPayAnnual > 0) datum('RETIREMENT PAY', `Cr${c.finances.retirementPayAnnual.toLocaleString()} / YEAR`);
  sheet.append(block('EQUIPMENT AND BENEFITS', kit));
  el.selected.replaceChildren(sheet);
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
      body.push(Object.assign(document.createElement('p'), { className: 'enter-empty', textContent: `${already.name.toUpperCase()} IS ${already.pendingJoin ? 'ALREADY WAITING FOR A SEAT' : 'ALREADY IN THIS CAMPAIGN'}.` }));
    }
    const free = records.filter((record) => !record.pendingJoin && characterRecordStatus(record).enter === null);
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
    if (!copied) window.prompt('The join link for your players:', link);
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function renderCharacters() {
  renderJoinPanel();
  const draftRow = renderDraftRow();
  if (!records.length && !draftRow) {
    const empty = document.createElement('div');
    empty.className = 'enter-empty';
    empty.textContent = 'YOU HAVE NO CHARACTERS YET. ROLL ONE TO BEGIN.';
    el.list.replaceChildren(empty);
    renderSelectedCharacter();
    return;
  }
  el.list.replaceChildren(...[draftRow, ...records.map(renderCharacterRow)].filter(Boolean));
  renderSelectedCharacter();
}

async function removeRecord(record) {
  const seatedAt = record.world?.kind === WORLD_KINDS.CAMPAIGN ? (record.world.campaignName || 'a campaign') : null;
  const warning = seatedAt ? `\n\n${record.name} is seated at ${seatedAt}. The referee keeps the campaign's copy; this deletes yours.` : '';
  if (!window.confirm(`Delete ${record.name}? This cannot be undone.${warning}`)) return;
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
  if (!window.confirm(`Take ${record.name} out of ${where}?\n\n${record.name} comes home with everything that happened there, free to join another campaign.`)) return;
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

async function saveCharacter() {
  try {
    if (!character || character.phase !== CHARGEN_PHASES.COMPLETE) throw new Error('finish mustering out first');
    const uid = currentUserId();
    if (!uid) throw new Error('sign in before saving');
    const name = el.name.value.trim();
    if (!name) throw new Error('give the character a name');
    const named = { ...character, name };
    const record = createCharacterRecord(createCharacterDocument(named), { ownerUid: uid });
    await saveCharacterRecord(record);
    character = null;
    saveDraft();
    view = 'characters';
    setStatus(`${name.toUpperCase()} SAVED`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function discardCharacter() {
  if (character && character.phase !== CHARGEN_PHASES.DEAD && !window.confirm('Discard this character?')) return;
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
  el.heading.textContent = !signedIn ? 'GRAYCLOAK TRAVELLER' : view === 'chargen' ? 'CHARACTER GENERATION' : 'YOUR CHARACTERS';
  if (!signedIn) return;
  if (view === 'characters') { renderCharacters(); renderCampaigns(); }
  else renderChargen();
}

el.signinButton.addEventListener('click', () => openSignInDialog());
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
el.save.addEventListener('click', saveCharacter);
el.discard.addEventListener('click', discardCharacter);

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
