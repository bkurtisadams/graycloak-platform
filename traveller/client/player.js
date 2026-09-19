// player.js — the player's view of a campaign.
//
// A player reads two published documents: the campaign, which
// says who they play and which scene is current, and that scene's player-safe
// view. The encounter document itself is referee-only and this never asks for
// it; nor can it list encounters, which is why the campaign carries
// currentEncounterId.
//
// v0.65.0: it also reads two documents published to this account alone —
// each character it plays, in full, and a log filtered to table knowledge —
// under players/{uid}/…, which the rules let only that account and the
// referee read.
//
// The only write is a create-only combat declaration for an assigned character.

import { initAuth, onAuthChange, signOutOfTraveller, currentUserId, authStatus } from './auth.js?v=v0.227.1';
import { openSignInDialog } from './signin-ui.js?v=v0.227.1';
import {
  ensureFirestore, writeDeclaration, watchDeclarations, writeTokenMove,
  writeCanvasPresence, watchCanvasPresence, sendChatMessage, watchChat,
  writeWoundAllocation } from './publish.js?v=v0.227.1';
import { createPlayerDeclaration } from '../src/player-declaration.js?v=v0.227.1';
import { createPlayerWoundAllocation } from '../src/player-wound-allocation.js?v=v0.227.1';
import { woundPromptFrom, initialWoundDraft, previewWoundDraft, renderWoundGroups, renderWoundPreview, woundHitLine } from './wound-dialog.js?v=v0.227.1';
import { deriveDeclaration, declarationSummary, rangeLabel, signed as signedDM, woundFormula } from './combat-view.js?v=v0.227.1';
import { createPlayerTokenMove } from '../src/player-token-movement.js?v=v0.227.1';
import { serviceName, nobleTitleLabel, buildServiceHistory, buildGenerationLog } from './ui-model.js?v=v0.227.1';
import { PERSONAL_WEAPONS, SUBSECTOR_COLUMNS, SUBSECTOR_ROWS, getSubsectorSystem } from '../vendor/classic-traveller-rules/index.js?v=v0.227.1';
import { renderSubsectorMap } from './subsector-svg.js?v=v0.227.1';
import { createSceneCanvas, svgNode } from './scene-canvas.js?v=v0.227.1';
import { renderVectorSceneStage } from './ship-vector-map.js?v=v0.227.1';
import { publishedVectorSceneDocument } from '../src/published-view.js?v=v0.227.1';
import { TRAY_DICE, rollFormula, formatRoll, createChatMessage, interpretChatInput, parseRollFormula } from '../src/dice-tray.js?v=v0.227.1';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js?v=v0.227.1';

const SVG_NS = 'http://www.w3.org/2000/svg';

const el = {
  account: document.querySelector('#player-account'),
  accountButton: document.querySelector('#player-account-button'),
  campaignField: document.querySelector('#player-campaign-id'),
  connect: document.querySelector('#player-connect'),
  status: document.querySelector('#player-status'),
  campaignName: document.querySelector('#player-campaign-name'),
  clock: document.querySelector('#player-clock'),
  yours: document.querySelector('#player-yours'),
  scene: document.querySelector('#player-scene'),
  world: document.querySelector('#player-world'),
  worldPort: document.querySelector('#player-world-port'),
  worldShip: document.querySelector('#player-world-ship'),
  worldFuel: document.querySelector('#player-world-fuel'),
  worldHold: document.querySelector('#player-world-hold'),
  worldMap: document.querySelector('#player-world-map'),
  lastFight: document.querySelector('#player-last-fight'),
  lastFightLabel: document.querySelector('#player-last-fight-label'),
  showBoard: document.querySelector('#player-show-board'),
  stagedScene: document.querySelector('#player-staged-scene'),
  stagedSceneLabel: document.querySelector('#player-staged-scene-label'),
  showScene: document.querySelector('#player-show-scene'),
  sceneToWorld: document.querySelector('#player-scene-to-world'),
  backToWorld: document.querySelector('#player-back-to-world'),
  mapTools: document.querySelector('.player-map-tools'),
  mapViewport: document.querySelector('#player-map-viewport'),
  map: document.querySelector('#player-map'),
  vectorStage: document.querySelector('#player-vector-stage'),
  mapTools: document.querySelector('.player-map-tools'),
  mapMenu: document.querySelector('#player-token-menu'),
  zoomOut: document.querySelector('#player-zoom-out'),
  zoomIn: document.querySelector('#player-zoom-in'),
  zoomFit: document.querySelector('#player-zoom-fit'),
  zoomLabel: document.querySelector('#player-zoom-label'),
  movePace: document.querySelector('#player-move-pace'),
  roster: document.querySelector('#player-roster'),
  narration: document.querySelector('#player-narration'),
  orders: document.querySelector('#player-orders'),
  woundDialog: document.querySelector('#wound-allocation-dialog'),
  woundForm: document.querySelector('#wound-allocation-form'),
  woundTitle: document.querySelector('#wound-allocation-title'),
  woundRemaining: document.querySelector('#wound-allocation-remaining'),
  woundHit: document.querySelector('#wound-allocation-hit'),
  woundGroups: document.querySelector('#wound-allocation-groups'),
  woundPreview: document.querySelector('#wound-allocation-preview'),
  woundError: document.querySelector('#wound-allocation-error'),
  woundApply: document.querySelector('#wound-allocation-apply'),
  woundDefault: document.querySelector('#wound-allocation-default'),
  stage: document.querySelector('#player-stage'),
  tabCharacter: document.querySelector('#player-tab-character'),
  tabScene: document.querySelector('#player-tab-scene'),
  characterPicker: document.querySelector('#player-character-picker'),
  characterEmpty: document.querySelector('#player-character-empty'),
  sheet: document.querySelector('#player-sheet'),
  sheetName: document.querySelector('#player-sheet-name'),
  sheetDate: document.querySelector('#player-sheet-date'),
  sheetUpp: document.querySelector('#player-sheet-upp'),
  sheetRank: document.querySelector('#player-sheet-rank'),
  sheetAge: document.querySelector('#player-sheet-age'),
  sheetWorld: document.querySelector('#player-sheet-world'),
  sheetCharacteristics: document.querySelector('#player-sheet-characteristics'),
  sheetHealthStatus: document.querySelector('#player-sheet-health-status'),
  sheetService: document.querySelector('#player-sheet-service'),
  sheetLoadout: document.querySelector('#player-sheet-loadout'),
  sheetEquipment: document.querySelector('#player-sheet-equipment'),
  sheetSkills: document.querySelector('#player-sheet-skills'),
  sheetBenefits: document.querySelector('#player-sheet-benefits'),
  sheetHistoryRecord: document.querySelector('#player-sheet-history-record'),
  sheetNotes: document.querySelector('#player-sheet-notes'),
  log: document.querySelector('#player-log'),
  chatComposer: document.querySelector('#player-chat-composer'),
  chatForm: document.querySelector('#player-chat-form'),
  chatInput: document.querySelector('#player-chat-input'),
  diceTray: document.querySelector('#player-dice-tray')
};

const CAMPAIGN_STORAGE_KEY = 'graycloak.traveller.player.campaign.v1';

let campaign = null;
let view = null;
let unsubscribeCampaign = null;
let unsubscribeView = null;
let watchedEncounterId = null;
let declarations = [];
let unsubscribeDeclarations = null;
// Named apart from the `campaignId` parameters below: a shadowed assignment
// left this null and declarations were written to a null path.
let connectedCampaignId = null;
let sceneWatchGeneration = 0;
// v0.65.0: the account's own documents.
let characters = new Map();          // characterId -> published character
let viewedCharacterId = null;
let unsubscribeCharacters = null;
let playerLog = null;
let unsubscribeLog = null;
let watchedDocumentsUid = null;
// The tab the player chose; null until they click, so a fight that starts can
// bring the scene forward without overriding a deliberate choice.
let chosenTab = null;
let currentTab = 'character';
let unsubscribePresence = null;
let selectedTokenIds = new Set();
let targetTokenIds = new Set();
let hoveredTokenId = null;
let canvasPresence = [];
// v0.73.0: the board is drawn by scene-canvas.js, the same module the referee
// client draws with; this page supplies tokens, overlays and the drop.
let canvas = null;
function sceneCanvas() {
  if (!canvas) {
    canvas = createSceneCanvas({ svg: el.map, viewport: el.mapViewport, onCamera: ({ zoom }) => { el.zoomLabel.textContent = `${Math.round(zoom * 100)}%`; } });
  }
  return canvas;
}

function setStatus(text, kind = '') {
  el.status.textContent = text;
  el.status.className = `player-status${kind ? ` ${kind}` : ''}`;
}

function svg(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

// Which combatants this account plays, from the campaign's ownership map.
function ownedCombatantIds() {
  const uid = currentUserId();
  if (!uid || !campaign?.ownership?.actors) return new Set();
  return new Set(Object.entries(campaign.ownership.actors)
    .filter(([, owner]) => owner === uid)
    .map(([documentId]) => documentId));
}

function renderAccount() {
  const { user, status } = authStatus();
  if (status === 'unavailable') {
    el.account.textContent = 'OFFLINE';
    el.accountButton.hidden = true;
    return;
  }
  if (user) {
    el.account.textContent = (user.displayName || user.email || user.uid).toUpperCase();
    // A referee needs this to seat the player, and it exists nowhere else.
    el.account.title = `Account id: ${user.uid}\nClick to copy`;
    el.account.classList.add('copyable');
    el.account.onclick = async () => {
      try {
        await navigator.clipboard.writeText(user.uid);
        setStatus('ACCOUNT ID COPIED / SEND IT TO YOUR REFEREE', 'ok');
      } catch {
        window.prompt('Account id — send this to your referee:', user.uid);
      }
    };
    el.accountButton.hidden = false;
    el.accountButton.textContent = '[ SIGN OUT ]';
    el.accountButton.onclick = () => signOutOfTraveller();
    return;
  }
  el.account.textContent = '';
  el.account.classList.remove('copyable');
  el.account.onclick = null;
  el.accountButton.hidden = false;
  el.accountButton.textContent = '[ SIGN IN ]';
  el.accountButton.onclick = () => openSignInDialog();
}

function renderCampaign() {
  el.campaignName.textContent = campaign?.name?.toUpperCase() ?? 'NOT CONNECTED';
  const time = campaign?.time;
  el.clock.textContent = time
    ? `${String(time.dayOfYear).padStart(3, '0')}-${time.year} ${String(Math.floor(time.secondsOfDay / 3600)).padStart(2, '0')}:${String(Math.floor((time.secondsOfDay % 3600) / 60)).padStart(2, '0')}:${String(time.secondsOfDay % 60).padStart(2, '0')}`
    : '--';
  const owned = ownedCombatantIds();
  el.yours.textContent = owned.size
    ? `YOU PLAY ${[...owned].map((id) => view?.combatants.find((entry) => entry.id === id)?.name ?? characters.get(id)?.identity?.name ?? id).join(', ').toUpperCase()}`
    : campaign ? 'NO CHARACTER ASSIGNED TO YOU YET' : '';
}

// v0.70.0: the world scene. Where the party is, from the envelope: current
// system on the subsector map, the port, the ship's name and its fuel and
// hold. Read-only — the player watches the referee jump — and it gives way to
// the combat canvas while a fight is on.
let worldMapSystemId = null;
// A finished fight gives way to the world; its board stays a click away.
let showFinishedBoard = false;
// v0.74.0: with no fight on, the referee's active scene is what the player
// sees; the subsector is a button away.
let preferWorldOverScene = false;
function stagedSceneShowing() {
  return Boolean(campaign?.activeScene) && (!view || (view.status !== 'active' && !showFinishedBoard)) && !preferWorldOverScene;
}
function worldShowing() {
  return Boolean(campaign) && (!view || (view.status !== 'active' && !showFinishedBoard)) && !stagedSceneShowing();
}
function renderWorld() {
  const show = worldShowing();
  el.world.hidden = !show;
  el.mapViewport.hidden = show;
  el.mapTools.hidden = show;
  el.scene.hidden = show && !view;
  el.lastFight.hidden = !(show && view);
  el.stagedScene.hidden = !(show && campaign?.activeScene);
  if (show && campaign?.activeScene) el.stagedSceneLabel.textContent = `THE REFEREE HAS ${campaign.activeScene.name.toUpperCase()} OPEN`;
  el.sceneToWorld.hidden = !stagedSceneShowing();
  if (show && view) {
    el.lastFightLabel.textContent = `LAST FIGHT / ${String(view.title ?? 'ENCOUNTER').toUpperCase()} / ${String(view.status ?? '').toUpperCase()}`;
  }
  if (!show) return;
  const current = campaign.location?.systemId ? getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, campaign.location.systemId) : null;
  const port = current?.mainWorld;
  el.worldPort.textContent = current
    ? `${current.name.toUpperCase()} / ${port?.uwp ?? '------'} / HEX ${current.hex}`
    : (campaign.location?.worldName ?? 'UNMAPPED').toUpperCase();
  const ship = campaign.ship;
  el.worldShip.textContent = ship
    ? `${(ship.name || 'UNNAMED').toUpperCase()} / ${ship.typeCode ?? ''} ${(ship.typeName ?? '').toUpperCase()} / ${ship.tons ?? '--'}T / JUMP-${ship.jumpRating ?? '-'}`
    : 'NO SHIP';
  el.worldFuel.textContent = ship?.fuel?.capacityTons != null ? `${ship.fuel.aboardTons ?? '--'} / ${ship.fuel.capacityTons} T` : '--';
  el.worldHold.textContent = ship?.cargo?.capacityTons != null ? `${ship.cargo.usedTons} / ${ship.cargo.capacityTons} T${ship.passengers ? ` / ${ship.passengers} PASSENGER${ship.passengers === 1 ? '' : 'S'}` : ''}` : '--';
  if (worldMapSystemId !== (current?.id ?? null) || !el.worldMap.firstChild) {
    worldMapSystemId = current?.id ?? null;
    el.worldMap.replaceChildren(renderSubsectorMap({
      subsector: FAR_MERIDIAN_SUBSECTOR, columns: SUBSECTOR_COLUMNS, rows: SUBSECTOR_ROWS, current
    }));
  }
}

function renderScene() {
  renderWorld();
  // v0.198.0: stagedSceneShowing() already yields to a RUNNING fight; the
  // extra !view guard here meant that once any fight had happened, finished
  // or not, the referee's staged scene never reached the player again.
  if (!(stagedSceneShowing() && campaign.activeScene?.kind === 'vector')) showVectorStage(false);
  if (stagedSceneShowing()) { renderStagedScene(campaign.activeScene); return; }
  if (!view) {
    el.scene.textContent = campaign ? 'NO FIGHT IN PROGRESS' : '';
    el.map.replaceChildren();
    el.roster.replaceChildren();
    el.narration.replaceChildren();
    return;
  }
  const scale = view.map.metersPerSquare ? ` / ${view.map.metersPerSquare}m PER SQUARE` : '';
  el.scene.textContent = `${view.title.toUpperCase()} / ROUND ${view.round} / ${view.status.toUpperCase().replace('-', ' ')}${scale}`;
  renderMap();
  renderRoster();
  renderOrders();
  renderNarration();
}

// The staged scene: everyone's token where the referee put it, the player's
// own walkable. A drag is a move intent keyed by the scene, no allowance.
// v0.171.0: the space plot and the grid canvas share the scene area; only one
// shows.
function showVectorStage(show) {
  if (el.vectorStage) el.vectorStage.hidden = !show;
  if (el.mapViewport) el.mapViewport.hidden = show;
  if (el.mapTools) el.mapTools.hidden = show;
  if (!show) el.vectorStage?.replaceChildren();
}

function renderStagedScene(scene) {
  if (scene.kind === 'vector') {
    showVectorStage(true);
    el.scene.textContent = `${scene.name.toUpperCase()} / SPACE / ${scene.spanThousandMiles}" = ${(scene.spanThousandMiles * 1000).toLocaleString('en-US')} MILES / NO FIGHT IN PROGRESS`;
    el.roster.replaceChildren(...scene.tokens.map((token) => {
      const row = document.createElement('div');
      row.className = `player-roster-row ${token.side === 'party' ? 'party' : 'enemy'}`;
      const speed = Math.hypot(token.velocity.x, token.velocity.y);
      row.textContent = `${token.name.toUpperCase()} / ${token.side.toUpperCase()} / ${speed ? `${speed.toFixed(1)}"` : 'STATIONARY'}`;
      return row;
    }));
    el.narration.replaceChildren();
    const plot = publishedVectorSceneDocument(scene);
    // No callbacks: nothing to stage, place, drag or start.
    renderVectorSceneStage(el.vectorStage, plot, { bodies: plot.space.bodies });
    return;
  }
  showVectorStage(false);
  const owned = ownedCombatantIds();
  el.scene.textContent = `${scene.name.toUpperCase()} / ${scene.map.metersPerSquare}m PER SQUARE / NO FIGHT IN PROGRESS`;
  el.roster.replaceChildren(...scene.tokens.map((token) => {
    const row = document.createElement('div');
    row.className = `player-roster-row ${token.side === 'party' ? 'party' : 'enemy'}`;
    row.textContent = `${token.name.toUpperCase()} / ${token.side.toUpperCase()}${owned.has(token.actorId) ? ' / YOU' : ''}`;
    return row;
  }));
  el.narration.replaceChildren();
  const board = sceneCanvas();
  board.setBoard(scene.map);
  board.render({
    tokens: scene.tokens.map((token) => ({
      id: token.id, column: token.position.column, row: token.position.row,
      side: token.side === 'party' ? 'party' : 'enemy',
      shape: token.actorType === 'robot' ? 'square' : token.actorType === 'creature' ? 'diamond' : 'circle',
      label: token.label || token.name.charAt(0),
      title: `${token.name} / ${token.side}`,
      ariaLabel: `${token.name}, ${token.side}`,
      state: { owned: owned.has(token.actorId) },
      token
    })),
    interaction: {
      canDrag: (entry) => owned.has(entry.token.actorId),
      describe: (entry, from, to) => ({ legal: 'legal', text: `WALK / ${Number((Math.max(Math.abs(to.column - from.column), Math.abs(to.row - from.row)) / scene.map.metersPerSquare).toFixed(2))} SQ` }),
      onDrop: async (entry, to, { reset }) => {
        try {
          await writeTokenMove(connectedCampaignId, scene.sceneId, createPlayerTokenMove({ uid: currentUserId(), encounterId: scene.sceneId, actorId: entry.token.actorId, column: to.column, row: to.row, pace: 'walk', round: 1, movedAt: Date.now() }));
          setStatus(`${entry.token.name.toUpperCase()} MOVES / WAITING FOR THE SCENE TO UPDATE`, 'ok');
        } catch (error) { reset(); setStatus(error?.message ?? String(error), 'error'); }
      },
      onSelect: (entry) => { if (!owned.has(entry.token.actorId)) setStatus('YOU MAY ONLY MOVE A TOKEN YOU PLAY', 'error'); },
      onHover: (entry, event, entering) => { hoveredTokenId = entering ? entry.id : null; }
    }
  });
}

function renderMap() {
  const owned = ownedCombatantIds();
  const board = sceneCanvas();
  board.setBoard(view.map);
  const tokens = view.combatants.map((combatant) => ({
    id: combatant.id, column: combatant.position.column, row: combatant.position.row,
    side: combatant.side === 'party' ? 'party' : 'enemy',
    shape: combatant.actorType === 'robot' ? 'square' : combatant.actorType === 'creature' ? 'diamond' : 'circle',
    label: combatant.tokenLabel || combatant.name.charAt(0),
    title: `${combatant.name} / ${combatant.condition}`,
    ariaLabel: `${combatant.name}, ${combatant.side}, ${combatant.condition}`,
    state: { selected: selectedTokenIds.has(combatant.id), targeted: targetTokenIds.has(combatant.id), inactive: combatant.condition !== 'active', owned: owned.has(combatant.id) },
    combatant
  }));
  const allowanceFor = (pace) => (pace === 'run' ? 50 : 25);
  board.render({
    tokens,
    underlay: (fragments, { cell }) => {
      for (const path of view.movementPaths ?? []) {
        fragments.push(svgNode('line', { x1: path.from.column * cell, y1: path.from.row * cell, x2: path.to.column * cell, y2: path.to.row * cell, class: `player-movement-path ${path.pace}` }));
      }
    },
    decorate: (group, token) => {
      const remote = canvasPresence.filter((entry) => entry.uid !== currentUserId() && entry.targetIds?.includes(token.id));
      remote.slice(0, 4).forEach((entry, index) => group.append(svgNode('circle', { cx: -.42 + index * .28, cy: -.68, r: .09, class: 'player-token-remote-target' })));
    },
    interaction: {
      canDrag: (token) => owned.has(token.id) && Boolean(view.declaringRound),
      // v0.73.2: the drag stops at the allowance. Each axis is capped so the
      // token slides along the boundary rather than jumping back.
      constrain: (token, from, to) => {
        const allowance = allowanceFor(el.movePace.value);
        const gridScale = view.map.metersPerSquare;
        const cap = Math.floor(allowance / gridScale) * gridScale;
        return {
          column: from.column + Math.max(-cap, Math.min(cap, to.column - from.column)),
          row: from.row + Math.max(-cap, Math.min(cap, to.row - from.row))
        };
      },
      describe: (token, from, to) => {
        const pace = el.movePace.value;
        const distance = Math.max(Math.abs(to.column - from.column), Math.abs(to.row - from.row));
        const allowance = allowanceFor(pace);
        const legal = distance > allowance ? 'over' : distance === allowance ? 'limit' : 'legal';
        return { legal, text: `${pace.toUpperCase()} / ${Number((distance / view.map.metersPerSquare).toFixed(2))} SQ / ${distance} M${pace === 'run' ? ' / −1 BLOW / NO ATTACK' : ''}${legal === 'limit' ? ' / LIMIT' : legal === 'over' ? ' / OVER' : ''}` };
      },
      onDrop: async (token, to, { reset }) => {
        const combatant = token.combatant;
        const pace = el.movePace.value;
        const distance = Math.max(Math.abs(combatant.position.column - to.column), Math.abs(combatant.position.row - to.row));
        const allowance = allowanceFor(pace);
        if (distance > allowance) { reset(); setStatus(`${pace.toUpperCase()} ALLOWS ${allowance} METERS / DROP WAS ${distance}`, 'error'); return; }
        try {
          await writeTokenMove(connectedCampaignId, view.encounterId, createPlayerTokenMove({ uid: currentUserId(), encounterId: view.encounterId, actorId: combatant.id, column: to.column, row: to.row, pace, round: view.declaringRound, movedAt: Date.now() }));
          setStatus(`${pace.toUpperCase()} SENT / ${combatant.name.toUpperCase()} / WAITING FOR REFEREE`, 'ok');
        } catch (error) { reset(); setStatus(error?.message ?? String(error), 'error'); }
      },
      onSelect: (token, event) => {
        if (owned.has(token.id)) selectPlayerToken(token.combatant, Boolean(event?.shiftKey));
        else if (!view.declaringRound && owned.size) setStatus('THE ENCOUNTER IS NOT IN AN ACTIVE MOVEMENT ROUND', 'error');
        else if (owned.size) setStatus('YOU MAY ONLY MOVE A TOKEN YOU PLAY', 'error');
      },
      onContextMenu: (token, event) => showPlayerTokenMenu(event, token.combatant, owned.has(token.id)),
      onHover: (token, event, entering) => { hoveredTokenId = entering ? token.id : null; }
    }
  });
}

function publishPresence() {
  if (!connectedCampaignId || !watchedEncounterId || !currentUserId()) return;
  writeCanvasPresence(connectedCampaignId, watchedEncounterId, {
    uid: currentUserId(), selectedIds: [...selectedTokenIds], targetIds: [...targetTokenIds], updatedAt: Date.now()
  }).catch((error) => console.error(error));
}

function selectPlayerToken(combatant, additive = false) {
  if (!ownedCombatantIds().has(combatant.id)) return setStatus('YOU MAY ONLY SELECT A TOKEN YOU PLAY', 'error');
  const next = additive ? new Set(selectedTokenIds) : new Set();
  if (additive && next.has(combatant.id)) next.delete(combatant.id); else next.add(combatant.id);
  selectedTokenIds = next; publishPresence(); renderMap(); renderOrders();
}

function targetPlayerToken(combatant) {
  const next = new Set(targetTokenIds);
  if (next.has(combatant.id)) next.delete(combatant.id); else next.add(combatant.id);
  targetTokenIds = next; publishPresence(); renderMap(); renderOrders();
}

function showPlayerTokenMenu(event, combatant, owned) {
  event.preventDefault(); event.stopPropagation();
  const buttons = [];
  const add = (label, handler, disabled = false) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = `[ ${label} ]`; button.disabled = disabled;
    button.onclick = () => { el.mapMenu.hidden = true; handler(); }; buttons.push(button);
  };
  add(selectedTokenIds.has(combatant.id) ? 'DESELECT' : 'SELECT', () => selectPlayerToken(combatant, true), !owned);
  add(targetTokenIds.has(combatant.id) ? 'UNTARGET' : 'TARGET', () => targetPlayerToken(combatant));
  el.mapMenu.replaceChildren(...buttons); el.mapMenu.hidden = false;
  const rect = el.mapViewport.getBoundingClientRect();
  el.mapMenu.style.left = `${Math.max(4, event.clientX - rect.left + 8)}px`;
  el.mapMenu.style.top = `${Math.max(4, event.clientY - rect.top + 8)}px`;
}

function renderRoster() {
  const owned = ownedCombatantIds();
  const rows = view.combatants.map((combatant) => {
    const row = document.createElement('div');
    row.className = `player-roster-row${owned.has(combatant.id) ? ' yours' : ''}${combatant.condition === 'active' ? '' : ' down'}`;
    row.append(
      Object.assign(document.createElement('span'), {
        className: `player-side-dot ${combatant.side === 'party' ? 'party' : 'enemy'}`
      }),
      Object.assign(document.createElement('span'), { className: 'player-roster-name', textContent: combatant.name.toUpperCase() }),
      Object.assign(document.createElement('span'), { className: 'player-roster-condition', textContent: combatant.condition.toUpperCase() })
    );
    return row;
  });
  el.roster.replaceChildren(...rows);
}

// v0.180.0: the player's own draft declaration, until DECLARE is pressed.
const declarationDrafts = new Map();
function declarationDraft(combatantId, foes) {
  if (!declarationDrafts.has(combatantId)) {
    declarationDrafts.set(combatantId, { movement: 'stand', pace: 'walk', targetId: null });
  }
  const draft = declarationDrafts.get(combatantId);
  // A token targeted on the map is the draft's target too, and a target that
  // has gone down is no target at all.
  const marked = foes.find((foe) => targetTokenIds.has(foe.id));
  if (marked && !foes.some((foe) => foe.id === draft.targetId)) draft.targetId = marked.id;
  if (draft.targetId && !foes.some((foe) => foe.id === draft.targetId)) draft.targetId = null;
  if (!draft.targetId && foes.length === 1) draft.targetId = foes[0].id;
  return draft;
}

// The throw card, from the figures the referee published for this pair. The
// defender's armour is not among them: the tables and every defensive DM
// arrive as one combined line (see publishedThrows).
function renderPlayerThrowCard(priced, attacker, target) {
  if (!priced || !attacker || !target) return null;
  const card = document.createElement('div');
  card.className = 'encounter-throw-card player-throw-card';
  const head = document.createElement('div');
  head.className = 'throw-card-head';
  head.append(
    Object.assign(document.createElement('strong'), { textContent: `${attacker.name.toUpperCase()} \u2192 ${target.name.toUpperCase()}` }),
    Object.assign(document.createElement('span'), {
      className: 'throw-card-weapon',
      textContent: `${String(priced.weaponName).toUpperCase()} \u00b7 ${rangeLabel(priced.range)}${priced.bands !== null && priced.bands !== undefined ? ` (${priced.bands} BAND${priced.bands === 1 ? '' : 'S'})` : ''}`
    })
  );
  card.append(head);
  if (!priced.reach) {
    card.append(Object.assign(document.createElement('div'), {
      className: 'throw-card-need throw-card-no-reach',
      textContent: `NO REACH \u2014 ${String(priced.weaponName).toUpperCase()} DOES NOT CARRY THAT FAR`
    }));
    return card;
  }
  const rows = document.createElement('div');
  rows.className = 'throw-card-rows';
  const line = (label, dm, title, extra = '') => {
    const row = document.createElement('div');
    row.className = `throw-card-row${extra}${dm > 0 ? ' plus' : dm < 0 ? ' minus' : ''}`;
    row.title = title;
    row.append(
      Object.assign(document.createElement('span'), { className: 'throw-card-label', textContent: label }),
      Object.assign(document.createElement('span'), { className: 'throw-card-dm', textContent: typeof dm === 'string' ? dm : signedDM(dm) })
    );
    return row;
  };
  rows.append(line('BASIC THROW', `${priced.basic}+`, 'Book 1 p.30', ' throw-card-basic'));
  rows.append(line('WEAPON, RANGE AND COVER', priced.defenceDM ?? 0, 'Book 1 pp.42-43 and the defender\u2019s own DMs, as one figure'));
  for (const row of priced.rows) rows.append(line(row.label, row.note ?? row.dm, `Book 1 ${row.source}`));
  card.append(rows);
  const need = document.createElement('div');
  need.className = 'throw-card-need';
  need.append(
    Object.assign(document.createElement('strong'), { className: 'throw-card-figure', textContent: priced.needed > 12 ? 'IMPOSSIBLE' : `${priced.needed}+` }),
    Object.assign(document.createElement('span'), { className: 'throw-card-odds', textContent: `ON 2D \u00b7 ${priced.chance}% \u00b7 DM ${signedDM(priced.totalDM)}` })
  );
  card.append(need);
  card.append(Object.assign(document.createElement('div'), {
    className: 'throw-card-wound',
    textContent: `WOUND ${woundFormula(priced.wound.dice, priced.wound.modifier)} \u00b7 ${priced.wound.min}\u2013${priced.wound.max}`
      + (priced.melee ? ` \u00b7 BLOWS LEFT ${priced.blowsRemaining}` : '')
  }));
  return card;
}

// A resolved attack the party was part of, as a card. The dice are the ones
// thrown at the table; no DM is broken out, because the breakdown would name
// the defender's armour.
function renderPlayerAttackCard(attack) {
  const card = document.createElement('div');
  card.className = `attack-card${attack.hit ? ' hit' : ' miss'}`;
  const head = document.createElement('div');
  head.className = 'attack-card-head';
  head.append(
    Object.assign(document.createElement('strong'), { textContent: `${attack.attackerName.toUpperCase()} \u2192 ${attack.defenderName.toUpperCase()}` }),
    Object.assign(document.createElement('span'), { className: 'attack-card-weapon', textContent: `${String(attack.weaponName ?? '').toUpperCase()} \u00b7 ${rangeLabel(attack.range)}` })
  );
  card.append(head);
  const throwLine = document.createElement('div');
  throwLine.className = 'attack-card-throw';
  const dice = document.createElement('span');
  dice.className = 'attack-card-dice';
  for (const die of attack.dice) dice.append(Object.assign(document.createElement('i'), { className: 'attack-die', textContent: String(die) }));
  throwLine.append(dice,
    Object.assign(document.createElement('span'), { className: 'attack-card-sum', textContent: `= ${attack.roll}${attack.totalDM ? ` ${signedDM(attack.totalDM)}` : ''} = ${attack.total}` }),
    Object.assign(document.createElement('strong'), { className: `attack-card-verdict${attack.hit ? ' hit' : ''}`, textContent: `${attack.hit ? 'HIT' : 'MISS'} \u00b7 NEEDED ${attack.needed}+` })
  );
  card.append(throwLine);
  if (attack.wound) {
    const wound = document.createElement('div');
    wound.className = 'attack-card-wound';
    wound.append(Object.assign(document.createElement('span'), {
      className: 'attack-card-wound-roll',
      textContent: `WOUND ${attack.wound.dice.map((die) => `[${die}]`).join(' ')}${attack.wound.modifier ? ` ${signedDM(attack.wound.modifier)}` : ''} = ${attack.wound.total}`
    }));
    if (attack.wound.noEffect) {
      wound.append(Object.assign(document.createElement('span'), { className: 'attack-card-noeffect', textContent: 'NO WOUND \u00b7 ZERO OR LESS HAS NO EFFECT (p.30)' }));
    } else {
      for (const allocation of attack.wound.allocations) {
        wound.append(Object.assign(document.createElement('span'), {
          className: `attack-card-hit-group${allocation.firstBlood ? ' first-blood' : ''}`,
          textContent: `${allocation.characteristic} \u2212${allocation.amount}`,
          title: allocation.firstBlood ? 'Book 1 p.30: the first wound falls entirely on one random characteristic' : ''
        }));
      }
      if (attack.defenderStatus !== 'active') {
        wound.append(Object.assign(document.createElement('span'), { className: 'attack-card-status', textContent: attack.defenderStatus.toUpperCase() }));
      }
    }
    card.append(wound);
  }
  return card;
}

// A player declares for the combatants they own, and for nobody else. The
// declaration is an intent: the referee resolves it. Once made it cannot be
// revised — the rules refuse updates — so what everyone else does stays hidden
// until the round resolves.
function renderOrders() {
  if (!el.orders) return;
  const owned = [...ownedCombatantIds()];
  if (!view || !campaign) { el.orders.replaceChildren(); return; }
  if (!owned.length) {
    el.orders.replaceChildren(Object.assign(document.createElement('div'), {
      className: 'player-orders-hint', textContent: 'NO CHARACTER ASSIGNED TO YOU'
    }));
    return;
  }
  if (!view.declaringRound) {
    el.orders.replaceChildren(Object.assign(document.createElement('div'), {
      className: 'player-orders-hint', textContent: 'THE FIGHT IS OVER'
    }));
    return;
  }

  const blocks = owned.map((combatantId) => {
    const combatant = view.combatants.find((entry) => entry.id === combatantId);
    const block = document.createElement('div');
    block.className = 'player-orders-block';
    if (!combatant) return block;

    const declared = declarations.find((entry) => entry.actorId === combatantId && entry.round === view.declaringRound);
    const heading = document.createElement('div');
    heading.className = 'player-orders-heading';
    heading.textContent = `${combatant.name.toUpperCase()} / ROUND ${view.declaringRound}`;
    block.append(heading);

    if (combatant.condition !== 'active') {
      block.append(Object.assign(document.createElement('div'), {
        className: 'player-orders-hint', textContent: combatant.condition.toUpperCase()
      }));
      return block;
    }
    if (declared) {
      const target = declared.targetId ? view.combatants.find((entry) => entry.id === declared.targetId) : null;
      block.append(Object.assign(document.createElement('div'), {
        className: 'player-orders-declared',
        textContent: `${declared.action.toUpperCase()}${target ? ` → ${target.name.toUpperCase()}` : ''} — WAITING FOR THE REFEREE`
      }));
      return block;
    }

    const foes = view.combatants.filter((entry) => entry.side !== combatant.side && entry.condition === 'active');
    const draft = declarationDraft(combatantId, foes);

    // v0.180.0: the throw, before the click, as the referee's client has had
    // since v0.178.0. The figures are published per attacker-target pair;
    // nothing is computed here, so the page cannot disagree with the dice.
    const priced = (targetId) => (view.throws ?? []).find((entry) => entry.attackerId === combatantId && entry.targetId === targetId) ?? null;
    if (draft.movement !== 'evade' && draft.movement !== 'escape' && draft.targetId) {
      const card = renderPlayerThrowCard(priced(draft.targetId), combatant, view.combatants.find((entry) => entry.id === draft.targetId));
      if (card) block.append(card);
    }

    // Book 1 p.26 step 4: movement status, then attack and target.
    const verbs = document.createElement('div');
    verbs.className = 'player-orders-verbs';
    const redraw = () => renderOrders();
    const choice = (label, on, handler, { disabled = false, title = '' } = {}) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `text-button declare-choice${on ? ' is-on' : ''}`;
      button.textContent = label;
      button.disabled = disabled;
      button.title = title;
      button.setAttribute('aria-pressed', String(on));
      button.addEventListener('click', () => { handler(); redraw(); });
      return button;
    };
    const group = (label) => {
      const row = document.createElement('div');
      row.className = 'declare-row';
      row.append(Object.assign(document.createElement('span'), { className: 'declare-label', textContent: label }));
      return row;
    };

    const move = group('MOVE');
    move.append(
      choice('STAND', draft.movement === 'stand', () => { draft.movement = 'stand'; }, { title: 'Book 1 p.29: no movement; attack if you choose a target' }),
      choice('CLOSE', draft.movement === 'close', () => { draft.movement = 'close'; }, { disabled: !foes.length, title: 'Book 1 p.28: move toward the enemy; walking still lets you attack' }),
      choice('OPEN', draft.movement === 'open', () => { draft.movement = 'open'; }, { disabled: !foes.length, title: 'Book 1 p.28: move away; walking still lets you attack' }),
      choice('EVADE', draft.movement === 'evade', () => { draft.movement = 'evade'; }, { title: 'Book 1 p.28: no attack; a defensive DM by range, and you lose your parry' })
    );
    if (view.declaringRound === 1) {
      move.append(choice('ESCAPE', draft.movement === 'escape', () => { draft.movement = 'escape'; }, { title: 'Book 1 p.28: throw 9+ before combat begins, with a DM for range' }));
    }
    verbs.append(move);

    if (draft.movement === 'close' || draft.movement === 'open') {
      const pace = group('PACE');
      pace.append(
        choice('WALK', draft.pace === 'walk', () => { draft.pace = 'walk'; }, { title: 'One band a round, and you still attack' }),
        choice('RUN', draft.pace === 'run', () => { draft.pace = 'run'; }, { title: 'Book 1 p.28: two bands, counted as a combat blow, and no attack this round' })
      );
      verbs.append(pace);
    }

    if (draft.movement !== 'evade' && draft.movement !== 'escape') {
      const targets = group(draft.movement === 'close' ? 'TOWARD' : draft.movement === 'open' ? 'AWAY FROM' : 'TARGET');
      for (const foe of foes) {
        const throwFor = priced(foe.id);
        const label = throwFor
          ? `${foe.name.toUpperCase()} \u00b7 ${rangeLabel(throwFor.range)} \u00b7 ${throwFor.reach ? `${throwFor.needed}+` : 'NO REACH'}`
          : foe.name.toUpperCase();
        targets.append(choice(label, draft.targetId === foe.id, () => {
          draft.targetId = foe.id;
          targetTokenIds = new Set([foe.id]);
          publishPresence();
        }, { title: throwFor?.reach ? `${throwFor.chance}% on 2D` : '' }));
      }
      if (draft.movement === 'stand') {
        targets.append(choice('NONE', draft.targetId === null, () => { draft.targetId = null; }, { title: 'Stand without attacking (Book 1 p.29)' }));
      }
      verbs.append(targets);
    }

    const confirm = document.createElement('div');
    confirm.className = 'declare-row declare-confirm';
    let derived = null;
    let problem = null;
    try { derived = deriveDeclaration({ movement: draft.movement, pace: draft.pace, targetId: draft.targetId, round: view.declaringRound }); }
    catch (error) { problem = error?.message ?? String(error); }
    const targetName = draft.targetId ? foes.find((foe) => foe.id === draft.targetId)?.name.toUpperCase() ?? null : null;
    const reach = draft.targetId ? priced(draft.targetId)?.reach ?? true : true;
    const declare = document.createElement('button');
    declare.type = 'button';
    declare.className = 'text-button action-button declare-button';
    declare.textContent = `[ DECLARE: ${declarationSummary(draft, { targetName, reach })} ]`;
    declare.disabled = Boolean(problem);
    if (problem) declare.title = problem;
    declare.addEventListener('click', async () => {
      if (!derived) { setStatus(String(problem).toUpperCase(), 'error'); return; }
      try {
        await writeDeclaration(connectedCampaignId, view.encounterId, createPlayerDeclaration({
          uid: currentUserId(), actorId: combatantId,
          action: derived.action, targetId: derived.targetId,
          round: view.declaringRound, declaredAt: Date.now()
        }));
        declarationDrafts.delete(combatantId);
        setStatus(`DECLARED ${derived.action.toUpperCase()}`, 'ok');
      } catch (error) {
        setStatus(error?.message ?? String(error), 'error');
      }
    });
    confirm.append(declare);
    verbs.append(confirm);
    block.append(verbs);
    return block;
  });
  el.orders.replaceChildren(...blocks);
}

// --- v0.179.0: the wound, placed by the player it fell on ---------------
//
// Book 1 p.30 leaves the distribution of a wound's groups to the wounded
// player. The referee's round pauses at step 2C and publishes the fact; this
// is the page's half. What arrives is the player's own numbers — their dice,
// their characteristics — and nothing about the attacker's throw.
let woundDraft = null;
let answeredWoundKey = null;

function pendingWoundForMe() {
  const pending = view?.pendingWound ?? null;
  if (!pending) return null;
  if (!ownedCombatantIds().has(pending.defenderId)) return null;
  return woundPromptFrom(pending);
}

function renderWoundPrompt() {
  const prompt = pendingWoundForMe();
  if (!prompt) {
    woundDraft = null;
    if (el.woundDialog?.open) closeWoundDialog();
    return;
  }
  // A player who has answered waits for the referee to apply it rather than
  // being asked the same question by every republish.
  if (answeredWoundKey === prompt.key) return;
  if (!woundDraft || woundDraft.key !== prompt.key) woundDraft = initialWoundDraft(prompt);
  el.woundTitle.textContent = `${prompt.defenderName.toUpperCase()} IS HIT`;
  el.woundRemaining.textContent = prompt.remaining > 1 ? `${prompt.remaining} WOUNDS THIS ROUND` : '';
  el.woundHit.textContent = woundHitLine(prompt);
  renderWoundGroups(el.woundGroups, prompt, woundDraft, (next) => { woundDraft = next; renderWoundPrompt(); });
  const preview = previewWoundDraft(prompt, woundDraft);
  el.woundError.hidden = preview.ok;
  el.woundError.textContent = preview.ok ? '' : String(preview.error).toUpperCase();
  el.woundApply.disabled = !preview.ok;
  renderWoundPreview(el.woundPreview, prompt, preview);
  if (!el.woundDialog.open) {
    if (typeof el.woundDialog.showModal === 'function') el.woundDialog.showModal();
    else el.woundDialog.setAttribute('open', '');
  }
}

function closeWoundDialog() {
  if (typeof el.woundDialog.close === 'function') el.woundDialog.close();
  else el.woundDialog.removeAttribute('open');
}

async function sendWoundAllocation() {
  const prompt = pendingWoundForMe();
  if (!prompt || !woundDraft) return;
  try {
    const allocation = createPlayerWoundAllocation({
      uid: currentUserId(),
      encounterId: view.encounterId,
      actorId: view.pendingWound.defenderId,
      key: prompt.key,
      targets: [...woundDraft.targets],
      // A weapon with no constant has nothing to distribute, so nothing is
      // sent and the referee's own default applies to a field that is empty.
      allocation: prompt.modifier ? [...woundDraft.shares] : null,
      round: prompt.round ?? view.declaringRound ?? 1,
      sentAt: Date.now()
    });
    await writeWoundAllocation(connectedCampaignId, view.encounterId, allocation);
    answeredWoundKey = prompt.key;
    closeWoundDialog();
    setStatus('WOUND PLACED / WAITING FOR THE REFEREE', 'ok');
  } catch (error) {
    setStatus(error?.message ?? String(error), 'error');
  }
}

// Handing the choice back: the referee's dialog is already open on their
// screen, so this only closes ours and stops asking until the next wound.
function declineWoundAllocation() {
  const prompt = pendingWoundForMe();
  if (prompt) answeredWoundKey = prompt.key;
  closeWoundDialog();
  setStatus('THE REFEREE WILL PLACE THIS WOUND', 'ok');
}

function renderNarration() {
  // Newest round first, so the latest events are at the top where a player
  // glancing at the screen will see them.
  const byRound = new Map();
  for (const entry of view.narration) {
    if (!byRound.has(entry.round)) byRound.set(entry.round, []);
    byRound.get(entry.round).push(entry);
  }
  const blocks = [...byRound.entries()].sort((left, right) => right[0] - left[0]).map(([round, entries]) => {
    const block = document.createElement('div');
    block.className = 'player-narration-round';
    block.append(Object.assign(document.createElement('div'), {
      className: 'player-narration-heading', textContent: `ROUND ${round}`
    }));
    // v0.180.0: the party's own attacks are cards; everything else stays the
    // narrated line, which is all a player is told about a fight between two
    // other sides.
    const cards = (view.attacks ?? []).filter((attack) => attack.round === round);
    let placed = 0;
    for (const entry of entries) {
      if (entry.kind === 'attack' && cards[placed]) {
        block.append(renderPlayerAttackCard(cards[placed]));
        placed += 1;
        continue;
      }
      block.append(Object.assign(document.createElement('div'), {
        className: 'player-narration-line', textContent: entry.text
      }));
    }
    return block;
  });
  el.narration.replaceChildren(...blocks);
}

// --- v0.65.0: the sheet, the log and the tabs ---------------------------

const SHEET_CHARACTERISTICS = [['STR', 'Strength'], ['DEX', 'Dexterity'], ['END', 'Endurance'], ['INT', 'Intelligence'], ['EDU', 'Education'], ['SOC', 'Social standing']];

function formatCr(value) { return `Cr${Number(value ?? 0).toLocaleString('en-US')}`; }

function appendDatum(list, label, value) {
  const term = document.createElement('dt'); term.textContent = label;
  const detail = document.createElement('dd'); detail.textContent = value;
  list.append(term, detail);
}

function healthLabel(character) {
  if (!character.status?.alive) return 'DEAD';
  if (character.status?.consciousness === 'unconscious') return 'UNCONSCIOUS';
  const wounded = ['STR', 'DEX', 'END'].some((key) => (character.current?.[key] ?? character.characteristics[key]) < character.characteristics[key]);
  return wounded ? 'WOUNDED' : 'READY';
}

function viewedCharacter() {
  if (viewedCharacterId && characters.has(viewedCharacterId)) return characters.get(viewedCharacterId);
  return characters.values().next().value ?? null;
}

function renderCharacterPicker() {
  const list = [...characters.values()];
  el.characterPicker.hidden = list.length < 2;
  if (list.length < 2) { el.characterPicker.replaceChildren(); return; }
  const current = viewedCharacter();
  el.characterPicker.replaceChildren(...list.map((character) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `text-button player-character-choice${character === current ? ' selected' : ''}`;
    button.textContent = character.identity.name.toUpperCase();
    button.addEventListener('click', () => { viewedCharacterId = character.characterId; renderSheet(); });
    return button;
  }));
}

function renderSheet() {
  renderCharacterPicker();
  const character = viewedCharacter();
  if (!character) {
    el.sheet.hidden = true;
    el.characterEmpty.hidden = false;
    el.characterEmpty.textContent = !campaign
      ? 'CONNECT TO A CAMPAIGN TO SEE YOUR CHARACTER'
      : ownedCombatantIds().size
        ? 'YOUR SHEET HAS NOT BEEN PUBLISHED YET / ASK YOUR REFEREE TO REPUBLISH'
        : 'NO CHARACTER ASSIGNED TO YOU YET';
    return;
  }
  el.characterEmpty.hidden = true;
  el.sheet.hidden = false;
  el.sheetName.textContent = character.identity.name || '(UNNAMED)';
  el.sheetDate.textContent = campaign?.time ? `${String(campaign.time.dayOfYear).padStart(3, '0')}-${campaign.time.year}` : 'SESSION';
  el.sheetUpp.textContent = character.upp;
  el.sheetRank.textContent = character.career?.rankTitle || 'NO RANK';
  el.sheetAge.textContent = String(character.age);
  el.sheetWorld.textContent = (campaign?.location?.worldName ?? 'UNMAPPED').toUpperCase();
  el.sheetHealthStatus.textContent = `STATUS ${healthLabel(character)} // ORIGINAL UPP ${character.upp}`;

  el.sheetCharacteristics.replaceChildren();
  for (const [key, label] of SHEET_CHARACTERISTICS) {
    const original = character.characteristics[key];
    const current = ['STR', 'DEX', 'END'].includes(key) ? (character.current?.[key] ?? original) : original;
    const box = document.createElement('div');
    box.className = `sheet-characteristic${current < original ? ' injured' : ''}`;
    box.title = `${label} ${current} / original ${original}`;
    const code = document.createElement('span'); code.className = 'sheet-stat-code'; code.textContent = key;
    const value = document.createElement('strong'); value.className = 'sheet-stat-value'; value.textContent = String(current);
    const base = document.createElement('span'); base.className = 'sheet-stat-current'; base.textContent = current === original ? 'CURRENT' : `ORIGINAL ${original}`;
    box.append(code, value, base);
    el.sheetCharacteristics.append(box);
  }

  el.sheetService.replaceChildren();
  appendDatum(el.sheetService, 'SERVICE', serviceName(character.career?.service).toUpperCase());
  appendDatum(el.sheetService, 'TERMS SERVED', String(character.career?.terms ?? 0));
  appendDatum(el.sheetService, 'FINAL RANK', character.career?.rankTitle || 'NONE');
  appendDatum(el.sheetService, 'NOBLE TITLE', nobleTitleLabel(character.characteristics.SOC));
  appendDatum(el.sheetService, 'RETIRED', character.status?.retired ? 'YES' : 'NO');
  appendDatum(el.sheetService, 'RETIREMENT PAY', formatCr(character.finances?.retirementPayAnnual));

  // The loadout is read here: which weapon is ready is a decision the sheet
  // records and the referee's client changes, so a player sees it rather than
  // editing it — editing arrives with the command service, not this page.
  el.sheetLoadout.replaceChildren();
  appendDatum(el.sheetLoadout, 'READY WEAPON', (PERSONAL_WEAPONS[character.loadout?.weaponKey]?.name ?? character.loadout?.weaponKey ?? 'NONE').toUpperCase());
  appendDatum(el.sheetLoadout, 'WORN ARMOR', (character.loadout?.armor ?? 'none').toUpperCase());
  const equipment = (character.benefits?.equipment ?? []).map((entry) => `${entry.name}${entry.count > 1 ? ` x${entry.count}` : ''}`);
  el.sheetEquipment.textContent = equipment.length ? `OWNED: ${equipment.join(' / ')}` : 'OWNED: NONE RECORDED';

  el.sheetSkills.replaceChildren();
  const skills = Object.entries(character.skills ?? {}).sort(([left], [right]) => left.localeCompare(right));
  if (!skills.length) el.sheetSkills.textContent = 'NONE RECORDED';
  for (const [name, level] of skills) {
    const chip = document.createElement('span');
    chip.className = 'sheet-skill'; chip.textContent = `${name}-${level}`;
    el.sheetSkills.append(chip);
  }

  const passages = (character.benefits?.passages ?? []).map((entry) => `${entry.name}${entry.count > 1 ? ` x${entry.count}` : ''}`).join(' / ') || 'NONE';
  const memberships = (character.benefits?.memberships ?? []).map((entry) => entry.name).join(' / ') || 'NONE';
  const ships = (character.shipRefs ?? []).map((entry) => entry.shipName || entry.shipType || entry.shipId).join(' / ') || 'NONE';
  el.sheetBenefits.replaceChildren(...[
    ['CREDITS', formatCr(character.finances?.credits)],
    ['PASSAGES', passages],
    ['MEMBERSHIPS', memberships],
    ['ASSIGNED SHIP', ships]
  ].map(([label, value]) => {
    const item = document.createElement('div'); item.className = 'sheet-benefit-item';
    const heading = document.createElement('span'); heading.textContent = label;
    const detail = document.createElement('strong'); detail.textContent = value;
    item.append(heading, detail);
    return item;
  }));
  el.sheetHistoryRecord.textContent = `${buildServiceHistory(character)}\n\n${buildGenerationLog(character)}`;
  el.sheetNotes.textContent = character.notes?.trim() ? character.notes : 'NONE';
}

// v0.75.0: chat, merged with the log by time.
let chatMessages = [];
let unsubscribeChat = null;
let watchedChatCampaignId = null;
function watchTableChat(campaignId) {
  if (campaignId === watchedChatCampaignId) return;
  unsubscribeChat?.(); unsubscribeChat = null;
  chatMessages = []; watchedChatCampaignId = campaignId;
  if (!campaignId) return;
  watchChat(campaignId, (messages) => { chatMessages = messages; renderLog(); })
    .then((unsubscribe) => { if (watchedChatCampaignId === campaignId) unsubscribeChat = unsubscribe; else unsubscribe(); })
    .catch((error) => console.error(error));
}
function chatAuthorName() {
  const { user } = authStatus();
  const owned = [...ownedCombatantIds()].map((id) => characters.get(id)?.identity?.name).filter(Boolean);
  return owned[0] || user?.displayName || user?.email || 'Player';
}
async function postChat(message) {
  try { await sendChatMessage(connectedCampaignId, message); }
  catch (error) { console.error(error); setStatus(error?.message ?? String(error), 'error'); }
}
function renderDiceTray() {
  if (!el.diceTray) return;
  el.chatComposer.hidden = !connectedCampaignId;
  el.diceTray.replaceChildren(...TRAY_DICE.map((die) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = die.traveller ? 'two-d' : ''; button.textContent = die.label;
    button.title = die.formula ? `Roll ${die.formula} for the table` : 'Roll dice of any size';
    button.addEventListener('click', () => {
      const formula = die.formula ?? window.prompt('Dice formula (for example 3d8+2):', '1d6');
      if (!formula || !parseRollFormula(formula)) return;
      postChat(createChatMessage({ uid: currentUserId(), name: chatAuthorName(), kind: 'roll', roll: rollFormula(formula) }));
    });
    return button;
  }));
}

function renderLog() {
  renderDiceTray();
  const logEntries = playerLog?.entries ?? [];
  const chatEntries = chatMessages.map((message) => ({
    id: `chat:${message.id}`, category: message.kind === 'roll' ? 'ROLL' : 'CHAT', createdAt: message.createdAt,
    dateLabel: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    message: message.kind === 'roll' ? `${message.name ?? 'Someone'}: ${formatRoll(message.roll)}` : `${message.name ?? 'Someone'}: ${message.text}`,
    addressed: false, mine: message.uid === currentUserId()
  }));
  const entries = [...logEntries, ...chatEntries].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  if (!entries.length) {
    el.log.replaceChildren(Object.assign(document.createElement('div'), {
      className: 'player-log-empty',
      textContent: campaign ? 'NOTHING IN THE LOG YET' : ''
    }));
    return;
  }
  // Newest first, like the referee's default: the line that just happened is
  // the one a player is looking for.
  el.log.replaceChildren(...[...entries].reverse().map((entry) => {
    const row = document.createElement('div');
    row.className = `player-log-entry${entry.addressed ? ' addressed' : ''}${entry.category === 'ROLL' ? ' roll' : ''}${entry.mine ? ' mine' : ''}`;
    row.dataset.category = entry.category;
    const meta = document.createElement('div'); meta.className = 'player-log-meta';
    const date = document.createElement('span'); date.textContent = entry.dateLabel;
    const category = document.createElement('span'); category.className = 'player-log-category'; category.textContent = entry.addressed ? `${entry.category} / TO YOU` : entry.category;
    meta.append(date, category);
    const message = document.createElement('div'); message.className = 'player-log-message'; message.textContent = entry.message;
    row.append(meta, message);
    return row;
  }));
}

function setTab(tab, { chosen = false } = {}) {
  currentTab = tab;
  if (chosen) chosenTab = tab;
  el.stage.dataset.tab = tab;
  el.tabCharacter.setAttribute('aria-selected', tab === 'character' ? 'true' : 'false');
  el.tabScene.setAttribute('aria-selected', tab === 'scene' ? 'true' : 'false');
  el.tabCharacter.classList.toggle('selected', tab === 'character');
  el.tabScene.classList.toggle('selected', tab === 'scene');
}

// A fight in progress brings the scene forward unless the player has picked a
// tab themselves; a page with no scene rests on the character.
function renderTabs() {
  const fighting = view?.status === 'active';
  el.tabScene.textContent = fighting ? `SCENE / ROUND ${view.declaringRound}` : campaign?.activeScene && !preferWorldOverScene ? 'SCENE' : 'WORLD';
  if (fighting) showFinishedBoard = false;
  el.backToWorld.hidden = !(view && view.status !== 'active' && showFinishedBoard);
  if (chosenTab) { setTab(chosenTab); return; }
  setTab(fighting || !characters.size ? 'scene' : 'character');
}

function watchPlayerDocuments(db, campaignId) {
  const uid = currentUserId();
  const key = uid ? `${campaignId}|${uid}` : null;
  if (key === watchedDocumentsUid) return;
  unsubscribeCharacters?.(); unsubscribeCharacters = null;
  unsubscribeLog?.(); unsubscribeLog = null;
  characters = new Map(); playerLog = null;
  watchedDocumentsUid = key;
  if (!uid) { renderSheet(); renderLog(); return; }
  // Listing here is the player's own subtree, players/{uid}/characters, which
  // the rules grant that account; encounters are still never listed.
  const root = db.doc(`travellerCampaigns/${campaignId}/players/${uid}`);
  unsubscribeCharacters = root.collection('characters').onSnapshot(
    (snapshot) => {
      characters = new Map(snapshot.docs.map((entry) => [entry.id, entry.data()]));
      renderSheet();
      renderCampaign();
    },
    (error) => console.error('[traveller-player] characters:', error)
  );
  let lastAddressedId = null;
  unsubscribeLog = root.collection('log').doc('current').onSnapshot(
    (snapshot) => {
      playerLog = snapshot.exists ? snapshot.data() : null;
      renderLog();
      // v0.71.0: a line addressed to this player is also the status line, so a
      // refused move or order is seen where the drag happened.
      const addressed = [...(playerLog?.entries ?? [])].reverse().find((entry) => entry.addressed);
      if (addressed && addressed.id !== lastAddressedId) {
        if (lastAddressedId !== null) setStatus(addressed.message.toUpperCase(), /refused/i.test(addressed.message) ? 'error' : 'ok');
        lastAddressedId = addressed.id;
      }
    },
    (error) => console.error('[traveller-player] log:', error)
  );
}

function render() {
  renderAccount();
  renderCampaign();
  renderSheet();
  renderLog();
  renderTabs();
  renderScene();
  // Outside renderScene: a fight that ends, or a view that goes away, must
  // close the dialog too, and renderScene returns early in both cases.
  renderWoundPrompt();
}

// Live subscriptions: the referee publishes, and this updates without asking.
async function connect(campaignId) {
  try {
    if (!currentUserId()) throw new Error('sign in first');
    if (!campaignId) throw new Error('paste the campaign id your referee gave you');
    const db = await ensureFirestore();
    unsubscribeCampaign?.();
    unsubscribeView?.();
    watchedEncounterId = null;
    setStatus('CONNECTING…');

    unsubscribeCampaign = db.doc(`travellerCampaigns/${campaignId}`).onSnapshot(
      (snapshot) => {
        if (!snapshot.exists) {
          setStatus('NO SUCH CAMPAIGN, OR YOU ARE NOT SEATED AT IT', 'error');
          return;
        }
        campaign = snapshot.data();
        connectedCampaignId = campaignId;
        window.localStorage?.setItem(CAMPAIGN_STORAGE_KEY, campaignId);
        setStatus(`CONNECTED / ${campaign.name}`, 'ok');
        watchScene(db, campaignId, campaign.currentEncounterId ?? null);
        watchPlayerDocuments(db, campaignId);
        watchTableChat(campaignId);
        render();
      },
      (error) => setStatus(`${error.code === 'permission-denied' ? 'NOT SEATED AT THIS CAMPAIGN' : error.message}`, 'error')
    );
  } catch (error) {
    setStatus(error?.message ?? String(error), 'error');
  }
}

function watchScene(db, campaignId, encounterId) {
  if (encounterId === watchedEncounterId) return;
  const generation = ++sceneWatchGeneration;
  unsubscribeView?.();
  unsubscribeView = null;
  unsubscribeDeclarations?.();
  unsubscribeDeclarations = null;
  unsubscribePresence?.();
  unsubscribePresence = null;
  declarations = [];
  canvasPresence = [];
  selectedTokenIds = new Set();
  targetTokenIds = new Set();
  watchedEncounterId = encounterId;
  view = null;
  if (!encounterId) { render(); return; }
  unsubscribeView = db
    .doc(`travellerCampaigns/${campaignId}/encounters/${encounterId}/view/current`)
    .onSnapshot(
      (snapshot) => {
        const wasActive = view?.status === 'active';
        view = snapshot.exists ? snapshot.data() : null;
        if (wasActive && view?.status !== 'active') {
          selectedTokenIds = new Set();
          targetTokenIds = new Set();
          publishPresence();
        }
        render();
      },
      (error) => setStatus(error.message, 'error')
    );
  watchDeclarations(campaignId, encounterId, (entries) => { declarations = entries; render(); })
    .then((unsubscribe) => {
      if (generation !== sceneWatchGeneration || encounterId !== watchedEncounterId) unsubscribe();
      else unsubscribeDeclarations = unsubscribe;
    })
    .catch((error) => console.error(error));
  watchCanvasPresence(campaignId, encounterId, (entries) => { canvasPresence = entries; renderMap(); })
    .then((unsubscribe) => {
      if (generation !== sceneWatchGeneration || encounterId !== watchedEncounterId) unsubscribe();
      else unsubscribePresence = unsubscribe;
    })
    .catch((error) => console.error(error));
}

el.zoomOut.addEventListener('click', () => sceneCanvas().camera.zoomBy(1 / 1.4));
el.zoomIn.addEventListener('click', () => sceneCanvas().camera.zoomBy(1.4));
el.zoomFit.addEventListener('click', () => sceneCanvas().camera.fit());
// v0.73.4: T targets the hovered token from anywhere on the page, as on the
// referee's client.
document.addEventListener('keydown', (event) => {
  const tag = event.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable) return;
  if (el.mapViewport.contains(event.target)) return;
  if (!hoveredTokenId || (event.key !== 't' && event.key !== 'T')) return;
  el.mapViewport.dispatchEvent(new KeyboardEvent('keydown', { key: event.key, shiftKey: event.shiftKey, bubbles: false, cancelable: true }));
  event.preventDefault();
});
el.mapViewport.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    selectedTokenIds = new Set();
    targetTokenIds = new Set();
    el.mapMenu.hidden = true;
    publishPresence();
    renderMap();
    renderOrders();
    return;
  }
  if (event.key !== 't' && event.key !== 'T') return;
  const combatant = view?.combatants.find((entry) => entry.id === hoveredTokenId);
  if (!combatant) return setStatus('HOVER A VISIBLE TOKEN, THEN PRESS T', 'error');
  event.preventDefault(); targetPlayerToken(combatant);
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  selectedTokenIds = new Set();
  targetTokenIds = new Set();
  el.mapMenu.hidden = true;
  publishPresence();
  if (view) { renderMap(); renderOrders(); }
});
el.mapViewport.addEventListener('pointerdown', (event) => {
  if (event.target.closest?.('[data-scene-token]')) return;
  el.mapMenu.hidden = true;
  if (event.button !== 0) return;
  selectedTokenIds = new Set();
  publishPresence();
  renderMap();
});
el.mapViewport.addEventListener('contextmenu', (event) => {
  if (!event.target.closest?.('[data-scene-token]')) event.preventDefault();
});

el.showBoard.addEventListener('click', () => { showFinishedBoard = true; render(); });
el.chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = el.chatInput.value.trim();
  if (!text || !connectedCampaignId || !currentUserId()) return;
  postChat(interpretChatInput(text, { uid: currentUserId(), name: chatAuthorName() }));
  el.chatInput.value = '';
});
// v0.179.0: the referee's round is paused behind this dialog, so ESC does not
// dismiss it — the way out is placing the wound or handing it back.
el.woundDialog.addEventListener('cancel', (event) => { event.preventDefault(); });
el.woundForm.addEventListener('submit', (event) => { event.preventDefault(); sendWoundAllocation(); });
el.woundDefault.addEventListener('click', declineWoundAllocation);
el.showScene.addEventListener('click', () => { preferWorldOverScene = false; render(); });
el.sceneToWorld.addEventListener('click', () => { preferWorldOverScene = true; render(); });
el.backToWorld.addEventListener('click', () => { showFinishedBoard = false; render(); });
el.tabCharacter.addEventListener('click', () => setTab('character', { chosen: true }));
el.tabScene.addEventListener('click', () => setTab('scene', { chosen: true }));

el.connect.addEventListener('click', () => connect(el.campaignField.value.trim()));
el.campaignField.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); connect(el.campaignField.value.trim()); }
});

// A campaign id in the URL, so a referee can send a link rather than a string.
const fromUrl = new URLSearchParams(window.location.search).get('campaign');
const remembered = window.localStorage?.getItem(CAMPAIGN_STORAGE_KEY);
el.campaignField.value = fromUrl || remembered || '';

onAuthChange(() => {
  render();
  if (currentUserId() && el.campaignField.value) connect(el.campaignField.value.trim());
});

// v0.68.0: this page is reached by ENTER WORLD, not by typing its address.
// Opened without a campaign to connect to, it hands over to the lobby.
if (!fromUrl && !remembered) {
  window.location.replace(new URL('enter.html', window.location.href).toString());
}
initAuth().then(render);
