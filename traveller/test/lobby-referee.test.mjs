// v0.372.1: a new campaign is asked who referees, and the answer is kept on
// the campaign (roster.settings.referee, as play.html's Settings writes it)
// and on the envelope the lobby's cards read (Kurt, Nov 2026: a campaign of
// his own opened on the player's page with nothing to press).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaignDocument } from '../src/campaign-document.js';
import { createCampaignBundle } from '../src/campaign-bundle.js';
import { createCampaignHome, importCampaignHome, campaignHomeSummary } from '../src/campaign-home.js';
import { buildPublishedCampaign } from '../src/published-view.js';
import { refereeMode } from '../src/play-session.js';
import { readFileSync } from 'node:fs';
import { importCharacterDocument } from '../vendor/classic-traveller-rules/index.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/Sea-of-Suns-v0.11.2-buggy.campaign.json', import.meta.url), 'utf8'));
const character = importCharacterDocument(fixture.documents.characters[0]);

for (const referee of ['game', 'person']) {
  test(`v0.372.1 a campaign started with "${referee}" refereeing keeps it, and the lobby card reads it`, () => {
    let campaign = createCampaignDocument({ name: 'Test', characters: [character], partyCharacterIds: [character.identity.id], activeCharacterId: character.identity.id, activeShipId: null });
    campaign = { ...campaign, roster: { ...(campaign.roster ?? {}), settings: { ...(campaign.roster?.settings ?? {}), referee } } };
    const home = createCampaignHome(createCampaignBundle(campaign, { characters: [character] }), { ownerUid: 'u1', savedAt: 1 });
    const back = importCampaignHome(JSON.parse(JSON.stringify(home))).bundle.campaign;
    assert.equal(refereeMode(back), referee);
    const envelope = { ...buildPublishedCampaign(campaign, { publishedAt: 1 }), referee };
    assert.equal(campaignHomeSummary(envelope).refereeMode, referee);
  });
}
