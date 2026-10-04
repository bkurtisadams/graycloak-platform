// ---------------------------------------------------------------------------
// odd/functions/fight-service.mjs — slice 5, step 2 (Oct 2026)
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
const pad = (n) => String(n).padStart(8, "0");
const clean = (v) => JSON.parse(JSON.stringify(v));

export function fightPaths(cid, fid) {
  const fight = `oddCampaigns/${cid}/fights/${fid}`;
  return {
    campaign: `oddCampaigns/${cid}`,
    fight,
    state: `${fight}/server/state`,
    view: (who) => `${fight}/views/${who}`,
    feed: (who, rev) => `${fight}/feeds/${who}/entries/${pad(rev)}`,
    action: (rev) => `${fight}/actions/${pad(rev)}`
  };
}

export function createFightService({ rules, store, now = () => Date.now(), newSeed = () => Math.floor(Math.random() * 2 ** 31), resolveUser = async () => null }) {
  const { fightStore, fightView, session } = rules;
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
      firstSide: state.firstSide ?? null, winner: state.winner ?? null, waitingOn: session.waitingOn(state), players: playersOf(state), updatedAt: now()
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
  async function create({ uid, data }) {
    if (!uid) return refuse("auth", "sign in first");
    const { cid, fid, title = "", fight, control = {}, players = {} } = data ?? {};
    if (!ID.test(cid ?? "") || !ID.test(fid ?? "")) return refuse("bad-request", "campaign and fight ids are letters, digits, - and _");
    if ((data?.rules ?? null) !== RULES) return refuse("rules", `the page runs rules ${data.rules ?? "unknown"}, the server ${RULES}: reload the page`);
    let state;
    try { state = fightStore.fromStored(fight); } catch (e) { return refuse("bad-request", e.message); }
    const ids = new Set((state.figures ?? []).map((f) => String(f.id)));
    for (const [k, v] of Object.entries(control)) if (!ids.has(String(k)) || typeof v !== "string" || !v || v.length > 128) return refuse("bad-request", `control for figure ${k} is not valid`);
    state.control = { ...control };
    for (const [k, raw] of Object.entries(players ?? {})) {
      const email = String(raw ?? "").trim().toLowerCase();
      if (!email) continue;
      if (!ids.has(String(k))) return refuse("bad-request", `there is no figure ${k}`);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return refuse("bad-request", `"${raw}" is not an email address`);
      const who = await resolveUser(email);
      if (!who) return refuse("no-account", `No one has signed in as ${email} yet. The player signs in once on the player's page, then open the fight again.`);
      state.control[k] = who === uid ? "referee" : who;
    }
    for (const k of ["done", "behaved"]) delete state[k];
    const rng = fightStore.seedFight(state, newSeed());
    const events = [{ type: "round", round: state.round ?? 0 }];
    if (state.phase === "fight") events.push(...session.advance(state, rng));
    const p = fightPaths(cid, fid);
    return store.run(async (tx) => {
      const camp = await tx.get(p.campaign), existing = await tx.get(p.fight);
      if (camp && camp.refereeUid !== uid) return refuse("forbidden", "only the campaign's referee opens fights");
      if (existing) return refuse("exists", `fight ${fid} already exists`);
      if (!camp) tx.set(p.campaign, { refereeUid: uid, system: "odd", createdAt: now() });
      writeFight(tx, p, state, events, { rev: 1, uid, header: { title: String(title).slice(0, 120), createdBy: uid, createdAt: now() } });
      // players: who was put in the fight, so the page can confirm the emails took.
      return { ok: true, fid, rev: 1, players: playersOf(state) };
    });
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
      const r = session.applyAs(state, who, action, fightStore.rngOf(state));
      if (!r.ok) return refuse("refused", r.error, { rev: header.rev });
      const next = header.rev + 1;
      writeFight(tx, p, state, r.events, { rev: next, uid, action, header });
      return { ok: true, rev: next, events: clean(fightView.eventsFor(r.events, state, who)) };
    });
  }

  return { create, act, playersOf };
}
