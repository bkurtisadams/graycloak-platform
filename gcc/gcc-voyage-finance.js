// gcc-voyage-finance.js v0.2.0 — Local voyage settlement and finance bridge
// Adds explicit voyage ledger posting controls to the GCC Voyage Simulator.
// LocalStorage-only. No Firestore sync or schema writes.

(function(){
  if (typeof window === 'undefined') return;

  const VERSION = '0.2.0';
  const STORAGE_KEY = 'gcc.voyage.finance.v1';
  const MONTHS = ['Needfest','Fireseek','Readying','Coldeven','Planting','Flocktime','Wealsun','Richfest','Reaping','Goodmonth','Harvester','Brewfest','Patchwall','Readyreat','Sunsebb'];
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gp = n => `${Number(n || 0).toLocaleString()} gp`;
  const uid = (prefix='id') => `${prefix}_${Math.random().toString(36).slice(2,8)}_${Date.now().toString(36)}`;
  const clone = obj => obj == null ? obj : JSON.parse(JSON.stringify(obj));

  const DEFAULT_LINK = {
    ventureId: '',
    assetId: '',
    account: '',
    lastCategory: 'repair',
    lastDirection: 'expense'
  };

  const CATEGORY_PRESETS = {
    repair:          { direction:'expense', label:'Repair Expense', memo:'Ship repairs.' },
    port_fee:        { direction:'expense', label:'Port / Harbor Fee', memo:'Port fees and harbor charges.' },
    resupply:        { direction:'expense', label:'Resupply Expense', memo:'Voyage resupply.' },
    cargo_purchase:  { direction:'expense', label:'Cargo Purchase', memo:'Purchased cargo.' },
    cargo_loss:      { direction:'expense', label:'Cargo Loss', memo:'Cargo loss or damage.' },
    wages:           { direction:'expense', label:'Crew Wages', memo:'Paid crew wages.' },
    cargo_sale:      { direction:'income',  label:'Cargo Sale', memo:'Sold cargo.' },
    charter:         { direction:'income',  label:'Charter / Reward', memo:'Voyage charter, salvage, or reward.' },
    voyage_profit:   { direction:'income',  label:'Voyage Profit', memo:'Net voyage profit.' }
  };

  let link = loadLink();
  let observer = null;
  let renderQueued = false;

  function loadLink(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return Object.assign({}, DEFAULT_LINK, raw ? JSON.parse(raw) : {});
    } catch (err){
      console.warn('[voyage-finance] failed to load link state', err);
      return Object.assign({}, DEFAULT_LINK);
    }
  }

  function saveLink(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(link));
  }

  function financeApi(){ return window.GCCFinance || null; }
  function financeState(){
    try { return financeApi()?.getState?.() || null; }
    catch (err){ console.warn('[voyage-finance] finance state unavailable', err); return null; }
  }

  function voyageState(){ return window.GCCVoyage?.state || null; }
  function activeVoyage(){ return voyageState()?.voyage || null; }

  function voyageApi(){ return window.GCCVoyage || null; }
  function voyageSummary(){
    try { return voyageApi()?.getSummary?.() || null; }
    catch (err){ console.warn('[voyage-finance] voyage summary unavailable', err); return null; }
  }
  function pendingFinanceActions(){
    try { return voyageApi()?.getPendingFinanceActions?.() || []; }
    catch (err){ console.warn('[voyage-finance] pending voyage finance unavailable', err); return []; }
  }
  function routeLabel(){
    const v = activeVoyage();
    if (!v?.legs?.length) return '';
    const start = v.legs[0]?.from || '';
    const end = v.legs[v.legs.length - 1]?.to || '';
    return start && end ? `${start} → ${end}` : '';
  }

  function normalizeLink(){
    const fs = financeState();
    if (!fs) return link;
    const ventures = Array.isArray(fs.ventures) ? fs.ventures : [];
    const assets = Array.isArray(fs.assets) ? fs.assets : [];
    const characters = Array.isArray(fs.characters) ? fs.characters : [];

    if (!ventures.some(v => v.id === link.ventureId)) link.ventureId = ventures[0]?.id || '';

    const linkedAssets = assets.filter(a => !link.ventureId || a.linkedVentureId === link.ventureId || a.type === 'ship');
    if (!assets.some(a => a.id === link.assetId)) link.assetId = linkedAssets[0]?.id || '';
    if (link.ventureId && link.assetId){
      const asset = assets.find(a => a.id === link.assetId);
      if (asset && asset.linkedVentureId && asset.linkedVentureId !== link.ventureId){
        const preferred = linkedAssets.find(a => a.linkedVentureId === link.ventureId) || linkedAssets[0];
        link.assetId = preferred?.id || '';
      }
    }

    const accountExists = accountList(fs).some(a => a.value === link.account);
    if (!accountExists){
      link.account = link.ventureId ? `venture:${link.ventureId}` : characters[0] ? `character:${characters[0].id}` : '';
    }
    if (!CATEGORY_PRESETS[link.lastCategory]) link.lastCategory = 'repair';
    if (!['income','expense'].includes(link.lastDirection)) link.lastDirection = CATEGORY_PRESETS[link.lastCategory]?.direction || 'expense';
    saveLink();
    return link;
  }

  function accountList(fs=financeState()){
    if (!fs) return [];
    const chars = (fs.characters || []).map(c => ({ value:`character:${c.id}`, label:`Character: ${c.name} (${gp(c.bankedGp)} banked)` }));
    const vents = (fs.ventures || []).map(v => ({ value:`venture:${v.id}`, label:`Venture: ${v.name} (${gp(v.treasuryGp)})` }));
    return vents.concat(chars);
  }

  function selectedAccount(){
    const [type, ...rest] = String(link.account || '').split(':');
    return { type, id: rest.join(':') };
  }

  function selectedVenture(){
    const fs = financeState();
    return fs?.ventures?.find(v => v.id === link.ventureId) || null;
  }

  function selectedAsset(){
    const fs = financeState();
    return fs?.assets?.find(a => a.id === link.assetId) || null;
  }

  function ensureVoyageFinance(v=activeVoyage()){
    if (!v) return null;
    v.finance = v.finance || {};
    v.finance.voyageId = v.finance.voyageId || uid('voyage');
    v.finance.ventureId = link.ventureId || v.finance.ventureId || '';
    v.finance.assetId = link.assetId || v.finance.assetId || '';
    v.finance.account = link.account || v.finance.account || '';
    return v.finance;
  }

  function currentPort(){
    const v = activeVoyage();
    if (v?.legs?.length){
      if (v.finished || v.currentLegIdx >= v.legs.length) return v.legs[v.legs.length - 1]?.to || '';
      if (v.currentLegIdx > 0 && v.milesOnLeg === 0) return v.legs[v.currentLegIdx - 1]?.to || '';
      return v.legs[v.currentLegIdx]?.from || v.legs[0]?.from || '';
    }
    return selectedAsset()?.location || selectedVenture()?.currentPort || '';
  }

  function currentGameDate(){
    const v = activeVoyage();
    if (v?.calendar){
      const m = MONTHS[v.calendar.month] || MONTHS[0];
      return `${v.calendar.day || 1} ${m} ${v.calendar.year || 576} CY`;
    }
    return financeApi()?.currentGameDate?.() || '';
  }

  function currentLegLabel(){
    const v = activeVoyage();
    if (!v?.legs?.length) return '';
    const leg = v.legs[v.currentLegIdx] || v.legs[v.legs.length - 1];
    return leg ? `${leg.from} → ${leg.to}` : '';
  }

  function categoryOptions(selected=link.lastCategory){
    return Object.entries(CATEGORY_PRESETS).map(([value,p]) =>
      `<option value="${esc(value)}"${value===selected?' selected':''}>${esc(p.label)}</option>`
    ).join('');
  }

  function directionOptions(selected=link.lastDirection){
    return `<option value="expense"${selected==='expense'?' selected':''}>Expense</option><option value="income"${selected==='income'?' selected':''}>Income</option>`;
  }

  function ventureOptions(fs, selected=link.ventureId){
    const ventures = fs?.ventures || [];
    if (!ventures.length) return '<option value="">No ventures yet</option>';
    return ventures.map(v => `<option value="${esc(v.id)}"${v.id===selected?' selected':''}>${esc(v.name)} (${gp(v.treasuryGp)})</option>`).join('');
  }

  function assetOptions(fs, selected=link.assetId){
    const assets = (fs?.assets || []).filter(a => !link.ventureId || a.linkedVentureId === link.ventureId || a.type === 'ship');
    if (!assets.length) return '<option value="">No ship/assets yet</option>';
    return assets.map(a => {
      const tag = a.type === 'ship' ? 'ship' : a.type || 'asset';
      const loc = a.location ? ` · ${a.location}` : '';
      return `<option value="${esc(a.id)}"${a.id===selected?' selected':''}>${esc(a.name)} (${esc(tag)}${esc(loc)})</option>`;
    }).join('');
  }

  function accountOptions(fs, selected=link.account){
    const accounts = accountList(fs);
    if (!accounts.length) return '<option value="">No accounts yet</option>';
    return accounts.map(a => `<option value="${esc(a.value)}"${a.value===selected?' selected':''}>${esc(a.label)}</option>`).join('');
  }

  function financeMissingHtml(){
    return `<b>💰 Finance Link</b><p class="vf-muted">Finance is not loaded yet. Check that <code>gcc-finance.js</code> loads before <code>gcc-voyage-finance.js</code>.</p>`;
  }

  function setupCardHtml(){
    const fs = financeState();
    if (!fs) return financeMissingHtml();
    normalizeLink();
    const venture = selectedVenture();
    const asset = selectedAsset();
    return `
        <div class="vf-head"><b>💰 Finance Link</b><span class="vf-pill">localStorage only</span></div>
        <div class="vf-grid">
          <label class="ve-lbl">Venture<select class="ve-select" data-vf-field="ventureId">${ventureOptions(fs)}</select></label>
          <label class="ve-lbl">Ship / Asset<select class="ve-select" data-vf-field="assetId">${assetOptions(fs)}</select></label>
          <label class="ve-lbl">Ledger Account<select class="ve-select" data-vf-field="account">${accountOptions(fs)}</select></label>
        </div>
        <div class="vf-muted">Selected: ${esc(venture?.name || '—')} · ${esc(asset?.name || '—')} · ${esc(currentPort() || 'No port')}</div>`;
  }

  function voyageCardHtml(){
    const fs = financeState();
    if (!fs) return financeMissingHtml();
    normalizeLink();
    const v = activeVoyage();
    const vf = ensureVoyageFinance(v);
    const preset = CATEGORY_PRESETS[link.lastCategory] || CATEGORY_PRESETS.repair;
    const account = selectedAccount();
    const balance = account.type && account.id ? financeApi()?.getBalance?.(account.type, account.id) : 0;
    const disabled = !link.account || !link.ventureId ? ' disabled' : '';
    return `
        <div class="vf-head"><b>💰 Voyage Ledger</b><span class="vf-pill">${esc(vf?.voyageId || 'no active voyage')}</span></div>
        <div class="vf-muted">Account balance: <b>${gp(balance)}</b> · Port: <b>${esc(currentPort() || '—')}</b> · Date: ${esc(currentGameDate())}</div>
        <div class="vf-grid vf-post-grid" data-vf-form="post">
          <label class="ve-lbl">Category<select class="ve-select" data-vf-field="lastCategory" name="category">${categoryOptions()}</select></label>
          <label class="ve-lbl">Type<select class="ve-select" data-vf-field="lastDirection" name="direction">${directionOptions(link.lastDirection || preset.direction)}</select></label>
          <label class="ve-lbl">Amount GP<input class="ve-input" name="amountGp" type="number" min="0" placeholder="250"></label>
          <label class="ve-lbl">Port<input class="ve-input" name="port" value="${esc(currentPort())}" placeholder="Port or location"></label>
          <label class="ve-lbl vf-span">Memo<textarea class="ve-input" name="memo" placeholder="${esc(preset.memo)}"></textarea></label>
        </div>
        <div class="vf-actions">
          <button class="ve-btn" data-vf-preset="repair">Repair</button>
          <button class="ve-btn" data-vf-preset="port_fee">Port Fee</button>
          <button class="ve-btn" data-vf-preset="resupply">Resupply</button>
          <button class="ve-btn" data-vf-preset="cargo_purchase">Buy Cargo</button>
          <button class="ve-btn" data-vf-preset="cargo_sale">Sell Cargo</button>
          <button class="ve-btn" data-vf-preset="voyage_profit">Profit</button>
          <button class="ve-btn primary" data-vf-post${disabled}>Post to Finance</button>
        </div>`;
  }

  function pendingActionHtml(action){
    const preset = CATEGORY_PRESETS[action.category] || CATEGORY_PRESETS.repair;
    const posted = action.status === 'posted';
    const dismissed = action.status === 'dismissed';
    const amount = Math.abs(Number(action.amountGp || 0));
    const badge = posted ? 'posted' : dismissed ? 'dismissed' : 'pending';
    const restore = action.restoreHullAllowed && action.hullDamage > 0
      ? `<label class="vf-check"><input type="checkbox" data-vf-pending-repair="${esc(action.id)}" checked> restore ${Number(action.hullDamage)} hull HP</label>`
      : '';
    return `<div class="vf-pending ${posted ? 'posted' : dismissed ? 'dismissed' : ''}" data-vf-pending-row="${esc(action.id)}">
      <div class="vf-pending-top">
        <b>${esc(preset.label || action.category)}</b>
        <span class="vf-pill">${esc(badge)}</span>
      </div>
      <div class="vf-muted">${esc(action.memo || '')}</div>
      <div class="vf-muted">${esc(action.date || '')}${action.port ? ` · ${esc(action.port)}` : ''}${action.route ? ` · ${esc(action.route)}` : ''}</div>
      ${posted || dismissed ? '' : `<div class="vf-pending-controls">
        <label class="ve-lbl">Amount GP<input class="ve-input" type="number" min="0" data-vf-pending-amount="${esc(action.id)}" value="${esc(amount)}"></label>
        ${restore}
        <button class="ve-btn primary" data-vf-pending-post="${esc(action.id)}">Post</button>
        <button class="ve-btn" data-vf-pending-dismiss="${esc(action.id)}">Dismiss</button>
      </div>`}
    </div>`;
  }

  function settlementCardHtml(){
    const fs = financeState();
    if (!fs) return '';
    const v = activeVoyage();
    if (!v) return '';
    const summary = voyageSummary();
    const pending = pendingFinanceActions();
    const activePending = pending.filter(a => a.status === 'pending');
    const hullTxt = summary ? `${summary.hullCurrent} / ${summary.hullMax} HP` : `${v.hullCurrent || 0} / ${v.hullMax || 0} HP`;
    const repairEstimate = Number(summary?.currentHullLoss || 0) > 0 ? Number(summary.currentHullLoss) * Number(summary.repairGpPerHull || 50) : 0;
    return `
      <div class="vf-head"><b>⚖ Voyage Settlement</b><span class="vf-pill">explicit posting</span></div>
      <div class="vf-settle-grid">
        <div><b>${esc(String(summary?.days ?? v.dayNumber ?? 0))}</b><span>days</span></div>
        <div><b>${esc(String(summary?.distanceCovered ?? v.distanceCovered ?? 0))}</b><span>miles sailed</span></div>
        <div><b>${esc(hullTxt)}</b><span>hull</span></div>
        <div><b>${esc(String(activePending.length))}</b><span>pending</span></div>
      </div>
      <div class="vf-muted">Route: <b>${esc(summary?.route || routeLabel() || '—')}</b> · Port: <b>${esc(summary?.currentPort || currentPort() || '—')}</b></div>
      ${summary?.stormDays ? `<div class="vf-muted">Storm/gale days logged: <b>${summary.stormDays}</b>${summary.weatherDelayDays ? ` · Delay days: <b>${summary.weatherDelayDays}</b>` : ''}</div>` : ''}
      ${activePending.length ? `<div class="vf-pending-list">${activePending.map(pendingActionHtml).join('')}</div>` : `<div class="vf-muted">No pending repair or settlement items. Use the quick settlement buttons below for port fees, wages, resupply, cargo, or profit.</div>`}
      <div class="vf-actions vf-quick">
        ${repairEstimate ? `<button class="ve-btn" data-vf-quick="repair" data-vf-amount="${esc(repairEstimate)}" data-vf-memo="Repair ${esc(summary.currentHullLoss)} hull HP at ${esc(summary.currentPort || currentPort() || 'port')}.">Load Repair Estimate (${gp(repairEstimate)})</button>` : ''}
        <button class="ve-btn" data-vf-quick="port_fee">Port Fee</button>
        <button class="ve-btn" data-vf-quick="wages">Crew Wages</button>
        <button class="ve-btn" data-vf-quick="resupply">Resupply</button>
        <button class="ve-btn" data-vf-quick="cargo_loss">Cargo Loss</button>
        <button class="ve-btn" data-vf-quick="voyage_profit">Profit</button>
      </div>
      <div class="vf-muted">Posted items stay in the Finance ledger. Pending items are suggestions only until you press Post.</div>`;
  }

  function injectStyles(){
    if ($('#gcc-voyage-finance-style')) return;
    const style = document.createElement('style');
    style.id = 'gcc-voyage-finance-style';
    style.textContent = `
      #voyage-panel .vf-card{margin-top:10px;padding:10px;background:#18120b;border:1px solid #6b5129;border-radius:9px;color:#f4e4b8;font-family:Georgia,serif;font-size:11px;}
      #voyage-panel .vf-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;color:#e8b840;font-family:'Cinzel',serif;letter-spacing:.04em;}
      #voyage-panel .vf-pill{border:1px solid #6b5129;border-radius:999px;padding:1px 6px;color:#c8a96e;background:#21170d;font-family:system-ui,sans-serif;font-size:10px;letter-spacing:0;}
      #voyage-panel .vf-muted{color:#c8a96e;font-size:10px;line-height:1.35;margin-top:5px;}
      #voyage-panel .vf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:6px;align-items:end;}
      #voyage-panel .vf-post-grid{margin-top:8px;}
      #voyage-panel .vf-span{grid-column:1/-1;}
      #voyage-panel .vf-span textarea{min-height:48px;resize:vertical;}
      #voyage-panel .vf-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
      #voyage-panel .vf-actions .primary{margin-left:auto;}
      #voyage-panel .vf-card code{color:#ffe0a0;}
      #voyage-panel .vf-settle-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0;}
      #voyage-panel .vf-settle-grid>div{background:#0d0600;border:1px solid #4a3518;border-radius:7px;padding:6px;text-align:center;}
      #voyage-panel .vf-settle-grid b{display:block;color:#f4e4b8;font-size:12px;font-family:Georgia,serif;}
      #voyage-panel .vf-settle-grid span{display:block;color:#c8a96e;font-size:9px;text-transform:uppercase;letter-spacing:.08em;}
      #voyage-panel .vf-pending-list{display:flex;flex-direction:column;gap:7px;margin-top:8px;}
      #voyage-panel .vf-pending{background:#21170d;border:1px solid #6b5129;border-radius:8px;padding:7px;}
      #voyage-panel .vf-pending.posted{opacity:.65;}
      #voyage-panel .vf-pending.dismissed{opacity:.45;text-decoration:line-through;}
      #voyage-panel .vf-pending-top{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#e8b840;}
      #voyage-panel .vf-pending-controls{display:grid;grid-template-columns:minmax(90px,1fr) auto auto auto;gap:6px;align-items:end;margin-top:6px;}
      #voyage-panel .vf-check{display:flex;align-items:center;gap:4px;color:#c8a96e;font-size:10px;font-family:Georgia,serif;white-space:nowrap;padding-bottom:6px;}
      #voyage-panel .vf-quick{border-top:1px solid #4a3518;padding-top:8px;}
    `;
    document.head.appendChild(style);
  }

  function queueRender(){
    if (renderQueued) return;
    renderQueued = true;
    setTimeout(() => { renderQueued = false; render(); }, 0);
  }

  function render(){
    injectStyles();
    const panel = $('#voyage-panel');
    if (!panel) return;

    const setupPane = $('#ve-pane-setup', panel);
    if (setupPane){
      let setup = $('#gcc-voyage-finance-setup', setupPane);
      const html = setupCardHtml();
      if (!setup){
        setup = document.createElement('div');
        setup.id = 'gcc-voyage-finance-setup';
        setup.className = 'vf-card';
        const status = $('#ve-status', setupPane);
        if (status) status.insertAdjacentElement('beforebegin', setup);
        else setupPane.appendChild(setup);
      }
      if (setup.__vfHtml !== html){ setup.__vfHtml = html; setup.innerHTML = html; }
    }

    const voyagePane = $('#ve-pane-voyage', panel);
    if (voyagePane){
      let card = $('#gcc-voyage-finance-voyage', voyagePane);
      const html = voyageCardHtml();
      if (!card){
        card = document.createElement('div');
        card.id = 'gcc-voyage-finance-voyage';
        card.className = 'vf-card';
        const body = $('#ve-voyage-body', voyagePane);
        if (body) body.insertAdjacentElement('afterend', card);
        else voyagePane.appendChild(card);
      }
      if (card.__vfHtml !== html){ card.__vfHtml = html; card.innerHTML = html; }

      let settle = $('#gcc-voyage-finance-settlement', voyagePane);
      const settleHtml = settlementCardHtml();
      if (settleHtml){
        if (!settle){
          settle = document.createElement('div');
          settle.id = 'gcc-voyage-finance-settlement';
          settle.className = 'vf-card';
          card.insertAdjacentElement('afterend', settle);
        }
        if (settle.__vfHtml !== settleHtml){ settle.__vfHtml = settleHtml; settle.innerHTML = settleHtml; }
      } else if (settle){
        settle.remove();
      }
    }
  }

  function handleChange(ev){
    const field = ev.target.closest?.('[data-vf-field]');
    if (!field) return;
    const key = field.dataset.vfField;
    link[key] = field.value;

    if (key === 'ventureId'){
      link.account = link.ventureId ? `venture:${link.ventureId}` : '';
      const fs = financeState();
      const firstAsset = (fs?.assets || []).find(a => a.linkedVentureId === link.ventureId) || (fs?.assets || []).find(a => a.type === 'ship');
      link.assetId = firstAsset?.id || '';
    }
    if (key === 'lastCategory'){
      const preset = CATEGORY_PRESETS[link.lastCategory] || CATEGORY_PRESETS.repair;
      link.lastDirection = preset.direction;
    }
    saveLink();
    applyLinkToActiveVoyage();
    queueRender();
  }

  function applyLinkToActiveVoyage(){
    const v = activeVoyage();
    if (!v) return;
    const vf = ensureVoyageFinance(v);
    if (!vf) return;
    vf.ventureId = link.ventureId;
    vf.assetId = link.assetId;
    vf.account = link.account;
  }

  function handleClick(ev){
    const pendingPost = ev.target.closest?.('[data-vf-pending-post]');
    if (pendingPost){
      ev.preventDefault();
      postPendingSettlement(pendingPost.dataset.vfPendingPost);
      return;
    }

    const pendingDismiss = ev.target.closest?.('[data-vf-pending-dismiss]');
    if (pendingDismiss){
      ev.preventDefault();
      voyageApi()?.dismissPendingFinanceAction?.(pendingDismiss.dataset.vfPendingDismiss);
      queueRender();
      return;
    }

    const quick = ev.target.closest?.('[data-vf-quick]');
    if (quick){
      ev.preventDefault();
      loadQuickSettlement(quick);
      return;
    }

    const presetBtn = ev.target.closest?.('[data-vf-preset]');
    if (presetBtn){
      const category = presetBtn.dataset.vfPreset;
      const preset = CATEGORY_PRESETS[category];
      if (preset){
        link.lastCategory = category;
        link.lastDirection = preset.direction;
        saveLink();
        queueRender();
      }
      return;
    }

    const postBtn = ev.target.closest?.('[data-vf-post]');
    if (postBtn){
      ev.preventDefault();
      postVoyageTransaction();
      return;
    }

    if (ev.target.closest?.('#ve-start')){
      setTimeout(() => { applyLinkToActiveVoyage(); queueRender(); }, 0);
    }
  }

  function formData(){
    const root = $('[data-vf-form="post"]');
    const data = {};
    if (!root) return data;
    $$('input,select,textarea', root).forEach(el => { data[el.name] = el.value; });
    return data;
  }

  function postVoyageTransaction(overrides={}){
    const finance = financeApi();
    if (!finance?.addTransaction) throw new Error('GCCFinance.addTransaction is not available.');
    normalizeLink();
    const account = selectedAccount();
    if (!account.type || !account.id) throw new Error('Choose a Finance ledger account for this voyage.');
    if (!link.ventureId) throw new Error('Choose a venture for this voyage.');

    const data = Object.assign({}, formData(), overrides || {});
    const category = data.category || link.lastCategory || 'repair';
    const preset = CATEGORY_PRESETS[category] || CATEGORY_PRESETS.repair;
    const direction = data.direction || link.lastDirection || preset.direction;
    const rawAmount = Math.abs(Number(data.amountGp || 0));
    if (!rawAmount) throw new Error('Enter an amount greater than zero.');
    const amountGp = direction === 'expense' ? -rawAmount : rawAmount;
    const v = activeVoyage();
    const vf = ensureVoyageFinance(v) || { voyageId: uid('voyage') };
    const port = data.port || currentPort();
    const memoBase = (data.memo || preset.memo || preset.label || category).trim();
    const memo = `${memoBase}${port ? ` (${port})` : ''}`;
    const links = [{ type:'venture', id:link.ventureId }];
    if (link.assetId) links.push({ type:'asset', id:link.assetId });
    if (vf.voyageId) links.push({ type:'voyage', id:vf.voyageId });

    const entry = finance.addTransaction({
      accountType: account.type,
      accountId: account.id,
      amountGp,
      category,
      memo,
      gameDate: currentGameDate(),
      source: 'voyage',
      links,
      meta: {
        source: 'voyage',
        postKind: category,
        voyageId: vf.voyageId || '',
        ventureId: link.ventureId,
        assetId: link.assetId || '',
        shipId: link.assetId || '',
        port: port || '',
        day: v?.dayNumber || 0,
        route: routeLabel(),
        origin: v?.legs?.[0]?.from || '',
        destination: v?.legs?.[v.legs.length - 1]?.to || '',
        currentLeg: currentLegLabel(),
        settlementType: data.settlementType || '',
        pendingId: data.pendingId || '',
        eventType: data.eventType || '',
        eventMeta: (data.eventMeta && typeof data.eventMeta === 'object') ? clone(data.eventMeta) : {},
        shipType: v?.shipType || selectedAsset()?.type || '',
        captain: v?.captain || selectedAsset()?.captain || ''
      }
    });

    if (finance.applyVoyageResult && link.ventureId && port){
      finance.applyVoyageResult({ ventureId:link.ventureId, assetId:link.assetId, port, voyageId:vf.voyageId || '' });
    }

    const amount = amountGp >= 0 ? `+${gp(amountGp)}` : `-${gp(Math.abs(amountGp))}`;
    toast(`Posted ${amount} to Finance: ${preset.label || category}.`);
    const amountInput = $('[data-vf-form="post"] input[name="amountGp"]');
    if (amountInput) amountInput.value = '';
    queueRender();
    return entry;
  }

  function postPendingSettlement(id){
    const action = pendingFinanceActions().find(a => a.id === id && a.status === 'pending');
    if (!action) throw new Error('Pending settlement item not found.');
    const amountEl = document.querySelector(`[data-vf-pending-amount="${id}"]`);
    const repairEl = document.querySelector(`[data-vf-pending-repair="${id}"]`);
    const amount = Math.abs(Number(amountEl?.value || action.amountGp || 0));
    if (!amount) throw new Error('Enter an amount greater than zero for this settlement item.');
    const entry = postVoyageTransaction({
      category: action.category || 'repair',
      direction: action.direction || 'expense',
      amountGp: amount,
      port: action.port || currentPort(),
      memo: action.memo || 'Voyage settlement item.',
      settlementType: 'pending',
      pendingId: action.id,
      eventType: action.eventType || action.category || 'settlement',
      eventMeta: action.meta || {}
    });
    voyageApi()?.markPendingFinancePosted?.(id, entry?.id || '', { repairHull: !!repairEl?.checked });
    toast(`Posted settlement item to Finance${repairEl?.checked ? ' and restored hull HP.' : '.'}`);
    queueRender();
    return entry;
  }

  function loadQuickSettlement(btn){
    const category = btn.dataset.vfQuick || 'port_fee';
    const preset = CATEGORY_PRESETS[category] || CATEGORY_PRESETS.port_fee;
    link.lastCategory = category;
    link.lastDirection = preset.direction;
    saveLink();
    queueRender();
    setTimeout(() => {
      const root = document.querySelector('[data-vf-form="post"]');
      if (!root) return;
      const amount = btn.dataset.vfAmount || '';
      const memo = btn.dataset.vfMemo || preset.memo || '';
      const amountEl = root.querySelector('input[name="amountGp"]');
      const memoEl = root.querySelector('textarea[name="memo"]');
      const categoryEl = root.querySelector('select[name="category"]');
      const directionEl = root.querySelector('select[name="direction"]');
      if (categoryEl) categoryEl.value = category;
      if (directionEl) directionEl.value = preset.direction;
      if (amountEl && amount) amountEl.value = amount;
      if (memoEl && memo) memoEl.value = memo;
      amountEl?.focus();
    }, 0);
  }

  function toast(msg){
    if (typeof window.showToast === 'function') window.showToast(msg);
    else console.log('[voyage-finance]', msg);
  }

  function init(){
    injectStyles();
    document.addEventListener('change', handleChange, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('gcc:finance:changed', queueRender);
    document.addEventListener('gcc:voyage:changed', queueRender);
    observer = new MutationObserver(queueRender);
    observer.observe(document.body, { childList:true, subtree:true });
    queueRender();
    console.log(`[voyage-finance] gcc-voyage-finance.js v${VERSION} loaded (localStorage only)`);
  }

  window.GCCVoyageFinance = {
    VERSION,
    getLink: () => clone(link),
    setLink: next => { link = Object.assign({}, link, next || {}); normalizeLink(); saveLink(); queueRender(); return clone(link); },
    render,
    postVoyageTransaction
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
