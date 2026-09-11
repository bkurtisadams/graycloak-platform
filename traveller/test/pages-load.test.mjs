// pages-load.test.mjs — the three pages actually load.
//
// v0.72.4. The static pins read source; they cannot see a module that throws
// at load. v0.72.0 shipped with a temporal-dead-zone error on line 586 of
// app.js and 291 tests passed. This test imports each page's script into a
// jsdom document with Firebase and sign-in stubbed, and asserts it reaches
// the masthead. Skipped, with a note, when jsdom is not installed.

import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let JSDOM = null;
try { ({ JSDOM } = await import('jsdom')); } catch { JSDOM = null; }

const STUB_AUTH = `
export function authStatus() { return { user: null, status: 'unavailable' }; }
export function currentUserId() { return null; }
export function onAuthChange() {}
export async function initAuth() {}
export async function signOutOfTraveller() {}
`;
const STUB_SIGNIN = `export function openSignInDialog() {}`;

// A copy of the client tree with the two Firebase-facing modules replaced, so
// the pages load without a network and without a project.
async function stagedTree() {
  const dir = await mkdtemp(path.join(tmpdir(), 'traveller-pages-'));
  for (const part of ['client', 'src', 'world', 'campaigns', 'vendor']) {
    await cp(path.join(root, part), path.join(dir, part), { recursive: true });
  }
  await writeFile(path.join(dir, 'client/auth.js'), STUB_AUTH);
  await writeFile(path.join(dir, 'client/signin-ui.js'), STUB_SIGNIN);
  return dir;
}

function installDom(html, url) {
  const dom = new JSDOM(html, { url, pretendToBeVisual: true });
  const { window } = dom;
  for (const key of ['document', 'window', 'HTMLElement', 'SVGElement', 'Event', 'CustomEvent', 'URLSearchParams', 'localStorage', 'confirm', 'prompt', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle']) {
    if (window[key] !== undefined) globalThis[key] = window[key];
  }
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
  // Node timers created by the module must not keep the runner alive.
  const timers = [];
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (...args) => { const t = realSetInterval(...args); t.unref?.(); timers.push(t); return t; };
  return { dom, window, cleanup() { for (const t of timers) clearInterval(t); globalThis.setInterval = realSetInterval; window.close(); } };
}

test('every page script loads to its masthead', { skip: JSDOM ? false : 'jsdom is not installed (pnpm install)' }, async (t) => {
  const dir = await stagedTree();
  t.after(() => rm(dir, { recursive: true, force: true }));
  const version = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;

  const pages = [
    { html: 'index.html', script: 'app.js', query: '?local=1', masthead: '#app-subtitle', expect: `v${version}` },
    { html: 'player.html', script: 'player.js', query: '?campaign=none', masthead: '.masthead .subtitle', expect: `PLAYER v${version}` },
    { html: 'enter.html', script: 'enter.js', query: '', masthead: '.masthead .subtitle', expect: `ENTER v${version}` }
  ];
  for (const page of pages) {
    await t.test(`${page.script} loads`, async () => {
      const html = await readFile(path.join(dir, 'client', page.html), 'utf8');
      const { window, cleanup } = installDom(html, `http://localhost:8080/traveller/client/${page.html}${page.query}`);
      try {
        await import(path.join(dir, 'client', page.script) + `?t=${Date.now()}`);
        // Let the page's own initAuth().then(...) settle.
        await new Promise((resolve) => setTimeout(resolve, 20));
        const masthead = window.document.querySelector(page.masthead);
        assert.ok(masthead, `${page.html} has a masthead`);
        assert.equal(masthead.textContent.trim(), page.expect);
      } finally {
        cleanup();
      }
    });
  }
});
