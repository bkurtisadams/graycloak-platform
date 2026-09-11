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

import { initAuth, onAuthChange, signOutOfTraveller, currentUserId, authStatus } from './auth.js';
import { openSignInDialog } from './signin-ui.js';
import {
  ensureFirestore, writeDeclaration, watchDeclarations, writeTokenMove,
  writeCanvasPresence, watchCanvasPresence, sendChatMessage, watchChat } from './publish.js';
import { createPlayerDeclaration } from '../src/player-declaration.js';
import { createPlayerTokenMove } from '../src/player-token-movement.js';
import { serviceName, nobleTitleLabel, buildServiceHistory, buildGenerationLog } from './ui-model.js';
import { PERSONAL_WEAPONS, SUBSECTOR_COLUMNS, SUBSECTOR_ROWS, getSubsectorSystem } from '../vendor/classic-traveller-rules/index.js';
import { renderSubsectorMap } from './subsector-svg.js';
import { createSceneCanvas, svgNode } from './scene-canvas.js';
import { TRAY_DICE, rollFormula, formatRoll, createChatMessage, interpretChatInput, parseRollFormula } from '../src/dice-tray.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';

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
  mapMenu: document.querySelector('#player-token-menu'),
  zoomOut: document.querySelector('#player-zoom-out'),
  zoomIn: document.querySelector('#player-zoom-in'),
  zoomFit: document.querySelector('#player-zoom-fit'),
  zoomLabel: document.querySelector('#player-zoom-label'),
  movePace: document.querySelector('#player-move-pace'),
  roster: document.querySelector('#player-roster'),
  narration: document.querySelector('#player-narration'),
  orders: document.querySelector('#player-orders'),
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
  if (!view && stagedSceneShowing()) { renderStagedScene(campaign.activeScene); return; }
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
function renderStagedScene(scene) {
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
    const targetRow = document.createElement('label');
    targetRow.className = 'player-orders-target';
    targetRow.append(Object.assign(document.createElement('span'), { textContent: 'TARGET' }));
    const select = document.createElement('select');
    for (const foe of foes) select.append(new Option(foe.name.toUpperCase(), foe.id));
    if (!foes.length) select.append(new Option('NOBODY', ''));
    const marked = foes.find((foe) => targetTokenIds.has(foe.id));
    if (marked) select.value = marked.id;
    targetRow.append(select);
    block.append(targetRow);

    const verbs = document.createElement('div');
    verbs.className = 'player-orders-verbs';
    const declare = (action, needsTarget) => async () => {
      const targetId = needsTarget ? select.value || null : null;
      if (needsTarget && !targetId) { setStatus('NO TARGET AVAILABLE', 'error'); return; }
      try {
        await writeDeclaration(connectedCampaignId, view.encounterId, createPlayerDeclaration({
          uid: currentUserId(),
          actorId: combatantId,
          action,
          targetId,
          round: view.declaringRound,
          declaredAt: Date.now()
        }));
        setStatus(`DECLARED ${action.toUpperCase()}`, 'ok');
      } catch (error) {
        setStatus(error?.message ?? String(error), 'error');
      }
    };
    for (const [label, action, needsTarget] of [
      ['ATTACK / STAND', 'attack', true], ['CLOSE + ATTACK', 'close', true], ['OPEN + ATTACK', 'open', true],
      ['RUN CLOSER', 'close-run', true], ['RUN AWAY', 'open-run', true],
      ['EVADE', 'evade', false], ['ESCAPE', 'escape', false], ['STAND', 'wait', false]
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'text-button action-button';
      button.textContent = `[ ${label} ]`;
      button.disabled = (needsTarget && !foes.length) || (action === 'escape' && view.declaringRound !== 1);
      button.addEventListener('click', declare(action, needsTarget));
      verbs.append(button);
    }
    block.append(verbs);
    return block;
  });
  el.orders.replaceChildren(...blocks);
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
    for (const entry of entries) {
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
