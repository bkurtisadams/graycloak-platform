// The campaign world. The country outside Eden Valley is not drawn for the game: it is read from the same
// data and generator the GCC Gamma World map uses (gcc/gw-*.js), so the game and the campaign map are one world.
// Parents are 30-mile hexes; each holds 3-mile sub-hexes whose terrain is authored or generated from a fixed seed.
// In a browser on the same origin as the map, working edits in localStorage are picked up as well.

const GCC = '../gcc/';
const SCRIPTS = ['gw-authored.js', 'gw-terrain-data.js', 'gcc-rng.js', 'gw-subhex-data.js', 'gw-encounter-data.js', 'gw-creatures.js'];
const ROOT3 = Math.sqrt(3), KM_PER_MILE = 1.609344;
// Eden Valley on the campaign map (world SVG units), about 90 miles south of Spokane. Used when no marker is named for it.
const EDEN = { x: 456, y: 279.13 };
const SHOWN = new Set(['city', 'town', 'village', 'fortification', 'ruin', 'robot-farm', 'monastery', 'installation']);

function script(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(Error(`Could not load ${src}`));
        document.head.append(s);
    });
}
function annotations(root) {
    const committed = root.GW_AUTHORED?.stores?.['gw-annotations'];
    try {
        const working = JSON.parse(root.localStorage?.getItem('gw-annotations') ?? 'null');
        if (working && (working.strokes?.length || working.markers?.length)) return working;
    } catch { /* fall through to the committed map */ }
    return committed ?? { strokes: [], markers: [] };
}

// Build the scene for the country around a point: a window of sub-hexes with terrain, rivers, roads and known places.
export function regionFrom(root, { cols = 31, rows = 23 } = {}) {
    const data = root.GWSubhexData;
    if (!data) throw Error('Campaign map data is not loaded');
    const { markers, strokes } = annotations(root);
    const named = markers.find(m => /eden valley/i.test(m.name ?? '')) ?? EDEN;
    const home = data.svgToAxial(named.x, named.y), cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
    const axial = (x, y) => ({ Q: home.Q + x - cx, R: home.R + (y - cy) - (Math.floor(x / 2) - Math.floor(cx / 2)) });
    const cell = (Q, R) => { const x = Q - home.Q + cx; return { x, y: R - home.R + cy + Math.floor(x / 2) - Math.floor(cx / 2) }; };
    const terrain = [], hazards = [], walls = [];
    for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
            const { Q, R } = axial(x, y), sub = data.getSubhexAt(Q, R), t = sub.terrain || 'unknown';
            terrain.push(t);
            hazards.push(sub.hazard || null);
            if (t === 'water') walls.push([x, y]);
        }
    const inside = p => p.x >= 0 && p.y >= 0 && p.x < cols && p.y < rows, at = p => terrain[p.y * cols + p.x];
    const places = markers.filter(m => m.name && SHOWN.has(m.kind) && m !== named)
        .map(m => ({ ...cell(...Object.values(data.svgToAxial(m.x, m.y))), name: m.name, kind: m.kind })).filter(inside);
    // Placeholder adventure sites until real ones are keyed: the nearest wooded hex and the nearest ruin (or a fixed spot).
    const taken = new Set([`${cx},${cy}`]);
    const nearest = (test, fallback) => {
        let best = null;
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
            const d = Math.hypot((x - cx) * 1.5, (y + (x & 1) / 2 - cy - (cx & 1) / 2) * ROOT3);
            if (d >= 5 && !taken.has(`${x},${y}`) && test({ x, y }) && (!best || d < best.d)) best = { x, y, d };
        }
        const p = best ?? fallback;
        taken.add(`${p.x},${p.y}`);
        return { x: p.x, y: p.y };
    };
    const clearing = nearest(p => /forest/.test(at(p)), { x: cx + 3, y: cy - 2 });
    const ruin = places.filter(p => p.kind === 'ruin' && !taken.has(`${p.x},${p.y}`) && Math.hypot(p.x - cx, p.y - cy) >= 3).sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0];
    const outpost = ruin ? (taken.add(`${ruin.x},${ruin.y}`), { x: ruin.x, y: ruin.y }) : nearest(p => at(p) !== 'water', { x: cx + 4, y: cy + 3 });
    const origin = data.subhexSvgCenter(...Object.values(axial(0, 0))), r = data.SUB_R;
    return {
        id: 'eden-region',
        rev: 2,
        name: 'Eden Valley region',
        parent: null,
        layout: 'hex',
        cols, rows, walls, terrain, hazards,
        // Travel here is route movement through uncharted country, so random encounters are checked (ENCOUNTERS).
        encounters: root.GWEncounterData ?? null,
        bestiary: root.GWCreatures?.creatures ?? null,
        palette: Object.fromEntries(Object.entries(data.TERRAIN).map(([k, v]) => [k, v.fill])),
        terrainNames: Object.fromEntries(Object.entries(data.TERRAIN).map(([k, v]) => [k, v.label])),
        // World SVG box of the window, so strokes drawn on the campaign map land on the same hexes here.
        view: { x: origin.x - r, y: origin.y - r * ROOT3 / 2, width: (cols - 1) * 1.5 * r + 2 * r, height: (rows + 0.5) * ROOT3 * r },
        strokes: strokes.map(s => ({ kind: s.kind, pts: s.pts })).filter(s => s.pts?.length > 1),
        places: places.filter(p => !taken.has(`${p.x},${p.y}`) || (ruin && p === ruin)),
        cellMeters: 3 * KM_PER_MILE * 1000,
        // Crossing time comes from the terrain entered (route rates, rules package travel.js); this is only the open-ground figure.
        minutesPerCell: 145,
        route: true,
        scale: { cells: 2 * 2 / ROOT3, label: '6 miles' },
        sites: [
            { id: 'eden-valley', x: cx, y: cy, name: 'Eden Valley', kind: 'exit', to: 'eden-valley', arrive: 'gate', label: 'Enter Eden Valley' },
            { id: 'clearing', ...clearing, name: 'Forest clearing', kind: 'encounter' },
            { id: 'outpost', ...outpost, name: ruin?.name ?? 'Ancient outpost', kind: 'ruin' },
        ],
        start: 'eden-valley',
    };
}

let pending = null;
// Browser only: fetch the campaign map scripts once and return the region scene.
export function loadRegion() {
    pending ??= (async () => { for (const name of SCRIPTS) await script(GCC + name); return regionFrom(globalThis); })();
    return pending;
}
