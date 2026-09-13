import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { importCharacterDocument } from '../vendor/classic-traveller-rules/index.js';
import { createCampaignDocument, addEncounterToCampaign } from '../src/campaign-document.js';
import { createSceneDocument } from '../src/scene-document.js';
import { createCampaignBundle, importCampaignBundle } from '../src/campaign-bundle.js';
import {
  createEncounterDocument,
  declareEncounterAction,
  resolveDeclaredRound,
  rangeBandForBandGap,
  encounterPairRange,
  importEncounterDocument,
  ENCOUNTER_RANGE_LINE_BAND_GAP,
  ENCOUNTER_RANGE_LINE_ESCAPE_BANDS,
  ENCOUNTER_RANGE_LINE_COLUMNS,
  ENCOUNTER_RANGE_LINE_GUIDE_VERSION
} from '../src/encounter-document.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(here, '../examples');

function sequenceDice(values) {
  let index = 0;
  const dice = { rollD6() { if (index >= values.length) throw new Error('dice sequence exhausted'); return values[index++]; } };
  dice.roll2D6 = () => { const rolled = [dice.rollD6(), dice.rollD6()]; return { dice: rolled, total: rolled[0] + rolled[1] }; };
  return dice;
}

async function fixture() {
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  const campaign = createCampaignDocument({
    id: 'campaign-range-line', name: 'Sea of Suns', time: { year: 4800, dayOfYear: 141, secondsOfDay: 0 },
    location: { systemId: 'cinder', systemName: 'Cinder', worldId: 'cinder-main', worldName: 'Cinder' },
    characters: [character], partyCharacterIds: [character.identity.id]
  });
  return { character, campaign };
}

test('rangeBandForBandGap matches Book 1 p.29 exactly, including the escape edge', () => {
  assert.equal(rangeBandForBandGap(0), 'close');
  assert.equal(rangeBandForBandGap(1), 'short');
  assert.equal(rangeBandForBandGap(2), 'medium');
  assert.equal(rangeBandForBandGap(5), 'medium');
  assert.equal(rangeBandForBandGap(6), 'long');
  assert.equal(rangeBandForBandGap(9), 'long');
  assert.equal(rangeBandForBandGap(10), 'very-long');
  assert.equal(rangeBandForBandGap(14), 'very-long');
  // Fifteen or more is Book 1's escape threshold, not a fightable range — the
  // function still returns a band (resolveDeclaredRound handles escape
  // separately), but it must not silently claim 'close' or throw.
  assert.equal(rangeBandForBandGap(15), 'very-long');
  assert.equal(rangeBandForBandGap(30), 'very-long');
  assert.throws(() => rangeBandForBandGap(-1), RangeError);
  assert.throws(() => rangeBandForBandGap(1.5), RangeError);
});

test('a scene-less encounter defaults to a scene-shaped map unless range-line is explicitly requested', async () => {
  const { campaign, character } = await fixture();
  const encounter = createEncounterDocument({
    campaign, character, opponent: { name: 'Raider' },
    date: { year: 4800, dayOfYear: 141 }, range: 'medium', dice: sequenceDice([3, 3])
  });
  assert.equal(encounter.sceneId, null);
  assert.equal(encounter.map.grid, 'square');
  assert.equal(encounter.map.spatialMode, 'scene');
});

test('spatialMode: range-line builds Book 1\'s single-row line instead of a generated board', async () => {
  const { campaign, character } = await fixture();
  const encounter = createEncounterDocument({
    campaign, character, opponent: { name: 'Sniper' }, spatialMode: 'range-line',
    date: { year: 4800, dayOfYear: 141 }, range: 'long', dice: sequenceDice([3, 3])
  });
  assert.equal(encounter.sceneId, null);
  assert.deepEqual(encounter.map, {
    grid: 'line', columns: ENCOUNTER_RANGE_LINE_COLUMNS, rows: 1,
    rangeGuide: ENCOUNTER_RANGE_LINE_GUIDE_VERSION, metersPerSquare: 1, spatialMode: 'range-line'
  });
  const party = encounter.combatants.find((entry) => entry.side === 'party');
  const sniper = encounter.combatants.find((entry) => entry.side === 'opposition');
  // The party anchors the line at 0; the opposition starts at the far edge
  // of the rolled/chosen named range — long's edge is 9 bands (Book 1 p.29).
  assert.deepEqual(party.position, { column: 0, row: 0 });
  assert.equal(sniper.position.row, 0);
  assert.equal(sniper.position.column, ENCOUNTER_RANGE_LINE_BAND_GAP.long);
  assert.equal(encounterPairRange(party, sniper, 'range-line'), 'long');
});

test('a range-line encounter cannot also be placed on a scene', async () => {
  const { campaign, character } = await fixture();
  const scene = createSceneDocument({ campaignId: campaign.identity.id, name: 'Bar', squares: 20, metersPerSquare: 5, createdAt: 1 });
  assert.throws(() => createEncounterDocument({
    campaign, character, scene, opponent: { name: 'Thug' }, spatialMode: 'range-line',
    date: { year: 4800, dayOfYear: 141 }, range: 'close', dice: sequenceDice([3, 3])
  }), TypeError);
});

test('closing walks one band, running closes two, matching Book 1 p.29\'s line-grid rule literally', async () => {
  const { campaign, character } = await fixture();
  let encounter = createEncounterDocument({
    campaign, character, opponent: { name: 'Thug' }, spatialMode: 'range-line',
    date: { year: 4800, dayOfYear: 141 }, range: 'very-long', dice: sequenceDice([6, 1])
  });
  const party = encounter.combatants.find((entry) => entry.side === 'party');
  const thug = encounter.combatants.find((entry) => entry.side === 'opposition');
  assert.equal(thug.position.column, ENCOUNTER_RANGE_LINE_BAND_GAP['very-long']);
  encounter = declareEncounterAction(encounter, { action: 'close', actorId: party.id, targetId: thug.id }).encounter;
  encounter = declareEncounterAction(encounter, { action: 'wait', actorId: thug.id }).encounter;
  encounter = resolveDeclaredRound(encounter, { dice: sequenceDice([1, 1, 1, 1]), date: { year: 4800, dayOfYear: 141 } }).encounter;
  const afterWalk = encounter.combatants.find((entry) => entry.id === party.id);
  assert.equal(afterWalk.position.column, 1, 'walking closes exactly one band');
  encounter = declareEncounterAction(encounter, { action: 'close-run', actorId: party.id, targetId: thug.id }).encounter;
  encounter = declareEncounterAction(encounter, { action: 'wait', actorId: thug.id }).encounter;
  encounter = resolveDeclaredRound(encounter, { dice: sequenceDice([1, 1, 1, 1]), date: { year: 4800, dayOfYear: 141 } }).encounter;
  const afterRun = encounter.combatants.find((entry) => entry.id === party.id);
  assert.equal(afterRun.position.column, 3, 'running closes exactly two bands');
});

test('opening beyond fifteen bands escapes, per Book 1 p.29, not the scene\'s twenty-band/500m threshold', async () => {
  const { campaign, character } = await fixture();
  let encounter = createEncounterDocument({
    campaign, character, opponent: { name: 'Thug' }, spatialMode: 'range-line',
    date: { year: 4800, dayOfYear: 141 }, range: 'close', dice: sequenceDice([6, 1])
  });
  const party = encounter.combatants.find((entry) => entry.side === 'party');
  const thug = encounter.combatants.find((entry) => entry.side === 'opposition');
  // Sixteen rounds of running open (two bands each) clears the fifteen-band
  // escape threshold; a scene fight would need five hundred meters instead.
  // Declare an explicit wait for the opposition too: with tactics left on
  // 'auto' but no declaration supplied, resolveDeclaredRound falls back to
  // "attack, or close on the nearest foe" for whoever is undeclared — which
  // would have Thug chase the party back and confuse the arithmetic this
  // test is checking. An explicit wait keeps the round to party movement only.
  for (let round = 0; round < 8; round += 1) {
    encounter = declareEncounterAction(encounter, { action: 'open-run', actorId: party.id, targetId: thug.id }).encounter;
    encounter = declareEncounterAction(encounter, { action: 'wait', actorId: thug.id }).encounter;
    encounter = resolveDeclaredRound(encounter, { dice: sequenceDice([1, 1, 1, 1, 1, 1]), date: { year: 4800, dayOfYear: 141 } }).encounter;
    if (encounter.status !== 'active') break;
  }
  const escapedParty = encounter.combatants.find((entry) => entry.id === party.id);
  assert.equal(escapedParty.status, 'escaped');
});

test('a document already marked schemaVersion 16 but missing spatialMode is repaired, not rejected', () => {
  // Reproduces a real failure: a document that reached schemaVersion 16 by
  // some path other than the clean v15->v16 step above (an incompatible
  // intermediate version written during development) and so never got
  // spatialMode set. The version-gated migration step is a no-op here since
  // schemaVersion is already 16 — this has to be repaired independently of
  // that check, deriving from map.grid so a genuine range-line document
  // missing only this field doesn't get incorrectly flipped to 'scene'.
  const broken = {
    documentType: 'graycloak-traveller-personal-encounter', schemaVersion: 16,
    identity: { id: 'e1', title: 'T' }, campaignId: 'c1', situationId: null, sceneId: null,
    location: { systemId: 's', systemName: 'S' },
    timing: { createdDate: { year: 4800, dayOfYear: 1 }, resolvedDate: null },
    status: 'setup', round: 1, range: 'medium',
    surprise: {
      results: [{ sideId: 'party', roll: 1, dm: 0, total: 1 }, { sideId: 'opposition', roll: 1, dm: 0, total: 1 }],
      margin: 0, surpriseSideId: null, surprisedSideId: null, conditions: { party: {}, opposition: {} }
    },
    conditions: { lighting: 'normal' },
    map: { grid: 'square', columns: 201, rows: 201, rangeGuide: 'graycloak-meter-grid-v4', metersPerSquare: 5 },
    roundState: { declaredActions: [] }, combatants: [], history: [], outcome: null,
    provenance: { rulesBasis: 'classic-traveller-book-1-personal-combat-1981-facsimile-errata', setting: 'x' }
  };
  const fixed = importEncounterDocument(broken);
  assert.equal(fixed.map.spatialMode, 'scene');
  const brokenLine = { ...broken, map: { ...broken.map, grid: 'line', columns: 41, rows: 1, rangeGuide: 'graycloak-book1-line-grid-v1' } };
  const fixedLine = importEncounterDocument(brokenLine);
  assert.equal(fixedLine.map.spatialMode, 'range-line', 'derives from grid rather than defaulting blindly');
});

test('a corrupt embedded encounter is dropped, not fatal to the whole campaign bundle', async () => {
  const { campaign, character } = await fixture();
  const good = createEncounterDocument({
    campaign, character, opponent: { name: 'Thug' }, spatialMode: 'range-line',
    date: { year: 4800, dayOfYear: 141 }, range: 'close', dice: sequenceDice([3, 3])
  });
  let withGood = addEncounterToCampaign(campaign, good);
  // A hand-corrupted encounter, standing in for the real-world failure: some
  // incompatible write left a document that fails validation outright. The
  // whole campaign used to fail to open over this single tracker. (Shrinking
  // the line-grid board below the escape band's own width isn't something
  // any repair step patches — unlike a missing spatialMode, there's no
  // single correct value to infer here.)
  const corrupt = { ...good, identity: { id: 'corrupt-encounter', title: 'Corrupt' }, map: { ...good.map, columns: 3 } };
  const withBoth = addEncounterToCampaign(withGood, corrupt);
  const bundle = createCampaignBundle(withGood, { characters: [character], encounters: [good] });
  const raw = JSON.parse(JSON.stringify(bundle));
  raw.campaign = withBoth; // campaign now references the corrupt encounter too
  raw.documents.encounters.push(corrupt); // ...and it's present in the bundle
  const reimported = importCampaignBundle(raw);
  assert.equal(reimported.documents.encounters.length, 1, 'the corrupt encounter is dropped, the good one kept');
  assert.equal(reimported.documents.encounters[0].identity.id, good.identity.id);
  assert.equal(reimported.campaign.documentRefs.encounters.length, 1, 'the campaign\'s own reference list is trimmed to match');
  assert.ok(!reimported.campaign.documentRefs.encounters.some((ref) => ref.id === 'corrupt-encounter'));
});
