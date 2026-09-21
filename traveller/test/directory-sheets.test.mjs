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

test('v0.252.0 the fight renders as the scene, table and all, and the now column keeps the focused combatant', { skip: !JSDOM }, async () => {
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
  assert.ok(shell.querySelector('.fight-steps'), 'p.27\u2019s steps across the top');
  assert.ok(shell.querySelector('svg.bands'), 'the band grid in the middle');
  const table = shell.querySelector('.fight-orders table.tracker');
  assert.ok(table, 'and the declaration table beneath it, at full width');
  // Every row must carry its Needs cell: it was the column being clipped.
  const needs = [...table.querySelectorAll('.sheet-needs')];
  assert.equal(needs.length, state.fighters.length);
  assert.ok(needs.every((cell) => cell.textContent.trim().length));

  document.querySelector('aside').replaceChildren(...renderNow(state, {}));
  assert.equal(document.querySelector('aside .now-head h1').textContent, 'This round');
  assert.ok(document.querySelector('aside .sheet-why'), 'the column keeps the throw behind the focused row');
  assert.equal(document.querySelector('aside table.tracker'), null, 'and not a second copy of the table');

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
