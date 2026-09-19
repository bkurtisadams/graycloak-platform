// play.js — the play page's shell: which situation, which drawer, chat open
// or shut. Everything drawn comes from play-views.js; everything known comes
// from one view state. Today that state is sample data (play-sample.js).

import { h, renderMastChips, renderNow, renderScene, renderDrawer, renderTalkLog, sheetRows } from './play-views.js?v=v0.227.1';
import { SAMPLE_SITUATIONS, SAMPLE_ORDER, SAMPLE_REFEREE } from './play-sample.js?v=v0.227.1';
import { createDocumentRegistry, DOCUMENT_REGISTRY_STORAGE_KEY } from '../src/document-registry.js?v=v0.227.1';
import { createPlaySession, formatCampaignDate } from '../src/play-session.js?v=v0.227.1';
import { createTravellerInvite, generateInviteCode } from '../src/character-record.js?v=v0.227.1';
import { importCampaignHome } from '../src/campaign-home.js?v=v0.227.1';
import { createPlayCloud } from './play-cloud.js?v=v0.227.1';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js?v=v0.227.1';

const THEME_KEY = 'graycloak-traveller-theme';
const $ = (id) => document.getElementById(id);
const shell = $('shell');

const params = new URLSearchParams(location.search);

// Which campaign, if any. ?show= asks for a sample screen. Otherwise the page
// reads the same registry index.html saves to: ?campaign=<id>, or the one last
// opened in this browser. It only reads.
function openCampaign(wanted = null) {
  if (params.has('show')) return { mode: 'sample' };
  try {
    const registry = createDocumentRegistry({ storage: window.localStorage });
    const id = wanted || params.get('campaign') || registry.getActiveCampaignId();
    if (!id) return { mode: 'empty', reason: 'No campaign has been opened in this browser yet.' };
    if (!registry.get(id)) return { mode: 'empty', reason: 'That campaign is not in this browser yet.', wantedId: id };
    const session = createPlaySession({ registry, campaignId: id, subsector: FAR_MERIDIAN_SUBSECTOR, cloud, onChange: () => render() });
    return { mode: 'live', session };
  } catch (error) {
    // v0.219.1: [ PLAY ] in the lobby names a campaign that may live only in
    // the cloud — a campaign opened on another machine, or never opened in
    // this browser. Remember which one was asked for so start() can fetch it
    // rather than stopping at "nothing to show".
    return { mode: 'empty', reason: error?.message ?? String(error), wantedId: wanted || params.get('campaign') || null };
  }
}
const cloud = createPlayCloud();
let source = { mode: 'empty', reason: 'Opening.' };

const ui = {
  characterId: null,
  situation: params.get('show') || 'port',
  drawer: null,
  talkOpen: false,
  selectedSystemId: null,
  selectedMarker: null,
  fightTargetId: null,
  fightWeaponKey: null,
  fightMove: null,
  fightRunning: null,
  fightActorId: null,
  fightAttack: true,
  woundTargets: null,
  // Which referee tab, folder and search the directory is showing.
  referee: { tab: 'Journal', folder: '', query: '' },
  // Seats, invites and join requests live in the cloud, so they are fetched
  // when the Players tab is opened rather than carried in the campaign.
  players: null,
  // The declaration sheet: what the referee has chosen per combatant this
  // round, and which row's throw is spelled out beneath it.
  sheet: {},
  sheetRound: null,
  sheetFocus: null
};
if (!SAMPLE_SITUATIONS[ui.situation]) ui.situation = 'port';

// The one seam. Replace the body with a read of the campaign documents and
// the rest of the page follows.
function viewState() {
  if (source.mode === 'live') {
    const state = source.session.view({ characterId: ui.characterId, selectedSystemId: ui.selectedSystemId, selectedFighterId: ui.selectedMarker, referee: { ...ui.referee, players: ui.referee.tab === 'Players' ? ui.players : null } });
    // The declaration being built lives in the page, not the session: the
    // session only knows what has been declared. Overlay what is chosen here
    // so the movement row, the target and the throw all agree before Declare.
    if (state.fighters?.length) {
      // A new round starts from a clean sheet.
      if (ui.sheetRound !== state.round) { ui.sheet = {}; ui.sheetRound = state.round; }
      const focus = ui.sheetFocus ?? ui.selectedMarker;
      return { ...state, sheetRows: sheetRows(state, ui.sheet), sheetFocus: focus, scene: { ...state.scene, selected: focus ?? state.scene.selected } };
    }
    if (!state.next?.declare) return state;
    const declare = {
      ...state.next.declare,
      move: ui.fightMove ?? state.next.declare.move,
      running: ui.fightRunning ?? state.next.declare.running,
      weaponKey: ui.fightWeaponKey ?? state.next.declare.weaponKey,
      targetId: ui.fightTargetId ?? state.next.declare.targetId
    };
    return { ...state, next: { ...state.next, declare } };
  }
  const sample = SAMPLE_SITUATIONS[ui.situation];
  const scene = { ...sample.scene };
  if (scene.kind === 'subsector') scene.selectedId = ui.selectedSystemId;
  if (scene.kind === 'bands' && ui.selectedMarker) scene.selected = ui.selectedMarker;
  let next = sample.next;
  if (next?.declare) {
    next = { ...next, declare: { ...next.declare, targetId: ui.fightTargetId ?? next.declare.targetId, weaponKey: ui.fightWeaponKey ?? next.declare.weaponKey,
      move: ui.fightMove ?? next.declare.move, running: ui.fightRunning ?? next.declare.running } };
  }
  return { ...sample, next, scene };
}

function openDrawer(kind) {
  ui.drawer = ui.drawer === kind ? null : kind;
  render();
}

// v0.208.1: a browser that has never opened a campaign (a phone, say) had no
// way in: the sign-in link lived in the save line, which only a loaded
// campaign shows. The empty page now signs in and lists the account's cloud
// campaigns, and opening one copies it into this browser.
let cloudList = { state: 'idle', campaigns: [], error: null };

async function refreshCloudList() {
  if (!cloud.userId()) { cloudList = { state: 'idle', campaigns: [], error: null }; render(); return; }
  cloudList = { state: 'loading', campaigns: [], error: null };
  render();
  try {
    const campaigns = await cloud.listOwn();
    cloudList = { state: 'ready', campaigns: campaigns.sort((a, b) => String(b.publishedAt ?? '').localeCompare(String(a.publishedAt ?? ''))), error: null };
  } catch (error) {
    cloudList = { state: 'error', campaigns: [], error: cloud.describeError(error) };
  }
  render();
}

async function openFromCloud(campaignId) {
  cloudList = { ...cloudList, state: 'loading' };
  render();
  try {
    const remote = await cloud.load(campaignId);
    if (!remote) throw new Error('that campaign has no cloud copy to open');
    const registry = createDocumentRegistry({ storage: window.localStorage });
    const { campaign } = registry.putBundle(importCampaignHome(remote).bundle);
    registry.setActiveCampaignId(campaign.identity.id);
    source = openCampaign(campaign.identity.id);
    render();
    if (source.mode === 'live') await source.session.connect();
    render();
  } catch (error) {
    cloudList = { ...cloudList, state: 'error', error: cloud.describeError(error) };
    render();
  }
}

function renderEmpty() {
  document.title = 'Traveller';
  shell.dataset.situation = 'empty';
  shell.dataset.drawer = 'closed';
  $('drawer').hidden = true;
  $('mast-place').textContent = 'No campaign';
  for (const id of ['mast-campaign', 'mast-detail', 'mast-date']) $(id).textContent = '';
  $('mast-save').hidden = true;
  $('mast-chips').replaceChildren();
  $('scene').replaceChildren();
  $('preview').replaceChildren();
  const account = cloud.account();
  const parts = [];
  if (!account) {
    parts.push(h('section', { class: 'lead' },
      h('h2', { text: 'Sign in to open a campaign' }),
      h('p', { text: source.wantedId ? 'That campaign is not in this browser yet. Sign in and it will be fetched from your account.' : 'No campaign has been opened in this browser. Your campaigns are saved to your account; sign in and they are listed here.' }),
      h('div', { class: 'lead-actions' },
        h('button', { type: 'button', class: 'button is-primary', onclick: () => openSignIn() }, h('span', { text: 'Sign in' })))));
  } else {
    parts.push(h('section', { class: 'lead' },
      h('h2', { text: 'Open a campaign' }),
      h('p', { text: `Signed in as ${account.email ?? account.displayName ?? 'your account'}.` }),
      cloudList.state === 'loading' ? h('p', { text: 'Looking for your campaigns\u2026' }) : null,
      cloudList.state === 'error' ? h('p', { class: 'notice is-error', text: cloudList.error }) : null,
      cloudList.state === 'ready' && !cloudList.campaigns.length ? h('p', { text: 'This account has no campaigns in the cloud yet. Start one from the lobby.' }) : null));
    if (cloudList.campaigns.length) {
      parts.push(h('ul', { class: 'steps' }, cloudList.campaigns.map((entry) => h('li', { class: 'step is-ready' },
        h('div', { class: 'step-head' }, h('span', { class: 'step-mark', 'aria-hidden': 'true' }), h('span', { class: 'step-title', text: entry.name ?? entry.campaignId }),
          h('span', { class: 'step-figure', text: [entry.location?.worldName ?? entry.location?.systemName, formatCampaignDate(entry.time)].filter(Boolean).join(', ') })),
        h('button', { type: 'button', class: 'button is-small', text: 'Open', onclick: () => openFromCloud(entry.campaignId) })))));
    }
  }
  if (source.reason && !/No campaign has been opened|Opening\./.test(source.reason)) parts.push(h('p', { class: 'notice is-error', text: source.reason }));
  parts.push(h('div', { class: 'lead-actions' },
    h('a', { class: 'button', href: './enter.html' }, h('span', { text: 'Lobby' })),
    h('a', { class: 'button', href: './play.html?show=port' }, h('span', { text: 'Sample screens' })),
    account ? h('button', { type: 'button', class: 'button', onclick: () => openAccount() }, h('span', { text: 'Account' })) : null));
  $('now').replaceChildren(...parts.filter(Boolean));
}

function render() {
  if (source.mode === 'empty') { renderEmpty(); return; }
  const state = viewState();
  document.title = `${state.place.name} | ${state.campaign.name} | Traveller`;
  shell.dataset.situation = state.situation.kind;
  shell.dataset.drawer = ui.drawer ? 'open' : 'closed';
  shell.dataset.talk = ui.talkOpen ? 'open' : 'closed';

  const handlers = {
    onSelectSystem: (id) => { ui.selectedSystemId = id; render(); },
    onSelectMarker: (id) => { ui.selectedMarker = id; ui.sheetFocus = id; render(); },
    onPickTarget: (id, { reachable = true } = {}) => {
      const state = viewState();
      // Book 1 p.28: a weapon that cannot reach cannot attack. Ordering an
      // attack anyway is the stalemate that ran six rounds in the Sea of Suns
      // fight, so choosing an unreachable opponent orders a close on them.
      if (state.next?.declare && !reachable) { ui.fightMove = 'Close'; ui.fightTargetId = id; handlers.onCommand('fight:declare'); return; }
      // In a fight, choosing the target is the order (Book 1 p.28 step 4B):
      // the movement status is already chosen, so there is nothing left to
      // confirm. Outside a fight this is still just a selection.
      if (state.next?.declare) { ui.fightTargetId = id; handlers.onCommand('fight:declare'); return; }
      ui.fightTargetId = id;
      render();
    },
    onUndeclare: (id) => { if (source.mode === 'live') { source.session.run('fight:undeclare', { fight: { actorId: id } }); ui.selectedMarker = id; render(); } },
    onPickWound: (targets) => { ui.woundTargets = targets; render(); },
    onSheetChange: (id, order) => { ui.sheet = { ...ui.sheet, [id]: order }; ui.sheetFocus = id; render(); },
    onSheetFocus: (id) => { ui.sheetFocus = id; ui.selectedMarker = id; render(); },
    onReferee: (patch) => {
      ui.referee = { ...ui.referee, ...patch };
      if (ui.referee.tab === 'Players') refreshPlayers();
      render();
    },
    onSeat: (action, seat) => runSeat(action, seat),
    onFileActor: (id, folder) => {
      if (source.mode !== 'live') return;
      const wanted = window.prompt('File this actor under (use / for sub-folders)', folder ?? '');
      if (wanted === null) return;
      source.session.run('edit:actor:folder', { fight: { id, value: wanted } });
    },
    onEditCharacter: (id, field, value) => { if (source.mode === 'live') source.session.run(`edit:character:${field}`, { fight: { id, value } }); },
    onEditCombatant: (id, value) => { if (source.mode === 'live') source.session.run('edit:combatant:current', { fight: { id, value } }); },
    onStartFight: (opponentIds, range, characterIds) => {
      if (source.mode === 'live') source.session.run('fight:start', { fight: { opponentIds, range, characterIds } });
    },
    onResolveSheet: () => {
      if (source.mode !== 'live') return;
      const rows = (viewState().sheetRows ?? []).filter((row) => !row.down).map((row) => ({ actorId: row.fighter.id, move: row.move, targetId: row.targetId }));
      source.session.run('fight:sheet', { fight: { rows } });
      ui.sheet = {};
      render();
    },
    onPickWeapon: (key) => { ui.fightWeaponKey = key; render(); },
    onPickMove: (move) => {
      ui.fightMove = move;
      // Evading forbids an attack, so it needs no target and is the whole order.
      if (move === 'Evade' && viewState().next?.declare) { handlers.onCommand('fight:declare'); return; }
      render();
    },
    onPickRunning: (on) => { ui.fightRunning = on; render(); },
    onCommand: (command) => {
      if (source.mode !== 'live' || !command) return;
      // A fight command carries the declaration the screen is showing.
      const fight = command.startsWith('fight:')
        ? { actorId: viewState().next?.declare?.actorId ?? ui.selectedMarker ?? null, move: ui.fightMove ?? 'Stand', running: Boolean(ui.fightRunning), attack: ui.fightAttack !== false, targetId: ui.fightTargetId, woundTargets: ui.woundTargets }
        : null;
      source.session.run(command, { selectedSystemId: ui.selectedSystemId, fight });
      if (command.startsWith('fight:')) {
        ui.fightMove = null; ui.fightRunning = null; ui.fightTargetId = null;
        // After declaring, move to whoever still has no orders, so a round is
        // worked through without hunting for the next name in the tracker.
        if (command === 'fight:declare' || command === 'fight:auto') {
          const after = viewState();
          ui.selectedMarker = after.fighters?.find((entry) => entry.awaiting && !entry.down)?.id ?? null;
        } else ui.selectedMarker = null;
        render();
      }
      if (command === 'fight:wound') ui.woundTargets = null;
    },
    onSignIn: () => openSignIn()
  };
  $('mast-campaign').textContent = state.campaign.name;
  $('mast-place').textContent = state.place.name;
  $('mast-detail').textContent = state.place.detail;
  $('mast-date').textContent = state.campaign.date;
  const saveLine = $('mast-save');
  saveLine.hidden = !state.save;
  if (state.save) {
    saveLine.className = `mast-save is-${state.save.state}`;
    saveLine.title = state.save.detail;
    saveLine.replaceChildren(...[h('span', { text: state.save.state === 'cloud' && source.session.revision ? `${state.save.label}, revision ${source.session.revision}` : state.save.label }),
      state.save.state === 'local' ? h('button', { type: 'button', class: 'mast-signin', text: 'Sign in', onclick: handlers.onSignIn }) : null,
      state.save.state === 'cloud' || state.save.state === 'error' ? h('button', { type: 'button', class: 'mast-signin', text: 'Account', onclick: () => openAccount() }) : null,
      state.save.state === 'stale' ? h('button', { type: 'button', class: 'mast-signin', text: 'Reload', onclick: () => location.reload() }) : null].filter(Boolean));
  }
  $('mast-chips').replaceChildren(...renderMastChips(state, { openDrawer, drawer: ui.drawer }));

  $('now').replaceChildren(...renderNow(state, handlers));
  $('scene').replaceChildren(...renderScene(state, handlers));

  $('drawer').hidden = !ui.drawer;
  // v0.219.0: the drawer used to get a hand-built pair of callbacks, so
  // anything added to `handlers` later (the referee's editor) silently did
  // nothing when clicked. It gets the whole set now.
  if (ui.drawer) $('drawer-body').replaceChildren(...renderDrawer(ui.drawer, state, state.referee ?? SAMPLE_REFEREE, {
    ...handlers,
    onPickCharacter: (id) => { ui.characterId = id; render(); },
    onInventory: (command, characterId, item) => { if (source.mode === 'live') source.session.run(command, { characterId, item }); }
  }));

  const last = state.chat[state.chat.length - 1];
  $('talk-last').replaceChildren(...(last ? [h('b', { text: `${last.who} ` }), last.text] : []));
  $('talk-log').replaceChildren(...renderTalkLog(state.chat));
  $('talk-toggle').textContent = ui.talkOpen ? 'Hide chat' : 'Show chat';
  $('talk-toggle').setAttribute('aria-expanded', String(ui.talkOpen));

  $('preview').hidden = source.mode === 'live';
  if (source.mode !== 'live') $('preview').replaceChildren(h('span', { text: 'Sample data' }), ...SAMPLE_ORDER.map(([key, label]) =>
    h('button', { type: 'button', 'aria-pressed': key === ui.situation, text: label,
      onclick: () => { ui.situation = key; ui.selectedSystemId = null; ui.selectedMarker = null; ui.fightTargetId = null; ui.fightWeaponKey = null; ui.fightMove = null; ui.fightRunning = null; render(); } })));
}

function paintThemeButton() {
  $('theme').textContent = document.documentElement.dataset.theme === 'dark' ? 'Light' : 'Dark';
}

$('theme').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode */ }
  paintThemeButton();
});
$('drawer-close').addEventListener('click', () => { ui.drawer = null; render(); });
$('talk-toggle').addEventListener('click', () => { ui.talkOpen = !ui.talkOpen; render(); });
$('talk-input').addEventListener('focus', () => { if (!ui.talkOpen) { ui.talkOpen = true; render(); $('talk-input').focus(); } });
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (ui.drawer) { ui.drawer = null; render(); } else if (ui.talkOpen) { ui.talkOpen = false; render(); }
});

// index.html autosaves into the same registry from another tab; follow it.
window.addEventListener('storage', (event) => {
  if (source.mode !== 'live' || (event.key && event.key !== DOCUMENT_REGISTRY_STORAGE_KEY)) return;
  source.session.reload();
  render();
});

// v0.222.0: the Players tab. Seats, invites and join requests are cloud
// documents, so they are fetched on demand and re-read after every change.
async function refreshPlayers() {
  if (source.mode !== 'live' || !cloud.userId()) { ui.players = null; render(); return; }
  const campaignId = source.session.resolved.campaign.identity.id;
  ui.players = { ...(ui.players ?? {}), loading: true, error: null };
  render();
  try {
    const [seats, invites] = await Promise.all([cloud.listSeats(campaignId), cloud.listInvites(campaignId)]);
    ui.players = { seats, invites, joins: ui.players?.joins ?? [], loading: false, error: null };
  } catch (error) {
    ui.players = { seats: [], invites: [], joins: [], loading: false, error: cloud.describeError(error) };
  }
  render();
}

async function runSeat(action, seat) {
  if (source.mode !== 'live') return;
  const campaignId = source.session.resolved.campaign.identity.id;
  try {
    if (action === 'invite') {
      const invite = createTravellerInvite({
        code: generateInviteCode(), ownerUid: cloud.userId(),
        campaignId, campaignName: source.session.resolved.campaign.identity.name ?? null
      });
      await cloud.createInvite(invite);
      window.prompt('Give this code to the player. It stays open until revoked.', invite.code);
    } else if (action === 'revoke') {
      if (!window.confirm(`Revoke invite ${seat.code}? Anyone still holding it will not be able to join.`)) return;
      await cloud.revokeInvite(seat.code);
    } else if (action === 'admit') {
      await cloud.seat(campaignId, seat.uid, seat.name ?? null);
      await cloud.dismissJoin(campaignId, seat.uid);
    } else if (action === 'decline') {
      await cloud.dismissJoin(campaignId, seat.uid);
    } else if (action === 'unseat') {
      if (!window.confirm('Take back this seat? Their character sheet and log go with it.')) return;
      await cloud.unseat(campaignId, seat.uid);
    }
    await refreshPlayers();
  } catch (error) {
    ui.players = { ...(ui.players ?? { seats: [], invites: [], joins: [] }), loading: false, error: cloud.describeError(error) };
    render();
  }
}

// Sign-in: Google or email, in the page's own dialog. The mode lives on the
// dialog's data attribute, so what the button says is always what it does.
function openSignIn() {
  const dialog = $('signin');
  const setMode = (creating) => {
    dialog.dataset.mode = creating ? 'create' : 'signin';
    $('signin-title').textContent = creating ? 'Create an account' : 'Sign in';
    $('signin-submit').firstElementChild.textContent = creating ? 'Create account' : 'Sign in';
    $('signin-mode').firstElementChild.textContent = creating ? 'I already have one' : 'Create an account';
    $('signin-name-row').hidden = !creating;
    $('signin-password').setAttribute('autocomplete', creating ? 'new-password' : 'current-password');
    $('signin-status').textContent = '';
  };
  const attempt = async (action) => {
    const status = $('signin-status');
    status.className = 'signin-status';
    status.textContent = 'Working\u2026';
    try { await action(); status.textContent = ''; dialog.close(); }
    catch (error) { status.className = 'signin-status is-error'; status.textContent = cloud.describeError(error); }
  };
  $('signin-close').onclick = () => dialog.close();
  $('signin-mode').onclick = () => setMode(dialog.dataset.mode !== 'create');
  $('signin-google').onclick = () => attempt(() => cloud.signIn());
  $('signin-reset').onclick = async () => {
    const status = $('signin-status');
    const email = $('signin-email').value.trim();
    if (!email) { status.className = 'signin-status is-error'; status.textContent = 'Enter your email address first, then press this again.'; $('signin-email').focus(); return; }
    status.className = 'signin-status';
    status.textContent = 'Working\u2026';
    try {
      await cloud.sendPasswordReset(email);
      status.textContent = `If ${email} has a Graycloak account, an email is on its way with a link to choose a password. Check spam too. Then sign in here with that password.`;
    } catch (error) { status.className = 'signin-status is-error'; status.textContent = cloud.describeError(error); }
  };
  $('signin-form').onsubmit = (event) => {
    event.preventDefault();
    const email = $('signin-email').value.trim();
    const password = $('signin-password').value;
    const creating = dialog.dataset.mode === 'create';
    attempt(() => (creating
      ? cloud.createAccountWithEmail(email, password, { displayName: $('signin-name').value.trim() || null })
      : cloud.signInWithEmail(email, password))).then(() => {
      const status = $('signin-status');
      if (!creating && status.classList.contains('is-error')) status.textContent += ` ${cloud.describeAttempt(email, password)}`;
    });
  };
  $('signin-show').checked = false;
  $('signin-password').type = 'password';
  $('signin-show').onchange = () => { $('signin-password').type = $('signin-show').checked ? 'text' : 'password'; };
  setMode(false);
  $('signin-password').value = '';
  dialog.showModal();
  $('signin-email').focus();
}

// Signed in: set or replace the account's password directly, and sign out.
function openAccount() {
  const dialog = $('account');
  const user = cloud.account();
  const has = cloud.accountProviders().includes('password');
  $('account-who').textContent = user?.email
    ? `Signed in as ${user.email}. It ${has ? 'already has a password; setting one replaces it' : 'has no password yet; setting one adds it'}. This is a Graycloak password, separate from your Google one, and it is shown as you type.`
    : 'Not signed in.';
  const status = $('account-status');
  status.className = 'signin-status';
  status.textContent = '';
  $('account-password').value = '';
  $('account-close').onclick = () => dialog.close();
  $('account-signout').onclick = () => cloud.signOut().then(() => dialog.close());
  $('account-form').onsubmit = async (event) => {
    event.preventDefault();
    status.className = 'signin-status';
    status.textContent = 'Working\u2026';
    try {
      const result = await cloud.setAccountPassword($('account-password').value);
      status.textContent = `Password set and checked: Firebase accepted ${result.email} with the new ${result.length}-character password just now. Sign-in methods on this account: ${result.providers.join(', ')}.`;
      $('account-password').value = '';
    } catch (error) { status.className = 'signin-status is-error'; status.textContent = cloud.describeError(error); }
  };
  dialog.showModal();
}

// Open the campaign, draw it at once from this browser, then ask the cloud.
// Signing in later (or out) reconnects; a failed or blocked Firebase load
// leaves the page working locally, as the current client does.
async function start() {
  source = openCampaign();
  render();
  if (source.mode === 'sample') return;
  await cloud.start();
  // A campaign named in the address but absent here is fetched once signed in.
  if (source.mode === 'empty' && source.wantedId && cloud.userId()) await openFromCloud(source.wantedId);
  // Requests to join arrive while the referee is looking elsewhere, so they
  // are watched rather than polled; the Players tab shows them as they land.
  if (source.mode === 'live' && cloud.userId()) {
    try {
      cloud.watchJoins(source.session.resolved.campaign.identity.id, (joins) => {
        ui.players = { seats: [], invites: [], ...(ui.players ?? {}), joins };
        if (ui.drawer === 'referee' && ui.referee.tab === 'Players') render();
      });
    } catch (error) { console.warn('[traveller] join requests:', error); }
  }
  let seen;
  cloud.onAuthChange((user) => {
    const uid = user?.uid ?? null;
    if (uid === seen) return;
    seen = uid;
    if (source.mode === 'live') source.session.connect().then(() => render());
    else if (source.wantedId && uid) openFromCloud(source.wantedId);
    else refreshCloudList();
  });
}

paintThemeButton();
start();
