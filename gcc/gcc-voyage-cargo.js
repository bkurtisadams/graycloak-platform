// gcc-voyage-cargo.js v0.1.0 - Port Markets + Cargo Manifest for GCC Voyage
// LocalStorage-only. Do not convert to Firestore until the Finance model is final.
//
// Rules model notes from Oops, I'm at Sea / 1e AD&D seafaring trade:
// - One cargo load is 10,000 cn.
// - Speculation trade can use generic cargo base types rather than tracking
//   exact commodities: Primitive (50 gp), Consumer (150 gp), Comfort (250 gp),
//   Fine (400 gp), and Precious (2,000 gp) per load.
// - Customs are normally assessed when unloading/selling cargo.
//
// This slice keeps the bookkeeping practical: buy and sell are explicit
// actions, each posts to Finance, and the manifest is keyed to the selected
// Finance ship/asset in localStorage.

(function(){
  if (typeof window === 'undefined') return;

  const VERSION = '0.1.0';
  const STORAGE_KEY = 'gcc.voyage.cargo.v1';
  const LOAD_CN = 10000;
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gp = n => `${Math.round(Number(n || 0)).toLocaleString()} gp`;
  const pct = n => `${Number(n || 0).toLocaleString()}%`;
  const uid = (prefix='id') => `${prefix}_${Math.random().toString(36).slice(2,8)}_${Date.now().toString(36)}`;
  const clone = obj => obj == null ? obj : JSON.parse(JSON.stringify(obj));

  const CARGO_TYPES = {
    primitive: { name:'Primitive Goods', baseGp:50, desc:'Raw, coarse, bulky, or frontier goods.' },
    consumer:  { name:'Consumer Goods',  baseGp:150, desc:'Common finished goods for settled ports.' },
    comfort:   { name:'Comfort Goods',   baseGp:250, desc:'Better goods, household comforts, and urban staples.' },
    fine:      { name:'Fine Goods',      baseGp:400, desc:'High-quality wares, craft goods, cloth, wine, tools.' },
    precious:  { name:'Precious Goods',  baseGp:2000, desc:'Rare, compact, luxury, magical, or high-risk cargo.' }
  };

  // sizeMod mirrors the AD&D trade notion of port-size modifiers. The buy/sell
  // multipliers are campaign-facing defaults, not Firestore schema.
  const PORT_MARKETS = {
    'City of Greyhawk': { rank:'Trade Power', sizeMod:2, customsPct:8, moorageNote:'Busy river/lake trade hub.', buy:{ primitive:1.05, consumer:.95, comfort:.95, fine:.95, precious:1.10 }, sell:{ primitive:1.10, consumer:1.05, comfort:1.08, fine:1.12, precious:1.20 } },
    'Dyvers':           { rank:'Major Port',  sizeMod:2, customsPct:7, moorageNote:'Major Nyr Dyv entrepot.',     buy:{ primitive:.95, consumer:.95, comfort:.98, fine:1.00, precious:1.12 }, sell:{ primitive:1.05, consumer:1.08, comfort:1.10, fine:1.14, precious:1.18 } },
    'Verbobonc':        { rank:'Port',        sizeMod:1, customsPct:6, moorageNote:'Velverdyva river market.',    buy:{ primitive:.95, consumer:1.00, comfort:.98, fine:1.05, precious:1.18 }, sell:{ primitive:1.04, consumer:1.05, comfort:1.08, fine:1.12, precious:1.20 } },
    'Leukish':          { rank:'Port',        sizeMod:1, customsPct:7, moorageNote:'Nyr Dyv eastern trade.',      buy:{ primitive:.98, consumer:1.00, comfort:1.03, fine:1.04, precious:1.15 }, sell:{ primitive:1.02, consumer:1.06, comfort:1.08, fine:1.14, precious:1.22 } },
    'Hardby':           { rank:'Port',        sizeMod:1, customsPct:9, moorageNote:'Woolly Bay and river traffic.',buy:{ primitive:1.00, consumer:1.05, comfort:1.05, fine:1.08, precious:1.18 }, sell:{ primitive:1.18, consumer:1.12, comfort:1.12, fine:1.15, precious:1.24 } },
    'Safeton':          { rank:'Minor Port',  sizeMod:0, customsPct:8, moorageNote:'Wild Coast market.',          buy:{ primitive:.92, consumer:1.05, comfort:1.10, fine:1.14, precious:1.25 }, sell:{ primitive:1.12, consumer:1.10, comfort:1.15, fine:1.18, precious:1.28 } },
    'Fax':              { rank:'Minor Port',  sizeMod:0, customsPct:8, moorageNote:'Coastal stop.',               buy:{ primitive:.94, consumer:1.04, comfort:1.08, fine:1.12, precious:1.25 }, sell:{ primitive:1.10, consumer:1.10, comfort:1.12, fine:1.18, precious:1.26 } },
    'Port Elredd':      { rank:'Minor Port',  sizeMod:0, customsPct:8, moorageNote:'Optional Wild Coast port.',    buy:{ primitive:.94, consumer:1.05, comfort:1.10, fine:1.12, precious:1.25 }, sell:{ primitive:1.12, consumer:1.10, comfort:1.12, fine:1.18, precious:1.28 } },
    'Nessermouth':      { rank:'Anchorage',   sizeMod:-1,customsPct:5, moorageNote:'Small river mouth market.',    buy:{ primitive:.90, consumer:1.10, comfort:1.15, fine:1.22, precious:1.35 }, sell:{ primitive:1.00, consumer:1.08, comfort:1.12, fine:1.18, precious:1.30 } },
    'Rel Mord':         { rank:'Major Port',  sizeMod:2, customsPct:9, moorageNote:'Large inland capital market.',buy:{ primitive:1.00, consumer:.95, comfort:.98, fine:.98, precious:1.05 }, sell:{ primitive:1.12, consumer:1.08, comfort:1.10, fine:1.14, precious:1.22 } },
    'Gradsul':          { rank:'Trade Power', sizeMod:2, customsPct:10, moorageNote:'Great Keoish sea port.',      buy:{ primitive:.98, consumer:.92, comfort:.94, fine:.96, precious:.98 }, sell:{ primitive:1.25, consumer:1.15, comfort:1.15, fine:1.18, precious:1.26 } }
  };

  const DEFAULT_PORT = 'City of Greyhawk';
  const DEFAULT_HOLD_LOADS = 20;
  const SHIP_HOLD_LOADS = {
    sailing_boat:2,
    rowboat:0,
    outrigger:1,
    keelboat:6,
    longship:20,
    cog:40,
    sailing_ship:20,
    merchantman:40,
    caravel:10,
    galley_large:30,
    galley_war:6,
    dromond:30,
    old_pirate_ship:20
  };

  let store = loadStore();
  let renderQueued = false;
  let observer = null;

  function loadStore(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const next = Object.assign({ version:1, manifests:{} }, parsed || {});
      next.manifests = (next.manifests && typeof next.manifests === 'object' && !Array.isArray(next.manifests)) ? next.manifests : {};
      Object.values(next.manifests).forEach(migrateManifest);
      return next;
    } catch (err){
      console.warn('[voyage-cargo] failed to load cargo store', err);
      return { version:1, manifests:{} };
    }
  }

  function saveStore(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
    catch (err){ console.warn('[voyage-cargo] failed to save cargo store', err); }
    try { document.dispatchEvent(new CustomEvent('gcc:voyage-cargo:changed', { detail:{ state:clone(store) } })); }
    catch (err){ /* ignore */ }
  }

  function migrateManifest(m){
    if (!m) return m;
    m.holdCapacityLoads = Math.max(0, Math.round(Number(m.holdCapacityLoads || DEFAULT_HOLD_LOADS)));
    m.cargo = Array.isArray(m.cargo) ? m.cargo : [];
    m.cargo.forEach(lot => {
      lot.id = lot.id || uid('cargo');
      lot.cargoId = CARGO_TYPES[lot.cargoId] ? lot.cargoId : 'consumer';
      lot.loads = Math.max(0, Math.round(Number(lot.loads || lot.remainingLoads || 0)));
      lot.purchaseUnitGp = Math.round(Number(lot.purchaseUnitGp || lot.unitGp || CARGO_TYPES[lot.cargoId].baseGp));
      lot.purchasePort = lot.purchasePort || lot.boughtAt || '';
      lot.purchaseDate = lot.purchaseDate || lot.createdAt || new Date().toISOString();
      lot.purchaseTxnId = lot.purchaseTxnId || '';
      lot.voyageId = lot.voyageId || '';
      lot.notes = lot.notes || '';
    });
    m.cargo = m.cargo.filter(lot => lot.loads > 0);
    return m;
  }

  function financeApi(){ return window.GCCFinance || null; }
  function financeState(){
    try { return financeApi()?.getState?.() || null; }
    catch (err){ console.warn('[voyage-cargo] finance state unavailable', err); return null; }
  }
  function cargoLink(){
    try { return window.GCCVoyageFinance?.getLink?.() || {}; }
    catch (err){ return {}; }
  }
  function voyageApi(){ return window.GCCVoyage || null; }
  function activeVoyage(){ return voyageApi()?.state?.voyage || null; }
  function voyageSummary(){
    try { return voyageApi()?.getSummary?.() || null; }
    catch (err){ return null; }
  }
  function selectedVenture(){
    const fs = financeState();
    const link = cargoLink();
    return fs?.ventures?.find(v => v.id === link.ventureId) || null;
  }
  function selectedAsset(){
    const fs = financeState();
    const link = cargoLink();
    return fs?.assets?.find(a => a.id === link.assetId) || null;
  }
  function selectedAccount(){
    const link = cargoLink();
    const [type, ...rest] = String(link.account || '').split(':');
    return { type, id:rest.join(':') };
  }

  function activeVoyageId(){
    const v = activeVoyage();
    return v?.finance?.voyageId || voyageSummary()?.voyageId || '';
  }

  function manifestKey(){
    const link = cargoLink();
    if (link.assetId) return `asset:${link.assetId}`;
    if (link.ventureId) return `venture:${link.ventureId}`;
    return 'unlinked';
  }

  function defaultHoldLoads(){
    const v = activeVoyage();
    const asset = selectedAsset();
    const shipId = v?.shipId || '';
    if (SHIP_HOLD_LOADS[shipId] != null) return SHIP_HOLD_LOADS[shipId];
    const name = `${asset?.name || ''} ${asset?.type || ''} ${asset?.notes || ''}`.toLowerCase();
    if (name.includes('old pirate')) return SHIP_HOLD_LOADS.old_pirate_ship;
    if (name.includes('cog') || name.includes('large sailing')) return SHIP_HOLD_LOADS.cog;
    if (name.includes('galley')) return SHIP_HOLD_LOADS.galley_large;
    if (name.includes('longship')) return SHIP_HOLD_LOADS.longship;
    if (name.includes('rowboat') || name.includes('skiff')) return SHIP_HOLD_LOADS.rowboat;
    return DEFAULT_HOLD_LOADS;
  }

  function currentManifest(){
    const key = manifestKey();
    let m = store.manifests[key];
    const link = cargoLink();
    if (!m){
      m = {
        id:key,
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString(),
        assetId: link.assetId || '',
        ventureId: link.ventureId || '',
        holdCapacityLoads: defaultHoldLoads(),
        cargo: []
      };
      store.manifests[key] = m;
      saveStore();
    }
    m.assetId = link.assetId || m.assetId || '';
    m.ventureId = link.ventureId || m.ventureId || '';
    migrateManifest(m);
    return m;
  }

  function usedLoads(m=currentManifest()){
    return (m.cargo || []).reduce((sum, lot) => sum + Number(lot.loads || 0), 0);
  }

  function freeLoads(m=currentManifest()){
    return Math.max(0, Number(m.holdCapacityLoads || 0) - usedLoads(m));
  }

  function marketFor(port){ return PORT_MARKETS[port] || PORT_MARKETS[DEFAULT_PORT]; }
  function knownPort(port){ return !!PORT_MARKETS[port]; }

  function tradePortInfo(){
    const vloc = voyageApi()?.currentLocation?.();
    if (vloc?.mode === 'underway' || vloc?.mode === 'sunk'){
      return { port:'', label:vloc.label || 'Underway', underway:true, reason:vloc.label || 'Ship is underway.' };
    }
    if (vloc?.port) return { port:vloc.port, label:vloc.label || vloc.port, underway:false };
    const asset = selectedAsset();
    const venture = selectedVenture();
    const port = asset?.location || venture?.currentPort || DEFAULT_PORT;
    return { port, label:port, underway:false };
  }

  function price(port, cargoId, side){
    const type = CARGO_TYPES[cargoId] || CARGO_TYPES.consumer;
    const market = marketFor(port);
    const mult = Number(market?.[side]?.[cargoId] || 1);
    return Math.max(1, Math.round(type.baseGp * mult));
  }

  function customsGp(port, gross){
    return Math.max(0, Math.round(Number(gross || 0) * Number(marketFor(port).customsPct || 0) / 100));
  }

  function availableLoads(port, cargoId){
    const market = marketFor(port);
    const size = Number(market.sizeMod || 0);
    const typeIndex = Object.keys(CARGO_TYPES).indexOf(cargoId) + 1;
    const seed = stableHash(`${port}:${cargoId}`);
    return Math.max(1, ((seed % 12) + 4 + (size * 2)) - Math.max(0, typeIndex - 2));
  }

  function stableHash(text){
    let h = 2166136261;
    for (let i=0; i<text.length; i++){
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h >>> 0);
  }

  function currentGameDate(){
    const summary = voyageSummary();
    return summary?.currentDate || financeApi()?.currentGameDate?.() || '';
  }

  function routeLabel(){
    return voyageApi()?.routeLabel?.() || voyageSummary()?.route || '';
  }

  function financeReady(){
    const api = financeApi();
    const link = cargoLink();
    const account = selectedAccount();
    return !!(api?.addTransaction && link.ventureId && account.type && account.id);
  }

  function postCargoTransaction({ category, direction, amountGp, port, memo, eventType, eventMeta }){
    const amount = Math.abs(Number(amountGp || 0));
    if (!amount) throw new Error('Enter an amount greater than zero.');
    if (!financeReady()) throw new Error('Choose a Finance venture, ship/asset, and ledger account first.');

    if (window.GCCVoyageFinance?.postVoyageTransaction){
      return window.GCCVoyageFinance.postVoyageTransaction({
        category,
        direction,
        amountGp: amount,
        port,
        memo,
        settlementType:'cargo_manifest',
        eventType: eventType || category,
        eventMeta: eventMeta || {}
      });
    }

    const finance = financeApi();
    const link = cargoLink();
    const account = selectedAccount();
    const signed = direction === 'expense' ? -amount : amount;
    const links = [{ type:'venture', id:link.ventureId }];
    if (link.assetId) links.push({ type:'asset', id:link.assetId });
    const voyageId = activeVoyageId();
    if (voyageId) links.push({ type:'voyage', id:voyageId });
    const entry = finance.addTransaction({
      accountType: account.type,
      accountId: account.id,
      amountGp: signed,
      category,
      memo,
      gameDate: currentGameDate(),
      source:'voyage',
      links,
      meta:{
        source:'voyage',
        postKind:category,
        settlementType:'cargo_manifest',
        voyageId,
        ventureId:link.ventureId,
        assetId:link.assetId || '',
        port:port || '',
        route:routeLabel(),
        eventType:eventType || category,
        eventMeta:eventMeta || {}
      }
    });
    if (finance.applyVoyageResult && link.ventureId && port){
      finance.applyVoyageResult({ ventureId:link.ventureId, assetId:link.assetId, port, voyageId });
    }
    return entry;
  }

  function buyCargo(cargoId, qty){
    const info = tradePortInfo();
    if (info.underway || !info.port) throw new Error('Cargo can only be bought in port.');
    if (!knownPort(info.port)) throw new Error(`No market data for ${info.port}.`);
    const type = CARGO_TYPES[cargoId];
    if (!type) throw new Error('Unknown cargo type.');
    const loads = Math.max(0, Math.floor(Number(qty || 0)));
    if (!loads) throw new Error('Enter cargo loads to buy.');
    const manifest = currentManifest();
    if (loads > freeLoads(manifest)) throw new Error(`Not enough hold space. Free space: ${freeLoads(manifest)} load(s).`);
    const avail = availableLoads(info.port, cargoId);
    if (loads > avail) throw new Error(`Only ${avail} load(s) are available from this port market today.`);
    const unit = price(info.port, cargoId, 'buy');
    const total = unit * loads;
    const entry = postCargoTransaction({
      category:'cargo_purchase',
      direction:'expense',
      amountGp:total,
      port:info.port,
      memo:`Bought ${loads} load(s) ${type.name} at ${info.port} (${gp(unit)}/load).`,
      eventType:'cargo_purchase',
      eventMeta:{ cargoId, cargoName:type.name, loads, unitGp:unit, grossGp:total, loadCn:LOAD_CN, manifestId:manifest.id }
    });

    manifest.cargo.unshift({
      id:uid('cargo'),
      cargoId,
      loads,
      purchasePort:info.port,
      purchaseDate:new Date().toISOString(),
      purchaseGameDate:currentGameDate(),
      purchaseUnitGp:unit,
      purchaseTotalGp:total,
      purchaseTxnId:entry?.id || '',
      voyageId:activeVoyageId(),
      route:routeLabel(),
      notes:''
    });
    manifest.updatedAt = new Date().toISOString();
    saveStore();
    toast(`Bought ${loads} load(s) ${type.name} and posted ${gp(total)} to Finance.`);
    queueRender();
  }

  function sellCargo(lotId, qty){
    const info = tradePortInfo();
    if (info.underway || !info.port) throw new Error('Cargo can only be sold in port.');
    if (!knownPort(info.port)) throw new Error(`No market data for ${info.port}.`);
    const manifest = currentManifest();
    const lot = (manifest.cargo || []).find(c => c.id === lotId);
    if (!lot) throw new Error('Cargo lot not found.');
    const type = CARGO_TYPES[lot.cargoId] || CARGO_TYPES.consumer;
    const loads = Math.max(0, Math.min(Math.floor(Number(qty || lot.loads)), Number(lot.loads || 0)));
    if (!loads) throw new Error('Enter cargo loads to sell.');
    const unit = price(info.port, lot.cargoId, 'sell');
    const gross = unit * loads;
    const customs = customsGp(info.port, gross);
    const net = gross - customs;
    const basis = Number(lot.purchaseUnitGp || 0) * loads;
    const profit = net - basis;
    const entry = postCargoTransaction({
      category:'cargo_sale',
      direction:'income',
      amountGp:net,
      port:info.port,
      memo:`Sold ${loads} load(s) ${type.name} at ${info.port} (${gp(unit)}/load, ${gp(customs)} customs, ${profit >= 0 ? '+' : ''}${gp(profit)} profit).`,
      eventType:'cargo_sale',
      eventMeta:{
        cargoId:lot.cargoId,
        cargoName:type.name,
        loads,
        unitGp:unit,
        grossGp:gross,
        customsGp:customs,
        netGp:net,
        purchaseUnitGp:Number(lot.purchaseUnitGp || 0),
        purchasePort:lot.purchasePort || '',
        profitGp:profit,
        loadCn:LOAD_CN,
        manifestId:manifest.id,
        purchaseTxnId:lot.purchaseTxnId || ''
      }
    });

    lot.loads -= loads;
    lot.lastSaleTxnId = entry?.id || lot.lastSaleTxnId || '';
    lot.lastSalePort = info.port;
    lot.lastSaleDate = new Date().toISOString();
    if (lot.loads <= 0){
      manifest.cargo = manifest.cargo.filter(c => c.id !== lotId);
    }
    manifest.updatedAt = new Date().toISOString();
    saveStore();
    toast(`Sold ${loads} load(s) ${type.name} and posted ${gp(net)} to Finance.`);
    queueRender();
  }

  function setHoldCapacity(loads){
    const m = currentManifest();
    const next = Math.max(0, Math.round(Number(loads || 0)));
    if (next < usedLoads(m)) throw new Error(`Hold capacity cannot be below current cargo (${usedLoads(m)} load(s)).`);
    m.holdCapacityLoads = next;
    m.updatedAt = new Date().toISOString();
    saveStore();
    toast(`Cargo hold capacity saved: ${next} load(s).`);
    queueRender();
  }

  function marketRowsHtml(info, manifest){
    const port = info.port || DEFAULT_PORT;
    const disabled = info.underway || !knownPort(port) || !financeReady() ? ' disabled' : '';
    return Object.entries(CARGO_TYPES).map(([id, type]) => {
      const buy = price(port, id, 'buy');
      const sell = price(port, id, 'sell');
      const avail = availableLoads(port, id);
      return `<tr>
        <td><b>${esc(type.name)}</b><small>${esc(type.desc)}</small></td>
        <td>${gp(type.baseGp)}</td>
        <td>${gp(buy)}<small>${avail} load${avail===1?'':'s'} available</small></td>
        <td>${gp(sell)}<small>before customs</small></td>
        <td><input class="ve-input vc-qty" data-vc-buy-qty="${esc(id)}" type="number" min="0" max="${esc(avail)}" value="1"></td>
        <td><button class="ve-btn vc-inline" data-vc-buy="${esc(id)}"${disabled}>Buy &amp; Post</button></td>
      </tr>`;
    }).join('');
  }

  function cargoRowsHtml(info, manifest){
    if (!manifest.cargo.length) return `<tr><td colspan="8" class="vc-empty-row">No cargo aboard.</td></tr>`;
    const port = info.port || DEFAULT_PORT;
    const disabled = info.underway || !knownPort(port) || !financeReady() ? ' disabled' : '';
    return manifest.cargo.map(lot => {
      const type = CARGO_TYPES[lot.cargoId] || CARGO_TYPES.consumer;
      const unit = price(port, lot.cargoId, 'sell');
      const gross = unit * Number(lot.loads || 0);
      const customs = customsGp(port, gross);
      const net = gross - customs;
      const basis = Number(lot.purchaseUnitGp || 0) * Number(lot.loads || 0);
      const profit = net - basis;
      return `<tr>
        <td><b>${esc(type.name)}</b><small>${esc(lot.purchasePort || 'unknown port')} · ${gp(lot.purchaseUnitGp)}/load</small></td>
        <td>${Number(lot.loads || 0)}</td>
        <td>${gp(unit)}</td>
        <td>${gp(customs)}</td>
        <td>${gp(net)}</td>
        <td class="${profit >= 0 ? 'vc-profit' : 'vc-loss'}">${profit >= 0 ? '+' : ''}${gp(profit)}</td>
        <td><input class="ve-input vc-qty" data-vc-sell-qty="${esc(lot.id)}" type="number" min="0" max="${Number(lot.loads || 0)}" value="${Number(lot.loads || 0)}"></td>
        <td><button class="ve-btn vc-inline" data-vc-sell="${esc(lot.id)}"${disabled}>Sell &amp; Post</button></td>
      </tr>`;
    }).join('');
  }

  function manifestValueHtml(info, manifest){
    const port = info.port || DEFAULT_PORT;
    const netValue = (manifest.cargo || []).reduce((sum, lot) => {
      const gross = price(port, lot.cargoId, 'sell') * Number(lot.loads || 0);
      return sum + gross - customsGp(port, gross);
    }, 0);
    const costBasis = (manifest.cargo || []).reduce((sum, lot) => sum + Number(lot.purchaseUnitGp || 0) * Number(lot.loads || 0), 0);
    const profit = netValue - costBasis;
    return { netValue, costBasis, profit };
  }

  function cardHtml(){
    const finance = financeApi();
    if (!finance) return `<div class="vc-head"><b>📦 Cargo Manifest</b><span class="vc-pill">waiting for Finance</span></div><p class="vc-muted">Finance is not loaded yet.</p>`;

    const link = cargoLink();
    const asset = selectedAsset();
    const venture = selectedVenture();
    if (!link.ventureId || !link.assetId){
      return `<div class="vc-head"><b>📦 Port Markets + Cargo Manifest</b><span class="vc-pill">localStorage only</span></div><p class="vc-muted">Choose a Venture and Ship / Asset in the Finance Link card before managing cargo.</p>`;
    }

    const info = tradePortInfo();
    const manifest = currentManifest();
    const market = info.port ? marketFor(info.port) : null;
    const values = manifestValueHtml(info, manifest);
    const holdUsed = usedLoads(manifest);
    const holdFree = freeLoads(manifest);
    const account = selectedAccount();
    const accountLabel = account.type && account.id && finance.accountLabel ? finance.accountLabel(account.type, account.id) : link.account || 'No account';
    const blocked = info.underway
      ? `<div class="vc-warning">${esc(info.reason || 'Ship is underway.')} Cargo is tracked, but buying and selling are locked until arrival.</div>`
      : !knownPort(info.port)
        ? `<div class="vc-warning">No market data for ${esc(info.port || 'this location')} yet.</div>`
        : !financeReady()
          ? `<div class="vc-warning">Select a Finance ledger account before posting cargo transactions.</div>`
          : '';

    return `
      <div class="vc-head"><b>📦 Port Markets + Cargo Manifest</b><span class="vc-pill">localStorage only</span></div>
      <div class="vc-muted">Rules baseline: 1 cargo load = ${LOAD_CN.toLocaleString()} cn. Purchases and sales post explicitly to Finance.</div>
      <div class="vc-summary-grid">
        <div><b>${esc(asset?.name || 'Ship')}</b><span>asset</span></div>
        <div><b>${esc(info.label || info.port || 'No port')}</b><span>${esc(market?.rank || (info.underway ? 'underway' : 'market'))}</span></div>
        <div><b>${holdUsed} / ${Number(manifest.holdCapacityLoads || 0)}</b><span>loads used</span></div>
        <div><b>${gp(values.netValue)}</b><span>est. net cargo</span></div>
      </div>
      <div class="vc-muted">Venture: <b>${esc(venture?.name || '-')}</b> · Ledger: <b>${esc(accountLabel)}</b>${market ? ` · Customs on sale: <b>${pct(market.customsPct)}</b>` : ''}</div>
      ${blocked}
      <details class="vc-section" open>
        <summary>Cargo hold</summary>
        <div class="vc-hold-row">
          <label class="ve-lbl">Hold Capacity (loads)<input class="ve-input" id="vc-hold-capacity" type="number" min="${holdUsed}" value="${Number(manifest.holdCapacityLoads || 0)}"></label>
          <div class="vc-muted vc-hold-note">Used ${holdUsed}, free ${holdFree}. One load is ${LOAD_CN.toLocaleString()} cn. The Surprise defaults to 20 loads until its exact ship class is set.</div>
          <button class="ve-btn vc-inline" data-vc-save-hold>Save Hold</button>
        </div>
      </details>
      <details class="vc-section" open>
        <summary>Buy cargo at ${esc(info.port || 'port')}</summary>
        ${market ? `<div class="vc-muted">${esc(market.moorageNote || '')}</div>` : ''}
        <table class="vc-table"><thead><tr><th>Cargo</th><th>Base</th><th>Buy</th><th>Est. sell here</th><th>Loads</th><th></th></tr></thead><tbody>${marketRowsHtml(info, manifest)}</tbody></table>
      </details>
      <details class="vc-section" open>
        <summary>Cargo aboard</summary>
        <div class="vc-muted">Cost basis: <b>${gp(values.costBasis)}</b> · Estimated net if sold here: <b>${gp(values.netValue)}</b> · Estimated profit: <b class="${values.profit >= 0 ? 'vc-profit' : 'vc-loss'}">${values.profit >= 0 ? '+' : ''}${gp(values.profit)}</b>. Profit is shown, not double-posted.</div>
        <table class="vc-table"><thead><tr><th>Cargo</th><th>Loads</th><th>Sell/load</th><th>Customs</th><th>Net</th><th>Profit</th><th>Sell</th><th></th></tr></thead><tbody>${cargoRowsHtml(info, manifest)}</tbody></table>
      </details>`;
  }

  function injectStyles(){
    if ($('#gcc-voyage-cargo-style')) return;
    const style = document.createElement('style');
    style.id = 'gcc-voyage-cargo-style';
    style.textContent = `
      #voyage-panel .vc-card{margin-top:10px;padding:10px;background:#15100a;border:1px solid #73582f;border-radius:9px;color:#f4e4b8;font-family:Georgia,serif;font-size:11px;}
      #voyage-panel .vc-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;color:#e8b840;font-family:'Cinzel',serif;letter-spacing:.04em;}
      #voyage-panel .vc-pill{border:1px solid #6b5129;border-radius:999px;padding:1px 6px;color:#c8a96e;background:#21170d;font-family:system-ui,sans-serif;font-size:10px;letter-spacing:0;}
      #voyage-panel .vc-muted{color:#c8a96e;font-size:10px;line-height:1.35;margin-top:5px;}
      #voyage-panel .vc-warning{margin:8px 0;padding:6px 8px;background:rgba(120,58,18,.22);border:1px solid #8a4f23;border-radius:7px;color:#ffc27a;font-size:10px;line-height:1.35;}
      #voyage-panel .vc-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0;}
      #voyage-panel .vc-summary-grid>div{background:#0d0600;border:1px solid #4a3518;border-radius:7px;padding:6px;text-align:center;min-width:0;}
      #voyage-panel .vc-summary-grid b{display:block;color:#f4e4b8;font-size:11px;font-family:Georgia,serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      #voyage-panel .vc-summary-grid span{display:block;color:#c8a96e;font-size:9px;text-transform:uppercase;letter-spacing:.08em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      #voyage-panel .vc-section{margin-top:8px;border-top:1px solid #4a3518;padding-top:6px;}
      #voyage-panel .vc-section summary{cursor:pointer;color:#d9b76f;font-family:'Cinzel',serif;letter-spacing:.04em;font-size:10px;}
      #voyage-panel .vc-hold-row{display:grid;grid-template-columns:95px 1fr 80px;gap:6px;align-items:end;}
      #voyage-panel .vc-hold-note{margin-bottom:7px;}
      #voyage-panel .vc-table{width:100%;border-collapse:collapse;margin-top:6px;font-size:10px;}
      #voyage-panel .vc-table th,#voyage-panel .vc-table td{border-bottom:1px solid #3c2a14;padding:4px 3px;vertical-align:top;text-align:left;}
      #voyage-panel .vc-table th{color:#d6a84f;font-family:'Cinzel',serif;font-size:9px;letter-spacing:.04em;}
      #voyage-panel .vc-table td small{display:block;color:#9f8454;font-size:9px;line-height:1.25;margin-top:1px;}
      #voyage-panel .vc-qty{min-width:46px;padding:3px 5px;font-size:10px;}
      #voyage-panel .ve-btn.vc-inline{width:auto;margin-top:0;padding:4px 6px;font-size:9px;white-space:nowrap;}
      #voyage-panel .vc-empty-row{color:#9f8454;font-style:italic;text-align:center;}
      #voyage-panel .vc-profit{color:#9ce28a;}
      #voyage-panel .vc-loss{color:#ff9d7a;}
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
    const voyagePane = $('#ve-pane-voyage', panel);
    if (!voyagePane) return;
    let card = $('#gcc-voyage-cargo-card', voyagePane);
    const anchor = $('#gcc-voyage-finance-settlement', voyagePane) || $('#gcc-voyage-finance-voyage', voyagePane) || $('#ve-voyage-body', voyagePane);
    if (!card){
      card = document.createElement('div');
      card.id = 'gcc-voyage-cargo-card';
      card.className = 'vc-card';
      if (anchor) anchor.insertAdjacentElement('afterend', card);
      else voyagePane.appendChild(card);
    } else if (anchor && card.previousElementSibling !== anchor){
      anchor.insertAdjacentElement('afterend', card);
    }
    const html = cardHtml();
    if (card.__vcHtml !== html){
      card.__vcHtml = html;
      card.innerHTML = html;
    }
  }

  function handleClick(ev){
    const hold = ev.target.closest?.('[data-vc-save-hold]');
    if (hold){
      ev.preventDefault();
      try { setHoldCapacity($('#vc-hold-capacity')?.value); }
      catch (err){ toast(err.message || String(err)); }
      return;
    }

    const buy = ev.target.closest?.('[data-vc-buy]');
    if (buy){
      ev.preventDefault();
      const cargoId = buy.dataset.vcBuy;
      const qty = document.querySelector(`[data-vc-buy-qty="${cssEscape(cargoId)}"]`)?.value;
      try { buyCargo(cargoId, qty); }
      catch (err){ toast(err.message || String(err)); }
      return;
    }

    const sell = ev.target.closest?.('[data-vc-sell]');
    if (sell){
      ev.preventDefault();
      const lotId = sell.dataset.vcSell;
      const qty = document.querySelector(`[data-vc-sell-qty="${cssEscape(lotId)}"]`)?.value;
      try { sellCargo(lotId, qty); }
      catch (err){ toast(err.message || String(err)); }
    }
  }

  function cssEscape(value){
    if (window.CSS?.escape) return window.CSS.escape(value);
    return String(value).replace(/(["\\\]])/g, '\\$1');
  }

  function toast(msg){
    if (typeof window.showToast === 'function') window.showToast(msg);
    else console.log('[voyage-cargo]', msg);
  }

  function init(){
    injectStyles();
    document.addEventListener('click', handleClick, true);
    document.addEventListener('gcc:finance:changed', queueRender);
    document.addEventListener('gcc:voyage:changed', queueRender);
    document.addEventListener('gcc:voyage-cargo:changed', queueRender);
    observer = new MutationObserver(queueRender);
    observer.observe(document.body, { childList:true, subtree:true });
    queueRender();
    console.log(`[voyage-cargo] gcc-voyage-cargo.js v${VERSION} loaded (localStorage only)`);
  }

  window.GCCVoyageCargo = {
    VERSION,
    cargoTypes: clone(CARGO_TYPES),
    markets: clone(PORT_MARKETS),
    getStore: () => clone(store),
    getCurrentManifest: () => clone(currentManifest()),
    setHoldCapacity,
    buyCargo,
    sellCargo,
    render
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
