// gcc-finance.js v0.3.0 — Campaign finance and AD&D venture ledger
// Drop-in browser module for Graycloak's Campaign Corner.
//
// Slice 2 goals:
// - Provide a real Finance dashboard shell for characters, ventures, assets, and ledgers.
// - Keep data localStorage-only until the campaign economy model is finalized.
// - Track income, expenses, transfers, and running balances.
// - Expose a small API seam for voyage/trade integration later.
// - Slice 3: accept voyage metadata on ledger entries for the voyage-finance bridge.

(function(){
  if (typeof window === 'undefined') return;

  const VERSION = '0.3.0';
  const STORAGE_KEY = 'gcc.finance.v1';
  const SCHEMA_VERSION = 2;
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const nowIso = () => new Date().toISOString();
  const uid = (prefix='id') => `${prefix}_${Math.random().toString(36).slice(2,8)}_${Date.now().toString(36)}`;
  const gp = n => `${Number(n || 0).toLocaleString()} gp`;
  const pct = n => `${Number(n || 0).toLocaleString()}%`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = obj => obj == null ? obj : JSON.parse(JSON.stringify(obj));

  const DEFAULT_STATE = {
    version: SCHEMA_VERSION,
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
        links:[{ type:'character', id:'char_val' }, { type:'character', id:'char_kris' }, { type:'asset', id:'asset_surprise' }],
        meta:{ source:'seed' }
      }
    ]
  };

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

  function migrateState(incoming){
    const s = Object.assign(clone(DEFAULT_STATE), incoming || {});
    s.version = Number(s.version || 1);
    s.campaign = Object.assign(clone(DEFAULT_STATE.campaign), s.campaign || {});
    s.campaign.calendar = Object.assign(clone(DEFAULT_STATE.campaign.calendar), s.campaign.calendar || {});
    s.characters = Array.isArray(s.characters) ? s.characters : [];
    s.ventures = Array.isArray(s.ventures) ? s.ventures : [];
    s.assets = Array.isArray(s.assets) ? s.assets : [];
    s.transactions = Array.isArray(s.transactions) ? s.transactions : [];

    s.characters.forEach(c => {
      c.id = c.id || uid('char');
      c.name = c.name || 'Unnamed Character';
      c.player = c.player || '';
      c.carriedGp = Number(c.carriedGp || 0);
      c.bankedGp = Number(c.bankedGp || 0);
      c.notes = c.notes || '';
    });

    s.ventures.forEach(v => {
      v.id = v.id || uid('venture');
      v.name = v.name || 'Unnamed Venture';
      v.type = v.type || 'business';
      v.owners = Array.isArray(v.owners) ? v.owners : [];
      v.treasuryGp = Number(v.treasuryGp || 0);
      v.currentPort = v.currentPort || '';
      v.standingOrders = v.standingOrders || '';
      v.notes = v.notes || '';
      v.assetIds = Array.isArray(v.assetIds) ? v.assetIds : [];
    });

    s.assets.forEach(a => {
      a.id = a.id || uid('asset');
      a.name = a.name || 'Unnamed Asset';
      a.type = a.type || 'property';
      a.linkedVentureId = a.linkedVentureId || '';
      a.conditionPct = Number(a.conditionPct ?? 100);
      a.location = a.location || '';
      a.captain = a.captain || '';
      a.crew = a.crew || '';
      a.estimatedValueGp = Number(a.estimatedValueGp || 0);
      a.notes = a.notes || '';
    });

    s.transactions.forEach(t => {
      t.id = t.id || uid('txn');
      t.createdAt = t.createdAt || nowIso();
      t.gameDate = t.gameDate || currentGameDate(s);
      t.accountType = t.accountType || 'venture';
      t.accountId = t.accountId || '';
      t.amountGp = Number(t.amountGp || 0);
      t.category = t.category || 'misc';
      t.memo = t.memo || '';
      t.source = t.source || 'manual';
      t.links = Array.isArray(t.links) ? t.links : [];
      t.meta = (t.meta && typeof t.meta === 'object' && !Array.isArray(t.meta)) ? t.meta : {};
    });

    s.version = SCHEMA_VERSION;
    return s;
  }

  function saveState(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    document.dispatchEvent(new CustomEvent('gcc:finance:changed', { detail:{ state: clone(state) }}));
  }

  let state = loadState();
  const ui = { panel:null, activeTab:'overview', ledgerFilter:'all' };

  // ── Public API for voyage/trade integration ─────────────────────────────
  function getState(){ return clone(state); }
  function findCharacter(id){ return state.characters.find(c => c.id === id); }
  function findVenture(id){ return state.ventures.find(v => v.id === id); }
  function findAsset(id){ return state.assets.find(a => a.id === id); }
  function transactionsFor(accountType, accountId){
    return sortedTransactions().filter(t => t.accountType === accountType && t.accountId === accountId);
  }

  function currentGameDate(sourceState=state){
    const c = sourceState.campaign?.calendar;
    if (!c) return '';
    return `${c.day || 1} ${c.month || 'Needfest'} ${c.year || 576} CY`;
  }

  function sortedTransactions(list=state.transactions){
    return list.slice().sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  function accountKey(type, id){ return `${type}:${id}`; }

  function getAccount(type, id){
    if (type === 'character') return findCharacter(id);
    if (type === 'venture') return findVenture(id);
    return null;
  }

  function accountBalance(type, id){
    if (type === 'character') {
      const c = findCharacter(id);
      return c ? Number(c.bankedGp || 0) : 0;
    }
    if (type === 'venture') {
      const v = findVenture(id);
      return v ? Number(v.treasuryGp || 0) : 0;
    }
    return 0;
  }

  function adjustAccountBalance(type, id, amount){
    const delta = Number(amount || 0);
    if (!delta) return;
    if (type === 'character') {
      const c = findCharacter(id);
      if (!c) throw new Error('Character account not found.');
      c.bankedGp = Math.round(Number(c.bankedGp || 0) + delta);
      return;
    }
    if (type === 'venture') {
      const v = findVenture(id);
      if (!v) throw new Error('Venture account not found.');
      v.treasuryGp = Math.round(Number(v.treasuryGp || 0) + delta);
      return;
    }
    throw new Error('Unsupported account type: ' + type);
  }

  function addTransaction(txn, opts={}){
    const amount = Number(txn.amountGp || 0);
    if (!Number.isFinite(amount)) throw new Error('Transaction amount must be a number.');
    const accountType = txn.accountType;
    const accountId = txn.accountId;
    if (!getAccount(accountType, accountId)) throw new Error('Account not found.');

    const entry = {
      id: txn.id || uid('txn'),
      createdAt: txn.createdAt || nowIso(),
      gameDate: txn.gameDate || currentGameDate(),
      accountType,
      accountId,
      amountGp: Math.round(amount),
      category: txn.category || 'misc',
      memo: txn.memo || '',
      source: txn.source || 'manual',
      links: Array.isArray(txn.links) ? txn.links : [],
      meta: (txn.meta && typeof txn.meta === 'object' && !Array.isArray(txn.meta)) ? clone(txn.meta) : {}
    };

    adjustAccountBalance(entry.accountType, entry.accountId, entry.amountGp);
    state.transactions.unshift(entry);
    if (!opts.silent){
      saveState();
      render();
    }
    return clone(entry);
  }

  function transferGp({ fromType, fromId, toType, toId, amountGp, memo, category='transfer', source='manual', gameDate='', meta=null }){
    const amount = Math.abs(Number(amountGp || 0));
    if (!amount) throw new Error('Transfer amount must be greater than zero.');
    if (!getAccount(fromType, fromId)) throw new Error('Transfer source account not found.');
    if (!getAccount(toType, toId)) throw new Error('Transfer destination account not found.');
    if (fromType === toType && fromId === toId) throw new Error('Choose two different accounts for a transfer.');

    const batchId = uid('batch');
    const shared = { memo: memo || 'Transfer', category, source, gameDate: gameDate || currentGameDate(), meta: meta && typeof meta === 'object' ? meta : {} };
    const out = addTransaction({
      accountType:fromType,
      accountId:fromId,
      amountGp:-amount,
      ...shared,
      links:[{ type:toType, id:toId }, { type:'batch', id:batchId }]
    }, { silent:true });
    const inn = addTransaction({
      accountType:toType,
      accountId:toId,
      amountGp:amount,
      ...shared,
      links:[{ type:fromType, id:fromId }, { type:'batch', id:batchId }]
    }, { silent:true });
    saveState();
    render();
    return { debit:out, credit:inn };
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

  function createVenture(data){
    const startingGp = Number(data.treasuryGp || 0);
    const venture = {
      id: data.id || uid('venture'),
      name: data.name || 'New Venture',
      type: data.type || 'business',
      owners: Array.isArray(data.owners) ? data.owners : [],
      treasuryGp:0,
      currentPort: data.currentPort || '',
      standingOrders: data.standingOrders || '',
      notes: data.notes || '',
      assetIds: Array.isArray(data.assetIds) ? data.assetIds : []
    };
    state.ventures.push(venture);
    if (startingGp){
      addTransaction({
        accountType:'venture',
        accountId:venture.id,
        amountGp:startingGp,
        category:'capital',
        memo:'Initial venture capital.',
        source:'manual'
      }, { silent:true });
    }
    saveState();
    render();
    return clone(venture);
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

    const memoTail = cargoMemo ? ' ' + cargoMemo : '';
    const meta = { source:'voyage', voyageId: voyageId || '', ventureId, assetId: assetId || '', port: port || '' };
    if (expensesGp) addTransaction({ accountType:'venture', accountId:ventureId, amountGp:-Math.abs(expensesGp), category:'voyage_expense', memo:'Voyage expenses.' + memoTail, source:'voyage', links, meta }, { silent:true });
    if (repairsGp) addTransaction({ accountType:'venture', accountId:ventureId, amountGp:-Math.abs(repairsGp), category:'repair', memo:'Ship repairs after voyage.' + memoTail, source:'voyage', links, meta }, { silent:true });
    if (profitGp) addTransaction({ accountType:'venture', accountId:ventureId, amountGp:Number(profitGp), category:'trade_profit', memo:'Trade result.' + memoTail, source:'voyage', links, meta }, { silent:true });

    v.currentPort = port || v.currentPort;
    const a = assetId ? findAsset(assetId) : null;
    if (a && port) a.location = port;
    saveState();
    render();
    return clone(v);
  }

  // ── Derived reports ─────────────────────────────────────────────────────
  function totalCharacterMoney(){
    return state.characters.reduce((t,c)=>t+Number(c.carriedGp||0)+Number(c.bankedGp||0),0);
  }

  function totalVentureTreasuries(){
    return state.ventures.reduce((t,v)=>t+Number(v.treasuryGp||0),0);
  }

  function totalAssetValue(){
    return state.assets.reduce((t,a)=>t+Number(a.estimatedValueGp||0),0);
  }

  function assetValueForVenture(ventureId){
    return state.assets
      .filter(a => a.linkedVentureId === ventureId)
      .reduce((t,a)=>t+Number(a.estimatedValueGp||0),0);
  }

  function ownerExposureRows(){
    return state.characters.map(c => {
      let ventureShare = 0;
      let assetShare = 0;
      const holdings = [];
      state.ventures.forEach(v => {
        const owner = (v.owners || []).find(o => o.characterId === c.id);
        if (!owner) return;
        const share = Math.max(0, Number(owner.sharePct || 0)) / 100;
        ventureShare += Number(v.treasuryGp || 0) * share;
        assetShare += assetValueForVenture(v.id) * share;
        holdings.push(`${v.name} ${pct(owner.sharePct)}`);
      });
      const personal = Number(c.carriedGp || 0) + Number(c.bankedGp || 0);
      return {
        id:c.id,
        name:c.name,
        player:c.player,
        personal,
        ventureShare: Math.round(ventureShare),
        assetShare: Math.round(assetShare),
        total: Math.round(personal + ventureShare + assetShare),
        holdings
      };
    });
  }

  function currentBalancesMap(){
    const map = new Map();
    state.characters.forEach(c => map.set(accountKey('character', c.id), accountBalance('character', c.id)));
    state.ventures.forEach(v => map.set(accountKey('venture', v.id), accountBalance('venture', v.id)));
    return map;
  }

  function transactionsWithRunningBalance(list){
    const balances = currentBalancesMap();
    return sortedTransactions(list).map(t => {
      const key = accountKey(t.accountType, t.accountId);
      const balanceAfter = Number(balances.get(key) || 0);
      balances.set(key, balanceAfter - Number(t.amountGp || 0));
      return Object.assign({}, t, { balanceAfter });
    });
  }

  // ── UI ──────────────────────────────────────────────────────────────────
  function injectStyles(){
    if ($('#gcc-finance-style')) return;
    const style = document.createElement('style');
    style.id = 'gcc-finance-style';
    style.textContent = `
      .gcc-finance-btn{ margin-left:.35rem; }
      #btn-finance.active{ background:rgba(200,148,26,.22); border-color:var(--gold,#c8941a); color:var(--gold-light,#e8b840); }
      .gcc-finance-panel{ position:fixed; right:18px; top:calc(var(--gcc-bar-h,44px) + 56px); width:min(1080px, calc(100vw - 36px)); max-height:calc(100vh - var(--gcc-bar-h,44px) - 70px); overflow:auto; z-index:10000; background:#14110d; color:#f4ead4; border:1px solid #8b6f3f; box-shadow:0 18px 50px rgba(0,0,0,.55); border-radius:10px; font:14px/1.35 system-ui,Segoe UI,Roboto,sans-serif; }
      .gcc-finance-head{ display:flex; gap:12px; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid #6f5730; background:linear-gradient(#2a2115,#1b150e); position:sticky; top:0; z-index:2; }
      .gcc-finance-head h2{ margin:0; font-size:18px; letter-spacing:.02em; }
      .gcc-finance-close{ background:#3a2a18; color:#f4ead4; border:1px solid #8b6f3f; border-radius:7px; padding:4px 9px; cursor:pointer; }
      .gcc-finance-tabs{ display:flex; gap:6px; flex-wrap:wrap; padding:10px 14px; border-bottom:1px solid #44331d; background:#18130d; }
      .gcc-finance-tabs button{ background:#2a2115; color:#d8c79d; border:1px solid #6f5730; border-radius:999px; padding:5px 10px; cursor:pointer; }
      .gcc-finance-tabs button.active{ background:#8b6f3f; color:#171008; font-weight:700; }
      .gcc-finance-body{ padding:14px; }
      .gcc-finance-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:12px; }
      .gcc-finance-grid-wide{ display:grid; grid-template-columns:1.1fr .9fr; gap:12px; align-items:start; }
      .gcc-card{ background:#1d1710; border:1px solid #4e3a21; border-radius:9px; padding:12px; }
      .gcc-card h3{ margin:.1rem 0 .45rem; font-size:15px; color:#ffe0a0; }
      .gcc-card p{ margin:.35rem 0; }
      .gcc-muted{ color:#bcae91; font-size:12px; }
      .gcc-big{ font-size:22px; font-weight:800; }
      .gcc-pill{ display:inline-flex; align-items:center; gap:4px; border:1px solid #6f5730; background:#231a10; border-radius:999px; padding:2px 7px; font-size:12px; color:#e8d5a7; }
      .gcc-table-wrap{ overflow:auto; border:1px solid #342817; border-radius:8px; }
      .gcc-table{ width:100%; border-collapse:collapse; min-width:680px; }
      .gcc-table th,.gcc-table td{ border-bottom:1px solid #342817; padding:7px 6px; text-align:left; vertical-align:top; }
      .gcc-table tr:last-child td{ border-bottom:0; }
      .gcc-table th{ color:#ffe0a0; font-size:12px; text-transform:uppercase; letter-spacing:.06em; background:#19120b; position:sticky; top:0; z-index:1; }
      .gcc-table td.amount-pos{ color:#9be58f; font-weight:700; }
      .gcc-table td.amount-neg{ color:#ffb08f; font-weight:700; }
      .gcc-form{ display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:8px; align-items:end; }
      .gcc-form label{ display:grid; gap:3px; color:#d8c79d; font-size:12px; }
      .gcc-form input,.gcc-form select,.gcc-form textarea{ background:#0f0c08; color:#f4ead4; border:1px solid #5b4426; border-radius:6px; padding:7px; min-width:0; }
      .gcc-form textarea{ min-height:58px; }
      .gcc-action{ background:#5f4727; color:#fff3cf; border:1px solid #a18145; border-radius:7px; padding:8px 10px; cursor:pointer; font-weight:700; }
      .gcc-action:hover{ filter:brightness(1.12); }
      .gcc-action-danger{ background:#4c2118; border-color:#9a513e; }
      .gcc-actions-row{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
      .gcc-inline-select{ background:#0f0c08; color:#f4ead4; border:1px solid #5b4426; border-radius:6px; padding:6px; }
      .gcc-code{ background:#0f0c08; border:1px solid #342817; border-radius:8px; color:#d8c79d; padding:10px; white-space:pre-wrap; overflow:auto; }
      @media (max-width:760px){ .gcc-finance-grid-wide{ grid-template-columns:1fr; } .gcc-table{ min-width:560px; } }
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
    ui.panel.addEventListener('change', ev => {
      const filter = ev.target.closest('[data-finance-ledger-filter]');
      if (filter){ ui.ledgerFilter = filter.value || 'all'; render(); }
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
    const recent = transactionsWithRunningBalance(state.transactions).slice(0,6);
    return `
      <div class="gcc-finance-grid">
        <div class="gcc-card"><h3>Character Money</h3><div class="gcc-big">${gp(totalCharacterMoney())}</div><div class="gcc-muted">Carried plus banked personal funds.</div></div>
        <div class="gcc-card"><h3>Venture Treasuries</h3><div class="gcc-big">${gp(totalVentureTreasuries())}</div><div class="gcc-muted">Liquid money controlled by businesses and expeditions.</div></div>
        <div class="gcc-card"><h3>Asset Values</h3><div class="gcc-big">${gp(totalAssetValue())}</div><div class="gcc-muted">Ships, property, warehouses, freeholds, caravans.</div></div>
        <div class="gcc-card"><h3>Ledger Entries</h3><div class="gcc-big">${state.transactions.length.toLocaleString()}</div><div class="gcc-muted">Manual and voyage-ready transaction records.</div></div>
      </div>
      <div class="gcc-finance-grid-wide" style="margin-top:12px">
        <div class="gcc-card">
          <h3>Owner Exposure</h3>
          ${ownerExposureTable()}
        </div>
        <div class="gcc-card">
          <h3>Recent Ledger</h3>
          ${ledgerMiniTable(recent)}
        </div>
      </div>
      <div class="gcc-card" style="margin-top:12px">
        <h3>Design Direction</h3>
        <p>Finance is the campaign economy hub. Characters own ventures; ventures own assets; the voyage simulator should eventually read venture orders and write ledger entries back here.</p>
        <div class="gcc-actions-row"><span class="gcc-pill">localStorage only</span><span class="gcc-pill">Firestore deferred</span><span class="gcc-pill">Voyage API exposed</span></div>
      </div>
    `;
  }

  function ownerExposureTable(){
    const rows = ownerExposureRows();
    if (!rows.length) return '<p class="gcc-muted">No characters yet.</p>';
    return `<div class="gcc-table-wrap"><table class="gcc-table"><thead><tr><th>Owner</th><th>Personal</th><th>Venture Share</th><th>Asset Share</th><th>Total Stake</th><th>Holdings</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td><b>${esc(r.name)}</b><br><span class="gcc-muted">${esc(r.player || '')}</span></td><td>${gp(r.personal)}</td><td>${gp(r.ventureShare)}</td><td>${gp(r.assetShare)}</td><td><b>${gp(r.total)}</b></td><td class="gcc-muted">${esc(r.holdings.join(', ') || '—')}</td></tr>`).join('')}
    </tbody></table></div>`;
  }

  function ledgerMiniTable(rows){
    if (!rows.length) return '<p class="gcc-muted">No ledger entries yet.</p>';
    return `<div class="gcc-table-wrap"><table class="gcc-table" style="min-width:520px"><thead><tr><th>Date</th><th>Account</th><th>Memo</th><th>Amount</th></tr></thead><tbody>
      ${rows.map(t => `<tr><td>${esc(t.gameDate || '')}</td><td>${esc(accountLabel(t.accountType,t.accountId))}</td><td class="gcc-muted">${esc(t.memo || '')}</td><td class="${Number(t.amountGp)>=0?'amount-pos':'amount-neg'}">${formatSignedGp(t.amountGp)}</td></tr>`).join('')}
    </tbody></table></div>`;
  }

  function renderCharacters(){
    return `
      <div class="gcc-card"><h3>Add Character</h3>
        <div class="gcc-form" data-form="character">
          <label>Name<input name="name" placeholder="Val"></label>
          <label>Player<input name="player" placeholder="Bruce"></label>
          <label>Carried GP<input name="carriedGp" type="number" value="0"></label>
          <label>Banked GP<input name="bankedGp" type="number" value="0"></label>
          <label style="grid-column:1/-1">Notes<textarea name="notes" placeholder="Optional notes"></textarea></label>
          <button class="gcc-action" data-finance-action="add-character">Add Character</button>
        </div>
      </div>
      <div class="gcc-card" style="margin-top:12px"><h3>Characters</h3>
        <div class="gcc-table-wrap"><table class="gcc-table"><thead><tr><th>Character</th><th>Player</th><th>Carried</th><th>Banked</th><th>Total Personal</th><th>Notes</th></tr></thead><tbody>
          ${state.characters.map(c => `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.player)}</td><td>${gp(c.carriedGp)}</td><td>${gp(c.bankedGp)}</td><td><b>${gp(Number(c.carriedGp||0)+Number(c.bankedGp||0))}</b></td><td class="gcc-muted">${esc(c.notes || '')}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
    `;
  }

  function ownerNames(v){
    return (v.owners || []).map(o => {
      const c = findCharacter(o.characterId);
      return `${c ? c.name : o.characterId} ${pct(o.sharePct ?? 0)}`;
    }).join(', ');
  }

  function renderVentures(){
    const charOptions = state.characters.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    return `
      <div class="gcc-card"><h3>Add Venture</h3>
        <div class="gcc-form" data-form="venture">
          <label>Name<input name="name" placeholder="The Surprise Trading Company"></label>
          <label>Type<select name="type"><option value="maritime_trade">Maritime Trade</option><option value="business">Business</option><option value="property">Property</option><option value="guild">Guild</option><option value="freehold">Freehold</option><option value="caravan">Caravan</option></select></label>
          <label>Owner A<select name="ownerA">${charOptions}</select></label>
          <label>Owner B<select name="ownerB"><option value="">—</option>${charOptions}</select></label>
          <label>Starting GP<input name="treasuryGp" type="number" value="0"></label>
          <label>Location / Port<input name="currentPort" placeholder="City of Greyhawk"></label>
          <label style="grid-column:1/-1">Standing Orders<textarea name="standingOrders" placeholder="Trade for profit, avoid storms..."></textarea></label>
          <label style="grid-column:1/-1">Notes<textarea name="notes" placeholder="Optional notes"></textarea></label>
          <button class="gcc-action" data-finance-action="add-venture">Add Venture</button>
        </div>
      </div>
      <div class="gcc-card" style="margin-top:12px"><h3>Ventures</h3>
        <div class="gcc-table-wrap"><table class="gcc-table"><thead><tr><th>Venture</th><th>Type</th><th>Owners</th><th>Treasury</th><th>Location</th><th>Assets</th><th>Orders</th></tr></thead><tbody>
          ${state.ventures.map(v => `<tr><td><b>${esc(v.name)}</b><br><span class="gcc-muted">${esc(v.notes || '')}</span></td><td>${esc(typeLabel(v.type))}</td><td>${esc(ownerNames(v) || '—')}</td><td><b>${gp(v.treasuryGp)}</b></td><td>${esc(v.currentPort || '—')}</td><td>${esc(assetNamesForVenture(v.id) || '—')}</td><td class="gcc-muted">${esc(v.standingOrders || '')}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
    `;
  }

  function renderAssets(){
    const ventureOptions = ['<option value="">—</option>'].concat(state.ventures.map(v => `<option value="${esc(v.id)}">${esc(v.name)}</option>`)).join('');
    return `
      <div class="gcc-card"><h3>Add Asset</h3>
        <div class="gcc-form" data-form="asset">
          <label>Name<input name="name" placeholder="Surprise"></label>
          <label>Type<select name="type"><option value="ship">Ship</option><option value="warehouse">Warehouse</option><option value="tavern">Tavern</option><option value="mine">Mine</option><option value="freehold">Freehold</option><option value="property">Property</option><option value="caravan">Caravan</option></select></label>
          <label>Linked Venture<select name="linkedVentureId">${ventureOptions}</select></label>
          <label>Condition %<input name="conditionPct" type="number" value="100"></label>
          <label>Location<input name="location" placeholder="City of Greyhawk"></label>
          <label>Value GP<input name="estimatedValueGp" type="number" value="0"></label>
          <label>Captain/Manager<input name="captain" placeholder="Captain Harl"></label>
          <label>Crew/Staff<input name="crew" placeholder="Hired crew"></label>
          <label style="grid-column:1/-1">Notes<textarea name="notes" placeholder="Optional notes"></textarea></label>
          <button class="gcc-action" data-finance-action="add-asset">Add Asset</button>
        </div>
      </div>
      <div class="gcc-card" style="margin-top:12px"><h3>Assets</h3>
        <div class="gcc-table-wrap"><table class="gcc-table"><thead><tr><th>Asset</th><th>Type</th><th>Venture</th><th>Condition</th><th>Location</th><th>Value</th><th>Manager</th><th>Notes</th></tr></thead><tbody>
          ${state.assets.map(a => { const v = a.linkedVentureId ? findVenture(a.linkedVentureId) : null; return `<tr><td><b>${esc(a.name)}</b></td><td>${esc(typeLabel(a.type))}</td><td>${esc(v?.name || '—')}</td><td>${Number(a.conditionPct||0)}%</td><td>${esc(a.location || '—')}</td><td>${gp(a.estimatedValueGp)}</td><td>${esc(a.captain || '—')}<br><span class="gcc-muted">${esc(a.crew || '')}</span></td><td class="gcc-muted">${esc(a.notes || '')}</td></tr>`; }).join('')}
        </tbody></table></div>
      </div>
    `;
  }

  function renderLedger(){
    const filtered = filteredTransactions();
    const rows = transactionsWithRunningBalance(filtered);
    return `
      <div class="gcc-finance-grid-wide">
        <div class="gcc-card"><h3>Record Income or Expense</h3>
          <div class="gcc-form" data-form="transaction">
            <label>Account<select name="account">${accountOptions()}</select></label>
            <label>Type<select name="direction"><option value="income">Income</option><option value="expense">Expense</option></select></label>
            <label>Amount GP<input name="amountGp" type="number" min="0" placeholder="250"></label>
            <label>Category<input name="category" placeholder="capital, repair, wages"></label>
            <label>Game Date<input name="gameDate" value="${esc(currentGameDate())}"></label>
            <label style="grid-column:1/-1">Memo<textarea name="memo" placeholder="Paid crew wages..."></textarea></label>
            <button class="gcc-action" data-finance-action="add-transaction">Record Entry</button>
          </div>
        </div>
        <div class="gcc-card"><h3>Transfer GP</h3>
          <div class="gcc-form" data-form="transfer">
            <label>From<select name="fromAccount">${accountOptions()}</select></label>
            <label>To<select name="toAccount">${accountOptions()}</select></label>
            <label>Amount GP<input name="amountGp" type="number" min="0" placeholder="1000"></label>
            <label>Category<input name="category" value="transfer"></label>
            <label>Game Date<input name="gameDate" value="${esc(currentGameDate())}"></label>
            <label style="grid-column:1/-1">Memo<textarea name="memo" placeholder="Val invests in the company..."></textarea></label>
            <button class="gcc-action" data-finance-action="transfer-gp">Transfer</button>
          </div>
        </div>
      </div>
      <div class="gcc-card" style="margin-top:12px"><h3>Ledger</h3>
        <div class="gcc-actions-row" style="margin-bottom:8px">
          <label class="gcc-muted">Filter Account</label>
          <select class="gcc-inline-select" data-finance-ledger-filter>${ledgerFilterOptions()}</select>
          <span class="gcc-pill">${rows.length.toLocaleString()} shown</span>
        </div>
        <div class="gcc-table-wrap"><table class="gcc-table"><thead><tr><th>Date</th><th>Account</th><th>Category</th><th>Memo</th><th>Amount</th><th>Balance After</th><th>Source</th></tr></thead><tbody>
          ${rows.map(t => `<tr><td>${esc(t.gameDate || '')}</td><td>${esc(accountLabel(t.accountType,t.accountId))}</td><td>${esc(t.category)}</td><td>${esc(t.memo)}</td><td class="${Number(t.amountGp)>=0?'amount-pos':'amount-neg'}">${formatSignedGp(t.amountGp)}</td><td><b>${gp(t.balanceAfter)}</b></td><td>${esc(t.source || '')}</td></tr>`).join('') || '<tr><td colspan="7" class="gcc-muted">No ledger entries match this filter.</td></tr>'}
        </tbody></table></div>
      </div>
    `;
  }

  function renderTools(){
    return `
      <div class="gcc-finance-grid">
        <div class="gcc-card"><h3>Copy Export</h3><p class="gcc-muted">Copy the current finance data as JSON.</p><button class="gcc-action" data-finance-action="export-json">Copy JSON</button></div>
        <div class="gcc-card"><h3>Download Export</h3><p class="gcc-muted">Download local finance data for backup or handoff.</p><button class="gcc-action" data-finance-action="download-json">Download JSON</button></div>
        <div class="gcc-card"><h3>Reset Demo Data</h3><p class="gcc-muted">Restores Val, Kris, and the Surprise sample venture.</p><button class="gcc-action gcc-action-danger" data-finance-action="reset-demo">Reset</button></div>
      </div>
      <div class="gcc-card" style="margin-top:12px"><h3>Voyage API</h3><pre class="gcc-code">GCCFinance.applyVoyageResult({
  ventureId: 'venture_surprise',
  assetId: 'asset_surprise',
  port: 'Hardby',
  profitGp: 2480,
  expensesGp: 740,
  repairsGp: 380,
  cargoMemo: 'Wool and grain run from Greyhawk.'
});</pre></div>
      <div class="gcc-card" style="margin-top:12px"><h3>Local Storage Key</h3><p><code>${esc(STORAGE_KEY)}</code></p><p class="gcc-muted">Do not move this to Firestore until the schema has been finalized.</p></div>
    `;
  }

  function accountOptions(){
    const chars = state.characters.map(c => `<option value="character:${esc(c.id)}">Character: ${esc(c.name)} (${gp(c.bankedGp)} banked)</option>`);
    const vents = state.ventures.map(v => `<option value="venture:${esc(v.id)}">Venture: ${esc(v.name)} (${gp(v.treasuryGp)})</option>`);
    return chars.concat(vents).join('');
  }

  function ledgerFilterOptions(){
    const opts = [`<option value="all"${ui.ledgerFilter==='all'?' selected':''}>All Accounts</option>`];
    state.characters.forEach(c => opts.push(`<option value="character:${esc(c.id)}"${ui.ledgerFilter===`character:${c.id}`?' selected':''}>Character: ${esc(c.name)}</option>`));
    state.ventures.forEach(v => opts.push(`<option value="venture:${esc(v.id)}"${ui.ledgerFilter===`venture:${v.id}`?' selected':''}>Venture: ${esc(v.name)}</option>`));
    return opts.join('');
  }

  function filteredTransactions(){
    if (!ui.ledgerFilter || ui.ledgerFilter === 'all') return state.transactions;
    const [type, id] = ui.ledgerFilter.split(':');
    return state.transactions.filter(t => t.accountType === type && t.accountId === id);
  }

  function accountLabel(type, id){
    if (type === 'character') return 'Character: ' + (findCharacter(id)?.name || id);
    if (type === 'venture') return 'Venture: ' + (findVenture(id)?.name || id);
    return `${type}:${id}`;
  }

  function assetNamesForVenture(ventureId){
    return state.assets.filter(a => a.linkedVentureId === ventureId).map(a => a.name).join(', ');
  }

  function typeLabel(value){
    return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function formatSignedGp(amount){
    const n = Number(amount || 0);
    return `${n >= 0 ? '+' : ''}${gp(n)}`;
  }

  function parseAccount(value){
    const [type, ...rest] = String(value || '').split(':');
    return { type, id: rest.join(':') };
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
        toast('Character added.');
      } else if (action === 'add-venture'){
        const d = formData('venture');
        const owners = [];
        if (d.ownerA) owners.push({ characterId:d.ownerA, sharePct:d.ownerB && d.ownerB !== d.ownerA ? 50 : 100 });
        if (d.ownerB && d.ownerB !== d.ownerA) owners.push({ characterId:d.ownerB, sharePct:50 });
        createVenture(Object.assign(d, { owners }));
        toast('Venture added.');
      } else if (action === 'add-asset'){
        createAsset(formData('asset'));
        toast('Asset added.');
      } else if (action === 'add-transaction'){
        const d = formData('transaction');
        const account = parseAccount(d.account);
        const rawAmount = Math.abs(Number(d.amountGp || 0));
        if (!rawAmount) throw new Error('Enter an amount greater than zero.');
        const amount = d.direction === 'expense' ? -rawAmount : rawAmount;
        addTransaction({ accountType:account.type, accountId:account.id, amountGp:amount, category:d.category, memo:d.memo, gameDate:d.gameDate, source:'manual' });
        toast('Ledger entry recorded.');
      } else if (action === 'transfer-gp'){
        const d = formData('transfer');
        const from = parseAccount(d.fromAccount);
        const to = parseAccount(d.toAccount);
        transferGp({ fromType:from.type, fromId:from.id, toType:to.type, toId:to.id, amountGp:d.amountGp, memo:d.memo, category:d.category || 'transfer', gameDate:d.gameDate });
        toast('Transfer recorded.');
      } else if (action === 'export-json'){
        const json = JSON.stringify(state, null, 2);
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(json).then(() => toast('Finance JSON copied.')).catch(() => fallbackCopy(json));
        else fallbackCopy(json);
      } else if (action === 'download-json'){
        downloadJson();
      } else if (action === 'reset-demo'){
        if (confirm('Reset finance data to the Val/Kris Surprise demo?')){
          state = clone(DEFAULT_STATE);
          saveState();
          render();
          toast('Finance demo data reset.');
        }
      }
    } catch (err){
      console.error('[finance]', err);
      alert(err.message || String(err));
    }
  }

  function fallbackCopy(text){
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('Finance JSON copied.'); }
    catch(e){ alert('Copy failed. Use Download JSON instead.'); }
    ta.remove();
  }

  function downloadJson(){
    const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `gcc-finance-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    toast('Finance JSON downloaded.');
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
    getBalance: accountBalance,
    findCharacter:(id)=>clone(findCharacter(id)),
    findVenture:(id)=>clone(findVenture(id)),
    findAsset:(id)=>clone(findAsset(id)),
    transactionsFor:(type,id)=>clone(transactionsFor(type,id)),
    currentGameDate,
    accountBalance,
    accountLabel,
    openPanel
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
