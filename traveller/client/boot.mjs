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

const RULES = '../vendor/classic-traveller-rules/index.js';

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
  heading.textContent = 'VENDORED RULES PACKAGE IS OUT OF DATE';
  const body = document.createElement('p');
  body.style.cssText = 'margin:0 0 12px';
  body.textContent = 'traveller/vendor/ is a build artifact and has not been rebuilt since '
    + 'packages/classic-traveller-rules last changed. Run this from the traveller directory, '
    + 'then reload:';
  const command = document.createElement('pre');
  command.style.cssText = 'margin:0 0 12px;padding:9px 11px;border:1px solid #1a1a17;background:#d9d9d3';
  command.textContent = 'node scripts/sync-vendor.mjs';
  const cause = document.createElement('p');
  cause.style.cssText = 'margin:0;color:#5a5a52';
  cause.textContent = detail;
  box.append(heading, body, command, cause);
  panel.append(box);
  document.body.append(panel);
}

try {
  await import(RULES);
  await import('./app.js');
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
