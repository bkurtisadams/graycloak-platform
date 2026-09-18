// play-cloud.js — the play page's cloud adapter: the same sign-in and the same
// revisioned campaign-home save the current client uses, behind the three
// calls src/play-session.js asks for. Sign-in is per tab (auth.js keeps a
// session), so arriving from the lobby in the same tab arrives signed in.

import { initAuth, currentUserId, onAuthChange, signIn, signInWithEmail, createAccountWithEmail, signOutOfTraveller, describeAuthError, sendPasswordReset, setAccountPassword, accountProviders, authStatus } from './auth.js?v=v0.207.3';
import { saveCampaignHome, loadCampaignHome } from './publish.js?v=v0.207.3';

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
    signOut: signOutOfTraveller,
    describeError: describeAuthError,
    account: () => authStatus().user,
    userId: () => currentUserId(),
    load: (campaignId) => loadCampaignHome(campaignId),
    save: (home, envelope, options) => saveCampaignHome(home, envelope, options)
  };
}
