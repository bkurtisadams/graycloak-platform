// 0.98.0 (Kurt, Nov 2026): trading a ship in for another design, keeping her
// identity; the sale at 60% of new by default; a mortgage cleared first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createShipDocument, creditShipAccount, financeShip, tradeInQuote, tradeInShip, shipMortgageSchedule, TRADE_IN_RESALE_RATE } from '../index.js';

const authority = { assignmentType: 'private-owner', controllingAuthority: 'Bruce', legalTitleHolder: 'Bruce', legalTitleSourceStatus: 'referee-fiat', characterOwnsShip: true, assignedCharacterId: 'c1', assignedCharacterName: 'Bruce', recallable: false, saleAllowed: true, useAsDesired: true, possessionAtServicePleasure: false, servicePrivileges: { freeFuelAtScoutBases: false, freeMaintenanceAtScoutBasesAtClassBStarports: false }, operatorResponsibilities: { upkeep: true, crewCosts: true } };
const majestic = () => createShipDocument({ designKey: 'type-a-free-trader', id: 'ship-majestic', name: 'Majestic', authority, crewAssignments: [{ role: 'pilot', characterId: 'c1', characterName: 'Bruce' }], state: { currentFuelTons: 30 } });

test('0.98.0 a Type A traded for a Far Trader keeps her name, crew, account and ledger', () => {
  let ship = creditShipAccount(majestic(), 60_000_000, { kind: 'deposit', description: 'Opening funds', dateLabel: '001-1105' });
  const quote = tradeInQuote(ship, { designKey: 'type-a2-far-trader' });
  assert.equal(quote.possible, true);
  assert.equal(TRADE_IN_RESALE_RATE, 0.6);
  assert.equal(quote.saleCr, Math.round(37.08 * 1_000_000 * 0.6));
  assert.equal(quote.priceCr, 80_194_000);
  const traded = tradeInShip(ship, { designKey: 'type-a2-far-trader', dateLabel: '010-1105' }).ship;
  assert.equal(traded.identity.id, 'ship-majestic');
  assert.equal(traded.identity.name, 'Majestic');
  assert.equal(traded.design.key, 'type-a2-far-trader');
  assert.equal(traded.specifications.drives.jump.rating, 2);
  assert.equal(traded.crew.assignments[0].characterId, 'c1');
  assert.equal(traded.state.finances.balanceCr, 60_000_000 + quote.saleCr - quote.priceCr);
  assert.deepEqual(traded.state.finances.ledger.map((entry) => entry.kind), ['deposit', 'ship-sale', 'ship-purchase']);
  assert.equal(traded.state.currentFuelTons, 30);
});

test('0.98.0 a mortgage is cleared from the sale; the new ship may be financed afresh', () => {
  const ship = financeShip(majestic(), { startedOn: '001-1105' });
  const quote = tradeInQuote(ship, { designKey: 'type-a2-far-trader' });
  assert.equal(quote.mortgagePrincipalCr, ship.state.finances.mortgage.cashPriceCr, 'no payments made: the whole price is owed');
  // The sale cannot clear 100% of the old price on its own.
  assert.throws(() => tradeInShip(ship, { designKey: 'type-a2-far-trader', dateLabel: '010-1105', finance: true }), /bank is owed/);
  const funded = creditShipAccount(ship, 20_000_000, { kind: 'deposit', description: 'Funds', dateLabel: '002-1105' });
  const traded = tradeInShip(funded, { designKey: 'type-a2-far-trader', dateLabel: '010-1105', finance: true });
  assert.equal(traded.mortgagePaidCr, ship.state.finances.mortgage.cashPriceCr);
  assert.equal(traded.ship.state.finances.mortgage.cashPriceCr, 80_194_000);
  assert.equal(shipMortgageSchedule(traded.ship, { dateLabel: '010-1105' }).paymentsMade, 0, 'old payments do not count on the new mortgage');
});

test('0.98.0 refused: the same design, a ship not hers to sell', () => {
  assert.equal(tradeInQuote(majestic(), { designKey: 'type-a-free-trader' }).possible, false);
  const service = createShipDocument({ designKey: 'type-a-free-trader', id: 's2', name: 'Loaner', authority: { ...authority, saleAllowed: false, controllingAuthority: 'the Scout Service' }, crewAssignments: [{ role: 'pilot', characterId: 'c1', characterName: 'Bruce' }] });
  assert.match(tradeInQuote(service, { designKey: 'type-a2-far-trader' }).reasons.join(), /does not allow/);
});
