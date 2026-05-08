// adnd-nwp.js
// AD&D 2e Non-Weapon Proficiencies for GCC AD&D character sheet.
// Ported from Graycloak's ARS Foundry module.

(function(){
  const DATA = window.ADNDNWP_DATA || [];

  function classPartToGroup(p){
    p = (p||'').toLowerCase().replace(/[\s\-]+/g,' ').trim();
    if(p==='fighter'||p==='paladin'||p==='ranger'||p==='warrior')return'warrior';
    if(p==='magic user'||p==='mage'||p==='magic-user'||p==='mu'||p==='wizard'||p==='illusionist')return'wizard';
    if(p==='cleric'||p==='druid'||p==='priest')return'priest';
    if(p==='thief'||p==='assassin'||p==='rogue')return'rogue';
    if(p==='bard')return'rogue';
    if(p==='monk')return'warrior';
    return null;
  }

  function getClassGroups(classStr){
    const raw = (classStr||'').trim();
    if(!raw) return [];
    const parts = raw.includes('/') ? raw.split('/') : [raw];
    const out = [];
    parts.forEach(p=>{const g=classPartToGroup(p); if(g&&!out.includes(g))out.push(g);});
    return out;
  }

  function profGroupArray(p){
    return Array.isArray(p.group) ? p.group : [p.group];
  }

  function isCrossClass(prof, charGroups){
    const groups = profGroupArray(prof);
    if(groups.includes('general')) return false;
    if(!charGroups.length) return false;
    return !groups.some(g => charGroups.includes(g));
  }

  const INT_BONUS_TABLE = [
    {max:8,bonus:0},{max:10,bonus:1},{max:11,bonus:2},{max:13,bonus:3},
    {max:14,bonus:4},{max:16,bonus:5},{max:17,bonus:6},{max:18,bonus:7}
  ];
  function intBonus(intScore){
    const s = +intScore||0;
    for(const row of INT_BONUS_TABLE){ if(s<=row.max) return row.bonus; }
    return 8;
  }

  function classInitialAndProgression(group){
    switch(group){
      case 'warrior': return {initial:3, progression:3};
      case 'wizard':  return {initial:4, progression:3};
      case 'priest':  return {initial:4, progression:3};
      case 'rogue':   return {initial:3, progression:4};
      default:        return {initial:3, progression:4};
    }
  }

  function countLanguages(CHAR){
    const s = (CHAR.languages||'').trim();
    if(!s) return 0;
    return s.split(/[,\n]/).map(x=>x.trim()).filter(Boolean).length;
  }

  function calcUsedSlots(profs){
    return (profs||[]).reduce((t,p)=>{
      const base = +p.slots||1;
      const extra = +p.extraSlots||0;
      const cc = p.crossClass ? 1 : 0;
      return t + base + extra + cc;
    }, 0);
  }

  function calcSlots(CHAR){
    const groups = getClassGroups(CHAR.characterClass);
    const level = Math.max(1, +CHAR.level||1);

    let initial = 3;
    let bestProg = 4;
    if(groups.length){
      groups.forEach(g=>{
        const {initial:ci, progression:cp} = classInitialAndProgression(g);
        if(ci > initial) initial = ci;
        if(cp < bestProg) bestProg = cp;
      });
    }
    const additional = level > 1 ? Math.floor((level-1)/bestProg) : 0;

    const ib = intBonus(CHAR.int);
    const usedLang = countLanguages(CHAR);
    const availIntBonus = Math.max(0, ib - usedLang);
    const total = initial + additional + availIntBonus;
    const used = calcUsedSlots(CHAR.nwp);

    return {
      total, used, remaining: total - used,
      initial, additional,
      intBonus: ib, usedLanguages: usedLang, availableIntBonus: availIntBonus,
      level, progression: bestProg, groups
    };
  }

  // ── Campaign rule check ──
  function isEnabledForCharacter(CHAR){
    if(typeof GCC==='undefined' || !GCC.loadCampaigns || !GCC.getCampaignRules) return false;
    if(!CHAR || (!CHAR._id && !CHAR.characterName)){
      return !!(CHAR && CHAR.nwp && CHAR.nwp.length);
    }
    const id = CHAR._id;
    const name = CHAR.characterName;
    const camps = GCC.loadCampaigns();
    for(const c of camps){
      const refs = c.characters||[];
      const match = refs.some(r =>
        (id && r._id === id) ||
        (name && (r.name === name || r.characterName === name))
      );
      if(match){
        const rules = GCC.getCampaignRules(c.id);
        if(rules.nwp) return true;
      }
    }
    return !!(CHAR.nwp && CHAR.nwp.length);
  }

  // ── Rendering ──
  function ESC(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function render(){
    const CHAR = window.CHAR || {};
    if(!CHAR.nwp) CHAR.nwp = [];
    const page = document.getElementById('page3');
    if(!page) return;

    const s = calcSlots(CHAR);
    const groupBadge = s.groups.length ? s.groups.join(', ') : '(no class)';

    const profRowsHtml = CHAR.nwp.length ? CHAR.nwp.map((p,i)=>{
      const abilKey = (p.ability||'').toLowerCase().substring(0,3);
      const abilScore = +CHAR[abilKey]||0;
      const target = abilScore + (+p.modifier||0) + (+p.extraSlots||0);
      const totalSlots = (+p.slots||1) + (+p.extraSlots||0) + (p.crossClass?1:0);
      const ccMark = p.crossClass ? '<span class="nwp-cc" title="Cross-class (+1 slot)">*</span>' : '';
      const extraMark = p.extraSlots ? `<span class="nwp-extra">+${p.extraSlots}</span>` : '';
      const noteMark = p.notes ? '<span class="nwp-note-dot" title="Has notes">●</span>' : '';
      return `<tr data-nwp-idx="${i}">
        <td class="nwp-name"><span class="nwp-name-txt" title="${ESC(p.description||'')}">${ESC(p.name)}</span>${ccMark}${noteMark}</td>
        <td class="nwp-cell-c">${totalSlots}${extraMark}</td>
        <td class="nwp-cell-c">${ESC(p.ability||'')}</td>
        <td class="nwp-cell-c">${abilScore?target:'—'}</td>
        <td class="nwp-actions">
          <button class="nwp-btn" data-nwp-roll="${i}" title="Roll check">⚀</button>
          <button class="nwp-btn" data-nwp-slot="${i}" title="Spend extra slot (+1 to check)">+</button>
          <button class="nwp-btn" data-nwp-edit="${i}" title="Edit notes">✎</button>
          <button class="nwp-btn danger" data-nwp-del="${i}" title="Remove">×</button>
        </td>
      </tr>`;
    }).join('') : '<tr><td colspan="5" class="nwp-empty">No proficiencies. Click "Add Proficiency" below.</td></tr>';

    page.innerHTML = `
    <div class="sec">Non-Weapon Proficiencies</div>
    <div class="nwp-panels">
      <div class="nwp-panel">
        <div class="nwp-panel-hd">Slots</div>
        <div class="nwp-kv"><span>Initial:</span><b>${s.initial}</b></div>
        <div class="nwp-kv"><span>Level bonus:</span><b>${s.additional}</b></div>
        <div class="nwp-kv"><span>INT bonus (avail):</span><b>${s.availableIntBonus}</b></div>
        <div class="nwp-kv nwp-total"><span>Total:</span><b>${s.total}</b></div>
        <div class="nwp-kv"><span>Used:</span><b>${s.used}</b></div>
        <div class="nwp-kv"><span>Remaining:</span><b class="${s.remaining<0?'nwp-over':''}">${s.remaining}</b></div>
      </div>
      <div class="nwp-panel">
        <div class="nwp-panel-hd">Character</div>
        <div class="nwp-kv"><span>Class group:</span><b>${ESC(groupBadge)}</b></div>
        <div class="nwp-kv"><span>Level:</span><b>${s.level}</b></div>
        <div class="nwp-kv"><span>Progression:</span><b>1 / ${s.progression} lvls</b></div>
        <div class="nwp-kv"><span>INT bonus (total):</span><b>${s.intBonus}</b></div>
        <div class="nwp-kv"><span>Languages used:</span><b>${s.usedLanguages}</b></div>
        <div class="nwp-kv nwp-note-sm">* = cross-class (+1 slot)</div>
      </div>
    </div>
    <table class="nwp-tbl">
      <thead><tr>
        <th>Proficiency</th><th class="nwp-cell-c">Slots</th><th class="nwp-cell-c">Ability</th><th class="nwp-cell-c">Check ≤</th><th class="nwp-cell-c">Actions</th>
      </tr></thead>
      <tbody>${profRowsHtml}</tbody>
    </table>
    <div class="nwp-add-row"><button class="add-btn" id="nwp-add-btn">+ Add Proficiency</button></div>
    `;

    wireEvents();
  }

  function wireEvents(){
    const page = document.getElementById('page3');
    if(!page) return;
    page.querySelectorAll('[data-nwp-roll]').forEach(b=>b.addEventListener('click',e=>rollCheck(+e.currentTarget.dataset.nwpRoll)));
    page.querySelectorAll('[data-nwp-slot]').forEach(b=>b.addEventListener('click',e=>addExtraSlot(+e.currentTarget.dataset.nwpSlot)));
    page.querySelectorAll('[data-nwp-edit]').forEach(b=>b.addEventListener('click',e=>editNotes(+e.currentTarget.dataset.nwpEdit)));
    page.querySelectorAll('[data-nwp-del]').forEach(b=>b.addEventListener('click',e=>removeProf(+e.currentTarget.dataset.nwpDel)));
    const add = document.getElementById('nwp-add-btn');
    if(add) add.addEventListener('click', openAddDialog);
  }

  // ── Add Proficiency dialog ──
  function openAddDialog(){
    const CHAR = window.CHAR || {};
    if(!CHAR.nwp) CHAR.nwp = [];
    const s = calcSlots(CHAR);
    const charGroups = s.groups;
    const owned = new Set((CHAR.nwp||[]).map(p=>p.name));

    const options = DATA.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(p=>{
      const cc = isCrossClass(p, charGroups);
      const effSlots = (+p.slots||1) + (cc?1:0);
      const groupStr = profGroupArray(p).join('/');
      const label = `${p.name} — ${groupStr}, ${effSlots} slot${effSlots!==1?'s':''}${cc?' *':''}`;
      const disabled = owned.has(p.name);
      return `<option value="${ESC(p.name)}"${disabled?' disabled':''}>${ESC(label)}${disabled?' ✓':''}</option>`;
    }).join('');

    const html = `
      <div style="margin-bottom:8px;font-size:11px">
        Remaining slots: <b>${s.remaining}</b>
        <span style="color:#666;font-size:10px;display:block;margin-top:2px">* = cross-class (+1 slot)</span>
      </div>
      <div style="margin-bottom:8px">
        <label style="font-size:11px;font-weight:700">Proficiency</label>
        <select id="nwp-dlg-select" style="width:100%;margin-top:2px">
          <option value="">— Select —</option>${options}
        </select>
      </div>
      <div id="nwp-dlg-detail" style="display:none;font-size:11px;border:1px solid #c9b98a;background:#faf6e8;padding:6px;margin-bottom:8px">
        <div id="nwp-dlg-meta" style="font-weight:700;margin-bottom:4px"></div>
        <div id="nwp-dlg-desc" style="color:#444"></div>
      </div>
    `;

    MPDialog.confirm('Add Proficiency', html, {okText:'Add', cancelText:'Cancel'}).then(ok=>{
      if(!ok) return;
      const sel = document.getElementById('nwp-dlg-select');
      const name = sel ? sel.value : '';
      if(!name){ MPDialog.alert('Add Proficiency','No proficiency selected.'); return; }
      const def = DATA.find(p=>p.name===name);
      if(!def) return;
      const cc = isCrossClass(def, charGroups);
      CHAR.nwp.push({
        name: def.name,
        group: def.group,
        slots: def.slots,
        ability: def.ability,
        modifier: def.modifier,
        description: def.description,
        extraSlots: 0,
        crossClass: cc,
        notes: ''
      });
      if(window.autosave) autosave();
      render();
    });

    // Wire detail preview after dialog renders
    setTimeout(()=>{
      const sel = document.getElementById('nwp-dlg-select');
      const detail = document.getElementById('nwp-dlg-detail');
      const meta = document.getElementById('nwp-dlg-meta');
      const desc = document.getElementById('nwp-dlg-desc');
      if(!sel) return;
      sel.addEventListener('change', ()=>{
        const name = sel.value;
        const def = DATA.find(p=>p.name===name);
        if(!def){ detail.style.display='none'; return; }
        const cc = isCrossClass(def, charGroups);
        const effSlots = (+def.slots||1) + (cc?1:0);
        const mod = def.modifier>0?`+${def.modifier}`:def.modifier;
        meta.textContent = `${profGroupArray(def).join(', ')} · ${effSlots} slot${effSlots!==1?'s':''} · ${def.ability} ${mod}${cc?' · cross-class':''}`;
        desc.textContent = def.description||'';
        detail.style.display='block';
      });
    }, 50);
  }

  // ── Add extra slot ──
  function addExtraSlot(idx){
    const CHAR = window.CHAR || {};
    const p = (CHAR.nwp||[])[idx];
    if(!p) return;
    const s = calcSlots(CHAR);
    if(s.remaining < 1){
      MPDialog.alert('No slots','No remaining slots available.');
      return;
    }
    MPDialog.confirm('Spend Extra Slot', `Spend 1 slot on <b>${ESC(p.name)}</b> for +1 to the check?`, {okText:'Spend', cancelText:'Cancel'}).then(ok=>{
      if(!ok) return;
      p.extraSlots = (+p.extraSlots||0) + 1;
      if(window.autosave) autosave();
      render();
    });
  }

  // ── Edit notes ──
  function editNotes(idx){
    const CHAR = window.CHAR || {};
    const p = (CHAR.nwp||[])[idx];
    if(!p) return;
    const html = `
      <div style="font-size:11px;margin-bottom:4px"><b>${ESC(p.name)}</b></div>
      <textarea id="nwp-notes-ta" style="width:100%;min-height:80px;font-family:inherit;font-size:11px">${ESC(p.notes||'')}</textarea>
    `;
    MPDialog.confirm('Edit Notes', html, {okText:'Save', cancelText:'Cancel'}).then(ok=>{
      if(!ok) return;
      const ta = document.getElementById('nwp-notes-ta');
      p.notes = ta ? ta.value : '';
      if(window.autosave) autosave();
      render();
    });
  }

  // ── Remove ──
  function removeProf(idx){
    const CHAR = window.CHAR || {};
    const p = (CHAR.nwp||[])[idx];
    if(!p) return;
    MPDialog.confirm('Remove Proficiency', `Remove <b>${ESC(p.name)}</b>?`, {okText:'Remove', cancelText:'Cancel', danger:true}).then(ok=>{
      if(!ok) return;
      CHAR.nwp.splice(idx,1);
      if(window.autosave) autosave();
      render();
    });
  }

  // ── Roll check ──
  function rollCheck(idx){
    const CHAR = window.CHAR || {};
    const p = (CHAR.nwp||[])[idx];
    if(!p) return;
    const abilKey = (p.ability||'').toLowerCase().substring(0,3);
    const abilScore = +CHAR[abilKey]||0;
    if(!abilScore){
      MPDialog.alert('Roll', `${p.ability} score is not set on this character.`);
      return;
    }
    const baseMod = (+p.modifier||0) + (+p.extraSlots||0);
    const baseTarget = abilScore + baseMod;

    const html = `
      <div style="font-size:11px;margin-bottom:6px">
        <b>${ESC(p.name)}</b><br>
        Base target: <b>${baseTarget}</b> (${p.ability} ${abilScore}${baseMod>=0?'+'+baseMod:baseMod})
      </div>
      <div style="margin-bottom:4px">
        <label style="font-size:11px">Situational modifier:
          <input type="number" id="nwp-sit-mod" value="0" min="-10" max="10" style="width:50px;margin-left:6px">
        </label>
      </div>
      <div style="font-size:10px;color:#666">Roll d20; succeed if result ≤ final target.</div>
    `;
    MPDialog.confirm(`${p.name} Check`, html, {okText:'Roll', cancelText:'Cancel'}).then(ok=>{
      if(!ok) return;
      const sit = +(document.getElementById('nwp-sit-mod')?.value)||0;
      const finalTarget = baseTarget + sit;
      const roll = Math.floor(Math.random()*20)+1;
      const success = roll <= finalTarget;
      const margin = success ? (finalTarget - roll) : (roll - finalTarget);
      const result = `
        <div style="font-size:12px">
          <b>${ESC(p.name)}</b> (${p.ability})<br>
          Roll: <b style="font-size:16px">${roll}</b> vs target <b>${finalTarget}</b>${sit?` <span style="color:#666">(${baseTarget}${sit>=0?'+'+sit:sit})</span>`:''}<br>
          <span style="color:${success?'#3a6a30':'#8b0000'};font-weight:700;font-size:14px">${success?'SUCCESS':'FAILURE'}</span> by ${margin}
        </div>
      `;
      MPDialog.alert(`${p.name} — Result`, result);
    });
  }

  // ── Tab visibility ──
  function updateTabVisibility(){
    const tab = document.querySelector('.pg-tab[data-page="page3"]');
    if(!tab) return;
    const show = isEnabledForCharacter(window.CHAR || {});
    tab.style.display = show ? '' : 'none';
    if(!show){
      // If hiding the tab while it's active, revert to page1
      if(tab.classList.contains('active')){
        document.querySelectorAll('.pg-tab').forEach(t=>t.classList.remove('active'));
        document.querySelectorAll('.pg-page').forEach(p=>p.classList.remove('active'));
        const p1tab = document.querySelector('.pg-tab[data-page="page1"]');
        const p1 = document.getElementById('page1');
        if(p1tab) p1tab.classList.add('active');
        if(p1) p1.classList.add('active');
      }
    } else {
      render();
    }
  }

  window.ADNDNWP = {
    render, updateTabVisibility, isEnabledForCharacter,
    calcSlots, getClassGroups, openAddDialog
  };
})();
