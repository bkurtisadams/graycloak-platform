// 0.82.0: the Merchant's mustering-out Free Trader (1977 Book 1 pp.22-23;
// Book 2 p.5 financing).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  importCharacterDocument, createTypeAFreeTraderForCharacter, freeTraderBenefitTerms,
  shipMortgageSchedule, assertValidShipDocument, assertValidCharacterDocument
} from '../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
async function merchant(receipts = 1) {
  const character = JSON.parse(JSON.stringify(importCharacterDocument(await readFile(path.join(here, 'fixtures/Hawkeye-v0.6.character.json'), 'utf8'))));
  character.career.service = 'merchants';
  character.shipRefs = [];
  character.benefits.raw = [...character.benefits.raw.filter((entry) => entry.name !== 'Scout Ship' && entry.name !== 'Free Trader'),
    ...Array.from({ length: receipts }, () => ({ type: 'material', name: 'Free Trader' }))];
  character.benefits.shipEntitlements = [{ name: 'Free Trader', rolls: receipts, effectiveCount: null, noEffectCount: 0, disposition: 'unresolved' }];
  assertValidCharacterDocument(character);
  return character;
}

test('0.82.0 Free Trader terms: 480 payments, 120 fewer and ten years older per further receipt, free and clear at five', () => {
  assert.deepEqual({ ...freeTraderBenefitTerms(1) }, { receipts: 1, shipAgeYears: 0, paymentsOwed: 480, freeAndClear: false });
  assert.deepEqual({ ...freeTraderBenefitTerms(2) }, { receipts: 2, shipAgeYears: 10, paymentsOwed: 360, freeAndClear: false });
  assert.deepEqual({ ...freeTraderBenefitTerms(5) }, { receipts: 5, shipAgeYears: 40, paymentsOwed: 0, freeAndClear: true });
  assert.equal(freeTraderBenefitTerms(6).paymentsOwed, 0);
  assert.throws(() => freeTraderBenefitTerms(0), RangeError);
});

test('0.82.0 one receipt: a Type A owned by the character, Cr 154,500 a month for 480 months, the owner the pilot', async () => {
  const { character, ship, terms } = createTypeAFreeTraderForCharacter(await merchant(1), { startedOn: '001-4800', name: 'Marisol' });
  assertValidShipDocument(ship);
  assert.equal(ship.design.key, 'type-a-free-trader');
  assert.equal(ship.authority.characterOwnsShip, true);
  assert.equal(ship.authority.recallable, false);
  assert.equal(ship.authority.assignedCharacterId, character.identity.id);
  assert.deepEqual(ship.crew.assignments.map((entry) => entry.role), ['pilot']);
  assert.equal(ship.state.finances.mortgage.monthlyPaymentCr, 154500, 'Book 1: about 150,000');
  assert.equal(ship.state.finances.mortgage.termMonths, 480);
  assert.equal(terms.freeAndClear, false);
  const schedule = shipMortgageSchedule(ship, { dateLabel: '001-4800' });
  assert.equal(schedule.financed, true);
  assert.ok(character.shipRefs.some((entry) => entry.shipId === ship.identity.id && entry.relationship === 'owner' && entry.shipType === 'A'));
  assert.equal(character.benefits.shipEntitlements.find((entry) => entry.name === 'Free Trader').disposition, 'owned');
  assert.throws(() => createTypeAFreeTraderForCharacter(character, { startedOn: '001-4800' }), /already holds/);
});

test('0.82.0 repeated receipts: fewer payments and an older ship; five, free and clear', async () => {
  const two = createTypeAFreeTraderForCharacter(await merchant(2), { startedOn: '001-4800' });
  assert.equal(two.ship.state.finances.mortgage.termMonths, 360);
  assert.match(two.ship.notes, /10 years old/);
  const five = createTypeAFreeTraderForCharacter(await merchant(5), { startedOn: '001-4800' });
  assert.equal(five.ship.state.finances.mortgage, null);
  assert.equal(five.ship.authority.legalTitleHolder, five.character.identity.name);
  assert.match(five.ship.notes, /40 years old/);
});

test('0.82.0 no Free Trader benefit, no ship', async () => {
  const character = await merchant(1);
  character.benefits.raw = character.benefits.raw.filter((entry) => entry.name !== 'Free Trader');
  character.benefits.shipEntitlements = [];
  assert.throws(() => createTypeAFreeTraderForCharacter(character, { startedOn: '001-4800' }), /no Free Trader benefit/);
});
