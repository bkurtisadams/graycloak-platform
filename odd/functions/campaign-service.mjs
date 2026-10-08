// ---------------------------------------------------------------------------
// odd/functions/campaign-service.mjs — slice 5, pass 3 (Oct 2026): the game.
//
// An OD&D game as Roll20 and Foundry do it (approved mockups, 8 Oct 2026):
// one permanent join link per campaign, one game URL, roles (Creator,
// co-referee, player), who's here now, and the fight the referee has open,
// which pulls every connected page into it.
//
// oddCampaigns/{cid}:
//   refereeUid      the Creator (made the game; one only)
//   referees[]      co-referees the Creator has named
//   members[]       everyone in the game, the Creator included
//   people{uid}     { name, color, role: creator | referee | player }
//   joinCode        the secret part of the join link; reset on removal
//   invited[]       emails invited by name: such a person joins without the code
//   live            { fid, at } the fight open now, or null (the lobby)
//   name, system, createdAt
// oddCampaigns/{cid}/presence/{uid}: { seen } (a page says "here" every
// couple of minutes; "online" is seen in the last three).
//
// Every write is here; browsers write nothing (firestore.rules).
// ---------------------------------------------------------------------------

const ID = /^[A-Za-z0-9_-]{1,80}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const campaignPaths = (cid) => ({
  campaign: `oddCampaigns/${cid}`,
  gcc: `campaigns/${cid}`,
  presence: (uid) => `oddCampaigns/${cid}/presence/${uid}`,
  fight: (fid) => `oddCampaigns/${cid}/fights/${fid}`
});

/** The referee of a game: its Creator or a co-referee. */
export const isReferee = (camp, uid) => !!camp && !!uid && (camp.refereeUid === uid || (camp.referees ?? []).includes(uid));

export function createCampaignService({ palette, refereeColour, store, now = () => Date.now(), newCode = () => Math.random().toString(36).slice(2, 10).toUpperCase() }) {
  const refuse = (code, error) => ({ ok: false, code, error });
  const clean = (o) => JSON.parse(JSON.stringify(o));
  const freeColour = (people, except) => palette.find((c) => !Object.entries(people ?? {}).some(([u, p]) => u !== except && p?.color === c)) ?? palette[0];
  /** What the caller gets back: the game as he may see it (the join code only for referees). */
  const summary = (camp, uid) => ({
    name: camp.name ?? null, refereeUid: camp.refereeUid, referees: camp.referees ?? [], members: camp.members ?? [], people: camp.people ?? {},
    live: camp.live ?? null, invited: isReferee(camp, uid) ? camp.invited ?? [] : undefined, joinCode: isReferee(camp, uid) ? camp.joinCode : undefined,
    you: { uid, referee: isReferee(camp, uid), creator: camp.refereeUid === uid }
  });

  async function handle({ uid, email, name, data }) {
    if (!uid) return refuse('auth', 'sign in first');
    const { op, cid } = data ?? {};
    if (!ID.test(cid ?? '')) return refuse('bad-request', 'no such game');
    const p = campaignPaths(cid);
    const myEmail = String(email ?? '').toLowerCase();
    return store.run(async (tx) => {
      const camp = await tx.get(p.campaign), gcc = await tx.get(p.gcc);
      const write = (c) => { tx.set(p.campaign, clean(c)); return { ok: true, game: summary(c, uid) }; };

      // The referee opens the game (the first time also makes it): its Creator is the GCC campaign's owner, if there is one.
      if (op === 'open') {
        if (camp) {
          if (!isReferee(camp, uid)) return camp.members?.includes(uid) ? { ok: true, game: summary(camp, uid) } : refuse('forbidden', 'you are not in this game');
          if (camp.joinCode && camp.members && camp.people?.[uid]) return { ok: true, game: summary(camp, uid) };
          // an odd campaign from before pass 3 (fights only): give it the game's fields
          return write({ ...camp, referees: camp.referees ?? [], members: [...new Set([...(camp.members ?? []), camp.refereeUid])], people: { ...(camp.people ?? {}), [camp.refereeUid]: camp.people?.[camp.refereeUid] ?? { name: String(name || 'Referee').slice(0, 60), color: refereeColour, role: 'creator' } }, joinCode: camp.joinCode ?? newCode(), invited: camp.invited ?? [], live: camp.live ?? null, name: camp.name ?? gcc?.name ?? null });
        }
        if (gcc && gcc.ownerUid !== uid) return refuse('forbidden', "only the campaign's owner on GCC starts its game");
        return write({ refereeUid: uid, referees: [], members: [uid], people: { [uid]: { name: String(name || 'Referee').slice(0, 60), color: refereeColour, role: 'creator' } }, joinCode: newCode(), invited: [], live: null, name: String(data.name ?? gcc?.name ?? 'OD&D game').slice(0, 120), system: 'odd', createdAt: now() });
      }
      if (!camp) return refuse('not-found', "this game hasn't been started yet: the referee opens it first");
      const member = (camp.members ?? []).includes(uid), ref = isReferee(camp, uid), creator = camp.refereeUid === uid;

      // Following the join link, or the game URL by someone invited by email.
      if (op === 'join') {
        if (member) return { ok: true, game: summary(camp, uid) };
        const byCode = data.code && String(data.code).toUpperCase() === camp.joinCode;
        const byEmail = myEmail && (camp.invited ?? []).includes(myEmail);
        if (!byCode && !byEmail) return refuse('forbidden', data.code ? 'that join link is out of date: ask the referee for the new one' : 'you are not in this game');
        const people = { ...(camp.people ?? {}) };
        people[uid] = { name: String(name || myEmail || 'Player').slice(0, 60), color: freeColour(people, uid), role: 'player' };
        return { ...write({ ...camp, members: [...(camp.members ?? []), uid], people, invited: (camp.invited ?? []).filter((e) => e !== myEmail) }), joined: true };
      }
      if (!member) return refuse('forbidden', 'you are not in this game');

      if (op === 'profile') {
        const people = { ...camp.people }, me = { ...(people[uid] ?? { role: ref ? 'referee' : 'player' }) };
        if (data.name != null) { const n = String(data.name).trim().slice(0, 60); if (!n) return refuse('bad-request', 'a name, please'); me.name = n; }
        if (data.color != null) {
          const c = String(data.color).toLowerCase();
          if (!palette.includes(c) && !(ref && c === refereeColour)) return refuse('bad-request', 'pick one of the colours offered');
          if (Object.entries(people).some(([u, q]) => u !== uid && q?.color === c)) return refuse('bad-request', 'someone else has that colour');
          me.color = c;
        }
        people[uid] = me;
        return write({ ...camp, people });
      }
      if (op === 'here') { tx.set(p.presence(uid), { seen: now() }); return { ok: true }; }

      if (!ref) return refuse('forbidden', 'only the referee does that');
      if (op === 'invite') {
        const emails = [].concat(data.emails ?? []).map((e) => String(e).trim().toLowerCase()).filter(Boolean);
        const bad = emails.find((e) => !EMAIL.test(e)); if (bad) return refuse('bad-request', `"${bad}" is not an email address`);
        return write({ ...camp, invited: [...new Set([...(camp.invited ?? []), ...emails])].slice(0, 50) });
      }
      if (op === 'uninvite') return write({ ...camp, invited: (camp.invited ?? []).filter((e) => e !== String(data.email ?? '').toLowerCase()) });
      if (op === 'live') {
        if (data.fid != null) { if (!ID.test(data.fid) || !(await tx.get(p.fight(data.fid)))) return refuse('not-found', 'no such fight'); }
        return write({ ...camp, live: data.fid ? { fid: data.fid, at: now() } : null });
      }

      if (!creator) return refuse('forbidden', 'only the Creator does that');
      if (op === 'reset') return write({ ...camp, joinCode: newCode() });
      if (op === 'role') {
        if (!(camp.members ?? []).includes(data.uid) || data.uid === camp.refereeUid) return refuse('bad-request', 'not a player in this game');
        const referees = data.referee ? [...new Set([...(camp.referees ?? []), data.uid])] : (camp.referees ?? []).filter((u) => u !== data.uid);
        const people = { ...camp.people, [data.uid]: { ...camp.people[data.uid], role: data.referee ? 'referee' : 'player' } };
        return write({ ...camp, referees, people });
      }
      if (op === 'remove') {
        if (!(camp.members ?? []).includes(data.uid) || data.uid === camp.refereeUid) return refuse('bad-request', 'not a player in this game');
        const people = { ...camp.people }; delete people[data.uid];
        // removing someone resets the link, as on Roll20, so his old link stops working
        return write({ ...camp, members: camp.members.filter((u) => u !== data.uid), referees: (camp.referees ?? []).filter((u) => u !== data.uid), people, joinCode: newCode() });
      }
      return refuse('bad-request', `unknown request ${op}`);
    });
  }
  return { handle };
}
