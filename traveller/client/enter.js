// enter.js — the player's front door.
//
// v0.67.0. Sign in; see the characters this account owns; roll another with
// the same Book 1 chargen the referee's client uses; sit one down at a
// referee's table by redeeming an invite code; enter the world it is in. The
// referee's client is never loaded here.
//
// Writes: the account's own travellerCharacters records, and one join request
// per campaign beneath the campaign it applies to. Nothing else.

import { initAuth, onAuthChange, signOutOfTraveller, currentUserId, authStatus } from './auth.js';
import { openSignInDialog } from './signin-ui.js';
import {
  ensureFirestore, saveCharacterRecord, deleteCharacterRecord, watchOwnCharacterRecords,
  readInvite, writeJoinRequest, deleteJoinRequest, listOwnCampaigns, saveCampaignHome
} from './publish.js';
import { campaignHomeSummary, createCampaignHome } from '../src/campaign-home.js';
import { importCampaignBundle } from '../src/campaign-bundle.js';
import { setCampaignOwner, markCampaignPublished } from '../src/campaign-document.js';
import { buildPublishedCampaign } from '../src/published-view.js';
import { renderChargenSheet, renderChargenActions, renderChargenTables } from './chargen-view.js';
import { buildProcedure } from './ui-model.js';
import { generateCharacterName } from './generators.js';
import {
  createCharacterRecord, characterRecordStatus, setCharacterRecordPendingJoin, normalizeInviteCode, createJoinRequest, WORLD_KINDS
} from '../src/character-record.js';
import {
  CHARGEN_PHASES, createCharacter, createCharacterDocument, performChargenAction, exportCharacter, importCharacter
} from '../../packages/classic-traveller-rules/index.js';

const el = {
  status: document.querySelector('#enter-status'),
  heading: document.querySelector('#enter-heading'),
  account: document.querySelector('#enter-account'),
  accountButton: document.querySelector('#enter-account-button'),
  signin: document.querySelector('#enter-signin'),
  signinButton: document.querySelector('#enter-signin-button'),
  characters: document.querySelector('#enter-characters'),
  list: document.querySelector('#enter-character-list'),
  newCharacter: document.querySelector('#enter-new-character'),
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

function renderAccount() {
  const { user, status } = authStatus();
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
    const run = document.createElement('a');
    run.className = 'text-button action-button campaign-transition-action';
    run.href = `index.html?campaign=${encodeURIComponent(campaign.campaignId)}`;
    run.textContent = '[ RUN ]';
    tools.append(run);
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
  row.className = `enter-character${status.enter ? ' enterable' : ''}`;
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

function renderCharacters() {
  if (!records.length) {
    const empty = document.createElement('div');
    empty.className = 'enter-empty';
    empty.textContent = 'YOU HAVE NO CHARACTERS YET. ROLL ONE TO BEGIN.';
    el.list.replaceChildren(empty);
    return;
  }
  el.list.replaceChildren(...records.map(renderCharacterRow));
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
    if (!invite || invite.game !== 'traveller' || !invite.campaignId) throw new Error('that code does not open a Traveller table');
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
  // A draft from before a reload comes back; a fresh sign-in starts on the list.
  const draft = currentUserId() ? loadDraft() : null;
  if (draft && !character) { character = draft; view = 'chargen'; }
  if (!currentUserId()) { character = null; view = 'characters'; }
  if (inviteFromUrl && currentUserId()) setStatus(`INVITE ${inviteFromUrl} READY / CHOOSE A CHARACTER AND SIT DOWN`, 'ok');
  render();
});
initAuth().then(render);
