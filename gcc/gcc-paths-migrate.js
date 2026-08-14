// gcc-paths-migrate.js v0.1.0 — 2026-08-13
// One-time projection of parent-scale rivers/roads (gcc-paths.js base
// chains) into subhex-scale paths (gcc-subhex-paths.js) so they enter
// the publish pipeline and render in the subhex fullview and the
// graycloak-adnd player map.
//
// Projection: each chain hex maps to its center subhex via
// GCCSubhexData.parentCenterAxial; consecutive centers are joined by
// a cube-lerp hex line (guaranteed neighbor-adjacent), producing a
// coarse center-to-center course the GM can refine by hand in the
// subhex path editor afterwards. Tier carries over (great_river /
// river; parent 'stream' type would too if one existed). Roads carry
// kind directly.
//
// Write path: docs are built offline in the subhex-paths shape, then
// merged in via ONE importPaths() call — which marks ALL paths dirty
// and does a single save — instead of ~20k per-appendCell saves.
// NOTE the side effect: any pre-existing subhex paths are re-marked
// dirty and will republish on the next ⬆. Harmless (same content),
// but expect the badge to include them.
//
// Existing kind+name paths are skipped (same dedup rule as
// createPath), so re-running is safe and won't duplicate.
//
// Console usage on greyhawk-map.html (GM):
//   GCCPathsMigrate.preview()            — table of what would migrate
//   GCCPathsMigrate.migrate()            — do it (rivers + roads)
//   GCCPathsMigrate.migrate({dryRun:true})
//   GCCPathsMigrate.migrateOne('Velverdyva')
// Then click ⬆ Publish.

(function(){
  'use strict';

  // ── Hex line (cube lerp + round), flat-top axial ───────────────────
  function cubeRound(x, y, z){
    let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
    const dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
    if (dx > dy && dx > dz) rx = -ry - rz;
    else if (dy > dz)       ry = -rx - rz;
    else                    rz = -rx - ry;
    return { Q: rx, R: rz };
  }
  function axialDistance(a, b){
    const dQ = b.Q - a.Q, dR = b.R - a.R;
    return (Math.abs(dQ) + Math.abs(dR) + Math.abs(dQ + dR)) / 2;
  }
  // Cells from a to b inclusive; consecutive cells are axial neighbors.
  function hexLine(a, b){
    const N = axialDistance(a, b);
    if (N === 0) return [{ Q: a.Q, R: a.R }];
    const out = [];
    const ax = a.Q, az = a.R, ay = -ax - az;
    const bx = b.Q, bz = b.R, by = -bx - bz;
    for (let i = 0; i <= N; i++){
      const t = i / N;
      // epsilon nudge avoids landing exactly on cell edges
      out.push(cubeRound(
        ax + (bx - ax) * t + 1e-6,
        ay + (by - ay) * t + 2e-6,
        az + (bz - az) * t - 3e-6));
    }
    return out;
  }
  // Chain of parent hexes → deduped subhex cell course through centers.
  function projectChain(chain, parentCenterAxial){
    const cells = [];
    let prev = null;
    for (const hex of chain){
      const c = parentCenterAxial(hex.col, hex.row);
      if (prev){
        const leg = hexLine(prev, c);
        for (let i = 1; i < leg.length; i++) cells.push(leg[i]); // skip shared joint
      } else {
        cells.push({ Q: c.Q, R: c.R });
      }
      prev = c;
    }
    return cells;
  }

  // ── Source enumeration ─────────────────────────────────────────────
  function sources(){
    const P = window.GCCPaths;
    if (!P) return [];
    const out = [];
    for (const name of (P.allRiverNames ? P.allRiverNames() : [])){
      const chain = P.getRiverChain(name);
      const info = P.getRiverInfo(name);
      if (!chain || chain.length < 2) continue;
      const tier = (info && (info.type === 'great_river' || info.type === 'stream'))
        ? info.type : 'river';
      out.push({ kind: 'river', tier, name, chain });
    }
    for (const name of (P.allRoadNames ? P.allRoadNames() : [])){
      const chain = P.getRoadChain(name);
      const info = P.getRoadInfo ? P.getRoadInfo(name) : null;
      if (!chain || chain.length < 2) continue;
      const kind = (info && info.kind === 'trail') ? 'trail' : 'road';
      out.push({ kind, tier: null, name, chain });
    }
    return out;
  }

  function slugify(name){
    return String(name).toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'path';
  }

  // ── Preview / migrate ──────────────────────────────────────────────
  function preview(){
    const SP = window.GCCSubhexPaths, SD = window.GCCSubhexData;
    if (!SP || !SD){ console.warn('[PathsMigrate] subhex modules not loaded'); return []; }
    const rows = sources().map(src => {
      const exists = !!SP.findByKindName(src.kind, src.name);
      const cells = exists ? null : projectChain(src.chain, SD.parentCenterAxial);
      return {
        name: src.name, kind: src.kind, tier: src.tier,
        parentHexes: src.chain.length,
        subhexCells: cells ? cells.length : '—',
        status: exists ? 'SKIP (already authored)' : 'migrate',
      };
    });
    if (console.table) console.table(rows);
    return rows;
  }

  function migrate(opts){
    const dryRun = !!(opts && opts.dryRun);
    const only = opts && opts.only ? String(opts.only) : null;
    const SP = window.GCCSubhexPaths, SD = window.GCCSubhexData;
    if (!SP || !SD){ console.warn('[PathsMigrate] subhex modules not loaded'); return null; }

    const existing = SP.exportPaths();
    const usedIds = new Set(Object.keys(existing).map(SP.parsePathDocId).filter(Boolean));
    const created = [], skipped = [];
    const now = Date.now();

    for (const src of sources()){
      if (only && src.name !== only) continue;
      if (SP.findByKindName(src.kind, src.name)){ skipped.push(src.name); continue; }
      const cells = projectChain(src.chain, SD.parentCenterAxial);
      let localId = slugify(src.name), n = 2;
      while (usedIds.has(localId)) localId = `${slugify(src.name)}-${n++}`;
      usedIds.add(localId);
      existing[SP.pathDocId(localId)] = {
        id: localId,
        kind: src.kind,
        tier: src.kind === 'river' ? src.tier : null,
        name: src.name,
        notes: 'migrated from parent-scale chain; refine course by hand',
        cells,
        headwaters: null,
        mouth: null,
        schemaVersion: SP.SCHEMA_VERSION,
        authoredAt: now,
      };
      created.push(`${src.name} (${src.kind}${src.tier ? '/' + src.tier : ''}, ${cells.length} cells)`);
    }

    if (!dryRun && created.length){
      SP.importPaths(existing);
    }
    const verb = dryRun ? 'would migrate' : 'migrated';
    console.log(`[PathsMigrate] ${verb} ${created.length}, skipped ${skipped.length} existing.`);
    created.forEach(c => console.log('  + ' + c));
    if (!dryRun && created.length){
      console.log('[PathsMigrate] all subhex paths are now marked dirty — click ⬆ Publish to push to cloud.');
    }
    return { created, skipped, dryRun };
  }

  function migrateOne(name){ return migrate({ only: name }); }

  window.GCCPathsMigrate = { preview, migrate, migrateOne,
    _projectChain: projectChain, _hexLine: hexLine };
})();
