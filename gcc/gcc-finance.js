// gcc-finance.js v0.1.1 — Campaign finance and AD&D venture ledger
// Drop-in browser module for Graycloak's Campaign Corner.
//
// Goals for this first slice:
// - Add a Finance button/panel without disturbing the existing map/voyage UI.
// - Track AD&D character funds, shared ventures, assets, and immutable ledger entries.
// - Provide a clean bridge for voyage/trade modules to debit/credit ventures.
// - Use localStorage by default, with a Firestore-ready adapter seam for later multiplayer sync.

(function(){
  if (typeof window === 'undefined') return;

  const VERSION = '0.1.1';
  const STORAGE_KEY = 'gcc.finance.v1';
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const nowIso = () => new Date().toISOString();
  const uid = (prefix='id') => `${prefix}_${Math.random().toString(36).slice(2,8)}_${Date.now().toString(36)}`;
  const gp = n => `${Number(n || 0).toLocaleString()} gp`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const DEFAULT_STATE = {
    version: 1,
    campaign: {
      name: 'Greyhawk Campaign',
      calendar: { day: 1, month: 'Needfest', year: 576 }
    },
    characters: [
      { id:'char_val', name:'Val', player:'Bruce', carriedGp:0, bankedGp:0, notes:'' },
      { id:'char_kris', name:'Kris', player:'Matt', carriedGp:0, bankedGp:0, notes:'' }
    ],
    ventures: [
      {
        id:'venture_surprise',
        name:'The Surprise Trading Company',
        type:'maritime_trade',
        owners:[
          { characterId:'char_val', sharePct:50 },
          { characterId:'char_kris', sharePct:50 }
        ],
        treasuryGp:10000,
        currentPort:'City of Greyhawk',
        standingOrders:'Trade for profit, avoid unnecessary risk, preserve the ship.',
        notes:'Val and Kris purchased an old pirate ship named Surprise, hired a captain, and gave him 10,000 gp to trade.',
        assetIds:['asset_surprise']
      }
    ],
    assets: [
      {
        id:'asset_surprise',
        name:'Surprise',
        type:'ship',
        linkedVentureId:'venture_surprise',
        conditionPct:100,
        location:'City of Greyhawk',
        captain:'Hired Captain',
        crew:'Hired crew',
        estimatedValueGp:0,
        notes:'Old pirate ship. Exact AD&D ship class/value still to be assigned.'
      }
    ],
    transactions: [
      {
        id:'txn_seed_surprise',
        createdAt: nowIso(),
        gameDate:'1 Needfest 576 CY',
        accountType:'venture',
        accountId:'venture_surprise',
        amountGp:10000,
        category:'capital',
        memo:'Initial trading capital from Val and Kris.',
        source:'manual',
        links:[{ type:'character', id:'char_val' }, { type:'character', id:'char_kris' }, { type:'asset', id:'asset_surprise' }]
      }
    ]
  };

  const clone = obj => JSON.parse(JSON.stringify(obj));

  function loadState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      return migrateState(parsed);
    } catch (err){
      console.warn('[finance] failed to load state; using defaults', err);
      return clone(DEFAULT_STATE);
    }
  }

  function migrateState(state){
    const s = Object.assign(clone(DEFAULT_STATE), state || {});
    s.characters = Array.isArray(s.characters) ? s.characters : [];
    s.ventures = Array.isArray(s.ventures) ? s.ventures : [];
    s.assets = Array.isArray(s.assets) ? s.assets : [];
    s.transactions = Array.isArray(s.transactions) ? s.transactions : [];
    return s;
  }

  function saveState(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    document.dispatchEvent(new CustomEvent('gcc:finance:changed', { detail:{ state: clone(state) }}));
  }

  let state = loadState();
  const ui = { panel:null, activeTab:'overview' };

  // ── Public API for voyage/trade integration ─────────────────────────────
  function getState(){ return clone(state); }
  function findCharacter(id){ return state.characters.find(c => c.id === id); }
  function findVenture(id){ return state.ventures.find(v => v.id === id); }
  function findAsset(id){ return state.assets.find(a => a.id === id); }
  function transactionsFor(accountType, accountId){
    return state.transactions.filter(t => t.accountType === accountType && t.accountId === accountId);
  }

  function addTransaction(txn){
    const amount = Number(txn.amountGp || 0);
    if (!Number.isFinite(amount)) throw new Error('Transaction amount must be a number.');
    const entry = {
      id: txn.id || uid('txn'),
      createdAt: txn.createdAt || nowIso(),
      gameDate: txn.gameDate || currentGameDate(),
      accountType: txn.accountType,
      accountId: txn.accountId,
      amountGp: amount,
      category: txn.category || 'misc',
      memo: txn.memo || '',
      source: txn.source || 'manual',
      links: Array.isArray(txn.links) ? txn.links : []
    };

    if (entry.accountType === 'character'){
      const c = findCharacter(entry.accountId);
      if (!c) throw new Error('Character account not found.');
      c.bankedGp = Number(c.bankedGp || 0) + amount;
    } else if (entry.accountType === 'venture'){
      const v = findVenture(entry.accountId);
      if (!v) throw new Error('Venture account not found.');
      v.treasuryGp = Number(v.treasuryGp || 0) + amount;
    } else {
      throw new Error('Unsupported account type: ' + entry.accountType);
    }

    state.transactions.unshift(entry);
    saveState();
    render();
    return clone(entry);
  }

  function transferGp({ fromType, fromId, toType, toId, amountGp, memo, category='transfer', source='manual' }){
    const amount = Math.abs(Number(amountGp || 0));
    if (!amount) throw new Error('Transfer amount must be greater than zero.');
    const batchId = uid('batch');
    const out = addTransaction({ accountType:fromType, accountId:fromId, amountGp:-amount, memo, category, source, links:[{ type:toType, id:toId }, { type:'batch', id:batchId }] });
    const inn = addTransaction({ accountType:toType, accountId:toId, amountGp:amount, memo, category, source, links:[{ type:fromType, id:fromId }, { type:'batch', id:batchId }] });
    return { debit:out, credit:inn };
  }

  function currentGameDate(){
    const c = state.campaign?.calendar;
    if (!c) return '';
    return `${c.day || 1} ${c.month || 'Needfest'} ${c.year || 576} CY`;
  }

  function createVenture(data){
    const venture = {
      id: data.id || uid('venture'),
      name: data.name || 'New Venture',
      type: data.type || 'business',
      owners: Array.isArray(data.owners) ? data.owners : [],
      treasuryGp: Number(data.treasuryGp || 0),
      currentPort: data.currentPort || '',
      standingOrders: data.standingOrders || '',
      notes: data.notes || '',
      assetIds: Array.isArray(data.assetIds) ? data.assetIds : []
    };
    state.ventures.push(venture);
    if (venture.treasuryGp){
      state.transactions.unshift({
        id: uid('txn'), createdAt: nowIso(), gameDate: currentGameDate(),
        accountType:'venture', accountId:venture.id, amountGp:venture.treasuryGp,
        category:'capital', memo:'Initial venture capital.', source:'manual', links:[]
      });
    }
    saveState();
    render();
    return clone(venture);
  }

  function createCharacter(data){
    const character = {
      id: data.id || uid('char'),
      name: data.name || 'New Character',
      player: data.player || '',
      carriedGp: Number(data.carriedGp || 0),
      bankedGp: Number(data.bankedGp || 0),
      notes: data.notes || ''
    };
    state.characters.push(character);
    saveState();
    render();
    return clone(character);
  }

  function createAsset(data){
    const asset = {
      id: data.id || uid('asset'),
      name: data.name || 'New Asset',
      type: data.type || 'property',
      linkedVentureId: data.linkedVentureId || '',
      conditionPct: Number(data.conditionPct ?? 100),
      location: data.location || '',
      captain: data.captain || '',
      crew: data.crew || '',
      estimatedValueGp: Number(data.estimatedValueGp || 0),
      notes: data.notes || ''
    };
    state.assets.push(asset);
    const v = asset.linkedVentureId ? findVenture(asset.linkedVentureId) : null;
    if (v && !v.assetIds.includes(asset.id)) v.assetIds.push(asset.id);
    saveState();
    render();
    return clone(asset);
  }

  // Useful bridge for gcc-voyage-trade.js / gcc-voyage.js.
  function applyVoyageResult({ ventureId, assetId, port, profitGp=0, expensesGp=0, repairsGp=0, cargoMemo='', voyageId='' }){
    const v = findVenture(ventureId);
    if (!v) throw new Error('Venture not found.');
    const links = [{ type:'venture', id:ventureId }];
    if (assetId) links.push({ type:'asset', id:assetId });
    if (voyageId) links.push({ type:'voyage', id:voyageId });

    if (expensesGp) addTransaction({ accountType:'venture', accountId:ventureId, amountGp:-Math.abs(expensesGp), category:'voyage_expense', memo:'Voyage expenses. ' + cargoMemo, source:'voyage', links });
    if (repairsGp) addTransaction({ accountType:'venture', accountId:ventureId, amountGp:-Math.abs(repairsGp), category:'repair', memo:'Ship repairs after voyage. ' + cargoMemo, source:'voyage', links });
    if (profitGp) addTransaction({ accountType:'venture', accountId:ventureId, amountGp:Number(profitGp), category:'trade_profit', memo:'Trade result. ' + cargoMemo, source:'voyage', links });

    v.currentPort = port || v.currentPort;
    const a = assetId ? findAsset(assetId) : null;
    if (a && port) a.location = port;
    saveState();
    render();
    return clone(v);
  }

  // ── UI ──────────────────────────────────────────────────────────────────
  function injectStyles(){
    if ($('#gcc-finance-style')) return;
    const style = document.createElement('style');
    style.id = 'gcc-finance-style';
    style.textContent = `
      .gcc-finance-btn{ margin-left:.35rem; }
      #btn-finance.active{ background:rgba(200,148,26,.22); border-color:var(--gold,#c8941a); color:var(--gold-light,#e8b840); }
      .gcc-finance-panel{ position:fixed; right:18px; top:calc(var(--gcc-bar-h,44px) + 56px); width:min(980px, calc(100vw - 36px)); max-height:calc(100vh - var(--gcc-bar-h,44px) - 70px); overflow:auto; z-index:10000; background:#14110d; color:#f4ead4; border:1px solid #8b6f3f; box-shadow:0 18px 50px rgba(0,0,0,.55); border-radius:10px; font:14px/1.35 system-ui,Segoe UI,Roboto,sans-serif; }
      .gcc-finance-head{ display:flex; gap:12px; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid #6f5730; background:linear-gradient(#2a2115,#1b150e); position:sticky; top:0; z-index:2; }
      .gcc-finance-head h2{ margin:0; font-size:18px; letter-spacing:.02em; }
      .gcc-finance-close{ background:#3a2a18; color:#f4ead4; border:1px solid #8b6f3f; border-radius:7px; padding:4px 9px; cursor:pointer; }
      .gcc-finance-tabs{ display:flex; gap:6px; flex-wrap:wrap; padding:10px 14px; border-bottom:1px solid #44331d; background:#18130d; }
      .gcc-finance-tabs button{ background:#2a2115; color:#d8c79d; border:1px solid #6f5730; border-radius:999px; padding:5px 10px; cursor:pointer; }
      .gcc-finance-tabs button.active{ background:#8b6f3f; color:#171008; font-weight:700; }
      .gcc-finance-body{ padding:14px; }
      .gcc-finance-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:12px; }
      .gcc-card{ background:#1d1710; border:1px solid #4e3a21; border-radius:9px; padding:12px; }
      .gcc-card h3{ margin:.1rem 0 .45rem; font-size:15px; color:#ffe0a0; }
      .gcc-muted{ color:#bcae91; font-size:12px; }
      .gcc-big{ font-size:22px; font-weight:800; }
      .gcc-table{ width:100%; border-collapse:collapse; }
      .gcc-table th,.gcc-table td{ border-bottom:1px solid #342817; padding:7px 6px; text-align:left; vertical-align:top; }
      .gcc-table th{ color:#ffe0a0; font-size:12px; text-transform:uppercase; letter-spacing:.06em; }
      .gcc-table td.amount-pos{ color:#9be58f; font-weight:700; }
      .gcc-table td.amount-neg{ color:#ffb08f; font-weight:700; }
      .gcc-form{ display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:8px; align-items:end; }
      .gcc-form label{ display:grid; gap:3px; color:#d8c79d; font-size:12px; }
      .gcc-form input,.gcc-form select,.gcc-form textarea{ background:#0f0c08; color:#f4ead4; border:1px solid #5b4426; border-radius:6px; padding:7px; }
      .gcc-form textarea{ min-height:58px; }
      .gcc-action{ background:#5f4727; color:#fff3cf; border:1px solid #a18145; border-radius:7px; padding:8px 10px; cursor:pointer; font-weight:700; }
      .gcc-action:hover{ filter:brightness(1.12); }
    `;
    document.head.appendChild(style);
  }

  function setButtonActive(active){
    const btn = $('#btn-finance');
    if (btn) btn.classList.toggle('active', !!active);
  }

  function ensureButton(){
    let btn = $('#btn-finance');
    if (!btn){
      const voyageBtn = $('#btn-voyage');
      btn = document.createElement('button');
      btn.id = 'btn-finance';
      if (voyageBtn && voyageBtn.parentNode) voyageBtn.insertAdjacentElement('afterend', btn);
      else document.body.appendChild(btn);
    }
    btn.classList.add('tb-btn', 'gcc-finance-btn');
    btn.type = 'button';
    btn.dataset.hideable = 'true';
    btn.dataset.label = 'Campaign Finance';
    btn.title = 'Open Campaign Finance (characters, ventures, assets, ledgers)';
    btn.textContent = '💰 Finance';
    btn.onclick = togglePanel;
  }

  function closePanel(){
    if (ui.panel){ ui.panel.remove(); ui.panel = null; }
    setButtonActive(false);
  }

  function togglePanel(){
    if (ui.panel){ closePanel(); return; }
    openPanel();
  }

  function openPanel(){
    injectStyles();
    if (ui.panel) ui.panel.remove();
    ui.panel = document.createElement('section');
    ui.panel.className = 'gcc-finance-panel';
    ui.panel.innerHTML = shellHtml();
    document.body.appendChild(ui.panel);
    setButtonActive(true);
    bindPanel();
    render();
  }

  function shellHtml(){
    return `
      <div class="gcc-finance-head">
        <h2>💰 Campaign Finance <span class="gcc-muted">v${VERSION}</span></h2>
        <button class="gcc-finance-close" data-finance-close>✕</button>
      </div>
      <div class="gcc-finance-tabs">
        ${tabButton('overview','Overview')}
        ${tabButton('characters','Characters')}
        ${tabButton('ventures','Ventures')}
        ${tabButton('assets','Assets')}
        ${tabButton('ledger','Ledger')}
        ${tabButton('tools','Tools')}
      </div>
      <div class="gcc-finance-body" data-finance-body></div>
    `;
  }

  function tabButton(id, label){ return `<button type="button" data-finance-tab="${id}" class="${ui.activeTab===id?'active':''}">${label}</button>`; }

  function bindPanel(){
    ui.panel.addEventListener('click', ev => {
      const close = ev.target.closest('[data-finance-close]');
      if (close){ closePanel(); return; }
      const tab = ev.target.closest('[data-finance-tab]');
      if (tab){ ui.activeTab = tab.dataset.financeTab; render(); return; }
      const action = ev.target.closest('[data-finance-action]');
      if (action){ handleAction(action.dataset.financeAction, action); }
    });
  }

  function render(){
    if (!ui.panel) return;
    $$('.gcc-finance-tabs button', ui.panel).forEach(b => b.classList.toggle('active', b.dataset.financeTab === ui.activeTab));
    const body = $('[data-finance-body]', ui.panel);
    if (!body) return;
    const renderers = { overview:renderOverview, characters:renderCharacters, ventures:renderVentures, assets:renderAssets, ledger:renderLedger, tools:renderTools };
    body.innerHTML = (renderers[ui.activeTab] || renderOverview)();
  }

  function renderOverview(){
    const totalCharacters = state.characters.reduce((t,c)=>t+Number(c.carriedGp||0)+Number(c.bankedGp||0),0);
    const totalVentures = state.ventures.reduce((t,v)=>t+Number(v.treasuryGp||0),0);
    const totalAssets = state.assets.reduce((t,a)=>t+Number(a.estimatedValueGp||0),0);
    const surprise = findVenture('venture_surprise') || state.ventures[0];
    return `
      <div class="gcc-finance-grid">
        <div class="gcc-card"><h3>Character Money</h3><div class="gcc-big">${gp(totalCharacters)}</div><div class="gcc-muted">Carried + banked funds.</div></div>
        <div class="gcc-card"><h3>Venture Treasuries</h3><div class="gcc-big">${gp(totalVentures)}</div><div class="gcc-muted">Money tied to businesses and expeditions.</div></div>
        <div class="gcc-card"><h3>Asset Values</h3><div class="gcc-big">${gp(totalAssets)}</div><div class="gcc-muted">Ships, property, warehouses, holdings.</div></div>
      </div>
      ${surprise ? `<div class="gcc-card" style="margin-top:12px"><h3>${esc(surprise.name)}</h3><p><b>Treasury:</b> ${gp(surprise.treasuryGp)} · <b>Port:</b> ${esc(surprise.currentPort || '—')}</p><p class="gcc-muted">${esc(surprise.standingOrders || '')}</p></div>` : ''}
      <div class="gcc-card" style="margin-top:12px"><h3>Next Integration</h3><p>The voyage simulator should call <code>GCCFinance.applyVoyageResult()</code> when a trading voyage ends, and can read ventures with <code>GCCFinance.getState()</code>.</p></div>
    `;
  }

  function renderCharacters(){
    return `
      <div class="gcc-card"><h3>Add Character</h3>
        <div class="gcc-form" data-form="character">
          <label>Name<input name="name" placeholder="Val"></label>
          <label>Player<input name="player" placeholder="Bruce"></label>
          <label>Carried GP<input name="carriedGp" type="number" value="0"></label>
          <label>Banked GP<input name="bankedGp" type="number" value="0"></label>
          <button class="gcc-action" data-finance-action="add-character">Add</button>
        </div>
      </div>
      <table class="gcc-table" style="margin-top:12px"><thead><tr><th>Character</th><th>Player</th><th>Carried</th><th>Banked</th><th>Total</th></tr></thead><tbody>
        ${state.characters.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.player)}</td><td>${gp(c.carriedGp)}</td><td>${gp(c.bankedGp)}</td><td><b>${gp(Number(c.carriedGp||0)+Number(c.bankedGp||0))}</b></td></tr>`).join('')}
      </tbody></table>
    `;
  }

  function ownerNames(v){
    return (v.owners || []).map(o => {
      const c = findCharacter(o.characterId);
      return `${c ? c.name : o.characterId} ${o.sharePct ?? 0}%`;
    }).join(', ');
  }

  function renderVentures(){
    const charOptions = state.characters.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    return `
      <div class="gcc-card"><h3>Add Venture</h3>
        <div class="gcc-form" data-form="venture">
          <label>Name<input name="name" placeholder="The Surprise Trading Company"></label>
          <label>Type<select name="type"><option value="maritime_trade">Maritime Trade</option><option value="business">Business</option><option value="property">Property</option><option value="guild">Guild</option></select></label>
          <label>Owner A<select name="ownerA">${charOptions}</select></label>
          <label>Owner B<select name="ownerB"><option value="">—</option>${charOptions}</select></label>
          <label>Starting GP<input name="treasuryGp" type="number" value="0"></label>
          <label>Current Port<input name="currentPort" placeholder="City of Greyhawk"></label>
          <label style="grid-column:1/-1">Standing Orders<textarea name="standingOrders" placeholder="Trade for profit, avoid storms..."></textarea></label>
          <button class="gcc-action" data-finance-action="add-venture">Add</button>
        </div>
      </div>
      <table class="gcc-table" style="margin-top:12px"><thead><tr><th>Venture</th><th>Type</th><th>Owners</th><th>Treasury</th><th>Location</th><th>Orders</th></tr></thead><tbody>
        ${state.ventures.map(v => `<tr><td><b>${esc(v.name)}</b></td><td>${esc(v.type)}</td><td>${esc(ownerNames(v))}</td><td><b>${gp(v.treasuryGp)}</b></td><td>${esc(v.currentPort || '—')}</td><td class="gcc-muted">${esc(v.standingOrders || '')}</td></tr>`).join('')}
      </tbody></table>
    `;
  }

  function renderAssets(){
    const ventureOptions = ['<option value="">—</option>'].concat(state.ventures.map(v => `<option value="${esc(v.id)}">${esc(v.name)}</option>`)).join('');
    return `
      <div class="gcc-card"><h3>Add Asset</h3>
        <div class="gcc-form" data-form="asset">
          <label>Name<input name="name" placeholder="Surprise"></label>
          <label>Type<select name="type"><option value="ship">Ship</option><option value="warehouse">Warehouse</option><option value="tavern">Tavern</option><option value="property">Property</option><option value="caravan">Caravan</option></select></label>
          <label>Linked Venture<select name="linkedVentureId">${ventureOptions}</select></label>
          <label>Condition %<input name="conditionPct" type="number" value="100"></label>
          <label>Location<input name="location" placeholder="City of Greyhawk"></label>
          <label>Value GP<input name="estimatedValueGp" type="number" value="0"></label>
          <label>Captain/Manager<input name="captain" placeholder="Captain Harl"></label>
          <label>Crew/Staff<input name="crew" placeholder="Hired crew"></label>
          <button class="gcc-action" data-finance-action="add-asset">Add</button>
        </div>
      </div>
      <table class="gcc-table" style="margin-top:12px"><thead><tr><th>Asset</th><th>Type</th><th>Venture</th><th>Condition</th><th>Location</th><th>Value</th><th>Manager</th></tr></thead><tbody>
        ${state.assets.map(a => { const v = a.linkedVentureId ? findVenture(a.linkedVentureId) : null; return `<tr><td><b>${esc(a.name)}</b></td><td>${esc(a.type)}</td><td>${esc(v?.name || '—')}</td><td>${Number(a.conditionPct||0)}%</td><td>${esc(a.location || '—')}</td><td>${gp(a.estimatedValueGp)}</td><td>${esc(a.captain || '—')}</td></tr>`; }).join('')}
      </tbody></table>
    `;
  }

  function renderLedger(){
    return `
      <div class="gcc-card"><h3>Add Manual Transaction</h3>
        <div class="gcc-form" data-form="transaction">
          <label>Account<select name="account">${accountOptions()}</select></label>
          <label>Amount GP<input name="amountGp" type="number" placeholder="-250 or 1200"></label>
          <label>Category<input name="category" placeholder="capital, repair, wages"></label>
          <label>Game Date<input name="gameDate" value="${esc(currentGameDate())}"></label>
          <label style="grid-column:1/-1">Memo<textarea name="memo" placeholder="Paid crew wages..."></textarea></label>
          <button class="gcc-action" data-finance-action="add-transaction">Record</button>
        </div>
      </div>
      <table class="gcc-table" style="margin-top:12px"><thead><tr><th>Date</th><th>Account</th><th>Category</th><th>Memo</th><th>Amount</th></tr></thead><tbody>
        ${state.transactions.map(t => `<tr><td>${esc(t.gameDate || '')}</td><td>${esc(accountLabel(t.accountType,t.accountId))}</td><td>${esc(t.category)}</td><td>${esc(t.memo)}</td><td class="${Number(t.amountGp)>=0?'amount-pos':'amount-neg'}">${Number(t.amountGp)>=0?'+':''}${gp(t.amountGp)}</td></tr>`).join('')}
      </tbody></table>
    `;
  }

  function renderTools(){
    return `
      <div class="gcc-finance-grid">
        <div class="gcc-card"><h3>Export</h3><p class="gcc-muted">Copy the current finance data as JSON.</p><button class="gcc-action" data-finance-action="export-json">Copy JSON</button></div>
        <div class="gcc-card"><h3>Reset Demo Data</h3><p class="gcc-muted">Restores Val, Kris, and the Surprise sample venture.</p><button class="gcc-action" data-finance-action="reset-demo">Reset</button></div>
      </div>
      <div class="gcc-card" style="margin-top:12px"><h3>Voyage API</h3><pre style="white-space:pre-wrap;color:#d8c79d">GCCFinance.applyVoyageResult({
  ventureId: 'venture_surprise',
  assetId: 'asset_surprise',
  port: 'Hardby',
  profitGp: 2480,
  expensesGp: 740,
  repairsGp: 380,
  cargoMemo: 'Wool and grain run from Greyhawk.'
});</pre></div>
    `;
  }

  function accountOptions(){
    const chars = state.characters.map(c => `<option value="character:${esc(c.id)}">Character: ${esc(c.name)}</option>`);
    const vents = state.ventures.map(v => `<option value="venture:${esc(v.id)}">Venture: ${esc(v.name)}</option>`);
    return chars.concat(vents).join('');
  }

  function accountLabel(type, id){
    if (type === 'character') return 'Character: ' + (findCharacter(id)?.name || id);
    if (type === 'venture') return 'Venture: ' + (findVenture(id)?.name || id);
    return `${type}:${id}`;
  }

  function formData(formName){
    const root = ui.panel && $(`[data-form="${formName}"]`, ui.panel);
    if (!root) return {};
    const data = {};
    $$('input,select,textarea', root).forEach(el => data[el.name] = el.value);
    return data;
  }

  function handleAction(action){
    try {
      if (action === 'add-character'){
        const d = formData('character');
        createCharacter(d);
      } else if (action === 'add-venture'){
        const d = formData('venture');
        const owners = [];
        if (d.ownerA) owners.push({ characterId:d.ownerA, sharePct:d.ownerB ? 50 : 100 });
        if (d.ownerB) owners.push({ characterId:d.ownerB, sharePct:50 });
        createVenture(Object.assign(d, { owners }));
      } else if (action === 'add-asset'){
        createAsset(formData('asset'));
      } else if (action === 'add-transaction'){
        const d = formData('transaction');
        const [accountType, accountId] = String(d.account || '').split(':');
        addTransaction({ accountType, accountId, amountGp:Number(d.amountGp || 0), category:d.category, memo:d.memo, gameDate:d.gameDate, source:'manual' });
      } else if (action === 'export-json'){
        navigator.clipboard?.writeText(JSON.stringify(state, null, 2));
        toast('Finance JSON copied.');
      } else if (action === 'reset-demo'){
        if (confirm('Reset finance data to the Val/Kris Surprise demo?')){
          state = clone(DEFAULT_STATE);
          saveState();
          render();
        }
      }
    } catch (err){
      console.error('[finance]', err);
      alert(err.message || String(err));
    }
  }

  function toast(msg){
    if (typeof window.showToast === 'function') window.showToast(msg);
    else console.log('[finance]', msg);
  }

  function init(){
    injectStyles();
    ensureButton();
    console.log(`[finance] gcc-finance.js v${VERSION} loaded`);
  }

  window.GCCFinance = {
    VERSION,
    getState,
    saveState,
    addTransaction,
    transferGp,
    createCharacter,
    createVenture,
    createAsset,
    applyVoyageResult,
    findCharacter:(id)=>clone(findCharacter(id)),
    findVenture:(id)=>clone(findVenture(id)),
    findAsset:(id)=>clone(findAsset(id)),
    transactionsFor:(type,id)=>clone(transactionsFor(type,id)),
    openPanel
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
