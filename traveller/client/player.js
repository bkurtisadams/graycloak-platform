// player.js — the player's view of a campaign.
//
// A player reads two published documents: the campaign, which
// says who they play and which scene is current, and that scene's player-safe
// view. The encounter document itself is referee-only and this never asks for
// it; nor can it list encounters, which is why the campaign carries
// currentEncounterId.
//
// The only write is a create-only combat declaration for an assigned character.

import { initAuth, onAuthChange, signOutOfTraveller, currentUserId, authStatus } from './auth.js';
import { openSignInDialog } from './signin-ui.js';
import {
  ensureFirestore, writeDeclaration, watchDeclarations, writeTokenMove,
  writeCanvasPresence, watchCanvasPresence
} from './publish.js';
import { createPlayerDeclaration } from '../src/player-declaration.js';
import { createPlayerTokenMove } from '../src/player-token-movement.js';

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
  orders: document.querySelector('#player-orders')
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
let unsubscribePresence = null;
let selectedTokenIds = new Set();
let targetTokenIds = new Set();
let hoveredTokenId = null;
let canvasPresence = [];
let mapZoom = 1;
let mapView = { x: 0, y: 0, width: 1206, height: 1206 };
let mapPan = null;
const MAP_SIZE = 1206;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 16;

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
    ? `YOU PLAY ${[...owned].map((id) => view?.combatants.find((entry) => entry.id === id)?.name ?? id).join(', ').toUpperCase()}`
    : campaign ? 'NO CHARACTER ASSIGNED TO YOU YET' : '';
}

function renderScene() {
  if (!view) {
    el.scene.textContent = campaign ? 'NO SCENE PUBLISHED YET' : '';
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

function renderMap() {
  const columns = view.map.columns;
  const rows = view.map.rows;
  const cell = MAP_SIZE / Math.max(columns, rows);
  const parts = [];
  for (let column = 0; column <= columns; column += 1) {
    parts.push(svg('line', { x1: column * cell, y1: 0, x2: column * cell, y2: rows * cell, class: column % 5 ? 'player-grid' : 'player-grid major' }));
  }
  for (let row = 0; row <= rows; row += 1) {
    parts.push(svg('line', { x1: 0, y1: row * cell, x2: columns * cell, y2: row * cell, class: row % 5 ? 'player-grid' : 'player-grid major' }));
  }
  for (const path of view.movementPaths ?? []) {
    parts.push(svg('line', {
      x1: path.from.column * cell + cell / 2, y1: path.from.row * cell + cell / 2,
      x2: path.to.column * cell + cell / 2, y2: path.to.row * cell + cell / 2,
      class: `player-movement-path ${path.pace}`
    }));
  }
  const owned = ownedCombatantIds();
  for (const combatant of view.combatants) {
    const x = combatant.position.column * cell + cell / 2;
    const y = combatant.position.row * cell + cell / 2;
    const group = svg('g', { transform: `translate(${x} ${y})` });
    group.dataset.tokenId = combatant.id;
    group.classList.add('player-token-group');
    group.setAttribute('tabindex', '0');
    if (selectedTokenIds.has(combatant.id)) group.append(svg('path', { d: 'M -3 -1.5 V -3 H -1.5 M 1.5 -3 H 3 V -1.5 M 3 1.5 V 3 H 1.5 M -1.5 3 H -3 V 1.5', class: 'player-token-selected' }));
    if (targetTokenIds.has(combatant.id)) group.append(svg('circle', { cx: 0, cy: 0, r: 4.2, class: 'player-token-target' }));
    const remoteTargets = canvasPresence.filter((entry) => entry.uid !== currentUserId() && entry.targetIds?.includes(combatant.id));
    remoteTargets.slice(0, 4).forEach((entry, index) => group.append(svg('circle', { cx: -3 + index * 2, cy: -4.8, r: .65, class: 'player-token-remote-target' })));
    group.append(svg('circle', {
      cx: 0, cy: 0, r: 2.25,
      class: `player-token ${combatant.side === 'party' ? 'party' : 'enemy'}${combatant.condition === 'active' ? '' : ' down'}`
    }));
    const label = svg('text', { x: 0, y: 0, class: 'player-token-label' });
    label.textContent = combatant.tokenLabel || combatant.name.charAt(0).toUpperCase();
    group.append(label);
    const title = svg('title'); title.textContent = `${combatant.name} / ${combatant.condition}`; group.append(title);
    attachPlayerTokenInteraction(group, combatant, owned.has(combatant.id), cell);
    parts.push(group);
  }
  el.map.replaceChildren(...parts);
  applyMapView();
}

function applyMapView() {
  const width = MAP_SIZE / mapZoom;
  const height = MAP_SIZE / mapZoom;
  mapView.width = width; mapView.height = height;
  mapView.x = width >= MAP_SIZE ? (MAP_SIZE - width) / 2 : Math.max(0, Math.min(MAP_SIZE - width, mapView.x));
  mapView.y = height >= MAP_SIZE ? (MAP_SIZE - height) / 2 : Math.max(0, Math.min(MAP_SIZE - height, mapView.y));
  el.map.setAttribute('viewBox', `${mapView.x} ${mapView.y} ${width} ${height}`);
  el.zoomLabel.textContent = `${Math.round(mapZoom * 100)}%`;
}

function mapPoint(event) {
  const matrix = el.map.getScreenCTM();
  if (!matrix) return { x: 0, y: 0 };
  const point = el.map.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
  return point.matrixTransform(matrix.inverse());
}

function setMapZoom(next, event = null) {
  const point = event ? mapPoint(event) : { x: mapView.x + mapView.width / 2, y: mapView.y + mapView.height / 2 };
  const old = mapZoom;
  mapZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
  const ratio = old / mapZoom;
  mapView.x = point.x - (point.x - mapView.x) * ratio;
  mapView.y = point.y - (point.y - mapView.y) * ratio;
  applyMapView();
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

function attachPlayerTokenInteraction(group, combatant, owned, cell) {
  let drag = null;
  group.addEventListener('pointerenter', () => { hoveredTokenId = combatant.id; });
  group.addEventListener('pointerleave', () => { if (!drag) hoveredTokenId = null; });
  group.addEventListener('contextmenu', (event) => showPlayerTokenMenu(event, combatant, owned));
  group.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return; event.stopPropagation();
    drag = { start: mapPoint(event), origin: { ...combatant.position }, moved: false };
    group.setPointerCapture(event.pointerId);
  });
  group.addEventListener('pointermove', (event) => {
    if (!drag || !group.hasPointerCapture(event.pointerId)) return;
    const point = mapPoint(event); if (Math.hypot(point.x - drag.start.x, point.y - drag.start.y) > cell * .35) drag.moved = true;
    if (drag.moved && owned) group.setAttribute('transform', `translate(${Math.max(cell / 2, Math.min(MAP_SIZE - cell / 2, point.x))} ${Math.max(cell / 2, Math.min(MAP_SIZE - cell / 2, point.y))})`);
  });
  group.addEventListener('pointerup', async (event) => {
    if (!drag) return; group.releasePointerCapture(event.pointerId); const wasMoved = drag.moved; drag = null;
    if (!wasMoved) { selectPlayerToken(combatant, event.shiftKey); return; }
    if (!owned) { renderMap(); setStatus('YOU MAY ONLY MOVE A TOKEN YOU PLAY', 'error'); return; }
    if (!view.declaringRound) { renderMap(); setStatus('THE ENCOUNTER IS NOT IN AN ACTIVE MOVEMENT ROUND', 'error'); return; }
    const point = mapPoint(event);
    const column = Math.max(0, Math.min(view.map.columns - 1, Math.floor(point.x / cell)));
    const row = Math.max(0, Math.min(view.map.rows - 1, Math.floor(point.y / cell)));
    const pace = el.movePace.value;
    const distance = Math.max(Math.abs(combatant.position.column - column), Math.abs(combatant.position.row - row));
    const allowance = pace === 'run' ? 10 : 5;
    if (distance > allowance) { renderMap(); setStatus(`${pace.toUpperCase()} ALLOWS ${allowance} SQUARES / DROP WAS ${distance}`, 'error'); return; }
    try {
      await writeTokenMove(connectedCampaignId, view.encounterId, createPlayerTokenMove({ uid: currentUserId(), encounterId: view.encounterId, actorId: combatant.id, column, row, pace, round: view.declaringRound, movedAt: Date.now() }));
      setStatus(`${pace.toUpperCase()} SENT / ${combatant.name.toUpperCase()} / WAITING FOR REFEREE`, 'ok');
    } catch (error) { renderMap(); setStatus(error?.message ?? String(error), 'error'); }
  });
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

function render() {
  renderAccount();
  renderCampaign();
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
      (snapshot) => { view = snapshot.exists ? snapshot.data() : null; render(); },
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

el.zoomOut.addEventListener('click', () => setMapZoom(mapZoom / 1.4));
el.zoomIn.addEventListener('click', () => setMapZoom(mapZoom * 1.4));
el.zoomFit.addEventListener('click', () => { mapZoom = 1; mapView = { x: 0, y: 0, width: MAP_SIZE, height: MAP_SIZE }; applyMapView(); });
el.mapViewport.addEventListener('wheel', (event) => { event.preventDefault(); setMapZoom(mapZoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12), event); }, { passive: false });
el.mapViewport.addEventListener('keydown', (event) => {
  if (event.key !== 't' && event.key !== 'T') return;
  const combatant = view?.combatants.find((entry) => entry.id === hoveredTokenId);
  if (!combatant) return setStatus('HOVER A VISIBLE TOKEN, THEN PRESS T', 'error');
  event.preventDefault(); targetPlayerToken(combatant);
});
el.mapViewport.addEventListener('pointerdown', (event) => {
  if (event.target.closest?.('.player-token-group')) return;
  el.mapMenu.hidden = true;
  mapPan = { x: event.clientX, y: event.clientY, viewX: mapView.x, viewY: mapView.y, moved: false };
  el.mapViewport.setPointerCapture(event.pointerId);
});
el.mapViewport.addEventListener('pointermove', (event) => {
  if (!mapPan || !el.mapViewport.hasPointerCapture(event.pointerId)) return;
  const rect = el.mapViewport.getBoundingClientRect();
  const scale = Math.min(rect.width / mapView.width, rect.height / mapView.height) || 1;
  const dx = event.clientX - mapPan.x; const dy = event.clientY - mapPan.y;
  if (Math.hypot(dx, dy) > 4) mapPan.moved = true;
  mapView.x = mapPan.viewX - dx / scale; mapView.y = mapPan.viewY - dy / scale; applyMapView();
});
const endMapPan = (event) => {
  if (!mapPan) return;
  const moved = mapPan.moved; mapPan = null;
  if (el.mapViewport.hasPointerCapture(event.pointerId)) el.mapViewport.releasePointerCapture(event.pointerId);
  if (!moved) { selectedTokenIds = new Set(); publishPresence(); renderMap(); }
};
el.mapViewport.addEventListener('pointerup', endMapPan);
el.mapViewport.addEventListener('pointercancel', endMapPan);

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
initAuth().then(render);
