// odd/functions/world-service.mjs — pass 7 (Oct 2026): the map. oddWorld.
//
// Book III's wilderness, the home village, and the players' blank hex sheet.
// oddCampaigns/{cid}/world/map     the referee's map: hexes keyed "q,r" (seeded from the Westmark key); the referee reads it
// oddCampaigns/{cid}/world/known   the players' map: what they have seen or heard, keyed "q,r" (rumoured: true until walked)
// oddCampaigns/{cid}/world/rumours the referee's per-settlement rumour lists {place: [{text, truth, reveals?, told?}]}
// A character carries hex {q,r}, where (a place name, or the terrain), doing (town | road | rest | encounter | dead),
// day (his own clock, Book III's per-player time record), daysWalked, and encounter {type, kind, terrain} while one waits on the referee.
// Ops (a member, for characters he owns; the referee for any):
//   map                    the known map (the referee: the whole map), the places, the home
//   move   {ids, dir|to}   the party (all in one hex, none resting, dead or waiting on an encounter) walks a day; lost and
//                          wandering-monster rolls; walked hexes become known; arriving at a village learns its ring
//   camp   {ids}           a day's rest on the road (two encounter checks); clears daysWalked
//   rest   {id, days}      complete rest at an inn: hp back (none day 1, one every other day after); his clock moves on
//   rumour {id}            the rounds of the taverns (10-60 gp + 1-10 gp): one rumour, marked on the known map if it names a hex
//   shop   {id, buy|sell}  the market: buy at cost, sell at half (finished characters, in a village with a market)
//   enter  {id, place}     into the village he stands in (where = place, doing = town) or out onto the road (doing = road)
// Only the referee:
//   resolve {id}           an encounter dealt with (a fight opened or the party let go): doing back to road
//   rumours {place, list}  set a settlement's rumour list
// Rulings (Kurt, Oct 2026): a lone character walks as a party of one; the players start knowing the home village and its ring.

import { isReferee } from "./campaign-service.mjs";

const ID = /^[A-Za-z0-9_-]{1,80}$/;

export const worldPaths = (cid) => ({
  campaign: `oddCampaigns/${cid}`,
  character: (id) => `oddCampaigns/${cid}/characters/${id}`,
  map: `oddCampaigns/${cid}/world/map`,
  known: `oddCampaigns/${cid}/world/known`,
  rumours: `oddCampaigns/${cid}/world/rumours`,
  chat: (who, id) => `oddCampaigns/${cid}/chat/${who}/entries/${id}`,
});

export function createWorldService({ rules, store, now = () => Date.now(), rollDie = (n) => 1 + Math.floor(Math.random() * n) }) {
  const { roster, wilderness: W } = rules;
  const refuse = (code, error) => ({ ok: false, code, error });
  const clean = (o) => JSON.parse(JSON.stringify(o));
  const d6 = () => rollDie(6);
  const owns = (ch, uid) => roster.levelOf(ch, uid) >= roster.OWNERSHIP.OWNER;
  const hexOf = (ch) => ch.hex ?? { ...W.WESTMARK.places[W.WESTMARK.home] };
  const placeAt = (map, h) => map[W.key(h.q, h.r)]?.place ?? null;
  const placeInfo = (name) => (name && W.WESTMARK.places[name]) || null;

  /** A line in the lobby chat for the referee and the named readers (or every player). */
  function log(tx, p, camp, text, readers = null, extra = {}) {
    const all = (camp.members ?? []).filter((u) => !isReferee(camp, u));
    const to = readers ? ["referee", ...readers] : ["referee", ...all];
    const at = now(), id = `${String(at).padStart(14, "0")}-world-${Math.floor(Math.random() * 1e6)}`;
    const entry = clean({ id, at, uid: "world", person: W.WESTMARK.name, color: null, as: null, side: null, to: readers ? "referee" : "all", toName: readers ? null : null, text, ...extra });
    for (const r of [...new Set(to)]) tx.set(p.chat(r, id), entry);
  }

  async function loadMaps(tx, p) {
    let map = await tx.get(p.map), known = await tx.get(p.known);
    let seeded = false;
    if (!map) { map = { hexes: W.fullMap(), seededAt: now() }; seeded = true; }
    if (!known) { known = { hexes: W.startingKnowledge() }; seeded = true; }
    return { map, known, seeded };
  }
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
      const camp = await tx.get(p.campaign);
      if (!camp) return refuse("not-found", "no such game");
      const ref = isReferee(camp, uid);
      if (!ref && !(camp.members ?? []).includes(uid)) return refuse("forbidden", "you are not in this game");
      const { map, known, seeded } = await loadMaps(tx, p);
      const save = () => { if (seeded) { tx.set(p.map, clean(map)); } tx.set(p.known, clean(known)); };

      if (op === "map") {
        const rumours = ref ? (await tx.get(p.rumours)) ?? {} : undefined;
        if (seeded) save();
        return { ok: true, home: W.WESTMARK.home, places: W.WESTMARK.places, hexes: ref ? map.hexes : known.hexes, full: ref, ...(ref ? { rumours, defaults: { [W.WESTMARK.home]: W.WESTMARK.rumours } } : {}) };
      }

      if (op === "rumours") {
        if (!ref) return refuse("forbidden", "only the referee writes the rumours");
        const place = String(data.place ?? ""); if (!placeInfo(place)) return refuse("bad-request", "no such place");
        const list = (Array.isArray(data.list) ? data.list : []).slice(0, 50).map((r) => clean({ text: String(r.text ?? "").slice(0, 400), truth: !!r.truth, ...(r.reveals && Number.isInteger(r.reveals.q) && Number.isInteger(r.reveals.r) ? { reveals: { q: r.reveals.q, r: r.reveals.r } } : {}) }));
        const cur = (await tx.get(p.rumours)) ?? {};
        tx.set(p.rumours, clean({ ...cur, [place]: list }));
        return { ok: true, count: list.length };
      }

      // the characters this op is about
      const ids = op === "move" || op === "camp" ? (Array.isArray(data.ids) ? data.ids : []).filter((x) => ID.test(x ?? "")).slice(0, 12) : ID.test(data.id ?? "") ? [data.id] : [];
      if (!ids.length) return refuse("bad-request", "which character?");
      const chars = [];
      for (const id of ids) {
        const ch = await tx.get(p.character(id)); if (!ch) return refuse("not-found", "no such character");
        if (!ref && !owns(ch, uid)) return refuse("forbidden", "not your character");
        if (ch.status !== "ready") return refuse("bad-request", `${ch.name || "he"} isn't finished`);
        chars.push({ id, ch });
      }
      const day0 = camp.day ?? 1;
      const put = (id, ch) => tx.set(p.character(id), clean({ ...ch, updatedAt: now() }));
      const names = chars.map((c) => c.ch.name).join(", ");
      const owners = [...new Set(chars.map((c) => c.ch.owner).filter(Boolean))];

      if (op === "enter") {
        const [{ id, ch }] = chars; const h = hexOf(ch), place = placeAt(map.hexes, h);
        if (ch.doing === "dead") return refuse("bad-request", "he is dead");
        if (ch.doing === "encounter") return refuse("bad-request", "an encounter waits on the referee");
        if (data.place === "road") { put(id, { ...ch, hex: h, where: place ?? W.TERRAIN[map.hexes[W.key(h.q, h.r)]?.t ?? "clear"].label, doing: "road" }); return { ok: true }; }
        if (!place || !placeInfo(place)) return refuse("bad-request", "no village here");
        put(id, { ...ch, hex: h, where: place, doing: "town" }); return { ok: true };
      }

      if (op === "rest") {
        const [{ id, ch }] = chars; const h = hexOf(ch), place = placeAt(map.hexes, h);
        if (!place || !placeInfo(place)?.inn) return refuse("bad-request", "no inn here: rest on the road with Camp");
        if (ch.doing === "dead") return refuse("bad-request", "he is dead");
        const days = Math.min(60, Math.max(1, Math.trunc(Number(data.days ?? 1)) || 1));
        const healed = Math.min(W.healingAfter(days), Math.max(0, (ch.maxHp ?? 0) - (ch.hp ?? 0)));
        const day = Math.max(ch.day ?? day0, day0) + days;
        put(id, { ...ch, hex: h, where: place, doing: "town", day, daysWalked: 0, hp: (ch.hp ?? 0) + healed });
        log(tx, p, camp, `Day ${day}. ${ch.name} rested ${days} day${days === 1 ? "" : "s"} at ${placeInfo(place).inn}${healed ? ` and healed ${healed} hit point${healed === 1 ? "" : "s"}` : ""}.`);
        return { ok: true, healed, day };
      }

      if (op === "rumour") {
        const [{ id, ch }] = chars; const h = hexOf(ch), place = placeAt(map.hexes, h);
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

      if (op === "shop") {
        const [{ id, ch }] = chars; const h = hexOf(ch), place = placeAt(map.hexes, h);
        if (!place || !placeInfo(place)?.market) return refuse("bad-request", "no market here");
        const r = data.buy != null ? roster.buy(ch, String(data.buy), { town: true }) : data.sell != null ? roster.sell(ch, Number(data.sell), { town: true }) : null;
        if (!r) return refuse("bad-request", "buy or sell what?");
        if (!r.ok) return refuse("bad-request", r.error);
        put(id, { ...r.ch, hex: h, where: place, doing: "town" });
        return { ok: true, character: { id, ...r.ch } };
      }

      if (op === "resolve") {
        if (!ref) return refuse("forbidden", "only the referee resolves an encounter");
        for (const { id, ch } of chars) if (ch.doing === "encounter") put(id, { ...ch, doing: "road", encounter: null });
        log(tx, p, camp, `The referee let ${names} go on.`);
        return { ok: true };
      }

      if (op === "move" || op === "camp") {
        const h0 = hexOf(chars[0].ch);
        for (const { ch } of chars) {
          const h = hexOf(ch);
          if (h.q !== h0.q || h.r !== h0.r) return refuse("bad-request", "the party must start in one hex");
          if (ch.doing === "dead") return refuse("bad-request", `${ch.name} is dead`);
          if (ch.doing === "encounter") return refuse("bad-request", `${ch.name} has an encounter waiting on the referee`);
        }
        const terrain0 = map.hexes[W.key(h0.q, h0.r)]?.t ?? "clear";
        const day = Math.max(day0, ...chars.map((c) => c.ch.day ?? day0)) + 1;
        const lines = [];
        if (op === "camp") {
          // a day at rest on the road: two dice for wandering monsters
          let enc = null;
          for (let i = 0; i < 2 && !enc; i++) if (W.hasEncounter(terrain0, d6())) enc = W.wanderingMonster(terrain0, rollDie);
          for (const { id, ch } of chars) put(id, { ...ch, hex: h0, day, daysWalked: 0, doing: enc ? "encounter" : "road", encounter: enc ? { ...enc, terrain: terrain0, day } : null });
          lines.push(`Day ${day}. ${names} rested a day in the ${W.TERRAIN[terrain0].label}${enc ? ` and were found by ${enc.kind} (${enc.type}).` : ". Nothing came."}`);
          log(tx, p, camp, lines.join(" ")); return { ok: true, day, encounter: enc };
        }
        if (chars.some((c) => W.mustRest(c.ch.daysWalked ?? 0))) return refuse("bad-request", "six days on the move: the party must rest a full day first (Camp, or an inn)");
        let dir = typeof data.dir === "string" && W.DIRS[data.dir] ? data.dir : null;
        let to = data.to && Number.isInteger(data.to.q) && Number.isInteger(data.to.r) ? { q: data.to.q, r: data.to.r } : null;
        if (!dir && !to) return refuse("bad-request", "which way?");
        if (to && !ref && !known.hexes[W.key(to.q, to.r)]) return refuse("bad-request", "nobody knows the way there yet: pick a direction");
        const lost = W.isLost(terrain0, d6());
        if (lost) { dir = W.lostDirection(d6()); to = null; }
        const plan = W.planDay({ from: h0, dir, to, hexAt: (h) => map.hexes[W.key(h.q, h.r)] ?? null });
        if (!plan.path.length) return refuse("bad-request", plan.reason === "unmapped" ? "the referee hasn't mapped that far" : "no move that way");
        for (const step of plan.path) learn(known, map, step);
        const end = plan.end, endHex = map.hexes[W.key(end.q, end.r)], endPlace = endHex?.place ?? null;
        if (endPlace && placeInfo(endPlace)?.kind === "village") learnRing(known, map, end);
        let enc = null;
        if (W.hasEncounter(endHex?.t ?? "clear", d6())) enc = W.wanderingMonster(endHex?.t ?? "clear", rollDie);
        const where = endPlace ?? W.TERRAIN[endHex?.t ?? "clear"].label;
        for (const { id, ch } of chars) put(id, { ...ch, hex: { q: end.q, r: end.r }, where, doing: enc ? "encounter" : endPlace && placeInfo(endPlace)?.kind === "village" ? "town" : "road", day, daysWalked: (ch.daysWalked ?? 0) + 1, encounter: enc ? { ...enc, terrain: endHex?.t ?? "clear", day } : null });
        save();
        const walked = plan.path.map((s) => s.t).join(", ");
        lines.push(`Day ${day}. ${names} ${lost ? "lost their way and " : ""}walked ${dir ?? "toward " + (endPlace ?? "the " + where)} (${walked})${endPlace ? ` and reached ${endPlace}` : ""}.`);
        if (enc) lines.push(`At the day's end: ${enc.kind} (${enc.type}). The referee decides what happens.`);
        log(tx, p, camp, lines.join(" "));
        return { ok: true, day, lost, path: plan.path, end, reason: plan.reason, place: endPlace, encounter: enc };
      }

      return refuse("bad-request", `unknown op ${op}`);
    });
  }

  return { handle };
}
