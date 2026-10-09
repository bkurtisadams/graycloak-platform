// ---------------------------------------------------------------------------
// odd/functions/character-service.mjs — slice 5, pass 4 (Oct 2026): the roster.
//
// oddCampaigns/{cid}/characters/{id}: one character, owned by a member of the
// game. Every member reads the roster; only this service writes it, and it
// rolls every die (abilities, gold, hit points). The rules are the package's
// roster.mjs; this file only checks who may do what.
//
//   roll      a member rolls a new character (one unfinished at a time)
//   basics    name, race, class, alignment, the prime-requisite exchange (unfinished only)
//   buy/sell  Book I shopping with his starting gold (unfinished only)
//   finish    hit points rolled; he joins the party
//   ready     the weapon in hand and the bow carried into fights
//   remember  spells remembered
//   rename, notes
//   delete    the referee only: rolls stand unless the referee throws a character away
// The owner or a referee may do all but roll and delete.
// ---------------------------------------------------------------------------

import { isReferee } from "./campaign-service.mjs";

const ID = /^[A-Za-z0-9_-]{1,80}$/;
const MAX_CHARACTERS = 60;

export const characterPaths = (cid) => ({
  campaign: `oddCampaigns/${cid}`,
  characters: `oddCampaigns/${cid}/characters`,
  character: (id) => `oddCampaigns/${cid}/characters/${id}`
});

export function createCharacterService({ rules, store, now = () => Date.now(), rollDie = (n) => 1 + Math.floor(Math.random() * n), newId = () => `ch${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` }) {
  const { roster } = rules;
  const refuse = (code, error) => ({ ok: false, code, error });
  const clean = (o) => JSON.parse(JSON.stringify(o));
  const d6 = () => rollDie(6);

  async function handle({ uid, data }) {
    if (!uid) return refuse("auth", "sign in first");
    const { op, cid, id } = data ?? {};
    if (!ID.test(cid ?? "")) return refuse("bad-request", "no such game");
    const p = characterPaths(cid);

    if (op === "delete") {
      if (!ID.test(id ?? "")) return refuse("bad-request", "no such character");
      const r = await store.run(async (tx) => {
        const camp = await tx.get(p.campaign);
        if (!isReferee(camp, uid)) return refuse("forbidden", "only the referee throws a character away");
        if (!(await tx.get(p.character(id)))) return refuse("not-found", "no such character");
        return { ok: true };
      });
      if (!r.ok) return r;
      await store.deleteTree(p.character(id));
      return { ok: true, deleted: id };
    }

    return store.run(async (tx) => {
      const camp = await tx.get(p.campaign);
      if (!camp) return refuse("not-found", "no such game");
      const ref = isReferee(camp, uid), member = ref || (camp.members ?? []).includes(uid);
      if (!member) return refuse("forbidden", "you are not in this game");

      if (op === "roll") {
        const all = await tx.list(p.characters);
        if (all.length >= MAX_CHARACTERS) return refuse("full", "the roster is full");
        const open = all.find((c) => c.owner === uid && c.status === "draft");
        if (open) return refuse("draft", `finish ${open.name || "your rolled character"} first`);
        const cid2 = newId();
        const ch = { ...roster.rollCharacter(d6), id: cid2, owner: uid, ownerName: camp.people?.[uid]?.name ?? null, createdAt: now(), updatedAt: now() };
        tx.set(p.character(cid2), clean(ch));
        return { ok: true, character: ch };
      }

      if (!ID.test(id ?? "")) return refuse("bad-request", "no such character");
      const ch = await tx.get(p.character(id));
      if (!ch) return refuse("not-found", "no such character");
      if (ch.owner !== uid && !ref) return refuse("forbidden", "that character isn't yours");

      let r;
      if (op === "basics") r = roster.setBasics(ch, { name: data.name, race: data.race, cls: data.cls, alignment: data.alignment, exchange: data.exchange });
      else if (op === "buy") r = roster.buy(ch, String(data.key ?? ""));
      else if (op === "sell") r = roster.sell(ch, Number(data.index));
      else if (op === "finish") r = roster.finish(ch, d6);
      else if (op === "ready") r = roster.setReady(ch, Object.fromEntries(["weapon", "missile"].filter((k) => k in (data ?? {})).map((k) => [k, data[k] || null])));
      else if (op === "remember") r = roster.remember(ch, data.spells);
      else if (op === "rename") r = roster.rename(ch, data.name);
      else if (op === "notes") r = roster.setNotes(ch, data.notes);
      else return refuse("bad-request", `unknown request ${op}`);
      if (!r.ok) return refuse("bad-request", r.error);
      const next = { ...r.ch, updatedAt: now() };
      tx.set(p.character(id), clean(next));
      return { ok: true, character: next };
    });
  }
  return { handle };
}
