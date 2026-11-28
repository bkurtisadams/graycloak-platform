// The campaign world. The country outside Eden Valley is not drawn for the game: it is read from the same
// data and generator the GCC Gamma World map uses (gcc/gw-*.js), so the game and the campaign map are one world.
// Parents are 30-mile hexes; each holds 3-mile sub-hexes whose terrain is authored or generated from a fixed seed.
// In a browser on the same origin as the map, working edits in localStorage are picked up as well.

const GCC = '../gcc/';
const SCRIPTS = ['gw-authored.js', 'gw-terrain-data.js', 'gcc-rng.js', 'gw-subhex-data.js', 'gw-encounter-data.js', 'gw-creatures.js'];
// The generated ancient-roads layer. The map works without it, so a missing file is not an error.
const OPTIONAL = ['gw-ancient-roads.js'];
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
// What an ancient road is worth to someone on foot, by its condition on the campaign map (automated-referee policy):
// usable duralloy is a road, a broken stretch is no better than a trail, and the rest give nothing.
const ANCIENT = { usable: 'road', broken: 'trail' };
export function regionFrom(root, { cols = 31, rows = 23, centre = null } = {}) {
    const data = root.GWSubhexData;
    if (!data) throw Error('Campaign map data is not loaded');
    const drawn = annotations(root), markers = drawn.markers, ancient = root.GW_ANCIENT_ROADS?.strokes ?? [];
    const strokes = [...drawn.strokes, ...ancient].filter(s => !s.hidden);
    const named = centre ?? markers.find(m => /eden valley/i.test(m.name ?? '')) ?? EDEN;
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
    // Lairs, vaults and the like are not on the map: a party finds one by entering its hex at searching pace.
    const secrets = markers.filter(m => m.name && !SHOWN.has(m.kind) && m !== named).map(m => ({ ...cell(...Object.values(data.svgToAxial(m.x, m.y))), name: m.name, kind: m.kind, id: m.id ?? `${m.kind}:${m.name}` })).filter(inside);
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
    // Which hexes an old road or trail runs through: each drawn line is walked in small steps and the hexes under it noted.
    const ways = new Array(cols * rows).fill(null);
    for (const s of strokes) {
        const kind = s.kind === 'ancient-road' ? ANCIENT[s.condition] : s.kind;
        if (!['road', 'trail'].includes(kind) || !(s.pts?.length > 1)) continue;
        for (let i = 1; i < s.pts.length; i++) {
            const [ax, ay] = s.pts[i - 1], [bx, by] = s.pts[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (data.SUB_R / 2)));
            for (let k = 0; k <= n; k++) { const p = cell(...Object.values(data.svgToAxial(ax + (bx - ax) * k / n, ay + (by - ay) * k / n))); if (inside(p) && ways[p.y * cols + p.x] !== 'road') ways[p.y * cols + p.x] = kind; }
        }
    }
    const origin = data.subhexSvgCenter(...Object.values(axial(0, 0))), r = data.SUB_R;
    const view = { x: origin.x - r, y: origin.y - r * ROOT3 / 2, width: (cols - 1) * 1.5 * r + 2 * r, height: (rows + 0.5) * ROOT3 * r };
    const onMap = s => s.pts.some(p => p[0] >= view.x && p[0] <= view.x + view.width && p[1] >= view.y && p[1] <= view.y + view.height);
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
        view,
        // Ancient roads are drawn where something of them can be seen; buried and lost stretches are not.
        strokes: strokes.filter(s => s.kind !== 'ancient-road' || !['buried', 'lost'].includes(s.condition)).filter(s => s.pts?.length > 1 && onMap(s)).map(s => ({ kind: s.kind === 'ancient-road' ? `ancient-road ${s.condition}` : s.kind, pts: s.pts })),
        places: places.filter(p => !taken.has(`${p.x},${p.y}`) || (ruin && p === ruin)),
        cellMeters: 3 * KM_PER_MILE * 1000,
        // Crossing time comes from the terrain entered (route rates, rules package travel.js); this is only the open-ground figure.
        minutesPerCell: 145,
        route: true,
        ways,
        secrets,
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
    pending ??= (async () => { for (const name of SCRIPTS) await script(GCC + name); for (const name of OPTIONAL) await script(GCC + name).catch(() => {}); return regionFrom(globalThis); })();
    return pending;
}
