// ---------------------------------------------------------------------------
// 0.82.0: the Merchant's mustering-out Free Trader (1977 Book 1 pp.22–23).
//
// "Receipt of this benefit places the character in possession of the ship,
// but liable for the monthly payments (which amount to about 150,000
// credits) for the next forty years. Fuel, upkeep, maintenance, crew
// expenses and other fees also become the burden of the character.
//  If the ship benefit is received more than once, each additional receipt
// is considered to represent actual possession of the ship for a ten-year
// period. The ship is 10 years older, and the total payment term is reduced
// by ten years. (…it is possible to own a ship, free and clear, by
// successively rolling the ship benefit 5 times…) … The actual ship received
// is the Type A."
//
// The payments are Book 2 p.5's standard terms: 1/240th of the cash price a
// month for 480 months (Type A: MCr 37.08, so Cr 154,500 — Book 1's "about
// 150,000"). Each further receipt takes 120 payments off what is owed; the
// fifth leaves nothing owed, and the ship is held free and clear. The Scout
// Ship builder is ship-document.js createTypeSScoutReserveShipForCharacter.
// ---------------------------------------------------------------------------

import { assertValidCharacterDocument, linkCharacterToShip } from '../characters/character-document.js';
import { createShipDocument } from './ship-document.js';
import { TYPE_A_FREE_TRADER_KEY } from './standard-designs.js';
import { financeShip, MORTGAGE_TERM_MONTHS } from './operations.js';
import { assertGameDate } from '../time/dates.js';

export const FREE_TRADER_RECEIPT_YEARS = 10;
const PAYMENTS_PER_RECEIPT = FREE_TRADER_RECEIPT_YEARS * 12;

/** What the Free Trader benefit comes to for this many receipts. Pure. */
export function freeTraderBenefitTerms(receipts) {
  if (!Number.isInteger(receipts) || receipts < 1) throw new RangeError('a Free Trader needs at least one receipt');
  const extra = receipts - 1;
  const paymentsOwed = Math.max(0, MORTGAGE_TERM_MONTHS - extra * PAYMENTS_PER_RECEIPT);
  return Object.freeze({
    receipts,
    shipAgeYears: extra * FREE_TRADER_RECEIPT_YEARS,
    paymentsOwed,
    freeAndClear: paymentsOwed === 0
  });
}

export function createTypeAFreeTraderForCharacter(characterDocument, {
  startedOn,
  id = null,
  name = '',
  registry = '',
  notes = ''
} = {}) {
  assertValidCharacterDocument(characterDocument);
  assertGameDate(startedOn, 'startedOn');
  const entitlement = characterDocument.benefits.shipEntitlements.find((entry) => entry.name === 'Free Trader');
  if (!entitlement) throw new RangeError('this character has no Free Trader benefit');
  if (characterDocument.shipRefs.some((entry) => entry.relationship === 'owner' && entry.shipType === 'A')) {
    throw new RangeError('this character already holds the Free Trader');
  }
  const terms = freeTraderBenefitTerms(entitlement.rolls);
  const characterName = characterDocument.identity.name;
  const shipId = id ?? `ship-${characterDocument.identity.id}-type-a-free-trader`;
  const shipName = name || 'Free Trader';
  const age = terms.shipAgeYears ? ` The ship is ${terms.shipAgeYears} years old (${terms.receipts} receipts of the benefit).` : '';
  let ship = createShipDocument({
    designKey: TYPE_A_FREE_TRADER_KEY,
    id: shipId,
    name: shipName,
    registry,
    authority: {
      assignmentType: 'private-owner',
      controllingAuthority: characterName || 'owner',
      legalTitleHolder: terms.freeAndClear ? characterName : 'the bank (Book 2 p.5)',
      legalTitleSourceStatus: 'book-1-mustering-out-free-trader',
      characterOwnsShip: true,
      assignedCharacterId: characterDocument.identity.id,
      assignedCharacterName: characterName,
      recallable: false,
      saleAllowed: true,
      useAsDesired: true,
      possessionAtServicePleasure: false,
      servicePrivileges: { freeFuelAtScoutBases: false, freeMaintenanceAtScoutBasesAtClassBStarports: false },
      operatorResponsibilities: { upkeep: true, crewCosts: true }
    },
    crewAssignments: [{ role: 'pilot', characterId: characterDocument.identity.id, characterName }],
    notes: `${notes ? `${notes} ` : ''}Mustering-out Free Trader (Book 1 pp.22–23).${age}`.trim()
  });
  if (!terms.freeAndClear) ship = financeShip(ship, { startedOn, termMonths: terms.paymentsOwed });
  const character = linkCharacterToShip(characterDocument, { shipId, relationship: 'owner', shipType: 'A', shipName });
  return { character, ship, terms };
}
