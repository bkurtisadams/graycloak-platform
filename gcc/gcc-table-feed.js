// gcc-table-feed.js v0.1.0 — 2026-06-04
// Shared per-campaign table log: chat + dice rolls in one chronological feed.
// Extracted from campaign-detail.html's inline dice tray and generalized so any
// campaign-context page (hub, character sheet, maps) can include it with one tag.
//
// Usage (after gcc-firebase-config.js, gcc-auth.js):
//   <script src="gcc-table-feed.js"></script>
//   GCCTableFeed.init({ campId, isGM });   // isGM: bool or () => bool
//
// Firestore (unchanged collection, extended schema — needs rules v7):
//   campaigns/{campId}/rolls/{id}
//     roll:  { kind:'roll', uid, name, expr, rolls:[], mod, total, ts }
//     chat:  { kind:'chat', uid, name, text, ts }
//   Legacy docs (no `kind`) render as rolls.

const GCCTableFeed = (function(){
  'use strict';

  const MAX_TEXT = 2000;
  const FEED_LIMIT = 80;

  let campId = null;
  let isGMFn = () => false;
  let tray, panel, toggle, log, chatInput, qtyInput, modInput, dieLabel, badge;
  let selectedDie = 6;
  let _unsub = null;
  let _built = false;
  let _wired = false;
  let _seen = 0;       // entries currently shown
  let _unread = 0;

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function db(){
    return (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore() : null;
  }
  function user(){
    return (typeof GCCAuth !== 'undefined') ? GCCAuth.getUser() : null;
  }
  function gm(){
    try { return !!isGMFn(); } catch(_) { return false; }
  }
  function readableText(hex){
    const h = String(hex||'').replace('#','');
    if (h.length < 6) return '#000';
    const r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
    return (0.299*r + 0.587*g + 0.114*b) > 150 ? '#000' : '#fff';
  }

  // ── CSS (injected once; ports the original .dice-* styles verbatim) ──
  function injectStyles(){
    if (document.getElementById('gcc-table-feed-css')) return;
    const css = `
.dice-tray{position:fixed;bottom:16px;right:16px;z-index:900;font-family:var(--fb)}
.dice-toggle{position:relative;width:44px;height:44px;border-radius:50%;background:var(--accent);color:#fff;border:none;font-size:20px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);transition:all .15s;display:flex;align-items:center;justify-content:center}
.dice-toggle:hover{transform:scale(1.1);box-shadow:0 4px 16px rgba(0,0,0,0.4)}
.dice-toggle.open{background:var(--accent-dim)}
.dice-unread{position:absolute;top:-2px;right:-2px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:var(--red,#b03030);color:#fff;font-size:9px;font-weight:700;line-height:16px;text-align:center;font-family:var(--fb);display:none}
.dice-unread.show{display:block}
.dice-panel{display:none;position:absolute;bottom:54px;right:0;width:300px;background:var(--bg-card);border:1px solid var(--brd);border-radius:6px;box-shadow:var(--dd-shadow);overflow:hidden}
.dice-panel.open{display:flex;flex-direction:column}
.dice-panel-hdr{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--brd);background:var(--bg2)}
.dice-panel-title{font-family:var(--fsc);font-size:10px;letter-spacing:1.5px;color:var(--tx2)}
.dice-panel-clear{font-size:9px;color:var(--tx3);background:none;border:none;cursor:pointer;font-family:var(--fb)}
.dice-panel-clear:hover{color:var(--tx)}
.dice-log{flex:1;max-height:240px;overflow-y:auto;padding:6px 10px;display:flex;flex-direction:column;gap:4px}
.dice-log::-webkit-scrollbar{width:4px}.dice-log::-webkit-scrollbar-thumb{background:var(--brd);border-radius:2px}
.dice-log-empty{font-size:11px;color:var(--tx3);font-style:italic;padding:12px 0;text-align:center}
.dice-entry{font-size:11px;line-height:1.4;padding:3px 0;border-bottom:1px solid var(--brd);display:flex;flex-direction:column;gap:1px;position:relative}
.dice-entry:last-child{border-bottom:none}
.dice-entry-top{display:flex;justify-content:space-between;align-items:baseline;gap:6px}
.dice-who{font-weight:700;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px}
.dice-when{font-size:9px;color:var(--tx3);flex-shrink:0}
.dice-result{font-family:var(--fm);color:var(--accent);font-weight:700;font-size:13px}
.dice-detail{font-family:var(--fm);font-size:9px;color:var(--tx3)}
.dice-text{color:var(--tx);font-size:12px;line-height:1.45;word-break:break-word;white-space:pre-wrap}
.dice-del{position:absolute;top:2px;right:0;font-size:10px;line-height:1;color:var(--tx3);background:none;border:none;cursor:pointer;padding:2px 4px;opacity:0;transition:opacity .1s}
.dice-entry:hover .dice-del{opacity:1}
.dice-del:hover{color:var(--red,#b03030)}
.dice-chatrow{display:flex;gap:4px;padding:8px 10px;border-top:1px solid var(--brd);background:var(--bg2)}
.dice-chat{flex:1;padding:5px 7px;font-size:12px;font-family:var(--fb);background:var(--bg-card);color:var(--tx);border:1px solid var(--brd);border-radius:3px;outline:none}
.dice-chat:focus{border-color:var(--accent-dim)}
.dice-chat:disabled{opacity:.5;cursor:not-allowed}
.dice-send{padding:5px 10px;font-size:11px;font-family:var(--fb);font-weight:700;background:var(--accent);color:#fff;border:none;border-radius:3px;cursor:pointer}
.dice-send:hover{background:var(--accent-lt)}
.dice-controls{padding:8px 10px;border-top:1px solid var(--brd);background:var(--bg2)}
.dice-row{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}
.dice-btn{padding:4px 0;font-size:11px;font-family:var(--fm);font-weight:700;background:var(--bg-card);color:var(--tx2);border:1px solid var(--brd);border-radius:3px;cursor:pointer;transition:all .1s;flex:1;min-width:34px;text-align:center}
.dice-btn:hover{border-color:var(--accent-dim);color:var(--accent);background:var(--hover-bg)}
.dice-btn.active{border-color:var(--accent);color:var(--accent);background:rgba(96,160,208,0.08)}
.dice-input-row{display:flex;gap:4px;align-items:center}
.dice-qty{width:36px;padding:4px;font-size:11px;font-family:var(--fm);text-align:center;background:var(--bg-card);color:var(--tx);border:1px solid var(--brd);border-radius:3px;outline:none}
.dice-qty:focus{border-color:var(--accent-dim)}
.dice-mod{width:44px;padding:4px;font-size:11px;font-family:var(--fm);text-align:center;background:var(--bg-card);color:var(--tx);border:1px solid var(--brd);border-radius:3px;outline:none}
.dice-mod:focus{border-color:var(--accent-dim)}
.dice-roll-btn{flex:1;padding:5px 8px;font-size:11px;font-family:var(--fb);font-weight:700;background:var(--accent);color:#fff;border:none;border-radius:3px;cursor:pointer;transition:all .12s}
.dice-roll-btn:hover{background:var(--accent-lt)}
.dice-roll-btn:disabled{opacity:0.4;cursor:default}
.dice-lbl{font-size:9px;color:var(--tx3);font-family:var(--fsc);letter-spacing:.5px}
.dice-feat{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
.dice-feat-label{flex:1;min-width:0;color:var(--tx);font-size:11px}
.dice-feat-roll{font-family:var(--fm);font-weight:700;font-size:13px;color:var(--accent)}
.dice-feat-band{font-family:var(--fb);font-weight:700;font-size:9px;letter-spacing:.5px;padding:1px 6px;border-radius:8px;text-transform:uppercase;flex-shrink:0}
@media(max-width:500px){.dice-panel{width:calc(100vw - 32px);right:0}}`;
    const el = document.createElement('style');
    el.id = 'gcc-table-feed-css';
    el.textContent = css;
    document.head.appendChild(el);
  }

  // ── DOM (built once, appended to body) ──
  function build(){
    if (_built) return;
    injectStyles();
    tray = document.createElement('div');
    tray.className = 'dice-tray';
    tray.id = 'gcc-feed-tray';
    tray.innerHTML = `
  <div class="dice-panel" id="gcc-feed-panel">
    <div class="dice-panel-hdr"><span class="dice-panel-title">TABLE</span><button class="dice-panel-clear" id="gcc-feed-clear">Clear</button></div>
    <div class="dice-log" id="gcc-feed-log"><div class="dice-log-empty">No messages yet</div></div>
    <div class="dice-chatrow">
      <input class="dice-chat" id="gcc-feed-chat" type="text" maxlength="${MAX_TEXT}" placeholder="Message  ( /r 2d6+1 )">
      <button class="dice-send" id="gcc-feed-send">Send</button>
    </div>
    <div class="dice-controls">
      <div class="dice-row" id="gcc-feed-dice-btns">
        <button class="dice-btn" data-die="4">d4</button>
        <button class="dice-btn active" data-die="6">d6</button>
        <button class="dice-btn" data-die="8">d8</button>
        <button class="dice-btn" data-die="10">d10</button>
        <button class="dice-btn" data-die="12">d12</button>
        <button class="dice-btn" data-die="20">d20</button>
        <button class="dice-btn" data-die="100">d100</button>
      </div>
      <div class="dice-input-row">
        <input class="dice-qty" id="gcc-feed-qty" type="number" value="1" min="1" max="20">
        <span class="dice-lbl">×</span>
        <span class="dice-lbl" id="gcc-feed-die-label">d6</span>
        <span class="dice-lbl">+</span>
        <input class="dice-mod" id="gcc-feed-mod" type="number" value="0" placeholder="±">
        <button class="dice-roll-btn" id="gcc-feed-roll">Roll</button>
      </div>
    </div>
  </div>
  <button class="dice-toggle" id="gcc-feed-toggle" title="Table log">🎲<span class="dice-unread" id="gcc-feed-unread"></span></button>`;
    document.body.appendChild(tray);

    panel    = tray.querySelector('#gcc-feed-panel');
    toggle   = tray.querySelector('#gcc-feed-toggle');
    log      = tray.querySelector('#gcc-feed-log');
    chatInput= tray.querySelector('#gcc-feed-chat');
    qtyInput = tray.querySelector('#gcc-feed-qty');
    modInput = tray.querySelector('#gcc-feed-mod');
    dieLabel = tray.querySelector('#gcc-feed-die-label');
    badge    = tray.querySelector('#gcc-feed-unread');

    toggle.addEventListener('click',()=>{
      const open = panel.classList.toggle('open');
      toggle.classList.toggle('open',open);
      if (open){ _unread = 0; renderBadge(); chatInput.focus(); }
    });

    tray.querySelector('#gcc-feed-dice-btns').addEventListener('click',e=>{
      const btn = e.target.closest('[data-die]');
      if(!btn) return;
      selectedDie = parseInt(btn.dataset.die);
      dieLabel.textContent = 'd'+selectedDie;
      tray.querySelectorAll('#gcc-feed-dice-btns .dice-btn').forEach(b=>b.classList.toggle('active',b===btn));
    });

    tray.querySelector('#gcc-feed-roll').addEventListener('click',()=>rollDice(selectedDie, parseInt(qtyInput.value)||1, parseInt(modInput.value)||0));
    qtyInput.addEventListener('keydown',e=>{if(e.key==='Enter')rollDice(selectedDie,parseInt(qtyInput.value)||1,parseInt(modInput.value)||0)});
    modInput.addEventListener('keydown',e=>{if(e.key==='Enter')rollDice(selectedDie,parseInt(qtyInput.value)||1,parseInt(modInput.value)||0)});

    tray.querySelector('#gcc-feed-send').addEventListener('click',sendChat);
    chatInput.addEventListener('keydown',e=>{if(e.key==='Enter')sendChat()});

    tray.querySelector('#gcc-feed-clear').addEventListener('click',clearFeed);
    log.addEventListener('click',e=>{
      const del = e.target.closest('[data-del]');
      if(del) deleteEntry(del.dataset.del);
    });

    _built = true;
  }

  // ── Slash command parse: "/r 2d6+1" / "/roll d20" → {qty,die,mod} or null ──
  function parseRollCmd(text){
    const m = /^\/(?:r|roll)\s+(\d*)d(\d+)\s*([+-]\s*\d+)?\s*$/i.exec(text.trim());
    if(!m) return null;
    return {
      qty: Math.max(1, Math.min(20, parseInt(m[1]||'1'))),
      die: parseInt(m[2]),
      mod: m[3] ? parseInt(m[3].replace(/\s+/g,'')) : 0,
    };
  }

  function pushEntry(entry){
    const u = user();
    const conn = db();
    if (conn && campId && u){
      conn.collection('campaigns').doc(campId).collection('rolls').add(entry)
        .catch(e=>console.warn('[Feed] write failed:',e));
    } else {
      // Local-only (signed out): render directly, newest first
      if (log.querySelector('.dice-log-empty')) log.innerHTML='';
      log.insertBefore(renderEntry(entry,null), log.firstChild);
    }
  }

  function rollDice(die, qtyRaw, mod){
    const u = user();
    const qty = Math.max(1, Math.min(20, qtyRaw||1));
    const rolls = [];
    for (let i=0;i<qty;i++) rolls.push(Math.floor(Math.random()*die)+1);
    const sum = rolls.reduce((a,b)=>a+b,0) + mod;
    const expr = qty+'d'+die+(mod>0?'+'+mod:mod<0?String(mod):'');
    pushEntry({
      kind:'roll',
      uid: u?u.uid:'local',
      name: u?(u.displayName||u.email.split('@')[0]):'Local',
      expr, rolls, mod, total:sum,
      ts: new Date().toISOString(),
    });
  }

  function postFeat(label, opts){
    opts = opts || {};
    if (!_built || !campId) return false;   // tray not active on this page
    const u = user();
    pushEntry({
      kind:'feat',
      uid: u?u.uid:'local',
      name: u?(u.displayName||u.email.split('@')[0]):'Local',
      label: String(label||''),
      roll: opts.roll,
      target: opts.target||'',
      band: opts.band||'',
      color: opts.color||'',
      ts: new Date().toISOString(),
    });
    return true;
  }

  function sendChat(){
    const raw = (chatInput.value||'').trim();
    if(!raw) return;
    const cmd = parseRollCmd(raw);
    if(cmd){ chatInput.value=''; rollDice(cmd.die, cmd.qty, cmd.mod); return; }
    const u = user();
    if(!u){ return; } // chat requires sign-in (input is disabled, guard anyway)
    chatInput.value='';
    pushEntry({
      kind:'chat',
      uid: u.uid,
      name: u.displayName || u.email.split('@')[0],
      text: raw.slice(0, MAX_TEXT),
      ts: new Date().toISOString(),
    });
  }

  function canDelete(data){
    const u = user();
    if(!u) return false;
    return data.uid === u.uid || gm();
  }

  function renderEntry(data, docId){
    const when = data.ts ? new Date(data.ts) : new Date();
    const timeStr = when.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    const div = document.createElement('div');
    div.className = 'dice-entry';
    const delBtn = (docId && canDelete(data)) ? `<button class="dice-del" data-del="${esc(docId)}" title="Delete">✕</button>` : '';
    if (data.kind === 'chat'){
      div.innerHTML =
        `<div class="dice-entry-top"><span class="dice-who">${esc(data.name||'?')}</span><span class="dice-when">${esc(timeStr)}</span></div>`+
        `<div class="dice-text">${esc(data.text||'')}</div>`+delBtn;
    } else if (data.kind === 'feat'){
      const tgt = data.target ? ` vs ${esc(data.target)}` : '';
      const color = String(data.color||'#999');
      const band = data.band
        ? `<span class="dice-feat-band" style="background:${esc(color)};color:${readableText(color)}">${esc(data.band)}</span>`
        : '';
      div.innerHTML =
        `<div class="dice-entry-top"><span class="dice-who">${esc(data.name||'?')}</span><span class="dice-when">${esc(timeStr)}</span></div>`+
        `<div class="dice-feat"><span class="dice-feat-label">${esc(data.label||'')}${tgt}</span>`+
          `<span class="dice-feat-roll">${esc(data.roll)}</span>${band}</div>`+delBtn;
    } else {
      const detail = data.rolls ? data.rolls.join(' + ')+(data.mod?(' '+((data.mod>0?'+':'')+data.mod)):'') : '';
      div.innerHTML =
        `<div class="dice-entry-top"><span class="dice-who">${esc(data.name||'?')}</span><span class="dice-when">${esc(timeStr)}</span></div>`+
        `<div><span class="dice-result">${esc(data.expr||'')}: ${esc(data.total)}</span></div>`+
        (detail?`<div class="dice-detail">[${esc(detail)}]</div>`:'')+delBtn;
    }
    return div;
  }

  async function deleteEntry(docId){
    const conn = db();
    if(!conn || !campId) return;
    try { await conn.collection('campaigns').doc(campId).collection('rolls').doc(docId).delete(); }
    catch(e){ console.warn('[Feed] delete failed:',e); }
  }

  async function clearFeed(){
    const u = user();
    const conn = db();
    if (conn && campId && u){
      if(!gm()){
        if (typeof GCCDialog!=='undefined') GCCDialog.alert('Clear table log','Only the GM can clear the whole log. Use ✕ on your own messages to remove them.');
        return;
      }
      const ok = (typeof GCCDialog!=='undefined')
        ? await GCCDialog.confirm('Clear table log','Clear all chat and rolls?',{okText:'Clear',danger:true})
        : confirm('Clear all chat and rolls?');
      if(!ok) return;
      try {
        const snap = await conn.collection('campaigns').doc(campId).collection('rolls').get();
        const batch = conn.batch();
        snap.forEach(d=>batch.delete(d.ref));
        await batch.commit();
      } catch(e){ console.warn('[Feed] clear failed:',e); }
    } else {
      log.innerHTML='<div class="dice-log-empty">No messages yet</div>';
    }
  }

  function renderBadge(){
    if(_unread>0){ badge.textContent = _unread>99?'99+':String(_unread); badge.classList.add('show'); }
    else { badge.classList.remove('show'); }
  }

  function startListener(){
    const conn = db();
    if(!conn || !campId) return;
    if(_unsub) _unsub();
    _seen = 0;
    _unsub = conn.collection('campaigns').doc(campId).collection('rolls')
      .orderBy('ts','desc').limit(FEED_LIMIT)
      .onSnapshot(snap=>{
        // Unread accounting: count growth while the panel is closed.
        if (!panel.classList.contains('open') && _seen > 0 && snap.size > _seen){
          _unread += (snap.size - _seen);
          renderBadge();
        }
        _seen = snap.size;
        log.innerHTML='';
        if(snap.empty){ log.innerHTML='<div class="dice-log-empty">No messages yet</div>'; return; }
        snap.forEach(d=>log.appendChild(renderEntry(d.data(), d.id)));
        log.scrollTop = 0;
      }, err=>{
        console.warn('[Feed] listener error:',err);
        log.innerHTML='<div class="dice-log-empty">Could not load the table log</div>';
      });
  }

  function refreshAuthState(){
    const u = user();
    if (u){
      chatInput.disabled = false;
      chatInput.placeholder = 'Message  ( /r 2d6+1 )';
      startListener();
    } else {
      chatInput.disabled = true;
      chatInput.placeholder = 'Sign in to chat';
      if(_unsub){ _unsub(); _unsub=null; }
    }
  }

  function init(opts){
    opts = opts || {};
    campId = opts.campId || null;
    if (typeof opts.isGM === 'function') isGMFn = opts.isGM;
    else if (typeof opts.isGM === 'boolean') isGMFn = () => opts.isGM;
    if (!campId) return;            // tray is campaign-scoped only
    build();
    tray.style.display = '';
    // Wait for sync/auth to settle, then wire the live feed.
    if (!_wired){
      window.addEventListener('gcc-sync-ready', refreshAuthState);
      if (typeof GCCAuth !== 'undefined') GCCAuth.onAuthChange(()=>refreshAuthState());
      _wired = true;
    }
    refreshAuthState();
  }

  return { init, postFeat };
})();
