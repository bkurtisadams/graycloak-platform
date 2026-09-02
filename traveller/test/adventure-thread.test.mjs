import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createContactDocument,
  exportContactDocument,
  importContactDocument,
  touchContactDocument
} from '../src/contact-document.js';
import {
  createAdventureThreadDocument,
  exportAdventureThreadDocument,
  importAdventureThreadDocument,
  addAdventureThreadClue,
  updateAdventureThreadObjective,
  linkAdventureThreadDocument,
  closeAdventureThreadDocument
} from '../src/adventure-thread-document.js';
import { createSituationDocument, resolveSituationDocument } from '../src/situation-document.js';
import { applySituationThreadConsequences } from '../world/thread-consequences.js';

const date = (day) => ({ year: 4800, dayOfYear: day });
const campaign = { identity: { id: 'campaign-thread-test' } };
const character = { identity: { id: 'char-hawkeye' } };
const ship = { identity: { id: 'ship-marisol' } };

function situation({ title, systemId, systemName, day, choices, choiceId, success, actor = null }) {
  const active = createSituationDocument({
    eventKey: `thread-test|${title}|${day}`,
    kind: title === 'Dead Approach Beacon' || title === 'Scout Archive Recorder' ? 'arrival-event' : 'thread-follow-up',
    title,
    location: { systemId, systemName },
    createdDate: date(day),
    actor,
    summary: title,
    detail: title,
    choices
  });
  const choice = choices.find((entry) => entry.id === choiceId);
  return resolveSituationDocument(active, {
    date: date(day), choiceId, success,
    roll: choice?.action === 'skill-check' ? { roll: 6, total: success ? 8 : 7, target: choice.target } : null,
    notes: success === false ? choice?.failureText ?? 'Failed.' : choice?.successText ?? choice?.resolutionText ?? 'Resolved.',
    declined: choice?.action === 'decline'
  });
}

const investigateElectronics = [{
  id: 'investigate', label: 'INVESTIGATE / ELECTRONICS', action: 'skill-check', skillName: 'Electronics', target: 8,
  situationalDM: 0, successText: 'Recovered.', failureText: 'Signal lost.', resolutionText: ''
}];

test('Contact Document v1 round-trips and retains a recurring relationship', () => {
  const original = createContactDocument({
    contactKey: 'campaign|aster|Mara Venn|Scout Archivist', name: 'Mara Venn', role: 'Scout Archivist', type: 'Scout Service',
    homeSystem: { systemId: 'aster', systemName: 'Aster' }, firstMetDate: date(120), standing: 'friendly'
  });
  const seenAgain = touchContactDocument(original, { date: date(127), standing: 'friendly', relationshipNotes: 'Helped with Carranza records.' });
  const roundTrip = importContactDocument(exportContactDocument(seenAgain));
  assert.equal(roundTrip.documentType, 'graycloak-traveller-contact');
  assert.equal(roundTrip.identity.name, 'Mara Venn');
  assert.deepEqual(roundTrip.timing.lastSeenDate, date(127));
  assert.match(roundTrip.relationship.notes, /Carranza/);
});

test('Adventure Thread Document v1 preserves clues, links, objectives, and closed history', () => {
  let thread = createAdventureThreadDocument({
    threadKey: 'campaign|carranza-route', title: 'Carranza Route', createdDate: date(106),
    origin: { systemId: 'cinder', systemName: 'Cinder' }, objective: 'Trace the obsolete route.'
  });
  thread = addAdventureThreadClue(thread, { id: 'route-7k', label: 'ROUTE 7-K', text: 'Aster appears before Meridian.', date: date(106) });
  thread = updateAdventureThreadObjective(thread, { text: 'Reach Aster.', targetSystemId: 'aster', targetSystemName: 'Aster', date: date(106) });
  thread = linkAdventureThreadDocument(thread, { contactId: 'contact-mara', situationId: 'situation-header', date: date(107) });
  thread = closeAdventureThreadDocument(thread, { date: date(140), status: 'completed', notes: 'Trail continued in a new arc.' });
  const roundTrip = importAdventureThreadDocument(exportAdventureThreadDocument(thread));
  assert.equal(roundTrip.status, 'completed');
  assert.equal(roundTrip.clues[0].label, 'ROUTE 7-K');
  assert.equal(roundTrip.objective.targetSystemId, 'aster');
  assert.deepEqual(roundTrip.contactIds, ['contact-mara']);
  assert.deepEqual(roundTrip.timing.closedDate, date(140));
});

test('a failed Cinder beacon investigation still starts a durable Carranza thread instead of dead-ending the campaign', () => {
  const beacon = situation({ title: 'Dead Approach Beacon', systemId: 'cinder', systemName: 'Cinder', day: 106,
    choices: investigateElectronics, choiceId: 'investigate', success: false });
  const result = applySituationThreadConsequences({ campaign, situation: beacon, character, ship });
  assert.equal(result.threads.length, 1);
  assert.equal(result.threads[0].identity.title, 'Carranza Route');
  assert.equal(result.threads[0].objective.targetSystemId, 'aster');
  assert.match(result.threads[0].clues[0].text, /pre-standard Scout survey protocol/);
  assert.equal(result.followUpOffers.length, 0);
});

test('successful Cinder investigation creates the recovered survey-header follow-up', () => {
  const beacon = situation({ title: 'Dead Approach Beacon', systemId: 'cinder', systemName: 'Cinder', day: 106,
    choices: investigateElectronics, choiceId: 'investigate', success: true });
  const result = applySituationThreadConsequences({ campaign, situation: beacon, character, ship });
  assert.equal(result.followUpOffers.length, 1);
  assert.equal(result.followUpOffers[0].title, 'Recovered Survey Header');
  assert.equal(result.followUpOffers[0].choices[0].skillName, 'Navigation');
});

test('Aster makes Mara Venn a recurring named contact and advances the existing Carranza thread even on a failed recorder check', () => {
  const beacon = situation({ title: 'Dead Approach Beacon', systemId: 'cinder', systemName: 'Cinder', day: 106,
    choices: investigateElectronics, choiceId: 'investigate', success: false });
  let state = applySituationThreadConsequences({ campaign, situation: beacon, character, ship });
  const aster = situation({ title: 'Scout Archive Recorder', systemId: 'aster', systemName: 'Aster', day: 120,
    actor: { name: 'Mara Venn', type: 'Scout Archivist', reaction: 'friendly' },
    choices: investigateElectronics, choiceId: 'investigate', success: false });
  state = applySituationThreadConsequences({ campaign, situation: aster, threads: state.threads, contacts: state.contacts, contracts: state.contracts, character, ship });
  assert.equal(state.contacts.length, 1);
  assert.equal(state.contacts[0].identity.name, 'Mara Venn');
  assert.equal(state.threads[0].contactIds.length, 1);
  assert.equal(state.followUpOffers[0].title, 'The Carranza File');
});

test('Carranza file and Mara request can create a persistent Heliograph courier job without duplicating Mara', () => {
  const seedThread = createAdventureThreadDocument({
    threadKey: 'campaign-thread-test|carranza-route', title: 'Carranza Route', createdDate: date(106),
    origin: { systemId: 'cinder', systemName: 'Cinder' }, objective: 'Review Carranza file.'
  });
  const mara = createContactDocument({
    contactKey: 'campaign-thread-test|aster|Mara Venn|Scout Archivist', name: 'Mara Venn', role: 'Scout Archivist', type: 'Scout Service',
    homeSystem: { systemId: 'aster', systemName: 'Aster' }, firstMetDate: date(120), standing: 'friendly'
  });
  const fileChoices = [{
    id: 'read-carranza-file', label: 'COMPARE / NAVIGATION', action: 'skill-check', skillName: 'Navigation', target: 8,
    situationalDM: 0, successText: 'AURELIA?', failureText: 'Unlisted waypoint.', resolutionText: ''
  }];
  const file = situation({ title: 'The Carranza File', systemId: 'aster', systemName: 'Aster', day: 120,
    actor: { name: 'Mara Venn', type: 'Scout Archivist', reaction: 'friendly' }, choices: fileChoices, choiceId: 'read-carranza-file', success: false });
  let state = applySituationThreadConsequences({ campaign, situation: file, threads: [seedThread], contacts: [mara], character, ship });
  assert.equal(state.contacts.length, 1);
  assert.equal(state.followUpOffers[0].title, "Mara Venn's Request");
  assert.ok(state.threads[0].clues.some((entry) => entry.label === 'UNLISTED WAYPOINT'));

  const requestChoices = state.followUpOffers[0].choices;
  const request = situation({ title: "Mara Venn's Request", systemId: 'aster', systemName: 'Aster', day: 120,
    actor: { name: 'Mara Venn', type: 'Scout Archivist', reaction: 'friendly' }, choices: requestChoices, choiceId: 'accept-query', success: true });
  state = applySituationThreadConsequences({ campaign, situation: request, threads: state.threads, contacts: state.contacts, contracts: state.contracts, character, ship });
  assert.equal(state.contacts.length, 1);
  assert.equal(state.contracts.length, 1);
  assert.equal(state.contracts[0].destination.systemId, 'heliograph');
  assert.equal(state.contracts[0].economics.paymentCr, 4000);
  assert.ok(state.threads[0].contractIds.includes(state.contracts[0].identity.id));
  assert.equal(state.threads[0].objective.targetSystemId, 'heliograph');
});
