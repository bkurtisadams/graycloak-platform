// player.js — the player's view of a campaign.
//
// A player reads two documents and writes none: the published campaign, which
// says who they play and which scene is current, and that scene's player-safe
// view. The encounter document itself is referee-only and this never asks for
// it; nor can it list encounters, which is why the campaign carries
// currentEncounterId.
//
// Everything here is read-only. Declarations come later.

import { initAuth, onAuthChange, signIn, signOutOfTraveller, currentUserId, authStatus } from './auth.js';
import { ensureFirestore } from './publish.js';

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
  map: document.querySelector('#player-map'),
  roster: document.querySelector('#player-roster'),
  narration: document.querySelector('#player-narration')
};

const CAMPAIGN_STORAGE_KEY = 'graycloak.traveller.player.campaign.v1';

let campaign = null;
let view = null;
let unsubscribeCampaign = null;
let unsubscribeView = null;
let watchedEncounterId = null;

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
  el.accountButton.onclick = async () => {
    try { await signIn(); } catch (error) { setStatus(error?.message ?? String(error), 'error'); }
  };
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
  renderNarration();
}

function renderMap() {
  const columns = view.map.columns;
  const rows = view.map.rows;
  const cell = 40;
  el.map.setAttribute('viewBox', `0 0 ${columns * cell} ${rows * cell}`);
  const parts = [];
  for (let column = 0; column <= columns; column += 1) {
    parts.push(svg('line', { x1: column * cell, y1: 0, x2: column * cell, y2: rows * cell, class: 'player-grid' }));
  }
  for (let row = 0; row <= rows; row += 1) {
    parts.push(svg('line', { x1: 0, y1: row * cell, x2: columns * cell, y2: row * cell, class: 'player-grid' }));
  }
  const owned = ownedCombatantIds();
  for (const combatant of view.combatants) {
    const x = combatant.position.column * cell + cell / 2;
    const y = combatant.position.row * cell + cell / 2;
    const group = svg('g', { transform: `translate(${x} ${y})` });
    if (owned.has(combatant.id)) group.append(svg('circle', { cx: 0, cy: 0, r: 17, class: 'player-token-yours' }));
    group.append(svg('circle', {
      cx: 0, cy: 0, r: 14,
      class: `player-token ${combatant.side === 'party' ? 'party' : 'enemy'}${combatant.condition === 'active' ? '' : ' down'}`
    }));
    const label = svg('text', { x: 0, y: 0, class: 'player-token-label' });
    label.textContent = combatant.tokenLabel || combatant.name.charAt(0).toUpperCase();
    group.append(label);
    const name = svg('text', { x: 0, y: 26, class: 'player-token-name' });
    name.textContent = combatant.name;
    group.append(name);
    parts.push(group);
  }
  el.map.replaceChildren(...parts);
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
  unsubscribeView?.();
  watchedEncounterId = encounterId;
  view = null;
  if (!encounterId) { render(); return; }
  unsubscribeView = db
    .doc(`travellerCampaigns/${campaignId}/encounters/${encounterId}/view/current`)
    .onSnapshot(
      (snapshot) => { view = snapshot.exists ? snapshot.data() : null; render(); },
      (error) => setStatus(error.message, 'error')
    );
}

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
