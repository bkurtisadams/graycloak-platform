// layout-vector-targeting.test.mjs — T on a hovered ship, in a browser.
//
// v0.190.0. Hover an enemy on the vector plot and press T: the selected ship's
// turrets are aimed at it, a dashed ring surrounds it, and the turret chips in
// the sidebar say the same. Shift+T clears. The rules for which turrets and how
// many targets are unit-tested in ship-targeting.test.mjs; this checks the key,
// the pointer and the drawing agree in a real page.

import test from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, serveStagedClient, shipCombatStorage, openCampaign, settle } from './support/layout-browser.mjs';

const CENTRE_TOLERANCE = 1.5;

function readTargets() {
  const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  const svg = document.querySelector('#ship-vector-workspace svg.ship-vector-svg');
  const select = document.querySelector('#ship-vector-workspace select[aria-label="Selected ship"]');
  return {
    phase: document.querySelector('#ship-combat-rail .ship-phase-step.now')?.title,
    selected: select?.value,
    names: Object.fromEntries([...select.options].map((option) => [option.value, option.textContent])),
    ships: [...svg.querySelectorAll('g.vector-ship')].map((group) => ({
      id: group.dataset.shipId,
      token: centre(group.querySelector('.vector-ship-token').getBoundingClientRect()),
      colour: getComputedStyle(group.querySelector('.vector-ship-token')).color
    })),
    rings: [...svg.querySelectorAll('.vector-ship-target')].map((ring) => centre(ring.getBoundingClientRect())),
    // Turret pickers on the sidebar cards that are aimed at something.
    aimed: [...document.querySelectorAll('#ship-combat-tracker select.ship-card-turret-target')].filter((picker) => picker.value).map((picker) => picker.value),
    status: document.querySelector('#status, .status-line, [role="status"]')?.textContent ?? ''
  };
}

const launched = await launchBrowser();

test('T on a hovered ship aims the selected ship\u2019s turrets at it', { skip: launched.skip ?? false }, async (t) => {
  const { browser } = launched;
  const server = await serveStagedClient();
  const storage = await shipCombatStorage();
  t.after(async () => { await browser.close(); await server.close(); });

  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  const errors = await openCampaign(page, server.origin, storage);
  await page.waitForSelector('#ship-vector-workspace g.vector-ship');
  await settle(page);
  const group = (id) => page.locator(`#ship-vector-workspace g.vector-ship[data-ship-id="${id}"]`);

  const start = await page.evaluate(readTargets);
  const shooter = start.selected;                       // the intruder that moves first
  const target = start.ships.find((ship) => ship.id !== shooter).id;

  await t.test('the two sides are drawn in different colours', () => {
    assert.deepEqual(errors, []);
    const colours = new Set(start.ships.map((ship) => ship.colour));
    assert.equal(colours.size, 2, `intruder and native share a colour: ${[...colours].join(', ')}`);
  });

  await t.test('T outside a fire phase refuses and aims nothing', async () => {
    await group(target).hover();
    await page.keyboard.press('t');
    await settle(page);
    const now = await page.evaluate(readTargets);
    assert.equal(now.rings.length, 0);
    assert.equal(now.aimed.length, 0);
  });

  // Phase B: laser fire.
  await page.locator('#ship-verb-next').click();
  await page.waitForFunction(() => /Laser Fire/.test(document.querySelector('#ship-combat-rail .ship-phase-step.now')?.title ?? ''));
  await settle(page);
  await page.selectOption('#ship-vector-workspace select[aria-label="Selected ship"]', shooter);
  await settle(page);

  await t.test('in laser fire, T rings the hovered ship and aims the turrets', async () => {
    await group(target).hover();
    await page.keyboard.press('t');
    await settle(page);
    const now = await page.evaluate(readTargets);
    assert.equal(now.rings.length, 1, 'one target ring');
    const token = now.ships.find((ship) => ship.id === target).token;
    assert.ok(Math.hypot(now.rings[0].x - token.x, now.rings[0].y - token.y) <= CENTRE_TOLERANCE, 'the ring is on the hovered ship');
    assert.ok(now.aimed.length >= 1, 'the sidebar turret pickers show the allocation');
    assert.ok(now.aimed.every((id) => id === target), 'without Multi-Target every aimed turret shares the target');
    assert.equal((await page.locator('#ship-verb-fire').isDisabled()), false, 'FIRE is live once a turret is aimed');
  });

  await t.test('T with nothing hovered aims nothing new', async () => {
    const before = (await page.evaluate(readTargets)).aimed;
    await page.mouse.move(5, 5);
    await page.keyboard.press('t');
    await settle(page);
    assert.deepEqual((await page.evaluate(readTargets)).aimed, before);
  });

  await t.test('Shift+T clears the ship\u2019s targets and its ring', async () => {
    await group(target).hover();
    await page.keyboard.press('Shift+T');
    await settle(page);
    const now = await page.evaluate(readTargets);
    assert.equal(now.rings.length, 0);
    assert.equal(now.aimed.length, 0);
    assert.equal(await page.locator('#ship-verb-fire').isDisabled(), true);
  });

  await t.test('T typed into a field is text, not a target', async () => {
    // Any visible text field will do (the sidebar's pickers sit in a collapsed
    // drawer and cannot take focus); the guard is on the element type.
    await group(target).hover();
    await page.evaluate(() => {
      const probe = Object.assign(document.createElement('input'), { id: 'layout-probe', type: 'text' });
      Object.assign(probe.style, { position: 'fixed', left: '2px', bottom: '2px', zIndex: 99999 });
      document.body.append(probe);
    });
    await page.locator('#layout-probe').focus();
    await page.keyboard.press('t');
    await settle(page);
    assert.equal((await page.evaluate(readTargets)).rings.length, 0);
    assert.equal(await page.locator('#layout-probe').inputValue(), 't');
  });

  await context.close();
});
