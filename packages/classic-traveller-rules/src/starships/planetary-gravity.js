/**
 * Traveller, Book 2: Starships (1977), pp.26–29 and optional rule p.37.
 * Standalone ES module: no DOM, dependencies, campaign state, or dice.
 * Import with: import { createPlanet, moveWithGravity } from './planetary-gravity.mjs';
 *
 * UNITS: position, radius and vectors in thousands of miles (tabletop inches).
 * Velocity is displacement per ten-minute turn. Thrust is a VECTOR increment,
 * already converted from G; gravity is converted here (default 2 units/G).
 *
 * RULES IMPLEMENTED (paraphrase):
 * - Construct a planet's concentric quarter-G bands from its radius and mass.
 * - Sample the midpoint of the original velocity/course vector, BEFORE thrust.
 * - Use that band’s strength, directed toward the planet's centre.
 * - Add gravity and thrust to velocity; retain this velocity next turn.
 * - Default instantaneous acceleration moves using the entire new velocity.
 * - Optional p.37 constant acceleration uses half the new acceleration for this
 *   turn's displacement, but retains its full effect in next turn's velocity.
 *
 * PRINTED AMBIGUITIES / EXPLICIT CONVENTIONS:
 * - p.29 says length equals G, then says 0.5 G produces 1 inch. Default 2 units/G
 *   follows that example and the existing game. Set unitsPerG:1 for the literal
 *   sentence reading. Caller must use the SAME scale when converting thrust.
 * - p.26 prints G=K*(R/4), M=G^3. We use those formulae literally, even for
 *   non-Earth density; we do not silently substitute modern physical formulae.
 *   Supply massEarth to use a published table's mass instead (e.g. Jupiter 318).
 * - Use exact formula radii rather than the rounded/inconsistent p.28 table.
 * - A band includes its outer circle; an exact boundary gets the stronger band.
 * - Only ONE planet is accepted. Overlapping wells need a referee convention.
 * - Surface contact is flagged for referee resolution; it does not automatically
 *   mean landing, atmospheric entry, destruction, or a new damage rule.
 *
 * INTEGRATION: In previewShipVector, replace its velocity/endpoint arithmetic
 * with moveWithGravity({position:s.position, velocity:s.velocity,
 * thrust:acceleration, planet}). Use the same calculation for preview and commit,
 * and save returned velocity. On computer failure pass zero thrust, NOT zero
 * gravity. Drive limits apply only to voluntary thrust. Persist/draw the planet
 * and its bands separately. This file does not modify or wire itself into the UI.
 *
 * EXAMPLE: Earth at origin, ship at (6,0) with velocity (0,0) and no thrust:
 * midpoint (6,0) is in the 0.25 G band; gravity=(-0.5,0), endpoint=(5.5,0).
 */
const point = (p, name) => {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y))
    throw new TypeError(`${name} must have finite x and y`);
  return { x: p.x, y: p.y };
};
const positive = (n, name) => {
  if (!Number.isFinite(n) || n <= 0) throw new RangeError(`${name} must be positive and finite`);
  return n;
};
const add = (a,b) => ({x:a.x+b.x,y:a.y+b.y});
const scale = (a,k) => ({x:a.x*k,y:a.y*k});

/** Build the p.26 template; pass massEarth for table-specified bodies. */
export function createPlanet({name='Planet', center={x:0,y:0}, diameter,
  densityEarth=1, massEarth} = {}) {
  const radius = positive(diameter,'diameter') / 2;
  const surfaceG = positive(densityEarth,'densityEarth') * radius / 4;
  const mass = positive(massEarth ?? surfaceG ** 3,'massEarth');
  const actualSurfaceG = massEarth === undefined ? surfaceG : 16 * mass / radius ** 2;
  // Safeguard against accidental huge inputs; this is not a Traveller rule.
  if (!Number.isFinite(actualSurfaceG) || actualSurfaceG > 1000)
    throw new RangeError('surface gravity exceeds template implementation limit (1000 G)');
  const bands=[];
  for(let quarter=1; quarter <= Math.ceil(actualSurfaceG*4); quarter++) {
    const g=quarter/4, outerRadius=4*Math.sqrt(mass/g);
    if(outerRadius > radius) bands.push(Object.freeze({g,outerRadius}));
  }
  return Object.freeze({name:String(name),center:Object.freeze(point(center,'center')),
    radius,massEarth:mass,surfaceG:actualSurfaceG,bands:Object.freeze(bands)});
}

/** Band at a point; interior/surface flagged separately, never extrapolated. */
export function gravityAt(location, planet) {
  const p=point(location,'location');
  if (!planet) return {g:0,atOrInsideSurface:false,distance:null};
  const c=point(planet.center,'planet.center');
  positive(planet.radius,'planet.radius');
  if(!Array.isArray(planet.bands)) throw new TypeError('use createPlanet to supply bands');
  const distance=Math.hypot(c.x-p.x,c.y-p.y);
  if(distance <= planet.radius) return {g:0,atOrInsideSurface:true,distance};
  let g=0;
  for(const band of planet.bands) {
    positive(band.g,'band.g'); positive(band.outerRadius,'band.outerRadius');
    if(distance <= band.outerRadius) g=Math.max(g,band.g);
  }
  return {g,atOrInsideSurface:false,distance};
}

/** Reports geometric surface contact only, leaving consequences to referee. */
function touchesSurface(start,end,planet) {
  if(!planet) return false;
  const d={x:end.x-start.x,y:end.y-start.y}, n=d.x*d.x+d.y*d.y;
  const t=n===0 ? 0 : Math.max(0,Math.min(1,
    ((planet.center.x-start.x)*d.x+(planet.center.y-start.y)*d.y)/n));
  return Math.hypot(start.x+t*d.x-planet.center.x,
    start.y+t*d.y-planet.center.y) <= planet.radius;
}

/** Pure preview/movement calculation. Inputs are never mutated. */
export function moveWithGravity({position,velocity,thrust={x:0,y:0},planet=null,
  unitsPerG=2,accelerationMode='instantaneous'} = {}) {
  const from=point(position,'position'), course=point(velocity,'velocity');
  const drive=point(thrust,'thrust'); positive(unitsPerG,'unitsPerG');
  if(!['instantaneous','constant'].includes(accelerationMode))
    throw new RangeError('accelerationMode must be instantaneous or constant');
  const midpoint=add(from,scale(course,0.5));
  point(midpoint,'course midpoint');
  const sample=gravityAt(midpoint,planet);
  // The printed external bands do not define motion inside a solid planet.
  if(sample.atOrInsideSurface)
    return {resolved:false,reason:'course-midpoint-at-or-inside-surface',from,midpoint,
      bandG:null,velocity:null,endpoint:null,requiresReferee:true};
  let gravity={x:0,y:0};
  if(sample.g > 0) gravity=scale({x:planet.center.x-midpoint.x,
    y:planet.center.y-midpoint.y},sample.g*unitsPerG/sample.distance);
  const acceleration=add(drive,gravity), nextVelocity=add(course,acceleration);
  const endpoint=add(from,add(course,scale(acceleration,
    accelerationMode==='constant' ? 0.5 : 1)));
  point(nextVelocity,'result velocity'); point(endpoint,'result endpoint');
  const surfaceContact=touchesSurface(from,endpoint,planet);
  return {resolved:true,from,midpoint,bandG:sample.g,gravity,thrust:drive,
    acceleration,velocity:nextVelocity,endpoint,surfaceContact,
    requiresReferee:surfaceContact,accelerationMode};
}

// ---------------------------------------------------------------------------
// Book 2 p.35, atmospheric braking. Added on port: it is the other thing the
// surface does to a vector, and touchesSurface already finds the closest
// approach.
//
// "Ships passing very close to the surface of a world with a standard or dense
// atmosphere may slow their speed through atmospheric braking. lf any portion
// of a ship's vector passes within 1/4 inch of a world's surface, that vector
// is reduced by 1/4 inch in length."
//
// The atmosphere is the world's business, not the ship's: Book 3's atmosphere
// digit 6 is standard and 8 is dense, so only those two brake. Passing the
// digit is the caller's job, since a planet template does not carry a UWP.
// ---------------------------------------------------------------------------

export const ATMOSPHERIC_BRAKING_BAND = 0.25;
export const BRAKING_ATMOSPHERES = Object.freeze([6, 8]);

export function atmosphereBrakes(atmosphere) {
  return BRAKING_ATMOSPHERES.includes(Number(atmosphere));
}

/** Closest approach of the segment from `start` to `end` to the planet's centre. */
export function closestApproach(start, end, planet) {
  const from = point(start, 'start');
  const to = point(end, 'end');
  const delta = { x: to.x - from.x, y: to.y - from.y };
  const lengthSquared = delta.x * delta.x + delta.y * delta.y;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
    ((planet.center.x - from.x) * delta.x + (planet.center.y - from.y) * delta.y) / lengthSquared));
  const nearest = { x: from.x + t * delta.x, y: from.y + t * delta.y };
  return { distance: Math.hypot(nearest.x - planet.center.x, nearest.y - planet.center.y), at: nearest, t };
}

/**
 * Applies p.35 braking to a completed movement. Returns the shortened vector
 * and endpoint, or the movement unchanged where it does not apply.
 *
 * The rule shortens the VECTOR, not the velocity, and says nothing about what
 * the velocity becomes next turn. Taken here as shortening both by the same
 * amount, since a vector that persists is the velocity — flagged rather than
 * assumed silently.
 */
export function applyAtmosphericBraking({ from, endpoint, velocity, planet, atmosphere } = {}) {
  const unchanged = { braked: false, endpoint, velocity, reason: null };
  if (!planet) return { ...unchanged, reason: 'no planet' };
  if (!atmosphereBrakes(atmosphere)) return { ...unchanged, reason: 'atmosphere does not brake' };
  const approach = closestApproach(from, endpoint, planet);
  if (approach.distance > planet.radius + ATMOSPHERIC_BRAKING_BAND) {
    return { ...unchanged, reason: 'no part of the vector passes within a quarter unit of the surface' };
  }
  const length = Math.hypot(endpoint.x - from.x, endpoint.y - from.y);
  if (length === 0) return { ...unchanged, reason: 'stationary' };
  const shortened = Math.max(0, length - ATMOSPHERIC_BRAKING_BAND);
  const factor = shortened / length;
  const speed = Math.hypot(velocity.x, velocity.y);
  const velocityFactor = speed === 0 ? 0 : Math.max(0, speed - ATMOSPHERIC_BRAKING_BAND) / speed;
  return {
    braked: true,
    reason: 'Book 2 p.35: vector shortened by a quarter unit',
    closestApproach: approach.distance,
    endpoint: { x: from.x + (endpoint.x - from.x) * factor, y: from.y + (endpoint.y - from.y) * factor },
    velocity: { x: velocity.x * velocityFactor, y: velocity.y * velocityFactor }
  };
}
