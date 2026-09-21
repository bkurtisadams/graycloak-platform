import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHARACTER_DOCUMENT_TYPE,
  CURRENT_CHARACTER_DOCUMENT_SCHEMA_VERSION,
  CharacterDocumentValidationError,
  CHARGEN_ACTIONS,
  CHARGEN_PHASES,
  createCharacter,
  createCharacterDocument,
  createSequenceDice,
  exportCharacterDocument,
  importCharacterDocument,
  performChargenAction,
  summarizeMaterialBenefits,
  updateCharacterGameplayState,
  validateCharacterDocument
} from '../index.js';

function completeOneTermCharacter() {
  let character = createCharacter({
    name: 'Avery',
    dice: createSequenceDice([3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4])
  });
  character = performChargenAction(character, CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT, {
    service: 'other', dice: createSequenceDice([2, 2])
  }).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.BEGIN_TERM).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.RESOLVE_SURVIVAL, {
    dice: createSequenceDice([3, 3])
  }).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.ROLL_SKILL, {
    tableKey: 'personal-development', dice: createSequenceDice([1])
  }).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.ROLL_SKILL, {
    tableKey: 'service-skills', dice: createSequenceDice([2])
  }).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.COMPLETE_TERM).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.ROLL_REENLISTMENT, {
    dice: createSequenceDice([1, 1])
  }).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.BEGIN_MUSTER_OUT).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.ROLL_MUSTER_BENEFIT, {
    dice: createSequenceDice([1])
  }).character;
  assert.equal(character.phase, CHARGEN_PHASES.COMPLETE);
  return character;
}

test('completed chargen state converts to a compact gameplay character document', () => {
  const chargen = completeOneTermCharacter();
  const document = createCharacterDocument(chargen, { aliases: ['Test Call Sign'] });

  assert.equal(document.documentType, CHARACTER_DOCUMENT_TYPE);
  assert.equal(document.schemaVersion, CURRENT_CHARACTER_DOCUMENT_SCHEMA_VERSION);
  assert.match(document.identity.id, /^char-[0-9a-f]{16}$/);
  assert.equal(document.identity.name, 'Avery');
  assert.deepEqual(document.identity.aliases, ['Test Call Sign']);
  assert.equal(document.upp, chargen.upp);
  assert.deepEqual(document.characteristics, chargen.characteristics);
  assert.deepEqual(document.current, { STR: chargen.characteristics.STR, DEX: chargen.characteristics.DEX, END: chargen.characteristics.END });
  assert.equal(document.status.consciousness, 'conscious');
  assert.deepEqual(document.loadout, { weaponKey: 'hands', armor: 'none' });
  assert.deepEqual(document.skills, chargen.skills);
  assert.equal(document.career.service, 'other');
  assert.equal(document.career.terms, 1);
  assert.equal(document.finances.credits, 0);
  assert.deepEqual(document.benefits.passages, [{ name: 'Low Passage', count: 1 }]);
  assert.equal(document.history.at(-1).type, 'chargen-complete');
  assert.equal(Object.hasOwn(document, 'phase'), false);
  assert.equal(Object.hasOwn(document, 'musterOut'), false);
  assert.equal(Object.hasOwn(document, 'currentTerm'), false);
  assert.equal(validateCharacterDocument(document).valid, true);
});

test('schema v2 gameplay characters migrate with current health and a usable loadout', () => {
  const legacy = createCharacterDocument(completeOneTermCharacter());
  legacy.schemaVersion = 2;
  delete legacy.current;
  delete legacy.status.consciousness;
  delete legacy.loadout;

  const migrated = importCharacterDocument(legacy);
  assert.equal(migrated.schemaVersion, 5);
  // v5 (Sep 2026): the record block arrives empty. Nothing already filed
  // knows its own birthworld, and guessing one would be inventing history.
  assert.equal(migrated.record.birthworld, '');
  assert.equal(migrated.record.psionicStrength, null);
  assert.equal(migrated.record.travellersMember, false);
  // v0.62.0 (schema 4): migration seeds the inventory from what is known.
  assert.ok(Array.isArray(migrated.inventory));
  assert.deepEqual(migrated.current, {
    STR: migrated.characteristics.STR,
    DEX: migrated.characteristics.DEX,
    END: migrated.characteristics.END
  });
  assert.deepEqual(migrated.loadout, { weaponKey: 'hands', armor: 'none' });
  assert.equal(migrated.status.consciousness, 'conscious');
});

test('gameplay state updates preserve original UPP while recording wounds and loadout', () => {
  const document = createCharacterDocument(completeOneTermCharacter());
  const updated = updateCharacterGameplayState(document, {
    current: { ...document.current, STR: document.current.STR - 2 },
    weaponKey: 'rifle',
    armor: 'cloth'
  });

  assert.equal(updated.characteristics.STR, document.characteristics.STR);
  assert.equal(updated.current.STR, document.current.STR - 2);
  assert.equal(updated.upp, document.upp);
  assert.deepEqual(updated.loadout, { weaponKey: 'rifle', armor: 'cloth' });
});

test('incomplete chargen state cannot become a gameplay character document', () => {
  const character = createCharacter({
    dice: createSequenceDice([3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4])
  });
  assert.throws(
    () => createCharacterDocument(character),
    (error) => error instanceof CharacterDocumentValidationError && /completed chargen/.test(error.message)
  );
});

test('material-benefit summary applies the Book 1 duplicate Scout Ship rule', () => {
  const benefits = summarizeMaterialBenefits([
    { type: 'material', name: 'Scout Ship' },
    { type: 'material', name: 'Low Passage' },
    { type: 'material', name: 'Scout Ship' }
  ]);

  assert.deepEqual(benefits.passages, [{ name: 'Low Passage', count: 1 }]);
  assert.deepEqual(benefits.shipEntitlements, [{
    name: 'Scout Ship',
    rolls: 2,
    effectiveCount: 1,
    noEffectCount: 1,
    disposition: 'reserve-assignment-available'
  }]);
  assert.equal(benefits.raw.length, 3);
});

test('character documents round-trip through strict JSON export/import', () => {
  const document = createCharacterDocument(completeOneTermCharacter());
  const imported = importCharacterDocument(exportCharacterDocument(document));
  assert.deepEqual(imported, document);
  assert.notEqual(imported, document);
  assert.notEqual(imported.characteristics, document.characteristics);
});

test('character-document import rejects unknown fields', () => {
  const document = { ...createCharacterDocument(completeOneTermCharacter()), mystery: true };
  assert.throws(
    () => importCharacterDocument(document),
    (error) => error instanceof CharacterDocumentValidationError
      && error.errors.some((message) => /unknown top-level field: mystery/.test(message))
  );
});

test('character-document import rejects a UPP inconsistent with characteristics', () => {
  const document = { ...createCharacterDocument(completeOneTermCharacter()), upp: 'AAAAAA' };
  assert.throws(
    () => importCharacterDocument(document),
    (error) => error instanceof CharacterDocumentValidationError
      && error.errors.some((message) => /upp must match/.test(message))
  );
});

// ---------------------------------------------------------------------------
// v0.261.0: Book 1 p.31 recovery, with Kurt's Sep 2026 ruling for the throw.
// ---------------------------------------------------------------------------

test('Book 1 p.31: three days of rest restores full strength, but not to the severely wounded', async () => {
  const { restCharacter, updateCharacterGameplayState, characterIsWounded } = await import('../index.js');
  const base = createCharacterDocument(completeOneTermCharacter());
  const hurt = updateCharacterGameplayState(base, { current: { STR: 2, DEX: base.characteristics.DEX, END: 1 } });
  assert.equal(characterIsWounded(hurt), true);
  const rested = restCharacter(hurt);
  assert.deepEqual(rested.current, { STR: base.characteristics.STR, DEX: base.characteristics.DEX, END: base.characteristics.END });
  assert.equal(rested.status.consciousness, 'conscious');

  // "recuperation without medical attention is not possible"
  const severe = updateCharacterGameplayState(hurt, { severelyWounded: true });
  assert.throws(() => restCharacter(severe), /severely wounded/);
  assert.throws(() => restCharacter(base), /not wounded/);
});

test('medical attention: 8+ with the medic\u2019s Medical as a DM, -5 with none, -2 for a non-human', async () => {
  const { medicalAttention, updateCharacterGameplayState, createSequenceDice } = await import('../index.js');
  const base = createCharacterDocument(completeOneTermCharacter());
  const severe = updateCharacterGameplayState(base, { current: { STR: 1, DEX: 1, END: base.characteristics.END }, severelyWounded: true });

  // 3 + 3 = 6, Medical-2 makes 8: success, and it clears the severe wound.
  const helped = medicalAttention(severe, { medicalLevel: 2, dice: createSequenceDice([3, 3]) });
  assert.equal(helped.success, true);
  assert.equal(helped.total, 8);
  assert.equal(helped.character.current.STR, base.characteristics.STR);
  assert.equal(helped.character.status.severelyWounded, undefined);

  // No Medical at all: -5.
  const untrained = medicalAttention(severe, { medicalLevel: null, dice: createSequenceDice([6, 6]) });
  assert.equal(untrained.skillDM, -5);
  assert.equal(untrained.total, 7);
  assert.equal(untrained.success, false);
  assert.equal(untrained.character.status.severelyWounded, true, 'a failure changes nothing');

  // Medical-0 is expertise: no penalty.
  assert.equal(medicalAttention(severe, { medicalLevel: 0, dice: createSequenceDice([4, 4]) }).success, true);
  // Xeno-medicine, optional: -2.
  const alien = medicalAttention(severe, { medicalLevel: 2, xeno: true, dice: createSequenceDice([3, 3]) });
  assert.equal(alien.xenoDM, -2);
  assert.equal(alien.success, false);
});

test('v0.263.0 Book 1\u2019s skill DMs: +1 a level mostly, Administration +2, Vacc Suit and Forward Observer +4, Forgery against the inspector', async () => {
  const { skillDM, skillGuide } = await import('../index.js');
  assert.equal(skillDM('Navigation', 2), 2);
  assert.equal(skillDM('Admin', 2), 4, 'recorded as Admin, read as Administration');
  assert.equal(skillDM('Vacc Suit', 1), 4);
  assert.equal(skillDM('Forward Observer', 2), 8);
  assert.equal(skillDM('Forgery', 3), 0, 'the forger\u2019s own throw takes nothing; it counts against the inspector');
  assert.equal(skillDM('Bribery', null), -5);
  assert.equal(skillDM('Administration', null), -3);
  assert.equal(skillGuide('Laser Rifle', { weaponNames: ['Laser Rifle'] }).weapon, true);
  assert.equal(skillGuide('Grav Vehicle').tagline, 'Vehicle operation');
  assert.equal(skillGuide('Something New').summary.length > 0, true, 'nothing is left blank');
  assert.deepEqual(skillGuide('Administration').throws.map((entry) => entry.target), [7]);
});

test('v0.264.0 the catalogue: Book 1 p.41 prices, Book 3 tech levels, and what a world will sell', async () => {
  const { CATALOGUE, catalogueEntry, catalogueAvailability, PERSONAL_WEAPONS } = await import('../index.js');
  // A gun is sold loaded: Book 1's price plus a clip.
  assert.equal(catalogueEntry('weapon:rifle').priceCr, 220);
  assert.equal(catalogueEntry('weapon:automatic-pistol').priceCr, 210);
  assert.equal(catalogueEntry('weapon:laser-rifle').priceCr, 5000, 'with its power pack');
  assert.equal(catalogueEntry('weapon:dagger').priceCr, 10);
  // Every catalogue weapon is one the combat rules know.
  for (const entry of CATALOGUE.filter((candidate) => candidate.weaponKey)) assert.ok(PERSONAL_WEAPONS[entry.weaponKey], entry.weaponKey);
  // Armour: Book 1's list, Battle Dress under the rules package's 'combat' key.
  assert.equal(catalogueEntry('armour:combat').name, 'Battle Dress');
  assert.equal(catalogueEntry('armour:combat').priceCr, 200000);
  assert.equal(catalogueEntry('gear:vacc-suit').techLevel, 7);

  const cinder = { techLevel: 6, lawLevel: 2 };
  assert.equal(catalogueAvailability(catalogueEntry('gear:vacc-suit'), cinder).buy, false, 'TL 7 on a TL 6 world');
  assert.match(catalogueAvailability(catalogueEntry('gear:vacc-suit'), cinder).reason, /tech level 7/);
  assert.equal(catalogueAvailability(catalogueEntry('gear:binoculars'), cinder).buy, true);
  assert.equal(catalogueAvailability(catalogueEntry('armour:combat'), cinder).buy, false, 'strictly military');
  const laser = catalogueAvailability(catalogueEntry('weapon:laser-rifle'), cinder, { prohibitedWeaponKeys: ['laser-rifle'] });
  assert.equal(laser.buy, true, 'buying is not carrying');
  assert.match(laser.warning, /Law level 2/);
  assert.equal(catalogueAvailability(catalogueEntry('gear:binoculars'), null).buy, false, 'not in port');
});
