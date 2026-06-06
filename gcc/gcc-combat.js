// gcc-combat.js v0.1.0 - 2026-06-06
// Bridges the GCC encounter panel (greyhawk-map.html) to the dungeon-encounter
// tactical sim. Adds a Fight button to the encounter panel, stages the handoff
// payload, and on return applies HP/XP back to the active character + logs it.
//
//   launch:  write payload -> 'gcc-pending-encounter', open dungeon-encounter.html
//   return:  read 'gcc-encounter-result' on boot, write back, append log
//
// Pure helpers (_buildPayload, _applyResult) are exposed for headless testing.

(function () {
  'use strict';

  var ACTIVE_KEY = 'gcc-active-char';
  var CHARS_KEY = (window.GCC && GCC.KEYS && GCC.KEYS.add1eChars) || 'gcc-add1e-chars';
  var PENDING_KEY = 'gcc-pending-encounter';
  var RESULT_KEY = 'gcc-encounter-result';
  var LOG_KEY = 'gcc-encounter-log';
  var SIM_PAGE = 'dungeon-encounter.html';

  function _load(key) { try { return (window.GCC && GCC.load) ? GCC.load(key) : JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function _save(key, val) { try { if (window.GCC && GCC.save) GCC.save(key, val); else localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function _num(v, d) { var n = parseInt(v, 10); return isNaN(n) ? (d || 0) : n; }
  function _toast(msg) { if (typeof window.showToast === 'function') window.showToast(msg); }

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
  function _buildPayload(result, party) {
    result = result || {};
    var mm = result.mmStats || null;
    var monsters = mm ? [{ mm: mm, count: Math.max(1, _num(result.numberRolled, 1)) }] : [];
    var dist = (result.distance && (result.distance.yards != null ? result.distance.yards : result.distance.rawYards));
    return {
      party: party || [],
      monsters: monsters,
      context: {
        distance: _num(dist, 8),
        surprise: _surpriseSide(result.surprise),
        surprise_segments: 1,
        label: (mm && (mm.name || mm.NAME)) || 'Encounter',
        treasure: (mm && (mm.treasureType || mm['TREASURE TYPE'])) || null
      }
    };
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
    var active = activeId != null ? byId[String(activeId)] : null;
    if (xp > 0 && active) active.xpTotal = _num(active.xpTotal, 0) + xp;
    var entry = {
      ts: Date.now(),
      label: res.label || (res.defeated_monsters && res.defeated_monsters[0] && res.defeated_monsters[0].label) || 'Encounter',
      outcome: res.outcome || 'aborted',
      xp: xp,
      rounds: _num(res.rounds, 0),
      defeated: (res.defeated_monsters || []).map(function (m) { return m.label; }),
      casualties: (res.casualties || []).filter(function (c) { return c.side === 'A'; }).map(function (c) { return c.label; }),
      activeCharId: activeId || null
    };
    var summary = ({
      party_victory: 'Victory! +' + xp + ' XP',
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
    _save(PENDING_KEY, payload);
    window.location.href = SIM_PAGE;
    return true;
  }

  // Return: consume a pending result, write back HP/XP, append the log.
  function checkResult() {
    var res = _load(RESULT_KEY);
    if (!res) return false;
    try { localStorage.removeItem(RESULT_KEY); } catch (e) {}
    var chars = _load(CHARS_KEY) || [];
    var activeId = null; try { activeId = localStorage.getItem(ACTIVE_KEY); } catch (e) {}
    var out = _applyResult(res, chars, activeId);
    _save(CHARS_KEY, out.chars);
    var log = _load(LOG_KEY) || [];
    log.push(out.entry);
    _save(LOG_KEY, log);
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

  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'enc-fight') { e.preventDefault(); fight(_last); }
  });

  function _boot() { _wrapPanel(); checkResult(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _boot);
  else _boot();

  window.GCCCombat = { fight: fight, checkResult: checkResult, _buildPayload: _buildPayload, _applyResult: _applyResult };
})();
