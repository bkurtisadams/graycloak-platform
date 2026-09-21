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
import { createSequenceDice } from '../vendor/classic-traveller-rules/index.js';
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

// ---------------------------------------------------------------------------
// v0.250.0: the full character sheet, built for play rather than as a
// facsimile of TAS Form 2.
// ---------------------------------------------------------------------------

test('v0.250.0 a character sheet carries four tabs, the vitals and Book 1 p.33\u2019s load', async () => {
  const { session, registry, campaignId } = await freshSession();
  const id = registry.resolveCampaign(campaignId).characters[0].identity.id;
  const sheetOf = () => session.view({ sheets: [{ kind: 'actor', id }] }).sheets[0];
  const sheet = sheetOf();

  assert.deepEqual(sheet.tabs, ['Play', 'Gear', 'Record', 'Notes']);
  assert.equal(sheet.character, true);
  assert.match(sheet.subtitle, /^Retired Scout/, 'the service reads as its name, not its key');

  // The band shows what is being played with. Unencumbered, that is the
  // current score; the original stays alongside so a wound is visible.
  assert.equal(sheet.effective.STR.played, sheet.effective.STR.now);
  assert.equal(sheet.load.state, 'unencumbered');
  assert.equal(sheet.load.penalty, 0);

  // Book 1 p.33's gravity adjustment, from the world the campaign is on.
  // Cinder is size 2, five steps under the standard 7, so every band is
  // 62.5% wider: 10 kg of strength becomes 16.25 kg free.
  assert.equal(sheet.load.gravityFactor, 2);
  assert.equal(sheet.load.normalGrams, 16250);
  assert.equal(sheet.load.doubleGrams, 32500);
  assert.equal(sheet.load.tripleGrams, 48750);

  // Skills come sorted by level so the useful ones are not buried.
  assert.ok(sheet.skills[0].level >= sheet.skills.at(-1).level);
  assert.equal(sheet.skills[0].label, `${sheet.skills[0].name}-${sheet.skills[0].level}`);

  // benefits.passages holds objects; a bare String() of one read
  // "[object Object]" on the sheet until v0.250.0.
  assert.ok(sheet.entitlements.includes('Low Passage'));
  assert.equal(sheet.entitlements.some((entry) => entry.includes('object Object')), false);
});

test('v0.250.0 picking up enough weight encumbers the character, and the band shows the played scores', async () => {
  const { session, registry, campaignId } = await freshSession();
  const id = registry.resolveCampaign(campaignId).characters[0].identity.id;
  const sheetOf = () => session.view({ sheets: [{ kind: 'actor', id }] }).sheets[0];
  const before = sheetOf();
  assert.equal(before.effective.STR.played, before.effective.STR.now);

  // Over 16.25 kg on Cinder: p.33 costs one off all three physical scores.
  // 10 kg on top of the rifle's 10 puts the total over 16.25 but under
  // twice it: encumbered, not overloaded.
  session.run('inventory:add', { characterId: id, item: { name: 'Oxygen Tanks', weightKg: 10, quantity: 1 } });
  const after = sheetOf();
  assert.equal(after.load.state, 'encumbered');
  assert.equal(after.load.penalty, -1);
  assert.equal(after.effective.STR.played, before.effective.STR.now - 1);
  assert.equal(after.effective.DEX.played, before.effective.DEX.now - 1);
  assert.equal(after.effective.END.played, before.effective.END.now - 1);
  // The mental three are untouched.
  assert.equal(after.effective.INT.played, before.effective.INT.now);

  // Stowing it aboard ship takes the weight off without losing the item.
  const item = after.inventory.find((entry) => entry.name === 'Oxygen Tanks');
  session.run(`inventory:toggle:${item.id}`, { characterId: id });
  assert.equal(sheetOf().load.state, 'unencumbered');
});

test('v0.250.0 the Record tab writes the personnel fields, and refuses what is not one', async () => {
  const { session, registry, campaignId } = await freshSession();
  const id = registry.resolveCampaign(campaignId).characters[0].identity.id;
  const recordOf = () => session.view({ sheets: [{ kind: 'actor', id }] }).sheets[0].record;

  assert.equal(recordOf().birthworld, '', 'migrated characters start empty: guessing a birthworld would be inventing history');
  assert.equal(session.run('character:record', { fight: { id, value: { birthworld: 'Regina', awards: 'MCUF' } } }).ok, true);
  assert.equal(recordOf().birthworld, 'Regina');
  assert.equal(recordOf().awards, 'MCUF');

  assert.equal(session.run('character:record', { fight: { id, value: { psionicStrength: 8 } } }).ok, true);
  assert.equal(recordOf().psionicStrength, 8);
  assert.equal(session.run('character:record', { fight: { id, value: { psionicStrength: 99 } } }).ok, false);
  assert.equal(session.run('character:record', { fight: { id, value: { favouriteColour: 'blue' } } }).ok, false);

  assert.equal(session.run('character:notes', { fight: { id, value: 'Owes Sanjay Cr 2,000.' } }).ok, true);
  assert.equal(session.view({ sheets: [{ kind: 'actor', id }] }).sheets[0].notes, 'Owes Sanjay Cr 2,000.');
});

test('v0.250.0 the sheet draws its four tabs, and the Gear tab reaches the real inventory commands', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;
  globalThis.window = dom.window;

  const { session, registry, campaignId } = await freshSession();
  const id = registry.resolveCampaign(campaignId).characters[0].identity.id;
  const handlers = {
    onInventory: (characterId, verb, itemId, value) => session.run(itemId ? `inventory:${verb}:${itemId}` : `inventory:${verb}`, { characterId, item: value ?? null })
  };
  const draw = (tab) => {
    const state = session.view({ sheets: [{ kind: 'actor', id, tab }] });
    document.querySelector('main').replaceChildren(renderSheets(state.sheets, handlers));
  };

  draw('Play');
  assert.deepEqual([...document.querySelectorAll('.sheet-tab')].map((node) => node.textContent), ['Play', 'Gear', 'Record', 'Notes']);
  assert.equal(document.querySelector('.sheet-tab[aria-pressed="true"]').textContent, 'Play');
  assert.equal(document.querySelectorAll('.sheet-vital').length, 6, 'the band never scrolls away');
  // The label is the button (Kurt, Sep 2026), three to a row.
  assert.ok(document.querySelectorAll('.sheet-skill').length > 0);
  assert.ok(document.querySelector('.sheet-inhand button'), 'and the weapon has its attack');

  draw('Gear');
  assert.ok(document.querySelector('.sheet-load-bar'), 'p.33 drawn as three bands');
  const before = session.view({ sheets: [{ kind: 'actor', id }] }).sheets[0].inventory.length;
  const form = document.querySelector('.sheet-add');
  form.querySelector('input[name="name"]').value = 'Electric Torch';
  form.querySelector('input[name="weightKg"]').value = '0.5';
  form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
  assert.equal(session.view({ sheets: [{ kind: 'actor', id }] }).sheets[0].inventory.length, before + 1);

  draw('Record');
  assert.equal(document.querySelectorAll('.sheet-group').length, 3, 'who they are, service, psionics');
  assert.ok(document.querySelector('input[aria-label="Birthworld"]'));

  draw('Notes');
  assert.ok(document.querySelector('textarea[aria-label="Character notes"]'));

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Node;
  delete globalThis.Option;
  delete globalThis.window;
});

// ---------------------------------------------------------------------------
// v0.251.0: Book 1 p.33 encumbrance reaching the fight, not only the sheet.
// ---------------------------------------------------------------------------

test('v0.251.0 a character who picks up too much fights at one less, and sheds it to fight at full', async () => {
  const { session, registry, campaignId } = await freshSession();
  const id = registry.resolveCampaign(campaignId).characters[0].identity.id;
  const rolled = registry.resolveCampaign(campaignId).characters[0].characteristics;
  const foe = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Bandit' } } }).createdId;
  const meIn = (view) => view.fighters.find((entry) => entry.id === id);

  // Unladen first: the fight uses what was rolled.
  let started = session.run('fight:start', { fight: { opponentIds: [foe], range: 'medium' } });
  assert.equal(started.ok, true, started.message);
  assert.equal(meIn(session.view()).characteristics.STR, rolled.STR);
  session.run('fight:end');

  // 10 kg on top of the rifle's 10 puts the total over the free band on
  // Cinder (gravity 2, so 16.25 kg), which p.33 costs one off STR, DEX and END.
  session.run('inventory:add', { characterId: id, item: { name: 'Oxygen Tanks', weightKg: 10, quantity: 1 } });
  started = session.run('fight:start', { fight: { opponentIds: [foe], range: 'medium' } });
  assert.equal(started.ok, true, started.message);
  const laden = meIn(session.view());
  assert.equal(laden.characteristics.STR, rolled.STR - 1, 'p.33: treated as one less for all purposes');
  assert.equal(laden.characteristics.DEX, rolled.DEX - 1);
  assert.equal(laden.characteristics.END, rolled.END - 1);
  assert.equal(laden.full.STR, rolled.STR - 1, 'the ceiling is reduced too, so healing cannot outrun the load');
  // "including wounds": there is less to lose before going down, and the
  // blow allowance Book 1 p.36 takes from endurance is smaller too.
  assert.equal(laden.blowAllowance, rolled.END - 1);
  session.run('fight:end');

  // Stowing it aboard ship restores the fight to full strength.
  const item = session.view({ sheets: [{ kind: 'actor', id }] }).sheets[0].inventory.find((entry) => entry.name === 'Oxygen Tanks');
  session.run(`inventory:toggle:${item.id}`, { characterId: id });
  started = session.run('fight:start', { fight: { opponentIds: [foe], range: 'medium' } });
  assert.equal(started.ok, true, started.message);
  assert.equal(meIn(session.view()).characteristics.STR, rolled.STR);
});

// ---------------------------------------------------------------------------
// v0.252.0: the personal fight takes the screen, and Book 1 p.27's procedure
// is on it. Step 3 — escape and avoidance — had no UI at all.
// ---------------------------------------------------------------------------

async function fightFixture() {
  const { session, registry, campaignId } = await freshSession();
  const foe = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Thug' } } }).createdId;
  const started = session.run('fight:start', { fight: { opponentIds: [foe], range: 'medium' } });
  assert.equal(started.ok, true, started.message);
  return { session, registry, campaignId, foe };
}

test('v0.252.0 the fight carries p.27\u2019s four steps, with the escape throw and its range DM', async () => {
  const { session } = await fightFixture();
  const steps = session.view().encounterSteps;
  assert.deepEqual(steps.map((step) => step.title), ['Surprise', 'Range', 'Escape', 'Declare']);
  assert.deepEqual(steps.map((step) => step.number), [1, 2, 3, 4]);
  assert.equal(steps[0].state, 'done');
  assert.equal(steps[1].state, 'done');

  const escape = steps[2];
  assert.equal(escape.state, 'open', 'p.28: escape is legal before contact, which is round 1');
  // Medium range carries +1 (ESCAPE_RANGE_DMS), and the strip reads the real
  // band gap rather than an encounter-wide range.
  assert.match(escape.detail, /Throw 9\+ at DM \+1/);
  assert.match(escape.cite, /p\.28/);
});

test('v0.252.0 a party holding surprise can state that it avoids the encounter', async () => {
  const { session, registry, campaignId } = await freshSession();
  const foe = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Thug' } } }).createdId;

  // Surprise is a throw, so a fixture cannot count on holding it; ask the
  // step strip whether the option is offered and check it against who has it.
  session.run('fight:start', { fight: { opponentIds: [foe], range: 'medium' } });
  const view = session.view();
  const escape = view.encounterSteps.find((step) => step.key === 'escape');
  const surprise = view.encounterSteps.find((step) => step.key === 'surprise');
  const partyHasSurprise = /The party/.test(surprise.detail);
  assert.equal(Boolean(escape.action), partyHasSurprise, 'p.28: only a surprising party may simply avoid');

  if (partyHasSurprise) {
    const avoided = session.run(escape.action.command);
    assert.equal(avoided.ok, true, avoided.message);
    assert.equal(session.view().fighters?.length ?? 0, 0, 'the encounter is over without a shot');
  } else {
    // And it is refused when the party does not hold it, rather than quietly
    // ending a fight the opposition started.
    assert.equal(session.run('fight:avoid').ok, false);
  }
});

test('v0.255.0 the fight renders as the scene, table and all, with the focused row\u2019s throw beneath it', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main><aside></aside>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;

  const { session } = await fightFixture();
  const state = { ...session.view(), live: true };
  const { renderScene, renderNow, renderFighterMenu } = await import('../client/play-views.js');

  document.querySelector('main').replaceChildren(...renderScene(state, {}));
  const shell = document.querySelector('.fight-shell');
  assert.ok(shell, 'the fight is a screen, not a band grid with a table beside it');
  assert.equal(shell.querySelectorAll('.fight-pill').length, 4, 'p.27\u2019s steps as pills on the one header line');
  assert.ok(shell.querySelector('svg.bands'), 'the band grid in the middle');
  const table = shell.querySelector('.fight-orders table.tracker');
  assert.ok(table, 'and the declaration table beneath it, at full width');
  // Every row must carry its Needs cell: it was the column being clipped.
  const needs = [...table.querySelectorAll('.sheet-needs')];
  assert.equal(needs.length, state.fighters.length);
  assert.ok(needs.every((cell) => cell.textContent.trim().length));

  // v0.255.0: the left column is hidden during a fight; what only it held —
  // the focused row's explanation — sits beneath that row instead.
  assert.ok(shell.querySelector('tr.sheet-why-row'), 'the throw behind the focused row, under its row');
  assert.ok(shell.querySelector('svg.bands.is-across'), 'and the band line runs across');

  // The token menu gives the same orders the table's dropdowns do.
  const fighter = state.fighters[0];
  const menu = renderFighterMenu({ fighter, at: { x: 10, y: 10 }, round: 1, referee: true, foes: state.fighters.filter((entry) => entry.side !== fighter.side) }, {});
  const labels = [...menu.querySelectorAll('.row-menu-item')].map((node) => node.textContent);
  assert.ok(labels.includes('Movement: evade'));
  assert.ok(labels.includes('Movement: escape'), 'escape is a movement on round 1 (p.28)');
  assert.ok(labels.some((label) => label.startsWith('Target: ')));

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Node;
  delete globalThis.Option;
});

// ---------------------------------------------------------------------------
// v0.252.1: Kurt's report — resolving the round that knocked the only foe
// unconscious snapped the screen back to the port call, with the result as
// one line of notice that opened "Refused — Harp: …".
// ---------------------------------------------------------------------------

test('v0.252.1 a fight that ends by itself stays on screen, concluded, until the referee leaves it', async () => {
  const { session, registry, campaignId } = await freshSession();
  const foe = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Harp' } } }).createdId;
  session.run('fight:start', { fight: { opponentIds: [foe], range: 'short' } });
  const me = registry.resolveCampaign(campaignId).characters[0].identity.id;

  // Resolve rounds until someone is down. Dice decide how long that takes,
  // not whether: a rifle at short range against an unarmoured thug ends it.
  let notice = null;
  for (let round = 0; round < 40; round += 1) {
    const view = session.view();
    if (view.concluded) break;
    // A pending wound allocation has to be dealt with before the next round.
    if (view.next?.wound) { session.run('fight:end'); break; }
    notice = session.run('fight:sheet', { fight: { rows: [{ actorId: me, move: 'Stand', targetId: foe }] } });
  }
  const view = session.view();
  if (!view.concluded) return; // a wound prompt interrupted this run; nothing to check

  assert.ok(view.fighters?.length, 'the fight is still what is on screen');
  assert.match(view.concluded.headline, /out of the fight|escaped|over/);
  assert.ok(view.concluded.rounds >= 1);
  assert.deepEqual(view.refereeActions.map((action) => action.command), ['fight:dismiss'], 'no Resolve round, no End fight: only leaving');
  // What happened comes first; a refused row is noted after it, not before.
  assert.equal(/^Refused/.test(notice.message), false);

  assert.equal(session.run('fight:dismiss').ok, true);
  assert.equal(session.view().fighters?.length ?? 0, 0, 'and then back to the campaign');
});

test('v0.252.1 ending a fight deliberately goes straight back, with no aftermath to close', async () => {
  const { session } = await freshSession();
  const foe = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Harp' } } }).createdId;
  session.run('fight:start', { fight: { opponentIds: [foe], range: 'medium' } });
  assert.equal(session.run('fight:end').ok, true);
  const view = session.view();
  assert.equal(view.concluded ?? null, null);
  assert.equal(view.fighters?.length ?? 0, 0);
});

// ---------------------------------------------------------------------------
// v0.253.0: the sidebar, with Chat as its first tab. The talk box on
// play.html had never done anything — no handler, and an always-empty list.
// ---------------------------------------------------------------------------

test('v0.253.0 chat:say writes a message and /roll a throw, both as log entries in the chat stream', async () => {
  const { session, registry, campaignId } = await freshSession();
  const me = registry.resolveCampaign(campaignId).characters[0].identity.id;

  assert.equal(session.run('chat:say', { fight: { value: 'Anyone home?', speakerId: me } }).ok, true);
  assert.equal(session.run('chat:say', { fight: { value: '/roll 2D+1' } }).ok, true);
  assert.equal(session.run('chat:say', { fight: { value: '/r 3d6-2' } }).ok, true);

  const chat = session.view().chat;
  const message = chat.find((entry) => entry.kind === 'message');
  assert.equal(message.text, 'Anyone home?');
  assert.equal(message.who, registry.resolveCampaign(campaignId).characters[0].identity.name, 'spoken as the character');

  const rolls = chat.filter((entry) => entry.kind === 'roll');
  assert.equal(rolls.length, 2);
  assert.match(rolls[0].text, /^2D\+1: \[\d \d\] \+1 = \d+$/);
  assert.equal(rolls[0].who, 'Referee', 'no speaker means the referee');
  assert.match(rolls[1].text, /^3D-2: \[\d \d \d\] \u22122 = -?\d+$/);

  // A chat line does not also become the now column's notice.
  assert.equal(session.view().notice?.message ?? '', '');
});

test('v0.253.0 a throw it cannot make is refused by name, and an empty line is refused', async () => {
  const { session } = await freshSession();
  const refused = session.run('chat:say', { fight: { value: '/roll banana' } });
  assert.equal(refused.ok, false);
  assert.match(refused.message, /banana/);
  assert.equal(session.run('chat:say', { fight: { value: '   ' } }).ok, false);
});

test('v0.253.0 the dice parser reads Book 1\u2019s own notation as well as the d6 form', async () => {
  const { rollDiceExpression } = await import('../src/play-session.js');
  const dice = createSequenceDice([3, 4, 5, 6, 1]);
  assert.deepEqual(rollDiceExpression('2D', dice), { expression: '2D', detail: '[3 4]', total: 7 });
  assert.equal(rollDiceExpression('1D+2', createSequenceDice([5])).total, 7);
  assert.equal(rollDiceExpression('2d6-1', createSequenceDice([6, 6])).total, 11);
  assert.throws(() => rollDiceExpression('2d7', dice), /not a throw/);
  assert.throws(() => rollDiceExpression('', dice), /roll what/);
});

test('v0.253.0 the activity log\u2019s own lines are notices, and a player sees only public entries', async () => {
  const { session } = await fightFixture();
  session.run('fight:end');
  session.run('chat:say', { fight: { value: 'Well, that went well.' } });
  const chat = session.view().chat;
  assert.ok(chat.some((entry) => entry.kind === 'notice' && entry.category === 'COMBAT'));
  assert.ok(chat.every((entry) => typeof entry.at === 'string'), 'every entry is dated');
  const player = session.view({ seat: 'player' }).chat;
  assert.ok(player.every((entry) => entry.visibility === 'public'));
});

test('v0.253.0 the chat folds all but COMBAT and ARRIVAL notices into one line that expands', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  const { renderTalkLog, CHAT_NOTICE_DEFAULTS } = await import('../client/play-views.js');
  // v0.261.0 adds MEDICAL: a rest or a treatment is worth seeing.
  assert.deepEqual([...CHAT_NOTICE_DEFAULTS], ['COMBAT', 'ARRIVAL', 'MEDICAL']);

  const chat = [
    { kind: 'notice', category: 'PORT', text: 'Berthed at Cinder, Cr 100.', dateLabel: '106-4800' },
    { kind: 'notice', category: 'TRADE', text: 'Bought 1 t of radioactives.', dateLabel: '106-4800' },
    { kind: 'notice', category: 'COMBAT', text: 'Fight begins.', dateLabel: '106-4800' },
    { kind: 'message', who: 'Kim', text: 'Get down!', dateLabel: '106-4800' },
    { kind: 'roll', who: 'Referee', text: '2D: [3 4] = 7', dateLabel: '106-4800' }
  ];
  let expanded = false;
  document.querySelector('main').replaceChildren(...renderTalkLog(chat, { showAll: false, onShowAll: () => { expanded = true; } }));
  const folded = document.querySelector('.talk-folded');
  assert.ok(folded, 'the port and trade lines fold into one');
  assert.match(folded.textContent, /^2 port, trade notices hidden/);
  assert.equal(document.querySelectorAll('.talk-notice').length, 1, 'COMBAT shows');
  assert.ok(document.querySelector('.talk-message'));
  assert.ok(document.querySelector('.talk-roll'));
  folded.click();
  assert.equal(expanded, true);

  document.querySelector('main').replaceChildren(...renderTalkLog(chat, { showAll: true }));
  assert.equal(document.querySelectorAll('.talk-notice').length, 3, 'and all of them once expanded');

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Node;
});

test('v0.253.0 a token speaks as itself, by its combatant name', async () => {
  const { session } = await fightFixture();
  const thug = session.view().fighters.find((entry) => entry.side !== 'party');
  session.run('chat:say', { fight: { value: 'Hand over the case.', speakerId: thug.id } });
  const line = session.view().chat.find((entry) => entry.text === 'Hand over the case.');
  assert.equal(line.who, thug.name, 'not "Someone", and not the statblock it came from');
});

// ---------------------------------------------------------------------------
// v0.254.0: Kurt's dive-bar workflow. Combat opens an empty board; the
// referee drags people on, moves and removes them, decides surprise — roll it
// or call it — and begins.
// ---------------------------------------------------------------------------

async function setupFixture() {
  const { session, registry, campaignId } = await freshSession();
  const me = registry.resolveCampaign(campaignId).characters[0].identity.id;
  const thug = session.run('actor:create', { fight: { value: { kind: 'statblock', name: 'Thug' } } }).createdId;
  const boss = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Sanjay Rao' } } }).createdId;
  assert.equal(session.run('fight:setup').ok, true);
  return { session, me, thug, boss };
}

test('v0.254.0 Combat opens an empty board in setup, with nothing to resolve yet', async () => {
  const { session } = await setupFixture();
  const view = session.view();
  assert.equal(view.setupPhase, true);
  assert.equal(view.fighters.length, 0, 'empty until the referee drags someone on');
  assert.deepEqual(view.refereeActions.map((action) => action.command), ['fight:discard']);
  assert.equal(session.run('fight:setup').ok, true, 'opening it again is harmless');
  assert.equal(session.view().fighters.length, 0);
});

test('v0.254.0 characters and actors are placed on a band; a statblock can be placed again, numbered', async () => {
  const { session, me, thug, boss } = await setupFixture();
  assert.equal(session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } }).ok, true);
  for (let copy = 0; copy < 3; copy += 1) {
    assert.equal(session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 5 } } }).ok, true);
  }
  assert.equal(session.run('fight:place', { fight: { value: { kind: 'actor', id: boss, column: 6 } } }).ok, true);

  const names = session.view().fighters.map((entry) => entry.name);
  assert.deepEqual(names.filter((name) => name.startsWith('Thug')), ['Thug', 'Thug 2', 'Thug 3'], 'Kurt, Sep 2026: numbered by default');
  assert.equal(session.view().fighters.find((entry) => entry.name === 'Hawkeye' || entry.side === 'party').band, 0);

  // An actor is one person; a character is one too.
  assert.equal(session.run('fight:place', { fight: { value: { kind: 'actor', id: boss, column: 6 } } }).ok, false);
  assert.equal(session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 1 } } }).ok, false);

  // Removing Thug 2 and placing another gives a new Thug 2, not a Thug 4.
  const two = session.view().fighters.find((entry) => entry.name === 'Thug 2');
  assert.equal(session.run('fight:remove', { fight: { value: { combatantId: two.id } } }).ok, true);
  session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 4 } } });
  const again = session.view().fighters.find((entry) => entry.name === 'Thug 2');
  assert.ok(again);
  assert.equal(again.band, 4);

  // Dragging a token moves it.
  assert.equal(session.run('fight:reposition', { fight: { value: { combatantId: again.id, column: 3 } } }).ok, true);
  assert.equal(session.view().fighters.find((entry) => entry.id === again.id).band, 3);
});

test('v0.254.0 the referee calls surprise or rolls it, and the call replaces the one made at creation', async () => {
  const { session, me, thug } = await setupFixture();
  assert.equal(session.run('fight:begin', { fight: { value: { surprise: 'party' } } }).ok, false, 'nobody on the board yet');
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
  session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 1 } } });

  const begun = session.run('fight:begin', { fight: { value: { surprise: 'party' } } });
  assert.equal(begun.ok, true, begun.message);
  assert.match(begun.message, /surprise party \(referee\u2019s call\)/);
  const view = session.view();
  assert.equal(view.setupPhase, false);
  assert.match(view.encounterSteps[0].detail, /^The party/);
  // The line rolled at creation — before anyone was on the board — is gone.
  assert.ok(view.lastRound.every((line) => !/opposition achieved surprise/.test(line)));
});

test('v0.254.0 each way of beginning: roll, party, opposition, nobody', async () => {
  for (const surprise of ['roll', 'party', 'opposition', 'none']) {
    const { session, me, thug } = await setupFixture();
    session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
    session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 5 } } });
    const begun = session.run('fight:begin', { fight: { value: { surprise } } });
    assert.equal(begun.ok, true, `${surprise}: ${begun.message}`);
    const detail = session.view().encounterSteps[0].detail;
    if (surprise === 'party') assert.match(detail, /^The party/);
    if (surprise === 'opposition') assert.match(detail, /^The opposition/);
    if (surprise === 'none') assert.match(detail, /^Neither/);
  }
});

test('v0.254.0 an unbegun board can be cleared without leaving an encounter behind', async () => {
  const { session, me } = await setupFixture();
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
  assert.equal(session.run('fight:discard').ok, true);
  const view = session.view();
  assert.equal(view.setupPhase ?? false, false);
  assert.equal(view.fighters?.length ?? 0, 0);
});

test('v0.254.0 Actors rows carry what dragging them onto the board places', async () => {
  const { session } = await freshSession();
  session.run('actor:create', { fight: { value: { kind: 'statblock', name: 'Thug' } } });
  const tree = session.view({ referee: { tab: 'Actors' } }).referee.tree;
  const rows = tree.flatMap((node) => session.view({ referee: { tab: 'Actors', folder: node.path } }).referee.shown);
  assert.ok(rows.some((row) => row.drag?.kind === 'character'));
  assert.ok(rows.some((row) => row.drag?.kind === 'actor'));
});

// ---------------------------------------------------------------------------
// v0.255.0: Kurt's review of v0.254.0.
// ---------------------------------------------------------------------------

async function begunFixture() {
  const { session, me, thug } = await setupFixture();
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
  session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 1 } } });
  session.run('fight:begin', { fight: { value: { surprise: 'none' } } });
  return { session, me, thug };
}

test('v0.255.0 nobody targets anybody until told to; auto-target is an option', async () => {
  const { session } = await begunFixture();
  const { sheetRows } = await import('../client/play-views.js');
  const state = session.view();
  const off = sheetRows({ ...state, autoTarget: false }, {});
  assert.ok(off.every((row) => row.targetId === null), 'placing a token does not aim it');
  assert.ok(off.every((row) => row.move === 'Stand'));
  const on = sheetRows({ ...state, autoTarget: true }, {});
  assert.ok(on.some((row) => row.targetId !== null), 'with the option on, each row aims at someone');
  // A chosen target is kept whichever way the option is set.
  const party = state.fighters.find((entry) => entry.side === 'party');
  const foe = state.fighters.find((entry) => entry.side !== 'party');
  const chosen = sheetRows({ ...state, autoTarget: false }, { [party.id]: { move: 'Stand', targetId: foe.id } });
  assert.equal(chosen.find((row) => row.fighter.id === party.id).targetId, foe.id);
});

test('v0.255.0 a combatant can change weapon — fists in a bar fight — during setup or the fight', async () => {
  const { session, me, thug } = await setupFixture();
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
  session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 1 } } });
  const hawkeye = session.view().fighters.find((entry) => entry.side === 'party');
  const keys = hawkeye.weaponChoices.map((choice) => choice.key);
  assert.ok(keys.includes('hands'), 'bare hands are always there');
  assert.ok(keys.includes(hawkeye.weaponKey), 'and the weapon in hand');

  // In setup.
  const set = session.run('fight:weapon', { fight: { value: { combatantId: hawkeye.id, weaponKey: 'hands' } } });
  assert.equal(set.ok, true, set.message);
  assert.equal(session.view().fighters.find((entry) => entry.id === hawkeye.id).weaponKey, 'hands');

  // And after the fight has begun, the thug picks up a club.
  session.run('fight:begin', { fight: { value: { surprise: 'none' } } });
  const foe = session.view().fighters.find((entry) => entry.side !== 'party');
  assert.equal(session.run('fight:weapon', { fight: { value: { combatantId: foe.id, weaponKey: 'club' } } }).ok, true);
  assert.equal(session.view().fighters.find((entry) => entry.id === foe.id).weaponKey, 'club');
  assert.ok(session.view().chat.some((entry) => /fights with club/.test(entry.text)), 'said in chat');

  assert.equal(session.run('fight:weapon', { fight: { value: { combatantId: foe.id, weaponKey: 'banana' } } }).ok, false);
});

test('v0.255.0 the band line runs across, shows the bands in play, and the fight has no left column', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;
  const { session } = await begunFixture();
  const { renderScene } = await import('../client/play-views.js');
  const state = { ...session.view(), live: true, autoTarget: false };
  document.querySelector('main').replaceChildren(...renderScene(state, {}));

  const svg = document.querySelector('svg.bands.is-across');
  assert.ok(svg);
  const [, , width, height] = svg.getAttribute('viewBox').split(' ').map(Number);
  assert.ok(width > height, 'wider than it is tall');
  // Bands 1 and 2 are in use: eight are drawn, not all sixteen.
  assert.equal(svg.querySelectorAll('rect.band').length, 8);
  // One header line with the steps as pills, and the auto-target option.
  assert.ok(document.querySelector('.fight-head .fight-toggle input[type=checkbox]'));
  assert.equal(document.querySelectorAll('.fight-head .fight-pill').length, 4);
  // A weapon choice on every row that has one.
  assert.ok(document.querySelector('select[aria-label$=": weapon"]'));

  const css = await readFile(new URL('../client/play.css', import.meta.url), 'utf8');
  assert.match(css, /\.shell\[data-situation='fight'\] \.now \{ display: none; \}/, 'the left column is gone during a fight');

  dom.window.close();
  delete globalThis.document;
  delete globalThis.Node;
  delete globalThis.Option;
});

// ---------------------------------------------------------------------------
// v0.256.0: chat says each thing that happened in a line, with its round;
// and the Actors tab packs to the top with a one-line search.
// ---------------------------------------------------------------------------

test('v0.256.0 each attack and move is its own short chat line, opening with the round', async () => {
  const { session, me, thug } = await setupFixture();
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
  session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 3 } } });
  session.run('fight:begin', { fight: { value: { surprise: 'none' } } });
  const before = session.view().chat.length;
  const [hawkeye, foe] = [session.view().fighters.find((entry) => entry.side === 'party'), session.view().fighters.find((entry) => entry.side !== 'party')];
  const result = session.run('fight:sheet', { fight: { rows: [
    { actorId: hawkeye.id, move: 'Close', targetId: foe.id },
    { actorId: foe.id, move: 'Close', targetId: hawkeye.id }
  ] } });
  assert.equal(result.ok, true, result.message);
  assert.equal(result.message, 'Round 1 resolved.');

  const lines = session.view().chat.slice(before).filter((entry) => entry.category === 'COMBAT').map((entry) => entry.text);
  assert.ok(lines.length >= 2, 'one line per thing that happened');
  assert.ok(lines.every((line) => line.startsWith('Round 1 \u00b7 ')));
  assert.ok(lines.every((line) => line.length < 140), 'short: no dice breakdown');
  assert.ok(lines.every((line) => !/SKILL|UNTRAINED|SITUATION/.test(line)));
  assert.ok(lines.some((line) => /(hits|misses) Thug with /.test(line)), 'names who was attacked');
  // The setup placements and the start of the fight are not repeated.
  assert.ok(lines.every((line) => !/joins the encounter|placed for|Combat begins/.test(line)));
});

test('v0.256.0 a concise line reads the decisive numbers', async () => {
  const { conciseCombatLine } = await import('../src/play-session.js');
  const names = new Map([['a', 'Hawkeye'], ['b', 'Thug']]);
  const hit = conciseCombatLine({ round: 2, kind: 'attack', actorId: 'a', targetId: 'b', detail: {
    attacker: { name: 'Hawkeye' }, defenderId: 'b', weaponName: 'Hands', total: 11, target: 6, success: true, woundTotal: 5, defenderStatus: 'unconscious'
  } }, 2, names);
  assert.equal(hit, 'Round 2 \u00b7 Hawkeye hits Thug with hands (11 vs 6+): 5 wounds. Thug is unconscious.');
  const miss = conciseCombatLine({ round: 2, kind: 'attack', detail: {
    attacker: { name: 'Thug' }, defenderId: 'a', weaponName: 'Club', total: 4, target: 8, success: false
  } }, 2, names);
  assert.equal(miss, 'Round 2 \u00b7 Thug misses Hawkeye with club (4 vs 8+).');
});

test('v0.256.0 the sidebar body packs to the top and the search is one line', async () => {
  const css = await readFile(new URL('../client/play.css', import.meta.url), 'utf8');
  assert.match(css, /\.sidebar > \.drawer-body \{ align-content: start;/);
  assert.match(css, /\.sidebar \.search \{ height: 32px;/);
});

// ---------------------------------------------------------------------------
// v0.257.0: settings (combat message verbosity), band zoom, armour on the
// table, and each chat line's working on hover or tap.
// ---------------------------------------------------------------------------

async function roundFixture() {
  const { session, me, thug } = await setupFixture();
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
  session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 3 } } });
  session.run('fight:begin', { fight: { value: { surprise: 'none' } } });
  const fighters = session.view().fighters;
  const hawkeye = fighters.find((entry) => entry.side === 'party');
  const foe = fighters.find((entry) => entry.side !== 'party');
  const before = session.view().chat.length;
  session.run('fight:sheet', { fight: { rows: [{ actorId: hawkeye.id, move: 'Close', targetId: foe.id }, { actorId: foe.id, move: 'Close', targetId: hawkeye.id }] } });
  return { session, hawkeye, foe, lines: session.view().chat.slice(before) };
}

test('v0.257.0 moves are MOVEMENT lines and attacks COMBAT, so chat can leave the moves out', async () => {
  const { lines } = await roundFixture();
  assert.ok(lines.some((entry) => entry.category === 'MOVEMENT' && /closes/.test(entry.text)));
  assert.ok(lines.some((entry) => entry.category === 'COMBAT' && /(hits|misses)/.test(entry.text)));
  assert.ok(lines.every((entry) => entry.category !== 'MOVEMENT' || !/(hits|misses)/.test(entry.text)));
});

test('v0.257.0 an attack line carries its working: the throw and every DM, one to a line', async () => {
  const { lines } = await roundFixture();
  const attack = lines.find((entry) => entry.category === 'COMBAT' && /(hits|misses)/.test(entry.text));
  assert.ok(attack.detail, 'the detail travels with the line');
  const detail = attack.detail.split('\n');
  assert.match(detail[0], / at \w[\w ]* range against /);
  assert.match(detail[1], /^2D \[\d\] \[\d\] = \d+$/);
  assert.ok(detail.some((line) => /^Total -?\d+ against \d+\+ \u2014 (hit|miss)$/.test(line)));
  assert.ok(detail.every((line) => !/object Object/.test(line)));
});

test('v0.257.0 terse chat shows attacks only; verbose adds the moves', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  const { renderTalkLog } = await import('../client/play-views.js');
  const { lines } = await roundFixture();
  document.querySelector('main').replaceChildren(...renderTalkLog(lines, { categories: ['COMBAT'] }));
  const terse = document.querySelector('main').textContent;
  assert.equal(/closes/.test(terse), false, 'moves are folded away');
  assert.match(terse, /movement notice/);
  document.querySelector('main').replaceChildren(...renderTalkLog(lines, { categories: ['COMBAT', 'MOVEMENT'] }));
  assert.match(document.querySelector('main').textContent, /closes/);
  // The working is on hover (title) and on tap (details).
  const withDetail = document.querySelector('details.has-detail');
  assert.ok(withDetail);
  assert.match(withDetail.getAttribute('title'), /^\w/);
  assert.ok(withDetail.querySelector('pre.talk-detail'));
  dom.window.close();
  delete globalThis.document;
  delete globalThis.Node;
});

test('v0.257.0 the referee sets armour on the board; it changes the throw, and chat says so', async () => {
  const { session, me, thug } = await setupFixture();
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
  session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 3 } } });
  const foe = session.view().fighters.find((entry) => entry.side !== 'party');
  assert.ok(foe.armorChoices.includes('combat'), 'Book 1\u2019s own list');
  const set = session.run('fight:armor', { fight: { value: { combatantId: foe.id, armor: 'combat' } } });
  assert.equal(set.ok, true, set.message);
  assert.equal(set.message, 'Thug is wearing combat armour.');
  assert.equal(session.view().fighters.find((entry) => entry.id === foe.id).armor, 'combat');
  assert.equal(session.run('fight:armor', { fight: { value: { combatantId: foe.id, armor: 'powered' } } }).ok, false);
});

test('v0.257.0 the band line zooms: fewer bands, more, the whole field, or fit', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;
  const { renderScene } = await import('../client/play-views.js');
  const { session } = await roundFixture();
  const count = (bandsShown) => {
    document.querySelector('main').replaceChildren(...renderScene({ ...session.view(), live: true, bandsShown }, {}));
    return document.querySelectorAll('svg.bands rect.band').length;
  };
  assert.equal(count(null), 8, 'fit: the bands in play, never fewer than eight');
  assert.equal(count(16), 16, 'the whole field');
  assert.equal(count(4), 4);
  assert.equal(count(1), 3, 'never fewer than three');
  assert.ok(document.querySelector('.band-zoom button[aria-label="Show fewer bands"]'));
  dom.window.close();
  delete globalThis.document;
  delete globalThis.Node;
  delete globalThis.Option;
});

// ---------------------------------------------------------------------------
// v0.258.0: Kurt's ruling on Book 1's "+3 when defending" — only in brawling
// or blade combat, against a defender armed with a brawling or blade weapon.
// ---------------------------------------------------------------------------

test('v0.258.0 shooting an untrained NPC gives no +3; punching one holding a club he cannot use does', async () => {
  // A shot across the room at the skill-less Thug statblock.
  const shot = await roundFixture();
  const attackLine = shot.lines.find((entry) => entry.category === 'COMBAT' && /^Round 1 \u00b7 Hawkeye (hits|misses)/.test(entry.text));
  if (attackLine) assert.equal(/Defender untrained/.test(attackLine.detail), false, 'no +3 against a gunman');

  // Fists against a thug holding a club he has no expertise in.
  const { session, me, thug } = await setupFixture();
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
  session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 0 } } });
  const [hawkeye, foe] = [session.view().fighters.find((entry) => entry.side === 'party'), session.view().fighters.find((entry) => entry.side !== 'party')];
  session.run('fight:weapon', { fight: { value: { combatantId: hawkeye.id, weaponKey: 'hands' } } });
  session.run('fight:weapon', { fight: { value: { combatantId: foe.id, weaponKey: 'club' } } });
  session.run('fight:begin', { fight: { value: { surprise: 'none' } } });
  const before = session.view().chat.length;
  session.run('fight:sheet', { fight: { rows: [{ actorId: hawkeye.id, move: 'Stand', targetId: foe.id }, { actorId: foe.id, move: 'Stand', targetId: null }] } });
  const punch = session.view().chat.slice(before).find((entry) => /^Round 1 \u00b7 Hawkeye (hits|misses)/.test(entry.text));
  assert.ok(punch, 'Hawkeye threw a punch');
  assert.match(punch.detail, /Defender untrained \+3/);
});

// ---------------------------------------------------------------------------
// v0.259.0: Book 1's guns as clubs — a pistol classed as a club in brawling,
// an unloaded rifle or carbine as a cudgel, never a laser.
// ---------------------------------------------------------------------------

test('v0.259.0 a pistol-armed thug may swing it as a club; a laser rifle offers no cudgel', async () => {
  const { session, me, thug } = await setupFixture();
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
  session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 0 } } });
  const fighters = session.view().fighters;
  const foe = fighters.find((entry) => entry.side !== 'party');
  const hawkeye = fighters.find((entry) => entry.side === 'party');
  const thugChoices = foe.weaponChoices.map((choice) => `${choice.key}=${choice.name}`);
  assert.ok(thugChoices.includes('club=Automatic Pistol, swung as a club'));
  assert.ok(thugChoices.some((choice) => choice.startsWith('hands=')));
  // Hawkeye carries a laser rifle: "laser weapons are too delicate".
  assert.equal(hawkeye.weaponChoices.some((choice) => choice.key === 'cudgel'), false);

  assert.equal(session.run('fight:weapon', { fight: { value: { combatantId: foe.id, weaponKey: 'club' } } }).ok, true);
  // The choice stays with the combatant from round to round.
  session.run('fight:begin', { fight: { value: { surprise: 'none' } } });
  session.run('fight:sheet', { fight: { rows: [{ actorId: hawkeye.id, move: 'Stand', targetId: null }, { actorId: foe.id, move: 'Stand', targetId: null }] } });
  assert.equal(session.view().round, 2);
  assert.equal(session.view().fighters.find((entry) => entry.id === foe.id).weaponKey, 'club');
});

// ---------------------------------------------------------------------------
// v0.260.0: Kurt's report — "Where does Hawkeye take it?" appeared with no
// way to answer, and with Resolve round withheld the fight stopped.
// ---------------------------------------------------------------------------

async function woundedFixture() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const { session, me, thug } = await setupFixture();
    session.run('edit:actor:skills', { fight: { id: thug, value: 'Brawling-3' } });
    session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
    session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 0 } } });
    const fighters = session.view().fighters;
    const hawkeye = fighters.find((entry) => entry.side === 'party');
    const foe = fighters.find((entry) => entry.side !== 'party');
    session.run('fight:weapon', { fight: { value: { combatantId: foe.id, weaponKey: 'club' } } });
    session.run('fight:begin', { fight: { value: { surprise: 'none' } } });
    for (let round = 0; round < 12; round += 1) {
      const view = session.view();
      if (!view.fighters?.length || view.concluded) break;
      if (view.next?.wound) return { session, hawkeye, foe };
      session.run('fight:sheet', { fight: { rows: [{ actorId: hawkeye.id, move: 'Stand', targetId: null }, { actorId: foe.id, move: 'Stand', targetId: hawkeye.id }] } });
    }
  }
  return null;
}

test('v0.260.0 a waiting wound carries what the groups need, and answering it lets the fight go on', async () => {
  const fixture = await woundedFixture();
  assert.ok(fixture, 'a club-armed brawler lands a second hit within a few rounds');
  const { session, hawkeye } = fixture;
  const wound = session.view().next.wound;
  assert.equal(wound.defenderName, 'Hawkeye');
  assert.ok(wound.damageDice.length >= 1);
  assert.equal(typeof wound.current.END, 'number', 'the current scores, for the buttons and the preview');

  const before = session.view().fighters.find((entry) => entry.id === hawkeye.id).characteristics;
  const shares = wound.damageDice.map((die, index) => (index === 0 ? wound.modifier : 0));
  const targets = wound.damageDice.map(() => (before.STR > 0 ? 'STR' : before.DEX > 0 ? 'DEX' : 'END'));
  const answered = session.run('fight:wound', { fight: { woundTargets: targets, woundAllocation: shares } });
  assert.equal(answered.ok, true, answered.message);
  const view = session.view();
  assert.equal(Boolean(view.next?.wound && view.next.wound.key === wound.key), false, 'that wound is no longer waiting');
});

test('v0.260.0 the fight screen draws the wound\u2019s groups and applies the choice', { skip: !JSDOM }, async () => {
  const fixture = await woundedFixture();
  assert.ok(fixture);
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;
  const { renderScene } = await import('../client/play-views.js');
  let drafted = null;
  let applied = null;
  const state = { ...fixture.session.view(), live: true };
  document.querySelector('main').replaceChildren(...renderScene(state, {
    onWoundDraft: (draft) => { drafted = draft; },
    onAllocateWound: (draft) => { applied = draft; }
  }));
  const panel = document.querySelector('.fight-wound');
  assert.ok(panel, 'the wound is answered on the fight screen');
  const rows = panel.querySelectorAll('.wound-group-row');
  assert.equal(rows.length, state.next.wound.damageDice.length, 'one row per die: each is a group (p.30)');
  // Pick END for the first group.
  [...rows[0].querySelectorAll('button')].find((button) => button.textContent.startsWith('END')).click();
  assert.equal(drafted.targets[0], 'END');
  panel.querySelector('button.is-primary').click();
  assert.ok(applied, 'Apply sends the draft');
  assert.equal(applied.targets.length, rows.length);
  dom.window.close();
  delete globalThis.document;
  delete globalThis.Node;
  delete globalThis.Option;
});

// ---------------------------------------------------------------------------
// v0.261.0: a fight's wounds reach the characters, and Book 1 p.31 recovery —
// three days of rest, or medical attention (8+, Kurt's ruling).
// ---------------------------------------------------------------------------

async function foughtFixture() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const fixture = await woundedFixture();
    if (!fixture) continue;
    const { session } = fixture;
    // Place the waiting wound, then end the fight.
    const wound = session.view().next.wound;
    const now = session.view().fighters.find((entry) => entry.id === wound.defenderId).characteristics;
    const key = now.DEX > 0 ? 'DEX' : now.STR > 0 ? 'STR' : 'END';
    session.run('fight:wound', { fight: { woundTargets: wound.damageDice.map(() => key), woundAllocation: wound.damageDice.map((die, index) => (index === 0 ? wound.modifier : 0)) } });
    const view = session.view();
    if (view.concluded) session.run('fight:dismiss');
    else if (view.fighters?.length) session.run('fight:end');
    return fixture;
  }
  return null;
}

test('v0.261.0 the fight\u2019s wounds are written to the character when it ends', async () => {
  const fixture = await foughtFixture();
  assert.ok(fixture);
  const { session, hawkeye } = fixture;
  const sheet = session.view({ sheets: [{ kind: 'actor', id: hawkeye.id }] }).sheets[0];
  assert.equal(sheet.condition.wounded, true, 'he walks out of the fight hurt');
  assert.ok(['STR', 'DEX', 'END'].some((key) => sheet.effective[key].now < sheet.effective[key].full));

  // And the next fight starts him that way.
  const foe = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Second Thug' } } }).createdId;
  session.run('fight:setup');
  session.run('fight:place', { fight: { value: { kind: 'character', id: hawkeye.id, column: 0 } } });
  session.run('fight:place', { fight: { value: { kind: 'actor', id: foe, column: 3 } } });
  const again = session.view().fighters.find((entry) => entry.side === 'party');
  assert.ok(['STR', 'DEX', 'END'].some((key) => again.characteristics[key] < again.full[key]));
});

test('v0.261.0 three days of rest restores him and moves the clock', async () => {
  const fixture = await foughtFixture();
  const { session, hawkeye } = fixture;
  const before = session.view().chat.at(-1)?.dateLabel;
  const rested = session.run('character:rest', { fight: { id: hawkeye.id } });
  if (session.view({ sheets: [{ kind: 'actor', id: hawkeye.id }] }).sheets[0].condition.severe) return;
  assert.equal(rested.ok, true, rested.message);
  const sheet = session.view({ sheets: [{ kind: 'actor', id: hawkeye.id }] }).sheets[0];
  assert.equal(sheet.condition.wounded, false);
  const restLine = session.view().chat.find((entry) => entry.category === 'MEDICAL' && /rests three days/.test(entry.text));
  assert.ok(restLine);
  assert.notEqual(restLine.dateLabel, before, 'three days pass on the campaign clock');
  assert.equal(session.run('character:rest', { fight: { id: hawkeye.id } }).ok, false, 'not wounded now');
});

test('v0.261.0 medical attention throws 8+ with the attendant\u2019s Medical, and says so in chat', async () => {
  const fixture = await foughtFixture();
  const { session, hawkeye } = fixture;
  const chatBefore = session.view().chat.length;
  const treated = session.run('character:medical', { fight: { id: hawkeye.id, value: { medicId: hawkeye.id } } });
  assert.equal(treated.ok, true, treated.message);
  assert.match(treated.message, /treats Hawkeye: -?\d+ vs 8\+ \u2014 (back to full strength|no better; try again tomorrow)\./);
  const line = session.view().chat.slice(chatBefore).find((entry) => entry.category === 'MEDICAL');
  assert.ok(line);
  assert.match(line.detail, /Total -?\d+ against 8\+/);
});

test('v0.261.0 the sheet shows the condition, with Rest refused to the severely wounded', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;
  globalThis.window = dom.window;
  const { renderSheets } = await import('../client/sheets.js');
  const { session, registry, campaignId } = await freshSession();
  const id = registry.resolveCampaign(campaignId).characters[0].identity.id;
  const sheetOf = () => session.view({ sheets: [{ kind: 'actor', id, tab: 'Play' }] }).sheets;
  document.querySelector('main').replaceChildren(renderSheets(sheetOf(), {}));
  assert.match(document.querySelector('main').textContent, /Unwounded\./);

  session.run('edit:character:current', { fight: { id, value: { STR: 3 } } });
  let rested = null;
  let treated = null;
  document.querySelector('main').replaceChildren(renderSheets(sheetOf(), {
    onRest: (who) => { rested = who; },
    onMedical: (who, medic, xeno) => { treated = { who, medic, xeno }; }
  }));
  const block = document.querySelector('.sheet-condition');
  assert.ok(block, 'a wounded character has the recovery controls');
  const buttons = [...block.querySelectorAll('button')];
  buttons.find((button) => /Rest three days/.test(button.textContent)).click();
  buttons.find((button) => /Medical attention/.test(button.textContent)).click();
  assert.equal(rested, id);
  assert.equal(treated.who, id);
  assert.ok(treated.medic, 'an attending character is chosen');
  dom.window.close();
  delete globalThis.document;
  delete globalThis.Node;
  delete globalThis.Option;
  delete globalThis.window;
});
