// ---------------------------------------------------------------------------
// odd/functions/fight-service.mjs — slice 5, step 2 (Oct 2026); opening rolls on the server, pass 2
//
// The server side of an online fight, with no Firebase in it: the rules
// package and the store are handed in, so tests run it on a memory store and
// index.js runs it on Firestore. Every call is one transaction.
//
//   oddCampaigns/{cid}                                  refereeUid
//   oddCampaigns/{cid}/fights/{fid}                     header: rev, step, waitingOn, players
//   oddCampaigns/{cid}/fights/{fid}/server/state        the whole fight with its dice (server only)
//   oddCampaigns/{cid}/fights/{fid}/views/{who}         what "referee" or a player uid sees
//   oddCampaigns/{cid}/fights/{fid}/feeds/{who}/entries/{rev}   that viewer's log for one action
//   oddCampaigns/{cid}/fights/{fid}/actions/{rev}       every accepted action (server only)
//
// A client sends the rev it last saw; an older rev is refused as stale, so
// two players' moves can't cross. A refused action writes nothing.
// ---------------------------------------------------------------------------

const ID = /^[A-Za-z0-9_-]{1,64}$/;
// Player colours live in the rules package (fightView.PLAYER_COLOURS), so a player's page offers the same palette.
const pad = (n) => String(n).padStart(8, "0");
const clean = (v) => JSON.parse(JSON.stringify(v));

export function fightPaths(cid, fid) {
  const fight = `oddCampaigns/${cid}/fights/${fid}`;
  return {
    campaign: `oddCampaigns/${cid}`,
    fight,
    state: `${fight}/server/state`,
    initial: `${fight}/server/initial`,
    actions: `${fight}/actions`,
    view: (who) => `${fight}/views/${who}`,
    feed: (who, rev) => `${fight}/feeds/${who}/entries/${pad(rev)}`,
    chat: (who, id) => `${fight}/chat/${who}/entries/${id}`,
    action: (rev) => `${fight}/actions/${pad(rev)}`
  };
}

export function createFightService({ rules, store, now = () => Date.now(), newSeed = () => Math.floor(Math.random() * 2 ** 31), resolveUser = async () => null, rollDie = (n) => 1 + Math.floor(Math.random() * n) }) {
  const { fightStore, fightStart, fightView, session } = rules;
  const { PLAYER_COLOURS, REFEREE_COLOUR } = fightView;
  const RULES = fightStore.RULES_VERSION;
  const refuse = (code, error, extra = {}) => ({ ok: false, code, error, ...extra });

  const playersOf = (state) => [...new Set(Object.values(state.control ?? {}))].filter((c) => c !== "referee" && c !== "game").sort();
  const whoIs = (state, camp, uid) => (camp?.refereeUid === uid ? { referee: true } : playersOf(state).includes(uid) ? { uid } : null);

  /** Every write for a new rev: state, header, a view and a feed entry per viewer, the action record. */
  function writeFight(tx, p, state, events, { rev, uid, action, header }) {
    state.rev = rev;
    tx.set(p.state, clean(fightStore.toStored(state)));
    tx.set(p.fight, clean({
      ...(header ?? {}), rev, rules: RULES, phase: state.phase, round: state.round ?? 0, step: state.step ?? null,
      firstSide: state.firstSide ?? null, winner: state.winner ?? null, waitingOn: session.waitingOn(state), unready: session.unreadyIds(state),
      readyCount: session.readyCount(state), players: playersOf(state), people: state.people ?? {}, updatedAt: now()
    }));
    const viewers = [["referee", { referee: true }], ...playersOf(state).map((u) => [u, { uid: u }])];
    for (const [key, who] of viewers) {
      tx.set(p.view(key), clean({ ...fightView.viewFor(state, who), rev }));
      const seen = fightView.eventsFor(events, state, who);
      if (seen.length) tx.set(p.feed(key, rev), clean({ rev, at: now(), by: uid, events: seen }));
    }
    if (action) tx.set(p.action(rev), clean({ rev, uid, action, at: now() }));
  }

  /**
   * The referee opens a fight: data { cid, fid, title, fight (a stored fight,
   * fightStore.toStored), control { figureId: uid | "referee" | "game" },
   * players { figureId: email } }. The server seeds the dice itself and looks
   * each email up as the account that player signs in with (the referee's own
   * email means he runs that figure). A campaign that doesn't exist yet is
   * made with the caller as its referee.
   */
  async function create({ uid, name, data }) {
    if (!uid) return refuse("auth", "sign in first");
    const { cid, fid, title = "", fight, control = {}, players = {} } = data ?? {};
    if (!ID.test(cid ?? "") || !ID.test(fid ?? "")) return refuse("bad-request", "campaign and fight ids are letters, digits, - and _");
    if ((data?.rules ?? null) !== RULES) return refuse("rules", `the page runs rules ${data.rules ?? "unknown"}, the server ${RULES}: reload the page`);
    let state;
    try { state = fightStore.fromStored(fight); } catch (e) { return refuse("bad-request", e.message); }
    const ids = new Set((state.figures ?? []).map((f) => String(f.id)));
    for (const [k, v] of Object.entries(control)) if (!ids.has(String(k)) || typeof v !== "string" || !v || v.length > 128) return refuse("bad-request", `control for figure ${k} is not valid`);
    state.control = { ...control };
    // Names and colours for the Players panel and the token rings.
    const people = { referee: { name: String(name || "Referee").slice(0, 60), color: REFEREE_COLOUR } };
    for (const [k, raw] of Object.entries(players ?? {})) {
      const email = String(raw ?? "").trim().toLowerCase();
      if (!email) continue;
      if (!ids.has(String(k))) return refuse("bad-request", `there is no figure ${k}`);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return refuse("bad-request", `"${raw}" is not an email address`);
      const found = await resolveUser(email);
      const who = typeof found === "string" ? { uid: found, name: email } : found;
      if (!who?.uid) return refuse("no-account", `No one has signed in as ${email} yet. The player signs in once on the player's page, then open the fight again.`);
      if (who.uid === uid) { state.control[k] = "referee"; continue; }
      state.control[k] = who.uid;
      if (!people[who.uid]) people[who.uid] = { name: String(who.name || email).slice(0, 60), color: PLAYER_COLOURS[(Object.keys(people).length - 1) % PLAYER_COLOURS.length] };
    }
    state.people = people;
    // The server rolls every opening die (hit points, coins, languages) from its own seed: whatever the page rolled is discarded.
    const { rng, event: opened } = fightStart.openFight(state, newSeed());
    const events = [opened, { type: "round", round: state.round ?? 0 }];
    if (state.phase === "fight") events.push(...session.advance(state, rng));
    const p = fightPaths(cid, fid);
    return store.run(async (tx) => {
      const camp = await tx.get(p.campaign), existing = await tx.get(p.fight);
      if (camp && camp.refereeUid !== uid) return refuse("forbidden", "only the campaign's referee opens fights");
      if (existing) return refuse("exists", `fight ${fid} already exists`);
      if (!camp) tx.set(p.campaign, { refereeUid: uid, system: "odd", createdAt: now() });
      writeFight(tx, p, state, events, { rev: 1, uid, header: { title: String(title).slice(0, 120), createdBy: uid, createdAt: now() } });
      // the fight as it opened: Undo replays the accepted actions from here
      tx.set(p.initial, clean(fightStore.toStored(state)));
      // players: who was put in the fight, so the page can confirm the emails took.
      return { ok: true, fid, rev: 1, players: playersOf(state) };
    });
  }

  const VERB = { move: "moved", "close-on": "closed in", "group-move": "moved as a group", "split-fire": "fired in mid-move", "charge-mode": "changed charge", orders: "changed orders", "draw-weapon": "drew a weapon", ready: "marked Ready", unready: "took Ready back", "undo-move": "undid a move", gm: "GM tool", leader: "set a leader", parley: "parleyed", "offer-service": "offered service", elect: "elected", "force-next": "advanced the step", "step-back": "went back a step" };
  const describe = (state, rec) => {
    const a = rec.action ?? {}, ids = [a.id, a.pcId, ...(a.ids ?? [])].filter((x) => x != null);
    const names = ids.map((id) => state.figures.find((f) => f.id === id)?.name).filter(Boolean);
    return `${names.length ? `${names.join(", ")}: ` : ""}${VERB[a.type] ?? a.type}`;
  };

  /**
   * Undo (the referee): take back the last action not already undone. The
   * fight is rebuilt from the state it opened with by replaying every other
   * accepted action in order, with the same dice; the undone record is kept,
   * marked undone, so it never replays.
   */
  async function undo(tx, p, uid, camp, header) {
    const initial = await tx.get(p.initial);
    if (!initial) return refuse("no-undo", "this fight was opened before Undo existed; open a new fight to use it");
    const recs = (await tx.list(p.actions)).sort((a, b) => a.rev - b.rev);
    const live = recs.filter((r) => !r.undone && r.action?.type !== "undo");
    const last = live.at(-1);
    if (!last) return refuse("nothing", "nothing to undo");
    const state = fightStore.fromStored(initial);
    for (const r of live.slice(0, -1)) {
      const who = r.uid === camp?.refereeUid ? { referee: true } : { uid: r.uid };
      const res = session.applyAs(state, who, r.action, fightStore.rngOf(state));
      if (!res.ok) return refuse("replay", `the fight couldn't be rebuilt (rev ${r.rev}: ${res.error})`);
    }
    const next = header.rev + 1, what = describe(state, last);
    writeFight(tx, p, state, [{ type: "undo", rev: last.rev, what }], { rev: next, uid, action: { type: "undo", undoes: last.rev }, header });
    tx.set(p.action(last.rev), clean({ ...last, undone: true, undoneAt: now() }));
    return { ok: true, rev: next, events: [{ type: "undo", rev: last.rev, what }] };
  }

  /** One action: data { cid, fid, rev, rules, action }. */
  async function act({ uid, data }) {
    if (!uid) return refuse("auth", "sign in first");
    const { cid, fid, rev, action } = data ?? {};
    if (!ID.test(cid ?? "") || !ID.test(fid ?? "")) return refuse("bad-request", "no such fight");
    if (!action || typeof action.type !== "string") return refuse("bad-request", "no action");
    if (!fightStore.sameRules(data.rules)) return refuse("rules", `the page runs rules ${data.rules ?? "unknown"}, the server ${RULES}: reload the page`);
    const p = fightPaths(cid, fid);
    return store.run(async (tx) => {
      const camp = await tx.get(p.campaign), header = await tx.get(p.fight), stored = await tx.get(p.state);
      if (!header || !stored) return refuse("not-found", "no such fight");
      if (rev !== header.rev) return refuse("stale", "the fight has moved on; showing the latest", { rev: header.rev });
      const state = fightStore.fromStored(stored);
      const who = whoIs(state, camp, uid);
      if (!who) return refuse("forbidden", "you are not in this fight");
      if (action.type === "undo") return who.referee ? undo(tx, p, uid, camp, header) : refuse("forbidden", "only the referee undoes");
      const r = session.applyAs(state, who, action, fightStore.rngOf(state));
      if (!r.ok) return refuse("refused", r.error, { rev: header.rev });
      const next = header.rev + 1;
      writeFight(tx, p, state, r.events, { rev: next, uid, action, header });
      return { ok: true, rev: next, events: clean(fightView.eventsFor(r.events, state, who)) };
    });
  }

  /**
   * The referee deletes a fight (old test fights): data { cid, fid }. The
   * header, state, views, feeds and action record all go, so it leaves every
   * player's list too. store.deleteTree removes a document and everything
   * under it.
   */
  async function remove({ uid, data }) {
    if (!uid) return refuse("auth", "sign in first");
    const { cid, fid } = data ?? {};
    if (!ID.test(cid ?? "") || !ID.test(fid ?? "")) return refuse("bad-request", "no such fight");
    const p = fightPaths(cid, fid);
    const check = await store.run(async (tx) => {
      const camp = await tx.get(p.campaign), header = await tx.get(p.fight);
      if (!header) return refuse("not-found", "no such fight");
      if (camp?.refereeUid !== uid) return refuse("forbidden", "only the campaign's referee deletes fights");
      return { ok: true };
    });
    if (!check.ok) return check;
    await store.deleteTree(p.fight);
    return { ok: true, fid };
  }

  /**
   * Chat (slice 5 pass 2, Oct 2026): data { cid, fid, text, to, as }.
   * to: "all", "referee" (a player to the referee alone) or a player's uid
   * (the referee to him alone). as: one of the speaker's own figures, or
   * (referee) "A"/"B" for a side; else he speaks as himself. "/roll 2d6+1"
   * is rolled here, apart from the fight's seeded dice, so nobody can fake
   * a roll and replays don't change. Each reader gets his own copy under
   * chat/{viewer}/entries, as with feeds; the fight's rev doesn't move, so
   * chatting never makes anyone's move stale.
   */
  async function chat({ uid, data }) {
    if (!uid) return refuse("auth", "sign in first");
    const { cid, fid, to = "all", as = null } = data ?? {};
    if (!ID.test(cid ?? "") || !ID.test(fid ?? "")) return refuse("bad-request", "no such fight");
    const text = String(data?.text ?? "").trim().slice(0, 400);
    if (!text) return refuse("bad-request", "nothing to say");
    const p = fightPaths(cid, fid);
    return store.run(async (tx) => {
      const camp = await tx.get(p.campaign), header = await tx.get(p.fight), stored = await tx.get(p.state);
      if (!header || !stored) return refuse("not-found", "no such fight");
      const state = fightStore.fromStored(stored);
      const who = whoIs(state, camp, uid);
      if (!who) return refuse("forbidden", "you are not in this fight");
      const me = who.referee ? "referee" : uid, people = state.people ?? {};
      let speaker = null, side = null;
      if (as === "A" || as === "B") { if (!who.referee) return refuse("forbidden", "only the referee speaks for a side"); speaker = `Side ${as}`; side = as; }
      else if (as != null) {
        const f = state.figures.find((x) => x.id === Number(as));
        if (!f || !(who.referee || fightView.controls(state, who, f))) return refuse("forbidden", "you can speak only as your own characters");
        speaker = f.name; side = f.side;
      }
      const players = playersOf(state);
      const readers = to === "all" ? ["referee", ...players] : to === "referee" ? ["referee", me] : who.referee && players.includes(to) ? ["referee", to] : null;
      if (!readers) return refuse("bad-request", "no one to say it to");
      let roll = null;
      const m = /^\/(roll|r)\s+(\d{0,2})d(\d{1,3})\s*([+-]\s*\d{1,3})?$/i.exec(text);
      if (/^\/(roll|r)\b/i.test(text)) {
        if (!m) return refuse("bad-request", "try /roll 2d6 or /roll 1d20+1");
        const n = Math.min(Math.max(Number(m[2] || 1), 1), 50), sides = Math.max(Number(m[3]), 2), mod = m[4] ? Number(m[4].replace(/\s/g, "")) : 0;
        const dice = Array.from({ length: n }, () => rollDie(sides));
        roll = { expr: `${n}d${sides}${mod ? (mod > 0 ? `+${mod}` : mod) : ""}`, dice, total: dice.reduce((a, b) => a + b, 0) + mod };
      }
      const at = now(), id = `${String(at).padStart(14, "0")}-${me.slice(0, 12)}-${Math.floor(Math.random() * 1e6)}`;
      const entry = clean({ id, at, uid: me, person: people[me]?.name ?? (who.referee ? "Referee" : "Player"), color: people[me]?.color ?? (who.referee ? REFEREE_COLOUR : null),
        as: speaker, side, to, toName: to === "all" ? null : to === "referee" ? "the referee" : people[to]?.name ?? "a player", ...(roll ? { roll } : { text }) });
      for (const r of [...new Set(readers)]) tx.set(p.chat(r, id), entry);
      return { ok: true, id };
    });
  }

  return { create, act, remove, chat, playersOf };
}
