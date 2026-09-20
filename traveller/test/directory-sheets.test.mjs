// directory-sheets.test.mjs — v0.249.0. The Foundry-shaped directory: two
// kinds of actor, a row that opens a sheet, and the verbs that manage one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { createPlaySession, REFEREE_TABS } from '../src/play-session.js';
import { createNpcActorDocument, importNpcActorDocument, NPC_ACTOR_KINDS, CURRENT_NPC_ACTOR_SCHEMA_VERSION } from '../src/npc-actor-document.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';
import { renderDrawer, renderRowMenu } from '../client/play-views.js';
import { renderSheets } from '../client/sheets.js';

let JSDOM = null;
try { ({ JSDOM } = await import('jsdom')); } catch { JSDOM = null; }

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'Sea-of-Suns-v0.11.2-buggy.campaign.json');

async function freshSession() {
  const bundle = JSON.parse(await readFile(fixture, 'utf8'));
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(bundle);
  return { session: createPlaySession({ registry, campaignId: campaign.identity.id, subsector: FAR_MERIDIAN_SUBSECTOR }), registry, campaignId: campaign.identity.id };
}

const actorsTab = (session, folder = '') => session.view({ referee: { tab: 'Actors', folder } }).referee;

// The directory shows one folder at a time (Foundry's own behaviour), so a
// test that wants every row walks the tree rather than reading one folder.
function allActorRows(session) {
  const tree = actorsTab(session).tree;
  return tree.flatMap((node) => actorsTab(session, node.path).shown);
}

// ---------------------------------------------------------------- documents

test('v0.249.0 schema 3: an actor is a person or a pattern, and a schema 2 actor migrates to a person', () => {
  assert.deepEqual([...NPC_ACTOR_KINDS], ['actor', 'statblock']);
  const person = createNpcActorDocument({ name: 'Sanjay Rao' });
  assert.equal(person.profile.kind, 'actor');
  assert.equal(person.profile.numberTokens, true, 'Kurt, Sep 2026: numbering defaults to on');
  const pattern = createNpcActorDocument({ name: 'Bandit', kind: 'statblock', numberTokens: false });
  assert.equal(pattern.profile.kind, 'statblock');
  assert.equal(pattern.profile.numberTokens, false);

  // Nothing in schema 2 could tell the two apart, so everything already
  // filed becomes a person and the referee reclassifies the mooks.
  const old = { ...createNpcActorDocument({ name: 'Dock thug' }), schemaVersion: 2 };
  delete old.profile.kind;
  delete old.profile.numberTokens;
  const migrated = importNpcActorDocument(old);
  assert.equal(migrated.schemaVersion, CURRENT_NPC_ACTOR_SCHEMA_VERSION);
  assert.equal(migrated.profile.kind, 'actor');
  assert.equal(migrated.profile.numberTokens, true);
});

test('v0.249.0 create, copy, rename, reclassify, file and delete, through the real commands', async () => {
  const { session } = await freshSession();

  const created = session.run('actor:create', { fight: { value: { kind: 'statblock', name: 'Bandit', folder: 'Mooks' } } });
  assert.equal(created.ok, true, created.message);
  assert.ok(created.createdId, 'the caller gets the id so the sheet can open on it');
  const id = created.createdId;
  // Created actors reach the directory, which means the campaign's own refs
  // and roster, not just a document in the registry.
  assert.ok(allActorRows(session).some((entry) => entry.id === id));

  const copied = session.run('actor:copy', { fight: { id } });
  assert.equal(copied.ok, true, copied.message);
  assert.notEqual(copied.createdId, id);
  assert.equal(allActorRows(session).filter((entry) => /^Bandit/.test(entry.name)).length, 2, 'a copy lands beside its original, same kind and folder');

  assert.equal(session.run('edit:actor:name', { fight: { id, value: 'Startown Rowdy' } }).ok, true);
  assert.equal(session.run('actor:kind', { fight: { id, value: 'actor' } }).message, 'Startown Rowdy is now an actor.');
  assert.equal(session.run('actor:numbering', { fight: { id, value: false } }).ok, true);
  assert.equal(session.run('actor:folder', { fight: { id, value: 'Startown/Dock gangs' } }).ok, true);

  const row = allActorRows(session).find((entry) => entry.id === id);
  assert.equal(row.name, 'Startown Rowdy');
  assert.equal(row.actorKind, 'actor');
  assert.equal(row.folder, 'Startown/Dock gangs');

  const deleted = session.run('actor:delete', { fight: { id } });
  assert.equal(deleted.ok, true, deleted.message);
  assert.equal(allActorRows(session).some((entry) => entry.id === id), false, 'gone, not archived');
  assert.equal(session.run('actor:copy', { fight: { id } }).ok, false, 'and gone from the campaign too');
});

test('v0.249.0 a statblock is editable in every field: characteristics, skills, loadout', async () => {
  const { session } = await freshSession();
  const id = session.run('actor:create', { fight: { value: { kind: 'statblock', name: 'Bandit' } } }).createdId;
  const sheetOf = () => session.view({ sheets: [{ kind: 'actor', id }] }).sheets[0];

  assert.equal(sheetOf().statblock, true);
  assert.equal(sheetOf().compactOnly, true, 'a statblock has no full form: the compact sheet is the whole of it');

  session.run('edit:actor:characteristics', { fight: { id, value: { STR: 9, DEX: 8, END: 7, INT: 7, EDU: 6, SOC: 5 } } });
  assert.equal(sheetOf().upp, '987765');
  // A pattern has taken no wounds, so its current scores follow the ceiling.
  assert.equal(sheetOf().current.STR, 9);

  session.run('edit:actor:skills', { fight: { id, value: 'Rifle-1, Brawling-1' } });
  assert.deepEqual(sheetOf().skills, ['Rifle-1', 'Brawling-1']);
  assert.equal(session.run('edit:actor:skills', { fight: { id, value: 'Rifle' } }).ok, false, 'a level is required');

  session.run('edit:actor:loadout', { fight: { id, value: { weaponKey: 'automatic-rifle', armor: 'jack' } } });
  assert.equal(sheetOf().weaponName, 'Automatic Rifle');
  assert.equal(sheetOf().armor, 'jack');
  // Book 1's carried weapons only: an animal's claws are Book 3's business.
  assert.equal(sheetOf().weaponChoices.some((choice) => choice.key === 'claws'), false);
  assert.ok(sheetOf().weaponChoices.some((choice) => choice.key === 'rifle'));
});

test('v0.249.0 deleting an actor that is standing on a scene is refused until forced', async () => {
  const { session } = await freshSession();
  const id = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Sanjay Rao' } } }).createdId;
  session.run('scene:create', { fight: { value: { name: 'Startown', boardKind: 'vector' } } });
  const sceneId = session.view({ referee: { tab: 'Scenes' } }).referee.shown.find((entry) => entry.name === 'Startown').id;
  const staged = session.run('scene:stage-ship', { fight: { id: sceneId, value: { actorId: id, side: 'opposition', x: 1, y: 1, label: 'Sanjay' } } });
  assert.equal(staged.ok, true, staged.message);

  const refused = session.run('actor:delete', { fight: { id } });
  assert.equal(refused.ok, false);
  assert.match(refused.message, /Startown/, 'it says where, so the referee can go and look');
  assert.equal(session.run('actor:delete', { fight: { id, value: { force: true } } }).ok, true);
});

// ------------------------------------------------------------------- sheets

test('v0.249.0 a ship sheet carries Book 2 p.24\u2019s card, and a scene sheet what is staged', async () => {
  const { session, registry, campaignId } = await freshSession();
  const shipId = registry.resolveCampaign(campaignId).ships[0].identity.id;
  const sheet = session.view({ sheets: [{ kind: 'ship', id: shipId }] }).sheets[0];
  assert.equal(sheet.kind, 'ship');
  assert.match(sheet.lines[0], /Type S/);
  assert.ok(sheet.lines.some((line) => /M-Drive/.test(line)));
  assert.ok(sheet.lines.some((line) => /Model\/1/.test(line)), 'the computer sits in the card\u2019s right column');
  assert.equal(sheet.editable, true, 'Kurt, Sep 2026: editable, because mistakes are made');

  session.run('scene:create', { fight: { value: { name: 'Aster Approach', boardKind: 'vector' } } });
  const sceneId = session.view({ referee: { tab: 'Scenes' } }).referee.shown.find((entry) => entry.name === 'Aster Approach').id;
  session.run('scene:stage-ship', { fight: { id: sceneId, value: { actorId: shipId, side: 'party', x: -20, y: 0, label: 'Marisol' } } });
  const scene = session.view({ sheets: [{ kind: 'scene', id: sceneId }] }).sheets[0];
  assert.equal(scene.vector, true);
  assert.deepEqual(scene.tokens.map((token) => token.label), ['Marisol']);

  // A sheet whose document has gone simply drops out rather than throwing.
  assert.deepEqual(session.view({ sheets: [{ kind: 'ship', id: 'nope' }] }).sheets, []);
});

test('v0.249.0 the directory lists player characters as actors, with a badge and a sheet reference', async () => {
  const { session } = await freshSession();
  const rows = allActorRows(session);
  const character = rows.find((entry) => entry.folder === 'Player characters');
  assert.ok(character, 'a player character is an actor like anyone else');
  assert.deepEqual(character.sheet, { kind: 'actor', id: character.id });
  assert.equal(character.badge.kind, 'actor');

  const id = session.run('actor:create', { fight: { value: { kind: 'statblock', name: 'Bandit' } } }).createdId;
  const statblock = allActorRows(session).find((entry) => entry.id === id);
  assert.equal(statblock.badge.kind, 'statblock', 'the two kinds are drawn differently, not just labelled');
  assert.match(statblock.note, /Automatic Pistol/, 'the weapon reads as its name, not its key');
});

test('v0.249.0 a directory row opens its sheet and right-clicks to a menu; the row carries no buttons', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;

  const { session } = await freshSession();
  const id = session.run('actor:create', { fight: { value: { kind: 'statblock', name: 'Bandit' } } }).createdId;
  const folder = session.view({ referee: { tab: 'Actors' } }).referee.tree.find((node) => node.path === 'Unfiled')?.path ?? '';
  const state = { ...session.view({ referee: { tab: 'Actors', folder } }), live: true };
  const opened = [];
  const menus = [];
  const nodes = renderDrawer('referee', state, state.referee, {
    onOpenSheet: (kind, sheetId) => opened.push([kind, sheetId]),
    onRowMenu: (entry, at) => menus.push({ entry, at })
  });
  document.querySelector('main').replaceChildren(...nodes);

  const row = [...document.querySelectorAll('.entry.is-openable')].find((node) => node.textContent.includes('Bandit'));
  assert.ok(row, 'the row is openable');
  assert.equal(row.querySelectorAll('button').length, 0, 'filing and deleting live on the menu, not on the row');
  assert.ok(row.querySelector('svg.sheet-badge'), 'and it carries its badge');
  row.click();
  assert.deepEqual(opened, [['actor', id]]);

  row.dispatchEvent(new dom.window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  assert.equal(menus.length, 1);
  document.querySelector('main').replaceChildren(renderRowMenu({ ...menus[0], at: { x: 10, y: 10 } }, {}));
  const items = [...document.querySelectorAll('.row-menu-item')].map((node) => node.textContent);
  assert.deepEqual(items, ['Open sheet', 'Place on scene', 'Rename\u2026', 'Copy', 'Make an actor', 'Move to folder\u2026', 'Delete']);

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Node;
  delete globalThis.Option;
});

test('v0.249.0 sheets draw as panels of their own, and a statblock\u2019s fields reach the real commands', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;
  globalThis.window = dom.window;

  const { session, registry, campaignId } = await freshSession();
  const shipId = registry.resolveCampaign(campaignId).ships[0].identity.id;
  const id = session.run('actor:create', { fight: { value: { kind: 'statblock', name: 'Bandit' } } }).createdId;
  const stateOf = () => session.view({ sheets: [{ kind: 'ship', id: shipId }, { kind: 'actor', id }] });

  document.querySelector('main').replaceChildren(renderSheets(stateOf().sheets, {
    onEditActor: (actorId, field, value) => session.run(`edit:actor:${field}`, { fight: { id: actorId, value } }),
    onEditSkills: (actorId, text) => session.run('edit:actor:skills', { fight: { id: actorId, value: text } }),
    onNumberTokens: (actorId, on) => session.run('actor:numbering', { fight: { id: actorId, value: on } })
  }));

  const panels = [...document.querySelectorAll('.sheet')];
  assert.equal(panels.length, 2, 'two documents, two panels, open at once');
  assert.match(panels[0].querySelector('.sheet-card').textContent, /M-Drive/);
  // Each opens somewhere of its own rather than stacking exactly on top.
  assert.notEqual(panels[0].style.getPropertyValue('--sheet-x'), panels[1].style.getPropertyValue('--sheet-x'));

  const statblock = panels[1];
  assert.ok(statblock.classList.contains('is-compact'));
  assert.equal(statblock.querySelector('.sheet-toggle'), null, 'no Full toggle: a statblock has no other form');

  const str = statblock.querySelector('input[aria-label^="STR"]');
  str.value = '9';
  str.dispatchEvent(new dom.window.Event('change'));
  assert.equal(session.view({ sheets: [{ kind: 'actor', id }] }).sheets[0].upp[0], '9');

  const skills = statblock.querySelector('input[aria-label="Skills"]');
  skills.value = 'Rifle-1';
  skills.dispatchEvent(new dom.window.Event('change'));
  assert.deepEqual(session.view({ sheets: [{ kind: 'actor', id }] }).sheets[0].skills, ['Rifle-1']);

  const numbering = statblock.querySelector('.sheet-check input');
  assert.equal(numbering.checked, true);
  numbering.checked = false;
  numbering.dispatchEvent(new dom.window.Event('change'));
  assert.equal(session.view({ sheets: [{ kind: 'actor', id }] }).sheets[0].numberTokens, false);

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Node;
  delete globalThis.Option;
  delete globalThis.window;
});

test('v0.249.0 the tab strip is the five Foundry-shaped directories', async () => {
  const { session } = await freshSession();
  assert.deepEqual([...REFEREE_TABS], ['Journal', 'Actors', 'Players', 'Vehicles', 'Scenes']);
  assert.deepEqual(session.view().referee.tabs, [...REFEREE_TABS]);
  // Every Vehicles row opens a sheet too, badge and all.
  const vehicles = session.view({ referee: { tab: 'Vehicles' } }).referee.shown;
  assert.ok(vehicles.length);
  assert.equal(vehicles[0].sheet.kind, 'ship');
  assert.equal(vehicles[0].badge.kind, 'ship');
});
