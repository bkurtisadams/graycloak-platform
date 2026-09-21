// enter.js — the player's front door.
//
// v0.67.0. Sign in; see the characters this account owns; roll another with
// the same Book 1 chargen the referee's client uses; sit one down at a
// referee's table by redeeming an invite code; enter the world it is in. The
// referee's client is never loaded here.
//
// Writes: the account's own travellerCharacters records, and one join request
// per campaign beneath the campaign it applies to. Nothing else.

import { initAuth, onAuthChange, signOutOfTraveller, currentUserId, authStatus } from './auth.js?v=v0.269.0';
import { openSignInDialog, openPasswordDialog } from './signin-ui.js?v=v0.269.0';
import {
  ensureFirestore, saveCharacterRecord, deleteCharacterRecord, watchOwnCharacterRecords,
  readInvite, writeJoinRequest, deleteJoinRequest, listOwnCampaigns, saveCampaignHome,
  renameCampaignHome, deleteCampaignHome
} from './publish.js?v=v0.269.0';
import { campaignHomeSummary, createCampaignHome } from '../src/campaign-home.js?v=v0.269.0';
import { importCampaignBundle } from '../src/campaign-bundle.js?v=v0.269.0';
import { setCampaignOwner, markCampaignPublished } from '../src/campaign-document.js?v=v0.269.0';
import { buildPublishedCampaign } from '../src/published-view.js?v=v0.269.0';
import { renderChargenSheet, renderChargenActions, renderChargenTables } from './chargen-view.js?v=v0.269.0';
import { buildProcedure, formatHistoryEvent } from './ui-model.js?v=v0.269.0';
import { loadTravellerDocument, TRAVELLER_DOCUMENT_KINDS } from './document-loader.js?v=v0.269.0';
import { generateCharacterName } from './generators.js?v=v0.269.0';
import {
  createCharacterRecord, characterRecordStatus, setCharacterRecordPendingJoin, normalizeInviteCode, createJoinRequest, WORLD_KINDS
} from '../src/character-record.js?v=v0.269.0';
import {
  CHARGEN_PHASES, createCharacter, createCharacterDocument, performChargenAction, exportCharacter, importCharacter
} from '../vendor/classic-traveller-rules/index.js?v=v0.269.0';

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
let openJoinFor = null; // characterId whose JOIN row is open

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
      render();
    }))
    .then((unsubscribe) => { if (uid === watchedUid) unsubscribeRecords = unsubscribe; else unsubscribe(); })
    .catch((error) => setStatus(error?.message ?? String(error), 'error'));
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

function renderCampaigns() {
  if (!el.campaignList) return;
  if (!campaigns.length) {
    el.campaignList.replaceChildren(Object.assign(document.createElement('div'), {
      className: 'enter-empty', textContent: 'YOU ARE NOT RUNNING ANY CAMPAIGNS IN THE CLOUD YET.'
    }));
    return;
  }
  el.campaignList.replaceChildren(...campaigns.map((campaign) => {
    const row = document.createElement('div');
    row.className = 'enter-character enterable';
    const name = document.createElement('strong'); name.className = 'enter-character-name'; name.textContent = (campaign.name || campaign.campaignId).toUpperCase();
    const summary = document.createElement('span'); summary.className = 'enter-character-summary';
    summary.textContent = `${campaignDate(campaign.time)} / ${String(campaign.location?.worldName ?? campaign.location?.systemName ?? 'UNMAPPED').toUpperCase()}${campaign.revision ? ` / REVISION ${campaign.revision}` : ''}`;
    const state = document.createElement('span'); state.className = 'enter-character-state';
    state.textContent = campaign.savedAt ? `LAST SAVED ${new Date(campaign.savedAt).toLocaleString()}` : 'PUBLISHED, NO CLOUD COPY YET';
    const tools = document.createElement('div'); tools.className = 'enter-character-tools';
    // v0.219.1: the lobby only ever opened the old client, so the new play
    // page could be reached by typing its address and nothing else. [ PLAY ]
    // opens it on this campaign; [ RUN ] still opens the referee client for
    // the tools that have not moved across yet (scenes, the tactical grid,
    // campaign settings and export).
    // v0.220.0: a campaign could be made but never named or removed, so the
    // lobby filled with UNNAMED CAMPAIGN rows nobody could clear. Both write
    // the cloud copy and this browser's own, so the two do not disagree.
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
        await deleteCampaignHome(campaign.campaignId);
        forgetLocalCampaign(campaign.campaignId);
        setStatus(`${String(label).toUpperCase()} DELETED`, 'ok');
        await refreshCampaigns();
      } catch (error) { setStatus(error?.message ?? String(error), 'error'); }
    });

    const play = document.createElement('a');
    play.className = 'text-button action-button campaign-transition-action';
    play.href = `play.html?campaign=${encodeURIComponent(campaign.campaignId)}`;
    play.textContent = '[ PLAY ]';
    play.title = 'Port call, trade, jump and fights on the new page';
    tools.append(play);
    const run = document.createElement('a');
    run.className = 'text-button action-button';
    run.href = `index.html?campaign=${encodeURIComponent(campaign.campaignId)}`;
    run.textContent = '[ REFEREE TOOLS ]';
    run.title = 'The older client: scenes, the tactical grid, campaign settings and export';
    tools.append(run, rename, remove);
    row.append(name, summary, state, tools);
    return row;
  }));
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
  row.addEventListener('click', (event) => { if (event.target.closest('button, a, input')) return; selectCharacter(record); });
  row.addEventListener('keydown', (event) => { if (event.key === 'Enter' && event.target === row) selectCharacter(record); });
  const name = document.createElement('strong'); name.className = 'enter-character-name'; name.textContent = record.name.toUpperCase();
  const summary = document.createElement('span'); summary.className = 'enter-character-summary'; summary.textContent = recordSummary(record);
  const state = document.createElement('span'); state.className = 'enter-character-state'; state.textContent = status.label;
  const tools = document.createElement('div'); tools.className = 'enter-character-tools';

  if (status.enter === 'campaign') {
    const enter = document.createElement('a');
    enter.className = 'text-button action-button campaign-transition-action';
    enter.href = `player.html?campaign=${encodeURIComponent(status.campaignId)}`;
    enter.textContent = '[ ENTER WORLD ]';
    tools.append(enter);
  } else if (status.enter === 'solo') {
    const solo = document.createElement('button');
    solo.type = 'button'; solo.className = 'text-button action-button'; solo.disabled = true;
    solo.textContent = '[ SOLO WORLD / NOT YET OPEN ]';
    solo.title = 'Solo play on the shared world clock is a later milestone';
    tools.append(solo);
  } else if (record.pendingJoin) {
    const withdraw = document.createElement('button');
    withdraw.type = 'button'; withdraw.className = 'text-button action-button';
    withdraw.textContent = '[ WITHDRAW ]';
    withdraw.addEventListener('click', () => withdrawJoin(record));
    tools.append(withdraw);
  } else {
    // v0.69.0: a campaign starts from a character, here, not from the
    // referee client's own chargen.
    const start = document.createElement('a');
    start.className = 'text-button action-button campaign-transition-action';
    start.href = `index.html?start=${encodeURIComponent(record.characterId)}`;
    start.textContent = '[ START A CAMPAIGN ]';
    start.title = 'Create a campaign you referee, with this character in the party';
    tools.append(start);
    const join = document.createElement('button');
    join.type = 'button'; join.className = 'text-button action-button';
    join.textContent = openJoinFor === record.characterId ? '[ CANCEL ]' : '[ JOIN A TABLE ]';
    join.addEventListener('click', () => { openJoinFor = openJoinFor === record.characterId ? null : record.characterId; render(); });
    tools.append(join);
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'text-button action-button';
    remove.textContent = '[ DELETE ]';
    remove.addEventListener('click', () => removeRecord(record));
    tools.append(remove);
  }
  row.append(name, summary, state, tools);

  if (openJoinFor === record.characterId && !record.pendingJoin && !status.enter) {
    const joinRow = document.createElement('div');
    joinRow.className = 'enter-join-row';
    const input = document.createElement('input');
    input.type = 'text'; input.placeholder = 'invite code from your referee'; input.autocomplete = 'off'; input.size = 14;
    input.value = inviteFromUrl ?? '';
    const submit = document.createElement('button');
    submit.type = 'button'; submit.className = 'text-button action-button'; submit.textContent = '[ SIT DOWN ]';
    submit.addEventListener('click', () => redeemInvite(record, input.value));
    input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); redeemInvite(record, input.value); } });
    joinRow.append(input, submit);
    row.append(joinRow);
  }
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

function renderCharacters() {
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
  if (!window.confirm(`Delete ${record.name}? This cannot be undone.`)) return;
  try {
    await deleteCharacterRecord(record.characterId);
    setStatus(`${record.name.toUpperCase()} DELETED`, 'ok');
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

// --- Invites ---------------------------------------------------------------

async function redeemInvite(record, rawCode) {
  const code = normalizeInviteCode(rawCode);
  try {
    if (!code) throw new Error('enter the invite code your referee sent you');
    const invite = await readInvite(code);
    if (!invite || invite.game !== 'traveller' || !invite.campaignId) throw new Error('that code does not open a Traveller campaign');
    const uid = currentUserId();
    const { user } = authStatus();
    const join = createJoinRequest({ uid, name: user?.displayName ?? user?.email ?? null, code, campaignId: invite.campaignId, record });
    await writeJoinRequest(join);
    const pending = setCharacterRecordPendingJoin(record, { campaignId: invite.campaignId, campaignName: invite.campaignName ?? null, code });
    await saveCharacterRecord(pending);
    openJoinFor = null;
    setStatus(`${record.name.toUpperCase()} IS WAITING FOR A SEAT AT ${String(invite.campaignName ?? invite.campaignId).toUpperCase()}`, 'ok');
  } catch (error) {
    console.error(error);
    setStatus(error?.code === 'permission-denied' ? 'THAT CODE WAS NOT ACCEPTED' : (error?.message ?? String(error)), 'error');
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
const inviteFromUrl = normalizeInviteCode(new URLSearchParams(window.location.search).get('invite')) || null;

onAuthChange(() => {
  watchRecords();
  if (currentUserId()) loadCampaigns().catch((error) => console.error(error));
  else { campaigns = []; campaignsLoadedFor = null; }
  // Sign-in lands on the list; a draft from before a reload is offered there.
  if (!currentUserId()) { character = null; view = 'characters'; }
  if (inviteFromUrl && currentUserId()) setStatus(`INVITE ${inviteFromUrl} READY / CHOOSE A CHARACTER AND SIT DOWN`, 'ok');
  render();
});
initAuth().then(render);
