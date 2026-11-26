// odd/functions/world-service.mjs — pass 7 (Oct 2026): the map. oddWorld.
//
// Book III's wilderness, the home village, and the players' blank hex sheet.
// oddCampaigns/{cid}/world/map     the referee's map: hexes keyed "q,r" (seeded from the Westmark key); the referee reads it
// oddCampaigns/{cid}/world/known   the players' map: what they have seen or heard, keyed "q,r" (rumoured: true until walked)
// oddCampaigns/{cid}/world/rumours the referee's per-settlement rumour lists {place: [{text, truth, reveals?, told?}]}
// A character carries hex {q,r}, where (a place name, or the terrain), doing (town | road | rest | encounter | dead),
// day (his own clock, Book III's per-player time record), daysWalked, and encounter {type, kind, terrain} while one waits on the referee.
// Pass 17 (Nov 2026), parties (Kurt: the Fellowship, one company that splits and joins at any time): a character also
// carries party (his leader's id; none: he walks alone) and dayMoved (the factors he has spent today). A party is the living
// in one hex under one leader; the leader's player (or the referee) walks it, and any player takes his own out of it.
// Ops (a member, for characters he owns or the party he leads; the referee for any):
//   map                    the known map (the referee: the whole map), the places, the home, the parties he may know of
//   parties                the parties alone (every op below returns them too)
//   party  {ids, with?}    these leave their parties and travel together: into the party of `with`, or as a new one led by the first
//   lead   {id}            the leader's player hands the lead to a member
//   move   {id, path|to|dir}  the party walks hex to hex within the day's factors (3 on foot; the first hex is always entered).
//                          The first step of a day rolls for lost (a lost party walks its whole day where the die sends it);
//                          walked hexes become known; ending on a village enters it and learns its ring. {ids} of several
//                          not yet a party forms them first.
//   camp   {id}            after walking: the day ends (the one wandering-monster check, daysWalked + 1). Without walking:
//                          a day's rest on the road (two checks); clears daysWalked
//   rest   {id, days}      complete rest at an inn: hp back (none day 1, one every other day after); his clock moves on
//   rumour {id}            the rounds of the taverns (10-60 gp + 1-10 gp): one rumour, marked on the known map if it names a hex
//   shop   {id, buy|sell}  the market: buy at cost, sell at half (finished characters, in a village with a market)
//   stow   {id, item|gp}   at an inn: one of an item, or gold, into the strongbox the innkeeper keeps for him there (v1.573.00)
//   fetch  {id, item|gp}   and out of it again; what is in a strongbox is not carried, and is his estate if he dies
//   heir   {id, name, relation}  the relative who inherits his estate (Book I, Relatives): named, changed, or with no name unnamed
//   give   {id, to, item|gp}  hand one of an item, or gold, to a character standing with him: in the same village, or of
//                          his party on the road (v1.569.00). What he may not use, he may not be handed (as at the shop).
//   march  {id, order}     the marching order of characters standing together, front rank first (v1.570.00): each his own
//                          player's, or the referee's, to place. It goes with them onto the road and underground.
//   spots  {id, spots}     the company's tokens moved together on the settlement's map, all or none (v1.571.00)
//   spot   {id, x, y}        where his token stands on the settlement's map (dragged in the town scene).
//   enter  {id, place}     into the village he stands in (where = place, doing = town) or out onto the road (doing = road);
//                          the whole party if he leads it
//   evade   {id}           the party's leader: Book III's evasion table (party size vs their share of their possible number, surprise, woods, speed), then pursuit
//   parley  {id}           the reaction roll (2d6, the monster's mind); the referee puts words to it
//   stand   {id}           the party stands; the referee opens the fight
// Only the referee:
//   adjust  {id, number}   the referee's option on No. Appearing (Book II: increase or decrease according to the party concerned)
//   resolve {id}           an encounter dealt with (a fight opened or the party let go): doing back to road
//   rumours {place, list}  set a settlement's rumour list
//   paint {q, r, t?, track?, ford?, place?, kind?}  edit the referee's key in place; a hex the players know is updated too (pass 10)
// Dungeon levels (pass 16): the ops whose names start "dungeon" go to dungeon-service.mjs; the referee's map lists the levels.
// Rulings (Kurt, Oct 2026): a lone character walks as a party of one; the players start knowing the home village and its ring.

import { isReferee, campaignDay } from "./campaign-service.mjs";
import { createDungeonOps, DUNGEONS, dungeonPath } from "./dungeon-service.mjs";
import { createDelveOps } from "./delve-service.mjs";

const ID = /^[A-Za-z0-9_-]{1,80}$/;

export const worldPaths = (cid) => ({
  campaign: `oddCampaigns/${cid}`,
  characters: `oddCampaigns/${cid}/characters`,
  character: (id) => `oddCampaigns/${cid}/characters/${id}`,
  map: `oddCampaigns/${cid}/world/map`,
  known: `oddCampaigns/${cid}/world/known`,
  rumours: `oddCampaigns/${cid}/world/rumours`,
  loyalty: `oddCampaigns/${cid}/world/loyalty`, // the referee's: no player's page can read under world/
  chat: (who, id) => `oddCampaigns/${cid}/chat/${who}/entries/${id}`,
});

/** The platform build this server code last changed in; the page names the oldest server it can work with and says so when this one is older. */
export const SERVER_BUILD = "v1.577.00";
export function createWorldService({ rules, store, now = () => Date.now(), rollDie = (n) => 1 + Math.floor(Math.random() * n), fights = null }) {
  const { roster, wilderness: W, westmark: WM, parties: P, menAtArms: M, retainers: RT } = rules;
  const PLACES = WM?.PLACES ?? W.WESTMARK.places;
  const dungeons = rules.dungeonGen ? createDungeonOps({ rules, now, rollDie }) : null;
  const delves = rules.dungeonGen && rules.delve ? createDelveOps({ rules, now, rollDie, DUNGEONS, dungeonPath, placeKey: (name) => W.key(PLACES[name].q, PLACES[name].r), hexKey: (ch) => { const h = ch.hex ?? PLACES[W.WESTMARK.home]; return W.key(h.q, h.r); }, openFightIn: fights?.openIn ?? null, isReferee }) : null;
  const refuse = (code, error) => ({ ok: false, code, error });
  const clean = (o) => JSON.parse(JSON.stringify(o));
  const d6 = () => rollDie(6);
  const owns = (ch, uid) => roster.levelOf(ch, uid) >= roster.OWNERSHIP.OWNER;
  const hexOf = (ch) => ch.hex ?? { q: PLACES[W.WESTMARK.home].q, r: PLACES[W.WESTMARK.home].r };
  const placeAt = (map, h) => map[W.key(h.q, h.r)]?.place ?? null;
  const placeInfo = (name) => (name && PLACES[name]) || null;
  /** The monster record behind an encounter's kind ("Goblins" -> goblin), or null for men and the rest. */
  const monsterOf = (kind) => { const low = String(kind ?? "").toLowerCase(), g = [low, low.replace(/s$/, ""), low.replace(/es$/, ""), low.replace(/ves$/, "f"), low.replace(/ies$/, "y")]; return rules.MONSTERS.find((m) => g.includes(m.name.toLowerCase())) ?? rules.MONSTERS.find((m) => g.includes(m.key)) ?? null; };
  /** The meeting (pass 9): how many (Book II No. Appearing; the referee's option adjusts it), surprise, the distance, their speed against the party's. */
  function meeting(enc, chars, terrain) {
    const surprise = W.surpriseOf(d6(), d6());
    const yards = W.sightingYards(rollDie, surprise === "monsters");
    const partyMove = Math.min(...chars.map(({ ch }) => roster.sheetFor(ch).move || 12));
    // a titled man (Lord, Wizard, Patriarch...): his band is rolled now, Book III's way, and rides into the fight as it is
    if (W.LEADERS[enc.kind]) {
      const band = W.leaderParty(enc.kind, { roll: rollDie, hitDiceFor: rules.hitDiceFor, nameFor: (style) => rules.generateMedievalName({ style, culture: "generic" }) });
      const speed = W.speedCompare(partyMove, band.mounted ? 18 : 12);
      return { ...enc, terrain, number: band.number, max: band.max, dice: "2d6 men", monsterKey: null, band: { kind: band.kind, mounted: band.mounted, disposition: band.disposition, alignment: band.alignment, leader: band.leader, men: band.men }, surprise, yards, speed, partyMove, choice: null, outcome: null, log: [] };
    }
    const m = monsterOf(enc.kind), na = m ? W.rollNumberAppearing(m.reference?.numberAppearing, rollDie) : null;
    const speed = m ? W.speedCompare(partyMove, m.move?.ground ?? 12) : "even";
    return { ...enc, terrain, number: na ? na.n : null, max: na ? na.max : null, dice: na ? na.dice : null, monsterKey: m?.key ?? null, surprise, yards, speed, partyMove, choice: null, outcome: null, log: [] };
  }

  /**
   * A line in the lobby chat for the referee and the named readers (or every player). extra.kind sorts it for the
   * chat's chips (v1.563.00): "travel" (the Journal), "meeting", "event", "party", "ruling" (the referee's own).
   * extra.id and extra.at rewrite a line already written (a day's walk is one line, added to as the party goes on).
   */
  function log(tx, p, camp, text, readers = null, extra = {}) {
    const all = (camp.members ?? []).filter((u) => !isReferee(camp, u));
    const to = readers ? ["referee", ...readers] : ["referee", ...all];
    const at = extra.at ?? now(), id = extra.id ?? `${String(at).padStart(14, "0")}-world-${Math.floor(Math.random() * 1e6)}`;
    const entry = clean({ uid: "world", person: W.WESTMARK.name, color: null, as: null, side: null, to: readers ? "referee" : "all", toName: readers ? null : null, text, kind: "event", ...extra, id, at });
    for (const r of [...new Set(to)]) tx.set(p.chat(r, id), entry);
    return { id, at };
  }
  /**
   * A character's own day (Book III, Time: a record of each player). Actual time is counted off for those in town or
   * underground, so the campaign day carries them on; one out in the wilderness keeps his own count of days.
   */
  const dayOf = (ch, campDay) => (ch.day == null ? campDay : !ch.under && (ch.doing === "road" || ch.doing === "encounter") ? ch.day : Math.max(ch.day, campDay));
  /**
   * Kurt (25 Nov 2026), on Book III's reconciling of time: when characters trade, join a party or otherwise meet, whoever
   * is behind is moved up to the other's day. Nobody acts in another's past, and nothing is refused.
   */
  const dayTogether = (list, campDay) => Math.max(...list.map((c) => dayOf(c, campDay)));
  const ownersOf = (list) => [...new Set(list.map((c) => c.owner).filter(Boolean))];
  const sOf = (list) => (list.length === 1 ? "s" : "");

  async function loadMaps(tx, p) {
    let map = await tx.get(p.map), known = await tx.get(p.known);
    let seeded = false;
    if (!map) { map = { hexes: layOut({}), seededAt: now(), laidOut: true, painted: {} }; seeded = true; }
    if (!known) { known = { hexes: startingKnowledge(map.hexes) }; seeded = true; }
    return { map, known, seeded };
  }
  /** The kingdom from the generator (pass 14), the referee's painting on top; the old radius-5 key if the generator isn't there. */
  const layOut = (painted) => (WM ? WM.generateWestmark({ seed: 1, overrides: painted ?? {} }).hexes : W.fullMap());
  /** What the players know at the start: the home village and its ring of six, from the map as laid out. */
  const knownOf = (h, rumoured = false) => ({ t: h.t, ...(h.place ? { place: h.place } : {}), ...(h.ford ? { ford: true } : {}), ...(h.track ? { track: true } : {}), ...(rumoured ? { rumoured: true } : {}) });
  const startingKnowledge = (hexes) => { const home = PLACES[W.WESTMARK.home], out = {}; for (const h of [home, ...W.ring(home)]) { const k = W.key(h.q, h.r); if (hexes[k]) out[k] = knownOf(hexes[k]); } return out; };
  const learn = (known, map, h, { rumoured = false } = {}) => {
    const k = W.key(h.q, h.r), real = map.hexes[k]; if (!real) return;
    const cur = known.hexes[k];
    if (cur && !cur.rumoured) return;
    known.hexes[k] = { t: real.t, ...(real.place ? { place: real.place } : {}), ...(real.ford ? { ford: true } : {}), ...(real.track ? { track: true } : {}), ...(rumoured ? { rumoured: true } : {}) };
  };
  const learnRing = (known, map, h) => { learn(known, map, h); for (const n of W.ring(h)) learn(known, map, n); };

  async function handle({ uid, data }) {
    const { op, cid } = data ?? {};
    if (!ID.test(cid ?? "")) return refuse("bad-request", "no such game");
    const p = worldPaths(cid);
    return store.run(async (tx) => {
      const stored = await tx.get(p.campaign);
      if (!stored) return refuse("not-found", "no such game");
      const camp = { ...stored, day: campaignDay(stored, now()) }; // the campaign day by the calendar (v1.565.00)
      const ref = isReferee(camp, uid);
      if (!ref && !(camp.members ?? []).includes(uid)) return refuse("forbidden", "you are not in this game");
      if (String(op ?? "").startsWith("delve")) return delves ? delves.handle(tx, { op, data, cid, uid, ref, camp, p, log }) : refuse("bad-request", "exploring isn't deployed");
      if (String(op ?? "").startsWith("dungeon")) return dungeons ? dungeons.handle(tx, { op, data, cid, ref }) : refuse("bad-request", "the dungeon levels aren't deployed");
      const { map, known, seeded } = await loadMaps(tx, p);
      const save = () => { if (seeded) { tx.set(p.map, clean(map)); } tx.set(p.known, clean(known)); };
      const all = ((await tx.list(p.characters)) ?? []).filter((c) => c && ID.test(c.id ?? ""));
      const byId = (id) => all.find((c) => c.id === id) ?? null;
      const hk = (ch) => { const h = hexOf(ch); return W.key(h.q, h.r); };
      const above = () => all.filter((c) => !c.under); // a party underground is off the kingdom map until it climbs out (pass 18)
      const partyHolding = (id) => P.partyOf(above(), id, hk);
      /** The parties this viewer may know of: his own and those he can see, and any standing in a hex with one of his. */
      const summary = () => {
        const list = P.partiesOf(above(), hk), mine = new Set(above().filter((c) => owns(c, uid)).map(hk)), allowance = W.allowanceOf("foot");
        return list.filter((pt) => ref || mine.has(pt.hex) || pt.members.some((m) => roster.levelOf(m, uid) >= roster.OWNERSHIP.LIMITED)).map((pt) => {
          const within = ref || pt.members.some((m) => owns(m, uid)), spent = Math.min(allowance, P.daySpent(pt)), { q, r } = W.parse(pt.hex);
          return clean({ id: pt.id, hex: { q, r }, spent, allowance, left: allowance - spent, day: Math.max(...pt.members.map((m) => dayOf(m, camp.day ?? 1))),
            mustRest: pt.members.some((m) => W.mustRest(m.daysWalked ?? 0)) || pt.members.some((m) => (m.restOwed ?? 0) >= 1), encounter: pt.members.some((m) => m.doing === "encounter"),
            walks: P.mayWalk(pt, uid, { referee: ref, owns }),
            members: pt.members.map((m) => ({ id: m.id, name: m.name ?? "", owner: m.owner ?? null, cls: m.cls ?? null, level: m.level ?? 1, doing: m.doing ?? null, where: m.where ?? null, mine: ref || owns(m, uid), ...(within || roster.levelOf(m, uid) >= roster.OWNERSHIP.OBSERVER ? { hp: m.hp ?? 0, maxHp: m.maxHp ?? 0 } : {}) })) });
        });
      };

      if (op === "map") {
        const rumours = ref ? (await tx.get(p.rumours)) ?? {} : undefined;
        const loyalty = ref ? ((await tx.get(p.loyalty)) ?? {}).of ?? {} : undefined;
        const every = dungeons ? await dungeons.summary(tx, cid) : undefined;
        const levels = !every ? undefined : ref ? every : Object.fromEntries(Object.entries(every).filter(([, d]) => d.status === "open")); // the players hear of a level once it is open
        if (seeded) save();
        const places = { ...PLACES };
        for (const [k, h] of Object.entries(map.hexes)) if (h.place && !places[h.place]) { const { q, r } = W.parse(k); places[h.place] = { q, r, kind: h.kind ?? "village", desc: "" }; }
        return { ok: true, home: W.WESTMARK.home, places, hexes: ref ? map.hexes : known.hexes, full: ref, laidOut: !!map.laidOut, ...(ref ? { known: known.hexes } : {}), ...(ref ? { loyalty } : {}), ...(ref ? { rumours, defaults: { [W.WESTMARK.home]: W.WESTMARK.rumours } } : {}), ...(levels ? { dungeons: levels } : {}), parties: summary(), server: { build: SERVER_BUILD, rules: rules.fightStore?.RULES_VERSION ?? null } };
      }

      if (op === "rumours") {
        if (!ref) return refuse("forbidden", "only the referee writes the rumours");
        const place = String(data.place ?? ""); if (!placeInfo(place)) return refuse("bad-request", "no such place");
        const list = (Array.isArray(data.list) ? data.list : []).slice(0, 50).map((r) => clean({ text: String(r.text ?? "").slice(0, 400), truth: !!r.truth, ...(r.reveals && Number.isInteger(r.reveals.q) && Number.isInteger(r.reveals.r) ? { reveals: { q: r.reveals.q, r: r.reveals.r } } : {}) }));
        const cur = (await tx.get(p.rumours)) ?? {};
        tx.set(p.rumours, clean({ ...cur, [place]: list }));
        return { ok: true, count: list.length };
      }

      if (op === "paint") {
        if (!ref) return refuse("forbidden", "only the referee paints the map");
        const list = Array.isArray(data.hexes) ? data.hexes.slice(0, 600) : [{ q: data.q, r: data.r }];
        if (!list.length) return refuse("bad-request", "which hex?");
        if (data.t != null && !W.TERRAIN[data.t]) return refuse("bad-request", "no such terrain");
        map.painted ??= {};
        let last = null;
        for (const at of list) {
          const q = Math.trunc(Number(at.q)), r = Math.trunc(Number(at.r)); if (!Number.isInteger(q) || !Number.isInteger(r) || Math.abs(q) > 60 || Math.abs(r) > 60) return refuse("bad-request", "which hex?");
          const k = W.key(q, r), cur = map.hexes[k] ?? { t: "clear" }, next = { ...cur }, patch = { ...(map.painted[k] ?? {}) };
          if (data.t != null) { next.t = data.t; patch.t = data.t; }
          if (data.track != null) { next.track = !!data.track; patch.track = !!data.track; }
          if (data.ford != null) { next.ford = !!data.ford; patch.ford = !!data.ford; }
          if (data.place !== undefined) { if (data.place) { next.place = String(data.place).slice(0, 40); next.kind = ["village", "town", "ruin", "castle", "city", "abbey"].includes(data.kind) ? data.kind : "village"; } else { delete next.place; delete next.kind; } patch.place = next.place ?? ""; patch.kind = next.kind ?? ""; }
          if (!next.track) delete next.track; if (!next.ford) delete next.ford;
          map.hexes[k] = next; map.painted[k] = patch; last = next;
          if (known.hexes[k]) known.hexes[k] = knownOf(next, !!known.hexes[k].rumoured);
        }
        map.paintedAt = now();
        tx.set(p.map, clean(map)); tx.set(p.known, clean(known));
        return { ok: true, hex: last, count: list.length };
      }
      if (op === "layout") {
        // the referee lays the kingdom out over an old radius-5 map (or again): the generator's sheet, his painting kept, the players' known hexes refreshed
        if (!ref) return refuse("forbidden", "only the referee lays out the map");
        if (!WM) return refuse("bad-request", "the generator isn't deployed");
        map.hexes = layOut(map.painted ?? {}); map.laidOut = true; map.laidOutAt = now();
        for (const k of Object.keys(known.hexes)) { if (map.hexes[k]) known.hexes[k] = knownOf(map.hexes[k], !!known.hexes[k].rumoured); else delete known.hexes[k]; }
        tx.set(p.map, clean(map)); tx.set(p.known, clean(known));
        return { ok: true, hexes: Object.keys(map.hexes).length };
      }
      if (op === "parties") return { ok: true, parties: summary() };

      // the characters this op is about
      const many = ["move", "camp", "evade", "stand", "party"].includes(op);
      const ids = many && Array.isArray(data.ids) ? [...new Set(data.ids.filter((x) => ID.test(x ?? "")))].slice(0, 12) : ID.test(data.id ?? "") ? [data.id] : [];
      if (!ids.length) return refuse("bad-request", "which character?");
      const own = ["rest", "rumour", "shop", "give", "party", "stow", "fetch", "heir", "notice", "hire", "dismiss", "seek", "offer", "release"].includes(op);
      for (const id of ids) {
        const ch = byId(id); if (!ch) return refuse("not-found", "no such character");
        if (own && !ref && !owns(ch, uid)) return refuse("forbidden", "not your character");
        if (ch.status !== "ready") return refuse("bad-request", `${ch.name || "he"} isn't finished`);
        if (ch.under) return refuse("bad-request", `${ch.name || "he"} is underground`);
      }
      const day0 = camp.day ?? 1;
      const loyalty = op === "offer" || op === "release" ? (await tx.get(p.loyalty)) ?? { of: {} } : null; // read before anything is written
      const put = (id, ch) => { const next = clean({ ...ch, updatedAt: now() }); tx.set(p.character(id), next); const i = all.findIndex((c) => c.id === id); if (i >= 0) all[i] = next; else all.push(next); };
      const done = (out) => ({ ...out, parties: summary() });
      /**
       * Pay day (Book III, Men-at-Arms: so much a month): each month that has come due by `day` is paid from his gold;
       * the month he cannot pay, the men leave his service. Returns him as he is after it, and tells his player.
       */
      const afterPay = (ch, day) => { const s = M && ch.troops ? M.settlePay(ch.troops, ch.coins?.gp ?? 0, day) : null; return s && (s.paid || s.left) ? { ...ch, troops: s.troops, coins: { ...ch.coins, gp: s.gp } } : ch; };
      const pay = (ch, day) => {
        if (!M || !ch.troops) return ch;
        const s = M.settlePay(ch.troops, ch.coins?.gp ?? 0, day); if (!s.paid && !s.left) return ch;
        log(tx, p, camp, `Day ${day}. ${s.left ? `${ch.name} could not pay his men-at-arms (${M.describe(ch.troops)}; ${M.monthlyPay(ch.troops)} gp a month) and they left his service.` : `${ch.name} paid his men-at-arms ${s.paid} gp${s.months > 1 ? ` for ${s.months} months` : ""}; they are paid to day ${s.troops.paidTo}.`}`, ch.owner ? [ch.owner] : null, { kind: "event" });
        return { ...ch, troops: s.troops, coins: { ...ch.coins, gp: s.gp } };
      };
      const nameList = (list) => list.map((c) => c.name).join(", ");
      const leaderSays = "the party's leader walks it; take your own out of the party to go your own way";

      if (op === "party") {
        const movers = ids.map(byId), target = data.with != null && ID.test(data.with) ? partyHolding(data.with) : null;
        if (data.with != null && !target) return refuse("not-found", "no such party");
        if (movers.some((c) => c.doing === "encounter") || target?.members.some((c) => c.doing === "encounter")) return refuse("bad-request", "an encounter waits on the referee: the party stays as it is until it's settled");
        const g = P.regroup(above(), ids, target ? target.id : null, hk);
        if (!g.ok) return refuse("bad-request", g.error);
        for (const [id, pid] of Object.entries(g.set)) put(id, { ...byId(id), party: pid });
        const now2 = partyHolding(ids[0]), met = dayTogether(now2.members, day0);
        for (const m of now2.members) if ((m.day ?? null) !== met) put(m.id, { ...byId(m.id), day: met }); // they travel together from the later one's day
        log(tx, p, camp, target ? `${nameList(movers)} joined ${now2.leader.name}'s party.` : movers.length === 1 ? `${movers[0].name} went his own way.` : `${nameList(movers)} set off as a party of their own, ${movers[0].name} leading.`, null, { kind: "party" });
        return done({ ok: true, party: g.party });
      }

      const party = partyHolding(ids[0]);
      if (op === "lead") {
        if (!party) return refuse("bad-request", "he isn't travelling");
        if (!ref && !owns(party.leader, uid)) return refuse("forbidden", "only the leader's player hands the lead on");
        const g = P.lead(above(), ids[0], hk);
        for (const [id, pid] of Object.entries(g.set)) put(id, { ...byId(id), party: pid });
        log(tx, p, camp, `${byId(ids[0]).name} leads the party now.`, null, { kind: "party" });
        return done({ ok: true, party: g.party });
      }

      if (op === "march") {
        const first = byId(ids[0]), order = [...new Set((Array.isArray(data.order) ? data.order : []).filter((x) => ID.test(x ?? "")))].slice(0, 24);
        if (!order.length) return refuse("bad-request", "which order?");
        for (const id of order) {
          const ch = byId(id); if (!ch || !P.travels(ch) || ch.under || hk(ch) !== hk(first)) return refuse("bad-request", "they aren't standing together");
          if (!ref && !owns(ch, uid)) return refuse("forbidden", "not your character");
        }
        order.forEach((id, i) => put(id, { ...byId(id), march: i }));
        return done({ ok: true, order });
      }
      if (op === "spots") { // the company walks: every token placed in the one transaction, or none
        const first = byId(ids[0]), list = (Array.isArray(data.spots) ? data.spots : []).slice(0, 24), n = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v)) || 0));
        if (!list.length) return refuse("bad-request", "who walks where?");
        for (const s of list) {
          const ch = ID.test(s?.id ?? "") ? byId(s.id) : null;
          if (!ch || ch.doing !== "town" || ch.under || hk(ch) !== hk(first)) return refuse("bad-request", "they aren't together in a settlement");
          if (!ref && !owns(ch, uid)) return refuse("forbidden", "not your character");
        }
        for (const s of list) put(s.id, { ...byId(s.id), spot: { x: n(s.x, 860), y: n(s.y, 680) } });
        return done({ ok: true });
      }
      if (op === "spot") { // where his token stands on the settlement's map (a drag in the town scene)
        const one = byId(ids[0]);
        if (!ref && !owns(one, uid)) return refuse("forbidden", "not your character");
        if (one.doing !== "town") return refuse("bad-request", "he isn't in a settlement");
        const n = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v)) || 0));
        put(one.id, { ...one, spot: { x: n(data.x, 860), y: n(data.y, 680) } });
        return done({ ok: true });
      }
      if (op === "enter") {
        const one = byId(ids[0]);
        if (one.doing === "dead") return refuse("bad-request", "he is dead");
        if (!ref && !owns(one, uid) && !(party && P.mayWalk(party, uid, { referee: ref, owns }))) return refuse("forbidden", "not your character");
        const who = party && P.mayWalk(party, uid, { referee: ref, owns }) ? party.members : [one];
        if (who.some((c) => c.doing === "encounter")) return refuse("bad-request", "an encounter waits on the referee");
        const h = hexOf(one), place = placeAt(map.hexes, h);
        if (data.place !== "road" && (!place || !placeInfo(place))) return refuse("bad-request", "no village here");
        for (const ch of who) put(ch.id, data.place === "road" ? { ...ch, hex: h, where: place ?? W.TERRAIN[map.hexes[W.key(h.q, h.r)]?.t ?? "clear"].label, doing: "road" } : { ...ch, hex: h, where: place, doing: "town" });
        return done({ ok: true });
      }

      if (op === "rest") {
        const ch = byId(ids[0]), id = ch.id; const h = hexOf(ch), place = placeAt(map.hexes, h);
        if (!place || !placeInfo(place)?.inn) return refuse("bad-request", "no inn here: rest on the road with Camp");
        if (ch.doing === "dead") return refuse("bad-request", "he is dead");
        const days = Math.min(60, Math.max(1, Math.trunc(Number(data.days ?? 1)) || 1));
        const healed = Math.min(W.healingAfter(days), Math.max(0, (ch.maxHp ?? 0) - (ch.hp ?? 0)));
        const day = Math.max(ch.day ?? day0, day0) + days;
        put(id, { ...pay(ch, day), hex: h, where: place, doing: "town", day, daysWalked: 0, dayMoved: 0, restOwed: 0, hp: (ch.hp ?? 0) + healed, expedition: null }); // rested in town: the next descent is a new expedition
        log(tx, p, camp, `Day ${day}. ${ch.name} rested ${days} day${days === 1 ? "" : "s"} at ${placeInfo(place).inn}${healed ? ` and healed ${healed} hit point${healed === 1 ? "" : "s"}` : ""}.`, null, { kind: "travel" });
        return done({ ok: true, healed, day });
      }

      if (op === "rumour") {
        const ch = byId(ids[0]), id = ch.id; const h = hexOf(ch), place = placeAt(map.hexes, h);
        if (!place || !placeInfo(place)?.inn) return refuse("bad-request", "no tavern here");
        const cost = W.rumourCost(d6(), rollDie(10));
        if ((ch.coins?.gp ?? 0) < cost) return refuse("bad-request", `the rounds would cost ${cost} gp; he has ${ch.coins?.gp ?? 0}`);
        const lists = (await tx.get(p.rumours)) ?? {};
        const list = lists[place]?.length ? lists[place] : place === W.WESTMARK.home ? W.WESTMARK.rumours : [];
        if (!list.length) return refuse("bad-request", "nobody here has anything to say tonight");
        const heard = ch.heard ?? [];
        const fresh = list.map((r, i) => i).filter((i) => !heard.includes(`${place}:${i}`));
        const pick = (fresh.length ? fresh : list.map((r, i) => i))[rollDie(fresh.length || list.length) - 1];
        const r = list[pick];
        if (r.reveals) { learn(known, map, r.reveals, { rumoured: true }); if (!r.truth && known.hexes[W.key(r.reveals.q, r.reveals.r)]) known.hexes[W.key(r.reveals.q, r.reveals.r)].rumoured = true; }
        put(id, { ...ch, hex: h, coins: { ...ch.coins, gp: ch.coins.gp - cost }, heard: [...heard, `${place}:${pick}`].slice(-100) });
        save();
        log(tx, p, camp, `${ch.name} bought a round at ${placeInfo(place).inn} (${cost} gp) and heard: "${r.text}"`, [ch.owner], { rumour: { truth: r.truth } });
        return { ok: true, cost, text: r.text };
      }

      if (op === "heir") {
        const ch = byId(ids[0]), text = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max), name = text(data.name, 40), relation = text(data.relation, 40);
        put(ch.id, { ...ch, heir: name ? { name, relation: relation || "relative" } : null });
        return { ok: true, character: { id: ch.id, ...byId(ch.id) } };
      }
      /*
       * Retainers (Book I, Non-Player Characters; v1.577.00). seek: he advertises at the inn for one of a class.
       * offer: gold and terms put to the one who came forward, on Book I's two dice. release: a retainer is let go.
       * Loyalty is rolled when he enters service and kept in world/loyalty, where only the referee's requests reach.
       */
      if (op === "seek" || op === "offer") {
        if (!RT) return refuse("bad-request", "retainers aren't deployed");
        const ch0 = byId(ids[0]), h = hexOf(ch0), place = placeAt(map.hexes, h), info = placeInfo(place);
        if (ch0.doing === "dead") return refuse("bad-request", "he is dead");
        if (ch0.retainer) return refuse("bad-request", `${ch0.name} is in service himself`);
        if (!info?.inn || ch0.doing !== "town") return refuse("bad-request", "retainers are sought at an inn");
        const serving = all.filter((c) => c.retainer?.of === ch0.id && c.doing !== "dead"), most = RT.hirelingsFor(ch0.abilities?.cha).max;
        if (serving.length >= most) return refuse("bad-request", `Charisma ${ch0.abilities?.cha}: he may keep ${most} and has ${serving.length}`);
        const today = dayOf(ch0, day0), label = (cls) => roster.CLASS_LABEL[cls] ?? cls;
        if (op === "seek") {
          const cls = String(data.cls ?? ""), method = String(data.method ?? ""), way = RT.SEEK[method];
          if (!RT.RETAINER_CLASSES.includes(cls)) return refuse("bad-request", "one of which class?");
          if (!way) return refuse("bad-request", "seek him how?");
          if (!RT.seekChance(info.kind, method)) return refuse("bad-request", `nobody is to be found that way in ${place}`);
          const start = Math.max(ch0.day ?? day0, day0), want = way.daily ? Math.max(1, Math.min(RT.SEEK_MAX_DAYS, Math.trunc(Number(data.days)) || 1)) : way.days;
          const purse = afterPay(ch0, start + want).coins?.gp ?? 0; // what he can count on if his men's pay falls due in the meantime
          const r = RT.seek(info.kind, method, { days: want, gp: purse, roll: rollDie });
          if (!r.days) return refuse("bad-request", way.daily ? `he hasn't the gold for a day of it; he has ${purse} gp` : `the notices cost ${way.cost} gp; he has ${purse}`);
          const day = start + r.days, ch = pay(ch0, day), gp = (ch.coins?.gp ?? 0) - r.spent;
          const healed = Math.min(W.healingAfter(r.days), Math.max(0, (ch.maxHp ?? 0) - (ch.hp ?? 0)));
          const applicant = r.found ? { place, day, cls, name: rules.generateMedievalName?.({ style: "commoner", culture: "generic" }) || `a ${label(cls)}`, last: 0 } : null;
          put(ch.id, { ...ch, coins: { ...ch.coins, gp }, hex: h, where: place, doing: "town", day, daysWalked: 0, dayMoved: 0, restOwed: 0, hp: (ch.hp ?? 0) + healed, expedition: null, applicant });
          log(tx, p, camp, `Day ${day}. ${ch.name} sought a ${label(cls)} at ${info.inn} (${way.name.toLowerCase()}, ${r.days} day${r.days === 1 ? "" : "s"}, ${r.spent} gp). ${applicant ? `${applicant.name} came forward and waits on an offer.` : `Nobody came forward${r.short ? "; his gold ran short" : ""}.`}`, ch.owner ? [ch.owner] : null, { kind: "travel" });
          return done({ ok: true, character: { id: ch.id, ...byId(ch.id) }, found: !!applicant, name: applicant?.name ?? null, days: r.days, spent: r.spent, day });
        }
        const ap = ch0.applicant, live = ap && ap.place === place && today <= ap.day + RT.SEEK_MAX_DAYS;
        if (!live) return refuse("bad-request", "nobody waits on his offer here: seek one first");
        const gp = Math.trunc(Number(data.gp)), terms = RT.TERMS[data.terms] ? data.terms : "wages", has = afterPay(ch0, today).coins?.gp ?? 0;
        if (!(gp >= RT.MIN_OFFER)) return refuse("bad-request", `no man is tempted into service for less than ${RT.MIN_OFFER} gp (Book I)`);
        if (gp <= (ap.last ?? 0)) return refuse("bad-request", `he was uncertain at ${ap.last} gp: offer more`);
        if (gp > has) return refuse("bad-request", `he has ${has} gp`);
        const o = RT.makeOffer(d6(), d6(), gp, ch0.abilities?.cha);
        const dice = `2d6 [${o.dice.join(",")}]${o.offer ? ` +${o.offer} for the offer` : ""}${o.charisma ? ` ${o.charisma > 0 ? "+" : "−"}${Math.abs(o.charisma)} for Charisma` : ""} = ${o.total}`;
        const said = `Day ${today}. ${ch0.name} offered ${ap.name}, a ${label(ap.cls)}, ${gp} gp (${RT.TERMS[terms]}): ${dice}.`;
        const mine = ch0.owner ? [ch0.owner] : null;
        if (!o.accepts) {
          put(ch0.id, { ...pay(ch0, today), applicant: o.open ? { ...ap, last: gp } : null });
          log(tx, p, camp, `${said} ${o.open ? "He is uncertain: a better offer may sway him." : o.key === "Attack" ? "He takes it as an insult, and it nearly comes to blows; he is gone." : "He refuses, and is gone."}`, mine, { kind: "event" });
          return { ok: true, character: { id: ch0.id, ...byId(ch0.id) }, result: o.key, total: o.total, accepted: false, open: o.open };
        }
        // he enters service: a first-level character rolled as any other, equipped from his own starting gold
        let made = roster.rollCharacter(d6);
        const based = roster.setBasics(made, { name: ap.name, race: "human", cls: ap.cls, alignment: ch0.alignment ?? "neutral" }); if (!based.ok) return refuse("bad-request", based.error);
        made = based.ch;
        for (const key of RT.RETAINER_KIT[ap.cls] ?? []) { const b = roster.buy(made, key); if (b.ok) made = b.ch; }
        const fin = roster.finish(made, d6); if (!fin.ok) return refuse("bad-request", fin.error);
        const rid = `ret-${now().toString(36)}-${rollDie(1000000).toString(36)}`, owner = ch0.owner ?? null;
        const loyal = RT.rollLoyalty([d6(), d6(), d6()], ch0.abilities?.cha, o.loyaltyBonus);
        const ch = pay(ch0, today), band = partyHolding(ch.id);
        const ret = roster.withAccess({ ...fin.ch, id: rid, owner, ownership: { default: roster.OWNERSHIP.NONE, ...(owner ? { [owner]: roster.OWNERSHIP.OWNER } : {}) }, folder: ch.folder ?? null, createdAt: now(),
          hex: h, where: place, doing: "town", day: today, party: band?.id ?? ch.id, march: 99, ...(ch.spot ? { spot: ch.spot } : {}), retainer: { of: ch.id, ofName: ch.name, terms, offer: gp, since: today, place } }, camp.members ?? []);
        put(rid, ret);
        put(ch.id, { ...ch, party: band?.id ?? ch.id, coins: { ...ch.coins, gp: (ch.coins?.gp ?? 0) - gp }, applicant: null, hirelings: [...(ch.hirelings ?? []).filter((x) => x.id !== rid), { id: rid, name: ret.name }] });
        tx.set(p.loyalty, clean({ of: { ...(loyalty.of ?? {}), [rid]: { score: loyal.score, dice: loyal.dice, charisma: loyal.charisma, bonus: loyal.bonus, hirer: ch.id, day: today } } }));
        log(tx, p, camp, `${said} ${o.key === "Enthusiast" ? "He is eager for it, and" : "He accepts, and"} enters ${ch.name}'s service.`, mine, { kind: "party" });
        log(tx, p, camp, `${ret.name}'s loyalty to ${ch.name}: 3d6 [${loyal.dice.join(",")}]${loyal.charisma ? ` ${loyal.charisma > 0 ? "+" : "−"}${Math.abs(loyal.charisma)} Charisma` : ""}${loyal.bonus ? ` +${loyal.bonus} enthusiast` : ""} = ${loyal.score}: ${loyal.morale.deserts ? "he will desert at the first opportunity" : loyal.morale.neverChecks ? "he need never check morale" : loyal.morale.mod ? `${loyal.morale.mod > 0 ? "+" : "−"}${Math.abs(loyal.morale.mod)} on his morale dice` : "average, nothing on his morale dice"}. The players are not told.`, [], { kind: "ruling" });
        return done({ ok: true, character: { id: ch.id, ...byId(ch.id) }, retainer: { id: rid, ...byId(rid) }, result: o.key, total: o.total, accepted: true });
      }
      if (op === "release") {
        const r0 = byId(ids[0]), master = r0.retainer ? byId(r0.retainer.of) : null;
        if (!r0.retainer) return refuse("bad-request", `${r0.name} is nobody's retainer`);
        const today = dayOf(r0, day0), g = P.regroup(above(), [r0.id], null, hk);
        const freed = roster.setOwnership({ ...r0, retainer: null, served: { of: r0.retainer.of, ofName: r0.retainer.ofName ?? master?.name ?? "", until: today } }, { default: roster.OWNERSHIP.NONE }, camp.members ?? []);
        if (!freed.ok) return refuse("bad-request", freed.error);
        if (g.ok) for (const [id, pid] of Object.entries(g.set)) if (id !== r0.id) put(id, { ...byId(id), party: pid });
        put(r0.id, { ...freed.ch, party: r0.id });
        if (master) put(master.id, { ...byId(master.id), hirelings: (byId(master.id).hirelings ?? []).filter((x) => x.id !== r0.id) });
        const of = { ...(loyalty.of ?? {}) }; delete of[r0.id]; tx.set(p.loyalty, clean({ of }));
        log(tx, p, camp, `Day ${today}. ${master?.name ?? "His master"} released ${r0.name} from his service.`, master?.owner ? [master.owner] : null, { kind: "party" });
        return done({ ok: true, released: r0.id });
      }

      /*
       * Men-at-arms (Book III; v1.574.00). notice: a week of notices at the inn, 100-600 gp, each type sought rolled for
       * by itself. hire: men who answered are taken into service, a month's pay down. dismiss: men are let go.
       */
      if (op === "notice" || op === "hire" || op === "dismiss") {
        if (!M) return refuse("bad-request", "hiring isn't deployed");
        const ch0 = byId(ids[0]), h = hexOf(ch0), place = placeAt(map.hexes, h), info = placeInfo(place);
        if (ch0.doing === "dead") return refuse("bad-request", "he is dead");
        const today = dayOf(ch0, day0), type = String(data.type ?? ""), n = Math.trunc(Number(data.n ?? 1));
        if (op === "dismiss") {
          const has = M.menOf(ch0.troops)[type] ?? 0;
          if (!has || !(n >= 1)) return refuse("bad-request", "dismiss whom?");
          const ch = pay(ch0, today), gone = Math.min(n, M.menOf(ch.troops)[type] ?? 0);
          if (gone) log(tx, p, camp, `Day ${today}. ${ch.name} let ${gone} ${gone === 1 ? M.TROOPS[type].one : M.TROOPS[type].name} go.`, ch.owner ? [ch.owner] : null, { kind: "travel" });
          put(ch.id, { ...ch, troops: M.dismiss(ch.troops, type, n) });
          return { ok: true, character: { id: ch.id, ...byId(ch.id) } };
        }
        if (!info?.inn || ch0.doing !== "town") return refuse("bad-request", "notices are posted at an inn");
        const offered = M.offeredAt(info);
        if (op === "notice") {
          const spend = M.noticeSpend(data.gp), types = [...new Set((Array.isArray(data.types) ? data.types : []).map(String))].filter((k) => offered.includes(k));
          if (!types.length) return refuse("bad-request", offered.length ? "which men is he looking for?" : `no men-at-arms are to be had in ${place}`);
          const day = Math.max(ch0.day ?? day0, day0) + M.NOTICE.days, gp = afterPay(ch0, day).coins?.gp ?? 0;
          if (gp < spend) return refuse("bad-request", `a week of notices at that rate costs ${spend} gp; he has ${gp}${gp < (ch0.coins?.gp ?? 0) ? " once his men are paid" : ""}`);
          const ch = pay(ch0, day);
          const found = {}, rolls = {};
          for (const k of types) { const a = M.answer(info.kind, spend, rollDie); rolls[k] = { pct: a.pct, chance: a.chance }; if (a.n) found[k] = a.n; }
          const healed = Math.min(W.healingAfter(M.NOTICE.days), Math.max(0, (ch.maxHp ?? 0) - (ch.hp ?? 0)));
          const came = M.describe({ men: found }), none = types.filter((k) => !found[k]).map((k) => M.TROOPS[k].name);
          put(ch.id, { ...ch, coins: { ...ch.coins, gp: gp - spend }, hex: h, where: place, doing: "town", day, daysWalked: 0, dayMoved: 0, restOwed: 0, hp: (ch.hp ?? 0) + healed, expedition: null, notice: { place, day, spend, found, rolls } });
          log(tx, p, camp, `Day ${day}. ${ch.name} posted notices at ${info.inn} for a week (${spend} gp). ${came ? `${came} answered` : "Nobody answered"}${came && none.length ? `; no ${none.join(" or ")}` : ""}.${healed ? ` He healed ${healed} hit point${healed === 1 ? "" : "s"} in the week.` : ""}`, ch.owner ? [ch.owner] : null, { kind: "travel" });
          return done({ ok: true, character: { id: ch.id, ...byId(ch.id) }, found, day });
        }
        const note = ch0.notice, waiting = note && note.place === place && today <= note.day + M.NOTICE.days ? note.found?.[type] ?? 0 : 0;
        if (!M.TROOPS[type] || !(n >= 1)) return refuse("bad-request", "hire whom?");
        if (n > waiting) return refuse("bad-request", waiting ? `only ${waiting} ${M.TROOPS[type].name} answered his notices` : `no ${M.TROOPS[type].name} are waiting on him here: post notices first`);
        const dry = afterPay(ch0, today), gp = dry.coins?.gp ?? 0, cost = M.hireCost(dry.troops, type, n, today);
        if (M.countOf(dry.troops) + n > M.ARMORER_CAP) return refuse("bad-request", `he needs an Armorer to keep more than ${M.ARMORER_CAP} fighters (Book III)`);
        if (gp < cost) return refuse("bad-request", `their pay to the next pay day is ${cost} gp; he has ${gp}`);
        const ch = pay(ch0, today), troops = M.hire(ch.troops, type, n, today), found = { ...note.found, [type]: waiting - n }; if (!found[type]) delete found[type];
        put(ch.id, { ...ch, coins: { ...ch.coins, gp: gp - cost }, troops, notice: { ...note, found } });
        log(tx, p, camp, `Day ${today}. ${ch.name} took ${n} ${n === 1 ? M.TROOPS[type].one : M.TROOPS[type].name} into service at ${M.TROOPS[type].pay} gp a month each (${cost} gp down; paid to day ${troops.paidTo}).`, ch.owner ? [ch.owner] : null, { kind: "travel" });
        return { ok: true, character: { id: ch.id, ...byId(ch.id) }, cost };
      }
      if (op === "stow" || op === "fetch") {
        const ch = byId(ids[0]), h = hexOf(ch), place = placeAt(map.hexes, h);
        if (!place || !placeInfo(place)?.inn || ch.doing !== "town") return refuse("bad-request", "there is no inn here to keep a strongbox");
        const boxes = { ...(ch.strongbox ?? {}) }, box = { gp: boxes[place]?.gp ?? 0, items: (boxes[place]?.items ?? []).map((i) => ({ ...i })) }, has = ch.coins?.gp ?? 0;
        let next = ch, what;
        if (data.gp != null) {
          const gp = Math.trunc(Number(data.gp)), from = op === "stow" ? has : box.gp;
          if (!(gp >= 1)) return refuse("bad-request", "how much gold?");
          if (gp > from) return refuse("bad-request", op === "stow" ? `he has ${has} gp` : `there are ${box.gp} gp in the strongbox`);
          box.gp += op === "stow" ? gp : -gp; next = { ...ch, coins: { ...ch.coins, gp: has + (op === "stow" ? -gp : gp) } }; what = `${gp} gp`;
        } else if (op === "stow") {
          const index = Number(data.item), it = ch.items?.[index], e = it ? roster.SHOP.find((x) => x.key === it.key) ?? null : null;
          if (!e) return refuse("bad-request", "put what in?");
          const out = roster.sell(ch, index, { town: true }); if (!out.ok) return refuse("bad-request", out.error); // the shop's own way of taking one of a thing from his pack (and his hand)
          next = { ...out.ch, coins: { ...out.ch.coins, gp: has } };
          const same = box.items.find((i) => i.key === it.key); if (same) same.qty = (same.qty ?? 1) + 1; else box.items.push({ key: it.key, qty: 1 });
          what = e.name;
        } else {
          const index = Number(data.item), it = box.items[index], e = it ? roster.SHOP.find((x) => x.key === it.key) ?? null : null;
          if (!e) return refuse("bad-request", "take what out?");
          const into = roster.buy({ ...ch, coins: { ...ch.coins, gp: has + e.cost } }, it.key, { town: true }); // as if bought, less the price: what he may not carry twice stays in the box
          if (!into.ok) return refuse("bad-request", into.error);
          next = { ...into.ch, coins: { ...into.ch.coins, gp: has } };
          if ((it.qty ?? 1) > 1) it.qty -= 1; else box.items.splice(index, 1);
          what = e.name;
        }
        if (box.gp > 0 || box.items.length) boxes[place] = box; else delete boxes[place];
        put(ch.id, { ...next, strongbox: boxes });
        return { ok: true, character: { id: ch.id, ...byId(ch.id) }, what };
      }
      if (op === "give") {
        const ch = byId(ids[0]), to = ID.test(data.to ?? "") ? byId(data.to) : null;
        if (!to || to.id === ch.id || !P.travels(to) || to.status !== "ready") return refuse("bad-request", "give it to whom?");
        const both = (a, b) => !b.under && hk(a) === hk(b) && (a.doing === "town" ? b.doing === "town" : P.partyIdOf(a) === P.partyIdOf(b));
        if (!P.travels(ch) || !both(ch, to)) return refuse("bad-request", `${to.name} isn't with him`);
        let giver, taker, what;
        if (data.gp != null) {
          const gp = Math.trunc(Number(data.gp)), has = ch.coins?.gp ?? 0;
          if (!(gp >= 1)) return refuse("bad-request", "how much gold?");
          if (gp > has) return refuse("bad-request", `he has ${has} gp`);
          giver = { ...ch, coins: { ...ch.coins, gp: has - gp } }; taker = { ...to, coins: { ...to.coins, gp: (to.coins?.gp ?? 0) + gp } }; what = `${gp} gp`;
        } else {
          const index = Number(data.item), it = ch.items?.[index], e = it ? roster.SHOP.find((x) => x.key === it.key) ?? null : null;
          if (!e) return refuse("bad-request", "give what?");
          // the shop's own rules move the thing: one of it leaves his pack (and his hand, if it was his readied weapon), and the
          // other takes it as if bought, less the price, so what his class may not use or carry twice he is not handed
          const out = roster.sell(ch, index, { town: true }), into = roster.buy({ ...to, coins: { ...to.coins, gp: (to.coins?.gp ?? 0) + e.cost } }, it.key, { town: true });
          if (!out.ok) return refuse("bad-request", out.error);
          if (!into.ok) return refuse("bad-request", `${to.name}: ${into.error}`);
          giver = { ...out.ch, coins: { ...out.ch.coins, gp: ch.coins?.gp ?? 0 } }; taker = { ...into.ch, coins: { ...into.ch.coins, gp: to.coins?.gp ?? 0 } }; what = e.name;
        }
        const met = dayTogether([ch, to], day0); giver = { ...giver, day: met }; taker = { ...taker, day: met }; // they met to do it: the one behind is moved up
        put(ch.id, giver); put(to.id, taker);
        if ((ch.owner ?? null) !== (to.owner ?? null)) log(tx, p, camp, `${ch.name} gave ${to.name} ${what}.`, null, { kind: "party" });
        return { ok: true, character: { id: ch.id, ...giver }, other: { id: to.id, ...taker }, gave: what };
      }

      if (op === "shop") {
        const ch = byId(ids[0]), id = ch.id; const h = hexOf(ch), place = placeAt(map.hexes, h);
        if (!place || !placeInfo(place)?.market) return refuse("bad-request", "no market here");
        const r = data.buy != null ? roster.buy(ch, String(data.buy), { town: true }) : data.sell != null ? roster.sell(ch, Number(data.sell), { town: true }) : null;
        if (!r) return refuse("bad-request", "buy or sell what?");
        if (!r.ok) return refuse("bad-request", r.error);
        put(id, { ...r.ch, hex: h, where: place, doing: "town" });
        return { ok: true, character: { id, ...r.ch } };
      }

      if (!party) return refuse("bad-request", `${byId(ids[0]).name || "he"} isn't travelling`);
      const walks = P.mayWalk(party, uid, { referee: ref, owns });

      // the encounter prompt (pass 9, approved board 11): the party's choice, the dice, the referee's say
      if (op === "evade" || op === "stand" || op === "parley" || op === "adjust" || op === "resolve") {
        const met = party.members.filter((c) => c.doing === "encounter");
        if (op === "resolve") {
          if (!ref) return refuse("forbidden", "only the referee resolves an encounter");
          for (const ch of met) put(ch.id, { ...ch, doing: "road", encounter: null });
          log(tx, p, camp, `The referee let ${nameList(party.members)} go on.`, [], { kind: "ruling" });
          return done({ ok: true });
        }
        const enc0 = met[0]?.encounter;
        if (!enc0) return refuse("bad-request", "no encounter waits");
        const names = nameList(met);
        const h0 = hexOf(met[0]), terrain = enc0.terrain ?? "clear";
        const every = (patch) => { for (const ch of met) put(ch.id, { ...ch, ...patch(ch) }); };
        if (op === "adjust") {
          if (!ref) return refuse("forbidden", "the number is the referee's option");
          const number = Math.max(0, Math.min(5000, Math.trunc(Number(data.number)) || 0));
          every((ch) => ({ encounter: { ...ch.encounter, number, adjusted: true } }));
          log(tx, p, camp, `The referee makes it ${number} ${enc0.kind}.`, [], { kind: "ruling" });
          return done({ ok: true, number });
        }
        if (!walks) return refuse("forbidden", "the party's leader answers for it");
        if (enc0.choice && !ref) return refuse("bad-request", `the party already chose to ${enc0.choice}: the referee has it`);
        if (op === "stand") {
          every((ch) => ({ encounter: { ...ch.encounter, choice: "stand", outcome: "stand" } }));
          if (enc0.choice !== "stand") log(tx, p, camp, `${names} stand${sOf(met)} to meet the ${enc0.kind}. The referee opens the fight.`, null, { kind: "meeting" });
          return done({ ok: true, outcome: "stand" });
        }
        if (op === "parley") {
          const m = monsterOf(enc0.kind);
          const r = rules.encounterReaction({ intelligence: enc0.band ? "intelligent" : m?.mind?.intelligence ?? "average", surprisedParty: enc0.surprise === "monsters", monsterSurprised: enc0.surprise === "party", distanceFeet: (enc0.yards ?? 100) * 3 }, () => (rollDie(6) - 0.5) / 6);
          const text = r.rolled ? `2d6 = ${r.dice.join("+")}${r.mods?.total ? ` ${r.mods.total > 0 ? "+" : ""}${r.mods.total}` : ""} = ${r.total}: ${r.result}` : `no roll: ${r.why}`;
          every((ch) => ({ encounter: { ...ch.encounter, choice: "parley", outcome: "parley", reaction: { result: r.result, total: r.total ?? null, dice: r.dice ?? null, why: r.why ?? null } } }));
          log(tx, p, camp, `${names} hail${sOf(met)} the ${enc0.kind}. Reaction ${text}. The referee puts words to it.`, null, { kind: "meeting" });
          return done({ ok: true, outcome: "parley", reaction: r.result, text });
        }
        // evade: Book III's table, then pursuit if it fails
        const woods = terrain === "woods", woodsOrSwamp = woods || terrain === "swamp";
        const ev = W.evasionChance({ partySize: met.length, metRatio: enc0.number && enc0.max ? enc0.number / enc0.max : null, surprise: enc0.surprise, woods, speed: enc0.speed ?? "even" });
        const roll = rollDie(100), slipped = roll <= ev.chance;
        const log2 = [`Evade: ${ev.notes.join("; ")} = ${ev.chance}%; rolled ${roll}: ${slipped ? "slipped away" : "they come after you"}.`];
        if (slipped) {
          every((ch) => ({ doing: "road", encounter: null, lastEncounter: { ...ch.encounter, choice: "evade", outcome: "evaded" } }));
          log(tx, p, camp, `${names} evaded the ${enc0.kind}. ${log2[0]}`, null, { kind: "meeting" });
          return done({ ok: true, outcome: "evaded", chance: ev.chance, roll });
        }
        let at = { ...h0 }, restOwed = 0, caught = false, steps = 0;
        for (let i = 0; i < 3; i++) {
          const st = W.pursuitStep({ faster: enc0.speed === "slower", woodsOrSwamp, dirD6: d6(), catchD100: rollDie(100), onD6: d6() });
          const next = W.neighbour(at, st.direction), nh = map.hexes[W.key(next.q, next.r)];
          if (nh) { at = next; learn(known, map, next); } // the party runs a hex in the pursuit's direction (the referee's map's edge stops it)
          restOwed += st.restOwed; steps++;
          log2.push(`Pursuit ${steps}: ${st.direction}${nh ? "" : " (the map ends; stood)"}, ${st.chance ? `caught on ${st.chance}: ` : "they cannot catch you: "}${st.caught ? "caught!" : "not yet"}${st.continues ? ", they keep on" : st.caught ? "" : ", they give up"}.`);
          if (st.caught) { caught = true; break; }
          if (!st.continues) break;
        }
        const endHex = map.hexes[W.key(at.q, at.r)], where = endHex?.place ?? W.TERRAIN[endHex?.t ?? terrain].label;
        if (caught) every((ch) => ({ hex: at, where, restOwed: (ch.restOwed ?? 0) + restOwed, encounter: { ...ch.encounter, choice: "evade", outcome: "caught", terrain: endHex?.t ?? terrain, yards: 10, log: log2 } }));
        else every((ch) => ({ hex: at, where, doing: "road", restOwed: (ch.restOwed ?? 0) + restOwed, encounter: null, lastEncounter: { ...ch.encounter, choice: "evade", outcome: "escaped", log: log2 } }));
        save();
        log(tx, p, camp, `${names} ran from the ${enc0.kind}. ${log2.join(" ")}${caught ? " The referee opens the fight." : ` Half a day's rest owed for each hex run (${restOwed}).`}`, null, { kind: "meeting" });
        return done({ ok: true, outcome: caught ? "caught" : "escaped", chance: ev.chance, roll, end: at, restOwed, log: log2 });
      }

      if (op === "move" || op === "camp") {
        // several named who aren't yet one party set off as one (each his own player's, or the referee's say)
        let band = party;
        if (ids.length > 1 && !ids.every((id) => band.members.some((m) => m.id === id))) {
          if (!ref && ids.some((id) => !owns(byId(id), uid))) return refuse("forbidden", "not your character");
          const g = P.regroup(above(), ids, null, hk);
          if (!g.ok) return refuse("bad-request", "the party must start in one hex");
          for (const [id, pid] of Object.entries(g.set)) { const i = all.findIndex((c) => c.id === id); all[i] = { ...all[i], party: pid }; }
          band = partyHolding(ids[0]);
        } else if (!walks) return refuse("forbidden", leaderSays);
        const members = band.members, names = nameList(members);
        const waiting = members.find((c) => c.doing === "encounter");
        if (waiting) return refuse("bad-request", `${waiting.name} has an encounter waiting on the referee`);
        const h0 = hexOf(band.leader), terrain0 = map.hexes[W.key(h0.q, h0.r)]?.t ?? "clear";
        const spent0 = P.daySpent(band), today = Math.max(...members.map((c) => dayOf(c, day0)));
        const asCh = members.map((ch) => ({ id: ch.id, ch }));

        if (op === "camp") {
          if (spent0 > 0) {
            // the day's march ends here: the day's one check for wandering monsters, by the terrain the party stops on
            const enc = W.hasEncounter(terrain0, d6()) ? W.wanderingMonster(terrain0, rollDie) : null;
            const met = enc ? meeting({ ...enc, day: today }, asCh, terrain0) : null;
            for (const ch of members) put(ch.id, { ...pay(ch, today), party: band.id, hex: h0, day: today, dayMoved: 0, daysWalked: (ch.daysWalked ?? 0) + 1, doing: enc ? "encounter" : ch.doing, encounter: met });
            log(tx, p, camp, `Day ${today}. ${names} made camp in the ${W.TERRAIN[terrain0].label}.${met ? ` At the day's end: ${met.band ? `${met.band.leader.name}, a ${met.kind}, with ${met.band.men.length} men${met.band.mounted ? ", mounted" : ""}` : `${met.kind} (${met.type})${met.number ? `, about ${met.number}` : ""}`}, ${met.yards} yards off${met.surprise === "monsters" ? ", and they have the drop on you" : met.surprise === "party" ? ", unaware of you" : ""}. Evade, parley or stand.` : " A quiet night."}`, null, { kind: met ? "meeting" : "travel" });
            return done({ ok: true, day: today, encounter: enc, rested: false });
          }
          // a day at rest on the road: two dice for wandering monsters
          const day = today + 1;
          let enc = null;
          for (let i = 0; i < 2 && !enc; i++) if (W.hasEncounter(terrain0, d6())) enc = W.wanderingMonster(terrain0, rollDie);
          const met = enc ? meeting({ ...enc, day }, asCh, terrain0) : null;
          for (const ch of members) put(ch.id, { ...pay(ch, day), party: band.id, hex: h0, day, dayMoved: 0, daysWalked: 0, restOwed: 0, doing: enc ? "encounter" : ch.doing === "town" ? "town" : "road", encounter: met });
          log(tx, p, camp, `Day ${day}. ${names} rested a day in the ${W.TERRAIN[terrain0].label}${enc ? ` and were found by ${enc.kind} (${enc.type}).` : ". Nothing came."}`, null, { kind: enc ? "meeting" : "travel" });
          return done({ ok: true, day, encounter: enc, rested: true });
        }

        const hexAt = (h) => map.hexes[W.key(h.q, h.r)] ?? null;
        const allowance = W.allowanceOf("foot");
        const line = (from, dir) => { const out = []; let at = from; for (let i = 0; i < allowance; i++) { at = W.neighbour(at, dir); out.push(at); } return out; };
        let path = null, lost = false, day = today, heading = null;
        if (spent0 === 0) {
          if (members.some((c) => W.mustRest(c.daysWalked ?? 0))) return refuse("bad-request", "six days on the move: the party must rest a full day first (Camp, or an inn)");
          if (members.some((c) => (c.restOwed ?? 0) >= 1)) return refuse("bad-request", "rest owed from the chase (half a day a hex): Camp a day first");
        } else if (spent0 >= allowance) return refuse("bad-request", "the day's march is done: make camp");
        const dir = typeof data.dir === "string" && W.DIRS[data.dir] ? data.dir : null;
        const to = data.to && Number.isInteger(data.to.q) && Number.isInteger(data.to.r) ? { q: data.to.q, r: data.to.r } : null;
        if (Array.isArray(data.path) && data.path.length) path = data.path.slice(0, 24).map((s) => (s && Number.isInteger(s.q) && Number.isInteger(s.r) ? { q: s.q, r: s.r } : null));
        else if (dir) { path = line(h0, dir); heading = dir; }
        else if (to) {
          if (!ref && !known.hexes[W.key(to.q, to.r)]) return refuse("bad-request", "nobody knows the way there yet: walk toward it a hex at a time");
          path = W.reach({ from: h0, spent: spent0, hexAt }).hexes[W.key(to.q, to.r)]?.path ?? null;
          if (!path) { path = []; let at = h0; while (W.distance(at, to) > 0 && path.length < allowance) { at = W.neighbour(at, W.toward(at, to)); path.push(at); } }
        }
        if (!path?.length) return refuse("bad-request", "which way?");
        if (spent0 === 0) {
          // the day begins: Book III's lost roll, by the terrain the party starts on; a lost party walks its day where the die sends it
          day = today + 1;
          lost = W.isLost(terrain0, d6());
          if (lost) { heading = W.lostDirection(d6()); path = line(h0, heading); }
        }
        const walk = W.walkPath({ from: h0, path, spent: spent0, hexAt });
        if (!walk.path.length) return refuse("bad-request", walk.reason === "unmapped" ? "the referee hasn't mapped that far" : walk.reason === "water" ? "the sea: no crossing on foot" : walk.reason === "spent" ? "not enough of the day left for that hex: make camp" : "no way there from here");
        for (const step of walk.path) learn(known, map, step);
        const end = walk.end, endHex = hexAt(end), endPlace = endHex?.place ?? null, village = !!endPlace && placeInfo(endPlace)?.kind === "village";
        if (village) learnRing(known, map, end);
        const where = endPlace ?? W.TERRAIN[endHex?.t ?? "clear"].label;
        const spent = lost ? Math.max(walk.spent, allowance) : walk.spent;
        // the day's walk is one line in the Journal, added to as the party goes on (the action bar counts the day's march)
        const trek0 = spent0 > 0 && band.leader.trek?.day === day && band.leader.trek.party === band.id ? band.leader.trek : null;
        const legs = [...(trek0?.legs ?? []), ...walk.path.map((s) => s.t)].slice(-24), astray = !!trek0?.lost || lost;
        const wrote = log(tx, p, camp, `Day ${day}. ${names} ${astray ? "lost their way and " : ""}walked ${trek0 ? "on" : heading ?? "on"} (${legs.join(", ")})${endPlace ? ` and reached ${endPlace}` : ""}.`, null,
          { kind: "travel", ...(trek0 ? { id: trek0.id, at: trek0.at } : {}), ...(endPlace ? { arrive: endPlace, owners: ownersOf(members) } : {}) });
        const trek = { id: wrote.id, at: wrote.at, day, party: band.id, legs, lost: astray };
        for (const ch of members) put(ch.id, { ...pay(ch, day), party: band.id, hex: { q: end.q, r: end.r }, where, doing: village ? "town" : "road", day, dayMoved: spent, encounter: null, trek });
        save();
        return done({ ok: true, day, lost, path: walk.path, end, reason: walk.reason, place: endPlace, spent, allowance, left: Math.max(0, allowance - spent), party: band.id });
      }

      return refuse("bad-request", `unknown op ${op}`);
    });
  }

  return { handle };
}
