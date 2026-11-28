// gw-ancient-roads-build.mjs v0.1.0 — writes gw-ancient-roads.js
// Run from the repository root:   node gcc\gw-ancient-roads-build.mjs
//
// "Most roads, railroads, and other avenues of transportation have been destroyed. However, some portions of a vast
// highway system for air-cushioned vehicles (similar to our interstate system) remain, due to the incredibly tough
// duralloy metal from which it was constructed." (DESIGNING GAMMA WORLD, Roads, Highways, and Transportation)
//
// The routes below follow the old interstate corridors from city to city. Positions are in world-SVG units, the
// same as gwmap.png pixels, read by eye from the city marks on that map; points marked ~ are junctions with no city
// mark and are estimates. Each route is cut into stretches and each stretch is given a condition from a fixed seed,
// so most of the system is gone and some portions remain. Change SEED, the weights or a route and run again.
import { writeFileSync } from 'node:fs';

const SEED = 2322;
// Share of the system in each state. "Most ... destroyed": lost and buried together are over half.
const CONDITIONS = [['lost', 40], ['buried', 15], ['broken', 22], ['usable', 12], ['bridge-out', 6], ['blocked', 5]];
const C = {
  seattle: [246, 100], portland: [212, 240], spokane: [494, 148], boise: [706, 521], saltLake: [691, 668], sacramento: [247, 704],
  sanFrancisco: [165, 752], fresno: [198, 839], bakersfield: [267, 966], losAngeles: [212, 1014], sanDiego: [294, 1138], lasVegas: [462, 968],
  phoenix: [579, 1219], elPaso: [910, 1375], albuquerque: [945, 1119], pueblo: [1034, 926], denver: [1048, 802], billings: [925, 322],
  amarillo: [1194, 1184], lubbock: [1181, 1298], abilene: [1288, 1373], oklahomaCity: [1434, 1161], fortWorth: [1425, 1368], dallas: [1481, 1377],
  austin: [1412, 1553], sanAntonio: [1366, 1622], houston: [1548, 1500], kansasCity: [1618, 884], stLouis: [1848, 895], minneapolis: [1690, 450],
  chicago: [1940, 700], memphis: [1951, 1022], jackson: [1880, 1160], newOrleans: [1872, 1370], detroit: [2110, 575], toledo: [2082, 632],
  cleveland: [2335, 651], pittsburgh: [2346, 754], cincinnati: [2140, 850], atlanta: [2145, 1128], buffalo: [2405, 433], washington: [2538, 714],
  baltimore: [2593, 674], philadelphia: [2680, 635], newYork: [2735, 575], newHaven: [2771, 498], boston: [2820, 410],
  // ~ estimates: junctions and cities with no clear mark on the map (Houston above is also an estimate)
  reno: [330, 700], flagstaff: [600, 1090], butte: [800, 300], cheyenne: [1070, 655], rapidCity: [1190, 435], bismarck: [1318, 300], fargo: [1500, 330],
  siouxFalls: [1480, 470], omaha: [1545, 665], desMoines: [1700, 660], madison: [1850, 560], indianapolis: [2020, 830], columbus: [2230, 770],
  nashville: [2260, 935], knoxville: [2330, 1000], birmingham: [2073, 1255], mobile: [1990, 1370], jacksonville: [2420, 1300], savannah: [2490, 1250],
  florence: [2560, 1120], raleigh: [2600, 960], richmond: [2560, 888], albany: [2700, 440], greenRiver: [760, 800], pecos: [1050, 1400], tampa: [2260, 1437],
};
const ROUTES = [
  ['5', 'seattle portland sacramento fresno bakersfield losAngeles sanDiego'],
  ['10', 'losAngeles phoenix elPaso sanAntonio houston newOrleans mobile jacksonville'],
  ['15', 'sanDiego lasVegas saltLake butte'],
  ['20', 'pecos abilene fortWorth dallas jackson birmingham atlanta'],
  ['25', 'elPaso albuquerque pueblo denver cheyenne billings'],
  ['35', 'sanAntonio austin fortWorth oklahomaCity kansasCity desMoines minneapolis'],
  ['40', 'bakersfield flagstaff albuquerque amarillo oklahomaCity memphis nashville knoxville raleigh'],
  ['55', 'newOrleans jackson memphis stLouis chicago'],
  ['70', 'greenRiver denver kansasCity stLouis indianapolis columbus pittsburgh baltimore'],
  ['75', 'tampa atlanta knoxville cincinnati toledo detroit'],
  ['80', 'sanFrancisco sacramento reno saltLake cheyenne omaha desMoines chicago toledo cleveland newYork'],
  ['84', 'portland boise saltLake'],
  ['90', 'seattle spokane butte billings rapidCity siouxFalls madison chicago toledo cleveland buffalo albany boston'],
  ['94', 'billings bismarck fargo minneapolis madison chicago detroit'],
  ['95', 'jacksonville savannah florence richmond washington baltimore philadelphia newYork newHaven boston'],
  ['27', 'lubbock amarillo'],
];

// Small fixed-seed generator (mulberry32) so the same seed always gives the same roads.
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = s => [...s].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
const round = n => Math.round(n * 10) / 10;

// A line from city to city, sampled every third of a 30-mile hex, drifting a little to either side so it is not ruled.
function trace(points, random) {
  const out = [];
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i], len = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.round(len / 12));
    const nx = -(by - ay) / len, ny = (bx - ax) / len, sway = (random() - 0.5) * Math.min(18, len * 0.12), phase = random() * Math.PI;
    for (let k = i === 1 ? 0 : 1; k <= n; k++) {
      const t = k / n, off = Math.sin(Math.PI * t) * (sway + Math.sin(phase + t * Math.PI * 3) * 3);
      out.push([round(ax + (bx - ax) * t + nx * off), round(ay + (by - ay) * t + ny * off)]);
    }
  }
  return out;
}
function pick(random) { let r = random() * CONDITIONS.reduce((n, c) => n + c[1], 0); for (const [name, weight] of CONDITIONS) { if ((r -= weight) < 0) return name; } return 'lost'; }
const bbox = pts => ({ minX: Math.min(...pts.map(p => p[0])), minY: Math.min(...pts.map(p => p[1])), maxX: Math.max(...pts.map(p => p[0])), maxY: Math.max(...pts.map(p => p[1])) });

const strokes = [];
for (const [number, cities] of ROUTES) {
  const random = rng(SEED ^ hash(number)), line = trace(cities.split(' ').map(c => { if (!C[c]) throw Error(`Unknown point ${c}`); return C[c]; }), random);
  // Stretches of four to eight samples: roughly 50 to 100 miles of road sharing one fate.
  for (let at = 0, part = 1; at < line.length - 1; part++) {
    const take = Math.min(line.length - 1 - at, 4 + Math.floor(random() * 5)), pts = line.slice(at, at + take + 1), condition = pick(random);
    strokes.push({ id: `ar-${number}-${String(part).padStart(2, '0')}`, kind: 'ancient-road', condition, pts, bbox: bbox(pts), route: number, name: `Ancient Highway ${number}`, source: 'ancient-roads', ...(condition === 'lost' ? { hidden: true } : {}) });
    at += take;
  }
}
const tally = {};
let total = 0;
for (const s of strokes) { let len = 0; for (let i = 1; i < s.pts.length; i++) len += Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]); tally[s.condition] = (tally[s.condition] ?? 0) + len; total += len; }
const share = Object.fromEntries(Object.entries(tally).map(([k, v]) => [k, Math.round(100 * v / total) + '%']));
const body = `// gw-ancient-roads.js — generated by gw-ancient-roads-build.mjs v0.1.0 (seed ${SEED}). Do not edit by hand: change the
// builder and run it again. A read-only layer of ancient-road lines shown beside the authored map; it is not part of
// gw-authored.js and is not written by the map's bake. ${strokes.length} stretches on ${ROUTES.length} routes; share by length: ${JSON.stringify(share)}.
window.GW_ANCIENT_ROADS = ${JSON.stringify({ version: '0.1.0', seed: SEED, strokes })};
`;
writeFileSync(new URL('./gw-ancient-roads.js', import.meta.url), body);
console.log(`${strokes.length} stretches, ${Math.round(total / 34.64 * 30)} miles`, share);
