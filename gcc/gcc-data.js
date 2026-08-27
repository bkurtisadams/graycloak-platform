// gcc-data.js v1.5.1 — 2026-08-16
// v1.5.1: add1e tools gain 'Chainmail Battles' → chainmail-board.html
//         (campaign-detail appends ?camp=<cid> so the board opens net-live;
//         chainmail multiplayer Slice 2A, board v0.11.177).
// v1.5.0: Roster tombstones — updateCampaign diffs any incoming characters
//         array against the stored roster: removed entries are recorded in
//         camp.deletedCharacters (so gcc-sync v2.4.0 can keep them dead
//         across devices), added/changed entries are stamped _updated so
//         deliberate re-adds outrank their own tombstones in the merge.
// v1.4.0: 'sig'-prefixed sessionStableKey (matches gcc-sync ids), export
//         sessionStableId, collapse duplicate session _ids newest-wins
//         instead of re-IDing them (re-IDing hid sync echoes from dedupe)
// v1.3.0: Schema v4 — per-image pos/caption, remove section.layout
// v1.1.0: Add lore array, enriched session schema (v2 migration),
//         system-aware labels (sessionLabel, xpLabel, LORE_TYPES)
// Graycloak's Campaign Corner — core data layer

const GCC = (function() {

  // ── ID generation ──
  let _idCounter = 0;
  function genId(prefix) {
    return (prefix || 'id') + '_' + Date.now() + '_' + (++_idCounter);
  }

  // ── Storage helpers ──
  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; }
  }
  function save(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      // gcc-sync patches GCC.save, but the campaign helpers call this
      // closure-scoped save() directly. Notify the sync bridge here so
      // campaign/session edits do not remain browser-local.
      if (typeof GCCSync !== 'undefined' && GCCSync.notifySync) {
        GCCSync.notifySync(key);
      }
    } catch(e) { console.warn('[GCC] save failed for', key, e); }
  }

  // ── Keys ──
  const KEYS = {
    campaigns: 'gcc-campaigns',
    systems: 'gcc-systems',
    activity: 'gcc-activity',
    jumpback: 'gcc-jumpback',
    vtts: 'gcc-vtts',
    settings: 'gcc-settings',
    // Legacy MP keys (read for migration)
    mpChars: 'mp-char-list',
    mpVehs: 'mp-veh-list',
    mpCamps: 'mp-campaigns',
    mpCampSel: 'mp-campaign-sel',
    // System char lists
    faseripChars: 'gcc-faserip-chars',
    add1eChars: 'gcc-add1e-chars',
  };

  // ── System Registry ──
  // Each system defines its id, display info, and tool definitions
  const SYSTEM_DEFS = [
  {
  id: 'mp',
  name: 'Mighty Protectors',
  icon: '🛡',
  color: '#a03020',
  tools: [
    { id: 'mp-char', name: 'Character Builder', href: 'character.html', charList: 'mp-char-list' },
    { id: 'mp-gw-char', name: 'Gamma World Starter', href: 'gw-character.html', charList: 'mp-char-list' },
    { id: 'mp-veh', name: 'Vehicle Builder', href: 'vehicle.html', charList: 'mp-veh-list', vehicles: true },
    { id: 'mp-r20', name: 'Roll20 Import', href: 'character.html?r20=1' },
    { id: 'mp-gw-map', name: 'Gamma World Map', href: 'gw-map.html' },
  ]
},
    {
      id: 'faserip',
      name: 'FASERIP',
      icon: '⚡',
      color: '#4a7a9a',
      tools: [
        { id: 'fas-char', name: 'Character Sheet', href: 'faserip.html', charList: 'gcc-faserip-chars' },
        { id: 'fas-table', name: 'Universal Table', href: 'faserip-table.html' },
        { id: 'fas-karma', name: 'Karma Log', href: null },
      ]
    },
    {
      id: 'add1e',
      name: 'AD&D 1st Edition',
      icon: '🗡',
      color: '#5a8a30',
      tools: [
        { id: 'add1-play', name: 'Play / Character Select', href: 'play.html' },
        { id: 'add1-map', name: 'Campaign Map', href: 'greyhawk-map.html' },
        { id: 'add1-hommlet', name: 'Hommlet (home base)', href: 'hommlet.html' },
        { id: 'add1-dsim', name: 'Dungeon Encounter Sim', href: 'dungeon-encounter.html' },
        { id: 'add1-char', name: 'Character Sheet', href: 'adnd.html', charList: 'gcc-add1e-chars' },
        { id: 'add1-enc', name: 'Encounter Generator', href: null },
        { id: 'add1-trs', name: 'Treasure Generator', href: null },
        { id: 'add1-wild', name: 'Wilderness Generator', href: null },
        { id: 'add1-dun', name: 'DMG Dungeon Builder', href: null },
        { id: 'add1-voy', name: 'Voyage Simulator', href: 'greyhawk-map.html#voyage' },
        { id: 'add1-set', name: 'Settlement Editor', href: 'settlement-editor.html' },
        { id: 'add1-chainmail', name: 'Chainmail Battles', href: 'chainmail-board.html' },
      ]
    },



  ];

  // ── System-specific labels ──
  const TEAM_LABELS = {
    faserip: 'Team',
    mp: 'Team',
    add1e: 'Party',
  };
  function teamLabel(systemId) {
    return TEAM_LABELS[systemId] || 'Party';
  }

  const SESSION_LABELS = { faserip: 'Issue', mp: 'Episode', add1e: 'Session' };
  function sessionLabel(systemId) { return SESSION_LABELS[systemId] || 'Session'; }

  const XP_LABELS = { faserip: 'Karma', mp: 'XP', add1e: 'XP' };
  function xpLabel(systemId) { return XP_LABELS[systemId] || 'XP'; }

  const LORE_TYPES = ['npc', 'location', 'faction', 'item', 'other'];
  const LORE_TYPE_LABELS = { npc: 'NPC', location: 'Location', faction: 'Faction', item: 'Item', other: 'Other' };

  // ── Campaign Rule Toggles ──
  const RULE_DEFS = {
    add1e: [
      { id:'nwp',                 label:'Non-Weapon Proficiencies', desc:'2e-style proficiency system (OA/DSG/WSG/PHB2e)' },
      { id:'weaponSpec',          label:'Weapon Specialization',    desc:'Fighters can specialize in a single weapon (UA/2e)' },
      { id:'psionics',            label:'Psionics',                 desc:'PHB Appendix I psionic disciplines' },
      { id:'criticalHits',        label:'Critical Hits',            desc:'Natural 20 deals maximum or double damage' },
      { id:'calledShots',         label:'Called Shots',             desc:'Target specific body locations at a penalty' },
      { id:'detailedEncumbrance', label:'Detailed Encumbrance',     desc:'Track item weights vs. simple encumbrance categories' },
      { id:'segmentedInitiative', label:'Segmented Initiative',     desc:'Individual initiative with weapon speed factors' },
      { id:'weaponVsAC',          label:'Weapon vs. AC Modifiers',  desc:'Apply weapon-type vs. armor-type adjustments' },
      { id:'spellComponents',     label:'Spell Components',         desc:'Track material components for spells' },
      { id:'spellFumbles',        label:'Spell Fumbles',            desc:'Natural 1 on spell check causes mishap' },
      { id:'moraleChecks',        label:'Morale Checks',            desc:'Monsters and henchmen check morale' },
    ],
    faserip: [
      { id:'teamKarmaPool',       label:'Team Karma Pool',          desc:'Shared karma pool for team members' },
      { id:'classicAdvancement',  label:'Classic Advancement',      desc:'Use original FASERIP advancement rules' },
    ],
    mp: [
      { id:'strictDefenses',      label:'Strict Defense Tracking',  desc:'Enforce force-field and armor depletion exactly' },
    ],
  };
  function getRuleDefs(systemId) { return RULE_DEFS[systemId] || []; }

  // ── Schema Migration ──
  function normSessionText(v) {
    return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }
  function sessionStableKey(s) {
    if (!s || typeof s !== 'object') return '';
    const title = normSessionText(s.title), date = normSessionText(s.date);
    const gameDate = normSessionText(s.gameDate), text = normSessionText(s.text);
    if (!title && !date && !gameDate && !text) return '';
    const sections = (s.sections || []).map(sec => [
      normSessionText(sec.title),
      normSessionText(sec.text),
      (sec.images || []).map(img => [normSessionText(img.caption), normSessionText(img.size), normSessionText(img.pos)].join('^')).join('~')
    ].join('~')).join('||');
    const tags = (s.tags || []).map(t => normSessionText(t.type) + ':' + normSessionText(t.name)).sort().join(',');
    return ['sig', normSessionText(s.type || 'session'), title, date, gameDate, text, String(s.xp || 0), String(s.visible !== false), sections, tags].join('|');
  }
  function sessionStableId(s) {
    const key = sessionStableKey(s);
    return key ? ('ses_' + stableHash(key)) : genId('ses');
  }
  function stableHash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }
  function normalizeSessions(sessions, campStamp) {
    if (!Array.isArray(sessions)) return false;
    const byId = new Map();
    let changed = false;
    sessions.forEach(s => {
      if (!s || typeof s !== 'object') return;
      if (!s._id) {
        const key = sessionStableKey(s);
        s._id = key ? ('ses_' + stableHash(key)) : genId('ses');
        changed = true;
      }
      if (!s._created) { s._created = s._updated || campStamp || new Date().toISOString(); changed = true; }
      if (!s._updated) { s._updated = s._created; changed = true; }
      if (s.gameDate === undefined) { s.gameDate = ''; changed = true; }
      if (s.image === undefined) { s.image = ''; changed = true; }
      if (s.sections === undefined) { s.sections = []; changed = true; }
      if (s.tags === undefined) { s.tags = []; changed = true; }
      if (s.visible === undefined) { s.visible = true; changed = true; }
      if (s.type === undefined) { s.type = 'session'; changed = true; }
      const prev = byId.get(s._id);
      if (!prev) { byId.set(s._id, s); return; }
      // Same _id = same entry echoed by sync; keep the newer copy
      const tPrev = Date.parse(prev._updated || prev._created || '') || 0;
      const tCur = Date.parse(s._updated || s._created || '') || 0;
      if (tCur > tPrev) byId.set(s._id, s);
      changed = true;
    });
    if (byId.size !== sessions.filter(s => s && typeof s === 'object').length) {
      const keep = new Set(byId.values());
      for (let i = sessions.length - 1; i >= 0; i--) {
        const s = sessions[i];
        if (s && typeof s === 'object' && !keep.has(s)) sessions.splice(i, 1);
      }
    }
    return changed;
  }
  function migrateEntity(entity) {
    if (!entity) return entity;
    if (!entity.schemaVersion) entity.schemaVersion = 0;
    if (entity.schemaVersion < 1) {
      // v0→v1: normalize listKey→storageKey in campaign character refs
      if (entity.characters) {
        entity.characters.forEach(ch => {
          if (ch.listKey && !ch.storageKey) {
            ch.storageKey = ch.listKey;
            delete ch.listKey;
          }
        });
      }
      entity.schemaVersion = 1;
    }
    if (entity.schemaVersion < 2) {
      // v1→v2: enrich sessions with new fields, add lore array
      if (entity.sessions) normalizeSessions(entity.sessions, entity.updated || entity.created);
      if (!entity.lore) entity.lore = [];
      entity.schemaVersion = 2;
    }
    if (entity.schemaVersion < 3) {
      // v2→v3: multi-image sections (image string → images array)
      // v3→v4: per-image pos/caption, remove section.layout
      if (entity.sessions) {
        entity.sessions.forEach(s => {
          (s.sections || []).forEach(sec => {
            if (sec.images === undefined) {
              sec.images = sec.image ? [{ src: sec.image, size: 'md', pos: 'right', caption: '' }] : [];
              delete sec.image;
            }
            // Backfill pos/caption on existing images
            (sec.images || []).forEach(img => {
              if (img.pos === undefined) img.pos = 'right';
              if (img.caption === undefined) img.caption = '';
            });
            delete sec.layout;
          });
        });
      }
      entity.schemaVersion = 3;
    }
    if (entity.schemaVersion < 4) {
      if (entity.sessions && normalizeSessions(entity.sessions, entity.updated || entity.created)) {
        // normalized below by save path
      }
      if (!Array.isArray(entity.deletedSessions)) entity.deletedSessions = [];
      entity.session = Array.isArray(entity.sessions) ? entity.sessions.filter(s => s.type !== 'timeline').length : (entity.session || 0);
      entity.schemaVersion = 4;
    }
    return entity;
  }

  // ── Campaigns ──
  function loadCampaigns() {
    const list = load(KEYS.campaigns) || [];
    let dirty = false;
    list.forEach((c, i) => {
      if (!c.schemaVersion || c.schemaVersion < 4) {
        list[i] = migrateEntity(c);
        dirty = true;
      }
    });
    if (dirty) save(KEYS.campaigns, list);
    return list;
  }
  function saveCampaigns(list) {
    save(KEYS.campaigns, list);
  }
  function getCampaign(id) {
    return loadCampaigns().find(c => c.id === id) || null;
  }
  function addCampaign(data) {
    const list = loadCampaigns();
    const camp = {
      id: data.id || ('camp-' + Date.now()),
      schemaVersion: 4,
      name: data.name || 'Untitled',
      system: data.system || 'mp',
      gm: data.gm || '',
      gmTitle: data.gmTitle || 'GM',
      world: data.world || '',
      genre: data.genre || '',
      pitch: data.pitch || '',
      status: data.status || 'active',
      players: data.players || 0,
      session: data.session || 0,
      lastPlayed: data.lastPlayed || null,
      nextSession: data.nextSession || null,
      schedule: data.schedule || '',
      playMode: data.playMode || 'online',
      vttLabel: data.vttLabel || '',
      vttUrl: data.vttUrl || '',
      vttPlatform: data.vttPlatform || '',
      xpMethod: data.xpMethod || '',
      rulebooks: data.rulebooks || '',
      houseRules: data.houseRules || '',
      pinned: data.pinned || false,
      campaignImage: data.campaignImage || '',
      hqImage: data.hqImage || '',
      hqNotes: data.hqNotes || '',
      startDate: data.startDate || null,
      notes: data.notes || '',
      characters: data.characters || [],
      sessions: data.sessions || [],
      deletedSessions: data.deletedSessions || [],
      lore: data.lore || [],
      rules: data.rules || {},
      created: data.created || new Date().toISOString(),
      updated: data.updated || data._updated || new Date().toISOString(),
    };
    normalizeSessions(camp.sessions, camp.updated || camp.created);
    camp.session = camp.sessions.filter(s => s.type !== 'timeline').length;
    list.push(camp);
    saveCampaigns(list);
    return camp;
  }
  // ── Roster tombstones ──
  // gcc-sync merges camp.characters as a union across devices, so a removed
  // roster entry resurrects from any stale copy unless a tombstone in
  // camp.deletedCharacters marks it deleted. Called whenever updateCampaign
  // receives a characters array: entries that disappeared get tombstones;
  // added/changed entries get a fresh _updated so a deliberate re-add
  // outranks its own tombstone in the sync merge (charref timestamp gate).
  function rosterKeysOf(c) {
    const keys = [];
    if (!c || typeof c !== 'object') return keys;
    if (c._id) keys.push('id:' + c._id);
    const nm = String(c.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (nm) keys.push('nm:' + (c.storageKey || c.listKey || '') + ':' + nm);
    return keys;
  }
  function reconcileRosterTombstones(camp, updates) {
    const now = new Date().toISOString();
    const prior = Array.isArray(camp.characters) ? camp.characters : [];
    const next = updates.characters;
    const nextKeys = new Set();
    next.forEach(c => rosterKeysOf(c).forEach(k => nextKeys.add(k)));
    const removed = prior.filter(c => {
      const keys = rosterKeysOf(c);
      return keys.length && !keys.some(k => nextKeys.has(k));
    });
    if (removed.length) {
      const tombs = Array.isArray(camp.deletedCharacters) ? camp.deletedCharacters.slice() : [];
      removed.forEach(c => {
        const keys = rosterKeysOf(c);
        const existing = tombs.find(t => rosterKeysOf(t).some(k => keys.indexOf(k) !== -1));
        if (existing) {
          existing.deletedAt = now;  // refresh so a re-delete beats the re-add's _updated
          if (c._id && !existing._id) existing._id = c._id;
        } else {
          tombs.push({ _id: c._id || '', name: c.name || '', storageKey: c.storageKey || c.listKey || '', deletedAt: now });
        }
      });
      tombs.sort((a, b) => String(b.deletedAt || '').localeCompare(String(a.deletedAt || '')));
      updates.deletedCharacters = tombs.slice(0, 250);
    }
    const priorByKey = {};
    prior.forEach(c => rosterKeysOf(c).forEach(k => { priorByKey[k] = c; }));
    const stripTs = o => { const x = Object.assign({}, o); delete x._updated; return JSON.stringify(x); };
    next.forEach(c => {
      if (!c || typeof c !== 'object') return;
      const match = rosterKeysOf(c).map(k => priorByKey[k]).find(Boolean);
      if (!match) { c._updated = now; return; }
      if (stripTs(c) !== stripTs(match)) c._updated = now;
      else if (!c._updated && match._updated) c._updated = match._updated;
    });
  }

  function updateCampaign(id, updates) {
    const list = loadCampaigns();
    const camp = list.find(c => c.id === id);
    if (!camp) return null;
    if (Array.isArray(updates.characters)) reconcileRosterTombstones(camp, updates);
    Object.assign(camp, updates);
    if (camp.sessions) normalizeSessions(camp.sessions, camp.updated || camp.created);
    camp.updated = new Date().toISOString();
    saveCampaigns(list);
    return camp;
  }
  function deleteCampaign(id) {
    const list = loadCampaigns().filter(c => c.id !== id);
    saveCampaigns(list);
  }
  function getCampaignRules(id) {
    const camp = getCampaign(id);
    if (!camp) return {};
    const defs = getRuleDefs(camp.system);
    const stored = camp.rules || {};
    const out = {};
    defs.forEach(d => { out[d.id] = !!stored[d.id]; });
    return out;
  }
  function setCampaignRule(id, ruleId, value) {
    const camp = getCampaign(id);
    if (!camp) return null;
    const rules = Object.assign({}, camp.rules || {});
    rules[ruleId] = !!value;
    return updateCampaign(id, { rules });
  }

  // ── Activity Log ──
  function loadActivity() {
    return load(KEYS.activity) || [];
  }
  function logActivity(entry) {
    const list = loadActivity();
    list.unshift({
      id: 'act-' + Date.now(),
      date: new Date().toISOString(),
      campaign: entry.campaign || null,
      system: entry.system || null,
      tool: entry.tool || null,
      text: entry.text || '',
      href: entry.href || null,
    });
    // Keep last 50
    if (list.length > 50) list.length = 50;
    save(KEYS.activity, list);
  }

  // ── Jump Back In ──
  function loadJumpback() {
    return load(KEYS.jumpback) || [];
  }
  function trackJumpback(entry) {
    let list = loadJumpback();
    // Remove existing entry with same href
    list = list.filter(j => j.href !== entry.href);
    list.unshift({
      href: entry.href,
      label: entry.label || '',
      name: entry.name || '',
      detail: entry.detail || '',
      system: entry.system || null,
      ts: new Date().toISOString(),
    });
    // Keep last 10
    if (list.length > 10) list.length = 10;
    save(KEYS.jumpback, list);
  }

  // ── VTT Connections ──
  function loadVTTs() {
    return load(KEYS.vtts) || [];
  }
  function saveVTTs(list) {
    save(KEYS.vtts, list);
  }

  // ── Character list helpers (cross-system) ──
  // Returns characters from a specific system's localStorage list.
  // NOTE: excludes tools flagged `vehicles: true` — vehicle lists share the
  // charList mechanism for storage/id purposes, but vehicles must never appear
  // in character pickers or be enrolled into a campaign's party roster.
  // Also dedupes by list key: multiple tools can point at the same list
  // (e.g. mp-char and mp-gw-char both use mp-char-list), which previously
  // returned every character twice.
  function getCharactersForSystem(systemId) {
    const sys = SYSTEM_DEFS.find(s => s.id === systemId);
    if (!sys) return [];
    const results = [];
    const seenLists = new Set();
    sys.tools.forEach(t => {
      if (!t.charList || t.vehicles) return;
      if (seenLists.has(t.charList)) return;
      seenLists.add(t.charList);
      const list = load(t.charList) || [];
      list.forEach((item, idx) => {
        results.push({ ...item, _toolId: t.id, _listKey: t.charList, _idx: idx });
      });
    });
    return results;
  }

  // Get all characters across all systems
  function getAllCharacters() {
    const all = [];
    SYSTEM_DEFS.forEach(sys => {
      getCharactersForSystem(sys.id).forEach(c => {
        all.push({ ...c, _system: sys.id });
      });
    });
    return all;
  }

  // ── Ensure all saved entities have stable IDs ──
  // Runs on init — assigns IDs to any saved chars/vehicles that lack one
  function ensureEntityIds() {
    SYSTEM_DEFS.forEach(sys => {
      sys.tools.forEach(t => {
        if (!t.charList) return;
        const list = load(t.charList);
        if (!list || !list.length) return;
        let changed = false;
        list.forEach(item => {
          if (!item._id) {
            item._id = genId(sys.id);
            changed = true;
          }
        });
        if (changed) save(t.charList, list);
      });
    });
  }

  // ── Migrate campaign character refs from name-based to ID-based ──
  // Looks up each campaign character by name in the storage list,
  // finds the matching entity's _id, and stores it on the reference.
  function migrateCampaignRefs() {
    if (load('gcc-camp-refs-migrated')) return;
    const camps = loadCampaigns();
    if (!camps.length) { save('gcc-camp-refs-migrated', true); return; }
    let changed = false;
    camps.forEach(camp => {
      if (!camp.characters || !camp.characters.length) return;
      const sys = SYSTEM_DEFS.find(s => s.id === camp.system);
      if (!sys) return;
      camp.characters.forEach(ref => {
        if (ref._id) return; // already migrated
        const sk = ref.storageKey || ref.listKey || '';
        if (!sk || !ref.name) return;
        const list = load(sk);
        if (!list) return;
        const nameKey = camp.system === 'faserip' ? 'heroName' : 'name';
        const found = list.find(c => (c[nameKey] || c.name || c.heroName) === ref.name);
        if (found && found._id) {
          ref._id = found._id;
          changed = true;
        }
      });
    });
    if (changed) saveCampaigns(camps);
    save('gcc-camp-refs-migrated', true);
  }

  // ── Resolve a character by _id from a storage list ──
  function findEntityById(storageKey, entityId) {
    if (!storageKey || !entityId) return null;
    const list = load(storageKey);
    if (!list) return null;
    return list.find(item => item._id === entityId) || null;
  }

  // ── Migration from old MP Builder data ──
  function migrateFromMP() {
    if (load('gcc-migrated')) return;

    const mpCamps = load(KEYS.mpCamps) || [];
    const mpSel = localStorage.getItem(KEYS.mpCampSel) || '';
    const mpChars = load(KEYS.mpChars) || [];

    if (mpCamps.length > 0 && loadCampaigns().length === 0) {
      const newCamps = mpCamps.map(mc => ({
        id: mc.id,
        name: mc.name || 'MP Campaign',
        system: 'mp',
        players: 0,
        session: 0,
        lastPlayed: null,
        vttLabel: '',
        vttUrl: '',
        notes: '',
        characters: [],
        sessions: [],
        created: new Date().toISOString(),
      }));

      // Assign characters to campaigns by _campaign field
      mpChars.forEach((ch, idx) => {
        const campId = ch._campaign || mpSel || (mpCamps[0] && mpCamps[0].id);
        const camp = newCamps.find(c => c.id === campId);
        if (camp) {
          camp.characters.push({
            type: 'mp-char',
            listKey: 'mp-char-list',
            idx: idx,
            name: ch.name || 'Unnamed',
          });
        }
      });

      saveCampaigns(newCamps);
    }

    save('gcc-migrated', true);
  }

  // ── Init ──
  function init() {
    migrateFromMP();
    ensureEntityIds();
    migrateCampaignRefs();
  }

  // ── Public API ──
  return {
    KEYS,
    SYSTEM_DEFS,
    TEAM_LABELS,
    LORE_TYPES,
    LORE_TYPE_LABELS,
    RULE_DEFS,
    teamLabel,
    sessionLabel,
    xpLabel,
    getRuleDefs,
    sessionStableId,
    init,
    // Campaigns
    loadCampaigns,
    saveCampaigns,
    getCampaign,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    getCampaignRules,
    setCampaignRule,
    // Activity
    loadActivity,
    logActivity,
    // Jumpback
    loadJumpback,
    trackJumpback,
    // VTTs
    loadVTTs,
    saveVTTs,
    // Characters
    getCharactersForSystem,
    getAllCharacters,
    findEntityById,
    // Helpers
    load,
    save,
    genId,
  };

})();
