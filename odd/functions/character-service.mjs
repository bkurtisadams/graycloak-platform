// ---------------------------------------------------------------------------
// odd/functions/character-service.mjs — slice 5, pass 4 (Oct 2026): the roster.
//
// oddCampaigns/{cid}/characters/{id}: one character (an actor, as Foundry calls
// him), with Foundry's ownership: a level for all players and per user (None,
// Limited, Observer, Owner). oddCampaigns/{cid}/folders/{id}: the Actors
// directory's folders { name, color, parent, sort }. Only this service writes
// either, and it rolls every die (abilities, gold, hit points). The rules are
// the package's roster.mjs; this file checks who may do what.
//
//   roll      a member rolls a new character (one unfinished at a time); he owns it
//   basics    name, race, class, alignment, the prime-requisite exchange (unfinished only)
//   buy/sell  Book I shopping with his starting gold (unfinished only)
//   finish    hit points rolled; he joins the party
//   ready     the weapon in hand and the bow carried into fights
//   remember  spells remembered
//   rename, notes
// An Owner or a referee may do those. Only a referee:
//   ownership Configure Ownership { default, uid: level }
//   move      put a character in a folder (or none: Clear Folder)
//   duplicate a copy of a character
//   delete    rolls stand unless the referee throws a character away
//   folder-create { name, color, parent }, folder-update { folder, name, color, parent },
//   folder-delete { folder }: its characters and folders move up to its parent
// ---------------------------------------------------------------------------

import { isReferee } from "./campaign-service.mjs";

const ID = /^[A-Za-z0-9_-]{1,80}$/;
const MAX_CHARACTERS = 200, MAX_FOLDERS = 100, FOLDER_DEPTH = 4;
const COLOUR = /^#[0-9a-fA-F]{6}$/;

export const characterPaths = (cid) => ({
  campaign: `oddCampaigns/${cid}`,
  characters: `oddCampaigns/${cid}/characters`,
  character: (id) => `oddCampaigns/${cid}/characters/${id}`,
  folders: `oddCampaigns/${cid}/folders`,
  folder: (id) => `oddCampaigns/${cid}/folders/${id}`
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
        let folder = null;
        if (data.folder != null && ref) { if (!ID.test(String(data.folder)) || !(await tx.get(p.folder(data.folder)))) return refuse("not-found", "no such folder"); folder = data.folder; }
        const cid2 = newId();
        const ch = roster.withAccess({ ...roster.rollCharacter(d6), id: cid2, owner: uid, ownership: { default: roster.OWNERSHIP.NONE, [uid]: roster.OWNERSHIP.OWNER }, folder, createdAt: now(), updatedAt: now() }, camp.members ?? []);
        tx.set(p.character(cid2), clean(ch));
        return { ok: true, character: ch };
      }

      if (String(op ?? "").startsWith("folder-")) {
        if (!ref) return refuse("forbidden", "only the referee arranges the folders");
        const folders = await tx.list(p.folders), byId = new Map(folders.map((f) => [f.id, f]));
        const depth = (fid) => { let d = 0; for (let f = byId.get(fid); f && d < 10; f = byId.get(f.parent)) d++; return d; };
        const name = data.name != null ? String(data.name).replace(/\s+/g, " ").trim().slice(0, 60) : null;
        if (data.name != null && !name) return refuse("bad-request", "a name, please");
        if (data.color != null && data.color !== "" && !COLOUR.test(data.color)) return refuse("bad-request", "a colour like #d4a017");
        if (data.parent != null && !byId.has(data.parent)) return refuse("not-found", "no such folder");
        if (op === "folder-create") {
          if (folders.length >= MAX_FOLDERS) return refuse("full", "too many folders");
          if (data.parent != null && depth(data.parent) >= FOLDER_DEPTH) return refuse("bad-request", `folders nest ${FOLDER_DEPTH} deep at most`);
          const f = { id: newId(), name: name ?? "New Folder", color: data.color || null, parent: data.parent ?? null, sort: now(), createdAt: now() };
          tx.set(p.folder(f.id), clean(f));
          return { ok: true, folder: f };
        }
        const f = byId.get(data.folder); if (!f) return refuse("not-found", "no such folder");
        if (op === "folder-update") {
          const next = { ...f };
          if (name) next.name = name;
          if (data.color != null) next.color = data.color || null;
          if ("parent" in data) {
            for (let a = data.parent; a != null; a = byId.get(a)?.parent) if (a === f.id) return refuse("bad-request", "a folder can't go inside itself");
            next.parent = data.parent ?? null;
          }
          tx.set(p.folder(f.id), clean(next));
          return { ok: true, folder: next };
        }
        if (op === "folder-delete") {
          // Foundry's "Remove Folder": what was in it moves up to its parent
          const chars = await tx.list(p.characters);
          for (const c of chars.filter((c) => c.folder === f.id)) tx.set(p.character(c.id), clean({ ...c, folder: f.parent ?? null, updatedAt: now() }));
          for (const g of folders.filter((g) => g.parent === f.id)) tx.set(p.folder(g.id), clean({ ...g, parent: f.parent ?? null }));
          return { ok: true, removed: f.id, f };
        }
        return refuse("bad-request", `unknown request ${op}`);
      }

      if (!ID.test(id ?? "")) return refuse("bad-request", "no such character");
      const ch = await tx.get(p.character(id));
      if (!ch) return refuse("not-found", "no such character");
      const members = camp.members ?? [];
      const STAFF = ["ownership", "move", "duplicate"];
      if (STAFF.includes(op) && !ref) return refuse("forbidden", "only the referee does that");
      if (!ref && roster.levelOf(ch, uid) < roster.OWNERSHIP.OWNER) return refuse("forbidden", "that character isn't yours");

      let r;
      if (op === "ownership") r = roster.setOwnership(ch, data.ownership ?? {}, members);
      else if (op === "move") {
        if (data.folder != null && (!ID.test(String(data.folder)) || !(await tx.get(p.folder(data.folder))))) return refuse("not-found", "no such folder");
        r = { ok: true, ch: { ...ch, folder: data.folder ?? null } };
      } else if (op === "duplicate") {
        const copyId = newId(), dup = roster.withAccess({ ...ch, id: copyId, name: `${ch.name || "Character"} (Copy)`.slice(0, roster.NAME_MAX), createdAt: now(), updatedAt: now() }, members);
        tx.set(p.character(copyId), clean(dup));
        return { ok: true, character: dup };
      } else if (op === "basics") r = roster.setBasics(ch, { name: data.name, race: data.race, cls: data.cls, alignment: data.alignment, exchange: data.exchange });
      else if (op === "buy") r = roster.buy(ch, String(data.key ?? ""));
      else if (op === "sell") r = roster.sell(ch, Number(data.index));
      else if (op === "finish") r = roster.finish(ch, d6);
      else if (op === "ready") r = roster.setReady(ch, Object.fromEntries(["weapon", "missile"].filter((k) => k in (data ?? {})).map((k) => [k, data[k] || null])));
      else if (op === "remember") r = roster.remember(ch, data.spells);
      else if (op === "rename") r = roster.rename(ch, data.name);
      else if (op === "notes") r = roster.setNotes(ch, data.notes);
      else return refuse("bad-request", `unknown request ${op}`);
      if (!r.ok) return refuse("bad-request", r.error);
      const next = roster.withAccess({ ...r.ch, updatedAt: now() }, members);
      tx.set(p.character(id), clean(next));
      return { ok: true, character: next };
    });
  }
  return { handle };
}
