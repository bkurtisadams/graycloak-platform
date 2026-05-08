// gcc-data.js v1.2.0 — 2026-04-10
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
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) { console.warn('[GCC] save failed for', key, e); }
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
        { id: 'mp-veh', name: 'Vehicle Builder', href: 'vehicle.html', charList: 'mp-veh-list' },
        { id: 'mp-r20', name: 'Roll20 Import', href: 'character.html?r20=1' },
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
        { id: 'add1-map', name: 'Campaign Map', href: 'greyhawk-map.html' },
        { id: 'add1-char', name: 'Character Sheet', href: 'adnd.html', charList: 'gcc-add1e-chars' },
        { id: 'add1-enc', name: 'Encounter Generator', href: null },
        { id: 'add1-trs', name: 'Treasure Generator', href: null },
        { id: 'add1-wild', name: 'Wilderness Generator', href: null },
        { id: 'add1-dun', name: 'DMG Dungeon Builder', href: null },
        { id: 'add1-voy', name: 'Voyage Simulator', href: 'greyhawk-map.html#voyage' },
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
      if (entity.sessions) {
        entity.sessions.forEach(s => {
          if (!s._id) s._id = genId('ses');
          if (s.gameDate === undefined) s.gameDate = '';
          if (s.image === undefined) s.image = '';
          if (s.sections === undefined) s.sections = [];
          if (s.tags === undefined) s.tags = [];
          if (s.visible === undefined) s.visible = true;
          if (s.type === undefined) s.type = 'session'; // 'session' or 'timeline'
        });
      }
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
    return entity;
  }

  // ── Campaigns ──
  function loadCampaigns() {
    const list = load(KEYS.campaigns) || [];
    let dirty = false;
    list.forEach((c, i) => {
      if (!c.schemaVersion || c.schemaVersion < 3) {
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
      schemaVersion: 1,
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
      lore: data.lore || [],
      rules: data.rules || {},
      created: data.created || new Date().toISOString(),
    };
    list.push(camp);
    saveCampaigns(list);
    return camp;
  }
  function updateCampaign(id, updates) {
    const list = loadCampaigns();
    const camp = list.find(c => c.id === id);
    if (!camp) return null;
    Object.assign(camp, updates);
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
  // Returns characters from a specific system's localStorage list
  function getCharactersForSystem(systemId) {
    const sys = SYSTEM_DEFS.find(s => s.id === systemId);
    if (!sys) return [];
    const results = [];
    sys.tools.forEach(t => {
      if (t.charList) {
        const list = load(t.charList) || [];
        list.forEach((item, idx) => {
          results.push({ ...item, _toolId: t.id, _listKey: t.charList, _idx: idx });
        });
      }
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
