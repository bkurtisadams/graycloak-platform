// gcc-encounter-panel.js — Encounter result panel
//
// Renders an AD&D 1e encounter result as a draggable floating panel,
// sibling of #landmark-info and #region-info. Adds itself to the DOM
// at module load and exposes:
//
//   GCCEncounterPanel.show(result)   render an encounter result
//   GCCEncounterPanel.close()        close the panel
//
// Reuses the .li-section / .li-detail-row / .li-text classes from
// landmark-info CSS for visual consistency, with a distinct red-orange
// accent (#c44d2a) so encounter cards read as their own thing.

(function(){
  'use strict';

  function makePanel(){
    if (document.getElementById('encounter-info')) return;

    const panel = document.createElement('div');
    panel.id = 'encounter-info';
    panel.className = 'enc-panel';
    panel.innerHTML = `
      <button id="enc-close" title="Close">✕</button>
      <div id="enc-header">
        <h2 id="enc-name">—</h2>
        <div id="enc-subtitle">—</div>
      </div>
      <div id="enc-body"></div>
      <div id="enc-footer">
        <button id="enc-reroll" title="Roll a new encounter for the same hex">⚄ Re-roll</button>
        <button id="enc-force" title="Force an encounter regardless of frequency check">⚡ Force</button>
      </div>
    `;
    document.body.appendChild(panel);

    // CSS — appended once. Mirrors landmark-info structure with a
    // red-orange (encounter / danger) accent so the panel reads as
    // a different category from the green region panel and gold
    // landmark panel.
    //
    // Sizing: fixed width and height (no max-height), body scrolls.
    // Re-rolls produce different content lengths (settlement vs
    // monster vs no-encounter) and previously the panel was sizing
    // to content, so the Re-roll button moved under the cursor on
    // every click. Fixed height keeps the footer in place. The
    // panel is `resize: both` so the user can drag the bottom-right
    // corner to grow or shrink it; minimum dimensions guard against
    // collapsing to nothing.
    const style = document.createElement('style');
    style.textContent = `
      #encounter-info { position:fixed; top:0; left:0;
        width:300px; height:520px;
        min-width:240px; min-height:300px;
        max-height:90vh; max-width:90vw;
        resize: both;
        background:#150805; border:1px solid #c44d2a; border-radius:2px;
        z-index:60; box-shadow:0 8px 32px rgba(0,0,0,.7); opacity:0; pointer-events:none;
        transition:opacity .18s ease; display:flex; flex-direction:column;
        overflow:hidden; }
      #encounter-info.open { opacity:1; pointer-events:all; }
      #enc-header { padding:9px 30px 6px 11px; border-bottom:1px solid rgba(196,77,42,.4);
        position:relative; cursor:grab; user-select:none; flex:0 0 auto; }
      #enc-header.dragging { cursor:grabbing; }
      #enc-header h2 { font-family:'Cinzel',serif; font-size:13px; color:#f0c8a8;
        letter-spacing:.06em; margin-bottom:3px; }
      #enc-subtitle { font-size:10px; color:#d8a888; font-style:italic; line-height:1.3; }
      #enc-close { position:absolute; top:6px; right:8px; background:rgba(196,77,42,.1);
        border:1px solid rgba(196,77,42,.4); color:#d8a888; font-size:12px; cursor:pointer;
        padding:2px 6px; border-radius:2px; line-height:1; z-index:10; }
      #enc-close:hover { background:rgba(196,77,42,.3); color:#fce0c8; }
      #enc-body { flex:1 1 auto; overflow-y:auto; padding:9px 11px;
        display:flex; flex-direction:column; gap:9px; min-height:0; }
      #enc-body::-webkit-scrollbar { width:4px; }
      #enc-body::-webkit-scrollbar-thumb { background:rgba(196,77,42,.3); }
      #enc-footer { display:flex; gap:6px; padding:8px 11px;
        border-top:1px solid rgba(196,77,42,.3); flex:0 0 auto; }
      #enc-footer button { flex:1; background:rgba(196,77,42,.15); color:#f0c8a8;
        border:1px solid rgba(196,77,42,.5); border-radius:2px; padding:5px;
        font-size:11px; cursor:pointer; font-family:inherit; letter-spacing:.04em; }
      #enc-footer button:hover { background:rgba(196,77,42,.3); color:#fce0c8; }

      /* Number-appearing block. Single variant now (engine rolls
         everything; GM scales as needed). "× N" is the headline,
         the formula appears beneath as a small italic line when
         it adds info beyond the rolled count. */
      .enc-big-num { font-family:'Cinzel',serif; text-align:center; padding:4px 0; }
      .enc-big-num.has-rolled { font-size:22px; color:#f0c8a8; }
      .enc-big-num.has-rolled .formula { display:block; font-size:10px;
        color:#a88e7a; font-style:italic; font-family:inherit;
        margin-top:2px; letter-spacing:0; }
      .enc-adjust-hint { font-size:10px; color:#7a6a58; font-style:italic;
        text-align:center; padding:0 8px; margin-top:-4px; }
      .enc-row-stack { display:flex; flex-direction:column; gap:2px; }
      .enc-no-encounter { font-size:11px; color:#d8a888; font-style:italic;
        text-align:center; padding:8px; }
    `;
    document.head.appendChild(style);
  }

  // Shared with the rest of the GCC map page if it has makeDraggable.
  let encDrag = null;
  function ensureDraggable(){
    if (encDrag) return;
    if (typeof window.makeDraggable !== 'function') return;
    encDrag = window.makeDraggable(
      document.getElementById('encounter-info'),
      document.getElementById('enc-header'),
      'gh-encounter-info-pos'
    );
  }

  // Last-rolled context, kept so Re-roll / Force buttons know what
  // hex to roll for. Populated by show().
  let lastCtx = null;

  // Convert MM movement strings from feet to AD&D 1e inches notation.
  // The MM data uses "120 ft", "240 ft / 480 ft (flying)", "30 ft;
  // 150 ft flying (AA:IV)" etc. — the 1e canonical form is inches
  // (1" = 10 ft indoors / 10 yd outdoors). Some entries (mostly
  // dragons) already use the inches form; those pass through.
  // Any non-string input passes through unchanged.
  function movementToInches(s){
    if (typeof s !== 'string' || !s) return s;
    return s.replace(/(\d+)\s*ft\b/gi, (_, n) => {
      const inches = parseInt(n, 10) / 10;
      return `${Number(inches)}"`;
    });
  }

  // Movement overrides for monster types whose MM `move` field is
  // generic and undersells the actual mount or transport. The MM
  // lists every mounted patrol as "120 ft (mounted)" — a generic
  // human walking-pace converted to mounted that ignores the
  // actual horse type. Per the MM Horse table, mount rates are:
  //   heavy warhorse  15"   medium warhorse 18"   light warhorse 24"
  // Per WoG patrol descriptions, knights ride heavies, heavy patrols
  // ride heavy/medium, medium patrols ride medium/light, light
  // patrols ride light. Other entries (Rhennee on barges, Tribesmen,
  // Soldiery composition) are flavor-specific and left for later.
  // Keys are lowercase MM names; lookup tries both the resolved-via-
  // alias canonical name (e.g., 'men, brigand' resolves to 'men,
  // bandit', so the override applies under 'men, bandit') and the
  // original encounter-table name as a backup.
  const MOVEMENT_OVERRIDES = {
    'men, patrol (knight)':  '15" (heavy warhorse) / 18" (retainers, medium)',
    'men, patrol (heavy)':   '15"–18" (heavy/medium warhorses) or 9" (afoot)',
    'men, patrol (medium)':  '18" (medium) / 24" (light, troops)',
    'men, patrol (light)':   '24" (light warhorses)',
    'men, patrol (levies)':  '9" (afoot); officers on light warhorses (24")',
    'men, patrol (slaver)':  '9" (afoot) or 24" (mounted)',
    'men, patrol (warband)': '12"–24" (varies by origin)',
  };
  function resolveMovement(monsterName, mmMoveString){
    if (monsterName){
      const key = String(monsterName).toLowerCase().trim();
      if (MOVEMENT_OVERRIDES[key]) return MOVEMENT_OVERRIDES[key];
    }
    return movementToInches(mmMoveString);
  }

  function close(){
    document.getElementById('encounter-info')?.classList.remove('open');
  }

  function show(result){
    makePanel();
    ensureDraggable();
    lastCtx = result?.ctx || null;
    const ESC = s => { const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; };

    if (result?.error){
      _renderHeader('Error', '');
      _renderBody(`<div class="enc-no-encounter">${ESC(result.error)}</div>`);
      _open();
      return;
    }

    // Settlement hex — distinct rendering from "no encounter."
    // Header reads as the settlement name + a city/town subtitle so
    // the GM can see at a glance that this needs the city/town
    // tables, not that the wilderness check returned empty.
    if (result.settlement){
      const s = result.settlement;
      _renderHeader(s.name || 'Settlement', `${s.kind || ''} · ${result.ctx?.regionName || ''}`);
      let html =
        `<div class="enc-no-encounter">` +
        `Wilderness encounter rules don't apply inside a ${ESC(s.kind || 'settlement')}. ` +
        `Use the DMG city/town encounter tables (Phase 2 in this engine).` +
        `</div>`;
      // Useful settlement metadata if present, so the GM has
      // something to work with even before city/town tables land.
      const fields = [];
      if (s.pop)        fields.push(['Population',    s.pop]);
      if (s.popTotal)   fields.push(['Pop. (total)',  s.popTotal]);
      if (s.size)       fields.push(['Size',          s.size]);
      if (s.rulerName)  fields.push(['Ruler',         s.rulerName]);
      if (s.region)     fields.push(['Region',        s.region]);
      if (fields.length){
        html += '<div class="li-section"><div class="li-section-title">Settlement</div>';
        for (const [label, val] of fields){
          html += `<div class="li-detail-row"><span class="label">${ESC(label)}</span>` +
                  `<span class="value">${ESC(String(val))}</span></div>`;
        }
        html += '</div>';
      }
      _renderBody(html);
      _open();
      return;
    }

    if (!result.occurred){
      _renderHeader('No Encounter', _contextLine(result.ctx));
      const reason = result.reason || 'No encounter this check';
      let html = `<div class="enc-no-encounter">${ESC(reason)}</div>`;
      if (result.roll != null){
        html += `<div class="li-section">` +
          `<div class="li-section-title">Frequency Check</div>` +
          `<div class="li-detail-row"><span class="label">Roll</span>` +
          `<span class="value">${result.roll} on d${result.die}</span></div>` +
          `<div class="li-detail-row"><span class="label">Encounter on</span>` +
          `<span class="value">≤ ${result.successOn}</span></div>` +
          `</div>`;
      }
      _renderBody(html);
      _open();
      return;
    }

    // Encounter occurred — render full result card.
    const monster = result.monster || '?';
    _renderHeader(monster, _contextLine(result.ctx));

    const sections = [];

    // Number-appearing display. The engine always rolls now (no
    // settlement-scale gating — the GM decides what the rolled count
    // means in context). When the formula is informative beyond the
    // rolled number, show it on a small line beneath: "× 187" big,
    // "50d6" italicized below tells the GM "this is a caravan total,
    // adjust if the party is meeting just the front of it."
    // Section omitted entirely when neither number nor formula
    // exists.
    if (result.numberRolled != null){
      let html = `<div class="enc-big-num has-rolled">×&nbsp;${result.numberRolled}`;
      if (result.numberFormula && String(result.numberFormula) !== String(result.numberRolled)){
        html += `<span class="formula">${ESC(result.numberFormula)}</span>`;
      }
      html += `</div>`;
      // Small reminder that the rolled number is a starting point.
      // Especially useful for large rolls where the formula hints
      // at "this is a caravan/horde — adjust to taste."
      html += `<div class="enc-adjust-hint">GM may adjust</div>`;
      sections.push(html);
    } else if (result.monster && result.monster !== '?'){
      // No MM numberAppearing data and no table-provided formula —
      // common for "Men, Characters" (adventuring party, see DMG
      // Character Subtable) and similar narrative entries where
      // the GM determines composition.
      sections.push(
        `<div class="enc-adjust-hint">No standard count — GM determines composition</div>`
      );
    }

    // Combat stats from MM lookup
    if (result.mmStats){
      const m = result.mmStats;
      let h = '<div class="li-section"><div class="li-section-title">Combat</div>';
      const row = (lab, val) => val == null ? '' :
        `<div class="li-detail-row"><span class="label">${lab}</span><span class="value">${ESC(val)}</span></div>`;
      h += row('AC',          m.armorClass);
      h += row('HD',          m.hitDice);
      h += row('Move',        resolveMovement(m.name, m.move));
      h += row('Attacks',     typeof m.attacks === 'number' ? `${m.attacks} (${m.damage || '—'})` : (m.attacks || ''));
      if (typeof m.attacks !== 'number' && m.damage) h += row('Damage', m.damage);
      if (m.specialAttacks)  h += row('SA', m.specialAttacks);
      if (m.specialDefenses) h += row('SD', m.specialDefenses);
      if (m.magicResistance) h += row('MR', m.magicResistance);
      h += '</div>';
      sections.push(h);

      // Identity / extras
      let id = '<div class="li-section"><div class="li-section-title">Notes</div>';
      id += row('Intelligence', m.intelligence);
      id += row('Alignment',    m.alignment);
      id += row('Size',         m.size);
      id += row('Treasure',     m.treasure || m['TREASURE TYPE']);
      id += row('Lair',         m.lairProbability);
      id += row('XP',           m.levelXP);
      id += '</div>';
      sections.push(id);
    }

    // Reaction / Distance / Surprise — DMG outdoor encounter triple
    let situ = '<div class="li-section"><div class="li-section-title">Situation</div>';
    if (result.reaction){
      situ += `<div class="li-detail-row"><span class="label">Reaction</span>` +
        `<span class="value">${result.reaction.label} (${result.reaction.roll})</span></div>`;
    }
    if (result.distance){
      // Effective yards already account for terrain modifiers and any
      // surprise reduction. When surprise reduced the distance, show
      // "X yd (was Y yd)" to make the reduction visible. Confrontation
      // (≤1″ final per DMG p.48) gets its own callout row.
      const d = result.distance;
      const distMain = (d.surpriseInches > 0 && d.rawYards !== d.yards)
        ? `${d.yards} yd <span style="opacity:.6">(was ${d.rawYards} yd before surprise)</span>`
        : `${d.yards} yd`;
      situ += `<div class="li-detail-row"><span class="label">Distance</span>` +
        `<span class="value">${distMain} <span style="opacity:.6">(${ESC(d.formula)})</span></span></div>`;
      if (d.confrontation){
        situ += `<div class="li-detail-row"><span class="label">Confrontation</span>` +
          `<span class="value" style="color:#e07555">Immediate — final distance ≤1″</span></div>`;
      }
    }
    if (result.surprise){
      situ += `<div class="li-detail-row"><span class="label">Surprise</span>` +
        `<span class="value">${ESC(result.surprise.label)}</span></div>`;
    }
    situ += '</div>';
    sections.push(situ);

    // Notes from the table row
    if (result.note){
      sections.push(
        `<div class="li-section"><div class="li-section-title">Table Note</div>` +
        `<div class="li-text">${ESC(result.note)}</div></div>`
      );
    }

    // Source attribution: which table did this come from
    let src = '<div class="li-section"><div class="li-section-title">Source</div>';
    src += `<div class="li-detail-row"><span class="label">Table</span>` +
      `<span class="value">${ESC(result.tableSourceUsed)}` +
      (result.tableRoll ? ` (rolled ${result.tableRoll})` : '') +
      `</span></div>`;
    // popTier source — explains why this hex is dense/patrolled/uninhab.
    // 'region' = from region's popTier (REGION_POP_TIERS or override)
    // 'landmark:city' = hex contains a city; locally upgraded to dense
    // 'landmark:city-adjacent' = hex within 1 of a city; tier bumped up
    // 'default' = no region tier, no nearby city → ctx default (uninhab)
    if (result.ctx?.popTierSource){
      src += `<div class="li-detail-row"><span class="label">PopTier</span>` +
        `<span class="value">${ESC(result.ctx.popTierSource)}</span></div>`;
    }
    if (result.occurs?.forced){
      src += `<div class="li-detail-row"><span class="label">Forced</span><span class="value">yes</span></div>`;
    } else if (result.occurs){
      src += `<div class="li-detail-row"><span class="label">Frequency</span>` +
        `<span class="value">${result.occurs.roll}/d${result.occurs.die}, ≤${result.occurs.successOn}</span></div>`;
    }
    src += '</div>';
    sections.push(src);

    // MM description if available — render at bottom in dimmer text
    if (result.mmStats?.description){
      sections.push(
        `<div class="li-section"><div class="li-section-title">Description</div>` +
        `<div class="li-text" style="font-size:10px;color:#a8a8a8">${ESC(result.mmStats.description)}</div></div>`
      );
    }

    _renderBody(sections.join(''));
    _open();
  }

  function _renderHeader(name, subtitle){
    document.getElementById('enc-name').textContent = name;
    document.getElementById('enc-subtitle').textContent = subtitle || '—';
  }
  function _renderBody(html){
    document.getElementById('enc-body').innerHTML = html;
  }
  function _open(){
    const p = document.getElementById('encounter-info');
    p.classList.add('open');
    if (encDrag && !encDrag.restore()) encDrag.placeCenter();
  }
  function _contextLine(ctx){
    if (!ctx) return '';
    const bits = [];
    if (ctx.gccTerrain) bits.push(ctx.gccTerrain);
    if (ctx.regionName) bits.push(ctx.regionName);
    if (ctx.timeOfDay)  bits.push(ctx.timeOfDay);
    // Always show population since it controls frequency. 'dense'
    // and 'patrolled' are noteworthy; 'uninhabited' is also worth
    // showing because the encounter rate is highest there.
    if (ctx.population)  bits.push(ctx.population);
    return bits.join(' · ');
  }

  // Wire close + footer buttons after panel is in DOM. Use event
  // delegation off the panel itself so we don't duplicate handlers
  // when show() is called multiple times.
  function wireOnce(){
    if (wireOnce._done) return;
    wireOnce._done = true;
    document.addEventListener('click', e => {
      const t = e.target;
      if (t.id === 'enc-close')  close();
      if (t.id === 'enc-reroll' && lastCtx){
        const r = window.GCCEncounters.check(lastCtx);
        show(r);
      }
      if (t.id === 'enc-force' && lastCtx){
        const r = window.GCCEncounters.check(lastCtx, { force: true });
        show(r);
      }
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', wireOnce);
  } else {
    wireOnce();
  }

  window.GCCEncounterPanel = { show, close };
})();
