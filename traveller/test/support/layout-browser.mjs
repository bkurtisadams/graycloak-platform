// layout-browser.mjs — run the real client in a real browser and measure it.
//
// v1.278.00. jsdom has no layout engine: getBoundingClientRect returns zeros
// and CSS never becomes geometry, so every layout regression of the v0.18x
// series passed the suite and was found by a measurement in Kurt's browser.
// This harness is that measurement, automated.
//
// playwright-core is a devDependency for TESTS ONLY. Nothing under client/
// imports it (pinned in layout-ship-strip.test.mjs) and it downloads no
// browser: it drives one that is already installed.
//
// Browser, first found wins:
//   1. TRAVELLER_LAYOUT_BROWSER=<path to a Chromium-family executable>
//   2. Google Chrome    (what Kurt develops Traveller in)
//   3. Microsoft Edge   (always present on Windows, as a fallback)
//   4. a Playwright-managed Chromium, if one was ever installed
// None found: the layout tests skip with a note, as the jsdom tests do.

import http from 'node:http';
import { cp, mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const STUB_AUTH = `
export function authStatus() { return { user: null, status: 'unavailable' }; }
export function currentUserId() { return null; }
export function onAuthChange() {}
export async function initAuth() {}
export async function signOutOfTraveller() {}
`;
const STUB_SIGNIN = 'export function openSignInDialog() {}';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2'
};

export async function loadPlaywright() {
  try { return (await import('playwright-core')).chromium; } catch { return null; }
}

// Returns { browser } or { skip: 'reason' }.
export async function launchBrowser() {
  const chromium = await loadPlaywright();
  if (!chromium) return { skip: 'playwright-core is not installed (pnpm install)' };
  const attempts = [];
  if (process.env.TRAVELLER_LAYOUT_BROWSER) attempts.push({ executablePath: process.env.TRAVELLER_LAYOUT_BROWSER });
  attempts.push({ channel: 'chrome' }, { channel: 'msedge' }, {});
  const failures = [];
  for (const options of attempts) {
    try {
      return { browser: await chromium.launch({ headless: true, ...options }) };
    } catch (error) {
      failures.push(`${options.executablePath ?? options.channel ?? 'playwright chromium'}: ${String(error?.message ?? error).split('\n')[0]}`);
    }
  }
  return { skip: `no browser for the layout tests (${failures.join(' / ')})` };
}

// A copy of the client with the two Firebase-facing modules stubbed, served on
// a random loopback port. Never 8080: the Firestore emulator wants that one.
export async function serveStagedClient() {
  const dir = await mkdtemp(path.join(tmpdir(), 'traveller-layout-'));
  for (const part of ['client', 'src', 'world', 'campaigns', 'vendor']) {
    await cp(path.join(root, part), path.join(dir, part), { recursive: true });
  }
  await writeFile(path.join(dir, 'client/auth.js'), STUB_AUTH);
  await writeFile(path.join(dir, 'client/signin-ui.js'), STUB_SIGNIN);
  const server = http.createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://local').pathname);
    const file = path.join(dir, path.normalize(pathname).replace(/^([/\\])+/, ''));
    if (!file.startsWith(dir)) { response.writeHead(403); response.end(); return; }
    try {
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      response.end(body);
    } catch {
      response.writeHead(404); response.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return {
    origin,
    async close() {
      await new Promise((resolve) => server.close(resolve));
      await rm(dir, { recursive: true, force: true });
    }
  };
}

// The bundled test campaign plus a fight already under way, as the two
// localStorage entries the client reads on load. The fight comes from
// scripts/make-ship-combat.mjs, the same fixture Kurt plays by hand.
export async function shipCombatStorage({ args = ['--vector', '--opponent=cruiser'] } = {}) {
  const { createDocumentRegistry } = await import(pathToFileURL(path.join(root, 'src/document-registry.js')).href);
  const entries = new Map();
  const registry = createDocumentRegistry({
    storage: { getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, String(value)) }
  });
  const bundle = JSON.parse(await readFile(path.join(root, 'test/fixtures/Sea-of-Suns-v0.11.2-buggy.campaign.json'), 'utf8'));
  const { campaign } = registry.putBundle(bundle);

  const scratch = await mkdtemp(path.join(tmpdir(), 'traveller-fight-'));
  try {
    const out = path.join(scratch, 'fight.json');
    await promisify(execFile)(process.execPath, [path.join(root, 'scripts/make-ship-combat.mjs'), ...args, `--out=${out}`], { cwd: root });
    entries.set('graycloak.traveller.ship-combat.v1', await readFile(out, 'utf8'));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
  return { campaignId: campaign.identity.id, entries: [...entries] };
}

// Seed localStorage once per tab (not on every reload the client itself does).
export async function openCampaign(page, origin, { campaignId, entries }) {
  await page.addInitScript((seed) => {
    if (sessionStorage.getItem('layout-seeded')) return;
    localStorage.clear();
    for (const [key, value] of seed) localStorage.setItem(key, value);
    sessionStorage.setItem('layout-seeded', '1');
  }, entries);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/client/index.html?campaign=${encodeURIComponent(campaignId)}`);
  return errors;
}

// Two frames: the click's render, then whatever a ResizeObserver queued.
export function settle(page) {
  return page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
