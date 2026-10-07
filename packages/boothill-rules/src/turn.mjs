/**
 * BOOT HILL 2e · the tactical turn (basic game)
 * A. Movement: everyone rolls d100; lowest moves first, highest last.
 * B. Firing: shooters declare targets and shots; highest net speed fires first,
 *    equal net speeds fire simultaneously (their hits land together, so none
 *    of them stops another's shot). A shooter hit before firing has net speed
 *    recomputed for the new wound band and may drop in the order; killed or
 *    unconscious shooters lose their shots.
 * C. Brawls: two rounds (brawl.mjs).
 *
 * Pure: takes a snapshot of the fighters, returns events and the new snapshot.
 * The host applies the resulting wounds and rounds spent to its documents.
 */
import { makeChecker, isMain } from "./selftest.mjs";
import { d100, forceRolls, mulberry32 } from "./dice.mjs";
import { netSpeed } from "./first-shot.mjs";
import { hitChance } from "./hit.mjs";
import { weaponProfile, rangeBand } from "./weapons.mjs";
import { rollWound, coverStopsHit, condition, gunArmPenalty } from "./wounds.mjs";

/** Movement order: d100 each, lowest first. Equal rolls move together (ERRATA 14). */
export function movementOrder(ids, rng = Math.random) {
  const rolls = ids.map((id) => ({ id, roll: d100(rng) }));
  rolls.sort((a, b) => a.roll - b.roll);
  const groups = [];
  for (const r of rolls) {
    const last = groups[groups.length - 1];
    if (last && last.roll === r.roll) last.ids.push(r.id);
    else groups.push({ roll: r.roll, ids: [r.id] });
  }
  return { rolls, groups };
}

const stateOf = (f) => condition({ strengthScore: f.strengthScore, wounds: f.wounds, brawlDamage: f.brawlDamage ?? 0 });
const able = (f) => { const c = stateOf(f); return !c.dead && !c.unconscious; };

/**
 * fighters: { [id]: { strengthScore, wounds, brawlDamage, handedness,
 *   firstShotBase, hitBase: { firearms, thrown }, shooter: {surprise, movement,
 *   drawsTwoGuns, hipshoots, sameTarget, shooterMovement, atRest, wrongHand,
 *   twoPistols, hipshooting}, severityModifier (−20 for animals) } }
 *   firstShotBase is for the weapon declared this turn.
 * declarations: [{ shooterId, weaponKey, loaded, shots: [{ targetId, distance,
 *   targetMovement, obscured, exposed }] }]  — at most 3 shots, capped by rate
 *   of fire and rounds loaded.
 */
export function validateDeclaration(d) {
  const p = weaponProfile(d.weaponKey);
  if (!p) return { ok: false, reason: "unknown-weapon" };
  if (!d.shots?.length) return { ok: false, reason: "no-shots" };
  if (d.shots.length > 3) return { ok: false, reason: "more-than-three" };
  if (d.shots.length > p.rateOfFire) return { ok: false, reason: "rate-of-fire" };
  if (p.capacity != null && d.shots.length > (d.loaded ?? 0)) return { ok: false, reason: "not-loaded" };
  const targets = new Set(d.shots.map((s) => s.targetId));
  if (targets.size > 3) return { ok: false, reason: "more-than-three-targets" };
  for (const s of d.shots) if (!rangeBand(d.weaponKey, s.distance)) return { ok: false, reason: "out-of-range", targetId: s.targetId };
  return { ok: true };
}

function speedFor(f) {
  return netSpeed(f.firstShotBase, { ...f.shooter, wounds: stateOf(f).band });
}

/**
 * The shooters still to fire, in order: { id, netSpeed, speedParts, able }.
 * done = ids that have already fired or lost their shots this turn.
 */
export function firingQueue(fighters, declarations, done = []) {
  return declarations
    .filter((d) => !done.includes(d.shooterId))
    .map((d) => {
      const f = fighters[d.shooterId];
      const ns = speedFor(f);
      return { id: d.shooterId, netSpeed: ns.total, speedParts: ns.parts, able: able(f) };
    })
    .sort((a, b) => b.netSpeed - a.netSpeed);
}

/**
 * Fire the next group: shooters who can no longer fire lose their shots, then
 * everyone tied at the highest net speed fires; their hits land together.
 * Returns { fighters, events, fired (ids now done), spent, finished }.
 */
export function fireNextGroup(input, declarations, done = [], rng = Math.random) {
  const fighters = JSON.parse(JSON.stringify(input));
  const events = [];
  const spent = {};
  const fired = [];
  for (const d of declarations) {
    if (done.includes(d.shooterId)) continue;
    const v = validateDeclaration(d);
    if (!v.ok) throw new Error(`fireNextGroup: ${d.shooterId} ${v.reason}`);
  }
  const queue = firingQueue(fighters, declarations, done);
  for (const q of queue.filter((x) => !x.able)) {
    events.push({ type: "lostShots", shooterId: q.id, reason: stateOf(fighters[q.id]).dead ? "dead" : "unconscious" });
    fired.push(q.id);
  }
  const live = queue.filter((x) => x.able);
  if (!live.length) return { fighters, events, fired, spent, finished: true };
  const top = live[0].netSpeed;
  const group = live.filter((s) => s.netSpeed === top);
  events.push({ type: "group", netSpeed: top, ids: group.map((g) => g.id), simultaneous: group.length > 1 });
  const declOf = Object.fromEntries(declarations.map((d) => [d.shooterId, d]));

  const landed = [];
  for (const { id, netSpeed: ns, speedParts } of group) {
    const d = declOf[id];
    const f = fighters[id];
    const p = weaponProfile(d.weaponKey);
    const band = stateOf(f).band;
    const gunArm = gunArmPenalty(f.wounds, f.handedness);
    const base = p.thrown ? f.hitBase.thrown : f.hitBase.firearms;
    d.shots.forEach((s, i) => {
      const c = hitChance(base, {
        range: rangeBand(d.weaponKey, s.distance),
        shooterMovement: f.shooter?.shooterMovement,
        targetMovement: s.targetMovement,
        wounds: band,
        atRest: f.shooter?.atRest,
        shotNumber: i + 1,
        spread: p.spread,
        wrongHand: f.shooter?.wrongHand,
        gunArm,
        twoPistols: f.shooter?.twoPistols,
        hipshooting: f.shooter?.hipshooting,
        obscured: s.obscured
      });
      const roll = d100(rng);
      const ev = { type: "shot", shooterId: id, targetId: s.targetId, shotNumber: i + 1, netSpeed: ns, speedParts, chance: c.chance, parts: c.parts, roll, hit: roll <= c.chance };
      if (ev.hit && p.spread) {
        ev.spreadPending = true;
      } else if (ev.hit) {
        const w = rollWound({ rng, severityModifier: fighters[s.targetId].severityModifier ?? 0 });
        ev.wound = w;
        if (coverStopsHit(w.location, s.exposed)) { ev.hit = false; ev.cover = true; }
        else landed.push({ targetId: s.targetId, wound: w, ev });
      }
      events.push(ev);
    });
    spent[id] = d.shots.length;
    fired.push(id);
  }
  for (const { targetId, wound, ev } of landed) {
    fighters[targetId].wounds.push({ location: wound.location, severity: wound.severity, points: wound.points ?? 0, healed: 0, note: "" });
    ev.woundIndex = fighters[targetId].wounds.length - 1;
  }
  for (const id of new Set(landed.map((l) => l.targetId))) {
    const c = stateOf(fighters[id]);
    events.push({ type: "condition", id, band: c.band, dead: c.dead, unconscious: c.unconscious, needsSurvivalRuling: c.needsSurvivalRuling, currentStrength: c.currentStrength });
  }
  const finished = firingQueue(fighters, declarations, [...done, ...fired]).length === 0;
  return { fighters, events, fired, spent, finished };
}

/** The whole firing phase at once (fireNextGroup until done). */
export function resolveFiring(input, declarations, rng = Math.random) {
  let fighters = input;
  const events = [];
  const spent = {};
  let done = [];
  for (;;) {
    const r = fireNextGroup(fighters, declarations, done, rng);
    fighters = r.fighters;
    events.push(...r.events);
    Object.assign(spent, r.spent);
    done = [...done, ...r.fired];
    if (r.finished || !r.fired.length) break;
  }
  if (fighters === input) fighters = JSON.parse(JSON.stringify(input));
  return { fighters, events, spent };
}

export function runSelfTests() {
  const { ok, eq, count } = makeChecker();

  const mo = movementOrder(["a", "b", "c"], forceRolls([0.9, 0.05, 0.1, 0.05, 0.5, 0.05]));
  eq(mo.groups.map((g) => g.ids.join("+")).join(","), "b,c,a", "lowest moves first");

  const kid = (over = {}) => ({ strengthScore: 16, wounds: [], handedness: "right", firstShotBase: 18, hitBase: { firearms: 48, thrown: 48 }, shooter: {}, ...over });
  const v = (d) => validateDeclaration(d).reason ?? "ok";
  eq(v({ weaponKey: "DAR6", loaded: 6, shots: [{ targetId: "x", distance: 5 }] }), "ok", "valid");
  eq(v({ weaponKey: "LBR", loaded: 6, shots: [{ targetId: "x", distance: 5 }, { targetId: "x", distance: 5 }] }), "rate-of-fire", "long barrel ROF 1");
  eq(v({ weaponKey: "DAR6", loaded: 1, shots: [{ targetId: "x", distance: 5 }, { targetId: "x", distance: 5 }] }), "not-loaded", "one round loaded");
  eq(v({ weaponKey: "DAR6", loaded: 6, shots: [{ targetId: "x", distance: 41 }] }), "out-of-range", "past extreme");
  eq(v({ weaponKey: "knife", shots: [{ targetId: "x", distance: 2 }] }), "ok", "thrown knife needs no load");

  // Faster shooter drops slower one before he fires.
  {
    const fighters = { fast: kid({ firstShotBase: 25 }), slow: kid({ firstShotBase: 10, strengthScore: 9 }) };
    const decl = [
      { shooterId: "slow", weaponKey: "DAR6", loaded: 6, shots: [{ targetId: "fast", distance: 5 }] },
      { shooterId: "fast", weaponKey: "DAR6", loaded: 6, shots: [{ targetId: "slow", distance: 5 }] }
    ];
    // fast: hit roll 01; wound location 75 chest, severity 25 serious (−7). Still standing at 2.
    // slow: wound band now ≥50% → −20 net speed, fires with −20 to hit.
    const r = resolveFiring(fighters, decl, forceRolls([0, 0.15, 0.7, 0.55, 0.2, 0.55, 0.9, 0.95]));
    const shots = r.events.filter((e) => e.type === "shot");
    eq(shots[0].shooterId, "fast", "fast fires first");
    ok(shots[0].hit && shots[0].wound.severity === "serious", "fast hits chest, serious");
    eq(r.fighters.slow.wounds.length, 1, "wound applied");
    eq(shots[1].netSpeed, -10, "slow recomputed: 10 - 20");
    ok(shots[1].parts.some((p) => p.key === "wounds" && p.value === -20), "slow shoots at -20");
    eq(r.fighters.fast.wounds.length, 0, "input untouched by miss");
    eq(fighters.slow.wounds.length, 0, "input snapshot untouched");
  }

  // Simultaneous: both fire even if both would be dropped.
  {
    const fighters = { a: kid({ strengthScore: 8 }), b: kid({ strengthScore: 8 }) };
    const decl = [
      { shooterId: "a", weaponKey: "DAR6", loaded: 6, shots: [{ targetId: "b", distance: 5 }] },
      { shooterId: "b", weaponKey: "DAR6", loaded: 6, shots: [{ targetId: "a", distance: 5 }] }
    ];
    const r = resolveFiring(fighters, decl, forceRolls([0, 0.15, 0.95, 0.15, 0.95, 0.95, 0, 0.15, 0.95, 0.15, 0.95, 0.95]));
    const g = r.events.find((e) => e.type === "group");
    ok(g.simultaneous && g.ids.length === 2, "equal net speeds fire together");
    eq(r.events.filter((e) => e.type === "shot").length, 2, "both shots taken");
    ok(r.events.filter((e) => e.type === "condition").every((e) => e.dead), "both head shots fatal");
  }

  // Killed before firing loses the shots.
  {
    const fighters = { fast: kid({ firstShotBase: 25 }), slow: kid({ firstShotBase: 10 }) };
    const decl = [
      { shooterId: "fast", weaponKey: "DAR6", loaded: 6, shots: [{ targetId: "slow", distance: 5 }] },
      { shooterId: "slow", weaponKey: "DAR6", loaded: 6, shots: [{ targetId: "fast", distance: 5 }] }
    ];
    const r = resolveFiring(fighters, decl, forceRolls([0, 0.15, 0.95, 0.15, 0.95, 0.95]));
    ok(r.events.some((e) => e.type === "lostShots" && e.shooterId === "slow" && e.reason === "dead"), "dead shooter loses shots");
    eq(r.spent.slow, undefined, "no rounds spent");
    eq(r.spent.fast, 1, "one round spent");
  }

  // Cover turns a chest hit into a miss.
  {
    const fighters = { a: kid({ firstShotBase: 25 }), b: kid({}) };
    const decl = [{ shooterId: "a", weaponKey: "DAR6", loaded: 6, shots: [{ targetId: "b", distance: 5, exposed: ["head", "rightArm", "rightShoulder"] }] }];
    const r = resolveFiring(fighters, decl, forceRolls([0, 0.15, 0.75, 0.15, 0.2, 0.15]));
    const s = r.events.find((e) => e.type === "shot");
    ok(!s.hit && s.cover && s.wound.location === "chest", "chest behind wall is a miss");
    eq(r.fighters.b.wounds.length, 0, "no wound");
  }

  // Second and third shots take -10 and -20; shotgun hits wait on the effects table.
  {
    const fighters = { a: kid({ firstShotBase: 25 }), b: kid({ strengthScore: 40 }) };
    const decl = [{ shooterId: "a", weaponKey: "DAR6", loaded: 6, shots: [1, 2, 3].map(() => ({ targetId: "b", distance: 5 })) }];
    const r = resolveFiring(fighters, decl, mulberry32(3));
    const shots = r.events.filter((e) => e.type === "shot");
    ok(shots[0].chance - shots[1].chance === 10 && shots[0].chance - shots[2].chance === 20, "shot 2 -10, shot 3 -20");
    const sg = resolveFiring({ a: kid({ firstShotBase: 25 }), b: kid({}) }, [{ shooterId: "a", weaponKey: "2SG", loaded: 2, shots: [{ targetId: "b", distance: 3 }] }], forceRolls([0, 0.15]));
    const s = sg.events.find((e) => e.type === "shot");
    ok(s.hit && s.spreadPending && !s.wound, "shotgun hit pending effects table");
    ok(s.parts.some((p) => p.key === "spread" && p.value === 10), "shotgun +10");
  }

  // Step by step: the queue shrinks one group at a time.
  {
    const fighters = { a: kid({ firstShotBase: 25 }), b: kid({ firstShotBase: 10, strengthScore: 40 }), c: kid({ firstShotBase: 10, strengthScore: 40 }) };
    const decl = ["a", "b", "c"].map((id) => ({ shooterId: id, weaponKey: "DAR6", loaded: 6, shots: [{ targetId: id === "a" ? "b" : "a", distance: 5 }] }));
    eq(firingQueue(fighters, decl).map((q) => q.id).join(), "a,b,c", "queue by net speed");
    const r1 = fireNextGroup(fighters, decl, [], mulberry32(5));
    ok(r1.fired.join() === "a" && !r1.finished, "first group is a alone");
    const r2 = fireNextGroup(r1.fighters, decl, r1.fired, mulberry32(6));
    ok(r2.fired.length === 2 && r2.finished, "b and c fire together, then done");
  }

  // A horse takes −20 on the severity roll: head 60 is serious, not mortal.
  {
    const r = fireNextGroup({ a: kid({ firstShotBase: 25 }), h: kid({ strengthScore: 30, severityModifier: -20 }) },
      [{ shooterId: "a", weaponKey: "DAR6", loaded: 6, shots: [{ targetId: "h", distance: 5 }] }], [], forceRolls([0, 0.15, 0.9, 0.15, 0.6, 0.05]));
    const s = r.events.find((e) => e.type === "shot");
    ok(s.wound.location === "head" && s.wound.severityRoll === 60 && s.wound.severity === "serious", "horse head 60 serious");
  }

  console.log(`turn.mjs — all self-tests passed (${count()} assertions).`);
}

if (isMain(import.meta.url)) runSelfTests();
