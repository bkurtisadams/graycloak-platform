// play.js — the play page's shell: which situation, which drawer, chat open
// or shut. Everything drawn comes from play-views.js; everything known comes
// from one view state. Today that state is sample data (play-sample.js).

import { h, renderMastChips, renderNow, renderScene, renderDrawer, renderTalkLog } from './play-views.js?v=v0.205.0';
import { SAMPLE_SITUATIONS, SAMPLE_ORDER, SAMPLE_REFEREE } from './play-sample.js?v=v0.205.0';
import { createDocumentRegistry, DOCUMENT_REGISTRY_STORAGE_KEY } from '../src/document-registry.js?v=v0.205.0';
import { buildPlayViewState } from '../src/play-session.js?v=v0.205.0';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js?v=v0.205.0';

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
    return { mode: 'live', resolved: registry.resolveCampaign(id) };
  } catch (error) {
    return { mode: 'empty', reason: error?.message ?? String(error) };
  }
}
let source = openCampaign();

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
  if (source.mode === 'live') {
    const state = buildPlayViewState(source.resolved, { subsector: FAR_MERIDIAN_SUBSECTOR, characterId: ui.characterId });
    return { ...state, scene: { ...state.scene, selectedId: ui.selectedSystemId } };
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

  $('mast-campaign').textContent = state.campaign.name;
  $('mast-place').textContent = state.place.name;
  $('mast-detail').textContent = state.place.detail;
  $('mast-date').textContent = state.campaign.date;
  $('mast-chips').replaceChildren(...renderMastChips(state, { openDrawer, drawer: ui.drawer }));

  const handlers = {
    onSelectSystem: (id) => { ui.selectedSystemId = id; render(); },
    onSelectMarker: (id) => { ui.selectedMarker = id; render(); },
    onPickTarget: (id) => { ui.fightTargetId = id; render(); },
    onPickWeapon: (key) => { ui.fightWeaponKey = key; render(); },
    onPickMove: (move) => { ui.fightMove = move; render(); },
    onPickRunning: (on) => { ui.fightRunning = on; render(); }
  };
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
  if (source.mode === 'sample' || (event.key && event.key !== DOCUMENT_REGISTRY_STORAGE_KEY)) return;
  source = openCampaign();
  render();
});

paintThemeButton();
render();
