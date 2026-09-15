/** Book 2 (1977), pp.18,23,30–32.
 * Pure spatial helpers; ship-combat.js retains launch permissions, magazines,
 * phase order, computer checks, interception dice and missile damage.
 * REFEREE RULINGS, not printed specifications: missile acceleration/contact
 * radius; circular sand radius; steering toward current target by a capped
 * velocity correction; stationary enemy contact during alternating turns;
 * overlapping sand counts once, with -3 per COMPLETE half-inch of path.
 * No invented sand collision damage, sand-vs-missile destruction, fuel timer,
 * expanding cloud or automatic expiry. Cloud activation after its first move is
 * also a referee convention; the printed text speaks of sand contacting a target. Those require further referee rules.
 */
import { moveWithGravity } from './planetary-gravity.js';
/**
 * v0.54.0: Graycloak's standing figures for the three numbers Book 2 (1977)
 * never prints — a missile's acceleration, how close it must come to make
 * contact, and a sand cloud's radius. Not RAW; a referee may pass other figures
 * to launchOrdnance. One object serves both kinds, since validateOrdnanceRuling
 * reads only the fields its kind needs.
 */
export const VECTOR_ORDNANCE_DEFAULT_RULING = Object.freeze({
  maxG: 6,
  contactRadius: 0.5,
  radius: 0.5,
  note: 'Graycloak standing ruling (Book 2 prints none): homing missile 6 G, contact within 1/2 inch; sand cloud 1/2 inch radius',
  raw: false
});
const clone=v=>JSON.parse(JSON.stringify(v));
function finite(n,name,minimum=0){if(!Number.isFinite(n)||n<minimum)throw new Error(`${name} must be finite and at least ${minimum}`);return n;}
export function validateOrdnanceRuling(kind,ruling) {
  if(!ruling || !String(ruling.note??'').trim()) throw new Error('record the referee ordnance ruling');
  if(kind==='missile') return {maxG:finite(ruling.maxG,'missile G'),contactRadius:finite(ruling.contactRadius,'contact radius',0.000001),note:String(ruling.note)};
  if(kind==='sand') return {radius:finite(ruling.radius,'sand radius',0.000001),note:String(ruling.note)};
  throw new Error('unknown ordnance kind');
}
export function placeVectorOrdnance(round,shipState,ruling) {
  if(!shipState) throw new Error('launcher vector required');
  return {...round,position:clone(shipState.position),velocity:clone(shipState.velocity),
    ruling:validateOrdnanceRuling(round.kind,ruling),movedTurn:0,contactIsAutomatic:false,raw:false};
}
/** Earliest segment intersection with an explicitly specified contact circle. */
export function circleEntry(a,b,c,radius) {
  const dx=b.x-a.x,dy=b.y-a.y,ox=a.x-c.x,oy=a.y-c.y;
  const cc=ox*ox+oy*oy-radius*radius;
  if(cc<=0)return 0;
  const aa=dx*dx+dy*dy;if(!aa)return null;
  const bb=2*(ox*dx+oy*dy),disc=bb*bb-4*aa*cc;
  if(disc<0)return null;
  const t=(-bb-Math.sqrt(disc))/(2*aa);
  return t>=0&&t<=1?t:null;
}
export function previewVectorOrdnance(encounter,round) {
  const target=encounter.spatial.ships[round.targetShipId];
  const ruling=validateOrdnanceRuling(round.kind,round.ruling);
  let thrust={x:0,y:0};
  // Gravity sample is independent of thrust; compensate using same preview.
  const coast=moveWithGravity({position:round.position,velocity:round.velocity,
    planet:encounter.spatial.planet,accelerationMode:encounter.spatial.accelerationMode??'instantaneous'});
  if(!coast.resolved)return coast;
  if(round.kind==='missile'&&target){
    const factor=encounter.spatial.accelerationMode==='constant'?0.5:1;
    const correction={x:(target.position.x-coast.endpoint.x)/factor,y:(target.position.y-coast.endpoint.y)/factor};
    const magnitude=Math.hypot(correction.x,correction.y),cap=ruling.maxG*2;
    const fraction=magnitude?Math.min(1,cap/magnitude):0;
    thrust={x:correction.x*fraction,y:correction.y*fraction};
  }
  return moveWithGravity({position:round.position,velocity:round.velocity,thrust,
    planet:encounter.spatial.planet,accelerationMode:encounter.spatial.accelerationMode??'instantaneous'});
}
export function moveVectorOrdnance(encounter) {
  if(encounter.outcome!=='in-progress'||encounter.phaseIndex!==0||encounter.spatialMode!=='vector')throw new Error('vector ordnance requires active movement phase');
  const next=clone(encounter);
  for(const round of next.ordnance){
    if(!['in-flight','active','pending-effect'].includes(round.status)||round.launcherSide!==next.phasingSide||round.launchedGameTurn>=next.gameTurn||round.movedTurn===next.gameTurn)continue;
    const target=next.participants.find(p=>p.id===round.targetShipId);
    // Book 2 p.18: a missile "home[s] towards that target until either the
    // missile or the target is destroyed". Book 2 has no ship-destruction rule
    // at all, so escape is the only way a target stops existing.
    //
    // v1.217.00: this also read state.damage.destroyed, which is not a field on
    // the ship document — the damage block holds seven counters and the
    // disabled turrets — so it always read undefined. Removed rather than
    // left as a check that silently does nothing.
    if(round.kind==='missile'&&(!target||target.escaped)){round.status='spent';continue;}
    const move=previewVectorOrdnance(next,round);
    const planet=next.spatial.planet;
    // v0.55.0 (referee ruling, not RAW): ordnance that reaches the world is
    // gone. Book 2 says nothing about a missile or a cloud meeting a planet,
    // and refusing the move jammed the movement phase with no way to rule on a
    // round. A missile that reaches its target first still makes contact.
    if(!move.resolved){
      round.status='spent';round.movedTurn=next.gameTurn;
      next.log.push({kind:'ordnance-surface-impact',gameTurn:next.gameTurn,phasingSide:next.phasingSide,id:round.id,ordnanceKind:round.kind,position:clone(round.position),reason:move.reason??'course-midpoint-at-or-inside-surface',raw:false});
      continue;
    }
    const contact=round.kind==='missile'?circleEntry(round.position,move.endpoint,next.spatial.ships[target.id].position,round.ruling.contactRadius):null;
    const ground=planet?circleEntry(round.position,move.endpoint,planet.center,planet.radius):null;
    if(ground!==null&&(contact===null||ground<=contact)){
      const at={x:round.position.x+(move.endpoint.x-round.position.x)*ground,y:round.position.y+(move.endpoint.y-round.position.y)*ground};
      round.position=at;round.status='spent';round.movedTurn=next.gameTurn;
      next.log.push({kind:'ordnance-surface-impact',gameTurn:next.gameTurn,phasingSide:next.phasingSide,id:round.id,ordnanceKind:round.kind,position:clone(at),reason:'surface-contact',raw:false});
      continue;
    }
    const from=clone(round.position);
    round.velocity=move.velocity;round.position=move.endpoint;round.movedTurn=next.gameTurn;
    if(contact!==null){round.position={x:from.x+(move.endpoint.x-from.x)*contact,y:from.y+(move.endpoint.y-from.y)*contact};round.status='contact';round.contactedGameTurn=next.gameTurn;}
    else if(round.kind==='sand'&&round.status==='in-flight')round.status='pending-effect';
    next.log.push({kind:'vector-ordnance-move',gameTurn:next.gameTurn,phasingSide:next.phasingSide,id:round.id,from,endpoint:round.position,gravity:move.gravity,status:round.status});
  }
  return next;
}
/** Sand takes effect in phase D after its first friendly movement, not launch. */
export function activateVectorSand(encounter) {
  const next=clone(encounter);
  for(const r of next.ordnance)if(r.kind==='sand'&&r.status==='pending-effect'&&r.launcherSide===next.phasingSide){r.status='active';next.log.push({kind:'sand-active',gameTurn:next.gameTurn,id:r.id});}
  return next;
}
export function obscuringSand(encounter,from,to) {
  const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy),intervals=[];
  if(!length)return {length:0,dm:0};
  for(const r of encounter.ordnance.filter(r=>r.kind==='sand'&&r.status==='active')){
    const ox=from.x-r.position.x,oy=from.y-r.position.y;
    const projection=-(ox*dx+oy*dy)/(length*length);
    const perpendicular=ox*ox+oy*oy-(ox*dx+oy*dy)**2/(length*length);
    const squared=r.ruling.radius**2-perpendicular;if(squared<=0)continue;
    const half=Math.sqrt(squared)/length,a=Math.max(0,projection-half),b=Math.min(1,projection+half);
    if(b>a)intervals.push([a,b]);
  }
  intervals.sort((a,b)=>a[0]-b[0]);let covered=0,start=0,end=0;
  for(const [a,b]of intervals){if(a>end){covered+=end-start;start=a;end=b;}else end=Math.max(end,b);}
  covered+=end-start;const depth=covered*length;
  return {length:depth,dm:-(3*Math.floor((depth+1e-9)/0.5)) || 0};
}
