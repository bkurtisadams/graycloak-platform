// gw-map-sync.js v0.1.1 — 2026-05-29
// v0.1.1 — flatten stroke pts to a flat number array on publish (Firestore
//          rejects nested arrays); player side rebuilds [[x,y],…] before render.
// GW map publish (GM → players). Phase 2 of the player-view feature.
// Reads the GM's local session state — party + fog + clock (localStorage) and
// the non-hidden annotations (GWAnnotations.exportSafe()) — scopes features to
// explored parents, and writes a player-safe doc to campaigns/{cid}/maps/gw.
// Pull / onSnapshot on the player side is Phase 3.
//
// Auto-publishes (debounced) on party/fog/clock change and annotation change,
// but only when the page is bound to a campaign in GM mode (window.GWCampaign).
//
// Depends on: firebase.firestore, GCCAuth, GWSubhexData, GWAnnotations.

(function(){
  'use strict';
  const PARTY_KEY = 'gw-sx-party', FOG_KEY = 'gw-sx-revealed', CLOCK_KEY = 'gw-sx-clock';

  function db(){ return (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore() : null; }
  function uid(){ return (typeof GCCAuth !== 'undefined' && GCCAuth.getUser()) ? GCCAuth.getUser().uid : null; }
  function ls(k){ try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch(_){ return null; } }

  // Parents (col,row) holding at least one revealed subhex.
  function exploredParents(revealed){
    const D = window.GWSubhexData, set = new Set();
    if (!D || !D.ownerOf) return set;
    for (const key of (revealed || [])){
      const i = String(key).indexOf('_');
      if (i < 0) continue;
      const Q = +key.slice(0, i), R = +key.slice(i + 1);
      const o = D.ownerOf(Q, R);
      if (o) set.add(o.col + ',' + o.row);
    }
    return set;
  }
  function parentOfPoint(x, y){
    const D = window.GWSubhexData;
    if (!D || !D.svgToAxial || !D.ownerOf) return null;
    const a = D.svgToAxial(x, y), o = D.ownerOf(a.Q, a.R);
    return o ? o.col + ',' + o.row : null;
  }

  // Assemble the player-safe payload. Features outside explored parents are
  // dropped entirely (Decision #3); hidden ones are already gone via exportSafe.
  function buildPayload(){
    const revealed = Array.isArray(ls(FOG_KEY)) ? ls(FOG_KEY) : [];
    const party = ls(PARTY_KEY);
    const clock = ls(CLOCK_KEY);
    const explored = exploredParents(revealed);
    const safe = (window.GWAnnotations && window.GWAnnotations.exportSafe)
      ? window.GWAnnotations.exportSafe() : { strokes: [], markers: [] };
    const markers = (safe.markers || []).filter(m => { const p = parentOfPoint(m.x, m.y); return p && explored.has(p); });
    const strokes = (safe.strokes || [])
      .filter(s => (s.pts || []).some(pt => { const p = parentOfPoint(pt[0], pt[1]); return p && explored.has(p); }))
      .map(s => {
        const flat = []; for (const pt of (s.pts || [])) flat.push(pt[0], pt[1]);   // Firestore rejects nested arrays
        const o = { id: s.id, kind: s.kind, pts: flat };
        if (s.bbox) o.bbox = s.bbox;
        if (s.color) o.color = s.color;
        if (s.width != null) o.width = s.width;
        return o;
      });
    return {
      _updated: new Date().toISOString(),
      party: (party && Number.isFinite(party.Q) && Number.isFinite(party.R)) ? { Q: party.Q, R: party.R } : null,
      revealed: revealed,
      clock: clock || null,
      ann: { markers, strokes },
    };
  }

  async function push(cid){
    const d = db(), u = uid();
    if (!d || !cid || !u) return { ok: false, reason: 'not signed in / not ready' };
    try {
      const payload = buildPayload();
      payload.ownerUid = u;
      await d.collection('campaigns').doc(cid).collection('maps').doc('gw').set(payload, { merge: false });
      return { ok: true, revealed: payload.revealed.length, markers: payload.ann.markers.length, strokes: payload.ann.strokes.length };
    } catch(e){
      console.warn('[gw-map-sync] push failed:', e);
      return { ok: false, reason: e.message };
    }
  }

  // ── Debounced auto-publish, GM mode + campaign only ──
  let _t = null;
  function boundCid(){ const c = window.GWCampaign; return (c && c.mode === 'gm' && c.id) ? c.id : null; }
  function schedule(){ const id = boundCid(); if (!id) return; clearTimeout(_t); _t = setTimeout(() => push(id), 1500); }
  window.addEventListener('gw-party-changed', schedule);
  window.addEventListener('gw-annotations-changed', schedule);

  window.GWMapSync = { push, buildPayload };
  try { console.log('[gw-map-sync] v0.1.0 loaded'); } catch(_){}
})();
