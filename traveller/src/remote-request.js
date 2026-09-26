// ---------------------------------------------------------------------------
// remote-request.js — v0.329.0: a player's button, carried out with nobody's
// referee page open (Kurt, Sep 2026: "solo has to work without a GM being
// online").
//
// A seated player's page writes a request (a command and its value) under
// travellerCampaigns/{id}/requests/. A Cloud Function (traveller/functions/)
// hands it here: the campaign is loaded from its saved home, the same
// play-session.js the referee's page runs carries out the command, and the
// result is saved and published exactly as the referee's page would save it.
// Players never read the campaign itself, so what the game hides stays hidden.
//
// This module is the whole of that logic, with the database behind a small
// store (loadHome, saveHome, isSeated, and the publish calls), so the tests
// run it against memory and the function against Firestore.
//
// What a player may do is a list, not everything the referee can: the ship's
// business in port, the trip, patrons and jobs, the law's jail, the
// abbreviated ship fight. Only when the game referees; a campaign with a
// person refereeing refuses (their approval is a later slice).
// ---------------------------------------------------------------------------

import { createDocumentRegistry, createMemoryStorage } from './document-registry.js';
import { importCampaignHome, StaleCampaignHomeError } from './campaign-home.js';
import { createPlaySession, refereeMode } from './play-session.js';
import { playerMayRun } from './player-requests.js';

export { playerMayRun, playerSituation } from './player-requests.js';

/**
 * Carry out one player's request. store:
 *   loadHome() -> saved home or null
 *   saveHome(home, envelope, { expectedRevision }) -> revision (throws StaleCampaignHomeError)
 *   isSeated(uid) -> boolean
 *   publishPlayerCharacter, publishPlayerLog, publishEncounterView (optional)
 * request: { uid, command, value }. Returns { ok, message, revision }.
 * A save that meets a newer revision is tried again once, from the new home.
 */
export async function applyRemoteRequest({ campaignId, request, store, sector = null, subsector = null, refereeName = null } = {}) {
  const refuse = (message) => ({ ok: false, message, revision: null });
  const command = String(request?.command ?? '');
  if (!request?.uid) return refuse('the request names no player');
  if (!playerMayRun(command)) return refuse(`a player cannot ask for that (${command || 'nothing'})`);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const saved = await store.loadHome();
    if (!saved) return refuse('this campaign has no saved copy yet: its referee must open it once');
    const home = importCampaignHome(saved);
    const ownerUid = home.ownerUid ?? saved.ownerUid ?? null;
    if (request.uid !== ownerUid && !(await store.isSeated(request.uid))) return refuse('you are not a player in this campaign');
    const registry = createDocumentRegistry({ storage: createMemoryStorage() });
    registry.putBundle(home.bundle);
    const campaign = registry.resolveCampaign(campaignId)?.campaign;
    if (!campaign) return refuse('the saved campaign could not be read');
    if (refereeMode(campaign) !== 'game') return refuse('a person referees this campaign: ask your referee');
    const cloud = {
      userId: () => ownerUid,
      account: () => ({ displayName: refereeName }),
      load: () => store.loadHome(),
      save: (next, envelope, options) => store.saveHome(next, envelope, options),
      publishPlayerCharacter: store.publishPlayerCharacter ? (published) => store.publishPlayerCharacter(published) : undefined,
      publishPlayerLog: store.publishPlayerLog ? (published) => store.publishPlayerLog(published) : undefined,
      publishEncounterView: store.publishEncounterView ? (view) => store.publishEncounterView(view) : undefined
    };
    // At the loaded home's revision: nothing is saved unless the command is
    // carried out, and then the one save carries everything.
    const session = createPlaySession({ registry, campaignId, sector, subsector: sector ? null : subsector, cloud, cloudRevision: home.revision });
    const who = registry.resolveCampaign(campaignId).characters.find((entry) => request.characterId && entry.identity.id === request.characterId);
    const result = session.run(command, { fight: { value: request.value ?? {} } });
    if (!result.ok) return { ok: false, message: result.message, revision: null };
    const revision = await session.flushSave();
    if (session.save.state === 'stale' && attempt === 0) continue; // someone saved first: once more from theirs
    if (revision === null) return { ok: false, message: session.save.detail || session.save.label || 'the campaign could not be saved', revision: null };
    return { ok: true, message: `${who ? `${who.identity.name}: ` : ''}${result.message}`, revision };
  }
  return refuse('the campaign kept changing under the request; try again');
}

export { StaleCampaignHomeError };
