// gcc-voyage-trade.js v0.1.1 — Merchant venture layer for the GCC Voyage Simulator
// Adds persistent ship ventures, cargo buying/selling, expenses, and ledgers.
// Designed as a separate module so the current gcc-voyage.js can keep working unchanged.
// LocalStorage-only prototype. Do not enable Firestore until the finance schema is finalized.
// Optional: GCC.showToast, makeDraggable.

(function(){
  if (typeof window === 'undefined') return;

  const VERSION = '0.1.1';
  const LOCAL_KEY = 'gcc-voyage-ventures-v1';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
  const gp = n => `${Math.round(Number(n || 0)).toLocaleString()} gp`;
  const nowIso = () => new Date().toISOString();
  const id = p => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const user = () => null;
  const campaignId = () => new URLSearchParams(location.search).get('id') || 'default';
  const toast = msg => {
    if (typeof showToast === 'function') showToast(msg);
    else console.log('[trade]', msg);
  };

  const SHIP_TYPES = {
    sailing_ship: { name:'Sailing Ship', holdTons:120, crewMin:20, wageGpDay:22, supplyGpDay:12, upkeepGpDay:8, repairGpPerHull:40 },
    merchantman: { name:'Merchantman', holdTons:220, crewMin:28, wageGpDay:30, supplyGpDay:16, upkeepGpDay:12, repairGpPerHull:45 },
    cog: { name:'Cog', holdTons:90, crewMin:12, wageGpDay:14, supplyGpDay:8, upkeepGpDay:6, repairGpPerHull:35 },
    caravel: { name:'Caravel', holdTons:70, crewMin:18, wageGpDay:20, supplyGpDay:10, upkeepGpDay:7, repairGpPerHull:45 },
    galley_large: { name:'Large Galley', holdTons:80, crewMin:60, wageGpDay:64, supplyGpDay:36, upkeepGpDay:18, repairGpPerHull:50 },
    old_pirate_ship: { name:'Old Pirate Ship', holdTons:110, crewMin:24, wageGpDay:28, supplyGpDay:14, upkeepGpDay:14, repairGpPerHull:55 }
  };

  const GOODS = {
    grain: { name:'Grain', base:6, ton:1, spoilDays:90, tags:['food','bulk'] },
    salt_fish: { name:'Salt Fish', base:14, ton:1, spoilDays:180, tags:['food'] },
    wool: { name:'Wool / Cloth', base:30, ton:1, spoilDays:0, tags:['textile'] },
    timber: { name:'Timber', base:10, ton:1, spoilDays:0, tags:['bulk'] },
    iron_tools: { name:'Iron Tools', base:75, ton:1, spoilDays:0, tags:['finished'] },
    wine: { name:'Wine', base:90, ton:1, spoilDays:0, tags:['luxury'] },
    spices: { name:'Spices / Luxuries', base:220, ton:1, spoilDays:0, tags:['luxury'] },
    arms: { name:'Arms & Armor', base:160, ton:1, spoilDays:0, tags:['restricted'] }
  };

  const PORT_MARKETS = {
    'City of Greyhawk': { buy:{grain:1.05,wool:0.95,iron_tools:0.85,wine:1.10,spices:1.25,arms:0.95}, sell:{grain:1.10,salt_fish:1.15,wool:1.05,timber:1.20,iron_tools:1.00,wine:1.10,spices:1.30,arms:1.05}, tax:0.04 },
    'Dyvers': { buy:{grain:0.90,wool:0.85,wine:0.95,timber:0.95}, sell:{salt_fish:1.10,iron_tools:1.10,spices:1.25,arms:1.00}, tax:0.03 },
    'Verbobonc': { buy:{grain:0.95,wool:0.80,wine:0.90,timber:0.90}, sell:{salt_fish:1.15,iron_tools:1.15,spices:1.30}, tax:0.03 },
    'Leukish': { buy:{grain:0.95,timber:0.85,wool:1.00}, sell:{wine:1.15,spices:1.30,iron_tools:1.10}, tax:0.04 },
    'Hardby': { buy:{salt_fish:0.90,timber:1.10,wine:1.10}, sell:{grain:1.25,wool:1.20,iron_tools:1.15,spices:1.20,arms:1.10}, tax:0.05 },
    'Safeton': { buy:{salt_fish:0.80,timber:0.90,grain:1.00}, sell:{wool:1.10,wine:1.15,iron_tools:1.15,spices:1.25}, tax:0.04 },
    'Fax': { buy:{salt_fish:0.90,timber:0.95}, sell:{grain:1.15,wool:1.10,iron_tools:1.10,wine:1.10}, tax:0.04 },
    'Port Elredd': { buy:{salt_fish:0.85,timber:0.90}, sell:{grain:1.20,wool:1.10,wine:1.15,iron_tools:1.15,spices:1.25}, tax:0.04 },
    'Nessermouth': { buy:{salt_fish:0.85,timber:0.95}, sell:{grain:1.10,wool:1.05,iron_tools:1.15,wine:1.15}, tax:0.03 },
    'Rel Mord': { buy:{iron_tools:0.85,arms:0.85,grain:1.00}, sell:{salt_fish:1.20,wine:1.20,spices:1.25,wool:1.15}, tax:0.05 },
    'Gradsul': { buy:{salt_fish:0.80,wine:0.95,spices:0.85}, sell:{grain:1.30,wool:1.25,timber:1.20,iron_tools:1.20,arms:1.15}, tax:0.06 }
  };

  const state = { panel:null, activeTab:'ventures', ventures:[], selectedId:null };

  function saveLocal(){
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state.ventures));
  }

  function loadLocal(){
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      state.ventures = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(state.ventures)) state.ventures = [];
    } catch(e) { state.ventures = []; }
  }

  async function saveVenture(v){
    v.updatedAt = nowIso();
    const idx = state.ventures.findIndex(x => x.id === v.id);
    if (idx >= 0) state.ventures[idx] = v; else state.ventures.unshift(v);
    saveLocal();
    render();
  }

  function canEdit(v){
    const u = user();
    if (!u) return true;
    return v.ownerUids?.includes(u.uid) || v.createdByUid === u.uid || v.gmUid === u.uid || v.ownerUids?.length === 0;
  }

  function blankVenture(){
    const u = user();
    const shipType = 'old_pirate_ship';
    const tpl = SHIP_TYPES[shipType];
    return {
      id: id('venture'),
      campaignId: campaignId(),
      name: 'The Surprise Trading Company',
      ownersText: 'Val, Kris',
      ownerUids: u ? [u.uid] : [],
      createdByUid: u?.uid || null,
      createdByName: u?.displayName || u?.email || 'Local User',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      shipName: 'Surprise',
      shipType,
      captain: 'Hired Captain',
      crewQuality: 'average',
      currentPort: 'City of Greyhawk',
      fundGp: 10000,
      hullCurrent: 25,
      hullMax: 25,
      holdTons: tpl.holdTons,
      wageGpDay: tpl.wageGpDay,
      supplyGpDay: tpl.supplyGpDay,
      upkeepGpDay: tpl.upkeepGpDay,
      orders: 'Trade for profit. Avoid unnecessary combat. Do not risk the ship for speculative cargo.',
      cargo: [],
      ledger: [{ id:id('led'), at:nowIso(), type:'capital', text:'Initial trading fund assigned to captain.', gp:10000, fundAfter:10000 }],
      status: 'in_port'
    };
  }

  function selected(){ return state.ventures.find(v => v.id === state.selectedId) || state.ventures[0] || null; }

  function usedHold(v){ return (v.cargo || []).reduce((t,c) => t + (Number(c.qty||0) * Number(GOODS[c.goodId]?.ton || 1)), 0); }
  function market(port){ return PORT_MARKETS[port] || PORT_MARKETS['City of Greyhawk']; }
  function priceAt(port, goodId, mode){
    const g = GOODS[goodId]; if (!g) return 0;
    const m = market(port);
    const mult = (m[mode] && m[mode][goodId]) || 1;
    return Math.max(1, Math.round(g.base * mult));
  }
  function taxAt(port, gross){ return Math.round(gross * (market(port).tax || 0)); }

  function addLedger(v, type, text, gpDelta){
    v.fundGp = Math.round(Number(v.fundGp || 0) + Number(gpDelta || 0));
    v.ledger = v.ledger || [];
    v.ledger.unshift({ id:id('led'), at:nowIso(), type, text, gp:Math.round(gpDelta), fundAfter:v.fundGp });
  }

  async function buyCargo(v, goodId, qty){
    qty = Math.max(0, Math.floor(Number(qty || 0)));
    if (!qty) return toast('Enter cargo quantity.');
    const g = GOODS[goodId]; if (!g) return;
    const tons = qty * g.ton;
    if (usedHold(v) + tons > Number(v.holdTons || 0)) return toast('Not enough cargo space.');
    const unit = priceAt(v.currentPort, goodId, 'buy');
    const gross = unit * qty;
    const tax = taxAt(v.currentPort, gross);
    const total = gross + tax;
    if (total > Number(v.fundGp || 0)) return toast('Not enough venture funds.');
    const lot = { id:id('cargo'), goodId, qty, boughtAt:v.currentPort, unitCost:unit, taxPaid:tax, boughtOn:nowIso(), daysAtSea:0 };
    v.cargo.push(lot);
    addLedger(v, 'buy', `Bought ${qty} ton(s) ${g.name} at ${v.currentPort} (${gp(unit)}/ton, ${gp(tax)} tax).`, -total);
    await saveVenture(v);
  }

  async function sellCargo(v, cargoId, qty){
    const lot = (v.cargo || []).find(c => c.id === cargoId);
    if (!lot) return;
    qty = Math.max(0, Math.min(Math.floor(Number(qty || lot.qty)), lot.qty));
    if (!qty) return;
    const g = GOODS[lot.goodId];
    const unit = priceAt(v.currentPort, lot.goodId, 'sell');
    const gross = unit * qty;
    const tax = taxAt(v.currentPort, gross);
    const net = gross - tax;
    lot.qty -= qty;
    if (lot.qty <= 0) v.cargo = v.cargo.filter(c => c.id !== cargoId);
    addLedger(v, 'sell', `Sold ${qty} ton(s) ${g.name} at ${v.currentPort} (${gp(unit)}/ton, ${gp(tax)} tax).`, net);
    await saveVenture(v);
  }

  async function chargeDays(v, days){
    days = Math.max(1, Math.floor(Number(days || 1)));
    const perDay = Number(v.wageGpDay||0) + Number(v.supplyGpDay||0) + Number(v.upkeepGpDay||0);
    const total = perDay * days;
    (v.cargo || []).forEach(c => c.daysAtSea = Number(c.daysAtSea || 0) + days);
    addLedger(v, 'expense', `${days} day(s) wages, supplies, and upkeep for ${v.shipName}.`, -total);
    await saveVenture(v);
  }

  async function repairHull(v, hp){
    hp = Math.max(1, Math.floor(Number(hp || 1)));
    const tpl = SHIP_TYPES[v.shipType] || SHIP_TYPES.sailing_ship;
    hp = Math.min(hp, Number(v.hullMax || 0) - Number(v.hullCurrent || 0));
    if (hp <= 0) return toast('Hull is already fully repaired.');
    const cost = hp * Number(tpl.repairGpPerHull || 40);
    if (cost > Number(v.fundGp || 0)) return toast('Not enough funds for repairs.');
    v.hullCurrent = Number(v.hullCurrent || 0) + hp;
    addLedger(v, 'repair', `Repaired ${hp} hull HP at ${v.currentPort}.`, -cost);
    await saveVenture(v);
  }

  async function applyVoyageResult(v, days, destPort, hullDamage){
    days = Math.max(0, Math.floor(Number(days || 0)));
    hullDamage = Math.max(0, Math.floor(Number(hullDamage || 0)));
    if (days) await chargeDays(v, days);
    v = selected();
    if (hullDamage) {
      v.hullCurrent = Math.max(0, Number(v.hullCurrent || 0) - hullDamage);
      addLedger(v, 'damage', `Voyage damage: ${hullDamage} hull HP lost.`, 0);
    }
    if (destPort && PORT_MARKETS[destPort]) {
      v.currentPort = destPort;
      addLedger(v, 'port', `${v.shipName} arrived at ${destPort}.`, 0);
    }
    await saveVenture(v);
  }

  function render(){
    if (!state.panel) return;
    state.panel.querySelectorAll('.vt-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === state.activeTab));
    const body = state.panel.querySelector('.vt-body');
    if (state.activeTab === 'ventures') body.innerHTML = venturesHTML();
    if (state.activeTab === 'market') body.innerHTML = marketHTML();
    if (state.activeTab === 'ledger') body.innerHTML = ledgerHTML();
    wireBody();
  }

  function panelHTML(){
    return `<div class="vt-panel">
      <div class="vt-hdr"><b>💰 Merchant Ventures</b><button class="vt-close">✕</button></div>
      <div class="vt-tabs">
        <button class="vt-tab active" data-tab="ventures">Ventures</button>
        <button class="vt-tab" data-tab="market">Market</button>
        <button class="vt-tab" data-tab="ledger">Ledger</button>
      </div>
      <div class="vt-body"></div>
    </div>`;
  }

  function venturesHTML(){
    const v = selected();
    const list = state.ventures.map(x => `<option value="${esc(x.id)}" ${x.id===state.selectedId?'selected':''}>${esc(x.name)} — ${esc(x.shipName)}</option>`).join('');
    if (!v) return `<div class="vt-empty">No merchant ventures yet.</div><button id="vt-new">Create The Surprise</button>`;
    const tpl = SHIP_TYPES[v.shipType] || SHIP_TYPES.sailing_ship;
    return `<div class="vt-row"><label>Venture</label><select id="vt-select">${list}</select><button id="vt-new">New</button></div>
      <div class="vt-card">
        <div class="vt-grid">
          <label>Name<input id="vt-name" value="${esc(v.name)}"></label>
          <label>Owners<input id="vt-owners" value="${esc(v.ownersText)}"></label>
          <label>Ship<input id="vt-ship-name" value="${esc(v.shipName)}"></label>
          <label>Ship Type<select id="vt-ship-type">${Object.entries(SHIP_TYPES).map(([k,s]) => `<option value="${k}" ${k===v.shipType?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label>
          <label>Captain<input id="vt-captain" value="${esc(v.captain)}"></label>
          <label>Current Port<select id="vt-port">${Object.keys(PORT_MARKETS).map(p => `<option ${p===v.currentPort?'selected':''}>${esc(p)}</option>`).join('')}</select></label>
          <label>Fund GP<input type="number" id="vt-fund" value="${Number(v.fundGp||0)}"></label>
          <label>Hold Tons<input type="number" id="vt-hold" value="${Number(v.holdTons||tpl.holdTons)}"></label>
          <label>Hull<input id="vt-hull" value="${Number(v.hullCurrent||0)} / ${Number(v.hullMax||0)}"></label>
          <label>Daily Cost<input disabled value="${gp(Number(v.wageGpDay||0)+Number(v.supplyGpDay||0)+Number(v.upkeepGpDay||0))}/day"></label>
        </div>
        <label>Standing Orders<textarea id="vt-orders">${esc(v.orders)}</textarea></label>
        <div class="vt-actions"><button id="vt-save">Save Venture</button><button id="vt-export">Copy JSON</button></div>
      </div>`;
  }

  function marketHTML(){
    const v = selected();
    if (!v) return `<div class="vt-empty">Create a venture first.</div>`;
    const hold = `${usedHold(v)} / ${Number(v.holdTons||0)} tons`;
    const rows = Object.entries(GOODS).map(([gid,g]) => `<tr><td>${esc(g.name)}</td><td>${gp(priceAt(v.currentPort,gid,'buy'))}</td><td>${gp(priceAt(v.currentPort,gid,'sell'))}</td><td><input class="vt-buy-qty" data-good="${gid}" type="number" min="0" value="1"></td><td><button class="vt-buy" data-good="${gid}">Buy</button></td></tr>`).join('');
    const cargo = (v.cargo||[]).length ? v.cargo.map(c => {
      const g = GOODS[c.goodId];
      const sell = priceAt(v.currentPort,c.goodId,'sell');
      const est = (sell * c.qty) - taxAt(v.currentPort, sell*c.qty);
      return `<tr><td>${esc(g.name)}</td><td>${c.qty}</td><td>${esc(c.boughtAt)}</td><td>${gp(c.unitCost)}</td><td>${gp(est)}</td><td><input class="vt-sell-qty" data-cargo="${c.id}" type="number" min="0" max="${c.qty}" value="${c.qty}"></td><td><button class="vt-sell" data-cargo="${c.id}">Sell</button></td></tr>`;
    }).join('') : `<tr><td colspan="7">No cargo aboard.</td></tr>`;
    return `<div class="vt-summary"><b>${esc(v.shipName)}</b> at ${esc(v.currentPort)} · Fund ${gp(v.fundGp)} · Hold ${hold}</div>
      <h3>Buy Cargo</h3><table><thead><tr><th>Good</th><th>Buy</th><th>Sell</th><th>Qty</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      <h3>Cargo Aboard</h3><table><thead><tr><th>Good</th><th>Qty</th><th>Bought At</th><th>Cost</th><th>Est. Net</th><th>Qty</th><th></th></tr></thead><tbody>${cargo}</tbody></table>
      <h3>Voyage Accounting</h3><div class="vt-row"><label>Days<input id="vt-days" type="number" value="1"></label><label>Arrive Port<select id="vt-arrive">${Object.keys(PORT_MARKETS).map(p => `<option ${p===v.currentPort?'selected':''}>${esc(p)}</option>`).join('')}</select></label><label>Hull Damage<input id="vt-damage" type="number" value="0"></label><button id="vt-apply-voyage">Apply Voyage Result</button></div>
      <div class="vt-row"><label>Repair HP<input id="vt-repair-hp" type="number" value="1"></label><button id="vt-repair">Repair Hull</button></div>`;
  }

  function ledgerHTML(){
    const v = selected();
    if (!v) return `<div class="vt-empty">Create a venture first.</div>`;
    const rows = (v.ledger || []).map(l => `<tr><td>${esc(new Date(l.at).toLocaleString())}</td><td>${esc(l.type)}</td><td>${esc(l.text)}</td><td class="${Number(l.gp)<0?'neg':'pos'}">${Number(l.gp)>=0?'+':''}${gp(l.gp)}</td><td>${gp(l.fundAfter)}</td></tr>`).join('');
    return `<div class="vt-summary"><b>${esc(v.name)}</b> · ${esc(v.ownersText)} · Fund ${gp(v.fundGp)}</div><table><thead><tr><th>Date</th><th>Type</th><th>Entry</th><th>GP</th><th>Fund</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function readVentureForm(v){
    v.name = state.panel.querySelector('#vt-name').value.trim() || v.name;
    v.ownersText = state.panel.querySelector('#vt-owners').value.trim();
    v.shipName = state.panel.querySelector('#vt-ship-name').value.trim() || v.shipName;
    v.shipType = state.panel.querySelector('#vt-ship-type').value;
    v.captain = state.panel.querySelector('#vt-captain').value.trim();
    v.currentPort = state.panel.querySelector('#vt-port').value;
    v.fundGp = Math.round(Number(state.panel.querySelector('#vt-fund').value || 0));
    v.holdTons = Math.round(Number(state.panel.querySelector('#vt-hold').value || 0));
    v.orders = state.panel.querySelector('#vt-orders').value.trim();
    const hullText = state.panel.querySelector('#vt-hull').value;
    const m = hullText.match(/(\d+)\s*\/\s*(\d+)/);
    if (m) { v.hullCurrent = Number(m[1]); v.hullMax = Number(m[2]); }
    return v;
  }

  function wireBody(){
    state.panel.querySelector('#vt-new')?.addEventListener('click', async () => {
      const v = blankVenture(); state.selectedId = v.id; await saveVenture(v);
    });
    state.panel.querySelector('#vt-select')?.addEventListener('change', e => { state.selectedId = e.target.value; render(); });
    state.panel.querySelector('#vt-save')?.addEventListener('click', async () => {
      const v = selected(); if (!v || !canEdit(v)) return toast('You do not have permission to edit this venture.');
      await saveVenture(readVentureForm(v)); toast('Venture saved.');
    });
    state.panel.querySelector('#vt-export')?.addEventListener('click', async () => {
      const v = selected(); if (!v) return;
      await navigator.clipboard.writeText(JSON.stringify(v, null, 2)); toast('Venture JSON copied.');
    });
    state.panel.querySelectorAll('.vt-buy').forEach(b => b.addEventListener('click', () => {
      const v = selected(); if (!v) return;
      const good = b.dataset.good;
      const qty = state.panel.querySelector(`.vt-buy-qty[data-good="${good}"]`).value;
      buyCargo(v, good, qty);
    }));
    state.panel.querySelectorAll('.vt-sell').forEach(b => b.addEventListener('click', () => {
      const v = selected(); if (!v) return;
      const cid = b.dataset.cargo;
      const qty = state.panel.querySelector(`.vt-sell-qty[data-cargo="${cid}"]`).value;
      sellCargo(v, cid, qty);
    }));
    state.panel.querySelector('#vt-apply-voyage')?.addEventListener('click', () => {
      const v = selected(); if (!v) return;
      applyVoyageResult(v, state.panel.querySelector('#vt-days').value, state.panel.querySelector('#vt-arrive').value, state.panel.querySelector('#vt-damage').value);
    });
    state.panel.querySelector('#vt-repair')?.addEventListener('click', () => {
      const v = selected(); if (!v) return;
      repairHull(v, state.panel.querySelector('#vt-repair-hp').value);
    });
  }

  function addStyles(){
    if (document.getElementById('vt-styles')) return;
    const s = document.createElement('style');
    s.id = 'vt-styles';
    s.textContent = `
      .vt-launch{margin-left:4px}#btn-trade.active{background:rgba(200,148,26,.22);border-color:var(--gold,#c8941a);color:var(--gold-light,#e8b840)}.vt-panel{position:fixed;z-index:9999;left:72px;top:calc(var(--gcc-bar-h,44px) + 56px);width:min(860px,calc(100vw - 32px));max-height:calc(100vh - var(--gcc-bar-h,44px) - 70px);background:#17120c;color:#ead9b4;border:1px solid #7d5b2d;box-shadow:0 18px 50px #000b;border-radius:12px;overflow:hidden;font:14px system-ui,Segoe UI,sans-serif}.vt-hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#2b1a0c;border-bottom:1px solid #7d5b2d;cursor:move}.vt-close{background:#3a2412;color:#f5d99a;border:1px solid #8b6430;border-radius:6px}.vt-tabs{display:flex;gap:6px;padding:8px;background:#20160d;border-bottom:1px solid #58401f}.vt-tab{background:#302111;color:#d9bd82;border:1px solid #6d5129;border-radius:8px;padding:6px 10px}.vt-tab.active{background:#74521f;color:#fff0bc}.vt-body{padding:12px;overflow:auto;max-height:calc(82vh - 92px)}.vt-row{display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin:8px 0}.vt-card{background:#21170e;border:1px solid #5b4425;border-radius:10px;padding:10px}.vt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px} .vt-panel label{display:flex;flex-direction:column;gap:3px;color:#cda866;font-size:12px;text-transform:uppercase;letter-spacing:.04em}.vt-panel input,.vt-panel select,.vt-panel textarea{background:#0f0b07;color:#f2e2bd;border:1px solid #6a4d26;border-radius:6px;padding:6px}.vt-panel textarea{min-height:72px}.vt-actions{margin-top:10px;display:flex;gap:8px}.vt-panel button{background:#563715;color:#ffe3a1;border:1px solid #9b7231;border-radius:7px;padding:6px 10px}.vt-summary{margin-bottom:10px;padding:8px;background:#24190e;border:1px solid #58401f;border-radius:8px}.vt-panel table{width:100%;border-collapse:collapse;margin:6px 0 12px}.vt-panel th,.vt-panel td{border-bottom:1px solid #43311b;padding:6px;text-align:left}.vt-panel th{color:#d6a84f}.vt-empty{padding:16px;color:#c9a76d}.neg{color:#ff9d7a}.pos{color:#9ce28a}`;
    document.head.appendChild(s);
  }

  function openPanel(){
    addStyles();
    if (state.panel) { state.panel.style.display = 'block'; setButtonActive(true); render(); return; }
    const wrap = document.createElement('div');
    wrap.innerHTML = panelHTML();
    state.panel = wrap.firstElementChild;
    document.body.appendChild(state.panel);
    state.panel.querySelector('.vt-close').addEventListener('click', closePanel);
    state.panel.querySelectorAll('.vt-tab').forEach(t => t.addEventListener('click', () => { state.activeTab = t.dataset.tab; render(); }));
    if (typeof makeDraggable === 'function') makeDraggable(state.panel, state.panel.querySelector('.vt-hdr'), 'gcc-voyage-trade-pos')?.restore?.();
    setButtonActive(true);
    render();
  }

  function setButtonActive(active){
    const btn = document.getElementById('btn-trade');
    if (btn) btn.classList.toggle('active', !!active);
  }

  function closePanel(){
    if (state.panel) state.panel.style.display = 'none';
    setButtonActive(false);
  }

  function installButton(){
    let btn = document.getElementById('btn-trade') || document.querySelector('.vt-launch');
    if (!btn){
      const financeBtn = document.getElementById('btn-finance');
      const voyageBtn = document.getElementById('btn-voyage') || [...document.querySelectorAll('button')].find(b => /Voyage/i.test(b.textContent));
      btn = document.createElement('button');
      btn.id = 'btn-trade';
      if (financeBtn && financeBtn.parentNode) financeBtn.insertAdjacentElement('afterend', btn);
      else if (voyageBtn && voyageBtn.parentNode) voyageBtn.insertAdjacentElement('afterend', btn);
      else document.body.appendChild(btn);
    }
    btn.id = 'btn-trade';
    btn.classList.add('tb-btn', 'vt-launch');
    btn.type = 'button';
    btn.dataset.hideable = 'true';
    btn.dataset.label = 'Merchant Trade';
    btn.textContent = '📦 Trade';
    btn.title = 'Open Merchant Trade (ship ventures, cargo, port markets)';
    btn.onclick = openPanel;
  }

  async function init(){
    loadLocal();
    if (state.ventures[0]) state.selectedId = state.ventures[0].id;
    installButton();
    console.log(`[trade] gcc-voyage-trade.js v${VERSION} loaded (localStorage only)`);
  }

  window.GCCVoyageTrade = { open:openPanel, newVenture:blankVenture, goods:GOODS, shipTypes:SHIP_TYPES, markets:PORT_MARKETS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
