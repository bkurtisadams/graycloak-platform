// Scenes: every map the survivor can stand on. A scene is a background image (optional), a square grid laid over it,
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

function build(scene) {
    const cols = scene.image ? Math.ceil(scene.image.width / scene.pixelsPerCell) : scene.cols;
    const rows = scene.image ? Math.ceil(scene.image.height / scene.pixelsPerCell) : scene.rows;
    const blocked = new Set((scene.walls ?? []).map(p => p.join(',')));
    if (scene.bounds)
        for (let y = 0; y < rows; y++)
            for (let x = 0; x < cols; x++)
                if (!insidePolygon((x + 0.5) * scene.pixelsPerCell, (y + 0.5) * scene.pixelsPerCell, scene.bounds)) blocked.add(`${x},${y}`);
    for (const s of scene.sites) blocked.delete(`${s.x},${s.y}`);
    // The part of the grid that can be walked, used to frame the view.
    let x0 = cols, y0 = rows, x1 = -1, y1 = -1;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!blocked.has(`${x},${y}`)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const pad = blocked.size ? 2 : 0, open = { x: Math.max(0, x0 - pad), y: Math.max(0, y0 - pad), cols: Math.min(cols, x1 + pad + 1) - Math.max(0, x0 - pad), rows: Math.min(rows, y1 + pad + 1) - Math.max(0, y0 - pad) };
    return Object.freeze({ ...scene, cols, rows, blocked, open, sites: Object.freeze(scene.sites.map(Object.freeze)) });
}

// Eden Valley: the supplied map is 1337 x 1176 px and the valley is about three miles long, which makes one
// pixel about 6.2 m. The wall polygon follows the towers marked T. Lakes and the river are not yet barriers.
const EDEN_VALLEY = build({
    id: 'eden-valley',
    name: 'Eden Valley',
    parent: 'eden-region',
    image: { src: 'maps/eden-valley.webp', width: 1337, height: 1176 },
    pixelsPerCell: 200 / 6.2,
    cellMeters: 200,
    minutesPerCell: 6,
    scale: { cells: 5, label: '1 km' },
    bounds: [[462, 136], [697, 112], [760, 178], [773, 241], [889, 340], [1109, 683], [1017, 790], [677, 901], [481, 568], [358, 385], [358, 301]],
    sites: [
        { id: 'trading-post', x: 17, y: 12, name: 'Trading post', kind: 'town' },
        { id: 'gate', x: 30, y: 24, name: 'Valley gate', kind: 'exit', to: 'eden-region', arrive: 'eden-valley', label: 'Leave Eden Valley' },
    ],
    start: 'trading-post',
});

// The country around the valley, cropped from the GCC campaign map at its 3-mile hex scale (48 px per hex).
// A square travel grid of the same size is laid over it; terrain does not yet change the travel rate.
const EDEN_REGION = build({
    id: 'eden-region',
    name: 'Eden Valley region',
    parent: null,
    image: { src: 'maps/eden-region.webp', width: 1480, height: 1179 },
    pixelsPerCell: 48,
    cellMeters: 3 * KM_PER_MILE * 1000,
    minutesPerCell: 240,
    scale: { cells: 2, label: '6 miles' },
    sites: [
        { id: 'eden-valley', x: 13, y: 13, name: 'Eden Valley', kind: 'exit', to: 'eden-valley', arrive: 'gate', label: 'Enter Eden Valley' },
        { id: 'clearing', x: 16, y: 11, name: 'Forest clearing', kind: 'encounter' },
        { id: 'outpost', x: 18, y: 15, name: 'Ancient outpost', kind: 'ruin' },
    ],
    start: 'eden-valley',
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

export const SCENES = Object.freeze({ [EDEN_VALLEY.id]: EDEN_VALLEY, [EDEN_REGION.id]: EDEN_REGION, [LEGACY.id]: LEGACY });
export const FIRST_SCENE = EDEN_VALLEY.id;

export function getScene(id) {
    const scene = SCENES[id];
    if (!scene) throw Error('Unknown scene');
    return scene;
}
// An entry saved before scenes existed has no scene id and stands on the legacy grid.
export const sceneOf = entry => getScene(entry?.scene ?? 'legacy');
export const siteAt = entry => sceneOf(entry).sites.find(s => s.x === entry.position?.x && s.y === entry.position?.y) ?? null;
export const placeName = entry => siteAt(entry)?.name ?? (sceneOf(entry).parent ? sceneOf(entry).name : 'Wilderness');
export function sitePosition(scene, siteId) {
    const site = scene.sites.find(s => s.id === siteId) ?? scene.sites.find(s => s.id === scene.start);
    return { x: site.x, y: site.y };
}
export const startOf = sceneId => ({ scene: sceneId, position: sitePosition(getScene(sceneId), getScene(sceneId).start) });
export const isBlocked = (scene, x, y) => x < 0 || y < 0 || x >= scene.cols || y >= scene.rows || scene.blocked.has(`${x},${y}`);
// The chain of scenes from the outermost down to this one.
export function ancestry(scene) {
    const chain = [scene];
    while (chain[0].parent) chain.unshift(getScene(chain[0].parent));
    return chain;
}
export const exitTo = (scene, targetId) => scene.sites.find(s => s.kind === 'exit' && s.to === targetId) ?? null;

// Shortest path of orthogonal steps, or null when the destination cannot be reached.
export function scenePath(scene, start, end) {
    if (!Number.isInteger(end.x) || !Number.isInteger(end.y) || isBlocked(scene, end.x, end.y)) return null;
    const queue = [[start, []]], seen = new Set([`${start.x},${start.y}`]);
    while (queue.length) {
        const [p, path] = queue.shift();
        if (p.x === end.x && p.y === end.y) return path;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const x = p.x + dx, y = p.y + dy, k = `${x},${y}`;
            if (seen.has(k) || isBlocked(scene, x, y)) continue;
            seen.add(k);
            queue.push([{ x, y }, [...path, { x, y }]]);
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
