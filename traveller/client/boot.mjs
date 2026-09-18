// boot.mjs — load the client, but say something useful when the vendored rules
// package is stale.
//
// v0.109.0. traveller/vendor/ is a git-ignored build artifact produced by
// scripts/sync-vendor.mjs, and the browser loads it directly. Extracting a
// change to packages/classic-traveller-rules and reloading the page without
// running that script leaves the two out of step, and the only symptom is a
// SyntaxError naming whichever export happens to be missing first:
//
//   Uncaught SyntaxError: The requested module
//   '../vendor/classic-traveller-rules/index.js' does not provide an export
//   named 'annualMaintenanceCr'
//
// That names a symbol, not a cause, and it has cost several round trips. A
// static import of app.js cannot be caught — the whole graph is resolved
// before any code runs — so the rules module is imported dynamically first,
// and app.js only after it resolves.

// v0.146.0: every module the browser fetches carries the client version.
//
// Nothing was stamped. index.html loaded boot.mjs unstamped, boot.mjs imported
// the vendored rules index unstamped, and app.js imported its siblings
// unstamped — so a browser could hold any of them indefinitely while the rest
// updated around it. That produced two separate hunts: a cached ui-model.js in
// v0.128.0, and a cached vendor index that survived a full re-extract and
// several syncs while the file on disk was correct the whole time.
//
// The panel added in v0.145.0 could not tell those apart, because from inside
// the browser a cached module and a stale file look identical. Stamping is the
// only fix that removes the question.
//
// This constant is rewritten by the version bump alongside the mastheads.
export const CLIENT_VERSION = 'v0.204.1';

const RULES = `../vendor/classic-traveller-rules/index.js?v=${CLIENT_VERSION}`;

// v0.145.0: the error names the module as well as the symbol, and the two are
// different faults. A missing export from a CLIENT module is a stale browser
// cache — app.js is stamped with ?v= and its sibling imports are not — and
// telling the reader to run sync-vendor sends them nowhere. That happened with
// ui-model.js and again with the rules package, so the panel now reads the
// specifier out of the message and says which fault it is.
function describe(message) {
  // The specifier now carries ?v=, so compare the path without the query.
  const specifier = (/module '([^']+)'/.exec(message)?.[1] ?? '').split('?')[0];
  const symbol = /export named '([^']+)'/.exec(message)?.[1] ?? '';
  if (!specifier.includes('/vendor/')) {
    return {
      heading: 'A CLIENT MODULE FAILED TO LOAD',
      body: `${specifier || 'A client module'} did not provide ${symbol ? `\u201c${symbol}\u201d` : 'an expected export'}. `
        + 'This is usually a stale browser cache: app.js is stamped with a version and the modules it '
        + 'imports are not, so a new app.js can run against an old sibling. Hard refresh, and if that '
        + 'fails clear the site data. Running sync-vendor will not help — that module is not vendored.',
      command: null
    };
  }
  return {
    heading: 'VENDORED RULES PACKAGE IS OUT OF DATE',
    body: `The vendored rules package does not provide ${symbol ? `\u201c${symbol}\u201d` : 'an expected export'}. `
      + 'traveller/vendor/ is a build artifact. Run this from the traveller directory, then reload:',
    command: 'node scripts/sync-vendor.mjs',
    // The other cause, and the one that is easy to miss: a patch spanning both
    // trees whose packages/ half was not extracted. Syncing cannot add an
    // export the source package does not have.
    footnote: `If syncing does not fix it, check that packages/classic-traveller-rules exports ${symbol ? `\u201c${symbol}\u201d` : 'it'} `
      + 'at all — a patch extracted into traveller/ alone leaves the client ahead of the package.'
  };
}

function fail(detail) {
  const panel = document.createElement('div');
  panel.setAttribute('role', 'alert');
  panel.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;'
    + 'justify-content:center;padding:32px;background:#d9d9d3;color:#1a1a17;'
    + 'font:14px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
  const box = document.createElement('div');
  box.style.cssText = 'max-width:640px;border:1px solid #1a1a17;padding:20px 22px;background:#e7e7e1';
  const heading = document.createElement('div');
  heading.style.cssText = 'font-weight:700;letter-spacing:.04em;margin-bottom:10px';
  const diagnosis = describe(detail);
  heading.textContent = diagnosis.heading;
  const body = document.createElement('p');
  body.style.cssText = 'margin:0 0 12px';
  body.textContent = diagnosis.body;
  box.append(heading, body);
  if (diagnosis.command) {
    const command = document.createElement('pre');
    command.style.cssText = 'margin:0 0 12px;padding:9px 11px;border:1px solid #1a1a17;background:#d9d9d3';
    command.textContent = diagnosis.command;
    box.append(command);
  }
  if (diagnosis.footnote) {
    const footnote = document.createElement('p');
    footnote.style.cssText = 'margin:0 0 12px';
    footnote.textContent = diagnosis.footnote;
    box.append(footnote);
  }
  const cause = document.createElement('p');
  cause.style.cssText = 'margin:0;color:#5a5a52';
  cause.textContent = detail;
  box.append(cause);
  panel.append(box);
  document.body.append(panel);
}

try {
  await import(RULES);
  await import(`./app.js?v=${CLIENT_VERSION}`);
} catch (error) {
  const message = String(error?.message ?? error);
  // A missing export is the stale-vendor signature. Anything else is a real
  // fault in the client and must not be dressed up as a sync problem.
  if (/does not provide an export named/.test(message)) {
    console.error(error);
    fail(message);
  } else {
    throw error;
  }
}
