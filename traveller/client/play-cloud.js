// play-cloud.js — the play page's cloud adapter: the same sign-in and the same
// revisioned campaign-home save the current client uses, behind the three
// calls src/play-session.js asks for. Sign-in is per tab (auth.js keeps a
// session), so arriving from the lobby in the same tab arrives signed in.

import { initAuth, currentUserId, onAuthChange, signIn, signInWithEmail, createAccountWithEmail, signOutOfTraveller, describeAuthError, sendPasswordReset, setAccountPassword, accountProviders, authStatus, describeAttempt } from './auth.js?v=v0.279.0';
import {
  saveCampaignHome, loadCampaignHome, listOwnCampaigns,
  seatPlayer, unseatPlayer, listSeatedPlayers,
  createInvite, deleteInvite, listCampaignInvites,
  watchJoinRequests, deleteJoinRequest, setCharacterRecordWorldRemote, publishPlayerCharacter,
  publishEncounterView, publishPlayerLog, watchDeclarations, clearDeclarations,
  watchWoundAllocations, clearWoundAllocations, watchChat, sendChatMessage
} from './publish.js?v=v0.279.0';

export function createPlayCloud() {
  return {
    start: () => initAuth(),
    onAuthChange,
    signIn,
    signInWithEmail,
    createAccountWithEmail,
    sendPasswordReset,
    setAccountPassword,
    accountProviders,
    describeAttempt,
    signOut: signOutOfTraveller,
    describeError: describeAuthError,
    account: () => authStatus().user,
    userId: () => currentUserId(),
    load: (campaignId) => loadCampaignHome(campaignId),
    listOwn: () => listOwnCampaigns(currentUserId()),
    // v0.222.0: seats and invites, for the Players tab.
    listSeats: (campaignId) => listSeatedPlayers(campaignId),
    seat: (campaignId, uid, name) => seatPlayer(campaignId, uid, { name }),
    unseat: (campaignId, uid) => unseatPlayer(campaignId, uid),
    listInvites: (campaignId) => listCampaignInvites(campaignId),
    createInvite: (invite) => createInvite(invite),
    revokeInvite: (code) => deleteInvite(code),
    watchJoins: (campaignId, onChange) => watchJoinRequests(campaignId, onChange),
    dismissJoin: (campaignId, uid) => deleteJoinRequest(campaignId, uid),
    // v0.274.0: the rest of seating a player, which only the referee client
    // did: the player's own record says where the character is (the lobby's
    // ENTER WORLD reads it), and their sheet is published for player.html.
    placeCharacter: (characterId, world) => setCharacterRecordWorldRemote(characterId, world),
    publishPlayerCharacter: (published) => publishPlayerCharacter(published),
    // v0.276.0: the fight as players see it, their logs, what they write
    // back, and the shared chat — all of which only the referee client had.
    publishEncounterView: (view) => publishEncounterView(view),
    publishPlayerLog: (published) => publishPlayerLog(published),
    watchDeclarations: (campaignId, encounterId, onChange) => watchDeclarations(campaignId, encounterId, onChange),
    clearDeclarations: (campaignId, encounterId) => clearDeclarations(campaignId, encounterId),
    watchWoundAllocations: (campaignId, encounterId, onChange, onError) => watchWoundAllocations(campaignId, encounterId, onChange, onError),
    clearWoundAllocations: (campaignId, encounterId) => clearWoundAllocations(campaignId, encounterId),
    watchChat: (campaignId, onChange) => watchChat(campaignId, onChange),
    sendChat: (campaignId, message) => sendChatMessage(campaignId, message),
    save: (home, envelope, options) => saveCampaignHome(home, envelope, options)
  };
}
