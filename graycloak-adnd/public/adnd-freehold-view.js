// adnd-freehold-view.js v1.0.0 — 2026-05-24
// Reader for a single freehold. URL: ?freehold=<id>. Fetches
// freeholds/{id} from Firestore on sign-in and renders into
// #freehold-card. All derived numbers (qualification, revenue,
// men-at-arms upkeep, net, settled status) come from ADNDFreehold —
// the runtime copy of the engine. Read-only: no founding, no writes.
// The found flow + location picker is a later slice once the runtime
// has campaign/character selection and a map.

(function() {

  const $ = id => document.getElementById(id);
  const F = () => (typeof ADNDFreehold !== 'undefined' ? ADNDFreehold : null);

  function getFreeholdId() {
    return new URLSearchParams(location.search).get('freehold');
  }

  function renderEmpty(msg) {
    const card = $('freehold-card');
    if (card) card.innerHTML = `<div class="freehold-empty">${msg}</div>`;
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
  const gp = n => (Math.round(n * 100) / 100).toLocaleString();
  const troopLabel = t => t.replace(/-/g, ' ');
  const stateLabel = s => (s || 'wilderness').replace(/_/g, ' ');

  function renderCard(d) {
    const card = $('freehold-card');
    if (!card) return;
    const fh = F();
    if (!fh) { renderEmpty('Freehold rules not loaded'); return; }

    const founder = d.founder || {};
    const cls = founder.characterClass || null;
    const lvl = founder.level || 0;
    const gate = cls ? fh.freeholdGate(cls) : null;
    const qualifies = cls ? fh.qualifiesForFreehold(cls, lvl) : false;

    // Qualification line.
    let gateHtml;
    if (!cls) {
      gateHtml = `<span class="freehold-warn">no founder class on record</span>`;
    } else if (qualifies) {
      const rev = gate && gate.fighterStyleRevenue ? '' : ' <span class="freehold-warn">(no automatic freehold revenue in RAW — DM-adjudicated)</span>';
      gateHtml = `<span class="freehold-ok">qualifies — ${esc(cls)} ${lvl} is ${esc(gate.title)}</span>${rev}`;
    } else {
      const need = gate ? gate.level : '?';
      gateHtml = `<span class="freehold-warn">does not yet qualify — ${esc(cls)} reaches ${gate ? esc(gate.title) : 'name level'} at ${need} (currently ${lvl})</span>`;
    }

    const radius = fh.clampFreeholdRadius(d.radiusMiles);
    const settled = fh.isSettledByRadius(radius);
    const rev = fh.monthlyRevenue(d.population);
    const roster = (Array.isArray(d.menAtArms) && d.menAtArms.length) ? d.menAtArms : fh.defaultAttractedRoster();
    const rosterDefault = !(Array.isArray(d.menAtArms) && d.menAtArms.length);
    const head = fh.rosterHeadcount(roster);
    const upkeep = fh.monthlyUpkeepGp(roster);
    const net = fh.monthlyNetGp(d.population, roster);

    const rosterRows = roster.map(t => `
      <li><span class="freehold-troop">${esc(troopLabel(t.type))}${t.level ? ` (lvl ${t.level})` : ''}</span><span class="freehold-troop-n">×${t.count}</span></li>
    `).join('');

    const plan = (d.state === 'cleared' || d.state === 'settled')
      ? fh.clearedCheckPlan({ roadThrough: !!d.roadThrough })
      : null;

    card.innerHTML = `
      <div class="freehold-card">
        <h2>${esc(d.name || '(unnamed freehold)')}</h2>
        <div class="freehold-meta">
          <span>${esc(stateLabel(d.state))}</span>
          <span>radius ${radius} mi${settled ? ' · settled' : ''}</span>
          <span>pop. ${rev.population.toLocaleString()}</span>
        </div>
        <div class="freehold-location">
          ${esc(d.regionalHexId || '')}${d.roadThrough ? ' · road through' : ''}
        </div>

        <div class="freehold-section">
          <strong>Founder</strong>
          <div>${esc(founder.characterName || '—')}${founder.alignment ? ` · ${esc(founder.alignment)}` : ''}</div>
          <div class="freehold-gate">${gateHtml}</div>
        </div>

        <div class="freehold-section">
          <strong>Revenue</strong>
          <div>${rev.population.toLocaleString()} × 7 sp = ${rev.silverPieces.toLocaleString()} sp/month (${gp(rev.goldPieces)} gp)</div>
        </div>

        <div class="freehold-section">
          <strong>Men-at-arms${rosterDefault ? ' <span class="freehold-warn">(default roster — TUNABLE vs DMG)</span>' : ''}</strong>
          <ul class="freehold-roster">${rosterRows}</ul>
          <div class="freehold-econ">
            ${head} soldiers · upkeep ${gp(upkeep)} gp/month ·
            <span class="${net < 0 ? 'freehold-warn' : 'freehold-ok'}">net ${gp(net)} gp/month</span>
          </div>
        </div>

        ${plan ? `<div class="freehold-section">
          <strong>Monster checks (cleared)</strong>
          <div>border ${plan.borderChecksPerDay}/day · central ${plan.centralChecksPerWeek}/week · inhabited ${plan.inhabitedChecksPerWeek}/week</div>
        </div>` : ''}

        ${d.notes ? `<div class="freehold-notes">${esc(d.notes)}</div>` : ''}
      </div>
    `;
  }

  async function load(id) {
    const db = ADNDAuth.getDb();
    if (!db) { renderEmpty('Firestore not initialized'); return; }
    try {
      const snap = await db.collection('freeholds').doc(id).get();
      if (!snap.exists) { renderEmpty(`Freehold "${id}" not found`); return; }
      renderCard(snap.data());
    } catch (e) {
      console.error('[freehold-view] load failed:', e);
      renderEmpty(`Load failed: ${e.message}`);
    }
  }

  ADNDAuth.onAuthChange(user => {
    const id = getFreeholdId();
    if (!id) return;                                  // not a freehold URL — stay quiet
    if (!user) { renderEmpty('Sign in to view freehold'); return; }
    load(id);
  });

})();
