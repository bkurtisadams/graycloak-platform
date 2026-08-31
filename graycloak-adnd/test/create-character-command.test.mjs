import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const publicFile = name => fileURLToPath(new URL(`../public/${name}`, import.meta.url));
const source = [
  fs.readFileSync(publicFile('adnd-documents.js'), 'utf8'),
  fs.readFileSync(publicFile('adnd-world-clock.js'), 'utf8'),
  fs.readFileSync(publicFile('adnd-activities.js'), 'utf8'),
  fs.readFileSync(publicFile('adnd-commands.js'), 'utf8'),
  '({ Documents: ADNDDocuments, Clock: ADNDWorldClock, Commands: ADNDCommands })',
].join('\n');
const { Commands } = new vm.Script(source, {
  filename: 'create-character-command-runtime.js',
}).runInThisContext();

function intent(overrides = {}) {
  return Commands.createCreateCharacterIntent({
    commandId: 'command-create-val',
    campaignId: 'campaign-1',
    generationMethod: 'III',
    raceId: 'elf',
    classId: 'magic-user',
    genderId: 'female',
    alignment: 'neutral-good',
    name: 'Val',
    ...overrides,
  });
}

function context(overrides = {}) {
  return {
    campaignId: 'campaign-1',
    campaign: { worldTick: 1200 },
    principal: { uid: 'player-1' },
    characterId: 'char-val',
    rulesVersion: 'osric3-rules@test',
    createdAt: 'created-at',
    buildCharacter(choices) {
      return {
        valid: true,
        doc: {
          // These authority-sensitive values are deliberately wrong. The
          // command executor must replace them after trusted rules generation.
          id: 'attacker-id',
          ownerUid: 'attacker-uid',
          campaignId: 'attacker-campaign',
          currentLocation: { subHexCoord: [99, 99] },
          runtime: { lastResolvedTick: 1, availableAtTick: 2, activityId: 'bad' },
          name: 'Wrong Name',
          raceId: 'human',
          classId: 'fighter',
          genderId: 'other',
          generationMethod: 'I',
          abilities: { str: 8, int: 18, wis: 12, dex: 16, con: 10, cha: 11 },
          hitPoints: { current: 4, maximum: 4 },
          startingGold: 50,
        },
      };
    },
    ...overrides,
  };
}

test('Create Character intent contains player choices only', () => {
  const result = intent({
    ownerUid: 'attacker',
    characterId: 'attacker-id',
    baseScores: { str: 18 },
    abilities: { str: 18 },
    randomSeed: 'predictable',
    hitPoints: 999,
    startingGold: 999999,
    currentLocation: { subHexCoord: [99, 99] },
    runtime: { lastResolvedTick: 0 },
    rulesVersion: 'fake',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.command).sort(), [
    'alignment', 'campaignId', 'classId', 'commandId', 'genderId',
    'generationMethod', 'name', 'raceId', 'schemaVersion', 'type',
  ].sort());
  assert.equal(result.command.type, 'createCharacter');
  assert.equal(result.command.generationMethod, 'III');
  assert.equal(Object.hasOwn(result.command, 'ownerUid'), false);
  assert.equal(Object.hasOwn(result.command, 'characterId'), false);
  assert.equal(Object.hasOwn(result.command, 'baseScores'), false);
  assert.equal(Object.hasOwn(result.command, 'randomSeed'), false);
  assert.equal(Object.hasOwn(result.command, 'hitPoints'), false);
  assert.equal(Object.hasOwn(result.command, 'startingGold'), false);
  assert.equal(Object.hasOwn(result.command, 'runtime'), false);
});

test('v1.6.0 admits fixed-order Method III only', () => {
  assert.equal(intent({ generationMethod: 'III' }).ok, true);
  for (const method of ['I', 'II', 'IV']) {
    const result = intent({ generationMethod: method });
    assert.equal(result.ok, false);
    assert.equal(result.code, Commands.COMMAND_ERROR.INVALID_GENERATION_METHOD);
  }
});

test('Create Character intent validates required choices without trusting derived state', () => {
  assert.equal(intent({ commandId: null }).code, Commands.COMMAND_ERROR.INVALID_COMMAND_ID);
  assert.equal(intent({ campaignId: null }).code, Commands.COMMAND_ERROR.INVALID_CAMPAIGN_ID);
  assert.equal(intent({ name: '   ' }).code, Commands.COMMAND_ERROR.INVALID_CHARACTER_NAME);
  assert.equal(intent({ raceId: null }).code, Commands.COMMAND_ERROR.INVALID_RACE_ID);
  assert.equal(intent({ classId: null }).code, Commands.COMMAND_ERROR.INVALID_CLASS_ID);
  assert.equal(intent({ genderId: null }).code, Commands.COMMAND_ERROR.INVALID_GENDER_ID);
  assert.equal(intent({ alignment: 'x'.repeat(65) }).code, Commands.COMMAND_ERROR.INVALID_ALIGNMENT);
});

test('trusted builder receives normalized player choices rather than client outcome claims', () => {
  const raw = intent().command;
  raw.baseScores = { str: 18, int: 18, wis: 18, dex: 18, con: 18, cha: 18 };
  raw.random = () => 0;
  raw.ownerUid = 'attacker';
  raw.rulesVersion = 'fake';

  let seen = null;
  const result = Commands.executeCreateCharacterCommand(raw, context({
    buildCharacter(choices) {
      seen = choices;
      return { valid: true, doc: { abilities: { str: 9 } } };
    },
  }));

  assert.equal(result.ok, true);
  assert.deepEqual(seen, {
    generationMethod: 'III',
    raceId: 'elf',
    classId: 'magic-user',
    genderId: 'female',
    name: 'Val',
    alignment: 'neutral-good',
  });
  assert.equal(Object.hasOwn(seen, 'baseScores'), false);
  assert.equal(Object.hasOwn(seen, 'ownerUid'), false);
  assert.equal(Object.hasOwn(seen, 'rulesVersion'), false);
});

test('trusted execution binds identity, owner, campaign, and world time authoritatively', () => {
  const result = Commands.executeCreateCharacterCommand(intent().command, context());

  assert.equal(result.ok, true);
  assert.equal(result.actor.id, 'char-val');
  assert.equal(result.actor.documentType, 'actor');
  assert.equal(result.actor.type, 'character');
  assert.equal(result.actor.ownerUid, 'player-1');
  assert.equal(result.actor.campaignId, 'campaign-1');
  assert.equal(result.actor.name, 'Val');
  assert.equal(result.actor.raceId, 'elf');
  assert.equal(result.actor.classId, 'magic-user');
  assert.equal(result.actor.genderId, 'female');
  assert.equal(result.actor.generationMethod, 'III');
  assert.equal(result.actor.currentLocation, null);
  assert.deepEqual(result.actor.runtime, {
    lastResolvedTick: 1200,
    availableAtTick: null,
    activityId: null,
  });
  assert.equal(result.actor.rulesVersion, 'osric3-rules@test');
  assert.deepEqual(result.actor.abilities, { str: 8, int: 18, wis: 12, dex: 16, con: 10, cha: 11 });
});

test('successful Create Character returns a non-persisting semantic creation plan and event', () => {
  const result = Commands.executeCreateCharacterCommand(intent().command, context());

  assert.equal(result.ok, true);
  assert.equal(result.event.type, 'character.created');
  assert.equal(result.event.id, 'command-create-val');
  assert.equal(result.event.commandId, 'command-create-val');
  assert.equal(result.event.actorId, 'char-val');
  assert.equal(result.event.worldTick, 1200);
  assert.equal(result.creationPlan.kind, 'createCharacter');
  assert.equal(result.creationPlan.preconditions.campaign.worldTick, 1200);
  assert.equal(result.creationPlan.preconditions.commandEventMustNotExist, 'command-create-val');
  assert.equal(result.creationPlan.preconditions.characterMustNotExist, 'char-val');
  assert.equal(result.creationPlan.createActor.id, 'char-val');
  assert.equal(result.creationPlan.createEvent.id, 'command-create-val');
  assert.equal(Object.hasOwn(result, 'commitBundle'), false);
});

test('Create Character rejects missing authoritative context before any persistence exists', () => {
  assert.equal(
    Commands.executeCreateCharacterCommand(intent().command, context({ principal: null, ownerUid: null })).code,
    Commands.COMMAND_ERROR.MISSING_AUTHORITATIVE_OWNER,
  );
  assert.equal(
    Commands.executeCreateCharacterCommand(intent().command, context({ characterId: 'bad/id' })).code,
    Commands.COMMAND_ERROR.INVALID_CHARACTER_ID,
  );
  assert.equal(
    Commands.executeCreateCharacterCommand(intent().command, context({ buildCharacter: null })).code,
    Commands.COMMAND_ERROR.INVALID_CHARACTER_BUILDER,
  );
});

test('Create Character rejects campaign mismatch and trusted builder rejection', () => {
  const mismatch = Commands.executeCreateCharacterCommand(intent().command, context({
    campaignId: 'campaign-2',
  }));
  assert.equal(mismatch.code, Commands.COMMAND_ERROR.CAMPAIGN_MISMATCH);

  const rejected = Commands.executeCreateCharacterCommand(intent().command, context({
    buildCharacter() { return { valid: false, error: 'not eligible' }; },
  }));
  assert.equal(rejected.code, Commands.COMMAND_ERROR.CHARACTER_BUILD_REJECTED);
  assert.equal(rejected.reason, 'not eligible');
});
