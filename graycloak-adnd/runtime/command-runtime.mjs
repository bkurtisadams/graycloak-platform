// command-runtime.mjs v1.2.0 — 2026-08-30
// Trusted Node-side loader for Graycloak's pure browser command modules.
//
// The current command/rules files are classic browser scripts rather than ESM.
// This loader evaluates the exact same local sources once in the Node process so
// the authoritative service does not duplicate their logic. A future dedicated
// ESM build target can replace this bridge without changing command-service.mjs.

import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const COMMAND_RUNTIME_VERSION = 1;

const DEFAULT_SOURCE_URLS = Object.freeze([
  new URL('../public/adnd-documents.js', import.meta.url),
  new URL('../public/adnd-world-clock.js', import.meta.url),
  new URL('../public/adnd-activities.js', import.meta.url),
  new URL('../public/adnd-commands.js', import.meta.url),
]);

let cachedRuntime = null;

function validRuntime(runtime) {
  return !!(runtime && runtime.Documents && runtime.Clock && runtime.Activities && runtime.Commands &&
    typeof runtime.Commands.normalizeBeginTravelCommand === 'function' &&
    typeof runtime.Commands.executeBeginTravelCommand === 'function');
}

export function loadCommandRuntime(options = {}) {
  if (cachedRuntime && options.cache !== false) return cachedRuntime;

  const sourceUrls = Array.isArray(options.sourceUrls) && options.sourceUrls.length
    ? options.sourceUrls
    : DEFAULT_SOURCE_URLS;

  const source = sourceUrls.map(sourceUrl => {
    const path = sourceUrl instanceof URL ? fileURLToPath(sourceUrl) : String(sourceUrl);
    return fs.readFileSync(path, 'utf8');
  }).concat([
    '({ Documents: ADNDDocuments, Clock: ADNDWorldClock, Activities: ADNDActivities, Commands: ADNDCommands })',
  ]).join('\n');

  // runInThisContext intentionally uses the host realm. Several Graycloak pure
  // modules test for plain objects, and a separate VM realm would make ordinary
  // host objects appear non-plain solely because their prototypes differ.
  const runtime = new vm.Script(source, {
    filename: 'graycloak-authoritative-command-runtime.js',
  }).runInThisContext();

  if (!validRuntime(runtime)) {
    throw new Error('Graycloak authoritative command runtime did not load expected exports');
  }
  if (options.cache !== false) cachedRuntime = runtime;
  return runtime;
}
