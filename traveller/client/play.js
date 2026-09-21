// play.js — the play page's shell: which situation, which drawer, chat open
// or shut. Everything drawn comes from play-views.js; everything known comes
// from one view state. Today that state is sample data (play-sample.js).

import { h, renderMastChips, renderNow, renderScene, renderDrawer, renderTalkLog, renderRowMenu, renderFighterMenu, renderSideTabs, sheetRows } from './play-views.js?v=v0.261.0';
import { renderSheets, forgetSheetPosition } from './sheets.js?v=v0.261.0';
import { SAMPLE_SITUATIONS, SAMPLE_ORDER, SAMPLE_REFEREE } from './play-sample.js?v=v0.261.0';
import { createDocumentRegistry, DOCUMENT_REGISTRY_STORAGE_KEY } from '../src/document-registry.js?v=v0.261.0';
import { createPlaySession, formatCampaignDate, vectorFromSpeedBearing } from '../src/play-session.js?v=v0.261.0';
import { createTravellerInvite, generateInviteCode } from '../src/character-record.js?v=v0.261.0';
import { importCampaignHome } from '../src/campaign-home.js?v=v0.261.0';
import { createPlayCloud } from './play-cloud.js?v=v0.261.0';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js?v=v0.261.0';

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
  // Vector-mode ship combat: the thrust the referee has typed for the
  // player's ship this movement phase but not yet committed. Reset to null
  // whenever it's committed/coasted or a new movement phase starts, the
  // same lifecycle ui.sheet already has for a personal fight's round.
  vectorThrust: null,
  // Which referee tab, folder and search the directory is showing.
  referee: { tab: 'Journal', folder: '', query: '' },
  // The vector-board scene currently expanded for staging (Scenes tab).
  // The picker itself is an uncontrolled form (like inventorySection's own
  // add-item form) — read via FormData on submit, no per-keystroke ui state.
  stagingSceneId: null,
  // v0.249.0: the open sheets, in the order they were opened, and the
  // right-click menu's target. Both are view state: nothing here is saved.
  openSheets: [],
  rowMenu: null,
  // v0.253.0: the sidebar. Chat is the default tab; the others are the
  // directories. A masthead chip (character, ship, combat) opens its panel in
  // the sidebar over whichever tab was showing, and Close returns to it.
  sidebarTab: 'Chat',
  // v0.257.0: the referee's view settings, kept in this browser. Auto-target
  // is off by default (v0.255.0); combat messages default to attacks only.
  settings: loadViewSettings(),
  bandsShown: null,
  sidebarCollapsed: false,
  showAllNotices: false,
  speakerId: null,
  fighterMenu: null,
  stagingIntruder: 'opposition',
  stagingPressurised: false,
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
    const state = source.session.view({
      characterId: ui.characterId, selectedSystemId: ui.selectedSystemId, selectedFighterId: ui.selectedMarker,
      referee: { ...ui.referee, players: ui.referee.tab === 'Players' ? ui.players : null, stagingSceneId: ui.stagingSceneId },
      // v0.246.0: staging takes the screen, so it is no longer a tab's
      // business. Intruder and pressure are choices being made here, not
      // facts in the campaign, so they live in ui until Start combat.
      staging: ui.stagingSceneId ? { sceneId: ui.stagingSceneId, intruder: ui.stagingIntruder, pressurised: ui.stagingPressurised } : null,
      sheets: ui.openSheets
    });
    // The declaration being built lives in the page, not the session: the
    // session only knows what has been declared. Overlay what is chosen here
    // so the movement row, the target and the throw all agree before Declare.
    if (state.fighters?.length || state.setupPhase) {
      // A new round starts from a clean sheet.
      // v0.259.0: declarations carry over from round to round until changed
      // (Kurt, Sep 2026: a brawler who closed and punched keeps doing so).
      // A new fight starts clean; a new round keeps the last one's orders,
      // less any that no longer make sense — Escape is round 1 only, and
      // sheetRows drops a target who is down.
      if (ui.sheetFight !== state.encounterId) { ui.sheet = {}; ui.sheetFight = state.encounterId; }
      if (ui.sheetRound !== state.round) {
        ui.sheet = Object.fromEntries(Object.entries(ui.sheet).map(([id, order]) => [id, order.move === 'Escape' ? { ...order, move: 'Stand' } : order]));
        ui.sheetRound = state.round;
      }
      const focus = ui.sheetFocus ?? ui.selectedMarker;
      const withSetting = { ...state, autoTarget: Boolean(ui.settings.autoTarget), bandsShown: ui.bandsShown, viewSettings: ui.settings, woundDraft: ui.woundDraft ?? null };
      return { ...withSetting, sheetRows: sheetRows(withSetting, ui.sheet), sheetFocus: focus, scene: { ...state.scene, selected: focus ?? state.scene.selected } };
    }
    if (!state.next?.declare) {
      // Vector-mode ship combat: the thrust typed but not yet committed
      // lives here (ui.vectorThrust), same reasoning as the declare overlay
      // above — the session only knows what has actually been committed.
      if (state.shipFight?.vector) {
        return { ...state, shipFight: { ...state.shipFight, vector: { ...state.shipFight.vector, pendingThrust: ui.vectorThrust ?? { x: 0, y: 0 } } } };
      }
      return state;
    }
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

function loadViewSettings() {
  const defaults = { combatMessages: 'terse', autoTarget: false };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem('graycloak-traveller-view-settings') || '{}') }; } catch { return defaults; }
}
function saveViewSettings() {
  try { localStorage.setItem('graycloak-traveller-view-settings', JSON.stringify(ui.settings)); } catch { /* private mode: the setting lasts this session */ }
}

function openDrawer(kind) {
  if (kind === 'combat-board') {
    if (source.mode === 'live') {
      const result = source.session.run('fight:setup');
      if (!result.ok) window.alert(result.message);
    }
    // The Actors tab is where the tokens come from, so it is put in reach.
    ui.drawer = 'referee';
    ui.sidebarTab = 'Actors';
    ui.referee = { ...ui.referee, tab: 'Actors', folder: '' };
    ui.sidebarCollapsed = false;
    render();
    return;
  }
  // v0.253.0: a chip's panel opens in the sidebar over the current tab, and a
  // second click puts the tab back.
  const back = ui.sidebarTab === 'Chat' ? null : 'referee';
  ui.drawer = ui.drawer === kind ? back : kind;
  ui.sidebarCollapsed = false;
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
  shell.dataset.drawer = 'open';

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
    // v0.260.0: the wound's groups on the fight screen.
    onWoundDraft: (draft) => { ui.woundDraft = draft; render(); },
    // v0.261.0: recovery, from the character sheet.
    onRest: (id) => {
      if (source.mode !== 'live') return;
      const result = source.session.run('character:rest', { fight: { id } });
      if (!result.ok) window.alert(result.message);
      render();
    },
    onMedical: (id, medicId, xeno) => {
      if (source.mode !== 'live') return;
      const result = source.session.run('character:medical', { fight: { id, value: { medicId, xeno } } });
      if (!result.ok) window.alert(result.message);
      render();
    },
    onAllocateWound: (draft) => {
      if (source.mode !== 'live') return;
      const result = source.session.run('fight:wound', { fight: { woundTargets: draft.targets, woundAllocation: draft.shares } });
      if (!result.ok) window.alert(result.message);
      ui.woundDraft = null;
      render();
    },
    onSheetChange: (id, order) => { ui.sheet = { ...ui.sheet, [id]: order }; ui.sheetFocus = id; render(); },
    // v0.254.0 ---------------------------------------- board setup
    onHoverMarker: (id) => { ui.hoveredMarker = id; },
    onAutoTarget: (on) => { ui.settings = { ...ui.settings, autoTarget: Boolean(on) }; saveViewSettings(); ui.sheet = {}; render(); },
    onSetting: (name, value) => {
      ui.settings = { ...ui.settings, [name]: value };
      saveViewSettings();
      if (name === 'autoTarget') ui.sheet = {};
      render();
    },
    onBandZoom: (bands) => { ui.bandsShown = bands; render(); },
    onArmor: (combatantId, armor) => {
      if (source.mode !== 'live') return;
      const result = source.session.run('fight:armor', { fight: { value: { combatantId, armor } } });
      if (!result.ok) window.alert(result.message);
      render();
    },
    onWeapon: (combatantId, weaponKey) => {
      if (source.mode !== 'live') return;
      const result = source.session.run('fight:weapon', { fight: { value: { combatantId, weaponKey } } });
      if (!result.ok) window.alert(result.message);
      render();
    },
    onEditScoresPrompt: (fighter) => {
      // The referee's fiat, off the round's own flow: one prompt rather than
      // three boxes sitting beside every attack.
      const now = fighter.characteristics;
      const typed = window.prompt(`${fighter.name}: STR DEX END now (was ${now.STR} ${now.DEX} ${now.END})`, `${now.STR} ${now.DEX} ${now.END}`);
      if (typed === null) return;
      const [STR, DEX, END] = typed.trim().split(/[\s,]+/).map(Number);
      if ([STR, DEX, END].some((value) => !Number.isInteger(value))) { window.alert('Three whole numbers, like 7 7 5.'); return; }
      handlers.onEditCombatant?.(fighter.id, { STR, DEX, END });
    },
    onDropActor: (data, band) => {
      if (source.mode !== 'live') return;
      const result = source.session.run('fight:place', { fight: { value: { ...data, column: band } } });
      if (!result.ok) window.alert(result.message);
      render();
    },
    onRepositionToken: (combatantId, band) => {
      if (source.mode !== 'live') return;
      source.session.run('fight:reposition', { fight: { value: { combatantId, column: band } } });
      render();
    },
    onRemoveToken: (combatantId) => {
      if (source.mode !== 'live') return;
      source.session.run('fight:remove', { fight: { value: { combatantId } } });
      render();
    },
    onBeginFight: (surprise) => {
      if (source.mode !== 'live') return;
      const result = source.session.run('fight:begin', { fight: { value: { surprise } } });
      if (!result.ok) window.alert(result.message);
      ui.sidebarTab = 'Chat';
      ui.drawer = null;
      render();
    },
    onSheetFocus: (id) => { ui.sheetFocus = id; ui.selectedMarker = id; render(); },
    onReferee: (patch) => {
      ui.referee = { ...ui.referee, ...patch };
      if (ui.referee.tab === 'Players') refreshPlayers();
      render();
    },
    onSeat: (action, seat) => runSeat(action, seat),
    // v0.249.0 --------------------------------------------- sheets
    onOpenSheet: (kind, id) => {
      if (!kind || !id) return;
      const already = ui.openSheets.find((entry) => entry.kind === kind && entry.id === id);
      // Opening one already open brings it to the front rather than stacking
      // a second copy of the same document.
      ui.openSheets = [...ui.openSheets.filter((entry) => entry !== already), already ?? { kind, id, compact: false }];
      ui.rowMenu = null;
      render();
    },
    onCloseSheet: (kind, id) => {
      ui.openSheets = ui.openSheets.filter((entry) => !(entry.kind === kind && entry.id === id));
      forgetSheetPosition(kind, id);
      render();
    },
    onCompactSheet: (kind, id, compact) => {
      ui.openSheets = ui.openSheets.map((entry) => (entry.kind === kind && entry.id === id ? { ...entry, compact } : entry));
      render();
    },
    onSheetTab: (kind, id, tab) => {
      ui.openSheets = ui.openSheets.map((entry) => (entry.kind === kind && entry.id === id ? { ...entry, tab } : entry));
      render();
    },
    onEditCharacter: (id, field, value) => {
      if (source.mode !== 'live') return;
      // Name and loadout already had commands of their own (edit:character);
      // notes is new and goes through the sheet's own group.
      if (field === 'notes') source.session.run('character:notes', { fight: { id, value } });
      else source.session.run(`edit:character:${field}`, { fight: { id, value } });
    },
    onEditRecord: (id, patch) => { if (source.mode === 'live') source.session.run('character:record', { fight: { id, value: patch } }); },
    onInventory: (id, verb, itemId, value) => {
      if (source.mode !== 'live') return;
      const command = itemId ? `inventory:${verb}:${itemId}` : `inventory:${verb}`;
      source.session.run(verb === 'military' ? `inventory:military:${value ?? itemId}` : command, { characterId: id, item: value ?? null });
    },
    onSheetRoll: (id, what) => {
      // The roll pipeline and its chat card are the next slice; until then
      // the sheet says what it would throw rather than pretending to.
      window.alert(what.kind === 'attack'
        ? 'Attack rolls from the sheet arrive with the chat cards.'
        : `${what.skill}-${what.level} would throw 2D +${what.level}. Skill throws arrive with the chat cards.`);
    },
    onPrintCharacter: () => { window.alert('The TAS Form 2 print view is the next step after the tabs.'); },
    onRowMenu: (entry, at) => { ui.rowMenu = { entry, at }; render(); },
    onCloseRowMenu: () => { ui.rowMenu = null; render(); },
    onFighterMenu: (fighter, at, row = {}) => {
      ui.fighterMenu = { fighter, at, ...row };
      ui.selectedMarker = fighter.id;
      render();
    },
    onCloseFighterMenu: () => { ui.fighterMenu = null; render(); },
    onCreateActor: (kind, folder) => {
      if (source.mode !== 'live') return;
      const name = window.prompt(kind === 'statblock' ? 'New statblock name:' : 'New actor name:', '');
      if (name === null || !name.trim()) return;
      const result = source.session.run('actor:create', { fight: { value: { kind, name: name.trim(), folder: folder && folder !== 'Unfiled' ? folder : '' } } });
      if (result.ok && result.createdId) ui.openSheets = [...ui.openSheets, { kind: 'actor', id: result.createdId, compact: kind === 'statblock' }];
      render();
    },
    onCopyDocument: (kind, id) => {
      if (source.mode !== 'live' || kind !== 'actor') return;
      const result = source.session.run('actor:copy', { fight: { id } });
      if (result.ok && result.createdId) ui.openSheets = [...ui.openSheets, { kind: 'actor', id: result.createdId, compact: false }];
      render();
    },
    onDeleteActor: (id, name) => {
      if (source.mode !== 'live') return;
      if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
      const result = source.session.run('actor:delete', { fight: { id } });
      if (result.ok) ui.openSheets = ui.openSheets.filter((entry) => entry.id !== id);
      render();
    },
    onRenameActor: (id, was) => {
      if (source.mode !== 'live') return;
      const name = window.prompt('Rename to:', was ?? '');
      if (name === null || !name.trim()) return;
      source.session.run('edit:actor:name', { fight: { id, value: name.trim() } });
    },
    onActorKind: (id, kind) => { if (source.mode === 'live') source.session.run('actor:kind', { fight: { id, value: kind } }); },
    onNumberTokens: (id, on) => { if (source.mode === 'live') source.session.run('actor:numbering', { fight: { id, value: on } }); },
    onEditActor: (id, field, value) => { if (source.mode === 'live') source.session.run(`edit:actor:${field}`, { fight: { id, value } }); },
    onEditSkills: (id, text) => { if (source.mode === 'live') source.session.run('edit:actor:skills', { fight: { id, value: text } }); },
    onEditShip: (id, field, value) => { if (source.mode === 'live') source.session.run(`edit:ship:${field}`, { fight: { id, value } }); },
    onStageDocument: (kind, id, count = 1) => {
      // Staging a ship needs a board to stage it onto, which is the Space
      // canvas; an actor has no board of its own yet, so it says so rather
      // than failing silently.
      if (kind === 'ship' && ui.stagingSceneId) { handlers.onStageShip?.({ actorId: id }, 'opposition', 0, 0); return; }
      window.alert(kind === 'ship'
        ? 'Open a space scene first: Referee \u2192 Scenes \u2192 Stage.'
        : `Placing ${count > 1 ? `${count} of them` : 'an actor'} on a board comes with the combat tracker.`);
    },
    onFileActor: (id, folder) => {
      if (source.mode !== 'live') return;
      const wanted = window.prompt('File this actor under (use / for sub-folders)', folder ?? '');
      if (wanted === null) return;
      source.session.run('edit:actor:folder', { fight: { id, value: wanted } });
    },
    // v0.229.0: the Scenes tab's own fiat. Board authoring (size, planets)
    // stays in the referee client — this is create, file, activate, delete.
    onSceneAction: (action, id, folder) => {
      if (source.mode !== 'live') return;
      if (action === 'create' || action === 'create-space') {
        const name = window.prompt(action === 'create-space' ? 'New space scene name:' : 'New scene name:', '');
        if (name === null || !name.trim()) return;
        const wantedFolder = folder && folder !== 'Unfiled' ? folder : undefined;
        source.session.run('scene:create', { fight: { value: { name: name.trim(), folder: wantedFolder, boardKind: action === 'create-space' ? 'vector' : 'grid' } } });
      } else if (action === 'file') {
        const wanted = window.prompt('File this scene under (use / for sub-folders)', folder ?? '');
        if (wanted === null || !wanted.trim()) return;
        source.session.run('scene:file', { fight: { id, value: wanted.trim() } });
      } else if (action === 'activate') {
        source.session.run('scene:activate', { fight: { id } });
      } else if (action === 'delete') {
        if (!window.confirm('Delete this scene?')) return;
        source.session.run('scene:delete', { fight: { id } });
      } else if (action === 'stage') {
        ui.stagingSceneId = ui.stagingSceneId === id ? null : id;
        // Staging owns the screen now, so the drawer it was started from
        // gets out of the way.
        if (ui.stagingSceneId) ui.drawer = null;
        render();
      }
    },
    onStageShip: (choice, side, x, y) => {
      if (source.mode !== 'live' || !ui.stagingSceneId) return;
      source.session.run('scene:stage-ship', { fight: { id: ui.stagingSceneId, value: { actorId: choice.actorId, side, x, y, label: choice.label } } });
    },
    onUnstageShip: (tokenId) => {
      if (source.mode !== 'live' || !ui.stagingSceneId) return;
      source.session.run('scene:unstage-ship', { fight: { id: ui.stagingSceneId, value: tokenId } });
    },
    onUpdateStagedShip: (tokenId, patch) => {
      if (source.mode !== 'live' || !ui.stagingSceneId) return;
      source.session.run('scene:update-ship', { fight: { id: ui.stagingSceneId, value: { tokenId, ...patch } } });
    },
    // Either an x/y pair (the board's own velocity-arrow drag) or the
    // speed-and-bearing the checklist states it in (Book 2 p.25).
    onSetShipVector: (tokenId, velocity) => {
      if (source.mode !== 'live' || !ui.stagingSceneId) return;
      const value = Number.isFinite(velocity?.x) ? velocity : vectorFromSpeedBearing(velocity.speed, velocity.bearing);
      source.session.run('scene:set-ship-vector', { fight: { id: ui.stagingSceneId, value: { tokenId, velocity: value } } });
    },
    onStagingChange: (patch) => {
      if (patch.intruder) ui.stagingIntruder = patch.intruder;
      if ('pressurised' in patch) ui.stagingPressurised = Boolean(patch.pressurised);
      render();
    },
    onSceneAtmosphere: (atmosphere) => {
      if (source.mode !== 'live' || !ui.stagingSceneId) return;
      source.session.run('scene:atmosphere', { fight: { id: ui.stagingSceneId, value: atmosphere } });
    },
    onSceneBody: (action, value) => {
      if (source.mode !== 'live' || !ui.stagingSceneId) return;
      source.session.run(`scene:${action}-body`, { fight: { id: ui.stagingSceneId, value } });
    },
    onStartVectorCombat: (intruder, pressurised) => {
      if (source.mode !== 'live' || !ui.stagingSceneId) return;
      const result = source.session.run('shipfight:vector-start', { fight: { sceneId: ui.stagingSceneId, intruder, pressurised } });
      if (result.ok) { ui.stagingSceneId = null; ui.drawer = null; }
      render();
    },
    onEditCharacter: (id, field, value) => { if (source.mode === 'live') source.session.run(`edit:character:${field}`, { fight: { id, value } }); },
    onEditShip: (id, field, value) => { if (source.mode === 'live') source.session.run(`edit:ship:${field}`, { fight: { id, value } }); },
    onEditCombatant: (id, value) => { if (source.mode === 'live') source.session.run('edit:combatant:current', { fight: { id, value } }); },
    onStartFight: (opponentIds, range, characterIds) => {
      if (source.mode !== 'live') return;
      const result = source.session.run('fight:start', { fight: { opponentIds, range, characterIds } });
      // v0.252.0: the fight has the scene column now, so the drawer it was
      // started from gets out of the way.
      if (result.ok) { ui.drawer = null; render(); }
    },
    onResolveSheet: () => {
      if (source.mode !== 'live') return;
      const rows = (viewState().sheetRows ?? []).filter((row) => !row.down).map((row) => ({ actorId: row.fighter.id, move: row.move, targetId: row.targetId }));
      source.session.run('fight:sheet', { fight: { rows } });
      // Keep what was just declared as next round's starting point.
      ui.sheet = Object.fromEntries(rows.map((row) => [row.actorId, { move: row.move, targetId: row.targetId }]));
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
    // No render: the plot repaints its own preview (vector-fight-view.js).
    // Rebuilding the page here replaced the field being typed in, and the
    // caret was gone after one digit.
    onThrustChange: (next) => { ui.vectorThrust = next; },
    onCommit: (acceleration) => {
      if (source.mode !== 'live') return;
      source.session.run('shipfight:vector-move', { fight: { shipId: 'player', acceleration } });
      ui.vectorThrust = null;
      render();
    },
    onCoast: () => {
      if (source.mode !== 'live') return;
      source.session.run('shipfight:vector-coast', { fight: { shipId: 'player' } });
      ui.vectorThrust = null;
      render();
    },
    onAdvance: () => {
      if (source.mode !== 'live') return;
      source.session.run('shipfight:vector-advance');
      render();
    },
    onFire: () => {
      if (source.mode !== 'live') return;
      source.session.run('shipfight:vector-fire');
      render();
    },
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

  // v0.253.0: the sidebar is always there (unless collapsed). A chip's panel
  // takes it over; otherwise it shows the tab.
  const shellNode = $('shell');
  shellNode.dataset.sidebar = ui.sidebarCollapsed ? 'collapsed' : 'open';
  $('side-tabs').replaceChildren(...renderSideTabs(ui.drawer && ui.drawer !== 'referee' ? null : ui.sidebarTab, {
    players: (state.referee?.presence ?? []).length,
    onTab: (tab) => {
      ui.sidebarTab = tab;
      ui.drawer = tab === 'Chat' ? null : 'referee';
      if (tab !== 'Chat') ui.referee = { ...ui.referee, tab, folder: '' };
      ui.sidebarCollapsed = false;
      render();
    }
  }));
  const panel = ui.drawer && ui.drawer !== 'referee' ? ui.drawer : null;
  const chatShowing = !panel && ui.sidebarTab === 'Chat';
  $('side-chat').hidden = !chatShowing;
  $('drawer-body').hidden = chatShowing;
  if (!chatShowing) {
    const kind = panel ?? 'referee';
    const body = renderDrawer(kind, { ...state, viewSettings: ui.settings }, state.referee ?? SAMPLE_REFEREE, {
      ...handlers,
      onPickCharacter: (id) => {
        ui.characterId = id;
        render();
        // Make it stick past a reload, not just this tab's session — see the
        // comment on character:activate in play-session.js.
        if (source.mode === 'live') source.session.run('character:activate', { characterId: id });
      },
      onInventory: (command, characterId, item) => { if (source.mode === 'live') source.session.run(command, { characterId, item }); }
    });
    $('drawer-body').replaceChildren(...[
      panel ? h('button', { type: 'button', class: 'side-back', text: `\u2190 ${ui.sidebarTab}`, onclick: () => { ui.drawer = ui.sidebarTab === 'Chat' ? null : 'referee'; render(); } }) : null,
      ...body
    ].filter(Boolean));
  }

  // v0.249.0: sheets and the row menu float over everything, so they are
  // drawn last into their own layer rather than inside any column.
  const layer = $('overlay');
  if (layer) {
    layer.replaceChildren(...[
      (state.sheets ?? []).length ? renderSheets(state.sheets, handlers) : null,
      ui.rowMenu ? renderRowMenu(ui.rowMenu, handlers) : null,
      ui.fighterMenu ? renderFighterMenu({
        ...ui.fighterMenu,
        round: state.round ?? 1,
        referee: state.seat !== 'player',
        setup: Boolean(state.setupPhase),
        foes: ui.fighterMenu.foes ?? (state.fighters ?? []).filter((entry) => entry.side !== ui.fighterMenu.fighter.side)
      }, handlers) : null
    ].filter(Boolean));
    layer.hidden = !(state.sheets ?? []).length && !ui.rowMenu && !ui.fighterMenu;
  }

  // v0.253.0: the chat stream, and who is speaking. Speaking as follows the
  // selected token in a fight (so the referee voices Thug 2 by clicking it),
  // then whatever was picked, then the referee.
  const log = $('talk-log');
  const wasAtBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
  // During a fight only COMBAT notices show by default: the ship's travel
  // history was burying the round (Kurt's v0.253.0 screenshot).
  log.replaceChildren(...renderTalkLog(state.chat ?? [], {
    showAll: ui.showAllNotices,
    onShowAll: () => { ui.showAllNotices = true; render(); },
    categories: state.fighters?.length || state.setupPhase
      ? (ui.settings.combatMessages === 'verbose' ? ['COMBAT', 'MOVEMENT'] : ['COMBAT'])
      : undefined
  }));
  if (wasAtBottom) log.scrollTop = log.scrollHeight;
  const speakers = [
    { id: '', name: state.seat === 'player' ? (state.character?.name ?? 'Me') : 'Referee' },
    // A token speaks by its combatant id, so a statblock's copies speak as
    // "Thug 2" rather than all as "Thug".
    ...(state.fighters ?? []).map((entry) => ({ id: entry.id, name: entry.name })),
    ...(state.seat === 'player' ? [] : (state.referee?.speakers ?? []))
  ].filter((entry, index, list) => list.findIndex((other) => other.id === entry.id) === index);
  const selectedSpeaker = ui.selectedMarker ? (state.fighters ?? []).find((entry) => entry.id === ui.selectedMarker) : null;
  const speaking = ui.speakerId ?? (selectedSpeaker ? selectedSpeaker.id : '');
  $('talk-speaker').replaceChildren(...speakers.map((entry) => h('option', { value: entry.id, selected: entry.id === speaking, text: entry.name })));

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
// v0.253.0: the talk box finally does something. It never had a handler:
// typing into it on play.html went nowhere.
function say(text) {
  if (source.mode !== 'live' || !String(text).trim()) return;
  const speakerId = $('talk-speaker').value || null;
  const result = source.session.run('chat:say', { fight: { value: text, speakerId } });
  if (!result.ok) window.alert(result.message);
  render();
  const log = $('talk-log');
  log.scrollTop = log.scrollHeight;
}
$('talk-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $('talk-input');
  say(input.value);
  input.value = '';
});
for (const button of document.querySelectorAll('.side-chat .die')) {
  button.addEventListener('click', () => say(`/roll ${button.dataset.roll}`));
}
$('talk-speaker').addEventListener('change', (event) => { ui.speakerId = event.target.value; });
$('side-collapse').addEventListener('click', () => { ui.sidebarCollapsed = !ui.sidebarCollapsed; render(); });
$('settings').addEventListener('click', () => openDrawer('settings'));
// v0.254.0: T targets. Hover an enemy token and press T, and the selected
// combatant's target becomes it — Foundry's gesture, and the old client's.
// The dropdown in the table stays as a fallback. A player's seat only ever
// aims its own character.
document.addEventListener('keydown', (event) => {
  if (event.key !== 't' && event.key !== 'T') return;
  if (event.target.closest?.('input, textarea, select')) return;
  if (source.mode !== 'live' || !ui.hoveredMarker) return;
  const state = viewState();
  const fighters = state.fighters ?? [];
  const attacker = fighters.find((entry) => entry.id === (ui.sheetFocus ?? ui.selectedMarker));
  const target = fighters.find((entry) => entry.id === ui.hoveredMarker);
  if (!attacker || !target || attacker.side === target.side) return;
  if (state.seat === 'player' && attacker.id !== ui.characterId) return;
  const row = (state.sheetRows ?? []).find((entry) => entry.fighter.id === attacker.id);
  event.preventDefault();
  handlers_onSheetChange(attacker.id, { move: row?.move ?? 'Stand', targetId: target.id });
});
function handlers_onSheetChange(id, order) {
  ui.sheet = { ...ui.sheet, [id]: order };
  ui.sheetFocus = id;
  render();
}
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (ui.fighterMenu || ui.rowMenu) { ui.fighterMenu = null; ui.rowMenu = null; render(); return; }
  if (ui.drawer && ui.drawer !== 'referee') { ui.drawer = ui.sidebarTab === 'Chat' ? null : 'referee'; render(); }
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
