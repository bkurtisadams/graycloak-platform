// Scenes: every map the survivor can stand on. A scene is a background image (optional), a grid laid over it (squares, or
// hexes when layout is 'hex': flat-topped, odd columns set half a hex lower, as on the campaign map),
// the cells that cannot be entered, the sites placed on it, and exits that lead to other scenes.
// Scale is part of the scene: cellMeters says how much ground one cell covers and minutesPerCell how long a step takes.
// Travel rates are referee policy drawn from the printed route-movement guidance (p.17): about 8 km in a four-hour
// turn over clear ground, less in rough country.

const KM_PER_MILE = 1.609344;

function insidePolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
}

const ROOT3 = Math.sqrt(3);
// Where a cell's centre falls on the scene image, in image pixels. pixelsPerCell is the column step: the side of a
// square, or on a hex map three quarters of a hex's width (so rows are pixelsPerCell x 2/root 3 apart).
export function cellPixel(scene, x, y) {
    const p = scene.pixelsPerCell;
    return scene.layout === 'hex' ? { x: x * p + p * 2 / 3, y: (y + (x & 1) / 2 + 0.5) * p * 2 / ROOT3 } : { x: (x + 0.5) * p, y: (y + 0.5) * p };
}
function cellAt(scene, px, py) {
    const p = scene.pixelsPerCell;
    if (scene.layout !== 'hex') return { x: Math.floor(px / p), y: Math.floor(py / p) };
    const x = Math.round((px - p * 2 / 3) / p);
    return { x, y: Math.round(py / (p * 2 / ROOT3) - 0.5 - (x & 1) / 2) };
}
function build(scene) {
    const hex = scene.layout === 'hex', p = scene.pixelsPerCell;
    const cols = scene.image ? (hex ? Math.floor(scene.image.width / p - 1 / 3) : Math.ceil(scene.image.width / p)) : scene.cols;
    const rows = scene.image ? (hex ? Math.floor(scene.image.height / (p * 2 / ROOT3) - 0.5) : Math.ceil(scene.image.height / p)) : scene.rows;
    // A site may be placed by a point on the image (at: [px, py]) and lands on the cell under it.
    const sites = scene.sites.map(s => s.at ? { ...s, ...cellAt(scene, ...s.at) } : s);
    const blocked = new Set((scene.walls ?? []).map(q => q.join(',')));
    if (scene.bounds)
        for (let y = 0; y < rows; y++)
            for (let x = 0; x < cols; x++) {
                const c = cellPixel(scene, x, y);
                if (!insidePolygon(c.x, c.y, scene.bounds)) blocked.add(`${x},${y}`);
            }
    for (const s of sites) blocked.delete(`${s.x},${s.y}`);
    // The part of the grid that can be walked, used to frame the view.
    let x0 = cols, y0 = rows, x1 = -1, y1 = -1;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!blocked.has(`${x},${y}`)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const pad = blocked.size ? 2 : 0, open = { x: Math.max(0, x0 - pad), y: Math.max(0, y0 - pad), cols: Math.min(cols, x1 + pad + 1) - Math.max(0, x0 - pad), rows: Math.min(rows, y1 + pad + 1) - Math.max(0, y0 - pad) };
    return Object.freeze({ ...scene, cols, rows, blocked, open, sites: Object.freeze(sites.map(Object.freeze)) });
}
// Eden Valley on 200 m hexes over the referee's map. The image is 200 m to 32.26 px, so hex centres are that far
// apart: rows 32.26 px, columns 27.94 px. Sites are placed by their point on the image, from the referee's key.
const EDEN_VALLEY = build({
    id: 'eden-valley',
    rev: 2,
    name: 'Eden Valley',
    parent: 'eden-region',
    layout: 'hex',
    image: { src: 'maps/eden-valley.webp', width: 1337, height: 1176 },
    pixelsPerCell: 200 / 6.2 * ROOT3 / 2,
    cellMeters: 200,
    minutesPerCell: 6,
    scale: { cells: 5 * 2 / ROOT3, label: '1 km' },
    bounds: [[462, 136], [697, 112], [760, 178], [773, 241], [889, 340], [1109, 683], [1017, 790], [677, 901], [481, 568], [358, 385], [358, 301]],
    sites: [
        // The trading post is a placeholder on the old road north of the gate.
        { id: 'trading-post', at: [984, 694], name: 'Trading post', kind: 'town' },
        { id: 'apes', at: [573, 225], name: 'Ape Village', kind: 'exit', to: 'ape-village', arrive: 'gate', label: 'Enter the Ape Village' },
        { id: 'complex', at: [727, 187], name: 'Complex entrance', kind: 'place' },
        { id: 'rats', at: [576, 401], name: 'Rats', kind: 'place' },
        { id: 'bears', at: [771, 298], name: 'Bears', kind: 'place' },
        { id: 'badgers', at: [562, 523], name: 'Badgers', kind: 'place' },
        { id: 'reptiles', at: [866, 446], name: 'Reptiles', kind: 'place' },
        { id: 'cats', at: [625, 641], name: 'Cats', kind: 'place' },
        { id: 'rabbits', at: [958, 590], name: 'Rabbits', kind: 'place' },
        { id: 'dogs', at: [890, 745], name: 'Dogs', kind: 'place' },
        { id: 'north-bridge', at: [686, 379], name: 'Bridge', kind: 'place' },
        { id: 'south-bridge', at: [860, 826], name: 'Bridge', kind: 'place' },
        { id: 'gate', at: [990, 785], name: 'Valley gate', kind: 'exit', to: 'eden-region', arrive: 'eden-valley', label: 'Leave Eden Valley' },
    ],
    start: 'trading-post',
});

// Interiors are square maps at 3 m a square (the book's suggested scale for buildings). The Ape Village is the first:
// a placeholder layout inside a palisade, to be replaced when the referee's own plan is supplied.
const fill = (x0, y0, x1, y1) => { const out = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y]); return out; };
const ring = (x0, y0, x1, y1) => fill(x0, y0, x1, y1).filter(([x, y]) => x === x0 || x === x1 || y === y0 || y === y1);
const APE_VILLAGE = build({
    id: 'ape-village',
    rev: 1,
    name: 'Ape Village',
    parent: 'eden-valley',
    interior: true,
    cols: 28,
    rows: 20,
    cellMeters: 3,
    minutesPerCell: 0,
    scale: { cells: 2, label: '6 m' },
    walls: [...ring(0, 0, 27, 19), ...fill(11, 2, 16, 4), ...fill(3, 3, 5, 5), ...fill(3, 8, 5, 10), ...fill(3, 13, 5, 15), ...fill(22, 3, 24, 5), ...fill(22, 14, 24, 16), ...fill(8, 14, 10, 16), ...fill(25, 8, 26, 9)],
    sites: [
        { id: 'gate', x: 27, y: 11, name: 'Village gate', kind: 'exit', to: 'eden-valley', arrive: 'apes', label: 'Leave the Ape Village' },
        { id: 'lodge', x: 13, y: 5, name: 'Great lodge', kind: 'place' },
        { id: 'fire', x: 14, y: 10, name: 'Fire pit', kind: 'place' },
        { id: 'store', x: 11, y: 15, name: 'Storehouse', kind: 'place' },
        { id: 'watch', x: 25, y: 10, name: 'Watch platform', kind: 'place' },
    ],
    start: 'gate',
});

// The original 20 x 12 test grid, kept so saves and tests from before scenes still resolve.
const LEGACY = build({
    id: 'legacy',
    name: 'Eden Valley',
    parent: null,
    cols: 20,
    rows: 12,
    cellMeters: 3,
    minutesPerCell: 0,
    scale: { cells: 2, label: '6 m' },
    walls: [[7, 3], [7, 4], [7, 6], [7, 7], [13, 2], [13, 3], [13, 4], [13, 5], [16, 7], [17, 7], [18, 7]],
    sites: [
        { id: 'town', x: 2, y: 5, name: 'Eden Valley', kind: 'town' },
        { id: 'clearing', x: 10, y: 5, name: 'Forest clearing', kind: 'encounter' },
        { id: 'outpost', x: 17, y: 8, name: 'Ancient outpost', kind: 'ruin' },
    ],
    start: 'town',
});

// The country outside the valley comes from the campaign map (world.js) and is registered once that has loaded.
export const SCENES = { [EDEN_VALLEY.id]: EDEN_VALLEY, [APE_VILLAGE.id]: APE_VILLAGE, [LEGACY.id]: LEGACY };
export function registerScene(definition) { return SCENES[definition.id] = build(definition); }
export const hasScene = id => Object.hasOwn(SCENES, id);
export const FIRST_SCENE = EDEN_VALLEY.id;

export function getScene(id) {
    const scene = SCENES[id];
    if (!scene) throw Error('Unknown scene');
    return scene;
}
// An entry saved before scenes existed has no scene id and stands on the legacy grid.
export const sceneOf = entry => getScene(entry?.scene ?? 'legacy');
export const siteAt = entry => !hasScene(entry?.scene ?? 'legacy') ? null : sceneOf(entry).sites.find(s => s.x === entry.position?.x && s.y === entry.position?.y) ?? null;
// A scene that is not loaded on this page (the character list does not load the campaign map) still gets a name.
export const placeName = entry => !hasScene(entry?.scene ?? 'legacy') ? 'Beyond Eden Valley' : siteAt(entry)?.name ?? (sceneOf(entry).parent ? sceneOf(entry).name : 'Wilderness');
export function sitePosition(scene, siteId) {
    const site = scene.sites.find(s => s.id === siteId) ?? scene.sites.find(s => s.id === scene.start);
    return { x: site.x, y: site.y };
}
export const startOf = sceneId => ({ scene: sceneId, sceneRev: getScene(sceneId).rev ?? null, position: sitePosition(getScene(sceneId), getScene(sceneId).start) });
export const isBlocked = (scene, x, y) => x < 0 || y < 0 || x >= scene.cols || y >= scene.rows || scene.blocked.has(`${x},${y}`);
// The chain of scenes from the outermost down to this one.
export function ancestry(scene) {
    const chain = [scene];
    while (chain[0].parent && hasScene(chain[0].parent)) chain.unshift(getScene(chain[0].parent));
    return chain;
}
export const exitTo = (scene, targetId) => scene.sites.find(s => s.kind === 'exit' && s.to === targetId) ?? null;

const SQUARE = [[1, 0], [-1, 0], [0, 1], [0, -1]], HEX_EVEN = [[0, -1], [0, 1], [1, -1], [1, 0], [-1, -1], [-1, 0]], HEX_ODD = [[0, -1], [0, 1], [1, 0], [1, 1], [-1, 0], [-1, 1]];
export const stepsFrom = (scene, x) => scene.layout === 'hex' ? (x & 1 ? HEX_ODD : HEX_EVEN) : SQUARE;
// One step in a compass direction, for the movement keys. On hexes: n, s, ne, se, nw, sw, plus e and w, which keep to
// the row (the map's columns are staggered, so a sideways step alternates up and down). On squares: n, s, e, w.
export function stepToward(scene, from, direction) {
    const odd = from.x & 1, hex = scene.layout === 'hex';
    const d = hex ? { n: [0, -1], s: [0, 1], ne: [1, odd ? 0 : -1], se: [1, odd ? 1 : 0], nw: [-1, odd ? 0 : -1], sw: [-1, odd ? 1 : 0], e: [1, 0], w: [-1, 0] }[direction] : { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[direction];
    if (!d) return null;
    const to = { x: from.x + d[0], y: from.y + d[1] };
    return isBlocked(scene, to.x, to.y) ? null : to;
}
// Shortest path of steps to adjacent cells, or null when the destination cannot be reached.
export function scenePath(scene, start, end, cost = null) {
    if (!Number.isInteger(end.x) || !Number.isInteger(end.y) || isBlocked(scene, end.x, end.y)) return null;
    if (cost) return quickestPath(scene, start, end, cost);
    const queue = [[start, []]], seen = new Set([`${start.x},${start.y}`]);
    while (queue.length) {
        const [p, path] = queue.shift();
        if (p.x === end.x && p.y === end.y) return path;
        for (const [dx, dy] of stepsFrom(scene, p.x)) {
            const x = p.x + dx, y = p.y + dy, k = `${x},${y}`;
            if (seen.has(k) || isBlocked(scene, x, y)) continue;
            seen.add(k);
            queue.push([{ x, y }, [...path, { x, y }]]);
        }
    }
    return null;
}
// The way that takes least time when steps differ in cost (terrain, roads): cost(from, to) is the time of one step.
function quickestPath(scene, start, end, cost) {
    const key = p => `${p.x},${p.y}`, best = new Map([[key(start), 0]]), prev = new Map(), open = [start];
    while (open.length) {
        let i = 0;
        for (let j = 1; j < open.length; j++) if (best.get(key(open[j])) < best.get(key(open[i]))) i = j;
        const p = open.splice(i, 1)[0], at = best.get(key(p));
        if (p.x === end.x && p.y === end.y) { const path = []; for (let q = p; key(q) !== key(start); q = prev.get(key(q))) path.unshift(q); return path; }
        for (const [dx, dy] of stepsFrom(scene, p.x)) {
            const q = { x: p.x + dx, y: p.y + dy };
            if (isBlocked(scene, q.x, q.y)) continue;
            const t = at + cost(p, q);
            if (t < (best.get(key(q)) ?? Infinity)) { if (!best.has(key(q))) open.push(q); best.set(key(q), t); prev.set(key(q), p); }
        }
    }
    return null;
}

// Game time. Rest already counts whole days in entry.days; travel adds minutes. Day 1 begins at 06:00.
export const DAY_START = 360;
export function clockOf(entry) {
    const total = (entry?.days ?? 0) * 1440 + (entry?.minutes ?? DAY_START), minute = total % 1440, hour = Math.floor(minute / 60);
    const period = hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
    return { day: Math.floor(total / 1440) + 1, hour, minute: minute % 60, period, text: `Day ${Math.floor(total / 1440) + 1}, ${String(hour).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')} (${period})` };
}
export function addMinutes(entry, minutes) {
    const total = (entry.minutes ?? DAY_START) + minutes;
    return { ...entry, days: (entry.days ?? 0) + Math.floor(total / 1440), minutes: total % 1440 };
}
export function describeDistance(scene, cells) {
    const meters = cells * scene.cellMeters;
    return scene.cellMeters >= 1000 ? `${Math.round(meters / (KM_PER_MILE * 1000))} miles` : meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}
export function describeTime(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60), m = minutes % 60;
    return h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} h` : m ? `${h} h ${m} min` : `${h} h`;
}
