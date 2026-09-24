// play-aging.js — a character's age in play, and the aging throws it brings.
//
// v0.67.0. Chargen ages a character term by term and rolls Book 1's aging
// table at every fourth year from 34 (chargen.js, resolveAging). Once the
// character is in play the calendar does the ageing instead: the document
// records the game date its ages were true on (chronology.asOfDate), and the
// campaign clock moves them forward from there. When physical age reaches
// nextAgingCheckAgeMonths the same table is rolled, on the document.
//
// Nothing here rolls on its own. characterAgingCheckDate() tells the clock
// when the next check falls; resolveCharacterAging() rolls it when asked.

import { createDice, requireDice } from '../dice.js';
import { AGING_INTERVAL_MONTHS, agingRulesForAge } from './aging.js';
import { assertValidCharacterDocument } from './character-document.js';
import { formatUPP } from './upp.js';
import { assertGameDate, ageMonthsElapsed, formatGameDate, DAYS_PER_YEAR } from '../time/dates.js';

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Record that the document's ages are true as of `dateLabel`. Only an
 * unanchored character may be anchored; to move an anchored one, age it.
 */
export function anchorCharacterChronology(document, dateLabel) {
  assertValidCharacterDocument(document);
  assertGameDate(dateLabel, 'dateLabel');
  if (document.chronology.asOfDate !== null) {
    throw new RangeError(`character is already anchored at ${document.chronology.asOfDate}; use ageCharacterDocumentTo`);
  }
  const next = cloneJson(document);
  next.chronology.asOfDate = dateLabel;
  assertValidCharacterDocument(next);
  return next;
}

export function characterIsAnchored(document) {
  return document?.chronology?.asOfDate !== null && document?.chronology?.asOfDate !== undefined;
}

/** The ages the character will have on `dateLabel`, without changing anything. */
export function characterAgeAt(document, dateLabel) {
  assertValidCharacterDocument(document);
  if (!characterIsAnchored(document)) throw new RangeError('character is not anchored to a game date');
  const elapsed = ageMonthsElapsed(document.chronology.asOfDate, dateLabel);
  const chronologicalAgeMonths = document.chronology.chronologicalAgeMonths + elapsed;
  const physicalAgeMonths = document.chronology.physicalAgeMonths + elapsed;
  return Object.freeze({
    elapsedMonths: elapsed,
    chronologicalAgeMonths,
    physicalAgeMonths,
    age: Math.floor(chronologicalAgeMonths / 12)
  });
}

/** Move the document's ages to `dateLabel`. Time only runs forward. */
export function ageCharacterDocumentTo(document, dateLabel) {
  assertValidCharacterDocument(document);
  if (!characterIsAnchored(document)) throw new RangeError('character is not anchored to a game date');
  const now = assertGameDate(dateLabel, 'dateLabel');
  if (now < assertGameDate(document.chronology.asOfDate)) {
    throw new RangeError(`cannot age ${document.identity.name || document.identity.id} backwards from ${document.chronology.asOfDate} to ${dateLabel}`);
  }
  const at = characterAgeAt(document, dateLabel);
  const next = cloneJson(document);
  next.chronology.chronologicalAgeMonths = at.chronologicalAgeMonths;
  next.chronology.physicalAgeMonths = at.physicalAgeMonths;
  // Keep the anchor on a month boundary the ages have actually reached, so
  // the days left over are not lost to rounding on the next advance.
  next.chronology.asOfDate = formatGameDate(assertGameDate(document.chronology.asOfDate) + Math.floor(at.elapsedMonths * DAYS_PER_YEAR / 12));
  next.age = at.age;
  assertValidCharacterDocument(next);
  return next;
}

/** True when an aging throw is owed at the document's current ages. */
export function characterAgingDue(document) {
  assertValidCharacterDocument(document);
  return document.chronology.physicalAgeMonths >= document.chronology.nextAgingCheckAgeMonths;
}

/**
 * The game date on which the next aging throw falls, or null for an
 * unanchored character. A check already due answers with the anchor date.
 */
export function characterAgingCheckDate(document) {
  assertValidCharacterDocument(document);
  if (!characterIsAnchored(document)) return null;
  const monthsToGo = document.chronology.nextAgingCheckAgeMonths - document.chronology.physicalAgeMonths;
  if (monthsToGo <= 0) return document.chronology.asOfDate;
  return formatGameDate(assertGameDate(document.chronology.asOfDate) + Math.ceil(monthsToGo * DAYS_PER_YEAR / 12));
}

/**
 * Roll the aging table for the check now due. Characteristic losses come off
 * both the original score and the current one. A characteristic taken to
 * zero is an aging crisis (Book 1): it is reported, not resolved — the
 * caller decides on medical care, as chargen's resolveAgingCrisis does.
 */
export function resolveCharacterAging(document, { dice = createDice() } = {}) {
  assertValidCharacterDocument(document);
  requireDice(dice);
  if (!characterAgingDue(document)) throw new RangeError('no aging throw is due');

  const checkpointMonths = document.chronology.nextAgingCheckAgeMonths;
  const checkpointAge = Math.floor(checkpointMonths / 12);
  const rules = agingRulesForAge(checkpointAge);
  const next = cloneJson(document);
  const checks = [];
  const crises = [];

  for (const rule of rules) {
    const rolled = dice.roll2D6();
    const success = rolled.total >= rule.target;
    const before = next.characteristics[rule.characteristic];
    let after = before;
    if (!success) {
      after = Math.max(0, before - rule.loss);
      next.characteristics[rule.characteristic] = after;
      if (Object.hasOwn(next.current, rule.characteristic)) {
        next.current[rule.characteristic] = Math.min(next.current[rule.characteristic], after);
      }
      if (after === 0) crises.push(Object.freeze({ characteristic: rule.characteristic, checkpointAge, loss: rule.loss }));
    }
    checks.push(Object.freeze({
      characteristic: rule.characteristic,
      dice: rolled.dice,
      roll: rolled.total,
      target: rule.target,
      success,
      loss: success ? 0 : rule.loss,
      before,
      after
    }));
  }

  next.upp = formatUPP(next.characteristics);
  next.chronology.nextAgingCheckAgeMonths = checkpointMonths + AGING_INTERVAL_MONTHS;
  next.history.push({
    type: 'aging',
    age: next.age,
    physicalAge: checkpointAge,
    date: next.chronology.asOfDate,
    checks,
    crises
  });
  assertValidCharacterDocument(next);
  return Object.freeze({ document: next, checkpointAge, checks, crises });
}
