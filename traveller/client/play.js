// play.js — the play page's shell: which situation, which drawer, chat open
// or shut. Everything drawn comes from play-views.js; everything known comes
// from one view state. Today that state is sample data (play-sample.js).

import { h, renderMastChips, renderNow, renderScene, renderDrawer, renderTalkLog } from './play-views.js?v=v0.204.0';
import { SAMPLE_SITUATIONS, SAMPLE_ORDER, SAMPLE_REFEREE } from './play-sample.js?v=v0.204.0';

const THEME_KEY = 'graycloak-traveller-theme';
const $ = (id) => document.getElementById(id);
const shell = $('shell');

const ui = {
  situation: new URLSearchParams(location.search).get('show') || 'port',
  drawer: null,
  talkOpen: false,
  selectedSystemId: null,
  selectedMarker: null,
  fightTargetId: null,
  fightWeaponKey: null
};
if (!SAMPLE_SITUATIONS[ui.situation]) ui.situation = 'port';

// The one seam. Replace the body with a read of the campaign documents and
// the rest of the page follows.
function viewState() {
  const sample = SAMPLE_SITUATIONS[ui.situation];
  const scene = { ...sample.scene };
  if (scene.kind === 'subsector') scene.selectedId = ui.selectedSystemId;
  if (scene.kind === 'bands' && ui.selectedMarker) scene.selected = ui.selectedMarker;
  let next = sample.next;
  if (next?.declare) {
    next = { ...next, declare: { ...next.declare, targetId: ui.fightTargetId ?? next.declare.targetId, weaponKey: ui.fightWeaponKey ?? next.declare.weaponKey } };
  }
  return { ...sample, next, scene };
}

function openDrawer(kind) {
  ui.drawer = ui.drawer === kind ? null : kind;
  render();
}

function render() {
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
    onPickWeapon: (key) => { ui.fightWeaponKey = key; render(); }
  };
  $('now').replaceChildren(...renderNow(state, handlers));
  $('scene').replaceChildren(...renderScene(state, handlers));

  $('drawer').hidden = !ui.drawer;
  if (ui.drawer) $('drawer-body').replaceChildren(...renderDrawer(ui.drawer, state, SAMPLE_REFEREE));

  const last = state.chat[state.chat.length - 1];
  $('talk-last').replaceChildren(h('b', { text: `${last.who} ` }), last.text);
  $('talk-log').replaceChildren(...renderTalkLog(state.chat));
  $('talk-toggle').textContent = ui.talkOpen ? 'Hide chat' : 'Show chat';
  $('talk-toggle').setAttribute('aria-expanded', String(ui.talkOpen));

  $('preview').replaceChildren(h('span', { text: 'Sample data' }), ...SAMPLE_ORDER.map(([key, label]) =>
    h('button', { type: 'button', 'aria-pressed': key === ui.situation, text: label,
      onclick: () => { ui.situation = key; ui.selectedSystemId = null; ui.selectedMarker = null; ui.fightTargetId = null; ui.fightWeaponKey = null; render(); } })));
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

paintThemeButton();
render();
