// adnd-settlement-view.js v1.1.0
// Minimum settlement reader. URL: ?settlement=<id>. Fetches
// settlements/{id} from Firestore on sign-in; renders into
// #settlement-card.

(function() {

  const $ = id => document.getElementById(id);

  function getSettlementId() {
    return new URLSearchParams(location.search).get('settlement');
  }

  function renderEmpty(msg) {
    const card = $('settlement-card');
    if (!card) return;
    card.innerHTML = `<div class="settlement-empty">${msg}</div>`;
  }

  function renderCard(d) {
    const card = $('settlement-card');
    if (!card) return;
    const services = (d.services || [])
      .map(s => `<li>${s.replace(/_/g, ' ')}</li>`).join('');
    const npcs = (d.notableNPCs || [])
      .map(n => `
        <li class="settlement-npc">
          <div class="settlement-npc-name">${n.name || ''}</div>
          <div class="settlement-npc-meta">${[n.role, n.alignment].filter(Boolean).join(' · ')}</div>
          ${n.notes ? `<div class="settlement-npc-notes">${n.notes}</div>` : ''}
        </li>
      `).join('');
    const sub = d.subHexCoord ? `(Q${d.subHexCoord[0]}, R${d.subHexCoord[1]})` : '';
    card.innerHTML = `
      <div class="settlement-card">
        <h2>${d.name || '(unnamed)'}</h2>
        <div class="settlement-meta">
          <span>${d.size || '—'}</span>
          <span>pop. ${d.population != null ? d.population : '—'}</span>
          <span>alignment ${d.alignment || '—'}</span>
        </div>
        <div class="settlement-location">
          ${d.regionalHexId || ''} ${sub}
          ${d.parent ? `· part of ${d.parent}` : ''}
        </div>
        ${services ? `<div class="settlement-services"><strong>Services:</strong><ul>${services}</ul></div>` : ''}
        ${npcs ? `<div class="settlement-npcs"><strong>Notable NPCs:</strong><ul>${npcs}</ul></div>` : ''}
        ${d.notes ? `<div class="settlement-notes">${d.notes}</div>` : ''}
      </div>
    `;
  }

  async function load(id) {
    const db = ADNDAuth.getDb();
    if (!db) { renderEmpty('Firestore not initialized'); return; }
    try {
      const snap = await db.collection('settlements').doc(id).get();
      if (!snap.exists) { renderEmpty(`Settlement "${id}" not found`); return; }
      renderCard(snap.data());
    } catch (e) {
      console.error('[settlement-view] load failed:', e);
      renderEmpty(`Load failed: ${e.message}`);
    }
  }

  ADNDAuth.onAuthChange(user => {
    const id = getSettlementId();
    if (!id) { renderEmpty('Add ?settlement=<id> to URL'); return; }
    if (!user) { renderEmpty('Sign in to view settlement'); return; }
    load(id);
  });

})();