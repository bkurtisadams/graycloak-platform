// adnd-chargen-view.js v1.0.0 — 2026-07-29
// Chargen UI + the characters/{charId} write path. URL: ?camp=<cid>.
// Roll -> assign -> race/gender -> class -> save. All numbers come from
// ADNDChargen (which reads the kernel); this file only collects input,
// renders, and writes.

(function() {

  const $ = id => document.getElementById(id);

  const RACES = ['human', 'dwarf', 'elf', 'gnome', 'half-elf', 'halfling', 'half-orc'];
  const ALIGNMENTS = ['LG', 'LN', 'LE', 'NG', 'N', 'NE', 'CG', 'CN', 'CE'];
  const ABILITY_LABELS = {
    str: 'Strength', int: 'Intelligence', wis: 'Wisdom',
    dex: 'Dexterity', con: 'Constitution', cha: 'Charisma',
  };
  const METHOD_LABELS = {
    I: 'I — 4d6 drop lowest, arrange',
    II: 'II — 12 × 3d6, best six, arrange',
    III: 'III — best of 6 × 3d6 per ability, in order',
    IV: 'IV — 12 whole sets, pick one',
  };

  const state = {
    method: 'I',
    sets: [],
    setIndex: 0,
    assignment: [0, 1, 2, 3, 4, 5],
    name: '',
    raceId: 'human',
    genderId: 'male',
    alignment: 'N',
    classId: null,
    result: null,
    saving: false,
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function campaignId() {
    return new URLSearchParams(location.search).get('camp');
  }

  function currentSet() {
    return state.sets[state.setIndex] || null;
  }

  function assignedScores() {
    const set = currentSet();
    if (!set) return null;
    return ADNDChargen.toScores(state.assignment.map(i => set.values[i]));
  }

  function resetAssignment() {
    state.assignment = [0, 1, 2, 3, 4, 5];
  }

  // Swap on pick so the six pool values stay a permutation.
  function assign(abilityIndex, poolIndex) {
    const held = state.assignment.indexOf(poolIndex);
    const previous = state.assignment[abilityIndex];
    state.assignment[abilityIndex] = poolIndex;
    if (held !== -1) state.assignment[held] = previous;
  }

  function roll() {
    state.sets = ADNDChargen.rollSets(state.method);
    state.setIndex = 0;
    state.classId = null;
    state.result = null;
    resetAssignment();
    render();
  }

  function renderMethods() {
    return ADNDChargen.METHODS.map(m => `
      <label class="cg-method">
        <input type="radio" name="cg-method" value="${m}" ${state.method === m ? 'checked' : ''}>
        ${esc(METHOD_LABELS[m])}
      </label>`).join('');
  }

  function renderSetPicker() {
    if (state.sets.length <= 1) return '';
    return `
      <div class="cg-field">
        <label for="cg-set">Set</label>
        <select id="cg-set">
          ${state.sets.map((s, i) => `
            <option value="${i}" ${i === state.setIndex ? 'selected' : ''}>
              ${i + 1}: ${s.values.join(' · ')}${s.viable ? '' : ' (not viable)'}
            </option>`).join('')}
        </select>
      </div>`;
  }

  function renderAbilities() {
    const set = currentSet();
    if (!set) return '';
    const arrangeable = ADNDChargen.isArrangeable(state.method);
    const scores = assignedScores();
    const rows = ADNDChargen.ABILITY_IDS.map((id, abilityIndex) => `
      <div class="cg-ability">
        <span class="cg-ability-name">${esc(ABILITY_LABELS[id])}</span>
        ${arrangeable ? `
          <select class="cg-assign" data-ability="${abilityIndex}">
            ${set.values.map((v, poolIndex) => `
              <option value="${poolIndex}" ${state.assignment[abilityIndex] === poolIndex ? 'selected' : ''}>${v}</option>
            `).join('')}
          </select>` : `<span class="cg-ability-score">${scores[id]}</span>`}
      </div>`).join('');
    return `
      <div class="cg-abilities">${rows}</div>
      ${set.viable ? '' : '<div class="cg-warn">No two scores of 15 or better — the set is playable but the DMG calls it non-viable.</div>'}
      ${arrangeable ? '' : '<div class="cg-note">Method III is rolled in order; scores cannot be rearranged.</div>'}`;
  }

  function renderClasses() {
    const scores = assignedScores();
    if (!scores) return '';
    const options = ADNDChargen.classOptions(state.raceId, scores);
    const items = options.map(o => {
      const missing = Object.keys(o.missingMinimums || {})
        .map(k => `${k.toUpperCase()} ${o.missingMinimums[k].required}`).join(', ');
      const why = o.reason === 'below-minimums' ? `needs ${missing}`
        : o.reason === 'npc-only' ? 'NPC only'
        : o.reason === 'forbidden' ? 'not available to this race'
        : o.levelCap === null ? 'unlimited advancement'
        : `level cap ${o.levelCap}`;
      return `
        <button class="cg-class ${o.allowed ? '' : 'cg-class-off'} ${state.classId === o.classId ? 'cg-class-on' : ''}"
                data-class="${esc(o.classId)}" ${o.allowed ? '' : 'disabled'}>
          <span class="cg-class-name">${esc(o.classId)}</span>
          <span class="cg-class-why">${esc(why)}</span>
        </button>`;
    }).join('');
    return `<div class="cg-classes">${items}</div>`;
  }

  function renderResult() {
    const r = state.result;
    if (!r) return '';
    if (!r.valid) return `<div class="cg-warn">${esc(r.error)}</div>`;
    const d = r.doc;
    const saves = Object.keys(d.savingThrows)
      .map(k => `<li><span>${esc(k.replace(/-/g, ' / '))}</span><span>${d.savingThrows[k]}</span></li>`).join('');
    const thief = d.thiefSkills
      ? `<div class="cg-block"><strong>Thief skills</strong><ul class="cg-list">${
          Object.keys(d.thiefSkills).map(k =>
            `<li><span>${esc(k.replace(/-/g, ' '))}</span><span>${d.thiefSkills[k]}%</span></li>`).join('')
        }</ul></div>`
      : '';
    const spells = d.spellSlots
      ? `<div class="cg-block"><strong>Spells</strong>
           <div class="cg-line">Slots by level: ${d.spellSlots.levels.join(' · ')}</div>
           <div class="cg-line">${esc(d.spells.join(', ') || '—')}</div>
           ${d.spellsPending ? '<div class="cg-note">OSRIC 3.0 starting-spell category lists are unverified in the kernel — remaining first-level spells are DM-assigned.</div>' : ''}
         </div>`
      : '';
    return `
      <div class="cg-sheet">
        <h2>${esc(d.name)}</h2>
        <div class="cg-sheet-meta">
          <span>${esc(d.genderId)} ${esc(d.raceId)} ${esc(d.classId)}</span>
          <span>level 1 · ${esc(d.levelTitle)}</span>
          <span>${esc(d.alignment || '—')}</span>
        </div>
        <ul class="cg-list">
          ${ADNDChargen.ABILITY_IDS.map(id => `<li><span>${esc(ABILITY_LABELS[id])}</span><span>${d.abilities[id]}${
            id === 'str' && d.exceptionalStrength ? '/' + d.exceptionalStrength : ''}</span></li>`).join('')}
        </ul>
        <div class="cg-block">
          <div class="cg-line">Hit points ${d.hitPoints.maximum} · AC ${d.armorClass} · THAC0 ${d.thac0}</div>
          <div class="cg-line">Starting gold ${d.startingGold} gp · weight allowance ${d.weightAllowance}</div>
          <div class="cg-line">Age ${d.age} (${esc(d.ageCategoryName)}) · ${d.height}in · ${d.weight}lb · dies by ${d.maximumAge}</div>
          <div class="cg-line">Next level at ${d.experienceToNextLevel} xp${d.experienceBonusPct ? ' · +' + d.experienceBonusPct + '% xp' : ''}</div>
          ${d.secondarySkills.length ? `<div class="cg-line">Secondary skill: ${esc(d.secondarySkills.join(', '))}</div>` : ''}
        </div>
        <div class="cg-block"><strong>Saving throws</strong><ul class="cg-list">${saves}</ul></div>
        ${thief}
        ${spells}
        <div class="cg-actions">
          <button id="cg-save" ${state.saving ? 'disabled' : ''}>${state.saving ? 'Saving…' : 'Save character'}</button>
          <button id="cg-discard" class="cg-secondary">Discard</button>
        </div>
        <div id="cg-save-status" class="cg-note"></div>
      </div>`;
  }

  function render() {
    const host = $('chargen-card');
    if (!host) return;
    const cid = campaignId();
    if (!ADNDChargen.kernel()) { host.innerHTML = '<div class="cg-warn">Rules kernel unavailable — see the console.</div>'; return; }
    if (!ADNDAuth.getUser()) { host.innerHTML = '<div class="cg-empty">Sign in to create a character</div>'; return; }
    if (!cid) { host.innerHTML = '<div class="cg-empty">Add ?camp=&lt;campaignId&gt; to the URL</div>'; return; }

    host.innerHTML = `
      <div class="cg-panel">
        <h2>New character</h2>
        <div class="cg-kernel">OSRIC 3 rules kernel v${esc(ADNDChargen.rulesVersion())} · schema v${ADNDChargen.SCHEMA_VERSION}</div>
        <div class="cg-methods">${renderMethods()}</div>
        <button id="cg-roll">${state.sets.length ? 'Reroll' : 'Roll abilities'}</button>
        ${state.sets.length ? `
          ${renderSetPicker()}
          ${renderAbilities()}
          <div class="cg-row">
            <div class="cg-field">
              <label for="cg-name">Name</label>
              <input id="cg-name" type="text" maxlength="40" value="${esc(state.name || '')}">
            </div>
            <div class="cg-field">
              <label for="cg-race">Race</label>
              <select id="cg-race">${RACES.map(r =>
                `<option value="${r}" ${state.raceId === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
            </div>
            <div class="cg-field">
              <label for="cg-gender">Gender</label>
              <select id="cg-gender">
                <option value="male" ${state.genderId === 'male' ? 'selected' : ''}>male</option>
                <option value="female" ${state.genderId === 'female' ? 'selected' : ''}>female</option>
              </select>
            </div>
            <div class="cg-field">
              <label for="cg-alignment">Alignment</label>
              <select id="cg-alignment">${ALIGNMENTS.map(a =>
                `<option value="${a}" ${state.alignment === a ? 'selected' : ''}>${a}</option>`).join('')}</select>
            </div>
          </div>
          ${renderClasses()}
          <button id="cg-build" ${state.classId ? '' : 'disabled'}>Roll hit points and gold</button>
        ` : ''}
      </div>
      ${renderResult()}`;

    bind();
  }

  function bind() {
    const on = (id, evt, fn) => { const el = $(id); if (el) el.addEventListener(evt, fn); };

    document.querySelectorAll('input[name="cg-method"]').forEach(el => {
      el.addEventListener('change', () => { state.method = el.value; state.sets = []; state.result = null; render(); });
    });
    document.querySelectorAll('.cg-assign').forEach(el => {
      el.addEventListener('change', () => {
        assign(Number(el.dataset.ability), Number(el.value));
        state.result = null;
        render();
      });
    });
    document.querySelectorAll('.cg-class').forEach(el => {
      el.addEventListener('click', () => { state.classId = el.dataset.class; state.result = null; render(); });
    });

    on('cg-roll', 'click', roll);
    on('cg-set', 'change', () => {
      state.setIndex = Number($('cg-set').value);
      resetAssignment();
      state.result = null;
      render();
    });
    on('cg-name', 'input', () => { state.name = $('cg-name').value; });
    on('cg-race', 'change', () => { state.raceId = $('cg-race').value; state.classId = null; state.result = null; render(); });
    on('cg-gender', 'change', () => { state.genderId = $('cg-gender').value; });
    on('cg-alignment', 'change', () => { state.alignment = $('cg-alignment').value; });
    on('cg-build', 'click', build);
    on('cg-save', 'click', save);
    on('cg-discard', 'click', () => { state.result = null; render(); });
  }

  function build() {
    const user = ADNDAuth.getUser();
    const name = (state.name || '').trim();
    if (!name) { alert('Name the character first.'); return; }
    state.result = ADNDChargen.buildCharacter({
      raceId: state.raceId,
      classId: state.classId,
      baseScores: assignedScores(),
      genderId: state.genderId,
      alignment: state.alignment,
      ownerUid: user.uid,
      campaignId: campaignId(),
      name: name,
      method: state.method,
    });
    render();
  }

  async function save() {
    const r = state.result;
    if (!r || !r.valid || state.saving) return;
    const db = ADNDAuth.getDb();
    if (!db) { $('cg-save-status').textContent = 'Firestore not initialized.'; return; }

    state.saving = true;
    render();
    try {
      const stamp = firebase.firestore.FieldValue.serverTimestamp();
      const ref = db.collection('characters').doc();
      const doc = Object.assign({}, r.doc, { id: ref.id, createdAt: stamp, updatedAt: stamp });
      await ref.set(doc);
      state.saving = false;
      state.result = null;
      state.sets = [];
      render();
      const host = $('chargen-card');
      host.insertAdjacentHTML('afterbegin',
        `<div class="cg-ok">Saved ${esc(doc.name)} — characters/${esc(ref.id)}</div>`);
    } catch (e) {
      console.error('[chargen] save failed:', e);
      state.saving = false;
      render();
      $('cg-save-status').textContent = 'Save failed: ' + e.message;
    }
  }

  ADNDChargen.ready().then(() => {
    ADNDAuth.onAuthChange(() => render());
  });

})();
