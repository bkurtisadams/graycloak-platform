// gcc-invite.js v1.0.0 — 2026-04-08
// Campaign invite system for Graycloak's Campaign Corner
// Requires: gcc-data.js, gcc-auth.js, gcc-sync.js (for Firestore access)
//
// Firestore structure:
//   invites/{code} → { campaignId, ownerUid, campaignName, system, created, active }
//   campaigns/{campaignId}/players/{uid} → { displayName, email, joined, role }
//   campaigns/{campaignId} → { ownerUid, name, system, created }

const GCCInvite = (function() {

  // ── Helpers ──
  function getDb() {
    return (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore() : null;
  }

  function getUid() {
    return (typeof GCCAuth !== 'undefined' && GCCAuth.getUser()) ? GCCAuth.getUser().uid : null;
  }

  function getUserInfo() {
    const user = (typeof GCCAuth !== 'undefined') ? GCCAuth.getUser() : null;
    if (!user) return null;
    return { uid: user.uid, displayName: user.displayName || user.email.split('@')[0], email: user.email };
  }

  function genCode() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  // ══════════════════════════════════════
  // ── Create / Manage Invites ──
  // ══════════════════════════════════════

  async function createInvite(campaignId, campaignName, system) {
    const db = getDb();
    const uid = getUid();
    if (!db || !uid) return { ok: false, reason: 'Not signed in' };

    const code = genCode();
    const now = new Date().toISOString();

    try {
      // Create invite document
      await db.collection('invites').doc(code).set({
        campaignId: campaignId,
        ownerUid: uid,
        campaignName: campaignName || 'Unnamed Campaign',
        system: system || '',
        created: now,
        active: true,
      });

      // Ensure shared campaign document exists
      const campRef = db.collection('campaigns').doc(campaignId);
      const campSnap = await campRef.get();
      if (!campSnap.exists) {
        await campRef.set({
          ownerUid: uid,
          name: campaignName || 'Unnamed Campaign',
          system: system || '',
          created: now,
        });
      }

      // Add owner as first player (GM)
      const user = getUserInfo();
      if (user) {
        await campRef.collection('players').doc(uid).set({
          displayName: user.displayName,
          email: user.email,
          role: 'gm',
          joined: now,
        }, { merge: true });
      }

      return { ok: true, code: code };
    } catch(e) {
      console.error('[GCCInvite] createInvite failed:', e);
      return { ok: false, reason: e.message };
    }
  }

  async function deactivateInvite(code) {
    const db = getDb();
    if (!db) return;
    try {
      await db.collection('invites').doc(code).update({ active: false });
    } catch(e) {
      console.warn('[GCCInvite] deactivateInvite failed:', e);
    }
  }

  async function getInvitesForCampaign(campaignId) {
    const db = getDb();
    const uid = getUid();
    if (!db || !uid) return [];
    try {
      const snap = await db.collection('invites')
        .where('campaignId', '==', campaignId)
        .where('ownerUid', '==', uid)
        .get();
      const results = [];
      snap.forEach(doc => results.push({ code: doc.id, ...doc.data() }));
      return results;
    } catch(e) {
      console.warn('[GCCInvite] getInvitesForCampaign failed:', e);
      return [];
    }
  }

  // ══════════════════════════════════════
  // ── Join Campaign ──
  // ══════════════════════════════════════

  async function lookupInvite(code) {
    const db = getDb();
    if (!db) return null;
    try {
      const snap = await db.collection('invites').doc(code.toUpperCase()).get();
      if (!snap.exists) return null;
      const data = snap.data();
      if (!data.active) return null;
      return { code: snap.id, ...data };
    } catch(e) {
      console.warn('[GCCInvite] lookupInvite failed:', e);
      return null;
    }
  }

  async function joinCampaign(code) {
    const db = getDb();
    const user = getUserInfo();
    if (!db || !user) return { ok: false, reason: 'Not signed in' };

    try {
      // Verify invite
      const invite = await lookupInvite(code);
      if (!invite) return { ok: false, reason: 'Invalid or expired invite code' };

      // Add player to campaign
      const campRef = db.collection('campaigns').doc(invite.campaignId);
      await campRef.collection('players').doc(user.uid).set({
        displayName: user.displayName,
        email: user.email,
        role: 'player',
        joined: new Date().toISOString(),
      }, { merge: true });

      return { ok: true, campaignId: invite.campaignId, campaignName: invite.campaignName, system: invite.system };
    } catch(e) {
      console.error('[GCCInvite] joinCampaign failed:', e);
      return { ok: false, reason: e.message };
    }
  }

  // ══════════════════════════════════════
  // ── Player Roster ──
  // ══════════════════════════════════════

  async function getPlayers(campaignId) {
    const db = getDb();
    if (!db) return [];
    try {
      const snap = await db.collection('campaigns').doc(campaignId).collection('players').get();
      const players = [];
      snap.forEach(doc => players.push({ uid: doc.id, ...doc.data() }));
      return players;
    } catch(e) {
      console.warn('[GCCInvite] getPlayers failed:', e);
      return [];
    }
  }

  async function removePlayer(campaignId, playerUid) {
    const db = getDb();
    const uid = getUid();
    if (!db || !uid) return { ok: false };
    try {
      await db.collection('campaigns').doc(campaignId).collection('players').doc(playerUid).delete();
      return { ok: true };
    } catch(e) {
      console.warn('[GCCInvite] removePlayer failed:', e);
      return { ok: false, reason: e.message };
    }
  }

  // ══════════════════════════════════════
  // ── Shared Campaign Data ──
  // ══════════════════════════════════════

  // Fields the GM pushes to Firestore for players to see
  const SHARED_FIELDS = [
    'name', 'system', 'status', 'gm', 'gmTitle', 'world', 'genre',
    'pitch', 'description', 'schedule', 'playMode', 'vttLabel', 'vttUrl',
    'nextSession', 'startDate', 'xpMethod', 'rulebooks', 'houseRules',
    'sharedNotes', 'sessions', 'lore', 'campaignImage', 'hqImage', 'hqNotes',
    'characters', 'promotedPlayers', 'teamName',
  ];

  // Helper: resolve IDB image key to data URL
  async function idbGet(key) {
    return (typeof GCCImages !== 'undefined') ? await GCCImages.get(key) : null;
  }

  // Check if a value needs uploading (IDB key or data URL, but not already a Storage/web URL)
  function needsUpload(val) {
    if (!val) return false;
    if (val.startsWith('http://') || val.startsWith('https://')) return false;
    return true; // IDB key or data URL
  }

  // Helper: upload an image field to Storage, return download URL
  async function uploadImg(val, storagePath) {
    if (typeof GCCStorage === 'undefined') return val || '';
    if (!needsUpload(val)) return val;
    return await GCCStorage.uploadCampaignImage(val, storagePath, idbGet);
  }

  // Run upload tasks with limited concurrency and pacing
  async function batchUpload(tasks, concurrency) {
    const results = new Array(tasks.length);
    let idx = 0;
    let completed = 0;
    const total = tasks.length;
    async function worker() {
      while (idx < tasks.length) {
        const i = idx++;
        results[i] = await tasks[i]();
        completed++;
        if (completed % 20 === 0) console.log('[GCCInvite] Uploaded', completed, '/', total);
        // Pace to avoid 429s
        await new Promise(r => setTimeout(r, 200));
      }
    }
    const workers = [];
    for (let w = 0; w < Math.min(concurrency, tasks.length); w++) workers.push(worker());
    await Promise.all(workers);
    return results;
  }

  // Build a lightweight character snapshot from the full saved character data.
  function buildCharSnapshot(savedChar, systemId) {
    const snap = { _id: savedChar._id || '' };
    if (systemId === 'faserip') {
      snap.heroName = savedChar.heroName || savedChar.name || '';
      snap.playerName = savedChar.playerName || '';
      snap.origin = savedChar.origin || '';
      snap.characterType = savedChar.characterType || '';
      snap.abilities = savedChar.abilities || {};
      snap.health = savedChar.health || '';
      snap.karma = savedChar.karma || '';
      snap.resourcesRank = savedChar.resourcesRank || '';
      snap.popularityHero = savedChar.popularityHero;
      snap.portraitData = savedChar.portraitData || '';
    } else if (systemId === 'mp') {
      snap.name = savedChar.name || '';
      snap.player = savedChar.player || '';
      snap.archetype = savedChar.archetype || savedChar.className || '';
      snap.stats = savedChar.stats || {};
      snap.abilities = savedChar.abilities || [];
      snap.power = savedChar.power || '';
      snap.hitPts = savedChar.hitPts || '';
      snap.initiative = savedChar.initiative || '';
      snap.characterType = savedChar.characterType || '';
      snap._image = savedChar._image || savedChar.portrait || '';
    } else if (systemId === 'add1e') {
      snap.characterName = savedChar.characterName || savedChar.name || '';
      snap.player = savedChar.player || savedChar.playerName || '';
      snap.characterClass = savedChar.characterClass || '';
      snap.level = savedChar.level || '';
      snap.race = savedChar.race || '';
      snap.str = savedChar.str; snap.strPct = savedChar.strPct;
      snap.int = savedChar.int; snap.wis = savedChar.wis;
      snap.dex = savedChar.dex; snap.con = savedChar.con; snap.cha = savedChar.cha;
      snap.ac = savedChar.ac; snap.hpCurrent = savedChar.hpCurrent;
      snap.hpMax = savedChar.hpMax; snap.xpTotal = savedChar.xpTotal;
      snap.characterType = savedChar.characterType || '';
      snap.portrait = savedChar.portrait || '';
    }
    return snap;
  }

  async function pushSharedData(campaignId, camp) {
    const db = getDb();
    const uid = getUid();
    if (!db || !uid) return;
    try {
      const shared = { _updated: new Date().toISOString(), ownerUid: uid };
      SHARED_FIELDS.forEach(f => {
        if (camp[f] !== undefined) shared[f] = camp[f];
      });
      delete shared.notes;
      // Deep-clone sessions and lore so uploads don't mutate local data mid-render
      if (shared.sessions) shared.sessions = JSON.parse(JSON.stringify(shared.sessions));
      if (shared.lore) shared.lore = JSON.parse(JSON.stringify(shared.lore));

      const hasStorage = typeof GCCStorage !== 'undefined';
      const sp = `campaigns/${campaignId}/`;

      // Storage rules require campaigns/{id} to exist with ownerUid before allowing
      // writes to campaigns/{id}/*. Pre-create the doc so first-time uploads succeed.
      if (hasStorage) {
        try {
          await db.collection('campaigns').doc(campaignId).set(
            { ownerUid: uid, _updated: shared._updated }, { merge: true }
          );
        } catch (e) {
          console.warn('[GCCInvite] pre-create campaigns doc failed:', e);
        }
      }

      // ── Upload images to Firebase Storage (batched, skip already-uploaded) ──
      if (hasStorage) {
        await GCCStorage.init().catch(() => null);

        // Collect all upload tasks: { setter, val, path }
        const uploads = [];

        if (needsUpload(shared.campaignImage)) {
          uploads.push({ path: sp + 'banner', val: shared.campaignImage,
            apply: url => { shared.campaignImage = url; } });
        }
        if (needsUpload(shared.hqImage)) {
          uploads.push({ path: sp + 'hq', val: shared.hqImage,
            apply: url => { shared.hqImage = url; } });
        }
        for (const s of (shared.sessions || [])) {
          if (needsUpload(s.image)) {
            const sid = s._id || '';
            uploads.push({ path: sp + 'ses_' + sid, val: s.image,
              apply: url => { s.image = url; } });
          }
          for (let si = 0; si < (s.sections || []).length; si++) {
            const sec = s.sections[si];
            for (let j = 0; j < (sec.images || []).length; j++) {
              const img = sec.images[j];
              if (needsUpload(img.src)) {
                uploads.push({ path: sp + 'sec_' + (s._id || '') + '_' + si + '_' + j, val: img.src,
                  apply: url => { img.src = url; } });
              }
            }
          }
        }
        for (const l of (shared.lore || [])) {
          if (needsUpload(l.image)) {
            uploads.push({ path: sp + 'lore_' + (l._id || ''), val: l.image,
              apply: url => { l.image = url; } });
          }
        }

        if (uploads.length) {
          console.log('[GCCInvite] Uploading', uploads.length, 'images to Storage...');
          const tasks = uploads.map(u => async () => {
            const url = await uploadImg(u.val, u.path);
            if (url) u.apply(url);
          });
          await batchUpload(tasks, 2);
          console.log('[GCCInvite] Image uploads complete');

          // Write Storage URLs back to local campaign data so future pushes skip them
          const localCamp = (typeof GCC !== 'undefined') ? GCC.getCampaign(campaignId) : null;
          if (localCamp) {
            let dirty = false;
            if (shared.campaignImage && shared.campaignImage !== localCamp.campaignImage) {
              localCamp.campaignImage = shared.campaignImage; dirty = true;
            }
            if (shared.hqImage && shared.hqImage !== localCamp.hqImage) {
              localCamp.hqImage = shared.hqImage; dirty = true;
            }
            (shared.sessions || []).forEach((s, i) => {
              const ls = (localCamp.sessions || [])[i];
              if (!ls) return;
              if (s.image && s.image !== ls.image) { ls.image = s.image; dirty = true; }
              (s.sections || []).forEach((sec, si) => {
                const lsec = (ls.sections || [])[si];
                if (!lsec) return;
                (sec.images || []).forEach((img, j) => {
                  const limg = (lsec.images || [])[j];
                  if (limg && img.src && img.src !== limg.src) { limg.src = img.src; dirty = true; }
                });
              });
            });
            (shared.lore || []).forEach((l, i) => {
              const ll = (localCamp.lore || [])[i];
              if (ll && l.image && l.image !== ll.image) { ll.image = l.image; dirty = true; }
            });
            if (dirty) {
              GCC.updateCampaign(campaignId, {
                campaignImage: localCamp.campaignImage,
                hqImage: localCamp.hqImage,
                sessions: localCamp.sessions,
                lore: localCamp.lore,
              });
              console.log('[GCCInvite] Cached Storage URLs in local campaign data');
            }
          }
        }
      }

      // ── Build character snapshots ──
      const chars = camp.characters || [];
      const snapshots = [];
      const charUploads = [];
      for (const ch of chars) {
        const refKey = ch.storageKey || ch.listKey || '';
        let saved = null;
        if (refKey) {
          try {
            const list = JSON.parse(localStorage.getItem(refKey)) || [];
            saved = ch._id ? list.find(x => x._id === ch._id) : null;
            if (!saved && ch.name) saved = list.find(x =>
              (x.heroName || x.characterName || x.name) === ch.name);
          } catch(e) {}
        }
        if (saved) {
          const snap = buildCharSnapshot(saved, camp.system);
          const portraitField = camp.system === 'faserip' ? 'portraitData'
            : camp.system === 'mp' ? '_image' : 'portrait';
          if (hasStorage && needsUpload(snap[portraitField])) {
            const field = portraitField, s = snap;
            charUploads.push(async () => {
              s[field] = await uploadImg(s[field], sp + 'char_' + (s._id || ch.name));
            });
          }
          snap._ref = { storageKey: refKey, name: ch.name, _id: ch._id };
          if (ch.isTeam) snap.isTeam = true;
          snapshots.push(snap);
        } else {
          snapshots.push({ _id: ch._id || '', name: ch.name || '', isTeam: !!ch.isTeam, _ref: ch });
        }
      }
      if (charUploads.length) {
        await batchUpload(charUploads, 2);
      }
      shared.characters = snapshots;

      await db.collection('campaigns').doc(campaignId).set(shared, { merge: true });
      console.log('[GCCInvite] Shared data pushed (' + (hasStorage ? 'with' : 'without') + ' Storage)');
    } catch(e) {
      console.warn('[GCCInvite] pushSharedData failed:', e);
    }
  }

  async function getSharedData(campaignId) {
    const db = getDb();
    if (!db) return null;
    try {
      const snap = await db.collection('campaigns').doc(campaignId).get();
      if (!snap.exists) return null;
      return snap.data();
    } catch(e) {
      console.warn('[GCCInvite] getSharedData failed:', e);
      return null;
    }
  }

  async function isOwner(campaignId) {
    const db = getDb();
    const uid = getUid();
    if (!db || !uid) return false;
    try {
      const snap = await db.collection('campaigns').doc(campaignId).get();
      if (!snap.exists) return true;
      const data = snap.data();
      if (!data.ownerUid) return true;
      return data.ownerUid === uid;
    } catch(e) {
      return false;
    }
  }

  // ══════════════════════════════════════
  // ── Player Character Assignment ──
  // ══════════════════════════════════════

  // Player assigns one of their own characters to this campaign
  async function assignCharacter(campaignId, charId, listKey) {
    const db = getDb();
    const user = getUserInfo();
    if (!db || !user) return { ok: false, reason: 'Not signed in' };
    try {
      await db.collection('campaigns').doc(campaignId)
        .collection('players').doc(user.uid)
        .set({ charId, listKey, charUpdated: new Date().toISOString() }, { merge: true });
      return { ok: true };
    } catch(e) {
      console.warn('[GCCInvite] assignCharacter failed:', e);
      return { ok: false, reason: e.message };
    }
  }

  // Player removes their character from this campaign
  async function unassignCharacter(campaignId) {
    const db = getDb();
    const uid = getUid();
    if (!db || !uid) return { ok: false, reason: 'Not signed in' };
    try {
      const ref = db.collection('campaigns').doc(campaignId)
        .collection('players').doc(uid);
      // Use FieldValue.delete() to remove the fields
      await ref.update({
        charId: firebase.firestore.FieldValue.delete(),
        listKey: firebase.firestore.FieldValue.delete(),
        charUpdated: firebase.firestore.FieldValue.delete(),
      });
      return { ok: true };
    } catch(e) {
      console.warn('[GCCInvite] unassignCharacter failed:', e);
      return { ok: false, reason: e.message };
    }
  }

  // Fetch a character from another user's Firestore data
  async function getPlayerCharacter(playerUid, listKey, charId) {
    const db = getDb();
    if (!db || !playerUid || !charId) return null;
    // Try the player's own synced data first
    if (listKey) {
      try {
        const ref = db.collection('users').doc(playerUid)
          .collection('lists').doc(listKey)
          .collection('items').doc(charId);
        const snap = await ref.get();
        if (snap.exists) {
          const data = snap.data();
          return data.json ? JSON.parse(data.json) : null;
        }
      } catch(e) {
        console.warn('[GCCInvite] getPlayerCharacter user-data lookup failed:', e);
      }
    }
    // Fallback: check for GM-assigned snapshot on the player doc
    try {
      const camps = db.collection('campaigns');
      // We need the campaignId — scan parent path from context or try charSnapshot
      // The player doc itself may have charSnapshot stored by gmAssignCharacter
      return null; // caller will check charSnapshot from getPlayers() data
    } catch(e) {
      return null;
    }
  }

  // Fetch a player character, with campaign context for GM-snapshot fallback
  async function getPlayerCharacterWithFallback(campaignId, playerUid, listKey, charId) {
    // Try normal path first
    const ch = await getPlayerCharacter(playerUid, listKey, charId);
    if (ch) return ch;
    // Fallback: read charSnapshot from the player's campaign doc
    const db = getDb();
    if (!db || !campaignId || !playerUid) return null;
    try {
      const doc = await db.collection('campaigns').doc(campaignId)
        .collection('players').doc(playerUid).get();
      if (doc.exists && doc.data().charSnapshot) {
        return doc.data().charSnapshot;
      }
    } catch(e) {
      console.warn('[GCCInvite] charSnapshot fallback failed:', e);
    }
    return null;
  }

  // GM assigns a character to a player (writes to player's campaign doc)
  async function gmAssignCharacter(campaignId, playerUid, charId, listKey, charSnapshot) {
    const db = getDb();
    const uid = getUid();
    if (!db || !uid) return { ok: false, reason: 'Not signed in' };
    try {
      const data = {
        charId,
        listKey: listKey || '',
        charUpdated: new Date().toISOString(),
        gmAssigned: true,
      };
      if (charSnapshot) data.charSnapshot = charSnapshot;
      await db.collection('campaigns').doc(campaignId)
        .collection('players').doc(playerUid)
        .set(data, { merge: true });
      return { ok: true };
    } catch(e) {
      console.warn('[GCCInvite] gmAssignCharacter failed:', e);
      return { ok: false, reason: e.message };
    }
  }

  // GM removes a character assignment from a player
  async function gmUnassignCharacter(campaignId, playerUid) {
    const db = getDb();
    const uid = getUid();
    if (!db || !uid) return { ok: false, reason: 'Not signed in' };
    try {
      await db.collection('campaigns').doc(campaignId)
        .collection('players').doc(playerUid)
        .update({
          charId: firebase.firestore.FieldValue.delete(),
          listKey: firebase.firestore.FieldValue.delete(),
          charUpdated: firebase.firestore.FieldValue.delete(),
          charSnapshot: firebase.firestore.FieldValue.delete(),
          gmAssigned: firebase.firestore.FieldValue.delete(),
        });
      return { ok: true };
    } catch(e) {
      console.warn('[GCCInvite] gmUnassignCharacter failed:', e);
      return { ok: false, reason: e.message };
    }
  }

  // Fetch characters for all players who have assigned one
  async function getPlayerCharacters(campaignId, system) {
    const db = getDb();
    if (!db) return [];
    try {
      const players = await getPlayers(campaignId);
      const results = [];
      for (const p of players) {
        if (!p.charId) continue;
        const char = await getPlayerCharacterWithFallback(campaignId, p.uid, p.listKey, p.charId);
        if (char) {
          results.push({
            uid: p.uid,
            playerName: p.displayName,
            playerRole: p.role,
            charId: p.charId,
            listKey: p.listKey || '',
            gmAssigned: !!p.gmAssigned,
            char: char,
          });
        }
      }
      return results;
    } catch(e) {
      console.warn('[GCCInvite] getPlayerCharacters failed:', e);
      return [];
    }
  }

  // ══════════════════════════════════════
  // ── Invite Link Helpers ──
  // ══════════════════════════════════════

  function buildInviteUrl(code) {
    const base = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '');
    return base + 'index.html?invite=' + code;
  }

  function getInviteCodeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('invite') || null;
  }

  // ══════════════════════════════════════
  // ── Public API ──
  // ══════════════════════════════════════

  return {
    createInvite,
    deactivateInvite,
    getInvitesForCampaign,
    lookupInvite,
    joinCampaign,
    getPlayers,
    removePlayer,
    pushSharedData,
    getSharedData,
    isOwner,
    buildInviteUrl,
    getInviteCodeFromUrl,
    assignCharacter,
    unassignCharacter,
    gmAssignCharacter,
    gmUnassignCharacter,
    getPlayerCharacter,
    getPlayerCharacterWithFallback,
    getPlayerCharacters,
    buildCharSnapshot,
  };

})();
