// clock.js — the campaign clock.
//
// v0.67.0. Everything that bills or ages keys off the calendar: salaries
// every 30 days, the mortgage every 30 days from the day it was signed,
// maintenance a year after the last overhaul, an aging throw every fourth
// year from 34. Until now each was charged whenever some screen happened to
// ask. The clock makes them events: nextDueDates() derives every scheduled
// event from the documents themselves (nothing is stored twice), and
// advanceClock() walks forward to a target date firing them in order and
// stopping at the first one that needs a person — a caller-supplied entry
// (a rendezvous, an encounter check, the end of a rest) or an aging crisis.
//
// Pure: documents in, documents out, and every roll through the dice passed
// in. Storage, situations and parties are the runner's business.

import { createDice } from '../dice.js';
import { assertValidShipDocument } from '../starships/ship-document.js';
import { shipUpkeepDue, chargeShipUpkeep } from '../starships/operations.js';
import { assertValidCharacterDocument } from '../characters/character-document.js';
import {
  anchorCharacterChronology,
  ageCharacterDocumentTo,
  characterAgingCheckDate,
  characterAgingDue,
  characterIsAnchored,
  resolveCharacterAging
} from '../characters/play-aging.js';
import { assertGameDate, formatGameDate, compareGameDates, addDays, DAYS_PER_MONTH } from './dates.js';

export const CLOCK_EVENT_KINDS = Object.freeze([
  'crew-salaries', 'mortgage', 'maintenance-due', 'aging', 'aging-crisis', 'pending'
]);

// Same-day tie-break: money before people, and a caller's own entry last so
// everything scheduled for that day has happened when the clock hands over.
const KIND_ORDER = { 'crew-salaries': 0, mortgage: 1, 'maintenance-due': 2, aging: 3, 'aging-crisis': 4, pending: 5 };

function byDateThenKind(a, b) {
  return compareGameDates(a.date, b.date) || ((KIND_ORDER[a.kind] ?? 5) - (KIND_ORDER[b.kind] ?? 5));
}

function shipKey(ship) {
  return ship.identity.id;
}

function characterKey(character) {
  return character.identity.id;
}

/**
 * Every scheduled event on or after `dateLabel`, earliest first. Events
 * already due (dates at or before `dateLabel`) are reported at `dateLabel`.
 *
 *   ships        ship documents
 *   characters   character documents; unanchored ones have no aging date
 *   pending      caller entries { date, kind?, ...anything }; all blocking
 *   sinceLabels  shipId -> date liability began, for a ship never charged
 *   skillLevels  shipId -> { characterId -> skill level } for salaries
 *   unpaid       shipId -> [characterId] drawing no salary
 */
export function nextDueDates({ ships = [], characters = [], pending = [], sinceLabels = {}, skillLevels = {}, unpaid = {} } = {}, dateLabel) {
  assertGameDate(dateLabel, 'dateLabel');
  const events = [];
  const clamp = (label) => (compareGameDates(label, dateLabel) < 0 ? dateLabel : label);

  for (const ship of ships) {
    assertValidShipDocument(ship);
    const id = shipKey(ship);
    const due = shipUpkeepDue(ship, {
      dateLabel,
      sinceLabel: sinceLabels[id] ?? null,
      skillLevels: skillLevels[id] ?? {},
      unpaid: unpaid[id] ?? []
    });
    if (due.nextSalaryDate) events.push({ date: clamp(due.nextSalaryDate), kind: 'crew-salaries', shipId: id, amountCr: due.salaryPerPeriodCr });
    if (due.nextMortgageDate) events.push({ date: clamp(due.nextMortgageDate), kind: 'mortgage', shipId: id, amountCr: due.mortgagePerPeriodCr });
    if (due.maintenance.dueDate) events.push({ date: clamp(due.maintenance.dueDate), kind: 'maintenance-due', shipId: id, dueDate: due.maintenance.dueDate, costCr: due.maintenance.costCr, overdue: due.maintenance.overdue });
  }

  for (const character of characters) {
    assertValidCharacterDocument(character);
    if (!characterIsAnchored(character)) continue;
    const date = characterAgingCheckDate(character);
    if (date) events.push({ date: clamp(date), kind: 'aging', characterId: characterKey(character) });
  }

  pending.forEach((entry, pendingIndex) => {
    assertGameDate(entry?.date, 'pending entry date');
    events.push({ ...entry, date: clamp(entry.date), kind: entry.kind ?? 'pending', blocking: true, pendingIndex });
  });

  return Object.freeze(events.sort(byDateThenKind));
}

/**
 * Advance from `state.dateLabel` to `toLabel`, firing scheduled events in
 * date order. Stops early at a caller entry or an aging crisis and reports
 * it as `stoppedAt`, with the clock set to that entry's date. Every
 * document comes back aged or charged to the date reached.
 *
 * Unanchored characters are anchored at the starting date. A ship never
 * charged before starts its liability at the starting date unless
 * `sinceLabels` says otherwise.
 */
export function advanceClock(state, toLabel, { dice = createDice(), skillLevels = {}, unpaid = {}, sinceLabels = {} } = {}) {
  const startOrdinal = assertGameDate(state?.dateLabel, 'state.dateLabel');
  const targetOrdinal = assertGameDate(toLabel, 'toLabel');
  if (targetOrdinal < startOrdinal) throw new RangeError(`cannot advance the clock backwards from ${state.dateLabel} to ${toLabel}`);

  let dateLabel = state.dateLabel;
  const ships = (state.ships ?? []).map((ship) => JSON.parse(JSON.stringify(ship)));
  const characters = (state.characters ?? []).map((character) => (
    characterIsAnchored(character) ? JSON.parse(JSON.stringify(character)) : anchorCharacterChronology(character, dateLabel)
  ));
  const pending = (state.pending ?? []).map((entry) => ({ ...entry }));
  const since = { ...sinceLabels };
  for (const ship of ships) since[shipKey(ship)] ??= state.dateLabel;

  const fired = [];
  const chargedOn = new Map();          // shipId -> date last charged (once per day)
  const maintenanceNoted = new Map();   // shipId -> due date already reported
  let stoppedAt = null;

  const shipById = (id) => ships.findIndex((ship) => shipKey(ship) === id);
  const characterById = (id) => characters.findIndex((character) => characterKey(character) === id);

  for (let guard = 0; guard < 10000; guard += 1) {
    const events = nextDueDates({ ships, characters, pending, sinceLabels: since, skillLevels, unpaid }, dateLabel)
      .filter((event) => compareGameDates(event.date, toLabel) <= 0)
      .map((event) => {
        // A ship in arrears is tried again a period after its last attempt,
        // not at every stop of the clock; the arrears stay reported meanwhile.
        const last = chargedOn.get(event.shipId);
        if ((event.kind === 'crew-salaries' || event.kind === 'mortgage') && last && compareGameDates(event.date, last) <= 0) {
          return { ...event, date: addDays(last, DAYS_PER_MONTH) };
        }
        return event;
      })
      .filter((event) => compareGameDates(event.date, toLabel) <= 0)
      .filter((event) => !(event.kind === 'maintenance-due' && maintenanceNoted.get(event.shipId) === event.dueDate))
      .sort(byDateThenKind);
    if (events.length === 0) break;
    const event = events[0];
    dateLabel = event.date;

    if (event.blocking) {
      // Hand the entry back to the caller and take it off the list: it is
      // theirs to act on, and re-running from here must not stop on it twice.
      const { pendingIndex, ...handed } = event;
      pending.splice(pendingIndex, 1);
      stoppedAt = Object.freeze(handed);
      break;
    }

    if (event.kind === 'crew-salaries' || event.kind === 'mortgage') {
      const index = shipById(event.shipId);
      const result = chargeShipUpkeep(ships[index], {
        dateLabel,
        sinceLabel: since[event.shipId],
        skillLevels: skillLevels[event.shipId] ?? {},
        unpaid: unpaid[event.shipId] ?? []
      });
      ships[index] = result.ship;
      chargedOn.set(event.shipId, dateLabel);
      fired.push(Object.freeze({
        date: dateLabel,
        kind: 'upkeep',
        shipId: event.shipId,
        paidCr: result.paidCr,
        salaryPeriodsPaid: result.salaryPeriodsPaid,
        mortgagePeriodsPaid: result.mortgagePeriodsPaid,
        outstandingCr: result.outstandingCr,
        mortgageSkipped: result.mortgageSkipped
      }));
      continue;
    }

    if (event.kind === 'maintenance-due') {
      maintenanceNoted.set(event.shipId, event.dueDate);
      fired.push(Object.freeze({ date: dateLabel, kind: 'maintenance-due', shipId: event.shipId, dueDate: event.dueDate, costCr: event.costCr }));
      continue;
    }

    if (event.kind === 'aging') {
      const index = characterById(event.characterId);
      let character = ageCharacterDocumentTo(characters[index], dateLabel);
      if (!characterAgingDue(character)) {
        // Rounding put the check a day past the derived date; take the day.
        character = ageCharacterDocumentTo(character, formatGameDate(assertGameDate(dateLabel) + 1));
        dateLabel = character.chronology.asOfDate;
      }
      const result = resolveCharacterAging(character, { dice });
      characters[index] = result.document;
      fired.push(Object.freeze({
        date: dateLabel,
        kind: 'aging',
        characterId: event.characterId,
        checkpointAge: result.checkpointAge,
        checks: result.checks,
        crises: result.crises
      }));
      if (result.crises.length) {
        stoppedAt = Object.freeze({ date: dateLabel, kind: 'aging-crisis', characterId: event.characterId, crises: result.crises, blocking: true });
        break;
      }
      continue;
    }

    throw new Error(`clock cannot fire event kind ${event.kind}`);
  }

  if (!stoppedAt) dateLabel = toLabel;
  const aged = characters.map((character) => ageCharacterDocumentTo(character, dateLabel));

  return Object.freeze({
    dateLabel,
    ships,
    characters: aged,
    pending,
    fired: Object.freeze(fired),
    stoppedAt
  });
}
