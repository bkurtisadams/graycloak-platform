// layout-ship-strip.test.mjs — the ship combat strip, measured in a browser.
//
// v1.278.00. The turn strip over the vector plot is meant to work like the
// BATTLESYSTEM board's rail (battlesystem-board.html v0.60.2-v0.60.5): one
// column plan shared by the phase cells and the verbs, every verb in a fixed
// slot under its own phase, nothing moving as the turn advances, and a narrow
// window scrolling the lane rather than wrapping it. None of that is visible
// to jsdom, so none of it was ever tested. This file plays one full turn of a
// vector fight (both sides, A to E) at several window sizes and checks the
// geometry at every phase.
//
// Assertions compare elements with each other ("these edges agree", "this did
// not move") rather than pinning pixel values, so fonts and browser versions
// on different machines do not produce false failures.
//
// v0.188.0: the checks that v1.278.00 shipped as todo for the strip rework are
// ordinary tests now. A layout check that fails is a failure, not a note.
//
// WINDOW SIZE IS NOT A SETTING (Kurt 2026-09-16). The strip has one layout,
// the same at any window width; a window too narrow for it scrolls the lane
// left and right, as the BATTLESYSTEM board's phase row does. The sizes below
// are not anyone's screen: one wide, one ordinary, one far narrower than the
// strip on any machine, so the scrolling path is really exercised (at 900px it
// fitted on Kurt's Windows fonts and the check passed without scrolling). Compare across them, never
// tune for them. TRAVELLER_LAYOUT_VIEWPORTS=1920x1080,700x700 overrides.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { root, launchBrowser, serveStagedClient, shipCombatStorage, openCampaign, settle } from './support/layout-browser.mjs';

const MOVE_TOLERANCE = 1;   // px a thing may shift between phases (sub-pixel rounding)
const ALIGN_TOLERANCE = 2;  // px a verb column may sit off its phase cell

const VIEWPORTS = (process.env.TRAVELLER_LAYOUT_VIEWPORTS ?? '1920x1080,1366x768,700x700')
  .split(',').map((entry) => entry.trim()).filter(Boolean)
  .map((entry) => { const [width, height] = entry.split('x').map(Number); return { width, height, name: `${width}x${height}` }; });

// What the strip looks like right now, in viewport pixels.
function measureStrip() {
  // Horizontal positions are taken from the lane, which scrolls as a whole:
  // clicking a verb scrolls it into view, and that is not the layout moving.
  const lane = document.querySelector('#ship-combat-strip .ship-strip-lane');
  const origin = lane ? lane.getBoundingClientRect().left : 0;
  const box = (node) => {
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return { left: r.left - origin, right: r.right - origin, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  };
  const viewportBox = (node) => {
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  };
  const strip = document.querySelector('#ship-combat-strip');
  const steps = [...document.querySelectorAll('#ship-combat-rail .ship-phase-step')];
  return {
    phase: document.querySelector('#ship-combat-rail .ship-phase-step.now')?.title ?? '?',
    acting: document.querySelector('#ship-combat-rail .encounter-tracker-ready')?.textContent.trim() ?? '',
    // v0.188.0: NEXT is a short word; what comes next is its title.
    next: document.querySelector('#ship-verb-next')?.title ?? '',
    step: [...document.querySelectorAll('#ship-combat-rail .ship-phase-step')].map((cell) => cell.className).join('|')
      + document.querySelector('#ship-combat-rail .encounter-tracker-state')?.textContent,
    strip: viewportBox(strip),
    lane: box(lane),
    laneLeft: origin,
    stripScrolls: strip ? strip.scrollWidth > strip.clientWidth : false,
    steps: steps.map((step) => ({ label: step.title, ...box(step) })),
    columns: [...document.querySelectorAll('#ship-combat-verbs .ship-verb-col')].map((column) => ({ phase: column.dataset.phase, ...box(column) })),
    verbs: [...document.querySelectorAll('#ship-combat-verbs .ship-verb')].map((button) => ({
      id: button.id, text: button.textContent.trim(), shown: !button.hidden, clipped: button.scrollWidth > button.clientWidth + 1, ...box(button)
    })),
    // v0.190.0: the lead's two lines, which must never be cut off either.
    leadClipped: [...document.querySelectorAll('#ship-combat-rail .ship-strip-lead > *')].filter((line) => line.scrollWidth > line.clientWidth + 1).map((line) => line.textContent),
    plot: box(document.querySelector('#ship-vector-stage')),
    plotShown: !document.querySelector('#ship-vector-section')?.hidden
  };
}

// Advance one whole game turn: intruder A-E, then native A-E.
async function playOneTurn(page) {
  await page.waitForSelector('#ship-combat-strip:not([hidden])');
  await settle(page);
  const snapshots = [await page.evaluate(measureStrip)];
  for (let guard = 0; guard < 12; guard += 1) {
    const before = snapshots.at(-1);
    if (/TURN 2/.test(before.next)) break;
    const next = page.locator('#ship-verb-next');
    if (!(await next.isVisible()) || await next.isDisabled()) throw new Error(`NEXT is unavailable in ${before.acting} ${before.phase}`);
    await next.click();
    await page.waitForFunction((previous) => document.querySelector('#ship-verb-next')?.title !== previous, before.next);
    await settle(page);
    snapshots.push(await page.evaluate(measureStrip));
  }
  return snapshots;
}

const where = (snapshot) => snapshot.acting;
const px = (value) => `${Math.round(value)}px`;

// Largest movement of each keyed box across the turn, reported by name.
function drift(snapshots, pick, key = 'left') {
  const moved = [];
  const first = pick(snapshots[0]);
  first.forEach((entry, index) => {
    let worst = { by: 0, at: null };
    for (const snapshot of snapshots.slice(1)) {
      const now = pick(snapshot)[index];
      const by = Math.abs((now?.[key] ?? NaN) - entry[key]);
      if (!(by <= worst.by)) worst = { by, at: snapshot };
    }
    if (!(worst.by <= MOVE_TOLERANCE)) moved.push(`${entry.label ?? entry.phase ?? entry.id} ${key} moved ${Number.isFinite(worst.by) ? px(worst.by) : '(missing)'} by ${where(worst.at)}`);
  });
  return moved;
}

test('nothing in client/ imports the test browser', async () => {
  const offenders = [];
  for (const name of await readdir(path.join(root, 'client'))) {
    if (!/\.(m?js|html)$/.test(name)) continue;
    const text = await readFile(path.join(root, 'client', name), 'utf8');
    if (/playwright/i.test(text)) offenders.push(name);
  }
  assert.deepEqual(offenders, [], 'playwright-core is a test-only devDependency and must never reach the client');
});

const launched = await launchBrowser();

test('ship combat strip geometry', { skip: launched.skip ?? false }, async (t) => {
  const { browser } = launched;
  const server = await serveStagedClient();
  const storage = await shipCombatStorage();
  t.after(async () => { await browser.close(); await server.close(); });

  const firstPhase = [];
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    const errors = await openCampaign(page, server.origin, storage);
    const turn = await playOneTurn(page);

    await t.test(`${viewport.name}: the fight loads onto the vector plot and plays a full turn`, () => {
      assert.deepEqual(errors, [], 'page raised no errors');
      assert.ok(turn.every((s) => s.plotShown), 'the vector plot stays on the stage');
      assert.equal(turn[0].steps.length, 5, 'Book 2 p.23 five phases on the rail');
      assert.equal(turn[0].columns.length, 5, 'one verb column per phase');
      // Phases with nothing to do (no hits to return, nothing launched) are
      // passed over by the engine, so count sides rather than steps.
      const seen = turn.map(where).join(' / ');
      assert.ok(turn.some((s) => /ACTING INT\b/.test(s.acting)) && turn.some((s) => /ACTING NAT\b/.test(s.acting)), `both sides act (saw ${seen})`);
      assert.match(turn.at(-1).next, /TURN 2/, `the turn reaches its end (saw ${seen})`);
    });

    await t.test(`${viewport.name}: phase cells do not move as the turn advances`, () => {
      const moved = drift(turn, (s) => s.steps);
      assert.deepEqual(moved, []);
    });

    await t.test(`${viewport.name}: verb columns do not move or resize as the turn advances`, () => {
      const moved = [...drift(turn, (s) => s.columns), ...drift(turn, (s) => s.columns, 'width')];
      assert.deepEqual(moved, []);
    });

    await t.test(`${viewport.name}: every phase's verbs sit under that phase's cell`, () => {
      const off = [];
      turn[0].steps.forEach((step, index) => {
        const column = turn[0].columns[index];
        const by = Math.abs(column.left - step.left);
        if (by > ALIGN_TOLERANCE) off.push(`${column.phase} column starts ${px(by)} from "${step.label}"`);
        if (Math.abs(column.width - step.width) > ALIGN_TOLERANCE) off.push(`${column.phase} column is ${px(column.width)} wide under a ${px(step.width)} cell`);
      });
      assert.deepEqual(off, []);
    });

    await t.test(`${viewport.name}: the dock's buttons do not move as the turn advances`, () => {
      const dock = (s) => s.verbs.filter((verb) => ['ship-verb-next', 'ship-verb-close'].includes(verb.id));
      assert.deepEqual(drift(turn, dock), []);
    });

    await t.test(`${viewport.name}: the plot does not move as the turn advances`, () => {
      const moved = [];
      for (const snapshot of turn.slice(1)) {
        const by = snapshot.plot.top - turn[0].plot.top;
        if (Math.abs(by) > MOVE_TOLERANCE) moved.push(`plot top ${by > 0 ? 'down' : 'up'} ${px(Math.abs(by))} in ${where(snapshot)}`);
      }
      assert.deepEqual(moved, []);
    });

    await t.test(`${viewport.name}: no shown verb is cut off`, () => {
      const clipped = [];
      for (const snapshot of turn) {
        for (const verb of snapshot.verbs) if (verb.shown && verb.clipped) clipped.push(`"${verb.text}" in ${where(snapshot)}`);
        for (const line of snapshot.leadClipped) clipped.push(`lead "${line}"`);
      }
      assert.deepEqual([...new Set(clipped)], []);
    });

    await t.test(`${viewport.name}: a narrow window scrolls the lane instead of wrapping`, () => {
      const faults = [];
      // The narrow size must actually be narrower than the lane, or this
      // check would pass without ever testing a scroll.
      if (viewport.width <= 700 && !turn.every((snapshot) => snapshot.stripScrolls)) faults.push(`the lane fits at ${viewport.name}, so scrolling was not exercised: choose a narrower size`);
      for (const snapshot of turn) {
        const tops = snapshot.steps.map((step) => Math.round(step.top));
        if (Math.max(...tops) - Math.min(...tops) > MOVE_TOLERANCE) faults.push(`rail wraps in ${where(snapshot)}`);
        if (snapshot.stripScrolls) continue; // a lane that scrolls may run past its edge
        const edge = snapshot.strip.right - snapshot.laneLeft;   // the strip's right edge, in lane coordinates
        for (const step of snapshot.steps) if (step.right > edge + MOVE_TOLERANCE) faults.push(`"${step.label}" runs past the strip without scrolling in ${where(snapshot)}`);
        for (const verb of snapshot.verbs) if (verb.shown && verb.right > edge + MOVE_TOLERANCE) faults.push(`"${verb.text}" runs past the strip without scrolling in ${where(snapshot)}`);
      }
      assert.deepEqual([...new Set(faults)], []);
    });

    firstPhase.push({ viewport: viewport.name, snapshot: turn[0] });
    await context.close();
  }
  // The one layout: every cell and slot the same size and in the same place
  // relative to the strip, at every window width.
  await t.test('the strip is laid out the same at every window width', () => {
    const layout = ({ snapshot }) => {
      const x = (box) => Math.round(box.left);
      const w = (box) => Math.round(box.width);
      return [
        ...snapshot.steps.map((step) => [`"${step.label}" cell`, x(step), w(step)]),
        ...snapshot.columns.map((column) => [`${column.phase} column`, x(column), w(column)]),
        ...snapshot.verbs.filter((verb) => ['ship-verb-next', 'ship-verb-close'].includes(verb.id)).map((verb) => [verb.id, x(verb), w(verb)])
      ];
    };
    const reference = layout(firstPhase[0]);
    const differ = [];
    for (const entry of firstPhase.slice(1)) {
      layout(entry).forEach(([name, left, width], index) => {
        const [, refLeft, refWidth] = reference[index];
        if (Math.abs(left - refLeft) > ALIGN_TOLERANCE || Math.abs(width - refWidth) > ALIGN_TOLERANCE) {
          differ.push(`${name}: ${left}px/${width}px wide at ${entry.viewport}, ${refLeft}px/${refWidth}px wide at ${firstPhase[0].viewport}`);
        }
      });
    }
    assert.deepEqual(differ, []);
  });
});
