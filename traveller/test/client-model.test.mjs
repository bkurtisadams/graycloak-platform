import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHARGEN_ACTIONS,
  CHARGEN_PHASES,
  createCharacter,
  createCharacterDocument,
  createSequenceDice,
  createTypeSScoutReserveShipForCharacter,
  importCharacterDocument,
  performChargenAction
} from '../../packages/classic-traveller-rules/index.js';

import {
  buildCharacterRecord,
  buildContractBoardRecord,
  buildFinalCharacterRecord,
  buildGenerationLog,
  buildJumpPlan,
  buildPortServicesRecord,
  buildProcedure,
  buildShipRecord,
  buildSystemRecord,
  buildServiceHistory,
  formatHistoryEvent,
  nobleTitleLabel
} from '../client/ui-model.js';

import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';

function sevenCharacter() {
  return createCharacter({
    name: 'Test Traveller',
    dice: createSequenceDice([3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4])
  });
}

test('initial browser model renders a personnel record and six legal service choices', () => {
  const character = sevenCharacter();
  const record = buildCharacterRecord(character);
  const procedure = buildProcedure(character);

  assert.match(record, /UPP 777777/);
  assert.match(record, /AGE 18/);
  assert.match(record, /SERVICE APPLICATION/);
  assert.equal(procedure.available.phase, CHARGEN_PHASES.SERVICE_SELECTION);
  assert.deepEqual(procedure.available.actions, [CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT]);
  assert.equal(procedure.available.choices.services.length, 6);
});

test('browser records distinguish noble titles from military rank', () => {
  const character = sevenCharacter();
  character.characteristics.SOC = 12;
  character.upp = '77777C';

  assert.equal(nobleTitleLabel(12), 'Baron / Baronet / Baroness (OR VON / HAUT / HAULT)');
  assert.match(buildCharacterRecord(character), /NOBLE TITLE Baron \/ Baronet \/ Baroness \(OR VON \/ HAUT \/ HAULT\)/);
  assert.equal(nobleTitleLabel(10), 'NONE');
  assert.match(nobleTitleLabel(16), /SPECIFIC TITLE NOT LISTED FOR SOC G/);
});

test('browser model follows engine state after enlistment without carrying target numbers', () => {
  let character = sevenCharacter();
  character = performChargenAction(character, CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT, {
    service: 'other',
    dice: createSequenceDice([2, 2])
  }).character;

  const procedure = buildProcedure(character);
  assert.equal(procedure.available.phase, CHARGEN_PHASES.TERM_READY);
  assert.deepEqual(procedure.available.actions, [CHARGEN_ACTIONS.BEGIN_TERM]);
  assert.match(buildServiceHistory(character), /ENLIST OTHER/);
  assert.match(buildGenerationLog(character), /ACCEPTED/);
});

test('history formatter exposes actual roll, DM, total, and target from engine history', () => {
  let character = createCharacter({
    dice: createSequenceDice([3, 4, 3, 4, 3, 4, 3, 4, 5, 5, 3, 4])
  });
  character = performChargenAction(character, CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT, {
    service: 'navy',
    dice: createSequenceDice([1, 2])
  }).character;

  const event = character.history.at(-1);
  const line = formatHistoryEvent(event);
  assert.match(line, /roll 1\+2/);
  assert.match(line, /DM \+2/);
  assert.match(line, /total 5/);
  assert.match(line, /vs 8\+/);
  assert.match(line, /FAILED/);
});

test('browser model supplies contextual help and attention state for decisions', async () => {
  const { helpForTopic } = await import('../client/ui-model.js');
  const help = helpForTopic('service-selection');
  assert.equal(help.title, 'SERVICE APPLICATION');
  assert.match(help.body, /draft/i);

  let character = sevenCharacter();
  character = performChargenAction(character, CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT, {
    service: 'other',
    dice: createSequenceDice([2, 2])
  }).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.BEGIN_TERM).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.RESOLVE_SURVIVAL, {
    dice: createSequenceDice([6, 6])
  }).character;

  const procedure = buildProcedure(character);
  assert.equal(procedure.helpTopic, character.phase);
  assert.equal(typeof procedure.attention, 'boolean');
});


test('completed chargen renders a final gameplay personnel record', () => {
  let character = sevenCharacter();
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

  const document = createCharacterDocument(character);
  const record = buildFinalCharacterRecord(document);
  assert.match(record, /FINAL PERSONNEL RECORD/);
  assert.match(record, /GAMEPLAY DOCUMENT v3/);
  assert.match(record, /PASSAGE Low Passage/);
  assert.doesNotMatch(record, /PHASE/);
});

test('final record shows the Book 1 duplicate Scout Ship result as one effective reserve assignment', () => {
  const document = {
    documentType: 'classic-traveller-character',
    schemaVersion: 2,
    identity: { id: 'char-test-scout', name: 'Scout', aliases: [] },
    age: 38,
    chronology: { chronologicalAgeMonths: 456, physicalAgeMonths: 456, nextAgingCheckAgeMonths: 504 },
    characteristics: { STR: 10, DEX: 10, END: 6, INT: 7, EDU: 7, SOC: 7 },
    upp: 'AA6777',
    status: { alive: true, retired: true },
    career: { service: 'scouts', drafted: false, terms: 5, yearsServed: 20, rank: 0, rankTitle: '', separationReason: 'voluntary' },
    skills: { Pilot: 1 },
    finances: { credits: 0, retirementPayAnnual: 4000 },
    benefits: {
      raw: [{ type: 'material', name: 'Scout Ship' }, { type: 'material', name: 'Scout Ship' }],
      passages: [], memberships: [], equipment: [],
      shipEntitlements: [{ name: 'Scout Ship', rolls: 2, effectiveCount: 1, noEffectCount: 1, disposition: 'reserve-assignment-available' }]
    },
    shipRefs: [],
    history: [], notes: '', provenance: { source: 'classic-traveller-book-1-chargen', chargenSchemaVersion: 4 }
  };
  const record = buildFinalCharacterRecord(document);
  assert.match(record, /SHIP ENTITLEMENT Scout Ship \/ ROLLS 2 \/ EFFECTIVE 1/);
  assert.match(record, /NO FURTHER EFFECT: 1/);
});

test('ship register renders the source-backed Type S reserve assignment', () => {
  const document = {
    documentType: 'classic-traveller-character',
    schemaVersion: 2,
    identity: { id: 'char-test-scout', name: 'Scout', aliases: [] },
    age: 38,
    chronology: { chronologicalAgeMonths: 456, physicalAgeMonths: 456, nextAgingCheckAgeMonths: 504 },
    characteristics: { STR: 10, DEX: 10, END: 6, INT: 7, EDU: 7, SOC: 7 },
    upp: 'AA6777',
    status: { alive: true, retired: true },
    career: { service: 'scouts', drafted: false, terms: 5, yearsServed: 20, rank: 0, rankTitle: '', separationReason: 'voluntary' },
    skills: { Pilot: 1 },
    finances: { credits: 0, retirementPayAnnual: 4000 },
    benefits: {
      raw: [{ type: 'material', name: 'Scout Ship' }],
      passages: [], memberships: [], equipment: [],
      shipEntitlements: [{ name: 'Scout Ship', rolls: 1, effectiveCount: 1, noEffectCount: 0, disposition: 'reserve-assignment-available' }]
    },
    shipRefs: [],
    history: [], notes: '', provenance: { source: 'classic-traveller-book-1-chargen', chargenSchemaVersion: 4 }
  };
  const { ship } = createTypeSScoutReserveShipForCharacter(importCharacterDocument(document));
  const record = buildShipRecord(ship);
  assert.match(record, /TYPE S SCOUT\/COURIER/);
  assert.match(record, /JUMP 2 \(A\)/);
  assert.match(record, /MANEUVER 2G \(A\)/);
  assert.match(record, /COMPUTER MODEL\/1bis/);
  assert.match(record, /CARGO 0\/3t/);
  assert.match(record, /FUEL UNRECORDED\/40t/);
  assert.match(record, /SHIP ACCOUNT Cr0/);
  assert.match(record, /TURRET DOUBLE/);
  assert.match(record, /WEAPONS NONE INSTALLED/);
  assert.match(record, /CONTROL Scout Service/);
  assert.match(record, /CHARACTER TITLE NOT GRANTED BY BENEFIT/);
  assert.match(record, /SALE ALLOWED NO/);
  assert.match(record, /ENGINEERING DUTIES Scout \/ STANDARD TYPE S DUTY; ENGINEERING SKILL NOT IMPLIED/);
});


test('jump plan distinguishes starting location, in-range jump, and out-of-range selection', () => {
  const campaign = { identity: { name: 'Sea of Suns' } };
  const currentSystem = { id: 'port-meridian', hex: '0405', name: 'Port Meridian', mainWorld: { id: 'new-esperanza', name: 'New Esperanza' } };
  const selectedSystem = { id: 'aster', hex: '0505', name: 'Aster', mainWorld: { id: 'aster-prime', name: 'Aster Prime' } };

  assert.match(buildJumpPlan({ campaign, selectedSystem }), /SET CURRENT LOCATION/);
  assert.match(buildJumpPlan({ campaign, currentSystem, selectedSystem, distance: 1, jumpRating: 2 }), /STATUS IN RANGE/);
  assert.match(buildJumpPlan({ campaign, currentSystem, selectedSystem, distance: 3, jumpRating: 2 }), /STATUS OUT OF RANGE/);
});


test('system record renders Aster UWP meanings and system contents', () => {
  const aster = FAR_MERIDIAN_SUBSECTOR.systems.find((system) => system.id === 'aster');
  const record = buildSystemRecord(aster);
  assert.match(record, /SYSTEM RECORD \/\/ ASTER \/\/ 0505/);
  assert.match(record, /MAIN WORLD ASTER PRIME\s+UWP B765845-9/);
  assert.match(record, /STARPORT B \/ GOOD QUALITY INSTALLATION/);
  assert.match(record, /ATMOSPHERE 6 \/ STANDARD/);
  assert.match(record, /HYDROGRAPHICS 5 \/ 50% WATER/);
  assert.match(record, /POPULATION 8 \/ HUNDREDS OF MILLIONS/);
  assert.match(record, /GOVERNMENT 4 \/ REPRESENTATIVE DEMOCRACY/);
  assert.match(record, /TRADE CLASSIFICATIONS RICH/);
  assert.match(record, /BASES SCOUT\s+GAS GIANT YES\s+TRAVEL ZONE NONE \/ NORMAL/);
});


test('port services record exposes fuel, berthing, cargo, and operating funds at the current world', () => {
  const document = {
    documentType: 'classic-traveller-character', schemaVersion: 2,
    identity: { id: 'char-port-test', name: 'Scout', aliases: [] }, age: 38,
    chronology: { chronologicalAgeMonths: 456, physicalAgeMonths: 456, nextAgingCheckAgeMonths: 504 },
    characteristics: { STR: 10, DEX: 10, END: 6, INT: 7, EDU: 7, SOC: 7 }, upp: 'AA6777',
    status: { alive: true, retired: true }, career: { service: 'scouts', drafted: false, terms: 5, yearsServed: 20, rank: 0, rankTitle: '', separationReason: 'voluntary' },
    skills: { Pilot: 1 }, finances: { credits: 80000, retirementPayAnnual: 4000 },
    benefits: { raw: [{ type: 'material', name: 'Scout Ship' }], passages: [], memberships: [], equipment: [], shipEntitlements: [{ name: 'Scout Ship', rolls: 1, effectiveCount: 1, noEffectCount: 0, disposition: 'reserve-assignment-available' }] },
    shipRefs: [], history: [], notes: '', provenance: { source: 'classic-traveller-book-1-chargen', chargenSchemaVersion: 4 }
  };
  const migrated = importCharacterDocument(document);
  const { ship } = createTypeSScoutReserveShipForCharacter(migrated);
  const aster = FAR_MERIDIAN_SUBSECTOR.systems.find((system) => system.id === 'aster');
  const record = buildPortServicesRecord({ system: aster, ship, character: migrated });
  assert.match(record, /PORT SERVICES \/\/ ASTER \/\/ 0505/);
  assert.match(record, /TRADE RICH/);
  assert.match(record, /FUEL UNRECORDED\/40t \/ UNKNOWN/);
  assert.match(record, /SERVICE REFINED \/ FREE AT SCOUT BASE/);
  assert.match(record, /BERTHING NO CURRENT FEE RECORDED/);
  assert.match(record, /CARGO 0\/3t/);
  assert.match(record, /SHIP ACCOUNT Cr0\s+CHARACTER Cr80,000/);
});


test('job board labels current port, map selection, and origin-to-destination routes', () => {
  const system = { id: 'orison', name: 'Orison', hex: '0704' };
  const selectedSystem = { id: 'aster', name: 'Aster', hex: '0505' };
  const active = {
    status: 'accepted',
    identity: { title: 'Priority Delivery' },
    origin: { systemName: 'Orison' },
    destination: { systemName: 'Aster' },
    requirements: { cargoTons: 1, exclusiveShip: false },
    economics: { paymentCr: 12000 },
    timing: { deadlineDate: { year: 4800, dayOfYear: 127 } }
  };
  const offer = {
    title: 'Courier Packet', originSystemName: 'Orison', destinationSystemName: 'Cinder',
    paymentCr: 16000, deadlineDays: 14, cargoTons: 0, exclusiveShip: false,
    rulesBasis: 'sea-of-suns-original', requirementsDescription: 'Sealed packet.'
  };
  const record = buildContractBoardRecord({ system, selectedSystem, contracts: [active], offers: [offer] });
  assert.match(record, /CURRENT PORT ORISON \/ 0704/);
  assert.match(record, /MAP SELECTED ASTER \/ NAVIGATION SELECTION ONLY/);
  assert.match(record, /ALL NEW OFFERS ORIGINATE AT THE CURRENT PORT/);
  assert.match(record, /ACTIVE JOBS/);
  assert.match(record, /ORISON -> ASTER/);
  assert.match(record, /AVAILABLE AT ORISON/);
  assert.match(record, /ORISON -> CINDER/);
});
