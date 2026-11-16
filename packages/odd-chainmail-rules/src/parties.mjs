/**
 * OD&D — Chainmail engine · parties
 *
 * A party is whoever travels together: one character or many, of one player
 * or several. It forms, splits and joins others at any time (Kurt, Nov 2026:
 * the Fellowship, one company until Moria, several after). Each character
 * carries `party`, the id of his party's leader (none: he walks alone), and
 * `dayMoved`, the movement factors he has spent today. A party shares a hex;
 * the leader's player walks it, and any player takes his own out of it.
 *
 * Everything here is read off the characters, so a death, or a member left
 * behind, never leaves a broken party: the living in one hex under one
 * leader's id are the party, and if the leader is gone the eldest leads.
 */

export const partyIdOf = (ch) => ch.party ?? ch.id;
export const travels = (ch) => ch.status === "ready" && ch.doing !== "dead";
const eldest = (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0) || String(a.id).localeCompare(String(b.id));

/** The parties among these characters: [{ id, leader, hex, members }], id the leader's, hex the key hexKeyOf gives. */
export function partiesOf(chars, hexKeyOf) {
  const groups = new Map();
  for (const ch of chars) {
    if (!travels(ch)) continue;
    const hex = hexKeyOf(ch), k = `${partyIdOf(ch)}|${hex}`;
    if (!groups.has(k)) groups.set(k, { hex, members: [] });
    groups.get(k).members.push(ch);
  }
  const out = [];
  for (const [k, g] of groups) {
    const pid = k.slice(0, k.lastIndexOf("|"));
    g.members.sort(eldest);
    const leader = g.members.find((m) => m.id === pid) ?? g.members[0];
    out.push({ id: leader.id, leader, hex: g.hex, members: [leader, ...g.members.filter((m) => m !== leader)] });
  }
  return out;
}
export function partyOf(chars, id, hexKeyOf) {
  return partiesOf(chars, hexKeyOf).find((p) => p.members.some((m) => m.id === id)) ?? null;
}
/** Factors the party has spent today: it moves at its most-travelled member. */
export const daySpent = (party) => Math.max(0, ...party.members.map((m) => m.dayMoved ?? 0));
/** Who walks a party: the referee, the leader's player, or one player who owns every member. */
export function mayWalk(party, uid, { referee = false, owns }) {
  return referee || owns(party.leader, uid) || party.members.every((m) => owns(m, uid));
}

const fail = (error) => ({ ok: false, error });
/**
 * These characters leave whatever parties they are in and travel together: into the party of `withId`, or,
 * with none named, as a new party led by the first. Returns { ok, party, set: { characterId: partyId } }, set
 * holding every character whose `party` changes (the ones left behind get a new leader if theirs went).
 */
export function regroup(chars, ids, withId, hexKeyOf) {
  const byId = new Map(chars.map((c) => [c.id, c])), movers = [...new Set(ids)].map((id) => byId.get(id));
  if (!movers.length || movers.some((m) => !m || !travels(m))) return fail("which characters?");
  const hex = hexKeyOf(movers[0]);
  if (movers.some((m) => hexKeyOf(m) !== hex)) return fail("they are not in one hex");
  const before = partiesOf(chars, hexKeyOf), moving = new Set(movers.map((m) => m.id));
  let pid = movers[0].id;
  if (withId != null) {
    const target = before.find((p) => p.members.some((m) => m.id === withId));
    if (!target) return fail("no such party");
    if (target.hex !== hex) return fail("that party is in another hex");
    if (movers.every((m) => target.members.some((x) => x.id === m.id))) return fail("already travelling together");
    pid = target.id;
    if (moving.has(pid)) pid = target.members.find((m) => !moving.has(m.id))?.id ?? movers[0].id;
  }
  const set = {};
  const put = (ch, id) => { if (partyIdOf(ch) !== id) set[ch.id] = id; };
  for (const m of movers) put(m, pid);
  for (const p of before) {
    if (withId != null && p.id === pid) continue;
    const stay = p.members.filter((m) => !moving.has(m.id));
    if (!stay.length || stay.length === p.members.length) continue;
    const lead = stay.find((m) => m.id === p.id) ?? stay[0];
    for (const m of stay) put(m, lead.id);
  }
  if (withId != null) for (const m of before.find((p) => p.id === pid)?.members ?? []) if (!moving.has(m.id)) put(m, pid);
  return { ok: true, party: pid, set };
}
/** Hand the lead to a member: { ok, party, set }. */
export function lead(chars, id, hexKeyOf) {
  const p = partyOf(chars, id, hexKeyOf);
  if (!p) return fail("which character?");
  const set = {};
  for (const m of p.members) if (partyIdOf(m) !== id) set[m.id] = id;
  return { ok: true, party: id, set };
}

function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const hk = (c) => c.hex ?? "0,0";
  const mk = (id, extra = {}) => ({ id, status: "ready", doing: "road", createdAt: Number(id.slice(1)), ...extra });
  const apply = (chars, set) => chars.map((c) => (set[c.id] ? { ...c, party: set[c.id] } : c));
  const names = (p) => p.members.map((m) => m.id).join("");
  let cs = ["c1", "c2", "c3", "c4", "c5"].map((id) => mk(id));
  ok(partiesOf(cs, hk).length === 5 && partiesOf(cs, hk).every((p) => p.members.length === 1), "everyone starts as a party of one");
  let r = regroup(cs, ["c1", "c2", "c3", "c4", "c5"], null, hk); cs = apply(cs, r.set);
  ok(r.ok && r.party === "c1" && partiesOf(cs, hk).length === 1 && names(partiesOf(cs, hk)[0]) === "c1c2c3c4c5", "the company forms under the first named");
  r = regroup(cs, ["c4", "c5"], null, hk); cs = apply(cs, r.set);
  ok(r.ok && partiesOf(cs, hk).length === 2 && names(partyOf(cs, "c4", hk)) === "c4c5" && names(partyOf(cs, "c1", hk)) === "c1c2c3", "two break away; the rest keep their leader");
  r = regroup(cs, ["c1"], null, hk); cs = apply(cs, r.set);
  ok(r.ok && names(partyOf(cs, "c1", hk)) === "c1" && partyOf(cs, "c2", hk).id === "c2" && names(partyOf(cs, "c2", hk)) === "c2c3", "the leader goes alone; the eldest left behind leads");
  r = regroup(cs, ["c1"], "c5", hk); cs = apply(cs, r.set);
  ok(r.ok && r.party === "c4" && names(partyOf(cs, "c1", hk)) === "c4c1c5", "one joins another party under its leader");
  ok(!regroup(cs, ["c1"], "c4", hk).ok, "already together is refused");
  r = regroup(cs, ["c2", "c3"], "c4", hk); cs = apply(cs, r.set);
  ok(r.ok && partiesOf(cs, hk).length === 1 && partiesOf(cs, hk)[0].id === "c4", "two parties become one");
  r = lead(cs, "c3", hk); cs = apply(cs, r.set);
  ok(r.ok && partiesOf(cs, hk)[0].id === "c3" && partiesOf(cs, hk)[0].members[0].id === "c3", "the lead is handed on");
  r = regroup(cs, ["c3", "c1"], null, hk); cs = apply(cs, r.set);
  ok(r.ok && names(partyOf(cs, "c3", hk)) === "c3c1" && names(partyOf(cs, "c2", hk)) === "c2c4c5", "the leader leaves with one; the others regroup under the eldest");
  r = regroup(cs, ["c3"], null, hk); cs = apply(cs, r.set);
  ok(names(partyOf(cs, "c3", hk)) === "c3" && names(partyOf(cs, "c1", hk)) === "c1", "a leader who walks off does not take back those he left");
  cs = ["c1", "c2", "c3"].map((id) => mk(id, { party: "c1" }));
  cs[0].doing = "dead";
  ok(partiesOf(cs, hk).length === 1 && partiesOf(cs, hk)[0].id === "c2" && names(partiesOf(cs, hk)[0]) === "c2c3", "the leader dies: the party goes on under the eldest");
  cs = ["c1", "c2", "c3"].map((id) => mk(id, { party: "c1" })); cs[2].hex = "1,0";
  ok(partiesOf(cs, hk).length === 2 && partyOf(cs, "c3", hk).id === "c3", "a member in another hex is his own party");
  ok(!regroup(cs, ["c1", "c3"], null, hk).ok && !regroup(cs, ["c3"], "c1", hk).ok && !regroup(cs, ["zz"], null, hk).ok, "parties form in one hex, of real characters");
  cs = [mk("c1", { party: "c1", dayMoved: 2 }), mk("c2", { party: "c1", dayMoved: 3 }), mk("c3", { party: "c1" })];
  ok(daySpent(partiesOf(cs, hk)[0]) === 3, "a party has spent what its most-travelled member has");
  const owns = (ch, uid) => ch.owner === uid;
  const p = { leader: { owner: "bob" }, members: [{ owner: "bob" }, { owner: "ann" }] };
  ok(mayWalk(p, "bob", { owns }) && !mayWalk(p, "ann", { owns }) && mayWalk(p, "ann", { referee: true, owns }), "the leader's player walks the party; so does the referee");
  ok(mayWalk({ leader: { owner: null }, members: [{ owner: "ann" }, { owner: "ann" }] }, "ann", { owns }) === true, "a player who owns them all walks them");
  console.log(`parties: all self-tests passed (${pass})`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}
