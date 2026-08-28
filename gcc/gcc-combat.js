// gcc-combat.js v0.4.2 - 2026-07-16
// Bridges the GCC encounter panel (greyhawk-map.html) to the dungeon-encounter
// tactical sim. Adds a Fight button to the encounter panel, stages the handoff
// payload, and on return applies HP/XP back to the active character + logs it.
//
// launch: write payload -> 'gcc-pending-encounter', open dungeon-encounter.html
// return: read 'gcc-encounter-result' on boot, write back, append log
//
// Slice 6 routes XP and prime-requisite bonuses through the OSRIC rules kernel when available.
// Pure helpers (_buildPayload, _applyResult, _awardXP) are exposed for tests.
(function () {
  'use strict';

  var ACTIVE_KEY = 'gcc-active-char';
  var CHARS_KEY = (window.GCC && GCC.KEYS && GCC.KEYS.add1eChars) || 'gcc-add1e-chars';
  var PENDING_KEY = 'gcc-pending-encounter';
  var RESULT_KEY = 'gcc-encounter-result';
  var LOG_KEY = 'gcc-encounter-log';
  var SIM_PAGE = 'dungeon-encounter.html';
  var _kernelReady = Promise.resolve(null);

  function _loadRulesKernel() {
    if (window.GraycloakOSRIC3) return Promise.resolve(window.GraycloakOSRIC3);
    if (typeof document === 'undefined') return Promise.resolve(null);
    return import('./vendor/osric3-rules/browser-global.js')
      .then(function () { return window.GraycloakOSRIC3 || null; })
      .catch(function (error) {
        console.warn('OSRIC 3 rules kernel did not load; combat XP will use the legacy fallback.', error);
        return null;
      });
  }

  _kernelReady = _loadRulesKernel();

  function _load(key) {
    try {
      return (window.GCC && GCC.load)
        ? GCC.load(key)
        : JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  }

  function _save(key, val) {
    try {
      if (window.GCC && GCC.save) GCC.save(key, val);
      else localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Encounter handoff values are temporary same-browser messages. The combat
  // simulator reads and writes these exact raw localStorage keys, so do not
  // route them through GCC.save/GCC.load or cloud synchronization.
  function _loadLocalJson(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw == null ? null : JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function _saveLocalJson(key, val) {
    try {
      var raw = JSON.stringify(val);
      localStorage.setItem(key, raw);
      return localStorage.getItem(key) === raw;
    } catch (e) {
      console.error('Unable to write encounter handoff:', key, e);
      return false;
    }
  }

  function _removeLocal(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function _num(v, d) { var n = parseInt(v, 10); return isNaN(n) ? (d || 0) : n; }
  function _toast(msg) { if (typeof window.showToast === 'function') window.showToast(msg); }

  // Where the sim should return after this encounter. A launching page may set
  // window.GCC_RETURN_URL to a relative *.html on this origin; otherwise we send
  // the engine back to whatever page launched the fight. Falls back to the world map.
  function _returnUrl() {
    var u = window.GCC_RETURN_URL;
    if (typeof u === 'string' && u) return u;
    try { var p = (location.pathname || '').split('/').pop(); if (p && /\.html?$/i.test(p)) return p; } catch (e) {}
    return 'greyhawk-map.html';
  }

  // surprise.label -> sim side flag ('monsters' = party gets the drop, 'party' = caught out)
  function _surpriseSide(s) {
    if (!s) return null;
    if (s.side === 'party' || s.side === 'monsters') return s.side;
    var t = String(s.label || '').toLowerCase();
    if (/part(y|ies).*surpris|surpris.*part/.test(t)) return 'party';
    if (/monster.*surpris|surpris.*monster/.test(t)) return 'monsters';
    return null;
  }

  // Pure: build the sim handoff payload from a panel result + a party array.
  // Convert saved GCC character fields into the tactical simulator schema.
  function _combatPartyMember(character) {
    var member = Object.assign({}, character || {});

    // The saved character uses _id; the simulator and result bridge use id.
    if (member.id == null && member._id != null) {
      member.id = String(member._id);
    }

    // Preserve zero HP when it is intentional. Only fall back when absent.
    var currentHp =
      member.hp_current != null ? member.hp_current :
      member.hpCurrent != null ? member.hpCurrent :
      member.currentHp != null ? member.currentHp :
      member.hpMax != null ? member.hpMax :
      1;

    var maximumHp =
      member.hp_max != null ? member.hp_max :
      member.hpMax != null ? member.hpMax :
      member.maxHp != null ? member.maxHp :
      currentHp;

    member.hp_current = Math.max(0, _num(currentHp, 0));
    member.hp_max = Math.max(0, _num(maximumHp, member.hp_current));

    return member;
  }

  // Pure: build the sim handoff payload from a panel result + a party array.
  function _buildPayload(result, party) {
    result = result || {};

    var mm = result.mmStats || null;
    var monsters = mm ? [{
      mm: mm,
      count: Math.max(1, _num(result.numberRolled, 1))
    }] : [];

    // The sim's tactical grid is denominated in inches (one mapping square),
    // so hand it inches, not yards — rollDistance's `raw` is the effective
    // post-surprise sum in inches. Outdoors one inch is 10 yd (DMG / OSRIC
    // 1.5.3.2), which the sim applies via its outdoor scale.
    var dist = result.distance && (
      result.distance.raw != null
        ? result.distance.raw
        : (result.distance.yards != null ? result.distance.yards / 10 : null)
    );

    return {
      party: (party || []).map(_combatPartyMember),

      monsters: monsters,

      context: {
        distance: _num(dist, 8),
        distance_unit: 'squares',
        // Wilderness encounters are fought at outdoor scale: 1" = 10 yd.
        scale: 'outdoor',
        surprise: _surpriseSide(result.surprise),
        surprise_segments: 1,
        label: (mm && (mm.name || mm.NAME)) || 'Encounter',
        treasure: (
          mm &&
          (mm.treasureType || mm['TREASURE TYPE'])
        ) || null
      }
    };
  }

  // OSRIC: monster XP is divided among the party members who survive the fight
  // (the dead don't advance). Remainder is handed to the first survivors so no
  // XP is silently lost. Per-character credit goes through _awardXP.
  function _survivorIds(res) {
    return (res.party || [])
      .filter(function (p) { return !p.dead && _num(p.hp_current, 0) > 0; })
      .map(function (p) { return String(p.id); });
  }

  // Credit one character with an XP share. The kernel updates single- and
  // multiclass XP fields, levels, and next-level thresholds. Unsupported legacy
  // records retain the old xpTotal-only behavior.
  function _awardXP(char, amount) {
    if (!char || amount <= 0) return null;
    var kernel = window.GraycloakOSRIC3;
    if (kernel && typeof kernel.awardLegacyCharacterExperience === 'function') {
      try {
        var result = kernel.awardLegacyCharacterExperience(char, amount);
        if (result && result.applied && result.character) {
          Object.assign(char, result.character);
          return result;
        }
      } catch (error) {
        console.warn('OSRIC 3 XP adapter failed; using legacy xpTotal fallback.', error);
      }
    }
    char.xpTotal = _num(char.xpTotal, 0) + amount;
    return null;
  }

  // Pure: apply a sim result to a chars array. Returns { chars, log, summary }.
  function _applyResult(res, chars, activeId) {
    chars = chars || [];
    var byId = {};
    chars.forEach(function (c) { if (c && c._id != null) byId[String(c._id)] = c; });
    (res.party || []).forEach(function (p) {
      var c = byId[String(p.id)];
      if (c && p.hp_current != null) c.hpCurrent = p.hp_current;
    });

    var xp = _num(res.xp_awarded, 0);
    var survivors = _survivorIds(res).filter(function (id) { return byId[id]; });
    var xpBonus = 0;
    if (xp > 0 && survivors.length) {
      var share = Math.floor(xp / survivors.length);
      var rem = xp - share * survivors.length;
      survivors.forEach(function (id, i) {
        var awardResult = _awardXP(byId[id], share + (i < rem ? 1 : 0));
        if (awardResult && awardResult.bonusAward) xpBonus += _num(awardResult.bonusAward, 0);
      });
    }

    var entry = {
      ts: Date.now(),
      label: res.label || (res.defeated_monsters && res.defeated_monsters[0] && res.defeated_monsters[0].label) || 'Encounter',
      outcome: res.outcome || 'aborted',
      xp: xp,
      xpBonus: xpBonus,
      xpCredited: xp + xpBonus,
      rounds: _num(res.rounds, 0),
      defeated: (res.defeated_monsters || []).map(function (m) { return m.label; }),
      casualties: (res.casualties || []).filter(function (c) { return c.side === 'A'; }).map(function (c) { return c.label; }),
      activeCharId: activeId || null
    };
    var victorySummary = 'Victory! +' + xp + ' XP';
    if (xpBonus > 0) victorySummary += ' (+' + xpBonus + ' prime-requisite bonus)';
    var summary = ({
      party_victory: victorySummary,
      party_defeat: 'The party falls.',
      draw: 'Mutual destruction.',
      aborted: 'Encounter aborted.'
    })[entry.outcome] || 'Encounter resolved.';
    return { chars: chars, entry: entry, summary: summary };
  }

  // Launch: stage payload and open the sim (same-tab; sim consumes on boot).
  function fight(result) {
    var party = window.GCC_ACTIVE_PARTY || [];
    if (!party.length) { _toast('No active character - choose one on the Play page'); return false; }
    if (!result || !result.mmStats) { _toast('No monster in this encounter to fight'); return false; }

    var payload = _buildPayload(result, party);
    if (!payload.monsters.length) { _toast('Nothing to fight here'); return false; }

    payload.context.returnUrl = _returnUrl();
    payload.context.stagedAt = Date.now();

    // Never apply an older battle result to a newly launched encounter.
    _removeLocal(RESULT_KEY);

    if (!_saveLocalJson(PENDING_KEY, payload)) {
      _toast('Unable to stage the encounter in browser storage');
      return false;
    }

    // Query token forces the latest tactical page during local testing and
    // after static deployment without changing localStorage origin.
    window.location.href = SIM_PAGE + '?handoff=' + payload.context.stagedAt;
    return true;
  }

  // Return: consume a pending result, write back HP/XP, append the log.
  function checkResult() {
    var res = _loadLocalJson(RESULT_KEY);
    if (!res) return false;

    _removeLocal(RESULT_KEY);

    var chars = _load(CHARS_KEY) || [];
    var activeId = null; try { activeId = localStorage.getItem(ACTIVE_KEY); } catch (e) {}
    var out = _applyResult(res, chars, activeId);

    // Character data remains in the normal GCC persistence/sync path.
    _save(CHARS_KEY, out.chars);

    // Encounter history remains browser-local.
    var log = _loadLocalJson(LOG_KEY) || [];
    log.push(out.entry);
    _saveLocalJson(LOG_KEY, log);

    _toast(out.summary);
    try { window.dispatchEvent(new CustomEvent('gcc-encounter-applied', { detail: out.entry })); } catch (e) {}
    return true;
  }

  // Inject a Fight button into the encounter panel footer for monster encounters.
  function _injectFightButton(result) {
    if (!result || !result.mmStats) return;
    var footer = document.getElementById('enc-footer');
    if (!footer || document.getElementById('enc-fight')) return;
    var btn = document.createElement('button');
    btn.id = 'enc-fight';
    btn.title = 'Resolve this encounter in the tactical combat simulator';
    btn.textContent = '\u2694 Fight';
    footer.insertBefore(btn, footer.firstChild);
  }

  // Wrap the panel's show() to capture the live result + add the Fight button.
  var _last = null;
  function _wrapPanel() {
    if (!window.GCCEncounterPanel || _wrapPanel._done) return;
    _wrapPanel._done = true;
    var orig = window.GCCEncounterPanel.show;
    window.GCCEncounterPanel.show = function (result) {
      _last = result;
      var r = orig.apply(this, arguments);
      setTimeout(function () { _injectFightButton(result); }, 0);
      return r;
    };
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'enc-fight') { e.preventDefault(); fight(_last); }
    });
  }

  function _boot() { _wrapPanel(); _kernelReady.then(checkResult, checkResult); }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _boot);
    else _boot();
  }

  window.GCCCombat = {
    version: '0.4.2',
    fight: fight,
    checkResult: checkResult,
    kernelReady: _kernelReady,
    _buildPayload: _buildPayload,
    _applyResult: _applyResult,
    _awardXP: _awardXP
  };
})();
