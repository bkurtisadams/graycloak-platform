// odd/functions/delve-service.mjs — pass 18 (Nov 2026): exploring the dungeon levels, the players' side.
//
// oddCampaigns/{cid}/delves/{lid}   the players' map of a level and what play has changed on it: seen (a row of 0/1
//   per row of the sheet), found (secret doors found), passed (secret doors an elf has had his passing chance at),
//   sprung (traps sprung), noise (doors a failed forcing has warned), cleared (rooms whose monsters are dealt with),
//   numbers (how many a room's monsters turned out to be).
// A character underground carries under {lid, x, y, turn, spent, sinceRest, rested, fled, viaDoor, trail, listened,
//   checks}, doing "dungeon", and encounter {...} while a meeting waits. The members of a party carry the same under.
// Ops through oddWorld (the party's leader's player, or the referee, as on the kingdom map):
//   delve        {lid}                  the level as this viewer knows it and the parties on it
//   delveEnter   {lid, id}              the party at the ruin goes down the stairs (the level must be open)
//   delveMove    {lid, id, to}          walk over known squares within the turn's feet; a trap, a secret door an elf
//                                       senses, or a room's monsters stop the walk
//   delveDoor    {lid, id, at, act}     listen at, or force, a door beside the party
//   delveSearch  {lid, id}              a whole turn searching the walls touching the party's square
//   delveRest    {lid, id}              a whole turn motionless
//   delveEnd     {lid, id}              the turn ends: the wandering-monster check
//   delveLeave   {lid, id}              up the stairs and out
//   delveParty   {lid, ids, with?}      split or join underground, as on the kingdom map; delveLead {lid, id}
//   delveEvade | delveParley | delveStand {lid, id}   the party's answer to a meeting
// Only the referee: delveAdjust {lid, id, number}; delveResolve {lid, id, cleared?}.
// Rulings (Kurt, Nov 2026): rate × 20 feet a turn at the slowest member's rate, doubled in flight; the game maps for
// the players; light is left out of this pass; the leader's player walks the party and the referee may.
// Pass 19 (Kurt: always, and the referee can step in): a meeting that comes to blows is opened by the game itself as
// the campaign's live fight, on that part of the level (delve.fightSetup), the monsters run by the game. A stand,
// a flight that is caught, and a hostile reaction all open it. A monster with no record (the tables' classed men,
// Thouls) still waits on the referee.
// Traps: the spring roll is made and the trap's text told; its harm is the referee's to apply. One-way doors open
// from either side for now (the level doesn't record which way they face).

export const delvePath = (cid, lid) => `oddCampaigns/${cid}/delves/${lid}`;
const ID = /^[A-Za-z0-9_-]{1,80}$/;
const TRAIL = 60;

export function createDelveOps({ rules, now, rollDie, DUNGEONS, dungeonPath, placeKey, hexKey, openFightIn = null, isReferee = () => false }) {
  const D = rules.delve, U = rules.underworld, P = rules.parties, roster = rules.roster;
  const refuse = (code, error) => ({ ok: false, code, error });
  const clean = (o) => JSON.parse(JSON.stringify(o));
  const d6 = () => rollDie(6), rng = () => (rollDie(1000000) - 1) / 1000000;
  const owns = (ch, uid) => roster.levelOf(ch, uid) >= roster.OWNERSHIP.OWNER;
  const names = (list) => list.map((c) => c.name).join(", ");
  // a row that names several kinds (Lizards: giant or subterranean) and carries no pick yet (an older level's stock, an older meeting) is diced for here
  const rowOf = (name) => { for (const t of Object.values(rules.underworld.MONSTER_LEVEL_TABLES ?? {})) { const r = (t.rows ?? []).find((x) => x.name.toLowerCase() === String(name ?? "").toLowerCase()); if (r) return r; } return null; };
  const monsterOf = (m) => {
    const byKey = (k) => (k ? rules.MONSTERS.find((x) => x.key === k) : null) ?? null, name = String(m?.name ?? "").toLowerCase();
    const row = byKey(m?.key) ? null : rowOf(name);
    return byKey(m?.key) ?? rules.MONSTERS.find((x) => `${x.name}s`.toLowerCase() === name) ?? byKey(row?.key) ?? (row?.options ? byKey(row.options[rollDie(row.options.length) - 1]) : null);
  };
  const cellKey = (ch) => `${ch.under.lid}:${ch.under.x},${ch.under.y}`;
  const blank = () => ({ seen: null, found: [], passed: [], sprung: [], noise: [], cleared: {}, numbers: {}, peace: {} });
  const stateOf = (pt) => ({ turn: 1, spent: 0, sinceRest: 0, rested: 0, fled: false, viaDoor: false, trail: [], listened: [], checks: [], ...pt.leader.under });

  async function handle(tx, { op, data, cid, uid, ref, camp, p, log }) {
    const lid = String(data.lid ?? ""), info = DUNGEONS[lid]; if (!info) return refuse("bad-request", "no such level");
    const L = await tx.get(dungeonPath(cid, lid));
    const doc = { ...blank(), ...((await tx.get(delvePath(cid, lid))) ?? {}) };
    const all = ((await tx.list(p.characters)) ?? []).filter((c) => c && ID.test(c.id ?? ""));
    if (!L || (L.status !== "open" && !ref)) return refuse("not-found", "that level isn't open yet");
    doc.seen ??= D.blankSeen(L);
    for (const c of all) if (c.roomSettled?.lid === lid) doc.cleared[c.roomSettled.room] = true; // a fight settled in a room: its monsters are dealt with
    const found = new Set(doc.found);
    const below = () => all.filter((c) => c.under?.lid === lid);
    const partyOf = (id) => P.partyOf(below(), id, cellKey);
    const byId = (id) => all.find((c) => c.id === id) ?? null;
    const put = (id, ch) => { const next = clean({ ...ch, updatedAt: now() }); tx.set(p.character(id), next); const i = all.findIndex((c) => c.id === id); if (i >= 0) all[i] = next; };
    const save = () => tx.set(delvePath(cid, lid), clean({ ...doc, found: [...found], updatedAt: now() }));
    const rateOf = (pt) => D.partyRate(pt.members.map((m) => roster.sheetFor(m).move || 12));
    const setParty = (pt, st, extra = () => ({})) => { for (const m of pt.members) put(m.id, { ...m, under: { ...st, lid }, ...extra(m) }); };
    const say = (text, readers = null) => log(tx, p, camp, text, readers);

    /** The level and its parties as this viewer may know them. */
    const view = () => {
      const mineHere = below().some((c) => owns(c, uid));
      const parties = P.partiesOf(below(), cellKey).map((pt) => {
        const st = stateOf(pt), rate = rateOf(pt), feet = D.turnFeet(rate), within = ref || pt.members.some((m) => owns(m, uid));
        const rest = rules.restDue({ turnsSinceRest: st.sinceRest, fledOrPursuedSinceRest: st.fled }), enc = pt.leader.encounter?.underground ? pt.leader.encounter : null;
        return clean({ id: pt.id, at: { x: st.x, y: st.y }, turn: st.turn, rate, feet, spent: st.spent, left: Math.max(0, feet - st.spent), sinceRest: st.sinceRest,
          restDue: rest.due, restTurns: rest.restTurns - (st.rested ?? 0), restIn: Math.max(0, 5 - st.sinceRest), walks: P.mayWalk(pt, uid, { referee: ref, owns }),
          stairs: D.stairsAt(L, st.x, st.y)?.dir ?? null, onDoor: D.DOOR.has(D.cellAt(L, st.x, st.y)),
          doors: D.doorsBeside(L, st.x, st.y).map((c) => ({ ...c, side: D.sideOf({ x: st.x, y: st.y }, c), listened: st.listened.includes(`${c.x},${c.y}@${st.turn}`) })),
          meeting: enc ? (within ? enc : { kind: enc.kind }) : null, ...(ref ? { checks: st.checks } : {}),
          members: pt.members.map((m) => ({ id: m.id, name: m.name ?? "", owner: m.owner ?? null, cls: m.cls ?? null, level: m.level ?? 1, mine: ref || owns(m, uid), ...(within || roster.levelOf(m, uid) >= roster.OWNERSHIP.OBSERVER ? { hp: m.hp ?? 0, maxHp: m.maxHp ?? 0 } : {}) })) });
      });
      const shown = (c) => ref || D.isSeen(doc.seen, c.x, c.y);
      return clean({ lid, name: L.name, level: L.level, status: L.status, width: L.width, height: L.height, full: ref,
        cells: ref || mineHere ? (ref ? L.cells : D.maskedCells(L, doc.seen, found)) : null, ...(ref ? { seen: doc.seen } : {}),
        stairs: (L.stairs ?? []).filter(shown), sprung: doc.sprung.filter(shown), found: [...found].map((k) => { const [x, y] = k.split(",").map(Number); return { x, y }; }), parties });
    };
    const done = (out = {}) => ({ ok: true, ...out, delve: view() });

    if (op === "delve") return done();

    /* ---------- going down ---------- */
    if (op === "delveEnter") {
      if (L.status !== "open") return refuse("bad-request", "the level isn't open to the players yet");
      const above = all.filter((c) => !c.under), pt = P.partyOf(above, String(data.id ?? ""), hexKey);
      if (!pt) return refuse("not-found", "no such party on the map");
      if (!P.mayWalk(pt, uid, { referee: ref, owns })) return refuse("forbidden", "the party's leader takes it down");
      if (pt.hex !== placeKey(info.place)) return refuse("bad-request", `the stairs are at ${info.place}`);
      if (pt.members.some((m) => m.doing === "encounter")) return refuse("bad-request", "an encounter waits on the referee");
      const at = D.entrance(L); if (!at) return refuse("bad-request", "the level has no stairs up");
      doc.seen = D.reveal(L, doc.seen, at.x, at.y, found);
      const st = { lid, x: at.x, y: at.y, turn: 1, spent: 0, sinceRest: 0, rested: 0, fled: false, viaDoor: false, trail: [[at.x, at.y]], listened: [], checks: [] };
      for (const m of pt.members) put(m.id, { ...m, under: st, doing: "dungeon", where: L.name, encounter: null });
      save(); say(`${names(pt.members)} went down the stairs into ${L.name}.`);
      return done();
    }

    const many = op === "delveParty";
    const ids = many && Array.isArray(data.ids) ? [...new Set(data.ids.filter((x) => ID.test(x ?? "")))].slice(0, 12) : ID.test(data.id ?? "") ? [data.id] : [];
    if (!ids.length) return refuse("bad-request", "which character?");
    for (const id of ids) { const ch = byId(id); if (!ch) return refuse("not-found", "no such character"); if (ch.under?.lid !== lid) return refuse("bad-request", `${ch.name || "he"} isn't on this level`); }

    if (op === "delveParty") {
      if (!ref && ids.some((id) => !owns(byId(id), uid))) return refuse("forbidden", "not your character");
      const target = data.with != null && ID.test(data.with) ? partyOf(data.with) : null;
      if (data.with != null && !target) return refuse("not-found", "no such party");
      if (ids.some((id) => byId(id).encounter) || target?.members.some((m) => m.encounter)) return refuse("bad-request", "a meeting waits: the party stays as it is until it's settled");
      const g = P.regroup(below(), ids, target ? target.id : null, cellKey);
      if (!g.ok) return refuse("bad-request", g.error.replace("hex", "square"));
      const st = target ? stateOf(target) : null;
      for (const [id, pid] of Object.entries(g.set)) put(id, { ...byId(id), party: pid, ...(st && ids.includes(id) ? { under: { ...st, lid } } : {}) });
      say(target ? `${names(ids.map(byId))} joined ${target.leader.name}'s party.` : `${names(ids.map(byId))} went ${ids.length === 1 ? "his" : "their"} own way underground.`);
      return done({ party: g.party });
    }

    const pt = partyOf(ids[0]); if (!pt) return refuse("bad-request", "he isn't exploring");
    const walks = P.mayWalk(pt, uid, { referee: ref, owns });
    const st = stateOf(pt), at = { x: st.x, y: st.y }, rate = rateOf(pt), feet = D.turnFeet(rate);
    const enc = pt.leader.encounter?.underground ? pt.leader.encounter : null;
    const who = names(pt.members);

    if (op === "delveLead") {
      if (!ref && !owns(pt.leader, uid)) return refuse("forbidden", "only the leader's player hands the lead on");
      const g = P.lead(below(), ids[0], cellKey);
      for (const [id, pid] of Object.entries(g.set)) put(id, { ...byId(id), party: pid });
      say(`${byId(ids[0]).name} leads the party now.`);
      return done({ party: g.party });
    }

    /** A meeting: who is surprised, how far off, how many. */
    const meet = (state, monster, source, room = null) => {
      const m = monsterOf(monster), key = room ? room.id : null;
      const number = key && doc.numbers[key] != null ? doc.numbers[key] : monster.npc ? 1 : D.wanderingNumber({ hd: m?.hd?.count ?? 1, partySize: pt.members.length }, rollDie);
      if (key) doc.numbers[key] = number;
      const surprise = U.surpriseUnderground({ partyD6: d6(), monstersD6: d6(), partyLit: true, throughDoor: !!state.viaDoor, monstersAware: false });
      const sight = U.sightingFeet(rng, surprise === "party"), feetOff = room ? Math.min(sight, Math.max(room.w, room.h) * 10) : sight;
      const e = clean({ underground: true, lid, type: source, kind: monster.name, monsterKey: m?.key ?? monster.key ?? null, number, max: number, feet: feetOff, yards: null, surprise,
        room: key, turn: state.turn, monsterMove: m?.move?.ground ?? 12, partyMove: rate, where: L.name, day: camp.day ?? 1, choice: null, outcome: null, log: [] });
      say(`${L.name}, turn ${state.turn}: ${who} ${source === "room" ? "came upon" : "met wandering"} ${monster.name} (${number}) at ${feetOff} feet. ${surprise === "party" ? "The party is surprised." : surprise === "monsters" ? "The party surprised them." : "Neither side is surprised."}`);
      return e;
    };
    /** The meeting comes to blows: the game opens the fight on this part of the level. Returns its id, or null where it can't (no stats). */
    let why = "";
    const waits = () => `The referee opens the fight (${why}).`;
    const toBlows = (state, e) => {
      const m = monsterOf({ key: e.monsterKey, name: e.kind }), n = Math.max(0, Math.min(40, Math.trunc(Number(e.number)) || 0));
      const fighters = pt.members.filter((c) => (c.hp ?? 1) > 0);
      why = !openFightIn ? "the fight service isn't there" : camp.live ? "another fight is under way" : !m ? `${e.kind} have no fighting statistics yet` : !n ? "none of them came" : !fighters.length ? "no one in the party can fight" : "";
      if (why) return null;
      const lay = D.fightSetup(L, { at: { x: state.x, y: state.y }, trail: (state.trail ?? []).map(([x, y]) => ({ x, y })), feet: e.feet ?? 60, room: e.room ? (L.rooms ?? []).find((r) => r.id === e.room) ?? null : null, found, party: fighters.map(() => 1), monsters: Array(n).fill(m.size ?? 1) });
      const figures = []; let id = 1;
      fighters.forEach((c, i) => { const at = lay.party[i], f = roster.toFigure(c, { id: id++, side: "A" }); figures.push({ ...f, ...(at ? { x: at.x, y: at.y, facing: at.facing, placed: true } : { placed: false }) }); });
      lay.monsters.forEach((at, i) => { if (at) figures.push({ id: id++, side: "B", kind: "monster", monsterKey: m.key, name: `${m.name} ${i + 1}`, ac: m.ac, size: m.size ?? 1, stance: "attack", target: null, action: "melee", x: at.x, y: at.y, facing: at.facing, placed: true }); });
      if (!figures.some((f) => f.side === "B") || !figures.some((f) => f.side === "A" && f.placed)) { why = "there is no room to stand them on the map here"; return null; }
      const control = Object.fromEntries(figures.map((f) => [f.id, f.side === "B" ? "game" : (() => { const o = fighters.find((c) => c.id === f.charId)?.owner, lead = fighters[0].owner; return o && !isReferee(camp, o) ? o : lead && !isReferee(camp, lead) ? lead : "referee"; })()]));
      const fid = `delve-${now().toString(36)}-${rollDie(1000000).toString(36)}`;
      const r = openFightIn(tx, { cid, fid, title: `${e.kind} \u00b7 ${L.name} \u00b7 turn ${state.turn}`, uid, camp, control, extra: { delve: { lid, room: e.room ?? null } },
        state: { figures, nextId: id, phase: "setup", round: 0, step: "init", firstSide: null, contacts: new Map(), winner: null, width: D.FIGHT_W, height: D.FIGHT_H, walls: lay.walls, chests: [] } });
      if (!r.ok) { why = r.error ?? "the fight couldn't be opened"; return null; }
      tx.set(`oddCampaigns/${cid}`, clean({ ...camp, live: { fid, at: now() } }));
      return fid;
    };
    /** The turn ends: the count toward rest, the wandering-monster check on a d6. */
    const endTurn = (state, { resting = false } = {}) => {
      const roll = d6(), next = { ...state, turn: state.turn + 1, spent: 0, sinceRest: resting ? state.sinceRest : state.sinceRest + 1, checks: [...(state.checks ?? []), { turn: state.turn, roll }].slice(-6) };
      const e = U.wanderingDue(roll) ? meet(next, U.rollDungeonMonster(L.level, rng), "wandering") : null;
      return { state: next, roll, enc: e };
    };

    /* ---------- a meeting's answer ---------- */
    if (["delveEvade", "delveParley", "delveStand", "delveAdjust", "delveResolve"].includes(op)) {
      if (!enc) return refuse("bad-request", "no meeting waits");
      const every = (patch) => setParty(pt, st, (m) => patch(m));
      if (op === "delveAdjust") {
        if (!ref) return refuse("forbidden", "the number is the referee's option");
        const number = Math.max(0, Math.min(500, Math.trunc(Number(data.number)) || 0));
        if (enc.room) doc.numbers[enc.room] = number;
        every(() => ({ encounter: { ...enc, number, adjusted: true } })); save();
        say(`The referee makes it ${number} ${enc.kind}.`);
        return done({ number });
      }
      if (op === "delveResolve") {
        if (!ref) return refuse("forbidden", "only the referee settles a meeting");
        if (enc.room && data.cleared) doc.cleared[enc.room] = true;
        every(() => ({ encounter: null, lastEncounter: { ...enc, outcome: enc.outcome ?? "passed" } })); save();
        say(data.cleared ? `The ${enc.kind} are dealt with.` : `The referee let ${who} go on.`);
        return done();
      }
      if (!walks) return refuse("forbidden", "the party's leader answers for it");
      // a meeting already come to blows with no fight open (one from before the game opened them itself, or one it couldn't open) may be stood again
      const noFight = op === "delveStand" && (!enc.fid || camp.live?.fid !== enc.fid);
      if (enc.choice && !ref && !noFight) return refuse("bad-request", `the party already chose to ${enc.choice}`);
      if (op === "delveStand" && enc.fid && camp.live?.fid === enc.fid) return refuse("bad-request", "the fight is on already");
      if (op === "delveParley" && enc.parleyed) return refuse("bad-request", "the party has hailed them already");
      if (op === "delveStand") {
        const fid = toBlows(st, enc);
        every(() => ({ encounter: { ...enc, choice: "stand", outcome: "stand", fid } }));
        say(`${who} stand to meet the ${enc.kind}. ${fid ? "The fight is on." : waits()}`);
        return done({ outcome: "stand", fid, text: fid ? "The fight is on." : waits() });
      }
      if (op === "delveParley") {
        const m = monsterOf({ key: enc.monsterKey, name: enc.kind });
        const r = rules.encounterReaction({ intelligence: m?.mind?.intelligence ?? "average", surprisedParty: enc.surprise === "party", monsterSurprised: enc.surprise === "monsters", distanceFeet: enc.feet ?? 60 }, () => (rollDie(6) - 0.5) / 6);
        const text = r.rolled ? `2d6 = ${r.dice.join("+")}${r.mods?.total ? ` ${r.mods.total > 0 ? "+" : ""}${r.mods.total}` : ""} = ${r.total}: ${r.result}` : `no roll: ${r.why}`;
        const reaction = { result: r.result, total: r.total ?? null, dice: r.dice ?? null, why: r.why ?? null }, ER = rules.EncounterReaction ?? {};
        // the game reads the dice itself (Kurt: always): hostile, it is a fight; friendly, they let the party be; between, the party must run or stand
        if (r.result === ER.NEGATIVE) {
          const fid = toBlows(st, enc);
          every(() => ({ encounter: { ...enc, choice: "parley", outcome: fid ? "attacked" : "parley", reaction, fid } }));
          say(`${who} hail the ${enc.kind}. Reaction ${text}. ${fid ? "They attack: the fight is on." : waits()}`);
          return done({ outcome: fid ? "attacked" : "parley", reaction: r.result, text: `${text}. They attack.`, fid });
        }
        if (r.result === ER.POSITIVE) {
          if (enc.room) { doc.peace = { ...(doc.peace ?? {}), [enc.room]: true }; save(); }
          every(() => ({ encounter: null, lastEncounter: { ...enc, choice: "parley", outcome: "friendly", reaction } }));
          say(`${who} hail the ${enc.kind}. Reaction ${text}. They let the party be.`);
          return done({ outcome: "friendly", reaction: r.result, text: `${text}. They let the party be.` });
        }
        every(() => ({ encounter: { ...enc, parleyed: true, reaction } }));
        say(`${who} hail the ${enc.kind}. Reaction ${text}. They stand wary: the party must run or stand.`);
        return done({ outcome: "wary", reaction: r.result, text: `${text}. They stand wary: run, or stand.` });
      }
      // evade: Book III, Avoiding Monsters
      if (!U.mayAvoid({ monstersSurprisedParty: enc.surprise === "party", feet: enc.feet ?? Infinity, monstersSurprised: enc.surprise === "monsters" })) {
        const fid = toBlows(st, enc);
        every(() => ({ encounter: { ...enc, choice: "evade", outcome: "caught", fid, log: [`Surprised within ${U.NO_AVOID_FEET} feet: no getting away.`] } }));
        say(`${who} were surprised within ${U.NO_AVOID_FEET} feet of the ${enc.kind}: there is no getting away. ${fid ? "The fight is on." : waits()}`);
        return done({ outcome: "caught", fid });
      }
      const f = D.flightRoute(L, st.trail.map(([x, y]) => ({ x, y })), at, D.turnFeet(rate, { flight: true }) / D.SQUARE_FEET), lines = [];
      let shaken = false;
      for (const past of f.breaks) { const roll = d6(), on = U.pursuitContinues(roll, { past }); lines.push(`Past a ${past === "secret" ? "secret door" : past}: ${roll}, ${on ? "they keep on" : "they give up"}.`); if (!on) { shaken = true; break; } }
      const caught = !shaken && (!f.route.length || (enc.monsterMove ?? 12) >= rate);
      if (!shaken) lines.push(!f.route.length ? "Nowhere known to run." : caught ? `They are as fast as the party (${enc.monsterMove}" against ${rate}").` : `The party is faster (${rate}" against ${enc.monsterMove}") and draws out of sight.`);
      const cut = st.trail.length - f.route.length - (f.route.length && st.trail.at(-1)?.[0] === at.x && st.trail.at(-1)?.[1] === at.y ? 1 : 0);
      const next = { ...st, x: f.end.x, y: f.end.y, turn: st.turn + 1, spent: 0, sinceRest: st.sinceRest + 1, fled: true, rested: 0, viaDoor: false, trail: [...st.trail.slice(0, Math.max(0, cut)), [f.end.x, f.end.y]].slice(-TRAIL) };
      const fid = caught ? toBlows(next, { ...enc, feet: 10, room: null }) : null;
      setParty(pt, next, () => (caught ? { encounter: { ...enc, choice: "evade", outcome: "caught", feet: 10, fid, log: lines } } : { encounter: null, lastEncounter: { ...enc, choice: "evade", outcome: "escaped", log: lines } }));
      say(`${who} ran from the ${enc.kind}, ${f.route.length * 10} feet back the way they came. ${lines.join(" ")}${caught ? (fid ? " Caught: the fight is on." : ` Caught. ${waits()}`) : " They got away; the next rest is doubled."}`);
      return done({ outcome: caught ? "caught" : "escaped", log: lines, fid });
    }

    if (!walks) return refuse("forbidden", "the party's leader walks it; take your own out of the party to go your own way");
    if (enc) return refuse("bad-request", `the ${enc.kind} must be answered first`);
    const rest = rules.restDue({ turnsSinceRest: st.sinceRest, fledOrPursuedSinceRest: st.fled });

    if (op === "delveLeave") {
      const s = D.stairsAt(L, at.x, at.y);
      if (!s) return refuse("bad-request", "the party isn't on the stairs");
      if (s.dir !== "up") return refuse("bad-request", "the level below isn't laid out yet");
      for (const m of pt.members) put(m.id, { ...m, under: null, doing: "road", where: info.place });
      say(`${who} climbed out of ${L.name} after ${st.turn - 1} turn${st.turn === 2 ? "" : "s"} below.`);
      return done({ left: true });
    }

    if (op === "delveMove") {
      if (rest.due) return refuse("bad-request", `the party must rest ${rest.restTurns - (st.rested ?? 0) > 1 ? "two turns" : "a turn"} before it goes on`);
      const to = { x: Math.trunc(Number(data.to?.x)), y: Math.trunc(Number(data.to?.y)) };
      const path = D.pathTo(L, doc.seen, found, at, to);
      if (!path || !path.length) return refuse("bad-request", "the party can't walk there from here");
      if (feet - st.spent < D.SQUARE_FEET) return refuse("bad-request", "no movement left this turn: end the turn");
      const next = { ...st }, events = []; let met = null, here = at;
      for (const c of path) {
        if (feet - next.spent < D.SQUARE_FEET) break;
        next.viaDoor = D.DOOR.has(D.cellAt(L, here.x, here.y));
        next.x = c.x; next.y = c.y; next.spent += D.SQUARE_FEET; next.trail = [...next.trail, [c.x, c.y]].slice(-TRAIL); here = c;
        doc.seen = D.reveal(L, doc.seen, c.x, c.y, found);
        let stop = false;
        for (const s of D.secretsBeside(L, c.x, c.y, found)) {
          const k = D.key(s.x, s.y); if (doc.passed.includes(k)) continue;
          doc.passed.push(k);
          const elf = pt.members.find((m) => String(m.race ?? "").toLowerCase() === "elf");
          if (elf && U.secretDoorFound("elf", d6(), { passing: true })) { found.add(k); doc.seen = D.reveal(L, doc.seen, c.x, c.y, found); events.push(`${elf.name} senses a secret door to the ${D.sideOf(c, s)}.`); stop = true; }
        }
        const t = D.trapAt(L, c.x, c.y);
        if (t && !doc.sprung.some((s) => s.x === t.x && s.y === t.y) && U.trapSprings(d6())) { doc.sprung.push({ x: t.x, y: t.y, text: t.text, turn: next.turn }); events.push(`A trap springs: ${t.text}.`); stop = true; }
        const room = D.cellAt(L, c.x, c.y) === "r" ? D.roomAt(L, c.x, c.y) : null, mon = room ? L.stock?.[room.id]?.monster : null;
        if (mon && !doc.cleared[room.id] && !doc.peace?.[room.id]) { met = meet(next, mon, "room", room); stop = true; }
        if (stop) break;
      }
      setParty(pt, next, () => (met ? { encounter: met } : {})); save();
      if (events.length) say(`${L.name}, turn ${next.turn}: ${events.join(" ")}`);
      return done({ events, moved: next.spent - st.spent });
    }

    if (op === "delveDoor") {
      const door = D.doorsBeside(L, at.x, at.y).find((c) => c.x === Math.trunc(Number(data.at?.x)) && c.y === Math.trunc(Number(data.at?.y)));
      if (!door) return refuse("bad-request", "no door there beside the party");
      const side = D.sideOf(at, door), k = D.key(door.x, door.y), { room } = D.beyondDoor(L, door, at);
      const mon = room && !doc.cleared[room.id] ? L.stock?.[room.id]?.monster : null, m = mon ? monsterOf(mon) : null;
      if (data.act === "listen") {
        const tag = `${k}@${st.turn}`;
        if (st.listened.includes(tag)) return refuse("bad-request", "the party has listened at this door this turn");
        const heard = pt.members.filter((c) => U.noiseHeard(c.race, d6(), { undead: m?.folder === "undead" }) && mon);
        setParty(pt, { ...st, listened: [...st.listened, tag].slice(-12) });
        const text = heard.length ? `${names(heard)} hear${heard.length === 1 ? "s" : ""} something moving beyond the ${side} door.` : `Nothing is heard at the ${side} door.`;
        say(`${L.name}, turn ${st.turn}: ${text}`, [...new Set(pt.members.map((c) => c.owner).filter(Boolean))]);
        return done({ heard: heard.length > 0, text });
      }
      if (data.act !== "force") return refuse("bad-request", "listen, or force it?");
      if (rest.due) return refuse("bad-request", "the party must rest before it goes on");
      if (feet - st.spent < D.SQUARE_FEET) return refuse("bad-request", "no movement left this turn: end the turn");
      const forcers = pt.members.slice(0, U.MAX_DOOR_FORCERS), rolls = forcers.map((c) => ({ name: c.name, roll: d6(), small: String(c.race ?? "").toLowerCase() === "halfling" }));
      const open = rolls.some((r) => U.doorForced(r.roll, { small: r.small })), dice = rolls.map((r) => `${r.name} ${r.roll}`).join(", ");
      if (!open) {
        if (!doc.noise.includes(k)) doc.noise.push(k);
        save(); const text = `The ${side} door holds (${dice}).`;
        say(`${L.name}, turn ${st.turn}: ${text}`);
        return done({ open: false, text });
      }
      doc.seen = D.reveal(L, doc.seen, door.x, door.y, found);
      if (room) { const far = D.beyondDoor(L, door, at).far; doc.seen = D.reveal(L, doc.seen, far.x, far.y, found); } // the door open, the room beyond is seen
      setParty(pt, { ...st, x: door.x, y: door.y, spent: st.spent + D.SQUARE_FEET, viaDoor: true, trail: [...st.trail, [door.x, door.y]].slice(-TRAIL) }); save();
      const text = `The ${side} door gives (${dice}).`;
      say(`${L.name}, turn ${st.turn}: ${text}`);
      return done({ open: true, text });
    }

    if (op === "delveSearch" || op === "delveRest" || op === "delveEnd") {
      const whole = op !== "delveEnd";
      if (whole && st.spent > 0) return refuse("bad-request", `${op === "delveRest" ? "a rest" : "a search"} takes the whole turn: end this one first`);
      const events = []; let state = { ...st };
      if (op === "delveSearch") {
        if (rest.due) return refuse("bad-request", "the party must rest before it goes on");
        const hits = D.secretsBeside(L, at.x, at.y, found).filter(() => pt.members.some((c) => U.secretDoorFound(c.race, d6())));
        for (const s of hits) { found.add(D.key(s.x, s.y)); events.push(`A secret door, to the ${D.sideOf(at, s)}.`); }
        if (hits.length) doc.seen = D.reveal(L, doc.seen, at.x, at.y, found); else events.push("The search finds nothing.");
      }
      if (op === "delveRest") {
        const rested = (st.rested ?? 0) + 1, enough = rested >= rest.restTurns;
        state = { ...state, rested: enough ? 0 : rested, sinceRest: enough ? 0 : st.sinceRest, fled: enough ? false : st.fled };
        events.push(enough ? "The party rests a turn." : "The party rests; one more turn after its flight.");
      }
      const end = endTurn(state, { resting: op === "delveRest" });
      setParty(pt, end.state, () => (end.enc ? { encounter: end.enc } : {})); save();
      if (events.length) say(`${L.name}, turn ${st.turn}: ${events.join(" ")}`);
      return done({ events, wandering: !!end.enc });
    }
    return refuse("bad-request", "no such op underground");
  }
  return { handle };
}
