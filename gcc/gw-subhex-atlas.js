// gw-subhex-atlas.js v0.1.0 — 2026-07-07
// Deterministic full-world subhex atlas facade for Gamma World.
//
// This module is the seam between the editable data model and a future raster
// tile renderer. It does not draw anything and it does not write to storage.
// Instead it answers: "what would this parent/subhex contain if the whole world
// were generated on demand from the current seed, authored edits, roads,
// markers, terrain, hazards, and deterministic feature rules?"
//
// Source-of-truth policy:
// - Parent terrain/hazard/territory and hand annotations are authored data.
// - Subhex terrain/hazard/features are generated on read, then overlaid by
//   committed/working subhex edits.
// - Generated markers/roads/trails come from GWFeatureGen.planForParent()
//   and are preview data until explicitly baked into GWAnnotations.
// - Future image tiles are render artifacts, never the canonical map data.
//
// Depends on window.GWSubhexData and optionally GWFeatureGen/GWAnnotations.

(function(){
  'use strict';

  const ATLAS_VERSION = '0.1.0';
  const SCHEMA_VERSION = 1;
  const MILES_PER_PARENT = 30;
  const MILES_PER_SUBHEX = 3;
  const DEFAULT_WORLD_W = 3001;
  const DEFAULT_WORLD_H = 1863;

  let CONFIG = {
    worldW: DEFAULT_WORLD_W,
    worldH: DEFAULT_WORLD_H,
    cols: null,
    rows: null,
  };
  const _parentCache = new Map();
  const _summaryCache = { key: '', value: null };

  function D(){ return window.GWSubhexData || null; }
  function A(){ return window.GWAnnotations || null; }
  function F(){ return window.GWFeatureGen || null; }

  function configure(opts){
    opts = opts || {};
    CONFIG = Object.assign({}, CONFIG, {
      worldW: finiteOr(opts.worldW, CONFIG.worldW),
      worldH: finiteOr(opts.worldH, CONFIG.worldH),
      cols: Number.isFinite(+opts.cols) ? Math.max(0, Math.floor(+opts.cols)) : CONFIG.cols,
      rows: Number.isFinite(+opts.rows) ? Math.max(0, Math.floor(+opts.rows)) : CONFIG.rows,
    });
    _parentCache.clear();
    _summaryCache.key = ''; _summaryCache.value = null;
    return getConfig();
  }
  function finiteOr(v, fallback){ return Number.isFinite(+v) ? +v : fallback; }
  function getConfig(){ return Object.assign({}, CONFIG); }
  function parentKey(col, row){ return String(col) + ',' + String(row); }
  function subhexKey(Q, R){ return 'subhex_' + String(Q) + '_' + String(R); }

  function inferBounds(){
    if (CONFIG.cols && CONFIG.rows){
      return { minCol: 0, minRow: 0, maxCol: CONFIG.cols - 1, maxRow: CONFIG.rows - 1, cols: CONFIG.cols, rows: CONFIG.rows };
    }
    let maxCol = 0, maxRow = 0;
    const data = (window.GW_TERRAIN_DATA || []);
    for (const d of data){
      if (Number.isFinite(+d.col)) maxCol = Math.max(maxCol, +d.col);
      if (Number.isFinite(+d.row)) maxRow = Math.max(maxRow, +d.row);
    }
    return { minCol: 0, minRow: 0, maxCol, maxRow, cols: maxCol + 1, rows: maxRow + 1 };
  }
  function worldBounds(){
    const b = inferBounds();
    return Object.assign({}, b, {
      worldW: CONFIG.worldW,
      worldH: CONFIG.worldH,
      parentMiles: MILES_PER_PARENT,
      subhexMiles: MILES_PER_SUBHEX,
    });
  }
  function hasParent(col, row){
    const b = inferBounds();
    col = +col; row = +row;
    return Number.isInteger(col) && Number.isInteger(row) && col >= b.minCol && col <= b.maxCol && row >= b.minRow && row <= b.maxRow;
  }
  function forEachParent(fn){
    const b = inferBounds();
    for (let col = b.minCol; col <= b.maxCol; col++){
      for (let row = b.minRow; row <= b.maxRow; row++){
        fn(col, row, parentKey(col, row));
      }
    }
  }
  function listParentKeys(){
    const keys = [];
    forEachParent((col, row, key) => keys.push(key));
    return keys;
  }

  function terrainSource(col, row){
    if (typeof window.getTerrainSource === 'function') return window.getTerrainSource(col, row);
    if (typeof window.getTerrain === 'function') return 'resolved';
    return 'seed';
  }
  function hazardSource(col, row){
    if (typeof window.getHazardSource === 'function') return window.getHazardSource(col, row);
    if (typeof window.getHazard === 'function') return 'resolved';
    return 'seed';
  }
  function territorySource(col, row){
    if (typeof window.getTerritorySource === 'function') return window.getTerritorySource(col, row);
    if (typeof window.getTerritory === 'function') return 'resolved';
    return 'none';
  }
  function parentTerrain(col, row){
    const d = D();
    if (d) return d.parentTerrainOf(col, row) || 'unknown';
    if (typeof window.getTerrain === 'function') return window.getTerrain(col, row) || 'unknown';
    return 'unknown';
  }
  function parentHazard(col, row){
    const d = D();
    if (d) return d.parentHazardOf(col, row) || null;
    if (typeof window.getHazard === 'function') return window.getHazard(col, row) || null;
    return null;
  }
  function parentTerritory(col, row){
    if (typeof window.getTerritory === 'function') return window.getTerritory(col, row) || null;
    return null;
  }

  function parentBbox(col, row, pad){
    const d = D();
    if (!d) return null;
    pad = Number.isFinite(+pad) ? +pad : 0;
    const c = d.parentSvgCenter(col, row);
    const r = d.HEX_R;
    // A little generous. Good enough for tile invalidation/culling and avoids
    // expensive polygon math at this seam.
    return { minX: c.x - r - pad, minY: c.y - r - pad, maxX: c.x + r + pad, maxY: c.y + r + pad };
  }
  function parentRecord(col, row, opts){
    opts = opts || {};
    const d = D();
    if (!d || !hasParent(col, row)) return null;
    const key = parentKey(col, row);
    const cacheKey = key + '|' + (opts.includeCells ? 'cells' : '-') + '|' + (opts.includeGeneratedFeatures ? 'gen' : '-');
    if (!opts.noCache && _parentCache.has(cacheKey)) return clone(_parentCache.get(cacheKey));

    const cells = d.ownedByParent(col, row) || [];
    const center = d.parentSvgCenter(col, row);
    const rec = {
      schemaVersion: SCHEMA_VERSION,
      atlasVersion: ATLAS_VERSION,
      key,
      col: +col,
      row: +row,
      scale: 'parent-30mi',
      center,
      bbox: parentBbox(col, row, 0),
      terrain: parentTerrain(col, row),
      hazard: parentHazard(col, row),
      territory: parentTerritory(col, row),
      source: {
        terrain: terrainSource(col, row),
        hazard: hazardSource(col, row),
        territory: territorySource(col, row),
      },
      subhex: {
        scale: 'subhex-3mi',
        count: cells.length,
        mode: 'generated-on-read',
      },
      generated: { available: !!(F() && typeof F().planForParent === 'function') },
    };
    if (opts.includeCells){
      rec.subhex.cells = cells.map(c => subhexRecord(c.Q, c.R));
    }
    if (opts.includeGeneratedFeatures && rec.generated.available){
      rec.generated.plan = F().planForParent(col, row);
    }
    _parentCache.set(cacheKey, rec);
    return clone(rec);
  }

  function subhexRecord(Q, R){
    const d = D();
    if (!d) return null;
    const owner = d.ownerOf(+Q, +R);
    const pt = owner ? parentTerrain(owner.col, owner.row) : null;
    const ph = owner ? parentHazard(owner.col, owner.row) : null;
    const sub = d.getSubhex(+Q, +R, pt, ph);
    const center = d.subhexSvgCenter(+Q, +R);
    return {
      schemaVersion: SCHEMA_VERSION,
      atlasVersion: ATLAS_VERSION,
      key: subhexKey(+Q, +R),
      Q: +Q,
      R: +R,
      scale: 'subhex-3mi',
      center,
      owner: owner ? { col: owner.col, row: owner.row, key: parentKey(owner.col, owner.row) } : null,
      terrain: sub.terrain,
      hazard: sub.hazard || null,
      feature: sub.feature || null,
      name: sub.name || '',
      notes: sub.notes || '',
      source: sub.source || 'seed',
    };
  }

  function authoredAnnotationsInParent(col, row, pad){
    const ann = A();
    const bbox = parentBbox(col, row, pad == null ? 8 : pad);
    if (!ann || !bbox) return { strokes: [], markers: [] };
    return {
      strokes: ann.strokesInBbox ? ann.strokesInBbox(bbox, 0).filter(s => !s.gen) : [],
      markers: ann.markersInBbox ? ann.markersInBbox(bbox).filter(m => !m.gen) : [],
    };
  }

  function tileSourceForParent(col, row){
    const parent = parentRecord(col, row, { includeCells: true, includeGeneratedFeatures: true, noCache: true });
    if (!parent) return null;
    return {
      schemaVersion: SCHEMA_VERSION,
      atlasVersion: ATLAS_VERSION,
      renderIntent: 'raster-tile-source',
      parent,
      authoredAnnotations: authoredAnnotationsInParent(col, row, 8),
      sourcePolicy: getSourcePolicy(),
    };
  }

  function getSourcePolicy(){
    return {
      canonical: [
        'parent terrain, hazards, territory',
        'subhex overrides',
        'hand-authored annotations and markers',
      ],
      deterministicGenerated: [
        'seeded subhex terrain variation',
        'inherited parent radiation',
        'feature-plan markers, roads, and trails',
      ],
      renderArtifacts: [
        'future raster image tiles',
      ],
      note: 'Tiles should be rebuilt from atlas records; tiles should not become the source of truth.',
    };
  }

  function summarize(opts){
    opts = opts || {};
    const b = inferBounds();
    const key = JSON.stringify([b.cols, b.rows, !!opts.recountSubhexes]);
    if (!opts.recountSubhexes && _summaryCache.key === key && _summaryCache.value) return clone(_summaryCache.value);
    let parentCount = 0;
    let subhexCount = 0;
    let minCells = Infinity;
    let maxCells = 0;
    const terrainCounts = {};
    const hazardCounts = {};
    forEachParent((col, row) => {
      parentCount++;
      const terr = parentTerrain(col, row) || 'unknown';
      terrainCounts[terr] = (terrainCounts[terr] || 0) + 1;
      const haz = parentHazard(col, row) || 'none';
      hazardCounts[haz] = (hazardCounts[haz] || 0) + 1;
      if (opts.recountSubhexes){
        const cells = D() ? (D().ownedByParent(col, row) || []) : [];
        subhexCount += cells.length;
        minCells = Math.min(minCells, cells.length);
        maxCells = Math.max(maxCells, cells.length);
      }
    });
    const value = {
      schemaVersion: SCHEMA_VERSION,
      atlasVersion: ATLAS_VERSION,
      bounds: worldBounds(),
      parentCount,
      subhex: opts.recountSubhexes
        ? { count: subhexCount, minPerParent: isFinite(minCells) ? minCells : 0, maxPerParent: maxCells, mode: 'exact-count' }
        : { count: null, mode: 'not-counted', hint: 'Pass {recountSubhexes:true} for an exact but heavier count.' },
      terrainCounts,
      hazardCounts,
      sourcePolicy: getSourcePolicy(),
    };
    if (!opts.recountSubhexes){ _summaryCache.key = key; _summaryCache.value = clone(value); }
    return clone(value);
  }

  function clone(v){ return JSON.parse(JSON.stringify(v)); }

  window.GWSubhexAtlas = {
    ATLAS_VERSION, SCHEMA_VERSION, MILES_PER_PARENT, MILES_PER_SUBHEX,
    configure, getConfig, inferBounds, worldBounds,
    parentKey, subhexKey, hasParent, forEachParent, listParentKeys,
    parentRecord, subhexRecord, authoredAnnotationsInParent,
    tileSourceForParent, getSourcePolicy, summarize,
  };
  try { console.log('[gw-subhex-atlas] v0.1.0 loaded'); } catch(_){}
})();
