// play.js — the play page's shell: which situation, which drawer, chat open
// or shut. Everything drawn comes from play-views.js; everything known comes
// from one view state. Today that state is sample data (play-sample.js).

import { copyDiagnostics } from './diagnostics.js?v=v0.316.5';
import { h, renderAnimalEncounter, renderMastChips, renderNow, renderScene, renderDrawer, renderTalkLog, renderRowMenu, renderFighterMenu, renderSideTabs, sheetRows, chatExportText, renderGearDrop } from './play-views.js?v=v0.316.5';
import { renderSheets, forgetSheetPosition } from './sheets.js?v=v0.316.5';
import { SAMPLE_SITUATIONS, SAMPLE_ORDER, SAMPLE_REFEREE } from './play-sample.js?v=v0.316.5';
import { createDocumentRegistry, DOCUMENT_REGISTRY_STORAGE_KEY } from '../src/document-registry.js?v=v0.316.5';
import { createPlaySession, formatCampaignDate, vectorFromSpeedBearing } from '../src/play-session.js?v=v0.316.5';
import { createTravellerInvite, generateInviteCode } from '../src/character-record.js?v=v0.316.5';
import { importCampaignHome } from '../src/campaign-home.js?v=v0.316.5';
import { createPlayCloud } from './play-cloud.js?v=v0.316.5';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js?v=v0.316.5';
// v0.316.2: whether a button is being held down (see render()).
const press = { held: false, owed: false };

const THEME_KEY = 'graycloak-traveller-theme';
const $ = (id) => document.getElementById(id);
// v0.303.0: the build, under the name, read from this module's own ?v=.
const CLIENT_VERSION = new URL(import.meta.url).searchParams.get('v') ?? '';
queueMicrotask(() => { const node = document.getElementById('mast-version'); if (node) node.textContent = CLIENT_VERSION; });
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
    // v0.298.0: the referee's non-human tick, over the species default.
    if (ui.medicalXeno && Array.isArray(state.sheets)) {
      state.sheets = state.sheets.map((sheet) => (sheet.condition && Object.hasOwn(ui.medicalXeno, sheet.id)
        ? { ...sheet, condition: { ...sheet.condition, nonHuman: ui.medicalXeno[sheet.id] } } : sheet));
    }
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
      const withSetting = { ...state, autoTarget: Boolean(ui.settings.autoTarget), bandsShown: ui.bandsShown, viewSettings: ui.settings, woundDraft: ui.woundDraft ?? null, lastTerrain: ui.lastTerrain ?? state.animals?.surface?.rangeTerrain ?? null };
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
  for (const id of ['mast-time', 'mast-party', 'mast-players']) $(id).hidden = true;
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

// v0.316.2: the click that needed a second try (Kurt, Sep 2026). The page is
// redrawn whole, and it is redrawn by things the user did not just do: a
// cloud save finishing, a chat or seat listener, a field's change event
// firing as it loses focus to the button being pressed. When that redraw
// lands between the button's mousedown and its mouseup, the button pressed
// is gone and a new one stands in its place, and the browser sends the click
// to neither. So while a button is held down, redraws wait; the one owed
// runs after the click has been delivered.
const CLICKABLE = 'button, a[href], summary, select, [role="button"], label, input[type="checkbox"], input[type="radio"]';
document.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || !event.target?.closest?.(CLICKABLE)) return;
  press.held = true;
}, true);
function releasePress() {
  if (!press.held) return;
  press.held = false;
  if (!press.owed) return;
  press.owed = false;
  // After this event's click has been dispatched, not before.
  setTimeout(() => render(), 0);
}
document.addEventListener('pointerup', releasePress, true);
document.addEventListener('pointercancel', releasePress, true);
window.addEventListener('blur', releasePress);

function render() {
  if (press.held) { press.owed = true; return; }
  if (source.mode === 'empty') { renderEmpty(); return; }
  try { syncMultiplayer(); } catch (error) { console.warn('[traveller] multiplayer:', error); }
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
    // v0.275.0: resting is the party's, three days once, whoever is ticked.
    onRest: (id) => { if (source.mode === 'live') openRestDialog(id); },
    // v0.298.0: the referee's override of the non-human tick, per sheet.
    onMedicalXeno: (id, on) => { ui.medicalXeno = { ...(ui.medicalXeno ?? {}), [id]: on }; render(); },
    onMedical: (id, medicId, atHand = {}) => {
      if (source.mode !== 'live') return;
      const result = source.session.run('character:medical', { fight: { id, value: { medicId, kit: Boolean(atHand.kit), facility: Boolean(atHand.facility), xeno: Boolean(atHand.xeno) } } });
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
      let result = source.session.run('fight:place', { fight: { value: { ...data, column: band } } });
      // v0.269.0: an actor (one person) dropped a second time. Offer to make
      // it a statblock, so this and every later drop is a numbered copy.
      if (!result.ok && data.kind !== 'character') {
        const actor = (source.session.resolved.npcActors ?? []).find((entry) => entry.identity.id === data.id);
        if (actor && actor.profile?.kind !== 'statblock' && /already on the board/.test(result.message)
          && window.confirm(`${actor.identity.name} is an actor: one person, already on the board.\n\nMake ${actor.identity.name} a statblock, so each drag places a numbered copy (${actor.identity.name} 2, ${actor.identity.name} 3\u2026) with its own wounds?`)) {
          result = source.session.run('fight:place', { fight: { value: { ...data, column: band, asStatblock: true } } });
        } else if (actor && /already on the board/.test(result.message)) { render(); return; }
      }
      if (!result.ok) window.alert(result.message);
      render();
    },
    // v0.302.0: animal encounters (The Traveller Book pp.90-95).
    onAnimals: (command, value = {}) => {
      if (source.mode !== 'live') return null;
      const result = source.session.run(`animals:${command}`, { fight: { value } });
      if (!result.ok) window.alert(result.message);
      render();
      return result;
    },
    onOpenSurface: () => openSurfaceDialog(),
    // v0.299.0: the reaction throw (Book 3 p.22-23).
    onReaction: (value) => {
      if (source.mode !== 'live') return;
      const result = source.session.run('reaction:throw', { fight: { value } });
      if (!result.ok) window.alert(result.message);
      render();
    },
    onReactionAttack: (value) => {
      if (source.mode !== 'live') return;
      const result = source.session.run('reaction:attack', { fight: { value } });
      if (!result.ok) window.alert(result.message);
      render();
    },
    // v0.272.0: Book 1 p.33's per-side morale settings.
    onMorale: (side, patch) => {
      if (source.mode !== 'live') return;
      const result = source.session.run('fight:morale', { fight: { value: { side, ...patch } } });
      if (!result.ok) window.alert(result.message);
      render();
    },
    // v0.271.0: Book 1 p.27's range for a fight set up by hand.
    onOpeningRange: (choice) => {
      if (source.mode !== 'live') return;
      if (choice.terrain !== undefined) ui.lastTerrain = choice.terrain;
      const result = source.session.run('fight:range', { fight: { value: choice } });
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
      const result = field === 'notes'
        ? source.session.run('character:notes', { fight: { id, value } })
        : source.session.run(`edit:character:${field}`, { fight: { id, value } });
      if (result && !result.ok) window.alert(result.message);
      render();
    },
    // v0.300.0: the sheet's Edit / Done.
    onSheetEdit: (kind, id, on) => {
      ui.openSheets = ui.openSheets.map((entry) => (entry.kind === kind && entry.id === id ? { ...entry, editing: on, compact: false } : entry));
      render();
    },
    onEditRecord: (id, patch) => { if (source.mode === 'live') source.session.run('character:record', { fight: { id, value: patch } }); },
    onInventory: (id, verb, itemId, value) => {
      if (source.mode !== 'live') return;
      const command = itemId ? `inventory:${verb}:${itemId}` : `inventory:${verb}`;
      source.session.run(verb === 'military' ? `inventory:military:${value ?? itemId}` : command, { characterId: id, item: value ?? null });
    },
    // v0.264.0: the Compendium.
    onCompendium: (patch) => { ui.compendium = { ...(ui.compendium ?? {}), ...patch }; render(); },
    onGearDrop: (characterId, key, at) => {
      if (source.mode !== 'live' || !key) return;
      const compendium = source.session.view().compendium;
      const entry = compendium.packs.flatMap((pack) => pack.entries).find((candidate) => candidate.key === key);
      // v0.267.0: an NPC actor's sheet takes a drop too.
      const character = (source.session.resolved.characters ?? []).find((candidate) => candidate.identity.id === characterId)
        ?? (source.session.resolved.npcActors ?? []).find((candidate) => candidate.identity.id === characterId);
      if (!entry || !character) return;
      ui.gearDrop = { entry, characterId, characterName: character.identity.name, cashCr: Number(character.finances?.credits ?? 0), at };
      render();
    },
    onCloseGearDrop: () => { ui.gearDrop = null; render(); },
    onGear: (how, characterId, key, quantity) => {
      if (source.mode !== 'live') return;
      const result = source.session.run(how === 'buy' ? 'gear:buy' : 'gear:give', { fight: { id: characterId, value: { key, quantity: Number(quantity) || 1 } } });
      if (!result.ok) { window.alert(result.message); return; }
      ui.gearDrop = null;
      render();
    },
    // v0.263.0: skills from the sheet, into chat.
    onSkillRoll: (id, skill) => {
      if (source.mode !== 'live') return;
      const result = source.session.run('character:skill-roll', { fight: { id, value: { skill } } });
      if (!result.ok) window.alert(result.message);
      render();
    },
    onSkillInfo: (id, skill) => {
      if (source.mode !== 'live') return;
      const result = source.session.run('character:skill-info', { fight: { id, value: { skill } } });
      if (!result.ok) window.alert(result.message);
      render();
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
    onFolderMenu: (folder, at) => { ui.rowMenu = { folder, at }; render(); },
    // v0.265.0: a folder renamed or removed moves its contents; the tab
    // follows them if that folder was the one open.
    onRenameFolder: (tab, path) => {
      if (source.mode !== 'live') return;
      const parts = path.split('/');
      const wanted = window.prompt('Rename folder to (use / to move it under another):', parts.at(-1));
      if (wanted === null || !wanted.trim()) return;
      const to = wanted.includes('/') ? wanted.trim() : [...parts.slice(0, -1), wanted.trim()].join('/');
      const result = source.session.run('folder:rename', { fight: { value: { tab, from: path, to } } });
      if (!result.ok) window.alert(result.message);
      else if (ui.referee.folder === path) ui.referee = { ...ui.referee, folder: result.folder };
      render();
    },
    onFileUnfiled: (tab) => {
      if (source.mode !== 'live') return;
      const wanted = window.prompt('File everything in Unfiled under (use / for sub-folders):', tab === 'Actors' ? 'NPCs' : '');
      if (wanted === null || !wanted.trim()) return;
      const result = source.session.run('folder:rename', { fight: { value: { tab, from: 'Unfiled', to: wanted.trim() } } });
      if (!result.ok) window.alert(result.message);
      else if (ui.referee.folder === 'Unfiled' || !ui.referee.folder) ui.referee = { ...ui.referee, folder: result.folder };
      render();
    },
    onRemoveFolder: (tab, path) => {
      if (source.mode !== 'live') return;
      if (!window.confirm(`Remove the folder ${path}? Everything in it moves up a level; nothing is deleted.`)) return;
      const result = source.session.run('folder:remove', { fight: { value: { tab, from: path } } });
      if (!result.ok) window.alert(result.message);
      else if (ui.referee.folder === path) ui.referee = { ...ui.referee, folder: result.folder };
      render();
    },
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
      if (source.mode !== 'live' || (kind !== 'actor' && kind !== 'character')) return;
      const result = source.session.run(kind === 'character' ? 'character:copy' : 'actor:copy', { fight: { id } });
      if (!result.ok) window.alert(result.message);
      if (result.ok && result.createdId) ui.openSheets = [...ui.openSheets, { kind: 'actor', id: result.createdId, compact: false }];
      render();
    },
    onDeleteActor: (id, name, kind = 'actor') => {
      if (source.mode !== 'live') return;
      const warning = kind === 'character' ? ' A player seated as this character will have no character until you seat them as another.' : '';
      if (!window.confirm(`Delete ${name}? This cannot be undone.${warning}`)) return;
      const result = source.session.run(kind === 'character' ? 'character:delete' : 'actor:delete', { fight: { id } });
      if (result.ok) ui.openSheets = ui.openSheets.filter((entry) => entry.id !== id);
      else window.alert(result.message);
      render();
    },
    onRenameActor: (id, was, kind = 'actor') => {
      if (source.mode !== 'live') return;
      const name = window.prompt('Rename to:', was === '(unnamed)' ? '' : was ?? '');
      if (name === null || !name.trim()) return;
      const result = source.session.run(kind === 'character' ? 'character:name' : 'edit:actor:name', { fight: { id, value: name.trim() } });
      if (!result.ok) window.alert(result.message);
      render();
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
    onFileActor: (id, folder, kind = 'actor') => {
      if (source.mode !== 'live') return;
      const wanted = window.prompt('File under (use / for sub-folders; leave empty for Unfiled)', folder ?? '');
      if (wanted === null) return;
      const result = source.session.run(kind === 'character' ? 'character:folder' : 'edit:actor:folder', { fight: { id, value: wanted } });
      if (!result.ok) window.alert(result.message);
      render();
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
  // v0.302.0: where the party is on the surface, for the animal checks.
  const out = state.animals?.surface;
  const waiting = state.animals?.pending;
  $('mast-detail').textContent = [state.place.detail, out ? `out in ${out.label.toLowerCase()}` : null, waiting ? 'encounter waiting' : null].filter(Boolean).join(' \u00b7 ');
  // v0.303.0: a Party button, since nobody would guess the world's name was
  // a control (Kurt, Sep 2026). It says where the party is.
  const canSetWhere = source.mode === 'live' && state.seat !== 'player' && Boolean(state.animals?.world);
  const partyButton = $('mast-party');
  partyButton.hidden = !canSetWhere;
  partyButton.textContent = waiting ? 'Party: encounter!' : out ? `Party: out, ${out.label.toLowerCase()}` : 'Party: in port';
  partyButton.classList.toggle('is-alert', Boolean(waiting));
  partyButton.title = 'Where the party is: in port, or out on the surface of this world (animal encounters, The Traveller Book p.100)';
  partyButton.onclick = canSetWhere ? () => openSurfaceDialog() : null;
  // Who is at the campaign now: seats seen in the last few minutes (a
  // player's page touches its seat every five).
  const playing = playersOnline();
  const playersBox = $('mast-players');
  playersBox.hidden = !(source.mode === 'live' && state.seat !== 'player' && ui.players);
  playersBox.replaceChildren(...(playing.length
    ? [h('span', { text: 'Playing: ' }), ...playing.flatMap((entry, index) => [index ? ', ' : '', h('b', { text: entry })])]
    : [h('span', { text: 'No players on' })]));
  playersBox.title = 'Players whose page has been open in the last few minutes';
  $('mast-date').textContent = state.campaign.date;
  // v0.275.0: the referee's clock is behind the date.
  const dateBox = $('mast-date').parentElement;
  const canSetTime = source.mode === 'live' && state.seat !== 'player';
  dateBox.classList.toggle('is-control', canSetTime);
  dateBox.title = canSetTime ? 'Campaign date: click to pass time or correct the date' : 'Campaign date';
  dateBox.onclick = canSetTime ? () => openTimeDialog() : null;
  // v0.303.0: and a button that says what it does.
  $('mast-time').hidden = !canSetTime;
  $('mast-time').onclick = canSetTime ? () => openTimeDialog() : null;
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
  // v0.264.0: the Compendium tab is drawn by the page, not the referee
  // directory, but it is a tab like the others.
  const tabDrawer = (drawer) => drawer === 'referee' || drawer === 'compendium';
  $('side-tabs').replaceChildren(...renderSideTabs(ui.drawer && !tabDrawer(ui.drawer) ? null : ui.sidebarTab, {
    players: (state.referee?.presence ?? []).length,
    onTab: (tab) => {
      ui.sidebarTab = tab;
      ui.drawer = tab === 'Chat' ? null : tab === 'Compendium' ? 'compendium' : 'referee';
      if (tab !== 'Chat' && tab !== 'Compendium') ui.referee = { ...ui.referee, tab, folder: '' };
      ui.sidebarCollapsed = false;
      render();
    }
  }));
  const panel = ui.drawer && !tabDrawer(ui.drawer) ? ui.drawer : null;
  const chatShowing = !panel && ui.sidebarTab === 'Chat';
  $('side-chat').hidden = !chatShowing;
  $('drawer-body').hidden = chatShowing;
  if (!chatShowing) {
    const kind = panel ?? (ui.drawer === 'compendium' ? 'compendium' : 'referee');
    const body = renderDrawer(kind, {
      ...state,
      viewSettings: ui.settings,
      compendiumUi: ui.compendium,
      compendiumCharacters: (source.session?.resolved?.characters ?? []).filter((entry) => entry.status?.alive !== false && String(entry.identity.name ?? '').trim()).map((entry) => ({ id: entry.identity.id, name: entry.identity.name }))
    }, state.referee ?? SAMPLE_REFEREE, {
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
      ui.gearDrop ? renderGearDrop(ui.gearDrop, handlers) : null,
      ui.fighterMenu ? renderFighterMenu({
        ...ui.fighterMenu,
        round: state.round ?? 1,
        referee: state.seat !== 'player',
        setup: Boolean(state.setupPhase),
        foes: ui.fighterMenu.foes ?? (state.fighters ?? []).filter((entry) => entry.side !== ui.fighterMenu.fighter.side)
      }, handlers) : null
    ].filter(Boolean));
    layer.hidden = !(state.sheets ?? []).length && !ui.rowMenu && !ui.fighterMenu && !ui.gearDrop;
  }

  // v0.253.0: the chat stream, and who is speaking. Speaking as follows the
  // selected token in a fight (so the referee voices Thug 2 by clicking it),
  // then whatever was picked, then the referee.
  const log = $('talk-log');
  const wasAtBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
  // During a fight only COMBAT notices show by default: the ship's travel
  // history was burying the round (Kurt's v0.253.0 screenshot).
  if (ui.chatClearedAt === undefined) {
    ui.chatClearedAt = loadChatCleared();
    // A Clear remembered before v0.281.0 may be a bare number of
    // milliseconds, which hides nothing; read it as the time it was.
    if (ui.chatClearedAt && /^\d+$/.test(ui.chatClearedAt)) ui.chatClearedAt = new Date(Number(ui.chatClearedAt)).toISOString();
  }
  log.replaceChildren(...renderTalkLog(state.chat ?? [], {
    clearedAt: ui.chatClearedAt,
    onUnclear: () => {
      ui.chatClearedAt = null;
      try { localStorage.removeItem(chatClearKey()); } catch { /* nothing kept */ }
      render();
    },
    showAll: ui.showAllNotices,
    onShowAll: () => { ui.showAllNotices = true; render(); },
    categories: state.fighters?.length || state.setupPhase
      ? (ui.settings.combatMessages === 'verbose' ? ['COMBAT', 'MOVEMENT', 'ENCOUNTER'] : ['COMBAT', 'ENCOUNTER'])
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
// v0.262.0: the input is a text area now. Enter sends, as it did; Shift+Enter
// starts a new line.
$('talk-input').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  $('talk-form').requestSubmit();
});
// v0.262.0: Clear hides the chat so far, on this screen; the log is the
// campaign's record and is never deleted. Kept per campaign in this browser.
function chatClearKey() {
  return `graycloak-traveller-chat-cleared:${source.session?.resolved?.campaign?.identity?.id ?? 'sample'}`;
}
function loadChatCleared() {
  try { return localStorage.getItem(chatClearKey()) || null; } catch { return null; }
}
$('talk-clear').addEventListener('click', () => {
  const chat = viewState().chat ?? [];
  // v0.281.0: the latest time on screen, as an ISO string (see mergedChat).
  const last = chat.map((entry) => Date.parse(entry.at ?? '')).filter(Number.isFinite).reduce((most, time) => Math.max(most, time), 0);
  if (!last) return;
  ui.chatClearedAt = new Date(last).toISOString();
  // v0.282.0: and the players' chat, through the campaign.
  if (source.mode === 'live') source.session.run('chat:clear', { fight: { value: ui.chatClearedAt } });
  try { localStorage.setItem(chatClearKey(), last); } catch { /* private mode: cleared for this session */ }
  render();
});
$('talk-export').addEventListener('click', () => {
  if (source.mode !== 'live') return;
  const transcript = source.session.chatTranscript({ seat: 'referee' });
  const blob = new Blob([chatExportText(transcript)], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  const slug = String(transcript.campaignName || 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  link.href = URL.createObjectURL(blob);
  link.download = `${slug}-chat-${transcript.date.replace(/[^0-9a-z-]+/gi, '-')}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
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
  if (ui.fighterMenu || ui.rowMenu || ui.gearDrop) { ui.fighterMenu = null; ui.rowMenu = null; ui.gearDrop = null; render(); return; }
  if (ui.drawer && ui.drawer !== 'referee' && ui.drawer !== 'compendium') { ui.drawer = ui.sidebarTab === 'Chat' ? null : ui.sidebarTab === 'Compendium' ? 'compendium' : 'referee'; render(); }
});

// index.html autosaves into the same registry from another tab; follow it.
window.addEventListener('storage', (event) => {
  if (source.mode !== 'live' || (event.key && event.key !== DOCUMENT_REGISTRY_STORAGE_KEY)) return;
  source.session.reload();
  render();
});

// v0.276.0: the multiplayer channels. Chat is watched for the campaign while
// signed in; a fight's declarations and wound answers are watched while that
// fight is live, and re-aimed when it changes. Called after every render, so
// it only acts when what should be watched has changed.
const watching = { chatFor: null, chatStop: null, fightFor: null, fightStops: [], joinsFor: null, joinsStop: null };

// v0.291.0: players joining by link, watched whenever this page has a live
// campaign and a signed-in referee. It was watched only if both were true the
// moment the page started, so a referee whose sign-in arrived a beat later
// (the usual case) never saw a join, and the player sat in the campaign with
// no character on this side (Kurt, Sep 2026). A join is brought in at once
// unless the referee approves players; one that fails is tried again on the
// next change instead of being forgotten.
function onJoins(joins) {
  console.info('[traveller] joins for', source.session.resolved.campaign.identity.id, ':', joins.map((join) => `${join.name ?? join.uid} with ${join.characterName ?? join.characterId}`));
  ui.players = { seats: [], invites: [], ...(ui.players ?? {}), joins };
  // v0.292.0: the seats and links, read fresh — a join changes them, and the
  // Players tab showed empty lists made up here until someone reopened it.
  refreshPlayers();
  if (!source.session.resolved.campaign.roster?.approvePlayers) {
    for (const join of joins) {
      if (autoAdmitted.has(join.uid)) continue;
      autoAdmitted.add(join.uid);
      console.info('[traveller] bringing in', join.characterName ?? join.characterId, 'for', join.name ?? join.uid);
      runSeat('admit', { kind: 'join', uid: join.uid, characterId: join.characterId ?? null, name: join.name ?? null })
        .then((ok) => { if (ok === false) autoAdmitted.delete(join.uid); });
    }
  }
  if (ui.drawer === 'referee' && ui.referee.tab === 'Players') render();
}
function syncMultiplayer() {
  const live = source?.mode === 'live' && cloud.userId();
  const campaignId = live ? source.session.resolved.campaign.identity.id : null;
  if (watching.chatFor !== campaignId) {
    watching.chatStop?.(); watching.chatStop = null;
    watching.chatFor = campaignId;
    if (campaignId) {
      cloud.watchChat(campaignId, (messages) => { source.session.setCloudChat(messages); })
        .then((stop) => { if (watching.chatFor === campaignId) watching.chatStop = stop; else stop(); })
        .catch((error) => console.warn('[traveller] chat:', error));
    }
  }
  if (watching.joinsFor !== campaignId) {
    watching.joinsStop?.(); watching.joinsStop = null;
    watching.joinsFor = campaignId;
    if (campaignId) {
      // v0.292.0: the Players tab's lists read once the campaign is live and
      // signed in, not only when the tab is clicked.
      refreshPlayers();
      Promise.resolve(cloud.watchJoins(campaignId, onJoins))
        .then((stop) => { if (watching.joinsFor === campaignId) watching.joinsStop = typeof stop === 'function' ? stop : null; else stop?.(); })
        .catch((error) => console.warn('[traveller] joins:', error));
    }
  }
  const fight = live ? (source.session.resolved.encounters ?? []).find((entry) => entry.status === 'active') ?? null : null;
  const fightKey = fight ? `${campaignId}|${fight.identity.id}` : null;
  if (watching.fightFor === fightKey) return;
  for (const stop of watching.fightStops) stop?.();
  watching.fightStops = [];
  watching.fightFor = fightKey;
  if (!fight) return;
  const keep = (promise) => promise
    .then((stop) => { if (watching.fightFor === fightKey) watching.fightStops.push(stop); else stop(); })
    .catch((error) => console.warn('[traveller] fight channel:', error));
  keep(cloud.watchDeclarations(campaignId, fight.identity.id, (entries) => { source.session.applyPlayerDeclarations(entries); }));
  keep(cloud.watchWoundAllocations(campaignId, fight.identity.id, (entries) => { source.session.applyPlayerWoundAllocations(entries); },
    (error) => console.warn('[traveller] wound answers refused (Firestore rules v17 deployed?):', error?.code ?? error)));
}

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

const autoAdmitted = new Set();
// v0.293.0: wait until the campaign has actually reached the cloud.
async function flushSave() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const revision = await source.session.saveToCloud();
    if (typeof revision === 'number') return revision;
    const state = source.session.view().save?.state;
    if (state === 'stale') throw new Error('This page is behind the cloud copy of the campaign; reload it, and the player\u2019s character will be brought in again.');
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error('The campaign could not be saved to the cloud; the player\u2019s character will be brought in on the next try.');
}
async function runSeat(action, seat) {
  if (source.mode !== 'live') return;
  const campaignId = source.session.resolved.campaign.identity.id;
  try {
    if (action === 'invite') {
      const invite = createTravellerInvite({
        code: generateInviteCode(), ownerUid: cloud.userId(),
        campaignId, campaignName: source.session.resolved.campaign.identity.name ?? null,
        approval: Boolean(source.session.resolved.campaign.roster?.approvePlayers), refereeName: cloud.account?.()?.displayName || cloud.account?.()?.email || null
      });
      await cloud.createInvite(invite);
      // v0.284.0: a link the player opens, not a code they type.
      const url = new URL('enter.html', window.location.href);
      url.search = `?join=${encodeURIComponent(invite.code)}`;
      let copied = false;
      try { await navigator.clipboard.writeText(url.toString()); copied = true; } catch { copied = false; }
      window.prompt(`${copied ? 'Copied. ' : ''}Send this join link to your players. It stays open until revoked.`, url.toString());
    } else if (action === 'copy-link' || action === 'reset-link') {
      // v0.285.0: the campaign's one join link, copied; or a fresh one, the
      // old ones revoked (Roll20 changes its link on a kick for the same
      // reason: whoever held it can no longer use it).
      let code = seat.code ?? null;
      if (action === 'reset-link') {
        if (code && !window.confirm('Make a new join link? The current one stops working.')) return;
        for (const invite of await cloud.listInvites(campaignId)) await cloud.revokeInvite(invite.code);
        const invite = createTravellerInvite({ code: generateInviteCode(), ownerUid: cloud.userId(), campaignId, campaignName: source.session.resolved.campaign.identity.name ?? null,
          approval: Boolean(source.session.resolved.campaign.roster?.approvePlayers), refereeName: cloud.account?.()?.displayName || cloud.account?.()?.email || null });
        await cloud.createInvite(invite);
        code = invite.code;
      }
      const url = new URL('enter.html', window.location.href);
      url.search = `?join=${encodeURIComponent(code)}`;
      let copied = false;
      try { await navigator.clipboard.writeText(url.toString()); copied = true; } catch { copied = false; }
      window.prompt(`${copied ? 'Copied. ' : ''}The join link for your players:`, url.toString());
    } else if (action === 'diagnostics') {
      // v0.294.0: what this page knows, for pasting to Claude.
      const resolved = source.session.resolved;
      const copied = await copyDiagnostics({
        script: document.querySelector('script[src*="play.js"]')?.getAttribute('src') ?? null,
        uid: cloud.userId(), account: cloud.account?.()?.email ?? null,
        campaignId, campaignName: resolved.campaign.identity.name,
        save: source.session.view().save ?? null,
        approvePlayers: Boolean(resolved.campaign.roster?.approvePlayers),
        ownership: resolved.campaign.ownership ?? null,
        party: resolved.campaign.party?.characterIds ?? [],
        characters: (resolved.characters ?? []).map((entry) => ({ id: entry.identity.id, name: entry.identity.name })),
        players: {
          seats: (ui.players?.seats ?? []).map((entry) => ({ uid: entry.uid, name: entry.name ?? null, code: entry.code ?? null, seatedAt: entry.seatedAt ?? null, lastSeenAt: entry.lastSeenAt ?? null })),
          invites: (ui.players?.invites ?? []).map((entry) => ({ code: entry.code, approval: entry.approval ?? null })),
          joins: (ui.players?.joins ?? []).map((entry) => ({ uid: entry.uid, name: entry.name ?? null, characterId: entry.characterId ?? null, characterName: entry.characterName ?? null, code: entry.code ?? null, requestedAt: entry.requestedAt ?? null })),
          error: ui.players?.error ?? null
        },
        broughtInThisVisit: [...autoAdmitted],
        watchingJoinsFor: watching.joinsFor
      });
      window.alert(copied ? 'Diagnostics copied. Paste them into the chat with Claude.' : 'Copy the text shown, then paste it into the chat with Claude.');
      return;
    } else if (action === 'refresh') {
      // v0.292.0: nothing to do but read again (below).
    } else if (action === 'approve-setting') {
      // v0.289.0: the setting, and every open link told of it (rules v20
      // seat a link's holder at once only when it does not ask approval).
      const on = Boolean(seat);
      source.session.run('players:approve', { fight: { value: on } });
      for (const invite of await cloud.listInvites(campaignId)) await cloud.createInvite({ ...invite, approval: on });
    } else if (action === 'remove') {
      // v0.285.0: Remove — seat, log and party place go; the character goes
      // home with its sheet; the referee may keep a copy.
      const names = seat.characters.map((entry) => entry.name).join(', ') || 'no character';
      if (seat.characters.some((entry) => entry.fighting)) throw new Error(`${names} is in a fight; remove them when it ends`);
      if (!window.confirm(`Remove ${seat.name} from the campaign?\n\n${names} goes home with everything that happened here.`)) return;
      const keepCopy = seat.characters.length ? window.confirm(`Keep a copy of ${names} in Actors as your own?\n\nOK keeps a copy; Cancel lets them go entirely.`) : false;
      await source.session.saveToCloud();
      for (const entry of seat.characters) {
        const released = source.session.run('character:release', { fight: { id: entry.id, value: { keepCopy } } });
        if (!released.ok) throw new Error(released.message);
        await cloud.placeCharacter(entry.id, { kind: 'unassigned', campaignId: null, campaignName: null, since: null }).catch((error) => console.warn('[traveller] return character:', error));
      }
      await cloud.releaseSeat(campaignId, seat.uid);
    } else if (action === 'release') {
      const released = source.session.run('character:release', { fight: { id: seat.id, value: { keepCopy: Boolean(seat.keepCopy) } } });
      if (!released.ok) throw new Error(released.message);
    } else if (action === 'revoke') {
      if (!window.confirm(`Revoke invite ${seat.code}? Anyone still holding it will not be able to join.`)) return;
      await cloud.revokeInvite(seat.code);
    } else if (action === 'admit') {
      // v0.274.0: all of seating, in the referee client's order: the
      // character into the campaign as theirs, the seat, their record's
      // world, then the request cleared. Admit used to do only the seat.
      const join = (ui.players?.joins ?? []).find((entry) => entry.uid === seat.uid);
      if (!join?.character) throw new Error('that request no longer carries a character; ask the player to request again');
      const added = source.session.run('character:admit', { fight: { value: { character: join.character, ownerUid: join.uid, playerName: join.name ?? null } } });
      if (!added.ok) throw new Error(added.message);
      await cloud.seat(campaignId, seat.uid, join.name ?? seat.name ?? null);
      await cloud.placeCharacter(join.characterId, {
        kind: 'campaign', campaignId, campaignName: source.session.resolved.campaign.identity.name ?? null, since: Date.now()
      }).catch((error) => console.warn('[traveller] record world:', error?.code ?? error));
      // v0.293.0: the join note goes only once the campaign, with the
      // character in it, is safely saved. It was cleared first, so a save
      // that failed or was overtaken lost the character with nothing left to
      // bring it in again (Kurt's kurt/Nico, Sep 2026).
      await flushSave();
      await cloud.dismissJoin(campaignId, seat.uid);
    } else if (action === 'decline') {
      await cloud.dismissJoin(campaignId, seat.uid);
    } else if (action === 'unseat') {
      if (!window.confirm('Take back this seat? Their character sheet and log go with it.')) return;
      await cloud.unseat(campaignId, seat.uid);
    }
    await refreshPlayers();
    return true;
  } catch (error) {
    console.error('[traveller] players:', action, error);
    ui.players = { ...(ui.players ?? { seats: [], invites: [], joins: [] }), loading: false, error: cloud.describeError(error) };
    render();
    return false;
  }
}

// v0.275.0: the Rest and Time dialogs. Built on demand into one <dialog>, in
// the sign-in dialog's own style.
function modal(title, body, { onSubmit, submitLabel }) {
  let dialog = document.getElementById('play-modal');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'play-modal';
    dialog.className = 'signin';
    document.body.append(dialog);
  }
  const status = h('p', { class: 'signin-status', role: 'status' });
  const form = h('form', { class: 'signin-form', method: 'dialog' },
    h('header', {}, h('h2', { text: title }), h('button', { class: 'drawer-close', type: 'button', text: 'Close', onclick: () => dialog.close() })),
    body, status,
    h('div', { class: 'lead-actions' }, h('button', { class: 'button is-primary', type: 'submit' }, h('span', { text: submitLabel }))));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const problem = onSubmit(form);
    if (problem) { status.className = 'signin-status is-error'; status.textContent = problem; return; }
    dialog.close();
    render();
  });
  dialog.replaceChildren(form);
  if (!dialog.open) dialog.showModal();
}

function openRestDialog(preselectId = null) {
  const candidates = source.session.restCandidates();
  if (!candidates.length) { window.alert('Nobody is wounded.'); return; }
  const rows = candidates.map((entry) => h('label', { class: 'check', title: entry.why ?? '' },
    h('input', { type: 'checkbox', name: 'rest', value: entry.id, disabled: !entry.canRest, checked: entry.canRest && (entry.inParty || entry.id === preselectId) }),
    ` ${entry.name}${entry.kind === 'actor' ? ' (NPC)' : entry.inParty ? '' : ' (not in the party)'}${entry.why ? ` \u2014 ${entry.why}` : ''}`));
  modal('Rest three days', [
    h('p', { class: 'signin-why', text: 'Book 1 p.31: three days of rest bring the wounded back to full strength. Everyone ticked rests together; the date moves three days once.' }),
    ...rows
  ], {
    submitLabel: 'Rest three days',
    onSubmit: (form) => {
      const ids = [...form.querySelectorAll('input[name="rest"]:checked')].map((input) => input.value);
      if (!ids.length) return 'Tick who rests.';
      const result = source.session.run('party:rest', { fight: { value: { ids } } });
      return result.ok ? null : result.message;
    }
  });
}

function openTimeDialog() {
  const time = source.session.resolved.campaign.time;
  const amount = h('input', { type: 'number', name: 'amount', min: '1', value: '1', 'aria-label': 'How many' });
  const unit = h('select', { name: 'unit', 'aria-label': 'Hours, days or weeks' }, ['hours', 'days', 'weeks'].map((value) => h('option', { value, selected: value === 'days', text: value })));
  const reason = h('input', { type: 'text', name: 'reason', placeholder: 'why, for the log (optional)', 'aria-label': 'Reason' });
  const resting = h('input', { type: 'checkbox', name: 'resting' });
  const day = h('input', { type: 'number', name: 'day', min: '1', max: '365', value: String(time.dayOfYear), 'aria-label': 'Day of the year' });
  const year = h('input', { type: 'number', name: 'year', min: '0', value: String(time.year), 'aria-label': 'Year' });
  const mode = { value: 'pass' };
  const passBox = h('fieldset', { class: 'time-box' }, h('legend', { text: 'Pass time' }),
    h('div', { class: 'time-row' }, amount, unit), reason,
    h('label', { class: 'check' }, resting, ' Resting: the wounded who can rest recover, if three days or more pass'));
  const setBox = h('fieldset', { class: 'time-box' }, h('legend', { text: 'Or set the date (a correction)' }),
    h('div', { class: 'time-row' }, 'Day ', day, ' Year ', year),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'setting', onchange: (event) => { mode.value = event.currentTarget.checked ? 'set' : 'pass'; } }), ' Set the date instead of passing time'));
  modal(`Campaign date ${String(time.dayOfYear).padStart(3, '0')}-${time.year}`, [passBox, setBox], {
    submitLabel: 'Apply',
    onSubmit: () => {
      const result = mode.value === 'set'
        ? source.session.run('time:set', { fight: { value: { year: Number(year.value), dayOfYear: Number(day.value) } } })
        : source.session.run('time:pass', { fight: { value: { amount: Number(amount.value), unit: unit.value, reason: reason.value, resting: resting.checked } } });
      return result.ok ? null : result.message;
    }
  });
}

const ONLINE_WINDOW_MS = 7 * 60000;
function playersOnline() {
  const seats = ui.players?.seats ?? [];
  const campaign = source.session?.resolved?.campaign;
  const owners = campaign?.ownership?.actors ?? {};
  const characters = source.session?.resolved?.characters ?? [];
  const me = cloud.userId();
  const now = Date.now();
  const seen = (value) => (typeof value === 'number' ? value : typeof value?.toMillis === 'function' ? value.toMillis() : Number(value) || 0);
  return seats
    .filter((seat) => seat.uid !== me && now - seen(seat.lastSeenAt) < ONLINE_WINDOW_MS)
    .map((seat) => {
      const names = Object.entries(owners).filter(([, uid]) => uid === seat.uid)
        .map(([id]) => characters.find((entry) => entry.identity.id === id)?.identity.name).filter(Boolean);
      return `${seat.name || 'a player'}${names.length ? ` (${names.join(', ')})` : ''}`;
    });
}
// Re-read the seats now and then, quietly, so the masthead's list keeps up.
setInterval(() => {
  if (source.mode === 'live' && cloud.userId() && document.visibilityState === 'visible') refreshPlayersQuietly();
}, 2 * 60000);
async function refreshPlayersQuietly() {
  try {
    const seats = await cloud.listSeats(source.session.resolved.campaign.identity.id);
    ui.players = { invites: [], joins: [], ...(ui.players ?? {}), seats };
    render();
  } catch (error) { console.warn('[traveller] seats:', error?.code ?? error); }
}

// v0.302.0: where the party is. In port there are no animal checks; out on
// the surface of this world, in one terrain, the clock throws two a day (The
// Traveller Book p.100) and stops at the first encounter. The encounter it
// turns up is dealt with here too.
function openSurfaceDialog() {
  const animals = source.session.view().animals;
  if (!animals?.world) { window.alert('The party is not at a world.'); return; }
  const close = () => document.getElementById('play-modal')?.close();
  const run = (command, value) => {
    const result = source.session.run(`animals:${command}`, { fight: { value } });
    if (!result.ok) { window.alert(result.message); return null; }
    render();
    return result;
  };
  const again = (command, value) => { if (run(command, value)) { close(); openSurfaceDialog(); } };
  const tableFor = (terrain) => animals.tables.find((table) => table.terrain === terrain) ?? null;

  // --- Party: where it is, and the check. ------------------------------
  const where = h('select', { name: 'terrain', 'aria-label': 'Where the party is' },
    h('option', { value: '', selected: !animals.surface, text: 'In port or town (no animal checks)' }),
    animals.terrains.map((entry) => h('option', { value: entry.key, selected: animals.surface?.terrain === entry.key, text: `Out: ${entry.name}${tableFor(entry.key) ? '' : ' (no table yet)'}` })));
  const format = h('select', { name: 'format', 'aria-label': 'Size of the new table' },
    h('option', { value: '2D', text: '2D, 11 rows: terrain used often' }),
    h('option', { value: '1D', text: '1D, 6 rows: terrain not worth the detail' }));
  const formatRow = h('label', { class: 'surface-row' }, h('span', { text: 'New table' }), format);
  const syncFormat = () => { formatRow.hidden = !where.value || Boolean(tableFor(where.value)); };
  where.onchange = syncFormat;
  syncFormat();
  const set = h('button', { type: 'button', class: 'button is-small is-primary', text: 'Set', onclick: () => {
    if ((where.value || null) === (animals.surface?.terrain ?? null)) return;
    again('surface', { terrain: where.value || null, format: format.value });
  } });
  const guide = h('input', { type: 'number', value: '0', min: '-6', max: '6', 'aria-label': 'DM on the check', style: 'width:56px' });
  const partyBox = h('fieldset', { class: 'time-box' }, h('legend', { text: 'Party' }),
    // v0.308.0: one line, the rest in its tooltip.
    h('p', { class: 'surface-intro', title: 'Out on the surface, animals are checked twice a day as time passes, 5+ on 1D; the clock stops at the first encounter (The Traveller Book pp.91, 100).', text: `${animals.world.name} (${animals.world.upp}) \u00b7 animals twice a day, 5+ (pp.91, 100)` }),
    animals.airless ? h('p', { class: 'signin-status is-error', text: 'An airless world: these almost never have any life of consequence (p.92). Your call.' }) : null,
    h('div', { class: 'surface-row' }, where, set),
    formatRow,
    animals.surface ? h('div', { class: 'surface-row' },
      h('button', { type: 'button', class: 'button is-small', text: 'Check now', title: 'One throw: 5+ on 1D', onclick: () => again('check', { dm: Number(guide.value) || 0 }) }),
      h('label', { class: 'surface-inline', title: 'A guide hunting a specific animal: +2 or more (p.92)' }, 'DM ', guide),
      h('button', { type: 'button', class: 'button is-small', text: 'Open the table', title: 'Every table for this world is in the Journal', onclick: () => {
        close();
        if (!ui.openSheets.some((entry) => entry.kind === 'animals' && entry.id === animals.surface.key)) ui.openSheets = [...ui.openSheets, { kind: 'animals', id: animals.surface.key, compact: true }];
        render();
      } })) : null,
    // v0.307.0: who went out. Put on the board, surprise and "if more" use
    // these; the rest stay in port.
    animals.roster?.length ? h('div', { class: 'surface-with' },
      h('span', { class: 'surface-with-label', text: 'With the party:' }),
      animals.roster.map((entry) => h('label', { class: 'surface-check' },
        h('input', { type: 'checkbox', checked: entry.with, disabled: !entry.alive, onchange: (event) => {
          const ids = animals.roster.filter((other) => (other.id === entry.id ? event.currentTarget.checked : other.with)).map((other) => other.id);
          if (!ids.length) { event.currentTarget.checked = true; window.alert('At least one character must be out with the party.'); return; }
          again('with', { ids });
        } }),
        ` ${entry.name}${entry.alive ? '' : ' (dead)'}`))) : null);

  const parts = [partyBox];

  // --- Encounter: shared with the setup board (play-views.js). ----------
  if (animals.pending) parts.push(renderAnimalEncounter(animals, (command, value) => {
    if (command === 'place') { if (run(command, value)) close(); return; }
    again(command, value);
  }));
  modal('Where is the party?', parts, { submitLabel: 'Done', onSubmit: () => null });
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
