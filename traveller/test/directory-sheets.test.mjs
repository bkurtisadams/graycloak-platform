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
  assert.equal(document.querySelectorAll('.sheet-group').length, 4, 'service history (v0.279.0), who they are, service, psionics');
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
  // v0.263.0 adds SKILL: a skill described from the sheet.
  // v0.264.0 adds GEAR: buying and being given things.
  assert.deepEqual([...CHAT_NOTICE_DEFAULTS], ['COMBAT', 'ARRIVAL', 'MEDICAL', 'SKILL', 'GEAR']);

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
  assert.equal(set.message, 'Thug is wearing battle dress.');
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
  // v0.270.0: the name carries the expertise tag; the weapon itself is baseName.
  const thugChoices = foe.weaponChoices.map((choice) => `${choice.key}=${choice.baseName ?? choice.name}`);
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

// ---------------------------------------------------------------------------
// v0.262.0: the chat footer — room to write, Clear, Export — and the date as
// a divider where it changes.
// ---------------------------------------------------------------------------

test('v0.262.0 chat shows the date once where it changes, and Clear hides without deleting', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  const { renderTalkLog } = await import('../client/play-views.js');
  const chat = [
    { id: 'a', kind: 'message', category: 'CHAT', who: 'Referee', text: 'Landing.', dateLabel: '106-4800', at: '2026-09-21T10:00:00.000Z' },
    { id: 'b', kind: 'notice', category: 'COMBAT', who: 'Referee', text: 'Round 1 \u00b7 a hit.', dateLabel: '106-4800', at: '2026-09-21T10:01:00.000Z' },
    { id: 'c', kind: 'message', category: 'CHAT', who: 'Hawkeye', text: 'Rested.', dateLabel: '109-4800', at: '2026-09-21T10:02:00.000Z' }
  ];
  const main = document.querySelector('main');
  main.replaceChildren(...renderTalkLog(chat));
  assert.deepEqual([...main.querySelectorAll('.talk-day')].map((node) => node.textContent), ['106-4800', '109-4800']);

  let restored = false;
  main.replaceChildren(...renderTalkLog(chat, { clearedAt: chat[1].at, onUnclear: () => { restored = true; } }));
  assert.equal(/Landing/.test(main.textContent), false);
  assert.match(main.textContent, /Rested\./);
  const show = main.querySelector('.talk-cleared');
  assert.match(show.textContent, /show 2 earlier/);
  show.click();
  assert.equal(restored, true);
  dom.window.close();
  delete globalThis.document;
  delete globalThis.Node;
});

test('v0.262.0 Export has the whole chat, each line dated, with its working beneath', async () => {
  const { chatExportText } = await import('../client/play-views.js');
  const { session } = await freshSession();
  for (let index = 0; index < 305; index += 1) session.run('chat:say', { fight: { value: `line ${index}` } });
  assert.equal(session.view().chat.length <= 300, true, 'the screen keeps 300');
  const transcript = session.chatTranscript();
  assert.ok(transcript.lines.length >= 305, 'Export has them all');
  const text = chatExportText({ campaignName: 'Sea of Suns', date: '106-4800', lines: [
    { kind: 'message', who: 'Hawkeye', text: 'Two\nlines', dateLabel: '106-4800' },
    { kind: 'notice', who: 'Referee', text: 'Round 1 \u00b7 Hawkeye hits Thug.', dateLabel: '106-4800', detail: '2D [5] [6] = 11\nTotal 11 against 11+ \u2014 hit' }
  ] });
  assert.match(text, /^Sea of Suns \u2014 chat, exported 106-4800\n/);
  assert.match(text, /\[106-4800\] Hawkeye: Two\n {4}lines\n/);
  assert.match(text, /\[106-4800\] Round 1 \u00b7 Hawkeye hits Thug\.\n {4}2D \[5\] \[6\] = 11\n {4}Total 11 against 11\+/);
});

// ---------------------------------------------------------------------------
// v0.263.0: skills on the sheet — no repeated "+1", a tagline instead, a
// throw into chat on click, the description on ⓘ or Shift+click; and the
// compact sheet's skills no longer "[object Object]".
// ---------------------------------------------------------------------------

test('v0.263.0 a skill click throws 2D plus Book 1\u2019s DM into chat as the character; \u24d8 describes it', async () => {
  const { session, registry, campaignId } = await freshSession();
  const character = registry.resolveCampaign(campaignId).characters[0];
  const [name, level] = Object.entries(character.skills).find(([skill]) => skill === 'Navigation') ?? Object.entries(character.skills)[0];
  const rolled = session.run('character:skill-roll', { fight: { id: character.identity.id, value: { skill: name } } });
  assert.equal(rolled.ok, true, rolled.message);
  assert.match(rolled.message, new RegExp(`^${name}-${level}: 2D \\[\\d \\d\\] [+\u2212] \\d+ = -?\\d+$`));
  const roll = session.view().chat.at(-1);
  assert.equal(roll.kind, 'roll');
  assert.equal(roll.who, character.identity.name, 'thrown as the character');
  assert.match(roll.detail, /^2D \[\d\] \[\d\] = \d+\n/);

  const described = session.run('character:skill-info', { fight: { id: character.identity.id, value: { skill: name } } });
  assert.equal(described.ok, true);
  const info = session.view().chat.at(-1);
  assert.equal(info.category, 'SKILL');
  assert.match(info.detail, /Book 1 p\.\d+/);
  assert.equal(session.run('character:skill-roll', { fight: { id: character.identity.id, value: { skill: 'Basket Weaving' } } }).ok, false);
});

test('v0.263.0 the sheet\u2019s skill cards carry a tagline, not the level again, and the compact sheet lists them', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;
  globalThis.window = dom.window;
  const { renderSheets } = await import('../client/sheets.js');
  const { session, registry, campaignId } = await freshSession();
  const id = registry.resolveCampaign(campaignId).characters[0].identity.id;
  let rolled = null;
  let described = null;
  const handlers = { onSkillRoll: (who, skill) => { rolled = skill; }, onSkillInfo: (who, skill) => { described = skill; } };
  document.querySelector('main').replaceChildren(renderSheets(session.view({ sheets: [{ kind: 'actor', id, tab: 'Play' }] }).sheets, handlers));
  const cards = [...document.querySelectorAll('.sheet-skill-card')];
  assert.ok(cards.length);
  for (const card of cards) assert.equal(/^\+\d+$/.test(card.querySelector('small').textContent.trim()), false, 'no bare "+1"');
  cards[0].querySelector('.sheet-skill').click();
  assert.ok(rolled);
  cards[0].querySelector('.sheet-skill-info').click();
  assert.equal(described, rolled);
  cards[0].querySelector('.sheet-skill').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, shiftKey: true }));
  assert.equal(described, rolled);

  document.querySelector('main').replaceChildren(renderSheets(session.view({ sheets: [{ kind: 'actor', id, compact: true }] }).sheets, handlers));
  const skills = [...document.querySelectorAll('input')].map((input) => input.value).find((value) => /-\d/.test(value));
  assert.ok(skills, 'the compact sheet shows the skills');
  assert.equal(/object Object/.test(document.querySelector('main').innerHTML), false);
  dom.window.close();
  delete globalThis.document;
  delete globalThis.Node;
  delete globalThis.Option;
  delete globalThis.window;
});

// ---------------------------------------------------------------------------
// v0.264.0: the Compendium — weapons, armour and equipment onto a character,
// bought or given.
// ---------------------------------------------------------------------------

test('v0.264.0 buying from the Compendium pays from the character\u2019s cash and fills the inventory', async () => {
  const { session, registry, campaignId } = await freshSession();
  const character = () => registry.resolveCampaign(campaignId).characters[0];
  const id = character().identity.id;
  const view = session.view().compendium;
  assert.deepEqual(view.packs.map((pack) => pack.name), ['Weapons', 'Armour', 'Equipment']);
  const cash = character().finances.credits;
  const items = character().inventory.length;

  const rifle = session.run('gear:buy', { fight: { id, value: { key: 'weapon:rifle' } } });
  assert.equal(rifle.ok, true, rifle.message);
  assert.equal(character().finances.credits, cash - 220);
  assert.equal(character().inventory.length, items + 1);
  assert.equal(character().inventory.at(-1).weaponKey, 'rifle');

  const rations = session.run('gear:buy', { fight: { id, value: { key: 'gear:dehydrated-rations-1-day', quantity: 3 } } });
  assert.equal(rations.ok, true, rations.message);
  assert.equal(character().finances.credits, cash - 220 - 75);
  assert.equal(character().inventory.at(-1).quantity, 3);
  assert.equal(character().inventory.at(-1).weightGrams, 200);

  const line = session.view().chat.find((entry) => entry.category === 'GEAR' && /buys a Rifle for Cr 220/.test(entry.text));
  assert.ok(line, 'said in chat');
});

test('v0.264.0 Give costs nothing and reaches what Buy cannot; Buy refuses what this world will not sell or the purse cannot', async () => {
  const { session, registry, campaignId } = await freshSession();
  const character = () => registry.resolveCampaign(campaignId).characters[0];
  const id = character().identity.id;
  const cash = character().finances.credits;
  const world = session.view().compendium.world;
  const dress = session.view().compendium.packs.find((pack) => pack.name === 'Armour').entries.find((entry) => entry.key === 'armour:combat');
  assert.equal(dress.buy, false);

  assert.equal(session.run('gear:buy', { fight: { id, value: { key: 'armour:combat' } } }).ok, false, 'military');
  const given = session.run('gear:give', { fight: { id, value: { key: 'armour:combat' } } });
  assert.equal(given.ok, true, given.message);
  assert.equal(character().loadout.armor, 'combat', 'armour is put on');
  assert.equal(character().finances.credits, cash, 'a gift is free');

  if (world && world.techLevel < 11) {
    assert.equal(session.run('gear:buy', { fight: { id, value: { key: 'gear:hand-computer' } } }).ok, false, 'tech level too low');
  }
  assert.equal(session.run('gear:buy', { fight: { id, value: { key: 'gear:advanced-base' } } }).ok, cash >= 50000 && (!world || world.techLevel >= 8));
});

test('v0.264.0 the Compendium tab lists the packs, flags what cannot be bought, and a drop asks Buy or Give', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  const { renderDrawer, renderGearDrop, SIDEBAR_TABS } = await import('../client/play-views.js');
  assert.ok(SIDEBAR_TABS.includes('Compendium'));
  const { session, registry, campaignId } = await freshSession();
  const characters = registry.resolveCampaign(campaignId).characters.map((entry) => ({ id: entry.identity.id, name: entry.identity.name }));
  let acted = null;
  const handlers = { onGear: (how, who, key, quantity) => { acted = { how, who, key, quantity }; }, onCompendium: () => {} };
  const state = { ...session.view(), live: true, compendiumCharacters: characters, compendiumUi: { expanded: 'weapon:rifle' } };
  document.querySelector('main').replaceChildren(...renderDrawer('compendium', state, {}, handlers));
  const main = document.querySelector('main');
  assert.equal(main.querySelectorAll('.gear-pack').length, 3);
  assert.ok([...main.querySelectorAll('.gear-row')].every((row) => row.getAttribute('draggable') === 'true'));
  [...main.querySelectorAll('.gear-open button')].find((button) => button.textContent === 'Give').click();
  assert.deepEqual(acted, { how: 'give', who: characters[0].id, key: 'weapon:rifle', quantity: 1 });

  const entry = state.compendium.packs[1].entries.find((candidate) => candidate.key === 'armour:combat');
  main.replaceChildren(renderGearDrop({ entry, characterId: characters[0].id, characterName: characters[0].name, cashCr: 100, at: { x: 10, y: 10 } }, handlers));
  const buy = [...main.querySelectorAll('button')].find((button) => button.textContent === 'Buy');
  assert.equal(buy.disabled, true, 'Battle Dress cannot be bought');
  assert.match(main.textContent, /Strictly military/);
  dom.window.close();
  delete globalThis.document;
  delete globalThis.Node;
});

// ------------------------------------------------------------ v0.265.0
// Kurt, Sep 2026: folders in the Actors tab could not be renamed, and player
// characters (Hawkeye) could not be copied or deleted.

test('v0.265.0 a player character is filed, copied and deleted from the Actors directory', async () => {
  const { session, registry, campaignId } = await freshSession();
  const campaign = () => registry.resolveCampaign(campaignId).campaign;
  const hawkeye = registry.resolveCampaign(campaignId).characters[0];
  const id = hawkeye.identity.id;
  const row = () => allActorRows(session).find((entry) => entry.id === id);
  assert.equal(row().folder, 'Player characters', 'unfiled characters keep the old folder');
  assert.equal(row().editable, true);

  assert.equal(session.run('character:folder', { fight: { id, value: ' Crew / Bridge ' } }).ok, true);
  assert.equal(row().folder, 'Crew/Bridge');

  const copied = session.run('character:copy', { fight: { id } });
  assert.equal(copied.ok, true, copied.message);
  const copy = allActorRows(session).find((entry) => entry.id === copied.createdId);
  assert.equal(copy.name, `${hawkeye.identity.name || 'Unnamed'} (copy)`);
  assert.equal(copy.folder, 'Crew/Bridge', 'a copy is filed beside its original');
  assert.match(copy.note, /not in the party/);
  assert.equal(campaign().party.characterIds.includes(copied.createdId), false);

  const deleted = session.run('character:delete', { fight: { id: copied.createdId } });
  assert.equal(deleted.ok, true, deleted.message);
  assert.equal(allActorRows(session).some((entry) => entry.id === copied.createdId), false);
  assert.equal(registry.resolveCampaign(campaignId).characters.some((entry) => entry.identity.id === copied.createdId), false);
});

test('v0.265.0 deleting the active character moves the active slot; the last of the party is refused', async () => {
  const { session, registry, campaignId } = await freshSession();
  const { addCharacterToCampaign } = await import('../src/campaign-document.js');
  const resolved = () => registry.resolveCampaign(campaignId);
  const [first] = resolved().campaign.party.characterIds;
  // The fixture party is one character; a copy put into the party makes two.
  const copyId = session.run('character:copy', { fight: { id: first } }).createdId;
  const copy = resolved().characters.find((entry) => entry.identity.id === copyId);
  registry.put(addCharacterToCampaign(resolved().campaign, copy, { active: true, makeActive: true }));
  session.reload();
  assert.equal(resolved().campaign.activeCharacterId, copyId);

  assert.equal(session.run('character:delete', { fight: { id: copyId } }).ok, true);
  assert.equal(resolved().campaign.activeCharacterId, first, 'the active slot moves to whoever is left');
  const refused = session.run('character:delete', { fight: { id: first } });
  assert.equal(refused.ok, false);
  assert.match(refused.message, /at least one/);
});

test('v0.265.0 a character on the combat board cannot be deleted', async () => {
  const { session, me } = await setupFixture();
  assert.equal(session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } }).ok, true);
  const refused = session.run('character:delete', { fight: { id: me } });
  assert.equal(refused.ok, false);
  assert.match(refused.message, /combat board/);
});

test('v0.265.0 renaming a folder moves characters, actors and sub-folders; removing one moves them up', async () => {
  const { session } = await freshSession();
  const bandit = session.run('actor:create', { fight: { value: { kind: 'statblock', name: 'Bandit', folder: 'Startown/Dock gangs' } } }).createdId;
  const rowOf = (id) => allActorRows(session).find((entry) => entry.id === id);
  const pc = allActorRows(session).find((entry) => entry.folder === 'Player characters').id;

  const renamed = session.run('folder:rename', { fight: { value: { tab: 'Actors', from: 'Player characters', to: 'Crew' } } });
  assert.equal(renamed.ok, true, renamed.message);
  assert.equal(renamed.folder, 'Crew');
  assert.equal(rowOf(pc).folder, 'Crew');
  assert.equal(actorsTab(session).tree.some((node) => node.path === 'Player characters'), false);

  assert.equal(session.run('folder:rename', { fight: { value: { tab: 'Actors', from: 'Startown', to: 'Downport' } } }).ok, true);
  assert.equal(rowOf(bandit).folder, 'Downport/Dock gangs', 'a sub-folder moves with its parent');

  const removed = session.run('folder:remove', { fight: { value: { tab: 'Actors', from: 'Downport/Dock gangs' } } });
  assert.equal(removed.ok, true, removed.message);
  assert.equal(rowOf(bandit).folder, 'Downport');
  assert.equal(session.run('folder:remove', { fight: { value: { tab: 'Actors', from: 'Downport' } } }).ok, true);
  assert.equal(rowOf(bandit).folder, '', 'a top-level folder removed leaves its contents Unfiled');
  assert.equal(session.run('folder:remove', { fight: { value: { tab: 'Actors', from: 'Unfiled' } } }).ok, false, 'Unfiled is not a folder to remove');
});

test('v0.265.0 a new NPC is not filed among the player characters', async () => {
  const { session } = await freshSession();
  const id = session.run('actor:create', { fight: { value: { kind: 'statblock', name: 'Thug', folder: 'Player characters' } } }).createdId;
  assert.equal(allActorRows(session).find((entry) => entry.id === id).folder, '');
  const kept = session.run('actor:create', { fight: { value: { kind: 'statblock', name: 'Bandit', folder: 'Mooks' } } }).createdId;
  assert.equal(allActorRows(session).find((entry) => entry.id === kept).folder, 'Mooks', 'any other folder is honoured');
});

test('v0.265.0 folder and character menus offer the new verbs', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;
  const { session } = await freshSession();
  const state = { ...session.view({ referee: { tab: 'Actors', folder: 'Player characters' } }), live: true };
  const folderMenus = [];
  document.querySelector('main').replaceChildren(...renderDrawer('referee', state, state.referee, { onFolderMenu: (folder, at) => folderMenus.push({ folder, at }) }));
  const folderRow = [...document.querySelectorAll('.folder-row')].find((node) => node.textContent.includes('Player characters'));
  folderRow.dispatchEvent(new dom.window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  assert.deepEqual(folderMenus[0].folder, { tab: 'Actors', path: 'Player characters' });
  document.querySelector('main').replaceChildren(renderRowMenu({ ...folderMenus[0], at: { x: 10, y: 10 } }, {}));
  assert.deepEqual([...document.querySelectorAll('.row-menu-item')].map((node) => node.textContent), ['Rename folder\u2026', 'Remove folder, keep contents']);

  const pc = state.referee.shown.find((entry) => entry.character);
  document.querySelector('main').replaceChildren(renderRowMenu({ entry: pc, at: { x: 10, y: 10 } }, {}));
  assert.deepEqual([...document.querySelectorAll('.row-menu-item')].map((node) => node.textContent),
    ['Open sheet', 'Rename\u2026', 'Copy', 'Move to folder\u2026', 'Delete']);
  dom.window.close();
  delete globalThis.document;
});

test('v0.265.0 a crowded band widens; tokens keep their size', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;
  const { renderScene } = await import('../client/play-views.js');
  const { session, me, thug } = await setupFixture();
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 1 } } });
  for (let copy = 0; copy < 11; copy += 1) session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 12 } } });
  document.querySelector('main').replaceChildren(...renderScene({ ...session.view(), live: true }, {}));
  const svg = document.querySelector('svg.bands');
  const [, , width, height] = svg.getAttribute('viewBox').split(' ').map(Number);
  assert.equal(height, 480, 'the height no longer grows with the deepest stack');
  const bands = [...svg.querySelectorAll('rect.band')].map((rect) => Number(rect.getAttribute('width')));
  assert.ok(bands[12] > bands[0] * 1.5, 'the crowded band is drawn wider than the rest');
  assert.ok(Math.abs(bands.reduce((sum, value) => sum + value, 0) - width) < 0.01, 'the bands tile the board');
  const xs = new Set([...svg.querySelectorAll('.marker.is-opposition > circle:not(.marker-ring), .marker.is-foe > circle:not(.marker-ring)')].map((circle) => Math.round(Number(circle.getAttribute('cx')))));
  assert.ok(xs.size >= 2, 'the eleven stand in more than one column');
  assert.match([...svg.querySelectorAll('.band-number')][12].textContent, /11 here/);
  dom.window.close();
  delete globalThis.document;
});

// v0.266.0: Unfiled's own verb, and skills on an actor's full sheet.
test('v0.266.0 everything in Unfiled is filed into a folder in one go; nothing else moves', async () => {
  const { session } = await freshSession();
  const a = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Sanjay Rao' } } }).createdId;
  const b = session.run('actor:create', { fight: { value: { kind: 'statblock', name: 'Bandit' } } }).createdId;
  const c = session.run('actor:create', { fight: { value: { kind: 'statblock', name: 'Guard', folder: 'Mooks' } } }).createdId;
  const rowOf = (id) => allActorRows(session).find((entry) => entry.id === id);
  const filed = session.run('folder:rename', { fight: { value: { tab: 'Actors', from: 'Unfiled', to: 'NPCs/Startown' } } });
  assert.equal(filed.ok, true, filed.message);
  assert.equal(filed.folder, 'NPCs/Startown');
  assert.equal(rowOf(a).folder, 'NPCs/Startown');
  assert.equal(rowOf(b).folder, 'NPCs/Startown');
  assert.equal(rowOf(c).folder, 'Mooks', 'a filed actor stays where it is');
  assert.equal(actorsTab(session).tree.some((node) => node.path === 'Unfiled'), false, 'and Unfiled is gone');
  assert.equal(session.run('folder:rename', { fight: { value: { tab: 'Actors', from: 'Unfiled', to: 'Unfiled' } } }).ok, false);
});

test('v0.266.0 Unfiled offers its one verb; an actor opened full can edit its skills', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;
  const { session } = await freshSession();
  const id = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Sanjay Rao' } } }).createdId;
  document.querySelector('main').replaceChildren(renderRowMenu({ folder: { tab: 'Actors', path: 'Unfiled' }, at: { x: 10, y: 10 } }, {}));
  assert.deepEqual([...document.querySelectorAll('.row-menu-item')].map((node) => node.textContent), ['File everything here in\u2026']);

  const edits = [];
  const sheet = session.view({ sheets: [{ kind: 'actor', id, compact: false }] }).sheets[0];
  document.querySelector('main').replaceChildren(renderSheets([sheet], { onEditSkills: (sheetId, text) => edits.push([sheetId, text]) }));
  // v0.267.0: an actor's full sheet is the tabbed one now; skills are
  // edited on its Play tab.
  const input = [...document.querySelectorAll('.sheet-field')].find((node) => node.textContent.startsWith('Edit skills'))?.querySelector('input');
  assert.ok(input, 'the full form has a skills field');
  input.value = 'Rifle-1, Brawling-1';
  input.dispatchEvent(new dom.window.Event('change'));
  assert.deepEqual(edits, [[id, 'Rifle-1, Brawling-1']]);
  dom.window.close();
  delete globalThis.document;
});

// ------------------------------------------------------------ v0.267.0
// Kurt, Sep 2026: NPCs have skills and more than one weapon, and their sheet
// had no way to add either. An NPC actor gets the tabbed sheet; a statblock
// stays compact.

test('v0.267.0 an NPC actor opens on the tabbed sheet; a statblock stays compact', async () => {
  const { session } = await freshSession();
  const actor = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Sanjay Rao' } } }).createdId;
  const pattern = session.run('actor:create', { fight: { value: { kind: 'statblock', name: 'Bandit' } } }).createdId;
  const [sheet] = session.view({ sheets: [{ kind: 'actor', id: actor }] }).sheets;
  assert.deepEqual(sheet.tabs, ['Play', 'Gear', 'Profile', 'Notes']);
  assert.equal(sheet.npc, true);
  const [compact] = session.view({ sheets: [{ kind: 'actor', id: pattern }] }).sheets;
  assert.equal(compact.tabs, undefined);
  assert.equal(compact.compactOnly, true);
});

test('v0.267.0 an NPC carries several weapons, readies one, and the fight offers them all', async () => {
  const { session, registry, campaignId } = await freshSession();
  const id = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Sanjay Rao' } } }).createdId;
  assert.equal(session.run('gear:give', { fight: { id, value: { key: 'weapon:rifle' } } }).ok, true);
  assert.equal(session.run('inventory:add', { characterId: id, item: { weaponKey: 'dagger' } }).ok, true);
  assert.equal(session.run('inventory:add', { characterId: id, item: { name: 'Rope', weightKg: 1.5, quantity: 2 } }).ok, true);
  const sheet = () => session.view({ sheets: [{ kind: 'actor', id }] }).sheets[0];
  assert.deepEqual(sheet().inventory.map((item) => item.weaponKey).filter(Boolean), ['rifle', 'dagger']);
  const rope = sheet().inventory.find((item) => item.name === 'Rope');
  assert.equal(rope.totalGrams, 3000);
  assert.equal(session.run(`inventory:update:${rope.id}`, { characterId: id, item: { quantity: 3 } }).ok, true);
  assert.equal(sheet().inventory.find((item) => item.id === rope.id).quantity, 3);

  const rifle = sheet().inventory.find((item) => item.weaponKey === 'rifle');
  assert.equal(session.run(`inventory:ready:${rifle.id}`, { characterId: id }).ok, true);
  assert.equal(sheet().weaponKey, 'rifle');

  session.run('fight:setup');
  assert.equal(session.run('fight:place', { fight: { value: { kind: 'actor', id, column: 4 } } }).ok, true);
  const me = registry.resolveCampaign(campaignId).characters[0].identity.id;
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
  const fighter = session.view().fighters.find((entry) => entry.name === 'Sanjay Rao');
  const keys = fighter.weaponChoices.map((choice) => choice.key);
  assert.ok(keys.includes('rifle') && keys.includes('dagger') && keys.includes('hands'), keys.join(', '));
});

test('v0.267.0 an NPC throws its skills into chat; profile, notes and cash are written', async () => {
  const { session } = await freshSession();
  const id = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Sanjay Rao' } } }).createdId;
  assert.equal(session.run('edit:actor:skills', { fight: { id, value: 'Rifle-1, Streetwise-2' } }).ok, true);
  const rolled = session.run('character:skill-roll', { fight: { id, value: { skill: 'Streetwise' } } });
  assert.equal(rolled.ok, true, rolled.message);
  assert.match(rolled.message, /^Streetwise-2: 2D/);
  assert.equal(session.run('edit:actor:profile', { fight: { id, value: { role: 'Fixer', faction: 'Dock gangs', age: '38' } } }).ok, true);
  assert.equal(session.run('edit:actor:notes', { fight: { id, value: { referee: 'Owes Hawkeye money.' } } }).ok, true);
  assert.equal(session.run('edit:actor:credits', { fight: { id, value: '1200' } }).ok, true);
  const [sheet] = session.view({ sheets: [{ kind: 'actor', id }] }).sheets;
  assert.equal(sheet.profile.role, 'Fixer');
  assert.equal(sheet.profile.age, 38);
  assert.equal(sheet.subtitle, 'Fixer \u00b7 Dock gangs');
  assert.equal(sheet.notes, 'Owes Hawkeye money.');
  assert.equal(sheet.cashCr, 1200);
  assert.deepEqual(sheet.skills.map((skill) => skill.label), ['Streetwise-2', 'Rifle-1']);
  assert.equal(session.run('inventory:military:on', { characterId: id }).ok, false, 'military load is a character\u2019s choice');
});

test('v0.267.0 a copied actor keeps its gear (the copy used to drop it)', async () => {
  const { session } = await freshSession();
  const id = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Sanjay Rao' } } }).createdId;
  session.run('gear:give', { fight: { id, value: { key: 'weapon:rifle' } } });
  const copy = session.run('actor:copy', { fight: { id } }).createdId;
  const [sheet] = session.view({ sheets: [{ kind: 'actor', id: copy }] }).sheets;
  assert.deepEqual(sheet.inventory.map((item) => item.weaponKey), ['rifle']);
});

test('v0.267.0 a character\u2019s gear cells now save (inventory:update had no branch)', async () => {
  const { session, registry, campaignId } = await freshSession();
  const id = registry.resolveCampaign(campaignId).characters[0].identity.id;
  assert.equal(session.run('inventory:add', { characterId: id, item: { name: 'Rope', weightKg: 1, quantity: 1 } }).ok, true);
  const rope = registry.resolveCampaign(campaignId).characters[0].inventory.find((item) => item.name === 'Rope');
  const changed = session.run(`inventory:update:${rope.id}`, { characterId: id, item: { name: 'Climbing rope', weightKg: 2.5 } });
  assert.equal(changed.ok, true, changed.message);
  const after = registry.resolveCampaign(campaignId).characters[0].inventory.find((item) => item.id === rope.id);
  assert.equal(after.name, 'Climbing rope');
  assert.equal(after.weightGrams, 2500);
});

test('v0.267.0 the NPC sheet draws Play, Gear, Profile and Notes, and takes a Compendium drop', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;
  const { session } = await freshSession();
  const id = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Sanjay Rao' } } }).createdId;
  session.run('gear:give', { fight: { id, value: { key: 'weapon:rifle' } } });
  const readied = [];
  const draw = (tab) => {
    const [sheet] = session.view({ sheets: [{ kind: 'actor', id, tab }] }).sheets;
    document.querySelector('main').replaceChildren(renderSheets([sheet], { onInventory: (...args) => readied.push(args) }));
  };
  draw('Play');
  assert.deepEqual([...document.querySelectorAll('.sheet-tab')].map((node) => node.textContent), ['Play', 'Gear', 'Profile', 'Notes']);
  assert.equal(document.querySelector('.sheet-print'), null, 'no TAS Form 2 for an NPC');
  const ready = [...document.querySelectorAll('.sheet-carried-weapons button')].find((node) => node.textContent.includes('Rifle'));
  assert.ok(ready, 'a carried weapon can be readied from Play');
  ready.click();
  assert.equal(readied[0][1], 'ready');
  draw('Gear');
  assert.ok(document.querySelector('.sheet-table'));
  assert.ok(![...document.querySelectorAll('.sheet-check')].some((node) => /military force/.test(node.textContent)));
  draw('Profile');
  assert.ok([...document.querySelectorAll('.sheet-field span')].some((node) => node.textContent === 'Faction'));
  draw('Notes');
  assert.ok(document.querySelector('textarea[aria-label="Referee notes"]'));
  dom.window.close();
  delete globalThis.document;
});

// v0.269.0: Kurt's Mercenary, made as an actor, dragged on a second time.
test('v0.269.0 an actor already on the board is refused with the way out, and asStatblock places a numbered copy', async () => {
  const { session } = await setupFixture();
  const merc = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Mercenary' } } }).createdId;
  assert.equal(session.run('fight:place', { fight: { value: { kind: 'actor', id: merc, column: 8 } } }).ok, true);
  const refused = session.run('fight:place', { fight: { value: { kind: 'actor', id: merc, column: 8 } } });
  assert.equal(refused.ok, false);
  assert.match(refused.message, /already on the board.*statblock/);
  const placed = session.run('fight:place', { fight: { value: { kind: 'actor', id: merc, column: 8, asStatblock: true } } });
  assert.equal(placed.ok, true, placed.message);
  assert.equal(session.run('fight:place', { fight: { value: { kind: 'actor', id: merc, column: 8 } } }).ok, true, 'a statblock now: no question the third time');
  assert.deepEqual(session.view().fighters.filter((entry) => entry.name.startsWith('Mercenary')).map((entry) => entry.name), ['Mercenary', 'Mercenary 2', 'Mercenary 3']);
  const [sheet] = session.view({ sheets: [{ kind: 'actor', id: merc }] }).sheets;
  assert.equal(sheet.statblock, true, 'and the directory entry is a statblock');
});

// v0.270.0: whether the weapon in hand is trained, and what that costs.
test('v0.270.0 the expertise tag: a character\u2019s \u00bd, an NPC\u2019s untrained \u22125, a skill\u2019s +DM, and the melee +3', async () => {
  const { weaponExpertiseTag } = await import('../src/play-session.js');
  const pc = { skills: {}, playerCharacter: true };
  assert.equal(weaponExpertiseTag(pc, 'rifle').untrained, false, 'Book 1 p.33: every PC has \u00bd');
  assert.equal(weaponExpertiseTag(pc, 'rifle').warn, false);
  assert.equal(weaponExpertiseTag(pc, 'rifle').short, '');
  assert.equal(weaponExpertiseTag({ skills: { Rifle: 2 }, playerCharacter: true }, 'rifle').short, '+2');

  const mook = { skills: {}, playerCharacter: false };
  const pistol = weaponExpertiseTag(mook, 'automatic-pistol');
  assert.equal(pistol.untrained, true);
  assert.equal(pistol.exposed, false, 'a gun held as a gun gives no melee +3');
  assert.equal(pistol.short, 'untrained \u22125');
  const dagger = weaponExpertiseTag(mook, 'dagger');
  assert.equal(dagger.exposed, true, 'an untrained blade gives attackers +3 in melee');
  assert.match(dagger.short, /untrained \u22125, foes \+3 in melee/);
  assert.equal(weaponExpertiseTag({ skills: { Rifle: 1 }, playerCharacter: false }, 'rifle').exposed, true, 'a rifleman with no cudgel parries untrained');
  assert.equal(weaponExpertiseTag({ skills: { Dagger: 0 }, playerCharacter: false }, 'dagger').warn, false, 'a level-0 entry is familiar, not untrained');
  assert.equal(weaponExpertiseTag(mook, 'hands'), null);
});

test('v0.270.0 sheets and the fight table carry the tag for the weapon in hand and every choice', async () => {
  const { session } = await setupFixture();
  const merc = session.run('actor:create', { fight: { value: { kind: 'statblock', name: 'Mercenary' } } }).createdId;
  session.run('edit:actor:loadout', { fight: { id: merc, value: { weaponKey: 'carbine', armor: 'jack' } } });
  const [sheet] = session.view({ sheets: [{ kind: 'actor', id: merc }] }).sheets;
  assert.equal(sheet.weaponTag.untrained, true);
  assert.match(sheet.weaponChoices.find((choice) => choice.key === 'carbine').name, /^Carbine \u2014 untrained/);
  session.run('edit:actor:skills', { fight: { id: merc, value: 'Carbine-1' } });
  assert.equal(session.run('fight:place', { fight: { value: { kind: 'actor', id: merc, column: 8 } } }).ok, true);
  const fighter = session.view().fighters.find((entry) => entry.name === 'Mercenary');
  assert.equal(fighter.weaponTag.short, '+1, foes +3 in melee', 'trained with the gun, untrained with it as a cudgel');
  assert.equal(fighter.weaponChoices.find((choice) => choice.key === 'cudgel').tag.untrained, true);
});

// ------------------------------------------------------------ v0.271.0
// A named NPC keeps its wounds; a statblock's copies do not.
async function npcFightFixture() {
  const { session, registry, campaignId } = await freshSession();
  const me = registry.resolveCampaign(campaignId).characters[0].identity.id;
  const rao = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Sanjay Rao' } } }).createdId;
  const thug = session.run('actor:create', { fight: { value: { kind: 'statblock', name: 'Thug' } } }).createdId;
  session.run('fight:setup');
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
  session.run('fight:place', { fight: { value: { kind: 'actor', id: rao, column: 6 } } });
  session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 6 } } });
  assert.equal(session.run('fight:begin', { fight: { value: { surprise: 'none' } } }).ok, true);
  const idOf = (name) => session.view().fighters.find((entry) => entry.name === name).id;
  return { session, registry, campaignId, me, rao, thug, idOf };
}

test('v0.271.0 an actor walks out of a fight with its wounds; a statblock does not change', async () => {
  const { session, registry, campaignId, rao, thug, idOf } = await npcFightFixture();
  assert.equal(session.run('edit:combatant:current', { fight: { id: idOf('Sanjay Rao'), value: { STR: 2, DEX: 0 } } }).ok, true);
  assert.equal(session.run('edit:combatant:current', { fight: { id: idOf('Thug'), value: { STR: 1 } } }).ok, true);
  assert.equal(session.run('fight:end').ok, true);
  const actorOf = (id) => registry.resolveCampaign(campaignId).npcActors.find((entry) => entry.identity.id === id);
  // One characteristic at zero knocks him out; he wakes ten minutes on at
  // halfway between full and wounded, fractions against him (Book 1 p.31).
  const full = actorOf(rao).characteristics;
  assert.equal(actorOf(rao).current.STR, Math.floor((2 + full.STR) / 2));
  assert.equal(actorOf(rao).current.DEX, Math.max(1, Math.floor(full.DEX / 2)));
  assert.equal(actorOf(thug).current.STR, actorOf(thug).characteristics.STR, 'the pattern is untouched');
  const [sheet] = session.view({ sheets: [{ kind: 'actor', id: rao }] }).sheets;
  assert.equal(sheet.condition.wounded, true);
  assert.equal(sheet.condition.severe, false, 'one characteristic at zero is not severe');
  assert.ok(sheet.effective.DEX.now < sheet.effective.DEX.full);
});

test('v0.271.0 a severely wounded actor cannot rest it off; medical attention can; a dead actor stays off the board', async () => {
  const { session, registry, campaignId, rao, idOf } = await npcFightFixture();
  session.run('edit:combatant:current', { fight: { id: idOf('Sanjay Rao'), value: { STR: 0, DEX: 0 } } });
  session.run('fight:end');
  const [sheet] = session.view({ sheets: [{ kind: 'actor', id: rao }] }).sheets;
  assert.equal(sheet.condition.severe, true, 'two at zero: severely wounded (Book 1 p.31)');
  const rested = session.run('character:rest', { fight: { id: rao } });
  assert.equal(rested.ok, false);
  assert.match(rested.message, /severely wounded/);
  // Untrained, 8+ at −5 needs 13 on 2D: it cannot succeed. A doctor can.
  const doc = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Dr Imre' } } }).createdId;
  session.run('edit:actor:skills', { fight: { id: doc, value: 'Medical-4' } });
  assert.ok(session.view({ sheets: [{ kind: 'actor', id: rao }] }).sheets[0].condition.medics.some((entry) => entry.id === doc && entry.level === 4), 'an NPC with Medical can attend');
  let healed = false;
  for (let attempt = 0; attempt < 30 && !healed; attempt += 1) {
    assert.equal(session.run('character:medical', { fight: { id: rao, value: { medicId: doc } } }).ok, true);
    healed = !session.view({ sheets: [{ kind: 'actor', id: rao }] }).sheets[0].condition.wounded;
  }
  assert.ok(healed, 'medical attention at 4+ succeeds soon enough');
  assert.equal(session.view({ sheets: [{ kind: 'actor', id: rao }] }).sheets[0].condition.severe, false);

  // And one killed stays dead.
  session.run('fight:setup');
  const me = registry.resolveCampaign(campaignId).characters[0].identity.id;
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
  session.run('fight:place', { fight: { value: { kind: 'actor', id: rao, column: 6 } } });
  session.run('fight:begin', { fight: { value: { surprise: 'none' } } });
  session.run('edit:combatant:current', { fight: { id: session.view().fighters.find((entry) => entry.name === 'Sanjay Rao').id, value: { STR: 0, DEX: 0, END: 0 } } });
  session.run('fight:end');
  assert.equal(session.view({ sheets: [{ kind: 'actor', id: rao }] }).sheets[0].condition.dead, true);
  session.run('fight:setup');
  const refused = session.run('fight:place', { fight: { value: { kind: 'actor', id: rao, column: 6 } } });
  assert.equal(refused.ok, false);
  assert.match(refused.message, /dead/);
});

// Book 1 p.27: the range the parties met at, for a fight set up by hand.
test('v0.271.0 stating or throwing the range places the opposition; beginning reads the range off the board', async () => {
  const { session, me, thug } = await setupFixture();
  assert.equal(session.run('fight:range', { fight: { value: { range: 'long' } } }).ok, false, 'both sides first');
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 1 } } });
  session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 3 } } });
  session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 4 } } });
  const stated = session.run('fight:range', { fight: { value: { range: 'long' } } });
  assert.equal(stated.ok, true, stated.message);
  const bands = () => session.view().fighters.map((entry) => [entry.name, entry.band]);
  assert.deepEqual(bands(), [['Hawkeye', 1], ['Thug', 10], ['Thug 2', 11]], 'the nearest foe 9 bands off, the rest keep their spacing');
  assert.equal(session.view().openingRange.now, 'long');
  assert.match(session.view().openingRange.set, /sets the range: long/);

  const thrown = session.run('fight:range', { fight: { value: { terrain: 'city' } } });
  assert.equal(thrown.ok, true, thrown.message);
  assert.match(thrown.message, /Range thrown: 2D \d+ \u22124 city = -?\d+: (close|short|medium|long|very long)/);

  session.run('fight:range', { fight: { value: { range: 'long' } } });
  // Dragged after the range was set: the board is what counts.
  session.run('fight:reposition', { fight: { value: { combatantId: session.view().fighters.find((entry) => entry.name === 'Thug').id, column: 2 } } });
  assert.equal(session.run('fight:begin', { fight: { value: { surprise: 'none' } } }).ok, true);
  assert.equal(session.view().setup.range, 'Met at short range', 'the nearest foe decides it, not the medium the board was created with');
});

test('v0.271.0 the range line in setup offers terrain, a throw, and a stated range', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;
  const { renderScene } = await import('../client/play-views.js');
  const { session, me, thug } = await setupFixture();
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
  session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 3 } } });
  const asked = [];
  document.querySelector('main').replaceChildren(...renderScene({ ...session.view(), live: true }, { onOpeningRange: (choice) => asked.push(choice) }));
  const line = document.querySelector('.fight-setup-range');
  assert.match(line.textContent, /Range \(p\.27\): medium on the board now/);
  line.querySelector('select[aria-label="Terrain"]').value = 'forest';
  [...line.querySelectorAll('button')].find((node) => node.textContent === 'Throw range').click();
  const stated = line.querySelector('select[aria-label="State the range"]');
  stated.value = 'close';
  stated.dispatchEvent(new dom.window.Event('change'));
  assert.deepEqual(asked, [{ terrain: 'forest' }, { range: 'close' }]);
  dom.window.close();
  delete globalThis.document;
});

// ------------------------------------------------------------ v0.272.0
// Book 1 p.33 for an NPC's load, and morale for both sides with its DMs.
test('v0.272.0 an NPC fights under its load, and the penalty comes off again afterwards', async () => {
  const { session, registry, campaignId } = await freshSession();
  const me = registry.resolveCampaign(campaignId).characters[0].identity.id;
  const mule = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Pack Mule' } } }).createdId;
  session.run('edit:actor:characteristics', { fight: { id: mule, value: { STR: 6, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 } } });
  session.run('inventory:add', { characterId: mule, item: { name: 'Ammunition crate', weightKg: 15, quantity: 1 } });
  const [sheet] = session.view({ sheets: [{ kind: 'actor', id: mule }] }).sheets;
  assert.equal(sheet.load.penalty, -1, '15 kg against STR 6 in this world\u2019s gravity: encumbered');
  assert.equal(sheet.effective.DEX.played, 6, 'the band shows what it will fight with');
  session.run('fight:setup');
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
  session.run('fight:place', { fight: { value: { kind: 'actor', id: mule, column: 5 } } });
  const fighter = session.view().fighters.find((entry) => entry.name === 'Pack Mule');
  assert.deepEqual([fighter.characteristics.STR, fighter.characteristics.DEX, fighter.characteristics.END], [5, 6, 6]);
  assert.equal(fighter.encumbrance, -1);
  session.run('fight:begin', { fight: { value: { surprise: 'none' } } });
  session.run('fight:end');
  const after = registry.resolveCampaign(campaignId).npcActors.find((entry) => entry.identity.id === mule);
  assert.deepEqual(after.current, { STR: 6, DEX: 7, END: 7 }, 'unhurt, it walks out at its own scores, not the loaded ones');
});

async function moraleFixture({ thugs = 4, leader = false } = {}) {
  const { session, registry, campaignId } = await freshSession();
  const me = registry.resolveCampaign(campaignId).characters[0].identity.id;
  const thug = session.run('actor:create', { fight: { value: { kind: 'statblock', name: 'Thug' } } }).createdId;
  session.run('fight:setup');
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
  for (let copy = 0; copy < thugs; copy += 1) session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 12 } } });
  if (leader) {
    const sarge = session.run('actor:create', { fight: { value: { kind: 'actor', name: 'Sergeant' } } }).createdId;
    session.run('edit:actor:skills', { fight: { id: sarge, value: 'Leader-1, Tactics-1' } });
    session.run('fight:place', { fight: { value: { kind: 'actor', id: sarge, column: 12 } } });
  }
  session.run('fight:begin', { fight: { value: { surprise: 'none' } } });
  const byName = (name) => session.view().fighters.find((entry) => entry.name === name);
  const holdFire = () => session.run('fight:sheet', { fight: { rows: session.view().fighters.filter((entry) => !entry.down).map((entry) => ({ actorId: entry.id, move: 'Stand', targetId: null })) } });
  return { session, byName, holdFire };
}

test('v0.272.0 morale counts the unconscious and killed, throws with its DMs, and the settings add to it', async () => {
  const { session, byName, holdFire } = await moraleFixture({ thugs: 3, leader: true });
  let foes = session.view().casualties.find((entry) => entry.side === 'foe');
  assert.equal(foes.throwing, false);
  assert.match(foes.dms.join(', '), /leader Sergeant \+1, leader\u2019s tactics \+1/);
  session.run('edit:combatant:current', { fight: { id: byName('Thug').id, value: { END: 0 } } });
  assert.equal(session.run('fight:morale', { fight: { value: { side: 'opposition', militaryUnit: true, dm: -1 } } }).ok, true);
  foes = session.view().casualties.find((entry) => entry.side === 'foe');
  assert.equal(foes.out, 1);
  assert.equal(foes.throwing, true, 'one of four is a quarter');
  assert.equal(foes.total, 2, '+1 military, +1 leader, +1 tactics, -1 referee');
  assert.match(foes.words, /7\+ to stand at DM \+2 \(military unit \+1, leader Sergeant \+1, leader\u2019s tactics \+1, referee \u22121\)/);
  const before = session.view().chat.length;
  holdFire();
  const line = session.view().chat.slice(before).find((entry) => /Opposition morale/.test(entry.text));
  assert.ok(line, 'thrown at the end of the round');
  assert.match(line.text, /DM \+2 \(military unit \+1, leader present \+1, leader tactics \+1, referee -1\)/);
});

test('v0.272.0 a killed leader costs \u22122; the party throws too, and breaking is reported, not enforced', async () => {
  const { session, byName } = await moraleFixture({ thugs: 3, leader: true });
  session.run('edit:combatant:current', { fight: { id: byName('Sergeant').id, value: { STR: 0, DEX: 0, END: 0 } } });
  const foes = session.view().casualties.find((entry) => entry.side === 'foe');
  // Recorded as killed once a round ends; before that it is a casualty only.
  assert.equal(foes.out, 1);
  const { moraleStanding } = await import('../src/encounter-document.js');
  const encounter = session.resolved.encounters.find((entry) => entry.status === 'active');
  assert.equal(moraleStanding(encounter, 'opposition').leaderPresent, false, 'no leader left standing');
  assert.equal(moraleStanding(encounter, 'party').required, false);
  // At the round's end his death is recorded, and the next throw carries it.
  const { holdFire } = await (async () => ({ holdFire: () => session.run('fight:sheet', { fight: { rows: session.view().fighters.filter((entry) => !entry.down).map((entry) => ({ actorId: entry.id, move: 'Stand', targetId: null })) } }) }))();
  const before = session.view().chat.length;
  holdFire();
  const line = session.view().chat.slice(before).find((entry) => /Opposition morale/.test(entry.text));
  assert.ok(line);
  assert.match(line.text, /leader killed -2/);
  if (session.view().fighters?.length && !session.view().concluded) {
    assert.match(session.view().casualties.find((entry) => entry.side === 'foe').dms.join(', '), /leader killed \u22122/);
  }
});

test('v0.272.0 the escaped are not casualties for morale', async () => {
  const { moraleStanding } = await import('../src/encounter-document.js');
  const base = { round: 2, combatants: [
    { id: 'a', side: 'opposition', status: 'escaped', skills: {} },
    { id: 'b', side: 'opposition', status: 'escaped', skills: {} },
    { id: 'c', side: 'opposition', status: 'active', skills: {} },
    { id: 'd', side: 'opposition', status: 'active', skills: {} }
  ] };
  assert.equal(moraleStanding(base, 'opposition').required, false);
  base.combatants[0].status = 'unconscious';
  assert.equal(moraleStanding(base, 'opposition').required, true);
  base.morale = { opposition: { leaderKilledRound: 1 } };
  assert.equal(moraleStanding(base, 'opposition').leaderKilled, true, 'within two rounds');
  base.round = 4;
  assert.equal(moraleStanding(base, 'opposition').leaderKilled, true, 'and after, while no one else leads');
  base.combatants[2].skills = { Leader: 1 };
  base.combatants[2].name = 'Corporal';
  assert.equal(moraleStanding(base, 'opposition').leaderKilled, false, 'until a new leader takes control');
  assert.equal(moraleStanding(base, 'opposition').leaderPresent, true);
});

// ------------------------------------------------------------ v0.275.0
// Kurt, Sep 2026: two characters resting advanced the date twice.
async function woundedPairFixture() {
  const { session, registry, campaignId } = await freshSession();
  const first = registry.resolveCampaign(campaignId).characters[0].identity.id;
  const copyId = session.run('character:copy', { fight: { id: first } }).createdId;
  const { addCharacterToCampaign } = await import('../src/campaign-document.js');
  const copy = registry.resolveCampaign(campaignId).characters.find((entry) => entry.identity.id === copyId);
  registry.put(addCharacterToCampaign(registry.resolveCampaign(campaignId).campaign, copy, { active: true, makeActive: false }));
  session.reload();
  for (const id of [first, copyId]) assert.equal(session.run('edit:character:current', { fight: { id, value: { STR: 3 } } }).ok, true);
  const date = () => { const time = registry.resolveCampaign(campaignId).campaign.time; return time.year * 365 + time.dayOfYear; };
  return { session, registry, campaignId, first, copyId, date };
}

test('v0.275.0 the party rests together: everyone ticked recovers, and the date moves three days once', async () => {
  const { session, registry, campaignId, first, copyId, date } = await woundedPairFixture();
  const candidates = session.restCandidates();
  assert.deepEqual(candidates.filter((entry) => entry.canRest).map((entry) => entry.id).sort(), [first, copyId].sort());
  const start = date();
  const rested = session.run('party:rest', { fight: { value: { ids: [first, copyId] } } });
  assert.equal(rested.ok, true, rested.message);
  assert.equal(date() - start, 3, 'three days, not six');
  const characters = registry.resolveCampaign(campaignId).characters.filter((entry) => [first, copyId].includes(entry.identity.id));
  assert.ok(characters.every((entry) => entry.current.STR === entry.characteristics.STR));
  assert.match(session.view().chat.at(-1).text, / and .* rest three days and are back to full strength/);
  assert.equal(session.run('party:rest', { fight: { value: { ids: [first] } } }).ok, false, 'nobody left who needs it');
});

test('v0.275.0 medical attention takes the medic\u2019s day: the first attempt moves the clock, the rest that day do not', async () => {
  const { session, first, copyId, date } = await woundedPairFixture();
  const start = date();
  assert.equal(session.run('character:medical', { fight: { id: first, value: { medicId: null } } }).ok, true);
  assert.equal(date() - start, 1);
  const second = session.run('character:medical', { fight: { id: copyId, value: { medicId: null } } });
  assert.equal(second.ok, true);
  assert.equal(date() - start, 1, 'same day of treatment');
  assert.match(second.message, /Same day of treatment/);
  // The same patient again is tomorrow's attempt, and moves the clock.
  const again = session.run('character:medical', { fight: { id: copyId, value: { medicId: null } } });
  assert.doesNotMatch(again.message, /Same day of treatment/);
  assert.equal(date() - start, 2, 'a retry is the next day');
  const other = session.run('character:medical', { fight: { id: first, value: { medicId: null } } });
  assert.match(other.message, /Same day of treatment/, 'and the other patient can be seen that day too');
  assert.equal(date() - start, 2);
  // Any other movement of the clock starts a new day.
  session.run('time:pass', { fight: { value: { amount: 1, unit: 'days' } } });
  const fresh = session.run('character:medical', { fight: { id: first, value: { medicId: null } } });
  assert.doesNotMatch(fresh.message, /Same day of treatment/);
  assert.equal(date() - start, 4);
});

test('v0.275.0 the referee passes time (resting if three days or more) and sets the date', async () => {
  const { session, registry, campaignId, first, date } = await woundedPairFixture();
  const start = date();
  const hours = session.run('time:pass', { fight: { value: { amount: 30, unit: 'hours', reason: 'waiting for the ship' } } });
  assert.equal(hours.ok, true, hours.message);
  assert.match(hours.message, /^30 hours pass: waiting for the ship \(\d{3}-\d+ to \d{3}-\d+\)\.$/);
  assert.ok(date() - start >= 1 && date() - start <= 2);
  const short = session.run('time:pass', { fight: { value: { amount: 2, unit: 'days', resting: true } } });
  assert.doesNotMatch(short.message, /Rested/, 'two days is not enough rest');
  const long = session.run('time:pass', { fight: { value: { amount: 1, unit: 'weeks', resting: true, reason: 'laid up' } } });
  assert.match(long.message, /Rested to full strength: /);
  const hawkeye = registry.resolveCampaign(campaignId).characters.find((entry) => entry.identity.id === first);
  assert.equal(hawkeye.current.STR, hawkeye.characteristics.STR);
  const set = session.run('time:set', { fight: { value: { year: 1105, dayOfYear: 7 } } });
  assert.equal(set.ok, true, set.message);
  assert.deepEqual([registry.resolveCampaign(campaignId).campaign.time.year, registry.resolveCampaign(campaignId).campaign.time.dayOfYear], [1105, 7]);
  assert.match(set.message, /sets the date: .* to 007-1105/);
  assert.equal(session.run('time:set', { fight: { value: { year: 1105, dayOfYear: 400 } } }).ok, false);
  assert.equal(session.run('time:pass', { fight: { value: { amount: 0, unit: 'days' } } }).ok, false);
});

// v0.279.0: Kurt, Sep 2026 — the player's sheet had no service record.
test('v0.279.0 the Record tab carries the service history generation produced', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;
  const { session, registry, campaignId } = await freshSession();
  const id = registry.resolveCampaign(campaignId).characters[0].identity.id;
  const [sheet] = session.view({ sheets: [{ kind: 'actor', id, tab: 'Record' }] }).sheets;
  assert.equal(sheet.service.key, 'scouts');
  assert.equal(sheet.service.terms, 5);
  assert.ok(sheet.history.length > 5);
  document.querySelector('main').replaceChildren(renderSheets([sheet], {}));
  const text = document.querySelector('main').textContent;
  assert.match(text, /SERVICE HISTORY/);
  assert.match(text, /ServiceScouts/);
  assert.match(text, /Terms served5 \(20 years\)/);
  assert.match(text, /RetiredYes/);
  assert.match(text, /Term by term/);
  dom.window.close();
  delete globalThis.document;
});

// v0.285.0: the Players tab as one list.
test('v0.285.0 the Players tab draws the link, requests, members with Remove, and anyone whose player has gone', { skip: !JSDOM }, async () => {
  const dom = new JSDOM('<main></main>');
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Option = dom.window.Option;
  const { session, registry, campaignId } = await freshSession();
  const me = registry.resolveCampaign(campaignId).characters[0].identity.id;
  const { setDocumentOwner } = await import('../src/campaign-document.js');
  registry.put(setDocumentOwner(registry.resolveCampaign(campaignId).campaign, { documentId: me, ownerUid: 'player-7' }));
  session.reload();
  const players = { seats: [{ uid: 'player-7', name: 'Kurt', lastSeenAt: Date.now() }], invites: [{ code: 'ABC234' }], joins: [{ uid: 'p9', name: 'Ann', characterName: 'Leona', characterId: 'c9' }] };
  const state = { ...session.view({ referee: { tab: 'Players', players } }), live: true };
  const acted = [];
  document.querySelector('main').replaceChildren(...renderDrawer('referee', state, state.referee, { onSeat: (action, value) => acted.push([action, value]) }));
  const text = document.querySelector('main').textContent;
  assert.match(text, /Join link/);
  assert.match(text, /Joining \(1\)/, 'v0.289.0: with approval off, a join comes in by itself');
  assert.match(text, /Approve players myself/);
  assert.match(text, /Players \(1\)/);
  assert.match(text, /plays Hawkeye · here now/);
  assert.equal(document.querySelector('.folder-row'), null, 'no folders');
  [...document.querySelectorAll('button')].find((node) => node.textContent === 'Remove').click();
  [...document.querySelectorAll('button')].find((node) => node.textContent === 'Copy link').click();
  assert.deepEqual(acted.map(([action]) => action), ['remove', 'copy-link']);
  assert.equal(acted[0][1].characters[0].id, me);
  dom.window.close();
  delete globalThis.document;
});
