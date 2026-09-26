// check.mjs — v0.329.0: the copied game loads under Node, without Firebase.
// Run after copy-app (npm run check) before deploying.
const { applyRemoteRequest, playerMayRun } = await import('../app/src/remote-request.js');
const { MERIDIAN_REACH_SECTOR } = await import('../app/world/meridian-reach-sector.js');
if (typeof applyRemoteRequest !== 'function' || !playerMayRun('trip:wait') || !MERIDIAN_REACH_SECTOR) {
  console.error('functions/app does not load the request handler');
  process.exit(1);
}
const version = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../app/VERSION.json', import.meta.url), 'utf8'));
console.log(`functions/app loads: client ${version.client}, rules ${version.rules}`);
