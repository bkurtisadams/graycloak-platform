// play.js — the play page's shell: which situation, which drawer, chat open
// or shut. Everything drawn comes from play-views.js; everything known comes
// from one view state. Today that state is sample data (play-sample.js).

import { h, renderMastChips, renderNow, renderScene, renderDrawer, renderTalkLog } from './play-views.js?v=v0.207.4';
import { SAMPLE_SITUATIONS, SAMPLE_ORDER, SAMPLE_REFEREE } from './play-sample.js?v=v0.207.4';
import { createDocumentRegistry, DOCUMENT_REGISTRY_STORAGE_KEY } from '../src/document-registry.js?v=v0.207.4';
import { createPlaySession } from '../src/play-session.js?v=v0.207.4';
import { createPlayCloud } from './play-cloud.js?v=v0.207.4';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js?v=v0.207.4';

const THEME_KEY = 'graycloak-traveller-theme';
const $ = (id) => document.getElementById(id);
const shell = $('shell');

const params = new URLSearchParams(location.search);

// Which campaign, if any. ?show= asks for a sample screen. Otherwise the page
// reads the same registry index.html saves to: ?campaign=<id>, or the one last
// opened in this browser. It only reads.
function openCampaign() {
  if (params.has('show')) return { mode: 'sample' };
  try {
    const registry = createDocumentRegistry({ storage: window.localStorage });
    const id = params.get('campaign') || registry.getActiveCampaignId();
    if (!id) return { mode: 'empty', reason: 'No campaign has been opened in this browser yet.' };
    const session = createPlaySession({ registry, campaignId: id, subsector: FAR_MERIDIAN_SUBSECTOR, cloud, onChange: () => render() });
    return { mode: 'live', session };
  } catch (error) {
    return { mode: 'empty', reason: error?.message ?? String(error) };
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
  fightRunning: null
};
if (!SAMPLE_SITUATIONS[ui.situation]) ui.situation = 'port';

// The one seam. Replace the body with a read of the campaign documents and
// the rest of the page follows.
function viewState() {
  if (source.mode === 'live') return source.session.view({ characterId: ui.characterId, selectedSystemId: ui.selectedSystemId });
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

function renderEmpty() {
  document.title = 'Traveller';
  shell.dataset.situation = 'empty';
  shell.dataset.drawer = 'closed';
  $('drawer').hidden = true;
  $('mast-place').textContent = 'No campaign';
  for (const id of ['mast-campaign', 'mast-detail', 'mast-date']) $(id).textContent = '';
  $('mast-chips').replaceChildren();
  $('scene').replaceChildren();
  $('preview').replaceChildren();
  $('now').replaceChildren(
    h('section', { class: 'lead' },
      h('h2', { text: 'Nothing to show yet' }),
      h('p', { text: `${source.reason} Open or start one from the lobby, then come back to this page.` }),
      h('div', { class: 'lead-actions' },
        h('a', { class: 'button is-primary', href: './enter.html' }, h('span', { text: 'Go to the lobby' })),
        h('a', { class: 'button', href: './play.html?show=port' }, h('span', { text: 'See the sample screens' })))));
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
    onSelectMarker: (id) => { ui.selectedMarker = id; render(); },
    onPickTarget: (id) => { ui.fightTargetId = id; render(); },
    onPickWeapon: (key) => { ui.fightWeaponKey = key; render(); },
    onPickMove: (move) => { ui.fightMove = move; render(); },
    onPickRunning: (on) => { ui.fightRunning = on; render(); },
    onCommand: (command) => { if (source.mode === 'live' && command) source.session.run(command); },
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
  if (ui.drawer) $('drawer-body').replaceChildren(...renderDrawer(ui.drawer, state, state.referee ?? SAMPLE_REFEREE, { onPickCharacter: (id) => { ui.characterId = id; render(); } }));

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
  if (source.mode !== 'live') return;
  await cloud.start();
  let seen;
  cloud.onAuthChange((user) => {
    const uid = user?.uid ?? null;
    if (uid === seen) return;
    seen = uid;
    source.session.connect().then(() => render());
  });
}

paintThemeButton();
start();
