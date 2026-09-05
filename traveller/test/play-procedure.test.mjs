import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlayProcedure, chargenTablesForPhase, PLAY_PROCEDURE_TAGS } from '../client/ui-model.js';

const base = () => ({
  currentSystem: { name: 'Cinder', starport: 'E', hasGasGiant: true },
  destination: { name: 'Orison', distance: 1, reachable: true },
  encounterActive: false,
  situationActive: null,
  berthing: { due: true, dueCr: 100, paid: true },
  fuel: { currentTons: 40, capacityTons: 40, requiredTons: 20, sufficient: true, canBuy: false, canSkim: true },
  freight: { offers: 3, fitting: 2, accepted: 0 },
  passengers: { demand: { high: 1, middle: 2, low: 0 }, booked: 0, capacity: 3, blockReason: null },
  speculation: { available: true, name: 'RADIOACTIVES', quantity: '3t', purchased: 0, holdFree: 2 },
  patron: { available: true, attemptedThisCall: false },
  jobs: { offers: 1, active: 2 },
  lifeSupportCr: 2000,
  jumpReady: true,
  jumpBlockReason: null
});

const cards = (model) => model.groups.flatMap((group) => group.cards);
const byId = (model, id) => cards(model).find((card) => card.id === id);

test('no mapped location yields a single required card pointing at the map', () => {
  const model = buildPlayProcedure({ currentSystem: null });
  assert.equal(model.groups.length, 1);
  assert.equal(model.groups[0].cards[0].id, 'map-location');
  assert.equal(model.groups[0].cards[0].tag, PLAY_PROCEDURE_TAGS.required);
});

test('Book 2 p.8 ordering: cargo is READY and passengers are BLOCKED until cargo announces the destination', () => {
  const model = buildPlayProcedure(base());
  assert.equal(byId(model, 'freight').tag, PLAY_PROCEDURE_TAGS.ready);
  assert.equal(byId(model, 'passengers').tag, PLAY_PROCEDURE_TAGS.blocked);
  assert.match(byId(model, 'passengers').copy, /Book 2 p\.8/);
  assert.equal(model.groups[0].label, 'NEEDS ATTENTION');
  assert.equal(model.headline, 'Accept cargo for Orison');
});

test('once cargo is accepted passengers open and the jump card is READY with the life-support charge', () => {
  const s = base(); s.freight.accepted = 1;
  const model = buildPlayProcedure(s);
  assert.equal(byId(model, 'passengers').tag, PLAY_PROCEDURE_TAGS.ready);
  assert.equal(byId(model, 'jump').tag, PLAY_PROCEDURE_TAGS.ready);
  assert.match(byId(model, 'jump').copy, /Cr2,000/);
  assert.equal(byId(model, 'freight-done').tag, PLAY_PROCEDURE_TAGS.done);
});

test('with no acceptable cargo the destination counts as announced and passengers open', () => {
  const s = base(); s.freight = { offers: 0, fitting: 0, accepted: 0 };
  assert.equal(byId(buildPlayProcedure(s), 'passengers').tag, PLAY_PROCEDURE_TAGS.ready);
});

test('insufficient fuel is REQUIRED when a source exists and BLOCKED when none does', () => {
  const s = base(); s.fuel.sufficient = false; s.fuel.currentTons = 10;
  assert.equal(byId(buildPlayProcedure(s), 'fuel').tag, PLAY_PROCEDURE_TAGS.required);
  s.fuel.canSkim = false;
  assert.equal(byId(buildPlayProcedure(s), 'fuel').tag, PLAY_PROCEDURE_TAGS.blocked);
});

test('active combat and situations lead the attention group and block departure', () => {
  const s = base(); s.encounterActive = true; s.situationActive = { title: 'Dead Approach Beacon' }; s.jumpReady = false; s.jumpBlockReason = 'Resolve the encounter first.';
  const model = buildPlayProcedure(s);
  assert.equal(model.groups[0].cards[0].id, 'combat');
  assert.equal(model.groups[0].cards[1].title, 'Dead Approach Beacon');
  assert.equal(byId(model, 'jump').tag, PLAY_PROCEDURE_TAGS.blocked);
  assert.equal(byId(model, 'jump').copy, 'Resolve the encounter first.');
});

test('weekly opportunities: speculation once per week, patron search once per port call', () => {
  const s = base(); s.speculation.purchased = 3; s.patron.attemptedThisCall = true;
  const model = buildPlayProcedure(s);
  assert.equal(byId(model, 'spec'), undefined);
  assert.equal(byId(model, 'spec-done').tag, PLAY_PROCEDURE_TAGS.done);
  assert.equal(byId(model, 'patron-done').tag, PLAY_PROCEDURE_TAGS.done);
  const done = model.groups.find((group) => group.label === 'DONE THIS PORT CALL');
  assert.equal(done.collapsed, true);
});

test('unpaid berthing is required before anything else at the port', () => {
  const s = base(); s.berthing.paid = false;
  const model = buildPlayProcedure(s);
  assert.equal(model.groups[0].cards[0].id, 'berthing');
  assert.equal(model.groups[0].cards[0].action, 'port');
});

test('chargen context tables follow the phase', () => {
  assert.equal(chargenTablesForPhase('skills-pending'), 'skills');
  assert.equal(chargenTablesForPhase('muster-out-rolls-pending'), 'muster');
  assert.equal(chargenTablesForPhase('aging-required'), 'aging');
  assert.equal(chargenTablesForPhase('survival-required'), 'service');
  assert.equal(chargenTablesForPhase('service-selection'), 'service');
});
