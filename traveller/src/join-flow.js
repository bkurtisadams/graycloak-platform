// join-flow.js — joining a campaign by its link, as a sequence that can be
// run again after a failed attempt (v0.362.0).
//
// Bruce's report (Nov 2026): "THAT LINK WAS NOT ACCEPTED. ASK YOUR REFEREE FOR
// A NEW ONE", on a link that was good. The Firestore rules let a player write
// their join note ONCE (create-only; update is false — see the rules suite,
// "a valid code lets a player ask to sit down, once"). The lobby wrote it with
// a plain set(), so a note left behind by any earlier attempt that stopped
// part-way — a seat refused, a tab closed, a referee who had not yet opened the
// page to clear it — turned every later attempt into an update, which the
// rules refuse, and the first failure's reason was never seen again.
//
// So: the player's own note is cleared first (the rules let them delete it,
// present or not), each step is named when it fails, and a character that
// could not be moved in once the seat is taken does not strand the player —
// the referee's page brings it in from the join note, as it always has.
import { createJoinRequest, setCharacterRecordPendingJoin, setCharacterRecordWorld, WORLD_KINDS } from './character-record.js';

export const JOIN_STEPS = Object.freeze({
  read: 'reading the link',
  clear: 'clearing an earlier join note',
  note: 'sending the join note',
  request: 'recording the request',
  seat: 'adding you to the campaign',
  move: 'moving the character in'
});

async function atStep(step, work) {
  try {
    return await work();
  } catch (error) {
    if (error && typeof error === 'object' && !error.step) error.step = step;
    throw error;
  }
}

// io: { readInvite, deleteJoinRequest, writeJoinRequest, seatSelf,
//       saveCharacterRecord } — the lobby's Firestore calls, or a fake.
// Returns { outcome: 'waiting' | 'seated', invite, campaignName, moveError }.
// Throws with .step set to a JOIN_STEPS value when a Firestore call fails.
export async function joinByLink({ record, code, knownInvite = null, uid, playerName = null, io, now = Date.now() } = {}) {
  if (!code) throw new Error('that link has no code in it');
  const invite = knownInvite?.code === code ? knownInvite : await atStep(JOIN_STEPS.read, () => io.readInvite(code));
  if (!invite || invite.game !== 'traveller' || !invite.campaignId) throw new Error('that link does not open a Traveller campaign');
  const join = createJoinRequest({ uid, name: playerName, code, campaignId: invite.campaignId, record, requestedAt: now });
  const campaignName = invite.campaignName ?? invite.campaignId;

  await atStep(JOIN_STEPS.clear, () => io.deleteJoinRequest(invite.campaignId, uid));
  await atStep(JOIN_STEPS.note, () => io.writeJoinRequest(join));

  if (invite.approval) {
    await atStep(JOIN_STEPS.request, () => io.saveCharacterRecord(setCharacterRecordPendingJoin(record, {
      campaignId: invite.campaignId, campaignName: invite.campaignName ?? null, code
    })));
    return { outcome: 'waiting', invite, campaignName, moveError: null };
  }

  await atStep(JOIN_STEPS.seat, () => io.seatSelf(invite.campaignId, uid, { name: playerName, code }));
  let moveError = null;
  try {
    await atStep(JOIN_STEPS.move, () => io.saveCharacterRecord(setCharacterRecordWorld({ ...record, pendingJoin: null }, {
      kind: WORLD_KINDS.CAMPAIGN, campaignId: invite.campaignId, campaignName: invite.campaignName ?? null, since: now
    })));
  } catch (error) {
    moveError = error;
  }
  return { outcome: 'seated', invite, campaignName, moveError };
}

// What the lobby says. A refused write names its step, so the next report can
// say where it stopped; anything else says what it says.
export function joinFailureMessage(error) {
  if (error?.code === 'permission-denied') {
    const step = error.step ? ` (STEP: ${String(error.step).toUpperCase()})` : '';
    return `THAT LINK WAS NOT ACCEPTED${step}. TRY ONCE MORE; IF IT HAPPENS AGAIN, TELL YOUR REFEREE WHICH STEP.`;
  }
  return error?.message ?? String(error);
}
