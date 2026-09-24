import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createShipDocument, migrateShipDocument, assertValidShipDocument, CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION
} from '../src/starships/ship-document.js';
import { STANDARD_SHIP_DESIGN_KEYS } from '../src/starships/standard-designs.js';
import { importCharacterDocument } from '../src/characters/character-document.js';
import {
  beginPortCall, bookPassenger, creditShipAccount, debitShipAccount, financeShip, shipMortgageSchedule, chargeShipUpkeep
} from '../src/starships/operations.js';
import {
  uniformInteger, attendingMedicExpertise, lowBerthRevivalDMParts, rollLowBerthRevival, rollLowPassageLottery,
  settleLowPassageLottery, reviveLowPassengers, shuttleFareCr, shipCarriesSmallCraft, orbitalTransfer, chargeShuttleFreight,
  repossessionDMParts, rollRepossession, checkRepossession, impoundShip, releaseImpound,
  rollPrivateMessage, acceptPrivateMessage, deliverPrivateMessages,
  shipReactionStance, resolveHail, resolveInspection, inspectionTollCr, payInspectionToll,
  grantBrokerTip, portCallBrokerTipDM, spendBrokerTip
} from '../src/starships/arrival.js';

function scripted(faces) {
  const queue = [...faces];
  const rollD6 = () => {
    if (!queue.length) throw new Error('scripted dice exhausted');
    return queue.shift();
  };
  return { rollD6, roll2D6: () => { const dice = [rollD6(), rollD6()]; return { dice, total: dice[0] + dice[1] }; }, left: () => queue.length };
}

const AUTHORITY = {
  assignmentType: 'owned', controllingAuthority: 'owner', legalTitleHolder: null, legalTitleSourceStatus: 'test',
  characterOwnsShip: true, assignedCharacterId: 'captain', assignedCharacterName: 'Captain', recallable: false,
  saleAllowed: true, useAsDesired: true, possessionAtServicePleasure: false,
  servicePrivileges: { freeFuelAtScoutBases: false, freeMaintenanceAtScoutBasesAtClassBStarports: false },
  operatorResponsibilities: { upkeep: true, crewCosts: true }
};

function ship(designKey = 'type-a-free-trader', crew = [{ role: 'pilot', characterId: 'captain', characterName: 'Captain' }]) {
  return createShipDocument({ designKey, id: `ship-${designKey}`, authority: AUTHORITY, crewAssignments: crew });
}

const TYPE_M = STANDARD_SHIP_DESIGN_KEYS.find((key) => key.startsWith('type-m'));

test('ship document v8 migrates a v7 port call, manifest and mortgage', () => {
  const current = beginPortCall(bookPassenger(ship('type-y-yacht'), { id: 'p1', passageClass: 'middle', originSystemId: 'a', destinationSystemId: 'b' }), { systemId: 'a' });
  const v7 = structuredClone(current);
  v7.schemaVersion = 7;
  delete v7.state.portCallHistory;
  delete v7.state.privateMessages;
  delete v7.state.impound;
  delete v7.state.portCall.berth;
  delete v7.state.portCall.brokerTipDM;
  delete v7.state.passengerManifest[0].endurance;
  const migrated = migrateShipDocument(v7);
  assert.equal(migrated.schemaVersion, CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION);
  assert.equal(CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION, 8);
  assert.equal(migrated.state.portCall.berth, 'orbit');
  assert.equal(migrated.state.portCall.brokerTipDM, 0);
  assert.equal(migrated.state.passengerManifest[0].endurance, null);
  assert.deepEqual(migrated.state.portCallHistory, []);
  assert.deepEqual(migrated.state.privateMessages, []);
  assert.equal(migrated.state.impound, null);
});

test('a port call berths by hull and is kept in the history', () => {
  const landed = beginPortCall(ship(), { systemId: 'a', arrivalDate: '010-1105' });
  assert.equal(landed.state.portCall.berth, 'surface');
  assert.deepEqual(landed.state.portCallHistory, [{ systemId: 'a', arrivalDate: '010-1105' }]);
  assert.equal(beginPortCall(ship('type-y-yacht'), { systemId: 'a' }).state.portCall.berth, 'orbit');
  assert.throws(() => beginPortCall(ship('type-y-yacht'), { systemId: 'a', berth: 'surface' }), /cannot land/);
  let many = ship();
  for (let day = 1; day <= 30; day += 1) many = beginPortCall(many, { systemId: `s${day}`, arrivalDate: `${String(day).padStart(3, '0')}-1105` });
  assert.equal(many.state.portCallHistory.length, 24);
});

test('only a low passenger records endurance', () => {
  const booked = bookPassenger(ship(), { id: 'l1', passageClass: 'low', originSystemId: 'a', destinationSystemId: 'b', endurance: 5 });
  assert.equal(booked.state.passengerManifest[0].endurance, 5);
  assert.throws(() => bookPassenger(ship(), { id: 'm1', passageClass: 'middle', originSystemId: 'a', destinationSystemId: 'b', endurance: 7 }), /only a low passenger/);
});

test('debitShipAccount writes a validating ledger line and refuses to overdraw', () => {
  const funded = creditShipAccount(ship(), 500, { description: 'seed' });
  const paid = debitShipAccount(funded, 100, { kind: 'toll', description: 'test toll', dateLabel: '010-1105' });
  assert.equal(paid.state.finances.balanceCr, 400);
  assert.equal(paid.state.finances.ledger.at(-1).amountCr, -100);
  assert.throws(() => debitShipAccount(funded, 501, { kind: 'toll', description: 'x' }), /insufficient/);
});

test('uniformInteger stays in range and covers it', () => {
  const seen = new Set();
  const faces = [];
  for (let index = 0; index < 600; index += 1) faces.push((index * 7 + 3) % 6 + 1);
  const dice = scripted(faces);
  for (let index = 0; index < 100; index += 1) {
    const value = uniformInteger(dice, 4);
    assert.ok(value >= 0 && value <= 4);
    seen.add(value);
  }
  assert.equal(seen.size, 5);
});

test('revival: 5+, +1 for a Medical-2 medic, -1 for endurance 6 or less', () => {
  assert.deepEqual(lowBerthRevivalDMParts({ endurance: 6, medicExpertise: 2 }).map((part) => part.dm), [1, -1]);
  assert.equal(rollLowBerthRevival(scripted([2, 2]), { endurance: 9 }).survived, false);
  assert.equal(rollLowBerthRevival(scripted([2, 3]), { endurance: 9 }).survived, true);
  assert.equal(rollLowBerthRevival(scripted([2, 3]), { endurance: 4 }).survived, false);
  assert.equal(rollLowBerthRevival(scripted([2, 2]), { endurance: 9, medicExpertise: 3 }).survived, true);
});

test('a doubled-up medic gives no expertise DM', () => {
  const crew = [
    { role: 'pilot', characterId: 'captain', characterName: 'Captain' },
    { role: 'medic', characterId: 'doc', characterName: 'Doc' }
  ];
  assert.equal(attendingMedicExpertise(ship('type-a-free-trader', crew), { doc: 3 }), 3);
  const doubled = [...crew, { role: 'steward', characterId: 'doc', characterName: 'Doc' }];
  assert.equal(attendingMedicExpertise(ship('type-a-free-trader', doubled), { doc: 3 }), 0);
});

test('lottery: exact guesses split the pot, a dead winner forfeits to the ship', () => {
  const revivals = [{ id: 'a', survived: true }, { id: 'b', survived: false }, { id: 'c', survived: true }];
  // three passengers guess 0-3: 2 survived. Guesses a=2, b=2, c=0.
  const lottery = rollLowPassageLottery(scripted([3, 3, 1]), revivals);
  assert.equal(lottery.potCr, 30);
  assert.deepEqual(lottery.winners, ['a', 'b']);
  assert.deepEqual(lottery.paidTo, ['a']);
  assert.equal(lottery.paidCr, 15);
  assert.equal(lottery.keptCr, 15);
  const none = rollLowPassageLottery(scripted([1, 1, 1]), revivals);
  assert.equal(none.paidCr, 0);
  assert.equal(none.keptCr, 30);
  const funded = creditShipAccount(ship(), 100, { description: 'seed' });
  assert.equal(settleLowPassageLottery(funded, lottery, { dateLabel: '010-1105' }).state.finances.balanceCr, 85);
  assert.equal(settleLowPassageLottery(funded, none).state.finances.ledger.length, 1);
});

test('reviveLowPassengers throws endurance only where none was kept', () => {
  let carrier = bookPassenger(ship(), { id: 'l1', passageClass: 'low', originSystemId: 'a', destinationSystemId: 'b', endurance: 8 });
  carrier = bookPassenger(carrier, { id: 'l2', passageClass: 'low', originSystemId: 'a', destinationSystemId: 'b' });
  // l1 revival 3+3; l2 endurance 2+2=4, revival 3+2-1=4 dies; lottery guesses 0-2: 1, 1.
  const result = reviveLowPassengers(carrier, scripted([3, 3, 2, 2, 3, 2, 2, 2]), { systemId: 'b' });
  assert.deepEqual(result.survived, ['l1']);
  assert.deepEqual(result.died, ['l2']);
  assert.equal(result.revivals[1].enduranceRolled, true);
  assert.equal(result.lottery.survivors, 1);
  assert.deepEqual(result.lottery.paidTo, ['l1']);
  assert.equal(result.lottery.paidCr, 10);
});

test('shuttles: Cr10 a ton from orbit, free for a landed ship or one with its own boat', () => {
  assert.equal(shuttleFareCr('high'), 100);
  assert.equal(shuttleFareCr('low'), 10);
  const landed = beginPortCall(ship(), { systemId: 'a' });
  assert.equal(orbitalTransfer(landed, { starport: 'X' }).via, 'landed');
  const yacht = beginPortCall(ship('type-y-yacht'), { systemId: 'a' });
  assert.equal(shipCarriesSmallCraft(yacht), true);
  assert.equal(orbitalTransfer(yacht, { starport: 'X' }).via, 'own-craft');
  const merchant = beginPortCall(ship(TYPE_M, [
    { role: 'pilot', characterId: 'captain', characterName: 'Captain' }
  ]), { systemId: 'a' });
  assert.equal(shipCarriesSmallCraft(merchant), false);
  assert.equal(orbitalTransfer(merchant, { starport: 'B' }).perTonCr, 10);
  assert.equal(orbitalTransfer(merchant, { starport: 'E' }).available, false);
  const funded = creditShipAccount(merchant, 1000, { description: 'seed' });
  const moved = chargeShuttleFreight(funded, { tons: 12.5, starport: 'B', dateLabel: '010-1105' });
  assert.equal(moved.costCr, 125);
  assert.equal(moved.ship.state.finances.ledger.at(-1).kind, 'shuttle');
  assert.throws(() => chargeShuttleFreight(funded, { tons: 1, starport: 'X' }), /no shuttle service/);
});

test('repossession: only a skipped ship, 12+ to avoid, distance and repeat-call DMs', () => {
  let skipped = financeShip(ship(), { startedOn: '001-1105', homeSystemId: 'home' });
  assert.equal(skipped.state.finances.mortgage.homeSystemId, 'home');
  skipped = beginPortCall(skipped, { systemId: 'b', arrivalDate: '020-1105' });
  assert.equal(shipMortgageSchedule(skipped, { dateLabel: '070-1105' }).skipped, true);
  const parts = repossessionDMParts(skipped, { systemId: 'b', dateLabel: '070-1105', hexesFromHome: 12 });
  assert.deepEqual(parts.map((part) => part.dm), [2, -2]);
  assert.equal(repossessionDMParts(skipped, { systemId: 'b', dateLabel: '090-1105' }).length, 0);
  assert.deepEqual(repossessionDMParts(skipped, { systemId: 'b', dateLabel: '070-1105', hexesFromHome: 60 }).map((part) => part.dm), [9, -2]);
  assert.equal(rollRepossession(scripted([6, 6])).attempt, false);
  const attempt = rollRepossession(scripted([3, 3, 6]));
  assert.equal(attempt.attempt, true);
  assert.equal(attempt.form, 'boarding');
  const current = financeShip(ship(), { startedOn: '001-1105' });
  assert.equal(checkRepossession(current, scripted([]), { systemId: 'b', dateLabel: '010-1105' }).applies, false);
  const check = checkRepossession(skipped, scripted([2, 2, 1]), { systemId: 'c', dateLabel: '070-1105' });
  assert.equal(check.form, 'papers');
});

test('an impounded ship is released only when paid, or a boarding party is repelled', () => {
  let skipped = financeShip(ship(), { startedOn: '001-1105' });
  const held = impoundShip(skipped, { systemId: 'b', dateLabel: '040-1105', form: 'injunction' });
  assert.ok(held.state.impound.arrearsCr > 0);
  assert.throws(() => releaseImpound(held, { dateLabel: '040-1105' }), /still unpaid/);
  assert.throws(() => releaseImpound(held, { dateLabel: '040-1105', repelled: true }), /only a boarding party/);
  const paid = chargeShipUpkeep(creditShipAccount(held, 10_000_000, { description: 'seed' }), { dateLabel: '040-1105' }).ship;
  assert.equal(releaseImpound(paid, { dateLabel: '040-1105' }).state.impound, null);
  const boarded = impoundShip(skipped, { systemId: 'b', dateLabel: '040-1105', form: 'boarding' });
  assert.equal(releaseImpound(boarded, { dateLabel: '040-1105', repelled: true }).state.impound, null);
});

test('private messages: 9+, a random crew member, 1D x Cr20, paid to him, delivered at the far end', () => {
  const hawkeye = importCharacterDocument(readFileSync(new URL('./fixtures/Hawkeye-v0.6.character.json', import.meta.url), 'utf8'));
  const crew = [
    { role: 'pilot', characterId: 'captain', characterName: 'Captain' },
    { role: 'medic', characterId: hawkeye.identity.id, characterName: hawkeye.identity.name }
  ];
  const carrier = ship('type-a-free-trader', crew);
  assert.equal(rollPrivateMessage(carrier, scripted([4, 4])).awaiting, false);
  const offer = rollPrivateMessage(carrier, scripted([5, 4, 2, 3, 5]));
  assert.equal(offer.awaiting, true);
  assert.equal(offer.carrierId, hawkeye.identity.id);
  assert.equal(offer.honorariumCr, 60);
  assert.equal(offer.recipient, 'a tavern keeper');
  const before = hawkeye.finances.credits;
  const taken = acceptPrivateMessage(carrier, hawkeye, { offer, id: 'msg-1', originSystemId: 'a', destinationSystemId: 'b', dateLabel: '010-1105' });
  assert.equal(taken.character.finances.credits, before + 60);
  assert.equal(taken.ship.state.privateMessages.length, 1);
  assert.equal(deliverPrivateMessages(taken.ship, 'c').delivered.length, 0);
  const handed = deliverPrivateMessages(taken.ship, 'b');
  assert.equal(handed.delivered[0].recipient, 'a tavern keeper');
  assert.equal(handed.ship.state.privateMessages.length, 0);
});

test('hail and inspection read the reaction table the same way', () => {
  assert.equal(shipReactionStance({ tableTotal: 5 }), 'hostile');
  assert.equal(shipReactionStance({ tableTotal: 8 }), 'neutral');
  assert.equal(shipReactionStance({ tableTotal: 9 }), 'friendly');
  assert.deepEqual(resolveHail('free-trader', { tableTotal: 10 }), { stance: 'friendly', outcome: 'tip', brokerTipDM: 1 });
  assert.equal(resolveHail('subsidized-merchant', { tableTotal: 3 }).outcome, 'fight');
  assert.throws(() => resolveHail('yacht', { tableTotal: 10 }), /answers a hail/);
  assert.equal(resolveInspection('patrol', { tableTotal: 7 }).tollCr, inspectionTollCr());
  assert.equal(resolveInspection('patrol', { tableTotal: 12 }).outcome, 'waved-through');
  const funded = creditShipAccount(ship(), 500, { description: 'seed' });
  assert.equal(payInspectionToll(funded, { tollCr: 100 }).state.finances.ledger.at(-1).kind, 'toll');
});

test('a broker tip lives on the port call and is spent by one sale', () => {
  const docked = beginPortCall(ship(), { systemId: 'a' });
  const tipped = grantBrokerTip(docked);
  assert.equal(portCallBrokerTipDM(tipped, 'a'), 1);
  assert.equal(portCallBrokerTipDM(tipped, 'b'), 0);
  assert.equal(portCallBrokerTipDM(spendBrokerTip(tipped), 'a'), 0);
  assert.equal(beginPortCall(tipped, { systemId: 'b' }).state.portCall.brokerTipDM, 0);
  assertValidShipDocument(tipped);
});

test('a v7-shaped port call or passenger is filled in on create and on import', () => {
  const handBuilt = createShipDocument({
    designKey: 'type-y-yacht', id: 'hand', authority: AUTHORITY,
    crewAssignments: [{ role: 'pilot', characterId: 'captain', characterName: 'Captain' }],
    state: {
      portCall: { systemId: 'a', arrivalDate: null, berthingDueCr: 100, berthingPaid: false },
      passengerManifest: [{ id: 'p', class: 'middle', originSystemId: 'a', destinationSystemId: 'b', fareCr: 8000 }]
    }
  });
  assert.equal(handBuilt.state.portCall.berth, 'orbit');
  assert.equal(handBuilt.state.portCall.brokerTipDM, 0);
  assert.equal(handBuilt.state.passengerManifest[0].endurance, null);
  const current = structuredClone(handBuilt);
  delete current.state.portCall.berth;
  delete current.state.portCall.brokerTipDM;
  delete current.state.portCallHistory;
  assert.equal(migrateShipDocument(current).state.portCall.berth, 'orbit');
  assert.deepEqual(migrateShipDocument(current).state.portCallHistory, []);
  assert.throws(() => assertValidShipDocument(current), /berth/);
});
