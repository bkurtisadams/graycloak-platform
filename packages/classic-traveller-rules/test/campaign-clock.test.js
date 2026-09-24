// campaign-clock.test.js — v0.67.0: the calendar, the mortgage, maintenance
// as an act, and the clock that fires them.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createDice, createSequenceDice } from '../src/dice.js';
import { formatUPP } from '../src/characters/upp.js';
import {
  parseGameDate, formatGameDate, addDays, daysBetween, monthsElapsed, ageMonthsElapsed, DAYS_PER_YEAR
} from '../src/time/dates.js';
import { nextDueDates, advanceClock } from '../src/time/clock.js';
import { generateNpcCharacter } from '../src/characters/npc-generator.js';
import { createCharacterDocument, migrateCharacterDocument } from '../src/characters/character-document.js';
import {
  anchorCharacterChronology, ageCharacterDocumentTo, characterAgeAt, characterAgingCheckDate, characterAgingDue, resolveCharacterAging
} from '../src/characters/play-aging.js';
import { createShipDocument, migrateShipDocument, CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION } from '../src/starships/ship-document.js';
import {
  creditShipAccount, financeShip, shipMortgageSchedule, shipUpkeepDue, chargeShipUpkeep,
  shipMaintenanceStatus, performMaintenance, annualMaintenanceCr, MAINTENANCE_DAYS
} from '../src/starships/operations.js';

// ---------------------------------------------------------------- fixtures

function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function character({ seed = 7, id = 'char-kurt', name = 'Kurt Vance' } = {}) {
  const { character: generated } = generateNpcCharacter({ dice: createDice(lcg(seed)), service: 'merchants', terms: 4, name });
  return createCharacterDocument(generated, { id });
}

function freeTrader({ id = 'ship-margin-call', balanceCr = 0, crew = true } = {}) {
  const authority = {
    assignmentType: 'owned', controllingAuthority: 'owner', legalTitleHolder: 'char-kurt',
    legalTitleSourceStatus: 'test', characterOwnsShip: true, assignedCharacterId: 'char-kurt',
    assignedCharacterName: 'Kurt Vance', recallable: false, saleAllowed: true, useAsDesired: true,
    possessionAtServicePleasure: false,
    servicePrivileges: { freeFuelAtScoutBases: false, freeMaintenanceAtScoutBasesAtClassBStarports: false },
    operatorResponsibilities: { upkeep: true, crewCosts: true }
  };
  const ship = createShipDocument({
    designKey: 'type-a-free-trader', id, name: 'Margin Call', authority,
    crewAssignments: crew ? [
      { role: 'pilot', characterId: 'char-kurt', characterName: 'Kurt Vance' },
      { role: 'engineer', characterId: 'npc-dara', characterName: 'Dara' }
    ] : [{ role: 'pilot', characterId: 'char-kurt', characterName: 'Kurt Vance' }]
  });
  return balanceCr ? creditShipAccount(ship, balanceCr, { description: 'Opening balance', dateLabel: '001-1105' }) : ship;
}

// ------------------------------------------------------------------- dates

test('dates: DDD-YYYY labels round-trip through the ordinal, including year ends', () => {
  for (const label of ['001-1105', '217-1105', '365-1105', '001-1106', '100-0']) {
    assert.equal(formatGameDate(parseGameDate(label)), label.replace(/^(\d)-/, '00$1-').replace(/^(\d\d)-/, '0$1-'));
  }
  assert.equal(addDays('365-1105', 1), '001-1106');
  assert.equal(addDays('001-1106', -1), '365-1105');
  assert.equal(daysBetween('217-1105', '217-1106'), DAYS_PER_YEAR);
  assert.equal(parseGameDate('366-1105'), null);
  assert.equal(parseGameDate('1105-217'), null);
  assert.equal(monthsElapsed('001-1105', '060-1105'), 1);
  assert.equal(ageMonthsElapsed('001-1105', '001-1106'), 12);
});

// ---------------------------------------------------------------- mortgage

test('ship document v5 migrates forward with no mortgage', () => {
  const v5 = { ...freeTrader(), schemaVersion: 5 };
  delete v5.state.finances.mortgage;
  delete v5.state.computer;
  delete v5.state.malfunction;
  const migrated = migrateShipDocument(v5);
  assert.equal(migrated.schemaVersion, CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION);
  assert.equal(migrated.state.finances.mortgage, null);
});

test('Book 2 p.5: a financed Free Trader owes 1/240th of the cash price every 30 days from signing', () => {
  const ship = financeShip(freeTrader({ balanceCr: 1_000_000 }), { startedOn: '001-1105' });
  const schedule = shipMortgageSchedule(ship, { dateLabel: '001-1105' });
  assert.equal(schedule.financed, true);
  assert.equal(schedule.termMonths, 480);
  assert.equal(schedule.monthlyPaymentCr, Math.round(ship.state.finances.mortgage.cashPriceCr / 240));
  assert.equal(schedule.periodsDue, 0);
  assert.equal(schedule.nextDueDate, '031-1105');
  assert.equal(shipMortgageSchedule(ship, { dateLabel: '031-1105' }).periodsDue, 1);
  assert.equal(shipMortgageSchedule(ship, { dateLabel: '091-1105' }).periodsDue, 3);
});

test('mortgage payments are ledger lines; arrears mean the ship has skipped; the term closes at the last payment', () => {
  let ship = financeShip(freeTrader({ balanceCr: 400_000 }), { startedOn: '001-1105', termMonths: 2 });
  const monthly = ship.state.finances.mortgage.monthlyPaymentCr;
  // Two periods fall due; the account covers both.
  const charged = chargeShipUpkeep(ship, { dateLabel: '061-1105', unpaid: ['char-kurt'] });
  assert.equal(charged.mortgagePeriodsPaid, 2);
  assert.equal(charged.mortgageSkipped, false);
  ship = charged.ship;
  assert.equal(ship.state.finances.ledger.filter((entry) => entry.kind === 'mortgage').length, 2);
  assert.equal(ship.state.finances.ledger.at(-1).amountCr, -monthly);
  const done = shipMortgageSchedule(ship, { dateLabel: '365-1110' });
  assert.equal(done.paidOff, true);
  assert.equal(done.periodsDue, 0);
  assert.equal(done.nextDueDate, null);
});

test('salaries are settled before the mortgage when the account is short, and the shortfall is reported as skipped', () => {
  // Engineer at Cr4000/month, Kurt unpaid as owner-aboard; mortgage ~Cr154,500.
  const ship = financeShip(freeTrader({ balanceCr: 10_000 }), { startedOn: '001-1105' });
  const due = shipUpkeepDue(ship, { dateLabel: '031-1105', sinceLabel: '001-1105', unpaid: ['char-kurt'] });
  assert.equal(due.salaryPeriods, 1);
  assert.equal(due.mortgagePeriods, 1);
  assert.equal(due.totalDueCr, due.salariesDueCr + due.mortgageDueCr);
  const charged = chargeShipUpkeep(ship, { dateLabel: '031-1105', sinceLabel: '001-1105', unpaid: ['char-kurt'] });
  assert.equal(charged.salaryPeriodsPaid, 1);
  assert.equal(charged.mortgagePeriodsPaid, 0);
  assert.equal(charged.mortgageSkipped, true);
  assert.equal(charged.outstandingCr, due.mortgageDueCr);
  assert.equal(shipMortgageSchedule(charged.ship, { dateLabel: '031-1105' }).skipped, true);
});

// ------------------------------------------------------------- maintenance

test('Book 2 p.6: maintenance is due a year after the last overhaul and is no longer charged by upkeep', () => {
  const ship = freeTrader({ balanceCr: 1_000_000 });
  const fresh = shipMaintenanceStatus(ship, { dateLabel: '100-1105', sinceLabel: '001-1105' });
  assert.equal(fresh.status, 'current');
  assert.equal(fresh.dueDate, '001-1106');
  assert.equal(fresh.daysUntilDue, 266);
  const late = shipMaintenanceStatus(ship, { dateLabel: '010-1106', sinceLabel: '001-1105' });
  assert.equal(late.overdue, true);
  assert.equal(late.daysOverdue, 9);
  const charged = chargeShipUpkeep(ship, { dateLabel: '010-1106', sinceLabel: '001-1105', unpaid: ['char-kurt'] });
  assert.equal(charged.ship.state.finances.ledger.some((entry) => entry.kind === 'maintenance'), false);
  assert.equal(charged.maintenance.overdue, true);
});

test('performMaintenance takes the fee and two weeks at a class A or B port and is refused elsewhere', () => {
  const ship = freeTrader({ balanceCr: 1_000_000 });
  assert.throws(() => performMaintenance(ship, { dateLabel: '010-1106', starport: 'C' }), /class A or B/);
  const done = performMaintenance(ship, { dateLabel: '010-1106', starport: 'B' });
  assert.equal(done.costCr, annualMaintenanceCr(ship));
  assert.equal(done.daysTaken, MAINTENANCE_DAYS);
  assert.equal(done.completedOn, '024-1106');
  assert.equal(done.ship.state.maintenance.lastOverhaulDate, '010-1106');
  const after = shipMaintenanceStatus(done.ship, { dateLabel: '024-1106' });
  assert.equal(after.dueDate, '010-1107');
  assert.equal(after.overdue, false);
});

// ------------------------------------------------------------------ aging

test('character document v5 migrates to v6 unanchored', () => {
  const v5 = { ...character(), schemaVersion: 5 };
  delete v5.chronology.asOfDate;
  const v6 = migrateCharacterDocument(v5);
  assert.equal(v6.schemaVersion, 6);
  assert.equal(v6.chronology.asOfDate, null);
});

test('an anchored character ages with the calendar and knows when the next aging throw falls', () => {
  const doc = anchorCharacterChronology(character(), '001-1105');
  assert.equal(doc.age, 34);
  assert.equal(doc.chronology.nextAgingCheckAgeMonths, 456);
  // 48 months to go from 408 -> due four years on.
  assert.equal(characterAgingCheckDate(doc), '001-1109');
  assert.equal(characterAgeAt(doc, '001-1107').age, 36);
  const aged = ageCharacterDocumentTo(doc, '001-1109');
  assert.equal(aged.chronology.physicalAgeMonths, 456);
  assert.equal(aged.age, 38);
  assert.equal(characterAgingDue(aged), true);
  assert.throws(() => ageCharacterDocumentTo(aged, '001-1105'), /backwards/);
});

test('Book 1 aging table: a failed throw takes the loss off both the original and the current score', () => {
  const doc = ageCharacterDocumentTo(anchorCharacterChronology(character(), '001-1105'), '001-1109');
  const { STR, DEX, END } = doc.characteristics;
  // 34–49: STR 8+, DEX 7+, END 8+. Fail STR and END, pass DEX.
  const result = resolveCharacterAging(doc, { dice: createSequenceDice([1, 1, 6, 6, 1, 1]) });
  assert.deepEqual(result.checks.map((check) => check.success), [false, true, false]);
  assert.equal(result.document.characteristics.STR, STR - 1);
  assert.equal(result.document.characteristics.DEX, DEX);
  assert.equal(result.document.characteristics.END, END - 1);
  assert.equal(result.document.current.STR, STR - 1);
  assert.equal(result.document.chronology.nextAgingCheckAgeMonths, 456 + 48);
  assert.equal(result.crises.length, 0);
  assert.equal(result.document.history.at(-1).type, 'aging');
});

// ------------------------------------------------------------------ clock

test('nextDueDates lists every scheduled event from the documents alone, earliest first', () => {
  const ship = financeShip(freeTrader({ balanceCr: 5_000_000 }), { startedOn: '001-1105' });
  const doc = anchorCharacterChronology(character(), '001-1105');
  const events = nextDueDates({ ships: [ship], characters: [doc], sinceLabels: { [ship.identity.id]: '001-1105' } }, '001-1105');
  assert.deepEqual(events.map((event) => [event.date, event.kind]), [
    ['031-1105', 'crew-salaries'],
    ['031-1105', 'mortgage'],
    ['001-1106', 'maintenance-due'],
    ['001-1109', 'aging']
  ]);
});

test('advanceClock fires events in date order across a ship and a character and lands on the target', () => {
  const ship = financeShip(freeTrader({ balanceCr: 10_000_000 }), { startedOn: '001-1105' });
  const doc = character();
  const result = advanceClock({ dateLabel: '001-1105', ships: [ship], characters: [doc] }, '010-1109', {
    dice: createSequenceDice(Array(6).fill(6)),
    unpaid: { [ship.identity.id]: ['char-kurt'] }
  });
  assert.equal(result.dateLabel, '010-1109');
  assert.equal(result.stoppedAt, null);
  const kinds = result.fired.map((event) => event.kind);
  assert.equal(kinds.filter((kind) => kind === 'upkeep').length, Math.floor((daysBetween('001-1105', '010-1109')) / 30));
  // Never overhauled, so the one due date is reported once and stays overdue.
  assert.equal(kinds.filter((kind) => kind === 'maintenance-due').length, 1);
  assert.equal(result.fired.find((event) => event.kind === 'maintenance-due').dueDate, '001-1106');
  assert.equal(kinds.filter((kind) => kind === 'aging').length, 1);
  assert.equal(result.fired.find((event) => event.kind === 'aging').date, '001-1109');
  // The ship paid every month.
  assert.equal(result.ships[0].state.finances.ledger.filter((entry) => entry.kind === 'mortgage').length, kinds.filter((kind) => kind === 'upkeep').length);
  // The character was anchored at the start and aged to the end.
  assert.equal(result.characters[0].chronology.asOfDate <= '010-1109', true);
  assert.equal(result.characters[0].age, 38);
  assert.equal(result.characters[0].chronology.nextAgingCheckAgeMonths, 504);
});

test('advanceClock stops at a caller-supplied entry, hands it back, and resumes cleanly from there', () => {
  const ship = freeTrader({ balanceCr: 1_000_000 });
  const first = advanceClock({
    dateLabel: '001-1105', ships: [ship], characters: [],
    pending: [{ date: '045-1105', kind: 'rendezvous', hex: '0201' }]
  }, '100-1105', { unpaid: { [ship.identity.id]: ['char-kurt'] } });
  assert.equal(first.dateLabel, '045-1105');
  assert.equal(first.stoppedAt.kind, 'rendezvous');
  assert.equal(first.stoppedAt.hex, '0201');
  assert.equal(first.pending.length, 0);
  assert.equal(first.fired.filter((event) => event.kind === 'upkeep').length, 1);   // 031-1105 only

  const second = advanceClock({ dateLabel: first.dateLabel, ships: first.ships, characters: [], pending: first.pending }, '100-1105',
    { unpaid: { [ship.identity.id]: ['char-kurt'] } });
  assert.equal(second.dateLabel, '100-1105');
  assert.equal(second.stoppedAt, null);
  assert.equal(second.fired.filter((event) => event.kind === 'upkeep').length, 2);  // 061, 091
  // No period was charged twice across the two runs.
  assert.equal(second.ships[0].state.finances.ledger.filter((entry) => entry.kind === 'crew-salaries').length, 3);
});

test('advanceClock is idempotent when re-run from the date it reached', () => {
  const ship = financeShip(freeTrader({ balanceCr: 5_000_000 }), { startedOn: '001-1105' });
  const first = advanceClock({ dateLabel: '001-1105', ships: [ship], characters: [] }, '091-1105', { unpaid: { [ship.identity.id]: ['char-kurt'] } });
  const again = advanceClock({ dateLabel: first.dateLabel, ships: first.ships, characters: [] }, '091-1105', { unpaid: { [ship.identity.id]: ['char-kurt'] } });
  assert.equal(again.fired.length, 0);
  assert.deepEqual(again.ships[0].state.finances, first.ships[0].state.finances);
});

test('an aging crisis stops the clock with the character rolled and the crisis reported', () => {
  const weak = character({ seed: 7 });
  weak.characteristics.STR = 1;
  weak.current.STR = 1;
  weak.upp = formatUPP(weak.characteristics);
  const result = advanceClock({ dateLabel: '001-1105', ships: [], characters: [weak] }, '365-1110', {
    dice: createSequenceDice([1, 1, 6, 6, 6, 6])
  });
  assert.equal(result.stoppedAt.kind, 'aging-crisis');
  assert.equal(result.dateLabel, '001-1109');
  assert.equal(result.characters[0].characteristics.STR, 0);
  assert.deepEqual(result.stoppedAt.crises.map((crisis) => crisis.characteristic), ['STR']);
});

test('a ship that cannot pay is charged once per due date, not looped on', () => {
  const ship = financeShip(freeTrader({ balanceCr: 100 }), { startedOn: '001-1105' });
  const result = advanceClock({ dateLabel: '001-1105', ships: [ship], characters: [] }, '095-1105', { unpaid: { [ship.identity.id]: ['char-kurt'] } });
  assert.equal(result.dateLabel, '095-1105');
  const upkeep = result.fired.filter((event) => event.kind === 'upkeep');
  assert.equal(upkeep.length, 3);
  assert.ok(upkeep.every((event) => event.mortgageSkipped));
  assert.equal(shipMortgageSchedule(result.ships[0], { dateLabel: '095-1105' }).periodsDue, 3);
});
