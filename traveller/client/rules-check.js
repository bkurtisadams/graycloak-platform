// rules-check.js — say so when the server is serving a different rules package.
//
// v0.327.0. traveller/vendor/ is a copy of packages/ made by sync-vendor when
// the server starts. Files extracted while a server is running leave it
// serving the old copy: every export may still be there, so nothing fails —
// the client simply plays by last week's rules. boot.mjs (index.html) already
// catches a missing export; this is the check for the pages that do not boot
// through it (play.html, seat.html, player.html, enter.html).
//
// It runs as its own module script, apart from the page's main module, so it
// still speaks when the main module's graph fails to load. It imports the
// rules index by the same stamped URL every other importer uses (one fetch,
// one instance) and compares the package's RULES_VERSION with the version
// this client was stamped for. stamp-client rewrites EXPECTED_RULES_VERSION
// from packages/classic-traveller-rules/package.json on every bump.

export const EXPECTED_RULES_VERSION = '0.80.0';

const RULES = `../vendor/classic-traveller-rules/index.js?v=r${EXPECTED_RULES_VERSION}`;

/** What to say, or null when the loaded package is the expected one. Pure (tested). */
export function rulesMismatch(loaded, expected = EXPECTED_RULES_VERSION, { error = null } = {}) {
  if (!error && loaded === expected) return null;
  const served = error
    ? `could not be loaded (${String(error?.message ?? error)})`
    : `is ${loaded ? `classic-traveller-rules ${loaded}` : 'an older copy with no version stamp'}`;
  return {
    heading: 'Rules package mismatch',
    body: `This client was built for classic-traveller-rules ${expected}; the package the server is serving ${served}. `
      + 'A server started before the files were extracted keeps its old copy of vendor\\. Stop the server, run this '
      + 'from C:\\graycloak-platform\\traveller, start it again and reload:',
    command: 'node scripts\\sync-vendor.mjs --link',
    footnote: 'If the versions still differ, the packages\\classic-traveller-rules half of the patch was not extracted.'
  };
}

function banner(message) {
  const bar = document.createElement('div');
  bar.setAttribute('role', 'alert');
  bar.id = 'rules-mismatch';
  bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:10000;padding:10px 44px 10px 16px;'
    + 'background:#8f1d1d;color:#fff;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;'
    + 'box-shadow:0 2px 8px rgba(0,0,0,.35)';
  const strong = document.createElement('strong');
  strong.textContent = `\u26a0 ${message.heading}. `;
  const body = document.createElement('span');
  body.textContent = message.body;
  const command = document.createElement('code');
  command.textContent = ` ${message.command}`;
  command.style.cssText = 'font-weight:700;margin-left:4px';
  const foot = document.createElement('div');
  foot.textContent = message.footnote;
  foot.style.cssText = 'opacity:.85;margin-top:2px';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '\u00d7';
  close.setAttribute('aria-label', 'Hide this warning');
  close.style.cssText = 'position:absolute;right:10px;top:8px;background:none;border:0;color:#fff;font-size:20px;cursor:pointer';
  close.onclick = () => bar.remove();
  bar.append(strong, body, command, foot, close);
  (document.body ?? document.documentElement).append(bar);
}

export async function checkRulesVersion() {
  let message = null;
  try {
    const rules = await import(RULES);
    message = rulesMismatch(rules.RULES_VERSION ?? null);
  } catch (error) {
    message = rulesMismatch(null, EXPECTED_RULES_VERSION, { error });
  }
  if (message) {
    console.error(`${message.heading}: ${message.body} ${message.command}`);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => banner(message), { once: true });
    else banner(message);
  }
  return message;
}

if (typeof document !== 'undefined' && !globalThis.__RULES_CHECK_DISABLED__) checkRulesVersion();
