// layout-vector-selection.test.mjs — which ship is selected, read off the plot.
//
// v0.189.0. Selecting a ship on the vector plot used to grow its token from 5px
// to 7px and bold its name, and nothing else; with three ships there was no way
// to tell which one you were giving orders to (Kurt). The plot now draws the
// gold corner brackets every Graycloak board uses for selection, a fainter set
// for the ship under the pointer, and outlines the same ship's card in the
// sidebar. jsdom cannot say where any of that lands, so this runs in a browser.

import test from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, serveStagedClient, shipCombatStorage, openCampaign, settle } from './support/layout-browser.mjs';

const CENTRE_TOLERANCE = 1.5; // px between a mark's centre and its token's

function readPlot() {
  const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, left: r.left, right: r.right, top: r.top, bottom: r.bottom });
  const svg = document.querySelector('#ship-vector-workspace svg.ship-vector-svg');
  const ships = [...svg.querySelectorAll('g.vector-ship')].map((group) => ({
    id: group.dataset.shipId,
    token: centre(group.querySelector('.vector-ship-token').getBoundingClientRect())
  }));
  const marks = (selector) => [...svg.querySelectorAll(selector)].map((mark) => centre(mark.getBoundingClientRect()));
  const card = [...document.querySelectorAll('#ship-combat-tracker .ship-data-card-frame.is-selected')]
    .map((frame) => frame.closest('details')?.querySelector('.encounter-tracker-name')?.textContent ?? '');
  return {
    ships,
    selected: marks('.vector-ship-selected'),
    hovered: marks('.vector-ship-hover.is-hovered'),
    dropdown: document.querySelector('#ship-vector-workspace select[aria-label="Selected ship"]')?.value,
    names: Object.fromEntries([...document.querySelectorAll('#ship-vector-workspace select[aria-label="Selected ship"] option')].map((o) => [o.value, o.textContent])),
    card
  };
}

// The mark surrounds its token and is centred on it.
function surrounds(mark, token) {
  const faults = [];
  if (Math.hypot(mark.x - token.x, mark.y - token.y) > CENTRE_TOLERANCE) faults.push(`centre is ${Math.hypot(mark.x - token.x, mark.y - token.y).toFixed(1)}px off the token`);
  if (mark.left > token.left || mark.right < token.right || mark.top > token.top || mark.bottom < token.bottom) faults.push('does not enclose the token');
  return faults;
}

const launched = await launchBrowser();

test('the selected and hovered ship are marked on the vector plot', { skip: launched.skip ?? false }, async (t) => {
  const { browser } = launched;
  const server = await serveStagedClient();
  const storage = await shipCombatStorage();
  t.after(async () => { await browser.close(); await server.close(); });

  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  const errors = await openCampaign(page, server.origin, storage);
  await page.waitForSelector('#ship-vector-workspace g.vector-ship');
  await settle(page);
  const hit = (id) => page.locator(`#ship-vector-workspace g.vector-ship[data-ship-id="${id}"]`);

  const first = await page.evaluate(readPlot);
  assert.ok(first.ships.length >= 2, 'the fixture has at least two ships');

  await t.test('exactly one ship is marked selected, on load', () => {
    assert.deepEqual(errors, []);
    assert.equal(first.selected.length, 1);
    const ship = first.ships.find((entry) => entry.id === first.dropdown);
    assert.ok(ship, 'the dropdown names a ship on the plot');
    assert.deepEqual(surrounds(first.selected[0], ship.token), []);
  });

  for (const ship of first.ships) {
    await t.test(`clicking ${ship.id} moves the brackets, the dropdown and the card outline to it`, async () => {
      await hit(ship.id).click();
      await page.waitForFunction((id) => document.querySelector('#ship-vector-workspace select[aria-label="Selected ship"]')?.value === id, ship.id);
      await settle(page);
      const now = await page.evaluate(readPlot);
      const token = now.ships.find((entry) => entry.id === ship.id).token;
      assert.equal(now.selected.length, 1, 'one set of brackets');
      assert.deepEqual(surrounds(now.selected[0], token), []);
      assert.equal(now.card.length, 1, 'one card outlined in the sidebar');
      assert.ok(now.card[0].includes(now.names[ship.id].toUpperCase()), `the outlined card is ${now.names[ship.id]}'s (got "${now.card[0]}")`);
    });
  }

  await t.test('the dropdown moves the brackets too', async () => {
    const current = (await page.evaluate(readPlot)).dropdown;
    const other = first.ships.find((entry) => entry.id !== current);
    await page.selectOption('#ship-vector-workspace select[aria-label="Selected ship"]', other.id);
    await settle(page);
    const now = await page.evaluate(readPlot);
    assert.deepEqual(surrounds(now.selected[0], now.ships.find((entry) => entry.id === other.id).token), []);
  });

  await t.test('hovering another ship marks it faintly, and leaving clears it', async () => {
    const before = await page.evaluate(readPlot);
    const other = before.ships.find((entry) => entry.id !== before.dropdown);
    await hit(other.id).hover();
    await settle(page);
    const over = await page.evaluate(readPlot);
    assert.equal(over.hovered.length, 1, 'one hover mark');
    assert.deepEqual(surrounds(over.hovered[0], over.ships.find((entry) => entry.id === other.id).token), []);
    assert.equal(over.selected.length, 1, 'hover does not change the selection');
    await page.mouse.move(5, 5);
    await settle(page);
    assert.equal((await page.evaluate(readPlot)).hovered.length, 0);
    // The selected ship itself shows no hover mark over its brackets.
    const selectedId = over.dropdown;
    await hit(selectedId).hover();
    await settle(page);
    assert.equal((await page.evaluate(readPlot)).hovered.length, 0);
    await page.mouse.move(5, 5);
  });

  await t.test('the brackets stay on the token and keep their size through zoom', async () => {
    const before = await page.evaluate(readPlot);
    const zoomIn = page.locator('#ship-vector-workspace button[aria-label="Zoom in"]');
    for (let i = 0; i < 3; i += 1) await zoomIn.click();
    await settle(page);
    const zoomed = await page.evaluate(readPlot);
    const token = zoomed.ships.find((entry) => entry.id === zoomed.dropdown).token;
    assert.deepEqual(surrounds(zoomed.selected[0], token), []);
    const ratio = zoomed.selected[0].w / before.selected[0].w;
    assert.ok(Math.abs(ratio - 1) < 0.1, `bracket width changed by ${((ratio - 1) * 100).toFixed(0)}% on zoom`);
    await page.locator('#ship-vector-workspace button[aria-label="Fit the whole plot"]').click();
  });

  await t.test('selecting a ship does not plot a thrust endpoint', async () => {
    const fields = () => page.evaluate(() => [...document.querySelectorAll('#ship-vector-workspace input[type="number"]')].map((input) => input.value));
    const before = await fields();
    const ship = (await page.evaluate(readPlot)).ships.find((entry) => entry.id !== first.dropdown) ?? first.ships[0];
    await hit(ship.id).click();
    await hit(first.dropdown).click();
    await settle(page);
    assert.deepEqual(await fields(), before);
  });

  await t.test('clicking inside the reachable area plots an endpoint', async () => {
    // The ship that may move this phase is the one selected on load.
    await page.selectOption('#ship-vector-workspace select[aria-label="Selected ship"]', first.dropdown);
    await settle(page);
    const point = await page.evaluate(() => {
      const reach = document.querySelector('#ship-vector-workspace .vector-envelope');
      if (!reach) return null;
      const r = reach.getBoundingClientRect();
      // Two thirds of the way from the centre towards the top-left, clear of
      // the tokens, which sit on the centre line in this fixture.
      return { x: r.left + r.width / 2 - r.width / 5, y: r.top + r.height / 2 - r.height / 5 };
    });
    assert.ok(point, 'the moving ship has a reachable area drawn');
    const fields = () => page.evaluate(() => [...document.querySelectorAll('#ship-vector-workspace input[type="number"]')].map((input) => input.value));
    const before = await fields();
    await page.mouse.click(point.x, point.y);
    await settle(page);
    assert.notDeepEqual(await fields(), before, 'the thrust fields took the plotted point');
  });

  await context.close();
});
